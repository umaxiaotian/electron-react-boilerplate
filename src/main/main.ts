/* eslint global-require: off, no-console: off, promise/always-return: off, @typescript-eslint/no-require-imports: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */

import path from 'path';

import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    // Promise を明示的に破棄
    void autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// 受け取り引数に型付け（no-unsafe-argument 回避）
ipcMain.on('ipc-example', (event, arg: string) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// ── ESM/CJS 警告を避けるため require をやめて動的 import に統一 ──
if (process.env.NODE_ENV === 'production') {
  void import('source-map-support')
    .then((m) => m.install())
    .catch(() => {});
}

if (isDebug) {
  void import('electron-debug')
    .then((m) => m.default())
    .catch(() => {});
}

// DevTools 拡張導入（正しいオーバーロード：配列 + options）
const installExtensions = async () => {
  try {
    // まず unknown にしてから、期待する“モジュール形”へキャスト
    type Installer = typeof import('electron-devtools-installer');
    type InstallFn = Installer['default'];

    const mod = (await import('electron-devtools-installer')) as unknown as {
      default: InstallFn;
      REACT_DEVELOPER_TOOLS: Installer['REACT_DEVELOPER_TOOLS'];
    };

    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;

    // 正しいオーバーロード（配列 + options）
    await mod.default([mod.REACT_DEVELOPER_TOOLS], { forceDownload });
  } catch (e: unknown) {
    if (e instanceof Error) console.log(e.message);
    else console.log(String(e));
  }
};



const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  // Promise 戻りを破棄
  void mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 外部リンクは既定ブラウザで開く（Promise 破棄）
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    void shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // macOS: 明示終了するまで常駐
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

void app
  .whenReady()
  .then(() => {
    void createWindow();
    app.on('activate', () => {
      if (mainWindow === null) void createWindow();
    });
  })
  .catch((e: unknown) => {
    if (e instanceof Error) console.log(e.message);
    else console.log(String(e));
  });
