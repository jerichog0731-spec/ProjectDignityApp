const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window management
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // Updater management
  restartApp: () => ipcRenderer.send('restart-app'),
  onUpdateStatus: (callback) => {
    // Remove listeners first to prevent duplicates
    ipcRenderer.removeAllListeners('update-status');
    ipcRenderer.on('update-status', (event, status, ...args) => {
      callback(status, ...args);
    });
  }
});
