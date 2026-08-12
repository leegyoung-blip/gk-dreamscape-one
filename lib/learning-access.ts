export type LearningPlanCode =
  | "science"
  | "core"
  | "complete";

export type NovaSubscriptionAccessRow = {
  status: string | null;
  access_until: string | null;
  access_started_at?: string | null;
  plan_code?: string | null;
};

export type LearningEntitlements = {
  core: boolean;
  science: boolean;
  businessBuilder: boolean;
  rewards: boolean;
  anyPaidAccess: boolean;
  activePlans: LearningPlanCode[];
  isLegacyStudent: boolean;
};

const STAFF_LEARNING_ROLES = new Set([
  "admin",
  "teacher",
  "curriculum-lead",

  /*
   * Extra protection in case a database value is
   * accidentally stored without a separator.
   */
  "curriculumlead",
]);

export function normaliseRole(
  value: string | null | undefined,
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function roleHasStaffLearningAccess(
  value: string | null | undefined,
) {
  return STAFF_LEARNING_ROLES.has(
    normaliseRole(value),
  );
}

export function isActiveSubscription(
  row: NovaSubscriptionAccessRow,
  now = Date.now(),
) {
  const status = String(row.status || "")
    .trim()
    .toLowerCase();

  if (status !== "active") {
    return false;
  }

  /*
   * Access must not begin before access_started_at.
   *
   * Public Dreamscape subscriptions already store their
   * paid-period start here, so public access follows the
   * paid subscription period.
   *
   * GKP add-ons store the staff-selected starts_on date
   * here, so a future-dated add-on cannot unlock early.
   */
  if (row.access_started_at) {
    const accessStartedAt =
      new Date(row.access_started_at).getTime();

    if (
      !Number.isFinite(accessStartedAt) ||
      accessStartedAt > now
    ) {
      return false;
    }
  }

  /*
   * An active subscription without an access-until date
   * remains active until its status changes.
   *
   * This is the normal model for active GKP add-ons.
   */
  if (!row.access_until) {
    return true;
  }

  const accessUntil =
    new Date(row.access_until).getTime();

  return (
    Number.isFinite(accessUntil) &&
    accessUntil >= now
  );
}

function normalisePlanCode(
  value: string | null | undefined,
): LearningPlanCode | null {
  const plan = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (plan === "science") {
    return "science";
  }

  if (plan === "core") {
    return "core";
  }

  if (plan === "complete") {
    return "complete";
  }

  /*
   * Unknown or blank paid plan codes do NOT silently
   * become Complete access.
   *
   * This keeps learner access controlled by the actual
   * Core / Science / Complete tier.
   */
  return null;
}

export function getLearningEntitlements(
  roleValue: string | null | undefined,
  rows: NovaSubscriptionAccessRow[],
): LearningEntitlements {
  /*
   * Dreamscape staff do not depend on learner plans.
   */
  if (roleHasStaffLearningAccess(roleValue)) {
    return {
      core: true,
      science: true,
      businessBuilder: true,
      rewards: true,
      anyPaidAccess: true,
      activePlans: ["complete"],
      isLegacyStudent: false,
    };
  }

  const now = Date.now();

  const activePlans = Array.from(
    new Set(
      rows
        .filter((row) =>
          isActiveSubscription(row, now),
        )
        .map((row) =>
          normalisePlanCode(row.plan_code),
        )
        .filter(
          (
            plan,
          ): plan is LearningPlanCode =>
            plan !== null,
        ),
    ),
  ) as LearningPlanCode[];

  const hasComplete =
    activePlans.includes("complete");

  const hasCore =
    activePlans.includes("core");

  const hasScience =
    activePlans.includes("science");

  return {
    core: hasComplete || hasCore,
    science: hasComplete || hasScience,
    businessBuilder: hasComplete,
    rewards:
      hasComplete ||
      hasCore ||
      hasScience,
    anyPaidAccess:
      hasComplete ||
      hasCore ||
      hasScience,
    activePlans,

    /*
     * Retained in the return type so existing UI does not
     * break, but the student role alone no longer grants
     * Complete access.
     */
    isLegacyStudent: false,
  };
}

export function learningPlanLabel(
  plan: LearningPlanCode,
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
