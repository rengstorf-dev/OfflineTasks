const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

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
