class ApiClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://127.0.0.1:3123';
        this.token = null;
        this.onError = options.onError || null;
    }

    async resolveToken() {
        if (this.token) {
            return this.token;
        }

        if (window.electronAPI && typeof window.electronAPI.getToken === 'function') {
            const token = window.electronAPI.getToken();
            if (token) {
                this.token = token;
                return token;
            }
        }

        return null;
    }

    async request(method, path, body, options = {}) {
        const token = await this.resolveToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeoutMs = options.timeoutMs;
        let timeoutId = null;

        if (controller && typeof timeoutMs === 'number' && timeoutMs > 0) {
            timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        }

        let response;
        try {
            response = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller ? controller.signal : undefined
            });
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }

        const isJson = response.headers.get('content-type')?.includes('application/json');
        const payload = isJson ? await response.json() : null;

        if (!response.ok) {
            const message = payload?.error || payload?.message || 'Request failed';
            const error = new Error(`${method} ${path}: ${message}`);
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload;
    }

    formatError(error, context) {
        const message = error && error.message ? error.message : 'Request failed';
        return context ? `${context}: ${message}` : message;
    }

    reportError(error, context, options = {}) {
        const message = this.formatError(error, context);
        console.warn(message, error);
        if (options.silent) {
            return;
        }
        if (this.onError) {
            this.onError(message, error);
            return;
        }
        if (typeof showToast === 'function') {
            showToast(message);
        }
    }

    async getHealth() {
        return this.request('GET', '/health', null, { timeoutMs: 3000 });
    }

    async getProjects() {
        const data = await this.request('GET', '/projects');
        return data.projects || [];
    }

    async createProject(project) {
        const data = await this.request('POST', '/projects', project);
        return data.project;
    }

    async updateProject(id, updates) {
        const data = await this.request('PATCH', `/projects/${id}`, updates);
        return data.project;
    }

    async deleteProject(id) {
        await this.request('DELETE', `/projects/${id}`);
    }

    async getTasks() {
        const data = await this.request('GET', '/tasks');
        return data.tasks || [];
    }

    async getTasksTree() {
        const data = await this.request('GET', '/tasks/tree');
        return data.tasks || [];
    }

    async createTask(task) {
        const data = await this.request('POST', '/tasks', task);
        return data.task;
    }

    async updateTask(id, updates) {
        const data = await this.request('PATCH', `/tasks/${id}`, updates);
        return data.task;
    }

    async deleteTask(id) {
        await this.request('DELETE', `/tasks/${id}`);
    }

    async getDependencies() {
        const data = await this.request('GET', '/dependencies');
        return data.dependencies || [];
    }

    async addDependency(taskId, dependsOnId) {
        await this.request('POST', '/dependencies', { taskId, dependsOnId });
    }

    async removeDependency(taskId, dependsOnId) {
        await this.request('DELETE', '/dependencies', { taskId, dependsOnId });
    }

    async getRelated() {
        const data = await this.request('GET', '/related');
        return data.related || [];
    }

    async addRelated(taskId, relatedId) {
        await this.request('POST', '/related', { taskId, relatedId });
    }

    async removeRelated(taskId, relatedId) {
        await this.request('DELETE', '/related', { taskId, relatedId });
    }

    async getSettings() {
        const data = await this.request('GET', '/settings');
        return data.settings || [];
    }

    async getSetting(key) {
        return this.request('GET', `/settings/${encodeURIComponent(key)}`);
    }

    async setSetting(key, value) {
        const data = await this.request('PUT', `/settings/${encodeURIComponent(key)}`, {
            value
        });
        return data.setting;
    }

    async deleteSetting(key) {
        await this.request('DELETE', `/settings/${encodeURIComponent(key)}`);
    }
}

window.apiClient = new ApiClient();
