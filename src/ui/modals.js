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
    apiKeySettingsApp = app;
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
    bindApiKeyHandlers(app);
    refreshAllProviderKeyStatus();
    refreshProviderKeyStatus(getCurrentProvider());

    // Show modal
    document.getElementById('globalSettingsModal').classList.add('visible');
}

function closeSettingsModal() {
    document.getElementById('globalSettingsModal').classList.remove('visible');
    apiKeySettingsApp = null;
}

function populateSettingsModal(app) {
    // Behavior tab
    document.getElementById('setting-filterToggleBehavior').checked = app.settings.get('filterToggleBehavior');
    document.getElementById('setting-autoSave').checked = app.settings.get('autoSave');
    document.getElementById('setting-disableTooltips').checked = app.settings.get('disableTooltips');
    document.getElementById('setting-defaultView').value = app.settings.get('defaultView');
    const telemetryToggle = document.getElementById('setting-telemetryEnabled');
    if (telemetryToggle) {
        telemetryToggle.checked = app.settings.get('telemetry.enabled');
    }
    const requireTestsToggle = document.getElementById('setting-requireTests');
    if (requireTestsToggle) {
        requireTestsToggle.checked = app.settings.get('developer.requireTests');
    }

    const providerSelect = document.getElementById('setting-providerSelect');
    const providerKeyInput = document.getElementById('setting-providerKey');
    const providerKeyStatus = document.getElementById('setting-providerKeyStatus');
    const providerKeyBadge = document.getElementById('setting-providerKeyBadge');
    const providerKeyHelp = document.getElementById('setting-providerKeyHelp');
    const providerKeyWarning = document.getElementById('setting-providerKeyWarning');
    const providerKeyOverride = document.getElementById('setting-providerKeyOverride');
    const providerKeyReveal = document.getElementById('setting-providerKeyReveal');
    const providerKeyLastValidated = document.getElementById('setting-providerKeyLastValidated');
    const selectedProvider = app.settings.get('apiKeys.selectedProvider') || 'openai';

    if (providerSelect) {
        providerSelect.value = selectedProvider;
    }
    if (providerKeyInput) {
        providerKeyInput.value = '';
        providerKeyInput.placeholder = getProviderPlaceholder(selectedProvider);
    }
    if (providerKeyHelp) {
        providerKeyHelp.textContent = getProviderHelp(selectedProvider);
    }
    if (providerKeyWarning) {
        providerKeyWarning.textContent = '';
    }
    if (providerKeyOverride) {
        providerKeyOverride.checked = getProviderOverride(selectedProvider);
    }
    if (providerKeyReveal) {
        providerKeyReveal.checked = false;
    }
    if (providerKeyStatus) {
        providerKeyStatus.textContent = formatProviderStatus(selectedProvider, getProviderStatus(selectedProvider));
    }
    if (providerKeyBadge) {
        providerKeyBadge.textContent = ApiKeyUtils.formatProviderBadge(getProviderStatus(selectedProvider));
    }
    if (providerKeyLastValidated) {
        providerKeyLastValidated.textContent = ApiKeyUtils.formatLastValidated(getProviderLastValidated(selectedProvider));
    }
    updateApiKeyButtons();
}

function saveSettingsModal(app) {
    // Save behavior settings
    app.settings.set('filterToggleBehavior', document.getElementById('setting-filterToggleBehavior').checked);
    app.settings.set('autoSave', document.getElementById('setting-autoSave').checked);
    app.settings.set('disableTooltips', document.getElementById('setting-disableTooltips').checked);
    app.settings.set('defaultView', document.getElementById('setting-defaultView').value);
    const telemetryToggle = document.getElementById('setting-telemetryEnabled');
    if (telemetryToggle) {
        app.settings.set('telemetry.enabled', telemetryToggle.checked);
    }
    const requireTestsToggle = document.getElementById('setting-requireTests');
    if (requireTestsToggle) {
        app.settings.set('developer.requireTests', requireTestsToggle.checked);
    }

    app.applyTooltipSetting();

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

function bindApiKeyHandlers(app) {
    const providerSelect = document.getElementById('setting-providerSelect');
    const providerKeyInput = document.getElementById('setting-providerKey');
    const validateBtn = document.getElementById('validateProviderKey');
    const saveBtn = document.getElementById('saveProviderKey');
    const deleteBtn = document.getElementById('deleteProviderKey');
    const revalidateBtn = document.getElementById('revalidateProviderKeys');
    const providerKeyOverride = document.getElementById('setting-providerKeyOverride');
    const providerKeyReveal = document.getElementById('setting-providerKeyReveal');

    if (providerSelect) {
        providerSelect.onchange = () => {
            const provider = getCurrentProvider();
            if (app) {
                app.settings.set('apiKeys.selectedProvider', provider);
            }
            if (providerKeyInput) {
                providerKeyInput.value = '';
                providerKeyInput.placeholder = getProviderPlaceholder(provider);
            }
            const providerKeyHelp = document.getElementById('setting-providerKeyHelp');
            if (providerKeyHelp) {
                providerKeyHelp.textContent = getProviderHelp(provider);
            }
            const providerKeyWarning = document.getElementById('setting-providerKeyWarning');
            if (providerKeyWarning) {
                providerKeyWarning.textContent = '';
            }
            if (providerKeyOverride) {
                providerKeyOverride.checked = getProviderOverride(provider);
            }
            if (providerKeyReveal && providerKeyInput) {
                providerKeyReveal.checked = false;
                providerKeyInput.type = 'password';
            }
            const status = getProviderStatus(provider);
            setProviderStatus(provider, status);
            setProviderLastValidated(provider, getProviderLastValidated(provider));
            updateApiKeyButtons();
            refreshProviderKeyStatus(provider);
        };
    }
    if (providerKeyInput) {
        providerKeyInput.oninput = () => updateApiKeyButtons();
    }
    if (providerKeyOverride) {
        providerKeyOverride.onchange = () => {
            setProviderOverride(getCurrentProvider(), providerKeyOverride.checked);
            updateApiKeyButtons();
        };
    }
    if (providerKeyReveal && providerKeyInput) {
        providerKeyReveal.onchange = () => {
            providerKeyInput.type = providerKeyReveal.checked ? 'text' : 'password';
        };
    }
    if (validateBtn) {
        validateBtn.onclick = () => handleApiKeyAction('validate');
    }
    if (saveBtn) {
        saveBtn.onclick = () => handleApiKeyAction('save');
    }
    if (deleteBtn) {
        deleteBtn.onclick = () => handleApiKeyAction('delete');
    }
    if (revalidateBtn) {
        revalidateBtn.onclick = () => {
            revalidateAllProviderKeys().catch((error) => {
                console.warn('Re-validation failed:', error);
                showToast('Re-validation failed');
            });
        };
    }
}

function updateApiKeyButtons() {
    const providerKeyInput = document.getElementById('setting-providerKey');
    const validateBtn = document.getElementById('validateProviderKey');
    const saveBtn = document.getElementById('saveProviderKey');
    const deleteBtn = document.getElementById('deleteProviderKey');
    const revalidateBtn = document.getElementById('revalidateProviderKeys');
    const providerKeyOverride = document.getElementById('setting-providerKeyOverride');
    const hasKey = providerKeyInput && providerKeyInput.value.trim().length > 0;
    const provider = getCurrentProvider();
    const validation = ApiKeyUtils.validateProviderKey(provider, providerKeyInput ? providerKeyInput.value.trim() : '');
    updateProviderKeyWarning(validation);
    const allowInvalid = providerKeyOverride && providerKeyOverride.checked;
    const hasStoredKey = providerHasStoredKey(provider);
    const hasAnyStoredKeys = providerHasAnyStoredKeys();

    if (validateBtn) {
        validateBtn.disabled = !hasStoredKey;
    }
    if (saveBtn) {
        saveBtn.disabled = !hasKey || (!validation.isValid && !allowInvalid);
    }
    if (deleteBtn) {
        deleteBtn.disabled = !hasStoredKey;
    }
    if (revalidateBtn) {
        revalidateBtn.disabled = !hasAnyStoredKeys;
    }
}

function handleApiKeyAction(action) {
    const providerKeyInput = document.getElementById('setting-providerKey');
    const keyValue = providerKeyInput ? providerKeyInput.value.trim() : '';
    const provider = getCurrentProvider();

    if (action !== 'delete' && !keyValue) {
        showToast('Enter a key first');
        return;
    }

    if (action === 'validate') {
        if (!providerHasStoredKey(provider)) {
            showToast('Save a key first');
            return;
        }
        if (!window.electronAPI || typeof window.electronAPI.validateProviderKey !== 'function') {
            setProviderStatus(provider, 'Validation unavailable');
            showToast('Validation unavailable');
            return;
        }
        setProviderStatus(provider, 'Validating...');
        window.electronAPI.validateProviderKey(provider).then((result) => {
            setProviderLastValidated(provider, new Date().toISOString());
            if (result && result.ok) {
                setProviderStatus(provider, 'Valid');
                updateProviderKeyHelpText(provider, true);
                showToast('Key validated');
            } else {
                const status = getValidationErrorMessage(result);
                setProviderStatus(provider, status);
                setProviderKeyHelpMessage(getValidationHelpMessage(result, provider), provider);
                showToast('Key validation failed');
            }
            updateApiKeyButtons();
        });
        return;
    }

    if (action === 'save') {
        if (!window.electronAPI || typeof window.electronAPI.setProviderKey !== 'function') {
            setProviderStatus(provider, 'Storage unavailable');
            showToast('Key storage unavailable');
            return;
        }
        window.electronAPI.setProviderKey(provider, keyValue).then((result) => {
            if (result && result.ok) {
                if (providerKeyInput) {
                    providerKeyInput.value = '';
                }
                setProviderHasStoredKey(provider, true);
                setProviderStatus(provider, 'Stored');
                updateProviderKeyHelpText(provider, true);
                updateApiKeyButtons();
                showToast('Key saved to keychain');
            } else {
                setProviderStatus(provider, getStorageErrorMessage(result));
                setProviderKeyHelpMessage(getStorageHelpMessage(result, provider), provider);
                showToast('Failed to save key');
            }
        });
        return;
    }

    if (action === 'delete') {
        if (!window.electronAPI || typeof window.electronAPI.deleteProviderKey !== 'function') {
            setProviderStatus(provider, 'Storage unavailable');
            showToast('Key storage unavailable');
            return;
        }
        if (!confirm(`Remove stored key for ${providerLabels[provider] || provider}?`)) {
            return;
        }
        window.electronAPI.deleteProviderKey(provider).then((result) => {
            if (result && result.ok) {
                setProviderHasStoredKey(provider, false);
                setProviderStatus(provider, 'Not configured');
                setProviderLastValidated(provider, null);
                updateProviderKeyHelpText(provider, false);
                updateApiKeyButtons();
                showToast('Key removed');
            } else {
                setProviderStatus(provider, getStorageErrorMessage(result));
                setProviderKeyHelpMessage(getStorageHelpMessage(result, provider), provider);
                showToast('Failed to remove key');
            }
        });
    }
}

let apiKeySettingsApp = null;
const providerStorageById = {};

const providerLabels = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    openrouter: 'OpenRouter',
    mistral: 'Mistral',
};

const providerPlaceholders = {
    openai: 'sk-...',
    anthropic: 'sk-ant-...',
    google: 'AIza...',
    openrouter: 'sk-or-...',
    mistral: 'sk-...',
};

const providerHelpText = {
    openai: 'Keys are not saved yet in this build.',
    anthropic: 'Keys are not saved yet in this build.',
    google: 'Use a Google AI Studio key. Keys are not saved yet in this build.',
    openrouter: 'Keys are not saved yet in this build.',
    mistral: 'Keys are not saved yet in this build.',
};

function getCurrentProvider() {
    const providerSelect = document.getElementById('setting-providerSelect');
    return providerSelect ? providerSelect.value : 'openai';
}

function getProviderPlaceholder(provider) {
    return providerPlaceholders[provider] || 'Paste your key';
}

function getProviderHelp(provider) {
    return providerHelpText[provider] || 'Keys are not saved yet in this build.';
}

function getAllProviders() {
    return Object.keys(providerLabels);
}

function updateProviderKeyWarning(validation) {
    const providerKeyWarning = document.getElementById('setting-providerKeyWarning');
    if (!providerKeyWarning) {
        return;
    }
    providerKeyWarning.textContent = validation.message;
}

function formatProviderStatus(provider, status) {
    const label = providerLabels[provider] || provider;
    return `${label}: ${status}`;
}

function getProviderStatus(provider) {
    return getApiKeySetting(`apiKeys.statuses.${provider}`, 'Not configured');
}

function getProviderLastValidated(provider) {
    return getApiKeySetting(`apiKeys.lastValidatedAt.${provider}`, null);
}

function getProviderOverride(provider) {
    return getApiKeySetting(`apiKeys.overrides.${provider}`, false);
}

function setProviderOverride(provider, value) {
    setApiKeySetting(`apiKeys.overrides.${provider}`, value);
}

function setProviderStatus(provider, status) {
    setApiKeySetting(`apiKeys.statuses.${provider}`, status);
    if (isCurrentProvider(provider)) {
        const providerKeyStatus = document.getElementById('setting-providerKeyStatus');
        const providerKeyBadge = document.getElementById('setting-providerKeyBadge');
        if (providerKeyStatus) {
            providerKeyStatus.textContent = formatProviderStatus(provider, status);
        }
        if (providerKeyBadge) {
            providerKeyBadge.textContent = ApiKeyUtils.formatProviderBadge(status);
        }
    }
}

function setProviderLastValidated(provider, value) {
    setApiKeySetting(`apiKeys.lastValidatedAt.${provider}`, value);
    if (isCurrentProvider(provider)) {
        const providerKeyLastValidated = document.getElementById('setting-providerKeyLastValidated');
        if (providerKeyLastValidated) {
            providerKeyLastValidated.textContent = ApiKeyUtils.formatLastValidated(value);
        }
    }
}

function isCurrentProvider(provider) {
    return getCurrentProvider() === provider;
}

function providerHasStoredKey(provider) {
    return providerStorageById[provider] || false;
}

function setProviderHasStoredKey(provider, value) {
    providerStorageById[provider] = value;
}

function providerHasAnyStoredKeys() {
    return Object.values(providerStorageById).some(Boolean);
}

function refreshProviderKeyStatus(provider) {
    if (!window.electronAPI || typeof window.electronAPI.getProviderKey !== 'function') {
        setProviderStatus(provider, 'Storage unavailable');
        return;
    }
    window.electronAPI.getProviderKey(provider).then((result) => {
        if (result && result.ok) {
            const hasKey = !!result.hasKey;
            const existingStatus = getProviderStatus(provider);
            setProviderHasStoredKey(provider, hasKey);
            if (!hasKey) {
                setProviderStatus(provider, 'Not configured');
            } else if (existingStatus !== 'Valid' && existingStatus !== 'Invalid') {
                setProviderStatus(provider, 'Stored');
            }
            updateProviderKeyHelpText(provider, hasKey);
            updateApiKeyButtons();
        } else {
            setProviderHasStoredKey(provider, false);
            setProviderStatus(provider, getStorageErrorMessage(result));
            setProviderKeyHelpMessage(getStorageHelpMessage(result, provider), provider);
            updateApiKeyButtons();
        }
    });
}

function refreshAllProviderKeyStatus() {
    if (!window.electronAPI || typeof window.electronAPI.getProviderKey !== 'function') {
        setProviderStatus(getCurrentProvider(), 'Storage unavailable');
        return;
    }
    const providers = getAllProviders();
    Promise.all(
        providers.map((provider) =>
            window.electronAPI.getProviderKey(provider).then((result) => {
                if (result && result.ok) {
                    const hasKey = !!result.hasKey;
                    const existingStatus = getProviderStatus(provider);
                    setProviderHasStoredKey(provider, hasKey);
                    if (!hasKey) {
                        setProviderStatus(provider, 'Not configured');
                    } else if (existingStatus !== 'Valid' && existingStatus !== 'Invalid') {
                        setProviderStatus(provider, 'Stored');
                    }
                    updateProviderKeyHelpText(provider, hasKey);
                } else {
                    setProviderHasStoredKey(provider, false);
                    setProviderStatus(provider, getStorageErrorMessage(result));
                    setProviderKeyHelpMessage(getStorageHelpMessage(result, provider), provider);
                }
            })
        )
    ).finally(() => {
        updateApiKeyButtons();
    });
}

function updateProviderKeyHelpText(provider, hasStoredKey) {
    if (!isCurrentProvider(provider)) {
        return;
    }
    const providerKeyHelp = document.getElementById('setting-providerKeyHelp');
    if (!providerKeyHelp) {
        return;
    }
    providerKeyHelp.textContent = hasStoredKey
        ? 'Key stored in keychain. Saving will overwrite it.'
        : getProviderHelp(provider);
}

function setProviderKeyHelpMessage(message, provider = getCurrentProvider()) {
    if (!isCurrentProvider(provider)) {
        return;
    }
    const providerKeyHelp = document.getElementById('setting-providerKeyHelp');
    if (!providerKeyHelp) {
        return;
    }
    providerKeyHelp.textContent = message;
}

function getStorageErrorMessage(result) {
    const error = result && result.error ? result.error : 'Storage unavailable';
    if (error === 'encryption-unavailable') {
        return 'Keychain unavailable';
    }
    if (error === 'decrypt-failed') {
        return 'Keychain unreadable';
    }
    if (error === 'invalid-provider' || error === 'invalid-value') {
        return 'Invalid key data';
    }
    return 'Storage unavailable';
}

function getValidationErrorMessage(result) {
    const error = result && result.error ? result.error : 'validation-failed';
    if (error === 'invalid-key') {
        return 'Invalid';
    }
    if (error === 'missing-key') {
        return 'Not configured';
    }
    if (error === 'timeout') {
        return 'Validation timed out';
    }
    if (error === 'network-error') {
        return 'Network error';
    }
    if (error === 'unsupported-provider') {
        return 'Validation unsupported';
    }
    if (error === 'encryption-unavailable') {
        return 'Keychain unavailable';
    }
    if (error === 'decrypt-failed') {
        return 'Keychain unreadable';
    }
    return 'Validation failed';
}

function getValidationHelpMessage(result, provider) {
    const error = result && result.error ? result.error : 'validation-failed';
    if (error === 'invalid-key') {
        return 'Stored key was rejected by the provider.';
    }
    if (error === 'missing-key') {
        return 'Save a key before validating.';
    }
    if (error === 'timeout') {
        return 'Validation timed out. Try again.';
    }
    if (error === 'network-error') {
        return 'Network error while contacting the provider.';
    }
    if (error === 'unsupported-provider') {
        return 'Validation is only wired for OpenAI, Anthropic, and Google.';
    }
    if (error === 'encryption-unavailable') {
        return 'Keychain unavailable on this device.';
    }
    if (error === 'decrypt-failed') {
        return 'Stored key could not be read. Remove and re-save.';
    }
    return getProviderHelp(provider);
}

function getStorageHelpMessage(result, provider) {
    const error = result && result.error ? result.error : null;
    if (error === 'encryption-unavailable') {
        return 'Keychain unavailable on this device.';
    }
    if (error === 'decrypt-failed') {
        return 'Stored key could not be read. Remove and re-save.';
    }
    if (error === 'invalid-provider' || error === 'invalid-value') {
        return 'Key data was invalid. Try re-entering.';
    }
    return getProviderHelp(provider);
}

async function revalidateAllProviderKeys() {
    if (!window.electronAPI || typeof window.electronAPI.validateProviderKey !== 'function') {
        showToast('Validation unavailable');
        return;
    }

    const providers = getAllProviders();
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const provider of providers) {
        if (!providerHasStoredKey(provider)) {
            skippedCount += 1;
            continue;
        }
        const result = await window.electronAPI.validateProviderKey(provider);
        setProviderLastValidated(provider, new Date().toISOString());
        if (result && result.ok) {
            setProviderStatus(provider, 'Valid');
            updateProviderKeyHelpText(provider, true);
            successCount += 1;
        } else {
            const status = getValidationErrorMessage(result);
            setProviderStatus(provider, status);
            setProviderKeyHelpMessage(getValidationHelpMessage(result, provider), provider);
            failureCount += 1;
        }
    }

    const summary = `Validated ${successCount} ok, ${failureCount} failed, ${skippedCount} skipped`;
    showToast(summary);
    updateApiKeyButtons();
}

function getApiKeySetting(path, fallback) {
    if (!apiKeySettingsApp || !apiKeySettingsApp.settings) {
        return fallback;
    }
    const value = apiKeySettingsApp.settings.get(path);
    return value === undefined ? fallback : value;
}

function setApiKeySetting(path, value) {
    if (!apiKeySettingsApp || !apiKeySettingsApp.settings) {
        return;
    }
    apiKeySettingsApp.settings.set(path, value);
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
                    kanbanOrder: metadata.kanbanOrder ?? null,
                    containerColor: metadata.containerColor || ''
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateApiKeyButtons,
        bindApiKeyHandlers,
        handleApiKeyAction,
        setProviderHasStoredKey,
        providerHasStoredKey,
        providerHasAnyStoredKeys,
        refreshProviderKeyStatus,
        refreshAllProviderKeyStatus,
        setProviderStatus,
        setProviderLastValidated,
        getProviderStatus,
        getProviderLastValidated,
        getProviderOverride,
        setProviderOverride,
        populateSettingsModal,
    };
}
