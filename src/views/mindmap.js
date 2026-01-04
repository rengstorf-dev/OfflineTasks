function renderMindMapView(app, container) {
        // Use filtered tasks (respects project filter)
        if (app.store.projectViewMode === 'multi') {
            const rootTasks = app.store.getFilteredTasks({ skipParentFilter: true }).filter(task => !task.parentId);
            if (!app.store.parentFilterInitialized || app.store.selectedParents.size !== rootTasks.length) {
                app.store.selectedParents = new Set(rootTasks.map(task => task.id));
                app.store.parentFilterInitialized = true;
            }
        }
        let filteredTasks = app.store.getFilteredTasks();

        // Initialize mode if not set
        if (!app.mindmapMode) {
            app.mindmapMode = 'tree'; // Default to tree mode
        }

        // Initialize collapsed nodes set
        if (!app.mindmapCollapsed) {
            app.mindmapCollapsed = new Set();
        }

        // Initialize line length mode (compact, normal, expanded)
        if (!app.mindmapLineLength) {
            app.mindmapLineLength = 'normal';
        }

        // Initialize line style (straight, angled)
        if (!app.mindmapLineStyle) {
            app.mindmapLineStyle = 'straight';
        }

        // Initialize edit mode
        if (app.mindmapEditMode === undefined) {
            app.mindmapEditMode = false;
        }

        // Toggle for showing collapse badges on nodes
        if (app.mindmapShowCollapse === undefined) {
            app.mindmapShowCollapse = true;
        }

        // Initialize custom node positions storage (per layout mode)
        if (!app.mindmapCustomPositions) {
            app.mindmapCustomPositions = { tree: {}, radial: {} };
        } else if (!app.mindmapCustomPositions.tree || !app.mindmapCustomPositions.radial) {
            const legacyPositions = app.mindmapCustomPositions;
            app.mindmapCustomPositions = { tree: {}, radial: {} };
            app.mindmapCustomPositions[app.mindmapMode] = legacyPositions || {};
        }

        const getCurrentPositions = () => {
            if (!app.mindmapCustomPositions[app.mindmapMode]) {
                app.mindmapCustomPositions[app.mindmapMode] = {};
            }
            return app.mindmapCustomPositions[app.mindmapMode];
        };

        let projectGroups = null;
        if (app.store.projectViewMode === 'multi') {
            const projects = app.store.getProjects();
            const grouped = new Map();
            filteredTasks.forEach(task => {
                const key = task.projectId || 'unassigned';
                if (!grouped.has(key)) {
                    grouped.set(key, []);
                }
                grouped.get(key).push(task);
            });
            const ordered = [];
            projectGroups = [];
            projects.forEach(project => {
                if (grouped.has(project.id)) {
                    const tasks = grouped.get(project.id);
                    ordered.push(...tasks);
                    projectGroups.push({ id: project.id, tasks });
                    grouped.delete(project.id);
                }
            });
            if (grouped.has('unassigned')) {
                const tasks = grouped.get('unassigned');
                ordered.push(...tasks);
                projectGroups.push({ id: 'unassigned', tasks });
                grouped.delete('unassigned');
            }
            grouped.forEach((tasks, id) => {
                ordered.push(...tasks);
                projectGroups.push({ id, tasks });
            });
            filteredTasks = ordered;
        }

        if (filteredTasks.length === 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">No tasks to display</div>';
            return;
        }

        // Initialize line connection points storage
        // Format: { "childTaskId": { from: "bottom", to: "top" } }
        // from = side of parent node, to = side of child node
        if (!app.mindmapConnectionPoints) {
            app.mindmapConnectionPoints = {};
        }

        // Initialize undo/redo history for mind map edits
        if (!app.mindmapHistory) {
            app.mindmapHistory = [];
            app.mindmapHistoryIndex = -1;
        }

        if (app.mindmapLayoutDirty === undefined) {
            app.mindmapLayoutDirty = false;
        }
        if (app.mindmapLayoutHasCustomPositions === undefined) {
            app.mindmapLayoutHasCustomPositions = false;
        }

        const persistLayoutIfNeeded = () => {
            if (!app.settings) return;
            if (!app.mindmapLayoutDirty) return;
            app.settings.set('mindmap.layout', {
                positions: app.mindmapCustomPositions,
                connections: app.mindmapConnectionPoints,
                lineLength: app.mindmapLineLength,
                lineStyle: app.mindmapLineStyle,
                hasCustomPositions: app.mindmapLayoutHasCustomPositions
            });
            app.mindmapLayoutDirty = false;
        };

        const markLayoutDirty = () => {
            app.mindmapLayoutDirty = true;
        };

        const setHasCustomPositions = (hasPositions) => {
            app.mindmapLayoutHasCustomPositions = hasPositions;
        };

        // Helper to save current state to history
        const saveToHistory = () => {
            // Remove any future states if we're not at the end
            if (app.mindmapHistoryIndex < app.mindmapHistory.length - 1) {
                app.mindmapHistory = app.mindmapHistory.slice(0, app.mindmapHistoryIndex + 1);
            }
            // Save current state including positions, connections, and style settings
            app.mindmapHistory.push({
                positions: JSON.parse(JSON.stringify(app.mindmapCustomPositions)),
                connections: JSON.parse(JSON.stringify(app.mindmapConnectionPoints)),
                lineLength: app.mindmapLineLength,
                lineStyle: app.mindmapLineStyle
            });
            app.mindmapHistoryIndex = app.mindmapHistory.length - 1;
            // Limit history size
            if (app.mindmapHistory.length > 50) {
                app.mindmapHistory.shift();
                app.mindmapHistoryIndex--;
            }
        };

        // Helper to undo
        const undoMindmap = () => {
            if (app.mindmapHistoryIndex > 0) {
                app.mindmapHistoryIndex--;
                const state = app.mindmapHistory[app.mindmapHistoryIndex];
                app.mindmapCustomPositions = JSON.parse(JSON.stringify(state.positions));
                app.mindmapConnectionPoints = JSON.parse(JSON.stringify(state.connections));
                app.mindmapLineLength = state.lineLength;
                app.mindmapLineStyle = state.lineStyle;
                markLayoutDirty();
                persistLayoutIfNeeded();
                app.render();
            }
        };

        // Helper to redo
        const redoMindmap = () => {
            if (app.mindmapHistoryIndex < app.mindmapHistory.length - 1) {
                app.mindmapHistoryIndex++;
                const state = app.mindmapHistory[app.mindmapHistoryIndex];
                app.mindmapCustomPositions = JSON.parse(JSON.stringify(state.positions));
                app.mindmapConnectionPoints = JSON.parse(JSON.stringify(state.connections));
                app.mindmapLineLength = state.lineLength;
                app.mindmapLineStyle = state.lineStyle;
                markLayoutDirty();
                persistLayoutIfNeeded();
                app.render();
            }
        };

        // Save initial state if history is empty
        if (app.mindmapHistory.length === 0) {
            saveToHistory();
        }

        // Track selected line for editing connection points
        let selectedLineTaskId = null;

        container.innerHTML = `
            <div class="mindmap-view">
                <div class="mindmap-controls">
                    <!-- Mode toggle moved to settings pane -->
                    <button class="mindmap-btn" id="zoomIn">+ Zoom In</button>
                    <button class="mindmap-btn" id="zoomOut">− Zoom Out</button>
                    <button class="mindmap-btn" id="resetView">⟲ Reset</button>
                    <button class="mindmap-btn" id="lineLength">Lines: ${app.mindmapLineLength.charAt(0).toUpperCase() + app.mindmapLineLength.slice(1)}</button>
                    <button class="mindmap-btn" id="lineStyle">Style: ${app.mindmapLineStyle.charAt(0).toUpperCase() + app.mindmapLineStyle.slice(1)}</button>
                    <button class="mindmap-btn ${app.mindmapEditMode ? 'active' : ''}" id="editMode">${app.mindmapEditMode ? 'Exit Edit Mode' : 'Edit Layout'}</button>
                    <button class="mindmap-btn ${app.mindmapShowCollapse ? 'active' : ''}" id="toggleMindMapCollapse">${app.mindmapShowCollapse ? 'Hide Collapse' : 'Show Collapse'}</button>
                    ${app.mindmapEditMode && Object.keys(getCurrentPositions()).length > 0 ? '<button class="mindmap-btn" id="resetPositions" style="background: #fee2e2; color: #dc2626;">Reset Positions</button>' : ''}
                </div>
                <div class="mindmap-content" id="mindmapContent">
                    <div class="mindmap-canvas" id="mindmapCanvas">
                        <svg class="mindmap-svg" id="mindmapSvg" style="position: absolute; top: 0; left: 0; width: 3000px; height: 3000px; z-index: 1; pointer-events: ${app.mindmapEditMode ? 'auto' : 'none'};"></svg>
                        <div id="mindmapNodes" style="position: absolute; top: 0; left: 0; width: 3000px; height: 3000px; z-index: 2; pointer-events: none;"></div>
                        <div id="connectionPointSelector" style="display: none; position: absolute; z-index: 100;"></div>
                    </div>
                </div>
            </div>
        `;

        const content = container.querySelector('#mindmapContent');
        const canvas = container.querySelector('#mindmapCanvas');
        const svg = container.querySelector('#mindmapSvg');
        const nodesContainer = container.querySelector('#mindmapNodes');

        // Fixed canvas size - large enough for all nodes
        const canvasSize = 3000;
        const centerX = canvasSize / 2;
        const centerY = canvasSize / 2;

        const nodes = [];
        const lines = [];

        const baseNodeHeight = 44;
        const metaLineHeight = 18;
        const descriptionLineHeight = 12;
        const descriptionMarginTop = 4;
        const nodeWidth = 160;
        const nodePaddingX = 32;
        const nodePaddingY = 24;
        const contentWidth = nodeWidth - nodePaddingX;
        const nodeHalfWidth = nodeWidth / 2;
        const baseFontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif';
        const textMeasureContext = document.createElement('canvas').getContext('2d');

        const hasMetaLine = (task) => {
            return (app.store.showMindMapAssignee && task.metadata.assignee) ||
                (app.store.showMindMapPriority && task.metadata.priority === 'high') ||
                app.store.getRelatedTasks(task.id).length > 0;
        };

        const countWrappedLines = (text, fontSize, fontWeight = 400) => {
            if (!text) return 1;
            const normalized = text.trim().replace(/\s+/g, ' ');
            if (!normalized) return 1;
            textMeasureContext.font = `${fontWeight} ${fontSize}px ${baseFontFamily}`;
            const words = normalized.split(' ');
            let lines = 1;
            let line = '';

            const pushLongWord = (word) => {
                let current = '';
                for (const char of word) {
                    const test = current + char;
                    if (textMeasureContext.measureText(test).width <= contentWidth) {
                        current = test;
                    } else {
                        lines += 1;
                        current = char;
                    }
                }
                line = current;
            };

            words.forEach(word => {
                const testLine = line ? `${line} ${word}` : word;
                if (textMeasureContext.measureText(testLine).width <= contentWidth) {
                    line = testLine;
                    return;
                }
                if (!line) {
                    pushLongWord(word);
                    return;
                }
                lines += 1;
                line = word;
                if (textMeasureContext.measureText(line).width > contentWidth) {
                    pushLongWord(word);
                }
            });

            return lines;
        };

        const getNodeHeight = (task, level = 0) => {
            const titleFontSize = level === 0 ? 16 : 14;
            const titleFontWeight = level === 0 ? 600 : 400;
            const titleLineHeight = level === 0 ? 20 : 18;
            const titleLines = countWrappedLines(task.title, titleFontSize, titleFontWeight);

            let height = nodePaddingY + (titleLines * titleLineHeight);

            if (hasMetaLine(task)) {
                height += metaLineHeight;
            }

            if (app.store.showMindMapDescription && task.description) {
                const descLines = countWrappedLines(task.description, 10, 400);
                height += descriptionMarginTop + (descLines * descriptionLineHeight);
            }

            return Math.max(height, baseNodeHeight);
        };

        const getMaxNodeHeight = (tasks) => {
            let maxHeight = 40;
            const visit = (task, level = 0) => {
                maxHeight = Math.max(maxHeight, getNodeHeight(task, level));
                if (task.children && task.children.length > 0) {
                    task.children.forEach(child => visit(child, level + 1));
                }
            };
            tasks.forEach(task => visit(task, 0));
            return maxHeight;
        };

        const maxNodeHeight = getMaxNodeHeight(filteredTasks);
        const extraSpacing = Math.max(0, maxNodeHeight - baseNodeHeight);

        if (app.mindmapMode === 'tree') {
            // TREE LAYOUT - Top-down hierarchical (supports multiple root tasks)
            const startY = 200;
            // Adjust level height based on line length setting
            const lineLengthMultiplier = app.mindmapLineLength === 'compact' ? 0.6 :
                                         app.mindmapLineLength === 'expanded' ? 1.5 : 1;
            const lineGap = 0;
            const levelHeight = (180 + extraSpacing) * lineLengthMultiplier;
            const horizontalSpacing = 220;
            const rootGap = 200; // Extra gap between root trees
            const childPadding = 40; // Padding added per level of depth

            const levelTopOffsets = {};
            const getLevelTop = (level) => {
                if (levelTopOffsets[level] === undefined) {
                    levelTopOffsets[level] = startY + (level * levelHeight);
                }
                return levelTopOffsets[level];
            };

            // Calculate width needed for each subtree (with padding for depth)
            const calculateWidth = (task, depth = 0) => {
                if (!task.children || task.children.length === 0 || app.mindmapCollapsed.has(task.id)) {
                    return horizontalSpacing;
                }
                const childrenWidth = task.children.reduce((sum, child) =>
                    sum + calculateWidth(child, depth + 1), 0);
                // Add padding based on depth to push apart deeper hierarchies
                const depthPadding = depth === 0 ? childPadding * 2 : childPadding;
                return Math.max(childrenWidth, horizontalSpacing) + depthPadding;
            };

            // Place nodes recursively in tree layout
            const placeTreeNodes = (task, x, y, level, parentX, parentY, parentHeight) => {
                const nodeHeight = getNodeHeight(task, level);
                // Check for custom position
                const customPos = getCurrentPositions()[task.id];
                const finalX = customPos ? customPos.x : x;
                const levelTop = getLevelTop(level);
                const finalY = customPos ? customPos.y : (levelTop + nodeHeight / 2);

                // Add node at position
                nodes.push({ task, x: finalX, y: finalY, level, calculatedX: x, calculatedY: y, height: nodeHeight });

                // Draw line from parent to this node (if not root)
                if (parentX !== undefined && parentY !== undefined) {
                    const parentOffset = parentHeight / 2;
                    const childOffset = nodeHeight / 2;
                    lines.push({
                        x1: parentX,
                        y1: parentY + parentOffset + lineGap,
                        x2: finalX,
                        y2: levelTop - lineGap,
                        task: task,
                        mode: 'tree',
                        anchorOffset: parentOffset,
                        lineGap: lineGap
                    });
                }

                // Only show children if not collapsed
                if (task.children && task.children.length > 0 && !app.mindmapCollapsed.has(task.id)) {
                    const childWidths = task.children.map(child => calculateWidth(child, level + 1));
                    const totalWidth = childWidths.reduce((a, b) => a + b, 0);

                    let currentX = x - totalWidth / 2;

                    task.children.forEach((child, idx) => {
                        const childWidth = childWidths[idx];
                        const childX = currentX + childWidth / 2;
                        const childY = y + levelHeight;

                        placeTreeNodes(child, childX, childY, level + 1, finalX, finalY, nodeHeight);
                        currentX += childWidth;
                    });
                }
            };

            // Calculate widths for all root tasks
            const rootWidths = filteredTasks.map(task => calculateWidth(task, 0) + rootGap);
            const totalRootWidth = rootWidths.reduce((a, b) => a + b, 0) - rootGap;

            // Position each root task horizontally
            let currentRootX = centerX - totalRootWidth / 2;
            filteredTasks.forEach((rootTask, idx) => {
                const rootWidth = rootWidths[idx] - rootGap;
                const rootX = currentRootX + rootWidth / 2;
                placeTreeNodes(rootTask, rootX, startY, 0, undefined, undefined, getNodeHeight(rootTask, 0));
                currentRootX += rootWidths[idx];
            });

        } else {
            // RADIAL LAYOUT - Circular spread (supports multiple root tasks)

            // Adjust radius based on line length setting
            const lineLengthMultiplier = app.mindmapLineLength === 'compact' ? 0.6 :
                                         app.mindmapLineLength === 'expanded' ? 1.5 : 1;

            // Calculate max depth for each root to determine spacing needed
            const getMaxDepth = (task, currentDepth = 0) => {
                if (!task.children || task.children.length === 0 || app.mindmapCollapsed.has(task.id)) {
                    return currentDepth;
                }
                return Math.max(...task.children.map(child => getMaxDepth(child, currentDepth + 1)));
            };

            // Calculate spacing based on max depth of each tree
            let baseRadius = (200 + extraSpacing) * lineLengthMultiplier;
            let radiusPerLevel = (150 + extraSpacing) * lineLengthMultiplier;
            const minNodeGapRadial = 40;
            const maxChildrenByLevel = {};
            const collectMaxChildren = (task, level = 1) => {
                if (!task.children || task.children.length === 0 || app.mindmapCollapsed.has(task.id)) {
                    return;
                }
                maxChildrenByLevel[level] = Math.max(maxChildrenByLevel[level] || 0, task.children.length);
                task.children.forEach(child => collectMaxChildren(child, level + 1));
            };
            filteredTasks.forEach(rootTask => collectMaxChildren(rootTask, 1));

            const requiredRadiusByLevel = {};
            Object.keys(maxChildrenByLevel).forEach(levelKey => {
                const level = Number(levelKey);
                const count = Math.max(maxChildrenByLevel[level], 1);
                const angleStep = (Math.PI * 2) / count;
                requiredRadiusByLevel[level] = (nodeWidth + minNodeGapRadial) / angleStep;
            });

            if (requiredRadiusByLevel[1]) {
                baseRadius = Math.max(baseRadius, requiredRadiusByLevel[1]);
            }
            Object.keys(requiredRadiusByLevel).forEach(levelKey => {
                const level = Number(levelKey);
                if (level > 1) {
                    const needed = requiredRadiusByLevel[level];
                    const perLevel = (needed - baseRadius) / (level - 1);
                    if (perLevel > radiusPerLevel) {
                        radiusPerLevel = perLevel;
                    }
                }
            });
            const rootSpacings = filteredTasks.map(task => {
                const maxDepth = getMaxDepth(task);
                // Each tree needs space for its full radial spread on both sides
                const treeRadius = baseRadius + (maxDepth * radiusPerLevel);
                return treeRadius * 2 + (nodeWidth * 2) + 120; // Full diameter plus buffer
            });
            const rootSpacingById = new Map();
            filteredTasks.forEach((task, idx) => {
                rootSpacingById.set(task.id, rootSpacings[idx]);
            });
            const projectGap = 200;

            // Calculate starting position
            const totalWidth = projectGroups
                ? projectGroups.reduce((sum, group, groupIdx) => {
                    const groupWidth = group.tasks.reduce((acc, task) => {
                        return acc + (rootSpacingById.get(task.id) || 0);
                    }, 0);
                    return sum + groupWidth + (groupIdx > 0 ? projectGap : 0);
                }, 0)
                : rootSpacings.reduce((a, b) => a + b, 0);
            let currentX = centerX - totalWidth / 2;

            // Recursively place children in a radial pattern
            const placeChildren = (parent, parentX, parentY, level, startAngle, angleSpan) => {
                if (!parent.children || parent.children.length === 0 || app.mindmapCollapsed.has(parent.id)) return;

                const radius = baseRadius + (level * radiusPerLevel);
                const angleStep = angleSpan / Math.max(parent.children.length, 1);

                parent.children.forEach((child, idx) => {
                    const angle = startAngle + (angleStep * idx) + (angleStep / 2);
                    const calcX = parentX + Math.cos(angle) * radius;
                    const calcY = parentY + Math.sin(angle) * radius;

                    // Check for custom position
                    const customPos = getCurrentPositions()[child.id];
                    const finalX = customPos ? customPos.x : calcX;
                    const finalY = customPos ? customPos.y : calcY;

                    nodes.push({
                        task: child,
                        x: finalX,
                        y: finalY,
                        level,
                        calculatedX: calcX,
                        calculatedY: calcY,
                        height: getNodeHeight(child, level)
                    });

                    // Connect from parent center to child center (store child task for project color)
                    // Nodes are 160px wide, positioned by center coordinates
                    lines.push({
                        x1: parentX,
                        y1: parentY,
                        x2: finalX,
                        y2: finalY,
                        task: child,
                        mode: 'radial',
                        childHeight: getNodeHeight(child, level)
                    });

                    // Recursively place this child's children
                    placeChildren(child, finalX, finalY, level + 1, angle - angleStep / 2, angleStep);
                });
            };

            // Place each root task horizontally with dynamic spacing
            const placeRootTask = (rootTask, spacing) => {
                const calcRootX = currentX + spacing / 2;
                const calcRootY = centerY;

                // Check for custom position
                const customPos = getCurrentPositions()[rootTask.id];
                const rootX = customPos ? customPos.x : calcRootX;
                const rootY = customPos ? customPos.y : calcRootY;

                // Place root at its position
                nodes.push({
                    task: rootTask,
                    x: rootX,
                    y: rootY,
                    level: 0,
                    calculatedX: calcRootX,
                    calculatedY: calcRootY,
                    height: getNodeHeight(rootTask, 0)
                });

                // Place children radially around this root
                placeChildren(rootTask, rootX, rootY, 1, 0, Math.PI * 2);

                // Move to next root position
                currentX += spacing;
            };

            if (projectGroups) {
                projectGroups.forEach((group, groupIdx) => {
                    if (groupIdx > 0) {
                        currentX += projectGap;
                    }
                    group.tasks.forEach((rootTask) => {
                        const spacing = rootSpacingById.get(rootTask.id) || 0;
                        placeRootTask(rootTask, spacing);
                    });
                });
            } else {
                filteredTasks.forEach((rootTask, idx) => {
                    placeRootTask(rootTask, rootSpacings[idx]);
                });
            }
        }

        // Helper to get connection point coordinates for a node
        // Nodes are 160px wide, positioned by center coordinates
        const getConnectionPoint = (nodeX, nodeY, nodeHeight, side) => {
            const halfHeight = nodeHeight / 2;
            switch (side) {
                case 'top': return { x: nodeX, y: nodeY - halfHeight };
                case 'bottom': return { x: nodeX, y: nodeY + halfHeight };
                case 'left': return { x: nodeX - nodeHalfWidth, y: nodeY };
                case 'right': return { x: nodeX + nodeHalfWidth, y: nodeY };
                default: return { x: nodeX, y: nodeY };
            }
        };

        // Draw lines using PIXEL coordinates (no viewBox!)
        svg.innerHTML = lines.map((line, idx) => {
            const project = app.store.getTaskProject(line.task.id);
            const strokeColor = project ? project.color : '#334155';
            const taskId = line.task.id;

            // Check for custom connection points
            const connPoints = app.mindmapConnectionPoints[taskId];

            let x1, y1, x2, y2;

            if (connPoints) {
                // Custom connection points set - calculate based on node centers
                // Find the child node to get its position
                const childNode = nodes.find(n => n.task.id === taskId);
                // Find parent node
                const parentNode = nodes.find(n => n.task.children && n.task.children.some(c => c.id === taskId));

                if (childNode && parentNode) {
                    const fromPoint = getConnectionPoint(parentNode.x, parentNode.y, parentNode.height, connPoints.from || 'bottom');
                    const toPoint = getConnectionPoint(childNode.x, childNode.y, childNode.height, connPoints.to || 'top');
                    x1 = fromPoint.x;
                    y1 = fromPoint.y;
                    x2 = toPoint.x;
                    y2 = toPoint.y;
                } else {
                    // Fallback to original line coordinates
                    x1 = line.x1;
                    y1 = line.y1;
                    x2 = line.x2;
                    y2 = line.y2;
                }
            } else {
                // Use original line coordinates (default behavior)
                x1 = line.x1;
                y1 = line.y1;
                x2 = line.x2;
                y2 = line.y2;
            }

            const lineClass = app.mindmapEditMode ? 'mindmap-line-editable' : '';
            const cursorStyle = app.mindmapEditMode ? 'cursor: pointer; pointer-events: stroke;' : '';

            // Calculate distance between points - use larger threshold
            const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const useAngledStyle = app.mindmapLineStyle === 'angled' && distance > 100;

            if (useAngledStyle) {
                // Right-angle lines: turn halfway between parent and child
                const turnY = (y1 + y2) / 2;
                return `
                <path class="${lineClass}" data-line-task-id="${taskId}" d="M ${x1} ${y1} L ${x1} ${turnY} L ${x2} ${turnY} L ${x2} ${y2}"
                      stroke="${strokeColor}"
                      opacity="${line.task._matches === false ? 0.3 : 1}"
                      stroke-width="${app.mindmapEditMode ? 8 : 3}"
                      vector-effect="non-scaling-stroke"
                      fill="none"
                      style="${cursorStyle}" />
                `;
            } else {
                // Straight lines (default or when nodes are close)
                return `
                <line class="${lineClass}" data-line-task-id="${taskId}" x1="${x1}" y1="${y1}"
                      x2="${x2}" y2="${y2}"
                      stroke="${strokeColor}"
                      opacity="${line.task._matches === false ? 0.3 : 1}"
                      stroke-width="${app.mindmapEditMode ? 8 : 3}"
                      vector-effect="non-scaling-stroke"
                      fill="none"
                      style="${cursorStyle}" />
                `;
            }
        }).join('');

        // Draw nodes using SAME pixel coordinates
        nodesContainer.innerHTML = nodes.map(node => {
            const hasChildren = node.task.children && node.task.children.length > 0;
            const isCollapsed = app.mindmapCollapsed.has(node.task.id);
            const project = app.store.getTaskProject(node.task.id);
            const opacity = node.task._matches === false ? 0.4 : 1;
            // Root nodes (level 0) get filled project color with white text
            // Child nodes get tinted background with dark text
            let projectStyle = '';
            if (project) {
                if (node.level === 0) {
                    // Root node: filled with project color, white text
                    projectStyle = `background: ${project.color}; color: white; border: 2px solid ${project.color};`;
                } else {
                    // Child node: tinted background, dark text
                    projectStyle = `border: 2px solid ${project.color}; background: linear-gradient(${project.color}25, ${project.color}25), white; color: #333;`;
                }
            }
            return `
            <div class="mindmap-node ${node.level === 0 ? 'root' : `level-${Math.min(node.level, 3)}`}"
                 style="position: absolute; left: ${node.x - nodeHalfWidth}px; top: ${node.y - node.height / 2}px; width: ${nodeWidth}px; min-height: ${node.height}px; pointer-events: auto; opacity: ${opacity}; ${projectStyle}"
                 data-task-id="${node.task.id}">
                ${hasChildren && app.mindmapShowCollapse ? `
                    <div class="mindmap-collapse-container" style="position: absolute; top: -8px; right: -8px; display: flex; flex-direction: column; gap: 2px;">
                        <button class="mindmap-collapse-btn-one"
                                data-task-id="${node.task.id}"
                                data-action="${isCollapsed ? 'expand-one' : 'collapse-one'}"
                                title="${isCollapsed ? 'Expand 1 Level' : 'Collapse 1 Level'}"
                                style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #3b82f6; background: white; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #3b82f6; padding: 0; line-height: 1;">
                            ${isCollapsed ? '+' : '−'}
                        </button>
                        <button class="mindmap-collapse-btn-all"
                                data-task-id="${node.task.id}"
                                data-action="${isCollapsed ? 'expand-all' : 'collapse-all'}"
                                title="${isCollapsed ? 'Expand All Descendants' : 'Collapse All Descendants'}"
                                style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #10b981; background: white; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #10b981; padding: 0; line-height: 1;">
                            ${isCollapsed ? '⊕' : '⊖'}
                        </button>
                    </div>
                ` : ''}
                <button class="mindmap-add-child"
                        data-task-id="${node.task.id}"
                        title="Add child task"
                        style="position: absolute; bottom: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #2563eb; background: white; color: #2563eb; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0; line-height: 1;">
                    ⊕
                </button>
                <div style="padding-right: ${hasChildren ? '20px' : '0'};">
                    ${node.task.title}
                </div>
                ${(app.store.showMindMapAssignee && node.task.metadata.assignee) || (app.store.showMindMapPriority && node.task.metadata.priority === 'high') || app.store.getRelatedTasks(node.task.id).length > 0 ? `
                    <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
                        ${app.store.showMindMapAssignee ? (node.task.metadata.assignee || '') : ''}
                        ${app.store.showMindMapPriority && node.task.metadata.priority === 'high' ? `<span class="priority-indicator" title="High Priority" style="margin-left: 4px; color: ${app.store.getTaskColors(node.task.id).priorityColors.high};">⚠️</span>` : ''}
                        ${app.store.getRelatedTasks(node.task.id).length > 0 ? `<span class="related-badge" data-filter-related="${node.task.id}" title="Click to filter by related tasks" style="margin-left: 4px;">⟷ ${app.store.getRelatedTasks(node.task.id).length}</span>` : ''}
                    </div>
                ` : ''}
                ${app.store.showMindMapDescription && node.task.description ? `<div style="font-size: 10px; color: #666; margin-top: 4px; font-style: italic;">${node.task.description}</div>` : ''}
            </div>
        `;
        }).join('');

        // Pan and zoom functionality
        // Restore previous state if it exists, otherwise use defaults
        const state = {
            offsetX: app.mindmapPanX !== undefined ? app.mindmapPanX : -(canvasSize / 2 - content.offsetWidth / 2),
            offsetY: app.mindmapPanY !== undefined ? app.mindmapPanY : (app.mindmapMode === 'tree'
                ? 50  // Tree mode: start near top
                : -(canvasSize / 2 - content.offsetHeight / 2)), // Radial mode: center
            scale: app.mindmapScale !== undefined ? app.mindmapScale : 1,
            isDragging: false,
            startX: 0,
            startY: 0
        };

        // Apply initial centering
        canvas.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
        // Use default transform origin (0, 0) for simpler zoom math
        canvas.style.transformOrigin = '0 0';

        const updateTransform = () => {
            // Use requestAnimationFrame to ensure smooth rendering
            requestAnimationFrame(() => {
                // Calculate the center point in screen space
                const viewportCenterX = content.offsetWidth / 2;
                const viewportCenterY = content.offsetHeight / 2;

                // The root node is at canvasSize/2, canvasSize/2 in canvas coordinates
                // We want to keep it centered in the viewport while zooming
                const rootInScreenX = (canvasSize / 2) * state.scale + state.offsetX;
                const rootInScreenY = (canvasSize / 2) * state.scale + state.offsetY;

                canvas.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;

                // Adjust stroke width inversely to scale to keep lines crisp
                const baseWidth = app.mindmapEditMode ? 8 : 3;
                const adjustedStrokeWidth = baseWidth / state.scale;
                svg.querySelectorAll('line, path').forEach(el => {
                    el.setAttribute('stroke-width', adjustedStrokeWidth);
                });
            });
        };

        content.addEventListener('mousedown', (e) => {
            // Allow dragging on background, canvas, svg, or lines
            const target = e.target;
            const isBackground = target === content || 
                                target === canvas || 
                                target.id === 'mindmapCanvas' ||
                                target.id === 'mindmapSvg' ||
                                target.id === 'mindmapNodes' ||
                                target.tagName === 'svg' || 
                                target.tagName === 'line';

            if (isBackground) {
                e.preventDefault();
                state.isDragging = true;
                state.startX = e.clientX - state.offsetX;
                state.startY = e.clientY - state.offsetY;
                content.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (state.isDragging) {
                e.preventDefault();
                state.offsetX = e.clientX - state.startX;
                state.offsetY = e.clientY - state.startY;
                updateTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            if (state.isDragging) {
                state.isDragging = false;
                content.style.cursor = 'grab';
                // Save state for next render
                app.mindmapPanX = state.offsetX;
                app.mindmapPanY = state.offsetY;
                app.mindmapScale = state.scale;
            }
        });

        container.querySelector('#zoomIn').addEventListener('click', () => {
            const oldScale = state.scale;
            state.scale = Math.min(state.scale * 1.2, 3);

            // Get viewport center
            const viewportCenterX = content.offsetWidth / 2;
            const viewportCenterY = content.offsetHeight / 2;

            // Find the canvas point currently at viewport center
            const canvasPointX = (viewportCenterX - state.offsetX) / oldScale;
            const canvasPointY = (viewportCenterY - state.offsetY) / oldScale;

            // After zoom, keep that same canvas point at viewport center
            state.offsetX = viewportCenterX - canvasPointX * state.scale;
            state.offsetY = viewportCenterY - canvasPointY * state.scale;

            // Save state for next render
            app.mindmapPanX = state.offsetX;
            app.mindmapPanY = state.offsetY;
            app.mindmapScale = state.scale;

            updateTransform();
        });

        container.querySelector('#zoomOut').addEventListener('click', () => {
            const oldScale = state.scale;
            state.scale = Math.max(state.scale / 1.2, 0.3);

            // Get viewport center
            const viewportCenterX = content.offsetWidth / 2;
            const viewportCenterY = content.offsetHeight / 2;

            // Find the canvas point currently at viewport center
            const canvasPointX = (viewportCenterX - state.offsetX) / oldScale;
            const canvasPointY = (viewportCenterY - state.offsetY) / oldScale;

            // After zoom, keep that same canvas point at viewport center
            state.offsetX = viewportCenterX - canvasPointX * state.scale;
            state.offsetY = viewportCenterY - canvasPointY * state.scale;

            // Save state for next render
            app.mindmapPanX = state.offsetX;
            app.mindmapPanY = state.offsetY;
            app.mindmapScale = state.scale;

            updateTransform();
        });

        container.querySelector('#resetView').addEventListener('click', () => {
            state.offsetX = -(canvasSize / 2 - content.offsetWidth / 2);
            state.offsetY = app.mindmapMode === 'tree'
                ? 50
                : -(canvasSize / 2 - content.offsetHeight / 2);
            state.scale = 1;

            // Save state for next render
            app.mindmapPanX = state.offsetX;
            app.mindmapPanY = state.offsetY;
            app.mindmapScale = state.scale;

            updateTransform();
        });

        // Line length toggle button (cycles through states)
        // Also clears custom positions to recalculate layout fresh
        container.querySelector('#lineLength').addEventListener('click', () => {
            const states = ['compact', 'normal', 'expanded'];
            const currentIndex = states.indexOf(app.mindmapLineLength);
            app.mindmapLineLength = states[(currentIndex + 1) % states.length];
            // Clear custom positions so layout recalculates
            app.mindmapCustomPositions = { tree: {}, radial: {} };
            app.mindmapConnectionPoints = {};
            setHasCustomPositions(false);
            // Save state AFTER the change for proper undo/redo
            saveToHistory();
            markLayoutDirty();
            persistLayoutIfNeeded();
            app.render();
        });

        // Line style toggle button (cycles between straight and angled)
        container.querySelector('#lineStyle').addEventListener('click', () => {
            const states = ['straight', 'angled'];
            const currentIndex = states.indexOf(app.mindmapLineStyle);
            app.mindmapLineStyle = states[(currentIndex + 1) % states.length];
            // Save state AFTER the change for proper undo/redo
            saveToHistory();
            markLayoutDirty();
            persistLayoutIfNeeded();
            app.render();
        });

        // Scroll wheel zoom
        content.addEventListener('wheel', (e) => {
            e.preventDefault();

            const oldScale = state.scale;
            const zoomFactor = 1.1;

            // Determine zoom direction
            if (e.deltaY < 0) {
                // Scroll up = zoom in
                state.scale = Math.min(state.scale * zoomFactor, 3);
            } else {
                // Scroll down = zoom out
                state.scale = Math.max(state.scale / zoomFactor, 0.3);
            }

            // Get mouse position relative to content element
            const rect = content.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Find the canvas point under the mouse cursor before zoom
            const canvasPointX = (mouseX - state.offsetX) / oldScale;
            const canvasPointY = (mouseY - state.offsetY) / oldScale;

            // After zoom, keep that same canvas point under the mouse cursor
            state.offsetX = mouseX - canvasPointX * state.scale;
            state.offsetY = mouseY - canvasPointY * state.scale;

            // Save state for next render
            app.mindmapPanX = state.offsetX;
            app.mindmapPanY = state.offsetY;
            app.mindmapScale = state.scale;

            updateTransform();

            if (app.mindmapZoomRefreshTimer) {
                clearTimeout(app.mindmapZoomRefreshTimer);
            }
            app.mindmapZoomRefreshTimer = setTimeout(() => {
                app.mindmapZoomRefreshTimer = null;
                app.render();
            }, 120);
        });

        // Mode change listener now handled in settings pane

        // Set initial cursor
        content.style.cursor = 'grab';

        // Helper function to get all descendant IDs
        const getAllDescendantIds = (task) => {
            const ids = [];
            const traverse = (t) => {
                if (t.children && t.children.length > 0) {
                    t.children.forEach(child => {
                        ids.push(child.id);
                        traverse(child);
                    });
                }
            };
            traverse(task);
            return ids;
        };

        // Collapse/expand button clicks (both one-level and all)
        const handleCollapseClick = (btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering node click
                const taskId = btn.dataset.taskId;
                const action = btn.dataset.action;
                const task = app.store.findTask(taskId);

                if (!task) return;

                switch(action) {
                    case 'collapse-one':
                        app.mindmapCollapsed.add(taskId);
                        break;
                    case 'expand-one':
                        app.mindmapCollapsed.delete(taskId);
                        break;
                    case 'collapse-all':
                        // Collapse this node and all descendants
                        app.mindmapCollapsed.add(taskId);
                        const descendantIds = getAllDescendantIds(task);
                        descendantIds.forEach(id => app.mindmapCollapsed.add(id));
                        break;
                    case 'expand-all':
                        // Expand this node and all descendants
                        app.mindmapCollapsed.delete(taskId);
                        const allDescendantIds = getAllDescendantIds(task);
                        allDescendantIds.forEach(id => app.mindmapCollapsed.delete(id));
                        break;
                }

                app.render();
            });
        };

        // Add listeners to both button types
        container.querySelectorAll('.mindmap-collapse-btn-one').forEach(btn => handleCollapseClick(btn));
        container.querySelectorAll('.mindmap-collapse-btn-all').forEach(btn => handleCollapseClick(btn));

        // Add child task button on nodes
        container.querySelectorAll('.mindmap-add-child').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                app.showAddTaskModal(taskId);
            });
        });

        // Edit mode toggle
        container.querySelector('#editMode').addEventListener('click', () => {
            app.mindmapEditMode = !app.mindmapEditMode;
            app.render();
        });

        // Collapse badge toggle
        container.querySelector('#toggleMindMapCollapse').addEventListener('click', () => {
            app.mindmapShowCollapse = !app.mindmapShowCollapse;
            app.render();
        });

        // Reset positions button (only exists in edit mode with custom positions)
        const resetBtn = container.querySelector('#resetPositions');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    app.mindmapCustomPositions[app.mindmapMode] = {};
                    setHasCustomPositions(false);
                    markLayoutDirty();
                    persistLayoutIfNeeded();
                    app.render();
                });
            }

        const snapGridSize = 20;
        const snapThreshold = 6;
        const getSnappedPosition = (x, y) => {
            const snappedX = Math.round(x / snapGridSize) * snapGridSize;
            const snappedY = Math.round(y / snapGridSize) * snapGridSize;
            const useX = Math.abs(snappedX - x) <= snapThreshold;
            const useY = Math.abs(snappedY - y) <= snapThreshold;
            return {
                x: useX ? snappedX : x,
                y: useY ? snappedY : y,
                isSnapped: useX || useY
            };
        };

        // Node dragging in edit mode
        if (app.mindmapEditMode) {
            container.querySelectorAll('.mindmap-node').forEach(nodeEl => {
                nodeEl.style.cursor = 'move';
                nodeEl.style.boxShadow = '0 0 0 2px #3b82f6';

                let isDragging = false;
                let startMouseX, startMouseY;
                let startNodeX, startNodeY;

                nodeEl.addEventListener('mousedown', (e) => {
                    // Ignore clicks on collapse buttons
                    if (e.target.classList.contains('mindmap-collapse-btn-one') ||
                        e.target.classList.contains('mindmap-collapse-btn-all') ||
                        e.target.closest('.mindmap-collapse-container')) {
                        return;
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    isDragging = true;

                    const taskId = nodeEl.dataset.taskId;
                    const nodeData = nodes.find(n => n.task.id === taskId);

                    startMouseX = e.clientX;
                    startMouseY = e.clientY;
                    startNodeX = nodeData.x;
                    startNodeY = nodeData.y;

                    nodeEl.style.zIndex = '1000';
                    nodeEl.style.opacity = '0.8';

                    const onMouseMove = (moveE) => {
                        if (!isDragging) return;

                        const dx = (moveE.clientX - startMouseX) / state.scale;
                        const dy = (moveE.clientY - startMouseY) / state.scale;

                        const newX = startNodeX + dx;
                        const newY = startNodeY + dy;
                        const snapped = getSnappedPosition(newX, newY);

                        // Update node position visually
                        nodeEl.style.left = `${snapped.x - 80}px`;
                        nodeEl.style.top = `${snapped.y - 20}px`;
                        nodeEl.classList.toggle('snap-active', snapped.isSnapped);

                        // Update lines connected to this node
                        updateLinesForNode(taskId, snapped.x, snapped.y, snapped.isSnapped);
                    };

                    const onMouseUp = (upE) => {
                        if (!isDragging) return;
                        isDragging = false;

                        const dx = (upE.clientX - startMouseX) / state.scale;
                        const dy = (upE.clientY - startMouseY) / state.scale;

                        const newX = startNodeX + dx;
                        const newY = startNodeY + dy;
                        const snapped = getSnappedPosition(newX, newY);
                        const snappedDx = snapped.x - startNodeX;
                        const snappedDy = snapped.y - startNodeY;
                        const hasPositionChange = snappedDx !== 0 || snappedDy !== 0;

                        if (hasPositionChange) {
                            // Save custom position for this node
                            getCurrentPositions()[taskId] = { x: snapped.x, y: snapped.y };
                            setHasCustomPositions(true);
                        }

                        // Also move all descendant nodes by the same delta
                        const task = app.store.findTask(taskId);
                        if (task && hasPositionChange) {
                            const moveDescendants = (parentTask) => {
                                if (!parentTask.children) return;
                                parentTask.children.forEach(child => {
                                    const childNode = nodes.find(n => n.task.id === child.id);
                                    if (childNode) {
                                        // Get current position (custom or calculated)
                                        const currentX = getCurrentPositions()[child.id]?.x || childNode.x;
                                        const currentY = getCurrentPositions()[child.id]?.y || childNode.y;
                                        // Apply the same delta
                                        getCurrentPositions()[child.id] = {
                                            x: currentX + snappedDx,
                                            y: currentY + snappedDy
                                        };
                                    }
                                    moveDescendants(child);
                                });
                            };
                            moveDescendants(task);
                        }

                        nodeEl.style.zIndex = '';
                        nodeEl.style.opacity = '';
                        nodeEl.classList.remove('snap-active');
                        updateLinesForNode(taskId, snapped.x, snapped.y, false);

                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);

                        if (hasPositionChange) {
                            markLayoutDirty();
                            setHasCustomPositions(true);
                            // Save to history for undo/redo
                            saveToHistory();
                            persistLayoutIfNeeded();
                        }

                        // Re-render to update lines properly
                        app.render();
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            });
        }

        // Helper to update lines when dragging a node
        const updateLinesForNode = (taskId, newX, newY, isSnapped) => {
            // Find all lines that connect to this node and update them
            svg.querySelectorAll('line, path').forEach((lineEl, idx) => {
                const line = lines[idx];
                if (!line) return;

                const project = app.store.getTaskProject(line.task.id);
                const strokeColor = project ? project.color : '#334155';

                // Check if this line connects to the dragged node
                if (line.task.id === taskId) {
                    // This line ends at the dragged node
                    const targetY = line.mode === 'tree'
                        ? newY - (line.anchorOffset || 0) - (line.lineGap || 0)
                        : newY;
                    if (app.mindmapLineStyle === 'angled') {
                        const midY = line.y1 + (targetY - line.y1) / 2;
                        lineEl.setAttribute('d', `M ${line.x1} ${line.y1} L ${line.x1} ${midY} L ${newX} ${midY} L ${newX} ${targetY}`);
                    } else {
                        if (lineEl.tagName === 'line') {
                            lineEl.setAttribute('x2', newX);
                            lineEl.setAttribute('y2', targetY);
                        }
                    }
                    lineEl.setAttribute('opacity', line.task._matches === false ? 0.3 : 1);
                    lineEl.classList.toggle('snap-active', !!isSnapped);
                }
            });
        };

        // Node clicks
        container.querySelectorAll('.mindmap-node').forEach(node => {
            node.addEventListener('click', (e) => {
                // In edit mode, don't open modal on click (drag handles it)
                if (app.mindmapEditMode) return;

                // Ignore clicks on collapse buttons
                if (e.target.classList.contains('mindmap-collapse-btn-one') ||
                    e.target.classList.contains('mindmap-collapse-btn-all') ||
                    e.target.closest('.mindmap-collapse-container')) {
                    return;
                }
                e.stopPropagation();
                const taskId = e.target.closest('.mindmap-node').dataset.taskId;
                if (app.linkMode) {
                    app.handleLinkModeClick(taskId);
                } else if (app.relateLinkMode) {
                    app.handleRelateModeClick(taskId);
                } else {
                    app.showNodeModal(taskId);
                }
            });
        });

        // Related badge click handler - filter by related tasks
        container.querySelectorAll('[data-filter-related]').forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = badge.dataset.filterRelated;
                app.store.setRelatedFilter(taskId);
            });
        });

        // Line click handlers for connection point selection (only in edit mode)
        if (app.mindmapEditMode) {
            const connectionSelector = container.querySelector('#connectionPointSelector');

            // Helper to show connection point options for a line
            const showConnectionOptions = (lineTaskId, lineEl) => {
                const line = lines.find(l => l.task.id === lineTaskId);
                if (!line) return;

                // Find parent and child nodes
                const childNode = nodes.find(n => n.task.id === lineTaskId);
                if (!childNode) return;

                // Find parent node (the one this line comes from)
                const parentNode = nodes.find(n => {
                    return n.task.children && n.task.children.some(c => c.id === lineTaskId);
                });

                if (!parentNode || !childNode) return;

                // Current connection points
                const connPoints = app.mindmapConnectionPoints[lineTaskId] || {};
                const currentFrom = connPoints.from || 'bottom';
                const currentTo = connPoints.to || 'top';

                // Create the selector UI
                connectionSelector.innerHTML = `
                    <div style="background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 200px;">
                        <div style="font-weight: 600; margin-bottom: 8px; color: #333;">Connection Points</div>
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">From parent (${parentNode.task.title.substring(0, 15)}...):</div>
                            <div style="display: flex; gap: 4px;">
                                ${['top', 'bottom', 'left', 'right'].map(side => `
                                    <button class="conn-btn conn-from" data-side="${side}"
                                            style="padding: 4px 8px; border: 1px solid ${currentFrom === side ? '#3b82f6' : '#ddd'};
                                                   background: ${currentFrom === side ? '#dbeafe' : 'white'};
                                                   border-radius: 4px; cursor: pointer; font-size: 11px;">
                                        ${side.charAt(0).toUpperCase() + side.slice(1)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">To child (${childNode.task.title.substring(0, 15)}...):</div>
                            <div style="display: flex; gap: 4px;">
                                ${['top', 'bottom', 'left', 'right'].map(side => `
                                    <button class="conn-btn conn-to" data-side="${side}"
                                            style="padding: 4px 8px; border: 1px solid ${currentTo === side ? '#3b82f6' : '#ddd'};
                                                   background: ${currentTo === side ? '#dbeafe' : 'white'};
                                                   border-radius: 4px; cursor: pointer; font-size: 11px;">
                                        ${side.charAt(0).toUpperCase() + side.slice(1)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <button id="closeConnSelector" style="margin-top: 12px; width: 100%; padding: 6px; background: #f3f4f6; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Close</button>
                    </div>
                `;

                // Position near the line midpoint
                const midX = (line.x1 + line.x2) / 2;
                const midY = (line.y1 + line.y2) / 2;
                connectionSelector.style.left = `${midX - 100}px`;
                connectionSelector.style.top = `${midY}px`;
                connectionSelector.style.display = 'block';

                // Add click handlers for connection buttons
                connectionSelector.querySelectorAll('.conn-from').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const side = btn.dataset.side;
                        if (!app.mindmapConnectionPoints[lineTaskId]) {
                            app.mindmapConnectionPoints[lineTaskId] = {};
                        }
                        app.mindmapConnectionPoints[lineTaskId].from = side;
                        markLayoutDirty();
                        saveToHistory();
                        persistLayoutIfNeeded();
                        app.render();
                    });
                });

                connectionSelector.querySelectorAll('.conn-to').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const side = btn.dataset.side;
                        if (!app.mindmapConnectionPoints[lineTaskId]) {
                            app.mindmapConnectionPoints[lineTaskId] = {};
                        }
                        app.mindmapConnectionPoints[lineTaskId].to = side;
                        markLayoutDirty();
                        saveToHistory();
                        persistLayoutIfNeeded();
                        app.render();
                    });
                });

                // Close button
                connectionSelector.querySelector('#closeConnSelector').addEventListener('click', (e) => {
                    e.stopPropagation();
                    connectionSelector.style.display = 'none';
                });
            };

            // Add click handlers to lines
            svg.querySelectorAll('[data-line-task-id]').forEach(lineEl => {
                lineEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const lineTaskId = lineEl.getAttribute('data-line-task-id');
                    showConnectionOptions(lineTaskId, lineEl);
                });
            });

            // Click outside to close selector
            content.addEventListener('click', (e) => {
                if (!e.target.closest('#connectionPointSelector')) {
                    connectionSelector.style.display = 'none';
                }
            });
        }

        // Keyboard shortcuts for undo/redo (Ctrl+Z / Ctrl+Y)
        const handleKeyDown = (e) => {
            // Only handle if mind map is the current view
            if (app.currentView !== 'mindmap') return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                e.stopImmediatePropagation(); // Stop other handlers
                if (app.mindmapHistoryIndex > 0) {
                    app.showToast('Mindmap Undo');
                    undoMindmap();
                } else {
                    app.showToast('Nothing to undo');
                }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                e.stopImmediatePropagation(); // Stop other handlers
                if (app.mindmapHistoryIndex < app.mindmapHistory.length - 1) {
                    app.showToast('Mindmap Redo');
                    redoMindmap();
                } else {
                    app.showToast('Nothing to redo');
                }
            }
        };

        // Remove any existing listener and add new one
        document.removeEventListener('keydown', app.mindmapKeyHandler);
        app.mindmapKeyHandler = handleKeyDown;
        document.addEventListener('keydown', handleKeyDown);
}
