const parseSettingValue = (rawValue) => {
    if (rawValue === null || rawValue === undefined) {
        return null;
    }

    if (typeof rawValue !== 'string') {
        return rawValue;
    }

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        return rawValue;
    }
};

const getUuid = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const buildSyncFingerprint = (projects, tasks, related, dependencies) => {
    try {
        return JSON.stringify({ projects, tasks, related, dependencies });
    } catch (error) {
        return null;
    }
};

const loadAppData = async (apiClient, store, settings) => {
    if (!apiClient) {
        return;
    }

    try {
        await apiClient.resolveToken();
    } catch (error) {
        console.warn('API token unavailable:', error);
        return;
    }

    try {
        await settings.loadFromApi(apiClient, parseSettingValue);
    } catch (error) {
        console.warn('Failed to load settings from API:', error);
    }

    try {
        const [projects, tasks, related, dependencies] = await Promise.all([
            apiClient.getProjects(),
            apiClient.getTasksTree(),
            apiClient.getRelated().catch(() => []),
            apiClient.getDependencies().catch(() => [])
        ]);

        const fingerprint = buildSyncFingerprint(projects, tasks, related, dependencies);
        if (fingerprint && store._lastSyncFingerprint === fingerprint) {
            return;
        }

        store.tasks = tasks;
        store.projects = projects;
        store.relatedTasks = new Map();
        store.dependencies = new Map();

        related.forEach((item) => {
            const taskId = item.taskId || item.task_id;
            const relatedId = item.relatedId || item.related_id;
            if (!taskId || !relatedId) return;
            if (!store.relatedTasks.has(taskId)) {
                store.relatedTasks.set(taskId, []);
            }
            const list = store.relatedTasks.get(taskId);
            if (!list.includes(relatedId)) {
                list.push(relatedId);
            }
        });

        dependencies.forEach((item) => {
            const taskId = item.taskId || item.task_id;
            const dependsOnId = item.dependsOnId || item.depends_on_id;
            if (!taskId || !dependsOnId) return;
            if (!store.dependencies.has(taskId)) {
                store.dependencies.set(taskId, []);
            }
            const list = store.dependencies.get(taskId);
            if (!list.includes(dependsOnId)) {
                list.push(dependsOnId);
            }
        });

        const projectIds = new Set(projects.map((project) => project.id));
        const hasUnassigned = tasks.some((task) => !task.projectId);

        if (store.projectViewMode === 'project') {
            const selected = store.selectedProjectId;
            const valid =
                selected === null ||
                selected === 'unassigned' ||
                projectIds.has(selected);
            const hasUnassignedSelection = selected === 'unassigned' && hasUnassigned;

            if (!valid || (selected === 'unassigned' && !hasUnassignedSelection)) {
                store.projectViewMode = 'global';
                store.selectedProjectId = null;
                settings.set('projectViewMode', 'global');
                settings.set('selectedProjectId', null);
            }
        } else if (store.projectViewMode === 'multi') {
            const filtered = new Set();
            store.selectedProjectIds.forEach((id) => {
                if (id === 'unassigned' && hasUnassigned) {
                    filtered.add(id);
                } else if (projectIds.has(id)) {
                    filtered.add(id);
                }
            });
            store.selectedProjectIds = filtered;
            if (filtered.size === 0) {
                store.projectViewMode = 'global';
                settings.set('projectViewMode', 'global');
                settings.set('selectedProjectIds', []);
            }
        }

        if (fingerprint) {
            store._lastSyncFingerprint = fingerprint;
        }
        store.saveState();
        store.notify();
    } catch (error) {
        apiClient.reportError(error, 'API load failed', { silent: true });
    }
};

const enableStoreSync = (apiClient, store, settings) => {
    if (!apiClient) {
        return;
    }

    store.setApiClient(apiClient, getUuid);

    if (settings) {
        settings.setApiClient(apiClient);
    }
};

const shouldSkipSync = () => {
    const active = document.activeElement;
    if (!active) return false;
    if (active.isContentEditable) return true;
    const tag = active.tagName ? active.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || tag === 'select';
};

const startStorePolling = (apiClient, store, settings, intervalMs = 5000) => {
    if (!apiClient) {
        return null;
    }

    const timer = setInterval(() => {
        if (shouldSkipSync()) {
            return;
        }
        loadAppData(apiClient, store, settings);
    }, intervalMs);

    return timer;
};
