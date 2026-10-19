/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.3A
 * INACTIVE specialist teaching-method DRAFTS for staff taxonomy review.
 *
 * These drafts are not imported by phase4BProductionLibrary.ts or by the 4C
 * selector. They are NOT eligible for selection, scoring, learner delivery,
 * publication or approval. Do not register them in production until 8C-2C.3B-D
 * establish evidence gates, pedagogical validity and regression coverage.
 *
 * Skill identifiers are intentionally undeclared. A legacy skill label, topic
 * tag or plausible wording MUST NOT be used to award curriculum-skill points.
 * The descriptions are question-agnostic and contain no question/answer data.
 */
import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  type TeachingMethod,
  type TeachingMethodStage,
  type TeachingRepresentationType,
} from '../schema/types';

type StageRole = TeachingMethodStage['role'];
type StageHints = TeachingRepresentationType[];
const stage = (
  stageId: string,
  role: StageRole,
  instructionPattern: string,
  learnerFocus: string,
  representationHints: StageHints,
): TeachingMethodStage => ({ stageId, role, instructionPattern, learnerFocus, representationHints, optional: false });

const GOVERNANCE: TeachingMethod['governance'] = {
  deterministicOnly: true,
  questionAgnostic: true,
  answerAgnostic: true,
  runtimeAgnostic: true,
  lunaAllowed: false,
  persistence: 'version_controlled_source',
};

const claim = (methodId: string, statement: string): TeachingMethod['provenance'] => ({
  classifications: ['dreamscape_method'],
  claims: [{
    claimId: `${methodId.replaceAll('.', '_')}_draft`,
    classification: 'dreamscape_method',
    sourceId: null,
    sourceClaimTag: null,
    statement,
    evidenceNote: 'Draft internal teaching design. Not externally approved, not MOE-prescribed and not registered as an active production method.',
  }],
});

function freezeDraft<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freezeDraft(child);
  }
  return value;
}

const DRAFTS: TeachingMethod[] = [
  {
    schemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    methodId: 'heuristic.multi_step.equal_spacing_interval_count',
    familyId: 'heuristic.multi_step',
    variantId: 'equal_spacing_interval_count',
    title: 'Count equal intervals between indexed positions',
    summary: 'For equally spaced positions, count the gaps between two position numbers before multiplying by one gap length.',
    status: 'draft',
    applicability: {
      levels: [3, 4, 5, 6],
      domains: ['measurement'],
      structures: ['multi_step'],
      reasoning: ['subtraction', 'multiplication', 'comparison'],
      curriculumSkills: [],
      exclusions: [
        'Requires explicit equal spacing between consecutive positions and two known position indices.',
        'Do not apply to unequal gaps, non-consecutive indexing, circular routes, or an unknown spacing rule without separate proof.',
        'Distance between two positions is not the same as the number of objects occupying those positions.',
      ],
    },
    pedagogy: {
      learningObjectivePattern: 'Connect indexed objects to the intervals separating them, then calculate a total distance from the number and size of equal gaps.',
      conceptualFocus: ['ordinal positions', 'one fewer interval than objects in a contiguous run', 'equal-length gaps', 'distance as repeated addition'],
      prerequisiteConcepts: ['ordinal counting', 'subtraction of whole numbers', 'multiplication by a constant length'],
      cpaPolicy: 'recommended',
      teachingSequence: [
        stage('represent_positions', 'represent', 'Draw a short row of equally spaced markers and label the two indexed positions.', 'Markers identify positions; the spaces between them represent intervals.', ['diagram', 'number_line']),
        stage('count_intervals', 'notice_relationship', 'Find the difference between the final and initial position indices.', 'Subtracting the indices counts the intervening gaps rather than all markers.', ['diagram', 'symbolic_working']),
        stage('calculate_distance', 'calculate', 'Multiply the number of equal gaps by the distance between successive markers.', 'Each interval has the same length, so repeated addition can be multiplied.', ['symbolic_working']),
        stage('check_small_case', 'check', 'Use a short run of adjacent positions to verify the gap-count rule and confirm units.', 'The distance between neighboring markers is exactly one interval.', ['number_line', 'verbal_reasoning']),
      ],
      representations: { preferred: ['diagram', 'number_line'], allowed: ['symbolic_working', 'verbal_reasoning'], discouraged: [] },
    },
    workedPattern: {
      notationGuidance: ['Label each position and the equal length between consecutive positions.', 'Write interval count = later index minus earlier index before multiplying by gap length.', 'Keep distance units in the final quantity.'],
      generalisationPattern: 'For consecutive indexed positions with constant spacing, distance = (later index - earlier index) × spacing.',
      checkPattern: 'Check two adjacent positions: their index difference is one and their distance is one gap length.',
    },
    misconceptions: [{
      misconceptionId: 'count_positions_instead_of_gaps',
      misconception: 'Multiplying by the number of markers or counting both endpoints as additional intervals.',
      diagnosticSignals: ['Uses later index directly as interval count', 'Adds one to the difference of two indices'],
      correctionApproach: 'Draw a short row of markers, point to each gap and count the gaps independently of the markers.',
    }],
    visualGuidance: { visualUse: 'usually', preferredVisualTypes: ['diagram', 'number_line'], originalDiagramPolicy: 'not_required', generatedVisualAllowed: true },
    provenance: claim('heuristic.multi_step.equal_spacing_interval_count', 'Dreamscape draft for equal-interval counting from indexed positions.'),
    governance: { ...GOVERNANCE },
  },
  {
    schemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    methodId: 'heuristic.multi_step.multiplicative_comparison_chain',
    familyId: 'heuristic.multi_step',
    variantId: 'multiplicative_comparison_chain',
    title: 'Solve a chain of multiplicative comparisons from a known total',
    summary: 'Express related quantities using the same base unit, combine their parts and determine the requested share.',
    status: 'draft',
    applicability: {
      levels: [4, 5, 6],
      domains: ['whole_numbers'],
      structures: ['multi_step'],
      reasoning: ['comparison', 'multiplication', 'division', 'addition'],
      curriculumSkills: [],
      exclusions: [
        'Requires at least two explicit multiplicative relationships involving a common set of quantities and a known combined total.',
        'Do not treat additive more-than or less-than comparisons as equal-unit multipliers.',
        'If the multiplicative descriptions cannot be related to a common base, request a different representation.',
      ],
    },
    pedagogy: {
      learningObjectivePattern: 'Represent a chain of related multiplicative quantities as comparable units, use the combined total to find one unit and determine a target quantity.',
      conceptualFocus: ['multiplicative rather than additive comparison', 'consistent base quantity', 'equivalent unit parts', 'part-whole total'],
      prerequisiteConcepts: ['multiplication and division', 'fraction of a quantity', 'parts of a whole'],
      cpaPolicy: 'recommended',
      teachingSequence: [
        stage('identify_reference', 'establish_meaning', 'Choose one reference quantity and express the other quantities relative to it.', 'Every comparison must refer to a clearly identified quantity.', ['verbal_reasoning', 'bar_model']),
        stage('equivalent_units', 'represent', 'Draw aligned equal-unit bars and, where fractional comparisons appear, subdivide units consistently.', 'A half-unit in one bar must represent the same amount as a half-unit elsewhere.', ['bar_model', 'strip_diagram']),
        stage('find_one_unit', 'calculate', 'Combine the equivalent units for all quantities, then divide the known total by that number of units.', 'The total is shared across all named quantities without omission or duplication.', ['bar_model', 'symbolic_working']),
        stage('scale_target', 'calculate', 'Scale the one-unit value to the requested quantity.', 'Use the target bar, not the largest bar automatically.', ['symbolic_working']),
        stage('check_comparisons', 'check', 'Verify every multiplicative relationship and recombine the quantities to reproduce the total.', 'Both the comparisons and the overall total must hold.', ['symbolic_working', 'verbal_reasoning']),
      ],
      representations: { preferred: ['bar_model', 'strip_diagram'], allowed: ['table', 'symbolic_working', 'verbal_reasoning'], discouraged: [] },
    },
    workedPattern: {
      notationGuidance: ['Use the same base unit for every compared quantity.', 'Convert fractional unit counts to equivalent smaller units before combining them.', 'Label whose quantity each bar and final amount represents.'],
      generalisationPattern: 'Write all quantities as multiples of one reference unit, add the multipliers for the total, solve the reference unit and scale the target.',
      checkPattern: 'Rebuild the total and check every stated multiplicative comparison.',
    },
    misconceptions: [{
      misconceptionId: 'mixed_reference_units',
      misconception: 'Applying successive multiplication factors to different reference quantities without keeping a shared base.',
      diagnosticSignals: ['Treats a half-of-a-comparison as half of the original base', 'Adds coefficients with inconsistent unit sizes'],
      correctionApproach: 'Return to labelled bars, identify the reference of each comparison and convert all quantities to one consistent unit.',
    }],
    visualGuidance: { visualUse: 'usually', preferredVisualTypes: ['bar_model', 'strip_diagram'], originalDiagramPolicy: 'not_required', generatedVisualAllowed: true },
    provenance: claim('heuristic.multi_step.multiplicative_comparison_chain', 'Dreamscape draft for multiple related multiplicative comparisons and an explicit combined total.'),
    governance: { ...GOVERNANCE },
  },
  {
    schemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    methodId: 'ratio.relationship.before_after_change',
    familyId: 'ratio.relationship',
    variantId: 'before_after_change',
    title: 'Relate the ratio before and after known changes',
    summary: 'Represent the same two quantities before and after stated additions or removals, then solve their linked ratio relationships.',
    status: 'draft',
    applicability: {
      levels: [5, 6],
      domains: ['ratio'],
      structures: ['ratio_relationship'],
      reasoning: ['ratio_scaling', 'addition', 'subtraction', 'comparison'],
      curriculumSkills: [],
      exclusions: [
        'Requires a before ratio, an after ratio, and explicitly known changes to at least one of the two corresponding quantities.',
        'Do not assume one quantity stays unchanged unless the question explicitly says so.',
        'If the stated changes do not determine a unique original scale, stop for review rather than inventing a value.',
      ],
    },
    pedagogy: {
      learningObjectivePattern: 'Track the same quantities through two ratio states, link corresponding terms with the stated changes and determine the original amounts.',
      conceptualFocus: ['ordered ratio terms', 'before and after states', 'common scale within a single ratio', 'conservation with explicit changes'],
      prerequisiteConcepts: ['equivalent ratios', 'multiplication and division', 'one-variable equations or equal-unit reasoning'],
      cpaPolicy: 'recommended',
      teachingSequence: [
        stage('identify_quantities', 'establish_meaning', 'Name the two quantities, their order in both ratios and the changes that occur.', 'The order of ratio terms must remain consistent.', ['ratio_table', 'verbal_reasoning']),
        stage('represent_before', 'represent', 'Represent the before amounts using a common unknown scale multiplied by each before-ratio term.', 'Both before amounts share the same before-state unit.', ['bar_model', 'ratio_table']),
        stage('apply_changes', 'notice_relationship', 'Add or subtract each stated absolute change from the corresponding before amount.', 'A quantity changes only as specified; do not assume a part remains constant.', ['ratio_table', 'symbolic_working']),
        stage('enforce_after_ratio', 'reason', 'Use the after-ratio relationship to form a consistent equality between the two updated amounts.', 'The updated amounts must share the new ratio without confusing the old and new scales.', ['equation', 'ratio_table']),
        stage('solve_and_verify', 'check', 'Solve for the original scale when uniquely determined, then check both original and updated ratio states.', 'Both ratios and all changes must be satisfied.', ['symbolic_working', 'ratio_table']),
      ],
      representations: { preferred: ['ratio_table', 'bar_model'], allowed: ['equation', 'symbolic_working', 'verbal_reasoning'], discouraged: [] },
    },
    workedPattern: {
      notationGuidance: ['Label the before and after rows with the same ordered quantities.', 'Use one scale for the before ratio; allow the after ratio to have a different scale.', 'Check that the difference between each before and after amount equals its stated change.'],
      generalisationPattern: 'Write before amounts as proportional ratio terms, apply the known changes, and equate the resulting amounts in the after ratio.',
      checkPattern: 'Reconstruct both original and updated amounts, recalculate both ratios and verify every change.',
    },
    misconceptions: [{
      misconceptionId: 'reuse_ratio_unit_across_states',
      misconception: 'Assuming the size of one ratio unit stays fixed when the ratio changes after unequal additions or removals.',
      diagnosticSignals: ['Uses the same ratio-unit value for both states without proof', 'Assumes one quantity is unchanged despite a stated change'],
      correctionApproach: 'Keep separate before and after rows, track the absolute changes, and derive the relation between scales rather than assuming it.',
    }],
    visualGuidance: { visualUse: 'usually', preferredVisualTypes: ['ratio_table', 'bar_model'], originalDiagramPolicy: 'not_required', generatedVisualAllowed: true },
    provenance: claim('ratio.relationship.before_after_change', 'Dreamscape draft for linking before and after ratios through verified absolute changes.'),
    governance: { ...GOVERNANCE },
  },
];

/** Not registered as production candidates; consumers must explicitly opt in to examine these drafts. */
export const PHASE4E2B8C2C3A_SPECIALIST_DRAFTS: readonly Readonly<TeachingMethod>[] = Object.freeze(DRAFTS.map((draft) => freezeDraft(draft)));
