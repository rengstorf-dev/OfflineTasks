function renderSettingsPane(app) {
    const pane = document.getElementById('settingsPane');
    pane.innerHTML = '<span class="toolbar-label">Filters</span>';

    const settingsConfig = {
        outline: [
            {
                type: 'single-button',
                text: app.store.filterMode === 'show' ? '👁 Show' : '🔍 Filter',
                id: 'toggleFilterMode',
                active: app.store.filterMode === 'filter'
            },
            { type: 'divider' },
            {
                type: 'group',
                label: '',
                items: [
                    { type: 'button', text: 'To Do', filter: 'todo', active: app.store.selectedFilters.has('todo') },
                    { type: 'button', text: 'In Progress', filter: 'in-progress', active: app.store.selectedFilters.has('in-progress') },
                    { type: 'button', text: 'Review', filter: 'review', active: app.store.selectedFilters.has('review') },
                    { type: 'button', text: 'Done', filter: 'done', active: app.store.selectedFilters.has('done') }
                ]
            },
            { type: 'divider' },
            {
                type: 'parent-filter',
                id: 'parentFilter'
            },
            { type: 'divider' },
            {
                type: 'input',
                placeholder: 'Search tasks...',
                value: app.store.searchQuery,
                id: 'searchBox'
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: app.store.showAssigneeInOutline ? '👤 Assignee' : '👤 Assignee',
                id: 'toggleAssigneeOutline',
                active: app.store.showAssigneeInOutline
            },
            {
                type: 'single-button',
                text: app.store.showPriorityInOutline ? '⚠️ Priority' : '⚠️ Priority',
                id: 'togglePriorityOutline',
                active: app.store.showPriorityInOutline
            },
            {
                type: 'single-button',
                text: app.store.showDescriptions ? '📝 Description' : '📝 Description',
                id: 'toggleDescriptions',
                active: app.store.showDescriptions
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: `↕️ Sort: ${app.store.kanbanSortMode === 'priority' ? 'Priority' : app.store.kanbanSortMode === 'manual' ? 'Manual' : 'Default'}`,
                id: 'kanbanSortBtn',
                active: app.store.kanbanSortMode !== 'default'
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: '🔗 Relate',
                id: 'relateLinkModeBtn',
                active: app.relateLinkMode
            },
            {
                type: 'related-filter',
                id: 'relatedFilter'
            }
        ],
        kanban: [
            {
                type: 'group',
                label: 'Mode',
                items: [
                    { type: 'button', text: '📊 Status', mode: 'status', active: (app.kanbanMode || 'status') === 'status' },
                    { type: 'button', text: '⚡ Priority', mode: 'priority', active: (app.kanbanMode || 'status') === 'priority' }
                ]
            },
            { type: 'divider' },
            {
                type: 'parent-filter',
                id: 'parentFilter'
            },
            { type: 'divider' },
            {
                type: 'input',
                placeholder: 'Search tasks...',
                value: app.store.searchQuery,
                id: 'searchBox'
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: app.store.showAssigneeInKanban ? '👤 Assignee' : '👤 Assignee',
                id: 'toggleAssigneeKanban',
                active: app.store.showAssigneeInKanban
            },
            {
                type: 'single-button',
                text: app.store.showPriorityInKanban ? '⚠️ Priority' : '⚠️ Priority',
                id: 'togglePriorityKanban',
                active: app.store.showPriorityInKanban
            },
            {
                type: 'single-button',
                text: app.store.showDescriptionsInKanban ? '📝 Description' : '📝 Description',
                id: 'toggleDescriptionsKanban',
                active: app.store.showDescriptionsInKanban
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: `↕️ Sort: ${app.store.kanbanSortMode === 'priority' ? 'Priority' : app.store.kanbanSortMode === 'manual' ? 'Manual' : 'Default'}`,
                id: 'kanbanSortBtn',
                active: app.store.kanbanSortMode !== 'default'
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: '🔗 Relate',
                id: 'relateLinkModeBtn',
                active: app.relateLinkMode
            },
            {
                type: 'related-filter',
                id: 'relatedFilter'
            }
        ],
        gantt: [
            {
                type: 'single-button',
                text: app.store.filterMode === 'show' ? '👁 Show' : '🔍 Filter',
                id: 'toggleFilterMode',
                active: app.store.filterMode === 'filter'
            },
            { type: 'divider' },
            {
                type: 'group',
                label: '',
                items: [
                    { type: 'button', text: 'To Do', filter: 'todo', active: app.store.selectedFilters.has('todo') },
                    { type: 'button', text: 'In Progress', filter: 'in-progress', active: app.store.selectedFilters.has('in-progress') },
                    { type: 'button', text: 'Review', filter: 'review', active: app.store.selectedFilters.has('review') },
                    { type: 'button', text: 'Done', filter: 'done', active: app.store.selectedFilters.has('done') }
                ]
            },
            { type: 'divider' },
            {
                type: 'parent-filter',
                id: 'parentFilter'
            },
            { type: 'divider' },
            {
                type: 'input',
                placeholder: 'Search tasks...',
                value: app.store.searchQuery,
                id: 'searchBox'
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: app.store.showAssigneeInGantt ? '👤 Assignee' : '👤 Assignee',
                id: 'toggleAssigneeGantt',
                active: app.store.showAssigneeInGantt
            },
            {
                type: 'single-button',
                text: app.store.showPriorityInGantt ? '⚠️ Priority' : '⚠️ Priority',
                id: 'togglePriorityGantt',
                active: app.store.showPriorityInGantt
            },
            {
                type: 'single-button',
                text: app.store.showDescriptionsInGantt ? '📝 Description' : '📝 Description',
                id: 'toggleDescriptionsGantt',
                active: app.store.showDescriptionsInGantt
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: '🔗 Relate',
                id: 'relateLinkModeBtn',
                active: app.relateLinkMode
            },
            {
                type: 'related-filter',
                id: 'relatedFilter'
            }
        ],
        mindmap: [
            {
                type: 'group',
                label: 'Layout',
                items: [
                    { type: 'button', text: '🌳 Tree', mode: 'tree', active: app.mindmapMode === 'tree' },
                    { type: 'button', text: '⭕ Radial', mode: 'radial', active: app.mindmapMode === 'radial' }
                ]
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: app.store.filterMode === 'show' ? '👁 Show' : '🔍 Filter',
                id: 'toggleFilterMode',
                active: app.store.filterMode === 'filter'
            },
            { type: 'divider' },
            {
                type: 'group',
                label: '',
                items: [
                    { type: 'button', text: 'To Do', filter: 'todo', active: app.store.selectedFilters.has('todo') },
                    { type: 'button', text: 'In Progress', filter: 'in-progress', active: app.store.selectedFilters.has('in-progress') },
                    { type: 'button', text: 'Review', filter: 'review', active: app.store.selectedFilters.has('review') },
                    { type: 'button', text: 'Done', filter: 'done', active: app.store.selectedFilters.has('done') }
                ]
            },
            { type: 'divider' },
            {
                type: 'parent-filter',
                id: 'parentFilter'
            },
            { type: 'divider' },
            {
                type: 'input',
                placeholder: 'Search tasks...',
                value: app.store.searchQuery,
                id: 'searchBox'
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: app.store.showMindMapAssignee ? 'Hide Assignee' : 'Show Assignee',
                id: 'toggleMindMapAssigneeBtn',
                active: app.store.showMindMapAssignee
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: app.store.showMindMapPriority ? '⚠️ Priority' : '⚠️ Priority',
                id: 'toggleMindMapPriorityBtn',
                active: app.store.showMindMapPriority
            },
            {
                type: 'single-button',
                text: app.store.showMindMapDescription ? '📝 Description' : '📝 Description',
                id: 'toggleMindMapDescriptionBtn',
                active: app.store.showMindMapDescription
            },
            { type: 'divider' },
            {
                type: 'single-button',
                text: '🔗 Relate',
                id: 'relateLinkModeBtn',
                active: app.relateLinkMode
            },
            {
                type: 'related-filter',
                id: 'relatedFilter'
            }
        ]
    };

    const config = settingsConfig[app.currentView] || [];

    config.forEach(item => {
        if (item.type === 'group') {
            const group = document.createElement('div');
            group.className = 'setting-group';

            if (item.label) {
                const label = document.createElement('span');
                label.className = 'setting-label';
                label.textContent = item.label;
                group.appendChild(label);
            }

            item.items.forEach(btn => {
                const button = document.createElement('button');
                button.className = 'setting-btn' + (btn.active ? ' active' : '');
                button.textContent = btn.text;

                if (btn.filter) {
                    button.dataset.filter = btn.filter;
                    button.addEventListener('click', (e) => {
                        if (e.ctrlKey || e.metaKey) {
                            // Ctrl+Click: Toggle this filter in the selection
                            if (app.store.selectedFilters.has(btn.filter)) {
                                app.store.selectedFilters.delete(btn.filter);
                            } else {
                                app.store.selectedFilters.add(btn.filter);
                            }
                        } else {
                            // Regular click
                            if (app.settings.get('filterToggleBehavior')) {
                                // Toggle behavior: if this is the only selected filter, clear it
                                if (app.store.selectedFilters.size === 1 && app.store.selectedFilters.has(btn.filter)) {
                                    app.store.selectedFilters.clear();
                                } else {
                                    app.store.selectedFilters.clear();
                                    app.store.selectedFilters.add(btn.filter);
                                }
                            } else {
                                // Always set to just this filter
                                app.store.selectedFilters.clear();
                                app.store.selectedFilters.add(btn.filter);
                            }
                        }
                        app.store.notify();
                    });
                }

                if (btn.mode) {
                    button.dataset.mode = btn.mode;
                    button.addEventListener('click', () => {
                        // Check if this is for kanban or mindmap based on current view
                        if (app.currentView === 'kanban') {
                            app.kanbanMode = btn.mode;
                            app.render();
                        } else if (app.currentView === 'mindmap') {
                            app.mindmapMode = btn.mode;
                            app.settings.set('mindmap.layoutMode', btn.mode);
                            app.mindmapPanX = undefined;
                            app.mindmapPanY = undefined;
                            app.mindmapScale = undefined;
                            app.render();
                        }
                    });
                }

                group.appendChild(button);
            });

            pane.appendChild(group);
        } else if (item.type === 'divider') {
            const divider = document.createElement('div');
            divider.className = 'divider';
            pane.appendChild(divider);
        } else if (item.type === 'input') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'setting-input';
            input.placeholder = item.placeholder + ' (Press Enter)';
            input.value = item.value || '';
            if (item.id) input.id = item.id;

            // Filter when Enter is pressed
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default Enter behavior
                    app.store.searchQuery = e.target.value;
                    app.shouldRefocusSearch = true; // Flag to refocus after render
                    app.store.notify();
                }
            });

            // Clear filter immediately when input is emptied (Delete/Backspace)
            input.addEventListener('input', (e) => {
                if (e.target.value.trim() === '') {
                    app.store.searchQuery = '';
                    app.shouldRefocusSearch = true; // Keep cursor in search box
                    app.store.notify();
                }
            });

            // Clear filter when input is cleared and focus is lost
            input.addEventListener('blur', (e) => {
                if (e.target.value.trim() === '') {
                    app.store.searchQuery = '';
                    app.store.notify();
                }
            });

            pane.appendChild(input);
        } else if (item.type === 'single-button') {
            const button = document.createElement('button');
            button.className = 'setting-btn';
            if (item.active) button.classList.add('active');
            button.textContent = item.text;
            if (item.id) button.id = item.id;

            if (item.id === 'toggleDescriptions') {
                button.addEventListener('click', () => {
                    app.store.showDescriptions = !app.store.showDescriptions;
                    app.render();
                });
            } else if (item.id === 'kanbanSortBtn') {
                button.addEventListener('click', () => {
                    // Cycle through: default -> priority -> manual -> default
                    const modes = ['default', 'priority', 'manual'];
                    const currentIndex = modes.indexOf(app.store.kanbanSortMode);
                    app.store.kanbanSortMode = modes[(currentIndex + 1) % modes.length];
                    app.render();
                });
            } else if (item.id === 'togglePriorityGanttBtn') {
                button.addEventListener('click', () => {
                    app.store.showPriorityInGantt = !app.store.showPriorityInGantt;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleMindMapAssigneeBtn') {
                button.addEventListener('click', () => {
                    app.store.showMindMapAssignee = !app.store.showMindMapAssignee;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleMindMapPriorityBtn') {
                button.addEventListener('click', () => {
                    app.store.showMindMapPriority = !app.store.showMindMapPriority;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleFilterMode') {
                button.addEventListener('click', () => {
                    // Toggle between 'show' and 'filter' modes
                    app.store.filterMode = app.store.filterMode === 'show' ? 'filter' : 'show';
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleAssigneeOutline') {
                button.addEventListener('click', () => {
                    app.store.showAssigneeInOutline = !app.store.showAssigneeInOutline;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'togglePriorityOutline') {
                button.addEventListener('click', () => {
                    app.store.showPriorityInOutline = !app.store.showPriorityInOutline;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleAssigneeKanban') {
                button.addEventListener('click', () => {
                    app.store.showAssigneeInKanban = !app.store.showAssigneeInKanban;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'togglePriorityKanban') {
                button.addEventListener('click', () => {
                    app.store.showPriorityInKanban = !app.store.showPriorityInKanban;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleDescriptionsKanban') {
                button.addEventListener('click', () => {
                    app.store.showDescriptionsInKanban = !app.store.showDescriptionsInKanban;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleAssigneeGantt') {
                button.addEventListener('click', () => {
                    app.store.showAssigneeInGantt = !app.store.showAssigneeInGantt;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'togglePriorityGantt') {
                button.addEventListener('click', () => {
                    app.store.showPriorityInGantt = !app.store.showPriorityInGantt;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleDescriptionsGantt') {
                button.addEventListener('click', () => {
                    app.store.showDescriptionsInGantt = !app.store.showDescriptionsInGantt;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'toggleMindMapDescriptionBtn') {
                button.addEventListener('click', () => {
                    app.store.showMindMapDescription = !app.store.showMindMapDescription;
                    button.classList.toggle('active');
                    app.render();
                });
            } else if (item.id === 'relateLinkModeBtn') {
                button.addEventListener('click', () => {
                    app.relateLinkMode = !app.relateLinkMode;
                    app.relateSource = null;
                    button.classList.toggle('active');
                    document.getElementById('relateLinkBanner').classList.toggle('visible', app.relateLinkMode);
                    app.render();
                });
            }

            pane.appendChild(button);
        } else if (item.type === 'related-filter') {
            // Show related filter status and allow clearing
            if (app.store.relatedFilterTaskId) {
                const task = app.store.findTask(app.store.relatedFilterTaskId);
                const container = document.createElement('div');
                container.className = 'related-filter-container';
                container.style.display = 'inline-flex';
                container.style.alignItems = 'center';
                container.style.gap = '4px';
                container.style.padding = '4px 8px';
                container.style.backgroundColor = '#e3f2fd';
                container.style.borderRadius = '4px';
                container.style.fontSize = '12px';

                const label = document.createElement('span');
                label.textContent = `Related: ${task ? task.title : 'Unknown'}`;
                label.style.maxWidth = '150px';
                label.style.overflow = 'hidden';
                label.style.textOverflow = 'ellipsis';
                label.style.whiteSpace = 'nowrap';

                const clearBtn = document.createElement('button');
                clearBtn.textContent = '✕';
                clearBtn.style.border = 'none';
                clearBtn.style.background = 'none';
                clearBtn.style.cursor = 'pointer';
                clearBtn.style.padding = '0 4px';
                clearBtn.style.fontSize = '14px';
                clearBtn.addEventListener('click', () => {
                    app.store.clearRelatedFilter();
                });

                container.appendChild(label);
                container.appendChild(clearBtn);
                pane.appendChild(container);
            }
        } else if (item.type === 'parent-filter') {
            // Multi-select dropdown for parent task filtering
            const container = document.createElement('div');
            container.className = 'parent-filter-container';
            container.style.position = 'relative';
            container.style.display = 'inline-block';

            // Get root-level tasks for the current project filter
            const rootTasks = app.store.getFilteredTasks().filter(task => !task.parentId);
            const rootTaskIds = new Set(rootTasks.map(task => task.id));

            // Initialize with all parents selected (only once)
            if (!app.store.parentFilterInitialized) {
                rootTasks.forEach(task => app.store.selectedParents.add(task.id));
                app.store.parentFilterInitialized = true;
            } else {
                let filteredSelected = new Set(
                    [...app.store.selectedParents].filter(taskId => rootTaskIds.has(taskId))
                );
                if (filteredSelected.size === 0 && rootTasks.length > 0) {
                    filteredSelected = new Set(rootTasks.map(task => task.id));
                }
                if (filteredSelected.size === 0) {
                    // No parents available for this filter; disable parent filtering
                    app.store.parentFilterInitialized = false;
                } else {
                    app.store.selectedParents = filteredSelected;
                }
            }

            const allSelected = app.store.selectedParents.size === rootTasks.length;

            // Button to toggle dropdown
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'setting-btn';
            toggleBtn.textContent = allSelected ? '📁 All Parents' : `📁 Parents (${app.store.selectedParents.size})`;
            toggleBtn.style.cursor = 'pointer';

            // Dropdown menu
            const dropdown = document.createElement('div');
            dropdown.className = 'parent-filter-dropdown';
            dropdown.style.display = 'none';
            dropdown.style.position = 'absolute';
            dropdown.style.top = '100%';
            dropdown.style.left = '0';
            dropdown.style.backgroundColor = 'var(--dropdown-bg)';
            dropdown.style.border = '1px solid var(--dropdown-border)';
            dropdown.style.borderRadius = '4px';
            dropdown.style.padding = '8px';
            dropdown.style.marginTop = '4px';
            dropdown.style.minWidth = '200px';
            dropdown.style.maxHeight = '300px';
            dropdown.style.overflowY = 'auto';
            dropdown.style.zIndex = '1000';
            dropdown.style.boxShadow = 'var(--dropdown-shadow)';
            dropdown.style.color = 'var(--dropdown-text)';

            // Prevent clicks inside dropdown from closing it
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // Select All / Deselect All
            const selectAllContainer = document.createElement('div');
            selectAllContainer.style.marginBottom = '8px';
            selectAllContainer.style.paddingBottom = '8px';
            selectAllContainer.style.borderBottom = '1px solid var(--dropdown-divider)';

            const selectAllBtn = document.createElement('button');
            selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
            selectAllBtn.className = 'setting-btn';
            selectAllBtn.style.width = '100%';
            selectAllBtn.style.fontSize = '12px';
            selectAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasAllSelected = app.store.selectedParents.size === rootTasks.length;
                if (wasAllSelected) {
                    // Deselect all - clear the set completely
                    app.store.selectedParents.clear();
                } else {
                    // Select all - add all tasks to set
                    app.store.selectedParents.clear();
                    rootTasks.forEach(task => app.store.selectedParents.add(task.id));
                }
                // Update button text immediately
                const nowAllSelected = app.store.selectedParents.size === rootTasks.length;
                selectAllBtn.textContent = nowAllSelected ? 'Deselect All' : 'Select All';
                toggleBtn.textContent = nowAllSelected ? '📁 All Parents' : `📁 Parents (${app.store.selectedParents.size})`;
                // Update all checkboxes
                dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    const taskId = cb.dataset.taskId;
                    cb.checked = app.store.selectedParents.has(taskId);
                });
                // Don't re-render here - wait for dropdown to close
            });
            selectAllContainer.appendChild(selectAllBtn);
            dropdown.appendChild(selectAllContainer);

            // Checkboxes for each parent task
            rootTasks.forEach(task => {
                const checkboxContainer = document.createElement('label');
                checkboxContainer.style.display = 'block';
                checkboxContainer.style.padding = '4px 0';
                checkboxContainer.style.cursor = 'pointer';
                checkboxContainer.style.fontSize = '13px';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = app.store.selectedParents.has(task.id);
                checkbox.dataset.taskId = task.id; // Store task ID for later reference
                checkbox.style.marginRight = '8px';
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    if (checkbox.checked) {
                        app.store.selectedParents.add(task.id);
                    } else {
                        app.store.selectedParents.delete(task.id);
                    }
                    // Update button text immediately
                    const nowAllSelected = app.store.selectedParents.size === rootTasks.length;
                    toggleBtn.textContent = nowAllSelected ? '📁 All Parents' : `📁 Parents (${app.store.selectedParents.size})`;
                    selectAllBtn.textContent = nowAllSelected ? 'Deselect All' : 'Select All';
                    // Don't re-render here - wait for dropdown to close
                });

                const label = document.createElement('span');
                label.textContent = task.title;

                checkboxContainer.appendChild(checkbox);
                checkboxContainer.appendChild(label);
                dropdown.appendChild(checkboxContainer);
            });

            // Toggle dropdown visibility
            let isOpen = false;
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                isOpen = !isOpen;
                dropdown.style.display = isOpen ? 'block' : 'none';
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target) && isOpen) {
                    isOpen = false;
                    dropdown.style.display = 'none';
                    // Trigger full re-render to apply filter
                    app.render();
                }
            });

            container.appendChild(toggleBtn);
            container.appendChild(dropdown);
            pane.appendChild(container);
        }
    });

    // Refocus search box if flag is set (after Enter key press)
    if (app.shouldRefocusSearch) {
        app.shouldRefocusSearch = false;
        setTimeout(() => {
            const searchInput = document.getElementById('searchBox');
            if (searchInput) {
                searchInput.focus();
                // Move cursor to end of text
                const len = searchInput.value.length;
                searchInput.setSelectionRange(len, len);
            }
        }, 0);
    }
}
