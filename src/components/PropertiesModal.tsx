import React from 'react';
import { X, File, Folder } from 'lucide-react';
import { FileItem } from '../types';
import { formatDate, formatFileSize } from '../services/localFileSystem';

interface PropertiesModalProps {
  file: FileItem;
  onClose: () => void;
}

export const PropertiesModal: React.FC<PropertiesModalProps> = ({ file, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2430] border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-xs">
        {/* Header */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#151922] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {file.isFolder ? (
              <Folder className="w-4 h-4 text-amber-500" />
            ) : (
              <File className="w-4 h-4 text-blue-600" />
            )}
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-xs">
              {file.name} Properties
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              {file.isFolder ? <Folder className="w-8 h-8 text-amber-500" /> : <File className="w-8 h-8 text-blue-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                readOnly
                value={file.name}
                className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded font-semibold text-slate-800 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-400 mt-1 capitalize">
                {file.isFolder ? 'Folder' : `${file.extension.toUpperCase()} Document`}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Type of file:</span>
              <span className="col-span-2 font-medium">{file.isFolder ? 'File folder' : `.${file.extension}`}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Opens with:</span>
              <span className="col-span-2 font-medium text-blue-600 dark:text-blue-400">
                {file.isFolder ? 'Windows Explorer' : `Default Windows App (${file.extension.toUpperCase()})`}
              </span>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>

            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Location:</span>
              <span className="col-span-2 font-mono break-all">{file.parentPath}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Size:</span>
              <span className="col-span-2 font-mono">
                {file.isFolder ? '--' : `${formatFileSize(file.size)} (${file.size.toLocaleString()} bytes)`}
              </span>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>

            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Created:</span>
              <span className="col-span-2 font-mono">{formatDate(file.createdDate)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Modified:</span>
              <span className="col-span-2 font-mono">{formatDate(file.modifiedDate)}</span>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <span className="text-slate-400">Attributes:</span>
              <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" defaultChecked={false} className="rounded text-blue-600" />
                  <span>Read-only</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" defaultChecked={false} className="rounded text-blue-600" />
                  <span>Hidden</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#151922] border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs"
          >
            OK
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
