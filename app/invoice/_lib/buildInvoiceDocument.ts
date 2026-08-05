import type { InvoiceDocumentData } from "./invoiceTypes";
import {
  invoiceNumberValue,
  publicInvoiceStatus,
} from "./invoiceFormat";

type Row = Record<string, unknown>;

type BuildInvoiceDocumentInput = {
  invoice: Row;
  settings: Row;
  account: Row;
  items: Row[];
  students: Row[];
  payments: Row[];
  isAdminPreview: boolean;
};

function optionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

export function buildInvoiceDocument({
  invoice,
  settings,
  account,
  items,
  students,
  payments,
  isAdminPreview,
}: BuildInvoiceDocumentInput): InvoiceDocumentData {
  const studentMap = new Map(
    students.map((student) => [String(student.id), String(student.full_name)]),
  );

  const balanceDue = invoiceNumberValue(invoice.balance_due);
  const status = String(invoice.status || "draft");
  const dueDate = String(invoice.due_date || "");

  return {
    invoice: {
      id: String(invoice.id),
      invoice_number: String(invoice.invoice_number),
      invoice_kind: String(invoice.invoice_kind || "monthly"),
      billing_period: optionalString(invoice.billing_period),
      invoice_date: String(invoice.invoice_date),
      due_date: dueDate,
      currency: String(invoice.currency || settings.currency || "SGD"),
      status: status as InvoiceDocumentData["invoice"]["status"],
      subtotal: invoiceNumberValue(invoice.subtotal),
      discount_total: invoiceNumberValue(invoice.discount_total),
      credit_total: invoiceNumberValue(invoice.credit_total),
      tax_total: invoiceNumberValue(invoice.tax_total),
      total_amount: invoiceNumberValue(invoice.total_amount),
      amount_paid: invoiceNumberValue(invoice.amount_paid),
      balance_due: balanceDue,
      issued_at: optionalString(invoice.issued_at),
      paid_at: optionalString(invoice.paid_at),
      public_token: String(invoice.public_token || ""),
      public_link_enabled: Boolean(invoice.public_link_enabled),
    },
    settings: {
      business_name: String(settings.business_name || "Guru Kids Pro"),
      business_address: String(settings.business_address || ""),
      billing_email: String(settings.billing_email || ""),
      support_email: String(settings.support_email || settings.billing_email || ""),
      currency: String(settings.currency || "SGD"),
      timezone: String(settings.timezone || "Asia/Singapore"),
      is_gst_registered: Boolean(settings.is_gst_registered),
      gst_registration_number: optionalString(
        settings.gst_registration_number,
      ),
      payment_terms: String(settings.payment_terms || ""),
      footer_note: String(settings.footer_note || ""),
    },
    account: {
      account_code: String(account.account_code || ""),
      payer_name: String(account.payer_name || ""),
      billing_email: String(account.billing_email || ""),
      phone: optionalString(account.phone),
      alternate_email: optionalString(account.alternate_email),
      address: optionalString(account.address),
    },
    items: items.map((item) => {
      const metadata =
        item.metadata && typeof item.metadata === "object"
          ? (item.metadata as Row)
          : {};
      const studentId = optionalString(item.student_id);

      return {
        id: String(item.id),
        item_type: String(item.item_type || "other"),
        description: String(item.description || "Invoice item"),
        student_name: studentId ? studentMap.get(studentId) || null : null,
        quantity: invoiceNumberValue(item.quantity),
        unit_amount: invoiceNumberValue(item.unit_amount),
        discount_amount: invoiceNumberValue(item.discount_amount),
        line_total: invoiceNumberValue(item.line_total),
        lesson_dates: stringArray(metadata.lesson_dates),
        billing_frequency: optionalString(metadata.billing_frequency),
        discount_description: optionalString(metadata.discount_description),
        discount_basis_lessons:
          metadata.discount_basis_lessons === null ||
          metadata.discount_basis_lessons === undefined
            ? null
            : invoiceNumberValue(metadata.discount_basis_lessons),
        discount_per_lesson:
          metadata.discount_per_lesson === null ||
          metadata.discount_per_lesson === undefined
            ? null
            : invoiceNumberValue(metadata.discount_per_lesson),
      };
    }),
    payments: payments.map((payment) => ({
      provider: String(payment.provider || "manual"),
      provider_reference: optionalString(payment.provider_reference),
      payment_method: optionalString(payment.payment_method),
      amount: invoiceNumberValue(payment.amount),
      currency: String(payment.currency || invoice.currency || "SGD"),
      paid_at: optionalString(payment.paid_at),
    })),
    public_status: publicInvoiceStatus(status, dueDate, balanceDue),
    is_admin_preview: isAdminPreview,
  };
}
