/**
 * KlavierLab — Native Desktop Entry Point (Windows & macOS)
 * Enables Web Bluetooth (BLE MIDI) and Web MIDI permissions in Electron.
 *
 * Usage:
 *   1. Development:
 *      npm run dev
 *      npx electron electron-main.cjs
 *
 *   2. Production / Packaged App (.app on macOS / .exe on Windows):
 *      npm run build
 *      npx electron electron-main.cjs
 */

const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable Chromium Web Bluetooth & BLE GATT support on Windows and macOS
app.commandLine.appendSwitch('enable-web-bluetooth', 'true');
app.commandLine.appendSwitch('enable-experimental-web-platform-features', 'true');
app.commandLine.appendSwitch('enable-features', 'WebBluetoothNewPermissionsBackend');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#0B0F17',
    title: 'KlavierLab — Bluetooth MIDI Piano Studio',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Automatically grant Web MIDI and Web Bluetooth permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (['midi', 'midiSysex', 'bluetooth'].includes(permission)) {
      return callback(true);
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (['midi', 'midiSysex', 'bluetooth'].includes(permission)) {
      return true;
    }
    return false;
  });

  // Handle Web Bluetooth device picker for BLE MIDI keyboards
  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    const midiDevice = deviceList.find((d) => d.deviceName && d.deviceName.trim().length > 0);
    if (midiDevice) {
      callback(midiDevice.deviceId);
    }
  });

  const devServerUrl = process.env.ELECTRON_START_URL;
  const distIndex = path.join(__dirname, 'dist', 'index.html');

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
