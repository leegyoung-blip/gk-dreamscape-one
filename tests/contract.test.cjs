const assert = require('node:assert').strict;
const { test } = require('node:test');
const { classifyConfidence, stableTieBreak, validateSelectionBoundary, validateStrategySelection,
  SCORE_WEIGHTS, EXPECTED_UPSTREAM_SCHEMAS, RANKING_PRIORITY } = require('../build/index.js');

function assessment(methodId, points = 95, rank = 1) {
  const dimensionScores = RANKING_PRIORITY.map((dimension, i) => ({ dimension,
    maximum: SCORE_WEIGHTS[dimension], points: SCORE_WEIGHTS[dimension] - (i === 0 ? 100 - points : 0) }));
  return { methodId, familyId: 'number.place_value', eligible: true, rank, score: points,
    complexity: 1, dimensionScores, positiveEvidence: [], penalties: [], exclusions: [], explanationCodes: ['EXACT_MATCH'] };
}
function base() {
  return { schemaVersion: '4C.1', status: 'selected', questionId: 'P3-EXAMPLE',
    primaryFamilyId: 'number.place_value', primaryMethodId: 'number.place_value.place_value_chart',
    supportingMethodIds: [], confidence: 'high', confidenceScore: 95, winnerMargin: null,
    candidates: [assessment('number.place_value.place_value_chart')], issues: [],
    provenance: { teachingContractSchema: '4A-3.1', teachingConsumerSchema: '4A-3-CONSUMER.1',
      methodLibrarySchema: '4B.1', methodTaxonomySchema: '4B-1.1',
      selectionPolicyVersion: '4C-1.1', teachingContractFingerprint: 'fnv1a32:12345678', selectorImplementation: 'not-built' }};
}
test('weights sum to 100', () => assert.equal(Object.values(SCORE_WEIGHTS).reduce((a,b)=>a+b,0),100));
test('valid schema and selected fixture', () => assert.deepEqual(validateStrategySelection(base()).issues, []));
test('blocks premature upstream contracts', () => {
  const i = { questionId: 'q', readyForMethodSelection: false,
    teachingContractFingerprint:'fp', primaryFamilyId:'number.place_value',
    teachingContractSchema: EXPECTED_UPSTREAM_SCHEMAS.teachingContract,
    teachingConsumerSchema: EXPECTED_UPSTREAM_SCHEMAS.teachingConsumer,
    methodLibrarySchema: EXPECTED_UPSTREAM_SCHEMAS.methodLibrary,
    methodTaxonomySchema: EXPECTED_UPSTREAM_SCHEMAS.methodTaxonomy };
  assert.deepEqual(validateSelectionBoundary(i).issues, ['UPSTREAM_NOT_READY']);
});
test('enforces no supporting methods in 4C-1', () => {
  const s = base(); s.supportingMethodIds.push('other');
  assert.ok(validateStrategySelection(s).issues.includes('SUPPORTING_METHODS_RESERVED_FOR_4C3'));
});
test('cannot disguise an excluded method as eligible', () => {
  const s = base(); s.candidates[0].exclusions.push({code:'LEVEL_INCOMPATIBLE',detail:'Not P3'});
  assert.ok(validateStrategySelection(s).issues.includes('ELIGIBLE_CANDIDATE_INVALID'));
});
test('does not force a winner when margin is narrow', () => {
  assert.equal(classifyConfidence(99, 97), 'none');
  assert.equal(classifyConfidence(74, null), 'none');
  assert.equal(classifyConfidence(95, 70), 'high');
});
test('ties settle on simplicity then stable id', () => {
  assert.ok(stableTieBreak({complexity:0, methodId:'z'}, {complexity:1, methodId:'a'}) < 0);
  assert.ok(stableTieBreak({complexity:0, methodId:'a'}, {complexity:0, methodId:'b'}) < 0);
});
test('fail closed for invalid rank', () => {
  const s=base();s.candidates[0].rank=2;
  assert.ok(validateStrategySelection(s).issues.includes('RANK_SEQUENCE_INVALID'));
});
