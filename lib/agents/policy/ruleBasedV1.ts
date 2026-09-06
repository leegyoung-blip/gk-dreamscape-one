import "server-only";

import {
  createHash,
} from "crypto";

import type {
  PolicyActionKey,
  PolicyCandidate,
  RuleBasedPolicyDecision,
  RuleBasedPolicyInput,
} from "@/lib/agents/policy/types";

type JsonObject =
  Record<
    string,
    unknown
  >;

const INITIAL_ACTION_KEYS:
  PolicyActionKey[] =
  [
    "system.wait",
    "nova.learning.attempt_quiz",
    "nova.knowledge_arena.attempt_quiz",
    "nova.think.attempt_activity",
    "nova.rover.run_challenge",
    "milo.categories.attempt_quiz",
    "economy.synthetic_spend",
  ];

function asObject(
  value:
    unknown,
): JsonObject {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as JsonObject;
  }

  return {};
}

function asArray(
  value:
    unknown,
): unknown[] {
  return Array.isArray(
    value,
  )
    ? value
    : [];
}

function stringValue(
  value:
    unknown,
) {
  return String(
    value ??
    "",
  ).trim();
}

function numberValue(
  value:
    unknown,

  fallback =
    0,
) {
  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : fallback;
}

function clamp(
  value:
    number,

  minimum =
    0,

  maximum =
    1,
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function stableRandom(
  seed:
    string,
) {
  const digest =
    createHash(
      "sha256",
    )
      .update(
        seed,
      )
      .digest();

  const value =
    digest.readUInt32BE(
      0,
    );

  return value /
    0xffffffff;
}

function sectionMap(
  sections:
    RuleBasedPolicyInput["sections"],
) {
  return new Map(
    sections.map(
      (
        section,
      ) => [
        section.source_key,

        asObject(
          section.payload,
        ),
      ],
    ),
  );
}

function worldData(
  sections:
    Map<
      string,
      JsonObject
    >,

  sourceKey:
    string,
) {
  const payload =
    sections.get(
      sourceKey,
    ) ||
    {};

  return asObject(
    payload.data,
  );
}

function archetypeDefaults(
  archetype:
    string,
) {
  const base = {
    exploration:
      0.50,

    persistence:
      0.55,

    competitiveness:
      0.45,

    learning:
      0.55,

    novelty:
      0.50,

    caution:
      0.50,

    patience:
      0.50,
  };

  switch (
    archetype
  ) {
    case "competitive":
      return {
        ...base,
        competitiveness:
          0.92,
        persistence:
          0.72,
        patience:
          0.38,
      };

    case "rover_specialist":
      return {
        ...base,
        exploration:
          0.78,
        novelty:
          0.66,
        persistence:
          0.70,
      };

    case "explorer":
      return {
        ...base,
        exploration:
          0.92,
        novelty:
          0.92,
      };

    case "strategist":
      return {
        ...base,
        learning:
          0.76,
        persistence:
          0.76,
        caution:
          0.66,
      };

    case "collector":
      return {
        ...base,
        persistence:
          0.68,
        novelty:
          0.62,
      };

    case "saver":
      return {
        ...base,
        caution:
          0.88,
        patience:
          0.72,
      };

    case "spender":
      return {
        ...base,
        caution:
          0.20,
        novelty:
          0.76,
      };

    case "casual":
      return {
        ...base,
        persistence:
          0.30,
        learning:
          0.38,
        patience:
          0.74,
      };

    default:
      return base;
  }
}

function firstNumericTrait(
  persona:
    JsonObject,

  keys:
    string[],

  fallback:
    number,
) {
  for (
    const key
    of keys
  ) {
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          persona,
          key,
        )
    ) {
      const value =
        numberValue(
          persona[key],
          fallback,
        );

      if (
        value >=
          0 &&
        value <=
          1
      ) {
        return value;
      }
    }
  }

  return fallback;
}

function personaTraits(
  persona:
    JsonObject,
) {
  const archetype =
    stringValue(
      persona.archetype,
    )
      .toLowerCase() ||
    "balanced";

  const defaults =
    archetypeDefaults(
      archetype,
    );

  return {
    archetype,

    exploration:
      firstNumericTrait(
        persona,
        [
          "exploration_tendency",
          "exploration",
          "curiosity",
          "novelty_seeking",
        ],
        defaults.exploration,
      ),

    persistence:
      firstNumericTrait(
        persona,
        [
          "persistence",
          "completion_tendency",
          "grit",
          "patience",
        ],
        defaults.persistence,
      ),

    competitiveness:
      firstNumericTrait(
        persona,
        [
          "competitiveness",
          "competitive_drive",
          "achievement_drive",
        ],
        defaults.competitiveness,
      ),

    learning:
      firstNumericTrait(
        persona,
        [
          "learning_focus",
          "academic_drive",
          "mastery_drive",
        ],
        defaults.learning,
      ),

    novelty:
      firstNumericTrait(
        persona,
        [
          "novelty_preference",
          "novelty_seeking",
          "variety_seeking",
        ],
        defaults.novelty,
      ),

    caution:
      firstNumericTrait(
        persona,
        [
          "risk_aversion",
          "caution",
          "saving_preference",
        ],
        defaults.caution,
      ),

    patience:
      firstNumericTrait(
        persona,
        [
          "patience",
          "planning_tendency",
        ],
        defaults.patience,
      ),
  };
}

function recentAttemptCounts(
  attempts:
    unknown[],

  keyNames:
    string[],
) {
  const result =
    new Map<
      string,
      number
    >();

  for (
    const rawAttempt
    of attempts
  ) {
    const attempt =
      asObject(
        rawAttempt,
      );

    let key =
      "";

    for (
      const keyName
      of keyNames
    ) {
      key =
        stringValue(
          attempt[
            keyName
          ],
        );

      if (
        key
      ) {
        break;
      }
    }

    if (
      !key
    ) {
      continue;
    }

    result.set(
      key,

      (
        result.get(
          key,
        ) ||
        0
      ) + 1,
    );
  }

  return result;
}

function chooseLeastRepeated<
  T extends JsonObject
>(
  items:
    T[],

  getKey:
    (
      item:
        T,
    ) =>
      string,

  repeats:
    Map<
      string,
      number
    >,

  seed:
    string,
) {
  if (
    items.length ===
    0
  ) {
    return null;
  }

  const sorted =
    [
      ...items,
    ].sort(
      (
        left,
        right,
      ) => {
        const leftKey =
          getKey(
            left,
          );

        const rightKey =
          getKey(
            right,
          );

        const leftCount =
          repeats.get(
            leftKey,
          ) ||
          0;

        const rightCount =
          repeats.get(
            rightKey,
          ) ||
          0;

        if (
          leftCount !==
          rightCount
        ) {
          return (
            leftCount -
            rightCount
          );
        }

        const leftTie =
          stableRandom(
            `${seed}:${leftKey}`,
          );

        const rightTie =
          stableRandom(
            `${seed}:${rightKey}`,
          );

        return (
          leftTie -
          rightTie
        );
      },
    );

  return sorted[0] ||
    null;
}

function textCorpus(
  values:
    unknown[],
) {
  return values
    .map(
      (
        value,
      ) =>
        typeof value ===
          "string"
          ? value
          : JSON.stringify(
              value,
            ),
    )
    .join(
      " ",
    )
    .toLowerCase();
}

function keywordScore(
  corpus:
    string,

  words:
    string[],
) {
  if (
    !corpus
  ) {
    return 0;
  }

  let hits =
    0;

  for (
    const word
    of words
  ) {
    if (
      corpus.includes(
        word,
      )
    ) {
      hits +=
        1;
    }
  }

  return clamp(
    hits /
      Math.max(
        1,
        words.length,
      ),
  );
}

function worldAffinityScore(
  affinity:
    string,

  actionKey:
    PolicyActionKey,
) {
  if (
    actionKey ===
    "system.wait"
  ) {
    return 0.35;
  }

  if (
    actionKey ===
    "economy.synthetic_spend"
  ) {
    return 0.68;
  }

  const isNova =
    actionKey.startsWith(
      "nova.",
    );

  const isMilo =
    actionKey.startsWith(
      "milo.",
    );

  if (
    affinity ===
    "both"
  ) {
    return 0.72;
  }

  if (
    affinity ===
      "nova" &&
    isNova
  ) {
    return 1;
  }

  if (
    affinity ===
      "milo" &&
    isMilo
  ) {
    return 1;
  }

  return 0.18;
}

function archetypeActionScore(
  archetype:
    string,

  actionKey:
    PolicyActionKey,
) {
  if (
    actionKey ===
    "economy.synthetic_spend"
  ) {
    switch (
      archetype
    ) {
      case "spender":
        return 1;

      case "collector":
        return 0.88;

      case "explorer":
        return 0.66;

      case "competitive":
        return 0.56;

      case "strategist":
        return 0.46;

      case "casual":
        return 0.40;

      case "saver":
        return 0.16;

      default:
        return 0.52;
    }
  }

  if (
    archetype ===
    "rover_specialist"
  ) {
    return actionKey ===
      "nova.rover.run_challenge"
      ? 1
      : actionKey.startsWith(
            "nova.",
          )
        ? 0.58
        : 0.34;
  }

  if (
    archetype ===
    "competitive"
  ) {
    if (
      actionKey ===
        "nova.knowledge_arena.attempt_quiz" ||
      actionKey ===
        "milo.categories.attempt_quiz"
    ) {
      return 1;
    }

    return actionKey ===
      "system.wait"
      ? 0.18
      : 0.60;
  }

  if (
    archetype ===
    "strategist"
  ) {
    if (
      actionKey ===
        "nova.think.attempt_activity" ||
      actionKey ===
        "milo.categories.attempt_quiz"
    ) {
      return 1;
    }

    return actionKey ===
      "system.wait"
      ? 0.30
      : 0.64;
  }

  if (
    archetype ===
    "explorer"
  ) {
    if (
      actionKey ===
        "nova.knowledge_arena.attempt_quiz" ||
      actionKey ===
        "nova.think.attempt_activity" ||
      actionKey ===
        "milo.categories.attempt_quiz"
    ) {
      return 0.96;
    }

    return actionKey ===
      "system.wait"
      ? 0.20
      : 0.66;
  }

  if (
    archetype ===
    "casual"
  ) {
    return actionKey ===
      "system.wait"
      ? 0.88
      : 0.46;
  }

  if (
    archetype ===
    "collector"
  ) {
    return actionKey ===
      "system.wait"
      ? 0.28
      : 0.66;
  }

  if (
    archetype ===
    "saver"
  ) {
    return actionKey ===
      "system.wait"
      ? 0.64
      : 0.58;
  }

  if (
    archetype ===
    "spender"
  ) {
    return actionKey ===
      "system.wait"
      ? 0.22
      : 0.72;
  }

  return actionKey ===
    "system.wait"
    ? 0.38
    : 0.62;
}

function actionKeywords(
  actionKey:
    PolicyActionKey,
) {
  switch (
    actionKey
  ) {
    case "nova.learning.attempt_quiz":
      return [
        "learn",
        "quiz",
        "english",
        "math",
        "science",
        "mission",
        "mastery",
      ];

    case "nova.knowledge_arena.attempt_quiz":
      return [
        "knowledge",
        "arena",
        "quiz",
        "challenge",
        "compete",
      ];

    case "nova.think.attempt_activity":
      return [
        "think",
        "logic",
        "reason",
        "strategy",
        "problem",
      ];

    case "nova.rover.run_challenge":
      return [
        "rover",
        "race",
        "challenge",
        "course",
        "speed",
      ];

    case "milo.categories.attempt_quiz":
      return [
        "milo",
        "category",
        "world",
        "history",
        "nature",
        "space",
        "quiz",
      ];

    case "economy.synthetic_spend":
      return [
        "spend",
        "shop",
        "purchase",
        "token",
        "gem",
        "reward",
        "economy",
        "collect",
        "upgrade",
      ];

    default:
      return [
        "wait",
        "rest",
      ];
  }
}

function actionTraitFit(
  actionKey:
    PolicyActionKey,

  traits:
    ReturnType<
      typeof personaTraits
    >,
) {
  switch (
    actionKey
  ) {
    case "nova.rover.run_challenge":
      return clamp(
        traits.exploration *
          0.45 +
        traits.competitiveness *
          0.35 +
        traits.persistence *
          0.20,
      );

    case "nova.knowledge_arena.attempt_quiz":
      return clamp(
        traits.competitiveness *
          0.50 +
        traits.learning *
          0.30 +
        traits.exploration *
          0.20,
      );

    case "nova.think.attempt_activity":
      return clamp(
        traits.learning *
          0.42 +
        traits.persistence *
          0.33 +
        traits.patience *
          0.25,
      );

    case "nova.learning.attempt_quiz":
      return clamp(
        traits.learning *
          0.55 +
        traits.persistence *
          0.30 +
        traits.patience *
          0.15,
      );

    case "milo.categories.attempt_quiz":
      return clamp(
        traits.exploration *
          0.38 +
        traits.learning *
          0.34 +
        traits.competitiveness *
          0.28,
      );

    case "economy.synthetic_spend":
      return clamp(
        (
          1 -
          traits.caution
        ) *
          0.55 +
        traits.novelty *
          0.30 +
        traits.exploration *
          0.15,
      );

    case "system.wait":
      return clamp(
        traits.patience *
          0.48 +
        (
          1 -
          traits.persistence
        ) *
          0.30 +
        traits.caution *
          0.22,
      );
  }
}

function actionOpportunityScore(
  actionKey:
    PolicyActionKey,

  repeatCount:
    number,

  availableTargets:
    number,
) {
  if (
    actionKey ===
    "system.wait"
  ) {
    return 0.45;
  }

  if (
    availableTargets <=
    0
  ) {
    return 0;
  }

  const novelty =
    1 /
    (
      1 +
      repeatCount
    );

  const breadth =
    clamp(
      Math.log10(
        availableTargets +
        1,
      ) /
      2,
    );

  return clamp(
    novelty *
      0.72 +
    breadth *
      0.28,
  );
}

function makeUnavailableCandidate(
  actionKey:
    PolicyActionKey,

  contractStatus:
    string,

  reason:
    string,
): PolicyCandidate {
  return {
    actionKey,

    actionVersion:
      1,

    parameters:
      {},

    score:
      -1,

    available:
      false,

    contractStatus,

    reasons: [
      reason,
    ],

    targetLabel:
      null,
  };
}

function scoreCandidate({
  actionKey,
  parameters,
  targetLabel,
  contractStatus,
  affinity,
  traits,
  goalCorpus,
  memoryCorpus,
  repeatCount,
  availableTargets,
  seed,
}: {
  actionKey:
    PolicyActionKey;

  parameters:
    Record<
      string,
      unknown
    >;

  targetLabel:
    string |
    null;

  contractStatus:
    string;

  affinity:
    string;

  traits:
    ReturnType<
      typeof personaTraits
    >;

  goalCorpus:
    string;

  memoryCorpus:
    string;

  repeatCount:
    number;

  availableTargets:
    number;

  seed:
    string;
}): PolicyCandidate {
  const affinityComponent =
    worldAffinityScore(
      affinity,
      actionKey,
    );

  const archetypeComponent =
    archetypeActionScore(
      traits.archetype,
      actionKey,
    );

  const traitComponent =
    actionTraitFit(
      actionKey,
      traits,
    );

  const goalComponent =
    keywordScore(
      goalCorpus,
      actionKeywords(
        actionKey,
      ),
    );

  const memoryComponent =
    keywordScore(
      memoryCorpus,
      actionKeywords(
        actionKey,
      ),
    );

  const opportunityComponent =
    actionOpportunityScore(
      actionKey,
      repeatCount,
      availableTargets,
    );

  const deterministicExploration =
    stableRandom(
      `${seed}:${actionKey}:${targetLabel || ""}`,
    );

  let score =
    affinityComponent *
      0.24 +
    archetypeComponent *
      0.18 +
    traitComponent *
      0.14 +
    goalComponent *
      0.16 +
    opportunityComponent *
      0.15 +
    memoryComponent *
      0.06 +
    deterministicExploration *
      0.07;

  if (
    actionKey ===
      "system.wait" &&
    availableTargets >
      0
  ) {
    score -=
      0.10;
  }

  score =
    clamp(
      score,
      0,
      1,
    );

  const reasons:
    string[] =
    [];

  if (
    affinityComponent >=
    0.9
  ) {
    reasons.push(
      "matches world affinity",
    );
  }

  if (
    archetypeComponent >=
    0.85
  ) {
    reasons.push(
      `fits ${traits.archetype} archetype`,
    );
  }

  if (
    goalComponent >
    0
  ) {
    reasons.push(
      "supports an active goal",
    );
  }

  if (
    repeatCount ===
      0 &&
    actionKey !==
      "system.wait"
  ) {
    reasons.push(
      "offers a new target",
    );
  }

  if (
    memoryComponent >
    0
  ) {
    reasons.push(
      "relates to recalled experience",
    );
  }

  if (
    actionKey ===
    "economy.synthetic_spend"
  ) {
    reasons.push(
      "safe synthetic economy budget is available",
    );
  }

  if (
    reasons.length ===
    0
  ) {
    reasons.push(
      actionKey ===
        "system.wait"
        ? "low-pressure fallback"
        : "available progression opportunity",
    );
  }

  return {
    actionKey,

    actionVersion:
      1,

    parameters,

    score:
      Number(
        score.toFixed(
          6,
        ),
      ),

    available:
      true,

    contractStatus,

    reasons,

    targetLabel,
  };
}

function buildNovaLearningCandidate({
  data,
  agent,
  seed,
}: {
  data:
    JsonObject;

  agent:
    JsonObject;

  contractStatus:
    string;

  seed:
    string;
}) {
  const primaryLevel =
    numberValue(
      agent.primaryLevel ??
      agent.primary_level,

      0,
    );

  const subjectBuckets =
    [
      {
        subject:
          "english",

        payload:
          asObject(
            data.english,
          ),
      },

      {
        subject:
          "math",

        payload:
          asObject(
            data.math,
          ),
      },
    ];

  type LearningTarget = {
    quizId:
      string;

    label:
      string;

    subject:
      string;

    repeatCount:
      number;
  };

  const targets:
    LearningTarget[] =
    [];

  for (
    const bucket
    of subjectBuckets
  ) {
    const quizzes =
      asArray(
        bucket
          .payload
          .publishedQuizzes ??
        bucket
          .payload
          .quizzes,
      ).map(
        asObject,
      );

    const attempts =
      asArray(
        bucket
          .payload
          .recentAttempts,
      );

    const repeats =
      recentAttemptCounts(
        attempts,
        [
          "quiz_id",
          "quizId",
        ],
      );

    let allowedTopicIds:
      Set<string> |
      null =
        null;

    if (
      primaryLevel >
      0
    ) {
      const topics =
        asArray(
          bucket
            .payload
            .activeTopics,
        )
          .map(
            asObject,
          )
          .filter(
            (
              topic,
            ) =>
              numberValue(
                topic.primary_level,
                0,
              ) ===
              primaryLevel,
          );

      allowedTopicIds =
        new Set(
          topics
            .map(
              (
                topic,
              ) =>
                stringValue(
                  topic.id,
                ),
            )
            .filter(
              Boolean,
            ),
        );
    }

    const eligible =
      quizzes.filter(
        (
          quiz,
        ) => {
          const quizId =
            stringValue(
              quiz.id,
            );

          if (
            !quizId
          ) {
            return false;
          }

          if (
            allowedTopicIds &&
            allowedTopicIds.size >
              0
          ) {
            return allowedTopicIds.has(
              stringValue(
                quiz.topic_id,
              ),
            );
          }

          return true;
        },
      );

    const selected =
      chooseLeastRepeated(
        eligible,

        (
          quiz,
        ) =>
          stringValue(
            quiz.id,
          ),

        repeats,

        `${seed}:${bucket.subject}`,
      );

    if (
      selected
    ) {
      const quizId =
        stringValue(
          selected.id,
        );

      targets.push({
        quizId,

        label:
          `${bucket.subject}: ${
            stringValue(
              selected.title,
            ) ||
            quizId
          }`,

        subject:
          bucket.subject,

        repeatCount:
          repeats.get(
            quizId,
          ) ||
          0,
      });
    }
  }

  if (
    targets.length ===
    0
  ) {
    return {
      parameters:
        {},

      targetLabel:
        null,

      repeatCount:
        0,

      availableTargets:
        0,
    };
  }

  const selectedTarget =
    [
      ...targets,
    ].sort(
      (
        left,
        right,
      ) => {
        if (
          left.repeatCount !==
          right.repeatCount
        ) {
          return (
            left.repeatCount -
            right.repeatCount
          );
        }

        return (
          stableRandom(
            `${seed}:${left.subject}`,
          ) -
          stableRandom(
            `${seed}:${right.subject}`,
          )
        );
      },
    )[0];

  return {
    parameters: {
      quizId:
        selectedTarget.quizId,
    },

    targetLabel:
      selectedTarget.label,

    repeatCount:
      selectedTarget.repeatCount,

    availableTargets:
      targets.length,
  };
}

function buildKnowledgeArenaTarget(
  data:
    JsonObject,

  seed:
    string,
) {
  const topics =
    asArray(
      data.activeTopics,
    )
      .map(
        (
          value,
        ) =>
          stringValue(
            value,
          ),
      )
      .filter(
        Boolean,
      );

  const attempts =
    asArray(
      data.recentAttempts,
    );

  const repeats =
    recentAttemptCounts(
      attempts,
      [
        "topic",
      ],
    );

  const selected =
    chooseLeastRepeated(
      topics.map(
        (
          topic,
        ) => ({
          topic,
        }),
      ),

      (
        item,
      ) =>
        item.topic,

      repeats,

      seed,
    );

  return selected
    ? {
        parameters: {
          topic:
            selected.topic,
        },

        targetLabel:
          selected.topic,

        repeatCount:
          repeats.get(
            selected.topic,
          ) ||
          0,

        availableTargets:
          topics.length,
      }
    : {
        parameters:
          {},

        targetLabel:
          null,

        repeatCount:
          0,

        availableTargets:
          0,
      };
}

function buildThinkTarget(
  data:
    JsonObject,

  seed:
    string,
) {
  const quizzes =
    asArray(
      data.activeQuizzes,
    ).map(
      asObject,
    );

  const attempts =
    asArray(
      data.recentAttempts,
    );

  const repeats =
    recentAttemptCounts(
      attempts,
      [
        "quiz_id",
        "quizId",
      ],
    );

  const eligible =
    quizzes.filter(
      (
        quiz,
      ) =>
        Boolean(
          stringValue(
            quiz.id,
          ),
        ) &&
        numberValue(
          quiz.activeQuestionCount,
          0,
        ) >
          0,
    );

  const selected =
    chooseLeastRepeated(
      eligible,

      (
        quiz,
      ) =>
        stringValue(
          quiz.id,
        ),

      repeats,

      seed,
    );

  if (
    !selected
  ) {
    return {
      parameters:
        {},

      targetLabel:
        null,

      repeatCount:
        0,

      availableTargets:
        0,
    };
  }

  const quizId =
    stringValue(
      selected.id,
    );

  return {
    parameters: {
      activityId:
        quizId,
    },

    targetLabel:
      stringValue(
        selected.title,
      ) ||
      quizId,

    repeatCount:
      repeats.get(
        quizId,
      ) ||
      0,

    availableTargets:
      eligible.length,
  };
}

function buildRoverTarget(
  data:
    JsonObject,

  seed:
    string,
) {
  const progress =
    asArray(
      data.progress,
    ).map(
      asObject,
    );

  const completedCourseIds =
    new Set(
      asArray(
        data.completedCourseIds,
      )
        .map(
          (
            value,
          ) =>
            stringValue(
              value,
            ),
        )
        .filter(
          Boolean,
        ),
    );

  const observedCourseIds =
    [
      ...new Set(
        progress
          .map(
            (
              row,
            ) =>
              stringValue(
                row.course_id,
              ),
          )
          .filter(
            Boolean,
          ),
      ),
    ];

  const defaultCourseIds =
    [
      "skyforge-test-track-01",
    ];

  const candidates =
    observedCourseIds.length >
      0
      ? observedCourseIds
      : defaultCourseIds;

  const notCompleted =
    candidates.filter(
      (
        courseId,
      ) =>
        !completedCourseIds.has(
          courseId,
        ),
    );

  const pool =
    notCompleted.length >
      0
      ? notCompleted
      : candidates;

  if (
    pool.length ===
    0
  ) {
    return {
      parameters:
        {},

      targetLabel:
        null,

      repeatCount:
        0,

      availableTargets:
        0,
    };
  }

  const selected =
    [
      ...pool,
    ].sort(
      (
        left,
        right,
      ) =>
        stableRandom(
          `${seed}:${left}`,
        ) -
        stableRandom(
          `${seed}:${right}`,
        ),
    )[0];

  const repeatCount =
    progress.filter(
      (
        row,
      ) =>
        stringValue(
          row.course_id,
        ) ===
        selected,
    ).length;

  return {
    parameters: {
      courseId:
        selected,
    },

    targetLabel:
      selected,

    repeatCount,

    availableTargets:
      pool.length,
  };
}

function buildMiloCategoryTarget(
  data:
    JsonObject,

  seed:
    string,
) {
  const countByCategory =
    asObject(
      data
        .activeQuestionCountByCategory,
    );

  const categories =
    Object.keys(
      countByCategory,
    ).filter(
      (
        category,
      ) =>
        category !==
          "unknown" &&
        numberValue(
          countByCategory[
            category
          ],
          0,
        ) >
          0,
    );

  const attempts =
    asArray(
      data.recentAttempts,
    );

  const repeats =
    recentAttemptCounts(
      attempts,
      [
        "category",
        "category_name",
      ],
    );

  const selected =
    chooseLeastRepeated(
      categories.map(
        (
          category,
        ) => ({
          category,
        }),
      ),

      (
        item,
      ) =>
        item.category,

      repeats,

      seed,
    );

  return selected
    ? {
        parameters: {
          category:
            selected.category,
        },

        targetLabel:
          selected.category,

        repeatCount:
          repeats.get(
            selected.category,
          ) ||
          0,

        availableTargets:
          categories.length,
      }
    : {
        parameters:
          {},

        targetLabel:
          null,

        repeatCount:
          0,

        availableTargets:
          0,
      };
}

function buildSyntheticEconomyTarget(
  wallet:
    JsonObject,
) {
  const budget =
    asObject(
      wallet.spendBudget,
    );

  const canSpend =
    Boolean(
      budget.canSpend,
    );

  const availableDt =
    numberValue(
      budget.availableDt,
      0,
    );

  const availableDg =
    numberValue(
      budget.availableDg,
      0,
    );

  const recentSpendCount =
    numberValue(
      budget.recentSpendCountThisDay,
      0,
    );

  if (
    !canSpend ||
    (
      availableDt <=
        0 &&
      availableDg <=
        0
    )
  ) {
    return {
      parameters:
        {},

      targetLabel:
        null,

      repeatCount:
        recentSpendCount,

      availableTargets:
        0,
    };
  }

  return {
    parameters: {
      currency:
        "AUTO",
    },

    targetLabel:
      "Synthetic economy purchase",

    repeatCount:
      recentSpendCount,

    availableTargets:
      1,
  };
}

export function runRuleBasedPolicyV1(
  input:
    RuleBasedPolicyInput,
): RuleBasedPolicyDecision {
  const sections =
    sectionMap(
      input.sections,
    );

  const agent =
    sections.get(
      "identity.agent",
    ) ||
    {};

  const persona =
    sections.get(
      "identity.persona",
    ) ||
    {};

  const goals =
    sections.get(
      "identity.goals",
    ) ||
    {};

  const wallet =
    sections.get(
      "economy.wallet",
    ) ||
    {};

  const traits =
    personaTraits(
      persona,
    );

  const affinity =
    stringValue(
      agent.worldAffinity ??
      agent.world_affinity,
    )
      .toLowerCase() ||
    "both";

  const goalCorpus =
    textCorpus(
      asArray(
        goals.goals,
      ),
    );

  const memoryCorpus =
    textCorpus(
      input
        .recalledMemories
        .map(
          (
            memory,
          ) =>
            `${memory.summary} ${JSON.stringify(
              memory.content,
            )}`,
        ),
    );

  const seed =
    `${input.agentCode}:${input.snapshotStateHash}:${input.decisionIndex}`;

  const candidates:
    PolicyCandidate[] =
    [];

  const contractStatus = (
    actionKey:
      PolicyActionKey,
  ) =>
    input
      .contractStatusByAction[
        actionKey
      ]?.status ||
    "missing";

  const learningTarget =
    buildNovaLearningCandidate({
      data:
        worldData(
          sections,
          "nova.learning",
        ),

      agent,

      contractStatus:
        contractStatus(
          "nova.learning.attempt_quiz",
        ),

      seed:
        `${seed}:nova-learning`,
    });

  const arenaTarget =
    buildKnowledgeArenaTarget(
      worldData(
        sections,
        "nova.knowledge_arena",
      ),

      `${seed}:arena`,
    );

  const accountRole =
    stringValue(
      agent.accountRole ??
      agent.account_role,
    )
      .toLowerCase();

  const observedThinkTarget =
    buildThinkTarget(
      worldData(
        sections,
        "nova.think",
      ),

      `${seed}:think`,
    );

  const thinkTarget =
    accountRole ===
      "student"
      ? observedThinkTarget
      : {
          parameters:
            {},

          targetLabel:
            null,

          repeatCount:
            0,

          availableTargets:
            0,
        };

  const roverTarget =
    buildRoverTarget(
      worldData(
        sections,
        "nova.rover",
      ),

      `${seed}:rover`,
    );

  const miloTarget =
    buildMiloCategoryTarget(
      worldData(
        sections,
        "milo.categories",
      ),

      `${seed}:milo-categories`,
    );

  const economyTarget =
    buildSyntheticEconomyTarget(
      wallet,
    );

  const targets:
    Record<
      Exclude<
        PolicyActionKey,
        "system.wait"
      >,
      {
        parameters:
          Record<
            string,
            unknown
          >;

        targetLabel:
          string |
          null;

        repeatCount:
          number;

        availableTargets:
          number;
      }
    > =
    {
      "nova.learning.attempt_quiz":
        learningTarget,

      "nova.knowledge_arena.attempt_quiz":
        arenaTarget,

      "nova.think.attempt_activity":
        thinkTarget,

      "nova.rover.run_challenge":
        roverTarget,

      "milo.categories.attempt_quiz":
        miloTarget,

      "economy.synthetic_spend":
        economyTarget,
    };

  let availableActionTargetCount =
    0;

  let availableGameplayTargetCount =
    0;

  for (
    const actionKey
    of INITIAL_ACTION_KEYS
  ) {
    const status =
      contractStatus(
        actionKey,
      );

    if (
      actionKey ===
      "system.wait"
    ) {
      continue;
    }

    const target =
      targets[
        actionKey
      ];

    if (
      target.availableTargets <=
      0
    ) {
      candidates.push(
        makeUnavailableCandidate(
          actionKey,

          status,

          actionKey ===
            "economy.synthetic_spend"
            ? "No safe synthetic economy budget is available for this session day."
            : "No eligible target is visible in the current world snapshot.",
        ),
      );

      continue;
    }

    availableActionTargetCount +=
      1;

    if (
      actionKey !==
      "economy.synthetic_spend"
    ) {
      availableGameplayTargetCount +=
        1;
    }

    candidates.push(
      scoreCandidate({
        actionKey,

        parameters:
          target.parameters,

        targetLabel:
          target.targetLabel,

        contractStatus:
          status,

        affinity,

        traits,

        goalCorpus,

        memoryCorpus,

        repeatCount:
          target.repeatCount,

        availableTargets:
          target.availableTargets,

        seed,
      }),
    );
  }

  candidates.push(
    scoreCandidate({
      actionKey:
        "system.wait",

      parameters: {
        minutes:
          30,

        reason:
          "RuleBasedPolicyV1 selected a no-op.",
      },

      targetLabel:
        "Wait 30 minutes",

      contractStatus:
        contractStatus(
          "system.wait",
        ),

      affinity,

      traits,

      goalCorpus,

      memoryCorpus,

      repeatCount:
        0,

      availableTargets:
        availableActionTargetCount,

      seed,
    }),
  );

  const ranked =
    [
      ...candidates,
    ].sort(
      (
        left,
        right,
      ) => {
        if (
          left.available !==
          right.available
        ) {
          return left.available
            ? -1
            : 1;
        }

        if (
          left.score !==
          right.score
        ) {
          return (
            right.score -
            left.score
          );
        }

        return left.actionKey
          .localeCompare(
            right.actionKey,
          );
      },
    );

  const selected =
    ranked.find(
      (
        candidate,
      ) =>
        candidate.available,
    ) ||
    ranked[
      ranked.length -
      1
    ];

  const topReasons =
    selected.reasons
      .slice(
        0,
        3,
      )
      .join(
        ", ",
      );

  return {
    policyKey:
      "rule_based",

    policyVersion:
      1,

    policyRuntime:
      "RuleBasedPolicyV1",

    agentUserId:
      input.agentUserId,

    agentCode:
      input.agentCode,

    snapshotId:
      input.snapshotId,

    decisionIndex:
      input.decisionIndex,

    selected,

    candidates:
      ranked,

    reasoningSummary:
      `${input.agentCode} selected ${selected.actionKey}${
        selected.targetLabel
          ? ` targeting ${selected.targetLabel}`
          : ""
      } with score ${selected.score.toFixed(
        3,
      )}. Main reasons: ${topReasons}. Candidate scoring is deterministic; runtime execution is controlled separately by active contracts, ready adapters and safety validation.`,

    inputSummary: {
      worldAffinity:
        affinity,

      archetype:
        traits.archetype,

      traits,

      activeGoalCount:
        asArray(
          goals.goals,
        ).length,

      recalledMemoryCount:
        input
          .recalledMemories
          .length,

      visibleRealActionFamilies:
        availableGameplayTargetCount,

      visibleActionFamilies:
        availableActionTargetCount,

      spendingActionsConsidered:
        economyTarget.availableTargets >
        0,

      syntheticEconomyAvailable:
        economyTarget.availableTargets >
        0,

      realInventoryMutationAllowed:
        false,

      answerKeysAvailableToPolicy:
        false,
    },

    recalledMemoryIds:
      input
        .recalledMemories
        .map(
          (
            memory,
          ) =>
            memory.id,
        ),

    executionAllowed:
      false,
  };
}
