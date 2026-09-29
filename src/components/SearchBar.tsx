import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Clock, 
  Trash2, 
  ArrowUpRight, 
  Zap, 
  Play, 
  Sparkles, 
  Layers, 
  FileSpreadsheet, 
  FileText, 
  Compass, 
  FileCode,
  Check
} from 'lucide-react';
import { SearchHistoryItem, FileItem } from '../types';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchDurationMs: number;
  totalResultsCount: number;
  searchHistory: SearchHistoryItem[];
  onSelectHistoryItem: (query: string) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onSaveCurrentSearch: () => void;
  matchAllWords?: boolean;
  onToggleMatchAllWords?: () => void;
  onOpenStartSuggestions?: () => void;
  startSuggestions?: { file: FileItem; reason: string; explicitCommand: string }[];
  onLaunchFile?: (file: FileItem) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  searchDurationMs,
  totalResultsCount,
  searchHistory,
  onSelectHistoryItem,
  onRemoveHistoryItem,
  onClearHistory,
  matchAllWords = true,
  onToggleMatchAllWords,
  onOpenStartSuggestions,
  startSuggestions = [],
  onLaunchFile,
}) => {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<'suggestions' | 'history'>('suggestions');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  // Determine if input has multiple words
  const wordsCount = inputValue.trim().split(/\s+/).filter(Boolean).length;
  const isMultiWord = wordsCount > 1;

  // Sync external changes (e.g. from history click, tag click, or clear filters) ONLY if not typing
  useEffect(() => {
    if (!isTypingRef.current && searchQuery !== inputValue) {
      setInputValue(searchQuery);
    }
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    isTypingRef.current = true;
    setInputValue(val);
    if (!isOpenDropdown) setIsOpenDropdown(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(val);
      isTypingRef.current = false;
    }, 150);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl + F to focus search, and Enter to trigger immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpenDropdown(true);
      } else if (e.key === 'Escape' && isOpenDropdown) {
        setIsOpenDropdown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenDropdown]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      isTypingRef.current = false;
      onSearchChange(inputValue);
      setIsOpenDropdown(false);
    } else if (e.key === 'Escape') {
      setIsOpenDropdown(false);
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    isTypingRef.current = false;
    setInputValue('');
    onSearchChange('');
    inputRef.current?.focus();
  };

  const handleSelectRecent = (q: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    isTypingRef.current = false;
    setInputValue(q);
    onSearchChange(q);
    setIsOpenDropdown(false);
  };

  const getFileIcon = (ext: string) => {
    const lower = ext.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(lower)) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (['dwg', 'dxf'].includes(lower)) {
      return <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    }
    if (lower === 'pdf') {
      return <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
    }
    return <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute left-3 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpenDropdown(true)}
          placeholder="Search files, folders, and content (e.g. IPC Bill, Flyover DWG, Safety Audit Ch85)..."
          className="w-full h-10 pl-9 pr-48 text-sm bg-white dark:bg-[#181d26] text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-[#c8d4e4] dark:border-[#2f3b4e] rounded-md shadow-xs focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
        />

        {/* Right tools inside search input: Multi-Word Toggle, Start Suggestions, Clear button & Speed benchmark */}
        <div className="absolute right-2 flex items-center gap-1.5">
          {/* Multi-Word Match Option Toggle (Visible when searching or typing) */}
          {onToggleMatchAllWords && (
            <button
              onClick={onToggleMatchAllWords}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                matchAllWords
                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
              }`}
              title={
                matchAllWords
                  ? 'Match ALL Words (AND Mode): Only files containing every searched word appear in results.'
                  : 'Match ANY Word (OR Mode): Files containing any searched word will appear in results.'
              }
            >
              {matchAllWords ? (
                <>
                  <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>ALL Words (AND)</span>
                </>
              ) : (
                <>
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>ANY Word (OR)</span>
                </>
              )}
            </button>
          )}

          {/* Quick Start File Suggestions Action Button */}
          {onOpenStartSuggestions && (
            <button
              onClick={onOpenStartSuggestions}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-colors shrink-0"
              title="Open Start File Suggestions dialog (explicit Windows shell launch)"
            >
              <Zap className="w-3 h-3 fill-white" />
              <span className="hidden sm:inline">Start Suggestions</span>
            </button>
          )}

          {inputValue && (
            <button
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Clear search (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {inputValue.trim() && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-tabular shrink-0">
              <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{searchDurationMs}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown: Start File Suggestions & Recent Searches */}
      {isOpenDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden text-xs">
          {/* Tabs */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#171c26] border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDropdownTab('suggestions')}
                className={`font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  dropdownTab === 'suggestions'
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Start File Suggestions ({startSuggestions.length})</span>
              </button>

              <button
                onClick={() => setDropdownTab('history')}
                className={`font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  dropdownTab === 'history'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Recent Searches ({searchHistory.length})</span>
              </button>
            </div>

            {dropdownTab === 'history' && searchHistory.length > 0 && (
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:underline"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}

            {dropdownTab === 'suggestions' && onOpenStartSuggestions && (
              <button
                onClick={() => {
                  setIsOpenDropdown(false);
                  onOpenStartSuggestions();
                }}
                className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                <span>View All &rarr;</span>
              </button>
            )}
          </div>

          {/* Tab 1: Start File Suggestions */}
          {dropdownTab === 'suggestions' && (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {startSuggestions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-[11px]">
                  No start suggestions available right now.
                </div>
              ) : (
                startSuggestions.slice(0, 5).map((item) => (
                  <div
                    key={item.file.id}
                    className="px-3 py-2 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <div className="shrink-0 p-1 rounded bg-slate-100 dark:bg-slate-800">
                        {getFileIcon(item.file.extension)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.file.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 shrink-0 font-medium">
                            {item.reason}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {item.explicitCommand}
                        </p>
                      </div>
                    </div>

                    {onLaunchFile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpenDropdown(false);
                          onLaunchFile(item.file);
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px] flex items-center gap-1 shadow-2xs shrink-0"
                        title="Start file with Windows default application"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Start</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Recent Searches */}
          {dropdownTab === 'history' && (
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchHistory.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-[11px]">
                  No recent search queries.
                </div>
              ) : (
                searchHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectRecent(item.query)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-blue-50/70 dark:hover:bg-blue-900/30 cursor-pointer group text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.query}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 group-hover:text-blue-500 flex items-center gap-0.5">
                        Search <ArrowUpRight className="w-3 h-3" />
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveHistoryItem(item.id);
                        }}
                        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Remove item"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
