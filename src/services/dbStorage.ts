import { FileItem, DriveInfo } from '../types';

const DB_NAME = 'InfraFinder_LocalDatabase';
const DB_VERSION = 2;
const STORE_FILES = 'indexed_files';
const STORE_DRIVES = 'local_drives';
const STORE_SETTINGS = 'app_settings';
const STORE_HANDLES = 'dir_handles';

export interface StoredDirHandle {
  id: string;
  name: string;
  driveLetter: string;
  path: string;
  handle: any; // FileSystemDirectoryHandle
  addedAt: string;
}

export class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db: IDBDatabase = e.target.result;
          if (!db.objectStoreNames.contains(STORE_FILES)) {
            const fileStore = db.createObjectStore(STORE_FILES, { keyPath: 'id' });
            fileStore.createIndex('parentPath', 'parentPath', { unique: false });
            fileStore.createIndex('category', 'category', { unique: false });
            fileStore.createIndex('extension', 'extension', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_DRIVES)) {
            db.createObjectStore(STORE_DRIVES, { keyPath: 'letter' });
          }
          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_HANDLES)) {
            db.createObjectStore(STORE_HANDLES, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e: any) => resolve(e.target.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  public async getAllFiles(): Promise<FileItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveFilesBatch(files: FileItem[]): Promise<void> {
    if (files.length === 0) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      for (const f of files) {
        store.put(f);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async clearAllFiles(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_FILES, STORE_DRIVES, STORE_HANDLES], 'readwrite');
      tx.objectStore(STORE_FILES).clear();
      tx.objectStore(STORE_DRIVES).clear();
      tx.objectStore(STORE_HANDLES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getDrives(): Promise<DriveInfo[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRIVES, 'readonly');
      const store = tx.objectStore(STORE_DRIVES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveDrives(drives: DriveInfo[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRIVES, 'readwrite');
      const store = tx.objectStore(STORE_DRIVES);
      for (const d of drives) {
        store.put(d);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveDirHandle(handleObj: StoredDirHandle): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HANDLES, 'readwrite');
      const store = tx.objectStore(STORE_HANDLES);
      store.put(handleObj);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllDirHandles(): Promise<StoredDirHandle[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HANDLES, 'readonly');
      const store = tx.objectStore(STORE_HANDLES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async removeDirHandle(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HANDLES, 'readwrite');
      const store = tx.objectStore(STORE_HANDLES);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getSetting(key: string): Promise<any> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  }

  public async setSetting(key: string, value: any): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Cleans out any old dummy NH-48 or mock dataset items if they were saved in IndexedDB previously
   */
  public async cleanLegacyDummyData(): Promise<{ removedFiles: number; removedDrives: number }> {
    const allFiles = await this.getAllFiles();
    const allDrives = await this.getDrives();

    const dummyFiles = allFiles.filter(
      (f) =>
        f.id.startsWith('file-nh-') ||
        f.id.startsWith('dir-nh-') ||
        f.path.includes('NH-48_Six_Laning_Project') ||
        f.isLocalImported !== true
    );

    const dummyDrives = allDrives.filter(
      (d) =>
        d.label.includes('Fast NVMe') ||
        d.label.includes('Drone Archive') ||
        d.label.includes('Windows System SSD')
    );

    if (dummyFiles.length > 0 || dummyDrives.length > 0) {
      const validFiles = allFiles.filter(
        (f) =>
          !f.id.startsWith('file-nh-') &&
          !f.id.startsWith('dir-nh-') &&
          !f.path.includes('NH-48_Six_Laning_Project') &&
          f.isLocalImported === true
      );
      const validDrives = allDrives.filter(
        (d) =>
          !d.label.includes('Fast NVMe') &&
          !d.label.includes('Drone Archive') &&
          !d.label.includes('Windows System SSD')
      );

      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_FILES, STORE_DRIVES], 'readwrite');
        const fileStore = tx.objectStore(STORE_FILES);
        const driveStore = tx.objectStore(STORE_DRIVES);

        for (const df of dummyFiles) {
          fileStore.delete(df.id);
        }
        for (const dd of dummyDrives) {
          driveStore.delete(dd.letter);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      return { removedFiles: dummyFiles.length, removedDrives: dummyDrives.length };
    }

    return { removedFiles: 0, removedDrives: 0 };
  }
}

export const localDB = new IndexedDBStorage();
