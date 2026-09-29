import React, { useState } from 'react';
import { 
  HardDrive, 
  ShieldCheck, 
  CheckCircle2, 
  FolderTree, 
  Plus, 
  Check, 
  Loader2, 
  Database,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { DriveInfo } from '../types';

interface DriveGrantModalProps {
  onGrantPermission: () => Promise<void>;
  onClose?: () => void;
  onLoadSampleFiles?: () => void;
  isIndexing: boolean;
  indexedCount: number;
  currentScanningFolder: string;
  grantedDrives: DriveInfo[];
}

export const DriveGrantModal: React.FC<DriveGrantModalProps> = ({
  onGrantPermission,
  onClose,
  onLoadSampleFiles,
  isIndexing,
  indexedCount,
  currentScanningFolder,
  grantedDrives,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a212d] border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 py-5 text-white flex items-center gap-3 shrink-0">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs">
            <HardDrive className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <span>Grant Access to This PC &amp; Local Drives</span>
              <span className="text-[10px] uppercase font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                Setup
              </span>
            </h2>
            <p className="text-xs text-blue-100/90 mt-0.5">
              Index and browse your PC's documents (3+ TB capable • 100% offline &amp; private)
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Security & Offline Notice */}
          <div className="flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-xs">Permanent Local Access (No Re-indexing Required)</p>
              <p className="text-[11px] leading-relaxed text-blue-900/90 dark:text-blue-200/90">
                InfraFinder directly scans and indexes your PC's local drives (e.g. <code>D:\</code>, <code>C:\</code>, <code>E:\</code>, or project site disks). All file metadata and text search tokens are <strong>stored permanently in your PC's IndexedDB database</strong>. Next time you reopen the app, all files and drives remain immediately ready!
              </p>
            </div>
          </div>

          {/* Already Granted Drives List */}
          {grantedDrives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                <span>Currently Connected Drives:</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {grantedDrives.length} {grantedDrives.length === 1 ? 'drive' : 'drives'} connected
                </span>
              </div>
              <div className="space-y-1.5">
                {grantedDrives.map((d) => (
                  <div
                    key={d.letter}
                    className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-emerald-900 dark:text-emerald-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span className="font-bold text-xs">{d.letter}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-1.5 text-[11px]">({d.label})</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-medium">
                      Active &amp; Persistent
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Indexing Progress Indicator */}
          {isIndexing && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                  <span>Scanning &amp; Indexing Local PC Files...</span>
                </div>
                <span className="font-bold font-mono text-xs">{indexedCount.toLocaleString()} files indexed</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 truncate font-mono bg-white/60 dark:bg-black/30 p-1.5 rounded border border-amber-200 dark:border-amber-800/40">
                {currentScanningFolder || 'Scanning root directory...'}
              </p>
              <div className="w-full bg-amber-200 dark:bg-amber-900/40 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-600 h-full w-2/3 animate-indeterminate"></div>
              </div>
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                Streaming directly into local IndexedDB storage (handles 3+ TB without freezing).
              </p>
            </div>
          )}

          {/* Instructions */}
          {!isIndexing && (
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                How to grant drive access:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Click the button below. Windows File Explorer will open.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Select your drive or project disk (e.g. <strong>D:\</strong> or <strong>C:\</strong> or your main engineering folder).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Click <strong>"Select Folder"</strong>. All your DPRs, MPRs, IPC bills, RA bills, BOQ spreadsheets, and CAD DWGs will index automatically! You can add multiple drives (C:, D:, E:).
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#151922] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {grantedDrives.length > 0 && onClose && !isIndexing ? (
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-medium"
              >
                Close &amp; Continue
              </button>
            ) : onLoadSampleFiles && !isIndexing ? (
              <button
                onClick={onLoadSampleFiles}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Quickly test with sample highway project files (tags, search, batch rename)"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Load Sample Project Drive (Instant Demo)</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                <span>IndexedDB Engine</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGrantPermission}
              disabled={isIndexing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm text-xs flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {isIndexing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : grantedDrives.length > 0 ? (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Grant Access to Another Drive (C:, E:, USB)</span>
                </>
              ) : (
                <>
                  <FolderTree className="w-4 h-4" />
                  <span>Grant Access to This PC &amp; Local Drive</span>
                </>
              )}
            </button>

            {grantedDrives.length > 0 && onClose && !isIndexing && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm text-xs flex items-center gap-1.5 transition-all"
              >
                <span>Done</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
