"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCurriculumDeveloperAccess } from "@/hooks/useCurriculumDeveloperAccess";

type Tab =
  | "overview"
  | "flags"
  | "health"
  | "permissions"
  | "checklist"
  | "snapshots";

type FeatureFlag = {
  flag_key: string;
  display_name: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  allowed_roles: string[];
  subject_scope: string[];
  primary_level_scope: number[];
  config: Record<string, unknown>;
  notes: string | null;
  updated_at: string;
};

type HealthRun = {
  id?: string;
  status?: string;
  started_at?: string;
  completed_at?: string | null;
  issue_count?: number;
  blocking_issue_count?: number;
  summary?: Record<string, unknown>;
  error_message?: string | null;
};

type HealthEvent = {
  id: string;
  issue_key: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  component: string;
  title: string;
  details: Record<string, unknown>;
  status: "open" | "acknowledged" | "resolved";
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

type ChecklistItem = {
  checklist_key: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  status: "pending" | "passed" | "failed" | "waived";
  evidence: string | null;
  checked_at: string | null;
  display_order: number;
};

type Snapshot = {
  id: string;
  snapshot_name: string;
  snapshot_version: string;
  created_by: string | null;
  created_at: string;
};

type PermissionItem = Record<string, unknown>;

type PermissionAudit = {
  generated_at?: string;
  tables_without_rls?: PermissionItem[];
  authenticated_write_grants?: PermissionItem[];
  public_execute_functions?: PermissionItem[];
  security_definer_without_search_path?: PermissionItem[];
  issue_count?: number;
};

type Readiness = {
  ready: boolean;
  required_checklist_not_ready: number;
  failed_checklist_items: number;
  open_health_events: number;
  blocking_health_events: number;
  permission_issues: number;
  generated_at: string;
};

type DashboardPayload = {
  generated_at: string;
  readiness: Readiness;
  feature_flags: FeatureFlag[];
  health_run: HealthRun;
  health_events: HealthEvent[];
  permission_audit: PermissionAudit;
  release_checklist: ChecklistItem[];
  release_snapshots: Snapshot[];
  metrics: Record<string, unknown>;
};

const ROLES = [
  "regular",
  "student",
  "teacher",
  "curriculum_lead",
  "admin",
];

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function jsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export default function NovaOperationsClient() {
  const router = useRouter();
  const {
    status,
    role,
    error: accessError,
  } = useCurriculumDeveloperAccess();

  const isAdmin = normaliseRole(role) === "admin";

  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] =
    useState<DashboardPayload | null>(null);
  const [flagDrafts, setFlagDrafts] = useState<
    Record<string, FeatureFlag>
  >({});
  const [checkEvidence, setCheckEvidence] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (status !== "allowed" || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_nova_operations_dashboard",
    );

    if (rpcError) {
      setError(
        `${rpcError.message}. Confirm that Phase 2B.8 Steps 54A–55 were installed.`,
      );
      setLoading(false);
      return;
    }

    const payload = data as DashboardPayload;
    setDashboard(payload);

    setFlagDrafts(
      Object.fromEntries(
        (payload.feature_flags || []).map((flag) => [
          flag.flag_key,
          {
            ...flag,
            allowed_roles: [...(flag.allowed_roles || [])],
            subject_scope: [...(flag.subject_scope || [])],
            primary_level_scope: [
              ...(flag.primary_level_scope || []),
            ],
          },
        ]),
      ),
    );

    setCheckEvidence(
      Object.fromEntries(
        (payload.release_checklist || []).map((item) => [
          item.checklist_key,
          item.evidence || "",
        ]),
      ),
    );

    setLoading(false);
  }, [isAdmin, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const readiness = dashboard?.readiness;
  const metrics = dashboard?.metrics || {};
  const healthEvents = dashboard?.health_events || [];
  const openHealthEvents = healthEvents.filter(
    (event) => event.status !== "resolved",
  );

  const checklistProgress = useMemo(() => {
    const items = dashboard?.release_checklist || [];
    const required = items.filter((item) => item.required);
    const complete = required.filter((item) =>
      ["passed", "waived"].includes(item.status),
    );

    return {
      required: required.length,
      complete: complete.length,
      percentage:
        required.length > 0
          ? Math.round(
              (complete.length / required.length) * 100,
            )
          : 0,
    };
  }, [dashboard?.release_checklist]);

  async function runAction(
    action: () => PromiseLike<{
      data: unknown;
      error: { message: string } | null;
    }>,
    successMessage: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await action();

      if (result.error) {
        setError(result.error.message);
        return false;
      }

      setMessage(successMessage);
      await load();
      return true;
    } catch (actionError) {
      const detail =
        actionError instanceof Error
          ? actionError.message
          : "The Nova Operations action failed.";

      console.error(
        "Nova Operations action error:",
        actionError,
      );
      setError(detail);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function updateFlagDraft(
    flagKey: string,
    patch: Partial<FeatureFlag>,
  ) {
    setFlagDrafts((current) => ({
      ...current,
      [flagKey]: {
        ...current[flagKey],
        ...patch,
      },
    }));
  }

  function toggleRole(flagKey: string, roleName: string) {
    const current = flagDrafts[flagKey];
    if (!current) return;

    const roles = current.allowed_roles.includes(roleName)
      ? current.allowed_roles.filter(
          (value) => value !== roleName,
        )
      : [...current.allowed_roles, roleName];

    updateFlagDraft(flagKey, {
      allowed_roles: roles,
    });
  }

  async function saveFlag(flagKey: string) {
    const flag = flagDrafts[flagKey];
    if (!flag) return;

    await runAction(
      () =>
        supabase.rpc(
          "admin_update_nova_feature_flag",
          {
            p_flag_key: flag.flag_key,
            p_enabled: flag.enabled,
            p_rollout_percentage:
              flag.rollout_percentage,
            p_allowed_roles: flag.allowed_roles,
            p_subject_scope: flag.subject_scope,
            p_primary_level_scope:
              flag.primary_level_scope,
            p_config: flag.config || {},
            p_notes: flag.notes || null,
          },
        ),
      `${flag.display_name} updated.`,
    );
  }

  async function runHealthCheck() {
    await runAction(
      () =>
        supabase.rpc(
          "admin_run_nova_health_check",
        ),
      "Nova health check completed.",
    );
  }

  async function updateHealthEvent(
    eventId: string,
    nextStatus: HealthEvent["status"],
  ) {
    await runAction(
      () =>
        supabase.rpc(
          "admin_update_nova_health_event",
          {
            p_event_id: eventId,
            p_status: nextStatus,
          },
        ),
      `Health event changed to ${label(nextStatus)}.`,
    );
  }

  async function updateChecklist(
    item: ChecklistItem,
    nextStatus: ChecklistItem["status"],
  ) {
    await runAction(
      () =>
        supabase.rpc(
          "admin_update_nova_release_check",
          {
            p_checklist_key: item.checklist_key,
            p_status: nextStatus,
            p_evidence:
              checkEvidence[item.checklist_key] || null,
          },
        ),
      `${item.title} changed to ${label(nextStatus)}.`,
    );
  }

  async function createSnapshot() {
    const name = window.prompt(
      "Snapshot name:",
      `Pre-release ${new Date()
        .toISOString()
        .slice(0, 10)}`,
    );

    if (!name?.trim()) return;

    await runAction(
      () =>
        supabase.rpc(
          "admin_create_nova_release_snapshot",
          {
            p_snapshot_name: name.trim(),
          },
        ),
      "Release snapshot created.",
    );
  }

  async function restoreSnapshot(snapshot: Snapshot) {
    const confirmed = window.confirm(
      `Restore feature flags from "${snapshot.snapshot_name}"? This changes only feature-flag settings.`,
    );

    if (!confirmed) return;

    await runAction(
      () =>
        supabase.rpc(
          "admin_restore_nova_feature_flags",
          {
            p_snapshot_id: snapshot.id,
          },
        ),
      "Feature flags restored from the snapshot.",
    );
  }

  if (status === "checking") {
    return (
      <PageMessage text="Checking Nova Operations access..." />
    );
  }

  if (
    status === "locked" ||
    !role ||
    !isAdmin
  ) {
    return (
      <main
        className="no-shell no-center"
        style={{
          minHeight: "100dvh",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#071226",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <section
          className="no-panel no-locked"
          style={{
            width: "min(620px, 100%)",
            padding: 28,
            borderRadius: 20,
            border:
              "1px solid rgba(126,232,255,0.18)",
            background: "rgba(10,23,48,0.84)",
            textAlign: "center",
          }}
        >
          <p className="no-eyebrow">PHASE 2B.8</p>
          <h1>Admin Access Required</h1>
          <p>
            Nova Operations contains production flags,
            permission audits and rollback controls.
          </p>
          {accessError && (
            <div className="no-error">{accessError}</div>
          )}
          <button
            type="button"
            onClick={() =>
              router.push(
                "/curriculum-developer/learning-skills",
              )
            }
          >
            Return
          </button>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <PageMessage text="Loading Nova Operations..." />
    );
  }

  return (
    <main className="no-shell">
      <header className="no-header">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/curriculum-developer/learning-skills/rollout",
            )
          }
        >
          ← Curriculum Rollout
        </button>

        <div>
          <p>NOVA LEARNING PROFILE</p>
          <strong>Production Operations</strong>
        </div>

        <span>Admin</span>
      </header>

      <section className="no-workspace">
        <div className="no-title-row">
          <div>
            <p className="no-eyebrow">PHASE 2B.8</p>
            <h1>Production Hardening & Release</h1>
            <p className="no-description">
              Control staged release, inspect system health,
              verify permissions, complete final acceptance
              checks and create rollback snapshots.
            </p>
          </div>

          <div className="no-title-actions">
            <button
              type="button"
              onClick={() => void runHealthCheck()}
              disabled={busy}
            >
              {busy ? "Working..." : "Run health check"}
            </button>
            <button
              type="button"
              onClick={() => void createSnapshot()}
              disabled={busy}
            >
              Create snapshot
            </button>
          </div>
        </div>

        {error && <div className="no-error">{error}</div>}
        {message && (
          <div className="no-success">{message}</div>
        )}

        <nav className="no-tabs">
          {(
            [
              ["overview", "Overview"],
              ["flags", "Feature Flags"],
              ["health", "System Health"],
              ["permissions", "Permissions"],
              ["checklist", "Release Checklist"],
              ["snapshots", "Snapshots"],
            ] as Array<[Tab, string]>
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              className={tab === value ? "active" : ""}
              onClick={() => setTab(value)}
            >
              {text}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <>
            <section
              className={`no-readiness ${
                readiness?.ready ? "ready" : "not-ready"
              }`}
            >
              <div>
                <p className="no-eyebrow">
                  FINAL RELEASE STATUS
                </p>
                <h2>
                  {readiness?.ready
                    ? "Nova Phase 2B is release ready"
                    : "Release checks are still outstanding"}
                </h2>
                <p>
                  {readiness?.ready
                    ? "Required checks passed, blocking health issues are resolved and the permission audit is clean."
                    : "Use the tabs below to resolve the remaining checklist, health or permission issues."}
                </p>
              </div>
              <strong>
                {checklistProgress.percentage}%
              </strong>
            </section>

            <div className="no-stat-grid">
              <Stat
                label="Required checks"
                value={`${checklistProgress.complete}/${checklistProgress.required}`}
              />
              <Stat
                label="Blocking health"
                value={
                  readiness?.blocking_health_events || 0
                }
              />
              <Stat
                label="Permission issues"
                value={
                  readiness?.permission_issues || 0
                }
              />
              <Stat
                label="Current week reports"
                value={safeNumber(
                  metrics.current_week_reports,
                )}
              />
              <Stat
                label="Failed emails · 14d"
                value={safeNumber(
                  metrics.failed_emails_14d,
                )}
              />
              <Stat
                label="Missing DOB"
                value={safeNumber(
                  metrics.profiles_missing_dob,
                )}
              />
              <Stat
                label="Release-ready topics"
                value={`${safeNumber(
                  metrics.release_ready_targets,
                )}/${safeNumber(
                  metrics.total_rollout_targets,
                )}`}
              />
              <Stat
                label="Average coverage"
                value={`${Math.round(
                  safeNumber(
                    metrics.average_mapping_coverage,
                  ),
                )}%`}
              />
            </div>

            <section className="no-panel">
              <div className="no-section-heading">
                <div>
                  <p className="no-eyebrow">
                    LATEST HEALTH RUN
                  </p>
                  <h2>
                    {label(
                      dashboard?.health_run?.status ||
                        "not run",
                    )}
                  </h2>
                </div>
                <span>
                  {formatDate(
                    dashboard?.health_run?.completed_at ||
                      dashboard?.health_run?.started_at,
                  )}
                </span>
              </div>

              <div className="no-health-summary">
                <Stat
                  label="Open events"
                  value={openHealthEvents.length}
                />
                <Stat
                  label="Blocking"
                  value={
                    dashboard?.health_run
                      ?.blocking_issue_count || 0
                  }
                />
                <Stat
                  label="Run status"
                  value={label(
                    dashboard?.health_run?.status ||
                      "not run",
                  )}
                />
              </div>
            </section>
          </>
        )}

        {tab === "flags" && (
          <section className="no-flag-list">
            {Object.values(flagDrafts).map((flag) => (
              <article
                key={flag.flag_key}
                className="no-panel no-flag-card"
              >
                <div className="no-flag-heading">
                  <div>
                    <p className="no-flag-key">
                      {flag.flag_key}
                    </p>
                    <h2>{flag.display_name}</h2>
                    <p>{flag.description}</p>
                  </div>

                  <label className="no-switch">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={(event) =>
                        updateFlagDraft(flag.flag_key, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    <span>
                      {flag.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                </div>

                <div className="no-flag-grid">
                  <label>
                    Rollout percentage
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={flag.rollout_percentage}
                      onChange={(event) =>
                        updateFlagDraft(flag.flag_key, {
                          rollout_percentage: Math.max(
                            0,
                            Math.min(
                              100,
                              Number(event.target.value),
                            ),
                          ),
                        })
                      }
                    />
                  </label>

                  <label>
                    Subject scope
                    <input
                      value={flag.subject_scope.join(", ")}
                      placeholder="Blank = all subjects"
                      onChange={(event) =>
                        updateFlagDraft(flag.flag_key, {
                          subject_scope:
                            event.target.value
                              .split(",")
                              .map((value) =>
                                value
                                  .trim()
                                  .toLowerCase(),
                              )
                              .filter(Boolean),
                        })
                      }
                    />
                  </label>

                  <label>
                    Primary-level scope
                    <input
                      value={flag.primary_level_scope.join(
                        ", ",
                      )}
                      placeholder="Blank = all levels"
                      onChange={(event) =>
                        updateFlagDraft(flag.flag_key, {
                          primary_level_scope:
                            event.target.value
                              .split(",")
                              .map((value) =>
                                Number(value.trim()),
                              )
                              .filter(
                                (value) =>
                                  Number.isInteger(value) &&
                                  value >= 1 &&
                                  value <= 6,
                              ),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="no-role-grid">
                  {ROLES.map((roleName) => (
                    <label key={roleName}>
                      <input
                        type="checkbox"
                        checked={flag.allowed_roles.includes(
                          roleName,
                        )}
                        onChange={() =>
                          toggleRole(
                            flag.flag_key,
                            roleName,
                          )
                        }
                      />
                      <span>{label(roleName)}</span>
                    </label>
                  ))}
                </div>

                <label className="no-notes">
                  Admin notes
                  <textarea
                    rows={2}
                    value={flag.notes || ""}
                    onChange={(event) =>
                      updateFlagDraft(flag.flag_key, {
                        notes: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="no-card-actions">
                  <span>
                    Updated {formatDate(flag.updated_at)}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void saveFlag(flag.flag_key)
                    }
                  >
                    Save flag
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "health" && (
          <section className="no-panel">
            <div className="no-section-heading">
              <div>
                <p className="no-eyebrow">
                  SYSTEM MONITORING
                </p>
                <h2>Health Events</h2>
              </div>
              <button
                type="button"
                onClick={() => void runHealthCheck()}
                disabled={busy}
              >
                Run now
              </button>
            </div>

            <div className="no-event-list">
              {healthEvents.map((event) => (
                <article
                  key={event.id}
                  className={`no-event severity-${event.severity}`}
                >
                  <div className="no-event-heading">
                    <div>
                      <span>
                        {label(event.severity)} ·{" "}
                        {label(event.component)}
                      </span>
                      <h3>{event.title}</h3>
                    </div>
                    <StatusPill value={event.status} />
                  </div>

                  <pre>{jsonText(event.details)}</pre>

                  <div className="no-event-meta">
                    <span>
                      Seen {event.occurrences} time
                      {event.occurrences === 1 ? "" : "s"}
                    </span>
                    <span>
                      Last seen{" "}
                      {formatDate(event.last_seen_at)}
                    </span>
                  </div>

                  <div className="no-card-actions">
                    {event.status !== "acknowledged" &&
                      event.status !== "resolved" && (
                        <button
                          type="button"
                          onClick={() =>
                            void updateHealthEvent(
                              event.id,
                              "acknowledged",
                            )
                          }
                        >
                          Acknowledge
                        </button>
                      )}

                    {event.status !== "resolved" && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateHealthEvent(
                            event.id,
                            "resolved",
                          )
                        }
                      >
                        Resolve
                      </button>
                    )}

                    {event.status === "resolved" && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateHealthEvent(
                            event.id,
                            "open",
                          )
                        }
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </article>
              ))}

              {healthEvents.length === 0 && (
                <div className="no-empty">
                  Run the initial health check to create the
                  first monitoring result.
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "permissions" && (
          <section className="no-permission-grid">
            <PermissionCard
              title="Tables without RLS"
              items={
                dashboard?.permission_audit
                  ?.tables_without_rls || []
              }
            />
            <PermissionCard
              title="Authenticated write grants"
              items={
                dashboard?.permission_audit
                  ?.authenticated_write_grants || []
              }
            />
            <PermissionCard
              title="PUBLIC function execution"
              items={
                dashboard?.permission_audit
                  ?.public_execute_functions || []
              }
            />
            <PermissionCard
              title="Security Definer without search_path"
              items={
                dashboard?.permission_audit
                  ?.security_definer_without_search_path ||
                []
              }
            />
          </section>
        )}

        {tab === "checklist" && (
          <section className="no-check-list">
            {(dashboard?.release_checklist || []).map(
              (item) => (
                <article
                  key={item.checklist_key}
                  className="no-panel no-check-card"
                >
                  <div className="no-check-heading">
                    <div>
                      <span>
                        {item.category}
                        {item.required ? " · Required" : ""}
                      </span>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                    </div>
                    <StatusPill value={item.status} />
                  </div>

                  <label>
                    Evidence or test result
                    <textarea
                      rows={3}
                      value={
                        checkEvidence[
                          item.checklist_key
                        ] || ""
                      }
                      onChange={(event) =>
                        setCheckEvidence((current) => ({
                          ...current,
                          [item.checklist_key]:
                            event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="no-card-actions">
                    <select
                      value={item.status}
                      onChange={(event) =>
                        void updateChecklist(
                          item,
                          event.target
                            .value as ChecklistItem["status"],
                        )
                      }
                    >
                      <option value="pending">
                        Pending
                      </option>
                      <option value="passed">
                        Passed
                      </option>
                      <option value="failed">
                        Failed
                      </option>
                      <option value="waived">
                        Waived
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        void updateChecklist(
                          item,
                          item.status,
                        )
                      }
                    >
                      Save evidence
                    </button>
                  </div>
                </article>
              ),
            )}
          </section>
        )}

        {tab === "snapshots" && (
          <section className="no-panel">
            <div className="no-section-heading">
              <div>
                <p className="no-eyebrow">
                  RELEASE ROLLBACK
                </p>
                <h2>Feature-Flag Snapshots</h2>
                <p>
                  A snapshot stores release flags, checklist
                  state, rollout summary, permission audit and
                  open health issues.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void createSnapshot()}
              >
                Create snapshot
              </button>
            </div>

            <div className="no-snapshot-list">
              {(dashboard?.release_snapshots || []).map(
                (snapshot) => (
                  <article key={snapshot.id}>
                    <div>
                      <strong>
                        {snapshot.snapshot_name}
                      </strong>
                      <span>
                        Version {snapshot.snapshot_version} ·{" "}
                        {formatDate(snapshot.created_at)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void restoreSnapshot(snapshot)
                      }
                    >
                      Restore flags
                    </button>
                  </article>
                ),
              )}

              {(dashboard?.release_snapshots || [])
                .length === 0 && (
                <div className="no-empty">
                  Create a pre-release snapshot before
                  changing production rollout flags.
                </div>
              )}
            </div>
          </section>
        )}
      </section>

      <style jsx global>{`
        .no-shell,
        .no-shell * {
          box-sizing: border-box;
        }

        .no-shell {
          min-height: 100dvh;
          background:
            radial-gradient(
              circle at 82% -12%,
              rgba(83, 215, 255, 0.11),
              transparent 30%
            ),
            #071226;
          color: white;
          font-family: Arial, Helvetica, sans-serif;
        }

        .no-header {
          min-height: 72px;
          padding: 10px 18px;
          position: sticky;
          top: 0;
          z-index: 50;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid
            rgba(126, 232, 255, 0.2);
          background: rgba(10, 23, 48, 0.97);
          backdrop-filter: blur(18px);
        }

        .no-header button,
        .no-title-actions button,
        .no-panel button,
        .no-card-actions button {
          min-height: 42px;
          border-radius: 11px;
          border: 1px solid
            rgba(126, 232, 255, 0.25);
          background: rgba(255, 255, 255, 0.055);
          color: white;
          padding: 0 14px;
          cursor: pointer;
          font-weight: 850;
        }

        .no-header > button {
          justify-self: start;
        }

        .no-header > div {
          text-align: center;
        }

        .no-header p,
        .no-eyebrow {
          margin: 0;
          color: #8dfcff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        .no-header strong {
          display: block;
          margin-top: 4px;
          font-size: 18px;
        }

        .no-header > span {
          justify-self: end;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 215, 106, 0.08);
          color: #ffe6a8;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .no-workspace {
          width: min(1500px, 100%);
          margin: 0 auto;
          padding: 34px clamp(16px, 3vw, 44px)
            70px;
        }

        .no-title-row {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 22px;
        }

        .no-title-row h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .no-description {
          max-width: 860px;
          margin: 12px 0 0;
          color: rgba(235, 247, 255, 0.6);
          font-size: 15px;
          line-height: 1.6;
        }

        .no-title-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .no-tabs {
          margin-top: 22px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .no-tabs button {
          min-height: 42px;
          flex: 0 0 auto;
          padding: 0 14px;
          border-radius: 11px;
          border: 1px solid
            rgba(126, 232, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.55);
          font-weight: 850;
          cursor: pointer;
        }

        .no-tabs button.active {
          border-color: rgba(126, 232, 255, 0.42);
          background: rgba(83, 215, 255, 0.12);
          color: white;
        }

        .no-error,
        .no-success {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 13px;
        }

        .no-error {
          border: 1px solid rgba(248, 113, 113, 0.35);
          background: rgba(239, 68, 68, 0.1);
          color: #fecaca;
        }

        .no-success {
          border: 1px solid rgba(52, 211, 153, 0.3);
          background: rgba(16, 185, 129, 0.1);
          color: #a7f3d0;
        }

        .no-readiness {
          margin-top: 17px;
          padding: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-radius: 21px;
          border: 1px solid
            rgba(126, 232, 255, 0.17);
          background:
            linear-gradient(
              145deg,
              rgba(83, 215, 255, 0.075),
              rgba(167, 139, 250, 0.05)
            );
        }

        .no-readiness.ready {
          border-color: rgba(52, 211, 153, 0.35);
          background: rgba(16, 185, 129, 0.09);
        }

        .no-readiness h2 {
          margin: 7px 0 0;
          font-size: 27px;
        }

        .no-readiness p:last-child {
          margin: 9px 0 0;
          color: rgba(235, 247, 255, 0.56);
          font-size: 13px;
          line-height: 1.5;
        }

        .no-readiness > strong {
          font-size: 46px;
          color: #8dfcff;
        }

        .no-stat-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 9px;
        }

        .no-stat {
          padding: 14px;
          border-radius: 15px;
          border: 1px solid
            rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.027);
        }

        .no-stat span {
          color: rgba(235, 247, 255, 0.42);
          font-size: 9px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .no-stat strong {
          display: block;
          margin-top: 8px;
          font-size: 21px;
        }

        .no-panel {
          margin-top: 14px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid
            rgba(126, 232, 255, 0.12);
          background: rgba(10, 23, 48, 0.76);
        }

        .no-section-heading,
        .no-flag-heading,
        .no-check-heading,
        .no-event-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .no-section-heading h2,
        .no-flag-heading h2,
        .no-check-heading h2 {
          margin: 7px 0 0;
          font-size: 23px;
        }

        .no-section-heading p:last-child,
        .no-flag-heading p:last-child,
        .no-check-heading p:last-child {
          margin: 8px 0 0;
          color: rgba(235, 247, 255, 0.5);
          font-size: 12px;
          line-height: 1.55;
        }

        .no-health-summary {
          margin-top: 13px;
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 8px;
        }

        .no-flag-list,
        .no-event-list,
        .no-check-list {
          margin-top: 15px;
          display: grid;
          gap: 11px;
        }

        .no-flag-key {
          margin: 0;
          color: #8dfcff !important;
          font-size: 9px !important;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .no-switch {
          display: flex;
          align-items: center;
          gap: 7px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 800;
        }

        .no-flag-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .no-flag-grid label,
        .no-notes,
        .no-check-card > label {
          display: grid;
          gap: 7px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 11px;
          font-weight: 800;
        }

        .no-flag-grid input,
        .no-notes textarea,
        .no-check-card textarea,
        .no-card-actions select {
          width: 100%;
          min-height: 42px;
          border-radius: 10px;
          border: 1px solid
            rgba(126, 232, 255, 0.18);
          background: rgba(2, 8, 19, 0.72);
          color: white;
          padding: 9px 10px;
          outline: none;
        }

        .no-role-grid {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .no-role-grid label {
          padding: 7px 9px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          border: 1px solid
            rgba(126, 232, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          font-size: 10px;
        }

        .no-notes,
        .no-check-card > label {
          margin-top: 12px;
        }

        .no-card-actions {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .no-card-actions > span {
          margin-right: auto;
          color: rgba(255, 255, 255, 0.36);
          font-size: 10px;
        }

        .no-event {
          padding: 15px;
          border-radius: 15px;
          border: 1px solid
            rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.026);
        }

        .no-event.severity-critical {
          border-color: rgba(248, 113, 113, 0.38);
          background: rgba(239, 68, 68, 0.08);
        }

        .no-event.severity-high {
          border-color: rgba(251, 146, 60, 0.34);
          background: rgba(249, 115, 22, 0.07);
        }

        .no-event-heading span {
          color: #8dfcff;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .no-event-heading h3 {
          margin: 6px 0 0;
          font-size: 16px;
        }

        .no-event pre {
          margin: 12px 0 0;
          padding: 11px;
          max-height: 240px;
          overflow: auto;
          border-radius: 11px;
          background: rgba(2, 8, 19, 0.55);
          color: rgba(235, 247, 255, 0.7);
          font-size: 10px;
          white-space: pre-wrap;
        }

        .no-event-meta {
          margin-top: 9px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: rgba(255, 255, 255, 0.38);
          font-size: 9px;
        }

        .no-status {
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid
            rgba(126, 232, 255, 0.18);
          background: rgba(83, 215, 255, 0.08);
          color: #b9f5ff;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .no-permission-grid {
          margin-top: 15px;
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 11px;
        }

        .no-permission-card ul {
          margin: 13px 0 0;
          padding-left: 20px;
        }

        .no-permission-card li {
          margin-bottom: 8px;
          color: rgba(235, 247, 255, 0.62);
          font-size: 11px;
          line-height: 1.45;
        }

        .no-permission-clean {
          margin-top: 12px;
          padding: 13px;
          border-radius: 11px;
          background: rgba(16, 185, 129, 0.08);
          color: #a7f3d0;
          font-size: 12px;
        }

        .no-check-heading > div > span {
          color: #8dfcff;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .no-snapshot-list {
          margin-top: 13px;
          display: grid;
          gap: 8px;
        }

        .no-snapshot-list article {
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.027);
        }

        .no-snapshot-list article > div {
          display: grid;
          gap: 4px;
        }

        .no-snapshot-list span {
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
        }

        .no-empty {
          padding: 25px;
          border-radius: 13px;
          border: 1px dashed
            rgba(126, 232, 255, 0.16);
          color: rgba(255, 255, 255, 0.45);
          text-align: center;
          font-size: 12px;
        }

        .no-center {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .no-locked {
          width: min(620px, 100%);
          text-align: center;
        }

        @media (max-width: 900px) {
          .no-title-row,
          .no-readiness {
            display: grid;
          }

          .no-stat-grid,
          .no-flag-grid,
          .no-permission-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .no-readiness > strong {
            justify-self: start;
          }
        }

        @media (max-width: 620px) {
          .no-header {
            grid-template-columns: 1fr auto;
          }

          .no-header > div {
            display: none;
          }

          .no-workspace {
            padding: 25px 14px 55px;
          }

          .no-stat-grid,
          .no-flag-grid,
          .no-permission-grid,
          .no-health-summary {
            grid-template-columns: 1fr;
          }

          .no-title-actions {
            display: grid;
          }

          .no-section-heading,
          .no-flag-heading,
          .no-check-heading,
          .no-event-heading,
          .no-snapshot-list article {
            display: grid;
          }
        }
      `}</style>
    </main>
  );
}

function PageMessage({ text }: { text: string }) {
  return (
    <main
      className="no-shell no-center"
      style={{
        minHeight: "100dvh",
        padding: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#071226",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        className="no-panel"
        style={{
          width: "min(680px, 100%)",
          padding: 24,
          borderRadius: 18,
          border:
            "1px solid rgba(126,232,255,0.16)",
          background: "rgba(10,23,48,0.8)",
          textAlign: "center",
        }}
      >
        {text}
      </section>
    </main>
  );
}

function Stat({
  label: metricLabel,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="no-stat">
      <span>{metricLabel}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return <span className="no-status">{label(value)}</span>;
}

function PermissionCard({
  title,
  items,
}: {
  title: string;
  items: PermissionItem[];
}) {
  return (
    <article className="no-panel no-permission-card">
      <p className="no-eyebrow">PERMISSION AUDIT</p>
      <h2>{title}</h2>

      {items.length === 0 ? (
        <div className="no-permission-clean">
          No issues detected.
        </div>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>
              {jsonText(item)}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
