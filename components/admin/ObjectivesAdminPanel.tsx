"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ObjectiveScope = "global" | "nova" | "milo";

type ObjectiveDefinition = {
  id: string;
  objective_key: string;
  objective_type: "referral" | "progress";
  objective_scope: ObjectiveScope;
  title: string;
  description: string | null;
  reward_dt: number;
  reward_dg: number;
  sort_order: number;
  condition_type: string;
  condition_config: Record<string, unknown>;
  eligibility_type: string;
  eligibility_config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: number;
  objective_id: string | null;
  objective_key: string;
  action: "insert" | "update" | "delete";
  actor_user_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
};

type Draft = {
  title: string;
  description: string;
  reward_dt: string;
  reward_dg: string;
  sort_order: string;
  is_enabled: boolean;
};

const scopeTabs: {
  id: ObjectiveScope;
  label: string;
  description: string;
}[] = [
  {
    id: "global",
    label: "Global Referral",
    description: "Shared referral milestones shown in both Nova and Milo.",
  },
  {
    id: "nova",
    label: "Nova Progress",
    description: "Nova Home, Knowledge Arena, Core Missions and Rover objectives.",
  },
  {
    id: "milo",
    label: "Milo Progress",
    description: "Mastery Code, Quiz Hall and Exchange objectives.",
  },
];

function formatDateTime(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function createDraft(objective: ObjectiveDefinition): Draft {
  return {
    title: objective.title || "",
    description: objective.description || "",
    reward_dt: String(Math.max(0, Number(objective.reward_dt || 0))),
    reward_dg: String(Math.max(0, Number(objective.reward_dg || 0))),
    sort_order: String(Math.max(0, Number(objective.sort_order || 0))),
    is_enabled: Boolean(objective.is_enabled),
  };
}

function safeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function prettyJson(value: Record<string, unknown>) {
  const keys = Object.keys(value || {});
  if (keys.length === 0) return "{}";

  return JSON.stringify(value, null, 2);
}

export default function ObjectivesAdminPanel() {
  const [scope, setScope] = useState<ObjectiveScope>("global");
  const [view, setView] = useState<"catalogue" | "audit">("catalogue");

  const [objectives, setObjectives] = useState<ObjectiveDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [reordering, setReordering] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const enabledCount = useMemo(
    () => objectives.filter((objective) => objective.is_enabled).length,
    [objectives],
  );

  const disabledCount = objectives.length - enabledCount;

  const loadCatalogue = useCallback(async (nextScope: ObjectiveScope) => {
    setIsLoading(true);
    setErrorMessage("");
    setMessage("");

    const { data, error } = await supabase.rpc("objective_admin_list", {
      p_scope: nextScope,
    });

    if (error) {
      setObjectives([]);
      setDrafts({});
      setErrorMessage(error.message || "Could not load objectives.");
      setIsLoading(false);
      return;
    }

    const payload = data as
      | {
          scope?: string | null;
          objectives?: unknown[];
        }
      | null;

    const rows = Array.isArray(payload?.objectives)
      ? payload!.objectives!
          .map((item) => {
            const row = safeObject(item);

            return {
              id: String(row.id || ""),
              objective_key: String(row.objective_key || ""),
              objective_type:
                String(row.objective_type || "") === "referral"
                  ? "referral"
                  : "progress",
              objective_scope: String(
                row.objective_scope || nextScope,
              ) as ObjectiveScope,
              title: String(row.title || ""),
              description:
                row.description === null || row.description === undefined
                  ? null
                  : String(row.description),
              reward_dt: Number(row.reward_dt || 0),
              reward_dg: Number(row.reward_dg || 0),
              sort_order: Number(row.sort_order || 0),
              condition_type: String(row.condition_type || ""),
              condition_config: safeObject(row.condition_config),
              eligibility_type: String(row.eligibility_type || "always"),
              eligibility_config: safeObject(row.eligibility_config),
              is_enabled: Boolean(row.is_enabled),
              created_at: String(row.created_at || ""),
              updated_at: String(row.updated_at || ""),
            } satisfies ObjectiveDefinition;
          })
          .filter((row) => row.id && row.objective_key)
          .sort(
            (a, b) =>
              a.sort_order - b.sort_order ||
              a.objective_key.localeCompare(b.objective_key),
          )
      : [];

    setObjectives(rows);
    setDrafts(
      rows.reduce<Record<string, Draft>>((next, objective) => {
        next[objective.objective_key] = createDraft(objective);
        return next;
      }, {}),
    );
    setIsLoading(false);
  }, []);

  const loadAudit = useCallback(async () => {
    setIsAuditLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc("objective_admin_audit", {
      p_limit: 100,
    });

    if (error) {
      setAuditRows([]);
      setErrorMessage(error.message || "Could not load objective audit history.");
      setIsAuditLoading(false);
      return;
    }

    const payload = data as { history?: unknown[] } | null;
    const rows = Array.isArray(payload?.history)
      ? payload!.history!
          .map((item) => {
            const row = safeObject(item);
            const action = String(row.action || "update");

            return {
              id: Number(row.id || 0),
              objective_id:
                row.objective_id === null || row.objective_id === undefined
                  ? null
                  : String(row.objective_id),
              objective_key: String(row.objective_key || ""),
              action:
                action === "insert" || action === "delete"
                  ? action
                  : "update",
              actor_user_id:
                row.actor_user_id === null || row.actor_user_id === undefined
                  ? null
                  : String(row.actor_user_id),
              before_state:
                row.before_state === null || row.before_state === undefined
                  ? null
                  : safeObject(row.before_state),
              after_state:
                row.after_state === null || row.after_state === undefined
                  ? null
                  : safeObject(row.after_state),
              created_at: String(row.created_at || ""),
            } satisfies AuditRow;
          })
          .filter((row) => row.id > 0)
      : [];

    setAuditRows(rows);
    setIsAuditLoading(false);
  }, []);

  useEffect(() => {
    void loadCatalogue(scope);
  }, [loadCatalogue, scope]);

  useEffect(() => {
    if (view === "audit") {
      void loadAudit();
    }
  }, [loadAudit, view]);

  function updateDraft(
    objectiveKey: string,
    patch: Partial<Draft>,
  ) {
    setDrafts((current) => ({
      ...current,
      [objectiveKey]: {
        ...(current[objectiveKey] || {
          title: "",
          description: "",
          reward_dt: "0",
          reward_dg: "0",
          sort_order: "0",
          is_enabled: true,
        }),
        ...patch,
      },
    }));
  }

  async function saveObjective(objective: ObjectiveDefinition) {
    const draft = drafts[objective.objective_key];
    if (!draft) return;

    const rewardDt = Number(draft.reward_dt);
    const rewardDg = Number(draft.reward_dg);
    const sortOrder = Number(draft.sort_order);

    setMessage("");
    setErrorMessage("");

    if (!draft.title.trim()) {
      setErrorMessage("Objective title cannot be empty.");
      return;
    }

    if (
      !Number.isInteger(rewardDt) ||
      rewardDt < 0 ||
      !Number.isInteger(rewardDg) ||
      rewardDg < 0
    ) {
      setErrorMessage("DT and DG rewards must be whole numbers of 0 or more.");
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setErrorMessage("Sort order must be a whole number of 0 or more.");
      return;
    }

    setSavingKey(objective.objective_key);

    const { error } = await supabase.rpc("objective_admin_update", {
      p_objective_key: objective.objective_key,
      p_title: draft.title.trim(),
      p_description: draft.description,
      p_reward_dt: rewardDt,
      p_reward_dg: rewardDg,
      p_sort_order: sortOrder,
      p_is_enabled: draft.is_enabled,
    });

    setSavingKey("");

    if (error) {
      setErrorMessage(error.message || "Objective could not be saved.");
      return;
    }

    setMessage(`Saved ${draft.title.trim()}.`);
    await loadCatalogue(scope);
  }

  async function reorderObjective(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= objectives.length) return;

    const reordered = [...objectives];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((objective, orderIndex) => ({
      objective_key: objective.objective_key,
      sort_order: (orderIndex + 1) * 10,
    }));

    setReordering(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("objective_admin_reorder", {
      p_scope: scope,
      p_items: payload,
    });

    setReordering(false);

    if (error) {
      setErrorMessage(error.message || "Objectives could not be reordered.");
      return;
    }

    setMessage("Objective order updated.");
    await loadCatalogue(scope);
  }

  async function toggleObjective(objective: ObjectiveDefinition) {
    const currentDraft = drafts[objective.objective_key] || createDraft(objective);
    const nextEnabled = !currentDraft.is_enabled;

    updateDraft(objective.objective_key, {
      is_enabled: nextEnabled,
    });

    setSavingKey(objective.objective_key);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("objective_admin_update", {
      p_objective_key: objective.objective_key,
      p_title: currentDraft.title.trim() || objective.title,
      p_description: currentDraft.description,
      p_reward_dt: Number(currentDraft.reward_dt || objective.reward_dt || 0),
      p_reward_dg: Number(currentDraft.reward_dg || objective.reward_dg || 0),
      p_sort_order: Number(
        currentDraft.sort_order || objective.sort_order || 0,
      ),
      p_is_enabled: nextEnabled,
    });

    setSavingKey("");

    if (error) {
      updateDraft(objective.objective_key, {
        is_enabled: currentDraft.is_enabled,
      });
      setErrorMessage(error.message || "Objective status could not be changed.");
      return;
    }

    setMessage(
      `${objective.title} ${nextEnabled ? "enabled" : "disabled"}.`,
    );
    await loadCatalogue(scope);
  }

  return (
    <section className="mt-8">
      <div className="rounded-[32px] border border-cyan-200/16 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">
              Objectives Administration
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
              Manage live objective catalogue
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/56">
              Edit player-facing copy, DT/DG rewards, order and availability.
              Completion conditions, eligibility rules, scope and objective keys
              remain developer-controlled so an admin edit cannot change how
              achievements are verified.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              view === "audit" ? void loadAudit() : void loadCatalogue(scope)
            }
            disabled={isLoading || isAuditLoading}
            className="min-h-11 rounded-full border border-cyan-200/24 bg-cyan-300/[0.08] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#bdf6ff] transition hover:bg-cyan-300/[0.14] disabled:cursor-wait disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 sm:grid-cols-4">
          {scopeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setView("catalogue");
                setScope(tab.id);
              }}
              className={`min-h-12 rounded-xl border px-4 text-xs font-extrabold uppercase tracking-[0.1em] transition ${
                view === "catalogue" && scope === tab.id
                  ? "border-cyan-200/34 bg-cyan-300/12 text-[#8dfcff]"
                  : "border-transparent bg-white/[0.03] text-white/48 hover:border-white/12 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setView("audit")}
            className={`min-h-12 rounded-xl border px-4 text-xs font-extrabold uppercase tracking-[0.1em] transition ${
              view === "audit"
                ? "border-violet-200/36 bg-violet-300/12 text-violet-100"
                : "border-transparent bg-white/[0.03] text-white/48 hover:border-white/12 hover:text-white"
            }`}
          >
            Edit History
          </button>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-100">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.08] px-5 py-4 text-sm leading-6 text-emerald-100">
            {message}
          </div>
        )}

        {view === "catalogue" ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/38">
                  Catalogue
                </p>
                <p className="mt-2 text-3xl font-extrabold text-white">
                  {isLoading ? "..." : objectives.length}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200/14 bg-emerald-300/[0.06] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/38">
                  Enabled
                </p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-200">
                  {isLoading ? "..." : enabledCount}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200/14 bg-amber-300/[0.06] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/38">
                  Disabled
                </p>
                <p className="mt-2 text-3xl font-extrabold text-amber-200">
                  {isLoading ? "..." : disabledCount}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.05] px-5 py-4 text-sm leading-6 text-white/58">
              <strong className="text-[#bdf6ff]">
                {scopeTabs.find((item) => item.id === scope)?.label}
              </strong>
              {" · "}
              {scopeTabs.find((item) => item.id === scope)?.description}
            </div>

            {isLoading ? (
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 px-6 py-14 text-center text-sm text-white/48">
                Loading objectives...
              </div>
            ) : objectives.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 px-6 py-14 text-center text-sm text-white/48">
                No objectives exist in this scope.
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {objectives.map((objective, index) => {
                  const draft =
                    drafts[objective.objective_key] || createDraft(objective);
                  const saving = savingKey === objective.objective_key;
                  const locked = saving || reordering;

                  return (
                    <article
                      key={objective.id}
                      className={`rounded-[26px] border p-5 transition sm:p-6 ${
                        draft.is_enabled
                          ? "border-cyan-200/15 bg-[#061632]/66"
                          : "border-white/8 bg-white/[0.025] opacity-72"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-200/16 bg-cyan-300/[0.07] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8dfcff]">
                              #{index + 1}
                            </span>

                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/54">
                              {objective.objective_type}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${
                                draft.is_enabled
                                  ? "border-emerald-200/18 bg-emerald-300/[0.07] text-emerald-200"
                                  : "border-amber-200/18 bg-amber-300/[0.07] text-amber-200"
                              }`}
                            >
                              {draft.is_enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>

                          <p className="mt-3 break-all font-mono text-[11px] text-white/32">
                            {objective.objective_key}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void reorderObjective(index, -1)}
                            disabled={locked || index === 0}
                            className="min-h-10 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-white/64 transition hover:border-cyan-200/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑ Earlier
                          </button>

                          <button
                            type="button"
                            onClick={() => void reorderObjective(index, 1)}
                            disabled={locked || index === objectives.length - 1}
                            className="min-h-10 rounded-full border border-white/12 bg-white/[0.04] px-4 text-xs font-bold text-white/64 transition hover:border-cyan-200/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓ Later
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleObjective(objective)}
                            disabled={locked}
                            className={`min-h-10 rounded-full border px-4 text-xs font-extrabold transition disabled:cursor-wait disabled:opacity-50 ${
                              draft.is_enabled
                                ? "border-amber-200/18 bg-amber-300/[0.07] text-amber-100 hover:bg-amber-300/[0.12]"
                                : "border-emerald-200/18 bg-emerald-300/[0.07] text-emerald-100 hover:bg-emerald-300/[0.12]"
                            }`}
                          >
                            {draft.is_enabled ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
                        <div className="grid gap-4">
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/44">
                              Title
                            </span>
                            <input
                              value={draft.title}
                              onChange={(event) =>
                                updateDraft(objective.objective_key, {
                                  title: event.target.value,
                                })
                              }
                              className="mt-2 w-full rounded-2xl border border-cyan-200/12 bg-[#020d1e] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-200/36"
                            />
                          </label>

                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/44">
                              Description
                            </span>
                            <textarea
                              rows={3}
                              value={draft.description}
                              onChange={(event) =>
                                updateDraft(objective.objective_key, {
                                  description: event.target.value,
                                })
                              }
                              className="mt-2 w-full resize-y rounded-2xl border border-cyan-200/12 bg-[#020d1e] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-200/36"
                            />
                          </label>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="block">
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/44">
                                Reward DT
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={draft.reward_dt}
                                onChange={(event) =>
                                  updateDraft(objective.objective_key, {
                                    reward_dt: event.target.value,
                                  })
                                }
                                className="mt-2 w-full rounded-2xl border border-yellow-200/14 bg-[#020d1e] px-4 py-3 text-sm font-bold text-[#ffd18a] outline-none focus:border-yellow-200/40"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/44">
                                Reward DG
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={draft.reward_dg}
                                onChange={(event) =>
                                  updateDraft(objective.objective_key, {
                                    reward_dg: event.target.value,
                                  })
                                }
                                className="mt-2 w-full rounded-2xl border border-fuchsia-200/14 bg-[#020d1e] px-4 py-3 text-sm font-bold text-[#e7b7ff] outline-none focus:border-fuchsia-200/40"
                              />
                            </label>

                            <label className="block">
                              <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/44">
                                Sort Order
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={draft.sort_order}
                                onChange={(event) =>
                                  updateDraft(objective.objective_key, {
                                    sort_order: event.target.value,
                                  })
                                }
                                className="mt-2 w-full rounded-2xl border border-white/12 bg-[#020d1e] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-200/36"
                              />
                            </label>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => void saveObjective(objective)}
                              disabled={locked}
                              className="min-h-11 rounded-full border border-cyan-200/30 bg-cyan-300/12 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-cyan-300/18 disabled:cursor-wait disabled:opacity-50"
                            >
                              {saving ? "Saving..." : "Save Objective"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDrafts((current) => ({
                                  ...current,
                                  [objective.objective_key]:
                                    createDraft(objective),
                                }))
                              }
                              disabled={locked}
                              className="min-h-11 rounded-full border border-white/12 bg-white/[0.04] px-5 text-xs font-bold text-white/58 transition hover:text-white disabled:opacity-50"
                            >
                              Reset Unsaved Changes
                            </button>
                          </div>
                        </div>

                        <div className="grid content-start gap-3">
                          <div className="rounded-2xl border border-white/9 bg-black/20 p-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/36">
                              Trusted completion rule
                            </p>
                            <p className="mt-2 break-all text-sm font-semibold text-cyan-100">
                              {objective.condition_type}
                            </p>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/8 bg-black/20 p-3 text-[10px] leading-5 text-white/42">
                              {prettyJson(objective.condition_config)}
                            </pre>
                          </div>

                          <div className="rounded-2xl border border-white/9 bg-black/20 p-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/36">
                              Trusted eligibility rule
                            </p>
                            <p className="mt-2 break-all text-sm font-semibold text-violet-100">
                              {objective.eligibility_type}
                            </p>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/8 bg-black/20 p-3 text-[10px] leading-5 text-white/42">
                              {prettyJson(objective.eligibility_config)}
                            </pre>
                          </div>

                          <div className="rounded-2xl border border-white/9 bg-black/20 p-4 text-[11px] leading-5 text-white/38">
                            <p>
                              Scope:{" "}
                              <strong className="text-white/66">
                                {objective.objective_scope}
                              </strong>
                            </p>
                            <p>
                              Updated:{" "}
                              <strong className="text-white/66">
                                {formatDateTime(objective.updated_at)}
                              </strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="mt-6">
            <div className="rounded-2xl border border-violet-200/12 bg-violet-300/[0.05] px-5 py-4 text-sm leading-6 text-white/58">
              This is the immutable audit trail created by the Phase 6A
              objective-definition trigger. User objective completions are not
              edited from this screen.
            </div>

            {isAuditLoading ? (
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 px-6 py-14 text-center text-sm text-white/48">
                Loading edit history...
              </div>
            ) : auditRows.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 px-6 py-14 text-center text-sm text-white/48">
                No objective definition edits have been recorded since the audit
                trigger was installed.
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {auditRows.map((row) => {
                  const after = row.after_state || {};
                  const before = row.before_state || {};

                  const afterTitle = String(after.title || "");
                  const beforeTitle = String(before.title || "");

                  const beforeRewardDt = before.reward_dt;
                  const afterRewardDt = after.reward_dt;
                  const beforeRewardDg = before.reward_dg;
                  const afterRewardDg = after.reward_dg;
                  const beforeOrder = before.sort_order;
                  const afterOrder = after.sort_order;
                  const beforeEnabled = before.is_enabled;
                  const afterEnabled = after.is_enabled;

                  const changes: string[] = [];

                  if (beforeTitle !== afterTitle && afterTitle) {
                    changes.push(`Title → ${afterTitle}`);
                  }

                  if (beforeRewardDt !== afterRewardDt && afterRewardDt !== undefined) {
                    changes.push(`DT ${String(beforeRewardDt ?? "—")} → ${String(afterRewardDt)}`);
                  }

                  if (beforeRewardDg !== afterRewardDg && afterRewardDg !== undefined) {
                    changes.push(`DG ${String(beforeRewardDg ?? "—")} → ${String(afterRewardDg)}`);
                  }

                  if (beforeOrder !== afterOrder && afterOrder !== undefined) {
                    changes.push(`Order ${String(beforeOrder ?? "—")} → ${String(afterOrder)}`);
                  }

                  if (beforeEnabled !== afterEnabled && afterEnabled !== undefined) {
                    changes.push(afterEnabled ? "Enabled" : "Disabled");
                  }

                  return (
                    <article
                      key={row.id}
                      className="rounded-2xl border border-white/10 bg-[#061632]/62 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                                row.action === "insert"
                                  ? "border-emerald-200/18 bg-emerald-300/[0.07] text-emerald-200"
                                  : row.action === "delete"
                                    ? "border-red-200/18 bg-red-300/[0.07] text-red-200"
                                    : "border-violet-200/18 bg-violet-300/[0.07] text-violet-100"
                              }`}
                            >
                              {row.action}
                            </span>

                            <strong className="break-all text-sm text-white">
                              {row.objective_key}
                            </strong>
                          </div>

                          <p className="mt-2 text-xs text-white/38">
                            {formatDateTime(row.created_at)}
                          </p>
                        </div>

                        <span className="break-all font-mono text-[10px] text-white/28">
                          Actor: {row.actor_user_id || "system / SQL"}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-white/58">
                        {changes.length > 0
                          ? changes.join(" · ")
                          : row.action === "insert"
                            ? "Objective definition created."
                            : row.action === "delete"
                              ? "Objective definition deleted."
                              : "Definition updated."}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
