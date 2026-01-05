class App {
    static async create() {
        const apiClient = window.apiClient || null;
        const settings = new Settings(apiClient);
        const store = new TaskStore();

        enableStoreSync(apiClient, store, settings);
        await loadAppData(apiClient, store, settings);

        return new App({ settings, store, apiClient });
    }

    constructor(options = {}) {
        // Initialize settings first
        this.settings = options.settings || new Settings(options.apiClient || null);

        this.store = options.store || new TaskStore();
        this.apiClient = options.apiClient || window.apiClient || null;

        if (this.apiClient && !this.store.apiClient) {
            enableStoreSync(this.apiClient, this.store, this.settings);
        }
        if (globalThis.ErrorReporting && typeof globalThis.ErrorReporting.init === 'function') {
            globalThis.ErrorReporting.init({ settings: this.settings });
            globalThis.ErrorReporting.installGlobalHandlers();
        }
        this.currentView = this.settings.get('defaultView') || 'outline';
        this.expandedTeams = new Set();
        this.linkMode = false;
        this.linkSource = null;
        this.relateLinkMode = false;
        this.relateSource = null;
        this.selectedTask = null;

        // Initialize Mind Map mode from settings
        this.mindmapMode = this.settings.get('mindmap.layoutMode') || 'tree';

        const savedMindmapLayout = this.settings.get('mindmap.layout');
        if (savedMindmapLayout && typeof savedMindmapLayout === 'object') {
            const hasCustomPositions = !!savedMindmapLayout.hasCustomPositions;
            this.mindmapLayoutHasCustomPositions = hasCustomPositions;
            if (hasCustomPositions && savedMindmapLayout.positions) {
                this.mindmapCustomPositions = savedMindmapLayout.positions;
            } else {
                this.mindmapCustomPositions = { tree: {}, radial: {} };
            }
            if (savedMindmapLayout.connections) {
                this.mindmapConnectionPoints = savedMindmapLayout.connections;
            }
            if (savedMindmapLayout.lineLength) {
                this.mindmapLineLength = savedMindmapLayout.lineLength;
            }
            if (savedMindmapLayout.lineStyle) {
                this.mindmapLineStyle = savedMindmapLayout.lineStyle;
            }
        }

        // Apply dark mode from settings
        const darkMode = this.settings.get('darkMode');
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').textContent = '☀️';
        }

        // Restore project selection state from settings
        const savedProjectViewMode = this.settings.get('projectViewMode');
        const savedSelectedProjectId = this.settings.get('selectedProjectId');
        const savedSelectedProjectIds = this.settings.get('selectedProjectIds');
        if (savedProjectViewMode) {
            this.store.projectViewMode = savedProjectViewMode;
        }
        if (savedSelectedProjectId !== undefined) {
            this.store.selectedProjectId = savedSelectedProjectId;
        }
        if (savedSelectedProjectIds && Array.isArray(savedSelectedProjectIds)) {
            this.store.selectedProjectIds = new Set(savedSelectedProjectIds);
        }

        const savedTeams = this.settings.get('teams');
        if (Array.isArray(savedTeams)) {
            this.store.teams = savedTeams;
            this.store.nextTeamId = savedTeams.length + 1;
        }

        const savedProjectTeams = this.settings.get('projectTeams');
        if (savedProjectTeams && typeof savedProjectTeams === 'object') {
            this.store.projects.forEach(project => {
                if (savedProjectTeams[project.id]) {
                    project.teamIds = savedProjectTeams[project.id];
                }
            });
        }

        this.store.subscribe(() => this.render());
        this.setupEventListeners();
        this.initApiStatus();
        this.storeSyncTimer = startStorePolling(this.apiClient, this.store, this.settings);
        this.render();
    }

    initApiStatus() {
        const statusEl = document.getElementById('apiStatus');
        const statusDot = document.getElementById('apiStatusDot');
        const statusText = document.getElementById('apiStatusText');

        if (!statusEl || !statusDot || !statusText) {
            return;
        }

        if (!this.apiClient) {
            statusText.textContent = 'API: Unavailable';
            statusDot.classList.add('error');
            return;
        }

        const updateStatus = (state) => {
            statusDot.classList.remove('ok', 'error');
            this.apiStatusState = state;
            if (state === 'ok') {
                statusText.textContent = 'API: Connected';
                statusDot.classList.add('ok');
            } else if (state === 'error') {
                statusText.textContent = 'API: Offline';
                statusDot.classList.add('error');
            } else {
                statusText.textContent = 'API: Checking';
            }
        };

        const checkHealth = () => {
            updateStatus('checking');
            this.apiClient.getHealth()
                .then(() => {
                    updateStatus('ok');
                })
                .catch((error) => {
                    updateStatus('error');
                    if (this.apiClient) {
                        this.apiClient.reportError(error, 'API offline');
                    }
                });
        };

        checkHealth();
        if (this.apiStatusTimer) {
            clearInterval(this.apiStatusTimer);
        }
        this.apiStatusTimer = setInterval(checkHealth, 5000);
    }

    setupEventListeners() {
        const captureFilters = () => ({
            selectedFilters: new Set(this.store.selectedFilters),
            searchQuery: this.store.searchQuery,
            filterMode: this.store.filterMode,
            relatedFilterTaskId: this.store.relatedFilterTaskId
        });

        const applyFilters = (filters) => {
            const nextFilters = filters || {};
            this.store.selectedFilters = new Set(nextFilters.selectedFilters || []);
            this.store.searchQuery = nextFilters.searchQuery || '';
            this.store.filterMode = nextFilters.filterMode || 'show';
            this.store.relatedFilterTaskId = nextFilters.relatedFilterTaskId || null;
        };

        if (!this.store.viewFilters) {
            this.store.viewFilters = {};
        }

        // View switcher
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const nextView = e.target.dataset.view;
                if (nextView !== this.currentView) {
                    this.store.viewFilters[this.currentView] = captureFilters();
                    applyFilters(this.store.viewFilters[nextView]);
                }
                this.currentView = nextView;
                // Save current view as default
                this.settings.set('defaultView', this.currentView);
                this.render();
            });
        });

        // Filter buttons, search box, toggle descriptions, and link mode are now handled in renderSettingsPane()

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            const darkMode = !this.settings.get('darkMode');
            this.settings.set('darkMode', darkMode);
            document.body.classList.toggle('dark-mode', darkMode);
            // Update toggle icon
            document.getElementById('darkModeToggle').textContent = darkMode ? '☀️' : '🌙';
        });

        // Sidebar settings buttons
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            exportData(this);
        });
        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('sidebarImportInput').click();
        });
        document.getElementById('sidebarImportInput').addEventListener('change', (e) => {
            importData(this, e);
        });

        // Add task button
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.showAddTaskModal();
        });

        // Modal buttons
        document.getElementById('createTask').addEventListener('click', () => {
            const title = document.getElementById('newTaskTitle').value.trim();
            const parent = document.getElementById('newTaskParent').value;
            const description = document.getElementById('newTaskDescription').value.trim();

            if (title) {
                // Auto-assign to selected project for root-level tasks
                let projectId = null;
                if (!parent && this.store.projectViewMode === 'project' &&
                    this.store.selectedProjectId && this.store.selectedProjectId !== 'unassigned') {
                    projectId = this.store.selectedProjectId;
                }
                this.store.addTask(parent || null, title, description, projectId);
                this.closeAddTaskModal();
            } else {
                alert('Please enter a task title');
            }
        });

        document.getElementById('newTaskTitle').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('createTask').click();
            }
        });

        document.getElementById('cancelModal').addEventListener('click', () => {
            this.closeAddTaskModal();
        });

        // Global keyboard shortcuts for undo/redo
        document.addEventListener('keydown', (e) => {
            // Prevent Tab navigation when in outline view
            if (this.currentView === 'outline' && e.key === 'Tab') {
                const activeElement = document.activeElement;
                const isEditingTitle = activeElement && 
                                      activeElement.getAttribute('contenteditable') === 'true' &&
                                      activeElement.classList.contains('task-title');

                if (!isEditingTitle) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }

            // Ctrl+Z or Cmd+Z for undo
            // Skip if in mindmap view (it has its own undo/redo)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                if (this.currentView === 'mindmap') {
                    // Let mindmap handle its own undo
                    return;
                }
                e.preventDefault();
                if (this.store.undo()) {
                    this.showToast('Undo (' + this.currentView + ')');
                }
            }
            // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
            // Skip if in mindmap view (it has its own undo/redo)
            else if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
                     ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
                if (this.currentView === 'mindmap') return;
                e.preventDefault();
                if (this.store.redo()) {
                    this.showToast('Redo');
                }
            }
        });

        // Sidebar toggle
        document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
            const sidebar = document.getElementById('projectSidebar');
            sidebar.classList.toggle('collapsed');
            this.settings.set('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });

        // Restore sidebar collapsed state
        if (this.settings.get('sidebarCollapsed')) {
            document.getElementById('projectSidebar').classList.add('collapsed');
        }

        // Add project button
        document.getElementById('addProjectBtn').addEventListener('click', () => {
            this.showNewProjectInput();
        });

        const addTeamBtn = document.getElementById('addTeamBtn');
        if (addTeamBtn) {
            addTeamBtn.addEventListener('click', () => {
                this.showNewTeamInput();
            });
        }
    }

    render() {
        // Render project sidebar
        this.renderProjectSidebar();

        // If viewing project settings, re-render that instead
        if (this.currentProjectSettings) {
            this.showProjectSettings(this.currentProjectSettings);
            return;
        }
        if (this.currentTeamSettings) {
            this.showTeamSettings(this.currentTeamSettings);
            return;
        }

        // Show toolbar and settings pane for normal views
        document.querySelector('.toolbar').style.display = '';
        document.querySelector('.settings-pane').style.display = '';

        // Render view-specific settings pane
        renderSettingsPane(this);

        const container = document.getElementById('viewContainer');

        // Sync view switcher buttons with current view
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });

        switch(this.currentView) {
            case 'outline':
                renderOutlineView(this, container);
                break;
            case 'kanban':
                renderKanbanView(this, container);
                break;
            case 'gantt':
                renderGanttView(this, container);
                break;
            case 'mindmap':
                renderMindMapView(this, container);
                break;
        }

        this.applyTooltipSetting();
    }

    renderProjectSidebar() {
        const projectList = document.getElementById('projectList');
        const projects = this.store.getProjects();
        const selectedId = this.store.selectedProjectId;
        const selectedIds = this.store.selectedProjectIds;
        const viewMode = this.store.projectViewMode;

        // Count tasks per project
        const getTaskCount = (projectId) => {
            if (projectId === null) {
                return this.store.tasks.filter(t => !t.projectId).length;
            }
            return this.store.tasks.filter(t => t.projectId === projectId).length;
        };

        // Helper to check if project is selected (handles both single and multi modes)
        const isProjectSelected = (projectId) => {
            if (viewMode === 'multi') {
                return selectedIds.has(projectId);
            } else if (viewMode === 'project') {
                return selectedId === projectId;
            }
            return false;
        };

        // Build HTML
        let html = '';

        // "All Projects" option (only shown in global mode or when nothing selected)
        const allActive = viewMode === 'global';
        const totalTasks = this.store.tasks.length;
        html += `
            <div class="project-item ${allActive ? 'active' : ''}" data-project-id="all">
                <div class="project-color-dot" style="background: #6b7280;"></div>
                <span class="project-item-name">All Projects</span>
                <span class="project-item-count">${totalTasks}</span>
            </div>
        `;

        // Individual projects
        projects.forEach(project => {
            const isActive = isProjectSelected(project.id);
            const count = getTaskCount(project.id);
            html += `
                <div class="project-item ${isActive ? 'active' : ''}" data-project-id="${project.id}">
                    <div class="project-color-dot" style="background: ${project.color};"></div>
                    <span class="project-item-name">${project.name}</span>
                    <span class="project-item-count">${count}</span>
                    <button class="project-settings-btn" data-project-settings="${project.id}" title="Project Settings">⚙</button>
                </div>
            `;
        });

        // Unassigned tasks (show if any unassigned tasks exist)
        const unassignedCount = getTaskCount(null);
        if (unassignedCount > 0) {
            const isActive = isProjectSelected('unassigned');
            html += `
                <div class="project-item ${isActive ? 'active' : ''}" data-project-id="unassigned">
                    <div class="project-color-dot" style="background: #9ca3af; border: 1px dashed #6b7280;"></div>
                    <span class="project-item-name">Unassigned</span>
                    <span class="project-item-count">${unassignedCount}</span>
                </div>
            `;
        }

        projectList.innerHTML = html;

        const teamList = document.getElementById('teamList');
        if (teamList) {
            const teams = this.store.getTeams ? this.store.getTeams() : (this.store.teams || []);
            if (teams.length === 0) {
                teamList.innerHTML = '<div class="sidebar-placeholder">No teams yet</div>';
            } else {
                teamList.innerHTML = teams.map(team => `
                    <div class="team-item ${this.store.teamFilterId === team.id && !this.store.assigneeFilter ? 'active' : ''}" data-team-id="${team.id}">
                        <button class="team-toggle-btn" data-team-toggle="${team.id}">
                            ${this.expandedTeams.has(team.id) ? '▾' : '▸'}
                        </button>
                        <span class="team-item-name">${team.name}</span>
                        <button class="team-settings-btn" data-team-settings="${team.id}" title="Team Settings">⚙</button>
                    </div>
                    ${this.expandedTeams.has(team.id) ? `
                        <div class="team-members">
                            ${(team.members || []).length === 0 ? '<div class="team-member-item team-member-empty">No members yet</div>' : ''}
                            ${(team.members || []).map(member => `
                                <div class="team-member-item ${this.store.assigneeFilter === member ? 'active' : ''}" data-team-member="${team.id}::${member}">
                                    <span class="team-member-name">${member}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                `).join('');
            }
        }

        // Bind click and drag-drop handlers
        projectList.querySelectorAll('.project-item').forEach(item => {
            const projectId = item.dataset.projectId;

            // Click to select project (Ctrl+click for multi-select)
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('project-settings-btn')) return;

                if (this.currentProjectSettings) {
                    if (projectId === 'all') {
                        this.currentProjectSettings = null;
                        this.selectProject(projectId);
                        return;
                    }
                    if (projectId !== 'unassigned') {
                        this.showProjectSettings(projectId);
                        return;
                    }
                }

                if ((e.ctrlKey || e.metaKey) && projectId !== 'all') {
                    // Ctrl+click: toggle multi-select
                    this.toggleProjectSelection(projectId);
                } else {
                    // Regular click: single select
                    this.selectProject(projectId);
                }
            });

            // Drag-and-drop to assign tasks to project
            if (projectId !== 'all') {
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    item.classList.add('drag-over');
                });

                item.addEventListener('dragleave', () => {
                    item.classList.remove('drag-over');
                });

                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    item.classList.remove('drag-over');

                    const taskId = e.dataTransfer.getData('application/x-task-id') ||
                                   e.dataTransfer.getData('text/plain');

                    if (taskId) {
                        // Assign to project (null for 'unassigned')
                        const targetProjectId = projectId === 'unassigned' ? null : projectId;
                        this.store.assignTaskToProject(taskId, targetProjectId);
                        this.showToast(`Task assigned to ${projectId === 'unassigned' ? 'Unassigned' : this.store.getProject(projectId)?.name || 'project'}`);
                    }
                });
            }
        });

        // Project settings button handlers
        projectList.querySelectorAll('.project-settings-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const projectId = btn.dataset.projectSettings;
                this.showProjectSettings(projectId);
            });
        });

        if (teamList) {
            teamList.querySelectorAll('.team-settings-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const teamId = btn.dataset.teamSettings;
                    this.showTeamSettings(teamId);
                });
            });

            teamList.querySelectorAll('.team-toggle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const teamId = btn.dataset.teamToggle;
                    if (this.expandedTeams.has(teamId)) {
                        this.expandedTeams.delete(teamId);
                    } else {
                        this.expandedTeams.add(teamId);
                    }
                    this.renderProjectSidebar();
                });
            });

            teamList.querySelectorAll('.team-item').forEach(item => {
                item.addEventListener('click', () => {
                    const teamId = item.dataset.teamId;
                    if (this.store.teamFilterId === teamId && !this.store.assigneeFilter) {
                        this.store.clearTeamFilter();
                    } else {
                        this.store.setTeamFilter(teamId, null);
                    }
                });
            });

            teamList.querySelectorAll('.team-member-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const raw = item.dataset.teamMember;
                    if (!raw) return;
                    const [teamId, member] = raw.split('::');
                    if (this.store.teamFilterId === teamId && this.store.assigneeFilter === member) {
                        this.store.clearTeamFilter();
                    } else {
                        this.store.setTeamFilter(teamId, member);
                    }
                });
            });
        }
    }

    selectProject(projectId) {
        this.store.selectedParents.clear();
        this.store.parentFilterInitialized = false;
        // Clear multi-select when doing regular click
        this.store.selectedProjectIds.clear();

        if (projectId === 'all') {
            this.store.setProjectViewMode('global');
            this.store.setSelectedProject(null);
            // Persist to settings
            this.settings.set('projectViewMode', 'global');
            this.settings.set('selectedProjectId', null);
            this.settings.set('selectedProjectIds', []);
        } else if (projectId === 'unassigned') {
            this.store.setProjectViewMode('project');
            this.store.setSelectedProject('unassigned');
            // Persist to settings
            this.settings.set('projectViewMode', 'project');
            this.settings.set('selectedProjectId', 'unassigned');
            this.settings.set('selectedProjectIds', []);
        } else {
            this.store.setProjectViewMode('project');
            this.store.setSelectedProject(projectId);
            // Persist to settings
            this.settings.set('projectViewMode', 'project');
            this.settings.set('selectedProjectId', projectId);
            this.settings.set('selectedProjectIds', []);
        }
    }

    toggleProjectSelection(projectId) {
        this.store.selectedParents.clear();
        this.store.parentFilterInitialized = false;
        // If currently in single-select mode, add that project to multi-select first
        if (this.store.projectViewMode === 'project' && this.store.selectedProjectId) {
            this.store.selectedProjectIds.add(this.store.selectedProjectId);
        }

        // Toggle project in multi-select set
        if (this.store.selectedProjectIds.has(projectId)) {
            this.store.selectedProjectIds.delete(projectId);
        } else {
            this.store.selectedProjectIds.add(projectId);
        }

        // If we now have multiple or going from single to multi, switch to multi mode
        if (this.store.selectedProjectIds.size > 0) {
            this.store.setProjectViewMode('multi');
            this.store.setSelectedProject(null);
            // Persist to settings
            this.settings.set('projectViewMode', 'multi');
            this.settings.set('selectedProjectId', null);
            this.settings.set('selectedProjectIds', [...this.store.selectedProjectIds]);
        } else {
            // No selections - go back to global
            this.store.setProjectViewMode('global');
            this.settings.set('projectViewMode', 'global');
            this.settings.set('selectedProjectIds', []);
        }

        this.render();
    }

    showNewProjectInput() {
        const addBtn = document.getElementById('addProjectBtn');

        // Create input wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'new-project-input-wrapper';
        wrapper.innerHTML = `
            <input type="text" class="new-project-input" placeholder="Project name..." autofocus>
        `;

        // Hide the add button and show input
        addBtn.style.display = 'none';
        addBtn.parentNode.insertBefore(wrapper, addBtn);

        const input = wrapper.querySelector('input');
        input.focus();

        const cleanup = () => {
            wrapper.remove();
            addBtn.style.display = '';
        };

        const createProject = () => {
            const name = input.value.trim();
            if (name) {
                const projectId = this.store.addProject(name);
                // Select the new project
                this.selectProject(projectId);
            }
            cleanup();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createProject();
            } else if (e.key === 'Escape') {
                cleanup();
            }
        });

        input.addEventListener('blur', () => {
            // Small delay to allow for click events
            setTimeout(cleanup, 150);
        });
    }

    showProjectSettings(projectId) {
        const project = this.store.getProject(projectId);
        if (!project) {
            this.currentProjectSettings = null;
            this.render();
            return;
        }

        // Track that we're viewing project settings
        this.currentProjectSettings = projectId;

        // Hide toolbar and settings pane
        document.querySelector('.toolbar').style.display = 'none';
        document.querySelector('.settings-pane').style.display = 'none';

        const colorPalette = this.store.projectColorPalette;
        const taskCount = this.store.tasks.filter(t => t.projectId === projectId).length;

        // Use the view container to show project settings
        const container = document.getElementById('viewContainer');
        container.innerHTML = `
            <div class="project-settings-page">
                <div class="project-settings-header">
                    <button class="back-btn" id="backToView">← Back</button>
                    <h2>Project Settings</h2>
                </div>

                <div class="project-settings-content">
                    <div class="settings-section">
                        <h3>General</h3>

                        <div class="settings-field">
                            <label>Project Name</label>
                            <input type="text" class="settings-input" id="projectName" value="${project.name}">
                        </div>

                        <div class="settings-field">
                            <label>Color</label>
                            <div class="color-picker">
                                ${colorPalette.map(color => `
                                    <button class="color-swatch ${color === project.color ? 'selected' : ''}"
                                            data-color="${color}"
                                            style="background: ${color};"
                                            title="${color}"></button>
                                `).join('')}
                            </div>
                        </div>

                        <div class="settings-field">
                            <label>Tasks</label>
                            <div class="settings-info">${taskCount} task${taskCount !== 1 ? 's' : ''} in this project</div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Status Colors</h3>
                        <div class="color-settings-grid">
                            <div class="color-setting-item">
                                <label>Todo</label>
                                <input type="color" class="status-color-input" data-status="todo" value="${project.statusColors?.todo || '#94a3b8'}">
                            </div>
                            <div class="color-setting-item">
                                <label>In Progress</label>
                                <input type="color" class="status-color-input" data-status="in-progress" value="${project.statusColors?.['in-progress'] || '#3b82f6'}">
                            </div>
                            <div class="color-setting-item">
                                <label>Review</label>
                                <input type="color" class="status-color-input" data-status="review" value="${project.statusColors?.review || '#f59e0b'}">
                            </div>
                            <div class="color-setting-item">
                                <label>Done</label>
                                <input type="color" class="status-color-input" data-status="done" value="${project.statusColors?.done || '#10b981'}">
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Priority Colors</h3>
                        <div class="color-settings-grid">
                            <div class="color-setting-item">
                                <label>High</label>
                                <input type="color" class="priority-color-input" data-priority="high" value="${project.priorityColors?.high || '#ef4444'}">
                            </div>
                            <div class="color-setting-item">
                                <label>Medium</label>
                                <input type="color" class="priority-color-input" data-priority="medium" value="${project.priorityColors?.medium || '#f59e0b'}">
                            </div>
                            <div class="color-setting-item">
                                <label>Low</label>
                                <input type="color" class="priority-color-input" data-priority="low" value="${project.priorityColors?.low || '#94a3b8'}">
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Teams</h3>
                        <div class="settings-field">
                            <div class="settings-checkbox-list">
                                ${(this.store.teams || []).length === 0 ? '<div class="settings-info">No teams yet.</div>' : ''}
                                ${(this.store.teams || []).map(team => `
                                    <label class="settings-checkbox-item">
                                        <input type="checkbox" data-team-id="${team.id}" ${project.teamIds?.includes(team.id) ? 'checked' : ''}>
                                        <span>${team.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="settings-section danger-zone">
                        <h3>Danger Zone</h3>
                        <div class="settings-field">
                            <label>Delete Project</label>
                            <p class="settings-description">This will remove the project. All tasks will be moved to Unassigned.</p>
                            <button class="btn btn-danger" id="deleteProject">Delete Project</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.applyTooltipSetting();

        // Back button
        container.querySelector('#backToView').addEventListener('click', () => {
            this.currentProjectSettings = null;
            this.render();
        });

        // Name change (autosave without full re-render)
        const nameInput = container.querySelector('#projectName');
        nameInput.addEventListener('input', () => {
            const newName = nameInput.value.trim();
            if (newName) {
                // Update project silently (don't trigger full re-render)
                project.name = newName;
                this.store.saveState();
                if (this.store.apiClient) {
                    this.store.apiClient.updateProject(projectId, {
                        name: project.name,
                        color: project.color,
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors
                    }).catch((error) => {
                        this.store.apiClient.reportError(error, 'Project update failed', { silent: true });
                    });
                }
                // Just update the sidebar
                this.renderProjectSidebar();
            }
        });

        // Color picker (update without full re-render)
        container.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                // Update project silently
                project.color = color;
                this.store.saveState();
                if (this.store.apiClient) {
                    this.store.apiClient.updateProject(projectId, {
                        name: project.name,
                        color: project.color,
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors
                    }).catch((error) => {
                        this.store.apiClient.reportError(error, 'Project update failed', { silent: true });
                    });
                }
                // Update selected state visually
                container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                // Just update the sidebar
                this.renderProjectSidebar();
            });
        });

        // Status color inputs
        container.querySelectorAll('.status-color-input').forEach(input => {
            input.addEventListener('change', () => {
                const status = input.dataset.status;
                if (!project.statusColors) {
                    project.statusColors = this.store.getDefaultStatusColors();
                }
                project.statusColors[status] = input.value;
                this.store.saveState();
                if (this.store.apiClient) {
                    this.store.apiClient.updateProject(projectId, {
                        name: project.name,
                        color: project.color,
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors
                    }).catch((error) => {
                        this.store.apiClient.reportError(error, 'Project update failed', { silent: true });
                    });
                }
                this.store.notify();
            });
        });

        // Priority color inputs
        container.querySelectorAll('.priority-color-input').forEach(input => {
            input.addEventListener('change', () => {
                const priority = input.dataset.priority;
                if (!project.priorityColors) {
                    project.priorityColors = this.store.getDefaultPriorityColors();
                }
                project.priorityColors[priority] = input.value;
                this.store.saveState();
                if (this.store.apiClient) {
                    this.store.apiClient.updateProject(projectId, {
                        name: project.name,
                        color: project.color,
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors
                    }).catch((error) => {
                        this.store.apiClient.reportError(error, 'Project update failed', { silent: true });
                    });
                }
                this.store.notify();
            });
        });

        // Team assignments
        container.querySelectorAll('.settings-checkbox-item input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', () => {
                const teamId = input.dataset.teamId;
                if (!teamId) return;
                const current = new Set(project.teamIds || []);
                if (input.checked) {
                    current.add(teamId);
                } else {
                    current.delete(teamId);
                }
                project.teamIds = [...current];
                const projectTeams = this.store.projects.reduce((acc, item) => {
                    acc[item.id] = item.teamIds || [];
                    return acc;
                }, {});
                this.settings.set('projectTeams', projectTeams);
                this.store.saveState();
                if (this.store.apiClient) {
                    this.store.apiClient.updateProject(projectId, {
                        name: project.name,
                        color: project.color,
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors,
                        teamIds: project.teamIds
                    }).catch((error) => {
                        this.store.apiClient.reportError(error, 'Project update failed', { silent: true });
                    });
                }
            });
        });

        // Delete project
        container.querySelector('#deleteProject').addEventListener('click', () => {
            const confirmDelete = confirm(`Are you sure you want to delete "${project.name}"? All tasks will be moved to Unassigned.`);
            if (confirmDelete) {
                this.currentProjectSettings = null;
                this.store.deleteProject(projectId);
                this.showToast('Project deleted');
                this.render();
            }
        });
    }

    showNewTeamInput() {
        const addBtn = document.getElementById('addTeamBtn');
        if (!addBtn) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'new-project-input-wrapper';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'new-project-input';
        input.placeholder = 'Team name...';
        wrapper.appendChild(input);

        addBtn.parentNode.insertBefore(wrapper, addBtn);
        addBtn.style.display = 'none';
        input.focus();

        const cleanup = () => {
            wrapper.remove();
            addBtn.style.display = '';
        };

        const createTeam = () => {
            const name = input.value.trim();
            if (name) {
                this.store.addTeam(name);
                this.settings.set('teams', this.store.teams);
            }
            cleanup();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createTeam();
            } else if (e.key === 'Escape') {
                cleanup();
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(cleanup, 150);
        });
    }

    showTeamSettings(teamId) {
        const team = this.store.teams.find(t => t.id === teamId);
        if (!team) {
            this.currentTeamSettings = null;
            this.render();
            return;
        }

        this.currentTeamSettings = teamId;

        document.querySelector('.toolbar').style.display = 'none';
        document.querySelector('.settings-pane').style.display = 'none';

        const container = document.getElementById('viewContainer');
        const members = team.members || [];
        const defaultMember = team.defaultMember || '';
        container.innerHTML = `
            <div class="project-settings-page team-settings-page">
                <div class="project-settings-header">
                    <button class="back-btn" id="backToView">← Back</button>
                    <h2>Team Settings</h2>
                </div>

                <div class="project-settings-content">
                    <div class="settings-section">
                        <h3>General</h3>
                        <div class="settings-field">
                            <label>Team Name</label>
                            <input type="text" class="settings-input" id="teamName" value="${team.name}">
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>Members</h3>
                        <div class="settings-field">
                            <label>Add Member</label>
                            <div class="new-project-input-wrapper">
                                <input type="text" class="new-project-input" id="teamMemberInput" placeholder="Member name...">
                                <button class="btn btn-secondary" id="addTeamMemberBtn">Add</button>
                            </div>
                        </div>
                        <div class="settings-field" id="teamMembersList">
                            ${members.length === 0 ? '<div class="settings-info">No members yet.</div>' : ''}
                            ${members.map(member => `
                                <div class="team-member-row" data-member="${member}">
                                    <label class="team-member-label">
                                        <input type="radio" name="teamDefault" value="${member}" ${defaultMember === member ? 'checked' : ''}>
                                        <span class="team-member-name">${member}</span>
                                    </label>
                                    <div class="team-member-actions">
                                        <button class="btn btn-secondary team-member-edit" data-member="${member}">Edit</button>
                                        <button class="btn btn-secondary team-member-remove" data-member="${member}">Remove</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.applyTooltipSetting();

        container.querySelector('#backToView').addEventListener('click', () => {
            this.currentTeamSettings = null;
            this.render();
        });

        const persistTeams = () => {
            this.settings.set('teams', this.store.teams);
        };

        const nameInput = container.querySelector('#teamName');
        nameInput.addEventListener('input', () => {
            const newName = nameInput.value.trim();
            if (!newName) return;
            this.store.updateTeam(teamId, { name: newName });
            persistTeams();
            this.renderProjectSidebar();
        });

        const memberInput = container.querySelector('#teamMemberInput');
        const addMemberBtn = container.querySelector('#addTeamMemberBtn');
        const addMember = () => {
            const name = memberInput.value.trim();
            if (!name) return;
            const currentMembers = team.members || [];
            if (currentMembers.includes(name)) {
                memberInput.value = '';
                return;
            }
            const nextMembers = [...currentMembers, name];
            const nextDefault = team.defaultMember || name;
            this.store.updateTeam(teamId, { members: nextMembers, defaultMember: nextDefault });
            persistTeams();
            this.showTeamSettings(teamId);
        };
        addMemberBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addMember();
        });
        memberInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addMember();
            }
        });

        container.querySelectorAll('input[name="teamDefault"]').forEach(input => {
            input.addEventListener('change', () => {
                const value = input.value;
                this.store.updateTeam(teamId, { defaultMember: value });
                persistTeams();
            });
        });

        container.querySelectorAll('.team-member-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const member = btn.dataset.member;
                const row = btn.closest('.team-member-row');
                if (!row) return;
                const label = row.querySelector('.team-member-label');
                const nameSpan = row.querySelector('.team-member-name');
                if (!label || !nameSpan) return;

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'new-project-input';
                input.value = member;
                label.replaceChild(input, nameSpan);
                input.focus();
                input.select();

                const save = () => {
                    const nextName = input.value.trim();
                    if (!nextName) {
                        this.showTeamSettings(teamId);
                        return;
                    }
                    const currentMembers = team.members || [];
                    if (currentMembers.includes(nextName) && nextName !== member) {
                        this.showTeamSettings(teamId);
                        return;
                    }
                    const nextMembers = currentMembers.map(m => (m === member ? nextName : m));
                    const nextDefault = team.defaultMember === member ? nextName : team.defaultMember;
                    this.store.updateTeam(teamId, { members: nextMembers, defaultMember: nextDefault });
                    persistTeams();
                    this.showTeamSettings(teamId);
                };

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                    } else if (e.key === 'Escape') {
                        this.showTeamSettings(teamId);
                    }
                });

                input.addEventListener('blur', () => {
                    save();
                });
            });
        });

        container.querySelectorAll('.team-member-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const member = btn.dataset.member;
                const nextMembers = (team.members || []).filter(m => m !== member);
                const nextDefault = team.defaultMember === member ? (nextMembers[0] || '') : team.defaultMember;
                this.store.updateTeam(teamId, { members: nextMembers, defaultMember: nextDefault });
                persistTeams();
                this.showTeamSettings(teamId);
            });
        });
    }

    applyTooltipSetting() {
        const disableTooltips = this.settings.get('disableTooltips');
        document.querySelectorAll('[title], [data-tooltip-title]').forEach(element => {
            if (disableTooltips) {
                const title = element.getAttribute('title');
                if (title) {
                    element.setAttribute('data-tooltip-title', title);
                    element.removeAttribute('title');
                }
                return;
            }
            if (!element.getAttribute('title') && element.dataset.tooltipTitle) {
                element.setAttribute('title', element.dataset.tooltipTitle);
                element.removeAttribute('data-tooltip-title');
            }
        });
    }

    handleLinkModeClick(taskId) {
        if (!this.linkSource) {
            this.linkSource = taskId;
            const banner = document.getElementById('linkModeBanner');
            banner.textContent = `🔗 Source selected. Now click the task that depends on \"${this.store.findTask(taskId).title}\"`;
        } else {
            if (this.linkSource !== taskId) {
                this.store.addDependency(taskId, this.linkSource);
                const banner = document.getElementById('linkModeBanner');
                banner.textContent = `✓ Dependency created! Click another task or toggle Link Mode off.`;
            }
            this.linkSource = null;
        }
    }

    handleRelateModeClick(taskId) {
        if (!this.relateSource) {
            this.relateSource = taskId;
            const banner = document.getElementById('relateLinkBanner');
            banner.textContent = `🔗 First task selected. Now click the task to relate to \"${this.store.findTask(taskId).title}\"`;
        } else {
            if (this.relateSource !== taskId) {
                this.store.addRelatedTask(this.relateSource, taskId);
                const banner = document.getElementById('relateLinkBanner');
                banner.textContent = `✓ Related link created! Click another task or toggle Relate Mode off.`;
            }
            this.relateSource = null;
        }
    }

    showNodeModal(taskId) {
        const task = this.store.findTask(taskId);
        if (!task) return;

        const modal = document.getElementById('nodeModal');
        const content = document.getElementById('nodeModalContent');

        const childrenHtml = task.children && task.children.length > 0 ? `
            <div class=\"detail-field\">
                <div class=\"detail-label\">Subtasks (${task.children.length})</div>
                <div style=\"padding-left: 12px;\">
                    ${task.children.map(child => `
                        <div style=\"padding: 4px 0; display: flex; align-items: center; gap: 8px;\">
                            <div class=\"status-icon status-${child.metadata.status}\" style=\"width: 16px; height: 16px; font-size: 10px;\">
                                ${child.metadata.status === 'done' ? '✓' : 
                                  child.metadata.status === 'in-progress' ? '⚡' : '○'}
                            </div>
                            <span>${child.title}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        content.innerHTML = `
            <div class=\"modal-header\">${task.title}</div>

            ${task.description ? `
                <div class=\"detail-field\">
                    <div class=\"detail-label\">Description</div>
                    <p>${task.description}</p>
                </div>
            ` : ''}

            <div class=\"detail-field\">
                <div class=\"detail-label\">Status</div>
                <span class=\"badge badge-${task.metadata.status}\">${task.metadata.status}</span>
            </div>

            ${task.metadata.assignee ? `
                <div class=\"detail-field\">
                    <div class=\"detail-label\">Assignee</div>
                    <span>${task.metadata.assignee}</span>
                </div>
            ` : ''}

            ${childrenHtml}

            <div class=\"detail-actions\">
                <button class=\"btn btn-primary\" id=\"editTaskFromModal\">Edit Details</button>
                <button class=\"btn btn-secondary\" id=\"closeNodeModal\">Close</button>
            </div>
        `;

        modal.classList.add('visible');

        content.querySelector('#editTaskFromModal').addEventListener('click', () => {
            modal.classList.remove('visible');
            this.showDetailPanel(taskId);
        });

        content.querySelector('#closeNodeModal').addEventListener('click', () => {
            modal.classList.remove('visible');
        });
    }

    showDetailPanel(taskId) {
        const task = this.store.findTask(taskId);
        if (!task) return;

        this.selectedTask = taskId;
        const panel = document.getElementById('detailPanel');
        const relatedTasks = this.store.getRelatedTasks(taskId);

        // Get list of all tasks for related task selection
        const allTasks = this.store.getFlatTasks().filter(t => t.id !== taskId && !relatedTasks.includes(t.id));

        // Check if this is a parent (root-level) task
        const isParentTask = this.store.tasks.some(t => t.id === taskId);
        const projects = this.store.getProjects();
        const taskProject = this.store.getTaskProject(taskId);

        // Build project dropdown HTML (only for parent tasks)
        const projectDropdownHtml = isParentTask ? `
            <div class="detail-field">
                <div class="detail-label">Project</div>
                <select class="detail-select" id="taskProject">
                    <option value="" ${!task.projectId ? 'selected' : ''}>No Project</option>
                    ${projects.map(p => `
                        <option value="${p.id}" ${task.projectId === p.id ? 'selected' : ''}>${p.name}</option>
                    `).join('')}
                </select>
            </div>
        ` : '';

        const parentContainerHtml = isParentTask ? `
            <div class="detail-field">
                <div class="detail-label">Parent Container Color</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="display: flex; gap: 6px; align-items: center;">
                        <input type="checkbox" id="taskContainerEnabled">
                        Enable
                    </label>
                    <input type="color" id="taskContainerColor" value="#cbd5e1">
                </div>
            </div>
        ` : '';

        panel.innerHTML = `
            <div class="detail-header">Task Details</div>

            <div class="detail-field">
                <div class="detail-label">Title</div>
                <input type="text" class="detail-input" id="taskTitle" value="${task.title}">
            </div>

            <div class="detail-field">
                <div class="detail-label">Description</div>
                <textarea class="detail-input detail-textarea" id="taskDescription">${task.description || ''}</textarea>
            </div>

            ${projectDropdownHtml}
            ${parentContainerHtml}

            <div class="detail-field">
                <div class="detail-label">Status</div>
                <select class="detail-select" id="taskStatus">
                    <option value="todo" ${task.metadata.status === 'todo' ? 'selected' : ''}>To Do</option>
                    <option value="in-progress" ${task.metadata.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="review" ${task.metadata.status === 'review' ? 'selected' : ''}>Review</option>
                    <option value="done" ${task.metadata.status === 'done' ? 'selected' : ''}>Done</option>
                </select>
            </div>

            <div class="detail-field">
                <div class="detail-label">Priority</div>
                <select class="detail-select" id="taskPriority">
                    <option value="low" ${task.metadata.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${task.metadata.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${task.metadata.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>

            <div class="detail-field">
                <div class="detail-label">Assignee</div>
                <input type="text" class="detail-input" id="taskAssignee" value="${task.metadata.assignee || ''}">
            </div>

            <div class="detail-field">
                <div class="detail-label">Start Date</div>
                <input type="date" class="detail-input" id="taskStartDate" value="${task.metadata.startDate || ''}">
            </div>

            <div class="detail-field">
                <div class="detail-label">End Date</div>
                <input type="date" class="detail-input" id="taskEndDate" value="${task.metadata.endDate || ''}">
            </div>

            <div class="detail-field">
                <div class="detail-label">Related Tasks</div>
                <select class="detail-select" id="addRelated">
                    <option value="">+ Add related task...</option>
                    ${allTasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}
                </select>
                ${relatedTasks.length > 0 ? `
                    <div class="related-list">
                        ${relatedTasks.map(relId => {
                            const relTask = this.store.findTask(relId);
                            return relTask ? `
                                <div class="related-item">
                                    <span>⟷ ${relTask.title}</span>
                                    <span class="remove-related" data-remove-related="${relId}">×</span>
                                </div>
                            ` : '';
                        }).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="detail-actions">
                <button class="btn btn-secondary" id="closePanel">Close</button>
            </div>
        `;

        panel.classList.add('visible');

        // Click outside to close
        const handleClickOutside = (e) => {
            if (!panel.contains(e.target) && panel.classList.contains('visible')) {
                panel.classList.remove('visible');
                document.removeEventListener('click', handleClickOutside);
            }
        };
        // Use setTimeout to prevent immediate closing from the double-click event
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);

        // Autosave function
        const autosave = () => {
            const updates = {
                title: panel.querySelector('#taskTitle').value,
                description: panel.querySelector('#taskDescription').value,
                'metadata.status': panel.querySelector('#taskStatus').value,
                'metadata.priority': panel.querySelector('#taskPriority').value,
                'metadata.assignee': panel.querySelector('#taskAssignee').value,
                'metadata.startDate': panel.querySelector('#taskStartDate').value,
                'metadata.endDate': panel.querySelector('#taskEndDate').value
            };
            const containerEnabled = panel.querySelector('#taskContainerEnabled');
            const containerColor = panel.querySelector('#taskContainerColor');
            if (containerEnabled && containerColor) {
                updates['metadata.containerColor'] = containerEnabled.checked ? containerColor.value : '';
            }
            this.store.updateTask(taskId, updates);
        };

        // Attach autosave to all input fields
        panel.querySelector('#taskTitle').addEventListener('input', autosave);
        panel.querySelector('#taskDescription').addEventListener('input', autosave);
        panel.querySelector('#taskStatus').addEventListener('change', autosave);
        panel.querySelector('#taskPriority').addEventListener('change', autosave);
        panel.querySelector('#taskAssignee').addEventListener('input', autosave);
        panel.querySelector('#taskStartDate').addEventListener('change', autosave);
        panel.querySelector('#taskEndDate').addEventListener('change', autosave);
        const containerEnabled = panel.querySelector('#taskContainerEnabled');
        const containerColor = panel.querySelector('#taskContainerColor');
        if (containerEnabled && containerColor) {
            containerEnabled.checked = !!task.metadata.containerColor;
            containerColor.value = task.metadata.containerColor || (taskProject ? taskProject.color : '#cbd5e1');
            containerColor.disabled = !containerEnabled.checked;
            containerEnabled.addEventListener('change', () => {
                containerColor.disabled = !containerEnabled.checked;
                autosave();
            });
            containerColor.addEventListener('change', autosave);
        }

        // Project assignment (only for parent tasks)
        const projectSelect = panel.querySelector('#taskProject');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                const projectId = e.target.value || null;
                this.store.assignTaskToProject(taskId, projectId);
            });
        }

        panel.querySelector('#addRelated').addEventListener('change', (e) => {
            if (e.target.value) {
                this.store.addRelatedTask(taskId, e.target.value);
                e.target.value = '';
                this.showDetailPanel(taskId);
            }
        });

        panel.querySelectorAll('[data-remove-related]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.store.removeRelatedTask(taskId, e.target.dataset.removeRelated);
                this.showDetailPanel(taskId);
            });
        });

        panel.querySelector('#closePanel').addEventListener('click', () => {
            panel.classList.remove('visible');
            document.removeEventListener('click', handleClickOutside);
        });
    }

    showAddTaskModal(parentId) { return showAddTaskModal(this, parentId); }
    closeAddTaskModal() { return closeAddTaskModal(); }
    openSettingsModal() { return openSettingsModal(this); }
    closeSettingsModal() { return closeSettingsModal(); }
    populateSettingsModal() { return populateSettingsModal(this); }
    saveSettingsModal() { return saveSettingsModal(this); }
    resetSettingsModal() { return resetSettingsModal(this); }
    showToast(message) { return showToast(message); }
}
