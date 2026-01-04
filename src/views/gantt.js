function renderGanttView(app, container) {
        // Apply filters first
        const filteredTasks = app.store.getFilteredTasks();

        // Helper to check if task matches filter
        const matchesFilter = (task) => {
            return task._matches !== false;
        };

        // Get all tasks with dates (including nested), respecting filters
        const getAllTasksWithDates = (tasks) => {
            let result = [];
            tasks.forEach(task => {
                // Skip if task doesn't match filter
                if (!matchesFilter(task)) return;

                if (task.metadata.startDate && task.metadata.endDate) {
                    result.push(task);
                }
                if (task.children && task.children.length > 0) {
                    result = result.concat(getAllTasksWithDates(task.children));
                }
            });
            return result;
        };

        const tasksWithDates = getAllTasksWithDates(filteredTasks);

        if (tasksWithDates.length === 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">No tasks with dates to display. Add start and end dates to tasks.</div>';
            return;
        }

        const allTasks = tasksWithDates;
        const zoomLevel = app.ganttZoom || 'months';

        // Calculate date range
        const allDates = allTasks.flatMap(t => [new Date(t.metadata.startDate), new Date(t.metadata.endDate)]);
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));

        // Generate time periods based on zoom
        let periods = [];
        let cellWidth = 80;

        if (zoomLevel === 'quarters') {
            const startQ = Math.floor(minDate.getMonth() / 3);
            const endQ = Math.floor(maxDate.getMonth() / 3);
            const startYear = minDate.getFullYear();
            const endYear = maxDate.getFullYear();

            for (let y = startYear; y <= endYear; y++) {
                const start = (y === startYear) ? startQ : 0;
                const end = (y === endYear) ? endQ : 3;
                for (let q = start; q <= end; q++) {
                    periods.push({
                        label: `Q${q + 1} ${y}`,
                        start: new Date(y, q * 3, 1),
                        end: new Date(y, (q + 1) * 3, 0)
                    });
                }
            }
        } else if (zoomLevel === 'months') {
            let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

            while (current <= end) {
                const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                periods.push({
                    label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    start: new Date(current),
                    end: monthEnd
                });
                current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
            }
        } else if (zoomLevel === 'weeks') {
            cellWidth = 60;
            let current = new Date(minDate);
            current.setDate(current.getDate() - current.getDay()); // Start of week

            while (current <= maxDate) {
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6);
                periods.push({
                    label: `${current.getMonth() + 1}/${current.getDate()}`,
                    start: new Date(current),
                    end: weekEnd
                });
                current.setDate(current.getDate() + 7);
            }
        } else { // days
            cellWidth = 40;
            let current = new Date(minDate);

            while (current <= maxDate) {
                periods.push({
                    label: `${current.getMonth() + 1}/${current.getDate()}`,
                    start: new Date(current),
                    end: new Date(current)
                });
                current.setDate(current.getDate() + 1);
            }
        }

        const timelineWidth = periods.length * cellWidth;

        // Initialize ganttCollapsed set if it doesn't exist
        if (!app.store.ganttCollapsed) {
            app.store.ganttCollapsed = new Set();
        }
        // Initialize ganttProjectsCollapsed set for project row collapse
        if (!app.store.ganttProjectsCollapsed) {
            app.store.ganttProjectsCollapsed = new Set();
        }

        // Render tasks hierarchically with collapse (used within project groups)
        const renderTaskRows = (tasks, depth = 0) => {
            let rows = [];

            tasks.forEach(task => {
                // Skip if task doesn't match filter
                if (!matchesFilter(task)) return;

                // Only show tasks that have dates
                if (!task.metadata.startDate || !task.metadata.endDate) return;

                const hasChildren = task.children && task.children.some(c =>
                    c.metadata.startDate && c.metadata.endDate && matchesFilter(c)
                );
                const isCollapsed = app.store.ganttCollapsed.has(task.id);

                rows.push({
                    type: 'task',
                    task,
                    depth,
                    hasChildren,
                    isCollapsed
                });

                // Recursively add children if not collapsed
                if (hasChildren && !isCollapsed) {
                    rows = rows.concat(renderTaskRows(task.children, depth + 1));
                }
            });

            return rows;
        };

        // Group filtered root tasks by project
        const groupedByProject = {};
        const unassignedTasks = [];

        filteredTasks.forEach(task => {
            if (task.projectId) {
                if (!groupedByProject[task.projectId]) {
                    groupedByProject[task.projectId] = [];
                }
                groupedByProject[task.projectId].push(task);
            } else {
                unassignedTasks.push(task);
            }
        });

        // Build rows with project grouping info for container styling
        let taskRows = [];

        // Add project groups
        Object.keys(groupedByProject).forEach(projectId => {
            const project = app.store.getProject(projectId);
            if (!project) return;

            const projectTasks = groupedByProject[projectId];
            const isProjectCollapsed = app.store.ganttProjectsCollapsed.has(projectId);

            // Add project header row
            taskRows.push({
                type: 'project',
                project,
                taskCount: projectTasks.length,
                isCollapsed: isProjectCollapsed,
                isContainerStart: true,
                isContainerEnd: isProjectCollapsed // If collapsed, header is also the end
            });

            // Add tasks under this project if not collapsed
            if (!isProjectCollapsed) {
                let projectTaskRows = [];
                projectTasks.forEach(task => {
                    projectTaskRows = projectTaskRows.concat(renderTaskRows([task], 1));
                });
                // Mark each task row with project info for container styling
                projectTaskRows.forEach((row, idx) => {
                    if (row.type === 'task') {
                        let parent = app.store.findParent(row.task.id);
                        let root = parent || row.task;
                        while (parent) {
                            root = parent;
                            parent = app.store.findParent(parent.id);
                        }
                        row.parentContainerColor = root?.metadata?.containerColor || '';
                    }
                    row.projectColor = project.color;
                    row.isContainerEnd = (idx === projectTaskRows.length - 1);
                });
                taskRows = taskRows.concat(projectTaskRows);
            }
        });

        // Add unassigned tasks
        if (unassignedTasks.length > 0) {
            const isUnassignedCollapsed = app.store.ganttProjectsCollapsed.has('unassigned');
            const unassignedProject = { id: 'unassigned', name: 'Unassigned', color: '#6b7280' };

            taskRows.push({
                type: 'project',
                project: unassignedProject,
                taskCount: unassignedTasks.length,
                isCollapsed: isUnassignedCollapsed,
                isContainerStart: true,
                isContainerEnd: isUnassignedCollapsed
            });

            if (!isUnassignedCollapsed) {
                let unassignedTaskRows = [];
                unassignedTasks.forEach(task => {
                    unassignedTaskRows = unassignedTaskRows.concat(renderTaskRows([task], 1));
                });
                unassignedTaskRows.forEach((row, idx) => {
                    if (row.type === 'task') {
                        let parent = app.store.findParent(row.task.id);
                        let root = parent || row.task;
                        while (parent) {
                            root = parent;
                            parent = app.store.findParent(parent.id);
                        }
                        row.parentContainerColor = root?.metadata?.containerColor || '';
                    }
                    row.projectColor = unassignedProject.color;
                    row.isContainerEnd = (idx === unassignedTaskRows.length - 1);
                });
                taskRows = taskRows.concat(unassignedTaskRows);
            }
        }

        const taskPaneWidth = app.store.ganttTaskPaneWidth || 250;

        container.innerHTML = `
            <div class="gantt-view">
                <div class="gantt-controls">
                    <button class="gantt-zoom-btn ${zoomLevel === 'quarters' ? 'active' : ''}" data-zoom="quarters">Quarters</button>
                    <button class="gantt-zoom-btn ${zoomLevel === 'months' ? 'active' : ''}" data-zoom="months">Months</button>
                    <button class="gantt-zoom-btn ${zoomLevel === 'weeks' ? 'active' : ''}" data-zoom="weeks">Weeks</button>
                    <button class="gantt-zoom-btn ${zoomLevel === 'days' ? 'active' : ''}" data-zoom="days">Days</button>
                </div>
                <div class="gantt-container">
                    <div class="gantt-grid" style="grid-template-columns: ${taskPaneWidth}px 6px 1fr;">
                        <div class="gantt-tasks">
                            <div class="gantt-header">Tasks</div>
                            ${taskRows.map(row => {
                                if (row.type === 'project') {
                                    // Project header row - simple left border
                                    return `
                                    <div class="gantt-project-row" data-project-id="${row.project.id}" style="background: ${row.project.color}15; border-left: 4px solid ${row.project.color}; padding: 0 12px;">
                                        <div class="gantt-project-title" style="display: flex; align-items: center; gap: 8px; font-weight: 600; color: ${row.project.color};">
                                            <button class="collapse-btn" data-gantt-project-collapse="${row.project.id}" style="color: ${row.project.color};">${row.isCollapsed ? '▶' : '▼'}</button>
                                            <span>${row.project.name}</span>
                                            <span class="badge" style="background: ${row.project.color}40; color: ${row.project.color};">${row.taskCount}</span>
                                        </div>
                                    </div>
                                `;
                                } else {
                                    // Task row with project color left border
                                    return `
                                    <div class="gantt-task-row" data-task-id="${row.task.id}" style="${row.projectColor ? 'border-left: 4px solid ' + row.projectColor + ';' : ''}${row.parentContainerColor ? ' background: ' + row.parentContainerColor + '15;' : ''}">
                                        <div class="gantt-task-title" style="padding-left: ${row.depth * 20}px; display: flex; flex-direction: column; gap: 2px;">
                                            <div class="gantt-task-title-row" style="display: flex; align-items: center; gap: 4px;">
                                                ${row.hasChildren ?
                                                    `<button class="collapse-btn" data-gantt-collapse="${row.task.id}" style="margin-right: 4px;">${row.isCollapsed ? '▶' : '▼'}</button>` :
                                                    '<span style="display: inline-block; width: 24px;"></span>'
                                                }
                                                ${app.store.showPriorityInGantt && row.task.metadata.priority === 'high' ? `<span class="priority-indicator" title="High Priority" style="color: ${app.store.getTaskColors(row.task.id).priorityColors.high};">⚠️</span>` : ''}
                                                <span class="gantt-task-name">${row.task.title}</span>
                                                ${app.store.showAssigneeInGantt && row.task.metadata.assignee ? `<span class="assignee" style="margin-left: 8px;">${row.task.metadata.assignee}</span>` : ''}
                                                ${app.store.getRelatedTasks(row.task.id).length > 0 ? `<span class="related-badge" data-filter-related="${row.task.id}" title="Click to filter by related tasks">⟷ ${app.store.getRelatedTasks(row.task.id).length}</span>` : ''}
                                            </div>
                                            ${app.store.showDescriptionsInGantt && row.task.description ? `<div style="font-size: 11px; color: #666; font-style: italic; margin-left: 28px;">${row.task.description}</div>` : ''}
                                        </div>
                                    </div>
                                `}
                            }).join('')}
                        </div>
                        <div class="gantt-resizer" data-gantt-resizer></div>
                        <div class="gantt-timeline" style="min-width: ${timelineWidth}px">
                            <div class="gantt-timeline-header">
                                ${periods.map(p => `
                                    <div class="gantt-time-cell" style="min-width: ${cellWidth}px">${p.label}</div>
                                `).join('')}
                            </div>
                            ${taskRows.map(row => {
                                if (row.type === 'project') {
                                    // Empty row for project header (no styling - left side has container)
                                    return `
                                        <div class="gantt-bar-row">
                                            ${periods.map(p => `
                                                <div class="gantt-bar-cell" style="min-width: ${cellWidth}px"></div>
                                            `).join('')}
                                        </div>
                                    `;
                                }

                                const task = row.task;
                                const taskStart = new Date(task.metadata.startDate);
                                const taskEnd = new Date(task.metadata.endDate);

                                let startCell = 0;
                                let span = 0;

                                periods.forEach((period, idx) => {
                                    if (taskStart <= period.end && taskEnd >= period.start) {
                                        if (span === 0) startCell = idx;
                                        span++;
                                    }
                                });

                                const left = startCell * cellWidth;
                                const width = Math.max(span * cellWidth - 4, 40);

                                // Get project-specific status colors (or defaults)
                                const taskColors = app.store.getTaskColors(task.id);
                                const barColor = taskColors.statusColors[task.metadata.status] || '#3b82f6';

                                return `
                                    <div class="gantt-bar-row">
                                        ${periods.map((p, idx) => `
                                            <div class="gantt-bar-cell" style="min-width: ${cellWidth}px">
                                                ${idx === startCell ? `
                                                    <div class="gantt-bar" style="left: 2px; width: ${width}px; justify-content: center; text-align: center; background: ${barColor};" data-task-id="${task.id}">
                                                        ${app.store.showBarTextInGantt ? task.title : ''}
                                                    </div>
                                                ` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const syncRowHeights = () => {
            const taskRows = [
                ...container.querySelectorAll('.gantt-tasks > .gantt-project-row, .gantt-tasks > .gantt-task-row')
            ];
            const barRows = [...container.querySelectorAll('.gantt-timeline .gantt-bar-row')];
            const count = Math.min(taskRows.length, barRows.length);
            for (let i = 0; i < count; i++) {
                const height = taskRows[i].offsetHeight;
                barRows[i].style.height = `${height}px`;
            }
        };
        requestAnimationFrame(syncRowHeights);

        const resizer = container.querySelector('[data-gantt-resizer]');
        if (resizer) {
            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const grid = container.querySelector('.gantt-grid');
                const containerRect = container.querySelector('.gantt-container').getBoundingClientRect();
                const minWidth = 200;
                const maxWidth = Math.max(minWidth, Math.min(600, containerRect.width - 200));
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';

                const handleMove = (event) => {
                    const nextWidth = Math.max(minWidth, Math.min(maxWidth, event.clientX - containerRect.left));
                    app.store.ganttTaskPaneWidth = Math.round(nextWidth);
                    grid.style.gridTemplateColumns = `${app.store.ganttTaskPaneWidth}px 6px 1fr`;
                    syncRowHeights();
                };

                const handleUp = () => {
                    document.removeEventListener('mousemove', handleMove);
                    document.removeEventListener('mouseup', handleUp);
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                };

                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
            });
        }

        // Collapse/expand buttons for tasks
        container.querySelectorAll('[data-gantt-collapse]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.ganttCollapse;
                if (app.store.ganttCollapsed.has(taskId)) {
                    app.store.ganttCollapsed.delete(taskId);
                } else {
                    app.store.ganttCollapsed.add(taskId);
                }
                app.render();
            });
        });

        // Collapse/expand buttons for project groups
        container.querySelectorAll('[data-gantt-project-collapse]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.ganttProjectCollapse;
                if (app.store.ganttProjectsCollapsed.has(projectId)) {
                    app.store.ganttProjectsCollapsed.delete(projectId);
                } else {
                    app.store.ganttProjectsCollapsed.add(projectId);
                }
                app.render();
            });
        });

        // Zoom controls
        container.querySelectorAll('[data-zoom]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                app.ganttZoom = e.target.dataset.zoom;
                app.render();
            });
        });

        // Task clicks (both task rows and bars)
        container.querySelectorAll('[data-task-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = el.dataset.taskId;
                if (app.linkMode) {
                    app.handleLinkModeClick(taskId);
                } else if (app.relateLinkMode) {
                    app.handleRelateModeClick(taskId);
                } else {
                    app.showDetailPanel(taskId);
                }
            });
        });

        // Related badge click handler - filter by related tasks
        container.querySelectorAll('[data-filter-related]').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = badge.dataset.filterRelated;
                app.store.setRelatedFilter(taskId);
            });
        });

        // Also handle clicks on child elements within task rows
        container.querySelectorAll('.gantt-task-row').forEach(row => {
            row.style.cursor = 'pointer';
        });
}
