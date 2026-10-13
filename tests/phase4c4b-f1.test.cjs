const test = require('node:test');
const assert = require('node:assert/strict');
const { phase4AConsumerPayloadsAgree, selectFromPhase4A4B } = require('../build/math/teaching/strategy-selection/phase4C4Adapter.js');
const { createTeachingContractConsumerEnvelope } = require('../build/math-intelligence/teaching/contract/consumer/boundary.js');

function pair() {
  const payload = {identity:{questionId:'q-test'}, curriculum:{learnerLevel:3}, mathematics:{domain:'fractions',problemStructure:'fraction_comparison'}};
  return [
    {schemaVersion:'4A-3-CONSUMER.1',contractSchemaVersion:'4A-3.1',consumer:'phase_4b_method_library',questionId:'q-test',payloadFingerprint:'fnv1a32:aaaaaaaa',contract:structuredClone(payload)},
    {schemaVersion:'4A-3-CONSUMER.1',contractSchemaVersion:'4A-3.1',consumer:'phase_4c_strategy_selector',questionId:'q-test',payloadFingerprint:'fnv1a32:bbbbbbbb',contract:structuredClone(payload)},
  ];
}
test('different consumer-scoped fingerprints do not imply payload mismatch',()=>{
  const [b,c]=pair();assert.notEqual(b.payloadFingerprint,c.payloadFingerprint);assert.equal(phase4AConsumerPayloadsAgree(b,c),true);
});
test('payload differences are rejected even with matching fingerprints',()=>{
  const [b,c]=pair();c.payloadFingerprint=b.payloadFingerprint;c.contract.mathematics.domain='geometry';assert.equal(phase4AConsumerPayloadsAgree(b,c),false);
});
test('question identity mismatch is rejected',()=>{
  const [b,c]=pair();c.questionId='another';assert.equal(phase4AConsumerPayloadsAgree(b,c),false);
});
test('consumer kind reversal is rejected',()=>{
  const [b,c]=pair();assert.equal(phase4AConsumerPayloadsAgree(c,b),false);
});
test('invalid consumer fingerprint still fails original validation',()=>{
  const [b,c]=pair();const result=selectFromPhase4A4B({methodLibraryEnvelope:b,strategyEnvelope:c});
  assert.equal(result.status,'blocked');assert.deepEqual(result.reasonCodes,['INVALID_4A_ENVELOPE']);
});
