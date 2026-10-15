'use strict';
// DREAMSCAPE 4E2A2 additive installer. The single source module is never
// overwritten if content differs. --check never writes files.
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const mode=process.argv[2];
if(!['--check','--apply'].includes(mode)){console.error('Usage: node scripts/phase4e2a2-install.cjs --check|--apply');process.exit(2)}
const root=process.cwd();
if(!fs.existsSync(path.join(root,'package.json'))){console.error('STOP: run from the DREAMSCAPE project root.');process.exit(1)}
const target='lib/math/teaching/student-serving/phase4E2A2TrustedSource.server.ts';
const source=path.join(__dirname,'..','payload',target); const dest=path.join(root,target);
if(!fs.existsSync(source)){console.error('STOP: package source file is missing.');process.exit(1)}
const expected=fs.readFileSync(source);const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(fs.existsSync(dest)){
 if(sha(fs.readFileSync(dest))!==sha(expected)){
  console.error('STOP: target exists with different contents. No files changed.');process.exit(1);
 }
 console.log('ALREADY INSTALLED: '+target);process.exit(0);
}
if(mode==='--check'){console.log('READY: additive server-only module can be installed; no files changed.');process.exit(0)}
fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,expected,{flag:'wx'});
console.log('INSTALLED: '+target+' (new file only). No existing source was modified.');
