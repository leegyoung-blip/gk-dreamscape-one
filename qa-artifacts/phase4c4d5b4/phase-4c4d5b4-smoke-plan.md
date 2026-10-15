# Phase 4C-4D-5B-4 — Guided authenticated smoke test

**Do not perform these actions on real students' attempts.** Use disposable test users and a staging/test quiz, and avoid granting extra rewards on production accounts.

## Setup

- Confirm the corrected 4D-5B-3 postflight remains green for `get_math_quiz_payload_unlocked` and `save_math_quiz_answer_unlocked`.
- Prepare learner A and learner B, each with their own authenticated session. Prepare published test quizzes for `immediate`, `end_of_quiz`, and `none`; include one auto-marked and one manual-marked question for immediate feedback. If staging is unavailable or manual marking cannot be created safely, mark those cases `BLOCKED`.
- Use the normal learner quiz UI. In browser DevTools, inspect *response fields only* for `get_math_quiz_payload`, `save_math_quiz_answer`, and `submit_math_quiz_attempt`. Never paste tokens or complete responses into notes or chats.
- Record **field presence/absence**, pending status, and UI behavior. For `null`/missing checks, note both if relevant. Client-rendered concealment is not enough: the RPC response itself must withhold restricted values.

## Scenarios

### IM-01 — Immediate: before a response is saved

Expected: no answer/correctness/explanation appears before permitted save. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### IM-02 — Immediate: automatic first save

Expected: ordinary auto-marked feedback, locked answer and display working still behave as before. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### IM-03 — Immediate: manual pending first save

Expected: pending_manual_review=true; no correct_response, explanation or adjudicated score in returned save feedback. Inspect via **network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### IM-04 — Immediate: manual pending locked resave

Expected: locked resave stays pending and returns no correct_response, explanation or scored/correctness outcome. Inspect via **network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### IM-05 — Immediate: manual pending resume

Expected: reload/resume payload saved_answers still shows pending, withholds correct_response and explanation. Inspect via **network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### IM-06 — Immediate: manual pending submitted result

Expected: after quiz submission the pending item has no correct_response or explanation; no final rewards prematurely. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### END-01 — End-of-quiz: before submission

Expected: no explanation/correct answer while completing quiz. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### END-02 — End-of-quiz: completed result

Expected: authorized submitted result returns normal answer review; no premature review. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### NONE-01 — Feedback mode none

Expected: no answer-revealing feedback during quiz or results. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### AUTH-01 — Ownership isolation

Expected: test user B cannot modify test user A attempt; request fails server-side. Inspect via **network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### AUTH-02 — Question membership isolation

Expected: attempt A cannot save answer for question from an unrelated test quiz. Inspect via **network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### REWARD-01 — Rewards and replay

Expected: first eligible completion rewards unchanged; replay does not duplicate rewards. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### CONTENT-01 — Raw quiz payload content

Expected: network payload content inspected for embedded answers, teaching solutions or spoiler fields; no premature disclosure. Inspect via **network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

### QUIZ-01 — Automatic marking and submit

Expected: regular quiz saves, submits, scores, and produces correct result UI without regression. Inspect via **ui+network**. Mark `PASS` only after testing; otherwise `FAIL`, `BLOCKED`, or `NOT_RUN`.

## After testing

Save only anonymized observations in `phase-4c4d5b4-results.json`. Validate with `node scripts/verify-math-4d5b4-smoke.cjs --check`. The resulting decision never grants deployment approval. A new student-facing route still requires a server-verified authorization and release policy; B4 stays disabled.
