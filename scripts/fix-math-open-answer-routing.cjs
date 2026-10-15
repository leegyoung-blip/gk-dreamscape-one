#!/usr/bin/env node
/** DREAMSCAPE — guarded open-response routing repair. No production SQL changes. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.env.DREAMSCAPE_PROJECT_ROOT
  ? path.resolve(process.env.DREAMSCAPE_PROJECT_ROOT)
  : process.cwd();
const dir = path.join(root, 'app', 'learning-missions', 'core', '[subject]', '[level]', 'quiz', '[quizId]');
const specs = [
  { key: 'stage', file: path.join(dir, 'presentation', 'CoreMissionStage.tsx') },
  { key: 'types', file: path.join(dir, 'CoreQuizTypes.ts') },
  { key: 'utils', file: path.join(dir, 'CoreQuizUtils.ts') },
  { key: 'renderer', file: path.join(dir, 'presentation', 'renderers', 'MathQuestionRenderer.tsx') },
  { key: 'input', file: path.join(dir, 'presentation', 'renderers', 'MathAnswerInput.tsx') },
];
const TYPES = ['numeric', 'numeric_unit', 'money'];

function assertOne(text, needle, label) {
  const count = text.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one anchor; found ${count}`);
}
function update(key, source) {
  let text = source;
  // Match source with CRLF or LF while preserving original line-ending convention.
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const norm = source.replace(/\r\n/g, '\n');
  text = norm;
  if (key === 'stage') {
    const old = 'if (presentationMode === "math_standard") {';
    const replacement = `if (\n    presentationMode === "math_standard" ||\n    (subject === "math" &&\n      (question.question_type === "fraction" ||\n        question.question_type === "numeric" ||\n        question.question_type === "numeric_unit" ||\n        question.question_type === "money"))\n  ) {`;
    if (text.includes(replacement)) return source;
    assertOne(text, old, 'CoreMissionStage');
    if (!text.includes('<MathQuestionRenderer') || !text.includes('<CoreTeachingEngine') || !text.includes('resolvePresentationMode')) {
      throw new Error('CoreMissionStage: required existing teaching/rendering contract not found');
    }
    text = text.replace(old, replacement);
  } else if (key === 'types') {
    if (TYPES.every(t => text.includes(`| "${t}"`))) return source;
    const old = '  | "fraction"';
    assertOne(text, old, 'CoreQuizTypes');
    if (!text.includes('export type QuestionType')) throw new Error('CoreQuizTypes: missing question type contract');
    text = text.replace(old, old + TYPES.filter(t=>!text.includes(`| "${t}"`)).map(t=>`\n  | "${t}"`).join(''));
  } else if (key === 'utils') {
    if (!text.includes('export function responseIsComplete') || !text.includes('export function formatCoreQuestionType')) {
      throw new Error('CoreQuizUtils: missing response / label contracts');
    }
    const anchor = '    case "fraction":\n';
    if (!text.includes('    case "numeric":\n')) {
      assertOne(text, anchor, 'CoreQuizUtils completion switch');
      text = text.replace(anchor, anchor + TYPES.map(t=>`    case "${t}":\n`).join(''));
    } else if (!TYPES.every(t=>text.includes(`    case "${t}":\n`))) {
      throw new Error('CoreQuizUtils: partial numeric type support requires manual inspection');
    }
    const labelAnchor = '    fraction: "Fraction",';
    if (!text.includes('    numeric: "Number",')) {
      assertOne(text, labelAnchor, 'CoreQuizUtils label map');
      text = text.replace(labelAnchor, labelAnchor + '\n    numeric: "Number",\n    numeric_unit: "Number and Unit",\n    money: "Money",');
    } else if (!['numeric_unit: "Number and Unit",','money: "Money",'].every(t=>text.includes(t))) {
      throw new Error('CoreQuizUtils: incomplete numeric label map');
    }
  } else if (key === 'renderer') {
    const anchor = '    case "fraction":\n';
    if (!text.includes('    case "numeric":\n')) {
      assertOne(text, anchor, 'MathQuestionRenderer response switch');
      if (!text.includes('function getMathResponseKind') || !text.includes('<MathAnswerInput')) {
        throw new Error('MathQuestionRenderer: expected input implementation missing');
      }
      text = text.replace(anchor, anchor + TYPES.map(t=>`    case "${t}":\n`).join(''));
    } else if (!TYPES.every(t=>text.includes(`    case "${t}":\n`))) {
      throw new Error('MathQuestionRenderer: partial numeric type support requires manual inspection');
    }
  } else if (key === 'input') {
    const old = `  const inputMode: AnswerInputMode =\n    requestedMode === "numeric" || requestedMode === "decimal"\n      ? requestedMode\n      : "text";`;
    const replacement = `  const defaultMode: AnswerInputMode =\n    question.question_type === "numeric" || question.question_type === "money"\n      ? "decimal"\n      : "text";\n\n  const inputMode: AnswerInputMode =\n    requestedMode === "numeric" || requestedMode === "decimal"\n      ? requestedMode\n      : defaultMode;`;
    if (text.includes(replacement)) return source;
    assertOne(text, old, 'MathAnswerInput input mode');
    if (!text.includes('onChange({ text: event.target.value })')) throw new Error('MathAnswerInput: response serialization drift');
    text = text.replace(old, replacement);
  }
  return text.replace(/\n/g, eol);
}

function plan() {
  return specs.map(({key,file}) => {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Missing source file: ${file}`);
    const original=fs.readFileSync(file,'utf8');
    const next=update(key, original);
    return {key,file,original,next,changed:original!==next};
  });
}
function main() {
  const mode=process.argv[2];
  if (!['--check','--apply'].includes(mode)) {
    console.error('Usage: node scripts/fix-math-open-answer-routing.cjs --check|--apply');
    process.exitCode=2;return;
  }
  let entries;
  try { entries=plan(); } catch(error){console.error('STOP:',error.message);process.exitCode=1;return;}
  for(const e of entries) console.log(`${e.changed?'PATCH':'OK'} ${path.relative(root,e.file)}`);
  if(mode==='--check'){console.log(`PASS: guarded source inspection (${entries.filter(e=>e.changed).length} changes needed). No files modified.`);return;}
  const pending=entries.filter(e=>e.changed);
  if(!pending.length){console.log('Already installed: no changes made.');return;}
  const backupDir=path.join(root,'qa-artifacts','math-open-answer-routing','backups');
  fs.mkdirSync(backupDir,{recursive:true});
  const modified=[];
  try {
    for(const e of pending) {
      const hash=crypto.createHash('sha256').update(e.original).digest('hex').slice(0,12);
      const backup=path.join(backupDir,`${e.key}-${hash}${path.extname(e.file)}.bak`);
      if(!fs.existsSync(backup)) fs.writeFileSync(backup,e.original,{flag:'wx'});
    }
    for(const e of pending){fs.writeFileSync(e.file,e.next,'utf8'); modified.push(e);}
    console.log(`Applied ${pending.length} guarded changes. Previous versions backed up in ${path.relative(root,backupDir)}`);
  } catch(error){
    for(const e of modified.reverse()) fs.writeFileSync(e.file,e.original,'utf8');
    console.error('STOP: file write failed; modified files restored:',error.message);process.exitCode=1;
  }
}
if(require.main===module) main();
module.exports={update,plan};
