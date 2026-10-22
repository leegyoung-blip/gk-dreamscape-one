/** PERF-2D-2: Knowledge Arena and Milo Bank bonds run independent reads together; ordered operations stay ordered. */
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

/* ---------------- Controllable requests ---------------- */

// Every request is a deferred promise; the test decides when (and how) each one answers.
function requestLog() {
 const calls = [];
 return {
  calls,
  start(name, meta = {}) {
   let resolve, reject;
   const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
   calls.push({name, ...meta, resolve, reject, done: false});
   const entry = calls[calls.length - 1];
   return promise.finally(() => { entry.done = true; });
  },
  pending(name) { return this.calls.filter((c) => c.name === name && !c.done); },
  names() { return this.calls.map((c) => c.name); },
  async answer(name, value, {error = false} = {}) {
   const c = this.calls.find((x) => x.name === name && !x.answered);
   assert.ok(c, `request ${name} was made`);
   c.answered = true;
   error ? c.reject(value) : c.resolve(value);
   await flush();
  },
 };
}

/* ---------------- Knowledge Arena: run the page's real loadUser ---------------- */

const ARENA = 'app/learning-missions/knowledge-arena/page.tsx';

function arenaLoader(log, auth) {
 const src = read(ARENA);
 const a = src.indexOf('    async function loadUser() {');
 const b = src.indexOf('\n    // A battle reward dispatches', a);
 assert.ok(a > 0 && b > a, 'loadUser found');
 const fn = src.slice(a, b);
 const js = ts.transpileModule(fn, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
 const setters = [...new Set(fn.match(/\bset[A-Z]\w*/g))];
 const state = {};
 const calls = [];
 const ctx = {state, calls, supabase: arenaClient(log, auth)};
 for (const s of setters) ctx[s] = (v) => { state[s] = v; calls.push(s); };
 const wrapper = `(function(){ let isMounted = true; let latestLoadId = 0; ${js}\n return {loadUser, unmount(){ isMounted = false; }}; })()`;
 const api = vm.runInNewContext(wrapper, ctx);
 return {...api, state, calls};
}
function arenaClient(log, auth) {
 return {
  auth: {getUser: () => log.start('getUser').then(() => ({data: {user: auth.user}}))},
  from(table) {
   const chain = {select: () => chain, eq: () => chain, maybeSingle: () => log.start(`from:${table}`)};
   return chain;
  },
  rpc: (name) => log.start(`rpc:${name}`),
 };
}
const USER = (id) => ({id, email: `${id}@example.test`});

test('Knowledge Arena: getUser first, then role, balances and upgrade all in flight together (4 → 2 stages)', async () => {
 const log = requestLog();
 const auth = {user: USER('learner-a')};
 const arena = arenaLoader(log, auth);
 const done = arena.loadUser();
 await flush();
 assert.deepEqual(log.names(), ['getUser'], 'nothing user-dependent before the user is known');
 await log.answer('getUser');
 assert.deepEqual(log.names().slice(1).sort(), ['from:profiles', 'rpc:get_my_dreamscape_balances', 'rpc:get_my_knowledge_arena_nova_upgrade_v1']);
 assert.equal(log.calls.filter((c) => !c.done).length, 3, 'all three pending at once');
 await log.answer('from:profiles', {data: {role: 'student'}});
 await log.answer('rpc:get_my_dreamscape_balances', {data: [{token_balance: 120, gem_balance: 7}], error: null});
 await log.answer('rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: {attack_level: 3, attack_bonus_pct: 15, effective_base_damage: 23, next_upgrade_cost: 40, max_level: 50}, error: null});
 await done;
 assert.equal(arena.state.setUserId, 'learner-a');
 assert.equal(arena.state.setIsAdmin, false);
 assert.equal(arena.state.setTokenBalance, 120);
 assert.equal(arena.state.setGemBalance, 7);
 assert.equal(arena.state.setNovaAttackLevel, 3);
 assert.equal(arena.state.setNovaAttackDamage, 23);
 assert.equal(log.calls.length, 4, 'same four requests as before');
});

test('Knowledge Arena: admin / teacher / student roles map to isAdmin exactly as before', async () => {
 for (const [role, expected] of [['admin', true], [' Admin ', true], ['teacher', false], ['curriculum_lead', false], ['student', false], [null, false]]) {
  const log = requestLog();
  const arena = arenaLoader(log, {user: USER('u')});
  const done = arena.loadUser();
  await flush(); await log.answer('getUser');
  await log.answer('from:profiles', {data: role === null ? null : {role}});
  await log.answer('rpc:get_my_dreamscape_balances', {data: null, error: {message: 'x'}});
  await log.answer('rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: null, error: null});
  await done;
  assert.equal(arena.state.setIsAdmin, expected, String(role));
 }
});

test('Knowledge Arena: guest makes only getUser and resets the arena state', async () => {
 const log = requestLog();
 const arena = arenaLoader(log, {user: null});
 const done = arena.loadUser();
 await flush(); await log.answer('getUser');
 await done;
 assert.deepEqual(log.names(), ['getUser']);
 assert.equal(arena.state.setUserId, null);
 assert.equal(arena.state.setTokenBalance, 0);
 assert.equal(arena.state.setGemBalance, 0);
 assert.equal(arena.state.setNovaAttackDamage, 20);
 assert.equal(arena.state.setIsAdmin, false);
});

test('Knowledge Arena: a failed optional read keeps the other results', async () => {
 // Upgrade read fails: role and balances still applied, upgrade state untouched.
 let log = requestLog();
 let arena = arenaLoader(log, {user: USER('u')});
 let done = arena.loadUser();
 await flush(); await log.answer('getUser');
 await log.answer('rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: null, error: {message: 'denied'}});
 await log.answer('from:profiles', {data: {role: 'admin'}});
 await log.answer('rpc:get_my_dreamscape_balances', {data: {token_balance: 5, gem_balance: 2}, error: null});
 await done;
 assert.equal(arena.state.setIsAdmin, true);
 assert.equal(arena.state.setTokenBalance, 5);
 assert.ok(!('setNovaAttackLevel' in arena.state), 'upgrade state not overwritten on error');
 // Balances read fails: balances untouched (as before), upgrade still applied.
 log = requestLog();
 arena = arenaLoader(log, {user: USER('u')});
 done = arena.loadUser();
 await flush(); await log.answer('getUser');
 await log.answer('rpc:get_my_dreamscape_balances', {data: null, error: {message: 'timeout'}});
 await log.answer('from:profiles', {data: {role: 'student'}});
 await log.answer('rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: [{attack_level: 1}], error: null});
 await done;
 assert.ok(!('setTokenBalance' in arena.state) && !('setGemBalance' in arena.state));
 assert.equal(arena.state.setNovaAttackLevel, 1);
});

test('Knowledge Arena: missing profile row → not admin, balances from the balances RPC only', async () => {
 const log = requestLog();
 const arena = arenaLoader(log, {user: USER('u')});
 const done = arena.loadUser();
 await flush(); await log.answer('getUser');
 await log.answer('from:profiles', {data: null, error: null});
 await log.answer('rpc:get_my_dreamscape_balances', {data: [{token_balance: 9, gem_balance: 1}], error: null});
 await log.answer('rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: null, error: null});
 await done;
 assert.equal(arena.state.setIsAdmin, false);
 assert.equal(arena.state.setTokenBalance, 9);
});

test('Knowledge Arena: account switch during a slow request never shows the first learner', async () => {
 const log = requestLog();
 const auth = {user: USER('learner-a')};
 const arena = arenaLoader(log, auth);
 const first = arena.loadUser();
 await flush(); await log.answer('getUser'); // A's reads now in flight
 auth.user = USER('learner-b');
 const second = arena.loadUser();
 await flush(); await log.answer('getUser');
 // B answers first, then A's slow replies arrive.
 for (const [name, value] of [['from:profiles', {data: {role: 'student'}}], ['rpc:get_my_dreamscape_balances', {data: {token_balance: 2, gem_balance: 2}, error: null}], ['rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: {attack_level: 2}, error: null}]]) {
  const calls = log.calls.filter((c) => c.name === name);
  calls[1].answered = true; calls[1].resolve(value);
 }
 await flush();
 for (const [name, value] of [['from:profiles', {data: {role: 'admin'}}], ['rpc:get_my_dreamscape_balances', {data: {token_balance: 999, gem_balance: 999}, error: null}], ['rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: {attack_level: 50}, error: null}]]) {
  const calls = log.calls.filter((c) => c.name === name);
  calls[0].answered = true; calls[0].resolve(value);
 }
 await Promise.all([first, second]);
 assert.equal(arena.state.setUserId, 'learner-b');
 assert.equal(arena.state.setTokenBalance, 2);
 assert.equal(arena.state.setIsAdmin, false);
 assert.equal(arena.state.setNovaAttackLevel, 2);
});

test('Knowledge Arena: leaving the page mid-load sets nothing afterwards', async () => {
 const log = requestLog();
 const arena = arenaLoader(log, {user: USER('u')});
 const done = arena.loadUser();
 await flush(); await log.answer('getUser');
 const before = arena.calls.length;
 arena.unmount();
 await log.answer('from:profiles', {data: {role: 'admin'}});
 await log.answer('rpc:get_my_dreamscape_balances', {data: {token_balance: 1}, error: null});
 await log.answer('rpc:get_my_knowledge_arena_nova_upgrade_v1', {data: {attack_level: 1}, error: null});
 await done;
 assert.equal(arena.calls.length, before);
});

test('Knowledge Arena: reward/purchase refresh, auth switch and upgrade purchase wiring unchanged', () => {
 const src = read(ARENA);
 assert.match(src, /const scheduler = createRefreshScheduler\(loadUser\);\s*scheduler\.refresh\(\);/);
 assert.match(src, /const refreshBalances = \(\) => scheduler\.refresh\(\);\s*window\.addEventListener\("dream-tokens-updated", refreshBalances\);\s*window\.addEventListener\("dream-gems-updated", refreshBalances\);/);
 assert.match(src, /onAuthUserChange\(supabase, \(\) => scheduler\.force\(\)\)/);
 assert.match(src, /"upgrade_knowledge_arena_nova_attack_v1"/, 'upgrades still bought through their own RPC');
 assert.equal((src.match(/get_my_knowledge_arena_nova_upgrade_v1/g) || []).length, 1);
 assert.equal((src.match(/get_my_dreamscape_balances/g) || []).length, 1);
 // Battle reward still dispatches both wallet events (one reload via the scheduler).
 assert.match(read('app/learning-missions/knowledge-arena/useKnowledgeArenaBattle.ts'), /dispatchEvent\(new Event\("dream-tokens-updated"\)\);\s*window\.dispatchEvent\(new Event\("dream-gems-updated"\)\);/);
});

/* ---------------- Milo Bank bonds: run the real hook ---------------- */

function loadTs(rel, requireMap, globals) {
 const out = ts.transpileModule(read(rel), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
 const mod = {exports: {}};
 vm.runInNewContext(out, {exports: mod.exports, module: mod, require: (id) => {
  if (!(id in requireMap)) throw new Error('unexpected import ' + id);
  return requireMap[id];
 }, ...globals});
 return mod.exports;
}

function eventTarget() {
 const listeners = new Map();
 return {
  addEventListener(t, f) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(f); },
  removeEventListener(t, f) { listeners.get(t)?.delete(f); },
  dispatchEvent(e) { for (const f of [...(listeners.get(e.type) || [])]) f(e); return true; },
  dispatch(t) { this.dispatchEvent({type: t}); },
 };
}

function bondsHarness({auth}) {
 const log = requestLog();
 const win = eventTarget();
 const doc = Object.assign(eventTarget(), {visibilityState: 'visible'});
 // Error is shared so the hook's `instanceof Error` sees the test's errors.
 const globals = {window: win, document: doc, queueMicrotask, Promise, Date, console, Error, Event: class { constructor(type) { this.type = type; } }, BroadcastChannel: undefined};
 const authListeners = [];
 const supabase = {auth: {
  getUser: () => log.start('getUser').then(() => ({data: {user: auth.user}})),
  onAuthStateChange: (cb) => { authListeners.push(cb); return {data: {subscription: {unsubscribe() {}}}}; },
 }};
 const bondApi = {
  listBondProducts: () => log.start('products'),
  refreshBondMaturities: () => log.start('maturities'),
  listBondHoldings: () => log.start('holdings'),
  listBondEvents: () => log.start('events'),
  getBondEligibility: () => log.start('eligibility'),
  purchaseBond: (...args) => log.start('purchase', {args}),
  settleBond: (...args) => log.start('settle', {args}),
 };
 const scheduler = loadTs('lib/client/refreshScheduler.ts', {}, globals);
 const authHelper = loadTs('lib/auth/onAuthUserChange.ts', {}, globals);
 // Minimal React: one render; state lives in slots, effects are collected.
 const slots = []; const effects = []; let i = 0;
 const react = {
  useState: (init) => { const k = i++; if (!(k in slots)) slots[k] = init; return [slots[k], (v) => { slots[k] = typeof v === 'function' ? v(slots[k]) : v; }]; },
  useRef: (init) => { const k = i++; if (!(k in slots)) slots[k] = {current: init}; return slots[k]; },
  useCallback: (fn) => fn,
  useEffect: (fn) => effects.push(fn),
 };
 const hookMod = loadTs('app/milo-world/bank/hooks/useBankBonds.ts', {
  react, '@/lib/auth/onAuthUserChange': authHelper, '@/lib/client/refreshScheduler': scheduler,
  '@/lib/supabase': {supabase}, '../lib/bond-api': bondApi,
 }, globals);
 const hook = hookMod.useBankBonds();
 // Slot order in the hook: products, holdings, events, eligibility, loading, actionLoading, isLoggedIn, error, ref.
 const state = () => ({products: slots[0], holdings: slots[1], events: slots[2], eligibility: slots[3], loading: slots[4], isLoggedIn: slots[6], error: slots[7]});
 return {log, hook, state, win, doc, effects, authListeners};
}

test('Bonds: products load alongside getUser; maturity waits for the user; reads wait for maturity (4 → 3 stages)', async () => {
 const h = bondsHarness({auth: {user: USER('learner-a')}});
 const done = h.hook.refresh();
 await flush();
 assert.deepEqual(h.log.names().sort(), ['getUser', 'products'], 'products and getUser together');
 await h.log.answer('products', [{id: 'p1'}]);
 assert.equal(h.log.pending('maturities').length + h.log.calls.filter((c) => c.name === 'maturities').length, 0, 'no maturity write before the user is known');
 await h.log.answer('getUser');
 assert.deepEqual(h.log.names().slice(2), ['maturities'], 'maturity write alone');
 await h.log.answer('maturities', 0);
 assert.deepEqual(h.log.names().slice(3).sort(), ['eligibility', 'events', 'holdings'], 'reads only after maturity completed');
 await h.log.answer('holdings', [{id: 'h1', status: 'active'}]);
 await h.log.answer('events', []);
 await h.log.answer('eligibility', {eligibleDt: 300, activePrincipal: 100, pendingInterest: 4, settledInterest: 0});
 await done;
 const s = h.state();
 assert.deepEqual(Array.from(s.products, (p) => p.id), ['p1']);
 assert.equal(s.holdings[0].id, 'h1');
 assert.equal(s.eligibility.eligibleDt, 300);
 assert.equal(s.eligibility.activePrincipal, 100, 'locked principal straight from the eligibility RPC');
 assert.equal(s.isLoggedIn, true);
 assert.equal(s.loading, false);
 assert.equal(h.log.calls.length, 6, 'same six requests as before');
});

test('Bonds: guest sees products only; no maturity write and no holdings reads', async () => {
 const h = bondsHarness({auth: {user: null}});
 const done = h.hook.refresh();
 await flush();
 await h.log.answer('getUser');
 await h.log.answer('products', [{id: 'p1'}]);
 // Checked before awaiting the load, so a stray request fails here instead of hanging.
 assert.deepEqual(h.log.names().sort(), ['getUser', 'products']);
 await done;
 const s = h.state();
 assert.equal(s.isLoggedIn, false);
 assert.deepEqual(Array.from(s.holdings), []);
 assert.equal(s.eligibility.eligibleDt, 0);
 assert.equal(s.loading, false);
});

test('Bonds: failed maturity settlement → error shown, no stale reads, loading cleared', async () => {
 const h = bondsHarness({auth: {user: USER('u')}});
 const done = h.hook.refresh();
 await flush();
 await h.log.answer('getUser'); await h.log.answer('products', []);
 await h.log.answer('maturities', new Error('maturity failed'), {error: true});
 await done;
 assert.ok(!h.log.names().includes('holdings'), 'holdings never read after a failed settlement');
 assert.equal(h.state().error, 'maturity failed');
 assert.equal(h.state().loading, false);
});

test('Bonds: failed product read fails the load as before (and never starts a maturity write)', async () => {
 const h = bondsHarness({auth: {user: USER('u')}});
 const done = h.hook.refresh();
 await flush();
 await h.log.answer('products', new Error('products failed'), {error: true});
 await h.log.answer('getUser');
 await done;
 assert.equal(h.state().error, 'products failed');
 assert.ok(!h.log.names().includes('maturities'));
 assert.equal(h.state().loading, false);
});

test('Bonds: account switch during the maturity write → first learner\'s reads are skipped and never shown', async () => {
 const auth = {user: USER('learner-a')};
 const h = bondsHarness({auth});
 const first = h.hook.refresh();
 await flush(); await h.log.answer('getUser'); await h.log.answer('products', []);
 assert.equal(h.log.pending('maturities').length, 1);
 auth.user = USER('learner-b');
 const second = h.hook.refresh();
 await flush(); await h.log.answer('getUser'); await h.log.answer('products', []);
 // A's maturity finishes late: its reads are skipped.
 await h.log.answer('maturities', 0);
 assert.equal(h.log.calls.filter((c) => c.name === 'holdings').length, 0, 'A reads skipped');
 await h.log.answer('maturities', 0);
 await h.log.answer('holdings', [{id: 'b-holding'}]);
 await h.log.answer('events', []);
 await h.log.answer('eligibility', {eligibleDt: 1, activePrincipal: 0, pendingInterest: 0, settledInterest: 0});
 await Promise.all([first, second]);
 assert.deepEqual(Array.from(h.state().holdings, (x) => x.id), ['b-holding']);
 assert.equal(h.log.calls.filter((c) => c.name === 'holdings').length, 1);
});

test('Bonds: concurrent refresh events and tab returns never overlap settlement writes', async () => {
 const h = bondsHarness({auth: {user: USER('u')}});
 for (const effect of h.effects) effect();
 await flush();
 // Initial load in flight. Purchases, wallet events and tab returns arrive meanwhile.
 h.win.dispatch('milo-bank-bonds-updated');
 h.win.dispatch('dream-tokens-updated');
 h.win.dispatch('milo-bank-savings-updated');
 h.win.dispatch('focus');
 h.doc.dispatch('visibilitychange');
 await flush();
 assert.equal(h.log.calls.filter((c) => c.name === 'getUser').length, 1, 'no overlapping load');
 const finishLoad = async () => {
  await h.log.answer('getUser'); await h.log.answer('products', []);
  await h.log.answer('maturities', 0);
  await h.log.answer('holdings', []); await h.log.answer('events', []);
  await h.log.answer('eligibility', {eligibleDt: 0, activePrincipal: 0, pendingInterest: 0, settledInterest: 0});
 };
 await finishLoad();
 assert.equal(h.log.calls.filter((c) => c.name === 'maturities').length, 1);
 // Exactly one queued load for all the changes above.
 await finishLoad();
 await flush();
 assert.equal(h.log.calls.filter((c) => c.name === 'maturities').length, 2);
 assert.equal(h.log.calls.filter((c) => c.name === 'getUser').length, 2);
 // Returning to the tab later (bond may have matured) always revalidates.
 h.win.dispatch('focus');
 await flush();
 assert.equal(h.log.calls.filter((c) => c.name === 'getUser').length, 3, 'tab return revalidates (freshnessMs 0)');
 await finishLoad();
 const at = (n) => h.log.calls.findIndex((c, k) => c.name === 'maturities' && h.log.calls.slice(0, k + 1).filter((x) => x.name === 'maturities').length === n);
 for (let n = 1; n <= 3; n++) {
  const m = at(n);
  const nextHoldings = h.log.calls.findIndex((c, k) => k > m && c.name === 'holdings');
  assert.ok(m >= 0 && nextHoldings > m, `holdings after maturity ${n}`);
 }
});

test('Bonds: purchase and settlement keep their order and refresh events', async () => {
 const h = bondsHarness({auth: {user: USER('u')}});
 const seen = [];
 h.win.addEventListener('milo-bank-bonds-updated', () => seen.push('bonds-updated'));
 h.win.addEventListener('dream-tokens-updated', () => seen.push('tokens-updated'));
 const buying = h.hook.buyBond('product-1', 250.9);
 await flush();
 assert.deepEqual(seen, [], 'no refresh before the purchase completes');
 assert.deepEqual(Array.from(h.log.calls.find((c) => c.name === 'purchase').args), ['product-1', 250.9]);
 await h.log.answer('purchase', {id: 'h1'});
 await buying;
 assert.deepEqual(seen, ['bonds-updated']);
 const settling = h.hook.settleBond('h1');
 await flush();
 await h.log.answer('settle', {id: 'h1', status: 'settled'});
 await settling;
 assert.deepEqual(seen, ['bonds-updated', 'tokens-updated']);
 assert.equal(h.log.calls.filter((c) => c.name === 'purchase').length, 1, 'no duplicate purchase write');
 assert.equal(h.log.calls.filter((c) => c.name === 'settle').length, 1, 'no duplicate settlement write');
});

/* ---------------- Unchanged ---------------- */

test('Milo Bank account summary, locked-fund formula and bond helpers are unchanged', () => {
 const account = read('app/milo-world/bank/hooks/useBankAccount.ts');
 assert.match(account, /supabase\.rpc\("get_milo_bank_account_summary"\)/);
 assert.match(account, /available = Math\.max\(totalDt - savings - bonds, 0\);/);
 assert.match(account, /createRefreshScheduler\(loadAccount, \{ freshnessMs: 0 \}\)/);
 assert.ok(!/PERF-2D-2/.test(account), 'account hook not changed in this phase');
 const api = read('app/milo-world/bank/lib/bond-api.ts');
 assert.match(api, /supabase\.rpc\("refresh_milo_bank_bond_maturities"\)/);
 assert.match(api, /supabase\.rpc\("purchase_milo_bank_bond", \{/);
 assert.match(api, /supabase\.rpc\("settle_milo_bank_bond", \{/);
 const bonds = read('app/milo-world/bank/hooks/useBankBonds.ts');
 assert.match(bonds, /createRefreshScheduler\(load, \{ freshnessMs: 0 \}\)/);
 assert.match(bonds, /await refreshBondMaturities\(\);\s*\/\/[^\n]*\n\s*if \(isStale\(\)\) return;\s*const \[bondHoldings, bondEvents, bondEligibility\] = await Promise\.all\(\[/);
});

test('other PERF work and learning pages are untouched by this phase', () => {
 for (const file of ['app/profile/page.tsx', 'app/milo-world/page.tsx', 'app/learning-missions/page.tsx', 'app/inventor/page.tsx', 'app/inventor/hub/page.tsx', 'lib/client/refreshScheduler.ts', 'lib/wallet/dreamTokenBalance.ts']) {
  assert.ok(!/PERF-2D-2/.test(read(file)), file);
 }
 assert.equal((read('app/profile/page.tsx').match(/\.limit\(TRANSACTION_HISTORY_PAGE_SIZE \+ 1\)/g) || []).length, 4, 'Profile pagination');
});
