const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveBackup: (data, customFilename) => ipcRenderer.invoke('save-backup', data, customFilename),
  loadBackup: (filename) => ipcRenderer.invoke('load-backup', filename),
  exportBackup: (data) => ipcRenderer.invoke('export-backup', data),
  importBackup: () => ipcRenderer.invoke('import-backup'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  print: (content, options) => ipcRenderer.invoke('print', content, options),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemPaths: () => ipcRenderer.invoke('get-system-paths'),
  writeLog: (logEntry) => ipcRenderer.invoke('write-log', logEntry),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (_event, value) => callback(value)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_event, value) => callback(value)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, value) => callback(value)),
  onAppClosing: (callback) => ipcRenderer.on('app-closing', (_event, value) => callback(value)),
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
