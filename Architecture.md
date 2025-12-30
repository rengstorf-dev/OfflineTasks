# Task Manager Architecture

## Overview
- Electron + local HTTP API + SQLite.
- Renderer is vanilla JS (no framework) and renders four views (Outline, Kanban, Gantt, Mind Map).
- SQLite is the source of truth; `src/store.js` is the in-memory model synced from the API.
- MCP server (StdIO) is bundled for local AI tooling and maps to the local HTTP API.

## Runtime Flow
1) `src/main.js` calls `App.create()` on DOMContentLoaded.
2) `App.create()` loads settings and API data, then constructs `new App({ settings, store, apiClient })`.
3) `App.render()` re-builds the view and re-binds event handlers.
4) Electron spawns the MCP server after the API is reachable.

## Persistence
- API: Fastify on `127.0.0.1:3123` with bearer token in `~/.task-manager-token`.
- DB: SQLite at `~/.task-manager/task-manager.db` with migrations in `server/migrations/`.
- Entities persisted: tasks, projects, dependencies, related tasks, settings.
- Mind map layout persists in settings only when changed (positions, connection points, line length/style).
- MCP server reads token from `~/.task-manager-token` (or `TM_API_TOKEN` / `TM_API_TOKEN_PATH`).

## Build and Run
- Build: `node scripts/build.js` => `dist/task-manager.html`.
- API: `npm run api`.
- Electron: `npm start` (build + launch).

## Key Files
- `src/app.js`: app controller, API status badge, view routing.
- `src/store.js`: TaskStore, undo/redo, filters, API writes.
- `src/settings.js`: settings persisted via API.
- `src/api/client.js`: API client, error reporting.
- `src/api/store-sync.js`: load/sync data from API on startup; periodic polling for external updates.
- `src/ui/modals.js`: import/export, settings modal, toasts.
- `src/ui/toolbar.js`: settings pane, parent filter dropdown.
- `src/views/*.js`: view renderers and interactions.
- `server/api.js`: API routes and auth.
- `server/db.js`: SQLite bootstrap + migrations.
- `server/repo/*.js`: DB access layer.
- `server/mcp/index.js`: MCP server entrypoint (StdIO).
- `server/mcp/tools.js`: MCP tool definitions + validation.
- `server/mcp/api-client.js`: MCP-to-API client.
- `electron/main.js`: Electron window bootstrap.
- `electron/preload.js`: exposes `electronAPI.getToken()`.

## Data Model
Task:
```js
{
  id: string,
  title: string,
  description: string,
  projectId: string | null,
  metadata: {
    status: 'todo'|'in-progress'|'review'|'done',
    priority: 'low'|'medium'|'high',
    assignee: string,
    startDate: 'YYYY-MM-DD'|'',
    endDate: 'YYYY-MM-DD'|'',
    kanbanOrder: number
  },
  children: Task[]
}
```

Project:
```js
{
  id: string,
  name: string,
  color: string,
  statusColors: { todo, in-progress, review, done },
  priorityColors: { low, medium, high }
}
```

## Import/Export
- Uses API snapshot (tasks tree, projects, dependencies, related tasks, settings).
- Import remaps legacy IDs to UUIDs and rebuilds the tree via API.
- Import defaults parent filter to all parents selected.

## Notes
- Views re-render by replacing innerHTML; event listeners must be re-attached in renderers.
- Use `saveState()` then `notify()` after store mutations.
- Avoid editing `dist/`; always rebuild.
