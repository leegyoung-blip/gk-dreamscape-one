/*
 * Keyset pagination for the Profile page's Dream Token and Dream Gem histories.
 *
 * Rows are ordered newest first by (created_at desc, id desc). id breaks ties
 * between transactions recorded with the same timestamp, so the order is total
 * and stable. "Load More" continues strictly after the last row shown, which
 * keeps pages free of duplicates and gaps even while new transactions arrive.
 *
 * Each request asks for one row more than a page; that extra row only tells us
 * whether another page exists, so the full history is never downloaded.
 */

export const TRANSACTION_HISTORY_PAGE_SIZE = 25;

export type HistoryRow = { id: string | number; created_at: string };

export type HistoryCursor = { createdAt: string; id: string };

export type HistoryPage<T extends HistoryRow> = {
  rows: T[];
  /** Position of the last row shown; the next page starts after it. */
  cursor: HistoryCursor | null;
  hasMore: boolean;
};

export function emptyHistoryPage<T extends HistoryRow>(): HistoryPage<T> {
  return { rows: [], cursor: null, hasMore: false };
}

const sameId = (a: HistoryRow, b: HistoryRow) => String(a.id) === String(b.id);

function cursorOf(row: HistoryRow | undefined): HistoryCursor | null {
  return row ? { createdAt: row.created_at, id: String(row.id) } : null;
}

export function sameCursor(a: HistoryCursor | null, b: HistoryCursor | null): boolean {
  return a === b || (!!a && !!b && a.createdAt === b.createdAt && a.id === b.id);
}

// PostgREST filter values containing reserved characters (":", ".", ",") must be quoted.
function quote(value: string) {
  return `"${value.replace(/["\\]/g, (c) => `\\${c}`)}"`;
}

/**
 * PostgREST `or` filter selecting rows strictly older than the cursor in
 * (created_at desc, id desc) order.
 */
export function olderThanFilter(cursor: HistoryCursor): string {
  const at = quote(cursor.createdAt);
  return `created_at.lt.${at},and(created_at.eq.${at},id.lt.${quote(cursor.id)})`;
}

/** Turns a fetched batch (up to pageSize + 1 rows) into a page. */
export function toHistoryPage<T extends HistoryRow>(
  fetched: T[],
  pageSize = TRANSACTION_HISTORY_PAGE_SIZE,
): HistoryPage<T> {
  const rows = fetched.slice(0, pageSize);
  return { rows, cursor: cursorOf(rows[rows.length - 1]), hasMore: fetched.length > pageSize };
}

/** Appends an older page ("Load More"), dropping any row already shown. */
export function appendOlderPage<T extends HistoryRow>(
  current: HistoryPage<T>,
  older: HistoryPage<T>,
): HistoryPage<T> {
  const fresh = older.rows.filter((row) => !current.rows.some((shown) => sameId(shown, row)));
  const rows = [...current.rows, ...fresh];
  return { rows, cursor: cursorOf(rows[rows.length - 1]) ?? current.cursor, hasMore: older.hasMore };
}

/**
 * Merges a freshly fetched newest page into what is already shown (after a
 * reward, purchase or admin adjustment). New and updated rows come from the
 * fresh page; older pages that were already loaded are kept. If the fresh page
 * does not connect to the loaded rows (for example more than a page of new
 * transactions), the history restarts from the fresh page so no gap can appear.
 */
export function mergeNewestPage<T extends HistoryRow>(
  current: HistoryPage<T>,
  newest: HistoryPage<T>,
): HistoryPage<T> {
  const lastFresh = newest.rows[newest.rows.length - 1];
  if (!lastFresh) return newest;

  const joinAt = current.rows.findIndex((row) => sameId(row, lastFresh));
  if (joinAt === -1) return newest;

  const olderLoaded = current.rows
    .slice(joinAt + 1)
    .filter((row) => !newest.rows.some((fresh) => sameId(fresh, row)));

  if (olderLoaded.length === 0) {
    return { rows: newest.rows, cursor: newest.cursor, hasMore: newest.hasMore || current.hasMore };
  }

  return { rows: [...newest.rows, ...olderLoaded], cursor: current.cursor, hasMore: current.hasMore };
}
