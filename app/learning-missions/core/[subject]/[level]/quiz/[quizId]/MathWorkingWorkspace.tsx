"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import FractionText from "@/components/core-missions/FractionText";

type Tool = "pen" | "eraser" | "text";
type PenColor = "#111827" | "#2563eb" | "#dc2626" | "#16a34a";
type BrushSize = 2 | 5 | 9;

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  id: string;
  tool: "pen" | "eraser";
  color: PenColor;
  size: BrushSize;
  points: Point[];
};

type TextBox = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: PenColor;
  size: BrushSize;
};

type WorkspaceDocument = {
  version: 1;
  strokes: Stroke[];
  texts: TextBox[];
};

const EMPTY_DOCUMENT: WorkspaceDocument = {
  version: 1,
  strokes: [],
  texts: [],
};

const COLORS: Array<{ value: PenColor; label: string }> = [
  { value: "#111827", label: "Black" },
  { value: "#2563eb", label: "Blue" },
  { value: "#dc2626", label: "Red" },
  { value: "#16a34a", label: "Green" },
];

const BRUSHES: Array<{ value: BrushSize; label: string }> = [
  { value: 2, label: "S" },
  { value: 5, label: "M" },
  { value: 9, label: "L" },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function roundPoint(value: number) {
  return Math.round(clamp01(value) * 10000) / 10000;
}

function readWorkspace(storageKey: string): WorkspaceDocument {
  if (typeof window === "undefined") return EMPTY_DOCUMENT;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return EMPTY_DOCUMENT;

    const parsed = JSON.parse(raw) as Partial<WorkspaceDocument>;
    if (parsed.version !== 1) return EMPTY_DOCUMENT;

    return {
      version: 1,
      strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
      texts: Array.isArray(parsed.texts) ? parsed.texts : [],
    };
  } catch (error) {
    console.warn("Could not restore Math workspace:", error);
    return EMPTY_DOCUMENT;
  }
}

export default function MathWorkingWorkspace({
  storageKey,
  questionLabel,
  onClose,
}: {
  storageKey: string;
  questionLabel: string;
  onClose: () => void;
}) {
  const [documentState, setDocumentState] = useState<WorkspaceDocument>(() =>
    readWorkspace(storageKey),
  );
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<PenColor>("#111827");
  const [brushSize, setBrushSize] = useState<BrushSize>(5);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const historyRef = useRef<WorkspaceDocument[]>([]);

  useEffect(() => {
    setDocumentState(readWorkspace(storageKey));
    setActiveTextId(null);
    activeStrokeRef.current = null;
    historyRef.current = [];
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(documentState));
    } catch (error) {
      console.warn("Could not save Math workspace:", error);
    }
  }, [documentState, storageKey]);

  const drawDocument = useCallback((nextDocument: WorkspaceDocument) => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;

    const rect = surface.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
    }
    if (canvas.height !== Math.round(height * dpr)) {
      canvas.height = Math.round(height * dpr);
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of nextDocument.strokes) {
      if (stroke.points.length === 0) continue;

      ctx.save();
      ctx.globalCompositeOperation =
        stroke.tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth =
        stroke.tool === "eraser" ? Math.max(10, stroke.size * 3.2) : stroke.size;

      ctx.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * width;
        const y = point.y * height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    drawDocument(documentState);
  }, [documentState, drawDocument]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const observer = new ResizeObserver(() => drawDocument(documentState));
    observer.observe(surface);
    return () => observer.disconnect();
  }, [documentState, drawDocument]);

  function pushHistory() {
    historyRef.current = [
      ...historyRef.current.slice(-29),
      JSON.parse(JSON.stringify(documentState)) as WorkspaceDocument,
    ];
  }

  function undo() {
    const previous = historyRef.current.at(-1);
    if (!previous) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setDocumentState(previous);
    setActiveTextId(null);
  }

  function clearWorkspace() {
    if (
      documentState.strokes.length === 0 &&
      documentState.texts.length === 0
    ) {
      return;
    }

    if (!window.confirm(`Clear the workings for ${questionLabel}?`)) return;
    pushHistory();
    setDocumentState(EMPTY_DOCUMENT);
    setActiveTextId(null);
  }

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: roundPoint((event.clientX - rect.left) / Math.max(1, rect.width)),
      y: roundPoint((event.clientY - rect.top) / Math.max(1, rect.height)),
    };
  }

  function drawLiveSegment(stroke: Stroke, from: Point, to: Point) {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;

    const rect = surface.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth =
      stroke.tool === "eraser" ? Math.max(10, stroke.size * 3.2) : stroke.size;
    ctx.beginPath();
    ctx.moveTo(from.x * rect.width, from.y * rect.height);
    ctx.lineTo(to.x * rect.width, to.y * rect.height);
    ctx.stroke();
    ctx.restore();
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (tool === "text") {
      const point = pointFromEvent(event);
      pushHistory();
      const id = makeId("text");
      setDocumentState((current) => ({
        ...current,
        texts: [
          ...current.texts,
          {
            id,
            x: point.x,
            y: point.y,
            text: "",
            color,
            size: brushSize,
          },
        ],
      }));
      setActiveTextId(id);
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistory();

    const point = pointFromEvent(event);
    activeStrokeRef.current = {
      id: makeId("stroke"),
      tool,
      color,
      size: brushSize,
      points: [point],
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    if (!stroke || tool === "text") return;

    event.preventDefault();
    const nextPoint = pointFromEvent(event);
    const previous = stroke.points.at(-1);
    if (!previous) return;

    const dx = nextPoint.x - previous.x;
    const dy = nextPoint.y - previous.y;
    if (Math.hypot(dx, dy) < 0.0018) return;

    stroke.points.push(nextPoint);
    drawLiveSegment(stroke, previous, nextPoint);
  }

  function finishStroke(event?: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;

    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activeStrokeRef.current = null;

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      stroke.points.push({ x: Math.min(1, p.x + 0.0001), y: p.y });
    }

    setDocumentState((current) => ({
      ...current,
      strokes: [...current.strokes, stroke],
    }));
  }

  const toolHint = useMemo(() => {
    if (tool === "pen") return "Draw with mouse, touch, stylus or Apple Pencil.";
    if (tool === "eraser") return "Drag over pen strokes to erase.";
    return "Click anywhere on the page to add a typed note.";
  }, [tool]);

  return (
    <section style={workspaceShell} aria-label="Math working workspace">
      <header style={toolbar}>
        <div style={toolbarTopRow}>
          <div style={{ minWidth: 0 }}>
            <p style={eyebrow}>MATH WORKSPACE</p>
            <strong style={workspaceTitle}>{questionLabel}</strong>
          </div>

          <button type="button" onClick={onClose} style={closeButton}>
            Close ×
          </button>
        </div>

        <div style={toolRow}>
          <ToolButton
            active={tool === "pen"}
            label="✎ Pen"
            onClick={() => setTool("pen")}
          />
          <ToolButton
            active={tool === "text"}
            label="T Type"
            onClick={() => setTool("text")}
          />
          <ToolButton
            active={tool === "eraser"}
            label="⌫ Eraser"
            onClick={() => setTool("eraser")}
          />
          <button
            type="button"
            onClick={undo}
            disabled={historyRef.current.length === 0}
            style={{
              ...toolbarButton,
              opacity: historyRef.current.length === 0 ? 0.4 : 1,
            }}
          >
            ↶ Undo
          </button>
          <button type="button" onClick={clearWorkspace} style={toolbarButton}>
            Clear
          </button>
        </div>

        <div style={settingRow}>
          <span style={settingLabel}>Colour</span>
          {COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setColor(item.value)}
              aria-label={`${item.label} pen`}
              title={item.label}
              style={colorButton(color === item.value, item.value)}
            />
          ))}

          <span style={{ ...settingLabel, marginLeft: 8 }}>Size</span>
          {BRUSHES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setBrushSize(item.value)}
              style={sizeButton(brushSize === item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p style={hint}>{toolHint}</p>
      </header>

      <div ref={surfaceRef} style={paperSurface}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          style={{
            ...canvasStyle,
            cursor:
              tool === "text" ? "text" : tool === "eraser" ? "cell" : "crosshair",
          }}
        />

        {documentState.texts.map((item) => (
          <div
            key={item.id}
            style={{
              ...textBoxWrap,
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
            }}
          >
            {activeTextId === item.id ? (
              <textarea
                autoFocus
                value={item.text}
                onFocus={() => setActiveTextId(item.id)}
                onBlur={() => setActiveTextId(null)}
                onChange={(event) => {
                  const nextText = event.target.value;
                  setDocumentState((current) => ({
                    ...current,
                    texts: current.texts.map((textItem) =>
                      textItem.id === item.id
                        ? { ...textItem, text: nextText }
                        : textItem,
                    ),
                  }));
                }}
                placeholder="Type working…"
                style={textBox(item.color, item.size)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setActiveTextId(item.id)}
                style={formattedTextBox(item.color, item.size)}
                aria-label="Edit typed working"
              >
                {item.text ? (
                  <FractionText text={item.text} />
                ) : (
                  <span style={{ color: "rgba(100,116,139,0.62)" }}>
                    Type working…
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              aria-label="Remove typed note"
              onClick={() => {
                pushHistory();
                setDocumentState((current) => ({
                  ...current,
                  texts: current.texts.filter((textItem) => textItem.id !== item.id),
                }));
              }}
              style={removeTextButton}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ToolButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...toolbarButton,
        border: active
          ? "1px solid rgba(37,99,235,0.42)"
          : toolbarButton.border,
        background: active ? "rgba(37,99,235,0.10)" : toolbarButton.background,
        color: active ? "#1d4ed8" : toolbarButton.color,
      }}
    >
      {label}
    </button>
  );
}

function colorButton(active: boolean, value: PenColor): CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: "999px",
    border: active ? "3px solid #93c5fd" : "2px solid rgba(15,23,42,0.18)",
    background: value,
    boxShadow: active ? "0 0 0 2px white" : "none",
    cursor: "pointer",
    padding: 0,
  };
}

function sizeButton(active: boolean): CSSProperties {
  return {
    minWidth: 30,
    height: 28,
    borderRadius: 9,
    border: active
      ? "1px solid rgba(37,99,235,0.45)"
      : "1px solid rgba(15,23,42,0.15)",
    background: active ? "rgba(37,99,235,0.09)" : "rgba(255,255,255,0.74)",
    color: active ? "#1d4ed8" : "#334155",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function textBox(color: PenColor, size: BrushSize): CSSProperties {
  const fontSize = size === 2 ? 14 : size === 5 ? 17 : 21;

  return {
    width: "min(220px, 30vw)",
    minWidth: 120,
    minHeight: 46,
    maxHeight: 130,
    resize: "both",
    overflow: "auto",
    borderRadius: 8,
    border: "1px dashed rgba(30,64,175,0.34)",
    background: "rgba(255,255,255,0.78)",
    color,
    padding: "7px 24px 7px 8px",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize,
    lineHeight: 1.35,
    outline: "none",
    boxShadow: "0 5px 16px rgba(15,23,42,0.08)",
  };
}

function formattedTextBox(color: PenColor, size: BrushSize): CSSProperties {
  const fontSize = size === 2 ? 14 : size === 5 ? 17 : 21;

  return {
    width: "min(220px, 30vw)",
    minWidth: 120,
    minHeight: 46,
    maxHeight: 130,
    overflow: "auto",
    borderRadius: 8,
    border: "1px dashed rgba(30,64,175,0.34)",
    background: "rgba(255,255,255,0.78)",
    color,
    padding: "7px 24px 7px 8px",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize,
    lineHeight: 1.35,
    textAlign: "left",
    whiteSpace: "pre-wrap",
    boxShadow: "0 5px 16px rgba(15,23,42,0.08)",
    cursor: "text",
  };
}

const workspaceShell: CSSProperties = {
  height: "100%",
  minHeight: 0,
  width: "100%",
  borderRadius: 17,
  border: "1px solid rgba(148,163,184,0.36)",
  background: "#f8fafc",
  boxShadow: "0 16px 36px rgba(0,0,0,0.18)",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto minmax(0,1fr)",
  color: "#0f172a",
};

const toolbar: CSSProperties = {
  padding: "9px 10px 8px",
  borderBottom: "1px solid rgba(15,23,42,0.10)",
  background: "rgba(248,250,252,0.98)",
  display: "grid",
  gap: 6,
};

const toolbarTopRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".13em",
};

const workspaceTitle: CSSProperties = {
  display: "block",
  marginTop: 2,
  fontSize: 12,
  color: "#0f172a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const closeButton: CSSProperties = {
  minHeight: 30,
  borderRadius: 999,
  border: "1px solid rgba(15,23,42,0.14)",
  background: "white",
  color: "#334155",
  padding: "0 10px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const toolRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 5,
};

const toolbarButton: CSSProperties = {
  minHeight: 30,
  borderRadius: 9,
  border: "1px solid rgba(15,23,42,0.13)",
  background: "rgba(255,255,255,0.82)",
  color: "#334155",
  padding: "0 8px",
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const settingRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 5,
};

const settingLabel: CSSProperties = {
  color: "#64748b",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const hint: CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 9,
  lineHeight: 1.3,
};

const paperSurface: CSSProperties = {
  position: "relative",
  minHeight: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: "#fffdf7",
  backgroundImage:
    "linear-gradient(rgba(148,163,184,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.10) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
};

const canvasStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  touchAction: "none",
  userSelect: "none",
};

const textBoxWrap: CSSProperties = {
  position: "absolute",
  zIndex: 3,
  transform: "translate(-4px, -4px)",
};

const removeTextButton: CSSProperties = {
  position: "absolute",
  top: 3,
  right: 3,
  width: 20,
  height: 20,
  borderRadius: 999,
  border: "1px solid rgba(15,23,42,0.12)",
  background: "rgba(248,250,252,0.94)",
  color: "#64748b",
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
};
