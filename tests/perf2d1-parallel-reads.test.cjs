/** PERF-2D-1: independent Supabase reads run together; writes and dependent reads keep their order. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

// Source of one loader, from its declaration to the scheduler that wraps it.
function loader(file, startMarker) {
 const src = read(file);
 const a = src.indexOf(startMarker);
 assert.ok(a >= 0, `${file}: ${startMarker}`);
 const b = src.indexOf('const scheduler = createRefreshScheduler', a);
 assert.ok(b > a, `${file}: scheduler after loader`);
 return src.slice(a, b);
}
const at = (body, needle, from = 0) => {
 const i = body.indexOf(needle, from);
 assert.ok(i >= 0, `missing: ${needle}`);
 return i;
};
// The text of the Promise.all that starts at or after `from`.
function promiseAll(body, from) {
 const a = at(body, 'Promise.all([', from);
 const b = at(body, '\n      ]);', a);
 return {start: a, end: b, text: body.slice(a, b)};
}
const awaits = (body) => (body.match(/\bawait\b/g) || []).length;
const WRITE = /apply_referral_bonus|claimMyOrganisationInvites|\.insert\(|\.update\(|\.upsert\(|\.delete\(/;

/* ---------------- Profile ---------------- */

const PROFILE = loader('app/profile/page.tsx', 'async function loadProfile() {');

test('Profile: user first, then the invite-claim and referral writes, then one parallel read stage', () => {
 const user = at(PROFILE, 'await supabase.auth.getUser()');
 const claim = at(PROFILE, 'await claimMyOrganisationInvites()');
 const referral = at(PROFILE, '"apply_referral_bonus"');
 const reads = promiseAll(PROFILE, referral);
 assert.ok(user < claim && claim < referral && referral < reads.start, 'getUser → claim → referral → reads');
 for (const q of ['.from("profiles")', '"get_my_manageable_organisations"', '"get_my_learning_profile_status"', '.from("nova_subscriptions")', 'fetchDreamTokenBalance(supabase, userId)', '"milo_exchange_stocks"', '"milo_exchange_holdings"', '"milo_exchange_properties"', '"milo_exchange_property_holdings"']) {
  assert.ok(reads.text.includes(q), `parallel stage includes ${q}`);
 }
 assert.ok(!WRITE.test(reads.text), 'no write inside the parallel stage');
 assert.equal((PROFILE.match(/Promise\.all\(\[/g) || []).length, 1, 'one parallel stage');
});

test('Profile: the referral write still finishes before the DT balance is read', () => {
 const referralAwait = at(PROFILE, '} = await supabase.rpc(\n          "apply_referral_bonus"');
 const balance = at(PROFILE, 'fetchDreamTokenBalance(supabase, userId)');
 assert.ok(referralAwait < balance);
 assert.match(PROFILE, /if \(pendingReferralCode\) \{\s*const \{\s*data: referralResult,/);
});

test('Profile: Founding 50 check stays conditional, runs after the wallet, and is stale-guarded', () => {
 const wallet = at(PROFILE, 'setIsLoadingPortfolio(false);');
 const f50 = at(PROFILE, 'await hasFounding50StudentAccess()');
 assert.ok(wallet < f50, 'wallet shown before the Founding 50 wait');
 assert.match(PROFILE, /if \(entitlements\.rewards\) \{\s*setHasStudentRewardsAccess\(true\);\s*\}/);
 assert.match(PROFILE, /if \(!entitlements\.rewards\) \{\s*const founding50Access = await hasFounding50StudentAccess\(\);\s*if \(isStale\(\)\) \{\s*return;\s*\}\s*setHasStudentRewardsAccess\(founding50Access\);\s*\}/);
 assert.equal((PROFILE.match(/hasFounding50StudentAccess\(\)/g) || []).length, 1, 'no extra Founding 50 request');
});

test('Profile: stage count 7–8 → 3–4 (getUser, claim, [referral], reads, [Founding 50])', () => {
 // getUser, claim, referral (conditional), the combined reads, Founding 50 (conditional).
 assert.equal(awaits(PROFILE), 5);
 for (const guard of ['await supabase.auth.getUser();\n\n      if (isStale()) {', 'await claimMyOrganisationInvites();\n\n      if (isStale()) {', '      ]);\n\n      if (isStale()) {']) {
  assert.ok(PROFILE.includes(guard), `guard after: ${guard.slice(0, 40)}`);
 }
});

test('Profile: each result keeps its own error handling and balance source', () => {
 assert.match(PROFILE, /if \(profileError\) \{\s*console\.error\(\s*"Profile error:"/);
 assert.match(PROFILE, /if \(manageableOrganisationError\) \{[\s\S]*?setHasOrganisationPortalAccess\(false\);/);
 assert.match(PROFILE, /if \(learningProfileError\) \{[\s\S]*?"Learner details could not be loaded\."/);
 assert.match(PROFILE, /const subscriptionData = subscriptionError\s*\?\s*\[\]/);
 assert.match(PROFILE, /if \(tokenResult\.error\) \{[\s\S]*?setDreamTokenBalance\(0\);\s*\} else \{\s*setDreamTokenBalance\(tokenResult\.data\);/);
 assert.match(PROFILE, /setDreamGemBalance\(\s*Number\(profile\?\.dream_gem_balance \|\| 0\),?\s*\);/);
 // Opened histories still refresh their newest page only.
 assert.match(PROFILE, /if \(tokenHistoryUserIdRef\.current === userId\) \{\s*void loadTokenHistory\(userId\);/);
 assert.match(PROFILE, /if \(gemHistoryUserIdRef\.current === userId\) \{\s*void loadGemHistory\(userId\);/);
});

/* ---------------- Milo World ---------------- */

const MILO = loader('app/milo-world/page.tsx', 'async function loadDreamTokensAndObjectives() {');

test('Milo World: role read and objectives RPC run together; DT balance still waits for the RPC', () => {
 const first = promiseAll(MILO, 0);
 assert.ok(first.text.includes('.select("role")'));
 assert.ok(first.text.includes('"get_current_objectives", { p_scope: "milo" }'));
 const balance = at(MILO, 'fetchDreamTokenBalance(supabase, user.id)');
 assert.ok(first.end < balance, 'balance read after the settling RPC has returned');
 assert.ok(!first.text.includes('fetchDreamTokenBalance'));
 assert.equal((MILO.match(/get_current_objectives/g) || []).length, 1, 'objectives requested once');
 assert.equal(awaits(MILO), 3, 'stages 4 → 3');
 assert.match(MILO, /if \(clubProfileError \|\| !clubProfile\) \{[\s\S]*?setIsAdmin\(false\);/);
 assert.match(MILO, /if \(objectiveError\) \{[\s\S]*?setObjectiveStatus\(null\);/);
});

/* ---------------- Inventor ---------------- */

const INVENTOR = loader('app/inventor/page.tsx', 'async function loadUserTokensAndObjectives() {');

test('Inventor: settling objectives RPC before balances; wallet shown before the Founding 50 wait', () => {
 const rpc = at(INVENTOR, 'await supabase.rpc("get_current_objectives"');
 const reads = promiseAll(INVENTOR, rpc);
 assert.ok(reads.text.includes('fetchDreamTokenBalance(supabase, user.id)'));
 const wallet = at(INVENTOR, 'setObjectivesLoading(false);', reads.end);
 const f50 = at(INVENTOR, '(await hasFounding50StudentAccess())');
 assert.ok(rpc < reads.start && wallet < f50);
 assert.match(INVENTOR, /roleHasStudentRewardsAccess\(role\) \|\|\s*hasActiveNovaSubscription\(subscriptionRows\) \|\|\s*\(await hasFounding50StudentAccess\(\)\);\s*if \(isStale\(\)\) return;\s*setHasStudentRewardsAccess\(hasStudentRewardsAccess\);\s*setStudentAccessUserId\(user\.id\);/);
 assert.equal(awaits(INVENTOR), 4, 'same requests and stages; only the wallet is shown earlier');
 // The prompt still waits for the access decision for this account.
 assert.match(read('app/inventor/page.tsx'), /\{userEmail && studentAccessUserId && !hasStudentRewardsAccess && \(/);
 assert.match(INVENTOR, /setStudentAccessUserId\(\(current\) => \(current === user\.id \? current : null\)\);/);
});

/* ---------------- Learning Missions hub ---------------- */

const HUB = loader('app/learning-missions/page.tsx', 'async function loadUserAndAssets() {');

test('Hub: wallet reads start with the access reads (after the user, never for guests)', () => {
 const guestReturn = at(HUB, 'if (!user) {');
 const guestEnd = at(HUB, '        return;\n      }\n', guestReturn);
 const wallet = at(HUB, 'const walletRequests = Promise.all([');
 const access = at(HUB, 'await Promise.all([');
 assert.ok(guestEnd < wallet && wallet < access, 'started after the guest branch, before access is awaited');
 const walletText = HUB.slice(wallet, at(HUB, '\n      ]);', wallet));
 for (const q of ['fetchDreamTokenBalance(supabase, user.id)', 'milo_exchange_stocks', 'milo_exchange_holdings', 'milo_exchange_properties', 'milo_exchange_property_holdings']) assert.ok(walletText.includes(q), q);
 assert.match(HUB, /walletRequests\.catch\(\(\) => undefined\);/);
});

test('Hub: access is applied before the wallet is awaited; both stale-guarded; requests unchanged', () => {
 const accessApplied = at(HUB, 'setUserMissionAccess({\n        userId: user.id,');
 const walletAwait = at(HUB, '] = await walletRequests;');
 assert.ok(accessApplied < walletAwait);
 assert.match(HUB, /\] = await walletRequests;\s*if \(isStale\(\)\) return;/);
 assert.equal((HUB.match(/fetchDreamTokenBalance\(/g) || []).length, 1);
 assert.equal((HUB.match(/hasFounding50StudentAccess\(\)/g) || []).length, 1);
 assert.equal(awaits(HUB), 3);
});

/* ---------------- Nova Home: already one parallel stage ---------------- */

test('Nova Home unchanged: getUser then one parallel read stage', () => {
 const src = read('app/inventor/hub/page.tsx');
 const a = src.indexOf('const loadNovaHome = useCallback');
 const body = src.slice(a, src.indexOf('}, [router]);', a));
 assert.equal(awaits(body), 2);
 assert.ok(!/PERF-2D-1/.test(src));
});

/* ---------------- Runtime: failing and slow requests ---------------- */

const {PostgrestClient} = require('@supabase/postgrest-js');
function client(handler) {
 return new PostgrestClient('http://127.0.0.1:9/rest/v1', {fetch: handler});
}
const ok = (body) => new Response(JSON.stringify(body), {status: 200, headers: {'content-type': 'application/json'}});

test('a failing optional read resolves with an error and does not discard the others', async () => {
 const c = client(async (url) => {
  if (String(url).includes('get_my_manageable_organisations')) throw new TypeError('fetch failed');
  if (String(url).includes('nova_subscriptions')) return new Response(JSON.stringify({message: 'denied', code: '42501'}), {status: 403, headers: {'content-type': 'application/json'}});
  return ok([{role: 'regular', dream_gem_balance: 7}]);
 });
 const [profile, orgs, subs] = await Promise.all([
  c.from('profiles').select('role,dream_gem_balance').eq('id', 'u').maybeSingle(),
  c.rpc('get_my_manageable_organisations'),
  c.from('nova_subscriptions').select('status').eq('user_id', 'u'),
 ]);
 assert.equal(profile.error, null);
 assert.equal(profile.data.dream_gem_balance, 7);
 assert.ok(orgs.error, 'network failure reported as an error, not thrown');
 assert.ok(subs.error, 'RLS / permission failure reported as an error');
});

test('fetchDreamTokenBalance reports a failed read as an error inside the parallel stage', async () => {
 const ts = require('typescript');
 const vm = require('node:vm');
 const out = ts.transpileModule(read('lib/wallet/dreamTokenBalance.ts'), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}});
 const mod = {exports: {}};
 vm.runInNewContext(out.outputText, {exports: mod.exports, module: mod, require: () => ({})});
 const c = client(async () => { throw new TypeError('fetch failed'); });
 const [balance, other] = await Promise.all([mod.exports.fetchDreamTokenBalance(c, 'u'), Promise.resolve('kept')]);
 assert.equal(balance.data, 0);
 assert.ok(balance.error);
 assert.equal(other, 'kept');
});

// Mirrors the hub: wallet requests start first, access is awaited and applied first.
async function hubLikeLoad({auth, accessDelay, walletDelay, state, ids}) {
 const id = ++ids.latest;
 const isStale = () => id !== ids.latest;
 const user = auth.user;
 if (!user) { state.access = null; state.wallet = null; return; }
 const wallet = new Promise((r) => setTimeout(() => r(`${user}-wallet`), walletDelay));
 wallet.catch(() => undefined);
 const access = await new Promise((r) => setTimeout(() => r(`${user}-access`), accessDelay));
 if (isStale()) return;
 state.access = access; state.log.push('access');
 const w = await wallet;
 if (isStale()) return;
 state.wallet = w; state.log.push('wallet');
}

test('slow wallet: access is shown first; slow access: the wallet still waits for it', async () => {
 const ids = {latest: 0};
 let state = {log: []};
 await hubLikeLoad({auth: {user: 'a'}, accessDelay: 5, walletDelay: 30, state, ids});
 assert.deepEqual(state.log, ['access', 'wallet']);
 state = {log: []};
 await hubLikeLoad({auth: {user: 'a'}, accessDelay: 30, walletDelay: 5, state, ids});
 assert.deepEqual(state.log, ['access', 'wallet'], 'access decision is never overtaken');
});

test('account switch mid-load: the first account\'s late replies are dropped', async () => {
 const ids = {latest: 0};
 const state = {log: []};
 const auth = {user: 'learner-a'};
 const first = hubLikeLoad({auth, accessDelay: 40, walletDelay: 60, state, ids});
 await new Promise((r) => setTimeout(r, 5));
 auth.user = 'learner-b';
 const second = hubLikeLoad({auth, accessDelay: 5, walletDelay: 10, state, ids});
 await Promise.all([first, second]);
 assert.equal(state.access, 'learner-b-access');
 assert.equal(state.wallet, 'learner-b-wallet');
});

test('logout mid-load clears and late replies do not bring data back', async () => {
 const ids = {latest: 0};
 const state = {log: []};
 const auth = {user: 'learner-a'};
 const first = hubLikeLoad({auth, accessDelay: 30, walletDelay: 30, state, ids});
 auth.user = null;
 await hubLikeLoad({auth, accessDelay: 0, walletDelay: 0, state, ids});
 await first;
 assert.equal(state.access, null);
 assert.equal(state.wallet, null);
});

test('a superseded early wallet request that fails causes no unhandled rejection', async () => {
 const seen = [];
 const onUnhandled = (e) => seen.push(e);
 process.on('unhandledRejection', onUnhandled);
 const wallet = Promise.all([Promise.reject(new Error('network'))]);
 wallet.catch(() => undefined); // as in the hub
 await new Promise((r) => setTimeout(r, 20));
 process.off('unhandledRejection', onUnhandled);
 assert.equal(seen.length, 0);
});

/* ---------------- Preserved ---------------- */

test('previous PERF work is preserved in the edited loaders', () => {
 for (const [file, fn] of [['app/profile/page.tsx', 'loadProfile'], ['app/milo-world/page.tsx', 'loadDreamTokensAndObjectives'], ['app/inventor/page.tsx', 'loadUserTokensAndObjectives'], ['app/learning-missions/page.tsx', 'loadUserAndAssets']]) {
  const src = read(file);
  assert.match(src, new RegExp(`createRefreshScheduler\\(${fn}`), `${file} scheduler`);
  assert.match(src, /const stopTabReturn = onTabReturn\(scheduler\.revalidate\);/, `${file} tab return`);
  assert.match(src, /onAuthUserChange\(supabase,/, `${file} auth`);
  assert.ok(!/supabase\.auth\.onAuthStateChange/.test(src), `${file} no raw auth listener`);
 }
 assert.match(read('app/learning-missions/page.tsx'), /createRefreshScheduler\(loadUserAndAssets, \{\s*freshnessMs: 0,\s*\}\)/);
 assert.match(read('app/milo-world/page.tsx'), /createRefreshScheduler\(loadDreamTokensAndObjectives, \{\s*freshnessMs: 0,\s*\}\)/);
 assert.match(read('app/inventor/page.tsx'), /createRefreshScheduler\(loadUserTokensAndObjectives, \{\s*freshnessMs: 0,\s*\}\)/);
 assert.equal((read('app/profile/page.tsx').match(/\.limit\(TRANSACTION_HISTORY_PAGE_SIZE \+ 1\)/g) || []).length, 4, 'Profile 25-row pagination');
});

test('no new writes, and no NOVA+, Math, bank, middleware or wallet-helper changes in this phase', () => {
 for (const body of [PROFILE, MILO, INVENTOR, HUB]) {
  assert.ok(!/\.(insert|update|upsert|delete)\(/.test(body));
 }
 for (const file of ['lib/wallet/dreamTokenBalance.ts', 'lib/client/refreshScheduler.ts', 'app/milo-world/bank/hooks/useBankAccount.ts', 'app/milo-world/bank/hooks/useBankBonds.ts']) {
  assert.ok(!/PERF-2D-1/.test(read(file)), `${file} untouched`);
 }
});
