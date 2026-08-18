"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type GamePhase = "intro" | "countdown" | "playing" | "result";

type Point = {
  x: number;
  y: number;
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 560;
const ROUND_DURATION_MS = 10_000;
const BRUSH_RADIUS = 42;
const SAMPLE_STEP = 2;

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

function drawMess(context: CanvasRenderingContext2D) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.save();
  roundedRectPath(context, 48, 40, CANVAS_WIDTH - 96, CANVAS_HEIGHT - 80, 46);
  context.clip();

  const palette = [
    "rgba(105, 77, 52, 0.77)",
    "rgba(126, 92, 57, 0.68)",
    "rgba(70, 77, 83, 0.70)",
    "rgba(151, 117, 78, 0.62)",
  ];

  const patchCount = 19 + Math.floor(Math.random() * 6);
  for (let i = 0; i < patchCount; i += 1) {
    const x = 100 + Math.random() * (CANVAS_WIDTH - 200);
    const y = 88 + Math.random() * (CANVAS_HEIGHT - 176);
    const radiusX = 34 + Math.random() * 72;
    const radiusY = 22 + Math.random() * 48;
    const rotation = Math.random() * Math.PI;

    context.save();
    context.translate(x, y);
    context.rotate(rotation);

    const stain = context.createRadialGradient(0, 0, 3, 0, 0, Math.max(radiusX, radiusY));
    stain.addColorStop(0, palette[Math.floor(Math.random() * palette.length)]);
    stain.addColorStop(0.62, "rgba(86, 63, 43, 0.55)");
    stain.addColorStop(1, "rgba(90, 70, 50, 0)");

    context.fillStyle = stain;
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }

  const footprintPairs = 5 + Math.floor(Math.random() * 2);
  for (let i = 0; i < footprintPairs; i += 1) {
    const baseX = 130 + Math.random() * (CANVAS_WIDTH - 260);
    const baseY = 120 + Math.random() * (CANVAS_HEIGHT - 240);
    const direction = Math.random() * Math.PI * 2;
    const stepX = Math.cos(direction) * 58;
    const stepY = Math.sin(direction) * 58;
    drawFootprint(context, baseX, baseY, direction + 0.3, 0.72 + Math.random() * 0.28);
    drawFootprint(context, baseX + stepX, baseY + stepY, direction - 0.3, 0.72 + Math.random() * 0.28);
  }

  const crumbCount = 76 + Math.floor(Math.random() * 30);
  for (let i = 0; i < crumbCount; i += 1) {
    const x = 76 + Math.random() * (CANVAS_WIDTH - 152);
    const y = 68 + Math.random() * (CANVAS_HEIGHT - 136);
    const radius = 2 + Math.random() * 6;
    context.fillStyle = i % 3 === 0 ? "rgba(214, 168, 95, 0.9)" : "rgba(128, 91, 57, 0.82)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function compositeFrame(
  display: HTMLCanvasElement,
  rug: HTMLCanvasElement,
  dirt: HTMLCanvasElement,
) {
  const context = display.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.drawImage(rug, 0, 0);
  context.drawImage(dirt, 0, 0);
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

function starCountForPercent(percent: number) {
  if (percent >= 95) return 3;
  if (percent >= 80) return 3;
  if (percent >= 50) return 2;
  return 1;
}

function resultLabel(percent: number) {
  if (percent >= 95) return "Perfect Clean!";
  if (percent >= 80) return "Sparkling Work!";
  if (percent >= 50) return "Much Better!";
  return "Keep Scrubbing!";
}

export default function RugRushGame({ onClose }: { onClose: () => void }) {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const surfaceHostRef = useRef<HTMLDivElement | null>(null);
  const rugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dirtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStartedAtRef = useRef(0);
  const initialDirtMassRef = useRef(1);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const lastMeasureAtRef = useRef(0);
  const finishedRef = useRef(false);

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION_MS);
  const [cleanPercent, setCleanPercent] = useState(0);
  const [score, setScore] = useState(0);
  const [brushPoint, setBrushPoint] = useState<Point | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 1, height: 1 });
  const [phonePortrait, setPhonePortrait] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px) and (orientation: portrait)");
    const sync = () => setPhonePortrait(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
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

  const renderFrame = useCallback(() => {
    const display = displayCanvasRef.current;
    const rug = rugCanvasRef.current;
    const dirt = dirtCanvasRef.current;
    if (!display || !rug || !dirt) return;
    compositeFrame(display, rug, dirt);
  }, []);

  const measureProgress = useCallback((force = false) => {
    const dirt = dirtCanvasRef.current;
    if (!dirt) return { percent: cleanPercent, nextScore: score };

    const now = performance.now();
    if (!force && now - lastMeasureAtRef.current < 80) {
      return { percent: cleanPercent, nextScore: score };
    }

    lastMeasureAtRef.current = now;
    const remainingMass = measureDirtMass(dirt);
    const initialMass = Math.max(1, initialDirtMassRef.current);
    const percent = clamp((1 - remainingMass / initialMass) * 100, 0, 100);
    const nextScore = Math.round(percent * 100);

    setCleanPercent(percent);
    setScore(nextScore);
    return { percent, nextScore };
  }, [cleanPercent, score]);

  const prepareRound = useCallback(() => {
    const display = displayCanvasRef.current;
    if (!display) return;

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
    drawMess(dirtContext);

    rugCanvasRef.current = rug;
    dirtCanvasRef.current = dirt;
    initialDirtMassRef.current = Math.max(1, measureDirtMass(dirt));
    lastMeasureAtRef.current = 0;
    activePointerIdRef.current = null;
    lastPointRef.current = null;
    finishedRef.current = false;

    setBrushPoint(null);
    setCleanPercent(0);
    setScore(0);
    setTimeLeftMs(ROUND_DURATION_MS);
    renderFrame();
  }, [renderFrame]);

  useEffect(() => {
    const display = displayCanvasRef.current;
    if (!display) return;
    display.width = CANVAS_WIDTH;
    display.height = CANVAS_HEIGHT;
    prepareRound();
  }, [prepareRound]);

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    activePointerIdRef.current = null;
    lastPointRef.current = null;
    setBrushPoint(null);
    setTimeLeftMs(0);
    measureProgress(true);
    setPhase("result");
  }, [measureProgress]);

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

      if (remaining <= 0) {
        finishRound();
        return;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [finishRound, phase]);

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
    if (!dirt) return;
    const context = dirt.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.save();
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = BRUSH_RADIUS * 1.5;
    context.strokeStyle = "rgba(0,0,0,0.36)";
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    const gradient = context.createRadialGradient(
      to.x,
      to.y,
      BRUSH_RADIUS * 0.18,
      to.x,
      to.y,
      BRUSH_RADIUS,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0.48)");
    gradient.addColorStop(0.68, "rgba(0,0,0,0.22)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(to.x, to.y, BRUSH_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.restore();

    renderFrame();
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
    }
  }

  const roundedSeconds = Math.ceil(timeLeftMs / 1000);
  const stars = starCountForPercent(cleanPercent);

  return (
    <div className="fixed inset-0 z-[120] flex h-[100dvh] w-[100vw] items-center justify-center overflow-hidden bg-slate-950/86 p-1.5 backdrop-blur-md sm:p-3">
      <div className="grid h-full max-h-[920px] w-full max-w-[1180px] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-cyan-200/25 bg-[#03101d] shadow-[0_36px_110px_rgba(0,0,0,0.72)] sm:rounded-[30px]">
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-slate-950/55 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/60">
                Nova Home Minigame
              </p>
              <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/70">
                10 Seconds
              </span>
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
          <div className="grid grid-cols-3 gap-2">
            <HudCard label="Score" value={score.toLocaleString()} />
            <HudCard label="Cleaned" value={`${cleanPercent.toFixed(0)}%`} />
            <HudCard
              label="Time"
              value={phase === "intro" ? "10" : roundedSeconds.toString()}
              urgent={phase === "playing" && timeLeftMs <= 3000}
            />
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

              {phase === "intro" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/52 p-4 backdrop-blur-[2px]">
                  <div className="w-[min(520px,92%)] rounded-[24px] border border-cyan-200/24 bg-slate-950/88 p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.54)] sm:p-7">
                    <p className="text-[9px] font-black uppercase tracking-[0.17em] text-cyan-200/62">Nova needs your help</p>
                    <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">Clean the rug before time runs out!</h3>
                    <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-white/58 sm:text-sm">
                      Drag your mouse or finger across the dirty rug. Stains need a few passes now, so scrub fast and cover every corner before the 10 seconds are up.
                    </p>
                    <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2 text-left">
                      <MiniRule number="1" text="Drag to scrub" />
                      <MiniRule number="2" text="Stains need repeat passes" />
                    </div>
                    <button
                      type="button"
                      onClick={startRound}
                      className="mt-5 min-h-12 w-full rounded-full bg-cyan-300 px-6 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200"
                    >
                      Start Rug Rush
                    </button>
                  </div>
                </div>
              )}

              {phase === "countdown" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/44 backdrop-blur-[1px]">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/68">Get Ready</p>
                    <div className="mt-1 text-[88px] font-black leading-none text-white drop-shadow-[0_0_28px_rgba(103,232,249,0.6)] sm:text-[120px]">
                      {countdown}
                    </div>
                  </div>
                </div>
              )}

              {phase === "result" && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
                  <div className="w-[min(520px,92%)] rounded-[24px] border border-cyan-200/24 bg-slate-950/90 p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.58)] sm:p-7">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/62">Time!</p>
                    <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">{resultLabel(cleanPercent)}</h3>
                    <div className="mt-3 text-3xl tracking-[0.18em] text-amber-200 sm:text-4xl" aria-label={`${stars} stars`}>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <span key={index} className={index < stars ? "opacity-100" : "opacity-20"}>★</span>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-[16px] border border-white/9 bg-white/[0.035] p-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">Cleaned</p>
                        <p className="mt-1 text-2xl font-black text-cyan-100">{cleanPercent.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-[16px] border border-white/9 bg-white/[0.035] p-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">Score</p>
                        <p className="mt-1 text-2xl font-black text-white">{score.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full border border-amber-200/24 bg-slate-950/78 px-4 py-2 text-xl font-black text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.18)] sm:text-2xl">
                  {roundedSeconds}
                </div>
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
            <p className="mt-3 text-sm leading-6 text-white/56">
              Rotate your phone to landscape so Nova&apos;s whole rug stays visible while you scrub.
            </p>
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
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border px-3 py-2 text-center sm:rounded-[18px] sm:px-4 sm:py-3 ${
        urgent
          ? "border-amber-200/28 bg-amber-300/[0.08]"
          : "border-white/[0.08] bg-white/[0.025]"
      }`}
    >
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
      <p className={`mt-0.5 text-lg font-black sm:text-xl ${urgent ? "text-amber-100" : "text-white"}`}>{value}</p>
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
