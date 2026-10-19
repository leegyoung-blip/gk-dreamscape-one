DREAMSCAPE ONE — Phase 4E-2B-8C-2C.1
Staff-only curriculum skill evidence audit / P1 quantified-change language support

CONTENTS (exact repository paths)
- lib/math/teaching/strategy-selection/phase4C4Adapter.ts (replace)
- lib/math/teaching/strategy-selection/phase4E2B8C2BMethodDifferentiation.ts (replace)
- lib/math/teaching/strategy-selection/phase4E2B8C2CSkillAudit.ts (new)
- lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts (replace)
- tests/phase4e2b8c2c1-skill-evidence-audit.test.cjs (new)

INTENT
- Exactly the eligible ranked first and second methods are audited for authored curriculumSkills and matching keys from the validated 4A contract.
- Reports static, sanitised staff-only 8C2C codes without source question text, answers, learner-specific evidence or curriculum labels.
- Recognises P1 explicit count + popped balloon phrasing as shadow 8C2B evidence (no score or selection changes).
- Does NOT infer mastery, award curriculum points, change the frozen selector, add methods, update database, approve reviews, or release teaching to students.
- All nine methods in the seven ambiguous sample pairs have an empty curriculumSkills array in the provided 4B production libraries.

LOCAL VERIFICATION (source snapshot)
37/37 tests passed across these three test files:
 node --test tests/phase4e2b8c2c1-skill-evidence-audit.test.cjs tests/phase4e2b8c2b-method-differentiation.test.cjs tests/phase4e2b1-staff-method-preview.test.cjs
Syntax transpilation: 4/4 updated TS files passed.
Note: tests/phase4e2b8c-candidate-coverage-export.test.cjs was not run successfully on the source snapshot because the separate UI panel component app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.tsx was not included in the supplied ZIP. Run this regression in the full repository.
A full TypeScript build was NOT possible on the partial source archive.

INSTALL
- Back up/commit your current working tree first; unzip into repository root, preserving directories.
- Run npx tsc --noEmit and focused tests (as above) in your full repository.
- Also rerun the 12-question staff coverage CSV. Selection outcomes are expected to remain unchanged; new SKILL_8C2C_TOP_TWO_SKILLS_UNDECLARED codes should appear in the seven ambiguous rows.
- No Supabase SQL required.

NEXT PHASE
- 8C-2C.2: design/validate a question-agnostic curriculum skill map and specialist mathematical evidence under staff-reviewed fixtures BEFORE allowing those 15 points or the new rules to alter actual selection.
