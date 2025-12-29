# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page task management application with four visualization modes:
- **Outline View** - Hierarchical list with inline editing
- **Kanban Board** - Status-based columns (Todo/In Progress/Review/Done)
- **Gantt Chart** - Timeline view with date bars and dependencies
- **Mind Map** - Dual layouts (Tree: top-down hierarchical, Radial: circular spread) with expand/collapse

**Architecture:** Modular source under `/src` (settings, store, app, views, UI, styles). Build outputs a single standalone `dist/task-manager.html` via `node scripts/build.js`. The legacy monolithic HTML is archive-only; do not edit it.

## Core Design Philosophy

1. **Keyboard-first UX** - All major actions accessible via keyboard
2. **Inline everything** - No modals for editing, edit in place
3. **Undo over confirm** - Provide Ctrl+Z instead of confirmation dialogs (except for destructive actions)
4. **Visual feedback** - Always show selection, focus, and editing states clearly
5. **Single source of truth** - One TaskStore, multiple view renderers

## Data Model

```javascript
TaskStore {
    tasks: [],              // Hierarchical array of task objects
    nextId: 100,           // Auto-incrementing ID
    collapsed: Set,         // IDs of collapsed tasks (outline view)
    dependencies: Map,      // task_id -> [dependent_task_ids]
    filter: 'all',
    searchQuery: '',
    showDescriptions: false,

    // Undo/Redo
    history: [],           // Array of state snapshots
    historyIndex: -1,      // Current position in history
    maxHistorySize: 50
}

// Mind Map State (App-level, session-scoped)
app.mindmapMode = 'tree' | 'radial'      // Current layout mode (default: 'tree')
app.mindmapCollapsed = Set               // IDs of collapsed nodes in Mind Map
app.mindmapPanX = number | undefined     // Saved pan X offset
app.mindmapPanY = number | undefined     // Saved pan Y offset
app.mindmapScale = number | undefined    // Saved zoom scale

// Settings (Global, localStorage-persisted) - PLANNED
app.settings = {
    // Global settings
    mindMapLineStyle: 'straight' | 'curved' | 'right-angles',
    showDescriptionsOnNodes: boolean,
    defaultView: 'outline' | 'kanban' | 'gantt' | 'mindmap',
    darkMode: boolean,
    autoSave: boolean,
    filterToggleBehavior: boolean,  // true = can toggle filters off, false = traditional radio buttons

    // View-specific settings (namespaced)
    outline: {
        showDescriptions: boolean,
        indentSize: number,
        checkboxMode: boolean,
        sortBy: 'default' | 'priority' | 'status'
    },
    kanban: {
        cardSize: 'compact' | 'normal' | 'large',
        columnOrder: [string],
        showMetadata: boolean
    },
    gantt: {
        dateRange: 'week' | 'month' | 'quarter',
        showDependencyLines: boolean,
        zoomLevel: number
    },
    mindmap: {
        layoutMode: 'tree' | 'radial',
        nodeSize: 'small' | 'medium' | 'large'
    }
}

Task {
    id: string,
    title: string,
    description: string,
    metadata: {
        status: 'todo' | 'in-progress' | 'review' | 'done',
        priority: 'low' | 'medium' | 'high',
        assignee: string,          // Individual resource name
        team: string,              // Team/group name (PLANNED - Phase 3)
        startDate: string,         // ISO format or empty
        endDate: string,
        tags: [string]             // Project tags for grouping (PLANNED - Phase 3)
    },
    children: [Task]       // Recursive hierarchy
}
```

## Key Architecture Patterns

### Observer Pattern
TaskStore notifies all views when data changes. Views subscribe and re-render:
```javascript
app.store.subscribe(() => {
    app.render(); // Re-render when data changes
});
```

### State Snapshots for Undo
Before any mutation, call `saveState()` to save current state. After mutation, call `notify()` to update views:
```javascript
saveState() {
    const state = {
        tasks: JSON.parse(JSON.stringify(this.tasks)),
        dependencies: new Map(this.dependencies),
        nextId: this.nextId
    };
    this.history.push(state);
}
```

### Inline Editing Pattern
Elements use `contenteditable` for in-place editing. Save changes on blur:
```javascript
<span contenteditable="true"
      data-original-title="${task.title}"
      onblur="handleTitleChange">
    ${task.title}
</span>
```

### State Persistence Pattern (Mind Map)
Preserve view state across re-renders, reset when context changes:
```javascript
// 1. Restore saved state or use defaults
const state = {
    offsetX: this.mindmapPanX !== undefined ? this.mindmapPanX : defaultX,
    offsetY: this.mindmapPanY !== undefined ? this.mindmapPanY : defaultY,
    scale: this.mindmapScale !== undefined ? this.mindmapScale : 1
};

// 2. Save after user actions (pan, zoom)
this.mindmapPanX = state.offsetX;
this.mindmapPanY = state.offsetY;
this.mindmapScale = state.scale;

// 3. Reset when changing modes
this.mindmapPanX = undefined;  // Next render uses defaults
```

## Critical Code Locations

- **Line ~900:** TaskStore class definition
- **Line ~930-990:** Undo/Redo system (saveState, undo, redo)
- **Line ~1700:** `renderOutline()` - Outline view with inline editing
- **Line ~1860-1940:** Keyboard handlers (Tab, Shift+Tab, Enter, Delete)
- **Line ~2000:** `renderKanban()` - Kanban board view
- **Line ~2200:** `renderGantt()` - Gantt chart view
- **Line ~2386:** `renderMindMap()` - Mind Map view (with dual modes)
- **Line ~2395-2403:** Mind Map state initialization (mode, collapsed nodes)
- **Line ~2437-2535:** Dual layout algorithms (Tree + Radial)
- **Line ~2555-2571:** Collapse/expand buttons (two-button system)
- **Line ~2574-2583:** Pan/zoom state restoration
- **Line ~2652-2698:** Viewport-centered zoom implementation
- **Line ~2726-2736:** Mode switching with state reset
- **Line ~2737-2789:** Collapse/expand button handlers
- **Line ~400:** CSS styles section

## Keyboard Shortcuts

### Outline View
- `Enter` - Create new sibling task at same level
- `Tab` - Indent task (make child of previous sibling)
- `Shift+Tab` - Outdent task (promote one level)
- `Delete/Backspace` - Delete selected task (with confirmation)
- `Arrow Up/Down` - Navigate between tasks
- Click title/description to edit inline

### Global
- `Ctrl+Z` (Cmd+Z) - Undo
- `Ctrl+Y` (Cmd+Y) or `Ctrl+Shift+Z` - Redo

### Mind Map
- **Mode Toggle:** 🌳 Tree (top-down) or ⭕ Radial (circular)
- **Collapse/Expand Buttons (on nodes with children):**
  - Blue button (+/−): Collapse/Expand 1 level (direct children only)
  - Green button (⊕/⊖): Collapse/Expand all descendants (entire subtree)
- Drag background to pan
- Zoom buttons to zoom in/out (centers on viewport)
- Reset button to return to mode-appropriate default view

## Development Workflow

**Source of truth:** Edit files in `/src`; never hand-edit `/dist`. Run `node scripts/build.js` to regenerate `dist/task-manager.html` for distribution. Monolith HTML is archived only; all new work happens in `/src`.

**Documentation Update Policy:** Do NOT update CLAUDE.md or TODO.md until user explicitly requests it (e.g., "update", "update docs", "todo needed"). Saves ~10k tokens per feature by avoiding premature documentation updates during iterative development.

**Version Timestamps:** Use Central Standard Time (CST) for TODO.md version numbers (format: vYYYYMMDD-HHMM CST).

### When Adding a Feature
1. Update TaskStore if new data properties are needed
2. Update `saveState()` to include new data in state snapshots
3. Update render functions for affected views
4. Add necessary UI interaction logic
5. Test all views and undo/redo functionality

### When Fixing a Bug
1. Reproduce the exact steps to trigger the bug
2. Find the relevant code section using line numbers above
3. Identify root cause (don't fix symptoms)
4. Make minimal, targeted change
5. Test fix and run regression tests
6. Verify undo/redo still works

### Critical Rules
- **ALWAYS** call `saveState()` before TaskStore mutations
- **ALWAYS** call `notify()` after TaskStore mutations
- **NEVER** modify tasks directly - use TaskStore methods (findTask, updateTask, addTask, deleteTask)
- **NEVER** mix coordinate systems in Mind Map (use pixels everywhere, no SVG viewBox)
- Use `data-task-id` attributes for dynamic element lookups

## Common Patterns & Solutions

### Tab Navigation in Outline View
Global Tab capture prevents navigation to toolbar:
```javascript
if (this.currentView === 'outline' && e.key === 'Tab') {
    const isEditingTitle = document.activeElement?.classList.contains('task-title');
    if (!isEditingTitle) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}
```

### Focus Management After Re-render
Use setTimeout to refocus after DOM updates:
```javascript
setTimeout(() => {
    const row = container.querySelector(`[data-task-id="${taskId}"]`);
    if (row) {
        row.focus();
        row.classList.add('selected');
    }
}, 0);
```

### Mind Map Coordinate System
Use pixel coordinates consistently for both SVG lines and HTML nodes:
```javascript
// NO viewBox on SVG
svg.style.width = '3000px';
svg.style.height = '3000px';

// Both SVG lines and nodes use pixel coordinates
<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
<div style="left: ${x}px; top: ${y}px">...</div>
```

### Mind Map Zoom Stroke Width
Adjust stroke width inversely to scale to maintain visual consistency:
```javascript
const updateTransform = () => {
    canvas.style.transform = `scale(${state.scale})`;
    const adjustedStrokeWidth = 3 / state.scale;
    svg.querySelectorAll('line').forEach(line => {
        line.setAttribute('stroke-width', adjustedStrokeWidth);
    });
};
```

### Viewport-Centered Zoom
Zoom toward the point currently at the center of the viewport:
```javascript
// 1. Set transform origin to 0,0 for simpler math
canvas.style.transformOrigin = '0 0';

// 2. Find canvas point at viewport center BEFORE zoom
const canvasPointX = (viewportCenterX - state.offsetX) / oldScale;
const canvasPointY = (viewportCenterY - state.offsetY) / oldScale;

// 3. Apply new scale
state.scale = newScale;

// 4. Adjust offset to keep that canvas point at viewport center
state.offsetX = viewportCenterX - canvasPointX * state.scale;
state.offsetY = viewportCenterY - canvasPointY * state.scale;
```

### Recursive Descendant Collection (Mind Map)
Collect all descendant task IDs for "collapse/expand all" operations:
```javascript
const getAllDescendantIds = (task) => {
    const ids = [];
    const traverse = (t) => {
        if (t.children?.length > 0) {
            t.children.forEach(child => {
                ids.push(child.id);
                traverse(child);  // Recursive
            });
        }
    };
    traverse(task);
    return ids;
};
```

## Testing Checklist

Before committing any change:
- [ ] Undo/Redo works for the change
- [ ] All views render correctly
- [ ] Keyboard shortcuts still work
- [ ] Tab doesn't jump to toolbar (in outline view)
- [ ] Focus management works (stays on element after operations)
- [ ] No console errors
- [ ] Data persists across view switches

### Outline View Tests
- [ ] Can create tasks with Enter
- [ ] Tab/Shift+Tab indent/outdent correctly
- [ ] Delete removes task
- [ ] Inline title and description editing works
- [ ] Collapse/expand works
- [ ] Selection is visible
- [ ] Hitting Enter after new task creation/text edit handled correctly

### Kanban Tests
- [ ] Drag and drop between columns works
- [ ] Status updates correctly
- [ ] Cards show correct info

### Gantt Tests
- [ ] Tasks with dates show bars
- [ ] Timeline scrolls
- [ ] Bars are color-coded by status
- [ ] Hierarchy visible with indentation

### Mind Map Tests
- [ ] Mode toggle switches between Tree and Radial layouts
- [ ] Tree mode shows root at top, children spread horizontally
- [ ] Radial mode shows circular spread from center
- [ ] Lines connect nodes properly in both modes
- [ ] Drag/pan works and preserves state
- [ ] Zoom centers on viewport (not root node)
- [ ] Lines stay connected during zoom
- [ ] Collapse buttons (blue) hide/show 1 level
- [ ] Expand all buttons (green) hide/show entire subtree
- [ ] View state preserved during collapse/expand
- [ ] Mode switching resets view appropriately
- [ ] Nodes are clickable (not collapse buttons)

## Common Pitfalls to Avoid

❌ **Don't:**
1. Mix coordinate systems (SVG viewBox + pixel positioning causes drift)
2. Forget `saveState()` before mutations (breaks undo)
3. Forget `notify()` after mutations (views don't update)
4. Use window.addEventListener for view-specific keys
5. Add confirmation dialogs everywhere (provide undo instead)
6. Modify tasks directly (use TaskStore methods)
7. Hardcode IDs (use data attributes and dynamic lookups)
8. Use custom transform origins for zoom (complicates viewport-centered zoom math)
9. Forget to save pan/zoom state after user actions

✅ **Do:**
1. Use consistent coordinate system (pixels everywhere in Mind Map)
2. Call `saveState()` before every mutation
3. Call `notify()` after every mutation
4. Use targeted event listeners
5. Undo over confirm (only confirm destructive actions like delete)
6. Use TaskStore methods: findTask(), updateTask(), addTask(), deleteTask()
7. Use `data-task-id` attributes for dynamic element lookups
8. Set `transformOrigin: '0 0'` for viewport-centered zoom
9. Save pan/zoom state after user actions (pan, zoom, reset)
10. Reset state to undefined when context changes (mode switching)

## Style Guidelines

**Colors:**
- Todo: Gray (#94a3b8)
- In Progress: Blue (#3b82f6)
- Review: Orange (#f59e0b)
- Done: Green (#10b981)
- Selected/Focus: Blue outline (#3b82f6)
- Mind Map Collapse 1-Level Button: Blue (#3b82f6)
- Mind Map Collapse All Button: Green (#10b981)

**Spacing:**
- Consistent 8px gaps
- 20px indentation per hierarchy level

**Typography:**
- 14px base
- 13px secondary text
- 10px metadata

## Known Limitations

- Single root task assumed for Mind Map
- No backend persistence (localStorage could be added)
- Modern browsers only (ES6+, no IE11)
- No real-time collaboration
- No task attachments/file uploads



## Global Settings UI Panel (Phase 1, Item 2b)

### Purpose
Provide user-facing interface to configure global settings. Settings infrastructure is already implemented; this adds the UI layer.

### Access Point
- Settings button (⚙️ icon) in toolbar
- Opens modal or slide-out panel

### UI Organization

**Theme & Colors Tab:**
```javascript
settings.theme = {
    statusColors: {
        todo: '#94a3b8',
        'in-progress': '#3b82f6',
        review: '#f59e0b',
        done: '#10b981'
    },
    priorityColors: {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#94a3b8'
    },
    backgroundColors: {
        light: '#f5f5f5',
        dark: '#1a1a1a'
    }
}
```

**Icons & Emojis Tab:**
```javascript
settings.icons = {
    statusIcons: {
        todo: '○',
        'in-progress': '⚡',
        review: '👁',
        done: '✓'
    },
    customEmojis: true/false
}
```

**Behavior Tab:**
```javascript
settings.behavior = {
    filterToggleBehavior: true,
    autoSave: true,
    defaultView: 'outline',
    checkboxMode: false
}
```

**Mind Map Tab:**
```javascript
settings.mindmap = {
    lineStyle: 'straight' | 'curved' | 'right-angles',
    showDescriptionsOnNodes: false,
    layoutMode: 'tree' | 'radial'
}
```

### Implementation Notes
- Uses existing Settings class (`this.settings.get()`, `this.settings.set()`)
- Color inputs use HTML color pickers
- Emoji inputs use text input or emoji picker component
- Live preview of changes (optional)
- Save/Cancel/Reset buttons

---

## Click Status Emoji to Toggle Complete (Phase 2, Item 4a)

### Current Behavior
Status icons in outline view are visual indicators only. Clicking opens detail panel.

### New Behavior
Click status icon → toggle task status

### Design Decision: Simple Toggle ✅

**Chosen Approach:** Simple Toggle
- Click non-Done icon → Mark as Done
- Click Done icon → Mark as Todo
- Fast, predictable, covers most use cases

**Rationale:**
- Fastest for common case (marking tasks done)
- Predictable behavior
- Users can still use detail panel for In Progress/Review statuses
- Matches checkbox mental model

### Implementation

**Update renderOutline():**
```javascript
<div class="status-icon status-${task.metadata.status}"
     data-task-click="${task.id}"
     data-toggle-status="${task.id}"
     style="cursor: pointer;">
    ${task.metadata.status === 'done' ? '✓' :
      task.metadata.status === 'in-progress' ? '⚡' :
      task.metadata.status === 'review' ? '👁' : '○'}
</div>
```

**Event Handler:**
```javascript
// In event delegation
if (e.target.dataset.toggleStatus) {
    const taskId = e.target.dataset.toggleStatus;
    const task = this.store.findTask(taskId);

    // Toggle: if Done → Todo, else → Done
    const newStatus = task.metadata.status === 'done' ? 'todo' : 'done';

    this.store.saveState();
    this.store.updateTask(taskId, {
        metadata: { ...task.metadata, status: newStatus }
    });

    e.stopPropagation(); // Prevent detail panel from opening
}
```

### Benefits
- ✅ Quick task completion (one click)
- ✅ No need to open detail panel
- ✅ Visual feedback immediate
- ✅ Works with undo/redo
- ✅ Keyboard-first UX maintained (can still use detail panel for more control)

---

## Inline Description Parsing (Phase 2, Item 7)

### Design Goal
Enable fast, inline description entry while typing task titles without breaking flow to click separate panels.

### # Delimiter Pattern

**User Types:**
```
Fix login bug # Need to update authentication flow and add error handling
```

**System Parses On Blur/Save:**
```javascript
title: "Fix login bug"
description: "Need to update authentication flow and add error handling"
```

**Visual Display (Depends on "Show Descriptions" Toggle):**

When descriptions are shown:
```
○ Fix login bug
    Need to update authentication flow and add error handling
```

When descriptions are hidden:
```
○ Fix login bug
```

**Important:** The `#` symbol is NEVER displayed in the rendered view. It's only used during initial input as a parsing delimiter.

### Implementation Details

**Parsing Logic:**
```javascript
function parseTaskInput(input) {
    // Check for unescaped # delimiter
    const parts = input.split(/(?<!\\)#/);

    if (parts.length > 1) {
        const title = parts[0].trim();
        const description = parts.slice(1).join('#').trim(); // Join in case of multiple #

        // Handle escape sequences
        const cleanTitle = title.replace(/\\#/g, '#');

        return { title: cleanTitle, description };
    }

    // No # found - just title
    return { title: input.replace(/\\#/g, '#'), description: '' };
}
```

**On Task Title Blur:**
```javascript
handleTitleBlur(e) {
    const input = e.target.textContent.trim();
    const { title, description } = parseTaskInput(input);

    // Update task
    this.store.updateTask(taskId, {
        title,
        description: description || task.description // Keep existing if no new description
    });
}
```

**Editing Behavior:**
- Title field: Shows `task.title` only (no `#`)
- Description field: Shows `task.description` only (no `#`)
- Separate contenteditable fields (current behavior maintained)

### Edge Cases

| Input | Title | Description |
|-------|-------|-------------|
| `Fix bug # Add tests` | "Fix bug" | "Add tests" |
| `Fix bug #` | "Fix bug" | "" (empty) |
| `Fix bug` | "Fix bug" | "" (empty) |
| `Project \# 123` | "Project # 123" | "" (empty) |
| `Fix # bug # now` | "Fix" | "bug # now" |

### UX Benefits
- ✅ No clicking out of flow
- ✅ Fast typing experience
- ✅ Natural outline-style entry
- ✅ Works with existing UI (show/hide descriptions toggle)
- ✅ Non-breaking: Existing tasks unaffected

---


### Assignment Filtering (Team + Resource Hierarchy)

**NOT a separate view** - Applied as a filter to existing views

**Data Model:**
```javascript
task.metadata.team = "Engineering" | "Design" | "Product" | etc.
task.metadata.assignee = "John Doe" | "Jane Smith" | etc.
```

**Filter UI:**
- Multi-select dropdown in settings pane
- Two levels: Team (group) → Resource (individual)
- Example: "Engineering → Alice", "Design → Bob"

**Behavior:**
- Filter applies to all views
- Can filter by team only (show all resources in that team)
- Can filter by specific resource(s)
- Multi-select with "Select All" / "Deselect All"

---

### Project Grouping & Filtering

**Use Case:** Group parent tasks into "projects" to view subsets independently

**Implementation Options:**
1. **Tags-based:** Add `task.metadata.tags = ["Project A", "Project B"]`
2. **Multiple roots:** Allow multiple root-level tasks, each representing a project

**Recommended:** Tags-based approach (more flexible, tasks can belong to multiple projects)

**Filter UI:**
- Multi-select checkboxes in settings pane
- "Select All" / "Deselect All" options
- Persisted filter state in localStorage

---

### Export Architecture

**Priority Views:** Kanban, Gantt (most important for stakeholder presentations)

**Export Formats:**
- **PNG:** High priority, works for all views
- **SVG:** Vector graphics for Mind Map/Gantt (scalable)
- **PDF:** Optional, nice-to-have for print

**Technical Approach:**
- **Kanban/Outline:** Use html2canvas library
- **Mind Map:** Canvas screenshot (already rendered on canvas)
- **Gantt:** SVG export (timeline is SVG-based or could be)

**UI:** Export button in view-specific settings pane

**Project Export (All Views):**
- ZIP file containing PNG/SVG of each view
- OR Multi-page PDF with one view per page
- User selects which views to include in export

---


### Dark Mode Architecture

**Approach:**
- Define CSS variables for all colors at `:root`
- Create `[data-theme="light"]` and `[data-theme="dark"]` selectors
- Toggle theme by changing `data-theme` attribute on `<body>`

**System Preference Detection:**
```javascript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

**Manual Toggle:** Button in settings pane overrides system preference

**Persistence:** Save theme choice to localStorage

**Color Adjustments:**
- Status colors: Ensure WCAG AA contrast in both modes
- Background/foreground inversion
- Borders, dividers, shadows
- Mind Map lines and node backgrounds

**Testing:** Use contrast checker for all color combinations
