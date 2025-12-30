# Task Manager (Multi‑View) — CLAUDE.md (recurring CLI dev, token‑optimized)

Browser-only **vanilla JS** task manager with 4 views (Outline/Kanban/Gantt/Mind Map) over **one store**.
Source of truth lives in `src/store.js`.

This guide reflects **`/src`**.

---

## 1) Minimal context you should assume

- No framework. Code is plain JS manipulating the DOM.
- App boot:
  - `src/main.js` instantiates `window.app = new App()` on DOMContentLoaded.
  - `src/app.js` wires settings + store, then `render()`.
- Rendering is **imperative**: views re-build the container HTML and re-bind listeners each render.
- Persistence:
  - Settings are stored in `localStorage` via `src/settings.js`.
  - Tasks are currently initialized in-memory via `TaskStore.getInitialData()` (sample data).
  - Import/export exists in `src/ui/modals.js`.

---

## 2) Source map (what each file does)

### App + bootstrap
- `src/main.js` — entry point; creates `new App()` on DOM ready.
- `src/app.js` — top-level controller:
  - owns: `settings`, `store`, `currentView`, `mindmapMode`, `relateLinkMode`, `relateSource`, `selectedTask`.
  - `handleRelateModeClick(taskId)` — handles relate mode for bidirectional task linking.
  - global shortcuts: undo/redo (Ctrl/Cmd+Z / redo).
  - `render()` calls `renderSettingsPane(app)` then the selected view renderer.
  - detail panel & modals are delegated to `src/ui/modals.js`.

### State
- `src/store.js` — **TaskStore** (single source of truth)
  - `tasks` tree, `nextId`, `collapsed` set
  - `projects` array with per-project colors (`statusColors`, `priorityColors`)
  - **Related Tasks** (replaces old dependencies):
    - `relatedTasks` Map<taskId, taskId[]> (bidirectional task relationships)
    - `addRelatedTask(id1, id2)` / `removeRelatedTask(id1, id2)` — manages bidirectional links
    - `getRelatedTasks(taskId)` — returns array of related task IDs
    - `relatedFilterTaskId` (when set, filters to show only related tasks)
  - **Per-Project Colors**:
    - `getDefaultStatusColors()` / `getDefaultPriorityColors()` — default color maps
    - `getTaskColors(taskId)` — returns project-specific colors for a task
  - filters:
    - status: `selectedFilters` Set (multi-select status filters)
    - search: `searchQuery`
    - parent: `selectedParents` Set (root task IDs), `parentFilterInitialized`
    - mode: `filterMode` ('show' = dim non-matching | 'filter' = hide non-matching)
    - related: `relatedFilterTaskId` (show only tasks related to this task)
  - **Filter application order**: Parent filter → Status/Search/Related filter → View rendering
  - view toggles (per-view badge visibility):
    - Outline: `showAssigneeInOutline`, `showPriorityInOutline`, `showDescriptionsInOutline`
    - Kanban: `showAssigneeInKanban`, `showPriorityInKanban`, `showDescriptionsInKanban`
    - Gantt: `showAssigneeInGantt`, `showPriorityInGantt`, `showDescriptionsInGantt`
    - Mind Map: `showMindMapAssignee`, `showMindMapPriority`, `showMindMapDescription`
    - plus: `sortByPriority`
  - Undo/redo: `history`, `historyIndex`, `saveState()/undo()/redo()` (deep copy tasks + deps)
  - Outline import/export helpers:
    - `tasksToOutlineText()` (serializes tasks to indented text with inline metadata markers)
    - `outlineTextToTasks()` + `parseOutlineAndUpdate()`

### Settings
- `src/settings.js` — Settings manager
  - `defaults` includes global + per-view settings
  - `get(path)` / `set(path,value)` using dot paths
  - persists to localStorage key `taskManagerSettings`

### UI glue
- `src/ui/toolbar.js` — `renderSettingsPane(app)`
  - builds the view-specific settings pane (filters/search/sorts/parent filter)
  - relate mode button for linking tasks bidirectionally
  - related filter display when filtering by related tasks
  - search applies on **Enter**; clears when empty
  - parent filter is a multi-select dropdown for root-level tasks:
    - initialized with all parents selected by default
    - dropdown stays open while making selections
    - click outside to close and trigger `app.render()`
    - auto-selection: new parents auto-added to `selectedParents` when created/outdented
- `src/ui/modals.js` — modal/panel helpers
  - add-task modal (title/desc/parent)
  - global settings modal (Behavior tab only)
  - toast helper
- `src/index.template.html` — layout includes:
  - **Dark mode toggle** in toolbar (top-right, `#darkModeToggle`)
  - **Sidebar footer** with Settings section:
    - Preferences button (`#settingsBtn`) — opens global settings modal
    - Export button (`#exportDataBtn`) — exports JSON data
    - Import button (`#importDataBtn`) — imports JSON data

### Views
- `src/views/outline.js` — hierarchical outline editor
  - `contenteditable` inline title editing
  - `#` delimiter in title input sets description (escaped `\#` supported)
  - keyboard:
    - Enter creates new sibling **below** the current task row
    - Tab/Shift+Tab indent/outdent (moves in tree); outdenting to root auto-adds to `selectedParents`
    - Delete removes
    - Ctrl/Cmd+Z handled globally in `app.js`
- `src/views/kanban.js` — status columns board
  - **Only shows subtasks** (leaf tasks with a parent; excludes root-level parent tasks)
  - Mode toggle: Status (todo/in-progress/review/done) vs Priority (low/medium/high)
  - Drag-and-drop updates task's status or priority depending on mode
- `src/views/gantt.js` — timeline bars from start/end dates + dependencies
- `src/views/mindmap.js` — layout visualization + node modal
  - Dual layouts: Tree (top-down) vs Radial (circular)
  - Scroll wheel zoom (toward mouse cursor)
  - 3D transforms (`translate3d`, `perspective`) for crisp rendering at all zoom levels

### Shell
- `src/index.template.html` — base HTML w/ placeholders like `INJECT_STYLES`, app layout, modals, panels.
- `src/styles.css` — app styling.

---

## 3) Runtime flow (mental model)

1. `main.js` ⇒ `new App()`.
2. `App.constructor()`:
   - `this.settings = new Settings()`
   - `this.store = new TaskStore()`
   - loads current view + mindmap layout mode from settings
   - applies dark mode class to body
   - subscribes to store: `this.store.subscribe(() => this.render())`
   - binds top-level UI handlers (view switch, settings, add-task, undo/redo)
   - calls `render()`
3. `App.render()`:
   - `renderSettingsPane(this)` builds the settings pane for the active view
   - updates view switcher active state
   - calls one of:
     - `renderOutlineView(this, container)`
     - `renderKanbanView(this, container)`
     - `renderGanttView(this, container)`
     - `renderMindMapView(this, container)`

**Re-render policy:** Most store mutations call `saveState()` then `notify()` which triggers full re-render.

---

## 4) Data model + invariants (important when editing)

### Task shape
```js
{
  id: string,
  title: string,
  description: string,
  metadata: {
    status: 'todo'|'in-progress'|'review'|'done',
    priority: 'low'|'medium'|'high',
    assignee: string,
    startDate: 'YYYY-MM-DD'|'' ,
    endDate: 'YYYY-MM-DD'|''
  },
  children: Task[]
}
```

### Project shape
```js
{
  id: string,
  name: string,
  color: string,                    // project badge color
  statusColors: {                   // per-project status colors
    'todo': '#hex',
    'in-progress': '#hex',
    'review': '#hex',
    'done': '#hex'
  },
  priorityColors: {                 // per-project priority colors
    'low': '#hex',
    'medium': '#hex',
    'high': '#hex'
  }
}
```

### Related Tasks (bidirectional)
- Stored in `store.relatedTasks` Map<taskId, taskId[]>
- Both directions stored (A→B and B→A) for fast lookups
- Displayed as badges in all views with click-to-filter behavior
- Managed via detail panel in `App.showDetailPanel()`

### Store invariants to preserve
- `id` must be unique across the full tree.
- Any operation that changes tasks or related tasks should:
  1) update the in-memory structure
  2) call `saveState()`
  3) call `notify()`
- Related tasks are **bidirectional** — adding A→B also adds B→A automatically.
- **Parent filter** (`getFilteredTasks()`):
  - Uses root-level task IDs in `selectedParents` Set
  - Applied FIRST, before status/search filters
  - Always filters when `parentFilterInitialized` and `selectedParents` not empty (no optimization skipping)
  - Auto-selection: new parents auto-added when created (store.js) or outdented to root (outline.js)

### Undo/redo constraints
- `saveState()` deep copies tasks and clones `relatedTasks` map.
- If you mutate nested task objects directly, still call `saveState()` afterwards.

---

## 5) Change patterns (how to implement without breaking the app)

### Add a new field to tasks
- Update:
  - `TaskStore.addTask()` default metadata
  - `TaskStore.outlineTextToTasks()` default metadata + parser
  - `TaskStore.tasksToOutlineText()` serializer
  - detail panel markup in `App.showDetailPanel()` (app.js)
  - any view that displays it (outline/kanban/gantt/mindmap)

### Modify filtering/search behavior
- Search/filter state lives in `TaskStore`:
  - flat task filtering: `getFilteredFlatTasks()`
  - hierarchical filtering: `getFilteredTasks()` sets `_matches` on each task
- Settings pane UI is in `renderSettingsPane(app)`.

### Add a new view
- Add renderer `src/views/<newview>.js` exporting `renderXView(app, container)`
- Update:
  - view switcher buttons in `index.template.html`
  - `App.render()` switch
  - settings pane config in `toolbar.js`

### Don’t scatter event listeners
Because views rebuild innerHTML on each render, listeners must be attached **inside the render function** (or use event delegation on a stable parent).

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
---

## 6) Debugging checklist (fast)

- If UI seems stale: verify store mutations call `notify()`.
- If undo/redo behaves oddly: ensure changes call `saveState()`.
- If an element loses focus on re-render: use the existing "focus after render" pattern in `outline.js` (e.g., `app.focusTaskAfterRender`).
- If parent filter doesn't work:
  - Check `parentFilterInitialized` and `selectedParents` in `store.js` and `toolbar.js`
  - Verify filter order: parent filter applies FIRST in `getFilteredTasks()`
  - Check auto-selection logic in outline.js (Enter key, Shift+Tab) and store.js (addTask)
- If Kanban shows wrong tasks: verify `getFlatLeafTasks()` excludes root-level tasks (`isRootLevel` parameter)
- If dropdown closes unexpectedly: check that checkbox handlers don't call `app.render()` (only click-outside should)
- If relate mode doesn't work in a view: check that the view's click handler checks `app.relateLinkMode` before selection logic
- If related filter shows wrong tasks: verify `getRelatedTasks()` returns both directions and `relatedFilterTaskId` is set correctly

---

## 7) What NOT to do (keeps merges painless)

- Don’t introduce a framework or build-time dependency without a clear reason.
- Don’t store UI-only state inside tasks unless it’s meant to be exported/imported.
- Don’t forget to update outline import/export if you change task metadata.

---

## 8) Pointers (where things usually live)

- Add/edit task fields UI: `App.showDetailPanel()` in `src/app.js`
- Add-task modal: `src/ui/modals.js`
- View-specific controls: `src/ui/toolbar.js`
- Filters/search/parent filtering: `src/store.js` + `toolbar.js`
- Outline UX quirks: `src/views/outline.js`
- Related tasks UX: `App.handleRelateModeClick()` (app.js) + all view badges
- Global settings access: Sidebar footer in `index.template.html` (`#settingsBtn`, `#exportDataBtn`, `#importDataBtn`)
- Dark mode toggle: Toolbar right side in `index.template.html` (`#darkModeToggle`)
- Per-project color settings: `App.showProjectSettings()` in `src/app.js`

