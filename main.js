const { app, BrowserWindow, clipboard, ipcMain, nativeImage, dialog } = require("electron");
const path = require("node:path");

const isDevelopment = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 640,
    frame: false,
    backgroundColor: "#0d1016",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());
  if (isDevelopment) {
    window.loadURL("http://127.0.0.1:5173");
  } else {
    window.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

ipcMain.handle("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("window:toggle-maximize", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return false;
  if (window.isMaximized()) window.unmaximize();
  else window.maximize();
  return window.isMaximized();
});

ipcMain.handle("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("snip:save-png", async (_event, dataUrl) => {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) {
    throw new TypeError("Expected a PNG data URL.");
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save snip",
    defaultPath: "snip.png",
    filters: [{ name: "PNG image", extensions: ["png"] }],
  });
  if (canceled || !filePath) return { saved: false };

  const image = nativeImage.createFromDataURL(dataUrl);
  if (image.isEmpty()) throw new Error("The snip could not be decoded as a PNG.");
  const fs = require("node:fs/promises");
  await fs.writeFile(filePath, image.toPNG());
  return { saved: true, filePath };
});

ipcMain.handle("snip:copy", (_event, dataUrl) => {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) {
    throw new TypeError("Expected a PNG data URL.");
  }
  const image = nativeImage.createFromDataURL(dataUrl);
  if (image.isEmpty()) throw new Error("The snip could not be decoded as a PNG.");
  clipboard.writeImage(image);
  return true;
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
