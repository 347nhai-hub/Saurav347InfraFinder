import React, { useState, useEffect } from 'react';
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
  Edit3,
  Monitor
} from 'lucide-react';
import { DriveInfo, IndexedLocation, SavedSearch, DragDropOperation, FileItem } from '../types';

interface SidebarProps {
  drives: DriveInfo[];
  folders?: FileItem[];
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

interface TreeNodeProps {
  folder: FileItem;
  allFolders: FileItem[];
  currentPath: string;
  onNavigatePath: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleExpand: (path: string) => void;
  dropHoverPath: string | null;
  setDropHoverPath: (path: string | null) => void;
  onDropOnSidebarItem?: (targetPath: string, itemIds: string[], op: DragDropOperation) => void;
  depth?: number;
}

const FolderTreeNode: React.FC<TreeNodeProps> = ({
  folder,
  allFolders,
  currentPath,
  onNavigatePath,
  expandedFolders,
  onToggleExpand,
  dropHoverPath,
  setDropHoverPath,
  onDropOnSidebarItem,
  depth = 1,
}) => {
  const normCurrent = currentPath.toLowerCase().replace(/[\\/]+$/, '');
  const normFolder = folder.path.toLowerCase().replace(/[\\/]+$/, '');
  const isActive = normCurrent === normFolder;
  const isHovered = dropHoverPath === folder.path;

  // Find direct child folders
  const childFolders = allFolders.filter((f) => {
    const fParent = f.parentPath.toLowerCase().replace(/[\\/]+$/, '');
    return fParent === normFolder;
  });

  const hasChildren = childFolders.length > 0;
  const isExpanded = expandedFolders.has(normFolder);

  return (
    <div className="flex flex-col select-none">
      <div
        onClick={() => onNavigatePath(folder.path)}
        onDragOver={(e) => {
          if (onDropOnSidebarItem) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
            setDropHoverPath(folder.path);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (dropHoverPath === folder.path) setDropHoverPath(null);
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
                onDropOnSidebarItem(folder.path, parsed.ids, op);
              } catch {
                // ignore
              }
            }
          }
        }}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className={`group flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer transition-colors text-left truncate ${
          isHovered
            ? 'bg-blue-100 dark:bg-blue-900/70 ring-2 ring-blue-500 font-bold text-blue-900 dark:text-blue-100'
            : isActive
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-semibold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
        }`}
        title={folder.path}
      >
        {/* Expand / Collapse Chevron */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(normFolder);
            }}
            className="p-0.5 hover:bg-slate-300/60 dark:hover:bg-slate-700/60 rounded text-slate-500 dark:text-slate-400 shrink-0"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="truncate text-xs flex-1">{folder.name}</span>
        {folder.itemCount !== undefined && folder.itemCount > 0 && (
          <span className="text-[10px] text-slate-400 opacity-60 group-hover:opacity-100">
            {folder.itemCount}
          </span>
        )}
      </div>

      {/* Render children recursively if expanded */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {childFolders.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              currentPath={currentPath}
              onNavigatePath={onNavigatePath}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              dropHoverPath={dropHoverPath}
              setDropHoverPath={setDropHoverPath}
              onDropOnSidebarItem={onDropOnSidebarItem}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  drives,
  folders = [],
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

  // Expanded folders in the directory tree
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    initial.add('d:\\nh48_highway_project');
    return initial;
  });

  // Auto-expand tree nodes along currentPath so current folder is always visible
  useEffect(() => {
    if (!currentPath || currentPath === 'This PC') return;
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    const pathsToExpand: string[] = [];
    let accum = '';
    for (let i = 0; i < parts.length; i++) {
      accum = i === 0 ? parts[i] : `${accum}\\${parts[i]}`;
      pathsToExpand.push(accum.toLowerCase());
    }

    setExpandedFolders((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const p of pathsToExpand) {
        if (!next.has(p)) {
          next.add(p);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentPath]);

  const handleToggleExpandFolder = (normPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(normPath)) {
        next.delete(normPath);
      } else {
        next.add(normPath);
      }
      return next;
    });
  };

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
          <div className="mt-1 space-y-0.5 px-2">
            {/* "This PC" Root Node */}
            <button
              onClick={() => onNavigatePath('This PC')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left truncate transition-all ${
                currentPath === 'This PC'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
              title="This PC (Drives & Root Folders)"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold text-xs">This PC</span>
            </button>

            {/* Drives List with Subfolders */}
            {drives.map((drive) => {
              const normDrive = drive.letter.toLowerCase().replace(/[\\/]+$/, '');
              const isDriveActive = currentPath.toLowerCase().replace(/[\\/]+$/, '') === normDrive;
              const isDriveExpanded = expandedFolders.has(normDrive);

              // Find root folders in this drive
              const driveRootFolders = folders.filter((f) => {
                const fParent = f.parentPath.toLowerCase().replace(/[\\/]+$/, '');
                return fParent === normDrive;
              });

              const hasDriveFolders = driveRootFolders.length > 0;
              const usedPercent = drive.totalBytes > 0 
                ? Math.min(100, Math.round((drive.usedBytes / drive.totalBytes) * 100)) 
                : 45;

              return (
                <div key={drive.letter} className="flex flex-col">
                  {/* Drive Header Row */}
                  <div
                    onClick={() => onNavigatePath(drive.letter)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                      isDriveActive
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-bold'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {/* Expand/Collapse Chevron for Drive */}
                    {hasDriveFolders ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleExpandFolder(normDrive);
                        }}
                        className="p-0.5 hover:bg-slate-300/60 dark:hover:bg-slate-700/60 rounded text-slate-500 shrink-0"
                        title={isDriveExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isDriveExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}

                    <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="font-semibold text-xs">{drive.letter}</span>
                    <span className="text-[11px] text-slate-500 truncate flex-1">{drive.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-tabular">{usedPercent}%</span>
                  </div>

                  {/* Render Drive Subfolders Tree */}
                  {isDriveExpanded && hasDriveFolders && (
                    <div className="flex flex-col">
                      {driveRootFolders.map((subFolder) => (
                        <FolderTreeNode
                          key={subFolder.id}
                          folder={subFolder}
                          allFolders={folders}
                          currentPath={currentPath}
                          onNavigatePath={onNavigatePath}
                          expandedFolders={expandedFolders}
                          onToggleExpand={handleToggleExpandFolder}
                          dropHoverPath={dropHoverPath}
                          setDropHoverPath={setDropHoverPath}
                          onDropOnSidebarItem={onDropOnSidebarItem}
                          depth={1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
