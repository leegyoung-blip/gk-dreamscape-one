'use strict';
// DREAMSCAPE ONE Phase 4C-4C-B1: read-only pedagogical evidence proposals.
// Does not change scores, rankings, questions, method registry, or human judgments.
const fs = require('node:fs');
const path = require('node:path');

function fail(message) { throw new Error('4C-4C-B1: ' + message); }
function assert(ok, message) { if (!ok) fail(message); }
function safeCell(v) {
  const s = typeof v==='string'?v: v===null||v===undefined?'':JSON.stringify(v);
  const value=/^[\s\r\n]*[=+@\-\t\r]/.test(s)?"'"+s:s;
  return '"'+value.replace(/"/g,'""')+'"';
}
function makeCsv(objects, columns){ return [columns.map(safeCell).join(','), ...objects.map(o=>columns.map(k=>safeCell(o[k])).join(','))].join('\r\n')+'\r\n'; }
function key(row) { return row.cohort+'|'+row.questionCode; }
function validateCatalog(catalog) {
  assert(catalog?.schemaVersion==='4C-4C-B1.RULES.1','wrong rule catalog schema');
  assert(catalog.policy==='review_only_no_scoring_change','scoring policy changed');
  assert(catalog.fixedDecisionThresholds?.minimumQuality===75 && catalog.fixedDecisionThresholds?.minimumMargin===8,'frozen decision thresholds changed');
  assert(Array.isArray(catalog.rules) && catalog.rules.length>=10,'insufficient typed review rules');
  const ids=new Set();
  for(const rule of catalog.rules){
    assert(typeof rule.id==='string' && !ids.has(rule.id),'duplicate or invalid rule id');
    assert(rule.lifecycle==='proposed_requires_human_review' && rule.scoringAuthorized===false,'rule incorrectly authorized for scoring');
    ids.add(rule.id);
  }
  return ids;
}
function validateSource(joined,{enforce480=true}={}) {
  assert(joined && Array.isArray(joined.results),'missing 4C-4C-A joined results');
  const rows=joined.results;
  const ids=new Set();
  for(const row of rows){
    assert(['fixed','holdout'].includes(row.cohort),'invalid cohort');
    assert(typeof row.questionCode==='string' && typeof row.prompt==='string','missing source question identity or text');
    assert(!ids.has(key(row)),'duplicate cohort/questionCode: '+key(row));ids.add(key(row));
    assert(['selected','ambiguous','upstream_blocked'].includes(row.f4Status),'invalid F4 state');
    assert(row.pedagogicalJudgement?.status==='not_reviewed' && row.pedagogicalJudgement.methodFit===null,'existing human review verdict would be overwritten');
    assert(row.media && typeof row.media.requiresExternalImageVerification==='boolean','missing image provenance state');
  }
  if(enforce480){
    assert(rows.length===480,'expected the original 480-question joined audit');
    const counts=rows.reduce((a,r)=>(a[r.f4Status]=(a[r.f4Status]||0)+1,a),{});
    assert(counts.selected===84 && counts.ambiguous===236 && counts.upstream_blocked===160,'original 4C-4C-A F4 outcome baselines changed');
    const blockedByCohort={fixed:0,holdout:0};
    for(const r of rows) if(r.f4Status==='upstream_blocked') blockedByCohort[r.cohort]++;
    assert(blockedByCohort.fixed===61 && blockedByCohort.holdout===99,'4A readiness baseline changed');
  }
  return rows;
}
function buildReview(joined,catalog,curated,{enforce480=true,requireAllCurated=true}={}) {
  const knownRules=validateCatalog(catalog);
  const rows=validateSource(joined,{enforce480});
  assert(curated?.schemaVersion==='4C-4C-B1.CASES.1','wrong curated case schema');
  assert(curated.manualMethodVerdicts===0,'curated cases unexpectedly claim human verification');
  assert(Array.isArray(curated.examples),'curated case proposals missing');
  const byKey=new Map(rows.map(r=>[key(r),r]));
  const caseKeys=new Set();const caseRows=[];
  for(const proposal of curated.examples){
    const caseKey=proposal.cohort+'|'+proposal.questionCode;
    assert(!caseKeys.has(caseKey),'duplicate curated case: '+caseKey);caseKeys.add(caseKey);
    const original=byKey.get(caseKey);
    if(!original){ if(requireAllCurated) fail('curated question absent from source: '+caseKey); else continue; }
    assert(original.f4Status!=='upstream_blocked','cannot pedagogically audit upstream-blocked question');
    assert(proposal.state==='proposed_unverified' && proposal.humanApproved===false && proposal.mayAlterScores===false,'curated case claims human approval or scoring power');
    assert(Array.isArray(proposal.ruleIds) && proposal.ruleIds.length>0,'curated case lacks rule');
    for(const rid of proposal.ruleIds) assert(knownRules.has(rid),'unknown evidence rule '+rid);
    assert(Array.isArray(proposal.anchors) && proposal.anchors.length>0,'curated case must be grounded');
    // Prevent fabricated spans and keep prompt evidence distinct from bank explanations.
    for(const anchor of proposal.anchors){
      assert(['prompt','sourceExplanation'].includes(anchor.field),'anchor source not allowed');
      assert(typeof anchor.text==='string' && anchor.text.trim().length>=3,'anchor text is invalid');
      assert(original[anchor.field].includes(anchor.text),'unmatched literal evidence anchor for '+caseKey+': '+anchor.text);
    }
    caseRows.push({
      cohort:original.cohort,questionCode:original.questionCode,level:original.level,reviewPriority:original.reviewPriority,
      f4Status:original.f4Status,prompt:original.prompt,reportedAnswer:original.answer,
      sourceExplanation:original.sourceExplanation,selectedMethodId:original.selectedMethodId,primaryFamilies:original.primaryFamilies,
      selectorFamilies:original.selectorFamilies,media:original.media,
      ruleIds:proposal.ruleIds,anchors:proposal.anchors,pedagogicalHypothesis:proposal.pedagogicalHypothesis,
      candidateContrast:proposal.candidateContrast,requiredReview:proposal.requiredReview,
      furtherEvidenceNeeded:proposal.furtherEvidenceNeeded,
      sourceMediaGate:original.media.requiresExternalImageVerification?'image_not_verified':'no_external_image_required',
      proposalState:'proposed_unverified',scoringAuthorized:false,
      reviewerVerdict:null,reviewer:null,reviewerNotes:''
    });
  }
  const evidenceCount=new Map(caseRows.map(row=>[key(row),1]));
  const ready=rows.filter(r=>r.f4Status!=='upstream_blocked');
  const queue=ready.map(r=>({
    cohort:r.cohort,questionCode:r.questionCode,level:r.level,reviewPriority:r.reviewPriority,
    f4Status:r.f4Status,primaryFamilies:r.primaryFamilies.join(' | '),selectedMethodId:r.selectedMethodId||'',
    reportedAnswer:r.answer,prompt:r.prompt,methodSelectionIssues:r.methodSelectionIssues.join(' | '),
    mediaKind:r.media.kind,imageMustBeInspected:r.media.requiresExternalImageVerification?'YES':'NO',
    evidenceProposal:(evidenceCount.get(key(r))||0)>0?'CURATED_FOR_REVIEW':'NOT_YET_CURATED',
    ruleIds:caseRows.find(c=>key(c)===key(r))?.ruleIds.join(' | ')||'',
    methodFit:'',answerCorrectness:'',curriculumSuitability:'',diagramAccuracy:'',reviewer:'',reviewNotes:''
  }));
  const byRule={};for(const c of caseRows) for(const id of c.ruleIds) byRule[id]=(byRule[id]||0)+1;
  const priority={};for(const r of ready) priority[r.reviewPriority]=(priority[r.reviewPriority]||0)+1;
  const summary={
    schemaVersion:'4C-4C-B1.REVIEW.1',policy:'review_only_no_scoring_change',
    sourceQuestions:rows.length,readyQuestions:ready.length,upstreamBlocked:rows.length-ready.length,
    selected:ready.filter(r=>r.f4Status==='selected').length,ambiguous:ready.filter(r=>r.f4Status==='ambiguous').length,
    P0:priority.P0||0,priorityDistribution:priority,ruleCount:catalog.rules.length,
    curatedCases:caseRows.length,curatedP0:caseRows.filter(c=>c.reviewPriority==='P0').length,
    curatedByRule:byRule,readyWithoutCuratedProposal:ready.length-caseRows.length,humanReviewedReady:0,
    externalImageReady:ready.filter(r=>r.media.requiresExternalImageVerification).length,
    externalImageInCurated:caseRows.filter(c=>c.media.requiresExternalImageVerification).length,
    humanApprovedCases:0,automaticSelectionChanges:0,scoringChanges:0,
    minimumQuality:75,minimumMargin:8,holdoutStatus:'inspected_not_unseen',
    gate:'Human confirmation of question structure and diagrams is required before Phase 4C-4C-B2 scorer integration.'
  };
  if(enforce480){assert(summary.P0===11,'P0 baseline changed');assert(summary.curatedP0===11,'curated casebook does not cover all 11 P0 cases');}
  return {summary,queue,cases:caseRows};
}
function mdEscape(value){ return String(value??'').replace(/\|/g,'\\|').replace(/\r?\n/g,' '); }
function buildCasebook({summary,cases}){
  const lines=[
    '# Phase 4C-4C-B1 — Curated Pedagogical Evidence Casebook','',
    `**Scope:** ${summary.curatedCases} question-linked, unapproved proposals; all ${summary.curatedP0} priority-zero questions included.`,
    '', '**No case is marked human-approved. No selection weights or thresholds were modified.**', '',
    '## P0 priority cases','',
  ];
  for(let i=0;i<cases.length;i++){
    const c=cases[i];if(i===summary.curatedP0) lines.push('## Other representative cases','');
    lines.push(`### ${c.questionCode} (${c.cohort.toUpperCase()}, ${c.reviewPriority})`,
      '',`- **Original question:** ${c.prompt}`,
      `- **Reported answer (not independently verified):** ${c.reportedAnswer}`,
      `- **F4:** ${c.f4Status}; ${c.selectedMethodId||'no selected method'}`,
      `- **Rule proposals:** ${c.ruleIds.join(', ')}`,
      `- **Exact source anchors:** ${c.anchors.map(a=>a.field+': “'+a.text+'”').join(' | ')}`,
      `- **Pedagogical hypothesis (not a verdict):** ${c.pedagogicalHypothesis}`,
      `- **Human review needed:** ${c.requiredReview}`,
      `- **External image:** ${c.sourceMediaGate}`,
      `- **Method contrast:** ${c.candidateContrast||'Review listed candidates and intended teaching goal.'}`,
      '');
  }
  lines.push('## Guardrails','',
    '- A prompt anchor is an auditable text source, **not** automated proof of methodological fit or mathematical answer validity.',
    '- Source explanations are reference material, not independently established solutions.',
    '- External images require visual inspection; do not certify their count, geometry, or labels from filenames.',
    '- Separate mathematical method fit from P1–P6 curricular suitability and from student mastery.',
    '- Freeze scoring, 75/8 gates, taxonomy, question bank, 4A readiness and supported method constraints until review approval.',
    '- The former holdout was examined during rule design; use a **fresh unseen holdout** for subsequent accuracy testing.', '');
  return lines.join('\n');
}
function writeReview(result,outDir){
  fs.mkdirSync(outDir,{recursive:true});
  const names={
    summary:'phase-4c4c-b1-review-summary.json',
    cases:'phase-4c4c-b1-case-proposals.json',
    queue:'phase-4c4c-b1-ready-320-evidence-review.csv',
    casebook:'phase-4c4c-b1-casebook.md'
  };
  fs.writeFileSync(path.join(outDir,names.summary),JSON.stringify(result.summary,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,names.cases),JSON.stringify({schemaVersion:'4C-4C-B1.CASE_OUTPUT.1',approval:'none',cases:result.cases},null,2)+'\n');
  fs.writeFileSync(path.join(outDir,names.queue),makeCsv(result.queue,['cohort','questionCode','level','reviewPriority','f4Status','primaryFamilies','selectedMethodId','reportedAnswer','prompt','methodSelectionIssues','mediaKind','imageMustBeInspected','evidenceProposal','ruleIds','methodFit','answerCorrectness','curriculumSuitability','diagramAccuracy','reviewer','reviewNotes']));
  fs.writeFileSync(path.join(outDir,names.casebook),buildCasebook(result));
  return names;
}
module.exports={buildReview,validateSource,validateCatalog,writeReview,safeCell,makeCsv,buildCasebook};
if(require.main===module){
  try{
    const joinedPath=process.argv[2]||path.join('qa-artifacts','phase4c4c-a','phase-4c4c-a-joined-480.json');
    const out=process.argv[3]||path.join('qa-artifacts','phase4c4c-b1');
    const base=path.join(__dirname,'..','qa-artifacts','phase4c4c-b1');
    const joined=JSON.parse(fs.readFileSync(joinedPath,'utf8'));
    const catalog=JSON.parse(fs.readFileSync(path.join(base,'phase-4c4c-b1-rule-catalog.json'),'utf8'));
    const cases=JSON.parse(fs.readFileSync(path.join(base,'phase-4c4c-b1-curated-cases.json'),'utf8'));
    const result=buildReview(joined,catalog,cases);
    const names=writeReview(result,out);
    console.log(JSON.stringify({summary:result.summary,files:names},null,2));
  } catch(e){console.error(e.message);process.exitCode=1;}
}
