const { app, BrowserWindow } = require('electron');
const auth = require('./auth');
const automation = require('./automation');

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      offscreen: true
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  auth.spoofUserAgent();
  auth.interceptSessionRequest();
  automation.listenForSignalingEvents();
  automation.startAntiAfk();
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
