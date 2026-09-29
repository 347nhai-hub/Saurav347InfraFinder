import React, { useState } from 'react';
import { X, BookmarkPlus, Check } from 'lucide-react';
import { SearchFilters } from '../types';

interface SaveSearchModalProps {
  filters: SearchFilters;
  onSave: (name: string) => void;
  onClose: () => void;
}

export const SaveSearchModal: React.FC<SaveSearchModalProps> = ({
  filters,
  onSave,
  onClose,
}) => {
  const defaultSuggestedName = filters.query
    ? `${filters.query} Search`
    : `${filters.category.toUpperCase()} Files (${filters.dateRange})`;

  const [name, setName] = useState(defaultSuggestedName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2430] border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#151922] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Save Current Search
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Search Shortcut Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly IPC, EOT Correspondence, NCR Reports"
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151922] rounded text-slate-900 dark:text-slate-100 outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="bg-slate-50 dark:bg-[#151922] p-2.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Filters Saved:</p>
            <p>• Query: {filters.query ? `"${filters.query}"` : '(Any)'}</p>
            <p>• Category: {filters.category.toUpperCase()}</p>
            <p>• Date: {filters.dateRange} ({filters.dateTarget})</p>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Suggestions:</span>
            <div className="flex flex-wrap gap-1">
              {['Monthly IPCs', 'EOT Correspondence', 'NCR Reports', 'MoRTH Specs', 'Plan & Profile CAD'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setName(preset)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 rounded text-[11px]"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Search</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
