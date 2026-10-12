import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  defineTeachingMethod,
  type TeachingMethod,
  type TeachingMethodMisconception,
  type TeachingMethodStage,
  type TeachingRepresentationType,
} from "../schema";
import type { Phase4BMethodFamilyId } from "../taxonomy/types";

export type Phase4B4MethodThemeCoverage = {
  methodId: string;
  familyId: Phase4BMethodFamilyId;
  themes: string[];
};

type MethodInput = Omit<TeachingMethod, "schemaVersion" | "governance" | "provenance"> & {
  officialClaimTag?: "problem_solving_heuristics" | "representation_selection" | "conceptual_understanding" | "curriculum_learning_experience";
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
      statement: input.officialClaimStatement ?? "The primary mathematics syllabus supports purposeful representation and problem-solving heuristics.",
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

const ALL_LEVELS: Array<1 | 2 | 3 | 4 | 5 | 6> = [1, 2, 3, 4, 5, 6];

const METHODS: Readonly<TeachingMethod>[] = [
  // ---------------------------------------------------------------------------
  // model.part_whole
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "model.part_whole.known_whole_find_part",
    familyId: "model.part_whole",
    variantId: "known_whole_find_part",
    title: "Represent a known whole and find the missing part",
    summary: "Shows the known whole split into known and unknown parts so the missing part is exposed before calculation.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "arithmetic", "money", "measurement"],
      structures: ["part_whole", "missing_part"],
      reasoning: ["addition", "subtraction", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify the whole and known part, represent both, and determine the missing part from their relationship.",
      conceptualFocus: ["part-part-whole", "conservation of total", "inverse relationship"],
      prerequisiteConcepts: ["addition and subtraction meaning", "whole and part language"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_whole", "establish_meaning", "Name the total quantity as the whole before calculating.", "The whole is the complete amount.", ["verbal_reasoning"]),
        stage("represent_parts", "represent", "Draw or generate one strip for the whole and partition it into the known and unknown parts.", "The parts together must match the whole.", ["bar_model", "strip_diagram"]),
        stage("find_missing", "calculate", "Use the whole-minus-known-part relationship to determine the missing part.", "The unknown part completes the whole.", ["symbolic_working"]),
        stage("recombine_check", "check", "Recombine the known and found parts to recover the whole.", "The parts must total the original whole.", ["symbolic_working"]),
      ],
      representations: reps(["bar_model", "strip_diagram"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Label the whole and each part before writing the equation.", "Keep the unknown segment visibly distinct."],
      generalisationPattern: "If whole = part A + part B, then a missing part is whole minus the known part.",
      checkPattern: "Add the parts and confirm the whole.",
    },
    misconceptions: [
      misconception("part_whole_swap", "Treating a part as though it were the whole.", ["Subtracts the larger label from a smaller part", "Bar total shorter than a labelled part"], "Return to the story and identify the complete collection before partitioning it."),
    ],
    visualGuidance: visual("usually", ["bar_model", "strip_diagram"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses a stable whole-first strip representation before exposing the inverse calculation.",
  }),
  makeMethod({
    methodId: "model.part_whole.parts_find_whole",
    familyId: "model.part_whole",
    variantId: "parts_find_whole",
    title: "Combine known parts to find the whole",
    summary: "Represents two or more known parts as adjacent segments and combines them to determine the whole.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "arithmetic", "money", "measurement"],
      structures: ["part_whole"],
      reasoning: ["addition"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Recognise that the whole is formed by combining all non-overlapping parts.",
      conceptualFocus: ["composition", "total", "non-overlapping parts"],
      prerequisiteConcepts: ["addition", "part-whole language"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_parts", "establish_meaning", "List the quantities that are parts of the same whole.", "Only quantities belonging to the same whole should be combined.", ["verbal_reasoning"]),
        stage("join_segments", "represent", "Place the parts side by side under one whole bracket or strip.", "Adjacent segments compose one total.", ["bar_model", "strip_diagram"]),
        stage("combine", "calculate", "Add the part values to obtain the whole.", "The whole is the sum of its parts.", ["symbolic_working"]),
        stage("sense_check", "check", "Confirm that the whole is at least as large as every individual part.", "A whole cannot be smaller than one of its parts.", ["verbal_reasoning"]),
      ],
      representations: reps(["bar_model", "strip_diagram"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Use one segment per distinct part.", "Avoid overlapping segments unless the story explicitly overlaps quantities."],
      generalisationPattern: "A whole formed from non-overlapping parts equals the sum of those parts.",
      checkPattern: "Compare the total with each part and re-add once.",
    },
    misconceptions: [
      misconception("omit_part", "Leaving out one relevant part when forming the total.", ["Calculated total equals only two of three stated parts"], "Match every relevant story quantity to one strip segment before calculating."),
    ],
    visualGuidance: visual("usually", ["bar_model", "strip_diagram"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape composes explicit adjacent segments before the abstract total equation.",
  }),
  makeMethod({
    methodId: "model.part_whole.multi_part_strip",
    familyId: "model.part_whole",
    variantId: "multi_part_strip",
    title: "Use a multi-part strip for several related parts",
    summary: "Extends part-whole representation to several labelled parts while keeping one stable whole.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "money", "measurement"],
      structures: ["part_whole", "multi_step"],
      reasoning: ["addition", "subtraction", "comparison"],
      curriculumSkills: [],
      exclusions: ["Do not use where quantities are not parts of one common total."],
    },
    pedagogy: {
      learningObjectivePattern: "Organise several parts under one whole so the required subtotal or missing part can be identified without losing relationships.",
      conceptualFocus: ["multi-part composition", "subtotals", "structural organisation"],
      prerequisiteConcepts: ["two-part whole model", "addition and subtraction"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("map_story_parts", "represent", "Map each relevant quantity to one labelled segment of a single strip.", "Every part has a place in the common whole.", ["strip_diagram"]),
        stage("mark_target", "notice_relationship", "Mark which segment, subtotal or whole is required.", "The target determines which relationship to calculate.", ["strip_diagram"]),
        stage("calculate_needed", "calculate", "Combine or subtract only the segments needed for the target.", "Use structure rather than all numbers at once.", ["symbolic_working"]),
        stage("reconcile", "check", "Verify that all labelled parts reconcile with the whole.", "The complete strip remains internally consistent.", ["strip_diagram", "symbolic_working"]),
      ],
      representations: reps(["strip_diagram"], ["bar_model", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Label each segment before writing equations.", "Use braces or subtotals only when they correspond to meaningful grouped parts."],
      generalisationPattern: "A multi-part whole can be solved by selecting the subset of part relationships relevant to the target.",
      checkPattern: "Reconstruct the complete strip total.",
    },
    misconceptions: [
      misconception("combine_unrelated", "Combining quantities that do not belong to the same whole.", ["Strip mixes different times or groups"], "Re-read the nouns and time states, then keep separate wholes separate."),
    ],
    visualGuidance: visual("usually", ["strip_diagram", "bar_model"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape uses multi-part strips only when the question establishes one coherent whole.",
  }),

  // ---------------------------------------------------------------------------
  // model.comparison
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "model.comparison.aligned_bars_difference",
    familyId: "model.comparison",
    variantId: "aligned_bars_difference",
    title: "Align comparison bars to expose the difference",
    summary: "Places two quantities on a shared baseline so equal portions align and the excess segment represents the difference.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "arithmetic", "money", "measurement", "data", "ratio", "fractions", "decimals", "average"],
      structures: ["comparison_difference", "data_comparison", "measure_compare", "transfer_difference", "ratio_relationship"],
      reasoning: ["comparison", "subtraction", "ratio_scaling", "data_interpretation"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Compare two quantities by aligning their common portion and identifying the unmatched difference.",
      conceptualFocus: ["common portion", "difference", "more and less"],
      prerequisiteConcepts: ["quantity comparison", "subtraction meaning"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_two_quantities", "establish_meaning", "Name the two quantities being compared and identify which is larger if the story states it.", "The comparison is between like quantities.", ["verbal_reasoning"]),
        stage("align_bars", "represent", "Draw equal starting baselines and represent each quantity with an aligned bar.", "The overlapping length is the common portion.", ["bar_model"]),
        stage("mark_difference", "notice_relationship", "Mark the unmatched segment as the difference or 'more/less' amount.", "Only the unmatched part distinguishes the quantities.", ["bar_model"]),
        stage("calculate_difference", "calculate", "Use subtraction or the stated relation to determine the unmatched segment.", "Difference is larger minus smaller when both values are known.", ["symbolic_working"]),
      ],
      representations: reps(["bar_model"], ["strip_diagram", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Align bar starts before marking the difference.", "Label 'more' or 'less' on the unmatched segment rather than on the whole bar."],
      generalisationPattern: "For like quantities, the difference is the non-overlapping portion after their common amount is aligned.",
      checkPattern: "Smaller quantity + difference should equal the larger quantity.",
    },
    misconceptions: [
      misconception("difference_as_total", "Treating the stated difference as one complete quantity.", ["Labels the whole longer bar with the difference"], "Move the difference label to only the unmatched segment."),
    ],
    visualGuidance: visual("usually", ["bar_model"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape standardises comparison bars on a common baseline so the difference is visually isolated.",
  }),
  makeMethod({
    methodId: "model.comparison.more_less_unknown",
    familyId: "model.comparison",
    variantId: "more_less_unknown",
    title: "Solve more-than and less-than comparisons with an unknown quantity",
    summary: "Uses an aligned comparison model when one quantity is described as a fixed amount more or less than another.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "arithmetic", "money", "measurement"],
      structures: ["comparison_difference"],
      reasoning: ["comparison", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Translate more-than or less-than language into an aligned quantity plus or minus a difference segment.",
      conceptualFocus: ["relational language", "reference quantity", "unknown compared quantity"],
      prerequisiteConcepts: ["comparison bars", "addition and subtraction"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("choose_reference", "establish_meaning", "Identify the reference quantity named after 'than'.", "The relation is measured from the reference quantity.", ["verbal_reasoning"]),
        stage("build_relation", "represent", "Copy the reference length and attach or remove the stated difference according to more/less language.", "More extends; less shortens.", ["bar_model"]),
        stage("solve_unknown", "calculate", "Apply the matching addition or subtraction to find the unknown quantity.", "Operation follows the represented relation, not a keyword alone.", ["symbolic_working"]),
        stage("read_back", "check", "Read the completed model back as a sentence and confirm the relation.", "The numerical result must satisfy the original comparison statement.", ["verbal_reasoning"]),
      ],
      representations: reps(["bar_model"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Identify the reference quantity explicitly before choosing an operation."],
      generalisationPattern: "A quantity described as d more than a reference is reference + d; d less is reference - d.",
      checkPattern: "Recompute the stated difference between the two completed quantities.",
    },
    misconceptions: [
      misconception("keyword_reversal", "Choosing subtraction for 'less' or addition for 'more' without identifying which quantity is unknown.", ["Operation contradicts bar direction"], "Identify the reference and unknown first, then read the completed relation."),
    ],
    visualGuidance: visual("usually", ["bar_model"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape requires a reference-quantity step before applying more/less arithmetic.",
  }),
  makeMethod({
    methodId: "model.comparison.unit_comparison",
    familyId: "model.comparison",
    variantId: "unit_comparison",
    title: "Compare quantities by equal units",
    summary: "Represents compared quantities as equal-sized units when the relationship is multiplicative rather than a fixed additive difference.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["whole_numbers", "ratio", "fractions", "money"],
      structures: ["ratio_relationship", "comparison_difference"],
      reasoning: ["comparison", "ratio_scaling", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: ["Use additive comparison bars instead when the relation is a fixed difference rather than equal units."],
    },
    pedagogy: {
      learningObjectivePattern: "Represent a multiplicative comparison using equal units so the number of units, not bar length alone, expresses the relationship.",
      conceptualFocus: ["equal units", "multiplicative comparison", "scaling"],
      prerequisiteConcepts: ["equal groups", "multiplication and division"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("define_unit", "represent", "Choose one equal unit to represent the common base quantity.", "Every unit must have the same value.", ["bar_model", "strip_diagram"]),
        stage("assign_units", "represent", "Show each compared quantity as the required number of equal units.", "The count of equal units expresses the relationship.", ["bar_model"]),
        stage("find_unit_or_total", "calculate", "Use a known total or known unit value to find the required quantity.", "Unit value links the model to arithmetic.", ["symbolic_working"]),
        stage("verify_units", "check", "Confirm that every represented unit has the same value.", "Unequal units invalidate the comparison model.", ["bar_model"]),
      ],
      representations: reps(["bar_model", "strip_diagram"], ["ratio_table", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Mark equal units consistently.", "State the value of one unit before scaling when it is derived."],
      generalisationPattern: "Multiplicative comparisons can be represented by equal units whose counts show the relationship.",
      checkPattern: "Multiply unit value by each unit count and compare with the represented totals.",
    },
    misconceptions: [
      misconception("unequal_units", "Drawing units of different values while treating them as equal.", ["Same unit labels have different lengths or values"], "Redraw using one common unit value before calculating."),
    ],
    visualGuidance: visual("usually", ["bar_model", "strip_diagram"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape separates additive comparison from equal-unit comparison so 4C can choose the correct relation type.",
  }),

  // ---------------------------------------------------------------------------
  // model.change
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "model.change.forward_change",
    familyId: "model.change",
    variantId: "forward_change",
    title: "Track a known start through an increase or decrease",
    summary: "Represents start, change and result in chronological order when the initial amount and change are known.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "arithmetic", "money", "measurement"],
      structures: ["addition_change", "subtraction_change", "measure_change"],
      reasoning: ["addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Connect an initial amount, a signed change and a resulting amount in a before-change-after relationship.",
      conceptualFocus: ["initial state", "change direction", "final state"],
      prerequisiteConcepts: ["addition and subtraction meaning"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("mark_start", "represent", "Record the amount before the event.", "Start and result are different time states.", ["bar_model", "timeline"]),
        stage("show_change", "represent", "Show the increase as an added segment or the decrease as a removed segment.", "The direction of change matters.", ["bar_model", "timeline"]),
        stage("find_result", "calculate", "Apply the change to the start to obtain the result.", "Increase adds; decrease subtracts when start and change are known.", ["symbolic_working"]),
        stage("reverse_check", "check", "Reverse the change from the result to recover the start.", "The before-after relation should work in both directions.", ["symbolic_working"]),
      ],
      representations: reps(["bar_model"], ["timeline", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Label before, change and after explicitly.", "Use arrows to show change direction when helpful."],
      generalisationPattern: "Final = start + increase or start - decrease.",
      checkPattern: "Reverse the change and recover the start.",
    },
    misconceptions: [
      misconception("time_state_mix", "Combining quantities from before and after as if they were simultaneous parts.", ["Adds start and final together"], "Separate the timeline into before, event and after."),
    ],
    visualGuidance: visual("usually", ["bar_model", "timeline"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape treats change models as time-state relationships rather than keyword arithmetic.",
  }),
  makeMethod({
    methodId: "model.change.find_change",
    familyId: "model.change",
    variantId: "find_change",
    title: "Find the unknown change from start and result",
    summary: "Compares the initial and final states to isolate the amount added or removed.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "arithmetic", "money", "measurement"],
      structures: ["addition_change", "subtraction_change", "measure_change"],
      reasoning: ["comparison", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Determine the change by comparing the initial and final amounts while preserving direction.",
      conceptualFocus: ["difference between states", "increase/decrease direction"],
      prerequisiteConcepts: ["comparison", "subtraction"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("place_states", "represent", "Show start and result as two aligned states.", "Both values describe the same quantity at different times.", ["bar_model"]),
        stage("identify_direction", "reason", "Decide whether the quantity increased or decreased.", "Direction determines how the difference is interpreted.", ["verbal_reasoning"]),
        stage("find_gap", "calculate", "Find the numerical gap between the two states.", "The gap is the size of the change.", ["symbolic_working"]),
        stage("apply_check", "check", "Apply the found change to the start and verify the result.", "The change must recreate the final state.", ["symbolic_working"]),
      ],
      representations: reps(["bar_model"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["State increase or decrease together with the magnitude of change."],
      generalisationPattern: "The size of a change is the difference between final and initial states, interpreted with direction.",
      checkPattern: "Apply the change to the initial state.",
    },
    misconceptions: [
      misconception("gap_without_direction", "Finding the absolute difference but reporting the wrong direction of change.", ["Correct number, wrong increase/decrease wording"], "Compare start and final before naming the change."),
    ],
    visualGuidance: visual("optional", ["bar_model"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape stores magnitude and direction as separate teaching ideas for unknown-change problems.",
  }),
  makeMethod({
    methodId: "model.change.find_start",
    familyId: "model.change",
    variantId: "find_start",
    title: "Recover the unknown starting amount",
    summary: "Works from a known final state and a known change to recover the quantity before the event.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "money", "measurement"],
      structures: ["addition_change", "subtraction_change", "working_backwards"],
      reasoning: ["addition", "subtraction", "working_backwards"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Reverse the stated change from the final amount to determine the amount before the event.",
      conceptualFocus: ["inverse change", "unknown initial state"],
      prerequisiteConcepts: ["inverse operations", "change model"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("show_final", "represent", "Mark the final state and the known change.", "The final amount is the endpoint, not the starting value.", ["bar_model", "timeline"]),
        stage("reverse_event", "reason", "Reverse an increase with subtraction or reverse a decrease with addition.", "Undoing the event recovers the start.", ["verbal_reasoning"]),
        stage("calculate_start", "calculate", "Apply the inverse operation to find the start.", "The inverse restores the earlier state.", ["symbolic_working"]),
        stage("forward_check", "check", "Replay the original event from the found start.", "Forward replay must end at the given final amount.", ["symbolic_working"]),
      ],
      representations: reps(["bar_model", "timeline"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write the original change and its inverse side by side when first teaching the method."],
      generalisationPattern: "An unknown start is recovered by undoing the known change from the final state.",
      checkPattern: "Replay the original change forward.",
    },
    misconceptions: [
      misconception("repeat_change", "Applying the original operation again instead of undoing it.", ["Adds the increase to the final amount"], "Name the inverse operation before calculating."),
    ],
    visualGuidance: visual("optional", ["bar_model", "timeline"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape links unknown-start change problems to an explicit inverse-event sequence.",
  }),

  // ---------------------------------------------------------------------------
  // model.equal_groups
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "model.equal_groups.groups_to_total",
    familyId: "model.equal_groups",
    variantId: "groups_to_total",
    title: "Represent equal groups to find the total",
    summary: "Makes the number of groups and size of each group explicit before using multiplication to find the total.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "arithmetic", "money"],
      structures: ["equal_groups", "repeated_addition"],
      reasoning: ["multiplication", "addition"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Distinguish number of groups from items per group and connect repeated equal groups to multiplication.",
      conceptualFocus: ["equal groups", "group count", "group size", "total"],
      prerequisiteConcepts: ["counting", "repeated addition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_group_roles", "establish_meaning", "State how many groups there are and how many items are in each group.", "Group count and group size are different quantities.", ["verbal_reasoning"]),
        stage("draw_groups", "represent", "Represent the repeated equal groups consistently.", "Every group has the same size.", ["equal_groups_diagram", "array"]),
        stage("connect_multiplication", "notice_relationship", "Link the repeated groups to a multiplication expression.", "Multiplication compresses repeated equal addition.", ["symbolic_working"]),
        stage("check_total", "check", "Confirm the total by counting groups or using repeated addition for a small example.", "The multiplication must match the represented groups.", ["equal_groups_diagram"]),
      ],
      representations: reps(["equal_groups_diagram", "array"], ["symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["State 'number of groups × size of each group'."],
      generalisationPattern: "Equal-groups total = number of groups × size of each group.",
      checkPattern: "Verify with repeated addition or division inverse.",
    },
    misconceptions: [
      misconception("swap_roles_without_meaning", "Swapping group count and group size without understanding the context.", ["Cannot explain what either factor represents"], "Label both factors with their contextual roles before multiplying."),
    ],
    visualGuidance: visual("usually", ["equal_groups_diagram", "array"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape explicitly labels group count and group size before multiplication.",
  }),
  makeMethod({
    methodId: "model.equal_groups.total_to_unknown_group",
    familyId: "model.equal_groups",
    variantId: "total_to_unknown_group",
    title: "Use the total to find an unknown group count or group size",
    summary: "Represents a fixed total partitioned into equal groups and uses division to find the unknown grouping quantity.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "money"],
      structures: ["equal_groups", "sharing", "grouping", "repeated_subtraction"],
      reasoning: ["division", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify whether division is finding the number of equal groups or the size of each group.",
      conceptualFocus: ["division meanings", "fixed total", "equal partition"],
      prerequisiteConcepts: ["equal groups", "multiplication facts"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_known_total", "establish_meaning", "Mark the total amount and the known grouping quantity.", "The total is being partitioned into equal groups.", ["verbal_reasoning"]),
        stage("show_partition", "represent", "Show equal sections or repeated groups matching the known quantity.", "Equality of groups is essential.", ["equal_groups_diagram", "array"]),
        stage("divide", "calculate", "Divide the total by the known group count or group size to find the unknown.", "Division answers the missing grouping quantity.", ["symbolic_working"]),
        stage("multiply_check", "check", "Multiply the two grouping quantities to recover the total.", "The inverse multiplication verifies the partition.", ["symbolic_working"]),
      ],
      representations: reps(["equal_groups_diagram"], ["array", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Name what the quotient represents: groups or items per group."],
      generalisationPattern: "For equal groups, total ÷ group size = number of groups and total ÷ number of groups = group size.",
      checkPattern: "Multiply quotient by divisor to recover the total.",
    },
    misconceptions: [
      misconception("quotient_role_unknown", "Computing a quotient without knowing what it represents.", ["Correct calculation but wrong unit or noun"], "State the unknown grouping role before division."),
    ],
    visualGuidance: visual("usually", ["equal_groups_diagram", "array"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape separates group-count and group-size division by the meaning of the quotient.",
  }),
  makeMethod({
    methodId: "model.equal_groups.sharing_grouping_distinction",
    familyId: "model.equal_groups",
    variantId: "sharing_grouping_distinction",
    title: "Distinguish sharing from grouping division",
    summary: "Contrasts sharing a total among a known number of groups with making groups of a known size.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic"],
      structures: ["sharing", "grouping"],
      reasoning: ["division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Explain whether division is finding how much goes in each group or how many groups can be made.",
      conceptualFocus: ["sharing division", "quotative/grouping division", "quotient meaning"],
      prerequisiteConcepts: ["equal groups", "division notation"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("classify_question", "reason", "Ask whether the number of groups is known or the size of each group is known.", "The known grouping quantity determines the division interpretation.", ["verbal_reasoning"]),
        stage("represent_division", "represent", "Show the total being shared into a fixed number of groups or repeatedly grouped by a fixed size.", "The same division expression can answer different contextual questions.", ["equal_groups_diagram"]),
        stage("calculate_quotient", "calculate", "Divide and attach the correct noun/unit to the quotient.", "Meaning travels with the quotient.", ["symbolic_working"]),
        stage("interpret", "generalise", "State whether the quotient is group size or number of groups.", "Division meaning is contextual, not only procedural.", ["verbal_reasoning"]),
      ],
      representations: reps(["equal_groups_diagram"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write a short phrase under the quotient describing its role."],
      generalisationPattern: "Sharing finds group size; grouping finds number of groups.",
      checkPattern: "Multiply the interpreted quotient by the known grouping quantity.",
    },
    misconceptions: [
      misconception("division_same_meaning", "Treating every division story as sharing.", ["Draws a fixed number of groups when group size is given"], "Identify which grouping quantity is known before drawing."),
    ],
    visualGuidance: visual("usually", ["equal_groups_diagram"]),
    officialClaimTag: "conceptual_understanding",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape retains sharing/grouping meaning so later explanations can verbalise the quotient correctly.",
  }),

  // ---------------------------------------------------------------------------
  // heuristic.unitary
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "heuristic.unitary.one_then_many",
    familyId: "heuristic.unitary",
    variantId: "one_then_many",
    title: "Find one unit, then scale to the required number",
    summary: "Reduces a known many-unit quantity to one unit before multiplying to the required number of equal units.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "ratio", "money", "measurement", "speed_rate"],
      structures: ["unitary", "ratio_relationship"],
      reasoning: ["rate_scaling", "ratio_scaling", "division", "multiplication"],
      curriculumSkills: [],
      exclusions: ["Units must be equivalent and scale proportionally."],
    },
    pedagogy: {
      learningObjectivePattern: "Determine the value of one equal unit from a known number of units, then scale that unit value to the target quantity.",
      conceptualFocus: ["one-unit value", "proportional scaling", "equal units"],
      prerequisiteConcepts: ["multiplication", "division", "equal groups"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("state_known_units", "represent", "Write the known number of equal units and their total value.", "The relationship must be proportional.", ["table", "ratio_table"]),
        stage("find_one", "calculate", "Divide the total by the known number of units to find one unit.", "One unit is the scaling anchor.", ["symbolic_working"]),
        stage("scale_target", "calculate", "Multiply the one-unit value by the required number of units.", "All units have the same value.", ["symbolic_working"]),
        stage("ratio_check", "check", "Check that known and target pairs preserve the same unit value.", "Equivalent unit rate confirms proportionality.", ["ratio_table"]),
      ],
      representations: reps(["table", "ratio_table"], ["bar_model", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Write '1 unit =' explicitly before scaling up."],
      generalisationPattern: "For equal units, value per unit = known total ÷ known units; target value = value per unit × target units.",
      checkPattern: "Compare unit rates for the known and target pairs.",
    },
    misconceptions: [
      misconception("skip_one_unit", "Scaling directly with unrelated operations without establishing one unit.", ["Multiplies both known quantities", "Uses additive change for proportional relation"], "Return to one unit and rebuild the scaling chain."),
    ],
    visualGuidance: visual("optional", ["ratio_table", "table", "bar_model"]),
    officialClaimTag: "problem_solving_heuristics",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape encodes the explicit divide-to-one then multiply-to-target unitary chain.",
  }),
  makeMethod({
    methodId: "heuristic.unitary.scale_down_then_up",
    familyId: "heuristic.unitary",
    variantId: "scale_down_then_up",
    title: "Scale down to a simpler unit, then scale up",
    summary: "Uses a convenient intermediate unit when finding exactly one unit is unnecessary or less efficient.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "ratio", "money", "measurement"],
      structures: ["unitary", "ratio_relationship"],
      reasoning: ["rate_scaling", "ratio_scaling", "division", "multiplication"],
      curriculumSkills: [],
      exclusions: ["Intermediate unit must divide the known and target relationships exactly or be handled transparently."],
    },
    pedagogy: {
      learningObjectivePattern: "Use equivalent scaling to move from a known quantity to a simpler intermediate unit before reaching the target.",
      conceptualFocus: ["equivalent ratios", "multiplicative scaling", "efficient intermediate unit"],
      prerequisiteConcepts: ["unitary method", "factors and multiples"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("choose_scale_factor", "reason", "Identify a clean factor that reduces the known number of units toward the target.", "Scaling must affect both quantities equally.", ["ratio_table"]),
        stage("scale_down", "calculate", "Divide both corresponding quantities by the same factor.", "Equivalent pairs preserve unit rate.", ["ratio_table", "symbolic_working"]),
        stage("scale_up", "calculate", "Multiply both corresponding quantities by the factor needed for the target.", "The same proportional relationship continues.", ["ratio_table"]),
        stage("unit_rate_check", "check", "Check one unit or cross-check the ratio if needed.", "Different routes should give the same target.", ["symbolic_working"]),
      ],
      representations: reps(["ratio_table"], ["table", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Show the same scale factor acting on both columns/rows."],
      generalisationPattern: "Equivalent proportional pairs are created by multiplying or dividing both quantities by the same factor.",
      checkPattern: "Verify with one-unit rate or reverse scaling.",
    },
    misconceptions: [
      misconception("scale_one_side", "Applying a scale factor to only one quantity in a proportional pair.", ["Ratio changes after scaling"], "Draw matching arrows and apply the factor to both related quantities."),
    ],
    visualGuidance: visual("usually", ["ratio_table"]),
    officialClaimTag: "representation_selection",
    dreamscapeClaim: "Dreamscape permits efficient intermediate-unit scaling while preserving an auditable proportional chain.",
  }),
  makeMethod({
    methodId: "heuristic.unitary.contextual_rate",
    familyId: "heuristic.unitary",
    variantId: "contextual_rate",
    title: "Use a contextual one-unit rate",
    summary: "Interprets one unit in the story context—such as cost per item or distance per interval—before scaling.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["money", "measurement", "speed_rate", "ratio", "whole_numbers"],
      structures: ["unitary", "speed_distance_time", "ratio_relationship"],
      reasoning: ["rate_scaling", "ratio_scaling", "division", "multiplication"],
      curriculumSkills: [],
      exclusions: ["Do not force a unit rate where the relationship is not proportional."],
    },
    pedagogy: {
      learningObjectivePattern: "State what one contextual unit means, calculate its value, and use it only when the relationship is proportional.",
      conceptualFocus: ["rate meaning", "units", "proportional context"],
      prerequisiteConcepts: ["division", "unit labels"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("name_rate", "establish_meaning", "State the rate in words before calculating it.", "A rate compares quantities with different units or roles.", ["verbal_reasoning"]),
        stage("find_rate", "calculate", "Divide to obtain the value for one contextual unit.", "The quotient carries a compound or contextual unit.", ["symbolic_working", "unit_rate_table"]),
        stage("scale", "calculate", "Multiply the rate by the target number of units.", "Scaling the unit rate gives the target quantity.", ["unit_rate_table"]),
        stage("unit_check", "check", "Check that units cancel or combine correctly.", "Units help verify the operation direction.", ["symbolic_working"]),
      ],
      representations: reps(["unit_rate_table"], ["table", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Carry the contextual unit with the one-unit value."],
      generalisationPattern: "A proportional rate can be expressed per one unit and then scaled to any compatible target amount.",
      checkPattern: "Check units and reverse by division.",
    },
    misconceptions: [
      misconception("rate_unit_lost", "Dropping the meaning or unit of the rate.", ["Numerical rate has no label", "Scales in wrong direction"], "Write the rate as 'per 1 ...' before using it."),
    ],
    visualGuidance: visual("optional", ["unit_rate_table", "table"]),
    officialClaimTag: "conceptual_understanding",
    dreamscapeClaim: "Dreamscape requires an explicit semantic rate label before unitary scaling in contextual problems.",
  }),

  // ---------------------------------------------------------------------------
  // heuristic.transfer_difference
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "heuristic.transfer_difference.double_effect",
    familyId: "heuristic.transfer_difference",
    variantId: "double_effect",
    title: "Track the double effect of a transfer between two groups",
    summary: "Shows that transferring an amount from one group to another changes the difference by twice the transferred amount.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["whole_numbers", "money", "arithmetic"],
      structures: ["transfer_difference"],
      reasoning: ["transfer_reasoning", "comparison", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: ["Applies to direct transfer from one compared quantity to the other without loss or gain elsewhere."],
    },
    pedagogy: {
      learningObjectivePattern: "Explain why moving t from one compared group to the other changes their difference by 2t.",
      conceptualFocus: ["conservation", "simultaneous decrease and increase", "difference change"],
      prerequisiteConcepts: ["comparison difference", "addition and subtraction"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("show_before", "represent", "Draw the two quantities before transfer on aligned comparison bars.", "The original difference is visible before anything moves.", ["bar_model"]),
        stage("move_amount", "represent", "Remove the transfer amount from one bar and add the same amount to the other.", "Total across both groups is conserved.", ["bar_model"]),
        stage("notice_double_effect", "notice_relationship", "Observe that one side shrinks by t while the other grows by t.", "The gap changes by t + t.", ["bar_model", "verbal_reasoning"]),
        stage("calculate_relation", "calculate", "Use the before/after difference relation to solve the required quantity.", "Transfer changes the comparison without changing the combined total.", ["symbolic_working"]),
      ],
      representations: reps(["bar_model"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Mark the same transfer amount on both bars with opposite directions."],
      generalisationPattern: "A transfer of t from one compared group to the other changes their difference by 2t while preserving the combined total.",
      checkPattern: "Reconstruct both after-values and verify the stated after-difference.",
    },
    misconceptions: [
      misconception("single_effect", "Changing the difference by only the transferred amount.", ["Uses t instead of 2t"], "Show both simultaneous effects: one decreases and the other increases."),
    ],
    visualGuidance: visual("essential", ["bar_model"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape explicitly models both sides of a transfer before introducing the 2t relationship.",
  }),
  makeMethod({
    methodId: "heuristic.transfer_difference.before_after_comparison",
    familyId: "heuristic.transfer_difference",
    variantId: "before_after_comparison",
    title: "Compare before and after states in a transfer problem",
    summary: "Maintains separate before and after comparison models so transfer conditions can be related without mixing time states.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["whole_numbers", "money", "arithmetic"],
      structures: ["transfer_difference"],
      reasoning: ["transfer_reasoning", "comparison", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Keep the before and after comparisons separate and connect them with the conserved transfer amount.",
      conceptualFocus: ["before/after states", "conserved combined total", "comparison"],
      prerequisiteConcepts: ["comparison bars", "change relationships"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("draw_before", "represent", "Build the before-transfer comparison.", "Before values belong to one state.", ["bar_model"]),
        stage("draw_after", "represent", "Build a second comparison for after the transfer.", "After values belong to a new state.", ["bar_model"]),
        stage("link_transfer", "reason", "Mark the same transferred amount connecting the two states.", "The amount moves; it is not created or lost.", ["bar_model"]),
        stage("solve_constraint", "calculate", "Use the given before/after difference condition to solve the target.", "Both states constrain the same underlying quantities.", ["symbolic_working"]),
        stage("total_check", "check", "Verify that the combined total is unchanged before and after.", "Conservation confirms the transfer model.", ["symbolic_working"]),
      ],
      representations: reps(["bar_model"], ["symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Label models BEFORE and AFTER to avoid state mixing."],
      generalisationPattern: "Transfer problems preserve combined total while redistributing the two compared quantities.",
      checkPattern: "Compare combined totals before and after.",
    },
    misconceptions: [
      misconception("state_mixing", "Using a before value together with an after value in one comparison equation.", ["Equation combines labels from different states"], "Separate the two states visually before forming equations."),
    ],
    visualGuidance: visual("essential", ["bar_model"]),
    officialClaimTag: "representation_selection",
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape preserves explicit state boundaries in transfer-difference teaching.",
  }),

  // ---------------------------------------------------------------------------
  // heuristic.working_backwards
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "heuristic.working_backwards.reverse_operations",
    familyId: "heuristic.working_backwards",
    variantId: "reverse_operations",
    title: "Reverse operations from a known final value",
    summary: "Starts from the known endpoint and undoes a sequence of arithmetic operations in reverse order.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "algebra", "logic"],
      structures: ["working_backwards", "missing_number_equation", "multi_step"],
      reasoning: ["working_backwards", "equation_solving", "addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Undo a known operation sequence in reverse order using inverse operations to recover an earlier value.",
      conceptualFocus: ["inverse operations", "reverse order", "state recovery"],
      prerequisiteConcepts: ["operation inverses", "operation sequence"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("record_forward_steps", "represent", "List the original operations in their forward order.", "The sequence must be explicit before it can be reversed.", ["table", "symbolic_working"]),
        stage("start_final", "reason", "Begin from the known final value.", "Working backwards starts at the endpoint.", ["symbolic_working"]),
        stage("undo_reverse_order", "calculate", "Apply inverse operations one by one in reverse order.", "Last action is undone first.", ["symbolic_working"]),
        stage("check_forward", "check", "Replay the original operations from the recovered start.", "Forward replay must reproduce the endpoint.", ["symbolic_working"]),
      ],
      representations: reps(["symbolic_working", "table"], ["verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Use arrows or a two-column forward/backward table for longer sequences."],
      generalisationPattern: "To reverse a process, undo the final operation first and use the inverse of each operation.",
      checkPattern: "Run the original process forward.",
    },
    misconceptions: [
      misconception("same_order", "Undoing operations in the original rather than reverse order.", ["First forward operation is undone first"], "Number the forward steps, then reverse the order before calculating."),
    ],
    visualGuidance: visual("optional", ["table", "symbolic_working"]),
    officialClaimTag: "problem_solving_heuristics",
    officialClaimStatement: "The primary mathematics syllabus explicitly recognises working backwards as a problem-solving heuristic.",
    dreamscapeClaim: "Dreamscape formalises working backwards as an auditable reverse-operation sequence with mandatory forward checking.",
  }),
  makeMethod({
    methodId: "heuristic.working_backwards.reverse_event_sequence",
    familyId: "heuristic.working_backwards",
    variantId: "reverse_event_sequence",
    title: "Reverse a sequence of story events",
    summary: "Translates narrative events into state changes, then reverses those events from the final state to the initial state.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "money", "logic"],
      structures: ["working_backwards", "multi_step"],
      reasoning: ["working_backwards", "addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Convert each story event to a mathematical state change and reverse the events from last to first.",
      conceptualFocus: ["event order", "state change", "inverse action"],
      prerequisiteConcepts: ["operation meaning", "chronological order"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("timeline_events", "represent", "Place story events in chronological order and identify their mathematical effects.", "Narrative order controls operation order.", ["timeline", "table"]),
        stage("begin_endpoint", "reason", "Start from the known final state.", "The endpoint is the backward starting point.", ["timeline"]),
        stage("reverse_events", "calculate", "Undo each event from last to first using its inverse effect.", "Each reverse step reconstructs an earlier state.", ["timeline", "symbolic_working"]),
        stage("replay_story", "check", "Replay the original events in chronological order.", "The reconstructed start must produce the given ending.", ["timeline"]),
      ],
      representations: reps(["timeline", "table"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write one row per event: forward action, reverse action, state."],
      generalisationPattern: "A multi-event process can be reversed by undoing events from last to first.",
      checkPattern: "Replay the narrative forward.",
    },
    misconceptions: [
      misconception("event_omitted", "Skipping an event while reversing the story.", ["Forward replay fails despite arithmetic being locally correct"], "Use one timeline marker or table row for every event."),
    ],
    visualGuidance: visual("usually", ["timeline", "table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape extends working backwards from bare operations to explicit story-state transitions.",
  }),

  // ---------------------------------------------------------------------------
  // heuristic.age_relationship
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "heuristic.age_relationship.constant_difference",
    familyId: "heuristic.age_relationship",
    variantId: "constant_difference",
    title: "Use the invariant age difference",
    summary: "Uses the fact that two people's age difference remains constant as time passes.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["whole_numbers", "algebra", "logic"],
      structures: ["age_relationship"],
      reasoning: ["age_reasoning", "comparison", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify the fixed age difference and use it as an invariant across present, past and future states.",
      conceptualFocus: ["invariant difference", "time progression", "comparison"],
      prerequisiteConcepts: ["difference", "addition and subtraction"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("find_difference", "calculate", "Find or mark the age difference at any known time point.", "Both ages change by the same amount over time.", ["bar_model", "symbolic_working"]),
        stage("state_invariant", "generalise", "State that the difference remains unchanged at every common time shift.", "Equal time added to both ages preserves the difference.", ["verbal_reasoning"]),
        stage("apply_other_time", "reason", "Carry the same difference to the required time point.", "The invariant links different time states.", ["timeline", "bar_model"]),
        stage("verify", "check", "Subtract the final two ages and confirm the original difference.", "The invariant must still hold.", ["symbolic_working"]),
      ],
      representations: reps(["timeline", "bar_model"], ["symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Mark the same difference segment at each compared time point."],
      generalisationPattern: "If two people age by the same number of years, their age difference stays constant.",
      checkPattern: "Subtract the two ages at the solved time point.",
    },
    misconceptions: [
      misconception("difference_changes", "Adding the time shift to the age difference itself.", ["Difference grows with years passed"], "Show that the same time amount is added to both ages and cancels in the difference."),
    ],
    visualGuidance: visual("usually", ["timeline", "bar_model"]),
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape treats age difference as the primary invariant before any time-shift calculation.",
  }),
  makeMethod({
    methodId: "heuristic.age_relationship.time_shift",
    familyId: "heuristic.age_relationship",
    variantId: "time_shift",
    title: "Shift all ages consistently through time",
    summary: "Moves every person's age by the same elapsed time while keeping time references explicit.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["whole_numbers", "algebra", "logic"],
      structures: ["age_relationship"],
      reasoning: ["age_reasoning", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Translate 'years ago' and 'years later' into a common time shift applied to every relevant age.",
      conceptualFocus: ["common time shift", "past/present/future", "synchronised ages"],
      prerequisiteConcepts: ["addition and subtraction", "timeline"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("anchor_present", "represent", "Place present ages on a timeline or table.", "Present is the common reference point.", ["timeline", "table"]),
        stage("mark_shift", "represent", "Mark the number of years moved backward or forward.", "The same time shift applies to everyone.", ["timeline"]),
        stage("update_all_ages", "calculate", "Add or subtract the same elapsed time from each relevant age.", "People age together through the same elapsed interval.", ["table", "symbolic_working"]),
        stage("relation_check", "check", "Verify that invariant relationships such as age difference are preserved.", "Consistent time shifts preserve difference.", ["symbolic_working"]),
      ],
      representations: reps(["timeline", "table"], ["bar_model", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Keep time point labels in every row or column."],
      generalisationPattern: "A shift of t years changes every relevant age by the same +t or -t.",
      checkPattern: "Confirm all ages were shifted by the same amount.",
    },
    misconceptions: [
      misconception("shift_one_person", "Changing only one person's age when moving to another time point.", ["Age difference changes without a special event"], "Apply the timeline shift to every person in the comparison."),
    ],
    visualGuidance: visual("usually", ["timeline", "table"]),
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape makes time-state labels explicit to prevent mixing ages from different years.",
  }),
  makeMethod({
    methodId: "heuristic.age_relationship.ratio_at_time",
    familyId: "heuristic.age_relationship",
    variantId: "ratio_at_time",
    title: "Use an age ratio at a specified time point",
    summary: "Combines the invariant age difference with an equal-unit ratio model at the required past, present or future time.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["whole_numbers", "algebra", "ratio"],
      structures: ["age_relationship", "ratio_relationship"],
      reasoning: ["age_reasoning", "comparison", "ratio_scaling", "multiplication", "subtraction"],
      curriculumSkills: [],
      exclusions: ["Apply the ratio only at the time point stated in the question."],
    },
    pedagogy: {
      learningObjectivePattern: "Apply an age ratio only at its stated time point, using the invariant difference to determine equal-unit value when possible.",
      conceptualFocus: ["ratio time state", "constant difference", "equal units"],
      prerequisiteConcepts: ["age difference", "ratio units"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("locate_ratio_time", "establish_meaning", "Identify exactly when the ratio statement applies.", "Ratios of ages change over time even though age difference does not.", ["timeline"]),
        stage("draw_ratio_units", "represent", "Represent the two ages at that time using equal units.", "The unit counts express the stated ratio.", ["bar_model"]),
        stage("use_difference", "reason", "Match the difference in unit counts to the invariant age difference.", "Difference provides the bridge from ratio units to years.", ["bar_model"]),
        stage("find_ages", "calculate", "Find one unit and scale to each age, then shift time if another age is requested.", "Solve the ratio state before moving to another time point.", ["symbolic_working", "timeline"]),
      ],
      representations: reps(["bar_model", "timeline"], ["ratio_table", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Write the ratio beside the correct time label.", "Mark the difference in ratio units."],
      generalisationPattern: "Age difference stays fixed, while an age ratio is tied to a specific time point.",
      checkPattern: "Verify both the ratio at that time and the invariant age difference.",
    },
    misconceptions: [
      misconception("ratio_invariant", "Assuming the age ratio remains constant over time.", ["Carries same ratio to past or future without recalculation"], "Contrast ratio with the truly invariant age difference."),
    ],
    visualGuidance: visual("usually", ["bar_model", "timeline"]),
    cpaClaim: true,
    dreamscapeClaim: "Dreamscape distinguishes invariant age difference from time-specific age ratio before solving.",
  }),

  // ---------------------------------------------------------------------------
  // heuristic.systematic_enumeration
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "heuristic.systematic_enumeration.ordered_list",
    familyId: "heuristic.systematic_enumeration",
    variantId: "ordered_list",
    title: "Enumerate possibilities in a fixed order",
    summary: "Uses a repeatable ordering rule so valid cases are listed once without omissions or duplicates.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["whole_numbers", "logic", "geometry", "data", "arithmetic"],
      structures: ["systematic_counting", "logic_strategy", "digit_frequency"],
      reasoning: ["counting", "systematic_enumeration", "frequency_counting", "logical_elimination"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Choose an ordering rule and use it consistently to list all valid cases exactly once.",
      conceptualFocus: ["completeness", "order", "duplicate avoidance"],
      prerequisiteConcepts: ["classification", "counting"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("choose_order", "reason", "Choose a stable first variable or starting case and define the order of progression.", "A fixed order makes completeness visible.", ["verbal_reasoning"]),
        stage("list_cases", "calculate", "Generate cases one by one using the chosen order.", "Do not jump between categories.", ["table"]),
        stage("mark_used", "check", "Mark completed categories or cases to prevent duplication.", "Tracking prevents repeated counting.", ["table"]),
        stage("completeness_check", "generalise", "Confirm that every category or starting case has been exhausted.", "The stopping rule proves completeness.", ["verbal_reasoning"]),
      ],
      representations: reps(["table"], ["verbal_reasoning", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["State the ordering rule before listing.", "Use one row or block per starting case."],
      generalisationPattern: "A systematic list is complete when every starting category has been exhausted under the same rule.",
      checkPattern: "Count by category and scan for duplicate cases.",
    },
    misconceptions: [
      misconception("random_listing", "Listing cases in an ad hoc order and missing or repeating possibilities.", ["Duplicate entries", "No clear stopping point"], "Restart with one fixed ordering variable and grouped cases."),
    ],
    visualGuidance: visual("usually", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape requires an explicit order and stopping rule for systematic listing.",
  }),
  makeMethod({
    methodId: "heuristic.systematic_enumeration.tabulation",
    familyId: "heuristic.systematic_enumeration",
    variantId: "tabulation",
    title: "Organise cases in a table",
    summary: "Uses rows and columns to organise changing values, classifications or combinations so patterns and missing cases become visible.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["logic", "data", "whole_numbers", "arithmetic", "geometry"],
      structures: ["logic_strategy", "data_reading", "data_classification", "systematic_counting"],
      reasoning: ["systematic_enumeration", "data_interpretation", "classification", "logical_elimination"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Choose table dimensions that correspond to the changing variables and use each cell to record one controlled case.",
      conceptualFocus: ["tabulation", "variables", "case coverage"],
      prerequisiteConcepts: ["rows and columns", "classification"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("choose_dimensions", "represent", "Assign one meaningful variable or category to rows and another to columns when appropriate.", "Table structure mirrors the problem variables.", ["table"]),
        stage("populate_systematically", "calculate", "Fill cells in a fixed row-by-row or column-by-column order.", "Each cell represents one controlled case.", ["table"]),
        stage("read_pattern", "notice_relationship", "Inspect the completed table for valid cases, impossible cases or repeated structure.", "Organisation reveals relationships.", ["table"]),
        stage("check_edges", "check", "Check the first and last category in every dimension.", "Boundary checks reduce omissions.", ["table"]),
      ],
      representations: reps(["table"], ["verbal_reasoning", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Give every row and column a meaningful label."],
      generalisationPattern: "A well-designed table turns multiple changing conditions into visible, checkable cases.",
      checkPattern: "Check row/column totals or boundary categories where relevant.",
    },
    misconceptions: [
      misconception("table_without_variable", "Creating rows and columns that do not correspond to meaningful variables.", ["Cells cannot be interpreted"], "Name what changes across each dimension before filling the table."),
    ],
    visualGuidance: visual("usually", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape treats tabulation as a structured enumeration tool with explicit variable semantics.",
  }),
  makeMethod({
    methodId: "heuristic.systematic_enumeration.spatial_sweep",
    familyId: "heuristic.systematic_enumeration",
    variantId: "spatial_sweep",
    title: "Sweep a diagram systematically",
    summary: "Counts spatial objects using a consistent scan direction, size category and marking rule to avoid misses and duplicates.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["geometry", "data"],
      structures: ["systematic_counting", "area", "perimeter", "angle", "property_matching"],
      reasoning: ["systematic_enumeration", "counting", "spatial_reasoning", "property_matching"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Count valid spatial objects by fixing size/type first, then sweeping positions in a consistent direction while marking counted cases.",
      conceptualFocus: ["spatial coverage", "fixed scan order", "duplicate prevention"],
      prerequisiteConcepts: ["target shape/property recognition", "rows and columns where applicable"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("define_valid_object", "establish_meaning", "State exactly what qualifies as one valid object before counting.", "The count depends on a precise inclusion rule.", ["diagram"]),
        stage("fix_category", "reason", "Count one size, orientation or category at a time.", "Separating categories prevents hidden duplicates.", ["diagram"]),
        stage("sweep_positions", "calculate", "Start at a consistent corner or reference point and sweep horizontally then row-by-row, or use another declared scan order.", "Every possible position is visited once.", ["diagram"]),
        stage("mark_counted", "represent", "Highlight or record each accepted object as it is counted.", "Visible marks prevent recounting.", ["diagram"]),
        stage("sum_categories", "check", "Add category counts and perform a second directional scan if practical.", "Independent organisation checks completeness.", ["table", "diagram"]),
      ],
      representations: reps(["diagram"], ["table", "geometric_construction"]),
    },
    workedPattern: {
      notationGuidance: ["Record subtotals by size/orientation before the final total."],
      generalisationPattern: "Spatial enumeration is reliable when one category and one scan order are fixed at a time.",
      checkPattern: "Repeat the scan by category or from the opposite direction without changing inclusion rules.",
    },
    misconceptions: [
      misconception("spatial_double_count", "Counting the same object again from another starting point.", ["Total changes on recount", "No visible tracking"], "Mark each accepted object and keep one starting-corner convention."),
      misconception("miss_larger_composites", "Counting only smallest shapes while overlooking valid larger composites.", ["Only one size category recorded"], "Enumerate size categories explicitly before summing."),
    ],
    visualGuidance: visual("essential", ["diagram"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape spatial enumeration uses category-first counting plus a fixed scan order and progressive highlighting.",
  }),
  makeMethod({
    methodId: "heuristic.systematic_enumeration.digit_frequency",
    familyId: "heuristic.systematic_enumeration",
    variantId: "digit_frequency",
    title: "Count digit or symbol frequency by place/category",
    summary: "Partitions a counting range or structured set by place/category, counts complete cycles and handles remainders separately.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["whole_numbers", "logic"],
      structures: ["digit_frequency", "systematic_counting"],
      reasoning: ["frequency_counting", "systematic_enumeration", "counting"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Count occurrences by separating positions or repeating cycles rather than scanning an entire range randomly.",
      conceptualFocus: ["frequency", "place categories", "cycles and remainder"],
      prerequisiteConcepts: ["place value", "systematic counting"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("choose_position", "reason", "Separate the count by ones, tens, hundreds or other relevant position/category.", "Each position follows its own cycle.", ["table"]),
        stage("count_full_cycles", "calculate", "Count complete repeating cycles for the chosen position.", "Full cycles can be counted in blocks.", ["table", "symbolic_working"]),
        stage("handle_remainder", "calculate", "Count the incomplete final block explicitly.", "Remainders must not be assumed to form a complete cycle.", ["table"]),
        stage("combine_positions", "check", "Add the positional subtotals and spot-check a smaller interval.", "Independent subtotals form the total frequency.", ["symbolic_working"]),
      ],
      representations: reps(["table"], ["symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Keep separate subtotals for each digit position or category."],
      generalisationPattern: "Frequency over a structured range can be counted through repeating place-value cycles plus any incomplete remainder.",
      checkPattern: "Verify a small sub-range by direct listing.",
    },
    misconceptions: [
      misconception("cycle_remainder_ignored", "Treating an incomplete final cycle as complete.", ["Count is a neat multiple despite partial range"], "Separate full cycles from the final remainder before adding."),
    ],
    visualGuidance: visual("usually", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape decomposes frequency counting by position and cycle to make completeness auditable.",
  }),

  // ---------------------------------------------------------------------------
  // heuristic.logic_strategy
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "heuristic.logic_strategy.constraint_table",
    familyId: "heuristic.logic_strategy",
    variantId: "constraint_table",
    title: "Organise logical constraints in a table",
    summary: "Maps entities and possibilities into a table, marking confirmed and impossible relationships before deduction.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["logic", "data", "whole_numbers", "arithmetic"],
      structures: ["logic_strategy", "data_classification"],
      reasoning: ["logical_elimination", "classification"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Translate each clue into an explicit allowed or impossible relation and record it consistently in a constraint table.",
      conceptualFocus: ["constraints", "possibility space", "explicit evidence"],
      prerequisiteConcepts: ["classification", "table reading"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("define_entities", "represent", "Place the compared entities and categories on table axes.", "Each cell represents one possible relation.", ["table"]),
        stage("encode_clues", "reason", "Mark direct confirmations and impossibilities from each clue.", "Every mark must be justified by a clue.", ["table"]),
        stage("propagate", "reason", "Use one-to-one or exclusivity constraints to infer additional eliminations.", "A confirmed relation can remove alternatives elsewhere.", ["table"]),
        stage("verify_clues", "check", "Check the completed assignment against every original clue.", "No clue may be violated.", ["table", "verbal_reasoning"]),
      ],
      representations: reps(["table"], ["verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Use consistent symbols for confirmed and impossible cells."],
      generalisationPattern: "Logical constraints reduce a possibility space until only compatible assignments remain.",
      checkPattern: "Re-read every clue against the final table.",
    },
    misconceptions: [
      misconception("assumption_as_fact", "Marking a possibility as confirmed without a supporting clue.", ["No clue can justify a table mark"], "Separate direct evidence from derived evidence and annotate the deduction chain."),
    ],
    visualGuidance: visual("usually", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape logic tables distinguish direct clue marks from propagated deductions.",
  }),
  makeMethod({
    methodId: "heuristic.logic_strategy.elimination",
    familyId: "heuristic.logic_strategy",
    variantId: "elimination",
    title: "Eliminate impossible options systematically",
    summary: "Tests each candidate against known constraints and removes only candidates that violate at least one condition.",
    status: "active",
    applicability: {
      levels: ALL_LEVELS,
      domains: ["logic", "whole_numbers", "arithmetic", "data"],
      structures: ["logic_strategy", "symbol_mapping", "data_classification"],
      reasoning: ["logical_elimination", "classification", "rule_inference"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Retain all candidates initially, test each against constraints, and remove only those with a stated contradiction.",
      conceptualFocus: ["candidate set", "contradiction", "evidence-based elimination"],
      prerequisiteConcepts: ["condition checking", "classification"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("list_candidates", "represent", "List all reasonable candidates before eliminating any.", "A complete starting set prevents hidden assumptions.", ["table"]),
        stage("test_constraints", "reason", "Check candidates against one constraint at a time.", "Elimination requires a specific contradiction.", ["table", "verbal_reasoning"]),
        stage("remove_impossible", "calculate", "Cross out candidates that fail and retain those still possible.", "Unknown is not the same as impossible.", ["table"]),
        stage("confirm_survivor", "check", "Test the remaining candidate(s) against all constraints together.", "Survival of every condition is required.", ["verbal_reasoning"]),
      ],
      representations: reps(["table"], ["verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Record the reason for each elimination where the set is non-trivial."],
      generalisationPattern: "A candidate is eliminated only when it contradicts a known condition.",
      checkPattern: "Verify the final candidate satisfies every condition.",
    },
    misconceptions: [
      misconception("eliminate_without_reason", "Discarding a candidate because it seems unlikely rather than impossible.", ["Cannot cite a violated condition"], "Require one explicit contradiction for every elimination."),
    ],
    visualGuidance: visual("optional", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape requires traceable elimination reasons rather than intuition-only pruning.",
  }),
  makeMethod({
    methodId: "heuristic.logic_strategy.deduction_chain",
    familyId: "heuristic.logic_strategy",
    variantId: "deduction_chain",
    title: "Build a justified deduction chain",
    summary: "Links known facts and derived facts in a sequence where each new conclusion states the evidence it depends on.",
    status: "active",
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ["logic", "whole_numbers", "arithmetic", "algebra"],
      structures: ["logic_strategy", "symbol_mapping", "operation_chain"],
      reasoning: ["logical_elimination", "rule_inference", "equation_solving"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Derive conclusions one at a time and identify which known facts justify each deduction.",
      conceptualFocus: ["premise", "deduction", "dependency"],
      prerequisiteConcepts: ["logical statements", "condition checking"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("state_known", "represent", "Separate directly given facts from facts still to be inferred.", "Given and derived information have different status.", ["table", "verbal_reasoning"]),
        stage("derive_one", "reason", "Choose one consequence that follows from the known facts and state why.", "Each deduction has a dependency.", ["verbal_reasoning"]),
        stage("add_to_known", "reason", "Promote the justified conclusion to the known set and continue.", "New facts can support later deductions.", ["table"]),
        stage("audit_chain", "check", "Trace the final conclusion backward through its supporting facts.", "Every link must be justified.", ["verbal_reasoning"]),
      ],
      representations: reps(["table", "verbal_reasoning"], ["symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Use 'because' statements or arrows to show dependencies."],
      generalisationPattern: "A valid deduction chain consists only of conclusions supported by previously established facts.",
      checkPattern: "Trace every derived fact back to givens or earlier justified deductions.",
    },
    misconceptions: [
      misconception("circular_reasoning", "Using a conclusion as evidence for itself or for an earlier unsupported step.", ["Dependency cycle", "No independent starting fact"], "Trace the chain back to direct givens and break circular links."),
    ],
    visualGuidance: visual("optional", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape stores deduction dependencies so explanations can reveal one justified inference at a time.",
  }),
  makeMethod({
    methodId: "heuristic.logic_strategy.special_cases",
    familyId: "heuristic.logic_strategy",
    variantId: "special_cases",
    title: "Test boundary and special cases",
    summary: "Uses strategically chosen extreme, parity, uniqueness or boundary cases to reduce a logical search space without replacing proof by guessing.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["logic", "whole_numbers", "arithmetic"],
      structures: ["logic_strategy"],
      reasoning: ["logical_elimination", "comparison"],
      curriculumSkills: [],
      exclusions: ["A special case may eliminate possibilities but cannot establish a general conclusion unless the logic justifies it."],
    },
    pedagogy: {
      learningObjectivePattern: "Choose a constrained boundary or special case that exposes impossible arrangements, then return to the general conditions.",
      conceptualFocus: ["boundary case", "constraint stress-test", "counterexample"],
      prerequisiteConcepts: ["logical constraints", "comparison"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("identify_tight_constraint", "reason", "Find the most restrictive condition or boundary in the problem.", "Tight constraints reduce the search fastest.", ["verbal_reasoning"]),
        stage("test_case", "reason", "Test a carefully chosen extreme or special case.", "The test is purposeful, not random guessing.", ["table", "symbolic_working"]),
        stage("eliminate_or_learn", "reason", "Use contradiction or confirmed structure from the case to reduce the remaining possibilities.", "A failed case provides evidence for elimination.", ["verbal_reasoning"]),
        stage("return_general", "check", "Verify the remaining conclusion against the full set of conditions.", "Special-case evidence must integrate with the general problem.", ["verbal_reasoning"]),
      ],
      representations: reps(["verbal_reasoning"], ["table", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["State why the chosen case is informative."],
      generalisationPattern: "A strategically chosen special case can expose contradictions or forced structure, but the final conclusion must satisfy all conditions.",
      checkPattern: "Recheck the final conclusion under the original unrestricted conditions.",
    },
    misconceptions: [
      misconception("example_as_proof", "Assuming one successful example proves every case.", ["Conclusion based only on one trial"], "Use the trial to derive a constraint, then justify the general conclusion separately."),
    ],
    visualGuidance: visual("optional", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape uses special cases as controlled elimination tools, never as a generic guess-and-check fallback.",
  }),

  // ---------------------------------------------------------------------------
  // heuristic.multi_step
  // ---------------------------------------------------------------------------
  makeMethod({
    methodId: "heuristic.multi_step.identify_subgoals",
    familyId: "heuristic.multi_step",
    variantId: "identify_subgoals",
    title: "Break a multi-step problem into meaningful subgoals",
    summary: "Works backward from the final target to identify intermediate quantities that must be found first.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "fractions", "money", "measurement", "ratio"],
      structures: ["multi_step", "fraction_multi_step"],
      reasoning: ["fraction_multi_step", "addition", "subtraction", "multiplication", "division", "comparison", "working_backwards"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify the final target, then name the intermediate quantities required before the target can be calculated.",
      conceptualFocus: ["subgoals", "target dependency", "problem decomposition"],
      prerequisiteConcepts: ["operation meaning", "target identification"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("state_final_target", "establish_meaning", "State exactly what the question ultimately asks for.", "The final target controls the solution path.", ["verbal_reasoning"]),
        stage("ask_what_needed", "reason", "Ask what must be known immediately before the final target can be found.", "Each subgoal supplies an input to a later step.", ["verbal_reasoning"]),
        stage("repeat_dependencies", "reason", "Continue backward until all required inputs are given or directly computable.", "The chain stops at known information.", ["table"]),
        stage("solve_forward", "calculate", "Calculate the subgoals in dependency order and then the final target.", "Work forward only after the dependency path is clear.", ["symbolic_working"]),
      ],
      representations: reps(["table", "verbal_reasoning"], ["bar_model", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Name each intermediate quantity before calculating it."],
      generalisationPattern: "A multi-step solution is a dependency chain from givens to intermediate results to the final target.",
      checkPattern: "Confirm every intermediate result is used by a later step or the final answer.",
    },
    misconceptions: [
      misconception("calculate_every_number", "Combining numbers simply because they appear in the problem.", ["Intermediate result has no role in final target"], "Return to the target and justify each subgoal dependency."),
    ],
    visualGuidance: visual("optional", ["table", "bar_model"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape derives multi-step subgoals from target dependencies rather than keyword order.",
  }),
  makeMethod({
    methodId: "heuristic.multi_step.dependency_order",
    familyId: "heuristic.multi_step",
    variantId: "dependency_order",
    title: "Execute intermediate results in dependency order",
    summary: "Orders intermediate calculations so every step uses only known givens or already-established results.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "fractions", "money", "measurement", "ratio"],
      structures: ["multi_step", "fraction_multi_step", "operation_chain"],
      reasoning: ["fraction_multi_step", "addition", "subtraction", "multiplication", "division", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Arrange the identified subgoals so each calculation has all required inputs available before it is attempted.",
      conceptualFocus: ["dependency order", "intermediate result", "calculation sequence"],
      prerequisiteConcepts: ["identified subgoals"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("draw_dependencies", "represent", "List or diagram which values each subgoal depends on.", "A step cannot be completed before its inputs exist.", ["table"]),
        stage("choose_ready_step", "reason", "Select a subgoal whose inputs are all known.", "Ready steps are determined by dependencies.", ["verbal_reasoning"]),
        stage("record_intermediate", "calculate", "Calculate and label the intermediate result, then make it available to later steps.", "Labelled results prevent loss of meaning.", ["symbolic_working"]),
        stage("continue_to_target", "calculate", "Repeat until the final target is reachable.", "The chain progresses only through valid dependencies.", ["symbolic_working"]),
      ],
      representations: reps(["table", "symbolic_working"], ["verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Label intermediate results with nouns/units, not only bare numbers."],
      generalisationPattern: "A correct multi-step order is any order that respects all dependencies between intermediate quantities.",
      checkPattern: "For each step, identify where every input came from.",
    },
    misconceptions: [
      misconception("premature_step", "Attempting a calculation before one of its required quantities has been established.", ["Uses an unstated assumed value"], "Draw the dependency relation and solve a prerequisite subgoal first."),
    ],
    visualGuidance: visual("optional", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape records multi-step dependencies explicitly so later planning cannot reorder steps unsafely.",
  }),
  makeMethod({
    methodId: "heuristic.multi_step.final_synthesis",
    familyId: "heuristic.multi_step",
    variantId: "final_synthesis",
    title: "Synthesize intermediate results into the final target",
    summary: "Combines already-validated intermediate quantities in the final relationship and performs a whole-solution reasonableness check.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "fractions", "money", "measurement", "ratio"],
      structures: ["multi_step", "fraction_multi_step"],
      reasoning: ["fraction_multi_step", "addition", "subtraction", "multiplication", "division", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use the completed intermediate quantities in the exact relationship required by the final question, then check the whole solution.",
      conceptualFocus: ["final synthesis", "target alignment", "reasonableness"],
      prerequisiteConcepts: ["completed subgoals", "target identification"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("return_target", "activate_prior_knowledge", "Restate the final target before combining intermediate results.", "The last operation must answer the actual question.", ["verbal_reasoning"]),
        stage("select_intermediates", "reason", "Choose only the intermediate results required by the final relationship.", "Not every intermediate number must appear in the final operation.", ["table"]),
        stage("synthesise", "calculate", "Apply the final relationship and attach the correct unit or noun.", "The final value inherits meaning from the target.", ["symbolic_working"]),
        stage("whole_solution_check", "check", "Review magnitude, units, constraints and the dependency chain for consistency.", "A locally correct final operation can still depend on an earlier error.", ["verbal_reasoning"]),
      ],
      representations: reps(["symbolic_working"], ["table", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write a short label for the final relationship before substituting values."],
      generalisationPattern: "The final step should combine only the established quantities required by the question's final relationship.",
      checkPattern: "Check units, size, constraints and one earlier dependency path.",
    },
    misconceptions: [
      misconception("intermediate_as_answer", "Stopping at an intermediate quantity that does not answer the question.", ["Numerical work ends before requested target"], "Restate the question after every major intermediate result."),
    ],
    visualGuidance: visual("optional", ["table"]),
    officialClaimTag: "problem_solving_heuristics",
    dreamscapeClaim: "Dreamscape separates final synthesis from intermediate calculation so the answer remains tied to the explicit target.",
  }),
];

export const PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS = Object.freeze(METHODS);

export const PHASE4B4_METHOD_THEME_COVERAGE: readonly Phase4B4MethodThemeCoverage[] = Object.freeze([
  { methodId: "model.part_whole.known_whole_find_part", familyId: "model.part_whole", themes: ["known whole", "unknown part", "bar/strip representation"] },
  { methodId: "model.part_whole.parts_find_whole", familyId: "model.part_whole", themes: ["unknown whole", "bar/strip representation"] },
  { methodId: "model.part_whole.multi_part_strip", familyId: "model.part_whole", themes: ["bar/strip representation"] },

  { methodId: "model.comparison.aligned_bars_difference", familyId: "model.comparison", themes: ["difference", "more/less", "comparison bar"] },
  { methodId: "model.comparison.more_less_unknown", familyId: "model.comparison", themes: ["more/less", "comparison bar"] },
  { methodId: "model.comparison.unit_comparison", familyId: "model.comparison", themes: ["unit comparison"] },

  { methodId: "model.change.forward_change", familyId: "model.change", themes: ["increase", "decrease", "unknown result"] },
  { methodId: "model.change.find_change", familyId: "model.change", themes: ["unknown change"] },
  { methodId: "model.change.find_start", familyId: "model.change", themes: ["unknown start"] },

  { methodId: "model.equal_groups.groups_to_total", familyId: "model.equal_groups", themes: ["number of groups", "size of group", "total"] },
  { methodId: "model.equal_groups.total_to_unknown_group", familyId: "model.equal_groups", themes: ["number of groups", "size of group", "total"] },
  { methodId: "model.equal_groups.sharing_grouping_distinction", familyId: "model.equal_groups", themes: ["sharing/grouping distinction"] },

  { methodId: "heuristic.unitary.one_then_many", familyId: "heuristic.unitary", themes: ["find one unit", "scale up"] },
  { methodId: "heuristic.unitary.scale_down_then_up", familyId: "heuristic.unitary", themes: ["scale down", "scale up"] },
  { methodId: "heuristic.unitary.contextual_rate", familyId: "heuristic.unitary", themes: ["rate context", "find one unit"] },

  { methodId: "heuristic.transfer_difference.double_effect", familyId: "heuristic.transfer_difference", themes: ["transfer between groups", "difference changes twice"] },
  { methodId: "heuristic.transfer_difference.before_after_comparison", familyId: "heuristic.transfer_difference", themes: ["before/after comparison"] },

  { methodId: "heuristic.working_backwards.reverse_operations", familyId: "heuristic.working_backwards", themes: ["reverse operation", "check forward"] },
  { methodId: "heuristic.working_backwards.reverse_event_sequence", familyId: "heuristic.working_backwards", themes: ["reverse event sequence", "check forward"] },

  { methodId: "heuristic.age_relationship.constant_difference", familyId: "heuristic.age_relationship", themes: ["constant difference"] },
  { methodId: "heuristic.age_relationship.time_shift", familyId: "heuristic.age_relationship", themes: ["time shift"] },
  { methodId: "heuristic.age_relationship.ratio_at_time", familyId: "heuristic.age_relationship", themes: ["ratio at a time point"] },

  { methodId: "heuristic.systematic_enumeration.ordered_list", familyId: "heuristic.systematic_enumeration", themes: ["systematic list", "avoid duplicates"] },
  { methodId: "heuristic.systematic_enumeration.tabulation", familyId: "heuristic.systematic_enumeration", themes: ["table", "avoid duplicates"] },
  { methodId: "heuristic.systematic_enumeration.spatial_sweep", familyId: "heuristic.systematic_enumeration", themes: ["spatial sweep", "avoid duplicates"] },
  { methodId: "heuristic.systematic_enumeration.digit_frequency", familyId: "heuristic.systematic_enumeration", themes: ["systematic list"] },

  { methodId: "heuristic.logic_strategy.constraint_table", familyId: "heuristic.logic_strategy", themes: ["constraint table", "deduction"] },
  { methodId: "heuristic.logic_strategy.elimination", familyId: "heuristic.logic_strategy", themes: ["elimination"] },
  { methodId: "heuristic.logic_strategy.deduction_chain", familyId: "heuristic.logic_strategy", themes: ["deduction"] },
  { methodId: "heuristic.logic_strategy.special_cases", familyId: "heuristic.logic_strategy", themes: ["special cases"] },

  { methodId: "heuristic.multi_step.identify_subgoals", familyId: "heuristic.multi_step", themes: ["identify subgoals", "dependency order"] },
  { methodId: "heuristic.multi_step.dependency_order", familyId: "heuristic.multi_step", themes: ["dependency order", "intermediate result"] },
  { methodId: "heuristic.multi_step.final_synthesis", familyId: "heuristic.multi_step", themes: ["final synthesis", "intermediate result"] },
]);

export function getPhase4B4MethodsByFamily(familyId: Phase4BMethodFamilyId): Readonly<TeachingMethod>[] {
  return PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.filter((method) => method.familyId === familyId);
}

export type Phase4B4CandidateQuery = {
  learnerLevel: 1 | 2 | 3 | 4 | 5 | 6;
  domain: TeachingMethod["applicability"]["domains"][number];
  problemStructure: TeachingMethod["applicability"]["structures"][number];
  requiredReasoning: TeachingMethod["applicability"]["reasoning"];
  candidateFamilies: Phase4BMethodFamilyId[];
};

export function listPhase4B4CandidateMethods(query: Phase4B4CandidateQuery): Readonly<TeachingMethod>[] {
  const familySet = new Set(query.candidateFamilies);
  const reasoningSet = new Set(query.requiredReasoning);
  return PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.filter((method) => {
    if (!familySet.has(method.familyId)) return false;
    if (!method.applicability.levels.includes(query.learnerLevel)) return false;
    if (!method.applicability.domains.includes(query.domain)) return false;
    if (!method.applicability.structures.includes(query.problemStructure)) return false;
    return method.applicability.reasoning.some((reasoning) => reasoningSet.has(reasoning));
  });
}
