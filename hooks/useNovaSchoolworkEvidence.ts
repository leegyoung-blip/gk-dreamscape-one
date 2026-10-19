"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type SettledEvidence = {
  learnerId: string | null;
  payload: NovaSchoolworkEvidencePayload;
  error: string;
};

export function useNovaSchoolworkEvidence(
  learnerId: string | null | undefined,
) {
  const currentLearnerId = learnerId || null;

  // Results are tagged with the learner they belong to, so a learner switch
  // hides the previous learner's summary on the very next render.
  const [settled, setSettled] = useState<SettledEvidence>({
    learnerId: null,
    payload: EMPTY,
    error: "",
  });
  const [inFlightFor, setInFlightFor] = useState<string | null>(null);

  // Newest request wins; responses for another learner are discarded.
  const requestIdRef = useRef(0);
  const learnerRef = useRef<string | null>(currentLearnerId);

  const load = useCallback(async (targetLearnerId: string) => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () =>
      requestIdRef.current === requestId &&
      learnerRef.current === targetLearnerId;

    let failed = false;
    let failure = "";

    try {
      const [summaryResult, statusResult] = await Promise.all([
        supabase.rpc(
          "get_nova_schoolwork_evidence_summary",
          {
            p_student_user_id: targetLearnerId,
          },
        ),

        supabase
          .from("nova_schoolwork_uploads")
          .select("status")
          .eq("student_user_id", targetLearnerId),
      ]);

      if (!isCurrent()) return;

      const payload = summaryResult.data as
        | NovaSchoolworkEvidencePayload
        | null;

      // Either query failing is an overall failure: a failed status lookup
      // must not be reported as a verified zero awaiting review.
      if (summaryResult.error || statusResult.error) {
        failed = true;
        failure =
          summaryResult.error?.message ||
          statusResult.error?.message ||
          "";
      } else if (
        !payload ||
        (payload.student_user_id &&
          payload.student_user_id !== targetLearnerId)
      ) {
        failed = true;
      } else {
        const statuses =
          statusResult.data ?? [];

        const actionable = statuses.filter((row) =>
          ["review_ready", "needs_input", "failed"].includes(
            String(row.status),
          ),
        ).length;

        setSettled({
          learnerId: targetLearnerId,
          payload: {
            ...payload,
            awaiting_review: actionable,
          },
          error: "",
        });
      }
    } catch (caught) {
      if (!isCurrent()) return;
      failed = true;
      failure =
        caught instanceof Error ? caught.message : "";
    }

    if (failed) {
      // Keep this learner's last good summary (if any) and report the failure.
      setSettled((current) => ({
        learnerId: targetLearnerId,
        payload:
          current.learnerId === targetLearnerId
            ? current.payload
            : EMPTY,
        error:
          failure ||
          "Schoolwork evidence could not be loaded.",
      }));
    }

    setInFlightFor(null);
  }, []);

  useEffect(() => {
    learnerRef.current = currentLearnerId;

    async function run() {
      if (currentLearnerId) await load(currentLearnerId);
    }

    void run();

    return () => {
      // Invalidate any request still in flight for the previous learner.
      requestIdRef.current += 1;
    };
  }, [currentLearnerId, load]);

  // The first load for a learner reports loading via the learner tag below;
  // an explicit refresh of an already-settled learner is tracked here.
  const refresh = useCallback(async () => {
    const target = learnerRef.current;
    if (!target) return;
    setInFlightFor(target);
    await load(target);
  }, [load]);

  const isSettledForLearner =
    Boolean(currentLearnerId) &&
    settled.learnerId === currentLearnerId;

  const data = isSettledForLearner ? settled.payload : EMPTY;
  const error = isSettledForLearner ? settled.error : "";
  const loading =
    Boolean(currentLearnerId) &&
    (inFlightFor === currentLearnerId || !isSettledForLearner);

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
    error,
    refresh,
  };
}
