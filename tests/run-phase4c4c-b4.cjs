'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {reconcileB4Readiness}=require('../lib/math/teaching/strategy-selection/qa/reconcileB4Readiness.cjs');
if(require.main===module){
 const [fixed,holdout,register,out]=process.argv.slice(2);
 if(!fixed||!holdout||!register||!out){console.error('Usage: node tests/run-phase4c4c-b4.cjs <fixed-f4-json> <holdout-f4-json> <b3-register-json> <output-json>');process.exit(2)}
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 const result=reconcileB4Readiness(read(fixed),read(holdout),read(register));
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
 console.log(JSON.stringify({totals:result.totals,checks:result.checks,productionActivationAuthorized:result.deployment.productionActivationAuthorized},null,2));
}
