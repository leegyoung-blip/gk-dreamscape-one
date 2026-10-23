#!/usr/bin/env node
'use strict';
/**
 * DREAMSCAPE ONE — 4E-2B-8C-2D.8B-7A
 * Read-only beta gate inventory. A file existing is NOT a successful live check.
 * No network, database, provider, student routing, git mutation or secret access.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SCHEMA_VERSION = '8C2D8B7A.v1';
const EXPECTED = Object.freeze([
  ['trusted_staff_source', 'lib/math/teaching/student-serving/phase4E2A3StaffSourceResolver.server.ts'],
  ['specialist_shadow_comparison', 'lib/math/teaching/student-serving/phase4E2B8C2C4DStaffShadowComparison.server.ts'],
  ['durable_audit_writer', 'lib/math/teaching/student-serving/phase4E2B8C2C4C2BStaffReviewAudit.server.ts'],
  ['live_session_test_helper', 'scripts/phase4e2b8c2c4c3-readonly-session-check.cjs'],
  ['trusted_source_mapping', 'lib/math/teaching/student-serving/phase4E2B8C2D8B2TrustedGeneratorBridge.server.ts'],
  ['source_data_minimisation', 'lib/math/teaching/student-serving/phase4E2B8C2D8B2AuthoringInputPolicy.ts'],
  ['explanation_contract', 'lib/math/teaching/student-serving/phase4E2B8C2D8B3ExplanationCaptureContract.ts'],
  ['disabled_generation_adapter', 'lib/math/teaching/student-serving/phase4E2B8C2D8B4DisabledGenerationAdapter.server.ts'],
  ['specialist_provider_contract', 'lib/math/teaching/student-serving/phase4E2B8C2D8B5ASpecialistProviderContract.ts'],
  ['disabled_specialist_provider', 'lib/math/teaching/student-serving/phase4E2B8C2D8B5ADisabledLunaProvider.server.ts'],
  ['structured_response_review', 'lib/math/teaching/student-serving/phase4E2B8C2D8B5BExplanationResponseReview.ts'],
  ['staff_capture_preflight', 'lib/math/teaching/student-serving/phase4E2B8C2D8B5CStaffCapturePreflight.server.ts'],
  ['offline_capture_handoff', 'lib/math/teaching/student-serving/phase4E2B8C2D8B5COfflineCaptureHandoff.server.ts'],
  ['private_review_evaluation_tool', 'scripts/phase4e2b8c2d7-real-output-evaluation.cjs'],
  ['local_synthetic_pilot', 'scripts/phase4e2b8c2d8b6a-local-luna-pilot.cjs'],
]);
const GATES = Object.freeze([
  ['G01', 'Scoped source presence', 'SOURCE_ONLY', 'File presence is inventoried; it does not verify execution, Git deployment or correctness.'],
  ['G02', 'Specialist provider disabled boundary', 'LIVE_DISABLED', 'The dedicated 8B-5A provider is a non-invoking adapter. Any future enabled adapter requires separate review.'],
  ['G03', 'Genuine local Luna synthetic generation', 'SKIPPED_UNVERIFIED', 'User chose to skip the optional API-key model test; zero genuine outputs are supplied by this evidence.'],
  ['G04', 'Real model-output quality evaluation', 'BLOCKED_NO_REAL_OUTPUT', '8B-6B cannot assess real explanation quality without genuine outputs.'],
  ['G05', 'Published-question model execution', 'NOT_IMPLEMENTED_OR_AUTHORISED', 'The 8B-5C staff preflight is read-only. No released provider execution contract is established.'],
  ['G06', 'Data egress permission and authorised facts', 'UNVERIFIED', 'Published-question and authoritative-answer handling require explicit policy review before any external AI request.'],
  ['G07', 'Live ordinary-user and staff role tests', 'DEFERRED_NOT_PASSED', 'Production Google OAuth and role testing remains deferred to beta readiness.'],
  ['G08', 'Durable Supabase audit write-path tests', 'DEFERRED_NOT_PASSED', 'A writer implementation is not evidence of a successful authorised database audit event.'],
  ['G09', 'Live question-source version and freshness', 'UNVERIFIED', 'Repeated read checks are not a transaction or source-freshness certificate.'],
  ['G10', 'Two independent educator reviews', 'PENDING', 'The independent specialist vs incumbent explanation reviews remain outstanding.'],
  ['G11', 'Independent mathematical and visual review', 'PENDING', 'Structural and narrow numeric consistency checks do not establish educational correctness.'],
  ['G12', 'Specialist-method curriculum approval', 'NOT_APPROVED', 'All three specialist methods remain inactive drafts.'],
  ['G13', 'Production scoring and learner release', 'BLOCKED', 'No authorization exists to change scoring or enable these methods for learners.'],
]);

function inRepo(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
function readSource(root, relative) {
  const full = path.resolve(root, relative);
  // The relative paths are constant, not supplied by CLI/user input.
  try {
    const stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.isSymbolicLink()) return {present: false, sha256: null};
    const bytes = fs.readFileSync(full);
    return {present: true, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR' || err.code === 'EACCES' || err.code === 'EPERM')) {
      return {present: false, sha256: null};
    }
    throw err;
  }
}
function buildReport(root) {
  const files = EXPECTED.map(([id, relativePath]) => ({id, relativePath, ...readSource(root, relativePath)}));
  const missing = files.filter(x => !x.present).map(x => x.id);
  return {
    phase: '4E-2B-8C-2D.8B-7A',
    schemaVersion: SCHEMA_VERSION,
    generatedAtUtc: new Date().toISOString(),
    sourceScope: 'NAMED_SOURCE_FILES_ONLY_NOT_COMPLETE_REPOSITORY_AUDIT',
    result: 'BETA_RELEASE_NOT_AUTHORISED',
    modelPilot: 'SKIPPED_NO_GENUINE_OUTPUT_EVIDENCE',
    sourceInventory: {
      expected: files.length,
      present: files.length - missing.length,
      missing,
      files,
    },
    gates: GATES.map(([id, name, status, explanation]) => ({id, name, status, explanation})),
    restrictions: {
      providerCallEnabledByThisPhase: false,
      writesToProductionDatabase: false,
      publishesOrActivatesSpecialistMethods: false,
      changesProductionScoring: false,
      allowsLearnerRelease: false,
      skippedTestsCountAsPassed: false,
    },
    interpretation: 'Inventory hashes show file bytes only. No live security, staff session, provider transport, source authenticity, teaching quality, or release claim is verified.',
  };
}
function parseArgs(argv) {
  let root = process.cwd();
  let output = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root' || a === '--output') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('MISSING_FLAG_VALUE');
      if (a === '--root') root = path.resolve(argv[++i]);
      else output = path.resolve(argv[++i]);
    } else throw new Error('UNRECOGNISED_ARGUMENT');
  }
  if (!fs.statSync(root).isDirectory()) throw new Error('INVALID_ROOT');
  if (output && inRepo(root, output)) throw new Error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
  return {root, output};
}
function run(argv) {
  const {root, output} = parseArgs(argv);
  const report = buildReport(root);
  const json = JSON.stringify(report, null, 2) + '\n';
  if (output) {
    fs.mkdirSync(path.dirname(output), {recursive: true});
    // The report is metadata-only. Exclusive create avoids unintentionally
    // overwriting an earlier evidence report.
    fs.writeFileSync(output, json, {flag: 'wx', mode: 0o600});
    process.stdout.write(JSON.stringify({phase: report.phase, result: report.result,
      filesPresent: report.sourceInventory.present, expected: report.sourceInventory.expected,
      outputWritten: true}) + '\n');
  } else {
    process.stdout.write(json);
  }
  return report;
}
if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (err) {
    const allowed = new Set(['MISSING_FLAG_VALUE','UNRECOGNISED_ARGUMENT','INVALID_ROOT',
      'OUTPUT_MUST_BE_OUTSIDE_REPOSITORY','EEXIST','ENOENT','EACCES','EPERM']);
    process.stderr.write(JSON.stringify({status:'BLOCKED',reason:allowed.has(err.code)||allowed.has(err.message)
      ? (err.code || err.message) : 'INTERNAL_ERROR'})+'\n');
    process.exitCode = 1;
  }
}
module.exports = {EXPECTED, GATES, SCHEMA_VERSION, inRepo, readSource, buildReport, parseArgs, run};
