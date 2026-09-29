import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  FolderPlus, 
  Trash2, 
  RotateCw, 
  Pause, 
  Play, 
  Check, 
  ShieldCheck, 
  HardDrive,
  FolderTree
} from 'lucide-react';
import { IndexedLocation, SortByField, ViewMode } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  indexedLocations: IndexedLocation[];
  excludedLocations: string[];
  onAddIndexedLocation: () => void;
  onRemoveIndexedLocation: (id: string) => void;
  onAddExcludedLocation: (path: string) => void;
  onRemoveExcludedLocation: (path: string) => void;
  onRebuildIndex: () => void;
  isIndexingPaused: boolean;
  onTogglePauseIndexing: () => void;
  contentSearchEnabled: boolean;
  onToggleContentSearch: () => void;
  defaultSort: SortByField;
  onDefaultSortChange: (sort: SortByField) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  indexedLocations,
  excludedLocations,
  onAddIndexedLocation,
  onRemoveIndexedLocation,
  onAddExcludedLocation,
  onRemoveExcludedLocation,
  onRebuildIndex,
  isIndexingPaused,
  onTogglePauseIndexing,
  contentSearchEnabled,
  onToggleContentSearch,
  defaultSort,
  onDefaultSortChange,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'indexing' | 'search' | 'general'>('indexing');
  const [newExcludePath, setNewExcludePath] = useState('');
  const [rebuilding, setRebuilding] = useState(false);

  const handleRebuild = () => {
    setRebuilding(true);
    setTimeout(() => {
      onRebuildIndex();
      setRebuilding(false);
    }, 600);
  };

  const handleAddExclude = (e: React.FormEvent) => {
    e.preventDefault();
    if (newExcludePath.trim()) {
      onAddExcludedLocation(newExcludePath.trim());
      setNewExcludePath('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2430] border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden text-xs flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-100 dark:bg-[#151922] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              InfraFinder Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161b24] px-3 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('indexing')}
            className={`px-3 py-1.5 font-medium rounded-t-md border-t border-x transition-colors ${
              activeTab === 'indexing'
                ? 'bg-white dark:bg-[#1e2430] border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Indexing &amp; Folders
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 font-medium rounded-t-md border-t border-x transition-colors ${
              activeTab === 'search'
                ? 'bg-white dark:bg-[#1e2430] border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Search Engine
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 font-medium rounded-t-md border-t border-x transition-colors ${
              activeTab === 'general'
                ? 'bg-white dark:bg-[#1e2430] border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            General &amp; Theme
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'indexing' && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#151922] rounded border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Local Indexing Status</p>
                  <p className="text-[11px] text-slate-500">
                    {isIndexingPaused ? 'Indexing is currently paused' : 'Active background monitoring enabled'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onTogglePauseIndexing}
                    className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 ${
                      isIndexingPaused
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {isIndexingPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isIndexingPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={handleRebuild}
                    disabled={rebuilding}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin' : ''}`} />
                    <span>Rebuild Index</span>
                  </button>
                </div>
              </div>

              {/* Indexed Locations List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Indexed Folders ({indexedLocations.length})
                  </span>
                  <button
                    onClick={onAddIndexedLocation}
                    className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add Folder / Drive</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto">
                  {indexedLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <div className="truncate mr-2">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{loc.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{loc.path}</p>
                      </div>
                      <button
                        onClick={() => onRemoveIndexedLocation(loc.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                        title="Remove from index"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Excluded Locations */}
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Excluded Folders (System / Temp)
                </span>

                <div className="border border-slate-200 dark:border-slate-700 rounded divide-y divide-slate-100 dark:divide-slate-800 max-h-32 overflow-y-auto">
                  {excludedLocations.map((path) => (
                    <div
                      key={path}
                      className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px]"
                    >
                      <span className="font-mono text-slate-600 dark:text-slate-400 truncate">{path}</span>
                      <button
                        onClick={() => onRemoveExcludedLocation(path)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                        title="Remove exclusion"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddExclude} className="mt-2 flex gap-1.5">
                  <input
                    type="text"
                    value={newExcludePath}
                    onChange={(e) => setNewExcludePath(e.target.value)}
                    placeholder="Exclude path e.g. D:\Archive\Old_Backups"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151922] rounded text-slate-800 dark:text-slate-200 outline-hidden font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-medium rounded text-slate-700 dark:text-slate-200"
                  >
                    Exclude
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-[#151922] rounded border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contentSearchEnabled}
                    onChange={onToggleContentSearch}
                    className="mt-0.5 rounded text-blue-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Enable In-Document Content Search
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Searches inside PDF text streams, Word clauses, Excel sheets, and CAD text annotations.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Search Result Sorting
                </label>
                <select
                  value={defaultSort}
                  onChange={(e) => onDefaultSortChange(e.target.value as SortByField)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151922] rounded text-slate-800 dark:text-slate-200 outline-hidden"
                >
                  <option value="relevance">Relevance (BM25 Match Score)</option>
                  <option value="modified">Date Modified (Newest first)</option>
                  <option value="name">File Name (Alphabetical)</option>
                  <option value="size">File Size</option>
                  <option value="type">File Type</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded text-blue-800 dark:text-blue-300 text-[11px] space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Offline &amp; Local Privacy Guarantee
                </p>
                <p>
                  All document indexes, searches, and extracted snippets remain strictly on your local PC. No telemetry, cloud sync, or external API communication occurs.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { if (isDarkMode) onToggleDarkMode(); }}
                    className={`p-2.5 rounded border text-center font-medium ${
                      !isDarkMode
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Windows Light
                  </button>
                  <button
                    onClick={() => { if (!isDarkMode) onToggleDarkMode(); }}
                    className={`p-2.5 rounded border text-center font-medium ${
                      isDarkMode
                        ? 'border-blue-500 bg-blue-950/60 text-blue-300 font-semibold'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Windows Dark
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked={true} className="rounded text-blue-600" />
                  <span>Start with Windows in background tray</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked={true} className="rounded text-blue-600" />
                  <span>Show instant indexing icon in system tray</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#151922] border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
