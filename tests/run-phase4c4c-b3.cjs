'use strict';
const fs=require('node:fs');const path=require('node:path');
const {buildReview,outputFiles}=require('../lib/math/teaching/strategy-selection/qa/buildPhase4C4CB3Review.cjs');
const argv=process.argv.slice(2);
if(argv.length!==7){console.error('Usage: node tests/run-phase4c4c-b3.cjs fixed-original.json holdout-original.json fixed-f4.json holdout-f4.json b1-case-proposals.json b3-independent-assessments.json output-directory');process.exit(2)}
const inp=argv.slice(0,6).map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const [fixedExport,holdoutExport,fixedF4,holdoutF4,proposals,analyses]=inp;
const result=buildReview({fixedExport,holdoutExport,fixedF4,holdoutF4,proposals,analyses});
const names=outputFiles(result,path.resolve(argv[6]));
console.log(JSON.stringify({stats:result.stats,files:names,policy:result.phase},null,2));
