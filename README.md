# Task Manager

Offline-first task manager built with Electron, a local Fastify API, and SQLite. It runs entirely on your machine and keeps data local by default.

## Highlights
- Local-first: no external services required to run
- Multiple views: Outline, Kanban, Gantt, Mind Map
- Project + task modeling with dependencies/related links
- Import/export and settings stored via the local API
- MCP server for local AI tooling integration

## Screenshot
Add a screenshot at `docs/screenshot.png` and update this section when ready.

## Quick start
```sh
nvm use
npm ci
```

Terminal 1 (API):
```sh
npm run api
```

Terminal 2 (app):
```sh
npm start
```

## Requirements
- Node `v20.12.2` (`nvm use` reads `.nvmrc`)
- npm 10+ (bundled with Node 20)
- Build tools: Xcode CLT on macOS, Desktop Dev Kit on Windows (for native rebuilds)

## Development workflow
- `npm run build` – bundle static HTML/JS to `dist/task-manager.html`
- `npm run api` – start the Fastify API server
- `npm start` – build then launch Electron
- `npm test` – run the test suite
- `npm run rebuild:native` – rebuild native deps (e.g., `better-sqlite3`)

## Troubleshooting
- Do not sync `node_modules` across machines.
- After switching OS or pulling a fresh clone:
  ```sh
  rm -rf node_modules
  npm ci
  ```
- If native module errors appear:
  ```sh
  npm run rebuild:native
  ```

## Data locations
- API token: `~/.task-manager-token`
- SQLite database: `~/.task-manager/task-manager.db`
- App logs: `~/Library/Application Support/Task Manager/logs/errors.log` (macOS)

## Security & privacy
- All data is stored locally by default.
- Optional opt-in telemetry only sends error stack traces and app version. No task content or API keys.
- See `SECURITY.md` for vulnerability reporting.

## Architecture
See `Architecture.md` for a deeper overview of the runtime flow and data model.

## Contributing
See `CONTRIBUTING.md` for setup, testing, and pull request guidelines.

## License
MIT. See `LICENSE`.
