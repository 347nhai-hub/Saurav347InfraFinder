import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  RotateCw, 
  ChevronRight, 
  HardDrive, 
  Folder, 
  Copy, 
  Check, 
  LayoutList, 
  LayoutGrid, 
  PanelRight,
  FolderOpen
} from 'lucide-react';
import { ViewMode, DragDropOperation } from '../types';

interface AddressToolbarProps {
  currentPath: string;
  onNavigatePath: (newPath: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onRefresh: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showPreviewPane: boolean;
  onTogglePreviewPane: () => void;
  onDropOnBreadcrumb?: (targetPath: string, itemIds: string[], op: DragDropOperation) => void;
}

export const AddressToolbar: React.FC<AddressToolbarProps> = ({
  currentPath,
  onNavigatePath,
  canGoBack,
  canGoForward,
  canGoUp,
  onGoBack,
  onGoForward,
  onGoUp,
  onRefresh,
  viewMode,
  onViewModeChange,
  showPreviewPane,
  onTogglePreviewPane,
  onDropOnBreadcrumb,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputPath, setInputPath] = useState(currentPath);
  const [copied, setCopied] = useState(false);
  const [dropHoverPath, setDropHoverPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputPath(currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCommitEdit = () => {
    setIsEditing(false);
    if (inputPath.trim() && inputPath !== currentPath) {
      onNavigatePath(inputPath.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      setInputPath(currentPath);
      setIsEditing(false);
    }
  };

  // Parse path segments for breadcrumb display
  const segments = currentPath.split(/[\\/]/).filter(Boolean);

  return (
    <div className="h-11 bg-white dark:bg-[#1e2430] border-b border-[#e2e8f0] dark:border-[#2d3748] flex items-center gap-2 px-3 shrink-0">
      {/* Navigation Buttons: Back, Forward, Up, Refresh */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
          title="Back (Alt + Left)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
          title="Forward (Alt + Right)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onGoUp}
          disabled={!canGoUp}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 dark:text-slate-300 transition-colors"
          title="Up to Parent Folder (Backspace / Alt + Up)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title="Refresh (F5)"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Address Bar Breadcrumbs */}
      <div
        onClick={() => !isEditing && setIsEditing(true)}
        className="flex-1 h-8 bg-slate-50 dark:bg-[#181c24] border border-[#d8e0ea] dark:border-[#323d4f] rounded-md px-2 flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-text overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        title="Click or press Ctrl + L to edit path"
      >
        <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            onBlur={handleCommitEdit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-hidden text-xs text-slate-900 dark:text-slate-100 font-mono"
            placeholder="Type path e.g. D:\NH-48_Six_Laning_Project"
          />
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap">
            {segments.map((seg, idx) => {
              const isDrive = idx === 0 && seg.includes(':');
              const partialPath = segments.slice(0, idx + 1).join('\\');

              return (
                <React.Fragment key={idx}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigatePath(partialPath);
                    }}
                    onDragOver={(e) => {
                      if (onDropOnBreadcrumb) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
                        setDropHoverPath(partialPath);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (dropHoverPath === partialPath) setDropHoverPath(null);
                    }}
                    onDrop={(e) => {
                      if (onDropOnBreadcrumb) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropHoverPath(null);
                        const raw = e.dataTransfer.getData('application/infra-files');
                        if (raw) {
                          try {
                            const parsed = JSON.parse(raw);
                            const op: DragDropOperation = e.ctrlKey ? 'copy' : (parsed.op || 'move');
                            onDropOnBreadcrumb(partialPath, parsed.ids, op);
                          } catch {
                            // ignore
                          }
                        }
                      }
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                      dropHoverPath === partialPath
                        ? 'bg-blue-100 dark:bg-blue-900/60 ring-2 ring-blue-500 font-bold text-blue-700 dark:text-blue-300'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isDrive ? (
                      <HardDrive className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Folder className="w-3 h-3 text-amber-500" />
                    )}
                    <span className="font-medium">{seg}</span>
                  </button>
                  {idx < segments.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <button
          onClick={handleCopyPath}
          className="ml-auto p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded shrink-0"
          title="Copy path to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Right Tools: View Mode Toggle & Preview Pane */}
      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
        <button
          onClick={() => onViewModeChange('details')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'details'
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title="Details view"
        >
          <LayoutList className="w-4 h-4" />
        </button>

        <button
          onClick={() => onViewModeChange('icons')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'icons'
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title="Icons view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePreviewPane}
          className={`p-1.5 rounded transition-colors ${
            showPreviewPane
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title="Toggle Document Preview Pane"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
