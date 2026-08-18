"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getRoverLevel,
  type RoverLevelAccess,
  type RoverLevelId,
} from "../rover-challenge/levels";

const LEVEL_IDS: RoverLevelId[] = [1, 2, 3, 4];

type PurchaseUnlockRow = {
  success: boolean;
  unlocked_level_id: number;
  course_id: string;
  gem_cost: number;
  new_balance: number;
  transaction_id: string;
};

export default function RoverChallengeProgressDock() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<RoverLevelAccess[]>([]);
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [purchasingLevel, setPurchasingLevel] = useState<RoverLevelId | null>(
    null,
  );

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSignedIn(false);
      setRows([]);
      setLoading(false);
      return;
    }

    setSignedIn(true);

    const { data, error } = await supabase.rpc("get_rover_level_access");

    if (error) {
      console.warn("Could not load rover level progression:", error.message);
      setRows([]);
      setMessage("Run the Rover Level Access System SQL in Supabase.");
    } else {
      setRows((data ?? []) as RoverLevelAccess[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProgress();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void loadProgress());

    const refresh = () => void loadProgress();
    window.addEventListener("focus", refresh);
    window.addEventListener("rover-level-progress-updated", refresh);
    window.addEventListener("dream-gems-updated", refresh);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("rover-level-progress-updated", refresh);
      window.removeEventListener("dream-gems-updated", refresh);
    };
  }, [loadProgress]);

  const accessByLevel = useMemo(() => {
    const map = new Map<RoverLevelId, RoverLevelAccess>();

    for (const row of rows) {
      const levelId = Number(row.level_id) as RoverLevelId;
      if (LEVEL_IDS.includes(levelId)) map.set(levelId, row);
    }

    return map;
  }, [rows]);

  const currentStage = rows[0]?.current_rover_stage ?? 0;
  const dreamGemBalance = rows[0]?.dream_gem_balance ?? 0;
  const isAdmin = rows.some((row) => row.admin_access);

  const purchaseEarlyUnlock = useCallback(
    async (levelId: RoverLevelId) => {
      const access = accessByLevel.get(levelId);
      const level = getRoverLevel(levelId);

      if (!access?.can_early_unlock || access.early_unlock_price <= 0) {
        return;
      }

      if (dreamGemBalance < access.early_unlock_price) {
        setMessage(
          `You need ${access.early_unlock_price - dreamGemBalance} more Dream Gems to unlock Level ${levelId}.`,
        );
        return;
      }

      const confirmed = window.confirm(
        [
          `Unlock Level ${levelId} — ${level.title} early?`,
          "",
          `Cost: ${access.early_unlock_price} Dream Gems`,
          `Balance: ${dreamGemBalance} → ${dreamGemBalance - access.early_unlock_price}`,
          "",
          "This is a permanent unlock for this account. It bypasses the normal rover-stage requirement, but previous Rover Levels must still be completed in order.",
        ].join("\n"),
      );

      if (!confirmed) return;

      setPurchasingLevel(levelId);
      setMessage("");

      const { data, error } = await supabase.rpc(
        "purchase_rover_level_unlock",
        {
          p_level_id: levelId,
        },
      );

      setPurchasingLevel(null);

      if (error) {
        setMessage(error.message || "The Rover Level could not be unlocked.");
        return;
      }

      const result = ((data ?? []) as PurchaseUnlockRow[])[0];

      setMessage(
        result?.success
          ? `Level ${levelId} unlocked permanently for ${result.gem_cost} Dream Gems.`
          : `Level ${levelId} could not be unlocked.`,
      );

      window.dispatchEvent(new Event("dream-gems-updated"));
      window.dispatchEvent(new Event("rover-level-progress-updated"));
      await loadProgress();
    },
    [accessByLevel, dreamGemBalance, loadProgress],
  );

  return (
    <aside style={shell(collapsed)} aria-label="Rover Challenge level progress">
      <div style={headingRow}>
        <div style={{ minWidth: 0 }}>
          <p style={eyebrow}>ROVER CHALLENGE</p>
          <h2 style={title}>Level Progress</h2>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          style={collapseButton}
          aria-label={collapsed ? "Expand rover levels" : "Collapse rover levels"}
        >
          {collapsed ? "+" : "−"}
        </button>
      </div>

      {!collapsed && (
        <>
          {!signedIn ? (
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={loginButton}
            >
              Log in to view levels
            </button>
          ) : loading ? (
            <p style={statusMessage}>Loading challenge progress...</p>
          ) : rows.length === 0 ? (
            <p style={errorMessage}>
              {message || "Rover Level access could not be loaded."}
            </p>
          ) : (
            <>
              <div style={walletRow}>
                <span>{isAdmin ? "ADMIN ACCESS" : `Stage ${currentStage}`}</span>
                <span style={gemBalance}>◆ {dreamGemBalance} DG</span>
              </div>

              <div style={levelList}>
                {LEVEL_IDS.map((levelId) => {
                  const level = getRoverLevel(levelId);
                  const access = accessByLevel.get(levelId);

                  if (!access) return null;

                  const completed = Boolean(access.completed);
                  const playable =
                    Boolean(access.unlocked) && level.status === "playable";
                  const canEarlyUnlock = Boolean(access.can_early_unlock);
                  const hasEnoughGems =
                    dreamGemBalance >= access.early_unlock_price;
                  const purchasing = purchasingLevel === levelId;

                  let status = "Locked";

                  if (access.admin_access) {
                    status = completed ? "Completed · Admin access" : "Admin access";
                  } else if (completed) {
                    status = "Completed";
                  } else if (access.early_unlock_purchased) {
                    status = "Early unlock · Permanent";
                  } else if (playable && access.stage_ready) {
                    status = "Ready";
                  } else if (!access.prerequisite_completed) {
                    status = `Complete Level ${access.prerequisite_level}`;
                  } else if (canEarlyUnlock && hasEnoughGems) {
                    status = `Stage ${access.minimum_rover_stage} normally required · Early unlock available`;
                  } else if (canEarlyUnlock) {
                    status = `Need ${access.early_unlock_price - dreamGemBalance} more DG for early unlock`;
                  } else if (!access.stage_ready) {
                    status = `Stage ${access.minimum_rover_stage} required`;
                  }

                  const highlighted = playable || canEarlyUnlock;

                  return (
                    <div key={level.id} style={levelRow(completed, highlighted)}>
                      <div style={levelNumber(completed, highlighted)}>
                        {level.id}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={levelName}>{level.title}</p>
                        <p style={levelStatus(completed, highlighted)}>{status}</p>

                        {canEarlyUnlock && (
                          <p style={priceText}>
                            Early unlock: ◆ {access.early_unlock_price} Dream Gems
                          </p>
                        )}
                      </div>

                      {completed || playable ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/learning-missions/core/rover-challenge/${level.id}`,
                            )
                          }
                          style={levelButton(true, "play")}
                        >
                          {completed ? "Replay" : "Play"}
                        </button>
                      ) : canEarlyUnlock ? (
                        <button
                          type="button"
                          disabled={!hasEnoughGems || purchasing}
                          onClick={() => void purchaseEarlyUnlock(levelId)}
                          style={levelButton(hasEnoughGems && !purchasing, "gem")}
                        >
                          {purchasing
                            ? "Unlocking..."
                            : hasEnoughGems
                              ? `${access.early_unlock_price} DG`
                              : "Need DG"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          style={levelButton(false, "locked")}
                        >
                          Locked
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {signedIn && message && rows.length > 0 && (
            <p style={messageBanner}>{message}</p>
          )}

          {signedIn && !loading && rows.length > 0 && (
            <p style={stageText}>
              {isAdmin
                ? "Admins can enter every Rover Level without progression checks."
                : "Dream Gems bypass only the rover-stage requirement. Previous levels must still be completed."}
            </p>
          )}
        </>
      )}
    </aside>
  );
}

function shell(collapsed: boolean): React.CSSProperties {
  return {
    position: "fixed",
    right: "14px",
    bottom: "14px",
    zIndex: 80,
    width: collapsed ? "250px" : "min(430px, calc(100vw - 28px))",
    borderRadius: "20px",
    border: "1px solid rgba(126,232,255,0.3)",
    background: "rgba(3,11,25,0.95)",
    boxShadow:
      "0 22px 70px rgba(0,0,0,0.52), 0 0 28px rgba(83,215,255,0.12)",
    backdropFilter: "blur(18px)",
    color: "white",
    padding: collapsed ? "12px 14px" : "14px",
    fontFamily: "Arial, Helvetica, sans-serif",
  };
}

const headingRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.2em",
};

const title: React.CSSProperties = {
  margin: "3px 0 0",
  fontSize: "18px",
};

const collapseButton: React.CSSProperties = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "rgba(255,255,255,0.05)",
  color: "#c8f8ff",
  cursor: "pointer",
  fontSize: "20px",
  lineHeight: 1,
};

const walletRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginTop: "12px",
  padding: "8px 10px",
  borderRadius: "12px",
  border: "1px solid rgba(192,132,252,0.18)",
  background: "rgba(126,34,206,0.08)",
  color: "rgba(255,255,255,0.62)",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.06em",
};

const gemBalance: React.CSSProperties = {
  color: "#e9c7ff",
  fontWeight: 900,
};

const levelList: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "10px",
};

function levelRow(completed: boolean, highlighted: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "14px",
    border: completed
      ? "1px solid rgba(111,255,184,0.24)"
      : highlighted
        ? "1px solid rgba(126,232,255,0.28)"
        : "1px solid rgba(255,255,255,0.08)",
    background: completed
      ? "rgba(70,210,140,0.08)"
      : highlighted
        ? "rgba(83,215,255,0.06)"
        : "rgba(255,255,255,0.025)",
  };
}

function levelNumber(completed: boolean, highlighted: boolean): React.CSSProperties {
  return {
    width: "34px",
    height: "34px",
    flex: "0 0 34px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: completed
      ? "rgba(111,255,184,0.16)"
      : highlighted
        ? "rgba(126,232,255,0.14)"
        : "rgba(255,255,255,0.05)",
    color: completed ? "#8dffbf" : highlighted ? "#8ee8ff" : "#667085",
    fontWeight: 900,
  };
}

const levelName: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

function levelStatus(completed: boolean, highlighted: boolean): React.CSSProperties {
  return {
    margin: "3px 0 0",
    fontSize: "10px",
    lineHeight: 1.35,
    color: completed ? "#8dffbf" : highlighted ? "#8ee8ff" : "#8290a8",
  };
}

const priceText: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#e4b9ff",
  fontSize: "9px",
  fontWeight: 800,
};

function levelButton(
  enabled: boolean,
  kind: "play" | "gem" | "locked",
): React.CSSProperties {
  const gem = kind === "gem";

  return {
    minWidth: gem ? "74px" : "62px",
    minHeight: "36px",
    borderRadius: "10px",
    border: enabled
      ? gem
        ? "1px solid rgba(216,180,254,0.42)"
        : "1px solid rgba(126,232,255,0.35)"
      : "1px solid rgba(255,255,255,0.07)",
    background: enabled
      ? gem
        ? "linear-gradient(135deg, #d8b4fe, #a855f7)"
        : "#8ee8ff"
      : "rgba(255,255,255,0.035)",
    color: enabled ? "#06111f" : "#5e6878",
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    padding: "0 9px",
  };
}

const stageText: React.CSSProperties = {
  margin: "10px 2px 0",
  color: "rgba(255,255,255,0.4)",
  fontSize: "9px",
  lineHeight: 1.45,
  textAlign: "right",
};

const statusMessage: React.CSSProperties = {
  margin: "14px 2px 2px",
  color: "rgba(255,255,255,0.55)",
  fontSize: "12px",
};

const errorMessage: React.CSSProperties = {
  margin: "14px 0 2px",
  borderRadius: "12px",
  border: "1px solid rgba(255,190,115,0.2)",
  background: "rgba(255,170,80,0.08)",
  padding: "10px",
  color: "#ffd4a5",
  fontSize: "11px",
  lineHeight: 1.45,
};

const messageBanner: React.CSSProperties = {
  margin: "10px 0 0",
  borderRadius: "12px",
  border: "1px solid rgba(216,180,254,0.2)",
  background: "rgba(168,85,247,0.08)",
  padding: "9px 10px",
  color: "#ead1ff",
  fontSize: "10px",
  lineHeight: 1.45,
};

const loginButton: React.CSSProperties = {
  width: "100%",
  minHeight: "40px",
  marginTop: "12px",
  borderRadius: "12px",
  border: 0,
  background: "#8ee8ff",
  color: "#06111f",
  fontWeight: 900,
  cursor: "pointer",
};
