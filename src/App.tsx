import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  FileCategory, 
  FileItem, 
  SearchFilters, 
  SearchResult, 
  SearchHistoryItem, 
  SavedSearch, 
  SortByField, 
  ViewMode, 
  IndexedLocation,
  DriveInfo,
  ContextMenuState,
  ClipboardState,
  DragDropOperation
} from './types';
import { FastSearchEngine } from './services/searchEngine';
import { pickAndIndexLocalDirectory, isCrossOriginSubFrame } from './services/localFileSystem';
import { generateImageThumbnail } from './services/thumbnailService';
import { localDB } from './services/dbStorage';
import { TitleBar } from './components/TitleBar';
import { AddressToolbar } from './components/AddressToolbar';
import { CommandBar } from './components/CommandBar';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { Sidebar } from './components/Sidebar';
import { FileBrowser } from './components/FileBrowser';
import { PreviewPane } from './components/PreviewPane';
import { ContextMenu } from './components/ContextMenu';
import { PropertiesModal } from './components/PropertiesModal';
import { SaveSearchModal } from './components/SaveSearchModal';
import { SettingsModal } from './components/SettingsModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { StatusBar } from './components/StatusBar';
import { DriveGrantModal } from './components/DriveGrantModal';
import { BatchRenameModal } from './components/BatchRenameModal';
import { TagModal } from './components/TagModal';
import { createDefaultHighwaySampleFiles } from './services/sampleFiles';
import { launchFileWithDefaultApp, openContainingFolderInWindows, LauncherFeedback } from './services/localLauncher';
import { LauncherToast } from './components/LauncherToast';
import { EditPathModal } from './components/EditPathModal';

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  category: 'all',
  dateRange: 'any',
  dateTarget: 'modified',
  sortBy: 'relevance',
  sortDirection: 'asc',
};

export default function App() {
  // Theme state: Load preference from localStorage, default to Windows Light
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('infrafinder_theme');
    if (saved) return saved === 'dark';
    return false; // Default to Light theme
  });

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('infrafinder_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  // Tag Modal State
  const [tagModalFiles, setTagModalFiles] = useState<FileItem[] | null>(null);

  // Files & Index (Loaded from IndexedDB for permanent persistence)
  const [files, setFiles] = useState<FileItem[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [indexedLocations, setIndexedLocations] = useState<IndexedLocation[]>([]);
  const [excludedLocations, setExcludedLocations] = useState<string[]>([
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\$RECYCLE.BIN',
  ]);
  const [hasPromptedFirstTime, setHasPromptedFirstTime] = useState<boolean>(true); // default true until DB loads
  const [showDriveGrantModal, setShowDriveGrantModal] = useState<boolean>(false);
  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(true);
  const [currentScanningFolder, setCurrentScanningFolder] = useState<string>('');
  const [launcherFeedback, setLauncherFeedback] = useState<LauncherFeedback | null>(null);
  const [editingPathLocation, setEditingPathLocation] = useState<IndexedLocation | null>(null);

  // Load from IndexedDB on startup
  useEffect(() => {
    async function loadStoredData() {
      try {
        // Automatically clean legacy dummy data if previously present in DB
        await localDB.cleanLegacyDummyData();

        const storedFiles = await localDB.getAllFiles();
        const storedDrives = await localDB.getDrives();
        const storedLocations = await localDB.getSetting('indexed_locations');
        const permissionGranted = await localDB.getSetting('has_granted_drives');

        const cleanFiles = (storedFiles || []).filter(
          (f) =>
            f.isLocalImported === true &&
            !f.id.startsWith('file-nh-') &&
            !f.id.startsWith('dir-nh-') &&
            !f.path.includes('NH-48_Six_Laning_Project')
        );

        const cleanDrives = (storedDrives || []).filter(
          (d) =>
            !d.label.includes('Fast NVMe') &&
            !d.label.includes('Drone Archive') &&
            !d.label.includes('Windows System SSD')
        );

        if (cleanFiles && cleanFiles.length > 0) {
          setFiles(cleanFiles);
        } else {
          // Provide ready-to-test highway engineering files with preset tags
          const sample = createDefaultHighwaySampleFiles();
          setFiles(sample.files);
          setDrives(sample.drives);
          setIndexedLocations(sample.locations);
          setCurrentPath(sample.drives[0].letter);
          setHistory([sample.drives[0].letter]);
          await localDB.saveFilesBatch(sample.files);
          await localDB.saveDrives(sample.drives);
          await localDB.setSetting('indexed_locations', sample.locations);
        }

        if (cleanDrives && cleanDrives.length > 0) {
          setDrives(cleanDrives);
          setCurrentPath(cleanDrives[0].letter);
          setHistory([cleanDrives[0].letter]);
        }

        if (storedLocations && Array.isArray(storedLocations)) {
          const cleanLocs = storedLocations.filter((l: any) => !l.path?.includes('NH-48_Six_Laning_Project'));
          if (cleanLocs.length > 0) {
            setIndexedLocations(cleanLocs);
          }
        }

        // Only prompt first time if user hasn't connected drives
        if (!permissionGranted && cleanFiles.length === 0) {
          setShowDriveGrantModal(true);
        }
      } catch (err) {
        console.warn('IndexedDB initial load error:', err);
      } finally {
        setIsLoadingDB(false);
      }
    }
    loadStoredData();
  }, []);

  const searchEngine = useMemo(() => new FastSearchEngine(files), [files]);

  // Navigation & Path History
  const [currentPath, setCurrentPath] = useState<string>('D:');
  const [history, setHistory] = useState<string[]>(['D:']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // If drives load and currentPath is default, navigate to first drive
  useEffect(() => {
    if (drives.length > 0 && currentPath === 'D:' && !drives.some(d => d.letter === 'D:')) {
      setCurrentPath(drives[0].letter);
      setHistory([drives[0].letter]);
    }
  }, [drives]);

  // Search & Filters
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [showPreviewPane, setShowPreviewPane] = useState<boolean>(true);

  // Selection & Multi-select
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCheckboxes, setShowCheckboxes] = useState<boolean>(false);

  // Windows Explorer Clipboard (Cut / Copy / Paste)
  const [clipboard, setClipboard] = useState<ClipboardState>({ items: [], operation: null });

  // Batch Rename Modal
  const [showBatchRenameModal, setShowBatchRenameModal] = useState<boolean>(false);

  // History & Saved Searches
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    const saved = localStorage.getItem('infrafinder_search_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('infrafinder_saved_searches');
    return saved ? JSON.parse(saved) : [];
  });

  // Index status
  const [isIndexing, setIsIndexing] = useState(false);
  const [isIndexingPaused, setIsIndexingPaused] = useState(false);
  const [indexedCount, setIndexedCount] = useState(0);
  const [contentSearchEnabled, setContentSearchEnabled] = useState(true);

  // Context Menu & Modals
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [propertiesFile, setPropertiesFile] = useState<FileItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);

  // Hidden folder input for browser fallback
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Sync dark mode class with root html
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Save history & saved searches
  useEffect(() => {
    localStorage.setItem('infrafinder_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem('infrafinder_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  // Navigate path
  const navigateTo = useCallback((newPath: string) => {
    const cleanPath = newPath.replace(/[\\/]+$/, '') || 'D:';
    setCurrentPath(cleanPath);

    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(cleanPath);
      return next;
    });
    setHistoryIndex((prev) => prev + 1);

    setSelectedItem(null);
  }, [historyIndex]);

  const handleGoBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1]);
      setSelectedItem(null);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1]);
      setSelectedItem(null);
    }
  };

  const handleGoUp = () => {
    if (drives.some(d => d.letter === currentPath) || currentPath.length <= 2) return;
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    if (parts.length <= 1) {
      navigateTo(parts[0] || 'D:');
    } else {
      parts.pop();
      navigateTo(parts.join('\\'));
    }
  };

  const handleRefresh = () => {
    setIsIndexing(true);
    setTimeout(() => {
      setIsIndexing(false);
    }, 400);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const isModifier = e.ctrlKey || e.metaKey;

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleGoUp();
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleRefresh();
      } else if (isModifier && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAllVisible();
      } else if (isModifier && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (isModifier && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if (isModifier && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (isModifier && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewFolder();
      } else if (isModifier && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleOpenBatchRename();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (selectedIds.size > 1) {
          setShowBatchRenameModal(true);
        } else if (selectedItem) {
          handleRename(selectedItem);
        }
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key.toLowerCase() === 't' && !isModifier && !e.altKey) {
        const targets = selectedFilesList.length > 0 ? selectedFilesList : (selectedItem ? [selectedItem] : []);
        if (targets.length > 0) {
          e.preventDefault();
          setTagModalFiles(targets);
        }
      } else if (e.key === 'Escape') {
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [historyIndex, history, currentPath]);

  // Execute Search & Filtering via FastSearchEngine
  const hasQuery = Boolean(filters.query.trim());
  const isGlobalScope = hasQuery || Boolean(filters.selectedTag);

  const { results: searchResults, durationMs: searchDurationMs } = useMemo(() => {
    if (isGlobalScope) {
      return searchEngine.search({
        ...filters,
        sortBy: filters.sortBy === 'name' ? 'relevance' : filters.sortBy,
      });
    }

    const folderItems = searchEngine.getFolderChildren(currentPath);
    const subEngine = new FastSearchEngine(folderItems);
    return subEngine.search({
      ...filters,
      sortBy: filters.sortBy === 'relevance' ? 'name' : filters.sortBy,
    });
  }, [searchEngine, filters, currentPath, isGlobalScope]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const allItems = isGlobalScope ? searchEngine.getAllFiles() : searchEngine.getFolderChildren(currentPath);
    const counts: Record<FileCategory, number> = {
      all: allItems.length,
      pdf: 0,
      excel: 0,
      word: 0,
      ppt: 0,
      cad: 0,
      images: 0,
      other: 0,
      folder: 0,
    };

    for (const item of allItems) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return counts;
  }, [searchEngine, currentPath, isGlobalScope]);

  // Tag counts for FilterBar
  const tagCounts = useMemo(() => {
    return searchEngine.getAllTagsWithCounts();
  }, [searchEngine, files]);

  // Tags System Handlers
  const handleSaveTags = useCallback(
    async (targetFiles: FileItem[], newTags: string[]) => {
      if (targetFiles.length === 0) return;

      const targetIdSet = new Set(targetFiles.map((f) => f.id));
      const updatedFilesList: FileItem[] = [];

      setFiles((prev) => {
        return prev.map((f) => {
          if (targetIdSet.has(f.id)) {
            const updated = { ...f, tags: newTags };
            updatedFilesList.push(updated);
            searchEngine.addOrUpdateFile(updated);
            return updated;
          }
          return f;
        });
      });

      setSelectedItem((prev) => {
        if (prev && targetIdSet.has(prev.id)) {
          return { ...prev, tags: newTags };
        }
        return prev;
      });

      try {
        await localDB.saveFilesBatch(updatedFilesList);
      } catch (err) {
        console.warn('Failed to persist tags to IndexedDB:', err);
      }

      setLauncherFeedback({
        type: 'copy',
        title: 'Tags Updated',
        message: targetFiles.length === 1 
          ? `Updated tags for "${targetFiles[0].name}"`
          : `Updated tags for ${targetFiles.length} files`,
        path: targetFiles[0].path,
        command: '',
      });
    },
    [searchEngine]
  );

  const handleToggleTag = useCallback(
    async (item: FileItem, tagName: string) => {
      const currentTags = item.tags || [];
      const trimmed = tagName.trim();
      const hasTag = currentTags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
      const nextTags = hasTag
        ? currentTags.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())
        : [...currentTags, trimmed];

      const updatedItem: FileItem = { ...item, tags: nextTags };

      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? updatedItem : f))
      );

      searchEngine.addOrUpdateFile(updatedItem);

      setSelectedItem((prev) => (prev?.id === item.id ? updatedItem : prev));

      try {
        await localDB.saveFilesBatch([updatedItem]);
      } catch (err) {
        console.warn('Failed to save tag to IndexedDB:', err);
      }

      setLauncherFeedback({
        type: 'copy',
        title: 'Tag Toggle',
        message: hasTag 
          ? `Removed tag "${trimmed}" from ${item.name}` 
          : `Added tag "${trimmed}" to ${item.name}`,
        path: item.path,
        command: '',
      });
    },
    [searchEngine]
  );

  const handleSearchChange = useCallback((query: string) => {
    React.startTransition(() => {
      setFilters((prev) => ({ ...prev, query }));
    });

    if (query.trim().length > 1) {
      setSearchHistory((prev) => {
        const filtered = prev.filter((h) => h.query.toLowerCase() !== query.trim().toLowerCase());
        return [
          { id: 'hist-' + Date.now(), query: query.trim(), timestamp: Date.now() },
          ...filtered.slice(0, 14),
        ];
      });
    }
  }, []);

  const handleUpdateFilters = (partial: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleOpenItem = (item: FileItem) => {
    if (item.isFolder) {
      navigateTo(item.path);
    } else {
      setSelectedItem(item);
      const feedback = launchFileWithDefaultApp(item);
      setLauncherFeedback(feedback);
    }
  };

  const handleOpenContainingFolder = (item: FileItem) => {
    navigateTo(item.parentPath);
    const feedback = openContainingFolderInWindows(item);
    setLauncherFeedback(feedback);
  };

  const handleUpdateLocationPath = async (locId: string, oldPath: string, newPath: string) => {
    const updatedLocations = indexedLocations.map(loc => 
      loc.id === locId ? { ...loc, path: newPath } : loc
    );
    setIndexedLocations(updatedLocations);
    await localDB.setSetting('indexed_locations', updatedLocations);

    // Update all files that started with oldPath to start with newPath
    const updatedFiles = files.map(f => {
      if (f.path.startsWith(oldPath)) {
        const rel = f.path.substring(oldPath.length);
        const newFullPath = `${newPath}${rel}`;
        const newParent = f.parentPath.startsWith(oldPath) 
          ? `${newPath}${f.parentPath.substring(oldPath.length)}`
          : f.parentPath;
        return {
          ...f,
          path: newFullPath,
          parentPath: newParent,
        };
      }
      return f;
    });

    setFiles(updatedFiles);
    await localDB.saveFilesBatch(updatedFiles);

    if (currentPath.startsWith(oldPath)) {
      navigateTo(`${newPath}${currentPath.substring(oldPath.length)}`);
    }
  };

  // Saved Searches
  const handleSaveCurrentSearch = (name: string) => {
    const newSaved: SavedSearch = {
      id: 'saved-' + Date.now(),
      name,
      query: filters.query,
      category: filters.category,
      dateRange: filters.dateRange,
      dateTarget: filters.dateTarget,
      customStartDate: filters.customStartDate,
      customEndDate: filters.customEndDate,
      createdAt: new Date().toISOString(),
    };
    setSavedSearches((prev) => [newSaved, ...prev]);
  };

  const handleApplySavedSearch = (saved: SavedSearch) => {
    setFilters({
      query: saved.query,
      category: saved.category,
      dateRange: saved.dateRange,
      dateTarget: saved.dateTarget,
      customStartDate: saved.customStartDate,
      customEndDate: saved.customEndDate,
      sortBy: 'relevance',
      sortDirection: 'asc',
    });
  };

  const handleDeleteSavedSearch = (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  // Selected items list from selectedIds Set
  const selectedFilesList = useMemo(() => {
    return files.filter((f) => selectedIds.has(f.id));
  }, [files, selectedIds]);

  // Selection handlers
  const handleSelectItem = useCallback((item: FileItem, isCtrl: boolean, isShift: boolean) => {
    if (isCtrl) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
      setSelectedItem(item);
    } else if (isShift && selectedItem) {
      const fromIdx = searchResults.findIndex((r) => r.file.id === selectedItem.id);
      const toIdx = searchResults.findIndex((r) => r.file.id === item.id);
      if (fromIdx !== -1 && toIdx !== -1) {
        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);
        const rangeIds = searchResults.slice(start, end + 1).map((r) => r.file.id);
        setSelectedIds(new Set(rangeIds));
        setSelectedItem(item);
      } else {
        setSelectedIds(new Set([item.id]));
        setSelectedItem(item);
      }
    } else {
      setSelectedIds(new Set([item.id]));
      setSelectedItem(item);
    }
  }, [searchResults, selectedItem]);

  const handleToggleSelectItem = useCallback((item: FileItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
    setSelectedItem(item);
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    const visibleIds = searchResults.map((r) => r.file.id);
    setSelectedIds((prev) => {
      if (visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))) {
        return new Set();
      } else {
        return new Set(visibleIds);
      }
    });
  }, [searchResults]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedItem(null);
  }, []);

  // Context Menu Actions
  const handleContextMenu = (e: React.MouseEvent, item?: FileItem) => {
    e.preventDefault();
    if (item) {
      if (!selectedIds.has(item.id)) {
        setSelectedIds(new Set([item.id]));
        setSelectedItem(item);
      }
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        item,
        items: selectedIds.has(item.id) && selectedFilesList.length > 0 ? selectedFilesList : [item],
        isBackground: false,
      });
    } else {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        isBackground: true,
      });
    }
  };

  const handleCopyPath = (item: FileItem) => {
    navigator.clipboard.writeText(item.path);
  };

  const handleCopyFile = (item: FileItem) => {
    navigator.clipboard.writeText(item.name);
  };

  const handleRename = async (item: FileItem) => {
    if (selectedIds.size > 1) {
      setShowBatchRenameModal(true);
      return;
    }
    const newName = prompt('Enter new filename:', item.name);
    if (newName && newName.trim() && newName !== item.name) {
      const parent = item.parentPath || currentPath;
      const newPath = `${parent}\\${newName.trim()}`;
      const ext = !item.isFolder && newName.includes('.') ? newName.split('.').pop() || '' : item.extension;

      const updated = files.map((f) => {
        if (f.id === item.id) {
          return { ...f, name: newName.trim(), path: newPath, extension: ext };
        }
        if (item.isFolder && f.path.startsWith(`${item.path}\\`)) {
          const suffix = f.path.substring(item.path.length);
          return {
            ...f,
            path: `${newPath}${suffix}`,
            parentPath: f.parentPath.startsWith(item.path) ? `${newPath}${f.parentPath.substring(item.path.length)}` : f.parentPath,
          };
        }
        return f;
      });
      setFiles(updated);
      await localDB.saveFilesBatch(updated);
    }
  };

  // Batch Rename Handler
  const handleOpenBatchRename = () => {
    if (selectedIds.size > 0) {
      setShowBatchRenameModal(true);
    }
  };

  const handleApplyBatchRename = async (renamedList: Array<{ item: FileItem; newName: string; newPath: string }>) => {
    const renameMap = new Map<string, { newName: string; newPath: string }>();
    for (const r of renamedList) {
      renameMap.set(r.item.id, { newName: r.newName, newPath: r.newPath });
    }

    const updatedFiles = files.map((file) => {
      if (renameMap.has(file.id)) {
        const { newName, newPath } = renameMap.get(file.id)!;
        const ext = !file.isFolder && newName.includes('.') ? newName.split('.').pop() || '' : file.extension;
        return {
          ...file,
          name: newName,
          path: newPath,
          extension: ext,
        };
      }

      for (const r of renamedList) {
        if (r.item.isFolder && file.path.startsWith(`${r.item.path}\\`)) {
          const suffix = file.path.substring(r.item.path.length);
          const newPath = `${r.newPath}${suffix}`;
          const newParent = file.parentPath.startsWith(r.item.path)
            ? `${r.newPath}${file.parentPath.substring(r.item.path.length)}`
            : file.parentPath;
          return {
            ...file,
            path: newPath,
            parentPath: newParent,
          };
        }
      }

      return file;
    });

    setFiles(updatedFiles);
    await localDB.saveFilesBatch(updatedFiles);
    setLauncherFeedback({
      type: 'copy',
      title: 'Batch Rename Complete',
      message: `Batch renamed ${renamedList.length} files successfully!`,
      path: currentPath,
      command: `explorer.exe "${currentPath}"`,
    });
  };

  // Clipboard operations (Cut / Copy / Paste)
  const handleCut = () => {
    if (selectedFilesList.length > 0) {
      setClipboard({ items: [...selectedFilesList], operation: 'cut' });
    }
  };

  const handleCopy = () => {
    if (selectedFilesList.length > 0) {
      setClipboard({ items: [...selectedFilesList], operation: 'copy' });
    }
  };

  const handlePaste = async (targetFolder?: FileItem) => {
    if (clipboard.items.length === 0) return;
    const destFolder = targetFolder ? targetFolder.path : currentPath;

    if (clipboard.operation === 'cut') {
      const movedIds = new Set(clipboard.items.map((i) => i.id));
      const updatedFiles = files.map((file) => {
        if (movedIds.has(file.id)) {
          return {
            ...file,
            path: `${destFolder}\\${file.name}`,
            parentPath: destFolder,
          };
        }
        return file;
      });

      setFiles(updatedFiles);
      await localDB.saveFilesBatch(updatedFiles);
      setClipboard({ items: [], operation: null });
      setLauncherFeedback({
        type: 'folder',
        title: 'Items Moved',
        message: `Moved ${clipboard.items.length} items to ${destFolder}`,
        path: destFolder,
        command: `explorer.exe "${destFolder}"`,
      });
    } else if (clipboard.operation === 'copy') {
      const clonedItems: FileItem[] = [];
      for (const item of clipboard.items) {
        const isSameFolder = item.parentPath === destFolder;
        let newName = item.name;
        if (isSameFolder && !item.isFolder && item.name.includes('.')) {
          const lastDot = item.name.lastIndexOf('.');
          newName = `${item.name.substring(0, lastDot)} - Copy${item.name.substring(lastDot)}`;
        } else if (isSameFolder) {
          newName = `${item.name} - Copy`;
        }

        const cloned: FileItem = {
          ...item,
          id: 'file-copy-' + Math.random().toString(36).substring(2, 9),
          name: newName,
          path: `${destFolder}\\${newName}`,
          parentPath: destFolder,
          createdDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
        };
        clonedItems.push(cloned);
      }

      const nextFiles = [...clonedItems, ...files];
      setFiles(nextFiles);
      await localDB.saveFilesBatch(nextFiles);
      setLauncherFeedback({
        type: 'copy',
        title: 'Items Copied',
        message: `Copied ${clipboard.items.length} items to ${destFolder}`,
        path: destFolder,
        command: `explorer.exe "${destFolder}"`,
      });
    }
  };

  const handleDeleteSelected = async () => {
    const toDeleteCount = selectedIds.size;
    if (toDeleteCount === 0) return;

    if (confirm(`Are you sure you want to remove ${toDeleteCount} ${toDeleteCount === 1 ? 'item' : 'items'} from index?`)) {
      const remaining = files.filter((f) => !selectedIds.has(f.id));
      setFiles(remaining);
      await localDB.clearAllFiles();
      await localDB.saveFilesBatch(remaining);
      await localDB.saveDrives(drives);
      setSelectedIds(new Set());
      setSelectedItem(null);
    }
  };

  const handleNewFolder = async () => {
    let folderName = 'New Folder';
    let counter = 1;
    while (files.some((f) => f.parentPath === currentPath && f.name.toLowerCase() === folderName.toLowerCase())) {
      counter++;
      folderName = `New Folder (${counter})`;
    }

    const newFolder: FileItem = {
      id: 'dir-' + Math.random().toString(36).substring(2, 9),
      name: folderName,
      extension: '',
      path: `${currentPath}\\${folderName}`,
      parentPath: currentPath,
      category: 'folder',
      size: 0,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      isFolder: true,
      isLocalImported: true,
      itemCount: 0,
    };

    const nextFiles = [newFolder, ...files];
    setFiles(nextFiles);
    await localDB.saveFilesBatch(nextFiles);
    setSelectedIds(new Set([newFolder.id]));
    setSelectedItem(newFolder);
  };

  const handleNewFile = async () => {
    let fileName = 'New Text Document.txt';
    let counter = 1;
    while (files.some((f) => f.parentPath === currentPath && f.name.toLowerCase() === fileName.toLowerCase())) {
      counter++;
      fileName = `New Text Document (${counter}).txt`;
    }

    const newDoc: FileItem = {
      id: 'file-' + Math.random().toString(36).substring(2, 9),
      name: fileName,
      extension: 'txt',
      path: `${currentPath}\\${fileName}`,
      parentPath: currentPath,
      category: 'other',
      size: 0,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      isFolder: false,
      isLocalImported: true,
      contentFull: '',
    };

    const nextFiles = [newDoc, ...files];
    setFiles(nextFiles);
    await localDB.saveFilesBatch(nextFiles);
    setSelectedIds(new Set([newDoc.id]));
    setSelectedItem(newDoc);
  };

  // Drag and drop destination handler
  const handleDropItemsOnTarget = async (destPath: string, itemIds: string[], op: DragDropOperation) => {
    const targetItems = files.filter((f) => itemIds.includes(f.id));
    if (targetItems.length === 0) return;

    if (op === 'copy') {
      const clonedItems: FileItem[] = [];
      for (const item of targetItems) {
        const isSameFolder = item.parentPath === destPath;
        let newName = item.name;
        if (isSameFolder && !item.isFolder && item.name.includes('.')) {
          const lastDot = item.name.lastIndexOf('.');
          newName = `${item.name.substring(0, lastDot)} - Copy${item.name.substring(lastDot)}`;
        } else if (isSameFolder) {
          newName = `${item.name} - Copy`;
        }

        const cloned: FileItem = {
          ...item,
          id: 'file-copy-' + Math.random().toString(36).substring(2, 9),
          name: newName,
          path: `${destPath}\\${newName}`,
          parentPath: destPath,
          createdDate: new Date().toISOString(),
          modifiedDate: new Date().toISOString(),
        };
        clonedItems.push(cloned);
      }

      const nextFiles = [...clonedItems, ...files];
      setFiles(nextFiles);
      await localDB.saveFilesBatch(nextFiles);
      setLauncherFeedback({
        type: 'copy',
        title: 'Drag & Drop Copy',
        message: `Copied ${targetItems.length} items to ${destPath}`,
        path: destPath,
        command: `explorer.exe "${destPath}"`,
      });
    } else {
      const movedIds = new Set(itemIds);
      const updatedFiles = files.map((file) => {
        if (movedIds.has(file.id)) {
          return {
            ...file,
            path: `${destPath}\\${file.name}`,
            parentPath: destPath,
          };
        }
        return file;
      });

      setFiles(updatedFiles);
      await localDB.saveFilesBatch(updatedFiles);
      setLauncherFeedback({
        type: 'folder',
        title: 'Drag & Drop Move',
        message: `Moved ${targetItems.length} items to ${destPath}`,
        path: destPath,
        command: `explorer.exe "${destPath}"`,
      });
    }
  };

  // External PC files dropped into browser
  const handleDropExternalFiles = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;
    const importedItems: FileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.includes('.') ? f.name.split('.').pop() || '' : '';
      const lowerExt = ext.toLowerCase();
      const category: FileCategory =
        lowerExt === 'pdf' ? 'pdf' :
        ['xlsx', 'xls', 'csv'].includes(lowerExt) ? 'excel' :
        ['docx', 'doc'].includes(lowerExt) ? 'word' :
        ['pptx', 'ppt'].includes(lowerExt) ? 'ppt' :
        ['dwg', 'dxf'].includes(lowerExt) ? 'cad' :
        ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif', 'svg'].includes(lowerExt) ? 'images' : 'other';

      let contentFull = '';
      let textSnippet = '';
      let thumbnailUrl: string | undefined = undefined;
      let imageDimensions: { width: number; height: number } | undefined = undefined;

      // Extract text content for .txt and .log files
      if (['txt', 'log', 'csv', 'md', 'json', 'xml', 'ini', 'cfg'].includes(lowerExt) && f.size < 2000000) {
        try {
          const text = await f.text();
          contentFull = text;
          textSnippet = text.slice(0, 200);
        } catch {
          // ignore
        }
      }

      // Generate thumbnail for image files
      if (['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif', 'svg'].includes(lowerExt) && f.size < 25000000) {
        try {
          const thumb = await generateImageThumbnail(f);
          if (thumb) {
            thumbnailUrl = thumb.thumbnailUrl;
            imageDimensions = { width: thumb.width, height: thumb.height };
          }
        } catch {
          // ignore
        }
      }

      const fileItem: FileItem = {
        id: 'file-' + Math.random().toString(36).substring(2, 9),
        name: f.name,
        extension: ext,
        path: `${currentPath}\\${f.name}`,
        parentPath: currentPath,
        category,
        size: f.size,
        createdDate: new Date(f.lastModified).toISOString(),
        modifiedDate: new Date(f.lastModified).toISOString(),
        isFolder: false,
        contentFull: contentFull || textSnippet,
        contentSnippet: textSnippet ? textSnippet.slice(0, 160) : undefined,
        thumbnailUrl,
        imageDimensions,
        isLocalImported: true,
      };
      importedItems.push(fileItem);
    }

    const nextFiles = [...importedItems, ...files];
    setFiles(nextFiles);
    await localDB.saveFilesBatch(importedItems);
    setLauncherFeedback({
      type: 'folder',
      title: 'Files Indexed',
      message: `Indexed ${fileList.length} local files into ${currentPath}`,
      path: currentPath,
      command: `explorer.exe "${currentPath}"`,
    });
  };

  // Real Local Drive / Folder Indexing with Persistent Storage (TB-capable)
  const handleAddLocalDriveOrFolder = async () => {
    // If in iframe or showDirectoryPicker is prohibited, fall back directly to HTML5 directory picker
    if (isCrossOriginSubFrame() || typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      folderInputRef.current?.click();
      return;
    }

    try {
      setIsIndexing(true);
      const res = await pickAndIndexLocalDirectory(
        (count, folder) => {
          setIndexedCount(count);
          setCurrentScanningFolder(folder);
        },
        async (batch) => {
          await localDB.saveFilesBatch(batch);
        }
      );

      if (!res) {
        setIsIndexing(false);
        folderInputRef.current?.click();
        return;
      }

      if (res.dirHandle) {
        await localDB.saveDirHandle({
          id: 'drive-' + res.driveLetter.replace(':', ''),
          name: res.folderName,
          driveLetter: res.driveLetter,
          path: res.folderPath,
          handle: res.dirHandle,
          addedAt: new Date().toISOString(),
        });
      }

      if (res.files.length > 0) {
        await localDB.saveFilesBatch(res.files);
        setFiles((prev) => {
          const map = new Map(prev.map((f) => [f.id, f]));
          for (const f of res.files) {
            map.set(f.id, f);
          }
          return Array.from(map.values());
        });

        const driveLetter = res.driveLetter || 'D:';
        let updatedDrives = [...drives];
        const existingDriveIdx = updatedDrives.findIndex((d) => d.letter === driveLetter);
        const totalSize = res.files.reduce((acc, f) => acc + (f.size || 0), 0);

        const newDrive: DriveInfo = {
          letter: driveLetter,
          label: `${res.folderName} (My PC)`,
          totalBytes: Math.max(3 * 1024 * 1024 * 1024 * 1024, totalSize * 1.5),
          usedBytes: totalSize,
          type: 'Engineering Drive',
        };

        if (existingDriveIdx >= 0) {
          updatedDrives[existingDriveIdx] = newDrive;
        } else {
          updatedDrives.push(newDrive);
        }
        setDrives(updatedDrives);
        await localDB.saveDrives(updatedDrives);

        const newLoc: IndexedLocation = {
          id: 'loc-' + Date.now(),
          path: res.folderPath,
          name: `${res.folderName} (My PC)`,
          drive: driveLetter,
          fileCount: res.files.length,
          isIncluded: true,
        };
        const nextLocs = [...indexedLocations.filter((l) => l.path !== res.folderPath), newLoc];
        setIndexedLocations(nextLocs);
        await localDB.setSetting('indexed_locations', nextLocs);
        await localDB.setSetting('has_granted_drives', true);

        navigateTo(res.folderPath);
        setShowDriveGrantModal(false);
      }
    } catch {
      setIsIndexing(false);
      folderInputRef.current?.click();
    } finally {
      setIsIndexing(false);
      setCurrentScanningFolder('');
    }
  };

  // HTML5 folder input change handler (100% compliant across iframes and standalone)
  const handleFallbackFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsIndexing(true);
    const importedItems: FileItem[] = [];
    const folderMap = new Map<string, FileItem>();
    const folderName = fileList[0].webkitRelativePath.split('/')[0] || 'Local_Projects';
    const driveLetter = 'D:';
    const rootPath = `${driveLetter}\\${folderName}`;

    // Add root directory
    const rootFolderId = 'dir-' + Math.random().toString(36).substring(2, 9);
    const rootFolderItem: FileItem = {
      id: rootFolderId,
      name: folderName,
      extension: '',
      path: rootPath,
      parentPath: driveLetter,
      category: 'folder',
      size: 0,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      isFolder: true,
      isLocalImported: true,
    };
    folderMap.set(rootPath, rootFolderItem);
    importedItems.push(rootFolderItem);

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const relPathParts = f.webkitRelativePath.split('/');

      // Ensure intermediate directory items exist for explorer navigation
      let currentDir = `${driveLetter}\\${relPathParts[0]}`;
      for (let p = 1; p < relPathParts.length - 1; p++) {
        const seg = relPathParts[p];
        const nextDir = `${currentDir}\\${seg}`;
        if (!folderMap.has(nextDir)) {
          const dirItem: FileItem = {
            id: 'dir-' + Math.random().toString(36).substring(2, 9),
            name: seg,
            extension: '',
            path: nextDir,
            parentPath: currentDir,
            category: 'folder',
            size: 0,
            createdDate: new Date(f.lastModified).toISOString(),
            modifiedDate: new Date(f.lastModified).toISOString(),
            isFolder: true,
            isLocalImported: true,
          };
          folderMap.set(nextDir, dirItem);
          importedItems.push(dirItem);
        }
        currentDir = nextDir;
      }

      const relPath = f.webkitRelativePath.replace(/\//g, '\\');
      const ext = f.name.includes('.') ? f.name.split('.').pop() || '' : '';
      const lowerExt = ext.toLowerCase();
      const category: FileCategory =
        lowerExt === 'pdf' ? 'pdf' :
        ['xlsx', 'xls', 'csv'].includes(lowerExt) ? 'excel' :
        ['docx', 'doc'].includes(lowerExt) ? 'word' :
        ['pptx', 'ppt'].includes(lowerExt) ? 'ppt' :
        ['dwg', 'dxf'].includes(lowerExt) ? 'cad' :
        ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif', 'svg'].includes(lowerExt) ? 'images' : 'other';

      let contentFull = '';
      let textSnippet = '';
      let thumbnailUrl: string | undefined = undefined;
      let imageDimensions: { width: number; height: number } | undefined = undefined;

      // Extract text content for .txt and .log files
      if (['txt', 'log', 'csv', 'md', 'json', 'xml', 'ini', 'cfg'].includes(lowerExt) && f.size < 2000000) {
        try {
          const text = await f.text();
          contentFull = text;
          textSnippet = text.slice(0, 200);
        } catch {
          // ignore
        }
      }

      // Generate thumbnail for image files
      if (['jpg', 'jpeg', 'png', 'bmp', 'webp', 'gif', 'svg'].includes(lowerExt) && f.size < 25000000) {
        try {
          const thumb = await generateImageThumbnail(f);
          if (thumb) {
            thumbnailUrl = thumb.thumbnailUrl;
            imageDimensions = { width: thumb.width, height: thumb.height };
          }
        } catch {
          // ignore
        }
      }

      const fileItem: FileItem = {
        id: 'file-' + Math.random().toString(36).substring(2, 9),
        name: f.name,
        extension: ext,
        path: `${driveLetter}\\${relPath}`,
        parentPath: `${driveLetter}\\${relPath.split('\\').slice(0, -1).join('\\')}`,
        category,
        size: f.size,
        createdDate: new Date(f.lastModified).toISOString(),
        modifiedDate: new Date(f.lastModified).toISOString(),
        isFolder: false,
        contentFull: contentFull || textSnippet,
        contentSnippet: textSnippet ? textSnippet.slice(0, 160) : undefined,
        thumbnailUrl,
        imageDimensions,
        isLocalImported: true,
      };

      importedItems.push(fileItem);

      if (i % 40 === 0) {
        setIndexedCount(i);
        setCurrentScanningFolder(`${driveLetter}\\${relPath}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // Save batch to IndexedDB
    await localDB.saveFilesBatch(importedItems);

    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      for (const f of importedItems) {
        map.set(f.id, f);
      }
      return Array.from(map.values());
    });

    const totalSize = importedItems.reduce((acc, f) => acc + (f.size || 0), 0);
    const newDrive: DriveInfo = {
      letter: driveLetter,
      label: `${folderName} (My PC)`,
      totalBytes: Math.max(3 * 1024 * 1024 * 1024 * 1024, totalSize * 1.5),
      usedBytes: totalSize,
      type: 'Engineering Drive',
    };

    let updatedDrives = [...drives];
    const existingIdx = updatedDrives.findIndex((d) => d.letter === driveLetter);
    if (existingIdx >= 0) {
      updatedDrives[existingIdx] = newDrive;
    } else {
      updatedDrives.push(newDrive);
    }
    setDrives(updatedDrives);
    await localDB.saveDrives(updatedDrives);

    const newLoc: IndexedLocation = {
      id: 'loc-' + Date.now(),
      path: rootPath,
      name: `${folderName} (My PC)`,
      drive: driveLetter,
      fileCount: importedItems.length,
      isIncluded: true,
    };
    const nextLocs = [...indexedLocations.filter((l) => l.path !== rootPath), newLoc];
    setIndexedLocations(nextLocs);
    await localDB.setSetting('indexed_locations', nextLocs);
    await localDB.setSetting('has_granted_drives', true);

    navigateTo(rootPath);
    setIsIndexing(false);
    setCurrentScanningFolder('');
    setShowDriveGrantModal(false);
    e.target.value = '';
  };

  const handleClearEntireDatabase = async () => {
    if (confirm('Clear all indexed files and drive permissions from this PC? You can re-index anytime.')) {
      await localDB.clearAllFiles();
      await localDB.setSetting('indexed_locations', []);
      await localDB.setSetting('has_granted_drives', false);
      setFiles([]);
      setDrives([]);
      setIndexedLocations([]);
      setCurrentPath('D:');
      setSelectedItem(null);
    }
  };

  const handleLoadSampleFiles = useCallback(async () => {
    const sample = createDefaultHighwaySampleFiles();
    setFiles(sample.files);
    setDrives(sample.drives);
    setIndexedLocations(sample.locations);
    setCurrentPath(sample.drives[0].letter);
    setHistory([sample.drives[0].letter]);
    setShowDriveGrantModal(false);
    try {
      await localDB.saveFilesBatch(sample.files);
      await localDB.saveDrives(sample.drives);
      await localDB.setSetting('indexed_locations', sample.locations);
      await localDB.setSetting('has_granted_drives', true);
    } catch (err) {
      console.warn('Error saving sample files:', err);
    }
  }, []);

  // Calculate total indexed size
  const totalSizeIndexed = useMemo(() => {
    return files.reduce((acc, curr) => acc + (curr.size || 0), 0);
  }, [files]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-[#11151c] text-slate-900 dark:text-slate-100 font-sans">
      {/* Hidden File Picker fallback */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory standard
        webkitdirectory="true"
        multiple
        className="hidden"
        onChange={handleFallbackFolderSelect}
      />

      {/* 1. Windows 11 Title Bar */}
      <TitleBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenArchitecture={() => setShowArchitecture(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        indexStatus={isIndexing ? 'Indexing PC Files...' : 'Index Up to Date'}
        onAddLocalFolder={handleAddLocalDriveOrFolder}
      />

      {/* 2. Windows Explorer Navigation Toolbar & Address Bar */}
      <AddressToolbar
        currentPath={currentPath}
        onNavigatePath={navigateTo}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        canGoUp={!drives.some(d => d.letter === currentPath) && currentPath.length > 2}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onGoUp={handleGoUp}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showPreviewPane={showPreviewPane}
        onTogglePreviewPane={() => setShowPreviewPane(!showPreviewPane)}
        onDropOnBreadcrumb={(targetPath, itemIds, op) => handleDropItemsOnTarget(targetPath, itemIds, op)}
      />

      {/* 3. Windows 11 Explorer Command Bar */}
      <CommandBar
        selectedItems={selectedFilesList}
        clipboard={clipboard}
        onNewFolder={handleNewFolder}
        onNewFile={handleNewFile}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={() => handlePaste()}
        onDelete={handleDeleteSelected}
        onRename={() => {
          if (selectedFilesList.length > 1) {
            setShowBatchRenameModal(true);
          } else if (selectedFilesList.length === 1) {
            handleRename(selectedFilesList[0]);
          }
        }}
        onBatchRename={handleOpenBatchRename}
        onSelectAll={handleSelectAllVisible}
        onClearSelection={handleClearSelection}
        showCheckboxes={showCheckboxes}
        onToggleCheckboxes={() => setShowCheckboxes(!showCheckboxes)}
        sortBy={filters.sortBy}
        sortDirection={filters.sortDirection}
        onSortChange={(field) => {
          if (filters.sortBy === field) {
            handleUpdateFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' });
          } else {
            handleUpdateFilters({ sortBy: field, sortDirection: 'asc' });
          }
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onProperties={() => {
          if (selectedFilesList.length > 0) {
            setPropertiesFile(selectedFilesList[0]);
          }
        }}
        onManageTags={() => {
          const targets = selectedFilesList.length > 0 ? selectedFilesList : (selectedItem ? [selectedItem] : []);
          if (targets.length > 0) setTagModalFiles(targets);
        }}
      />

      {/* 4. Ultra-Fast Search Bar Header */}
      <div className="bg-[#f0f4f9] dark:bg-[#161a22] border-b border-[#dbe3ed] dark:border-[#283243] px-3 py-2 flex items-center gap-3 shrink-0">
        <SearchBar
          searchQuery={filters.query}
          onSearchChange={handleSearchChange}
          searchDurationMs={searchDurationMs}
          totalResultsCount={searchResults.length}
          searchHistory={searchHistory}
          onSelectHistoryItem={(q) => handleSearchChange(q)}
          onRemoveHistoryItem={(id) => setSearchHistory((prev) => prev.filter((h) => h.id !== id))}
          onClearHistory={() => setSearchHistory([])}
          onSaveCurrentSearch={() => setShowSaveSearch(true)}
        />
      </div>

      {/* 5. One-Click File Filters & Date Bar */}
      <FilterBar
        filters={filters}
        onUpdateFilters={handleUpdateFilters}
        onResetFilters={handleResetFilters}
        onSaveSearchClick={() => setShowSaveSearch(true)}
        categoryCounts={categoryCounts}
        tagCounts={tagCounts}
      />

      {/* 6. Main Workspace: Sidebar + File List / Grid + Document Preview Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Windows Sidebar */}
        <Sidebar
          drives={drives}
          currentPath={currentPath}
          onNavigatePath={navigateTo}
          indexedLocations={indexedLocations}
          onToggleIndexLocation={(id) =>
            setIndexedLocations((prev) =>
              prev.map((loc) => (loc.id === id ? { ...loc, isIncluded: !loc.isIncluded } : loc))
            )
          }
          savedSearches={savedSearches}
          onApplySavedSearch={handleApplySavedSearch}
          onDeleteSavedSearch={handleDeleteSavedSearch}
          onAddLocalFolder={handleAddLocalDriveOrFolder}
          isIndexing={isIndexing}
          onClearIndex={handleClearEntireDatabase}
          onRefreshIndex={handleRefresh}
          onEditLocationPath={(loc) => setEditingPathLocation(loc)}
          onDropOnSidebarItem={(targetPath, itemIds, op) => handleDropItemsOnTarget(targetPath, itemIds, op)}
        />

        {/* Center File Browser */}
        <FileBrowser
          searchResults={searchResults}
          selectedItem={selectedItem}
          selectedIds={selectedIds}
          clipboard={clipboard}
          showCheckboxes={showCheckboxes}
          onSelectItem={handleSelectItem}
          onToggleSelectItem={handleToggleSelectItem}
          onSelectAllVisible={handleSelectAllVisible}
          onClearSelection={handleClearSelection}
          onOpenItem={handleOpenItem}
          onContextMenu={handleContextMenu}
          onDropItemsOnFolder={(targetFolder, itemIds, op) => handleDropItemsOnTarget(targetFolder.path, itemIds, op)}
          onDropExternalFiles={handleDropExternalFiles}
          onBatchRename={handleOpenBatchRename}
          onCopy={handleCopy}
          onCut={handleCut}
          onDelete={handleDeleteSelected}
          searchQuery={filters.query}
          sortBy={filters.sortBy}
          sortDirection={filters.sortDirection}
          onSortChange={(field) => {
            if (filters.sortBy === field) {
              handleUpdateFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' });
            } else {
              handleUpdateFilters({ sortBy: field, sortDirection: 'asc' });
            }
          }}
          viewMode={viewMode}
          currentPath={currentPath}
          onAddLocalFolder={handleAddLocalDriveOrFolder}
          onNewFolder={handleNewFolder}
          onManageTags={() => {
            const targets = selectedFilesList.length > 0 ? selectedFilesList : (selectedItem ? [selectedItem] : []);
            if (targets.length > 0) setTagModalFiles(targets);
          }}
          onTagClick={(tag) => handleUpdateFilters({ selectedTag: filters.selectedTag === tag ? undefined : tag })}
        />

        {/* Right Preview Pane (collapsible) */}
        {showPreviewPane && (
          <PreviewPane
            file={selectedItem}
            onClose={() => setShowPreviewPane(false)}
            onOpenItem={handleOpenItem}
            onOpenContainingFolder={handleOpenContainingFolder}
            onManageTags={(file) => setTagModalFiles([file])}
          />
        )}
      </div>

      {/* 7. Bottom Status Bar */}
      <StatusBar
        totalItemsCount={files.length}
        filteredItemsCount={searchResults.length}
        selectedItemSize={selectedFilesList.reduce((acc, curr) => acc + (curr.size || 0), 0)}
        totalSizeIndexed={totalSizeIndexed}
        isIndexing={isIndexing}
        indexedCount={indexedCount || files.length}
        totalToScan={files.length || 0}
        searchDurationMs={searchDurationMs}
        hasQuery={hasQuery}
      />

      {/* First-Time Drive & Permission Grant Modal */}
      {showDriveGrantModal && (
        <DriveGrantModal
          onGrantPermission={handleAddLocalDriveOrFolder}
          onClose={() => setShowDriveGrantModal(false)}
          onLoadSampleFiles={handleLoadSampleFiles}
          isIndexing={isIndexing}
          indexedCount={indexedCount}
          currentScanningFolder={currentScanningFolder}
          grantedDrives={drives}
        />
      )}

      {/* Batch Rename Modal */}
      {showBatchRenameModal && (
        <BatchRenameModal
          selectedItems={selectedFilesList.length > 0 ? selectedFilesList : (selectedItem ? [selectedItem] : [])}
          onClose={() => setShowBatchRenameModal(false)}
          onApply={handleApplyBatchRename}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          selectedItems={selectedFilesList.length > 0 && contextMenu.item && selectedIds.has(contextMenu.item.id) ? selectedFilesList : (contextMenu.item ? [contextMenu.item] : [])}
          isBackground={contextMenu.isBackground}
          clipboard={clipboard}
          onClose={() => setContextMenu(null)}
          onOpen={handleOpenItem}
          onOpenContainingFolder={handleOpenContainingFolder}
          onCopyPath={handleCopyPath}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={(targetFolder) => handlePaste(targetFolder)}
          onRename={handleRename}
          onBatchRename={handleOpenBatchRename}
          onDelete={handleDeleteSelected}
          onProperties={(item) => setPropertiesFile(item || selectedFilesList[0] || null)}
          onNewFolder={handleNewFolder}
          onNewFile={handleNewFile}
          onRefresh={handleRefresh}
          onSelectAll={handleSelectAllVisible}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSortChange={(field) => {
            if (filters.sortBy === field) {
              handleUpdateFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' });
            } else {
              handleUpdateFilters({ sortBy: field, sortDirection: 'asc' });
            }
          }}
          onToggleTag={handleToggleTag}
          onManageTags={(items) => setTagModalFiles(items)}
        />
      )}

      {/* Properties Dialog */}
      {propertiesFile && (
        <PropertiesModal
          file={propertiesFile}
          onClose={() => setPropertiesFile(null)}
        />
      )}

      {/* Save Search Modal */}
      {showSaveSearch && (
        <SaveSearchModal
          filters={filters}
          onSave={handleSaveCurrentSearch}
          onClose={() => setShowSaveSearch(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          indexedLocations={indexedLocations}
          excludedLocations={excludedLocations}
          onAddIndexedLocation={handleAddLocalDriveOrFolder}
          onRemoveIndexedLocation={async (id) => {
            const next = indexedLocations.filter((loc) => loc.id !== id);
            setIndexedLocations(next);
            await localDB.setSetting('indexed_locations', next);
          }}
          onAddExcludedLocation={(path) =>
            setExcludedLocations((prev) => [...prev, path])
          }
          onRemoveExcludedLocation={(path) =>
            setExcludedLocations((prev) => prev.filter((p) => p !== path))
          }
          onRebuildIndex={handleRefresh}
          isIndexingPaused={isIndexingPaused}
          onTogglePauseIndexing={() => setIsIndexingPaused(!isIndexingPaused)}
          contentSearchEnabled={contentSearchEnabled}
          onToggleContentSearch={() => setContentSearchEnabled(!contentSearchEnabled)}
          defaultSort={filters.sortBy}
          onDefaultSortChange={(sort) => handleUpdateFilters({ sortBy: sort })}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      )}

      {/* Tag Metadata Management Modal */}
      {tagModalFiles && (
        <TagModal
          files={tagModalFiles}
          onClose={() => setTagModalFiles(null)}
          onSaveTags={handleSaveTags}
        />
      )}

      {/* Architecture Tech Stack Blueprint Modal */}
      {showArchitecture && (
        <ArchitectureModal onClose={() => setShowArchitecture(false)} />
      )}

      {/* Windows Local PC Launcher Toast Notification */}
      {launcherFeedback && (
        <LauncherToast
          feedback={launcherFeedback}
          onClose={() => setLauncherFeedback(null)}
        />
      )}

      {/* Edit Windows PC Path Prefix Modal */}
      {editingPathLocation && (
        <EditPathModal
          location={editingPathLocation}
          onSaveNewPath={handleUpdateLocationPath}
          onClose={() => setEditingPathLocation(null)}
        />
      )}
    </div>
  );
}
