import type {
  BillingFrequency,
  EnrolmentStatus,
  InvoiceStatus,
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

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T12:00:00+08:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "Time not set";

  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText || 0);

  if (!Number.isFinite(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
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

export function nextSingaporeMonth() {
  const today = singaporeToday();
  const date = new Date(`${today}T12:00:00+08:00`);
  date.setUTCMonth(date.getUTCMonth() + 1);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export function monthStart(monthValue: string) {
  return `${monthValue}-01`;
}

export function monthEnd(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

export function monthLabel(monthValue: string) {
  const date = new Date(`${monthValue}-01T12:00:00+08:00`);

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    month: "long",
    year: "numeric",
  }).format(date);
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

export function invoiceStatusLabel(value: InvoiceStatus) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function weekdayLabel(value: number | null | undefined) {
  if (!value) return "Weekday not set";

  return {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  }[value] || "Weekday not set";
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
