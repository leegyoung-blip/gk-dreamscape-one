#!/usr/bin/env node
/**
 * DREAMSCAPE ONE — P6 fraction response UI hotfix.
 * Guarded, source-preserving patch. No network or DB calls.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const base = 'app/learning-missions/core/[subject]/[level]/quiz/[quizId]';
const files = {
  types: `${base}/CoreQuizTypes.ts`,
  utils: `${base}/CoreQuizUtils.ts`,
  renderer: `${base}/presentation/renderers/MathQuestionRenderer.tsx`,
};
function oneReplace(source, pattern, replace, label) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))];
  if (matches.length !== 1) throw new Error(`${label}: expected one patch anchor; found ${matches.length}. Nothing was written.`);
  return source.replace(pattern, replace);
}
function transformTypes(src) {
  if (src.includes('  | "fraction"')) return src;
  return oneReplace(src,/^(\s*\| "short_text")\s*$/m, '$1\n  | "fraction"', 'types.fraction');
}
function transformUtils(src) {
  let next=src;
  if (!/case "fraction"\s*:/.test(next)) {
    next=oneReplace(next,/(\s*case "short_text":\s*\n)/, '\n    case "fraction":$1', 'utils.response-completion');
  }
  if (!/^\s*fraction: "Fraction",/m.test(next)) {
    next=oneReplace(next,/^(\s*short_text: "Short Answer",)\s*$/m, '$1\n    fraction: "Fraction",', 'utils.type-label');
  }
  return next;
}
function transformRenderer(src) {
  let next=src;
  // Restrict this edit to the selector helper, not any other switch block.
  const fnStart=next.indexOf('function getMathResponseKind(');
  if(fnStart < 0) throw new Error('renderer: getMathResponseKind not found. Nothing was written.');
  const tail=next.slice(fnStart);
  if(!/case "fraction"\s*:/.test(tail)) {
    const patched=oneReplace(tail,/(case "open_cloze":\s*\n\s*return "text";)/, 'case "open_cloze":\n    case "fraction":\n      return "text";', 'renderer.response-kind');
    next=next.slice(0,fnStart)+patched;
  }
  // Existing MathAnswerInput handles short_text; adapt only its local rendering
  // input contract, NOT the true question_type sent to the grading RPC.
  if(!/question=\{question\.question_type === "fraction"\s*\?/.test(next)) {
    const re=/(<MathAnswerInput\s*\n\s*)question=\{question\}/;
    next=oneReplace(next,re, '$1question={question.question_type === "fraction" ? { ...question, question_type: "short_text" } : question}', 'renderer.input-alias');
  }
  return next;
}
const transform={types:transformTypes,utils:transformUtils,renderer:transformRenderer};
function patchRepo(root, apply=false) {
  const edits=[];
  for(const [key,rel] of Object.entries(files)) {
    const full=path.join(root,...rel.split('/'));
    if(!fs.existsSync(full)) throw new Error(`Missing required source: ${rel}. No changes applied.`);
    const original=fs.readFileSync(full,'utf8');
    const updated=transform[key](original);
    edits.push({key,rel,full,original,updated});
  }
  // All checks above finish before any write.
  if(apply && edits.some(e=>e.original !== e.updated)) {
    const folder=path.join(root,'qa-artifacts','fraction-answer-hotfix','backups');
    fs.mkdirSync(folder,{recursive:true});
    for(const e of edits) {
      if(e.original===e.updated) continue;
      const name=e.key+'-'+crypto.createHash('sha256').update(e.original).digest('hex').slice(0,12)+path.extname(e.full)+'.bak';
      const backup=path.join(folder,name);
      if(!fs.existsSync(backup)) fs.writeFileSync(backup,e.original,'utf8');
      fs.writeFileSync(e.full,e.updated,'utf8');
    }
  }
  return edits.map(e=>({path:e.rel,change:e.original!==e.updated ? (apply?'patched':'would-patch'):'already-patched'}));
}
if(require.main === module) {
  try {
    const mode=process.argv.includes('--apply') ? '--apply' : '--check';
    const root=process.cwd();
    const results=patchRepo(root,mode==='--apply');
    console.log(`Fraction answer UI patch (${mode}):`);
    for(const r of results) console.log(' -',r.change, r.path);
    if(mode==='--check') console.log('Dry run only. Run with --apply to install.');
    else console.log('Installed. Backups for modified files: qa-artifacts/fraction-answer-hotfix/backups/');
  } catch(err) { console.error('STOP:',err.message); process.exitCode=1; }
}
module.exports={patchRepo,transformTypes,transformUtils,transformRenderer,files};
