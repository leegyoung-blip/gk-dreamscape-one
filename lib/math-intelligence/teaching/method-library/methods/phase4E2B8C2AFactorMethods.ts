/** 4E-2B-8C-2A: narrowly eligible, question-agnostic factor/multiple methods. */
import { defineTeachingMethod, PHASE4B_METHOD_SCHEMA_VERSION, type TeachingMethod } from '../schema';

function method(
  id: string,
  title: string,
  summary: string,
  levels: (1|2|3|4|5|6)[],
  structure: 'bounded_common_multiple' | 'common_factor_partition',
  reasoning: TeachingMethod['applicability']['reasoning'],
  skill: string,
  steps: Array<[string, string, string]>,
): Readonly<TeachingMethod> {
  return defineTeachingMethod({
    schemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    methodId: id,
    familyId: 'number.factors_multiples',
    variantId: id.split('.').at(-1)!,
    title, summary, status: 'active',
    applicability: {
      levels, domains: ['whole_numbers'], structures: [structure],
      reasoning, curriculumSkills: skill ? [skill] : [], exclusions: [],
    },
    pedagogy: {
      learningObjectivePattern: summary,
      conceptualFocus: structure === 'bounded_common_multiple'
        ? ['common multiples', 'strict upper bound', 'maximum valid positive multiple']
        : ['highest common factor', 'no-waste cutting', 'count of equal pieces'],
      prerequisiteConcepts: ['whole-number multiplication and division'],
      cpaPolicy: 'optional',
      teachingSequence: steps.map(([stageId, instructionPattern, learnerFocus], index) => ({
        stageId, role: index === 0 ? 'notice_relationship' as const : index === steps.length - 1 ? 'check' as const : 'calculate' as const,
        instructionPattern, learnerFocus, representationHints: ['table' as const, 'symbolic_working' as const], optional: false,
      })),
      representations: {
        preferred: ['table'], allowed: ['symbolic_working', 'verbal_reasoning'], discouraged: [],
      },
    },
    workedPattern: {
      notationGuidance: ['Show the factors or multiples that satisfy every stated condition.', 'Label units and the requested quantity.'],
      generalisationPattern: summary,
      checkPattern: 'Substitute the result into every stated constraint and verify exact divisibility.',
    },
    misconceptions: [{
      misconceptionId: 'wrong_factor_multiple_family',
      misconception: 'Confusing common multiples (shared multiples) with common factors (shared divisors).',
      diagnosticSignals: ['Applies LCM to greatest equal no-waste cuts', 'Applies HCF when finding a shared multiple'],
      correctionApproach: 'Identify whether the result must be a multiple of, or must divide, every given number.',
    }],
    visualGuidance: { visualUse: 'optional', preferredVisualTypes: ['table'], originalDiagramPolicy: 'not_required', generatedVisualAllowed: true },
    provenance: {
      classifications: ['dreamscape_method'],
      claims: [{ claimId: id.replaceAll('.', '_') + '_dreamscape', classification: 'dreamscape_method',
        sourceId: null, sourceClaimTag: null, statement: 'Dreamscape verified structure-specific Mathematics teaching sequence.',
        evidenceNote: 'Internal instructional design; not claimed as an MOE-prescribed algorithm.' }],
    },
    governance: { deterministicOnly: true, questionAgnostic: true, answerAgnostic: true,
      runtimeAgnostic: true, lunaAllowed: false, persistence: 'version_controlled_source' },
  });
}

export const PHASE4E2B8C2A_FACTOR_METHODS: readonly Readonly<TeachingMethod>[] = Object.freeze([
  method(
    'number.factors_multiples.bounded_common_multiple_maximum',
    'Find the greatest valid common multiple below a bound',
    'Finds a positive common multiple below a strict maximum and verifies it is the greatest allowed value.',
    [2,3,4,5,6], 'bounded_common_multiple',
    ['common_multiple', 'comparison', 'division'], '',
    [
      ['interpret_limit', 'Identify the initial quantity and explain why the result must be strictly smaller.', 'At least one item is removed, so equality with the original total is not allowed.'],
      ['find_common_step', 'Find a common multiple of all stated divisors.', 'A valid remainder-free group count is a common multiple.'],
      ['choose_greatest', 'Find the largest positive shared multiple below the strict bound.', 'The requested value is the greatest legal candidate, not the least common multiple automatically.'],
      ['check_divisibility', 'Check positivity, strict bound and exact division by every divisor.', 'All three conditions must hold at once.'],
    ],
  ),
  method(
    'number.factors_multiples.hcf_equal_cut_and_count',
    'Use HCF for maximum no-waste cuts, then count the pieces',
    'Finds the greatest common divisor of all original lengths, then divides and adds to obtain the total number of equal pieces.',
    [5,6], 'common_factor_partition',
    ['division', 'multiplication', 'addition'], 'Highest common factor',
    [
      ['identify_invariant', 'Verify that all originals must be cut into identical lengths without remainder.', 'A valid piece length divides every original length.'],
      ['find_hcf', 'Find the highest common factor of every given length.', 'The greatest valid equal piece length is the HCF, not an arbitrary factor or the LCM.'],
      ['count_each_length', 'Divide each original length by the HCF to count its pieces.', 'Piece counts must be whole numbers and use the same length.'],
      ['sum_piece_counts', 'Add the counts from every original length.', 'The total number of pieces includes all originals.'],
      ['verify_both', 'Multiply each piece count by the common length and check each original, and recount the total.', 'Both requested results must satisfy every no-waste constraint.'],
    ],
  ),
]);
