import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Electron uses this desktop name for Wayland app_id and X11 WM_CLASS.
// Snap installs a prefixed desktop filename; other Linux packages share the ID.
if (process.platform === 'linux') {
  const desktopName = process.env.SNAP
    ? `${process.env.SNAP_INSTANCE_NAME || 'neon-breakout'}_neon-breakout.desktop`
    : 'io.github.Yeloby.NeonBreakout.desktop';
  app.setDesktopName(desktopName);
}
if (process.platform === 'win32' && !process.windowsStore) {
  app.setAppUserModelId('com.neonbreakout.desktop');
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
let mainWindow = null;

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

  const workArea = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(720, workArea.width),
    height: Math.min(900, workArea.height),
    minWidth: 520,
    minHeight: 620,
    useContentSize: true,
    fullscreenable: true,
    maximizable: true,
    backgroundColor: '#020617',
    title: 'Neon Breakout',
    icon: path.join(__dirname, 'artwork', 'neon-breakout-app-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
