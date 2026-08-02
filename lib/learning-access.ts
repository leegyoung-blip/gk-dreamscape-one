export type LearningPlanCode = "science" | "core" | "complete";

export type NovaSubscriptionAccessRow = {
  status: string | null;
  access_until: string | null;
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

export function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

export function roleHasStaffLearningAccess(
  value: string | null | undefined,
) {
  const role = normaliseRole(value);

  return (
    role === "admin" ||
    role === "teacher" ||
    role === "curriculum-lead"
  );
}

export function isActiveSubscription(
  row: NovaSubscriptionAccessRow,
  now = Date.now(),
) {
  if (String(row.status || "").trim().toLowerCase() !== "active") {
    return false;
  }

  if (!row.access_until) {
    return true;
  }

  const accessUntil = new Date(row.access_until).getTime();
  return Number.isFinite(accessUntil) && accessUntil >= now;
}

function normalisePlanCode(
  value: string | null | undefined,
): LearningPlanCode {
  const plan = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (plan === "science") return "science";
  if (plan === "core") return "core";

  // Existing subscriptions created before plan-specific access are
  // treated as Complete so current paid learners are not locked out.
  return "complete";
}

export function getLearningEntitlements(
  roleValue: string | null | undefined,
  rows: NovaSubscriptionAccessRow[],
): LearningEntitlements {
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
        .filter((row) => isActiveSubscription(row, now))
        .map((row) => normalisePlanCode(row.plan_code)),
    ),
  ) as LearningPlanCode[];

  /*
   * Backwards compatibility:
   * Before plan-based subscriptions, "student" itself granted full access.
   * A student with no subscription history is therefore treated as a
   * legacy full-access student. Once a Shopify/nova_subscriptions record
   * exists, active access is controlled only by that record and expiry.
   */
  const isLegacyStudent =
    normaliseRole(roleValue) === "student" && rows.length === 0;

  const hasComplete = activePlans.includes("complete") || isLegacyStudent;
  const hasCore = activePlans.includes("core");
  const hasScience = activePlans.includes("science");

  return {
    core: hasComplete || hasCore,
    science: hasComplete || hasScience,
    businessBuilder: hasComplete,
    rewards: hasComplete || hasCore || hasScience,
    anyPaidAccess: hasComplete || hasCore || hasScience,
    activePlans: isLegacyStudent ? ["complete"] : activePlans,
    isLegacyStudent,
  };
}

export function learningPlanLabel(plan: LearningPlanCode) {
  switch (plan) {
    case "science":
      return "Science Student Access";
    case "core":
      return "Core Student Access";
    case "complete":
      return "Complete Student Access";
  }
}
