import type {
  BatchUnderstandingSummary,
  TeachingQuestionUnderstanding,
} from "../understanding";

export type QaSampleItem = {
  question_id?: string;
  question_code?: string;
  primary_level?: number;
  topic_id?: string | null;
  topic_title?: string | null;
  quiz_id?: string | null;
  quiz_code?: string | null;
  quiz_title?: string | null;
  sample_stratum?: string | null;
  skill_mappings?: unknown;
  skillMappings?: unknown;
  question?: Record<string, unknown>;
};

export type QaProposalResult = {
  client_id?: string;
  status?: string;
  proposal?: Record<string, unknown> | null;
  error?: unknown;
};

export type MathIntelligenceQaExportLike = {
  run_id?: string | null;
  exported_at?: string | null;
  sample?: {
    seed?: string | null;
    actual_size?: number | null;
    items?: QaSampleItem[];
  } | null;
  results?: QaProposalResult[] | null;
};

export type Phase4A2QaItem = {
  index: number;
  questionId: string | null;
  questionCode: string | null;
  primaryLevel: number | null;
  topicTitle: string | null;
  sampleStratum: string | null;

  existingProposal: {
    status: string | null;
    domain: string | null;
    problemStructure: string | null;
    targetLabel: string | null;
    confidence: number | null;
    strategy: string | null;
  };

  understanding: TeachingQuestionUnderstanding;
};

export type Phase4A2QaRun = {
  schemaVersion: "4A-2-QA.3";
  sourceRunId: string | null;
  sourceSeed: string | null;
  generatedAt: string;

  totalSampleItems: number;
  processed: number;

  summary: BatchUnderstandingSummary;
  items: Phase4A2QaItem[];
};

export type Phase4A2CompactExport = {
  schema_version: "4A-2-QA.3";
  generated_at: string;
  source_run_id: string | null;
  source_seed: string | null;

  summary: BatchUnderstandingSummary;

  results: Array<{
    question_id: string | null;
    question_code: string | null;
    primary_level: number | null;
    topic_title: string | null;
    sample_stratum: string | null;

    existing_math_intelligence: Phase4A2QaItem["existingProposal"];

    phase_4a2: Omit<TeachingQuestionUnderstanding, "source">;
  }>;
};
