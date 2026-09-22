"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildTeachingSignalsByConceptKey,
  normaliseTeachingEvidencePayload,
  type NovaTeachingEvidencePayload,
} from "@/lib/nova-plus/teaching-evidence";

const EMPTY: NovaTeachingEvidencePayload = {
  student_user_id: "",
  generated_at: "",
  window_days: 90,
  subject: null,
  signals: [],
  activity: [],
};

export function useNovaTeachingEvidence(
  learnerId: string | null | undefined,
  days = 90,
) {
  const [data, setData] = useState<NovaTeachingEvidencePayload>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!learnerId) {
      setData(EMPTY);
      setError("");
      setLoading(false);
      return;
    }

    // Capture the narrowed learner id before entering the async closure.
    // TypeScript does not preserve narrowing of a mutable hook parameter
    // across nested async functions.
    const targetLearnerId = learnerId;

    async function load() {
      setLoading(true);
      setError("");

      const { data: raw, error: rpcError } = await supabase.rpc(
        "get_core_teaching_evidence_for_learner",
        {
          p_student_user_id: targetLearnerId,
          p_subject: null,
          p_days: Math.max(7, Math.min(Math.round(days), 365)),
        },
      );

      if (cancelled) return;

      if (rpcError) {
        setData(EMPTY);
        setError(
          rpcError.message.includes("NOVA_PLUS_ACCESS_REQUIRED")
            ? "Teaching evidence is not available for this learner."
            : rpcError.message,
        );
        setLoading(false);
        return;
      }

      setData(normaliseTeachingEvidencePayload(raw, targetLearnerId));
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [days, learnerId]);

  const byConceptKey = useMemo(
    () => buildTeachingSignalsByConceptKey(data.signals),
    [data.signals],
  );

  return {
    ...data,
    byConceptKey,
    loading,
    error,
  };
}
