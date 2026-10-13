/** Phase 4C-2 — deterministic method selection; no persistence, LLM, or teaching steps. */
import { EXPECTED_UPSTREAM_SCHEMAS, STRATEGY_SELECTION_SCHEMA_VERSION, STRATEGY_SELECTION_POLICY_VERSION } from './types';
import type { CandidateAssessment, DimensionScore, ExclusionCode, ScoreDimension, SelectionEvidence, SelectionInputBoundary, StrategySelection } from './types';
import { RANKING_PRIORITY, SCORE_WEIGHTS, classifyConfidence, stableTieBreak } from './policy';
import { validateSelectionBoundary, validateStrategySelection } from './validation';

export const STRATEGY_SELECTOR_VERSION = '4C-2.1' as const;
export interface MethodCandidateEvidence {
  methodId: string;
  familyId: string;
  active: boolean;
  eligibleLevels: readonly number[];
  /** Legacy strict gate, unchanged for existing 4C-2 callers. */
  mandatoryPrerequisitesSatisfied: boolean;
  /** F3: distinct mastery evidence; unknown permits method-suitability ranking but
   * does not earn prerequisite-score points or assert learner mastery. */
  prerequisiteEvidenceState?: 'not_required' | 'verified_satisfied' | 'verified_unmet' | 'not_affirmed' | 'unknown';
  /** Grounded applicability evidence on [0,1]. No default matches may be inferred. */
  matches: Readonly<Record<ScoreDimension, number>>;
  complexity: number;
  positiveEvidence?: readonly SelectionEvidence[];
  penalties?: readonly SelectionEvidence[];
}
export interface StrategySelectorInput {
  boundary: SelectionInputBoundary;
  learnerLevel: number;
  candidates: readonly MethodCandidateEvidence[];
}
const schema = EXPECTED_UPSTREAM_SCHEMAS;
const has = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
function provenance(fp: string) {
  return { teachingContractSchema: schema.teachingContract, teachingConsumerSchema: schema.teachingConsumer,
    methodLibrarySchema: schema.methodLibrary, methodTaxonomySchema: schema.methodTaxonomy,
    selectionPolicyVersion: STRATEGY_SELECTION_POLICY_VERSION, teachingContractFingerprint: fp || 'missing',
    selectorImplementation: STRATEGY_SELECTOR_VERSION } as const;
}
function empty(boundary: SelectionInputBoundary, code: 'INVALID_SELECTION_INPUT'|'UPSTREAM_NOT_READY'|'UPSTREAM_SCHEMA_MISMATCH'|'NO_APPLICABLE_CANDIDATES', detail: string, candidates: CandidateAssessment[] = []): StrategySelection {
  return { schemaVersion: STRATEGY_SELECTION_SCHEMA_VERSION, status: 'blocked', questionId: boundary.questionId || 'invalid',
    primaryFamilyId: has(boundary.primaryFamilyId) ? boundary.primaryFamilyId : null, primaryMethodId: null, supportingMethodIds: [],
    confidence: 'none', confidenceScore: null, winnerMargin: null, candidates, issues: [{code,detail}], provenance: provenance(boundary.teachingContractFingerprint) };
}
function assess(method: MethodCandidateEvidence, family: string, level: number): CandidateAssessment {
  const exclusions: {code: ExclusionCode; detail: string}[] = [];
  if (!method.active) exclusions.push({code:'METHOD_INACTIVE',detail:'Inactive 4B method'});
  if (!method.eligibleLevels.includes(level)) exclusions.push({code:'LEVEL_INCOMPATIBLE',detail:'Method does not support the learner level'});
  if (method.familyId !== family) exclusions.push({code:'PRIMARY_FAMILY_INCOMPATIBLE',detail:'Outside upstream primary family'});
  const mastery = method.prerequisiteEvidenceState;
  const missingPrerequisites = mastery === undefined
    ? !method.mandatoryPrerequisitesSatisfied
    : mastery === 'verified_unmet' || mastery === 'not_affirmed';
  if (missingPrerequisites) exclusions.push({code:'MANDATORY_PREREQUISITE_MISSING',
    detail: mastery === 'verified_unmet' ? 'Learner prerequisite weakness is verified; bridging or alternative required'
      : mastery === 'not_affirmed' ? 'Prerequisites were not affirmed by the legacy evidence source'
      : 'Mandatory prerequisite not satisfied'});
  const scores: DimensionScore[] = RANKING_PRIORITY.map(d => ({dimension:d, maximum:SCORE_WEIGHTS[d], points: Math.round(method.matches[d]*SCORE_WEIGHTS[d]*1e6)/1e6}));
  const score = Math.round(scores.reduce((sum, d) => sum + d.points,0)*1e6)/1e6;
  return {methodId:method.methodId,familyId:method.familyId,eligible: exclusions.length===0,rank:null,
    score:exclusions.length===0 ? score : null,
    dimensionScores:exclusions.length===0 ? scores : [],positiveEvidence:[...(method.positiveEvidence??[])],
    penalties:[...(method.penalties??[])],exclusions,complexity:method.complexity,
    explanationCodes:exclusions.length ? exclusions.map(x=>x.code)
      : mastery === 'unknown' ? ['SCORED_BY_4C2','LEARNER_PREREQUISITES_UNVERIFIED'] : ['SCORED_BY_4C2']};
}
function validMethod(m: MethodCandidateEvidence): boolean {
  return !!m && has(m.methodId) && has(m.familyId) && typeof m.active === 'boolean' &&
    Array.isArray(m.eligibleLevels) && m.eligibleLevels.every(l=>Number.isInteger(l)&&l>=1&&l<=6) &&
    typeof m.mandatoryPrerequisitesSatisfied==='boolean' &&
    (m.prerequisiteEvidenceState === undefined || (
      ['not_required','verified_satisfied','verified_unmet','not_affirmed','unknown'].includes(m.prerequisiteEvidenceState) &&
      ((m.prerequisiteEvidenceState === 'not_required' || m.prerequisiteEvidenceState === 'verified_satisfied')
        === m.mandatoryPrerequisitesSatisfied) &&
      ((m.prerequisiteEvidenceState !== 'unknown' && m.prerequisiteEvidenceState !== 'verified_unmet' &&
        m.prerequisiteEvidenceState !== 'not_affirmed') || m.matches?.prerequisites === 0)
    )) &&
    Number.isSafeInteger(m.complexity) && m.complexity>=0 && !!m.matches &&
    RANKING_PRIORITY.every(d=>typeof m.matches[d]==='number' && Number.isFinite(m.matches[d]) && m.matches[d]>=0 && m.matches[d]<=1) &&
    (!m.positiveEvidence || Array.isArray(m.positiveEvidence)) && (!m.penalties || Array.isArray(m.penalties));
}
function better(a: CandidateAssessment, b: CandidateAssessment): number {
  // The frozen policy requires domain-specific priority; only then simplicity and stable ID.
  for (const dim of RANKING_PRIORITY) {
    const av=a.dimensionScores.find(x=>x.dimension===dim)?.points ?? 0;
    const bv=b.dimensionScores.find(x=>x.dimension===dim)?.points ?? 0;
    if (av!==bv) return bv-av;
  }
  return stableTieBreak(a,b);
}
/** Pure and deterministic. The 4B adapter must provide grounded per-method evidence. */
export function selectTeachingStrategy(input: StrategySelectorInput): StrategySelection {
  const b = input?.boundary;
  if (!b || !has(b.questionId) || !has(b.teachingContractFingerprint)) {
    const safe = {questionId:'invalid',primaryFamilyId:'',teachingContractFingerprint:'missing'} as SelectionInputBoundary;
    return empty(safe,'INVALID_SELECTION_INPUT','Missing or invalid selection boundary');
  }
  const boundaryCheck=validateSelectionBoundary(b);
  if (!boundaryCheck.valid) {
    const mismatch=boundaryCheck.issues.some(x=>x.startsWith('SCHEMA_MISMATCH'));
    return empty(b,mismatch?'UPSTREAM_SCHEMA_MISMATCH':boundaryCheck.issues.includes('UPSTREAM_NOT_READY')?'UPSTREAM_NOT_READY':'INVALID_SELECTION_INPUT',boundaryCheck.issues.join(','));
  }
  if (!Number.isInteger(input.learnerLevel) || input.learnerLevel<1 || input.learnerLevel>6 || !Array.isArray(input.candidates) ||
      input.candidates.some(m=>!validMethod(m)) || new Set(input.candidates.map(m=>m.methodId)).size!==input.candidates.length)
    return empty(b,'INVALID_SELECTION_INPUT','Invalid level, candidate fields, evidence or duplicate methods');
  const candidates=input.candidates.map(m=>assess(m,b.primaryFamilyId,input.learnerLevel));
  const eligible=candidates.filter(x=>x.eligible).sort(better);
  eligible.forEach((x,i)=>x.rank=i+1);
  candidates.sort((a,b)=> (a.rank ?? Number.MAX_SAFE_INTEGER)-(b.rank ?? Number.MAX_SAFE_INTEGER) || (a.methodId < b.methodId ? -1 : a.methodId > b.methodId ? 1 : 0));
  if (!eligible.length) return empty(b,'NO_APPLICABLE_CANDIDATES','No eligible candidate in upstream primary family',candidates);
  const winner=eligible[0]; const runner=eligible[1];
  const score=winner.score!; const margin=runner ? Math.round((score-runner.score!)*1e6)/1e6 : null;
  const confidence=classifyConfidence(score,runner?.score??null);
  const issueCode=score<75?'LOW_WINNER_QUALITY':runner && (margin===null || margin<8)?'INSUFFICIENT_WINNER_MARGIN':'NO_CONFIDENT_SELECTION';
  const result:StrategySelection=confidence==='none' ?
    {schemaVersion:STRATEGY_SELECTION_SCHEMA_VERSION,status:'ambiguous',questionId:b.questionId,primaryFamilyId:b.primaryFamilyId,
      primaryMethodId:null,supportingMethodIds:[],confidence:'none',confidenceScore:null,winnerMargin:null,candidates,
      issues:[{code:issueCode,detail:'Cannot safely select a method under 4C.1 confidence rules'}],provenance:provenance(b.teachingContractFingerprint)} :
    {schemaVersion:STRATEGY_SELECTION_SCHEMA_VERSION,status:'selected',questionId:b.questionId,primaryFamilyId:b.primaryFamilyId,
      primaryMethodId:winner.methodId,supportingMethodIds:[],confidence,confidenceScore:score,winnerMargin:margin,candidates,
      issues:[],provenance:provenance(b.teachingContractFingerprint)};
  const check=validateStrategySelection(result);
  if (!check.valid) return empty(b,'INVALID_SELECTION_INPUT','Selector output failed validation: '+check.issues.join(','));
  return result;
}
