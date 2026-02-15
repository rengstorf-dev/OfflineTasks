function renderDocsView(app, container) {
    const PROJECT_DELIMITER = '\n\n---\n\n';

    const normalizeLineEndings = (text) => (text || '').replace(/\r\n/g, '\n');

    const escapeHtml = (text) =>
        (text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

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

    const renderInlineMarkdown = (text) => {
        let html = escapeHtml(text || '');

        const codeTokens = [];
        html = html.replace(/`([^`]+)`/g, (_, code) => {
            const token = `@@CODE_${codeTokens.length}@@`;
            codeTokens.push(`<code>${code}</code>`);
            return token;
        });

        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
            return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        });

        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^*])\*(?!\*)([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

        codeTokens.forEach((codeHtml, index) => {
            html = html.replace(`@@CODE_${index}@@`, codeHtml);
        });

        return html;
    };

    const renderMarkdown = (text) => {
        const lines = normalizeLineEndings(text).split('\n');
        const html = [];

        let paragraphLines = [];
        let listType = null;
        let listItems = [];
        let inFence = false;
        let fenceLang = '';
        let fenceLines = [];

        const flushParagraph = () => {
            if (paragraphLines.length === 0) return;
            const content = renderInlineMarkdown(paragraphLines.join(' '));
            html.push(`<p>${content}</p>`);
            paragraphLines = [];
        };

        const flushList = () => {
            if (!listType || listItems.length === 0) return;
            const tag = listType === 'ordered' ? 'ol' : 'ul';
            html.push(`<${tag}>${listItems.map((item) => `<li>${item}</li>`).join('')}</${tag}>`);
            listType = null;
            listItems = [];
        };

        const flushFence = () => {
            if (!inFence) return;
            const languageClass = fenceLang ? ` class="language-${escapeHtml(fenceLang)}"` : '';
            html.push(`<pre><code${languageClass}>${escapeHtml(fenceLines.join('\n'))}</code></pre>`);
            inFence = false;
            fenceLang = '';
            fenceLines = [];
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (inFence) {
                if (/^```/.test(line.trim())) {
                    flushFence();
                } else {
                    fenceLines.push(line);
                }
                continue;
            }

            const fenceStart = line.match(/^```\s*([\w-]+)?\s*$/);
            if (fenceStart) {
                flushParagraph();
                flushList();
                inFence = true;
                fenceLang = fenceStart[1] || '';
                fenceLines = [];
                continue;
            }

            const trimmed = line.trim();
            if (!trimmed) {
                flushParagraph();
                flushList();
                continue;
            }

            const heading = line.match(/^(#{1,6})\s+(.+)$/);
            if (heading) {
                flushParagraph();
                flushList();
                const level = heading[1].length;
                html.push(`<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`);
                continue;
            }

            if (/^---+$/.test(trimmed)) {
                flushParagraph();
                flushList();
                html.push('<hr>');
                continue;
            }

            const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
            const ordered = line.match(/^\s*\d+\.\s+(.+)$/);

            if (unordered || ordered) {
                flushParagraph();
                const nextType = ordered ? 'ordered' : 'unordered';
                if (listType && listType !== nextType) {
                    flushList();
                }
                listType = nextType;
                listItems.push(renderInlineMarkdown((ordered || unordered)[1].trim()));
                continue;
            }

            flushList();
            paragraphLines.push(trimmed);
        }

        flushParagraph();
        flushList();
        flushFence();

        return html.join('\n');
    };

    const normalizeInlineText = (value) => (value || '').replace(/\u00a0/g, ' ');

    const serializeInlineNodes = (nodes) => {
        const serializeInlineNode = (node) => {
            if (!node) return '';
            if (node.nodeType === Node.TEXT_NODE) {
                return normalizeInlineText(node.textContent || '');
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }
            if (node.classList && node.classList.contains('docs-collapse-btn')) {
                return '';
            }

            const tag = node.tagName.toUpperCase();
            if (tag === 'BR') return '\n';
            if (tag === 'STRONG' || tag === 'B') {
                return `**${serializeInlineNodes(Array.from(node.childNodes))}**`;
            }
            if (tag === 'EM' || tag === 'I') {
                return `*${serializeInlineNodes(Array.from(node.childNodes))}*`;
            }
            if (tag === 'CODE' && node.parentElement && node.parentElement.tagName.toUpperCase() !== 'PRE') {
                return `\`${normalizeInlineText(node.textContent || '')}\``;
            }
            if (tag === 'A') {
                const href = node.getAttribute('href') || '';
                const label = serializeInlineNodes(Array.from(node.childNodes)).trim() || normalizeInlineText(node.textContent || '').trim();
                if (!href) return label;
                return `[${label}](${href})`;
            }

            return serializeInlineNodes(Array.from(node.childNodes));
        };

        return nodes.map(serializeInlineNode).join('');
    };

    const serializePreviewToMarkdown = (previewEl) => {
        const serializeBlockNode = (node) => {
            if (!node) return [];

            if (node.nodeType === Node.TEXT_NODE) {
                const text = normalizeInlineText(node.textContent || '').trim();
                return text ? [text] : [];
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return [];
            }

            const tag = node.tagName.toUpperCase();

            if (/^H[1-6]$/.test(tag)) {
                const level = Number(tag.slice(1));
                const text = serializeInlineNodes(Array.from(node.childNodes)).trim();
                return text ? [`${'#'.repeat(level)} ${text}`] : [];
            }

            if (tag === 'P') {
                const text = serializeInlineNodes(Array.from(node.childNodes)).trim();
                return text ? [text] : [];
            }

            if (tag === 'UL' || tag === 'OL') {
                const listItems = Array.from(node.children)
                    .filter((child) => child.tagName && child.tagName.toUpperCase() === 'LI')
                    .map((li, idx) => {
                        const inlineNodes = Array.from(li.childNodes).filter((child) => {
                            if (child.nodeType !== Node.ELEMENT_NODE) return true;
                            const childTag = child.tagName.toUpperCase();
                            return childTag !== 'UL' && childTag !== 'OL';
                        });
                        const text = serializeInlineNodes(inlineNodes).trim();
                        if (tag === 'OL') {
                            return `${idx + 1}. ${text}`;
                        }
                        return `- ${text}`;
                    })
                    .filter(Boolean);
                return listItems.length > 0 ? [listItems.join('\n')] : [];
            }

            if (tag === 'PRE') {
                const codeEl = node.querySelector('code');
                const languageClass = codeEl
                    ? (codeEl.className || '').split(' ').find((part) => part.startsWith('language-')) || ''
                    : '';
                const language = languageClass ? languageClass.replace('language-', '') : '';
                const codeText = normalizeInlineText(codeEl ? codeEl.textContent : node.textContent || '');
                return [`\`\`\`${language}\n${codeText.replace(/\n$/, '')}\n\`\`\``];
            }

            if (tag === 'HR') {
                return ['---'];
            }

            if (tag === 'DIV') {
                const nested = [];
                Array.from(node.childNodes).forEach((child) => {
                    nested.push(...serializeBlockNode(child));
                });
                return nested;
            }

            const fallback = serializeInlineNodes(Array.from(node.childNodes)).trim();
            return fallback ? [fallback] : [];
        };

        const blocks = [];
        Array.from(previewEl.childNodes).forEach((node) => {
            blocks.push(...serializeBlockNode(node));
        });

        return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trimEnd();
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

    const contextKey = projectContexts.map((ctx) => ctx.project.id).join(',');
    const draft = app.docsDraft && app.docsDraft.key === contextKey ? app.docsDraft : null;
    const initialText = draft && draft.dirty ? draft.text : combinedMarkdown;

    if (!app.docsCollapsedByContext || typeof app.docsCollapsedByContext !== 'object') {
        app.docsCollapsedByContext = {};
    }
    if (!app.docsCollapsedByContext[contextKey]) {
        app.docsCollapsedByContext[contextKey] = new Set();
    }

    const validModes = new Set(['edit', 'preview', 'split']);
    const settingMode = app.settings && typeof app.settings.get === 'function'
        ? app.settings.get('docs.editorMode')
        : null;
    if (!validModes.has(app.docsEditorMode)) {
        app.docsEditorMode = validModes.has(settingMode) ? settingMode : 'edit';
    }

    const previewInteraction = app.settings && typeof app.settings.get === 'function'
        ? app.settings.get('docs.previewInteraction')
        : 'standard';

    container.innerHTML = `
        <div class="docs-view">
            <div class="docs-toolbar">
                <div class="docs-meta">
                    <span class="docs-meta-label">Project Docs</span>
                    <span class="docs-meta-value">${projectContexts.length} project${projectContexts.length === 1 ? '' : 's'}</span>
                </div>
                <div class="docs-actions">
                    <div class="docs-mode-toggle">
                        <button class="docs-mode-btn" data-docs-mode="edit">Edit</button>
                        <button class="docs-mode-btn" data-docs-mode="preview">Preview</button>
                        <button class="docs-mode-btn" data-docs-mode="split">Split</button>
                    </div>
                    <button class="docs-save-btn" id="docsSaveBtn">Save Docs</button>
                </div>
            </div>
            <div class="docs-content" id="docsContent">
                <textarea class="docs-editor" id="docsEditor" spellcheck="false"></textarea>
                <div class="docs-preview" id="docsPreview"></div>
            </div>
        </div>
    `;

    const editor = container.querySelector('#docsEditor');
    const preview = container.querySelector('#docsPreview');
    const content = container.querySelector('#docsContent');
    const saveBtn = container.querySelector('#docsSaveBtn');
    const modeButtons = Array.from(container.querySelectorAll('[data-docs-mode]'));

    editor.value = initialText;

    const syncDraft = (dirty) => {
        app.docsDraft = {
            key: contextKey,
            text: editor.value,
            dirty
        };
    };

    const getHeadingLevel = (element) => {
        if (!element || !element.tagName) return null;
        const tag = element.tagName.toUpperCase();
        if (!/^H[1-6]$/.test(tag)) return null;
        return Number(tag.slice(1));
    };

    const getHeadingSectionNodes = (heading) => {
        const nodes = [];
        const level = getHeadingLevel(heading);
        let current = heading.nextElementSibling;
        while (current) {
            const nextLevel = getHeadingLevel(current);
            if (nextLevel !== null && nextLevel <= level) {
                break;
            }
            nodes.push(current);
            current = current.nextElementSibling;
        }
        return nodes;
    };

    const isPreviewEditActive = () => {
        if (previewInteraction !== 'preview-edit') return false;
        return app.docsEditorMode === 'preview' || app.docsEditorMode === 'split';
    };

    const applyHeadingLevelClasses = () => {
        const headings = Array.from(preview.querySelectorAll('h2, h3, h4, h5, h6'));
        headings.forEach((heading) => {
            const level = getHeadingLevel(heading);
            if (!level) return;
            heading.classList.add(`docs-heading-level-${level}`);
        });
    };

    const applySectionIndentation = () => {
        const headingTextOffsetPx = 28;
        const headings = Array.from(preview.querySelectorAll('h2, h3, h4, h5, h6'));
        headings.forEach((heading) => {
            const level = getHeadingLevel(heading);
            if (level === null || level < 2) return;
            const contentIndentPx = Math.max(0, (level - 2) * 20) + headingTextOffsetPx;
            const sectionNodes = getHeadingSectionNodes(heading);
            sectionNodes.forEach((node) => {
                if (getHeadingLevel(node) === null) {
                    node.classList.add('docs-section-content');
                    node.style.marginLeft = `${contentIndentPx}px`;
                }
            });
        });
    };

    const applyHeadingCollapseControls = () => {
        const collapsedSet = app.docsCollapsedByContext[contextKey];
        const headings = Array.from(preview.querySelectorAll('h2, h3, h4, h5, h6'));
        headings.forEach((heading, index) => {
            const level = getHeadingLevel(heading);
            if (level === null || level < 2) return;

            const rawTitle = heading.textContent.trim();
            const key = `${level}:${index}:${rawTitle}`;
            const contentHtml = heading.innerHTML;
            const sectionNodes = getHeadingSectionNodes(heading);

            heading.classList.add('docs-collapsible-heading');
            heading.innerHTML = '';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'docs-collapse-btn';
            btn.setAttribute('contenteditable', 'false');
            btn.setAttribute('tabindex', '-1');

            const label = document.createElement('span');
            label.className = 'docs-heading-text';
            label.innerHTML = contentHtml;

            const applyState = () => {
                const collapsed = collapsedSet.has(key);
                btn.textContent = collapsed ? '▶' : '▼';
                btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                sectionNodes.forEach((node) => {
                    node.classList.toggle('docs-collapsed-content', collapsed);
                });
            };

            btn.addEventListener('click', () => {
                if (collapsedSet.has(key)) {
                    collapsedSet.delete(key);
                } else {
                    collapsedSet.add(key);
                }
                applyState();
            });

            heading.append(btn, label);
            applyState();
        });
    };

    const applyPreviewEditState = () => {
        const editable = isPreviewEditActive();
        preview.classList.toggle('docs-preview-editable', editable);
        preview.contentEditable = editable ? 'true' : 'false';
        preview.spellcheck = editable;
    };

    const updatePreview = () => {
        preview.innerHTML = renderMarkdown(editor.value);
        applyHeadingLevelClasses();
        applySectionIndentation();
        applyHeadingCollapseControls();
        applyPreviewEditState();
    };

    const applyMode = (mode) => {
        app.docsEditorMode = validModes.has(mode) ? mode : 'edit';
        if (app.settings && typeof app.settings.set === 'function') {
            app.settings.set('docs.editorMode', app.docsEditorMode);
        }
        content.className = `docs-content docs-content-${app.docsEditorMode}`;
        modeButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.docsMode === app.docsEditorMode);
        });
        updatePreview();
    };

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
        const taskNoteApiCalls = [];
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
                    const sectionText = parsed.sections[sectionIdx] || '';
                    nextSections[entry.id] = sectionText;
                    const task = app.store.findTask(entry.id);
                    if (task) {
                        const currentNotes = typeof task.notes === 'string' ? task.notes : '';
                        if (currentNotes !== sectionText) {
                            task.notes = sectionText;
                            if (app.apiClient) {
                                taskNoteApiCalls.push(
                                    app.apiClient.updateTask(task.id, { notes: sectionText }).catch((error) => {
                                        app.apiClient.reportError(error, 'Task notes sync failed');
                                        throw error;
                                    })
                                );
                            }
                        }
                    }
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

        const allApiCalls = [...apiCalls, ...taskNoteApiCalls];

        if (!changed && allApiCalls.length === 0) {
            syncDraft(false);
            app.showToast('No docs changes to save');
            return;
        }

        const finalize = () => {
            syncDraft(false);
            app.store.saveState();
            app.showToast('Docs saved');
            app.render();
        };

        if (allApiCalls.length === 0) {
            finalize();
            return;
        }

        saveBtn.disabled = true;
        Promise.all(allApiCalls)
            .then(() => {
                finalize();
            })
            .catch(() => {
                saveBtn.disabled = false;
            });
    };

    app.saveDocsDraft = saveDraft;

    modeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            applyMode(btn.dataset.docsMode);
        });
    });

    saveBtn.addEventListener('click', () => {
        saveDraft();
    });

    editor.addEventListener('input', () => {
        syncDraft(true);
        if (app.docsEditorMode === 'split') {
            updatePreview();
        }
    });

    preview.addEventListener('input', () => {
        if (!isPreviewEditActive()) return;
        editor.value = serializePreviewToMarkdown(preview);
        syncDraft(true);
    });

    preview.addEventListener('click', (e) => {
        if (isPreviewEditActive() && e.target.closest('a')) {
            e.preventDefault();
        }
    });

    preview.addEventListener('keydown', (e) => {
        if (!isPreviewEditActive()) return;
        if (e.key !== 'Enter' || e.shiftKey) return;

        const selection = window.getSelection();
        let anchor = selection && selection.anchorNode ? selection.anchorNode : null;
        if (anchor && anchor.nodeType === Node.TEXT_NODE) {
            anchor = anchor.parentElement;
        }

        const target = e.target instanceof Element ? e.target : null;
        const heading = (anchor instanceof Element
            ? anchor.closest('h1, h2, h3, h4, h5, h6')
            : null) || (target ? target.closest('h1, h2, h3, h4, h5, h6') : null);
        const activeBlock = (anchor instanceof Element
            ? anchor.closest('p, div')
            : null) || (target ? target.closest('p, div') : null);
        const activeBlockText = activeBlock && preview.contains(activeBlock)
            ? normalizeInlineText(activeBlock.textContent || '').trim()
            : '';
        const markdownHeadingMatch = activeBlockText.match(/^(#{1,6})\s+(.+)$/);

        if (!heading && !markdownHeadingMatch) return;

        e.preventDefault();
        e.stopPropagation();

        if (!heading && markdownHeadingMatch) {
            const level = markdownHeadingMatch[1].length;
            const headingText = markdownHeadingMatch[2].trim();

            editor.value = serializePreviewToMarkdown(preview);
            syncDraft(true);
            updatePreview();

            const convertedHeading = Array.from(preview.querySelectorAll(`h${level}`))
                .reverse()
                .find((el) => {
                    const label = el.querySelector('.docs-heading-text');
                    const text = (label ? label.textContent : el.textContent) || '';
                    return text.trim() === headingText;
                });

            if (!convertedHeading) {
                return;
            }

            const paragraph = document.createElement('p');
            paragraph.appendChild(document.createElement('br'));
            convertedHeading.insertAdjacentElement('afterend', paragraph);

            const nextSelection = window.getSelection();
            if (nextSelection) {
                const range = document.createRange();
                range.setStart(paragraph, 0);
                range.collapse(true);
                nextSelection.removeAllRanges();
                nextSelection.addRange(range);
            }

            editor.value = serializePreviewToMarkdown(preview);
            syncDraft(true);
            return;
        }

        const paragraph = document.createElement('p');
        paragraph.appendChild(document.createElement('br'));
        heading.insertAdjacentElement('afterend', paragraph);

        if (selection) {
            const range = document.createRange();
            range.setStart(paragraph, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        editor.value = serializePreviewToMarkdown(preview);
        syncDraft(true);
    });

    const handleSaveHotkey = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveDraft();
        }
    };

    editor.addEventListener('keydown', handleSaveHotkey);
    preview.addEventListener('keydown', handleSaveHotkey);

    applyMode(app.docsEditorMode);
}
