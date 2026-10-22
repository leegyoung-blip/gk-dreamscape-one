'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FILES, rules, auditFromTexts, auditRepository } = require('../scripts/phase4e2b8c2d8b1-generation-contract-audit.cjs');
const root = process.env.DREAMSCAPE_GENERATOR_AUDIT_SOURCE_ROOT || path.resolve(__dirname, '..');
const load = () => Object.fromEntries(Object.entries(FILES).map(([key, p]) => [key, fs.readFileSync(path.join(root,p),'utf8')]));

test('real repo contracts are read-only and explicitly blocked for capture', () => {
  const r = auditRepository(root);
  assert.equal(r.status,'SOURCE_CONTRACT_REVIEWED_CAPTURE_BLOCKED');
  assert.equal(r.captureReady,false);
  assert.equal(r.contractDrift.length,0);
});
test('every contract has unique reason code', () => {
  assert.equal(new Set(rules.map(r => r.id)).size,rules.length);
});
test('missing routes fail closed', () => {
  const r = auditFromTexts({});
  assert.equal(r.status,'SOURCE_CONTRACT_DRIFT_REVIEW_REQUIRED');
  assert.equal(r.captureReady,false);
});
test('no secret, question text, or extracted answer payload in report', () => {
  const r = auditRepository(root);
  const json = JSON.stringify(r);
  for (const key of ['OPENAI_API_KEY=', 'Bearer eyJ', 'correct_answer:', 'explanation: input.', 'apiKey']) {
    assert.equal(json.includes(key),false,key);
  }
});
test('authoring route losing auth is detected', () => {
  const x=load();x.generateRoute=x.generateRoute.replace(/await\s+requireCurriculumDeveloperApiAccess\s*\(\s*request\s*\)/,'void 0');
  assert.ok(auditFromTexts(x).contractDrift.includes('STAFF_GENERATOR_AUTH'));
});
test('caller-draft source is not misrepresented as trusted DB source', () => {
  const r=auditRepository(root);assert.equal(r.captureReady,false);
  assert.ok(r.unresolved.includes('GENERATOR_ACCEPTS_AUTHORING_DRAFT_NOT_ATOMIC_VERSIONED_DB_SOURCE'));
});
test('source-bound generation refactor requires fresh review', () => {
  const x=load();x.generateRoute+='\nresolveStaffMathTeachingSource();\n';
  assert.ok(auditFromTexts(x).contractDrift.includes('GENERATOR_NOT_TRUSTED_SOURCE_BOUND'));
});
test('visual generation guard removal detected', () => {
  const x=load();x.pipeline=x.pipeline.replace(/visual\.generation\.status\s*!==\s*["']generated["']/,'false');
  assert.ok(auditFromTexts(x).contractDrift.includes('VISUAL_GENERATION_REQUIRED_FOR_TEACHING'));
});
test('Luna fallback guard removal detected', () => {
  const x=load();x.teachingPipeline=x.teachingPipeline.replace(/rulesDraft\.status\s*!==\s*["']deferred_to_luna["']/,'false');
  assert.ok(auditFromTexts(x).contractDrift.includes('RULES_FIRST_TEACHING_FALLBACK'));
});
test('math teaching validator removal detected', () => {
  const x=load();x.teachingPipeline=x.teachingPipeline.replaceAll('validateMathTeachingVisualDraft','unverifiedDraft');
  assert.ok(auditFromTexts(x).contractDrift.includes('VALIDATION_REQUIRED'));
});
test('provider requests changing shape flagged for review', () => {
  const x=load();x.provider=x.provider.replace('store: false','store: true');
  assert.ok(auditFromTexts(x).contractDrift.includes('EXISTING_LUNA_PROVIDER_REQUEST'));
});
test('answer-key payload removal forces assessment update instead of stale warning', () => {
  const x=load();x.provider=x.provider.replace('correct_answer: input.correct_answer,','');
  assert.ok(auditFromTexts(x).contractDrift.includes('POSSIBLE_ANSWER_CONTEXT_SENT_TO_PROVIDER'));
});
test('staff role verification removal detected', () => {
  const x=load();x.auth=x.auth.replace('role !== "admin"','false');
  assert.ok(auditFromTexts(x).contractDrift.includes('STAFF_AUTH_ROLE_RECHECK'));
});
test('specialist activation change is flagged', () => {
  const x=load();x.specialist=x.specialist.replace('methodActivated: false, scoresModified:', 'methodActivated: true, scoresModified:');
  assert.ok(auditFromTexts(x).contractDrift.includes('SPECIALIST_REMAINS_SHADOW'));
});
test('specialist integration into legacy generator requires design review', () => {
  const x=load();x.pipeline+='\nPHASE4E2B8C2C3A_SPECIALIST_DRAFTS();';
  assert.ok(auditFromTexts(x).contractDrift.includes('NO_SPECIALIST_LINK_TO_AUTHORING_GENERATOR'));
});
test('actual model or DB actions are never executed by contract audit', () => {
  const original=global.fetch;
  global.fetch=()=>{throw new Error('must never call fetch');};
  try {assert.ok(auditRepository(root).sourceContracts.length >= 10);} finally {global.fetch=original;}
});
