const { app, BrowserWindow, shell, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');

let mainWindow = null;
let httpServer = null;
const DEFAULT_PORT = 3000;
const distPath = path.join(__dirname, '../dist');

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

// Start lightweight in-process Express server to serve dist assets and local APIs
function startInternalServer() {
  return new Promise((resolve) => {
    const serverApp = express();

    serverApp.use(express.json({ limit: '50mb' }));
    serverApp.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Serve production static assets from dist
    serverApp.use(express.static(distPath));

    // Health check endpoint
    serverApp.get('/api/health', (req, res) => {
      res.json({ status: 'ok', client: 'Superior College Jahanian ERP Desktop' });
    });

    // Dedicated download endpoint for installers
    serverApp.get(['/downloads/:filename', '/api/download/:filename'], (req, res) => {
      const candidates = [
        path.join(distPath, 'downloads', req.params.filename),
        path.join(__dirname, '../public/downloads', req.params.filename),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          return res.download(c);
        }
      }
      res.status(404).send('File not found');
    });

    // SPA wildcard catch-all: serves index.html for any frontend route
    serverApp.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send('Application build not found.');
      }
    });

    // Try default port 3000 first
    httpServer = serverApp.listen(DEFAULT_PORT, '127.0.0.1', () => {
      console.log(`[Electron Main] Internal server active on http://127.0.0.1:${DEFAULT_PORT}`);
      resolve(DEFAULT_PORT);
    });

    httpServer.on('error', (err) => {
      console.warn(`[Electron Main] Port ${DEFAULT_PORT} unavailable (${err.code}), binding to random available port...`);
      // If port 3000 is occupied, bind to any available random port (port 0)
      httpServer = serverApp.listen(0, '127.0.0.1', () => {
        const dynamicPort = httpServer.address().port;
        console.log(`[Electron Main] Internal server bound to port: ${dynamicPort}`);
        resolve(dynamicPort);
      });
    });
  });
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
      webSecurity: false, // Ensures direct Supabase and local API communication
      allowRunningInsecureContent: false,
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
        { role: 'toggledevtools', accelerator: 'F12' }
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

  // In development mode with hot reload, use dev server; otherwise use in-process server
  const targetUrl = process.env.VITE_DEV_SERVER_URL || `http://127.0.0.1:${port}`;
  console.log(`[Electron Main] Navigating to: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  // Fail-safe: If internal HTTP loading encounters an error, fallback immediately to direct local file
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.warn(`[Electron Main] Page failed to load (${errorCode}: ${errorDescription}). Falling back to local file...`);
    const fallbackFile = path.join(distPath, 'index.html');
    if (fs.existsSync(fallbackFile)) {
      mainWindow.loadFile(fallbackFile);
    }
  });

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
  const port = await startInternalServer();
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
  if (httpServer) {
    try {
      httpServer.close();
    } catch (e) {
      // server already closed
    }
  }
});
