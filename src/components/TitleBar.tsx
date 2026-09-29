import React from 'react';
import { Minus, Square, X, FolderTree, Cpu, Settings, Moon, Sun, Zap } from 'lucide-react';

interface TitleBarProps {
  onOpenSettings: () => void;
  onOpenArchitecture: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  indexStatus: string;
  onAddLocalFolder: () => void;
  onOpenStartSuggestions?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onOpenSettings,
  onOpenArchitecture,
  isDarkMode,
  onToggleDarkMode,
  indexStatus,
  onAddLocalFolder,
  onOpenStartSuggestions,
}) => {
  return (
    <header className="h-9 bg-[#f0f3f8] dark:bg-[#1a202c] border-b border-[#d8e0ea] dark:border-[#2d3748] flex items-center justify-between px-3 select-none shrink-0 transition-colors">
      {/* Brand & App Title */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <FolderTree className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          InfraFinder
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
          Highway &amp; Infrastructure Document Search
        </span>
        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{indexStatus}</span>
        </div>
      </div>

      {/* Right Action Tools & Window Buttons */}
      <div className="flex items-center gap-1.5">
        {onOpenStartSuggestions && (
          <button
            onClick={onOpenStartSuggestions}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded shadow-2xs transition-colors"
            title="Start File Suggestions (Launch high-priority documents with explicit Windows start shell command)"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span className="hidden sm:inline">Start Suggestions</span>
          </button>
        )}

        <button
          onClick={onAddLocalFolder}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition-colors"
          title="Grant access and index a PC drive (C:, D:, E:)"
        >
          <span>+ Add PC Drive / Folder</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

        <button
          onClick={onOpenArchitecture}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 rounded transition-colors"
          title="Windows Desktop Native Architecture Specification (Section 30)"
        >
          <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden md:inline">Tech Stack Arch</span>
        </button>

        {/* Prominent Windows Theme Segmented Toggle (Light vs Dark) */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-md text-[11px] font-medium border border-slate-300 dark:border-slate-700">
          <button
            onClick={() => { if (isDarkMode) onToggleDarkMode(); }}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
              !isDarkMode 
                ? 'bg-white text-slate-900 font-semibold shadow-xs' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="Switch to Windows Light Theme"
          >
            <Sun className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            onClick={() => { if (!isDarkMode) onToggleDarkMode(); }}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
              isDarkMode 
                ? 'bg-slate-900 text-white font-semibold shadow-xs' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            title="Switch to Windows Dark Theme"
          >
            <Moon className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 rounded transition-colors"
          title="Explorer & Index Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>

        {/* Windows Standard Window Controls */}
        <button
          onClick={() => {}}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {}}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => {}}
          className="p-1.5 hover:bg-red-500 hover:text-white rounded text-slate-600 dark:text-slate-400 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
