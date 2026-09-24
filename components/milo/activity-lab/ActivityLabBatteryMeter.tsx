"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ActivityLabBatteryState } from "@/lib/activity-lab/battery";

type Props = {
  mobile: boolean;
  userId: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAddBolts: () => void;
  batteryBolts: number;
  bonusBolts: number;
  totalBolts: number;
  capacityBolts: number;
  percentage: number;
  status: string;
  error: string | null;
  state: ActivityLabBatteryState | null;
  nextRechargeInSeconds: number;
  fullRechargeInSeconds: number;
};

function eta(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function accent(p: number) {
  return p <= 10 ? "#ff7187" : p <= 30 ? "#ffb65e" : p <= 50 ? "#ffd66f" : "#7ce8ff";
}

export default function ActivityLabBatteryMeter(props: Props) {
  const {
    mobile,
    userId,
    open,
    onOpen,
    onClose,
    onAddBolts,
    batteryBolts,
    bonusBolts,
    totalBolts,
    capacityBolts,
    percentage,
    status,
    error,
    state,
    nextRechargeInSeconds,
    fullRechargeInSeconds,
  } = props;

  const colour = accent(percentage);
  const runCost = state?.runCostBolts ?? 5;
  const rechargeAmount = state?.rechargeBoltsPerInterval ?? 10;
  const nextActualRecharge = Math.min(rechargeAmount, Math.max(0, capacityBolts - batteryBolts));
  const ready = totalBolts >= runCost;

  const button: CSSProperties = {
    minHeight: mobile ? 36 : 40,
    minWidth: mobile ? 104 : 176,
    padding: mobile ? "0 10px" : "0 13px",
    borderRadius: 999,
    border: `1px solid ${colour}55`,
    background: "rgba(4,14,31,.78)",
    color: "white",
    display: "grid",
    gridTemplateColumns: "auto minmax(0,1fr)",
    gap: 8,
    alignItems: "center",
    cursor: "pointer",
  };

  return (
    <>
      <button type="button" onClick={onOpen} style={button} aria-label="Open Activity Lab battery">
        <span style={{ color: colour, fontSize: mobile ? 14 : 16 }}>⚡</span>
        <span style={{ minWidth: 0, textAlign: "left" }}>
          {!mobile && (
            <span style={{ display: "block", color: "rgba(255,255,255,.46)", fontSize: 7, fontWeight: 900, letterSpacing: ".08em" }}>
              LAB BATTERY
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <strong style={{ fontSize: mobile ? 9 : 11, whiteSpace: "nowrap" }}>
              {userId ? `${batteryBolts} / ${capacityBolts}` : "Guest"}
            </strong>
            {!mobile && bonusBolts > 0 && (
              <span style={{ fontSize: 7, color: "#9fffd2", fontWeight: 900 }}>+{bonusBolts} reserve</span>
            )}
          </span>
        </span>
      </button>

      {open && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 250, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,4,12,.78)", backdropFilter: "blur(9px)" }}>
          <section onClick={(event) => event.stopPropagation()} style={{ width: "min(590px,100%)", borderRadius: 24, border: "1px solid rgba(126,232,255,.2)", background: "linear-gradient(145deg,rgba(7,25,45,.98),rgba(3,9,24,.99))", boxShadow: "0 30px 90px rgba(0,0,0,.5)", padding: mobile ? 18 : 24, color: "white" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ margin: 0, color: colour, fontSize: 9, fontWeight: 950, letterSpacing: ".16em" }}>ACTIVITY LAB BATTERY</p>
                <h2 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 28 : 36, fontWeight: 400 }}>
                  {userId ? `${batteryBolts} / ${capacityBolts} Bolts` : "Guest play"}
                </h2>
              </div>
              <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            {!userId ? (
              <p style={{ margin: "15px 0 0", color: "rgba(255,255,255,.58)", fontSize: 12, lineHeight: 1.55 }}>
                Guests can preview games. Log in to use the rechargeable battery, Play Credits and DT rewards.
              </p>
            ) : status === "loading" ? (
              <p style={{ margin: "15px 0 0", color: "rgba(255,255,255,.58)", fontSize: 12 }}>Loading your battery…</p>
            ) : error ? (
              <p style={{ margin: "15px 0 0", color: "#ff9ca7", fontSize: 12 }}>{error}</p>
            ) : (
              <>
                <div style={{ marginTop: 16, height: 15, borderRadius: 999, background: "rgba(255,255,255,.07)", padding: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, percentage))}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${colour},#9fffd2)`, transition: "width .35s ease" }} />
                </div>

                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 10, color: "rgba(255,255,255,.48)", fontSize: 10, fontWeight: 850 }}>
                  <span>Rechargeable: {batteryBolts} / {capacityBolts} Bolts</span>
                  <span>{bonusBolts > 0 ? `Reserve: ${bonusBolts} Bolts` : "No reserve Bolts"}</span>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                  <Info colour={ready ? "#84efb2" : "#ffd66f"} title={ready ? "Ready for another run" : "Not enough Bolts"}>
                    Every Activity Lab run costs {runCost} Bolts. {ready ? `You currently have ${totalBolts} Bolts available including reserve.` : `You need ${runCost} Bolts to begin a new run.`}
                  </Info>
                  <Info colour="#9feeff" title="Automatic recharge">
                    The rechargeable battery gains {rechargeAmount} Bolts every 1 hour, up to {capacityBolts}/{capacityBolts}. Recharge continues while you are offline.
                  </Info>
                </div>

                {batteryBolts < capacityBolts && (
                  <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                    <div style={{ borderRadius: 13, border: "1px solid rgba(126,232,255,.12)", background: "rgba(255,255,255,.025)", padding: 10 }}>
                      <span style={{ display: "block", color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900 }}>NEXT RECHARGE</span>
                      <strong style={{ display: "block", marginTop: 4, fontSize: 12, color: "#9feeff" }}>+{nextActualRecharge} Bolts in {eta(nextRechargeInSeconds)}</strong>
                    </div>
                    <div style={{ borderRadius: 13, border: "1px solid rgba(126,232,255,.12)", background: "rgba(255,255,255,.025)", padding: 10 }}>
                      <span style={{ display: "block", color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900 }}>FULL RECHARGE</span>
                      <strong style={{ display: "block", marginTop: 4, fontSize: 12 }}>{eta(fullRechargeInSeconds)}</strong>
                    </div>
                  </div>
                )}

                <button type="button" onClick={onAddBolts} style={{ width: "100%", minHeight: 46, marginTop: 17, borderRadius: 13, border: "1px solid rgba(255,209,106,.32)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#211300", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>
                  + Get More Bolts
                </button>
                <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,.32)", fontSize: 9, textAlign: "center" }}>
                  Play Credits can be exchanged for 100, 200 or 500 reserve Bolts.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Info({ colour, title, children }: { colour: string; title: string; children: ReactNode }) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${colour}33`, background: `${colour}0d`, padding: 11 }}>
      <strong style={{ fontSize: 11, color: colour }}>{title}</strong>
      <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.5)", fontSize: 10, lineHeight: 1.45 }}>{children}</p>
    </div>
  );
}
