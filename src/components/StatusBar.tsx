import React from 'react';
import { Database, HardDrive, Zap, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatFileSize } from '../services/localFileSystem';

interface StatusBarProps {
  totalItemsCount: number;
  filteredItemsCount: number;
  selectedItemSize?: number;
  totalSizeIndexed: number;
  isIndexing: boolean;
  indexedCount: number;
  totalToScan: number;
  searchDurationMs: number;
  hasQuery: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  totalItemsCount,
  filteredItemsCount,
  selectedItemSize,
  totalSizeIndexed,
  isIndexing,
  indexedCount,
  totalToScan,
  searchDurationMs,
  hasQuery,
}) => {
  return (
    <footer className="h-6 bg-[#f1f4f9] dark:bg-[#151922] border-t border-[#d8e0ea] dark:border-[#283243] flex items-center justify-between px-3 text-[11px] text-slate-500 dark:text-slate-400 select-none shrink-0 font-tabular">
      {/* Left: Item Counts */}
      <div className="flex items-center gap-3">
        <span>
          {hasQuery
            ? `${filteredItemsCount.toLocaleString()} items found`
            : `${filteredItemsCount.toLocaleString()} items`}
        </span>

        {selectedItemSize !== undefined && selectedItemSize > 0 && (
          <>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>1 item selected ({formatFileSize(selectedItemSize)})</span>
          </>
        )}

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
        <span className="hidden sm:inline">Total Index: {formatFileSize(totalSizeIndexed)}</span>
      </div>

      {/* Center: Search Benchmark */}
      {hasQuery && (
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
          <Zap className="w-3 h-3" />
          <span>Search: {searchDurationMs} ms</span>
        </div>
      )}

      {/* Right: Index Status Indicator (Requirement 23) */}
      <div className="flex items-center gap-2">
        {isIndexing ? (
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Indexing... {indexedCount.toLocaleString()} / {totalToScan.toLocaleString()} files</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Index Up to Date</span>
          </div>
        )}
      </div>
    </footer>
  );
};
