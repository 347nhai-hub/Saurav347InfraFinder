import React, { useState } from 'react';
import { 
  X, 
  Tag, 
  Plus, 
  Check, 
  Sparkles, 
  Layers, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { FileItem } from '../types';

export const PRESET_TAGS: { name: string; color: string; bgLight: string; textLight: string; bgDark: string; textDark: string; borderLight: string; borderDark: string }[] = [
  { 
    name: 'Approved', 
    color: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    textLight: 'text-emerald-700',
    borderLight: 'border-emerald-200',
    bgDark: 'dark:bg-emerald-950/50',
    textDark: 'dark:text-emerald-300',
    borderDark: 'dark:border-emerald-800'
  },
  { 
    name: 'Urgent', 
    color: 'bg-rose-500',
    bgLight: 'bg-rose-50',
    textLight: 'text-rose-700',
    borderLight: 'border-rose-200',
    bgDark: 'dark:bg-rose-950/50',
    textDark: 'dark:text-rose-300',
    borderDark: 'dark:border-rose-800'
  },
  { 
    name: 'Draft', 
    color: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    textLight: 'text-amber-700',
    borderLight: 'border-amber-200',
    bgDark: 'dark:bg-amber-950/50',
    textDark: 'dark:text-amber-300',
    borderDark: 'dark:border-amber-800'
  },
  { 
    name: 'In Review', 
    color: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textLight: 'text-blue-700',
    borderLight: 'border-blue-200',
    bgDark: 'dark:bg-blue-950/50',
    textDark: 'dark:text-blue-300',
    borderDark: 'dark:border-blue-800'
  },
  { 
    name: 'Archived', 
    color: 'bg-slate-400',
    bgLight: 'bg-slate-100',
    textLight: 'text-slate-700',
    borderLight: 'border-slate-300',
    bgDark: 'dark:bg-slate-800/80',
    textDark: 'dark:text-slate-300',
    borderDark: 'dark:border-slate-700'
  },
  { 
    name: 'MoRTH-Compliant', 
    color: 'bg-cyan-500',
    bgLight: 'bg-cyan-50',
    textLight: 'text-cyan-700',
    borderLight: 'border-cyan-200',
    bgDark: 'dark:bg-cyan-950/50',
    textDark: 'dark:text-cyan-300',
    borderDark: 'dark:border-cyan-800'
  },
];

export function getTagStyle(tagName: string) {
  const matched = PRESET_TAGS.find(p => p.name.toLowerCase() === tagName.toLowerCase());
  if (matched) return matched;
  return {
    name: tagName,
    color: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    textLight: 'text-indigo-700',
    borderLight: 'border-indigo-200',
    bgDark: 'dark:bg-indigo-950/50',
    textDark: 'dark:text-indigo-300',
    borderDark: 'dark:border-indigo-800'
  };
}

interface TagModalProps {
  files: FileItem[];
  onClose: () => void;
  onSaveTags: (files: FileItem[], tags: string[]) => void;
}

export const TagModal: React.FC<TagModalProps> = ({
  files,
  onClose,
  onSaveTags,
}) => {
  // If editing multiple files, initial tags can be union or intersection
  const initialTags = React.useMemo(() => {
    if (files.length === 0) return [];
    if (files.length === 1) return files[0].tags || [];
    // For multiple files, start with common tags or all unique tags
    const allTags = new Set<string>();
    for (const f of files) {
      (f.tags || []).forEach(t => allTags.add(t));
    }
    return Array.from(allTags);
  }, [files]);

  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTagInput, setNewTagInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isMulti = files.length > 1;

  const handleToggleTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;

    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      // Remove
      setTags(tags.filter(t => t.toLowerCase() !== trimmed.toLowerCase()));
    } else {
      // Add
      setTags([...tags, trimmed]);
    }
    setErrorMsg('');
  };

  const handleAddNewTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    if (trimmed.length > 30) {
      setErrorMsg('Tag name cannot exceed 30 characters');
      return;
    }

    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`Tag "${trimmed}" is already added`);
      return;
    }

    setTags([...tags, trimmed]);
    setNewTagInput('');
    setErrorMsg('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = () => {
    onSaveTags(files, tags);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e2430] border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-xs flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-100 dark:bg-[#151922] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {isMulti ? `Manage Tags (${files.length} Files Selected)` : 'Manage File Metadata Tags'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                {isMulti ? `Applying tags to ${files.length} selected items` : files[0]?.name}
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

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Quick Preset Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Standard Status &amp; Project Presets
              </span>
              <span className="text-[10px] text-slate-400">Click to toggle</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((preset) => {
                const isSelected = tags.some(t => t.toLowerCase() === preset.name.toLowerCase());
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleToggleTag(preset.name)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${preset.bgLight} ${preset.textLight} ${preset.borderLight} ${preset.bgDark} ${preset.textDark} ${preset.borderDark} ring-2 ring-blue-500/20 shadow-xs font-semibold`
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${preset.color}`} />
                    <span>{preset.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Add Custom Tag
            </label>
            <form onSubmit={handleAddNewTag} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. NH48_Bridge, Phase-2, RA-Bill-24..."
                  value={newTagInput}
                  onChange={(e) => {
                    setNewTagInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#161a22] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 text-xs outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
            {errorMsg && (
              <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                {errorMsg}
              </p>
            )}
          </div>

          {/* Current Assigned Tags */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Assigned Tags ({tags.length})
              </span>
              {tags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTags([])}
                  className="text-[10px] text-red-600 dark:text-red-400 hover:underline"
                >
                  Remove All
                </button>
              )}
            </div>

            {tags.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center text-slate-400 dark:text-slate-500">
                <Tag className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <p className="text-[11px]">No tags assigned yet. Select a preset above or type a custom tag.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const style = getTagStyle(t);
                  return (
                    <span
                      key={t}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${style.bgLight} ${style.textLight} ${style.borderLight} ${style.bgDark} ${style.textDark} ${style.borderDark}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.color}`} />
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:opacity-75 p-0.5 rounded transition-opacity"
                        title="Remove tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-100 dark:bg-[#151922] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Tags are instantly searchable &amp; filterable in the FilterBar
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isMulti ? `Apply to ${files.length} Files` : 'Save Tags'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
