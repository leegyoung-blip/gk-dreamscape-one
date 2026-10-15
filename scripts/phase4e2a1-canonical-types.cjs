'use strict';
/** Phase 4E-2A-1: guarded, additive canonical-type compatibility for staff/server teaching intelligence. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const relativePath = 'lib/math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion.ts';
const marker = '// Phase 4E-2A-1: live Mathematics open-answer aliases (canonical open_ended).';
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const check = args.has('--check');
if (apply === check || [...args].some((a) => a !== '--apply' && a !== '--check')) {
  console.error('Usage: node scripts/phase4e2a1-canonical-types.cjs --check | --apply');
  process.exit(2);
}
const root = process.cwd();
const file = path.join(root, relativePath);
if (!fs.existsSync(path.join(root,'package.json')) || !fs.existsSync(file)) {
  console.error('STOP: Run in the gk-design-world project root (package.json and canonical normalizer required).');
  process.exit(1);
}
const source = fs.readFileSync(file,'utf8');
const nl = source.includes('\r\n') ? '\r\n' : '\n';
const oldBlock = ['    case "numeric":', '    case "fill_blank":'].join(nl);
const newBlock = [
  '    case "numeric":',
  '    '+marker,
  '    case "fraction":',
  '    case "numeric_unit":',
  '    case "money":',
  '    case "short_text":',
  '    case "fill_blank":',
].join(nl);
const occurrences = (h,n) => h.split(n).length - 1;
if (source.includes(newBlock) && occurrences(source,marker) === 1) {
  console.log('ALREADY APPLIED: canonical aliases present exactly once; no changes.');
  process.exit(0);
}
if (source.includes(marker) || occurrences(source,oldBlock) !== 1) {
  console.error('STOP: Live normalizer differs from the audited version. No files changed.');
  process.exit(1);
}
const target = source.replace(oldBlock,newBlock);
if (!target.includes('    case "multiple_select":') || !target.includes('    case "open_ended":') || !target.includes('      return "open_ended";')) {
  console.error('STOP: Original canonical behavior was not found. No files changed.');
  process.exit(1);
}
console.log('READY: add fraction, numeric_unit, money, short_text as canonical open_ended.');
console.log('Scope: one server/shared 4A normalizer file; no quiz player, Supabase or grading changes.');
if (!apply) process.exit(0);
const backupRoot = path.join(root, 'qa-artifacts', 'phase4e2a1', 'backups');
fs.mkdirSync(backupRoot,{recursive:true});
const digest=crypto.createHash('sha256').update(source).digest('hex').slice(0,16);
const backup=path.join(backupRoot, `normalizeCanonicalTeachingQuestion.${digest}.ts`);
if (!fs.existsSync(backup)) fs.writeFileSync(backup,source,'utf8');
fs.writeFileSync(file,target,'utf8');
console.log('APPLIED: '+relativePath);
console.log('Original backup: '+path.relative(root,backup));
