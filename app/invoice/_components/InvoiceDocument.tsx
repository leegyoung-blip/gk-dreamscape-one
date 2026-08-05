import PrintInvoiceButton from "./PrintInvoiceButton";
import PayNowPaymentPanel from "./PayNowPaymentPanel";
import type {
  InvoiceDocumentData,
  InvoiceDocumentItem,
} from "../_lib/invoiceTypes";
import {
  invoiceCurrency,
  invoiceDate,
  invoiceMonth,
  invoiceShortDate,
  paymentProviderLabel,
  publicStatusLabel,
} from "../_lib/invoiceFormat";

export default function InvoiceDocument({
  data,
}: {
  data: InvoiceDocumentData;
}) {
  const { invoice, settings, account, items, payments, public_status } = data;
  const documentTitle = settings.is_gst_registered
    ? "Tax Invoice"
    : "Invoice";
  const isPreview = data.is_admin_preview;
  const displayStatus = isPreview ? invoice.status : public_status;
  const statusTone = statusClasses(displayStatus);
  const isPaid = public_status === "paid";

  return (
    <div className="invoice-page min-h-screen bg-[#efe9de] px-3 py-5 text-[#17233a] sm:px-6 sm:py-8">
      <style>{PRINT_STYLES}</style>

      <div className="invoice-toolbar mx-auto mb-4 flex max-w-[1000px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7cdbb] bg-white px-4 py-3 shadow-sm">
        <div>
          <strong className="block text-sm">{settings.business_name}</strong>
          <span className="text-xs text-[#756e62]">
            {isPreview
              ? "Staff preview — this is not the secure parent URL"
              : "Secure invoice document"}
          </span>
        </div>
        <PrintInvoiceButton />
      </div>

      <article className="invoice-sheet relative mx-auto max-w-[1000px] overflow-hidden rounded-[1.75rem] border border-[#d7cdbb] bg-white shadow-[0_28px_90px_rgba(21,35,59,0.12)]">
        {isPreview && (
          <div className="absolute right-[-62px] top-[36px] z-10 rotate-45 bg-[#9b7029] px-16 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow">
            Staff Preview
          </div>
        )}

        <header className="border-b border-[#e6dfd3] bg-[#15233b] px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
            <div>
              <div className="inline-flex h-14 min-w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] px-4 text-lg font-black text-[#e8c474]">
                GKP
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                {settings.business_name}
              </h1>
              <p className="mt-3 max-w-md whitespace-pre-line text-sm leading-6 text-white/65">
                {settings.business_address}
              </p>
              {settings.is_gst_registered && settings.gst_registration_number && (
                <p className="mt-2 text-xs font-bold text-white/65">
                  GST Registration No.: {settings.gst_registration_number}
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e8c474]">
                {documentTitle}
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {invoice.invoice_number}
              </p>
              <span
                className={`mt-4 inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.1em] ${statusTone}`}
              >
                {publicStatusLabel(displayStatus)}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-[#e9e3d9] px-6 py-7 sm:grid-cols-2 sm:px-9">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9b7029]">
              Bill to
            </p>
            <h2 className="mt-3 text-xl font-semibold">{account.payer_name}</h2>
            <div className="mt-3 space-y-1 text-sm leading-6 text-[#6f685c]">
              <p>{account.billing_email}</p>
              {account.phone && <p>{account.phone}</p>}
              {account.address && (
                <p className="whitespace-pre-line">{account.address}</p>
              )}
              <p className="pt-1 text-xs font-bold text-[#8d8477]">
                Account: {account.account_code}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-2xl bg-[#f8f5ef] p-5 text-sm">
            <InvoiceMeta label="Invoice date" value={invoiceDate(invoice.invoice_date)} />
            <InvoiceMeta label="Due date" value={invoiceDate(invoice.due_date)} />
            <InvoiceMeta
              label="Billing period"
              value={invoiceMonth(invoice.billing_period)}
            />
            <InvoiceMeta label="Currency" value={invoice.currency} />
          </dl>
        </section>

        <section className="px-4 py-6 sm:px-9 sm:py-8">
          <div className="overflow-x-auto rounded-2xl border border-[#e1d9cc]">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f7f3ec] text-[10px] font-black uppercase tracking-[0.13em] text-[#827a6f]">
                  <th className="px-5 py-4">Description</th>
                  <th className="px-3 py-4 text-right">Quantity</th>
                  <th className="px-3 py-4 text-right">Rate</th>
                  <th className="px-3 py-4 text-right">Discount</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <InvoiceItemRow
                    key={item.id}
                    item={item}
                    currency={invoice.currency}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-[#e1d9cc] bg-[#fbfaf7] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7029]">
                  Payment terms
                </p>
                <p className="mt-3 text-sm leading-6 text-[#686155]">
                  {settings.payment_terms}
                </p>
              </section>

              {!isPaid && !isPreview && (
                <PayNowPaymentPanel
                  publicToken={invoice.public_token}
                  invoiceNumber={invoice.invoice_number}
                  balanceDue={invoice.balance_due}
                  currency={invoice.currency}
                />
              )}

              {!isPaid && isPreview && (
                <section className="rounded-2xl border border-[#d9c49a] bg-[#fff9eb] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94671f]">
                    PayNow parent view
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#6e5a38]">
                    The live parent invoice will show a button to generate an
                    exact-amount PayNow QR. Staff preview does not create a real
                    payment request.
                  </p>
                </section>
              )}

              {payments.length > 0 && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Payments received
                  </p>
                  <div className="mt-3 space-y-3">
                    {payments.map((payment, index) => (
                      <div
                        key={`${payment.provider_reference || payment.provider}-${index}`}
                        className="flex flex-wrap justify-between gap-3 text-sm text-emerald-900"
                      >
                        <span>
                          {paymentProviderLabel(payment.provider)}
                          {payment.payment_method
                            ? ` · ${payment.payment_method}`
                            : ""}
                          {payment.paid_at
                            ? ` · ${invoiceDate(payment.paid_at)}`
                            : ""}
                        </span>
                        <strong>
                          {invoiceCurrency(payment.amount, payment.currency)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <section className="rounded-2xl bg-[#15233b] p-5 text-white">
              <SummaryLine
                label="Gross fees"
                value={invoiceCurrency(invoice.subtotal, invoice.currency)}
              />
              {invoice.discount_total > 0 && (
                <SummaryLine
                  label="Discounts"
                  value={`−${invoiceCurrency(invoice.discount_total, invoice.currency)}`}
                />
              )}
              {invoice.credit_total > 0 && (
                <SummaryLine
                  label="Credits"
                  value={`−${invoiceCurrency(invoice.credit_total, invoice.currency)}`}
                />
              )}
              {invoice.tax_total > 0 && (
                <SummaryLine
                  label="GST"
                  value={invoiceCurrency(invoice.tax_total, invoice.currency)}
                />
              )}
              <SummaryLine
                label="Invoice total"
                value={invoiceCurrency(invoice.total_amount, invoice.currency)}
              />
              {invoice.amount_paid > 0 && (
                <SummaryLine
                  label="Amount paid"
                  value={`−${invoiceCurrency(invoice.amount_paid, invoice.currency)}`}
                />
              )}

              <div className="mt-4 border-t border-white/15 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                  {isPaid ? "Balance" : "Balance due"}
                </p>
                <strong className="mt-2 block text-3xl text-[#f0cf87]">
                  {invoiceCurrency(invoice.balance_due, invoice.currency)}
                </strong>
              </div>
            </section>
          </div>
        </section>

        <footer className="border-t border-[#e9e3d9] bg-[#fbfaf7] px-6 py-6 text-center sm:px-9">
          <p className="text-sm font-semibold text-[#3f4858]">
            {settings.footer_note}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#8a8378]">
            Billing enquiries: {settings.support_email || settings.billing_email}
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[#aaa296]">
            Securely generated invoice · {invoice.invoice_number}
          </p>
        </footer>
      </article>
    </div>
  );
}

function InvoiceItemRow({
  item,
  currency,
}: {
  item: InvoiceDocumentItem;
  currency: string;
}) {
  const hasLessonDates = item.lesson_dates.length > 0;

  return (
    <tr className="border-t border-[#ece6dc] align-top first:border-t-0">
      <td className="px-5 py-5">
        <strong className="block text-sm text-[#17233a]">
          {item.description}
        </strong>
        {item.discount_description && item.discount_amount > 0 && (
          <span className="mt-1 block text-xs font-semibold text-[#9a6c22]">
            {item.discount_description}
            {item.discount_basis_lessons
              ? ` · applied to ${item.discount_basis_lessons} lessons`
              : ""}
          </span>
        )}
        {hasLessonDates && (
          <details open className="invoice-lessons mt-3">
            <summary className="cursor-pointer text-xs font-bold text-[#675e50]">
              {item.lesson_dates.length} billed lesson date
              {item.lesson_dates.length === 1 ? "" : "s"}
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.lesson_dates.map((date) => (
                <span
                  key={date}
                  className="rounded-full border border-[#ded5c5] bg-[#faf8f3] px-2.5 py-1 text-[10px] font-semibold text-[#756e62]"
                >
                  {invoiceShortDate(date)}
                </span>
              ))}
            </div>
          </details>
        )}
      </td>
      <td className="px-3 py-5 text-right text-sm font-semibold">
        {item.quantity}
      </td>
      <td className="px-3 py-5 text-right text-sm">
        {invoiceCurrency(item.unit_amount, currency)}
      </td>
      <td className="px-3 py-5 text-right text-sm">
        {item.discount_amount > 0
          ? `−${invoiceCurrency(item.discount_amount, currency)}`
          : "—"}
      </td>
      <td className="px-5 py-5 text-right text-sm font-black text-[#805d25]">
        {invoiceCurrency(item.line_total, currency)}
      </td>
    </tr>
  );
}

function InvoiceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] font-black uppercase tracking-[0.13em] text-[#91887b]">
        {label}
      </dt>
      <dd className="mt-1.5 font-bold text-[#17233a]">{value}</dd>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 text-sm last:mb-0">
      <span className="text-white/65">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function statusClasses(status: string) {
  if (status === "paid") {
    return "border-emerald-300/40 bg-emerald-400/15 text-emerald-200";
  }
  if (status === "partially_paid") {
    return "border-sky-300/40 bg-sky-400/15 text-sky-200";
  }
  if (status === "overdue") {
    return "border-red-300/40 bg-red-400/15 text-red-200";
  }
  if (status === "draft" || status === "review") {
    return "border-violet-300/40 bg-violet-400/15 text-violet-200";
  }
  return "border-amber-300/40 bg-amber-400/15 text-amber-200";
}

const PRINT_STYLES = `
  @page {
    size: A4;
    margin: 10mm;
  }

  @media print {
    html, body {
      background: white !important;
    }

    .invoice-page {
      min-height: auto !important;
      background: white !important;
      padding: 0 !important;
    }

    .invoice-toolbar,
    .payment-live-panel {
      display: none !important;
    }

    .invoice-sheet {
      max-width: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    .invoice-lessons summary {
      list-style: none;
    }

    .invoice-lessons summary::-webkit-details-marker {
      display: none;
    }

    * {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
  }
`;
