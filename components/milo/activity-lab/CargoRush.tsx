"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type CargoRushProps = {
  userId: string;
  mobile: boolean;
  dense: boolean;
  width: number;
  height: number;
  onTokenTransaction: (amount: number, description: string) => Promise<boolean>;
};

type CargoBay = {
  id: "food" | "tech" | "fashion" | "energy";
  title: string;
  code: string;
  hint: string;
  accent: string;
};

const CARGO_BAYS: CargoBay[] = [
  {
    id: "food",
    title: "Food",
    code: "FD-01",
    hint: "Fresh & pantry",
    accent: "#72f0b0",
  },
  {
    id: "tech",
    title: "Tech",
    code: "TC-02",
    hint: "Devices & gear",
    accent: "#78ddff",
  },
  {
    id: "fashion",
    title: "Fashion",
    code: "FS-03",
    hint: "Wearables",
    accent: "#d5a4ff",
  },
  {
    id: "energy",
    title: "Energy",
    code: "EN-04",
    hint: "Power cargo",
    accent: "#ffd56f",
  },
];

type CargoCategory = CargoBay["id"];

type MovingPackage = {
  id: number;
  label: string;
  category: CargoCategory;
  lane: number;
  x: number;
  speed: number;
  status: "active" | "missed";
};

type RouteFeedback = {
  tone: "correct" | "wrong" | "missed" | "hint";
  title: string;
  detail: string;
};

type BayPulse = {
  id: CargoCategory;
  tone: "correct" | "wrong";
};

type RushStage = {
  key: "calm" | "busy" | "fast" | "rush";
  label: string;
  spawnEvery: number;
  speedMultiplier: number;
  beltDuration: number;
  accent: string;
};

const RUSH_STAGES: RushStage[] = [
  { key: "calm", label: "CALM", spawnEvery: 1.25, speedMultiplier: 1, beltDuration: 1.8, accent: "#8ee8ff" },
  { key: "busy", label: "BUSY", spawnEvery: 1.02, speedMultiplier: 1.13, beltDuration: 1.42, accent: "#8ff0c1" },
  { key: "fast", label: "FAST", spawnEvery: 0.82, speedMultiplier: 1.3, beltDuration: 1.08, accent: "#ffd66f" },
  { key: "rush", label: "RUSH", spawnEvery: 0.64, speedMultiplier: 1.5, beltDuration: 0.76, accent: "#ff8b95" },
];

const PACKAGE_CATALOG: Array<{ label: string; category: CargoCategory }> = [
  { label: "Apples", category: "food" },
  { label: "Bread", category: "food" },
  { label: "Rice", category: "food" },
  { label: "Juice", category: "food" },
  { label: "Laptop", category: "tech" },
  { label: "Camera", category: "tech" },
  { label: "Tablet", category: "tech" },
  { label: "Headphones", category: "tech" },
  { label: "Jacket", category: "fashion" },
  { label: "Shoes", category: "fashion" },
  { label: "Cap", category: "fashion" },
  { label: "Backpack", category: "fashion" },
  { label: "Battery", category: "energy" },
  { label: "Power Cell", category: "energy" },
  { label: "Solar Pack", category: "energy" },
  { label: "Charge Core", category: "energy" },
];


export default function CargoRush({
  userId,
  mobile,
  dense,
  width,
  height,
  onTokenTransaction,
}: CargoRushProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPreviewNotice, setShowPreviewNotice] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [packages, setPackages] = useState<MovingPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [routeFeedback, setRouteFeedback] = useState<RouteFeedback | null>(null);
  const [bayPulse, setBayPulse] = useState<BayPulse | null>(null);
  const [sortedCount, setSortedCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [stageDeliveries, setStageDeliveries] = useState<Record<RushStage["key"], number>>({
    calm: 0,
    busy: 0,
    fast: 0,
    rush: 0,
  });
  const [completedRunId, setCompletedRunId] = useState<number | null>(null);
  const [rewardState, setRewardState] = useState<"idle" | "awarding" | "awarded" | "guest" | "failed">("idle");
  const [awardedDt, setAwardedDt] = useState(0);

  const nextPackageId = useRef(1);
  const lastFrameAt = useRef<number | null>(null);
  const spawnAccumulator = useRef(0);
  const feedbackTimer = useRef<number | null>(null);
  const bayPulseTimer = useRef<number | null>(null);
  const currentRunId = useRef(0);
  const awardedRunIds = useRef<Set<number>>(new Set());

  const veryCompact = width < 980 || height < 720;
  const bayColumns = mobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))";
  const elapsed = 60 - timeLeft;
  const rushStage = elapsed < 15
    ? RUSH_STAGES[0]
    : elapsed < 30
      ? RUSH_STAGES[1]
      : elapsed < 45
        ? RUSH_STAGES[2]
        : RUSH_STAGES[3];
  const finalTen = running && timeLeft <= 10 && timeLeft > 0;
  const stageProgress = Math.min(100, Math.max(0, (elapsed / 60) * 100));
  const totalHandled = sortedCount + wrongCount + missedCount;
  const routingAccuracy = totalHandled > 0 ? Math.round((sortedCount / totalHandled) * 100) : 0;
  const score = Math.max(
    0,
    stageDeliveries.calm * 100 +
      stageDeliveries.busy * 120 +
      stageDeliveries.fast * 140 +
      stageDeliveries.rush * 160 -
      wrongCount * 40 -
      missedCount * 25,
  );
  const accuracyBonus = routingAccuracy >= 90 ? 5 : routingAccuracy >= 80 ? 2 : 0;
  const runDtReward = sortedCount > 0 ? Math.max(1, Math.floor(score / 200) + accuracyBonus) : 0;
  const bestStage = RUSH_STAGES.reduce((best, stage) => {
    const stageCount = stageDeliveries[stage.key];
    const bestCount = stageDeliveries[best.key];
    if (stageCount > bestCount) return stage;
    if (stageCount === bestCount && stageCount > 0) return stage;
    return best;
  }, RUSH_STAGES[0]);

  const glassPanel: CSSProperties = {
    border: "1px solid rgba(133,226,255,0.16)",
    background:
      "linear-gradient(145deg, rgba(9,26,47,0.82), rgba(4,12,28,0.9))",
    boxShadow:
      "0 24px 62px rgba(0,0,0,0.24), inset 0 0 28px rgba(78,211,255,0.028)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };

  const hudTile: CSSProperties = {
    ...glassPanel,
    minWidth: 0,
    borderRadius: mobile ? "12px" : "16px",
    padding: mobile ? "8px 9px" : dense ? "9px 11px" : "11px 13px",
  };

  useEffect(() => {
    if (!running || paused) {
      lastFrameAt.current = null;
      return;
    }

    let frameId = 0;

    const tick = (now: number) => {
      const previous = lastFrameAt.current ?? now;
      const deltaSeconds = Math.min((now - previous) / 1000, 0.08);
      lastFrameAt.current = now;
      spawnAccumulator.current += deltaSeconds;

      setPackages((current) => {
        const moved = current.map((item) => {
          if (item.status !== "active") return item;
          const nextX = item.x + item.speed * rushStage.speedMultiplier * deltaSeconds;
          return {
            ...item,
            x: nextX,
            status: nextX >= 96 ? "missed" : "active",
          } as MovingPackage;
        });

        if (spawnAccumulator.current >= rushStage.spawnEvery) {
          spawnAccumulator.current = 0;

          const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
          const lane = lanes.find(
            (candidate) =>
              !moved.some(
                (item) => item.status === "active" && item.lane === candidate && item.x < 28,
              ),
          );

          if (lane !== undefined) {
            const cargo = PACKAGE_CATALOG[Math.floor(Math.random() * PACKAGE_CATALOG.length)];
            moved.push({
              id: nextPackageId.current++,
              label: cargo.label,
              category: cargo.category,
              lane,
              x: 10,
              speed: 8.5 + Math.random() * 2.5,
              status: "active",
            });
          }
        }

        return moved;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [running, paused, rushStage.speedMultiplier, rushStage.spawnEvery]);

  useEffect(() => {
    const missed = packages.filter((item) => item.status === "missed");
    if (missed.length === 0) return;

    const missedIds = new Set(missed.map((item) => item.id));
    setPackages((current) => current.filter((item) => !missedIds.has(item.id)));
    setMissedCount((current) => current + missed.length);
    setSelectedPackageId((current) => (current !== null && missedIds.has(current) ? null : current));

    const lastMissed = missed[missed.length - 1];
    showRouteFeedback(
      "missed",
      "Cargo missed",
      `${lastMissed.label} reached the end of the conveyor.`,
    );
  }, [packages]);

  useEffect(() => {
    if (!running || paused) return;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          setPaused(false);
          setPackages([]);
          setSelectedPackageId(null);
          setCompletedRunId(currentRunId.current);
          setShowPreviewNotice(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, paused]);

  useEffect(() => {
    if (!showPreviewNotice || completedRunId === null) return;
    if (awardedRunIds.current.has(completedRunId)) return;

    if (!userId) {
      setRewardState("guest");
      setAwardedDt(0);
      awardedRunIds.current.add(completedRunId);
      return;
    }

    if (runDtReward <= 0) {
      setRewardState("awarded");
      setAwardedDt(0);
      awardedRunIds.current.add(completedRunId);
      return;
    }

    let cancelled = false;
    awardedRunIds.current.add(completedRunId);
    setRewardState("awarding");

    void onTokenTransaction(runDtReward, `Cargo Rush reward · Run ${completedRunId}`).then((success) => {
      if (cancelled) return;
      if (success) {
        setAwardedDt(runDtReward);
        setRewardState("awarded");
      } else {
        awardedRunIds.current.delete(completedRunId);
        setAwardedDt(0);
        setRewardState("failed");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [completedRunId, onTokenTransaction, runDtReward, showPreviewNotice, userId]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      if (bayPulseTimer.current) window.clearTimeout(bayPulseTimer.current);
    };
  }, []);

  function showRouteFeedback(
    tone: RouteFeedback["tone"],
    title: string,
    detail: string,
  ) {
    setRouteFeedback({ tone, title, detail });
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setRouteFeedback(null), 1500);
  }

  function pulseBay(id: CargoCategory, tone: BayPulse["tone"]) {
    setBayPulse({ id, tone });
    if (bayPulseTimer.current) window.clearTimeout(bayPulseTimer.current);
    bayPulseTimer.current = window.setTimeout(() => setBayPulse(null), 620);
  }

  function startRun() {
    currentRunId.current += 1;
    setCompletedRunId(null);
    setRewardState("idle");
    setAwardedDt(0);
    setShowPreviewNotice(false);
    setTimeLeft(60);
    setPackages([]);
    setSelectedPackageId(null);
    setRouteFeedback(null);
    setBayPulse(null);
    setSortedCount(0);
    setWrongCount(0);
    setMissedCount(0);
    setStageDeliveries({ calm: 0, busy: 0, fast: 0, rush: 0 });
    setPaused(false);
    setRunning(true);
    spawnAccumulator.current = 0;
    lastFrameAt.current = null;
  }

  function togglePause() {
    if (!running) return;
    setPaused((current) => !current);
  }

  function selectPackage(packageId: number) {
    if (!running || paused) return;
    const cargo = packages.find((item) => item.id === packageId && item.status === "active");
    if (!cargo) return;

    setSelectedPackageId((current) => (current === packageId ? null : packageId));
    setRouteFeedback(null);
  }

  function routePackageToBay(packageId: number, bayId: CargoCategory) {
    if (!running || paused) return;

    const cargo = packages.find((item) => item.id === packageId && item.status === "active");
    if (!cargo) {
      setSelectedPackageId(null);
      return;
    }

    if (cargo.category === bayId) {
      setPackages((current) => current.filter((item) => item.id !== packageId));
      setSelectedPackageId(null);
      setSortedCount((current) => current + 1);
      setStageDeliveries((current) => ({
        ...current,
        [rushStage.key]: current[rushStage.key] + 1,
      }));
      pulseBay(bayId, "correct");
      showRouteFeedback(
        "correct",
        "Correct delivery",
        `${cargo.label} routed to ${CARGO_BAYS.find((bay) => bay.id === bayId)?.title ?? "the bay"}.`,
      );
      return;
    }

    setPackages((current) =>
      current.map((item) =>
        item.id === packageId ? { ...item, x: Math.max(10, item.x - 5) } : item,
      ),
    );
    setSelectedPackageId(null);
    setWrongCount((current) => current + 1);
    pulseBay(bayId, "wrong");
    showRouteFeedback(
      "wrong",
      "Wrong bay",
      `${cargo.label} was rejected. Try another destination.`,
    );
  }

  function routeSelectedToBay(bayId: CargoCategory) {
    if (!running || paused) return;
    if (selectedPackageId === null) {
      showRouteFeedback("hint", "Select cargo first", "Tap a moving package, then choose its destination bay.");
      return;
    }
    routePackageToBay(selectedPackageId, bayId);
  }

  const formattedTime = `00:${String(timeLeft).padStart(2, "0")}`;

  return (
    <div
      className="cargo-rush-shell"
      style={{
        position: "relative",
        width: "100%",
        minHeight: mobile ? "760px" : "100%",
        height: mobile ? "auto" : "100%",
        overflow: "hidden",
        borderRadius: mobile ? "14px" : "20px",
        border: "1px solid rgba(136,231,255,0.13)",
        background:
          "linear-gradient(180deg, rgba(2,11,25,0.2), rgba(2,7,18,0.9)), radial-gradient(circle at 50% -10%, rgba(46,177,224,0.22), transparent 38%), #030a16",
      }}
    >
      <style>{`
        @keyframes cargoGridMove {
          from { background-position: 0 0; }
          to { background-position: 48px 0; }
        }
        @keyframes cargoPulse {
          0%, 100% { opacity: .5; transform: scale(1); }
          50% { opacity: .9; transform: scale(1.03); }
        }
        @keyframes cargoBeltMove {
          from { background-position-x: 0; }
          to { background-position-x: 36px; }
        }
        @keyframes cargoRushFlash {
          0%, 100% { opacity: .18; }
          50% { opacity: .58; }
        }
        @keyframes cargoRushBadge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.045); }
        }
        @keyframes cargoWrongShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .cargo-rush-shell button { font-family: inherit; }
        .cargo-belt-track {
          background-image: repeating-linear-gradient(90deg, rgba(149,227,255,.08) 0 16px, rgba(149,227,255,.015) 16px 32px);
          animation: cargoBeltMove 1.8s linear infinite;
        }
        .cargo-floor-grid {
          background-image:
            linear-gradient(rgba(122,221,255,.065) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122,221,255,.065) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: cargoGridMove 7s linear infinite;
        }
      `}</style>

      {/* ASSET PLACEHOLDER
          Replace this visual layer later with:
          /public/milo/activity-lab/cargo-rush/warehouse-bg.png
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(180deg, rgba(4,15,31,0.18), rgba(2,8,20,0.72))",
        }}
      />

      {running && rushStage.key === "rush" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            border: finalTen ? "2px solid rgba(255,108,122,.22)" : "1px solid rgba(255,108,122,.12)",
            boxShadow: finalTen
              ? "inset 0 0 90px rgba(255,76,93,.11)"
              : "inset 0 0 60px rgba(255,76,93,.06)",
            animation: finalTen ? "cargoRushFlash .72s ease-in-out infinite" : undefined,
          }}
        />
      )}

      <div
        aria-hidden="true"
        className="cargo-floor-grid"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: mobile ? "52%" : "58%",
          opacity: 0.42,
          transform: "perspective(500px) rotateX(58deg) scale(1.4)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, black 45%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, black 45%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: mobile ? "72px 8px auto" : "74px 18px auto",
          height: mobile ? "104px" : "128px",
          borderRadius: "20px",
          border: "1px dashed rgba(143,231,255,0.22)",
          background:
            "linear-gradient(135deg, rgba(20,95,126,0.09), rgba(84,65,155,0.08))",
          display: "grid",
          placeItems: "center",
          color: "rgba(176,238,255,0.34)",
          fontSize: mobile ? "8px" : "9px",
          fontWeight: 900,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Warehouse background PNG placeholder
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 3,
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "auto auto minmax(0, 1fr) auto",
          gap: mobile ? "8px" : dense ? "9px" : "12px",
          padding: mobile ? "9px" : dense ? "10px" : "13px",
        }}
      >
        <div
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: mobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: mobile ? "8px" : "9px",
                fontWeight: 950,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Milo Logistics Network
            </p>
            <div
              style={{
                marginTop: "2px",
                display: "flex",
                alignItems: "baseline",
                gap: "9px",
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: mobile ? "28px" : dense ? "30px" : "36px",
                  lineHeight: 1,
                  fontWeight: 400,
                }}
              >
                Cargo Rush
              </h2>
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: mobile ? "8px" : "9px",
                  fontWeight: 850,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Phase 4A · Results Online
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              style={{
                minHeight: mobile ? "34px" : "38px",
                padding: mobile ? "0 10px" : "0 13px",
                borderRadius: "999px",
                border: "1px solid rgba(131,224,255,0.22)",
                background: "rgba(6,22,40,0.76)",
                color: "#dff9ff",
                fontSize: mobile ? "9px" : "10px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ? How to Play
            </button>
            <button
              type="button"
              onClick={togglePause}
              disabled={!running}
              aria-label={paused ? "Resume Cargo Rush" : "Pause Cargo Rush"}
              title={!running ? "Start a run first" : paused ? "Resume run" : "Pause run"}
              style={{
                width: mobile ? "34px" : "38px",
                height: mobile ? "34px" : "38px",
                borderRadius: "999px",
                border: running
                  ? "1px solid rgba(137,231,255,0.25)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: running ? "rgba(86,213,255,0.08)" : "rgba(255,255,255,0.035)",
                color: running ? "#dff9ff" : "rgba(255,255,255,0.36)",
                fontWeight: 900,
                cursor: running ? "pointer" : "not-allowed",
              }}
            >
              {paused ? "▶" : "Ⅱ"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile
              ? "repeat(2, minmax(0,1fr))"
              : "repeat(4, minmax(0,1fr))",
            gap: mobile ? "6px" : "8px",
          }}
        >
          {[
            ["TIME", formattedTime, running ? (paused ? "Paused" : "Belts live") : "Run timer"],
            ["SCORE", score.toLocaleString(), "Live run score"],
            ["COMBO", "×1", "Phase 3A later"],
            ["RUN DT", "+0", "Phase 4B"],
          ].map(([label, value, sub]) => (
            <div key={label} style={hudTile}>
              <p
                style={{
                  margin: 0,
                  color: "rgba(162,234,255,0.52)",
                  fontSize: mobile ? "7px" : "8px",
                  fontWeight: 950,
                  letterSpacing: "0.13em",
                }}
              >
                {label}
              </p>
              <div
                style={{
                  marginTop: "2px",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "6px",
                }}
              >
                <strong
                  style={{
                    color: label === "COMBO" ? "#ffd66f" : "white",
                    fontSize: mobile ? "17px" : dense ? "19px" : "22px",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </strong>
                {!mobile && !veryCompact && (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.32)",
                      fontSize: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sub}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            ...glassPanel,
            borderRadius: mobile ? "12px" : "14px",
            padding: mobile ? "7px 9px" : "8px 11px",
            display: "grid",
            gridTemplateColumns: mobile ? "auto minmax(0,1fr)" : "auto minmax(0,1fr) auto",
            alignItems: "center",
            gap: mobile ? "8px" : "10px",
          }}
        >
          <div
            style={{
              padding: mobile ? "5px 8px" : "6px 10px",
              borderRadius: "999px",
              border: `1px solid ${rushStage.accent}55`,
              background: `${rushStage.accent}12`,
              color: rushStage.accent,
              fontSize: mobile ? "8px" : "9px",
              fontWeight: 950,
              letterSpacing: ".12em",
              whiteSpace: "nowrap",
              animation: running && rushStage.key === "rush" ? "cargoRushBadge .8s ease-in-out infinite" : undefined,
            }}
          >
            {running ? rushStage.label : "READY"}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                height: mobile ? "6px" : "7px",
                overflow: "hidden",
                borderRadius: "999px",
                background: "rgba(255,255,255,.055)",
                border: "1px solid rgba(255,255,255,.05)",
              }}
            >
              <div
                style={{
                  width: `${stageProgress}%`,
                  height: "100%",
                  borderRadius: "inherit",
                  background: `linear-gradient(90deg, #7de7ff, #8ff0c1 34%, #ffd66f 67%, #ff7f8d)`,
                  transition: "width 350ms linear",
                }}
              />
            </div>
            {!mobile && (
              <div
                style={{
                  marginTop: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "rgba(255,255,255,.28)",
                  fontSize: "7px",
                  fontWeight: 900,
                  letterSpacing: ".08em",
                }}
              >
                <span>CALM</span><span>BUSY</span><span>FAST</span><span>RUSH</span>
              </div>
            )}
          </div>

          {!mobile && (
            <span style={{ color: "rgba(255,255,255,.36)", fontSize: "8px", fontWeight: 850, whiteSpace: "nowrap" }}>
              {running ? `Belts ×${rushStage.speedMultiplier.toFixed(2)}` : "60-second run"}
            </span>
          )}
        </div>

        <div
          style={{
            minHeight: mobile ? "430px" : 0,
            display: "grid",
            gridTemplateRows: "minmax(0, 1fr) auto",
            gap: mobile ? "8px" : "10px",
          }}
        >
          <div
            style={{
              ...glassPanel,
              position: "relative",
              minHeight: 0,
              borderRadius: mobile ? "16px" : "22px",
              padding: mobile ? "9px" : dense ? "10px" : "13px",
              display: "grid",
              gridTemplateRows: "auto repeat(3, minmax(0, 1fr))",
              gap: mobile ? "6px" : "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#a7efff",
                    fontSize: mobile ? "8px" : "9px",
                    fontWeight: 950,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Incoming Cargo
                </p>
                {!mobile && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "9px",
                    }}
                  >
                    Tap cargo, then tap a bay · drag to a bay also works on desktop
                  </p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "5px", flexWrap: "wrap" }}>
                {running && (
                  <>
                    <span style={{ padding: "4px 7px", borderRadius: "999px", background: "rgba(115,239,176,.06)", color: "#89f3bd", fontSize: mobile ? "7px" : "8px", fontWeight: 900 }}>✓ {sortedCount}</span>
                    <span style={{ padding: "4px 7px", borderRadius: "999px", background: "rgba(255,108,120,.06)", color: "#ff9ba4", fontSize: mobile ? "7px" : "8px", fontWeight: 900 }}>× {wrongCount}</span>
                    <span style={{ padding: "4px 7px", borderRadius: "999px", background: "rgba(255,199,92,.06)", color: "#ffd273", fontSize: mobile ? "7px" : "8px", fontWeight: 900 }}>↗ {missedCount}</span>
                  </>
                )}
                <span
                  style={{
                    padding: "5px 8px",
                    borderRadius: "999px",
                    border: "1px solid rgba(115,239,176,0.18)",
                    background: "rgba(115,239,176,0.055)",
                    color: "#89f3bd",
                    fontSize: mobile ? "7px" : "8px",
                    fontWeight: 950,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {running ? (paused ? "Belts paused" : finalTen ? "FINAL 10" : `${rushStage.label} MODE`) : "Bay system online"}
                </span>
              </div>
            </div>

            {routeFeedback && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: "absolute",
                  left: mobile ? "10px" : "14px",
                  right: mobile ? "10px" : "14px",
                  top: mobile ? "47px" : "51px",
                  zIndex: 20,
                  minHeight: "36px",
                  padding: "7px 10px",
                  borderRadius: "11px",
                  border: `1px solid ${
                    routeFeedback.tone === "correct"
                      ? "rgba(112,240,176,.34)"
                      : routeFeedback.tone === "wrong"
                        ? "rgba(255,103,120,.34)"
                        : routeFeedback.tone === "missed"
                          ? "rgba(255,200,100,.34)"
                          : "rgba(126,232,255,.28)"
                  }`,
                  background:
                    routeFeedback.tone === "correct"
                      ? "rgba(19,75,57,.94)"
                      : routeFeedback.tone === "wrong"
                        ? "rgba(82,26,35,.94)"
                        : routeFeedback.tone === "missed"
                          ? "rgba(78,54,20,.94)"
                          : "rgba(16,47,68,.94)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  pointerEvents: "none",
                }}
              >
                <strong style={{ fontSize: mobile ? "9px" : "10px" }}>{routeFeedback.title}</strong>
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "rgba(255,255,255,.7)",
                    fontSize: mobile ? "8px" : "9px",
                  }}
                >
                  {routeFeedback.detail}
                </span>
              </div>
            )}

            {finalTen && (
              <div
                aria-live="polite"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: mobile ? "50px" : "54px",
                  transform: "translateX(-50%)",
                  zIndex: 18,
                  padding: mobile ? "5px 9px" : "6px 12px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,116,128,.45)",
                  background: "rgba(88,19,30,.88)",
                  color: "#ffdce0",
                  boxShadow: "0 0 28px rgba(255,70,90,.18)",
                  fontSize: mobile ? "8px" : "9px",
                  fontWeight: 950,
                  letterSpacing: ".12em",
                  whiteSpace: "nowrap",
                  animation: "cargoRushBadge .72s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              >
                FINAL {timeLeft} · RUSH MODE
              </div>
            )}

            {[0, 1, 2].map((lane) => {
              const lanePackages = packages.filter((item) => item.lane === lane);

              return (
                <div
                  key={lane}
                  className="cargo-belt-track"
                  style={{
                    position: "relative",
                    minHeight: mobile ? "80px" : dense ? "66px" : "76px",
                    overflow: "hidden",
                    borderRadius: mobile ? "12px" : "15px",
                    border: "1px solid rgba(145,226,255,0.12)",
                    backgroundColor: "rgba(1,9,20,0.76)",
                    boxShadow:
                      "inset 0 8px 22px rgba(0,0,0,0.35), inset 0 -2px 0 rgba(119,219,255,0.06)",
                    animationPlayState: running && !paused ? "running" : "paused",
                    animationDuration: `${rushStage.beltDuration}s`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: mobile ? "35px" : "42px",
                      zIndex: 4,
                      borderRight: "1px solid rgba(146,231,255,0.1)",
                      background: "rgba(6,22,40,0.92)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(180,239,255,0.38)",
                      fontSize: "8px",
                      fontWeight: 950,
                      writingMode: mobile ? "vertical-rl" : undefined,
                    }}
                  >
                    L{lane + 1}
                  </div>

                  {lanePackages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      draggable={!mobile && running && !paused}
                      aria-pressed={selectedPackageId === item.id}
                      aria-label={`${item.label} package moving on lane ${lane + 1}. ${selectedPackageId === item.id ? "Selected." : "Tap to select."}`}
                      onClick={() => selectPackage(item.id)}
                      onDragStart={(event) => {
                        if (!running || paused) {
                          event.preventDefault();
                          return;
                        }
                        setSelectedPackageId(item.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/cargo-package-id", String(item.id));
                      }}
                      style={{
                        position: "absolute",
                        left: `${item.x}%`,
                        top: "50%",
                        transform: selectedPackageId === item.id
                          ? "translate(-50%, -50%) scale(1.035)"
                          : "translate(-50%, -50%)",
                        width: mobile ? "104px" : dense ? "118px" : "136px",
                        minHeight: mobile ? "54px" : "58px",
                        borderRadius: "13px",
                        border: selectedPackageId === item.id
                          ? "1px solid rgba(255,214,111,0.82)"
                          : "1px solid rgba(255,255,255,0.13)",
                        background: selectedPackageId === item.id
                          ? "linear-gradient(145deg, rgba(64,55,29,0.98), rgba(17,21,31,0.99))"
                          : "linear-gradient(145deg, rgba(21,45,66,0.98), rgba(7,17,31,0.99))",
                        boxShadow: selectedPackageId === item.id
                          ? "0 0 0 2px rgba(255,210,99,.08), 0 15px 32px rgba(0,0,0,.38), 0 0 24px rgba(255,198,67,.16)"
                          : "0 12px 24px rgba(0,0,0,0.32)",
                        padding: mobile ? "6px 7px" : "8px 9px",
                        display: "grid",
                        gridTemplateColumns: mobile ? "30px minmax(0,1fr)" : "36px minmax(0,1fr)",
                        alignItems: "center",
                        gap: mobile ? "6px" : "8px",
                        color: "white",
                        textAlign: "left",
                        cursor: running && !paused ? (mobile ? "pointer" : "grab") : "default",
                        pointerEvents: running && !paused ? "auto" : "none",
                        zIndex: selectedPackageId === item.id ? 6 : 2,
                        willChange: "left, transform",
                        transition: "transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
                      }}
                    >
                      <div
                        aria-label="Package art placeholder"
                        style={{
                          width: mobile ? "30px" : "36px",
                          height: mobile ? "30px" : "36px",
                          borderRadius: "9px",
                          border: "1px dashed rgba(160,231,255,0.3)",
                          background: "rgba(112,214,255,0.05)",
                          display: "grid",
                          placeItems: "center",
                          color: "rgba(191,242,255,0.52)",
                          fontSize: "7px",
                          fontWeight: 950,
                          textAlign: "center",
                          lineHeight: 1.05,
                        }}
                      >
                        PNG
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            color: "rgba(152,230,255,0.52)",
                            fontSize: "7px",
                            fontWeight: 950,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {selectedPackageId === item.id ? "SELECTED" : "IN TRANSIT"}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: mobile ? "10px" : "12px",
                            fontWeight: 900,
                          }}
                        >
                          {item.label}
                        </p>
                      </div>
                    </button>
                  ))}

                  {!running && lanePackages.length === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        color: "rgba(160,229,255,0.24)",
                        fontSize: mobile ? "8px" : "9px",
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Awaiting cargo
                    </div>
                  )}

                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: mobile ? "10px" : "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgba(137,232,255,0.3)",
                      fontSize: mobile ? "18px" : "24px",
                      fontWeight: 400,
                      zIndex: 3,
                    }}
                  >
                    →
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: bayColumns,
              gap: mobile ? "6px" : "8px",
            }}
          >
            {CARGO_BAYS.map((bay) => {
              const pulse = bayPulse?.id === bay.id ? bayPulse.tone : null;
              return (
              <button
                key={bay.id}
                type="button"
                onClick={() => routeSelectedToBay(bay.id)}
                onDragOver={(event) => {
                  if (running && !paused) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const rawId = event.dataTransfer.getData("text/cargo-package-id");
                  const packageId = Number(rawId);
                  if (Number.isFinite(packageId)) routePackageToBay(packageId, bay.id);
                }}
                aria-label={`Route selected cargo to ${bay.title} bay`}
                style={{
                  position: "relative",
                  minHeight: mobile ? "82px" : dense ? "78px" : "88px",
                  overflow: "hidden",
                  borderRadius: mobile ? "13px" : "17px",
                  border: pulse === "correct"
                    ? "1px solid rgba(112,240,176,.86)"
                    : pulse === "wrong"
                      ? "1px solid rgba(255,104,119,.86)"
                      : `1px solid ${bay.accent}33`,
                  background: pulse === "correct"
                    ? "linear-gradient(180deg, rgba(25,79,61,.98), rgba(5,26,23,.98))"
                    : pulse === "wrong"
                      ? "linear-gradient(180deg, rgba(88,30,39,.98), rgba(30,9,16,.98))"
                      : "linear-gradient(180deg, rgba(11,27,43,0.94), rgba(5,12,27,0.98))",
                  boxShadow: pulse === "correct"
                    ? "0 0 28px rgba(112,240,176,.23), inset 0 0 30px rgba(112,240,176,.09)"
                    : pulse === "wrong"
                      ? "0 0 28px rgba(255,104,119,.2), inset 0 0 30px rgba(255,104,119,.08)"
                      : `inset 0 0 30px ${bay.accent}0d, 0 12px 28px rgba(0,0,0,.18)`,
                  padding: mobile ? "9px" : "10px 11px",
                  color: "white",
                  textAlign: "left",
                  cursor: running && !paused ? "pointer" : "default",
                  transform: pulse ? "translateY(-2px) scale(1.015)" : "none",
                  animation: pulse === "wrong" ? "cargoWrongShake 180ms ease-in-out 2" : undefined,
                  transition: "transform 150ms ease, border-color 150ms ease, background 150ms ease, box-shadow 150ms ease",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: "3px",
                    background: bay.accent,
                    opacity: 0.7,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "7px",
                  }}
                >
                  <div
                    style={{
                      width: mobile ? "30px" : "34px",
                      height: mobile ? "30px" : "34px",
                      flex: "0 0 auto",
                      borderRadius: "9px",
                      border: `1px dashed ${bay.accent}66`,
                      background: `${bay.accent}0d`,
                      color: `${bay.accent}bb`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: "7px",
                      fontWeight: 950,
                      textAlign: "center",
                    }}
                  >
                    ICON
                  </div>
                  <span
                    style={{
                      color: `${bay.accent}bb`,
                      fontSize: "7px",
                      fontWeight: 950,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {bay.code}
                  </span>
                </div>
                <p
                  style={{
                    margin: "7px 0 0",
                    color: "white",
                    fontSize: mobile ? "12px" : "13px",
                    fontWeight: 950,
                    lineHeight: 1,
                  }}
                >
                  {bay.title}
                </p>
                {!veryCompact && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "rgba(255,255,255,0.33)",
                      fontSize: "8px",
                    }}
                  >
                    {bay.hint}
                  </p>
                )}
              </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            ...glassPanel,
            borderRadius: mobile ? "14px" : "18px",
            padding: mobile ? "8px" : "9px 11px",
            display: "flex",
            alignItems: mobile ? "stretch" : "center",
            justifyContent: "space-between",
            flexDirection: mobile ? "column" : "row",
            gap: mobile ? "7px" : "12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.74)",
                fontSize: mobile ? "9px" : "10px",
                fontWeight: 850,
              }}
            >
              Tap a package, then tap its correct bay. On desktop, you can also drag cargo directly into a bay.
            </p>
            {!mobile && (
              <p
                style={{
                  margin: "3px 0 0",
                  color: "rgba(255,255,255,0.34)",
                  fontSize: "8px",
                }}
              >
                The warehouse accelerates through Calm, Busy, Fast and Rush. Score is now live; combo progression is still pending and DT rewards remain Phase 4B.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={startRun}
            style={{
              flex: "0 0 auto",
              minHeight: mobile ? "42px" : "44px",
              padding: mobile ? "0 18px" : "0 23px",
              borderRadius: "14px",
              border: "1px solid rgba(255,215,111,0.36)",
              background:
                "linear-gradient(135deg, rgba(255,206,82,0.98), rgba(246,166,59,0.94))",
              boxShadow: "0 12px 32px rgba(239,164,44,0.2)",
              color: "#201300",
              fontSize: mobile ? "11px" : "12px",
              fontWeight: 950,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {running ? "Restart Run" : timeLeft === 0 ? "Run Again" : "Start Run"}
          </button>
        </div>
      </div>

      {(showInstructions || showPreviewNotice) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: mobile ? "12px" : "24px",
            background: "rgba(1,5,13,0.8)",
            backdropFilter: "blur(9px)",
            WebkitBackdropFilter: "blur(9px)",
            overflowY: "auto",
          }}
          onClick={() => {
            if (showPreviewNotice) return;
            setShowInstructions(false);
          }}
        >
          <div
            style={{
              width: showPreviewNotice ? "min(720px, 100%)" : "min(560px, 100%)",
              borderRadius: mobile ? "20px" : "26px",
              border: "1px solid rgba(137,231,255,0.22)",
              background:
                "linear-gradient(150deg, rgba(10,31,53,0.99), rgba(3,11,25,0.99))",
              boxShadow: "0 34px 90px rgba(0,0,0,0.52)",
              padding: mobile ? "20px 16px" : "28px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "8px",
                fontWeight: 950,
                letterSpacing: "0.17em",
                textTransform: "uppercase",
              }}
            >
              Cargo Rush
            </p>
            <h3
              style={{
                margin: "7px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: mobile ? "28px" : "36px",
                fontWeight: 400,
              }}
            >
              {showPreviewNotice ? "Cargo Delivered" : "How to Play"}
            </h3>

            {showPreviewNotice ? (
              <div style={{ marginTop: mobile ? "15px" : "18px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: mobile ? "1fr" : "1.2fr .8fr",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "18px",
                      border: "1px solid rgba(255,211,103,.22)",
                      background: "linear-gradient(145deg, rgba(79,55,17,.34), rgba(18,20,29,.72))",
                      padding: mobile ? "16px" : "18px",
                    }}
                  >
                    <p style={{ margin: 0, color: "rgba(255,225,151,.62)", fontSize: "8px", fontWeight: 950, letterSpacing: ".16em" }}>
                      RUN SCORE
                    </p>
                    <div style={{ marginTop: "5px", display: "flex", alignItems: "baseline", gap: "9px", flexWrap: "wrap" }}>
                      <strong style={{ color: "#ffe19a", fontSize: mobile ? "38px" : "48px", lineHeight: 1 }}>
                        {score.toLocaleString()}
                      </strong>
                      <span style={{ color: "rgba(255,255,255,.38)", fontSize: "9px", fontWeight: 850 }}>
                        points
                      </span>
                    </div>
                    <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,.46)", fontSize: mobile ? "9px" : "10px", lineHeight: 1.5 }}>
                      Later Rush stages are worth more points. Wrong routes and missed cargo apply small score penalties.
                    </p>
                  </div>

                  <div
                    style={{
                      borderRadius: "18px",
                      border: "1px solid rgba(126,232,255,.16)",
                      background: "rgba(73,205,244,.055)",
                      padding: mobile ? "16px" : "18px",
                    }}
                  >
                    <p style={{ margin: 0, color: "rgba(167,239,255,.58)", fontSize: "8px", fontWeight: 950, letterSpacing: ".16em" }}>
                      ROUTING ACCURACY
                    </p>
                    <strong style={{ display: "block", marginTop: "5px", fontSize: mobile ? "32px" : "38px", lineHeight: 1, color: "white" }}>
                      {routingAccuracy}%
                    </strong>
                    <div style={{ marginTop: "10px", height: "7px", borderRadius: "999px", background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                      <div style={{ width: `${routingAccuracy}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg,#7de7ff,#8ff0c1)" }} />
                    </div>
                    <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.38)", fontSize: "9px" }}>
                      {sortedCount} correct · {wrongCount} wrong · {missedCount} missed
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    display: "grid",
                    gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))",
                    gap: "7px",
                  }}
                >
                  {[
                    ["DELIVERED", String(sortedCount), "#8ff0c1"],
                    ["WRONG ROUTES", String(wrongCount), "#ff9da6"],
                    ["MISSED", String(missedCount), "#ffd273"],
                    ["BEST STAGE", sortedCount > 0 ? bestStage.label : "—", sortedCount > 0 ? bestStage.accent : "#ffffff"],
                  ].map(([label, value, accent]) => (
                    <div
                      key={label}
                      style={{
                        minWidth: 0,
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,.08)",
                        background: "rgba(255,255,255,.035)",
                        padding: "11px",
                      }}
                    >
                      <p style={{ margin: 0, color: "rgba(255,255,255,.34)", fontSize: "7px", fontWeight: 950, letterSpacing: ".1em" }}>{label}</p>
                      <strong style={{ display: "block", marginTop: "4px", color: accent, fontSize: mobile ? "18px" : "20px", lineHeight: 1 }}>{value}</strong>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    borderRadius: "16px",
                    border: "1px solid rgba(126,232,255,.12)",
                    background: "rgba(1,9,20,.42)",
                    padding: mobile ? "12px" : "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ margin: 0, color: "#9aebff", fontSize: "8px", fontWeight: 950, letterSpacing: ".13em" }}>DELIVERIES BY STAGE</p>
                      <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,.34)", fontSize: "8px" }}>See where you handled the warehouse best.</p>
                    </div>
                    <span style={{ padding: "5px 8px", borderRadius: "999px", border: "1px solid rgba(255,214,111,.18)", color: "#ffd66f", background: "rgba(255,214,111,.05)", fontSize: "8px", fontWeight: 900 }}>
                      {rewardState === "awarded"
                        ? `+${awardedDt} DT awarded`
                        : rewardState === "awarding"
                          ? "Awarding DT…"
                          : rewardState === "guest"
                            ? "Log in to earn DT"
                            : rewardState === "failed"
                              ? "DT award failed"
                              : `+${runDtReward} DT`}
                    </span>
                  </div>
                  <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: mobile ? "5px" : "7px" }}>
                    {RUSH_STAGES.map((stage) => (
                      <div key={stage.key} style={{ minWidth: 0, textAlign: "center" }}>
                        <div style={{ height: mobile ? "44px" : "54px", borderRadius: "10px", border: `1px solid ${stage.accent}24`, background: `${stage.accent}0d`, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "6px" }}>
                          <div
                            style={{
                              width: "65%",
                              minHeight: "4px",
                              height: `${Math.min(100, Math.max(8, stageDeliveries[stage.key] * 11))}%`,
                              borderRadius: "7px 7px 4px 4px",
                              background: `linear-gradient(180deg, ${stage.accent}, ${stage.accent}66)`,
                            }}
                          />
                        </div>
                        <strong style={{ display: "block", marginTop: "5px", color: stage.accent, fontSize: mobile ? "14px" : "16px" }}>{stageDeliveries[stage.key]}</strong>
                        <span style={{ display: "block", marginTop: "2px", color: "rgba(255,255,255,.34)", fontSize: mobile ? "6px" : "7px", fontWeight: 900 }}>{stage.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,214,111,.2)",
                    background: "linear-gradient(135deg, rgba(255,205,82,.1), rgba(255,255,255,.025))",
                    padding: mobile ? "13px" : "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, color: "#ffd66f", fontSize: "8px", fontWeight: 950, letterSpacing: ".14em" }}>DREAM TOKEN REWARD</p>
                    <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.42)", fontSize: "9px", lineHeight: 1.45 }}>
                      Score earns about 1 DT per 200 points, with a small accuracy bonus at 80% and 90%.
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ display: "block", color: "#ffe19a", fontSize: mobile ? "26px" : "30px", lineHeight: 1 }}>
                      +{rewardState === "awarded" ? awardedDt : runDtReward} DT
                    </strong>
                    <span style={{ display: "block", marginTop: "4px", color: rewardState === "failed" ? "#ff9da6" : "rgba(255,255,255,.38)", fontSize: "8px", fontWeight: 850 }}>
                      {rewardState === "awarding"
                        ? "Adding to your balance…"
                        : rewardState === "awarded"
                          ? "Added to your Dream Token balance"
                          : rewardState === "guest"
                            ? "Sign in before a run to receive DT"
                            : rewardState === "failed"
                              ? "Could not add DT. Reopen results to retry."
                              : "Calculated from this run"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    display: "grid",
                    gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={startRun}
                    style={{
                      minHeight: "46px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,215,111,.38)",
                      background: "linear-gradient(135deg, rgba(255,206,82,.98), rgba(246,166,59,.94))",
                      color: "#201300",
                      fontSize: "11px",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Play Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreviewNotice(false)}
                    style={{
                      minHeight: "46px",
                      borderRadius: "14px",
                      border: "1px solid rgba(132,226,255,.2)",
                      background: "rgba(86,213,255,.07)",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Back to Warehouse
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    marginTop: "16px",
                    display: "grid",
                    gap: "9px",
                  }}
                >
                  {[
                    ["1", "Watch the lanes", "Packages enter automatically on three live conveyor lanes."],
                    ["2", "Select the cargo", "Tap a moving package. On desktop, you can also drag it directly."],
                    ["3", "Choose the bay", "Send each item to Food, Tech, Fashion or Energy. Wrong bays reject the package."],
                    ["4", "Do not miss it", "Cargo that reaches the end counts as missed. The warehouse gets faster every 15 seconds, ending in Rush mode."],
                  ].map(([num, title, body]) => (
                    <div
                      key={num}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "34px minmax(0,1fr)",
                        gap: "10px",
                        alignItems: "start",
                      }}
                    >
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          border: "1px solid rgba(137,231,255,0.2)",
                          background: "rgba(92,218,255,0.065)",
                          color: "#9aecff",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "11px",
                          fontWeight: 950,
                        }}
                      >
                        {num}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: mobile ? "11px" : "12px", fontWeight: 900 }}>{title}</p>
                        <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.45)", fontSize: mobile ? "10px" : "11px", lineHeight: 1.45 }}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstructions(false)}
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    marginTop: "20px",
                    borderRadius: "13px",
                    border: "1px solid rgba(132,226,255,0.22)",
                    background: "rgba(86,213,255,0.09)",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Back to Warehouse
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
