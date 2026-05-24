const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let nextProcess;
const PORT = 3000;

function startNextServer() {
  return new Promise((resolve) => {
    if (!app.isPackaged) {
      // In dev mode, assume Next.js is running via 'npm run dev'
      console.log('Running in Development mode. Connecting to existing Next.js server.');
      resolve(`http://localhost:${PORT}`);
      return;
    }

    console.log('Running in Production mode. Launching local Next.js server...');
    const nextBin = path.join(app.getAppPath(), 'node_modules', 'next', 'dist', 'bin', 'next');
    let resolved = false;

    const finish = (url) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(fallbackTimeout);
        resolve(url);
      }
    };

    // Fallback: If local server doesn't respond in 6s, load the online website
    const fallbackTimeout = setTimeout(() => {
      console.log('Local server timeout. Falling back to official hosted website.');
      finish('https://projectdignityhobbs.org');
    }, 6000);

    try {
      // Wrap path in quotes to prevent spaces from breaking Windows shell spawn
      nextProcess = spawn('node', [`"${nextBin}"`, 'start', '-p', PORT.toString()], {
        cwd: app.getAppPath(),
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: PORT.toString()
        }
      });

      nextProcess.on('error', (err) => {
        console.error('Failed to spawn Next.js process, falling back to website:', err);
        finish('https://projectdignityhobbs.org');
      });

      nextProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[NextServer]: ${output}`);
        if (output.includes('Ready') || output.includes('started') || output.includes('localhost')) {
          finish(`http://localhost:${PORT}`);
        }
      });

      nextProcess.stderr.on('data', (data) => {
        console.error(`[NextServer Error]: ${data.toString()}`);
      });

      nextProcess.on('close', (code) => {
        console.log(`Next.js server process closed with code ${code}. Falling back to website.`);
        finish('https://projectdignityhobbs.org');
      });

    } catch (e) {
      console.error('Exception starting Next.js server, falling back to website:', e);
      finish('https://projectdignityhobbs.org');
    }
  });
}

async function createWindow() {
  const startUrl = await startNextServer();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // frameless window for glassmorphism custom titlebar
    backgroundColor: '#050c18', // dark color matching the brand theme
    icon: path.join(__dirname, 'public/assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start auto-updater checks when shown
  mainWindow.once('ready-to-show', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // Kill Next.js server process when window is closed
  if (nextProcess) {
    nextProcess.kill('SIGINT');
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Auto-updater IPC forwarders
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'checking');
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'available', info.version);
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'not-available');
});

autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'error', err ? err.message : 'Unknown error');
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'downloading', Math.round(progressObj.percent));
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-status', 'downloaded');
});

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});
