# Contributing

Thanks for helping improve Task Manager. This repo is designed to be fully offline by default, so please avoid adding dependencies on external services unless clearly documented.

## Getting started
1) Install Node `v20.12.2` (use `nvm use`).
2) Install dependencies: `npm ci`
3) Run the API: `npm run api`
4) Run the app: `npm start`

## Development notes
- This app is vanilla JS + Electron + Fastify.
- Avoid editing `dist/` directly. Always run `npm run build`.
- Keep changes small and easy to review when possible.

## Tests
- Run the full suite: `npm test`
- Add or update tests when you change behavior.

## Pull requests
- Describe the change, motivation, and testing done.
- Keep diffs focused; avoid formatting-only changes.
- If you add a feature, update docs as needed.

## Reporting issues
Please include:
- OS and Node version
- Steps to reproduce
- Expected vs actual behavior
- Logs or screenshots if helpful
