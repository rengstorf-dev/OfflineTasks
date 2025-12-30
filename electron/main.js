const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { getToken, getTokenPath } = require('../server/token');

const API_HOST = '127.0.0.1';
const API_PORT = 3123;
let mcpProcess = null;

const waitForApiReady = () =>
  new Promise((resolve) => {
    const token = getToken();
    let settled = false;

    const check = () => {
      const req = http.request(
        {
          host: API_HOST,
          port: API_PORT,
          path: '/health',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        (res) => {
          if (res.statusCode === 200) {
            settled = true;
            resolve();
            return;
          }
          setTimeout(check, 500);
        }
      );

      req.on('error', () => {
        if (!settled) {
          setTimeout(check, 500);
        }
      });
      req.end();
    };

    check();
  });

const startMcp = async () => {
  if (mcpProcess) {
    return;
  }

  try {
    require.resolve('@modelcontextprotocol/sdk/server');
  } catch (error) {
    console.warn('MCP SDK not installed. Skipping MCP server startup.');
    return;
  }

  await waitForApiReady();

  const mcpPath = path.join(__dirname, '..', 'server', 'mcp', 'index.js');
  mcpProcess = spawn(process.execPath, [mcpPath], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      TM_API_BASE: `http://${API_HOST}:${API_PORT}`,
      TM_API_TOKEN_PATH: getTokenPath(),
    },
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  mcpProcess.on('exit', (code) => {
    console.log(`MCP server exited with code ${code}`);
    mcpProcess = null;
  });
};

const createWindow = () => {
  const preloadPath = path.join(__dirname, 'preload.js');
  if (!fs.existsSync(preloadPath)) {
    console.error(`Preload script not found: ${preloadPath}`);
  }

  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.loadFile(path.join(__dirname, '..', 'dist', 'task-manager.html'));
};

app.whenReady().then(() => {
  createWindow();
  startMcp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (mcpProcess) {
    mcpProcess.kill();
    mcpProcess = null;
  }
});
