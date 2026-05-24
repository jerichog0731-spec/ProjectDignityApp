const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

// Custom Env File Loader to parse environment variables without third-party dependencies
function loadEnvFile(envPath) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from: ${envPath}`);
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        if (!line || line.trim().startsWith('#')) return;
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      });
    } catch (e) {
      console.error(`Error parsing env file at ${envPath}:`, e);
    }
  }
}

// Load env files from project roots
const projectRoot = app.isPackaged 
  ? path.dirname(path.dirname(path.dirname(process.execPath))) 
  : app.getAppPath();

loadEnvFile(path.join(projectRoot, '.env'));
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(process.cwd(), '.env'));
loadEnvFile(path.join(process.cwd(), '.env.local'));

console.log('C.O.R.E. Env Initialization:', {
  hasApiKey: !!process.env.AIRTABLE_API_KEY,
  hasBaseId: !!process.env.AIRTABLE_BASE_ID,
  hasAdminPin: !!process.env.ADMIN_PIN
});

const net = require('net');

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(err.code === 'EADDRINUSE');
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

let mainWindow;
let nextProcess;
const PORT = 3000;

async function startNextServer() {
  const inUse = await isPortInUse(PORT);
  if (inUse) {
    console.log(`Port ${PORT} is already in use. Connecting directly without starting a new server.`);
    return `http://localhost:${PORT}`;
  }

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
      // Open/create a next-server.log file in the project root directory
      const logPath = path.join(projectRoot, 'next-server.log');
      const logStream = fs.createWriteStream(logPath, { flags: 'a' });
      logStream.write(`\n--- Server Launch: ${new Date().toISOString()} ---\n`);

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
        logStream.write(`Failed to spawn Next.js process: ${err.message}\n`);
        finish('https://projectdignityhobbs.org');
      });

      nextProcess.stdout.on('data', (data) => {
        const output = data.toString();
        logStream.write(data);
        console.log(`[NextServer]: ${output}`);
        if (output.includes('Ready') || output.includes('started') || output.includes('localhost')) {
          finish(`http://localhost:${PORT}`);
        }
      });

      nextProcess.stderr.on('data', (data) => {
        logStream.write(data);
        console.error(`[NextServer Error]: ${data.toString()}`);
      });

      nextProcess.on('close', (code) => {
        console.log(`Next.js server process closed with code ${code}. Falling back to website.`);
        logStream.write(`Next.js server process closed with code ${code}\n`);
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
