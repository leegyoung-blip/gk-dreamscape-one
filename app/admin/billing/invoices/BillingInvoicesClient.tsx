"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "../_components/BillingAdminShell";
import BillingModal from "../_components/BillingModal";
import type {
  BillingEmailLog,
  BillingInvoiceBatch,
  BillingInvoiceItem,
  BillingInvoiceOverview,
  InvoiceItemType,
  LessonOccurrenceOverview,
  NonTeachingDate,
} from "../_lib/billingTypes";
import {
  errorMessage,
  formatCurrency,
  formatDate,
  formatShortDate,
  formatTime,
  invoiceStatusLabel,
  monthEnd,
  monthLabel,
  monthStart,
  nextSingaporeMonth,
  normaliseOptionalText,
  numberValue,
} from "../_lib/billingUtils";

type Phase4Status = {
  invoice_batches: number | null;
  lesson_occurrences: number | null;
  non_teaching_dates: number | null;
  active_enrolments_missing_weekday: number | null;
  recurring_discount_basis_lessons: number | null;
};

type BatchGenerationResult = {
  batch_id: string;
  billing_period: string;
  invoice_count: number;
  item_count: number;
  skipped_account_count: number;
  billable_lesson_count: number;
  missing_schedule_count: number;
};

type ItemForm = {
  description: string;
  quantity: string;
  unit_amount: string;
  discount_amount: string;
};

type ManualItemPresetId =
  | "custom"
  | "refundable_class_slot_deposit"
  | "registration_fee"
  | "registration_fee_waiver";

type ManualItemForm = {
  preset_id: ManualItemPresetId;
  item_kind: "charge" | "discount" | "credit";
  description: string;
  amount: string;
};

type ClosureForm = {
  closure_date: string;
  description: string;
};

type ExtraLessonForm = {
  enrolment_id: string;
  lesson_date: string;
  start_time: string;
  notes: string;
};

const DEFAULT_ITEM_FORM: ItemForm = {
  description: "",
  quantity: "1",
  unit_amount: "0",
  discount_amount: "0",
};

const MANUAL_ITEM_PRESETS: Record<
  Exclude<ManualItemPresetId, "custom">,
  {
    label: string;
    item_kind: ManualItemForm["item_kind"];
    description: string;
    amount: string;
  }
> = {
  refundable_class_slot_deposit: {
    label: "Refundable Class-Slot Deposit — $200",
    item_kind: "charge",
    description:
      "Refundable Class-Slot Deposit — refundable with at least four classes' advance cancellation notice",
    amount: "200",
  },
  registration_fee: {
    label: "One-Time Registration Fee — $50",
    item_kind: "charge",
    description: "One-Time Registration Fee",
    amount: "50",
  },
  registration_fee_waiver: {
    label: "Promotional Registration Fee Waiver — -$50",
    item_kind: "discount",
    description: "Promotional Registration Fee Waiver",
    amount: "50",
  },
};

const DEFAULT_MANUAL_ITEM_FORM: ManualItemForm = {
  preset_id: "custom",
  item_kind: "charge",
  description: "",
  amount: "0",
};

const DEFAULT_CLOSURE_FORM: ClosureForm = {
  closure_date: "",
  description: "Centre closed",
};

const DEFAULT_EXTRA_LESSON_FORM: ExtraLessonForm = {
  enrolment_id: "",
  lesson_date: "",
  start_time: "",
  notes: "Replacement lesson",
};

export default function BillingInvoicesClient() {
  const [billingMonth, setBillingMonth] = useState(nextSingaporeMonth());
  const [invoices, setInvoices] = useState<BillingInvoiceOverview[]>([]);
  const [batch, setBatch] = useState<BillingInvoiceBatch | null>(null);
  const [closures, setClosures] = useState<NonTeachingDate[]>([]);
  const [lessonSchedule, setLessonSchedule] = useState<
    LessonOccurrenceOverview[]
  >([]);
  const [phaseStatus, setPhaseStatus] = useState<Phase4Status>({
    invoice_batches: 0,
    lesson_occurrences: 0,
    non_teaching_dates: 0,
    active_enrolments_missing_weekday: 0,
    recurring_discount_basis_lessons: 4,
  });

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [invoiceItems, setInvoiceItems] = useState<BillingInvoiceItem[]>([]);
  const [emailHistory, setEmailHistory] = useState<BillingEmailLog[]>([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [showVoidedInvoices, setShowVoidedInvoices] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureForm, setClosureForm] =
    useState<ClosureForm>(DEFAULT_CLOSURE_FORM);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [extraLessonModalOpen, setExtraLessonModalOpen] = useState(false);
  const [extraLessonForm, setExtraLessonForm] =
    useState<ExtraLessonForm>(DEFAULT_EXTRA_LESSON_FORM);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState("");
  const [itemForm, setItemForm] = useState<ItemForm>(DEFAULT_ITEM_FORM);

  const [manualItemModalOpen, setManualItemModalOpen] = useState(false);
  const [manualItemForm, setManualItemForm] =
    useState<ManualItemForm>(DEFAULT_MANUAL_ITEM_FORM);
  const [formError, setFormError] = useState("");

  const periodStart = monthStart(billingMonth);
  const periodEnd = monthEnd(billingMonth);

  const loadInvoiceItems = useCallback(async (invoiceId: string) => {
    if (!invoiceId) {
      setInvoiceItems([]);
      return;
    }

    setItemsLoading(true);

    const { data, error } = await supabase
      .from("gkp_billing_invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setLoadError(error.message);
      setInvoiceItems([]);
    } else {
      setInvoiceItems((data || []) as BillingInvoiceItem[]);
    }

    setItemsLoading(false);
  }, []);

  const loadEmailHistory = useCallback(async (invoiceId: string) => {
    if (!invoiceId) {
      setEmailHistory([]);
      return;
    }

    setEmailHistoryLoading(true);

    const { data, error } = await supabase
      .from("gkp_billing_email_logs")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setLoadError(error.message);
      setEmailHistory([]);
    } else {
      setEmailHistory((data || []) as BillingEmailLog[]);
    }

    setEmailHistoryLoading(false);
  }, []);

  const loadMonth = useCallback(
    async (preferredInvoiceId?: string) => {
      setLoading(true);
      setLoadError("");

      const [
        invoiceResult,
        batchResult,
        closureResult,
        scheduleResult,
        statusResult,
      ] = await Promise.all([
        supabase
          .from("gkp_billing_invoice_admin_overview")
          .select("*")
          .eq("billing_period", periodStart)
          .order("payer_name", { ascending: true }),
        supabase
          .from("gkp_billing_invoice_batches")
          .select("*")
          .eq("billing_period", periodStart)
          .maybeSingle(),
        supabase
          .from("gkp_billing_non_teaching_dates")
          .select("*")
          .gte("closure_date", periodStart)
          .lte("closure_date", periodEnd)
          .order("closure_date", { ascending: true }),
        supabase
          .from("gkp_billing_lesson_schedule_overview")
          .select("*")
          .gte("lesson_date", periodStart)
          .lte("lesson_date", periodEnd)
          .order("lesson_date", { ascending: true })
          .order("student_name", { ascending: true }),
        supabase
          .from("gkp_billing_phase4_status")
          .select("*")
          .maybeSingle(),
      ]);

      const firstError =
        invoiceResult.error ||
        batchResult.error ||
        closureResult.error ||
        scheduleResult.error ||
        statusResult.error;

      if (firstError) {
        setLoadError(firstError.message);
        setLoading(false);
        return;
      }

      const loadedInvoices =
        (invoiceResult.data || []) as BillingInvoiceOverview[];

      setInvoices(loadedInvoices);
      setBatch((batchResult.data as BillingInvoiceBatch | null) || null);
      setClosures((closureResult.data || []) as NonTeachingDate[]);
      setLessonSchedule(
        (scheduleResult.data || []) as LessonOccurrenceOverview[],
      );
      setPhaseStatus(
        (statusResult.data as Phase4Status | null) || phaseStatus,
      );

      const candidate =
        preferredInvoiceId ||
        selectedInvoiceId ||
        loadedInvoices[0]?.id ||
        "";
      const nextSelected = loadedInvoices.some(
        (invoice) => invoice.id === candidate,
      )
        ? candidate
        : loadedInvoices[0]?.id || "";

      setSelectedInvoiceId(nextSelected);
      await Promise.all([
        loadInvoiceItems(nextSelected),
        loadEmailHistory(nextSelected),
      ]);
      setLoading(false);
    },
    [
      loadEmailHistory,
      loadInvoiceItems,
      periodEnd,
      periodStart,
      phaseStatus,
      selectedInvoiceId,
    ],
  );

  useEffect(() => {
    void loadMonth();
    // loadMonth intentionally refreshes whenever the selected billing month changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingMonth]);

  useEffect(() => {
    void loadInvoiceItems(selectedInvoiceId);
    void loadEmailHistory(selectedInvoiceId);
  }, [loadEmailHistory, loadInvoiceItems, selectedInvoiceId]);

  const selectedInvoice = useMemo(
    () =>
      invoices.find((invoice) => invoice.id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId],
  );

  const visibleInvoices = useMemo(
    () =>
      showVoidedInvoices
        ? invoices
        : invoices.filter((invoice) => invoice.status !== "void"),
    [invoices, showVoidedInvoices],
  );

  const voidedInvoiceCount = useMemo(
    () => invoices.filter((invoice) => invoice.status === "void").length,
    [invoices],
  );

  useEffect(() => {
    if (
      !showVoidedInvoices &&
      selectedInvoice?.status === "void"
    ) {
      setSelectedInvoiceId(
        invoices.find((invoice) => invoice.status !== "void")?.id || "",
      );
    }
  }, [invoices, selectedInvoice, showVoidedInvoices]);

  const totals = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status !== "void")
        .reduce(
          (current, invoice) => ({
            subtotal: current.subtotal + numberValue(invoice.subtotal),
            discount:
              current.discount + numberValue(invoice.discount_total),
            credit: current.credit + numberValue(invoice.credit_total),
            total: current.total + numberValue(invoice.total_amount),
          }),
          { subtotal: 0, discount: 0, credit: 0, total: 0 },
        ),
    [invoices],
  );

  const editableInvoice =
    selectedInvoice?.status === "draft" ||
    selectedInvoice?.status === "review";

  const uniqueScheduleOptions = useMemo(() => {
    const seen = new Set<string>();

    return lessonSchedule.filter((lesson) => {
      if (seen.has(lesson.enrolment_id)) return false;
      seen.add(lesson.enrolment_id);
      return true;
    });
  }, [lessonSchedule]);

  async function syncLessonDates() {
    setWorking(true);
    setLoadError("");
    setNotice("");

    const { data, error } = await supabase.rpc(
      "gkp_sync_lesson_occurrences",
      { p_billing_period: periodStart },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      const result = Array.isArray(data) ? data[0] : data;
      setNotice(
        `Lesson dates refreshed: ${Number(result?.billable_count || 0)} billable and ${Number(result?.cancelled_count || 0)} cancelled.`,
      );
      await loadMonth(selectedInvoiceId);
    }

    setWorking(false);
  }

  async function generateDrafts() {
    setWorking(true);
    setLoadError("");
    setNotice("");

    const { data, error } = await supabase.rpc(
      "gkp_generate_invoice_batch",
      { p_billing_period: periodStart },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      const result = (Array.isArray(data) ? data[0] : data) as
        | BatchGenerationResult
        | undefined;

      setNotice(
        `${Number(result?.invoice_count || 0)} invoice drafts generated with ${Number(result?.billable_lesson_count || 0)} billable lessons.`,
      );
      await loadMonth(selectedInvoiceId);
    }

    setWorking(false);
  }

  function secureParentPath(invoice: BillingInvoiceOverview) {
    return `/invoice/${invoice.public_token}`;
  }

  async function copyParentLink() {
    if (!selectedInvoice || !selectedInvoice.public_link_enabled) return;

    const url = `${window.location.origin}${secureParentPath(selectedInvoice)}`;

    try {
      await navigator.clipboard.writeText(url);
      setNotice(`Secure parent link copied for ${selectedInvoice.invoice_number}.`);
    } catch (error) {
      setLoadError(errorMessage(error, "The secure link could not be copied."));
    }
  }

  async function rotateParentLink() {
    if (!selectedInvoice) return;

    const confirmed = window.confirm(
      `Replace the secure parent link for ${selectedInvoice.invoice_number}? The previous link will stop working immediately.`,
    );

    if (!confirmed) return;

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc(
      "gkp_rotate_invoice_public_token",
      { p_invoice_id: selectedInvoice.id },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(`A new secure link was created for ${selectedInvoice.invoice_number}.`);
      await loadMonth(selectedInvoice.id);
    }

    setWorking(false);
  }

  async function toggleParentLink() {
    if (!selectedInvoice) return;

    const nextEnabled = !selectedInvoice.public_link_enabled;
    const confirmed = window.confirm(
      nextEnabled
        ? `Reactivate the parent link for ${selectedInvoice.invoice_number}?`
        : `Disable the parent link for ${selectedInvoice.invoice_number}? The invoice will remain issued, but the current link will stop opening.`,
    );

    if (!confirmed) return;

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc(
      "gkp_set_invoice_public_link",
      {
        p_invoice_id: selectedInvoice.id,
        p_enabled: nextEnabled,
      },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(
        nextEnabled
          ? `Parent link activated for ${selectedInvoice.invoice_number}.`
          : `Parent link disabled for ${selectedInvoice.invoice_number}.`,
      );
      await loadMonth(selectedInvoice.id);
    }

    setWorking(false);
  }

  async function sendInvoiceEmailRequest({
    invoiceId,
    batchId,
    mode = "issued",
  }: {
    invoiceId?: string;
    batchId?: string;
    mode?: "issued" | "resend";
  }) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Please sign in again before sending billing email.");
    }

    const response = await fetch("/api/billing/email/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        invoiceId,
        batchId,
        mode,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      sent?: boolean | number;
      skipped?: boolean | number;
      failed?: number;
      recipients?: string[];
    };

    if (!response.ok) {
      throw new Error(payload.error || "The billing email could not be sent.");
    }

    return payload;
  }

  async function resendSelectedInvoiceEmail() {
    if (!selectedInvoice) return;

    setWorking(true);
    setLoadError("");
    setNotice("");

    try {
      const result = await sendInvoiceEmailRequest({
        invoiceId: selectedInvoice.id,
        mode: "resend",
      });

      setNotice(
        `Invoice email resent to ${
          Array.isArray(result.recipients)
            ? result.recipients.join(", ")
            : selectedInvoice.billing_email
        }.`,
      );
      await loadEmailHistory(selectedInvoice.id);
    } catch (error) {
      setLoadError(
        errorMessage(error, "The invoice email could not be resent."),
      );
    }

    setWorking(false);
  }

  async function issueSelectedInvoice() {
    if (!selectedInvoice) return;

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc("gkp_issue_invoice", {
      p_invoice_id: selectedInvoice.id,
    });

    if (error) {
      setLoadError(error.message);
    } else {
      try {
        const emailResult = await sendInvoiceEmailRequest({
          invoiceId: selectedInvoice.id,
          mode: "issued",
        });

        setNotice(
          emailResult.skipped
            ? `${selectedInvoice.invoice_number} issued. Its issue email had already been sent.`
            : `${selectedInvoice.invoice_number} issued and emailed to the parent.`,
        );
      } catch (emailError) {
        setLoadError(
          `${selectedInvoice.invoice_number} was issued, but the email could not be sent: ${errorMessage(
            emailError,
            "Unknown email error",
          )}`,
        );
      }

      await loadMonth(selectedInvoice.id);
    }

    setWorking(false);
  }

  async function issueWholeBatch() {
    if (!batch) return;

    const confirmed = window.confirm(
      `Issue every positive draft invoice for ${monthLabel(billingMonth)}?`,
    );

    if (!confirmed) return;

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { data, error } = await supabase.rpc(
      "gkp_issue_invoice_batch",
      { p_batch_id: batch.id },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      const issuedCount = Number(data || 0);

      try {
        const emailResult = await sendInvoiceEmailRequest({
          batchId: batch.id,
          mode: "issued",
        });

        setNotice(
          `${issuedCount} invoices issued. ${Number(emailResult.sent || 0)} email${
            Number(emailResult.sent || 0) === 1 ? "" : "s"
          } sent${
            Number(emailResult.skipped || 0) > 0
              ? `; ${Number(emailResult.skipped || 0)} already sent`
              : ""
          }${
            Number(emailResult.failed || 0) > 0
              ? `; ${Number(emailResult.failed || 0)} failed`
              : ""
          }.`,
        );
      } catch (emailError) {
        setLoadError(
          `${issuedCount} invoices were issued, but the batch email send failed: ${errorMessage(
            emailError,
            "Unknown email error",
          )}`,
        );
      }

      await loadMonth(selectedInvoiceId);
    }

    setWorking(false);
  }

  async function markForReview() {
    if (!selectedInvoice) return;

    setWorking(true);
    const { error } = await supabase.rpc(
      "gkp_mark_invoice_for_review",
      { p_invoice_id: selectedInvoice.id },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(`${selectedInvoice.invoice_number} marked for review.`);
      await loadMonth(selectedInvoice.id);
    }
    setWorking(false);
  }

  async function returnToDraft() {
    if (!selectedInvoice) return;

    setWorking(true);
    const { error } = await supabase.rpc(
      "gkp_return_invoice_to_draft",
      { p_invoice_id: selectedInvoice.id },
    );

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(`${selectedInvoice.invoice_number} returned to draft.`);
      await loadMonth(selectedInvoice.id);
    }
    setWorking(false);
  }

  async function voidSelectedInvoice() {
    if (!selectedInvoice) return;

    const reason = window.prompt(
      `Reason for voiding ${selectedInvoice.invoice_number}:`,
      "Billing correction",
    );

    if (reason === null) return;

    setWorking(true);
    const { error } = await supabase.rpc("gkp_void_invoice", {
      p_invoice_id: selectedInvoice.id,
      p_reason: normaliseOptionalText(reason),
    });

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(`${selectedInvoice.invoice_number} voided.`);
      await loadMonth();
    }
    setWorking(false);
  }

  async function deleteSelectedInvoice() {
    if (!selectedInvoice) return;

    const allowedStatus = ["draft", "review", "void"].includes(
      selectedInvoice.status,
    );

    if (!allowedStatus) {
      setLoadError(
        "Only draft, review or void invoices can be deleted. Issued or paid invoices must remain in the billing history.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${selectedInvoice.invoice_number}?\n\nThis is only allowed when the invoice has no payment, HitPay, email, parent-view or credit history. Invoice numbers are never reused.`,
    );

    if (!confirmed) return;

    const reason = window.prompt(
      `Reason for deleting ${selectedInvoice.invoice_number}:`,
      "Test / duplicate invoice cleanup",
    );

    if (reason === null) return;

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { data, error } = await supabase.rpc("gkp_delete_invoice", {
      p_invoice_id: selectedInvoice.id,
      p_reason: normaliseOptionalText(reason),
    });

    if (error) {
      setLoadError(error.message);
    } else if (!data) {
      setLoadError("The invoice could not be deleted.");
    } else {
      setNotice(
        `${selectedInvoice.invoice_number} permanently deleted. Its invoice number will not be reused.`,
      );
      setSelectedInvoiceId("");
      await loadMonth();
    }

    setWorking(false);
  }

  function openClosureModal() {
    setClosureForm({
      ...DEFAULT_CLOSURE_FORM,
      closure_date: periodStart,
    });
    setFormError("");
    setClosureModalOpen(true);
  }

  async function submitClosure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setFormError("");

    const { error } = await supabase
      .from("gkp_billing_non_teaching_dates")
      .insert({
        closure_date: closureForm.closure_date,
        description: closureForm.description.trim(),
      });

    if (error) {
      setFormError(error.message);
    } else {
      setClosureModalOpen(false);
      setNotice("Centre closure added. Refresh lesson dates before generating invoices.");
      await loadMonth(selectedInvoiceId);
    }

    setWorking(false);
  }

  async function deleteClosure(closure: NonTeachingDate) {
    if (!window.confirm(`Remove ${formatDate(closure.closure_date)} as a centre closure?`)) {
      return;
    }

    const { error } = await supabase
      .from("gkp_billing_non_teaching_dates")
      .delete()
      .eq("id", closure.id);

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice("Centre closure removed. Refresh lesson dates again.");
      await loadMonth(selectedInvoiceId);
    }
  }

  async function toggleLessonBillable(lesson: LessonOccurrenceOverview) {
    const nextBillable = !lesson.is_billable;

    const { error } = await supabase
      .from("gkp_billing_lesson_occurrences")
      .update({
        is_billable: nextBillable,
        status: nextBillable ? "scheduled" : "cancelled",
        source: "manual",
        is_locked: true,
        notes: nextBillable
          ? lesson.notes
          : lesson.notes || "Manually excluded from billing",
      })
      .eq("id", lesson.id);

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice("Lesson billing status updated. Regenerate drafts to apply it.");
      await loadMonth(selectedInvoiceId);
    }
  }

  function openExtraLessonModal() {
    setExtraLessonForm({
      ...DEFAULT_EXTRA_LESSON_FORM,
      enrolment_id: uniqueScheduleOptions[0]?.enrolment_id || "",
      lesson_date: periodStart,
      start_time: uniqueScheduleOptions[0]?.start_time?.slice(0, 5) || "",
    });
    setFormError("");
    setExtraLessonModalOpen(true);
  }

  async function submitExtraLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setFormError("");

    const { error } = await supabase
      .from("gkp_billing_lesson_occurrences")
      .insert({
        enrolment_id: extraLessonForm.enrolment_id,
        lesson_date: extraLessonForm.lesson_date,
        start_time: normaliseOptionalText(extraLessonForm.start_time),
        status: "replacement",
        is_billable: true,
        source: "manual",
        is_locked: true,
        notes: normaliseOptionalText(extraLessonForm.notes),
      });

    if (error) {
      setFormError(error.message);
    } else {
      setExtraLessonModalOpen(false);
      setNotice("Replacement or extra lesson added. Regenerate drafts to apply it.");
      await loadMonth(selectedInvoiceId);
    }

    setWorking(false);
  }

  function openEditItem(item: BillingInvoiceItem) {
    setEditingItemId(item.id);
    setItemForm({
      description: item.description,
      quantity: String(numberValue(item.quantity)),
      unit_amount: String(numberValue(item.unit_amount)),
      discount_amount: String(numberValue(item.discount_amount)),
    });
    setFormError("");
    setItemModalOpen(true);
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInvoice || !editingItemId) return;

    const quantity = Number(itemForm.quantity);
    const unitAmount = Number(itemForm.unit_amount);
    const discountAmount = Number(itemForm.discount_amount);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(unitAmount)) {
      setFormError("Enter a valid unit amount.");
      return;
    }

    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      setFormError("Enter a valid discount amount.");
      return;
    }

    setWorking(true);
    const { error } = await supabase
      .from("gkp_billing_invoice_items")
      .update({
        description: itemForm.description.trim(),
        quantity,
        unit_amount: unitAmount,
        discount_amount: discountAmount,
      })
      .eq("id", editingItemId)
      .eq("invoice_id", selectedInvoice.id);

    if (error) {
      setFormError(error.message);
    } else {
      setItemModalOpen(false);
      setNotice("Invoice line updated.");
      await loadMonth(selectedInvoice.id);
    }
    setWorking(false);
  }

  function openManualItemModal() {
    setManualItemForm(DEFAULT_MANUAL_ITEM_FORM);
    setFormError("");
    setManualItemModalOpen(true);
  }

  async function submitManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedInvoice) return;

    const amount = Number(manualItemForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    const itemType: InvoiceItemType =
      manualItemForm.item_kind === "discount"
        ? "discount"
        : manualItemForm.item_kind === "credit"
          ? "credit"
          : "other";

    setWorking(true);
    const { error } = await supabase
      .from("gkp_billing_invoice_items")
      .insert({
        invoice_id: selectedInvoice.id,
        item_type: itemType,
        description: manualItemForm.description.trim(),
        quantity: 1,
        unit_amount:
          manualItemForm.item_kind === "charge" ? amount : -amount,
        discount_amount: 0,
        sort_order: 9500 + invoiceItems.length * 10,
        metadata: {
          source: "manual_invoice_review",
          preset:
            manualItemForm.preset_id === "custom"
              ? null
              : manualItemForm.preset_id,
        },
      });

    if (error) {
      setFormError(error.message);
    } else {
      setManualItemModalOpen(false);
      setNotice("One-off invoice line added.");
      await loadMonth(selectedInvoice.id);
    }
    setWorking(false);
  }

  async function deleteInvoiceItem(item: BillingInvoiceItem) {
    if (!selectedInvoice || !editableInvoice) return;

    if (!window.confirm(`Delete “${item.description}” from this invoice?`)) {
      return;
    }

    const { error } = await supabase
      .from("gkp_billing_invoice_items")
      .delete()
      .eq("id", item.id)
      .eq("invoice_id", selectedInvoice.id);

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice("Invoice line deleted.");
      await loadMonth(selectedInvoice.id);
    }
  }

  return (
    <BillingAdminShell
      eyebrow="Prepaid monthly billing"
      title="Invoices"
      description="Generate per-lesson invoices from each student's regular weekday, review the lesson dates and amounts, then issue approved invoices."
      actions={
        <button
          type="button"
          onClick={() => void loadMonth(selectedInvoiceId)}
          disabled={loading || working}
          className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-end">
          <label>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#867d70]">
              Billing month
            </span>
            <input
              type="month"
              value={billingMonth}
              onChange={(event) => setBillingMonth(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-[#dcd3c3] bg-[#fbfaf7] px-4 text-sm font-bold outline-none focus:border-[#b98d3f]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openClosureModal}
              disabled={working}
              className="min-h-12 rounded-full border border-[#d7c9ae] bg-[#fbfaf7] px-5 text-xs font-bold disabled:opacity-50"
            >
              + Centre closure
            </button>
            <button
              type="button"
              onClick={() => void syncLessonDates()}
              disabled={working}
              className="min-h-12 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50"
            >
              Refresh lesson dates
            </button>
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              disabled={working || lessonSchedule.length === 0}
              className="min-h-12 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50"
            >
              Review lesson dates
            </button>
            <button
              type="button"
              onClick={() => void generateDrafts()}
              disabled={working}
              className="min-h-12 rounded-full bg-[#15233b] px-6 text-xs font-bold text-white disabled:opacity-50"
            >
              {working ? "Working…" : "Generate / refresh drafts"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <ProcessStep number="1" title="Set schedules" text="Each active per-lesson enrolment needs a regular weekday." />
          <ProcessStep number="2" title="Record closures" text="Add dates when the centre will not conduct lessons." />
          <ProcessStep number="3" title="Review dates" text="Cancel, restore or add replacement lessons." />
          <ProcessStep number="4" title="Generate drafts" text="The actual lesson count becomes the invoice quantity." />
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Invoice drafts"
          value={String(invoices.filter((invoice) => invoice.status !== "void").length)}
          detail={monthLabel(billingMonth)}
        />
        <SummaryCard
          label="Billable lessons"
          value={String(lessonSchedule.filter((lesson) => lesson.is_billable).length)}
          detail={`${lessonSchedule.filter((lesson) => !lesson.is_billable).length} excluded`}
        />
        <SummaryCard
          label="Gross fees"
          value={formatCurrency(totals.subtotal)}
          detail="Before discounts and credits"
        />
        <SummaryCard
          label="Discounts"
          value={formatCurrency(totals.discount + totals.credit)}
          detail="Recurring discount basis: 4 lessons"
        />
        <SummaryCard
          label="Invoice total"
          value={formatCurrency(totals.total)}
          detail={`${numberValue(phaseStatus.active_enrolments_missing_weekday)} active schedules missing`}
          warning={numberValue(phaseStatus.active_enrolments_missing_weekday) > 0}
        />
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(460px,0.85fr)_minmax(0,1.35fr)]">
        <section className="overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#ebe5da] p-5 sm:px-6">
            <div>
              <h2 className="text-xl font-semibold">Family invoices</h2>
              <p className="mt-1 text-sm text-[#81796d]">
                Select an invoice to review its lesson lines.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {voidedInvoiceCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowVoidedInvoices((current) => !current)}
                  className="min-h-9 rounded-full border border-[#d8c59e] bg-white px-3 text-[11px] font-black text-[#6f675a]"
                >
                  {showVoidedInvoices
                    ? "Hide voided"
                    : `Show voided (${voidedInvoiceCount})`}
                </button>
              )}

              {batch && (
                <span className="rounded-full border border-[#d8c59e] bg-[#f8f1e3] px-3 py-2 text-xs font-black text-[#8a672a]">
                  Batch {batch.status}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-[#81796d]">Loading invoices…</div>
          ) : visibleInvoices.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eadc] text-xl font-black text-[#a27627]">0</div>
              <h3 className="mt-4 text-lg font-semibold">
                {voidedInvoiceCount > 0 && !showVoidedInvoices
                  ? "No active invoices"
                  : "No invoice drafts"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#81796d]">
                {voidedInvoiceCount > 0 && !showVoidedInvoices
                  ? "Voided invoices are hidden. Use Show voided if you need to review old records."
                  : "Refresh the lesson dates, review any closures, then generate the month’s drafts."}
              </p>
            </div>
          ) : (
            <div className="max-h-[760px] overflow-y-auto p-3 sm:p-4">
              {visibleInvoices.map((invoice) => {
                const active = invoice.id === selectedInvoiceId;

                return (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    className={`mb-3 w-full rounded-2xl border p-4 text-left transition last:mb-0 ${
                      active
                        ? "border-[#15233b] bg-[#15233b] text-white"
                        : "border-[#ded5c4] bg-[#fbfaf7] hover:border-[#b99a61]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span>
                        <strong className="block text-sm">{invoice.payer_name}</strong>
                        <small className={`mt-1 block ${active ? "text-white/55" : "text-[#8a8378]"}`}>
                          {invoice.invoice_number} · {invoice.account_code}
                        </small>
                      </span>
                      <StatusBadge status={invoice.status} active={active} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MiniStat label="Students" value={invoice.student_count} active={active} />
                      <MiniStat label="Lessons" value={invoice.lesson_count} active={active} />
                      <MiniStat label="Total" value={formatCurrency(numberValue(invoice.total_amount))} active={active} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
          {!selectedInvoice ? (
            <div className="p-12 text-center text-sm text-[#81796d]">
              Select an invoice to review it.
            </div>
          ) : (
            <>
              <div className="border-b border-[#ebe5da] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f1eadc] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#8d6828]">
                        {selectedInvoice.invoice_number}
                      </span>
                      <StatusBadge status={selectedInvoice.status} />
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold">{selectedInvoice.payer_name}</h2>
                    <p className="mt-2 text-sm text-[#746d62]">
                      {selectedInvoice.billing_email} · Due {formatDate(selectedInvoice.due_date)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[#8a8378]">
                      Parent link: {selectedInvoice.public_link_enabled ? "Active" : "Inactive"}
                      {numberValue(selectedInvoice.public_link_view_count) > 0
                        ? ` · ${numberValue(selectedInvoice.public_link_view_count)} recorded view${numberValue(selectedInvoice.public_link_view_count) === 1 ? "" : "s"}`
                        : " · Not viewed yet"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#8a8378]">
                      HitPay: {selectedInvoice.hitpay_payment_status || "No payment request"}
                      {selectedInvoice.hitpay_payment_environment
                        ? ` · ${selectedInvoice.hitpay_payment_environment}`
                        : ""}
                      {numberValue(selectedInvoice.overpayment_amount) > 0
                        ? ` · Overpayment ${formatCurrency(numberValue(selectedInvoice.overpayment_amount))}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#8a8378]">
                      Email:{" "}
                      {emailHistoryLoading
                        ? "Checking…"
                        : emailHistory[0]
                          ? `${emailTypeLabel(emailHistory[0].email_type)} · ${emailHistory[0].status}`
                          : "Not sent yet"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/billing/invoices/${selectedInvoice.id}/preview`}
                      className="inline-flex min-h-10 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
                    >
                      Preview invoice
                    </Link>
                    {editableInvoice && (
                      <>
                        <button
                          type="button"
                          onClick={openManualItemModal}
                          className="min-h-10 rounded-full border border-[#d7c9ae] bg-[#fbfaf7] px-4 text-xs font-bold"
                        >
                          + One-off line
                        </button>
                        {selectedInvoice.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => void markForReview()}
                            disabled={working}
                            className="min-h-10 rounded-full border border-violet-200 bg-violet-50 px-4 text-xs font-bold text-violet-700"
                          >
                            Mark review
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void issueSelectedInvoice()}
                          disabled={working}
                          className="min-h-10 rounded-full bg-[#15233b] px-4 text-xs font-bold text-white"
                        >
                          Issue invoice
                        </button>
                      </>
                    )}
                    {selectedInvoice.status === "issued" && (
                      <button
                        type="button"
                        onClick={() => void returnToDraft()}
                        disabled={working}
                        className="min-h-10 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
                      >
                        Return to draft
                      </button>
                    )}
                    {["issued", "partially_paid", "paid", "overdue"].includes(
                      selectedInvoice.status,
                    ) && (
                      <>
                        {selectedInvoice.public_link_enabled && (
                          <>
                            <a
                              href={secureParentPath(selectedInvoice)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-10 items-center rounded-full bg-[#9b7029] px-4 text-xs font-bold text-white"
                            >
                              Open parent view
                            </a>
                            <button
                              type="button"
                              onClick={() => void copyParentLink()}
                              disabled={working}
                              className="min-h-10 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
                            >
                              Copy secure link
                            </button>
                            <button
                              type="button"
                              onClick={() => void resendSelectedInvoiceEmail()}
                              disabled={working}
                              className="min-h-10 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700"
                            >
                              Resend email
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => void toggleParentLink()}
                          disabled={working}
                          className={`min-h-10 rounded-full border px-4 text-xs font-bold ${
                            selectedInvoice.public_link_enabled
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {selectedInvoice.public_link_enabled
                            ? "Disable link"
                            : "Enable link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void rotateParentLink()}
                          disabled={working}
                          className="min-h-10 rounded-full border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700"
                        >
                          Replace link
                        </button>
                      </>
                    )}
                    {!['paid', 'partially_paid', 'void'].includes(selectedInvoice.status) && (
                      <button
                        type="button"
                        onClick={() => void voidSelectedInvoice()}
                        disabled={working}
                        className="min-h-10 rounded-full border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-700"
                      >
                        Void
                      </button>
                    )}
                    {["draft", "review", "void"].includes(
                      selectedInvoice.status,
                    ) && (
                      <button
                        type="button"
                        onClick={() => void deleteSelectedInvoice()}
                        disabled={working}
                        className="min-h-10 rounded-full border border-red-300 bg-red-600 px-4 text-xs font-bold text-white"
                      >
                        Delete invoice
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCell label="Gross fees" value={formatCurrency(numberValue(selectedInvoice.subtotal))} />
                  <InfoCell label="Discounts" value={formatCurrency(numberValue(selectedInvoice.discount_total))} />
                  <InfoCell label="Credits" value={formatCurrency(numberValue(selectedInvoice.credit_total))} />
                  <InfoCell label="Total due" value={formatCurrency(numberValue(selectedInvoice.total_amount))} emphasis />
                </div>
              </div>

              <div className="border-b border-[#ebe5da] bg-[#fbfaf7] px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9a7029]">
                      Email history
                    </p>
                    <p className="mt-1 text-xs text-[#81796d]">
                      Invoice and payment emails sent through Resend.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#ded5c4] bg-white px-3 py-1.5 text-[10px] font-black text-[#6f675a]">
                    {emailHistory.length}
                  </span>
                </div>

                {emailHistoryLoading ? (
                  <p className="mt-4 text-xs text-[#81796d]">
                    Loading email history…
                  </p>
                ) : emailHistory.length === 0 ? (
                  <p className="mt-4 text-xs text-[#81796d]">
                    No billing email has been recorded for this invoice yet.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-2">
                    {emailHistory.slice(0, 6).map((email) => (
                      <div
                        key={email.id}
                        className="flex flex-col justify-between gap-2 rounded-2xl border border-[#e6dfd3] bg-white px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <strong className="block text-xs text-[#15233b]">
                            {emailTypeLabel(email.email_type)}
                          </strong>
                          <span className="mt-1 block text-[11px] text-[#8a8378]">
                            {(email.recipient_emails || []).join(", ")}
                            {" · "}
                            {formatEmailDate(email.sent_at || email.created_at)}
                          </span>
                          {email.error_message && (
                            <span className="mt-1 block text-[11px] text-red-600">
                              {email.error_message}
                            </span>
                          )}
                        </div>
                        <span
                          className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                            email.status === "sent"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : email.status === "failed"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {email.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {itemsLoading ? (
                <div className="p-8 text-sm text-[#81796d]">Loading invoice lines…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead>
                      <tr className="border-b border-[#eee8dd] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
                        <th className="px-6 py-4">Description</th>
                        <th className="px-4 py-4">Quantity</th>
                        <th className="px-4 py-4">Rate</th>
                        <th className="px-4 py-4">Discount</th>
                        <th className="px-4 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item) => {
                        const lessonDates = Array.isArray(item.metadata?.lesson_dates)
                          ? (item.metadata?.lesson_dates as string[])
                          : [];

                        return (
                          <tr key={item.id} className="border-b border-[#eee8df] last:border-0">
                            <td className="px-6 py-5">
                              <strong className="block">{item.description}</strong>
                              {lessonDates.length > 0 && (
                                <span className="mt-2 block max-w-lg text-xs leading-5 text-[#8a8378]">
                                  {lessonDates.map(formatShortDate).join(", ")}
                                </span>
                              )}
                              {item.metadata?.discount_basis_lessons === 4 && (
                                <span className="mt-1 block text-xs font-bold text-[#9a6c22]">
                                  Recurring discount applied to four lessons
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-5 font-bold">{numberValue(item.quantity)}</td>
                            <td className="px-4 py-5">{formatCurrency(numberValue(item.unit_amount))}</td>
                            <td className="px-4 py-5">{formatCurrency(numberValue(item.discount_amount))}</td>
                            <td className="px-4 py-5 font-black text-[#8a6325]">{formatCurrency(numberValue(item.line_total))}</td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                {editableInvoice && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openEditItem(item)}
                                      className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[11px] font-bold"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteInvoiceItem(item)}
                                      className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a27627]">Month controls</p>
            <h2 className="mt-2 text-xl font-semibold">Centre closures and batch approval</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#777065]">
              A closure excludes the generated lesson for every affected enrolment. Replacement lessons can be added manually in the lesson-date review.
            </p>
          </div>
          {batch && batch.status === "draft" && invoices.length > 0 && (
            <button
              type="button"
              onClick={() => void issueWholeBatch()}
              disabled={working}
              className="min-h-11 rounded-full bg-[#9b7029] px-5 text-xs font-bold text-white disabled:opacity-50"
            >
              Issue all approved drafts
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {closures.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#d7c9ae] p-4 text-sm text-[#81796d] md:col-span-2 xl:col-span-4">
              No centre closures recorded for {monthLabel(billingMonth)}.
            </p>
          ) : (
            closures.map((closure) => (
              <div key={closure.id} className="rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4">
                <strong className="block">{formatDate(closure.closure_date)}</strong>
                <span className="mt-1 block text-sm text-[#81796d]">{closure.description}</span>
                <button
                  type="button"
                  onClick={() => void deleteClosure(closure)}
                  className="mt-3 text-xs font-bold text-red-700 underline"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <BillingModal
        open={closureModalOpen}
        onClose={() => !working && setClosureModalOpen(false)}
        eyebrow="Monthly calendar"
        title="Add centre closure"
        description="Generated lessons on this date will remain visible but will be marked cancelled and excluded from billing."
        footer={<ModalFooter formId="closure-form" saving={working} submitLabel="Add closure" onCancel={() => setClosureModalOpen(false)} />}
      >
        <form id="closure-form" onSubmit={submitClosure} className="grid gap-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <TextField label="Closure date" type="date" value={closureForm.closure_date} onChange={(value) => setClosureForm((current) => ({ ...current, closure_date: value }))} required />
          <TextField label="Description" value={closureForm.description} onChange={(value) => setClosureForm((current) => ({ ...current, description: value }))} placeholder="e.g. Centre closed for public holiday" required />
        </form>
      </BillingModal>

      <BillingModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        eyebrow="Lesson calendar"
        title={`${monthLabel(billingMonth)} lesson dates`}
        description="Toggle a lesson off when it should not be billed. Add replacement or extra lessons separately, then regenerate the invoice drafts."
        widthClass="max-w-6xl"
        footer={
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={openExtraLessonModal} disabled={uniqueScheduleOptions.length === 0} className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50">+ Replacement / extra lesson</button>
            <button type="button" onClick={() => setScheduleModalOpen(false)} className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white">Done</button>
          </div>
        }
      >
        <div className="overflow-x-auto rounded-2xl border border-[#ded5c4]">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="border-b border-[#eee8dd] bg-white text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
                <th className="px-5 py-4">Date</th>
                <th className="px-4 py-4">Student</th>
                <th className="px-4 py-4">Programme</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Billing</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {lessonSchedule.map((lesson) => (
                <tr key={lesson.id} className="border-b border-[#eee8df] last:border-0">
                  <td className="px-5 py-4"><strong>{formatDate(lesson.lesson_date)}</strong><span className="mt-1 block text-xs text-[#8a8378]">{formatTime(lesson.start_time)}</span></td>
                  <td className="px-4 py-4"><strong>{lesson.student_name}</strong><span className="mt-1 block text-xs text-[#8a8378]">{lesson.student_code}</span></td>
                  <td className="px-4 py-4">{lesson.programme_name}</td>
                  <td className="px-4 py-4 text-sm capitalize">{lesson.source}<span className="mt-1 block text-xs text-[#8a8378]">{lesson.status}</span></td>
                  <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${lesson.is_billable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{lesson.is_billable ? "Billable" : "Excluded"}</span>{lesson.notes && <span className="mt-1 block max-w-[200px] text-xs text-[#8a8378]">{lesson.notes}</span>}</td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => void toggleLessonBillable(lesson)} className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[11px] font-bold">{lesson.is_billable ? "Exclude" : "Restore"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BillingModal>

      <BillingModal
        open={extraLessonModalOpen}
        onClose={() => !working && setExtraLessonModalOpen(false)}
        eyebrow="Manual lesson date"
        title="Add replacement or extra lesson"
        description="This creates one additional billable lesson for the selected student enrolment."
        footer={<ModalFooter formId="extra-lesson-form" saving={working} submitLabel="Add lesson" onCancel={() => setExtraLessonModalOpen(false)} />}
      >
        <form id="extra-lesson-form" onSubmit={submitExtraLesson} className="grid gap-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <SelectField label="Student programme" value={extraLessonForm.enrolment_id} onChange={(value) => {
            const selected = uniqueScheduleOptions.find((lesson) => lesson.enrolment_id === value);
            setExtraLessonForm((current) => ({ ...current, enrolment_id: value, start_time: selected?.start_time?.slice(0, 5) || current.start_time }));
          }} options={uniqueScheduleOptions.map((lesson) => [lesson.enrolment_id, `${lesson.student_name} — ${lesson.programme_name}`])} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Lesson date" type="date" value={extraLessonForm.lesson_date} onChange={(value) => setExtraLessonForm((current) => ({ ...current, lesson_date: value }))} required />
            <TextField label="Start time" type="time" value={extraLessonForm.start_time} onChange={(value) => setExtraLessonForm((current) => ({ ...current, start_time: value }))} />
          </div>
          <TextField label="Notes" value={extraLessonForm.notes} onChange={(value) => setExtraLessonForm((current) => ({ ...current, notes: value }))} />
        </form>
      </BillingModal>

      <BillingModal
        open={itemModalOpen}
        onClose={() => !working && setItemModalOpen(false)}
        eyebrow="Invoice review"
        title="Edit invoice line"
        description="Changing the quantity overrides the generated lesson count for this draft only. Regenerating the month will restore the schedule-based value."
        footer={<ModalFooter formId="item-form" saving={working} submitLabel="Save line" onCancel={() => setItemModalOpen(false)} />}
      >
        <form id="item-form" onSubmit={submitItem} className="grid gap-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <TextField label="Description" value={itemForm.description} onChange={(value) => setItemForm((current) => ({ ...current, description: value }))} required />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Quantity" type="number" min="0.01" step="0.01" value={itemForm.quantity} onChange={(value) => setItemForm((current) => ({ ...current, quantity: value }))} required />
            <TextField label="Rate (SGD)" type="number" step="0.01" value={itemForm.unit_amount} onChange={(value) => setItemForm((current) => ({ ...current, unit_amount: value }))} required />
            <TextField label="Total line discount (SGD)" type="number" min="0" step="0.01" value={itemForm.discount_amount} onChange={(value) => setItemForm((current) => ({ ...current, discount_amount: value }))} required />
          </div>
        </form>
      </BillingModal>

      <BillingModal
        open={manualItemModalOpen}
        onClose={() => !working && setManualItemModalOpen(false)}
        eyebrow="One-off adjustment"
        title="Add invoice line"
        description="Add a charge, discount or credit to this invoice only. It does not change the student’s permanent enrolment fee."
        footer={<ModalFooter formId="manual-item-form" saving={working} submitLabel="Add line" onCancel={() => setManualItemModalOpen(false)} />}
      >
        <form id="manual-item-form" onSubmit={submitManualItem} className="grid gap-4">
          {formError && <Alert tone="error">{formError}</Alert>}
          <SelectField
            label="Common billing item"
            value={manualItemForm.preset_id}
            onChange={(value) => {
              const presetId = value as ManualItemPresetId;

              if (presetId === "custom") {
                setManualItemForm((current) => ({
                  ...current,
                  preset_id: "custom",
                }));
                return;
              }

              const preset = MANUAL_ITEM_PRESETS[presetId];

              setManualItemForm({
                preset_id: presetId,
                item_kind: preset.item_kind,
                description: preset.description,
                amount: preset.amount,
              });
            }}
            options={[
              ["custom", "Custom invoice line"],
              [
                "refundable_class_slot_deposit",
                MANUAL_ITEM_PRESETS.refundable_class_slot_deposit.label,
              ],
              [
                "registration_fee",
                MANUAL_ITEM_PRESETS.registration_fee.label,
              ],
              [
                "registration_fee_waiver",
                MANUAL_ITEM_PRESETS.registration_fee_waiver.label,
              ],
            ]}
          />

          <SelectField
            label="Line type"
            value={manualItemForm.item_kind}
            onChange={(value) =>
              setManualItemForm((current) => ({
                ...current,
                preset_id: "custom",
                item_kind: value as ManualItemForm["item_kind"],
              }))
            }
            options={[
              ["charge", "Additional charge"],
              ["discount", "One-off discount"],
              ["credit", "Account credit"],
            ]}
          />

          <TextField
            label="Description"
            value={manualItemForm.description}
            onChange={(value) =>
              setManualItemForm((current) => ({
                ...current,
                preset_id: "custom",
                description: value,
              }))
            }
            placeholder="e.g. Materials fee or goodwill credit"
            required
          />

          <TextField
            label="Amount (SGD)"
            type="number"
            min="0.01"
            step="0.01"
            value={manualItemForm.amount}
            onChange={(value) =>
              setManualItemForm((current) => ({
                ...current,
                preset_id: "custom",
                amount: value,
              }))
            }
            required
          />
        </form>
      </BillingModal>
    </BillingAdminShell>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#e1d7c6] bg-[#fbfaf7] p-4">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#15233b] text-xs font-black text-[#e8c474]">{number}</span>
      <strong className="mt-3 block text-sm">{title}</strong>
      <span className="mt-1 block text-xs leading-5 text-[#81796d]">{text}</span>
    </div>
  );
}

function SummaryCard({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return (
    <article className={`rounded-[1.65rem] border bg-white p-5 ${warning ? "border-amber-300" : "border-[#ded5c4]"}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#887f72]">{label}</p>
      <strong className="mt-3 block break-words text-2xl font-semibold">{value}</strong>
      <span className={`mt-2 block text-xs ${warning ? "font-bold text-amber-700" : "text-[#8a8378]"}`}>{detail}</span>
    </article>
  );
}

function InfoCell({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${emphasis ? "bg-[#15233b] text-white" : "bg-[#f8f5ef]"}`}>
      <dt className={`text-[10px] font-black uppercase tracking-[0.13em] ${emphasis ? "text-white/55" : "text-[#8a8378]"}`}>{label}</dt>
      <dd className={`mt-2 font-bold ${emphasis ? "text-[#f0cf87]" : "text-[#15233b]"}`}>{value}</dd>
    </div>
  );
}

function StatusBadge({ status, active = false }: { status: BillingInvoiceOverview['status']; active?: boolean }) {
  const classes = active
    ? "border-white/15 bg-white/10 text-white"
    : status === "paid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "issued"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "review"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : status === "void"
            ? "border-slate-200 bg-slate-100 text-slate-500"
            : "border-[#d8c9ad] bg-[#f8f1e3] text-[#8a672a]";

  return <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] ${classes}`}>{invoiceStatusLabel(status)}</span>;
}

function MiniStat({ label, value, active }: { label: string; value: ReactNode; active: boolean }) {
  return (
    <span className="min-w-0">
      <strong className="block truncate text-xs">{value}</strong>
      <small className={`mt-1 block text-[9px] uppercase tracking-[0.08em] ${active ? "text-white/45" : "text-[#9a9285]"}`}>{label}</small>
    </span>
  );
}

function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <div className={`mb-5 rounded-2xl border p-4 text-sm leading-6 ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</div>
  );
}

function emailTypeLabel(value: BillingEmailLog["email_type"]) {
  if (value === "invoice_issued") return "Invoice issued";
  if (value === "invoice_resent") return "Invoice resent";
  if (value === "payment_received") return "Payment received";
  if (value === "payment_reminder") return "Payment reminder";
  if (value === "overdue_reminder") return "Overdue reminder";
  return value;
}

function formatEmailDate(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function TextField({ label, value, onChange, type = "text", placeholder, required = false, min, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; min?: string; step?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.13em] text-[#82796d]">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} min={min} step={step} className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm outline-none focus:border-[#b98d3f]" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.13em] text-[#82796d]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm outline-none focus:border-[#b98d3f]">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function ModalFooter({ formId, saving, submitLabel, onCancel }: { formId: string; saving: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50">Cancel</button>
      <button type="submit" form={formId} disabled={saving} className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : submitLabel}</button>
    </div>
  );
}
