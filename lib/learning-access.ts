export type LearningPlanCode =
  | "science"
  | "core"
  | "complete";

export type SimulationAccessTier =
  | "basic"
  | "core"
  | "complete";

export type NovaSubscriptionAccessRow = {
  status: string | null;
  access_until: string | null;
  access_started_at?: string | null;
  plan_code?: string | null;
};

export type SimulationLearningAccess = {
  isSimulationUser?: boolean;
  accessTier?: SimulationAccessTier | null;
};

export type LearningEntitlements = {
  core: boolean;
  science: boolean;
  businessBuilder: boolean;
  rewards: boolean;

  /*
   * Intentionally means PAID human access.
   *
   * Simulation entitlement does not turn this on.
   */
  anyPaidAccess: boolean;

  activePlans: LearningPlanCode[];

  isLegacyStudent: boolean;

  isSimulationAccess: boolean;

  simulationAccessTier:
    | SimulationAccessTier
    | null;
};

const STAFF_LEARNING_ROLES =
  new Set([
    "admin",
    "teacher",
    "curriculum-lead",
    "curriculumlead",
  ]);

export function normaliseRole(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value || "",
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s_]+/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-|-$/g,
      "",
    );
}

export function roleHasStaffLearningAccess(
  value:
    | string
    | null
    | undefined,
) {
  return STAFF_LEARNING_ROLES.has(
    normaliseRole(
      value,
    ),
  );
}

export function isActiveSubscription(
  row:
    NovaSubscriptionAccessRow,
  now = Date.now(),
) {
  const status =
    String(
      row.status || "",
    )
      .trim()
      .toLowerCase();

  if (
    status !== "active"
  ) {
    return false;
  }

  if (
    row.access_started_at
  ) {
    const accessStartedAt =
      new Date(
        row.access_started_at,
      ).getTime();

    if (
      !Number.isFinite(
        accessStartedAt,
      ) ||
      accessStartedAt >
        now
    ) {
      return false;
    }
  }

  if (
    !row.access_until
  ) {
    return true;
  }

  const accessUntil =
    new Date(
      row.access_until,
    ).getTime();

  return (
    Number.isFinite(
      accessUntil,
    ) &&
    accessUntil >= now
  );
}

function normalisePlanCode(
  value:
    | string
    | null
    | undefined,
):
  | LearningPlanCode
  | null {
  const plan =
    String(
      value || "",
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s_]+/g,
        "-",
      )
      .replace(
        /-+/g,
        "-",
      )
      .replace(
        /^-|-$/g,
        "",
      );

  if (
    plan === "science"
  ) {
    return "science";
  }

  if (
    plan === "core"
  ) {
    return "core";
  }

  if (
    plan === "complete"
  ) {
    return "complete";
  }

  return null;
}

export function getLearningEntitlements(
  roleValue:
    | string
    | null
    | undefined,

  rows:
    NovaSubscriptionAccessRow[],

  simulation:
    SimulationLearningAccess = {},
): LearningEntitlements {

  /*
   * Simulation access is deliberately resolved before
   * learner subscriptions.
   *
   * No synthetic subscription row is created or required.
   */
  if (
    simulation
      .isSimulationUser
  ) {
    const tier =
      simulation.accessTier ??
      "complete";

    const complete =
      tier === "complete";

    const core =
      complete ||
      tier === "core";

    return {
      core,

      science:
        complete,

      businessBuilder:
        complete,

      rewards:
        core,

      anyPaidAccess:
        false,

      activePlans:
        complete
          ? ["complete"]
          : tier === "core"
            ? ["core"]
            : [],

      isLegacyStudent:
        false,

      isSimulationAccess:
        true,

      simulationAccessTier:
        tier,
    };
  }


  /*
   * Dreamscape staff retain their existing access.
   */
  if (
    roleHasStaffLearningAccess(
      roleValue,
    )
  ) {
    return {
      core: true,
      science: true,
      businessBuilder: true,
      rewards: true,

      anyPaidAccess: true,

      activePlans: [
        "complete",
      ],

      isLegacyStudent:
        false,

      isSimulationAccess:
        false,

      simulationAccessTier:
        null,
    };
  }


  const now =
    Date.now();

  const activePlans =
    Array.from(
      new Set(
        rows
          .filter(
            (row) =>
              isActiveSubscription(
                row,
                now,
              ),
          )
          .map(
            (row) =>
              normalisePlanCode(
                row.plan_code,
              ),
          )
          .filter(
            (
              plan,
            ): plan is
              LearningPlanCode =>
              plan !== null,
          ),
      ),
    ) as LearningPlanCode[];


  const hasComplete =
    activePlans.includes(
      "complete",
    );

  const hasCore =
    activePlans.includes(
      "core",
    );

  const hasScience =
    activePlans.includes(
      "science",
    );


  return {
    core:
      hasComplete ||
      hasCore,

    science:
      hasComplete ||
      hasScience,

    businessBuilder:
      hasComplete,

    rewards:
      hasComplete ||
      hasCore ||
      hasScience,

    anyPaidAccess:
      hasComplete ||
      hasCore ||
      hasScience,

    activePlans,

    isLegacyStudent:
      false,

    isSimulationAccess:
      false,

    simulationAccessTier:
      null,
  };
}

export function learningPlanLabel(
  plan:
    LearningPlanCode,
) {
  switch (plan) {
    case "science":
      return "Science Student Access";

    case "core":
      return "Core Student Access";

    case "complete":
      return "Complete Student Access";
  }
}
