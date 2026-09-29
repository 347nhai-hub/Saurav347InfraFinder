import React, { useState } from 'react';
import { 
  Star, 
  HardDrive, 
  Folder, 
  FolderPlus, 
  Bookmark, 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Trash2,
  Database,
  Layers,
  RotateCw,
  Edit3
} from 'lucide-react';
import { DriveInfo, IndexedLocation, SavedSearch, DragDropOperation } from '../types';

interface SidebarProps {
  drives: DriveInfo[];
  currentPath: string;
  onNavigatePath: (path: string) => void;
  indexedLocations: IndexedLocation[];
  onToggleIndexLocation: (id: string) => void;
  savedSearches: SavedSearch[];
  onApplySavedSearch: (saved: SavedSearch) => void;
  onDeleteSavedSearch: (id: string) => void;
  onAddLocalFolder: () => void;
  isIndexing: boolean;
  onClearIndex: () => void;
  onRefreshIndex?: () => void;
  onEditLocationPath: (loc: IndexedLocation) => void;
  onDropOnSidebarItem?: (targetPath: string, itemIds: string[], op: DragDropOperation) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  drives,
  currentPath,
  onNavigatePath,
  indexedLocations,
  onToggleIndexLocation,
  savedSearches,
  onApplySavedSearch,
  onDeleteSavedSearch,
  onAddLocalFolder,
  isIndexing,
  onClearIndex,
  onRefreshIndex,
  onEditLocationPath,
  onDropOnSidebarItem,
}) => {
  const [expandQuickAccess, setExpandQuickAccess] = useState(true);
  const [expandDrives, setExpandDrives] = useState(true);
  const [expandIndexLocations, setExpandIndexLocations] = useState(true);
  const [expandSavedSearches, setExpandSavedSearches] = useState(true);
  const [dropHoverPath, setDropHoverPath] = useState<string | null>(null);

  // Quick access items generated strictly from user's indexed locations & drives
  const quickAccessItems = indexedLocations.map(loc => ({
    name: loc.name,
    path: loc.path,
  }));

  return (
    <aside className="w-64 bg-[#f8fafc] dark:bg-[#151922] border-r border-[#dbe3ed] dark:border-[#283243] flex flex-col shrink-0 select-none overflow-y-auto text-xs">
      {/* 1. Quick Access Section */}
      <div className="py-2">
        <button
          onClick={() => setExpandQuickAccess(!expandQuickAccess)}
          className="w-full flex items-center justify-between px-3 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold tracking-wider text-[11px] uppercase"
        >
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Quick Access</span>
          </div>
          {expandQuickAccess ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {expandQuickAccess && (
          <div className="mt-1 space-y-0.5 px-2">
            {quickAccessItems.length === 0 ? (
              <div className="px-2.5 py-1.5 text-slate-400 italic text-[11px]">
                No pinned folders yet
              </div>
            ) : (
              quickAccessItems.map((item) => {
                const isActive = currentPath === item.path;
                const isHovered = dropHoverPath === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => onNavigatePath(item.path)}
                    onDragOver={(e) => {
                      if (onDropOnSidebarItem) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
                        setDropHoverPath(item.path);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (dropHoverPath === item.path) setDropHoverPath(null);
                    }}
                    onDrop={(e) => {
                      if (onDropOnSidebarItem) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropHoverPath(null);
                        const raw = e.dataTransfer.getData('application/infra-files');
                        if (raw) {
                          try {
                            const parsed = JSON.parse(raw);
                            const op: DragDropOperation = e.ctrlKey ? 'copy' : (parsed.op || 'move');
                            onDropOnSidebarItem(item.path, parsed.ids, op);
                          } catch {
                            // ignore
                          }
                        }
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left truncate transition-all ${
                      isHovered
                        ? 'bg-blue-100 dark:bg-blue-900/70 ring-2 ring-blue-500 font-bold text-blue-900 dark:text-blue-100'
                        : isActive
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                    title={item.path}
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>

      {/* 2. This PC & Drives Section */}
      <div className="py-2">
        <div className="flex items-center justify-between px-3 py-1">
          <button
            onClick={() => setExpandDrives(!expandDrives)}
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold tracking-wider text-[11px] uppercase"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            <span>This PC &amp; Drives</span>
            {expandDrives ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          <button
            onClick={onAddLocalFolder}
            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
            title="Grant access to another PC drive (e.g. C:, D:, E:, External USB)"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {expandDrives && (
          <div className="mt-1 space-y-1.5 px-2">
            {drives.length === 0 ? (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-dashed border-blue-300 dark:border-blue-800 text-center">
                <p className="text-[11px] text-blue-900 dark:text-blue-200 font-medium mb-1.5">No PC Drives Granted</p>
                <button
                  onClick={onAddLocalFolder}
                  className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 shadow-xs"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>+ Grant PC Drive (C:, D:)</span>
                </button>
              </div>
            ) : (
              drives.map((drive) => {
                const isDriveActive = currentPath === drive.letter;
                const isHovered = dropHoverPath === drive.letter;
                const usedPercent = drive.totalBytes > 0 
                  ? Math.min(100, Math.round((drive.usedBytes / drive.totalBytes) * 100)) 
                  : 45;

                return (
                  <div
                    key={drive.letter}
                    onClick={() => onNavigatePath(drive.letter)}
                    onDragOver={(e) => {
                      if (onDropOnSidebarItem) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
                        setDropHoverPath(drive.letter);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (dropHoverPath === drive.letter) setDropHoverPath(null);
                    }}
                    onDrop={(e) => {
                      if (onDropOnSidebarItem) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropHoverPath(null);
                        const raw = e.dataTransfer.getData('application/infra-files');
                        if (raw) {
                          try {
                            const parsed = JSON.parse(raw);
                            const op: DragDropOperation = e.ctrlKey ? 'copy' : (parsed.op || 'move');
                            onDropOnSidebarItem(drive.letter, parsed.ids, op);
                          } catch {
                            // ignore
                          }
                        }
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-md cursor-pointer transition-all ${
                      isHovered
                        ? 'bg-blue-100 dark:bg-blue-900/70 ring-2 ring-blue-500 font-bold text-blue-900 dark:text-blue-100'
                        : isDriveActive
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-xs">{drive.letter}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-[110px]">{drive.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-tabular">{usedPercent}%</span>
                    </div>

                    {/* Windows-style storage bar */}
                    <div className="mt-1 w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${usedPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${usedPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>

      {/* 3. Indexed Locations Section */}
      <div className="py-2">
        <div className="flex items-center justify-between px-3 py-1">
          <button
            onClick={() => setExpandIndexLocations(!expandIndexLocations)}
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold tracking-wider text-[11px] uppercase"
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Indexed Locations</span>
            {expandIndexLocations ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          <button
            onClick={onAddLocalFolder}
            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
            title="Add local folder from computer to index"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {expandIndexLocations && (
          <div className="mt-1 space-y-1 px-2">
            {indexedLocations.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-slate-400 italic">No indexed locations</p>
            ) : (
              indexedLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 group"
                >
                  <button
                    onClick={() => onToggleIndexLocation(loc.id)}
                    className="flex items-center gap-2 text-left truncate mr-1"
                    title={`${loc.path} (${loc.fileCount.toLocaleString()} files)`}
                  >
                    {loc.isIncluded ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <p className={`truncate font-medium ${loc.isIncluded ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                        {loc.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{loc.path}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLocationPath(loc);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:text-blue-500 rounded transition-opacity"
                      title="Set exact Windows PC path prefix"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400 hover:text-blue-500" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono font-tabular">
                      {loc.fileCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}

            <button
              onClick={onAddLocalFolder}
              className="w-full mt-2 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-1.5 font-semibold shadow-xs transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Index Local Folder From PC</span>
            </button>

            {indexedLocations.length > 0 && (
              <button
                onClick={onClearIndex}
                className="w-full mt-1.5 py-1 px-2 border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded flex items-center justify-center gap-1.5 font-medium transition-colors text-[11px]"
                title="Clear all indexed files and drive configurations"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Indexed Database</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>

      {/* 4. Saved Searches Section */}
      <div className="py-2">
        <button
          onClick={() => setExpandSavedSearches(!expandSavedSearches)}
          className="w-full flex items-center justify-between px-3 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold tracking-wider text-[11px] uppercase"
        >
          <div className="flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
            <span>Saved Searches</span>
          </div>
          {expandSavedSearches ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {expandSavedSearches && (
          <div className="mt-1 space-y-0.5 px-2">
            {savedSearches.length === 0 ? (
              <p className="px-2 py-1 text-[11px] text-slate-400 italic">No saved searches yet</p>
            ) : (
              savedSearches.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 group text-slate-700 dark:text-slate-300"
                >
                  <button
                    onClick={() => onApplySavedSearch(saved)}
                    className="flex items-center gap-2 truncate text-left"
                    title={`Query: "${saved.query}" | Type: ${saved.category}`}
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate font-medium">{saved.name}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSavedSearch(saved.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded transition-opacity"
                    title="Delete saved search"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
