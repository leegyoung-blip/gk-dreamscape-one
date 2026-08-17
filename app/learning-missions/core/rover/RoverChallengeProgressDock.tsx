"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getRoverLevel,
  type RoverLevelAccess,
  type RoverLevelId,
} from "../rover-challenge/levels";

const LEVEL_IDS: RoverLevelId[] = [1, 2, 3];

export default function RoverChallengeProgressDock() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<RoverLevelAccess[]>([]);
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState(false);

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
      setMessage("Run the Level 3 rover progression SQL in Supabase.");
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

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("rover-level-progress-updated", refresh);
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
          ) : message ? (
            <p style={errorMessage}>{message}</p>
          ) : (
            <div style={levelList}>
              {LEVEL_IDS.map((levelId) => {
                const level = getRoverLevel(levelId);
                const access = accessByLevel.get(levelId);
                const completed = Boolean(access?.completed);
                const unlocked = Boolean(access?.unlocked);
                const stageReady = Boolean(access?.stage_ready);
                const playable =
                  unlocked && stageReady && level.status === "playable";

                let status = "Locked";
                if (completed) status = "Completed";
                else if (!unlocked && level.prerequisiteLevel !== null) {
                  status = `Complete Level ${level.prerequisiteLevel}`;
                } else if (unlocked && !stageReady) {
                  status = `Stage ${level.minimumRoverStage} required`;
                } else if (playable) {
                  status = "Ready";
                }

                return (
                  <div key={level.id} style={levelRow(completed, playable)}>
                    <div style={levelNumber(completed, playable)}>{level.id}</div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={levelName}>{level.title}</p>
                      <p style={levelStatus(completed, playable)}>{status}</p>
                    </div>

                    <button
                      type="button"
                      disabled={!playable && !completed}
                      onClick={() =>
                        router.push(
                          `/learning-missions/core/rover-challenge/${level.id}`,
                        )
                      }
                      style={levelButton(playable || completed)}
                    >
                      {completed ? "Replay" : playable ? "Play" : "Locked"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {signedIn && !loading && !message && (
            <p style={stageText}>Current rover: Stage {currentStage}</p>
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
    width: collapsed ? "250px" : "min(390px, calc(100vw - 28px))",
    borderRadius: "20px",
    border: "1px solid rgba(126,232,255,0.3)",
    background: "rgba(3,11,25,0.94)",
    boxShadow: "0 22px 70px rgba(0,0,0,0.52), 0 0 28px rgba(83,215,255,0.12)",
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

const levelList: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "12px",
};

function levelRow(completed: boolean, playable: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px",
    borderRadius: "14px",
    border: completed
      ? "1px solid rgba(111,255,184,0.24)"
      : playable
        ? "1px solid rgba(126,232,255,0.28)"
        : "1px solid rgba(255,255,255,0.08)",
    background: completed
      ? "rgba(70,210,140,0.08)"
      : playable
        ? "rgba(83,215,255,0.07)"
        : "rgba(255,255,255,0.025)",
  };
}

function levelNumber(completed: boolean, playable: boolean): React.CSSProperties {
  return {
    width: "34px",
    height: "34px",
    flex: "0 0 34px",
    display: "grid",
    placeItems: "center",
    borderRadius: "11px",
    background: completed
      ? "rgba(111,255,184,0.16)"
      : playable
        ? "rgba(126,232,255,0.14)"
        : "rgba(255,255,255,0.05)",
    color: completed ? "#8dffbf" : playable ? "#8ee8ff" : "#667085",
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

function levelStatus(completed: boolean, playable: boolean): React.CSSProperties {
  return {
    margin: "3px 0 0",
    fontSize: "10px",
    color: completed ? "#8dffbf" : playable ? "#8ee8ff" : "#8290a8",
  };
}

function levelButton(enabled: boolean): React.CSSProperties {
  return {
    minWidth: "62px",
    minHeight: "34px",
    borderRadius: "10px",
    border: enabled
      ? "1px solid rgba(126,232,255,0.35)"
      : "1px solid rgba(255,255,255,0.07)",
    background: enabled ? "#8ee8ff" : "rgba(255,255,255,0.035)",
    color: enabled ? "#06111f" : "#5e6878",
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
  };
}

const stageText: React.CSSProperties = {
  margin: "10px 2px 0",
  color: "rgba(255,255,255,0.42)",
  fontSize: "10px",
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
