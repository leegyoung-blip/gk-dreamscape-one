'use strict';
/** Phase 8C-2C.3A: draft integrity and non-production inclusion. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const relative = 'lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts.ts';
const file = path.join(root, relative);
const code = fs.readFileSync(file, 'utf8');
const trans = ts.transpileModule(code, {fileName: relative, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}, reportDiagnostics: true});
assert.deepEqual((trans.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error).map(x => x.messageText), []);
const moduleShim = { exports: {} };
vm.runInNewContext(trans.outputText, {
  module: moduleShim,
  exports: moduleShim.exports,
  require: id => {
    assert.equal(id, '../schema/types');
    return {PHASE4B_METHOD_SCHEMA_VERSION:'4B.1'};
  },
});
const drafts = [...moduleShim.exports.PHASE4E2B8C2C3A_SPECIALIST_DRAFTS];
const expectedIds = [
  'heuristic.multi_step.equal_spacing_interval_count',
  'heuristic.multi_step.multiplicative_comparison_chain',
  'ratio.relationship.before_after_change',
];
const get = id => drafts.find(x => x.methodId === id);

test('three stable specialist draft IDs without duplicates', () => {
  assert.deepEqual(drafts.map(x => x.methodId), expectedIds);
  assert.equal(new Set(drafts.map(x => x.methodId)).size, 3);
});
test('draft only; none registered with the existing production library', () => {
  assert.ok(drafts.every(x => x.status === 'draft'));
  const prod = fs.readFileSync(path.join(root, 'lib/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.ts'), 'utf8');
  assert.doesNotMatch(prod, /phase4E2B8C2C3ASpecialistDrafts|PHASE4E2B8C2C3A_SPECIALIST_DRAFTS/);
});
test('schema contract shape and taxonomy family anchors', () => {
  for (const d of drafts) {
    assert.equal(d.schemaVersion, '4B.1');
    assert.ok(d.methodId.startsWith(d.familyId + '.'));
    assert.equal(d.variantId, d.methodId.split('.').at(-1));
    assert.ok(d.applicability.levels.length > 0);
    assert.ok(d.applicability.domains.length > 0);
    assert.ok(d.applicability.structures.length > 0);
    assert.ok(d.applicability.reasoning.length > 0);
    assert.ok(d.pedagogy.teachingSequence.length >= 4);
    assert.ok(d.pedagogy.teachingSequence.some(s => s.role === 'check'));
    assert.equal(new Set(d.pedagogy.teachingSequence.map(s => s.stageId)).size, d.pedagogy.teachingSequence.length);
    assert.ok(d.misconceptions.length >= 1);
    assert.ok(d.pedagogy.learningObjectivePattern.length > 15);
    assert.ok(d.workedPattern.generalisationPattern.length > 15);
  }
  assert.deepEqual([...get(expectedIds[0]).applicability.domains], ['measurement']);
  assert.deepEqual([...get(expectedIds[0]).applicability.structures], ['multi_step']);
  assert.deepEqual([...get(expectedIds[1]).applicability.structures], ['multi_step']);
  assert.deepEqual([...get(expectedIds[2]).applicability.structures], ['ratio_relationship']);
});
test('conservative learner levels and no unsupported curriculum-skill scores', () => {
  assert.deepEqual([...get(expectedIds[0]).applicability.levels], [3, 4, 5, 6]);
  assert.deepEqual([...get(expectedIds[1]).applicability.levels], [4, 5, 6]);
  assert.deepEqual([...get(expectedIds[2]).applicability.levels], [5, 6]);
  for (const d of drafts) assert.equal(d.applicability.curriculumSkills.length, 0);
});
test('equal-spacing draft teaches intervals, not endpoint count', () => {
  const d = get(expectedIds[0]);
  assert.match(d.workedPattern.generalisationPattern, /later index - earlier index/);
  assert.match(d.misconceptions[0].misconception, /number of markers/);
  assert.ok(d.applicability.exclusions.some(x => /unequal gaps/.test(x)));
});
test('multiplicative comparison draft uses one shared base and checks total', () => {
  const d = get(expectedIds[1]);
  assert.match(d.pedagogy.conceptualFocus.join(' '), /consistent base quantity/);
  assert.match(d.workedPattern.checkPattern, /total/);
  assert.ok(d.applicability.exclusions.some(x => /additive/.test(x)));
});
test('changing ratio draft tracks two states with no assumed invariant', () => {
  const d = get(expectedIds[2]);
  assert.ok(d.pedagogy.teachingSequence.some(x => x.stageId === 'apply_changes'));
  assert.ok(d.pedagogy.teachingSequence.some(x => x.stageId === 'enforce_after_ratio'));
  assert.ok(d.applicability.exclusions.some(x => /Do not assume one quantity stays unchanged/.test(x)));
  assert.ok(d.applicability.exclusions.some(x => /unique original scale/.test(x)));
});
test('all methods retain question/answer/runtime-agnostic governance', () => {
  for (const d of drafts) {
    assert.equal(d.governance.deterministicOnly, true);
    assert.equal(d.governance.questionAgnostic, true);
    assert.equal(d.governance.answerAgnostic, true);
    assert.equal(d.governance.runtimeAgnostic, true);
    assert.equal(d.governance.lunaAllowed, false);
    assert.equal(d.governance.persistence, 'version_controlled_source');
    assert.deepEqual([...d.provenance.classifications], ['dreamscape_method']);
    assert.equal(d.provenance.claims[0].sourceId, null);
    assert.equal(d.provenance.claims[0].sourceClaimTag, null);
  }
});
test('no live selector, persistence, answer fields or scoring edits in this phase', () => {
  const forbidden = ['answer_data','correctAnswer','studentId','quizId','questionId','createClient(','fetch(','insert(','update(','scoreCandidate','selectTeachingStrategy','approved: true'];
  for (const needle of forbidden) assert.ok(!code.includes(needle), `forbidden source token ${needle}`);
  assert.match(code, /NOT eligible for selection, scoring, learner delivery/);
});
test('draft objects are stable frozen catalogue records', () => {
  assert.equal(Object.isFrozen(moduleShim.exports.PHASE4E2B8C2C3A_SPECIALIST_DRAFTS), true);
  for (const d of drafts) {
    assert.equal(Object.isFrozen(d), true);
    assert.equal(Object.isFrozen(d.applicability), true);
    assert.equal(Object.isFrozen(d.applicability.curriculumSkills), true);
    assert.equal(Object.isFrozen(d.pedagogy.teachingSequence[0]), true);
  }
});
