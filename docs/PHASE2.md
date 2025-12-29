# Phase 2 - MCP Server + CLI Loop (Bundled)

Goal: Ship an MCP server bundled with the Electron app so AI CLI workflows can create tasks and update status in real time.

## Outcomes
- MCP server starts automatically with the app.
- MCP tools map directly to local HTTP API.
- CLI can create projects/tasks and advance work.
- Authentication enforced (local token).

## Deliverables
- MCP server (`server/mcp/index.js`)
- MCP tool definitions (`server/mcp/tools.js`)
- MCP API client (`server/mcp/api-client.js`)
- Electron starts MCP process after local API is ready
- MCP connection docs (`docs/mcp-setup.md`)

## Tool Surface (v0)
- create_project({name, description?, color?})
- create_tasks({projectId, tasks:[...]})
- list_tasks({projectId?, status?, limit?})
- get_next_task({projectId?, status? = 'todo'})
- update_task_status({taskId, status})
- get_task_detail({taskId})
- update_task({taskId, ...fields})

## Task Breakdown
1) MCP server scaffold
   - Use `@modelcontextprotocol/sdk`
   - StdIO transport (CLI connects locally)

2) API client for MCP
   - Reads `TM_API_BASE`
   - Reads token from file or env
   - Calls local HTTP API

3) Tool definitions + handlers
   - Validate inputs with JSON schema
   - Map to API endpoints
   - Return JSON payloads

4) Ordering rules for get_next_task
   - Filter by status
   - Priority order: high > medium > low
   - Then `sort_index` asc

5) Electron integration
   - Start MCP process after API server starts
   - Shut down MCP on app exit

6) Documentation
   - Add `docs/mcp-setup.md` with CLI config
   - Include base URL and token path

## Key Decisions
- Transport: StdIO (local CLI)
- Auth: shared local token
- Scope: local-only (no cloud dependency)

## Acceptance Criteria
- CLI can create project and tasks via MCP.
- CLI can move tasks to in-progress/done.
- App reflects CLI updates without manual refresh.
- MCP rejects unauthenticated connections.

## Risks / Notes
- Keep tool surface stable early (avoid breaking changes).
- Add rate limiting if CLI loops heavily.
- Consider adding a `get_context` tool later for detailed task bundles.

