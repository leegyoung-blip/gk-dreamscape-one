#!/usr/bin/env node
'use strict';
/** node tests/run-phase4c4c-b2.cjs QA_EXPORT OUTPUT_JSON [APPROVED_REVIEWS_JSON] [INSPECTED_JOIN_480_JSON] */
const fs=require('node:fs'),path=require('node:path');
const {runB2PairedEvaluation}=require('../build/math/teaching/strategy-selection/qa/runPhase4C4CB2Evaluation.js');
const [source,out,reviewFile,inspectedFile]=process.argv.slice(2);
if(!source||!out){console.error('Usage: node tests/run-phase4c4c-b2.cjs QA_EXPORT OUTPUT_JSON [APPROVED_REVIEWS_JSON] [INSPECTED_JOIN_480_JSON]');process.exit(2);}
const read=(p)=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8'));
try{
 const reviews=reviewFile?read(reviewFile):undefined;
 const inspected=inspectedFile?read(inspectedFile):null;
 const oldIds=inspected?collectIds(inspected):[];
 const result=runB2PairedEvaluation(read(source),reviews,oldIds);
 fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
 console.log(JSON.stringify({sourceSeed:result.sourceSeed,class:result.evaluationClass,totals:result.totals,checks:result.checks},null,2));
 if(!Object.values(result.checks).every(Boolean))process.exitCode=1;
}catch(err){console.error(err.message);process.exitCode=1;}
function collectIds(data){
 const rows=data.questions??data.records??data.results??data.items??data.rows;
 if(!Array.isArray(rows))throw new Error('B2_INSPECTED_LEDGER_ROWS_NOT_FOUND');
 return rows.map(x=>x.questionId??x.question_id).filter(Boolean);
}
