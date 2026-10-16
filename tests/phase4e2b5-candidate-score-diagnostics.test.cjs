/** DREAMSCAPE ONE 4E-2B-5 — Staff-only selector score transparency. Offline tests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const serviceSource = fs.readFileSync(path.join(root, 'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts'), 'utf8');
const panelSource = fs.readFileSync(path.join(root, 'app/curriculum-developer/components/math-intelligence/StaffMathMethodPreviewPanel.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'app/curriculum-developer/components/math-intelligence/StaffMathMethodPreviewPanel.module.css'), 'utf8');
const secret = 'ANSWER_SECRET_SHOULD_NEVER_LEAK';
const quizId = '11111111-1111-4111-8111-111111111111';
const questionId = '22222222-2222-4222-8222-222222222222';

const candidate = (methodId, rank, score, opts={}) => ({
  methodId, familyId:'FAM_PATTERN', rank, score, eligible:opts.eligible ?? true,
  exclusions:opts.exclusions ?? [],
  dimensionScores:opts.dimensions ?? [{dimension:'problem_structure',points:25,maximum:35}],
  positiveEvidence:[{dimension:'problem_structure',code:'DANGER',detail:secret}],
  penalties:[{dimension:'problem_structure',code:'DANGER',detail:secret}],
  explanationCodes:[secret],
});
const ambiguousResult = (items) => ({
  status:'ambiguous', candidateMethodCount:items.length, primaryFamilies:['FAM_PATTERN'],
  reasonCodes:['SINGLE_FAMILY_SELECTION_AMBIGUOUS'],
  familySelections:[{
    status:'ambiguous', issues:[{code:'INSUFFICIENT_WINNER_MARGIN',detail:secret}],
    candidates:items,
  }],
});
function run(selection) {
  const mock = {
    'server-only':{},
    '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion':{
      normalizeCanonicalTeachingQuestion:() => ({identity:{quizId,questionId},diagnostics:{readyForUnderstanding:true,issues:[]}}),
    },
    '../../../math-intelligence/teaching/understanding/understandTeachingQuestion':{
      understandTeachingQuestion:() => ({readyForMethodSelection:true}),
    },
    '../../../math-intelligence/teaching/contract/buildTeachingContract':{
      buildTeachingContract:() => ({status:'ready'}),
    },
    '../../../math-intelligence/teaching/contract/consumer/boundary':{
      createPhase4BMethodLibraryContractView:() => ({status:'ready',envelope:{consumer:'phase_4b_method_library'}}),
      createPhase4CStrategySelectorContractView:() => ({status:'ready',envelope:{consumer:'phase_4c_strategy_selector'}}),
    },
    '../strategy-selection/phase4C4Adapter':{
      selectFromPhase4A4B:(input) => {
        assert.equal(input.verifiedEvidence,undefined);
        assert.equal(input.learnerPrerequisiteEvidence,undefined);
        assert.equal(input.reviewedMathEvidence,undefined);
        return selection;
      },
    },
    './phase4E2A3StaffSourceResolver.server':{
      resolveStaffMathTeachingSource:async () => ({status:'ready',
        source:{question:{answer_data:{answer:secret}}},sourceIdentity:{quizId,questionId}}),
    },
  };
  const result = ts.transpileModule(serviceSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
  assert.equal(result.diagnostics.length,0);
  const module = {exports:{}};
  vm.runInNewContext(result.outputText, {module,exports:module.exports,require:(name)=>{
    if(!(name in mock))throw Error(`Unexpected module: ${name}`);
    return mock[name];
  }});
  return module.exports.previewStaffMathMethod(new Request('https://example.test'), {quizId,questionId});
}

test('TS and TSX syntax checks pass',()=>{
  for(const [text,jsx] of [[serviceSource,false],[panelSource,true]]) {
    const result=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
    assert.deepEqual((result.diagnostics||[]).map(x=>x.messageText),[]);
  }
});
test('ambiguous preview reveals safe three-candidate rank and score comparison',async()=>{
  const response=await run(ambiguousResult([
    candidate('METHOD-A',1,73.421),candidate('METHOD-B',2,70.124),candidate('METHOD-C',3,65),
  ]));
  const clean=JSON.parse(JSON.stringify(response));
  assert.equal(clean.status,'ambiguous');
  assert.equal(clean.studentReleased,false);
  assert.equal(clean.teachingApproved,false);
  assert.equal(clean.scoreComparison.candidates.length,3);
  assert.equal(clean.scoreComparison.candidates[0].score,73.42);
  assert.equal(clean.scoreComparison.candidates[1].score,70.12);
  assert.equal(clean.scoreComparison.candidates[0].rank,1);
  assert.deepEqual(clean.scoreComparison.selectionIssueCodes,['INSUFFICIENT_WINNER_MARGIN']);
  assert.deepEqual(clean.scoreComparison.candidates[0].dimensions,[{dimension:'problem_structure',points:25,maximum:35}]);
  assert.ok(!JSON.stringify(clean).includes(secret),'answer-bearing evidence must never cross server boundary');
});
test('ineligible candidates have no score and show only exclusion codes',async()=>{
  const response=await run(ambiguousResult([candidate('METHOD-Z',null,99,{
    eligible:false, exclusions:[{code:'MANDATORY_PREREQUISITE_MISSING',detail:secret}],
  })]));
  const c=JSON.parse(JSON.stringify(response)).scoreComparison.candidates[0];
  assert.equal(c.eligible,false);assert.equal(c.score,null);assert.equal(c.rank,null);
  assert.deepEqual(c.exclusionCodes,['MANDATORY_PREREQUISITE_MISSING']);
  assert.deepEqual(c.dimensions,[]);
  assert.ok(!JSON.stringify(c).includes(secret));
});
test('candidate score diagnostics bounded and malformed fields sanitized',async()=>{
  const entries=Array.from({length:20}, (_,i)=>candidate('MTH-'+i, i+1,50));
  entries[0].dimensionScores.push({dimension:'answer_data',points:99,maximum:100});
  entries[0].exclusions.push({code:'UNSAFE_'+secret+'<',detail:secret});
  entries[0].score=Number.POSITIVE_INFINITY;
  const response=await run(ambiguousResult(entries));
  const clean=JSON.parse(JSON.stringify(response));
  assert.equal(clean.candidateMethodCount,20);
  assert.equal(clean.scoreComparison.candidates.length,12);
  assert.equal(clean.scoreComparison.candidates[0].score,null);
  assert.equal(clean.scoreComparison.candidates[0].dimensions.length,1);
  assert.deepEqual(clean.scoreComparison.candidates[0].exclusionCodes,[]);
  assert.ok(!JSON.stringify(clean).includes(secret));
});
test('selected preview still contains method only and remains release-disabled',async()=>{
  const response=await run({status:'selected',candidateMethodCount:3,selection:{primaryMethodId:'MTH-1',primaryFamilyId:'FAM_PATTERN',confidence:'medium'}});
  assert.equal(response.status,'selected');assert.equal(response.methodId,'MTH-1');
  assert.equal(response.scoreComparison,undefined);assert.equal(response.studentReleased,false);
});
test('blocked selector remains blocked and does not expose candidate scores',async()=>{
  const response=await run({status:'blocked',reasonCodes:['NO_4B_PRIMARY_CANDIDATES'],candidateMethodCount:0});
  assert.equal(response.status,'blocked');assert.equal(response.scoreComparison,undefined);
  assert.equal(response.studentReleased,false);
});
test('UI shows candidate table and expandable scoring, not answer data',()=>{
  assert.match(panelSource,/Candidate comparison/);
  assert.match(panelSource,/selectionIssueCodes/);
  assert.match(panelSource,/Score breakdown/);
  assert.match(panelSource,/candidateTable/);
  assert.match(panelSource,/teachingApproved !== false/);
  assert.match(panelSource,/studentReleased !== false/);
  assert.ok(!panelSource.includes('dangerouslySetInnerHTML'));
  assert.ok(!panelSource.includes('answer_data'));
  assert.match(cssSource,/\.candidateTableWrapper/);
});
test('service never serializes raw internal selector candidates or evidence',()=>{
  assert.ok(!serviceSource.includes('return selection;'));
  assert.ok(!serviceSource.includes('...selection'));
  assert.ok(!serviceSource.includes('positiveEvidence:'));
  assert.ok(!serviceSource.includes('answer_data'));
  assert.ok(!serviceSource.includes('export async function POST'));
});
