"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

type AgentSettings = {
  agentsEnabled: boolean;
  publicVisibilityEnabled: boolean;
  leaderboardVisibilityEnabled: boolean;
  exchangeVisibilityEnabled: boolean;
  defaultSimulationAccessTier: string;
  updatedAt: string | null;
};

type AgentSummary = {
  planned: number;
  provisioned: number;
  remaining: number;

  dormant: number;
  active: number;
  paused: number;
  retired: number;

  students: number;
  regular: number;

  nova: number;
  milo: number;
  both: number;

  currentDt: number;
  currentDg: number;

  provisioningEvents: number;
};

type AgentRow = {
  number: number;

  provisioned: boolean;

  userId:
    | string
    | null;

  agentCode: string;
  internalHandle: string;

  naturalName: string;
  username: string;
  email: string;

  accountRole: string;
  lifecycleStatus: string;

  worldAffinity: string;

  syntheticAge: number;

  educationSystem: string;

  educationLevel:
    | string
    | null;

  primaryLevel:
    | number
    | null;

  archetype: string;

  startingDtTarget: number;
  startingDgTarget: number;

  currentDt:
    | number
    | null;

  currentDg:
    | number
    | null;

  simulationAccessTier:
    | string
    | null;

  publicVisibilityOverride:
    | boolean
    | null;
};

type AgentOverviewResponse = {
  ok?: boolean;
  error?: string;

  settings: AgentSettings;

  summary: AgentSummary;

  plannedSummary?: {
    roles?: Record<
      string,
      number
    >;

    worlds?: Record<
      string,
      number
    >;

    archetypes?: Record<
      string,
      number
    >;

    dt?: {
      minimum?: number;
      maximum?: number;
      average?: number;
    };

    dg?: {
      minimum?: number;
      maximum?: number;
      average?: number;
    };
  };

  agents: AgentRow[];
};

type FilterStatus =
  | "all"
  | "planned"
  | "dormant"
  | "active"
  | "paused"
  | "retired";

type FilterWorld =
  | "all"
  | "nova"
  | "milo"
  | "both";

function formatNumber(
  value:
    | number
    | null
    | undefined,
) {
  return Number(
    value || 0,
  ).toLocaleString();
}

function titleCase(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value || "",
  )
    .replace(
      /[_-]+/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function statusClasses(
  status: string,
) {
  switch (status) {
    case "active":
      return "border-emerald-300/30 bg-emerald-400/12 text-emerald-100";

    case "dormant":
      return "border-cyan-300/30 bg-cyan-400/12 text-cyan-100";

    case "paused":
      return "border-amber-300/30 bg-amber-400/12 text-amber-100";

    case "retired":
      return "border-rose-300/30 bg-rose-400/12 text-rose-100";

    default:
      return "border-white/15 bg-white/[0.06] text-white/60";
  }
}

function Toggle({
  checked,
  disabled,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onChange:
    (
      checked: boolean,
    ) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onChange(
          !checked,
        )
      }
      className={`flex w-full items-center justify-between gap-5 rounded-2xl border p-4 text-left transition ${
        checked
          ? "border-cyan-300/28 bg-cyan-300/[0.08]"
          : "border-white/10 bg-white/[0.035]"
      } ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-white/20"
      }`}
    >
      <span>
        <strong className="block text-sm font-bold text-white">
          {title}
        </strong>

        <span className="mt-1 block text-xs leading-5 text-white/45">
          {description}
        </span>
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked
            ? "bg-cyan-300"
            : "bg-white/14"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-[#041124] transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

export default function AgentsAdminPage() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    overview,
    setOverview,
  ] =
    useState<
      AgentOverviewResponse |
      null
    >(null);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    filterStatus,
    setFilterStatus,
  ] =
    useState<FilterStatus>(
      "all",
    );

  const [
    filterWorld,
    setFilterWorld,
  ] =
    useState<FilterWorld>(
      "all",
    );

  const [
    savingSetting,
    setSavingSetting,
  ] =
    useState<
      string |
      null
    >(null);

  async function getToken() {
    const {
      data: {
        session,
      },
    } =
      await supabase
        .auth
        .getSession();

    return (
      session
        ?.access_token ||
      null
    );
  }

  async function loadOverview() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getToken();

      if (!token) {
        router.replace(
          "/login?next=/admin/agents",
        );
        return;
      }

      const response =
        await fetch(
          "/api/admin/agents/overview",
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const payload =
        (
          await response
            .json()
        ) as
          AgentOverviewResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ||
            "Agent Control Centre could not be loaded.",
        );
      }

      setOverview(
        payload,
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof
          Error
          ? loadError.message
          : "Agent Control Centre could not be loaded.",
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  async function updateSetting(
    key:
      | "publicVisibilityEnabled"
      | "leaderboardVisibilityEnabled"
      | "exchangeVisibilityEnabled",

    value: boolean,
  ) {
    if (
      !overview
    ) {
      return;
    }

    setSavingSetting(
      key,
    );

    setError("");

    try {
      const token =
        await getToken();

      if (!token) {
        throw new Error(
          "Please sign in again.",
        );
      }

      const response =
        await fetch(
          "/api/admin/agents/overview",
          {
            method:
              "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                [key]:
                  value,
              }),
          },
        );

      const payload =
        (
          await response
            .json()
        ) as {
          ok?: boolean;
          error?: string;
          settings?: AgentSettings;
        };

      if (
        !response.ok ||
        !payload.settings
      ) {
        throw new Error(
          payload.error ||
            "Agent setting could not be updated.",
        );
      }

      setOverview(
        (
          current,
        ) =>
          current
            ? {
                ...current,
                settings:
                  payload.settings!,
              }
            : current,
      );
    } catch (
      updateError
    ) {
      setError(
        updateError instanceof
          Error
          ? updateError.message
          : "Agent setting could not be updated.",
      );
    }

    setSavingSetting(
      null,
    );
  }

  const filteredAgents =
    useMemo(() => {
      if (
        !overview
      ) {
        return [];
      }

      const cleanSearch =
        search
          .trim()
          .toLowerCase();

      return overview
        .agents
        .filter(
          (agent) => {
            if (
              filterStatus !==
                "all" &&
              agent.lifecycleStatus !==
                filterStatus
            ) {
              return false;
            }

            if (
              filterWorld !==
                "all" &&
              agent.worldAffinity !==
                filterWorld
            ) {
              return false;
            }

            if (
              !cleanSearch
            ) {
              return true;
            }

            const haystack =
              [
                agent.agentCode,
                agent.internalHandle,
                agent.naturalName,
                agent.username,
                agent.email,
                agent.archetype,
                agent.educationLevel,
              ]
                .filter(
                  Boolean,
                )
                .join(
                  " ",
                )
                .toLowerCase();

            return haystack.includes(
              cleanSearch,
            );
          },
        );
    }, [
      overview,
      search,
      filterStatus,
      filterWorld,
    ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020813] px-5 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-white/50">
            Loading Agent Control Centre...
          </p>
        </div>
      </main>
    );
  }

  if (
    !overview
  ) {
    return (
      <main className="min-h-screen bg-[#020813] px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-300/20 bg-rose-400/[0.06] p-7">
          <h1 className="text-3xl font-bold">
            Agent Control Centre
          </h1>

          <p className="mt-4 text-rose-100/75">
            {error ||
              "The agent system could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/profile",
              )
            }
            className="mt-6 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-bold"
          >
            Back to Profile
          </button>
        </div>
      </main>
    );
  }

  const {
    settings,
    summary,
  } =
    overview;

  const globalVisible =
    settings
      .publicVisibilityEnabled;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-4 py-6 text-white sm:px-7 sm:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(83,215,255,0.11),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(139,92,246,0.10),transparent_30%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#7ee8ff]">
              Dreamscape Administration
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] sm:text-6xl">
              Agent Control Centre
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/52 sm:text-base">
              Manage the synthetic DREAMSCAPE population, visibility state and future simulation engine.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/dream-tokens",
                )
              }
              className="min-h-11 rounded-full border border-violet-200/25 bg-violet-400/10 px-5 text-xs font-extrabold uppercase tracking-[0.12em]"
            >
              Admin Panel
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/profile",
                )
              }
              className="min-h-11 rounded-full border border-white/12 bg-white/[0.05] px-5 text-xs font-extrabold uppercase tracking-[0.12em]"
            >
              Profile
            </button>

            <button
              type="button"
              onClick={() =>
                void loadOverview()
              }
              className="min-h-11 rounded-full border border-cyan-200/25 bg-cyan-300/[0.08] px-5 text-xs font-extrabold uppercase tracking-[0.12em]"
            >
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/[0.07] px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* Population summary */}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            [
              "Planned",
              summary.planned,
              "Phase 1 population",
            ],

            [
              "Provisioned",
              summary.provisioned,
              "Real auth identities",
            ],

            [
              "Dormant",
              summary.dormant,
              "Created but inactive",
            ],

            [
              "Active",
              summary.active,
              "Autonomous agents",
            ],

            [
              "DT Held",
              formatNumber(
                summary.currentDt,
              ),
              "Current agent DT",
            ],

            [
              "DG Held",
              formatNumber(
                summary.currentDg,
              ),
              "Current agent DG",
            ],
          ].map(
            (
              [
                label,
                value,
                description,
              ],
            ) => (
              <article
                key={String(
                  label,
                )}
                className="rounded-[24px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">
                  {label}
                </p>

                <strong className="mt-3 block text-3xl font-black tracking-[-0.05em]">
                  {value}
                </strong>

                <p className="mt-2 text-xs text-white/38">
                  {description}
                </p>
              </article>
            ),
          )}
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          {/* Engine */}

          <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7ee8ff]">
              System State
            </p>

            <div className="mt-5 rounded-2xl border border-cyan-300/16 bg-[#061632]/65 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <strong className="text-lg">
                    Autonomous Engine
                  </strong>

                  <p className="mt-1 text-sm text-white/45">
                    Decision engine activation begins in Phase 3.
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${
                    settings.agentsEnabled
                      ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100"
                      : "border-white/12 bg-white/[0.05] text-white/50"
                  }`}
                >
                  {settings.agentsEnabled
                    ? "Enabled"
                    : "Locked Off"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/55">
                  Provisioning events
                </span>

                <strong>
                  {summary.provisioningEvents}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/55">
                  Remaining initial identities
                </span>

                <strong>
                  {summary.remaining}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/55">
                  Default simulation entitlement
                </span>

                <strong className="capitalize">
                  {
                    settings.defaultSimulationAccessTier
                  }
                </strong>
              </div>
            </div>
          </article>

          {/* Visibility */}

          <article className="rounded-[28px] border border-violet-200/12 bg-[linear-gradient(145deg,rgba(33,21,69,0.48),rgba(5,18,40,0.72))] p-6 backdrop-blur-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-200">
              Public Visibility
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Agent appearance controls
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              These switches control whether eligible active agents may appear to real users. Dormant agents remain hidden regardless of these settings.
            </p>

            <div className="mt-5 grid gap-3">
              <Toggle
                title="Global agent visibility"
                description="Master switch for any user-facing agent presence."
                checked={
                  settings
                    .publicVisibilityEnabled
                }
                disabled={
                  savingSetting !==
                  null
                }
                onChange={(
                  value,
                ) =>
                  void updateSetting(
                    "publicVisibilityEnabled",
                    value,
                  )
                }
              />

              <Toggle
                title="Leaderboards"
                description={
                  globalVisible
                    ? "Permit eligible agents to appear on Rover and game leaderboards."
                    : "Stored setting only; global visibility is currently off."
                }
                checked={
                  settings
                    .leaderboardVisibilityEnabled
                }
                disabled={
                  savingSetting !==
                  null
                }
                onChange={(
                  value,
                ) =>
                  void updateSetting(
                    "leaderboardVisibilityEnabled",
                    value,
                  )
                }
              />

              <Toggle
                title="Milo Exchange"
                description={
                  globalVisible
                    ? "Permit eligible agents to appear in Exchange rankings and public market activity."
                    : "Stored setting only; global visibility is currently off."
                }
                checked={
                  settings
                    .exchangeVisibilityEnabled
                }
                disabled={
                  savingSetting !==
                  null
                }
                onChange={(
                  value,
                ) =>
                  void updateSetting(
                    "exchangeVisibilityEnabled",
                    value,
                  )
                }
              />
            </div>

            <div className="mt-4 rounded-xl border border-amber-200/14 bg-amber-200/[0.05] px-4 py-3 text-xs leading-5 text-amber-50/60">
              Phase 1 recommendation: leave all three visibility switches OFF until the 100 dormant identities have passed final QA.
            </div>
          </article>
        </section>

        {/* Distribution */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">
              Provisioned Roles
            </p>

            <div className="mt-4 flex gap-5">
              <div>
                <strong className="text-2xl">
                  {summary.students}
                </strong>
                <p className="text-xs text-white/40">
                  Student
                </p>
              </div>

              <div>
                <strong className="text-2xl">
                  {summary.regular}
                </strong>
                <p className="text-xs text-white/40">
                  Regular
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">
              Provisioned Worlds
            </p>

            <div className="mt-4 flex flex-wrap gap-5">
              <div>
                <strong className="text-2xl">
                  {summary.nova}
                </strong>
                <p className="text-xs text-white/40">
                  Nova
                </p>
              </div>

              <div>
                <strong className="text-2xl">
                  {summary.milo}
                </strong>
                <p className="text-xs text-white/40">
                  Milo
                </p>
              </div>

              <div>
                <strong className="text-2xl">
                  {summary.both}
                </strong>
                <p className="text-xs text-white/40">
                  Both
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">
              Lifecycle
            </p>

            <div className="mt-4 flex flex-wrap gap-5">
              <div>
                <strong className="text-2xl">
                  {summary.dormant}
                </strong>
                <p className="text-xs text-white/40">
                  Dormant
                </p>
              </div>

              <div>
                <strong className="text-2xl">
                  {summary.paused}
                </strong>
                <p className="text-xs text-white/40">
                  Paused
                </p>
              </div>

              <div>
                <strong className="text-2xl">
                  {summary.retired}
                </strong>
                <p className="text-xs text-white/40">
                  Retired
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* Population */}

        <section className="mt-7 rounded-[30px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7ee8ff]">
                Population Registry
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
                Initial 100
              </h2>

              <p className="mt-2 text-sm text-white/42">
                Planned identities are shown before provisioning. Their row changes to Dormant after the real Supabase identity exists.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Search agents..."
                className="min-h-11 rounded-xl border border-white/10 bg-[#061632]/75 px-4 text-sm text-white outline-none placeholder:text-white/28"
              />

              <select
                value={
                  filterStatus
                }
                onChange={(
                  event,
                ) =>
                  setFilterStatus(
                    event.target
                      .value as
                      FilterStatus,
                  )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#061632] px-4 text-sm text-white"
              >
                <option value="all">
                  All statuses
                </option>
                <option value="planned">
                  Planned
                </option>
                <option value="dormant">
                  Dormant
                </option>
                <option value="active">
                  Active
                </option>
                <option value="paused">
                  Paused
                </option>
                <option value="retired">
                  Retired
                </option>
              </select>

              <select
                value={
                  filterWorld
                }
                onChange={(
                  event,
                ) =>
                  setFilterWorld(
                    event.target
                      .value as
                      FilterWorld,
                  )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#061632] px-4 text-sm text-white"
              >
                <option value="all">
                  All worlds
                </option>
                <option value="nova">
                  Nova
                </option>
                <option value="milo">
                  Milo
                </option>
                <option value="both">
                  Both
                </option>
              </select>
            </div>
          </div>

          <p className="mt-4 text-xs text-white/34">
            Showing{" "}
            {
              filteredAgents.length
            }{" "}
            of{" "}
            {
              overview
                .agents
                .length
            }{" "}
            agents
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
            <table className="min-w-[1180px] w-full border-collapse text-left">
              <thead className="bg-[#061632]/90">
                <tr className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/40">
                  <th className="px-4 py-4">
                    Agent
                  </th>

                  <th className="px-4 py-4">
                    Public Identity
                  </th>

                  <th className="px-4 py-4">
                    Role / Education
                  </th>

                  <th className="px-4 py-4">
                    World
                  </th>

                  <th className="px-4 py-4">
                    Persona
                  </th>

                  <th className="px-4 py-4">
                    Economy
                  </th>

                  <th className="px-4 py-4">
                    Access
                  </th>

                  <th className="px-4 py-4">
                    State
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAgents.map(
                  (
                    agent,
                  ) => (
                    <tr
                      key={
                        agent.agentCode
                      }
                      className="border-t border-white/[0.07] align-top transition hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-4">
                        <strong className="block text-sm text-white">
                          {
                            agent.agentCode
                          }
                        </strong>

                        <span className="mt-1 block font-mono text-[11px] text-cyan-100/45">
                          {
                            agent.internalHandle
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <strong className="block text-sm">
                          {
                            agent.naturalName
                          }
                        </strong>

                        <span className="mt-1 block text-xs text-white/48">
                          @
                          {
                            agent.username
                          }
                        </span>

                        <span className="mt-1 block text-[10px] text-white/28">
                          {
                            agent.email
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <strong className="block text-xs capitalize">
                          {
                            agent.accountRole
                          }
                        </strong>

                        <span className="mt-1 block text-xs text-white/45">
                          {
                            agent.educationLevel ||
                            "General learner"
                          }
                        </span>

                        <span className="mt-1 block text-[10px] text-white/30">
                          Age{" "}
                          {
                            agent.syntheticAge
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-cyan-100">
                          {
                            titleCase(
                              agent.worldAffinity,
                            )
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-xs font-semibold text-white/72">
                          {
                            titleCase(
                              agent.archetype,
                            )
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <strong className="block text-xs text-[#ffd18a]">
                          {agent.provisioned
                            ? `${formatNumber(
                                agent.currentDt,
                              )} DT`
                            : `${formatNumber(
                                agent.startingDtTarget,
                              )} DT target`}
                        </strong>

                        <span className="mt-1 block text-xs text-violet-200/70">
                          {agent.provisioned
                            ? `${formatNumber(
                                agent.currentDg,
                              )} DG`
                            : `${formatNumber(
                                agent.startingDgTarget,
                              )} DG target`}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-xs capitalize text-white/65">
                          {
                            agent.simulationAccessTier
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${statusClasses(
                            agent.lifecycleStatus,
                          )}`}
                        >
                          {
                            titleCase(
                              agent.lifecycleStatus,
                            )
                          }
                        </span>
                      </td>
                    </tr>
                  ),
                )}

                {filteredAgents.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        8
                      }
                      className="px-5 py-14 text-center text-sm text-white/40"
                    >
                      No agents match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-cyan-300/12 bg-cyan-300/[0.035] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-100">
            Phase 1F Safety State
          </p>

          <p className="mt-3 text-sm leading-6 text-white/48">
            This page intentionally has no Activate, Reset or Run Simulation buttons yet. Agent decision-making remains disabled until Phase 3, and the initial 100 identities are not provisioned until the final Phase 1 provisioning/QA step.
          </p>
        </section>
      </div>
    </main>
  );
}