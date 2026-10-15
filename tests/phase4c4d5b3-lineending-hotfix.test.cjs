"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const sql = fs.readFileSync(path.join(root,'sql','phase-4c4d5b3-02-manual-guarded-disclosure-fix.sql'),'utf8');
const fixture = JSON.parse(fs.readFileSync(path.join(root,'qa-artifacts','phase4c4d5b3','phase-4c4d5b3-surgical-changes.json'),'utf8'));
const normalize = s => s.replace(/\r\n?/g,'\n');
const occurrences = (source, fragment) => source.split(fragment).length - 1;
const names = ['old1','new1','old2','new2','old3','new3'];
const definitions = ['0eb83089c97aa6b1477e95a13f597330','55ea44f3eb1966a08a2b5ecd8a7c6171'];

test('reviewed old/new snippets are unchanged by hotfix',()=>{
  for (let i=1;i<=3;i++) {
    for (const [prefix,field] of [['old','old'],['new','new']]) {
      const marker=`$phase4c4d5b3_${prefix}${i}$`;
      const expected=fixture.changes[i-1][field];
      assert.ok(sql.includes(marker+expected+marker), `${prefix}${i} must be byte-for-byte reviewed text`);
    }
  }
});
test('stored function definitions normalize both CRLF and bare CR',()=>{
  for(const v of ['v_payload','v_save']) {
    const expected = `${v} := replace(replace(pg_get_functiondef(`;
    assert.ok(sql.includes(expected));
  }
  assert.equal(occurrences(sql,"E'\\r', E'\\n'"),8);
});
test('all six anchors normalize their own line endings before use',()=>{
  for(const key of names){
    assert.match(sql, new RegExp(`v_${key} := replace\\(replace\\(\\$phase4c4d5b3_${key}\\$[\\s\\S]*?\\$phase4c4d5b3_${key}\\$, E'\\\\r\\\\n', E'\\\\n'\\), E'\\\\r', E'\\\\n'\\);`));
  }
});
test('fingerprints pin BOTH complete pre-correction definitions',()=>{
  for(const fingerprint of definitions) assert.ok(sql.includes(fingerprint));
  assert.ok(sql.includes("RAISE EXCEPTION '4D-5B-3 STOP: full-definition fingerprint drift'"));
  assert.ok(sql.indexOf('full-definition fingerprint drift')<sql.indexOf('EXECUTE v_payload;'));
});
test('three exact-match guards remain and cannot be bypassed on zero matches',()=>{
  assert.equal(occurrences(sql,'v_count <> 1'),3);
  for(let i=1;i<=3;i++){
    assert.ok(sql.includes(`snippet ${i} unexpected match count`));
    assert.ok(sql.includes(`v_old${i}, v_new${i}`));
  }
  assert.equal(occurrences(sql,'/ nullif(length(v_old'),3);
});
test('the original safeguards still enclose both EXECUTE statements',()=>{
  assert.ok(sql.includes('BEGIN;\nDO $phase4c4d5b3$'));
  assert.ok(sql.trimEnd().endsWith('COMMIT;'));
  for (const piece of ["current_user <> 'postgres'",'SECURITY DEFINER',"search_path=public, pg_temp", "has_function_privilege('anon'", "has_function_privilege('authenticated'", "has_function_privilege('service_role'",'IS DISTINCT FROM v_payload_acl','IS DISTINCT FROM v_save_acl']) assert.ok(sql.includes(piece),piece);
  assert.ok(sql.indexOf('snippet 3 unexpected match count') < sql.indexOf('EXECUTE v_payload;'));
  assert.ok(sql.indexOf('EXECUTE v_payload;') < sql.indexOf('EXECUTE v_save;'));
});
test('Windows CRLF source and Linux LF source produce same exact-match results',()=>{
  const body=normalize('prefix\n'+fixture.changes[0].old+'\nsuffix');
  for(const s of [body, body.replace(/\n/g,'\r\n'),body.replace(/\n/g,'\r')]){
    for(const n of [fixture.changes[0].old,fixture.changes[0].old.replace(/\n/g,'\r\n'),fixture.changes[0].old.replace(/\n/g,'\r')]){
      assert.equal(occurrences(normalize(s),normalize(n)),1);
    }
  }
});
test('no direct student data updates or permissions changes',()=>{
  assert.doesNotMatch(sql,/^\s*(?:GRANT|REVOKE|ALTER TABLE|DROP|TRUNCATE|UPDATE public|INSERT INTO public|DELETE FROM public)\b/im);
  assert.equal(occurrences(sql,'EXECUTE v_payload;'),1);
  assert.equal(occurrences(sql,'EXECUTE v_save;'),1);
});
