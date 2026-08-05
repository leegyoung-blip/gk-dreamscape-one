import type {
  BillingFrequency,
  EnrolmentStatus,
} from "./billingTypes";

export function numberValue(
  value: number | string | null | undefined,
) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(
  amount: number,
  currency = "SGD",
) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T12:00:00+08:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function singaporeToday() {
  const parts = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function billingFrequencyLabel(
  value: BillingFrequency,
) {
  return {
    monthly: "Monthly",
    termly: "Termly",
    one_off: "One-off",
    per_lesson: "Per lesson",
  }[value];
}

export function enrolmentStatusLabel(
  value: EnrolmentStatus,
) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normaliseOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function errorMessage(
  error: unknown,
  fallback = "Something went wrong.",
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}
