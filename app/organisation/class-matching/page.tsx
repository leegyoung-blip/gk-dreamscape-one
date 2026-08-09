"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ClassMatchingReadiness,
  PrepareClassMatchingAnalyticsRow,
  StudentClassMatch,
  StudentClassMatchHistoryRow,
} from "@/lib/class-matching";
import { supabase } from "@/lib/supabase";

type OrganisationRow = {
  organisation_id: string;
  organisation_name: string;
  organisation_slug: string;
  organisation_type: string;
  organisation_status: string;
  organisation_role: string;
};

type MemberRow = {
  membership_id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  membership_role: string;
  membership_status: string;
  joined_at: string;
};

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function studentLabel(student: MemberRow | null) {
  if (!student) return "Student";

  return (
    student.username ||
    student.email ||
    `Student ${student.user_id.slice(0, 8)}`
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function weekdayLabel(value: number | null) {
  const labels = [
    "",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return value ? labels[value] || "Day not set" : "Day not set";
}

function PageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020813] p-6 text-white">
      Loading class matching...
    </main>
  );
}

export default function ClassMatchingPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ClassMatchingContent />
    </Suspense>
  );
}

function ClassMatchingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedOrganisationId =
    searchParams.get("organisationId");

  const [organisations, setOrganisations] = useState<
    OrganisationRow[]
  >([]);

  const [selectedOrganisationId, setSelectedOrganisationId] =
    useState("");

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [studentUserId, setStudentUserId] = useState("");

  const [subject, setSubject] = useState<
    "english" | "math"
  >("english");

  const [primaryLevel, setPrimaryLevel] = useState("5");

  const [readiness, setReadiness] =
    useState<ClassMatchingReadiness | null>(null);

  const [match, setMatch] =
    useState<StudentClassMatch | null>(null);

  const [history, setHistory] = useState<
    StudentClassMatchHistoryRow[]
  >([]);

  const [preparationRows, setPreparationRows] = useState<
    PrepareClassMatchingAnalyticsRow[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedOrganisation = useMemo(
    () =>
      organisations.find(
        (organisation) =>
          organisation.organisation_id ===
          selectedOrganisationId,
      ) || null,
    [organisations, selectedOrganisationId],
  );

  const studentRows = useMemo(
    () =>
      members
        .filter(
          (member) =>
            member.membership_role === "student" &&
            member.membership_status === "active",
        )
        .sort((a, b) =>
          studentLabel(a).localeCompare(studentLabel(b)),
        ),
    [members],
  );

  const selectedStudent = useMemo(
    () =>
      studentRows.find(
        (student) => student.user_id === studentUserId,
      ) || null,
    [studentRows, studentUserId],
  );

  useEffect(() => {
    void initialise();
  }, []);

  useEffect(() => {
    if (!selectedOrganisationId) return;

    setStudentUserId("");
    setReadiness(null);
    setMatch(null);
    setHistory([]);
    setPreparationRows([]);

    void loadMembers(selectedOrganisationId);
  }, [selectedOrganisationId]);

  useEffect(() => {
    setReadiness(null);
    setMatch(null);
    setPreparationRows([]);

    if (!studentUserId || !selectedOrganisationId) {
      setHistory([]);
      return;
    }

    void Promise.all([
      checkReadiness(),
      loadHistory(),
    ]);
  }, [
    studentUserId,
    subject,
    primaryLevel,
    selectedOrganisationId,
  ]);

  async function initialise() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_my_manageable_organisations",
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "Organisation access could not be loaded.",
      );
      setLoading(false);
      return;
    }

    const rows = (data || []) as OrganisationRow[];

    setOrganisations(rows);

    const nextOrganisationId =
      requestedOrganisationId &&
      rows.some(
        (row) =>
          row.organisation_id === requestedOrganisationId,
      )
        ? requestedOrganisationId
        : rows[0]?.organisation_id || "";

    setSelectedOrganisationId(nextOrganisationId);
    setLoading(false);
  }

  async function loadMembers(organisationId: string) {
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_organisation_members",
      {
        p_organisation_id: organisationId,
      },
    );

    if (error) {
      setMembers([]);
      setErrorMessage(
        error.message ||
          "Organisation roster could not be loaded.",
      );
      return;
    }

    setMembers((data || []) as MemberRow[]);
  }

  async function checkReadiness() {
    if (!studentUserId || !selectedOrganisationId) return;

    setChecking(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_student_class_matching_readiness",
      {
        p_organisation_id: selectedOrganisationId,
        p_student_user_id: studentUserId,
        p_subject: subject,
        p_primary_level: Number(primaryLevel),
      },
    );

    setChecking(false);

    if (error) {
      setReadiness(null);
      setErrorMessage(
        error.message ||
          "Class matching readiness could not be checked.",
      );
      return;
    }

    setReadiness(
      (data || null) as ClassMatchingReadiness | null,
    );
  }

  async function loadHistory() {
    if (!studentUserId || !selectedOrganisationId) return;

    const { data, error } = await supabase.rpc(
      "get_student_class_match_history",
      {
        p_organisation_id: selectedOrganisationId,
        p_student_user_id: studentUserId,
        p_limit: 20,
      },
    );

    if (error) {
      console.warn(
        "Class matching history error:",
        error.message,
      );
      setHistory([]);
      return;
    }

    setHistory(
      (data || []) as StudentClassMatchHistoryRow[],
    );
  }

  async function prepareCandidateAnalytics() {
    if (!studentUserId || !selectedOrganisationId) return;

    setPreparing(true);
    setMessage("");
    setErrorMessage("");
    setPreparationRows([]);
    setMatch(null);

    const { data, error } = await supabase.rpc(
      "prepare_student_class_matching_analytics",
      {
        p_organisation_id: selectedOrganisationId,
        p_student_user_id: studentUserId,
        p_subject: subject,
        p_primary_level: Number(primaryLevel),
      },
    );

    setPreparing(false);

    if (error) {
      setErrorMessage(
        error.message ||
          "Candidate Class Analytics could not be prepared.",
      );
      return;
    }

    const rows =
      (data || []) as PrepareClassMatchingAnalyticsRow[];

    setPreparationRows(rows);

    const successful = rows.filter(
      (row) => !row.error_message,
    ).length;

    setMessage(
      `${successful} of ${rows.length} eligible class analytics refreshes completed. Readiness has been rechecked.`,
    );

    await checkReadiness();
  }

  async function generateMatch() {
    if (
      !studentUserId ||
      !selectedOrganisationId ||
      !readiness?.ready_to_match
    ) {
      return;
    }

    setGenerating(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "generate_student_class_match",
      {
        p_organisation_id: selectedOrganisationId,
        p_student_user_id: studentUserId,
        p_subject: subject,
        p_primary_level: Number(primaryLevel),
      },
    );

    setGenerating(false);

    if (error) {
      setErrorMessage(
        error.message ||
          "The class matching safeguard blocked generation.",
      );
      return;
    }

    await openMatch(String(data || ""));
    await loadHistory();

    setMessage(
      readiness.match_mode ===
        "single_eligible_assessment"
        ? "Fit assessment generated for the only eligible class. This was not a competitive ranking."
        : "Class comparison generated. This remains decision support only; no student has been enrolled.",
    );
  }

  async function openMatch(runId: string) {
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_student_class_match",
      {
        p_matching_run_id: runId,
      },
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "The class matching result could not be opened.",
      );
      return;
    }

    setMatch(
      (data || null) as StudentClassMatch | null,
    );
  }

  if (loading) {
    return <PageFallback />;
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020813] px-4 py-7 text-white sm:px-7">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,232,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_36%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1450px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                selectedOrganisationId
                  ? `/organisation/manage?organisationId=${selectedOrganisationId}`
                  : "/organisation/manage",
              )
            }
            className="rounded-full border border-cyan-200/20 bg-white/[0.06] px-5 py-3 text-sm"
          >
            ← Organisation Portal
          </button>

          <button
            type="button"
            onClick={() => router.push("/teacher-dashboard")}
            className="rounded-full border border-violet-200/20 bg-violet-300/[0.07] px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-violet-100"
          >
            Teacher Dashboard
          </button>
        </div>

        <header className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8dfcff]">
            Dreamscape Class Placement
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.055em] sm:text-7xl">
            Class Matching
          </h1>

          <p className="mt-5 max-w-4xl text-base leading-7 text-white/58">
            Compare one unassigned learner with eligible
            English or Math classes using the learner&apos;s
            real Nova profile and current Class Analytics.
            This is decision support only. Dreamscape does
            not automatically enrol the learner.
          </p>
        </header>

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-200/18 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-200/18 bg-red-400/10 px-5 py-4 text-sm text-red-100">
            {errorMessage}
          </div>
        )}

        <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.26)] sm:p-7">
          <div className="grid gap-4 lg:grid-cols-4">
            {organisations.length > 1 && (
              <label className="grid gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/38">
                  Organisation
                </span>

                <select
                  value={selectedOrganisationId}
                  onChange={(event) =>
                    setSelectedOrganisationId(
                      event.target.value,
                    )
                  }
                  className="min-h-12 rounded-2xl border border-white/12 bg-[#07152d] px-4 text-sm text-white outline-none"
                >
                  {organisations.map((organisation) => (
                    <option
                      key={organisation.organisation_id}
                      value={organisation.organisation_id}
                    >
                      {organisation.organisation_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="grid gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/38">
                Student
              </span>

              <select
                value={studentUserId}
                onChange={(event) =>
                  setStudentUserId(event.target.value)
                }
                className="min-h-12 rounded-2xl border border-white/12 bg-[#07152d] px-4 text-sm text-white outline-none"
              >
                <option value="">
                  Select unassigned student
                </option>

                {studentRows.map((student) => (
                  <option
                    key={student.user_id}
                    value={student.user_id}
                  >
                    {studentLabel(student)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/38">
                Subject
              </span>

              <select
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target.value as
                      | "english"
                      | "math",
                  )
                }
                className="min-h-12 rounded-2xl border border-white/12 bg-[#07152d] px-4 text-sm text-white outline-none"
              >
                <option value="english">English</option>
                <option value="math">Math</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/38">
                Primary Level
              </span>

              <select
                value={primaryLevel}
                onChange={(event) =>
                  setPrimaryLevel(event.target.value)
                }
                className="min-h-12 rounded-2xl border border-white/12 bg-[#07152d] px-4 text-sm text-white outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <option key={level} value={level}>
                    Primary {level}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {!selectedStudent ? (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
            <strong className="text-xl">
              Select a student to begin
            </strong>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/45">
              Phase 3D v1 is intentionally limited to
              unassigned organisation students with real
              Nova evidence.
            </p>
          </section>
        ) : (
          <div className="mt-5 grid gap-5">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
                    Matching safeguards
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {studentLabel(selectedStudent)}
                  </h2>

                  <p className="mt-2 text-sm text-white/45">
                    {titleCase(subject)} · Primary{" "}
                    {primaryLevel}
                  </p>
                </div>

                <StatusPill
                  label={
                    checking
                      ? "Checking..."
                      : readiness?.ready_to_match
                        ? "Ready to Match"
                        : "Blocked"
                  }
                  tone={
                    readiness?.ready_to_match
                      ? "good"
                      : "warning"
                  }
                />
              </div>

              {readiness && (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Metric
                      label="Nova age"
                      value={
                        readiness.student.nova_age_days ===
                        null
                          ? "—"
                          : `${readiness.student.nova_age_days}d`
                      }
                    />

                    <Metric
                      label="Confidence"
                      value={titleCase(
                        readiness.student
                          .nova_confidence_label,
                      )}
                    />

                    <Metric
                      label="Questions"
                      value={String(
                        readiness.student
                          .evidence_question_count,
                      )}
                    />

                    <Metric
                      label="Eligible classes"
                      value={String(
                        readiness.classes
                          .eligible_class_count,
                      )}
                    />

                    <Metric
                      label="Scoreable classes"
                      value={String(
                        readiness.classes
                          .scoreable_class_count,
                      )}
                    />
                  </div>

                  {readiness.blockers.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-amber-200/16 bg-amber-300/[0.05] p-4">
                      <strong className="text-sm text-amber-100">
                        Matching is blocked
                      </strong>

                      <ul className="mt-3 grid gap-2 pl-5 text-xs leading-5 text-amber-50/70">
                        {readiness.blockers.map(
                          (blocker) => (
                            <li key={blocker}>{blocker}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3">
                    {readiness.classes.candidates.map(
                      (candidate) => (
                        <div
                          key={candidate.class_id}
                          className="rounded-2xl border border-white/9 bg-black/10 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <strong className="text-sm">
                                {candidate.class_name}
                              </strong>

                              <p className="mt-1 text-[10px] text-white/40">
                                {weekdayLabel(
                                  candidate.day_of_week,
                                )}
                                {candidate.start_time
                                  ? ` · ${candidate.start_time}`
                                  : ""}
                              </p>
                            </div>

                            <StatusPill
                              label={
                                candidate.scoreable
                                  ? "Analytics Ready"
                                  : "Analytics Not Ready"
                              }
                              tone={
                                candidate.scoreable
                                  ? "good"
                                  : "warning"
                              }
                            />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/44">
                            <span>
                              Students:{" "}
                              {
                                candidate.current_student_count
                              }
                              {candidate.capacity !== null
                                ? ` / ${candidate.capacity}`
                                : ""}
                            </span>

                            <span>
                              Nova coverage:{" "}
                              {candidate.class_nova_coverage_pct ===
                              null
                                ? "—"
                                : `${Math.round(
                                    candidate.class_nova_coverage_pct,
                                  )}%`}
                            </span>

                            <span>
                              Report age:{" "}
                              {candidate.class_analytics_age_days ===
                              null
                                ? "—"
                                : `${candidate.class_analytics_age_days}d`}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={preparing}
                      onClick={() =>
                        void prepareCandidateAnalytics()
                      }
                      className="min-h-11 rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-5 text-[10px] font-black uppercase tracking-[0.1em] disabled:opacity-40"
                    >
                      {preparing
                        ? "Preparing..."
                        : "Refresh Candidate Analytics"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        generating ||
                        !readiness.ready_to_match
                      }
                      onClick={() =>
                        void generateMatch()
                      }
                      className="min-h-11 rounded-full border border-violet-200/22 bg-violet-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-50 disabled:opacity-35"
                    >
                      {generating
                        ? "Comparing..."
                        : readiness.match_mode ===
                            "single_eligible_assessment"
                          ? "Assess Eligible Class"
                          : "Generate Class Comparison"}
                    </button>
                  </div>
                </>
              )}
            </section>

            {preparationRows.length > 0 && (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <SectionTitle
                  eyebrow="Refresh result"
                  title="Candidate analytics preparation"
                />

                <div className="mt-4 grid gap-2">
                  {preparationRows.map((row) => (
                    <div
                      key={row.candidate_class_id}
                      className="rounded-2xl border border-white/9 bg-black/10 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-sm">
                          {row.candidate_class_name}
                        </strong>

                        <span className="text-[10px] text-white/45">
                          {row.error_message
                            ? row.error_message
                            : `${titleCase(
                                row.report_status,
                              )} · ${Math.round(
                                row.nova_coverage_pct || 0,
                              )}% coverage`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {match && (
              <section className="rounded-[28px] border border-violet-200/15 bg-violet-300/[0.035] p-5 sm:p-7">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-violet-200">
                      Phase 3D result
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      {match.run.run_mode ===
                      "single_eligible_assessment"
                        ? "Eligible Class Assessment"
                        : "Class Comparison"}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">
                      Experimental decision-support ranking.
                      No enrolment has occurred. Compare the
                      result with curriculum-lead and teacher
                      judgement during the pilot.
                    </p>
                  </div>

                  <StatusPill
                    label={titleCase(
                      match.run.diagnostics
                        .ranking_separation,
                    )}
                    tone={
                      match.run.diagnostics
                        .ranking_separation ===
                      "clearer_separation"
                        ? "good"
                        : "medium"
                    }
                  />
                </div>

                <div className="mt-6 grid gap-4">
                  {match.candidates.map((candidate) => (
                    <article
                      key={candidate.candidate_id}
                      className={`rounded-[24px] border p-5 ${
                        candidate.rank_position === 1
                          ? "border-cyan-200/24 bg-cyan-300/[0.05]"
                          : "border-white/9 bg-black/10"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200">
                            Rank {candidate.rank_position}
                          </span>

                          <h3 className="mt-2 text-2xl font-black">
                            {candidate.class_name}
                          </h3>

                          <p className="mt-2 text-xs text-white/42">
                            {weekdayLabel(
                              candidate.day_of_week,
                            )}
                            {candidate.start_time
                              ? ` · ${candidate.start_time}`
                              : ""}
                            {" · "}
                            {titleCase(
                              candidate.alignment_band,
                            )}
                          </p>
                        </div>

                        <div className="text-left lg:text-right">
                          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/35">
                            Decision-support score
                          </span>

                          <strong className="mt-1 block text-4xl font-black text-cyan-100">
                            {Math.round(
                              candidate.scores
                                .decision_support * 100,
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <ScoreMetric
                          label="Need support"
                          value={
                            candidate.scores
                              .support_alignment
                          }
                        />

                        <ScoreMetric
                          label="Pace compatibility"
                          value={
                            candidate.scores
                              .pace_compatibility
                          }
                        />

                        <ScoreMetric
                          label="Strength alignment"
                          value={
                            candidate.scores
                              .strength_alignment
                          }
                        />

                        <ScoreMetric
                          label="Data quality"
                          value={
                            candidate.scores
                              .class_data_quality
                          }
                        />

                        <ScoreMetric
                          label="Capacity"
                          value={
                            candidate.scores
                              .capacity_headroom
                          }
                        />
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <DetailList
                          title="Matched learner needs"
                          rows={
                            candidate.alignment_details
                              .matched_needs
                          }
                          emptyText="No learner needs matched current class support areas."
                        />

                        <DetailList
                          title="Unsupported learner needs"
                          rows={
                            candidate.alignment_details
                              .unsupported_needs
                          }
                          emptyText="No unsupported learner needs were identified."
                        />

                        <DetailList
                          title="Pace mismatch flags"
                          rows={
                            candidate.alignment_details
                              .pace_mismatches
                          }
                          emptyText="No learner need overlapped a shared class strength."
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200/14 bg-amber-300/[0.04] p-4 text-xs leading-5 text-amber-50/70">
                  Do not use Rank 1 as automatic placement.
                  The 3D-v1 weights and score bands are
                  intentionally experimental until several
                  genuine placement cases are reviewed against
                  real educator judgement.
                </div>
              </section>
            )}

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <SectionTitle
                eyebrow="History"
                title="Previous matching runs"
              />

              {history.length === 0 ? (
                <p className="mt-4 text-sm text-white/42">
                  No previous class matching runs for this
                  student.
                </p>
              ) : (
                <div className="mt-4 grid gap-2">
                  {history.map((item) => (
                    <button
                      type="button"
                      key={item.matching_run_id}
                      onClick={() =>
                        void openMatch(
                          item.matching_run_id,
                        )
                      }
                      className="rounded-2xl border border-white/9 bg-black/10 p-4 text-left hover:border-violet-200/20"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong className="text-sm">
                            {titleCase(item.subject)} ·
                            Primary {item.primary_level}
                          </strong>

                          <p className="mt-1 text-[10px] text-white/38">
                            {formatDateTime(
                              item.generated_at,
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <strong className="text-xs text-violet-100">
                            {item.top_class_name ||
                              "No top class"}
                          </strong>

                          <p className="mt-1 text-[9px] text-white/38">
                            {item.top_decision_support_score ===
                            null
                              ? ""
                              : `Score ${Math.round(
                                  item.top_decision_support_score *
                                    100,
                                )}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  router.push("/teacher-dashboard")
                }
                className="rounded-full border border-emerald-200/18 bg-emerald-300/[0.06] px-5 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100"
              >
                Open Teacher Dashboard to Place Student
              </button>
            </div>
          </div>
        )}

        <footer className="mt-10 rounded-2xl border border-violet-200/12 bg-violet-300/[0.035] px-5 py-4 text-xs leading-5 text-violet-100/70">
          Phase 3D is the final planned Phase 3 feature build.
          After installation, the next stage is Pilot
          Validation &amp; Hardening—not another feature phase.
        </footer>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/9 bg-black/10 p-4">
      <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/34">
        {label}
      </span>
      <strong className="mt-2 block text-lg">
        {value}
      </strong>
    </div>
  );
}

function ScoreMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/9 bg-black/10 p-4">
      <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/34">
        {label}
      </span>
      <strong className="mt-2 block text-lg">
        {Math.round(value * 100)}
      </strong>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "medium" | "warning";
}) {
  const classes =
    tone === "good"
      ? "border-emerald-200/20 bg-emerald-300/[0.07] text-emerald-100"
      : tone === "medium"
        ? "border-violet-200/20 bg-violet-300/[0.07] text-violet-100"
        : "border-amber-200/20 bg-amber-300/[0.07] text-amber-100";

  return (
    <span
      className={`w-fit rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] ${classes}`}
    >
      {label || "Not available"}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-violet-200">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black">
        {title}
      </h2>
    </div>
  );
}

function DetailList({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: Array<{
    aggregation_key: string;
    skill_name?: string | null;
    topic?: string | null;
    class_classification?: string;
    class_affected_pct?: number;
    class_strength_pct?: number;
  }>;
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <strong className="text-xs">{title}</strong>

      {rows.length === 0 ? (
        <p className="mt-3 text-[10px] leading-4 text-white/36">
          {emptyText}
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <div
              key={`${row.aggregation_key}-${row.class_classification || ""}`}
              className="rounded-xl border border-white/7 bg-black/10 px-3 py-2"
            >
              <span className="text-[10px] text-white/68">
                {row.skill_name ||
                  row.topic ||
                  titleCase(row.aggregation_key)}
              </span>

              {row.class_classification && (
                <p className="mt-1 text-[8px] uppercase tracking-[0.06em] text-white/32">
                  {titleCase(
                    row.class_classification,
                  )}
                  {row.class_affected_pct !== undefined
                    ? ` · ${Math.round(
                        row.class_affected_pct,
                      )}% class`
                    : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
