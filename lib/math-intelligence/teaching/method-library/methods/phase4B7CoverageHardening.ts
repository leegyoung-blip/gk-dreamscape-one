import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  defineTeachingMethod,
  type TeachingMethod,
  type TeachingMethodMisconception,
  type TeachingMethodStage,
  type TeachingRepresentationType,
} from "../schema";

const GOVERNANCE: TeachingMethod["governance"] = {
  deterministicOnly: true,
  questionAgnostic: true,
  answerAgnostic: true,
  runtimeAgnostic: true,
  lunaAllowed: false,
  persistence: "version_controlled_source",
};

type MethodInput = Omit<TeachingMethod, "schemaVersion" | "governance" | "provenance"> & {
  dreamscapeClaim: string;
};

function makeMethod(input: MethodInput): Readonly<TeachingMethod> {
  const { dreamscapeClaim, ...method } = input;
  return defineTeachingMethod({
    schemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    ...method,
    provenance: {
      classifications: ["dreamscape_method"],
      claims: [
        {
          claimId: `${input.methodId.replaceAll(".", "_")}_dreamscape`,
          classification: "dreamscape_method",
          sourceId: null,
          sourceClaimTag: null,
          statement: dreamscapeClaim,
          evidenceNote: "Targeted Dreamscape production-method variant added by the Phase 4B-7 full-cohort closure audit.",
        },
      ],
    },
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
  text: string,
  signals: string[],
  correction: string,
): TeachingMethodMisconception {
  return {
    misconceptionId,
    misconception: text,
    diagnosticSignals: signals,
    correctionApproach: correction,
  };
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
): TeachingMethod["visualGuidance"] {
  return {
    visualUse,
    preferredVisualTypes,
    originalDiagramPolicy: "not_required",
    generatedVisualAllowed: true,
  };
}

const METHODS: Readonly<TeachingMethod>[] = [
  makeMethod({
    methodId: "heuristic.multi_step.compare_then_change",
    familyId: "heuristic.multi_step",
    variantId: "compare_then_change",
    title: "Resolve a comparison before applying a later change",
    summary: "Handles short multi-step stories where an earlier comparison determines a hidden quantity before a later gain, loss or transfer is applied.",
    status: "active",
    applicability: {
      levels: [1, 2, 3],
      domains: ["whole_numbers"],
      structures: ["multi_step"],
      reasoning: ["comparison", "subtraction", "addition"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Solve a two-stage story by finding the compared quantity first and then applying the later change.",
      conceptualFocus: ["dependency order", "comparison before change", "intermediate quantity"],
      prerequisiteConcepts: ["more/less comparison", "addition and subtraction"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_first_relationship", "notice_relationship", "Identify which quantity must be found from the comparison before the later event can be processed.", "The later step depends on an earlier hidden amount.", ["bar_model", "strip_diagram"]),
        stage("find_hidden_amount", "calculate", "Use the comparison to calculate the hidden starting amount.", "Comparison gives the intermediate amount, not the final answer.", ["bar_model", "symbolic_working"]),
        stage("apply_later_change", "calculate", "Apply the later gain, loss or transfer to that intermediate amount.", "Events are processed in story order after dependencies are resolved.", ["symbolic_working"]),
        stage("check_story", "check", "Retell both relationships using the calculated values.", "Every number should fit both the comparison and the later event.", ["verbal_reasoning"]),
      ],
      representations: reps(["bar_model"], ["strip_diagram", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Label the intermediate quantity before carrying it into the next step."],
      generalisationPattern: "When a later event depends on an earlier comparison, solve the dependency first and then apply the event.",
      checkPattern: "Substitute the intermediate and final values back into both story relationships.",
    },
    misconceptions: [
      misconception("use_given_as_hidden", "Using the explicitly given compared amount as though it were the hidden amount.", ["Second step starts from the wrong person or quantity"], "Draw aligned bars and label which amount is larger before subtracting the difference."),
    ],
    visualGuidance: visual("usually", ["bar_model", "strip_diagram"]),
    dreamscapeClaim: "Dreamscape adds an early-primary multi-step dependency pattern for compare-then-change stories.",
  }),

  makeMethod({
    methodId: "heuristic.age_relationship.future_present_past",
    familyId: "heuristic.age_relationship",
    variantId: "future_present_past",
    title: "Move between future, present and past age",
    summary: "Uses one age timeline to move consistently from a known future or past age to the present and then to another time point.",
    status: "active",
    applicability: {
      levels: [1, 2, 3, 4, 5, 6],
      domains: ["whole_numbers"],
      structures: ["age_relationship"],
      reasoning: ["age_reasoning", "comparison", "subtraction", "addition"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Track one person's age across time by applying the same time shift to age and calendar position.",
      conceptualFocus: ["age changes one-for-one with time", "timeline", "two-stage time shift"],
      prerequisiteConcepts: ["addition/subtraction on a timeline"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("mark_known_time", "represent", "Place the known age at its stated past, present or future time point.", "Age and time position must stay paired.", ["timeline"]),
        stage("return_to_present", "calculate", "Reverse the stated time shift to determine the present age when needed.", "Moving backward in time reduces age by the same amount.", ["timeline", "symbolic_working"]),
        stage("move_to_target_time", "calculate", "Move from the present to the requested past or future point.", "Each year of time changes age by one year.", ["timeline"]),
        stage("check_distance", "check", "Check that the age difference between time points equals the elapsed years.", "Timeline spacing and age change must agree.", ["verbal_reasoning"]),
      ],
      representations: reps(["timeline"], ["number_line", "symbolic_working", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write the time shift above the timeline and the corresponding age shift below it."],
      generalisationPattern: "For one person, age changes by exactly the number of years that pass.",
      checkPattern: "The difference between two ages should equal the time interval between those points.",
    },
    misconceptions: [
      misconception("same_direction_twice", "Adding both a future offset and a past offset in the same direction.", ["Past age becomes older than future age"], "Return to the present first, then move separately to the target time point."),
    ],
    visualGuidance: visual("usually", ["timeline"]),
    dreamscapeClaim: "Dreamscape adds an explicit future-present-past timeline variant so simple age problems are teachable from P1 onward when present in the bank.",
  }),

  makeMethod({
    methodId: "algebra.equation_unknown.inverse_two_step_early",
    familyId: "algebra.equation_unknown",
    variantId: "inverse_two_step_early",
    title: "Undo a two-step missing-number equation",
    summary: "Finds a missing value in a short two-operation equation by undoing operations in reverse order and checking forward.",
    status: "active",
    applicability: {
      levels: [1, 2, 3, 4],
      domains: ["logic", "whole_numbers", "arithmetic"],
      structures: ["missing_number_equation"],
      reasoning: ["equation_solving", "working_backwards", "addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Solve a short missing-number equation by reversing the outer operation first and continuing toward the unknown.",
      conceptualFocus: ["inverse operations", "reverse order", "unknown as a value"],
      prerequisiteConcepts: ["basic operation facts"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("locate_unknown", "establish_meaning", "Identify the operation chain connecting the unknown to the known result.", "The box stands for one fixed value.", ["equation"]),
        stage("undo_outer", "reason", "Undo the last operation applied to the unknown expression.", "Working backwards reverses the outside operation first.", ["equation", "symbolic_working"]),
        stage("undo_next", "calculate", "Continue with the inverse operation until the unknown is isolated.", "Each inverse step preserves equality.", ["symbolic_working"]),
        stage("check_forward", "check", "Substitute the found value into the original equation and calculate forward.", "The original result must be recreated exactly.", ["equation"]),
      ],
      representations: reps(["equation"], ["symbolic_working", "number_line", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write one inverse step per line and keep the equality visible."],
      generalisationPattern: "A multi-step missing-number equation can be solved by undoing operations in reverse order.",
      checkPattern: "Substitute the value and evaluate the original expression forward.",
    },
    misconceptions: [
      misconception("undo_first_operation_first", "Reversing the first written operation instead of the last operation applied to the unknown expression.", ["Inverse chain produces inconsistent equality"], "Trace from the unknown to the result, then reverse that path from the result back."),
    ],
    visualGuidance: visual("optional", ["equation", "number_line"]),
    dreamscapeClaim: "Dreamscape adds a level-appropriate two-step inverse-equation variant for early non-routine questions already present in the bank.",
  }),

  makeMethod({
    methodId: "patterns.sequence_rule.shape_attribute_progression",
    familyId: "patterns.sequence_rule",
    variantId: "shape_attribute_progression",
    title: "Extend a shape pattern by a changing attribute",
    summary: "Tracks a numerical property of successive shapes, such as number of sides, and extends the property rule before naming the missing shape.",
    status: "active",
    applicability: {
      levels: [1, 2, 3, 4, 5, 6],
      domains: ["geometry"],
      structures: ["pattern_rule"],
      reasoning: ["pattern_extension", "comparison", "property_matching"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Convert each shape to the relevant changing property, extend the property pattern, then map back to a shape.",
      conceptualFocus: ["shape attributes", "pattern rule", "property-to-shape mapping"],
      prerequisiteConcepts: ["basic shape properties"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("name_attribute", "notice_relationship", "Identify the shape property that changes across the sequence.", "The pattern may be carried by a property rather than the shape name itself.", ["diagram", "table"]),
        stage("record_values", "represent", "Record the property value for each known shape.", "Turning shapes into comparable numbers exposes the rule.", ["table"]),
        stage("extend_rule", "reason", "Extend the numerical property pattern to the missing position.", "Use one consistent rule across neighbouring terms.", ["table"]),
        stage("map_back", "generalise", "Choose or name the shape with the required property value.", "The final answer must satisfy both the numerical pattern and shape definition.", ["diagram"]),
      ],
      representations: reps(["table", "diagram"], ["verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Write the tracked property beneath each shape."],
      generalisationPattern: "A visual sequence can be extended by identifying and continuing the changing attribute.",
      checkPattern: "Verify the chosen shape has exactly the required property value.",
    },
    misconceptions: [
      misconception("pattern_by_appearance_only", "Choosing the next shape by overall appearance without tracking the relevant property.", ["Rule changes between terms"], "List the property values explicitly before extending the sequence."),
    ],
    visualGuidance: visual("essential", ["diagram", "table"]),
    dreamscapeClaim: "Dreamscape adds a geometry-specific pattern variant that reasons through explicit shape attributes.",
  }),

  makeMethod({
    methodId: "patterns.sequence_rule.measurement_known_total",
    familyId: "patterns.sequence_rule",
    variantId: "measurement_known_total",
    title: "Resolve a missing measured section from a known total",
    summary: "For a measurement-pattern context with a stated total, records the known sections and uses the total to determine the missing section before checking the pattern context.",
    status: "active",
    applicability: {
      levels: [1, 2, 3, 4],
      domains: ["measurement"],
      structures: ["pattern_rule"],
      reasoning: ["pattern_extension", "comparison", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use the stated whole measurement and known section measurements to determine the missing part systematically.",
      conceptualFocus: ["whole and measured parts", "known total", "missing section"],
      prerequisiteConcepts: ["addition and subtraction of same-unit measures"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("mark_total", "represent", "Represent the complete measured object as one known total.", "The total is the whole that all sections must form.", ["strip_diagram", "measurement_scale"]),
        stage("list_known_sections", "represent", "Record each known section once and in the same unit.", "No labelled section should be missed or counted twice.", ["table", "strip_diagram"]),
        stage("sum_known", "calculate", "Add the known sections.", "The subtotal is the measured portion already accounted for.", ["symbolic_working"]),
        stage("find_remainder", "calculate", "Subtract the known subtotal from the whole measurement.", "The remainder is the missing section.", ["strip_diagram", "symbolic_working"]),
        stage("check_total", "check", "Add the missing section back to the known sections to recover the whole.", "All sections together must equal the stated total.", ["verbal_reasoning"]),
      ],
      representations: reps(["strip_diagram"], ["measurement_scale", "table", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Keep every measurement in the same unit and label the subtotal of known sections."],
      generalisationPattern: "A missing measured part equals the whole minus the total of all known parts.",
      checkPattern: "Known parts + missing part should equal the stated whole.",
    },
    misconceptions: [
      misconception("subtract_one_section", "Subtracting only one known section from the total.", ["Other labelled sections are ignored"], "List and total all known sections before finding the remainder."),
    ],
    visualGuidance: visual("usually", ["strip_diagram", "measurement_scale"]),
    dreamscapeClaim: "Dreamscape adds a measurement-context candidate for pattern-labelled questions whose decisive structure is a known whole with one missing measured part.",
  }),

  makeMethod({
    methodId: "patterns.sequence_rule.decimal_progression",
    familyId: "patterns.sequence_rule",
    variantId: "decimal_progression",
    title: "Extend a decimal number pattern",
    summary: "Compares successive decimal terms using place value and extends a stable additive or changing-difference rule.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["decimals"],
      structures: ["pattern_rule"],
      reasoning: ["pattern_extension", "comparison", "place_value_reasoning", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Identify and continue a decimal sequence rule while respecting decimal place value.",
      conceptualFocus: ["decimal differences", "place value", "sequence consistency"],
      prerequisiteConcepts: ["decimal place value", "decimal addition/subtraction"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("align_decimals", "represent", "Write the terms with decimal points aligned.", "Place value must be compared consistently.", ["place_value_chart", "table"]),
        stage("compare_changes", "notice_relationship", "Find the change between neighbouring terms and look for a stable or systematic rule.", "Differences can themselves form a pattern.", ["table", "symbolic_working"]),
        stage("extend", "calculate", "Apply the identified rule at the missing position.", "The same rule must connect the surrounding terms.", ["symbolic_working"]),
        stage("verify_both_sides", "check", "Check the missing value against both the preceding and following terms when available.", "A valid missing term should make the full sequence consistent.", ["table"]),
      ],
      representations: reps(["table"], ["place_value_chart", "number_line", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Align decimal points when computing differences."],
      generalisationPattern: "Decimal patterns follow the same relationship logic as whole-number patterns, with place value kept explicit.",
      checkPattern: "Test the inferred term against adjacent terms on both sides.",
    },
    misconceptions: [
      misconception("ignore_decimal_place", "Comparing decimal digits as whole-number strings rather than by place value.", ["0.4 treated as smaller/larger for the wrong reason"], "Align decimal points and compare tenths, hundredths and thousandths explicitly."),
    ],
    visualGuidance: visual("usually", ["table", "place_value_chart"]),
    dreamscapeClaim: "Dreamscape adds a decimal-specific pattern candidate so pattern pedagogy remains available when the canonical domain is decimals.",
  }),

  makeMethod({
    methodId: "money.transaction.coin_composition",
    familyId: "money.transaction",
    variantId: "coin_composition",
    title: "Compose a money amount from repeated coins",
    summary: "Counts repeated denominations by finding each denomination subtotal and then combining the subtotals in one currency unit.",
    status: "active",
    applicability: {
      levels: [1, 2, 3],
      domains: ["money"],
      structures: ["money_combination", "money_total"],
      reasoning: ["money_calculation", "multiplication", "addition", "counting"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Find the value contributed by each repeated denomination and add the denomination subtotals.",
      conceptualFocus: ["denomination", "repeated equal values", "money total"],
      prerequisiteConcepts: ["counting equal groups", "addition"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("group_denominations", "represent", "Group equal coins or notes by denomination.", "Each group has one repeated value.", ["money_model", "equal_groups_diagram"]),
        stage("find_subtotals", "calculate", "Find the subtotal for each denomination by repeated addition or multiplication.", "Number of coins × coin value gives the group subtotal.", ["money_model", "symbolic_working"]),
        stage("combine", "calculate", "Add the denomination subtotals in a common currency unit.", "All subtotals contribute to one total amount.", ["symbolic_working"]),
        stage("check_count", "check", "Recount the physical or pictured coins and verify the subtotals.", "Coin count and denomination values should match the calculation.", ["money_model"]),
      ],
      representations: reps(["money_model"], ["equal_groups_diagram", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Write one line per denomination before adding subtotals."],
      generalisationPattern: "A mixed coin total is the sum of each denomination's count multiplied by its value.",
      checkPattern: "Recount each denomination and recompute its subtotal.",
    },
    misconceptions: [
      misconception("add_coin_values_once", "Adding each denomination only once regardless of how many coins there are.", ["Coin count is ignored"], "Pair each denomination with its count before calculating the subtotal."),
    ],
    visualGuidance: visual("usually", ["money_model", "equal_groups_diagram"]),
    dreamscapeClaim: "Dreamscape adds an early-primary money-composition variant for repeated coin denominations.",
  }),

  makeMethod({
    methodId: "arithmetic.operation_chain.decimal_calculate_then_round",
    familyId: "arithmetic.operation_chain",
    variantId: "decimal_calculate_then_round",
    title: "Calculate a decimal result before rounding",
    summary: "Keeps the exact decimal calculation separate from the subsequent rounding instruction and checks the rounded result against the exact value.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["decimals"],
      structures: ["operation_chain"],
      reasoning: ["place_value_reasoning", "estimation", "multiplication", "division", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Execute the requested decimal operation exactly, then round only the completed result to the stated place.",
      conceptualFocus: ["operation before rounding", "decimal place value", "two-stage instruction"],
      prerequisiteConcepts: ["decimal operations", "rounding"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("calculate_exact", "calculate", "Complete the decimal operation without premature rounding.", "The exact result is the input to the rounding step.", ["written_algorithm", "symbolic_working"]),
        stage("identify_rounding_place", "notice_relationship", "Mark the requested rounding digit and the digit immediately to its right.", "Rounding depends on place value, not the operation just used.", ["place_value_chart"]),
        stage("round", "calculate", "Apply the rounding rule once to the exact result.", "Only the requested place is retained in the reported result.", ["place_value_chart", "symbolic_working"]),
        stage("estimate_check", "check", "Compare the rounded answer with a quick magnitude estimate.", "The result should be close to the exact value and plausible in size.", ["number_line"]),
      ],
      representations: reps(["symbolic_working", "place_value_chart"], ["written_algorithm", "number_line"]),
    },
    workedPattern: {
      notationGuidance: ["Use '=' for the exact result and '≈' for the rounded result when showing both."],
      generalisationPattern: "When a question says calculate then round, finish the calculation first and round the result once.",
      checkPattern: "The rounded answer should lie within half a rounding unit of the exact result.",
    },
    misconceptions: [
      misconception("round_inputs_early", "Rounding the original numbers before carrying out the requested calculation.", ["Exact result cannot be recovered"], "Keep full given precision until the final rounding stage."),
    ],
    visualGuidance: visual("optional", ["place_value_chart", "number_line"]),
    dreamscapeClaim: "Dreamscape adds a decimal operation-chain variant that separates exact calculation from final rounding.",
  }),

  makeMethod({
    methodId: "arithmetic.operation_chain.decimal_place_value_constraints",
    familyId: "arithmetic.operation_chain",
    variantId: "decimal_place_value_constraints",
    title: "Build a decimal from place-value and rounding constraints",
    summary: "Constructs a decimal from stated digit positions, then uses a rounding condition to determine or verify the whole-number portion.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["decimals"],
      structures: ["operation_chain"],
      reasoning: ["place_value_reasoning", "estimation", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Combine digit-position clues and a rounding clue without mixing their roles.",
      conceptualFocus: ["digit position", "rounding interval", "constraint intersection"],
      prerequisiteConcepts: ["tenths/hundredths/thousandths", "rounding to whole numbers"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("place_decimal_digits", "represent", "Place each stated decimal digit in its named column.", "Each clue fixes one decimal position exactly.", ["place_value_chart"]),
        stage("translate_rounding", "reason", "Translate the rounding statement into the interval of values that would round to the stated whole number.", "Rounding provides a range constraint on the whole number and tenths digit.", ["number_line"]),
        stage("combine_constraints", "reason", "Choose the value that satisfies both the digit-position clues and the rounding interval.", "All clues must hold at the same time.", ["place_value_chart", "number_line"]),
        stage("verify", "check", "Round the constructed number and reread every digit-position clue.", "The chosen number must pass both checks.", ["verbal_reasoning"]),
      ],
      representations: reps(["place_value_chart"], ["number_line", "table", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Separate fixed digit clues from the rounding interval before combining them."],
      generalisationPattern: "A number described by several place-value clues is found by intersecting all of the constraints.",
      checkPattern: "Verify every stated digit position and perform the requested rounding independently.",
    },
    misconceptions: [
      misconception("rounding_sets_decimal_digits", "Treating the rounding clue as if it directly specifies tenths, hundredths or thousandths digits.", ["Digit clues are overwritten"], "Place exact digit clues first; use rounding only to constrain the remaining possibilities."),
    ],
    visualGuidance: visual("usually", ["place_value_chart", "number_line"]),
    dreamscapeClaim: "Dreamscape adds a constraint-based decimal operation-chain variant for questions that combine digit positions with rounding information.",
  }),

  makeMethod({
    methodId: "algebra.equation_unknown.fraction_equation_balance",
    familyId: "algebra.equation_unknown",
    variantId: "fraction_equation_balance",
    title: "Solve a missing-number equation with fractions",
    summary: "Treats fraction expressions on both sides of an equality as quantities and uses equivalence or inverse reasoning to isolate the missing number.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["fractions"],
      structures: ["missing_number_equation", "equation_unknown"],
      reasoning: ["equation_solving", "working_backwards", "fraction_multiplication", "fraction_addition", "fraction_subtraction", "addition", "subtraction", "multiplication", "division"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Rewrite fraction expressions into a comparable form and use equality to determine the missing multiplier or quantity.",
      conceptualFocus: ["equality", "equivalent fraction quantities", "inverse reasoning"],
      prerequisiteConcepts: ["fraction equivalence", "fraction operations"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("simplify_known_side", "calculate", "Combine or simplify the fully known fraction expression first.", "Reduce visual and symbolic complexity before solving for the unknown.", ["fraction_bar", "symbolic_working"]),
        stage("express_common_unit", "represent", "Express both sides in a common fractional unit where useful.", "Equal-sized fraction units make the multiplier visible.", ["fraction_bar", "equation"]),
        stage("isolate_unknown", "reason", "Use equivalence or an inverse operation to determine the missing number.", "Equality must remain true on both sides.", ["equation", "symbolic_working"]),
        stage("substitute_check", "check", "Substitute the missing number back into the original equation.", "Both fraction expressions must evaluate to the same quantity.", ["equation"]),
      ],
      representations: reps(["equation", "fraction_bar"], ["symbolic_working", "bar_model"]),
    },
    workedPattern: {
      notationGuidance: ["Simplify known fraction expressions before isolating the unknown."],
      generalisationPattern: "A fraction equation is solved by preserving equality while converting both sides to comparable quantities.",
      checkPattern: "Evaluate both sides after substitution and confirm exact equality.",
    },
    misconceptions: [
      misconception("compare_numerators_only", "Comparing or manipulating numerators without accounting for the fractional unit.", ["Equality changes unexpectedly"], "Use a common fractional unit or equivalent fraction representation before comparing quantities."),
    ],
    visualGuidance: visual("usually", ["fraction_bar", "equation"]),
    dreamscapeClaim: "Dreamscape adds a fraction-domain missing-equation variant so algebraic unknown reasoning remains available without replacing fraction meaning.",
  }),

  makeMethod({
    methodId: "arithmetic.operation_chain.algebraic_simplification",
    familyId: "arithmetic.operation_chain",
    variantId: "algebraic_simplification",
    title: "Simplify an algebraic operation chain",
    summary: "Respects multiplication before addition/subtraction, evaluates numerical coefficients, and combines like terms without treating unlike operations as interchangeable.",
    status: "active",
    applicability: {
      levels: [5, 6],
      domains: ["algebra"],
      structures: ["operation_chain"],
      reasoning: ["algebraic_simplification", "multiplication", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Simplify a one-variable expression by applying operation order and combining like terms through their coefficients.",
      conceptualFocus: ["operation order", "coefficient", "like terms"],
      prerequisiteConcepts: ["multiplication before addition/subtraction", "meaning of coefficient"],
      cpaPolicy: "not_required",
      teachingSequence: [
        stage("identify_terms", "represent", "Separate the expression into terms and identify numerical multiplication within each term.", "A term such as 7a × 5 must be simplified before combining terms.", ["symbolic_working"]),
        stage("multiply_coefficients", "calculate", "Carry out coefficient multiplication first.", "Operation order applies inside the algebraic expression.", ["symbolic_working"]),
        stage("combine_like_terms", "calculate", "Add and subtract the coefficients of like variable terms.", "The common variable factor is retained while coefficients combine.", ["equation", "symbolic_working"]),
        stage("check_equivalent", "check", "Substitute a simple test value to verify the original and simplified expressions agree.", "Equivalent expressions give the same value for the same variable input.", ["equation"]),
      ],
      representations: reps(["symbolic_working"], ["equation", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Show coefficient multiplication before collecting like terms."],
      generalisationPattern: "Simplify products first, then combine like terms by operating on their coefficients.",
      checkPattern: "Test both expressions with one convenient variable value.",
    },
    misconceptions: [
      misconception("combine_before_multiply", "Adding coefficients before completing multiplication in a term.", ["Operation order is violated"], "Mark each product within a term and simplify it before collecting like terms."),
    ],
    visualGuidance: visual("never", []),
    dreamscapeClaim: "Dreamscape adds an algebra-domain operation-chain variant for primary-level simplification questions.",
  }),

  makeMethod({
    methodId: "speed.distance_time.inverse_work_rate",
    familyId: "speed.distance_time",
    variantId: "inverse_work_rate",
    title: "Reason about workers and time at a constant work rate",
    summary: "Treats a fixed job as a constant amount of work and reasons that increasing equally productive workers decreases completion time proportionally.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["speed_rate"],
      structures: ["speed_distance_time"],
      reasoning: ["speed_calculation", "division", "unit_conversion", "rate_scaling", "multiplication"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Keep total work fixed while comparing how worker count and completion time change inversely.",
      conceptualFocus: ["fixed work", "equal worker rates", "inverse scaling"],
      prerequisiteConcepts: ["equal groups", "multiplicative comparison"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("state_fixed_job", "establish_meaning", "Identify that the amount of work is unchanged and every worker works at the same rate.", "Only worker count and time are changing.", ["table"]),
        stage("compare_workers", "notice_relationship", "Find the scale factor from the original number of workers to the new number.", "More equal-rate workers share the same job.", ["ratio_table", "table"]),
        stage("invert_time_scale", "reason", "Apply the reciprocal scale to completion time.", "If worker count is multiplied by a factor, time is divided by that factor for the same job.", ["ratio_table", "double_number_line"]),
        stage("check_work_constant", "check", "Check that workers × time gives the same worker-time product in both cases.", "The fixed-work invariant should be preserved.", ["equation"]),
      ],
      representations: reps(["ratio_table"], ["table", "double_number_line", "equation", "symbolic_working"]),
    },
    workedPattern: {
      notationGuidance: ["Keep the job fixed and show the worker scale factor before changing time."],
      generalisationPattern: "For a fixed job with equally productive workers, worker count and completion time vary inversely.",
      checkPattern: "Original workers × original time should equal new workers × new time.",
    },
    misconceptions: [
      misconception("direct_scale_time", "Increasing workers and increasing time by the same factor.", ["More workers produce a longer completion time"], "Use the fixed-work invariant to show that time must move in the opposite direction."),
    ],
    visualGuidance: visual("usually", ["ratio_table", "double_number_line"]),
    dreamscapeClaim: "Dreamscape adds an inverse work-rate candidate because the current bank classifies simple worker-time problems under the speed/rate structure.",
  }),

  makeMethod({
    methodId: "fraction.multi_step.equal_piece_combination",
    familyId: "fraction.multi_step",
    variantId: "equal_piece_combination",
    title: "Combine or remove fractions using equal pieces",
    summary: "Uses a known number of equal pieces to translate simple fractions into piece counts, combine or remove those counts, and convert the result back when needed.",
    status: "active",
    applicability: {
      levels: [2, 3, 4],
      domains: ["fractions"],
      structures: ["fraction_multi_step"],
      reasoning: ["fraction_multi_step", "fraction_of_quantity", "fraction_representation", "fraction_division", "multiplication", "addition", "subtraction", "comparison"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Translate each stated fraction into a count of equal pieces before combining eaten, used or remaining pieces.",
      conceptualFocus: ["equal parts", "fraction-to-piece count", "remaining or combined pieces"],
      prerequisiteConcepts: ["fraction as equal parts", "counting and subtraction/addition"],
      cpaPolicy: "required_progression",
      teachingSequence: [
        stage("represent_whole", "represent", "Show the whole as the stated number of equal pieces.", "Every piece represents the same fraction of the whole.", ["fraction_bar", "set_model"]),
        stage("translate_each_fraction", "calculate", "Determine how many equal pieces each stated fraction represents.", "Denominator describes equal parts; numerator describes how many of those parts.", ["fraction_bar", "set_model"]),
        stage("combine_or_remove", "calculate", "Add piece counts that are combined or subtract used pieces from the total, following the story.", "Once parts are equal-sized, their counts can be combined directly.", ["fraction_bar", "symbolic_working"]),
        stage("express_target", "generalise", "Report the requested piece count or fraction of the original whole.", "Match the final representation to the question target.", ["fraction_bar", "symbolic_working"]),
        stage("check_parts", "check", "Check that used and remaining pieces account for the whole where applicable.", "Piece counts should not exceed or lose parts of the stated whole.", ["set_model"]),
      ],
      representations: reps(["fraction_bar", "set_model"], ["symbolic_working", "bar_model"]),
    },
    workedPattern: {
      notationGuidance: ["Convert each fraction to equal-piece counts before combining stages."],
      generalisationPattern: "When a whole is already partitioned into equal pieces, multi-step fraction reasoning can be made concrete by tracking piece counts.",
      checkPattern: "For remaining-part problems, used pieces + remaining pieces should equal the total pieces.",
    },
    misconceptions: [
      misconception("add_denominators", "Adding denominators when the pieces already belong to the same fixed partition.", ["Result changes the size of the original pieces"], "Keep the partition fixed and combine the counts of equal pieces instead."),
    ],
    visualGuidance: visual("essential", ["fraction_bar", "set_model"]),
    dreamscapeClaim: "Dreamscape adds a P2-ready multi-step fraction variant grounded in equal-piece counting rather than advanced fraction algorithms.",
  }),

  makeMethod({
    methodId: "number.place_value.constrained_digit_formation",
    familyId: "number.place_value",
    variantId: "constrained_digit_formation",
    title: "Form numbers from digits under place-value constraints",
    summary: "Builds valid numbers position by position while enforcing leading-digit, parity, repetition and other stated constraints systematically.",
    status: "active",
    applicability: {
      levels: [2, 3, 4, 5, 6],
      domains: ["whole_numbers", "arithmetic", "logic"],
      structures: ["place_value"],
      reasoning: ["place_value_reasoning", "comparison", "counting", "systematic_enumeration", "logical_elimination"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use place positions and explicit constraints to construct and count valid numbers without omission or duplication.",
      conceptualFocus: ["place position", "digit constraints", "systematic cases"],
      prerequisiteConcepts: ["place value", "even/odd or other stated digit properties"],
      cpaPolicy: "recommended",
      teachingSequence: [
        stage("identify_restricted_positions", "reason", "Identify which place positions have the strongest constraints, such as the units digit for an even number or the hundreds digit not being zero.", "Start with constraints that eliminate the most cases.", ["place_value_chart", "table"]),
        stage("fix_one_case", "represent", "Fix one valid choice for the most restricted position.", "Each fixed case defines a smaller set of remaining choices.", ["place_value_chart", "table"]),
        stage("fill_remaining_places", "calculate", "Fill remaining positions without violating repetition or other constraints.", "Available digits shrink as positions are filled.", ["table"]),
        stage("repeat_systematically", "reason", "Repeat for each allowed restricted-position case and count the valid outcomes.", "A fixed order prevents duplicates and omissions.", ["table"]),
        stage("verify_sample", "check", "Check a few constructed numbers against every stated condition.", "Each counted number must satisfy all constraints simultaneously.", ["verbal_reasoning"]),
      ],
      representations: reps(["place_value_chart", "table"], ["verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Organise cases by the most restricted digit position first."],
      generalisationPattern: "Constrained digit-formation problems are counted by fixing restricted positions and enumerating remaining valid choices systematically.",
      checkPattern: "Verify no number starts with an invalid digit, repeats a prohibited digit, or violates the target property.",
    },
    misconceptions: [
      misconception("allow_leading_zero", "Counting arrangements with zero in the leading place of a multi-digit number.", ["A supposed 3-digit number has only 2-digit value"], "Treat the leading place as a separate constrained position before counting other places."),
    ],
    visualGuidance: visual("usually", ["place_value_chart", "table"]),
    dreamscapeClaim: "Dreamscape adds a place-value constrained-enumeration variant for digit-formation problems surfaced by the holdout cohort.",
  }),

  makeMethod({
    methodId: "algebra.equation_unknown.linked_equations_elimination",
    familyId: "algebra.equation_unknown",
    variantId: "linked_equations_elimination",
    title: "Combine linked equations to find a requested expression",
    summary: "Uses two or more simple linked equations to eliminate a shared unknown or derive a requested combination without solving unnecessary quantities first.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["algebra", "geometry", "logic"],
      structures: ["missing_number_equation", "equation_unknown"],
      reasoning: ["equation_solving", "working_backwards", "addition", "subtraction"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use the relationship between linked equations to eliminate a shared quantity and obtain the requested expression efficiently.",
      conceptualFocus: ["shared unknown", "equation combination", "elimination"],
      prerequisiteConcepts: ["equality", "addition/subtraction of equations"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("write_linked_equations", "represent", "Write each given relationship clearly and identify the shared unknown or expression.", "The same symbol has the same value in every equation.", ["equation"]),
        stage("choose_combination", "reason", "Decide whether adding, subtracting or using a known invariant will remove the shared quantity or produce the target expression.", "Operate on whole equalities, not isolated terms arbitrarily.", ["equation", "symbolic_working"]),
        stage("derive_target", "calculate", "Carry out the chosen equation combination and simplify to the requested expression.", "Avoid solving extra unknowns unless they are needed.", ["symbolic_working"]),
        stage("context_check", "check", "Check the derived result against any contextual invariant, such as an angle total, and the original equations.", "The result must be compatible with every relationship.", ["equation", "verbal_reasoning"]),
      ],
      representations: reps(["equation"], ["symbolic_working", "diagram", "verbal_reasoning"]),
    },
    workedPattern: {
      notationGuidance: ["Align equations vertically when adding or subtracting them."],
      generalisationPattern: "Linked equations can be combined to remove a shared unknown or construct the requested expression directly.",
      checkPattern: "Verify the derived relation is consistent with the original equalities and any domain invariant.",
    },
    misconceptions: [
      misconception("eliminate_in_one_side_only", "Adding or subtracting a term on only one side of an equation when combining relationships.", ["Equality is not preserved"], "Treat each equation as a whole equality and perform matched operations."),
    ],
    visualGuidance: visual("optional", ["equation", "diagram"]),
    dreamscapeClaim: "Dreamscape adds a linked-equation candidate for geometry and algebra questions that canonical understanding represents as missing-number equations.",
  }),

  makeMethod({
    methodId: "number.place_value.units_digit_cycle",
    familyId: "number.place_value",
    variantId: "units_digit_cycle",
    title: "Track the units digit through a repeating multiplication cycle",
    summary: "Focuses on the ones place, records the repeating units-digit cycle of successive products or powers, and uses the cycle position to determine a distant final digit.",
    status: "active",
    applicability: {
      levels: [4, 5, 6],
      domains: ["arithmetic", "whole_numbers", "patterns"],
      structures: ["place_value", "common_multiple_cycle"],
      reasoning: ["place_value_reasoning", "comparison", "multiplication", "pattern_extension", "pattern_application", "common_multiple"],
      curriculumSkills: [],
      exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: "Use only the units digit of successive products to identify a repeating cycle and locate the required cycle position.",
      conceptualFocus: ["ones place", "repeating cycle", "cycle index"],
      prerequisiteConcepts: ["multiplication facts", "remainder or cycle counting"],
      cpaPolicy: "optional",
      teachingSequence: [
        stage("generate_units_digits", "calculate", "Calculate the units digits of the first few successive products until a repeat appears.", "Only the ones place is relevant to the requested last digit.", ["table"]),
        stage("identify_cycle", "notice_relationship", "Mark the repeating block and its cycle length.", "Once a full block repeats, later units digits follow the same order.", ["table"]),
        stage("locate_position", "reason", "Determine where the requested multiplication count falls within the cycle.", "The large exponent or repetition count can be reduced to a cycle position.", ["table", "symbolic_working"]),
        stage("read_units_digit", "calculate", "Read the units digit at that cycle position.", "No full large product is needed.", ["table"]),
        stage("verify_cycle", "check", "Generate one additional cycle term to confirm the repetition pattern.", "The identified cycle should continue consistently.", ["symbolic_working"]),
      ],
      representations: reps(["table"], ["symbolic_working", "number_line"]),
    },
    workedPattern: {
      notationGuidance: ["Record term number and units digit in two aligned rows."],
      generalisationPattern: "The units digits of repeated multiplication often form a finite cycle that can replace impractically large calculation.",
      checkPattern: "Verify the cycle repeats before using its length to index the distant term.",
    },
    misconceptions: [
      misconception("calculate_full_power", "Attempting to multiply the full large product instead of tracking only the required place value.", ["Work becomes unnecessarily huge"], "Restrict each step to the units digit and record the cycle."),
    ],
    visualGuidance: visual("usually", ["table"]),
    dreamscapeClaim: "Dreamscape adds an explicit units-digit cycle variant because the holdout bank expresses this pattern through a place-value structure.",
  }),
];

export const PHASE4B7_COVERAGE_HARDENING_METHODS = Object.freeze(METHODS);
