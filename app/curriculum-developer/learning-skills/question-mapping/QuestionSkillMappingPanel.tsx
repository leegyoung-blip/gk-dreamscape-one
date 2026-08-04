"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type {
  MappingAuditEntry,
  MappingReviewStatus,
  MappingSkill,
  MappingSubject,
  RuleSuggestion,
  StoredMapping,
} from "./mapping-types";

type EditorRow = {
  skillId: string;
  weight: number;
};

type MappingVersion = {
  version_number: number;
  review_status: MappingReviewStatus;
  mapped_at: string | null;
  reviewed_at: string | null;
  mappings: StoredMapping[];
};

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(value: MappingReviewStatus) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function QuestionSkillMappingPanel({
  questionSource,
  questionId,
  subject,
  primaryLevel,
  questionVersion,
  questionPreview,
  topicTitle,
  canApprove = false,
  onSaved,
}: {
  questionSource:
    | "english_questions"
    | "math_questions"
    | "science_questions";
  questionId: string;
  subject: MappingSubject;
  primaryLevel: number;
  questionVersion?: string | null;
  questionPreview?: string;
  topicTitle?: string;
  canApprove?: boolean;
  onSaved?: () => void | Promise<void>;
}) {
  const [skills, setSkills] = useState<MappingSkill[]>([]);
  const [versions, setVersions] = useState<MappingVersion[]>([]);
  const [audit, setAudit] = useState<MappingAuditEntry[]>([]);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>(
    [],
  );

  const [primarySkillId, setPrimarySkillId] = useState("");
  const [secondaryRows, setSecondaryRows] = useState<EditorRow[]>([
    { skillId: "", weight: 0.5 },
    { skillId: "", weight: 0.25 },
  ]);
  const [reviewStatus, setReviewStatus] =
    useState<MappingReviewStatus>("draft");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligibleSkills = useMemo(
    () =>
      skills
        .filter(
          (skill) =>
            skill.subject === subject &&
            skill.primary_level === primaryLevel &&
            skill.is_active &&
            skill.review_status !== "retired" &&
            !skill.is_topic_level,
        )
        .sort(
          (first, second) =>
            first.domain.localeCompare(second.domain) ||
            first.topic.localeCompare(second.topic) ||
            first.skill_name.localeCompare(second.skill_name),
        ),
    [primaryLevel, skills, subject],
  );

  const selectedSkillIds = useMemo(
    () =>
      new Set(
        [
          primarySkillId,
          ...secondaryRows.map((row) => row.skillId),
        ].filter(Boolean),
      ),
    [primarySkillId, secondaryRows],
  );

  const latestVersion = versions[0] || null;

  const loadEditor = useCallback(async () => {
    if (!questionId) return;

    setLoading(true);
    setError(null);

    const [
      catalogueResult,
      mappingResult,
      auditResult,
    ] = await Promise.all([
      supabase.rpc("curriculum_get_learning_skill_catalogue", {
        p_subject: subject,
        p_primary_level: primaryLevel,
        p_topic: null,
        p_include_inactive: true,
      }),
      supabase.rpc("curriculum_get_question_skill_mapping", {
        p_question_source: questionSource,
        p_question_id: questionId,
      }),
      supabase.rpc("curriculum_get_question_mapping_audit", {
        p_question_source: questionSource,
        p_question_id: questionId,
      }),
    ]);

    const firstError =
      catalogueResult.error ||
      mappingResult.error ||
      auditResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const parsedSkills = asArray<Record<string, unknown>>(
      catalogueResult.data,
    ).map(
      (row): MappingSkill => ({
        id: String(row.id),
        subject: String(row.subject) as MappingSubject,
        primary_level: Number(row.primary_level || 0),
        domain: String(row.domain || ""),
        topic: String(row.topic || ""),
        skill_name: String(row.skill_name || ""),
        skill_code: String(row.skill_code || ""),
        description: row.description
          ? String(row.description)
          : null,
        public_explanation: row.public_explanation
          ? String(row.public_explanation)
          : null,
        internal_mapping_guidance:
          row.internal_mapping_guidance
            ? String(row.internal_mapping_guidance)
            : null,
        parent_skill_id: row.parent_skill_id
          ? String(row.parent_skill_id)
          : null,
        is_topic_level: Boolean(row.is_topic_level),
        is_active: Boolean(row.is_active),
        review_status: String(
          row.review_status || "draft",
        ) as MappingReviewStatus,
        taxonomy_version: Number(row.taxonomy_version || 1),
        mapped_question_count: Number(
          row.mapped_question_count || 0,
        ),
        evidence_count: Number(row.evidence_count || 0),
      }),
    );

    const mappingPayload =
      mappingResult.data &&
      typeof mappingResult.data === "object"
        ? (mappingResult.data as Record<string, unknown>)
        : {};

    const parsedVersions = asArray<Record<string, unknown>>(
      mappingPayload.versions,
    ).map(
      (row): MappingVersion => ({
        version_number: Number(row.version_number || 0),
        review_status: String(
          row.review_status || "draft",
        ) as MappingReviewStatus,
        mapped_at: row.mapped_at
          ? String(row.mapped_at)
          : null,
        reviewed_at: row.reviewed_at
          ? String(row.reviewed_at)
          : null,
        mappings: asArray<Record<string, unknown>>(
          row.mappings,
        ).map(
          (mapping): StoredMapping => ({
            id: mapping.id ? String(mapping.id) : undefined,
            skill_id: String(mapping.skill_id || ""),
            skill_code: String(mapping.skill_code || ""),
            skill_name: String(mapping.skill_name || ""),
            weight: Number(mapping.weight || 0),
            is_primary: Boolean(mapping.is_primary),
            mapping_reason: mapping.mapping_reason
              ? String(mapping.mapping_reason)
              : null,
            suggestion_confidence:
              mapping.suggestion_confidence === null ||
              mapping.suggestion_confidence === undefined
                ? null
                : Number(mapping.suggestion_confidence),
          }),
        ),
      }),
    );

    const parsedAudit = asArray<Record<string, unknown>>(
      auditResult.data,
    ).map(
      (row): MappingAuditEntry => ({
        id: String(row.id),
        mapping_id: row.mapping_id
          ? String(row.mapping_id)
          : null,
        mapping_version:
          row.mapping_version === null ||
          row.mapping_version === undefined
            ? null
            : Number(row.mapping_version),
        action: String(row.action) as MappingAuditEntry["action"],
        changed_by: row.changed_by
          ? String(row.changed_by)
          : null,
        changed_at: String(row.changed_at || ""),
        before_data:
          row.before_data &&
          typeof row.before_data === "object"
            ? (row.before_data as Record<string, unknown>)
            : null,
        after_data:
          row.after_data &&
          typeof row.after_data === "object"
            ? (row.after_data as Record<string, unknown>)
            : null,
      }),
    );

    setSkills(parsedSkills);
    setVersions(parsedVersions);
    setAudit(parsedAudit);

    const current =
      parsedVersions.find(
        (version) => version.review_status !== "retired",
      ) || parsedVersions[0];

    if (current) {
      const primary = current.mappings.find(
        (mapping) => mapping.is_primary,
      );
      const secondary = current.mappings.filter(
        (mapping) => !mapping.is_primary,
      );

      setPrimarySkillId(primary?.skill_id || "");
      setSecondaryRows([
        {
          skillId: secondary[0]?.skill_id || "",
          weight: secondary[0]?.weight || 0.5,
        },
        {
          skillId: secondary[1]?.skill_id || "",
          weight: secondary[1]?.weight || 0.25,
        },
      ]);
      setReviewStatus(
        current.review_status === "retired"
          ? "draft"
          : current.review_status === "approved" &&
              !canApprove
            ? "reviewed"
            : current.review_status,
      );
      setReason(
        current.mappings.find(
          (mapping) => mapping.mapping_reason,
        )?.mapping_reason || "",
      );
    } else {
      setPrimarySkillId("");
      setSecondaryRows([
        { skillId: "", weight: 0.5 },
        { skillId: "", weight: 0.25 },
      ]);
      setReviewStatus("draft");
      setReason("");
    }

    setLoading(false);
  }, [
    primaryLevel,
    questionId,
    questionSource,
    subject,
  ]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  function updateSecondary(
    index: number,
    patch: Partial<EditorRow>,
  ) {
    setSecondaryRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  async function suggestMappings() {
    setSuggesting(true);
    setError(null);
    setMessage(null);

    const { data, error: suggestionError } = await supabase.rpc(
      "curriculum_suggest_question_skill_mapping",
      {
        p_question_source: questionSource,
        p_question_id: questionId,
      },
    );

    if (suggestionError) {
      setError(suggestionError.message);
      setSuggesting(false);
      return;
    }

    const parsed = asArray<Record<string, unknown>>(data).map(
      (row): RuleSuggestion => ({
        skill_id: String(row.skill_id),
        skill_code: String(row.skill_code || ""),
        skill_name: String(row.skill_name || ""),
        domain: String(row.domain || ""),
        topic: String(row.topic || ""),
        public_explanation: row.public_explanation
          ? String(row.public_explanation)
          : null,
        suggestion_score: Number(row.suggestion_score || 0),
        reason: String(row.reason || ""),
      }),
    );

    setSuggestions(parsed);
    setSuggesting(false);

    if (parsed.length === 0) {
      setMessage(
        "No reliable rule-based suggestion was found. Choose a skill manually.",
      );
    }
  }

  function applySuggestion(suggestion: RuleSuggestion) {
    setPrimarySkillId(suggestion.skill_id);
    setReviewStatus("draft");
    setReason(
      `Rule suggestion: ${suggestion.reason} (${suggestion.suggestion_score})`,
    );
    setMessage(
      "Suggestion applied as a draft. Review it before saving.",
    );
  }

  async function saveMapping(
    overrideStatus?: MappingReviewStatus,
  ) {
    setError(null);
    setMessage(null);

    if (!primarySkillId) {
      setError("Choose one primary skill.");
      return;
    }

    const duplicateIds = [
      primarySkillId,
      ...secondaryRows
        .map((row) => row.skillId)
        .filter(Boolean),
    ];

    if (new Set(duplicateIds).size !== duplicateIds.length) {
      setError("The same skill cannot be selected twice.");
      return;
    }

    const nextStatus = overrideStatus || reviewStatus;

    const selectedSkills = eligibleSkills.filter((skill) =>
      selectedSkillIds.has(skill.id),
    );

    if (
      nextStatus === "approved" &&
      selectedSkills.some(
        (skill) => skill.review_status !== "approved",
      )
    ) {
      setError(
        "Approve the selected learning skills in the Skill Catalogue before approving this mapping.",
      );
      return;
    }

    const mappings = [
      {
        skill_id: primarySkillId,
        weight: 1,
        is_primary: true,
      },
      ...secondaryRows
        .filter((row) => row.skillId)
        .map((row) => ({
          skill_id: row.skillId,
          weight: row.weight,
          is_primary: false,
        })),
    ];

    setSaving(true);

    const { error: saveError } = await supabase.rpc(
      "curriculum_save_question_skill_mapping",
      {
        p_question_source: questionSource,
        p_question_id: questionId,
        p_mappings: mappings,
        p_review_status: nextStatus,
        p_question_version: questionVersion || null,
        p_mapping_reason: reason.trim() || null,
      },
    );

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setReviewStatus(nextStatus);
    setMessage(
      nextStatus === "approved"
        ? "Question mapping approved."
        : "Question mapping saved.",
    );

    await loadEditor();
    await onSaved?.();
  }

  if (loading) {
    return <div style={messageCard}>Loading question mapping...</div>;
  }

  return (
    <section style={panel}>
      <div style={panelHeader}>
        <div>
          <p style={eyebrow}>QUESTION-LEVEL SKILLS</p>
          <h3 style={title}>
            {topicTitle || "Question mapping"}
          </h3>
          {questionPreview && (
            <p style={questionText}>{questionPreview}</p>
          )}
          <p style={questionMeta}>
            {subject} · Primary {primaryLevel} ·{" "}
            {questionId.slice(0, 8)}
          </p>
        </div>

        <span style={statusPill}>
          {latestVersion
            ? `${statusLabel(
                latestVersion.review_status,
              )} · v${latestVersion.version_number}`
            : "Unmapped"}
        </span>
      </div>

      {error && <div style={errorBanner}>{error}</div>}
      {message && <div style={successBanner}>{message}</div>}

      {eligibleSkills.length === 0 ? (
        <div style={warningBanner}>
          No active granular skills exist for this subject and
          level. Create and approve the skills in the Skill
          Catalogue first.
        </div>
      ) : (
        <>
          <div className="qsm-grid" style={editorGrid}>
            <label style={fieldLabel}>
              Primary skill
              <select
                value={primarySkillId}
                onChange={(event) =>
                  setPrimarySkillId(event.target.value)
                }
                style={input}
              >
                <option value="">Choose primary skill</option>
                {eligibleSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.skill_code} · {skill.skill_name}
                    {skill.review_status !== "approved"
                      ? ` · ${statusLabel(skill.review_status)}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldLabel}>
              Mapping status
              <select
                value={reviewStatus}
                onChange={(event) =>
                  setReviewStatus(
                    event.target.value as MappingReviewStatus,
                  )
                }
                style={input}
              >
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
                {canApprove && (
                  <option value="approved">Approved</option>
                )}
              </select>
            </label>

            {secondaryRows.map((row, index) => (
              <div
                key={index}
                className="qsm-secondary-row"
                style={secondaryRow}
              >
                <label style={{ ...fieldLabel, flex: 1 }}>
                  Secondary skill {index + 1}
                  <select
                    value={row.skillId}
                    onChange={(event) =>
                      updateSecondary(index, {
                        skillId: event.target.value,
                      })
                    }
                    style={input}
                  >
                    <option value="">None</option>
                    {eligibleSkills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.skill_code} · {skill.skill_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ ...fieldLabel, width: 130 }}>
                  Weight
                  <select
                    value={row.weight}
                    disabled={!row.skillId}
                    onChange={(event) =>
                      updateSecondary(index, {
                        weight: Number(event.target.value),
                      })
                    }
                    style={input}
                  >
                    <option value={0.5}>0.50</option>
                    <option value={0.25}>0.25</option>
                  </select>
                </label>
              </div>
            ))}

            <label
              className="qsm-full"
              style={fieldLabel}
            >
              Mapping reason
              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                rows={3}
                placeholder="Explain why this question tests the selected skill."
                style={textarea}
              />
            </label>
          </div>

          <div style={actionRow}>
            <button
              type="button"
              onClick={() => void suggestMappings()}
              disabled={suggesting || saving}
              style={secondaryButton}
            >
              {suggesting
                ? "Checking..."
                : "Suggest from Rules"}
            </button>

            <button
              type="button"
              onClick={() => void saveMapping()}
              disabled={saving}
              style={secondaryButton}
            >
              {saving ? "Saving..." : "Save Mapping"}
            </button>

            {canApprove && (
              <button
                type="button"
                onClick={() => void saveMapping("approved")}
                disabled={saving}
                style={primaryButton}
              >
                {saving ? "Saving..." : "Save & Approve"}
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <section style={suggestionSection}>
              <p style={eyebrow}>RULE-BASED SUGGESTIONS</p>
              <p style={helperText}>
                These are deterministic suggestions, not approved
                mappings. Review the question before applying one.
              </p>

              <div style={suggestionList}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.skill_id}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    style={suggestionButton}
                  >
                    <span>
                      <strong>
                        {suggestion.skill_code}
                      </strong>
                      <small>
                        {suggestion.skill_name} ·{" "}
                        {suggestion.reason}
                      </small>
                    </span>
                    <b>{suggestion.suggestion_score}</b>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {versions.length > 0 && (
        <details style={historyDetails}>
          <summary>
            Mapping versions ({versions.length})
          </summary>
          <div style={versionList}>
            {versions.map((version) => (
              <article
                key={version.version_number}
                style={versionCard}
              >
                <strong>
                  Version {version.version_number} ·{" "}
                  {statusLabel(version.review_status)}
                </strong>
                <span>
                  Saved {formatDate(version.mapped_at)}
                </span>
                <p>
                  {version.mappings
                    .map(
                      (mapping) =>
                        `${mapping.is_primary ? "Primary" : "Secondary"}: ${mapping.skill_code} (${mapping.weight})`,
                    )
                    .join(" · ")}
                </p>
              </article>
            ))}
          </div>
        </details>
      )}

      {audit.length > 0 && (
        <details style={historyDetails}>
          <summary>
            Audit history ({audit.length})
          </summary>
          <div style={versionList}>
            {audit.slice(0, 20).map((entry) => (
              <article key={entry.id} style={auditCard}>
                <strong>
                  {entry.action} · version{" "}
                  {entry.mapping_version || "—"}
                </strong>
                <span>{formatDate(entry.changed_at)}</span>
              </article>
            ))}
          </div>
        </details>
      )}

      <style jsx global>{`
        .qsm-full {
          grid-column: 1 / -1;
        }

        @media (max-width: 760px) {
          .qsm-grid {
            grid-template-columns: 1fr !important;
          }

          .qsm-full {
            grid-column: auto;
          }

          .qsm-secondary-row {
            flex-direction: column;
          }

          .qsm-secondary-row > label {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}

const panel: CSSProperties = {
  padding: 20,
  borderRadius: 20,
  border: "1px solid rgba(126,232,255,0.16)",
  background:
    "linear-gradient(145deg,rgba(13,31,59,0.96),rgba(6,17,38,0.98))",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const panelHeader: CSSProperties = {
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: 16,
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#8dfcff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.16em",
};

const title: CSSProperties = {
  margin: "7px 0 0",
  fontSize: 23,
};

const questionText: CSSProperties = {
  maxWidth: 800,
  margin: "11px 0 0",
  color: "rgba(255,255,255,0.82)",
  fontSize: 15,
  lineHeight: 1.55,
};

const questionMeta: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(235,247,255,0.44)",
  fontSize: 11,
};

const statusPill: CSSProperties = {
  flex: "0 0 auto",
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(83,215,255,0.09)",
  color: "#b9f5ff",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
};

const editorGrid: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: 13,
};

const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 7,
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 800,
};

const input: CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 11,
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(2,8,19,0.74)",
  color: "white",
  padding: "9px 11px",
  outline: "none",
};

const textarea: CSSProperties = {
  ...input,
  minHeight: 84,
  resize: "vertical",
  lineHeight: 1.5,
};

const secondaryRow: CSSProperties = {
  display: "flex",
  alignItems: "end",
  gap: 10,
};

const actionRow: CSSProperties = {
  marginTop: 16,
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 9,
};

const secondaryButton: CSSProperties = {
  minHeight: 42,
  borderRadius: 11,
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 14px",
  cursor: "pointer",
  fontWeight: 800,
};

const primaryButton: CSSProperties = {
  ...secondaryButton,
  borderColor: "rgba(52,211,153,0.34)",
  background: "rgba(16,185,129,0.12)",
  color: "#a7f3d0",
};

const messageCard: CSSProperties = {
  padding: 18,
  borderRadius: 15,
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.62)",
  textAlign: "center",
};

const errorBanner: CSSProperties = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(248,113,113,0.34)",
  background: "rgba(239,68,68,0.1)",
  color: "#fecaca",
  fontSize: 13,
};

const successBanner: CSSProperties = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(52,211,153,0.3)",
  background: "rgba(16,185,129,0.1)",
  color: "#a7f3d0",
  fontSize: 13,
};

const warningBanner: CSSProperties = {
  marginTop: 16,
  padding: "14px",
  borderRadius: 13,
  border: "1px solid rgba(250,204,21,0.28)",
  background: "rgba(234,179,8,0.08)",
  color: "#fde68a",
  fontSize: 13,
  lineHeight: 1.5,
};

const suggestionSection: CSSProperties = {
  marginTop: 18,
  paddingTop: 17,
  borderTop: "1px solid rgba(126,232,255,0.1)",
};

const helperText: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(235,247,255,0.48)",
  fontSize: 12,
  lineHeight: 1.5,
};

const suggestionList: CSSProperties = {
  marginTop: 11,
  display: "grid",
  gap: 8,
};

const suggestionButton: CSSProperties = {
  minHeight: 58,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  borderRadius: 12,
  border: "1px solid rgba(126,232,255,0.12)",
  background: "rgba(255,255,255,0.035)",
  color: "white",
  padding: "10px 12px",
  textAlign: "left",
  cursor: "pointer",
};

const historyDetails: CSSProperties = {
  marginTop: 16,
  padding: "12px 14px",
  borderRadius: 13,
  border: "1px solid rgba(126,232,255,0.1)",
  color: "rgba(255,255,255,0.68)",
  fontSize: 12,
};

const versionList: CSSProperties = {
  marginTop: 11,
  display: "grid",
  gap: 8,
};

const versionCard: CSSProperties = {
  padding: 11,
  borderRadius: 11,
  background: "rgba(255,255,255,0.03)",
  lineHeight: 1.5,
};

const auditCard: CSSProperties = {
  ...versionCard,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};
