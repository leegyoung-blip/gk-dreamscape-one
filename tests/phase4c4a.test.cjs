const test = require('node:test');
const assert = require('node:assert/strict');
const {selectFromPhase4A4B, PHASE4C4_ADAPTER_VERSION} = require('../build/math/teaching/strategy-selection/phase4C4Adapter.js');
const {PHASE4B_ALL_PRODUCTION_METHODS} = require('../build/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.js');

test('adapter schema version is pinned',()=>assert.equal(PHASE4C4_ADAPTER_VERSION,'4C-4A.1'));
test('real production registry has 153 entries',()=>assert.equal(PHASE4B_ALL_PRODUCTION_METHODS.length,153));
test('missing inputs fail closed',()=>{
 const x=selectFromPhase4A4B({}); assert.equal(x.status,'blocked'); assert.deepEqual(x.reasonCodes,['ENVELOPES_REQUIRED']);
});
test('unverified malformed envelopes fail closed',()=>{
 const x=selectFromPhase4A4B({methodLibraryEnvelope:{},strategyEnvelope:{}});
 assert.equal(x.status,'blocked'); assert.deepEqual(x.reasonCodes,['INVALID_4A_ENVELOPE']);
});
test('identical inputs produce identical blocked reports',()=>{
 const input={methodLibraryEnvelope:{},strategyEnvelope:{}};
 assert.deepEqual(selectFromPhase4A4B(input),selectFromPhase4A4B(input));
});
