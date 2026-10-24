'use strict';
/**
 * DREAMSCAPE ONE 4E-2B-8C-2D.8B-7C
 * OFFLINE authoring references only. No API, DB, AI call, production writes,
 * activation, automated pedagogical approval or educational outcome claims.
 * Node built-ins only; cross-platform.
 */
const fs = require('node:fs');
const path = require('node:path');
const VERSION = '8C2D8B7C.v1';
const REL = 'tests/fixtures/phase4e2b8c2d8b7c-refined-teaching.json';
const EXPECTED_CASES = Object.freeze([
  'SPACING_VALID_MAIN', 'SPACING_VALID_ADJACENT', 'CHAIN_VALID_HALF',
  'CHAIN_VALID_SHARED_BASE', 'RATIO_VALID_MAIN', 'RATIO_VALID_DIFFERENT_SCALE',
]);
const METHOD = Object.freeze({
  spacing: 'heuristic.multi_step.equal_spacing_interval_count',
  comparison: 'heuristic.multi_step.multiplicative_comparison_chain',
  changing_ratio: 'ratio.relationship.before_after_change',
});
const BANNED = /\b(?:indices|prerequisite|dependency|intermediate result|before-ratio unit|after-ratio unit|coefficient|algebraic manipulation|substitution|enforce|reference quantity|ratio state|interval count|compute|solve for x)\b/i;
const safeObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const escapeHtml = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const rounded = x => Number.isFinite(x) && Number.isSafeInteger(x);
const exact = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const words = txt => String(txt).match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
const keyset = list => [...list].sort().join('|');
function expectedAnswer(f) {
  if (!safeObject(f)) return null;
  if (f.kind==='spacing' && [f.first, f.last, f.gapLength].every(rounded) && f.first < f.last && f.gapLength > 0)
    return (f.last - f.first) * f.gapLength;
  if (f.kind==='spacing_route' && [f.start,f.turn,f.end,f.gapLength].every(rounded) &&
      f.start < f.end && f.end < f.turn && f.gapLength > 0)
    return ((f.turn-f.start) + (f.turn-f.end)) * f.gapLength;
  if (f.kind==='comparison' && safeObject(f.parts) && keyset(Object.keys(f.parts))===keyset(['Alan','Bella','Chen']) &&
      Object.values(f.parts).every(x=>rounded(x)&&x>0) && rounded(f.total) && f.total>0 && f.target==='Chen') {
    const parts = Object.values(f.parts).reduce((a,b)=>a+b,0);
    return f.total % parts === 0 ? f.total / parts * f.parts.Chen : null;
  }
  if (f.kind==='changing_ratio' && Array.isArray(f.before) && Array.isArray(f.added) &&
      Array.isArray(f.after) && f.before.length===2 && f.added.length===2 && f.after.length===2 &&
      [...f.before,...f.added,...f.after].every(rounded) && f.before.every(x=>x>0) &&
      f.added.every(x=>x>=0) && f.after[0]===1 && f.after[1]===2) {
    const divisor = 2*f.before[0]-f.before[1];
    const numerator = f.added[1]-2*f.added[0];
    if (!divisor || numerator % divisor) return null;
    const u = numerator/divisor;
    const afterA=f.before[0]*u+f.added[0], afterB=f.before[1]*u+f.added[1];
    return u>0 && afterB===2*afterA && afterA>0 ? f.before[1]*u : null;
  }
  return null;
}
function checkLearnerLanguage(c) {
  const issues=[];
  const text = [...(Array.isArray(c?.steps)?c.steps.map(s=>s?.say):[]), c?.quickCheck, c?.misconception];
  for (let i=0;i<text.length;i++) {
    const t=text[i];
    if (typeof t!=='string' || !t.trim() || t.length>310) { issues.push('EMPTY_OR_TOO_LONG_LEARNER_TEXT'); continue; }
    if (BANNED.test(t)) issues.push('TECHNICAL_JARGON_IN_LEARNER_TEXT');
    if (words(t).length > (c.level<=3 ? 36 : 47)) issues.push('WORDY_LEARNER_TEXT');
    if (/\b(?:as an AI|language model|I cannot|admin-only|staff preview)\b/i.test(t)) issues.push('INTERNAL_OR_AI_LANGUAGE');
    if (/<\/?[a-z][^>]*>/i.test(t)) issues.push('HTML_IN_LEARNER_TEXT');
  }
  if (c?.facts?.kind==='changing_ratio' &&
      !c.steps.some(s=>/let u (?:stand for|be) one equal part before the increase/i.test(s.say)))
    issues.push('VARIABLE_NOT_DEFINED_FOR_CHILD');
  return [...new Set(issues)];
}
function checkCase(c) {
  const issues=[];
  if (!safeObject(c) || !EXPECTED_CASES.includes(c.caseId)) return ['UNKNOWN_CASE'];
  if (![3,5,6].includes(c.level)) issues.push('WRONG_PRIMARY_LEVEL');
  const kind=c.facts?.kind;
  const mid=(kind==='spacing'||kind==='spacing_route')?METHOD.spacing:METHOD[kind];
  if (mid!==c.methodId) issues.push('METHOD_MISMATCH');
  const expected=expectedAnswer(c.facts);
  if (expected===null || expected!==c.answer?.value) issues.push('ARITHMETIC_MISMATCH');
  if ((kind==='changing_ratio' && c.answer?.unit!=='') || (kind!=='changing_ratio' && !['m','objects'].includes(c.answer?.unit))) issues.push('ANSWER_UNIT_INVALID');
  if (typeof c.question!=='string' || c.question.length<40 || typeof c.originalQuestion!=='string') issues.push('QUESTION_TEXT_MISSING');
  if (!Array.isArray(c.steps) || c.steps.length<3 || c.steps.length>6 ||
      c.steps.some(s=>!safeObject(s)||typeof s.say!=='string'||typeof s.working!=='string'))
    issues.push('MISSING_TEACHING_STEPS');
  if (c.caseId==='SPACING_VALID_MAIN' && c.steps?.length!==3) issues.push('UNNECESSARY_FOURTH_STEP');
  if (c.caseId==='SPACING_VALID_ADJACENT') {
    if(c.questionChange!=='proposed_multistep_replacement_not_the_reviewed_original' ||
       c.question===c.originalQuestion || c.originalAnswer?.value!==9 || c.answer?.value!==72)
      issues.push('Q2_REPLACEMENT_NOT_EXPLICIT');
  } else if (c.questionChange!=='none'||c.question!==c.originalQuestion) issues.push('SILENT_QUESTION_REPLACEMENT');
  const expectedDiagram=(kind==='spacing'||kind==='spacing_route') ?
    (kind==='spacing'?'number_line':'number_line_route') : kind==='comparison'?'bar_model':'before_after_bar_model';
  if(c.diagram?.kind!==expectedDiagram || typeof c.diagram.purpose!=='string' || c.diagram.purpose.length<30)
    issues.push('VISUAL_MODEL_MISSING');
  if(c.level>=5 && (!c.diagram?.kind.includes('bar_model') || !c.steps.some(s=>/equal parts?/i.test(s.say))))
    issues.push('BAR_MODEL_NOT_PRIMARY');
  if(kind==='changing_ratio' && c.facts.unit!==expected/(c.facts.before[1])) issues.push('RATIO_UNIT_MISMATCH');
  if(typeof c.quickCheck!=='string'||typeof c.misconception!=='string') issues.push('CHECK_OR_MISCONCEPTION_MISSING');
  if(!['A','B'].includes(c.preferredOriginalVariant)||typeof c.reviewOutcome!=='string') issues.push('USER_REVIEW_NOT_RECORDED');
  issues.push(...checkLearnerLanguage(c));
  return [...new Set(issues)];
}
function audit(data) {
  const issues=[];
  if(!safeObject(data)||data.schemaVersion!==VERSION||data.phase!=='4E-2B-8C-2D.8B-7C'||
    data.artifactType!=='human_refined_synthetic_teaching_reference'||data.realNovaOutput!==false||
    data.sourceAuthenticated!==false||data.approvedForLearners!==false||data.specialistMethodsActive!==false||
    data.productionMethodScoresChanged!==false||data.humanReviewCount!==1||data.releaseGatesUnchanged!==true)
      issues.push('BAD_PROVENANCE_OR_RELEASE_CLAIM');
  const cases=Array.isArray(data?.cases)?data.cases:[];
  if(cases.length!==6 || keyset(cases.map(c=>c.caseId))!==keyset(EXPECTED_CASES))issues.push('CASE_COVERAGE_INVALID');
  const rows=cases.map(c=>({caseId:c?.caseId||null, issues:checkCase(c)}));
  return {
    phase:'4E-2B-8C-2D.8B-7C', schemaVersion:VERSION,
    status:issues.length||rows.some(r=>r.issues.length)?'OFFLINE_REFINEMENT_BLOCKED':'OFFLINE_REFERENCE_CHECKS_PASSED_REVIEW_PENDING',
    cases:rows.length, passing:rows.filter(r=>r.issues.length===0).length,
    issues, rows,
    sourceReviewedByOnePerson:true, independentSecondEducatorReview:false,
    originalQ2ReplacedOnlyAsProposal:true, realNovaOutput:false, mathVerifiedForProduction:false,
    visualTeachingQualityHumanVerified:false, childLanguageHumanVerified:false,
    approvedForLearners:false, providerEnabled:false, scoringChanged:false, sourceFreshnessVerified:false,
    note:'Checks consistency of offline worked references, diagrams and obvious jargon; no proof of pedagogical quality or real model output.'
  };
}
function load(root=path.resolve(__dirname,'..')) {
  return JSON.parse(fs.readFileSync(path.join(root,REL),'utf8'));
}
function svgWrap(inner,width=700,height=180){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mathematics diagram"><rect width="${width}" height="${height}" fill="#ffffff"/>${inner}</svg>`;}
function svgText(x,y,t,extra=''){return `<text x="${x}" y="${y}" ${extra}>${escapeHtml(t)}</text>`;}
function svgNumberLine(f){
  const a=f.kind==='spacing'?f.first:f.start, b=f.kind==='spacing'?f.last:f.turn;
  const dx= Math.min(70,590/(b-a)); const x0=55, y=88;
  let out=`<line x1="${x0}" y1="${y}" x2="${x0+dx*(b-a)}" y2="${y}" stroke="#264a74" stroke-width="3"/>`;
  for(let k=a;k<=b;k++){
    const x=x0+(k-a)*dx;
    out+=`<circle cx="${x}" cy="${y}" r="5" fill="#266bb3"/>${svgText(x,y+23,k,'text-anchor="middle" font-size="14" fill="#243754"')}`;
    if(k<b)out+=svgText(x+dx/2,y-9,`${f.gapLength} m`,'text-anchor="middle" font-size="11" fill="#526781"');
  }
  if(f.kind==='spacing'){
    out+=svgText(350,40,`${b-a} gaps × ${f.gapLength} m = ${(b-a)*f.gapLength} m`,'text-anchor="middle" font-size="18" font-weight="700" fill="#123961"');
  } else {
    const at=k=>x0+dx*(k-a);
    out+=`<path d="M${at(f.start)} 52 L${at(f.turn)} 52" stroke="#188467" stroke-width="3" fill="none"/>`;
    out+=`<path d="M${at(f.turn)} 47 l-9 5 9 5" fill="none" stroke="#188467" stroke-width="3"/>`;
    out+=svgText(350,37,`${f.turn-f.start} gaps out`,'text-anchor="middle" font-size="14" fill="#188467"');
    out+=`<path d="M${at(f.turn)} 135 L${at(f.end)} 135" stroke="#bb5b29" stroke-width="3" fill="none"/>`;
    out+=`<path d="M${at(f.end)} 135 l9 -5 -9 -5" fill="none" stroke="#bb5b29" stroke-width="3"/>`;
    out+=svgText(350,159,`${f.turn-f.end} gaps back; total ${(f.turn-f.start)+(f.turn-f.end)} gaps = ${expectedAnswer(f)} m`,'text-anchor="middle" font-size="14" fill="#9b4c22"');
  }
  return svgWrap(out,700,185);
}
function svgComparison(f){
  let out=''; const names=['Alan','Bella','Chen']; const unit=52; const cols=['#79afda','#9bd4bd','#e4b46b'];
  const totalParts=Object.values(f.parts).reduce((a,b)=>a+b,0), onePart=f.total/totalParts;
  for(let i=0;i<3;i++){
    const name=names[i], n=f.parts[name], y=24+i*49, x=115;
    out+=svgText(18,y+22,name,'font-size="16" font-weight="700" fill="#243754"');
    for(let j=0;j<n;j++){
      out+=`<rect x="${x+j*unit}" y="${y}" width="${unit-2}" height="32" rx="3" fill="${cols[i]}" stroke="#356084"/>`;
      out+=svgText(x+j*unit+unit/2,y+22,String(onePart),'text-anchor="middle" font-size="13" fill="#12304d"');
    }
    out+=svgText(x+n*unit+12,y+22,`= ${n*onePart}`,'font-size="14" fill="#243754"');
  }
  out+=svgText(20,177,`Each small part is ${onePart} objects; together ${totalParts} equal parts = ${f.total}.`,'font-size="14" fill="#234361"');
  return svgWrap(out,700,195);
}
function svgChangingRatio(f){
  let out='';const px=6, unit=f.unit, left=128, rows=[
    {label:'A before',units:f.before[0],extra:0},
    {label:'B before',units:f.before[1],extra:0},
    {label:'A after',units:f.before[0],extra:f.added[0]},
    {label:'B after',units:f.before[1],extra:f.added[1]},
  ];
  rows.forEach((r,i)=>{
    const y=18+i*44;
    out+=svgText(15,y+23,r.label,'font-size="15" font-weight="700" fill="#243754"');
    for(let j=0;j<r.units;j++){
      out+=`<rect x="${left+j*unit*px}" y="${y}" width="${unit*px-1}" height="29" rx="2" fill="#8eb8e0" stroke="#527497"/>`;
      out+=svgText(left+j*unit*px+unit*px/2,y+20,'u','text-anchor="middle" font-size="13" fill="#123961"');
    }
    if(r.extra){const ex=left+r.units*unit*px;
      out+=`<rect x="${ex}" y="${y}" width="${r.extra*px}" height="29" rx="2" fill="#f4c47d" stroke="#b77828"/>`;
      out+=svgText(ex+r.extra*px/2,y+20,`+${r.extra}`,'text-anchor="middle" font-size="13" fill="#633c13"');
    }
    out+=svgText(left+(r.units*unit+r.extra)*px+14,y+22,`= ${r.units*unit+r.extra}`,'font-size="14" fill="#243754"');
  });
  out+=svgText(16,211,`Here u = ${unit}. Blue blocks are equal parts before the increase; orange blocks are added amounts.`,'font-size="13" fill="#234361"');
  out+=svgText(16,234,'Bars are drawn to scale AFTER solving, to help check the answer.','font-size="12" font-style="italic" fill="#637a95"');
  return svgWrap(out,700,254);
}
function diagramFor(c){
  switch(c.facts.kind){
    case 'spacing':case 'spacing_route':return svgNumberLine(c.facts);
    case 'comparison':return svgComparison(c.facts);
    case 'changing_ratio':return svgChangingRatio(c.facts);
    default:throw new Error('Unsupported diagram type');
  }
}
function renderPreview(data){
  const report=audit(data);if(report.status!=='OFFLINE_REFERENCE_CHECKS_PASSED_REVIEW_PENDING')throw new Error('Refinement audit failed; preview blocked');
  const content=data.cases.map((c,i)=>`<article class="case"><div class="tag">Primary ${c.level} · Case ${i+1}</div><h2>${escapeHtml(c.caseId.replaceAll('_',' '))}</h2><p class="question">${escapeHtml(c.question)}</p>${c.questionChange!=='none'?`<p class="notice">NEW multistep replacement proposed. The original one-gap question is kept in the JSON; it has not been re-reviewed.</p>`:''}<div class="picture">${diagramFor(c)}</div><ol class="steps">${c.steps.map(s=>`<li><span>${escapeHtml(s.say)}</span>${s.working?`<div class="working">${escapeHtml(s.working)}</div>`:''}</li>`).join('')}</ol><p class="answer">Answer: ${c.answer.value}${c.answer.unit?' '+escapeHtml(c.answer.unit):''}</p><p><strong>Quick check:</strong> ${escapeHtml(c.quickCheck)}</p><p><strong>A mistake to watch for:</strong> ${escapeHtml(c.misconception)}</p><p class="teacher-note"><strong>Teacher review note:</strong> ${escapeHtml(c.reviewOutcome)}</p></article>`).join('\n');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DREAMSCAPE ONE — Revised Maths Teaching References (8B-7C)</title><style>*{box-sizing:border-box}body{font-family:Arial,Segoe UI,sans-serif;background:#eff3f9;color:#18304b;line-height:1.6;margin:0}.wrap{max-width:970px;margin:34px auto;padding:0 20px}.intro,.case{background:white;border:1px solid #d8e2ef;border-radius:13px;padding:25px 30px;margin-bottom:24px;box-shadow:0 2px 7px #213d5d0d}.intro h1{margin:0 0 6px;color:#173e70}.disclaimer{padding:12px 16px;border-left:4px solid #b85c30;background:#fff5ed;font-weight:600}.case h2{font-size:1.35rem;margin:8px 0;color:#173e70}.tag{font-weight:700;font-size:.8rem;letter-spacing:.05em;text-transform:uppercase;color:#23678c}.question{font-size:1.07rem;font-weight:650}.notice{background:#fff0d9;border:1px solid #dcb874;padding:12px;border-radius:7px}.picture{margin:14px auto 20px;border:1px solid #cfdaea;border-radius:9px;padding:12px;overflow-x:auto}.picture svg{width:100%;max-width:760px;height:auto;display:block;margin:auto}.steps{padding-left:23px}.steps li{padding:4px 0 12px 8px;line-height:1.55}.steps li::marker{font-weight:bold;color:#15568f}.working{display:block;font-size:.98rem;font-weight:700;color:#245887;background:#edf5fd;border-left:3px solid #7cb4df;margin-top:6px;padding:5px 11px;width:fit-content}.answer{font-weight:800;font-size:1.1rem;color:#0e6e51}.teacher-note{font-size:.9rem;background:#f3f6fa;padding:9px 12px;color:#4d6178;border-radius:5px}p{margin:12px 0}@media print{@page{size:A4;margin:11mm 13mm}body{background:white;font-size:10.3pt;line-height:1.34}.wrap{margin:0;max-width:none;padding:0}.intro,.case{box-shadow:none;border:0;border-radius:0;padding:8px 10px;margin:0}.intro{padding-top:25px}.case{break-before:page;break-inside:auto}.case h2{font-size:1.2rem;margin:3px 0}.tag{font-size:.76rem}.question{font-size:1rem;margin:6px 0}.picture{padding:3px;margin:5px 0 8px}.picture svg{max-height:174px}.steps{margin:7px 0;padding-left:20px}.steps li{padding:2px 0 4px 4px;line-height:1.3}.working{padding:3px 6px;margin-top:2px}p{margin:6px 0}.answer{margin-top:5px}.teacher-note{font-size:.8rem;color:#222}}</style></head><body><main class="wrap"><section class="intro"><h1>DREAMSCAPE ONE · Teaching Explanation Refinement</h1><p>Six offline, human-refined Mathematics teaching examples based on one reviewer’s notes. Visual, step-by-step and written for Primary pupils.</p><p class="disclaimer">REFERENCE MATERIAL ONLY. These are not NOVA-generated answers, production teaching content, curriculum approval or proof that pupils will understand them. Q2 is a new, unreviewed question proposal.</p></section>${content}</main></body></html>`;
}
function run(argv=process.argv.slice(2)){
  const root = path.resolve(__dirname,'..');const data=load(root);const report=audit(data);
  if(argv.includes('--render-preview')){
    if(report.status!=='OFFLINE_REFERENCE_CHECKS_PASSED_REVIEW_PENDING')throw new Error('Cannot render invalid references');
    const i=argv.indexOf('--output'); const output=i>=0?path.resolve(argv[i+1]):path.join(root,'docs/PHASE_8C2D8B7C_REFINED_TEACHING_PREVIEW.html');
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,renderPreview(data),'utf8');
    console.log(`Offline HTML preview written: ${output}`);
  } else if(argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else {console.log(`8B-7C: ${report.status}; ${report.passing}/${report.cases} reference cases passed offline checks.`);console.log('Learner release, genuine NOVA output, second educator review: NOT VERIFIED.');}
  if(report.status!=='OFFLINE_REFERENCE_CHECKS_PASSED_REVIEW_PENDING')process.exitCode=1;
  return report;
}
if(require.main===module)run();
module.exports={VERSION,EXPECTED_CASES,METHOD,BANNED,expectedAnswer,checkLearnerLanguage,checkCase,audit,load,renderPreview,run};
