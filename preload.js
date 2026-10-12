const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("snipStudio", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  savePng: (dataUrl) => ipcRenderer.invoke("snip:save-png", dataUrl),
  copyImage: (dataUrl) => ipcRenderer.invoke("snip:copy", dataUrl),
});
