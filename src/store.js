// Task Store - Single source of truth
        class TaskStore {
            constructor() {
                this.tasks = [];
                this.nextId = 100;
                this.apiClient = null;
                this.idGenerator = () => String(this.nextId++);
                this.collapsed = new Set();
                this.relatedTasks = new Map(); // Bidirectional relationships
                this.dependencies = new Map(); // taskId -> [dependsOnId]
                this.relatedFilterTaskId = null; // Task ID to filter related tasks by
                this.observers = [];
                this.selectedFilters = new Set(); // Empty set means 'all'
                this.filterMode = 'show'; // 'show' = dim non-matching, 'filter' = hide non-matching
                this.searchQuery = '';
                this.showDescriptions = false;
                this.editMode = false;
                this.kanbanSortMode = 'default'; // 'default' | 'priority' | 'endDate' | 'manual'
                this.kanbanSortDirection = 'asc'; // 'asc' | 'desc'

                // Projects system
                this.projects = []; // Array of {id, name, color}
                this.nextProjectId = 1;
                this.projectIdGenerator = () => String(this.nextProjectId++);
                this.selectedProjectId = null; // null = all projects (legacy, for single select)
                this.selectedProjectIds = new Set(); // For multi-select (empty = all projects)
                this.projectViewMode = 'global'; // 'global' | 'project' | 'multi'
                this.projectColorPalette = [
                    '#3B82F6', // blue
                    '#10B981', // green
                    '#F59E0B', // amber
                    '#EF4444', // red
                    '#8B5CF6', // purple
                    '#EC4899', // pink
                    '#06B6D4', // cyan
                    '#F97316', // orange
                    '#6366F1', // indigo
                    '#14B8A6'  // teal
                ];

                // Teams system
                this.teams = []; // Array of {id, name, members, defaultMember}
                this.nextTeamId = 1;
                this.teamIdGenerator = () => `team-${this.nextTeamId++}`;
                this.teamFilterId = null;
                this.assigneeFilter = null;

                // View-specific display settings
                // Outline
                this.showAssigneeInOutline = true;
                this.showPriorityInOutline = true;
                this.showDescriptionsInOutline = false; // Uses showDescriptions for backward compat

                // Kanban
                this.showAssigneeInKanban = true;
                this.showPriorityInKanban = true;
                this.showDescriptionsInKanban = true;

                // Gantt
                this.showAssigneeInGantt = true;
                this.showPriorityInGantt = true;
                this.showDescriptionsInGantt = false;
                this.showBarTextInGantt = true;

                // Mind Map
                this.showMindMapAssignee = true;
                this.showMindMapPriority = true;
                this.showMindMapDescription = false;
                this.selectedParents = new Set(); // Track selected parent tasks for filtering
                this.parentFilterInitialized = false; // Track if parent filter has been initialized

                // Undo/Redo system
                this.history = [];
                this.historyIndex = -1;
                this.maxHistorySize = 50;

                // Save initial state
                this.saveState();
            }

            saveState() {
                // Create a deep copy of current state
                const state = {
                    tasks: JSON.parse(JSON.stringify(this.tasks)),
                    relatedTasks: new Map(this.relatedTasks),
                    dependencies: new Map(this.dependencies),
                    nextId: this.nextId,
                    projects: JSON.parse(JSON.stringify(this.projects)),
                    nextProjectId: this.nextProjectId,
                    teams: JSON.parse(JSON.stringify(this.teams)),
                    nextTeamId: this.nextTeamId
                };
                
                // Remove any states after current index (when making changes after undo)
                this.history = this.history.slice(0, this.historyIndex + 1);
                
                // Add new state
                this.history.push(state);
                
                // Limit history size
                if (this.history.length > this.maxHistorySize) {
                    this.history.shift();
                } else {
                    this.historyIndex++;
                }
            }

            undo() {
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.restoreState(this.history[this.historyIndex]);
                    this.notify();
                    return true;
                }
                return false;
            }

            redo() {
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.restoreState(this.history[this.historyIndex]);
                    this.notify();
                    return true;
                }
                return false;
            }

            restoreState(state) {
                this.tasks = JSON.parse(JSON.stringify(state.tasks));
                this.relatedTasks = new Map(state.relatedTasks || []);
                this.dependencies = new Map(state.dependencies || []);
                this.nextId = state.nextId;
                // Restore projects if they exist in state (backward compatibility)
                if (state.projects) {
                    this.projects = JSON.parse(JSON.stringify(state.projects));
                    this.nextProjectId = state.nextProjectId;
                }
                if (state.teams) {
                    this.teams = JSON.parse(JSON.stringify(state.teams));
                    this.nextTeamId = state.nextTeamId || this.nextTeamId;
                }
            }

            subscribe(callback) {
                this.observers.push(callback);
            }

            setApiClient(apiClient, uuidGenerator) {
                this.apiClient = apiClient;
                if (uuidGenerator) {
                    this.idGenerator = uuidGenerator;
                    this.projectIdGenerator = uuidGenerator;
                    this.teamIdGenerator = uuidGenerator;
                }
            }

            generateId() {
                return this.idGenerator();
            }

            generateProjectId() {
                return this.projectIdGenerator();
            }

            generateTeamId() {
                return this.teamIdGenerator();
            }

            notify() {
                this.observers.forEach(callback => callback());
            }

            addTask(parentId, title, description = '', projectId = null) {
                const newTask = {
                    id: this.generateId(),
                    title,
                    description,
                    metadata: {
                        status: 'todo',
                        priority: 'medium',
                        assignee: '',
                        startDate: '',
                        endDate: ''
                    },
                    children: []
                };

                if (parentId) {
                    const parent = this.findTask(parentId);
                    if (parent) {
                        newTask.sortIndex = parent.children.length;
                        parent.children.push(newTask);
                    }
                } else {
                    // Adding a root-level (parent) task
                    // Assign to project if provided
                    if (projectId) {
                        newTask.projectId = projectId;
                    }
                    newTask.sortIndex = this.tasks.length;
                    this.tasks.push(newTask);

                    // Automatically add new parent to selection (keep existing selections)
                    if (this.parentFilterInitialized) {
                        this.selectedParents.add(newTask.id);
                    }
                }

                this.saveState();
                this.notify();
                if (this.apiClient) {
                    this.apiClient.createTask({
                        id: newTask.id,
                        title: newTask.title,
                        description: newTask.description,
                        parentId: parentId || null,
                        projectId: newTask.projectId || null,
                        metadata: newTask.metadata,
                        sortIndex: newTask.sortIndex || 0
                    }).then(() => {
                        if (typeof showToast === 'function') {
                            showToast('Task saved');
                        }
                    }).catch((error) => {
                        this.apiClient.reportError(error, 'Task save failed', { silent: true });
                        if (typeof showToast === 'function') {
                            showToast('Task save failed');
                        }
                    });
                }
                return newTask.id; // Return the new task ID
            }

            findTask(id, tasks = this.tasks) {
                for (const task of tasks) {
                    if (task.id === id) return task;
                    if (task.children) {
                        const found = this.findTask(id, task.children);
                        if (found) return found;
                    }
                }
                return null;
            }

            findParent(childId, tasks = this.tasks, parent = null) {
                for (const task of tasks) {
                    if (task.id === childId) return parent;
                    if (task.children) {
                        const found = this.findParent(childId, task.children, task);
                        if (found !== null) return found;
                    }
                }
                return null;
            }

            collectDescendantIds(task, set) {
                if (!task || !task.children) return;
                task.children.forEach(child => {
                    set.add(child.id);
                    this.collectDescendantIds(child, set);
                });
            }

            deleteTask(id, tasks = this.tasks) {
                for (let i = 0; i < tasks.length; i++) {
                    if (tasks[i].id === id) {
                        tasks.splice(i, 1);
                        this.saveState();
                        this.notify();
                        if (this.apiClient) {
                            this.apiClient.deleteTask(id).catch((error) => {
                                this.apiClient.reportError(error, 'Task delete failed');
                            });
                        }
                        return true;
                    }
                    if (tasks[i].children) {
                        if (this.deleteTask(id, tasks[i].children)) {
                            return true;
                        }
                    }
                }
                return false;
            }

            updateTask(id, updates) {
                const task = this.findTask(id);
                if (!task) return;

                const apiUpdates = {};
                const metadataUpdates = {};
                let statusUpdated = false;

                Object.keys(updates).forEach(key => {
                    if (key.startsWith('metadata.')) {
                        const metaKey = key.split('.')[1];
                        task.metadata[metaKey] = updates[key];
                        metadataUpdates[metaKey] = updates[key];
                        if (metaKey === 'status') {
                            statusUpdated = true;
                        }
                    } else {
                        task[key] = updates[key];
                        apiUpdates[key] = updates[key];
                    }
                });

                const updatedParents = statusUpdated ? this.updateAncestorStatuses(id) : [];
                this.saveState();
                this.notify();
                if (this.apiClient) {
                    if (Object.keys(metadataUpdates).length > 0) {
                        apiUpdates.metadata = metadataUpdates;
                    }
                    this.apiClient.updateTask(id, apiUpdates).catch((error) => {
                        this.apiClient.reportError(error, 'Task update failed', { silent: true });
                    });
                    if (updatedParents.length > 0) {
                        updatedParents.forEach(({ id: parentId, status }) => {
                            this.apiClient.updateTask(parentId, { metadata: { status } }).catch((error) => {
                                this.apiClient.reportError(error, 'Parent status update failed', { silent: true });
                            });
                        });
                    }
                }
            }

            getRollupStatus(children) {
                if (!children || children.length === 0) return null;

                const statuses = children.map(child => child?.metadata?.status || 'todo');
                if (statuses.every(status => status === 'done')) return 'done';
                if (statuses.some(status => status !== 'todo')) return 'in-progress';
                return 'todo';
            }

            updateAncestorStatuses(taskId) {
                const updatedParents = [];
                let parent = this.findParent(taskId);

                while (parent) {
                    const nextStatus = this.getRollupStatus(parent.children);
                    if (nextStatus && parent.metadata.status !== nextStatus) {
                        parent.metadata.status = nextStatus;
                        updatedParents.push({ id: parent.id, status: nextStatus });
                    }
                    parent = this.findParent(parent.id);
                }

                return updatedParents;
            }

            applyRollupStatuses(tasks = this.tasks) {
                const updates = [];
                const walk = (list) => {
                    list.forEach((task) => {
                        if (task.children && task.children.length > 0) {
                            walk(task.children);
                            const nextStatus = this.getRollupStatus(task.children);
                            if (nextStatus && task.metadata.status !== nextStatus) {
                                task.metadata.status = nextStatus;
                                updates.push({ id: task.id, status: nextStatus });
                            }
                        }
                    });
                };
                walk(tasks);
                if (this.apiClient && updates.length > 0) {
                    updates.forEach(({ id, status }) => {
                        this.apiClient.updateTask(id, { metadata: { status } }).catch((error) => {
                            this.apiClient.reportError(error, 'Parent status update failed', { silent: true });
                        });
                    });
                }
                return updates;
            }

            toggleCollapse(id) {
                if (this.collapsed.has(id)) {
                    this.collapsed.delete(id);
                } else {
                    this.collapsed.add(id);
                }
                this.notify();
            }

            getFlatTasks(tasks = this.tasks) {
                let flat = [];
                tasks.forEach(task => {
                    flat.push(task);
                    if (task.children) {
                        flat = flat.concat(this.getFlatTasks(task.children));
                    }
                });
                return flat;
            }

            getFilteredFlatTasks() {
                // Get all tasks flattened
                const flat = this.getFlatTasks();

                // Apply search filter
                const matchesSearch = (task) => {
                    if (!this.searchQuery) return true;
                    const query = this.searchQuery.toLowerCase();
                    return task.title.toLowerCase().includes(query) ||
                           (task.description && task.description.toLowerCase().includes(query));
                };

                // Apply status filter
                const matchesStatus = (task) => {
                    return this.filter === 'all' || task.metadata.status === this.filter;
                };

                // Return filtered tasks
                return flat.filter(task => matchesSearch(task) && matchesStatus(task));
            }

            getFilteredTasks(options = {}) {
                // Helper to check if any descendant matches
                const hasMatchingDescendant = (task) => {
                    if (task.children && task.children.length > 0) {
                        return task.children.some(child =>
                            child._matches || hasMatchingDescendant(child)
                        );
                    }
                    return false;
                };

                // Get all related task IDs if filtering by related
                const relatedIds = this.relatedFilterTaskId ? new Set() : null;
                if (relatedIds) {
                    const baseRelatedIds = [
                        this.relatedFilterTaskId,
                        ...this.getRelatedTasks(this.relatedFilterTaskId)
                    ];
                    baseRelatedIds.forEach((id) => {
                        relatedIds.add(id);
                        const task = this.findTask(id);
                        if (task) {
                            this.collectDescendantIds(task, relatedIds);
                        }
                    });
                }

                const filterTasks = (tasks) => {
                    let filtered = tasks.map(task => {
                        const taskCopy = { ...task, children: task.children ? [...task.children] : [] };

                        // Apply search filter
                        const matchesSearch = !this.searchQuery ||
                            task.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            (task.description && task.description.toLowerCase().includes(this.searchQuery.toLowerCase()));

                        // Apply status filter (empty set or 'all' means show all)
                        const matchesStatus = this.selectedFilters.size === 0 || this.selectedFilters.has(task.metadata.status);

                        // Apply related filter (if set, only show related tasks + the source task)
                        const matchesRelated = !relatedIds || relatedIds.has(task.id);

                        const assignee = (task.metadata.assignee || '').trim();
                        let matchesAssignee = true;
                        if (this.assigneeFilter) {
                            matchesAssignee = assignee === this.assigneeFilter;
                        } else if (this.teamFilterId) {
                            const team = this.getTeam(this.teamFilterId);
                            const members = team ? (team.members || []) : [];
                            matchesAssignee = members.includes(assignee);
                        }

                        taskCopy._matches = matchesSearch && matchesStatus && matchesRelated && matchesAssignee;

                        // Recursively filter children
                        if (taskCopy.children && taskCopy.children.length > 0) {
                            taskCopy.children = filterTasks(taskCopy.children);
                        }

                        return taskCopy;
                    });

                    // If in 'filter' mode, keep tasks that match OR have matching descendants
                    if (this.filterMode === 'filter') {
                        filtered = filtered.filter(task =>
                            task._matches || hasMatchingDescendant(task)
                        );
                    }

                    // If in 'show' mode, keep all tasks but mark them
                    return filtered;
                };

                const sortTasksByPriority = (tasks) => {
                    // Priority order: high (0) → medium (1) → low (2)
                    const priorityOrder = { high: 0, medium: 1, low: 2 };

                    return tasks.map(task => {
                        const taskCopy = { ...task };

                        // Recursively sort children
                        if (taskCopy.children && taskCopy.children.length > 0) {
                            taskCopy.children = sortTasksByPriority([...taskCopy.children]);
                        }

                        return taskCopy;
                    }).sort((a, b) => {
                        const aPriority = priorityOrder[a.metadata.priority || 'medium'];
                        const bPriority = priorityOrder[b.metadata.priority || 'medium'];
                        return aPriority - bPriority;
                    });
                };

                // Apply project filter FIRST
                let tasksToFilter = this.tasks;
                if (this.projectViewMode === 'multi') {
                    // Multi-select mode: show tasks from all selected projects
                    if (this.selectedProjectIds.size === 0) {
                        // Nothing selected in multi mode - show all
                        tasksToFilter = this.tasks;
                    } else {
                        tasksToFilter = this.tasks.filter(task => {
                            if (this.selectedProjectIds.has('unassigned')) {
                                if (!task.projectId) return true;
                            }
                            return this.selectedProjectIds.has(task.projectId);
                        });
                    }
                } else if (this.projectViewMode === 'project') {
                    if (this.selectedProjectId === null) {
                        // No project selected in project view mode - show nothing
                        tasksToFilter = [];
                    } else if (this.selectedProjectId === 'unassigned') {
                        // Show only tasks with no project
                        tasksToFilter = this.tasks.filter(task => !task.projectId);
                    } else {
                        // Filter to only tasks in selected project
                        tasksToFilter = this.tasks.filter(task => task.projectId === this.selectedProjectId);
                    }
                }
                // In global mode, show all tasks (no project filtering)

                // Apply parent filter SECOND (only show selected parent tasks and their children)
                if (this.parentFilterInitialized && !options.skipParentFilter) {
                    if (this.selectedParents.size === 0) {
                        // No parents selected - show nothing
                        tasksToFilter = [];
                    } else {
                        // Filter to only selected parents (even if all are selected)
                        tasksToFilter = tasksToFilter.filter(task => this.selectedParents.has(task.id));
                    }
                }

                let tasks = filterTasks(tasksToFilter);

                // Apply priority sorting if enabled (for views that use getFilteredTasks)
                if (this.kanbanSortMode === 'priority') {
                    tasks = sortTasksByPriority(tasks);
                }

                return tasks;
            }

            tasksToOutlineText(tasks = this.tasks, depth = 0) {
                let text = '';
                tasks.forEach(task => {
                    const indent = '  '.repeat(depth);
                    const description = task.description ? ` # ${task.description}` : '';
                    
                    // Encode metadata inline with special markers
                    const meta = [];
                    if (task.metadata.status && task.metadata.status !== 'todo') {
                        meta.push(`@status:${task.metadata.status}`);
                    }
                    if (task.metadata.priority && task.metadata.priority !== 'medium') {
                        meta.push(`@priority:${task.metadata.priority}`);
                    }
                    if (task.metadata.assignee) {
                        meta.push(`@assignee:${task.metadata.assignee}`);
                    }
                    if (task.metadata.startDate) {
                        meta.push(`@start:${task.metadata.startDate}`);
                    }
                    if (task.metadata.endDate) {
                        meta.push(`@end:${task.metadata.endDate}`);
                    }
                    if (meta.length > 0) {
                        meta.unshift(''); // Add space before first @
                    }
                    
                    const metaStr = meta.length > 0 ? ` [${meta.join(' ')}]` : '';
                    
                    text += `${indent}${task.title}${description}${metaStr}\n`;
                    if (task.children && task.children.length > 0) {
                        text += this.tasksToOutlineText(task.children, depth + 1);
                    }
                });
                return text;
            }

            outlineTextToTasks(text) {
                const lines = text.split('\n').filter(line => line.trim());
                const root = [];
                const stack = [{ children: root, depth: -1 }];
                
                // Create a map of existing tasks by ID for metadata preservation
                const existingTasksMap = new Map();
                const flatExisting = this.getFlatTasks();
                flatExisting.forEach(task => {
                    existingTasksMap.set(task.id, task);
                });
                
                // Also map by title as fallback
                const existingByTitle = new Map();
                flatExisting.forEach(task => {
                    existingByTitle.set(task.title.toLowerCase(), task);
                });

                lines.forEach((line, lineNum) => {
                    // Count leading spaces
                    const leadingSpaces = line.search(/\S/);
                    if (leadingSpaces === -1) return; // Empty line
                    
                    const depth = Math.floor(leadingSpaces / 2);
                    let content = line.trim();
                    
                    if (!content) return;
                    
                    // Extract metadata if present [...]
                    let metadata = {
                        status: 'todo',
                        priority: 'medium',
                        assignee: '',
                        startDate: '',
                        endDate: ''
                    };
                    
                    const metaMatch = content.match(/\[([^\]]+)\]$/);
                    if (metaMatch) {
                        content = content.substring(0, metaMatch.index).trim();
                        const metaParts = metaMatch[1].trim().split(/\s+/);
                        
                        metaParts.forEach(part => {
                            if (part.startsWith('@status:')) {
                                metadata.status = part.substring(8);
                            } else if (part.startsWith('@priority:')) {
                                metadata.priority = part.substring(10);
                            } else if (part.startsWith('@assignee:')) {
                                metadata.assignee = part.substring(10);
                            } else if (part.startsWith('@start:')) {
                                metadata.startDate = part.substring(7);
                            } else if (part.startsWith('@end:')) {
                                metadata.endDate = part.substring(5);
                            }
                        });
                    }
                    
                    // Split title and description
                    const [title, ...descParts] = content.split('#').map(s => s.trim());
                    const description = descParts.join('#').trim();

                    if (!title) return;

                    // Try to find existing task by title to preserve ID
                    const existingTask = existingByTitle.get(title.toLowerCase());
                    
                    const task = {
                        id: existingTask ? existingTask.id : this.generateId(),
                        title,
                        description: description || (existingTask ? existingTask.description : ''),
                        metadata: metadata,
                        children: []
                    };

                    // Pop stack to correct depth
                    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
                        stack.pop();
                    }

                    // Add to parent
                    if (stack.length > 0) {
                        stack[stack.length - 1].children.push(task);
                        stack.push({ children: task.children, depth });
                    }
                });

                return root;
            }

            parseOutlineAndUpdate(text) {
                try {
                    this.tasks = this.outlineTextToTasks(text);
                    this.saveState();
                    this.notify();
                    return true;
                } catch (error) {
                    console.error('Parse error:', error);
                    return false;
                }
            }

            getInitialData() {
                return [
                    {
                        id: '1',
                        title: 'Launch Website',
                        description: 'Complete website redesign and launch',
                        metadata: {
                            status: 'in-progress',
                            priority: 'high',
                            assignee: 'JS',
                            startDate: '2024-12-01',
                            endDate: '2024-12-31'
                        },
                        children: [
                            {
                                id: '1-1',
                                title: 'Research',
                                description: 'User research and competitive analysis phase',
                                metadata: { status: 'in-progress', priority: 'high', assignee: 'JS', startDate: '2024-12-01', endDate: '2024-12-10' },
                                children: [
                                    { id: '1-1-1', title: 'User interviews', description: 'Conduct 10 user interviews', metadata: { status: 'done', priority: 'medium', assignee: 'JS', startDate: '2024-12-01', endDate: '2024-12-05' }, children: [] },
                                    { id: '1-1-2', title: 'Analytics review', description: 'Review current site analytics', metadata: { status: 'in-progress', priority: 'high', assignee: 'JS', startDate: '2024-12-05', endDate: '2024-12-10' }, children: [] },
                                    { id: '1-1-3', title: 'Competitor analysis', description: 'Analyze top 5 competitors', metadata: { status: 'todo', priority: 'medium', assignee: 'AB', startDate: '2024-12-08', endDate: '2024-12-12' }, children: [] }
                                ]
                            },
                            {
                                id: '1-2',
                                title: 'Design',
                                description: 'UI/UX design phase',
                                metadata: { status: 'todo', priority: 'high', assignee: 'AB', startDate: '2024-12-11', endDate: '2024-12-20' },
                                children: [
                                    { id: '1-2-1', title: 'Wireframes', description: 'Create wireframes for all pages', metadata: { status: 'todo', priority: 'high', assignee: 'AB', startDate: '2024-12-11', endDate: '2024-12-15' }, children: [] },
                                    { id: '1-2-2', title: 'Visual design', description: 'High-fidelity mockups', metadata: { status: 'todo', priority: 'medium', assignee: 'AB', startDate: '2024-12-16', endDate: '2024-12-20' }, children: [] }
                                ]
                            },
                            {
                                id: '1-3',
                                title: 'Development',
                                description: 'Implementation phase',
                                metadata: { status: 'todo', priority: 'high', assignee: 'JS', startDate: '2024-12-15', endDate: '2024-12-28' },
                                children: [
                                    { id: '1-3-1', title: 'Frontend', description: 'Build React components', metadata: { status: 'todo', priority: 'high', assignee: 'JS', startDate: '2024-12-15', endDate: '2024-12-22' }, children: [] },
                                    { id: '1-3-2', title: 'Backend API', description: 'REST API development', metadata: { status: 'todo', priority: 'high', assignee: 'JS', startDate: '2024-12-18', endDate: '2024-12-25' }, children: [] },
                                    { id: '1-3-3', title: 'Testing', description: 'QA and bug fixes', metadata: { status: 'todo', priority: 'medium', assignee: 'AB', startDate: '2024-12-23', endDate: '2024-12-28' }, children: [] }
                                ]
                            }
                        ]
                    }
                ];
            }

            // ========== Related Tasks Methods (Bidirectional) ==========

            addRelatedTask(taskId1, taskId2) {
                if (taskId1 === taskId2) return; // Can't relate to self

                // Add both directions for bidirectional relationship
                if (!this.relatedTasks.has(taskId1)) {
                    this.relatedTasks.set(taskId1, []);
                }
                if (!this.relatedTasks.has(taskId2)) {
                    this.relatedTasks.set(taskId2, []);
                }

                const related1 = this.relatedTasks.get(taskId1);
                const related2 = this.relatedTasks.get(taskId2);

                let changed = false;
                if (!related1.includes(taskId2)) {
                    related1.push(taskId2);
                    changed = true;
                }
                if (!related2.includes(taskId1)) {
                    related2.push(taskId1);
                    changed = true;
                }

                if (changed) {
                    this.saveState();
                    this.notify();
                    if (this.apiClient) {
                    this.apiClient.addRelated(taskId1, taskId2).catch((error) => {
                        this.apiClient.reportError(error, 'Related add failed');
                    });
                }
                }
            }

            removeRelatedTask(taskId1, taskId2) {
                let changed = false;

                if (this.relatedTasks.has(taskId1)) {
                    const related = this.relatedTasks.get(taskId1);
                    const index = related.indexOf(taskId2);
                    if (index > -1) {
                        related.splice(index, 1);
                        changed = true;
                    }
                }

                if (this.relatedTasks.has(taskId2)) {
                    const related = this.relatedTasks.get(taskId2);
                    const index = related.indexOf(taskId1);
                    if (index > -1) {
                        related.splice(index, 1);
                        changed = true;
                    }
                }

                if (changed) {
                    this.saveState();
                    this.notify();
                    if (this.apiClient) {
                    this.apiClient.removeRelated(taskId1, taskId2).catch((error) => {
                        this.apiClient.reportError(error, 'Related remove failed');
                    });
                }
                }
            }

            addDependency(taskId, dependsOnId) {
                if (taskId === dependsOnId) return;
                if (!this.dependencies.has(taskId)) {
                    this.dependencies.set(taskId, []);
                }
                const deps = this.dependencies.get(taskId);
                if (!deps.includes(dependsOnId)) {
                    deps.push(dependsOnId);
                    this.saveState();
                    this.notify();
                    if (this.apiClient) {
                    this.apiClient.addDependency(taskId, dependsOnId).catch((error) => {
                        this.apiClient.reportError(error, 'Dependency add failed');
                    });
                }
                }
            }

            removeDependency(taskId, dependsOnId) {
                if (!this.dependencies.has(taskId)) return;
                const deps = this.dependencies.get(taskId);
                const index = deps.indexOf(dependsOnId);
                if (index > -1) {
                    deps.splice(index, 1);
                    this.saveState();
                    this.notify();
                    if (this.apiClient) {
                    this.apiClient.removeDependency(taskId, dependsOnId).catch((error) => {
                        this.apiClient.reportError(error, 'Dependency remove failed');
                    });
                }
                }
            }

            getRelatedTasks(taskId) {
                return this.relatedTasks.get(taskId) || [];
            }

            getDependencies(taskId) {
                return this.dependencies.get(taskId) || [];
            }

            setRelatedFilter(taskId) {
                this.relatedFilterTaskId = taskId;
                this.notify();
            }

            clearRelatedFilter() {
                this.relatedFilterTaskId = null;
                this.notify();
            }

            // ========== Project Methods ==========

            getProjects() {
                return this.projects;
            }

            getProject(projectId) {
                return this.projects.find(p => p.id === projectId);
            }

            getTaskColors(taskId) {
                const project = this.getTaskProject(taskId);
                if (project && project.statusColors && project.priorityColors) {
                    return {
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors
                    };
                }
                // Return defaults if no project or project has no custom colors
                return {
                    statusColors: this.getDefaultStatusColors(),
                    priorityColors: this.getDefaultPriorityColors()
                };
            }

            getNextProjectColor() {
                // Get the next color from palette based on how many projects exist
                const colorIndex = this.projects.length % this.projectColorPalette.length;
                return this.projectColorPalette[colorIndex];
            }

            getDefaultStatusColors() {
                return {
                    'todo': '#94a3b8',
                    'in-progress': '#3b82f6',
                    'review': '#f59e0b',
                    'done': '#10b981'
                };
            }

            getDefaultPriorityColors() {
                return {
                    'low': '#94a3b8',
                    'medium': '#f59e0b',
                    'high': '#ef4444'
                };
            }

            addProject(name) {
                const project = {
                    id: this.generateProjectId(),
                    name,
                    color: this.getNextProjectColor(),
                    statusColors: this.getDefaultStatusColors(),
                    priorityColors: this.getDefaultPriorityColors()
                };
                this.projects.push(project);
                this.saveState();
                this.notify();
                if (this.apiClient) {
                    this.apiClient.createProject({
                        id: project.id,
                        name: project.name,
                        color: project.color,
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors
                    }).catch((error) => {
                        this.apiClient.reportError(error, 'Project create failed');
                    });
                }
                return project.id;
            }

            updateProject(projectId, updates) {
                const project = this.getProject(projectId);
                if (!project) return false;

                if (updates.name !== undefined) project.name = updates.name;
                if (updates.color !== undefined) project.color = updates.color;
                if (updates.statusColors !== undefined) project.statusColors = updates.statusColors;
                if (updates.priorityColors !== undefined) project.priorityColors = updates.priorityColors;

                this.saveState();
                this.notify();
                if (this.apiClient) {
                    this.apiClient.updateProject(projectId, {
                        name: project.name,
                        color: project.color,
                        statusColors: project.statusColors,
                        priorityColors: project.priorityColors
                    }).catch((error) => {
                        this.apiClient.reportError(error, 'Project update failed');
                    });
                }
                return true;
            }

            deleteProject(projectId) {
                const index = this.projects.findIndex(p => p.id === projectId);
                if (index === -1) return false;

                // Remove project from array
                this.projects.splice(index, 1);

                // Unassign all tasks from this project
                this.tasks.forEach(task => {
                    if (task.projectId === projectId) {
                        task.projectId = null;
                    }
                });

                // Clear selected project if it was the deleted one
                if (this.selectedProjectId === projectId) {
                    this.selectedProjectId = null;
                }

                this.saveState();
                this.notify();
                if (this.apiClient) {
                    this.apiClient.deleteProject(projectId).catch((error) => {
                        this.apiClient.reportError(error, 'Project delete failed');
                    });
                }
                return true;
            }

            assignTaskToProject(taskId, projectId) {
                // Find the root-level task (parent)
                const task = this.tasks.find(t => t.id === taskId);
                if (!task) return false;

                task.projectId = projectId;
                this.saveState();
                this.notify();
                if (this.apiClient) {
                    this.apiClient.updateTask(taskId, { projectId }).catch((error) => {
                        this.apiClient.reportError(error, 'Project assign failed', { silent: true });
                    });
                }
                return true;
            }

            getTaskProject(taskId) {
                // Find the root ancestor and return its project
                const rootTask = this.findRootTask(taskId);
                if (!rootTask) return null;
                return rootTask.projectId ? this.getProject(rootTask.projectId) : null;
            }

            findRootTask(taskId) {
                // Check if it's a root-level task
                const rootTask = this.tasks.find(t => t.id === taskId);
                if (rootTask) return rootTask;

                // Otherwise, find the parent chain up to root
                for (const task of this.tasks) {
                    if (this.isDescendant(task, taskId)) {
                        return task;
                    }
                }
                return null;
            }

            isDescendant(parent, targetId) {
                if (!parent.children) return false;
                for (const child of parent.children) {
                    if (child.id === targetId) return true;
                    if (this.isDescendant(child, targetId)) return true;
                }
                return false;
            }

            setSelectedProject(projectId) {
                this.selectedProjectId = projectId;
                this.notify();
            }

            setProjectViewMode(mode) {
                this.projectViewMode = mode; // 'global' | 'project'
                this.notify();
            }

            getTasksByProject(projectId) {
                if (projectId === null) {
                    // Return tasks with no project assigned
                    return this.tasks.filter(t => !t.projectId);
                }
                return this.tasks.filter(t => t.projectId === projectId);
            }

            getTasksGroupedByProject() {
                // Returns an array of { project: {...} | null, tasks: [...] }
                // Ordered: projects first (by order in projects array), then unassigned
                const groups = [];

                // Add project groups
                this.projects.forEach(project => {
                    const projectTasks = this.tasks.filter(t => t.projectId === project.id);
                    if (projectTasks.length > 0) {
                        groups.push({ project, tasks: projectTasks });
                    }
                });

                // Add unassigned tasks group
                const unassignedTasks = this.tasks.filter(t => !t.projectId);
                if (unassignedTasks.length > 0) {
                    groups.push({ project: null, tasks: unassignedTasks });
                }

                return groups;
            }

            // ========== Team Methods ==========

            getTeams() {
                return this.teams;
            }

            getTeam(teamId) {
                return this.teams.find(team => team.id === teamId);
            }

            addTeam(name) {
                const team = {
                    id: this.generateTeamId(),
                    name,
                    members: [],
                    defaultMember: ''
                };
                this.teams.push(team);
                this.saveState();
                this.notify();
                return team.id;
            }

            setTeamFilter(teamId, memberName = null) {
                this.teamFilterId = teamId;
                this.assigneeFilter = memberName || null;
                this.notify();
            }

            clearTeamFilter() {
                this.teamFilterId = null;
                this.assigneeFilter = null;
                this.notify();
            }

            updateTeam(teamId, updates) {
                const team = this.teams.find(t => t.id === teamId);
                if (!team) return false;

                if (updates.name !== undefined) team.name = updates.name;
                if (updates.members !== undefined) team.members = updates.members;
                if (updates.defaultMember !== undefined) team.defaultMember = updates.defaultMember;

                this.saveState();
                this.notify();
                return true;
            }
        }
