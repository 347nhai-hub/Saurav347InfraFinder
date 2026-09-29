import { FileItem } from '../types';

/**
 * Service to launch files and open folders directly in Windows File Explorer
 * and default Windows applications (Excel, Word, AutoCAD, Acrobat, Notepad, etc.)
 * using explicit Windows 'start' shell commands.
 */

export interface LauncherFeedback {
  type: 'file' | 'folder' | 'copy';
  title: string;
  message: string;
  path: string;
  command: string; // Explicit Windows start command: start "" "<normalized_path>"
  runCommand?: string; // cmd.exe /c start "" "<normalized_path>" for Win+R
  powerShellCommand?: string; // Start-Process -FilePath "<normalized_path>"
  explorerCommand?: string; // explorer.exe /select,"<normalized_path>"
  launcherFileName?: string;
  launcherContent?: string;
}

/**
 * Normalizes any file or folder path into a strictly valid Windows local path format.
 * - Converts forward slashes to backslashes
 * - Capitalizes drive letter (e.g. "d:\" -> "D:\")
 * - Deduplicates redundant backslashes (while preserving UNC network shares e.g. \\server\share)
 * - Trims unnecessary trailing slashes (except root drives e.g. "C:\" or "D:\")
 */
export function normalizeWindowsPath(rawPath: string): string {
  if (!rawPath) return '';
  let p = rawPath.trim();

  // Convert forward slashes to Windows backslashes
  p = p.replace(/\//g, '\\');

  // Handle drive letter capitalization
  if (/^[a-zA-Z]:/.test(p)) {
    p = p[0].toUpperCase() + p.slice(1);
    // Ensure backslash after drive letter if followed by a path
    if (p.length > 2 && p[2] !== '\\') {
      p = p.slice(0, 2) + '\\' + p.slice(2);
    }
  }

  // Deduplicate consecutive backslashes while respecting UNC share prefix
  const isUNC = p.startsWith('\\\\');
  if (isUNC) {
    p = '\\\\' + p.slice(2).replace(/\\+/g, '\\');
  } else {
    p = p.replace(/\\+/g, '\\');
  }

  // Remove trailing backslash if not a drive root (e.g. "D:\folder\" -> "D:\folder", but "D:\" remains "D:\")
  if (p.length > 3 && p.endsWith('\\')) {
    p = p.slice(0, -1);
  }

  return p;
}

/**
 * Generates the explicit Windows shell 'start' command.
 * 
 * WHY THE EMPTY STRING "" IS MANDATORY:
 * In Windows cmd.exe, the first quoted argument to the 'start' command is interpreted
 * as the CONSOLE WINDOW TITLE. If a path with spaces is quoted without an empty title,
 * Windows cmd creates an empty command prompt window with the path as its title,
 * and FAILS to open the file!
 * Passing `start "" "<normalized_path>"` explicitly instructs Windows to open the file
 * using the default registered application for its file extension from the Windows Registry.
 */
export function getWindowsStartCommand(filePath: string): string {
  const norm = normalizeWindowsPath(filePath);
  return `start "" "${norm}"`;
}

/**
 * Generates the command formatted for Windows Run dialog (Win + R), CMD, or shortcuts.
 */
export function getWindowsRunCommand(filePath: string): string {
  const norm = normalizeWindowsPath(filePath);
  return `cmd.exe /c start "" "${norm}"`;
}

/**
 * Generates the PowerShell command to start the file with its default system app.
 */
export function getPowerShellCommand(filePath: string): string {
  const norm = normalizeWindowsPath(filePath);
  return `Start-Process -FilePath "${norm}"`;
}

/**
 * Generates the Windows Explorer command to reveal and highlight the file.
 */
export function getWindowsExplorerSelectCommand(filePath: string): string {
  const norm = normalizeWindowsPath(filePath);
  return `explorer.exe /select,"${norm}"`;
}

/**
 * Generates the Windows Explorer command to open a directory directly.
 */
export function getWindowsExplorerFolderCommand(folderPath: string): string {
  const norm = normalizeWindowsPath(folderPath);
  return `start "" "${norm}"`;
}

/**
 * Downloads and triggers a lightweight Windows batch/cmd launcher script.
 * When double-clicked or opened, Windows cmd.exe immediately executes the explicit
 * 'start' command, launching the user's default system application for the file.
 */
export function executeWindowsLauncher(
  fileName: string,
  shellCommand: string,
  targetName?: string
) {
  const scriptContent = [
    '@echo off',
    'chcp 65001 >nul',
    'title InfraFinder - Starting Local Application',
    'rem ========================================================',
    'rem InfraFinder Windows Native Shell Launcher',
    `rem Target: ${targetName || fileName}`,
    'rem Explicit Windows start command with system default handler',
    'rem ========================================================',
    shellCommand,
    'if %ERRORLEVEL% NEQ 0 (',
    '    echo.',
    '    echo [InfraFinder Error] Could not start application with default handler.',
    '    echo Command attempted: ' + shellCommand.replace(/"/g, '""'),
    '    pause',
    ')',
    'exit',
    ''
  ].join('\r\n');

  const blob = new Blob([scriptContent], { type: 'application/x-bat' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const scriptFileName = fileName.endsWith('.cmd') || fileName.endsWith('.bat') ? fileName : `${fileName}.cmd`;
  a.download = scriptFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const RECENT_STARTS_KEY = 'infrafinder_recent_starts';

/**
 * Record a file launch event into localStorage to power "Start File Suggestions"
 */
export function recordStartedFile(file: FileItem): void {
  try {
    const raw = localStorage.getItem(RECENT_STARTS_KEY);
    const list: { id: string; path: string; name: string; timestamp: number }[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(item => item.id !== file.id && item.path !== file.path);
    filtered.unshift({
      id: file.id,
      path: file.path,
      name: file.name,
      timestamp: Date.now(),
    });
    localStorage.setItem(RECENT_STARTS_KEY, JSON.stringify(filtered.slice(0, 30)));
  } catch (err) {
    console.warn('Failed to save started file to history:', err);
  }
}

/**
 * Retrieve recent started file records
 */
export function getRecentlyStartedIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STARTS_KEY);
    if (!raw) return [];
    const list: { id: string }[] = JSON.parse(raw);
    return list.map(item => item.id);
  } catch {
    return [];
  }
}

/**
 * Opens a local file using the Windows default registered program (Excel, Word, AutoCAD, Acrobat, etc.)
 * with explicit 'start "" "<path>"' shell command syntax.
 */
export function launchFileWithDefaultApp(
  file: FileItem,
  fileBlob?: Blob
): LauncherFeedback {
  const normPath = normalizeWindowsPath(file.path);
  const winStartCommand = getWindowsStartCommand(normPath);
  const winRunCommand = getWindowsRunCommand(normPath);
  const powerShellCommand = getPowerShellCommand(normPath);
  const explorerCommand = getWindowsExplorerSelectCommand(normPath);

  // Record this launch for Start File Suggestions
  recordStartedFile(file);

  // 1. Copy explicit command / path to clipboard
  try {
    navigator.clipboard.writeText(winRunCommand);
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }

  // 2. If we have the live blob from FileSystemAccess, trigger download/open
  if (fileBlob) {
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // 3. Return comprehensive launcher feedback
  const baseName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    type: 'file',
    title: `Starting "${file.name}"`,
    message: `Executing explicit Windows 'start' command with default application (${file.extension ? file.extension.toUpperCase() : 'Document'}).`,
    path: normPath,
    command: winStartCommand,
    runCommand: winRunCommand,
    powerShellCommand,
    explorerCommand,
    launcherFileName: `Start_${baseName}.cmd`,
    launcherContent: `@echo off\r\n${winStartCommand}\r\nexit\r\n`,
  };
}

/**
 * Opens the containing folder directly in Windows File Explorer
 * with the file highlighted using: explorer.exe /select,"<cleanPath>"
 */
export function openContainingFolderInWindows(file: FileItem): LauncherFeedback {
  const normPath = normalizeWindowsPath(file.path);
  const explorerCommand = getWindowsExplorerSelectCommand(normPath);
  const folderStartCommand = getWindowsExplorerFolderCommand(normalizeWindowsPath(file.parentPath || normPath));
  const runCommand = `cmd.exe /c ${explorerCommand}`;

  try {
    navigator.clipboard.writeText(explorerCommand);
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }

  const baseName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    type: 'folder',
    title: 'Reveal in Windows File Explorer',
    message: `Opening Windows File Explorer at location with "${file.name}" highlighted.`,
    path: normPath,
    command: folderStartCommand,
    runCommand,
    powerShellCommand: `Start-Process -FilePath "explorer.exe" -ArgumentList '/select,"${normPath}"'`,
    explorerCommand,
    launcherFileName: `Explore_${baseName}.cmd`,
    launcherContent: `@echo off\r\n${explorerCommand}\r\nexit\r\n`,
  };
}

/**
 * Smart engine to provide "Start File Suggestions"
 * Suggests files to start based on:
 * 1. Recently launched/started files
 * 2. High-priority status tags (Urgent, In Review, Approved)
 * 3. Highway engineering document relevance (CAD drawings, Excel billing, PDF reports)
 * 4. Optional keyboard search query filter
 */
export function getStartFileSuggestions(
  allFiles: FileItem[],
  query = '',
  limit = 8
): { file: FileItem; reason: string; explicitCommand: string }[] {
  const nonFolders = allFiles.filter(f => !f.isFolder);
  const recentIds = getRecentlyStartedIds();
  const recentSet = new Set(recentIds);

  const cleanQuery = query.trim().toLowerCase();
  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 0);

  const candidates: { file: FileItem; score: number; reason: string }[] = [];

  for (const file of nonFolders) {
    const normName = file.name.toLowerCase();
    const normTags = (file.tags || []).map(t => t.toLowerCase());
    const normPath = file.path.toLowerCase();

    // If query is provided, enforce keyboard search matching
    if (queryWords.length > 0) {
      let matchesAll = true;
      for (const word of queryWords) {
        const inName = normName.includes(word);
        const inTags = normTags.some(t => t.includes(word));
        const inExt = file.extension.toLowerCase().includes(word);
        const inPath = normPath.includes(word);
        if (!inName && !inTags && !inExt && !inPath) {
          matchesAll = false;
          break;
        }
      }
      if (!matchesAll) continue;
    }

    let score = 0;
    let reason = 'Suggested Document';

    // 1. Recently Started Boost
    if (recentSet.has(file.id)) {
      const idx = recentIds.indexOf(file.id);
      score += 1000 - idx * 20;
      reason = 'Recently Started';
    }

    // 2. Status Priority
    if (normTags.includes('urgent')) {
      score += 400;
      reason = reason === 'Suggested Document' ? 'Urgent Action Required' : reason;
    } else if (normTags.includes('in review')) {
      score += 300;
      reason = reason === 'Suggested Document' ? 'In Active Review' : reason;
    } else if (normTags.includes('approved')) {
      score += 250;
      reason = reason === 'Suggested Document' ? 'Approved Highway Document' : reason;
    }

    // 3. Technical Engineering formats (CAD, Excel IPC, PDF)
    const ext = file.extension.toLowerCase();
    if (['dwg', 'dxf'].includes(ext)) {
      score += 200;
      if (reason === 'Suggested Document') reason = 'CAD Structural Drawing';
    } else if (['xlsx', 'xls'].includes(ext)) {
      score += 180;
      if (reason === 'Suggested Document') reason = 'Spreadsheet & Measurement Book';
    } else if (ext === 'pdf') {
      score += 150;
      if (reason === 'Suggested Document') reason = 'PDF Project Report';
    }

    // 4. Recency of modification
    const modTime = new Date(file.modifiedDate).getTime();
    if (!isNaN(modTime)) {
      const daysOld = (Date.now() - modTime) / (1000 * 60 * 60 * 24);
      if (daysOld < 3) score += 100;
      else if (daysOld < 14) score += 50;
    }

    candidates.push({ file, score, reason });
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, limit).map(item => ({
    file: item.file,
    reason: item.reason,
    explicitCommand: getWindowsStartCommand(item.file.path),
  }));
}
