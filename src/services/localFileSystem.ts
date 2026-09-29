import { FileCategory, FileItem, DriveInfo } from '../types';
import { generateImageThumbnail } from './thumbnailService';

export function getFileCategory(extension: string): FileCategory {
  const ext = extension.toLowerCase().replace(/^\./, '');
  if (ext === 'pdf') return 'pdf';
  if (['xls', 'xlsx', 'xlsm', 'csv', 'ods'].includes(ext)) return 'excel';
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'word';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'ppt';
  if (['dwg', 'dxf', 'dgn', 'ifc', 'step', 'stp'].includes(ext)) return 'cad';
  if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp', 'svg'].includes(ext)) return 'images';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(isoString: string): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

const IGNORED_NAMES = new Set([
  '$recycle.bin',
  '$sysreset',
  'system volume information',
  'node_modules',
  '.git',
  '.svn',
  '.vscode',
  'appdata',
  'recovery',
  'windows',
  'program files',
  'program files (x86)',
]);

export function isCrossOriginSubFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // accessing window.top threw SecurityError, definitely cross-origin iframe!
  }
}

/**
 * Reads user's local directory using the browser File System Access API
 * Designed to handle massive directory structures (TB scale) with streaming batches
 */
export async function pickAndIndexLocalDirectory(
  onProgress?: (count: number, currentFolder: string) => void,
  onBatchDiscovered?: (batch: FileItem[]) => void
): Promise<{ files: FileItem[]; folderPath: string; folderName: string; driveLetter: string; dirHandle: any } | null> {
  // If in an iframe, showDirectoryPicker is prohibited by browsers
  if (isCrossOriginSubFrame()) {
    return null;
  }

  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      // @ts-expect-error - Standard browser API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
      });

      return await scanDirectoryHandle(dirHandle, onProgress, onBatchDiscovered);
    } catch {
      // Any cancellation, SecurityError or permission denial -> return null safely to trigger HTML5 fallback
      return null;
    }
  }

  return null;
}

export async function scanDirectoryHandle(
  dirHandle: any,
  onProgress?: (count: number, currentFolder: string) => void,
  onBatchDiscovered?: (batch: FileItem[]) => void
): Promise<{ files: FileItem[]; folderPath: string; folderName: string; driveLetter: string; dirHandle: any } | null> {
  try {
    const rootName = dirHandle.name;
    // Derive clean Windows drive or path e.g. "D:\" or root name
    let driveLetter = 'D:';
    if (/^[a-zA-Z]:?$/.test(rootName)) {
      driveLetter = rootName.toUpperCase().replace(/:$/, '') + ':';
    } else if (rootName.toUpperCase().includes('C')) {
      driveLetter = 'C:';
    }

    const rootPath = rootName.includes(':') ? `${rootName}\\` : `${driveLetter}\\${rootName}`;
    const discoveredFiles: FileItem[] = [];
    let pendingBatch: FileItem[] = [];
    let count = 0;

    async function scanDir(
      handle: any,
      currentPath: string,
      parentPath: string
    ) {
      // Add folder record
      const folderId = 'dir-' + Math.random().toString(36).substring(2, 9);
      const folderItem: FileItem = {
        id: folderId,
        name: handle.name,
        extension: '',
        path: currentPath,
        parentPath: parentPath,
        category: 'folder',
        size: 0,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        isFolder: true,
        isLocalImported: true,
      };
      discoveredFiles.push(folderItem);
      pendingBatch.push(folderItem);

      for await (const entry of handle.values()) {
        const lowerName = entry.name.toLowerCase();
        if (IGNORED_NAMES.has(lowerName) || lowerName.startsWith('$')) {
          continue;
        }

        count++;
        if (count % 40 === 0) {
          if (onProgress) {
            onProgress(count, currentPath);
          }
          // Cooperative yielding to prevent UI thread blocking on TB datasets
          await new Promise((r) => setTimeout(r, 0));
        }

        if (entry.kind === 'file') {
          try {
            const fileData = await entry.getFile();
            const ext = fileData.name.includes('.') ? fileData.name.split('.').pop() || '' : '';
            const lowerExt = ext.toLowerCase();
            let textSnippet = '';
            let contentFull = '';
            let thumbnailUrl: string | undefined = undefined;
            let imageDimensions: { width: number; height: number } | undefined = undefined;

            // 1. Text Content Extraction for .txt, .log, and plain text formats
            if (['txt', 'log', 'csv', 'md', 'json', 'xml', 'ncr', 'boq', 'ini', 'cfg'].includes(lowerExt) && fileData.size < 2000000) {
              try {
                const text = await fileData.text();
                contentFull = text;
                textSnippet = text.slice(0, 200);
              } catch {
                // ignore read error
              }
            }

            // 2. Thumbnail Generator for Images
            if (['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif', 'svg'].includes(lowerExt) && fileData.size < 25000000) {
              try {
                const thumbResult = await generateImageThumbnail(fileData);
                if (thumbResult) {
                  thumbnailUrl = thumbResult.thumbnailUrl;
                  imageDimensions = { width: thumbResult.width, height: thumbResult.height };
                }
              } catch {
                // ignore image decode error
              }
            }

            const item: FileItem = {
              id: 'file-' + Math.random().toString(36).substring(2, 9),
              name: fileData.name,
              extension: ext,
              path: `${currentPath}\\${fileData.name}`,
              parentPath: currentPath,
              category: getFileCategory(ext),
              size: fileData.size,
              createdDate: new Date(fileData.lastModified).toISOString(),
              modifiedDate: new Date(fileData.lastModified).toISOString(),
              isFolder: false,
              contentFull: contentFull || textSnippet,
              contentSnippet: textSnippet ? textSnippet.slice(0, 160) : undefined,
              thumbnailUrl,
              imageDimensions,
              isLocalImported: true,
            };

            discoveredFiles.push(item);
            pendingBatch.push(item);

            if (pendingBatch.length >= 100) {
              if (onBatchDiscovered) {
                onBatchDiscovered([...pendingBatch]);
              }
              pendingBatch = [];
            }
          } catch (err) {
            console.warn('Skipping file due to read error:', err);
          }
        } else if (entry.kind === 'directory') {
          try {
            await scanDir(entry, `${currentPath}\\${entry.name}`, currentPath);
          } catch (err) {
            console.warn('Skipping folder due to permissions:', err);
          }
        }
      }
    }

    await scanDir(dirHandle, rootPath, driveLetter);

    // Flush remaining batch
    if (pendingBatch.length > 0 && onBatchDiscovered) {
      onBatchDiscovered(pendingBatch);
    }

    return {
      files: discoveredFiles,
      folderPath: rootPath,
      folderName: rootName,
      driveLetter,
      dirHandle,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    console.error('Directory scan failed', err);
    throw err;
  }
}
