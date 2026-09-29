import React, { useState, useMemo } from 'react';
import { 
  Edit3, 
  X, 
  Check, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  Hash, 
  Replace, 
  CaseSensitive, 
  Plus, 
  SlidersHorizontal,
  FileText,
  Folder
} from 'lucide-react';
import { FileItem, BatchRenameConfig, BatchRenameMode } from '../types';

interface BatchRenameModalProps {
  selectedItems: FileItem[];
  onClose: () => void;
  onApply: (renamedList: Array<{ item: FileItem; newName: string; newPath: string }>) => Promise<void>;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  selectedItems,
  onClose,
  onApply,
}) => {
  const [config, setConfig] = useState<BatchRenameConfig>({
    mode: 'prefix_suffix',
    prefix: '',
    suffix: '',
    findText: '',
    replaceText: '',
    matchCase: false,
    numberingBase: '',
    numberingStart: 1,
    numberingDigits: 3,
    numberingPosition: 'suffix',
    caseConversion: 'none',
    keepExtension: true,
  });

  const [isApplying, setIsApplying] = useState(false);

  // Quick preset helper
  const handleSetPrefix = (p: string) => {
    setConfig((prev) => ({ ...prev, prefix: p }));
  };

  // Convert case helper
  const transformCase = (str: string, mode: BatchRenameConfig['caseConversion']) => {
    if (mode === 'uppercase') return str.toUpperCase();
    if (mode === 'lowercase') return str.toLowerCase();
    if (mode === 'titlecase') {
      return str.replace(/\b\w+/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    }
    if (mode === 'sentencecase') {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    return str;
  };

  // Compute preview for all selected items
  const previewItems = useMemo(() => {
    return selectedItems.map((item, index) => {
      const isFolder = item.isFolder;
      let baseName = item.name;
      let ext = '';

      if (!isFolder && item.name.includes('.')) {
        const lastDot = item.name.lastIndexOf('.');
        baseName = item.name.substring(0, lastDot);
        ext = item.name.substring(lastDot); // includes dot e.g. '.xlsx'
      }

      let newBaseName = baseName;

      // Apply mode transformation
      if (config.mode === 'prefix_suffix') {
        newBaseName = `${config.prefix}${baseName}${config.suffix}`;
      } else if (config.mode === 'replace') {
        if (config.findText) {
          try {
            const flags = config.matchCase ? 'g' : 'gi';
            const escaped = config.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            newBaseName = baseName.replace(new RegExp(escaped, flags), config.replaceText);
          } catch {
            newBaseName = baseName;
          }
        }
      } else if (config.mode === 'numbering') {
        const numStr = String(config.numberingStart + index).padStart(config.numberingDigits, '0');
        const customBase = config.numberingBase.trim() || baseName;
        if (config.numberingPosition === 'replace') {
          newBaseName = `${customBase}_${numStr}`;
        } else if (config.numberingPosition === 'prefix') {
          newBaseName = `${numStr}_${customBase}`;
        } else {
          newBaseName = `${customBase}_${numStr}`;
        }
      } else if (config.mode === 'case') {
        newBaseName = transformCase(baseName, config.caseConversion);
      }

      // Check if case conversion is also combined
      if (config.mode !== 'case' && config.caseConversion !== 'none') {
        newBaseName = transformCase(newBaseName, config.caseConversion);
      }

      const finalNewName = isFolder ? newBaseName : `${newBaseName}${ext}`;
      const isChanged = finalNewName !== item.name;

      // Check validity
      const hasIllegalChars = /[\\/:*?"<>|]/.test(newBaseName);
      const isEmpty = !newBaseName.trim();
      const isValid = !hasIllegalChars && !isEmpty;

      // Construct new full path
      const parent = item.parentPath || item.path.substring(0, item.path.lastIndexOf('\\'));
      const newPath = `${parent}\\${finalNewName}`;

      return {
        item,
        originalName: item.name,
        newName: finalNewName,
        newPath,
        isChanged,
        isValid,
        errorMessage: hasIllegalChars ? 'Illegal character in name (\\ / : * ? " < > |)' : isEmpty ? 'Name cannot be empty' : undefined,
      };
    });
  }, [selectedItems, config]);

  const changedCount = previewItems.filter((p) => p.isChanged).length;
  const invalidCount = previewItems.filter((p) => !p.isValid).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidCount > 0 || changedCount === 0 || isApplying) return;

    try {
      setIsApplying(true);
      const toUpdate = previewItems
        .filter((p) => p.isChanged && p.isValid)
        .map((p) => ({
          item: p.item,
          newName: p.newName,
          newPath: p.newPath,
        }));
      await onApply(toUpdate);
      onClose();
    } catch (err) {
      console.error('Batch rename failed:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a212d] border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span>Batch Rename ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})</span>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                  Pattern Engine
                </span>
              </h2>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Apply prefix, suffix, text replacement, or numbering sequences to selected documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Mode Selector Tabs */}
          <div className="px-6 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, mode: 'prefix_suffix' }))}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  config.mode === 'prefix_suffix'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Prefix &amp; Suffix</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, mode: 'replace' }))}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  config.mode === 'replace'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Replace className="w-3.5 h-3.5" />
                <span>Find &amp; Replace</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, mode: 'numbering' }))}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  config.mode === 'numbering'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Sequential Numbering</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, mode: 'case' }))}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  config.mode === 'case'
                    ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CaseSensitive className="w-3.5 h-3.5" />
                <span>Change Case</span>
              </button>
            </div>
          </div>

          {/* Mode Controls */}
          <div className="p-6 pb-4 space-y-4 shrink-0 border-b border-slate-200 dark:border-slate-800">
            {/* 1. Prefix & Suffix Mode */}
            {config.mode === 'prefix_suffix' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Prefix to add (at beginning):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={config.prefix}
                        onChange={(e) => setConfig((c) => ({ ...c, prefix: e.target.value }))}
                        placeholder="e.g. NH48_ or IPC_24_"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      {config.prefix && (
                        <button
                          type="button"
                          onClick={() => setConfig((c) => ({ ...c, prefix: '' }))}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Suffix to add (before file extension):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={config.suffix}
                        onChange={(e) => setConfig((c) => ({ ...c, suffix: e.target.value }))}
                        placeholder="e.g. _v2 or _Final or _Approved"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      {config.suffix && (
                        <button
                          type="button"
                          onClick={() => setConfig((c) => ({ ...c, suffix: '' }))}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Highway / Engineering Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Presets:</span>
                  {['NH48_', 'FINAL_', 'APPROVED_', '2024_', 'BOQ_'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSetPrefix(tag)}
                      className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono text-[11px] transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                  {['_Final', '_v1', '_Signed', '_RevA'].map((suf) => (
                    <button
                      key={suf}
                      type="button"
                      onClick={() => setConfig((c) => ({ ...c, suffix: suf }))}
                      className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-mono text-[11px] transition-colors"
                    >
                      +{suf}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Find and Replace Mode */}
            {config.mode === 'replace' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Find text:
                    </label>
                    <input
                      type="text"
                      value={config.findText}
                      onChange={(e) => setConfig((c) => ({ ...c, findText: e.target.value }))}
                      placeholder="Text to replace..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Replace with:
                    </label>
                    <input
                      type="text"
                      value={config.replaceText}
                      onChange={(e) => setConfig((c) => ({ ...c, replaceText: e.target.value }))}
                      placeholder="Replacement text (can be empty to remove)..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.matchCase}
                      onChange={(e) => setConfig((c) => ({ ...c, matchCase: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Match Case</span>
                  </label>
                </div>
              </div>
            )}

            {/* 3. Numbering Sequence Mode */}
            {config.mode === 'numbering' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Base name:
                    </label>
                    <input
                      type="text"
                      value={config.numberingBase}
                      onChange={(e) => setConfig((c) => ({ ...c, numberingBase: e.target.value }))}
                      placeholder="Leave blank to keep original name"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Start Number:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={config.numberingStart}
                      onChange={(e) => setConfig((c) => ({ ...c, numberingStart: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Number Padding:
                    </label>
                    <select
                      value={config.numberingDigits}
                      onChange={(e) => setConfig((c) => ({ ...c, numberingDigits: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1, 2, 3 (No padding)</option>
                      <option value={2}>01, 02, 03 (2 digits)</option>
                      <option value={3}>001, 002, 003 (3 digits)</option>
                      <option value={4}>0001, 0002, 0003 (4 digits)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Position:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="numberingPos"
                      checked={config.numberingPosition === 'suffix'}
                      onChange={() => setConfig((c) => ({ ...c, numberingPosition: 'suffix' }))}
                      className="text-blue-600"
                    />
                    <span>Append to end ({'{name}_001'})</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="numberingPos"
                      checked={config.numberingPosition === 'prefix'}
                      onChange={() => setConfig((c) => ({ ...c, numberingPosition: 'prefix' }))}
                      className="text-blue-600"
                    />
                    <span>Prepend to start ({'001_{name}'})</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="numberingPos"
                      checked={config.numberingPosition === 'replace'}
                      onChange={() => setConfig((c) => ({ ...c, numberingPosition: 'replace' }))}
                      className="text-blue-600"
                    />
                    <span>Replace name entirely</span>
                  </label>
                </div>
              </div>
            )}

            {/* 4. Change Case Mode */}
            {config.mode === 'case' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Case Format:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'uppercase', label: 'UPPERCASE', example: 'DOCUMENT_NAME' },
                    { id: 'lowercase', label: 'lowercase', example: 'document_name' },
                    { id: 'titlecase', label: 'Title Case', example: 'Document Name' },
                    { id: 'sentencecase', label: 'Sentence case', example: 'Document name' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConfig((c) => ({ ...c, caseConversion: opt.id as any }))}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        config.caseConversion === opt.id
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{opt.example}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Preview List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 px-2 pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Live Preview ({previewItems.length} items)</span>
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {changedCount} will be renamed
                </span>
                {invalidCount > 0 && (
                  <span className="text-red-500 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {invalidCount} invalid
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#1a212d]">
              {previewItems.map((p, idx) => (
                <div
                  key={p.item.id}
                  className={`px-3 py-2 flex items-center gap-3 text-xs ${
                    !p.isValid
                      ? 'bg-red-50/70 dark:bg-red-950/30'
                      : p.isChanged
                      ? 'bg-blue-50/40 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="text-slate-400 text-[10px] w-6 shrink-0 font-mono text-right">
                    {idx + 1}.
                  </span>

                  {p.item.isFolder ? (
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  )}

                  {/* Original Name */}
                  <span className="truncate flex-1 font-mono text-[11px] text-slate-500 dark:text-slate-400" title={p.originalName}>
                    {p.originalName}
                  </span>

                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${p.isChanged ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`} />

                  {/* New Name */}
                  <span
                    className={`truncate flex-1 font-mono text-[11px] font-medium ${
                      !p.isValid
                        ? 'text-red-600 dark:text-red-400'
                        : p.isChanged
                        ? 'text-blue-700 dark:text-blue-300 font-bold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                    title={p.newName}
                  >
                    {p.newName}
                  </span>

                  {/* Status Indicator */}
                  <div className="w-20 shrink-0 text-right">
                    {!p.isValid ? (
                      <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded font-semibold">
                        Error
                      </span>
                    ) : p.isChanged ? (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium flex items-center justify-end gap-1">
                        <Check className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Unchanged</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-[#151922] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>{changedCount} of {selectedItems.length} files selected for rename</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changedCount === 0 || invalidCount > 0 || isApplying}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                {isApplying ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Renaming...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Apply Batch Rename ({changedCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
