"use client";

import type { CSSProperties } from "react";

type JsonObject = Record<string, any>;

type ComprehensionQuestion = {
  id: string;
  question_order: number;
  question_type: string;
  prompt: string;
  content: JsonObject;
  skill: string | null;
};

type Feedback = {
  locked?: boolean;
  is_correct?: boolean | null;
  explanation?: string | null;
  correct_response?: JsonObject | string | null;
};

type Props = {
  title: string;
  topicTitle: string;
  level: number;
  questions: ComprehensionQuestion[];
  questionIndex: number;
  answers: Record<string, JsonObject>;
  feedbackByQuestion: Record<string, Feedback>;
  tokenBalance: number;
  gemBalance: number;
  isMobile: boolean;
  busy: boolean;
  error: string | null;
  onAnswerChange: (questionId: string, response: JsonObject) => void;
  onQuestionChange: (index: number) => void;
  onPrimaryAction: () => void;
  onExit: () => void;
};

export default function GroupedComprehension({
  title,
  topicTitle,
  level,
  questions,
  questionIndex,
  answers,
  feedbackByQuestion,
  tokenBalance,
  gemBalance,
  isMobile,
  busy,
  error,
  onAnswerChange,
  onQuestionChange,
  onPrimaryAction,
  onExit,
}: Props) {
  const current = questions[questionIndex];
  const firstContent = questions[0]?.content ?? {};
  const passage = String(firstContent.comprehension_passage ?? "");
  const passageTitle = String(firstContent.passage_title ?? title);
  const passageImageUrl = firstContent.comprehension_image_url
    ? String(firstContent.comprehension_image_url)
    : null;
  const passageImageAlt = String(
    firstContent.comprehension_image_alt ?? "Reading passage illustration",
  );
  const passageImageCaption = String(
    firstContent.comprehension_image_caption ?? "",
  );

  const options = getOptions(current?.content ?? {});
  const selected = String(answers[current?.id]?.option_id ?? "");
  const feedback = current ? feedbackByQuestion[current.id] : undefined;
  const answeredCount = questions.filter((question) =>
    Boolean(answers[question.id]?.option_id),
  ).length;
  const isLast = questionIndex >= questions.length - 1;
  const complete = Boolean(selected);

  if (!current) return null;

  return (
    <main style={page}>
      <header style={header(isMobile)}>
        <button type="button" onClick={onExit} style={backButton}>
          ← Quiz List
        </button>

        <div style={headerTitleWrap}>
          <p style={eyebrow}>READING COMPREHENSION</p>
          <p style={headerTitle}>
            {topicTitle} · Primary {level}
          </p>
        </div>

        <div style={balances}>
          <span style={tokenPill}>🪙 {tokenBalance.toLocaleString()}</span>
          <span style={gemPill}>💎 {gemBalance.toLocaleString()}</span>
        </div>
      </header>

      <section style={shell(isMobile)}>
        <aside style={passagePanel(isMobile)}>
          <div style={panelTop}>
            <div>
              <p style={panelEyebrow}>READING PASSAGE</p>
              <h1 style={passageHeading}>{passageTitle}</h1>
            </div>
            <span style={readBadge}>Read carefully</span>
          </div>

          <div style={passageBody}>
            {passageImageUrl && (
              <figure style={passageImageFigure}>
                <img
                  src={passageImageUrl}
                  alt={passageImageAlt}
                  style={passageImage}
                />
                {passageImageCaption && (
                  <figcaption style={passageImageCaptionStyle}>
                    {passageImageCaption}
                  </figcaption>
                )}
              </figure>
            )}

            {passage.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index} style={passageParagraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </aside>

        <section style={questionPanel(isMobile)}>
          <div style={questionTop}>
            <div>
              <p style={questionEyebrow}>
                Question {questionIndex + 1} of {questions.length}
              </p>
              <p style={questionMeta}>
                {answeredCount}/{questions.length} answered
              </p>
            </div>
            <span style={skillBadge}>{current.skill || "Reading"}</span>
          </div>

          <div style={progressTrack}>
            <div
              style={{
                ...progressFill,
                width: `${((questionIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          <div style={questionNavigator}>
            {questions.map((question, index) => {
              const answered = Boolean(answers[question.id]?.option_id);
              const active = index === questionIndex;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onQuestionChange(index)}
                  disabled={busy}
                  aria-label={`Open question ${index + 1}`}
                  style={navButton(active, answered)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div style={questionScrollArea}>
            <article style={questionCard}>
              <h2 style={prompt}>{current.prompt}</h2>

              <div style={optionGrid(options.some((option) => Boolean(option.imageUrl)))}>
                {options.map((option, index) => {
                  const active = selected === option.id;
                  const locked = Boolean(feedback?.locked);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={busy || locked}
                      onClick={() =>
                        onAnswerChange(current.id, { option_id: option.id })
                      }
                      style={optionButton(active, busy || locked)}
                    >
                      <span style={optionLetter}>
                        {String.fromCharCode(65 + index)}
                      </span>

                      <span style={optionBody}>
                        {option.imageUrl && (
                          <img
                            src={option.imageUrl}
                            alt={option.imageAlt || option.text || `Option ${index + 1}`}
                            style={optionImage}
                          />
                        )}
                        {(!option.imageUrl || option.showTextWithImage) && option.text && (
                          <span style={optionText}>{option.text}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div
                  style={
                    feedback.is_correct === false ? feedbackWrong : feedbackGood
                  }
                >
                  <strong>
                    {feedback.is_correct === false
                      ? "Check your answer"
                      : "Answer saved"}
                  </strong>
                  {feedback.explanation && (
                    <span style={feedbackText}>{feedback.explanation}</span>
                  )}
                </div>
              )}

              {error && <div style={errorBox}>{error}</div>}
            </article>
          </div>

          <div style={actions(isMobile)}>
            <button
              type="button"
              disabled={busy || questionIndex === 0}
              onClick={() => onQuestionChange(questionIndex - 1)}
              style={{
                ...secondaryButton,
                opacity: busy || questionIndex === 0 ? 0.35 : 1,
              }}
            >
              ← Previous
            </button>

            <button
              type="button"
              disabled={busy || !complete}
              onClick={onPrimaryAction}
              style={{
                ...primaryButton,
                opacity: busy || !complete ? 0.35 : 1,
              }}
            >
              {busy ? "Saving..." : isLast ? "Submit Quiz" : "Next Question →"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function getOptions(content: JsonObject) {
  const options = Array.isArray(content.options) ? content.options : [];

  return options
    .map((option: any, index: number) => ({
      id: String(option?.id ?? index + 1),
      text: String(option?.text ?? ""),
      imageUrl: option?.image_url ? String(option.image_url) : null,
      imageAlt: option?.image_alt ? String(option.image_alt) : null,
      showTextWithImage: option?.show_text_with_image === true,
    }))
    .filter(
      (option: { text: string; imageUrl: string | null }) =>
        option.text.trim().length > 0 || Boolean(option.imageUrl),
    );
}

const page: CSSProperties = {
  height: "100dvh",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 22% 12%,rgba(47,199,204,.12),transparent 34%),#061326",
  color: "white",
  padding: "12px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
};

function header(isMobile: boolean): CSSProperties {
  return {
    flex: "0 0 auto",
    maxWidth: 1540,
    width: "100%",
    margin: "0 auto 10px",
    display: "grid",
    gridTemplateColumns: isMobile ? "auto 1fr" : "auto 1fr auto",
    alignItems: "center",
    gap: 10,
  };
}

const headerTitleWrap: CSSProperties = { minWidth: 0, textAlign: "center" };
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#78e8ff",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".18em",
};
const headerTitle: CSSProperties = {
  margin: "3px 0 0",
  color: "rgba(255,255,255,.58)",
  fontSize: 11,
  fontWeight: 800,
};
const backButton: CSSProperties = {
  minHeight: 38,
  borderRadius: 999,
  border: "1px solid rgba(126,232,255,.25)",
  background: "rgba(255,255,255,.055)",
  color: "white",
  padding: "0 13px",
  cursor: "pointer",
  fontWeight: 850,
};
const balances: CSSProperties = { display: "flex", gap: 6, justifyContent: "flex-end" };
const tokenPill: CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(255,215,106,.25)",
  background: "rgba(255,215,106,.08)",
  padding: "7px 9px",
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap",
};
const gemPill: CSSProperties = {
  ...tokenPill,
  border: "1px solid rgba(210,160,255,.28)",
  background: "rgba(168,85,247,.1)",
};

function shell(isMobile: boolean): CSSProperties {
  return {
    flex: 1,
    minHeight: 0,
    maxWidth: 1540,
    width: "100%",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "minmax(0,.9fr) minmax(0,1.1fr)"
      : "minmax(0,1.16fr) minmax(380px,.84fr)",
    gap: 10,
    alignItems: "stretch",
  };
}

function passagePanel(isMobile: boolean): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    borderRadius: isMobile ? 18 : 24,
    border: "1px solid rgba(126,232,255,.15)",
    background: "rgba(9,28,51,.92)",
    boxShadow: "0 20px 60px rgba(0,0,0,.22)",
    padding: isMobile ? 12 : 18,
    display: "flex",
    flexDirection: "column",
  };
}
const panelTop: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  paddingBottom: 10,
  borderBottom: "1px solid rgba(255,255,255,.08)",
};
const panelEyebrow: CSSProperties = {
  margin: 0,
  color: "#75e6ff",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".16em",
};
const passageHeading: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "clamp(17px,1.8vw,24px)",
  lineHeight: 1.08,
};
const readBadge: CSSProperties = {
  borderRadius: 999,
  background: "rgba(52,211,153,.1)",
  color: "#b9f7dc",
  padding: "5px 7px",
  fontSize: 8,
  fontWeight: 900,
  whiteSpace: "nowrap",
};
const passageBody: CSSProperties = {
  flex: 1,
  minHeight: 0,
  marginTop: 10,
  overflowY: "auto",
  paddingRight: 5,
};
const passageParagraph: CSSProperties = {
  margin: "0 0 12px",
  color: "rgba(255,255,255,.88)",
  fontSize: "clamp(13px,1.05vw,17px)",
  lineHeight: 1.72,
};
const passageImageFigure: CSSProperties = { margin: "0 0 12px", textAlign: "center" };
const passageImage: CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: "170px",
  objectFit: "contain",
  borderRadius: 10,
  background: "white",
};
const passageImageCaptionStyle: CSSProperties = {
  marginTop: 5,
  color: "rgba(255,255,255,.5)",
  fontSize: 9,
};

function questionPanel(isMobile: boolean): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    borderRadius: isMobile ? 18 : 24,
    border: "1px solid rgba(255,255,255,.11)",
    background: "rgba(13,25,45,.95)",
    padding: isMobile ? 12 : 16,
    display: "flex",
    flexDirection: "column",
  };
}
const questionTop: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};
const questionEyebrow: CSSProperties = {
  margin: 0,
  color: "#8befff",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".12em",
  textTransform: "uppercase",
};
const questionMeta: CSSProperties = {
  margin: "3px 0 0",
  color: "rgba(255,255,255,.42)",
  fontSize: 10,
};
const skillBadge: CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(126,232,255,.15)",
  background: "rgba(126,232,255,.055)",
  color: "rgba(255,255,255,.62)",
  padding: "5px 7px",
  fontSize: 8,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".07em",
  maxWidth: "45%",
};
const progressTrack: CSSProperties = {
  flex: "0 0 auto",
  height: 5,
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,.07)",
  marginTop: 9,
};
const progressFill: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg,#56d8ff,#66e3bd)",
  transition: "width 180ms ease",
};
const questionNavigator: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  marginTop: 8,
};
function navButton(active: boolean, answered: boolean): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: active
      ? "1px solid rgba(126,232,255,.7)"
      : "1px solid rgba(255,255,255,.1)",
    background: active
      ? "#7de7f6"
      : answered
        ? "rgba(52,211,153,.13)"
        : "rgba(255,255,255,.035)",
    color: active ? "#061326" : answered ? "#b8f7dc" : "rgba(255,255,255,.5)",
    fontSize: 9,
    fontWeight: 950,
    cursor: "pointer",
  };
}
const questionScrollArea: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  paddingRight: 4,
};
const questionCard: CSSProperties = { marginTop: 10, display: "grid", gap: 10 };
const prompt: CSSProperties = {
  margin: 0,
  fontSize: "clamp(18px,1.8vw,26px)",
  lineHeight: 1.18,
};
function optionGrid(hasImages: boolean): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: hasImages ? "repeat(2,minmax(0,1fr))" : "1fr",
    gap: 7,
  };
}
function optionButton(active: boolean, disabled: boolean): CSSProperties {
  return {
    minHeight: 52,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "30px minmax(0,1fr)",
    gap: 8,
    alignItems: "center",
    textAlign: "left",
    borderRadius: 12,
    border: active
      ? "1px solid rgba(116,232,247,.65)"
      : "1px solid rgba(255,255,255,.1)",
    background: active ? "rgba(74,205,227,.14)" : "rgba(255,255,255,.035)",
    color: "white",
    padding: "7px 9px",
    cursor: disabled ? "default" : "pointer",
  };
}
const optionLetter: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(126,232,255,.16)",
  background: "rgba(4,17,33,.5)",
  color: "#d7fbff",
  fontSize: 10,
  fontWeight: 950,
};
const optionBody: CSSProperties = { minWidth: 0, display: "grid", gap: 5 };
const optionImage: CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: 105,
  objectFit: "contain",
  borderRadius: 8,
  background: "white",
};
const optionText: CSSProperties = { fontSize: 12, fontWeight: 780, lineHeight: 1.35 };
const feedbackGood: CSSProperties = {
  borderRadius: 11,
  border: "1px solid rgba(52,211,153,.25)",
  background: "rgba(52,211,153,.08)",
  color: "#c7f9e5",
  padding: 9,
  display: "grid",
  gap: 4,
  fontSize: 10,
};
const feedbackWrong: CSSProperties = {
  ...feedbackGood,
  border: "1px solid rgba(248,113,113,.28)",
  background: "rgba(239,68,68,.08)",
  color: "#fecaca",
};
const feedbackText: CSSProperties = { color: "rgba(255,255,255,.62)", lineHeight: 1.4 };
const errorBox: CSSProperties = {
  borderRadius: 11,
  border: "1px solid rgba(248,113,113,.3)",
  background: "rgba(239,68,68,.1)",
  color: "#fecaca",
  padding: 9,
  fontSize: 10,
  lineHeight: 1.4,
};
function actions(isMobile: boolean): CSSProperties {
  return {
    flex: "0 0 auto",
    paddingTop: 9,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
  };
}
const secondaryButton: CSSProperties = {
  minHeight: 40,
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.05)",
  color: "white",
  padding: "0 11px",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 10,
};
const primaryButton: CSSProperties = {
  ...secondaryButton,
  border: "1px solid rgba(126,232,255,.4)",
  background: "linear-gradient(135deg,#77e6f5,#74ddc4)",
  color: "#061326",
};
