function renderOutlineView(app, container) {
        // Inline editing mode - no separate edit mode anymore
        app.selectedTaskIds = app.selectedTaskIds || new Set();
        app.lastSelectedTaskId = app.lastSelectedTaskId || null; // For shift-click range selection
        app.clipboard = app.clipboard || { tasks: [], mode: null }; // For copy/cut/paste

        // Track if we just exited editing (stored in app to persist across re-renders)
        if (app.justExitedEditing === undefined) {
            app.justExitedEditing = false;
        }

        // Store task ID to focus after render
        const taskToFocus = app.focusTaskAfterRender;
        app.focusTaskAfterRender = null;

        // Parse task input with # delimiter for inline description
        const parseTaskInput = (input) => {
            // Check for unescaped # delimiter
            const parts = input.split(/(?<!\\)#/);

            if (parts.length > 1) {
                const title = parts[0].trim();
                const description = parts.slice(1).join('#').trim(); // Join in case of multiple #

                // Handle escape sequences
                const cleanTitle = title.replace(/\\#/g, '#');

                return { title: cleanTitle, description };
            }

            // No # found - just title
            return { title: input.replace(/\\#/g, '#'), description: '' };
        };

        // Check if targetId is a descendant of task
        const isDescendant = (task, targetId) => {
            if (!task.children) return false;
            for (const child of task.children) {
                if (child.id === targetId) return true;
                if (isDescendant(child, targetId)) return true;
            }
            return false;
        };

        const syncTaskPositions = (app, siblings, parentId) => {
            siblings.forEach((task, index) => {
                task.sortIndex = index;
                task.parentId = parentId || null;
                if (task._pendingCreate) {
                    return;
                }
                if (app.apiClient) {
                    const payload = {
                        parentId: parentId || null,
                        sortIndex: index,
                        projectId: task.projectId || null
                    };
                    app.apiClient.updateTask(task.id, payload).catch((error) => {
                        console.error('Task reorder failed', {
                            taskId: task.id,
                            payload,
                            error
                        });
                        if (typeof showToast === 'function') {
                            showToast(`Task reorder failed: ${error.message || 'Unknown error'}`);
                        }
                        if (app.apiClient) {
                            app.apiClient.reportError(error, 'Task reorder failed');
                        }
                    });
                } else {
                    console.warn('Task reorder skipped: API client unavailable', {
                        taskId: task.id,
                        parentId: parentId || null,
                        sortIndex: index
                    });
                }
            });
        };

        const persistTaskSubtree = (app, task, parentId, index) => {
            if (!app.apiClient) {
                return Promise.resolve();
            }

            const payload = {
                id: task.id,
                title: task.title || '',
                description: task.description || '',
                parentId: parentId || null,
                projectId: parentId ? null : (task.projectId || null),
                metadata: task.metadata || {},
                sortIndex: index
            };

            return app.apiClient.createTask(payload)
                .then(() => {
                    task._pendingCreate = false;
                    if (!task.children || task.children.length === 0) {
                        return null;
                    }
                    return Promise.all(task.children.map((child, childIndex) =>
                        persistTaskSubtree(app, child, task.id, childIndex)
                    ));
                })
                .catch((error) => {
                    if (app.apiClient) {
                        app.apiClient.reportError(error, 'Task paste failed');
                    }
                });
        };

        // Move task to new position
        const moveTask = (app, draggedId, targetId, dropType) => {
            const draggedTask = app.store.findTask(draggedId);
            const targetTask = app.store.findTask(targetId);
            if (!draggedTask || !targetTask) return;

            // Remove from current location
            const draggedParent = app.store.findParent(draggedId);
            const draggedSiblings = draggedParent ? draggedParent.children : app.store.tasks;
            const draggedIndex = draggedSiblings.findIndex(t => t.id === draggedId);
            if (draggedIndex === -1) return;

            app.store.saveState();

            // Remove the task from its current position
            const [removed] = draggedSiblings.splice(draggedIndex, 1);

            // Handle project assignment when moving to/from root level
            const targetParent = app.store.findParent(targetId);
            const isMovingToRoot = (dropType === 'above' || dropType === 'below') && !targetParent;
            const isMovingToChild = dropType === 'child';
            const wasAtRoot = !draggedParent;

            if (isMovingToRoot && !wasAtRoot) {
                // Moving to root level - assign current project if in project view
                if (app.store.projectViewMode === 'project' &&
                    app.store.selectedProjectId && app.store.selectedProjectId !== 'unassigned') {
                    removed.projectId = app.store.selectedProjectId;
                }
            } else if (!isMovingToRoot && wasAtRoot) {
                // Moving from root to child - remove projectId
                delete removed.projectId;
            }

            // Insert at new location
            if (dropType === 'child') {
                // Add as first child of target
                if (!targetTask.children) targetTask.children = [];
                targetTask.children.unshift(removed);
                // Remove projectId since it's now a child
                delete removed.projectId;
            } else {
                // Add as sibling (above or below)
                const targetSiblings = targetParent ? targetParent.children : app.store.tasks;
                const targetIndex = targetSiblings.findIndex(t => t.id === targetId);

                if (dropType === 'above') {
                    targetSiblings.splice(targetIndex, 0, removed);
                } else {
                    targetSiblings.splice(targetIndex + 1, 0, removed);
                }
            }

            // Update parent filter if moved to root
            if (isMovingToRoot && app.store.parentFilterInitialized) {
                app.store.selectedParents.add(removed.id);
            }

            const targetParentId =
                dropType === 'child' ? targetTask.id : (targetParent ? targetParent.id : null);
            const targetSiblings = dropType === 'child'
                ? targetTask.children
                : (targetParent ? targetParent.children : app.store.tasks);

            if (draggedSiblings === targetSiblings) {
                syncTaskPositions(app, draggedSiblings, targetParentId);
            } else {
                syncTaskPositions(app, draggedSiblings, draggedParent ? draggedParent.id : null);
                syncTaskPositions(app, targetSiblings, targetParentId);
            }

            app.store.notify();
        };

        const buildParentMap = (tasks, map = new Map(), parentId = null) => {
            tasks.forEach(task => {
                map.set(task.id, parentId);
                if (task.children && task.children.length > 0) {
                    buildParentMap(task.children, map, task.id);
                }
            });
            return map;
        };

        const verifyReorderPersistence = (taskIds) => {
            if (!app.apiClient || taskIds.length === 0) {
                return;
            }
            const expectedParents = new Map();
            taskIds.forEach((id) => {
                const parent = app.store.findParent(id);
                expectedParents.set(id, parent ? parent.id : null);
            });

            setTimeout(() => {
                app.apiClient.getTasksTree()
                    .then((tasks) => {
                        const apiParents = buildParentMap(tasks);
                        const mismatches = [];
                        expectedParents.forEach((expectedParentId, taskId) => {
                            const apiParentId = apiParents.get(taskId) ?? null;
                            if (apiParentId !== expectedParentId) {
                                mismatches.push({ taskId, expectedParentId, apiParentId });
                            }
                        });
                        if (mismatches.length > 0) {
                            console.warn('Task reorder persistence mismatch', mismatches);
                            if (typeof showToast === 'function') {
                                showToast('Task reorder did not persist (see console)');
                            }
                        }
                    })
                    .catch((error) => {
                        console.warn('Task reorder verify failed', error);
                    });
            }, 500);
        };

        const getSelectedRootIdsInOrder = () => {
            const selected = app.selectedTaskIds.size > 0
                ? new Set(app.selectedTaskIds)
                : new Set();
            const allRows = Array.from(container.querySelectorAll('.task-row'));
            const orderIndex = new Map(allRows.map((row, index) => [row.dataset.taskId, index]));
            const ids = selected.size > 0 ? Array.from(selected) : [];
            if (selected.size === 0 && app.lastSelectedTaskId) {
                ids.push(app.lastSelectedTaskId);
            }

            const rootIds = ids.filter(id => {
                let parent = app.store.findParent(id);
                while (parent) {
                    if (selected.has(parent.id)) return false;
                    parent = app.store.findParent(parent.id);
                }
                return true;
            });

            rootIds.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));
            return rootIds;
        };

        const buildBulletedList = (task, depth = 0) => {
            const indent = '  '.repeat(depth);
            let text = `${indent}- ${task.title}\n`;
            if (task.children && task.children.length > 0) {
                task.children.forEach(child => {
                    text += buildBulletedList(child, depth + 1);
                });
            }
            return text;
        };

        const copyTextToClipboard = (text) => {
            if (!text) return;
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).catch((error) => {
                    console.warn('Clipboard copy failed', error);
                });
                return;
            }
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.top = '-1000px';
            textarea.style.left = '-1000px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand('copy');
            } catch (error) {
                console.warn('Clipboard copy failed', error);
            } finally {
                textarea.remove();
            }
        };

        const indentSelectedTasks = (selectedIds) => {
            if (selectedIds.length === 0) return false;
            const selectedSet = new Set(selectedIds);
            const syncTargets = new Map();
            let moved = false;
            let saved = false;

            const markSync = (siblings, parentId) => {
                syncTargets.set(siblings, parentId ?? null);
            };

            selectedIds.forEach((taskId) => {
                const parent = app.store.findParent(taskId);
                const siblings = parent ? parent.children : app.store.tasks;
                const currentIndex = siblings.findIndex(t => t.id === taskId);
                if (currentIndex <= 0) return;

                let prevIndex = currentIndex - 1;
                while (prevIndex >= 0 && selectedSet.has(siblings[prevIndex].id)) {
                    prevIndex -= 1;
                }
                if (prevIndex < 0) return;

                const previousSibling = siblings[prevIndex];
                const task = siblings[currentIndex];

                if (!saved) {
                    app.store.saveState();
                    saved = true;
                }

                siblings.splice(currentIndex, 1);
                if (!previousSibling.children) {
                    previousSibling.children = [];
                }
                previousSibling.children.push(task);
                delete task.projectId;

                if (app.store.collapsed.has(previousSibling.id)) {
                    app.store.collapsed.delete(previousSibling.id);
                }

                markSync(siblings, parent ? parent.id : null);
                markSync(previousSibling.children, previousSibling.id);
                moved = true;
            });

            if (moved) {
                syncTargets.forEach((parentId, siblings) => {
                    syncTaskPositions(app, siblings, parentId);
                });
            }

            return moved;
        };

        const outdentSelectedTasks = (selectedIds) => {
            if (selectedIds.length === 0) return false;
            const selectedSet = new Set(selectedIds);
            const syncTargets = new Map();
            let moved = false;
            let saved = false;

            const markSync = (siblings, parentId) => {
                syncTargets.set(siblings, parentId ?? null);
            };

            const parentGroups = new Map();
            selectedIds.forEach((taskId) => {
                const parent = app.store.findParent(taskId);
                if (!parent) return;
                if (!parentGroups.has(parent.id)) {
                    parentGroups.set(parent.id, { parent, taskIds: [] });
                }
                parentGroups.get(parent.id).taskIds.push(taskId);
            });

            if (parentGroups.size === 0) return false;

            parentGroups.forEach(({ parent, taskIds }) => {
                const grandparent = app.store.findParent(parent.id);
                const sourceSiblings = parent.children;
                const targetSiblings = grandparent ? grandparent.children : app.store.tasks;
                const parentIndexInTarget = targetSiblings.findIndex(t => t.id === parent.id);
                if (parentIndexInTarget === -1) return;

                const tasksToMove = taskIds
                    .map(id => app.store.findTask(id))
                    .filter(Boolean)
                    .sort((a, b) => sourceSiblings.findIndex(t => t.id === a.id) - sourceSiblings.findIndex(t => t.id === b.id));

                const tasksToRemove = [...tasksToMove].sort((a, b) =>
                    sourceSiblings.findIndex(t => t.id === b.id) - sourceSiblings.findIndex(t => t.id === a.id)
                );

                if (!saved) {
                    app.store.saveState();
                    saved = true;
                }

                tasksToRemove.forEach(task => {
                    const index = sourceSiblings.findIndex(t => t.id === task.id);
                    if (index > -1) {
                        sourceSiblings.splice(index, 1);
                    }
                });

                tasksToMove.forEach((task) => {
                    if (!grandparent) {
                        if (app.store.projectViewMode === 'project' &&
                            app.store.selectedProjectId && app.store.selectedProjectId !== 'unassigned') {
                            task.projectId = app.store.selectedProjectId;
                        } else if (parent.projectId) {
                            task.projectId = parent.projectId;
                        } else {
                            delete task.projectId;
                        }
                    }
                    if (!grandparent && app.store.parentFilterInitialized) {
                        app.store.selectedParents.add(task.id);
                    }
                });

                const insertIndex = parentIndexInTarget + 1;
                targetSiblings.splice(insertIndex, 0, ...tasksToMove);

                markSync(sourceSiblings, parent.id);
                markSync(targetSiblings, grandparent ? grandparent.id : null);
                moved = true;
            });

            if (moved) {
                syncTargets.forEach((parentId, siblings) => {
                    syncTaskPositions(app, siblings, parentId);
                });
            }

            return moved;
        };

        const renderTask = (task, depth = 0) => {
            const isCollapsed = app.store.collapsed.has(task.id);
            const hasChildren = task.children && task.children.length > 0;
            const opacity = task._matches === false ? 0.4 : 1;
            const relatedTasks = app.store.getRelatedTasks(task.id);
            const isSelected = app.selectedTaskIds.has(task.id);

            // Get project-specific colors
            const taskColors = app.store.getTaskColors(task.id);
            const statusColor = taskColors.statusColors[task.metadata.status] || '#94a3b8';

            // All tasks are draggable for reordering
            let taskHtml = `
                <div class="task-row ${isSelected ? 'selected' : ''}" style="margin-left: ${depth === 0 ? 0 : depth * 20}px; opacity: ${opacity};" data-task-id="${task.id}" data-depth="${depth}" tabindex="0" draggable="true">
                    ${hasChildren ?
                        `<button class="collapse-btn" data-collapse="${task.id}">${isCollapsed ? '▶' : '▼'}</button>` :
                        '<span style="width: 20px"></span>'
                    }
                    <div class="status-icon" data-task-click="${task.id}" data-toggle-status="${task.id}" style="cursor: pointer; background: ${statusColor}20; color: ${statusColor}; border: 2px solid ${statusColor};">
                        ${task.metadata.status === 'done' ? '✓' :
                          task.metadata.status === 'in-progress' ? '⚡' :
                          task.metadata.status === 'review' ? '👁' : '○'}
                    </div>
                    <span class="task-title" data-task-click="${task.id}" data-original-title="${task.title}">${task.title}</span>
                    ${relatedTasks.length > 0 ? `<span class="related-badge" data-filter-related="${task.id}" title="Click to filter by related tasks">⟷ ${relatedTasks.length}</span>` : ''}
                    ${app.store.showAssigneeInOutline && task.metadata.assignee ? `<div class="assignee">${task.metadata.assignee}</div>` : ''}
                    ${app.store.showPriorityInOutline && task.metadata.priority === 'high' ? `<span class="priority-indicator" title="High Priority" style="color: ${taskColors.priorityColors.high};">⚠️</span>` : ''}
                    ${isCollapsed && hasChildren ? `<span class="badge" style="background: #e0e0e0; color: #666">${task.children.length}</span>` : ''}
                </div>
            `;

            if (app.store.showDescriptions && task.description) {
                taskHtml += `<div class="task-description" style="margin-left: ${depth === 0 ? 64 : depth * 20 + 64}px" contenteditable="true" data-task-id="${task.id}" data-original-desc="${task.description}">${task.description}</div>`;
            } else if (app.store.showDescriptions) {
                taskHtml += `<div class="task-description task-placeholder" style="margin-left: ${depth === 0 ? 64 : depth * 20 + 64}px" contenteditable="true" data-task-id="${task.id}" data-original-desc="">Click to add description...</div>`;
            }

            if (!isCollapsed && hasChildren) {
                taskHtml += task.children.map(child => renderTask(child, depth + 1)).join('');
            }

            return taskHtml;
        };

        const tasks = app.store.getFilteredTasks();

        // Group root-level tasks by project for single container per project
        const renderTasksGroupedByProject = (tasks) => {
            const grouped = new Map();
            tasks.forEach(task => {
                const taskProjectId = task.projectId || null;
                if (!grouped.has(taskProjectId)) {
                    grouped.set(taskProjectId, []);
                }
                grouped.get(taskProjectId).push(task);
            });

            const renderGroup = (project, groupTasks) => {
                if (!groupTasks || groupTasks.length === 0) return '';
                const tasksHtml = groupTasks.map(t => {
                    const containerColor = t.metadata?.containerColor;
                    const taskHtml = renderTask(t);
                    if (!containerColor) {
                        return taskHtml;
                    }
                    return `
                        <div class="parent-container" style="border: 2px solid ${containerColor}; background: ${containerColor}15; border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                            ${taskHtml}
                        </div>
                    `;
                }).join('');
                if (!project) {
                    return tasksHtml;
                }
                return `
                    <div class="project-container" data-project-id="${project.id}" style="border: 2px solid ${project.color}; background: ${project.color}15; border-radius: 8px; padding: 8px; margin-bottom: 12px;">
                        <div class="project-container-header" style="font-size: 11px; color: ${project.color}; font-weight: 600; margin-bottom: 6px; padding-left: 4px;">${project.name}</div>
                        ${tasksHtml}
                    </div>
                `;
            };

            let html = '';
            const projects = app.store.getProjects();
            projects.forEach(project => {
                if (grouped.has(project.id)) {
                    html += renderGroup(project, grouped.get(project.id));
                    grouped.delete(project.id);
                }
            });

            if (grouped.has(null)) {
                html += renderGroup(null, grouped.get(null));
                grouped.delete(null);
            }

            grouped.forEach((groupTasks) => {
                html += renderGroup(null, groupTasks);
            });

            return html;
        };

        const showEditHint = !app.settings.get('disableTooltips');
        container.innerHTML = `
            <div class="outline-view">
                ${renderTasksGroupedByProject(tasks)}
            </div>
            ${showEditHint ? `
            <div class="inline-edit-hint" id="editHint">
                💡 <strong>Type</strong> to edit | <strong>Ctrl+Click</strong> = multi-select | <strong>Shift+Click</strong> = range | <strong>Ctrl+C/X/V</strong> = copy/cut/paste | <strong>Enter</strong> = new | <strong>Tab</strong> = indent | <strong>Delete</strong> = remove
            </div>
            ` : ''}
        `;

        // Show hint briefly
        const hint = container.querySelector('#editHint');
        if (hint) {
            hint.classList.add('visible');
            setTimeout(() => hint.classList.remove('visible'), 4000);
        }

        // Track current selection
        let currentSelection = app.selectedTaskId;

        // Event listeners for collapse
        container.querySelectorAll('[data-collapse]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                app.store.toggleCollapse(e.target.dataset.collapse);
            });
        });

        // Event listeners for task rows
        container.querySelectorAll('.task-row').forEach(row => {
            const taskId = row.dataset.taskId;
            const depth = parseInt(row.dataset.depth);

            // Click to select (with multi-select support)
            row.addEventListener('click', (e) => {
                if (e.target.classList.contains('collapse-btn')) return;
                if (e.target.classList.contains('related-badge')) return; // Let badge handle its own click

                // Handle link/relate mode on row click
                if (app.linkMode) {
                    app.handleLinkModeClick(taskId);
                    return;
                }
                if (app.relateLinkMode) {
                    app.handleRelateModeClick(taskId);
                    return;
                }

                // Reset editing flag on click
                app.justExitedEditing = false;

                // Get all visible task rows for shift-select range
                const allRows = Array.from(container.querySelectorAll('.task-row'));
                const allTaskIds = allRows.map(r => r.dataset.taskId);

                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Click: Toggle selection
                    if (app.selectedTaskIds.has(taskId)) {
                        app.selectedTaskIds.delete(taskId);
                        row.classList.remove('selected');
                    } else {
                        app.selectedTaskIds.add(taskId);
                        row.classList.add('selected');
                    }
                    app.lastSelectedTaskId = taskId;
                } else if (e.shiftKey && app.lastSelectedTaskId) {
                    // Shift+Click: Select range
                    const lastIndex = allTaskIds.indexOf(app.lastSelectedTaskId);
                    const currentIndex = allTaskIds.indexOf(taskId);

                    if (lastIndex !== -1 && currentIndex !== -1) {
                        const start = Math.min(lastIndex, currentIndex);
                        const end = Math.max(lastIndex, currentIndex);

                        // Clear previous selection
                        app.selectedTaskIds.clear();
                        container.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));

                        // Select range
                        for (let i = start; i <= end; i++) {
                            app.selectedTaskIds.add(allTaskIds[i]);
                            allRows[i].classList.add('selected');
                        }
                    }
                } else {
                    // Regular click: Select only this task
                    app.selectedTaskIds.clear();
                    container.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));
                    app.selectedTaskIds.add(taskId);
                    row.classList.add('selected');
                    app.lastSelectedTaskId = taskId;
                }

                currentSelection = taskId;
            });

            // Double-click to open detail panel
            row.addEventListener('dblclick', (e) => {
                // Exclude double-click on interactive elements
                const isExcluded =
                    e.target.classList.contains('task-title') ||
                    e.target.classList.contains('task-description') ||
                    e.target.classList.contains('status-icon') ||
                    e.target.classList.contains('assignee') ||
                    e.target.classList.contains('priority-indicator') ||
                    e.target.classList.contains('collapse-btn') ||
                    e.target.classList.contains('related-badge');

                if (!isExcluded) {
                    app.showDetailPanel(taskId);
                }
            });

            // Drag and drop for reordering tasks
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', taskId);
                e.dataTransfer.setData('application/x-task-id', taskId);
                e.dataTransfer.effectAllowed = 'move';
                row.classList.add('dragging');
                app.draggedTaskId = taskId;
            });

            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                app.draggedTaskId = null;
                // Clean up all drop indicators
                container.querySelectorAll('.drop-above, .drop-below, .drop-child').forEach(el => {
                    el.classList.remove('drop-above', 'drop-below', 'drop-child');
                });
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                // Don't allow dropping on self
                if (app.draggedTaskId === taskId) return;

                // Don't allow dropping on own descendants
                const draggedTask = app.store.findTask(app.draggedTaskId);
                if (draggedTask && isDescendant(draggedTask, taskId)) return;

                // Determine drop position based on mouse Y position within row
                const rect = row.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const height = rect.height;

                // Clear previous indicators on this row
                row.classList.remove('drop-above', 'drop-below', 'drop-child');

                if (y < height * 0.25) {
                    // Top 25% - drop above
                    row.classList.add('drop-above');
                } else if (y > height * 0.75) {
                    // Bottom 25% - drop below
                    row.classList.add('drop-below');
                } else {
                    // Middle 50% - drop as child
                    row.classList.add('drop-child');
                }
            });

            row.addEventListener('dragleave', (e) => {
                // Only remove if leaving the row entirely
                if (!row.contains(e.relatedTarget)) {
                    row.classList.remove('drop-above', 'drop-below', 'drop-child');
                }
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('application/x-task-id') ||
                                  e.dataTransfer.getData('text/plain');

                if (!draggedId || draggedId === taskId) return;

                // Check if dropped on descendant
                const draggedTask = app.store.findTask(draggedId);
                if (draggedTask && isDescendant(draggedTask, taskId)) return;

                // Determine drop type
                const rect = row.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const height = rect.height;

                let dropType;
                if (y < height * 0.25) {
                    dropType = 'above';
                } else if (y > height * 0.75) {
                    dropType = 'below';
                } else {
                    dropType = 'child';
                }

                // Perform the move
                moveTask(app, draggedId, taskId, dropType);

                // Clear indicators
                row.classList.remove('drop-above', 'drop-below', 'drop-child');
            });

            // Inline title editing
            const titleEl = row.querySelector('.task-title');

            // Click on title to start editing
            titleEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't trigger row click
                titleEl.setAttribute('contenteditable', 'true');
                titleEl.focus();
            });

            titleEl.addEventListener('blur', (e) => {
                // Disable editing when focus leaves
                titleEl.setAttribute('contenteditable', 'false');
                const input = e.target.textContent.trim();
                const originalTitle = e.target.dataset.originalTitle;

                if (!input) {
                    // If empty, restore original title
                    e.target.textContent = originalTitle;
                    return;
                }

                if (input !== originalTitle) {
                    // Parse for # delimiter to extract title and description
                    const { title, description } = parseTaskInput(input);
                    const task = app.store.findTask(taskId);

                    // Update task with parsed values
                    const updates = { title };
                    if (description) {
                        // If description was provided via #, update it
                        updates.description = description;
                    }
                    // Note: if no # delimiter, only title updates, description stays unchanged

                    app.store.updateTask(taskId, updates);
                }
            });

            titleEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    app.justExitedEditing = true;
                    app.focusTaskAfterRender = taskId; // Set focus target before blur triggers re-render
                    titleEl.blur();
                }
            });

            // Keyboard shortcuts
            row.addEventListener('keydown', (e) => {
                // Check if currently editing
                const isEditingTitle = e.target.getAttribute('contenteditable') === 'true' && e.target.classList.contains('task-title');
                const isEditingDescription = e.target.getAttribute('contenteditable') === 'true' && e.target.classList.contains('task-description');
                const isEditing = isEditingTitle || isEditingDescription;

                if (isEditingTitle) {
                    // Allow Tab while editing to navigate away from title
                    if (e.key === 'Tab') {
                        return;
                    }
                }

                // Start typing to edit: detect printable characters
                if (!isEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    // Printable character typed on selected row - enter edit mode
                    e.preventDefault();
                    const titleEl = row.querySelector('.task-title');
                    if (titleEl) {
                        // Clear existing text and insert the typed character
                        titleEl.textContent = e.key;
                        titleEl.setAttribute('contenteditable', 'true');
                        titleEl.focus();
                        // Position cursor at end (after the character)
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.selectNodeContents(titleEl);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    return;
                }

                // Always prevent Tab from navigating to other elements
                if (e.key === 'Tab') {
                    e.preventDefault();
                    e.stopPropagation();
                }

                if (e.key === 'Enter') {
                    // If we just exited editing, don't create task yet
                    if (app.justExitedEditing) {
                        app.justExitedEditing = false;
                        // Ensure the edited row is selected after exiting edit mode.
                        app.selectedTaskIds.clear();
                        app.selectedTaskIds.add(taskId);
                        app.lastSelectedTaskId = taskId;
                        container.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));
                        row.classList.add('selected');
                        // Focus row now (if no re-render happened, focus restoration won't run)
                        row.focus();
                        // Clear the focus flag since we're handling it now
                        app.focusTaskAfterRender = null;
                        return;
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    // Create sibling task below current task
                    const task = app.store.findTask(taskId);
                    const parent = app.store.findParent(taskId);
                    const siblings = parent ? parent.children : app.store.tasks;
                    const currentIndex = siblings.findIndex(t => t.id === taskId);

                    const taskProject = app.store.getTaskProject(taskId);
                    const projectForAssignee = taskProject ? taskProject.id : null;
                    const defaultAssignee = app.getProjectDefaultAssignee && projectForAssignee
                        ? app.getProjectDefaultAssignee(projectForAssignee)
                        : '';

                    // Create new task object
                    const newTask = {
                        id: app.store.generateId(),
                        _pendingCreate: true,
                        title: 'New Task',
                        description: '',
                        metadata: {
                            status: 'todo',
                            priority: 'medium',
                            assignee: defaultAssignee,
                            startDate: '',
                            endDate: ''
                        },
                        children: []
                    };

                    // If adding at root level, assign to selected project
                    if (!parent && app.store.projectViewMode === 'project' &&
                        app.store.selectedProjectId && app.store.selectedProjectId !== 'unassigned') {
                        newTask.projectId = app.store.selectedProjectId;
                    }

                    // Insert new task right after current task
                    siblings.splice(currentIndex + 1, 0, newTask);

                    app.store.saveState();
                    app.store.notify();

                    syncTaskPositions(app, siblings, parent ? parent.id : null);
                    persistTaskSubtree(app, newTask, parent ? parent.id : null, currentIndex + 1);

                    // If adding at root level, add to parent selection (keep existing selections)
                    if (!parent && app.store.parentFilterInitialized) {
                        app.store.selectedParents.add(newTask.id);
                    }

                    // Update selection to new task
                    app.selectedTaskIds.clear();
                    app.selectedTaskIds.add(newTask.id);
                    app.lastSelectedTaskId = newTask.id;

                    setTimeout(() => {
                        app.render();
                        // Focus on new task
                        const newRow = container.querySelector(`[data-task-id="${newTask.id}"]`);
                        if (newRow) {
                            newRow.classList.add('selected');
                            newRow.focus();
                            const titleInput = newRow.querySelector('.task-title');
                            if (titleInput) {
                                titleInput.setAttribute('contenteditable', 'true');
                                titleInput.focus();
                                // Select all text for immediate editing
                                const range = document.createRange();
                                range.selectNodeContents(titleInput);
                                const sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(range);
                            }
                        }
                    }, 50);

                } else if (e.key === 'Tab' && !e.shiftKey) {
                    // Move task down one level in hierarchy (indent)
                    const selectedRootIds = getSelectedRootIdsInOrder();
                    if (selectedRootIds.length > 1) {
                        const moved = indentSelectedTasks(selectedRootIds);
                        if (moved) {
                            app.lastSelectedTaskId = taskId;
                            app.focusTaskAfterRender = taskId;
                            app.store.notify();
                            verifyReorderPersistence(selectedRootIds);
                        } else {
                            setTimeout(() => {
                                const refocusRow = container.querySelector(`[data-task-id="${taskId}"]`);
                                if (refocusRow) {
                                    refocusRow.focus();
                                    refocusRow.classList.add('selected');
                                }
                            }, 0);
                        }
                        return;
                    }
                    // Find previous sibling to make this task its child
                    const parent = app.store.findParent(taskId);
                    const siblings = parent ? parent.children : app.store.tasks;
                    const currentIndex = siblings.findIndex(t => t.id === taskId);

                    if (currentIndex > 0) {
                        // There's a previous sibling
                        const previousSibling = siblings[currentIndex - 1];
                        const task = siblings[currentIndex];

                        // Remove from current parent
                        siblings.splice(currentIndex, 1);

                        // Add as child of previous sibling
                        if (!previousSibling.children) {
                            previousSibling.children = [];
                        }
                        previousSibling.children.push(task);

                        // Expand previous sibling if collapsed
                        if (app.store.collapsed.has(previousSibling.id)) {
                            app.store.collapsed.delete(previousSibling.id);
                        }

                        app.store.saveState();
                        app.selectedTaskIds.clear();
                        app.selectedTaskIds.add(taskId);
                        app.lastSelectedTaskId = taskId;
                        syncTaskPositions(app, siblings, parent ? parent.id : null);
                        syncTaskPositions(app, previousSibling.children, previousSibling.id);

                        // Re-render and refocus
                        setTimeout(() => {
                            app.render();
                            const refocusRow = container.querySelector(`[data-task-id="${taskId}"]`);
                            if (refocusRow) {
                                refocusRow.focus();
                                refocusRow.classList.add('selected');
                            }
                        }, 0);
                    }
                    // If currentIndex is 0 or no previous sibling, just do nothing (already prevented default)
                    else {
                        setTimeout(() => {
                            const refocusRow = container.querySelector(`[data-task-id="${taskId}"]`);
                            if (refocusRow) {
                                refocusRow.focus();
                                refocusRow.classList.add('selected');
                            }
                        }, 0);
                    }

                } else if (e.key === 'Tab' && e.shiftKey) {
                    // Move task up one level in hierarchy (outdent)
                    const selectedRootIds = getSelectedRootIdsInOrder();
                    if (selectedRootIds.length > 1) {
                        const moved = outdentSelectedTasks(selectedRootIds);
                        if (moved) {
                            app.lastSelectedTaskId = taskId;
                            app.focusTaskAfterRender = taskId;
                            app.store.notify();
                            verifyReorderPersistence(selectedRootIds);
                        } else {
                            setTimeout(() => {
                                const refocusRow = container.querySelector(`[data-task-id="${taskId}"]`);
                                if (refocusRow) {
                                    refocusRow.focus();
                                    refocusRow.classList.add('selected');
                                }
                            }, 0);
                        }
                        return;
                    }
                    const parent = app.store.findParent(taskId);
                    if (parent) {
                        const grandparent = app.store.findParent(parent.id);
                        const task = app.store.findTask(taskId);

                        // Remove from current parent
                        const parentIndex = parent.children.findIndex(t => t.id === taskId);
                        if (parentIndex > -1) {
                            parent.children.splice(parentIndex, 1);
                        }

                        // Add to grandparent (or root if no grandparent)
                        if (grandparent) {
                            // Find parent's index in grandparent and insert after it
                            const parentIndexInGrandparent = grandparent.children.findIndex(t => t.id === parent.id);
                            grandparent.children.splice(parentIndexInGrandparent + 1, 0, task);
                        } else {
                            // Parent is at root level, so add to root after parent
                            const parentIndexInRoot = app.store.tasks.findIndex(t => t.id === parent.id);
                            app.store.tasks.splice(parentIndexInRoot + 1, 0, task);

                            // Assign to project: prefer current project view, fallback to parent's project
                            if (app.store.projectViewMode === 'project' && app.store.selectedProjectId && app.store.selectedProjectId !== 'unassigned') {
                                task.projectId = app.store.selectedProjectId;
                            } else if (parent.projectId) {
                                // Inherit from parent's project
                                task.projectId = parent.projectId;
                            } else {
                                delete task.projectId; // Unassigned
                            }
                        }

                        app.store.saveState();
                        syncTaskPositions(app, parent.children, parent.id);
                        syncTaskPositions(
                            app,
                            grandparent ? grandparent.children : app.store.tasks,
                            grandparent ? grandparent.id : null
                        );

                        // If task is now at root level, add to parent selection (keep existing selections)
                        if (!grandparent && app.store.parentFilterInitialized) {
                            app.store.selectedParents.add(task.id);
                        }

                        app.selectedTaskIds.clear();
                        app.selectedTaskIds.add(taskId);
                        app.lastSelectedTaskId = taskId;

                        // Re-render and refocus
                        setTimeout(() => {
                            app.render();
                            const refocusRow = container.querySelector(`[data-task-id="${taskId}"]`);
                            if (refocusRow) {
                                refocusRow.focus();
                                refocusRow.classList.add('selected');
                            }
                        }, 0);
                    }
                    // If no parent (already at root), just do nothing (already prevented default)

                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    // Only delete task if NOT currently editing text
                    const isEditingText = e.target.getAttribute('contenteditable') === 'true' &&
                                          (e.target.classList.contains('task-title') ||
                                           e.target.classList.contains('task-description'));

                    if (isEditingText) {
                        // Allow normal text editing (backspace/delete characters)
                        return;
                    }

                    // Otherwise, delete the task
                    e.preventDefault();
                    e.stopPropagation();

                    // If multiple tasks selected, delete all
                    if (app.selectedTaskIds.size > 1) {
                        if (confirm(`Delete ${app.selectedTaskIds.size} tasks?`)) {
                            app.store.saveState();
                            app.selectedTaskIds.forEach(id => {
                                app.store.deleteTask(id);
                            });
                            app.selectedTaskIds.clear();
                            app.lastSelectedTaskId = null;
                            app.render();
                        }
                    } else if (confirm(`Delete "${app.store.findTask(taskId).title}"?`)) {
                        app.store.deleteTask(taskId);
                        app.selectedTaskIds.clear();
                        app.lastSelectedTaskId = null;
                        app.render();
                    }
                } else if (e.key === 'ArrowDown') {
                    app.justExitedEditing = false; // Reset flag on navigation
                    e.preventDefault();
                    e.stopPropagation();
                    const allRows = Array.from(container.querySelectorAll('.task-row'));
                    const currentIndex = allRows.indexOf(row);
                    if (currentIndex < allRows.length - 1) {
                        const nextTaskId = allRows[currentIndex + 1].dataset.taskId;
                        allRows.forEach(r => r.classList.remove('selected'));
                        allRows[currentIndex + 1].classList.add('selected');
                        allRows[currentIndex + 1].focus();
                        app.selectedTaskIds.clear();
                        app.selectedTaskIds.add(nextTaskId);
                        app.lastSelectedTaskId = nextTaskId;
                        const detailPanel = document.getElementById('detailPanel');
                        if (detailPanel && detailPanel.classList.contains('visible')) {
                            app.showDetailPanel(nextTaskId);
                        }
                    }
                } else if (e.key === 'ArrowUp') {
                    app.justExitedEditing = false; // Reset flag on navigation
                    e.preventDefault();
                    e.stopPropagation();
                    const allRows = Array.from(container.querySelectorAll('.task-row'));
                    const currentIndex = allRows.indexOf(row);
                    if (currentIndex > 0) {
                        const prevTaskId = allRows[currentIndex - 1].dataset.taskId;
                        allRows.forEach(r => r.classList.remove('selected'));
                        allRows[currentIndex - 1].classList.add('selected');
                        allRows[currentIndex - 1].focus();
                        app.selectedTaskIds.clear();
                        app.selectedTaskIds.add(prevTaskId);
                        app.lastSelectedTaskId = prevTaskId;
                        const detailPanel = document.getElementById('detailPanel');
                        if (detailPanel && detailPanel.classList.contains('visible')) {
                            app.showDetailPanel(prevTaskId);
                        }
                    }
                }
            });

            // Make row focusable for keyboard navigation
            row.setAttribute('tabindex', '0');
        });

        // Click project container to select all tasks in that project
        container.querySelectorAll('.project-container').forEach(projectContainer => {
            projectContainer.addEventListener('click', (e) => {
                if (e.target.closest('.task-row') ||
                    e.target.closest('.collapse-btn') ||
                    e.target.closest('.status-icon') ||
                    e.target.closest('.related-badge') ||
                    e.target.closest('.task-title') ||
                    e.target.closest('.task-description')) {
                    return;
                }

                const taskRows = Array.from(projectContainer.querySelectorAll('.task-row'));
                if (taskRows.length === 0) return;

                const allSelected = taskRows.every(row => app.selectedTaskIds.has(row.dataset.taskId));
                if (allSelected) {
                    taskRows.forEach(row => row.classList.remove('selected'));
                    app.selectedTaskIds.clear();
                    app.lastSelectedTaskId = null;
                    return;
                }

                app.selectedTaskIds.clear();
                container.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));
                taskRows.forEach(row => {
                    app.selectedTaskIds.add(row.dataset.taskId);
                    row.classList.add('selected');
                });
                app.lastSelectedTaskId = taskRows[taskRows.length - 1].dataset.taskId;
                taskRows[0].focus();
            });
        });

        // Click on status icon to toggle status or open detail panel
        container.querySelectorAll('[data-task-click]').forEach(el => {
            if (!el.classList.contains('task-title')) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const taskId = e.target.dataset.taskClick;

                    // Check if this is a status toggle click
                    if (e.target.dataset.toggleStatus) {
                        const task = app.store.findTask(taskId);
                        if (task) {
                            const currentStatus = task.metadata.status || 'todo';
                            const nextStatusMap = {
                                'todo': 'in-progress',
                                'in-progress': 'review',
                                'review': 'done',
                                'done': 'todo'
                            };
                            const newStatus = (e.ctrlKey || e.metaKey)
                                ? 'done'
                                : (nextStatusMap[currentStatus] || 'in-progress');

                            // Recursive function to update task and all children
                            const updateTaskAndChildren = (t, status) => {
                                t.metadata.status = status;
                                if (app.apiClient) {
                                    app.apiClient.updateTask(t.id, {
                                        metadata: { status }
                                    }).catch((error) => {
                                        if (app.apiClient) {
                                            app.apiClient.reportError(error, 'Status update failed', { silent: true });
                                        }
                                    });
                                }
                                if (t.children && t.children.length > 0) {
                                    t.children.forEach(child => updateTaskAndChildren(child, status));
                                }
                            };

                            const updateParentStatuses = (childId) => {
                                const updatedParents = app.store.updateAncestorStatuses(childId);
                                if (app.apiClient && updatedParents.length > 0) {
                                    updatedParents.forEach(({ id: parentId, status }) => {
                                        app.apiClient.updateTask(parentId, {
                                            metadata: { status }
                                        }).catch((error) => {
                                            if (app.apiClient) {
                                                app.apiClient.reportError(error, 'Status update failed', { silent: true });
                                            }
                                        });
                                    });
                                }
                            };

                            app.store.saveState();
                            updateTaskAndChildren(task, newStatus);
                            updateParentStatuses(taskId);
                            app.store.notify();
                            app.store.applyRollupStatuses();
                        }
                        return; // Don't open detail panel
                    }

                    // Otherwise, handle link mode, relate mode, or detail panel
                    if (app.linkMode) {
                        app.handleLinkModeClick(taskId);
                    } else if (app.relateLinkMode) {
                        app.handleRelateModeClick(taskId);
                    } else {
                        app.showDetailPanel(taskId);
                    }
                });
            }
        });

        // Description editing
        container.querySelectorAll('.task-description[contenteditable="true"]').forEach(descEl => {
            const taskId = descEl.dataset.taskId;

            // Clear placeholder on focus
            descEl.addEventListener('focus', (e) => {
                if (descEl.classList.contains('task-placeholder')) {
                    descEl.textContent = '';
                    descEl.classList.remove('task-placeholder');
                }
            });

            // Save on blur
            descEl.addEventListener('blur', (e) => {
                const newDesc = e.target.textContent.trim();
                const originalDesc = e.target.dataset.originalDesc;

                if (newDesc !== originalDesc) {
                    app.store.updateTask(taskId, { description: newDesc });
                    e.target.dataset.originalDesc = newDesc;
                }

                // Restore placeholder if empty
                if (!newDesc) {
                    descEl.classList.add('task-placeholder');
                    descEl.textContent = 'Click to add description...';
                }
            });

            // Prevent Enter from creating new lines, instead blur to save
            descEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    app.justExitedEditing = true;
                    app.focusTaskAfterRender = taskId; // Set focus target before blur triggers re-render
                    descEl.blur();
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

        // Restore focus to row after re-render if needed
        if (taskToFocus) {
            setTimeout(() => {
                const rowToFocus = container.querySelector(`[data-task-id="${taskToFocus}"]`);
                if (rowToFocus) {
                    rowToFocus.focus();
                    if (app.selectedTaskIds && app.selectedTaskIds.size > 0) {
                        container.querySelectorAll('.task-row').forEach(r => r.classList.remove('selected'));
                        app.selectedTaskIds.forEach((id) => {
                            const row = container.querySelector(`[data-task-id="${id}"]`);
                            if (row) {
                                row.classList.add('selected');
                            }
                        });
                    } else {
                        rowToFocus.classList.add('selected');
                    }
                }
            }, 0);
        }

        // Global keyboard shortcuts for copy/cut/paste
        const handleCopyPaste = (e) => {
            // Only handle if in outline view
            if (app.currentView !== 'outline') return;

            // Don't interfere with text editing
            const isEditingText = document.activeElement?.getAttribute('contenteditable') === 'true';
            if (isEditingText) return;

            // Copy (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
                if (app.selectedTaskIds.size > 0) {
                    e.preventDefault();
                    // Deep copy selected tasks
                    app.clipboard.tasks = Array.from(app.selectedTaskIds).map(id => {
                        const task = app.store.findTask(id);
                        return JSON.parse(JSON.stringify(task));
                    });
                    app.clipboard.mode = 'copy';
                    const rootIds = getSelectedRootIdsInOrder();
                    if (rootIds.length > 0) {
                        const bulletText = rootIds
                            .map(id => app.store.findTask(id))
                            .filter(Boolean)
                            .map(task => buildBulletedList(task).trimEnd())
                            .join('\n');
                        copyTextToClipboard(bulletText);
                    }
                    console.log(`Copied ${app.clipboard.tasks.length} task(s)`);
                }
            }

            // Cut (Ctrl+X)
            if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !e.shiftKey) {
                if (app.selectedTaskIds.size > 0) {
                    e.preventDefault();
                    // Deep copy selected tasks
                    app.clipboard.tasks = Array.from(app.selectedTaskIds).map(id => {
                        const task = app.store.findTask(id);
                        return JSON.parse(JSON.stringify(task));
                    });
                    app.clipboard.mode = 'cut';
                    app.clipboard.cutTaskIds = new Set(app.selectedTaskIds);
                    console.log(`Cut ${app.clipboard.tasks.length} task(s)`);
                }
            }

            // Paste (Ctrl+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
                if (app.clipboard.tasks.length > 0) {
                    e.preventDefault();

                    const pasteAfterTaskId = app.lastSelectedTaskId || Array.from(app.selectedTaskIds)[0];
                    if (!pasteAfterTaskId) return;

                    const pasteTask = app.store.findTask(pasteAfterTaskId);
                    if (!pasteTask) return;

                    const parent = app.store.findParent(pasteAfterTaskId);
                    const siblings = parent ? parent.children : app.store.tasks;
                    const insertIndex = siblings.findIndex(t => t.id === pasteAfterTaskId) + 1;

                    app.store.saveState();

                    // If cutting, remove original tasks first
                    if (app.clipboard.mode === 'cut' && app.clipboard.cutTaskIds) {
                        app.clipboard.cutTaskIds.forEach(cutId => {
                            const cutParent = app.store.findParent(cutId);
                            const cutSiblings = cutParent ? cutParent.children : app.store.tasks;
                            const cutIndex = cutSiblings.findIndex(t => t.id === cutId);
                            if (cutIndex !== -1) {
                                cutSiblings.splice(cutIndex, 1);
                                syncTaskPositions(app, cutSiblings, cutParent ? cutParent.id : null);
                            }
                            if (app.apiClient) {
                                app.apiClient.deleteTask(cutId).catch((error) => {
                                    if (app.apiClient) {
                                        app.apiClient.reportError(error, 'Task delete failed');
                                    }
                                });
                            }
                        });
                        app.clipboard.cutTaskIds = null;
                    }

                    // Generate new IDs for pasted tasks to avoid duplicates
                    const clonedTasks = app.clipboard.tasks.map(task => {
                        const clone = JSON.parse(JSON.stringify(task));
                        const reassignIds = (t) => {
                            t.id = app.store.generateId();
                            t._pendingCreate = true;
                            if (t.children) {
                                t.children.forEach(reassignIds);
                            }
                        };
                        reassignIds(clone);

                        // Always clear projectId first (pasted tasks should not keep old project)
                        delete clone.projectId;

                        // Assign to selected project when pasting at root level in project view
                        if (!parent && app.store.projectViewMode === 'project' &&
                            app.store.selectedProjectId && app.store.selectedProjectId !== 'unassigned') {
                            clone.projectId = app.store.selectedProjectId;
                        }
                        // Otherwise: remains unassigned (no projectId)

                        return clone;
                    });

                    // Insert cloned tasks
                    siblings.splice(insertIndex, 0, ...clonedTasks);

                    syncTaskPositions(app, siblings, parent ? parent.id : null);

                    clonedTasks.forEach((task, offset) => {
                        const index = insertIndex + offset;
                        persistTaskSubtree(app, task, parent ? parent.id : null, index);
                    });

                    // Auto-select pasted root-level tasks in parent filter
                    if (!parent) {
                        clonedTasks.forEach(t => app.store.selectedParents.add(t.id));
                    }

                    app.store.notify();

                    // Select pasted tasks
                    app.selectedTaskIds.clear();
                    clonedTasks.forEach(t => app.selectedTaskIds.add(t.id));

                    console.log(`Pasted ${clonedTasks.length} task(s)`);

                    // Clear clipboard if it was a cut operation
                    if (app.clipboard.mode === 'cut') {
                        app.clipboard.tasks = [];
                        app.clipboard.mode = null;
                    }
                }
            }
        };

        // Remove previous listener if exists
        if (app._copyPasteHandler) {
            document.removeEventListener('keydown', app._copyPasteHandler);
        }
        app._copyPasteHandler = handleCopyPaste;
        document.addEventListener('keydown', handleCopyPaste);
}
