"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { supabase } from "@/lib/supabase";

type GamePhase = "intro" | "countdown" | "playing" | "result";

type Point = {
  x: number;
  y: number;
};

type MessTypeKey = "dusty-day" | "muddy-shoes" | "snack-attack" | "big-spill";

type MessDefinition = {
  key: MessTypeKey;
  title: string;
  subtitle: string;
  cleaningPower: number;
  patchCount: [number, number];
  patchRadiusX: [number, number];
  patchRadiusY: [number, number];
  footprintPairs: [number, number];
  crumbCount: [number, number];
  palette: string[];
};

type RugRushStats = {
  best_score: number;
  best_clean_percent: number;
  rounds_played: number;
  perfect_cleans: number;
  last_played_at: string | null;
};

type RecordResultRow = RugRushStats & {
  is_new_best_score: boolean;
  is_new_best_percent: boolean;
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;
const ROUND_DURATION_MS = 10_000;
const BRUSH_RADIUS = 34;
const SAMPLE_STEP = 2;
const PERFECT_CLEAN_PERCENT = 99.5;

const MESS_TYPES: MessDefinition[] = [
  {
    key: "dusty-day",
    title: "Dusty Day",
    subtitle: "A fine layer of space dust has settled everywhere.",
    cleaningPower: 0.22,
    patchCount: [24, 31],
    patchRadiusX: [34, 82],
    patchRadiusY: [22, 54],
    footprintPairs: [2, 4],
    crumbCount: [42, 66],
    palette: [
      "rgba(99, 103, 106, 0.68)",
      "rgba(116, 107, 92, 0.60)",
      "rgba(86, 91, 96, 0.62)",
      "rgba(134, 126, 106, 0.54)",
    ],
  },
  {
    key: "muddy-shoes",
    title: "Muddy Shoes",
    subtitle: "Someone tracked muddy footprints right across Nova's rug.",
    cleaningPower: 0.19,
    patchCount: [11, 16],
    patchRadiusX: [38, 78],
    patchRadiusY: [24, 56],
    footprintPairs: [8, 11],
    crumbCount: [18, 34],
    palette: [
      "rgba(91, 62, 42, 0.86)",
      "rgba(111, 73, 45, 0.78)",
      "rgba(77, 57, 44, 0.78)",
      "rgba(132, 88, 52, 0.70)",
    ],
  },
  {
    key: "snack-attack",
    title: "Snack Attack",
    subtitle: "Crumbs and little greasy marks are scattered all over the floor.",
    cleaningPower: 0.205,
    patchCount: [9, 14],
    patchRadiusX: [24, 54],
    patchRadiusY: [18, 40],
    footprintPairs: [1, 3],
    crumbCount: [155, 215],
    palette: [
      "rgba(133, 88, 48, 0.70)",
      "rgba(150, 111, 62, 0.66)",
      "rgba(106, 76, 49, 0.62)",
      "rgba(160, 126, 72, 0.58)",
    ],
  },
  {
    key: "big-spill",
    title: "Big Spill",
    subtitle: "A few huge stains need fast, repeated scrubbing.",
    cleaningPower: 0.17,
    patchCount: [5, 8],
    patchRadiusX: [82, 148],
    patchRadiusY: [52, 104],
    footprintPairs: [2, 4],
    crumbCount: [12, 25],
    palette: [
      "rgba(119, 72, 50, 0.84)",
      "rgba(92, 62, 49, 0.82)",
      "rgba(139, 83, 53, 0.76)",
      "rgba(82, 70, 62, 0.76)",
    ],
  },
];

function randomInt([min, max]: [number, number]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function chooseMessType(previous?: MessTypeKey | null) {
  const choices = previous ? MESS_TYPES.filter((mess) => mess.key !== previous) : MESS_TYPES;
  return choices[Math.floor(Math.random() * choices.length)] ?? MESS_TYPES[0];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function drawRugBase(context: CanvasRenderingContext2D) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Deep shadow beneath the rug.
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.58)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 16;
  roundedRectPath(context, 38, 30, CANVAS_WIDTH - 76, CANVAS_HEIGHT - 60, 66);
  context.fillStyle = "#061320";
  context.fill();
  context.restore();

  // Main woven navy surface.
  const base = context.createLinearGradient(70, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 48);
  base.addColorStop(0, "#11375a");
  base.addColorStop(0.42, "#0d2d4a");
  base.addColorStop(1, "#071d35");
  roundedRectPath(context, 38, 28, CANVAS_WIDTH - 76, CANVAS_HEIGHT - 64, 64);
  context.fillStyle = base;
  context.fill();

  context.save();
  roundedRectPath(context, 50, 40, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 88, 54);
  context.clip();

  // Subtle woven texture.
  context.globalAlpha = 0.12;
  context.lineWidth = 1;
  for (let y = 48; y < CANVAS_HEIGHT - 42; y += 8) {
    context.strokeStyle = y % 16 === 0 ? "#8cecff" : "#183e60";
    context.beginPath();
    context.moveTo(44, y);
    context.lineTo(CANVAS_WIDTH - 44, y + 4);
    context.stroke();
  }
  for (let x = 52; x < CANVAS_WIDTH - 48; x += 10) {
    context.strokeStyle = x % 20 === 0 ? "#7bdff6" : "#102f4d";
    context.beginPath();
    context.moveTo(x, 40);
    context.lineTo(x + 4, CANVAS_HEIGHT - 40);
    context.stroke();
  }

  // Soft centre glow.
  context.globalAlpha = 1;
  const glow = context.createRadialGradient(
    CANVAS_WIDTH * 0.5,
    CANVAS_HEIGHT * 0.49,
    22,
    CANVAS_WIDTH * 0.5,
    CANVAS_HEIGHT * 0.49,
    320,
  );
  glow.addColorStop(0, "rgba(45, 202, 229, 0.22)");
  glow.addColorStop(0.48, "rgba(28, 133, 176, 0.09)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.fillRect(50, 40, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 88);

  // Elegant inset frame.
  context.strokeStyle = "rgba(113, 226, 248, 0.48)";
  context.lineWidth = 5;
  roundedRectPath(context, 68, 58, CANVAS_WIDTH - 136, CANVAS_HEIGHT - 124, 43);
  context.stroke();

  context.strokeStyle = "rgba(176, 245, 255, 0.16)";
  context.lineWidth = 2;
  roundedRectPath(context, 82, 72, CANVAS_WIDTH - 164, CANVAS_HEIGHT - 152, 36);
  context.stroke();

  // Nova-inspired orbital arcs.
  context.save();
  context.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  context.strokeStyle = "rgba(92, 220, 246, 0.16)";
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(0, 0, 250, 112, -0.12, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(0, 0, 206, 82, 0.16, 0, Math.PI * 2);
  context.stroke();

  // Central eight-point Nova star / compass mark.
  const outerRadius = 76;
  const innerRadius = 31;
  context.beginPath();
  for (let i = 0; i < 16; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (i * Math.PI) / 8;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  const starFill = context.createRadialGradient(0, 0, 8, 0, 0, outerRadius);
  starFill.addColorStop(0, "rgba(155, 244, 255, 0.32)");
  starFill.addColorStop(0.5, "rgba(56, 199, 228, 0.22)");
  starFill.addColorStop(1, "rgba(20, 100, 142, 0.08)");
  context.fillStyle = starFill;
  context.fill();
  context.strokeStyle = "rgba(147, 239, 255, 0.44)";
  context.lineWidth = 2.5;
  context.stroke();

  context.beginPath();
  context.arc(0, 0, 17, 0, Math.PI * 2);
  context.fillStyle = "rgba(163, 244, 255, 0.26)";
  context.fill();
  context.strokeStyle = "rgba(196, 250, 255, 0.55)";
  context.lineWidth = 2;
  context.stroke();

  // Small constellation dots around the centre.
  const dots = [
    [-292, -112, 4],
    [-250, 126, 3],
    [-165, -146, 3],
    [175, -140, 4],
    [262, -88, 3],
    [294, 116, 4],
    [194, 145, 3],
    [-304, 72, 2.5],
  ] as const;
  context.fillStyle = "rgba(157, 239, 255, 0.55)";
  dots.forEach(([x, y, radius]) => {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();

  context.restore();

  // Cyan edge piping and short tassel marks.
  context.save();
  context.shadowColor = "rgba(71, 221, 249, 0.35)";
  context.shadowBlur = 16;
  context.strokeStyle = "rgba(111, 230, 250, 0.58)";
  context.lineWidth = 4;
  roundedRectPath(context, 38, 28, CANVAS_WIDTH - 76, CANVAS_HEIGHT - 64, 64);
  context.stroke();
  context.restore();

  context.strokeStyle = "rgba(89, 199, 225, 0.34)";
  context.lineWidth = 3;
  for (let x = 120; x <= CANVAS_WIDTH - 120; x += 55) {
    context.beginPath();
    context.moveTo(x, CANVAS_HEIGHT - 34);
    context.lineTo(x + (x % 2 === 0 ? 5 : -5), CANVAS_HEIGHT - 20);
    context.stroke();
  }
}
function drawFootprint(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  scale: number,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(scale, scale);

  context.fillStyle = "rgba(92, 68, 48, 0.86)";
  context.beginPath();
  context.ellipse(0, 14, 17, 30, 0, 0, Math.PI * 2);
  context.fill();

  const toePositions = [
    [-17, -17, 6],
    [-7, -24, 7],
    [5, -26, 7],
    [16, -22, 6],
  ] as const;

  toePositions.forEach(([toeX, toeY, radius]) => {
    context.beginPath();
    context.arc(toeX, toeY, radius, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function drawMess(
  normalContext: CanvasRenderingContext2D,
  toughContext: CanvasRenderingContext2D,
  extraToughContext: CanvasRenderingContext2D,
  mess: MessDefinition,
) {
  [normalContext, toughContext, extraToughContext].forEach((context) => {
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.save();
    roundedRectPath(context, 48, 40, CANVAS_WIDTH - 96, CANVAS_HEIGHT - 80, 46);
    context.clip();
  });

  const patchCount = randomInt(mess.patchCount);
  for (let i = 0; i < patchCount; i += 1) {
    const edgeBias = i < Math.ceil(patchCount * 0.28);
    const x = edgeBias
      ? (Math.random() < 0.5 ? 76 + Math.random() * 76 : CANVAS_WIDTH - 152 + Math.random() * 76)
      : 100 + Math.random() * (CANVAS_WIDTH - 200);
    const y = edgeBias
      ? (Math.random() < 0.5 ? 68 + Math.random() * 70 : CANVAS_HEIGHT - 138 + Math.random() * 70)
      : 88 + Math.random() * (CANVAS_HEIGHT - 176);
    const radiusX = mess.patchRadiusX[0] + Math.random() * (mess.patchRadiusX[1] - mess.patchRadiusX[0]);
    const radiusY = mess.patchRadiusY[0] + Math.random() * (mess.patchRadiusY[1] - mess.patchRadiusY[0]);
    const rotation = Math.random() * Math.PI;
    const paletteColour = mess.palette[Math.floor(Math.random() * mess.palette.length)];

    normalContext.save();
    normalContext.translate(x, y);
    normalContext.rotate(rotation);
    const stain = normalContext.createRadialGradient(0, 0, 3, 0, 0, Math.max(radiusX, radiusY));
    stain.addColorStop(0, paletteColour);
    stain.addColorStop(0.58, mess.key === "dusty-day" ? "rgba(104, 100, 88, 0.46)" : "rgba(86, 63, 43, 0.58)");
    stain.addColorStop(1, "rgba(90, 70, 50, 0)");
    normalContext.fillStyle = stain;
    normalContext.beginPath();
    normalContext.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    normalContext.fill();
    normalContext.restore();

    // Every stain has a smaller stubborn centre that needs repeated passes.
    toughContext.save();
    toughContext.translate(x, y);
    toughContext.rotate(rotation);
    const coreRadiusX = radiusX * (mess.key === "dusty-day" ? 0.30 : 0.42);
    const coreRadiusY = radiusY * (mess.key === "dusty-day" ? 0.30 : 0.42);
    const coreGradient = toughContext.createRadialGradient(0, 0, 2, 0, 0, Math.max(coreRadiusX, coreRadiusY));
    coreGradient.addColorStop(0, mess.key === "dusty-day" ? "rgba(83, 81, 75, 0.58)" : "rgba(73, 48, 34, 0.82)");
    coreGradient.addColorStop(0.72, mess.key === "dusty-day" ? "rgba(95, 91, 82, 0.38)" : "rgba(90, 58, 38, 0.56)");
    coreGradient.addColorStop(1, "rgba(70, 48, 34, 0)");
    toughContext.fillStyle = coreGradient;
    toughContext.beginPath();
    toughContext.ellipse(0, 0, coreRadiusX, coreRadiusY, 0, 0, Math.PI * 2);
    toughContext.fill();
    toughContext.restore();

    if (mess.key === "big-spill") {
      // Big Spill gets an extra-resistance centre so the player must genuinely scrub it.
      extraToughContext.save();
      extraToughContext.translate(x, y);
      extraToughContext.rotate(rotation);
      const hardX = radiusX * 0.22;
      const hardY = radiusY * 0.22;
      const hardCore = extraToughContext.createRadialGradient(0, 0, 1, 0, 0, Math.max(hardX, hardY));
      hardCore.addColorStop(0, "rgba(67, 43, 31, 0.94)");
      hardCore.addColorStop(0.66, "rgba(82, 50, 33, 0.72)");
      hardCore.addColorStop(1, "rgba(82, 50, 33, 0)");
      extraToughContext.fillStyle = hardCore;
      extraToughContext.beginPath();
      extraToughContext.ellipse(0, 0, hardX, hardY, 0, 0, Math.PI * 2);
      extraToughContext.fill();
      extraToughContext.restore();
    }
  }

  // Footprints live on the tougher layer, so a single sweep will not erase them.
  const footprintPairs = randomInt(mess.footprintPairs);
  for (let i = 0; i < footprintPairs; i += 1) {
    const baseX = 112 + Math.random() * (CANVAS_WIDTH - 224);
    const baseY = 104 + Math.random() * (CANVAS_HEIGHT - 208);
    const direction = Math.random() * Math.PI * 2;
    const stepX = Math.cos(direction) * 58;
    const stepY = Math.sin(direction) * 58;
    drawFootprint(toughContext, baseX, baseY, direction + 0.3, 0.72 + Math.random() * 0.28);
    drawFootprint(toughContext, baseX + stepX, baseY + stepY, direction - 0.3, 0.72 + Math.random() * 0.28);
  }

  const crumbCount = randomInt(mess.crumbCount);
  for (let i = 0; i < crumbCount; i += 1) {
    // About one third of crumbs are deliberately close to the rug edge so the last few percent need accuracy.
    const edgeCrumb = i < Math.ceil(crumbCount * 0.34);
    const x = edgeCrumb
      ? (Math.random() < 0.5 ? 62 + Math.random() * 56 : CANVAS_WIDTH - 118 + Math.random() * 56)
      : 76 + Math.random() * (CANVAS_WIDTH - 152);
    const y = edgeCrumb
      ? (Math.random() < 0.5 ? 58 + Math.random() * 48 : CANVAS_HEIGHT - 106 + Math.random() * 48)
      : 68 + Math.random() * (CANVAS_HEIGHT - 136);
    const radius = mess.key === "snack-attack" ? 2.5 + Math.random() * 6.5 : 2 + Math.random() * 5;
    normalContext.fillStyle = i % 3 === 0 ? "rgba(222, 170, 91, 0.92)" : "rgba(126, 88, 54, 0.84)";
    normalContext.beginPath();
    normalContext.arc(x, y, radius, 0, Math.PI * 2);
    normalContext.fill();
  }

  [normalContext, toughContext, extraToughContext].forEach((context) => context.restore());
}

function compositeFrame(
  display: HTMLCanvasElement,
  rug: HTMLCanvasElement,
  dirt: HTMLCanvasElement,
  toughDirt: HTMLCanvasElement,
  extraToughDirt: HTMLCanvasElement,
  highlightRemaining = false,
) {
  const context = display.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.drawImage(rug, 0, 0);

  if (highlightRemaining) {
    const pulse = (Math.sin(performance.now() / 115) + 1) / 2;
    context.save();
    context.filter = `brightness(${1.08 + pulse * 0.16}) saturate(${1.08 + pulse * 0.18})`;
    context.shadowColor = `rgba(251,191,36,${0.16 + pulse * 0.16})`;
    context.shadowBlur = 5 + pulse * 8;
    context.drawImage(dirt, 0, 0);
    context.drawImage(toughDirt, 0, 0);
    context.drawImage(extraToughDirt, 0, 0);
    context.restore();
  } else {
    context.drawImage(dirt, 0, 0);
    context.drawImage(toughDirt, 0, 0);
    context.drawImage(extraToughDirt, 0, 0);
  }
}

function measureDirtMass(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return 0;
  const image = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
  let mass = 0;

  for (let y = 0; y < CANVAS_HEIGHT; y += SAMPLE_STEP) {
    for (let x = 0; x < CANVAS_WIDTH; x += SAMPLE_STEP) {
      mass += image[(y * CANVAS_WIDTH + x) * 4 + 3];
    }
  }

  return mass;
}

function measureTotalDirtMass(canvases: Array<HTMLCanvasElement | null>) {
  return canvases.reduce((total, canvas) => total + (canvas ? measureDirtMass(canvas) : 0), 0);
}

function starCountForPercent(percent: number) {
  if (percent >= 80) return 3;
  if (percent >= 60) return 2;
  return 1;
}

function resultLabel(percent: number) {
  if (percent >= PERFECT_CLEAN_PERCENT) return "Perfect Clean!";
  if (percent >= 95) return "Almost Perfect!";
  if (percent >= 80) return "Sparkling Work!";
  if (percent >= 60) return "Much Better!";
  return "Keep Scrubbing!";
}

export default function RugRushGame({ onClose }: { onClose: () => void }) {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const surfaceHostRef = useRef<HTMLDivElement | null>(null);
  const rugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dirtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const toughDirtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const extraToughDirtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStartedAtRef = useRef(0);
  const initialDirtMassRef = useRef(1);
  const previousDirtMassRef = useRef(1);
  const cleanPercentRef = useRef(0);
  const scoreRef = useRef(0);
  const comboHitsRef = useRef(0);
  const comboMultiplierRef = useRef(1);
  const maxComboRef = useRef(1);
  const lastCleanAtRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const lastMeasureAtRef = useRef(0);
  const finishedRef = useRef(false);
  const currentMessRef = useRef<MessDefinition>(MESS_TYPES[0]);
  const lastMessKeyRef = useRef<MessTypeKey | null>(null);
  const lastScrubAtRef = useRef(0);

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION_MS);
  const [cleanPercent, setCleanPercent] = useState(0);
  const [score, setScore] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  const [currentMess, setCurrentMess] = useState<MessDefinition>(MESS_TYPES[0]);
  const [brushPoint, setBrushPoint] = useState<Point | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 1, height: 1 });
  const [phonePortrait, setPhonePortrait] = useState(false);
  const [stats, setStats] = useState<RugRushStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [newBestScore, setNewBestScore] = useState(false);
  const [newBestPercent, setNewBestPercent] = useState(false);
  const [roundBonus, setRoundBonus] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px) and (orientation: portrait)");
    const sync = () => setPhonePortrait(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setStatsLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (!cancelled) setStatsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("nova_home_rug_rush_stats")
        .select("best_score,best_clean_percent,rounds_played,perfect_cleans,last_played_at")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) {
          setStats({
            best_score: Number(data.best_score ?? 0),
            best_clean_percent: Number(data.best_clean_percent ?? 0),
            rounds_played: Number(data.rounds_played ?? 0),
            perfect_cleans: Number(data.perfect_cleans ?? 0),
            last_played_at: data.last_played_at ? String(data.last_played_at) : null,
          });
        }
        setStatsLoading(false);
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = surfaceHostRef.current;
    if (!host) return;

    const fit = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
      setSurfaceSize({
        width: Math.max(1, Math.floor(CANVAS_WIDTH * scale)),
        height: Math.max(1, Math.floor(CANVAS_HEIGHT * scale)),
      });
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    window.addEventListener("orientationchange", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", fit);
    };
  }, []);

  const renderFrame = useCallback((highlightRemaining = false) => {
    const display = displayCanvasRef.current;
    const rug = rugCanvasRef.current;
    const dirt = dirtCanvasRef.current;
    const toughDirt = toughDirtCanvasRef.current;
    const extraToughDirt = extraToughDirtCanvasRef.current;
    if (!display || !rug || !dirt || !toughDirt || !extraToughDirt) return;
    compositeFrame(display, rug, dirt, toughDirt, extraToughDirt, highlightRemaining);
  }, []);

  const measureProgress = useCallback((force = false) => {
    const dirt = dirtCanvasRef.current;
    const toughDirt = toughDirtCanvasRef.current;
    const extraToughDirt = extraToughDirtCanvasRef.current;
    if (!dirt || !toughDirt || !extraToughDirt) {
      return {
        percent: cleanPercentRef.current,
        nextScore: scoreRef.current,
        multiplier: comboMultiplierRef.current,
      };
    }

    const now = performance.now();
    if (!force && now - lastMeasureAtRef.current < 78) {
      return {
        percent: cleanPercentRef.current,
        nextScore: scoreRef.current,
        multiplier: comboMultiplierRef.current,
      };
    }

    lastMeasureAtRef.current = now;
    const remainingMass = measureTotalDirtMass([dirt, toughDirt, extraToughDirt]);
    const initialMass = Math.max(1, initialDirtMassRef.current);
    const removedMass = Math.max(0, previousDirtMassRef.current - remainingMass);
    previousDirtMassRef.current = remainingMass;

    const percent = clamp((1 - remainingMass / initialMass) * 100, 0, 100);
    cleanPercentRef.current = percent;

    const meaningfulRemoval = removedMass >= initialMass * 0.00012;
    if (meaningfulRemoval) {
      if (lastCleanAtRef.current > 0 && now - lastCleanAtRef.current <= 430) {
        comboHitsRef.current += 1;
      } else {
        comboHitsRef.current = 1;
      }
      lastCleanAtRef.current = now;

      const tier = Math.min(4, Math.floor((comboHitsRef.current - 1) / 4));
      const multiplier = 1 + tier * 0.25;
      comboMultiplierRef.current = multiplier;
      maxComboRef.current = Math.max(maxComboRef.current, multiplier);

      const basePoints = Math.max(1, Math.round((removedMass / initialMass) * 10_000));
      scoreRef.current += Math.round(basePoints * multiplier);
    } else if (lastCleanAtRef.current > 0 && now - lastCleanAtRef.current > 620) {
      comboHitsRef.current = 0;
      comboMultiplierRef.current = 1;
    }

    setCleanPercent(percent);
    setScore(scoreRef.current);
    setComboMultiplier(comboMultiplierRef.current);
    setMaxCombo(maxComboRef.current);

    return {
      percent,
      nextScore: scoreRef.current,
      multiplier: comboMultiplierRef.current,
    };
  }, []);

  const prepareRound = useCallback(() => {
    const display = displayCanvasRef.current;
    if (!display) return;

    const mess = chooseMessType(lastMessKeyRef.current);
    lastMessKeyRef.current = mess.key;
    currentMessRef.current = mess;
    setCurrentMess(mess);

    const rug = document.createElement("canvas");
    rug.width = CANVAS_WIDTH;
    rug.height = CANVAS_HEIGHT;
    const rugContext = rug.getContext("2d");
    if (!rugContext) return;
    drawRugBase(rugContext);

    const dirt = document.createElement("canvas");
    dirt.width = CANVAS_WIDTH;
    dirt.height = CANVAS_HEIGHT;
    const dirtContext = dirt.getContext("2d", { willReadFrequently: true });
    if (!dirtContext) return;

    const toughDirt = document.createElement("canvas");
    toughDirt.width = CANVAS_WIDTH;
    toughDirt.height = CANVAS_HEIGHT;
    const toughDirtContext = toughDirt.getContext("2d", { willReadFrequently: true });
    if (!toughDirtContext) return;

    const extraToughDirt = document.createElement("canvas");
    extraToughDirt.width = CANVAS_WIDTH;
    extraToughDirt.height = CANVAS_HEIGHT;
    const extraToughDirtContext = extraToughDirt.getContext("2d", { willReadFrequently: true });
    if (!extraToughDirtContext) return;

    drawMess(dirtContext, toughDirtContext, extraToughDirtContext, mess);

    rugCanvasRef.current = rug;
    dirtCanvasRef.current = dirt;
    toughDirtCanvasRef.current = toughDirt;
    extraToughDirtCanvasRef.current = extraToughDirt;
    initialDirtMassRef.current = Math.max(1, measureTotalDirtMass([dirt, toughDirt, extraToughDirt]));
    previousDirtMassRef.current = initialDirtMassRef.current;
    cleanPercentRef.current = 0;
    scoreRef.current = 0;
    comboHitsRef.current = 0;
    comboMultiplierRef.current = 1;
    maxComboRef.current = 1;
    lastCleanAtRef.current = 0;
    lastMeasureAtRef.current = 0;
    lastScrubAtRef.current = 0;
    activePointerIdRef.current = null;
    lastPointRef.current = null;
    finishedRef.current = false;

    setBrushPoint(null);
    setCleanPercent(0);
    setScore(0);
    setComboMultiplier(1);
    setMaxCombo(1);
    setRoundBonus(0);
    setTimeLeftMs(ROUND_DURATION_MS);
    setSaveStatus("idle");
    setNewBestScore(false);
    setNewBestPercent(false);
    renderFrame();
  }, [renderFrame]);

  useEffect(() => {
    const display = displayCanvasRef.current;
    if (!display) return;
    display.width = CANVAS_WIDTH;
    display.height = CANVAS_HEIGHT;
    prepareRound();
  }, [prepareRound]);

  const recordResult = useCallback(async (finalScore: number, percent: number) => {
    setSaveStatus("saving");

    const { data, error } = await supabase.rpc("record_nova_home_rug_rush_result", {
      p_score: finalScore,
      p_clean_percent: Number(percent.toFixed(2)),
    });

    if (error) {
      console.error("Could not save Rug Rush result", error);
      setSaveStatus("error");
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as RecordResultRow | null;
    if (!row) {
      setSaveStatus("error");
      return;
    }

    setStats({
      best_score: Number(row.best_score ?? 0),
      best_clean_percent: Number(row.best_clean_percent ?? 0),
      rounds_played: Number(row.rounds_played ?? 0),
      perfect_cleans: Number(row.perfect_cleans ?? 0),
      last_played_at: row.last_played_at ? String(row.last_played_at) : null,
    });
    setNewBestScore(Boolean(row.is_new_best_score));
    setNewBestPercent(Boolean(row.is_new_best_percent));
    setSaveStatus("saved");
  }, []);

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    activePointerIdRef.current = null;
    lastPointRef.current = null;
    setBrushPoint(null);
    setTimeLeftMs(0);

    const measured = measureProgress(true);
    let bonus = 0;
    if (measured.percent >= PERFECT_CLEAN_PERCENT) bonus = 1500;
    else if (measured.percent >= 95) bonus = 900;
    else if (measured.percent >= 80) bonus = 400;

    const finalScore = measured.nextScore + bonus;
    scoreRef.current = finalScore;
    setScore(finalScore);
    setRoundBonus(bonus);
    setPhase("result");
    void recordResult(finalScore, measured.percent);
  }, [measureProgress, recordResult]);

  useEffect(() => {
    if (phase !== "countdown") return;

    setCountdown(3);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const next = 3 - Math.floor(elapsed / 1000);

      if (next <= 0) {
        window.clearInterval(timer);
        gameStartedAtRef.current = performance.now();
        setTimeLeftMs(ROUND_DURATION_MS);
        setPhase("playing");
        return;
      }

      setCountdown(next);
    }, 60);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;

    let frameId = 0;
    const tick = () => {
      const elapsed = performance.now() - gameStartedAtRef.current;
      const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
      setTimeLeftMs(remaining);

      if (lastCleanAtRef.current > 0 && performance.now() - lastCleanAtRef.current > 620 && comboMultiplierRef.current !== 1) {
        comboHitsRef.current = 0;
        comboMultiplierRef.current = 1;
        setComboMultiplier(1);
      }

      if (remaining <= 0) {
        finishRound();
        return;
      }

      // In the final three seconds, gently pulse the remaining dirt so players can spot missed corners.
      if (remaining <= 3000) renderFrame(true);

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [finishRound, phase, renderFrame]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function startRound() {
    prepareRound();
    setPhase("countdown");
  }

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH, 0, CANVAS_WIDTH),
      y: clamp(((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT, 0, CANVAS_HEIGHT),
    };
  }

  function cleanBetween(from: Point, to: Point) {
    const dirt = dirtCanvasRef.current;
    const toughDirt = toughDirtCanvasRef.current;
    const extraToughDirt = extraToughDirtCanvasRef.current;
    if (!dirt || !toughDirt || !extraToughDirt) return;

    const now = performance.now();
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const elapsedMs = lastScrubAtRef.current > 0 ? Math.max(16, now - lastScrubAtRef.current) : 32;
    lastScrubAtRef.current = now;
    const speedPxPerSecond = (distance / elapsedMs) * 1000;

    // Rug Rush rewards actual scrubbing rather than one huge frantic sweep.
    // Normal hand movement stays strong; very fast swipes lose cleaning power.
    let speedFactor = 1;
    if (speedPxPerSecond > 1700) speedFactor = 0.34;
    else if (speedPxPerSecond > 1250) speedFactor = 0.48;
    else if (speedPxPerSecond > 900) speedFactor = 0.64;
    else if (speedPxPerSecond > 650) speedFactor = 0.82;
    else if (speedPxPerSecond < 55 && distance > 0) speedFactor = 0.9;

    const basePower = currentMessRef.current.cleaningPower * speedFactor;

    const eraseLayer = (canvas: HTMLCanvasElement, resistanceMultiplier: number) => {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      const cleaningPower = clamp(basePower * resistanceMultiplier, 0.025, 0.32);

      context.save();
      context.globalCompositeOperation = "destination-out";
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = BRUSH_RADIUS * 1.32;
      context.strokeStyle = `rgba(0,0,0,${cleaningPower})`;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();

      const gradient = context.createRadialGradient(
        to.x,
        to.y,
        BRUSH_RADIUS * 0.14,
        to.x,
        to.y,
        BRUSH_RADIUS,
      );
      gradient.addColorStop(0, `rgba(0,0,0,${Math.min(0.40, cleaningPower + 0.075)})`);
      gradient.addColorStop(0.62, `rgba(0,0,0,${Math.max(0.025, cleaningPower - 0.04)})`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(to.x, to.y, BRUSH_RADIUS, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    // Easy dirt, tougher footprints/stain centres, then the hardest spill cores.
    eraseLayer(dirt, 1);
    eraseLayer(toughDirt, 0.52);
    eraseLayer(extraToughDirt, 0.28);

    renderFrame(timeLeftMs <= 3000);
    measureProgress();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (phase !== "playing") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    const point = canvasPoint(event);
    lastPointRef.current = point;
    setBrushPoint(point);
    cleanBetween(point, point);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    setBrushPoint(point);

    if (phase !== "playing" || activePointerIdRef.current !== event.pointerId) return;
    const previous = lastPointRef.current ?? point;
    cleanBetween(previous, point);
    lastPointRef.current = point;
  }

  function releasePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (activePointerIdRef.current === event.pointerId) {
      activePointerIdRef.current = null;
      lastPointRef.current = null;
      lastScrubAtRef.current = 0;
    }
  }

  const roundedSeconds = Math.ceil(timeLeftMs / 1000);
  const stars = starCountForPercent(cleanPercent);
  const bestScore = stats?.best_score ?? 0;
  const bestPercent = stats?.best_clean_percent ?? 0;

  return (
    <div className="fixed inset-0 z-[120] flex h-[100dvh] w-[100vw] items-center justify-center overflow-hidden bg-slate-950/86 p-1.5 backdrop-blur-md sm:p-3">
      <div className="grid h-full max-h-[920px] w-full max-w-[1180px] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-cyan-200/25 bg-[#03101d] shadow-[0_36px_110px_rgba(0,0,0,0.72)] sm:rounded-[30px]">
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-slate-950/55 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/60">Nova Home Minigame</p>
              <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/70">10 Seconds</span>
              <span className="rounded-full border border-violet-200/18 bg-violet-300/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/75">{currentMess.title}</span>
            </div>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Rug Rush</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-xl text-white/80 transition hover:bg-white/[0.1]"
            aria-label="Close Rug Rush"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <HudCard label="Score" value={score.toLocaleString()} highlight={phase === "playing" && comboMultiplier > 1} />
            <HudCard label="Cleaned" value={`${cleanPercent.toFixed(0)}%`} />
            <HudCard label="Combo" value={`×${comboMultiplier.toFixed(2).replace(/\.00$/, "")}`} highlight={comboMultiplier > 1} />
            <HudCard label="Time" value={phase === "intro" ? "10" : roundedSeconds.toString()} urgent={phase === "playing" && timeLeftMs <= 3000} />
          </div>

          <div ref={surfaceHostRef} className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-[20px] border border-cyan-200/14 bg-[radial-gradient(circle_at_50%_45%,rgba(55,190,226,0.11),transparent_50%),linear-gradient(180deg,#071a2a,#020914)] p-1.5 sm:rounded-[26px] sm:p-2">
            <div
              className="relative shrink-0 overflow-hidden rounded-[18px] shadow-[0_28px_64px_rgba(0,0,0,0.48)] sm:rounded-[24px]"
              style={{ width: `${surfaceSize.width}px`, height: `${surfaceSize.height}px` }}
            >
              <canvas
                ref={displayCanvasRef}
                className={`h-full w-full select-none ${phase === "playing" ? "cursor-none" : "cursor-default"}`}
                style={{ touchAction: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                onPointerLeave={(event) => {
                  if (activePointerIdRef.current !== event.pointerId) setBrushPoint(null);
                }}
                aria-label="Rug Rush cleaning surface"
              />

              {phase === "playing" && brushPoint && (
                <div
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${(brushPoint.x / CANVAS_WIDTH) * 100}%`,
                    top: `${(brushPoint.y / CANVAS_HEIGHT) * 100}%`,
                  }}
                >
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-100/70 bg-cyan-200/[0.08] shadow-[0_0_22px_rgba(103,232,249,0.48),inset_0_0_14px_rgba(103,232,249,0.18)]" />
                    <div className="absolute inset-[20%] rounded-full border border-white/40 bg-slate-950/50" />
                    <div className="absolute left-1/2 top-1/2 h-[2px] w-[46%] -translate-x-1/2 -translate-y-1/2 bg-cyan-100/70" />
                  </div>
                </div>
              )}

              {phase === "playing" && comboMultiplier > 1 && (
                <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-cyan-200/24 bg-slate-950/78 px-3 py-1.5 text-sm font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)] sm:text-base">
                  CLEAN STREAK ×{comboMultiplier.toFixed(2).replace(/\.00$/, "")}
                </div>
              )}

              {phase === "intro" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/52 p-3 backdrop-blur-[2px] sm:p-4">
                  <div className="w-[min(560px,94%)] rounded-[22px] border border-cyan-200/24 bg-slate-950/90 p-4 text-center shadow-[0_24px_60px_rgba(0,0,0,0.54)] sm:rounded-[24px] sm:p-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.17em] text-cyan-200/62">Nova needs your help</p>
                    <h3 className="mt-1.5 text-2xl font-black text-white sm:text-3xl">Clean the rug before time runs out!</h3>
                    <p className="mx-auto mt-2.5 max-w-md text-xs leading-5 text-white/58 sm:text-sm sm:leading-6">
                      Every round brings a different mess. Scrub back and forth over stubborn marks, keep your movement controlled, and build a combo while you remove new dirt.
                    </p>

                    <div className="mt-3 rounded-[16px] border border-violet-200/16 bg-violet-300/[0.055] px-4 py-3 text-left">
                      <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/55">This round</p>
                      <p className="mt-0.5 text-sm font-black text-white">{currentMess.title}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-white/48 sm:text-xs">{currentMess.subtitle}</p>
                    </div>

                    <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2 text-left">
                      <MiniRule number="1" text="Scrub back and forth — don’t just swipe" />
                      <MiniRule number="2" text="99.5%+ earns a Perfect Clean" />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <StatPill label="Best Score" value={statsLoading ? "…" : bestScore.toLocaleString()} />
                      <StatPill label="Best Clean" value={statsLoading ? "…" : `${bestPercent.toFixed(1)}%`} />
                    </div>

                    <button
                      type="button"
                      onClick={startRound}
                      className="mt-4 min-h-11 w-full rounded-full bg-cyan-300 px-6 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200"
                    >
                      Start Rug Rush
                    </button>
                  </div>
                </div>
              )}

              {phase === "countdown" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/44 backdrop-blur-[1px]">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/72">{currentMess.title}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/60">Get Ready</p>
                    <div className="mt-1 text-[88px] font-black leading-none text-white drop-shadow-[0_0_28px_rgba(103,232,249,0.6)] sm:text-[120px]">{countdown}</div>
                  </div>
                </div>
              )}

              {phase === "result" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/62 p-3 backdrop-blur-[2px] sm:p-4">
                  <div className="w-[min(570px,94%)] rounded-[22px] border border-cyan-200/24 bg-slate-950/92 p-4 text-center shadow-[0_24px_60px_rgba(0,0,0,0.58)] sm:rounded-[24px] sm:p-6">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/62">Time!</p>
                      <span className="rounded-full border border-violet-200/16 bg-violet-300/[0.055] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/72">{currentMess.title}</span>
                    </div>
                    <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">{resultLabel(cleanPercent)}</h3>
                    <div className="mt-2 text-3xl tracking-[0.18em] text-amber-200 sm:text-4xl" aria-label={`${stars} stars`}>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <span key={index} className={index < stars ? "opacity-100" : "opacity-20"}>★</span>
                      ))}
                    </div>

                    {(newBestScore || newBestPercent) && (
                      <div className="mx-auto mt-2 inline-flex rounded-full border border-amber-200/30 bg-amber-300/[0.10] px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                        New Personal Best!
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <ResultStat label="Cleaned" value={`${cleanPercent.toFixed(1)}%`} accent />
                      <ResultStat label="Score" value={score.toLocaleString()} />
                      <ResultStat label="Best Combo" value={`×${maxCombo.toFixed(2).replace(/\.00$/, "")}`} />
                    </div>

                    {roundBonus > 0 && (
                      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100/74">Clean bonus +{roundBonus.toLocaleString()}</p>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <StatPill label="Personal Best" value={(stats?.best_score ?? Math.max(bestScore, score)).toLocaleString()} />
                      <StatPill label="Rounds" value={(stats?.rounds_played ?? 0).toLocaleString()} />
                      <StatPill label="Perfects" value={(stats?.perfect_cleans ?? 0).toLocaleString()} />
                    </div>

                    <p className={`mt-2 min-h-4 text-[9px] font-bold ${saveStatus === "error" ? "text-rose-200/80" : "text-white/38"}`}>
                      {saveStatus === "saving" && "Saving your result…"}
                      {saveStatus === "saved" && "Personal best and Rug Rush stats saved."}
                      {saveStatus === "error" && "Result finished, but the score could not be saved."}
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={startRound}
                        className="min-h-11 rounded-full bg-cyan-300 px-5 text-[10px] font-black uppercase tracking-[0.11em] text-slate-950 transition hover:bg-cyan-200"
                      >
                        Play Again
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 rounded-full border border-white/12 bg-white/[0.045] px-5 text-[10px] font-black uppercase tracking-[0.11em] text-white/72 transition hover:bg-white/[0.08]"
                      >
                        Back to Nova Home
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {phase === "playing" && timeLeftMs <= 3000 && (
                <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full border border-amber-200/24 bg-slate-950/78 px-4 py-2 text-xl font-black text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.18)] sm:text-2xl">{roundedSeconds}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {phonePortrait && (
        <div className="absolute inset-0 z-[220] flex items-center justify-center bg-[#020914]/96 p-6 text-center backdrop-blur-xl">
          <div className="w-full max-w-sm rounded-[28px] border border-cyan-200/20 bg-slate-950/88 p-7 shadow-[0_28px_80px_rgba(0,0,0,0.65)]">
            <div className="mx-auto flex h-24 w-24 items-center justify-center">
              <div className="relative h-16 w-10 rotate-90 rounded-[12px] border-[3px] border-cyan-100/75 bg-cyan-300/[0.06] shadow-[0_0_28px_rgba(103,232,249,0.22)]">
                <div className="absolute left-1/2 top-1.5 h-1 w-4 -translate-x-1/2 rounded-full bg-cyan-100/45" />
                <div className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-100/55" />
              </div>
            </div>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/60">Rug Rush plays in landscape</p>
            <h3 className="mt-2 text-2xl font-black text-white">Turn your phone sideways</h3>
            <p className="mt-3 text-sm leading-6 text-white/56">Rotate your phone to landscape so Nova&apos;s whole rug stays visible while you scrub.</p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100/70">
              <span>↻</span>
              <span>Rotate to continue</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HudCard({
  label,
  value,
  urgent = false,
  highlight = false,
}: {
  label: string;
  value: string;
  urgent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border px-2 py-2 text-center sm:rounded-[18px] sm:px-4 sm:py-3 ${
        urgent
          ? "border-amber-200/28 bg-amber-300/[0.08]"
          : highlight
            ? "border-cyan-200/24 bg-cyan-300/[0.075]"
            : "border-white/[0.08] bg-white/[0.025]"
      }`}
    >
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/38 sm:text-[8px] sm:tracking-[0.14em]">{label}</p>
      <p className={`mt-0.5 text-base font-black sm:text-xl ${urgent ? "text-amber-100" : highlight ? "text-cyan-100" : "text-white"}`}>{value}</p>
    </div>
  );
}

function MiniRule({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-white/9 bg-white/[0.035] px-3 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-[10px] font-black text-slate-950">{number}</span>
      <span className="text-[10px] font-bold text-white/65 sm:text-[11px]">{text}</span>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] border border-white/[0.075] bg-white/[0.025] px-2.5 py-2 text-center">
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/34 sm:text-[8px]">{label}</p>
      <p className="mt-0.5 text-sm font-black text-white/82 sm:text-base">{value}</p>
    </div>
  );
}

function ResultStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[15px] border border-white/9 bg-white/[0.035] p-2.5 sm:p-3">
      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/38 sm:text-[8px] sm:tracking-[0.14em]">{label}</p>
      <p className={`mt-1 text-lg font-black sm:text-2xl ${accent ? "text-cyan-100" : "text-white"}`}>{value}</p>
    </div>
  );
}

