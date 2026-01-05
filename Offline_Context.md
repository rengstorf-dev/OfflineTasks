# Offline Task Manager Developer Context

## Purpose
This doc is a fast on-ramp for fixing bugs or adding features. It points to the right files, data flows, and common gotchas.

## Where To Look First
- **Electron entry**: `electron/main.js` starts the window and (optionally) the MCP server.
- **Renderer boot**: `src/main.js` calls `App.create()` in `src/app.js`.
- **State model**: `src/store.js` is the central in-memory model (tasks, projects, teams, undo/redo).
- **Settings**: `src/settings.js` persists app settings via the local API.
- **API client + sync**: `src/api/client.js` and `src/api/store-sync.js` handle all HTTP calls and polling.
- **Views**: `src/views/outline.js`, `src/views/kanban.js`, `src/views/gantt.js`, `src/views/mindmap.js`.
- **UI helpers**: `src/ui/toolbar.js`, `src/ui/modals.js`.
- **Local API**: `server/api.js` (Fastify endpoints) and `server/repo/*.js` (SQLite CRUD).

## Build and Runtime Flow
- `scripts/build.js` concatenates JS/CSS into `dist/task-manager.html`.
- Electron loads `dist/task-manager.html` (no bundler).
- Renderer talks to the local API at `127.0.0.1:3123` with a token from `electron/preload.js`.

## Data Model (SQLite)
Defined in `server/migrations/`:
- **projects**: name/color + JSON `status_colors`, `priority_colors`, `team_ids`.
- **tasks**: hierarchy (`parent_id`), project linkage, metadata, sort index, container color.
- **dependencies** and **related_tasks**: cross-task links.
- **settings**: JSON blob for UI settings.

## Common Change Paths
- **Task fields / metadata**:
  - Server: `server/repo/tasks.js` (mapping + SQL).
  - Client: `src/store.js` task shape and update logic.
  - Views: update renderers in `src/views/*.js`.
  - API sync: `src/api/store-sync.js` normalization.
- **Project fields**:
  - Server: `server/repo/projects.js`.
  - Client: `src/store.js` project logic and settings.
- **Settings**:
  - Defaults in `src/settings.js`.
  - UI surface in `src/ui/modals.js` and view-specific settings in `src/ui/toolbar.js`.
- **New view**:
  - Add a view file in `src/views/`.
  - Wire into view switcher in `src/index.template.html` and `src/app.js`.
  - Include in `scripts/build.js` script order.

## Key Behaviors and Gotchas
- **Status rollups**: parent status derives from children (`src/store.js`).
- **Project assignment**: only root tasks carry `projectId`; children inherit via root.
- **Polling sync**: API polling every 5s; edits while typing should not trigger sync.
- **Container color**: stored in task metadata and auto-healed in `store-sync`.
- **MCP tools**: if you add API endpoints, consider updates in `server/mcp/tools.js`.

## Debugging Tips
- **API health**: UI checks `/health` and shows a status badge.
- **Token issues**: check `~/.task-manager-token`, preload reads it.
- **DB state**: DB lives at `~/.task-manager/task-manager.db`.
- **CORS/auth**: the API uses a strict Bearer token; missing token yields 401.

## When Adding Features
- Update both **client** (store + views) and **server** (repo + migrations if needed).
- If you add DB columns, create a migration and update `mapRowToTask` or project parsing.
- Ensure `scripts/build.js` includes any new JS files in the right order.
