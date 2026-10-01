"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { supabase } from "@/lib/supabase";
import type {
  MathAuthoringBatchItem,
  MathAuthoringBatchRequestItem,
} from "@/lib/math-intelligence/MathBatchGenerationTypes";
import { requestMathBatchProposalsInChunks } from "./math-intelligence/requestMathBatchProposals";

type TopicRow = {
  id: string;
  title: string;
  slug: string;
  primary_level: number;
};

type QuizRow = {
  id: string;
  title: string;
  code: string;
  topic_id: string;
  status: string;
  is_published: boolean;
};

type QuestionRow = Record<string, any> & {
  id: string;
  code: string;
  prompt: string;
};

type ResultFilter =
  | "all"
  | "generated"
  | "not_needed"
  | "needs_review"
  | "invalid"
  | "failed"
  | "luna";

const limits = [20, 40, 80, 120, 200];

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

export default function MathIntelligenceBatchView() {
  const [level, setLevel] = useState(1);
  const [topicId, setTopicId] = useState("");
  const [quizId, setQuizId] = useState("");
  const [limit, setLimit] = useState(40);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<MathAuthoringBatchItem[]>([]);
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [loadingScope, setLoadingScope] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTopics() {
      setError(null);
      const { data, error: topicError } = await supabase
        .from("math_topics")
        .select("id,title,slug,primary_level")
        .eq("primary_level", level)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;
      if (topicError) {
        setTopics([]);
        setError(topicError.message);
        return;
      }
      setTopics((data || []) as TopicRow[]);
      setTopicId("");
      setQuizId("");
      setQuizzes([]);
      setQuestions([]);
      setResults([]);
    }
    void loadTopics();
    return () => {
      cancelled = true;
    };
  }, [level]);

  useEffect(() => {
    let cancelled = false;
    async function loadQuizzes() {
      setQuizId("");
      setQuestions([]);
      setResults([]);
      if (!topicId) {
        setQuizzes([]);
        return;
      }

      const { data, error: quizError } = await supabase
        .from("math_quizzes")
        .select("id,title,code,topic_id,status,is_published")
        .eq("topic_id", topicId)
        .neq("status", "archived")
        .order("quiz_order", { ascending: true });

      if (cancelled) return;
      if (quizError) {
        setQuizzes([]);
        setError(quizError.message);
      } else {
        setQuizzes((data || []) as QuizRow[]);
      }
    }
    void loadQuizzes();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  async function loadQuestionScope() {
    setLoadingScope(true);
    setError(null);
    setResults([]);
    try {
      let ids: string[] | null = null;
      if (quizId) {
        const { data: links, error: linkError } = await supabase
          .from("math_quiz_questions")
          .select("question_id,question_order")
          .eq("quiz_id", quizId)
          .order("question_order", { ascending: true })
          .limit(limit);
        if (linkError) throw linkError;
        const linkedIds = ((links || []) as Array<{ question_id: unknown }>).map(
          (row) => String(row.question_id),
        );
        if (linkedIds.length === 0) {
          setQuestions([]);
          return;
        }
        ids = linkedIds;
      }

      let query = supabase
        .from("math_questions")
        .select(
          "id,subject,primary_level,topic_id,stimulus_id,code,question_type,instruction,prompt,content,answer_data,explanation,skill,difficulty,status",
        )
        .eq("primary_level", level)
        .neq("status", "archived")
        .order("code", { ascending: true })
        .limit(limit);

      if (topicId) query = query.eq("topic_id", topicId);
      if (ids) query = query.in("id", ids);

      const { data: questionData, error: questionError } = await query;
      if (questionError) throw questionError;
      const baseQuestions = (questionData || []) as QuestionRow[];

      if (ids) {
        const order = new Map(ids.map((id, index) => [id, index]));
        baseQuestions.sort(
          (left, right) =>
            (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
        );
      } else {
        baseQuestions.sort((left, right) => left.code.localeCompare(right.code));
      }

      const stimulusIds = [
        ...new Set(
          baseQuestions
            .map((question) => String(question.stimulus_id || ""))
            .filter(Boolean),
        ),
      ];
      const questionIds = baseQuestions.map((question) => question.id);

      const stimulusById = new Map<string, any>();
      if (stimulusIds.length > 0) {
        for (const idChunk of chunk(stimulusIds, 100)) {
          const { data, error: stimulusError } = await supabase
            .from("math_stimuli")
            .select("id,stimulus_type,title,body,storage_bucket,storage_path,alt_text")
            .in("id", idChunk);
          if (stimulusError) throw stimulusError;
          for (const row of data || []) stimulusById.set(String(row.id), row);
        }
      }

      const assetsByQuestion = new Map<string, any[]>();
      for (const idChunk of chunk(questionIds, 100)) {
        if (idChunk.length === 0) continue;
        const { data, error: assetError } = await supabase
          .from("math_question_assets")
          .select(
            "id,question_id,asset_type,storage_bucket,storage_path,alt_text,caption,metadata",
          )
          .in("question_id", idChunk);
        if (assetError) throw assetError;
        for (const row of data || []) {
          const key = String(row.question_id);
          const current = assetsByQuestion.get(key) || [];
          current.push(row);
          assetsByQuestion.set(key, current);
        }
      }

      const topicById = new Map(topics.map((topic) => [topic.id, topic.title]));
      setQuestions(
        baseQuestions.map((question) => ({
          ...question,
          topic_title: topicById.get(String(question.topic_id || "")) || "",
          stimulus: question.stimulus_id
            ? stimulusById.get(String(question.stimulus_id)) || null
            : null,
          assets: assetsByQuestion.get(question.id) || [],
        })),
      );
    } catch (loadError) {
      setQuestions([]);
      setError(asErrorMessage(loadError));
    } finally {
      setLoadingScope(false);
    }
  }

  async function generate() {
    if (questions.length === 0) return;
    setGenerating(true);
    setError(null);
    setResults([]);
    setProgress({ completed: 0, total: questions.length });

    try {
      const requestItems: MathAuthoringBatchRequestItem[] = questions.map(
        (question) => ({ client_id: question.id, question }),
      );
      const generated = await requestMathBatchProposalsInChunks(
        requestItems,
        (completed, total) => setProgress({ completed, total }),
      );
      setResults(generated);
    } catch (generationError) {
      setError(asErrorMessage(generationError));
    } finally {
      setGenerating(false);
    }
  }

  const byId = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  const summary = useMemo(() => {
    const output = {
      total: results.length,
      generated: 0,
      notNeeded: 0,
      review: 0,
      failed: 0,
      luna: 0,
      visualAcceptable: 0,
    };
    for (const item of results) {
      if (item.status === "generated") output.generated += 1;
      else if (item.status === "not_needed") output.notNeeded += 1;
      else if (item.status === "needs_review" || item.status === "invalid") {
        output.review += 1;
      } else if (item.status === "failed") output.failed += 1;
      if (item.proposal?.sources.interpretation.source === "luna") output.luna += 1;
      if (item.proposal?.can_accept.visual) output.visualAcceptable += 1;
    }
    return output;
  }, [results]);

  const visibleResults = useMemo(() => {
    if (filter === "all") return results;
    if (filter === "luna") {
      return results.filter(
        (item) =>
          item.proposal?.sources.interpretation.source === "luna" ||
          item.proposal?.sources.teaching.source === "luna",
      );
    }
    if (filter === "invalid") {
      return results.filter((item) => item.status === "invalid");
    }
    return results.filter((item) => item.status === filter);
  }, [filter, results]);

  function downloadReport() {
    if (results.length === 0) return;
    const payload = {
      generated_at: new Date().toISOString(),
      scope: { level, topic_id: topicId || null, quiz_id: quizId || null },
      summary,
      items: results,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `math-intelligence-p${level}-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={stack}>
      <div style={safeBanner}>
        <strong>Preview-only for the existing bank.</strong> This tool analyses
        groups of existing Math questions but does not write generated content
        back to published questions. Review or accept those through the normal
        single-question 2G editor.
      </div>

      {error ? <div style={errorBanner}>{error}</div> : null}

      <section style={card}>
        <div>
          <p style={eyebrow}>EXISTING MATH BANK</p>
          <h2 style={heading}>Batch-generate Math Visual proposals</h2>
          <p style={muted}>
            Select a P1–P6 scope, load questions, then run the same two-level
            Dreamscape Rules → Luna-only-if-ambiguous pipeline used by the
            single-question editor.
          </p>
        </div>

        <div style={formGrid}>
          <label style={label}>
            Level
            <select value={level} onChange={(event) => setLevel(Number(event.target.value))} style={input}>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>Primary {value}</option>
              ))}
            </select>
          </label>
          <label style={label}>
            Topic
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} style={input}>
              <option value="">All P{level} topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.title}</option>
              ))}
            </select>
          </label>
          <label style={label}>
            Quiz
            <select value={quizId} onChange={(event) => setQuizId(event.target.value)} disabled={!topicId} style={input}>
              <option value="">All questions in topic</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.code} — {quiz.title}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            Maximum questions
            <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} style={input}>
              {limits.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={buttonRow}>
          <button type="button" onClick={() => void loadQuestionScope()} disabled={loadingScope || generating} style={secondaryButton}>
            {loadingScope ? "Loading…" : "Load question scope"}
          </button>
          <button type="button" onClick={() => void generate()} disabled={questions.length === 0 || generating || loadingScope} style={primaryButton}>
            {generating
              ? `Generating ${progress.completed}/${progress.total}…`
              : `Generate proposals for ${questions.length} question${questions.length === 1 ? "" : "s"}`}
          </button>
        </div>

        {questions.length > 0 ? (
          <p style={muted}>
            Loaded {questions.length.toLocaleString()} question(s). Existing
            stimulus and asset metadata are included in the decision input.
          </p>
        ) : null}
      </section>

      {results.length > 0 ? (
        <>
          <section style={summaryGrid}>
            <Metric label="Analysed" value={summary.total} />
            <Metric label="Visual accepted" value={summary.visualAcceptable} />
            <Metric label="No visual needed" value={summary.notNeeded} />
            <Metric label="Needs review" value={summary.review} />
            <Metric label="Luna used" value={summary.luna} />
            <Metric label="Failed" value={summary.failed} />
          </section>

          <section style={card}>
            <div style={sectionHeader}>
              <div>
                <p style={eyebrow}>BATCH RESULTS</p>
                <h2 style={heading}>Review generation coverage</h2>
              </div>
              <button type="button" onClick={downloadReport} style={secondaryButton}>
                Export JSON report
              </button>
            </div>

            <div style={filterRow}>
              {(["all", "generated", "not_needed", "needs_review", "invalid", "failed", "luna"] as ResultFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  style={filter === value ? filterActive : filterButton}
                >
                  {value.replaceAll("_", " ")}
                </button>
              ))}
            </div>

            <div style={resultList}>
              {visibleResults.map((item) => {
                const question = byId.get(item.client_id);
                const proposal = item.proposal;
                return (
                  <article key={item.client_id} style={resultCard}>
                    <div style={resultHeader}>
                      <div>
                        <strong>{question?.code || item.client_id}</strong>
                        <p style={promptText}>{question?.prompt || "Question"}</p>
                      </div>
                      <span style={statusPill(item.status)}>{item.status.replaceAll("_", " ")}</span>
                    </div>
                    {proposal ? (
                      <div style={resultFacts}>
                        <span>Quiz visual: {proposal.decision.quiz_visual_requirement || proposal.decision.visual_need}</span>
                        <span>Strategy: {proposal.decision.strategy}</span>
                        <span>
                          Interpretation: {proposal.sources.interpretation.source === "luna" ? "Luna" : "Rules"}
                        </span>
                        <span>
                          Teaching: {proposal.sources.teaching.source === "none" ? "None" : proposal.sources.teaching.source === "luna" ? "Luna" : "Rules"}
                        </span>
                        <span>Visual valid: {proposal.can_accept.visual ? "yes" : "no"}</span>
                      </div>
                    ) : (
                      <p style={errorText}>{item.error?.message || "Generation failed."}</p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={metricCard}>
      <strong style={metricValue}>{value.toLocaleString()}</strong>
      <span style={metricLabel}>{label}</span>
    </div>
  );
}

const stack: CSSProperties = { display: "grid", gap: 18 };
const safeBanner: CSSProperties = {
  border: "1px solid rgba(88,215,255,.32)",
  background: "rgba(23,52,95,.55)",
  borderRadius: 14,
  padding: "13px 15px",
  lineHeight: 1.5,
};
const errorBanner: CSSProperties = {
  border: "1px solid rgba(248,113,113,.45)",
  background: "rgba(127,29,29,.28)",
  color: "#FECACA",
  borderRadius: 12,
  padding: 14,
};
const card: CSSProperties = {
  border: "1px solid rgba(148,163,184,.18)",
  background: "rgba(8,20,42,.9)",
  borderRadius: 16,
  padding: 18,
  display: "grid",
  gap: 16,
};
const eyebrow: CSSProperties = { margin: 0, fontSize: 12, letterSpacing: ".12em", color: "#7EE8FF", fontWeight: 800 };
const heading: CSSProperties = { margin: "4px 0 0", fontSize: 22 };
const muted: CSSProperties = { margin: "6px 0 0", color: "#A9B8D0", lineHeight: 1.5 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 };
const label: CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 700 };
const input: CSSProperties = { width: "100%", border: "1px solid rgba(148,163,184,.28)", background: "#0B1730", color: "#F8FBFF", borderRadius: 10, padding: "10px 11px" };
const buttonRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10 };
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: "10px 14px", background: "#58D7FF", color: "#071226", fontWeight: 900, cursor: "pointer" };
const secondaryButton: CSSProperties = { border: "1px solid rgba(126,232,255,.35)", borderRadius: 10, padding: "10px 14px", background: "rgba(8,20,42,.65)", color: "#DFF8FF", fontWeight: 800, cursor: "pointer" };
const summaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 };
const metricCard: CSSProperties = { border: "1px solid rgba(148,163,184,.18)", background: "rgba(8,20,42,.86)", borderRadius: 14, padding: 14, display: "grid", gap: 4 };
const metricValue: CSSProperties = { fontSize: 24, color: "#F8FBFF" };
const metricLabel: CSSProperties = { fontSize: 12, color: "#9FB1CB", textTransform: "uppercase", letterSpacing: ".07em" };
const sectionHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" };
const filterRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const filterButton: CSSProperties = { border: "1px solid rgba(148,163,184,.22)", background: "transparent", color: "#B7C5D9", borderRadius: 999, padding: "7px 10px", cursor: "pointer", textTransform: "capitalize" };
const filterActive: CSSProperties = { ...filterButton, borderColor: "rgba(88,215,255,.6)", background: "rgba(88,215,255,.12)", color: "#DFF8FF" };
const resultList: CSSProperties = { display: "grid", gap: 10 };
const resultCard: CSSProperties = { border: "1px solid rgba(148,163,184,.15)", borderRadius: 12, padding: 13, background: "rgba(4,12,27,.65)" };
const resultHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" };
const promptText: CSSProperties = { margin: "4px 0 0", color: "#C5D0E0", lineHeight: 1.45 };
const resultFacts: CSSProperties = { marginTop: 10, display: "flex", flexWrap: "wrap", gap: "7px 14px", color: "#9FB1CB", fontSize: 12 };
const errorText: CSSProperties = { color: "#FCA5A5", margin: "8px 0 0" };
function statusPill(status: string): CSSProperties {
  const good = status === "generated" || status === "not_needed";
  return {
    whiteSpace: "nowrap",
    borderRadius: 999,
    padding: "5px 9px",
    border: `1px solid ${good ? "rgba(104,211,145,.45)" : "rgba(251,191,36,.45)"}`,
    color: good ? "#A7F3D0" : "#FDE68A",
    background: good ? "rgba(6,78,59,.25)" : "rgba(120,53,15,.22)",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
  };
}
