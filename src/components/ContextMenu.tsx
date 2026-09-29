import React, { useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  ExternalLink, 
  Copy, 
  Edit3, 
  Trash2, 
  Info, 
  Files,
  FolderSymlink,
  Scissors,
  Clipboard,
  Sparkles,
  FolderPlus,
  FilePlus,
  RotateCw,
  LayoutList,
  LayoutGrid,
  CheckSquare,
  Tag,
  Check
} from 'lucide-react';
import { FileItem, ClipboardState, ViewMode, SortByField } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  item?: FileItem;
  selectedItems: FileItem[];
  isBackground?: boolean;
  clipboard: ClipboardState;
  onClose: () => void;
  onOpen: (item: FileItem) => void;
  onOpenContainingFolder: (item: FileItem) => void;
  onCopyPath: (item: FileItem) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: (targetFolder?: FileItem) => void;
  onRename: (item: FileItem) => void;
  onBatchRename: () => void;
  onDelete: () => void;
  onProperties: (item?: FileItem) => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onRefresh: () => void;
  onSelectAll: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (field: SortByField) => void;
  onToggleTag?: (item: FileItem, tag: string) => void;
  onManageTags?: (items: FileItem[]) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  selectedItems,
  isBackground,
  clipboard,
  onClose,
  onOpen,
  onOpenContainingFolder,
  onCopyPath,
  onCopy,
  onCut,
  onPaste,
  onRename,
  onBatchRename,
  onDelete,
  onProperties,
  onNewFolder,
  onNewFile,
  onRefresh,
  onSelectAll,
  viewMode,
  onViewModeChange,
  onSortChange,
  onToggleTag,
  onManageTags,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust coordinates if menu overflows window
  const safeX = Math.min(Math.max(10, x), window.innerWidth - 240);
  const safeY = Math.min(Math.max(10, y), window.innerHeight - 380);

  const isMulti = selectedItems.length > 1;
  const targetItem = item || selectedItems[0];
  const hasClipboard = clipboard.items.length > 0;

  // Background context menu (right click empty space)
  if (isBackground || !targetItem) {
    return (
      <div
        ref={menuRef}
        style={{ left: `${safeX}px`, top: `${safeY}px` }}
        className="fixed z-50 w-56 bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-700 dark:text-slate-200 select-none animate-in fade-in zoom-in-95 duration-75"
      >
        {/* View Sub-options */}
        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          View
        </div>
        <button
          onClick={() => {
            onViewModeChange('details');
            onClose();
          }}
          className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 ${
            viewMode === 'details' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <LayoutList className="w-3.5 h-3.5" />
            <span>Details</span>
          </div>
          {viewMode === 'details' && <span className="text-[10px]">✓</span>}
        </button>
        <button
          onClick={() => {
            onViewModeChange('icons');
            onClose();
          }}
          className={`w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 ${
            viewMode === 'icons' ? 'text-blue-600 font-semibold' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Large Icons</span>
          </div>
          {viewMode === 'icons' && <span className="text-[10px]">✓</span>}
        </button>

        <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

        {/* Sort Options */}
        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Sort by
        </div>
        {[
          { field: 'name', label: 'Name' },
          { field: 'modified', label: 'Date modified' },
          { field: 'type', label: 'Type' },
          { field: 'size', label: 'Size' },
        ].map((s) => (
          <button
            key={s.field}
            onClick={() => {
              onSortChange(s.field as SortByField);
              onClose();
            }}
            className="w-full px-3 py-1 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{s.label}</span>
          </button>
        ))}

        <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

        {/* Refresh */}
        <button
          onClick={() => {
            onRefresh();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">F5</span>
        </button>

        {/* Paste */}
        <button
          onClick={() => {
            if (hasClipboard) {
              onPaste();
              onClose();
            }
          }}
          disabled={!hasClipboard}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          <div className="flex items-center gap-2">
            <Clipboard className="w-3.5 h-3.5 text-blue-500" />
            <span>Paste {hasClipboard ? `(${clipboard.items.length})` : ''}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
        </button>

        <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

        {/* New Item */}
        <button
          onClick={() => {
            onNewFolder();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>New Folder</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+Shift+N</span>
        </button>

        <button
          onClick={() => {
            onNewFile();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <FilePlus className="w-3.5 h-3.5 text-blue-500" />
          <span>New Text Document</span>
        </button>

        <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

        {/* Select All */}
        <button
          onClick={() => {
            onSelectAll();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>Select All</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+A</span>
        </button>

        {/* Properties */}
        <button
          onClick={() => {
            onProperties();
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Properties</span>
        </button>
      </div>
    );
  }

  // Item / Multi-item context menu
  return (
    <div
      ref={menuRef}
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
      className="fixed z-50 w-56 bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-700 dark:text-slate-200 select-none animate-in fade-in zoom-in-95 duration-75"
    >
      {/* Header if multi-selection */}
      {isMulti && (
        <div className="px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 font-semibold text-blue-900 dark:text-blue-200 text-[11px] flex items-center justify-between">
          <span>{selectedItems.length} items selected</span>
          <span className="text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono">
            Multi
          </span>
        </div>
      )}

      {/* Open */}
      <button
        onClick={() => {
          onOpen(targetItem);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-900 dark:text-slate-100 font-medium"
      >
        <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>Open {isMulti ? 'First Item' : ''}</span>
      </button>

      {/* Open Containing Folder */}
      {!targetItem.isFolder && (
        <button
          onClick={() => {
            onOpenContainingFolder(targetItem);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <FolderSymlink className="w-3.5 h-3.5 text-amber-500" />
          <span>Open Containing Folder</span>
        </button>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

      {/* Batch Rename (prominent when multi-selected) */}
      {isMulti ? (
        <button
          onClick={() => {
            onBatchRename();
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Batch Rename ({selectedItems.length} items)...</span>
          </div>
          <span className="text-[10px] font-mono bg-blue-200/60 dark:bg-blue-800/80 px-1 rounded">
            Ctrl+M
          </span>
        </button>
      ) : (
        <button
          onClick={() => {
            onRename(targetItem);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Rename</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">F2</span>
        </button>
      )}

      {/* Tags & Metadata Option */}
      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

      <button
        onClick={() => {
          if (onManageTags) {
            onManageTags(selectedItems.length > 0 ? selectedItems : [targetItem]);
          }
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
      >
        <div className="flex items-center gap-2.5">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
          <span>Add / Manage Tags...</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">T</span>
      </button>

      {/* Quick Status Tag Presets */}
      <div className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900/60 border-y border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-slate-400 font-medium shrink-0">Tags:</span>
        {[
          { name: 'Approved', dot: 'bg-emerald-500' },
          { name: 'Urgent', dot: 'bg-rose-500' },
          { name: 'Draft', dot: 'bg-amber-500' },
        ].map((t) => {
          const hasTag = (targetItem.tags || []).some(
            (tag) => tag.toLowerCase() === t.name.toLowerCase()
          );
          return (
            <button
              key={t.name}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleTag) {
                  const targetItems = selectedItems.length > 0 ? selectedItems : [targetItem];
                  for (const item of targetItems) {
                    onToggleTag(item, t.name);
                  }
                }
                onClose();
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 border transition-colors shrink-0 ${
                hasTag
                  ? 'bg-blue-100 dark:bg-blue-900/70 border-blue-400 text-blue-900 dark:text-blue-200 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
              title={`${hasTag ? 'Remove' : 'Add'} tag "${t.name}"`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
              <span>{t.name}</span>
              {hasTag && <Check className="w-2.5 h-2.5 ml-0.5 text-blue-600 dark:text-blue-400" />}
            </button>
          );
        })}
      </div>

      {/* Cut (Ctrl+X) */}
      <button
        onClick={() => {
          onCut();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <div className="flex items-center gap-2.5">
          <Scissors className="w-3.5 h-3.5 text-slate-500" />
          <span>Cut</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
      </button>

      {/* Copy (Ctrl+C) */}
      <button
        onClick={() => {
          onCopy();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <div className="flex items-center gap-2.5">
          <Files className="w-3.5 h-3.5 text-slate-500" />
          <span>Copy</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
      </button>

      {/* If target item is a folder, support pasting directly into this folder */}
      {targetItem.isFolder && hasClipboard && (
        <button
          onClick={() => {
            onPaste(targetItem);
            onClose();
          }}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium"
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span>Paste into this folder ({clipboard.items.length})</span>
        </button>
      )}

      {/* Copy Path */}
      <button
        onClick={() => {
          onCopyPath(targetItem);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Copy className="w-3.5 h-3.5 text-slate-500" />
        <span>Copy Path</span>
      </button>

      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

      {/* Delete (Del) */}
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
      >
        <div className="flex items-center gap-2.5">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete {isMulti ? `(${selectedItems.length} items)` : ''}</span>
        </div>
        <span className="text-[10px] font-mono">Del</span>
      </button>

      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

      {/* Properties */}
      <button
        onClick={() => {
          onProperties(targetItem);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <div className="flex items-center gap-2.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Properties</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Alt+Enter</span>
      </button>
    </div>
  );
};
