'use strict';
/**
 * DREAMSCAPE ONE Phase 8C-2C.3D.
 * Read-only, offline comparison against the previously verified 12-question sample.
 * Usage: node scripts/phase4e2b8c2c3d-verify-coverage.cjs <staff-export.csv>
 * Does NOT query Supabase, modify selection scores, or claim pedagogical correctness.
 */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(ROOT,'tests/fixtures/phase4e2b8c2c3d-baseline.json');

function parseCsv(raw) {
  const rows=[]; let record=[]; let value=''; let quoted=false;
  for(let i=0;i<raw.length;i++) {
    const c=raw[i];
    if(quoted) {
      if(c==='"' && raw[i+1]==='"') {value+='"';i++;}
      else if(c==='"') quoted=false;
      else value+=c;
    } else if(c==='"') quoted=true;
    else if(c===',') {record.push(value);value='';}
    else if(c==='\r' || c==='\n') {
      if(c==='\r' && raw[i+1]==='\n') i++;
      record.push(value);value='';
      if(record.some(v=>v!=='')) rows.push(record);
      record=[];
    } else value+=c;
  }
  if(quoted) throw new Error('Unclosed quoted CSV value');
  if(value || record.length) {record.push(value);rows.push(record);}
  if(!rows.length) throw new Error('Empty CSV');
  const keys=rows.shift();
  if(new Set(keys).size !== keys.length) throw new Error('Duplicate CSV column');
  return rows.map((r,i)=>{
    if(r.length!==keys.length) throw new Error('Invalid column count in row '+(i+2));
    return Object.fromEntries(keys.map((k,j)=>[k,r[j]]));
  });
}
function validateCoverage(raw, base) {
  const csv=parseCsv(raw.replace(/^\uFEFF/,''));
  const required=['Question code','Outcome','Method ID','Top candidate','Top score / 100',
    'Second candidate','Second score / 100','Reason codes / error'];
  if(csv.length && required.some(k=>!(k in csv[0]))) throw new Error('Missing required coverage column');
  const actual=new Map();
  for(const r of csv) {
    const key=r['Question code'];
    if(!key || actual.has(key)) throw new Error('Missing or duplicate question code: '+key);
    actual.set(key,r);
  }
  const issues=[];
  const expected=new Set(base.rows.map(r=>r.code));
  for(const code of actual.keys()) if(!expected.has(code)) issues.push(`Unexpected sample question ${code}`);
  for(const b of base.rows) {
    const r=actual.get(b.code);
    if(!r) {issues.push(`Missing ${b.code}`);continue;}
    if(r['Outcome']!==b.outcome) issues.push(`${b.code}: outcome changed`);
    if(b.outcome==='selected') {
      if(r['Method ID']!==b.methodId) issues.push(`${b.code}: selected method changed`);
    } else if(b.outcome==='ambiguous') {
      if(r['Top candidate']!==b.topMethodId || r['Second candidate']!==b.secondMethodId)
        issues.push(`${b.code}: top-two ordering changed`);
      for(const [column,score] of [['Top score / 100',b.topScore],['Second score / 100',b.secondScore]]) {
        const value=r[column].trim();
        if(!value || !Number.isFinite(Number(value)) || Number(value)!==score)
          issues.push(`${b.code}: ${column} changed`);
      }
      const actualCodes=new Set(r['Reason codes / error'].split('·').map(s=>s.trim()).filter(Boolean));
      for(const code of b.reasonCodes) if(!actualCodes.has(code)) issues.push(`${b.code}: missing ${code}`);
    }
  }
  const selected=csv.filter(r=>r['Outcome']==='selected').length;
  const ambiguous=csv.filter(r=>r['Outcome']==='ambiguous').length;
  if(selected!==base.expectedSelected || ambiguous!==base.expectedAmbiguous)
    issues.push(`Counts changed (${selected} selected, ${ambiguous} ambiguous)`);
  return {sampled:csv.length,selected,ambiguous,issues};
}
function main(args) {
  if(args.length!==1) {
    console.error('Usage: node scripts/phase4e2b8c2c3d-verify-coverage.cjs <local-coverge.csv>');
    return 2;
  }
  const file=path.resolve(args[0]);
  const stat=fs.statSync(file);
  if(!stat.isFile() || stat.size>2_000_000) throw new Error('Expected a CSV file under 2MB');
  const baseline=JSON.parse(fs.readFileSync(BASELINE,'utf8'));
  const result=validateCoverage(fs.readFileSync(file,'utf8'),baseline);
  console.log(`Phase 8C-2C.3D snapshot: ${result.sampled} questions; ${result.selected} selected; ${result.ambiguous} ambiguous`);
  if(result.issues.length) {
    for(const issue of result.issues) console.error('REGRESSION: '+issue);
    console.error('FAIL: snapshot differs; investigate rather than forcing the baseline.');
    return 1;
  }
  console.log('PASS: No changes against the 8C-2C.2 regression baseline.');
  console.log('Reminder: this does NOT authenticate evidence or approve any teaching method.');
  return 0;
}
if(require.main===module) {
  try {process.exitCode=main(process.argv.slice(2));}
  catch(e) {console.error('FAIL:',e.message);process.exitCode=1;}
}
module.exports={parseCsv,validateCoverage};
