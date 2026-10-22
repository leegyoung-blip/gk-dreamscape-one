#!/usr/bin/env node
'use strict';
/**
 * DREAMSCAPE ONE | Phase 4E-2B-8C-2D.8B-1
 * Source-only, non-executing generator contract review.
 * No HTTP requests, model calls, database connections, source payloads or secrets.
 */
const fs = require('node:fs');
const path = require('node:path');

const FILES = Object.freeze({
  generateRoute: 'app/api/curriculum-developer/math-intelligence/generate/route.ts',
  auth: 'lib/curriculum-developer/server/CurriculumDeveloperApiAuth.ts',
  pipeline: 'lib/math-intelligence/MathIntelligencePipeline.ts',
  teachingPipeline: 'lib/math-intelligence/MathTeachingVisualPipeline.ts',
  provider: 'lib/math-intelligence/ai/OpenAILunaProvider.ts',
  teachingContract: 'lib/math-intelligence/ai/TeachingAIProvider.ts',
  staffPreview: 'app/api/curriculum-developer/math-intelligence/method-preview/route.ts',
  specialist: 'lib/math/teaching/student-serving/phase4E2B8C2C4DStaffShadowComparison.server.ts',
});

const rules = Object.freeze([
  { id: 'STAFF_GENERATOR_AUTH', file: 'generateRoute', test: s => /await\s+requireCurriculumDeveloperApiAccess\s*\(\s*request\s*\)/.test(s) },
  { id: 'GENERATOR_USES_CALLER_DRAFT', file: 'generateRoute', test: s => /request\.json\s*\(/.test(s) && /generateMathVisualAndTeachingForQuestion\s*\(\s*body\.question\s*\)/.test(s) },
  { id: 'GENERATOR_NOT_TRUSTED_SOURCE_BOUND', file: 'generateRoute', test: s => !/resolveStaffMathTeachingSource\b/.test(s) && !/sourceIdentity\.questionVersion\b/.test(s) },
  { id: 'NO_DIRECT_AUTHORING_PERSISTENCE', file: 'generateRoute', test: s => /buildMathAuthoringProposal\s*\(/.test(s) && !/\.from\s*\(/.test(s) && !/\.rpc\s*\(/.test(s) },
  { id: 'STAFF_AUTH_ROLE_RECHECK', file: 'auth', test: s => /client\.auth\.getUser\s*\(/.test(s) && /\.from\s*\(\s*["']profiles["']\s*\)/.test(s) && /role\s*!==\s*["']admin["']/.test(s) && /role\s*!==\s*["']curriculum_lead["']/.test(s) },
  { id: 'VISUAL_GENERATION_REQUIRED_FOR_TEACHING', file: 'pipeline', test: s => /visual\.generation\.status\s*!==\s*["']generated["']/.test(s) && /teaching:\s*null/.test(s) && /generateMathTeachingVisualWithFallback\s*\(/.test(s) },
  { id: 'RULES_FIRST_TEACHING_FALLBACK', file: 'teachingPipeline', test: s => /generateMathTeachingVisualDraft\s*\(/.test(s) && /rulesDraft\.status\s*!==\s*["']deferred_to_luna["']/.test(s) },
  { id: 'VALIDATION_REQUIRED', file: 'teachingPipeline', test: s => /validateMathTeachingVisualDraft\s*\(/.test(s) },
  { id: 'EXISTING_LUNA_PROVIDER_REQUEST', file: 'provider', test: s => /https:\/\/api\.openai\.com\/v1\/responses/.test(s) && (s.match(/store:\s*false/g) || []).length >= 2 && !/store:\s*true/.test(s) },
  { id: 'POSSIBLE_ANSWER_CONTEXT_SENT_TO_PROVIDER', file: 'provider', test: s => /correct_answer:\s*input\.correct_answer/.test(s) && /explanation:\s*input\.explanation/.test(s) && /compactQuestionPayload\s*\(\s*input\s*\)/.test(s) },
  { id: 'VISUAL_STEPS_CONTRACT', file: 'teachingContract', test: s => /lesson_steps:\s*MathVisualTeachingStep\[\]/.test(s) && /teach_me_steps:\s*MathVisualTeachingStep\[\]/.test(s) },
  { id: 'STAFF_METHOD_PREVIEW_AUTH', file: 'staffPreview', test: s => /await\s+requireCurriculumDeveloperApiAccess\s*\(\s*request\s*\)/.test(s) && /previewStaffMathMethod\s*\(/.test(s) },
  { id: 'SPECIALIST_REMAINS_SHADOW', file: 'specialist', test: s => /const MARKERS\s*:\s*Markers\s*=\s*Object\.freeze\s*\(\s*\{[\s\S]*?teachingApproved:\s*false[\s\S]*?studentReleased:\s*false[\s\S]*?methodActivated:\s*false/.test(s) && /inspectStaffMathSpecialistShadowComparison/.test(s) },
  { id: 'NO_SPECIALIST_LINK_TO_AUTHORING_GENERATOR', file: 'pipeline', test: s => !/phase4E2B8C2C4DStaffShadowComparison|PHASE4E2B8C2C3A_SPECIALIST_DRAFTS/.test(s) },
]);

function auditFromTexts(input) {
  const checks = rules.map(rule => ({
    id: rule.id,
    status: typeof input[rule.file] === 'string' && rule.test(input[rule.file]) ? 'observed' : 'not_verified',
  }));
  const drift = checks.filter(x => x.status !== 'observed').map(x => x.id);
  return {
    phase: '4E-2B-8C-2D.8B-1',
    status: drift.length ? 'SOURCE_CONTRACT_DRIFT_REVIEW_REQUIRED' : 'SOURCE_CONTRACT_REVIEWED_CAPTURE_BLOCKED',
    sourceContracts: checks,
    captureReady: false,
    realNovaExplanationsCaptured: 0,
    liveStaffSessionVerified: false,
    specialistMethodsActive: false,
    newProductionScoringEnabled: false,
    unresolved: [
      'GENERATOR_ACCEPTS_AUTHORING_DRAFT_NOT_ATOMIC_VERSIONED_DB_SOURCE',
      'GENERATOR_VISUAL_GATED_NOT_GENERAL_SPECIALIST_EXPLANATION_GENERATOR',
      'MODEL_ANALYSIS_PAYLOAD_CAN_INCLUDE_CORRECT_ANSWER_AND_EXPLANATION',
      'TRUSTED_SOURCE_TO_AUTHORING_INPUT_SHAPE_NOT_REVIEWED',
      'ACTUAL_NOVA_OUTPUT_CAPTURE_AND_EDUCATOR_VERIFICATION_PENDING',
      'LIVE_STAFF_AUTH_TESTS_DEFERRED_TO_BETA',
    ],
    contractDrift: drift,
  };
}
function auditRepository(root) {
  const texts = {};
  for (const [name, relative] of Object.entries(FILES)) {
    const file = path.join(root, relative);
    try {
      if (!fs.statSync(file).isFile()) throw new Error('not file');
      texts[name] = fs.readFileSync(file, 'utf8');
    } catch { texts[name] = null; }
  }
  return auditFromTexts(texts);
}
if (require.main === module) {
  const idx = process.argv.indexOf('--root');
  const root = idx === -1 ? process.cwd() : process.argv[idx + 1];
  if (!root) { process.stderr.write('Missing --root path\n'); process.exit(2); }
  const report = auditRepository(path.resolve(root));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.contractDrift.length ? 1 : 0;
}
module.exports = { FILES, rules, auditFromTexts, auditRepository };
