"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

type PlayInfo = {
  quiz_id: string;
  club_id: string;
  club_name: string;
  club_slug: string;
  title: string;
  quiz_slug: string;
  description: string | null;
  cover_image_url: string | null;
  creator_display_name: string;
  question_count: number;
  is_admin: boolean;
  is_member: boolean;
  can_play: boolean;
  play_reason: string;
  user_best_percent: number;
  user_best_points: number;
  current_challenge_id: string | null;
  challenge_ends_at: string | null;
  is_premium: boolean;
  has_pack_entitlement: boolean;
  required_pack_id: string | null;
  required_pack_slug: string | null;
  required_pack_title: string | null;
  required_pack_price_cents: number | null;
};

type LiveQuestion = {
  question_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  topic: string | null;
  difficulty: number;
  started_at: string;
  deadline_at: string;
};

type AnswerFeedback = {
  is_correct: boolean;
  timed_out: boolean;
  correct_option: string;
  correct_answer: string;
  explanation: string | null;
  awarded_points: number;
  response_time_ms: number;
  attempt_completed: boolean;
  correct_count: number;
  score_percent: number;
  total_points: number;
  total_response_time_ms: number;
};

type AttemptReviewRow = {
  question_order: number;
  question: string;
  selected_option: string | null;
  selected_answer: string | null;
  correct_option: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string | null;
  awarded_points: number;
  response_time_ms: number;
};

type LeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  score_percent: number;
  total_points: number;
  total_response_time_ms: number;
  completed_at: string | null;
};

type ScreenState = "intro" | "playing" | "results";

function formatChallengeEnd(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CreatorQuizPlayerPage() {
  const params = useParams<{ slug: string; quizSlug: string }>();
  const router = useRouter();
  const clubSlug = decodeURIComponent(String(params?.slug || ""));
  const quizSlug = decodeURIComponent(String(params?.quizSlug || ""));

  const [hallAccess, setHallAccess] = useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [playInfo, setPlayInfo] = useState<PlayInfo | null>(null);
  const [screen, setScreen] = useState<ScreenState>("intro");
  const [timerSeconds, setTimerSeconds] = useState<10 | 20>(10);
  const [attemptId, setAttemptId] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(0);
  const [adminPreview, setAdminPreview] = useState(false);
  const [question, setQuestion] = useState<LiveQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [review, setReview] = useState<AttemptReviewRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [scorePercent, setScorePercent] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    void loadPlayInfo();
    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, [clubSlug, quizSlug]);

  async function loadPlayInfo() {
    setIsLoading(true);
    setErrorMessage("");
    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);
    if (!accessResult.access.canAccess) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_creator_quiz_play_info", {
      p_club_slug: clubSlug,
      p_quiz_slug: quizSlug,
    });
    if (error) {
      setErrorMessage(error.message || "Could not load creator quiz.");
      setIsLoading(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setPlayInfo(null);
      setIsLoading(false);
      return;
    }
    setPlayInfo({
      ...(row as PlayInfo),
      question_count: Number(row.question_count || 0),
      is_admin: Boolean(row.is_admin),
      is_member: Boolean(row.is_member),
      can_play: Boolean(row.can_play),
      user_best_percent: Number(row.user_best_percent || 0),
      user_best_points: Number(row.user_best_points || 0),
      is_premium: Boolean(row.is_premium),
      has_pack_entitlement: Boolean(row.has_pack_entitlement),
      required_pack_price_cents:
        row.required_pack_price_cents === null
          ? null
          : Number(row.required_pack_price_cents),
    });
    setIsLoading(false);
  }

  useEffect(() => {
    if (screen !== "playing" || !question || feedback) return;

    const deadlineAt = question.deadline_at;
    autoSubmittedRef.current = false;

    function tick() {
      const remainingMs = new Date(deadlineAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      if (remainingMs <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void submitAnswer(null);
      }
    }
    tick();
    const interval = window.setInterval(tick, 150);
    return () => window.clearInterval(interval);
  }, [screen, question?.deadline_at, feedback]);

  async function startQuiz() {
    if (!playInfo) return;
    if (!playInfo.can_play) {
      if (playInfo.play_reason === "login_required") {
        const next = `/milo-world/quiz-hall/clubs/${encodeURIComponent(clubSlug)}/quiz/${encodeURIComponent(quizSlug)}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (playInfo.play_reason === "join_required") {
        router.push(`/milo-world/quiz-hall/clubs/${encodeURIComponent(clubSlug)}`);
        return;
      }
      if (
        playInfo.play_reason === "pack_required" &&
        playInfo.required_pack_slug
      ) {
        router.push(
          `/milo-world/quiz-hall/clubs/${encodeURIComponent(
            clubSlug,
          )}/packs/${encodeURIComponent(playInfo.required_pack_slug)}`,
        );
        return;
      }
      setErrorMessage(
        playInfo.play_reason === "profile_required"
          ? "Complete your Dreamscape profile before playing Creator Club quizzes."
          : playInfo.play_reason === "age_restricted"
            ? "Creator Club quizzes are available to users aged 13 and above."
            : playInfo.play_reason === "pack_unavailable"
              ? "This premium quiz is no longer available for a new unlock."
              : "This quiz is not currently available to this account.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    const { data, error } = await supabase.rpc("start_creator_quiz_attempt", {
      p_quiz_id: playInfo.quiz_id,
      p_question_timer_seconds: timerSeconds,
    });
    if (error) {
      setErrorMessage(error.message || "Could not start quiz.");
      setIsSaving(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const nextAttemptId = String(row?.attempt_id || "");
    setAttemptId(nextAttemptId);
    setAttemptNumber(Number(row?.attempt_number || 1));
    setAdminPreview(Boolean(row?.is_admin_preview));
    setCorrectCount(0);
    setScorePercent(0);
    setTotalPoints(0);
    setReview([]);
    setLeaderboard([]);
    setReviewOpen(false);
    setScreen("playing");
    await loadQuestion(nextAttemptId, 1);
    setIsSaving(false);
  }

  async function loadQuestion(nextAttemptId: string, order: number) {
    setQuestion(null);
    setFeedback(null);
    setSelectedOption(null);
    autoSubmittedRef.current = false;
    const { data, error } = await supabase.rpc("begin_creator_quiz_question", {
      p_attempt_id: nextAttemptId,
      p_question_order: order,
    });
    if (error) {
      setErrorMessage(error.message || "Could not load question.");
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setErrorMessage("Question could not be loaded.");
      return;
    }
    const nextQuestion: LiveQuestion = {
      ...(row as LiveQuestion),
      question_order: Number(row.question_order || order),
      difficulty: Number(row.difficulty || 1),
    };
    setQuestion(nextQuestion);
    setSecondsLeft(
      Math.max(0, Math.ceil((new Date(nextQuestion.deadline_at).getTime() - Date.now()) / 1000)),
    );
  }

  async function submitAnswer(option: string | null) {
    if (!question || !attemptId || feedback || isSaving) return;
    setIsSaving(true);
    setSelectedOption(option);
    const { data, error } = await supabase.rpc("submit_creator_quiz_answer", {
      p_attempt_id: attemptId,
      p_question_order: question.question_order,
      p_selected_option: option,
    });
    if (error) {
      setErrorMessage(error.message || "Could not submit answer.");
      setIsSaving(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const next: AnswerFeedback = {
      ...(row as AnswerFeedback),
      is_correct: Boolean(row.is_correct),
      timed_out: Boolean(row.timed_out),
      awarded_points: Number(row.awarded_points || 0),
      response_time_ms: Number(row.response_time_ms || 0),
      attempt_completed: Boolean(row.attempt_completed),
      correct_count: Number(row.correct_count || 0),
      score_percent: Number(row.score_percent || 0),
      total_points: Number(row.total_points || 0),
      total_response_time_ms: Number(row.total_response_time_ms || 0),
    };
    setFeedback(next);
    setCorrectCount(next.correct_count);
    setScorePercent(next.score_percent);
    setTotalPoints(next.total_points);
    setIsSaving(false);
  }

  async function nextQuestion() {
    if (!question || !feedback) return;
    if (feedback.attempt_completed || question.question_order >= 10) {
      await finishQuiz();
      return;
    }
    await loadQuestion(attemptId, question.question_order + 1);
  }

  async function finishQuiz() {
    setIsLoading(true);
    const [reviewResponse, leaderboardResponse] = await Promise.all([
      supabase.rpc("get_creator_quiz_attempt_review", { p_attempt_id: attemptId }),
      playInfo
        ? supabase.rpc("get_creator_quiz_leaderboard", { p_quiz_id: playInfo.quiz_id, p_limit: 10 })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (!reviewResponse.error) {
      setReview(((reviewResponse.data || []) as AttemptReviewRow[]).map((r) => ({
        ...r,
        question_order: Number(r.question_order || 0),
        is_correct: Boolean(r.is_correct),
        awarded_points: Number(r.awarded_points || 0),
        response_time_ms: Number(r.response_time_ms || 0),
      })));
    }
    if (!leaderboardResponse.error) {
      setLeaderboard(((leaderboardResponse.data || []) as LeaderboardRow[]).map((r) => ({
        ...r,
        rank: Number(r.rank || 0),
        score_percent: Number(r.score_percent || 0),
        total_points: Number(r.total_points || 0),
        total_response_time_ms: Number(r.total_response_time_ms || 0),
      })));
    }
    setScreen("results");
    setIsLoading(false);
  }

  function resetForReplay() {
    setScreen("intro");
    setAttemptId("");
    setAttemptNumber(0);
    setQuestion(null);
    setFeedback(null);
    setSelectedOption(null);
    setCorrectCount(0);
    setScorePercent(0);
    setTotalPoints(0);
    setReview([]);
    setLeaderboard([]);
    setReviewOpen(false);
    setErrorMessage("");
    void loadPlayInfo();
  }

  const options = useMemo(
    () =>
      question
        ? [["A", question.option_a], ["B", question.option_b], ["C", question.option_c], ["D", question.option_d]]
        : [],
    [question],
  );

  if (isLoading && !playInfo && screen === "intro") {
    return <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/56">Loading creator quiz...</main>;
  }
  if (hallAccess && !hallAccess.canAccess) return <CreatorClubsLockedScreen />;
  if (!playInfo) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-center">
          <h1 className="text-3xl font-black">Quiz unavailable</h1>
          <p className="mt-3 text-sm text-white/46">This creator quiz is not currently published.</p>
          <Link href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(clubSlug)}`} className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline">Back to Club</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      {playInfo.cover_image_url && <img src={playInfo.cover_image_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-10" />}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(83,215,255,0.11),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.09),transparent_30%),linear-gradient(180deg,rgba(2,7,17,0.94),rgba(2,7,17,1))]" />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/7 px-3 py-3 sm:px-5">
          <Link href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(clubSlug)}`} className="inline-flex min-h-[38px] items-center rounded-full border border-white/11 bg-white/[0.035] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-white/52 no-underline">← {playInfo.club_name}</Link>
          <div className="min-w-0 text-center"><p className="truncate text-[7px] font-black uppercase tracking-[0.14em] text-cyan-100/52">by {playInfo.creator_display_name}</p><strong className="block max-w-[48vw] truncate text-sm sm:text-base">{playInfo.title}</strong></div>
          <span className="rounded-full border border-white/9 bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-white/40">{screen === "playing" ? `Q${question?.question_order || 1}/10` : "Creator Quiz"}</span>
        </header>

        {errorMessage && <p className="mx-3 mt-2 shrink-0 rounded-xl border border-red-200/14 bg-red-400/[0.07] px-3 py-2 text-center text-[10px] text-red-100 sm:mx-5">{errorMessage}</p>}

        {screen === "intro" ? (
          <section className="flex min-h-0 flex-1 items-center justify-center p-4">
            <div className="w-full max-w-[760px] rounded-[30px] border border-cyan-200/13 bg-white/[0.045] p-6 text-center backdrop-blur-xl sm:p-8">
              <div className="flex flex-wrap justify-center gap-2">
                {playInfo.current_challenge_id && (
                  <span className="inline-flex rounded-full border border-amber-200/18 bg-amber-300/[0.08] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100">
                    Current Club Challenge
                    {playInfo.challenge_ends_at
                      ? ` · Ends ${formatChallengeEnd(playInfo.challenge_ends_at)}`
                      : ""}
                  </span>
                )}
                {playInfo.is_premium && (
                  <span className="inline-flex rounded-full border border-violet-200/18 bg-violet-300/[0.08] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-violet-100">
                    Premium Pack Quiz
                    {playInfo.has_pack_entitlement ? " · Owned" : ""}
                  </span>
                )}
              </div>
              <h1 className="mt-4 font-serif text-[clamp(40px,7vw,68px)] font-normal leading-[0.94]">{playInfo.title}</h1>
              {playInfo.description && <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/50">{playInfo.description}</p>}
              <div className="mx-auto mt-6 grid max-w-[560px] grid-cols-3 gap-2"><Metric label="Questions" value="10" /><Metric label="Best Score" value={`${playInfo.user_best_percent}%`} /><Metric label="Best Points" value={playInfo.user_best_points.toString()} /></div>
              {playInfo.is_admin && <p className="mx-auto mt-4 max-w-xl rounded-xl border border-violet-200/14 bg-violet-400/[0.06] px-4 py-3 text-[10px] text-violet-100">Admin Preview: this result is saved for QA but excluded from public leaderboards.</p>}
              {!playInfo.can_play && (
                <p className="mx-auto mt-4 max-w-xl rounded-xl border border-amber-200/14 bg-amber-400/[0.06] px-4 py-3 text-[10px] leading-5 text-amber-100">
                  {playInfo.play_reason === "login_required"
                    ? "Log in to play Creator Club quizzes."
                    : playInfo.play_reason === "join_required"
                      ? "Join this Creator Club for free before playing."
                      : playInfo.play_reason === "profile_required"
                        ? "Complete your Dreamscape profile before playing."
                        : playInfo.play_reason === "age_restricted"
                          ? "Creator Club quizzes are available to users aged 13 and above."
                          : playInfo.play_reason === "pack_required"
                            ? `This quiz is part of ${
                                playInfo.required_pack_title || "a premium pack"
                              }. Unlock the pack for permanent access.`
                            : playInfo.play_reason === "pack_unavailable"
                              ? "This premium quiz is not currently available for a new unlock."
                              : "This quiz is not available to this account."}
                </p>
              )}
              <p className="mt-6 text-[8px] font-black uppercase tracking-[0.12em] text-white/32">Question Timer</p>
              <div className="mt-2 inline-flex rounded-full border border-white/9 bg-black/18 p-1">
                {[10,20].map((seconds) => <button key={seconds} type="button" onClick={() => setTimerSeconds(seconds as 10|20)} className={`min-h-9 rounded-full px-5 text-[9px] font-black uppercase tracking-[0.08em] ${timerSeconds === seconds ? "bg-cyan-300/12 text-cyan-100" : "text-white/36"}`}>{seconds}s</button>)}
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void startQuiz()}
                className="mt-6 min-h-12 rounded-full border border-cyan-200/24 bg-cyan-300/10 px-7 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:opacity-40"
              >
                {isSaving
                  ? "Starting..."
                  : playInfo.can_play
                    ? "Start Quiz"
                    : playInfo.play_reason === "login_required"
                      ? "Log In to Play"
                      : playInfo.play_reason === "join_required"
                        ? "Join Club to Play"
                        : playInfo.play_reason === "pack_required"
                          ? "View Premium Pack"
                          : "Cannot Play Yet"}
              </button>
              <p className="mt-4 text-[9px] leading-4 text-white/25">Correct answers earn 100 base points plus up to 50 speed points. 10s and 20s modes use the same proportional speed bonus.</p>
            </div>
          </section>
        ) : screen === "playing" ? (
          <section className="flex min-h-0 flex-1 flex-col p-3 sm:p-5">
            <div className="mx-auto flex w-full max-w-[1180px] shrink-0 items-center gap-3">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-cyan-300/70 transition-all" style={{width:`${((question?.question_order || 1)/10)*100}%`}} /></div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-black ${feedback ? "border-white/10 bg-white/[0.035] text-white/40" : secondsLeft <= 3 ? "border-red-200/26 bg-red-400/10 text-red-100" : "border-cyan-200/20 bg-cyan-300/[0.07] text-cyan-100"}`}>{feedback ? "✓" : secondsLeft}</div>
              <div className="hidden gap-2 sm:flex"><Pill label="Correct" value={`${correctCount}/10`} /><Pill label="Points" value={totalPoints.toString()} /></div>
            </div>

            <div className="mx-auto mt-3 grid min-h-0 w-full max-w-[1180px] flex-1 gap-3 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
              <article className="flex min-h-0 flex-col justify-center rounded-[26px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-7">
                {question ? <>
                  <div className="flex flex-wrap gap-2"><Badge>Question {question.question_order}</Badge>{question.topic && <Badge>{question.topic}</Badge>}<Badge>Difficulty {question.difficulty}</Badge></div>
                  <h2 className="mt-5 text-[clamp(22px,3vw,38px)] font-black leading-[1.18]">{question.question}</h2>
                  {feedback && <div className={`mt-5 rounded-2xl border p-4 ${feedback.is_correct ? "border-emerald-200/17 bg-emerald-400/[0.065]" : "border-amber-200/17 bg-amber-400/[0.065]"}`}>
                    <strong className={`text-sm ${feedback.is_correct ? "text-emerald-100" : "text-amber-100"}`}>{feedback.is_correct ? `Correct · +${feedback.awarded_points} points` : feedback.timed_out ? "Time’s up" : "Not quite"}</strong>
                    {!feedback.is_correct && <p className="mt-2 text-[10px] leading-5 text-white/52">Correct answer: <strong className="text-white">{feedback.correct_option}. {feedback.correct_answer}</strong></p>}
                    {feedback.explanation && <p className="mt-2 text-[10px] leading-5 text-white/44">{feedback.explanation}</p>}
                  </div>}
                </> : <p className="text-center text-sm text-white/40">Loading question...</p>}
              </article>

              <section className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                {options.map(([letter,answer]) => {
                  const selected = selectedOption === letter;
                  const correct = Boolean(feedback && feedback.correct_option === letter);
                  return <button key={letter} type="button" disabled={Boolean(feedback) || isSaving} onClick={() => void submitAnswer(letter)} className={`min-h-[88px] rounded-[22px] border p-4 text-left transition sm:min-h-[120px] ${feedback ? correct ? "border-emerald-200/28 bg-emerald-400/[0.09]" : selected ? "border-red-200/22 bg-red-400/[0.07]" : "border-white/8 bg-white/[0.025] opacity-55" : "border-white/10 bg-white/[0.04] hover:border-cyan-200/24 hover:bg-cyan-300/[0.05]"}`}>
                    <div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black ${correct ? "border-emerald-200/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-black/16 text-white/44"}`}>{letter}</span><span className="text-[clamp(12px,1.3vw,16px)] font-bold leading-5 text-white/80">{answer}</span></div>
                  </button>;
                })}
              </section>
            </div>

            <div className="mx-auto mt-3 flex w-full max-w-[1180px] shrink-0 items-center justify-between gap-3">
              <div className="flex gap-2 sm:hidden"><Pill label="Correct" value={`${correctCount}/10`} /><Pill label="Points" value={totalPoints.toString()} /></div>
              <span className="hidden text-[9px] text-white/28 sm:block">Attempt {attemptNumber} · {timerSeconds}s timer</span>
              {feedback && <button type="button" onClick={() => void nextQuestion()} className="ml-auto min-h-11 rounded-full border border-cyan-200/22 bg-cyan-300/10 px-6 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{feedback.attempt_completed ? "See Results" : "Next →"}</button>}
            </div>
          </section>
        ) : (
          <section className="dream-results mx-auto min-h-0 w-full max-w-[1100px] flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 text-center backdrop-blur-xl sm:p-8">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/60">Quiz Complete</p>
              <h1 className="mt-2 font-serif text-5xl font-normal sm:text-6xl">{scorePercent}%</h1>
              <p className="mt-2 text-sm text-white/44">{correctCount}/10 correct · {totalPoints.toLocaleString()} leaderboard points</p>
              {adminPreview && <p className="mx-auto mt-4 max-w-xl rounded-xl border border-violet-200/14 bg-violet-400/[0.06] px-4 py-3 text-[10px] text-violet-100">Admin Preview result saved for QA only. It is excluded from quiz, club and challenge rankings.</p>}
              <div className="mx-auto mt-6 grid max-w-[620px] grid-cols-3 gap-2"><Metric label="Correct" value={`${correctCount}/10`} /><Metric label="Score" value={`${scorePercent}%`} /><Metric label="Points" value={totalPoints.toString()} /></div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setReviewOpen((v) => !v)} className="min-h-11 rounded-full border border-violet-200/18 bg-violet-400/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100">{reviewOpen ? "Hide Review" : "Review Answers"}</button>
                <button type="button" onClick={resetForReplay} className="min-h-11 rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">Play Again</button>
                <Link href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(clubSlug)}`} className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.035] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-white/44 no-underline">Back to Club</Link>
              </div>
            </div>

            {reviewOpen && <section className="mt-4 rounded-[26px] border border-violet-200/11 bg-white/[0.035] p-4 sm:p-5"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-100/58">Answer Review</p><div className="mt-3 space-y-2">{review.map((r) => <article key={r.question_order} className="rounded-xl border border-white/8 bg-black/14 p-3"><div className="flex items-start gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[9px] font-black ${r.is_correct ? "border-emerald-200/16 bg-emerald-400/[0.07] text-emerald-100" : "border-red-200/16 bg-red-400/[0.07] text-red-100"}`}>{r.question_order}</span><div className="min-w-0 flex-1"><strong className="text-[10px] leading-5">{r.question}</strong><p className="mt-2 text-[9px] text-white/40">Your answer: <span className="text-white/66">{r.selected_option ? `${r.selected_option}. ${r.selected_answer || ""}` : "No answer / timed out"}</span></p>{!r.is_correct && <p className="mt-1 text-[9px] text-emerald-100/72">Correct: {r.correct_option}. {r.correct_answer}</p>}{r.explanation && <p className="mt-1 text-[9px] leading-4 text-white/32">{r.explanation}</p>}</div><strong className="shrink-0 text-[9px] text-cyan-100/66">+{r.awarded_points}</strong></div></article>)}</div></section>}

            {!adminPreview && <section className="mt-4 rounded-[26px] border border-cyan-200/11 bg-white/[0.035] p-4 sm:p-5"><p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/58">Quiz Leaderboard</p>{leaderboard.length === 0 ? <p className="mt-3 text-[10px] text-white/32">No ranked attempts yet.</p> : <div className="mt-3 grid gap-2 md:grid-cols-2">{leaderboard.map((r) => <div key={`${r.rank}-${r.user_id}`} className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/7 bg-black/14 px-3 py-2"><strong className={`text-sm ${r.rank <= 3 ? "text-amber-100" : "text-white/32"}`}>{r.rank}</strong><span className="truncate text-[10px]">{r.display_name}</span><span className="text-right"><strong className="block text-[10px] text-cyan-100">{r.total_points} pts</strong><small className="text-[8px] text-white/28">{r.score_percent}%</small></span></div>)}</div>}</section>}
          </section>
        )}
      </div>
      <style jsx>{`.dream-results{scrollbar-width:thin;scrollbar-color:rgba(126,232,255,.28) rgba(255,255,255,.04)}.dream-results::-webkit-scrollbar{width:7px}.dream-results::-webkit-scrollbar-thumb{background:rgba(126,232,255,.28);border-radius:999px}`}</style>
    </main>
  );
}

function Metric({ label, value }: { label:string; value:string }) {
  return <div className="rounded-2xl border border-white/9 bg-black/16 px-3 py-3"><strong className="block text-lg">{value}</strong><span className="mt-1 block text-[7px] font-black uppercase tracking-[0.09em] text-white/28">{label}</span></div>;
}
function Pill({ label, value }: { label:string; value:string }) {
  return <span className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-2 text-[8px] text-white/36">{label} <strong className="ml-1 text-white/70">{value}</strong></span>;
}
function Badge({ children }: { children:React.ReactNode }) {
  return <span className="rounded-full border border-white/9 bg-white/[0.025] px-3 py-1 text-[8px] font-black uppercase tracking-[0.09em] text-white/36">{children}</span>;
}
