/** PERF-2C-1/2C-2: auth events no longer duplicate page loads; Thinking Lab initialises once. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Normalise line endings: some sources use CRLF and the assertions use \n.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const { GoTrueClient } = require(path.join(root, 'node_modules/@supabase/auth-js'));

/* The real helper, compiled from source. */
function loadHelper() {
 const out = ts.transpileModule(read('lib/auth/onAuthUserChange.ts'), {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 const mod = {exports:{}};
 vm.runInNewContext(out.outputText, {exports:mod.exports, module:mod, require:() => ({})});
 return mod.exports.onAuthUserChange;
}
const onAuthUserChange = loadHelper();

/* Real auth-js client, fully offline: unreachable URL, in-memory storage, network disabled. */
const now = () => Math.floor(Date.now() / 1000);
const sessionFor = (id) => ({access_token:`local.${id}`, refresh_token:`r-${id}`, token_type:'bearer', expires_in:3600, expires_at:now() + 3600,
 user:{id, aud:'authenticated', app_metadata:{}, user_metadata:{}, created_at:new Date().toISOString()}});
let networkCalls = 0;
const realFetch = globalThis.fetch;
test.before(() => { globalThis.fetch = async () => { networkCalls++; throw new Error('network disabled in tests'); }; });
test.after(() => { globalThis.fetch = realFetch; assert.equal(networkCalls, 0, 'tests made no network calls'); });

function makeClient(signedInAs) {
 const memory = new Map();
 const key = `sb-test-${Math.random().toString(36).slice(2)}`;
 if (signedInAs) memory.set(key, JSON.stringify(sessionFor(signedInAs)));
 const storage = {getItem:(k) => memory.get(k) ?? null, setItem:(k, v) => memory.set(k, v), removeItem:(k) => memory.delete(k)};
 return new GoTrueClient({url:'http://127.0.0.1:9/auth/v1', storageKey:key, storage, autoRefreshToken:false, persistSession:true, detectSessionInUrl:false});
}
const settle = () => new Promise((r) => setTimeout(r, 60));
const emit = async (client, event, userId) => { await client._notifyAllSubscribers(event, userId ? sessionFor(userId) : null); await settle(); };

/* The exact page pattern after the change: explicit load + onAuthUserChange. */
function mountNewPattern(client) {
 const loads = [];
 const load = (reason) => loads.push(reason);
 load('initial');
 const stop = onAuthUserChange({auth:client}, ({userId}) => load(`auth:${userId}`));
 return {loads, stop};
}
/* The previous page pattern, for comparison: explicit load + reload on every auth event. */
function mountOldPattern(client) {
 const loads = [];
 const load = (reason) => loads.push(reason);
 load('initial');
 const {data:{subscription}} = client.onAuthStateChange((event) => load(event));
 return {loads, stop:() => subscription.unsubscribe()};
}

test('initial authenticated hard load: one load (previously three: explicit + SIGNED_IN + INITIAL_SESSION)', async () => {
 const oldClient = makeClient('user-a');
 const before = mountOldPattern(oldClient);
 await settle();
 assert.deepEqual(before.loads, ['initial', 'SIGNED_IN', 'INITIAL_SESSION'], 'real auth-js behaviour for an early subscriber');
 const newClient = makeClient('user-a');
 const after = mountNewPattern(newClient);
 await settle();
 assert.deepEqual(after.loads, ['initial']);
 before.stop(); after.stop();
});
test('authenticated client-side navigation (client already initialised): one load (previously two)', async () => {
 const client = makeClient('user-a');
 await client.getSession(); // initialisation finished, as after the first page
 const before = mountOldPattern(client);
 const after = mountNewPattern(client);
 await settle();
 assert.deepEqual(before.loads, ['initial', 'INITIAL_SESSION']);
 assert.deepEqual(after.loads, ['initial']);
 before.stop(); after.stop();
});
test('initial guest load: one load and the guest state is kept', async () => {
 const client = makeClient(null);
 const before = mountOldPattern(client);
 const after = mountNewPattern(client);
 await settle();
 assert.ok(before.loads.length >= 2, `old pattern loaded ${before.loads.length} times`);
 assert.deepEqual(after.loads, ['initial']);
 before.stop(); after.stop();
});
test('INITIAL_SESSION alone never triggers a load, for signed-in or guest listeners', async () => {
 for (const user of ['user-a', null]) {
  const client = makeClient(user);
  await client.getSession();
  const page = mountNewPattern(client);
  await settle();
  assert.deepEqual(page.loads, ['initial']);
  page.stop();
 }
});
test('token refresh, same-user SIGNED_IN (tab focus) and USER_UPDATED do not reload', async () => {
 const client = makeClient('user-a');
 const page = mountNewPattern(client);
 await settle();
 await emit(client, 'TOKEN_REFRESHED', 'user-a');
 await emit(client, 'SIGNED_IN', 'user-a');
 await emit(client, 'USER_UPDATED', 'user-a');
 assert.deepEqual(page.loads, ['initial']);
 page.stop();
});
test('login after a guest session reloads once for the new user', async () => {
 const client = makeClient(null);
 const page = mountNewPattern(client);
 await settle();
 await emit(client, 'SIGNED_IN', 'user-a');
 await emit(client, 'TOKEN_REFRESHED', 'user-a');
 assert.deepEqual(page.loads, ['initial', 'auth:user-a']);
 page.stop();
});
test('logout and account switching each reload once, with the new identity', async () => {
 const client = makeClient('user-a');
 const page = mountNewPattern(client);
 await settle();
 await emit(client, 'SIGNED_OUT', null);
 await emit(client, 'SIGNED_IN', 'user-b');
 await emit(client, 'SIGNED_IN', 'user-c'); // direct switch without sign-out
 assert.deepEqual(page.loads, ['initial', 'auth:null', 'auth:user-b', 'auth:user-c']);
 page.stop();
});
test('a stopped listener receives nothing', async () => {
 const client = makeClient('user-a');
 const page = mountNewPattern(client);
 await settle();
 page.stop();
 await emit(client, 'SIGNED_OUT', null);
 assert.deepEqual(page.loads, ['initial']);
});

/* ---------------- Source-level guarantees for every migrated listener ---------------- */

const MIGRATED = [
 'app/inventor/hub/page.tsx', 'app/inventor/page.tsx', 'app/learning-missions/page.tsx', 'app/milo-world/page.tsx',
 'app/milo-world/categories/page.tsx', 'app/milo-world/activity-lab/page.tsx', 'app/nova/thinking-skills-lab/page.tsx',
 'app/learning-missions/knowledge-arena/page.tsx', 'components/core-missions/CoreMissionTopBar.tsx',
 'hooks/useCoreMissionAccess.ts', 'hooks/useLearningMissionRouteAccess.ts', 'components/access/LearningAccessGate.tsx',
];
test('every migrated page and hook uses onAuthUserChange and cleans it up', () => {
 for (const file of MIGRATED) {
  const src = read(file);
  assert.ok(!/supabase\.auth\.onAuthStateChange/.test(src), `${file} still subscribes to every auth event`);
  assert.match(src, /import \{ onAuthUserChange \} from "@\/lib\/auth\/onAuthUserChange";/, file);
  assert.match(src, /const stopAuthListener =\s*onAuthUserChange\(\s*supabase,/, file);
  assert.match(src, /stopAuthListener\(\);/, `${file} unsubscribes on cleanup`);
 }
});
test('pages that previously loaded once explicitly still do (normal direct visits and refreshes)', () => {
 const initial = {
  // PERF-2C-5: these loaders start through a refresh scheduler (still one explicit initial load).
  'app/inventor/hub/page.tsx': /const scheduler = createRefreshScheduler\(loadNovaHome\);\s*scheduler\.refresh\(\);/,
  'app/inventor/page.tsx': /const scheduler = createRefreshScheduler\(loadUserTokensAndObjectives,\s*\{\s*freshnessMs: 0,?\s*\}\);\s*scheduler\.refresh\(\);/,
  'app/learning-missions/page.tsx': /const scheduler = createRefreshScheduler\(loadUserAndAssets,\s*\{\s*freshnessMs: 0,?\s*\}\);\s*scheduler\.refresh\(\);/,
  'app/milo-world/page.tsx': /const scheduler = createRefreshScheduler\(loadDreamTokensAndObjectives,\s*\{\s*freshnessMs: 0,?\s*\}\);\s*scheduler\.refresh\(\);/,
  'app/milo-world/categories/page.tsx': /\n\s*loadUserAccess\(\);\n/,
  'app/milo-world/activity-lab/page.tsx': /\n\s*loadAccount\(\);\n/,
  'app/nova/thinking-skills-lab/page.tsx': /const scheduler = createRefreshScheduler\(loadStatus\);\s*scheduler\.refresh\(\);/,
  'app/learning-missions/knowledge-arena/page.tsx': /const scheduler = createRefreshScheduler\(loadUser\);\s*scheduler\.refresh\(\);/,
  'components/core-missions/CoreMissionTopBar.tsx': /const scheduler = createRefreshScheduler\(loadWallets\);\s*scheduler\.refresh\(\);/,
  'hooks/useCoreMissionAccess.ts': /void refreshAccess\(\{\s*showChecking: true,/,
  'hooks/useLearningMissionRouteAccess.ts': /useEffect\(\(\) => \{\s*void refreshAccess\(\{ showChecking: true \}\);/,
  'components/access/LearningAccessGate.tsx': /void checkAccess\(\{\s*showChecking: true,\s*\}\);/,
 };
 for (const [file, re] of Object.entries(initial)) assert.match(read(file), re, `${file} explicit initial load`);
});
test('logout still resets access state immediately in the gates and the core hook', () => {
 assert.match(read('hooks/useCoreMissionAccess.ts'), /if \(!nextUserId\) \{[\s\S]*?clearAccessCache\(\);[\s\S]*?setStatus\("signed_out"\);/);
 assert.match(read('hooks/useCoreMissionAccess.ts'), /\/\/ A different account signed in: never reuse the previous snapshot\.\s*clearAccessCache\(\);/);
 assert.match(read('hooks/useLearningMissionRouteAccess.ts'), /if \(!userId\) \{[\s\S]*?status: "signed_out"/);
 assert.match(read('components/access/LearningAccessGate.tsx'), /if \(!userId\) \{[\s\S]*?setStatus\("logged-out"\);/);
});
test('loaders drop stale responses after every await (no previous account data after a switch)', () => {
 const minGuards = {
  'app/inventor/hub/page.tsx': 2, 'app/inventor/page.tsx': 4, 'app/learning-missions/page.tsx': 3,
  // PERF-2D-1: the role read and objectives RPC now share one await (one guard).
  'app/milo-world/page.tsx': 3,
  'app/milo-world/categories/page.tsx': 2, 'app/milo-world/activity-lab/page.tsx': 2, 'app/nova/thinking-skills-lab/page.tsx': 2,
  'app/learning-missions/knowledge-arena/page.tsx': 4, 'components/core-missions/CoreMissionTopBar.tsx': 2,
 };
 for (const [file, n] of Object.entries(minGuards)) {
  const src = read(file);
  const guards = (src.match(/if \(isStale\(\)\) return;/g) || []).length;
  assert.ok(guards >= n, `${file}: ${guards} stale guards, expected >= ${n}`);
  assert.match(src, /const loadId = \+\+/, `${file} numbers each load`);
  assert.match(src, /await supabase\.auth\.getUser\(\);\s*\n(\s*\n)?\s*if \(isStale\(\)\) return;/, `${file} checks right after getUser`);
 }
 const lab = read('app/milo-world/activity-lab/page.tsx');
 assert.match(lab, /if \(!isCurrent\(\)\) return;/);
 assert.match(lab, /await refreshTokenBalance\(user\.id, \(\) => !isStale\(\)\);/);
 assert.match(read('app/inventor/page.tsx'), /\(await hasFounding50StudentAccess\(\)\);\s*if \(isStale\(\)\) return;\s*setHasStudentRewardsAccess\(hasStudentRewardsAccess\);/);
});
test('reward, subscription and entitlement logic text is untouched by this phase', () => {
 // The migration only replaces listeners and adds guards; these decision lines must remain.
 assert.match(read('app/inventor/page.tsx'), /roleHasStudentRewardsAccess\(role\) \|\|\s*hasActiveNovaSubscription\(subscriptionRows\) \|\|/);
 assert.match(read('hooks/useCoreMissionAccess.ts'), /roleHasStaffLearningAccess/);
});

/* ---------------- Thinking Lab (2C-2) ---------------- */

const LAB = 'app/nova/thinking-skills-lab/page.tsx';
function labLoadEffect() {
 const src = read(LAB);
 const start = src.indexOf('useEffect(() => {\n    const scheduler = createRefreshScheduler(loadStatus);');
 assert.ok(start > 0, 'load effect found');
 const end = src.indexOf('\n  }, [', start);
 const deps = src.slice(end + '\n  }, ['.length, src.indexOf(']);', end)).split(',').map((d) => d.trim()).filter(Boolean);
 return {body: src.slice(start, end), deps};
}
test('Thinking Lab load effect no longer depends on userId (the value its own load sets)', () => {
 const {deps, body} = labLoadEffect();
 assert.deepEqual(deps, ['loadStatus', 'refreshCashAndTransactions']);
 assert.match(body, /const currentUserId = userIdRef\.current;/);
 assert.ok(!/\buserId\b(?!Ref)/.test(body.replace(/currentUserId/g, '')), 'effect body reads userId only through the ref');
});
test('Thinking Lab initialises once: simulated effect re-runs with the real dependency list', async () => {
 // Minimal React-effect model: the effect re-runs whenever a dependency value changes.
 // loadStatus and refreshCashAndTransactions are stable useCallback([]) values; loadStatus sets userId.
 const {deps} = labLoadEffect();
 const src = read(LAB);
 assert.match(src, /const loadStatus = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[\]\);/, 'loadStatus is stable');
 assert.match(src, /const refreshCashAndTransactions = useCallback\([\s\S]*?\n    \[\]\n  \);/, 'refreshCashAndTransactions is stable');
 const client = makeClient('user-a');
 let loads = 0;
 const state = {loadStatus:'stable-fn', refreshCashAndTransactions:'stable-fn', userId:null};
 let stop = null, lastDeps = null;
 const runEffect = () => {
  const current = deps.map((d) => state[d]);
  if (lastDeps && current.every((v, i) => v === lastDeps[i])) return false;
  if (stop) stop();
  lastDeps = current;
  loads++; state.userId = 'user-a'; // loadStatus resolves and sets userId
  stop = onAuthUserChange({auth:client}, () => { loads++; });
  return true;
 };
 runEffect();
 await settle();
 while (runEffect()) await settle(); // re-render after setUserId
 assert.equal(loads, 1, `loadStatus ran ${loads} times`);
 stop();
});
test('Thinking Lab ignores stale loads and never shows a previous account wallet', () => {
 const src = read(LAB);
 assert.match(src, /const loadId = \+\+statusLoadIdRef\.current;/);
 assert.equal((src.match(/if \(isStale\(\)\) return;/g) || []).length, 2);
 assert.match(src, /userIdRef\.current = null;\s*setUserId\(null\);/);
 assert.match(src, /userIdRef\.current = user\.id;\s*setUserId\(user\.id\);/);
 assert.match(src, /if \(userIdRef\.current !== accountUserId\) return;/);
});
test('Thinking Lab wallet and game-completion updates still refresh', () => {
 const src = read(LAB);
 assert.match(src, /window\.addEventListener\("dream-tokens-updated", refreshTokenAssets\);/);
 // PERF-2C-5: returning to the tab revalidates through the scheduler (30-second freshness).
 assert.match(src, /const stopTabReturn = onTabReturn\(scheduler\.revalidate\);/);
 assert.equal((src.match(/await refreshCashAndTransactions\(userId\);/g) || []).length, 2, 'clue purchase and completion paths');
 assert.match(src, /if \(status\.activityDate && singaporeDate !== status\.activityDate\) \{\s*loadStatus\(\);/, 'day rollover reload kept');
});
