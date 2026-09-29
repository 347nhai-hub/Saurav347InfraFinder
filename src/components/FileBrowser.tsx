import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  FileImage, 
  File, 
  Folder, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Presentation, 
  CheckSquare, 
  Square, 
  Edit3, 
  Sparkles, 
  Copy, 
  Scissors, 
  Trash2, 
  X,
  UploadCloud,
  FolderPlus,
  Tag
} from 'lucide-react';
import { FileItem, SearchResult, SortByField, SortDirection, ViewMode, ClipboardState, DragDropOperation } from '../types';
import { formatDate, formatFileSize } from '../services/localFileSystem';

interface FileBrowserProps {
  searchResults: SearchResult[];
  selectedItem: FileItem | null;
  selectedIds: Set<string>;
  clipboard: ClipboardState;
  showCheckboxes: boolean;
  onSelectItem: (item: FileItem, isCtrl: boolean, isShift: boolean) => void;
  onToggleSelectItem: (item: FileItem) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onOpenItem: (item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item?: FileItem) => void;
  onDropItemsOnFolder: (targetFolder: FileItem, itemIds: string[], operation: DragDropOperation) => void;
  onDropExternalFiles?: (files: FileList) => void;
  onBatchRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDelete: () => void;
  searchQuery: string;
  sortBy: SortByField;
  sortDirection: SortDirection;
  onSortChange: (field: SortByField) => void;
  viewMode: ViewMode;
  currentPath: string;
  onAddLocalFolder?: () => void;
  onNewFolder?: () => void;
  onManageTags?: () => void;
  onTagClick?: (tag: string) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  searchResults,
  selectedItem,
  selectedIds,
  clipboard,
  showCheckboxes,
  onSelectItem,
  onToggleSelectItem,
  onSelectAllVisible,
  onClearSelection,
  onOpenItem,
  onContextMenu,
  onDropItemsOnFolder,
  onDropExternalFiles,
  onBatchRename,
  onCopy,
  onCut,
  onDelete,
  searchQuery,
  sortBy,
  sortDirection,
  onSortChange,
  viewMode,
  currentPath,
  onAddLocalFolder,
  onNewFolder,
  onManageTags,
  onTagClick,
}) => {
  const [displayLimit, setDisplayLimit] = useState(150);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [isDraggingOverBg, setIsDraggingOverBg] = useState(false);
  const [dragOperation, setDragOperation] = useState<DragDropOperation>('move');
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset limit when query or path changes
  useEffect(() => {
    setDisplayLimit(150);
  }, [searchQuery, currentPath, sortBy, sortDirection]);

  // Helper to get specialized file icons
  const getFileIcon = (file: FileItem) => {
    if (file.isFolder) {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20 shrink-0" />;
    }
    const ext = file.extension.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return <Presentation className="w-5 h-5 text-orange-500 shrink-0" />;
    }
    if (['dwg', 'dxf'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-cyan-600 shrink-0" />;
    }
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(ext)) {
      return <FileImage className="w-5 h-5 text-purple-600 shrink-0" />;
    }
    return <File className="w-5 h-5 text-slate-500 shrink-0" />;
  };

  // Highlight search term matches
  const renderHighlighted = (text: string, query: string) => {
    if (!query || !query.trim() || !text) return text;
    const cleanQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/80 text-slate-900 dark:text-yellow-100 px-0.5 rounded-xs font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const getSortIcon = (field: SortByField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  const getTagDotColor = (tagName: string) => {
    const lower = tagName.toLowerCase();
    if (lower === 'approved') return 'bg-emerald-500';
    if (lower === 'urgent') return 'bg-rose-500';
    if (lower === 'draft') return 'bg-amber-500';
    if (lower === 'in review') return 'bg-blue-500';
    if (lower === 'archived') return 'bg-slate-400';
    return 'bg-indigo-500';
  };

  const visibleResults = searchResults.slice(0, displayLimit);
  const hasMore = searchResults.length > displayLimit;
  const isAllVisibleSelected = visibleResults.length > 0 && visibleResults.every((r) => selectedIds.has(r.file.id));
  const isSomeSelected = visibleResults.some((r) => selectedIds.has(r.file.id));

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    // If dragging an unselected item, select only that item
    let draggedIds: string[];
    if (!selectedIds.has(item.id)) {
      draggedIds = [item.id];
      onSelectItem(item, false, false);
    } else {
      draggedIds = Array.from(selectedIds);
    }

    const isCtrl = e.ctrlKey;
    const op: DragDropOperation = isCtrl ? 'copy' : 'move';
    setDragOperation(op);

    e.dataTransfer.setData(
      'application/infra-files',
      JSON.stringify({ ids: draggedIds, sourcePath: currentPath, op })
    );
    e.dataTransfer.effectAllowed = 'copyMove';

    // Set custom drag preview badge
    const badge = document.createElement('div');
    badge.className = 'fixed -top-96 left-0 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl flex items-center gap-1.5 z-50 pointer-events-none';
    badge.innerText = `${isCtrl ? 'Copying' : 'Moving'} ${draggedIds.length} ${draggedIds.length === 1 ? 'item' : 'items'}`;
    document.body.appendChild(badge);
    e.dataTransfer.setDragImage(badge, 10, 10);
    setTimeout(() => {
      if (badge.parentNode) document.body.removeChild(badge);
    }, 0);
  };

  const handleDragOverFolder = (e: React.DragEvent, folder: FileItem) => {
    e.preventDefault();
    e.stopPropagation();

    // Do not allow dropping into self or into a folder that is currently selected to be moved
    if (selectedIds.has(folder.id)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    const isCopy = e.ctrlKey;
    e.dataTransfer.dropEffect = isCopy ? 'copy' : 'move';
    setDragOperation(isCopy ? 'copy' : 'move');
    setDropTargetFolderId(folder.id);
  };

  const handleDragLeaveFolder = (e: React.DragEvent, folder: FileItem) => {
    e.preventDefault();
    if (dropTargetFolderId === folder.id) {
      setDropTargetFolderId(null);
    }
  };

  const handleDropOnFolder = (e: React.DragEvent, folder: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolderId(null);

    // Check internal dragged items
    const rawData = e.dataTransfer.getData('application/infra-files');
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        const op: DragDropOperation = e.ctrlKey ? 'copy' : (parsed.op || 'move');
        onDropItemsOnFolder(folder, parsed.ids, op);
        return;
      } catch {
        // ignore
      }
    }

    // Check external OS files dropped into folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropExternalFiles) {
      onDropExternalFiles(e.dataTransfer.files);
    }
  };

  const handleBgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOverBg(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleBgDragLeave = (e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingOverBg(false);
    }
  };

  const handleBgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverBg(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropExternalFiles) {
      onDropExternalFiles(e.dataTransfer.files);
    }
  };

  // Empty State
  if (searchResults.length === 0) {
    return (
      <div 
        onContextMenu={(e) => onContextMenu(e, undefined)}
        onDragOver={handleBgDragOver}
        onDragLeave={handleBgDragLeave}
        onDrop={handleBgDrop}
        className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400 relative"
      >
        {isDraggingOverBg && (
          <div className="absolute inset-4 border-2 border-dashed border-blue-500 bg-blue-50/80 dark:bg-blue-950/80 rounded-2xl flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
            <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce" />
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              Drop files here to index into {currentPath}
            </span>
          </div>
        )}

        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {searchQuery ? 'No matching files found' : 'This folder is empty'}
        </p>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
          {searchQuery
            ? `No indexed files matched "${searchQuery}". Check spelling or clear file type/date filters.`
            : `You can create a new folder, grant access to a local PC disk, or drag & drop files here.`}
        </p>
        <div className="flex items-center gap-2.5">
          {onNewFolder && (
            <button
              onClick={onNewFolder}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>+ New Folder</span>
            </button>
          )}
          {onAddLocalFolder && (
            <button
              onClick={onAddLocalFolder}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
            >
              <span>+ Grant Access to Local Drive / Folder (C:, D:, E:)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 1. Grid / Large Icons View
  if (viewMode === 'icons') {
    return (
      <div 
        ref={containerRef}
        onContextMenu={(e) => {
          if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('icons-grid-bg')) {
            onContextMenu(e, undefined);
          }
        }}
        onDragOver={handleBgDragOver}
        onDragLeave={handleBgDragLeave}
        onDrop={handleBgDrop}
        className="flex-1 overflow-y-auto flex flex-col relative"
      >
        {/* External drop overlay */}
        {isDraggingOverBg && (
          <div className="absolute inset-4 border-2 border-dashed border-blue-500 bg-blue-50/80 dark:bg-blue-950/80 rounded-2xl flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
            <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce" />
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              Drop files here to index into {currentPath}
            </span>
          </div>
        )}

        <div className="icons-grid-bg p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 content-start flex-1 min-h-[300px]">
          {visibleResults.map(({ file }) => {
            const isSelected = selectedIds.has(file.id);
            const isCut = clipboard.operation === 'cut' && clipboard.items.some((c) => c.id === file.id);
            const isDropTarget = dropTargetFolderId === file.id;

            return (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file)}
                onDragOver={file.isFolder ? (e) => handleDragOverFolder(e, file) : undefined}
                onDragLeave={file.isFolder ? (e) => handleDragLeaveFolder(e, file) : undefined}
                onDrop={file.isFolder ? (e) => handleDropOnFolder(e, file) : undefined}
                onClick={(e) => onSelectItem(file, e.ctrlKey || e.metaKey, e.shiftKey)}
                onDoubleClick={() => onOpenItem(file)}
                onContextMenu={(e) => onContextMenu(e, file)}
                className={`p-3 rounded-xl border text-center flex flex-col items-center cursor-pointer transition-all select-none group relative ${
                  isDropTarget
                    ? 'border-blue-500 ring-4 ring-blue-500/30 bg-blue-100/80 dark:bg-blue-900/60 scale-[1.02]'
                    : isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white dark:bg-[#181d26] border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                } ${isCut ? 'opacity-40' : ''}`}
              >
                {/* Selection Checkbox */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectItem(file);
                  }}
                  className={`absolute top-2 left-2 z-10 transition-opacity p-0.5 rounded cursor-pointer ${
                    isSelected || showCheckboxes
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Select item"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-500/10" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  )}
                </div>

                {file.thumbnailUrl ? (
                  <div className="w-16 h-14 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 mb-2 border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                    <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center mb-2">
                    {getFileIcon(file)}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 break-all w-full leading-tight">
                  {renderHighlighted(file.name, searchQuery)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-mono font-tabular">
                  {file.isFolder ? `${file.itemCount || 0} items` : formatFileSize(file.size)}
                </span>
                {file.category !== 'folder' && (
                  <span className="mt-1 px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {file.extension || 'file'}
                  </span>
                )}
                {/* Tags in icons view */}
                {file.tags && file.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-1 max-w-full overflow-hidden">
                    {file.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagClick?.(tag);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors"
                        title={`Filter by tag: ${tag}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${getTagDotColor(tag)}`} />
                        <span className="truncate max-w-[65px]">{tag}</span>
                      </span>
                    ))}
                    {file.tags.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-mono">+{file.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>
              Showing {displayLimit} of {searchResults.length.toLocaleString()} files
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setDisplayLimit((prev) => prev + 200)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
              >
                Load Next 200 Files
              </button>
              <button
                onClick={() => setDisplayLimit(searchResults.length)}
                className="px-3 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded font-medium"
              >
                Show All
              </button>
            </div>
          </div>
        )}

        {/* Floating Multi-Select Toolbar if 2+ selected */}
        {selectedIds.size > 1 && (
          <div className="sticky bottom-4 mx-auto w-auto max-w-md bg-white dark:bg-[#1e2430] border border-blue-300 dark:border-blue-700/80 shadow-2xl rounded-2xl p-2 px-4 flex items-center gap-3 z-30 animate-in slide-in-from-bottom-2 text-xs">
            <span className="font-bold text-blue-700 dark:text-blue-300">
              {selectedIds.size} files selected
            </span>
            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700"></div>
            <button
              onClick={onBatchRename}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Batch Rename</span>
            </button>
            {onManageTags && (
              <button
                onClick={onManageTags}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                title="Manage tags for selected files"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Tags</span>
              </button>
            )}
            <button
              onClick={onCopy}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
              title="Copy [Ctrl+C]"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCut}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
              title="Cut [Ctrl+X]"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded"
              title="Delete [Del]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClearSelection}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Details View with Windows Table Headers & Checkbox Columns
  return (
    <div 
      ref={containerRef}
      onContextMenu={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('details-rows-bg')) {
          onContextMenu(e, undefined);
        }
      }}
      onDragOver={handleBgDragOver}
      onDragLeave={handleBgDragLeave}
      onDrop={handleBgDrop}
      className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-[#181d26] relative"
    >
      {/* External drop overlay */}
      {isDraggingOverBg && (
        <div className="absolute inset-4 border-2 border-dashed border-blue-500 bg-blue-50/80 dark:bg-blue-950/80 rounded-2xl flex flex-col items-center justify-center gap-2 z-30 pointer-events-none">
          <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce" />
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
            Drop files here to index into {currentPath}
          </span>
        </div>
      )}

      {/* Table Header */}
      <div className="sticky top-0 bg-[#f1f5f9] dark:bg-[#1a212d] border-b border-[#cbd5e1] dark:border-[#2d3748] grid grid-cols-12 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 z-20 select-none">
        {/* Name Column with Select All Checkbox */}
        <div className="col-span-5 md:col-span-4 flex items-center gap-2 min-w-0 pr-2">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectAllVisible();
            }}
            className="p-0.5 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
            title={isAllVisibleSelected ? 'Deselect all' : 'Select all visible files'}
          >
            {isAllVisibleSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            ) : isSomeSelected ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-600 bg-blue-600 rounded-xs flex items-center justify-center">
                <div className="w-2 h-0.5 bg-white"></div>
              </div>
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            )}
          </div>

          <button
            onClick={() => onSortChange('name')}
            className="flex items-center gap-1.5 text-left hover:text-slate-900 dark:hover:text-white group truncate flex-1"
          >
            <span>Name</span>
            {getSortIcon('name')}
          </button>
        </div>

        {/* Date modified */}
        <button
          onClick={() => onSortChange('modified')}
          className="col-span-3 md:col-span-2 flex items-center gap-1.5 text-left hover:text-slate-900 dark:hover:text-white group"
        >
          <span>Date modified</span>
          {getSortIcon('modified')}
        </button>

        {/* Type */}
        <button
          onClick={() => onSortChange('type')}
          className="hidden md:flex col-span-2 items-center gap-1.5 text-left hover:text-slate-900 dark:hover:text-white group"
        >
          <span>Type</span>
          {getSortIcon('type')}
        </button>

        {/* Size */}
        <button
          onClick={() => onSortChange('size')}
          className="col-span-2 md:col-span-1 flex items-center justify-end gap-1.5 text-right hover:text-slate-900 dark:hover:text-white group"
        >
          <span>Size</span>
          {getSortIcon('size')}
        </button>

        {/* Path / Relevance */}
        <button
          onClick={() => onSortChange('relevance')}
          className="col-span-2 md:col-span-3 flex items-center gap-1.5 text-left hover:text-slate-900 dark:hover:text-white group pl-3"
        >
          <span>Path / Relevance</span>
          {getSortIcon('relevance')}
        </button>
      </div>

      {/* Rows */}
      <div className="details-rows-bg divide-y divide-slate-100 dark:divide-slate-800/80 flex-1 min-h-[300px]">
        {visibleResults.map(({ file, snippet }) => {
          const isSelected = selectedIds.has(file.id);
          const isCut = clipboard.operation === 'cut' && clipboard.items.some((c) => c.id === file.id);
          const isDropTarget = dropTargetFolderId === file.id;

          return (
            <div
              key={file.id}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              onDragOver={file.isFolder ? (e) => handleDragOverFolder(e, file) : undefined}
              onDragLeave={file.isFolder ? (e) => handleDragLeaveFolder(e, file) : undefined}
              onDrop={file.isFolder ? (e) => handleDropOnFolder(e, file) : undefined}
              onClick={(e) => onSelectItem(file, e.ctrlKey || e.metaKey, e.shiftKey)}
              onDoubleClick={() => onOpenItem(file)}
              onContextMenu={(e) => onContextMenu(e, file)}
              className={`grid grid-cols-12 px-3 py-2 items-center text-xs cursor-pointer select-none transition-colors group ${
                isDropTarget
                  ? 'border-2 border-blue-500 bg-blue-100/90 dark:bg-blue-900/60 font-semibold'
                  : isSelected
                  ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-950 dark:text-blue-100 font-medium'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
              } ${isCut ? 'opacity-40' : ''}`}
            >
              {/* Checkbox, Icon & Name Column */}
              <div className="col-span-5 md:col-span-4 flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectItem(file);
                  }}
                  className={`p-0.5 rounded cursor-pointer transition-opacity ${
                    isSelected || showCheckboxes
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Select item"
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600 fill-blue-500/10" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                  )}
                </div>

                {file.thumbnailUrl ? (
                  <img src={file.thumbnailUrl} alt={file.name} className="w-5 h-5 rounded-xs object-cover border border-slate-300 dark:border-slate-600 shrink-0" />
                ) : (
                  getFileIcon(file)
                )}

                <div className="truncate">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100" title={file.name}>
                    {renderHighlighted(file.name, searchQuery)}
                  </p>
                  {/* Tag badges */}
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {file.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTagClick?.(tag);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          title={`Filter by tag: ${tag}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${getTagDotColor(tag)}`} />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {file.metadata?.Chainage && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Ch. {file.metadata.Chainage}
                    </span>
                  )}
                </div>
              </div>

              {/* Date Modified */}
              <div className="col-span-3 md:col-span-2 text-slate-500 dark:text-slate-400 font-mono font-tabular text-[11px]">
                {formatDate(file.modifiedDate)}
              </div>

              {/* Type */}
              <div className="hidden md:block col-span-2 text-slate-600 dark:text-slate-400 truncate text-[11px] capitalize">
                {file.isFolder ? 'File folder' : `${file.extension.toUpperCase()} document`}
              </div>

              {/* Size */}
              <div className="col-span-2 md:col-span-1 text-right text-slate-500 dark:text-slate-400 font-mono font-tabular text-[11px] pr-2">
                {file.isFolder ? '' : formatFileSize(file.size)}
              </div>

              {/* Path & Match Snippet */}
              <div className="col-span-2 md:col-span-3 min-w-0 pl-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate" title={file.path}>
                  {file.parentPath}
                </p>

                {snippet && searchQuery && (
                  <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 bg-amber-50/80 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/60 line-clamp-1 italic">
                    "{renderHighlighted(snippet, searchQuery)}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shrink-0">
          <span>
            Showing {displayLimit} of {searchResults.length.toLocaleString()} files
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 200)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
            >
              Load Next 200 Files
            </button>
            <button
              onClick={() => setDisplayLimit(searchResults.length)}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded font-medium"
            >
              Show All
            </button>
          </div>
        </div>
      )}

      {/* Floating Multi-Select Toolbar if 2+ selected */}
      {selectedIds.size > 1 && (
        <div className="sticky bottom-4 mx-auto w-auto max-w-md bg-white dark:bg-[#1e2430] border border-blue-300 dark:border-blue-700/80 shadow-2xl rounded-2xl p-2 px-4 flex items-center gap-3 z-30 animate-in slide-in-from-bottom-2 text-xs">
          <span className="font-bold text-blue-700 dark:text-blue-300">
            {selectedIds.size} files selected
          </span>
          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700"></div>
          <button
            onClick={onBatchRename}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Batch Rename</span>
          </button>
          <button
            onClick={onCopy}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
            title="Copy [Ctrl+C]"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCut}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
            title="Cut [Ctrl+X]"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded"
            title="Delete [Del]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearSelection}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
