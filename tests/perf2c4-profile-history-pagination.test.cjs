/** PERF-2C-4: Profile DT/DG histories load 25 rows at a time (keyset pagination) with "Load More". */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

const HELPER = 'lib/wallet/transactionHistory.ts';
const PROFILE = 'app/profile/page.tsx';

function loadHelper() {
 const out = ts.transpileModule(read(HELPER), {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 const mod = {exports:{}};
 vm.runInNewContext(out.outputText, {exports:mod.exports, module:mod, require:() => ({})});
 return mod.exports;
}
const H = loadHelper();
const PAGE = H.TRANSACTION_HISTORY_PAGE_SIZE;

/* ---------------- In-memory ledger answering the page's PostgREST queries ---------------- */

// Fixed-width hex ids, so string order matches Postgres uuid order.
const hexId = (n) => n.toString(16).padStart(8, '0') + '-0000-4000-8000-000000000000';
const OLDER = /^created_at\.lt\."(.*)",and\(created_at\.eq\."(.*)",id\.lt\."(.*)"\)$/;

function ledger() {
 const rows = [];
 let next = 1;
 const queries = [];
 return {
  rows, queries,
  add(userId, createdAt, extra = {}) {
   const row = {id: hexId(next++), user_id: userId, created_at: createdAt, title: `t${next}`, amount: 1, ...extra};
   rows.push(row);
   return row;
  },
  // Mirrors: .eq("user_id") [.or(olderThanFilter)] .order(created_at desc).order(id desc).limit(n)
  fetch(userId, {or = null, limit}) {
   queries.push({userId, or, limit});
   assert.ok(Number.isInteger(limit) && limit === PAGE + 1, 'every history query is bounded to one page + 1');
   let out = rows.filter((r) => r.user_id === userId);
   if (or) {
    const m = OLDER.exec(or);
    assert.ok(m, `unexpected filter ${or}`);
    assert.equal(m[1], m[2]);
    out = out.filter((r) => r.created_at < m[1] || (r.created_at === m[2] && r.id < m[3]));
   }
   out.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
   return out.slice(0, limit).map((r) => ({...r}));
  },
 };
}

// The Profile loaders' logic: first page / refresh merge, and Load More with the cursor check.
function history(db, userId) {
 let state = H.emptyHistoryPage();
 return {
  get state() { return state; },
  open(isRefresh = false) {
   const newest = H.toHistoryPage(db.fetch(userId, {limit: PAGE + 1}));
   state = isRefresh ? H.mergeNewestPage(state, newest) : newest;
  },
  // Splits Load More into request and response so other events can happen in between.
  startMore() {
   const cursor = state.cursor;
   const fetched = db.fetch(userId, {or: H.olderThanFilter(cursor), limit: PAGE + 1});
   return () => {
    const older = H.toHistoryPage(fetched);
    if (H.sameCursor(state.cursor, cursor)) state = H.appendOlderPage(state, older);
   };
  },
  more() { this.startMore()(); },
 };
}

// Array.from builds a main-realm array (helper results come from the vm context).
const ids = (rows) => Array.from(rows, (r) => r.id);
const sortedNewestFirst = (db, userId) => db.rows
 .filter((r) => r.user_id === userId)
 .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.id < b.id ? 1 : -1));

function assertNoDuplicates(rows) {
 assert.equal(new Set(ids(rows)).size, rows.length, 'no duplicate rows');
}

/* ---------------- Helper ---------------- */

test('page size is 25 and each request asks for one extra row only to detect more', () => {
 assert.equal(PAGE, 25);
 const rows = Array.from({length: 26}, (_, i) => ({id: String(i), created_at: 't'}));
 const page = H.toHistoryPage(rows);
 assert.equal(page.rows.length, 25);
 assert.equal(page.hasMore, true);
 assert.deepEqual({...page.cursor}, {createdAt: 't', id: '24'}, 'cursor is the last row shown, not the probe row');
 assert.equal(H.toHistoryPage(rows.slice(0, 25)).hasMore, false);
 assert.equal(H.toHistoryPage([]).cursor, null);
});

test('the cursor filter quotes PostgREST values (timestamps contain ":" "." "+")', () => {
 const f = H.olderThanFilter({createdAt: '2026-10-21T14:10:00.123456+00:00', id: 'abc'});
 assert.equal(f, 'created_at.lt."2026-10-21T14:10:00.123456+00:00",and(created_at.eq."2026-10-21T14:10:00.123456+00:00",id.lt."abc")');
 assert.match(H.olderThanFilter({createdAt: 'a"b', id: 'c\\d'}), /"a\\"b".*"c\\\\d"/, 'quotes and backslashes are escaped');
});

test('sameCursor compares by value', () => {
 assert.equal(H.sameCursor(null, null), true);
 assert.equal(H.sameCursor({createdAt: 'a', id: '1'}, {createdAt: 'a', id: '1'}), true);
 assert.equal(H.sameCursor({createdAt: 'a', id: '1'}, {createdAt: 'a', id: '2'}), false);
 assert.equal(H.sameCursor({createdAt: 'a', id: '1'}, null), false);
});

/* ---------------- Pagination behaviour ---------------- */

test('empty history: no rows, no Load More', () => {
 const db = ledger();
 const h = history(db, 'u1');
 h.open();
 assert.deepEqual(h.state.rows, []);
 assert.equal(h.state.hasMore, false);
 assert.equal(db.queries.length, 1);
});

test('first page then Load More walks every row once, in order, with identical timestamps', () => {
 const db = ledger();
 // 60 rows; groups of 7 share the exact same created_at, spanning page boundaries.
 for (let i = 0; i < 60; i += 1) db.add('u1', `2026-10-${String(10 + Math.floor(i / 7)).padStart(2, '0')}T08:00:00+00:00`);
 const h = history(db, 'u1');
 h.open();
 assert.equal(h.state.rows.length, 25);
 assert.equal(h.state.hasMore, true);
 h.more();
 assert.equal(h.state.rows.length, 50);
 assert.equal(h.state.hasMore, true);
 h.more();
 assert.equal(h.state.rows.length, 60);
 assert.equal(h.state.hasMore, false, 'Load More disappears on the last page');
 assert.deepEqual(ids(h.state.rows), ids(sortedNewestFirst(db, 'u1')), 'same rows and order as the old full download');
 assertNoDuplicates(h.state.rows);
 assert.equal(db.queries.length, 3, 'three bounded requests, never a full download');
 assert.ok(db.queries.every((q) => q.limit === 26));
});

test('exactly 25 rows: one page and no Load More', () => {
 const db = ledger();
 for (let i = 0; i < 25; i += 1) db.add('u1', `2026-10-01T00:00:${String(i).padStart(2, '0')}+00:00`);
 const h = history(db, 'u1');
 h.open();
 assert.equal(h.state.rows.length, 25);
 assert.equal(h.state.hasMore, false);
});

test('transactions created while browsing never shift, duplicate or drop older pages', () => {
 const db = ledger();
 for (let i = 0; i < 40; i += 1) db.add('u1', `2026-10-01T00:00:${String(i).padStart(2, '0')}+00:00`);
 const before = ids(sortedNewestFirst(db, 'u1'));
 const h = history(db, 'u1');
 h.open();
 // A reward lands between the first page and Load More (offset paging would repeat a row here).
 db.add('u1', '2026-10-21T00:00:00+00:00');
 h.more();
 assert.deepEqual(ids(h.state.rows), before, 'Load More continues after the last row shown');
 assertNoDuplicates(h.state.rows);
});

test('refresh after a reward merges the newest page and keeps the loaded older pages', () => {
 const db = ledger();
 for (let i = 0; i < 60; i += 1) db.add('u1', `2026-10-01T00:${String(i).padStart(2, '0')}:00+00:00`);
 const h = history(db, 'u1');
 h.open();
 h.more();
 assert.equal(h.state.rows.length, 50);
 db.add('u1', '2026-10-21T00:00:00+00:00');
 db.add('u1', '2026-10-21T00:00:00+00:00'); // same timestamp as the previous reward
 h.open(true);
 assert.equal(h.state.rows.length, 52, 'two new rows on top, nothing lost');
 assert.deepEqual(ids(h.state.rows), ids(sortedNewestFirst(db, 'u1')).slice(0, 52));
 assert.equal(h.state.hasMore, true);
 h.more();
 assert.deepEqual(ids(h.state.rows), ids(sortedNewestFirst(db, 'u1')), 'the rest still loads exactly once');
 assertNoDuplicates(h.state.rows);
});

test('refresh with no change leaves the history as it was', () => {
 const db = ledger();
 for (let i = 0; i < 30; i += 1) db.add('u1', `2026-10-01T00:${String(i).padStart(2, '0')}:00+00:00`);
 const h = history(db, 'u1');
 h.open();
 h.more();
 const snapshot = ids(h.state.rows);
 h.open(true);
 assert.deepEqual(ids(h.state.rows), snapshot);
 assert.equal(h.state.hasMore, false);
});

test('a refresh that brings in more than a page of new rows restarts cleanly (no gap)', () => {
 const db = ledger();
 for (let i = 0; i < 30; i += 1) db.add('u1', `2026-10-01T00:${String(i).padStart(2, '0')}:00+00:00`);
 const h = history(db, 'u1');
 h.open();
 for (let i = 0; i < 30; i += 1) db.add('u1', `2026-10-21T00:${String(i).padStart(2, '0')}:00+00:00`);
 h.open(true);
 assert.deepEqual(ids(h.state.rows), ids(sortedNewestFirst(db, 'u1')).slice(0, 25));
 assert.equal(h.state.hasMore, true);
 h.more(); h.more();
 assert.deepEqual(ids(h.state.rows), ids(sortedNewestFirst(db, 'u1')));
});

test('a Load More reply that arrives after a restarting refresh is dropped (cursor check)', () => {
 const db = ledger();
 for (let i = 0; i < 30; i += 1) db.add('u1', `2026-10-01T00:${String(i).padStart(2, '0')}:00+00:00`);
 const h = history(db, 'u1');
 h.open();
 const finishMore = h.startMore(); // in flight
 for (let i = 0; i < 30; i += 1) db.add('u1', `2026-10-21T00:${String(i).padStart(2, '0')}:00+00:00`);
 h.open(true); // restarts from the newest page
 finishMore(); // late reply for the old position
 assert.deepEqual(ids(h.state.rows), ids(sortedNewestFirst(db, 'u1')).slice(0, 25), 'no stale page appended after a gap');
});

test('a Load More reply that arrives after a merging refresh still appends correctly', () => {
 const db = ledger();
 for (let i = 0; i < 40; i += 1) db.add('u1', `2026-10-01T00:${String(i).padStart(2, '0')}:00+00:00`);
 const h = history(db, 'u1');
 h.open();
 const finishMore = h.startMore();
 db.add('u1', '2026-10-21T00:00:00+00:00');
 h.open(true);
 finishMore();
 assert.deepEqual(ids(h.state.rows), ids(sortedNewestFirst(db, 'u1')));
 assertNoDuplicates(h.state.rows);
});

test('appendOlderPage drops rows already shown', () => {
 const a = {id: 'a', created_at: '3'}; const b = {id: 'b', created_at: '2'}; const c = {id: 'c', created_at: '1'};
 const merged = H.appendOlderPage({rows: [a, b], cursor: {createdAt: '2', id: 'b'}, hasMore: true}, {rows: [b, c], cursor: {createdAt: '1', id: 'c'}, hasMore: false});
 assert.deepEqual(ids(merged.rows), ['a', 'b', 'c']);
 assert.deepEqual({...merged.cursor}, {createdAt: '1', id: 'c'});
 assert.equal(merged.hasMore, false);
});

test('one learner never sees another learner\'s rows', () => {
 const db = ledger();
 for (let i = 0; i < 30; i += 1) { db.add('u1', `2026-10-01T00:${String(i).padStart(2, '0')}:00+00:00`); db.add('u2', `2026-10-01T00:${String(i).padStart(2, '0')}:00+00:00`); }
 const h = history(db, 'u1');
 h.open(); h.more();
 assert.ok(h.state.rows.every((r) => r.user_id === 'u1'));
 assert.equal(h.state.rows.length, 30);
});

/* ---------------- Profile page wiring ---------------- */

const src = read(PROFILE);
const block = (start) => {
 const i = src.indexOf(start);
 assert.ok(i >= 0, `missing ${start}`);
 return src.slice(i, src.indexOf('\n  }, []);', i) + 10);
};

test('every Profile history query is bounded and ordered (created_at desc, id desc)', () => {
 for (const table of ['dream_token_transactions', 'dream_gem_transactions']) {
  const n = (src.match(new RegExp(`from\\("${table}"\\)`, 'g')) || []).length;
  assert.equal(n, 2, `${table}: first page and Load More only`);
 }
 for (const name of ['const loadTokenHistory', 'const loadMoreTokenHistory', 'const loadGemHistory', 'const loadMoreGemHistory']) {
  const body = block(name);
  assert.match(body, /\.order\("created_at", \{\s*ascending: false,?\s*\}\)\s*\.order\("id", \{ ascending: false \}\)\s*\.limit\(TRANSACTION_HISTORY_PAGE_SIZE \+ 1\);/, `${name} order and limit`);
  assert.match(body, /\.eq\("user_id", userId\)/, `${name} own rows only`);
 }
 for (const name of ['const loadMoreTokenHistory', 'const loadMoreGemHistory']) {
  assert.match(block(name), /\.or\(olderThanFilter\(cursor\)\)/, `${name} keyset cursor`);
 }
 assert.match(block('const loadTokenHistory'), /\.eq\("token_kind", "virtual"\)/);
 assert.match(block('const loadMoreTokenHistory'), /\.eq\("token_kind", "virtual"\)/);
 assert.ok(!/\.range\(/.test(src), 'no offset pagination');
});

test('the same columns, filters, titles, amounts and dates are shown', () => {
 assert.match(block('const loadTokenHistory'), /\.select\("id,user_id,type,title,amount,token_kind,created_at"\)/);
 assert.match(block('const loadMoreTokenHistory'), /\.select\("id,user_id,type,title,amount,token_kind,created_at"\)/);
 for (const name of ['const loadGemHistory', 'const loadMoreGemHistory']) {
  assert.match(block(name), /"id,user_id,type,source,title,description,amount,balance_after,created_at"/);
 }
 assert.match(src, /const tokenTransactions = tokenHistory\.rows;/);
 assert.match(src, /const gemTransactions = gemHistory\.rows;/);
 assert.match(src, /\{tokenTransactions\.map\(\(transaction\) => \(/);
 assert.match(src, /\{gemTransactions\.map\(\(transaction\) => \{/);
 assert.match(src, /\{formatTransactionDate\(transaction\.created_at\)\}/);
 assert.match(src, /\{formatTokenTransactionAmount\(transaction\)\}/);
 assert.match(src, /\{formatGemTransactionAmount\(transaction\)\}/);
 assert.match(src, /Balance after: \{transaction\.balance_after\} DG/);
});

test('Load More shows only when more rows exist and is disabled while loading', () => {
 assert.match(src, /\{tokenHistory\.hasMore && \([\s\S]*?onClick=\{\(\) =>\s*void loadMoreTokenHistory\(tokenHistory\.cursor\)\s*\}\s*disabled=\{tokenHistoryLoadingMore\}[\s\S]*?\{tokenHistoryLoadingMore \? "Loading\.\.\." : "Load More"\}/);
 assert.match(src, /\{gemHistory\.hasMore && \([\s\S]*?onClick=\{\(\) =>\s*void loadMoreGemHistory\(gemHistory\.cursor\)\s*\}\s*disabled=\{gemHistoryLoadingMore\}[\s\S]*?\{gemHistoryLoadingMore \? "Loading\.\.\." : "Load More"\}/);
 for (const [name, flag] of [['const loadMoreTokenHistory', 'tokenHistoryLoadingMoreRef'], ['const loadMoreGemHistory', 'gemHistoryLoadingMoreRef']]) {
  assert.match(block(name), new RegExp(`${flag}\\.current\\s*\\) \\{\\s*return;`), `${name} ignores overlapping clicks`);
 }
});

test('stale, superseded and other-account replies are ignored', () => {
 for (const [name, ref] of [['const loadTokenHistory', 'tokenHistoryRequestRef'], ['const loadGemHistory', 'gemHistoryRequestRef'], ['const loadMoreTokenHistory', 'tokenHistoryMoreRequestRef'], ['const loadMoreGemHistory', 'gemHistoryMoreRequestRef']]) {
  assert.match(block(name), new RegExp(`requestId !== ${ref}\\.current \\|\\|\\s*profileUserIdRef\\.current !== userId`), `${name} guard`);
 }
 for (const name of ['const loadMoreTokenHistory', 'const loadMoreGemHistory']) {
  assert.match(block(name), /sameCursor\(current\.cursor, cursor\)\s*\?\s*appendOlderPage\(current, older\)\s*:\s*current/, `${name} appends only at its own position`);
 }
 for (const name of ['const loadTokenHistory', 'const loadGemHistory']) {
  assert.match(block(name), /isRefresh \? mergeNewestPage\(current, newest\) : newest/, `${name} refresh merges`);
 }
});

test('logout and account switches clear history at once and cancel replies in flight', () => {
 const reset = block('const resetTransactionHistories');
 for (const ref of ['tokenHistoryRequestRef', 'gemHistoryRequestRef', 'tokenHistoryMoreRequestRef', 'gemHistoryMoreRequestRef']) {
  assert.match(reset, new RegExp(`${ref}\\.current \\+= 1;`), `${ref} invalidated`);
 }
 assert.match(reset, /setTokenHistory\(emptyHistoryPage\(\)\);\s*setGemHistory\(emptyHistoryPage\(\)\);/);
 assert.match(reset, /tokenHistoryLoadingMoreRef\.current = false;\s*gemHistoryLoadingMoreRef\.current = false;/);
 assert.match(src, /profileUserIdRef\.current = null;\s*resetTransactionHistories\(\);\s*setDreamTokenBalance\(0\);/, 'guest branch');
 assert.match(src, /if \(profileUserIdRef\.current !== userId\) \{[^}]*?profileUserIdRef\.current = userId;\s*resetTransactionHistories\(\);/, 'account change');
 assert.match(src, /const stopAuthListener = onAuthUserChange\(supabase, \(\) => \{\s*profileUserIdRef\.current = null;\s*resetTransactionHistories\(\);\s*setShowTokenHistory\(false\);\s*setShowGemHistory\(false\);\s*void loadProfile\(\);\s*\}\);/, 'auth listener clears synchronously');
 assert.match(src, /return \(\) => \{\s*isMounted = false;\s*stopAuthListener\(\);/, 'listener removed on unmount');
});

test('balances keep their verified sources and refresh without reloading full history', () => {
 assert.match(src, /fetchDreamTokenBalance\(supabase, userId\)/, 'DT balance: stored profile balance');
 assert.match(src, /Number\(profile\?\.dream_gem_balance \|\| 0\)/, 'DG balance: stored column');
 assert.ok(!/(tokenTransactions|gemTransactions|tokenHistory\.rows|gemHistory\.rows)\.reduce/.test(src), 'no balance math over history rows');
 // An opened history refreshes with the page, but only its newest page.
 assert.match(src, /if \(tokenHistoryUserIdRef\.current === userId\) \{\s*void loadTokenHistory\(userId\);/);
 assert.match(src, /if \(gemHistoryUserIdRef\.current === userId\) \{\s*void loadGemHistory\(userId\);/);
 for (const event of ['dream-tokens-updated', 'dream-gems-updated', 'dreamscape-membership-updated', 'focus']) {
  assert.match(src, new RegExp(`addEventListener\\(\\s*"${event}"`), `${event} refresh kept`);
 }
});

test('history is still lazy: nothing loads until View History is opened', () => {
 assert.match(src, /function openTokenHistory\(\) \{\s*setShowTokenHistory\(true\);\s*const userId = profileUserIdRef\.current;\s*if \(userId && tokenHistoryUserIdRef\.current !== userId\) \{\s*void loadTokenHistory\(userId\);/);
 assert.match(src, /function openGemHistory\(\) \{\s*setShowGemHistory\(true\);\s*const userId = profileUserIdRef\.current;\s*if \(userId && gemHistoryUserIdRef\.current !== userId\) \{\s*void loadGemHistory\(userId\);/);
 assert.match(src, /onClick=\{openTokenHistory\}/);
 assert.match(src, /onClick=\{openGemHistory\}/);
});

test('this phase writes nothing to ledgers or profiles', () => {
 for (const file of [PROFILE, HELPER]) {
  const s = read(file);
  assert.ok(!/from\(\s*["'](dream_token_transactions|dream_gem_transactions|profiles)["']\s*\)\s*\.(insert|update|upsert|delete)\(/.test(s), `${file} writes`);
 }
 assert.ok(!/supabase|\.from\(/.test(read(HELPER)), 'helper never queries');
});
