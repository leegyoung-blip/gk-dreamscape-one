'use strict';
/** Phase 4C-4C-A: read-only question-to-selector audit join. No pedagogy is invented. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const EXPECTED = Object.freeze({
  'phase-2i-v1': { name: 'fixed', total: 240, upstreamBlocked: 61, ready: 179 },
  'phase-4a2c5-holdout-v1': { name: 'holdout', total: 240, upstreamBlocked: 99, ready: 141 },
});
const safeStr = (value) => typeof value === 'string' ? value : '';
const countBy = (items, fn) => items.reduce((out, item) => { const key=String(fn(item));out[key]=(out[key]||0)+1;return out; },{});
function assert(condition, message) { if (!condition) throw new Error(message); }
function uniqueIdMap(items, key, label) {
  assert(Array.isArray(items), `${label} must be an array`);
  const map = new Map();
  for (const item of items) { const id=item && item[key]; assert(typeof id==='string' && id, `${label}: missing ${key}`); assert(!map.has(id), `${label}: duplicate ${key} ${id}`);map.set(id,item); }
  return map;
}
function trimmedValue(x) { return String(x==null?'':x).trim().replace(/\s+/g,' ').toLowerCase(); }
function answerChoiceIntegrity(question) {
  const content=question.content||{}; const choices=Array.isArray(content.options)?content.options:[];
  const answer=question.answer_data||{};const ids=answer.correct_option_ids;
  if (!choices.length) return 'not_multiple_choice';
  if (!Array.isArray(ids)||!ids.length) return 'correct_option_id_missing';
  const chosen=choices.filter(o=>ids.includes(o.id));
  if (chosen.length!==ids.length) return 'correct_option_id_unresolved';
  if (ids.length===1 && safeStr(answer.display_answer) && chosen[0].text && trimmedValue(chosen[0].text)!==trimmedValue(answer.display_answer)) return 'display_answer_choice_text_differs';
  return 'choice_consistent';
}
function mediaEvidence(question, item) {
  const c=question.content||{};
  const assets=Array.isArray(question.assets)?question.assets:[];
  const embeddedFields=['inline_diagram','stimulus_image_url','image_reference'].filter(k=>typeof c[k]==='string' && c[k].startsWith('data:'));
  const represented=Boolean(c.math_visual) || embeddedFields.length>0 || assets.length>0 || Boolean(question.stimulus) || Boolean(item.has_question_asset);
  const externalPaths = [];
  if (typeof question.stimulus?.storage_path==='string') externalPaths.push(`${safeStr(question.stimulus.storage_bucket)}/${question.stimulus.storage_path}`);
  for(const a of assets) if (a && typeof a==='object') {
    const candidate=a.storage_path || a.path || a.url;
    if(typeof candidate==='string' && !candidate.startsWith('data:')) externalPaths.push(candidate);
  }
  const inlineFields=['inline_diagram','stimulus_image_url','image_reference'].filter(k=>typeof c[k]==='string' && c[k] && !c[k].startsWith('data:'));
  for(const field of inlineFields) externalPaths.push(c[field]);
  const imageAlt = safeStr(c.stimulus_image_alt || question.stimulus?.alt_text);
  const requiresImage=externalPaths.length>0;
  return {
    kind:requiresImage?'external_image_reference':embeddedFields.length?'embedded_diagram':c.math_visual?'structured_visual':assets.length?'asset_reference':represented?'visual_reported':'text_only',
    hasRepresentation:represented, requiresExternalImageVerification:requiresImage,
    embeddedImageFields:embeddedFields, assetReferences:externalPaths, imageAlt,
    diagramMentionInPrompt:/\b(diagram|figure|picture|shown|grid|graph)\b/i.test(safeStr(question.prompt||item.prompt)),
  };
}
function familySummary(record) {
  const families=record?.diagnostics?.familyDiagnostics;
  return Array.isArray(families)?families.map(f=>({
    familyId:f.familyId, selectorStatus:f.status,
    selectorIssues:Array.isArray(f.selectorIssues)?f.selectorIssues.map(x=>x.code):[],
    assessedMethods:Array.isArray(f.methods)?f.methods.map(m=>({
      methodId:m.methodId, rank:m.rank, score:m.score, eligibility:m.eligibility,
      prerequisiteEvidence:m.prerequisiteEvidence, exclusionCodes:Array.isArray(m.exclusionCodes)?m.exclusionCodes:[],
    })):[],
  })):[];
}
function makeRow(seed,item,record,qaResult) {
  const q=item.question||{};
  const media=mediaEvidence(q,item);
  const families=familySummary(record);
  const issues=[...new Set(families.flatMap(f=>f.selectorIssues))];
  const answerCheck=answerChoiceIntegrity(q);
  const automaticSignals=[];
  if(media.requiresExternalImageVerification) automaticSignals.push('EXTERNAL_MEDIA_NOT_INCLUDED_IN_EXPORT');
  if(media.diagramMentionInPrompt&&!media.hasRepresentation) automaticSignals.push('DIAGRAM_LANGUAGE_WITHOUT_EXPORTED_MEDIA');
  if(answerCheck==='correct_option_id_missing'||answerCheck==='correct_option_id_unresolved'||answerCheck==='display_answer_choice_text_differs') automaticSignals.push('SOURCE_ANSWER_OPTION_REVIEW');
  if(!safeStr(q.explanation?.student)) automaticSignals.push('SOURCE_EXPLANATION_MISSING');
  const method=safeStr(record.selectedMethodId);
  if(Number(item.primary_level)<=2 && /^(speed\.|ratio\.|algebra\.equation_unknown\.inverse_two_step)/.test(method)) automaticSignals.push('EARLY_LEVEL_METHOD_CURRICULUM_REVIEW');
  if(record.status==='selected'&&record.selectionConfidence==='low') automaticSignals.push('SELECTED_LOW_CONFIDENCE');
  if(record.status==='ambiguous') automaticSignals.push(...issues);
  if(record.status==='upstream_blocked') automaticSignals.push('UPSTREAM_UNREADY_SEPARATE_TRIAGE');
  const priority=record.status==='selected' ? (automaticSignals.includes('SOURCE_ANSWER_OPTION_REVIEW')||automaticSignals.includes('EARLY_LEVEL_METHOD_CURRICULUM_REVIEW')||media.requiresExternalImageVerification? 'P0': 'P1')
      : record.status==='ambiguous' ? (issues.includes('INSUFFICIENT_WINNER_MARGIN')?'P1':'P2'):'P3';
  const answer=q.answer_data||{};const options=Array.isArray(q.content?.options)?q.content.options:[];
  return {
    cohort:EXPECTED[seed].name,seed,questionId:item.question_id,questionCode:item.question_code,
    level:item.primary_level,topic:safeStr(item.topic_title||q.topic_title),questionType:safeStr(q.question_type||item.question_type),
    stratum:safeStr(item.sample_stratum),prompt:safeStr(q.prompt||item.prompt),
    answer:safeStr(answer.display_answer || answer.value),correctOptionIds:Array.isArray(answer.correct_option_ids)?answer.correct_option_ids:[],
    answerChoiceCheck:answerCheck,answerOptions:options.map(o=>({id:o.id,text:o.text||'',hasImage:!!o.has_image})),
    sourceExplanation:safeStr(q.explanation?.student),
    primarySkills:(Array.isArray(q.skill_mappings)?q.skill_mappings:[]).filter(s=>s.is_primary_skill).map(s=>({code:s.skill_code,name:s.skill_name,reviewStatus:s.review_status})),
    f4Status:record.status,reasonCodes:Array.isArray(record.reasonCodes)?record.reasonCodes:[],
    selectedMethodId:record.selectedMethodId||null,selectionConfidence:record.selectionConfidence||null,
    primaryFamilies:Array.isArray(record.primaryFamilies)?record.primaryFamilies:[],
    candidateCount:record.candidateCount, assessedCandidateCount:families.reduce((n,f)=>n+f.assessedMethods.length,0),
    selectorFamilies:families,methodSelectionIssues:issues,
    media,sourceQaStatus:qaResult?.status||null,automaticSignals,reviewPriority:priority,
    pedagogicalJudgement:{status:'not_reviewed',methodFit:null,answerCorrectness:null,curriculumSuitability:null,diagramAccuracy:null,reviewer:null,reviewNotes:''},
  };
}
function auditCohort(original, f4) {
  assert(original && typeof original==='object' && original.sample && Array.isArray(original.sample.items),'Original QA export with sample.items required');
  const seed=original.sample.seed, baseline=EXPECTED[seed];
  assert(baseline,`Unrecognized cohort seed ${seed}`);
  assert(original.run_id===f4.source_run_id,`${seed}: original run_id and F4 source_run_id mismatch`);
  assert(seed===f4.source_seed,`${seed}: source seed mismatch`);
  assert(f4.schema_version==='4C-4B-QA.1',`${seed}: unrecognized F4 schema`);
  assert(original.sample.items.length===baseline.total,`${seed}: original item count mismatch`);
  assert(original.results?.length===baseline.total,`${seed}: original QA result count mismatch`);
  assert(f4.results?.length===baseline.total,`${seed}: F4 result count mismatch`);
  const items=uniqueIdMap(original.sample.items,'question_id',`${seed} items`);
  const f4s=uniqueIdMap(f4.results,'questionId',`${seed} F4`);
  const qas=uniqueIdMap(original.results,'client_id',`${seed} original results`);
  for(const [id] of items){assert(f4s.has(id),`${seed}: F4 missing question ${id}`);assert(qas.has(id),`${seed}: QA missing question ${id}`);}
  for(const [id] of f4s) assert(items.has(id),`${seed}: unexpected F4 question ${id}`);
  assert(f4.summary.total===baseline.total,`${seed}: wrong total`);
  assert(f4.summary.upstreamBlocked===baseline.upstreamBlocked,`${seed}: changed 4A baseline`);
  assert(f4.summary.adapterBlocked===0,`${seed}: F4 technical errors remain`);
  assert(f4.summary.nondeterministic===0,`${seed}: nondeterministic output`);
  assert(f4.summary.selected+f4.summary.ambiguous===baseline.ready,`${seed}: readiness reconciliation failed`);
  assert(f4.summary.checks?.totalsReconcile===true && f4.summary.checks?.deterministic===true,`${seed}: F4 checks failed`);
  const rows=original.sample.items.map(item=>{
    const r=f4s.get(item.question_id);
    assert(r.questionCode===item.question_code,`${seed}: question code mismatch for ${item.question_id}`);
    assert(r.level===item.primary_level,`${seed}: primary level mismatch ${item.question_id}`);
    const row=makeRow(seed,item,r,qas.get(item.question_id));
    if(r.status==='selected') assert(row.selectedMethodId && row.selectorFamilies.length>0,`${seed}: selected method missing evidence ${item.question_code}`);
    return row;
  });
  const actual=countBy(rows,r=>r.f4Status);
  assert(actual.selected===f4.summary.selected && actual.ambiguous===f4.summary.ambiguous && actual.upstream_blocked===f4.summary.upstreamBlocked,`${seed}: statuses disagree with summary`);
  return { seed,rows,summary:{cohort:baseline.name,runId:original.run_id,seed,total:rows.length,ready:baseline.ready,blocked:baseline.upstreamBlocked,status:actual,byLevel:countBy(rows,r=>`P${r.level}:${r.f4Status}`),byReviewPriority:countBy(rows,r=>r.reviewPriority)} };
}
function buildAudit(pairs) {
  assert(Array.isArray(pairs)&&pairs.length===2,'Must provide exactly the fixed and holdout cohorts');
  const audits=pairs.map(pair=>auditCohort(pair.original,pair.f4));
  assert(new Set(audits.map(a=>a.seed)).size===2,'Fixed and holdout must be different cohorts');
  const rows=audits.flatMap(a=>a.rows);
  const ready=rows.filter(r=>r.f4Status!=='upstream_blocked');
  const byReason=countBy(rows.flatMap(r=>r.methodSelectionIssues),x=>x);
  const byFamily=countBy(ready.flatMap(r=>r.primaryFamilies),x=>x);
  const selected=ready.filter(r=>r.f4Status==='selected');
  const ambiguous=ready.filter(r=>r.f4Status==='ambiguous');
  const summary={
    schemaVersion:'4C-4C-A.1', auditType:'read_only_question_method_join',generatedAt:new Date().toISOString(),
    sources:audits.map(a=>a.summary),total:rows.length,ready:ready.length,
    byOutcome:countBy(rows,r=>r.f4Status), byPriority:countBy(rows,r=>r.reviewPriority),
    selectionConfidence:countBy(selected,r=>r.selectionConfidence||'none'),
    ambiguousReasons:byReason,byPrimaryFamily:byFamily,
    ambiguousByFamily:countBy(ambiguous.flatMap(r=>r.primaryFamilies),x=>x),
    selectedByFamily:countBy(selected.flatMap(r=>r.primaryFamilies),x=>x),
    externalMediaToVerify:rows.filter(r=>r.media.requiresExternalImageVerification).length,
    mediaKinds:countBy(rows,r=>r.media.kind),
    readyExternalMediaToVerify:ready.filter(r=>r.media.requiresExternalImageVerification).length,
    answerOptionReviewFlags:rows.filter(r=>r.automaticSignals.includes('SOURCE_ANSWER_OPTION_REVIEW')).length,
    methodologicalLabelsHumanVerified:0,
    invariants:{cohortsDistinct:true,allOriginalQuestionIdsMatched:true,allF4QuestionIdsMatched:true,baselinePreserved:true,adapterBlocked:0,nondeterministic:0},
  };
  assert(summary.total===480 && summary.ready===320,'Combined baseline mismatch');
  return {summary,rows};
}
const columns=['cohort','questionCode','questionId','level','topic','stratum','f4Status','reviewPriority','reasonCodes','primaryFamilies','selectedMethodId','selectionConfidence','candidateCount','assessedCandidateCount','methodSelectionIssues','candidateScores','prompt','answer','correctOptionIds','answerOptions','sourceExplanation','primarySkills','answerChoiceCheck','mediaKind','mediaAlt','mediaExternalReferences','automaticSignals','judgementStatus','humanMethodFit','humanAnswerCorrectness','humanCurriculumSuitability','humanDiagramAccuracy','reviewer','reviewNotes'];
function stringifyColumn(row,key){
 const map={reasonCodes:()=>row.reasonCodes.join('; '),primaryFamilies:()=>row.primaryFamilies.join('; '),methodSelectionIssues:()=>row.methodSelectionIssues.join('; '),
 candidateScores:()=>row.selectorFamilies.flatMap(f=>f.assessedMethods.map(m=>`${m.methodId}: ${m.score}`)).join('; '),
 correctOptionIds:()=>row.correctOptionIds.join('; '), answerOptions:()=>row.answerOptions.map(o=>`${o.id}: ${o.text}`).join(' | '),
 primarySkills:()=>row.primarySkills.map(s=>`${s.code} ${s.name}`).join('; '),mediaKind:()=>row.media.kind,
 mediaAlt:()=>row.media.imageAlt,mediaExternalReferences:()=>row.media.assetReferences.join('; '),automaticSignals:()=>row.automaticSignals.join('; '),
 judgementStatus:()=>row.pedagogicalJudgement.status,humanMethodFit:()=>'',humanAnswerCorrectness:()=>'',humanCurriculumSuitability:()=>'',humanDiagramAccuracy:()=>'',reviewer:()=>'',reviewNotes:()=>''};
 const value=map[key]?map[key]():row[key];return value==null?'':String(value);
}
function csvValue(v){
 const val=String(v);
 // Avoid spreadsheet formula execution for untrusted question text.
 const safe=/^[\s]*[=+@\-\t\r]/.test(val)?`'${val}`:val;
 return `"${safe.replace(/"/g,'""')}"`;
}
function rowsToCsv(rows){return [columns.map(csvValue).join(','),...rows.map(r=>columns.map(c=>csvValue(stringifyColumn(r,c))).join(','))].join('\r\n')+'\r\n';}
function writeAuditFiles(audit, outDir){
 fs.mkdirSync(outDir,{recursive:true});
 const priority={P0:0,P1:1,P2:2,P3:3};
 const sorted=[...audit.rows].sort((a,b)=>priority[a.reviewPriority]-priority[b.reviewPriority]||a.level-b.level||a.cohort.localeCompare(b.cohort)||a.questionCode.localeCompare(b.questionCode));
 const readies=sorted.filter(r=>r.f4Status!=='upstream_blocked');
 const up=sorted.filter(r=>r.f4Status==='upstream_blocked');
 const summary=audit.summary;
 const cleanJson=(o)=>JSON.stringify(o,null,2)+'\n';
 fs.writeFileSync(path.join(outDir,'phase-4c4c-a-summary.json'),cleanJson(summary));
 fs.writeFileSync(path.join(outDir,'phase-4c4c-a-joined-480.json'),cleanJson({summary,results:audit.rows}));
 fs.writeFileSync(path.join(outDir,'phase-4c4c-a-ready-320-review.csv'),rowsToCsv(readies));
 fs.writeFileSync(path.join(outDir,'phase-4c4c-a-upstream-160.csv'),rowsToCsv(up));
 const families=Object.entries(summary.byPrimaryFamily).sort((a,b)=>b[1]-a[1]);
 const report=`# Phase 4C-4C-A — Question-Level Pedagogical Audit Preparation\n\nGenerated from the user's original QA exports and their matching Phase F4 reports. This is an evidence-linked **review queue**, not a claim of human-verified pedagogical accuracy.\n\n## Verified reconciliation\n\n| Metric | Value |\n|---|---:|\n| Questions | ${summary.total} |\n| Ready for review | ${summary.ready} |\n| Upstream blocked (separate queue) | ${summary.byOutcome.upstream_blocked||0} |\n| Selected methods | ${summary.byOutcome.selected||0} |\n| Ambiguous | ${summary.byOutcome.ambiguous||0} |\n| Adapter errors | 0 |\n| Human verified method labels | 0 |\n| External images needing separate verification | ${summary.externalMediaToVerify} |\n| Ready questions relying on external images | ${summary.readyExternalMediaToVerify} |\n| Answer/option consistency flags (format only) | ${summary.answerOptionReviewFlags} |\n\n## What to review first\n\nP0: Selected methods with an external-image dependency, answer-option issue, or early-primary curriculum-level caution. P1: Remaining selections and equal/insufficient-margin ambiguities. P2: Low-quality winner cases. P3: Existing 4A blocks, tracked separately. P0/P1/P2 are **review priority**, not pedagogical verdicts.\n\n## Ambiguity breakdown\n\n${Object.entries(summary.ambiguousReasons).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n\n## Most represented method families in ready questions\n\n${families.slice(0,12).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n\n## Evidence rules\n\n1. **No automated correctness label** is assigned. Review fields are empty and must be filled by a qualified reviewer using source question + answer + method evidence.\n2. The F4 score measures configured selection confidence, not observed mathematical or pedagogical accuracy.\n3. Original text, correct answers, skill tags, method IDs and candidate scores are preserved where available; input JSON is never modified.\n4. Remote Supabase media is **referenced, not fetched**. Images cannot be judged from storage paths or alt-text alone; embedded data URIs are noted but not reprinted in CSV.\n5. Explanations provided in the question bank are reference evidence, **not independently verified solutions**.\n6. No scoring weights, thresholds, registry entries, or 4A readiness baselines are modified.\n\n## Source audit\n\n${summary.sources.map(s=>`- **${s.cohort}**: ${s.total} questions; ${s.ready} ready, ${s.blocked} upstream blocked; ${s.status.selected||0} selected, ${s.status.ambiguous||0} ambiguous`).join('\n')}\n\n## Decision gate before 4C-4C-B\n\nReview selected methods first, sample the ambiguous cases from each dominant family, check external diagrams against actual rendered media, then approve question-backed feature discriminators. Never convert a tie to a selection using a fabricated evidence signal or a lowered threshold.\n`;
 fs.writeFileSync(path.join(outDir,'phase-4c4c-a-audit-summary.md'),report);
 return {files:fs.readdirSync(outDir).sort(),rows:sorted.length,ready:readies.length,upstream:up.length};
}
function readJSON(filename){return JSON.parse(fs.readFileSync(filename,'utf8'));}
function main(args){
 assert(args.length===5,'Usage: node tests/build-phase4c4c-a.cjs <fixed-original.json> <fixed-f4.json> <holdout-original.json> <holdout-f4.json> <output-directory>');
 const pairs=[{original:readJSON(args[0]),f4:readJSON(args[1])},{original:readJSON(args[2]),f4:readJSON(args[3])}];
 const outDir=path.resolve(args[4]);
 // All validation happens BEFORE file generation; failed joins cannot produce partial reports.
 const audit=buildAudit(pairs);
 const written=writeAuditFiles(audit,outDir);
 console.log(JSON.stringify({ok:true,outDir,...written,summary:audit.summary},null,2));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(err){console.error(`Phase 4C-4C-A audit failed: ${err.message}`);process.exitCode=1;}}
module.exports={auditCohort,buildAudit,writeAuditFiles,answerChoiceIntegrity,mediaEvidence,rowsToCsv,EXPECTED};
