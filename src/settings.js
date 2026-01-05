// Settings Manager - Global and View-Specific Settings
        class Settings {
            constructor(apiClient = null) {
                this.storageKey = 'taskManagerSettings';
                this.apiClient = apiClient;

                // Default settings
                this.defaults = {
                    // Global settings
                    filterToggleBehavior: true,  // true = can deselect filters, false = traditional radio
                    mindMapLineStyle: 'straight',
                    showDescriptionsOnNodes: false,
                    defaultView: 'outline',
                    darkMode: false,
                    autoSave: true,
                    disableTooltips: false,
                    apiKeys: {
                        selectedProvider: 'openai',
                        overrides: {},
                        statuses: {},
                        lastValidatedAt: {}
                    },
                    telemetry: {
                        enabled: false
                    },
                    developer: {
                        requireTests: true
                    },
                    teams: [],
                    projectTeams: {},

                    // View-specific settings
                    outline: {
                        showDescriptions: false,
                        indentSize: 20,
                        checkboxMode: false,
                        sortBy: 'default'
                    },
                    kanban: {
                        cardSize: 'normal',
                        columnOrder: ['todo', 'in-progress', 'review', 'done'],
                        showMetadata: true
                    },
                    gantt: {
                        dateRange: 'month',
                        showDependencyLines: false,
                        zoomLevel: 1
                    },
                    mindmap: {
                        layoutMode: 'tree',
                        nodeSize: 'medium'
                    }
                };

                // Load defaults; API load is async via loadFromApi()
                this.settings = this.loadDefaults();
            }

            setApiClient(apiClient) {
                this.apiClient = apiClient;
            }

            loadDefaults() {
                return JSON.parse(JSON.stringify(this.defaults));
            }

            async loadFromApi(apiClient = this.apiClient, parseSettingValue) {
                if (!apiClient) {
                    return;
                }

                try {
                    const response = await apiClient.getSetting(this.storageKey);
                    const parsed = parseSettingValue ? parseSettingValue(response.value) : response.value;
                    if (parsed && typeof parsed === 'object') {
                        this.settings = this.mergeDeep(this.defaults, parsed);
                    }
                } catch (e) {
                    if (e && e.message && e.message.includes('Not found')) {
                        return;
                    }
                    console.warn('Failed to load settings from API:', e);
                }
            }

            save() {
                if (!this.apiClient) {
                    console.warn('Settings save skipped: API client not available');
                    return;
                }
                this.apiClient.setSetting(this.storageKey, this.settings).catch((e) => {
                    console.warn('Failed to save settings to API:', e);
                });
            }

            get(path) {
                const keys = path.split('.');
                let value = this.settings;
                for (const key of keys) {
                    if (value && typeof value === 'object') {
                        value = value[key];
                    } else {
                        return undefined;
                    }
                }
                return value;
            }

            set(path, value) {
                const keys = path.split('.');
                let obj = this.settings;
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    if (!obj[key] || typeof obj[key] !== 'object') {
                        obj[key] = {};
                    }
                    obj = obj[key];
                }
                obj[keys[keys.length - 1]] = value;
                this.save();
            }

            reset() {
                this.settings = JSON.parse(JSON.stringify(this.defaults));
                this.save();
            }

            mergeDeep(target, source) {
                const result = JSON.parse(JSON.stringify(target));
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        result[key] = this.mergeDeep(result[key] || {}, source[key]);
                    } else {
                        result[key] = source[key];
                    }
                }
                return result;
            }
        }
