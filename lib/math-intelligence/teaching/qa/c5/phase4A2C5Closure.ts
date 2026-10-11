import type {
  Phase4A2QaRun,
  MathIntelligenceQaExportLike,
  QaSampleItem,
} from "../types";
import { runPhase4A2QaFromExport } from "../runPhase4A2QaFromExport";

export const PHASE4A2C5_FIXED_SEED = "phase-2i-v1";
export const PHASE4A2C5_HOLDOUT_SEED = "phase-4a2c5-holdout-v1";

export const PHASE4A2C5_FIXED_EXPECTED = {
  total: 240,
  ready: 179,
  partial: 38,
  needsReview: 23,
  strictlyReadyFor4C: 179,
  blockedFrom4C: 61,
} as const;

export type Phase4A2C5BaselineSnapshot = {
  schema_version: "4A-2C5-BASELINE.1";
  captured_at: string;
  source_run_id: string | null;
  source_seed: string | null;
  question_ids: string[];
  summary: {
    total: number;
    ready: number;
    partial: number;
    needs_review: number;
    strictly_ready_for_4c: number;
    blocked_from_4c: number;
  };
  exact_fixed_regression_match: boolean;
  safety_invariants_passed: boolean;
};

export type Phase4A2C5InvariantResult = {
  code: string;
  label: string;
  passed: boolean;
  count: number;
  question_codes: string[];
};

export type Phase4A2C5TargetedCaseResult = {
  id: string;
  label: string;
  passed: boolean;
  expected: {
    domain?: string;
    structure?: string;
    readyFor4C?: boolean;
    answerValidation?: string;
    requiredReasoningIncludes?: string[];
  };
  actual: {
    domain: string;
    structure: string;
    readyFor4C: boolean;
    answerValidation: string;
    requiredReasoning: string[];
    status: string;
    blockers: string[];
  };
};

export type Phase4A2C5ClosureReport = {
  schema_version: "4A-2C5-CLOSURE.1";
  generated_at: string;
  cohort: {
    kind: "fixed" | "holdout" | "other";
    source_run_id: string | null;
    source_seed: string | null;
    total: number;
    by_level: Record<string, number>;
    balanced_40_per_level: boolean;
    performance: {
      ready: number;
      partial: number;
      needs_review: number;
      strictly_ready_for_4c: number;
      blocked_from_4c: number;
      generic_fallback_questions: number;
      low_confidence_questions: number;
      unresolved_questions: number;
      blocking_conflict_questions: number;
    };
  };
  fixed_cohort_regression: {
    expected: typeof PHASE4A2C5_FIXED_EXPECTED;
    actual: {
      total: number;
      ready: number;
      partial: number;
      needsReview: number;
      strictlyReadyFor4C: number;
      blockedFrom4C: number;
    } | null;
    exact_match: boolean | null;
    baseline_snapshot_available: boolean;
  };
  holdout: {
    expected_seed: typeof PHASE4A2C5_HOLDOUT_SEED;
    baseline_question_count: number | null;
    overlap_count: number | null;
    overlap_question_ids: string[];
    exclusion_verified: boolean | null;
  };
  safety: {
    passed: boolean;
    invariants: Phase4A2C5InvariantResult[];
  };
  targeted_regression: {
    passed: boolean;
    passed_count: number;
    total: number;
    cases: Phase4A2C5TargetedCaseResult[];
  };
  remaining_blocked: {
    issue_counts: Record<string, number>;
    gate_diagnostic_counts: Record<string, number>;
    blocked_question_codes: string[];
  };
  probable_curriculum_mapping_issues: Array<{
    question_id: string | null;
    question_code: string | null;
    curriculum_skill: string | null;
    curriculum_domain: string;
    prompt_domain_signal: string | null;
    existing_mi_domain: string | null;
    reason: string;
  }>;
  closure: {
    decision: "pass" | "fail" | "pending_holdout" | "pending_fixed_baseline";
    reasons: string[];
  };
};

function fixtureSkill(
  id: string,
  name: string,
): Record<string, unknown> {
  return {
    skill_id: id,
    skill_code: id,
    skill_name: name,
    name,
    is_primary_skill: true,
    weight: 1,
    mapping_version: 1,
    review_status: "approved",
  };
}

function fixtureItem(args: {
  id: string;
  code: string;
  level: number;
  topic: string;
  skill: string;
  prompt: string;
  answer: string;
}): QaSampleItem {
  return {
    question_id: args.id,
    question_code: args.code,
    primary_level: args.level,
    topic_id: `fixture-topic-${args.id}`,
    topic_title: args.topic,
    sample_stratum: "c5_targeted_regression",
    skill_mappings: [fixtureSkill(`fixture-skill-${args.id}`, args.skill)],
    question: {
      id: args.id,
      code: args.code,
      subject: "math",
      primary_level: args.level,
      topic_id: `fixture-topic-${args.id}`,
      topic_title: args.topic,
      question_type: "open_ended",
      instruction: "Enter the answer.",
      prompt: args.prompt,
      content: {},
      answer_data: {
        answer: args.answer,
        display_answer: args.answer,
        acceptable_answers: [args.answer],
      },
      skill: args.skill,
      skill_tags: [],
      skill_mappings: [fixtureSkill(`fixture-skill-${args.id}`, args.skill)],
      difficulty: 3,
      marks: 1,
      status: "active",
      assets: [],
    },
  };
}

const TARGETED_FIXTURES: Array<{
  id: string;
  label: string;
  item: ReturnType<typeof fixtureItem>;
  expected: Phase4A2C5TargetedCaseResult["expected"];
}> = [
  {
    id: "fraction_addition",
    label: "Fraction addition",
    item: fixtureItem({
      id: "c5-frac-add",
      code: "C5-FRAC-ADD",
      level: 3,
      topic: "Fractions",
      skill: "Add and subtract fractions",
      prompt: "Calculate 1/4 + 2/4. Give the answer in simplest form.",
      answer: "3/4",
    }),
    expected: {
      domain: "fractions",
      structure: "fraction_addition",
      readyFor4C: true,
      answerValidation: "matched",
      requiredReasoningIncludes: ["fraction_addition"],
    },
  },
  {
    id: "fraction_equivalence",
    label: "Fraction equivalence",
    item: fixtureItem({
      id: "c5-frac-equiv",
      code: "C5-FRAC-EQUIV",
      level: 3,
      topic: "Fractions",
      skill: "Recognise equivalent fractions",
      prompt: "Are 3/6 and 1/2 equivalent fractions?",
      answer: "Yes",
    }),
    expected: {
      domain: "fractions",
      structure: "fraction_equivalence",
      readyFor4C: true,
      requiredReasoningIncludes: ["fraction_equivalence"],
    },
  },
  {
    id: "fraction_multiplication",
    label: "Fraction multiplication",
    item: fixtureItem({
      id: "c5-frac-mult",
      code: "C5-FRAC-MULT",
      level: 5,
      topic: "Fractions",
      skill: "Solve fraction problems",
      prompt: "Calculate 2/3 × 3/5. Give the answer in simplest form.",
      answer: "2/5",
    }),
    expected: {
      domain: "fractions",
      structure: "fraction_multiplication",
      readyFor4C: true,
      answerValidation: "matched",
      requiredReasoningIncludes: ["fraction_multiplication"],
    },
  },
  {
    id: "fraction_division",
    label: "Fraction division",
    item: fixtureItem({
      id: "c5-frac-div",
      code: "C5-FRAC-DIV",
      level: 6,
      topic: "Fractions",
      skill: "Solve fraction problems",
      prompt: "Calculate 3/4 ÷ 1/2. Give the answer as a fraction.",
      answer: "3/2",
    }),
    expected: {
      domain: "fractions",
      structure: "fraction_division",
      readyFor4C: true,
      answerValidation: "matched",
      requiredReasoningIncludes: ["fraction_division"],
    },
  },
  {
    id: "cross_domain_fraction_time",
    label: "Fraction used inside a Time problem",
    item: fixtureItem({
      id: "c5-time-frac",
      code: "C5-TIME-FRAC",
      level: 4,
      topic: "Measurement",
      skill: "Read and interpret time",
      prompt: "Ryan took 1/3 of a day to finish a task. His sister took 3/4 of Ryan's time. How much time did his sister take? Take 1 day = 24 hours.",
      answer: "6 h",
    }),
    expected: {
      domain: "time",
      structure: "time_interval",
      readyFor4C: true,
      requiredReasoningIncludes: ["fraction_of_quantity", "fraction_multiplication"],
    },
  },
  {
    id: "symbol_mapping",
    label: "Symbol / code mapping",
    item: fixtureItem({
      id: "c5-symbol-map",
      code: "C5-SYMBOL-MAP",
      level: 1,
      topic: "Problem Solving",
      skill: "Use logical deduction and constraints",
      prompt: "If A = 2, C = 6, D = 8 and F = 12, which number code spells BEADED?",
      answer: "4, 10, 2, 8, 10, 8",
    }),
    expected: {
      domain: "logic",
      structure: "symbol_mapping",
      readyFor4C: true,
      requiredReasoningIncludes: ["symbol_mapping"],
    },
  },
  {
    id: "unitary_scaling",
    label: "True unitary / same-rate scaling",
    item: fixtureItem({
      id: "c5-unitary",
      code: "C5-UNITARY",
      level: 5,
      topic: "Whole Numbers",
      skill: "Perform and apply whole-number operations",
      prompt: "Mr Tan packed 384 oranges equally into 16 boxes. How many boxes would be needed to pack 1,296 oranges at the same rate?",
      answer: "54 boxes",
    }),
    expected: {
      structure: "unitary",
      readyFor4C: true,
      answerValidation: "matched",
      requiredReasoningIncludes: ["rate_scaling"],
    },
  },
  {
    id: "transfer_difference",
    label: "Transfer changes the difference",
    item: fixtureItem({
      id: "c5-transfer-diff",
      code: "C5-TRANSFER-DIFF",
      level: 5,
      topic: "Whole Numbers",
      skill: "Solve multi-step whole-number reasoning problems",
      prompt: "Kim and Tian shared some money. After Kim gave $18 to Tian, Tian had $8 more than Kim. How much more money did Kim have than Tian at first?",
      answer: "$28",
    }),
    expected: {
      structure: "transfer_difference",
      readyFor4C: true,
      answerValidation: "matched",
      requiredReasoningIncludes: ["transfer_reasoning"],
    },
  },
  {
    id: "age_relationship",
    label: "Age relationship",
    item: fixtureItem({
      id: "c5-age",
      code: "C5-AGE",
      level: 4,
      topic: "Problem Solving",
      skill: "Solve age relationship problems",
      prompt: "Lee Hai will be 43 years old in 8 years. How old was he 9 years ago?",
      answer: "26",
    }),
    expected: {
      domain: "whole_numbers",
      structure: "age_relationship",
      readyFor4C: true,
      requiredReasoningIncludes: ["age_reasoning"],
    },
  },
  {
    id: "repeating_cycle",
    label: "Repeating-cycle common multiple",
    item: fixtureItem({
      id: "c5-cycle",
      code: "C5-CYCLE",
      level: 4,
      topic: "Whole Numbers",
      skill: "Reason about factors and multiples",
      prompt: "Two fountains spray water at the same time. One sprays every 6 seconds and the other every 12 seconds. In 1 minute, how many times will they spray together after the start?",
      answer: "5",
    }),
    expected: {
      domain: "whole_numbers",
      structure: "common_multiple_cycle",
      readyFor4C: true,
      requiredReasoningIncludes: ["common_multiple"],
    },
  },
  {
    id: "multi_step_percentage_safe_block",
    label: "Multi-step percentage remains safely blocked until specifically understood",
    item: fixtureItem({
      id: "c5-percentage-multistep",
      code: "C5-PCT-MULTISTEP",
      level: 6,
      topic: "Percentage",
      skill: "Solve percentage word problems",
      prompt: "At a funfair, there were 50% more children than women and 20% fewer men than children. Later, 50% of the women left and the number of children decreased by 10%. There were then 60 more children than men. How many people were there at first?",
      answer: "1,480",
    }),
    expected: {
      domain: "percentage",
      structure: "direct_calculation",
      readyFor4C: false,
    },
  },
];

function evaluateTargetedExpectation(
  actual: Phase4A2TargetActual,
  expected: Phase4A2C5TargetedCaseResult["expected"],
): boolean {
  if (expected.domain !== undefined && actual.domain !== expected.domain) return false;
  if (expected.structure !== undefined && actual.structure !== expected.structure) return false;
  if (expected.readyFor4C !== undefined && actual.readyFor4C !== expected.readyFor4C) return false;
  if (
    expected.answerValidation !== undefined &&
    actual.answerValidation !== expected.answerValidation
  ) {
    return false;
  }

  if (
    expected.requiredReasoningIncludes &&
    !expected.requiredReasoningIncludes.every((reason) =>
      actual.requiredReasoning.includes(reason),
    )
  ) {
    return false;
  }

  return true;
}

type Phase4A2TargetActual = Phase4A2C5TargetedCaseResult["actual"];

export function runPhase4A2C5TargetedRegression(): Phase4A2C5ClosureReport["targeted_regression"] {
  const qaExport: MathIntelligenceQaExportLike = {
    run_id: "phase-4a2c5-targeted",
    sample: {
      seed: "phase-4a2c5-targeted-v1",
      actual_size: TARGETED_FIXTURES.length,
      items: TARGETED_FIXTURES.map((fixture) => fixture.item),
    },
    results: [],
  };

  const run = runPhase4A2QaFromExport(qaExport);
  const byCode = new Map(
    run.items.map((item) => [item.questionCode ?? "", item]),
  );

  const cases: Phase4A2C5TargetedCaseResult[] = TARGETED_FIXTURES.map((fixture) => {
    const item = byCode.get(fixture.item.question_code ?? "");

    const actual: Phase4A2TargetActual = item
      ? {
          domain: item.understanding.domain,
          structure: item.understanding.problemStructure,
          readyFor4C: item.understanding.gateDiagnostics.readyFor4C,
          answerValidation: item.understanding.answerValidation.status,
          requiredReasoning: [...item.understanding.requiredReasoning],
          status: item.understanding.status,
          blockers: item.understanding.gateDiagnostics.blockers.map(
            (blocker) => blocker.code,
          ),
        }
      : {
          domain: "missing",
          structure: "missing",
          readyFor4C: false,
          answerValidation: "missing",
          requiredReasoning: [],
          status: "missing",
          blockers: ["TARGETED_CASE_NOT_PROCESSED"],
        };

    return {
      id: fixture.id,
      label: fixture.label,
      expected: fixture.expected,
      actual,
      passed: evaluateTargetedExpectation(actual, fixture.expected),
    };
  });

  const passedCount = cases.filter((item) => item.passed).length;

  return {
    passed: passedCount === cases.length,
    passed_count: passedCount,
    total: cases.length,
    cases,
  };
}

function itemCode(item: Phase4A2QaRun["items"][number]): string {
  return item.questionCode ?? item.questionId ?? "unknown";
}

function safetyInvariants(run: Phase4A2QaRun): Phase4A2C5InvariantResult[] {
  const ready = run.items.filter(
    (item) => item.understanding.gateDiagnostics.readyFor4C,
  );

  const genericReady = ready.filter((item) => {
    const resolution = item.understanding.resolution;
    return (
      resolution.domain === "generic_fallback" ||
      resolution.structure === "generic_fallback" ||
      resolution.reasoning === "generic_fallback"
    );
  });

  const unresolvedReady = ready.filter((item) => {
    const resolution = item.understanding.resolution;
    return (
      item.understanding.problemStructure === "unknown" ||
      item.understanding.requiredReasoning.includes("unknown") ||
      resolution.domain === "unresolved" ||
      resolution.structure === "unresolved" ||
      resolution.reasoning === "unresolved"
    );
  });

  const mismatchReady = ready.filter(
    (item) => item.understanding.answerValidation.status === "mismatched",
  );

  const conflictReady = ready.filter((item) =>
    item.understanding.gateDiagnostics.blockers.some(
      (blocker) => blocker.code === "GATE_BLOCKING_CONFLICT",
    ) ||
    item.understanding.issues.some(
      (issue) =>
        issue.severity === "blocking" &&
        issue.code === "UNDERSTANDING_CONFLICT",
    ),
  );

  const missingIds = run.items.filter((item) => !item.questionId);

  const readyWithBlockers = ready.filter(
    (item) => item.understanding.gateDiagnostics.blockers.length > 0,
  );

  return [
    {
      code: "NO_GENERIC_FALLBACK_ALLOWED_THROUGH",
      label: "No generic fallback is allowed through to Phase 4C",
      passed: genericReady.length === 0,
      count: genericReady.length,
      question_codes: genericReady.map(itemCode),
    },
    {
      code: "NO_UNRESOLVED_ALLOWED_THROUGH",
      label: "No unresolved understanding is allowed through to Phase 4C",
      passed: unresolvedReady.length === 0,
      count: unresolvedReady.length,
      question_codes: unresolvedReady.map(itemCode),
    },
    {
      code: "NO_ANSWER_MISMATCH_ALLOWED_THROUGH",
      label: "No answer mismatch is allowed through to Phase 4C",
      passed: mismatchReady.length === 0,
      count: mismatchReady.length,
      question_codes: mismatchReady.map(itemCode),
    },
    {
      code: "NO_BLOCKING_CONFLICT_ALLOWED_THROUGH",
      label: "No blocking conflict is allowed through to Phase 4C",
      passed: conflictReady.length === 0,
      count: conflictReady.length,
      question_codes: conflictReady.map(itemCode),
    },
    {
      code: "NO_MISSING_QUESTION_IDS",
      label: "Every processed question has a canonical question ID",
      passed: missingIds.length === 0,
      count: missingIds.length,
      question_codes: missingIds.map(itemCode),
    },
    {
      code: "NO_READY_ITEM_WITH_GATE_BLOCKERS",
      label: "No Ready item carries a Phase 4C gate blocker",
      passed: readyWithBlockers.length === 0,
      count: readyWithBlockers.length,
      question_codes: readyWithBlockers.map(itemCode),
    },
  ];
}

function promptDomainSignal(
  item: Phase4A2QaRun["items"][number],
): { domain: string | null; confidence: number | null } {
  const evidence = item.understanding.evidence.find(
    (entry) =>
      entry.source === "rules" &&
      entry.code.startsWith("PROMPT_DOMAIN_") &&
      (entry.confidence ?? 0) >= 0.9 &&
      !entry.code.endsWith("_UNKNOWN"),
  );

  if (!evidence) return { domain: null, confidence: null };

  const suffix = evidence.code.slice("PROMPT_DOMAIN_".length);
  const map: Record<string, string> = {
    WHOLE_NUMBERS: "whole_numbers",
    WHOLE_NUMBERS_CONTEXT: "whole_numbers",
    AGE_RELATIONSHIP: "whole_numbers",
    SYMBOL_MAPPING: "logic",
    FRACTIONS: "fractions",
    PERCENTAGE: "percentage",
    RATIO: "ratio",
    TIME: "time",
    MONEY: "money",
    MEASUREMENT: "measurement",
    GEOMETRY: "geometry",
    DECIMALS: "decimals",
    DATA: "data",
    SPEED: "speed_rate",
    SPEED_RATE: "speed_rate",
    AVERAGE: "average",
    ALGEBRA: "algebra",
    PATTERNS: "patterns",
    LOGIC: "logic",
  };

  return {
    domain: map[suffix] ?? suffix.toLowerCase(),
    confidence: evidence.confidence ?? null,
  };
}

function probableCurriculumMappingIssues(
  run: Phase4A2QaRun,
): Phase4A2C5ClosureReport["probable_curriculum_mapping_issues"] {
  return run.items.flatMap((item) => {
    const u = item.understanding;
    const hasBlockingConflict =
      u.gateDiagnostics.blockers.some(
        (blocker) => blocker.code === "GATE_BLOCKING_CONFLICT",
      ) ||
      u.issues.some(
        (issue) =>
          issue.severity === "blocking" &&
          issue.code === "UNDERSTANDING_CONFLICT",
      );

    if (!hasBlockingConflict || u.curriculumContext.selectedSource !== "primary_skill") {
      return [];
    }

    const prompt = promptDomainSignal(item);
    if (!prompt.domain || prompt.domain === u.curriculumContext.inferredDomain) {
      return [];
    }

    return [
      {
        question_id: item.questionId,
        question_code: item.questionCode,
        curriculum_skill: u.curriculumContext.primarySkill,
        curriculum_domain: u.curriculumContext.inferredDomain,
        prompt_domain_signal: prompt.domain,
        existing_mi_domain: item.existingProposal.domain,
        reason:
          "Primary curriculum mapping conflicts with a high-confidence prompt-domain signal. Treat as a source-data review candidate; C5 does not rewrite mappings.",
      },
    ];
  });
}

function exactFixedMatch(run: Phase4A2QaRun): boolean {
  return (
    run.totalSampleItems === PHASE4A2C5_FIXED_EXPECTED.total &&
    run.summary.status.ready === PHASE4A2C5_FIXED_EXPECTED.ready &&
    run.summary.status.partial === PHASE4A2C5_FIXED_EXPECTED.partial &&
    run.summary.status.needs_review === PHASE4A2C5_FIXED_EXPECTED.needsReview &&
    run.summary.strictlyReadyFor4C === PHASE4A2C5_FIXED_EXPECTED.strictlyReadyFor4C &&
    run.summary.blockedFrom4C === PHASE4A2C5_FIXED_EXPECTED.blockedFrom4C
  );
}

function balanced40PerLevel(run: Phase4A2QaRun): boolean {
  return [1, 2, 3, 4, 5, 6].every(
    (level) => run.summary.byLevel[`P${level}`] === 40,
  );
}

export function toPhase4A2C5BaselineSnapshot(
  run: Phase4A2QaRun,
): Phase4A2C5BaselineSnapshot {
  const invariants = safetyInvariants(run);
  return {
    schema_version: "4A-2C5-BASELINE.1",
    captured_at: new Date().toISOString(),
    source_run_id: run.sourceRunId,
    source_seed: run.sourceSeed,
    question_ids: run.items
      .map((item) => item.questionId)
      .filter((value): value is string => Boolean(value)),
    summary: {
      total: run.totalSampleItems,
      ready: run.summary.status.ready,
      partial: run.summary.status.partial,
      needs_review: run.summary.status.needs_review,
      strictly_ready_for_4c: run.summary.strictlyReadyFor4C,
      blocked_from_4c: run.summary.blockedFrom4C,
    },
    exact_fixed_regression_match: exactFixedMatch(run),
    safety_invariants_passed: invariants.every((item) => item.passed),
  };
}

export function evaluatePhase4A2C5Closure(
  run: Phase4A2QaRun,
  baselineSnapshot: Phase4A2C5BaselineSnapshot | null,
): Phase4A2C5ClosureReport {
  const cohortKind: Phase4A2C5ClosureReport["cohort"]["kind"] =
    run.sourceSeed === PHASE4A2C5_FIXED_SEED
      ? "fixed"
      : run.sourceSeed === PHASE4A2C5_HOLDOUT_SEED
        ? "holdout"
        : "other";

  const invariants = safetyInvariants(run);
  const safetyPassed = invariants.every((item) => item.passed);
  const targeted = runPhase4A2C5TargetedRegression();

  const currentIds = new Set(
    run.items
      .map((item) => item.questionId)
      .filter((value): value is string => Boolean(value)),
  );

  const overlap = baselineSnapshot
    ? baselineSnapshot.question_ids.filter((id) => currentIds.has(id))
    : [];

  const fixedActual = cohortKind === "fixed"
    ? {
        total: run.totalSampleItems,
        ready: run.summary.status.ready,
        partial: run.summary.status.partial,
        needsReview: run.summary.status.needs_review,
        strictlyReadyFor4C: run.summary.strictlyReadyFor4C,
        blockedFrom4C: run.summary.blockedFrom4C,
      }
    : baselineSnapshot
      ? {
          total: baselineSnapshot.summary.total,
          ready: baselineSnapshot.summary.ready,
          partial: baselineSnapshot.summary.partial,
          needsReview: baselineSnapshot.summary.needs_review,
          strictlyReadyFor4C: baselineSnapshot.summary.strictly_ready_for_4c,
          blockedFrom4C: baselineSnapshot.summary.blocked_from_4c,
        }
      : null;

  const fixedMatch = cohortKind === "fixed"
    ? exactFixedMatch(run)
    : baselineSnapshot
      ? baselineSnapshot.exact_fixed_regression_match
      : null;

  const holdoutExclusionVerified = cohortKind === "holdout"
    ? baselineSnapshot
      ? overlap.length === 0
      : null
    : null;

  const reasons: string[] = [];
  let decision: Phase4A2C5ClosureReport["closure"]["decision"];

  if (!safetyPassed) {
    decision = "fail";
    reasons.push("One or more Phase 4C safety invariants failed.");
  } else if (!targeted.passed) {
    decision = "fail";
    reasons.push("The targeted C5 regression suite did not pass in full.");
  } else if (cohortKind === "fixed") {
    if (!exactFixedMatch(run)) {
      decision = "fail";
      reasons.push("The fixed phase-2i-v1 cohort no longer matches the locked 179 / 38 / 23 C4 baseline.");
    } else if (!balanced40PerLevel(run)) {
      decision = "fail";
      reasons.push("The fixed cohort is no longer balanced at 40 questions per P1-P6 level.");
    } else {
      decision = "pending_holdout";
      reasons.push("Fixed-cohort regression passed. Run the excluded 240-question holdout cohort to complete C5 closure.");
    }
  } else if (cohortKind === "holdout") {
    if (!baselineSnapshot) {
      decision = "pending_fixed_baseline";
      reasons.push("Run C5 once on the fixed phase-2i-v1 cohort first so the holdout exclusion can be verified.");
    } else if (!baselineSnapshot.exact_fixed_regression_match || !baselineSnapshot.safety_invariants_passed) {
      decision = "fail";
      reasons.push("The stored fixed-cohort baseline did not satisfy C5 regression requirements.");
    } else if (overlap.length > 0) {
      decision = "fail";
      reasons.push(`Holdout overlaps the fixed cohort by ${overlap.length} question(s).`);
    } else if (run.totalSampleItems !== 240 || !balanced40PerLevel(run)) {
      decision = "fail";
      reasons.push("The holdout must contain exactly 240 questions with 40 questions from each P1-P6 level.");
    } else {
      decision = "pass";
      reasons.push("Fixed cohort, excluded holdout cohort, targeted suite, and all Phase 4C safety invariants passed.");
    }
  } else {
    decision = "fail";
    reasons.push("C5 closure must be run on either the fixed phase-2i-v1 cohort or the phase-4a2c5-holdout-v1 cohort.");
  }

  return {
    schema_version: "4A-2C5-CLOSURE.1",
    generated_at: new Date().toISOString(),
    cohort: {
      kind: cohortKind,
      source_run_id: run.sourceRunId,
      source_seed: run.sourceSeed,
      total: run.totalSampleItems,
      by_level: { ...run.summary.byLevel },
      balanced_40_per_level: balanced40PerLevel(run),
      performance: {
        ready: run.summary.status.ready,
        partial: run.summary.status.partial,
        needs_review: run.summary.status.needs_review,
        strictly_ready_for_4c: run.summary.strictlyReadyFor4C,
        blocked_from_4c: run.summary.blockedFrom4C,
        generic_fallback_questions: run.summary.genericFallbackQuestions,
        low_confidence_questions: run.summary.lowConfidenceQuestions,
        unresolved_questions: run.summary.unresolvedQuestions,
        blocking_conflict_questions: run.summary.blockingConflictQuestions,
      },
    },
    fixed_cohort_regression: {
      expected: PHASE4A2C5_FIXED_EXPECTED,
      actual: fixedActual,
      exact_match: fixedMatch,
      baseline_snapshot_available: Boolean(baselineSnapshot),
    },
    holdout: {
      expected_seed: PHASE4A2C5_HOLDOUT_SEED,
      baseline_question_count: baselineSnapshot
        ? baselineSnapshot.question_ids.length
        : null,
      overlap_count: cohortKind === "holdout" && baselineSnapshot
        ? overlap.length
        : null,
      overlap_question_ids: cohortKind === "holdout" ? overlap : [],
      exclusion_verified: holdoutExclusionVerified,
    },
    safety: {
      passed: safetyPassed,
      invariants,
    },
    targeted_regression: targeted,
    remaining_blocked: {
      issue_counts: { ...run.summary.issueCounts },
      gate_diagnostic_counts: { ...run.summary.gateDiagnosticCounts },
      blocked_question_codes: run.items
        .filter((item) => !item.understanding.gateDiagnostics.readyFor4C)
        .map(itemCode),
    },
    probable_curriculum_mapping_issues: probableCurriculumMappingIssues(run),
    closure: {
      decision,
      reasons,
    },
  };
}
