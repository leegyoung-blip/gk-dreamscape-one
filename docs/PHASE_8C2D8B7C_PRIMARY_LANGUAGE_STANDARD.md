# DREAMSCAPE ONE — 8B-7C Primary Mathematics Teaching Standard

**Status: mandatory design requirement for future NOVA Maths explanations.**
**This phase provides offline reference examples and a basic authoring check, NOT a live student-output filter.**

> NOVA must teach like an experienced Singapore Primary Mathematics teacher: **visual, systematic, multistep when the question demands it, and accessible to Primary school children**. Every explanation must use language suitable for the child's level.

## Non-negotiable authoring rules

1. **Talk to a Primary pupil.** Use short, direct sentences and common words. Say *gap* instead of *interval count*, *same-sized part* instead of *ratio state*, and *find* instead of *compute*. Mathematical vocabulary is allowed when taught and explained in the child's lesson; don't ban a genuine syllabus term in all situations.
2. **Say why, not just what.** Explain why the learner is counting gaps, drawing equal parts or comparing quantities. Every calculation needs a meaning connected to the question.
3. **Make the model visible.** A `visualPlan` string alone is not a bar model. Use a labelled number line for marker-gap questions and correctly aligned bars for comparison or changing-ratio problems. Diagrams must have a matching, mathematically accurate layout.
4. **Bar models before symbolic equations** for suitable P5/P6 word problems. Introduce `u` or `v` only when that helps understanding; explain precisely what each letter stands for before using it. E.g. *“Let u stand for one equal part before the increase.”*
5. **Teach one idea per step.** Include useful intermediate reasoning, not repetitive or needless stages. The Q1 reviewer found a fourth formal teaching step unnecessary; its one-gap check is now a short optional note.
6. **Choose meaningful questions.** A one-gap warm-up may introduce a concept; it cannot be used as evidence for a challenging multistep teaching method. The revised Q2 is a **proposed** two-leg journey, not a revision of the original review's result.
7. **Respond to likely mistakes kindly and specifically.** Identify *what* can be confused (markers versus gaps, half of Bella versus half of Alan, units before versus after), then show a small counterexample or a labelled diagram.
8. **Check the mathematics, visual and reading level separately.** An automated phrase/length scan catches obvious issues but cannot judge comprehensibility or diagram fidelity. A teacher must still review each new template and actual learner-facing output.
9. **Never invent question details.** Maintain the wording and given quantities; don't add 'objects' or 'metres' when the problem only says 'amount'. Clearly label any proposed replacement question.

## Level-sensitive wording

- **P1–P2:** Very short sentences, concrete actions, familiar everyday objects, pictures; avoid unexplained letters and heavy symbols.
- **P3–P4:** Label number lines and bar models; explain counting and part-whole relationships using common words before symbolic shortcuts.
- **P5–P6:** Model complex relationships using aligned bars; introduce an algebraic shorthand only after defining the symbol and explaining its connection to the bars.

## Examples of improvements

| Avoid in pupil-facing narration | Use instead |
| --- | --- |
| “Compute the interval count using ordinal indices.” | “Count the gaps between the two markers.” |
| “Use a before-ratio unit.” | “Let **u** stand for one equal part **before the increase**.” |
| “Resolve the prerequisite dependencies.” | “First find the value of one equal part.” |
| “Substitute into the algebraic expression.” | “We know one part is 6. Chen has 3 parts, so 3 × 6 = 18.” |
| “The representation is a bar model.” | **Show** an actual bar model with labelled equal parts. |

## Acceptance process for later live generation

1. Validate source question, answer and method eligibility on the authorised server; do not treat client text as trusted.
2. Generate candidate steps with the correct mathematical facts and an appropriate diagram.
3. Run **both** the existing structural/narrow arithmetic checks **and** a language/diagram review gate. The 8B-7C script illustrates offline checks; it is **not connected** to the production AI path.
4. Have a human independently inspect a rendered diagram, the full reasoning and Primary-level language. Automatic word lists do not establish education quality.
5. Until the outstanding release gates pass, leave the three specialist methods inactive; do not publish, auto-approve, overwrite scoring or claim successful real-model evaluation.

**Compatibility note:** The earlier 8B-3 structural contract requires a `check_small_case` stage for spacing. Q1 now has three *visible main teaching steps* plus a short `quickCheck`. A future provider adapter can map `check_small_case` to that concise check while avoiding a redundant fourth displayed step. 8B-7C does not change the existing contract or runtime.
