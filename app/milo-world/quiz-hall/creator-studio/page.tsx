"use client";



import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";

import CreatorChallengeCyclePanel from "@/components/milo/CreatorChallengeCyclePanel";
import CreatorReputationPanel from "@/components/milo/CreatorReputationPanel";
import CreatorRewardsPanel from "@/components/milo/CreatorRewardsPanel";
import CreatorEngineV2Builder from "@/components/milo/creator-engine/CreatorEngineV2Builder";
import CreatorClubPlaySettings from "@/components/milo/creator-engine/CreatorClubPlaySettings";
import CreatorEngagementPanel from "@/components/milo/creator-engine/CreatorEngagementPanel";
import CreatorClubProgressionPanel from "@/components/milo/creator-engine/CreatorClubProgressionPanel";
import CreatorClubUpgradeStore from "@/components/milo/creator-engine/CreatorClubUpgradeStore";
import CreatorClubSettingsPanel from "@/components/milo/creator-engine/CreatorClubSettingsPanel";

import {

  getMiloQuizHallCreatorClubsAccess,

  type MiloQuizHallCreatorClubsAccess,

} from "@/lib/milo-quiz-hall-access";



type CreatorAccess = {

  creator_partner_id: string;

  display_name: string;

  slug: string;

  status: string;

};



type CreatorClub = {

  club_id: string;

  club_name: string;

  club_slug: string;

  topic: string | null;

  status: string;

};



type CreatorQuiz = {

  quiz_id: string;

  club_id: string;

  club_name: string;

  title: string;

  slug: string;

  description: string | null;

  cover_image_url: string | null;

  status: "draft" | "submitted" | "published" | "rejected" | "archived";

  question_count: number;

  review_note: string | null;

  submitted_at: string | null;

  reviewed_at: string | null;

  published_at: string | null;

  created_at: string;

  updated_at: string;

};



type QuizQuestion = {

  id: string;

  quiz_id: string;

  question_order: number;

  question: string;

  option_a: string;

  option_b: string;

  option_c: string;

  option_d: string;

  correct_option: "A" | "B" | "C" | "D";

  explanation: string | null;

  topic: string | null;

  difficulty: number;

};



type QuizMetaForm = {

  clubId: string;

  title: string;

  slug: string;

  description: string;

  coverImageUrl: string;

};



type StudioView =
  | "overview"
  | "challenges"
  | "community"
  | "growth"
  | "rewards"
  | "settings";

type QuestionForm = {

  questionOrder: number;

  question: string;

  optionA: string;

  optionB: string;

  optionC: string;

  optionD: string;

  correctOption: "A" | "B" | "C" | "D";

  explanation: string;

  topic: string;

  difficulty: number;

};



const EMPTY_META: QuizMetaForm = {

  clubId: "",

  title: "",

  slug: "",

  description: "",

  coverImageUrl: "",

};



function emptyQuestion(order = 1): QuestionForm {

  return {

    questionOrder: order,

    question: "",

    optionA: "",

    optionB: "",

    optionC: "",

    optionD: "",

    correctOption: "A",

    explanation: "",

    topic: "",

    difficulty: 2,

  };

}



function slugify(value: string) {

  return value

    .trim()

    .toLowerCase()

    .replace(/['’]/g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-+|-+$/g, "")

    .slice(0, 70);

}



function quizStatusLabel(status: CreatorQuiz["status"]) {
  if (status === "submitted") return "Pending Approval";
  if (status === "rejected") return "Changes Needed";
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

function quizStatusClass(status: CreatorQuiz["status"]) {

  if (status === "published") {

    return "border-emerald-200/22 bg-emerald-400/10 text-emerald-100";

  }

  if (status === "submitted") {

    return "border-cyan-200/22 bg-cyan-400/10 text-cyan-100";

  }

  if (status === "rejected") {

    return "border-red-200/22 bg-red-400/10 text-red-100";

  }

  if (status === "archived") {

    return "border-white/12 bg-white/[0.04] text-white/42";

  }

  return "border-violet-200/22 bg-violet-400/10 text-violet-100";

}



function formFromQuestion(question: QuizQuestion): QuestionForm {

  return {

    questionOrder: Number(question.question_order),

    question: question.question || "",

    optionA: question.option_a || "",

    optionB: question.option_b || "",

    optionC: question.option_c || "",

    optionD: question.option_d || "",

    correctOption: question.correct_option || "A",

    explanation: question.explanation || "",

    topic: question.topic || "",

    difficulty: Number(question.difficulty || 2),

  };

}



export default function CreatorStudioPage() {

  const router = useRouter();



  const [creator, setCreator] = useState<CreatorAccess | null>(null);

  const [hallAccess, setHallAccess] =

    useState<MiloQuizHallCreatorClubsAccess | null>(null);

  const [clubs, setClubs] = useState<CreatorClub[]>([]);

  const [quizzes, setQuizzes] = useState<CreatorQuiz[]>([]);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);



  const [selectedQuizId, setSelectedQuizId] = useState("");

  const [selectedQuestionOrder, setSelectedQuestionOrder] = useState(1);



  const [createForm, setCreateForm] = useState<QuizMetaForm>(EMPTY_META);

  const [createSlugTouched, setCreateSlugTouched] = useState(false);

  const [editForm, setEditForm] = useState<QuizMetaForm>(EMPTY_META);

  const [questionForm, setQuestionForm] = useState<QuestionForm>(

    emptyQuestion(1),

  );



  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [studioView, setStudioView] = useState<StudioView>("overview");
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [dreamTokenLoading, setDreamTokenLoading] = useState(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);



  const selectedQuiz = useMemo(

    () => quizzes.find((quiz) => quiz.quiz_id === selectedQuizId) || null,

    [quizzes, selectedQuizId],

  );



  const savedOrders = useMemo(

    () => new Set(questions.map((question) => Number(question.question_order))),

    [questions],

  );



  const canEditSelected =

    selectedQuiz?.status === "draft" || selectedQuiz?.status === "rejected";

  const publishedCount = quizzes.filter(
    (quiz) => quiz.status === "published",
  ).length;
  const pendingCount = quizzes.filter(
    (quiz) => quiz.status === "submitted",
  ).length;
  const completeChallenge = quizzes.find(
    (quiz) => Number(quiz.question_count || 0) >= 10,
  );
  const firstEditableChallenge =
    quizzes.find((quiz) => quiz.status === "draft" || quiz.status === "rejected") ||
    quizzes[0] ||
    null;
  const primaryClub = clubs[0] || null;



  useEffect(() => {

    const oldBody = document.body.style.overflow;

    const oldHtml = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";

    document.documentElement.style.overflow = "hidden";



    void loadStudio();



    return () => {

      document.body.style.overflow = oldBody;

      document.documentElement.style.overflow = oldHtml;

    };

  }, []);



  useEffect(() => {

    if (!selectedQuiz) {

      setQuestions([]);

      setEditForm(EMPTY_META);

      return;

    }



    setEditForm({

      clubId: selectedQuiz.club_id,

      title: selectedQuiz.title,

      slug: selectedQuiz.slug,

      description: selectedQuiz.description || "",

      // Challenge backgrounds now come from the parent club.
      coverImageUrl: "",

    });

  }, [selectedQuizId]);



  useEffect(() => {

    const savedQuestion = questions.find(

      (question) => Number(question.question_order) === selectedQuestionOrder,

    );



    setQuestionForm(

      savedQuestion

        ? formFromQuestion(savedQuestion)

        : emptyQuestion(selectedQuestionOrder),

    );

  }, [selectedQuestionOrder, questions]);



  async function loadStudio(preferredQuizId?: string) {

    setIsLoading(true);

    setErrorMessage("");



    const accessResult = await getMiloQuizHallCreatorClubsAccess();

    setHallAccess(accessResult.access);



    if (!accessResult.access.canAccess) {

      setIsLoading(false);

      return;

    }



    const userResponse = await supabase.auth.getUser();

    const signedInUser = userResponse.data.user;
    setAccountEmail(signedInUser?.email ?? null);

    if (signedInUser) {
      const { data: tokenRows, error: tokenError } = await supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", signedInUser.id)
        .eq("token_kind", "virtual");

      if (!tokenError) {
        setDreamTokenBalance(
          Math.max(
            0,
            (tokenRows || []).reduce(
              (total, row) => total + Number(row.amount || 0),
              0,
            ),
          ),
        );
      }
      setDreamTokenLoading(false);
    }

    if (!userResponse.data.user) {

      router.replace(

        `/login?next=${encodeURIComponent(

          "/milo-world/quiz-hall/creator-studio",

        )}`,

      );

      return;

    }



    const creatorResponse = await supabase.rpc("get_my_creator_partner");



    if (creatorResponse.error) {

      setErrorMessage(

        creatorResponse.error.message || "Creator access could not be loaded.",

      );

      setIsLoading(false);

      return;

    }



    const creatorRow = Array.isArray(creatorResponse.data)

      ? creatorResponse.data[0]

      : creatorResponse.data;



    if (!creatorRow) {

      setCreator(null);

      setIsLoading(false);

      return;

    }



    const nextCreator = creatorRow as CreatorAccess;

    setCreator(nextCreator);



    if (nextCreator.status !== "active") {

      setIsLoading(false);

      return;

    }



    const [clubsResponse, quizzesResponse] = await Promise.all([

      supabase.rpc("creator_get_my_clubs"),

      supabase.rpc("creator_get_my_quizzes"),

    ]);



    if (clubsResponse.error) {

      setErrorMessage(clubsResponse.error.message || "Could not load clubs.");

      setIsLoading(false);

      return;

    }



    if (quizzesResponse.error) {

      setErrorMessage(

        quizzesResponse.error.message || "Could not load creator quizzes.",

      );

      setIsLoading(false);

      return;

    }



    const nextClubs = (clubsResponse.data || []) as CreatorClub[];

    const nextQuizzes = ((quizzesResponse.data || []) as CreatorQuiz[]).map(

      (quiz) => ({

        ...quiz,

        question_count: Number(quiz.question_count || 0),

      }),

    );



    setClubs(nextClubs);

    setQuizzes(nextQuizzes);



    setCreateForm((current) => ({

      ...current,

      clubId:

        current.clubId ||

        nextClubs.find((club) => club.status === "active")?.club_id ||

        nextClubs[0]?.club_id ||

        "",

    }));



    const nextSelected =

      preferredQuizId &&

      nextQuizzes.some((quiz) => quiz.quiz_id === preferredQuizId)

        ? preferredQuizId

        : selectedQuizId &&

            nextQuizzes.some((quiz) => quiz.quiz_id === selectedQuizId)

          ? selectedQuizId

          : nextQuizzes[0]?.quiz_id || "";



    setSelectedQuizId(nextSelected);

    setIsLoading(false);

  }



  async function loadQuestions(quizId: string) {

    setIsLoadingQuestions(true);



    const { data, error } = await supabase.rpc(

      "creator_get_quiz_questions",

      { p_quiz_id: quizId },

    );



    if (error) {

      setQuestions([]);

      setErrorMessage(error.message || "Could not load quiz questions.");

      setIsLoadingQuestions(false);

      return;

    }



    const next = ((data || []) as QuizQuestion[]).map((question) => ({

      ...question,

      question_order: Number(question.question_order || 0),

      difficulty: Number(question.difficulty || 1),

    }));



    setQuestions(next);

    setIsLoadingQuestions(false);

  }



  function updateCreate<K extends keyof QuizMetaForm>(

    key: K,

    value: QuizMetaForm[K],

  ) {

    setCreateForm((current) => {

      const next = { ...current, [key]: value };

      if (key === "title" && !createSlugTouched) {

        next.slug = slugify(String(value));

      }

      return next;

    });

  }



  function updateEdit<K extends keyof QuizMetaForm>(

    key: K,

    value: QuizMetaForm[K],

  ) {

    setEditForm((current) => ({ ...current, [key]: value }));

  }



  function updateQuestion<K extends keyof QuestionForm>(

    key: K,

    value: QuestionForm[K],

  ) {

    setQuestionForm((current) => ({ ...current, [key]: value }));

  }



  function validateMeta(form: QuizMetaForm) {

    if (!form.clubId) return "Choose a Creator Club.";

    if (!form.title.trim()) return "Enter a quiz title.";

    if (!form.slug.trim()) return "Enter a quiz slug.";

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {

      return "Quiz slug can use lowercase letters, numbers and hyphens only.";

    }

    if (form.description.length > 1500) {

      return "Description must be 1500 characters or fewer.";

    }

    return "";

  }



  function validateQuestion(form: QuestionForm) {

    if (!form.question.trim()) return "Enter the question.";

    if (!form.optionA.trim()) return "Enter option A.";

    if (!form.optionB.trim()) return "Enter option B.";

    if (!form.optionC.trim()) return "Enter option C.";

    if (!form.optionD.trim()) return "Enter option D.";



    const normalized = [

      form.optionA,

      form.optionB,

      form.optionC,

      form.optionD,

    ].map((value) => value.trim().toLowerCase());



    if (new Set(normalized).size !== 4) {

      return "All four answer options must be different.";

    }



    if (form.difficulty < 1 || form.difficulty > 5) {

      return "Difficulty must be from 1 to 5.";

    }



    return "";

  }



  async function createQuiz() {

    const validation = validateMeta(createForm);

    if (validation) {

      setErrorMessage(validation);

      return;

    }



    setIsSaving(true);

    setMessage("");

    setErrorMessage("");



    const { data, error } = await supabase.rpc("creator_create_quiz", {

      p_club_id: createForm.clubId,

      p_title: createForm.title.trim(),

      p_slug: createForm.slug.trim(),

      p_description: createForm.description.trim() || null,

      // Background is inherited from the club.
      p_cover_image_url: null,

    });



    if (error) {

      setErrorMessage(error.message || "Could not create creator quiz.");

      setIsSaving(false);

      return;

    }



    const row = Array.isArray(data) ? data[0] : data;

    const createdId = String(row?.quiz_id || "");



    setCreateForm({

      ...EMPTY_META,

      clubId: createForm.clubId,

    });

    setCreateSlugTouched(false);

    setMessage("Challenge created. Build its 10 questions in the Challenge Builder.");

    await loadStudio(createdId || undefined);

    setSelectedQuestionOrder(1);

    setIsSaving(false);

  }



  async function saveQuizMeta() {

    if (!selectedQuiz) return;



    const validation = validateMeta(editForm);

    if (validation) {

      setErrorMessage(validation);

      return;

    }



    setIsSaving(true);

    setMessage("");

    setErrorMessage("");



    const { error } = await supabase.rpc("creator_update_quiz_metadata", {

      p_quiz_id: selectedQuiz.quiz_id,

      p_club_id: editForm.clubId,

      p_title: editForm.title.trim(),

      p_slug: editForm.slug.trim(),

      p_description: editForm.description.trim() || null,

      // Background is inherited from the club.
      p_cover_image_url: null,

    });



    if (error) {

      setErrorMessage(error.message || "Could not save quiz details.");

      setIsSaving(false);

      return;

    }



    setMessage("Quiz details saved.");

    await loadStudio(selectedQuiz.quiz_id);

    setIsSaving(false);

  }



  async function saveQuestion() {

    if (!selectedQuiz) return;



    const validation = validateQuestion(questionForm);

    if (validation) {

      setErrorMessage(validation);

      return;

    }



    setIsSaving(true);

    setMessage("");

    setErrorMessage("");



    const { error } = await supabase.rpc("creator_upsert_quiz_question", {

      p_quiz_id: selectedQuiz.quiz_id,

      p_question_order: questionForm.questionOrder,

      p_question: questionForm.question.trim(),

      p_option_a: questionForm.optionA.trim(),

      p_option_b: questionForm.optionB.trim(),

      p_option_c: questionForm.optionC.trim(),

      p_option_d: questionForm.optionD.trim(),

      p_correct_option: questionForm.correctOption,

      p_explanation: questionForm.explanation.trim() || null,

      p_topic: questionForm.topic.trim() || null,

      p_difficulty: Number(questionForm.difficulty),

    });



    if (error) {

      setErrorMessage(error.message || "Could not save question.");

      setIsSaving(false);

      return;

    }



    setMessage(`Question ${questionForm.questionOrder} saved.`);

    await Promise.all([

      loadQuestions(selectedQuiz.quiz_id),

      loadStudio(selectedQuiz.quiz_id),

    ]);

    setIsSaving(false);

  }



  async function clearQuestion() {

    if (!selectedQuiz) return;



    if (!savedOrders.has(selectedQuestionOrder)) {

      setQuestionForm(emptyQuestion(selectedQuestionOrder));

      return;

    }



    const confirmed = window.confirm(

      `Remove question ${selectedQuestionOrder} from this quiz?`,

    );

    if (!confirmed) return;



    setIsSaving(true);

    setMessage("");

    setErrorMessage("");



    const { error } = await supabase.rpc("creator_delete_quiz_question", {

      p_quiz_id: selectedQuiz.quiz_id,

      p_question_order: selectedQuestionOrder,

    });



    if (error) {

      setErrorMessage(error.message || "Could not remove question.");

      setIsSaving(false);

      return;

    }



    setMessage(`Question ${selectedQuestionOrder} removed.`);

    await Promise.all([

      loadQuestions(selectedQuiz.quiz_id),

      loadStudio(selectedQuiz.quiz_id),

    ]);

    setIsSaving(false);

  }



  async function submitQuiz() {

    if (!selectedQuiz) return;



    const confirmed = window.confirm(

      `Submit "${selectedQuiz.title}" for approval? You will not be able to edit it while approval is pending.`,

    );

    if (!confirmed) return;



    setIsSaving(true);

    setMessage("");

    setErrorMessage("");



    const { error } = await supabase.rpc("creator_submit_quiz", {

      p_quiz_id: selectedQuiz.quiz_id,

    });



    if (error) {

      setErrorMessage(error.message || "Could not submit quiz.");

      setIsSaving(false);

      return;

    }



    setMessage("Challenge submitted for approval.");

    await loadStudio(selectedQuiz.quiz_id);

    setIsSaving(false);

  }



  async function archiveQuiz() {

    if (!selectedQuiz) return;



    const confirmed = window.confirm(

      `Archive "${selectedQuiz.title}"? It will remain in your records but cannot be edited or published.`,

    );

    if (!confirmed) return;



    setIsSaving(true);

    setMessage("");

    setErrorMessage("");



    const { error } = await supabase.rpc("creator_archive_quiz", {

      p_quiz_id: selectedQuiz.quiz_id,

    });



    if (error) {

      setErrorMessage(error.message || "Could not archive quiz.");

      setIsSaving(false);

      return;

    }



    setMessage("Quiz archived.");

    await loadStudio(selectedQuiz.quiz_id);

    setIsSaving(false);

  }



  if (isLoading) {

    return (

      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/56">

        Opening Creator Studio...

      </main>

    );

  }



  if (hallAccess && !hallAccess.canAccess) {

    return (

      <CreatorClubsLockedScreen detail="Creator Studio is currently unavailable." />

    );

  }



  if (!creator) {

    return (

      <AccessMessage

        title="Create your Creator identity first"

        description="Creator Studio is now self-service. Return to Creator Clubs and open Create to set up your public creator identity."

        href="/milo-world/quiz-hall/communities?view=create"

      />

    );

  }



  if (creator.status !== "active") {

    return (

      <AccessMessage

        title="Creator Studio is paused"

        description={`Your Creator Partner status is currently ${creator.status}. Contact Dreamscape if you believe this should be active.`}

      />

    );

  }



  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.10),transparent_34%),linear-gradient(180deg,#041124_0%,#020711_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/82 px-3 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex w-full items-center gap-3">
            <Link
              href="/milo-world/quiz-hall/communities"
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-white/62 no-underline"
            >
              ← Creator Clubs
            </Link>

            <div className="mr-auto min-w-0">
              <p className="hidden text-[8px] font-black uppercase tracking-[0.17em] text-cyan-100/52 sm:block">
                Milo’s Creator Economy
              </p>
              <h1 className="truncate text-xl font-black sm:text-2xl">
                Creator Studio · {creator.display_name}
              </h1>
            </div>

            <Link
              href="/milo-world/bank"
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-cyan-200/24 bg-cyan-300/[0.06] px-3 text-[8px] font-black uppercase tracking-[0.07em] text-cyan-100 no-underline sm:px-4"
            >
              ◈{" "}
              {dreamTokenLoading
                ? "… DT"
                : `${Math.max(0, Math.round(dreamTokenBalance)).toLocaleString("en-SG")} DT`}
            </Link>

            <Link
              href="/profile"
              title={accountEmail || "My Account"}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-white/12 bg-white/[0.04] px-3 text-[8px] font-black uppercase tracking-[0.08em] text-white/68 no-underline sm:px-4"
            >
              My Account
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[220px] shrink-0 flex-col border-r border-white/8 bg-[#020711]/72 p-3 md:flex lg:w-[238px] lg:p-4">
            <div>
              <p className="px-2 pb-2 pt-1 text-[7px] font-black uppercase tracking-[0.16em] text-white/26">
                Creator Studio
              </p>

              <div className="grid gap-2">
                <StudioNavButton
                  label="Overview"
                  description="What to do next"
                  icon="⌂"
                  active={studioView === "overview"}
                  onClick={() => setStudioView("overview")}
                />
                <StudioNavButton
                  label="Challenges"
                  description="Build & publish"
                  icon="✦"
                  active={studioView === "challenges"}
                  onClick={() => setStudioView("challenges")}
                />
                <StudioNavButton
                  label="Community"
                  description="Members & Play Rooms"
                  icon="◎"
                  active={studioView === "community"}
                  onClick={() => setStudioView("community")}
                />
                <StudioNavButton
                  label="Growth"
                  description="Levels & analytics"
                  icon="↗"
                  active={studioView === "growth"}
                  onClick={() => setStudioView("growth")}
                />
                <StudioNavButton
                  label="Rewards"
                  description="DT & upgrades"
                  icon="◈"
                  active={studioView === "rewards"}
                  onClick={() => setStudioView("rewards")}
                />
                <StudioNavButton
                  label="Club Settings"
                  description="Identity & background"
                  icon="⚙"
                  active={studioView === "settings"}
                  onClick={() => setStudioView("settings")}
                />
              </div>
            </div>

            <div className="mt-auto rounded-[20px] border border-cyan-200/12 bg-cyan-300/[0.04] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-2xl border border-cyan-200/12 bg-[#06182d]">
                  <img
                    src="/milo-world/milo-character.png"
                    alt=""
                    className="h-[58px] w-auto translate-y-1 object-contain"
                  />
                </span>
                <span>
                  <strong className="block text-[9px] font-black uppercase tracking-[0.07em] text-cyan-100">
                    Milo’s tip
                  </strong>
                  <small className="mt-1 block text-[8px] leading-4 text-white/30">
                    Start with one strong challenge. The growth tools become useful after people begin playing.
                  </small>
                </span>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/7 bg-[#031020]/72 px-3 py-2 md:hidden">
              {[
                ["overview", "Overview"],
                ["challenges", "Challenges"],
                ["community", "Community"],
                ["growth", "Growth"],
                ["rewards", "Rewards"],
                ["settings", "Settings"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStudioView(key as StudioView)}
                  className={`min-h-9 shrink-0 rounded-full border px-3 text-[7px] font-black uppercase tracking-[0.07em] ${
                    studioView === key
                      ? "border-cyan-200/24 bg-cyan-300/[0.07] text-cyan-100"
                      : "border-white/8 bg-white/[0.025] text-white/36"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <section className="dream-studio-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
              <div className="mx-auto w-full max-w-[1680px]">
                {message && (
                  <p className="mb-4 rounded-2xl border border-emerald-200/18 bg-emerald-400/[0.07] px-4 py-3 text-xs text-emerald-100">
                    {message}
                  </p>
                )}

                {errorMessage && (
                  <p className="mb-4 rounded-2xl border border-red-200/18 bg-red-400/[0.07] px-4 py-3 text-xs leading-5 text-red-100">
                    Something needs attention before this action can be completed.
                  </p>
                )}

                {studioView === "overview" && (
                  <CreatorStudioOverview
                    creatorName={creator.display_name}
                    club={primaryClub}
                    quizzes={quizzes}
                    publishedCount={publishedCount}
                    pendingCount={pendingCount}
                    completeChallenge={completeChallenge}
                    onOpenChallenges={() => {
                      if (firstEditableChallenge) {
                        setSelectedQuizId(firstEditableChallenge.quiz_id);
                      }
                      setStudioView("challenges");
                    }}
                    onOpenCommunity={() => setStudioView("community")}
                    onOpenSettings={() => setStudioView("settings")}
                  />
                )}

                {studioView === "challenges" && (
                  <div className="grid gap-5">
                    <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-100/58">
                            Challenges
                          </p>
                          <h2 className="mt-1 text-2xl font-black">
                            Build challenges people want to replay.
                          </h2>
                          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/38">
                            Create a 10-question challenge, preview it, submit it for approval, then feature a published challenge for your club.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/9 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.07em] text-white/36">
                          {quizzes.length} challenge{quizzes.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
                        <aside className="rounded-[22px] border border-white/8 bg-black/14 p-4">
                          <section className="rounded-[18px] border border-amber-200/14 bg-amber-300/[0.045] p-4">
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/62">
                              New Challenge
                            </p>

                            <div className="mt-3 grid gap-3">
                              <select
                                value={createForm.clubId}
                                onChange={(event) =>
                                  updateCreate("clubId", event.target.value)
                                }
                                className={inputClass}
                              >
                                {clubs.map((club) => (
                                  <option key={club.club_id} value={club.club_id}>
                                    {club.club_name}
                                  </option>
                                ))}
                              </select>

                              <input
                                value={createForm.title}
                                onChange={(event) =>
                                  updateCreate("title", event.target.value)
                                }
                                placeholder="Challenge title"
                                className={inputClass}
                              />

                              <input
                                value={createForm.slug}
                                onChange={(event) => {
                                  setCreateSlugTouched(true);
                                  updateCreate("slug", slugify(event.target.value));
                                }}
                                placeholder="challenge-url"
                                className={inputClass}
                              />

                              <textarea
                                value={createForm.description}
                                onChange={(event) =>
                                  updateCreate("description", event.target.value)
                                }
                                rows={3}
                                maxLength={1500}
                                placeholder="Short challenge description"
                                className={textareaClass}
                              />

                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => void createQuiz()}
                                className={primaryButton}
                              >
                                Create Challenge
                              </button>
                            </div>
                          </section>

                          <div className="mt-4">
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
                              My Challenges
                            </p>
                            <div className="mt-2 space-y-2">
                              {quizzes.length === 0 ? (
                                <p className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-xs leading-5 text-white/38">
                                  Your first challenge will appear here.
                                </p>
                              ) : (
                                quizzes.map((quiz) => (
                                  <button
                                    key={quiz.quiz_id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedQuizId(quiz.quiz_id);
                                      setSelectedQuestionOrder(1);
                                      setMessage("");
                                      setErrorMessage("");
                                    }}
                                    className={`w-full rounded-xl border p-3 text-left transition ${
                                      quiz.quiz_id === selectedQuizId
                                        ? "border-amber-200/28 bg-amber-300/[0.07]"
                                        : "border-white/8 bg-white/[0.025] hover:border-white/16"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="min-w-0 flex-1">
                                        <strong className="block line-clamp-2 text-xs leading-5 text-white">
                                          {quiz.title}
                                        </strong>
                                        <small className="mt-1 block text-[9px] text-white/32">
                                          {quiz.question_count}/10 questions
                                        </small>
                                      </span>
                                      <span
                                        className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.07em] ${quizStatusClass(
                                          quiz.status,
                                        )}`}
                                      >
                                        {quizStatusLabel(quiz.status)}
                                      </span>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </aside>

                        <section className="rounded-[22px] border border-white/8 bg-black/14 p-4 sm:p-5">
                          {!selectedQuiz ? (
                            <div className="flex min-h-[500px] items-center justify-center text-center">
                              <div className="max-w-xl">
                                <img
                                  src="/milo-world/milo-character.png"
                                  alt=""
                                  className="mx-auto h-28 w-auto object-contain"
                                />
                                <h3 className="mt-3 text-2xl font-black">
                                  Build your first challenge.
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-white/42">
                                  Create a challenge on the left, then use the builder here to add all 10 questions.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/60">
                                    {selectedQuiz.club_name}
                                  </p>
                                  <h3 className="mt-1 text-2xl font-black">
                                    {selectedQuiz.title}
                                  </h3>
                                  <p className="mt-2 text-[10px] text-white/34">
                                    {selectedQuiz.question_count}/10 questions · {quizStatusLabel(selectedQuiz.status)}
                                  </p>
                                </div>
                                <span
                                  className={`w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] ${quizStatusClass(
                                    selectedQuiz.status,
                                  )}`}
                                >
                                  {quizStatusLabel(selectedQuiz.status)}
                                </span>
                              </div>

                              {selectedQuiz.review_note && (
                                <div className="mt-4 rounded-2xl border border-amber-200/16 bg-amber-300/[0.055] p-4">
                                  <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/68">
                                    Approval Feedback
                                  </p>
                                  <p className="mt-2 text-xs leading-5 text-amber-50/74">
                                    {selectedQuiz.review_note}
                                  </p>
                                </div>
                              )}

                              <section className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.02] p-4">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <select
                                    value={editForm.clubId}
                                    onChange={(event) =>
                                      updateEdit("clubId", event.target.value)
                                    }
                                    disabled={!canEditSelected}
                                    className={inputClass}
                                  >
                                    {clubs.map((club) => (
                                      <option key={club.club_id} value={club.club_id}>
                                        {club.club_name}
                                      </option>
                                    ))}
                                  </select>

                                  <input
                                    value={editForm.title}
                                    onChange={(event) =>
                                      updateEdit("title", event.target.value)
                                    }
                                    disabled={!canEditSelected}
                                    placeholder="Challenge title"
                                    className={inputClass}
                                  />

                                  <input
                                    value={editForm.slug}
                                    onChange={(event) =>
                                      updateEdit("slug", slugify(event.target.value))
                                    }
                                    disabled={!canEditSelected}
                                    placeholder="challenge-url"
                                    className={inputClass}
                                  />

                                  <div className="flex min-h-[44px] items-center rounded-xl border border-cyan-200/10 bg-cyan-300/[0.035] px-4 text-[9px] leading-4 text-cyan-50/42">
                                    Background inherited from the club.
                                  </div>
                                </div>

                                <textarea
                                  value={editForm.description}
                                  onChange={(event) =>
                                    updateEdit("description", event.target.value)
                                  }
                                  disabled={!canEditSelected}
                                  rows={3}
                                  maxLength={1500}
                                  placeholder="Challenge description"
                                  className={`${textareaClass} mt-3`}
                                />

                                {canEditSelected && (
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => void saveQuizMeta()}
                                    className={`${secondaryButton} mt-3`}
                                  >
                                    Save Challenge Details
                                  </button>
                                )}
                              </section>

                              <CreatorEngineV2Builder
                                quizId={selectedQuiz.quiz_id}
                                quizTitle={selectedQuiz.title}
                                quizStatus={selectedQuiz.status}
                                canEdit={canEditSelected}
                                onQuizChanged={() =>
                                  void loadStudio(selectedQuiz.quiz_id)
                                }
                              />
                            </div>
                          )}
                        </section>
                      </div>
                    </section>

                    {publishedCount > 0 ? (
                      <CreatorChallengeCyclePanel />
                    ) : (
                      <section className="rounded-[24px] border border-white/9 bg-white/[0.025] p-5">
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/28">
                          Featured Challenge
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          Publish a challenge before featuring one.
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-white/36">
                          Once a challenge is published, you can choose it here as the club’s featured competition.
                        </p>
                      </section>
                    )}
                  </div>
                )}

                {studioView === "community" && (
                  <div className="grid gap-5">
                    <StudioSectionIntro
                      eyebrow="Community"
                      title="Manage the club experience as membership grows."
                      text="Play Rooms and community features stay compact until the club reaches the milestones that make them useful."
                    />
                    <CreatorClubPlaySettings />
                  </div>
                )}

                {studioView === "growth" && (
                  <div className="grid gap-5">
                    <StudioSectionIntro
                      eyebrow="Growth"
                      title="See how the creator and the club are progressing."
                      text="Creator Reputation measures your creator track record. Club Level measures the community. Engagement shows how people are actually playing and returning."
                    />
                    <CreatorClubProgressionPanel />
                    <CreatorReputationPanel />
                    <CreatorEngagementPanel />
                  </div>
                )}

                {studioView === "rewards" && (
                  <div className="grid gap-5">
                    <StudioSectionIntro
                      eyebrow="Rewards"
                      title="Reinvest creator rewards into better club experiences."
                      text="Qualified activity can earn creator DT. Use it for creator tools, presentation and discovery opportunities — never fake engagement or leaderboard position."
                    />
                    <CreatorRewardsPanel />
                    <CreatorClubUpgradeStore />
                  </div>
                )}

                {studioView === "settings" && (
                  <CreatorClubSettingsPanel
                    clubs={clubs}
                    onSaved={() => void loadStudio(selectedQuizId)}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dream-studio-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(34, 211, 238, 0.26)
            rgba(255, 255, 255, 0.04);
        }
        .dream-studio-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .dream-studio-scroll::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.26);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function CreatorStudioOverview({
  creatorName,
  club,
  quizzes,
  publishedCount,
  pendingCount,
  completeChallenge,
  onOpenChallenges,
  onOpenCommunity,
  onOpenSettings,
}: {
  creatorName: string;
  club: CreatorClub | null;
  quizzes: CreatorQuiz[];
  publishedCount: number;
  pendingCount: number;
  completeChallenge: CreatorQuiz | undefined;
  onOpenChallenges: () => void;
  onOpenCommunity: () => void;
  onOpenSettings: () => void;
}) {
  const firstQuiz = quizzes[0] || null;
  const hasClub = Boolean(club);
  const hasChallenge = quizzes.length > 0;
  const hasTenQuestions = Boolean(completeChallenge);
  const hasSubmitted = quizzes.some(
    (quiz) => quiz.status === "submitted" || quiz.status === "published",
  );
  const hasPublished = publishedCount > 0;

  const steps = [
    {
      label: "Creator identity",
      detail: creatorName,
      done: true,
      action: undefined,
    },
    {
      label: "Club created",
      detail: club?.club_name || "Create your first club",
      done: hasClub,
      action: hasClub ? undefined : onOpenSettings,
    },
    {
      label: "Create first challenge",
      detail: firstQuiz?.title || "Build a challenge",
      done: hasChallenge,
      action: onOpenChallenges,
    },
    {
      label: "Complete 10 questions",
      detail: hasTenQuestions
        ? `${completeChallenge?.title} is complete`
        : "Finish all 10 questions",
      done: hasTenQuestions,
      action: onOpenChallenges,
    },
    {
      label: "Submit for approval",
      detail: hasSubmitted ? "Submitted" : "Ready after 10 questions",
      done: hasSubmitted,
      action: onOpenChallenges,
    },
    {
      label: "Publish & grow",
      detail: hasPublished
        ? `${publishedCount} published`
        : "Publish your first challenge",
      done: hasPublished,
      action: hasPublished ? onOpenCommunity : onOpenChallenges,
    },
  ];

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[30px] border border-cyan-200/13 bg-[linear-gradient(135deg,rgba(7,32,54,0.92),rgba(3,11,28,0.96))] p-6 sm:p-8">
        <div className="absolute -right-4 bottom-[-24px] opacity-85">
          <img
            src="/milo-world/milo-character.png"
            alt=""
            className="h-[210px] w-auto object-contain sm:h-[260px]"
          />
        </div>

        <div className="relative z-10 max-w-4xl pr-24 sm:pr-44">
          <p className="text-[8px] font-black uppercase tracking-[0.17em] text-cyan-100/58">
            Creator Overview
          </p>
          <h2 className="mt-2 font-serif text-[clamp(34px,5vw,58px)] font-normal leading-[0.98]">
            {hasPublished
              ? "Keep building what people come back for."
              : "Get your club ready for its first players."}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/48">
            {hasPublished
              ? "Your core creator systems are active. Use Challenges to create, Growth to understand what is working, and Rewards to reinvest."
              : "The fastest path is simple: build one complete challenge, submit it for approval, publish it, then start growing the community."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenChallenges}
              className="min-h-11 rounded-full border border-cyan-200/22 bg-cyan-300/[0.09] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100"
            >
              {hasChallenge ? "Open Challenges →" : "Build First Challenge →"}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-white/52"
            >
              Club Settings
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/56">
                Launch Checklist
              </p>
              <h3 className="mt-1 text-2xl font-black">
                From creator to live club.
              </h3>
            </div>
            <strong className="text-2xl text-amber-100">
              {steps.filter((step) => step.done).length}/{steps.length}
            </strong>
          </div>

          <div className="mt-5 grid gap-2">
            {steps.map((step, index) => (
              <button
                key={step.label}
                type="button"
                disabled={!step.action}
                onClick={step.action}
                className={`flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3 text-left ${
                  step.done
                    ? "border-emerald-200/10 bg-emerald-400/[0.035]"
                    : "border-white/8 bg-black/14"
                } disabled:cursor-default`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                    step.done
                      ? "bg-emerald-400/12 text-emerald-100"
                      : "bg-white/[0.04] text-white/34"
                  }`}
                >
                  {step.done ? "✓" : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[10px] text-white/78">
                    {step.label}
                  </strong>
                  <small className="mt-1 block truncate text-[8px] text-white/30">
                    {step.detail}
                  </small>
                </span>
                {step.action && !step.done && (
                  <span className="text-[8px] font-black text-cyan-100/58">
                    Open →
                  </span>
                )}
              </button>
            ))}
          </div>
        </article>

        <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <OverviewStat
            label="Challenges"
            value={quizzes.length.toString()}
            detail="Total created"
          />
          <OverviewStat
            label="Published"
            value={publishedCount.toString()}
            detail="Visible to members"
          />
          <OverviewStat
            label="Pending"
            value={pendingCount.toString()}
            detail="Awaiting approval"
          />
        </aside>
      </section>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[22px] border border-white/9 bg-white/[0.03] p-5">
      <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/28">
        {label}
      </p>
      <strong className="mt-2 block text-4xl text-cyan-100">{value}</strong>
      <span className="mt-1 block text-[9px] text-white/30">{detail}</span>
    </article>
  );
}

function StudioSectionIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="rounded-[26px] border border-cyan-200/10 bg-cyan-300/[0.03] p-5 sm:p-6">
      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/56">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <p className="mt-2 max-w-4xl text-[10px] leading-5 text-white/38">
        {text}
      </p>
    </section>
  );
}

function StudioNavButton({
  label,
  description,
  icon,
  active,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3 text-left transition ${
        active
          ? "border-cyan-200/24 bg-cyan-300/[0.075] text-cyan-50"
          : "border-white/8 bg-white/[0.025] text-white/52 hover:border-white/14 hover:bg-white/[0.045]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
          active ? "bg-cyan-300/[0.10] text-cyan-100" : "bg-white/[0.035]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <strong className="block text-[9px] font-black uppercase tracking-[0.08em]">
          {label}
        </strong>
        <small className="mt-1 block text-[8px] text-white/27">
          {description}
        </small>
      </span>
    </button>
  );
}

function OptionInput({

  label,

  value,

  disabled,

  onChange,

}: {

  label: string;

  value: string;

  disabled: boolean;

  onChange: (value: string) => void;

}) {

  return (

    <label>

      <span className={fieldLabel}>Option {label}</span>

      <input

        value={value}

        onChange={(event) => onChange(event.target.value)}

        disabled={disabled}

        maxLength={500}

        placeholder={`Answer ${label}`}

        className={inputClass}

      />

    </label>

  );

}



function AccessMessage({

  title,

  description,

  href = "/milo-world/quiz-hall/communities",

}: {

  title: string;

  description: string;

  href?: string;

}) {

  return (

    <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">

      <section className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-center">

        <h1 className="text-3xl font-black">{title}</h1>

        <p className="mt-3 text-sm leading-6 text-white/48">{description}</p>

        <Link

          href={href}

          className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-amber-200/22 bg-amber-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline"

        >

          Back to Creator Clubs

        </Link>

      </section>

    </main>

  );

}



const fieldLabel =

  "mb-2 block text-[8px] font-black uppercase tracking-[0.11em] text-white/34";



const inputClass =

  "h-11 w-full min-w-0 rounded-2xl border border-white/10 bg-[#061632]/80 px-4 text-xs text-white outline-none transition placeholder:text-white/26 focus:border-amber-200/30 disabled:cursor-not-allowed disabled:opacity-46";



const textareaClass =

  "w-full resize-none rounded-2xl border border-white/10 bg-[#061632]/80 px-4 py-3 text-xs leading-5 text-white outline-none transition placeholder:text-white/26 focus:border-amber-200/30 disabled:cursor-not-allowed disabled:opacity-46";



const primaryButton =

  "min-h-11 rounded-full border border-amber-200/22 bg-amber-300/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-38";



const secondaryButton =

  "min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-white/52 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-38";
