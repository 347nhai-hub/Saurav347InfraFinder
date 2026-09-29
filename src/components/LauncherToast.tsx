import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Terminal, 
  Play,
  Code2
} from 'lucide-react';
import { LauncherFeedback, executeWindowsLauncher } from '../services/localLauncher';

interface LauncherToastProps {
  feedback: LauncherFeedback | null;
  onClose: () => void;
}

export const LauncherToast: React.FC<LauncherToastProps> = ({
  feedback,
  onClose,
}) => {
  const [copiedType, setCopiedType] = useState<'path' | 'start' | 'run' | null>(null);

  useEffect(() => {
    setCopiedType(null);
  }, [feedback]);

  if (!feedback) return null;

  const handleCopyStartCmd = () => {
    navigator.clipboard.writeText(feedback.command);
    setCopiedType('start');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyRunCmd = () => {
    const cmd = feedback.runCommand || `cmd.exe /c ${feedback.command}`;
    navigator.clipboard.writeText(cmd);
    setCopiedType('run');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(feedback.path);
    setCopiedType('path');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDirectLaunch = () => {
    if (feedback.launcherFileName && feedback.command) {
      executeWindowsLauncher(feedback.launcherFileName, feedback.command, feedback.title);
    }
  };

  return (
    <div className="fixed bottom-8 right-6 z-50 max-w-lg w-full bg-white dark:bg-[#1a212d] border border-blue-300 dark:border-blue-700/80 rounded-xl shadow-2xl p-4 text-slate-800 dark:text-slate-100 animate-in slide-in-from-bottom-5 duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            {feedback.type === 'folder' ? (
              <FolderOpen className="w-4 h-4" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {feedback.title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {feedback.message}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Explicit Windows Start Shell Command Display */}
      <div className="mt-3 p-2 bg-slate-50 dark:bg-[#12161f] rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-blue-500" />
            Explicit Windows Shell Command:
          </span>
          <button
            onClick={handleCopyStartCmd}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1 normal-case"
          >
            {copiedType === 'start' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedType === 'start' ? 'Copied!' : 'Copy start'}</span>
          </button>
        </div>

        <div className="p-1.5 bg-slate-100 dark:bg-[#0c0f14] rounded border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-200 break-all select-all font-medium">
          {feedback.command}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate pt-0.5">
          <span className="truncate" title={feedback.path}>Path: {feedback.path}</span>
          <button
            onClick={handleCopyPath}
            className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-sans ml-2 shrink-0 flex items-center gap-0.5"
          >
            {copiedType === 'path' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : null}
            <span>Copy Path</span>
          </button>
        </div>
      </div>

      {/* Quick Launch & Windows Explorer Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleDirectLaunch}
          className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
          title="Directly launch on Windows PC with system default program"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Launch on Local PC</span>
        </button>

        <button
          onClick={handleCopyRunCmd}
          className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0"
          title="Copies full command for Windows Run dialog (Win + R)"
        >
          {copiedType === 'run' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Terminal className="w-3.5 h-3.5 text-slate-500" />}
          <span>Win + R Run</span>
        </button>
      </div>

      <p className="mt-2 text-[10px] text-slate-400 text-center">
        Tip: Press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">Win + R</kbd> &rarr; <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">Ctrl + V</kbd> &rarr; <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[9px]">Enter</kbd> to launch via Windows shell!
      </p>
    </div>
  );
};
