import { supabase } from "@/lib/supabase";
import type { FinancialSkillKey } from "./financial-learning-engine-types";
import type {
  MiloFinanceEvidenceLevel,
  MiloFinanceSkillEvidenceRecord,
  MiloFinanceSkillSummary,
} from "./financial-skill-evidence-types";

type SkillSummaryRow = {
  skill_key: FinancialSkillKey;
  title: string;
  description: string | null;
  evidence_count: number | string | null;
  evidence_points: number | string | null;
  observed_count: number | string | null;
  applied_count: number | string | null;
  demonstrated_count: number | string | null;
  last_evidence_at: string | null;
};

type SkillEvidenceRow = {
  id: string;
  skill_key: FinancialSkillKey;
  evidence_level: MiloFinanceEvidenceLevel;
  evidence_points: number | string | null;
  source_type: string;
  source_key: string;
  label: string;
  created_at: string;
};

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function getMiloFinanceSkillSummary(): Promise<MiloFinanceSkillSummary[]> {
  const { data, error } = await supabase.rpc("get_milo_finance_skill_summary");
  if (error) throw new Error(messageFrom(error, "Could not load financial skill evidence."));

  return ((data ?? []) as SkillSummaryRow[]).map((row) => ({
    skillKey: row.skill_key,
    title: row.title,
    description: row.description ?? "",
    evidenceCount: Number(row.evidence_count ?? 0),
    evidencePoints: Number(row.evidence_points ?? 0),
    observedCount: Number(row.observed_count ?? 0),
    appliedCount: Number(row.applied_count ?? 0),
    demonstratedCount: Number(row.demonstrated_count ?? 0),
    lastEvidenceAt: row.last_evidence_at ?? null,
  }));
}

export async function listMiloFinanceSkillEvidence(
  limit = 80,
): Promise<MiloFinanceSkillEvidenceRecord[]> {
  const { data, error } = await supabase
    .from("milo_finance_skill_evidence")
    .select("id,skill_key,evidence_level,evidence_points,source_type,source_key,label,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(messageFrom(error, "Could not load financial skill evidence."));

  return ((data ?? []) as SkillEvidenceRow[]).map((row) => ({
    id: row.id,
    skillKey: row.skill_key,
    evidenceLevel: row.evidence_level,
    evidencePoints: Number(row.evidence_points ?? 0),
    sourceType: row.source_type,
    sourceKey: row.source_key,
    label: row.label,
    createdAt: row.created_at,
  }));
}
