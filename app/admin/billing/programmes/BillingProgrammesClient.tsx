"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "../_components/BillingAdminShell";
import BillingModal from "../_components/BillingModal";
import type {
  BillingFrequency,
  BillingProgramme,
} from "../_lib/billingTypes";
import {
  billingFrequencyLabel,
  errorMessage,
  formatCurrency,
  normaliseOptionalText,
  numberValue,
} from "../_lib/billingUtils";

type ProgrammeForm = {
  code: string;
  name: string;
  description: string;
  default_fee: string;
  billing_frequency: BillingFrequency;
  sort_order: string;
  is_active: boolean;
};

type EnrolmentCount = {
  programme_id: string;
  status: string;
};

const DEFAULT_FORM: ProgrammeForm = {
  code: "",
  name: "",
  description: "",
  default_fee: "0",
  billing_frequency: "monthly",
  sort_order: "0",
  is_active: true,
};

export default function BillingProgrammesClient() {
  const [programmes, setProgrammes] = useState<BillingProgramme[]>([]);
  const [enrolments, setEnrolments] = useState<EnrolmentCount[]>([]);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgrammeId, setEditingProgrammeId] = useState("");
  const [form, setForm] = useState<ProgrammeForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProgrammes = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const [programmeResult, enrolmentResult] = await Promise.all([
      supabase
        .from("gkp_billing_programmes")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("gkp_billing_enrolments")
        .select("programme_id,status"),
    ]);

    const firstError =
      programmeResult.error || enrolmentResult.error;

    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    setProgrammes(
      (programmeResult.data || []) as BillingProgramme[],
    );
    setEnrolments(
      (enrolmentResult.data || []) as EnrolmentCount[],
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  const filteredProgrammes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return programmes.filter((programme) => {
      if (!showInactive && !programme.is_active) return false;

      if (!query) return true;

      return [
        programme.code,
        programme.name,
        programme.description,
        programme.billing_frequency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [programmes, search, showInactive]);

  const totalDefaultMonthly = programmes
    .filter(
      (programme) =>
        programme.is_active &&
        programme.billing_frequency === "monthly",
    )
    .reduce(
      (sum, programme) =>
        sum + numberValue(programme.default_fee),
      0,
    );

  function openCreate() {
    setEditingProgrammeId("");
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(programme: BillingProgramme) {
    setEditingProgrammeId(programme.id);
    setForm({
      code: programme.code,
      name: programme.name,
      description: programme.description || "",
      default_fee: String(numberValue(programme.default_fee)),
      billing_frequency: programme.billing_frequency,
      sort_order: String(programme.sort_order),
      is_active: programme.is_active,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function submitProgramme(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      const fee = Number(form.default_fee);
      const sortOrder = Number(form.sort_order);

      if (!Number.isFinite(fee) || fee < 0) {
        throw new Error("Enter a valid default fee.");
      }

      if (!Number.isInteger(sortOrder)) {
        throw new Error("Sort order must be a whole number.");
      }

      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: normaliseOptionalText(form.description),
        default_fee: fee,
        billing_frequency: form.billing_frequency,
        sort_order: sortOrder,
        is_active: form.is_active,
      };

      if (editingProgrammeId) {
        const { error } = await supabase
          .from("gkp_billing_programmes")
          .update(payload)
          .eq("id", editingProgrammeId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gkp_billing_programmes")
          .insert(payload);

        if (error) throw error;
      }

      setModalOpen(false);
      setNotice(
        editingProgrammeId
          ? "Programme updated."
          : "Programme created.",
      );
      await loadProgrammes();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleProgramme(
    programme: BillingProgramme,
  ) {
    setLoadError("");
    setNotice("");

    const { error } = await supabase
      .from("gkp_billing_programmes")
      .update({ is_active: !programme.is_active })
      .eq("id", programme.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    setNotice(
      programme.is_active
        ? "Programme deactivated. Existing enrolments were preserved."
        : "Programme reactivated.",
    );
    await loadProgrammes();
  }

  return (
    <BillingAdminShell
      eyebrow="Fee catalogue"
      title="Programmes"
      description="Store standard programme names, fees and billing frequencies. Individual student agreements can override these defaults."
      actions={
        <>
          <button
            type="button"
            onClick={() => void loadProgrammes()}
            disabled={loading}
            className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-xs font-bold text-white"
          >
            + New programme
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
          label="Active programmes"
          value={String(
            programmes.filter((programme) => programme.is_active)
              .length,
          )}
          detail={`${programmes.length} total records`}
        />
        <SummaryCard
          label="Monthly programmes"
          value={String(
            programmes.filter(
              (programme) =>
                programme.is_active &&
                programme.billing_frequency === "monthly",
            ).length,
          )}
          detail="Eligible for monthly generation"
        />
        <SummaryCard
          label="Open enrolments"
          value={String(
            enrolments.filter((enrolment) =>
              ["active", "paused"].includes(enrolment.status),
            ).length,
          )}
          detail="Across all students"
        />
        <SummaryCard
          label="Sum of standard fees"
          value={formatCurrency(totalDefaultMonthly)}
          detail="Reference only, not revenue"
        />
      </div>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
        <div className="flex flex-col gap-4 border-b border-[#ebe5da] p-5 sm:flex-row sm:items-end sm:justify-between">
          <label className="block w-full max-w-lg">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#867d70]">
              Search programmes
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Programme name, code or frequency…"
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-[#fbfaf7] px-4 text-sm outline-none transition focus:border-[#b98d3f]"
            />
          </label>

          <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[#dcd3c3] bg-[#fbfaf7] px-4 text-sm font-bold text-[#5f584e]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) =>
                setShowInactive(event.target.checked)
              }
              className="h-4 w-4"
            />
            Show inactive
          </label>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-[#81796d]">
            Loading programmes…
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eadc] text-xl font-black text-[#a27627]">
              0
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              No programmes found
            </h2>
            <p className="mt-2 text-sm text-[#81796d]">
              Create the first billing programme and standard fee.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 rounded-full bg-[#15233b] px-5 py-3 text-xs font-bold text-white"
            >
              Create programme
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-[#eee8dd] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
                  <th className="px-6 py-4">Programme</th>
                  <th className="px-4 py-4">Frequency</th>
                  <th className="px-4 py-4">Standard fee</th>
                  <th className="px-4 py-4">Enrolments</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProgrammes.map((programme) => {
                  const programmeEnrolments = enrolments.filter(
                    (enrolment) =>
                      enrolment.programme_id === programme.id,
                  );
                  const activeCount = programmeEnrolments.filter(
                    (enrolment) =>
                      enrolment.status === "active",
                  ).length;

                  return (
                    <tr
                      key={programme.id}
                      className="border-b border-[#eee8df] last:border-0"
                    >
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-[#f1eadc] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#8d6828]">
                          {programme.code}
                        </span>
                        <strong className="mt-3 block text-base">
                          {programme.name}
                        </strong>
                        {programme.description && (
                          <span className="mt-1 block max-w-md text-xs leading-5 text-[#898176]">
                            {programme.description}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-5 text-sm">
                        {billingFrequencyLabel(
                          programme.billing_frequency,
                        )}
                      </td>
                      <td className="px-4 py-5 text-base font-black text-[#8b6628]">
                        {formatCurrency(
                          numberValue(programme.default_fee),
                        )}
                      </td>
                      <td className="px-4 py-5">
                        <strong>{activeCount}</strong>
                        <span className="mt-1 block text-xs text-[#8a8378]">
                          {programmeEnrolments.length} total
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                            programme.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          {programme.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(programme)}
                            className="rounded-full border border-[#d7c9ae] bg-white px-4 py-2 text-xs font-bold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void toggleProgramme(programme)
                            }
                            className={`rounded-full border px-4 py-2 text-xs font-bold ${
                              programme.is_active
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {programme.is_active
                              ? "Deactivate"
                              : "Reactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-5 rounded-2xl border border-[#decda9] bg-[#f8f1e3] p-4 text-sm leading-6 text-[#6d6252]">
        Changing a standard fee does not alter existing students&apos;
        agreed fees. The new amount is only prefilled when a future
        enrolment is created.
      </div>

      <BillingModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        eyebrow={
          editingProgrammeId
            ? "Programme settings"
            : "New fee item"
        }
        title={
          editingProgrammeId
            ? "Edit programme"
            : "Create programme"
        }
        description="Use a short unique code. Existing enrolments retain their own agreed fee."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="programme-form"
              disabled={saving}
              className="min-h-11 rounded-full bg-[#15233b] px-6 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : editingProgrammeId
                  ? "Save programme"
                  : "Create programme"}
            </button>
          </div>
        }
      >
        <form
          id="programme-form"
          onSubmit={submitProgramme}
          className="grid gap-5"
        >
          {formError && (
            <Alert tone="error">{formError}</Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Programme code"
              placeholder="e.g. P4-MATH"
              value={form.code}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  code: value.toUpperCase(),
                }))
              }
              required
            />
            <TextField
              label="Programme name"
              placeholder="e.g. Primary 4 Mathematics"
              value={form.name}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  name: value,
                }))
              }
              required
            />
            <TextField
              label="Standard fee (SGD)"
              type="number"
              min="0"
              step="0.01"
              value={form.default_fee}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  default_fee: value,
                }))
              }
              required
            />
            <SelectField
              label="Billing frequency"
              value={form.billing_frequency}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  billing_frequency: value as BillingFrequency,
                }))
              }
              options={[
                ["monthly", "Monthly"],
                ["termly", "Termly"],
                ["one_off", "One-off"],
                ["per_lesson", "Per lesson"],
              ]}
            />
            <TextField
              label="Sort order"
              type="number"
              step="1"
              value={form.sort_order}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  sort_order: value,
                }))
              }
              required
            />
            <label className="flex min-h-11 items-center gap-3 self-end rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm font-bold text-[#5f584e]">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              Programme is active
            </label>
          </div>

          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                description: value,
              }))
            }
          />
        </form>
      </BillingModal>
    </BillingAdminShell>
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

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#5e574d]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 text-sm outline-none transition focus:border-[#b98d3f]"
      >
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#5e574d]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-2xl border border-[#dcd3c3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b98d3f]"
      />
    </label>
  );
}
