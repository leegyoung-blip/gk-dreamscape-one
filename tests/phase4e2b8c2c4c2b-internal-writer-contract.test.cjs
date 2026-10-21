'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = fs.readFileSync(path.resolve(__dirname, '../lib/math/teaching/student-serving/phase4E2B8C2C4C2BStaffReviewAudit.server.ts'), 'utf8');
test('server-only without HTTP route', () => {
 assert.match(file, /import 'server-only'/);
 assert.doesNotMatch(file, /export (?:async )?function (?:GET|POST|PUT|DELETE)\b/);
});
test('authorisation and JWT identity are checked', () => {
 assert.match(file, /requireCurriculumDeveloperApiAccess/);
 assert.match(file, /getUser\(token\)/);
 assert.doesNotMatch(file, /SUPABASE_SERVICE_ROLE_KEY/);
});
test('source freshness is checked against displayed DB-native fingerprint', () => {
 assert.match(file, /displayedDbFingerprintSha256/);
 assert.match(file, /sourceFingerprintSha256 !== input\.displayedDbFingerprintSha256/);
 assert.match(file, /questionVersion !== input\.questionVersion/);
});
test('writes require a preflight and independently checked RPC', () => {
 assert.match(file, /prepareStaffSpecialistStructureReviewIntent/);
 assert.match(file, /math_specialist_structure_review_record/);
 assert.match(file, /math_specialist_structure_review_preview/);
});
test('never returns a teaching approval or activation', () => {
 assert.match(file, /teachingApproved: false/);
 assert.match(file, /methodActivated: false/);
 assert.match(file, /studentReleased: false/);
});
