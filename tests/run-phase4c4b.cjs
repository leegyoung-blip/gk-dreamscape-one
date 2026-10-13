/** Usage: node tests/run-phase4c4b.cjs path/to/original-export.json [path/to/report.json] */
const fs=require('node:fs');
const path=require('node:path');
const {runPhase4C4BCohortAudit}=require('../build/math/teaching/strategy-selection/qa/runPhase4C4BCohort.js');
const inputPath=process.argv[2];
if(!inputPath){console.error('Usage: node tests/run-phase4c4b.cjs <original-QA-export.json> [report.json]');process.exit(2);}
const data=JSON.parse(fs.readFileSync(path.resolve(inputPath),'utf8'));
if(!Array.isArray(data?.sample?.items)||!Array.isArray(data?.results)){
 console.error('Invalid input: expected original Math Intelligence QA export containing sample.items and results arrays. Derived 4B reports are not supported.');process.exit(2);
}
const report=runPhase4C4BCohortAudit(data);
const dest=path.resolve(process.argv[3]||`phase-4c4b-${report.source_seed||'custom'}.json`);
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({source_seed:report.source_seed,summary:report.summary,report:dest},null,2));
if(report.summary.checks.matchesExpectedTotal===false||report.summary.checks.matchesExpectedUpstreamBlocks===false||!report.summary.checks.totalsReconcile||!report.summary.checks.deterministic){process.exitCode=1;}
