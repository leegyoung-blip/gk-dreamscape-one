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
  | "custom"
  | "invoice_commission";

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


type CommissionDashboardRow = {
  employment_id: string;
  person_id: string;
  full_name: string;
  job_title: string;
  employment_status: EmploymentStatus;
  currency: string;
  plan_status: string | null;
  months_1_3_rate: number | string | null;
  months_4_6_rate: number | string | null;
  month_7_plus_rate: number | string | null;
  live_finalized_invoice_count: number | null;
  live_draft_review_invoice_count: number | null;
  live_student_count: number | null;
  live_gross_invoice_total: number | string | null;
  live_excluded_deposit_total: number | string | null;
  live_commissionable_total: number | string | null;
  live_commission_total: number | string | null;
  live_unresolved_item_count: number | null;
  live_unresolved_amount: number | string | null;
  calculation_id: string | null;
  calculation_version: number | null;
  calculation_status: string | null;
  calculation_basis: string | null;
  calculation_student_count: number | null;
  finalized_invoice_count: number | null;
  draft_review_invoice_count: number | null;
  gross_invoice_total: number | string | null;
  excluded_deposit_total: number | string | null;
  commissionable_total: number | string | null;
  commission_total: number | string | null;
  unresolved_item_count: number | null;
  unresolved_amount: number | string | null;
  staff_payment_id: string | null;
  payment_status: PaymentStatus | null;
  payment_total: number | string | null;
  bonus: number | string | null;
  allowances: number | string | null;
  deductions: number | string | null;
  other_adjustment: number | string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
};

type CommissionStudentLine = {
  invoice_id: string | null;
  invoice_number: string;
  payer_name: string | null;
  invoice_status: string;
  invoice_total: number | string;
  student_id: string | null;
  student_name: string;
  student_start_date: string;
  student_month: number;
  rate_percent: number | string;
  invoice_item_count: number;
  commissionable_amount: number | string;
  commission_amount: number | string;
};

type CommissionCandidateStudent = {
  student_id: string;
  student_name: string;
  student_start_date: string | null;
};

type CommissionUnresolvedItem = {
  invoice_item_id: string;
  invoice_id: string;
  invoice_number: string;
  payer_name: string | null;
  item_type: string;
  item_description: string;
  item_amount: number | string;
  unresolved_reason: string;
  candidate_students: CommissionCandidateStudent[] | null;
};

type CommissionPlanForm = {
  employment_id: string;
  full_name: string;
  job_title: string;
  months_1_3_rate: string;
  months_4_6_rate: string;
  month_7_plus_rate: string;
};

type CommissionPaymentForm = {
  calculation_id: string;
  employment_id: string;
  full_name: string;
  job_title: string;
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

type CommissionPaymentLookup = {
  calculation_id: string;
  employment_id: string;
  billing_period: string;
  calculation_status: string;
  is_current: boolean;
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
    invoice_commission: "Invoice commission",
  };
  return labels[value];
}

function unitLabel(value: PayBasis) {
  if (value === "hourly") return "Hours";
  if (value === "per_class") return "Classes";
  if (value === "per_session") return "Sessions";
  if (value === "monthly_salary") return "Months";
  if (value === "invoice_commission") return "Students";
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


  const [commissionRows, setCommissionRows] = useState<CommissionDashboardRow[]>([]);
  const [commissionPlanModalOpen, setCommissionPlanModalOpen] = useState(false);
  const [commissionPlanForm, setCommissionPlanForm] = useState<CommissionPlanForm>({
    employment_id: "",
    full_name: "",
    job_title: "",
    months_1_3_rate: "50",
    months_4_6_rate: "30",
    month_7_plus_rate: "25",
  });
  const [commissionBreakdownModalOpen, setCommissionBreakdownModalOpen] = useState(false);
  const [commissionBreakdownRow, setCommissionBreakdownRow] = useState<CommissionDashboardRow | null>(null);
  const [commissionLines, setCommissionLines] = useState<CommissionStudentLine[]>([]);
  const [commissionLinesLoading, setCommissionLinesLoading] = useState(false);
  const [commissionUnresolvedModalOpen, setCommissionUnresolvedModalOpen] = useState(false);
  const [commissionUnresolvedRow, setCommissionUnresolvedRow] = useState<CommissionDashboardRow | null>(null);
  const [commissionUnresolvedItems, setCommissionUnresolvedItems] = useState<CommissionUnresolvedItem[]>([]);
  const [commissionUnresolvedLoading, setCommissionUnresolvedLoading] = useState(false);
  const [commissionAssignmentValues, setCommissionAssignmentValues] = useState<Record<string, string>>({});
  const [commissionPaymentModalOpen, setCommissionPaymentModalOpen] = useState(false);
  const [commissionPaymentRow, setCommissionPaymentRow] = useState<CommissionDashboardRow | null>(null);
  const [commissionPaymentForm, setCommissionPaymentForm] = useState<CommissionPaymentForm>({
    calculation_id: "",
    employment_id: "",
    full_name: "",
    job_title: "",
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

    let loadedCommissionRows: CommissionDashboardRow[] = [];

    if (companyCode === "gkp") {
      const commissionResult = await supabase.rpc(
        "billing_staff_commission_dashboard_v2",
        {
          p_billing_period: period.start,
        },
      );

      if (commissionResult.error) {
        setError(commissionResult.error.message);
        setLoading(false);
        return;
      }

      loadedCommissionRows =
        (commissionResult.data || []) as CommissionDashboardRow[];
    }

    setPeople((peopleResult.data || []) as StaffPerson[]);
    setStaff((staffResult.data || []) as StaffRow[]);
    setSummary((((summaryResult.data || []) as Summary[])[0] || null) as Summary | null);
    setPayments((paymentsResult.data || []) as PaymentRow[]);
    setRoleCosts((roleCostResult.data || []) as RoleCostRow[]);
    setYtdRoleCosts((ytdRoleCostResult.data || []) as RoleCostRow[]);
    setCommissionRows(loadedCommissionRows);
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

  const payBasisOptions: Array<[string, string]> =
    companyCode === "gkp"
      ? [
          ["monthly_salary", "Monthly salary"],
          ["hourly", "Hourly"],
          ["per_class", "Per class"],
          ["per_session", "Per session"],
          ["custom", "Custom"],
          ["invoice_commission", "Invoice commission"],
        ]
      : [
          ["monthly_salary", "Monthly salary"],
          ["hourly", "Hourly"],
          ["per_class", "Per class"],
          ["per_session", "Per session"],
          ["custom", "Custom"],
        ];

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


  const commissionPaymentPreview = useMemo(() => {
    const base = numberValue(commissionPaymentRow?.commission_total);
    const total =
      base +
      numberValue(commissionPaymentForm.bonus) +
      numberValue(commissionPaymentForm.allowances) -
      numberValue(commissionPaymentForm.deductions) +
      numberValue(commissionPaymentForm.other_adjustment);

    return { base, total };
  }, [
    commissionPaymentForm.allowances,
    commissionPaymentForm.bonus,
    commissionPaymentForm.deductions,
    commissionPaymentForm.other_adjustment,
    commissionPaymentRow?.commission_total,
  ]);

  const commissionPaymentLocked =
    commissionPaymentRow?.payment_status === "paid" ||
    commissionPaymentRow?.calculation_status === "locked";

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

  async function exportPayrollCsv() {
    setError("");

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

    if (companyCode === "gkp" && commissionRows.length > 0) {
      rows.push([]);
      rows.push(["STUDENT-BASED INVOICE COMMISSION SUMMARY"]);
      rows.push([
        "Name",
        "Job title",
        "Months 1-3 %",
        "Months 4-6 %",
        "Month 7+ %",
        "Finalized invoices",
        "Draft/review invoices",
        "Students",
        "Gross invoices",
        "Refundable deposits excluded",
        "Commissionable total",
        "Commission",
        "Unresolved items",
        "Unresolved amount",
        "Payroll status",
        "Payroll total",
      ]);

      for (const row of commissionRows) {
        rows.push([
          row.full_name,
          row.job_title,
          row.months_1_3_rate == null ? "" : numberValue(row.months_1_3_rate),
          row.months_4_6_rate == null ? "" : numberValue(row.months_4_6_rate),
          row.month_7_plus_rate == null ? "" : numberValue(row.month_7_plus_rate),
          Number(row.calculation_id ? row.finalized_invoice_count || 0 : row.live_finalized_invoice_count || 0),
          Number(row.calculation_id ? row.draft_review_invoice_count || 0 : row.live_draft_review_invoice_count || 0),
          Number(row.calculation_id ? row.calculation_student_count || 0 : row.live_student_count || 0),
          numberValue(row.calculation_id ? row.gross_invoice_total : row.live_gross_invoice_total),
          numberValue(row.calculation_id ? row.excluded_deposit_total : row.live_excluded_deposit_total),
          numberValue(row.calculation_id ? row.commissionable_total : row.live_commissionable_total),
          numberValue(row.calculation_id ? row.commission_total : row.live_commission_total),
          Number(row.live_unresolved_item_count || 0),
          numberValue(row.live_unresolved_amount),
          row.payment_status || "",
          numberValue(row.payment_total),
        ]);
      }

      rows.push([]);
      rows.push(["STUDENT COMMISSION BREAKDOWN"]);
      rows.push([
        "Staff",
        "Billing month",
        "Invoice",
        "Payer",
        "Invoice status",
        "Student",
        "Student start date",
        "Student month",
        "Invoice total",
        "Commission base",
        "Rate %",
        "Commission",
        "Attributed invoice items",
      ]);

      for (const commissionRow of commissionRows) {
        if (!commissionRow.calculation_id) continue;

        const lineResult = await supabase.rpc(
          "billing_staff_commission_calculation_student_lines",
          { p_calculation_id: commissionRow.calculation_id },
        );

        if (lineResult.error) {
          setError(
            `The payroll CSV could not load the student commission breakdown for ${commissionRow.full_name}: ${lineResult.error.message}`,
          );
          return;
        }

        for (const line of (lineResult.data || []) as CommissionStudentLine[]) {
          rows.push([
            commissionRow.full_name,
            month,
            line.invoice_number,
            line.payer_name || "",
            line.invoice_status,
            line.student_name,
            line.student_start_date,
            line.student_month,
            numberValue(line.invoice_total),
            numberValue(line.commissionable_amount),
            numberValue(line.rate_percent),
            numberValue(line.commission_amount),
            line.invoice_item_count,
          ]);
        }
      }
    }

    rows.push([]);
    rows.push(["STAFF DIRECTORY"]);
    rows.push(["Name", "Email", "Phone", "Role", "Job title", "Status", "Start", "End", "Pay basis", "Standard rate", "Currency", "YTD paid"]);
    for (const row of staff) {
      rows.push([
        row.full_name,
        row.email || "",
        row.phone || "",
        categoryLabel(row.staff_category),
        row.job_title,
        row.employment_status,
        row.start_date,
        row.end_date || "",
        payBasisLabel(row.pay_basis),
        row.pay_basis === "invoice_commission"
          ? "Student-tiered invoice %"
          : numberValue(row.default_rate),
        row.currency,
        numberValue(row.ytd_paid_amount),
      ]);
    }
    rows.push([]);
    rows.push(["PAYMENT LEDGER"]);
    rows.push(["Name", "Job title", "Role", "Period start", "Period end", "Pay basis", "Units", "Rate", "Base", "Bonus", "Allowances", "Deductions", "Adjustment", "Total", "Status", "Paid date", "Method", "Reference", "Notes"]);
    for (const row of payments) {
      rows.push([
        row.full_name,
        row.job_title,
        categoryLabel(row.staff_category),
        row.period_start,
        row.period_end,
        payBasisLabel(row.pay_basis_snapshot),
        numberValue(row.units),
        row.pay_basis_snapshot === "invoice_commission"
          ? "Mixed student tiers"
          : numberValue(row.unit_rate),
        numberValue(row.base_pay),
        numberValue(row.bonus),
        numberValue(row.allowances),
        numberValue(row.deductions),
        numberValue(row.other_adjustment),
        numberValue(row.total_amount),
        row.payment_status,
        row.paid_at || "",
        row.payment_method || "",
        row.payment_reference || "",
        row.notes || "",
      ]);
    }
    downloadCsv(`${companyCode}-staff-payments-${month}.csv`, rows);
  }



  function openCommissionPlan(row: CommissionDashboardRow) {
    setCommissionPlanForm({
      employment_id: row.employment_id,
      full_name: row.full_name,
      job_title: row.job_title,
      months_1_3_rate:
        row.months_1_3_rate == null
          ? "50"
          : String(numberValue(row.months_1_3_rate)),
      months_4_6_rate:
        row.months_4_6_rate == null
          ? "30"
          : String(numberValue(row.months_4_6_rate)),
      month_7_plus_rate:
        row.month_7_plus_rate == null
          ? "25"
          : String(numberValue(row.month_7_plus_rate)),
    });
    setError("");
    setCommissionPlanModalOpen(true);
  }

  async function saveCommissionPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const rates = [
      Number(commissionPlanForm.months_1_3_rate),
      Number(commissionPlanForm.months_4_6_rate),
      Number(commissionPlanForm.month_7_plus_rate),
    ];

    if (
      rates.some(
        (value) =>
          !Number.isFinite(value) ||
          value < 0 ||
          value > 100,
      )
    ) {
      setError("Commission percentages must be between 0% and 100%.");
      return;
    }

    setWorking(true);

    const { error: saveError } = await supabase.rpc(
      "billing_staff_commission_plan_save_student_based",
      {
        p_employment_id: commissionPlanForm.employment_id,
        p_months_1_3_rate: rates[0],
        p_months_4_6_rate: rates[1],
        p_month_7_plus_rate: rates[2],
      },
    );

    if (saveError) {
      setError(saveError.message);
    } else {
      setCommissionPlanModalOpen(false);
      setNotice(
        `${commissionPlanForm.full_name}'s student-based commission tiers were updated. Any unpaid stored calculation was retired so it can be recalculated safely.`,
      );
      await load();
    }

    setWorking(false);
  }

  async function loadUnresolvedCommissionItems(row: CommissionDashboardRow) {
    setCommissionUnresolvedLoading(true);
    const { data, error: unresolvedError } = await supabase.rpc(
      "billing_staff_commission_unresolved_items",
      {
        p_employment_id: row.employment_id,
        p_billing_period: period.start,
      },
    );

    if (unresolvedError) {
      setError(unresolvedError.message);
      setCommissionUnresolvedItems([]);
      setCommissionUnresolvedLoading(false);
      return false;
    }

    const items = (data || []) as CommissionUnresolvedItem[];
    setCommissionUnresolvedItems(items);
    setCommissionAssignmentValues(
      Object.fromEntries(items.map((item) => [item.invoice_item_id, ""])),
    );
    setCommissionUnresolvedLoading(false);
    return true;
  }

  async function openCommissionUnresolved(row: CommissionDashboardRow) {
    setCommissionUnresolvedRow(row);
    setCommissionUnresolvedModalOpen(true);
    setError("");
    await loadUnresolvedCommissionItems(row);
  }

  async function saveCommissionAssignment(item: CommissionUnresolvedItem) {
    const studentId = commissionAssignmentValues[item.invoice_item_id] || "";
    if (!studentId) {
      setError("Choose the student for this invoice item first.");
      return;
    }

    setWorking(true);
    setError("");
    const { error: assignmentError } = await supabase.rpc(
      "billing_staff_commission_item_assignment_save",
      {
        p_invoice_item_id: item.invoice_item_id,
        p_student_id: studentId,
        p_notes: `Assigned from Staff Payments for ${monthLabel(month)}`,
      },
    );

    if (assignmentError) {
      setError(assignmentError.message);
    } else if (commissionUnresolvedRow) {
      setNotice("Invoice item assigned to the selected student.");
      await loadUnresolvedCommissionItems(commissionUnresolvedRow);
      await load();
    }
    setWorking(false);
  }

  async function calculateCommission(row: CommissionDashboardRow) {
    const planConfigured =
      row.months_1_3_rate != null &&
      row.months_4_6_rate != null &&
      row.month_7_plus_rate != null;

    if (!planConfigured) {
      setError(
        "Configure all three student commission percentage tiers before calculating this billing month.",
      );
      return;
    }

    if (row.payment_status === "paid" || row.calculation_status === "locked") {
      setError("This commission payroll has already been paid and is locked.");
      return;
    }

    if (Number(row.live_unresolved_item_count || 0) > 0) {
      setError(
        "Some invoice items cannot yet be linked safely to a student. Assign those items first so the correct student start-date percentage can be used.",
      );
      await openCommissionUnresolved(row);
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    const calculationResult =
      row.staff_payment_id && row.payment_status === "pending"
        ? await supabase.rpc(
            "billing_gkp_invoice_commission_recalculate",
            {
              p_employment_id: row.employment_id,
              p_billing_period: period.start,
            },
          )
        : await supabase.rpc(
            "billing_gkp_invoice_commission_calculate",
            {
              p_employment_id: row.employment_id,
              p_billing_period: period.start,
            },
          );

    if (calculationResult.error) {
      setError(calculationResult.error.message);
    } else {
      setNotice(
        `${row.full_name}'s ${monthLabel(month)} student-based invoice commission was ${row.calculation_id ? "recalculated" : "calculated"}.`,
      );
      await load();
    }

    setWorking(false);
  }

  async function openCommissionBreakdown(row: CommissionDashboardRow) {
    if (!row.calculation_id) {
      setError("Calculate this commission cycle before opening the student breakdown.");
      return;
    }

    setCommissionBreakdownRow(row);
    setCommissionBreakdownModalOpen(true);
    setCommissionLines([]);
    setCommissionLinesLoading(true);
    setError("");

    const { data, error: lineError } = await supabase.rpc(
      "billing_staff_commission_calculation_student_lines",
      {
        p_calculation_id: row.calculation_id,
      },
    );

    if (lineError) {
      setError(lineError.message);
      setCommissionBreakdownModalOpen(false);
    } else {
      setCommissionLines((data || []) as CommissionStudentLine[]);
    }

    setCommissionLinesLoading(false);
  }

  function openCommissionPayment(row: CommissionDashboardRow) {
    if (!row.calculation_id) {
      setError("Calculate this commission cycle before creating payroll.");
      return;
    }

    setCommissionPaymentRow(row);
    setCommissionPaymentForm({
      calculation_id: row.calculation_id,
      employment_id: row.employment_id,
      full_name: row.full_name,
      job_title: row.job_title,
      bonus: String(numberValue(row.bonus)),
      allowances: String(numberValue(row.allowances)),
      deductions: String(numberValue(row.deductions)),
      other_adjustment: String(numberValue(row.other_adjustment)),
      status: row.payment_status === "paid" ? "paid" : "pending",
      paid_at: row.paid_at || "",
      payment_method: row.payment_method || "",
      payment_reference: row.payment_reference || "",
      notes: row.payment_notes || "",
    });
    setError("");
    setCommissionPaymentModalOpen(true);
  }

  async function saveCommissionPayment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!commissionPaymentRow || !commissionPaymentForm.calculation_id) {
      setError("Commission calculation is missing.");
      return;
    }

    const amounts = [
      Number(commissionPaymentForm.bonus),
      Number(commissionPaymentForm.allowances),
      Number(commissionPaymentForm.deductions),
      Number(commissionPaymentForm.other_adjustment),
    ];

    if (amounts.some((value) => !Number.isFinite(value))) {
      setError("Check the commission payment adjustments.");
      return;
    }

    if (
      Number(commissionPaymentForm.bonus) < 0 ||
      Number(commissionPaymentForm.allowances) < 0 ||
      Number(commissionPaymentForm.deductions) < 0
    ) {
      setError("Bonus, allowances and deductions cannot be negative.");
      return;
    }

    if (commissionPaymentPreview.total < 0) {
      setError("Total payable cannot be negative.");
      return;
    }

    if (
      commissionPaymentForm.status === "paid" &&
      !window.confirm(
        `Mark ${commissionPaymentForm.full_name}'s ${monthLabel(month)} commission as Paid? This locks the student-by-student invoice calculation and percentages used for this cycle.`,
      )
    ) {
      return;
    }

    setWorking(true);

    const { error: paymentError } = await supabase.rpc(
      "billing_staff_commission_payment_save",
      {
        p_calculation_id: commissionPaymentForm.calculation_id,
        p_bonus: Number(commissionPaymentForm.bonus || 0),
        p_allowances: Number(commissionPaymentForm.allowances || 0),
        p_deductions: Number(commissionPaymentForm.deductions || 0),
        p_other_adjustment: Number(
          commissionPaymentForm.other_adjustment || 0,
        ),
        p_status: commissionPaymentForm.status,
        p_paid_at:
          commissionPaymentForm.status === "paid"
            ? commissionPaymentForm.paid_at || null
            : null,
        p_payment_method:
          commissionPaymentForm.payment_method.trim() || null,
        p_payment_reference:
          commissionPaymentForm.payment_reference.trim() || null,
        p_notes: commissionPaymentForm.notes.trim() || null,
      },
    );

    if (paymentError) {
      setError(paymentError.message);
    } else {
      setCommissionPaymentModalOpen(false);
      setNotice(
        commissionPaymentForm.status === "paid"
          ? `${commissionPaymentForm.full_name}'s commission payroll was marked Paid and the calculation is now locked.`
          : `${commissionPaymentForm.full_name}'s commission payroll was saved as Pending.`,
      );
      await load();
    }

    setWorking(false);
  }

  async function openCommissionFromPayment(row: PaymentRow) {
    setError("");
    setNotice("");

    const { data, error: lookupError } = await supabase.rpc(
      "billing_staff_commission_calculation_for_payment",
      {
        p_payment_id: row.payment_id,
      },
    );

    if (lookupError) {
      setError(lookupError.message);
      return;
    }

    const lookup =
      (((data || []) as CommissionPaymentLookup[])[0] || null);

    if (!lookup) {
      setError("No commission calculation is linked to this payroll entry.");
      return;
    }

    setMonth(lookup.billing_period.slice(0, 7));
    setPaymentEmploymentId(lookup.employment_id);
    setAllPaymentHistory(false);
    setNotice(
      `Showing the ${monthLabel(lookup.billing_period.slice(0, 7))} commission cycle for ${row.full_name}.`,
    );

    window.setTimeout(() => {
      document
        .getElementById("gkp-invoice-commission")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function focusCommissionStaff(row: StaffRow) {
    setPaymentEmploymentId(row.employment_id);
    window.setTimeout(() => {
      document
        .getElementById("gkp-invoice-commission")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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

    const defaultRate =
      staffForm.pay_basis === "invoice_commission"
        ? 0
        : Number(staffForm.default_rate);

    if (
      staffForm.pay_basis === "invoice_commission" &&
      companyCode !== "gkp"
    ) {
      setError("Invoice commission is currently available only for Guru Kids Pro staff.");
      return;
    }

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
    const target =
      row ||
      activeStaff.find((item) => item.pay_basis !== "invoice_commission") ||
      null;

    if (target?.pay_basis === "invoice_commission") {
      setError("");
      setNotice(
        "This staff member is paid by GKP invoice commission. Standard manual payment entry is disabled so the commission is not double-counted.",
      );
      return;
    }

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
            onClick={() => void exportPayrollCsv()}
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


      {companyCode === "gkp" && (
        <section
          id="gkp-invoice-commission"
          className="mt-6 scroll-mt-28 rounded-[2rem] border border-[#cdbb94] bg-[#fffdf8] p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9a7029]">
                GKP student-based invoice commission
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Management commission based on each student&apos;s start date
              </h2>
              <p className="mt-2 max-w-4xl text-xs leading-5 text-[#81796d]">
                Each non-deposit invoice amount is linked to a student first. That student&apos;s GKP start month determines whether the 1–3 month, 4–6 month or 7+ month percentage applies. Refundable Class-Slot Deposits never earn commission.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d7c9ae] bg-white px-4 py-3 text-right">
              <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                Billing cycle
              </span>
              <strong className="mt-1 block text-sm text-[#15233b]">
                {monthLabel(month)}
              </strong>
            </div>
          </div>

          {commissionRows.length === 0 ? (
            <MessageCard>
              No GKP staff are currently configured for invoice commission.
            </MessageCard>
          ) : (
            <div className="mt-5 grid gap-4">
              {commissionRows.map((row) => {
                const planConfigured =
                  row.months_1_3_rate != null &&
                  row.months_4_6_rate != null &&
                  row.month_7_plus_rate != null;

                const locked =
                  row.payment_status === "paid" ||
                  row.calculation_status === "locked";

                const liveUnresolved = Number(
                  row.live_unresolved_item_count || 0,
                );

                const liveDraftReview = Number(
                  row.live_draft_review_invoice_count || 0,
                );

                const calculationStale =
                  Boolean(row.calculation_id) &&
                  !locked &&
                  (
                    Number(row.finalized_invoice_count || 0) !==
                      Number(row.live_finalized_invoice_count || 0) ||
                    Number(row.calculation_student_count || 0) !==
                      Number(row.live_student_count || 0) ||
                    Math.abs(
                      numberValue(row.gross_invoice_total) -
                        numberValue(row.live_gross_invoice_total),
                    ) > 0.009 ||
                    Math.abs(
                      numberValue(row.excluded_deposit_total) -
                        numberValue(row.live_excluded_deposit_total),
                    ) > 0.009 ||
                    Math.abs(
                      numberValue(row.commissionable_total) -
                        numberValue(row.live_commissionable_total),
                    ) > 0.009 ||
                    Math.abs(
                      numberValue(row.commission_total) -
                        numberValue(row.live_commission_total),
                    ) > 0.009 ||
                    liveUnresolved > 0
                  );

                return (
                  <article
                    key={row.employment_id}
                    className="rounded-[1.75rem] border border-[#ded5c4] bg-white p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-[#15233b]">
                            {row.full_name}
                          </h3>
                          <StatusPill status={row.employment_status} />
                          {row.payment_status && (
                            <StatusPill status={row.payment_status} />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#81796d]">
                          {row.job_title}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[#6f675a]">
                          <span className="rounded-full border border-[#e1d7c6] bg-[#fbfaf7] px-3 py-1.5">
                            Student months 1–3: {row.months_1_3_rate == null ? "Not set" : `${numberValue(row.months_1_3_rate)}%`}
                          </span>
                          <span className="rounded-full border border-[#e1d7c6] bg-[#fbfaf7] px-3 py-1.5">
                            Student months 4–6: {row.months_4_6_rate == null ? "Not set" : `${numberValue(row.months_4_6_rate)}%`}
                          </span>
                          <span className="rounded-full border border-[#e1d7c6] bg-[#fbfaf7] px-3 py-1.5">
                            Student month 7+: {row.month_7_plus_rate == null ? "Not set" : `${numberValue(row.month_7_plus_rate)}%`}
                          </span>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-[#81796d]">
                          The student&apos;s <strong className="text-[#15233b]">GKP start date</strong> from Billing Accounts is the clock for the percentage tier. Different students on the same family invoice can therefore use different percentages.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openCommissionPlan(row)}
                          disabled={working}
                          className="rounded-full border border-[#d7c9ae] bg-white px-4 py-2 text-[11px] font-bold disabled:opacity-45"
                        >
                          Edit percentage tiers
                        </button>
                        {liveUnresolved > 0 && (
                          <button
                            type="button"
                            onClick={() => void openCommissionUnresolved(row)}
                            disabled={working}
                            className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-900 disabled:opacity-45"
                          >
                            Resolve {liveUnresolved} item{liveUnresolved === 1 ? "" : "s"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void calculateCommission(row)}
                          disabled={working || !planConfigured || locked}
                          className="rounded-full bg-[#15233b] px-4 py-2 text-[11px] font-black text-white disabled:opacity-45"
                        >
                          {row.calculation_id ? "Recalculate" : "Calculate from invoices"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void openCommissionBreakdown(row)}
                          disabled={working || !row.calculation_id}
                          className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-[11px] font-bold text-sky-700 disabled:opacity-45"
                        >
                          Student breakdown
                        </button>
                        <button
                          type="button"
                          onClick={() => openCommissionPayment(row)}
                          disabled={working || !row.calculation_id}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-bold text-emerald-700 disabled:opacity-45"
                        >
                          {row.payment_status === "paid"
                            ? "View paid payroll"
                            : row.staff_payment_id
                              ? "Edit / finalise payroll"
                              : "Create pending payroll"}
                        </button>
                      </div>
                    </div>

                    {!planConfigured && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                        Configure all three student-age percentage tiers before calculating commission.
                      </div>
                    )}

                    {liveUnresolved > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                        <strong>{liveUnresolved} invoice item{liveUnresolved === 1 ? "" : "s"}</strong> totalling {money(row.live_unresolved_amount, row.currency)} cannot yet be linked safely to a student. The system will not calculate payroll until these are assigned, because it cannot choose the correct student start-date percentage without that link.
                      </div>
                    )}

                    {liveDraftReview > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                        <strong>{liveDraftReview} invoice(s)</strong> are still Draft or Review for this billing month. They are not included. Finalise them and recalculate before marking payroll Paid.
                      </div>
                    )}

                    {calculationStale && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold leading-5 text-red-800">
                        Billing data, student attribution or the live commission total has changed since this stored calculation was created. Recalculate before finalising payroll.
                      </div>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                      <Metric
                        label={row.calculation_id ? "Finalized invoices" : "Live finalized invoices"}
                        value={String(Number(row.calculation_id ? row.finalized_invoice_count || 0 : row.live_finalized_invoice_count || 0))}
                        detail={row.calculation_id ? `v${Number(row.calculation_version || 1)}` : "Preview"}
                      />
                      <Metric
                        label="Students"
                        value={String(Number(row.calculation_id ? row.calculation_student_count || 0 : row.live_student_count || 0))}
                      />
                      <Metric
                        label="Gross invoice total"
                        value={money(row.calculation_id ? row.gross_invoice_total : row.live_gross_invoice_total, row.currency)}
                      />
                      <Metric
                        label="Deposits excluded"
                        value={money(row.calculation_id ? row.excluded_deposit_total : row.live_excluded_deposit_total, row.currency)}
                      />
                      <Metric
                        label="Commissionable"
                        value={money(row.calculation_id ? row.commissionable_total : row.live_commissionable_total, row.currency)}
                      />
                      <Metric
                        label={row.calculation_id ? "Commission earned" : "Live commission preview"}
                        value={money(row.calculation_id ? row.commission_total : row.live_commission_total, row.currency)}
                      />
                    </div>

                    {row.calculation_id ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <Metric label="Bonus" value={money(row.bonus, row.currency)} />
                        <Metric label="Allowances" value={money(row.allowances, row.currency)} />
                        <Metric label="Deductions" value={money(row.deductions, row.currency)} />
                        <Metric label="Other adjustment" value={money(row.other_adjustment, row.currency)} />
                        <div className="rounded-2xl border border-[#15233b] bg-[#15233b] p-4 text-white">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                            Total payable
                          </p>
                          <strong className="mt-2 block text-xl text-[#f0cf87]">
                            {row.staff_payment_id
                              ? money(row.payment_total, row.currency)
                              : money(row.commission_total, row.currency)}
                          </strong>
                          <span className="mt-1 block text-[11px] text-white/55">
                            {row.staff_payment_id
                              ? row.payment_status || "pending"
                              : "Payroll not created yet"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      planConfigured && liveUnresolved === 0 && (
                        <div className="mt-5 rounded-2xl border border-dashed border-[#d7c9ae] bg-[#fbfaf7] p-5 text-sm text-[#81796d]">
                          The figures above are a live preview. Use <strong>Calculate from invoices</strong> to store the audited student-by-student snapshot before creating payroll.
                        </div>
                      )
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

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
                    <td className="px-4 py-4 text-sm font-bold">
                      {row.pay_basis === "invoice_commission"
                        ? "Tiered %"
                        : money(row.default_rate, row.currency)}
                    </td>
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
                        <button
                          type="button"
                          onClick={() =>
                            row.pay_basis === "invoice_commission"
                              ? focusCommissionStaff(row)
                              : openNewPayment(row)
                          }
                          disabled={row.employment_status !== "active"}
                          title={
                            row.pay_basis === "invoice_commission"
                              ? "Open the invoice-commission workflow for the selected billing month."
                              : undefined
                          }
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 disabled:opacity-40"
                        >
                          {row.pay_basis === "invoice_commission"
                            ? "Manage commission"
                            : "Add payment"}
                        </button>
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
                    <td className="px-4 py-4 text-xs">
                      {payBasisLabel(row.pay_basis_snapshot)}
                      <span className="mt-1 block text-[#81796d]">
                        {row.pay_basis_snapshot === "invoice_commission"
                          ? `${numberValue(row.units)} student(s) · mixed tiers`
                          : `${numberValue(row.units)} × ${money(row.unit_rate, row.currency)}`}
                      </span>
                    </td>
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
                          {row.pay_basis_snapshot === "invoice_commission" ? (
                            <button
                              type="button"
                              onClick={() => void openCommissionFromPayment(row)}
                              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-bold text-sky-700"
                            >
                              {row.payment_status === "paid" ? "View commission" : "Manage commission"}
                            </button>
                          ) : (
                            <>
                              <button type="button" onClick={() => openEditPayment(row)} className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[10px] font-bold">Edit</button>
                              <button type="button" onClick={() => void voidPayment(row)} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">Void</button>
                            </>
                          )}
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
        open={commissionPlanModalOpen}
        onClose={() => !working && setCommissionPlanModalOpen(false)}
        title="Edit invoice commission terms"
        description="These percentages are applied separately to each student according to that student's GKP start date. Paid commission history keeps the student and percentage snapshots used when it was finalised."
      >
        <form onSubmit={saveCommissionPlan} className="grid gap-4">
          <div className="rounded-2xl border border-[#e6dfd3] bg-[#fbfaf7] p-4 text-sm">
            <strong className="block text-[#15233b]">
              {commissionPlanForm.full_name}
            </strong>
            <span className="mt-1 block text-xs text-[#81796d]">
              {commissionPlanForm.job_title}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="Months 1–3 (%)"
              type="number"
              min="0"
              step="0.01"
              value={commissionPlanForm.months_1_3_rate}
              onChange={(value) =>
                setCommissionPlanForm((current) => ({
                  ...current,
                  months_1_3_rate: value,
                }))
              }
              required
            />
            <TextField
              label="Months 4–6 (%)"
              type="number"
              min="0"
              step="0.01"
              value={commissionPlanForm.months_4_6_rate}
              onChange={(value) =>
                setCommissionPlanForm((current) => ({
                  ...current,
                  months_4_6_rate: value,
                }))
              }
              required
            />
            <TextField
              label="Month 7 onward (%)"
              type="number"
              min="0"
              step="0.01"
              value={commissionPlanForm.month_7_plus_rate}
              onChange={(value) =>
                setCommissionPlanForm((current) => ({
                  ...current,
                  month_7_plus_rate: value,
                }))
              }
              required
            />
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-900">
            The clock is different for every student. Month 1 is the calendar month containing that student&apos;s GKP start date in Billing Accounts. For example, a student who starts in June uses the first tier for June–August, the second tier for September–November, and the ongoing tier from December onward.
          </div>

          <ModalActions
            working={working}
            onCancel={() => setCommissionPlanModalOpen(false)}
            submitLabel="Save commission terms"
          />
        </form>
      </Modal>

      <Modal
        open={commissionBreakdownModalOpen}
        onClose={() =>
          !commissionLinesLoading && setCommissionBreakdownModalOpen(false)
        }
        title={`${commissionBreakdownRow?.full_name || "Staff"} · student commission`}
        description={`${monthLabel(month)} audit by invoice and student. Each row uses that student's own GKP start date to determine the percentage tier.`}
        wide
      >
        {commissionLinesLoading ? (
          <MessageCard>Loading student commission breakdown…</MessageCard>
        ) : commissionLines.length === 0 ? (
          <MessageCard>
            This calculation contains no attributed student commission rows.
          </MessageCard>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric
                label="Invoices"
                value={String(
                  new Set(commissionLines.map((line) => line.invoice_id || line.invoice_number)).size,
                )}
              />
              <Metric
                label="Students"
                value={String(
                  new Set(commissionLines.map((line) => line.student_id || line.student_name)).size,
                )}
              />
              <Metric
                label="Deposits excluded"
                value={money(
                  commissionBreakdownRow?.excluded_deposit_total,
                  commissionBreakdownRow?.currency || "SGD",
                )}
              />
              <Metric
                label="Commissionable"
                value={money(
                  commissionBreakdownRow?.commissionable_total,
                  commissionBreakdownRow?.currency || "SGD",
                )}
              />
              <Metric
                label="Commission"
                value={money(
                  commissionBreakdownRow?.commission_total,
                  commissionBreakdownRow?.currency || "SGD",
                )}
              />
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e6dfd3]">
              <table className="w-full min-w-[1180px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Student start</th>
                    <th className="px-4 py-3 text-right">Student month</th>
                    <th className="px-4 py-3 text-right">Invoice total</th>
                    <th className="px-4 py-3 text-right">Commission base</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionLines.map((line) => (
                    <tr
                      key={`${line.invoice_id || line.invoice_number}-${line.student_id || line.student_name}`}
                      className="border-b border-[#f0ece4] last:border-0"
                    >
                      <td className="px-4 py-4 text-sm font-bold text-[#15233b]">
                        {line.invoice_number}
                        <span className="mt-1 block text-[10px] font-medium uppercase text-[#8a8378]">
                          {line.invoice_status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {line.payer_name || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold">
                        {line.student_name}
                        <span className="mt-1 block text-[10px] font-medium text-[#8a8378]">
                          {line.invoice_item_count} item{line.invoice_item_count === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {date(line.student_start_date)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold">
                        {line.student_month}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {money(
                          line.invoice_total,
                          commissionBreakdownRow?.currency || "SGD",
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold">
                        {money(
                          line.commissionable_amount,
                          commissionBreakdownRow?.currency || "SGD",
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {numberValue(line.rate_percent)}%
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-black text-[#9a7029]">
                        {money(
                          line.commission_amount,
                          commissionBreakdownRow?.currency || "SGD",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setCommissionBreakdownModalOpen(false)}
                className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={commissionUnresolvedModalOpen}
        onClose={() => !working && !commissionUnresolvedLoading && setCommissionUnresolvedModalOpen(false)}
        title={`${commissionUnresolvedRow?.full_name || "Staff"} · resolve invoice items`}
        description={`These non-deposit items cannot be linked safely to one student yet. Assign each item to the correct student so the system can use that student's start-date percentage.`}
        wide
      >
        {commissionUnresolvedLoading ? (
          <MessageCard>Loading unresolved invoice items…</MessageCard>
        ) : commissionUnresolvedItems.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
            All finalized non-deposit invoice items for {monthLabel(month)} are now linked to students. You can calculate commission.
          </div>
        ) : (
          <div className="grid gap-3">
            {commissionUnresolvedItems.map((item) => {
              const candidates = Array.isArray(item.candidate_students)
                ? item.candidate_students
                : [];
              return (
                <div
                  key={item.invoice_item_id}
                  className="rounded-2xl border border-[#e3d9c8] bg-[#fbfaf7] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-[#15233b]">
                          {item.invoice_number}
                        </strong>
                        <span className="rounded-full border border-[#ded5c4] bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-[#81796d]">
                          {item.item_type.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-[#554d40]">
                        {item.item_description}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#81796d]">
                        {item.payer_name || "Family invoice"} · {money(item.item_amount, commissionUnresolvedRow?.currency || "SGD")}
                      </p>
                      <p className="mt-1 text-[11px] text-amber-800">
                        {item.unresolved_reason}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:w-[520px]">
                      <select
                        value={commissionAssignmentValues[item.invoice_item_id] || ""}
                        onChange={(event) =>
                          setCommissionAssignmentValues((current) => ({
                            ...current,
                            [item.invoice_item_id]: event.target.value,
                          }))
                        }
                        className={inputClass}
                        disabled={working}
                      >
                        <option value="">Choose student…</option>
                        {candidates.map((candidate) => (
                          <option key={candidate.student_id} value={candidate.student_id}>
                            {candidate.student_name}{candidate.student_start_date ? ` · starts ${candidate.student_start_date}` : " · start date missing"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void saveCommissionAssignment(item)}
                        disabled={working || !commissionAssignmentValues[item.invoice_item_id]}
                        className="min-h-11 shrink-0 rounded-full bg-[#15233b] px-4 text-xs font-bold text-white disabled:opacity-45"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end border-t border-[#e4dbcd] pt-5">
          <button
            type="button"
            onClick={() => setCommissionUnresolvedModalOpen(false)}
            disabled={working || commissionUnresolvedLoading}
            className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-45"
          >
            Close
          </button>
        </div>
      </Modal>

      <Modal
        open={commissionPaymentModalOpen}
        onClose={() => !working && setCommissionPaymentModalOpen(false)}
        title={
          commissionPaymentLocked
            ? "Paid commission payroll"
            : commissionPaymentRow?.staff_payment_id
              ? "Edit commission payroll"
              : "Create commission payroll"
        }
        description="The commission amount comes only from the stored invoice calculation. Bonuses, allowances, deductions and other adjustments are applied after the calculated commission."
        wide
      >
        <form onSubmit={saveCommissionPayment} className="grid gap-4">
          <div className="rounded-2xl border border-[#e6dfd3] bg-[#fbfaf7] p-4">
            <strong className="block text-[#15233b]">
              {commissionPaymentForm.full_name}
            </strong>
            <span className="mt-1 block text-xs text-[#81796d]">
              {commissionPaymentForm.job_title} · {monthLabel(month)}
            </span>
          </div>

          {Number(commissionPaymentRow?.draft_review_invoice_count || 0) >
            0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              <strong>
                {Number(
                  commissionPaymentRow?.draft_review_invoice_count || 0,
                )}{" "}
                invoice(s)
              </strong>{" "}
              are still Draft or Review and are excluded. You can keep this payroll Pending, but finalise those invoices and recalculate before marking it Paid.
            </div>
          )}

          {commissionPaymentLocked && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-800">
              This payroll has been paid. The student attribution, student start dates, invoice amounts and percentage snapshots are locked as historical payroll.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Finalized invoices"
              value={String(
                Number(commissionPaymentRow?.finalized_invoice_count || 0),
              )}
            />
            <Metric
              label="Commission base"
              value={money(
                commissionPaymentRow?.commissionable_total,
                commissionPaymentRow?.currency || "SGD",
              )}
            />
            <Metric
              label="Students"
              value={String(
                Number(commissionPaymentRow?.calculation_student_count || 0),
              )}
              detail="Each student has their own tier"
            />
            <Metric
              label="Calculated commission"
              value={money(
                commissionPaymentRow?.commission_total,
                commissionPaymentRow?.currency || "SGD",
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TextField
              label="Bonus"
              type="number"
              min="0"
              step="0.01"
              value={commissionPaymentForm.bonus}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  bonus: value,
                }))
              }
              disabled={commissionPaymentLocked}
            />
            <TextField
              label="Allowances"
              type="number"
              min="0"
              step="0.01"
              value={commissionPaymentForm.allowances}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  allowances: value,
                }))
              }
              disabled={commissionPaymentLocked}
            />
            <TextField
              label="Deductions"
              type="number"
              min="0"
              step="0.01"
              value={commissionPaymentForm.deductions}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  deductions: value,
                }))
              }
              disabled={commissionPaymentLocked}
            />
            <TextField
              label="Other adjustment (+ / −)"
              type="number"
              step="0.01"
              value={commissionPaymentForm.other_adjustment}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  other_adjustment: value,
                }))
              }
              disabled={commissionPaymentLocked}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                Commission
              </p>
              <strong className="mt-2 block text-xl">
                {money(
                  commissionPaymentPreview.base,
                  commissionPaymentRow?.currency || "SGD",
                )}
              </strong>
            </div>
            <div className="rounded-2xl border border-[#15233b] bg-[#15233b] p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                Total payable
              </p>
              <strong className="mt-2 block text-xl text-[#f0cf87]">
                {money(
                  commissionPaymentPreview.total,
                  commissionPaymentRow?.currency || "SGD",
                )}
              </strong>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SelectField
              label="Status"
              value={commissionPaymentForm.status}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  status: value as "pending" | "paid",
                }))
              }
              options={[
                ["pending", "Pending"],
                ["paid", "Paid"],
              ]}
              disabled={commissionPaymentLocked}
            />
            <TextField
              label="Payment date"
              type="date"
              value={commissionPaymentForm.paid_at}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  paid_at: value,
                }))
              }
              disabled={
                commissionPaymentLocked ||
                commissionPaymentForm.status !== "paid"
              }
            />
            <TextField
              label="Payment method"
              value={commissionPaymentForm.payment_method}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  payment_method: value,
                }))
              }
              placeholder="Bank transfer"
              disabled={commissionPaymentLocked}
            />
            <TextField
              label="Reference"
              value={commissionPaymentForm.payment_reference}
              onChange={(value) =>
                setCommissionPaymentForm((current) => ({
                  ...current,
                  payment_reference: value,
                }))
              }
              disabled={commissionPaymentLocked}
            />
          </div>

          <TextArea
            label="Payment notes"
            value={commissionPaymentForm.notes}
            onChange={(value) =>
              setCommissionPaymentForm((current) => ({
                ...current,
                notes: value,
              }))
            }
            disabled={commissionPaymentLocked}
          />

          {commissionPaymentLocked ? (
            <div className="mt-2 flex justify-end border-t border-[#e4dbcd] pt-5">
              <button
                type="button"
                onClick={() => setCommissionPaymentModalOpen(false)}
                className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold"
              >
                Close
              </button>
            </div>
          ) : (
            <ModalActions
              working={working}
              onCancel={() => setCommissionPaymentModalOpen(false)}
              submitLabel={
                commissionPaymentForm.status === "paid"
                  ? "Mark paid & lock"
                  : commissionPaymentRow?.staff_payment_id
                    ? "Save pending payroll"
                    : "Create pending payroll"
              }
            />
          )}
        </form>
      </Modal>

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
            <SelectField
              label="Pay basis"
              value={staffForm.pay_basis}
              onChange={(value) =>
                setStaffForm((current) => ({
                  ...current,
                  pay_basis: value as PayBasis,
                  default_rate:
                    value === "invoice_commission"
                      ? "0"
                      : current.default_rate,
                }))
              }
              options={payBasisOptions}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <TextField label="Start date" type="date" value={staffForm.start_date} onChange={(value) => setStaffForm((current) => ({ ...current, start_date: value }))} required />
            <TextField label="End date" type="date" value={staffForm.end_date} onChange={(value) => setStaffForm((current) => ({ ...current, end_date: value }))} />
            {staffForm.pay_basis === "invoice_commission" ? (
              <div className="rounded-xl border border-[#d9cfbd] bg-[#f2eee6] px-4 py-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#83796b]">
                  Standard salary / rate
                </span>
                <strong className="mt-1 block text-sm text-[#15233b]">
                  Tiered invoice %
                </strong>
              </div>
            ) : (
              <TextField
                label="Standard salary / rate"
                type="number"
                min="0"
                step="0.01"
                value={staffForm.default_rate}
                onChange={(value) =>
                  setStaffForm((current) => ({
                    ...current,
                    default_rate: value,
                  }))
                }
                required
              />
            )}
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
              {staff
                .filter(
                  (row) =>
                    row.pay_basis !== "invoice_commission" &&
                    (row.employment_status !== "ended" ||
                      row.employment_id === paymentForm.employment_id),
                )
                .map((row) => (
                  <option key={row.employment_id} value={row.employment_id}>
                    {row.full_name} · {row.job_title}
                  </option>
                ))}
            </select>
          </Field>

          {selectedPaymentEmployment && (
            <div className="rounded-2xl border border-[#e6dfd3] bg-[#fbfaf7] p-4 text-xs leading-5 text-[#6f675a]">
              <strong className="text-[#15233b]">{payBasisLabel(selectedPaymentEmployment.pay_basis)}</strong>
              {selectedPaymentEmployment.pay_basis === "invoice_commission"
                ? " · Commission is calculated from finalized GKP invoices; standard manual payment entry is not used."
                : <> · Standard rate {money(selectedPaymentEmployment.default_rate, selectedPaymentEmployment.currency)}. {selectedPaymentEmployment.pay_basis === "monthly_salary" ? "Base pay defaults to the monthly salary." : "Leave Base pay override blank to calculate units × rate."}</>}
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

function TextArea({ label, value, onChange, placeholder, disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  return <Field label={label}><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} rows={3} className={`${inputClass} min-h-[90px] py-3 disabled:bg-[#f2eee6] disabled:text-[#9b9388]`} /></Field>;
}

function SelectField({ label, value, onChange, options, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; disabled?: boolean }) {
  return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={`${inputClass} disabled:bg-[#f2eee6] disabled:text-[#9b9388]`}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></Field>;
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
