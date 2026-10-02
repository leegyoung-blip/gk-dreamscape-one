"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "./BillingAdminShell";

type CompanyCode = "gkp" | "dreamscape";
type AccessStatus = "checking" | "allowed" | "locked" | "error";
type EmploymentStatus = "active" | "inactive" | "ended";
type PaymentStatus = "pending" | "paid" | "void";
type PayBasis =
  | "monthly_salary"
  | "hourly"
  | "per_class"
  | "per_session"
  | "custom";

type StaffCategory =
  | "management"
  | "full_time"
  | "part_time"
  | "teacher"
  | "assistant_teacher"
  | "contractor"
  | "other";

type StaffPerson = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  company_codes: string[];
};

type StaffRow = {
  employment_id: string;
  person_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  person_notes: string | null;
  company_code: CompanyCode;
  staff_category: StaffCategory;
  job_title: string;
  employment_status: EmploymentStatus;
  start_date: string;
  end_date: string | null;
  pay_basis: PayBasis;
  default_rate: number | string;
  currency: string;
  employment_notes: string | null;
  last_payment_date: string | null;
  last_payment_amount: number | string;
  ytd_paid_amount: number | string;
};

type PaymentRow = {
  payment_id: string;
  employment_id: string;
  person_id: string;
  full_name: string;
  job_title: string;
  staff_category: StaffCategory;
  period_start: string;
  period_end: string;
  pay_basis_snapshot: PayBasis;
  units: number | string;
  unit_rate: number | string;
  base_pay: number | string;
  bonus: number | string;
  allowances: number | string;
  deductions: number | string;
  other_adjustment: number | string;
  total_amount: number | string;
  payment_status: PaymentStatus;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

type Summary = {
  active_staff_count: number;
  payment_count: number;
  pending_count: number;
  paid_count: number;
  pending_amount: number | string;
  paid_amount: number | string;
  total_amount: number | string;
};

type RoleCostRow = {
  staff_category: StaffCategory;
  staff_count: number;
  payment_count: number;
  base_pay: number | string;
  bonus: number | string;
  allowances: number | string;
  deductions: number | string;
  other_adjustment: number | string;
  total_amount: number | string;
  pending_amount: number | string;
  paid_amount: number | string;
};

type StaffForm = {
  person_id: string;
  full_name: string;
  email: string;
  phone: string;
  person_notes: string;
  staff_category: StaffCategory;
  job_title: string;
  status: EmploymentStatus;
  start_date: string;
  end_date: string;
  pay_basis: PayBasis;
  default_rate: string;
  currency: string;
  employment_notes: string;
};

type PaymentForm = {
  payment_id: string;
  employment_id: string;
  period_start: string;
  period_end: string;
  units: string;
  unit_rate: string;
  base_pay: string;
  bonus: string;
  allowances: string;
  deductions: string;
  other_adjustment: string;
  status: "pending" | "paid";
  paid_at: string;
  payment_method: string;
  payment_reference: string;
  notes: string;
};

const EMPTY_STAFF_FORM: StaffForm = {
  person_id: "",
  full_name: "",
  email: "",
  phone: "",
  person_notes: "",
  staff_category: "teacher",
  job_title: "Teacher",
  status: "active",
  start_date: singaporeToday(),
  end_date: "",
  pay_basis: "hourly",
  default_rate: "0",
  currency: "SGD",
  employment_notes: "",
};

function singaporeToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentMonthValue() {
  return singaporeToday().slice(0, 7);
}

function monthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  const end = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return { start, end };
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numberValue(value));
}

function date(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00+08:00`);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function categoryLabel(value: StaffCategory) {
  const labels: Record<StaffCategory, string> = {
    management: "Management",
    full_time: "Full-time staff",
    part_time: "Part-time staff",
    teacher: "Teacher",
    assistant_teacher: "Assistant teacher",
    contractor: "Contractor",
    other: "Other",
  };
  return labels[value];
}

function payBasisLabel(value: PayBasis) {
  const labels: Record<PayBasis, string> = {
    monthly_salary: "Monthly salary",
    hourly: "Hourly",
    per_class: "Per class",
    per_session: "Per session",
    custom: "Custom",
  };
  return labels[value];
}

function unitLabel(value: PayBasis) {
  if (value === "hourly") return "Hours";
  if (value === "per_class") return "Classes";
  if (value === "per_session") return "Sessions";
  if (value === "monthly_salary") return "Months";
  return "Units";
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function staffFormFromRow(row: StaffRow): StaffForm {
  return {
    person_id: row.person_id,
    full_name: row.full_name,
    email: row.email || "",
    phone: row.phone || "",
    person_notes: row.person_notes || "",
    staff_category: row.staff_category,
    job_title: row.job_title,
    status: row.employment_status,
    start_date: row.start_date,
    end_date: row.end_date || "",
    pay_basis: row.pay_basis,
    default_rate: String(numberValue(row.default_rate)),
    currency: row.currency || "SGD",
    employment_notes: row.employment_notes || "",
  };
}

export default function StaffPaymentsClient({
  companyCode,
  companyName,
}: {
  companyCode: CompanyCode;
  companyName: string;
}) {
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
  const [accessError, setAccessError] = useState("");
  const [people, setPeople] = useState<StaffPerson[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [roleCosts, setRoleCosts] = useState<RoleCostRow[]>([]);
  const [ytdRoleCosts, setYtdRoleCosts] = useState<RoleCostRow[]>([]);
  const [month, setMonth] = useState(currentMonthValue());
  const [search, setSearch] = useState("");
  const [staffStatus, setStaffStatus] = useState<"all" | EmploymentStatus>("active");
  const [paymentEmploymentId, setPaymentEmploymentId] = useState("");
  const [allPaymentHistory, setAllPaymentHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingEmploymentId, setEditingEmploymentId] = useState("");
  const [staffForm, setStaffForm] = useState<StaffForm>(EMPTY_STAFF_FORM);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(() => {
    const range = monthRange(currentMonthValue());
    return {
      payment_id: "",
      employment_id: "",
      period_start: range.start,
      period_end: range.end,
      units: "1",
      unit_rate: "0",
      base_pay: "",
      bonus: "0",
      allowances: "0",
      deductions: "0",
      other_adjustment: "0",
      status: "pending",
      paid_at: "",
      payment_method: "",
      payment_reference: "",
      notes: "",
    };
  });

  const period = useMemo(() => monthRange(month), [month]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: allowed, error: accessErrorResult } = await supabase.rpc(
      "billing_is_payroll_admin",
    );

    if (accessErrorResult) {
      setAccessError(accessErrorResult.message);
      setAccessStatus("error");
      setLoading(false);
      return;
    }

    if (!allowed) {
      setAccessStatus("locked");
      setLoading(false);
      return;
    }

    setAccessStatus("allowed");

    const reportYear = Number(month.slice(0, 4));
    const ytdStart = `${reportYear}-01-01`;

    const [peopleResult, staffResult, summaryResult, paymentsResult, roleCostResult, ytdRoleCostResult] =
      await Promise.all([
        supabase.rpc("billing_staff_people_list"),
        supabase.rpc("billing_staff_list", {
          p_company_code: companyCode,
        }),
        supabase.rpc("billing_staff_payment_summary", {
          p_company_code: companyCode,
          p_period_start: period.start,
          p_period_end: period.end,
        }),
        supabase.rpc("billing_staff_payments_list", {
          p_company_code: companyCode,
          p_employment_id: paymentEmploymentId || null,
          p_period_start: allPaymentHistory ? null : period.start,
          p_period_end: allPaymentHistory ? null : period.end,
          p_limit: 1000,
        }),
        supabase.rpc("billing_staff_role_cost_summary", {
          p_company_code: companyCode,
          p_period_start: period.start,
          p_period_end: period.end,
        }),
        supabase.rpc("billing_staff_role_cost_summary", {
          p_company_code: companyCode,
          p_period_start: ytdStart,
          p_period_end: period.end,
        }),
      ]);

    const firstError =
      peopleResult.error ||
      staffResult.error ||
      summaryResult.error ||
      paymentsResult.error ||
      roleCostResult.error ||
      ytdRoleCostResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setPeople((peopleResult.data || []) as StaffPerson[]);
    setStaff((staffResult.data || []) as StaffRow[]);
    setSummary((((summaryResult.data || []) as Summary[])[0] || null) as Summary | null);
    setPayments((paymentsResult.data || []) as PaymentRow[]);
    setRoleCosts((roleCostResult.data || []) as RoleCostRow[]);
    setYtdRoleCosts((ytdRoleCostResult.data || []) as RoleCostRow[]);
    setLoading(false);
  }, [allPaymentHistory, companyCode, month, paymentEmploymentId, period.end, period.start]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    return staff.filter((row) => {
      if (staffStatus !== "all" && row.employment_status !== staffStatus) {
        return false;
      }
      if (!term) return true;
      return [
        row.full_name,
        row.email,
        row.phone,
        row.job_title,
        categoryLabel(row.staff_category),
        payBasisLabel(row.pay_basis),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, staff, staffStatus]);

  const activeStaff = useMemo(
    () => staff.filter((row) => row.employment_status === "active"),
    [staff],
  );

  const selectedPaymentEmployment = useMemo(
    () => staff.find((row) => row.employment_id === paymentForm.employment_id) || null,
    [paymentForm.employment_id, staff],
  );

  const paymentPreview = useMemo(() => {
    const units = numberValue(paymentForm.units);
    const rate = numberValue(paymentForm.unit_rate);
    const automaticBase =
      selectedPaymentEmployment?.pay_basis === "monthly_salary"
        ? rate
        : units * rate;
    const base =
      paymentForm.base_pay.trim() === ""
        ? automaticBase
        : numberValue(paymentForm.base_pay);
    const total =
      base +
      numberValue(paymentForm.bonus) +
      numberValue(paymentForm.allowances) -
      numberValue(paymentForm.deductions) +
      numberValue(paymentForm.other_adjustment);
    return { base, total };
  }, [paymentForm, selectedPaymentEmployment?.pay_basis]);

  const payrollReporting = useMemo(() => {
    return roleCosts.reduce(
      (current, row) => ({
        base: current.base + numberValue(row.base_pay),
        bonus: current.bonus + numberValue(row.bonus),
        allowances: current.allowances + numberValue(row.allowances),
        deductions: current.deductions + numberValue(row.deductions),
        adjustments: current.adjustments + numberValue(row.other_adjustment),
        total: current.total + numberValue(row.total_amount),
      }),
      { base: 0, bonus: 0, allowances: 0, deductions: 0, adjustments: 0, total: 0 },
    );
  }, [roleCosts]);

  const ytdPaid = useMemo(
    () => ytdRoleCosts.reduce((sum, row) => sum + numberValue(row.paid_amount), 0),
    [ytdRoleCosts],
  );

  function exportPayrollCsv() {
    const rows: unknown[][] = [];
    rows.push([`${companyName} Staff Payments Export`]);
    rows.push(["Payroll month", monthLabel(month)]);
    rows.push(["Generated", new Date().toISOString()]);
    rows.push([]);
    rows.push(["MONTH SUMMARY"]);
    rows.push(["Active staff", Number(summary?.active_staff_count || 0)]);
    rows.push(["Payroll entries", Number(summary?.payment_count || 0)]);
    rows.push(["Pending", numberValue(summary?.pending_amount)]);
    rows.push(["Paid", numberValue(summary?.paid_amount)]);
    rows.push(["Period total", numberValue(summary?.total_amount)]);
    rows.push(["Base pay", payrollReporting.base]);
    rows.push(["Bonuses", payrollReporting.bonus]);
    rows.push(["Allowances", payrollReporting.allowances]);
    rows.push(["Deductions", payrollReporting.deductions]);
    rows.push(["Other adjustments", payrollReporting.adjustments]);
    rows.push(["YTD paid", ytdPaid]);
    rows.push([]);
    rows.push(["COST BY ROLE"]);
    rows.push(["Role", "Staff", "Entries", "Base", "Bonus", "Allowances", "Deductions", "Adjustments", "Total", "Pending", "Paid"]);
    for (const row of roleCosts) {
      rows.push([
        categoryLabel(row.staff_category), row.staff_count, row.payment_count, numberValue(row.base_pay), numberValue(row.bonus),
        numberValue(row.allowances), numberValue(row.deductions), numberValue(row.other_adjustment), numberValue(row.total_amount),
        numberValue(row.pending_amount), numberValue(row.paid_amount),
      ]);
    }
    rows.push([]);
    rows.push(["STAFF DIRECTORY"]);
    rows.push(["Name", "Email", "Phone", "Role", "Job title", "Status", "Start", "End", "Pay basis", "Standard rate", "Currency", "YTD paid"]);
    for (const row of staff) {
      rows.push([
        row.full_name, row.email || "", row.phone || "", categoryLabel(row.staff_category), row.job_title, row.employment_status,
        row.start_date, row.end_date || "", payBasisLabel(row.pay_basis), numberValue(row.default_rate), row.currency, numberValue(row.ytd_paid_amount),
      ]);
    }
    rows.push([]);
    rows.push(["PAYMENT LEDGER"]);
    rows.push(["Name", "Job title", "Role", "Period start", "Period end", "Pay basis", "Units", "Rate", "Base", "Bonus", "Allowances", "Deductions", "Adjustment", "Total", "Status", "Paid date", "Method", "Reference", "Notes"]);
    for (const row of payments) {
      rows.push([
        row.full_name, row.job_title, categoryLabel(row.staff_category), row.period_start, row.period_end, payBasisLabel(row.pay_basis_snapshot),
        numberValue(row.units), numberValue(row.unit_rate), numberValue(row.base_pay), numberValue(row.bonus), numberValue(row.allowances),
        numberValue(row.deductions), numberValue(row.other_adjustment), numberValue(row.total_amount), row.payment_status, row.paid_at || "",
        row.payment_method || "", row.payment_reference || "", row.notes || "",
      ]);
    }
    downloadCsv(`${companyCode}-staff-payments-${month}.csv`, rows);
  }

  function openNewStaff() {
    setEditingEmploymentId("");
    setStaffForm({ ...EMPTY_STAFF_FORM, start_date: singaporeToday() });
    setError("");
    setStaffModalOpen(true);
  }

  function openEditStaff(row: StaffRow) {
    setEditingEmploymentId(row.employment_id);
    setStaffForm(staffFormFromRow(row));
    setError("");
    setStaffModalOpen(true);
  }

  function selectExistingPerson(personId: string) {
    if (!personId) {
      setStaffForm((current) => ({
        ...current,
        person_id: "",
        full_name: "",
        email: "",
        phone: "",
        person_notes: "",
      }));
      return;
    }

    const person = people.find((item) => item.id === personId);
    if (!person) return;

    setStaffForm((current) => ({
      ...current,
      person_id: person.id,
      full_name: person.full_name,
      email: person.email || "",
      phone: person.phone || "",
      person_notes: person.notes || "",
    }));
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const defaultRate = Number(staffForm.default_rate);
    if (!staffForm.full_name.trim()) {
      setError("Enter the staff member's name.");
      return;
    }
    if (!Number.isFinite(defaultRate) || defaultRate < 0) {
      setError("Enter a valid default salary or pay rate.");
      return;
    }

    setWorking(true);
    const { error: saveError } = await supabase.rpc(
      "billing_staff_save_employment",
      {
        p_company_code: companyCode,
        p_person_id: staffForm.person_id || null,
        p_full_name: staffForm.full_name.trim(),
        p_email: staffForm.email.trim() || null,
        p_phone: staffForm.phone.trim() || null,
        p_person_notes: staffForm.person_notes.trim() || null,
        p_staff_category: staffForm.staff_category,
        p_job_title: staffForm.job_title.trim() || "Staff",
        p_status: staffForm.status,
        p_start_date: staffForm.start_date,
        p_end_date: staffForm.end_date || null,
        p_pay_basis: staffForm.pay_basis,
        p_default_rate: defaultRate,
        p_currency: staffForm.currency.trim() || "SGD",
        p_employment_notes: staffForm.employment_notes.trim() || null,
      },
    );

    if (saveError) {
      setError(saveError.message);
    } else {
      setStaffModalOpen(false);
      setNotice(
        editingEmploymentId
          ? `${staffForm.full_name}'s staff record was updated.`
          : `${staffForm.full_name} was added to ${companyName}.`,
      );
      await load();
    }
    setWorking(false);
  }

  async function changeEmploymentStatus(
    row: StaffRow,
    status: EmploymentStatus,
  ) {
    const label = status === "active" ? "reactivate" : status === "ended" ? "end" : "deactivate";
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} ${row.full_name}'s ${companyName} employment record?`)) {
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");
    const { error: statusError } = await supabase.rpc(
      "billing_staff_set_employment_status",
      {
        p_employment_id: row.employment_id,
        p_status: status,
        p_end_date: status === "ended" ? singaporeToday() : null,
      },
    );

    if (statusError) {
      setError(statusError.message);
    } else {
      setNotice(`${row.full_name} is now ${status}.`);
      await load();
    }
    setWorking(false);
  }

  function openNewPayment(row?: StaffRow) {
    const target = row || activeStaff[0] || null;
    const range = period;
    const rate = target ? numberValue(target.default_rate) : 0;
    setPaymentForm({
      payment_id: "",
      employment_id: target?.employment_id || "",
      period_start: range.start,
      period_end: range.end,
      units: target?.pay_basis === "monthly_salary" ? "1" : "0",
      unit_rate: String(rate),
      base_pay: target?.pay_basis === "monthly_salary" ? String(rate) : "",
      bonus: "0",
      allowances: "0",
      deductions: "0",
      other_adjustment: "0",
      status: "pending",
      paid_at: "",
      payment_method: "",
      payment_reference: "",
      notes: "",
    });
    setError("");
    setPaymentModalOpen(true);
  }

  function selectPaymentEmployment(employmentId: string) {
    const target = staff.find((row) => row.employment_id === employmentId);
    setPaymentForm((current) => ({
      ...current,
      employment_id: employmentId,
      units: target?.pay_basis === "monthly_salary" ? "1" : current.units || "0",
      unit_rate: target ? String(numberValue(target.default_rate)) : current.unit_rate,
      base_pay:
        target?.pay_basis === "monthly_salary"
          ? String(numberValue(target.default_rate))
          : "",
    }));
  }

  function openEditPayment(row: PaymentRow) {
    setPaymentForm({
      payment_id: row.payment_id,
      employment_id: row.employment_id,
      period_start: row.period_start,
      period_end: row.period_end,
      units: String(numberValue(row.units)),
      unit_rate: String(numberValue(row.unit_rate)),
      base_pay: String(numberValue(row.base_pay)),
      bonus: String(numberValue(row.bonus)),
      allowances: String(numberValue(row.allowances)),
      deductions: String(numberValue(row.deductions)),
      other_adjustment: String(numberValue(row.other_adjustment)),
      status: row.payment_status === "paid" ? "paid" : "pending",
      paid_at: row.paid_at || "",
      payment_method: row.payment_method || "",
      payment_reference: row.payment_reference || "",
      notes: row.notes || "",
    });
    setError("");
    setPaymentModalOpen(true);
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!paymentForm.employment_id) {
      setError("Choose a staff member.");
      return;
    }

    const numericValues = [
      paymentForm.units,
      paymentForm.unit_rate,
      paymentForm.bonus,
      paymentForm.allowances,
      paymentForm.deductions,
      paymentForm.other_adjustment,
    ].map(Number);

    if (numericValues.some((value) => !Number.isFinite(value))) {
      setError("Check the payment amounts and units.");
      return;
    }

    if (paymentPreview.total < 0) {
      setError("Total payable cannot be negative.");
      return;
    }

    setWorking(true);
    const { error: saveError } = await supabase.rpc(
      "billing_staff_save_payment",
      {
        p_employment_id: paymentForm.employment_id,
        p_payment_id: paymentForm.payment_id || null,
        p_period_start: paymentForm.period_start,
        p_period_end: paymentForm.period_end,
        p_units: Number(paymentForm.units || 0),
        p_unit_rate: Number(paymentForm.unit_rate || 0),
        p_base_pay:
          paymentForm.base_pay.trim() === ""
            ? null
            : Number(paymentForm.base_pay),
        p_bonus: Number(paymentForm.bonus || 0),
        p_allowances: Number(paymentForm.allowances || 0),
        p_deductions: Number(paymentForm.deductions || 0),
        p_other_adjustment: Number(paymentForm.other_adjustment || 0),
        p_status: paymentForm.status,
        p_paid_at: paymentForm.status === "paid" ? paymentForm.paid_at || null : null,
        p_payment_method: paymentForm.payment_method.trim() || null,
        p_payment_reference: paymentForm.payment_reference.trim() || null,
        p_notes: paymentForm.notes.trim() || null,
      },
    );

    if (saveError) {
      setError(saveError.message);
    } else {
      const selected = staff.find((row) => row.employment_id === paymentForm.employment_id);
      setPaymentModalOpen(false);
      setNotice(
        `${selected?.full_name || "Staff"} payment ${paymentForm.payment_id ? "updated" : "recorded"}: ${money(paymentPreview.total, selected?.currency || "SGD")}.`,
      );
      await load();
    }
    setWorking(false);
  }

  async function voidPayment(row: PaymentRow) {
    const reason = window.prompt(
      `Reason for voiding ${row.full_name}'s ${date(row.period_start)} payment record:`,
      "Payroll correction",
    );
    if (reason === null) return;

    setWorking(true);
    setError("");
    setNotice("");
    const { error: voidError } = await supabase.rpc(
      "billing_staff_void_payment",
      {
        p_payment_id: row.payment_id,
        p_reason: reason.trim() || null,
      },
    );

    if (voidError) {
      setError(voidError.message);
    } else {
      setNotice("Payment record voided. The audit history is retained.");
      await load();
    }
    setWorking(false);
  }

  function showStaffHistory(row: StaffRow) {
    setPaymentEmploymentId(row.employment_id);
    setAllPaymentHistory(true);
    window.setTimeout(() => {
      document.getElementById("staff-payment-history")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  if (accessStatus === "checking") {
    return (
      <BillingAdminShell
        eyebrow={`${companyName} finance`}
        title="Staff Payments"
        description="Salaries, teaching pay, bonuses and company-specific staff payment history."
      >
        <MessageCard>Checking payroll access…</MessageCard>
      </BillingAdminShell>
    );
  }

  if (accessStatus === "locked") {
    return (
      <BillingAdminShell
        eyebrow={`${companyName} finance`}
        title="Staff Payments"
        description="Salaries, teaching pay, bonuses and company-specific staff payment history."
      >
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Restricted finance data</p>
          <h2 className="mt-3 text-xl font-semibold text-[#15233b]">Administrator access required</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900/75">
            Staff salary and payment records are intentionally limited to administrators even when another staff member can access the general billing workspace.
          </p>
        </section>
      </BillingAdminShell>
    );
  }

  if (accessStatus === "error") {
    return (
      <BillingAdminShell
        eyebrow={`${companyName} finance`}
        title="Staff Payments"
        description="Salaries, teaching pay, bonuses and company-specific staff payment history."
      >
        <Alert tone="error">{accessError || "Payroll access could not be checked."}</Alert>
      </BillingAdminShell>
    );
  }

  return (
    <BillingAdminShell
      eyebrow={`${companyName} finance`}
      title="Staff Payments"
      description={`Maintain ${companyName} staff records, salary or teaching rates, bonuses, adjustments and payment history. Staff identity is shared across the Billing Platform, while employment and payments remain company-specific.`}
      actions={
        <>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || working}
            className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={exportPayrollCsv}
            disabled={loading || working}
            className="min-h-11 rounded-full border border-[#c8a45c] bg-[#fff9eb] px-4 text-xs font-black text-[#725719] disabled:opacity-50"
          >
            Export payroll CSV
          </button>
          <button
            type="button"
            onClick={openNewStaff}
            disabled={working}
            className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-black text-white disabled:opacity-50"
          >
            + Add staff
          </button>
          <button
            type="button"
            onClick={() => openNewPayment()}
            disabled={working || activeStaff.length === 0}
            className="min-h-11 rounded-full border border-[#c8a45c] bg-[#fff9eb] px-5 text-xs font-black text-[#725719] disabled:opacity-50"
          >
            + Add payment period
          </button>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Payroll period</p>
            <h2 className="mt-2 text-xl font-semibold">{monthLabel(month)}</h2>
            <p className="mt-2 text-xs leading-5 text-[#81796d]">
              Internal staff-payment ledger only. CPF, SDL, tax filing and formal payslips are not automatically calculated in this phase.
            </p>
          </div>
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#83796b]">Month</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="min-h-11 rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm font-bold"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Active staff" value={String(Number(summary?.active_staff_count || 0))} />
          <Metric label="Payroll entries" value={String(Number(summary?.payment_count || 0))} />
          <Metric label="Pending" value={money(summary?.pending_amount || 0)} detail={`${Number(summary?.pending_count || 0)} record(s)`} />
          <Metric label="Paid" value={money(summary?.paid_amount || 0)} detail={`${Number(summary?.paid_count || 0)} record(s)`} />
          <Metric label="Period total" value={money(summary?.total_amount || 0)} />
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Payroll reporting</p>
            <h2 className="mt-2 text-xl font-semibold">Cost composition and YTD</h2>
            <p className="mt-2 text-xs leading-5 text-[#81796d]">Bonuses, allowances, deductions and role costs are calculated from the staff-payment ledger. No statutory payroll deductions are inferred.</p>
          </div>
          <div className="rounded-2xl border border-[#d7c9ae] bg-[#fbfaf7] px-4 py-3 text-right">
            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">YTD paid</span>
            <strong className="mt-1 block text-lg text-[#15233b]">{money(ytdPaid)}</strong>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Base pay" value={money(payrollReporting.base)} />
          <Metric label="Bonuses" value={money(payrollReporting.bonus)} />
          <Metric label="Allowances" value={money(payrollReporting.allowances)} />
          <Metric label="Deductions" value={money(payrollReporting.deductions)} />
          <Metric label="Adjustments" value={money(payrollReporting.adjustments)} />
        </div>

        {roleCosts.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {roleCosts.map((row) => (
              <article key={row.staff_category} className="rounded-2xl border border-[#ebe5da] bg-[#fbfaf7] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <strong className="block text-sm">{categoryLabel(row.staff_category)}</strong>
                    <span className="mt-1 block text-xs text-[#81796d]">{row.staff_count} staff · {row.payment_count} entr{row.payment_count === 1 ? "y" : "ies"}</span>
                  </div>
                  <strong className="text-sm">{money(row.total_amount)}</strong>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#81796d]">
                  <span>Bonus {money(row.bonus)}</span>
                  <span>Paid {money(row.paid_amount)}</span>
                  <span>Pending {money(row.pending_amount)}</span>
                  <span>Deductions {money(row.deductions)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Staff directory</p>
            <h2 className="mt-2 text-xl font-semibold">{companyName} staff</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_170px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff, role or email"
              className="min-h-11 rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm outline-none"
            />
            <select
              value={staffStatus}
              onChange={(event) => setStaffStatus(event.target.value as typeof staffStatus)}
              className="min-h-11 rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm font-bold"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>

        {loading ? (
          <MessageCard>Loading staff records…</MessageCard>
        ) : filteredStaff.length === 0 ? (
          <MessageCard>No staff records match this view.</MessageCard>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Pay basis</th>
                  <th className="px-4 py-3">Standard rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last payment</th>
                  <th className="px-4 py-3">YTD paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((row) => (
                  <tr key={row.employment_id} className="border-b border-[#f0ece4] last:border-0">
                    <td className="px-4 py-4">
                      <strong className="block text-sm text-[#15233b]">{row.full_name}</strong>
                      <span className="mt-1 block text-xs text-[#81796d]">{row.email || row.phone || "No contact entered"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <strong className="block text-sm">{row.job_title}</strong>
                      <span className="mt-1 block text-xs text-[#81796d]">{categoryLabel(row.staff_category)}</span>
                    </td>
                    <td className="px-4 py-4 text-sm">{payBasisLabel(row.pay_basis)}</td>
                    <td className="px-4 py-4 text-sm font-bold">{money(row.default_rate, row.currency)}</td>
                    <td className="px-4 py-4"><StatusPill status={row.employment_status} /></td>
                    <td className="px-4 py-4 text-sm">
                      {row.last_payment_date ? (
                        <><strong>{money(row.last_payment_amount, row.currency)}</strong><span className="mt-1 block text-xs text-[#81796d]">{date(row.last_payment_date)}</span></>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold">{money(row.ytd_paid_amount, row.currency)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => openEditStaff(row)} className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[10px] font-bold">Edit</button>
                        <button type="button" onClick={() => openNewPayment(row)} disabled={row.employment_status !== "active"} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 disabled:opacity-40">Add payment</button>
                        <button type="button" onClick={() => showStaffHistory(row)} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-bold text-sky-700">History</button>
                        {row.employment_status === "active" ? (
                          <button type="button" onClick={() => void changeEmploymentStatus(row, "inactive")} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-700">Deactivate</button>
                        ) : (
                          <button type="button" onClick={() => void changeEmploymentStatus(row, "active")} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">Reactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="staff-payment-history" className="mt-6 scroll-mt-28 rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Payment ledger</p>
            <h2 className="mt-2 text-xl font-semibold">Staff payment history</h2>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#83796b]">Staff</span>
              <select
                value={paymentEmploymentId}
                onChange={(event) => setPaymentEmploymentId(event.target.value)}
                className="min-h-11 min-w-[220px] rounded-xl border border-[#d9cfbd] bg-white px-3 text-sm"
              >
                <option value="">All staff</option>
                {staff.map((row) => <option key={row.employment_id} value={row.employment_id}>{row.full_name} · {row.job_title}</option>)}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d9cfbd] bg-white px-4 text-xs font-bold">
              <input type="checkbox" checked={allPaymentHistory} onChange={(event) => setAllPaymentHistory(event.target.checked)} />
              All history
            </label>
            {(paymentEmploymentId || allPaymentHistory) && (
              <button
                type="button"
                onClick={() => { setPaymentEmploymentId(""); setAllPaymentHistory(false); }}
                className="min-h-11 rounded-xl border border-[#d9cfbd] bg-white px-4 text-xs font-bold"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-[#81796d]">
          {allPaymentHistory ? "Showing all recorded periods." : `Showing records overlapping ${monthLabel(month)}.`}
        </p>

        {payments.length === 0 ? (
          <MessageCard>No staff payments have been recorded for this view.</MessageCard>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1450px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Basis</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">Bonus</th>
                  <th className="px-4 py-3">Allowance</th>
                  <th className="px-4 py-3">Deduction</th>
                  <th className="px-4 py-3">Adjustment</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.payment_id} className={`border-b border-[#f0ece4] last:border-0 ${row.payment_status === "void" ? "opacity-55" : ""}`}>
                    <td className="px-4 py-4"><strong className="block text-sm">{row.full_name}</strong><span className="mt-1 block text-xs text-[#81796d]">{row.job_title}</span></td>
                    <td className="px-4 py-4 text-sm">{date(row.period_start)}<span className="mt-1 block text-xs text-[#81796d]">to {date(row.period_end)}</span></td>
                    <td className="px-4 py-4 text-xs">{payBasisLabel(row.pay_basis_snapshot)}<span className="mt-1 block text-[#81796d]">{numberValue(row.units)} × {money(row.unit_rate, row.currency)}</span></td>
                    <td className="px-4 py-4 text-sm">{money(row.base_pay, row.currency)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.bonus, row.currency)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.allowances, row.currency)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.deductions, row.currency)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.other_adjustment, row.currency)}</td>
                    <td className="px-4 py-4 text-sm font-black">{money(row.total_amount, row.currency)}</td>
                    <td className="px-4 py-4"><StatusPill status={row.payment_status} /></td>
                    <td className="px-4 py-4 text-sm">{date(row.paid_at)}</td>
                    <td className="px-4 py-4">
                      {row.payment_status !== "void" && (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEditPayment(row)} className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[10px] font-bold">Edit</button>
                          <button type="button" onClick={() => void voidPayment(row)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">Void</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={staffModalOpen}
        onClose={() => !working && setStaffModalOpen(false)}
        title={editingEmploymentId ? "Edit staff record" : `Add ${companyName} staff`}
        description="One person can be linked to both company workspaces. Their employment terms and payment ledger stay separate for each company."
      >
        <form onSubmit={saveStaff} className="grid gap-4">
          {!editingEmploymentId && people.length > 0 && (
            <Field label="Existing person (optional)">
              <select
                value={staffForm.person_id}
                onChange={(event) => selectExistingPerson(event.target.value)}
                className={inputClass}
              >
                <option value="">Create a new staff identity</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name}{person.company_codes.length ? ` · already in ${person.company_codes.join(" + ")}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" value={staffForm.full_name} onChange={(value) => setStaffForm((current) => ({ ...current, full_name: value }))} required />
            <TextField label="Email" type="email" value={staffForm.email} onChange={(value) => setStaffForm((current) => ({ ...current, email: value }))} />
            <TextField label="Phone" value={staffForm.phone} onChange={(value) => setStaffForm((current) => ({ ...current, phone: value }))} />
            <TextField label="Job title" value={staffForm.job_title} onChange={(value) => setStaffForm((current) => ({ ...current, job_title: value }))} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Staff type" value={staffForm.staff_category} onChange={(value) => setStaffForm((current) => ({ ...current, staff_category: value as StaffCategory }))} options={[
              ["management", "Management"], ["full_time", "Full-time staff"], ["part_time", "Part-time staff"], ["teacher", "Teacher"], ["assistant_teacher", "Assistant teacher"], ["contractor", "Contractor"], ["other", "Other"],
            ]} />
            <SelectField label="Employment status" value={staffForm.status} onChange={(value) => setStaffForm((current) => ({ ...current, status: value as EmploymentStatus }))} options={[["active", "Active"], ["inactive", "Inactive"], ["ended", "Ended"]]} />
            <SelectField label="Pay basis" value={staffForm.pay_basis} onChange={(value) => setStaffForm((current) => ({ ...current, pay_basis: value as PayBasis }))} options={[["monthly_salary", "Monthly salary"], ["hourly", "Hourly"], ["per_class", "Per class"], ["per_session", "Per session"], ["custom", "Custom"]]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <TextField label="Start date" type="date" value={staffForm.start_date} onChange={(value) => setStaffForm((current) => ({ ...current, start_date: value }))} required />
            <TextField label="End date" type="date" value={staffForm.end_date} onChange={(value) => setStaffForm((current) => ({ ...current, end_date: value }))} />
            <TextField label="Standard salary / rate" type="number" min="0" step="0.01" value={staffForm.default_rate} onChange={(value) => setStaffForm((current) => ({ ...current, default_rate: value }))} required />
            <TextField label="Currency" value={staffForm.currency} onChange={(value) => setStaffForm((current) => ({ ...current, currency: value.toUpperCase() }))} required />
          </div>

          <TextArea label="Shared staff notes" value={staffForm.person_notes} onChange={(value) => setStaffForm((current) => ({ ...current, person_notes: value }))} placeholder="Details that apply to this person across both companies." />
          <TextArea label={`${companyName} employment notes`} value={staffForm.employment_notes} onChange={(value) => setStaffForm((current) => ({ ...current, employment_notes: value }))} placeholder="Company-specific employment notes." />

          <ModalActions working={working} onCancel={() => setStaffModalOpen(false)} submitLabel="Save staff" />
        </form>
      </Modal>

      <Modal
        open={paymentModalOpen}
        onClose={() => !working && setPaymentModalOpen(false)}
        title={paymentForm.payment_id ? "Edit staff payment" : "Add payment period"}
        description="Record base pay plus bonuses, allowances, deductions and adjustments. Mark it Paid only after the payment has actually been made."
        wide
      >
        <form onSubmit={savePayment} className="grid gap-4">
          <Field label="Staff member">
            <select value={paymentForm.employment_id} onChange={(event) => selectPaymentEmployment(event.target.value)} className={inputClass} required>
              <option value="">Choose staff member</option>
              {staff.filter((row) => row.employment_status !== "ended" || row.employment_id === paymentForm.employment_id).map((row) => (
                <option key={row.employment_id} value={row.employment_id}>{row.full_name} · {row.job_title}</option>
              ))}
            </select>
          </Field>

          {selectedPaymentEmployment && (
            <div className="rounded-2xl border border-[#e6dfd3] bg-[#fbfaf7] p-4 text-xs leading-5 text-[#6f675a]">
              <strong className="text-[#15233b]">{payBasisLabel(selectedPaymentEmployment.pay_basis)}</strong> · Standard rate {money(selectedPaymentEmployment.default_rate, selectedPaymentEmployment.currency)}. {selectedPaymentEmployment.pay_basis === "monthly_salary" ? "Base pay defaults to the monthly salary." : "Leave Base pay override blank to calculate units × rate."}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Pay period start" type="date" value={paymentForm.period_start} onChange={(value) => setPaymentForm((current) => ({ ...current, period_start: value }))} required />
            <TextField label="Pay period end" type="date" value={paymentForm.period_end} onChange={(value) => setPaymentForm((current) => ({ ...current, period_end: value }))} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label={unitLabel(selectedPaymentEmployment?.pay_basis || "custom")} type="number" min="0" step="0.25" value={paymentForm.units} onChange={(value) => setPaymentForm((current) => ({ ...current, units: value }))} required />
            <TextField label="Rate" type="number" min="0" step="0.01" value={paymentForm.unit_rate} onChange={(value) => setPaymentForm((current) => ({ ...current, unit_rate: value }))} required />
            <TextField label="Base pay override" type="number" min="0" step="0.01" value={paymentForm.base_pay} onChange={(value) => setPaymentForm((current) => ({ ...current, base_pay: value }))} placeholder="Auto" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TextField label="Bonus" type="number" min="0" step="0.01" value={paymentForm.bonus} onChange={(value) => setPaymentForm((current) => ({ ...current, bonus: value }))} />
            <TextField label="Allowances" type="number" min="0" step="0.01" value={paymentForm.allowances} onChange={(value) => setPaymentForm((current) => ({ ...current, allowances: value }))} />
            <TextField label="Deductions" type="number" min="0" step="0.01" value={paymentForm.deductions} onChange={(value) => setPaymentForm((current) => ({ ...current, deductions: value }))} />
            <TextField label="Other adjustment (+ / −)" type="number" step="0.01" value={paymentForm.other_adjustment} onChange={(value) => setPaymentForm((current) => ({ ...current, other_adjustment: value }))} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">Calculated base</p>
              <strong className="mt-2 block text-xl">{money(paymentPreview.base, selectedPaymentEmployment?.currency || "SGD")}</strong>
            </div>
            <div className="rounded-2xl border border-[#15233b] bg-[#15233b] p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">Total payable</p>
              <strong className="mt-2 block text-xl text-[#f0cf87]">{money(paymentPreview.total, selectedPaymentEmployment?.currency || "SGD")}</strong>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Status" value={paymentForm.status} onChange={(value) => setPaymentForm((current) => ({ ...current, status: value as "pending" | "paid" }))} options={[["pending", "Pending"], ["paid", "Paid"]]} />
            <TextField label="Payment date" type="date" value={paymentForm.paid_at} onChange={(value) => setPaymentForm((current) => ({ ...current, paid_at: value }))} disabled={paymentForm.status !== "paid"} />
            <TextField label="Payment method" value={paymentForm.payment_method} onChange={(value) => setPaymentForm((current) => ({ ...current, payment_method: value }))} placeholder="Bank transfer" />
            <TextField label="Reference" value={paymentForm.payment_reference} onChange={(value) => setPaymentForm((current) => ({ ...current, payment_reference: value }))} />
          </div>

          <TextArea label="Payment notes" value={paymentForm.notes} onChange={(value) => setPaymentForm((current) => ({ ...current, notes: value }))} />
          <ModalActions working={working} onCancel={() => setPaymentModalOpen(false)} submitLabel={paymentForm.payment_id ? "Save payment" : "Add payment"} />
        </form>
      </Modal>
    </BillingAdminShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-[#e7dfd2] bg-[#fbfaf7] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">{label}</p>
      <strong className="mt-2 block text-xl text-[#15233b]">{value}</strong>
      {detail && <span className="mt-1 block text-[11px] text-[#81796d]">{detail}</span>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const value = String(status || "unknown").toLowerCase();
  const classes =
    value === "active" || value === "paid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "pending" || value === "inactive"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : value === "void" || value === "ended"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#ded5c4] bg-[#fbfaf7] text-[#81796d]";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${classes}`}>{value.replaceAll("_", " ")}</span>;
}

function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</div>;
}

function MessageCard({ children }: { children: ReactNode }) {
  return <div className="mt-5 rounded-2xl border border-[#e6dfd3] bg-[#fbfaf7] p-5 text-sm text-[#81796d]">{children}</div>;
}

const inputClass = "min-h-11 w-full rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm outline-none focus:border-[#a27627]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#83796b]">{label}</span>{children}</label>;
}

function TextField({ label, value, onChange, type = "text", required = false, disabled = false, min, step, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; disabled?: boolean; min?: string; step?: string; placeholder?: string }) {
  return <Field label={label}><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} min={min} step={step} placeholder={placeholder} className={`${inputClass} disabled:bg-[#f2eee6] disabled:text-[#9b9388]`} /></Field>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <Field label={label}><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className={`${inputClass} min-h-[90px] py-3`} /></Field>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></Field>;
}

function Modal({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/55 p-4 sm:p-6" role="dialog" aria-modal="true">
      <div className={`mx-auto my-4 rounded-[2rem] border border-[#ded5c4] bg-[#f8f5ee] p-5 shadow-[0_35px_110px_rgba(0,0,0,0.35)] sm:p-7 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-2xl font-semibold text-[#15233b]">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#777065]">{description}</p></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d7c9ae] bg-white text-xl">×</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ working, onCancel, submitLabel }: { working: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-[#e4dbcd] pt-5">
      <button type="button" onClick={onCancel} disabled={working} className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50">Cancel</button>
      <button type="submit" disabled={working} className="min-h-11 rounded-full bg-[#15233b] px-6 text-xs font-black text-white disabled:opacity-50">{working ? "Saving…" : submitLabel}</button>
    </div>
  );
}
