/** PERF-2C-3: DT/DG transaction history only on /profile; balances unchanged and still refresh. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

function walk(dir, out = []) {
 for (const e of fs.readdirSync(path.join(root, dir), {withFileTypes:true})) {
  const rel = `${dir}/${e.name}`;
  if (e.isDirectory()) walk(rel, out);
  else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(rel);
 }
 return out;
}
const SOURCES = [...walk('app'), ...walk('components'), ...walk('hooks'), ...walk('lib')];

// Places allowed to read transaction history: the learner's Profile, staff admin tools,
// Milo Bank statements and the Exchange trade log (investment information).
const HISTORY_ALLOWED = [/^app\/profile\//, /^app\/admin\//, /^app\/api\/admin\//, /^app\/milo-world\/bank\//, /^app\/milo-world\/exchange\/page\.tsx$/];
const allowed = (f) => HISTORY_ALLOWED.some((re) => re.test(f));

const WALLET_UI = [
 'components/core-missions/CoreMissionTopBar.tsx',
 'components/dashboard/DashboardTopControls.tsx',
 'app/inventor/page.tsx',
 'app/learning-missions/page.tsx',
 'app/milo-world/page.tsx',
 'app/nova/thinking-skills-lab/page.tsx',
];
const WITH_GEM_CHIP = WALLET_UI.slice(0, 4);

test('no page outside the allowed places fetches recent DT/DG transaction history', () => {
 for (const file of SOURCES.filter((f) => !allowed(f))) {
  const src = read(file);
  for (const m of src.matchAll(/from\(\s*["']dream_(token|gem)_transactions["']\s*\)([\s\S]{0,400})/g)) {
   const chain = m[2].split(/;\n|\n\s*\n/)[0];
   assert.ok(!/\.(order|limit|range)\(/.test(chain), `${file}: history-style ledger query (order/limit/range)`);
  }
 }
});
test('the Dream Gem ledger is read only by Profile and staff tools', () => {
 for (const file of SOURCES) {
  if (/^app\/profile\//.test(file) || /^app\/(api\/)?admin\//.test(file)) continue;
  assert.ok(!/["']dream_gem_transactions["']/.test(read(file)), `${file} reads dream_gem_transactions`);
 }
});
test('no history wording or panels remain outside the allowed places', () => {
 const re = /Latest cash transactions|Latest Dream Gem activity|Dream Token History|Dream Gem History|View History/;
 for (const file of SOURCES.filter((f) => !allowed(f))) assert.ok(!re.test(read(file)), `${file} still renders wallet history`);
});
test('Dream Gems balances are display-only on desktop and mobile', () => {
 for (const file of WITH_GEM_CHIP) {
  const src = read(file);
  assert.ok(!/\b(gemsOpen|dreamGemsOpen)\b/.test(src), `${file} still has a Dream Gems panel state`);
  const chips = [...src.matchAll(/<div\s+data-wallet-balance="dream-gems"[\s\S]*?>/g)].map((m) => m[0]);
  assert.ok(chips.length >= 2, `${file}: desktop and compact Dream Gems balances (${chips.length})`);
  for (const chip of chips) {
   assert.ok(!/onClick|aria-expanded|aria-haspopup|cursor:\s*"pointer"/.test(chip), `${file}: Dream Gems balance is interactive`);
  }
  assert.ok(!/<button[^>]*data-wallet-balance="dream-gems"/.test(src));
 }
});
test('Profile Assets keeps its cash, property and stock breakdown (investment information)', () => {
 for (const file of WALLET_UI) {
  const src = read(file);
  assert.match(src, /Profile Assets/, file);
  assert.match(src, /Cash/, file);
  assert.match(src, /Property/, file);
  assert.match(src, /Stocks/, file);
 }
});
test('current balances come from the stored DT balance and still refresh after rewards and purchases', () => {
 // PERF-2C-3B: the DT display balance is read through fetchDreamTokenBalance
 // (profiles.dream_token_balance) instead of summing the ledger in the browser.
 for (const file of WALLET_UI) {
  const src = read(file);
  assert.match(src, /fetchDreamTokenBalance\(\s*supabase,\s*[a-zA-Z.]+,?\s*\)/, `${file} DT balance read`);
  assert.ok(!/from\("dream_token_transactions"\)\s*\.select\("amount"\)/.test(src), `${file} no longer sums the ledger`);
  assert.match(src, /window\.addEventListener\(\s*"dream-tokens-updated"/, `${file} refreshes on DT updates`);
  assert.match(src, /window\.addEventListener\(\s*"focus"/, `${file} refreshes on focus`);
 }
 for (const file of [...WITH_GEM_CHIP, 'app/nova/thinking-skills-lab/page.tsx']) {
  assert.match(read(file), /dream_gem_balance/, `${file} reads the stored DG balance`);
 }
 const lab = read('app/nova/thinking-skills-lab/page.tsx');
 assert.match(lab, /const refreshCashAndTransactions = useCallback\([\s\S]*?fetchDreamTokenBalance\(\s*supabase,\s*accountUserId,?\s*\)[\s\S]*?if \(userIdRef\.current !== accountUserId\) return;[\s\S]*?cash: cashValue,[\s\S]*?tokenBalance: cashValue,/);
 assert.equal((lab.match(/await refreshCashAndTransactions\(userId\);/g) || []).length, 2, 'clue purchase and game completion still refresh');
});
test('PERF-2C auth and stale-response protections are preserved in the edited pages', () => {
 for (const file of ['components/core-missions/CoreMissionTopBar.tsx', 'app/inventor/page.tsx', 'app/learning-missions/page.tsx', 'app/milo-world/page.tsx', 'app/nova/thinking-skills-lab/page.tsx']) {
  const src = read(file);
  assert.match(src, /onAuthUserChange\(/, file);
  assert.match(src, /if \(isStale\(\)\) return;/, file);
 }
});
test('this phase writes nothing: no ledger or profile writes in the edited wallet files', () => {
 for (const file of [...WALLET_UI, 'app/profile/page.tsx']) {
  const src = read(file);
  assert.ok(!/from\(\s*["']dream_(token|gem)_transactions["']\s*\)\s*\.(insert|update|upsert|delete)\(/.test(src), `${file} writes the ledger`);
  assert.ok(!/from\(\s*["']profiles["']\s*\)\s*\.(insert|update|upsert|delete)\(/.test(src), `${file} writes profiles`);
 }
});
test('role-dependent controls are unchanged (curriculum editor link, rewards access)', () => {
 assert.match(read('components/core-missions/CoreMissionTopBar.tsx'), /const editorAllowed = canEditCore\(role\);[\s\S]*\{editorAllowed && \(/);
 assert.match(read('app/inventor/page.tsx'), /roleHasStudentRewardsAccess\(role\) \|\|\s*hasActiveNovaSubscription\(subscriptionRows\) \|\|/);
});

/* ---------------- Profile: the only learner-facing history ---------------- */

const PROFILE = 'app/profile/page.tsx';
test('Profile reads the DT balance separately from history, from the stored balance', () => {
 const src = read(PROFILE);
 assert.match(src, /\/\/ Balance only: read from the learner's stored profile balance\s*\/\/ \(profiles\.dream_token_balance\), not by summing ledger rows\.\s*fetchDreamTokenBalance\(supabase, userId\),/);
 assert.match(src, /setDreamTokenBalance\(tokenResult\.data\);/);
 assert.ok(!/const dreamTokenBalance = tokenTransactions\.reduce/.test(src), 'balance no longer depends on the history download');
 assert.match(src, /Number\(profile\?\.dream_gem_balance \|\| 0\)/, 'DG balance still from the stored column');
});
test('Profile keeps the full DT and DG histories with the same columns and order, loaded on demand', () => {
 const src = read(PROFILE);
 assert.match(src, /const loadTokenHistory = useCallback\(async \(userId: string\) => \{[\s\S]*?\.select\("id,user_id,type,title,amount,token_kind,created_at"\)\s*\.eq\("user_id", userId\)\s*\.eq\("token_kind", "virtual"\)\s*\.order\("created_at", \{\s*ascending: false,\s*\}\);/);
 assert.match(src, /const loadGemHistory = useCallback\(async \(userId: string\) => \{[\s\S]*?"id,user_id,type,source,title,description,amount,balance_after,created_at"[\s\S]*?\.order\("created_at", \{\s*ascending: false,\s*\}\);/);
 assert.match(src, /onClick=\{openTokenHistory\}/);
 assert.match(src, /onClick=\{openGemHistory\}/);
 assert.match(src, /function openTokenHistory\(\) \{\s*setShowTokenHistory\(true\);[\s\S]*?void loadTokenHistory\(userId\);/);
 assert.match(src, /function openGemHistory\(\) \{\s*setShowGemHistory\(true\);[\s\S]*?void loadGemHistory\(userId\);/);
 assert.match(src, /\{tokenTransactions\.map\(\(transaction\) => \(/, 'DT rows still rendered');
 assert.match(src, /\{gemTransactions\.map\(\(transaction\) => \{/, 'DG rows still rendered');
 assert.match(src, /Loading Dream Token history\.\.\./);
 assert.match(src, /Loading Dream Gem history\.\.\./);
 assert.match(src, /No Dream Token activity yet\./);
 assert.match(src, /No Dream Gem activity yet\./);
});
test('Profile never shows another account history and keeps an opened history current', () => {
 const src = read(PROFILE);
 for (const name of ['tokenHistoryRequestRef', 'gemHistoryRequestRef']) {
  assert.match(src, new RegExp(`requestId !== ${name}\\.current \\|\\|\\s*profileUserIdRef\\.current !== userId`), `${name} guard`);
 }
 assert.match(src, /if \(profileUserIdRef\.current !== userId\) \{[\s\S]*?tokenHistoryUserIdRef\.current = null;[\s\S]*?gemHistoryUserIdRef\.current = null;[\s\S]*?setTokenTransactions\(\[\]\);[\s\S]*?setGemTransactions\(\[\]\);/, 'cleared on account change');
 assert.match(src, /profileUserIdRef\.current = null;[\s\S]*?setDreamTokenBalance\(0\);[\s\S]*?setTokenTransactions\(\[\]\);[\s\S]*?setGemTransactions\(\[\]\);/, 'cleared on sign-out');
 assert.match(src, /if \(tokenHistoryUserIdRef\.current === userId\) \{\s*void loadTokenHistory\(userId\);/);
 assert.match(src, /if \(gemHistoryUserIdRef\.current === userId\) \{\s*void loadGemHistory\(userId\);/);
});

/* ---------------- Final review: Student Access prompt, CSS cleanup, links ---------------- */

const PROMPT = 'components/wallet/StudentAccessPrompt.tsx';
function functionBody(src, name) {
 const start = src.indexOf(`function ${name}(`);
 if (start < 0) return '';
 const next = src.slice(start + 10).search(/\nfunction |\nexport default function /);
 return next < 0 ? src.slice(start) : src.slice(start, start + 10 + next);
}
test('Student Access prompt keeps its original copy and pricing link', () => {
 const src = read(PROMPT);
 assert.match(src, /Get Student Access for bigger rewards/);
 assert.match(src, /Student\s+Access unlocks eligible Core and Think activities that can award Dream\s+Gems\./);
 assert.match(src, /href="\/pricing"/);
 assert.match(src, />\s*Get Student Access\s*<\/Link>/);
 assert.match(src, /pointerEvents: "auto"/, 'clickable inside pointer-events:none intro blocks');
});
test('Student Access prompt is restored outside the wallet controls with the original visibility rule', () => {
 const inventor = read('app/inventor/page.tsx');
 assert.match(inventor, /\{userEmail && studentAccessUserId && !hasStudentRewardsAccess && \(\s*<StudentAccessPrompt/);
 assert.match(inventor, /setHasStudentRewardsAccess\(hasStudentRewardsAccess\);\s*setStudentAccessUserId\(user\.id\);/, 'shown only once access is checked for this user');
 assert.match(inventor, /setStudentAccessUserId\(\(current\) => \(current === user\.id \? current : null\)\);/, 'reset when the account changes');
 assert.match(inventor, /setHasStudentRewardsAccess\(false\);\s*setStudentAccessUserId\(null\);/, 'hidden for guests');
 assert.ok(!/StudentAccessPrompt/.test(functionBody(inventor, 'FloatingControls')), 'not inside the wallet controls');

 const missions = read('app/learning-missions/page.tsx');
 assert.match(missions, /const showStudentAccessPrompt = Boolean\(\s*userMissionAccess\.userId && !userMissionAccess\.hasStudentRewardsAccess,\s*\);/);
 assert.equal((missions.match(/\{showStudentAccessPrompt && \(\s*<StudentAccessPrompt/g) || []).length, 2, 'desktop and mobile layouts');
 assert.ok(!/StudentAccessPrompt/.test(functionBody(missions, 'FloatingMissionControls')), 'not inside the wallet controls');
 assert.match(missions, /setUserMissionAccess\(\{\s*userId: user\.id,[\s\S]*?hasStudentRewardsAccess,/, 'userId and access set together');
});
test('Thinking Lab no longer carries transaction-row CSS, and the assets styles are intact', () => {
 const src = read('app/nova/thinking-skills-lab/page.tsx');
 assert.ok(!/\.transactions?-(list|row|heading|empty|sign|copy|amount)\b/.test(src));
 assert.match(src, /\.assets-list \{ display: grid; gap: 8px; \}/);
 assert.match(src, /\.assets-row \{\s*min-height: 54px;/);
 assert.match(src, /\.assets-row-icon \{\s*width: 32px;/);
});
test('every literal link in the wallet surfaces points to an existing page', () => {
 const appDir = path.join(root, 'app');
 const routeExists = (href) => {
  const clean = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (clean === '/') return fs.existsSync(path.join(appDir, 'page.tsx'));
  let dirs = [appDir];
  for (const segment of clean.split('/').filter(Boolean)) {
   const nextDirs = [];
   for (const d of dirs) {
    if (fs.existsSync(path.join(d, segment))) nextDirs.push(path.join(d, segment));
    for (const e of fs.readdirSync(d, {withFileTypes:true})) {
     if (e.isDirectory() && /^\[.+\]$/.test(e.name)) nextDirs.push(path.join(d, e.name));
     if (e.isDirectory() && /^\(.+\)$/.test(e.name) && fs.existsSync(path.join(d, e.name, segment))) nextDirs.push(path.join(d, e.name, segment));
    }
   }
   dirs = nextDirs;
   if (!dirs.length) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, 'page.tsx')) || fs.existsSync(path.join(d, 'page.ts')));
 };
 for (const file of [...WALLET_UI, PROMPT, 'app/profile/page.tsx']) {
  const hrefs = [...read(file).matchAll(/href=(?:"(\/[^"]*)"|\{"(\/[^"]*)"\})/g)].map((m) => m[1] || m[2]);
  for (const href of hrefs) assert.ok(routeExists(href), `${file}: broken link ${href}`);
 }
});
