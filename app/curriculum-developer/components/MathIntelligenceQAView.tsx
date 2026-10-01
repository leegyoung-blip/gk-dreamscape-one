"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import type { MathAuthoringBatchItem } from "@/lib/math-intelligence/MathBatchGenerationTypes";
import {
  buildMathQuizVisualQASummary,
  hasGeneratedAcceptableQuizVisual,
  isMathQuizVisualQAItem,
  mathQuizVisualQAGateLabel,
} from "@/lib/math-intelligence/MathQuizVisualQA";
import type {
  MathQAIssueCode,
  MathQASampleSelection,
  MathQAStrategySummary,
  MathQAVerdict,
} from "@/lib/math-intelligence/MathQATypes";
import MathIntelligenceProposalPreview from "./math-intelligence/MathIntelligenceProposalPreview";
import { requestMathBatchProposalsInChunks } from "./math-intelligence/requestMathBatchProposals";
import {
  attachMathQAResults,
  completeMathQARun,
  createMathQARun,
  loadMathQARun,
  loadMathQARunItems,
  loadRealBankMathQASample,
  loadRecentMathQARuns,
  saveMathQAReview,
} from "./math-intelligence/mathQAClient";

const SAMPLE_SIZES = [120, 180, 240, 300];

const ISSUE_OPTIONS: Array<{ code: MathQAIssueCode; label: string }> = [
  { code: "wrong_need_decision", label: "Wrong need decision" },
  { code: "wrong_strategy", label: "Wrong strategy" },
  { code: "wrong_values_or_relationships", label: "Wrong values / relationships" },
  { code: "answer_leak", label: "Answer leak" },
  { code: "missing_visual", label: "Visual should exist" },
  { code: "unnecessary_visual", label: "Visual unnecessary" },
  { code: "visual_clarity", label: "Visual clarity" },
  { code: "source_fidelity", label: "Source fidelity" },
  { code: "label_quality", label: "Labels / wording" },
  { code: "scale_or_proportion", label: "Scale / proportion" },
  { code: "semantic_colour", label: "Semantic colour" },
  { code: "layout_or_spacing", label: "Layout / spacing" },
  { code: "teaching_sequence", label: "Teaching sequence" },
  { code: "teaching_wording", label: "Teaching wording" },
  { code: "unsupported_v2_semantics", label: "V2 semantics gap" },
  { code: "luna_unnecessary", label: "Luna unnecessary" },
  { code: "luna_needed_but_not_used", label: "Luna should have been used" },
  { code: "legacy_media_should_be_preserved", label: "Legacy media should be preserved" },
  { code: "other", label: "Other" },
];

const DIAGRAM_ISSUE_CODES = new Set<MathQAIssueCode>([
  "wrong_need_decision",
  "wrong_strategy",
  "wrong_values_or_relationships",
  "answer_leak",
  "missing_visual",
  "unnecessary_visual",
  "visual_clarity",
  "source_fidelity",
  "label_quality",
  "scale_or_proportion",
  "semantic_colour",
  "layout_or_spacing",
  "unsupported_v2_semantics",
  "legacy_media_should_be_preserved",
  "other",
]);

type StoredReview = {
  id: string;
  question_id: string;
  verdict: MathQAVerdict;
  issue_codes: MathQAIssueCode[];
  reviewer_notes: string;
  reviewed_at: string | null;
};


type QAStatusFilter =
  | "all"
  | "resolved"
  | "auto_review"
  | "generated"
  | "required_v2"
  | "not_needed"
  | "preserved"
  | "invalid_failed";

type QASourceFilter = "all" | "rules_only" | "luna";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

export default function MathIntelligenceQAView() {
  const [sampleSize, setSampleSize] = useState(240);
  const [seed, setSeed] = useState("phase-2i-v1");
  const [sample, setSample] = useState<MathQASampleSelection | null>(null);
  const [runId, setRunId] = useState("");
  const [results, setResults] = useState<MathAuthoringBatchItem[]>([]);
  const [storedReviews, setStoredReviews] = useState<Map<string, StoredReview>>(new Map());
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [buildingSample, setBuildingSample] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<QAStatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<QASourceFilter>("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");

  const resultByQuestion = useMemo(
    () => new Map(results.map((item) => [item.client_id, item])),
    [results],
  );
  const sampleByQuestion = useMemo(
    () => new Map((sample?.items || []).map((item) => [item.question_id, item])),
    [sample],
  );

  const selectedSampleItem = selectedQuestionId
    ? sampleByQuestion.get(selectedQuestionId) || null
    : null;
  const selectedResult = selectedQuestionId
    ? resultByQuestion.get(selectedQuestionId) || null
    : null;
  const selectedReview = selectedQuestionId
    ? storedReviews.get(selectedQuestionId) || null
    : null;

  const reviewedCount = useMemo(
    () => [...storedReviews.values()].filter((item) => item.verdict !== "unreviewed").length,
    [storedReviews],
  );

  const strategySummary = useMemo(
    () => buildStrategySummary(results, storedReviews),
    [results, storedReviews],
  );

  const quizVisualQASummary = useMemo(
    () => buildMathQuizVisualQASummary(results, storedReviews),
    [results, storedReviews],
  );

  const topicOptions = useMemo(() => {
    const values = new Map<string, string>();
    for (const item of sample?.items || []) values.set(item.topic_id, item.topic_title);
    return [...values.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [sample]);

  const filteredSampleItems = useMemo(() => {
    return (sample?.items || []).filter((item) => {
      const result = resultByQuestion.get(item.question_id);
      const strategy = result?.proposal?.decision.strategy || (result ? "generation_failed" : "not_run");
      const lunaUsed = Boolean(
        result?.proposal?.sources.interpretation.source === "luna" ||
        result?.proposal?.sources.teaching.source === "luna"
      );
      const status = result?.status || "not_run";
      const resolved = ["generated", "not_needed", "preserved"].includes(status);
      const autoReview = ["needs_review", "invalid", "failed"].includes(status);

      if (strategyFilter !== "all" && strategy !== strategyFilter) return false;
      if (levelFilter !== "all" && item.primary_level !== Number(levelFilter)) return false;
      if (topicFilter !== "all" && item.topic_id !== topicFilter) return false;
      if (sourceFilter === "luna" && !lunaUsed) return false;
      if (sourceFilter === "rules_only" && (!result?.proposal || lunaUsed)) return false;
      if (statusFilter === "resolved" && !resolved) return false;
      if (statusFilter === "auto_review" && !autoReview) return false;
      if (statusFilter === "generated" && status !== "generated") return false;
      if (statusFilter === "required_v2" && (!result || !isMathQuizVisualQAItem(result))) return false;
      if (statusFilter === "not_needed" && status !== "not_needed") return false;
      if (statusFilter === "preserved" && status !== "preserved") return false;
      if (statusFilter === "invalid_failed" && !["invalid", "failed"].includes(status)) return false;
      return true;
    });
  }, [sample, resultByQuestion, strategyFilter, levelFilter, topicFilter, sourceFilter, statusFilter]);

  useEffect(() => {
    if (filteredSampleItems.length === 0) {
      if (selectedQuestionId) setSelectedQuestionId("");
      return;
    }
    if (!filteredSampleItems.some((item) => item.question_id === selectedQuestionId)) {
      setSelectedQuestionId(filteredSampleItems[0].question_id);
    }
  }, [filteredSampleItems, selectedQuestionId]);

  function clearQAFilters() {
    setStrategyFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setLevelFilter("all");
    setTopicFilter("all");
  }

  function focusStrategy(strategy: string, mode: "all" | "auto_review" | "luna" = "all") {
    setStrategyFilter(strategy);
    setStatusFilter(mode === "auto_review" ? "auto_review" : "all");
    setSourceFilter(mode === "luna" ? "luna" : "all");
  }

  function selectNextFilteredQuestion() {
    if (filteredSampleItems.length === 0) return;
    const index = filteredSampleItems.findIndex((item) => item.question_id === selectedQuestionId);
    const next = filteredSampleItems[(index + 1 + filteredSampleItems.length) % filteredSampleItems.length];
    setSelectedQuestionId(next.question_id);
  }

  function focusPhase3CReview() {
    setStrategyFilter("all");
    setStatusFilter("required_v2");
    setSourceFilter("all");
    setLevelFilter("all");
    setTopicFilter("all");
  }

  function selectNextUnreviewedRequiredVisual(excludeQuestionId = "") {
    const cohort = (sample?.items || []).filter((item) => {
      if (item.question_id === excludeQuestionId) return false;
      const result = resultByQuestion.get(item.question_id);
      if (!result || !hasGeneratedAcceptableQuizVisual(result)) return false;
      const verdict = storedReviews.get(item.question_id)?.verdict || "unreviewed";
      return verdict === "unreviewed";
    });
    if (cohort.length === 0) return;
    const index = cohort.findIndex((item) => item.question_id === selectedQuestionId);
    const next = cohort[(index + 1 + cohort.length) % cohort.length];
    setSelectedQuestionId(next.question_id);
  }

  async function refreshRecentRuns() {
    setLoadingRecent(true);
    try {
      setRecentRuns((await loadRecentMathQARuns()) as any[]);
    } catch (recentError) {
      setError(errorMessage(recentError));
    } finally {
      setLoadingRecent(false);
    }
  }

  useEffect(() => {
    void refreshRecentRuns();
  }, []);

  async function refreshStoredReviews(nextRunId = runId) {
    if (!nextRunId) return;
    const rows = await loadMathQARunItems(nextRunId);
    const next = new Map<string, StoredReview>();
    for (const row of rows as any[]) {
      next.set(String(row.question_id), {
        id: String(row.id),
        question_id: String(row.question_id),
        verdict: (row.verdict || "unreviewed") as MathQAVerdict,
        issue_codes: Array.isArray(row.issue_codes)
          ? (row.issue_codes as MathQAIssueCode[])
          : [],
        reviewer_notes: String(row.reviewer_notes || ""),
        reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
      });
    }
    setStoredReviews(next);
  }

  async function buildSample() {
    setBuildingSample(true);
    setError(null);
    setNotice(null);
    setSample(null);
    setResults([]);
    setStoredReviews(new Map());
    setRunId("");
    setSelectedQuestionId("");
    clearQAFilters();
    try {
      const nextSample = await loadRealBankMathQASample({
        targetSize: sampleSize,
        seed,
      });
      if (nextSample.actual_size === 0) {
        throw new Error("No eligible linked Math questions were found in the live bank.");
      }
      setSample(nextSample);
      setRunId("");
      setSelectedQuestionId(nextSample.items[0]?.question_id || "");
      setNotice(
        `Built a ${nextSample.actual_size}-question real-bank sample. Run Math Intelligence to save the QA run and begin review.`,
      );
    } catch (sampleError) {
      setError(errorMessage(sampleError));
    } finally {
      setBuildingSample(false);
    }
  }

  async function generateSample() {
    if (!sample) return;
    setGenerating(true);
    setError(null);
    setNotice(null);
    setProgress({ completed: 0, total: sample.items.length });
    try {
      const generated = await requestMathBatchProposalsInChunks(
        sample.items.map((item) => ({
          client_id: item.question_id,
          question: item.question,
        })),
        (completed, total) => setProgress({ completed, total }),
      );
      const nextRunId = runId || (await createMathQARun(sample));
      if (!nextRunId) throw new Error("Dreamscape could not create the QA run record.");
      setRunId(nextRunId);
      setResults(generated);
      await attachMathQAResults(nextRunId, generated);
      await refreshStoredReviews(nextRunId);
      await refreshRecentRuns();
      setNotice(
        `Math Intelligence analysed all ${generated.length} sampled questions. QA run ${nextRunId.slice(0, 8).toUpperCase()} is saved and ready for human review.`,
      );
    } catch (generationError) {
      setError(errorMessage(generationError));
    } finally {
      setGenerating(false);
    }
  }

  async function saveReview(
    verdict: MathQAVerdict,
    issueCodes: MathQAIssueCode[],
    notes: string,
  ) {
    if (!selectedReview) return;
    setSavingReview(true);
    setError(null);
    try {
      await saveMathQAReview({
        itemId: selectedReview.id,
        verdict,
        issueCodes,
        notes,
      });
      await refreshStoredReviews();
    } catch (reviewError) {
      setError(errorMessage(reviewError));
    } finally {
      setSavingReview(false);
    }
  }

  async function completeRun() {
    if (!runId) return;
    setCompleting(true);
    setError(null);
    try {
      await completeMathQARun(runId);
      setNotice(
        `QA run ${runId.slice(0, 8).toUpperCase()} completed. Its reviewed results are retained for coverage analysis.`,
      );
      await refreshRecentRuns();
    } catch (completeError) {
      setError(errorMessage(completeError));
    } finally {
      setCompleting(false);
    }
  }

  async function resumeRun(nextRunId: string) {
    setBuildingSample(true);
    setError(null);
    setNotice(null);
    clearQAFilters();
    try {
      const loaded = await loadMathQARun(nextRunId);
      setRunId(nextRunId);
      setSample(loaded.sample);
      setResults(loaded.results);
      setSelectedQuestionId(loaded.sample.items[0]?.question_id || "");
      const next = new Map<string, StoredReview>();
      for (const row of loaded.items as any[]) {
        next.set(String(row.question_id), {
          id: String(row.id),
          question_id: String(row.question_id),
          verdict: (row.verdict || "unreviewed") as MathQAVerdict,
          issue_codes: Array.isArray(row.issue_codes) ? row.issue_codes : [],
          reviewer_notes: String(row.reviewer_notes || ""),
          reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
        });
      }
      setStoredReviews(next);
      setNotice(`Resumed QA run ${nextRunId.slice(0, 8).toUpperCase()}.`);
    } catch (resumeError) {
      setError(errorMessage(resumeError));
    } finally {
      setBuildingSample(false);
    }
  }

  function exportReport() {
    if (!sample) return;
    const payload = {
      exported_at: new Date().toISOString(),
      run_id: runId,
      sample,
      results,
      reviews: [...storedReviews.values()],
      strategy_summary: strategySummary,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `math-intelligence-qa-${runId.slice(0, 8) || "sample"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportPhase3CReport() {
    if (!sample) return;
    const cohort = sample.items
      .map((item) => {
        const result = resultByQuestion.get(item.question_id);
        if (!result || !isMathQuizVisualQAItem(result)) return null;
        const review = storedReviews.get(item.question_id) || null;
        return {
          question: {
            question_id: item.question_id,
            question_code: item.question_code,
            primary_level: item.primary_level,
            topic_title: item.topic_title,
            prompt: item.prompt,
          },
          automatic_status: result.status,
          source_contract: result.proposal?.decision.quiz_visual_contract || null,
          visual: result.proposal?.visual || null,
          review,
        };
      })
      .filter(Boolean);

    const payload = {
      exported_at: new Date().toISOString(),
      phase: "3C",
      run_id: runId,
      seed: sample.seed,
      summary: quizVisualQASummary,
      items: cohort,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `math-quiz-visual-qa-3C-${runId.slice(0, 8) || "sample"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={stack}>
      <div style={safeBanner}>
        <strong>Real-bank QA only.</strong> The sample is taken from the existing
        linked Math question bank in Supabase. This workspace stores QA evidence,
        but never changes the sampled Math questions or publishes content.
      </div>

      {error ? <div style={errorBanner}>{error}</div> : null}
      {notice ? <div style={successBanner}>{notice}</div> : null}

      <section style={card}>
        <div>
          <p style={eyebrow}>PHASE 2I · REAL-BANK SAMPLE</p>
          <h2 style={heading}>Build a reproducible P1–P6 QA sample</h2>
          <p style={muted}>
            The default 240-question sample targets about 40 questions per level,
            balances across active topics, and rotates across legacy visuals,
            word problems, direct text questions and any existing V2 questions.
          </p>
        </div>

        <div style={formGrid}>
          <label style={label}>
            Target sample size
            <select
              value={sampleSize}
              disabled={buildingSample || generating}
              onChange={(event: any) => setSampleSize(Number(event.target.value))}
              style={input}
            >
              {SAMPLE_SIZES.map((value) => (
                <option key={value} value={value}>{value} questions</option>
              ))}
            </select>
          </label>
          <label style={label}>
            Reproducible seed
            <input
              value={seed}
              disabled={buildingSample || generating}
              onChange={(event: any) => setSeed(event.target.value)}
              style={input}
            />
          </label>
        </div>

        <div style={buttonRow}>
          <button
            type="button"
            onClick={() => void buildSample()}
            disabled={buildingSample || generating}
            style={primaryButton}
          >
            {buildingSample ? "Building sample…" : "Build real-bank QA sample"}
          </button>
          {sample && results.length === 0 && !runId ? (
            <button
              type="button"
              onClick={() => void generateSample()}
              disabled={generating || buildingSample}
              style={secondaryButton}
            >
              {generating
                ? `Analysing ${progress.completed}/${progress.total}…`
                : `Run Math Intelligence on ${sample.actual_size} questions`}
            </button>
          ) : null}
        </div>
      </section>

      {recentRuns.length > 0 ? (
        <section style={card}>
          <div style={sectionHeader}>
            <div>
              <p style={eyebrow}>RECENT QA RUNS</p>
              <h2 style={heading}>Resume a saved review</h2>
            </div>
            {loadingRecent ? <span style={muted}>Refreshing…</span> : null}
          </div>
          <div style={recentRunGrid}>
            {recentRuns.map((run) => (
              <button
                key={String(run.id)}
                type="button"
                onClick={() => void resumeRun(String(run.id))}
                style={recentRunButton}
              >
                <strong>{String(run.id).slice(0, 8).toUpperCase()}</strong>
                <span>{Number(run.actual_size || 0)} questions · {String(run.status || "sampled")}</span>
                <small>{String(run.seed || "")}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {sample ? (
        <section style={card}>
          <div style={sectionHeader}>
            <div>
              <p style={eyebrow}>SAMPLE COMPOSITION</p>
              <h2 style={heading}>{sample.actual_size} real Math questions</h2>
              <p style={muted}>
                Seed {sample.seed} · Sampling {sample.sampling_version} · Run {runId ? runId.slice(0, 8).toUpperCase() : "pending"}
              </p>
            </div>
          </div>
          <div style={levelGrid}>
            {sample.levels.map((level) => (
              <div key={level.primary_level} style={levelCard}>
                <strong>P{level.primary_level}: {level.selected}</strong>
                <span>{level.topic_count} topic(s)</span>
                <small>Legacy {level.strata.legacy_visual} · Word {level.strata.text_word_problem} · Direct {level.strata.text_direct} · V2 {level.strata.existing_v2}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {results.length > 0 && sample ? (
        <>
          <section style={metricGrid}>
            <Metric label="Sampled" value={results.length} />
            <Metric label="Reviewed" value={reviewedCount} />
            <Metric label="Rules only" value={results.filter((item) => item.proposal?.sources.interpretation.source === "rules" && item.proposal?.sources.teaching.source !== "luna").length} />
            <Metric label="Luna used" value={results.filter((item) => item.proposal?.sources.interpretation.source === "luna" || item.proposal?.sources.teaching.source === "luna").length} />
            <Metric label="Needs review" value={results.filter((item) => item.status === "needs_review" || item.status === "invalid" || item.status === "failed").length} />
          </section>

          <section style={card}>
            <div style={sectionHeader}>
              <div>
                <p style={eyebrow}>PHASE 3A FILTER</p>
                <h2 style={heading}>Quiz visual eligibility</h2>
                <p style={muted}>Only “Required V2” questions are allowed into automatic quiz diagram generation.</p>
              </div>
            </div>
            <div style={metricGrid}>
              <Metric label="Required V2" value={results.filter((item) => item.proposal?.decision.quiz_visual_requirement === "required").length} />
              <Metric label="Existing media" value={results.filter((item) => item.proposal?.decision.quiz_visual_requirement === "existing_media").length} />
              <Metric label="Optional media" value={results.filter((item) => item.proposal?.decision.quiz_visual_requirement === "optional_enrichment").length} />
              <Metric label="No visual" value={results.filter((item) => item.proposal?.decision.quiz_visual_requirement === "not_needed").length} />
              <Metric label="Missing media" value={results.filter((item) => item.proposal?.decision.quiz_visual_requirement === "missing_required_media").length} />
            </div>
          </section>

          <section style={phase3CCard}>
            <div style={sectionHeader}>
              <div>
                <p style={phase3CEyebrow}>PHASE 3C · DIAGRAM QA GATE</p>
                <h2 style={heading}>Review only the required learner-facing V2 diagrams</h2>
                <p style={muted}>Teaching is deliberately excluded. A PASS means the quiz diagram is mathematically faithful, clear, age-appropriate and does not leak the answer.</p>
              </div>
              <span style={gatePill(quizVisualQASummary.gate_status)}>
                {mathQuizVisualQAGateLabel(quizVisualQASummary.gate_status)}
              </span>
            </div>
            <div style={metricGrid}>
              <Metric label="Required V2" value={quizVisualQASummary.required_v2} />
              <Metric label="Generated safely" value={quizVisualQASummary.generated_visuals} />
              <Metric label="Reviewed" value={quizVisualQASummary.reviewed} />
              <Metric label="Pass" value={quizVisualQASummary.pass} />
              <Metric label="Minor" value={quizVisualQASummary.minor} />
              <Metric label="Fail" value={quizVisualQASummary.fail + quizVisualQASummary.visual_generation_failures} />
            </div>
            <div style={phase3CRules}>
              <strong>3C acceptance rules</strong>
              <span><b>PASS</b> — exact source meaning, correct labels/data/geometry, clear layout, no answer leak.</span>
              <span><b>MINOR</b> — mathematically correct but presentation needs polish.</span>
              <span><b>FAIL</b> — wrong or misleading mathematics, missing required information, answer leak, or unusable visual.</span>
            </div>
            <div style={buttonRow}>
              <button type="button" onClick={focusPhase3CReview} style={primaryButton}>Review required V2 only</button>
              <button type="button" onClick={() => selectNextUnreviewedRequiredVisual()} disabled={quizVisualQASummary.unreviewed === 0} style={secondaryButton}>Next unreviewed 3C</button>
              <button type="button" onClick={exportPhase3CReport} style={secondaryButton}>Export 3C diagram QA</button>
            </div>
          </section>

          <section style={card}>
            <div style={sectionHeader}>
              <div>
                <p style={eyebrow}>COVERAGE REPORT</p>
                <h2 style={heading}>Strategy performance</h2>
                <p style={muted}>Human verdicts are intentionally separate from automatic validator results.</p>
              </div>
              <div style={buttonRow}>
                <button type="button" onClick={exportReport} style={secondaryButton}>Export QA JSON</button>
                <button
                  type="button"
                  onClick={() => void completeRun()}
                  disabled={completing || reviewedCount < results.length}
                  style={primaryButton}
                  title={reviewedCount < results.length ? "Review every sampled item before completing the run." : undefined}
                >
                  {completing ? "Completing…" : "Complete QA run"}
                </button>
              </div>
            </div>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Strategy</th>
                    <th style={th}>N</th>
                    <th style={th}>Resolved</th>
                    <th style={th}>Auto review</th>
                    <th style={th}>Luna</th>
                    <th style={th}>Pass</th>
                    <th style={th}>Minor</th>
                    <th style={th}>Fail</th>
                  </tr>
                </thead>
                <tbody>
                  {strategySummary.map((row) => (
                    <tr key={row.strategy}>
                      <td style={td}>
                        <button type="button" onClick={() => focusStrategy(row.strategy)} style={tableLinkButton}>
                          {row.strategy}
                        </button>
                      </td>
                      <td style={td}>{row.sampled}</td>
                      <td style={td}>
                        <button type="button" onClick={() => { setStrategyFilter(row.strategy); setStatusFilter("resolved"); setSourceFilter("all"); }} style={tableCountButton}>
                          {row.generated}
                        </button>
                      </td>
                      <td style={td}>
                        <button type="button" onClick={() => focusStrategy(row.strategy, "auto_review")} style={tableCountButton}>
                          {row.needs_review + row.invalid_or_failed}
                        </button>
                      </td>
                      <td style={td}>
                        <button type="button" onClick={() => focusStrategy(row.strategy, "luna")} style={tableCountButton}>
                          {row.luna_used}
                        </button>
                      </td>
                      <td style={td}>{row.human_pass}</td>
                      <td style={td}>{row.human_minor}</td>
                      <td style={td}>{row.human_fail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={card}>
            <div style={sectionHeader}>
              <div>
                <p style={eyebrow}>QA DRILL-DOWN</p>
                <h2 style={heading}>Inspect the questions behind each result</h2>
                <p style={muted}>Click a strategy, Resolved, Auto review or Luna count above, or filter directly below.</p>
              </div>
              <div style={buttonRow}>
                <button type="button" onClick={focusPhase3CReview} style={secondaryButton}>3C required V2</button>
                <button type="button" onClick={() => { setStatusFilter("auto_review"); setSourceFilter("all"); }} style={secondaryButton}>Auto-review items</button>
                <button type="button" onClick={() => { setSourceFilter("luna"); setStatusFilter("all"); }} style={secondaryButton}>Luna-used items</button>
                <button type="button" onClick={clearQAFilters} style={secondaryButton}>Clear filters</button>
              </div>
            </div>
            <div style={filterGrid}>
              <label style={label}>
                Strategy
                <select value={strategyFilter} onChange={(event: any) => setStrategyFilter(event.target.value)} style={input}>
                  <option value="all">All strategies</option>
                  {strategySummary.map((row) => <option key={row.strategy} value={row.strategy}>{row.strategy}</option>)}
                </select>
              </label>
              <label style={label}>
                Automatic status
                <select value={statusFilter} onChange={(event: any) => setStatusFilter(event.target.value as QAStatusFilter)} style={input}>
                  <option value="all">All statuses</option>
                  <option value="resolved">Resolved automatically</option>
                  <option value="auto_review">Needs automatic review</option>
                  <option value="generated">Generated visual</option>
                  <option value="required_v2">Phase 3C · Required V2</option>
                  <option value="not_needed">No visual needed</option>
                  <option value="preserved">Preserved media</option>
                  <option value="invalid_failed">Invalid / failed</option>
                </select>
              </label>
              <label style={label}>
                Intelligence source
                <select value={sourceFilter} onChange={(event: any) => setSourceFilter(event.target.value as QASourceFilter)} style={input}>
                  <option value="all">Rules + Luna</option>
                  <option value="rules_only">Dreamscape rules only</option>
                  <option value="luna">Luna used</option>
                </select>
              </label>
              <label style={label}>
                Level
                <select value={levelFilter} onChange={(event: any) => setLevelFilter(event.target.value)} style={input}>
                  <option value="all">P1–P6</option>
                  {[1,2,3,4,5,6].map((level) => <option key={level} value={String(level)}>P{level}</option>)}
                </select>
              </label>
              <label style={label}>
                Topic
                <select value={topicFilter} onChange={(event: any) => setTopicFilter(event.target.value)} style={input}>
                  <option value="all">All topics</option>
                  {topicOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                </select>
              </label>
            </div>
            <div style={filterSummary}>
              <strong>{filteredSampleItems.length.toLocaleString()}</strong> of {sample.items.length.toLocaleString()} sampled questions shown
              <button type="button" onClick={selectNextFilteredQuestion} disabled={filteredSampleItems.length === 0} style={secondaryButton}>Next filtered question</button>
            </div>
          </section>

          <section style={qaGrid}>
            <div style={questionList}>
              {filteredSampleItems.map((item) => {
                const result = resultByQuestion.get(item.question_id);
                const review = storedReviews.get(item.question_id);
                const selected = selectedQuestionId === item.question_id;
                return (
                  <button
                    key={item.question_id}
                    type="button"
                    onClick={() => setSelectedQuestionId(item.question_id)}
                    style={selected ? questionButtonActive : questionButton}
                  >
                    <span style={questionCode}>{item.question_code}</span>
                    <span style={questionMeta}>P{item.primary_level} · {item.topic_title}</span>
                    <span style={questionPrompt}>{item.prompt}</span>
                    <span style={pillRow}>
                      <small style={miniPill}>{item.sample_stratum.replaceAll("_", " ")}</small>
                      <small style={miniPill}>{result?.proposal?.decision.strategy || "not run"}</small>
                      {result?.proposal ? (
                        <small style={miniPill}>Quiz: {(result.proposal.decision.quiz_visual_requirement || result.proposal.decision.visual_need).replaceAll("_", " ")}</small>
                      ) : null}
                      <small style={miniPill}>{result?.status || "not run"}</small>
                      <small style={miniPill}>{!result?.proposal ? "No proposal" : (result.proposal.sources.interpretation.source === "luna" || result.proposal.sources.teaching.source === "luna") ? "Luna used" : "Rules only"}</small>
                      <small style={reviewPill(review?.verdict || "unreviewed")}>{review?.verdict || "unreviewed"}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={detailPane}>
              {selectedSampleItem && selectedResult?.proposal ? (
                <>
                  <div style={questionSourceCard}>
                    <strong>{selectedSampleItem.question_code}</strong>
                    <span>P{selectedSampleItem.primary_level} · {selectedSampleItem.topic_title}</span>
                    <span>{selectedSampleItem.quiz_code || "Quiz"} · {selectedSampleItem.quiz_title || ""}</span>
                    <p>{selectedSampleItem.prompt}</p>
                  </div>
                  <MathIntelligenceProposalPreview
                    proposal={selectedResult.proposal}
                    diagramOnly={isMathQuizVisualQAItem(selectedResult)}
                  />
                  {selectedReview ? (
                    <QAReviewEditor
                      key={`${selectedReview.id}-${selectedReview.reviewed_at || "new"}`}
                      review={selectedReview}
                      busy={savingReview}
                      diagramOnly={isMathQuizVisualQAItem(selectedResult)}
                      onSave={saveReview}
                      onSavedNext={() => selectNextUnreviewedRequiredVisual(selectedQuestionId)}
                    />
                  ) : null}
                </>
              ) : selectedSampleItem && selectedResult ? (
                <>
                  <div style={questionSourceCard}>
                    <strong>{selectedSampleItem.question_code}</strong>
                    <span>P{selectedSampleItem.primary_level} · {selectedSampleItem.topic_title}</span>
                    <p>{selectedSampleItem.prompt}</p>
                  </div>
                  <div style={errorBanner}>{selectedResult.error?.message || "No proposal was generated for this question."}</div>
                  {selectedReview ? (
                    <QAReviewEditor
                      key={`${selectedReview.id}-${selectedReview.reviewed_at || "new"}`}
                      review={selectedReview}
                      busy={savingReview}
                      diagramOnly={false}
                      onSave={saveReview}
                    />
                  ) : null}
                </>
              ) : (
                <div style={emptyState}>Select a generated sample question to review its diagram and Teaching steps.</div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function QAReviewEditor({
  review,
  busy,
  diagramOnly = false,
  onSave,
  onSavedNext,
}: {
  review: StoredReview;
  busy: boolean;
  diagramOnly?: boolean;
  onSave: (verdict: MathQAVerdict, issues: MathQAIssueCode[], notes: string) => Promise<void>;
  onSavedNext?: () => void;
}) {
  const [verdict, setVerdict] = useState<MathQAVerdict>(review.verdict);
  const [issues, setIssues] = useState<MathQAIssueCode[]>(review.issue_codes);
  const [notes, setNotes] = useState(review.reviewer_notes);

  function toggleIssue(code: MathQAIssueCode) {
    setIssues((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  return (
    <div style={reviewCard}>
      <div>
        <p style={eyebrow}>HUMAN QA VERDICT</p>
        <div style={verdictRow}>
          {(["pass", "minor", "fail", "not_applicable"] as MathQAVerdict[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setVerdict(value)}
              style={verdict === value ? verdictButtonActive : verdictButton}
            >
              {value.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div style={issueGrid}>
        {ISSUE_OPTIONS.filter((option) => !diagramOnly || DIAGRAM_ISSUE_CODES.has(option.code)).map((option) => (
          <label key={option.code} style={issueLabel}>
            <input
              type="checkbox"
              checked={issues.includes(option.code)}
              onChange={() => toggleIssue(option.code)}
            />
            {option.label}
          </label>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(event: any) => setNotes(event.target.value)}
        placeholder={diagramOnly ? "What is wrong or what needs polishing in the quiz diagram?" : "Optional reviewer notes"}
        rows={3}
        style={textarea}
      />
      <div style={buttonRow}>
        <button
          type="button"
          disabled={busy || verdict === "unreviewed"}
          onClick={() => void onSave(verdict, issues, notes)}
          style={primaryButton}
        >
          {busy ? "Saving QA…" : diagramOnly ? "Save 3C verdict" : "Save QA verdict"}
        </button>
        {diagramOnly && onSavedNext ? (
          <button
            type="button"
            disabled={busy || verdict === "unreviewed"}
            onClick={async () => {
              await onSave(verdict, issues, notes);
              onSavedNext();
            }}
            style={secondaryButton}
          >
            Save & next 3C
          </button>
        ) : null}
      </div>
    </div>
  );
}

function buildStrategySummary(
  results: MathAuthoringBatchItem[],
  reviews: Map<string, StoredReview>,
): MathQAStrategySummary[] {
  const byStrategy = new Map<string, MathQAStrategySummary>();
  for (const item of results) {
    const strategy = item.proposal?.decision.strategy || "generation_failed";
    const row = byStrategy.get(strategy) || {
      strategy,
      sampled: 0,
      generated: 0,
      needs_review: 0,
      invalid_or_failed: 0,
      luna_used: 0,
      human_pass: 0,
      human_minor: 0,
      human_fail: 0,
      unreviewed: 0,
    };
    row.sampled += 1;
    if (item.status === "generated" || item.status === "not_needed" || item.status === "preserved") row.generated += 1;
    if (item.status === "needs_review") row.needs_review += 1;
    if (item.status === "invalid" || item.status === "failed") row.invalid_or_failed += 1;
    if (item.proposal?.sources.interpretation.source === "luna" || item.proposal?.sources.teaching.source === "luna") row.luna_used += 1;
    const verdict = reviews.get(item.client_id)?.verdict || "unreviewed";
    if (verdict === "pass") row.human_pass += 1;
    else if (verdict === "minor") row.human_minor += 1;
    else if (verdict === "fail") row.human_fail += 1;
    else row.unreviewed += 1;
    byStrategy.set(strategy, row);
  }
  return [...byStrategy.values()].sort((left, right) => right.sampled - left.sampled || left.strategy.localeCompare(right.strategy));
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={metricCard}>
      <strong style={metricValue}>{value.toLocaleString()}</strong>
      <span style={metricLabel}>{label}</span>
    </div>
  );
}

function reviewPill(verdict: MathQAVerdict): CSSProperties {
  const colors: Record<MathQAVerdict, string> = {
    unreviewed: "#94A3B8",
    pass: "#86EFAC",
    minor: "#FDE68A",
    fail: "#FCA5A5",
    not_applicable: "#C4B5FD",
  };
  return { ...miniPill, color: colors[verdict] };
}

const stack: CSSProperties = { display: "grid", gap: 18 };
const safeBanner: CSSProperties = { border: "1px solid rgba(88,215,255,.32)", background: "rgba(23,52,95,.55)", borderRadius: 14, padding: "13px 15px", lineHeight: 1.5 };
const errorBanner: CSSProperties = { border: "1px solid rgba(248,113,113,.45)", background: "rgba(127,29,29,.28)", color: "#FECACA", borderRadius: 12, padding: 14 };
const successBanner: CSSProperties = { border: "1px solid rgba(74,222,128,.35)", background: "rgba(20,83,45,.28)", color: "#BBF7D0", borderRadius: 12, padding: 14 };
const phase3CCard: CSSProperties = { border: "1px solid rgba(253,230,138,.34)", background: "linear-gradient(180deg, rgba(113,63,18,.22), rgba(8,20,42,.94))", borderRadius: 16, padding: 18, display: "grid", gap: 16 };
const phase3CEyebrow: CSSProperties = { margin: 0, fontSize: 11, letterSpacing: ".12em", color: "#FDE68A", fontWeight: 900 };
const phase3CRules: CSSProperties = { display: "grid", gap: 5, padding: 12, borderRadius: 12, border: "1px solid rgba(253,230,138,.18)", background: "rgba(15,23,42,.48)", color: "#E2E8F0", fontSize: 12, lineHeight: 1.45 };
function gatePill(status: ReturnType<typeof buildMathQuizVisualQASummary>["gate_status"]): CSSProperties {
  const color = status === "ready" ? "#86EFAC" : status === "blocked" ? "#FCA5A5" : status === "needs_polish" ? "#FDE68A" : "#93C5FD";
  return { border: `1px solid ${color}66`, color, background: `${color}14`, borderRadius: 999, padding: "7px 10px", fontSize: 10, fontWeight: 900, letterSpacing: ".08em" };
}
const card: CSSProperties = { border: "1px solid rgba(148,163,184,.18)", background: "rgba(8,20,42,.9)", borderRadius: 16, padding: 18, display: "grid", gap: 16 };
const eyebrow: CSSProperties = { margin: 0, fontSize: 11, letterSpacing: ".12em", color: "#7EE8FF", fontWeight: 800 };
const heading: CSSProperties = { margin: "4px 0 0", fontSize: 22 };
const muted: CSSProperties = { margin: "6px 0 0", color: "#A9B8D0", lineHeight: 1.5 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 };
const label: CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 700 };
const input: CSSProperties = { width: "100%", border: "1px solid rgba(148,163,184,.28)", background: "#0B1730", color: "#F8FBFF", borderRadius: 10, padding: "10px 11px" };
const textarea: CSSProperties = { ...input, resize: "vertical", fontFamily: "inherit" };
const buttonRow: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: "10px 14px", background: "#58D7FF", color: "#071327", fontWeight: 900, cursor: "pointer" };
const secondaryButton: CSSProperties = { border: "1px solid rgba(148,163,184,.28)", borderRadius: 10, padding: "10px 14px", background: "rgba(15,23,42,.7)", color: "#E2E8F0", fontWeight: 800, cursor: "pointer" };
const sectionHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" };
const levelGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10 };
const levelCard: CSSProperties = { display: "grid", gap: 4, padding: 12, borderRadius: 12, border: "1px solid rgba(148,163,184,.16)", background: "rgba(15,23,42,.65)", color: "#DDE7F7" };
const metricGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 };
const metricCard: CSSProperties = { display: "grid", gap: 3, border: "1px solid rgba(148,163,184,.16)", background: "rgba(8,20,42,.9)", borderRadius: 14, padding: 14 };
const metricValue: CSSProperties = { fontSize: 24, color: "#F8FBFF" };
const metricLabel: CSSProperties = { color: "#A9B8D0", fontSize: 12 };
const filterGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 };
const filterSummary: CSSProperties = { display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", color: "#CBD5E1", fontSize: 12 };
const tableLinkButton: CSSProperties = { border: 0, background: "transparent", padding: 0, color: "#7EE8FF", font: "inherit", fontWeight: 800, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
const tableCountButton: CSSProperties = { border: 0, background: "transparent", padding: 0, color: "#DDE7F7", font: "inherit", fontWeight: 800, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 };
const tableWrap: CSSProperties = { overflowX: "auto" };
const table: CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 720 };
const th: CSSProperties = { textAlign: "left", padding: "8px 9px", fontSize: 11, color: "#93C5FD", borderBottom: "1px solid rgba(148,163,184,.2)" };
const td: CSSProperties = { padding: "8px 9px", fontSize: 12, color: "#DDE7F7", borderBottom: "1px solid rgba(148,163,184,.1)" };
const qaGrid: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(280px,360px) minmax(0,1fr)", gap: 16, alignItems: "start" };
const questionList: CSSProperties = { display: "grid", gap: 8, maxHeight: "78vh", overflowY: "auto", paddingRight: 4 };
const questionButton: CSSProperties = { display: "grid", gap: 5, textAlign: "left", border: "1px solid rgba(148,163,184,.16)", background: "rgba(8,20,42,.88)", color: "#E2E8F0", borderRadius: 12, padding: 11, cursor: "pointer" };
const questionButtonActive: CSSProperties = { ...questionButton, border: "1px solid rgba(88,215,255,.65)", background: "rgba(23,52,95,.78)" };
const questionCode: CSSProperties = { fontWeight: 900, fontSize: 12, color: "#7EE8FF" };
const questionMeta: CSSProperties = { fontSize: 10, color: "#A9B8D0" };
const questionPrompt: CSSProperties = { fontSize: 12, lineHeight: 1.4 };
const pillRow: CSSProperties = { display: "flex", gap: 5, flexWrap: "wrap" };
const miniPill: CSSProperties = { border: "1px solid rgba(148,163,184,.2)", borderRadius: 999, padding: "3px 6px", fontSize: 9, color: "#CBD5E1" };
const detailPane: CSSProperties = { display: "grid", gap: 14, minWidth: 0 };
const questionSourceCard: CSSProperties = { display: "grid", gap: 4, padding: 13, borderRadius: 12, border: "1px solid rgba(148,163,184,.16)", background: "rgba(15,23,42,.72)", color: "#DDE7F7" };
const reviewCard: CSSProperties = { display: "grid", gap: 12, padding: 14, borderRadius: 14, border: "1px solid rgba(126,232,255,.2)", background: "rgba(5,22,45,.78)" };
const verdictRow: CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 };
const verdictButton: CSSProperties = { border: "1px solid rgba(148,163,184,.22)", background: "#0B1730", color: "#DDE7F7", borderRadius: 999, padding: "7px 10px", cursor: "pointer", textTransform: "capitalize" };
const verdictButtonActive: CSSProperties = { ...verdictButton, border: "1px solid rgba(88,215,255,.75)", background: "rgba(88,215,255,.12)" };
const issueGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 7 };
const issueLabel: CSSProperties = { display: "flex", gap: 7, alignItems: "center", fontSize: 11, color: "#CBD5E1" };
const recentRunGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9 };
const recentRunButton: CSSProperties = { display: "grid", gap: 4, textAlign: "left", border: "1px solid rgba(148,163,184,.16)", background: "rgba(15,23,42,.68)", color: "#DDE7F7", borderRadius: 11, padding: 11, cursor: "pointer" };
const emptyState: CSSProperties = { padding: 24, border: "1px dashed rgba(148,163,184,.25)", borderRadius: 14, color: "#94A3B8" };
