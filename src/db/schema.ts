/**
 * InfraFinder Database Schema & FTS5 Search Index
 * SQLite with FTS5 inverted indexing, custom engineering tags, and Smart Collection AST evaluator.
 */

export type DocumentCategory = 'Invoice' | 'Lab Test' | 'Site Memo' | 'DPR' | 'Drawing' | 'General';
export type ApprovalStatus = 'Draft' | 'Under Review' | 'Approved' | 'As-Built' | 'Superseded' | 'Rejected';
export type EngineeringDepartment = 'Highway' | 'Structure' | 'Geotech' | 'Survey' | 'Quality' | 'Safety' | 'Commercial';

export interface EngineeringMetadata {
  status: ApprovalStatus;
  packageCode: string; // e.g. "PKG-01", "PKG-02"
  department: EngineeringDepartment;
  chainageStartM?: number; // In meters (e.g. 12500 for CH 12+500)
  chainageEndM?: number;   // In meters (e.g. 14000 for CH 14+000)
  revisionTag?: string;    // e.g. "Rev-A", "v2", "Final"
  isSuperseded?: boolean;
  parentId?: string;       // ID of master/latest drawing if superseded
}

export interface IndexedDocumentRecord extends EngineeringMetadata {
  id: string;
  name: string;
  path: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: number; // Unix timestamp ms
  createdAt: number;
  hashSha256?: string;
  hashMd5?: string;
  category: DocumentCategory;
  extractedText?: string;
  tags: string[];
}

export interface SmartCollectionRule {
  field: 'status' | 'department' | 'packageCode' | 'category' | 'extension' | 'modifiedDays' | 'chainage';
  operator: '==' | '!=' | 'contains' | 'in' | '<=' | '>=';
  value: string | number | string[];
}

export interface SmartCollection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  ruleExpression: string; // e.g. "status == 'Approved' && dept == 'Structure' && modifiedDays <= 30"
  rules?: SmartCollectionRule[]; // parsed structured form
}

/**
 * SQLite DDL statements for SQLite + FTS5
 */
export const SQLITE_SCHEMA = `
-- Main File Index Table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  extension TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  modified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  hash_sha256 TEXT,
  hash_md5 TEXT,
  category TEXT DEFAULT 'General',
  department TEXT,
  package_code TEXT,
  status TEXT DEFAULT 'Draft',
  revision_tag TEXT,
  is_superseded INTEGER DEFAULT 0,
  parent_id TEXT,
  chainage_start_m INTEGER,
  chainage_end_m INTEGER,
  tags TEXT,
  FOREIGN KEY(parent_id) REFERENCES files(id) ON DELETE SET NULL
);

-- SQLite FTS5 Virtual Table for Ultra-Fast Sub-millisecond Document & Metadata Search
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  id UNINDEXED,
  name,
  path,
  content,
  tags,
  tokenize = 'porter unicode61'
);

-- Triggers for Automatic Synchronous Index Synchronization
CREATE TRIGGER IF NOT EXISTS trg_files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(id, name, path, content, tags)
  VALUES (new.id, new.name, new.path, COALESCE(new.category, '') || ' ' || COALESCE(new.package_code, '') || ' ' || COALESCE(new.department, ''), new.tags);
END;

CREATE TRIGGER IF NOT EXISTS trg_files_ad AFTER DELETE ON files BEGIN
  DELETE FROM files_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_files_au AFTER UPDATE ON files BEGIN
  DELETE FROM files_fts WHERE id = old.id;
  INSERT INTO files_fts(id, name, path, content, tags)
  VALUES (new.id, new.name, new.path, COALESCE(new.category, '') || ' ' || COALESCE(new.package_code, '') || ' ' || COALESCE(new.department, ''), new.tags);
END;

-- Indexes for Fast Relational & Chainage Filtering
CREATE INDEX IF NOT EXISTS idx_files_chainage ON files (chainage_start_m, chainage_end_m);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files (hash_sha256);
CREATE INDEX IF NOT EXISTS idx_files_dept_pkg ON files (department, package_code, status);
`;

/**
 * Builds an SQLite FTS5 search query with BM25 ranking and chainage bounds
 */
export function buildFtsQuery(searchTerm: string, chainageFilter?: { startM: number; endM: number }) {
  const sanitized = searchTerm.trim().replace(/['"]/g, '');
  const ftsMatch = sanitized ? `"${sanitized}"*` : '*';

  let sql = `
    SELECT f.*, bm25(files_fts) as rank
    FROM files_fts
    JOIN files f ON f.id = files_fts.id
    WHERE files_fts MATCH ?
  `;
  const params: (string | number)[] = [ftsMatch];

  if (chainageFilter) {
    sql += ` AND (f.chainage_start_m <= ? AND f.chainage_end_m >= ?)`;
    params.push(chainageFilter.endM, chainageFilter.startM);
  }

  sql += ` ORDER BY rank ASC LIMIT 100;`;
  return { sql, params };
}

/**
 * Dynamic Query Evaluator for Smart Collections.
 * Evaluates rule expressions like:
 * "status == 'Approved' && dept == 'Structure' && modifiedDays <= 30"
 */
export function evaluateSmartCollectionRule(
  item: IndexedDocumentRecord,
  ruleExpression: string,
  nowTimestamp: number = Date.now()
): boolean {
  if (!ruleExpression || !ruleExpression.trim()) return true;

  // Safe evaluation context mapping
  const daysOld = Math.floor((nowTimestamp - item.modifiedAt) / (1000 * 60 * 60 * 24));
  const context: Record<string, any> = {
    status: item.status,
    dept: item.department,
    department: item.department,
    package: item.packageCode,
    packageCode: item.packageCode,
    category: item.category,
    ext: item.extension.toLowerCase(),
    extension: item.extension.toLowerCase(),
    modifiedDays: daysOld,
    isSuperseded: !!item.isSuperseded,
    tags: item.tags || [],
  };

  // Convert custom rule expression into safe predicate tokens
  try {
    // Normalizes shorthand (e.g. status == 'Approved')
    const expressionCleaned = ruleExpression
      .replace(/\bdept\b/g, 'department')
      .replace(/\bpackage\b/g, 'packageCode')
      .replace(/\bext\b/g, 'extension');

    // Parse clauses joined by && / ||
    const orClauses = expressionCleaned.split(/\s*\|\|\s*/);
    
    return orClauses.some((orClause) => {
      const andClauses = orClause.split(/\s*&&\s*/);
      return andClauses.every((clause) => {
        const match = clause.trim().match(/^([a-zA-Z0-9_]+)\s*(==|!=|<=|>=|<|>|contains|in)\s*(.+)$/);
        if (!match) return false;

        const [, field, op, rawVal] = match;
        const fieldValue = context[field];
        const targetValue = rawVal.replace(/^['"]|['"]$/g, '').trim();

        switch (op) {
          case '==':
            return String(fieldValue).toLowerCase() === targetValue.toLowerCase();
          case '!=':
            return String(fieldValue).toLowerCase() !== targetValue.toLowerCase();
          case '<=':
            return Number(fieldValue) <= Number(targetValue);
          case '>=':
            return Number(fieldValue) >= Number(targetValue);
          case '<':
            return Number(fieldValue) < Number(targetValue);
          case '>':
            return Number(fieldValue) > Number(targetValue);
          case 'contains':
            if (Array.isArray(fieldValue)) {
              return fieldValue.some((t: string) => t.toLowerCase() === targetValue.toLowerCase());
            }
            return String(fieldValue).toLowerCase().includes(targetValue.toLowerCase());
          case 'in': {
            const list = targetValue.replace(/[\[\]]/g, '').split(',').map((v) => v.trim().toLowerCase());
            return list.includes(String(fieldValue).toLowerCase());
          }
          default:
            return false;
        }
      });
    });
  } catch {
    return false;
  }
}
