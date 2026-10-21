#!/usr/bin/env node
'use strict';
/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4C-3
 * LOCAL, READ-ONLY authenticated-session RPC verifier.
 * No recording RPC, database inserts/updates/deletes, application route or service-role keys.
 * Tokens are accepted only through standard input and are NEVER logged or persisted.
 */
const fs = require('node:fs');
const path = require('node:path');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/;
const EMPTY_ID = '00000000-0000-4000-8000-000000000000';
const ROLES = new Set(['anonymous', 'regular', 'staff']);
const RPC = '/rest/v1/rpc/math_specialist_structure_review_preview';
const AUTH = '/auth/v1/user';

function argsFrom(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    if (!['--role', '--quiz-id', '--question-id'].includes(k) ||
        !argv[i + 1] || Object.hasOwn(values, k)) throw new Error('INVALID_ARGUMENTS');
    values[k] = argv[i + 1];
  }
  const role = values['--role'];
  if (!ROLES.has(role)) throw new Error('INVALID_ROLE');
  const quizId = values['--quiz-id'] || EMPTY_ID;
  const questionId = values['--question-id'] || EMPTY_ID;
  if (!UUID.test(quizId) || !UUID.test(questionId)) throw new Error('INVALID_UUID');
  if (role === 'staff' && (quizId === EMPTY_ID || questionId === EMPTY_ID))
    throw new Error('STAFF_REQUIRES_EXISTING_QUIZ_QUESTION_PAIR');
  if (role !== 'staff' && ('--quiz-id' in values || '--question-id' in values))
    throw new Error('NONSTAFF_USES_SYNTHETIC_IDS_ONLY');
  return {role, quizId, questionId};
}

function readEnvFile(root) {
  const result = {};
  for (const filename of ['.env', '.env.local']) {
    const target = path.join(root, filename);
    if (!fs.existsSync(target)) continue;
    const data = fs.readFileSync(target, 'utf8');
    for (const line of data.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.slice(1, -1);
      result[match[1]] = value;
    }
  }
  return result;
}

function jwtRole(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const json = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return json && typeof json.role === 'string' ? json.role : null;
  } catch { return null; }
}

function configFrom(root, env = process.env) {
  const file = readEnvFile(root);
  const config = {...file, ...env};
  const rawUrl = config.NEXT_PUBLIC_SUPABASE_URL;
  const key = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || config.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !key || /\s/.test(key) || key.startsWith('sb_secret_') || jwtRole(key) === 'service_role')
    throw new Error('MISSING_OR_FORBIDDEN_PUBLIC_CONFIG');
  const parsed = new URL(rawUrl);
  // This test will send real session tokens: never permit an arbitrary domain.
  if (parsed.protocol !== 'https:' || !/\.supabase\.co$/i.test(parsed.hostname) ||
      parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash)
    throw new Error('SUPABASE_URL_NOT_ALLOWLISTED');
  return {baseUrl: parsed.origin, publicKey: key};
}

function classify(role, httpStatus, value) {
  const blocked = value && value.status === 'blocked' && value.reasonCode === 'NOT_AUTHORIZED';
  if (role !== 'staff') {
    return {pass: httpStatus === 401 || httpStatus === 403 || (httpStatus === 200 && blocked),
      outcome: 'DENIED_EXPECTED', fingerprintVerified: false};
  }
  const valid = httpStatus === 200 && value && value.status === 'preview_only' &&
    Number.isSafeInteger(value.questionVersion) && value.questionVersion > 0 &&
    value.fingerprintVersion === 'db_jsonb_sha256_v1' && SHA.test(value.sourceFingerprintSha256 || '') &&
    value.persisted === false && value.teachingApproved === false &&
    value.methodActivated === false && value.studentReleased === false;
  return {pass: Boolean(valid), outcome: valid ? 'STAFF_PREVIEW_ONLY' : 'STAFF_PREVIEW_NOT_CONFIRMED',
    fingerprintVerified: Boolean(valid)};
}

async function checkSession({role, quizId, questionId}, {baseUrl, publicKey}, token, fetcher = fetch) {
  if (role === 'anonymous' && token) throw new Error('ANON_MUST_NOT_SUPPLY_TOKEN');
  if (role !== 'anonymous' && (!token || token.length < 30 || token.length > 8192 || /\s/.test(token)))
    throw new Error('INVALID_SESSION_TOKEN');
  if (role !== 'anonymous' && jwtRole(token) === 'service_role')
    throw new Error('SERVICE_ROLE_TOKEN_FORBIDDEN');
  if (role !== 'anonymous' && jwtRole(token) !== 'authenticated')
    throw new Error('AUTHENTICATED_USER_TOKEN_REQUIRED');
  const headers = {
    'apikey': publicKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (jwtRole(publicKey) === 'anon') headers.Authorization = `Bearer ${publicKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    // Confirm the supplied JWT belongs to an actual authenticated user in this project.
    // Without this step an expired/anonymous token could misleadingly 'pass' the ordinary-user test.
    if (role !== 'anonymous') {
      const verified = await fetcher(`${baseUrl}${AUTH}`, {
        method: 'GET', headers, signal: controller.signal,
      });
      let user = null;
      try { user = JSON.parse(await verified.text()); } catch { /* no raw data logged */ }
      if (verified.status !== 200 || !user || !UUID.test(user.id || '')) {
        return Object.freeze({phase:'8C-2C.4C-3',role, pass:false,
          outcome:'SESSION_IDENTITY_NOT_VERIFIED',httpStatus:verified.status,
          fingerprintVerified:false,writesAttempted:0});
      }
    }
    response = await fetcher(`${baseUrl}${RPC}`, {
      method: 'POST', headers, signal: controller.signal,
      body: JSON.stringify({p_quiz_id: quizId, p_question_id: questionId}),
    });
    const body = await response.text();
    let data = null;
    try { data = JSON.parse(body); } catch { /* never reflect raw responses */ }
    const summary = classify(role, response.status, data);
    return Object.freeze({phase: '8C-2C.4C-3', role,
      httpStatus: response.status, ...summary, writesAttempted: 0,
      note: summary.pass ? 'Read-only preview verified' : 'Check the selected role and known-good question pair'});
  } finally { clearTimeout(timer); }
}

async function tokenFromStdin() {
  let content = '';
  for await (const chunk of process.stdin) {
    content += chunk.toString('utf8');
    if (content.length > 8300) throw new Error('TOKEN_TOO_LONG');
  }
  return content.trim();
}

async function main() {
  let role = 'unknown';
  try {
    const args = argsFrom(process.argv.slice(2)); role = args.role;
    const config = configFrom(process.cwd());
    const token = role === 'anonymous' ? '' : await tokenFromStdin();
    const result = await checkSession(args, config, token);
    console.log(JSON.stringify(result, null, 2));
    if (!result.pass) process.exitCode = 2;
  } catch (error) {
    console.log(JSON.stringify({phase:'8C-2C.4C-3', role, pass:false,
      errorCode: typeof error?.message === 'string' && /^[A-Z_]+$/.test(error.message)
        ? error.message : 'SESSION_CHECK_UNAVAILABLE', writesAttempted:0}, null, 2));
    process.exitCode = 2;
  }
}
if (require.main === module) main();
module.exports = {argsFrom, configFrom, jwtRole, classify, checkSession, RPC, AUTH, EMPTY_ID};
