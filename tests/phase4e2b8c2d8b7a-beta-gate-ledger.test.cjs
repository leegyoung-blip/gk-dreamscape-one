'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const script = require('../scripts/phase4e2b8c2d8b7a-beta-gate-ledger.cjs');
const scriptPath = require.resolve('../scripts/phase4e2b8c2d8b7a-beta-gate-ledger.cjs');

function sandbox(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-8b7a-'));
  t.after(() => fs.rmSync(base, {recursive: true, force: true}));
  const root = path.join(base, 'repo');
  fs.mkdirSync(root);
  return {base, root};
}
function add(root, relative, content = '// deterministic test fixture\n') {
  const dest = path.join(root, relative);
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.writeFileSync(dest, content);
}

test('1. phase version and inventory have stable identifiers', () => {
  assert.equal(script.SCHEMA_VERSION, '8C2D8B7A.v1');
  assert.equal(script.EXPECTED.length, 15);
  assert.equal(new Set(script.EXPECTED.map(x => x[0])).size, 15);
});
test('2. expected paths are relative and source-only', () => {
  for (const [, p] of script.EXPECTED) {
    assert.equal(path.isAbsolute(p), false);
    assert.ok(!p.includes('..'));
    assert.ok(p.startsWith('scripts/') || p.startsWith('lib/'));
  }
});
test('3. empty checkout is explicitly not ready', t => {
  const {root} = sandbox(t);
  const result = script.buildReport(root);
  assert.equal(result.sourceInventory.present, 0);
  assert.equal(result.sourceInventory.missing.length, 15);
  assert.equal(result.result, 'BETA_RELEASE_NOT_AUTHORISED');
});
test('4. source files appear as an inventory, not release success', t => {
  const {root} = sandbox(t);
  script.EXPECTED.forEach(([, rel]) => add(root, rel));
  const result = script.buildReport(root);
  assert.equal(result.sourceInventory.present, 15);
  assert.equal(result.sourceInventory.missing.length, 0);
  assert.equal(result.result, 'BETA_RELEASE_NOT_AUTHORISED');
});
test('5. source digest is the actual SHA-256 of named source bytes', t => {
  const {root} = sandbox(t);
  const [id, rel] = script.EXPECTED[0];
  add(root, rel, 'hello universe\n');
  const actual = script.buildReport(root).sourceInventory.files.find(x => x.id === id);
  assert.equal(actual.sha256, crypto.createHash('sha256').update('hello universe\n').digest('hex'));
});
test('6. unchanged code produces the same digest', t => {
  const {root} = sandbox(t);
  add(root, script.EXPECTED[0][1], 'unchanged');
  const a = script.buildReport(root).sourceInventory.files[0].sha256;
  const b = script.buildReport(root).sourceInventory.files[0].sha256;
  assert.equal(a, b);
});
test('7. changed bytes change the digest but not the policy', t => {
  const {root} = sandbox(t);
  const [, rel] = script.EXPECTED[0];
  add(root, rel, 'old');
  const a = script.buildReport(root);
  add(root, rel, 'new');
  const b = script.buildReport(root);
  assert.notEqual(a.sourceInventory.files[0].sha256, b.sourceInventory.files[0].sha256);
  assert.equal(a.result, b.result);
});
test('8. unrelated files and env files are not inventoried', t => {
  const {root} = sandbox(t);
  add(root, '.env.local', 'OPENAI_API_KEY=never-expose-this');
  add(root, 'node_modules/cache/index.js', 'unrelated');
  const json = JSON.stringify(script.buildReport(root));
  assert.ok(!json.includes('never-expose-this'));
  assert.ok(!json.includes('OPENAI_API_KEY'));
  assert.ok(!json.includes('node_modules'));
});
test('9. missing source file shows missing, not passed', t => {
  const {root} = sandbox(t);
  add(root, script.EXPECTED[0][1]);
  const report = script.buildReport(root);
  assert.equal(report.sourceInventory.present, 1);
  assert.equal(report.sourceInventory.missing.length, 14);
});
test('10. directories where files are expected are not accepted', t => {
  const {root} = sandbox(t);
  const dest = path.join(root, script.EXPECTED[0][1]);
  fs.mkdirSync(dest, {recursive: true});
  assert.equal(script.readSource(root, script.EXPECTED[0][1]).present, false);
});
test('11. skipping genuine Luna output remains unresolved', t => {
  const {root} = sandbox(t);
  const result = script.buildReport(root);
  assert.equal(result.modelPilot, 'SKIPPED_NO_GENUINE_OUTPUT_EVIDENCE');
  const real = result.gates.find(g => g.id === 'G03');
  const pedagogy = result.gates.find(g => g.id === 'G04');
  assert.equal(real.status, 'SKIPPED_UNVERIFIED');
  assert.equal(pedagogy.status, 'BLOCKED_NO_REAL_OUTPUT');
});
test('12. deferred production auth and audit writes cannot be marked passed', t => {
  const {root} = sandbox(t);
  const gates = script.buildReport(root).gates;
  for (const id of ['G07','G08']) {
    assert.equal(gates.find(g => g.id === id).status, 'DEFERRED_NOT_PASSED');
  }
});
test('13. independent educator review and learner release remain blocked', t => {
  const {root} = sandbox(t);
  const gates = script.buildReport(root).gates;
  assert.equal(gates.find(g => g.id === 'G10').status, 'PENDING');
  assert.equal(gates.find(g => g.id === 'G13').status, 'BLOCKED');
});
test('14. no gate status implies real-world clearance', () => {
  const unsafe = new Set(['PASS','PASSED','READY','APPROVED','RELEASED','VERIFIED']);
  assert.equal(script.GATES.some(g => unsafe.has(g[2])), false);
});
test('15. permissions are uniformly fail closed', t => {
  const {root} = sandbox(t);
  const r = script.buildReport(root).restrictions;
  assert.ok(Object.values(r).every(v => v === false));
});
test('16. inside-repository output paths are rejected', t => {
  const {root} = sandbox(t);
  assert.throws(() => script.parseArgs(['--root', root, '--output', path.join(root,'report.json')]),
    /OUTPUT_MUST_BE_OUTSIDE_REPOSITORY/);
});
test('17. invalid CLI options fail instead of invoking an operation', t => {
  const {root} = sandbox(t);
  assert.throws(() => script.parseArgs(['--network']), /UNRECOGNISED_ARGUMENT/);
  assert.throws(() => script.parseArgs(['--output']), /MISSING_FLAG_VALUE/);
  assert.equal(script.parseArgs(['--root', root]).root, root);
});
test('18. explicit private output is JSON and exclusively created', t => {
  const {base, root} = sandbox(t);
  const dest = path.join(base,'report.json');
  script.run(['--root', root, '--output', dest]);
  const report = JSON.parse(fs.readFileSync(dest,'utf8'));
  assert.equal(report.result,'BETA_RELEASE_NOT_AUTHORISED');
  assert.throws(() => script.run(['--root',root,'--output',dest]), err => err.code === 'EEXIST');
});
test('19. CLI stdout is a valid JSON report', t => {
  const {root} = sandbox(t);
  const run = spawnSync(process.execPath,[scriptPath,'--root',root],{encoding:'utf8'});
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).result, 'BETA_RELEASE_NOT_AUTHORISED');
});
test('20. CLI blocked output path returns non-zero without sensitive logs', t => {
  const {root} = sandbox(t);
  const run = spawnSync(process.execPath,[scriptPath,'--root',root,'--output',path.join(root,'r.json')],{encoding:'utf8'});
  assert.equal(run.status,1);
  const error = JSON.parse(run.stderr);
  assert.equal(error.reason, 'OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
});
