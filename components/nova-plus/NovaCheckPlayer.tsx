"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type {
  NovaCheckPayload,
  NovaCheckQuestion,
  NovaCheckSubmitResult,
} from "@/lib/nova-plus/phase6-types";
import styles from "./NovaCheckPlayer.module.css";

type JsonObject = Record<string, any>;
type AnswerMap = Record<string, JsonObject>;
type TimeMap = Record<string, number>;

type Stage =
  | "loading"
  | "intro"
  | "playing"
  | "submitting"
  | "results"
  | "error";

type Option = {
  id: string;
  text: string;
  image_url: string | null;
  image_alt: string | null;
  show_text_with_image: boolean;
};

function asOptions(
  question: NovaCheckQuestion,
): Option[] {
  const options = Array.isArray(
    question.content?.options,
  )
    ? question.content.options
    : [];

  if (
    question.question_type ===
      "true_false" &&
    options.length === 0
  ) {
    return [
      {
        id: "true",
        text: "True",
        image_url: null,
        image_alt: null,
        show_text_with_image: true,
      },
      {
        id: "false",
        text: "False",
        image_url: null,
        image_alt: null,
        show_text_with_image: true,
      },
    ];
  }

  return options
    .map((option: any, index: number) => ({
      id: String(
        option?.id ??
          option?.key ??
          index + 1,
      ),
      text: String(option?.text ?? ""),
      image_url: option?.image_url
        ? String(option.image_url)
        : option?.image_path
          ? String(option.image_path)
          : null,
      image_alt: option?.image_alt
        ? String(option.image_alt)
        : null,
      show_text_with_image:
        option?.show_text_with_image !==
        false,
    }))
    .filter(
      (option: Option) =>
        option.text.trim().length > 0 ||
        Boolean(option.image_url),
    );
}

function stableNumber(value: string) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function orderedTokens(
  question: NovaCheckQuestion,
  attemptId: string,
) {
  const tokens = Array.isArray(
    question.content?.tokens,
  )
    ? question.content.tokens
        .map(
          (
            token: any,
            index: number,
          ) => ({
            id: String(
              token?.id ?? index + 1,
            ),
            text: String(
              token?.text ?? "",
            ),
          }),
        )
        .filter(
          (token: {
            id: string;
            text: string;
          }) => token.text.trim(),
        )
    : [];

  return [...tokens].sort(
    (left, right) =>
      stableNumber(
        `${attemptId}:${question.id}:${left.id}`,
      ) -
      stableNumber(
        `${attemptId}:${question.id}:${right.id}`,
      ),
  );
}

function responseComplete(
  question: NovaCheckQuestion,
  response?: JsonObject,
) {
  if (!response) return false;

  switch (question.question_type) {
    case "multiple_choice":
    case "true_false":
      return Boolean(response.option_id);

    case "multiple_select":
      return (
        Array.isArray(response.option_ids) &&
        response.option_ids.length > 0
      );

    case "short_text":
      return (
        String(response.text ?? "")
          .trim()
          .length > 0
      );

    case "sentence_reordering":
      return (
        Array.isArray(
          response.token_ids,
        ) &&
        response.token_ids.length ===
          (Array.isArray(
            question.content?.tokens,
          )
            ? question.content.tokens
                .length
            : 0)
      );

    case "numeric":
      return (
        typeof response.value ===
          "number" &&
        Number.isFinite(response.value)
      );

    case "numeric_unit":
      return (
        typeof response.value ===
          "number" &&
        Number.isFinite(response.value) &&
        String(response.unit ?? "")
          .trim()
          .length > 0
      );

    case "fraction":
      return (
        Number.isInteger(
          response.numerator,
        ) &&
        Number.isInteger(
          response.denominator,
        ) &&
        response.denominator !== 0
      );

    case "money":
      return (
        Number.isInteger(
          response.amount_cents,
        ) &&
        response.amount_cents >= 0
      );

    default:
      return false;
  }
}

function friendlyCorrectResponse(
  value: JsonObject | string | null,
) {
  if (value == null) return "";

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value.display === "string"
  ) {
    return value.display;
  }

  if (
    typeof value.display_answer ===
    "string"
  ) {
    return value.display_answer;
  }

  if (typeof value.text === "string") {
    return value.text;
  }

  if (
    Array.isArray(
      value.correct_option_ids,
    )
  ) {
    return value.correct_option_ids.join(
      ", ",
    );
  }

  if (
    Array.isArray(
      value.accepted_answers,
    )
  ) {
    return value.accepted_answers.join(
      " / ",
    );
  }

  if (Array.isArray(value.order)) {
    return value.order.join(" → ");
  }

  if (
    typeof value.value === "number"
  ) {
    const unit =
      Array.isArray(value.units) &&
      value.units.length > 0
        ? ` ${value.units[0]}`
        : "";
    return `${value.value}${unit}`;
  }

  if (
    Number.isInteger(value.numerator) &&
    Number.isInteger(
      value.denominator,
    )
  ) {
    return `${value.numerator}/${value.denominator}`;
  }

  if (
    Number.isInteger(
      value.amount_cents,
    )
  ) {
    return `$${(
      value.amount_cents / 100
    ).toFixed(2)}`;
  }

  return JSON.stringify(value);
}

function subjectLabel(
  value: "english" | "math",
) {
  return value === "math"
    ? "Mathematics"
    : "English";
}

function outcomeCopy(
  result: NovaCheckSubmitResult,
) {
  if (
    result.outcome === "resolved"
  ) {
    return {
      eyebrow: "LEARNING LOOP COMPLETE",
      title: "Gap resolved",
      body:
        "The new practice evidence and this Nova Check show that the concept has strengthened enough to leave the support loop.",
      label: "Resolved",
    };
  }

  if (
    result.outcome === "improving"
  ) {
    return {
      eyebrow: "PROGRESS CONFIRMED",
      title: "Improving — keep building",
      body:
        "The learner is moving in the right direction. Nova will gather another small block of fresh practice before checking again.",
      label: "Improving",
    };
  }

  return {
    eyebrow: "SUPPORT LOOP CONTINUES",
    title: "Still needs support",
    body:
      "The concept is not secure yet. Nova has reopened targeted practice and will wait for new evidence before another check.",
    label: "Keep practising",
  };
}

export default function NovaCheckPlayer({
  cycleId,
}: {
  cycleId: string;
}) {
  const router = useRouter();

  const [stage, setStage] =
    useState<Stage>("loading");

  const [payload, setPayload] =
    useState<NovaCheckPayload | null>(
      null,
    );

  const [answers, setAnswers] =
    useState<AnswerMap>({});

  const [
    timeByQuestion,
    setTimeByQuestion,
  ] = useState<TimeMap>({});

  const [questionIndex, setQuestionIndex] =
    useState(0);

  const [result, setResult] =
    useState<NovaCheckSubmitResult | null>(
      null,
    );

  const [error, setError] =
    useState("");

  const [actionBusy, setActionBusy] =
    useState(false);

  const questionOpenedAtRef =
    useRef(Date.now());

  const checkStartedAtRef =
    useRef(Date.now());

  const load = useCallback(
    async () => {
      setStage("loading");
      setError("");
      setResult(null);

      const { data, error: loadError } =
        await supabase.rpc(
          "get_nova_check_payload",
          {
            p_cycle_id: cycleId,
          },
        );

      if (loadError || !data) {
        setError(
          loadError?.message ||
            "Nova Check could not be loaded.",
        );
        setStage("error");
        return;
      }

      const next =
        data as NovaCheckPayload;

      if (
        !Array.isArray(
          next.questions,
        ) ||
        next.questions.length !== 5
      ) {
        setError(
          "This Nova Check does not have five usable questions yet.",
        );
        setStage("error");
        return;
      }

      const restoredAnswers: AnswerMap =
        {};
      const restoredTime: TimeMap = {};

      for (const saved of
        next.saved_answers ?? []) {
        restoredAnswers[
          saved.question_id
        ] =
          saved.response_data ?? {};

        restoredTime[
          saved.question_id
        ] =
          Number(
            saved.time_spent_seconds ??
              0,
          );
      }

      setPayload(next);
      setAnswers(restoredAnswers);
      setTimeByQuestion(restoredTime);

      const firstIncomplete =
        next.questions.findIndex(
          (question) =>
            !responseComplete(
              question,
              restoredAnswers[
                question.id
              ],
            ),
        );

      setQuestionIndex(
        firstIncomplete >= 0
          ? firstIncomplete
          : 0,
      );

      questionOpenedAtRef.current =
        Date.now();

      checkStartedAtRef.current =
        Date.now();

      setStage("intro");
    },
    [cycleId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const currentQuestion =
    payload?.questions[
      questionIndex
    ] ?? null;

  const currentResponse =
    currentQuestion
      ? answers[currentQuestion.id] ??
        {}
      : {};

  const completedCount =
    useMemo(() => {
      if (!payload) return 0;

      return payload.questions.filter(
        (question) =>
          responseComplete(
            question,
            answers[question.id],
          ),
      ).length;
    }, [answers, payload]);



  function updateResponse(
    nextResponse: JsonObject,
  ) {
    if (!currentQuestion) return;

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]:
        nextResponse,
    }));

    setError("");
  }

  function currentElapsedSeconds() {
    return Math.max(
      1,
      Math.round(
        (Date.now() -
          questionOpenedAtRef.current) /
          1000,
      ),
    );
  }

  async function saveCurrentAnswer() {
    if (
      !payload ||
      !currentQuestion
    ) {
      return false;
    }

    if (
      !responseComplete(
        currentQuestion,
        currentResponse,
      )
    ) {
      setError(
        "Complete this question before continuing.",
      );
      return false;
    }

    const elapsed =
      currentElapsedSeconds();

    const cumulative =
      Number(
        timeByQuestion[
          currentQuestion.id
        ] ?? 0,
      ) + elapsed;

    setActionBusy(true);
    setError("");

    const { error: saveError } =
      await supabase.rpc(
        "save_nova_check_answer",
        {
          p_attempt_id:
            payload.attempt_id,

          p_question_id:
            currentQuestion.id,

          p_response_data:
            currentResponse,

          p_time_spent_seconds:
            cumulative,
        },
      );

    setActionBusy(false);

    if (saveError) {
      setError(saveError.message);
      return false;
    }

    setTimeByQuestion(
      (current) => ({
        ...current,
        [currentQuestion.id]:
          cumulative,
      }),
    );

    questionOpenedAtRef.current =
      Date.now();

    return true;
  }

  async function nextQuestion() {
    if (
      !payload ||
      !currentQuestion
    ) {
      return;
    }

    /*
     * Final submission already persists and marks every answer in one RPC.
     * Do not perform a separate final save first; this preserves the current
     * question's elapsed time and avoids an unnecessary round trip.
     */
    if (
      questionIndex >=
      payload.questions.length - 1
    ) {
      await submitCheck();
      return;
    }

    const saved =
      await saveCurrentAnswer();

    if (!saved) return;

    setQuestionIndex(
      (current) => current + 1,
    );

    questionOpenedAtRef.current =
      Date.now();

    setError("");
  }

  function previousQuestion() {
    if (questionIndex <= 0) return;

    const elapsed =
      currentQuestion
        ? currentElapsedSeconds()
        : 0;

    if (currentQuestion) {
      setTimeByQuestion(
        (current) => ({
          ...current,
          [currentQuestion.id]:
            Number(
              current[
                currentQuestion.id
              ] ?? 0,
            ) + elapsed,
        }),
      );
    }

    setQuestionIndex(
      (current) =>
        Math.max(0, current - 1),
    );

    questionOpenedAtRef.current =
      Date.now();

    setError("");
  }

  async function submitCheck() {
    if (!payload || actionBusy) {
      return;
    }

    /*
     * The final question may not yet have been persisted if submitCheck()
     * is called from the last question. Save it first unless the caller
     * has just done so via nextQuestion().
     */
    if (
      currentQuestion &&
      !responseComplete(
        currentQuestion,
        answers[currentQuestion.id],
      )
    ) {
      setError(
        "Complete this question before submitting.",
      );
      return;
    }

    const stillMissing =
      payload.questions.filter(
        (question) =>
          !responseComplete(
            question,
            answers[question.id],
          ),
      );

    if (stillMissing.length > 0) {
      const index =
        payload.questions.findIndex(
          (question) =>
            question.id ===
            stillMissing[0].id,
        );

      if (index >= 0) {
        setQuestionIndex(index);
        questionOpenedAtRef.current =
          Date.now();
      }

      setError(
        `Answer all five questions before submitting. ${stillMissing.length} ${
          stillMissing.length === 1
            ? "question is"
            : "questions are"
        } still incomplete.`,
      );

      return;
    }

    setActionBusy(true);
    setStage("submitting");
    setError("");

    const totalDuration =
      Math.max(
        1,
        Math.round(
          (Date.now() -
            checkStartedAtRef.current) /
            1000,
        ),
      );

    const currentQuestionExtraSeconds =
      currentQuestion
        ? currentElapsedSeconds()
        : 0;

    const submittedAnswers =
      payload.questions.map(
        (question) => ({
          question_id:
            question.id,

          response_data:
            answers[question.id],

          time_spent_seconds:
            Number(
              timeByQuestion[
                question.id
              ] ?? 0,
            ) +
            (currentQuestion?.id ===
            question.id
              ? currentQuestionExtraSeconds
              : 0),
        }),
      );

    const {
      data,
      error: submitError,
    } = await supabase.rpc(
      "submit_nova_check_attempt",
      {
        p_attempt_id:
          payload.attempt_id,

        p_answers:
          submittedAnswers,

        p_duration_seconds:
          totalDuration,
      },
    );

    setActionBusy(false);

    if (submitError || !data) {
      setError(
        submitError?.message ||
          "Nova Check could not be submitted.",
      );
      setStage("playing");
      return;
    }

    setResult(
      data as NovaCheckSubmitResult,
    );

    setStage("results");
  }

  function returnToNova() {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    router.push(
      "/learning-missions/progress-rewards",
    );
  }

  if (stage === "loading") {
    return (
      <main className={styles.page}>
        <div
          className={styles.background}
          aria-hidden="true"
        />
        <section
          className={
            styles.centerState
          }
        >
          <span
            className={styles.loader}
          />
          <strong>
            Preparing Nova Check…
          </strong>
          <p>
            Selecting five validated
            questions for this exact
            concept.
          </p>
        </section>
      </main>
    );
  }

  if (
    stage === "error" ||
    !payload
  ) {
    return (
      <main className={styles.page}>
        <div
          className={styles.background}
          aria-hidden="true"
        />
        <section
          className={
            styles.centerState
          }
        >
          <div
            className={
              styles.novaBadge
            }
          >
            N+
          </div>

          <strong>
            Nova Check could not open
          </strong>

          <p>{error}</p>

          <div
            className={
              styles.stateActions
            }
          >
            <button
              type="button"
              onClick={() => void load()}
            >
              Try Again
            </button>

            <button
              type="button"
              className={
                styles.secondaryButton
              }
              onClick={returnToNova}
            >
              Back to NOVA+
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (stage === "intro") {
    return (
      <main className={styles.page}>
        <div
          className={styles.background}
          aria-hidden="true"
        />

        <section
          className={styles.intro}
        >
          <div
            className={
              styles.introMark
            }
          >
            <span>N+</span>
            <i />
          </div>

          <div>
            <span
              className={styles.eyebrow}
            >
              NOVA CHECK
            </span>

            <h1>
              Ready to check again?
            </h1>

            <p>
              This is a short,
              five-question check for{" "}
              <strong>
                {
                  payload.cycle
                    .skill_name
                }
              </strong>
              . It uses existing
              validated Dreamscape
              questions, not
              AI-generated questions.
            </p>
          </div>

          <div
            className={
              styles.introSummary
            }
          >
            <div>
              <small>Subject</small>
              <strong>
                {subjectLabel(
                  payload.cycle
                    .subject,
                )}{" "}
                · P
                {
                  payload.cycle
                    .primary_level
                }
              </strong>
            </div>

            <div>
              <small>
                New practice
              </small>
              <strong>
                {
                  payload.cycle
                    .practice_questions
                }{" "}
                questions
              </strong>
            </div>

            <div>
              <small>
                Practice accuracy
              </small>
              <strong>
                {payload.cycle
                  .practice_accuracy ===
                null
                  ? "—"
                  : `${Math.round(
                      Number(
                        payload.cycle
                          .practice_accuracy,
                      ),
                    )}%`}
              </strong>
            </div>

            <div>
              <small>Nova Check</small>
              <strong>
                5 questions · ~4 min
              </strong>
            </div>
          </div>

          <div
            className={
              styles.introNotice
            }
          >
            <span>◎</span>
            <p>
              You will see your results
              after all five questions.
              Nova Check does not award
              Dream Tokens or Dream
              Gems.
            </p>
          </div>

          <div
            className={
              styles.introActions
            }
          >
            <button
              type="button"
              className={
                styles.primaryButton
              }
              onClick={() => {
                checkStartedAtRef.current =
                  Date.now();
                questionOpenedAtRef.current =
                  Date.now();
                setStage("playing");
              }}
            >
              {payload.resumed
                ? "Continue Nova Check"
                : "Begin Nova Check"}
              <span>→</span>
            </button>

            <button
              type="button"
              className={
                styles.secondaryButton
              }
              onClick={returnToNova}
            >
              Not Now
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (
    stage === "submitting"
  ) {
    return (
      <main className={styles.page}>
        <div
          className={styles.background}
          aria-hidden="true"
        />
        <section
          className={
            styles.centerState
          }
        >
          <span
            className={styles.loader}
          />
          <strong>
            Nova is checking the new
            evidence…
          </strong>
          <p>
            Marking the five questions
            and updating this concept
            only.
          </p>
        </section>
      </main>
    );
  }

  if (
    stage === "results" &&
    result
  ) {
    const copy =
      outcomeCopy(result);

    return (
      <main className={styles.page}>
        <div
          className={styles.background}
          aria-hidden="true"
        />

        <section
          className={styles.results}
        >
          <header
            className={`${styles.resultHero} ${
              result.outcome ===
              "resolved"
                ? styles.resultResolved
                : result.outcome ===
                    "improving"
                  ? styles.resultImproving
                  : styles.resultSupport
            }`}
          >
            <div>
              <span
                className={
                  styles.eyebrow
                }
              >
                {copy.eyebrow}
              </span>

              <h1>{copy.title}</h1>

              <p>{copy.body}</p>
            </div>

            <div
              className={
                styles.scoreOrb
              }
            >
              <strong>
                {result.correct_count}/
                {result.total_questions}
              </strong>
              <span>
                {Math.round(
                  result.percentage,
                )}
                %
              </span>
            </div>
          </header>

          <div
            className={
              styles.resultMetrics
            }
          >
            <div>
              <small>Outcome</small>
              <strong>
                {copy.label}
              </strong>
            </div>

            <div>
              <small>
                Updated mastery
              </small>
              <strong>
                {result.mastery_score ===
                null
                  ? "—"
                  : `${Math.round(
                      result.mastery_score,
                    )}%`}
              </strong>
            </div>

            <div>
              <small>
                Mastery status
              </small>
              <strong>
                {String(
                  result.mastery_status ||
                    "Updating",
                )
                  .replaceAll("_", " ")
                  .replace(
                    /\b\w/g,
                    (letter) =>
                      letter.toUpperCase(),
                  )}
              </strong>
            </div>

            <div>
              <small>
                Profile evidence
              </small>
              <strong>
                {
                  result.evidence_rows_written
                }{" "}
                rows
              </strong>
            </div>
          </div>

          <section
            className={
              styles.answerReview
            }
          >
            <div
              className={
                styles.resultHeading
              }
            >
              <div>
                <span
                  className={
                    styles.eyebrow
                  }
                >
                  QUESTION REVIEW
                </span>
                <h2>
                  What happened in the
                  check
                </h2>
              </div>

              <b>
                {
                  result.correct_count
                }{" "}
                correct
              </b>
            </div>

            <div
              className={
                styles.resultList
              }
            >
              {result.question_results.map(
                (item) => (
                  <article
                    key={
                      item.question_id
                    }
                    className={
                      item.is_correct
                        ? styles.correctResult
                        : styles.wrongResult
                    }
                  >
                    <div
                      className={
                        styles.resultNumber
                      }
                    >
                      {
                        item.question_order
                      }
                    </div>

                    <div>
                      <div
                        className={
                          styles.resultStatusLine
                        }
                      >
                        <strong>
                          {item.is_correct
                            ? "Correct"
                            : "Needs another look"}
                        </strong>

                        <span>
                          {Number(
                            item.marks_awarded,
                          ).toFixed(
                            Number(
                              item.marks_awarded,
                            ) % 1
                              ? 1
                              : 0,
                          )}
                          /
                          {Number(
                            item.maximum_marks,
                          ).toFixed(
                            Number(
                              item.maximum_marks,
                            ) % 1
                              ? 1
                              : 0,
                          )}
                        </span>
                      </div>

                      <p
                        className={
                          styles.resultPrompt
                        }
                      >
                        {item.prompt}
                      </p>

                      {!item.is_correct &&
                        friendlyCorrectResponse(
                          item.correct_response,
                        ) && (
                          <p
                            className={
                              styles.correctAnswer
                            }
                          >
                            <span>
                              Correct answer
                            </span>
                            {friendlyCorrectResponse(
                              item.correct_response,
                            )}
                          </p>
                        )}

                      {item.explanation && (
                        <details
                          className={
                            styles.explanation
                          }
                        >
                          <summary>
                            Explanation
                          </summary>
                          <p>
                            {
                              item.explanation
                            }
                          </p>
                        </details>
                      )}
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>

          <footer
            className={
              styles.resultFooter
            }
          >
            <div>
              <strong>
                {result.outcome ===
                "resolved"
                  ? "Nova will move on to the next best learning priority."
                  : "Nova will continue this learning loop with fresh practice."}
              </strong>

              <p>
                The result has already
                been added to the same
                canonical learner profile
                used by Mastery Map,
                Strengths & Gaps and Nova
                Recommends.
              </p>
            </div>

            <button
              type="button"
              className={
                styles.primaryButton
              }
              onClick={returnToNova}
            >
              Back to Nova Recommends
              <span>→</span>
            </button>
          </footer>
        </section>
      </main>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress =
    ((questionIndex + 1) /
      payload.questions.length) *
    100;

  return (
    <main className={styles.page}>
      <div
        className={styles.background}
        aria-hidden="true"
      />

      <section
        className={styles.checkShell}
      >
        <header
          className={styles.checkHeader}
        >
          <div>
            <span
              className={styles.eyebrow}
            >
              NOVA CHECK ·{" "}
              {subjectLabel(
                payload.cycle.subject,
              ).toUpperCase()}{" "}
              P
              {
                payload.cycle
                  .primary_level
              }
            </span>

            <h1>
              {payload.cycle.skill_name}
            </h1>
          </div>

          <div
            className={
              styles.checkProgressText
            }
          >
            <strong>
              {questionIndex + 1}/5
            </strong>
            <span>
              {completedCount} answered
            </span>
          </div>
        </header>

        <div
          className={
            styles.progressTrack
          }
        >
          <i
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <article
          className={
            styles.questionCard
          }
        >
          <div
            className={
              styles.questionMeta
            }
          >
            <span>
              Question{" "}
              {questionIndex + 1}
            </span>

            <b>
              {currentQuestion.question_type
                .replaceAll("_", " ")
                .replace(
                  /\b\w/g,
                  (letter) =>
                    letter.toUpperCase(),
                )}
            </b>
          </div>

          {currentQuestion.instruction && (
            <p
              className={
                styles.instruction
              }
            >
              {
                currentQuestion.instruction
              }
            </p>
          )}

          <h2>
            {currentQuestion.prompt}
          </h2>

          <QuestionResponse
            question={currentQuestion}
            response={currentResponse}
            attemptId={
              payload.attempt_id
            }
            disabled={actionBusy}
            onChange={updateResponse}
          />

          {error && (
            <p
              className={styles.error}
            >
              {error}
            </p>
          )}
        </article>

        <footer
          className={
            styles.checkFooter
          }
        >
          <button
            type="button"
            className={
              styles.secondaryButton
            }
            disabled={
              actionBusy ||
              questionIndex === 0
            }
            onClick={previousQuestion}
          >
            ← Previous
          </button>

          <span>
            Results appear only after
            all five questions.
          </span>

          <button
            type="button"
            className={
              styles.primaryButton
            }
            disabled={
              actionBusy ||
              !responseComplete(
                currentQuestion,
                currentResponse,
              )
            }
            onClick={() =>
              void nextQuestion()
            }
          >
            {actionBusy
              ? "Saving…"
              : questionIndex === 4
                ? "Submit Nova Check"
                : "Save & Continue"}
            <span>→</span>
          </button>
        </footer>
      </section>
    </main>
  );
}

function QuestionResponse({
  question,
  response,
  attemptId,
  disabled,
  onChange,
}: {
  question: NovaCheckQuestion;
  response: JsonObject;
  attemptId: string;
  disabled: boolean;
  onChange: (
    response: JsonObject,
  ) => void;
}) {
  if (
    question.question_type ===
      "multiple_choice" ||
    question.question_type ===
      "true_false"
  ) {
    const options =
      asOptions(question);

    return (
      <div
        className={styles.optionGrid}
      >
        {options.map(
          (option, index) => {
            const selected =
              String(
                response.option_id ??
                  "",
              ) === option.id;

            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                className={
                  selected
                    ? styles.selectedOption
                    : styles.option
                }
                onClick={() =>
                  onChange({
                    option_id:
                      option.id,
                  })
                }
              >
                <span
                  className={
                    styles.optionLetter
                  }
                >
                  {String.fromCharCode(
                    65 + index,
                  )}
                </span>

                <div>
                  {option.image_url && (
                    <img
                      src={
                        option.image_url
                      }
                      alt={
                        option.image_alt ||
                        ""
                      }
                    />
                  )}

                  {(!option.image_url ||
                    option.show_text_with_image) &&
                    option.text && (
                      <strong>
                        {option.text}
                      </strong>
                    )}
                </div>
              </button>
            );
          },
        )}
      </div>
    );
  }

  if (
    question.question_type ===
    "multiple_select"
  ) {
    const options =
      asOptions(question);

    const selectedIds = new Set(
      Array.isArray(
        response.option_ids,
      )
        ? response.option_ids.map(
            String,
          )
        : [],
    );

    return (
      <div>
        <p
          className={
            styles.responseHint
          }
        >
          Select all answers that
          apply.
        </p>

        <div
          className={styles.optionGrid}
        >
          {options.map(
            (option, index) => {
              const selected =
                selectedIds.has(
                  option.id,
                );

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  className={
                    selected
                      ? styles.selectedOption
                      : styles.option
                  }
                  onClick={() => {
                    const next =
                      new Set(
                        selectedIds,
                      );

                    if (selected) {
                      next.delete(
                        option.id,
                      );
                    } else {
                      next.add(
                        option.id,
                      );
                    }

                    onChange({
                      option_ids:
                        [...next],
                    });
                  }}
                >
                  <span
                    className={
                      styles.optionLetter
                    }
                  >
                    {String.fromCharCode(
                      65 + index,
                    )}
                  </span>

                  <div>
                    {option.image_url && (
                      <img
                        src={
                          option.image_url
                        }
                        alt={
                          option.image_alt ||
                          ""
                        }
                      />
                    )}

                    {(!option.image_url ||
                      option.show_text_with_image) &&
                      option.text && (
                        <strong>
                          {
                            option.text
                          }
                        </strong>
                      )}
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>
    );
  }

  if (
    question.question_type ===
    "short_text"
  ) {
    return (
      <label
        className={styles.textAnswer}
      >
        <span>Your answer</span>
        <input
          type="text"
          disabled={disabled}
          value={String(
            response.text ?? "",
          )}
          autoComplete="off"
          onChange={(event) =>
            onChange({
              text:
                event.target.value,
            })
          }
        />
      </label>
    );
  }

  if (
    question.question_type ===
    "sentence_reordering"
  ) {
    const tokens =
      orderedTokens(
        question,
        attemptId,
      );

    const selectedIds =
      Array.isArray(
        response.token_ids,
      )
        ? response.token_ids.map(
            String,
          )
        : [];

    const byId = new Map(
      tokens.map((token) => [
        token.id,
        token,
      ]),
    );

    return (
      <div
        className={
          styles.reorderWrap
        }
      >
        <p
          className={
            styles.responseHint
          }
        >
          Build the correct order.
          Select a chosen item again to
          remove it.
        </p>

        <div
          className={
            styles.selectedOrder
          }
        >
          {selectedIds.length === 0 ? (
            <span>
              Your ordered answer will
              appear here.
            </span>
          ) : (
            selectedIds.map(
              (id, index) => (
                <button
                  key={`${id}-${index}`}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      token_ids:
                        selectedIds.filter(
                          (
                            _,
                            selectedIndex,
                          ) =>
                            selectedIndex !==
                            index,
                        ),
                    })
                  }
                >
                  <b>
                    {index + 1}
                  </b>
                  <span>
                    {byId.get(id)
                      ?.text || id}
                  </span>
                </button>
              ),
            )
          )}
        </div>

        <div
          className={
            styles.tokenBank
          }
        >
          {tokens
            .filter(
              (token) =>
                !selectedIds.includes(
                  token.id,
                ),
            )
            .map((token) => (
              <button
                key={token.id}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    token_ids: [
                      ...selectedIds,
                      token.id,
                    ],
                  })
                }
              >
                {token.text}
              </button>
            ))}
        </div>
      </div>
    );
  }

  if (
    question.question_type ===
      "numeric" ||
    question.question_type ===
      "numeric_unit"
  ) {
    const hasValue =
      typeof response.value ===
        "number" &&
      Number.isFinite(response.value);

    return (
      <div
        className={
          styles.numberAnswer
        }
      >
        <label>
          <span>
            {question.question_type ===
            "numeric_unit"
              ? "Number"
              : "Your answer"}
          </span>

          <input
            type="number"
            step="any"
            disabled={disabled}
            value={
              hasValue
                ? String(
                    response.value,
                  )
                : ""
            }
            onChange={(event) => {
              const raw =
                event.target.value;

              onChange({
                ...response,
                value:
                  raw === ""
                    ? null
                    : Number(raw),
              });
            }}
          />
        </label>

        {question.question_type ===
          "numeric_unit" && (
          <label>
            <span>Unit</span>
            <input
              type="text"
              disabled={disabled}
              value={String(
                response.unit ?? "",
              )}
              autoComplete="off"
              onChange={(event) =>
                onChange({
                  ...response,
                  unit:
                    event.target
                      .value,
                })
              }
            />
          </label>
        )}
      </div>
    );
  }

  if (
    question.question_type ===
    "fraction"
  ) {
    return (
      <div
        className={
          styles.fractionAnswer
        }
      >
        <label>
          <span>Numerator</span>
          <input
            type="number"
            step="1"
            disabled={disabled}
            value={
              Number.isInteger(
                response.numerator,
              )
                ? String(
                    response.numerator,
                  )
                : ""
            }
            onChange={(event) =>
              onChange({
                ...response,
                numerator:
                  event.target.value ===
                  ""
                    ? null
                    : Number(
                        event.target
                          .value,
                      ),
              })
            }
          />
        </label>

        <i />

        <label>
          <span>Denominator</span>
          <input
            type="number"
            step="1"
            disabled={disabled}
            value={
              Number.isInteger(
                response.denominator,
              )
                ? String(
                    response.denominator,
                  )
                : ""
            }
            onChange={(event) =>
              onChange({
                ...response,
                denominator:
                  event.target.value ===
                  ""
                    ? null
                    : Number(
                        event.target
                          .value,
                      ),
              })
            }
          />
        </label>
      </div>
    );
  }

  if (
    question.question_type ===
    "money"
  ) {
    const amount =
      Number.isInteger(
        response.amount_cents,
      )
        ? (
            response.amount_cents /
            100
          ).toFixed(2)
        : "";

    return (
      <label
        className={styles.moneyAnswer}
      >
        <span>Your answer</span>

        <div>
          <b>S$</b>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={disabled}
            value={amount}
            onChange={(event) => {
              const raw =
                event.target.value;

              const value =
                raw === ""
                  ? null
                  : Math.round(
                      Number(raw) *
                        100,
                    );

              onChange({
                amount_cents:
                  value,
              });
            }}
          />
        </div>
      </label>
    );
  }

  return (
    <p className={styles.error}>
      This question type is not yet
      available in Nova Check.
    </p>
  );
}
