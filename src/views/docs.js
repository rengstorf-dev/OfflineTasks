function renderDocsView(app, container) {
    const PROJECT_DELIMITER = '\n\n---\n\n';

    const normalizeLineEndings = (text) => (text || '').replace(/\r\n/g, '\n');
    const escapeForTextarea = (text) =>
        (text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

    const trimBlankEdges = (text) => {
        const lines = normalizeLineEndings(text).split('\n');
        while (lines.length > 0 && lines[0].trim() === '') {
            lines.shift();
        }
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        return lines.join('\n');
    };

    const normalizeDocsSections = (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        return { ...value };
    };

    const getProjectsForDocs = () => {
        const projects = app.store.getProjects();
        const mode = app.store.projectViewMode;

        if (mode === 'project') {
            if (!app.store.selectedProjectId || app.store.selectedProjectId === 'unassigned') {
                return [];
            }
            return projects.filter((project) => project.id === app.store.selectedProjectId);
        }

        if (mode === 'multi') {
            if (app.store.selectedProjectIds.size === 0) {
                return projects;
            }
            return projects.filter((project) => app.store.selectedProjectIds.has(project.id));
        }

        return projects;
    };

    const collectTaskEntries = (tasks, depth = 0, entries = []) => {
        tasks.forEach((task) => {
            entries.push({
                id: task.id,
                title: task.title,
                depth
            });
            if (task.children && task.children.length > 0) {
                collectTaskEntries(task.children, depth + 1, entries);
            }
        });
        return entries;
    };

    const buildTaskSectionsMarkdown = (tasks, docsSections, depth = 0) => {
        const lines = [];
        tasks.forEach((task) => {
            const level = Math.min(depth + 2, 6);
            lines.push(`${'#'.repeat(level)} ${task.title}`);
            lines.push('');

            const content = normalizeLineEndings(docsSections[task.id] || '').replace(/\s+$/g, '');
            if (content) {
                lines.push(content);
                lines.push('');
            } else {
                lines.push('');
            }

            if (task.children && task.children.length > 0) {
                lines.push(buildTaskSectionsMarkdown(task.children, docsSections, depth + 1));
            }
        });

        return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    const buildProjectMarkdown = (project, rootTasks, docsSections, includeProjectHeading = true) => {
        const lines = [];

        if (includeProjectHeading) {
            lines.push(`# ${project.name}`);
            lines.push('');
        }

        const intro = trimBlankEdges(docsSections._intro || '');
        if (intro) {
            lines.push(intro);
            lines.push('');
        }

        const taskMarkdown = buildTaskSectionsMarkdown(rootTasks, docsSections);
        if (taskMarkdown) {
            lines.push(taskMarkdown);
        }

        return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
    };

    const splitProjectBlocks = (text, count) => {
        if (count <= 1) {
            return [text || ''];
        }

        return normalizeLineEndings(text).split(PROJECT_DELIMITER);
    };

    const parseProjectBlock = (blockText) => {
        const lines = normalizeLineEndings(blockText).split('\n');
        let index = 0;

        while (index < lines.length && lines[index].trim() === '') {
            index += 1;
        }

        if (index < lines.length && /^#\s+/.test(lines[index])) {
            index += 1;
        }

        const bodyLines = lines.slice(index);
        const headingIndexes = [];

        bodyLines.forEach((line, idx) => {
            if (/^#{2,6}\s+/.test(line)) {
                headingIndexes.push(idx);
            }
        });

        if (headingIndexes.length === 0) {
            return {
                intro: trimBlankEdges(bodyLines.join('\n')),
                sections: []
            };
        }

        const intro = trimBlankEdges(bodyLines.slice(0, headingIndexes[0]).join('\n'));
        const sections = [];

        headingIndexes.forEach((headingStart, idx) => {
            const contentStart = headingStart + 1;
            const contentEnd = idx < headingIndexes.length - 1 ? headingIndexes[idx + 1] : bodyLines.length;
            const content = trimBlankEdges(bodyLines.slice(contentStart, contentEnd).join('\n'));
            sections.push(content);
        });

        return { intro, sections };
    };

    const filteredRoots = app.store.getFilteredTasks();
    const docsProjects = getProjectsForDocs();

    if (docsProjects.length === 0) {
        container.innerHTML = `
            <div class="docs-view">
                <div class="docs-empty-state">Select a named project to edit docs. Unassigned tasks are excluded from Docs mode.</div>
            </div>
        `;
        app.saveDocsDraft = null;
        return;
    }

    const projectContexts = docsProjects.map((project) => {
        const visibleRoots = filteredRoots.filter((task) => task.projectId === project.id);
        const allRoots = app.store.tasks.filter((task) => task.projectId === project.id);
        const docsSections = normalizeDocsSections(project.docsSections);
        return { project, visibleRoots, allRoots, docsSections };
    });

    const combinedMarkdown = projectContexts
        .map(({ project, visibleRoots, docsSections }) => buildProjectMarkdown(project, visibleRoots, docsSections, true))
        .join(PROJECT_DELIMITER)
        .trimEnd();

    container.innerHTML = `
        <div class="docs-view">
            <div class="docs-toolbar">
                <div class="docs-meta">
                    <span class="docs-meta-label">Project Docs</span>
                    <span class="docs-meta-value">${projectContexts.length} project${projectContexts.length === 1 ? '' : 's'}</span>
                </div>
                <button class="docs-save-btn" id="docsSaveBtn">Save Docs</button>
            </div>
            <textarea class="docs-editor" id="docsEditor" spellcheck="false">${escapeForTextarea(combinedMarkdown)}</textarea>
        </div>
    `;

    const editor = container.querySelector('#docsEditor');
    const saveBtn = container.querySelector('#docsSaveBtn');

    const getProjectPayload = (project) => ({
        name: project.name,
        color: project.color,
        statusColors: project.statusColors,
        priorityColors: project.priorityColors,
        teamIds: project.teamIds || [],
        docsMarkdown: project.docsMarkdown || '',
        docsSections: project.docsSections || {}
    });

    const saveDraft = () => {
        const blocks = splitProjectBlocks(editor.value, projectContexts.length);
        const apiCalls = [];
        let changed = false;

        projectContexts.forEach((ctx, idx) => {
            const blockText = blocks[idx];
            if (projectContexts.length > 1 && blockText === undefined) {
                return;
            }
            const parsed = parseProjectBlock(blockText || '');
            const existingSections = normalizeDocsSections(ctx.project.docsSections);
            const nextSections = { ...existingSections };
            nextSections._intro = parsed.intro || '';

            const visibleEntries = collectTaskEntries(ctx.visibleRoots);
            visibleEntries.forEach((entry, sectionIdx) => {
                if (parsed.sections[sectionIdx] !== undefined) {
                    nextSections[entry.id] = parsed.sections[sectionIdx];
                }
            });

            const allEntries = collectTaskEntries(ctx.allRoots);
            const allTaskIds = new Set(allEntries.map((entry) => entry.id));
            Object.keys(nextSections).forEach((key) => {
                if (key === '_intro') return;
                if (!allTaskIds.has(key)) {
                    delete nextSections[key];
                }
            });

            const canonicalMarkdown = buildProjectMarkdown(ctx.project, ctx.allRoots, nextSections, false);
            const sectionsChanged = JSON.stringify(nextSections) !== JSON.stringify(existingSections);
            const markdownChanged = canonicalMarkdown !== (ctx.project.docsMarkdown || '');

            if (!sectionsChanged && !markdownChanged) {
                return;
            }

            changed = true;
            ctx.project.docsSections = nextSections;
            ctx.project.docsMarkdown = canonicalMarkdown;

            if (app.apiClient) {
                apiCalls.push(
                    app.apiClient.updateProject(ctx.project.id, getProjectPayload(ctx.project)).catch((error) => {
                        app.apiClient.reportError(error, 'Docs save failed');
                        throw error;
                    })
                );
            }
        });

        if (!changed) {
            app.showToast('No docs changes to save');
            return;
        }

        const finalize = () => {
            app.store.saveState();
            app.showToast('Docs saved');
            app.render();
        };

        if (apiCalls.length === 0) {
            finalize();
            return;
        }

        saveBtn.disabled = true;
        Promise.all(apiCalls)
            .then(() => {
                finalize();
            })
            .catch(() => {
                saveBtn.disabled = false;
            });
    };

    app.saveDocsDraft = saveDraft;

    saveBtn.addEventListener('click', () => {
        saveDraft();
    });

    editor.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveDraft();
        }
    });
}
