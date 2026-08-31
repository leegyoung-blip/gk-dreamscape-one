import "server-only";

import {
  randomBytes,
  randomUUID,
} from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentAccountRole =
  | "student"
  | "regular";

export type AgentWorldAffinity =
  | "nova"
  | "milo"
  | "both";

export type AgentGoalSlot =
  | "primary"
  | "secondary"
  | "current"
  | "other";

export type AgentGoalSource =
  | "seed"
  | "admin"
  | "policy"
  | "system";

export type AgentGoalSpec = {
  goalSlot: AgentGoalSlot;
  goalScope: string;
  goalType: string;
  title: string;
  description?: string | null;
  priority: number;
  source?: AgentGoalSource;
  targetData?: Record<string, unknown>;
  progressData?: Record<string, unknown>;
};

export type AgentPersonaSpec = {
  archetype: string;

  competitiveness: number;
  curiosity: number;
  patience: number;

  savingTendency: number;
  spendingTendency: number;

  riskTolerance: number;
  socialTendency: number;
  explorationTendency: number;

  collectionTendency: number;
  progressionTendency: number;

  activityLevel: number;
  quizSkill: number;
  impulsiveness: number;
  planningHorizon: number;

  interests?: Record<string, unknown>;

  economicPreferences?: Record<
    string,
    unknown
  >;

  behaviouralParameters?: Record<
    string,
    unknown
  >;
};

export type AgentProvisionSpec = {
  agentCode: string;
  internalHandle: string;

  email: string;

  naturalName: string;
  username: string;

  accountRole: AgentAccountRole;

  dateOfBirth: string;
  syntheticAge: number;

  educationSystem: string;
  educationLevel?: string | null;
  primaryLevel?: number | null;

  worldAffinity: AgentWorldAffinity;

  startingDtTarget: number;
  startingDgTarget: number;

  simulationAccessTier?:
    | "basic"
    | "core"
    | "complete";

  generationSeed: number;

  seedVersion?: string;

  cohortKey?: string;

  policyKey?: string;
  policyVersion?: number;

  persona: AgentPersonaSpec;

  goals: AgentGoalSpec[];

  metadata?: Record<string, unknown>;
};

export type AgentProvisionResult = {
  ok: boolean;

  requestId: string;

  userId?: string;

  agentCode?: string;
  internalHandle?: string;
  email?: string;
  username?: string;

  status:
    | "validated"
    | "provisioned"
    | "failed"
    | "rolled_back"
    | "cleanup_required";

  message: string;
};

type ProvisionContext = {
  admin: SupabaseClient;
  initiatedBy: string;
};

type AuthUserSummary = {
  id: string;
  email?: string | null;
};

const AGENT_EMAIL_REGEX =
  /^agent\d{3,}@simulation\.dreamscape$/;

const AGENT_CODE_REGEX =
  /^DSBOT-\d{4,}$/;

const INTERNAL_HANDLE_REGEX =
  /^agent_\d{4,}$/;

const USERNAME_REGEX =
  /^[a-z0-9_]{3,20}$/;

const VALID_ROLES =
  new Set<AgentAccountRole>([
    "student",
    "regular",
  ]);

const VALID_AFFINITIES =
  new Set<AgentWorldAffinity>([
    "nova",
    "milo",
    "both",
  ]);

const TRAIT_KEYS: Array<
  keyof Pick<
    AgentPersonaSpec,
    | "competitiveness"
    | "curiosity"
    | "patience"
    | "savingTendency"
    | "spendingTendency"
    | "riskTolerance"
    | "socialTendency"
    | "explorationTendency"
    | "collectionTendency"
    | "progressionTendency"
    | "activityLevel"
    | "quizSkill"
    | "impulsiveness"
    | "planningHorizon"
  >
> = [
  "competitiveness",
  "curiosity",
  "patience",
  "savingTendency",
  "spendingTendency",
  "riskTolerance",
  "socialTendency",
  "explorationTendency",
  "collectionTendency",
  "progressionTendency",
  "activityLevel",
  "quizSkill",
  "impulsiveness",
  "planningHorizon",
];

function normalizeUsername(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function calculateAge(
  dateOfBirth: string,
  now = new Date(),
) {
  const birthDate =
    new Date(`${dateOfBirth}T00:00:00Z`);

  if (
    Number.isNaN(
      birthDate.getTime(),
    )
  ) {
    return null;
  }

  let age =
    now.getUTCFullYear() -
    birthDate.getUTCFullYear();

  const monthDifference =
    now.getUTCMonth() -
    birthDate.getUTCMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      now.getUTCDate() <
        birthDate.getUTCDate()
    )
  ) {
    age -= 1;
  }

  return age;
}

function createDiscardedPassword() {
  /*
   * This password exists only so Supabase creates a password
   * identity. It is NEVER stored or returned.
   *
   * Future agent actions will use the controlled agent action
   * layer, not password login.
   */
  return `${randomBytes(48).toString(
    "base64url",
  )}Aa1!`;
}

function ensureObject(
  value: unknown,
) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function validateTrait(
  label: string,
  value: unknown,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${label} must be between 0 and 1.`,
    );
  }
}

export function validateAgentProvisionSpec(
  input: AgentProvisionSpec,
) {
  if (!input) {
    throw new Error(
      "Agent specification is required.",
    );
  }

  if (
    !AGENT_CODE_REGEX.test(
      String(input.agentCode || ""),
    )
  ) {
    throw new Error(
      "Invalid agent code.",
    );
  }

  if (
    !INTERNAL_HANDLE_REGEX.test(
      String(
        input.internalHandle || "",
      ),
    )
  ) {
    throw new Error(
      "Invalid internal agent handle.",
    );
  }

  const cleanEmail =
    String(input.email || "")
      .trim()
      .toLowerCase();

  if (
    !AGENT_EMAIL_REGEX.test(
      cleanEmail,
    )
  ) {
    throw new Error(
      "Agent email must use the internal simulation email format.",
    );
  }

  if (
    String(
      input.naturalName || "",
    ).trim().length < 2
  ) {
    throw new Error(
      "Natural agent name is required.",
    );
  }

  const cleanUsername =
    normalizeUsername(
      input.username,
    );

  if (
    !USERNAME_REGEX.test(
      cleanUsername,
    )
  ) {
    throw new Error(
      "Agent username must be 3 to 20 lowercase letters, numbers, or underscores.",
    );
  }

  if (
    !VALID_ROLES.has(
      input.accountRole,
    )
  ) {
    throw new Error(
      "Unsupported agent account role.",
    );
  }

  if (
    !VALID_AFFINITIES.has(
      input.worldAffinity,
    )
  ) {
    throw new Error(
      "Unsupported world affinity.",
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(
        input.dateOfBirth || "",
      ),
    )
  ) {
    throw new Error(
      "Agent date of birth must use YYYY-MM-DD.",
    );
  }

  const calculatedAge =
    calculateAge(
      input.dateOfBirth,
    );

  if (
    calculatedAge === null ||
    calculatedAge < 4 ||
    calculatedAge > 120
  ) {
    throw new Error(
      "Agent date of birth is outside the supported age range.",
    );
  }

  if (
    !Number.isInteger(
      input.syntheticAge,
    ) ||
    calculatedAge !==
      input.syntheticAge
  ) {
    throw new Error(
      `Synthetic age does not match date of birth. Expected ${calculatedAge}.`,
    );
  }

  if (
    input.primaryLevel !== null &&
    input.primaryLevel !== undefined &&
    (
      !Number.isInteger(
        input.primaryLevel,
      ) ||
      input.primaryLevel < 1 ||
      input.primaryLevel > 6
    )
  ) {
    throw new Error(
      "Primary level must be P1 to P6 or null.",
    );
  }

  if (
    !Number.isInteger(
      input.startingDtTarget,
    ) ||
    input.startingDtTarget < 100 ||
    input.startingDtTarget > 10000
  ) {
    throw new Error(
      "Starting DT target must be between 100 and 10,000.",
    );
  }

  if (
    !Number.isInteger(
      input.startingDgTarget,
    ) ||
    input.startingDgTarget < 1 ||
    input.startingDgTarget > 10
  ) {
    throw new Error(
      "Starting DG target must be between 1 and 10.",
    );
  }

  if (
    !Number.isSafeInteger(
      input.generationSeed,
    )
  ) {
    throw new Error(
      "A valid generation seed is required.",
    );
  }

  const persona =
    input.persona;

  if (
    !persona ||
    !String(
      persona.archetype || "",
    ).trim()
  ) {
    throw new Error(
      "Agent persona archetype is required.",
    );
  }

  for (
    const traitKey
    of TRAIT_KEYS
  ) {
    validateTrait(
      traitKey,
      persona[traitKey],
    );
  }

  const activeNamedSlots =
    new Set<string>();

  for (
    const goal
    of input.goals || []
  ) {
    if (
      !goal.title?.trim() ||
      !goal.goalType?.trim()
    ) {
      throw new Error(
        "Every agent goal requires a title and goal type.",
      );
    }

    if (
      ![
        "primary",
        "secondary",
        "current",
        "other",
      ].includes(
        goal.goalSlot,
      )
    ) {
      throw new Error(
        "Unsupported goal slot.",
      );
    }

    if (
      goal.goalSlot !==
        "other"
    ) {
      if (
        activeNamedSlots.has(
          goal.goalSlot,
        )
      ) {
        throw new Error(
          `Only one ${goal.goalSlot} goal may be seeded.`,
        );
      }

      activeNamedSlots.add(
        goal.goalSlot,
      );
    }

    if (
      !Number.isInteger(
        goal.priority,
      ) ||
      goal.priority < 1 ||
      goal.priority > 100
    ) {
      throw new Error(
        "Goal priority must be between 1 and 100.",
      );
    }
  }

  return {
    ...input,

    email: cleanEmail,

    username:
      cleanUsername,

    naturalName:
      input.naturalName.trim(),

    educationSystem:
      String(
        input.educationSystem ||
          "SG",
      ).trim(),

    educationLevel:
      input.educationLevel
        ? String(
            input.educationLevel,
          ).trim()
        : null,

    primaryLevel:
      input.primaryLevel ??
      null,

    simulationAccessTier:
      input.simulationAccessTier ??
      "complete",

    seedVersion:
      input.seedVersion ??
      "phase1-v1",

    cohortKey:
      input.cohortKey ??
      "initial-100",

    policyKey:
      input.policyKey ??
      "rule_based",

    policyVersion:
      input.policyVersion ??
      1,

    metadata:
      ensureObject(
        input.metadata,
      ),

    persona: {
      ...persona,

      archetype:
        persona.archetype.trim(),

      interests:
        ensureObject(
          persona.interests,
        ),

      economicPreferences:
        ensureObject(
          persona.economicPreferences,
        ),

      behaviouralParameters:
        ensureObject(
          persona.behaviouralParameters,
        ),
    },

    goals:
      (input.goals || []).map(
        (goal) => ({
          ...goal,

          goalScope:
            String(
              goal.goalScope ||
                "global",
            ).trim(),

          source:
            goal.source ??
            "seed",

          description:
            goal.description ??
            null,

          targetData:
            ensureObject(
              goal.targetData,
            ),

          progressData:
            ensureObject(
              goal.progressData,
            ),
        }),
      ),
  };
}

async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<AuthUserSummary | null> {
  const wanted =
    email.trim().toLowerCase();

  /*
   * Auth admin listUsers is paginated.
   * This protects against an orphan auth identity left from an
   * earlier failed provisioning attempt.
   */
  for (
    let page = 1;
    page <= 20;
    page += 1
  ) {
    const {
      data,
      error,
    } =
      await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) {
      throw new Error(
        `Could not check existing auth users: ${error.message}`,
      );
    }

    const users =
      data.users || [];

    const match =
      users.find(
        (user) =>
          String(
            user.email || "",
          )
            .trim()
            .toLowerCase() ===
          wanted,
      );

    if (match) {
      return {
        id: match.id,
        email:
          match.email,
      };
    }

    if (
      users.length < 1000
    ) {
      break;
    }
  }

  return null;
}

async function assertNoCollision(
  admin: SupabaseClient,
  spec: ReturnType<
    typeof validateAgentProvisionSpec
  >,
) {
  const [
    agentCodeResult,
    handleResult,
    usernameResult,
  ] =
    await Promise.all([
      admin
        .from(
          "agent_profiles",
        )
        .select(
          "user_id,agent_code",
        )
        .eq(
          "agent_code",
          spec.agentCode,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_profiles",
        )
        .select(
          "user_id,internal_handle",
        )
        .eq(
          "internal_handle",
          spec.internalHandle,
        )
        .maybeSingle(),

      admin
        .from("profiles")
        .select("id,username")
        .ilike(
          "username",
          spec.username,
        )
        .limit(1),
    ]);

  if (
    agentCodeResult.error
  ) {
    throw new Error(
      agentCodeResult.error.message,
    );
  }

  if (
    handleResult.error
  ) {
    throw new Error(
      handleResult.error.message,
    );
  }

  if (
    usernameResult.error
  ) {
    throw new Error(
      usernameResult.error.message,
    );
  }

  if (
    agentCodeResult.data
  ) {
    throw new Error(
      `Agent code ${spec.agentCode} already exists.`,
    );
  }

  if (
    handleResult.data
  ) {
    throw new Error(
      `Internal handle ${spec.internalHandle} already exists.`,
    );
  }

  if (
    (
      usernameResult.data ||
      []
    ).length > 0
  ) {
    throw new Error(
      `Public username ${spec.username} is already in use.`,
    );
  }

  const existingAuth =
    await findAuthUserByEmail(
      admin,
      spec.email,
    );

  if (existingAuth) {
    throw new Error(
      `Auth identity ${spec.email} already exists.`,
    );
  }

  const {
    data: cohort,
    error: cohortError,
  } =
    await admin
      .from(
        "agent_cohorts",
      )
      .select("id,is_active")
      .eq(
        "cohort_key",
        spec.cohortKey,
      )
      .maybeSingle();

  if (cohortError) {
    throw new Error(
      cohortError.message,
    );
  }

  if (
    !cohort ||
    !cohort.is_active
  ) {
    throw new Error(
      `Agent cohort ${spec.cohortKey} is unavailable.`,
    );
  }

  const {
    data: policy,
    error: policyError,
  } =
    await admin
      .from(
        "agent_policy_versions",
      )
      .select(
        "id,status",
      )
      .eq(
        "policy_key",
        spec.policyKey,
      )
      .eq(
        "version",
        spec.policyVersion,
      )
      .maybeSingle();

  if (policyError) {
    throw new Error(
      policyError.message,
    );
  }

  if (!policy) {
    throw new Error(
      `Agent policy ${spec.policyKey} v${spec.policyVersion} does not exist.`,
    );
  }

  return {
    cohort,
    policy,
  };
}

async function createAuditEvent({
  admin,
  requestId,
  spec,
  initiatedBy,
}: {
  admin: SupabaseClient;
  requestId: string;
  spec: ReturnType<
    typeof validateAgentProvisionSpec
  >;
  initiatedBy: string;
}) {
  const {
    error,
  } =
    await admin
      .from(
        "agent_provisioning_events",
      )
      .insert({
        request_id:
          requestId,

        operation:
          "provision",

        agent_code:
          spec.agentCode,

        internal_handle:
          spec.internalHandle,

        requested_email:
          spec.email,

        status:
          "started",

        stage:
          "validation_complete",

        initiated_by:
          initiatedBy,

        metadata: {
          username:
            spec.username,

          natural_name:
            spec.naturalName,

          account_role:
            spec.accountRole,

          world_affinity:
            spec.worldAffinity,

          seed_version:
            spec.seedVersion,

          cohort_key:
            spec.cohortKey,

          policy_key:
            spec.policyKey,

          policy_version:
            spec.policyVersion,
        },
      });

  if (error) {
    throw new Error(
      `Could not create provisioning audit event: ${error.message}`,
    );
  }
}

async function updateAuditEvent(
  admin: SupabaseClient,
  requestId: string,
  values: Record<
    string,
    unknown
  >,
) {
  const {
    error,
  } =
    await admin
      .from(
        "agent_provisioning_events",
      )
      .update(values)
      .eq(
        "request_id",
        requestId,
      );

  if (error) {
    console.error(
      "Agent provisioning audit update failed:",
      error.message,
    );
  }
}

export async function validateAgentProvisioning({
  admin,
  spec,
}: {
  admin: SupabaseClient;
  spec: AgentProvisionSpec;
}) {
  const cleanSpec =
    validateAgentProvisionSpec(
      spec,
    );

  await assertNoCollision(
    admin,
    cleanSpec,
  );

  return cleanSpec;
}

export async function provisionAgent({
  admin,
  initiatedBy,
  spec,
}: ProvisionContext & {
  spec: AgentProvisionSpec;
}): Promise<AgentProvisionResult> {
  const requestId =
    randomUUID();

  let userId:
    | string
    | null = null;

  let auditStarted =
    false;

  try {
    const cleanSpec =
      validateAgentProvisionSpec(
        spec,
      );

    const {
      cohort,
      policy,
    } =
      await assertNoCollision(
        admin,
        cleanSpec,
      );

    await createAuditEvent({
      admin,
      requestId,
      spec: cleanSpec,
      initiatedBy,
    });

    auditStarted = true;

    await updateAuditEvent(
      admin,
      requestId,
      {
        status:
          "running",
        stage:
          "creating_auth_user",
      },
    );

    const password =
      createDiscardedPassword();

    const {
      data:
        authCreateData,
      error:
        authCreateError,
    } =
      await admin.auth.admin.createUser({
        email:
          cleanSpec.email,

        password,

        email_confirm:
          true,

        /*
         * raw_user_meta_data:
         * DOB is intentionally placed here because the existing
         * DREAMSCAPE auth trigger syncs it into profiles.
         */
        user_metadata: {
          full_name:
            cleanSpec.naturalName,

          date_of_birth:
            cleanSpec.dateOfBirth,

          account_source:
            "dreamscape-agent-framework",

          synthetic_identity:
            true,
        },

        /*
         * Trusted backend-owned metadata.
         *
         * Phase 1A uses account_type + agent_profile_role
         * to create the profile safely.
         *
         * Do not put full persona data here. App metadata is
         * intentionally minimal.
         */
        app_metadata: {
          account_type:
            "dreamscape_agent",

          agent_code:
            cleanSpec.agentCode,

          agent_profile_role:
            cleanSpec.accountRole,

          provisioning_version:
            "phase1c-v1",
        },
      });

    if (
      authCreateError ||
      !authCreateData.user
    ) {
      throw new Error(
        authCreateError?.message ||
          "Supabase did not return the created agent auth user.",
      );
    }

    userId =
      authCreateData.user.id;

    await updateAuditEvent(
      admin,
      requestId,
      {
        user_id:
          userId,

        stage:
          "auth_user_created",
      },
    );

    /*
     * handle_new_user() runs as part of the auth-user insertion.
     * Verify rather than assuming that the profile trigger worked.
     */
    const {
      data: profile,
      error:
        profileError,
    } =
      await admin
        .from("profiles")
        .select(
          "id,email,role,is_simulation_user,referral_code,date_of_birth",
        )
        .eq(
          "id",
          userId,
        )
        .maybeSingle();

    if (profileError) {
      throw new Error(
        `Could not verify generated profile: ${profileError.message}`,
      );
    }

    if (!profile) {
      throw new Error(
        "Agent auth user was created but DREAMSCAPE profile creation failed.",
      );
    }

    if (
      profile
        .is_simulation_user !==
      true
    ) {
      throw new Error(
        "Generated profile was not marked as a simulation identity.",
      );
    }

    if (
      String(
        profile.role || "",
      )
        .trim()
        .toLowerCase() !==
      cleanSpec.accountRole
    ) {
      throw new Error(
        "Generated profile role does not match the requested agent role.",
      );
    }

    if (
      profile.referral_code
    ) {
      throw new Error(
        "Generated agent unexpectedly received a referral code.",
      );
    }

    await updateAuditEvent(
      admin,
      requestId,
      {
        stage:
          "profile_verified",
      },
    );

    /*
     * Use the same username format that the current Profile page
     * accepts: lowercase letters, numbers and underscore.
     */
    const {
      error:
        usernameUpdateError,
    } =
      await admin
        .from("profiles")
        .update({
          username:
            cleanSpec.username,
        })
        .eq(
          "id",
          userId,
        );

    if (
      usernameUpdateError
    ) {
      throw new Error(
        `Could not set agent public username: ${usernameUpdateError.message}`,
      );
    }

    await updateAuditEvent(
      admin,
      requestId,
      {
        stage:
          "registering_agent",
      },
    );

    const {
      error:
        agentInsertError,
    } =
      await admin
        .from(
          "agent_profiles",
        )
        .insert({
          user_id:
            userId,

          agent_code:
            cleanSpec.agentCode,

          internal_handle:
            cleanSpec.internalHandle,

          natural_name:
            cleanSpec.naturalName,

          account_role:
            cleanSpec.accountRole,

          lifecycle_status:
            "dormant",

          world_affinity:
            cleanSpec.worldAffinity,

          synthetic_age:
            cleanSpec.syntheticAge,

          education_system:
            cleanSpec.educationSystem,

          education_level:
            cleanSpec.educationLevel,

          primary_level:
            cleanSpec.primaryLevel,

          starting_dt_target:
            cleanSpec.startingDtTarget,

          starting_dg_target:
            cleanSpec.startingDgTarget,

          simulation_access_tier:
            cleanSpec.simulationAccessTier,

          public_visibility_override:
            null,

          generation_seed:
            cleanSpec.generationSeed,

          seed_version:
            cleanSpec.seedVersion,

          metadata:
            cleanSpec.metadata,
        });

    if (
      agentInsertError
    ) {
      throw new Error(
        `Could not register agent: ${agentInsertError.message}`,
      );
    }

    const {
      error:
        cohortInsertError,
    } =
      await admin
        .from(
          "agent_cohort_memberships",
        )
        .insert({
          cohort_id:
            cohort.id,

          agent_user_id:
            userId,

          is_primary:
            true,

          metadata: {
            source:
              "phase1c-provisioning",
          },
        });

    if (
      cohortInsertError
    ) {
      throw new Error(
        `Could not assign agent cohort: ${cohortInsertError.message}`,
      );
    }

    const persona =
      cleanSpec.persona;

    const {
      error:
        personaInsertError,
    } =
      await admin
        .from(
          "agent_personas",
        )
        .insert({
          agent_user_id:
            userId,

          archetype:
            persona.archetype,

          competitiveness:
            persona.competitiveness,

          curiosity:
            persona.curiosity,

          patience:
            persona.patience,

          saving_tendency:
            persona.savingTendency,

          spending_tendency:
            persona.spendingTendency,

          risk_tolerance:
            persona.riskTolerance,

          social_tendency:
            persona.socialTendency,

          exploration_tendency:
            persona.explorationTendency,

          collection_tendency:
            persona.collectionTendency,

          progression_tendency:
            persona.progressionTendency,

          activity_level:
            persona.activityLevel,

          quiz_skill:
            persona.quizSkill,

          impulsiveness:
            persona.impulsiveness,

          planning_horizon:
            persona.planningHorizon,

          interests:
            persona.interests,

          economic_preferences:
            persona.economicPreferences,

          behavioural_parameters:
            persona.behaviouralParameters,
        });

    if (
      personaInsertError
    ) {
      throw new Error(
        `Could not create agent persona: ${personaInsertError.message}`,
      );
    }

    if (
      cleanSpec.goals.length >
      0
    ) {
      const {
        error:
          goalsInsertError,
      } =
        await admin
          .from(
            "agent_goals",
          )
          .insert(
            cleanSpec.goals.map(
              (goal) => ({
                agent_user_id:
                  userId,

                goal_slot:
                  goal.goalSlot,

                goal_scope:
                  goal.goalScope,

                goal_type:
                  goal.goalType,

                title:
                  goal.title.trim(),

                description:
                  goal.description,

                priority:
                  goal.priority,

                status:
                  "active",

                source:
                  goal.source,

                target_data:
                  goal.targetData,

                progress_data:
                  goal.progressData,
              }),
            ),
          );

      if (
        goalsInsertError
      ) {
        throw new Error(
          `Could not create agent goals: ${goalsInsertError.message}`,
        );
      }
    }

    const {
      error:
        policyAssignmentError,
    } =
      await admin
        .from(
          "agent_policy_assignments",
        )
        .insert({
          agent_user_id:
            userId,

          policy_version_id:
            policy.id,

          assignment_reason:
            "Initial dormant policy assignment",

          assigned_by:
            initiatedBy,

          config_override:
            {},
        });

    if (
      policyAssignmentError
    ) {
      throw new Error(
        `Could not assign initial agent policy: ${policyAssignmentError.message}`,
      );
    }

    const {
      error:
        lifecycleError,
    } =
      await admin
        .from(
          "agent_lifecycle_events",
        )
        .insert({
          agent_user_id:
            userId,

          event_type:
            "provisioned",

          from_status:
            null,

          to_status:
            "dormant",

          reason:
            "Initial DREAMSCAPE agent provisioning",

          metadata: {
            request_id:
              requestId,

            cohort:
              cleanSpec.cohortKey,

            policy:
              `${cleanSpec.policyKey}:v${cleanSpec.policyVersion}`,
          },

          created_by:
            initiatedBy,
        });

    if (
      lifecycleError
    ) {
      throw new Error(
        `Could not create lifecycle event: ${lifecycleError.message}`,
      );
    }

    await updateAuditEvent(
      admin,
      requestId,
      {
        status:
          "succeeded",

        stage:
          "complete",

        message:
          "Agent identity provisioned successfully.",
      },
    );

    return {
      ok: true,

      requestId,

      userId,

      agentCode:
        cleanSpec.agentCode,

      internalHandle:
        cleanSpec.internalHandle,

      email:
        cleanSpec.email,

      username:
        cleanSpec.username,

      status:
        "provisioned",

      message:
        "Agent identity provisioned successfully.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Agent provisioning failed.";

    /*
     * If auth.users was already created, delete that identity.
     *
     * The existing FK cascade then removes:
     * profiles
     * agent_profiles
     * persona
     * cohort memberships
     * goals
     * policy assignments
     * lifecycle events
     *
     * The separate provisioning audit row remains.
     */
    if (userId) {
      if (auditStarted) {
        await updateAuditEvent(
          admin,
          requestId,
          {
            status:
              "failed",

            stage:
              "rollback_started",

            message,

            rollback_attempted:
              true,
          },
        );
      }

      const {
        error:
          deleteError,
      } =
        await admin.auth.admin.deleteUser(
          userId,
        );

      if (!deleteError) {
        if (auditStarted) {
          await updateAuditEvent(
            admin,
            requestId,
            {
              status:
                "rolled_back",

              stage:
                "rollback_complete",

              error_detail:
                message,

              rollback_succeeded:
                true,
            },
          );
        }

        return {
          ok: false,

          requestId,

          status:
            "rolled_back",

          message:
            `Provisioning failed and the partial agent was rolled back: ${message}`,
        };
      }

      if (auditStarted) {
        await updateAuditEvent(
          admin,
          requestId,
          {
            status:
              "cleanup_required",

            stage:
              "rollback_failed",

            error_detail:
              message,

            error_code:
              deleteError.message,

            rollback_succeeded:
              false,
          },
        );
      }

      return {
        ok: false,

        requestId,

        userId,

        status:
          "cleanup_required",

        message:
          `Provisioning failed and automatic cleanup also failed: ${message}`,
      };
    }

    if (auditStarted) {
      await updateAuditEvent(
        admin,
        requestId,
        {
          status:
            "failed",

          stage:
            "failed_before_auth_creation",

          error_detail:
            message,
        },
      );
    }

    return {
      ok: false,

      requestId,

      status:
        "failed",

      message,
    };
  }
}