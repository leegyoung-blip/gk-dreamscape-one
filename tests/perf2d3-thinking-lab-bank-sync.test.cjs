/** PERF-2D-3: Thinking Lab load and DT refresh; Milo Bank maturity sync held for review. */
const nodeTest = require('node:test');
// A loader waiting on a request that never answers must fail, not hang.
const test = (name, fn) => nodeTest(name, {timeout: 10_000}, fn);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const settle = () => new Promise((r) => setImmediate(r));
const flush = async (n = 5) => { for (let i = 0; i < n; i++) await settle(); };

const LAB = 'app/nova/thinking-skills-lab/page.tsx';
const LAB_SRC = read(LAB);

function slice(src, from, to) {
 const a = src.indexOf(from);
 assert.ok(a >= 0, `missing ${from.slice(0, 50)}`);
 const b = src.indexOf(to, a);
 assert.ok(b > a, `missing end ${to.slice(0, 50)}`);
 return src.slice(a, b + to.length);
}
const js = (code) => ts.transpileModule(code, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;

function requestLog() {
 const calls = [];
 return {
  calls,
  start(name) {
   let resolve;
   const promise = new Promise((res) => { resolve = res; });
   calls.push({name, resolve});
   return promise;
  },
  names() { return calls.map((c) => c.name); },
  async answer(name, value, nth = 0) {
   const c = calls.filter((x) => x.name === name)[nth];
   assert.ok(c, `request ${name} #${nth} was made`);
   c.resolve(value);
   await flush();
  },
 };
}

/* ---------------- Thinking Lab: run the real loadStatus ---------------- */

function labLoader(log, auth) {
 const body = slice(LAB_SRC, '  const loadStatus = useCallback(async () => {', '\n  }, []);');
 const fnText = body.replace('  const loadStatus = useCallback(', 'const loadStatus = (').replace(/\n  \}, \[\]\);$/, '\n  });');
 const setters = [...new Set(body.match(/\bset[A-Z]\w*/g))];
 const state = {};
 const ctx = {
  state,
  statusLoadIdRef: {current: 0},
  userIdRef: {current: null},
  getSingaporeDateKey: () => '2026-10-22',
  createGuestStatus: (d) => ({guest: true, activityDate: d}),
  normaliseStatus: (payload) => ({fromRpc: payload}),
  formatSupabaseError: (e) => `error:${e.message}`,
  EMPTY_PROFILE_ASSETS: {cash: 0, property: 0, stocks: 0},
  fetchDreamTokenBalance: () => log.start('dt-balance'),
  supabase: {
   auth: {getUser: () => log.start('getUser').then(() => ({data: {user: auth.user}, error: null}))},
   rpc: (name) => log.start(`rpc:${name}`),
   from(table) { const chain = {select: () => chain, eq: () => chain, maybeSingle: () => log.start(`from:${table}`), then: (res, rej) => log.start(`from:${table}`).then(res, rej)}; return chain; },
  },
  console: {error() {}, warn() {}},
  Math, Number, Map, String,
 };
 for (const s of setters) ctx[s] = (v) => { state[s] = typeof v === 'function' ? v(state[s]) : v; };
 vm.runInNewContext(`${js(fnText)}\nthis.loadStatus = loadStatus;`, ctx);
 return {loadStatus: ctx.loadStatus, state, ctx};
}
const ok = (data) => ({data, error: null});

async function answerAllReads(log, nth = 0, overrides = {}) {
 const defaults = {
  'rpc:thinking_lab_get_status': ok({activity_date: '2026-10-22'}),
  'from:profiles': ok({dream_gem_balance: 4}),
  'dt-balance': {data: 150, error: null},
  'from:milo_exchange_stocks': ok([{symbol: 'A', current_price: 2}]),
  'from:milo_exchange_holdings': ok([{symbol: 'A', quantity: 10}]),
  'from:milo_exchange_properties': ok([{id: 1, current_value: 100}]),
  'from:milo_exchange_property_holdings': ok([{property_id: 1, quantity: 1}]),
 };
 for (const [name, value] of Object.entries({...defaults, ...overrides})) await log.answer(name, value, nth);
}

test('Thinking Lab: getUser, then status + wallet + assets together (2 stages, 8 requests, unchanged)', async () => {
 const log = requestLog();
 const lab = labLoader(log, {user: {id: 'learner-a'}});
 const done = lab.loadStatus();
 await flush();
 assert.deepEqual(log.names(), ['getUser'], 'nothing user-dependent before the user is known');
 await log.answer('getUser');
 assert.equal(log.calls.length, 8, 'all seven reads started together after getUser');
 await answerAllReads(log);
 await done;
 // Sandbox objects are compared by value.
 const plain = (v) => JSON.parse(JSON.stringify(v));
 assert.deepEqual(plain(lab.state.setStatus), {fromRpc: {activity_date: '2026-10-22'}, tokenBalance: 150});
 assert.deepEqual(plain(lab.state.setProfileAssets), {cash: 150, property: 100, stocks: 20});
 assert.equal(lab.state.setDreamGemBalance, 4);
 assert.equal(lab.state.setLoading, false);
 assert.equal(lab.ctx.userIdRef.current, 'learner-a');
});

test('Thinking Lab: guest makes only getUser and gets the guest status', async () => {
 const log = requestLog();
 const lab = labLoader(log, {user: null});
 lab.state.setStatus = {activityDate: '2026-10-21'}; // yesterday's status on screen
 const done = lab.loadStatus();
 await flush(); await log.answer('getUser');
 await done;
 assert.deepEqual(log.names(), ['getUser']);
 assert.deepEqual(JSON.parse(JSON.stringify(lab.state.setStatus)), {guest: true, activityDate: '2026-10-22'});
 assert.equal(lab.state.setUserId, null);
 assert.equal(lab.state.setLoading, false);
});

test('Thinking Lab: failed optional reads keep the status and other values', async () => {
 const log = requestLog();
 const lab = labLoader(log, {user: {id: 'u'}});
 const done = lab.loadStatus();
 await flush(); await log.answer('getUser');
 await answerAllReads(log, 0, {
  'from:profiles': {data: null, error: {message: 'denied'}},
  'from:milo_exchange_holdings': {data: null, error: {message: 'timeout'}},
 });
 await done;
 assert.equal(lab.state.setDreamGemBalance, 0);
 assert.equal(lab.state.setProfileAssets.stocks, 0);
 assert.equal(lab.state.setProfileAssets.property, 100);
 assert.equal(lab.state.setProfileAssets.cash, 150);
 assert.deepEqual(lab.state.setStatus.fromRpc, {activity_date: '2026-10-22'});
});

test('Thinking Lab: failed status read shows the notice and keeps the previous status', async () => {
 const log = requestLog();
 const lab = labLoader(log, {user: {id: 'u'}});
 const done = lab.loadStatus();
 await flush(); await log.answer('getUser');
 await answerAllReads(log, 0, {'rpc:thinking_lab_get_status': {data: null, error: {message: 'rpc down'}}});
 await done;
 assert.equal(lab.state.setNotice, 'error:rpc down');
 assert.ok(!('setStatus' in lab.state));
 assert.equal(lab.state.setLoading, false);
});

test('Thinking Lab: account switch during a slow request never shows the first learner', async () => {
 const log = requestLog();
 const auth = {user: {id: 'learner-a'}};
 const lab = labLoader(log, auth);
 const first = lab.loadStatus();
 await flush(); await log.answer('getUser', undefined, 0);
 auth.user = {id: 'learner-b'};
 const second = lab.loadStatus();
 await flush(); await log.answer('getUser', undefined, 1);
 await answerAllReads(log, 1, {'dt-balance': {data: 2, error: null}});
 await answerAllReads(log, 0, {'dt-balance': {data: 999, error: null}});
 await Promise.all([first, second]);
 assert.equal(lab.state.setStatus.tokenBalance, 2);
 assert.equal(lab.ctx.userIdRef.current, 'learner-b');
});

test('Thinking Lab: single initialisation, PERF-2C-5 scheduler and rollover unchanged', () => {
 assert.match(LAB_SRC, /const loadStatus = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[\]\);/, 'stable loader');
 assert.match(LAB_SRC, /const scheduler = createRefreshScheduler\(loadStatus\);\s*scheduler\.refresh\(\);/);
 assert.match(LAB_SRC, /const stopTabReturn = onTabReturn\(scheduler\.revalidate\);/);
 assert.match(LAB_SRC, /onAuthUserChange\(supabase, \(\) => \{\s*scheduler\.force\(\);/);
 assert.match(LAB_SRC, /\}, \[loadStatus, refreshCashAndTransactions\]\);/, 'load effect deps unchanged');
 assert.ok(!/supabase\.auth\.onAuthStateChange/.test(LAB_SRC));
 assert.match(LAB_SRC, /if \(status\.activityDate && singaporeDate !== status\.activityDate\) \{\s*loadStatus\(\);\s*setGameVersion\(\(current\) => current \+ 1\);\s*\}\s*\}, 30_000\);/, 'daily rollover kept');
});

/* ---------------- Thinking Lab: DT refresh after clue purchase and completion ---------------- */

function eventTarget() {
 const listeners = new Map();
 return {
  addEventListener(t, f) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(f); },
  removeEventListener(t, f) { listeners.get(t)?.delete(f); },
  // Like the DOM: a throwing listener is reported, not rethrown to the dispatcher.
  errors: [],
  dispatchEvent(e) { for (const f of [...(listeners.get(e.type) || [])]) { try { f(e); } catch (err) { this.errors.push(err); } } return true; },
 };
}

function tokenEventHarness() {
 const announce = slice(LAB_SRC, '  const announceTokenUpdate = useCallback(() => {', '\n  }, []);');
 const listener = slice(LAB_SRC, '    function refreshTokenAssets() {', '\n    }\n');
 const win = eventTarget();
 const reads = [];
 const ctx = {
  window: win,
  Event: class { constructor(type) { this.type = type; } },
  dispatchingOwnTokenEventRef: {current: false},
  userIdRef: {current: 'learner-a'},
  refreshCashAndTransactions: (id) => { reads.push(id); },
 };
 const code = `${js(announce.replace('const announceTokenUpdate = useCallback(', 'const announceTokenUpdate = (').replace(/\n  \}, \[\]\);$/, '\n  });'))}\n${js(listener)}\nthis.announceTokenUpdate = announceTokenUpdate; this.refreshTokenAssets = refreshTokenAssets;`;
 vm.runInNewContext(code, ctx);
 win.addEventListener('dream-tokens-updated', ctx.refreshTokenAssets);
 return {ctx, win, reads};
}

test('Thinking Lab: its own DT event no longer triggers a second identical balance read', () => {
 const h = tokenEventHarness();
 const others = [];
 h.win.addEventListener('dream-tokens-updated', () => others.push('relay / other components'));
 h.ctx.announceTokenUpdate();
 assert.deepEqual(h.reads, [], 'no duplicate read from the page\'s own event');
 assert.deepEqual(others, ['relay / other components'], 'event still reaches everything else');
 assert.equal(h.ctx.dispatchingOwnTokenEventRef.current, false, 'flag cleared after dispatch');
});

test('Thinking Lab: DT events from elsewhere (rewards, purchases, other pages) still refresh the Reactor', () => {
 const h = tokenEventHarness();
 h.win.dispatchEvent({type: 'dream-tokens-updated'});
 assert.deepEqual(h.reads, ['learner-a']);
 h.ctx.userIdRef.current = null;
 h.win.dispatchEvent({type: 'dream-tokens-updated'});
 assert.deepEqual(h.reads, ['learner-a'], 'signed-out: nothing to refresh');
});

test('Thinking Lab: the flag is cleared even if a listener throws', () => {
 const h = tokenEventHarness();
 h.win.addEventListener('dream-tokens-updated', () => { throw new Error('listener failed'); });
 h.ctx.announceTokenUpdate();
 assert.equal(h.win.errors.length, 1, 'listener error reported, dispatch completed');
 assert.equal(h.ctx.dispatchingOwnTokenEventRef.current, false);
 h.win.dispatchEvent({type: 'dream-tokens-updated'});
 assert.ok(h.reads.length >= 1, 'later external events still refresh');
});

test('Thinking Lab: an external wallet event dispatched during its own event is not discarded', () => {
 // Another component reacts to the Lab's event by announcing a real change of its own.
 for (const order of ['other listener first', 'Lab listener first']) {
  const h = tokenEventHarness();
  const nested = () => {
   if (nested.fired) return;
   nested.fired = true;
   h.win.dispatchEvent({type: 'dream-tokens-updated'}); // external change, same tick
  };
  if (order === 'other listener first') {
   h.win.removeEventListener('dream-tokens-updated', h.ctx.refreshTokenAssets);
   h.win.addEventListener('dream-tokens-updated', nested);
   h.win.addEventListener('dream-tokens-updated', h.ctx.refreshTokenAssets);
  } else {
   h.win.addEventListener('dream-tokens-updated', nested);
  }
  h.ctx.announceTokenUpdate();
  assert.equal(h.reads.length, 1, `${order}: the external change still refreshes once`);
  assert.equal(h.ctx.dispatchingOwnTokenEventRef.current, false);
 }
});

test('Thinking Lab: wallet events right after, or later from another tab, still refresh', async () => {
 const h = tokenEventHarness();
 h.ctx.announceTokenUpdate();
 h.win.dispatchEvent({type: 'dream-tokens-updated'}); // e.g. a reward elsewhere, same tick
 assert.equal(h.reads.length, 1);
 await new Promise((r) => setTimeout(r, 5));
 h.win.dispatchEvent({type: 'dream-tokens-updated'}); // later (e.g. relayed purchase)
 assert.equal(h.reads.length, 2);
 h.ctx.announceTokenUpdate();
 h.ctx.announceTokenUpdate();
 assert.equal(h.reads.length, 2, 'each own event skips only itself');
});

test('Thinking Lab: announcing while its listener is detached never swallows a later external event', () => {
 const h = tokenEventHarness();
 h.win.removeEventListener('dream-tokens-updated', h.ctx.refreshTokenAssets); // e.g. mid-unmount
 h.ctx.announceTokenUpdate();
 assert.equal(h.ctx.dispatchingOwnTokenEventRef.current, false, 'flag reset by the dispatcher itself');
 h.win.addEventListener('dream-tokens-updated', h.ctx.refreshTokenAssets);
 h.win.dispatchEvent({type: 'dream-tokens-updated'});
 assert.equal(h.reads.length, 1, 'the next external event refreshes');
});

function balanceRefresher(fetchResult) {
 const body = slice(LAB_SRC, '  const refreshCashAndTransactions = useCallback(', '\n    []\n  );');
 const fnText = body.replace('  const refreshCashAndTransactions = useCallback(', 'const refreshCashAndTransactions = (').replace(/,\n    \[\]\n  \);$/, '\n  );');
 const state = {setStatus: {tokenBalance: 140, games: 'kept'}, setProfileAssets: {cash: 140, stocks: 3}};
 const writes = [];
 const ctx = {
  userIdRef: {current: 'learner-a'},
  supabase: {},
  fetchDreamTokenBalance: async () => fetchResult(),
  console: {warn() {}},
  setStatus: (f) => { writes.push('status'); state.setStatus = f(state.setStatus); },
  setProfileAssets: (f) => { writes.push('assets'); state.setProfileAssets = f(state.setProfileAssets); },
 };
 vm.runInNewContext(`${js(fnText)}\nthis.refresh = refreshCashAndTransactions;`, ctx);
 return {refresh: ctx.refresh, state, writes, ctx};
}

test('Thinking Lab: a failed balance read never shows a wrong balance, and later refreshes still apply', async () => {
 let result = {data: 0, error: {message: 'timeout'}};
 const r = balanceRefresher(() => result);
 await r.refresh('learner-a');
 assert.deepEqual(r.writes, [], 'failed read: the balance from the write RPC stays on screen (no 0)');
 assert.equal(r.state.setStatus.tokenBalance, 140);
 result = {data: 155, error: null};
 await r.refresh('learner-a');
 assert.equal(r.state.setStatus.tokenBalance, 155);
 assert.equal(r.state.setProfileAssets.cash, 155);
 assert.equal(r.state.setProfileAssets.stocks, 3);
 assert.equal(r.state.setStatus.games, 'kept');
 // Account switched while the read was in flight: the reply is dropped.
 r.ctx.userIdRef.current = 'learner-b';
 result = {data: 999, error: null};
 await r.refresh('learner-a');
 assert.equal(r.state.setStatus.tokenBalance, 155);
});

test('Thinking Lab: clue purchase and completion — one write each, Reactor updated at once, one awaited refresh', () => {
 const clue = slice(LAB_SRC, '"thinking_lab_buy_clue",', '    [announceTokenUpdate, refreshCashAndTransactions, status.games, userId]');
 const done = slice(LAB_SRC, '"thinking_lab_complete_question",', '    [announceTokenUpdate, refreshCashAndTransactions, status.games, userId]');
 for (const [name, block] of [['clue', clue], ['completion', done]]) {
  assert.equal((block.match(/supabase\.rpc\(/g) || []).length, 0, `${name}: no second write`);
  assert.match(block, /tokenBalance: result\.tokenBalance,/, `${name}: Reactor uses the RPC balance at once`);
  assert.match(block, /setProfileAssets\(\(current\) => \(\{\s*\.\.\.current,\s*cash: result\.tokenBalance,\s*\}\)\);/);
  assert.match(block, /await refreshCashAndTransactions\(userId\);\s*announceTokenUpdate\(\);/, `${name}: refresh, then announce`);
 }
 assert.equal((LAB_SRC.match(/"thinking_lab_buy_clue"/g) || []).length, 1);
 assert.equal((LAB_SRC.match(/"thinking_lab_complete_question"/g) || []).length, 1);
 assert.equal((LAB_SRC.match(/window\.dispatchEvent\(new Event\("dream-tokens-updated"\)\)/g) || []).length, 1, 'only inside announceTokenUpdate');
 assert.match(done, /if \(Number\.isFinite\(result\.reward\) && result\.reward > 0\) \{/, 'reward animation rule unchanged');
});

/* ---------------- Milo Bank: maturity sync held for review ---------------- */

test('Milo Bank: no maturity-driven account refresh was added (RPC semantics unverified)', () => {
 const bonds = read('app/milo-world/bank/hooks/useBankBonds.ts');
 const account = read('app/milo-world/bank/hooks/useBankAccount.ts');
 assert.match(bonds, /\n      await refreshBondMaturities\(\);\n/, 'result not used to emit events');
 assert.ok(!/PERF-2D-3/.test(bonds) && !/PERF-2D-3/.test(account), 'bank hooks untouched in this phase');
 assert.ok(!/refreshBondMaturities|refresh_milo_bank_bond_maturities/.test(account), 'account refresh never settles maturities');
 assert.equal((bonds.match(/refreshBondMaturities\(\)/g) || []).length, 1, 'one maturity write per bonds load');
});

test('Milo Bank: read-only inspection query is catalog-only', () => {
 const sql = read('sql/perf-2d3-read-only-bank-maturity-inspection.sql').replace(/--.*$/gm, '');
 assert.ok(!/\b(insert|update|delete|create|alter|drop|grant|revoke|truncate|call|do)\b/i.test(sql.replace(/pg_get_\w+|provolatile|prosecdef|proconfig|contype/g, '')), 'no write or DDL statements');
 assert.ok(!/\bselect\b[\s\S]*\brefresh_milo_bank_bond_maturities\s*\(/i.test(sql), 'never calls the maturity routine');
 assert.match(sql, /from pg_proc p/);
});
