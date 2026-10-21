/** PERF-2C-5: tab-return revalidation, wallet-event coalescing and duplicate auth reloads. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

const HELPER = 'lib/client/refreshScheduler.ts';

/* ---------------- Browser stand-ins ---------------- */

function eventTarget() {
 const listeners = new Map();
 return {
  addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  dispatch(type) { for (const fn of [...(listeners.get(type) || [])]) fn({type}); },
  count(type) { return listeners.get(type)?.size ?? 0; },
 };
}

// One BroadcastChannel "bus" per simulated browser; each tab gets its own channel objects.
function channelBus() {
 const channels = new Set();
 return class FakeBroadcastChannel {
  constructor(name) { this.name = name; this.onmessage = null; this.sent = []; channels.add(this); }
  postMessage(data) {
   this.sent.push(data);
   for (const other of channels) if (other !== this && other.name === this.name) other.onmessage?.({data});
  }
 };
}

// Load the helper in a fresh realm (fresh module state) acting as one browser tab.
function loadTab({BroadcastChannel} = {}) {
 const clock = {t: 1_000_000};
 const win = eventTarget();
 const doc = Object.assign(eventTarget(), {visibilityState: 'visible'});
 const out = ts.transpileModule(read(HELPER), {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 const mod = {exports:{}};
 const DateStub = {now: () => clock.t};
 vm.runInNewContext(out.outputText, {
  exports:mod.exports, module:mod, require:() => ({}),
  window:win, document:doc, Date:DateStub, queueMicrotask, Promise,
  BroadcastChannel,
 });
 return {S: mod.exports, clock, win, doc};
}

const settle = () => new Promise((r) => setImmediate(r));

// A loader whose replies resolve when the test says so (to model slow requests).
function controlledLoader() {
 const calls = [];
 const fn = () => new Promise((resolve) => calls.push(resolve));
 return {fn, calls, finishAll: async () => { while (calls.length) { calls.shift()(); await settle(); } }};
}
// A loader that answers immediately and counts calls.
function countingLoader() {
 const c = {n: 0};
 c.fn = async () => { c.n += 1; };
 return c;
}

/* ---------------- Scheduler rules ---------------- */

test('initial load runs once', async () => {
 const {S} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh();
 await settle();
 assert.equal(l.n, 1);
});

test('returning after 5 s skips; after 60 s and after long inactivity it revalidates', async () => {
 const {S, clock} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); await settle();
 clock.t += 5_000; s.revalidate(); await settle();
 assert.equal(l.n, 1, '5 s: still fresh');
 clock.t += 55_000; s.revalidate(); await settle();
 assert.equal(l.n, 2, '60 s: revalidated');
 clock.t += 6 * 60 * 60_000; s.revalidate(); await settle();
 assert.equal(l.n, 3, 'after hours away: revalidated');
 assert.equal(S.FOCUS_REVALIDATE_AFTER_MS, 30_000);
});

test('five rapid focus events cost at most one load', async () => {
 const {S, clock} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); await settle();
 for (let i = 0; i < 5; i++) { clock.t += 200; s.revalidate(); await settle(); }
 assert.equal(l.n, 1, 'fresh: none');
 clock.t += 31_000;
 for (let i = 0; i < 5; i++) { clock.t += 200; s.revalidate(); await settle(); }
 assert.equal(l.n, 2, 'stale: exactly one');
});

test('focus and visibilitychange from one tab switch cost one load; hidden does nothing', async () => {
 const {S, clock, win, doc} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); await settle();
 const stop = S.onTabReturn(s.revalidate);
 clock.t += 31_000;
 doc.visibilityState = 'visible'; doc.dispatch('visibilitychange'); win.dispatch('focus');
 await settle();
 assert.equal(l.n, 2);
 clock.t += 31_000;
 doc.visibilityState = 'hidden'; doc.dispatch('visibilitychange'); await settle();
 assert.equal(l.n, 2, 'becoming hidden never loads');
 stop();
 assert.equal(win.count('focus'), 0); assert.equal(doc.count('visibilitychange'), 0);
});

test('a reward that dispatches Dream Tokens + Dream Gems together costs one load', async () => {
 const {S} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); await settle();
 s.refresh(); s.refresh(); // same handler, same tick
 await settle();
 assert.equal(l.n, 2);
});

test('wallet events are never skipped by the freshness window', async () => {
 const {S, clock} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); await settle();
 for (let i = 0; i < 3; i++) { clock.t += 1_000; s.refresh(); await settle(); }
 assert.equal(l.n, 4, 'every separate purchase / reward reloads');
});

test('a change during a running load queues exactly one more load (newest data always fetched)', async () => {
 const {S} = loadTab();
 const l = controlledLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); await settle();
 assert.equal(l.calls.length, 1);
 s.refresh(); await settle(); s.refresh(); await settle(); s.revalidate(); await settle();
 assert.equal(l.calls.length, 1, 'no overlapping request');
 l.calls.shift()(); await settle();
 assert.equal(l.calls.length, 1, 'one trailing load after the running one');
 l.calls.shift()(); await settle();
 assert.equal(l.calls.length, 0);
});

test('focus during a running load does not start another', async () => {
 const {S, clock} = loadTab();
 const l = controlledLoader();
 const s = S.createRefreshScheduler(l.fn, {freshnessMs: 0});
 s.refresh(); await settle();
 clock.t += 60_000; s.revalidate(); s.revalidate(); await settle();
 assert.equal(l.calls.length, 1);
 await l.finishAll();
});

test('freshnessMs 0 (access-deciding loaders) revalidates on every return', async () => {
 const {S, clock} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn, {freshnessMs: 0});
 s.refresh(); await settle();
 clock.t += 1; s.revalidate(); await settle();
 clock.t += 1; s.revalidate(); await settle();
 assert.equal(l.n, 3);
});

test('account switch starts at once even during a load; the stale reply is dropped', async () => {
 const {S} = loadTab();
 // Mirrors the pages: a load id taken at start, checked after the await.
 const auth = {user: 'user-a'};
 const state = {shown: null};
 const pending = [];
 let latest = 0;
 const load = async () => {
  const id = ++latest;
  const user = auth.user;
  await new Promise((r) => pending.push(r));
  if (id !== latest) return;
  state.shown = user;
 };
 const s = S.createRefreshScheduler(load);
 s.refresh(); await settle();
 auth.user = 'user-b';
 s.force(); await settle();
 assert.equal(pending.length, 2, 'the switch did not wait for the old load');
 pending[1](); await settle();
 pending[0](); await settle();
 assert.equal(state.shown, 'user-b', 'previous account never shown');
});

test('force cancels a pending refresh instead of loading twice', async () => {
 const {S} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); s.force();
 await settle(); await settle();
 assert.equal(l.n, 1);
});

test('a failing load does not block later loads', async () => {
 const {S} = loadTab();
 let n = 0;
 const s = S.createRefreshScheduler(async () => { n += 1; if (n === 1) throw new Error('network'); });
 s.refresh(); await settle();
 s.refresh(); await settle();
 assert.equal(n, 2);
});

test('loadedAt marks data the page loaded itself as fresh', async () => {
 const {S, clock} = loadTab();
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn, {loadedAt: clock.t});
 clock.t += 5_000; s.revalidate(); await settle();
 assert.equal(l.n, 0);
 clock.t += 30_000; s.revalidate(); await settle();
 assert.equal(l.n, 1);
});

test('multi-tab: a wallet change in another tab makes the next return revalidate inside the window', async () => {
 const BC = channelBus();
 const tabA = loadTab({BroadcastChannel: BC});
 const tabB = loadTab({BroadcastChannel: BC});
 const la = countingLoader(), lb = countingLoader();
 const a = tabA.S.createRefreshScheduler(la.fn);
 const b = tabB.S.createRefreshScheduler(lb.fn);
 a.refresh(); b.refresh(); await settle();
 // Tab A earns a reward: its page dispatches the wallet event locally.
 tabB.clock.t += 2_000; tabA.clock.t += 2_000;
 tabA.win.dispatch('dream-tokens-updated');
 await settle();
 assert.equal(lb.n, 1, 'the notice alone never loads in the hidden tab');
 tabB.clock.t += 1_000;
 b.revalidate(); await settle();
 assert.equal(lb.n, 2, 'tab B revalidates on return despite the 30 s window');
 tabB.clock.t += 1_000;
 b.revalidate(); await settle();
 assert.equal(lb.n, 2, 'and only once');
});

test('multi-tab relay announces wallet and membership/access changes only, without data', async () => {
 const BC = channelBus();
 const tab = loadTab({BroadcastChannel: BC});
 const peer = new BC('dreamscape-refresh');
 const got = [];
 peer.onmessage = (e) => got.push(e.data);
 tab.S.createRefreshScheduler(async () => {});
 tab.S.createRefreshScheduler(async () => {}); // relay installed once per tab
 for (const e of ['dream-tokens-updated', 'dream-gems-updated', 'dreamscape-membership-updated', 'dreamscape-access-changed', 'resize']) tab.win.dispatch(e);
 assert.equal(got.length, 4);
 for (const m of got) assert.deepEqual(Object.keys(m), ['type']);
 assert.equal(tab.win.count('dream-tokens-updated'), 1);
});

test('without BroadcastChannel the scheduler still works', async () => {
 const {S} = loadTab({BroadcastChannel: undefined});
 const l = countingLoader();
 const s = S.createRefreshScheduler(l.fn);
 s.refresh(); await settle();
 assert.equal(l.n, 1);
});

test('the helper performs no requests and caches no data', () => {
 const src = read(HELPER);
 assert.ok(!/supabase|fetch\(|localStorage|sessionStorage|indexedDB/.test(src));
});

/* ---------------- Page wiring ---------------- */

const SCHEDULED = {
 'components/dashboard/DashboardTopControls.tsx': {fn: 'loadWallets', zero: false, events: ['dream-tokens-updated', 'dream-gems-updated']},
 'components/core-missions/CoreMissionTopBar.tsx': {fn: 'loadWallets', zero: false, events: ['dream-tokens-updated', 'dream-gems-updated']},
 'app/inventor/hub/page.tsx': {fn: 'loadNovaHome', zero: false, events: ['dream-tokens-updated', 'dream-gems-updated']},
 'app/nova/thinking-skills-lab/page.tsx': {fn: 'loadStatus', zero: false, events: ['dream-tokens-updated']},
 'app/profile/page.tsx': {fn: 'loadProfile', zero: false, events: ['dream-tokens-updated', 'dream-gems-updated', 'dreamscape-membership-updated']},
 'app/learning-missions/think/page.tsx': {fn: '\\(\\) => loadBalances\\(\\)', zero: false, events: ['dream-tokens-updated', 'dream-gems-updated'], noAuth: true},
 'app/learning-missions/page.tsx': {fn: 'loadUserAndAssets', zero: true, events: ['dream-tokens-updated', 'dream-gems-updated']},
 'app/inventor/page.tsx': {fn: 'loadUserTokensAndObjectives', zero: true, events: ['dream-tokens-updated', 'dream-gems-updated', 'dream-objectives-updated']},
 'app/milo-world/page.tsx': {fn: 'loadDreamTokensAndObjectives', zero: true, events: ['dream-tokens-updated', 'dream-objectives-updated']},
 'app/milo-world/bank/hooks/useBankAccount.ts': {fn: 'loadAccount', zero: true, events: ['dream-tokens-updated', 'milo-bank-savings-updated', 'milo-bank-bonds-updated']},
 'app/milo-world/bank/hooks/useBankBonds.ts': {fn: 'load', zero: true, events: ['dream-tokens-updated', 'milo-bank-savings-updated', 'milo-bank-bonds-updated']},
};

test('scheduled loaders: tab return revalidates, no raw focus reload, listener cleaned up', () => {
 for (const [file, cfg] of Object.entries(SCHEDULED)) {
  const src = read(file);
  assert.match(src, new RegExp(`createRefreshScheduler\\(${cfg.fn}`), `${file} wraps its loader`);
  assert.match(src, /const stopTabReturn = onTabReturn\(scheduler\.revalidate\);/, `${file} revalidates on return`);
  assert.match(src, /stopTabReturn\(\);/, `${file} removes tab-return listeners`);
  for (const e of cfg.events) assert.match(src, new RegExp(`addEventListener\\(\\s*"${e}"`), `${file} still listens for ${e}`);
  // The loader is no longer bound straight to focus.
  assert.ok(!new RegExp(`addEventListener\\(\\s*"focus",\\s*(${cfg.fn}|refreshWallets|refreshBalances|refreshFromWalletEvent|refreshObjectives|refreshAllAssets|handleRewardUpdate)\\)`).test(src), `${file} has no raw focus reload`);
  // The policy is read from the createRefreshScheduler call itself, not comments.
  const call = src.match(new RegExp(`createRefreshScheduler\\(${cfg.fn}(,\\s*\\{[^}]*\\})?\\)`));
  assert.ok(call, `${file} scheduler call found`);
  assert.equal(/freshnessMs:\s*0\b/.test(call[0]), cfg.zero, `${file} freshness policy`);
 }
});

test('wallet events always refresh (never revalidate); account changes force', () => {
 for (const [file, cfg] of Object.entries(SCHEDULED)) {
  const src = read(file);
  assert.match(src, /scheduler\.refresh/, file);
  for (const e of cfg.events) {
   assert.ok(!new RegExp(`addEventListener\\(\\s*"${e}",\\s*scheduler\\.revalidate`).test(src), `${file}: ${e} must not be throttled`);
  }
  if (!cfg.noAuth) {
   assert.ok(!/supabase\.auth\.onAuthStateChange/.test(src), `${file} has no every-event auth reload`);
   assert.match(src, /const stopAuthListener = onAuthUserChange\(supabase, \(\) =>[\s\S]{0,200}?scheduler\.force\(\)/, `${file} reloads at once on account change`);
  }
 }
});

test('loaders without a stale guard gained one (account switch and overlapping replies)', () => {
 for (const file of ['components/dashboard/DashboardTopControls.tsx', 'app/profile/page.tsx']) {
  const src = read(file);
  assert.match(src, /const loadId = \+\+latestLoadId;/, file);
  assert.match(src, /const isStale = \(\) => !(mounted|isMounted) \|\| loadId !== latestLoadId;/, file);
 }
 // PERF-2D-1 merged Profile's independent reads into one await: getUser, the
 // invite claim, the combined reads and the Founding 50 check are each guarded.
 assert.equal((read('app/profile/page.tsx').match(/if \(isStale\(\)\) \{/g) || []).length, 4, 'every Profile await is guarded');
 assert.ok(!/if \(!isMounted\) \{/.test(read('app/profile/page.tsx').slice(read('app/profile/page.tsx').indexOf('async function loadProfile'), read('app/profile/page.tsx').indexOf('createRefreshScheduler(loadProfile)'))));
 for (const file of ['app/milo-world/bank/hooks/useBankAccount.ts', 'app/milo-world/bank/hooks/useBankBonds.ts']) {
  const src = read(file);
  assert.match(src, /const loadId = \+\+latestLoadIdRef\.current;/, file);
  assert.ok((src.match(/if \(isStale\(\)\) return;/g) || []).length >= 2, file);
 }
 assert.match(read('components/dashboard/DashboardTopControls.tsx'), /await supabase\.auth\.getUser\(\);\s*if \(isStale\(\)\) return;/);
});

test('Knowledge Arena: a battle reward (tokens + gems) costs one reload; no focus reload added', () => {
 const src = read('app/learning-missions/knowledge-arena/page.tsx');
 assert.match(src, /const scheduler = createRefreshScheduler\(loadUser\);\s*scheduler\.refresh\(\);/);
 assert.match(src, /const refreshBalances = \(\) => scheduler\.refresh\(\);/);
 assert.match(src, /onAuthUserChange\(supabase, \(\) => scheduler\.force\(\)\)/);
 assert.ok(!/onTabReturn|addEventListener\("focus"/.test(src));
});

test('Think page balances: rewards refresh, return revalidates, initial load counted as fresh', () => {
 const src = read('app/learning-missions/think/page.tsx');
 assert.match(src, /createRefreshScheduler\(\(\) => loadBalances\(\), \{\s*loadedAt: Date\.now\(\),\s*\}\)/);
 assert.match(src, /function handleRewardUpdate\(\) \{\s*scheduler\.refresh\(\);\s*\}/);
});

/* ---------------- Left as they were ---------------- */

test('access gates and entitlement checks still revalidate on every focus (not throttled)', () => {
 const gates = {
  'hooks/useLearningMissionRouteAccess.ts': /window\.addEventListener\("focus", handleFocus\);/,
  'app/milo-world/bank/hooks/useMiloFinanceAccess.ts': /window\.addEventListener\("focus", refresh\);/,
  'app/milo-world/quiz-hall/page.tsx': /window\.addEventListener\("focus", loadAccess\);/,
  'app/learning-missions/page.tsx': /window\.addEventListener\("focus", refreshZoneReleaseSettings\);/,
  'app/milo-world/page.tsx': /window\.addEventListener\("focus", refreshWorldZoneAccess\);/,
  'app/inventor/page.tsx': /window\.addEventListener\("focus", refreshWorldZoneAccess\);/,
  'app/learning-missions/core/rover/RoverChallengeProgressDock.tsx': /window\.addEventListener\("focus", refresh\);/,
 };
 for (const [file, re] of Object.entries(gates)) {
  const src = read(file);
  assert.match(src, re, `${file} gate focus check kept`);
 }
 for (const file of ['hooks/useLearningMissionRouteAccess.ts', 'app/milo-world/bank/hooks/useMiloFinanceAccess.ts', 'app/milo-world/quiz-hall/page.tsx', 'components/parental-controls/ScreenTimeController.tsx', 'app/learning-missions/progress-rewards/page.tsx', 'app/milo-world/club/page.tsx']) {
  assert.ok(!/refreshScheduler/.test(read(file)), `${file} not changed by PERF-2C-5`);
 }
 assert.match(read('hooks/useLearningMissionRouteAccess.ts'), /const interval = window\.setInterval\(\(\) => \{\s*silentRefresh\(\);\s*\}, 60_000\);/);
});

test('Profile pagination and balance sources are preserved', () => {
 const src = read('app/profile/page.tsx');
 assert.match(src, /fetchDreamTokenBalance\(supabase, userId\)/);
 assert.match(src, /if \(tokenHistoryUserIdRef\.current === userId\) \{\s*void loadTokenHistory\(userId\);/);
 assert.match(src, /if \(gemHistoryUserIdRef\.current === userId\) \{\s*void loadGemHistory\(userId\);/);
 assert.equal((src.match(/\.limit\(TRANSACTION_HISTORY_PAGE_SIZE \+ 1\)/g) || []).length, 4);
 assert.match(src, /setShowGemHistory\(false\);\s*scheduler\.force\(\);/);
});

test('no writes, RPC changes or accounting changes in the edited files', () => {
 const edited = [...Object.keys(SCHEDULED), 'app/learning-missions/knowledge-arena/page.tsx', HELPER];
 for (const file of edited) {
  const src = read(file);
  assert.ok(!/refreshScheduler[\s\S]*\.(insert|upsert|delete)\(/.test(src.slice(src.indexOf('createRefreshScheduler'), src.indexOf('createRefreshScheduler') + 1500)), `${file} scheduler wiring writes nothing`);
 }
 // Milo Bank available / locked funds still come from the summary RPC, with the same fallback arithmetic.
 const bank = read('app/milo-world/bank/hooks/useBankAccount.ts');
 assert.match(bank, /supabase\.rpc\("get_milo_bank_account_summary"\)/);
 assert.match(bank, /available = Math\.max\(totalDt - savings - bonds, 0\);/);
 assert.match(read('app/milo-world/bank/hooks/useBankBonds.ts'), /await refreshBondMaturities\(\);/);
});
