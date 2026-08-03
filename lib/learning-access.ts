export type LearningPlanCode =
  | "science"
  | "core"
  | "complete";

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

const STAFF_LEARNING_ROLES = new Set([
  "admin",
  "teacher",
  "curriculum-lead",

  /*
   * This additional spelling protects against a database
   * value accidentally saved without a separator.
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
  const role = normaliseRole(value);

  return STAFF_LEARNING_ROLES.has(role);
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
   * A subscription without an access-until date remains active
   * until its status is changed.
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
): LearningPlanCode {
  const plan = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

  if (plan === "science") {
    return "science";
  }

  if (plan === "core") {
    return "core";
  }

  /*
   * Existing and unknown paid plans are treated as Complete
   * so older paid learners are not accidentally locked out.
   */
  return "complete";
}

export function getLearningEntitlements(
  roleValue: string | null | undefined,
  rows: NovaSubscriptionAccessRow[],
): LearningEntitlements {
  /*
   * Staff roles bypass subscription requirements.
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
        ),
    ),
  ) as LearningPlanCode[];

  /*
   * Backwards compatibility:
   *
   * Before plan-based subscriptions were introduced,
   * the student role itself granted complete access.
   *
   * A student with no subscription records is therefore
   * treated as a legacy full-access student.
   *
   * Once at least one subscription record exists,
   * active access is controlled by its status and expiry.
   */
  const isLegacyStudent =
    normaliseRole(roleValue) === "student" &&
    rows.length === 0;

  const hasComplete =
    activePlans.includes("complete") ||
    isLegacyStudent;

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
    activePlans: isLegacyStudent
      ? ["complete"]
      : activePlans,
    isLegacyStudent,
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