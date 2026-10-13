/**
 * DREAMSCAPE ONE Founding 50 • Student + NOVA+ repository gate inventory.
 * Run: node scripts/04_repository_access_scanner.mjs .
 * Read-only for application files; writes two reports inside f50-access-audit-results/.
 * No dependencies, no network calls, no environment variables/secrets read.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || '.');
const output = join(root, 'f50-access-audit-results');
const skipDirs = new Set(['node_modules','.next','.git','dist','build','coverage','.vercel','out','f50-access-audit-results','.turbo']);
const codeExtensions = new Set(['.ts','.tsx','.js','.jsx','.sql','.mjs','.cjs']);
const patterns = [
  {kind:'NOVA_PLUS_ROLE_GATE', regex:/current_user_has_nova_plus|nova_plus_can_view_student|hasNovaPlusAccess|hasNovaPlusRole|isNovaPlus|role\s*(?:===?|in)\s*['"`]nova[_+ -]?plus/i},
  {kind:'STUDENT_ROLE_GATE', regex:/current_user_has_student|hasStudentAccess|canAccessStudent|student_access|studentAccess|role\s*===?\s*['"`]student['"`]|['"`]student['"`]\s*===?\s*\w*\.role|\.includes\(\s*['"`]student['"`]\s*\)/i},
  {kind:'PRIMARY_ROLE_READ', regex:/\.select\(\s*['"`]role['"`]\s*\)|\.from\(\s*['"`]profiles['"`]\s*\)|profiles\.role/i},
  {kind:'BETA_ENTITLEMENT', regex:/current_user_has_founding50_nova_plus|current_user_f50_nova_plus_learner_id|f50_can_view_selected_nova_plus_learner|hasEffectiveNovaPlusAccess|hasFounding50NovaPlusAccess|founding_50_entitlements|beta_student_user_id/i},
  {kind:'PREMIUM_API_OR_ROUTE', regex:/NOVA_PLUS_ACCESS_REQUIRED|STUDENT_ACCESS_REQUIRED|premium.required|nova.?plus.?required|requireNovaPlus|requireStudent/i},
];
function* walk(dir){
  for (const item of readdirSync(dir,{withFileTypes:true})) {
    if (item.name.startsWith('.') && item.isDirectory() && !['.'].includes(item.name)) continue;
    const path = join(dir,item.name);
    if (item.isDirectory()) { if(!skipDirs.has(item.name)) yield* walk(path); }
    else if (item.isFile() && [...codeExtensions].some(ext=>item.name.endsWith(ext))) yield path;
  }
}
function csv(s){return '"'+String(s??'').replaceAll('"','""').replaceAll(/\r?\n/g,' ')+'"';}
let filesScanned=0; const rows=[]; const inventory={};
for (const path of walk(root)) {
  filesScanned++;
  let src=''; try { src=readFileSync(path,'utf8'); } catch {continue;}
  // Skip very large generated vendor or data files.
  if(src.length > 3_000_000) continue;
  const lines=src.split(/\r?\n/); const filename=relative(root,path).replaceAll('\\','/');
  const betaLineNos=lines.flatMap((line,i)=>patterns[3].regex.test(line)?[i]:[]);
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    for(const {kind,regex} of patterns){
      if(!regex.test(line)) continue;
      const nearby = betaLineNos.some(b=>Math.abs(b-i)<=35);
      let assessment = kind==='BETA_ENTITLEMENT' ? 'BETA_REFERENCE_PRESENT' :
        kind==='PRIMARY_ROLE_READ' ? 'INSPECT_FOR_ROLE_ENFORCEMENT' :
        nearby ? 'REVIEW_BETA_NEARBY_CHECK_AUTHORIZATION' : 'REVIEW_BETA_NOT_NEARBY';
      // A role management UI may read student roles without using them to gate access.
      if(filename.includes('admin/') && kind==='STUDENT_ROLE_GATE') assessment='REVIEW_ADMIN_ROLE_UI_NOT_PROOF_OF_ACCESS';
      rows.push({kind,file:filename,line:i+1,assessment,snippet:line.trim().slice(0,300)});
      inventory[kind]=(inventory[kind]||0)+1;
    }
  }
}
mkdirSync(output,{recursive:true});
const csvHeader=['kind','file','line','assessment','snippet'];
writeFileSync(join(output,'access-gate-inventory.csv'),[
  csvHeader.join(','),...rows.map(r=>csvHeader.map(k=>csv(r[k])).join(','))
].join('\n')+'\n');
const betaFiles=new Set(rows.filter(r=>r.kind==='BETA_ENTITLEMENT').map(r=>r.file));
const gatedFiles=[...new Set(rows.filter(r=>['NOVA_PLUS_ROLE_GATE','STUDENT_ROLE_GATE','PREMIUM_API_OR_ROUTE'].includes(r.kind)).map(r=>r.file))];
const uncovered=gatedFiles.filter(f=>!betaFiles.has(f));
const out=[
'# DREAMSCAPE ONE — Repository Access Gate Scan',
'',`Scanned **${filesScanned}** code files; found **${rows.length}** candidate markers.`,
'', '**This is a static discovery audit, not an access-permission proof.** A beta check elsewhere in a file may not protect a particular backend action; RLS can also block an operation that a UI permits.',
'', '## Candidate counts',
...Object.entries(inventory).sort().map(([name,count])=>`- ${name}: ${count}`),
'',`## Files with access gates but no beta marker anywhere in the same file (${uncovered.length})`,
...(uncovered.length?uncovered.map(f=>`- \`${f}\``):['- None detected. Inspect cross-file imported guards and Supabase RLS anyway.']),
'', '## Important required source files',
'- `components/admin/StudentAccessPanel.tsx` and any RPCs it invokes',
'- `components/admin/NovaPlusAccessAdminPanel.tsx` (shows how permanent roles work)',
'- `middleware.ts` / `proxy.ts` and premium page layouts or server components',
'- All Student-only lesson, mission and teaching routes/API handlers',
'- NOVA+ analytics, recommendations, reports, schoolwork upload and other premium APIs',
'', '## How to interpret',
'- `REVIEW_BETA_NOT_NEARBY`: likely uses an existing role/access gate without an obvious Founding 50 alternative nearby; inspect the actual condition and imported helpers.',
'- `REVIEW_BETA_NEARBY_CHECK_AUTHORIZATION`: same code vicinity includes Founding 50, but its correct use is not proven.',
'- `INSPECT_FOR_ROLE_ENFORCEMENT`: a base-role read could be for UI display rather than authorization.',
'- `BETA_REFERENCE_PRESENT`: marker found, not necessarily a secured/working entitlement.',
'', 'Report: `access-gate-inventory.csv`. Do not treat an empty result as proof of full parity.',
];
writeFileSync(join(output,'access-gate-summary.md'),out.join('\n')+'\n');
console.log(`Scanned ${filesScanned} files; ${rows.length} gate markers; ${uncovered.length} candidate files without beta markers.`);
console.log(`Results: ${output}`);
