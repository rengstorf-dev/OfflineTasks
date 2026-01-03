function renderKanbanView(app, container) {
        // Initialize kanban mode if not set
        app.kanbanMode = app.kanbanMode || 'status';

        // Define columns based on mode
        const modes = {
            status: {
                columns: ['todo', 'in-progress', 'review', 'done'],
                names: {
                    'todo': 'To Do',
                    'in-progress': 'In Progress',
                    'review': 'Review',
                    'done': 'Done'
                },
                field: 'status'
            },
            priority: {
                columns: ['low', 'medium', 'high'],
                names: {
                    'low': 'Low',
                    'medium': 'Medium',
                    'high': 'High'
                },
                field: 'priority'
            }
        };

        const currentMode = modes[app.kanbanMode];
        const columns = currentMode.columns;
        const columnNames = currentMode.names;
        const fieldName = currentMode.field;

        // Get filtered tasks with _matches markers
        const filteredTasks = app.store.getFilteredTasks();

        // Flatten filtered tasks and get only subtasks (leaf tasks that have a parent)
        // Note: Parent filter already applied by getFilteredTasks(), so 'tasks' param only contains selected parents
        const getFlatLeafTasks = (tasks) => {
            let leafTasks = [];
            const flatten = (taskList, isRootLevel = true) => {
                taskList.forEach(task => {
                    if (!task.children || task.children.length === 0) {
                        // This is a leaf task
                        // Only include if it's NOT at root level (i.e., it has a parent)
                        if (!isRootLevel) {
                            leafTasks.push(task);
                        }
                    } else {
                        // Has children, recurse (mark as not root level)
                        flatten(task.children, false);
                    }
                });
            };
            flatten(tasks);
            return leafTasks;
        };

        const leafTasks = getFlatLeafTasks(filteredTasks);

        // Helper to get breadcrumb path
        const getPath = (taskId) => {
            const path = [];
            const findPath = (tasks, targetId, currentPath = []) => {
                for (const task of tasks) {
                    const newPath = [...currentPath, task.title];
                    if (task.id === targetId) {
                        return newPath;
                    }
                    if (task.children) {
                        const result = findPath(task.children, targetId, newPath);
                        if (result) return result;
                    }
                }
                return null;
            };
            return findPath(app.store.tasks, taskId);
        };

        const columnsHtml = columns.map(columnValue => {
            let tasks = leafTasks.filter(t => t.metadata[fieldName] === columnValue);

            // Sort based on kanbanSortMode
            if (app.store.kanbanSortMode === 'priority') {
                // Sort by priority (high -> medium -> low)
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                tasks = tasks.sort((a, b) => {
                    const aPriority = priorityOrder[a.metadata.priority || 'medium'];
                    const bPriority = priorityOrder[b.metadata.priority || 'medium'];
                    return aPriority - bPriority;
                });
            } else if (app.store.kanbanSortMode === 'manual') {
                // Sort by kanbanOrder (lower = higher in list)
                tasks = tasks.sort((a, b) => {
                    const aOrder = a.metadata.kanbanOrder ?? 999999;
                    const bOrder = b.metadata.kanbanOrder ?? 999999;
                    return aOrder - bOrder;
                });
            }
            // 'default' mode: no sorting, use natural order

            return `
                <div class="kanban-column" data-column-value="${columnValue}" data-field="${fieldName}">
                    <div class="kanban-header">
                        <span>${columnNames[columnValue]}</span>
                        <span class="badge">${tasks.length}</span>
                    </div>
                    <div class="kanban-cards">
                        ${tasks.map(task => {
                            const path = getPath(task.id);
                            const breadcrumb = path.slice(0, -1).join(' › ');
                            const relatedTasks = app.store.getRelatedTasks(task.id);
                            const project = app.store.getTaskProject(task.id);

                            // Get project-specific colors (or defaults)
                            const taskColors = app.store.getTaskColors(task.id);
                            const priorityColor = taskColors.priorityColors[task.metadata.priority] || taskColors.priorityColors.medium;
                            const priorityBorder = `border-left: 4px solid ${priorityColor};`;

                            // Project color for breadcrumb highlight
                            const breadcrumbStyle = project
                                ? `background: ${project.color}20; color: ${project.color}; padding: 2px 6px; border-radius: 4px; display: inline-block;`
                                : '';

                            const opacity = (app.store.filterMode === 'show' && task._matches === false) ? '0.4' : '1';
                            return `
                                <div class="kanban-card" draggable="true" data-task-id="${task.id}" style="opacity: ${opacity}; ${priorityBorder}">
                                    ${breadcrumb ? `<div class="kanban-card-path" style="${breadcrumbStyle}">${breadcrumb}</div>` : ''}
                                    <div class="kanban-card-title">${task.title}</div>
                                    ${app.store.showDescriptionsInKanban && task.description ? `<div style="font-size: 12px; color: #666; margin-top: 4px; font-style: italic;">${task.description}</div>` : ''}
                                    <div class="kanban-card-meta">
                                        ${app.store.showAssigneeInKanban && task.metadata.assignee ? `<span class="assignee">${task.metadata.assignee}</span>` : ''}
                                        ${app.store.showPriorityInKanban && task.metadata.priority === 'high' ? `<span class="priority-indicator" title="High Priority" style="color: ${taskColors.priorityColors.high};">⚠️</span>` : ''}
                                        ${relatedTasks.length > 0 ? `<span class="related-badge" data-filter-related="${task.id}" title="Click to filter by related tasks">⟷ ${relatedTasks.length}</span>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="kanban-view">${columnsHtml}</div>`;

        // Drag and drop
        const cards = container.querySelectorAll('.kanban-card');
        const columnElements = container.querySelectorAll('.kanban-column');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', card.innerHTML);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });

            card.addEventListener('click', () => {
                const taskId = card.dataset.taskId;
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

        columnElements.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = document.querySelector('.dragging');
                const afterElement = getDragAfterElement(column, e.clientY);
                const cardsContainer = column.querySelector('.kanban-cards');

                if (afterElement == null) {
                    cardsContainer.appendChild(dragging);
                } else {
                    cardsContainer.insertBefore(dragging, afterElement);
                }
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                const card = document.querySelector('.dragging');
                const taskId = card.dataset.taskId;
                const newValue = column.dataset.columnValue;
                const field = column.dataset.field;

                // Get all cards in this column to calculate order
                const cardsContainer = column.querySelector('.kanban-cards');
                const allCards = [...cardsContainer.querySelectorAll('.kanban-card')];

                // Save state before making changes
                app.store.saveState();

                // Update the kanbanOrder for all tasks in this column based on visual position
                const metadataUpdates = new Map();
                const queueMetadataUpdate = (id, updates) => {
                    if (!metadataUpdates.has(id)) {
                        metadataUpdates.set(id, {});
                    }
                    Object.assign(metadataUpdates.get(id), updates);
                };

                allCards.forEach((cardEl, index) => {
                    const cardTaskId = cardEl.dataset.taskId;
                    const task = app.store.findTask(cardTaskId);
                    if (task) {
                        task.metadata.kanbanOrder = index;
                        queueMetadataUpdate(cardTaskId, { kanbanOrder: index });
                    }
                });

                // Update the appropriate field based on mode (status or priority)
                const task = app.store.findTask(taskId);
                if (task) {
                    task.metadata[field] = newValue;
                    queueMetadataUpdate(taskId, { [field]: newValue });
                }

                if (field === 'status') {
                    const updatedParents = app.store.updateAncestorStatuses(taskId);
                    updatedParents.forEach(({ id, status }) => {
                        queueMetadataUpdate(id, { status });
                    });
                }

                // Save scroll positions before re-render
                app.kanbanScrollPositions = {};
                container.querySelectorAll('.kanban-column').forEach(col => {
                    const colValue = col.dataset.columnValue;
                    const cardsEl = col.querySelector('.kanban-cards');
                    if (cardsEl) {
                        app.kanbanScrollPositions[colValue] = cardsEl.scrollTop;
                    }
                });

                app.store.notify();

                if (app.apiClient) {
                    metadataUpdates.forEach((updates, id) => {
                        app.apiClient.updateTask(id, { metadata: updates }).catch((error) => {
                            app.apiClient.reportError(error, 'Kanban update failed', { silent: true });
                        });
                    });
                }
            });
        });

        // Restore scroll positions after render
        if (app.kanbanScrollPositions) {
            container.querySelectorAll('.kanban-column').forEach(col => {
                const colValue = col.dataset.columnValue;
                const cardsEl = col.querySelector('.kanban-cards');
                if (cardsEl && app.kanbanScrollPositions[colValue] !== undefined) {
                    cardsEl.scrollTop = app.kanbanScrollPositions[colValue];
                }
            });
            app.kanbanScrollPositions = null;
        }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
