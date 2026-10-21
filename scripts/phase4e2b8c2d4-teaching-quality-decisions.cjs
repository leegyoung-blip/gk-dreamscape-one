'use strict';
/**
 * DREAMSCAPE ONE | Phase 4E-2B-8C-2D.4
 * Offline teacher-decision EVIDENCE audit, never method activation or approval.
 * Uses 8C-2D.3 authored references and independent offline CSV inputs.
 * NO API, database calls, learner release, score adjustment, or file writes.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const pairsAudit = require('./phase4e2b8c2d3-pedagogical-comparison.cjs');
const ROOT = path.resolve(__dirname, '..');
const SCORES = 'docs/phase4e2b8c2d3-educator-scoring-template.csv';
const ROLES = 'docs/phase4e2b8c2d3-method-role-template.csv';
const DIMENSIONS = Object.freeze([
  'mathematical_correctness', 'conceptual_explanation', 'representation_clarity',
  'step_progression', 'misconception_response', 'learner_accessibility'
]);
const SCORE_HEAD = Object.freeze([
  'case_id', 'reviewer_code', 'variant', ...DIMENSIONS.map(d => d + '_0_3'),
  'hard_stop_yes_no', 'hard_stop_reason', 'specific_strength', 'specific_concern', 'human_review_status'
]);
const ROLE_HEAD = Object.freeze([
  'case_id', 'reviewer_code', 'specialist_role_primary_supporting_not_warranted_undecided',
  'reasoning_with_example', 'complexity_or_visual_tradeoff', 'disagreement_followup', 'approval_status'
]);
const REVIEWERS = Object.freeze(['R1', 'R2']);
const VARIANTS = Object.freeze(['A', 'B']);
const PROPOSED_ROLES = Object.freeze(['primary', 'supporting', 'not_warranted', 'undecided']);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const norm = v => typeof v === 'string' ? v.trim() : '';
const hash = v => crypto.createHash('sha256').update(v).digest('hex');

// RFC4180-style CSV parser: quoted commas, escaped quotes, CRLF and quoted newlines.
function parseCsv(raw, expectedHead) {
  if (typeof raw !== 'string' || raw.length > 500_000) throw new Error('CSV_SIZE_OR_TYPE_INVALID');
  const str = raw.replace(/^\uFEFF/, '');
  const rows=[]; let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<str.length;i++){
    const c=str[i];
    if(quoted){
      if(c==='"' && str[i+1]==='"'){field+='"';i++;}
      else if(c==='"'){quoted=false;closed=true;}
      else field+=c;
    }else if(c==='"' && !closed && field===''){quoted=true;}
    else if(c===',') {row.push(field);field='';closed=false;}
    else if(c==='\r' || c==='\n'){
      if(c==='\r'&&str[i+1]==='\n')i++;
      row.push(field);rows.push(row);row=[];field='';closed=false;
    }else {
      if(closed)throw new Error('CSV_CHARS_AFTER_QUOTE');
      if(c==='"')throw new Error('CSV_UNEXPECTED_QUOTE');
      field+=c;
    }
  }
  if(quoted)throw new Error('CSV_UNTERMINATED_QUOTE');
  if(field!==''||row.length){row.push(field);rows.push(row);}
  if(!rows.length)throw new Error('CSV_EMPTY');
  if(JSON.stringify(rows[0])!==JSON.stringify(expectedHead))throw new Error('CSV_HEADER_MISMATCH');
  return rows.slice(1).filter(r=>!(r.length===1&&r[0]==='')).map(r=>{
    if(r.length!==expectedHead.length)throw new Error('CSV_COLUMN_COUNT_MISMATCH');
    return Object.fromEntries(expectedHead.map((h,i)=>[h,r[i]]));
  });
}
function key(row){return `${norm(row.case_id)}|${norm(row.reviewer_code)}`;}
function indexInputs(rows, pairs, withVariant) {
  const issues=[],index=new Map(),expected=new Set();
  for(const p of pairs)for(const reviewer of REVIEWERS)for(const variant of withVariant?VARIANTS:[''])
    expected.add(`${p.caseId}|${reviewer}${withVariant?'|'+variant:''}`);
  for(const row of rows){
    const id=key(row)+(withVariant?'|'+norm(row.variant):'');
    if(!expected.has(id))issues.push('UNKNOWN_REVIEW_ROW');
    if(index.has(id))issues.push('DUPLICATE_REVIEW_ROW');
    index.set(id,row);
  }
  for(const id of expected)if(!index.has(id))issues.push('MISSING_REVIEW_ROW');
  return {index,issues};
}
function scoreRow(row) {
  if(!row)return {state:'invalid',reason:'MISSING_SCORE_ROW'};
  const flag=norm(row.hard_stop_yes_no).toLowerCase();
  const status=norm(row.human_review_status).toUpperCase();
  if(!['PENDING','COMPLETE'].includes(status))return {state:'invalid',reason:'INVALID_REVIEW_STATUS'};
  if(!['','yes','no'].includes(flag))return {state:'invalid',reason:'INVALID_HARD_STOP_FLAG'};
  const scores={};let filled=0;
  for(const dim of DIMENSIONS){
    const val=norm(row[dim+'_0_3']);
    if(val!==''){
      if(!/^[0-3]$/.test(val))return {state:'invalid',reason:'INVALID_RUBRIC_SCORE'};
      scores[dim]=Number(val);filled++;
    }
  }
  if(status==='PENDING')return {state:'pending',hardStop:flag==='yes',reason:'EDUCATOR_REVIEW_INCOMPLETE'};
  if(filled!==DIMENSIONS.length||!flag)return {state:'invalid',reason:'COMPLETE_REVIEW_HAS_MISSING_SCORES'};
  if(flag==='yes' && norm(row.hard_stop_reason).length<12)return {state:'invalid',reason:'HARD_STOP_REASON_REQUIRED'};
  if(flag==='no' && norm(row.hard_stop_reason)!=='')return {state:'invalid',reason:'UNEXPLAINED_HARD_STOP_REASON'};
  if(norm(row.specific_strength).length<12||norm(row.specific_concern).length<12)
    return {state:'invalid',reason:'EVIDENCE_COMMENTS_REQUIRED'};
  const total=DIMENSIONS.reduce((a,d)=>a+scores[d],0);
  // An advisory floor from 8C-2D.3. Never a release rule, never overrides hard stop.
  const passesSuggestedFloor=DIMENSIONS.every(d=>scores[d]>=2)&&total>=15&&scores.mathematical_correctness===3;
  return {state:'complete',scores,total,hardStop:flag==='yes',passesSuggestedFloor};
}
function roleRow(row){
  if(!row)return {state:'invalid',reason:'MISSING_ROLE_ROW'};
  const role=norm(row.specialist_role_primary_supporting_not_warranted_undecided).toLowerCase();
  const approval=norm(row.approval_status).toUpperCase();
  if(!PROPOSED_ROLES.includes(role))return {state:'invalid',reason:'UNKNOWN_PROPOSED_ROLE'};
  // Explicitly reject claim of approval (no approval is possible in an offline worksheet).
  if(approval!=='PENDING')return {state:'invalid',reason:'UNAUTHORIZED_APPROVAL_CLAIM'};
  if(role==='undecided')return {state:'pending',role,reason:'ROLE_UNDECIDED'};
  if(norm(row.reasoning_with_example).length<20||norm(row.complexity_or_visual_tradeoff).length<20)
    return {state:'invalid',role,reason:'ROLE_EVIDENCE_NOT_SUBSTANTIATED'};
  return {state:'complete',role};
}
function advisePair(pair,scoreIndex,roleIndex){
  const rows=[],reasons=[];
  let incomplete=false,invalid=false,hardStop=false,lowQuality=false;
  const group={};
  for(const reviewer of REVIEWERS){
    group[reviewer]={};
    for(const variant of VARIANTS){
      const r=scoreRow(scoreIndex.get(`${pair.caseId}|${reviewer}|${variant}`));
      group[reviewer][variant]=r;
      rows.push(r);
    }
    const r=roleRow(roleIndex.get(`${pair.caseId}|${reviewer}`));
    group[reviewer].role=r;rows.push(r);
  }
  for(const r of rows){
    if(r.state==='invalid'){invalid=true;reasons.push(r.reason);}
    else if(r.state==='pending')incomplete=true;
    if(r.hardStop)hardStop=true;
    if(r.state==='complete'&&own(r,'passesSuggestedFloor')&&!r.passesSuggestedFloor)lowQuality=true;
  }
  let status='AWAITING_EDUCATOR_REVIEWS';
  if(invalid)status='INVALID_REVIEW_EVIDENCE';
  else if(hardStop){status='HARD_STOP_ADJUDICATION_REQUIRED';reasons.push('HARD_STOP_OVERRIDES_TOTAL_SCORE');}
  else if(incomplete)status='AWAITING_EDUCATOR_REVIEWS';
  else if(lowQuality){status='QUALITY_CONCERNS_REQUIRE_REVIEW';reasons.push('REFERENCE_QUALITY_FLOOR_UNMET');}
  else if(group.R1.role.role!==group.R2.role.role){
    status='REVIEWER_DISAGREEMENT';reasons.push('INDEPENDENT_ROLE_PROPOSALS_DISAGREE');
  } else {
    const role=group.R1.role.role;
    if(role==='primary'){
      const advantage=REVIEWERS.every(reviewer=>{
        const g=group[reviewer], spec=g[pair.reviewOrder[0]==='specialist'?'A':'B'].scores;
        const inc=g[pair.reviewOrder[0]==='incumbent'?'A':'B'].scores;
        const focus=['conceptual_explanation','misconception_response','learner_accessibility'];
        return focus.some(d=>spec[d]>inc[d]) && focus.every(d=>spec[d]>=inc[d]);
      });
      status=advantage?'PROVISIONAL_PRIMARY_CANDIDATE':'PRIMARY_ADVANTAGE_NOT_DEMONSTRATED';
      if(!advantage)reasons.push('NO_CONSISTENT_FOCUS_DIMENSION_ADVANTAGE');
    }else if(role==='supporting')status='PROVISIONAL_SUPPORTING_CANDIDATE';
    else if(role==='not_warranted')status='PROVISIONAL_NOT_WARRANTED_CANDIDATE';
  }
  return {caseId:pair.caseId,specialistMethodId:pair.specialistMethodId,
    incumbentMethodId:pair.incumbentMethodId,status,
    provisionalRole:status==='PROVISIONAL_PRIMARY_CANDIDATE'?'primary':
      status==='PROVISIONAL_SUPPORTING_CANDIDATE'?'supporting':
      status==='PROVISIONAL_NOT_WARRANTED_CANDIDATE'?'not_warranted':'undecided',
    issues:[...new Set(reasons)],approvalGranted:false,studentFacing:false,
    source:'authored_synthetic_pair_not_live_nova_output'};
}
function evaluate({pairs,scoreRows,roleRows,pairAuditStatus}){
  const issues=[];
  if(!Array.isArray(pairs)||pairs.length!==6||pairAuditStatus!=='OFFLINE_PAIR_CHECKS_PASSED')
    issues.push('PREVIOUS_SYNTHETIC_PAIR_AUDIT_NOT_PASSED');
  const scores=indexInputs(scoreRows,pairs,true),roles=indexInputs(roleRows,pairs,false);
  issues.push(...scores.issues,...roles.issues);
  const cases=pairs.map(p=>advisePair(p,scores.index,roles.index));
  const pending=cases.filter(x=>x.status==='AWAITING_EDUCATOR_REVIEWS').length;
  const provisional=cases.filter(x=>x.status.startsWith('PROVISIONAL_')).length;
  const blocked=cases.filter(x=>!x.status.startsWith('PROVISIONAL_')&&x.status!=='AWAITING_EDUCATOR_REVIEWS').length;
  const status=issues.length||cases.some(x=>x.status==='INVALID_REVIEW_EVIDENCE')?'REVIEW_INPUTS_INVALID':
     pending?'REVIEW_EVIDENCE_INCOMPLETE':blocked?'EDUCATOR_ADJUDICATION_REQUIRED':'PROVISIONAL_RECOMMENDATIONS_ONLY';
  return {phase:'4E-2B-8C-2D.4',status,sourceCaseCount:cases.length,
    scoreRows:scoreRows.length,roleRows:roleRows.length,pending,provisional,blocked,
    issues:[...new Set(issues)],cases,
    approvalGranted:false,approvedMethods:0,productionScoresChanged:false,learnerReleased:false,
    realNovaOutputsReviewed:false,realIncumbentOutputsReviewed:false,reviewerIdentityVerified:false,
    teacherConsensusIsNotApproval:true,betaReady:false,
    note:'Only provisional offline judgments of synthetic, human-authored comparisons. Requires authenticated educator review, real NOVA outputs, production provenance and beta gates before approval or release.'};
}
function loadFromDisk(scoreFile=SCORES,roleFile=ROLES){
  const source=pairsAudit.load(),prior=pairsAudit.evaluate(source.pairs,source.source,source.book,source.drafts);
  const pairText=fs.readFileSync(path.join(ROOT,'tests/fixtures/phase4e2b8c2d3-paired-explanations.json'),'utf8');
  return {pairs:source.pairs.comparisons,
    pairAuditStatus:prior.status,
    pairFixtureSha256:hash(pairText),
    scoreRows:parseCsv(fs.readFileSync(path.resolve(ROOT,scoreFile),'utf8'),SCORE_HEAD),
    roleRows:parseCsv(fs.readFileSync(path.resolve(ROOT,roleFile),'utf8'),ROLE_HEAD)};
}
function run(argv=process.argv.slice(2)){
  const allowed=['--json','--strict-complete','--scores','--roles'];
  for(const a of argv)if(a.startsWith('--')&&!allowed.includes(a))throw new Error('UNKNOWN_FLAG');
  function opt(flag,fallback){const i=argv.indexOf(flag);if(i<0)return fallback;
    if(!argv[i+1]||argv[i+1].startsWith('--'))throw new Error('MISSING_FLAG_VALUE');return argv[i+1];}
  const {pairFixtureSha256,...data}=loadFromDisk(opt('--scores',SCORES),opt('--roles',ROLES));
  const report={...evaluate(data),pairFixtureSha256};
  if(argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else {
    console.log(`Phase ${report.phase}: ${report.status}`);
    console.log(`Source fixture SHA256: ${report.pairFixtureSha256}`);
    console.log(`${report.sourceCaseCount} synthetic pairs | ${report.pending} pending | ${report.blocked} need adjudication | ${report.provisional} provisional only`);
    for(const row of report.cases)console.log(`${row.caseId}: ${row.status}`);
    console.log('Teaching-method approval: NONE | Learner release: DISABLED | Real NOVA output review: PENDING');
  }
  if(report.status==='REVIEW_INPUTS_INVALID'||
     (argv.includes('--strict-complete')&&report.status!=='PROVISIONAL_RECOMMENDATIONS_ONLY'))
    process.exitCode=1;
  return report;
}
if(require.main===module){try{run();}catch(err){console.error('REVIEW_INPUTS_INVALID: '+err.message);process.exitCode=1;}}
module.exports={DIMENSIONS,SCORE_HEAD,ROLE_HEAD,parseCsv,scoreRow,roleRow,indexInputs,advisePair,evaluate,loadFromDisk,run};
