/**
 * Highway Chainage & Drawing Revision Parser
 * Parses civil infrastructure chainage notations (e.g. CH 12+500 to 14+000)
 * and detects filename revision hierarchies (e.g. _revA, _v2, _final).
 */

export interface ChainageRange {
  raw: string;
  startMeters: number;
  endMeters: number;
  formattedStart: string;
  formattedEnd: string;
}

export interface RevisionInfo {
  baseName: string;
  revision: string;
  revisionNumber: number; // Normalized order for sorting (e.g. Rev A=1, Rev B=2, v3=3)
  isFinal: boolean;
}

export interface GroupedRevisions<T> {
  latest: T;
  superseded: T[];
}

/**
 * Converts a chainage token (e.g. "12+500", "12.500", "0+250") to total meters.
 */
export function chainageStringToMeters(token: string): number | null {
  if (!token) return null;
  const clean = token.replace(/^(ch|km|chainage)[\s.:]*/i, '').trim();

  // Pattern 1: Km+Meters (e.g., "12+500" or "0+050")
  const plusMatch = clean.match(/^(\d+)\+(\d{1,3})$/);
  if (plusMatch) {
    const km = parseInt(plusMatch[1], 10);
    const m = parseInt(plusMatch[2].padEnd(3, '0').slice(0, 3), 10);
    return km * 1000 + m;
  }

  // Pattern 2: Decimal Kilometer (e.g., "12.5" or "12.500")
  const dotMatch = clean.match(/^(\d+)(?:\.(\d+))?$/);
  if (dotMatch) {
    const km = parseInt(dotMatch[1], 10);
    const m = dotMatch[2] ? parseFloat(`0.${dotMatch[2]}`) * 1000 : 0;
    return Math.round(km * 1000 + m);
  }

  return null;
}

/**
 * Converts meters back into standard highway notation: e.g. 12500 -> "CH 12+500"
 */
export function metersToChainageString(meters: number): string {
  const km = Math.floor(meters / 1000);
  const m = Math.floor(meters % 1000);
  return `CH ${km}+${m.toString().padStart(3, '0')}`;
}

/**
 * Extracts highway chainage range from a query string or filename.
 * Supports:
 * - "CH 12+500 to 14+000"
 * - "CH. 12+500 - 14+000"
 * - "12+500 to 14+000"
 * - "Chainage 102+150 to 105+300"
 * - Single point: "CH 12+500" (creates 50-meter bounding window)
 */
export function parseChainageQuery(input: string): ChainageRange | null {
  if (!input) return null;

  // Range syntax: (CH)? 12+500 (to|-|–) (CH)? 14+000
  const rangeRegex = /(?:ch|chainage|km)?\s*(\d+\+\d{1,3}|\d+\.\d{1,3}|\d+)\s*(?:to|-|–)\s*(?:ch|chainage|km)?\s*(\d+\+\d{1,3}|\d+\.\d{1,3}|\d+)/i;
  const rangeMatch = input.match(rangeRegex);

  if (rangeMatch) {
    const startM = chainageStringToMeters(rangeMatch[1]);
    const endM = chainageStringToMeters(rangeMatch[2]);
    if (startM !== null && endM !== null) {
      const minM = Math.min(startM, endM);
      const maxM = Math.max(startM, endM);
      return {
        raw: rangeMatch[0],
        startMeters: minM,
        endMeters: maxM,
        formattedStart: metersToChainageString(minM),
        formattedEnd: metersToChainageString(maxM),
      };
    }
  }

  // Single point syntax: CH 12+500
  const singleRegex = /(?:ch|chainage|km)[\s.:]*(\d+\+\d{1,3})/i;
  const singleMatch = input.match(singleRegex);
  if (singleMatch) {
    const meters = chainageStringToMeters(singleMatch[1]);
    if (meters !== null) {
      return {
        raw: singleMatch[0],
        startMeters: meters - 25, // 50m tolerance window for point queries
        endMeters: meters + 25,
        formattedStart: metersToChainageString(meters),
        formattedEnd: metersToChainageString(meters),
      };
    }
  }

  return null;
}

/**
 * Checks if two chainage intervals overlap.
 */
export function doChainagesOverlap(
  fileRange: { startM: number; endM: number },
  searchRange: { startM: number; endM: number }
): boolean {
  return fileRange.startM <= searchRange.endM && fileRange.endM >= searchRange.startM;
}

/**
 * Generates an SQL snippet for chainage filtering.
 */
export function buildChainageSqlClause(range: ChainageRange, columnStart = 'chainage_start_m', columnEnd = 'chainage_end_m') {
  return {
    sql: `(${columnStart} <= ? AND ${columnEnd} >= ?)`,
    params: [range.endMeters, range.startMeters],
  };
}

/**
 * Extracts revision information from file names.
 * Detects patterns like:
 * - DRW-BR-01_revA.dwg, DRW-BR-01_REV-02.dwg
 * - Alignment_Plan_v1.pdf, Alignment_Plan_v2.pdf
 * - Tender_BOQ_Final.xlsx, Tender_BOQ_Final_Approved.xlsx
 */
export function parseFileRevision(fileName: string): RevisionInfo {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

  // Detect _revA, _rev01, _rev-B
  const revMatch = nameWithoutExt.match(/[\s._-]rev[\s._-]?([a-zA-Z0-9]+)/i);
  if (revMatch) {
    const revRaw = revMatch[1].toUpperCase();
    const isLetter = /^[A-Z]$/.test(revRaw);
    const revNum = isLetter ? revRaw.charCodeAt(0) - 64 : parseInt(revRaw, 10) || 1;
    const base = nameWithoutExt.replace(revMatch[0], '').trim();
    return {
      baseName: base,
      revision: `Rev-${revRaw}`,
      revisionNumber: revNum,
      isFinal: false,
    };
  }

  // Detect _v1, _v2.1, _ver2
  const verMatch = nameWithoutExt.match(/[\s._-](?:v|ver)[\s._-]?(\d+(?:\.\d+)?)/i);
  if (verMatch) {
    const verNum = parseFloat(verMatch[1]) || 1;
    const base = nameWithoutExt.replace(verMatch[0], '').trim();
    return {
      baseName: base,
      revision: `v${verMatch[1]}`,
      revisionNumber: verNum * 10,
      isFinal: false,
    };
  }

  // Detect final / approved / as-built tags
  const finalMatch = nameWithoutExt.match(/[\s._-](final|approved|as[-_]?built)/i);
  if (finalMatch) {
    const base = nameWithoutExt.replace(finalMatch[0], '').trim();
    return {
      baseName: base,
      revision: finalMatch[1].toUpperCase(),
      revisionNumber: 9999, // Final ranks highest
      isFinal: true,
    };
  }

  return {
    baseName: nameWithoutExt,
    revision: 'Original',
    revisionNumber: 0,
    isFinal: false,
  };
}

/**
 * Optional / On-Demand Revision Grouping:
 * Groups superseded drawing/document revisions under their latest parent.
 * Activated selectively when requested by user to preserve sub-5ms search speed.
 */
export function groupFilesByRevision<T extends { name: string; id: string }>(
  files: T[],
  options: { enableRevisionGrouping?: boolean } = {}
): { latestFiles: T[]; revisionGroups: Map<string, GroupedRevisions<T>> } {
  // If not enabled, return flat list immediately (zero overhead)
  if (!options.enableRevisionGrouping) {
    return { latestFiles: files, revisionGroups: new Map() };
  }

  const groups = new Map<string, T[]>();

  for (const file of files) {
    const revInfo = parseFileRevision(file.name);
    const key = revInfo.baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(file);
  }

  const latestFiles: T[] = [];
  const revisionGroups = new Map<string, GroupedRevisions<T>>();

  for (const [key, items] of groups.entries()) {
    if (items.length <= 1) {
      latestFiles.push(items[0]);
      continue;
    }

    // Sort items by parsed revision number descending
    const sorted = [...items].sort((a, b) => {
      const revA = parseFileRevision(a.name);
      const revB = parseFileRevision(b.name);
      return revB.revisionNumber - revA.revisionNumber;
    });

    const latest = sorted[0];
    const superseded = sorted.slice(1);

    latestFiles.push(latest);
    revisionGroups.set(latest.id, { latest, superseded });
  }

  return { latestFiles, revisionGroups };
}
