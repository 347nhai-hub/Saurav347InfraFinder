export type FileCategory = 'all' | 'pdf' | 'excel' | 'word' | 'ppt' | 'cad' | 'images' | 'other' | 'folder';

export type DateFilterOption =
  | 'any'
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | '3months'
  | '6months'
  | '1year'
  | 'custom';

export type DateTarget = 'modified' | 'created';

export type SortByField = 'relevance' | 'name' | 'modified' | 'created' | 'size' | 'type';
export type SortDirection = 'asc' | 'desc';

export type ViewMode = 'details' | 'list' | 'icons';

export interface FileItem {
  id: string;
  name: string;
  extension: string; // e.g., 'pdf', 'xlsx', 'dwg'
  path: string; // e.g., 'D:\\NH48_Project\\03_Billing\\IPC_24.xlsx'
  parentPath: string; // e.g., 'D:\\NH48_Project\\03_Billing'
  category: FileCategory;
  size: number; // bytes
  createdDate: string; // ISO string
  modifiedDate: string; // ISO string
  isFolder: boolean;
  contentSnippet?: string; // matched text snippet
  contentFull?: string; // full text for search & preview
  thumbnailUrl?: string; // image thumbnail data URL for in-app viewing
  imageDimensions?: { width: number; height: number };
  tags?: string[];
  metadata?: Record<string, string | number>;
  isPinned?: boolean;
  isLocalImported?: boolean;
  itemCount?: number; // for folders
  // Engineering Highway Metadata
  chainageStart?: number; // In meters, e.g. 12500 for CH 12+500
  chainageEnd?: number; // In meters, e.g. 14000 for CH 14+000
  chainageDisplay?: string; // e.g. "CH 12+500 to 14+000"
  revision?: string; // e.g. "Rev-02", "v3", "Rev-C"
  baseDrawingName?: string; // Normalised name for version grouping
  isSuperseded?: boolean; // When newer revision exists
  fileHash?: string; // MD5/SHA256 for duplicate detection
  documentType?: 'Drawing' | 'Invoice/IPC' | 'Quality/Lab Test' | 'Site Memo' | 'Progress Report' | 'Contract' | 'General';
}

export interface SearchFilters {
  query: string;
  category: FileCategory;
  dateRange: DateFilterOption;
  dateTarget: DateTarget;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string; // YYYY-MM-DD
  locationPath?: string; // current active folder or root
  sortBy: SortByField;
  sortDirection: SortDirection;
  selectedTag?: string; // filter by custom tag (e.g. 'Approved', 'Urgent', 'Draft')
  matchAllWords?: boolean; // When searching multiple words: true requires ALL words to match (AND logic)
  chainageQuery?: string; // Highway chainage query e.g. "CH 12+500" or "CH 10+000 to 15+000"
  hideSuperseded?: boolean; // Hide superseded versions (Version Tracking)
  fuzzySearchEnabled?: boolean; // Fuzzy typo tolerance & abbreviations (e.g. ROW, ROB, RE wall)
  smartCollection?: string; // 'all' | 'approved_30d' | 'urgent_quality' | 'cad_drawings' | 'billing_ipc' | 'duplicates'
}

export interface SearchResult {
  file: FileItem;
  score: number;
  snippet?: string;
  matchType?: 'filename' | 'content' | 'path' | 'tag' | 'metadata';
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  category?: FileCategory;
  timestamp: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  category: FileCategory;
  dateRange: DateFilterOption;
  dateTarget: DateTarget;
  customStartDate?: string;
  customEndDate?: string;
  createdAt: string;
}

export interface IndexedLocation {
  id: string;
  path: string;
  name: string;
  drive: string;
  fileCount: number;
  isIncluded: boolean;
}

export interface DriveInfo {
  letter: string; // 'C:', 'D:', 'E:'
  label: string;
  totalBytes: number;
  usedBytes: number;
  type: 'System SSD' | 'Engineering Drive' | 'Project Archive' | 'External Drive';
}

export interface ContextMenuState {
  x: number;
  y: number;
  item?: FileItem; // item if right clicked on item, undefined if background
  items?: FileItem[]; // all selected items if multi-selection
  isBackground?: boolean;
}

export type BatchRenameMode = 'prefix_suffix' | 'replace' | 'numbering' | 'case';

export interface BatchRenameConfig {
  mode: BatchRenameMode;
  prefix: string;
  suffix: string;
  findText: string;
  replaceText: string;
  matchCase: boolean;
  numberingBase: string;
  numberingStart: number;
  numberingDigits: number; // e.g. 1 (1,2), 2 (01,02), 3 (001,002)
  numberingPosition: 'suffix' | 'prefix' | 'replace';
  caseConversion: 'none' | 'uppercase' | 'lowercase' | 'titlecase' | 'sentencecase';
  keepExtension: boolean;
}

export interface ClipboardState {
  items: FileItem[];
  operation: 'copy' | 'cut' | null;
}

export type DragDropOperation = 'copy' | 'move';
