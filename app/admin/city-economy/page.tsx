"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type JsonRecord = Record<string, unknown>;
type RpcError = { message: string } | null;
type RpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: RpcError }>;
};

function rec(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function arr(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? (value.filter((item) => item && typeof item === "object") as JsonRecord[])
    : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown) {
  return value === true;
}

function formatDateTime(value: unknown) {
  const raw = text(value);
  if (!raw) return "Never";
  try {
    return new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function formatDuration(value: unknown) {
  const ms = num(value);
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  const styles =
    tone === "good"
      ? { color: "#a9f5c7", border: "rgba(169,245,199,.22)", bg: "rgba(74,222,128,.08)" }
      : tone === "warn"
      ? { color: "#ffd18a", border: "rgba(255,209,138,.24)", bg: "rgba(255,209,138,.08)" }
      : tone === "bad"
      ? { color: "#ffb0b0", border: "rgba(255,176,176,.24)", bg: "rgba(255,90,90,.08)" }
      : { color: "#8ee8ff", border: "rgba(142,232,255,.18)", bg: "rgba(83,215,255,.07)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "28px",
        padding: "0 9px",
        borderRadius: "999px",
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        color: styles.color,
        fontSize: "10px",
        fontWeight: 900,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export default function CityEconomyAdminPage() {
  const [status, setStatus] = useState<JsonRecord>({});
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const rpc = supabase as unknown as RpcClient;

  async function loadStatus() {
    setError("");
    const { data, error: rpcError } = await rpc.rpc("admin_get_milo_city_control_centre");
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    const result = rec(data);
    if (result.ok === false && result.reason === "admin_only") {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    setAccessDenied(false);
    setStatus(result);
    setLoading(false);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function invoke(
    actionKey: string,
    name: string,
    args?: Record<string, unknown>,
    successMessage?: string
  ) {
    if (action) return;
    setAction(actionKey);
    setMessage("");
    setError("");
    const { data, error: rpcError } = await rpc.rpc(name, args);
    if (rpcError) {
      setError(rpcError.message);
    } else {
      const result = rec(data);
      if (result.ok === false) {
        setError(text(result.reason, "The action could not be completed."));
      } else {
        setMessage(successMessage || "Action completed.");
      }
    }
    await loadStatus();
    setAction("");
  }

  const engine = rec(status.engine);
  const config = rec(engine.config);
  const state = rec(engine.state);
  const modules = arr(engine.modules);
  const schedule = rec(status.schedule);
  const scheduleJobs = arr(schedule.jobs);
  const stockConfig = rec(status.stock_config);
  const alerts = arr(status.alerts);
  const runs = arr(status.last_runs);
  const io = rec(status.io_24h);
  const pulse = rec(status.pulse);
  const eventTemplates = arr(status.event_templates);
  const activeEvents = arr(status.active_city_events);

  const engineOn = bool(config.engine_enabled);
  const stockLive = bool(stockConfig.price_movement_enabled);
  const ticksOn = bool(config.city_ticks_enabled);
  const settlementsOn = bool(config.settlements_enabled);
  const scheduleActive = scheduleJobs.filter((job) => bool(job.active)).length >= 2;

  const subsystemRows = useMemo(
    () => [
      ["residents", "Residents", bool(config.residents_enabled)],
      ["property", "Property", bool(config.property_enabled)],
      ["businesses", "Businesses", bool(config.businesses_enabled)],
      ["jobs", "Jobs & Companies", bool(config.jobs_enabled)],
    ] as const,
    [config]
  );

  const panel: CSSProperties = {
    borderRadius: "24px",
    border: "1px solid rgba(132,218,255,0.16)",
    background: "rgba(5,13,28,0.72)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };

  const button = (danger = false): CSSProperties => ({
    minHeight: "42px",
    padding: "0 15px",
    borderRadius: "999px",
    border: danger
      ? "1px solid rgba(255,176,176,0.24)"
      : "1px solid rgba(132,218,255,0.22)",
    background: danger ? "rgba(255,90,90,0.08)" : "rgba(83,215,255,0.1)",
    color: danger ? "#ffb0b0" : "white",
    fontWeight: 900,
    fontFamily: "inherit",
    cursor: action ? "not-allowed" : "pointer",
    opacity: action ? 0.58 : 1,
  });

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#020817", color: "white", display: "grid", placeItems: "center" }}>
        Loading Economy Control Centre…
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main style={{ minHeight: "100vh", background: "#020817", color: "white", display: "grid", placeItems: "center", padding: "24px" }}>
        <div style={{ ...panel, width: "min(600px, 100%)", padding: "28px" }}>
          <h1 style={{ margin: 0 }}>Admin access required</h1>
          <p style={{ color: "rgba(255,255,255,.55)" }}>This page controls the autonomous Dreamscape economy.</p>
          <Link href="/milo-world/exchange" style={{ color: "#8ee8ff", fontWeight: 900 }}>← Back to Exchange</Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 14% 0%, rgba(27,107,143,.22), transparent 34%), radial-gradient(circle at 88% 8%, rgba(145,94,20,.14), transparent 34%), #020817",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ width: "min(1760px, calc(100% - 28px))", margin: "0 auto", padding: "24px 0 70px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <Link href="/milo-world/exchange" style={{ color: "#8ee8ff", textDecoration: "none", fontWeight: 900 }}>
              ← Exchange Home
            </Link>
            <p style={{ margin: "18px 0 0", color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.2em" }}>
              ADMIN · LIVING CITY
            </p>
            <h1 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "clamp(42px, 6vw, 70px)", fontWeight: 500 }}>
              Economy Control Centre
            </h1>
          </div>
          <button type="button" onClick={() => void loadStatus()} disabled={Boolean(action)} style={button(false)}>
            Refresh Status
          </button>
        </header>

        {(message || error) && (
          <div style={{ ...panel, marginTop: "18px", padding: "14px 16px", color: error ? "#ffb0b0" : "#a9f5c7" }}>
            {error || message}
          </div>
        )}

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "10px",
          }}
        >
          {[
            ["Engine", engineOn ? "RUNNING" : "FROZEN", engineOn ? "good" : "warn"],
            ["Schedule", scheduleActive ? "ACTIVE" : "OFF / INCOMPLETE", scheduleActive ? "good" : "warn"],
            ["Stock Market", stockLive ? "LIVE" : "PAUSED", stockLive ? "good" : "neutral"],
            ["Last Success", formatDateTime(state.last_success_at), num(state.consecutive_failures) > 0 ? "warn" : "neutral"],
            ["24h Wallet Writes", Math.round(num(io.wallet_writes)).toLocaleString(), "neutral"],
            ["24h Max Runtime", formatDuration(io.max_duration_ms), num(io.max_duration_ms) > num(config.max_tick_runtime_ms, 12000) ? "warn" : "neutral"],
          ].map(([label, value, tone]) => (
            <article key={String(label)} style={{ ...panel, padding: "16px" }}>
              <small style={{ color: "rgba(255,255,255,.4)", fontWeight: 900, letterSpacing: ".08em" }}>{label}</small>
              <div style={{ marginTop: "7px" }}>
                <Pill tone={tone as "good" | "warn" | "bad" | "neutral"}>{String(value)}</Pill>
              </div>
            </article>
          ))}
        </section>

        {alerts.length > 0 && (
          <section style={{ ...panel, marginTop: "14px", padding: "18px" }}>
            <strong style={{ color: "#ffd18a" }}>Health alerts</strong>
            <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
              {alerts.map((alert, index) => (
                <div key={`${text(alert.code)}-${index}`} style={{ borderRadius: "14px", padding: "11px 12px", background: "rgba(255,209,138,.055)", border: "1px solid rgba(255,209,138,.13)", color: "rgba(255,255,255,.72)", fontSize: "13px" }}>
                  {text(alert.message, "Check the Living City engine.")}
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "14px" }}>
          <article style={{ ...panel, padding: "20px" }}>
            <p style={{ margin: 0, color: "#ffb0b0", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>MASTER SAFETY</p>
            <h2 style={{ margin: "7px 0 0", fontSize: "28px" }}>Living City Engine</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: "13px", lineHeight: 1.5 }}>
              Freeze stops new city ticks and settlements without deleting residents, holdings, leases, trades or market history.
            </p>
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
              {engineOn ? (
                <button
                  type="button"
                  disabled={Boolean(action)}
                  onClick={() => {
                    if (window.confirm("Freeze the Living City economy? Existing data will remain intact.")) {
                      void invoke("freeze", "admin_set_milo_city_engine_enabled", { p_enabled: false, p_reason: "Frozen from Economy Control Centre" }, "Living City Engine frozen.");
                    }
                  }}
                  style={button(true)}
                >
                  FREEZE ECONOMY
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(action)}
                  onClick={() => void invoke("resume", "admin_set_milo_city_engine_enabled", { p_enabled: true, p_reason: null }, "Living City Engine resumed.")}
                  style={button(false)}
                >
                  Resume Economy
                </button>
              )}
            </div>
          </article>

          <article style={{ ...panel, padding: "20px" }}>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>SCHEDULE</p>
            <h2 style={{ margin: "7px 0 0", fontSize: "28px" }}>24/7 City Clock</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: "13px", lineHeight: 1.5 }}>
              Four city ticks each day, one daily settlement, and weekly history cleanup. No extra Phase 10F cron jobs are created.
            </p>
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => void invoke("schedule-on", "admin_enable_milo_city_engine_schedule", undefined, "Living City schedule enabled.")}
                style={button(false)}
              >
                Enable Schedule
              </button>
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => {
                  if (window.confirm("Disable automatic Living City cron jobs?")) {
                    void invoke("schedule-off", "admin_disable_milo_city_engine_schedule", undefined, "Living City schedule disabled.");
                  }
                }}
                style={button(true)}
              >
                Disable Schedule
              </button>
            </div>
          </article>
        </section>

        <section style={{ ...panel, marginTop: "14px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>SUBSYSTEMS</p>
              <h2 style={{ margin: "7px 0 0", fontSize: "28px" }}>Independent kill switches</h2>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => void invoke("ticks", "admin_set_milo_city_runtime_enabled", { p_runtime: "city_ticks", p_enabled: !ticksOn }, `City ticks ${ticksOn ? "paused" : "enabled"}.`)}
                style={button(!ticksOn)}
              >
                City Ticks: {ticksOn ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => void invoke("settlements", "admin_set_milo_city_runtime_enabled", { p_runtime: "settlements", p_enabled: !settlementsOn }, `Daily settlements ${settlementsOn ? "paused" : "enabled"}.`)}
                style={button(!settlementsOn)}
              >
                Settlements: {settlementsOn ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "9px" }}>
            {subsystemRows.map(([key, label, enabled]) => (
              <div key={key} style={{ borderRadius: "16px", padding: "13px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div>
                  <strong>{label}</strong>
                  <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,.4)" }}>{enabled ? "Autonomous processing enabled" : "Paused"}</small>
                </div>
                <button
                  type="button"
                  disabled={Boolean(action)}
                  onClick={() => void invoke(`sub-${key}`, "admin_set_milo_city_subsystem_enabled", { p_subsystem: key, p_enabled: !enabled }, `${label} ${enabled ? "paused" : "enabled"}.`)}
                  style={{ ...button(!enabled), minHeight: "36px", padding: "0 11px" }}
                >
                  {enabled ? "ON" : "OFF"}
                </button>
              </div>
            ))}

            <div style={{ borderRadius: "16px", padding: "13px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <div>
                <strong>Stocks + Synthetic Investors</strong>
                <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,.4)" }}>{stockLive ? "Autonomous market live" : "Autonomous market paused"}</small>
              </div>
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => {
                  if (!stockLive || window.confirm("Pause autonomous stock price movement and synthetic stock trading?")) {
                    void invoke("stock-live", "admin_set_milo_stock_market_live", { p_enabled: !stockLive }, `Autonomous stock market ${stockLive ? "paused" : "enabled"}.`);
                  }
                }}
                style={{ ...button(!stockLive), minHeight: "36px", padding: "0 11px" }}
              >
                {stockLive ? "LIVE" : "OFF"}
              </button>
            </div>
          </div>
        </section>

        <section style={{ ...panel, marginTop: "14px", padding: "20px" }}>
          <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>MANUAL TESTS</p>
          <h2 style={{ margin: "7px 0 0", fontSize: "28px" }}>Run one controlled cycle</h2>
          <div style={{ marginTop: "13px", display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <button type="button" disabled={Boolean(action)} onClick={() => void invoke("run-tick", "admin_run_milo_city_tick_now", undefined, "One city tick completed.")} style={button(false)}>Run City Tick</button>
            <button type="button" disabled={Boolean(action)} onClick={() => void invoke("run-settlement", "admin_run_milo_city_settlement_now", undefined, "Daily settlement command completed.")} style={button(false)}>Run Daily Settlement</button>
            <button type="button" disabled={Boolean(action)} onClick={() => void invoke("run-stock", "admin_run_milo_stock_settlement_now", undefined, "Stock settlement command completed.")} style={button(false)}>Run Stock Settlement</button>
            <button type="button" disabled={Boolean(action)} onClick={() => void invoke("pulse", "admin_refresh_milo_city_public_pulse", undefined, "City Pulse cache refreshed.")} style={button(false)}>Refresh Pulse Cache</button>
          </div>
        </section>

        <section style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "14px" }}>
          <article style={{ ...panel, padding: "20px" }}>
            <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>CITY EVENTS</p>
            <h2 style={{ margin: "7px 0 0", fontSize: "28px" }}>Development controls</h2>
            <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
              {eventTemplates.slice(0, 10).map((template) => (
                <div key={text(template.template_key)} style={{ borderRadius: "14px", padding: "11px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: "13px" }}>{text(template.title)}</strong>
                    <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,.38)" }}>{text(template.category)}</small>
                  </div>
                  <button type="button" disabled={Boolean(action) || !bool(template.enabled)} onClick={() => void invoke(`event-${text(template.template_key)}`, "admin_spawn_milo_city_development_event", { p_template_key: text(template.template_key) }, "City development spawned.")} style={{ ...button(false), minHeight: "34px", padding: "0 10px" }}>Spawn</button>
                </div>
              ))}
            </div>
            {activeEvents.length > 0 && (
              <button
                type="button"
                disabled={Boolean(action)}
                onClick={() => {
                  if (window.confirm("Expire all active city development events?")) {
                    void invoke("expire-events", "admin_expire_milo_city_development_events", undefined, "Active city developments expired.");
                  }
                }}
                style={{ ...button(true), marginTop: "12px" }}
              >
                Expire Active Events
              </button>
            )}
          </article>

          <article style={{ ...panel, padding: "20px" }}>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>CURRENT PULSE</p>
            <h2 style={{ margin: "7px 0 0", fontSize: "28px" }}>{text(pulse.economy_state, "steady").toUpperCase()}</h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: "13px" }}>Cached {formatDateTime(pulse.cache_updated_at)}</p>
            <Link href="/milo-world/exchange/city-pulse" style={{ color: "#8ee8ff", fontWeight: 900, textDecoration: "none" }}>Open public City Pulse →</Link>
          </article>
        </section>

        <section style={{ ...panel, marginTop: "14px", padding: "20px", overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>I/O MONITOR</p>
              <h2 style={{ margin: "7px 0 0", fontSize: "28px" }}>Latest engine runs</h2>
            </div>
            <Pill>{Math.round(num(io.runs)).toLocaleString()} runs in 24h</Pill>
          </div>

          <table style={{ width: "100%", minWidth: "900px", marginTop: "14px", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ color: "rgba(255,255,255,.42)", textAlign: "left" }}>
                {['Time','Run','Status','Duration','Processed','Written','Events','Wallet','Error'].map((heading) => (
                  <th key={heading} style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={text(run.id)}>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)", color: "rgba(255,255,255,.6)" }}>{formatDateTime(run.started_at)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)" }}>{text(run.run_type)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)" }}><Pill tone={text(run.status)==='success' ? 'good' : text(run.status)==='partial' ? 'warn' : text(run.status)==='failed' ? 'bad' : 'neutral'}>{text(run.status,'—')}</Pill></td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)" }}>{formatDuration(run.duration_ms)}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)" }}>{Math.round(num(run.rows_processed))}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)" }}>{Math.round(num(run.rows_written))}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)" }}>{Math.round(num(run.events_written))}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)" }}>{Math.round(num(run.wallet_writes))}</td>
                  <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,.055)", color: "#ffb0b0", maxWidth: "320px" }}>{text(run.error_message, "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ ...panel, marginTop: "14px", padding: "20px" }}>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: ".16em" }}>MODULE HEALTH</p>
          <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "9px" }}>
            {modules.map((module) => (
              <div key={text(module.module_key)} style={{ borderRadius: "15px", padding: "12px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <strong>{text(module.display_name, text(module.module_key))}</strong>
                  <Pill tone={text(module.last_status)==='failed' ? 'bad' : bool(module.enabled) ? 'good' : 'neutral'}>{bool(module.enabled) ? 'enabled' : 'paused'}</Pill>
                </div>
                <small style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,.4)" }}>Last run {formatDateTime(module.last_run_at)}</small>
                <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,.4)" }}>Batch limit {Math.round(num(module.batch_limit))}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
