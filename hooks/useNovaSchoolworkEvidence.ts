"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type NovaSchoolworkSkillEvidence = {
  skill_id: string;
  skill_code: string;
  skill_name: string;
  subject: "english" | "math";
  primary_level: number;
  topic: string;
  event_count: number;
  upload_count: number;
  weighted_evidence: number;
  weighted_correct: number;
  correct_count: number;
  partial_count: number;
  incorrect_count: number;
  last_evidence_at: string | null;
};

export type NovaSchoolworkRecentUpload = {
  upload_id: string;
  original_filename: string;
  assignment_title: string | null;
  subject: "english" | "math";
  primary_level: number;
  reviewed_at: string | null;
  created_at: string;
  included_items: number;
};

export type NovaSchoolworkEvidencePayload = {
  student_user_id: string;
  generated_at: string;
  approved_uploads: number;
  awaiting_review: number;
  archived_uploads: number;
  skills: NovaSchoolworkSkillEvidence[];
  recent_uploads: NovaSchoolworkRecentUpload[];
};

const EMPTY: NovaSchoolworkEvidencePayload = {
  student_user_id: "",
  generated_at: "",
  approved_uploads: 0,
  awaiting_review: 0,
  archived_uploads: 0,
  skills: [],
  recent_uploads: [],
};

export function useNovaSchoolworkEvidence(
  learnerId: string | null | undefined,
) {
  const [data, setData] =
    useState<NovaSchoolworkEvidencePayload>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!learnerId) {
      setData(EMPTY);
      return;
    }

    async function load() {
      setLoading(true);

      const { data: result, error } = await supabase.rpc(
        "get_nova_schoolwork_evidence_summary",
        {
          p_student_user_id: learnerId,
        },
      );

      if (cancelled) return;

      if (!error && result) {
        setData(result as NovaSchoolworkEvidencePayload);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const bySkillId = useMemo(
    () =>
      new Map(
        data.skills.map((item) => [
          String(item.skill_id),
          item,
        ]),
      ),
    [data.skills],
  );

  const bySkillCode = useMemo(
    () =>
      new Map(
        data.skills.map((item) => [
          String(item.skill_code),
          item,
        ]),
      ),
    [data.skills],
  );

  return {
    ...data,
    bySkillId,
    bySkillCode,
    loading,
  };
}
