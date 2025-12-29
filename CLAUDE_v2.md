# Task Manager (Multi-View) — CLAUDE.md (recurring CLI dev, token-optimized)

Electron + local API **vanilla JS** task manager with 4 views (Outline/Kanban/Gantt/Mind Map) over **one store**.
Source of truth lives in SQLite via the local API; `src/store.js` is the in-memory model synced from the API.

This guide reflects **`/src`**.

---

## 1) Minimal context you should assume

- No framework. Code is plain JS manipulating the DOM.
- App boot:
  - `src/main.js` uses `App.create()` to load API data before render.
  - `src/app.js` wires settings + store + API status, then `render()`.
- Rendering is **imperative**: views re-build the container HTML and re-bind listeners each render.
- Persistence:
  - Settings stored in SQLite via local API (`server/settings`).
  - Tasks/projects/dependencies/related links stored in SQLite via local API.
  - Import/export uses API snapshots and UUID remapping.
- **Build process**: Run `node scripts/build.js` to compile `src/` into `dist/task-manager.html`

---

## 2) Source map (what each file does)

### App + bootstrap
- `src/main.js` — entry point; creates `new App()` on DOM ready.
- `src/app.js` — top-level controller:
  - owns: `settings`, `store`, `apiClient`, `currentView`, `mindmapMode`, `linkMode`, `selectedTask`.
  - global shortcuts: undo/redo (Ctrl/Cmd+Z / redo) — **skips Mind Map view** (has own undo).
  - `render()` calls `renderSettingsPane(app)` then the selected view renderer.
  - detail panel & modals are delegated to `src/ui/modals.js`.
  - **Project state persistence**: loads/saves `selectedProjectId` and `projectViewMode` to settings.
  - API status badge in toolbar (polls `/health`).

### State
- `src/store.js` — **TaskStore** (single source of truth)
  - `tasks` tree, `nextId`, `collapsed` set
  - `dependencies` Map<taskId, taskId[]> ("this task depends on")
  - filters:
    - status: `selectedFilters` Set (multi-select status filters)
    - search: `searchQuery`
    - parent: `selectedParents` Set (root task IDs), `parentFilterInitialized`
    - mode: `filterMode` ('show' = dim non-matching | 'filter' = hide non-matching)
  - **Filter application order**: Project filter → Parent filter → Status/Search filter → View rendering
  - view toggles (per-view badge visibility):
    - Outline: `showAssigneeInOutline`, `showPriorityInOutline`, `showDescriptionsInOutline`
    - Kanban: `showAssigneeInKanban`, `showPriorityInKanban`, `showDescriptionsInKanban`
    - Gantt: `showAssigneeInGantt`, `showPriorityInGantt`, `showDescriptionsInGantt`
    - Mind Map: `showMindMapAssignee`, `showMindMapPriority`, `showMindMapDescription`
  - **Kanban sorting**: `kanbanSortMode` ('default' | 'priority' | 'manual')
  - Undo/redo: `history`, `historyIndex`, `saveState()/undo()/redo()` (deep copy tasks + deps + projects)
  - Outline import/export helpers:
    - `tasksToOutlineText()` (serializes tasks to indented text with inline metadata markers)
    - `outlineTextToTasks()` + `parseOutlineAndUpdate()`

### Settings
- `src/settings.js` — Settings manager
  - `defaults` includes global + per-view settings
  - `get(path)` / `set(path,value)` using dot paths
  - persists via local API key `taskManagerSettings`
  - **Persisted project state**: `projectViewMode`, `selectedProjectId`

### UI glue
- `src/ui/toolbar.js` — `renderSettingsPane(app)`
  - builds the view-specific settings pane (filters/search/sorts/parent filter)
  - search applies on **Enter**; clears when empty
  - parent filter is a multi-select dropdown for root-level tasks
  - **Kanban sort button**: cycles through Default → Priority → Manual
- `src/ui/modals.js` — modal/panel helpers
  - add-task modal (title/desc/parent)
  - global settings modal (tabs)
  - **import/export JSON** (tasks, dependencies, **projects**, settings) — v1.1 format
  - toast helper

### Views
- `src/views/outline.js` — hierarchical outline editor
  - `contenteditable` inline title editing
  - `#` delimiter in title input sets description (escaped `\#` supported)
  - keyboard:
    - Enter creates new sibling **below** the current task row
    - Tab/Shift+Tab indent/outdent (moves in tree); outdenting to root auto-adds to `selectedParents`
    - Delete removes
    - Ctrl+C/X/V for copy/cut/paste (pasted root tasks auto-added to `selectedParents`)
    - Ctrl/Cmd+Z handled globally in `app.js`
  - Drag-and-drop reordering with drop zones (above/below/as child)

- `src/views/kanban.js` — status columns board
  - **Only shows subtasks** (leaf tasks with a parent; excludes root-level parent tasks)
  - Mode toggle: Status (todo/in-progress/review/done) vs Priority (low/medium/high)
  - Drag-and-drop updates task's status or priority depending on mode
  - **Manual ordering**: drag within column saves `kanbanOrder` to task metadata
  - **Sort modes**: Default, Priority (high→low), Manual (by `kanbanOrder`)

- `src/views/gantt.js` — timeline bars from start/end dates + dependencies
  - Zoom levels: quarters/months/weeks/days
  - Project grouping with collapsible headers
  - Task row and bar clicks open detail panel (uses `stopPropagation` to prevent conflicts)

- `src/views/mindmap.js` — layout visualization + node modal
  - **Dual layouts**: Tree (top-down) vs Radial (circular)
  - **Multiple parents**: displays all filtered root tasks horizontally
  - Scroll wheel zoom (toward mouse cursor)
  - 3D transforms (`translate3d`, `perspective`) for crisp rendering at all zoom levels
  - **Edit mode** (toggle button):
    - Drag nodes to reposition (saves to `app.mindmapCustomPositions`)
    - Click lines to change connection points (saves to `app.mindmapConnectionPoints`)
    - Moving parent also moves children relatively
  - **Line controls**:
    - Length: Compact / Normal / Expanded (multiplies spacing)
    - Style: Straight / Angled (right-angle lines turn near child node)
  - **Mind Map undo/redo** (Ctrl+Z / Ctrl+Y):
    - Separate from global undo (app.js skips Mind Map view)
    - Tracks: positions, connections, lineLength, lineStyle
    - History stored in `app.mindmapHistory`
  - **Root node styling**: project color filled background with white text

### Shell
- `src/index.template.html` — base HTML w/ placeholders like `INJECT_STYLES`, app layout, modals, panels.
- `src/styles.css` — app styling.
- `scripts/build.js` — combines template + styles + JS into single HTML file

---

## 3) Runtime flow (mental model)

1. `main.js` ⇒ `new App()`.
2. `App.constructor()`:
   - `this.settings = new Settings(apiClient)`
   - `this.store = new TaskStore()`
   - loads current view + mindmap layout mode from settings
   - loads saved mind map layout (positions/connection points/line style/length)
   - **loads project state** (`projectViewMode`, `selectedProjectId`) from settings
   - applies dark mode class to body
   - subscribes to store: `this.store.subscribe(() => this.render())`
   - binds top-level UI handlers (view switch, settings, add-task, undo/redo)
   - calls `render()`
3. `App.render()`:
   - `renderSettingsPane(this)` builds the settings pane for the active view
   - updates view switcher active state
   - renders project sidebar
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
  projectId: string | null,  // Only on root tasks
  metadata: {
    status: 'todo'|'in-progress'|'review'|'done',
    priority: 'low'|'medium'|'high',
    assignee: string,
    startDate: 'YYYY-MM-DD'|'',
    endDate: 'YYYY-MM-DD'|'',
    kanbanOrder: number      // For manual Kanban sorting
  },
  children: Task[]
}
```

### Project shape
```js
{
  id: string,
  name: string,
  color: string,  // hex color from palette
  statusColors: { todo, in-progress, review, done },
  priorityColors: { low, medium, high }
}
```

### Store invariants to preserve
- `id` must be unique across the full tree.
- Any operation that changes tasks, dependencies, or projects should:
  1) update the in-memory structure
  2) call `saveState()`
  3) call `notify()`
- Dependencies are **"task depends on other task"**.
- **Project filter** (`getFilteredTasks()`):
  - Applied FIRST when `projectViewMode === 'project'`
  - Then parent filter, then status/search filter
- **Parent filter**:
  - Uses root-level task IDs in `selectedParents` Set
  - Auto-selection: new parents auto-added when created, outdented, or pasted

### Undo/redo constraints
- `saveState()` deep copies tasks, dependencies, projects, and nextProjectId.
- If you mutate nested task objects directly, still call `saveState()` afterwards.
- **Mind Map has separate undo/redo** — global undo in app.js skips mindmap view.

---

## 5) Change patterns (how to implement without breaking the app)

### Add a new field to tasks
- Update:
  - `TaskStore.addTask()` default metadata
  - `TaskStore.outlineTextToTasks()` default metadata + parser
  - `TaskStore.tasksToOutlineText()` serializer
  - detail panel markup in `App.showDetailPanel()` (app.js)
  - any view that displays it (outline/kanban/gantt/mindmap)
  - **import/export** in `src/ui/modals.js` if field should persist

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

### Don't scatter event listeners
Because views rebuild innerHTML on each render, listeners must be attached **inside the render function** (or use event delegation on a stable parent).

### When Adding a Feature
1. Update TaskStore if new data properties are needed
2. Update `saveState()` to include new data in state snapshots
3. Update render functions for affected views
4. Add necessary UI interaction logic
5. Test all views and undo/redo functionality
6. **Run build**: `node scripts/build.js`

### When Fixing a Bug
1. Reproduce the exact steps to trigger the bug
2. Find the relevant code section using line numbers above
3. Identify root cause (don't fix symptoms)
4. Make minimal, targeted change
5. Test fix and run regression tests
6. Verify undo/redo still works
7. **Run build**: `node scripts/build.js`

### Critical Rules
- **ALWAYS** call `saveState()` before TaskStore mutations
- **ALWAYS** call `notify()` after TaskStore mutations
- **NEVER** modify tasks directly - use TaskStore methods (findTask, updateTask, addTask, deleteTask)
- **NEVER** mix coordinate systems in Mind Map (use pixels everywhere, no SVG viewBox)
- Use `data-task-id` attributes for dynamic element lookups
- Use `e.stopPropagation()` when click handlers shouldn't trigger parent handlers (detail panel, etc.)

---

## 6) Debugging checklist (fast)

- If UI seems stale: verify store mutations call `notify()`.
- If undo/redo behaves oddly: ensure changes call `saveState()`.
- If an element loses focus on re-render: use the existing "focus after render" pattern in `outline.js` (e.g., `app.focusTaskAfterRender`).
- If parent filter doesn't work:
  - Check `parentFilterInitialized` and `selectedParents` in `store.js` and `toolbar.js`
  - Verify filter order: project → parent → status/search in `getFilteredTasks()`
  - Check auto-selection logic in outline.js (Enter key, Shift+Tab, paste) and store.js (addTask)
- If Kanban shows wrong tasks: verify `getFlatLeafTasks()` excludes root-level tasks (`isRootLevel` parameter)
- If dropdown closes unexpectedly: check that checkbox handlers don't call `app.render()` (only click-outside should)
- If clicks only work once: check for `handleClickOutside` conflicts, add `e.stopPropagation()`
- If Mind Map undo doesn't work: check that app.js skips mindmap view for global undo
- **Changes not appearing**: Did you run `node scripts/build.js`?

---

## 7) What NOT to do (keeps merges painless)

- Don't introduce a framework or build-time dependency without a clear reason.
- Don't store UI-only state inside tasks unless it's meant to be exported/imported.
- Don't forget to update outline import/export if you change task metadata.
- Don't forget to run the build script after making changes.

---

## 8) Pointers (where things usually live)

- Add/edit task fields UI: `App.showDetailPanel()` in `src/app.js`
- Add-task modal: `src/ui/modals.js`
- View-specific controls: `src/ui/toolbar.js`
- Filters/search/parent filtering: `src/store.js` + `toolbar.js`
- Outline UX quirks: `src/views/outline.js`
- Dependencies UX: `App.handleLinkModeClick()` (app.js) + gantt/mindmap/outline badges
- Project sidebar: `App.renderProjectSidebar()` in `src/app.js`
- Import/export: `exportData()` / `importData()` in `src/ui/modals.js`

---

## 9) Projects Feature Architecture

### Overview
Projects group parent tasks (and their children) into folders. Each parent can belong to one project; children inherit from parent. Tasks without a project show under "Unassigned".

### Data Model

#### Store additions (`src/store.js`)
```js
// Project state
this.projects = [];                    // Array of {id, name, color}
this.nextProjectId = 1;
this.selectedProjectId = null;         // null = all, 'unassigned', or project ID
this.projectViewMode = 'global';       // 'global' | 'project'
this.projectColorPalette = [...];      // 10 default colors
```

### Project Methods (store.js)

| Method | Description |
|--------|-------------|
| `getProjects()` | Returns all projects |
| `getProject(id)` | Get single project by ID |
| `addProject(name)` | Create project with auto-assigned color |
| `updateProject(id, {name, color})` | Update project properties |
| `deleteProject(id)` | Delete project, unassign all tasks |
| `assignTaskToProject(taskId, projectId)` | Assign root task to project |
| `getTaskProject(taskId)` | Get project for any task (walks to root) |
| `findRootTask(taskId)` | Find root ancestor of any task |
| `setSelectedProject(id)` | Set project filter |
| `setProjectViewMode(mode)` | Set 'global' or 'project' mode |
| `getTasksByProject(projectId)` | Get tasks in a project |
| `getTasksGroupedByProject()` | Returns `[{project, tasks}]` for views |

### Persistence
- `selectedProjectId` and `projectViewMode` saved to settings (localStorage)
- Restored on app startup in `App.constructor()`
- `selectProject()` in app.js saves to settings when changed

### Undo/Redo
- `saveState()` includes `projects` and `nextProjectId`
- `restoreState()` restores projects (backward compatible)

### Import/Export (v1.1)
- Export includes: `tasks`, `nextId`, `dependencies`, `projects`, `nextProjectId`, `settings`
- Import handles projects with backward compatibility for v1.0 files

---

## 10) Mind Map Architecture

### State (stored on `app` object, not store)
```js
app.mindmapMode = 'tree' | 'radial';
app.mindmapCollapsed = new Set();         // Collapsed node IDs
app.mindmapLineLength = 'compact' | 'normal' | 'expanded';
app.mindmapLineStyle = 'straight' | 'angled';
app.mindmapEditMode = false;
app.mindmapCustomPositions = {};          // {taskId: {x, y}}
app.mindmapConnectionPoints = {};         // {taskId: {from: side, to: side}}
app.mindmapHistory = [];                  // Undo/redo stack
app.mindmapHistoryIndex = -1;
app.mindmapPanX, app.mindmapPanY, app.mindmapScale;  // Viewport state
```

### Edit Mode Features
- Toggle via "Edit Layout" button
- Nodes get move cursor and blue outline
- Drag nodes to reposition (delta applied to all descendants)
- Click lines to show connection point selector (top/bottom/left/right for each end)
- "Reset Positions" button clears custom positions

### Line Controls
- **Length button**: cycles Compact → Normal → Expanded
  - Multiplies level spacing (0.6x, 1.0x, 1.5x)
  - Clears custom positions when changed
- **Style button**: cycles Straight → Angled
  - Angled lines: vertical from parent, turn 40px above child, then to child
  - Distance threshold: uses straight lines if nodes < 100px apart

### Undo/Redo (Mind Map specific)
- Ctrl+Z / Ctrl+Y handled in `mindmap.js` (app.js skips mindmap view)
- History stores: positions, connections, lineLength, lineStyle
- Saved after: node drag, connection point change, line length/style button click
- Max 50 history entries

### Visual Features
- Root nodes with projects: filled with project color, white text
- Child nodes with projects: tinted background, project color border
- SVG lines with project colors
- Collapse buttons: blue (+/-) for one level, green (⊕/⊖) for all descendants

---

## 11) Kanban Sort Modes

### `kanbanSortMode` (store.js)
- `'default'`: natural order from task tree
- `'priority'`: high → medium → low
- `'manual'`: by `task.metadata.kanbanOrder`

### Manual Ordering
- Drag task within column to reorder
- On drop, all tasks in column get sequential `kanbanOrder` values (0, 1, 2...)
- Order persists across sessions (saved in task metadata)

### UI
- Sort button in toolbar cycles: Default → Priority → Manual
- Button shows current mode: "↕️ Sort: Manual"

---

## 12) CSS Classes Reference

| Class | Purpose |
|-------|---------|
| `.project-sidebar` | Left sidebar container |
| `.project-item` | Individual project row |
| `.project-color-dot` | Color indicator circle |
| `.project-settings-btn` | Gear icon (shows on hover) |
| `.project-settings-page` | Settings page container |
| `.color-picker` / `.color-swatch` | Color selection UI |
| `.drag-over` | Drop target highlight |
| `.drop-above/below/child` | Task drop zone indicators |
| `.mindmap-node` | Mind map node element |
| `.mindmap-line-editable` | Clickable line in edit mode |
| `.kanban-card` | Kanban task card |
| `.gantt-bar` | Gantt timeline bar |
| `.detail-panel` | Right slide-out panel |
