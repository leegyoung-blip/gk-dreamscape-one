/** PERF-2D-4: Milo Exchange hub and Stocks load independent reads together; writes, trading and Core access unchanged. */
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
const js = (code) => ts.transpileModule(code, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
const plain = (v) => JSON.parse(JSON.stringify(v));

function slice(src, from, to) {
 const a = src.indexOf(from);
 assert.ok(a >= 0, `missing ${from.slice(0, 50)}`);
 const b = src.indexOf(to, a);
 assert.ok(b > a, `missing end ${to.slice(0, 50)}`);
 return src.slice(a, b + to.length);
}

function requestLog() {
 const calls = [];
 return {
  calls,
  start(name, meta = {}) {
   let resolve;
   const promise = new Promise((res) => { resolve = res; });
   calls.push({name, ...meta, resolve});
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

/* ---------------- Exchange hub: run the real loadPropertyPortfolio ---------------- */

const HUB = 'app/milo-world/exchange/page.tsx';
const HUB_SRC = read(HUB);

function hubPortfolio(log, id = 'learner-a') {
 const fn = slice(HUB_SRC, '  async function loadPropertyPortfolio(id: string) {', '\n    setPropertyMarketReady(true);\n  }\n');
 const setters = [...new Set(fn.match(/\bset[A-Z]\w*/g))];
 const state = {};
 const ctx = {
  state,
  activeUserIdRef: {current: id},
  console: {warn() {}},
  Number, String,
  supabase: {
   from(table) {
    const filters = [];
    const chain = {
     select: () => chain,
     eq: (col, val) => { filters.push([col, val]); return chain; },
     then: (res, rej) => log.start(`from:${table}`, {filters}).then(res, rej),
    };
    return chain;
   },
   rpc: (name) => log.start(`rpc:${name}`),
  },
 };
 for (const s of setters) ctx[s] = (v) => { state[s] = v; };
 vm.runInNewContext(`${js(fn)}\nthis.load = loadPropertyPortfolio;`, ctx);
 return {load: ctx.load, state};
}
const RPCS = ['rpc:get_my_milo_exchange_property_portfolio_value', 'rpc:get_my_milo_exchange_property_equity_value', 'rpc:get_my_milo_property_finance_dashboard'];

test('Exchange hub: property list and holdings load together; portfolio RPCs wait for both (3 → 2 stages)', async () => {
 const log = requestLog();
 const hub = hubPortfolio(log);
 const done = hub.load('learner-a');
 await flush();
 assert.deepEqual(log.names().sort(), ['from:milo_exchange_properties', 'from:milo_exchange_property_holdings']);
 const holdings = log.calls.find((c) => c.name === 'from:milo_exchange_property_holdings');
 assert.deepEqual(holdings.filters, [['user_id', 'learner-a']], 'only this learner\'s holdings');
 await log.answer('from:milo_exchange_property_holdings', {data: [{id: 'h1', property_id: 'p1', quantity: 2}], error: null});
 assert.equal(log.calls.length, 2, 'RPCs do not start before the property list');
 await log.answer('from:milo_exchange_properties', {data: [{id: 'p1', current_value: 500}], error: null});
 assert.deepEqual(log.names().slice(2).sort(), [...RPCS].sort(), 'RPCs after both reads');
 await log.answer(RPCS[0], {data: 1000, error: null});
 await log.answer(RPCS[1], {data: 800, error: null});
 await log.answer(RPCS[2], {data: {stats: {debt_balance: 200}}, error: null});
 await done;
 assert.deepEqual(plain(hub.state.setProperties), [{id: 'p1', current_value: 500}]);
 assert.deepEqual(plain(hub.state.setPropertyHoldings), [{id: 'h1', property_id: 'p1', quantity: 2}]);
 assert.equal(hub.state.setManagedPropertyValue, 1000);
 assert.equal(hub.state.setManagedPropertyEquity, 800);
 assert.equal(hub.state.setPropertyDebt, 200);
 assert.equal(hub.state.setPropertyMarketReady, true);
 assert.equal(log.calls.length, 5, 'same five requests');
});

test('Exchange hub: failed property list → same reset as before, no portfolio RPCs', async () => {
 const log = requestLog();
 const hub = hubPortfolio(log);
 const done = hub.load('learner-a');
 await flush();
 await log.answer('from:milo_exchange_properties', {data: null, error: {message: 'down'}});
 await log.answer('from:milo_exchange_property_holdings', {data: [{id: 'h1'}], error: null});
 assert.ok(!log.names().some((n) => n.startsWith('rpc:')), 'checked before awaiting the load');
 await done;
 assert.deepEqual(plain(hub.state.setProperties), []);
 assert.deepEqual(plain(hub.state.setPropertyHoldings), [], 'holdings not shown without the market');
 assert.equal(hub.state.setManagedPropertyValue, null);
 assert.equal(hub.state.setPropertyDebt, 0);
 assert.equal(hub.state.setPropertyMarketReady, false);
 assert.ok(!log.names().some((n) => n.startsWith('rpc:')));
});

test('Exchange hub: failed holdings read → properties shown, holdings empty, no portfolio RPCs', async () => {
 const log = requestLog();
 const hub = hubPortfolio(log);
 const done = hub.load('learner-a');
 await flush();
 await log.answer('from:milo_exchange_property_holdings', {data: null, error: {message: 'rls'}});
 await log.answer('from:milo_exchange_properties', {data: [{id: 'p1'}], error: null});
 // Checked before awaiting the load, so a stray RPC fails here instead of hanging.
 assert.ok(!log.names().some((n) => n.startsWith('rpc:')));
 await done;
 assert.deepEqual(plain(hub.state.setProperties), [{id: 'p1'}]);
 assert.deepEqual(plain(hub.state.setPropertyHoldings), []);
 assert.equal(hub.state.setPropertyMarketReady, false);
 assert.ok(!log.names().some((n) => n.startsWith('rpc:')));
});

test('Exchange hub: a failed portfolio RPC keeps the others (valuation applied as before)', async () => {
 const log = requestLog();
 const hub = hubPortfolio(log);
 const done = hub.load('learner-a');
 await flush();
 await log.answer('from:milo_exchange_properties', {data: [], error: null});
 await log.answer('from:milo_exchange_property_holdings', {data: [], error: null});
 await log.answer(RPCS[0], {data: null, error: {message: 'x'}});
 await log.answer(RPCS[1], {data: 50, error: null});
 await log.answer(RPCS[2], {data: null, error: {message: 'y'}});
 await done;
 assert.equal(hub.state.setManagedPropertyValue, null);
 assert.equal(hub.state.setManagedPropertyEquity, 50);
 assert.equal(hub.state.setPropertyDebt, 0);
 assert.equal(hub.state.setPropertyMarketReady, true);
});

/* ---------------- Stocks: run the real loadPage ---------------- */

const STOCKS = 'app/milo-world/exchange/stocks/page.tsx';
const STOCKS_SRC = read(STOCKS);
const LOADERS = ['loadDreamTokens', 'loadStocks', 'loadHoldings', 'loadTrades', 'loadNewsEvents', 'loadStockMarketDashboard', 'loadEmploymentDashboard'];

function stocksLoader(log, auth) {
 const fn = slice(STOCKS_SRC, '  async function loadPage() {', '\n    setLoading(false);\n  }\n');
 const state = {log: []};
 const ctx = {
  state,
  activeUserIdRef: {current: null},
  pageLoadIdRef: {current: 0},
  supabase: {auth: {getUser: () => log.start('getUser').then(() => ({data: {user: auth.user}, error: null}))}},
 };
 for (const s of [...new Set(fn.match(/\bset[A-Z]\w*/g))]) ctx[s] = (v) => { state[s] = v; state.log.push(`${s}:${v}`); };
 for (const l of LOADERS) ctx[l] = (...args) => log.start(l, {args});
 vm.runInNewContext(`${js(fn)}\nthis.load = loadPage;`, ctx);
 return {load: ctx.load, state};
}

test('Stocks: all seven loaders start together after getUser (3 → 2 stages, same requests)', async () => {
 const log = requestLog();
 const page = stocksLoader(log, {user: {id: 'learner-a'}});
 const done = page.load();
 await flush();
 assert.deepEqual(log.names(), ['getUser']);
 await log.answer('getUser');
 assert.deepEqual(log.names().slice(1).sort(), [...LOADERS].sort());
 for (const l of ['loadDreamTokens', 'loadHoldings', 'loadTrades']) {
  assert.deepEqual(Array.from(log.calls.find((c) => c.name === l).args), ['learner-a'], `${l} for this learner`);
 }
 for (const l of LOADERS) {
  assert.ok(!page.state.log.includes('setLoading:false'), 'loading stays until every loader finishes');
  await log.answer(l);
 }
 await done;
 assert.equal(page.state.log[page.state.log.length - 1], 'setLoading:false');
 assert.equal(log.calls.length, 8);
});

test('Stocks: guest makes only getUser', async () => {
 const log = requestLog();
 const page = stocksLoader(log, {user: null});
 const done = page.load();
 await flush(); await log.answer('getUser');
 await done;
 assert.deepEqual(log.names(), ['getUser']);
 assert.equal(page.state.setUserId, null);
 assert.equal(page.state.setLoading, false);
});

test('Stocks: trading, refresh and wallet event unchanged', () => {
 assert.equal((STOCKS_SRC.match(/supabase\.rpc\("trade_milo_exchange_stock"/g) || []).length, 1, 'one trade write');
 const trade = slice(STOCKS_SRC, '  async function executeStockTrade(side: "buy" | "sell") {', '\n  async function buyStock() {');
 assert.match(trade, /window\.dispatchEvent\(new Event\("dream-tokens-updated"\)\);\s*await refreshUserData\(\);\s*setActionLoading\(false\);/);
 assert.match(trade, /const estimatedTotal = qty \* selectedStock\.current_price;/, 'client pre-check unchanged');
 const refresh = slice(STOCKS_SRC, '  async function refreshUserData() {', '\n  }\n');
 for (const l of LOADERS) assert.ok(refresh.includes(`${l}(`), `refresh still loads ${l}`);
 assert.match(refresh, /selectedSymbol \? loadPriceHistory\(selectedSymbol\) : Promise\.resolve\(\)/);
});

/* ---------------- Unchanged on purpose ---------------- */

/* ---------------- Account isolation: run the pages' real loaders and auth handling ---------------- */

// Real onAuthUserChange helper, driven by a fake Supabase auth emitter.
function authEmitter() {
 const out = ts.transpileModule(read('lib/auth/onAuthUserChange.ts'), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
 const mod = {exports: {}};
 vm.runInNewContext(out, {exports: mod.exports, module: mod, require: () => ({})});
 const listeners = [];
 const client = {auth: {onAuthStateChange: (cb) => { listeners.push(cb); return {data: {subscription: {unsubscribe() {}}}}; }}};
 return {
  subscribe: (cb) => mod.exports.onAuthUserChange(client, cb),
  emit: (event, userId) => { for (const l of listeners) l(event, userId ? {user: {id: userId}} : null); },
 };
}

// A fake Supabase client whose every request is answered by the test.
function pageClient(log, auth) {
 const tableChain = (table) => {
  const meta = {table, filters: []};
  const chain = {};
  for (const m of ['select', 'order', 'limit', 'in', 'or']) chain[m] = () => chain;
  chain.eq = (col, val) => { meta.filters.push([col, val]); return chain; };
  chain.maybeSingle = () => log.start(`from:${table}`, meta);
  chain.then = (res, rej) => log.start(`from:${table}`, meta).then(res, rej);
  return chain;
 };
 return {
  auth: {getUser: () => log.start('getUser').then(() => ({data: {user: auth.user ? {id: auth.user} : null}, error: null}))},
  from: tableChain,
  rpc: (name) => log.start(`rpc:${name}`),
 };
}

function hubPage(log, auth) {
 const fns = slice(HUB_SRC, '  // Drop the previous account\'s private data at once', '\n  async function sendFriendRequest() {').replace(/\n  async function sendFriendRequest\(\) \{$/, '')
  // The mount effect is React wiring; the tests drive account changes directly.
  .replace(/  useEffect\(\(\) => \{\n    loadPage\(\);[\s\S]*?\n  \}, \[\]\);\n/, '');
 const state = {};
 const ctx = {
  state,
  activeUserIdRef: {current: null},
  pageLoadIdRef: {current: 0},
  supabase: pageClient(log, auth),
  window: {setTimeout: (f) => setTimeout(f, 0)},
  console: {warn() {}},
  Number, String, Boolean, Array, Set,
 };
 for (const s of [...new Set(fns.match(/\bset[A-Z]\w*/g))]) ctx[s] = (v) => { state[s] = typeof v === 'function' ? v(state[s]) : v; };
 vm.runInNewContext(`${js(fns)}\nthis.loadPage = loadPage; this.handleAccountChange = handleAccountChange;`, ctx);
 return {ctx, state};
}

// Answer every pending request for a learner's hub load with that learner's data.
async function answerHub(log, who, {skip = []} = {}) {
 const answers = {
  'from:profiles': () => ({data: {role: 'student', id: who, email: `${who}@x`}, error: null}),
  'rpc:get_my_virtual_dream_token_balance': () => ({data: who === 'learner-a' ? 111 : 222, error: null}),
  'from:milo_exchange_stocks': () => ({data: [{symbol: 'S', current_price: 2}], error: null}),
  'from:milo_exchange_holdings': () => ({data: [{symbol: 'S', quantity: who === 'learner-a' ? 10 : 20, user_id: who}], error: null}),
  'from:milo_exchange_properties': () => ({data: [{id: 'p1'}], error: null}),
  'from:milo_exchange_property_holdings': () => ({data: [{id: `${who}-prop`, user_id: who}], error: null}),
  'rpc:get_my_milo_exchange_property_portfolio_value': () => ({data: who === 'learner-a' ? 500 : 900, error: null}),
  'rpc:get_my_milo_exchange_property_equity_value': () => ({data: 1, error: null}),
  'rpc:get_my_milo_property_finance_dashboard': () => ({data: {stats: {debt_balance: who === 'learner-a' ? 5 : 9}}, error: null}),
  'from:dream_token_transactions': () => ({data: [{id: `${who}-tx`}], error: null}),
  'rpc:get_milo_exchange_overall_leaderboard': () => ({data: [{username: who, is_current_user: true}], error: null}),
  'from:milo_exchange_friends': () => ({data: [], error: null}),
 };
 for (let round = 0; round < 4; round++) {
  // Later-stage requests (portfolio RPCs, friend profiles) belong to whoever is loading now.
  tagRequests(log, who);
  const pending = log.calls.filter((c) => !c.answered && c.who === who && c.name !== 'getUser' && !skip.includes(c.name));
  for (const c of pending) { c.answered = true; c.resolve(answers[c.name]()); }
  await flush();
 }
}
// Tag each new request with the learner whose load issued it.
function tagRequests(log, who) { for (const c of log.calls) if (!c.who) c.who = who; }
async function answerGetUser(log) {
 const c = log.calls.find((x) => x.name === 'getUser' && !x.answered);
 c.answered = true; c.resolve(); await flush();
}

test('Exchange hub: authenticated load shows only that learner, in the same parallel groups', async () => {
 const log = requestLog();
 const auth = {user: 'learner-a'};
 const hub = hubPage(log, auth);
 const done = hub.ctx.loadPage();
 await flush(); await answerGetUser(log); tagRequests(log, 'learner-a');
 const first = log.names().slice(1);
 assert.ok(first.includes('from:milo_exchange_properties') && first.includes('from:milo_exchange_property_holdings'), 'property reads together');
 assert.ok(!first.some((n) => n.includes('portfolio_value')), 'portfolio RPCs still wait');
 await answerHub(log, 'learner-a');
 await done;
 assert.equal(hub.state.setDreamTokens, 111);
 assert.equal(hub.state.setStockHoldings[0].user_id, 'learner-a');
 assert.equal(hub.state.setManagedPropertyValue, 500);
 assert.equal(hub.state.setLoading, false);
});

test('Exchange hub: guest load makes only getUser and shows the log-in view', async () => {
 const log = requestLog();
 const hub = hubPage(log, {user: null});
 const done = hub.ctx.loadPage();
 await flush(); await answerGetUser(log);
 await done;
 assert.deepEqual(log.names(), ['getUser']);
 assert.equal(hub.state.setUserId, null);
 assert.equal(hub.state.setLoading, false);
});

test('Exchange hub: repeated SIGNED_IN / TOKEN_REFRESHED for the same learner never reloads', async () => {
 const log = requestLog();
 const auth = {user: 'learner-a'};
 const hub = hubPage(log, auth);
 const em = authEmitter();
 em.subscribe(({userId}) => hub.ctx.handleAccountChange(userId));
 em.emit('INITIAL_SESSION', 'learner-a');
 const done = hub.ctx.loadPage();
 await flush(); await answerGetUser(log); tagRequests(log, 'learner-a');
 await answerHub(log, 'learner-a');
 await done;
 const before = log.calls.length;
 em.emit('SIGNED_IN', 'learner-a'); // tab became visible again
 em.emit('TOKEN_REFRESHED', 'learner-a');
 await new Promise((r) => setTimeout(r, 5)); await flush();
 assert.equal(log.calls.length, before, 'no duplicate full load');
 assert.equal(hub.state.setDreamTokens, 111, 'data kept');
});

test('Exchange hub: logout in another tab clears private data at once; late replies never return it', async () => {
 const log = requestLog();
 const auth = {user: 'learner-a'};
 const hub = hubPage(log, auth);
 const em = authEmitter();
 em.subscribe(({userId}) => hub.ctx.handleAccountChange(userId));
 em.emit('INITIAL_SESSION', 'learner-a');
 const done = hub.ctx.loadPage();
 await flush(); await answerGetUser(log); tagRequests(log, 'learner-a');
 // Holdings and wallet still loading when the learner logs out elsewhere.
 auth.user = null;
 em.emit('SIGNED_OUT', null);
 assert.deepEqual(Array.from(hub.state.setStockHoldings), [], 'cleared synchronously');
 assert.equal(hub.state.setDreamTokens, 0);
 assert.equal(hub.state.setUserId, null);
 await answerHub(log, 'learner-a'); // A's replies arrive late
 await done;
 await new Promise((r) => setTimeout(r, 5)); await flush();
 await answerGetUser(log);
 assert.equal(hub.state.setDreamTokens, 0);
 assert.deepEqual(Array.from(hub.state.setStockHoldings), []);
 assert.deepEqual(Array.from(hub.state.setPropertyHoldings), []);
 assert.deepEqual(Array.from(hub.state.setTransactions), []);
 assert.deepEqual(Array.from(hub.state.setLeaderboardRows), []);
 assert.equal(hub.state.setManagedPropertyValue, null);
 assert.equal(hub.state.setLoading, false, 'guest view');
});

test('Exchange hub: switching learner A → B never shows A, even when A\'s replies arrive last', async () => {
 const log = requestLog();
 const auth = {user: 'learner-a'};
 const hub = hubPage(log, auth);
 const em = authEmitter();
 em.subscribe(({userId}) => hub.ctx.handleAccountChange(userId));
 em.emit('INITIAL_SESSION', 'learner-a');
 const loadA = hub.ctx.loadPage();
 await flush(); await answerGetUser(log); tagRequests(log, 'learner-a');
 auth.user = 'learner-b';
 em.emit('SIGNED_IN', 'learner-b'); // another account in this or another tab
 await new Promise((r) => setTimeout(r, 5)); await flush();
 await answerGetUser(log); tagRequests(log, 'learner-b');
 await answerHub(log, 'learner-b');
 await answerHub(log, 'learner-a'); // A's slow replies resolve after B is shown
 await loadA;
 await flush();
 assert.equal(hub.state.setDreamTokens, 222);
 assert.equal(hub.state.setStockHoldings[0].user_id, 'learner-b');
 assert.equal(hub.state.setPropertyHoldings[0].user_id, 'learner-b');
 assert.equal(hub.state.setManagedPropertyValue, 900);
 assert.equal(hub.state.setPropertyDebt, 9);
 assert.equal(hub.state.setTransactions[0].id, 'learner-b-tx');
 assert.equal(hub.state.setLeaderboardRows[0].username, 'learner-b');
 assert.equal(hub.state.setLoading, false);
});

test('Exchange hub: switch while A\'s portfolio RPCs are in flight — A finishing first neither shows A nor ends B\'s loading', async () => {
 const log = requestLog();
 const auth = {user: 'learner-a'};
 const hub = hubPage(log, auth);
 const em = authEmitter();
 em.subscribe(({userId}) => hub.ctx.handleAccountChange(userId));
 em.emit('INITIAL_SESSION', 'learner-a');
 const loadA = hub.ctx.loadPage();
 await flush(); await answerGetUser(log); tagRequests(log, 'learner-a');
 // A's property reads return, so A's portfolio RPCs are now in flight.
 for (const name of ['from:milo_exchange_properties', 'from:milo_exchange_property_holdings']) {
  const c = log.calls.find((x) => x.name === name && x.who === 'learner-a');
  c.answered = true; c.resolve({data: [{id: 'p1', user_id: 'learner-a'}], error: null});
 }
 await flush(); tagRequests(log, 'learner-a');
 assert.ok(log.calls.some((c) => c.who === 'learner-a' && c.name === 'rpc:get_my_milo_exchange_property_portfolio_value' && !c.answered));
 auth.user = 'learner-b';
 em.emit('SIGNED_IN', 'learner-b');
 await new Promise((r) => setTimeout(r, 5)); await flush();
 await answerGetUser(log); tagRequests(log, 'learner-b');
 // A finishes completely while B is still loading.
 await answerHub(log, 'learner-a');
 await loadA;
 assert.equal(hub.state.setLoading, true, 'A\'s load does not end B\'s loading state');
 assert.equal(hub.state.setManagedPropertyValue, null, 'A\'s portfolio value never shown');
 assert.equal(hub.state.setPropertyDebt, 0, 'A\'s property debt never shown');
 await answerHub(log, 'learner-b');
 await flush();
 assert.equal(hub.state.setManagedPropertyValue, 900);
 assert.equal(hub.state.setLoading, false);
});

test('Exchange hub: a failed or delayed optional read keeps the others', async () => {
 const log = requestLog();
 const hub = hubPage(log, {user: 'learner-a'});
 const done = hub.ctx.loadPage();
 await flush(); await answerGetUser(log); tagRequests(log, 'learner-a');
 const board = log.calls.find((c) => c.name === 'rpc:get_milo_exchange_overall_leaderboard');
 board.answered = true;
 board.resolve({data: null, error: {message: 'slow then failed'}});
 await answerHub(log, 'learner-a');
 await done;
 assert.deepEqual(Array.from(hub.state.setLeaderboardRows), []);
 assert.equal(hub.state.setDreamTokens, 111);
 assert.equal(hub.state.setStockHoldings.length, 1);
});

/* ---------------- Stocks: account isolation and trading ---------------- */

function stocksPage(log, auth, extra = {}) {
 const fns = slice(STOCKS_SRC, '  // Drop the previous account\'s private data at once', '\n  async function loadPriceHistory(symbol: string) {').replace(/\n  async function loadPriceHistory\(symbol: string\) \{$/, '');
 const trade = slice(STOCKS_SRC, '  async function refreshUserData() {', '\n  async function buyStock() {').replace(/\n  async function buyStock\(\) \{$/, '');
 const state = {};
 const events = [];
 const loaderCalls = [];
 const ctx = {
  state, events, loaderCalls,
  activeUserIdRef: {current: null},
  pageLoadIdRef: {current: 0},
  supabase: pageClient(log, auth),
  window: {setTimeout: (f) => setTimeout(f, 0), dispatchEvent: (e) => events.push(e.type)},
  Event: class { constructor(type) { this.type = type; } },
  console: {warn() {}},
  Number, String, Math, Boolean,
  formatNumber: (n) => String(n),
  ...extra,
 };
 for (const s of [...new Set((fns + trade).match(/\bset[A-Z]\w*/g))]) ctx[s] = (v) => { state[s] = typeof v === 'function' ? v(state[s]) : v; };
 const code = `${js(fns)}\n${js(trade)}\nthis.loadPage = loadPage; this.handleAccountChange = handleAccountChange; this.executeStockTrade = executeStockTrade;`;
 // Public market loaders are stubbed (counted); private ones run for real.
 for (const l of ['loadStocks', 'loadNewsEvents', 'loadStockMarketDashboard', 'loadEmploymentDashboard', 'loadPriceHistory']) ctx[l] = async () => { loaderCalls.push(l); };
 // The price-history effect is React wiring, not loader logic.
 const runnable = code
  .replace(/useEffect\(\(\) => \{\s*if \(!userId \|\| !selectedSymbol\)\s*return;[\s\S]*?\}, \[userId, selectedSymbol\]\);/, '')
  .replace(/useEffect\(\(\) => \{\s*loadPage\(\);[\s\S]*?\}, \[\]\);/, '')
  .replace(/async function (loadStocks|loadNewsEvents|loadStockMarketDashboard|loadEmploymentDashboard)\(\)[\s\S]*?\n  \}\n/g, '');
 vm.runInNewContext(runnable, ctx);
 return {ctx, state, events, loaderCalls};
}

test('Stocks: switching learner A → B mid-load never shows A\'s wallet, holdings or trades', async () => {
 const log = requestLog();
 const auth = {user: 'learner-a'};
 const page = stocksPage(log, auth);
 const em = authEmitter();
 em.subscribe(({userId}) => page.ctx.handleAccountChange(userId));
 em.emit('INITIAL_SESSION', 'learner-a');
 const loadA = page.ctx.loadPage();
 await flush(); await answerGetUser(log); tagRequests(log, 'learner-a');
 auth.user = 'learner-b';
 em.emit('SIGNED_IN', 'learner-b');
 assert.equal(page.state.setDreamTokens, 0, 'cleared at once');
 assert.deepEqual(Array.from(page.state.setHoldings), []);
 await new Promise((r) => setTimeout(r, 5)); await flush();
 await answerGetUser(log); tagRequests(log, 'learner-b');
 const answer = async (who) => {
  for (const c of log.calls.filter((x) => x.who === who && !x.answered && x.name !== 'getUser')) {
   c.answered = true;
   c.resolve(c.name === 'rpc:get_my_virtual_dream_token_balance' ? {data: who === 'learner-a' ? 111 : 222, error: null} : {data: [{id: `${who}-row`}], error: null});
  }
  await flush();
 };
 await answer('learner-b');
 await answer('learner-a');
 await loadA;
 assert.equal(page.state.setDreamTokens, 222);
 assert.equal(page.state.setHoldings[0].id, 'learner-b-row');
 assert.equal(page.state.setTrades[0].id, 'learner-b-row');
 assert.equal(page.state.setLoading, false);
});

test('Stocks: trade then wallet refresh — one trade write, wallet event, then reload', async () => {
 const log = requestLog();
 const page = stocksPage(log, {user: 'learner-a'}, {
  userId: 'learner-a', actionLoading: false, quantity: 2, dreamTokens: 1000, selectedSymbol: 'S',
  selectedStock: {symbol: 'S', current_price: 5}, getHolding: () => ({quantity: 10}),
 });
 page.ctx.activeUserIdRef.current = 'learner-a';
 const trading = page.ctx.executeStockTrade('buy');
 await flush();
 const writes = log.calls.filter((c) => c.name === 'rpc:trade_milo_exchange_stock');
 assert.equal(writes.length, 1);
 writes[0].answered = true; writes[0].resolve({data: {ok: true, quantity: 2, symbol: 'S', price: 5}, error: null});
 await flush();
 for (const c of log.calls.filter((x) => !x.answered && x.name !== 'rpc:trade_milo_exchange_stock')) { c.answered = true; c.resolve({data: [], error: null}); }
 await trading;
 assert.deepEqual(page.events, ['dream-tokens-updated']);
 assert.ok(log.names().includes('rpc:get_my_virtual_dream_token_balance'), 'wallet reloaded after the trade');
 assert.ok(log.names().includes('from:milo_exchange_holdings'));
 assert.match(String(page.state.setTradeMessage), /Bought 2 shares of S/);
 assert.equal(log.calls.filter((c) => c.name === 'rpc:trade_milo_exchange_stock').length, 1, 'no duplicate trade write');
 assert.equal(page.state.setActionLoading, false);
});

test('Stocks: a trade still in flight when the account changes is never shown to the next learner', async () => {
 const log = requestLog();
 const page = stocksPage(log, {user: 'learner-a'}, {
  userId: 'learner-a', actionLoading: false, quantity: 1, dreamTokens: 1000, selectedSymbol: 'S',
  selectedStock: {symbol: 'S', current_price: 5}, getHolding: () => ({quantity: 10}),
 });
 page.ctx.activeUserIdRef.current = 'learner-a';
 const trading = page.ctx.executeStockTrade('sell');
 await flush();
 page.ctx.activeUserIdRef.current = 'learner-b'; // account switched mid-trade
 const write = log.calls.find((c) => c.name === 'rpc:trade_milo_exchange_stock');
 write.answered = true; write.resolve({data: {ok: true, quantity: 1, symbol: 'S', price: 5}, error: null});
 await trading;
 assert.equal(page.state.setTradeMessage, '', 'no message from learner A\'s trade (only the pre-trade clear)');
 assert.deepEqual(page.events, []);
 assert.equal(log.calls.length, 1, 'no refresh requests for learner A');
 assert.equal(page.state.setActionLoading, false);
});

test('Exchange pages subscribe through onAuthUserChange (no raw auth listener) and clean up', () => {
 for (const src of [HUB_SRC, STOCKS_SRC]) {
  assert.match(src, /import \{ onAuthUserChange \} from "@\/lib\/auth\/onAuthUserChange";/);
  assert.match(src, /const stopAuthListener = onAuthUserChange\(supabase, \(\{ userId: nextUserId \}\) => \{\s*handleAccountChange\(nextUserId\);\s*\}\);/);
  assert.match(src, /return \(\) => \{\s*stopAuthListener\(\);\s*\};/);
  assert.ok(!/supabase\.auth\.onAuthStateChange/.test(src));
  assert.match(src, /window\.setTimeout\(\(\) => \{\s*loadPage\(\);\s*\}, 0\);/, 'reload outside the auth callback');
 }
});

test('Property Exchange: write order (unit sync → finance → reload) and its reads are unchanged', () => {
 const src = read('app/milo-world/exchange/property/PropertyExchangeClient.tsx');
 assert.ok(!/PERF-2D-4/.test(src), 'not changed in this phase');
 assert.match(src, /await Promise\.all\(\[loadDreamTokens\(\), loadPropertyMarket\(user\.id\)\]\);[\s\S]{0,400}?await supabase\.rpc\("process_my_milo_property_finance"\);\s*await Promise\.all\(\[/);
 assert.match(src, /const syncResult = await supabase\.rpc\("sync_my_milo_exchange_property_units"\);/);
});

test('Exchange hub: other loaders, trading-free hub and friend writes unchanged', () => {
 assert.match(HUB_SRC, /await Promise\.all\(\[\s*loadViewerProfile\(user\.id\),\s*loadDreamTokens\(user\.id\),\s*loadStockPortfolio\(user\.id\),\s*loadPropertyPortfolio\(user\.id\),\s*loadTransactions\(user\.id\),\s*loadLeaderboard\(\),\s*loadFriends\(user\.id\),\s*\]\);/);
 assert.match(HUB_SRC, /supabase\.rpc\(\s*"get_my_virtual_dream_token_balance"\s*\)/, 'DT source unchanged');
 assert.equal((HUB_SRC.match(/\.from\("milo_exchange_property_holdings"\)/g) || []).length, 1, 'holdings read once');
 assert.equal((HUB_SRC.match(/\.from\("milo_exchange_properties"\)/g) || []).length, 1, 'property list read once');
});

test('Core Mission access, Milo Bank, wallet and scheduler code untouched (audit only)', () => {
 for (const file of ['hooks/useCoreMissionAccess.ts', 'hooks/useLearningMissionRouteAccess.ts', 'components/access/LearningAccessGate.tsx', 'components/learning-missions/LearningMissionZoneGate.tsx', 'components/core-missions/CoreMissionTopBar.tsx', 'app/learning-missions/core/layout.tsx', 'app/milo-world/bank/hooks/useBankAccount.ts', 'app/milo-world/bank/hooks/useBankBonds.ts', 'lib/client/refreshScheduler.ts', 'lib/wallet/dreamTokenBalance.ts']) {
  assert.ok(!/PERF-2D-4/.test(read(file)), file);
 }
 assert.match(read('components/core-missions/CoreMissionTopBar.tsx'), /const scheduler = createRefreshScheduler\(loadWallets\);/);
});
