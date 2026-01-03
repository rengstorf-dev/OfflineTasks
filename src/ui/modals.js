function showAddTaskModal(app, parentId = '') {
    const select = document.getElementById('newTaskParent');
    select.innerHTML = '<option value="">None (Top Level)</option>';

    const addOptions = (tasks, prefix = '') => {
        tasks.forEach(task => {
            select.innerHTML += `<option value="${task.id}">${prefix}${task.title}</option>`;
            if (task.children) {
                addOptions(task.children, prefix + '  ');
            }
        });
    };

    addOptions(app.store.tasks);

    document.getElementById('newTaskTitle').value = '';
    document.getElementById('newTaskDescription').value = '';

    if (parentId && select.querySelector(`option[value="${parentId}"]`)) {
        select.value = parentId;
    } else {
        select.value = '';
    }

    document.getElementById('addTaskModal').classList.add('visible');
    setTimeout(() => {
        const titleInput = document.getElementById('newTaskTitle');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
    }, 0);
}

function closeAddTaskModal() {
    document.getElementById('addTaskModal').classList.remove('visible');
}

function openSettingsModal(app) {
    // Populate settings from current state
    populateSettingsModal(app);

    // Set up tab switching
    const tabButtons = document.querySelectorAll('.settings-tab');
    const tabPanels = document.querySelectorAll('.settings-tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            // Update active tab panel
            tabPanels.forEach(p => {
                if (p.getAttribute('data-panel') === targetTab) {
                    p.classList.add('active');
                } else {
                    p.classList.remove('active');
                }
            });
        });
    });

    // Set up modal action buttons
    document.getElementById('saveSettings').onclick = () => saveSettingsModal(app);
    document.getElementById('resetSettings').onclick = () => resetSettingsModal(app);
    document.getElementById('cancelSettings').onclick = () => closeSettingsModal();
    document.getElementById('closeSettingsModal').onclick = () => closeSettingsModal();
    document.getElementById('settingsImportBtn').onclick = () => {
        document.getElementById('settingsImportInput').click();
    };
    document.getElementById('settingsImportInput').onchange = (e) => {
        importData(app, e);
    };

    // Show modal
    document.getElementById('globalSettingsModal').classList.add('visible');
}

function closeSettingsModal() {
    document.getElementById('globalSettingsModal').classList.remove('visible');
}

function populateSettingsModal(app) {
    // Behavior tab
    document.getElementById('setting-filterToggleBehavior').checked = app.settings.get('filterToggleBehavior');
    document.getElementById('setting-autoSave').checked = app.settings.get('autoSave');
    document.getElementById('setting-defaultView').value = app.settings.get('defaultView');
}

function saveSettingsModal(app) {
    // Save behavior settings
    app.settings.set('filterToggleBehavior', document.getElementById('setting-filterToggleBehavior').checked);
    app.settings.set('autoSave', document.getElementById('setting-autoSave').checked);
    app.settings.set('defaultView', document.getElementById('setting-defaultView').value);

    showToast('Settings saved');
    closeSettingsModal();
}

function resetSettingsModal(app) {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
        app.settings.reset();
        populateSettingsModal(app);

        document.body.classList.toggle('dark-mode', app.settings.get('darkMode'));

        showToast('Settings reset to defaults');
        app.render();
    }
}

function showToast(message) {
    let toast = document.getElementById('undoToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'undoToast';
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 1500);
}

function exportData(app) {
    return exportDataFromApi(app).catch((error) => {
        console.error('Export failed:', error);
        showToast('Export failed');
    });
}

function importData(app, event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            // Validate structure
            if (!importedData.version || !importedData.tasks) {
                throw new Error('Invalid file format');
            }

            // Confirm replacement
            if (!confirm('Import data? This will REPLACE all current tasks and settings. This cannot be undone.')) {
                event.target.value = ''; // Reset file input
                return;
            }

            importDataToApi(app, importedData)
                .then(() => {
                    closeSettingsModal();
                    showToast('Data imported successfully');
                })
                .catch((error) => {
                    console.error('Import failed:', error);
                    alert('Import failed: ' + error.message);
                });
        } catch (error) {
            alert('Import failed: ' + error.message);
        }

        // Reset file input
        event.target.value = '';
    };

    reader.readAsText(file);
}

function parseSettingValueForImport(rawValue) {
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
}

function getUuidForImport() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function exportDataFromApi(app) {
    const apiClient = app.apiClient || window.apiClient;
    if (!apiClient) {
        throw new Error('API client unavailable');
    }

    const [tasks, projects, dependencies, related, settingsResponse] = await Promise.all([
        apiClient.getTasksTree(),
        apiClient.getProjects(),
        apiClient.getDependencies(),
        apiClient.getRelated().catch(() => []),
        apiClient.getSetting('taskManagerSettings').catch(() => null)
    ]);

    const settingsValue = settingsResponse ? parseSettingValueForImport(settingsResponse.value) : null;
    const relatedMap = {};
    related.forEach((item) => {
        const taskId = item.taskId || item.task_id;
        const relatedId = item.relatedId || item.related_id;
        if (!taskId || !relatedId) return;
        if (!relatedMap[taskId]) {
            relatedMap[taskId] = [];
        }
        if (!relatedMap[taskId].includes(relatedId)) {
            relatedMap[taskId].push(relatedId);
        }
    });

    const exportPayload = {
        version: '1.3',
        exportDate: new Date().toISOString(),
        tasks: tasks,
        projects: projects,
        dependencies: dependencies,
        relatedTasks: relatedMap,
        settings: settingsValue
    };

    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `task-manager-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
}

async function importDataToApi(app, importedData) {
    const apiClient = app.apiClient || window.apiClient;
    if (!apiClient) {
        throw new Error('API client unavailable');
    }

    const wrapStep = async (label, fn) => {
        try {
            return await fn();
        } catch (error) {
            throw new Error(`Import failed (${label}): ${error.message || error}`);
        }
    };

    const currentTasks = await wrapStep('load existing tasks', () => apiClient.getTasks());
    const taskIdsToDelete = currentTasks.map(task => task.id);
    for (const id of taskIdsToDelete) {
        try {
            await wrapStep('delete tasks', () => apiClient.deleteTask(id));
        } catch (error) {
            if (!error || !error.message || !error.message.includes('Not found')) {
                throw error;
            }
        }
    }

    const currentProjects = await wrapStep('load existing projects', () => apiClient.getProjects());
    for (const project of currentProjects) {
        try {
            await wrapStep('delete projects', () => apiClient.deleteProject(project.id));
        } catch (error) {
            if (!error || !error.message || !error.message.includes('Not found')) {
                throw error;
            }
        }
    }

    const currentSettings = await wrapStep('load existing settings', () => apiClient.getSettings());
    for (const setting of currentSettings) {
        try {
            await wrapStep('delete settings', () => apiClient.deleteSetting(setting.key));
        } catch (error) {
            if (!error || !error.message || !error.message.includes('Not found')) {
                throw error;
            }
        }
    }

    const projectIdMap = new Map();
    const importedProjects = Array.isArray(importedData.projects) ? importedData.projects : [];
    for (const project of importedProjects) {
        const newId = getUuidForImport();
        if (project.id) {
            projectIdMap.set(project.id, newId);
        }
        await wrapStep('create projects', () => apiClient.createProject({
            id: newId,
            name: project.name || '',
            color: project.color || '#777777',
            statusColors: project.statusColors || null,
            priorityColors: project.priorityColors || null
        }));
    }

    const importedSettings = importedData.settings || null;
    if (importedSettings) {
        await wrapStep('save settings', () => apiClient.setSetting('taskManagerSettings', importedSettings));
    }

    const taskIdMap = new Map();
    const assignTaskIds = (tasks) => {
        tasks.forEach(task => {
            taskIdMap.set(task.id, getUuidForImport());
            if (task.children && task.children.length > 0) {
                assignTaskIds(task.children);
            }
        });
    };

    const tasks = Array.isArray(importedData.tasks) ? importedData.tasks : [];
    assignTaskIds(tasks);

    const createTasks = async (taskList, parentId = null) => {
        for (let index = 0; index < taskList.length; index++) {
            const task = taskList[index];
            const newId = taskIdMap.get(task.id);
            const mappedProjectId = task.projectId ? projectIdMap.get(task.projectId) || null : null;
            const metadata = task.metadata || {};

            await wrapStep('create tasks', () => apiClient.createTask({
                id: newId,
                title: task.title || '',
                description: task.description || '',
                parentId: parentId,
                projectId: mappedProjectId,
                metadata: {
                    status: metadata.status || 'todo',
                    priority: metadata.priority || 'medium',
                    assignee: metadata.assignee || '',
                    startDate: metadata.startDate || '',
                    endDate: metadata.endDate || '',
                    kanbanOrder: metadata.kanbanOrder ?? null
                },
                sortIndex: index
            }));

            if (task.children && task.children.length > 0) {
                await createTasks(task.children, newId);
            }
        }
    };

    await createTasks(tasks);

    const dependencies = Array.isArray(importedData.dependencies) ? importedData.dependencies : [];
    for (const dependency of dependencies) {
        const oldTaskId = dependency.taskId || dependency.task_id;
        const oldDependsOnId = dependency.dependsOnId || dependency.depends_on_id;
        const newTaskId = taskIdMap.get(oldTaskId);
        const newDependsOnId = taskIdMap.get(oldDependsOnId);
        if (newTaskId && newDependsOnId) {
            await wrapStep('create dependencies', () => apiClient.addDependency(newTaskId, newDependsOnId));
        }
    }

    const relatedTasks = importedData.relatedTasks || {};
    const remappedRelated = {};
    const relatedPairs = new Set();
    Object.keys(relatedTasks).forEach((oldId) => {
        const newId = taskIdMap.get(oldId);
        if (!newId) {
            return;
        }
        const mappedRelated = (relatedTasks[oldId] || [])
            .map((relId) => taskIdMap.get(relId))
            .filter(Boolean);
        remappedRelated[newId] = mappedRelated;
        mappedRelated.forEach((relId) => {
            const key = newId < relId ? `${newId}|${relId}` : `${relId}|${newId}`;
            relatedPairs.add(key);
        });
    });

    for (const key of relatedPairs) {
        const [taskId, relatedId] = key.split('|');
        await wrapStep('create related tasks', () => apiClient.addRelated(taskId, relatedId));
    }

    await wrapStep('reload data', () => loadAppData(apiClient, app.store, app.settings));
    app.store.selectedParents = new Set(app.store.tasks.map(task => task.id));
    app.store.parentFilterInitialized = true;
    app.store.relatedTasks = new Map(Object.entries(remappedRelated));
    app.store.saveState();
    app.store.notify();
}
