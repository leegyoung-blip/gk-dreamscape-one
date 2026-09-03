import "server-only";

import type {
  WorldAdapter,
} from "../types";

import {
  buildPayload,
  collectErrors,
  groupCount,
  rows,
  safeQuery,
} from "../utils";

type TopicRow = {
  id: string;
  primary_level?: number | null;
  title?: string | null;
  review_status?: string | null;
};

type ScienceLevelRow = {
  id: string;
  slug?: string | null;
  display_name?: string | null;
  school_level?: string | null;
};

type ScienceTopicRow = {
  id: string;
  title?: string | null;
  level_id?: string | null;
  status?: string | null;
};

type QuizRow = {
  id: string;
  topic_id?: string | null;
  title?: string | null;
  slug?: string | null;
  mission_type?: string | null;
  status?: string | null;
};

type AttemptRow = {
  id: string;
  quiz_id?: string | null;
  status?: string | null;
  percentage?: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
};

const EMPTY_UUID =
  "00000000-0000-0000-0000-000000000000";

function validPrimaryLevel(
  value: unknown,
) {
  const level =
    Number(
      value,
    );

  return Number.isInteger(
    level,
  ) &&
    level >= 1 &&
    level <= 6
    ? level
    : null;
}

function scienceLevelMatches(
  row: ScienceLevelRow,
  primaryLevel: number | null,
) {
  if (!primaryLevel) {
    return true;
  }

  const text =
    [
      row.school_level,
      row.slug,
      row.display_name,
    ]
      .filter(
        Boolean,
      )
      .join(
        " ",
      )
      .toLowerCase();

  return (
    text.includes(
      `p${primaryLevel}`,
    ) ||
    text.includes(
      `primary ${primaryLevel}`,
    )
  );
}

export const observeNovaLearning:
  WorldAdapter =
async ({
  admin,
  agentUserId,
  observedAt =
    new Date().toISOString(),
}) => {
  /*
   * Phase 3F snapshot optimisation.
   *
   * The old observer loaded large English, Math and Science catalogues for
   * every agent even though the runtime learner only needs content relevant
   * to that agent's current primary level.
   *
   * This keeps the same nova.learning payload structure while reducing the
   * amount of repeated catalogue data stored in each world snapshot.
   */

  const {
    data:
      agentProfile,
    error:
      agentProfileError,
  } =
    await admin
      .from(
        "agent_profiles",
      )
      .select(
        "primary_level",
      )
      .eq(
        "user_id",
        agentUserId,
      )
      .maybeSingle();

  if (
    agentProfileError
  ) {
    throw new Error(
      `Could not determine Nova Learning primary level: ${agentProfileError.message}`,
    );
  }

  const primaryLevel =
    validPrimaryLevel(
      agentProfile
        ?.primary_level,
    );

  /*
   * Load the learner's English/Math topics and recent personal attempt
   * history first.
   *
   * Topic catalogue scope is restricted to the simulated learner's primary
   * level whenever that level is available.
   */
  let englishTopicsQuery =
    admin
      .from(
        "english_topics",
      )
      .select(
        "id,primary_level,title,review_status",
      )
      .eq(
        "is_active",
        true,
      );

  let mathTopicsQuery =
    admin
      .from(
        "math_topics",
      )
      .select(
        "id,primary_level,title,review_status",
      )
      .eq(
        "is_active",
        true,
      );

  if (
    primaryLevel
  ) {
    englishTopicsQuery =
      englishTopicsQuery.eq(
        "primary_level",
        primaryLevel,
      );

    mathTopicsQuery =
      mathTopicsQuery.eq(
        "primary_level",
        primaryLevel,
      );
  }

  const [
    englishTopicsResult,
    englishAttemptsResult,
    mathTopicsResult,
    mathAttemptsResult,
    scienceLevelsResult,
    scienceAttemptsResult,
  ] =
    await Promise.all([
      safeQuery<
        TopicRow[]
      >(
        "english_topics",
        englishTopicsQuery
          .order(
            "primary_level",
            {
              ascending:
                true,
            },
          ),
      ),

      safeQuery<
        AttemptRow[]
      >(
        "english_quiz_attempts",
        admin
          .from(
            "english_quiz_attempts",
          )
          .select(
            "id,quiz_id,status,percentage,submitted_at,created_at",
          )
          .eq(
            "user_id",
            agentUserId,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            50,
          ),
      ),

      safeQuery<
        TopicRow[]
      >(
        "math_topics",
        mathTopicsQuery
          .order(
            "primary_level",
            {
              ascending:
                true,
            },
          ),
      ),

      safeQuery<
        AttemptRow[]
      >(
        "math_quiz_attempts",
        admin
          .from(
            "math_quiz_attempts",
          )
          .select(
            "id,quiz_id,status,percentage,submitted_at,created_at",
          )
          .eq(
            "user_id",
            agentUserId,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            50,
          ),
      ),

      safeQuery<
        ScienceLevelRow[]
      >(
        "science_levels",
        admin
          .from(
            "science_levels",
          )
          .select(
            "id,slug,display_name,school_level",
          )
          .eq(
            "is_active",
            true,
          ),
      ),

      safeQuery<
        AttemptRow[]
      >(
        "science_quiz_attempts",
        admin
          .from(
            "science_quiz_attempts",
          )
          .select(
            "id,quiz_id,status,percentage,submitted_at,created_at",
          )
          .eq(
            "user_id",
            agentUserId,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            50,
          ),
      ),
    ]);

  const englishTopics =
    rows(
      englishTopicsResult.data,
    );

  const mathTopics =
    rows(
      mathTopicsResult.data,
    );

  const englishAttempts =
    rows(
      englishAttemptsResult.data,
    );

  const mathAttempts =
    rows(
      mathAttemptsResult.data,
    );

  const scienceAttempts =
    rows(
      scienceAttemptsResult.data,
    );

  /*
   * Preserve the existing learner-visibility rule:
   * quizzes beneath locked English/Math topics must not be presented as
   * learner-visible opportunities.
   */
  const learnerEnglishTopicIds =
    new Set(
      englishTopics
        .filter(
          (
            row,
          ) =>
            String(
              row.review_status ??
              "reviewing",
            )
              .toLowerCase() !==
            "locked",
        )
        .map(
          (
            row,
          ) =>
            String(
              row.id,
            ),
        ),
    );

  const learnerMathTopicIds =
    new Set(
      mathTopics
        .filter(
          (
            row,
          ) =>
            String(
              row.review_status ??
              "reviewing",
            )
              .toLowerCase() !==
            "locked",
        )
        .map(
          (
            row,
          ) =>
            String(
              row.id,
            ),
        ),
    );

  const englishTopicIds =
    Array.from(
      learnerEnglishTopicIds,
    );

  const mathTopicIds =
    Array.from(
      learnerMathTopicIds,
    );

  /*
   * Science levels do not use the exact same primary_level column, so match
   * the agent's level against their stored level labels/slugs.
   *
   * If an agent has no usable primary level, preserve the previous behaviour
   * and observe all active science levels.
   */
  const scienceLevels =
    rows(
      scienceLevelsResult.data,
    )
      .filter(
        (
          row,
        ) =>
          scienceLevelMatches(
            row,
            primaryLevel,
          ),
      );

  const scienceLevelIds =
    scienceLevels
      .map(
        (
          row,
        ) =>
          String(
            row.id,
          ),
      )
      .filter(
        Boolean,
      );

  /*
   * Resolve science topics only for the selected learner level.
   */
  let scienceTopicsQuery =
    admin
      .from(
        "science_topics",
      )
      .select(
        "id,title,level_id,status",
      );

  if (
    scienceLevelIds.length >
    0
  ) {
    scienceTopicsQuery =
      scienceTopicsQuery.in(
        "level_id",
        scienceLevelIds,
      );
  } else {
    /*
     * Force a valid empty UUID comparison instead of issuing an unscoped
     * science-topic catalogue read.
     */
    scienceTopicsQuery =
      scienceTopicsQuery.eq(
        "id",
        EMPTY_UUID,
      );
  }

  const scienceTopicsResult =
    await safeQuery<
      ScienceTopicRow[]
    >(
      "science_topics",
      scienceTopicsQuery,
    );

  const scienceTopics =
    rows(
      scienceTopicsResult.data,
    );

  const scienceTopicIds =
    scienceTopics
      .map(
        (
          row,
        ) =>
          String(
            row.id,
          ),
      )
      .filter(
        Boolean,
      );

  /*
   * Load only quiz headers required by the runtime policy instead of
   * persisting the entire cross-level catalogue into every agent snapshot.
   */
  let englishQuizzesQuery =
    admin
      .from(
        "english_quizzes",
      )
      .select(
        "id,topic_id,title",
      )
      .eq(
        "is_published",
        true,
      )
      .eq(
        "student_visibility",
        "satisfied",
      );

  if (
    englishTopicIds.length >
    0
  ) {
    englishQuizzesQuery =
      englishQuizzesQuery.in(
        "topic_id",
        englishTopicIds,
      );
  } else {
    englishQuizzesQuery =
      englishQuizzesQuery.eq(
        "topic_id",
        EMPTY_UUID,
      );
  }

  let mathQuizzesQuery =
    admin
      .from(
        "math_quizzes",
      )
      .select(
        "id,topic_id,title",
      )
      .eq(
        "is_published",
        true,
      )
      .eq(
        "student_visibility",
        "satisfied",
      );

  if (
    mathTopicIds.length >
    0
  ) {
    mathQuizzesQuery =
      mathQuizzesQuery.in(
        "topic_id",
        mathTopicIds,
      );
  } else {
    mathQuizzesQuery =
      mathQuizzesQuery.eq(
        "topic_id",
        EMPTY_UUID,
      );
  }

  let scienceQuizzesQuery =
    admin
      .from(
        "science_quizzes",
      )
      .select(
        "id,topic_id,title,slug,mission_type,status",
      );

  if (
    scienceTopicIds.length >
    0
  ) {
    scienceQuizzesQuery =
      scienceQuizzesQuery.in(
        "topic_id",
        scienceTopicIds,
      );
  } else {
    scienceQuizzesQuery =
      scienceQuizzesQuery.eq(
        "topic_id",
        EMPTY_UUID,
      );
  }

  const [
    englishQuizzesResult,
    mathQuizzesResult,
    scienceQuizzesResult,
  ] =
    await Promise.all([
      safeQuery<
        QuizRow[]
      >(
        "english_quizzes",
        englishQuizzesQuery
          .limit(
            1000,
          ),
      ),

      safeQuery<
        QuizRow[]
      >(
        "math_quizzes",
        mathQuizzesQuery
          .limit(
            1000,
          ),
      ),

      safeQuery<
        QuizRow[]
      >(
        "science_quizzes",
        scienceQuizzesQuery
          .limit(
            1000,
          ),
      ),
    ]);

  const englishQuizzes =
    rows(
      englishQuizzesResult.data,
    );

  const mathQuizzes =
    rows(
      mathQuizzesResult.data,
    );

  const scienceQuizzes =
    rows(
      scienceQuizzesResult.data,
    );

  const errors =
    collectErrors(
      englishTopicsResult,
      englishQuizzesResult,
      englishAttemptsResult,
      mathTopicsResult,
      mathQuizzesResult,
      mathAttemptsResult,
      scienceLevelsResult,
      scienceTopicsResult,
      scienceQuizzesResult,
      scienceAttemptsResult,
    );

  return buildPayload({
    sourceKey:
      "nova.learning",

    observedAt,

    requiredOk:
      englishTopicsResult.ok &&
      englishQuizzesResult.ok &&
      mathTopicsResult.ok &&
      mathQuizzesResult.ok &&
      scienceLevelsResult.ok &&
      scienceTopicsResult.ok &&
      scienceQuizzesResult.ok,

    errors,

    data: {
      safety: {
        readOnly:
          true,

        includesAnswerKeys:
          false,

        includesQuestionPrompts:
          false,

        /*
         * Useful when inspecting snapshot evidence later.
         */
        catalogueScope:
          primaryLevel
            ? "agent_primary_level"
            : "all_levels_fallback",
      },

      primaryLevel,

      english: {
        activeTopics:
          englishTopics,

        publishedQuizzes:
          englishQuizzes,

        recentAttempts:
          englishAttempts,

        topicCountByPrimaryLevel:
          groupCount(
            englishTopics.map(
              (
                row,
              ) =>
                row.primary_level ==
                null
                  ? "unknown"
                  : `P${row.primary_level}`,
            ),
          ),
      },

      math: {
        activeTopics:
          mathTopics,

        publishedQuizzes:
          mathQuizzes,

        recentAttempts:
          mathAttempts,

        topicCountByPrimaryLevel:
          groupCount(
            mathTopics.map(
              (
                row,
              ) =>
                row.primary_level ==
                null
                  ? "unknown"
                  : `P${row.primary_level}`,
            ),
          ),
      },

      science: {
        activeLevels:
          scienceLevels,

        topics:
          scienceTopics,

        quizzes:
          scienceQuizzes,

        recentAttempts:
          scienceAttempts,

        levelCountBySchoolLevel:
          groupCount(
            scienceLevels.map(
              (
                row,
              ) =>
                row.school_level,
            ),
          ),
      },
    },
  });
};
