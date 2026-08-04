"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurriculumDeveloperAccess } from "@/hooks/useCurriculumDeveloperAccess";

type Subject = "english" | "math" | "science";
type ReviewStatus = "draft" | "reviewed" | "approved" | "retired";
type WorkspaceTab = "catalogue" | "coverage";

type LearningSkill = {
  id: string;
  subject: Subject;
  primary_level: number;
  domain: string;
  topic: string;
  skill_name: string;
  skill_code: string;
  description: string | null;
  public_explanation: string | null;
  internal_mapping_guidance: string | null;
  parent_skill_id: string | null;
  is_topic_level: boolean;
  is_active: boolean;
  review_status: ReviewStatus;
  taxonomy_version: number;
  mapped_question_count: number;
  evidence_count: number;
};

type CoverageRow = {
  subject: Subject;
  primary_level: number;
  topic_ref: string;
  topic_title: string;
  published_questions: number;
  approved_mapped_questions: number;
  pending_mapped_questions: number;
  unmapped_questions: number;
  approved_coverage_percentage: number | null;
};

type SkillForm = {
  id: string | null;
  subject: Subject;
  primaryLevel: number;
  domain: string;
  topic: string;
  skillName: string;
  skillCode: string;
  description: string;
  publicExplanation: string;
  internalGuidance: string;
  parentSkillId: string;
  reviewStatus: ReviewStatus;
  isActive: boolean;
};

const SUBJECTS: Array<{
  value: Subject;
  label: string;
  prefix: string;
}> = [
  { value: "english", label: "English", prefix: "ENG" },
  { value: "math", label: "Mathematics", prefix: "MATH" },
  { value: "science", label: "Science", prefix: "SCI" },
];

const LEVELS = [1, 2, 3, 4, 5, 6];

const EMPTY_FORM: SkillForm = {
  id: null,
  subject: "english",
  primaryLevel: 3,
  domain: "",
  topic: "",
  skillName: "",
  skillCode: "",
  description: "",
  publicExplanation: "",
  internalGuidance: "",
  parentSkillId: "",
  reviewStatus: "draft",
  isActive: true,
};

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function subjectLabel(subject: Subject) {
  return (
    SUBJECTS.find((item) => item.value === subject)?.label ||
    subject
  );
}

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

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function acronym(value: string, fallback: string) {
  const words = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\\s-]/g, " ")
    .split(/[\\s-]+/)
    .filter(Boolean);

  if (words.length === 0) return fallback;

  if (words.length === 1) {
    return words[0].slice(0, 10);
  }

  return words
    .slice(0, 4)
    .map((word) => word.slice(0, 3))
    .join("-");
}

function generateSkillCode(form: SkillForm) {
  const prefix =
    SUBJECTS.find((item) => item.value === form.subject)?.prefix ||
    "SKILL";

  const domainPart = acronym(form.domain, "DOMAIN");
  const topicPart = acronym(form.topic, "TOPIC");
  const skillPart = acronym(form.skillName, "SKILL");

  const segments = [
    prefix,
    `P${form.primaryLevel}`,
    domainPart,
    topicPart,
    skillPart,
  ].filter(
    (segment, index, items) =>
      segment && (index === 0 || segment !== items[index - 1]),
  );

  return segments.join("-").replace(/-+/g, "-");
}

function statusLabel(status: ReviewStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "reviewed":
      return "Reviewed";
    case "retired":
      return "Retired";
    default:
      return "Draft";
  }
}

export default function LearningSkillsClient() {
  const router = useRouter();
  const {
    status,
    role,
    error: accessError,
  } = useCurriculumDeveloperAccess();

  const normalisedRole = normaliseRole(role);
  const isAdmin = normalisedRole === "admin";
  const isEditor = ["admin", "curriculum_lead"].includes(
    normalisedRole,
  );

  const [tab, setTab] = useState<WorkspaceTab>("catalogue");
  const [skills, setSkills] = useState<LearningSkill[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState<"all" | Subject>(
    "all",
  );
  const [levelFilter, setLevelFilter] = useState<"all" | number>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | ReviewStatus
  >("all");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SkillForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (status !== "allowed" || !isEditor) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const subject =
      subjectFilter === "all" ? null : subjectFilter;
    const primaryLevel =
      levelFilter === "all" ? null : levelFilter;

    const [skillsResult, coverageResult] = await Promise.all([
      supabase.rpc("curriculum_get_learning_skill_catalogue", {
        p_subject: subject,
        p_primary_level: primaryLevel,
        p_topic: null,
        p_include_inactive: true,
      }),
      supabase.rpc("curriculum_get_question_mapping_coverage", {
        p_subject: subject,
        p_primary_level: primaryLevel,
      }),
    ]);

    const firstError =
      skillsResult.error || coverageResult.error;

    if (firstError) {
      setLoadError(
        `${firstError.message}. Confirm that Phase 2B.1 was installed and that this account has the admin role.`,
      );
      setSkills([]);
      setCoverage([]);
      setLoading(false);
      return;
    }

    const parsedSkills = asArray<Record<string, unknown>>(
      skillsResult.data,
    ).map(
      (row): LearningSkill => ({
        id: String(row.id),
        subject: String(row.subject) as Subject,
        primary_level: numberValue(row.primary_level),
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
        ) as ReviewStatus,
        taxonomy_version: numberValue(row.taxonomy_version),
        mapped_question_count: numberValue(
          row.mapped_question_count,
        ),
        evidence_count: numberValue(row.evidence_count),
      }),
    );

    const parsedCoverage = asArray<Record<string, unknown>>(
      coverageResult.data,
    ).map(
      (row): CoverageRow => ({
        subject: String(row.subject) as Subject,
        primary_level: numberValue(row.primary_level),
        topic_ref: String(row.topic_ref || ""),
        topic_title: String(row.topic_title || ""),
        published_questions: numberValue(
          row.published_questions,
        ),
        approved_mapped_questions: numberValue(
          row.approved_mapped_questions,
        ),
        pending_mapped_questions: numberValue(
          row.pending_mapped_questions,
        ),
        unmapped_questions: numberValue(row.unmapped_questions),
        approved_coverage_percentage:
          row.approved_coverage_percentage === null ||
          row.approved_coverage_percentage === undefined
            ? null
            : numberValue(row.approved_coverage_percentage),
      }),
    );

    setSkills(parsedSkills);
    setCoverage(parsedCoverage);
    setLoading(false);
  }, [
    isEditor,
    levelFilter,
    status,
    subjectFilter,
  ]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return skills
      .filter((skill) => {
        if (
          statusFilter !== "all" &&
          skill.review_status !== statusFilter
        ) {
          return false;
        }

        if (!query) return true;

        return [
          skill.skill_code,
          skill.skill_name,
          skill.domain,
          skill.topic,
          skill.description,
          skill.public_explanation,
          skill.internal_mapping_guidance,
          subjectLabel(skill.subject),
          `p${skill.primary_level}`,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort(
        (first, second) =>
          first.subject.localeCompare(second.subject) ||
          first.primary_level - second.primary_level ||
          first.domain.localeCompare(second.domain) ||
          first.topic.localeCompare(second.topic) ||
          first.skill_name.localeCompare(second.skill_name),
      );
  }, [search, skills, statusFilter]);

  const parentOptions = useMemo(
    () =>
      skills
        .filter(
          (skill) =>
            skill.subject === form.subject &&
            skill.primary_level === form.primaryLevel &&
            skill.id !== form.id &&
            skill.review_status !== "retired" &&
            skill.is_active,
        )
        .sort(
          (first, second) =>
            first.domain.localeCompare(second.domain) ||
            first.topic.localeCompare(second.topic) ||
            first.skill_name.localeCompare(second.skill_name),
        ),
    [form.id, form.primaryLevel, form.subject, skills],
  );

  const catalogueStats = useMemo(() => {
    const activeSkills = skills.filter(
      (skill) =>
        skill.is_active && skill.review_status !== "retired",
    );

    return {
      total: activeSkills.length,
      approved: activeSkills.filter(
        (skill) => skill.review_status === "approved",
      ).length,
      pending: activeSkills.filter((skill) =>
        ["draft", "reviewed"].includes(skill.review_status),
      ).length,
      mappedQuestions: activeSkills.reduce(
        (sum, skill) => sum + skill.mapped_question_count,
        0,
      ),
      evidence: activeSkills.reduce(
        (sum, skill) => sum + skill.evidence_count,
        0,
      ),
    };
  }, [skills]);

  const coverageStats = useMemo(() => {
    const published = coverage.reduce(
      (sum, row) => sum + row.published_questions,
      0,
    );
    const approved = coverage.reduce(
      (sum, row) => sum + row.approved_mapped_questions,
      0,
    );
    const pending = coverage.reduce(
      (sum, row) => sum + row.pending_mapped_questions,
      0,
    );
    const unmapped = coverage.reduce(
      (sum, row) => sum + row.unmapped_questions,
      0,
    );

    return {
      published,
      approved,
      pending,
      unmapped,
      percentage:
        published > 0
          ? Math.round((approved / published) * 10000) / 100
          : 0,
    };
  }, [coverage]);

  function openNewSkill() {
    const initialSubject =
      subjectFilter === "all" ? "english" : subjectFilter;
    const initialLevel =
      levelFilter === "all" ? 3 : levelFilter;

    setForm({
      ...EMPTY_FORM,
      subject: initialSubject,
      primaryLevel: initialLevel,
    });
    setActionError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEditSkill(skill: LearningSkill) {
    setForm({
      id: skill.id,
      subject: skill.subject,
      primaryLevel: skill.primary_level,
      domain: skill.domain,
      topic: skill.topic,
      skillName: skill.skill_name,
      skillCode: skill.skill_code,
      description: skill.description || "",
      publicExplanation: skill.public_explanation || "",
      internalGuidance:
        skill.internal_mapping_guidance || "",
      parentSkillId: skill.parent_skill_id || "",
      reviewStatus: skill.review_status,
      isActive: skill.is_active,
    });
    setActionError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function updateForm<K extends keyof SkillForm>(
    key: K,
    value: SkillForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSkill(
    override?: Partial<Pick<SkillForm, "reviewStatus" | "isActive">>,
  ) {
    setActionError(null);
    setMessage(null);

    const nextForm = { ...form, ...override };

    if (
      !isAdmin &&
      ["approved", "retired"].includes(nextForm.reviewStatus)
    ) {
      nextForm.reviewStatus = "reviewed";
      nextForm.isActive = true;
    }

    if (!nextForm.domain.trim()) {
      setActionError("Enter the curriculum domain.");
      return;
    }

    if (!nextForm.topic.trim()) {
      setActionError("Enter the topic or skill group.");
      return;
    }

    if (nextForm.skillName.trim().length < 3) {
      setActionError("Enter a clear skill name.");
      return;
    }

    if (!nextForm.skillCode.trim()) {
      setActionError("Enter or generate a stable skill code.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "curriculum_save_learning_skill",
      {
        p_skill_id: nextForm.id,
        p_subject: nextForm.subject,
        p_primary_level: nextForm.primaryLevel,
        p_domain: nextForm.domain.trim(),
        p_topic: nextForm.topic.trim(),
        p_skill_name: nextForm.skillName.trim(),
        p_skill_code: nextForm.skillCode
          .trim()
          .toUpperCase(),
        p_description:
          nextForm.description.trim() || null,
        p_public_explanation:
          nextForm.publicExplanation.trim() || null,
        p_internal_mapping_guidance:
          nextForm.internalGuidance.trim() || null,
        p_parent_skill_id:
          nextForm.parentSkillId || null,
        p_review_status: nextForm.reviewStatus,
        p_is_active: nextForm.isActive,
      },
    );

    if (error) {
      setActionError(error.message);
      setSaving(false);
      return;
    }

    setFormOpen(false);
    setMessage(
      nextForm.reviewStatus === "approved"
        ? "Skill approved and saved."
        : nextForm.reviewStatus === "retired"
          ? "Skill retired."
          : "Skill saved.",
    );
    setSaving(false);
    await loadWorkspace();
  }

  async function retireSkill(skill: LearningSkill) {
    if (
      !window.confirm(
        `Retire ${skill.skill_code}? It will remain in history but cannot be used for new mappings.`,
      )
    ) {
      return;
    }

    setForm({
      id: skill.id,
      subject: skill.subject,
      primaryLevel: skill.primary_level,
      domain: skill.domain,
      topic: skill.topic,
      skillName: skill.skill_name,
      skillCode: skill.skill_code,
      description: skill.description || "",
      publicExplanation: skill.public_explanation || "",
      internalGuidance:
        skill.internal_mapping_guidance || "",
      parentSkillId: skill.parent_skill_id || "",
      reviewStatus: "retired",
      isActive: false,
    });

    setSaving(true);
    setActionError(null);
    setMessage(null);

    const { error } = await supabase.rpc(
      "curriculum_save_learning_skill",
      {
        p_skill_id: skill.id,
        p_subject: skill.subject,
        p_primary_level: skill.primary_level,
        p_domain: skill.domain,
        p_topic: skill.topic,
        p_skill_name: skill.skill_name,
        p_skill_code: skill.skill_code,
        p_description: skill.description,
        p_public_explanation: skill.public_explanation,
        p_internal_mapping_guidance:
          skill.internal_mapping_guidance,
        p_parent_skill_id: skill.parent_skill_id,
        p_review_status: "retired",
        p_is_active: false,
      },
    );

    setSaving(false);

    if (error) {
      setActionError(error.message);
      return;
    }

    setMessage("Skill retired.");
    await loadWorkspace();
  }

  if (status === "checking") {
    return (
      <PageMessage text="Checking Learning Skills access..." />
    );
  }

  if (status === "locked" || !role) {
    return (
      <LockedPage
        title="Access Restricted"
        message="This page requires Curriculum Developer access."
        error={accessError}
        onBack={() => router.push("/curriculum-developer")}
      />
    );
  }

  if (!isEditor) {
    return (
      <LockedPage
        title="Access Restricted"
        message="The Learning Skills workspace requires an Admin or Curriculum Lead role."
        onBack={() => router.push("/curriculum-developer")}
      />
    );
  }

  return (
    <main id="learning-skills-root" style={pageShell}>
      <header className="ls-header" style={header}>
        <button
          type="button"
          onClick={() => router.push("/curriculum-developer")}
          style={backButton}
        >
          ← Curriculum Developer
        </button>

        <div style={headerTitle}>
          <p style={brandEyebrow}>NOVA LEARNING PROFILE</p>
          <p style={headerSubtitle}>Learning Skills</p>
        </div>

        <div style={adminPill}>
          {isAdmin ? "Admin" : "Curriculum Lead"}
        </div>
      </header>

      <section style={workspace}>
        <div className="ls-heading-row" style={headingRow}>
          <div>
            <p style={eyebrow}>PHASE 2B.2</p>
            <h1 style={pageTitle}>Skill Catalogue</h1>
            <p className="ls-page-description" style={pageDescription}>
              Define the exact English, Mathematics and Science
              skills that Nova will use to understand question-level
              strengths and weaknesses.
            </p>
          </div>

          <div className="ls-heading-actions" style={headingActions}>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/curriculum-developer/learning-skills/question-mapping",
                )
              }
              style={secondaryButton}
            >
              Map Questions
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/curriculum-developer/learning-skills/rollout",
                )
              }
              style={secondaryButton}
            >
              Rollout & QA
            </button>

            <button
              type="button"
              onClick={openNewSkill}
              style={primaryButton}
            >
              + New Skill
            </button>
          </div>
        </div>

        <div className="ls-tabs" style={tabRow}>
          <button
            type="button"
            onClick={() => setTab("catalogue")}
            style={{
              ...tabButton,
              ...(tab === "catalogue" ? activeTabButton : {}),
            }}
          >
            Skill Catalogue
          </button>
          <button
            type="button"
            onClick={() => setTab("coverage")}
            style={{
              ...tabButton,
              ...(tab === "coverage" ? activeTabButton : {}),
            }}
          >
            Mapping Coverage
          </button>
        </div>

        <section className="ls-filter-grid" style={filterPanel}>
          <label style={fieldLabel}>
            Subject
            <select
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(
                  event.target.value as "all" | Subject,
                )
              }
              style={selectInput}
            >
              <option value="all">All subjects</option>
              {SUBJECTS.map((subject) => (
                <option
                  key={subject.value}
                  value={subject.value}
                >
                  {subject.label}
                </option>
              ))}
            </select>
          </label>

          <label style={fieldLabel}>
            Primary level
            <select
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(
                  event.target.value === "all"
                    ? "all"
                    : Number(event.target.value),
                )
              }
              style={selectInput}
            >
              <option value="all">All levels</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  Primary {level}
                </option>
              ))}
            </select>
          </label>

          {tab === "catalogue" && (
            <label style={fieldLabel}>
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "all"
                      | ReviewStatus,
                  )
                }
                style={selectInput}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="retired">Retired</option>
              </select>
            </label>
          )}

          {tab === "catalogue" && (
            <label style={fieldLabel}>
              Search
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Skill code, name or topic"
                style={textInput}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => void loadWorkspace()}
            disabled={loading}
            style={{
              ...secondaryButton,
              alignSelf: "end",
              opacity: loading ? 0.55 : 1,
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {message && <div style={successBanner}>{message}</div>}
        {actionError && (
          <div style={errorBanner}>{actionError}</div>
        )}
        {loadError && <div style={errorBanner}>{loadError}</div>}

        {loading ? (
          <PageMessage
            text="Loading skill catalogue and mapping coverage..."
            embedded
          />
        ) : tab === "catalogue" ? (
          <>
            <div className="ls-stat-grid" style={statGrid}>
              <StatCard
                label="Active skills"
                value={catalogueStats.total}
                description="Current topic and granular skills"
              />
              <StatCard
                label="Approved"
                value={catalogueStats.approved}
                description="Ready for approved mappings"
              />
              <StatCard
                label="Awaiting review"
                value={catalogueStats.pending}
                description="Draft or reviewed skills"
              />
              <StatCard
                label="Mapped questions"
                value={catalogueStats.mappedQuestions}
                description="Approved question connections"
              />
              <StatCard
                label="Evidence records"
                value={catalogueStats.evidence}
                description="Question evidence collected later"
              />
            </div>

            <section style={panel}>
              <div style={panelHeading}>
                <div>
                  <p style={smallEyebrow}>SKILL DEFINITIONS</p>
                  <h2 style={sectionTitle}>
                    {filteredSkills.length} skill
                    {filteredSkills.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <p style={mutedText}>
                  Topic overviews are preserved. Granular skills
                  describe one clear action a learner can demonstrate.
                </p>
              </div>

              {filteredSkills.length === 0 ? (
                <div style={emptyState}>
                  No skills match the current filters. Create the
                  first skill or load the draft Primary 3 English
                  seed.
                </div>
              ) : (
                <div className="ls-skill-list" style={skillList}>
                  {filteredSkills.map((skill) => (
                    <article
                      key={skill.id}
                      className="ls-skill-card"
                      style={skillCard}
                    >
                      <div style={skillMain}>
                        <div style={skillTopLine}>
                          <StatusPill
                            status={skill.review_status}
                          />
                          {skill.is_topic_level && (
                            <span style={topicBadge}>
                              Topic overview
                            </span>
                          )}
                          {!skill.is_active && (
                            <span style={inactiveBadge}>
                              Inactive
                            </span>
                          )}
                        </div>

                        <p style={skillCode}>
                          {skill.skill_code}
                        </p>
                        <h3 style={skillTitle}>
                          {skill.skill_name}
                        </h3>
                        <p style={skillPath}>
                          {subjectLabel(skill.subject)} · Primary{" "}
                          {skill.primary_level} · {skill.domain} ·{" "}
                          {skill.topic}
                        </p>

                        {skill.public_explanation && (
                          <p style={publicExplanation}>
                            {skill.public_explanation}
                          </p>
                        )}

                        {skill.internal_mapping_guidance && (
                          <details style={guidanceDetails}>
                            <summary>
                              Internal mapping guidance
                            </summary>
                            <p>
                              {skill.internal_mapping_guidance}
                            </p>
                          </details>
                        )}
                      </div>

                      <div style={skillSide}>
                        <div style={metricPair}>
                          <span>Mapped questions</span>
                          <strong>
                            {skill.mapped_question_count}
                          </strong>
                        </div>
                        <div style={metricPair}>
                          <span>Evidence records</span>
                          <strong>{skill.evidence_count}</strong>
                        </div>
                        <div style={metricPair}>
                          <span>Version</span>
                          <strong>
                            {skill.taxonomy_version}
                          </strong>
                        </div>

                        <div style={skillActions}>
                          {(isAdmin ||
                            skill.review_status !== "approved") && (
                            <button
                              type="button"
                              onClick={() => openEditSkill(skill)}
                              style={smallButton}
                            >
                              Edit
                            </button>
                          )}

                          {isAdmin &&
                            skill.review_status !== "approved" &&
                            skill.review_status !== "retired" && (
                              <button
                                type="button"
                                onClick={() => {
                                  openEditSkill(skill);
                                  setForm((current) => ({
                                    ...current,
                                    reviewStatus: "approved",
                                  }));
                                }}
                                style={approveButton}
                              >
                                Review & Approve
                              </button>
                            )}

                          {isAdmin &&
                            skill.review_status !== "retired" && (
                            <button
                              type="button"
                              onClick={() =>
                                void retireSkill(skill)
                              }
                              disabled={saving}
                              style={retireButton}
                            >
                              Retire
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="ls-stat-grid" style={statGrid}>
              <StatCard
                label="Published questions"
                value={coverageStats.published}
                description="Questions currently included"
              />
              <StatCard
                label="Approved mappings"
                value={coverageStats.approved}
                description="Ready for granular evidence"
              />
              <StatCard
                label="Pending mappings"
                value={coverageStats.pending}
                description="Draft or reviewed mapping sets"
              />
              <StatCard
                label="Unmapped"
                value={coverageStats.unmapped}
                description="Still using broad topic analysis"
              />
              <StatCard
                label="Coverage"
                value={`${coverageStats.percentage}%`}
                description="Approved mapping coverage"
              />
            </div>

            <section style={panel}>
              <div style={panelHeading}>
                <div>
                  <p style={smallEyebrow}>QUESTION COVERAGE</p>
                  <h2 style={sectionTitle}>
                    Topic-by-topic progress
                  </h2>
                </div>
                <p style={mutedText}>
                  Granular findings should remain hidden until a
                  topic has enough approved question mappings.
                </p>
              </div>

              {coverage.length === 0 ? (
                <div style={emptyState}>
                  No coverage rows were returned. Confirm the
                  Phase 2B.1 question catalogue and coverage view.
                </div>
              ) : (
                <div style={coverageList}>
                  {coverage
                    .slice()
                    .sort(
                      (first, second) =>
                        first.subject.localeCompare(
                          second.subject,
                        ) ||
                        first.primary_level -
                          second.primary_level ||
                        first.topic_title.localeCompare(
                          second.topic_title,
                        ),
                    )
                    .map((row) => {
                      const percentage =
                        row.approved_coverage_percentage || 0;
                      const ready = percentage >= 70;

                      return (
                        <article
                          key={`${row.subject}:${row.primary_level}:${row.topic_ref}`}
                          className="ls-coverage-card"
                          style={coverageCard}
                        >
                          <div style={coverageHeading}>
                            <div>
                              <p style={coverageMeta}>
                                {subjectLabel(row.subject)} ·
                                Primary {row.primary_level}
                              </p>
                              <h3 style={coverageTitle}>
                                {row.topic_title}
                              </h3>
                            </div>

                            <span
                              style={{
                                ...coverageStatus,
                                ...(ready
                                  ? coverageReady
                                  : coverageBuilding),
                              }}
                            >
                              {ready
                                ? "Ready for granular display"
                                : "Still building coverage"}
                            </span>
                          </div>

                          <div style={progressTrack}>
                            <div
                              style={{
                                ...progressFill,
                                width: `${Math.min(
                                  100,
                                  Math.max(0, percentage),
                                )}%`,
                              }}
                            />
                          </div>

                          <div style={coverageMetrics}>
                            <div>
                              <span>Coverage</span>
                              <strong>{percentage}%</strong>
                            </div>
                            <div>
                              <span>Published</span>
                              <strong>
                                {row.published_questions}
                              </strong>
                            </div>
                            <div>
                              <span>Approved</span>
                              <strong>
                                {row.approved_mapped_questions}
                              </strong>
                            </div>
                            <div>
                              <span>Pending</span>
                              <strong>
                                {row.pending_mapped_questions}
                              </strong>
                            </div>
                            <div>
                              <span>Unmapped</span>
                              <strong>
                                {row.unmapped_questions}
                              </strong>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
              )}
            </section>
          </>
        )}
      </section>

      {formOpen && (
        <div
          role="presentation"
          style={modalBackdrop}
          onMouseDown={() => {
            if (!saving) setFormOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              form.id ? "Edit learning skill" : "Create learning skill"
            }
            style={modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={modalHeader}>
              <div>
                <p style={smallEyebrow}>
                  {form.id ? "EDIT SKILL" : "NEW SKILL"}
                </p>
                <h2 style={modalTitle}>
                  {form.id
                    ? form.skillName || "Edit Skill"
                    : "Create a Granular Skill"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                style={closeButton}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="ls-form-grid" style={formGrid}>
              <label style={fieldLabel}>
                Subject
                <select
                  value={form.subject}
                  onChange={(event) =>
                    updateForm(
                      "subject",
                      event.target.value as Subject,
                    )
                  }
                  disabled={Boolean(form.id)}
                  style={selectInput}
                >
                  {SUBJECTS.map((subject) => (
                    <option
                      key={subject.value}
                      value={subject.value}
                    >
                      {subject.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Primary level
                <select
                  value={form.primaryLevel}
                  onChange={(event) =>
                    updateForm(
                      "primaryLevel",
                      Number(event.target.value),
                    )
                  }
                  disabled={Boolean(form.id)}
                  style={selectInput}
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      Primary {level}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Domain
                <input
                  value={form.domain}
                  onChange={(event) =>
                    updateForm("domain", event.target.value)
                  }
                  placeholder="Example: Grammar"
                  style={textInput}
                />
              </label>

              <label style={fieldLabel}>
                Topic or skill group
                <input
                  value={form.topic}
                  onChange={(event) =>
                    updateForm("topic", event.target.value)
                  }
                  placeholder="Example: Subject–Verb Agreement"
                  style={textInput}
                />
              </label>

              <label
                className="ls-full-field"
                style={fieldLabel}
              >
                Skill name
                <input
                  value={form.skillName}
                  onChange={(event) =>
                    updateForm("skillName", event.target.value)
                  }
                  placeholder="One observable skill"
                  style={textInput}
                />
              </label>

              <label
                className="ls-full-field"
                style={fieldLabel}
              >
                Stable skill code
                <div style={codeInputRow}>
                  <input
                    value={form.skillCode}
                    onChange={(event) =>
                      updateForm(
                        "skillCode",
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="ENG-P3-GRAMMAR-SVA-PLURAL"
                    disabled={Boolean(form.id)}
                    style={{ ...textInput, flex: 1 }}
                  />
                  {!form.id && (
                    <button
                      type="button"
                      onClick={() =>
                        updateForm(
                          "skillCode",
                          generateSkillCode(form),
                        )
                      }
                      style={secondaryButton}
                    >
                      Generate
                    </button>
                  )}
                </div>
              </label>

              <label
                className="ls-full-field"
                style={fieldLabel}
              >
                Internal description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Formal definition of the learning outcome"
                  style={textareaInput}
                />
              </label>

              <label
                className="ls-full-field"
                style={fieldLabel}
              >
                Parent-friendly explanation
                <textarea
                  value={form.publicExplanation}
                  onChange={(event) =>
                    updateForm(
                      "publicExplanation",
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Simple wording shown in Nova’s Learning Profile"
                  style={textareaInput}
                />
              </label>

              <label
                className="ls-full-field"
                style={fieldLabel}
              >
                Internal mapping guidance
                <textarea
                  value={form.internalGuidance}
                  onChange={(event) =>
                    updateForm(
                      "internalGuidance",
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Explain when a question should and should not be mapped to this skill"
                  style={textareaInput}
                />
              </label>

              <label style={fieldLabel}>
                Parent skill
                <select
                  value={form.parentSkillId}
                  onChange={(event) =>
                    updateForm(
                      "parentSkillId",
                      event.target.value,
                    )
                  }
                  style={selectInput}
                >
                  <option value="">No parent skill</option>
                  {parentOptions.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.skill_code} · {skill.skill_name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldLabel}>
                Review status
                <select
                  value={form.reviewStatus}
                  onChange={(event) =>
                    updateForm(
                      "reviewStatus",
                      event.target.value as ReviewStatus,
                    )
                  }
                  style={selectInput}
                >
                  <option value="draft">Draft</option>
                  <option value="reviewed">Reviewed</option>
                  {isAdmin && (
                    <option value="approved">Approved</option>
                  )}
                  {isAdmin && (
                    <option value="retired">Retired</option>
                  )}
                </select>
              </label>

              <label style={checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateForm(
                      "isActive",
                      event.target.checked,
                    )
                  }
                />
                Active and available for mapping
              </label>
            </div>

            {actionError && (
              <div style={errorBanner}>{actionError}</div>
            )}

            <div style={modalFooter}>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                style={secondaryButton}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveSkill()}
                disabled={saving}
                style={{
                  ...primaryButton,
                  opacity: saving ? 0.55 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : form.reviewStatus === "approved"
                    ? "Save & Approve"
                    : "Save Skill"}
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        #learning-skills-root {
          background:
            radial-gradient(
              circle at 85% -10%,
              rgba(83, 215, 255, 0.1),
              transparent 30%
            ),
            #071226;
        }

        #learning-skills-root *,
        #learning-skills-root *::before,
        #learning-skills-root *::after {
          box-sizing: border-box;
        }

        #learning-skills-root button,
        #learning-skills-root input,
        #learning-skills-root select,
        #learning-skills-root textarea {
          font-family: inherit;
        }

        @media (max-width: 980px) {
          .ls-heading-row {
            align-items: flex-start !important;
          }

          .ls-stat-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .ls-skill-card {
            grid-template-columns: 1fr !important;
          }

          .ls-coverage-card {
            padding: 18px !important;
          }
        }

        @media (max-width: 760px) {
          .ls-header {
            grid-template-columns: 1fr auto !important;
          }

          .ls-header > div:nth-child(2) {
            display: none;
          }

          .ls-heading-row {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .ls-heading-actions {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .ls-heading-actions > button {
            width: 100%;
          }

          .ls-tabs {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .ls-filter-grid {
            grid-template-columns: 1fr !important;
          }

          .ls-stat-grid {
            grid-template-columns: 1fr !important;
          }

          .ls-form-grid {
            grid-template-columns: 1fr !important;
          }

          .ls-full-field {
            grid-column: auto !important;
          }

          .ls-page-description {
            font-size: 15px !important;
          }
        }
      `}</style>
    </main>
  );
}

function StatusPill({
  status,
}: {
  status: ReviewStatus;
}) {
  const styleByStatus: Record<ReviewStatus, CSSProperties> = {
    draft: {
      color: "#dbeafe",
      borderColor: "rgba(147,197,253,0.3)",
      background: "rgba(59,130,246,0.1)",
    },
    reviewed: {
      color: "#fde68a",
      borderColor: "rgba(250,204,21,0.3)",
      background: "rgba(234,179,8,0.1)",
    },
    approved: {
      color: "#a7f3d0",
      borderColor: "rgba(52,211,153,0.32)",
      background: "rgba(16,185,129,0.1)",
    },
    retired: {
      color: "#cbd5e1",
      borderColor: "rgba(148,163,184,0.26)",
      background: "rgba(100,116,139,0.1)",
    },
  };

  return (
    <span style={{ ...statusPill, ...styleByStatus[status] }}>
      {statusLabel(status)}
    </span>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <article style={statCard}>
      <span style={statLabel}>{label}</span>
      <strong style={statValue}>{value}</strong>
      <p style={statDescription}>{description}</p>
    </article>
  );
}

function PageMessage({
  text,
  embedded = false,
}: {
  text: string;
  embedded?: boolean;
}) {
  const card = <div style={messageCard}>{text}</div>;
  if (embedded) return card;

  return <main style={pageShell}>{card}</main>;
}

function LockedPage({
  title,
  message,
  error,
  onBack,
}: {
  title: string;
  message: string;
  error?: string | null;
  onBack: () => void;
}) {
  return (
    <main style={pageShell}>
      <section style={lockedCard}>
        <p style={brandEyebrow}>LEARNING SKILLS</p>
        <h1 style={{ margin: "8px 0 0" }}>{title}</h1>
        <p style={pageDescription}>{message}</p>
        {error && <div style={errorBanner}>{error}</div>}
        <button
          type="button"
          onClick={onBack}
          style={primaryButton}
        >
          Return to Curriculum Developer
        </button>
      </section>
    </main>
  );
}

const pageShell: CSSProperties = {
  minHeight: "100dvh",
  color: "white",
  fontFamily: "Arial, Helvetica, sans-serif",
  background: "#071226",
  fontSize: "16px",
};

const header: CSSProperties = {
  minHeight: "72px",
  padding: "10px 18px",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: "12px",
  position: "sticky",
  top: 0,
  zIndex: 50,
  borderBottom: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(10,23,48,0.97)",
  backdropFilter: "blur(18px)",
};

const backButton: CSSProperties = {
  justifySelf: "start",
  minHeight: "46px",
  borderRadius: "999px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  padding: "0 17px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 800,
};

const headerTitle: CSSProperties = {
  textAlign: "center",
};

const brandEyebrow: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const headerSubtitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "18px",
  fontWeight: 900,
};

const adminPill: CSSProperties = {
  justifySelf: "end",
  borderRadius: "999px",
  border: "1px solid rgba(255,215,106,0.32)",
  background: "rgba(255,215,106,0.09)",
  color: "#ffe6a8",
  padding: "9px 14px",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const workspace: CSSProperties = {
  width: "min(1500px, 100%)",
  margin: "0 auto",
  padding: "34px clamp(18px, 3vw, 44px) 70px",
};

const headingRow: CSSProperties = {
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: "24px",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#8dfcff",
  fontSize: "11px",
  letterSpacing: "0.18em",
  fontWeight: 900,
};

const pageTitle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(34px, 4vw, 54px)",
  lineHeight: 1,
  letterSpacing: "-0.045em",
};

const pageDescription: CSSProperties = {
  maxWidth: "820px",
  margin: "12px 0 0",
  color: "rgba(235,247,255,0.62)",
  fontSize: "17px",
  lineHeight: 1.6,
};

const headingActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButton: CSSProperties = {
  minHeight: "46px",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.38)",
  background:
    "linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.28))",
  color: "white",
  padding: "0 18px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 900,
};

const secondaryButton: CSSProperties = {
  minHeight: "44px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 15px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 800,
};

const tabRow: CSSProperties = {
  marginTop: "28px",
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,220px))",
  gap: "9px",
};

const tabButton: CSSProperties = {
  minHeight: "48px",
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.64)",
  cursor: "pointer",
  fontWeight: 900,
};

const activeTabButton: CSSProperties = {
  borderColor: "rgba(126,232,255,0.5)",
  background: "rgba(83,215,255,0.13)",
  color: "white",
  boxShadow: "0 0 24px rgba(83,215,255,0.11)",
};

const filterPanel: CSSProperties = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.13)",
  background: "rgba(10,23,48,0.66)",
  display: "grid",
  gridTemplateColumns:
    "repeat(4,minmax(150px,1fr)) auto",
  gap: "12px",
  alignItems: "end",
};

const fieldLabel: CSSProperties = {
  display: "grid",
  gap: "7px",
  color: "rgba(255,255,255,0.73)",
  fontSize: "13px",
  fontWeight: 800,
};

const textInput: CSSProperties = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(2,8,19,0.72)",
  color: "white",
  padding: "9px 12px",
  outline: "none",
  fontSize: "14px",
};

const selectInput: CSSProperties = {
  ...textInput,
  cursor: "pointer",
};

const textareaInput: CSSProperties = {
  ...textInput,
  minHeight: "92px",
  resize: "vertical",
  lineHeight: 1.55,
};

const statGrid: CSSProperties = {
  marginTop: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(5,minmax(0,1fr))",
  gap: "12px",
};

const statCard: CSSProperties = {
  minHeight: "138px",
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.12)",
  background:
    "linear-gradient(145deg,rgba(17,37,68,0.8),rgba(8,20,43,0.82))",
};

const statLabel: CSSProperties = {
  color: "rgba(235,247,255,0.5)",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
};

const statValue: CSSProperties = {
  display: "block",
  marginTop: "10px",
  color: "#8dfcff",
  fontSize: "30px",
  letterSpacing: "-0.04em",
};

const statDescription: CSSProperties = {
  margin: "8px 0 0",
  color: "rgba(235,247,255,0.48)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const panel: CSSProperties = {
  marginTop: "18px",
  padding: "22px",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.13)",
  background: "rgba(10,23,48,0.7)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.24)",
};

const panelHeading: CSSProperties = {
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: "20px",
  paddingBottom: "18px",
  borderBottom: "1px solid rgba(126,232,255,0.1)",
};

const smallEyebrow: CSSProperties = {
  margin: 0,
  color: "#8dfcff",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.16em",
};

const sectionTitle: CSSProperties = {
  margin: "7px 0 0",
  fontSize: "27px",
  letterSpacing: "-0.03em",
};

const mutedText: CSSProperties = {
  maxWidth: "620px",
  margin: 0,
  color: "rgba(235,247,255,0.52)",
  fontSize: "14px",
  lineHeight: 1.55,
};

const skillList: CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gap: "12px",
};

const skillCard: CSSProperties = {
  padding: "18px",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) 310px",
  gap: "20px",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.1)",
  background: "rgba(255,255,255,0.026)",
};

const skillMain: CSSProperties = {
  minWidth: 0,
};

const skillTopLine: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
};

const statusPill: CSSProperties = {
  padding: "6px 9px",
  borderRadius: "999px",
  border: "1px solid",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.11em",
  textTransform: "uppercase",
};

const topicBadge: CSSProperties = {
  ...statusPill,
  borderColor: "rgba(216,180,254,0.26)",
  background: "rgba(192,132,252,0.08)",
  color: "#e9d5ff",
};

const inactiveBadge: CSSProperties = {
  ...statusPill,
  borderColor: "rgba(248,113,113,0.26)",
  background: "rgba(239,68,68,0.08)",
  color: "#fecaca",
};

const skillCode: CSSProperties = {
  margin: "13px 0 0",
  color: "#8dfcff",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const skillTitle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "22px",
  letterSpacing: "-0.025em",
};

const skillPath: CSSProperties = {
  margin: "7px 0 0",
  color: "rgba(235,247,255,0.48)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const publicExplanation: CSSProperties = {
  margin: "12px 0 0",
  color: "rgba(255,255,255,0.78)",
  fontSize: "14px",
  lineHeight: 1.55,
};

const guidanceDetails: CSSProperties = {
  marginTop: "12px",
  color: "rgba(235,247,255,0.56)",
  fontSize: "12px",
  lineHeight: 1.55,
};

const skillSide: CSSProperties = {
  paddingLeft: "18px",
  borderLeft: "1px solid rgba(126,232,255,0.1)",
  display: "grid",
  alignContent: "start",
  gap: "8px",
};

const metricPair: CSSProperties = {
  minHeight: "44px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "8px 11px",
  borderRadius: "11px",
  background: "rgba(255,255,255,0.025)",
  color: "rgba(235,247,255,0.5)",
  fontSize: "12px",
};

const skillActions: CSSProperties = {
  marginTop: "6px",
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const smallButton: CSSProperties = {
  ...secondaryButton,
  minHeight: "38px",
  fontSize: "12px",
};

const approveButton: CSSProperties = {
  ...smallButton,
  borderColor: "rgba(52,211,153,0.32)",
  background: "rgba(16,185,129,0.1)",
  color: "#a7f3d0",
};

const retireButton: CSSProperties = {
  ...smallButton,
  borderColor: "rgba(248,113,113,0.3)",
  background: "rgba(239,68,68,0.08)",
  color: "#fecaca",
};

const coverageList: CSSProperties = {
  marginTop: "16px",
  display: "grid",
  gap: "12px",
};

const coverageCard: CSSProperties = {
  padding: "20px",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.1)",
  background: "rgba(255,255,255,0.026)",
};

const coverageHeading: CSSProperties = {
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: "14px",
};

const coverageMeta: CSSProperties = {
  margin: 0,
  color: "#8dfcff",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const coverageTitle: CSSProperties = {
  margin: "6px 0 0",
  fontSize: "20px",
};

const coverageStatus: CSSProperties = {
  padding: "7px 10px",
  borderRadius: "999px",
  border: "1px solid",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const coverageReady: CSSProperties = {
  borderColor: "rgba(52,211,153,0.3)",
  background: "rgba(16,185,129,0.1)",
  color: "#a7f3d0",
};

const coverageBuilding: CSSProperties = {
  borderColor: "rgba(250,204,21,0.28)",
  background: "rgba(234,179,8,0.08)",
  color: "#fde68a",
};

const progressTrack: CSSProperties = {
  height: "9px",
  marginTop: "16px",
  overflow: "hidden",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.07)",
};

const progressFill: CSSProperties = {
  height: "100%",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg,#22d3ee,#34d399)",
};

const coverageMetrics: CSSProperties = {
  marginTop: "14px",
  display: "grid",
  gridTemplateColumns: "repeat(5,minmax(0,1fr))",
  gap: "8px",
};

const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  padding: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,3,12,0.78)",
  backdropFilter: "blur(10px)",
};

const modal: CSSProperties = {
  width: "min(920px, calc(100vw - 28px))",
  maxHeight: "calc(100dvh - 28px)",
  overflowY: "auto",
  borderRadius: "24px",
  border: "1px solid rgba(126,232,255,0.25)",
  background:
    "linear-gradient(145deg,#0b1d3a,#061126 75%)",
  boxShadow: "0 38px 100px rgba(0,0,0,0.58)",
  padding: "22px",
};

const modalHeader: CSSProperties = {
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  gap: "18px",
};

const modalTitle: CSSProperties = {
  margin: "7px 0 0",
  fontSize: "28px",
};

const closeButton: CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
  fontSize: "20px",
};

const formGrid: CSSProperties = {
  marginTop: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "14px",
};

const codeInputRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
};

const checkboxLabel: CSSProperties = {
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "13px",
  fontWeight: 800,
};

const modalFooter: CSSProperties = {
  marginTop: "20px",
  paddingTop: "18px",
  borderTop: "1px solid rgba(126,232,255,0.1)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};

const successBanner: CSSProperties = {
  marginTop: "16px",
  padding: "13px 15px",
  borderRadius: "13px",
  border: "1px solid rgba(52,211,153,0.3)",
  background: "rgba(16,185,129,0.1)",
  color: "#a7f3d0",
  fontSize: "14px",
};

const errorBanner: CSSProperties = {
  marginTop: "16px",
  padding: "13px 15px",
  borderRadius: "13px",
  border: "1px solid rgba(248,113,113,0.35)",
  background: "rgba(239,68,68,0.1)",
  color: "#fecaca",
  fontSize: "14px",
  lineHeight: 1.5,
};

const emptyState: CSSProperties = {
  marginTop: "16px",
  padding: "30px 18px",
  borderRadius: "16px",
  border: "1px dashed rgba(126,232,255,0.18)",
  background: "rgba(255,255,255,0.02)",
  color: "rgba(235,247,255,0.54)",
  textAlign: "center",
  lineHeight: 1.6,
};

const messageCard: CSSProperties = {
  width: "min(720px, calc(100% - 32px))",
  margin: "80px auto",
  padding: "24px",
  borderRadius: "20px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(10,23,48,0.8)",
  color: "rgba(255,255,255,0.72)",
  textAlign: "center",
};

const lockedCard: CSSProperties = {
  width: "min(620px, calc(100% - 32px))",
  margin: "80px auto",
  padding: "28px",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(10,23,48,0.84)",
};
