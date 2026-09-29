import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderPlus, 
  Scissors, 
  Copy, 
  Clipboard, 
  Trash2, 
  Edit3, 
  FilePlus, 
  ChevronDown, 
  Sparkles, 
  CheckSquare, 
  Square, 
  ArrowUpDown, 
  LayoutList, 
  LayoutGrid,
  Info,
  Layers,
  HelpCircle,
  CopyPlus,
  Tag,
  Zap
} from 'lucide-react';
import { FileItem, ClipboardState, ViewMode, SortByField, SortDirection } from '../types';

interface CommandBarProps {
  selectedItems: FileItem[];
  clipboard: ClipboardState;
  onNewFolder: () => void;
  onNewFile: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onRename: () => void;
  onBatchRename: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  showCheckboxes: boolean;
  onToggleCheckboxes: () => void;
  sortBy: SortByField;
  sortDirection: SortDirection;
  onSortChange: (field: SortByField) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onProperties?: () => void;
  onManageTags?: () => void;
  onOpenStartSuggestions?: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  selectedItems,
  clipboard,
  onNewFolder,
  onNewFile,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onRename,
  onBatchRename,
  onSelectAll,
  onClearSelection,
  showCheckboxes,
  onToggleCheckboxes,
  sortBy,
  sortDirection,
  onSortChange,
  viewMode,
  onViewModeChange,
  onProperties,
  onManageTags,
  onOpenStartSuggestions,
}) => {
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showDragTip, setShowDragTip] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedItems.length > 0;
  const isMultiSelection = selectedItems.length > 1;
  const hasClipboard = clipboard.items.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-10 bg-[#f7f9fc] dark:bg-[#1a202c] border-b border-[#e2e8f0] dark:border-[#2d3748] flex items-center justify-between px-3 text-xs select-none shrink-0 gap-2">
      {/* Left Explorer Action Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {/* + New Menu Button */}
        <div className="relative" ref={newMenuRef}>
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-medium transition-colors"
            title="Create new folder or file (Ctrl + Shift + N)"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>New</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {showNewMenu && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewFolder();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-left text-slate-800 dark:text-slate-200"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                <span className="flex-1">Folder</span>
                <span className="text-[10px] text-slate-400">Ctrl+Shift+N</span>
              </button>
              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewFile();
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-left text-slate-800 dark:text-slate-200"
              >
                <FilePlus className="w-3.5 h-3.5 text-blue-500" />
                <span>Text Document</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>

        {/* Cut (Ctrl+X) */}
        <button
          onClick={onCut}
          disabled={!hasSelection}
          className="p-1.5 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
          title={`Cut (${selectedItems.length} selected) [Ctrl+X]`}
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        {/* Copy (Ctrl+C) */}
        <button
          onClick={onCopy}
          disabled={!hasSelection}
          className="p-1.5 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
          title={`Copy (${selectedItems.length} selected) [Ctrl+C]`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Paste (Ctrl+V) */}
        <button
          onClick={onPaste}
          disabled={!hasClipboard}
          className="relative p-1.5 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
          title={
            hasClipboard
              ? `Paste ${clipboard.items.length} ${clipboard.operation === 'cut' ? 'cut' : 'copied'} items [Ctrl+V]`
              : 'Paste [Ctrl+V]'
          }
        >
          <Clipboard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          {hasClipboard && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
              {clipboard.items.length}
            </span>
          )}
        </button>

        {/* Rename / Batch Rename Button */}
        {isMultiSelection ? (
          <button
            onClick={onBatchRename}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold rounded-md shadow-2xs transition-all animate-pulse"
            title="Batch Rename multiple selected files (Ctrl + M)"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Batch Rename ({selectedItems.length})</span>
          </button>
        ) : (
          <button
            onClick={onRename}
            disabled={!hasSelection}
            className="p-1.5 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
            title="Rename [F2]"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete (Del) */}
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title={`Delete (${selectedItems.length} selected) [Del]`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Manage Tags */}
        {onManageTags && (
          <button
            onClick={onManageTags}
            disabled={!hasSelection}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
            title={hasSelection ? `Manage metadata tags for ${selectedItems.length} item(s)` : 'Select file(s) to add tags'}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Tags</span>
          </button>
        )}

        {/* Start File Suggestions Button */}
        {onOpenStartSuggestions && (
          <button
            onClick={onOpenStartSuggestions}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80 font-medium transition-colors"
            title="Start File Suggestions (Launch high-priority documents with explicit Windows start shell command)"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span className="font-semibold text-xs">Start Suggestions</span>
          </button>
        )}

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>

        {/* Sort Menu Dropdown */}
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition-colors"
            title="Sort options"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sort</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showSortMenu && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95">
              {[
                { field: 'name', label: 'Name' },
                { field: 'modified', label: 'Date modified' },
                { field: 'type', label: 'Type' },
                { field: 'size', label: 'Size' },
                { field: 'relevance', label: 'Relevance' },
              ].map((opt) => (
                <button
                  key={opt.field}
                  onClick={() => {
                    setShowSortMenu(false);
                    onSortChange(opt.field as SortByField);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    sortBy === opt.field ? 'text-blue-600 font-semibold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.field && (
                    <span className="text-[10px] text-blue-500 font-mono">
                      {sortDirection === 'asc' ? 'Asc' : 'Desc'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle Checkboxes (Windows 11 Explorer feature) */}
        <button
          onClick={onToggleCheckboxes}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
            showCheckboxes
              ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
              : 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300'
          }`}
          title="Toggle item selection check boxes"
        >
          {showCheckboxes ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">Item checkboxes</span>
        </button>

        {/* Drag & Copy Helper Tip Button */}
        <div className="relative">
          <button
            onClick={() => setShowDragTip(!showDragTip)}
            className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            title="Drag & drop guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {showDragTip && (
            <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-white dark:bg-[#1e2430] border border-blue-200 dark:border-blue-900 rounded-xl shadow-xl z-40 text-xs space-y-1.5 text-slate-700 dark:text-slate-300 animate-in fade-in">
              <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <CopyPlus className="w-3.5 h-3.5" />
                <span>Drag &amp; Copy / Move</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                • <strong>Drag to Move:</strong> Drag files directly onto folders, sidebar drives, or breadcrumbs.
              </p>
              <p className="text-[11px] leading-relaxed">
                • <strong>Drag to Copy:</strong> Hold <strong>Ctrl</strong> while dragging and dropping to create copies in the destination!
              </p>
              <button
                onClick={() => setShowDragTip(false)}
                className="mt-1 w-full py-1 text-center text-[10px] text-blue-600 font-semibold hover:underline"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Selection Stats & Action */}
      <div className="flex items-center gap-2 shrink-0 text-slate-600 dark:text-slate-400">
        {hasSelection && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {selectedItems.length} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
            >
              Clear
            </button>
          </div>
        )}

        <button
          onClick={onSelectAll}
          className="px-2 py-1 rounded hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-medium transition-colors"
          title="Select All (Ctrl + A)"
        >
          Select All
        </button>

        {onProperties && hasSelection && (
          <button
            onClick={onProperties}
            className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition-colors"
            title="Properties (Alt + Enter)"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
