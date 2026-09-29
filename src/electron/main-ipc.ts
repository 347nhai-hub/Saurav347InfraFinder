/**
 * Native Electron Main Process & IPC Controller
 * Handles native OS operations: File launching, Explorer reveal, streaming crypto hashing,
 * Spotlight Alt+Space global shortcut, tray icon, and chokidar folder watcher.
 */

import { ipcMain, shell, globalShortcut, Tray, Menu, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';

export interface FileHashResult {
  filePath: string;
  sha256: string;
  md5: string;
  sizeBytes: number;
}

let activeWatcher: FSWatcher | null = null;
let appTray: Tray | null = null;

/**
 * Computes MD5 and SHA-256 hashes concurrently using Node streams to avoid RAM exhaustion.
 */
export async function computeFileHashes(filePath: string): Promise<FileHashResult> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }

    const sha256 = crypto.createHash('sha256');
    const md5 = crypto.createHash('md5');
    let sizeBytes = 0;

    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk: Buffer | string) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      sha256.update(buffer);
      md5.update(buffer);
      sizeBytes += buffer.length;
    });

    stream.on('end', () => {
      resolve({
        filePath,
        sha256: sha256.digest('hex'),
        md5: md5.digest('hex'),
        sizeBytes,
      });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Registers all Electron IPC Handlers for InfraFinder
 */
export function registerIpcHandlers(mainWindow?: BrowserWindow, spotlightWindow?: BrowserWindow) {
  // 1. Reveal file in Windows Explorer
  ipcMain.handle('infra:show-item-in-folder', async (_event, fullPath: string) => {
    try {
      if (fs.existsSync(fullPath)) {
        shell.showItemInFolder(fullPath);
        return { success: true };
      }
      return { success: false, error: 'Path does not exist on disk' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // 2. Open file with native associated Windows desktop application (AutoCAD, Excel, Acrobat)
  ipcMain.handle('infra:open-path', async (_event, fullPath: string) => {
    try {
      const errorMessage = await shell.openPath(fullPath);
      if (errorMessage) {
        return { success: false, error: errorMessage };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // 3. Compute streaming SHA-256 and MD5 for duplicate file detection
  ipcMain.handle('infra:hash-file', async (_event, fullPath: string) => {
    try {
      const result = await computeFileHashes(fullPath);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // 4. Toggle Spotlight search window
  ipcMain.handle('infra:toggle-spotlight', () => {
    if (spotlightWindow) {
      if (spotlightWindow.isVisible()) {
        spotlightWindow.hide();
      } else {
        spotlightWindow.show();
        spotlightWindow.focus();
      }
    }
  });
}

/**
 * Registers Alt+Space global shortcut to summon spotlight search from any app.
 */
export function registerSpotlightShortcut(spotlightWindow: BrowserWindow): boolean {
  const shortcut = 'Alt+Space';
  
  if (globalShortcut.isRegistered(shortcut)) {
    globalShortcut.unregister(shortcut);
  }

  return globalShortcut.register(shortcut, () => {
    if (!spotlightWindow || spotlightWindow.isDestroyed?.()) return;

    if (spotlightWindow.isVisible()) {
      spotlightWindow.hide();
    } else {
      spotlightWindow.show();
      spotlightWindow.focus();
    }
  });
}

/**
 * Sets up Windows System Tray icon with quick actions and watcher control.
 */
export function setupSystemTray(
  iconPath: string,
  mainWindow: BrowserWindow,
  spotlightWindow?: BrowserWindow
): Tray {
  appTray = new Tray(iconPath);
  appTray.setToolTip('InfraFinder - Highway Project Indexer');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open InfraFinder',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Quick Search (Alt+Space)',
      click: () => {
        if (spotlightWindow) {
          spotlightWindow.show();
          spotlightWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Pause Background Watcher',
      type: 'checkbox',
      click: () => {
        // Toggle watcher state
      },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        if (activeWatcher) {
          activeWatcher.close();
        }
        globalShortcut.unregisterAll();
      },
    },
  ]);

  appTray.setContextMenu(contextMenu);
  appTray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return appTray;
}

/**
 * Starts continuous folder watcher using Chokidar.
 * Emits debounced change events to renderer for incremental index updates.
 */
export function startFolderWatcher(
  watchPaths: string[],
  onFileChange: (event: 'add' | 'change' | 'unlink', filePath: string) => void
): FSWatcher {
  if (activeWatcher) {
    activeWatcher.close();
  }

  activeWatcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\..|node_modules|\.git|thumbs\.db|\$RECYCLE\.BIN/i,
    persistent: true,
    ignoreInitial: true,
    depth: 8,
    awaitWriteFinish: {
      stabilityThreshold: 1500,
      pollInterval: 250,
    },
  });

  activeWatcher
    .on('add', (filePath) => onFileChange('add', path.resolve(filePath)))
    .on('change', (filePath) => onFileChange('change', path.resolve(filePath)))
    .on('unlink', (filePath) => onFileChange('unlink', path.resolve(filePath)));

  return activeWatcher;
}
