// Preload script for Electron
// This runs in the renderer process before web content loads

const { contextBridge } = require('electron');

// Expose safe APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    version: process.versions.electron
});

// Log when preload is done
console.log('Electron preload script loaded');
