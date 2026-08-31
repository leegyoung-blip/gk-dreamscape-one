import "server-only";

import {
  randomBytes,
  randomUUID,
} from "crypto";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

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

  description?:
    | string
    | null;

  priority: number;

  source?: AgentGoalSource;

  targetData?: Record<
    string,
    unknown
  >;

  progressData?: Record<
    string,
    unknown
  >;
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

  interests?: Record<
    string,
    unknown
  >;

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

  accountRole:
    AgentAccountRole;

  dateOfBirth: string;

  syntheticAge: number;

  educationSystem: string;

  educationLevel?:
    | string
    | null;

  primaryLevel?:
    | number
    | null;

  worldAffinity:
    AgentWorldAffinity;

  startingDtTarget:
    number;

  startingDgTarget:
    number;

  simulationAccessTier?:
    | "basic"
    | "core"
    | "complete";

  generationSeed: number;

  seedVersion?: string;

  cohortKey?: string;

  policyKey?: string;

  policyVersion?: number;

  persona:
    AgentPersonaSpec;

  goals:
    AgentGoalSpec[];

  metadata?: Record<
    string,
    unknown
  >;
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
  admin:
    SupabaseClient;

  initiatedBy: string;
};

type AuthUserSummary = {
  id: string;

  email?:
    | string
    | null;

  appMetadata: Record<
    string,
    unknown
  >;
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
  new Set<
    AgentAccountRole
  >([
    "student",
    "regular",
  ]);

const VALID_AFFINITIES =
  new Set<
    AgentWorldAffinity
  >([
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

function normalizeUsername(
  value: string,
) {
  return String(
    value || "",
  )
    .trim()
    .toLowerCase();
}

function calculateAge(
  dateOfBirth: string,
  now = new Date(),
) {
  const birthDate =
    new Date(
      `${dateOfBirth}T00:00:00Z`,
    );

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
   * Agents never log in interactively.
   *
   * This password only satisfies Supabase Auth account creation.
   * It is never persisted or returned.
   */
  return `${
    randomBytes(
      48,
    ).toString(
      "base64url",
    )
  }Aa1!`;
}

function ensureObject(
  value: unknown,
) {
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

function validateTrait(
  label: string,
  value: unknown,
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    ) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${label} must be between 0 and 1.`,
    );
  }
}

export function validateAgentProvisionSpec(
  input:
    AgentProvisionSpec,
) {
  if (!input) {
    throw new Error(
      "Agent specification is required.",
    );
  }

  if (
    !AGENT_CODE_REGEX.test(
      String(
        input.agentCode ||
        "",
      ),
    )
  ) {
    throw new Error(
      "Invalid agent code.",
    );
  }

  if (
    !INTERNAL_HANDLE_REGEX.test(
      String(
        input.internalHandle ||
        "",
      ),
    )
  ) {
    throw new Error(
      "Invalid internal agent handle.",
    );
  }

  const cleanEmail =
    String(
      input.email ||
      "",
    )
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
      input.naturalName ||
      "",
    )
      .trim()
      .length < 2
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
        input.dateOfBirth ||
        "",
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
    calculatedAge ===
      null ||
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
    input.primaryLevel !==
      null &&
    input.primaryLevel !==
      undefined &&
    (
      !Number.isInteger(
        input.primaryLevel,
      ) ||
      input.primaryLevel <
        1 ||
      input.primaryLevel >
        6
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
    input.startingDtTarget <
      100 ||
    input.startingDtTarget >
      10000
  ) {
    throw new Error(
      "Starting DT target must be between 100 and 10,000.",
    );
  }

  if (
    !Number.isInteger(
      input.startingDgTarget,
    ) ||
    input.startingDgTarget <
      1 ||
    input.startingDgTarget >
      10
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
      persona.archetype ||
      "",
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
      persona[
        traitKey
      ],
    );
  }

  const activeNamedSlots =
    new Set<string>();

  for (
    const goal
    of input.goals ||
      []
  ) {
    if (
      !goal.title
        ?.trim() ||
      !goal.goalType
        ?.trim()
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
      goal.priority <
        1 ||
      goal.priority >
        100
    ) {
      throw new Error(
        "Goal priority must be between 1 and 100.",
      );
    }
  }

  return {
    ...input,

    email:
      cleanEmail,

    username:
      cleanUsername,

    naturalName:
      input.naturalName
        .trim(),

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
        persona.archetype
          .trim(),

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
      (
        input.goals ||
        []
      ).map(
        (
          goal,
        ) => ({
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

/* =====================================================================
   AUTH USER LOOKUP
   ===================================================================== */

async function findAuthUserByEmail(
  admin:
    SupabaseClient,

  email:
    string,
): Promise<
  AuthUserSummary |
  null
> {
  const wanted =
    email
      .trim()
      .toLowerCase();

  /*
   * Supabase Admin Auth does not expose direct
   * lookup-by-email here, so scan paginated users.
   */
  for (
    let page = 1;
    page <= 100;
    page += 1
  ) {
    const {
      data,
      error,
    } =
      await admin
        .auth
        .admin
        .listUsers({
          page,
          perPage:
            1000,
        });

    if (error) {
      throw new Error(
        `Could not check existing auth users: ${error.message}`,
      );
    }

    const users =
      data.users ||
      [];

    const match =
      users.find(
        (
          user,
        ) =>
          String(
            user.email ||
            "",
          )
            .trim()
            .toLowerCase() ===
          wanted,
      );

    if (match) {
      return {
        id:
          match.id,

        email:
          match.email,

        appMetadata:
          (
            match.app_metadata &&
            typeof match.app_metadata ===
              "object"
          )
            ? (
                match.app_metadata as Record<
                  string,
                  unknown
                >
              )
            : {},
      };
    }

    if (
      users.length <
      1000
    ) {
      break;
    }
  }

  return null;
}

/* =====================================================================
   PRE-PROVISION COLLISION / ADOPTION CHECK
   ===================================================================== */

async function assertNoCollision(
  admin:
    SupabaseClient,

  spec:
    ReturnType<
      typeof validateAgentProvisionSpec
    >,
) {
  /*
   * Check Auth first.
   *
   * A valid orphan auth identity from an earlier interrupted
   * provisioning attempt may be adopted.
   */
  const existingAuth =
    await findAuthUserByEmail(
      admin,
      spec.email,
    );

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
        .from(
          "profiles",
        )
        .select(
          "id,username",
        )
        .ilike(
          "username",
          spec.username,
        )
        .limit(
          2,
        ),
    ]);

  if (
    agentCodeResult.error
  ) {
    throw new Error(
      agentCodeResult
        .error
        .message,
    );
  }

  if (
    handleResult.error
  ) {
    throw new Error(
      handleResult
        .error
        .message,
    );
  }

  if (
    usernameResult.error
  ) {
    throw new Error(
      usernameResult
        .error
        .message,
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

  /*
   * Username collision is allowed only if it belongs to the same
   * trusted orphan Auth user we are about to adopt.
   */
  const usernameCollisions =
    usernameResult.data ||
    [];

  const foreignUsernameCollision =
    usernameCollisions.some(
      (
        profile,
      ) =>
        !existingAuth ||
        String(
          profile.id,
        ) !==
          existingAuth.id,
    );

  if (
    foreignUsernameCollision
  ) {
    throw new Error(
      `Public username ${spec.username} is already in use.`,
    );
  }

  let adoptableAuth:
    | AuthUserSummary
    | null =
      null;

  if (
    existingAuth
  ) {
    const accountType =
      String(
        existingAuth
          .appMetadata
          .account_type ||
        "",
      )
        .trim()
        .toLowerCase();

    const agentCode =
      String(
        existingAuth
          .appMetadata
          .agent_code ||
        "",
      )
        .trim()
        .toUpperCase();

    const agentRole =
      String(
        existingAuth
          .appMetadata
          .agent_profile_role ||
        "",
      )
        .trim()
        .toLowerCase();

    const expectedCode =
      spec.agentCode
        .trim()
        .toUpperCase();

    if (
      accountType !==
        "dreamscape_agent" ||
      agentCode !==
        expectedCode ||
      agentRole !==
        spec.accountRole
    ) {
      throw new Error(
        `Auth identity ${spec.email} already exists but does not match the trusted DREAMSCAPE agent specification.`,
      );
    }

    const {
      data:
        existingRegistry,

      error:
        registryError,
    } =
      await admin
        .from(
          "agent_profiles",
        )
        .select(
          "user_id,agent_code",
        )
        .eq(
          "user_id",
          existingAuth.id,
        )
        .maybeSingle();

    if (
      registryError
    ) {
      throw new Error(
        registryError.message,
      );
    }

    if (
      existingRegistry
    ) {
      throw new Error(
        `Auth identity ${spec.email} is already registered as an agent.`,
      );
    }

    /*
     * Trusted interrupted identity.
     *
     * It may be safely adopted.
     */
    adoptableAuth =
      existingAuth;
  }

  /* =================================================================
     COHORT
     ================================================================= */

  const {
    data:
      cohort,

    error:
      cohortError,
  } =
    await admin
      .from(
        "agent_cohorts",
      )
      .select(
        "id,is_active",
      )
      .eq(
        "cohort_key",
        spec.cohortKey,
      )
      .maybeSingle();

  if (
    cohortError
  ) {
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

  /* =================================================================
     POLICY
     ================================================================= */

  const {
    data:
      policy,

    error:
      policyError,
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

  if (
    policyError
  ) {
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

    existingAuth:
      adoptableAuth,
  };
}

/* =====================================================================
   PROVISIONING AUDIT
   ===================================================================== */

async function createAuditEvent({
  admin,
  requestId,
  spec,
  initiatedBy,
}: {
  admin:
    SupabaseClient;

  requestId:
    string;

  spec:
    ReturnType<
      typeof validateAgentProvisionSpec
    >;

  initiatedBy:
    string;
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
  admin:
    SupabaseClient,

  requestId:
    string,

  values:
    Record<
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
      .update(
        values,
      )
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

/* =====================================================================
   VALIDATION-ONLY PUBLIC FUNCTION
   ===================================================================== */

export async function validateAgentProvisioning({
  admin,
  spec,
}: {
  admin:
    SupabaseClient;

  spec:
    AgentProvisionSpec;
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

/* =====================================================================
   MAIN AGENT PROVISIONER
   ===================================================================== */

export async function provisionAgent({
  admin,
  initiatedBy,
  spec,
}: ProvisionContext & {
  spec:
    AgentProvisionSpec;
}): Promise<
  AgentProvisionResult
> {
  const requestId =
    randomUUID();

  let userId:
    | string
    | null =
      null;

  let auditStarted =
    false;

  /*
   * Important distinction:
   *
   * createdAuthThisAttempt
   *   -> this request owns the new auth user and may roll it back.
   *
   * adoptedExistingAuth
   *   -> auth user existed before this request and MUST NOT be deleted.
   */
  let createdAuthThisAttempt =
    false;

  let adoptedExistingAuth =
    false;

  /*
   * Used to distinguish failure before/after agent registry creation.
   */
  let agentRegistryInserted =
    false;

  try {
    const cleanSpec =
      validateAgentProvisionSpec(
        spec,
      );

    const {
      cohort,
      policy,
      existingAuth,
    } =
      await assertNoCollision(
        admin,
        cleanSpec,
      );

    await createAuditEvent({
      admin,
      requestId,
      spec:
        cleanSpec,
      initiatedBy,
    });

    auditStarted =
      true;

    /* =================================================================
       AUTH IDENTITY
       ================================================================= */

    if (
      existingAuth
    ) {
      /*
       * Recover a trusted orphan from an earlier interrupted attempt.
       */
      adoptedExistingAuth =
        true;

      userId =
        existingAuth.id;

      await updateAuditEvent(
        admin,
        requestId,
        {
          user_id:
            userId,

          status:
            "running",

          stage:
            "adopting_existing_auth_user",

          message:
            "Adopting a trusted DREAMSCAPE agent identity left by an earlier interrupted provisioning attempt.",
        },
      );

      /*
       * Reassert the canonical profile state.
       *
       * Phase 1G database guards only permit this for a trusted
       * simulation identity.
       */
      const {
        error:
          profileRepairError,
      } =
        await admin
          .from(
            "profiles",
          )
          .update({
            email:
              cleanSpec.email,

            role:
              cleanSpec.accountRole,

            is_simulation_user:
              true,

            referral_code:
              null,
          })
          .eq(
            "id",
            userId,
          );

      if (
        profileRepairError
      ) {
        throw new Error(
          `Could not repair interrupted agent profile: ${profileRepairError.message}`,
        );
      }

      await updateAuditEvent(
        admin,
        requestId,
        {
          stage:
            "auth_user_adopted",
        },
      );

    } else {
      /*
       * Normal new agent creation.
       */
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
        await admin
          .auth
          .admin
          .createUser({
            email:
              cleanSpec.email,

            password,

            email_confirm:
              true,

            /*
             * This metadata is not trusted for authorization.
             *
             * It supplies learner/profile information such as DOB.
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
             * Trusted backend-owned simulation identity metadata.
             */
            app_metadata: {
              account_type:
                "dreamscape_agent",

              agent_code:
                cleanSpec.agentCode,

              agent_profile_role:
                cleanSpec.accountRole,

              provisioning_version:
                "phase1g-v1",
            },
          });

      if (
        authCreateError ||
        !authCreateData.user
      ) {
        throw new Error(
          authCreateError
            ?.message ||
          "Supabase did not return the created agent auth user.",
        );
      }

      userId =
        authCreateData
          .user
          .id;

      createdAuthThisAttempt =
        true;

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
    }

    if (!userId) {
      throw new Error(
        "Agent Auth identity could not be resolved.",
      );
    }

    /* =================================================================
       PROFILE VERIFICATION
       ================================================================= */

    const {
      data:
        profile,

      error:
        profileError,
    } =
      await admin
        .from(
          "profiles",
        )
        .select(
          `
          id,
          email,
          role,
          username,
          is_simulation_user,
          referral_code,
          date_of_birth,
          dream_token_balance,
          dream_gem_balance
        `,
        )
        .eq(
          "id",
          userId,
        )
        .maybeSingle();

    if (
      profileError
    ) {
      throw new Error(
        `Could not verify generated profile: ${profileError.message}`,
      );
    }

    if (!profile) {
      throw new Error(
        "Agent Auth user exists but DREAMSCAPE profile creation failed.",
      );
    }

    if (
      profile.is_simulation_user !==
      true
    ) {
      throw new Error(
        "Generated profile was not marked as a simulation identity.",
      );
    }

    if (
      String(
        profile.role ||
        "",
      )
        .trim()
        .toLowerCase() !==
      cleanSpec.accountRole
    ) {
      throw new Error(
        `Generated profile role does not match the requested agent role. Expected ${cleanSpec.accountRole}, found ${String(
          profile.role ||
          "null",
        )}.`,
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

    /* =================================================================
       PUBLIC USERNAME
       ================================================================= */

    const {
      error:
        usernameUpdateError,
    } =
      await admin
        .from(
          "profiles",
        )
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

    /* =================================================================
       AGENT REGISTRY

       Phase 1G database trigger seeds:
       - exact initial DT target
       - exact initial DG target
       ================================================================= */

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

    agentRegistryInserted =
      true;

    await updateAuditEvent(
      admin,
      requestId,
      {
        stage:
          "agent_registry_created",
      },
    );

    /* =================================================================
       COHORT
       ================================================================= */

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
              "phase1g-provisioning",

            request_id:
              requestId,
          },
        });

    if (
      cohortInsertError
    ) {
      throw new Error(
        `Could not assign agent cohort: ${cohortInsertError.message}`,
      );
    }

    await updateAuditEvent(
      admin,
      requestId,
      {
        stage:
          "cohort_assigned",
      },
    );

    /* =================================================================
       PERSONA
       ================================================================= */

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

    await updateAuditEvent(
      admin,
      requestId,
      {
        stage:
          "persona_created",
      },
    );

    /* =================================================================
       GOALS
       ================================================================= */

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
              (
                goal,
              ) => ({
                agent_user_id:
                  userId,

                goal_slot:
                  goal.goalSlot,

                goal_scope:
                  goal.goalScope,

                goal_type:
                  goal.goalType,

                title:
                  goal.title
                    .trim(),

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

    await updateAuditEvent(
      admin,
      requestId,
      {
        stage:
          "goals_created",
      },
    );

    /* =================================================================
       POLICY
       ================================================================= */

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

    await updateAuditEvent(
      admin,
      requestId,
      {
        stage:
          "policy_assigned",
      },
    );

    /* =================================================================
       LIFECYCLE AUDIT
       ================================================================= */

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

            adopted_existing_auth:
              adoptedExistingAuth,
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
          adoptedExistingAuth
            ? "Existing trusted agent Auth identity adopted and provisioned successfully."
            : "Agent identity provisioned successfully.",

        metadata: {
          username:
            cleanSpec.username,

          natural_name:
            cleanSpec.naturalName,

          account_role:
            cleanSpec.accountRole,

          world_affinity:
            cleanSpec.worldAffinity,

          seed_version:
            cleanSpec.seedVersion,

          cohort_key:
            cleanSpec.cohortKey,

          policy_key:
            cleanSpec.policyKey,

          policy_version:
            cleanSpec.policyVersion,

          adopted_existing_auth:
            adoptedExistingAuth,
        },
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
        adoptedExistingAuth
          ? "Existing trusted agent identity adopted and provisioned successfully."
          : "Agent identity provisioned successfully.",
    };

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Agent provisioning failed.";

    /* =================================================================
       ADOPTED AUTH FAILURE

       NEVER delete an Auth identity that existed before this request.
       ================================================================= */

    if (
      userId &&
      adoptedExistingAuth
    ) {
      if (auditStarted) {
        await updateAuditEvent(
          admin,
          requestId,
          {
            status:
              agentRegistryInserted
                ? "cleanup_required"
                : "failed",

            stage:
              agentRegistryInserted
                ? "adopted_identity_partial_registration"
                : "adopted_identity_failed_before_registration",

            error_detail:
              message,

            rollback_attempted:
              false,

            rollback_succeeded:
              null,
          },
        );
      }

      return {
        ok: false,

        requestId,

        userId,

        status:
          agentRegistryInserted
            ? "cleanup_required"
            : "failed",

        message:
          agentRegistryInserted
            ? `The adopted agent identity reached partial registration and requires inspection: ${message}`
            : `The adopted agent identity remains safe and may be retried: ${message}`,
      };
    }

    /* =================================================================
       NEW AUTH FAILURE

       Only accounts created by THIS request may be deleted.
       ================================================================= */

    if (
      userId &&
      createdAuthThisAttempt
    ) {
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
        await admin
          .auth
          .admin
          .deleteUser(
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

    /* =================================================================
       FAILURE BEFORE AUTH CREATION
       ================================================================= */

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

          rollback_attempted:
            false,

          rollback_succeeded:
            null,
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