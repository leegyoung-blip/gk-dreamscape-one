"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type EffectiveAccess =
  | "complete"
  | "core"
  | "science"
  | "none";

type AccessFilter =
  | "all"
  | EffectiveAccess;

type StudentAccessRow = {
  user_id: string;
  email: string | null;
  username: string | null;
  user_role: string;

  subscription_plan_code: string | null;
  subscription_status: string | null;
  subscription_access_until: string | null;
  subscription_source: string | null;
  subscription_billing_cycle: string | null;
  cancel_at_period_end: boolean;
  revoked_at: string | null;

  manual_core: boolean;
  manual_science: boolean;
  core_source_course: string | null;
  science_source_course: string | null;

  effective_core: boolean;
  effective_science: boolean;
  effective_access: EffectiveAccess;
  access_source: string;
};

type StudentAccessRpcRow = {
  user_id: unknown;
  email: unknown;
  username: unknown;
  user_role: unknown;

  subscription_plan_code: unknown;
  subscription_status: unknown;
  subscription_access_until: unknown;
  subscription_source: unknown;
  subscription_billing_cycle: unknown;
  cancel_at_period_end: unknown;
  revoked_at: unknown;

  manual_core: unknown;
  manual_science: unknown;
  core_source_course: unknown;
  science_source_course: unknown;

  effective_core: unknown;
  effective_science: unknown;
  effective_access: unknown;
  access_source: unknown;
};

type PendingManualAccess = {
  core: boolean;
  science: boolean;
};

const inputClass =
  "min-h-12 w-full rounded-2xl border border-sky-200/16 bg-[#061632]/90 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-sky-200/45";

function normaliseEffectiveAccess(
  value: unknown,
): EffectiveAccess {
  const access = String(value || "")
    .trim()
    .toLowerCase();

  if (access === "complete") {
    return "complete";
  }

  if (access === "core") {
    return "core";
  }

  if (access === "science") {
    return "science";
  }

  return "none";
}

function accessLabel(
  value: EffectiveAccess,
) {
  if (value === "complete") {
    return "Core + Science";
  }

  if (value === "core") {
    return "Core";
  }

  if (value === "science") {
    return "Science";
  }

  return "No Access";
}

function planLabel(
  value: string | null,
) {
  const plan = String(value || "")
    .trim()
    .toLowerCase();

  if (plan === "complete") {
    return "Complete Student Access";
  }

  if (plan === "core") {
    return "Core Student Access";
  }

  if (plan === "science") {
    return "Science Student Access";
  }

  return "No paid plan";
}

function formatDate(
  value: string | null,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function sourceLabel(
  value: string,
) {
  const source = String(value || "")
    .trim()
    .toLowerCase();

  if (source === "hitpay") {
    return "HitPay";
  }

  if (source === "gkp_billing") {
    return "GKP Billing";
  }

  if (source === "manual") {
    return "Manual";
  }

  if (source === "hitpay + manual") {
    return "HitPay + Manual";
  }

  if (source === "gkp_billing + manual") {
    return "GKP Billing + Manual";
  }

  if (source === "shopify") {
    return "Legacy Shopify";
  }

  if (source === "shopify + manual") {
    return "Legacy Shopify + Manual";
  }

  if (source === "subscription") {
    return "Subscription";
  }

  if (source === "subscription + manual") {
    return "Subscription + Manual";
  }

  if (!source || source === "none") {
    return "None";
  }

  return value;
}

export default function StudentAccessPanel() {
  const [rows, setRows] =
    useState<StudentAccessRow[]>([]);

  const [
    pendingManualAccess,
    setPendingManualAccess,
  ] = useState<
    Record<string, PendingManualAccess>
  >({});

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<AccessFilter>("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    savingUserId,
    setSavingUserId,
  ] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function loadAccess() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } =
      await supabase.rpc(
        "admin_get_student_learning_access",
      );

    if (error) {
      setRows([]);
      setPendingManualAccess({});
      setErrorMessage(
        error.message ||
          "Could not load student access.",
      );
      setIsLoading(false);
      return;
    }

    const nextRows = (
      (data ?? []) as StudentAccessRpcRow[]
    ).map(
      (row): StudentAccessRow => ({
        user_id: String(row.user_id),
        email: row.email
          ? String(row.email)
          : null,
        username: row.username
          ? String(row.username)
          : null,
        user_role: String(
          row.user_role || "student",
        ),

        subscription_plan_code:
          row.subscription_plan_code
            ? String(
                row.subscription_plan_code,
              )
            : null,

        subscription_status:
          row.subscription_status
            ? String(
                row.subscription_status,
              )
            : null,

        subscription_access_until:
          row.subscription_access_until
            ? String(
                row.subscription_access_until,
              )
            : null,

        subscription_source:
          row.subscription_source
            ? String(
                row.subscription_source,
              )
            : null,

        subscription_billing_cycle:
          row.subscription_billing_cycle
            ? String(
                row.subscription_billing_cycle,
              )
            : null,

        cancel_at_period_end:
          Boolean(
            row.cancel_at_period_end,
          ),

        revoked_at: row.revoked_at
          ? String(row.revoked_at)
          : null,

        manual_core:
          Boolean(row.manual_core),

        manual_science:
          Boolean(row.manual_science),

        core_source_course:
          row.core_source_course
            ? String(
                row.core_source_course,
              )
            : null,

        science_source_course:
          row.science_source_course
            ? String(
                row.science_source_course,
              )
            : null,

        effective_core:
          Boolean(row.effective_core),

        effective_science:
          Boolean(
            row.effective_science,
          ),

        effective_access:
          normaliseEffectiveAccess(
            row.effective_access,
          ),

        access_source: String(
          row.access_source || "none",
        ),
      }),
    );

    setRows(nextRows);

    setPendingManualAccess(
      Object.fromEntries(
        nextRows.map((row) => [
          row.user_id,
          {
            core: row.manual_core,
            science: row.manual_science,
          },
        ]),
      ),
    );

    setIsLoading(false);
  }

  useEffect(() => {
    void loadAccess();
  }, []);

  const counts = useMemo(() => {
    return rows.reduce(
      (result, row) => {
        result[row.effective_access] += 1;
        return result;
      },
      {
        complete: 0,
        core: 0,
        science: 0,
        none: 0,
      } as Record<EffectiveAccess, number>,
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    return rows.filter((row) => {
      if (
        filter !== "all" &&
        row.effective_access !== filter
      ) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        String(row.email || "")
          .toLowerCase()
          .includes(term) ||
        String(row.username || "")
          .toLowerCase()
          .includes(term) ||
        String(row.user_role || "")
          .toLowerCase()
          .includes(term) ||
        accessLabel(row.effective_access)
          .toLowerCase()
          .includes(term) ||
        sourceLabel(row.access_source)
          .toLowerCase()
          .includes(term)
      );
    });
  }, [
    rows,
    search,
    filter,
  ]);

  function updatePending(
    userId: string,
    key: keyof PendingManualAccess,
    value: boolean,
  ) {
    setPendingManualAccess(
      (current) => ({
        ...current,
        [userId]: {
          core:
            current[userId]?.core ??
            false,
          science:
            current[userId]
              ?.science ?? false,
          [key]: value,
        },
      }),
    );
  }

  async function saveManualAccess(
    row: StudentAccessRow,
  ) {
    const pending =
      pendingManualAccess[
        row.user_id
      ] || {
        core: row.manual_core,
        science: row.manual_science,
      };

    const hasChanges =
      pending.core !==
        row.manual_core ||
      pending.science !==
        row.manual_science;

    if (!hasChanges) {
      setMessage(
        `${row.email || row.username || "This student"} already has these manual access settings.`,
      );
      setErrorMessage("");
      return;
    }

    setSavingUserId(row.user_id);
    setMessage("");
    setErrorMessage("");

    const { error } =
      await supabase.rpc(
        "admin_set_student_learning_access",
        {
          p_user_id: row.user_id,
          p_core: pending.core,
          p_science:
            pending.science,
          p_notes:
            "Updated from Dreamscape Admin · Student Access",
        },
      );

    if (error) {
      setErrorMessage(
        error.message ||
          "Student access could not be updated.",
      );
      setSavingUserId(null);
      return;
    }

    setMessage(
      `Manual access saved for ${
        row.email ||
        row.username ||
        "student"
      }.`,
    );

    await loadAccess();
    setSavingUserId(null);
  }

  return (
    <section className="mt-8">
      <div className="rounded-[32px] border border-sky-200/18 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-sky-200">
              Learning Access
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
              Student Access
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/58">
              View each learner&apos;s effective
              Core and Science access. Paid
              Dreamscape subscriptions remain automatic;
              the controls here only manage the
              separate manual Core and Science
              unlocks.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadAccess()
            }
            disabled={isLoading}
            className="min-h-12 rounded-2xl border border-sky-200/24 bg-sky-300/[0.08] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-sky-100 transition hover:border-sky-200/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "Loading..."
              : "Refresh Access"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AccessMetric
            label="Core Only"
            value={
              isLoading
                ? "..."
                : counts.core.toLocaleString()
            }
            tone="cyan"
          />

          <AccessMetric
            label="Science Only"
            value={
              isLoading
                ? "..."
                : counts.science.toLocaleString()
            }
            tone="pink"
          />

          <AccessMetric
            label="Core + Science"
            value={
              isLoading
                ? "..."
                : counts.complete.toLocaleString()
            }
            tone="violet"
          />

          <AccessMetric
            label="No Access"
            value={
              isLoading
                ? "..."
                : counts.none.toLocaleString()
            }
            tone="slate"
          />
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px]">
          <label className="grid gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/42">
              Search students
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search email, username, role, or source"
              className={inputClass}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/42">
              Effective access
            </span>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target
                    .value as AccessFilter,
                )
              }
              className={inputClass}
            >
              <option value="all">
                All access
              </option>
              <option value="complete">
                Core + Science
              </option>
              <option value="core">
                Core only
              </option>
              <option value="science">
                Science only
              </option>
              <option value="none">
                No access
              </option>
            </select>
          </label>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/[0.09] px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 grid gap-3">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50">
              Loading student
              access...
            </div>
          ) : filteredRows.length ===
            0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50">
              No students match the
              current search and filter.
            </div>
          ) : (
            filteredRows.map(
              (row) => {
                const pending =
                  pendingManualAccess[
                    row.user_id
                  ] || {
                    core:
                      row.manual_core,
                    science:
                      row.manual_science,
                  };

                const hasChanges =
                  pending.core !==
                    row.manual_core ||
                  pending.science !==
                    row.manual_science;

                const isSaving =
                  savingUserId ===
                  row.user_id;

                return (
                  <article
                    key={row.user_id}
                    className="rounded-[24px] border border-sky-200/12 bg-[#061632]/72 p-4 sm:p-5"
                  >
                    <div className="grid gap-5 2xl:grid-cols-[minmax(240px,1.15fr)_minmax(260px,1fr)_minmax(290px,1.1fr)_150px] 2xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-all text-base font-bold text-white">
                            {row.email ||
                              "No email"}
                          </h3>

                          <AccessBadge
                            access={
                              row.effective_access
                            }
                          />

                          <SourceBadge
                            source={
                              row.access_source
                            }
                            subscriptionSource={
                              row.subscription_source
                            }
                          />
                        </div>

                        <p className="mt-2 text-sm text-white/52">
                          Username:{" "}
                          {row.username ||
                            "not set"}
                        </p>

                        <p className="mt-1 text-xs text-white/34">
                          Role:{" "}
                          {row.user_role ||
                            "student"}
                        </p>

                        <p className="mt-1 break-all text-[10px] text-white/24">
                          {row.user_id}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/36">
                          Purchased Access
                        </p>

                        <p className="mt-2 font-bold text-white">
                          {planLabel(
                            row.subscription_plan_code,
                          )}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/44">
                          <span>
                            Status:{" "}
                            {row.subscription_status ||
                              "—"}
                          </span>

                          <span>
                            Until:{" "}
                            {formatDate(
                              row.subscription_access_until,
                            )}
                          </span>

                          {row.subscription_billing_cycle && (
                            <span>
                              {
                                row.subscription_billing_cycle
                              }
                            </span>
                          )}
                        </div>

                        {row.cancel_at_period_end && (
                          <p className="mt-2 text-[11px] font-semibold text-amber-200">
                            Cancels at period
                            end
                          </p>
                        )}

                        {row.revoked_at && (
                          <p className="mt-2 text-[11px] font-semibold text-red-200">
                            Revoked{" "}
                            {formatDate(
                              row.revoked_at,
                            )}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-sky-200/14 bg-sky-300/[0.045] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-sky-100/62">
                          Manual Access
                        </p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <ManualToggle
                            label="Core"
                            checked={
                              pending.core
                            }
                            source={
                              row.core_source_course
                            }
                            disabled={
                              isSaving
                            }
                            onChange={(
                              checked,
                            ) =>
                              updatePending(
                                row.user_id,
                                "core",
                                checked,
                              )
                            }
                          />

                          <ManualToggle
                            label="Science"
                            checked={
                              pending.science
                            }
                            source={
                              row.science_source_course
                            }
                            disabled={
                              isSaving
                            }
                            onChange={(
                              checked,
                            ) =>
                              updatePending(
                                row.user_id,
                                "science",
                                checked,
                              )
                            }
                          />
                        </div>

                        <p className="mt-3 text-[11px] leading-5 text-white/36">
                          Manual access adds to
                          paid access. Turning a
                          manual switch off does
                          not cancel an active
                          paid subscription.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          !hasChanges ||
                          isSaving
                        }
                        onClick={() =>
                          void saveManualAccess(
                            row,
                          )
                        }
                        className="min-h-12 rounded-2xl border border-sky-200/30 bg-gradient-to-br from-sky-400/24 to-blue-500/22 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:border-sky-100/55 disabled:cursor-not-allowed disabled:opacity-38"
                      >
                        {isSaving
                          ? "Saving..."
                          : hasChanges
                            ? "Save Access"
                            : "Saved"}
                      </button>
                    </div>
                  </article>
                );
              },
            )
          )}
        </div>
      </div>
    </section>
  );
}

function AccessMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "cyan"
    | "pink"
    | "violet"
    | "slate";
}) {
  const toneClass =
    tone === "pink"
      ? "border-pink-200/18 bg-pink-400/[0.06] text-pink-200"
      : tone === "violet"
        ? "border-violet-200/18 bg-violet-400/[0.06] text-violet-200"
        : tone === "slate"
          ? "border-white/12 bg-white/[0.035] text-white/68"
          : "border-cyan-200/18 bg-cyan-400/[0.06] text-cyan-200";

  return (
    <div
      className={`rounded-3xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl ${toneClass}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-white/42">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">
        {value}
      </p>
    </div>
  );
}

function AccessBadge({
  access,
}: {
  access: EffectiveAccess;
}) {
  const className =
    access === "complete"
      ? "border-violet-200/24 bg-violet-400/12 text-violet-100"
      : access === "core"
        ? "border-cyan-200/24 bg-cyan-400/12 text-cyan-100"
        : access === "science"
          ? "border-pink-200/24 bg-pink-400/12 text-pink-100"
          : "border-white/12 bg-white/[0.04] text-white/48";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${className}`}
    >
      {accessLabel(access)}
    </span>
  );
}

function SourceBadge({
  source,
  subscriptionSource,
}: {
  source: string;
  subscriptionSource: string | null;
}) {
  const normalisedSource = String(source || "").toLowerCase();
  const paidSource = String(subscriptionSource || "")
    .trim()
    .toLowerCase();

  const resolvedSource =
    normalisedSource === "subscription"
      ? paidSource || "subscription"
      : normalisedSource === "subscription + manual"
        ? paidSource
          ? `${paidSource} + manual`
          : "subscription + manual"
        : source;

  const label = sourceLabel(resolvedSource);

  return (
    <span className="rounded-full border border-emerald-200/18 bg-emerald-300/[0.07] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-100">
      {label}
    </span>
  );
}

function ManualToggle({
  label,
  checked,
  source,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  source: string | null;
  disabled: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <label
      className={`rounded-2xl border p-3 transition ${
        checked
          ? "border-emerald-200/24 bg-emerald-300/[0.08]"
          : "border-white/10 bg-white/[0.025]"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span>
          <strong className="block text-sm text-white">
            {label}
          </strong>

          <small className="mt-1 block text-[10px] text-white/34">
            {source
              ? `Source: ${source}`
              : checked
                ? "Manual unlock"
                : "No manual unlock"}
          </small>
        </span>

        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.checked,
            )
          }
          className="h-5 w-5 shrink-0 accent-emerald-300"
        />
      </span>
    </label>
  );
}
