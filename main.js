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
  console.log('[C.O.R.E. Breadcrumb] Checking if port ' + PORT + ' is in use...');
  const inUse = await isPortInUse(PORT);
  if (inUse) {
    console.log(`[C.O.R.E. Breadcrumb] Port ${PORT} is already in use. Connecting directly without starting a new server.`);
    return `http://localhost:${PORT}`;
  }

  return new Promise((resolve) => {
    if (!app.isPackaged) {
      console.log('[C.O.R.E. Breadcrumb] Running in Development mode. Connecting to existing Next.js server.');
      resolve(`http://localhost:${PORT}`);
      return;
    }

    console.log('[C.O.R.E. Breadcrumb] Running in Production mode. Launching local Next.js server...');
    const nextBin = path.join(app.getAppPath(), 'node_modules', 'next', 'dist', 'bin', 'next');
    let resolved = false;

    const finish = (url, reason) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(fallbackTimeout);
        console.log(`[C.O.R.E. Breadcrumb] Resolving main window URL: ${url} (Reason: ${reason})`);
        resolve(url);
      }
    };

    // Fallback: If local server doesn't respond in 6s, load the online website
    const fallbackTimeout = setTimeout(() => {
      console.log('[C.O.R.E. Breadcrumb] Local server startup timeout. Falling back to official website.');
      finish('https://projectdignityhobbs.org', 'Startup Timeout');
    }, 6000);

    try {
      const logPath = path.join(projectRoot, 'next-server.log');
      const logStream = fs.createWriteStream(logPath, { flags: 'a' });
      
      const breadcrumb = (msg) => {
        const timestamped = `[C.O.R.E. Breadcrumb][${new Date().toISOString()}] ${msg}\n`;
        console.log(msg);
        logStream.write(timestamped);
      };

      breadcrumb(`--- Server Launch Init ---`);
      breadcrumb(`App path: ${app.getAppPath()}`);
      breadcrumb(`Next.js Binary: ${nextBin}`);
      breadcrumb(`Exec path: ${process.execPath}`);

      // Prepare env
      const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: 'production',
        PORT: PORT.toString()
      };

      // Enrich Windows PATH and SystemRoot
      if (process.platform === 'win32') {
        const systemPaths = [
          'C:\\Windows\\system32',
          'C:\\Windows',
          'C:\\Windows\\System32\\Wbem',
          'C:\\Windows\\System32\\WindowsPowerShell\\v1.0'
        ];
        const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
        const existingPath = env[pathKey] || '';
        const uniquePaths = systemPaths.filter(p => !existingPath.toLowerCase().includes(p.toLowerCase()));
        
        if (uniquePaths.length > 0) {
          env[pathKey] = existingPath + (existingPath ? ';' : '') + uniquePaths.join(';');
        }
        if (!env.SystemRoot) {
          env.SystemRoot = 'C:\\Windows';
        }
        breadcrumb(`Enriched Windows environment. PATH variable key used: ${pathKey}`);
      }

      breadcrumb(`Spawning process: ${process.execPath} with args [${nextBin}, 'start', '-p', '${PORT}']`);

      // Spawn using Electron binary as Node, shell: false to avoid cmd.exe ENOENT
      nextProcess = spawn(process.execPath, [nextBin, 'start', '-p', PORT.toString()], {
        cwd: app.getAppPath(),
        shell: false,
        env: env
      });

      if (nextProcess.pid) {
        breadcrumb(`Spawned Next.js server successfully with PID: ${nextProcess.pid}`);
      }

      nextProcess.on('error', (err) => {
        breadcrumb(`Failed to spawn Next.js process: ${err.message}`);
        finish('https://projectdignityhobbs.org', `Spawn Error: ${err.message}`);
      });

      nextProcess.stdout.on('data', (data) => {
        const output = data.toString();
        logStream.write(data);
        console.log(`[NextServer Out]: ${output.trim()}`);
        if (output.includes('Ready') || output.includes('started') || output.includes('localhost')) {
          breadcrumb(`Detected Next.js ready condition in stdout.`);
          finish(`http://localhost:${PORT}`, 'Ready Output Detected');
        }
      });

      nextProcess.stderr.on('data', (data) => {
        const output = data.toString();
        logStream.write(data);
        console.error(`[NextServer Err]: ${output.trim()}`);
      });

      nextProcess.on('close', (code) => {
        breadcrumb(`Next.js server process closed with exit code: ${code}`);
        finish('https://projectdignityhobbs.org', `Process Closed (Exit Code ${code})`);
      });

    } catch (e) {
      console.error('[C.O.R.E. Breadcrumb] Exception starting Next.js server:', e);
      finish('https://projectdignityhobbs.org', `Exception: ${e.message}`);
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
