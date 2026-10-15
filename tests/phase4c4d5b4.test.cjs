'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const {assess}=require('../scripts/verify-math-4d5b4-smoke.cjs');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'qa-artifacts/phase4c4d5b4/phase-4c4d5b4-scenarios.json'),'utf8'));
const template=JSON.parse(fs.readFileSync(path.join(root,'qa-artifacts/phase4c4d5b4/phase-4c4d5b4-results.template.json'),'utf8'));
function cp(){return JSON.parse(JSON.stringify(template));}
function markAll(status){let r=cp();for(const c of r.cases){c.status=status;c.channel=catalog.cases.find(x=>x.id===c.id).requiredChannel;c.observation='Verified using a disposable test account, no sensitive details.';}return r;}
test('catalog contains unique fourteen cases',()=>assert.equal(new Set(catalog.cases.map(c=>c.id)).size,14));
test('template starts with all manual tests NOT_RUN',()=>assert.ok(template.cases.every(c=>c.status==='NOT_RUN')));
test('template never claims authorization',()=>{const r=assess(catalog,cp());assert.equal(r.decision,'NOT_VERIFIED');assert.equal(r.liveDeploymentAuthorized,false);});
test('fully passed checklist only indicates ready for review',()=>{let r=assess(catalog,markAll('PASS'));assert.equal(r.decision,'READY_FOR_SECURITY_REVIEW');assert.equal(r.liveDeploymentAuthorized,false);});
test('any FAIL blocks progress',()=>{const r=markAll('PASS');r.cases[0].status='FAIL';assert.equal(assess(catalog,r).decision,'STOP_FAILURE');});
test('any BLOCKED remains unverified',()=>{const r=markAll('PASS');r.cases[2].status='BLOCKED';assert.equal(assess(catalog,r).decision,'NOT_VERIFIED');});
test('a missing case is refused',()=>{const r=cp();r.cases.pop();assert.throws(()=>assess(catalog,r),/count/);});
test('duplicate case refused',()=>{const r=cp();r.cases[1].id=r.cases[0].id;assert.throws(()=>assess(catalog,r),/duplicate/);});
test('unrecognized status refused',()=>{const r=cp();r.cases[0].status='APPROVED';assert.throws(()=>assess(catalog,r),/status/);});
test('PASS requires observation and channel',()=>{const r=cp();r.cases[0].status='PASS';assert.throws(()=>assess(catalog,r),/observation/);});
test('PASS cannot claim UI only where network is required',()=>{const r=markAll('PASS');r.cases[2].channel='ui';assert.throws(()=>assess(catalog,r),/Network/);});
test('PASS cannot claim network only where UI and network required',()=>{const r=markAll('PASS');r.cases[0].channel='network';assert.throws(()=>assess(catalog,r),/UI and network/);});
test('observation rejects email',()=>{const r=markAll('PASS');r.cases[0].observation='test@example.com';assert.throws(()=>assess(catalog,r),/secret\/email/);});
test('observation rejects tokens',()=>{const r=markAll('PASS');r.cases[0].observation='Bearer eyJabcdefghijklmnopqrstuvwxyz01234567890';assert.throws(()=>assess(catalog,r),/secret\/email/);});
test('unknown scenario refused',()=>{const r=cp();r.cases[0].id='MALICIOUS-NEW';assert.throws(()=>assess(catalog,r),/Unknown/);});
test('package is additive and says not live certified',()=>{let text=fs.readFileSync(path.join(root,'README-4C4D-5B-4.md'),'utf8');assert.match(text,/MANUAL RUNTIME TESTS NOT YET RUN/);assert.match(text,/B4.*disabled/);});
test('cross-platform test fixtures use OS-specific temp directory',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dscp-4d5b4-'));try{fs.writeFileSync(path.join(dir,'test.json'),JSON.stringify(cp()));assert.ok(fs.statSync(path.join(dir,'test.json')).size>0);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
