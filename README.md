# Task Manager (Electron + Fastify)

Cross-platform setup notes to keep macOS/Windows installs clean and avoid native module issues.

## Prereqs
- Node `v20.12.2` (`nvm use` will pick this up from `.nvmrc`)
- npm 10+ (comes with Node 20)
- Build tools: Xcode CLT on macOS, Desktop Dev Kit on Windows (for native rebuilds)

## Install (per machine)
```sh
nvm use          # or install the matching Node if prompted
npm ci           # fresh install to get native binaries for this OS/arch
```

## Running
- API: `npm run api`
- App: `npm start` (builds `dist/task-manager.html` then launches Electron)

## Switching between macOS and Windows
- Do **not** sync `node_modules` between machines (cloud sync can also strip execute bits).
- After pulling or switching machines:  
  ```sh
  rm -rf node_modules
  npm ci
  ```
- If you hit native module errors, rebuild locally:  
  ```sh
  npm run rebuild:native
  ```

## Scripts
- `npm run build` – bundle static HTML/JS to `dist/task-manager.html`
- `npm run api` – start the Fastify API server
- `npm start` – build then launch Electron
- `npm run rebuild:native` – rebuild native deps (e.g., `better-sqlite3`) for the current platform

## Notes
- Keep `package-lock.json` committed so all platforms share the same dependency graph.
- Use `path.join`/Electron APIs for paths; avoid hardcoded separators.
