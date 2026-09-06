import "server-only";

import {
  createHash,
} from "crypto";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  AGENT_WORLD_SNAPSHOT_VERSION,
  ALL_OBSERVATION_SOURCE_KEYS,
  FOUNDATION_OBSERVATION_SOURCE_KEYS,
  type AgentObservationSection,
  type AgentObservationSourceKey,
  type AgentWorldObservationSummary,
  type CapturedAgentWorldSnapshot,
} from "@/lib/agents/observation/types";

import {
  WORLD_OBSERVATION_SOURCE_KEYS,
} from "@/lib/agents/world/types";


type CaptureAgentObservationArgs = {
  admin: SupabaseClient;

  agentUserId: string;

  initiatedBy: string;

  triggerType?:
    | "admin"
    | "policy"
    | "scheduler"
    | "system"
    | "test";

  /*
   * When observation is created from a runtime session, pass that session's
   * simulation day.
   *
   * This is important because a session may cross a simulated-day boundary.
   * Economy eligibility must use the SESSION day, not the wall-clock day.
   */
  simulationDayIndex?: number;
};


type SourceVersionRow = {
  id: string;
  source_key: string;
  version: number;
  status: string;
};


type SyntheticCompletionRow = {
  action_key: string;
  simulation_day_index: number;
  dt_awarded: number;
  dg_awarded: number;
  completed_at: string;
};


type SyntheticEconomySpendRow = {
  simulation_day_index: number;
  currency_code: string;
  amount_spent: number;
  balance_before: number;
  balance_after: number;
  spent_at: string;
};


const RECENT_SYNTHETIC_COMPLETION_LIMIT =
  20;


const RECENT_SYNTHETIC_SPEND_LIMIT =
  10;


function sortForStableJson(
  value: unknown,
): unknown {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      sortForStableJson,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const source =
      value as Record<
        string,
        unknown
      >;

    const result:
      Record<
        string,
        unknown
      > =
      {};

    for (
      const key
      of Object.keys(
        source,
      ).sort()
    ) {
      result[key] =
        sortForStableJson(
          source[key],
        );
    }

    return result;
  }

  return value;
}


function stableStringify(
  value: unknown,
) {
  return JSON.stringify(
    sortForStableJson(
      value,
    ),
  );
}


function sha256(
  value: unknown,
) {
  return createHash(
    "sha256",
  )
    .update(
      stableStringify(
        value,
      ),
      "utf8",
    )
    .digest(
      "hex",
    );
}


function numberValue(
  value: unknown,
) {
  const parsed =
    Number(
      value ??
      0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}


function objectValue(
  value: unknown,
): Record<
  string,
  unknown
> {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}


function makeSection(
  sourceKey:
    AgentObservationSourceKey,

  sourceVersion:
    number,

  payload:
    Record<
      string,
      unknown
    >,
): AgentObservationSection {
  return {
    source_key:
      sourceKey,

    source_version:
      sourceVersion,

    payload,

    payload_hash:
      sha256(
        payload,
      ),
  };
}


function simulationEntitlementFromTier(
  value: unknown,
) {
  const tier =
    String(
      value ||
      "basic",
    )
      .trim()
      .toLowerCase();

  const complete =
    tier ===
    "complete";

  const core =
    complete ||
    tier ===
      "core";

  return {
    simulationAccess:
      true,

    simulationAccessTier:
      tier,

    core,

    science:
      complete,

    businessBuilder:
      complete,

    rewards:
      core,

    anyPaidAccess:
      false,

    syntheticActivityMode:
      true,

    syntheticEconomyMode:
      true,
  };
}


function recentForAction(
  rows:
    SyntheticCompletionRow[],

  actionKey:
    string,
) {
  return rows.filter(
    (
      row,
    ) =>
      row.action_key ===
      actionKey,
  );
}


function cycleSyntheticHistory({
  rows,
  keys,
  field,
}: {
  rows:
    SyntheticCompletionRow[];

  keys:
    string[];

  field:
    string;
}) {
  if (
    keys.length ===
    0
  ) {
    return [];
  }

  return rows.map(
    (
      row,
      index,
    ) => ({
      [field]:
        keys[
          index %
          keys.length
        ],

      synthetic:
        true,

      simulation_day_index:
        row.simulation_day_index,

      completed_at:
        row.completed_at,
    }),
  );
}


/*
 * ===========================================================================
 * SYNTHETIC WORLD DATA
 * ===========================================================================
 *
 * RuleBasedPolicyV1 still expects small pieces of world data in order to
 * construct the five gameplay candidates.
 *
 * No real quiz / game state is queried.
 *
 * Phase 4A economy information is NOT added as another world source.
 * It lives in the existing:
 *
 *   economy.wallet
 *   economy.recent_transactions
 *
 * foundation sections.
 * ===========================================================================
 */

function buildSyntheticWorldData({
  sourceKey,
  recentCompletions,
  primaryLevel,
}: {
  sourceKey:
    string;

  recentCompletions:
    SyntheticCompletionRow[];

  primaryLevel:
    number;
}): Record<
  string,
  unknown
> {
  switch (
    sourceKey
  ) {
    /*
     * -----------------------------------------------------------------------
     * CORE MISSIONS
     * -----------------------------------------------------------------------
     */
    case "nova.learning": {
      const history =
        recentForAction(
          recentCompletions,
          "nova.learning.attempt_quiz",
        );

      const englishQuizId =
        "agent-synthetic-core-english";

      const mathQuizId =
        "agent-synthetic-core-math";

      const englishTopicId =
        "agent-synthetic-topic-english";

      const mathTopicId =
        "agent-synthetic-topic-math";

      const englishAttempts =
        history
          .filter(
            (
              _row,
              index,
            ) =>
              index %
                2 ===
              0,
          )
          .map(
            (
              row,
            ) => ({
              quiz_id:
                englishQuizId,

              synthetic:
                true,

              simulation_day_index:
                row.simulation_day_index,

              completed_at:
                row.completed_at,
            }),
          );

      const mathAttempts =
        history
          .filter(
            (
              _row,
              index,
            ) =>
              index %
                2 ===
              1,
          )
          .map(
            (
              row,
            ) => ({
              quiz_id:
                mathQuizId,

              synthetic:
                true,

              simulation_day_index:
                row.simulation_day_index,

              completed_at:
                row.completed_at,
            }),
          );

      return {
        syntheticMode:
          true,

        executionMode:
          "reward_only",

        realQuizLookup:
          false,

        realAttemptHistory:
          false,

        english: {
          activeTopics: [
            {
              id:
                englishTopicId,

              primary_level:
                primaryLevel,

              title:
                "Synthetic English Mission",
            },
          ],

          publishedQuizzes: [
            {
              id:
                englishQuizId,

              topic_id:
                englishTopicId,

              title:
                "Synthetic English Core Mission",
            },
          ],

          recentAttempts:
            englishAttempts,
        },

        math: {
          activeTopics: [
            {
              id:
                mathTopicId,

              primary_level:
                primaryLevel,

              title:
                "Synthetic Math Mission",
            },
          ],

          publishedQuizzes: [
            {
              id:
                mathQuizId,

              topic_id:
                mathTopicId,

              title:
                "Synthetic Math Core Mission",
            },
          ],

          recentAttempts:
            mathAttempts,
        },
      };
    }


    /*
     * -----------------------------------------------------------------------
     * KNOWLEDGE ARENA
     * -----------------------------------------------------------------------
     */
    case "nova.knowledge_arena": {
      const topics =
        [
          "World Explorer",
          "Earth & Space",
          "Life & Nature",
          "History & Heritage",
        ];

      const history =
        recentForAction(
          recentCompletions,
          "nova.knowledge_arena.attempt_quiz",
        );

      return {
        syntheticMode:
          true,

        executionMode:
          "reward_only",

        activeTopics:
          topics,

        recentAttempts:
          cycleSyntheticHistory({
            rows:
              history,

            keys:
              topics,

            field:
              "topic",
          }),
      };
    }


    /*
     * -----------------------------------------------------------------------
     * THINK LAB
     * -----------------------------------------------------------------------
     */
    case "nova.think": {
      const activities =
        [
          {
            id:
              "agent-synthetic-think-colour-code",

            title:
              "Colour Code",

            activeQuestionCount:
              1,
          },

          {
            id:
              "agent-synthetic-think-sets",

            title:
              "Sets",

            activeQuestionCount:
              1,
          },

          {
            id:
              "agent-synthetic-think-tower-memory",

            title:
              "Tower Memory",

            activeQuestionCount:
              1,
          },
        ];

      const history =
        recentForAction(
          recentCompletions,
          "nova.think.attempt_activity",
        );

      return {
        syntheticMode:
          true,

        executionMode:
          "reward_only",

        activeQuizzes:
          activities,

        recentAttempts:
          cycleSyntheticHistory({
            rows:
              history,

            keys:
              activities.map(
                (
                  activity,
                ) =>
                  activity.id,
              ),

            field:
              "quiz_id",
          }),
      };
    }


    /*
     * -----------------------------------------------------------------------
     * ROVER
     * -----------------------------------------------------------------------
     */
    case "nova.rover": {
      const courseId =
        "skyforge-test-track-01";

      const history =
        recentForAction(
          recentCompletions,
          "nova.rover.run_challenge",
        );

      return {
        syntheticMode:
          true,

        executionMode:
          "reward_only",

        progress:
          history.map(
            (
              row,
            ) => ({
              course_id:
                courseId,

              synthetic:
                true,

              simulation_day_index:
                row.simulation_day_index,

              completed_at:
                row.completed_at,
            }),
          ),

        completedCourseIds:
          [],
      };
    }


    /*
     * -----------------------------------------------------------------------
     * MILO CATEGORIES
     * -----------------------------------------------------------------------
     */
    case "milo.categories": {
      const categories =
        [
          "World Explorer",
          "Earth & Space",
          "Life & Nature",
          "History & Heritage",
        ];

      const history =
        recentForAction(
          recentCompletions,
          "milo.categories.attempt_quiz",
        );

      return {
        syntheticMode:
          true,

        executionMode:
          "reward_only",

        activeQuestionCountByCategory: {
          "World Explorer":
            1,

          "Earth & Space":
            1,

          "Life & Nature":
            1,

          "History & Heritage":
            1,
        },

        recentAttempts:
          cycleSyntheticHistory({
            rows:
              history,

            keys:
              categories,

            field:
              "category",
          }),
      };
    }


    /*
     * -----------------------------------------------------------------------
     * ALL OTHER ACTIVE WORLD SOURCES
     * -----------------------------------------------------------------------
     */
    default:
      return {
        syntheticMode:
          true,

        executionMode:
          "observation_only",

        realWorldQueryPerformed:
          false,
      };
  }
}


async function markRunFailed(
  admin:
    SupabaseClient,

  runId:
    string,

  errorMessage:
    string,
) {
  const {
    error,
  } =
    await admin
      .from(
        "agent_observation_runs",
      )
      .update({
        status:
          "failed",

        error_message:
          errorMessage,

        finished_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        runId,
      );

  if (
    error
  ) {
    console.error(
      "Could not mark observation run as failed:",
      error.message,
    );
  }
}


export async function captureAgentWorldObservation({
  admin,
  agentUserId,
  initiatedBy,
  triggerType =
    "admin",
  simulationDayIndex,
}: CaptureAgentObservationArgs): Promise<CapturedAgentWorldSnapshot> {
  const observedAt =
    new Date()
      .toISOString();


  const requestedSimulationDayIndex =
    Number.isFinite(
      simulationDayIndex,
    )
      ? Math.floor(
          Number(
            simulationDayIndex,
          ),
        )
      : null;


  /*
   * =========================================================================
   * 1. VERIFY REGISTERED SIMULATION AGENT
   * =========================================================================
   */

  const [
    agentResult,
    profileResult,
  ] =
    await Promise.all([
      admin
        .from(
          "agent_profiles",
        )
        .select(
          `
          user_id,
          agent_code,
          internal_handle,
          natural_name,
          account_role,
          lifecycle_status,
          world_affinity,
          synthetic_age,
          education_system,
          education_level,
          primary_level,
          simulation_access_tier,
          public_visibility_override,
          seed_version,
          metadata
        `,
        )
        .eq(
          "user_id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "profiles",
        )
        .select(
          `
          id,
          email,
          username,
          role,
          date_of_birth,
          dream_token_balance,
          dream_gem_balance,
          is_simulation_user
        `,
        )
        .eq(
          "id",
          agentUserId,
        )
        .maybeSingle(),
    ]);


  if (
    agentResult.error
  ) {
    throw new Error(
      `Could not load agent registry state: ${agentResult.error.message}`,
    );
  }


  if (
    profileResult.error
  ) {
    throw new Error(
      `Could not load agent DREAMSCAPE profile: ${profileResult.error.message}`,
    );
  }


  if (
    !agentResult.data ||
    !profileResult.data
  ) {
    throw new Error(
      "Observation target is not a complete DREAMSCAPE agent identity.",
    );
  }


  if (
    profileResult.data
      .is_simulation_user !==
    true
  ) {
    throw new Error(
      "Observation target is not marked as a simulation user.",
    );
  }


  const agent =
    agentResult.data;


  const profile =
    profileResult.data;


  const primaryLevel =
    Math.max(
      1,
      Math.min(
        6,
        numberValue(
          agent.primary_level ||
          1,
        ),
      ),
    );


  /*
   * =========================================================================
   * 2. ACTIVE OBSERVATION CONTRACTS
   * =========================================================================
   */

  const {
    data:
      sourceVersionData,

    error:
      sourceVersionError,
  } =
    await admin
      .from(
        "agent_observation_source_versions",
      )
      .select(
        "id,source_key,version,status",
      )
      .eq(
        "status",
        "active",
      )
      .in(
        "source_key",
        [
          ...ALL_OBSERVATION_SOURCE_KEYS,
        ],
      );


  if (
    sourceVersionError
  ) {
    throw new Error(
      `Could not load observation contracts: ${sourceVersionError.message}`,
    );
  }


  const sourceVersions =
    (
      sourceVersionData ||
      []
    ) as SourceVersionRow[];


  const sourceVersionMap =
    new Map<
      AgentObservationSourceKey,
      number
    >();


  for (
    const source
    of sourceVersions
  ) {
    if (
      ALL_OBSERVATION_SOURCE_KEYS.includes(
        source.source_key as AgentObservationSourceKey,
      )
    ) {
      sourceVersionMap.set(
        source.source_key as AgentObservationSourceKey,

        Number(
          source.version,
        ),
      );
    }
  }


  for (
    const sourceKey
    of FOUNDATION_OBSERVATION_SOURCE_KEYS
  ) {
    if (
      !sourceVersionMap.has(
        sourceKey,
      )
    ) {
      throw new Error(
        `Foundation observation contract ${sourceKey} is not active.`,
      );
    }
  }


  const activeWorldSourceKeys =
    WORLD_OBSERVATION_SOURCE_KEYS.filter(
      (
        sourceKey,
      ) =>
        sourceVersionMap.has(
          sourceKey as AgentObservationSourceKey,
        ),
    );


  const requestedSourceKeys:
    AgentObservationSourceKey[] =
    [
      ...FOUNDATION_OBSERVATION_SOURCE_KEYS,

      ...activeWorldSourceKeys.map(
        (
          sourceKey,
        ) =>
          sourceKey as AgentObservationSourceKey,
      ),
    ];


  /*
   * =========================================================================
   * 3. START AUDIT RUN
   * =========================================================================
   */

  const {
    data:
      runData,

    error:
      runError,
  } =
    await admin
      .from(
        "agent_observation_runs",
      )
      .insert({
        agent_user_id:
          agentUserId,

        trigger_type:
          triggerType,

        status:
          "started",

        requested_source_keys:
          requestedSourceKeys,

        initiated_by:
          initiatedBy,

        metadata: {
          observer_version:
            "SyntheticObserverV3.1-Phase4A",

          snapshot_version:
            AGENT_WORLD_SNAPSHOT_VERSION,

          synthetic_activity_mode:
            true,

          synthetic_economy_mode:
            true,

          foundation_source_count:
            FOUNDATION_OBSERVATION_SOURCE_KEYS.length,

          active_world_source_count:
            activeWorldSourceKeys.length,

          real_world_adapter_calls:
            0,

          real_quiz_catalog_queries:
            0,

          real_game_state_queries:
            0,

          full_dt_ledger_scan:
            false,

          full_dg_ledger_scan:
            false,

          recent_synthetic_completion_limit:
            RECENT_SYNTHETIC_COMPLETION_LIMIT,

          recent_synthetic_spend_limit:
            RECENT_SYNTHETIC_SPEND_LIMIT,

          session_simulation_day_index:
            requestedSimulationDayIndex,
        },
      })
      .select(
        "id",
      )
      .single();


  if (
    runError ||
    !runData
  ) {
    throw new Error(
      `Could not start observation run: ${
        runError?.message ||
        "No run was returned."
      }`,
    );
  }


  const runId =
    String(
      runData.id,
    );


  try {
    /*
     * =======================================================================
     * 4. LIGHTWEIGHT FOUNDATION STATE
     * =======================================================================
     */

    const [
      personaResult,
      goalsResult,
      settingsResult,
      recentSyntheticResult,
      recentEconomySpendResult,
    ] =
      await Promise.all([
        admin
          .from(
            "agent_personas",
          )
          .select(
            "*",
          )
          .eq(
            "agent_user_id",
            agentUserId,
          )
          .maybeSingle(),

        admin
          .from(
            "agent_goals",
          )
          .select(
            "*",
          )
          .eq(
            "agent_user_id",
            agentUserId,
          )
          .eq(
            "status",
            "active",
          )
          .order(
            "priority",
            {
              ascending:
                false,
            },
          )
          .limit(
            10,
          ),

        admin
          .from(
            "agent_system_settings",
          )
          .select(
            `
            agents_enabled,
            public_visibility_enabled,
            leaderboard_visibility_enabled,
            exchange_visibility_enabled,
            default_simulation_access_tier,
            updated_at
          `,
          )
          .eq(
            "singleton_key",
            "global",
          )
          .maybeSingle(),

        admin
          .from(
            "agent_synthetic_activity_completions",
          )
          .select(
            `
            action_key,
            simulation_day_index,
            dt_awarded,
            dg_awarded,
            completed_at
          `,
          )
          .eq(
            "agent_user_id",
            agentUserId,
          )
          .order(
            "completed_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            RECENT_SYNTHETIC_COMPLETION_LIMIT,
          ),

        admin
          .from(
            "agent_synthetic_economy_spends",
          )
          .select(
            `
            simulation_day_index,
            currency_code,
            amount_spent,
            balance_before,
            balance_after,
            spent_at
          `,
          )
          .eq(
            "agent_user_id",
            agentUserId,
          )
          .order(
            "spent_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            RECENT_SYNTHETIC_SPEND_LIMIT,
          ),
      ]);


    /*
     * Budget query is intentionally tied to the linked runtime session day.
     *
     * For admin/manual observations that do not have a session day, no budget
     * is loaded and economy spending simply appears unavailable.
     */
    const budgetResult =
      requestedSimulationDayIndex !==
      null
        ? await admin
            .from(
              "agent_daily_budgets",
            )
            .select(
              `
              id,
              simulation_day_index,
              max_dt_spend,
              max_dg_spend,
              minimum_dt_reserve,
              minimum_dg_reserve,
              dt_spent,
              dg_spent,
              updated_at
            `,
            )
            .eq(
              "agent_user_id",
              agentUserId,
            )
            .eq(
              "simulation_day_index",
              requestedSimulationDayIndex,
            )
            .maybeSingle()
        : {
            data:
              null,

            error:
              null,
          };


    if (
      personaResult.error
    ) {
      throw new Error(
        `Persona observation failed: ${personaResult.error.message}`,
      );
    }


    if (
      goalsResult.error
    ) {
      throw new Error(
        `Goal observation failed: ${goalsResult.error.message}`,
      );
    }


    if (
      settingsResult.error ||
      !settingsResult.data
    ) {
      throw new Error(
        `Agent-system observation failed: ${
          settingsResult.error?.message ||
          "Global settings row is missing."
        }`,
      );
    }


    if (
      recentSyntheticResult.error
    ) {
      throw new Error(
        `Synthetic activity observation failed: ${recentSyntheticResult.error.message}`,
      );
    }


    if (
      recentEconomySpendResult.error
    ) {
      throw new Error(
        `Synthetic economy observation failed: ${recentEconomySpendResult.error.message}`,
      );
    }


    if (
      budgetResult.error
    ) {
      throw new Error(
        `Synthetic economy budget observation failed: ${budgetResult.error.message}`,
      );
    }


    const recentCompletions =
      (
        recentSyntheticResult.data ||
        []
      ) as SyntheticCompletionRow[];


    const recentEconomySpends =
      (
        recentEconomySpendResult.data ||
        []
      ) as SyntheticEconomySpendRow[];


    const budget =
      budgetResult.data;


    const cachedDt =
      numberValue(
        profile.dream_token_balance,
      );


    const cachedDg =
      numberValue(
        profile.dream_gem_balance,
      );


    const recentDtAwarded =
      recentCompletions.reduce(
        (
          total,
          row,
        ) =>
          total +
          numberValue(
            row.dt_awarded,
          ),
        0,
      );


    const recentDgAwarded =
      recentCompletions.reduce(
        (
          total,
          row,
        ) =>
          total +
          numberValue(
            row.dg_awarded,
          ),
        0,
      );


    const budgetMaxDt =
      numberValue(
        budget?.max_dt_spend,
      );


    const budgetMaxDg =
      numberValue(
        budget?.max_dg_spend,
      );


    const budgetDtSpent =
      numberValue(
        budget?.dt_spent,
      );


    const budgetDgSpent =
      numberValue(
        budget?.dg_spent,
      );


    const minimumDtReserve =
      numberValue(
        budget?.minimum_dt_reserve,
      );


    const minimumDgReserve =
      numberValue(
        budget?.minimum_dg_reserve,
      );


    const availableDtToSpend =
      budget
        ? Math.max(
            0,
            Math.min(
              budgetMaxDt -
                budgetDtSpent,

              cachedDt -
                minimumDtReserve,
            ),
          )
        : 0;


    const availableDgToSpend =
      budget
        ? Math.max(
            0,
            Math.min(
              budgetMaxDg -
                budgetDgSpent,

              cachedDg -
                minimumDgReserve,
            ),
          )
        : 0;


    const recentSpendCountThisDay =
      requestedSimulationDayIndex !==
      null
        ? recentEconomySpends.filter(
            (
              row,
            ) =>
              Number(
                row.simulation_day_index,
              ) ===
              requestedSimulationDayIndex,
          ).length
        : 0;


    /*
     * =======================================================================
     * 5. FOUNDATION SECTIONS
     * =======================================================================
     */

    const sections:
      AgentObservationSection[] =
      [];


    sections.push(
      makeSection(
        "identity.profile",

        sourceVersionMap.get(
          "identity.profile",
        )!,

        {
          userId:
            profile.id,

          email:
            profile.email,

          username:
            profile.username,

          role:
            profile.role,

          dateOfBirth:
            profile.date_of_birth,

          isSimulationUser:
            profile.is_simulation_user,
        },
      ),
    );


    sections.push(
      makeSection(
        "identity.agent",

        sourceVersionMap.get(
          "identity.agent",
        )!,

        {
          userId:
            agent.user_id,

          agentCode:
            agent.agent_code,

          internalHandle:
            agent.internal_handle,

          naturalName:
            agent.natural_name,

          accountRole:
            agent.account_role,

          lifecycleStatus:
            agent.lifecycle_status,

          worldAffinity:
            agent.world_affinity,

          syntheticAge:
            agent.synthetic_age,

          educationSystem:
            agent.education_system,

          educationLevel:
            agent.education_level,

          primaryLevel:
            agent.primary_level,

          simulationAccessTier:
            agent.simulation_access_tier,

          publicVisibilityOverride:
            agent.public_visibility_override,

          seedVersion:
            agent.seed_version,

          metadata:
            objectValue(
              agent.metadata,
            ),

          executionArchitecture:
            "synthetic_completion_plus_economy",
        },
      ),
    );


    sections.push(
      makeSection(
        "identity.persona",

        sourceVersionMap.get(
          "identity.persona",
        )!,

        objectValue(
          personaResult.data,
        ),
      ),
    );


    sections.push(
      makeSection(
        "identity.goals",

        sourceVersionMap.get(
          "identity.goals",
        )!,

        {
          count:
            (
              goalsResult.data ||
              []
            ).length,

          goals:
            goalsResult.data ||
            [],
        },
      ),
    );


    sections.push(
      makeSection(
        "identity.cohort",

        sourceVersionMap.get(
          "identity.cohort",
        )!,

        {
          syntheticObservation:
            true,

          memberships:
            [],

          cohorts:
            [],

          detailQuerySkipped:
            true,
        },
      ),
    );


    sections.push(
      makeSection(
        "identity.policy",

        sourceVersionMap.get(
          "identity.policy",
        )!,

        {
          syntheticObservation:
            true,

          assignment:
            null,

          policyVersion:
            null,

          detailQuerySkipped:
            true,
        },
      ),
    );


    /*
     * -----------------------------------------------------------------------
     * PHASE 4A ECONOMY WALLET
     *
     * Still no full ledger scans.
     *
     * Cached balances + the prepared session-day budget are enough for policy
     * eligibility. The execution RPC re-validates everything transactionally.
     * -----------------------------------------------------------------------
     */

    sections.push(
      makeSection(
        "economy.wallet",

        sourceVersionMap.get(
          "economy.wallet",
        )!,

        {
          dt: {
            cachedBalance:
              cachedDt,

            ledgerBalance:
              null,

            consistent:
              null,

            ledgerCheckSkipped:
              true,
          },

          dg: {
            cachedBalance:
              cachedDg,

            ledgerBalance:
              null,

            consistent:
              null,

            ledgerCheckSkipped:
              true,
          },

          spendBudget: {
            available:
              Boolean(
                budget,
              ),

            budgetId:
              budget?.id ||
              null,

            simulationDayIndex:
              budget
                ? Number(
                    budget.simulation_day_index,
                  )
                : requestedSimulationDayIndex,

            maxDtSpend:
              budgetMaxDt,

            dtSpent:
              budgetDtSpent,

            minimumDtReserve,

            availableDt:
              availableDtToSpend,

            maxDgSpend:
              budgetMaxDg,

            dgSpent:
              budgetDgSpent,

            minimumDgReserve,

            availableDg:
              availableDgToSpend,

            recentSpendCountThisDay,

            canSpend:
              availableDtToSpend >
                0 ||
              availableDgToSpend >
                0,
          },

          syntheticMode:
            true,

          syntheticEconomyMode:
            true,

          realInventoryMutation:
            false,
        },
      ),
    );


    sections.push(
      makeSection(
        "economy.recent_transactions",

        sourceVersionMap.get(
          "economy.recent_transactions",
        )!,

        {
          syntheticMode:
            true,

          syntheticEconomyMode:
            true,

          dreamTokens:
            [],

          dreamGems:
            [],

          ledgerQueriesSkipped:
            true,

          recentSyntheticActivities:
            recentCompletions,

          recentSyntheticActivityCount:
            recentCompletions.length,

          recentDtAwarded,

          recentDgAwarded,

          recentSyntheticEconomySpends:
            recentEconomySpends,

          recentSyntheticEconomySpendCount:
            recentEconomySpends.length,

          realInventoryMutation:
            false,
        },
      ),
    );


    sections.push(
      makeSection(
        "access.simulation_entitlement",

        sourceVersionMap.get(
          "access.simulation_entitlement",
        )!,

        simulationEntitlementFromTier(
          agent.simulation_access_tier,
        ),
      ),
    );


    sections.push(
      makeSection(
        "system.agent_settings",

        sourceVersionMap.get(
          "system.agent_settings",
        )!,

        {
          agentsEnabled:
            Boolean(
              settingsResult.data
                .agents_enabled,
            ),

          publicVisibilityEnabled:
            Boolean(
              settingsResult.data
                .public_visibility_enabled,
            ),

          leaderboardVisibilityEnabled:
            Boolean(
              settingsResult.data
                .leaderboard_visibility_enabled,
            ),

          exchangeVisibilityEnabled:
            Boolean(
              settingsResult.data
                .exchange_visibility_enabled,
            ),

          defaultSimulationAccessTier:
            settingsResult.data
              .default_simulation_access_tier,

          updatedAt:
            settingsResult.data
              .updated_at,

          observationArchitecture:
            "synthetic_lightweight_phase4a",
        },
      ),
    );


    /*
     * =======================================================================
     * 6. SYNTHETIC WORLD SECTIONS
     *
     * Still ZERO observeWorldSource() calls.
     * =======================================================================
     */

    for (
      const sourceKey
      of activeWorldSourceKeys
    ) {
      const typedSourceKey =
        sourceKey as AgentObservationSourceKey;


      const sourceVersion =
        sourceVersionMap.get(
          typedSourceKey,
        );


      if (
        !sourceVersion
      ) {
        throw new Error(
          `Active world source ${sourceKey} has no source version.`,
        );
      }


      const data =
        buildSyntheticWorldData({
          sourceKey:
            String(
              sourceKey,
            ),

          recentCompletions,

          primaryLevel,
        });


      sections.push(
        makeSection(
          typedSourceKey,

          sourceVersion,

          {
            schemaVersion:
              "synthetic-world-observation-v1",

            available:
              true,

            partial:
              false,

            errors:
              [],

            synthetic:
              true,

            realWorldQueryPerformed:
              false,

            data,
          },
        ),
      );
    }


    /*
     * =======================================================================
     * 7. SUMMARY + STATE HASH
     * =======================================================================
     */

    const summary:
      AgentWorldObservationSummary =
      {
        agentCode:
          String(
            agent.agent_code,
          ),

        lifecycleStatus:
          String(
            agent.lifecycle_status,
          ),

        worldAffinity:
          String(
            agent.world_affinity,
          ),

        dtBalance:
          cachedDt,

        dgBalance:
          cachedDg,

        activeGoalCount:
          (
            goalsResult.data ||
            []
          ).length,

        simulationAccessTier:
          String(
            agent.simulation_access_tier ||
            "basic",
          ),

        engineEnabled:
          Boolean(
            settingsResult.data
              .agents_enabled,
          ),

        observedSourceCount:
          sections.length,

        foundationSourceCount:
          FOUNDATION_OBSERVATION_SOURCE_KEYS.length,

        worldSourceCount:
          activeWorldSourceKeys.length,

        partialWorldSourceCount:
          0,

        unavailableWorldSourceCount:
          0,
      };


    const stateHash =
      sha256({
        snapshotVersion:
          AGENT_WORLD_SNAPSHOT_VERSION,

        observationArchitecture:
          "synthetic_lightweight_phase4a",

        agentUserId,

        sessionSimulationDayIndex:
          requestedSimulationDayIndex,

        sections:
          sections.map(
            (
              section,
            ) => ({
              source_key:
                section.source_key,

              source_version:
                section.source_version,

              payload_hash:
                section.payload_hash,
            }),
          ),
      });


    const sourceVersionsObject =
      Object.fromEntries(
        sections.map(
          (
            section,
          ) => [
            section.source_key,
            section.source_version,
          ],
        ),
      );


    /*
     * =======================================================================
     * 8. ATOMIC SNAPSHOT PERSISTENCE
     * =======================================================================
     */

    const {
      data:
        snapshotId,

      error:
        storeError,
    } =
      await admin.rpc(
        "agent_store_world_snapshot",
        {
          p_agent_user_id:
            agentUserId,

          p_run_id:
            runId,

          p_snapshot_version:
            AGENT_WORLD_SNAPSHOT_VERSION,

          p_observed_at:
            observedAt,

          p_state_hash:
            stateHash,

          p_summary:
            summary,

          p_source_versions:
            sourceVersionsObject,

          p_sections:
            sections,
        },
      );


    if (
      storeError ||
      !snapshotId
    ) {
      throw new Error(
        `Could not store agent world snapshot: ${
          storeError?.message ||
          "Snapshot id was not returned."
        }`,
      );
    }


    return {
      snapshotId:
        String(
          snapshotId,
        ),

      runId,

      agentUserId,

      agentCode:
        String(
          agent.agent_code,
        ),

      observedAt,

      stateHash,

      summary,

      sections,
    };

  } catch (
    observationError
  ) {
    const message =
      observationError instanceof Error
        ? observationError.message
        : "Synthetic agent world observation failed.";


    await markRunFailed(
      admin,
      runId,
      message,
    );


    throw observationError;
  }
}
