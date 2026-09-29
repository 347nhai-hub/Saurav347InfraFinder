import React, { useState } from 'react';
import { HardDrive, X, Check, Folder, AlertCircle } from 'lucide-react';
import { IndexedLocation } from '../types';

interface EditPathModalProps {
  location: IndexedLocation;
  onSaveNewPath: (locId: string, oldPath: string, newPath: string) => void;
  onClose: () => void;
}

export const EditPathModal: React.FC<EditPathModalProps> = ({
  location,
  onSaveNewPath,
  onClose,
}) => {
  const [newPath, setNewPath] = useState(location.path);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;
    const clean = newPath.trim().replace(/[\\/]+$/, '');
    onSaveNewPath(location.id, location.path, clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a212d] border border-slate-300 dark:border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="bg-slate-100 dark:bg-[#151922] px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold">Configure Exact Windows PC Path</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Windows Path on your local PC:
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Set the exact folder location on your computer (e.g. <code>D:\Highway_Projects\NH48</code> or <code>C:\Users\YourName\Documents\...</code>) so "Open in Windows Explorer" works directly.
            </p>
          </div>

          <div className="space-y-1">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="e.g. D:\NH-48_Six_Laning_Project"
              className="w-full h-9 px-3 text-xs font-mono bg-white dark:bg-[#12161f] border border-slate-300 dark:border-slate-700 rounded-md focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Update PC Path</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
