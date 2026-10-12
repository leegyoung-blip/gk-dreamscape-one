import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  defineTeachingMethod,
  type TeachingMethod,
  type TeachingMethodMisconception,
  type TeachingMethodStage,
  type TeachingRepresentationType,
} from "../schema";
import type { Phase4BMethodFamilyId } from "../taxonomy/types";

export type Phase4B5MethodThemeCoverage = {
  methodId: string;
  familyId: Phase4BMethodFamilyId;
  themes: string[];
};

type MethodInput = Omit<TeachingMethod, "schemaVersion" | "governance" | "provenance"> & {
  officialClaimTag?: "curriculum_scope" | "curriculum_learning_experience" | "cpa_guidance" | "problem_solving_heuristics" | "representation_selection" | "conceptual_understanding";
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
      statement: input.officialClaimStatement ?? "The primary mathematics syllabus supports conceptual understanding and purposeful mathematical representations.",
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

  return { classifications: [...new Set(classifications)], claims };
}

function makeMethod(input: MethodInput): Readonly<TeachingMethod> {
  const { officialClaimTag, officialClaimStatement, cpaClaim, dreamscapeClaim, ...method } = input;
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
  return { visualUse, preferredVisualTypes, originalDiagramPolicy: "not_required", generatedVisualAllowed };
}

export const PHASE4B5_FAMILY_IDS: readonly Phase4BMethodFamilyId[] = [
  "fraction.representation",
  "fraction.of_quantity",
  "fraction.compare_equivalence",
  "fraction.operations",
  "fraction.multi_step",
  "percentage.of_whole",
  "ratio.relationship",
  "ratio.partition",
  "rate.scaling",
] as const;

const METHOD_SEEDS = [
  {
    methodId: "fraction.representation.equal_parts_whole",
    familyId: "fraction.representation",
    variantId: "equal_parts_whole",
    title: "Represent a fraction as equal parts of one whole",
    summary: "Establishes denominator as the number of equal parts and numerator as the selected parts.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_of_whole", "fraction_representation"],
      reasoning: ["fraction_representation"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret a fraction by partitioning one whole into equal parts and identifying how many parts are selected.",
      conceptualFocus: ["equal partition", "numerator", "denominator", "one whole"],
      prerequisiteConcepts: ["equal sharing of a whole", "counting"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("name_whole", "establish_meaning", "Identify exactly what counts as one whole.", "The denominator only has meaning relative to a clearly defined whole.", ["verbal_reasoning"]),
        stage("partition_equal", "represent", "Partition the whole into the required number of equal parts.", "All denominator parts must be equal in size.", ["fraction_bar", "area_model"]),
        stage("select_parts", "notice_relationship", "Mark the required number of parts and connect the count to the numerator.", "The numerator counts selected equal parts.", ["fraction_bar", "area_model"]),
        stage("write_fraction", "generalise", "Connect the visual to fraction notation and read the fraction in words.", "Notation records selected equal parts out of the whole.", ["symbolic_working"])
      ],
      representations: reps(["fraction_bar", "area_model"], ["set_model", "number_line", "symbolic_working", "verbal_reasoning"], []),
    },
    workedPattern: {
      notationGuidance: ["Name the whole before writing the fraction.", "Keep denominator and numerator labels visually distinct."],
      generalisationPattern: "For a/b, divide one whole into b equal parts and identify a of those equal parts.",
      checkPattern: "Check that all parts are equal and that the numerator does not count unselected parts.",
    },
    misconceptions: [
      misconception("unequal_parts", "Treating unequal pieces as valid denominator parts.", ["Partitioned regions are visibly unequal", "Learner counts pieces without checking equality"], "Rebuild the whole with equal partitions before naming the fraction.")
    ],
    visualGuidance: visual("essential", ["fraction_bar", "area_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape makes the identity of the whole and equal partitioning explicit before fraction notation.",
    themes: ["part of whole", "fraction bar"],
  },
  {
    methodId: "fraction.representation.part_of_set",
    familyId: "fraction.representation",
    variantId: "part_of_set",
    title: "Represent a fraction of a set",
    summary: "Treats a collection as the whole, groups all items, and identifies the selected subset as a fraction of that set.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_representation"],
      reasoning: ["fraction_representation", "counting"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret a fraction where the whole is a set of discrete objects rather than one continuous shape.",
      conceptualFocus: ["set as whole", "selected subset", "equal counting units"],
      prerequisiteConcepts: ["counting objects", "part-whole language"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("define_set", "establish_meaning", "Identify all objects that belong to the set whole.", "The whole is the complete collection under discussion.", ["set_model"]),
        stage("count_total", "calculate", "Count the total number of objects in the set.", "The total count supplies the denominator.", ["set_model"]),
        stage("count_selected", "calculate", "Count the objects with the required property.", "The selected count supplies the numerator.", ["set_model"]),
        stage("connect_notation", "generalise", "Write and interpret the selected count over the total count.", "A fraction of a set compares selected items with the whole set.", ["symbolic_working"])
      ],
      representations: reps(["set_model"], ["table", "symbolic_working", "verbal_reasoning"], []),
    },
    workedPattern: {
      notationGuidance: ["Circle or otherwise identify the complete set before counting selected objects."],
      generalisationPattern: "A fraction of a set is selected objects divided by the total objects in that set.",
      checkPattern: "Confirm every selected object belongs to the stated whole and every whole object was counted once.",
    },
    misconceptions: [
      misconception("wrong_set_whole", "Using only the selected objects as the denominator.", ["Denominator equals numerator", "Unselected members are ignored"], "Re-identify the complete collection and count all members before counting the subset.")
    ],
    visualGuidance: visual("usually", ["set_model"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape distinguishes continuous-whole and set models so the denominator meaning stays explicit.",
    themes: ["part of set"],
  },
  {
    methodId: "fraction.representation.bar_to_number_line",
    familyId: "fraction.representation",
    variantId: "bar_to_number_line",
    title: "Connect fraction bars to number-line position",
    summary: "Moves from equal-part bar representations to locating the same fraction as a number on a number line.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_representation", "fraction_comparison"],
      reasoning: ["fraction_representation", "fraction_comparison", "ordering"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Recognise the same fraction as both a part-whole representation and a number with a position and magnitude.",
      conceptualFocus: ["fraction magnitude", "unit interval", "equivalent representations"],
      prerequisiteConcepts: ["equal parts", "number line direction"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("partition_bar", "represent", "Show the fraction on an equal-part bar.", "The bar gives a visible unit whole.", ["fraction_bar"]),
        stage("partition_unit_interval", "represent", "Partition the interval from 0 to 1 into the same number of equal steps.", "Each step is one denominator unit.", ["number_line"]),
        stage("locate_fraction", "notice_relationship", "Count numerator steps from 0 and mark the fraction.", "The number line shows fraction magnitude, not shaded area.", ["number_line"]),
        stage("compare_views", "generalise", "State how the bar and number-line positions represent the same value.", "Different representations can name the same fraction.", ["verbal_reasoning"])
      ],
      representations: reps(["fraction_bar", "number_line"], ["symbolic_working", "verbal_reasoning"], []),
    },
    workedPattern: {
      notationGuidance: ["Use 0 and 1 as anchors before locating the target fraction."],
      generalisationPattern: "A fraction can be represented as selected equal parts of a whole and as a point on the unit interval.",
      checkPattern: "Check that the interval from 0 to 1 has exactly the denominator number of equal steps.",
    },
    misconceptions: [
      misconception("count_marks_not_spaces", "Counting number-line tick marks instead of equal intervals.", ["Fraction is shifted by one interval"], "Count the spaces between 0 and 1, then count numerator intervals from 0.")
    ],
    visualGuidance: visual("essential", ["fraction_bar", "number_line"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape explicitly bridges part-whole and number-line representations before later comparison methods.",
    themes: ["number line"],
  },
  {
    methodId: "fraction.of_quantity.unit_fraction_then_scale",
    familyId: "fraction.of_quantity",
    variantId: "unit_fraction_then_scale",
    title: "Find a fraction of a quantity using one unit fraction",
    summary: "Divides the whole quantity by the denominator to find one fractional unit, then scales by the numerator.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_of_quantity"],
      reasoning: ["fraction_of_quantity", "division", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Find a fraction of a quantity by first determining one denominator-sized share and then taking the required number of shares.",
      conceptualFocus: ["unit fraction", "equal sharing", "scaling"],
      prerequisiteConcepts: ["division as equal sharing", "multiplication"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_whole_quantity", "establish_meaning", "Identify the total quantity that represents one whole.", "The calculation starts from the whole quantity.", ["verbal_reasoning"]),
        stage("find_one_part", "calculate", "Divide the whole quantity by the denominator.", "One equal share is one unit fraction of the whole.", ["equal_groups_diagram", "symbolic_working"]),
        stage("scale_numerator", "calculate", "Multiply the one-part value by the numerator.", "Take the required number of equal shares.", ["symbolic_working"]),
        stage("reasonableness", "check", "Compare the result with the whole and the fraction size.", "A proper fraction of a positive whole should be smaller than the whole.", ["verbal_reasoning"])
      ],
      representations: reps(["equal_groups_diagram", "fraction_bar"], ["symbolic_working", "set_model", "bar_model"], []),
    },
    workedPattern: {
      notationGuidance: ["Write 'one part = whole ÷ denominator' before multiplying by the numerator."],
      generalisationPattern: "a/b of Q = (Q ÷ b) × a when Q can be partitioned into b equal shares.",
      checkPattern: "Multiply the found one-part value by the denominator to recover the whole where appropriate.",
    },
    misconceptions: [
      misconception("multiply_then_divide_without_meaning", "Using a memorised operation order without identifying what one denominator part means.", ["Cannot explain intermediate value", "Uses denominator as multiplier"], "Return to equal sharing and label the one-part value before scaling.")
    ],
    visualGuidance: visual("usually", ["equal_groups_diagram", "fraction_bar"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape preserves the unit-fraction intermediate result so later runtime can reveal division before scaling.",
    themes: ["divide by denominator", "multiply by numerator", "unit fraction"],
  },
  {
    methodId: "fraction.of_quantity.set_grouping",
    familyId: "fraction.of_quantity",
    variantId: "set_grouping",
    title: "Find a fraction of a set by grouping",
    summary: "Organises discrete objects into denominator-equal groups and selects the required number of groups.",
    status: "active",
    applicability: {
      levels: [2, 3, 4],
      domains: ["fractions"],
      structures: ["fraction_of_quantity", "fraction_representation"],
      reasoning: ["fraction_of_quantity", "counting", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use equal groups of objects to connect a fractional share with a discrete quantity.",
      conceptualFocus: ["equal groups", "set model", "unit fraction"],
      prerequisiteConcepts: ["counting", "equal sharing"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("show_set", "represent", "Display or imagine the entire set as one whole collection.", "The complete set is the whole.", ["set_model"]),
        stage("make_equal_groups", "represent", "Separate the set into denominator-many equal groups.", "Each group represents one unit fraction.", ["set_model", "equal_groups_diagram"]),
        stage("take_groups", "calculate", "Select numerator-many groups and count their objects.", "The selected groups represent the target fraction.", ["set_model"]),
        stage("connect_equation", "generalise", "Connect the grouping action to division then multiplication.", "The concrete grouping and symbolic method describe the same reasoning.", ["symbolic_working"])
      ],
      representations: reps(["set_model", "equal_groups_diagram"], ["symbolic_working", "fraction_bar"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep the groups equal and show all objects exactly once."],
      generalisationPattern: "Partition the set into denominator-many equal groups, then take numerator-many groups.",
      checkPattern: "Count all groups together to confirm the original set size.",
    },
    misconceptions: [
      misconception("unequal_set_groups", "Making groups with different numbers of objects.", ["Group sizes differ"], "Redistribute objects until every denominator group has the same number.")
    ],
    visualGuidance: visual("essential", ["set_model", "equal_groups_diagram"]),
    officialClaimTag: "cpa_guidance",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses a set grouping variant for discrete quantities before abstract fraction-of-quantity working.",
    themes: ["set model"],
  },
  {
    methodId: "fraction.of_quantity.equivalent_grouping",
    familyId: "fraction.of_quantity",
    variantId: "equivalent_grouping",
    title: "Use an equivalent fraction or grouping to simplify a fraction-of-quantity calculation",
    summary: "Recognises when regrouping the quantity or simplifying the fraction makes the same share easier to calculate.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_of_quantity", "fraction_equivalence"],
      reasoning: ["fraction_of_quantity", "fraction_equivalence", "division", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Preserve the value of the fraction while choosing an equivalent grouping that makes the quantity easier to partition.",
      conceptualFocus: ["equivalent fraction", "efficient grouping", "invariance"],
      prerequisiteConcepts: ["fraction equivalence", "multiplication and division"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("inspect_factors", "notice_relationship", "Look for common factors between the fraction and the quantity.", "Shared factors can create easier equal groups.", ["symbolic_working"]),
        stage("rewrite_equivalent", "reason", "Rewrite the fraction or regroup the quantity without changing the represented share.", "Equivalent forms preserve value.", ["fraction_bar", "symbolic_working"]),
        stage("calculate_efficiently", "calculate", "Use the simplified grouping to find the required share.", "Efficient grouping should keep the same result.", ["symbolic_working"]),
        stage("verify_equivalence", "check", "Check that the rewritten fraction is equivalent to the original.", "Both forms must represent the same amount.", ["symbolic_working"])
      ],
      representations: reps(["symbolic_working"], ["fraction_bar", "bar_model", "verbal_reasoning"], []),
    },
    workedPattern: {
      notationGuidance: ["Record the equivalence step explicitly before calculating."],
      generalisationPattern: "Equivalent fractions can produce a simpler but equal route to the same fraction of a quantity.",
      checkPattern: "Compare with the unit-fraction method on a small example.",
    },
    misconceptions: [
      misconception("cancel_across_without_reason", "Cancelling numbers without preserving an equivalent relationship.", ["Equivalent fraction is not actually equal"], "State the factor used to divide or multiply numerator and denominator and verify equality.")
    ],
    visualGuidance: visual("optional", ["fraction_bar"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape permits equivalence-based efficiency only after the learner can justify why value is preserved.",
    themes: [],
  },
  {
    methodId: "fraction.compare_equivalence.same_denominator",
    familyId: "fraction.compare_equivalence",
    variantId: "same_denominator",
    title: "Compare fractions with the same denominator",
    summary: "Uses the common part size to compare only how many equal parts are taken.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_comparison"],
      reasoning: ["fraction_comparison", "ordering"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Compare fractions that have the same denominator by reasoning that their equal-part size is the same.",
      conceptualFocus: ["same-sized parts", "numerator magnitude", "ordering"],
      prerequisiteConcepts: ["fraction representation"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("confirm_same_whole", "establish_meaning", "Confirm the fractions refer to comparable wholes.", "Equal denominators only help when the wholes are comparable.", ["verbal_reasoning"]),
        stage("notice_denominator", "notice_relationship", "Recognise that the denominator gives the same part size in both fractions.", "The pieces are equally sized.", ["fraction_bar"]),
        stage("compare_numerators", "reason", "Compare how many equal parts are taken.", "More same-sized parts means a greater fraction.", ["fraction_bar", "symbolic_working"]),
        stage("order_check", "check", "Place the fractions on a number line if extra confirmation is useful.", "Number-line position should agree with the comparison.", ["number_line"])
      ],
      representations: reps(["fraction_bar"], ["number_line", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["State that the part size is the same before comparing numerators."],
      generalisationPattern: "For comparable wholes and equal denominators, the greater numerator gives the greater fraction.",
      checkPattern: "Use a fraction bar or number line to confirm the order.",
    },
    misconceptions: [
      misconception("larger_denominator_reflex", "Looking at denominator size even when denominators are already equal.", ["Comparison explanation mentions only denominator"], "Focus attention on the number of equal parts taken.")
    ],
    visualGuidance: visual("usually", ["fraction_bar", "number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape separates same-denominator comparison from unlike-denominator strategies.",
    themes: ["same denominator", "visual comparison"],
  },
  {
    methodId: "fraction.compare_equivalence.same_numerator",
    familyId: "fraction.compare_equivalence",
    variantId: "same_numerator",
    title: "Compare fractions with the same numerator",
    summary: "Uses equal selected counts to compare the size of each denominator part.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_comparison"],
      reasoning: ["fraction_comparison", "ordering"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Compare fractions with equal numerators by reasoning about the size of the equal parts.",
      conceptualFocus: ["part size", "same selected count", "inverse denominator effect"],
      prerequisiteConcepts: ["equal-part fraction meaning"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("confirm_same_numerator", "notice_relationship", "Notice that the same number of parts is selected in both fractions.", "The selected count is held constant.", ["fraction_bar"]),
        stage("compare_part_size", "reason", "Compare how large each denominator part is.", "Fewer equal divisions make larger parts of the same whole.", ["fraction_bar"]),
        stage("infer_order", "reason", "Use the part-size comparison to determine the greater fraction.", "The fraction with larger pieces is greater when the same number are taken.", ["symbolic_working"]),
        stage("number_line_check", "check", "Locate both fractions approximately on a number line.", "Their positions should match the part-size reasoning.", ["number_line"])
      ],
      representations: reps(["fraction_bar"], ["number_line", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Use the same-sized whole in both pictorial comparisons."],
      generalisationPattern: "With equal numerators and comparable wholes, the smaller denominator gives larger equal parts and therefore the greater fraction.",
      checkPattern: "Check on a number line between 0 and 1.",
    },
    misconceptions: [
      misconception("bigger_denominator_means_bigger", "Assuming a larger denominator always means a larger fraction.", ["Chooses larger denominator as greater"], "Partition identical wholes and compare the actual part sizes.")
    ],
    visualGuidance: visual("essential", ["fraction_bar", "number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape makes denominator part-size reasoning explicit for same-numerator comparisons.",
    themes: ["same numerator", "visual comparison"],
  },
  {
    methodId: "fraction.compare_equivalence.scale_equivalent",
    familyId: "fraction.compare_equivalence",
    variantId: "scale_equivalent",
    title: "Generate equivalent fractions by scaling numerator and denominator",
    summary: "Uses equal scaling of numerator and denominator to preserve the fraction value.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_equivalence"],
      reasoning: ["fraction_equivalence", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Generate and recognise equivalent fractions while preserving the represented value.",
      conceptualFocus: ["equivalence", "multiplicative scaling", "same value"],
      prerequisiteConcepts: ["multiplication facts", "fraction representation"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("show_same_value", "represent", "Use a bar or area model to show one fraction partitioned into more equal pieces without changing the shaded amount.", "More pieces can name the same amount.", ["fraction_bar", "area_model"]),
        stage("identify_factor", "notice_relationship", "Identify the common factor relating the denominators.", "The same factor must affect numerator and denominator.", ["symbolic_working"]),
        stage("scale_both", "calculate", "Multiply or divide numerator and denominator by the same non-zero factor.", "Equal scaling preserves the fraction value.", ["symbolic_working"]),
        stage("verify_visual_or_product", "check", "Check the equivalent forms visually or by another equivalence argument.", "The two fractions should name the same point/value.", ["fraction_bar", "number_line"])
      ],
      representations: reps(["fraction_bar", "area_model"], ["symbolic_working", "number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["Write the scale factor beside both numerator and denominator."],
      generalisationPattern: "Multiplying or dividing numerator and denominator by the same non-zero factor produces an equivalent fraction.",
      checkPattern: "Compare both forms on a common bar or number line.",
    },
    misconceptions: [
      misconception("scale_one_part_only", "Changing only the numerator or only the denominator.", ["Only one part of fraction is multiplied"], "Apply the same scale factor to both numerator and denominator and recheck the visual value.")
    ],
    visualGuidance: visual("usually", ["fraction_bar", "area_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape ties symbolic scaling to an unchanged represented value rather than presenting equivalence as a rule alone.",
    themes: ["equivalent fractions"],
  },
  {
    methodId: "fraction.compare_equivalence.common_denominator",
    familyId: "fraction.compare_equivalence",
    variantId: "common_denominator",
    title: "Compare unlike fractions using a common denominator",
    summary: "Converts fractions to equivalent forms with equal-sized parts before comparing their numerators.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_comparison", "fraction_equivalence"],
      reasoning: ["fraction_comparison", "fraction_equivalence", "common_multiple", "ordering"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Compare fractions with unlike denominators by creating equivalent fractions with a common denominator.",
      conceptualFocus: ["common denominator", "equivalent fractions", "common multiple"],
      prerequisiteConcepts: ["equivalent fractions", "multiples"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("choose_common_denominator", "reason", "Find a useful common multiple of the denominators.", "A common denominator creates equal-sized parts.", ["symbolic_working"]),
        stage("convert_equivalent", "calculate", "Rewrite each fraction with the chosen common denominator.", "Each conversion must preserve value.", ["symbolic_working"]),
        stage("compare_numerators", "reason", "Compare the numerators of the equivalent fractions.", "The part sizes are now the same.", ["symbolic_working"]),
        stage("sense_check", "check", "Estimate each original fraction using benchmarks such as 0, 1/2 or 1.", "The order should be reasonable.", ["number_line"])
      ],
      representations: reps(["symbolic_working"], ["fraction_bar", "number_line", "verbal_reasoning"], []),
    },
    workedPattern: {
      notationGuidance: ["Show the multiplication factor for each equivalent fraction."],
      generalisationPattern: "Unlike fractions can be compared by rewriting them with a common denominator so the equal parts have the same size.",
      checkPattern: "Use a benchmark estimate or visual representation to confirm the order.",
    },
    misconceptions: [
      misconception("common_denominator_without_equivalence", "Changing denominators without adjusting numerators.", ["Denominators match but values changed"], "Track the scale factor applied to each fraction and preserve equivalence.")
    ],
    visualGuidance: visual("usually", ["number_line", "fraction_bar"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses common denominators only after establishing why equal-sized parts are needed.",
    themes: ["common denominator"],
  },
  {
    methodId: "fraction.operations.add_sub_same_denominator",
    familyId: "fraction.operations",
    variantId: "add_sub_same_denominator",
    title: "Add or subtract fractions with the same denominator",
    summary: "Combines or removes equal-sized fractional parts while keeping the denominator unit unchanged.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_addition", "fraction_subtraction"],
      reasoning: ["fraction_addition", "fraction_subtraction", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Add or subtract fractions with a common denominator by operating on the number of equal parts.",
      conceptualFocus: ["fraction unit", "common denominator", "combine/remove parts"],
      prerequisiteConcepts: ["fraction representation", "addition and subtraction"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("name_fraction_unit", "establish_meaning", "Identify the common denominator as the shared fraction unit.", "All terms count the same-sized parts.", ["fraction_bar"]),
        stage("combine_or_remove", "calculate", "Add or subtract the numerators while keeping the common denominator.", "Only the number of equal parts changes.", ["symbolic_working"]),
        stage("represent_result", "represent", "Show the resulting number of equal parts on a bar if useful.", "The operation has a visible part-whole meaning.", ["fraction_bar"]),
        stage("simplify_check", "check", "Simplify if appropriate and check against the visual or magnitude.", "The result should match the operation direction.", ["symbolic_working"])
      ],
      representations: reps(["fraction_bar"], ["symbolic_working", "number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["State the common fraction unit before combining numerators."],
      generalisationPattern: "When denominators are equal, add or subtract the numerators and keep the denominator before simplifying.",
      checkPattern: "Estimate the result and verify with a fraction bar when helpful.",
    },
    misconceptions: [
      misconception("add_denominators", "Adding denominators as if both numerator and denominator were independent counts.", ["Writes denominator sum"], "Return to equal-sized parts: the size of each part does not change when parts are combined.")
    ],
    visualGuidance: visual("usually", ["fraction_bar"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape treats same-denominator operations as counting a common fraction unit.",
    themes: ["add/subtract"],
  },
  {
    methodId: "fraction.operations.add_sub_unlike_denominator",
    familyId: "fraction.operations",
    variantId: "add_sub_unlike_denominator",
    title: "Add or subtract fractions with unlike denominators",
    summary: "Creates a common fraction unit before combining or removing parts.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_addition", "fraction_subtraction"],
      reasoning: ["fraction_addition", "fraction_subtraction", "fraction_equivalence", "common_multiple"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use equivalent fractions to express unlike fractions in a common unit before adding or subtracting.",
      conceptualFocus: ["common fraction unit", "equivalence", "common denominator"],
      prerequisiteConcepts: ["fraction equivalence", "multiples"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_unlike_units", "notice_relationship", "Notice that the original denominators represent different-sized parts.", "Different units cannot be combined directly.", ["fraction_bar"]),
        stage("create_common_unit", "reason", "Choose a common denominator and rewrite each fraction equivalently.", "Now all parts have the same size.", ["symbolic_working"]),
        stage("operate_numerators", "calculate", "Add or subtract the numerators of the equivalent fractions.", "Count the common fraction units.", ["symbolic_working"]),
        stage("simplify_and_check", "check", "Simplify and compare the result with an estimate.", "The answer should be consistent with the original magnitudes.", ["number_line"])
      ],
      representations: reps(["fraction_bar", "symbolic_working"], ["number_line", "area_model"], []),
    },
    workedPattern: {
      notationGuidance: ["Do not operate until the fractions have the same-sized denominator parts."],
      generalisationPattern: "For unlike denominators, first rewrite equivalent fractions with a common denominator, then operate on the numerators.",
      checkPattern: "Estimate each operand and the expected result before finalising.",
    },
    misconceptions: [
      misconception("operate_before_common_unit", "Adding or subtracting numerators before denominators represent the same part size.", ["Numerators combined immediately"], "Use a bar model to show why different-sized parts need a common unit.")
    ],
    visualGuidance: visual("usually", ["fraction_bar", "number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape inserts an explicit common-unit stage before symbolic addition or subtraction.",
    themes: ["add/subtract", "simplify/check"],
  },
  {
    methodId: "fraction.operations.multiply_fraction",
    familyId: "fraction.operations",
    variantId: "multiply_fraction",
    title: "Interpret and calculate multiplication involving fractions",
    summary: "Treats multiplication as taking a fraction of another quantity or fraction before applying the product rule.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["fractions"],
      structures: ["fraction_multiplication"],
      reasoning: ["fraction_multiplication", "fraction_of_quantity", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret fraction multiplication as taking a fractional part and connect that meaning to multiplying numerators and denominators.",
      conceptualFocus: ["fraction of fraction", "area model", "multiplicative scaling"],
      prerequisiteConcepts: ["fraction of quantity", "multiplication"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("interpret_of", "establish_meaning", "Read multiplication by a fraction as taking a fraction of the other factor where appropriate.", "Multiplication scales a quantity.", ["verbal_reasoning"]),
        stage("show_area_or_bar", "represent", "Represent one fraction of another using an area model or nested bar.", "The overlap or nested portion shows the product.", ["area_model", "fraction_bar"]),
        stage("connect_product_rule", "calculate", "Connect the representation to multiplying numerators and denominators, simplifying where appropriate.", "The symbolic rule matches the scaled area/length.", ["symbolic_working"]),
        stage("magnitude_check", "check", "Check whether the product should be smaller or larger than the starting quantity.", "Multiplying by a proper fraction reduces a positive quantity.", ["number_line"])
      ],
      representations: reps(["area_model", "fraction_bar"], ["symbolic_working", "number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["State which quantity is being scaled by which fraction."],
      generalisationPattern: "Multiplying by a fraction scales a quantity; for fractions a/b × c/d, the product is ac/bd before simplification.",
      checkPattern: "Use magnitude reasoning and simplification to verify the result.",
    },
    misconceptions: [
      misconception("product_rule_without_scale_meaning", "Applying numerator-times-numerator and denominator-times-denominator without understanding the scaling.", ["Cannot predict whether product should increase or decrease"], "Return to a fraction-of-fraction area or bar model and compare the product size with the starting amount.")
    ],
    visualGuidance: visual("essential", ["area_model", "fraction_bar"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape links fraction multiplication procedure to scaling before abstract computation.",
    themes: ["multiply"],
  },
  {
    methodId: "fraction.operations.divide_fraction",
    familyId: "fraction.operations",
    variantId: "divide_fraction",
    title: "Interpret and calculate division involving fractions",
    summary: "Connects division to how many groups of the divisor fit into the dividend, then links to an equivalent reciprocal procedure.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["fractions"],
      structures: ["fraction_division"],
      reasoning: ["fraction_division", "division", "fraction_equivalence"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret division by a fraction as measuring or grouping and connect the interpretation to an efficient symbolic procedure.",
      conceptualFocus: ["measurement division", "group size", "equivalent scaling"],
      prerequisiteConcepts: ["division meaning", "fraction equivalence"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("state_grouping_question", "establish_meaning", "Ask how many groups of the divisor fit into the dividend.", "The divisor is the group size.", ["fraction_bar", "number_line"]),
        stage("represent_groups", "represent", "Partition or mark repeated divisor-sized groups within the dividend where feasible.", "The quotient counts groups.", ["fraction_bar", "number_line"]),
        stage("connect_equivalent_scaling", "reason", "Scale both dividend and divisor by the same factor to create an equivalent whole-number divisor when useful.", "Equivalent scaling preserves the quotient.", ["symbolic_working"]),
        stage("calculate_and_check", "calculate", "Complete the division and check by multiplying quotient by divisor.", "The inverse multiplication should recover the dividend.", ["symbolic_working"])
      ],
      representations: reps(["fraction_bar", "number_line"], ["symbolic_working", "bar_model"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep the divisor visible as the size of one group."],
      generalisationPattern: "Division asks how many divisor-sized groups fit in the dividend; equivalent scaling can transform the calculation without changing the quotient.",
      checkPattern: "Multiply quotient by divisor to recover the dividend.",
    },
    misconceptions: [
      misconception("flip_without_meaning", "Reciting invert-and-multiply without knowing which fraction is the divisor or what the quotient counts.", ["Reciprocal applied to wrong fraction"], "Return to the grouping question and identify the divisor as one group size before transforming the calculation.")
    ],
    visualGuidance: visual("essential", ["fraction_bar", "number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape teaches fraction division from grouping/equivalent-scaling meaning before any reciprocal shortcut.",
    themes: ["divide"],
  },
  {
    methodId: "fraction.operations.mixed_numbers",
    familyId: "fraction.operations",
    variantId: "mixed_numbers",
    title: "Operate with mixed numbers by separating or converting wholes and fractional parts",
    summary: "Maintains whole-number and fractional-unit meaning while adding, subtracting, multiplying or dividing mixed numbers.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_addition", "fraction_subtraction", "fraction_multiplication", "fraction_division"],
      reasoning: ["fraction_addition", "fraction_subtraction", "fraction_multiplication", "fraction_division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Handle mixed numbers by choosing a representation that keeps whole units and fractional units consistent.",
      conceptualFocus: ["whole-plus-fraction", "improper fraction", "regrouping"],
      prerequisiteConcepts: ["fraction equivalence", "whole number operations"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("choose_form", "reason", "Decide whether separate whole/fraction parts or an improper fraction will make the operation clearer.", "The form should support the operation, not hide meaning.", ["fraction_bar", "symbolic_working"]),
        stage("align_units", "represent", "Ensure fractional parts use compatible units before addition or subtraction, or convert appropriately for multiplication/division.", "The chosen representation must preserve value.", ["symbolic_working"]),
        stage("operate", "calculate", "Carry out the operation, regrouping wholes or fractional parts when necessary.", "Whole and fractional quantities remain linked.", ["symbolic_working"]),
        stage("convert_check", "check", "Convert the final form if needed and verify its magnitude.", "The result should be equivalent in either mixed or improper form.", ["number_line"])
      ],
      representations: reps(["symbolic_working"], ["fraction_bar", "number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["Write the conversion or regrouping step explicitly."],
      generalisationPattern: "Mixed numbers may be treated as whole-plus-fraction quantities or converted to equivalent improper fractions depending on the operation.",
      checkPattern: "Convert the result to another equivalent form or estimate its size.",
    },
    misconceptions: [
      misconception("lose_whole_part", "Operating only on the fractional part and ignoring the whole number.", ["Whole-number component disappears"], "Represent the mixed number on a bar or number line to keep the whole units visible.")
    ],
    visualGuidance: visual("usually", ["fraction_bar", "number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape makes form choice explicit instead of applying one conversion rule to every mixed-number problem.",
    themes: ["mixed numbers"],
  },
  {
    methodId: "fraction.operations.simplify_and_check",
    familyId: "fraction.operations",
    variantId: "simplify_and_check",
    title: "Simplify a fraction result and check its magnitude",
    summary: "Uses common factors to express the same fraction in simplest form and verifies the result against the original operation.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_addition", "fraction_subtraction", "fraction_multiplication", "fraction_division"],
      reasoning: ["fraction_equivalence", "fraction_comparison", "common_multiple"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Express a fraction answer in an equivalent simpler form and verify that simplification does not change its value.",
      conceptualFocus: ["common factor", "equivalent fraction", "magnitude check"],
      prerequisiteConcepts: ["factor knowledge", "fraction equivalence"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("inspect_common_factor", "notice_relationship", "Look for a common factor of numerator and denominator.", "A common factor allows equal scaling down.", ["symbolic_working"]),
        stage("divide_both", "calculate", "Divide numerator and denominator by the same common factor.", "The value stays unchanged.", ["symbolic_working"]),
        stage("repeat_if_needed", "calculate", "Continue until no common factor greater than 1 remains.", "Simplest form has no further common factor.", ["symbolic_working"]),
        stage("magnitude_check", "check", "Compare the simplified value with the unsimplified value or expected range.", "Simplification changes form, not value.", ["number_line"])
      ],
      representations: reps(["symbolic_working"], ["fraction_bar", "number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["Record the common factor used for each simplification step."],
      generalisationPattern: "A fraction is simplified by dividing numerator and denominator by common factors while preserving value.",
      checkPattern: "Check equivalence and whether the final magnitude is reasonable.",
    },
    misconceptions: [
      misconception("divide_unequally", "Dividing numerator and denominator by different factors.", ["Simplified value changes"], "Use one shared factor for numerator and denominator and verify equivalence.")
    ],
    visualGuidance: visual("optional", ["number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: false,
    dreamscapeClaim: "Dreamscape treats simplification as an equivalence-preserving check stage, not merely formatting.",
    themes: ["simplify/check"],
  },
  {
    methodId: "fraction.multi_step.remaining_fraction",
    familyId: "fraction.multi_step",
    variantId: "remaining_fraction",
    title: "Track a remaining fraction after part is used",
    summary: "Represents the original whole, removes a stated fraction, and treats the remainder explicitly before later steps.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_multi_step"],
      reasoning: ["fraction_multi_step", "fraction_subtraction", "fraction_of_quantity"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Determine and preserve the remaining fraction of the original whole before using it in a later calculation.",
      conceptualFocus: ["original whole", "used fraction", "remaining fraction"],
      prerequisiteConcepts: ["fraction subtraction", "part-whole"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("fix_original_whole", "establish_meaning", "Identify the original whole and keep it fixed for this stage.", "All stated fractions must be tied to a clear whole.", ["bar_model", "fraction_bar"]),
        stage("mark_used_part", "represent", "Show the fraction removed or used.", "The used part belongs to the original whole.", ["fraction_bar"]),
        stage("find_remainder_fraction", "calculate", "Subtract the used fraction from one whole.", "The remaining fraction is what is left of the original whole.", ["symbolic_working"]),
        stage("carry_forward", "generalise", "Label the remainder clearly before using it in the next step.", "Later fractions may refer either to this remainder or the original whole, so labels matter.", ["bar_model"])
      ],
      representations: reps(["bar_model", "fraction_bar"], ["symbolic_working", "verbal_reasoning"], []),
    },
    workedPattern: {
      notationGuidance: ["Write 'of original' or 'of remaining' beside fraction labels."],
      generalisationPattern: "If a fraction f of the original whole is used, 1 − f remains of that same original whole.",
      checkPattern: "Used fraction plus remaining fraction should equal 1.",
    },
    misconceptions: [
      misconception("wrong_reference_whole", "Treating a later fraction as though it refers to the original whole when it refers to the remainder, or vice versa.", ["Fractions are combined despite different reference wholes"], "Relabel every fraction with its reference whole before calculating.")
    ],
    visualGuidance: visual("essential", ["bar_model", "fraction_bar"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape requires explicit reference-whole labels at each multi-step fraction stage.",
    themes: ["remaining fraction"],
  },
  {
    methodId: "fraction.multi_step.changing_whole",
    familyId: "fraction.multi_step",
    variantId: "changing_whole",
    title: "Track when the reference whole changes",
    summary: "Separates stages where a fraction is taken from a remainder or newly defined quantity, preventing fractions with different wholes from being combined directly.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_multi_step"],
      reasoning: ["fraction_multi_step", "fraction_of_quantity", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Recognise that the reference whole can change between stages and rebase each fraction accordingly.",
      conceptualFocus: ["reference whole", "stage dependency", "rebase fraction"],
      prerequisiteConcepts: ["fraction of quantity", "multi-step reasoning"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("label_stage_whole", "establish_meaning", "Label the quantity that acts as one whole at the current stage.", "A fraction only has meaning relative to its current whole.", ["bar_model"]),
        stage("apply_fraction", "calculate", "Find the required fraction of that stage whole.", "This creates the next-stage quantity.", ["fraction_bar", "symbolic_working"]),
        stage("rebase_next_stage", "represent", "Treat the resulting quantity as the new whole only if the wording does so.", "The next fraction may use a different reference base.", ["bar_model"]),
        stage("verify_dependencies", "check", "Trace each stage back to the quantity it depends on.", "Every fraction should have one unambiguous reference whole.", ["verbal_reasoning"])
      ],
      representations: reps(["bar_model", "fraction_bar"], ["symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Annotate each stage with W0, W1 or descriptive whole labels."],
      generalisationPattern: "In multi-stage fraction problems, each stated fraction must be applied to its own reference whole, which may change between stages.",
      checkPattern: "Trace every fraction arrow back to the correct stage quantity.",
    },
    misconceptions: [
      misconception("combine_different_wholes", "Adding or comparing fractions that refer to different wholes as if they shared a denominator context.", ["Directly combines stage fractions"], "Return to the stage diagram and label each whole separately before any algebra.")
    ],
    visualGuidance: visual("essential", ["bar_model", "fraction_bar"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape formalises changing-whole tracking as a reusable multi-stage fraction method.",
    themes: ["changing whole", "multi-stage model"],
  },
  {
    methodId: "fraction.multi_step.fraction_of_fraction",
    familyId: "fraction.multi_step",
    variantId: "fraction_of_fraction",
    title: "Resolve a fraction of a fraction within a multi-step problem",
    summary: "Uses nested part-whole reasoning so a fraction of an already fractional quantity is interpreted as multiplicative scaling.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_multi_step", "fraction_multiplication"],
      reasoning: ["fraction_multi_step", "fraction_multiplication", "fraction_of_quantity"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret a nested fractional statement as a fraction of an already identified fractional quantity.",
      conceptualFocus: ["nested fraction", "scaling", "fraction of fraction"],
      prerequisiteConcepts: ["fraction of quantity", "multiplication"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("identify_outer_part", "represent", "Show the first fraction of the original whole.", "This defines the intermediate quantity.", ["fraction_bar"]),
        stage("partition_intermediate", "represent", "Partition that intermediate quantity according to the second denominator.", "The second fraction acts on the intermediate amount.", ["area_model", "fraction_bar"]),
        stage("select_nested_part", "calculate", "Take the required second numerator share and connect the nested visual to multiplication.", "The nested fraction is a scaled portion of a portion.", ["area_model", "symbolic_working"]),
        stage("compare_original", "check", "Express the final part relative to the original whole and check its size.", "A proper fraction of a proper fraction is smaller than either starting whole share.", ["fraction_bar"])
      ],
      representations: reps(["area_model", "fraction_bar"], ["symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep the outer and inner partitions visually distinct."],
      generalisationPattern: "A fraction of a fraction is multiplicative scaling: c/d of a/b equals ac/bd of the original whole.",
      checkPattern: "Check that the final part fits inside the first fractional part.",
    },
    misconceptions: [
      misconception("add_nested_fractions", "Adding the two fractions instead of interpreting 'of' multiplicatively.", ["Final part exceeds the first part"], "Use nested shading to show that the second fraction is taken within the first region.")
    ],
    visualGuidance: visual("essential", ["area_model", "fraction_bar"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses nested representation before symbolic multiplication in multi-step fraction contexts.",
    themes: ["fraction of fraction", "multi-stage model"],
  },
  {
    methodId: "fraction.multi_step.dependency_model",
    familyId: "fraction.multi_step",
    variantId: "dependency_model",
    title: "Build a multi-stage fraction dependency model",
    summary: "Breaks a complex fraction problem into labelled intermediate quantities and orders calculations by dependency.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["fractions"],
      structures: ["fraction_multi_step", "multi_step"],
      reasoning: ["fraction_multi_step", "addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Decompose a multi-step fraction problem into intermediate targets while preserving the whole and dependency at each stage.",
      conceptualFocus: ["subgoals", "dependency order", "intermediate quantity"],
      prerequisiteConcepts: ["basic fraction operations", "problem decomposition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("list_subgoals", "reason", "Identify the intermediate quantities that must be known before the final target can be found.", "The final answer depends on earlier results.", ["verbal_reasoning", "table"]),
        stage("draw_dependencies", "represent", "Connect each subgoal to the quantity or fraction it uses.", "Arrows show calculation order and reference wholes.", ["bar_model", "table"]),
        stage("solve_in_order", "calculate", "Compute each intermediate value only after its dependencies are known.", "Do not skip unresolved stages.", ["symbolic_working"]),
        stage("synthesise", "generalise", "Combine the intermediate results to answer the final target and summarise the chain.", "The final solution should show why each step was necessary.", ["symbolic_working", "verbal_reasoning"])
      ],
      representations: reps(["bar_model", "table"], ["symbolic_working", "fraction_bar"], []),
    },
    workedPattern: {
      notationGuidance: ["Give every intermediate result a short label and preserve units/whole reference."],
      generalisationPattern: "A multi-stage fraction solution is a dependency chain of justified intermediate quantities, not a single unstructured operation string.",
      checkPattern: "Read the dependency chain backwards from the final target and verify every required input exists.",
    },
    misconceptions: [
      misconception("operation_chain_without_structure", "Writing several operations in one expression without preserving what each intermediate value represents.", ["Cannot label intermediate results"], "Name each intermediate quantity and connect it to the story before continuing.")
    ],
    visualGuidance: visual("usually", ["bar_model", "table"]),
    officialClaimTag: "problem_solving_heuristics",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape represents multi-step fraction reasoning as explicit subgoals and dependencies before final synthesis.",
    themes: ["multi-stage model"],
  },
  {
    methodId: "percentage.of_whole.per_hundred_model",
    familyId: "percentage.of_whole",
    variantId: "per_hundred_model",
    title: "Interpret percentage as parts per hundred",
    summary: "Uses a hundred grid or equivalent partition to connect percentage notation with hundredths of a whole.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["percentage"],
      structures: ["percentage_of_whole"],
      reasoning: ["percentage", "fraction_representation"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret a percentage as a number of equal hundredths of one whole.",
      conceptualFocus: ["per hundred", "hundredths", "whole"],
      prerequisiteConcepts: ["fractions", "place value"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("define_whole", "establish_meaning", "Identify the quantity or region that represents 100%.", "Percentage is relative to one whole.", ["verbal_reasoning"]),
        stage("partition_hundred", "represent", "Use a hundred grid or equivalent model to show 100 equal parts.", "Each part represents 1%.", ["area_model"]),
        stage("mark_percent", "represent", "Shade or identify the required number of hundredths.", "The numeral before % counts hundredths.", ["area_model"]),
        stage("connect_notation", "generalise", "Connect p% with p/100 and decimal notation where appropriate.", "Percentage, fraction and decimal forms can name the same value.", ["symbolic_working"])
      ],
      representations: reps(["area_model"], ["fraction_bar", "number_line", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep the 100% whole explicit in every representation."],
      generalisationPattern: "p% means p parts out of 100 equal parts of the stated whole.",
      checkPattern: "Convert p% to p/100 and compare with the model.",
    },
    misconceptions: [
      misconception("percent_as_raw_number", "Treating p% as p times the whole rather than p hundredths.", ["50% interpreted as 50×"], "Return to the hundred grid and identify 1% as one hundredth.")
    ],
    visualGuidance: visual("essential", ["area_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape anchors percentage notation in a 100-part whole before procedural calculation.",
    themes: ["per hundred"],
  },
  {
    methodId: "percentage.of_whole.fraction_decimal_percent",
    familyId: "percentage.of_whole",
    variantId: "fraction_decimal_percent",
    title: "Connect fractions, decimals and percentages",
    summary: "Uses equivalent representations to move between a fraction, a decimal and a percentage without changing value.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["percentage", "fractions", "decimals"],
      structures: ["percentage_of_whole", "fraction_equivalence"],
      reasoning: ["percentage", "fraction_equivalence", "place_value_reasoning"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Translate among fraction, decimal and percentage representations while preserving the same magnitude.",
      conceptualFocus: ["equivalence", "hundredths", "place value"],
      prerequisiteConcepts: ["fraction equivalence", "decimal place value"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("anchor_hundredths", "represent", "Express the value in hundredths where convenient.", "Hundredths connect decimals and percentages directly.", ["area_model", "place_value_chart"]),
        stage("convert_fraction", "calculate", "Rewrite the fraction as an equivalent hundredths fraction or decimal where appropriate.", "Equivalent forms preserve value.", ["symbolic_working"]),
        stage("convert_decimal", "calculate", "Use place value to connect the decimal with hundredths and percentage notation.", "0.35 = 35 hundredths = 35%.", ["place_value_chart", "symbolic_working"]),
        stage("check_magnitude", "check", "Place equivalent forms on a number line or compare with benchmark values.", "All forms should occupy the same position.", ["number_line"])
      ],
      representations: reps(["place_value_chart", "area_model"], ["number_line", "symbolic_working", "fraction_bar"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep an equals chain between equivalent forms."],
      generalisationPattern: "Fractions, decimals and percentages can be different names for the same rational value.",
      checkPattern: "Use benchmark values such as 1/2 = 0.5 = 50%.",
    },
    misconceptions: [
      misconception("move_decimal_without_meaning", "Moving decimal digits mechanically without connecting to hundredths.", ["Conversion direction errors"], "Rebuild the value using a place-value chart or hundred grid.")
    ],
    visualGuidance: visual("usually", ["place_value_chart", "area_model", "number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape connects fraction-decimal-percentage conversion through shared value and place value, not a direction-only rule.",
    themes: ["fraction-decimal-percentage connection"],
  },
  {
    methodId: "percentage.of_whole.percentage_of_quantity",
    familyId: "percentage.of_whole",
    variantId: "percentage_of_quantity",
    title: "Find a percentage of a quantity",
    summary: "Uses 1%, 10%, benchmark fractions or decimal scaling to determine the requested percentage of a whole quantity.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["percentage"],
      structures: ["percentage_of_whole", "unitary"],
      reasoning: ["percentage", "rate_scaling", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Find a percentage of a quantity using a transparent per-hundred, benchmark or unitary strategy.",
      conceptualFocus: ["one percent", "benchmark percentage", "proportional scaling"],
      prerequisiteConcepts: ["percentage meaning", "multiplication and division"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_whole", "establish_meaning", "Identify the quantity that represents 100%.", "All percentage parts are measured against this whole.", ["bar_model"]),
        stage("choose_benchmark", "reason", "Choose an efficient route such as 10%, 1%, 50%, 25% or direct decimal/fraction scaling.", "Different percentages can be composed from known benchmarks.", ["ratio_table", "bar_model"]),
        stage("scale_target", "calculate", "Scale the whole to the required percentage.", "The proportional relationship must remain consistent.", ["symbolic_working", "ratio_table"]),
        stage("magnitude_check", "check", "Compare the result with the size of the percentage and the original whole.", "A percentage below 100% should give a smaller positive amount.", ["verbal_reasoning"])
      ],
      representations: reps(["ratio_table", "bar_model"], ["symbolic_working", "double_number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["Label the original quantity as 100% before any scaling."],
      generalisationPattern: "A percentage of a quantity is a proportional share of the 100% whole.",
      checkPattern: "Estimate using a nearby benchmark percentage.",
    },
    misconceptions: [
      misconception("wrong_percent_whole", "Applying the percentage to the wrong base quantity.", ["Uses an intermediate quantity as 100% without justification"], "Relabel the 100% base explicitly and trace the target percentage from it.")
    ],
    visualGuidance: visual("usually", ["ratio_table", "bar_model", "double_number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape treats the 100% base as an explicit quantity before unitary or benchmark scaling.",
    themes: ["percentage of quantity"],
  },
  {
    methodId: "ratio.relationship.ratio_units",
    familyId: "ratio.relationship",
    variantId: "ratio_units",
    title: "Represent a ratio using equal units",
    summary: "Shows each ratio term as a count of equal units so relative quantities are visible before scaling.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["ratio"],
      structures: ["ratio_relationship"],
      reasoning: ["ratio_scaling", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret a ratio as counts of equal-sized units comparing two or more related quantities.",
      conceptualFocus: ["ratio unit", "relative comparison", "ordered terms"],
      prerequisiteConcepts: ["multiplication", "comparison"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("name_terms", "establish_meaning", "State what each ratio term refers to and preserve its order.", "Ratio order carries meaning.", ["verbal_reasoning"]),
        stage("draw_equal_units", "represent", "Represent each term with equal-sized units or segments.", "Every unit represents the same amount within the comparison.", ["bar_model"]),
        stage("compare_unit_counts", "notice_relationship", "Compare the number of units for each quantity.", "The ratio compares relative amounts, not absolute values.", ["bar_model"]),
        stage("write_ratio", "generalise", "Connect the unit counts to ratio notation.", "The notation records the ordered unit comparison.", ["symbolic_working"])
      ],
      representations: reps(["bar_model"], ["ratio_table", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Write labels above each ratio bar so term order cannot be swapped."],
      generalisationPattern: "A ratio compares quantities by equal units in a specified order.",
      checkPattern: "Scale every ratio term by the same factor and confirm the relationship remains equivalent.",
    },
    misconceptions: [
      misconception("unequal_ratio_units", "Drawing ratio units with different sizes.", ["Bar segments differ in width despite equal unit meaning"], "Redraw using one fixed unit size for all ratio terms.")
    ],
    visualGuidance: visual("essential", ["bar_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape begins ratio teaching with equal-unit representation and explicit term order.",
    themes: ["ratio units", "part-part"],
  },
  {
    methodId: "ratio.relationship.equivalent_ratio_scale",
    familyId: "ratio.relationship",
    variantId: "equivalent_ratio_scale",
    title: "Generate equivalent ratios using a common scale factor",
    summary: "Scales every ratio term by the same factor to preserve the relationship.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["ratio"],
      structures: ["ratio_relationship"],
      reasoning: ["ratio_scaling", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Create or recognise equivalent ratios by applying the same multiplicative scale factor to every term.",
      conceptualFocus: ["equivalent ratio", "scale factor", "multiplicative relationship"],
      prerequisiteConcepts: ["multiplication and division", "ratio units"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("compare_terms", "notice_relationship", "Look for a common multiplicative relationship between corresponding ratio terms.", "Equivalent ratios preserve relative scale.", ["ratio_table"]),
        stage("state_scale_factor", "reason", "State the scale factor explicitly.", "The same factor must apply to every ratio term.", ["ratio_table", "symbolic_working"]),
        stage("scale_all_terms", "calculate", "Multiply or divide every term by the same factor.", "Partial scaling changes the ratio.", ["symbolic_working"]),
        stage("verify_equivalence", "check", "Reduce or rescale both ratios to a common simple form.", "Equivalent ratios should match after consistent scaling.", ["ratio_table"])
      ],
      representations: reps(["ratio_table"], ["bar_model", "symbolic_working", "double_number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["Write the same multiplier or divisor beside every ratio term."],
      generalisationPattern: "Equivalent ratios are produced by scaling all ratio terms by the same non-zero factor.",
      checkPattern: "Reduce both ratios to the same simplest unit ratio when possible.",
    },
    misconceptions: [
      misconception("scale_one_term", "Changing only one term of the ratio.", ["Resulting ratio no longer preserves relationship"], "Apply the scale factor across the entire ratio row or bar model.")
    ],
    visualGuidance: visual("usually", ["ratio_table", "bar_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape exposes the common scale factor before equivalent-ratio calculation.",
    themes: ["equivalent ratio", "scale factor"],
  },
  {
    methodId: "ratio.relationship.part_whole_connection",
    familyId: "ratio.relationship",
    variantId: "part_whole_connection",
    title: "Connect part-part and part-whole ratios",
    summary: "Uses a ratio-unit model to distinguish comparison between parts from comparison of a part with the total.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["ratio"],
      structures: ["ratio_relationship"],
      reasoning: ["ratio_scaling", "addition", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Convert between part-part and part-whole interpretations by identifying the total number of equal ratio units.",
      conceptualFocus: ["part-part", "part-whole", "total units"],
      prerequisiteConcepts: ["addition", "ratio units"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("label_parts", "represent", "Draw separate equal-unit bars for the compared parts.", "Each part has its own unit count.", ["bar_model"]),
        stage("find_total_units", "calculate", "Add the part unit counts to obtain the whole-unit count.", "The whole is composed of all ratio parts.", ["bar_model", "symbolic_working"]),
        stage("state_part_whole", "generalise", "Express each part relative to the total units when a part-whole ratio is required.", "Part-whole and part-part ratios answer different comparisons.", ["symbolic_working"]),
        stage("check_labels", "check", "Confirm the ratio terms match the quantities named in the question.", "Correct numbers in the wrong order still give a wrong ratio.", ["verbal_reasoning"])
      ],
      representations: reps(["bar_model"], ["ratio_table", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep a bracket over all part bars when identifying the whole."],
      generalisationPattern: "For part ratio a:b, the whole contains a+b equal units, so each part can also be compared with a+b.",
      checkPattern: "Reconstruct the original part-part ratio from the part-whole statements.",
    },
    misconceptions: [
      misconception("part_part_equals_part_whole", "Treating a:b as though the second term were automatically the whole.", ["Uses b as total instead of a+b"], "Use the bar model to count all units in the whole.")
    ],
    visualGuidance: visual("essential", ["bar_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape distinguishes part-part from part-whole ratio through total-unit construction.",
    themes: ["part-whole"],
  },
  {
    methodId: "ratio.relationship.scale_table",
    familyId: "ratio.relationship",
    variantId: "scale_table",
    title: "Use a ratio table or double number line to scale relationships",
    summary: "Organises equivalent ratio pairs in columns so both quantities scale together.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["ratio"],
      structures: ["ratio_relationship"],
      reasoning: ["ratio_scaling", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use a ratio table or double number line to preserve a proportional relationship while scaling to a target quantity.",
      conceptualFocus: ["corresponding values", "scale factor", "proportional pairs"],
      prerequisiteConcepts: ["equivalent ratio", "multiplication and division"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("enter_known_pair", "represent", "Place one known ratio pair in aligned rows or number lines.", "Corresponding quantities occupy the same column or position.", ["ratio_table", "double_number_line"]),
        stage("choose_scale", "reason", "Determine a useful scale factor from known to target.", "Both quantities must scale together.", ["ratio_table"]),
        stage("fill_target_pair", "calculate", "Apply the scale factor to the corresponding quantity.", "The table preserves the same ratio.", ["ratio_table", "symbolic_working"]),
        stage("cross_check", "check", "Compare the resulting pair with the original unit ratio.", "Both pairs should reduce to the same relationship.", ["ratio_table"])
      ],
      representations: reps(["ratio_table", "double_number_line"], ["bar_model", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep corresponding quantity labels on the same row."],
      generalisationPattern: "Equivalent ratio pairs can be generated by scaling both quantities by the same factor in a ratio table.",
      checkPattern: "Reduce both pairs to the same unit ratio.",
    },
    misconceptions: [
      misconception("misaligned_columns", "Pairing a scaled value with the wrong corresponding quantity.", ["Rows/columns no longer correspond"], "Relabel rows and trace one column as one complete ratio pair.")
    ],
    visualGuidance: visual("usually", ["ratio_table", "double_number_line"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses aligned ratio tables as a deterministic representation for proportional scaling.",
    themes: [],
  },
  {
    methodId: "ratio.partition.total_units",
    familyId: "ratio.partition",
    variantId: "total_units",
    title: "Partition a total according to a ratio",
    summary: "Adds ratio units, finds the value of one unit, and scales each share.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["ratio"],
      structures: ["ratio_partition"],
      reasoning: ["ratio_scaling", "addition", "division", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Divide a known total into shares in a given ratio using equal ratio units.",
      conceptualFocus: ["total units", "one unit", "share value"],
      prerequisiteConcepts: ["ratio units", "division and multiplication"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("count_total_units", "calculate", "Add all ratio terms to find the total number of equal units.", "The total is split into this many equal ratio units.", ["bar_model", "symbolic_working"]),
        stage("find_one_unit", "calculate", "Divide the total quantity by the total number of units.", "One unit now has an actual value.", ["bar_model", "symbolic_working"]),
        stage("find_each_share", "calculate", "Multiply the one-unit value by each ratio term.", "Each share is its unit count times one unit value.", ["symbolic_working"]),
        stage("sum_check", "check", "Add the shares and confirm they recover the given total.", "All partitioned shares must recombine to the whole.", ["symbolic_working"])
      ],
      representations: reps(["bar_model"], ["ratio_table", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Write 'total units' and '1 unit' as separate lines."],
      generalisationPattern: "For total T divided in ratio a:b: total units = a+b, one unit = T/(a+b), shares = a and b units.",
      checkPattern: "Add all found shares to recover the total.",
    },
    misconceptions: [
      misconception("divide_by_one_term", "Dividing the total by one ratio term instead of the sum of all ratio units.", ["One share exceeds total or recombination fails"], "Count all equal units across every part before dividing the total.")
    ],
    visualGuidance: visual("essential", ["bar_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape keeps total-unit and one-unit stages explicit in ratio partitioning.",
    themes: ["total units", "one unit", "partition total"],
  },
  {
    methodId: "ratio.partition.difference_units",
    familyId: "ratio.partition",
    variantId: "difference_units",
    title: "Use difference in ratio units to find actual values",
    summary: "Relates a known numerical difference to the difference between ratio-unit counts, then finds one unit.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["ratio"],
      structures: ["ratio_partition", "comparison_difference"],
      reasoning: ["ratio_scaling", "comparison", "subtraction", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Determine actual quantities from a ratio and a known difference by matching the numerical difference to ratio-unit difference.",
      conceptualFocus: ["difference in units", "one unit", "comparison"],
      prerequisiteConcepts: ["ratio units", "subtraction", "division"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("compare_unit_counts", "represent", "Draw or list the ratio parts and identify the difference in their unit counts.", "The unequal portion is a known number of equal units.", ["bar_model"]),
        stage("match_known_difference", "notice_relationship", "Match the stated numerical difference to the extra ratio units.", "The story difference corresponds to the bar difference.", ["bar_model"]),
        stage("find_unit_value", "calculate", "Divide the known difference by the difference in ratio units.", "This gives one ratio unit.", ["symbolic_working"]),
        stage("scale_quantities", "calculate", "Multiply the unit value by each ratio term and check the difference.", "Actual values should reproduce both the ratio and the known difference.", ["symbolic_working"])
      ],
      representations: reps(["bar_model"], ["symbolic_working", "ratio_table"], []),
    },
    workedPattern: {
      notationGuidance: ["Mark the excess units distinctly from the equal aligned portion."],
      generalisationPattern: "Known difference ÷ difference in ratio units gives the value of one ratio unit.",
      checkPattern: "Check both the ratio relationship and the stated numerical difference.",
    },
    misconceptions: [
      misconception("use_total_units_for_difference", "Dividing the known difference by the total ratio units.", ["Values satisfy total-style partition but not stated difference"], "Align the bars and count only the unmatched extra units.")
    ],
    visualGuidance: visual("essential", ["bar_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses aligned ratio bars to expose the unit difference before calculation.",
    themes: ["difference in units"],
  },
  {
    methodId: "ratio.partition.known_part_to_whole",
    familyId: "ratio.partition",
    variantId: "known_part_to_whole",
    title: "Use a known ratio part to recover other parts or the whole",
    summary: "Maps a known actual quantity to its ratio-unit count, finds one unit, then reconstructs related quantities.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["ratio"],
      structures: ["ratio_partition", "ratio_relationship"],
      reasoning: ["ratio_scaling", "division", "multiplication", "addition"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use the actual value of one ratio part to determine the unit value and scale to other parts or the total.",
      conceptualFocus: ["known part", "one unit", "reconstruction"],
      prerequisiteConcepts: ["ratio units", "division and multiplication"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("match_known_part", "establish_meaning", "Identify which ratio term corresponds to the known actual quantity.", "The correct term-value pairing is essential.", ["bar_model"]),
        stage("find_one_unit", "calculate", "Divide the known quantity by its ratio-unit count.", "This determines the common unit value.", ["symbolic_working"]),
        stage("scale_other_parts", "calculate", "Multiply the unit value by the other ratio terms.", "All parts use the same unit value.", ["symbolic_working"]),
        stage("reconstruct_whole", "check", "Add parts if the whole is required and verify the original known part.", "The reconstructed relationship should preserve the ratio.", ["bar_model", "symbolic_working"])
      ],
      representations: reps(["bar_model"], ["ratio_table", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Label the known actual amount directly under its ratio segment."],
      generalisationPattern: "Known part ÷ its ratio-unit count gives one unit, which can be scaled to every related part.",
      checkPattern: "Recalculate the known part from the unit value.",
    },
    misconceptions: [
      misconception("attach_known_to_wrong_term", "Matching the known quantity to the wrong ratio term.", ["All scaled values preserve a ratio but not the story labels"], "Relabel quantities and ratio terms before finding one unit.")
    ],
    visualGuidance: visual("usually", ["bar_model"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape treats known-part ratio problems as a unit-value reconstruction rather than generic proportion solving.",
    themes: [],
  },
  {
    methodId: "rate.scaling.one_unit_rate",
    familyId: "rate.scaling",
    variantId: "one_unit_rate",
    title: "Find and use a one-unit rate",
    summary: "Divides paired quantities to determine the amount per one unit, then uses that rate to answer related questions.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["ratio", "speed_rate", "measurement", "money"],
      structures: ["unitary", "ratio_relationship", "speed_distance_time"],
      reasoning: ["rate_scaling", "division", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret a rate as one quantity per one unit of another quantity and use it for scaling.",
      conceptualFocus: ["per-unit rate", "corresponding quantities", "unit meaning"],
      prerequisiteConcepts: ["division", "multiplication", "units"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("name_rate_units", "establish_meaning", "State the two quantities and the desired 'per one' unit.", "A rate compares unlike quantities with units.", ["verbal_reasoning"]),
        stage("find_one_unit", "calculate", "Divide to find the amount corresponding to one unit.", "The quotient carries compound or per-unit meaning.", ["unit_rate_table", "symbolic_working"]),
        stage("scale_target", "calculate", "Multiply or divide using the one-unit rate to reach the target quantity.", "The same rate is preserved.", ["unit_rate_table", "symbolic_working"]),
        stage("unit_check", "check", "Check that the resulting units match the target and that the scale direction is sensible.", "Units help catch inverted rates.", ["verbal_reasoning"])
      ],
      representations: reps(["unit_rate_table"], ["double_number_line", "ratio_table", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Write the rate with both units, such as dollars per item or kilometres per hour."],
      generalisationPattern: "A one-unit rate expresses how much of one quantity corresponds to exactly one unit of another.",
      checkPattern: "Multiply the rate by the known count to reconstruct the paired quantity.",
    },
    misconceptions: [
      misconception("invert_rate", "Dividing in the wrong direction and creating the reciprocal rate.", ["Units are reversed"], "Write the target rate units before choosing the division order.")
    ],
    visualGuidance: visual("usually", ["unit_rate_table", "double_number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape makes rate units explicit before scaling so reciprocal-rate errors can be detected.",
    themes: ["one-unit rate"],
  },
  {
    methodId: "rate.scaling.scale_factor",
    familyId: "rate.scaling",
    variantId: "scale_factor",
    title: "Scale a rate relationship by a multiplicative factor",
    summary: "Moves from one known pair to another by applying the same factor to both quantities.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["ratio", "speed_rate", "measurement", "money"],
      structures: ["unitary", "ratio_relationship", "speed_distance_time"],
      reasoning: ["rate_scaling", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use a multiplicative scale factor to preserve a constant rate between corresponding quantity pairs.",
      conceptualFocus: ["scale factor", "constant rate", "correspondence"],
      prerequisiteConcepts: ["multiplication and division", "rate meaning"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("write_known_pair", "represent", "Place the known related quantities as one pair.", "The pair is one instance of the rate relationship.", ["ratio_table"]),
        stage("find_factor", "reason", "Determine the factor needed to move one known quantity to the target quantity.", "Scaling may be up or down.", ["ratio_table"]),
        stage("apply_both", "calculate", "Apply the same factor to the corresponding paired quantity.", "Both quantities change proportionally.", ["ratio_table", "symbolic_working"]),
        stage("check_constant_rate", "check", "Compare the per-unit rate before and after scaling.", "The rate should remain unchanged.", ["unit_rate_table"])
      ],
      representations: reps(["ratio_table"], ["double_number_line", "unit_rate_table", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Show the scale factor between aligned columns."],
      generalisationPattern: "For a constant rate, multiplying one quantity by a factor requires multiplying the corresponding quantity by the same factor.",
      checkPattern: "Compute the unit rate from both pairs and compare.",
    },
    misconceptions: [
      misconception("scale_only_one_quantity", "Changing only one side of the relationship.", ["Unit rate differs after scaling"], "Apply the scale factor to the entire pair, not a single value.")
    ],
    visualGuidance: visual("usually", ["ratio_table", "unit_rate_table"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape exposes constant-rate scaling as paired multiplicative change.",
    themes: ["scale factor"],
  },
  {
    methodId: "rate.scaling.proportional_table",
    familyId: "rate.scaling",
    variantId: "proportional_table",
    title: "Use a proportional table to organise multiple rate pairs",
    summary: "Builds a table of equivalent quantity pairs using unit rates, doubling, halving or other convenient factors.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["ratio", "speed_rate", "measurement", "money"],
      structures: ["unitary", "ratio_relationship", "speed_distance_time"],
      reasoning: ["rate_scaling", "multiplication", "division", "addition"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Organise and extend a constant-rate relationship across several aligned quantity pairs.",
      conceptualFocus: ["proportional table", "equivalent pairs", "efficient scaling"],
      prerequisiteConcepts: ["rate meaning", "multiplication and division"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("label_rows", "represent", "Label each row with its quantity and unit.", "Row labels preserve meaning.", ["ratio_table"]),
        stage("enter_known_pair", "represent", "Enter the known pair in one column.", "Each column represents corresponding values.", ["ratio_table"]),
        stage("build_useful_pairs", "calculate", "Create useful equivalent pairs by finding one unit, doubling, halving or combining known columns.", "Every new column must preserve the same rate.", ["ratio_table"]),
        stage("select_target", "check", "Use the column matching the target and verify its unit rate.", "The target pair should be proportional to all others.", ["unit_rate_table"])
      ],
      representations: reps(["ratio_table"], ["unit_rate_table", "double_number_line", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep one quantity per row and corresponding values in the same column."],
      generalisationPattern: "A proportional table contains equivalent quantity pairs that all share the same rate.",
      checkPattern: "Compute the same unit rate from more than one column.",
    },
    misconceptions: [
      misconception("add_noncorresponding_values", "Combining values from different columns or rows without preserving proportional correspondence.", ["New column has inconsistent rate"], "Rebuild the table so each column is one complete corresponding pair.")
    ],
    visualGuidance: visual("usually", ["ratio_table", "unit_rate_table"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses proportional tables as a structured rate representation before later strategy selection.",
    themes: ["proportional table"],
  },
  {
    methodId: "number.place_value.decimal_place_value_chart",
    familyId: "number.place_value",
    variantId: "decimal_place_value_chart",
    title: "Build decimal place-value meaning",
    summary: "Extends place-value structure across the decimal point using tenths, hundredths and thousandths as required.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["decimals"],
      structures: ["place_value", "number_composition", "number_decomposition"],
      reasoning: ["place_value_reasoning"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Interpret each decimal digit according to its place value and connect decimal positions to fractional units.",
      conceptualFocus: ["decimal point", "tenths", "hundredths", "place value"],
      prerequisiteConcepts: ["whole-number place value", "fractions as tenths/hundredths"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("show_chart", "represent", "Place the digits in a chart extending from ones to tenths, hundredths and beyond as appropriate.", "Each step right is one tenth of the previous place.", ["place_value_chart"]),
        stage("name_digit_values", "notice_relationship", "State the value represented by each digit.", "A digit's value depends on its position.", ["place_value_chart", "verbal_reasoning"]),
        stage("connect_fraction_units", "generalise", "Connect tenths and hundredths to fractions and decimal notation.", "Decimal places are fractional place-value units.", ["symbolic_working"]),
        stage("recompose", "check", "Add the place values to reconstruct the original decimal.", "The expanded values should recombine exactly.", ["symbolic_working"])
      ],
      representations: reps(["place_value_chart"], ["fraction_bar", "symbolic_working", "number_line"], []),
    },
    workedPattern: {
      notationGuidance: ["Keep the decimal point fixed between ones and tenths."],
      generalisationPattern: "Moving one place to the right divides the place value by 10; moving left multiplies it by 10.",
      checkPattern: "Recompose the decimal from its expanded place values.",
    },
    misconceptions: [
      misconception("digit_value_equals_digit", "Treating a digit as having the same value in every decimal place.", ["Says 5 in 0.05 means five tenths"], "Return to the place-value chart and name the column before the digit value.")
    ],
    visualGuidance: visual("essential", ["place_value_chart"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape extends the existing number.place_value family to decimal place value without changing the locked 4B-1 taxonomy.",
    themes: [],
  },
  {
    methodId: "number.place_value.decimal_compare_order",
    familyId: "number.place_value",
    variantId: "decimal_compare_order",
    title: "Compare and order decimals using place value",
    summary: "Aligns decimal points and compares corresponding place values from greatest to least.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["decimals"],
      structures: ["place_value"],
      reasoning: ["place_value_reasoning", "ordering", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Compare decimal values by aligning common place values and locating the first place where the digits differ.",
      conceptualFocus: ["place-value alignment", "decimal magnitude", "ordering"],
      prerequisiteConcepts: ["decimal place value"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("align_decimals", "represent", "Align decimal points or place values before comparison.", "Digits must be compared in corresponding places.", ["place_value_chart"]),
        stage("compare_left_to_right", "reason", "Compare the greatest place value first and continue right until a difference appears.", "The first unequal place determines the order.", ["place_value_chart"]),
        stage("use_zeros_if_helpful", "represent", "Add trailing zeros only as place-value placeholders when useful.", "Trailing zeros do not change the decimal value.", ["symbolic_working"]),
        stage("number_line_check", "check", "Place approximate values on a number line to confirm the order.", "Position should agree with place-value comparison.", ["number_line"])
      ],
      representations: reps(["place_value_chart"], ["number_line", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Never compare decimals by digit count alone."],
      generalisationPattern: "Decimals are compared by corresponding place values, not by the number of written digits.",
      checkPattern: "Use a number line or benchmark whole numbers/tenths.",
    },
    misconceptions: [
      misconception("longer_decimal_is_larger", "Assuming a decimal with more digits is automatically larger.", ["Chooses 0.125 over 0.9 because 125 > 9"], "Align the decimal points and compare tenths before hundredths or thousandths.")
    ],
    visualGuidance: visual("usually", ["place_value_chart", "number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape adds a decimal-specific comparison variant to the existing number.place_value family.",
    themes: [],
  },
  {
    methodId: "arithmetic.direct.decimal_add_sub",
    familyId: "arithmetic.direct",
    variantId: "decimal_add_sub",
    title: "Add and subtract decimals by aligned place values",
    summary: "Aligns like decimal places, operates column by column, and interprets regrouping through decimal place value.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["decimals"],
      structures: ["direct_calculation"],
      reasoning: ["addition", "subtraction", "place_value_reasoning"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Add or subtract decimals by aligning equivalent place values and regrouping according to base-ten structure.",
      conceptualFocus: ["aligned places", "regrouping", "decimal point"],
      prerequisiteConcepts: ["decimal place value", "addition and subtraction"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("align_places", "represent", "Write the numbers with decimal points aligned so like place values share columns.", "Tenths combine with tenths, hundredths with hundredths.", ["written_algorithm", "place_value_chart"]),
        stage("operate_columns", "calculate", "Add or subtract from the smallest required place to the largest, regrouping when necessary.", "Regrouping follows base-ten place value.", ["written_algorithm"]),
        stage("place_decimal", "calculate", "Keep the decimal point aligned in the result.", "The result's places correspond to the aligned columns.", ["written_algorithm"]),
        stage("estimate_check", "check", "Estimate using nearby whole numbers or tenths to check reasonableness.", "The exact answer should be close to the estimate.", ["mental_strategy"])
      ],
      representations: reps(["written_algorithm", "place_value_chart"], ["symbolic_working", "mental_strategy"], []),
    },
    workedPattern: {
      notationGuidance: ["Align decimal points before starting the algorithm."],
      generalisationPattern: "Decimal addition and subtraction operate on like place values just as whole-number column methods do.",
      checkPattern: "Estimate before or after the exact calculation.",
    },
    misconceptions: [
      misconception("align_last_digits", "Aligning the final written digits instead of the decimal points.", ["Tenths placed under hundredths"], "Use a place-value chart to align each digit with the same unit.")
    ],
    visualGuidance: visual("usually", ["place_value_chart"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape extends direct arithmetic to decimal addition/subtraction through place-value alignment.",
    themes: [],
  },
  {
    methodId: "arithmetic.direct.decimal_mult_div",
    familyId: "arithmetic.direct",
    variantId: "decimal_mult_div",
    title: "Multiply or divide decimals with place-value scaling",
    summary: "Connects decimal multiplication or division to whole-number calculation and the place-value effect of scaling.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["decimals"],
      structures: ["direct_calculation"],
      reasoning: ["multiplication", "division", "place_value_reasoning", "estimation"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Calculate decimal multiplication or division while explaining how place value determines the magnitude of the result.",
      conceptualFocus: ["place-value scaling", "whole-number relationship", "magnitude"],
      prerequisiteConcepts: ["decimal place value", "multiplication and division"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("estimate_magnitude", "reason", "Estimate the expected size of the result before calculating.", "Magnitude helps determine whether decimal placement is sensible.", ["mental_strategy"]),
        stage("relate_whole_numbers", "reason", "Relate the calculation to an equivalent whole-number fact or scaled form.", "Scaling can simplify the arithmetic while preserving structure.", ["symbolic_working"]),
        stage("calculate", "calculate", "Perform the multiplication or division using a level-appropriate written or mental method.", "The arithmetic and place-value scaling must both be accounted for.", ["written_algorithm", "symbolic_working"]),
        stage("restore_check_place_value", "check", "Use the estimate and inverse operation to verify the decimal magnitude.", "A correct digit sequence with the wrong magnitude is still incorrect.", ["mental_strategy"])
      ],
      representations: reps(["symbolic_working", "mental_strategy"], ["written_algorithm", "place_value_chart"], []),
    },
    workedPattern: {
      notationGuidance: ["Write an estimate first so decimal placement has a magnitude target."],
      generalisationPattern: "Decimal multiplication and division can be related to whole-number facts, but the place-value scale determines the final magnitude.",
      checkPattern: "Use an inverse operation or estimate to check decimal placement.",
    },
    misconceptions: [
      misconception("place_decimal_by_count_only", "Placing the decimal mechanically without checking magnitude or operation meaning.", ["Answer differs from estimate by factor 10 or 100"], "Return to the estimate and place-value scaling relationship.")
    ],
    visualGuidance: visual("optional", ["place_value_chart"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape treats decimal multiplication/division as arithmetic plus explicit magnitude reasoning.",
    themes: [],
  },
  {
    methodId: "arithmetic.direct.decimal_estimation_check",
    familyId: "arithmetic.direct",
    variantId: "decimal_estimation_check",
    title: "Estimate and check decimal calculations",
    summary: "Uses rounding and benchmark values to predict a reasonable result and detect place-value errors.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["decimals"],
      structures: ["direct_calculation"],
      reasoning: ["estimation", "place_value_reasoning"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use decimal benchmarks and rounding to judge whether an exact decimal calculation is reasonable.",
      conceptualFocus: ["rounding", "benchmark", "reasonableness"],
      prerequisiteConcepts: ["decimal place value"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("choose_precision", "reason", "Choose a rounding precision appropriate to the question.", "The estimate should be simple but informative.", ["mental_strategy"]),
        stage("round_values", "calculate", "Round the decimal quantities using place-value reasoning.", "Keep track of whether each value moves up or down.", ["mental_strategy"]),
        stage("estimate", "calculate", "Calculate with the rounded values.", "The estimate provides a target range.", ["mental_strategy"]),
        stage("compare_exact", "check", "Compare the exact result with the estimate and investigate large discrepancies.", "A place-value error often differs by a power of ten.", ["verbal_reasoning"])
      ],
      representations: reps(["mental_strategy"], ["number_line", "symbolic_working"], []),
    },
    workedPattern: {
      notationGuidance: ["Record the rounded values before the estimated operation."],
      generalisationPattern: "A useful decimal estimate uses nearby benchmark values to predict the approximate magnitude of the exact result.",
      checkPattern: "Compare exact and estimated answers in both direction and scale.",
    },
    misconceptions: [
      misconception("estimate_as_exact", "Reporting the rounded estimate as though it were the exact answer.", ["No exact calculation follows estimate"], "Label estimates with ≈ and use them only as a reasonableness check unless estimation is the target.")
    ],
    visualGuidance: visual("optional", ["number_line"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: false,
    dreamscapeClaim: "Dreamscape adds a decimal-specific estimation/check variant to the existing arithmetic.direct family.",
    themes: [],
  }
] as const;

const METHODS: Readonly<TeachingMethod>[] = METHOD_SEEDS.map((seed) => {
  const { themes: _themes, ...method } = seed;
  return makeMethod(method as unknown as MethodInput);
});

export const PHASE4B5_RATIONAL_NUMBER_METHODS = Object.freeze(METHODS);

export const PHASE4B5_METHOD_THEME_COVERAGE: readonly Phase4B5MethodThemeCoverage[] = Object.freeze(
  METHOD_SEEDS.map((seed) => ({
    methodId: seed.methodId,
    familyId: seed.familyId,
    themes: [...seed.themes],
  })),
);

export const PHASE4B5_DECIMAL_METHOD_IDS = Object.freeze(
  PHASE4B5_RATIONAL_NUMBER_METHODS
    .filter((method) => method.applicability.domains.includes("decimals"))
    .map((method) => method.methodId),
);

export function getPhase4B5MethodsByFamily(familyId: Phase4BMethodFamilyId): Readonly<TeachingMethod>[] {
  return PHASE4B5_RATIONAL_NUMBER_METHODS.filter((method) => method.familyId === familyId);
}

export type Phase4B5CandidateQuery = {
  learnerLevel: 1 | 2 | 3 | 4 | 5 | 6;
  domain: TeachingMethod["applicability"]["domains"][number];
  problemStructure: TeachingMethod["applicability"]["structures"][number];
  requiredReasoning: TeachingMethod["applicability"]["reasoning"];
  candidateFamilies: Phase4BMethodFamilyId[];
};

export function listPhase4B5CandidateMethods(query: Phase4B5CandidateQuery): Readonly<TeachingMethod>[] {
  const familySet = new Set(query.candidateFamilies);
  const reasoningSet = new Set(query.requiredReasoning);
  return PHASE4B5_RATIONAL_NUMBER_METHODS.filter((method) => {
    if (!familySet.has(method.familyId)) return false;
    if (!method.applicability.levels.includes(query.learnerLevel)) return false;
    if (!method.applicability.domains.includes(query.domain)) return false;
    if (!method.applicability.structures.includes(query.problemStructure)) return false;
    return method.applicability.reasoning.some((reasoning) => reasoningSet.has(reasoning));
  });
}
