"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "../_components/BillingAdminShell";
import BillingModal from "../_components/BillingModal";
import type {
  AccountStatus,
  BillingAccount,
  BillingAccountOverview,
  BillingEnrolment,
  BillingFrequency,
  BillingProgramme,
  BillingStudent,
  EnrolmentStatus,
  StudentStatus,
} from "../_lib/billingTypes";
import {
  billingFrequencyLabel,
  enrolmentStatusLabel,
  errorMessage,
  formatCurrency,
  formatDate,
  normaliseOptionalText,
  numberValue,
  singaporeToday,
  formatTime,
  weekdayLabel,
} from "../_lib/billingUtils";

type AccountForm = {
  payer_name: string;
  billing_email: string;
  phone: string;
  alternate_email: string;
  address: string;
  default_due_day: string;
  status: AccountStatus;
  notes: string;
  first_student_name: string;
  first_student_preferred_name: string;
  first_student_school: string;
  first_student_academic_level: string;
  first_student_joined_on: string;
};

type StudentForm = {
  full_name: string;
  preferred_name: string;
  date_of_birth: string;
  school: string;
  academic_level: string;
  status: StudentStatus;
  joined_on: string;
  left_on: string;
  notes: string;
};

type EnrolmentForm = {
  programme_id: string;
  start_date: string;
  end_date: string;
  agreed_fee: string;
  billing_frequency: BillingFrequency;
  standard_discount_amount: string;
  discount_description: string;
  regular_weekday: string;
  regular_start_time: string;
  status: EnrolmentStatus;
  invoice_description: string;
};


type GkpDreamscapeAddon = {
  id: string;
  student_id: string;
  account_id: string;
  student_code: string;
  student_name: string;
  learner_email: string;
  dreamscape_user_id: string | null;
  plan_code: "core" | "complete";
  monthly_fee: number | string;
  status: "active" | "paused" | "ended";
  starts_on: string;
  ends_on: string | null;
  first_month_free: boolean;
  complimentary_through_period: string | null;
  free_month_used_at: string | null;
  created_at: string;
  updated_at: string;
};

type DreamscapeAddonForm = {
  plan_code: "none" | "core" | "complete";
  learner_email: string;
  starts_on: string;
  waive_start_month: boolean;
};

function calendarMonthStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  return `${value.slice(0, 7)}-01`;
}

const DEFAULT_ACCOUNT_FORM: AccountForm = {
  payer_name: "",
  billing_email: "",
  phone: "",
  alternate_email: "",
  address: "",
  default_due_day: "25",
  status: "active",
  notes: "",
  first_student_name: "",
  first_student_preferred_name: "",
  first_student_school: "",
  first_student_academic_level: "",
  first_student_joined_on: singaporeToday(),
};

const DEFAULT_STUDENT_FORM: StudentForm = {
  full_name: "",
  preferred_name: "",
  date_of_birth: "",
  school: "",
  academic_level: "",
  status: "active",
  joined_on: singaporeToday(),
  left_on: "",
  notes: "",
};

const DEFAULT_ENROLMENT_FORM: EnrolmentForm = {
  programme_id: "",
  start_date: singaporeToday(),
  end_date: "",
  agreed_fee: "",
  billing_frequency: "per_lesson",
  standard_discount_amount: "0",
  discount_description: "",
  regular_weekday: "",
  regular_start_time: "",
  status: "active",
  invoice_description: "",
};

export default function BillingAccountsClient() {
  const [accountOverviews, setAccountOverviews] = useState<
    BillingAccountOverview[]
  >([]);
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [students, setStudents] = useState<BillingStudent[]>([]);
  const [programmes, setProgrammes] = useState<BillingProgramme[]>([]);
  const [enrolments, setEnrolments] = useState<BillingEnrolment[]>([]);
  const [dreamscapeAddons, setDreamscapeAddons] = useState<
    GkpDreamscapeAddon[]
  >([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [defaultFamilyDueDay, setDefaultFamilyDueDay] = useState(25);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalMode, setAccountModalMode] =
    useState<"create" | "edit">("create");
  const [accountForm, setAccountForm] =
    useState<AccountForm>(DEFAULT_ACCOUNT_FORM);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState("");
  const [studentForm, setStudentForm] =
    useState<StudentForm>(DEFAULT_STUDENT_FORM);

  const [enrolmentModalOpen, setEnrolmentModalOpen] = useState(false);
  const [editingEnrolmentId, setEditingEnrolmentId] = useState("");
  const [enrolmentStudentId, setEnrolmentStudentId] = useState("");
  const [enrolmentForm, setEnrolmentForm] =
    useState<EnrolmentForm>(DEFAULT_ENROLMENT_FORM);

  const [dreamscapeModalOpen, setDreamscapeModalOpen] =
    useState(false);
  const [dreamscapeStudentId, setDreamscapeStudentId] =
    useState("");
  const [dreamscapeAddonForm, setDreamscapeAddonForm] =
    useState<DreamscapeAddonForm>({
      plan_code: "none",
      learner_email: "",
      starts_on: singaporeToday(),
      waive_start_month: false,
    });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadRecords = useCallback(
    async (preferredAccountId?: string) => {
      setLoading(true);
      setLoadError("");

      const [
        overviewResult,
        accountsResult,
        studentsResult,
        programmesResult,
        enrolmentsResult,
        settingsResult,
        dreamscapeAddonsResult,
      ] = await Promise.all([
        supabase
          .from("gkp_billing_account_overview")
          .select("*")
          .neq("status", "archived")
          .order("payer_name", { ascending: true }),
        supabase
          .from("gkp_billing_accounts")
          .select("*")
          .neq("status", "archived")
          .order("payer_name", { ascending: true }),
        supabase
          .from("gkp_billing_students")
          .select("*")
          .neq("status", "archived")
          .order("full_name", { ascending: true }),
        supabase
          .from("gkp_billing_programmes")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("gkp_billing_enrolments")
          .select("*")
          .order("start_date", { ascending: false }),
        supabase
          .from("gkp_billing_settings")
          .select("default_family_due_day")
          .eq("id", true)
          .maybeSingle(),
        supabase.rpc("gkp_get_gkp_dreamscape_addons"),
      ]);

      const firstError =
        overviewResult.error ||
        accountsResult.error ||
        studentsResult.error ||
        programmesResult.error ||
        enrolmentsResult.error ||
        settingsResult.error ||
        dreamscapeAddonsResult.error;

      if (firstError) {
        setLoadError(firstError.message);
        setLoading(false);
        return;
      }

      const loadedOverviews =
        (overviewResult.data || []) as BillingAccountOverview[];
      const loadedAccounts =
        (accountsResult.data || []) as BillingAccount[];
      const loadedStudents =
        (studentsResult.data || []) as BillingStudent[];
      const loadedProgrammes =
        (programmesResult.data || []) as BillingProgramme[];

      setDefaultFamilyDueDay(
        Number(settingsResult.data?.default_family_due_day || 25),
      );
      const loadedEnrolments =
        (enrolmentsResult.data || []) as BillingEnrolment[];

      setAccountOverviews(loadedOverviews);
      setAccounts(loadedAccounts);
      setStudents(loadedStudents);
      setProgrammes(loadedProgrammes);
      setEnrolments(loadedEnrolments);
      setDreamscapeAddons(
        (dreamscapeAddonsResult.data || []) as GkpDreamscapeAddon[],
      );

      setSelectedAccountId((currentAccountId) => {
        const candidateId =
          preferredAccountId ||
          currentAccountId ||
          loadedAccounts[0]?.id ||
          "";

        if (
          candidateId &&
          loadedAccounts.some(
            (account) => account.id === candidateId,
          )
        ) {
          return candidateId;
        }

        return loadedAccounts[0]?.id || "";
      });

      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => account.id === selectedAccountId) ||
      null,
    [accounts, selectedAccountId],
  );

  const selectedOverview = useMemo(
    () =>
      accountOverviews.find(
        (account) => account.id === selectedAccountId,
      ) || null,
    [accountOverviews, selectedAccountId],
  );

  const selectedStudents = useMemo(
    () =>
      students.filter(
        (student) => student.account_id === selectedAccountId,
      ),
    [students, selectedAccountId],
  );

  const programmeMap = useMemo(
    () =>
      new Map(
        programmes.map((programme) => [programme.id, programme]),
      ),
    [programmes],
  );

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return accountOverviews;

    return accountOverviews.filter((account) => {
      const familyStudents = students
        .filter((student) => student.account_id === account.id)
        .map((student) =>
          [
            student.full_name,
            student.preferred_name,
            student.student_code,
            student.school,
            student.academic_level,
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join(" ");

      return [
        account.account_code,
        account.payer_name,
        account.billing_email,
        account.phone,
        familyStudents,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [accountOverviews, search, students]);

  const activeProgrammeCount = programmes.filter(
    (programme) => programme.is_active,
  ).length;

  function openCreateAccount() {
    setAccountModalMode("create");
    setAccountForm({
      ...DEFAULT_ACCOUNT_FORM,
      default_due_day: String(defaultFamilyDueDay),
      first_student_joined_on: singaporeToday(),
    });
    setFormError("");
    setAccountModalOpen(true);
  }

  function openEditAccount() {
    if (!selectedAccount) return;

    setAccountModalMode("edit");
    setAccountForm({
      payer_name: selectedAccount.payer_name,
      billing_email: selectedAccount.billing_email,
      phone: selectedAccount.phone || "",
      alternate_email: selectedAccount.alternate_email || "",
      address: selectedAccount.address || "",
      default_due_day: String(selectedAccount.default_due_day),
      status: selectedAccount.status,
      notes: selectedAccount.notes || "",
      first_student_name: "",
      first_student_preferred_name: "",
      first_student_school: "",
      first_student_academic_level: "",
      first_student_joined_on: singaporeToday(),
    });
    setFormError("");
    setAccountModalOpen(true);
  }

  function openCreateStudent() {
    if (!selectedAccount) return;

    setEditingStudentId("");
    setStudentForm({
      ...DEFAULT_STUDENT_FORM,
      joined_on: singaporeToday(),
    });
    setFormError("");
    setStudentModalOpen(true);
  }

  function openEditStudent(student: BillingStudent) {
    setEditingStudentId(student.id);
    setStudentForm({
      full_name: student.full_name,
      preferred_name: student.preferred_name || "",
      date_of_birth: student.date_of_birth || "",
      school: student.school || "",
      academic_level: student.academic_level || "",
      status: student.status,
      joined_on: student.joined_on || "",
      left_on: student.left_on || "",
      notes: student.notes || "",
    });
    setFormError("");
    setStudentModalOpen(true);
  }

  function openDreamscapeAddon(student: BillingStudent) {
    const addon = dreamscapeAddons.find(
      (item) => item.student_id === student.id,
    );

    setDreamscapeStudentId(student.id);
    setDreamscapeAddonForm({
      plan_code:
        addon?.status === "active"
          ? addon.plan_code
          : "none",
      learner_email: addon?.learner_email || "",
      starts_on: addon?.starts_on || singaporeToday(),
      waive_start_month: Boolean(
        addon?.status === "active" &&
          addon.complimentary_through_period &&
          addon.complimentary_through_period ===
            calendarMonthStart(addon.starts_on),
      ),
    });
    setFormError("");
    setDreamscapeModalOpen(true);
  }

  async function saveDreamscapeAddon(event: FormEvent) {
    event.preventDefault();

    if (!dreamscapeStudentId) return;

    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        "/api/billing/dreamscape/gkp-addon",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: dreamscapeStudentId,
            planCode: dreamscapeAddonForm.plan_code,
            learnerEmail:
              dreamscapeAddonForm.learner_email,
            startsOn: dreamscapeAddonForm.starts_on,
            waiveStartMonth:
              dreamscapeAddonForm.waive_start_month,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; status?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Dreamscape access could not be updated.",
        );
      }

      setNotice(
        dreamscapeAddonForm.plan_code === "none"
          ? "GKP Dreamscape add-on ended."
          : "GKP Dreamscape add-on saved and learner access updated.",
      );

      setDreamscapeModalOpen(false);
      await loadRecords(selectedAccountId);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Dreamscape access could not be updated.",
      );
    }

    setSaving(false);
  }

  function openCreateEnrolment(student: BillingStudent) {
    const firstProgramme = programmes.find(
      (programme) => programme.is_active,
    );

    setEditingEnrolmentId("");
    setEnrolmentStudentId(student.id);
    setEnrolmentForm({
      ...DEFAULT_ENROLMENT_FORM,
      programme_id: firstProgramme?.id || "",
      agreed_fee: firstProgramme
        ? String(numberValue(firstProgramme.default_fee))
        : "",
      billing_frequency:
        firstProgramme?.billing_frequency || "monthly",
      start_date: singaporeToday(),
    });
    setFormError("");
    setEnrolmentModalOpen(true);
  }

  function openEditEnrolment(
    studentId: string,
    enrolment: BillingEnrolment,
  ) {
    setEditingEnrolmentId(enrolment.id);
    setEnrolmentStudentId(studentId);
    setEnrolmentForm({
      programme_id: enrolment.programme_id,
      start_date: enrolment.start_date,
      end_date: enrolment.end_date || "",
      agreed_fee: String(numberValue(enrolment.agreed_fee)),
      billing_frequency: enrolment.billing_frequency,
      standard_discount_amount: String(
        numberValue(enrolment.standard_discount_amount),
      ),
      discount_description:
        enrolment.discount_description || "",
      regular_weekday: enrolment.regular_weekday
        ? String(enrolment.regular_weekday)
        : "",
      regular_start_time: enrolment.regular_start_time
        ? enrolment.regular_start_time.slice(0, 5)
        : "",
      status: enrolment.status,
      invoice_description: enrolment.invoice_description || "",
    });
    setFormError("");
    setEnrolmentModalOpen(true);
  }

  function handleProgrammeSelection(programmeId: string) {
    const programme = programmes.find(
      (item) => item.id === programmeId,
    );

    setEnrolmentForm((current) => ({
      ...current,
      programme_id: programmeId,
      agreed_fee:
        !editingEnrolmentId && programme
          ? String(numberValue(programme.default_fee))
          : current.agreed_fee,
      billing_frequency:
        !editingEnrolmentId && programme
          ? programme.billing_frequency
          : current.billing_frequency,
      invoice_description:
        !editingEnrolmentId && programme
          ? programme.name
          : current.invoice_description,
    }));
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      if (accountModalMode === "create") {
        const { data, error } = await supabase.rpc(
          "gkp_create_family_account",
          {
            p_payer_name: accountForm.payer_name,
            p_billing_email: accountForm.billing_email,
            p_phone: normaliseOptionalText(accountForm.phone),
            p_alternate_email: normaliseOptionalText(
              accountForm.alternate_email,
            ),
            p_address: normaliseOptionalText(accountForm.address),
            p_default_due_day: Number(accountForm.default_due_day),
            p_notes: normaliseOptionalText(accountForm.notes),
            p_first_student_name: normaliseOptionalText(
              accountForm.first_student_name,
            ),
            p_first_student_preferred_name: normaliseOptionalText(
              accountForm.first_student_preferred_name,
            ),
            p_first_student_school: normaliseOptionalText(
              accountForm.first_student_school,
            ),
            p_first_student_academic_level: normaliseOptionalText(
              accountForm.first_student_academic_level,
            ),
            p_first_student_joined_on:
              accountForm.first_student_joined_on || singaporeToday(),
          },
        );

        if (error) throw error;

        const created = Array.isArray(data) ? data[0] : data;
        const createdAccountId = String(created?.account_id || "");

        setAccountModalOpen(false);
        setNotice("Family billing account created.");
        await loadRecords(createdAccountId);
      } else {
        if (!selectedAccount) {
          throw new Error("No billing account is selected.");
        }

        const { error } = await supabase
          .from("gkp_billing_accounts")
          .update({
            payer_name: accountForm.payer_name.trim(),
            billing_email: accountForm.billing_email
              .trim()
              .toLowerCase(),
            phone: normaliseOptionalText(accountForm.phone),
            alternate_email: normaliseOptionalText(
              accountForm.alternate_email,
            ),
            address: normaliseOptionalText(accountForm.address),
            default_due_day: Number(accountForm.default_due_day),
            status: accountForm.status,
            notes: normaliseOptionalText(accountForm.notes),
          })
          .eq("id", selectedAccount.id);

        if (error) throw error;

        setAccountModalOpen(false);
        setNotice("Billing account updated.");
        await loadRecords(selectedAccount.id);
      }
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      if (!selectedAccount) {
        throw new Error("Select a billing account first.");
      }

      const payload = {
        account_id: selectedAccount.id,
        full_name: studentForm.full_name.trim(),
        preferred_name: normaliseOptionalText(
          studentForm.preferred_name,
        ),
        date_of_birth: studentForm.date_of_birth || null,
        school: normaliseOptionalText(studentForm.school),
        academic_level: normaliseOptionalText(
          studentForm.academic_level,
        ),
        status: studentForm.status,
        joined_on: studentForm.joined_on || null,
        left_on: studentForm.left_on || null,
        notes: normaliseOptionalText(studentForm.notes),
      };

      if (editingStudentId) {
        const { error } = await supabase
          .from("gkp_billing_students")
          .update(payload)
          .eq("id", editingStudentId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gkp_billing_students")
          .insert(payload);

        if (error) throw error;
      }

      setStudentModalOpen(false);
      setNotice(
        editingStudentId ? "Student updated." : "Student added.",
      );
      await loadRecords(selectedAccount.id);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitEnrolment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      if (!enrolmentStudentId) {
        throw new Error("No student is selected.");
      }

      if (!enrolmentForm.programme_id) {
        throw new Error("Select a programme.");
      }

      const agreedFee = Number(enrolmentForm.agreed_fee);
      const discount = Number(
        enrolmentForm.standard_discount_amount || 0,
      );

      if (!Number.isFinite(agreedFee) || agreedFee < 0) {
        throw new Error("Enter a valid agreed fee.");
      }

      if (!Number.isFinite(discount) || discount < 0) {
        throw new Error("Enter a valid discount.");
      }

      if (discount > agreedFee) {
        throw new Error(
          "The per-lesson discount cannot exceed the per-lesson fee.",
        );
      }

      if (
        enrolmentForm.billing_frequency === "per_lesson" &&
        !enrolmentForm.regular_weekday
      ) {
        throw new Error("Select the student's regular class weekday.");
      }

      const payload = {
        student_id: enrolmentStudentId,
        programme_id: enrolmentForm.programme_id,
        start_date: enrolmentForm.start_date,
        end_date: enrolmentForm.end_date || null,
        agreed_fee: agreedFee,
        billing_frequency: enrolmentForm.billing_frequency,
        standard_discount_amount: discount,
        discount_description: normaliseOptionalText(
          enrolmentForm.discount_description,
        ),
        regular_weekday:
          enrolmentForm.billing_frequency === "per_lesson" &&
          enrolmentForm.regular_weekday
            ? Number(enrolmentForm.regular_weekday)
            : null,
        regular_start_time:
          enrolmentForm.billing_frequency === "per_lesson"
            ? normaliseOptionalText(enrolmentForm.regular_start_time)
            : null,
        discount_basis_lessons: 4,
        status: enrolmentForm.status,
        invoice_description: normaliseOptionalText(
          enrolmentForm.invoice_description,
        ),
      };

      if (editingEnrolmentId) {
        const { error } = await supabase
          .from("gkp_billing_enrolments")
          .update(payload)
          .eq("id", editingEnrolmentId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gkp_billing_enrolments")
          .insert(payload);

        if (error) throw error;
      }

      setEnrolmentModalOpen(false);
      setNotice(
        editingEnrolmentId
          ? "Enrolment updated."
          : "Enrolment added.",
      );
      await loadRecords(selectedAccountId);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function changeEnrolmentStatus(
    enrolment: BillingEnrolment,
    status: EnrolmentStatus,
  ) {
    setLoadError("");
    setNotice("");

    const update: Record<string, string | null> = { status };

    if (
      (status === "ended" || status === "cancelled") &&
      !enrolment.end_date
    ) {
      update.end_date = singaporeToday();
    }

    const { error } = await supabase
      .from("gkp_billing_enrolments")
      .update(update)
      .eq("id", enrolment.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    setNotice(`Enrolment marked ${status}.`);
    await loadRecords(selectedAccountId);
  }

  return (
    <BillingAdminShell
      eyebrow="Family billing records"
      title="Billing Accounts"
      description="Create one payer account per family, add siblings, and assign individual programme fees and recurring discounts."
      actions={
        <>
          <button
            type="button"
            onClick={() => void loadRecords(selectedAccountId)}
            disabled={loading}
            className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={openCreateAccount}
            className="inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-xs font-bold text-white"
          >
            + New family
          </button>
        </>
      }
    >
      {loadError && (
        <Alert tone="error">{loadError}</Alert>
      )}

      {notice && (
        <Alert tone="success">{notice}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Family accounts"
          value={String(accountOverviews.length)}
          detail="Active and inactive families"
        />
        <SummaryCard
          label="Students"
          value={String(students.length)}
          detail="Across all billing accounts"
        />
        <SummaryCard
          label="Active enrolments"
          value={String(
            enrolments.filter(
              (enrolment) => enrolment.status === "active",
            ).length,
          )}
          detail="Ready for invoice generation"
        />
        <SummaryCard
          label="Monthly estimate"
          value={formatCurrency(
            accountOverviews.reduce(
              (sum, account) =>
                sum + numberValue(account.recurring_monthly_total),
              0,
            ),
          )}
          detail="Before one-off adjustments"
        />
      </div>

      {activeProgrammeCount === 0 && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Add at least one active programme before creating enrolments.{" "}
          <Link
            href="/admin/billing/programmes"
            className="font-black underline"
          >
            Open Programmes
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
          <div className="border-b border-[#ebe5da] p-5">
            <label className="block">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#867d70]">
                Search families or students
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, code, school…"
                className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-[#fbfaf7] px-4 text-sm outline-none transition focus:border-[#b98d3f]"
              />
            </label>
          </div>

          <div className="max-h-[720px] overflow-y-auto p-3">
            {loading ? (
              <div className="p-6 text-sm text-[#80786c]">
                Loading family accounts…
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-semibold">No family accounts found.</p>
                <p className="mt-2 text-sm text-[#81796d]">
                  Create the first family billing record.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredAccounts.map((account) => {
                  const active = account.id === selectedAccountId;

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-[#15233b] bg-[#15233b] text-white"
                          : "border-transparent bg-[#f8f5ef] text-[#15233b] hover:border-[#cfb77f]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                              active
                                ? "text-[#e8c474]"
                                : "text-[#a27627]"
                            }`}
                          >
                            {account.account_code}
                          </p>
                          <strong className="mt-1 block truncate text-base">
                            {account.payer_name}
                          </strong>
                          <span
                            className={`mt-1 block truncate text-xs ${
                              active
                                ? "text-white/60"
                                : "text-[#8c8478]"
                            }`}
                          >
                            {account.billing_email}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                            active
                              ? "bg-white/10 text-white/80"
                              : "bg-white text-[#70695e]"
                          }`}
                        >
                          {account.status}
                        </span>
                      </div>

                      <div
                        className={`mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center ${
                          active
                            ? "border-white/10"
                            : "border-[#e7dfd1]"
                        }`}
                      >
                        <SmallStat
                          label="Students"
                          value={account.student_count}
                          active={active}
                        />
                        <SmallStat
                          label="Classes"
                          value={account.active_enrolment_count}
                          active={active}
                        />
                        <SmallStat
                          label="Monthly"
                          value={formatCurrency(
                            numberValue(
                              account.recurring_monthly_total,
                            ),
                          )}
                          active={active}
                          compact
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0">
          {!selectedAccount ? (
            <div className="rounded-[2rem] border border-dashed border-[#cfbf9e] bg-white/55 p-12 text-center">
              <h2 className="text-xl font-semibold">
                Select or create a family
              </h2>
              <p className="mt-2 text-sm text-[#81796d]">
                Family details and student enrolments will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#f2eadb] px-3 py-1.5 text-xs font-black text-[#946d2b]">
                        {selectedAccount.account_code}
                      </span>
                      <span className="rounded-full border border-[#ded5c4] px-3 py-1.5 text-xs font-bold capitalize text-[#6d665b]">
                        {selectedAccount.status}
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold">
                      {selectedAccount.payer_name}
                    </h2>
                    <p className="mt-2 text-sm text-[#746d62]">
                      {selectedAccount.billing_email}
                      {selectedAccount.phone
                        ? ` · ${selectedAccount.phone}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openEditAccount}
                    className="inline-flex min-h-11 w-fit items-center rounded-full border border-[#d7c9ae] bg-[#fbfaf7] px-5 text-xs font-bold"
                  >
                    Edit account
                  </button>
                </div>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCell
                    label="Students"
                    value={String(selectedStudents.length)}
                  />
                  <InfoCell
                    label="Active enrolments"
                    value={String(
                      selectedOverview?.active_enrolment_count || 0,
                    )}
                  />
                  <InfoCell
                    label="Four-lesson base"
                    value={formatCurrency(
                      numberValue(
                        selectedOverview?.recurring_monthly_total,
                      ),
                    )}
                  />
                  <InfoCell
                    label="Default due day"
                    value={`Day ${selectedAccount.default_due_day}`}
                  />
                </dl>

                {(selectedAccount.address ||
                  selectedAccount.notes ||
                  selectedAccount.alternate_email) && (
                  <div className="mt-5 grid gap-3 rounded-2xl bg-[#f8f5ef] p-4 text-sm text-[#686156] md:grid-cols-2">
                    {selectedAccount.alternate_email && (
                      <p>
                        <strong className="text-[#15233b]">
                          Alternate email:
                        </strong>{" "}
                        {selectedAccount.alternate_email}
                      </p>
                    )}
                    {selectedAccount.address && (
                      <p>
                        <strong className="text-[#15233b]">
                          Address:
                        </strong>{" "}
                        {selectedAccount.address}
                      </p>
                    )}
                    {selectedAccount.notes && (
                      <p className="md:col-span-2">
                        <strong className="text-[#15233b]">
                          Notes:
                        </strong>{" "}
                        {selectedAccount.notes}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
                <div className="flex items-center justify-between gap-4 border-b border-[#ebe5da] px-5 py-5 sm:px-6">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Students and enrolments
                    </h2>
                    <p className="mt-1 text-sm text-[#81796d]">
                      Each sibling keeps their own fees and discounts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateStudent}
                    className="inline-flex min-h-10 items-center rounded-full bg-[#15233b] px-4 text-xs font-bold text-white"
                  >
                    + Add student
                  </button>
                </div>

                {selectedStudents.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="font-semibold">
                      No students in this family yet.
                    </p>
                    <button
                      type="button"
                      onClick={openCreateStudent}
                      className="mt-4 rounded-full bg-[#15233b] px-5 py-3 text-xs font-bold text-white"
                    >
                      Add first student
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 p-4 sm:p-6">
                    {selectedStudents.map((student) => {
                      const studentEnrolments = enrolments.filter(
                        (enrolment) =>
                          enrolment.student_id === student.id,
                      );

                      return (
                        <StudentCard
                          key={student.id}
                          student={student}
                          enrolments={studentEnrolments}
                          programmeMap={programmeMap}
                          dreamscapeAddon={dreamscapeAddons.find(
                            (item) => item.student_id === student.id,
                          ) || null}
                          canAddEnrolment={activeProgrammeCount > 0}
                          onEditStudent={() => openEditStudent(student)}
                          onManageDreamscape={() =>
                            openDreamscapeAddon(student)
                          }
                          onAddEnrolment={() =>
                            openCreateEnrolment(student)
                          }
                          onEditEnrolment={(enrolment) =>
                            openEditEnrolment(student.id, enrolment)
                          }
                          onChangeStatus={(enrolment, status) =>
                            void changeEnrolmentStatus(
                              enrolment,
                              status,
                            )
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>

      <BillingModal
        open={dreamscapeModalOpen}
        onClose={() => !saving && setDreamscapeModalOpen(false)}
        eyebrow="GKP student benefit"
        title="Dreamscape Access"
        description="Add Dreamscape to this student’s normal GKP tuition billing. The learner account is linked by Dreamscape email."
        footer={
          <ModalFooter
            saving={saving}
            submitLabel="Save Dreamscape Access"
            formId="dreamscape-addon-form"
            onCancel={() => setDreamscapeModalOpen(false)}
          />
        }
      >
        <form
          id="dreamscape-addon-form"
          onSubmit={saveDreamscapeAddon}
          className="grid gap-5"
        >
          {formError && <Alert tone="error">{formError}</Alert>}

          <SelectField
            label="Dreamscape plan"
            value={dreamscapeAddonForm.plan_code}
            onChange={(value) =>
              setDreamscapeAddonForm((current) => ({
                ...current,
                plan_code:
                  value as DreamscapeAddonForm["plan_code"],
              }))
            }
            options={[
              ["none", "No GKP Dreamscape add-on"],
              ["core", "Core — $9.90/month"],
              ["complete", "Full — $14.90/month"],
            ]}
          />

          {dreamscapeAddonForm.plan_code !== "none" && (
            <>
              <TextField
                label="Learner Dreamscape email"
                type="email"
                value={dreamscapeAddonForm.learner_email}
                onChange={(value) =>
                  setDreamscapeAddonForm((current) => ({
                    ...current,
                    learner_email: value,
                  }))
                }
                required
              />

              <TextField
                label="Access start date"
                type="date"
                value={dreamscapeAddonForm.starts_on}
                onChange={(value) =>
                  setDreamscapeAddonForm((current) => ({
                    ...current,
                    starts_on: value,
                  }))
                }
                required
              />

              <label className="flex items-start gap-3 rounded-2xl border border-[#ddd2bf] bg-[#fbfaf7] p-4 text-sm leading-6 text-[#625b50]">
                <input
                  type="checkbox"
                  checked={dreamscapeAddonForm.waive_start_month}
                  onChange={(event) =>
                    setDreamscapeAddonForm((current) => ({
                      ...current,
                      waive_start_month: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  Waive the Dreamscape fee for the student&apos;s start
                  month. Leave this unchecked to charge the full monthly
                  fee, regardless of the access start date.
                </span>
              </label>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                Access begins on the selected start date. The full monthly
                Dreamscape fee is added to that calendar month&apos;s GKP
                bill regardless of the start date. There is no daily
                proration. Tick the waiver above only when you want to
                waive the start month, such as for a late-month activation.
              </div>
            </>
          )}
        </form>
      </BillingModal>

      <BillingModal
        open={accountModalOpen}
        onClose={() => !saving && setAccountModalOpen(false)}
        eyebrow={
          accountModalMode === "create"
            ? "New billing account"
            : "Family details"
        }
        title={
          accountModalMode === "create"
            ? "Create family account"
            : "Edit billing account"
        }
        description={
          accountModalMode === "create"
            ? "The first student is optional. More siblings can be added after the account is created."
            : "These details appear on future invoices and billing emails."
        }
        footer={
          <ModalFooter
            saving={saving}
            submitLabel={
              accountModalMode === "create"
                ? "Create family"
                : "Save changes"
            }
            formId="account-form"
            onCancel={() => setAccountModalOpen(false)}
          />
        }
      >
        <form
          id="account-form"
          onSubmit={submitAccount}
          className="grid gap-5"
        >
          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Payer name"
              value={accountForm.payer_name}
              onChange={(value) =>
                setAccountForm((current) => ({
                  ...current,
                  payer_name: value,
                }))
              }
              required
            />
            <TextField
              label="Billing email"
              type="email"
              value={accountForm.billing_email}
              onChange={(value) =>
                setAccountForm((current) => ({
                  ...current,
                  billing_email: value,
                }))
              }
              required
            />
            <TextField
              label="Phone"
              value={accountForm.phone}
              onChange={(value) =>
                setAccountForm((current) => ({
                  ...current,
                  phone: value,
                }))
              }
            />
            <TextField
              label="Alternate email"
              type="email"
              value={accountForm.alternate_email}
              onChange={(value) =>
                setAccountForm((current) => ({
                  ...current,
                  alternate_email: value,
                }))
              }
            />
            <TextField
              label="Default monthly due day"
              type="number"
              min="1"
              max="28"
              value={accountForm.default_due_day}
              onChange={(value) =>
                setAccountForm((current) => ({
                  ...current,
                  default_due_day: value,
                }))
              }
              required
            />
            {accountModalMode === "edit" && (
              <SelectField
                label="Account status"
                value={accountForm.status}
                onChange={(value) =>
                  setAccountForm((current) => ({
                    ...current,
                    status: value as AccountStatus,
                  }))
                }
                options={[
                  ["active", "Active"],
                  ["inactive", "Inactive"],
                  ["archived", "Archived"],
                ]}
              />
            )}
          </div>

          <TextAreaField
            label="Billing address"
            value={accountForm.address}
            onChange={(value) =>
              setAccountForm((current) => ({
                ...current,
                address: value,
              }))
            }
          />

          <TextAreaField
            label="Internal notes"
            value={accountForm.notes}
            onChange={(value) =>
              setAccountForm((current) => ({
                ...current,
                notes: value,
              }))
            }
          />

          {accountModalMode === "create" && (
            <fieldset className="rounded-3xl border border-[#ddd2bf] bg-white p-5">
              <legend className="px-2 text-xs font-black uppercase tracking-[0.15em] text-[#966f2c]">
                Optional first student
              </legend>

              <div className="mt-2 grid gap-4 md:grid-cols-2">
                <TextField
                  label="Full name"
                  value={accountForm.first_student_name}
                  onChange={(value) =>
                    setAccountForm((current) => ({
                      ...current,
                      first_student_name: value,
                    }))
                  }
                />
                <TextField
                  label="Preferred name"
                  value={
                    accountForm.first_student_preferred_name
                  }
                  onChange={(value) =>
                    setAccountForm((current) => ({
                      ...current,
                      first_student_preferred_name: value,
                    }))
                  }
                />
                <TextField
                  label="School"
                  value={accountForm.first_student_school}
                  onChange={(value) =>
                    setAccountForm((current) => ({
                      ...current,
                      first_student_school: value,
                    }))
                  }
                />
                <TextField
                  label="Academic level"
                  placeholder="e.g. Primary 4"
                  value={
                    accountForm.first_student_academic_level
                  }
                  onChange={(value) =>
                    setAccountForm((current) => ({
                      ...current,
                      first_student_academic_level: value,
                    }))
                  }
                />
                <TextField
                  label="Joined on"
                  type="date"
                  value={accountForm.first_student_joined_on}
                  onChange={(value) =>
                    setAccountForm((current) => ({
                      ...current,
                      first_student_joined_on: value,
                    }))
                  }
                />
              </div>
            </fieldset>
          )}
        </form>
      </BillingModal>

      <BillingModal
        open={studentModalOpen}
        onClose={() => !saving && setStudentModalOpen(false)}
        eyebrow={editingStudentId ? "Student record" : "New sibling"}
        title={editingStudentId ? "Edit student" : "Add student"}
        description="Student records are kept under the selected family billing account."
        footer={
          <ModalFooter
            saving={saving}
            submitLabel={
              editingStudentId ? "Save student" : "Add student"
            }
            formId="student-form"
            onCancel={() => setStudentModalOpen(false)}
          />
        }
      >
        <form
          id="student-form"
          onSubmit={submitStudent}
          className="grid gap-5"
        >
          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Full name"
              value={studentForm.full_name}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  full_name: value,
                }))
              }
              required
            />
            <TextField
              label="Preferred name"
              value={studentForm.preferred_name}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  preferred_name: value,
                }))
              }
            />
            <TextField
              label="Date of birth"
              type="date"
              value={studentForm.date_of_birth}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  date_of_birth: value,
                }))
              }
            />
            <TextField
              label="School"
              value={studentForm.school}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  school: value,
                }))
              }
            />
            <TextField
              label="Academic level"
              placeholder="e.g. Primary 4"
              value={studentForm.academic_level}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  academic_level: value,
                }))
              }
            />
            <SelectField
              label="Status"
              value={studentForm.status}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  status: value as StudentStatus,
                }))
              }
              options={[
                ["active", "Active"],
                ["inactive", "Inactive"],
                ["graduated", "Graduated"],
                ["archived", "Archived"],
              ]}
            />
            <TextField
              label="Joined on"
              type="date"
              value={studentForm.joined_on}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  joined_on: value,
                }))
              }
            />
            <TextField
              label="Left on"
              type="date"
              value={studentForm.left_on}
              onChange={(value) =>
                setStudentForm((current) => ({
                  ...current,
                  left_on: value,
                }))
              }
            />
          </div>

          <TextAreaField
            label="Internal notes"
            value={studentForm.notes}
            onChange={(value) =>
              setStudentForm((current) => ({
                ...current,
                notes: value,
              }))
            }
          />
        </form>
      </BillingModal>

      <BillingModal
        open={enrolmentModalOpen}
        onClose={() => !saving && setEnrolmentModalOpen(false)}
        eyebrow={
          editingEnrolmentId ? "Enrolment record" : "New enrolment"
        }
        title={
          editingEnrolmentId ? "Edit enrolment" : "Add programme"
        }
        description="The agreed fee and recurring discount apply only to this student."
        footer={
          <ModalFooter
            saving={saving}
            submitLabel={
              editingEnrolmentId
                ? "Save enrolment"
                : "Add enrolment"
            }
            formId="enrolment-form"
            onCancel={() => setEnrolmentModalOpen(false)}
          />
        }
      >
        <form
          id="enrolment-form"
          onSubmit={submitEnrolment}
          className="grid gap-5"
        >
          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="rounded-2xl border border-[#decda9] bg-[#f8f1e3] p-4 text-sm leading-6 text-[#6d6250]">
            For per-lesson billing, enter the fee and discount for one lesson.
            The recurring discount is always multiplied by four, even when the
            selected month contains five lessons.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Programme"
              value={enrolmentForm.programme_id}
              onChange={handleProgrammeSelection}
              required
              options={programmes
                .filter(
                  (programme) =>
                    programme.is_active ||
                    programme.id === enrolmentForm.programme_id,
                )
                .map((programme) => [
                  programme.id,
                  `${programme.name} (${programme.code})`,
                ])}
            />
            <SelectField
              label="Billing frequency"
              value={enrolmentForm.billing_frequency}
              onChange={(value) =>
                setEnrolmentForm((current) => ({
                  ...current,
                  billing_frequency: value as BillingFrequency,
                }))
              }
              options={[
                ["per_lesson", "Per lesson"],
                ["monthly", "Monthly fixed fee"],
                ["termly", "Termly"],
                ["one_off", "One-off"],
              ]}
            />
            <TextField
              label={
                enrolmentForm.billing_frequency === "per_lesson"
                  ? "Fee per lesson (SGD)"
                  : "Agreed fee (SGD)"
              }
              type="number"
              min="0"
              step="0.01"
              value={enrolmentForm.agreed_fee}
              onChange={(value) =>
                setEnrolmentForm((current) => ({
                  ...current,
                  agreed_fee: value,
                }))
              }
              required
            />
            <TextField
              label={
                enrolmentForm.billing_frequency === "per_lesson"
                  ? "Discount per lesson (SGD)"
                  : "Recurring discount (SGD)"
              }
              type="number"
              min="0"
              step="0.01"
              value={enrolmentForm.standard_discount_amount}
              onChange={(value) =>
                setEnrolmentForm((current) => ({
                  ...current,
                  standard_discount_amount: value,
                }))
              }
              required
            />

            {enrolmentForm.billing_frequency === "per_lesson" && (
              <>
                <SelectField
                  label="Regular class weekday"
                  value={enrolmentForm.regular_weekday}
                  onChange={(value) =>
                    setEnrolmentForm((current) => ({
                      ...current,
                      regular_weekday: value,
                    }))
                  }
                  required
                  options={[
                    ["", "Select weekday"],
                    ["1", "Monday"],
                    ["2", "Tuesday"],
                    ["3", "Wednesday"],
                    ["4", "Thursday"],
                    ["5", "Friday"],
                    ["6", "Saturday"],
                    ["7", "Sunday"],
                  ]}
                />
                <TextField
                  label="Regular class start time"
                  type="time"
                  value={enrolmentForm.regular_start_time}
                  onChange={(value) =>
                    setEnrolmentForm((current) => ({
                      ...current,
                      regular_start_time: value,
                    }))
                  }
                />
              </>
            )}

            <TextField
              label="Start date"
              type="date"
              value={enrolmentForm.start_date}
              onChange={(value) =>
                setEnrolmentForm((current) => ({
                  ...current,
                  start_date: value,
                }))
              }
              required
            />
            <TextField
              label="End date"
              type="date"
              value={enrolmentForm.end_date}
              onChange={(value) =>
                setEnrolmentForm((current) => ({
                  ...current,
                  end_date: value,
                }))
              }
            />
            <SelectField
              label="Status"
              value={enrolmentForm.status}
              onChange={(value) =>
                setEnrolmentForm((current) => ({
                  ...current,
                  status: value as EnrolmentStatus,
                }))
              }
              options={[
                ["active", "Active"],
                ["paused", "Paused"],
                ["ended", "Ended"],
                ["cancelled", "Cancelled"],
              ]}
            />
            <TextField
              label="Invoice line description"
              placeholder="e.g. Primary 4 Mathematics Tuition"
              value={enrolmentForm.invoice_description}
              onChange={(value) =>
                setEnrolmentForm((current) => ({
                  ...current,
                  invoice_description: value,
                }))
              }
            />
          </div>

          <TextAreaField
            label="Discount description"
            placeholder="e.g. Sibling discount"
            value={enrolmentForm.discount_description}
            onChange={(value) =>
              setEnrolmentForm((current) => ({
                ...current,
                discount_description: value,
              }))
            }
          />

          {enrolmentForm.billing_frequency === "per_lesson" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#decda9] bg-[#f8f1e3] p-4 text-sm">
                <span className="block text-xs font-black uppercase tracking-[0.12em] text-[#887759]">
                  Four-lesson month
                </span>
                <strong className="mt-2 block text-lg text-[#15233b]">
                  {formatCurrency(
                    Math.max(
                      numberValue(enrolmentForm.agreed_fee) * 4 -
                        numberValue(
                          enrolmentForm.standard_discount_amount,
                        ) *
                          4,
                      0,
                    ),
                  )}
                </strong>
              </div>
              <div className="rounded-2xl border border-[#decda9] bg-[#f8f1e3] p-4 text-sm">
                <span className="block text-xs font-black uppercase tracking-[0.12em] text-[#887759]">
                  Five-lesson month
                </span>
                <strong className="mt-2 block text-lg text-[#15233b]">
                  {formatCurrency(
                    Math.max(
                      numberValue(enrolmentForm.agreed_fee) * 5 -
                        numberValue(
                          enrolmentForm.standard_discount_amount,
                        ) *
                          4,
                      0,
                    ),
                  )}
                </strong>
                <span className="mt-1 block text-xs text-[#7d7465]">
                  The fifth lesson is charged at the full agreed rate.
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#decda9] bg-[#f8f1e3] p-4 text-sm">
              <span className="text-[#746a59]">Net recurring charge:</span>{" "}
              <strong className="text-[#15233b]">
                {formatCurrency(
                  Math.max(
                    numberValue(enrolmentForm.agreed_fee) -
                      numberValue(
                        enrolmentForm.standard_discount_amount,
                      ),
                    0,
                  ),
                )}
              </strong>
            </div>
          )}
        </form>
      </BillingModal>
    </BillingAdminShell>
  );
}

function StudentCard({
  student,
  enrolments,
  programmeMap,
  dreamscapeAddon,
  canAddEnrolment,
  onEditStudent,
  onManageDreamscape,
  onAddEnrolment,
  onEditEnrolment,
  onChangeStatus,
}: {
  student: BillingStudent;
  enrolments: BillingEnrolment[];
  programmeMap: Map<string, BillingProgramme>;
  dreamscapeAddon: GkpDreamscapeAddon | null;
  canAddEnrolment: boolean;
  onEditStudent: () => void;
  onManageDreamscape: () => void;
  onAddEnrolment: () => void;
  onEditEnrolment: (enrolment: BillingEnrolment) => void;
  onChangeStatus: (
    enrolment: BillingEnrolment,
    status: EnrolmentStatus,
  ) => void;
}) {
  const activeFourLessonEstimate = enrolments
    .filter((enrolment) => enrolment.status === "active")
    .reduce((sum, enrolment) => {
      const fee = numberValue(enrolment.agreed_fee);
      const discount = numberValue(
        enrolment.standard_discount_amount,
      );

      if (enrolment.billing_frequency === "per_lesson") {
        return sum + Math.max(fee * 4 - discount * 4, 0);
      }

      if (enrolment.billing_frequency === "monthly") {
        return sum + Math.max(fee - discount, 0);
      }

      return sum;
    }, 0);

  return (
    <article className="overflow-hidden rounded-[1.65rem] border border-[#ded5c4] bg-[#fbfaf7]">
      <header className="flex flex-col justify-between gap-4 border-b border-[#e9e2d7] p-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8d6828]">
              {student.student_code}
            </span>
            <span className="rounded-full border border-[#dcd3c5] px-3 py-1 text-[10px] font-black uppercase text-[#6f685d]">
              {student.status}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold">
            {student.full_name}
          </h3>
          <p className="mt-1 text-sm text-[#7a7368]">
            {[student.academic_level, student.school]
              .filter(Boolean)
              .join(" · ") || "No school details"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onManageDreamscape}
            className={`min-h-10 rounded-full border px-4 text-xs font-bold ${
              dreamscapeAddon?.status === "active"
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-[#d7c9ae] bg-white text-[#15233b]"
            }`}
          >
            {dreamscapeAddon?.status === "active"
              ? `Dreamscape ${
                  dreamscapeAddon.plan_code === "complete"
                    ? "Full"
                    : "Core"
                }`
              : "+ Dreamscape"}
          </button>

          <button
            type="button"
            onClick={onEditStudent}
            className="min-h-10 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
          >
            Edit student
          </button>
          <button
            type="button"
            onClick={onAddEnrolment}
            disabled={!canAddEnrolment}
            className="min-h-10 rounded-full bg-[#15233b] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            + Add programme
          </button>
        </div>
      </header>

      <div className="grid gap-3 border-b border-[#e9e2d7] bg-white/60 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCell
          label="Joined"
          value={formatDate(student.joined_on)}
        />
        <InfoCell
          label="Programmes"
          value={String(
            enrolments.filter(
              (enrolment) => enrolment.status === "active",
            ).length,
          )}
        />
        <InfoCell
          label="Class estimate"
          value={formatCurrency(activeFourLessonEstimate)}
        />
        <InfoCell
          label="Dreamscape"
          value={
            dreamscapeAddon?.status === "active"
              ? `${
                  dreamscapeAddon.plan_code === "complete"
                    ? "Full"
                    : "Core"
                } · ${formatCurrency(
                  numberValue(dreamscapeAddon.monthly_fee),
                )}/month`
              : "Not added"
          }
        />
      </div>

      {enrolments.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#80786c]">
          No programme enrolments yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="border-b border-[#ebe4da] text-[10px] font-black uppercase tracking-[0.13em] text-[#898176]">
                <th className="px-5 py-3">Programme</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Fee basis</th>
                <th className="px-4 py-3">Discount rule</th>
                <th className="px-4 py-3">4-lesson base</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrolments.map((enrolment) => {
                const programme = programmeMap.get(
                  enrolment.programme_id,
                );
                const fee = numberValue(enrolment.agreed_fee);
                const discount = numberValue(
                  enrolment.standard_discount_amount,
                );
                const fourLessonBase =
                  enrolment.billing_frequency === "per_lesson"
                    ? Math.max(fee * 4 - discount * 4, 0)
                    : Math.max(fee - discount, 0);

                return (
                  <tr
                    key={enrolment.id}
                    className="border-b border-[#eee8df] last:border-0"
                  >
                    <td className="px-5 py-4">
                      <strong>
                        {programme?.name || "Unknown programme"}
                      </strong>
                      <span className="mt-1 block text-xs text-[#8a8378]">
                        {billingFrequencyLabel(
                          enrolment.billing_frequency,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {enrolment.billing_frequency === "per_lesson" ? (
                        <>
                          <strong className="block">
                            {weekdayLabel(enrolment.regular_weekday)}
                          </strong>
                          <span className="mt-1 block text-xs text-[#8a8378]">
                            {formatTime(enrolment.regular_start_time)}
                          </span>
                        </>
                      ) : (
                        <strong className="block">
                          {billingFrequencyLabel(
                            enrolment.billing_frequency,
                          )}
                        </strong>
                      )}
                      <span className="mt-1 block text-xs text-[#8a8378]">
                        {formatDate(enrolment.start_date)} to{" "}
                        {formatDate(enrolment.end_date)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {formatCurrency(fee)}
                      <span className="mt-1 block text-xs font-normal text-[#8a8378]">
                        {enrolment.billing_frequency === "per_lesson"
                          ? "per lesson"
                          : billingFrequencyLabel(
                              enrolment.billing_frequency,
                            )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {formatCurrency(discount)}
                      <span className="mt-1 block max-w-[180px] text-xs text-[#8a8378]">
                        {enrolment.billing_frequency === "per_lesson"
                          ? "per lesson × 4 every month"
                          : "per billing period"}
                      </span>
                      {enrolment.discount_description && (
                        <span className="mt-1 block max-w-[180px] truncate text-xs text-[#8a8378]">
                          {enrolment.discount_description}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-black text-[#8a6325]">
                      {formatCurrency(fourLessonBase)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-[#dcd3c5] bg-white px-3 py-1.5 text-xs font-bold">
                        {enrolmentStatusLabel(enrolment.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onEditEnrolment(enrolment)
                          }
                          className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[11px] font-bold"
                        >
                          Edit
                        </button>
                        {enrolment.status === "active" && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeStatus(
                                enrolment,
                                "paused",
                              )
                            }
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800"
                          >
                            Pause
                          </button>
                        )}
                        {enrolment.status === "paused" && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeStatus(
                                enrolment,
                                "active",
                              )
                            }
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700"
                          >
                            Resume
                          </button>
                        )}
                        {(enrolment.status === "active" ||
                          enrolment.status === "paused") && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeStatus(
                                enrolment,
                                "ended",
                              )
                            }
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700"
                          >
                            End
                          </button>
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
    </article>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={`mb-5 rounded-2xl border p-4 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.65rem] border border-[#ded5c4] bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#887f72]">
        {label}
      </p>
      <strong className="mt-3 block break-words text-2xl font-semibold">
        {value}
      </strong>
      <span className="mt-2 block text-xs text-[#8a8378]">
        {detail}
      </span>
    </article>
  );
}

function SmallStat({
  label,
  value,
  active,
  compact = false,
}: {
  label: string;
  value: string | number;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <span className="min-w-0">
      <strong
        className={`block truncate ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {value}
      </strong>
      <small
        className={`mt-1 block text-[9px] uppercase tracking-[0.08em] ${
          active ? "text-white/50" : "text-[#9a9285]"
        }`}
      >
        {label}
      </small>
    </span>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f8f5ef] p-4">
      <dt className="text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
        {label}
      </dt>
      <dd className="mt-2 font-bold text-[#15233b]">{value}</dd>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#5e574d]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm outline-none transition focus:border-[#b98d3f]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<readonly [string, string] | [string, string]>;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#5e574d]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm outline-none transition focus:border-[#b98d3f]"
      >
        {options.length === 0 && (
          <option value="">No options available</option>
        )}
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#5e574d]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98d3f]"
      />
    </label>
  );
}

function ModalFooter({
  saving,
  submitLabel,
  formId,
  onCancel,
}: {
  saving: boolean;
  submitLabel: string;
  formId: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form={formId}
        disabled={saving}
        className="min-h-11 rounded-full bg-[#15233b] px-6 text-xs font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
