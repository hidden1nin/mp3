const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#333',
      symbolColor: '#6200ea',
    },
    width: 1000,
    height: 800,
    icon:'logo.png',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration:true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('load-music', async (event, dir) => {
  const albums = {};

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory() && !file.startsWith('.')) {
      albums[file] = fs.readdirSync(fullPath)
        .filter(f => f.endsWith('.mp3') && !f.startsWith('.'))
        .map(f => path.join(fullPath, f));
    }
  }

  return albums;
});
