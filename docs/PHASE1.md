# Phase 1 - Electron + Local API + SQLite (Local-First App)

Goal: Ship a local desktop app with a local HTTP API and SQLite persistence. Manual tasking remains free and fully functional.

## Outcomes
- Electron app launches `dist/task-manager.html`.
- Local HTTP API on `127.0.0.1` with token auth.
- SQLite persistence replaces `localStorage` and in-memory sample data.
- Settings and tasks load/save through the local API.
- Import JSON is available in Settings (prompted by user).

## Deliverables
- Electron bootstrap (`electron/main.js`, `electron/preload.js`)
- Local API server (`server/api.js`, `server/token.js`)
- SQLite bootstrap + schema (`server/db.js`, `server/migrations/001-init.sql`)
- Repo layer (`server/repo/*.js`)
- Renderer API client (`src/api/client.js`)
- Store sync (`src/api/store-sync.js`)
- UI wired to API (`src/store.js`, `src/settings.js`, `src/app.js`, `src/ui/modals.js`)
- Settings import prompt (`src/index.template.html`, `src/ui/modals.js`)

## Task Breakdown
1) Electron bootstrap
   - Create `electron/main.js` (create window, load dist HTML)
   - Create `electron/preload.js`
   - Add scripts to `package.json` for build and launch

2) Local API server
   - Create Fastify server in `server/api.js`
   - Bind to `127.0.0.1`
   - Add token auth via `server/token.js`
   - Add `/health` route

3) SQLite persistence
   - Add `server/db.js` with migration runner
   - Add `server/migrations/001-init.sql`
   - Use UUIDs for task/project IDs

4) Data access layer
   - `server/repo/projects.js` CRUD
   - `server/repo/tasks.js` CRUD + tree queries
   - `server/repo/dependencies.js` CRUD
   - `server/repo/settings.js` get/set

5) API endpoints
   - Projects, tasks, dependencies, settings
   - JSON responses only
   - Token required for all routes

6) Renderer API client
   - `src/api/client.js` with base URL + auth header
   - `src/api/store-sync.js` for app CRUD

7) App wiring
   - Replace `localStorage` in `src/settings.js` with API calls
   - Replace in-memory sample data in `src/store.js` with API data
   - Update `src/app.js` to await `loadAppData()` before render

8) Import flow (Settings only)
   - Add Import button in settings modal
   - Import JSON via API inserts
   - Map legacy IDs to new UUIDs

9) Export flow
   - Export uses API snapshot (not in-memory store)

## Key Decisions
- Persistence: SQLite.
- API: local HTTP on localhost only.
- Auth: local token file with bearer header.
- Import: user-triggered from Settings.

## Acceptance Criteria
- App opens and persists tasks across restarts.
- Manual tasking works without API errors.
- Import/export still works and matches prior schema.
- All views render from API data.

## Risks / Notes
- Undo/redo uses store snapshots; verify behavior after API migration.
- Task tree ordering requires stable `sort_index`.
- Mind map state may need `app_state` table if persisted later.

