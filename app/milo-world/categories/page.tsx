"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CategoryQuizQuestion = {
  id: string;
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string | null;
};

type CategoriesStage =
  | "mode"
  | "category"
  | "playing"
  | "answered"
  | "finished";

const fallbackCategoryNames = ["Geography", "Science"];

export default function MiloCategoriesPage() {
  const [categoriesStage, setCategoriesStage] =
    useState<CategoriesStage>("mode");

  const [categoryMode, setCategoryMode] = useState<"single" | "multiplayer">(
    "single"
  );

  const [availableCategories, setAvailableCategories] =
    useState<string[]>(fallbackCategoryNames);

  const [selectedCategory, setSelectedCategory] = useState(
    fallbackCategoryNames[0]
  );

  const [categoryQuestions, setCategoryQuestions] = useState<
    CategoryQuizQuestion[]
  >([]);

  const [categoryQuestionIndex, setCategoryQuestionIndex] = useState(0);

  const [selectedCategoryAnswer, setSelectedCategoryAnswer] =
    useState<"A" | "B" | "C" | "D" | null>(null);

  const [categoryScore, setCategoryScore] = useState(0);
  const [questionCountdown, setQuestionCountdown] = useState(10);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(3);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [isLoadingCategoryQuiz, setIsLoadingCategoryQuiz] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const currentCategoryQuestion = categoryQuestions[categoryQuestionIndex];

  useEffect(() => {
    async function loadCategories() {
      setIsLoadingCategories(true);

      const { data, error } = await supabase
        .from("milo_category_questions")
        .select("category")
        .eq("is_active", true);

      if (error) {
        console.warn("Could not load Milo quiz categories:", error.message);
        setCategoryMessage(
          "Could not load categories from Supabase. Check the milo_category_questions table."
        );
        setIsLoadingCategories(false);
        return;
      }

      const uniqueCategories = Array.from(
        new Set((data || []).map((item) => item.category).filter(Boolean))
      );

      if (uniqueCategories.length > 0) {
        setAvailableCategories(uniqueCategories);
        setSelectedCategory(uniqueCategories[0]);
      } else {
        setCategoryMessage(
          "No active categories found yet. Add active questions in Supabase."
        );
      }

      setIsLoadingCategories(false);
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (categoriesStage !== "playing") return;
    if (!currentCategoryQuestion) return;

    if (questionCountdown <= 0) {
      submitCategoryAnswer(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setQuestionCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [categoriesStage, questionCountdown, currentCategoryQuestion]);

  useEffect(() => {
    if (categoriesStage !== "answered") return;

    if (nextQuestionCountdown <= 0) {
      goToNextCategoryQuestion();
      return;
    }

    const timer = window.setTimeout(() => {
      setNextQuestionCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [categoriesStage, nextQuestionCountdown]);

  function chooseCategoriesMode(mode: "single" | "multiplayer") {
    setCategoryMode(mode);

    if (mode === "multiplayer") {
      setCategoryMessage(
        "Multiplayer mode is coming soon. Single player is ready now."
      );
      return;
    }

    setCategoryMessage("");
    setCategoriesStage("category");
  }

  async function startSinglePlayerCategoryQuiz() {
    setIsLoadingCategoryQuiz(true);
    setCategoryMessage("");

    const { data, error } = await supabase.rpc("get_milo_category_quiz", {
      p_category: selectedCategory,
      p_limit: 10,
    });

    if (error) {
      setCategoryMessage(`Could not load quiz: ${error.message}`);
      setIsLoadingCategoryQuiz(false);
      return;
    }

    const questions = (data || []) as CategoryQuizQuestion[];

    if (questions.length < 10) {
      setCategoryMessage(
        `This category needs at least 10 active questions. It currently has ${questions.length}.`
      );
      setIsLoadingCategoryQuiz(false);
      return;
    }

    setCategoryQuestions(questions);
    setCategoryQuestionIndex(0);
    setSelectedCategoryAnswer(null);
    setCategoryScore(0);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoriesStage("playing");
    setIsLoadingCategoryQuiz(false);
  }

  function resetCategoriesQuiz() {
    setCategoriesStage("mode");
    setCategoryQuestions([]);
    setCategoryQuestionIndex(0);
    setSelectedCategoryAnswer(null);
    setCategoryScore(0);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoryMessage("");
  }

  function submitCategoryAnswer(answer: "A" | "B" | "C" | "D" | null) {
    if (!currentCategoryQuestion) return;
    if (categoriesStage !== "playing") return;

    const finalAnswer = answer || selectedCategoryAnswer;
    const isCorrect = finalAnswer === currentCategoryQuestion.correct_option;

    if (isCorrect) {
      setCategoryScore((score) => score + 1);
    }

    setSelectedCategoryAnswer(finalAnswer);
    setCategoryMessage(
      finalAnswer ? (isCorrect ? "Correct." : "Not quite.") : "Time is up."
    );

    setNextQuestionCountdown(3);
    setCategoriesStage("answered");
  }

  function goToNextCategoryQuestion() {
    const nextIndex = categoryQuestionIndex + 1;

    if (nextIndex >= categoryQuestions.length) {
      setCategoriesStage("finished");
      return;
    }

    setCategoryQuestionIndex(nextIndex);
    setSelectedCategoryAnswer(null);
    setQuestionCountdown(10);
    setNextQuestionCountdown(3);
    setCategoryMessage("");
    setCategoriesStage("playing");
  }

  function getCategoryOptionClass(optionLetter: "A" | "B" | "C" | "D") {
    const isSelected = selectedCategoryAnswer === optionLetter;
    const isCorrect = currentCategoryQuestion?.correct_option === optionLetter;
    const showResult = categoriesStage === "answered";

    if (showResult && isCorrect) {
      return "border-green-300/70 bg-green-400/18 text-green-100";
    }

    if (showResult && isSelected && !isCorrect) {
      return "border-red-300/70 bg-red-400/18 text-red-100";
    }

    if (!showResult && isSelected) {
      return "border-cyan-300/70 bg-cyan-300/16 text-white";
    }

    return "border-cyan-200/14 bg-white/[0.045] text-white/82 hover:border-cyan-200/34 hover:bg-white/[0.075]";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/milo-world"
          className="inline-flex h-11 items-center rounded-full border border-cyan-200/25 bg-white/6 px-5 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45"
        >
          ← Back to Milo’s World
        </Link>

        <section className="mt-14 text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
            Activity Lab
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            Categories
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/62">
            10 random questions. 10 seconds per question. Questions are loaded
            from Supabase.
          </p>
        </section>

        <section className="mx-auto mt-12 max-w-3xl rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-8">
          {categoriesStage === "mode" && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                Choose Mode
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseCategoriesMode("single")}
                  className="min-h-[180px] rounded-3xl border border-cyan-200/18 bg-[#061632]/75 p-6 text-left transition hover:scale-[1.02] hover:border-cyan-200/40"
                >
                  <span className="text-2xl font-bold">Single Player</span>
                  <span className="mt-3 block text-sm leading-6 text-white/58">
                    Start a 10-question timed quiz using questions from
                    Supabase.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => chooseCategoriesMode("multiplayer")}
                  className="min-h-[180px] rounded-3xl border border-orange-200/18 bg-orange-300/10 p-6 text-left transition hover:scale-[1.02] hover:border-orange-200/40"
                >
                  <span className="text-2xl font-bold">Multiplayer</span>
                  <span className="mt-3 block text-sm leading-6 text-white/58">
                    Coming next: challenge another player in real time.
                  </span>
                </button>
              </div>
            </>
          )}

          {categoriesStage === "category" && (
            <>
              <button
                type="button"
                onClick={() => setCategoriesStage("mode")}
                className="text-sm font-bold text-[#7ee8ff]"
              >
                ← Back to mode select
              </button>

              <div className="mt-7">
                <label className="grid gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/44">
                    Choose Topic
                  </span>

                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="h-12 rounded-2xl border border-cyan-200/18 bg-[#061632] px-4 text-white outline-none"
                  >
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={startSinglePlayerCategoryQuiz}
                  disabled={isLoadingCategoryQuiz || isLoadingCategories}
                  className="mt-5 h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-50"
                >
                  {isLoadingCategoryQuiz
                    ? "Loading Quiz..."
                    : "Start 10-Question Quiz"}
                </button>
              </div>
            </>
          )}

          {(categoriesStage === "playing" || categoriesStage === "answered") &&
            currentCategoryQuestion && (
              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#7ee8ff]">
                    {selectedCategory}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/72">
                    Question {categoryQuestionIndex + 1} / 10
                  </span>

                  <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-4 py-2 text-xs font-bold text-orange-100">
                    {categoriesStage === "answered"
                      ? `Next in ${nextQuestionCountdown}s`
                      : `${questionCountdown}s`}
                  </span>
                </div>

                <h2 className="text-2xl font-bold leading-snug text-white sm:text-3xl">
                  {currentCategoryQuestion.question}
                </h2>

                <div className="mt-7 grid gap-3">
                  {[
                    ["A", currentCategoryQuestion.option_a],
                    ["B", currentCategoryQuestion.option_b],
                    ["C", currentCategoryQuestion.option_c],
                    ["D", currentCategoryQuestion.option_d],
                  ].map(([letter, answer]) => (
                    <button
                      key={letter}
                      type="button"
                      disabled={categoriesStage === "answered"}
                      onClick={() =>
                        submitCategoryAnswer(letter as "A" | "B" | "C" | "D")
                      }
                      className={`min-h-[58px] rounded-2xl border px-5 py-4 text-left text-sm font-bold transition ${getCategoryOptionClass(
                        letter as "A" | "B" | "C" | "D"
                      )}`}
                    >
                      {letter}. {answer}
                    </button>
                  ))}
                </div>

                {categoryMessage && (
                  <p className="mt-5 text-sm font-bold leading-6 text-[#7ee8ff]">
                    {categoryMessage}
                    {categoriesStage === "answered" &&
                      currentCategoryQuestion.explanation && (
                        <>
                          <br />
                          <span className="font-normal text-white/56">
                            {currentCategoryQuestion.explanation}
                          </span>
                        </>
                      )}
                  </p>
                )}
              </div>
            )}

          {categoriesStage === "finished" && (
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                Quiz Complete
              </p>

              <h2 className="mt-4 text-5xl font-extrabold">
                {categoryScore} / 10
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/58">
                {categoryScore >= 8
                  ? "Excellent. That was a strong mastery score."
                  : categoryScore >= 6
                  ? "Good pass. Try another category to improve your score."
                  : "Keep practising. These questions are designed to be tougher."}
              </p>

              <button
                type="button"
                onClick={resetCategoriesQuiz}
                className="mt-7 h-13 w-full rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01]"
              >
                Back to Mode Select
              </button>
            </div>
          )}

          {categoryMessage && categoriesStage === "mode" && (
            <p className="mt-5 text-sm font-bold leading-6 text-[#7ee8ff]">
              {categoryMessage}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}