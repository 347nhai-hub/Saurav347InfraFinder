import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  X, 
  BookmarkPlus, 
  Filter,
  Check,
  Tag,
  Hash
} from 'lucide-react';
import { DateFilterOption, DateTarget, FileCategory, SearchFilters } from '../types';

interface FilterBarProps {
  filters: SearchFilters;
  onUpdateFilters: (partial: Partial<SearchFilters>) => void;
  onResetFilters: () => void;
  onSaveSearchClick: () => void;
  categoryCounts: Record<FileCategory, number>;
  tagCounts?: Record<string, number>;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onUpdateFilters,
  onResetFilters,
  onSaveSearchClick,
  categoryCounts,
  tagCounts = {},
}) => {
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showCustomRangeModal, setShowCustomRangeModal] = useState(false);
  const [customStart, setCustomStart] = useState(filters.customStartDate || '');
  const [customEnd, setCustomEnd] = useState(filters.customEndDate || '');

  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setShowDateDropdown(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const categories: { key: FileCategory; label: string; extLabel: string }[] = [
    { key: 'all', label: 'ALL', extLabel: 'All types' },
    { key: 'pdf', label: 'PDF', extLabel: '.pdf' },
    { key: 'excel', label: 'EXCEL', extLabel: '.xlsx, .csv' },
    { key: 'word', label: 'WORD', extLabel: '.docx, .doc' },
    { key: 'ppt', label: 'PPT', extLabel: '.pptx' },
    { key: 'cad', label: 'CAD', extLabel: '.dwg, .dxf' },
    { key: 'images', label: 'IMAGES', extLabel: '.jpg, .png' },
    { key: 'other', label: 'OTHER', extLabel: 'text, other' },
  ];

  const dateOptions: { key: DateFilterOption; label: string }[] = [
    { key: 'any', label: 'Any Date' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7days', label: 'Last 7 Days' },
    { key: '30days', label: 'Last 30 Days' },
    { key: '3months', label: 'Last 3 Months' },
    { key: '6months', label: 'Last 6 Months' },
    { key: '1year', label: 'Last 1 Year' },
    { key: 'custom', label: 'Custom Range...' },
  ];

  // Standard preset tags + any discovered custom tags
  const standardTags = ['Approved', 'Urgent', 'Draft', 'In Review', 'Archived'];
  const allDiscoveredTags = Array.from(new Set([...standardTags, ...Object.keys(tagCounts)]));

  const getTagDot = (tagName: string) => {
    const lower = tagName.toLowerCase();
    if (lower === 'approved') return 'bg-emerald-500';
    if (lower === 'urgent') return 'bg-rose-500';
    if (lower === 'draft') return 'bg-amber-500';
    if (lower === 'in review') return 'bg-blue-500';
    if (lower === 'archived') return 'bg-slate-400';
    return 'bg-indigo-500';
  };

  const getDateLabel = (opt: DateFilterOption) => {
    if (opt === 'custom' && filters.customStartDate && filters.customEndDate) {
      return `${filters.customStartDate} to ${filters.customEndDate}`;
    }
    return dateOptions.find(d => d.key === opt)?.label || 'Any Date';
  };

  const handleApplyCustomRange = () => {
    onUpdateFilters({
      dateRange: 'custom',
      customStartDate: customStart,
      customEndDate: customEnd,
    });
    setShowCustomRangeModal(false);
  };

  // Check if any filters are active
  const hasActiveFilters =
    Boolean(filters.query.trim()) ||
    filters.category !== 'all' ||
    filters.dateRange !== 'any' ||
    Boolean(filters.selectedTag) ||
    (Boolean(filters.locationPath) && !['C:', 'D:', 'E:'].includes(filters.locationPath || ''));

  return (
    <div className="bg-[#f8fafc] dark:bg-[#181d26] border-b border-[#e2e8f0] dark:border-[#2b3545] px-3 py-2 space-y-2">
      {/* Row 1: File Type Segmented Controls & Date Filter & Save Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* One-click File Category Buttons */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 dark:bg-[#1f2633] rounded-md overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isActive = filters.category === cat.key;
            const count = categoryCounts[cat.key] || 0;

            return (
              <button
                key={cat.key}
                onClick={() => onUpdateFilters({ category: cat.key })}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
                }`}
                title={cat.extLabel}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono font-tabular ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Date Filter Controls & Save Search */}
        <div className="flex items-center gap-2">
          {/* Date Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className={`h-8 px-2.5 text-xs font-medium border rounded-md flex items-center gap-1.5 transition-colors ${
                filters.dateRange !== 'any'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-[#1e2430] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{getDateLabel(filters.dateRange)}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 space-y-2 text-xs">
                {/* Date target switch: Modified Date vs Created Date */}
                <div className="p-1 bg-slate-100 dark:bg-[#141822] rounded flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 px-1 font-medium">Apply to:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateFilters({ dateTarget: 'modified' })}
                      className={`px-2 py-0.5 rounded font-medium ${
                        filters.dateTarget === 'modified'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Modified Date
                    </button>
                    <button
                      onClick={() => onUpdateFilters({ dateTarget: 'created' })}
                      className={`px-2 py-0.5 rounded font-medium ${
                        filters.dateTarget === 'created'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Created Date
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setShowDateDropdown(false);
                        if (opt.key === 'custom') {
                          setShowCustomRangeModal(true);
                        } else {
                          onUpdateFilters({ dateRange: opt.key });
                        }
                      }}
                      className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between rounded hover:bg-blue-50 dark:hover:bg-blue-900/40 ${
                        filters.dateRange === opt.key
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {filters.dateRange === opt.key && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tag Filter Dropdown */}
          <div className="relative" ref={tagDropdownRef}>
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className={`h-8 px-2.5 text-xs font-medium border rounded-md flex items-center gap-1.5 transition-colors ${
                filters.selectedTag
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                  : 'bg-white dark:bg-[#1e2430] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
              }`}
              title="Filter files by custom status or project tag"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              <span>{filters.selectedTag ? `Tag: ${filters.selectedTag}` : 'All Tags'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showTagDropdown && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-[#1e2430] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 space-y-1 text-xs max-h-72 overflow-y-auto">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Filter by Metadata Tag</span>
                  {filters.selectedTag && (
                    <button
                      onClick={() => {
                        onUpdateFilters({ selectedTag: undefined });
                        setShowTagDropdown(false);
                      }}
                      className="text-red-500 hover:underline normal-case text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    onUpdateFilters({ selectedTag: undefined });
                    setShowTagDropdown(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    !filters.selectedTag ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/40' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>All Tags (No Filter)</span>
                  </div>
                  {!filters.selectedTag && <Check className="w-3.5 h-3.5" />}
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                {allDiscoveredTags.map((tagName) => {
                  const isSelected = filters.selectedTag?.toLowerCase() === tagName.toLowerCase();
                  const count = tagCounts[tagName] || 0;
                  return (
                    <button
                      key={tagName}
                      onClick={() => {
                        onUpdateFilters({ selectedTag: tagName });
                        setShowTagDropdown(false);
                      }}
                      className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getTagDot(tagName)}`} />
                        <span>{tagName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <span className="text-[10px] font-mono font-tabular text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {count}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Multi-Word Keyword Match Option Toggle */}
          <button
            onClick={() => onUpdateFilters({ matchAllWords: filters.matchAllWords === false ? true : false })}
            className={`h-8 px-2.5 text-xs font-medium border rounded-md flex items-center gap-1.5 transition-colors ${
              filters.matchAllWords !== false
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                : 'bg-white dark:bg-[#1e2430] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
            }`}
            title={
              filters.matchAllWords !== false
                ? 'Match ALL Words (AND Mode): Only files containing every single typed word will appear in search results.'
                : 'Match ANY Word (OR Mode): Files containing at least one searched word will appear.'
            }
          >
            {filters.matchAllWords !== false ? (
              <>
                <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Match ALL Words</span>
              </>
            ) : (
              <>
                <Hash className="w-3 h-3 text-slate-400" />
                <span>Match ANY Word</span>
              </>
            )}
          </button>

          {/* Save Search Button */}
          <button
            onClick={onSaveSearchClick}
            className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1e2430] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md flex items-center gap-1.5 transition-colors"
            title="Save current search and filters for quick access"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Save Search</span>
          </button>
        </div>
      </div>

      {/* Row 2: Quick Status & Project Tag Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs py-0.5">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-0.5 shrink-0">
          <Tag className="w-3 h-3 text-indigo-500" />
          Tags:
        </span>
        <button
          onClick={() => onUpdateFilters({ selectedTag: undefined })}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
            !filters.selectedTag
              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold'
              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          All
        </button>
        {allDiscoveredTags.slice(0, 8).map((tagName) => {
          const isSelected = filters.selectedTag?.toLowerCase() === tagName.toLowerCase();
          const count = tagCounts[tagName] || 0;
          return (
            <button
              key={tagName}
              onClick={() => onUpdateFilters({ selectedTag: isSelected ? undefined : tagName })}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-2xs'
                  : 'bg-white dark:bg-[#1f2633] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : getTagDot(tagName)}`} />
              <span>{tagName}</span>
              {count > 0 && (
                <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Row 2: Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-blue-500" />
            Active Filters:
          </span>

          {/* Search Query Chip */}
          {filters.query.trim() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-medium">
              <span>"{filters.query}"</span>
              <button
                onClick={() => onUpdateFilters({ query: '' })}
                className="hover:text-blue-950 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* File Category Chip */}
          {filters.category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-medium uppercase">
              <span>Type: {filters.category}</span>
              <button
                onClick={() => onUpdateFilters({ category: 'all' })}
                className="hover:text-purple-950 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Date Range Chip */}
          {filters.dateRange !== 'any' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-medium">
              <span>
                {filters.dateTarget === 'modified' ? 'Modified' : 'Created'}: {getDateLabel(filters.dateRange)}
              </span>
              <button
                onClick={() => onUpdateFilters({ dateRange: 'any' })}
                className="hover:text-amber-950 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Tag Filter Chip */}
          {filters.selectedTag && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${getTagDot(filters.selectedTag)}`} />
              <span>Tag: {filters.selectedTag}</span>
              <button
                onClick={() => onUpdateFilters({ selectedTag: undefined })}
                className="hover:text-indigo-950 dark:hover:text-white"
                title="Clear tag filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Multi-Word Mode Chip (if user switched to Broad OR mode) */}
          {filters.matchAllWords === false && Boolean(filters.query.trim()) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-medium">
              <span>Mode: Match ANY Word</span>
              <button
                onClick={() => onUpdateFilters({ matchAllWords: true })}
                className="hover:text-amber-950 dark:hover:text-white"
                title="Switch to Match ALL Words (AND)"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Location Scope Chip */}
          {filters.locationPath && !['C:', 'D:', 'E:'].includes(filters.locationPath) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-medium truncate max-w-xs">
              <span className="truncate">In: {filters.locationPath.split('\\').pop()}</span>
              <button
                onClick={() => onUpdateFilters({ locationPath: undefined })}
                className="hover:text-emerald-950 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Clear All Button */}
          <button
            onClick={onResetFilters}
            className="ml-auto text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline px-1 py-0.5"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Custom Range Dialog */}
      {showCustomRangeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e2430] border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl p-4 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Custom Date Filter
              </h3>
              <button
                onClick={() => setShowCustomRangeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#161a22] rounded text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#161a22] rounded text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <span className="block text-[11px] text-slate-500 mb-1">Target field:</span>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="dateTargetModal"
                      checked={filters.dateTarget === 'modified'}
                      onChange={() => onUpdateFilters({ dateTarget: 'modified' })}
                      className="text-blue-600"
                    />
                    <span>Modified Date</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="dateTargetModal"
                      checked={filters.dateTarget === 'created'}
                      onChange={() => onUpdateFilters({ dateTarget: 'created' })}
                      className="text-blue-600"
                    />
                    <span>Created Date</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowCustomRangeModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustomRange}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
              >
                APPLY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
