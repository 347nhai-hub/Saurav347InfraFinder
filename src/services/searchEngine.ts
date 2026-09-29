import { DateFilterOption, DateTarget, FileCategory, FileItem, SearchFilters, SearchResult, SortByField, SortDirection } from '../types';

interface IndexRecord {
  file: FileItem;
  normName: string;
  normPath: string;
  normTags: string[];
  normContent: string;
  createdTime: number;
  modifiedTime: number;
}

export class FastSearchEngine {
  private records: IndexRecord[] = [];
  private recordsById: Map<string, IndexRecord> = new Map();

  constructor(initialFiles: FileItem[] = []) {
    this.rebuildIndex(initialFiles);
  }

  public rebuildIndex(files: FileItem[]): void {
    this.records = [];
    this.recordsById.clear();
    for (const file of files) {
      const normName = file.name.toLowerCase();
      const normPath = file.path.toLowerCase();
      const normTags = (file.tags || []).map(t => t.toLowerCase());
      const normContent = (file.contentFull || file.contentSnippet || '').toLowerCase();
      const createdTime = new Date(file.createdDate).getTime() || 0;
      const modifiedTime = new Date(file.modifiedDate).getTime() || 0;

      const record: IndexRecord = {
        file,
        normName,
        normPath,
        normTags,
        normContent,
        createdTime,
        modifiedTime,
      };

      this.records.push(record);
      this.recordsById.set(file.id, record);
    }
  }

  public addOrUpdateFile(file: FileItem): void {
    const normName = file.name.toLowerCase();
    const normPath = file.path.toLowerCase();
    const normTags = (file.tags || []).map(t => t.toLowerCase());
    const normContent = (file.contentFull || file.contentSnippet || '').toLowerCase();
    const createdTime = new Date(file.createdDate).getTime() || 0;
    const modifiedTime = new Date(file.modifiedDate).getTime() || 0;

    const record: IndexRecord = {
      file,
      normName,
      normPath,
      normTags,
      normContent,
      createdTime,
      modifiedTime,
    };

    const existing = this.recordsById.get(file.id);
    if (existing) {
      Object.assign(existing, record);
    } else {
      this.records.push(record);
      this.recordsById.set(file.id, record);
    }
  }

  public removeFile(fileId: string): void {
    this.records = this.records.filter(r => r.file.id !== fileId);
    this.recordsById.delete(fileId);
  }

  public getAllFiles(): FileItem[] {
    return this.records.map(r => r.file);
  }

  public getFolderChildren(folderPath: string): FileItem[] {
    const normTarget = folderPath.toLowerCase().replace(/[\\/]+$/, '');
    
    return this.records
      .filter(r => {
        const normParent = r.file.parentPath.toLowerCase().replace(/[\\/]+$/, '');
        return normParent === normTarget;
      })
      .map(r => r.file);
  }

  public search(filters: SearchFilters): {
    results: SearchResult[];
    durationMs: number;
    totalCount: number;
    foldedRevisionCount: number;
    totalRevisionGroupsCount: number;
  } {
    const startTime = performance.now();
    const rawQuery = (filters.query || '').trim();
    const queryLower = rawQuery.toLowerCase();

    // Check for exact quotes
    const exactMatches = Array.from(rawQuery.matchAll(/"([^"]+)"/g)).map(m => m[1].toLowerCase());
    const queryWithoutQuotes = rawQuery.replace(/"([^"]+)"/g, '').trim();
    const tokens = queryWithoutQuotes
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(t => t.length > 0);

    const now = new Date('2026-09-28T04:38:35Z').getTime(); // anchored to current session date

    const filteredRecords: { record: IndexRecord; score: number; snippet?: string; matchType?: SearchResult['matchType'] }[] = [];

    for (const record of this.records) {
      // 1. Category Filter
      if (filters.category !== 'all') {
        if (record.file.category !== filters.category) {
          continue;
        }
      }

      // 2. Date Filter
      if (filters.dateRange !== 'any') {
        const checkTime = filters.dateTarget === 'created' ? record.createdTime : record.modifiedTime;
        if (!this.matchesDateRange(checkTime, filters.dateRange, filters.customStartDate, filters.customEndDate, now)) {
          continue;
        }
      }

      // 3. Folder Location Scope (if specified and not root)
      if (filters.locationPath && filters.locationPath !== 'D:' && filters.locationPath !== 'C:' && filters.locationPath !== 'E:') {
        const normLoc = filters.locationPath.toLowerCase();
        if (!record.normPath.startsWith(normLoc)) {
          continue;
        }
      }

      // 4. Tag Filter
      if (filters.selectedTag && filters.selectedTag !== 'all' && filters.selectedTag.trim()) {
        const targetTag = filters.selectedTag.trim().toLowerCase();
        if (!record.normTags.some(t => t === targetTag)) {
          continue;
        }
      }

      // 5. Query Matching & Scoring
      let score = 0;
      let matchedSnippet: string | undefined;
      let matchType: SearchResult['matchType'] = 'filename';

      if (rawQuery.length === 0) {
        // No search query: keep all matching files with base score
        score = 100;
        filteredRecords.push({ record, score });
        continue;
      }

      // Check exact phrase matches (enclosed in double quotes)
      let hasExactMatch = true;
      for (const phrase of exactMatches) {
        const inName = record.normName.includes(phrase);
        const inContent = record.normContent.includes(phrase);
        const inPath = record.normPath.includes(phrase);
        const inTags = record.normTags.some(t => t.includes(phrase));

        if (!inName && !inContent && !inPath && !inTags) {
          hasExactMatch = false;
          break;
        }

        if (inName) score += 600;
        if (inContent) {
          score += 350;
          matchType = 'content';
          if (!matchedSnippet) {
            matchedSnippet = this.extractSnippet(record.file.contentFull || record.file.contentSnippet || '', phrase);
          }
        }
        if (inPath) score += 100;
        if (inTags) score += 200;
      }

      if (exactMatches.length > 0 && !hasExactMatch) {
        continue;
      }

      // Check tokenized keyboard words
      const metadataStr = Object.values(record.file.metadata || {})
        .join(' ')
        .toLowerCase();

      let tokensMatched = 0;
      for (const token of tokens) {
        let tokenFound = false;

        // 1. Exact or partial file extension match e.g., "pdf", "xlsx", "dwg"
        if (record.file.extension.toLowerCase() === token) {
          score += 250;
          tokenFound = true;
        }

        // 2. Exact or substring filename match
        if (record.normName === token || record.normName.startsWith(token + '.')) {
          score += 1000;
          tokenFound = true;
          matchType = 'filename';
        } else if (record.normName.includes(token)) {
          score += 400;
          tokenFound = true;
          matchType = 'filename';
        }

        // 3. Status and Project Tags
        if (record.normTags.some(tag => tag.includes(token))) {
          score += 250;
          tokenFound = true;
          if (matchType !== 'filename') matchType = 'tag';
        }

        // 4. Metadata values (Chainage, Package, Revision, etc.)
        if (metadataStr.includes(token)) {
          score += 200;
          tokenFound = true;
          if (matchType !== 'filename' && matchType !== 'tag') {
            matchType = 'metadata';
          }
        }

        // 5. Path / Folder structure
        if (record.normPath.includes(token)) {
          score += 100;
          tokenFound = true;
          if (matchType !== 'filename' && matchType !== 'tag' && matchType !== 'metadata') {
            matchType = 'path';
          }
        }

        // 6. In-Document text content
        if (record.normContent.includes(token)) {
          score += 150;
          tokenFound = true;
          if (matchType !== 'filename' && matchType !== 'tag' && matchType !== 'metadata') {
            matchType = 'content';
          }
          if (!matchedSnippet) {
            matchedSnippet = this.extractSnippet(record.file.contentFull || record.file.contentSnippet || '', token);
          }
        }

        if (tokenFound) {
          tokensMatched++;
        }
      }

      // Multi-word matching option (defaults to true: all words required)
      const requireAllWords = filters.matchAllWords ?? true;

      if (tokens.length > 0) {
        if (requireAllWords) {
          // STRICT AND LOGIC: Every single word searched must be found in the file!
          if (tokensMatched < tokens.length) {
            continue;
          }
        } else {
          // OR LOGIC: At least one word must match
          if (tokensMatched === 0 && exactMatches.length === 0) {
            continue;
          }
        }
      } else if (exactMatches.length === 0) {
        // Fallback if no clean tokens or quotes (e.g. special characters): must match as contiguous string
        const matchesQuery = record.normName.includes(queryLower) ||
          record.normContent.includes(queryLower) ||
          record.normPath.includes(queryLower) ||
          metadataStr.includes(queryLower);
        if (!matchesQuery) {
          continue;
        }
      }

      // Full query contiguous substring bonus
      if (record.normName.includes(queryLower)) {
        score += 500;
      } else if (record.normContent.includes(queryLower)) {
        score += 300;
        if (!matchedSnippet) {
          matchedSnippet = this.extractSnippet(record.file.contentFull || record.file.contentSnippet || '', queryLower);
        }
      }

      // Slight recency boost (within last year)
      const ageDays = (now - record.modifiedTime) / (1000 * 60 * 60 * 24);
      if (ageDays < 365) {
        score += Math.max(0, Math.round(50 - ageDays * 0.1));
      }

      filteredRecords.push({
        record,
        score,
        snippet: matchedSnippet || record.file.contentSnippet,
        matchType,
      });
    }

    // 5. Sorting
    this.sortResults(filteredRecords, filters.sortBy, filters.sortDirection, rawQuery.length > 0);

    // 6. Revision Grouping Logic Layer
    // Defaults to showing only the latest revision unless filters.showAllRevisions === true!
    const { results: groupedResults, foldedRevisionCount, totalRevisionGroupsCount } = this.processRevisionGrouping(
      filteredRecords,
      filters.showAllRevisions ?? false
    );

    const endTime = performance.now();
    const durationMs = Math.max(0.4, Number((endTime - startTime).toFixed(1)));

    return {
      results: groupedResults,
      durationMs,
      totalCount: groupedResults.length,
      foldedRevisionCount,
      totalRevisionGroupsCount,
    };
  }

  /**
   * Identifies file naming suffixes like '_revA', '_rev01', '_v2', '_final', '_approved'
   * and extracts the clean base drawing/file name, revision code, and numeric rank.
   */
  public static parseRevisionSuffix(fileName: string): {
    hasSuffix: boolean;
    baseName: string;
    revision: string;
    rank: number;
  } {
    const dotIdx = fileName.lastIndexOf('.');
    const stem = dotIdx !== -1 ? fileName.slice(0, dotIdx) : fileName;

    // Pattern 1: _revA, _revB, _rev01, _rev-A, -revA, .revA
    const revMatch = stem.match(/[\s._-]rev[\s._-]?([a-zA-Z0-9]+)$/i);
    if (revMatch) {
      const revRaw = revMatch[1].toUpperCase();
      const isLetter = /^[A-Z]$/.test(revRaw);
      const revNum = isLetter ? revRaw.charCodeAt(0) - 64 : parseInt(revRaw, 10) || 1;
      const baseName = stem.slice(0, revMatch.index).trim();
      return {
        hasSuffix: true,
        baseName,
        revision: `Rev-${revRaw}`,
        rank: revNum,
      };
    }

    // Pattern 2: _v1, _v2, _v2.1, _ver2, -v2
    const verMatch = stem.match(/[\s._-](?:v|ver)[\s._-]?(\d+(?:\.\d+)?)$/i);
    if (verMatch) {
      const verNum = parseFloat(verMatch[1]) || 1;
      const baseName = stem.slice(0, verMatch.index).trim();
      return {
        hasSuffix: true,
        baseName,
        revision: `v${verMatch[1]}`,
        rank: verNum * 10,
      };
    }

    // Pattern 3: _final, _final_approved, -final, _approved, _asbuilt, _as_built
    const finalMatch = stem.match(/[\s._-](final(?:[-_]approved)?|approved|as[-_]?built)$/i);
    if (finalMatch) {
      const tag = finalMatch[1].toUpperCase().replace(/[-_]/g, ' ');
      const baseName = stem.slice(0, finalMatch.index).trim();
      return {
        hasSuffix: true,
        baseName,
        revision: tag,
        rank: 9999, // Final ranks highest
      };
    }

    return {
      hasSuffix: false,
      baseName: stem,
      revision: 'Original',
      rank: 0,
    };
  }

  /**
   * Groups items with matching base names in the same folder.
   * When showAll is false (default): folds superseded files under the latest revision item.
   * When showAll is true: displays all revisions while tagging their relationships.
   */
  public processRevisionGrouping(
    items: { record: IndexRecord; score: number; snippet?: string; matchType?: SearchResult['matchType'] }[],
    showAll: boolean
  ): {
    results: SearchResult[];
    foldedRevisionCount: number;
    totalRevisionGroupsCount: number;
  } {
    // Group candidate items by parentPath + baseName + extension
    const groupMap = new Map<string, {
      items: typeof items;
      baseName: string;
    }>();

    for (const item of items) {
      if (item.record.file.isFolder) continue;

      const parsed = FastSearchEngine.parseRevisionSuffix(item.record.file.name);
      const groupKey = `${item.record.file.parentPath.toLowerCase()}:::${parsed.baseName.toLowerCase()}:::${item.record.file.extension.toLowerCase()}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          items: [],
          baseName: parsed.baseName,
        });
      }
      groupMap.get(groupKey)!.items.push(item);
    }

    let foldedRevisionCount = 0;
    let totalRevisionGroupsCount = 0;

    // Analyze multi-file revision groups
    const groupAnalysis = new Map<string, {
      latest: (typeof items)[0];
      latestParsed: ReturnType<typeof FastSearchEngine.parseRevisionSuffix>;
      superseded: { item: (typeof items)[0]; parsed: ReturnType<typeof FastSearchEngine.parseRevisionSuffix> }[];
      allParsed: { item: (typeof items)[0]; parsed: ReturnType<typeof FastSearchEngine.parseRevisionSuffix> }[];
    }>();

    for (const [key, group] of groupMap.entries()) {
      if (group.items.length > 1) {
        totalRevisionGroupsCount++;
        const parsedList = group.items.map(it => ({
          item: it,
          parsed: FastSearchEngine.parseRevisionSuffix(it.record.file.name),
        }));

        // Sort by rank descending, then modifiedTime descending
        parsedList.sort((a, b) => {
          if (b.parsed.rank !== a.parsed.rank) {
            return b.parsed.rank - a.parsed.rank;
          }
          return b.item.record.modifiedTime - a.item.record.modifiedTime;
        });

        const latest = parsedList[0];
        const superseded = parsedList.slice(1);
        foldedRevisionCount += superseded.length;

        groupAnalysis.set(key, {
          latest: latest.item,
          latestParsed: latest.parsed,
          superseded,
          allParsed: parsedList,
        });
      }
    }

    const processedGroupKeys = new Set<string>();
    const finalResults: SearchResult[] = [];

    for (const item of items) {
      if (item.record.file.isFolder) {
        finalResults.push({
          file: item.record.file,
          score: item.score,
          snippet: item.snippet,
          matchType: item.matchType,
        });
        continue;
      }

      const parsed = FastSearchEngine.parseRevisionSuffix(item.record.file.name);
      const groupKey = `${item.record.file.parentPath.toLowerCase()}:::${parsed.baseName.toLowerCase()}:::${item.record.file.extension.toLowerCase()}`;
      const group = groupAnalysis.get(groupKey);

      if (group) {
        // Multi-revision group
        if (!showAll) {
          // Default: only show latest revision once
          if (!processedGroupKeys.has(groupKey)) {
            processedGroupKeys.add(groupKey);
            finalResults.push({
              file: {
                ...group.latest.record.file,
                isSuperseded: false,
                revision: group.latestParsed.revision,
                baseDrawingName: group.latestParsed.baseName,
              },
              score: group.latest.score,
              snippet: group.latest.snippet,
              matchType: group.latest.matchType,
              revisionInfo: {
                baseName: group.latestParsed.baseName,
                revision: group.latestParsed.revision,
                isLatest: true,
                totalRevisions: group.allParsed.length,
                supersededCount: group.superseded.length,
                supersededFiles: group.superseded.map(s => ({
                  ...s.item.record.file,
                  isSuperseded: true,
                  revision: s.parsed.revision,
                  baseDrawingName: s.parsed.baseName,
                })),
              },
            });
          }
        } else {
          // Show All mode: emit each revision
          const isLatest = group.latest.record.file.id === item.record.file.id;
          finalResults.push({
            file: {
              ...item.record.file,
              isSuperseded: !isLatest,
              revision: parsed.revision,
              baseDrawingName: parsed.baseName,
            },
            score: item.score,
            snippet: item.snippet,
            matchType: item.matchType,
            revisionInfo: {
              baseName: parsed.baseName,
              revision: parsed.revision,
              isLatest,
              totalRevisions: group.allParsed.length,
              supersededCount: isLatest ? group.superseded.length : 0,
              supersededFiles: isLatest ? group.superseded.map(s => s.item.record.file) : [],
            },
          });
        }
      } else {
        // Single standalone file
        finalResults.push({
          file: {
            ...item.record.file,
            revision: parsed.hasSuffix ? parsed.revision : item.record.file.revision,
            baseDrawingName: parsed.baseName,
          },
          score: item.score,
          snippet: item.snippet,
          matchType: item.matchType,
          revisionInfo: parsed.hasSuffix ? {
            baseName: parsed.baseName,
            revision: parsed.revision,
            isLatest: true,
            totalRevisions: 1,
            supersededCount: 0,
            supersededFiles: [],
          } : undefined,
        });
      }
    }

    return {
      results: finalResults,
      foldedRevisionCount,
      totalRevisionGroupsCount,
    };
  }

  /**
   * Retrieves all revisions associated with a given file ID
   */
  public getRevisionsForFile(fileId: string): {
    current: FileItem;
    latest: FileItem;
    allRevisions: FileItem[];
    superseded: FileItem[];
  } | null {
    const record = this.recordsById.get(fileId);
    if (!record || record.file.isFolder) return null;

    const parsed = FastSearchEngine.parseRevisionSuffix(record.file.name);
    const groupKey = `${record.file.parentPath.toLowerCase()}:::${parsed.baseName.toLowerCase()}:::${record.file.extension.toLowerCase()}`;

    const matching: { file: FileItem; parsed: ReturnType<typeof FastSearchEngine.parseRevisionSuffix>; modifiedTime: number }[] = [];
    for (const r of this.records) {
      if (r.file.isFolder) continue;
      const rParsed = FastSearchEngine.parseRevisionSuffix(r.file.name);
      const rKey = `${r.file.parentPath.toLowerCase()}:::${rParsed.baseName.toLowerCase()}:::${r.file.extension.toLowerCase()}`;
      if (rKey === groupKey) {
        matching.push({ file: r.file, parsed: rParsed, modifiedTime: r.modifiedTime });
      }
    }

    if (matching.length <= 1) return null;

    matching.sort((a, b) => {
      if (b.parsed.rank !== a.parsed.rank) {
        return b.parsed.rank - a.parsed.rank;
      }
      return b.modifiedTime - a.modifiedTime;
    });

    const latest = matching[0].file;
    const superseded = matching.slice(1).map(m => m.file);
    const allRevisions = matching.map(m => m.file);

    return {
      current: record.file,
      latest,
      allRevisions,
      superseded,
    };
  }

  private matchesDateRange(
    itemTime: number,
    range: DateFilterOption,
    customStart?: string,
    customEnd?: string,
    nowTime: number = Date.now()
  ): boolean {
    if (range === 'any') return true;
    if (itemTime === 0) return false;

    const oneDayMs = 24 * 60 * 60 * 1000;
    const itemDate = new Date(itemTime);
    const nowDate = new Date(nowTime);

    // reset to midnight for clean comparison
    const nowStartOfDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();

    switch (range) {
      case 'today':
        return itemTime >= nowStartOfDay;
      case 'yesterday': {
        const yesterdayStart = nowStartOfDay - oneDayMs;
        return itemTime >= yesterdayStart && itemTime < nowStartOfDay;
      }
      case '7days':
        return itemTime >= nowStartOfDay - 7 * oneDayMs;
      case '30days':
        return itemTime >= nowStartOfDay - 30 * oneDayMs;
      case '3months':
        return itemTime >= nowStartOfDay - 90 * oneDayMs;
      case '6months':
        return itemTime >= nowStartOfDay - 180 * oneDayMs;
      case '1year':
        return itemTime >= nowStartOfDay - 365 * oneDayMs;
      case 'custom': {
        if (!customStart && !customEnd) return true;
        let valid = true;
        if (customStart) {
          const sDate = new Date(customStart).getTime();
          valid = valid && itemTime >= sDate;
        }
        if (customEnd) {
          const eDate = new Date(customEnd + 'T23:59:59Z').getTime();
          valid = valid && itemTime <= eDate;
        }
        return valid;
      }
      default:
        return true;
    }
  }

  private sortResults(
    items: { record: IndexRecord; score: number }[],
    sortBy: SortByField,
    direction: SortDirection,
    hasQuery: boolean
  ): void {
    const dir = direction === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      // Folders usually come first when browsing folders
      if (!hasQuery) {
        if (a.record.file.isFolder && !b.record.file.isFolder) return -1;
        if (!a.record.file.isFolder && b.record.file.isFolder) return 1;
      }

      if (sortBy === 'relevance') {
        if (b.score !== a.score) {
          return (b.score - a.score); // always highest score first
        }
        return b.record.modifiedTime - a.record.modifiedTime;
      }

      if (sortBy === 'name') {
        return dir * a.record.normName.localeCompare(b.record.normName);
      }

      if (sortBy === 'modified') {
        return dir * (a.record.modifiedTime - b.record.modifiedTime);
      }

      if (sortBy === 'created') {
        return dir * (a.record.createdTime - b.record.createdTime);
      }

      if (sortBy === 'size') {
        return dir * (a.record.file.size - b.record.file.size);
      }

      if (sortBy === 'type') {
        const typeA = a.record.file.extension || 'folder';
        const typeB = b.record.file.extension || 'folder';
        return dir * typeA.localeCompare(typeB);
      }

      return 0;
    });
  }

  private extractSnippet(text: string, term: string): string {
    if (!text) return '';
    const norm = text.toLowerCase();
    const idx = norm.indexOf(term.toLowerCase());
    if (idx === -1) {
      return text.slice(0, 140) + (text.length > 140 ? '...' : '');
    }

    const start = Math.max(0, idx - 45);
    const end = Math.min(text.length, idx + term.length + 75);

    let snippet = text.slice(start, end).replace(/\s+/g, ' ');
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
  }

  public getAllTagsWithCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const record of this.records) {
      if (record.file.tags && record.file.tags.length > 0) {
        for (const tag of record.file.tags) {
          const trimmed = tag.trim();
          if (trimmed) {
            counts[trimmed] = (counts[trimmed] || 0) + 1;
          }
        }
      }
    }
    return counts;
  }
}
