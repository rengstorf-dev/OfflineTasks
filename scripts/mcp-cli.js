const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { getTokenPath } = require('../server/token');

const repoRoot = path.join(__dirname, '..');
const mcpPath = path.join(repoRoot, 'server', 'mcp', 'index.js');

const usage = () => {
  console.log('Usage:');
  console.log('  node scripts/mcp-cli.js list');
  console.log('  node scripts/mcp-cli.js call <toolName> <jsonArgs>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/mcp-cli.js list');
  console.log(
    "  node scripts/mcp-cli.js call create_project '{\"name\":\"MCP Test\",\"color\":\"#4A90E2\"}'"
  );
};

const parseJsonArg = (value) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error('Invalid JSON arguments');
  }
};

const run = async () => {
  const [command, toolName, jsonArgs] = process.argv.slice(2);

  if (!command) {
    usage();
    process.exit(1);
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mcpPath],
    cwd: repoRoot,
    env: {
      ...process.env,
      TM_API_BASE: process.env.TM_API_BASE || 'http://127.0.0.1:3123',
      TM_API_TOKEN_PATH: process.env.TM_API_TOKEN_PATH || getTokenPath(),
    },
    stderr: 'inherit',
  });

  const client = new Client({ name: 'task-manager-cli', version: '0.1.0' });
  await client.connect(transport);

  try {
    if (command === 'list') {
      const result = await client.listTools();
      console.log(JSON.stringify(result.tools, null, 2));
      return;
    }

    if (command === 'call') {
      if (!toolName) {
        throw new Error('Tool name is required');
      }
      const args = parseJsonArg(jsonArgs);
      const result = await client.callTool({ name: toolName, arguments: args });
      const first = result.content && result.content[0];
      if (first && first.type === 'text') {
        try {
          const parsed = JSON.parse(first.text);
          console.log(JSON.stringify(parsed, null, 2));
          return;
        } catch (error) {
          console.log(first.text);
          return;
        }
      }
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    await client.close();
  }
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
