import "server-only";

import type {
  AgentActionValidationIssue,
  AgentActionValidationResult,
  ValidateAgentActionArgs,
} from "@/lib/agents/actions/types";

type JsonObject =
  Record<
    string,
    unknown
  >;

type ContractRow = {
  id: string;

  action_key: string;

  version: number;

  domain: string;

  status: string;

  mutation_class: string;

  execution_mode: string;

  adapter_key:
    | string
    | null;

  parameter_schema:
    JsonObject;

  required_observation_sources:
    unknown;

  required_entitlements:
    unknown;

  allowed_lifecycle_statuses:
    unknown;

  economic_policy:
    JsonObject;

  safety_policy:
    JsonObject;
};

function asObject(
  value: unknown,
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

function asStringArray(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item,
      ) =>
        String(
          item ?? "",
        ).trim(),
    )
    .filter(
      Boolean,
    );
}

function numberValue(
  value: unknown,
  fallback = 0,
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

function pushError(
  errors:
    AgentActionValidationIssue[],

  code:
    string,

  message:
    string,

  path?:
    string,
) {
  errors.push({
    code,
    message,
    ...(path
      ? {
          path,
        }
      : {}),
  });
}

function validateParameterSchema(
  parameters:
    JsonObject,

  schemaValue:
    unknown,
) {
  const errors:
    AgentActionValidationIssue[] =
      [];

  const schema =
    asObject(
      schemaValue,
    );

  if (
    schema.type !==
      "object"
  ) {
    pushError(
      errors,
      "CONTRACT_SCHEMA_INVALID",
      "Action parameter contract is not an object schema.",
    );

    return errors;
  }

  const required =
    asStringArray(
      schema.required,
    );

  const properties =
    asObject(
      schema.properties,
    );

  for (
    const key
    of required
  ) {
    if (
      !Object.prototype
        .hasOwnProperty
        .call(
          parameters,
          key,
        )
    ) {
      pushError(
        errors,
        "PARAMETER_REQUIRED",
        `Required parameter "${key}" is missing.`,
        key,
      );
    }
  }

  if (
    schema.additionalProperties ===
    false
  ) {
    for (
      const key
      of Object.keys(
        parameters,
      )
    ) {
      if (
        !Object.prototype
          .hasOwnProperty
          .call(
            properties,
            key,
          )
      ) {
        pushError(
          errors,
          "PARAMETER_NOT_ALLOWED",
          `Parameter "${key}" is not allowed for this action.`,
          key,
        );
      }
    }
  }

  for (
    const [
      key,
      rawRule,
    ]
    of Object.entries(
      properties,
    )
  ) {
    if (
      !Object.prototype
        .hasOwnProperty
        .call(
          parameters,
          key,
        )
    ) {
      continue;
    }

    const value =
      parameters[key];

    const rule =
      asObject(
        rawRule,
      );

    const type =
      String(
        rule.type ||
        "",
      );

    if (
      type === "string"
    ) {
      if (
        typeof value !==
        "string"
      ) {
        pushError(
          errors,
          "PARAMETER_TYPE",
          `"${key}" must be a string.`,
          key,
        );

        continue;
      }

      const minimumLength =
        rule.minLength ===
        undefined
          ? null
          : numberValue(
              rule.minLength,
            );

      const maximumLength =
        rule.maxLength ===
        undefined
          ? null
          : numberValue(
              rule.maxLength,
            );

      if (
        minimumLength !==
          null &&
        value.length <
          minimumLength
      ) {
        pushError(
          errors,
          "PARAMETER_MIN_LENGTH",
          `"${key}" must contain at least ${minimumLength} character(s).`,
          key,
        );
      }

      if (
        maximumLength !==
          null &&
        value.length >
          maximumLength
      ) {
        pushError(
          errors,
          "PARAMETER_MAX_LENGTH",
          `"${key}" may contain at most ${maximumLength} character(s).`,
          key,
        );
      }

      if (
        Array.isArray(
          rule.enum,
        ) &&
        !rule.enum.includes(
          value,
        )
      ) {
        pushError(
          errors,
          "PARAMETER_ENUM",
          `"${key}" contains an unsupported value.`,
          key,
        );
      }

      continue;
    }

    if (
      type === "integer"
    ) {
      if (
        typeof value !==
          "number" ||
        !Number.isInteger(
          value,
        )
      ) {
        pushError(
          errors,
          "PARAMETER_TYPE",
          `"${key}" must be an integer.`,
          key,
        );

        continue;
      }

      const minimum =
        rule.minimum ===
        undefined
          ? null
          : numberValue(
              rule.minimum,
            );

      const maximum =
        rule.maximum ===
        undefined
          ? null
          : numberValue(
              rule.maximum,
            );

      if (
        minimum !==
          null &&
        value <
          minimum
      ) {
        pushError(
          errors,
          "PARAMETER_MINIMUM",
          `"${key}" must be at least ${minimum}.`,
          key,
        );
      }

      if (
        maximum !==
          null &&
        value >
          maximum
      ) {
        pushError(
          errors,
          "PARAMETER_MAXIMUM",
          `"${key}" may not exceed ${maximum}.`,
          key,
        );
      }

      continue;
    }

    if (
      type === "number"
    ) {
      if (
        typeof value !==
          "number" ||
        !Number.isFinite(
          value,
        )
      ) {
        pushError(
          errors,
          "PARAMETER_TYPE",
          `"${key}" must be a number.`,
          key,
        );
      }

      continue;
    }

    if (
      type === "boolean"
    ) {
      if (
        typeof value !==
          "boolean"
      ) {
        pushError(
          errors,
          "PARAMETER_TYPE",
          `"${key}" must be true or false.`,
          key,
        );
      }

      continue;
    }

    pushError(
      errors,
      "CONTRACT_SCHEMA_UNSUPPORTED",
      `The validator does not support parameter type "${type}" for "${key}".`,
      key,
    );
  }

  return errors;
}

function entitlementSetFromTier(
  value:
    unknown,
) {
  const tier =
    String(
      value ||
      "basic",
    )
      .trim()
      .toLowerCase();

  const result =
    new Set<string>();

  if (
    tier === "core" ||
    tier === "complete"
  ) {
    result.add(
      "core",
    );

    result.add(
      "rewards",
    );
  }

  if (
    tier === "complete"
  ) {
    result.add(
      "science",
    );

    result.add(
      "business_builder",
    );
  }

  return {
    tier,
    entitlements:
      result,
  };
}

export async function validateAgentAction({
  admin,
  agentUserId,
  actionKey,
  actionVersion = 1,
  snapshotId,
  parameters,
  requestSource,
  requestedMode = "dry_run",
  createdBy,
  idempotencyKey = null,
}: ValidateAgentActionArgs): Promise<
  AgentActionValidationResult
> {
  const cleanActionKey =
    String(
      actionKey ||
      "",
    )
      .trim()
      .toLowerCase();

  if (
    !cleanActionKey
  ) {
    throw new Error(
      "Action key is required.",
    );
  }

  /*
   * The DB is the first security boundary.

   * It verifies:
   * - simulation identity
   * - active action contract
   * - same-agent world snapshot
   * - dry-run-only Phase 2B
   * - policy/scheduler engine restrictions
   */
  const {
    data:
      requestIdData,

    error:
      requestError,
  } =
    await admin.rpc(
      "agent_create_action_request",
      {
        p_agent_user_id:
          agentUserId,

        p_action_key:
          cleanActionKey,

        p_action_version:
          actionVersion,

        p_snapshot_id:
          snapshotId,

        p_request_source:
          requestSource,

        p_requested_mode:
          requestedMode,

        p_parameters:
          parameters,

        p_created_by:
          createdBy,

        p_idempotency_key:
          idempotencyKey,
      },
    );

  if (
    requestError ||
    !requestIdData
  ) {
    throw new Error(
      requestError
        ?.message ||
      "Action validation request could not be created.",
    );
  }

  const requestId =
    String(
      requestIdData,
    );

  const {
    data:
      requestRow,

    error:
      requestLoadError,
  } =
    await admin
      .from(
        "agent_action_requests",
      )
      .select(
        `
        id,
        agent_user_id,
        contract_version_id,
        snapshot_id,
        request_source,
        requested_mode,
        parameters,
        status
      `,
      )
      .eq(
        "id",
        requestId,
      )
      .maybeSingle();

  if (
    requestLoadError ||
    !requestRow
  ) {
    throw new Error(
      requestLoadError
        ?.message ||
      "Action request audit row could not be loaded.",
    );
  }

  const [
    contractResult,
    agentResult,
    profileResult,
    snapshotResult,
    sectionResult,
  ] =
    await Promise.all([
      admin
        .from(
          "agent_action_contract_versions",
        )
        .select(
          `
          id,
          action_key,
          version,
          domain,
          status,
          mutation_class,
          execution_mode,
          adapter_key,
          parameter_schema,
          required_observation_sources,
          required_entitlements,
          allowed_lifecycle_statuses,
          economic_policy,
          safety_policy
        `,
        )
        .eq(
          "id",
          requestRow
            .contract_version_id,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_profiles",
        )
        .select(
          `
          user_id,
          agent_code,
          lifecycle_status,
          world_affinity,
          simulation_access_tier
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
          is_simulation_user
        `,
        )
        .eq(
          "id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_world_snapshots",
        )
        .select(
          `
          id,
          agent_user_id,
          observed_at,
          is_complete,
          state_hash
        `,
        )
        .eq(
          "id",
          snapshotId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_world_snapshot_sections",
        )
        .select(
          `
          source_key,
          source_version
        `,
        )
        .eq(
          "snapshot_id",
          snapshotId,
        ),
    ]);

  if (
    contractResult.error ||
    !contractResult.data
  ) {
    throw new Error(
      contractResult.error
        ?.message ||
      "Action contract disappeared during validation.",
    );
  }

  if (
    agentResult.error ||
    !agentResult.data
  ) {
    throw new Error(
      agentResult.error
        ?.message ||
      "Agent registry state could not be loaded.",
    );
  }

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    throw new Error(
      profileResult.error
        ?.message ||
      "Simulation profile could not be loaded.",
    );
  }

  if (
    snapshotResult.error ||
    !snapshotResult.data
  ) {
    throw new Error(
      snapshotResult.error
        ?.message ||
      "World snapshot could not be loaded.",
    );
  }

  if (
    sectionResult.error
  ) {
    throw new Error(
      `World snapshot sections could not be loaded: ${sectionResult.error.message}`,
    );
  }

  const contract =
    contractResult.data as ContractRow;

  const agent =
    agentResult.data;

  const profile =
    profileResult.data;

  const snapshot =
    snapshotResult.data;

  const observedSources =
    (
      sectionResult.data ||
      []
    ).map(
      (
        row,
      ) =>
        String(
          row.source_key,
        ),
    );

  const observedSourceSet =
    new Set(
      observedSources,
    );

  const requiredSources =
    asStringArray(
      contract
        .required_observation_sources,
    );

  const requiredEntitlements =
    asStringArray(
      contract
        .required_entitlements,
    );

  const allowedLifecycleStatuses =
    asStringArray(
      contract
        .allowed_lifecycle_statuses,
    );

  const safetyPolicy =
    asObject(
      contract.safety_policy,
    );

  const errors:
    AgentActionValidationIssue[] =
      [];

  const warnings:
    AgentActionValidationIssue[] =
      [];

  /*
   * PARAMETER CONTRACT
   */
  errors.push(
    ...validateParameterSchema(
      asObject(
        parameters,
      ),

      contract
        .parameter_schema,
    ),
  );

  /*
   * SIMULATION IDENTITY
   */
  if (
    profile
      .is_simulation_user !==
    true
  ) {
    pushError(
      errors,
      "NOT_SIMULATION_AGENT",
      "The target profile is not a simulation identity.",
    );
  }

  /*
   * CONTRACT STATUS
   */
  if (
    contract.status !==
    "active"
  ) {
    pushError(
      errors,
      "ACTION_CONTRACT_NOT_ACTIVE",
      "This action contract is not active.",
    );
  }

  if (
    contract.execution_mode ===
    "disabled"
  ) {
    pushError(
      errors,
      "ACTION_DISABLED",
      "This action contract is disabled.",
    );
  }

  /*
   * LIFECYCLE
   */
  const lifecycleStatus =
    String(
      agent
        .lifecycle_status ||
      "",
    );

  if (
    !allowedLifecycleStatuses.includes(
      lifecycleStatus,
    )
  ) {
    pushError(
      errors,
      "LIFECYCLE_NOT_ALLOWED",
      `Action ${contract.action_key} does not allow lifecycle state "${lifecycleStatus}".`,
    );
  }

  /*
   * SNAPSHOT OWNERSHIP / COMPLETENESS
   */
  if (
    String(
      snapshot.agent_user_id,
    ) !==
    agentUserId
  ) {
    pushError(
      errors,
      "SNAPSHOT_AGENT_MISMATCH",
      "World snapshot belongs to another agent.",
    );
  }

  if (
    snapshot.is_complete !==
    true
  ) {
    pushError(
      errors,
      "SNAPSHOT_INCOMPLETE",
      "Action validation requires a complete world snapshot.",
    );
  }

  /*
   * REQUIRED OBSERVATION SOURCES
   */
  for (
    const requiredSource
    of requiredSources
  ) {
    if (
      !observedSourceSet.has(
        requiredSource,
      )
    ) {
      pushError(
        errors,
        "OBSERVATION_SOURCE_MISSING",
        `World snapshot is missing required source "${requiredSource}".`,
        requiredSource,
      );
    }
  }

  /*
   * SNAPSHOT AGE
   */
  const observedAtMs =
    new Date(
      snapshot.observed_at,
    ).getTime();

  const nowMs =
    Date.now();

  const snapshotAgeSeconds =
    Number.isFinite(
      observedAtMs,
    )
      ? Math.max(
          0,
          Math.floor(
            (
              nowMs -
              observedAtMs
            ) /
            1000,
          ),
        )
      : Number.POSITIVE_INFINITY;

  const maxSnapshotAgeSeconds =
    numberValue(
      safetyPolicy
        .max_snapshot_age_seconds,
      3600,
    );

  if (
    snapshotAgeSeconds >
    maxSnapshotAgeSeconds
  ) {
    pushError(
      errors,
      "SNAPSHOT_STALE",
      `World snapshot is ${snapshotAgeSeconds}s old; this contract requires ${maxSnapshotAgeSeconds}s or fresher.`,
    );
  }

  /*
   * INTERNAL SIMULATION ENTITLEMENTS
   */
  const {
    tier:
      simulationAccessTier,

    entitlements,
  } =
    entitlementSetFromTier(
      agent
        .simulation_access_tier,
    );

  for (
    const entitlement
    of requiredEntitlements
  ) {
    if (
      !entitlements.has(
        entitlement,
      )
    ) {
      pushError(
        errors,
        "ENTITLEMENT_REQUIRED",
        `Action requires simulation entitlement "${entitlement}".`,
        entitlement,
      );
    }
  }

  /*
   * Phase 2B deliberately allows validation-only contracts.

   * There is still no execution adapter call here.
   */
  if (
    contract.execution_mode ===
    "validation_only"
  ) {
    warnings.push({
      code:
        "VALIDATION_ONLY",

      message:
        "Contract is validation-only. No DREAMSCAPE world action will execute.",
    });
  }

  if (
    contract
      .mutation_class !==
      "none"
  ) {
    warnings.push({
      code:
        "WORLD_MUTATION_NOT_ENABLED",

      message:
        "This contract represents a future world mutation. Phase 2B does not execute it.",
    });
  }

  const validated =
    errors.length ===
    0;

  const validationResult =
    {
      ok:
        validated,

      validator_version:
        "ActionValidatorV1",

      action_key:
        contract.action_key,

      action_version:
        contract.version,

      checked_at:
        new Date()
          .toISOString(),

      errors,

      warnings,

      context: {
        lifecycle_status:
          lifecycleStatus,

        execution_mode:
          contract.execution_mode,

        mutation_class:
          contract.mutation_class,

        simulation_access_tier:
          simulationAccessTier,

        snapshot_observed_at:
          snapshot.observed_at,

        snapshot_age_seconds:
          snapshotAgeSeconds,

        required_observation_sources:
          requiredSources,

        observed_sources:
          observedSources,

        required_entitlements:
          requiredEntitlements,
      },
    };

  const {
    error:
      updateError,
  } =
    await admin
      .from(
        "agent_action_requests",
      )
      .update({
        status:
          validated
            ? "validated"
            : "rejected",

        validation_result:
          validationResult,

        rejection_code:
          validated
            ? null
            : (
                errors[0]
                  ?.code ||
                "VALIDATION_FAILED"
              ),

        error_message:
          validated
            ? null
            : (
                errors[0]
                  ?.message ||
                "Action validation failed."
              ),

        validated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        requestId,
      );

  if (
    updateError
  ) {
    throw new Error(
      `Could not persist action validation result: ${updateError.message}`,
    );
  }

  return {
    ok:
      validated,

    requestId,

    agentUserId,

    agentCode:
      String(
        agent.agent_code,
      ),

    actionKey:
      String(
        contract.action_key,
      ),

    actionVersion:
      Number(
        contract.version,
      ),

    snapshotId,

    status:
      validated
        ? "validated"
        : "rejected",

    errors,

    warnings,

    context: {
      lifecycleStatus,

      executionMode:
        String(
          contract.execution_mode,
        ),

      mutationClass:
        String(
          contract.mutation_class,
        ),

      simulationAccessTier,

      snapshotObservedAt:
        String(
          snapshot.observed_at,
        ),

      snapshotAgeSeconds,

      requiredObservationSources:
        requiredSources,

      observedSources,

      requiredEntitlements,
    },
  };
}