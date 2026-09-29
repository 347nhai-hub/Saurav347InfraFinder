import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  X, 
  Play, 
  FolderOpen, 
  Copy, 
  Check, 
  Terminal, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Compass, 
  FileCode, 
  Clock, 
  AlertCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { FileItem } from '../types';
import { 
  getStartFileSuggestions, 
  getWindowsStartCommand, 
  getWindowsRunCommand,
  normalizeWindowsPath 
} from '../services/localLauncher';

interface StartSuggestionsModalProps {
  files: FileItem[];
  isOpen: boolean;
  onClose: () => void;
  onLaunchFile: (file: FileItem) => void;
  onOpenContainingFolder: (file: FileItem) => void;
}

export const StartSuggestionsModal: React.FC<StartSuggestionsModalProps> = ({
  files,
  isOpen,
  onClose,
  onLaunchFile,
  onOpenContainingFolder,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'recent' | 'urgent' | 'cad' | 'excel' | 'pdf'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate intelligent suggestions
  const allSuggestions = useMemo(() => {
    return getStartFileSuggestions(files, '', 30);
  }, [files]);

  // Filter based on category and keyboard search query
  const filteredSuggestions = useMemo(() => {
    let result = allSuggestions;

    // Category filter
    if (activeCategory === 'recent') {
      result = result.filter(s => s.reason === 'Recently Started');
    } else if (activeCategory === 'urgent') {
      result = result.filter(s => 
        s.reason.includes('Urgent') || 
        (s.file.tags || []).some(t => t.toLowerCase() === 'urgent' || t.toLowerCase() === 'in review')
      );
    } else if (activeCategory === 'cad') {
      result = result.filter(s => ['dwg', 'dxf'].includes(s.file.extension.toLowerCase()));
    } else if (activeCategory === 'excel') {
      result = result.filter(s => ['xlsx', 'xls', 'csv'].includes(s.file.extension.toLowerCase()));
    } else if (activeCategory === 'pdf') {
      result = result.filter(s => s.file.extension.toLowerCase() === 'pdf');
    }

    // Keyboard search query filter (with multi-word matching)
    const cleanSearch = searchFilter.trim().toLowerCase();
    if (cleanSearch) {
      const words = cleanSearch.split(/\s+/).filter(w => w.length > 0);
      result = result.filter(item => {
        const normName = item.file.name.toLowerCase();
        const normPath = item.file.path.toLowerCase();
        const normTags = (item.file.tags || []).map(t => t.toLowerCase());
        const normExt = item.file.extension.toLowerCase();
        const reason = item.reason.toLowerCase();

        // Enforce that ALL searched words must match!
        return words.every(word => 
          normName.includes(word) || 
          normPath.includes(word) || 
          normTags.some(t => t.includes(word)) || 
          normExt.includes(word) || 
          reason.includes(word)
        );
      });
    }

    return result;
  }, [allSuggestions, activeCategory, searchFilter]);

  if (!isOpen) return null;

  const handleCopyStartCommand = (file: FileItem) => {
    const cmd = getWindowsStartCommand(file.path);
    navigator.clipboard.writeText(cmd);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (ext: string) => {
    const lower = ext.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(lower)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (['dwg', 'dxf'].includes(lower)) {
      return <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
    if (lower === 'pdf') {
      return <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    }
    return <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a212d] border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-[#151922] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Start File Suggestions
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Explicit Windows 'start' Shell
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Instantly launch suggested &amp; high-priority highway documents with your PC's default system applications.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Keyboard Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#12161f]/70 space-y-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Type keywords to filter suggestions (e.g. IPC, Flyover, Safety, Rev-04)..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-white dark:bg-[#181d26] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs font-medium"
              autoFocus
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Categories Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filter:
            </span>
            {[
              { id: 'all', label: 'All Suggestions' },
              { id: 'recent', label: '⚡ Recently Started' },
              { id: 'urgent', label: '🚨 Urgent / In Review' },
              { id: 'cad', label: '📐 CAD Drawings' },
              { id: 'excel', label: '📊 Billing Sheets' },
              { id: 'pdf', label: '📄 PDF Reports' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredSuggestions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No start suggestions matched "{searchFilter}"
              </p>
              <p className="text-[11px] text-slate-400">
                Ensure all typed words match or try a broader search keyword.
              </p>
              <button
                onClick={() => { setSearchFilter(''); setActiveCategory('all'); }}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            filteredSuggestions.map((item) => {
              const file = item.file;
              const normPath = normalizeWindowsPath(file.path);
              const isCopied = copiedId === file.id;

              return (
                <div
                  key={file.id}
                  className="p-3 bg-white dark:bg-[#161a22] border border-slate-200 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-600 rounded-xl transition-all shadow-2xs hover:shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        {getFileIcon(file.extension)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {file.name}
                          </h4>

                          {/* Reason Badge */}
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                            {item.reason}
                          </span>

                          {/* Tags */}
                          {(file.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Local Windows File Path */}
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-1">
                          {normPath}
                        </p>

                        {/* Explicit Windows Start Shell Command preview */}
                        <div className="mt-1.5 px-2 py-1 bg-slate-100/80 dark:bg-[#0f131a] rounded border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 select-all">
                          <span className="truncate">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">start "" </span>
                            "{normPath}"
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Launch Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      {/* Start with Default App (1-Click Run) */}
                      <button
                        onClick={() => onLaunchFile(file)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Start file with Windows default application"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start File</span>
                      </button>

                      {/* Reveal in Explorer */}
                      <button
                        onClick={() => onOpenContainingFolder(file)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition-colors"
                        title="Reveal in Windows File Explorer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy explicit start command */}
                      <button
                        onClick={() => handleCopyStartCommand(file)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition-colors"
                        title="Copy explicit Windows 'start' shell command to clipboard"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-[#151922] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-blue-500" />
            <span>
              Explicit syntax <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">start "" "&lt;path&gt;"</code> opens files directly in Microsoft Excel, AutoCAD, Acrobat, or Word.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
