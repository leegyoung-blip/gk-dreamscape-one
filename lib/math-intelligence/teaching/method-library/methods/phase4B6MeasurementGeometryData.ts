import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  defineTeachingMethod,
  type TeachingMethod,
  type TeachingMethodMisconception,
  type TeachingMethodStage,
  type TeachingRepresentationType,
} from "../schema";
import type { Phase4BMethodFamilyId } from "../taxonomy/types";

export type Phase4B6MethodThemeCoverage = {
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
      statement: input.officialClaimStatement ?? "The primary mathematics syllabus supports conceptual understanding, problem solving and purposeful use of mathematical representations.",
      evidenceNote: "Curriculum-level support only; the exact Dreamscape sequence remains a Dreamscape implementation.",
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
      evidenceNote: "NIE teacher-education reference; not a claim that a particular Dreamscape sequence is MOE-prescribed.",
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
  originalDiagramPolicy: TeachingMethod["visualGuidance"]["originalDiagramPolicy"] = "not_required",
  generatedVisualAllowed = true,
): TeachingMethod["visualGuidance"] {
  return { visualUse, preferredVisualTypes, originalDiagramPolicy, generatedVisualAllowed };
}

export const PHASE4B6_FAMILY_IDS: readonly Phase4BMethodFamilyId[] = [
  "measurement.compare_change_total",
  "measurement.unit_conversion",
  "money.transaction",
  "geometry.properties",
  "geometry.angle",
  "geometry.area_perimeter",
  "time.read_interval",
  "data.read_compare_classify",
  "average.mean",
  "speed.distance_time",
] as const;

const METHODS: Readonly<TeachingMethod>[] = [];
const COVERAGE: Phase4B6MethodThemeCoverage[] = [];

function add(input: MethodInput, themes: string[]): void {
  const method = makeMethod(input);
  METHODS.push(method);
  COVERAGE.push({ methodId: method.methodId, familyId: method.familyId, themes });
}

// ---------------------------------------------------------------------------
// Measurement: comparison, change and total
// ---------------------------------------------------------------------------
add({
  methodId: "measurement.compare_change_total.compare_same_unit",
  familyId: "measurement.compare_change_total",
  variantId: "compare_same_unit",
  title: "Compare measured quantities in a common unit",
  summary: "Checks that quantities use the same unit, aligns their meaning, then finds or interprets the difference.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["measurement"], structures: ["measure_compare"], reasoning: ["comparison", "subtraction"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Compare two measured quantities accurately after confirming a common measurement unit.",
    conceptualFocus: ["same-unit comparison", "difference", "measurement meaning"],
    prerequisiteConcepts: ["read measurement labels", "compare numbers"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("identify_quantities", "establish_meaning", "Name the two measured quantities and their units.", "Numbers cannot be compared meaningfully without their measurement units.", ["measurement_scale", "verbal_reasoning"]),
      stage("check_units", "notice_relationship", "Confirm the units match; convert first if they do not.", "Comparison requires a common unit.", ["table", "symbolic_working"]),
      stage("compare", "reason", "Decide which quantity is greater and what difference is required.", "The comparison relationship determines the operation.", ["bar_model", "measurement_scale"]),
      stage("calculate_check", "calculate", "Find the difference and attach the correct unit.", "The answer must retain the measurement unit.", ["symbolic_working"]),
    ],
    representations: reps(["measurement_scale", "bar_model"], ["table", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write the unit beside every quantity until the units are confirmed equal."], generalisationPattern: "To compare measurements, express both quantities in the same unit, then compare or subtract.", checkPattern: "Check the answer unit and whether the difference is smaller than the larger quantity." },
  misconceptions: [misconception("compare_different_units", "Comparing numerical values that are expressed in different units.", ["Larger numeral chosen without conversion"], "Convert to a common unit before comparing the numbers.")],
  visualGuidance: visual("usually", ["measurement_scale", "bar_model"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape makes the same-unit check an explicit stage before comparison.",
}, ["compare", "same-unit check"]);

add({
  methodId: "measurement.compare_change_total.track_change",
  familyId: "measurement.compare_change_total",
  variantId: "track_change",
  title: "Track a change in a measured quantity",
  summary: "Represents an initial measurement, a change and a resulting measurement before calculating the unknown.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["measurement"], structures: ["measure_change"], reasoning: ["addition", "subtraction", "comparison"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Relate an initial measurement, a change and a final measurement using a stable before-change-after structure.",
    conceptualFocus: ["before-change-after", "increase/decrease", "unit consistency"],
    prerequisiteConcepts: ["addition and subtraction", "measurement units"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("label_states", "represent", "Label the measurement before and after the change.", "The learner distinguishes state from change.", ["bar_model", "timeline"]),
      stage("identify_direction", "notice_relationship", "Decide whether the change increases or decreases the measurement.", "Direction determines whether addition or subtraction is appropriate.", ["verbal_reasoning"]),
      stage("calculate", "calculate", "Use the known two parts of the relationship to find the unknown.", "The calculation follows the represented relationship.", ["symbolic_working"]),
      stage("check_unit", "check", "Check the result against the direction of change and the unit.", "The result should move in the expected direction.", ["verbal_reasoning"]),
    ],
    representations: reps(["bar_model", "timeline"], ["measurement_scale", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Use BEFORE, CHANGE and AFTER labels when the wording is dense."], generalisationPattern: "Final = initial ± change; rearrange the same relationship when a different quantity is unknown.", checkPattern: "An increase should produce a larger final measure; a decrease should produce a smaller one." },
  misconceptions: [misconception("change_as_state", "Treating the amount of change as if it were the final measurement.", ["Answer equals the change amount"], "Re-label before, change and after as three different quantities.")],
  visualGuidance: visual("usually", ["bar_model", "timeline"]),
  officialClaimTag: "representation_selection", cpaClaim: true,
  dreamscapeClaim: "Dreamscape encodes measurement-change questions using an explicit before-change-after representation.",
}, ["change", "same-unit check"]);

add({
  methodId: "measurement.compare_change_total.combine_total",
  familyId: "measurement.compare_change_total",
  variantId: "combine_total",
  title: "Combine measured parts into a total",
  summary: "Checks units and combines compatible measured parts while preserving measurement meaning.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["measurement"], structures: ["measure_total"], reasoning: ["addition", "multiplication"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Combine measured quantities into a total after confirming that all quantities are expressed compatibly.",
    conceptualFocus: ["part-total measurement", "unit consistency", "aggregation"],
    prerequisiteConcepts: ["addition", "measurement units"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("list_parts", "represent", "List each measured part with its unit.", "Every contribution to the total is explicit.", ["table"]),
      stage("align_units", "notice_relationship", "Convert any incompatible units before combining.", "Only compatible units can be added directly.", ["table", "symbolic_working"]),
      stage("sum_total", "calculate", "Add or group the compatible measures to obtain the total.", "The total retains the common unit.", ["symbolic_working"]),
      stage("reasonableness", "check", "Check that the total is at least as large as each positive part.", "A total should be consistent with its parts.", ["verbal_reasoning"]),
    ],
    representations: reps(["table"], ["bar_model", "measurement_scale", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Keep units visible through every intermediate line."], generalisationPattern: "Convert compatible measures to a common unit, then combine the parts.", checkPattern: "For positive parts, the total cannot be smaller than any single part." },
  misconceptions: [misconception("add_mixed_units", "Adding unlike measurement units directly.", ["Mixed units appear in one addition statement"], "Convert to a common unit before addition.")],
  visualGuidance: visual("optional", ["table", "bar_model"]),
  officialClaimTag: "conceptual_understanding",
  dreamscapeClaim: "Dreamscape requires unit alignment before measured parts are aggregated.",
}, ["total", "same-unit check"]);

// ---------------------------------------------------------------------------
// Measurement unit conversion
// ---------------------------------------------------------------------------
add({
  methodId: "measurement.unit_conversion.equivalence_bridge",
  familyId: "measurement.unit_conversion",
  variantId: "equivalence_bridge",
  title: "Convert using a known unit equivalence",
  summary: "Starts from a known equivalence and scales between larger and smaller units without using an unexplained rule.",
  status: "active",
  applicability: { levels: [2,3,4,5,6], domains: ["measurement", "time"], structures: ["unit_conversion"], reasoning: ["unit_conversion", "multiplication", "division"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Use a known unit equivalence to convert a measurement while preserving the same physical quantity.",
    conceptualFocus: ["unit equivalence", "same quantity", "scale factor"],
    prerequisiteConcepts: ["multiplication and division", "measurement units"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("state_equivalence", "establish_meaning", "State the relevant larger-unit to smaller-unit equivalence.", "Conversion starts from a relationship, not a memorised direction word.", ["table", "measurement_scale"]),
      stage("choose_direction", "reason", "Decide whether the numerical value should become larger or smaller when the unit changes.", "Smaller units usually require more units; larger units require fewer.", ["verbal_reasoning"]),
      stage("scale", "calculate", "Multiply or divide by the equivalence factor.", "The physical quantity stays the same while the numeral changes.", ["symbolic_working"]),
      stage("sense_check", "check", "Check whether the direction of numerical change matches the unit size.", "Unit size provides a reasonableness check.", ["verbal_reasoning"]),
    ],
    representations: reps(["table", "measurement_scale"], ["double_number_line", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write the equivalence before applying the scale factor."], generalisationPattern: "Use the unit equivalence as a multiplicative relationship between two names for the same quantity.", checkPattern: "Changing to a smaller unit should usually increase the numeral for the same quantity." },
  misconceptions: [misconception("conversion_direction", "Multiplying or dividing in the wrong direction.", ["Numeral changes opposite to unit-size expectation"], "Compare the size of one unit before deciding the operation.")],
  visualGuidance: visual("usually", ["table", "measurement_scale"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape requires learners to reason from unit equivalence before applying a conversion factor.",
}, ["unit relationship"]);

add({
  methodId: "measurement.unit_conversion.convert_before_operating",
  familyId: "measurement.unit_conversion",
  variantId: "convert_before_operating",
  title: "Convert before combining or comparing",
  summary: "Normalises unlike units before addition, subtraction or comparison.",
  status: "active",
  applicability: { levels: [2,3,4,5,6], domains: ["measurement", "time"], structures: ["unit_conversion", "measure_compare", "measure_total"], reasoning: ["unit_conversion", "comparison", "addition", "subtraction"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Recognise when mixed units must be normalised before arithmetic or comparison.",
    conceptualFocus: ["common unit", "operation readiness", "unit equivalence"],
    prerequisiteConcepts: ["basic unit equivalences", "addition/subtraction"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("spot_mixed_units", "notice_relationship", "Inspect every given quantity and identify unlike units.", "The operation is delayed until units are compatible.", ["table"]),
      stage("choose_common_unit", "reason", "Choose a practical common unit for all quantities.", "A common unit makes the quantities directly comparable.", ["verbal_reasoning"]),
      stage("convert", "calculate", "Convert all required quantities to the chosen unit.", "Each conversion preserves quantity.", ["symbolic_working"]),
      stage("operate", "calculate", "Carry out the intended addition, subtraction or comparison.", "Arithmetic happens only after normalisation.", ["symbolic_working"]),
    ],
    representations: reps(["table"], ["measurement_scale", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Do not place unlike units in the same arithmetic line."], generalisationPattern: "Normalise units first, then perform the mathematical operation.", checkPattern: "Confirm all operands in the final calculation use the same unit." },
  misconceptions: [misconception("operate_before_convert", "Operating on mixed units directly.", ["Unlike units appear around +, − or comparison sign"], "Pause the operation and convert to a common unit first.")],
  visualGuidance: visual("optional", ["table"]),
  officialClaimTag: "representation_selection",
  dreamscapeClaim: "Dreamscape treats unit normalisation as a prerequisite gate for arithmetic on measurements.",
}, ["convert first"]);

add({
  methodId: "measurement.unit_conversion.compound_unit_bridge",
  familyId: "measurement.unit_conversion",
  variantId: "compound_unit_bridge",
  title: "Bridge compound or linked units one component at a time",
  summary: "Handles linked measurement units by converting one component systematically and tracking labels throughout.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["measurement", "speed_rate", "time"], structures: ["unit_conversion", "speed_distance_time", "time_interval"], reasoning: ["unit_conversion", "rate_scaling"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Convert quantities involving linked or compound units by transforming one unit component at a time.",
    conceptualFocus: ["compound unit", "linked conversion", "unit tracking"],
    prerequisiteConcepts: ["simple unit conversion", "multiplication/division"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("parse_unit", "establish_meaning", "Separate the compound unit into its component units.", "Each component contributes to the rate or measure meaning.", ["table", "verbal_reasoning"]),
      stage("select_component", "reason", "Choose one component to convert while holding the other relationship fixed.", "One controlled change avoids double conversion errors.", ["table"]),
      stage("convert_component", "calculate", "Apply the relevant equivalence and rewrite the compound unit.", "The numerical scale follows the component conversion.", ["symbolic_working"]),
      stage("verify_units", "check", "Read the final compound unit aloud and verify it matches the requested form.", "The unit label is part of the answer meaning.", ["verbal_reasoning"]),
    ],
    representations: reps(["table"], ["unit_rate_table", "double_number_line", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Track numerator-like and denominator-like unit components explicitly in rate contexts."], generalisationPattern: "Convert one unit component at a time and update both numeral and unit label consistently.", checkPattern: "Verify both components of the final unit, not just the number." },
  misconceptions: [misconception("partial_compound_conversion", "Changing the numerical value but leaving the compound-unit label unchanged.", ["Converted numeral paired with old unit"], "Rewrite the unit label immediately after each component conversion.")],
  visualGuidance: visual("usually", ["table", "unit_rate_table"]),
  officialClaimTag: "conceptual_understanding",
  dreamscapeClaim: "Dreamscape decomposes compound-unit conversion into explicit unit-component transformations.",
}, ["compound units where applicable"]);

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------
add({
  methodId: "money.transaction.total_cost",
  familyId: "money.transaction",
  variantId: "total_cost",
  title: "Find total cost from prices and quantities",
  summary: "Builds the cost of each purchase line and combines those costs into one total.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["money"], structures: ["money_total", "money_purchase"], reasoning: ["money_calculation", "addition", "multiplication"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Calculate the total amount paid by linking item price, quantity and combined cost.",
    conceptualFocus: ["unit price", "quantity", "line total", "grand total"],
    prerequisiteConcepts: ["addition", "multiplication when quantity exceeds one"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("list_items", "represent", "List each item, quantity and price clearly.", "Each purchase contribution is visible.", ["table", "money_model"]),
      stage("line_costs", "calculate", "Find each line cost when more than one of an item is bought.", "Quantity multiplies the unit price.", ["table", "symbolic_working"]),
      stage("sum", "calculate", "Add all line costs to obtain the total cost.", "The total combines every purchase exactly once.", ["symbolic_working"]),
      stage("check_currency", "check", "Check decimal/cents notation and currency units.", "Money notation must be consistent.", ["verbal_reasoning"]),
    ],
    representations: reps(["table", "money_model"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Align dollars and cents when using written addition."], generalisationPattern: "Total cost is the sum of quantity × unit price for each purchase line.", checkPattern: "The total must be at least as large as the largest positive line cost." },
  misconceptions: [misconception("ignore_quantity", "Adding listed unit prices without accounting for quantities.", ["Repeated item count omitted"], "Compute each quantity × unit price before summing.")],
  visualGuidance: visual("usually", ["table", "money_model"]),
  officialClaimTag: "curriculum_scope", cpaClaim: true,
  dreamscapeClaim: "Dreamscape structures purchase totals as line costs followed by a grand total.",
}, ["total cost", "purchase"]);

add({
  methodId: "money.transaction.change_from_payment",
  familyId: "money.transaction",
  variantId: "change_from_payment",
  title: "Find change from amount paid",
  summary: "Separates cost from payment and treats change as the difference between them.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["money"], structures: ["money_change", "money_purchase"], reasoning: ["money_calculation", "subtraction"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Interpret change as amount paid minus total cost.",
    conceptualFocus: ["payment", "cost", "change", "difference"],
    prerequisiteConcepts: ["subtraction", "money notation"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("label_payment_cost", "represent", "Label the amount paid and the total cost as different quantities.", "Payment and cost are not interchangeable.", ["money_model", "bar_model"]),
      stage("identify_difference", "notice_relationship", "Recognise change as the unused part of the payment.", "Change is a difference relationship.", ["bar_model"]),
      stage("subtract", "calculate", "Subtract cost from amount paid.", "The operation follows the payment-cost relationship.", ["symbolic_working"]),
      stage("check", "check", "Verify cost + change recreates the amount paid.", "Forward checking confirms the result.", ["symbolic_working"]),
    ],
    representations: reps(["money_model", "bar_model"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write Amount paid − Cost = Change."], generalisationPattern: "Change = payment − cost.", checkPattern: "Cost + change should equal the amount paid." },
  misconceptions: [misconception("reverse_change_subtraction", "Subtracting payment from cost.", ["Negative or impossible change in a simple purchase"], "Use the whole payment as the starting amount and remove the cost.")],
  visualGuidance: visual("usually", ["money_model", "bar_model"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape teaches change as a part-whole difference within the amount paid.",
}, ["change", "purchase"]);

add({
  methodId: "money.transaction.price_difference",
  familyId: "money.transaction",
  variantId: "price_difference",
  title: "Compare prices and find a money difference",
  summary: "Aligns two money amounts and finds how much more or less one is than the other.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["money"], structures: ["money_difference"], reasoning: ["money_calculation", "comparison", "subtraction"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Compare two money amounts and calculate the difference in a consistent currency unit.",
    conceptualFocus: ["price comparison", "difference", "dollars and cents"],
    prerequisiteConcepts: ["comparison", "subtraction"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("align_prices", "represent", "Write the two prices with aligned dollar and cent places.", "Place-value alignment prevents cents errors.", ["table", "money_model"]),
      stage("decide_more_less", "reason", "Identify which amount is greater and what comparison is asked.", "Language such as more/less determines the direction.", ["verbal_reasoning"]),
      stage("subtract", "calculate", "Subtract the smaller amount from the larger amount.", "The difference measures the gap between prices.", ["symbolic_working"]),
      stage("check_unit", "check", "Express the result in correct money notation.", "A money difference still carries currency meaning.", ["verbal_reasoning"]),
    ],
    representations: reps(["table", "money_model"], ["bar_model", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Align decimal points/cents places before written subtraction."], generalisationPattern: "Money difference = larger amount − smaller amount.", checkPattern: "Add the difference to the smaller amount to recover the larger amount." },
  misconceptions: [misconception("misalign_cents", "Misaligning dollars and cents in written subtraction.", ["Cent digits placed under dollar digits"], "Rewrite both amounts with aligned place values before subtracting.")],
  visualGuidance: visual("optional", ["money_model", "table"]),
  officialClaimTag: "conceptual_understanding",
  dreamscapeClaim: "Dreamscape combines money place-value alignment with explicit comparison language.",
}, ["difference"]);

add({
  methodId: "money.transaction.combination_purchase",
  familyId: "money.transaction",
  variantId: "combination_purchase",
  title: "Reason through a combination of purchases",
  summary: "Organises multiple purchase choices or bundles and computes the cost of a specified combination.",
  status: "active",
  applicability: { levels: [2,3,4,5,6], domains: ["money"], structures: ["money_combination", "money_purchase"], reasoning: ["money_calculation", "addition", "multiplication", "counting"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Translate a purchase combination into counted quantities and corresponding costs before calculating the final amount.",
    conceptualFocus: ["purchase combination", "quantity", "bundle", "total cost"],
    prerequisiteConcepts: ["addition", "multiplication", "counting"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("decode_combination", "represent", "Identify exactly how many of each item or bundle are included.", "The learner converts words or icons into quantities.", ["table", "money_model"]),
      stage("cost_each_group", "calculate", "Find the cost contribution of each item group.", "Each group has its own subtotal.", ["table", "symbolic_working"]),
      stage("combine", "calculate", "Add the subtotals to obtain the combination cost.", "Every component is included once.", ["symbolic_working"]),
      stage("check_inventory", "check", "Recount the chosen items/bundles and verify no component was omitted or duplicated.", "The total reflects the specified combination only.", ["verbal_reasoning"]),
    ],
    representations: reps(["table", "money_model"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Use one row per distinct item or bundle."], generalisationPattern: "Combination cost = sum of each selected quantity × its unit or bundle price.", checkPattern: "Recount the selected combination and match each count to one subtotal." },
  misconceptions: [misconception("duplicate_component", "Counting one item or bundle twice in the total.", ["Subtotal appears more than once"], "Use a one-row-per-component table and tick each component once.")],
  visualGuidance: visual("usually", ["table", "money_model"]),
  officialClaimTag: "problem_solving_heuristics", cpaClaim: true,
  dreamscapeClaim: "Dreamscape uses a component table to make multi-item purchase combinations auditable.",
}, ["combination", "purchase"]);

// ---------------------------------------------------------------------------
// Geometry properties
// ---------------------------------------------------------------------------
add({
  methodId: "geometry.properties.defining_properties",
  familyId: "geometry.properties",
  variantId: "defining_properties",
  title: "Identify a shape from defining properties",
  summary: "Focuses on properties that define a shape rather than incidental appearance or orientation.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["geometry"], structures: ["shape_properties", "property_matching"], reasoning: ["property_matching", "classification", "spatial_reasoning"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Identify and justify a shape using defining geometric properties.",
    conceptualFocus: ["defining property", "non-defining appearance", "classification"],
    prerequisiteConcepts: ["basic shape vocabulary"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("observe", "represent", "Inspect sides, vertices, angles or other relevant features.", "Attention is directed to mathematical properties rather than orientation.", ["diagram"]),
      stage("list_properties", "notice_relationship", "List the defining properties that are present.", "A property checklist supports classification.", ["table", "diagram"]),
      stage("match_definition", "reason", "Match the observed properties to a shape definition.", "Classification is justified by properties.", ["verbal_reasoning"]),
      stage("test_orientation", "generalise", "Imagine or rotate the shape and confirm its identity does not change.", "Orientation is not usually a defining property.", ["diagram"]),
    ],
    representations: reps(["diagram", "table"], ["geometric_construction", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Name the property before naming the shape when justification is required."], generalisationPattern: "A shape belongs to a class when it satisfies the class's defining properties, regardless of orientation or size.", checkPattern: "Ask whether the conclusion still holds if the figure is rotated or resized." },
  misconceptions: [misconception("prototype_only", "Recognising a shape only in a familiar orientation.", ["Rejects rotated example"], "Return to defining properties and compare a rotated instance property by property.")],
  visualGuidance: visual("essential", ["diagram"], "use_when_present"),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape teaches geometric classification through explicit defining-property checks.",
}, ["properties", "classification"]);

add({
  methodId: "geometry.properties.classify_match",
  familyId: "geometry.properties",
  variantId: "classify_match",
  title: "Classify or match shapes by shared properties",
  summary: "Compares property sets across shapes to group, match or eliminate candidates.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["geometry"], structures: ["property_matching", "shape_properties"], reasoning: ["classification", "property_matching", "logical_elimination"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Classify or match geometric figures by comparing relevant properties systematically.",
    conceptualFocus: ["shared properties", "classification criteria", "elimination"],
    prerequisiteConcepts: ["shape properties"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("set_criterion", "establish_meaning", "State the property or property set that matters for the classification.", "The grouping rule is explicit.", ["table"]),
      stage("inspect_candidates", "represent", "Check each candidate against the same criterion.", "Every figure is judged consistently.", ["diagram", "table"]),
      stage("classify", "reason", "Group matches or eliminate non-matches with a reason.", "Classification is evidence-based.", ["verbal_reasoning"]),
      stage("verify", "check", "Recheck borderline candidates against every required property.", "One matching feature is not enough when several are required.", ["table"]),
    ],
    representations: reps(["diagram", "table"], ["verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Use a property checklist when more than one condition must hold."], generalisationPattern: "Classify by applying the same defining criteria to every candidate.", checkPattern: "Verify that every accepted figure satisfies all required properties." },
  misconceptions: [misconception("single_feature_match", "Matching a shape because of one visible similarity while ignoring other required properties.", ["Only one property cited"], "Use a full property checklist before accepting a match.")],
  visualGuidance: visual("essential", ["diagram", "table"], "use_when_present"),
  officialClaimTag: "representation_selection", cpaClaim: true,
  dreamscapeClaim: "Dreamscape uses consistent property-check tables for geometric matching tasks.",
}, ["properties", "classification"]);

add({
  methodId: "geometry.properties.compose_decompose",
  familyId: "geometry.properties",
  variantId: "compose_decompose",
  title: "Compose and decompose shapes",
  summary: "Breaks a compound figure into familiar pieces or combines pieces to reason about a target shape.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["geometry"], structures: ["shape_composition"], reasoning: ["spatial_reasoning", "counting"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Recognise how familiar shapes can be combined or partitioned to form another figure.",
    conceptualFocus: ["composition", "decomposition", "part-whole geometry"],
    prerequisiteConcepts: ["recognise basic shapes"],
    cpaPolicy: "required_progression",
    teachingSequence: [
      stage("identify_target", "establish_meaning", "Identify the outer target figure or the available component pieces.", "The learner distinguishes whole from parts.", ["diagram", "manipulatives"]),
      stage("trace_parts", "represent", "Trace or mark plausible component boundaries.", "Hidden familiar shapes become visible.", ["diagram"]),
      stage("test_composition", "reason", "Combine or rearrange parts mentally or physically and test fit.", "Spatial relationships are checked, not guessed.", ["manipulatives", "diagram"]),
      stage("generalise", "generalise", "Describe how the whole is composed from the identified parts.", "The relationship can be transferred to similar figures.", ["verbal_reasoning"]),
    ],
    representations: reps(["manipulatives", "diagram"], ["geometric_construction", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Mark decomposition lines lightly and keep the original boundary visible."], generalisationPattern: "Complex figures can often be understood as combinations of familiar simpler shapes.", checkPattern: "The component pieces should exactly cover the whole with no overlaps or gaps." },
  misconceptions: [misconception("overlap_gap", "Proposed component shapes overlap or leave uncovered gaps.", ["Parts do not reconstruct whole exactly"], "Re-trace boundaries and verify a gap-free, overlap-free partition.")],
  visualGuidance: visual("essential", ["manipulatives", "diagram"], "use_when_present"),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape makes composition and decomposition visible through explicit tracing of component regions.",
}, ["composition", "spatial visualisation"]);

add({
  methodId: "geometry.properties.spatial_visualisation",
  familyId: "geometry.properties",
  variantId: "spatial_visualisation",
  title: "Reason through a spatial transformation or viewpoint",
  summary: "Uses controlled mental or diagrammatic transformation to compare positions, orientations or arrangements.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["geometry"], structures: ["shape_composition", "shape_properties", "property_matching"], reasoning: ["spatial_reasoning"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Visualise a geometric arrangement under a controlled rotation, reflection, movement or decomposition while preserving relevant properties.",
    conceptualFocus: ["spatial relation", "orientation", "invariant properties"],
    prerequisiteConcepts: ["shape recognition", "position language"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("anchor", "represent", "Fix one reference point, edge or orientation before transforming the figure.", "A stable anchor reduces spatial drift.", ["diagram"]),
      stage("transform", "reason", "Apply one transformation or viewpoint change at a time.", "The learner tracks what moves and what remains invariant.", ["diagram", "manipulatives"]),
      stage("compare", "notice_relationship", "Compare the transformed arrangement with the target using defining features.", "Visual similarity is checked by properties and position.", ["diagram"]),
      stage("verify", "check", "Reverse the transformation or retrace the move to verify consistency.", "A reversible check catches orientation errors.", ["verbal_reasoning"]),
    ],
    representations: reps(["diagram"], ["manipulatives", "geometric_construction", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Use arrows or reference marks to track orientation when needed."], generalisationPattern: "Track one controlled spatial transformation from a fixed reference and compare invariant features.", checkPattern: "Reverse the transformation to see whether the starting arrangement is recovered." },
  misconceptions: [misconception("uncontrolled_rotation", "Mentally rotating several features at once and losing orientation.", ["Reference edge changes inconsistently"], "Fix an anchor and transform one step at a time.")],
  visualGuidance: visual("essential", ["diagram"], "use_when_present"),
  officialClaimTag: "representation_selection", cpaClaim: true,
  dreamscapeClaim: "Dreamscape uses anchors and reversible transformation steps for spatial visualisation.",
}, ["spatial visualisation"]);

// ---------------------------------------------------------------------------
// Angles
// ---------------------------------------------------------------------------
add({
  methodId: "geometry.angle.identify_angle",
  familyId: "geometry.angle",
  variantId: "identify_angle",
  title: "Identify an angle by its arms and opening",
  summary: "Locates the vertex and arms, then reasons about the size of the turn/opening rather than side lengths.",
  status: "active",
  applicability: { levels: [2,3,4,5,6], domains: ["geometry"], structures: ["angle"], reasoning: ["spatial_reasoning", "classification"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Identify and classify an angle from its vertex, arms and opening.",
    conceptualFocus: ["vertex", "arms", "turn/opening", "angle class"],
    prerequisiteConcepts: ["line segments", "direction"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("locate_vertex", "represent", "Mark the vertex and trace the two arms that form the angle.", "The angle is attached to one vertex and two rays/segments.", ["diagram"]),
      stage("focus_opening", "notice_relationship", "Compare the opening, ignoring how long the arms are drawn.", "Arm length does not determine angle size.", ["diagram"]),
      stage("classify", "reason", "Relate the opening to known angle references when appropriate.", "Reference angles support classification.", ["geometric_construction", "diagram"]),
      stage("verify", "check", "Recheck the intended interior angle when several angles share a vertex.", "The correct region must be identified.", ["diagram"]),
    ],
    representations: reps(["diagram", "geometric_construction"], ["verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Mark the intended angle arc when a vertex contains multiple angles."], generalisationPattern: "Angle size depends on the amount of turn between two arms, not on arm length.", checkPattern: "Confirm the marked arc refers to the intended pair of arms." },
  misconceptions: [misconception("arm_length_angle", "Believing longer arms create a larger angle.", ["Chooses angle with longer drawn sides"], "Overlay or extend arms while preserving the opening to show angle size is unchanged.")],
  visualGuidance: visual("essential", ["diagram", "geometric_construction"], "use_when_present"),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape explicitly separates angle opening from the drawn length of its arms.",
}, ["identify angle"]);

add({
  methodId: "geometry.angle.known_relationships",
  familyId: "geometry.angle",
  variantId: "known_relationships",
  title: "Use known angle relationships",
  summary: "Marks known geometric angle facts and combines them to expose the required angle relationship.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["geometry"], structures: ["angle"], reasoning: ["spatial_reasoning", "addition", "subtraction"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Use a known angle relationship to connect given and unknown angles before calculating.",
    conceptualFocus: ["angle fact", "whole angle", "part angle", "relationship"],
    prerequisiteConcepts: ["angle classification", "addition/subtraction"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("mark_known", "represent", "Mark all given angle measures and relevant geometric facts on the diagram.", "Known information is attached to the correct angle regions.", ["diagram"]),
      stage("name_relationship", "notice_relationship", "State the total-angle or equality relationship being used.", "The calculation is justified by a geometric fact.", ["verbal_reasoning"]),
      stage("form_calculation", "reason", "Write the arithmetic relationship between known and unknown angles.", "Geometry is translated into a solvable numerical relation.", ["equation", "symbolic_working"]),
      stage("check_diagram", "check", "Check the result against the visual size and the angle relationship.", "The answer should be geometrically plausible.", ["diagram"]),
    ],
    representations: reps(["diagram", "equation"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write the geometric fact before the numerical equation."], generalisationPattern: "Identify the relevant angle relationship, then translate it into arithmetic.", checkPattern: "Verify the calculated angle fits both the stated relationship and the diagram." },
  misconceptions: [misconception("unjustified_angle_sum", "Adding or subtracting visible angles without identifying the geometric relationship.", ["Calculation has no stated angle fact"], "Name the whole/equality/turn relationship before operating on the measures.")],
  visualGuidance: visual("essential", ["diagram"], "use_when_present"),
  officialClaimTag: "problem_solving_heuristics", cpaClaim: true,
  dreamscapeClaim: "Dreamscape requires an explicit geometry-to-equation bridge before angle arithmetic.",
}, ["known relationships"]);

add({
  methodId: "geometry.angle.find_unknown",
  familyId: "geometry.angle",
  variantId: "find_unknown",
  title: "Find an unknown angle from a stated relationship",
  summary: "Solves an unknown angle after isolating the relevant angle relationship and known measures.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["geometry"], structures: ["angle"], reasoning: ["addition", "subtraction", "equation_solving", "spatial_reasoning"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Calculate an unknown angle by expressing the geometric relationship as a missing-part or simple equation problem.",
    conceptualFocus: ["unknown angle", "missing part", "equation"],
    prerequisiteConcepts: ["known angle relationships", "inverse operations"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("isolate_relation", "represent", "Highlight only the angles involved in the required relationship.", "Irrelevant diagram information is temporarily suppressed.", ["diagram"]),
      stage("write_equation", "reason", "Write an equation or missing-part statement for the angle relationship.", "The unknown is treated as a quantity, not guessed from appearance.", ["equation"]),
      stage("solve", "calculate", "Use the appropriate inverse operation to find the unknown angle.", "The arithmetic follows the equation structure.", ["symbolic_working"]),
      stage("substitute_check", "check", "Substitute the result back into the relationship.", "The angle values should recreate the known total or equality.", ["equation"]),
    ],
    representations: reps(["diagram", "equation"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Use a symbol or blank consistently for the unknown angle."], generalisationPattern: "Unknown angle = required whole or equal amount − known angle contributions, where that relationship applies.", checkPattern: "Substitute the answer into the original angle relationship." },
  misconceptions: [misconception("estimate_from_drawing", "Estimating an unknown angle from the not-to-scale drawing.", ["Answer chosen visually without using given facts"], "Use the stated geometric relationship and numerical givens, not apparent scale.")],
  visualGuidance: visual("essential", ["diagram", "equation"], "use_when_present"),
  officialClaimTag: "conceptual_understanding",
  dreamscapeClaim: "Dreamscape treats unknown-angle calculation as a diagram-grounded missing-part equation.",
}, ["unknown angle"]);

// ---------------------------------------------------------------------------
// Area and perimeter
// ---------------------------------------------------------------------------
add({
  methodId: "geometry.area_perimeter.distinguish_boundary_surface",
  familyId: "geometry.area_perimeter",
  variantId: "distinguish_boundary_surface",
  title: "Distinguish perimeter from area",
  summary: "Separates boundary length from surface coverage before choosing any formula or operation.",
  status: "active",
  applicability: { levels: [3,4,5,6], domains: ["geometry", "measurement"], structures: ["area", "perimeter"], reasoning: ["area_calculation", "perimeter_calculation", "classification"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Distinguish measuring around a figure from measuring the surface it covers.",
    conceptualFocus: ["boundary", "surface", "linear unit", "square unit"],
    prerequisiteConcepts: ["length measurement", "rectangles/squares"],
    cpaPolicy: "required_progression",
    teachingSequence: [
      stage("trace_boundary", "represent", "Trace the outside boundary to represent perimeter.", "Perimeter measures distance around.", ["diagram", "manipulatives"]),
      stage("cover_surface", "represent", "Cover or imagine covering the interior with equal square units to represent area.", "Area measures surface coverage.", ["area_model", "manipulatives"]),
      stage("compare_units", "notice_relationship", "Compare the units used for each measure.", "Perimeter uses linear units; area uses square units.", ["table"]),
      stage("choose_measure", "generalise", "Decide which quantity a problem is asking for before calculating.", "Meaning precedes formula selection.", ["verbal_reasoning"]),
    ],
    representations: reps(["diagram", "area_model", "manipulatives"], ["table", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write linear units for perimeter and square units for area."], generalisationPattern: "Perimeter measures the boundary; area measures the enclosed surface.", checkPattern: "Check that the unit type matches the quantity being measured." },
  misconceptions: [misconception("swap_area_perimeter", "Using an area calculation for perimeter or vice versa.", ["Square units on perimeter answer", "Linear units on area answer"], "Return to boundary tracing versus surface covering before choosing the procedure.")],
  visualGuidance: visual("essential", ["diagram", "area_model"], "use_when_present"),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape explicitly contrasts boundary tracing and surface covering before formulas are introduced.",
}, ["area", "perimeter"]);

add({
  methodId: "geometry.area_perimeter.rectangle_formula_meaning",
  familyId: "geometry.area_perimeter",
  variantId: "rectangle_formula_meaning",
  title: "Connect rectangle formulas to structure",
  summary: "Links area to rows × columns and perimeter to the sum of side lengths rather than presenting formulas as isolated rules.",
  status: "active",
  applicability: { levels: [3,4,5,6], domains: ["geometry", "measurement"], structures: ["area", "perimeter"], reasoning: ["area_calculation", "perimeter_calculation", "multiplication", "addition"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Explain why rectangle area and perimeter procedures follow from rows/columns and boundary lengths.",
    conceptualFocus: ["rows and columns", "opposite sides", "formula meaning"],
    prerequisiteConcepts: ["multiplication", "addition", "rectangle properties"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("show_structure", "represent", "Mark length and width and, for area, relate them to rows and columns of square units.", "Dimensions have geometric meaning.", ["area_model", "diagram"]),
      stage("derive", "notice_relationship", "Build the calculation from the structure: rows × columns for area; sum of four sides for perimeter.", "The formula is derived from the figure.", ["symbolic_working"]),
      stage("calculate", "calculate", "Substitute the given dimensions and calculate.", "Numerical work follows the derived relationship.", ["symbolic_working"]),
      stage("unit_check", "check", "Attach the appropriate linear or square unit.", "Units reflect the measured quantity.", ["verbal_reasoning"]),
    ],
    representations: reps(["area_model", "diagram"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Label dimensions on the diagram before substitution."], generalisationPattern: "For rectangles, area counts equal square-unit rows and perimeter sums boundary side lengths.", checkPattern: "Use square units for area and linear units for perimeter." },
  misconceptions: [misconception("formula_without_meaning", "Applying the wrong rectangle formula because area and perimeter are treated as memorised symbols.", ["Adds when area is requested or multiplies when perimeter is requested"], "Rebuild the requested measure from rows/columns or boundary tracing.")],
  visualGuidance: visual("usually", ["area_model", "diagram"], "use_when_present"),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape derives rectangle procedures from geometric structure before symbolic substitution.",
}, ["area", "perimeter"]);

add({
  methodId: "geometry.area_perimeter.composite_decomposition",
  familyId: "geometry.area_perimeter",
  variantId: "composite_decomposition",
  title: "Decompose a composite figure",
  summary: "Partitions a composite figure into familiar non-overlapping pieces, computes each required measure, and recombines.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["geometry", "measurement"], structures: ["area", "perimeter"], reasoning: ["area_calculation", "perimeter_calculation", "spatial_reasoning", "addition", "subtraction"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Solve composite area or perimeter problems by decomposing the figure into manageable geometric parts.",
    conceptualFocus: ["decomposition", "non-overlap", "shared/internal edges", "recombination"],
    prerequisiteConcepts: ["basic area/perimeter methods", "shape composition"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("choose_partition", "represent", "Draw a decomposition line that creates familiar shapes without overlap.", "The figure becomes a set of simpler subproblems.", ["diagram"]),
      stage("label_dimensions", "notice_relationship", "Derive and label any missing sub-dimensions needed for the pieces.", "Shared lengths and total-minus-part relationships are explicit.", ["diagram"]),
      stage("calculate_parts", "calculate", "Compute the relevant area or exposed boundary contribution for each part.", "Internal edges are treated correctly for perimeter.", ["symbolic_working"]),
      stage("recombine", "reason", "Add/subtract the component results to obtain the composite measure.", "Component measures reconstruct the target quantity.", ["symbolic_working"]),
    ],
    representations: reps(["diagram"], ["area_model", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Mark internal decomposition lines differently from exposed perimeter edges."], generalisationPattern: "Decompose into familiar non-overlapping shapes, solve each component, then recombine only the quantities relevant to the target.", checkPattern: "For area, pieces should cover the whole exactly; for perimeter, internal shared edges should not be counted as exposed boundary." },
  misconceptions: [misconception("count_internal_edge", "Including an internal decomposition edge in the external perimeter.", ["Perimeter too large by twice an internal edge"], "Trace only the outer boundary after decomposition.")],
  visualGuidance: visual("essential", ["diagram", "area_model"], "use_when_present"),
  officialClaimTag: "problem_solving_heuristics", cpaClaim: true,
  dreamscapeClaim: "Dreamscape distinguishes internal decomposition edges from exposed perimeter edges during composite-shape teaching.",
}, ["composite figures"]);

add({
  methodId: "geometry.area_perimeter.missing_dimension",
  familyId: "geometry.area_perimeter",
  variantId: "missing_dimension",
  title: "Find a missing dimension from area or perimeter",
  summary: "Treats the unknown length as a missing quantity in the area/perimeter relationship and solves inversely.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["geometry", "measurement"], structures: ["area", "perimeter"], reasoning: ["area_calculation", "perimeter_calculation", "division", "subtraction", "equation_solving"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Recover an unknown dimension by reversing the relevant area or perimeter relationship.",
    conceptualFocus: ["inverse relationship", "unknown dimension", "formula structure"],
    prerequisiteConcepts: ["area/perimeter meaning", "inverse operations"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("mark_unknown", "represent", "Mark the unknown dimension on the diagram and label all known dimensions.", "The target is attached to a specific geometric quantity.", ["diagram"]),
      stage("write_relation", "reason", "Write the relevant area or perimeter relationship using the unknown.", "The formula becomes an equation rather than a substitution template.", ["equation"]),
      stage("reverse", "calculate", "Use inverse operations to isolate the unknown dimension.", "The unknown is solved from the relationship.", ["symbolic_working"]),
      stage("substitute", "check", "Substitute the dimension back into the original area/perimeter relationship.", "The original target measure should be recovered.", ["equation"]),
    ],
    representations: reps(["diagram", "equation"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Keep the unknown dimension attached to its side on the diagram."], generalisationPattern: "Use the area/perimeter relationship as an equation and reverse it to find the missing dimension.", checkPattern: "Substitute the found dimension to recreate the given area or perimeter." },
  misconceptions: [misconception("plug_unknown_as_zero", "Treating the unknown side as absent rather than as a quantity to solve.", ["Formula written with missing term omitted"], "Represent the unknown with a symbol or blank and preserve the full relationship.")],
  visualGuidance: visual("essential", ["diagram", "equation"], "use_when_present"),
  officialClaimTag: "conceptual_understanding",
  dreamscapeClaim: "Dreamscape frames missing-dimension tasks as geometry-grounded inverse equations.",
}, ["missing dimension"]);

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------
add({
  methodId: "time.read_interval.read_clock_face",
  familyId: "time.read_interval",
  variantId: "read_clock_face",
  title: "Read analogue time systematically",
  summary: "Separates hour-hand and minute-hand information and reconciles them into one time reading.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["time"], structures: ["time_reading"], reasoning: ["time_calculation", "counting"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Read an analogue clock by interpreting the hour and minute hands in relation to the clock scale.",
    conceptualFocus: ["hour hand", "minute hand", "five-minute intervals", "clock cycle"],
    prerequisiteConcepts: ["counting", "number sequence to 60"],
    cpaPolicy: "required_progression",
    teachingSequence: [
      stage("identify_hands", "represent", "Identify which hand shows hours and which shows minutes.", "The two hands carry different information.", ["clock_face"]),
      stage("read_hour", "notice_relationship", "Locate the hour hand relative to the hour numbers.", "The hour can remain the previous hour while the minute hand advances.", ["clock_face"]),
      stage("read_minutes", "calculate", "Count minute marks or groups of five to determine the minutes.", "The minute hand maps position to minutes past the hour.", ["clock_face", "number_line"]),
      stage("combine", "generalise", "Combine hour and minute information into standard time notation.", "One time reading integrates both hands.", ["symbolic_working"]),
    ],
    representations: reps(["clock_face"], ["number_line", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Read the hour hand and minute hand separately before combining."], generalisationPattern: "Analogue time combines the hour indicated by the short hand with minutes indicated by the long hand around a 60-minute cycle.", checkPattern: "Check whether the hour hand position is consistent with the number of minutes past the hour." },
  misconceptions: [misconception("hour_hand_rounding", "Reading the hour hand as the next hour simply because it lies between two numbers.", ["Hour increases too early"], "Use the minute hand to decide how far through the current hour the clock has progressed.")],
  visualGuidance: visual("essential", ["clock_face"], "use_when_present"),
  officialClaimTag: "curriculum_scope", cpaClaim: true,
  dreamscapeClaim: "Dreamscape separates hour and minute interpretation before recombining the time reading.",
}, ["read time"]);

add({
  methodId: "time.read_interval.elapsed_timeline",
  familyId: "time.read_interval",
  variantId: "elapsed_timeline",
  title: "Find elapsed time with a timeline",
  summary: "Counts on through convenient hour/minute landmarks from start time to end time.",
  status: "active",
  applicability: { levels: [2,3,4,5,6], domains: ["time"], structures: ["time_interval"], reasoning: ["time_calculation", "addition", "subtraction"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Find elapsed time by representing start, intermediate landmarks and end time on a timeline.",
    conceptualFocus: ["elapsed interval", "counting on", "time landmarks"],
    prerequisiteConcepts: ["read time", "60 minutes = 1 hour"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("mark_start_end", "represent", "Place the start and end times on a timeline.", "Elapsed time is the distance between two time points.", ["timeline"]),
      stage("choose_jumps", "reason", "Choose convenient jumps to the next hour or other easy landmarks.", "Chunking reduces minute arithmetic errors.", ["timeline"]),
      stage("sum_jumps", "calculate", "Add the durations of all jumps.", "The interval is the sum of non-overlapping time chunks.", ["timeline", "symbolic_working"]),
      stage("check", "check", "Add the elapsed duration to the start time and verify the end time.", "Forward reconstruction confirms the interval.", ["timeline"]),
    ],
    representations: reps(["timeline"], ["clock_face", "number_line", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Label the duration above each timeline jump."], generalisationPattern: "Elapsed time can be built by counting on from start to end through convenient landmarks.", checkPattern: "Start time + elapsed time should equal end time." },
  misconceptions: [misconception("subtract_clock_digits", "Subtracting clock digits as ordinary base-10 numbers.", ["Minute borrowing uses 100 instead of 60"], "Use a timeline or explicitly convert through 60-minute hour relationships.")],
  visualGuidance: visual("essential", ["timeline"]),
  officialClaimTag: "representation_selection", cpaClaim: true,
  dreamscapeClaim: "Dreamscape uses landmark jumps on a timeline as the default conceptual elapsed-time representation.",
}, ["elapsed time", "timeline"]);

add({
  methodId: "time.read_interval.hour_minute_conversion",
  familyId: "time.read_interval",
  variantId: "hour_minute_conversion",
  title: "Convert between hours and minutes",
  summary: "Uses the 60-minute equivalence to regroup time quantities for calculation or interpretation.",
  status: "active",
  applicability: { levels: [2,3,4,5,6], domains: ["time"], structures: ["time_interval", "unit_conversion"], reasoning: ["time_calculation", "unit_conversion", "multiplication", "division"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Convert between hours and minutes using the 60-minute equivalence and preserve total duration.",
    conceptualFocus: ["60-minute equivalence", "regrouping time", "duration preservation"],
    prerequisiteConcepts: ["multiplication/division", "time units"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("state_equivalence", "establish_meaning", "State 1 hour = 60 minutes and identify the requested direction.", "Time conversion follows a non-base-10 unit relationship.", ["timeline", "table"]),
      stage("regroup", "represent", "Regroup whole hours into minutes or groups of 60 minutes into hours.", "The total duration is unchanged.", ["timeline", "table"]),
      stage("calculate", "calculate", "Multiply or divide by 60 as appropriate and handle any remainder meaningfully.", "The operation reflects the equivalence.", ["symbolic_working"]),
      stage("check", "check", "Convert back mentally or compare magnitude to verify the duration is plausible.", "The same duration should be recoverable.", ["verbal_reasoning"]),
    ],
    representations: reps(["timeline", "table"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write 1 h = 60 min before converting when confusion is likely."], generalisationPattern: "Hours and minutes are linked by groups of 60, not groups of 100.", checkPattern: "Converting a positive number of hours to minutes should produce at least as large a numeral." },
  misconceptions: [misconception("base100_time", "Treating 1 hour as 100 minutes.", ["Uses decimal place-value conversion"], "Return to a clock/timeline and regroup one complete 60-minute cycle.")],
  visualGuidance: visual("usually", ["timeline", "table"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape emphasises the non-base-10 60-minute grouping before symbolic conversion.",
}, ["hour-minute conversion"]);

add({
  methodId: "time.read_interval.timetable_interval",
  familyId: "time.read_interval",
  variantId: "timetable_interval",
  title: "Read a timetable and calculate an interval",
  summary: "Extracts the correct start/end entries from a timetable before applying elapsed-time reasoning.",
  status: "active",
  applicability: { levels: [3,4,5,6], domains: ["time", "data"], structures: ["time_reading", "time_interval"], reasoning: ["time_calculation", "data_interpretation", "comparison"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Locate relevant timetable entries and use them to determine a time point or elapsed interval accurately.",
    conceptualFocus: ["row/column lookup", "start/end selection", "elapsed time"],
    prerequisiteConcepts: ["read tables", "read time"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("locate_entry", "represent", "Trace the correct row and column for the requested event.", "The correct data entry must be selected before calculating.", ["table"]),
      stage("record_times", "notice_relationship", "Record the relevant start/end times with labels.", "Data extraction is separated from arithmetic.", ["table"]),
      stage("find_interval", "calculate", "Use timeline or time arithmetic to find the requested interval.", "Elapsed-time reasoning follows the extracted data.", ["timeline", "symbolic_working"]),
      stage("context_check", "check", "Check the result against the timetable order and context.", "An event sequence constrains plausible intervals.", ["table"]),
    ],
    representations: reps(["table", "timeline"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Copy timetable times with labels before calculating."], generalisationPattern: "Extract the correct timetable entries first; then treat them as the start/end points of a time problem.", checkPattern: "Verify the selected times come from the intended row/column and occur in the expected order." },
  misconceptions: [misconception("wrong_timetable_cell", "Using a nearby but incorrect timetable entry.", ["Arithmetic is correct for wrong row/column"], "Trace row and column from their labels before copying any time value.")],
  visualGuidance: visual("essential", ["table", "timeline"], "use_when_present"),
  officialClaimTag: "representation_selection",
  dreamscapeClaim: "Dreamscape separates timetable data extraction from subsequent elapsed-time calculation.",
}, ["read time", "elapsed time", "timeline"]);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
add({
  methodId: "data.read_compare_classify.read_table",
  familyId: "data.read_compare_classify",
  variantId: "read_table",
  title: "Read values from a data table",
  summary: "Uses row and column labels to locate a cell and interpret the value with its category meaning.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["data"], structures: ["data_reading"], reasoning: ["data_interpretation", "counting"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Read a table accurately by tracing category labels to the correct data cell.",
    conceptualFocus: ["row/column labels", "cell value", "category"],
    prerequisiteConcepts: ["counting", "label matching"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("read_headers", "establish_meaning", "Read the table headers and identify what each row/column represents.", "Labels define the meaning of values.", ["table"]),
      stage("trace_cell", "represent", "Trace from the requested labels to their intersection.", "The learner locates one precise cell.", ["table"]),
      stage("interpret_value", "reason", "Read the cell value together with its category/unit meaning.", "A number is interpreted in context.", ["table", "verbal_reasoning"]),
      stage("verify", "check", "Retrace the row and column to ensure the correct cell was used.", "Lookup accuracy is explicitly checked.", ["table"]),
    ],
    representations: reps(["table"], ["verbal_reasoning", "symbolic_working"]),
  },
  workedPattern: { notationGuidance: ["Name the row and column labels before stating the value."], generalisationPattern: "A table value is found at the intersection of the relevant labelled categories.", checkPattern: "Retrace both labels to the selected cell." },
  misconceptions: [misconception("adjacent_cell", "Reading a value from the correct row but wrong column, or vice versa.", ["Nearby value selected"], "Trace both row and column labels simultaneously to the intersection.")],
  visualGuidance: visual("essential", ["table"], "use_when_present"),
  officialClaimTag: "representation_selection",
  dreamscapeClaim: "Dreamscape uses explicit row-column tracing for table-reading accuracy.",
}, ["table"]);

add({
  methodId: "data.read_compare_classify.picture_graph_scale",
  familyId: "data.read_compare_classify",
  variantId: "picture_graph_scale",
  title: "Read a picture graph with its key",
  summary: "Interprets the graph key first, then converts icon counts into data values.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["data"], structures: ["data_reading"], reasoning: ["data_interpretation", "counting", "multiplication"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Interpret a picture graph by applying the graph key to counted symbols.",
    conceptualFocus: ["graph key", "symbol count", "scaled value"],
    prerequisiteConcepts: ["counting", "equal groups"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("read_key", "establish_meaning", "Read the key and state how much one symbol represents.", "A symbol may represent more than one item.", ["graph"]),
      stage("count_symbols", "calculate", "Count full and partial symbols for the requested category.", "Symbols are counted systematically.", ["graph"]),
      stage("apply_scale", "calculate", "Multiply or scale the symbol count by the key value.", "Icon count is converted to actual data value.", ["symbolic_working"]),
      stage("check_category", "check", "Confirm the counted symbols belong to the requested category.", "Category and scale are both verified.", ["graph"]),
    ],
    representations: reps(["graph"], ["table", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write the key as '1 symbol = …' before calculating."], generalisationPattern: "Actual value = number of symbols × value represented by one symbol.", checkPattern: "Check both the category and the graph key." },
  misconceptions: [misconception("ignore_key", "Treating each symbol as one item regardless of the key.", ["Answer equals raw symbol count"], "State and apply the key before using the symbol count.")],
  visualGuidance: visual("essential", ["graph"], "use_when_present"),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape forces graph-key interpretation before picture-symbol counting is converted to values.",
}, ["picture graph"]);

add({
  methodId: "data.read_compare_classify.bar_graph_read",
  familyId: "data.read_compare_classify",
  variantId: "bar_graph_read",
  title: "Read a bar graph using axes and scale",
  summary: "Reads category, axis scale and bar endpoint in a fixed order to obtain accurate values.",
  status: "active",
  applicability: { levels: [2,3,4,5,6], domains: ["data"], structures: ["data_reading", "data_comparison"], reasoning: ["data_interpretation", "comparison"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Extract and compare bar-graph values by interpreting category labels, axis labels and scale.",
    conceptualFocus: ["axis", "scale interval", "bar height/length", "category"],
    prerequisiteConcepts: ["number scale", "comparison"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("read_axes", "establish_meaning", "Read the category axis, value axis and unit/scale labels.", "Axes define what each position means.", ["graph"]),
      stage("check_scale", "notice_relationship", "Determine the value represented by each interval on the value axis.", "Tick spacing may represent more than one unit.", ["graph"]),
      stage("trace_bar", "represent", "Trace from the chosen bar endpoint to the value scale.", "The bar is mapped to one numerical value.", ["graph"]),
      stage("compare_if_needed", "reason", "Use extracted values to answer comparisons or differences.", "Graph reading precedes arithmetic comparison.", ["symbolic_working"]),
    ],
    representations: reps(["graph"], ["table", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Record extracted values before doing arithmetic with them."], generalisationPattern: "Read the graph scale first, then map each relevant bar endpoint to a value.", checkPattern: "Check that the bar and axis scale belong to the intended category and unit." },
  misconceptions: [misconception("assume_unit_ticks", "Assuming every axis tick represents one unit.", ["Value equals tick count instead of scaled value"], "Determine the interval value from labelled ticks before reading bars.")],
  visualGuidance: visual("essential", ["graph"], "use_when_present"),
  officialClaimTag: "representation_selection", cpaClaim: true,
  dreamscapeClaim: "Dreamscape enforces an axes-scale-bar reading order before data comparison.",
}, ["bar graph", "compare"]);

add({
  methodId: "data.read_compare_classify.compare_classify",
  familyId: "data.read_compare_classify",
  variantId: "compare_classify",
  title: "Compare or classify extracted data",
  summary: "Separates data extraction from the later task of comparing, ordering or grouping categories.",
  status: "active",
  applicability: { levels: [1,2,3,4,5,6], domains: ["data"], structures: ["data_comparison", "data_classification"], reasoning: ["data_interpretation", "comparison", "classification", "ordering"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Use accurately extracted data values to compare, order or classify categories according to the question criterion.",
    conceptualFocus: ["data value", "comparison criterion", "classification rule"],
    prerequisiteConcepts: ["read data representation", "comparison"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("extract_values", "represent", "Record only the relevant category values from the source representation.", "Extraction is completed before reasoning.", ["table"]),
      stage("state_criterion", "establish_meaning", "State the comparison or classification criterion explicitly.", "The learner knows what relation is being tested.", ["verbal_reasoning"]),
      stage("apply_criterion", "reason", "Compare/order values or group categories using the stated criterion.", "The same rule is applied consistently.", ["table", "symbolic_working"]),
      stage("verify", "check", "Check each conclusion against the recorded source values.", "Reasoning remains grounded in data.", ["table"]),
    ],
    representations: reps(["table"], ["graph", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Record category-value pairs before comparing them."], generalisationPattern: "Extract values accurately, state the criterion, then compare/order/classify consistently.", checkPattern: "Every conclusion should be traceable to a recorded source value." },
  misconceptions: [misconception("compare_visual_only", "Comparing apparent bar/icon size without reading the actual scale or values.", ["Conclusion based on appearance alone"], "Extract numerical values first and compare those values.")],
  visualGuidance: visual("usually", ["table", "graph"], "use_when_present"),
  officialClaimTag: "problem_solving_heuristics",
  dreamscapeClaim: "Dreamscape separates source-value extraction from downstream comparison and classification reasoning.",
}, ["compare", "classify"]);

// ---------------------------------------------------------------------------
// Average / mean
// ---------------------------------------------------------------------------
add({
  methodId: "average.mean.equal_share",
  familyId: "average.mean",
  variantId: "equal_share",
  title: "Interpret average as equal sharing",
  summary: "Redistributes a total equally across all items to establish the meaning of the mean before formula use.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["average"], structures: ["average"], reasoning: ["average_calculation", "division"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Understand the mean as the equal-share amount obtained if a total were redistributed evenly.",
    conceptualFocus: ["equal sharing", "total preserved", "number of items"],
    prerequisiteConcepts: ["division", "total"],
    cpaPolicy: "required_progression",
    teachingSequence: [
      stage("show_unequal", "represent", "Represent the original quantities as separate groups or bars.", "The starting values may be unequal.", ["bar_model", "manipulatives"]),
      stage("preserve_total", "notice_relationship", "Combine the amounts conceptually while preserving the same total.", "Averaging redistributes; it does not change the total.", ["bar_model"]),
      stage("share_equally", "reason", "Redistribute the total equally among the same number of items.", "The equal share is the mean.", ["bar_model", "manipulatives"]),
      stage("connect_formula", "generalise", "Connect equal sharing to total ÷ number of items.", "The formula expresses the equal-share action.", ["symbolic_working"]),
    ],
    representations: reps(["bar_model", "manipulatives"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["State the total and item count before dividing."], generalisationPattern: "Mean = total amount shared equally ÷ number of items.", checkPattern: "Mean × number of items should recreate the total." },
  misconceptions: [misconception("average_is_middle", "Assuming the average is always the middle listed value.", ["Chooses median-like value without calculation"], "Redistribute the total equally to establish mean meaning.")],
  visualGuidance: visual("usually", ["bar_model", "manipulatives"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape introduces mean through conservation of total and equal redistribution before formula notation.",
}, ["equal sharing", "mean calculation"]);

add({
  methodId: "average.mean.total_divide_count",
  familyId: "average.mean",
  variantId: "total_divide_count",
  title: "Calculate a mean from total and count",
  summary: "Finds or confirms the total, identifies the number of items, then divides to obtain the mean.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["average"], structures: ["average"], reasoning: ["average_calculation", "addition", "division"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Calculate the mean by dividing the total of all values by the number of values.",
    conceptualFocus: ["sum", "count", "equal share"],
    prerequisiteConcepts: ["addition", "division"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("find_total", "calculate", "Add all values if the total is not already given.", "Every data value contributes exactly once.", ["table", "symbolic_working"]),
      stage("count_items", "calculate", "Count how many values/items are being averaged.", "The divisor is the number of values, not their total.", ["table"]),
      stage("divide", "calculate", "Divide total by count to find the mean.", "The result is the equal-share value.", ["symbolic_working"]),
      stage("check_range", "check", "Check that the mean lies within the range of the data for ordinary positive datasets.", "A grossly impossible mean signals an arithmetic error.", ["verbal_reasoning"]),
    ],
    representations: reps(["table", "symbolic_working"], ["bar_model", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write Mean = Total ÷ Number of items with labels."], generalisationPattern: "Mean = sum of values ÷ number of values.", checkPattern: "Mean × count should equal the total." },
  misconceptions: [misconception("divide_by_wrong_count", "Dividing by the wrong number of items.", ["Count includes total or excludes a value"], "Count the data values explicitly before dividing.")],
  visualGuidance: visual("optional", ["table", "bar_model"]),
  officialClaimTag: "conceptual_understanding",
  dreamscapeClaim: "Dreamscape separates total-finding and item-counting before mean division.",
}, ["mean calculation"]);

add({
  methodId: "average.mean.find_total",
  familyId: "average.mean",
  variantId: "find_total",
  title: "Recover the total from mean and number of items",
  summary: "Uses the inverse relationship total = mean × number of items.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["average"], structures: ["average"], reasoning: ["average_calculation", "multiplication", "equation_solving"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Find the total amount when the mean and number of items are known.",
    conceptualFocus: ["inverse mean relationship", "equal groups", "total"],
    prerequisiteConcepts: ["mean as equal share", "multiplication"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("interpret_mean", "establish_meaning", "Treat the mean as the equal amount for each item after redistribution.", "Each of the items is represented by one equal mean-sized share.", ["bar_model"]),
      stage("represent_groups", "represent", "Show the given number of equal mean-sized groups.", "Repeated equal groups make the total visible.", ["bar_model", "equal_groups_diagram"]),
      stage("multiply", "calculate", "Multiply mean by number of items to recover the total.", "Repeated equal shares recombine to the original total.", ["symbolic_working"]),
      stage("check", "check", "Divide the recovered total by the count to verify the mean.", "The inverse calculation should return the given mean.", ["symbolic_working"]),
    ],
    representations: reps(["bar_model", "equal_groups_diagram"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write Total = Mean × Number of items."], generalisationPattern: "If each of n equal shares is the mean, total = mean × n.", checkPattern: "Recovered total ÷ n should equal the given mean." },
  misconceptions: [misconception("add_mean_count", "Adding mean and count instead of multiplying.", ["Uses mean + number of items"], "Represent the count as repeated equal groups of the mean.")],
  visualGuidance: visual("usually", ["bar_model", "equal_groups_diagram"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape derives total-from-mean through repeated equal-share representation.",
}, ["find total"]);

add({
  methodId: "average.mean.find_count",
  familyId: "average.mean",
  variantId: "find_count",
  title: "Recover the number of items from total and mean",
  summary: "Uses the inverse relationship count = total ÷ mean and interprets the quotient as number of equal shares.",
  status: "active",
  applicability: { levels: [4,5,6], domains: ["average"], structures: ["average"], reasoning: ["average_calculation", "division", "equation_solving"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Find how many items were averaged when the total and mean are known.",
    conceptualFocus: ["equal-share size", "number of shares", "inverse relationship"],
    prerequisiteConcepts: ["mean meaning", "division"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("interpret_total_mean", "establish_meaning", "Interpret the total as being partitioned into equal groups of size equal to the mean.", "The unknown is the number of equal shares.", ["bar_model"]),
      stage("partition", "represent", "Represent how many mean-sized groups fit into the total.", "Division answers how many equal shares there are.", ["equal_groups_diagram", "bar_model"]),
      stage("divide", "calculate", "Divide total by mean to find the count.", "The quotient is the number of items.", ["symbolic_working"]),
      stage("check", "check", "Multiply count by mean to recover the total.", "The inverse relationship verifies the answer.", ["symbolic_working"]),
    ],
    representations: reps(["equal_groups_diagram", "bar_model"], ["symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write Number of items = Total ÷ Mean."], generalisationPattern: "Count = total ÷ equal-share size (mean).", checkPattern: "Count × mean should equal the given total." },
  misconceptions: [misconception("mean_as_count", "Treating the mean itself as the number of items.", ["Count copied from mean"], "Represent the total as repeated groups whose size is the mean.")],
  visualGuidance: visual("usually", ["equal_groups_diagram", "bar_model"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape interprets count-from-mean as a how-many-equal-groups division problem.",
}, ["find number of items"]);

// ---------------------------------------------------------------------------
// Speed, distance and time
// ---------------------------------------------------------------------------
add({
  methodId: "speed.distance_time.speed_as_unit_rate",
  familyId: "speed.distance_time",
  variantId: "speed_as_unit_rate",
  title: "Interpret speed as distance per unit time",
  summary: "Builds speed meaning as a unit rate before using speed-distance-time formulas.",
  status: "active",
  applicability: { levels: [5,6], domains: ["speed_rate"], structures: ["speed_distance_time"], reasoning: ["speed_calculation", "rate_scaling", "division"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Interpret speed as the distance travelled in one unit of time.",
    conceptualFocus: ["unit rate", "distance", "time", "constant speed"],
    prerequisiteConcepts: ["division", "rate meaning"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("name_quantities", "establish_meaning", "Identify the distance and corresponding time interval.", "Speed relates two different quantities.", ["table"]),
      stage("find_one_time_unit", "reason", "Ask how far is travelled in one unit of time.", "This defines the unit-rate meaning of speed.", ["unit_rate_table", "double_number_line"]),
      stage("divide", "calculate", "Divide distance by time to obtain distance per one time unit.", "The quotient is a rate, not just a bare number.", ["symbolic_working"]),
      stage("state_unit", "generalise", "State the speed with a compound unit such as km/h or m/s.", "The compound unit communicates the rate relationship.", ["verbal_reasoning"]),
    ],
    representations: reps(["unit_rate_table", "double_number_line"], ["table", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Keep distance and time units visible in the division statement."], generalisationPattern: "Speed is distance travelled per one unit of time: speed = distance ÷ time.", checkPattern: "Multiply speed by time to see whether the distance is recovered." },
  misconceptions: [misconception("speed_bare_number", "Giving a speed without its per-time unit or treating it as a distance.", ["No compound unit", "Answer interpreted as distance"], "Read the result aloud as distance per unit time.")],
  visualGuidance: visual("usually", ["unit_rate_table", "double_number_line"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape establishes unit-rate meaning before formula manipulation in speed problems.",
}, ["speed", "unit rate"]);

add({
  methodId: "speed.distance_time.find_speed",
  familyId: "speed.distance_time",
  variantId: "find_speed",
  title: "Find speed from distance and time",
  summary: "Uses the distance-time relationship to calculate a unit rate and preserve compound units.",
  status: "active",
  applicability: { levels: [5,6], domains: ["speed_rate"], structures: ["speed_distance_time"], reasoning: ["speed_calculation", "division", "unit_conversion"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Calculate speed from known distance and time using a unit-consistent relationship.",
    conceptualFocus: ["speed formula", "unit compatibility", "compound unit"],
    prerequisiteConcepts: ["speed as unit rate", "division", "unit conversion"],
    cpaPolicy: "optional",
    teachingSequence: [
      stage("check_units", "notice_relationship", "Check that distance and time units match the requested speed unit.", "Unit conversion may be required before calculation.", ["table"]),
      stage("write_relation", "reason", "Write speed = distance ÷ time with labels.", "The formula is tied to unit-rate meaning.", ["equation"]),
      stage("calculate", "calculate", "Substitute and divide.", "Distance is distributed across the time units.", ["symbolic_working"]),
      stage("verify", "check", "Check speed × time = distance and attach the compound unit.", "The inverse relation validates the answer.", ["equation"]),
    ],
    representations: reps(["equation", "unit_rate_table"], ["table", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write S = D ÷ T only after identifying the quantities and units."], generalisationPattern: "Speed = distance ÷ time when distance and time units are compatible.", checkPattern: "Speed × time should recreate distance." },
  misconceptions: [misconception("invert_speed_formula", "Using time ÷ distance for speed.", ["Very small reciprocal-like answer"], "Return to the unit-rate question: distance per one time unit.")],
  visualGuidance: visual("usually", ["equation", "unit_rate_table"]),
  officialClaimTag: "conceptual_understanding",
  dreamscapeClaim: "Dreamscape keeps formula use linked to unit-rate interpretation and an inverse check.",
}, ["speed", "formula relationship"]);

add({
  methodId: "speed.distance_time.find_distance",
  familyId: "speed.distance_time",
  variantId: "find_distance",
  title: "Find distance from speed and time",
  summary: "Interprets repeated distance-per-time units over the given duration and multiplies speed by time.",
  status: "active",
  applicability: { levels: [5,6], domains: ["speed_rate"], structures: ["speed_distance_time"], reasoning: ["speed_calculation", "multiplication", "rate_scaling"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Calculate distance as repeated unit-rate travel across a known duration.",
    conceptualFocus: ["repeated rate", "duration", "distance accumulation"],
    prerequisiteConcepts: ["speed as unit rate", "multiplication"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("interpret_rate", "establish_meaning", "Read the speed as a distance travelled each unit of time.", "The rate is repeated across the duration.", ["unit_rate_table"]),
      stage("align_time", "notice_relationship", "Express the duration in the same time unit used by the speed.", "The rate and time must be compatible.", ["table"]),
      stage("multiply", "calculate", "Multiply speed by time to accumulate the distance.", "Repeated equal-rate intervals build total distance.", ["symbolic_working"]),
      stage("check", "check", "Divide distance by time to recover the speed.", "The inverse relation verifies the result.", ["equation"]),
    ],
    representations: reps(["unit_rate_table"], ["double_number_line", "equation", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Convert time before multiplying if the speed uses a different time unit."], generalisationPattern: "Distance = speed × time for constant speed with compatible units.", checkPattern: "Distance ÷ time should recover speed." },
  misconceptions: [misconception("multiply_mismatched_time", "Multiplying a per-hour speed by a duration still expressed in minutes without conversion.", ["Unit mismatch in multiplication"], "Convert duration to the rate's time unit before multiplying.")],
  visualGuidance: visual("usually", ["unit_rate_table", "double_number_line"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape represents distance as accumulation of repeated unit-rate intervals.",
}, ["distance", "formula relationship"]);

add({
  methodId: "speed.distance_time.find_time",
  familyId: "speed.distance_time",
  variantId: "find_time",
  title: "Find time from distance and speed",
  summary: "Treats the distance as repeated speed-sized chunks and divides by the distance covered each time unit.",
  status: "active",
  applicability: { levels: [5,6], domains: ["speed_rate"], structures: ["speed_distance_time"], reasoning: ["speed_calculation", "division", "rate_scaling"], curriculumSkills: [], exclusions: [] },
  pedagogy: {
    learningObjectivePattern: "Calculate travel time by determining how many unit-rate intervals fit into the total distance.",
    conceptualFocus: ["how-many-rate-units", "duration", "division"],
    prerequisiteConcepts: ["speed as unit rate", "division"],
    cpaPolicy: "recommended",
    teachingSequence: [
      stage("interpret_speed", "establish_meaning", "Interpret the speed as the distance completed in one unit of time.", "One speed-sized distance chunk corresponds to one time unit.", ["unit_rate_table"]),
      stage("align_distance", "notice_relationship", "Ensure the total distance uses the same distance unit as the speed.", "Distance units must be compatible.", ["table"]),
      stage("divide", "calculate", "Divide total distance by distance-per-time-unit to find the number of time units.", "Division answers how many rate intervals are needed.", ["symbolic_working"]),
      stage("check", "check", "Multiply speed by the found time to recreate the distance.", "The inverse relation confirms the duration.", ["equation"]),
    ],
    representations: reps(["unit_rate_table"], ["double_number_line", "equation", "symbolic_working", "verbal_reasoning"]),
  },
  workedPattern: { notationGuidance: ["Write Time = Distance ÷ Speed with compatible units."], generalisationPattern: "Time = distance ÷ speed for constant speed when units are compatible.", checkPattern: "Speed × time should equal distance." },
  misconceptions: [misconception("time_as_product", "Multiplying distance and speed to find time.", ["Dimensionally implausible result"], "Ask how many speed-sized distance chunks fit into the total distance.")],
  visualGuidance: visual("usually", ["unit_rate_table", "double_number_line"]),
  officialClaimTag: "conceptual_understanding", cpaClaim: true,
  dreamscapeClaim: "Dreamscape frames time as a how-many-unit-rate-intervals division problem.",
}, ["time", "formula relationship"]);

export const PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS = Object.freeze(METHODS);
export const PHASE4B6_METHOD_THEME_COVERAGE = Object.freeze(COVERAGE);

export type Phase4B6CandidateQuery = {
  learnerLevel: 1 | 2 | 3 | 4 | 5 | 6;
  domain: TeachingMethod["applicability"]["domains"][number];
  problemStructure: TeachingMethod["applicability"]["structures"][number];
  requiredReasoning: TeachingMethod["applicability"]["reasoning"];
  candidateFamilies: Phase4BMethodFamilyId[];
};

export function listPhase4B6CandidateMethods(query: Phase4B6CandidateQuery): Readonly<TeachingMethod>[] {
  const familySet = new Set(query.candidateFamilies);
  const reasoningSet = new Set(query.requiredReasoning);
  return PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.filter((method) => {
    if (!familySet.has(method.familyId)) return false;
    if (!method.applicability.levels.includes(query.learnerLevel)) return false;
    if (!method.applicability.domains.includes(query.domain)) return false;
    if (!method.applicability.structures.includes(query.problemStructure)) return false;
    return method.applicability.reasoning.some((reasoning) => reasoningSet.has(reasoning));
  });
}
