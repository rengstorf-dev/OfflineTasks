const { contextBridge } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tokenPath = path.join(os.homedir(), '.task-manager-token');

const readToken = () => {
  try {
    return fs.readFileSync(tokenPath, 'utf8').trim();
  } catch (error) {
    return null;
  }
};

const exposeApi = () => {
  const api = {
    getToken: () => readToken(),
  };

  console.log('Preload loaded. contextIsolation:', process.contextIsolated);

  try {
    contextBridge.exposeInMainWorld('electronAPI', api);
  } catch (error) {
    console.error('Failed to expose electronAPI via contextBridge:', error);
    globalThis.electronAPI = api;
  }
};

exposeApi();
