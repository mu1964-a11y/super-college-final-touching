const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let DEFAULT_PORT = 3000;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Helper to check if local server is responsive
function checkServerHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Start local Express server if packaged or if not already running
async function ensureServerRunning() {
  const isHealthy = await checkServerHealth(DEFAULT_PORT);
  if (isHealthy) {
    console.log(`[Electron Main] Server already active on port ${DEFAULT_PORT}`);
    return DEFAULT_PORT;
  }

  // Determine path to server.js
  let serverPath = path.join(__dirname, '../server.js');
  if (!fs.existsSync(serverPath)) {
    // In some packaged structures, it might be in app.asar or resources
    const altPath = path.join(process.resourcesPath, 'app', 'server.js');
    if (fs.existsSync(altPath)) {
      serverPath = altPath;
    }
  }

  if (fs.existsSync(serverPath)) {
    console.log(`[Electron Main] Launching embedded server from: ${serverPath}`);
    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: String(DEFAULT_PORT),
        NODE_ENV: 'production'
      },
      stdio: 'ignore'
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Electron Main] Server process exited with code ${code}`);
    });

    // Wait up to 15 seconds for server to report ready
    const start = Date.now();
    while (Date.now() - start < 15000) {
      await new Promise(r => setTimeout(r, 400));
      if (await checkServerHealth(DEFAULT_PORT)) {
        console.log(`[Electron Main] Embedded server is now online on port ${DEFAULT_PORT}`);
        return DEFAULT_PORT;
      }
    }
  }

  return DEFAULT_PORT;
}

function createWindow(port) {
  const iconPath = path.join(__dirname, '../build/icon.ico');
  const fallbackIcon = path.join(__dirname, '../public/superior-logo.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    title: 'Superior College Jahanian ERP - Management System',
    icon: fs.existsSync(iconPath) ? iconPath : fallbackIcon,
    show: false,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    }
  });

  // Native application menu
  const menuTemplate = [
    {
      label: 'System',
      submenu: [
        { label: 'Reload Window', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Exit Application', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggledevtools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Superior College Jahanian Portal',
          click: async () => {
            await shell.openExternal('https://superiorjahanian.edu.pk');
          }
        },
        {
          label: 'About ERP App',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Superior College Jahanian ERP',
              message: 'Superior College Jahanian - ERP & LMS Desktop App',
              detail: 'Version: 1.0.0\nClient: Superior Group of Colleges Jahanian\nPlatform: Windows Desktop Application'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  const targetUrl = `http://127.0.0.1:${port}`;
  console.log(`[Electron Main] Loading URL: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC listeners for renderer
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-print', () => {
  if (mainWindow) mainWindow.webContents.print();
});

ipcMain.on('open-external', (event, url) => {
  if (url) shell.openExternal(url);
});

// App lifecycle
app.whenReady().then(async () => {
  const port = await ensureServerRunning();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {
      // process already dead
    }
  }
});
