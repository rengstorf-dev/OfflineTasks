const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const createApiClient = require('./api-client');
const { tools, handlers, validateInput } = require('./tools');

const server = new Server(
  {
    name: 'task-manager-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};
  const tool = tools.find((entry) => entry.name === name);
  const handler = handlers[name];

  if (!tool || !handler) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: `Unknown tool: ${name}` }),
        },
      ],
    };
  }

  const errors = validateInput(tool.inputSchema, args);
  if (errors.length > 0) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Invalid input', details: errors }),
        },
      ],
    };
  }

  try {
    const api = createApiClient();
    const result = await handler(api, args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message || 'Tool execution failed',
          }),
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error('MCP server failed to start:', error);
  process.exit(1);
});
