import "server-only";

import {
  createHash,
} from "crypto";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  SyntheticPerformanceProfile,
} from "@/lib/agents/execution/types";

import {
  isNovaLearningMachineSimpleQuestion,
} from "@/lib/agents/execution/novaLearningSupport";

type JsonObject = Record<
  string,
  unknown
>;

function roll(
  seed: string,
) {
  const digest =
    createHash(
      "sha256",
    )
      .update(
        seed,
      )
      .digest();

  return (
    digest.readUInt32BE(
      0,
    ) /
    0xffffffff
  );
}

function shouldCorrect(
  seed: string,
  accuracy: number,
) {
  return (
    roll(
      seed,
    ) <
    Math.max(
      0.05,
      Math.min(
        0.98,
        accuracy,
      ),
    )
  );
}

function chooseWrongAbcd(
  correct: string,
  seed: string,
) {
  const choices =
    [
      "A",
      "B",
      "C",
      "D",
    ].filter(
      (
        value,
      ) =>
        value !==
        correct.toUpperCase(),
    );

  return choices[
    Math.floor(
      roll(
        seed,
      ) *
      choices.length,
    ) %
    choices.length
  ];
}

function getCorrectOptionId(
  answerData: unknown,
) {
  const data =
    (
      answerData &&
      typeof answerData ===
        "object" &&
      !Array.isArray(
        answerData,
      )
    )
      ? answerData as JsonObject
      : {};

  const ids =
    Array.isArray(
      data.correct_option_ids,
    )
      ? data.correct_option_ids
      : [];

  const first =
    ids.length > 0
      ? String(
          ids[0] ??
          "",
        )
      : "";

  return (
    first ||
    String(
      data.correct_option_id ??
      "",
    )
  );
}

function getOptionIds(
  content: unknown,
) {
  const data =
    (
      content &&
      typeof content ===
        "object" &&
      !Array.isArray(
        content,
      )
    )
      ? content as JsonObject
      : {};

  const options =
    Array.isArray(
      data.options,
    )
      ? data.options
      : [];

  return options
    .map(
      (
        item,
      ) => {
        if (
          !item ||
          typeof item !==
            "object" ||
          Array.isArray(
            item,
          )
        ) {
          return "";
        }

        return String(
          (
            item as JsonObject
          ).id ??
          "",
        );
      },
    )
    .filter(
      Boolean,
    );
}

export async function buildNovaLearningPayload({
  admin,
  quizId,
  performance,
}: {
  admin: SupabaseClient;
  quizId: string;
  performance: SyntheticPerformanceProfile;
}) {
  const candidates = [
    {
      subject:
        "english" as const,

      quizzes:
        "english_quizzes",

      links:
        "english_quiz_questions",

      questions:
        "english_questions",
    },
    {
      subject:
        "math" as const,

      quizzes:
        "math_quizzes",

      links:
        "math_quiz_questions",

      questions:
        "math_questions",
    },
  ];

  for (
    const candidate
    of candidates
  ) {
    const quizResult =
      await admin
        .from(
          candidate.quizzes,
        )
        .select(
          "id",
        )
        .eq(
          "id",
          quizId,
        )
        .eq(
          "is_published",
          true,
        )
        .maybeSingle();

    if (
      quizResult.error
    ) {
      throw new Error(
        quizResult.error.message,
      );
    }

    if (
      !quizResult.data
    ) {
      continue;
    }

    const linksResult =
      await admin
        .from(
          candidate.links,
        )
        .select(
          "question_id,question_order",
        )
        .eq(
          "quiz_id",
          quizId,
        )
        .order(
          "question_order",
          {
            ascending:
              true,
          },
        );

    if (
      linksResult.error
    ) {
      throw new Error(
        linksResult.error.message,
      );
    }

    const links =
      linksResult.data ||
      [];

    if (
      links.length <
      1
    ) {
      throw new Error(
        "The selected quiz has no linked questions.",
      );
    }

    const ids =
      links.map(
        (
          row,
        ) =>
          String(
            row.question_id,
          ),
      );

    const questionsResult =
      await admin
        .from(
          candidate.questions,
        )
        .select(
          "id,question_type,content,answer_data,requires_manual_marking,status",
        )
        .in(
          "id",
          ids,
        );

    if (
      questionsResult.error
    ) {
      throw new Error(
        questionsResult.error.message,
      );
    }

    const byId =
      new Map(
        (
          questionsResult.data ||
          []
        ).map(
          (
            row,
          ) => [
            String(
              row.id,
            ),
            row,
          ],
        ),
      );

    const answers:
      Array<
        Record<
          string,
          unknown
        >
      > = [];

    let durationSeconds =
      0;

    for (
      const link
      of links
    ) {
      const question =
        byId.get(
          String(
            link.question_id,
          ),
        );

      if (!question) {
        throw new Error(
          `Published question ${String(
            link.question_id,
          )} was not found.`,
        );
      }

      if (
        !isNovaLearningMachineSimpleQuestion(
          question,
        )
      ) {
        throw new Error(
          `Selected Core quiz is no longer machine-simple. Question ${String(
            question.id,
          )} uses type ${String(
            question.question_type ||
            "<missing>",
          )}.`,
        );
      }

      const correct =
        getCorrectOptionId(
          question.answer_data,
        );

      const options =
        getOptionIds(
          question.content,
        );

      if (
        !correct ||
        options.length <
          2 ||
        !options.includes(
          correct,
        )
      ) {
        throw new Error(
          `Question ${String(
            question.id,
          )} does not have a usable single-option answer key.`,
        );
      }

      const correctThisTime =
        shouldCorrect(
          `${performance.seed}:${String(
            question.id,
          )}:correct`,
          performance.accuracy,
        );

      const wrongPool =
        options.filter(
          (
            option,
          ) =>
            option !==
            correct,
        );

      const selected =
        correctThisTime
          ? correct
          : wrongPool[
              Math.floor(
                roll(
                  `${performance.seed}:${String(
                    question.id,
                  )}:wrong`,
                ) *
                wrongPool.length,
              ) %
              wrongPool.length
            ];

      const seconds =
        5 +
        Math.floor(
          roll(
            `${performance.seed}:${String(
              question.id,
            )}:time`,
          ) *
          26,
        );

      durationSeconds +=
        seconds;

      answers.push({
        question_id:
          String(
            question.id,
          ),

        response_data: {
          option_id:
            selected,
        },

        time_spent_seconds:
          seconds,
      });
    }

    return {
      subject:
        candidate.subject,

      quizId,

      answers,

      durationSeconds,

      questionCount:
        answers.length,
    };
  }

  throw new Error(
    "The selected Nova Learning quiz is not a published English or Mathematics quiz.",
  );
}

export async function buildKnowledgeArenaPayload({
  admin,
  topic,
  performance,
}: {
  admin: SupabaseClient;
  topic: string;
  performance: SyntheticPerformanceProfile;
}) {
  const result =
    await admin
      .from(
        "knowledge_arena_questions",
      )
      .select(
        "id,correct_answer",
      )
      .eq(
        "topic",
        topic,
      )
      .eq(
        "is_active",
        true,
      );

  if (
    result.error
  ) {
    throw new Error(
      result.error.message,
    );
  }

  const rows =
    [
      ...(
        result.data ||
        []
      ),
    ]
      .sort(
        (
          a,
          b,
        ) =>
          roll(
            `${performance.seed}:${String(
              a.id,
            )}:order`,
          ) -
          roll(
            `${performance.seed}:${String(
              b.id,
            )}:order`,
          ),
      )
      .slice(
        0,
        10,
      );

  if (
    rows.length !==
    10
  ) {
    throw new Error(
      `Knowledge Arena topic ${topic} does not have 10 active questions.`,
    );
  }

  return {
    topic,

    answers:
      rows.map(
        (
          row,
        ) => {
          const correct =
            String(
              row.correct_answer ||
              "",
            ).toUpperCase();

          if (
            ![
              "A",
              "B",
              "C",
              "D",
            ].includes(
              correct,
            )
          ) {
            throw new Error(
              `Question ${String(
                row.id,
              )} has an invalid answer key.`,
            );
          }

          const answer =
            shouldCorrect(
              `${performance.seed}:${String(
                row.id,
              )}:correct`,
              performance.accuracy,
            )
              ? correct
              : chooseWrongAbcd(
                  correct,
                  `${performance.seed}:${String(
                    row.id,
                  )}:wrong`,
                );

          const secondsUsed =
            2 +
            Math.floor(
              roll(
                `${performance.seed}:${String(
                  row.id,
                )}:time`,
              ) *
              16,
            );

          return {
            question_id:
              String(
                row.id,
              ),

            answer,

            seconds_used:
              secondsUsed,
          };
        },
      ),
  };
}

export async function buildThinkPayload({
  admin,
  activityId,
  performance,
}: {
  admin: SupabaseClient;
  activityId: string;
  performance: SyntheticPerformanceProfile;
}) {
  const result =
    await admin
      .from(
        "think_mission_questions",
      )
      .select(
        "id,correct_answer,question_order",
      )
      .eq(
        "quiz_id",
        activityId,
      )
      .eq(
        "is_active",
        true,
      )
      .order(
        "question_order",
        {
          ascending:
            true,
        },
      )
      .limit(
        20,
      );

  if (
    result.error
  ) {
    throw new Error(
      result.error.message,
    );
  }

  const rows =
    result.data ||
    [];

  if (
    rows.length !==
    20
  ) {
    throw new Error(
      `Think Mission ${activityId} does not have exactly 20 usable active questions.`,
    );
  }

  let durationSeconds =
    0;

  const answers =
    rows.map(
      (
        row,
      ) => {
        const correct =
          String(
            row.correct_answer ||
            "",
          ).toUpperCase();

        if (
          ![
            "A",
            "B",
            "C",
            "D",
          ].includes(
            correct,
          )
        ) {
          throw new Error(
            `Think question ${String(
              row.id,
            )} has an invalid answer key.`,
          );
        }

        const answer =
          shouldCorrect(
            `${performance.seed}:${String(
              row.id,
            )}:correct`,
            performance.accuracy,
          )
            ? correct
            : chooseWrongAbcd(
                correct,
                `${performance.seed}:${String(
                  row.id,
                )}:wrong`,
              );

        durationSeconds +=
          7 +
          Math.floor(
            roll(
              `${performance.seed}:${String(
                row.id,
              )}:time`,
            ) *
            24,
          );

        return {
          question_id:
            String(
              row.id,
            ),

          answer,
        };
      },
    );

  return {
    activityId,
    answers,
    durationSeconds,
  };
}

export async function buildMiloCategoriesPayload({
  admin,
  category,
  performance,
}: {
  admin: SupabaseClient;
  category: string;
  performance: SyntheticPerformanceProfile;
}) {
  const result =
    await admin
      .from(
        "milo_category_questions",
      )
      .select(
        "id,correct_option",
      )
      .eq(
        "category",
        category,
      )
      .eq(
        "is_active",
        true,
      );

  if (
    result.error
  ) {
    throw new Error(
      result.error.message,
    );
  }

  const rows =
    [
      ...(
        result.data ||
        []
      ),
    ]
      .sort(
        (
          a,
          b,
        ) =>
          roll(
            `${performance.seed}:${String(
              a.id,
            )}:order`,
          ) -
          roll(
            `${performance.seed}:${String(
              b.id,
            )}:order`,
          ),
      )
      .slice(
        0,
        10,
      );

  if (
    rows.length !==
    10
  ) {
    throw new Error(
      `Milo category ${category} does not have 10 active questions.`,
    );
  }

  let durationSeconds =
    0;

  const answers =
    rows.map(
      (
        row,
        index,
      ) => {
        const correct =
          String(
            row.correct_option ||
            "",
          ).toUpperCase();

        if (
          ![
            "A",
            "B",
            "C",
            "D",
          ].includes(
            correct,
          )
        ) {
          throw new Error(
            `Milo question ${String(
              row.id,
            )} has an invalid answer key.`,
          );
        }

        const selected =
          shouldCorrect(
            `${performance.seed}:${String(
              row.id,
            )}:correct`,
            performance.accuracy,
          )
            ? correct
            : chooseWrongAbcd(
                correct,
                `${performance.seed}:${String(
                  row.id,
                )}:wrong`,
              );

        const responseSeconds =
          2 +
          Math.floor(
            roll(
              `${performance.seed}:${String(
                row.id,
              )}:time`,
            ) *
            16,
          );

        durationSeconds +=
          responseSeconds;

        return {
          question_id:
            String(
              row.id,
            ),

          question_order:
            index + 1,

          selected_option:
            selected,

          response_seconds:
            responseSeconds,
        };
      },
    );

  return {
    category,

    startedAt:
      new Date(
        Date.now() -
        durationSeconds *
        1000,
      ).toISOString(),

    durationSeconds,

    answers,
  };
}

export function buildRoverPayload({
  performance,
}: {
  performance: SyntheticPerformanceProfile;
}) {
  const a =
    performance.accuracy;

  const score =
    Math.max(
      100,
      Math.min(
        10000,
        Math.round(
          1500 +
          a *
          6000 +
          roll(
            `${performance.seed}:score`,
          ) *
          1200,
        ),
      ),
    );

  const completionTimeMs =
    Math.max(
      45000,
      Math.round(
        170000 -
        a *
        70000 +
        roll(
          `${performance.seed}:time`,
        ) *
        20000,
      ),
    );

  const orbsCollected =
    Math.max(
      1,
      Math.min(
        8,
        Math.round(
          2 +
          a *
          6,
        ),
      ),
    );

  const checkpointsReached =
    Math.max(
      1,
      Math.min(
        8,
        Math.round(
          2 +
          a *
          6,
        ),
      ),
    );

  const crashPenalty =
    Math.max(
      0,
      Math.round(
        (
          1 -
          a
        ) *
        4,
      ),
    );

  return {
    courseId:
      "skyforge-test-track-01",

    score,

    completionTimeMs,

    orbsCollected,

    checkpointsReached,

    crashPenalty,
  };
}
