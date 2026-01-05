# Offline Task Manager Architecture

## Overview
This codebase is an offline-first task manager desktop app built with Electron, a local Fastify API, and a SQLite database. The UI is a single-page HTML app bundled into `dist/task-manager.html`, loaded by Electron. Data stays on the machine by default and is accessed via the local API.

## Runtime Architecture
- **Electron shell**: `electron/main.js` launches a BrowserWindow and loads `dist/task-manager.html`. A preload script (`electron/preload.js`) exposes a token getter to the renderer.
- **Local API**: `server/api.js` runs Fastify on `127.0.0.1:3123`, with a Bearer token read from `~/.task-manager-token`. CORS is wide-open for local UI calls.
- **Database**: `server/db.js` opens a SQLite DB at `~/.task-manager/task-manager.db` and applies migrations in `server/migrations/`.
- **MCP server**: `server/mcp/index.js` starts a Model Context Protocol server when the SDK is installed, exposing task/project tools for local AI integrations.

## Client App Structure
- **Renderer**: `src/index.template.html` provides the app shell and view containers. CSS lives in `src/styles.css`.
- **Build**: `scripts/build.js` inlines CSS and JS into `dist/task-manager.html` (no bundler, concatenation order is explicit).
- **State**: `src/store.js` is the in-memory source of truth with undo/redo, filtering, and project/team management.
- **Settings**: `src/settings.js` stores app settings in the API `settings` table (keyed under `taskManagerSettings`).
- **API sync**: `src/api/client.js` and `src/api/store-sync.js` poll the API, hydrate the store, and push changes back (including rollup status updates and container color fixes).

## Data Model (SQLite)
Defined by migrations in `server/migrations/`:
- **projects**: `id`, `name`, `color`, optional JSON `status_colors`, `priority_colors`, and `team_ids`.
- **tasks**: `id`, `parent_id`, `project_id`, `title`, `description`, `status`, `priority`, `assignee`, `start_date`, `end_date`, `kanban_order`, `container_color`, `sort_index`.
- **related_tasks**: bidirectional related links.
- **settings**: key/value store for app settings.

## Key Features
- **Multiple views**: Outline, Kanban, Gantt, and Mind Map in `src/views/`.
- **Hierarchy**: Tasks can be nested; outline view supports drag/drop and paste with tree persistence.
- **Projects and teams**: Projects have colors and optional per-project team assignments; teams have members and default assignees.
- **Status rollups**: Parent task status is derived from child statuses.
- **Dependencies and related tasks**: Explicit modeling for task linkage and cross-references.
- **Offline import/export**: JSON import/export handled in UI (see `src/ui/modals.js`).
- **Local API status monitoring**: UI polls `/health` and shows connectivity state.

## Design Choices Worth Noting
- **Local-first + API abstraction**: Even the desktop UI uses HTTP calls to a local API, keeping DB logic server-side.
- **Token auth for localhost**: The renderer uses a token from the preload script, keeping API access explicit.
- **No build tooling**: The app is assembled by concatenating scripts/styles into a single HTML file, keeping the runtime simple.
- **Schema flexibility**: Project colors and teams are stored as JSON to avoid frequent schema changes.
- **Polling sync**: The renderer periodically refreshes from the API to keep UI state aligned with DB.