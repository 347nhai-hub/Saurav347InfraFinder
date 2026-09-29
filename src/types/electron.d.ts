// Type definitions for Electron modules used in InfraFinder
declare module 'electron' {
  export interface App {
    whenReady(): Promise<void>;
    quit(): void;
    on(event: string, listener: (...args: any[]) => void): this;
    getPath(name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents'): string;
  }

  export interface BrowserWindowOptions {
    width?: number;
    height?: number;
    show?: boolean;
    frame?: boolean;
    transparent?: boolean;
    alwaysOnTop?: boolean;
    skipTaskbar?: boolean;
    resizable?: boolean;
    webPreferences?: {
      nodeIntegration?: boolean;
      contextIsolation?: boolean;
      preload?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  export class BrowserWindow {
    constructor(options?: BrowserWindowOptions);
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
    show(): void;
    hide(): void;
    isVisible(): boolean;
    isDestroyed(): boolean;
    close(): void;
    focus(): void;
    webContents: {
      send(channel: string, ...args: any[]): void;
      openDevTools(): void;
    };
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export interface IpcMain {
    handle(channel: string, listener: (event: any, ...args: any[]) => any): void;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
    removeHandler(channel: string): void;
  }

  export interface Shell {
    showItemInFolder(fullPath: string): void;
    openPath(path: string): Promise<string>;
    openExternal(url: string): Promise<void>;
  }

  export interface GlobalShortcut {
    register(accelerator: string, callback: () => void): boolean;
    isRegistered(accelerator: string): boolean;
    unregister(accelerator: string): void;
    unregisterAll(): void;
  }

  export interface MenuItemConstructorOptions {
    label?: string;
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
    click?: () => void;
    checked?: boolean;
    enabled?: boolean;
  }

  export class Menu {
    static buildFromTemplate(template: MenuItemConstructorOptions[]): Menu;
  }

  export class Tray {
    constructor(image: string);
    setToolTip(toolTip: string): void;
    setContextMenu(menu: Menu): void;
    on(event: 'click' | 'double-click' | string, listener: (...args: any[]) => void): this;
  }

  export const app: App;
  export const ipcMain: IpcMain;
  export const shell: Shell;
  export const globalShortcut: GlobalShortcut;
}
