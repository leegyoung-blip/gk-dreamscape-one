export function invoiceNumberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function invoiceCurrency(
  amount: number,
  currency = "SGD",
) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function invoiceDate(value: string | null | undefined) {
  if (!value) return "—";

  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T12:00:00+08:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function invoiceShortDate(value: string | null | undefined) {
  if (!value) return "—";

  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T12:00:00+08:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function invoiceMonth(value: string | null | undefined) {
  if (!value) return "—";

  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T12:00:00+08:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function singaporeDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function publicInvoiceStatus(
  status: string,
  dueDate: string,
  balanceDue: number,
) {
  if (status === "paid" || balanceDue <= 0) return "paid" as const;
  if (status === "partially_paid") return "partially_paid" as const;
  if (status === "overdue" || dueDate < singaporeDateKey()) {
    return "overdue" as const;
  }
  return "issued" as const;
}

export function publicStatusLabel(status: string) {
  return {
    issued: "Amount Due",
    partially_paid: "Partially Paid",
    paid: "Paid",
    overdue: "Overdue",
    draft: "Draft Preview",
    review: "Review Preview",
    void: "Void",
  }[status] || status;
}

export function paymentProviderLabel(provider: string) {
  return {
    hitpay: "HitPay",
    manual: "Manual payment",
    shopify: "Shopify",
    other: "Other",
  }[provider] || provider;
}
