
import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  defineTeachingMethod,
  type TeachingMethod,
  type TeachingMethodCpaPolicy,
  type TeachingMethodMisconception,
  type TeachingMethodStage,
  type TeachingRepresentationType,
} from "../schema";
import type { Phase4BMethodFamilyId } from "../taxonomy/types";

export type Phase4B3MethodThemeCoverage = {
  methodId: string;
  familyId: Phase4BMethodFamilyId;
  themes: string[];
};

type MethodInput = Omit<TeachingMethod, "schemaVersion" | "governance" | "provenance"> & {
  officialClaimTag?: "curriculum_scope" | "curriculum_learning_experience" | "representation_selection" | "conceptual_understanding";
  officialClaimStatement?: string;
  cpaClaim?: boolean;
  dreamscapeClaim: string;
};

const GOVERNANCE: TeachingMethod["governance"] = {
  deterministicOnly: true,
  questionAgnostic: true,
  answerAgnostic: true,
  runtimeAgnostic: true,
  lunaAllowed: false,
  persistence: "version_controlled_source",
};

function claimsFor(input: MethodInput): TeachingMethod["provenance"] {
  const claims: TeachingMethod["provenance"]["claims"] = [];
  const classifications: TeachingMethod["provenance"]["classifications"] = [];

  if (input.officialClaimTag) {
    classifications.push("official_curriculum");
    claims.push({
      claimId: `${input.methodId.replaceAll(".", "_")}_official`,
      classification: "official_curriculum",
      sourceId: "moe-primary-math-syllabus-2021-updated-oct-2025",
      sourceClaimTag: input.officialClaimTag,
      statement: input.officialClaimStatement ?? "The primary mathematics syllabus supports this curriculum content or representation principle.",
      evidenceNote: "Curriculum-level support only; the exact Dreamscape sequence is not claimed as an MOE-prescribed method.",
    });
  }

  if (input.cpaClaim) {
    classifications.push("common_singapore_pedagogy");
    claims.push({
      claimId: `${input.methodId.replaceAll(".", "_")}_cpa`,
      classification: "common_singapore_pedagogy",
      sourceId: "nie-singapore-primary-math-cpa",
      sourceClaimTag: "cpa_guidance",
      statement: "Concrete, pictorial and abstract representations may be connected purposefully in Singapore primary mathematics teaching.",
      evidenceNote: "NIE teacher-education reference; use as Singapore pedagogy context rather than a claim of mandatory MOE sequencing.",
    });
  }

  classifications.push("dreamscape_method");
  claims.push({
    claimId: `${input.methodId.replaceAll(".", "_")}_dreamscape`,
    classification: "dreamscape_method",
    sourceId: null,
    sourceClaimTag: null,
    statement: input.dreamscapeClaim,
    evidenceNote: "Dreamscape reusable teaching-template design.",
  });

  return {
    classifications: [...new Set(classifications)],
    claims,
  };
}

function makeMethod(input: MethodInput): Readonly<TeachingMethod> {
  const {
    officialClaimTag,
    officialClaimStatement,
    cpaClaim,
    dreamscapeClaim,
    ...method
  } = input;

  return defineTeachingMethod({
    schemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    ...method,
    provenance: claimsFor(input),
    governance: GOVERNANCE,
  });
}

function stage(
  stageId: string,
  role: TeachingMethodStage["role"],
  instructionPattern: string,
  learnerFocus: string,
  representationHints: TeachingRepresentationType[] = [],
  optional = false,
): TeachingMethodStage {
  return { stageId, role, instructionPattern, learnerFocus, representationHints, optional };
}

function misconception(
  misconceptionId: string,
  misconceptionText: string,
  diagnosticSignals: string[],
  correctionApproach: string,
): TeachingMethodMisconception {
  return { misconceptionId, misconception: misconceptionText, diagnosticSignals, correctionApproach };
}

function reps(
  preferred: TeachingRepresentationType[],
  allowed: TeachingRepresentationType[],
  discouraged: TeachingRepresentationType[] = [],
): TeachingMethod["pedagogy"]["representations"] {
  return { preferred, allowed, discouraged };
}

function visual(
  visualUse: TeachingMethod["visualGuidance"]["visualUse"],
  preferredVisualTypes: TeachingRepresentationType[],
  generatedVisualAllowed = true,
): TeachingMethod["visualGuidance"] {
  return {
    visualUse,
    preferredVisualTypes,
    originalDiagramPolicy: "not_required",
    generatedVisualAllowed,
  };
}

const METHODS: Readonly<TeachingMethod>[] = [
  // ---------------------------------------------------------------------------
  // number.place_value
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "number.place_value.place_value_chart",
    familyId: "number.place_value",
    variantId: "place_value_chart",
    title: "Build quantity meaning with a place-value chart",
    summary: "Connects each digit to the quantity represented by its position before composing or decomposing a whole number.",
    status: "active",
    applicability: {
      levels: [1,2,3,4,5,6],
      domains: ["whole_numbers"],
      structures: ["place_value", "number_composition", "number_decomposition"],
      reasoning: ["place_value_reasoning"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret each digit by place and reconstruct the number from its place-value parts.",
      conceptualFocus: ["digit value", "place", "composition", "decomposition", "zero as placeholder"],
      prerequisiteConcepts: ["counting sequence", "digit recognition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("read_quantity", "establish_meaning", "Read the number as a quantity before naming individual digits.", "A number represents one total quantity.", ["manipulatives", "verbal_reasoning"]),
        stage("map_places", "represent", "Place each digit in the correct place-value column and state the value it represents.", "Position determines value.", ["place_value_chart"]),
        stage("recompose", "reason", "Combine the place-value parts and confirm that they reproduce the original quantity.", "Equivalent representations preserve the same value.", ["place_value_chart", "symbolic_working"]),
        stage("check", "check", "Re-read the recomposed number and compare it with the original.", "The composed value must match exactly.", ["symbolic_working"]),
      ],
      representations: reps(["place_value_chart"], ["manipulatives", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write each non-zero place-value contribution explicitly when useful.", "Use zeros as placeholders rather than omitting a place."],
      generalisationPattern: "The value of a digit depends on its position; moving one place left multiplies its place value by 10.",
      checkPattern: "Add the place-value parts and confirm the original number.",
    },
    misconceptions: [
      misconception("digit_is_value", "Treating the digit itself as its value regardless of position.", ["Reads 5 tens as 5", "Ignores place labels"], "Reconnect the digit to the place-value column and quantity."),
      misconception("zero_ignored", "Removing a zero that is acting as a placeholder.", ["Collapses 405 to 45"], "Use the chart to keep every place visible."),
    ],
    visualGuidance: visual("usually", ["place_value_chart", "manipulatives"]),
    officialClaimTag: "representation_selection",
    officialClaimStatement: "The syllabus supports selecting mathematical representations appropriate to the concept and learner.",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape encodes the place-value-chart sequence and recomposition check.",
  }),
  makeMethod({
    methodId: "number.place_value.expanded_form",
    familyId: "number.place_value",
    variantId: "expanded_form",
    title: "Express a number in expanded form",
    summary: "Decomposes a number into the sum of its place-value contributions and recomposes it without changing value.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["whole_numbers"],
      structures: ["place_value", "number_decomposition", "number_composition"],
      reasoning: ["place_value_reasoning", "addition"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Write the number as a sum of place-value parts and explain why the sum is equivalent to the original number.",
      conceptualFocus: ["expanded form", "equivalence", "additive composition"],
      prerequisiteConcepts: ["place-value columns", "addition"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("identify_nonzero_places", "notice_relationship", "Identify each non-zero digit and the place it occupies.", "Each place contributes a specific amount.", ["place_value_chart"]),
        stage("expand", "calculate", "Write each digit as its place-value contribution and join the parts by addition.", "Expanded form preserves the total.", ["symbolic_working"]),
        stage("recompose", "check", "Add the expanded parts to recover the original number.", "The two forms are equivalent.", ["symbolic_working"]),
      ],
      representations: reps(["symbolic_working"], ["place_value_chart", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Use one term per non-zero place.", "Keep place-value units explicit when first introducing the method."],
      generalisationPattern: "Any whole number can be represented as the sum of its place-value contributions.",
      checkPattern: "Recompose the expanded terms.",
    },
    misconceptions: [
      misconception("expand_digits_only", "Writing the digits as separate numbers without their place values.", ["Writes 4 + 2 + 7 for 427"], "Return each digit to its place-value contribution."),
    ],
    visualGuidance: visual("optional", ["place_value_chart"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses expanded form as a reusable equivalence check, not merely a notation exercise.",
  }),
  makeMethod({
    methodId: "number.place_value.compose_decompose",
    familyId: "number.place_value",
    variantId: "compose_decompose",
    title: "Compose and decompose flexibly",
    summary: "Builds and breaks apart numbers using place-value parts, including non-standard decompositions when useful.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["whole_numbers"],
      structures: ["number_composition", "number_decomposition", "place_value"],
      reasoning: ["place_value_reasoning", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Recognise that the same number can be composed or decomposed in more than one valid way.",
      conceptualFocus: ["equivalent decomposition", "renaming", "flexible number sense"],
      prerequisiteConcepts: ["standard place-value decomposition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("start_standard", "represent", "Begin with the standard place-value decomposition.", "Anchor the quantity in familiar place values.", ["place_value_chart"]),
        stage("rename_one_part", "reason", "Rename one place-value unit into smaller equivalent units without changing the total.", "Renaming preserves quantity.", ["manipulatives", "place_value_chart"]),
        stage("use_decomposition", "calculate", "Choose a decomposition that makes the required comparison or calculation easier.", "A useful decomposition reveals structure.", ["symbolic_working", "mental_strategy"]),
        stage("verify_total", "check", "Recombine all parts to verify the unchanged total.", "Equivalent parts must sum to the original number.", ["symbolic_working"]),
      ],
      representations: reps(["place_value_chart"], ["manipulatives", "symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Use equality signs only between genuinely equal forms."],
      generalisationPattern: "A quantity can be renamed into equivalent place-value parts without changing its total value.",
      checkPattern: "Recombine the chosen parts.",
    },
    misconceptions: [
      misconception("rename_changes_total", "Changing the decomposition but accidentally changing the total.", ["Trades 1 ten for 9 ones"], "Model the trade as exactly 10 smaller units."),
    ],
    visualGuidance: visual("usually", ["place_value_chart", "manipulatives"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape treats flexible decomposition as a bridge from place-value meaning to later mental and written calculation.",
  }),
  makeMethod({
    methodId: "number.place_value.compare_order",
    familyId: "number.place_value",
    variantId: "compare_order",
    title: "Compare and order by the highest differing place",
    summary: "Compares whole numbers place by place from the greatest place value and orders them using the first meaningful difference.",
    status: "active",
    applicability: {
      levels: [1,2,3,4,5,6],
      domains: ["whole_numbers"],
      structures: ["place_value", "comparison_difference"],
      reasoning: ["place_value_reasoning", "comparison", "ordering"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Compare numbers by aligning place values and locating the highest place where the values differ.",
      conceptualFocus: ["magnitude", "place alignment", "ordering"],
      prerequisiteConcepts: ["place value", "greater than and less than language"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("align_places", "represent", "Align the numbers by place value.", "Like places must be compared with like places.", ["place_value_chart"]),
        stage("scan_high_to_low", "reason", "Compare from the greatest place value toward the ones place until a difference is found.", "The highest differing place determines the larger number.", ["place_value_chart", "verbal_reasoning"]),
        stage("record_relation", "calculate", "Record the comparison or place the numbers in the required order.", "The symbol or order must match the magnitude reasoning.", ["symbolic_working"]),
      ],
      representations: reps(["place_value_chart"], ["symbolic_working", "number_line", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Align digits by place before comparing.", "State the deciding place when explanation is required."],
      generalisationPattern: "When two whole numbers differ, the highest place with unequal values determines their order.",
      checkPattern: "Estimate position on a number line or compare the deciding place again.",
    },
    misconceptions: [
      misconception("compare_last_digit", "Comparing only the final digit.", ["Says 398 > 421 because 8 > 1"], "Align all places and start from the greatest place."),
      misconception("digit_count_only", "Assuming digit count alone settles all comparisons.", ["Misapplies digit-count rule to equal-length numbers"], "After length is equal, compare place by place."),
    ],
    visualGuidance: visual("optional", ["place_value_chart", "number_line"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape uses the highest-differing-place rule as the stable comparison sequence.",
  }),

  // ---------------------------------------------------------------------------
  // number.add_sub
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "number.add_sub.number_bonds",
    familyId: "number.add_sub",
    variantId: "number_bonds",
    title: "Use number bonds for part-part-whole facts",
    summary: "Builds addition and subtraction facts by relating two parts to one whole before formal written algorithms.",
    status: "active",
    applicability: {
      levels: [1,2],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "part_whole", "missing_part", "addition_change", "subtraction_change"],
      reasoning: ["addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Relate two parts and one whole so addition and subtraction are understood as inverse relationships.",
      conceptualFocus: ["part-part-whole", "inverse operations", "basic facts"],
      prerequisiteConcepts: ["counting", "quantity comparison"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("make_parts", "represent", "Represent the whole as two visible parts.", "The same whole can be partitioned into parts.", ["manipulatives", "number_bond"]),
        stage("state_family", "notice_relationship", "State the related addition and subtraction facts.", "Addition combines parts; subtraction finds a missing part or difference from the whole.", ["number_bond", "symbolic_working"]),
        stage("solve_target", "calculate", "Use the known bond to solve the required fact.", "Known relationships reduce counting from one.", ["mental_strategy", "symbolic_working"]),
        stage("inverse_check", "check", "Check the result using the inverse fact.", "Inverse operations verify each other.", ["symbolic_working"]),
      ],
      representations: reps(["number_bond"], ["manipulatives", "symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Keep the whole and two parts visually distinct at first."],
      generalisationPattern: "If two parts make a whole, each part can be found by subtracting the other part from the whole.",
      checkPattern: "Use the inverse fact family.",
    },
    misconceptions: [
      misconception("whole_as_part", "Misidentifying the whole as one of the parts.", ["Bond total smaller than a part"], "Rebuild the physical or pictorial set and identify the total first."),
    ],
    visualGuidance: visual("usually", ["number_bond", "manipulatives"]),
    officialClaimTag: "curriculum_learning_experience",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape sequences number bonds from visible parts to inverse fact families.",
  }),
  makeMethod({
    methodId: "number.add_sub.bridge_ten",
    familyId: "number.add_sub",
    variantId: "bridge_ten",
    title: "Bridge through ten using a friendly number",
    summary: "Splits one addend or subtrahend so the calculation crosses a ten boundary through an easier benchmark.",
    status: "active",
    applicability: {
      levels: [1,2,3],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "addition_change", "subtraction_change"],
      reasoning: ["addition", "subtraction"],
      curriculumSkills: [],
      exclusions: ["Use only where a nearby ten genuinely simplifies the calculation."],
    },
    pedagogy: {
      learningObjectivePattern: "Decompose a number so the calculation first reaches a friendly ten, then complete the remaining part.",
      conceptualFocus: ["making ten", "decomposition", "mental calculation"],
      prerequisiteConcepts: ["number bonds to ten", "composition and decomposition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("choose_friendly_ten", "reason", "Identify the nearest useful ten in the required direction.", "A benchmark ten can simplify the calculation.", ["number_line", "number_bond"]),
        stage("split_amount", "represent", "Split the number being added or subtracted into the amount needed to reach the ten and the remainder.", "The split must preserve the original quantity.", ["number_bond"]),
        stage("bridge", "calculate", "Move to the friendly ten, then apply the remaining amount.", "Two simpler steps replace one harder jump.", ["number_line", "mental_strategy"]),
        stage("check_total_change", "check", "Verify that the two split parts recombine to the original amount.", "The total change must be unchanged.", ["symbolic_working"]),
      ],
      representations: reps(["number_line", "number_bond"], ["mental_strategy", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Show the split explicitly when teaching the strategy."],
      generalisationPattern: "A number can be decomposed to bridge through a friendly benchmark without changing the calculation.",
      checkPattern: "Add the split parts and compare with the original addend or subtrahend.",
    },
    misconceptions: [
      misconception("split_not_equal", "Splitting the amount into parts that do not recombine correctly.", ["Original addend differs from split total"], "Check the number bond before calculating."),
      misconception("wrong_direction", "Bridging to a ten in the wrong direction.", ["Subtraction jump increases value"], "Mark operation direction on a number line."),
    ],
    visualGuidance: visual("usually", ["number_line", "number_bond"]),
    officialClaimTag: "curriculum_learning_experience",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses bridge-through-ten only when the benchmark reduces cognitive load.",
  }),
  makeMethod({
    methodId: "number.add_sub.regrouping_place_value",
    familyId: "number.add_sub",
    variantId: "regrouping",
    title: "Regroup by place value before calculating",
    summary: "Explains carrying and borrowing as renaming equivalent place-value units rather than as unexplained digit rules.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "addition_change", "subtraction_change"],
      reasoning: ["addition", "subtraction", "place_value_reasoning"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Regroup equivalent place-value units while preserving the total quantity, then calculate by place.",
      conceptualFocus: ["regrouping", "renaming", "place-value equivalence"],
      prerequisiteConcepts: ["place value", "compose and decompose", "basic addition and subtraction facts"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("align_places", "represent", "Align like place values.", "Each column represents one place-value unit.", ["place_value_chart", "written_algorithm"]),
        stage("decide_regroup", "notice_relationship", "Identify the place where regrouping is required.", "A place can be renamed into equivalent units of the next place.", ["place_value_chart", "manipulatives"]),
        stage("rename", "reason", "Regroup exactly one higher-place unit as ten lower-place units, or combine ten lower-place units into one higher-place unit.", "The total value is unchanged by regrouping.", ["manipulatives", "place_value_chart"]),
        stage("calculate_columns", "calculate", "Complete the calculation place by place.", "Regrouped values must be included exactly once.", ["written_algorithm"]),
        stage("inverse_or_estimate", "check", "Check by inverse operation or reasonableness estimate.", "A correct answer should satisfy both structure and magnitude.", ["symbolic_working", "mental_strategy"]),
      ],
      representations: reps(["place_value_chart", "written_algorithm"], ["manipulatives", "symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Keep regrouped values aligned with their new place.", "Explain the renaming before abbreviating the written notation."],
      generalisationPattern: "Regrouping changes the representation of a quantity, not its value.",
      checkPattern: "Use inverse operation or estimation.",
    },
    misconceptions: [
      misconception("borrow_without_rename", "Treating borrowing as crossing out a digit without accounting for the ten lower units.", ["Decrements one column but adds 1 instead of 10"], "Model the exchange with place-value units."),
      misconception("carry_twice", "Counting a regrouped amount twice.", ["Includes both pre- and post-regroup values"], "Track the renamed unit visually in one destination column."),
    ],
    visualGuidance: visual("usually", ["place_value_chart", "manipulatives", "written_algorithm"]),
    officialClaimTag: "curriculum_scope",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape explicitly teaches regrouping as place-value renaming before compact algorithm notation.",
  }),
  makeMethod({
    methodId: "number.add_sub.column_algorithm",
    familyId: "number.add_sub",
    variantId: "column_algorithm",
    title: "Use the standard column addition or subtraction algorithm",
    summary: "Executes a written addition or subtraction algorithm with strict place alignment and explicit regrouping when needed.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "addition_change", "subtraction_change"],
      reasoning: ["addition", "subtraction"],
      curriculumSkills: [],
      exclusions: ["Do not use as the first explanation when place-value regrouping is not yet understood."],
    },
    pedagogy: {
      learningObjectivePattern: "Apply a written addition or subtraction algorithm accurately by aligning place values and recording regrouping.",
      conceptualFocus: ["algorithm accuracy", "place alignment", "regrouping notation"],
      prerequisiteConcepts: ["place value", "regrouping meaning"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("set_up", "represent", "Write the numbers vertically with like places aligned.", "Correct alignment is part of the algorithm.", ["written_algorithm"]),
        stage("calculate_each_place", "calculate", "Calculate from the least significant required place, regrouping where necessary.", "Each place is resolved systematically.", ["written_algorithm"]),
        stage("read_answer", "generalise", "Read the final numeral using place value.", "The algorithm produces one whole-number result, not disconnected digits.", ["symbolic_working"]),
        stage("check", "check", "Estimate or use the inverse operation to check reasonableness.", "A written result should still make sense numerically.", ["mental_strategy", "symbolic_working"]),
      ],
      representations: reps(["written_algorithm"], ["symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Align ones under ones, tens under tens, and so on.", "Record regrouping marks consistently."],
      generalisationPattern: "A place-value algorithm is reliable when like places are aligned and every regrouped unit is accounted for.",
      checkPattern: "Estimate first or check with the inverse operation.",
    },
    misconceptions: [
      misconception("misaligned_columns", "Aligning numbers by their left edge rather than place value.", ["Ones fall under tens"], "Label columns or use a place-value grid."),
      misconception("algorithm_without_meaning", "Applying carry/borrow marks mechanically without preserving value.", ["Inconsistent regrouping"], "Return to the regrouping-place-value method."),
    ],
    visualGuidance: visual("optional", ["written_algorithm"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape reserves compact column algorithms for learners who have the prerequisite place-value meaning.",
  }),
  makeMethod({
    methodId: "number.add_sub.compensation",
    familyId: "number.add_sub",
    variantId: "compensation",
    title: "Compensate with a nearby friendly number",
    summary: "Temporarily adjusts a number to simplify mental addition or subtraction, then compensates by the same amount.",
    status: "active",
    applicability: {
      levels: [3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "addition_change", "subtraction_change"],
      reasoning: ["addition", "subtraction", "estimation"],
      curriculumSkills: [],
      exclusions: ["Use only when the adjustment creates a clearly simpler calculation."],
    },
    pedagogy: {
      learningObjectivePattern: "Adjust one number to a nearby friendly number, calculate, then undo the adjustment exactly.",
      conceptualFocus: ["equivalence", "compensation", "mental flexibility"],
      prerequisiteConcepts: ["place value", "addition and subtraction facts", "equivalent change"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("choose_adjustment", "reason", "Choose a small adjustment that creates a friendly number.", "The adjustment should simplify the calculation.", ["mental_strategy", "number_line"]),
        stage("calculate_adjusted", "calculate", "Perform the easier adjusted calculation.", "Work with the friendly number accurately.", ["mental_strategy"]),
        stage("compensate", "reason", "Undo the adjustment in the correct direction.", "The compensation restores equivalence to the original expression.", ["symbolic_working"]),
        stage("estimate", "check", "Compare with a rough estimate.", "The compensated result should have a sensible magnitude.", ["mental_strategy"]),
      ],
      representations: reps(["mental_strategy"], ["number_line", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Show the adjustment and compensation as paired changes."],
      generalisationPattern: "If one value is changed temporarily, an equal and opposite compensation preserves the original result.",
      checkPattern: "Estimate from the unadjusted numbers.",
    },
    misconceptions: [
      misconception("compensate_wrong_way", "Adjusting and compensating in the same direction.", ["Adds the adjustment twice"], "Mark the temporary change and explicitly reverse it."),
    ],
    visualGuidance: visual("optional", ["number_line"]),
    officialClaimTag: "curriculum_learning_experience",
    dreamscapeClaim: "Dreamscape uses compensation as an optional efficiency strategy after conceptual fluency is established.",
  }),

  // ---------------------------------------------------------------------------
  // number.mult_div
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "number.mult_div.equal_groups_array",
    familyId: "number.mult_div",
    variantId: "equal_groups",
    title: "Build multiplication from equal groups and arrays",
    summary: "Connects equal groups, repeated addition and rectangular arrays to multiplication meaning.",
    status: "active",
    applicability: {
      levels: [1,2,3],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["equal_groups", "repeated_addition", "direct_calculation"],
      reasoning: ["multiplication", "counting"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret multiplication as a number of equal groups with the same quantity in each group.",
      conceptualFocus: ["equal groups", "repeated addition", "array structure"],
      prerequisiteConcepts: ["skip counting", "addition"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("make_groups", "represent", "Create equal groups with the same number of objects in each group.", "Every group must be equal.", ["manipulatives", "equal_groups_diagram"]),
        stage("connect_repeated_addition", "notice_relationship", "Write the repeated addition represented by the groups.", "Repeated equal addends describe the same structure.", ["equal_groups_diagram", "symbolic_working"]),
        stage("write_multiplication", "generalise", "Express the structure as multiplication using number of groups and size of each group.", "Multiplication abbreviates equal-group addition.", ["array", "symbolic_working"]),
        stage("check_count", "check", "Count or skip-count the total.", "The multiplication result must match the represented quantity.", ["array", "mental_strategy"]),
      ],
      representations: reps(["equal_groups_diagram", "array"], ["manipulatives", "symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Name both the number of groups and the size of each group."],
      generalisationPattern: "Multiplication represents repeated equal groups.",
      checkPattern: "Verify by skip counting or repeated addition.",
    },
    misconceptions: [
      misconception("unequal_groups", "Treating unequal groups as a multiplication structure.", ["Groups contain different quantities"], "Equalise the groups or switch to a different problem structure."),
      misconception("swap_meaning_without_context", "Swapping factors without understanding what each factor represents.", ["Cannot identify group count vs group size"], "Label both factors before using commutativity."),
    ],
    visualGuidance: visual("essential", ["equal_groups_diagram", "array", "manipulatives"]),
    officialClaimTag: "curriculum_learning_experience",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape connects groups to repeated addition before symbolic multiplication.",
  }),
  makeMethod({
    methodId: "number.mult_div.sharing_grouping",
    familyId: "number.mult_div",
    variantId: "sharing_grouping",
    title: "Distinguish sharing division from grouping division",
    summary: "Separates two meanings of division: sharing a total into a known number of groups and forming groups of a known size.",
    status: "active",
    applicability: {
      levels: [2,3,4],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["sharing", "grouping", "repeated_subtraction"],
      reasoning: ["division", "counting"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify whether division is finding the size of each equal share or the number of equal groups.",
      conceptualFocus: ["sharing", "grouping", "quotient meaning", "inverse multiplication"],
      prerequisiteConcepts: ["equal groups", "multiplication facts"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("identify_unknown", "establish_meaning", "State whether the unknown is group size or number of groups.", "The wording changes the meaning of the quotient.", ["verbal_reasoning"]),
        stage("model_distribution", "represent", "Share objects equally or repeatedly form groups of the stated size.", "Division preserves equal-group structure.", ["manipulatives", "equal_groups_diagram"]),
        stage("write_division", "calculate", "Write the matching division sentence and solve.", "The quotient answers the identified unknown.", ["symbolic_working"]),
        stage("multiply_back", "check", "Multiply quotient by divisor to reconstruct the total.", "Multiplication is the inverse check.", ["symbolic_working"]),
      ],
      representations: reps(["equal_groups_diagram"], ["manipulatives", "array", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Label total, divisor meaning and quotient meaning."],
      generalisationPattern: "Division can find either how many groups or how many in each group.",
      checkPattern: "Multiply quotient and divisor to recover the total.",
    },
    misconceptions: [
      misconception("sharing_grouping_confused", "Giving the correct numerical quotient but interpreting its unit incorrectly.", ["Answer label refers to groups when group size was asked"], "Identify the unknown before calculating."),
      misconception("unequal_shares", "Sharing without preserving equality.", ["Different group sizes"], "Redistribute until each group is equal."),
    ],
    visualGuidance: visual("essential", ["equal_groups_diagram", "manipulatives"]),
    officialClaimTag: "curriculum_learning_experience",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape makes the sharing-versus-grouping distinction explicit before division notation.",
  }),
  makeMethod({
    methodId: "number.mult_div.distributive_decomposition",
    familyId: "number.mult_div",
    variantId: "distributive_decomposition",
    title: "Decompose a factor and distribute multiplication",
    summary: "Breaks a difficult multiplication into easier partial products and recombines them using the distributive structure.",
    status: "active",
    applicability: {
      levels: [3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "equal_groups"],
      reasoning: ["multiplication", "addition", "place_value_reasoning"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Decompose one factor into convenient parts, multiply each part, and recombine the partial products.",
      conceptualFocus: ["distributive property", "partial products", "place value"],
      prerequisiteConcepts: ["multiplication facts", "addition", "place-value decomposition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("decompose_factor", "represent", "Split one factor into place-value or friendly-number parts.", "The parts must sum to the original factor.", ["place_value_chart", "area_model"]),
        stage("multiply_parts", "calculate", "Multiply the other factor by each part separately.", "Each partial product represents one section of the total.", ["area_model", "symbolic_working"]),
        stage("combine_partial_products", "calculate", "Add the partial products.", "The combined total equals the original product.", ["symbolic_working"]),
        stage("check_estimate", "check", "Estimate the product to check magnitude.", "Partial products should combine to a sensible total.", ["mental_strategy"]),
      ],
      representations: reps(["area_model"], ["place_value_chart", "symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Show the decomposition with parentheses or an area partition.", "Align place values in partial products."],
      generalisationPattern: "Multiplication distributes over addition: multiplying a whole is equivalent to multiplying its parts and recombining.",
      checkPattern: "Estimate using rounded factors.",
    },
    misconceptions: [
      misconception("missing_partial_product", "Multiplying only one decomposed part.", ["One term absent"], "Match one partial product to every decomposition part."),
      misconception("wrong_place_partial", "Ignoring place value in a decomposed factor.", ["Treats 30 as 3"], "Label the decomposed part with its full place value."),
    ],
    visualGuidance: visual("usually", ["area_model", "place_value_chart"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses distributive decomposition to connect place value with efficient multiplication.",
  }),
  makeMethod({
    methodId: "number.mult_div.fact_family",
    familyId: "number.mult_div",
    variantId: "fact_family",
    title: "Use multiplication and division fact families",
    summary: "Connects related multiplication and division facts so known products support division and missing-factor reasoning.",
    status: "active",
    applicability: {
      levels: [2,3,4],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["equal_groups", "sharing", "grouping", "missing_number_equation"],
      reasoning: ["multiplication", "division", "equation_solving"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use one known multiplication fact to generate the related multiplication and division facts.",
      conceptualFocus: ["inverse operations", "commutativity", "fact fluency"],
      prerequisiteConcepts: ["equal groups", "multiplication meaning"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("represent_fact", "represent", "Represent one multiplication fact with equal groups or an array.", "The factors and product refer to one structure.", ["array", "equal_groups_diagram"]),
        stage("write_related_facts", "notice_relationship", "Write the related multiplication and division facts using the same three numbers.", "The operations describe the same relationship from different directions.", ["symbolic_working"]),
        stage("use_known_fact", "calculate", "Choose the related fact that directly answers the required unknown.", "Known facts can replace repeated counting.", ["mental_strategy"]),
        stage("check_family", "check", "Confirm that every fact in the family is numerically consistent.", "All facts must preserve the same product relationship.", ["symbolic_working"]),
      ],
      representations: reps(["array", "symbolic_working"], ["equal_groups_diagram", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Keep the same three values visible across the fact family."],
      generalisationPattern: "Multiplication and division facts built from the same three values express one inverse relationship.",
      checkPattern: "Multiply divisor and quotient.",
    },
    misconceptions: [
      misconception("fact_family_new_numbers", "Introducing a different number into a fact family.", ["Fourth unrelated value appears"], "Anchor all equations to the same represented groups."),
    ],
    visualGuidance: visual("usually", ["array", "equal_groups_diagram"]),
    officialClaimTag: "curriculum_learning_experience",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses fact families as the bridge from represented groups to inverse-operation fluency.",
  }),
  makeMethod({
    methodId: "number.mult_div.written_algorithm",
    familyId: "number.mult_div",
    variantId: "written_algorithm",
    title: "Use a written multiplication or division algorithm",
    summary: "Applies a compact written procedure after place value, equal-group meaning and partial-product or sharing concepts are secure.",
    status: "active",
    applicability: {
      levels: [3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "grouping", "sharing"],
      reasoning: ["multiplication", "division"],
      curriculumSkills: [],
      exclusions: ["Do not use as the first conceptual explanation of multiplication or division."],
    },
    pedagogy: {
      learningObjectivePattern: "Execute the level-appropriate written multiplication or division algorithm while keeping place value explicit.",
      conceptualFocus: ["algorithm accuracy", "place value", "partial products or partial quotients"],
      prerequisiteConcepts: ["multiplication facts", "division meaning", "place value"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("set_up", "represent", "Set up the calculation with correct place-value alignment.", "The written layout encodes place value.", ["written_algorithm"]),
        stage("execute_steps", "calculate", "Carry out each algorithm step in order, recording regrouping or intermediate work clearly.", "Every recorded value has a place-value meaning.", ["written_algorithm"]),
        stage("interpret_result", "generalise", "Interpret the final product or quotient in the original context.", "The result is a quantity, not only a string of digits.", ["verbal_reasoning"]),
        stage("inverse_estimate_check", "check", "Check with inverse operation and/or estimation.", "The algorithm should agree with independent reasoning.", ["mental_strategy", "symbolic_working"]),
      ],
      representations: reps(["written_algorithm"], ["symbolic_working", "mental_strategy", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Keep each partial product or quotient step aligned with its place value."],
      generalisationPattern: "A written algorithm compresses place-value reasoning into a repeatable procedure.",
      checkPattern: "Use inverse operation or estimate the expected magnitude.",
    },
    misconceptions: [
      misconception("algorithm_place_error", "Misplacing a partial product or quotient digit.", ["Incorrect zero/place alignment"], "Re-expand the step using place value."),
      misconception("remainder_ignored", "Dropping or misinterpreting a remainder.", ["Quotient presented without context"], "Interpret the remainder according to the problem context."),
    ],
    visualGuidance: visual("optional", ["written_algorithm"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape permits compact algorithms only after the required conceptual prerequisites are declared.",
  }),

  // ---------------------------------------------------------------------------
  // number.factors_multiples
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "number.factors_multiples.factor_pairs",
    familyId: "number.factors_multiples",
    variantId: "factor_pairs",
    title: "Find factors systematically using factor pairs",
    summary: "Lists factor pairs without omission or duplication and connects factors to multiplication and division.",
    status: "active",
    applicability: {
      levels: [4,5,6],
      domains: ["whole_numbers"],
      structures: ["direct_calculation", "common_multiple_cycle"],
      reasoning: ["multiplication", "division", "common_multiple"],
      curriculumSkills: [],
      exclusions: ["Use for factor questions; common-multiple questions may use the list-multiples variant instead."],
    },
    pedagogy: {
      learningObjectivePattern: "Generate factor pairs systematically and recognise when all possible pairs have been found.",
      conceptualFocus: ["factor-product relationship", "systematic search", "divisibility"],
      prerequisiteConcepts: ["multiplication facts", "division"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("start_one", "reason", "Start with 1 and test increasing whole-number divisors.", "A factor divides with no remainder.", ["table", "symbolic_working"]),
        stage("record_pairs", "calculate", "Record each matching factor pair.", "Factors occur in product pairs.", ["table"]),
        stage("stop_at_repeat", "generalise", "Stop when factor pairs begin to reverse.", "Past the square-root region, pairs repeat in opposite order.", ["table"]),
        stage("check_product", "check", "Multiply each pair to verify the target number.", "Every pair must produce the same target.", ["symbolic_working"]),
      ],
      representations: reps(["table"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["List factor pairs in increasing first-factor order."],
      generalisationPattern: "Factors of a number can be organised as multiplication pairs whose product is the number.",
      checkPattern: "Multiply every recorded pair.",
    },
    misconceptions: [
      misconception("factor_multiple_confused", "Confusing factors with multiples.", ["Lists numbers larger than the target as factors"], "Ask whether the candidate divides the target exactly."),
    ],
    visualGuidance: visual("optional", ["table"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape uses factor-pair ordering to prevent omissions and duplicates.",
  }),
  makeMethod({
    methodId: "number.factors_multiples.common_multiples_list",
    familyId: "number.factors_multiples",
    variantId: "common_multiple",
    title: "List multiples to find common multiples",
    summary: "Generates multiples of each number in order and identifies the first or all required common values.",
    status: "active",
    applicability: {
      levels: [4,5,6],
      domains: ["whole_numbers"],
      structures: ["common_multiple_cycle"],
      reasoning: ["common_multiple", "multiplication", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Generate ordered multiple lists and identify values that appear in every required list.",
      conceptualFocus: ["multiples", "common multiples", "ordered generation"],
      prerequisiteConcepts: ["multiplication facts", "skip counting"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("generate_lists", "calculate", "List successive multiples of each number in increasing order.", "Each list follows repeated scaling by the base number.", ["table"]),
        stage("align_common_values", "reason", "Compare the lists and mark values that appear in all of them.", "Common multiples belong to every list.", ["table"]),
        stage("select_required", "reason", "Choose the least common multiple or the required common value.", "The problem determines which common value matters.", ["symbolic_working"]),
        stage("verify_divisibility", "check", "Divide the selected value by each base number.", "A common multiple must divide evenly by every base number.", ["symbolic_working"]),
      ],
      representations: reps(["table"], ["symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Keep multiple lists aligned or clearly separated."],
      generalisationPattern: "A common multiple is a value that occurs in the multiple list of every given number.",
      checkPattern: "Test exact divisibility by each number.",
    },
    misconceptions: [
      misconception("first_list_only", "Choosing a multiple from only one number's list.", ["Selected value absent from another list"], "Mark the intersection of all lists."),
    ],
    visualGuidance: visual("usually", ["table"]),
    officialClaimTag: "curriculum_learning_experience",
    dreamscapeClaim: "Dreamscape uses parallel multiple lists as the deterministic baseline before more advanced shortcuts.",
  }),
  makeMethod({
    methodId: "number.factors_multiples.cycle_alignment",
    familyId: "number.factors_multiples",
    variantId: "cycle_alignment",
    title: "Align repeating cycles through common multiples",
    summary: "Treats repeated events as cycles and finds when they coincide by relating cycle lengths to common multiples.",
    status: "active",
    applicability: {
      levels: [4,5,6],
      domains: ["whole_numbers", "patterns"],
      structures: ["common_multiple_cycle", "recursive_pattern"],
      reasoning: ["common_multiple", "pattern_application"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Translate repeating event intervals into cycle lengths and find the next common alignment.",
      conceptualFocus: ["repeating cycles", "common multiples", "event alignment"],
      prerequisiteConcepts: ["multiples", "repeating patterns"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("identify_cycles", "establish_meaning", "Identify the repeat interval for each event.", "Each interval generates its own repeating cycle.", ["timeline", "table"]),
        stage("generate_alignment_candidates", "reason", "Generate multiples of each interval or mark repeated positions on a timeline.", "Coincidences occur at common multiples.", ["timeline", "table"]),
        stage("choose_alignment", "calculate", "Select the required common occurrence.", "The earliest positive coincidence corresponds to the least common multiple when appropriate.", ["symbolic_working"]),
        stage("check_each_cycle", "check", "Verify that the chosen position is an exact number of cycles for every event.", "Every event must land exactly on the same point.", ["symbolic_working"]),
      ],
      representations: reps(["timeline", "table"], ["symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Record each cycle length before generating multiples."],
      generalisationPattern: "Repeating events align at common multiples of their cycle lengths.",
      checkPattern: "Divide the alignment point by each cycle length.",
    },
    misconceptions: [
      misconception("add_intervals", "Adding cycle lengths instead of finding a common multiple.", ["Uses a+b as meeting point"], "Generate at least two repetitions of each cycle to expose the pattern."),
    ],
    visualGuidance: visual("usually", ["timeline", "table"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape maps repeating-cycle alignment to common-multiple reasoning explicitly.",
  }),

  // ---------------------------------------------------------------------------
  // arithmetic.direct
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "arithmetic.direct.mental_calculation",
    familyId: "arithmetic.direct",
    variantId: "mental_calculation",
    title: "Choose an efficient mental calculation",
    summary: "Uses known facts, place value and simple decomposition when the numbers make mental calculation genuinely efficient.",
    status: "active",
    applicability: {
      levels: [1,2,3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation"],
      reasoning: ["addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: ["Do not force mental calculation when written work is clearer or safer."],
    },
    pedagogy: {
      learningObjectivePattern: "Recognise when known facts or place-value structure allow a concise mental calculation.",
      conceptualFocus: ["calculation efficiency", "known facts", "place value"],
      prerequisiteConcepts: ["basic operation meanings", "relevant number facts"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("inspect_numbers", "reason", "Inspect the numbers for known facts, place-value patterns or friendly decompositions.", "Method choice should respond to number structure.", ["mental_strategy"]),
        stage("calculate", "calculate", "Carry out the chosen mental strategy.", "Keep the transformation equivalent to the original calculation.", ["mental_strategy"]),
        stage("state_reason", "generalise", "Briefly state why the strategy was efficient.", "Efficient methods are chosen, not memorised blindly.", ["verbal_reasoning"]),
        stage("estimate_check", "check", "Use magnitude or inverse-operation reasoning to check.", "Mental answers still require reasonableness checking.", ["mental_strategy"]),
      ],
      representations: reps(["mental_strategy"], ["verbal_reasoning", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Record only essential intermediate values when a written trace is required."],
      generalisationPattern: "Mental calculation is most efficient when it exploits known numerical structure.",
      checkPattern: "Estimate or use an inverse relation.",
    },
    misconceptions: [
      misconception("mental_no_trace", "Losing track of decomposed parts during mental work.", ["Answer differs by a small omitted part"], "Record one essential intermediate value."),
    ],
    visualGuidance: visual("never", [], false),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape treats mental calculation as a deliberate candidate, not a universal default.",
  }),
  makeMethod({
    methodId: "arithmetic.direct.written_calculation",
    familyId: "arithmetic.direct",
    variantId: "written_calculation",
    title: "Choose a written calculation when it reduces error",
    summary: "Uses an appropriate written algorithm or structured working for a direct arithmetic task that is not best handled mentally.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation"],
      reasoning: ["addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Set up and execute a clear written calculation while preserving place value and operation meaning.",
      conceptualFocus: ["method choice", "written accuracy", "place value"],
      prerequisiteConcepts: ["operation meaning", "relevant written algorithm"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("choose_layout", "represent", "Choose the written layout appropriate to the operation and learner level.", "The layout should make place value and intermediate work clear.", ["written_algorithm"]),
        stage("execute", "calculate", "Carry out each recorded step in order.", "Every intermediate value should have a mathematical meaning.", ["written_algorithm"]),
        stage("check", "check", "Use estimation or inverse operation.", "Written work is not self-validating.", ["mental_strategy", "symbolic_working"]),
      ],
      representations: reps(["written_algorithm"], ["symbolic_working", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Keep one operation chain visually clear and aligned."],
      generalisationPattern: "Written calculation is useful when it externalises intermediate steps and place values.",
      checkPattern: "Estimate before or after calculating.",
    },
    misconceptions: [
      misconception("layout_not_operation", "Using a familiar written layout that does not match the required operation.", ["Wrong symbol or algorithm steps"], "Name the operation before setting up the layout."),
    ],
    visualGuidance: visual("optional", ["written_algorithm"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape chooses written calculation when it improves transparency or reliability.",
  }),
  makeMethod({
    methodId: "arithmetic.direct.estimation_check",
    familyId: "arithmetic.direct",
    variantId: "estimation_check",
    title: "Estimate and check reasonableness",
    summary: "Builds an independent rough expectation before or after exact calculation to detect implausible results.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["direct_calculation", "operation_chain"],
      reasoning: ["estimation", "addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Form a reasonable estimate and use it to judge whether an exact answer has the correct magnitude.",
      conceptualFocus: ["magnitude", "rounding or friendly numbers", "reasonableness"],
      prerequisiteConcepts: ["number magnitude", "basic operations"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("form_estimate", "reason", "Replace values with nearby friendly values or identify a sensible range.", "The estimate need not be exact; it must be useful.", ["mental_strategy", "number_line"]),
        stage("calculate_exact", "calculate", "Complete the exact calculation with the chosen main method.", "Exact work and estimate serve different purposes.", ["symbolic_working"]),
        stage("compare", "check", "Compare exact answer and estimate.", "A large mismatch signals a likely setup or calculation error.", ["verbal_reasoning"]),
      ],
      representations: reps(["mental_strategy"], ["number_line", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Mark approximate values clearly with words or an approximation symbol when used."],
      generalisationPattern: "An estimate provides an independent magnitude check on an exact result.",
      checkPattern: "Compare exact result with estimated range or benchmark.",
    },
    misconceptions: [
      misconception("estimate_as_exact", "Presenting the estimated value as the final exact answer.", ["No exact calculation follows"], "Label estimate and exact result separately."),
    ],
    visualGuidance: visual("optional", ["number_line"]),
    officialClaimTag: "curriculum_learning_experience",
    dreamscapeClaim: "Dreamscape uses estimation as an independent correctness check rather than a substitute for required exact work.",
  }),

  // ---------------------------------------------------------------------------
  // arithmetic.operation_chain
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "arithmetic.operation_chain.intermediate_results",
    familyId: "arithmetic.operation_chain",
    variantId: "intermediate_results",
    title: "Execute a multi-operation chain with explicit intermediate results",
    summary: "Breaks a known arithmetic chain into ordered steps so each intermediate value can be interpreted and checked.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["operation_chain", "multi_step"],
      reasoning: ["addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Carry out a required sequence of operations in the correct order and preserve the meaning of each intermediate value.",
      conceptualFocus: ["operation sequence", "intermediate quantities", "error localisation"],
      prerequisiteConcepts: ["four operation meanings"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("name_sequence", "reason", "State the intended operation sequence before calculating.", "The order of steps is part of the solution.", ["verbal_reasoning"]),
        stage("calculate_stepwise", "calculate", "Complete one operation at a time and record the intermediate result.", "Each new value becomes the input to the next step.", ["symbolic_working"]),
        stage("interpret_intermediate", "notice_relationship", "Relate the intermediate value back to what it represents when context exists.", "Intermediate numbers are quantities, not arbitrary outputs.", ["verbal_reasoning"]),
        stage("check_chain", "check", "Estimate or reverse a suitable part of the chain.", "A stepwise trace makes errors easier to locate.", ["mental_strategy", "symbolic_working"]),
      ],
      representations: reps(["symbolic_working"], ["verbal_reasoning", "mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Use one line per meaningful operation when teaching.", "Carry the full intermediate value accurately into the next line."],
      generalisationPattern: "A multi-operation chain is reliable when the operation order and intermediate values are explicit.",
      checkPattern: "Check at least one intermediate stage independently.",
    },
    misconceptions: [
      misconception("skip_intermediate", "Combining several operations mentally and losing an intermediate value.", ["Untraceable arithmetic jump"], "Record each stage separately."),
    ],
    visualGuidance: visual("never", [], false),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape exposes intermediate results to support reasoning and later progressive reveal.",
  }),
  makeMethod({
    methodId: "arithmetic.operation_chain.order_and_brackets",
    familyId: "arithmetic.operation_chain",
    variantId: "operation_order",
    title: "Respect operation order and brackets",
    summary: "Uses grouping symbols and the curriculum-appropriate order of operations to determine which calculation is performed first.",
    status: "active",
    applicability: {
      levels: [4,5,6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["operation_chain", "direct_calculation"],
      reasoning: ["addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify grouped operations and execute the expression in the required order without changing the expression's meaning.",
      conceptualFocus: ["operation precedence", "brackets", "expression structure"],
      prerequisiteConcepts: ["four operations", "equal expressions"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("mark_groups", "represent", "Identify brackets or other explicit grouping first.", "Grouping determines local calculation units.", ["symbolic_working"]),
        stage("apply_order", "reason", "Determine the next operation using the applicable order rules.", "Operation symbols do not all have equal priority.", ["symbolic_working"]),
        stage("simplify_stepwise", "calculate", "Replace only the completed part with its result and continue.", "Each rewritten expression must remain equivalent.", ["symbolic_working"]),
        stage("check_expression", "check", "Review each rewrite for equivalence and estimate the final magnitude.", "No operation may be dropped or duplicated.", ["symbolic_working", "mental_strategy"]),
      ],
      representations: reps(["symbolic_working"], ["mental_strategy"]),
    },
    workedPattern: {
      notationGuidance: ["Rewrite the full remaining expression after each step.", "Keep brackets until the grouped operation has been resolved."],
      generalisationPattern: "Operation order preserves a single unambiguous meaning for a numerical expression.",
      checkPattern: "Trace every original operation to exactly one completed step.",
    },
    misconceptions: [
      misconception("left_to_right_all", "Always calculating strictly left to right regardless of operation priority.", ["Addition done before multiplication without grouping"], "Mark operation priority before calculating."),
      misconception("drop_operation", "Dropping an operation while rewriting.", ["Term disappears between lines"], "Rewrite the untouched parts on every line."),
    ],
    visualGuidance: visual("never", [], false),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape requires equivalence-preserving rewrites at every operation-order step.",
  }),

  // ---------------------------------------------------------------------------
  // algebra.equation_unknown
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "algebra.equation_unknown.inverse_missing_number",
    familyId: "algebra.equation_unknown",
    variantId: "missing_number",
    title: "Find a missing number using inverse operations",
    summary: "Treats the blank or symbol as an unknown quantity and uses the inverse operation to isolate it.",
    status: "active",
    applicability: {
      levels: [1,2,3,4,5,6],
      domains: ["whole_numbers", "arithmetic", "algebra"],
      structures: ["missing_number_equation", "equation_unknown"],
      reasoning: ["equation_solving", "addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify the unknown quantity and use the inverse operation to recover it without guessing.",
      conceptualFocus: ["unknown as quantity", "inverse operations", "equality"],
      prerequisiteConcepts: ["operation meaning", "fact families"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("name_unknown", "establish_meaning", "State what quantity the blank or symbol represents.", "The unknown has one value that makes the equation true.", ["equation", "verbal_reasoning"]),
        stage("identify_inverse", "reason", "Choose the inverse operation that undoes the known operation.", "Inverse operations recover missing inputs.", ["equation"]),
        stage("solve", "calculate", "Apply the inverse relationship to obtain the unknown.", "Maintain equality while solving.", ["equation", "symbolic_working"]),
        stage("substitute_check", "check", "Substitute the value back into the original equation.", "A correct value makes the original statement true.", ["equation"]),
      ],
      representations: reps(["equation"], ["symbolic_working", "number_bond", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Keep the original equation visible for substitution checking."],
      generalisationPattern: "An unknown can be recovered by reversing the relationship that connects it to known quantities.",
      checkPattern: "Substitute into the original equation.",
    },
    misconceptions: [
      misconception("inverse_wrong_operation", "Using the same operation instead of its inverse.", ["Adds again to undo addition"], "State the operation pair explicitly before solving."),
      misconception("guess_no_check", "Guessing a value without testing the equation.", ["No substitution"], "Require substitution as the final step."),
    ],
    visualGuidance: visual("optional", ["equation", "number_bond"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape frames missing-number work as unknown-quantity reasoning with mandatory substitution checking.",
  }),
  makeMethod({
    methodId: "algebra.equation_unknown.balance_equation",
    familyId: "algebra.equation_unknown",
    variantId: "equation_balance",
    title: "Preserve equality while isolating an unknown",
    summary: "Uses the balance meaning of equality to transform a simple equation without changing its truth.",
    status: "active",
    applicability: {
      levels: [4,5,6],
      domains: ["algebra", "arithmetic"],
      structures: ["equation_unknown", "missing_number_equation"],
      reasoning: ["equation_solving", "algebraic_simplification"],
      curriculumSkills: [],
      exclusions: ["Use only for equation forms appropriate to the learner's curriculum level."],
    },
    pedagogy: {
      learningObjectivePattern: "Transform both sides of an equation in equivalent ways until the unknown is isolated.",
      conceptualFocus: ["equality", "equivalent transformation", "inverse operations"],
      prerequisiteConcepts: ["meaning of equals sign", "inverse operations"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("read_balance", "establish_meaning", "Read the equals sign as 'has the same value as'.", "Both sides represent equal quantities.", ["equation", "manipulatives"]),
        stage("choose_inverse_step", "reason", "Choose an inverse step that moves toward isolating the unknown.", "A valid transformation preserves equality.", ["equation"]),
        stage("apply_equally", "calculate", "Apply the equivalent change consistently.", "The equation remains true after an equivalent transformation.", ["equation", "symbolic_working"]),
        stage("substitute", "check", "Substitute the solved value into the original equation.", "The original equality is the final test.", ["equation"]),
      ],
      representations: reps(["equation"], ["manipulatives", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Show one equivalent equation per line."],
      generalisationPattern: "An equation remains true when it is transformed by a valid equivalent operation.",
      checkPattern: "Substitute into the original equation.",
    },
    misconceptions: [
      misconception("equals_means_answer", "Treating '=' as a signal to write an answer rather than a relation between equal values.", ["Cannot interpret reversed equations"], "Use balance language and equivalent forms."),
    ],
    visualGuidance: visual("usually", ["equation", "manipulatives"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses balance meaning to prevent rule-only symbol manipulation.",
  }),

  // ---------------------------------------------------------------------------
  // algebra.symbol_rule
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "algebra.symbol_rule.map_symbol_values",
    familyId: "algebra.symbol_rule",
    variantId: "symbol_value_mapping",
    title: "Map symbols to values consistently",
    summary: "Uses given equations or clues to determine symbol values and records the mapping before applying it elsewhere.",
    status: "active",
    applicability: {
      levels: [1,2,3,4,5,6],
      domains: ["algebra", "logic", "whole_numbers"],
      structures: ["symbol_mapping"],
      reasoning: ["symbol_mapping", "equation_solving"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Determine what each symbol represents, record the mapping, and use the same mapping consistently.",
      conceptualFocus: ["symbol as placeholder", "consistency", "constraint satisfaction"],
      prerequisiteConcepts: ["equality", "basic operations"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("collect_clues", "reason", "Read each clue or equation and identify which symbols are constrained.", "Every clue narrows the possible mapping.", ["equation", "table"]),
        stage("solve_one_symbol", "calculate", "Start with the clue that isolates or most directly determines one symbol.", "A secure value can unlock later clues.", ["equation"]),
        stage("record_mapping", "represent", "Record each determined symbol-value pair.", "A symbol must keep the same meaning throughout the problem.", ["table"]),
        stage("substitute_check", "check", "Substitute the mapping into every original clue.", "All clues must remain true simultaneously.", ["equation"]),
      ],
      representations: reps(["table", "equation"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Maintain a small symbol-to-value table."],
      generalisationPattern: "In a fixed symbol-mapping problem, the same symbol must represent the same value everywhere.",
      checkPattern: "Test the completed mapping against all given clues.",
    },
    misconceptions: [
      misconception("symbol_changes_value", "Assigning a different value to the same symbol in another line.", ["Same symbol mapped twice"], "Keep a visible mapping table."),
    ],
    visualGuidance: visual("usually", ["table", "equation"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape requires an explicit mapping table before final substitution.",
  }),
  makeMethod({
    methodId: "algebra.symbol_rule.infer_apply_rule",
    familyId: "algebra.symbol_rule",
    variantId: "rule_inference",
    title: "Infer a symbol rule and apply it consistently",
    summary: "Looks across multiple symbol expressions for a stable transformation rule rather than treating each line independently.",
    status: "active",
    applicability: {
      levels: [2,3,4,5,6],
      domains: ["algebra", "logic", "patterns"],
      structures: ["symbol_mapping", "pattern_rule"],
      reasoning: ["rule_inference", "symbol_mapping", "pattern_application"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Infer the simplest rule that explains all given symbol examples, then apply the same rule to the target.",
      conceptualFocus: ["rule inference", "consistency", "testing examples"],
      prerequisiteConcepts: ["operation meaning", "pattern recognition"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("compare_examples", "notice_relationship", "Compare the given examples for an operation or transformation that remains stable.", "A valid rule must explain more than one case.", ["table", "verbal_reasoning"]),
        stage("state_candidate_rule", "reason", "State a candidate rule in words or symbols.", "The rule should be precise enough to test.", ["symbolic_working"]),
        stage("test_all_examples", "check", "Apply the candidate rule to every given example.", "One counterexample rejects the rule.", ["table"]),
        stage("apply_target", "calculate", "Use the validated rule on the target expression.", "Do not change the rule for the final item.", ["symbolic_working"]),
      ],
      representations: reps(["table"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write the rule before applying it to the target."],
      generalisationPattern: "A valid inferred rule must explain every supplied example consistently.",
      checkPattern: "Retest all source examples.",
    },
    misconceptions: [
      misconception("fit_one_example", "Choosing a rule that works for only one example.", ["Rule fails another clue"], "Require validation against all examples."),
    ],
    visualGuidance: visual("optional", ["table"]),
    officialClaimTag: "conceptual_understanding",
    dreamscapeClaim: "Dreamscape separates rule inference, validation and target application into distinct stages.",
  }),

  // ---------------------------------------------------------------------------
  // patterns.sequence_rule
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "patterns.sequence_rule.growing_difference",
    familyId: "patterns.sequence_rule",
    variantId: "growing_pattern",
    title: "Find and extend a growing number pattern",
    summary: "Examines consecutive changes, states the growth rule and uses it to extend the sequence.",
    status: "active",
    applicability: {
      levels: [1,2,3,4,5,6],
      domains: ["patterns", "whole_numbers"],
      structures: ["pattern_rule", "recursive_pattern"],
      reasoning: ["pattern_extension", "pattern_application", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify how each term changes to the next, state the rule, and use it to extend the pattern.",
      conceptualFocus: ["consecutive difference", "growth rule", "term-to-term relation"],
      prerequisiteConcepts: ["counting", "addition and subtraction"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("compare_neighbors", "notice_relationship", "Compare each pair of consecutive terms.", "The rule acts between terms.", ["table", "number_line"]),
        stage("record_changes", "represent", "Record the changes between terms.", "Repeated or patterned changes make the rule visible.", ["table"]),
        stage("state_rule", "generalise", "State the term-to-term rule precisely.", "A useful rule predicts the next term.", ["verbal_reasoning", "symbolic_working"]),
        stage("extend_and_check", "calculate", "Apply the rule to extend the sequence, then verify it against earlier terms.", "The same rule must remain consistent.", ["symbolic_working"]),
      ],
      representations: reps(["table"], ["number_line", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Record differences or operations between adjacent terms."],
      generalisationPattern: "A growing sequence can often be extended by identifying a consistent term-to-term change.",
      checkPattern: "Apply the stated rule to at least two known transitions.",
    },
    misconceptions: [
      misconception("look_only_last_pair", "Inferring a rule from only the final pair of terms.", ["Rule fails earlier transitions"], "Test the rule across multiple transitions."),
    ],
    visualGuidance: visual("usually", ["table", "number_line"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape requires the learner to state and verify the rule before extending.",
  }),
  // 4E-2B-6: P6 two-target constant-increment reasoning. This method is
  // never discovered from a generic pattern family alone; 4B candidate queries
  // must carry the independently verified term-and-total prompt evidence.
  makeMethod({
    methodId: "patterns.sequence_rule.constant_increment_term_and_total",
    familyId: "patterns.sequence_rule",
    variantId: "constant_increment_term_and_total",
    title: "Find a term and the total of a constant-increment sequence",
    summary: "Uses a verified constant difference to find a named term, then sums the full sequence without confusing a term with the total.",
    status: "active",
    applicability: {
      levels: [6],
      domains: ["patterns"],
      structures: ["pattern_rule"],
      reasoning: ["pattern_application", "addition", "multiplication"],
      // Exact legacy question-bank skill label; NOT a fuzzy curriculum inference.
      curriculumSkills: ["Number patterns and sequences"],
      exclusions: ["No confirmed constant difference", "No explicit term-and-total target", "Repeating or alternating sequence"],
    },
    pedagogy: {
      learningObjectivePattern: "Use a verified constant increment to determine a named term and the sum of every term in a finite sequence.",
      conceptualFocus: ["constant first difference", "term position", "finite sequence total", "pairing first and last terms"],
      prerequisiteConcepts: ["addition", "multiplication", "number patterns"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("verify_constant_increment", "notice_relationship", "Check the increase from the first term to the second and against the stated term-to-term rule.", "A constant increment must be justified before extending the sequence.", ["table"]),
        stage("find_requested_term", "calculate", "Count the changes before the requested position and apply the same increase to the first term.", "Position is not the number of increments from the first term.", ["table", "symbolic_working"]),
        stage("find_last_term", "calculate", "Use the full number of terms to find the last value in the finite sequence.", "The final term and the total are different quantities.", ["table", "symbolic_working"]),
        stage("sum_all_terms", "reason", "Pair the first and last terms, and use the number of terms to calculate the entire total.", "Each paired sum is equal; the number of terms controls the total.", ["table", "symbolic_working"]),
        stage("verify_both_targets", "check", "Check the requested term and the total separately against the stated increase and term count.", "Both requested results must be supported by the original sequence.", ["symbolic_working"]),
      ],
      representations: reps(["table", "symbolic_working"], ["number_line", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Label the first term, common difference, requested position, and total number of terms separately.", "Do not treat the last term as the total."],
      generalisationPattern: "For a finite arithmetic sequence, verify the constant step, find the required term and last term, then sum equally paired first and last terms.",
      checkPattern: "Reconstruct early terms from the increase and check the named term and total independently.",
    },
    misconceptions: [
      misconception("multiply_last_by_count", "Treating the last term as though every term had that size.", ["A computed total equals term count times the last value"], "Use symmetric pairs or check a short partial sum."),
      misconception("off_by_one", "Using the term position instead of the number of changes from term one.", ["Term is one increment too large"], "Count transitions between the first and required positions."),
    ],
    visualGuidance: visual("usually", ["table"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape combines named-term calculation with explicit finite-series total checking for this evidence-gated pattern method.",
  }),
  makeMethod({
    methodId: "patterns.sequence_rule.repeating_cycle",
    familyId: "patterns.sequence_rule",
    variantId: "repeating_pattern",
    title: "Identify a repeating cycle",
    summary: "Finds the smallest repeating block and uses cycle position to determine later terms.",
    status: "active",
    applicability: {
      levels: [1,2,3,4,5,6],
      domains: ["patterns", "logic"],
      structures: ["pattern_rule", "recursive_pattern"],
      reasoning: ["pattern_extension", "pattern_application", "counting"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify the smallest block that repeats and use the cycle length to extend or locate terms.",
      conceptualFocus: ["repeat unit", "cycle length", "position in cycle"],
      prerequisiteConcepts: ["counting", "pattern recognition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("mark_repeat", "represent", "Group the sequence into suspected repeating blocks.", "The repeat unit should recur unchanged.", ["diagram", "table"]),
        stage("verify_smallest_cycle", "reason", "Check that the chosen block is the smallest complete cycle.", "A cycle should explain every visible repetition.", ["table"]),
        stage("extend_or_locate", "calculate", "Repeat the block or use cycle position to find a later term.", "Positions recur modulo the cycle length.", ["table", "symbolic_working"]),
        stage("check_alignment", "check", "Compare several predicted positions with the supplied sequence.", "The cycle must stay aligned throughout.", ["table"]),
      ],
      representations: reps(["table", "diagram"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Bracket or separate one full repeat unit."],
      generalisationPattern: "In a repeating pattern, positions separated by a whole number of cycles contain corresponding terms.",
      checkPattern: "Test the repeat unit against all shown terms.",
    },
    misconceptions: [
      misconception("cycle_too_long", "Choosing several repeated blocks as though they were one fundamental cycle.", ["Repeat unit can be shortened"], "Search for the smallest block that reproduces the pattern."),
    ],
    visualGuidance: visual("usually", ["table", "diagram"]),
    officialClaimTag: "curriculum_scope",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape makes minimal repeat-unit detection explicit before position reasoning.",
  }),
  makeMethod({
    methodId: "patterns.sequence_rule.recursive_rule",
    familyId: "patterns.sequence_rule",
    variantId: "recursive_rule",
    title: "Apply a recursive sequence rule",
    summary: "Uses a stated or inferred rule that depends on previous term values and tracks each generated term explicitly.",
    status: "active",
    applicability: {
      levels: [3,4,5,6],
      domains: ["patterns", "whole_numbers", "algebra"],
      structures: ["recursive_pattern", "pattern_rule"],
      reasoning: ["pattern_application", "pattern_extension", "rule_inference"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use the previous term or terms exactly as required by a recursive rule to generate the next value.",
      conceptualFocus: ["recurrence", "dependency", "sequential generation"],
      prerequisiteConcepts: ["operation meaning", "pattern rules"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("state_dependency", "establish_meaning", "State which previous term or terms the rule uses.", "A recursive rule depends on earlier generated values.", ["verbal_reasoning", "table"]),
        stage("generate_one_step", "calculate", "Apply the rule once and record the new term.", "Each new term must use the correct predecessor values.", ["table", "symbolic_working"]),
        stage("repeat_carefully", "calculate", "Repeat the same rule sequentially for further terms.", "Generated terms become inputs to later steps.", ["table"]),
        stage("verify_known_terms", "check", "Use the rule to regenerate any supplied later term where possible.", "The recursion should reproduce known evidence.", ["symbolic_working"]),
      ],
      representations: reps(["table"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Keep term order and intermediate values explicit."],
      generalisationPattern: "A recursive sequence is generated by repeatedly applying the same dependency rule to earlier terms.",
      checkPattern: "Regenerate a known term from its predecessor(s).",
    },
    misconceptions: [
      misconception("reuse_start_term", "Applying every step to the original starting term instead of the latest generated term.", ["Sequence repeats wrong jump"], "Point arrows from each term to the next."),
    ],
    visualGuidance: visual("usually", ["table"]),
    officialClaimTag: "curriculum_scope",
    dreamscapeClaim: "Dreamscape records every recursive dependency explicitly so later teaching runtime can reveal one term at a time.",
  }),
];

export const PHASE4B3_NUMBER_ARITHMETIC_METHODS = Object.freeze(METHODS);

export const PHASE4B3_METHOD_THEME_COVERAGE: readonly Phase4B3MethodThemeCoverage[] = Object.freeze([
  { methodId: "number.place_value.place_value_chart", familyId: "number.place_value", themes: ["place-value chart"] },
  { methodId: "number.place_value.expanded_form", familyId: "number.place_value", themes: ["expanded form"] },
  { methodId: "number.place_value.compose_decompose", familyId: "number.place_value", themes: ["compose/decompose"] },
  { methodId: "number.place_value.compare_order", familyId: "number.place_value", themes: ["compare/order"] },

  { methodId: "number.add_sub.number_bonds", familyId: "number.add_sub", themes: ["number bonds"] },
  { methodId: "number.add_sub.bridge_ten", familyId: "number.add_sub", themes: ["make-ten/bridge"] },
  { methodId: "number.add_sub.regrouping_place_value", familyId: "number.add_sub", themes: ["regrouping"] },
  { methodId: "number.add_sub.column_algorithm", familyId: "number.add_sub", themes: ["column algorithm"] },
  { methodId: "number.add_sub.compensation", familyId: "number.add_sub", themes: ["compensation"] },

  { methodId: "number.mult_div.equal_groups_array", familyId: "number.mult_div", themes: ["equal groups"] },
  { methodId: "number.mult_div.sharing_grouping", familyId: "number.mult_div", themes: ["sharing", "grouping"] },
  { methodId: "number.mult_div.distributive_decomposition", familyId: "number.mult_div", themes: ["distributive decomposition"] },
  { methodId: "number.mult_div.written_algorithm", familyId: "number.mult_div", themes: ["written algorithm"] },

  { methodId: "number.factors_multiples.factor_pairs", familyId: "number.factors_multiples", themes: [] },
  { methodId: "number.factors_multiples.common_multiples_list", familyId: "number.factors_multiples", themes: ["list multiples", "common multiple"] },
  { methodId: "number.factors_multiples.cycle_alignment", familyId: "number.factors_multiples", themes: ["cycle alignment"] },

  { methodId: "arithmetic.direct.mental_calculation", familyId: "arithmetic.direct", themes: ["mental calculation"] },
  { methodId: "arithmetic.direct.written_calculation", familyId: "arithmetic.direct", themes: ["written calculation"] },
  { methodId: "arithmetic.direct.estimation_check", familyId: "arithmetic.direct", themes: ["estimation/check"] },

  { methodId: "arithmetic.operation_chain.intermediate_results", familyId: "arithmetic.operation_chain", themes: ["intermediate results", "reasonableness check"] },
  { methodId: "arithmetic.operation_chain.order_and_brackets", familyId: "arithmetic.operation_chain", themes: ["operation order"] },

  { methodId: "algebra.equation_unknown.inverse_missing_number", familyId: "algebra.equation_unknown", themes: ["missing number", "inverse operation"] },
  { methodId: "algebra.equation_unknown.balance_equation", familyId: "algebra.equation_unknown", themes: ["equation balance"] },

  { methodId: "algebra.symbol_rule.map_symbol_values", familyId: "algebra.symbol_rule", themes: ["symbol-value mapping", "consistency check"] },
  { methodId: "algebra.symbol_rule.infer_apply_rule", familyId: "algebra.symbol_rule", themes: ["rule inference"] },

  { methodId: "patterns.sequence_rule.growing_difference", familyId: "patterns.sequence_rule", themes: ["observe differences", "identify rule", "extend"] },
  { methodId: "patterns.sequence_rule.constant_increment_term_and_total", familyId: "patterns.sequence_rule", themes: [] },
  { methodId: "patterns.sequence_rule.recursive_rule", familyId: "patterns.sequence_rule", themes: ["recursive rule"] },
  { methodId: "patterns.sequence_rule.repeating_cycle", familyId: "patterns.sequence_rule", themes: [] },
]);

export function getPhase4B3MethodsByFamily(familyId: Phase4BMethodFamilyId): Readonly<TeachingMethod>[] {
  return PHASE4B3_NUMBER_ARITHMETIC_METHODS.filter((method) => method.familyId === familyId);
}

export type Phase4B3CandidateQuery = {
  learnerLevel: 1 | 2 | 3 | 4 | 5 | 6;
  domain: TeachingMethod["applicability"]["domains"][number];
  problemStructure: TeachingMethod["applicability"]["structures"][number];
  requiredReasoning: TeachingMethod["applicability"]["reasoning"];
  candidateFamilies: Phase4BMethodFamilyId[];
  /** 4E-2B-6: provided only after trusted two-target prompt validation. */
  verifiedConstantIncrementTermAndTotal?: boolean;
};

export function listPhase4B3CandidateMethods(query: Phase4B3CandidateQuery): Readonly<TeachingMethod>[] {
  const familySet = new Set(query.candidateFamilies);
  const reasoningSet = new Set(query.requiredReasoning);
  return PHASE4B3_NUMBER_ARITHMETIC_METHODS.filter((method) => {
    if (method.methodId === "patterns.sequence_rule.constant_increment_term_and_total" &&
        query.verifiedConstantIncrementTermAndTotal !== true) return false;
    if (method.methodId === "patterns.sequence_rule.repeating_cycle" &&
        query.verifiedConstantIncrementTermAndTotal === true) return false;
    if (!familySet.has(method.familyId)) return false;
    if (!method.applicability.levels.includes(query.learnerLevel)) return false;
    if (!method.applicability.domains.includes(query.domain)) return false;
    if (!method.applicability.structures.includes(query.problemStructure)) return false;
    return method.applicability.reasoning.some((reasoning) => reasoningSet.has(reasoning));
  });
}
