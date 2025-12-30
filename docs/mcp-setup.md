# MCP Setup (Task Manager)

This project bundles an MCP server for local CLI workflows. The MCP server talks to the local Task Manager API over HTTP.

## Defaults
- API base: `http://127.0.0.1:3123`
- Token path: `~/.task-manager-token`
- MCP entrypoint: `server/mcp/index.js`

## CLI Configuration (StdIO)
Use your MCP-capable CLI to launch the server via stdio. Example config:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/absolute/path/to/TaskManager-copy/server/mcp/index.js"],
      "env": {
        "TM_API_BASE": "http://127.0.0.1:3123",
        "TM_API_TOKEN_PATH": "/Users/yourname/.task-manager-token"
      }
    }
  }
}
```

## Environment Overrides
- `TM_API_BASE`: Override API base URL.
- `TM_API_TOKEN`: Provide the API token directly.
- `TM_API_TOKEN_PATH`: Override token file path.

## Notes
- The Electron app will wait for the local API to be ready before starting the MCP process.
- Ensure the local API is running and the token file exists before using the MCP server.
