"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropHandle = "nw" | "ne" | "sw" | "se";

type Interaction =
  | {
      kind: "move";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startCrop: CropRect;
    }
  | {
      kind: "resize";
      handle: CropHandle;
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startCrop: CropRect;
    };

const MAX_OUTPUT_DIMENSION = 4096;
const MIN_CROP_PIXELS = 20;

type CropImageButtonProps = {
  file?: File | null;
  url?: string | null;
  alt?: string;
  title?: string;
  disabled?: boolean;
  filenameHint?: string;
  onCropped: (file: File) => void;
};

export function CropImageButton({
  file,
  url,
  alt = "Image",
  title = "Crop / Reposition Image",
  disabled = false,
  filenameHint,
  onCropped,
}: CropImageButtonProps) {
  const [open, setOpen] = useState(false);

  const hasSource = Boolean(file || url);
  const obviousUnsupported = useMemo(
    () => isObviouslyUnsupported(file, url),
    [file, url],
  );

  if (!hasSource) return null;

  if (obviousUnsupported) {
    return (
      <div style={unsupportedNote}>
        Crop is unavailable for SVG/GIF because cropping would rasterise or
        flatten the original media.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{
          ...cropButton,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        ✂ Crop / Reposition
      </button>

      {open ? (
        <ImageCropEditor
          file={file}
          url={url}
          alt={alt}
          title={title}
          filenameHint={filenameHint}
          onCancel={() => setOpen(false)}
          onApply={(nextFile) => {
            onCropped(nextFile);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

export default function ImageCropEditor({
  file,
  url,
  alt,
  title,
  filenameHint,
  onCancel,
  onApply,
}: {
  file?: File | null;
  url?: string | null;
  alt: string;
  title: string;
  filenameHint?: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceMime, setSourceMime] = useState<string>(file?.type || "");
  const [sourceName, setSourceName] = useState<string>(
    file?.name || filenameHint || "image",
  );
  const [loadingSource, setLoadingSource] = useState(true);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [crop, setCrop] = useState<CropRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [ratio, setRatio] = useState<"free" | "1:1" | "4:3" | "16:9">(
    "free",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function prepareSource() {
      setLoadingSource(true);
      setError(null);

      try {
        let blob: Blob;
        let name = filenameHint || "image";

        if (file) {
          blob = file;
          name = file.name || name;
        } else if (url) {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`Could not load image (${response.status}).`);
          }
          blob = await response.blob();
          name = filenameHint || filenameFromUrl(url) || name;
        } else {
          throw new Error("No image was supplied to the crop editor.");
        }

        if (cancelled) return;

        if (!isStaticRasterMime(blob.type, name)) {
          throw new Error(
            "Crop supports PNG, JPEG and WebP images. SVG and GIF are left unchanged to preserve their original format.",
          );
        }

        objectUrl = URL.createObjectURL(blob);
        setSourceUrl(objectUrl);
        setSourceMime(normaliseMime(blob.type, name));
        setSourceName(name);
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || "Could not prepare this image for cropping.");
        }
      } finally {
        if (!cancelled) setLoadingSource(false);
      }
    }

    void prepareSource();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, filenameHint, url]);

  function handleImageLoaded() {
    const image = imageRef.current;
    if (!image) return;

    const width = image.naturalWidth;
    const height = image.naturalHeight;

    setNaturalWidth(width);
    setNaturalHeight(height);
    setCrop({ x: 0, y: 0, width, height });
  }

  function clampCrop(next: CropRect): CropRect {
    if (!naturalWidth || !naturalHeight) return next;

    const width = Math.max(
      Math.min(next.width, naturalWidth),
      Math.min(MIN_CROP_PIXELS, naturalWidth),
    );
    const height = Math.max(
      Math.min(next.height, naturalHeight),
      Math.min(MIN_CROP_PIXELS, naturalHeight),
    );

    return {
      x: clamp(next.x, 0, naturalWidth - width),
      y: clamp(next.y, 0, naturalHeight - height),
      width,
      height,
    };
  }

  function beginMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!wrapRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    wrapRef.current.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: crop,
    };
  }

  function beginResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    handle: CropHandle,
  ) {
    if (!wrapRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    wrapRef.current.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: "resize",
      handle,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: crop,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    const image = imageRef.current;
    if (!interaction || !image || interaction.pointerId !== event.pointerId) {
      return;
    }

    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = ((event.clientX - interaction.startClientX) / rect.width) * naturalWidth;
    const dy = ((event.clientY - interaction.startClientY) / rect.height) * naturalHeight;

    if (interaction.kind === "move") {
      setCrop(
        clampCrop({
          ...interaction.startCrop,
          x: interaction.startCrop.x + dx,
          y: interaction.startCrop.y + dy,
        }),
      );
      return;
    }

    setCrop(
      resizeCropFromHandle(
        interaction.startCrop,
        interaction.handle,
        dx,
        dy,
        naturalWidth,
        naturalHeight,
        ratioValue(ratio),
      ),
    );
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (interactionRef.current?.pointerId !== event.pointerId) return;

    try {
      wrapRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }

    interactionRef.current = null;
  }

  function resetCrop() {
    if (!naturalWidth || !naturalHeight) return;
    setRatio("free");
    setCrop({ x: 0, y: 0, width: naturalWidth, height: naturalHeight });
    setError(null);
  }

  function changeRatio(nextRatio: typeof ratio) {
    setRatio(nextRatio);
    const value = ratioValue(nextRatio);
    if (!value || !naturalWidth || !naturalHeight) return;

    setCrop((current) => centeredRatioCrop(current, value, naturalWidth, naturalHeight));
  }

  async function autoTrim() {
    const image = imageRef.current;
    if (!image || !naturalWidth || !naturalHeight) return;

    setBusy(true);
    setError(null);

    try {
      const maxScanDimension = 1600;
      const scale = Math.min(
        1,
        maxScanDimension / Math.max(naturalWidth, naturalHeight),
      );
      const scanWidth = Math.max(1, Math.round(naturalWidth * scale));
      const scanHeight = Math.max(1, Math.round(naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = scanWidth;
      canvas.height = scanHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas is unavailable in this browser.");

      ctx.clearRect(0, 0, scanWidth, scanHeight);
      ctx.drawImage(image, 0, 0, scanWidth, scanHeight);

      const data = ctx.getImageData(0, 0, scanWidth, scanHeight).data;
      let minX = scanWidth;
      let minY = scanHeight;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < scanHeight; y += 1) {
        for (let x = 0; x < scanWidth; x += 1) {
          const index = (y * scanWidth + x) * 4;
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const alpha = data[index + 3];

          const transparent = alpha <= 10;
          const nearWhite = red >= 248 && green >= 248 && blue >= 248;
          const isContent = !transparent && !nearWhite;

          if (isContent) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        throw new Error(
          "Auto Trim could not find a clear non-white/non-transparent object. Use the manual crop box instead.",
        );
      }

      const inverse = 1 / scale;
      const contentX = minX * inverse;
      const contentY = minY * inverse;
      const contentWidth = (maxX - minX + 1) * inverse;
      const contentHeight = (maxY - minY + 1) * inverse;
      const margin = Math.max(4, Math.max(contentWidth, contentHeight) * 0.04);

      let next = clampCrop({
        x: contentX - margin,
        y: contentY - margin,
        width: contentWidth + margin * 2,
        height: contentHeight + margin * 2,
      });

      const fixedRatio = ratioValue(ratio);
      if (fixedRatio) {
        next = centeredRatioCrop(next, fixedRatio, naturalWidth, naturalHeight);
      }

      setCrop(next);
    } catch (trimError: any) {
      setError(trimError?.message || "Auto Trim could not analyse this image.");
    } finally {
      setBusy(false);
    }
  }

  async function applyCrop() {
    const image = imageRef.current;
    if (!image || !naturalWidth || !naturalHeight) return;

    setBusy(true);
    setError(null);

    try {
      const cropWidth = Math.max(1, Math.round(crop.width));
      const cropHeight = Math.max(1, Math.round(crop.height));
      const outputScale = Math.min(
        1,
        MAX_OUTPUT_DIMENSION / Math.max(cropWidth, cropHeight),
      );
      const outputWidth = Math.max(1, Math.round(cropWidth * outputScale));
      const outputHeight = Math.max(1, Math.round(cropHeight * outputScale));

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable in this browser.");

      const mime = outputMime(sourceMime, sourceName);
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outputWidth, outputHeight);
      } else {
        ctx.clearRect(0, 0, outputWidth, outputHeight);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await canvasToBlob(canvas, mime);
      const fileName = croppedFilename(sourceName || filenameHint || "image", mime);
      const nextFile = new File([blob], fileName, {
        type: mime,
        lastModified: Date.now(),
      });

      onApply(nextFile);
    } catch (cropError: any) {
      setError(cropError?.message || "Could not create the cropped image.");
      setBusy(false);
    }
  }

  const cropStyle = useMemo<CSSProperties>(() => {
    if (!naturalWidth || !naturalHeight) return { display: "none" };

    return {
      position: "absolute",
      left: `${(crop.x / naturalWidth) * 100}%`,
      top: `${(crop.y / naturalHeight) * 100}%`,
      width: `${(crop.width / naturalWidth) * 100}%`,
      height: `${(crop.height / naturalHeight) * 100}%`,
      border: "2px solid #55e6ff",
      boxShadow: "0 0 0 9999px rgba(2,7,18,0.62)",
      cursor: "move",
      touchAction: "none",
      boxSizing: "border-box",
    };
  }, [crop, naturalHeight, naturalWidth]);

  const cropSummary = naturalWidth
    ? `${Math.round(crop.width)} × ${Math.round(crop.height)} px`
    : "—";

  return (
    <div style={backdrop} role="dialog" aria-modal="true" aria-label={title}>
      <div style={modal}>
        <header style={headerRow}>
          <div>
            <p style={eyebrow}>IMAGE EDITOR</p>
            <h3 style={titleStyle}>{title}</h3>
            <p style={subtitleStyle}>
              Drag the crop area to reposition it. Drag a corner to resize.
              Auto Trim removes transparent or near-white outer margins.
            </p>
          </div>

          <button type="button" disabled={busy} onClick={onCancel} style={closeButton}>
            ✕ Close
          </button>
        </header>

        {error ? <div style={errorBox}>{error}</div> : null}

        {loadingSource ? (
          <div style={loadingBox}>Preparing image…</div>
        ) : sourceUrl ? (
          <>
            <div style={toolbar}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void autoTrim()}
                style={toolButton}
              >
                ✨ Auto Trim
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={resetCrop}
                style={toolButton}
              >
                Reset
              </button>

              <label style={ratioLabel}>
                Crop ratio
                <select
                  value={ratio}
                  disabled={busy}
                  onChange={(event) => changeRatio(event.target.value as typeof ratio)}
                  style={ratioSelect}
                >
                  <option value="free">Free</option>
                  <option value="1:1">1 : 1</option>
                  <option value="4:3">4 : 3</option>
                  <option value="16:9">16 : 9</option>
                </select>
              </label>

              <span style={sizeBadge}>{cropSummary}</span>
            </div>

            <div style={previewStage}>
              <div
                ref={wrapRef}
                style={imageWrap}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointer}
                onPointerCancel={finishPointer}
              >
                <img
                  ref={imageRef}
                  src={sourceUrl}
                  alt={alt}
                  onLoad={handleImageLoaded}
                  draggable={false}
                  style={previewImage}
                />

                {naturalWidth > 0 ? (
                  <div style={cropStyle} onPointerDown={beginMove}>
                    {(["nw", "ne", "sw", "se"] as CropHandle[]).map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        aria-label={`Resize crop from ${handle}`}
                        onPointerDown={(event) => beginResize(event, handle)}
                        style={resizeHandle(handle)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={hintBox}>
              Tip: for diagrams with a large white or transparent canvas, try
              <strong> Auto Trim</strong> first, then fine-tune the crop manually.
              The crop creates a new image file; the original is not overwritten
              until the normal save flow succeeds.
            </div>

            <footer style={footerRow}>
              <button type="button" disabled={busy} onClick={onCancel} style={cancelButton}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !naturalWidth}
                onClick={() => void applyCrop()}
                style={{ ...applyButton, opacity: busy || !naturalWidth ? 0.55 : 1 }}
              >
                {busy ? "Processing…" : "Apply Crop"}
              </button>
            </footer>
          </>
        ) : (
          <div style={loadingBox}>This image could not be opened.</div>
        )}
      </div>
    </div>
  );
}

function isObviouslyUnsupported(file?: File | null, url?: string | null) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || url || "").toLowerCase();
  return (
    type === "image/svg+xml" ||
    type === "image/gif" ||
    /\.svg(?:$|\?)/.test(name) ||
    /\.gif(?:$|\?)/.test(name)
  );
}

function isStaticRasterMime(mime: string, name: string) {
  const resolved = normaliseMime(mime, name);
  return ["image/png", "image/jpeg", "image/webp"].includes(resolved);
}

function normaliseMime(mime: string, name: string) {
  const value = String(mime || "").toLowerCase();
  if (value === "image/png") return "image/png";
  if (value === "image/jpeg" || value === "image/jpg") return "image/jpeg";
  if (value === "image/webp") return "image/webp";

  const lower = name.toLowerCase();
  if (/\.png(?:$|\?)/.test(lower)) return "image/png";
  if (/\.jpe?g(?:$|\?)/.test(lower)) return "image/jpeg";
  if (/\.webp(?:$|\?)/.test(lower)) return "image/webp";
  return value || "image/png";
}

function outputMime(mime: string, name: string) {
  const resolved = normaliseMime(mime, name);
  if (["image/png", "image/jpeg", "image/webp"].includes(resolved)) {
    return resolved;
  }
  return "image/png";
}

function filenameFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "image");
  } catch {
    return "image";
  }
}

function croppedFilename(original: string, mime: string) {
  const base = original.replace(/\.(png|jpe?g|webp)$/i, "") || "image";
  const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1] || "png";
  return `${base}-cropped.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not create the cropped image."));
      },
      mime,
      mime === "image/jpeg" || mime === "image/webp" ? 0.94 : undefined,
    );
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ratioValue(ratio: "free" | "1:1" | "4:3" | "16:9") {
  if (ratio === "1:1") return 1;
  if (ratio === "4:3") return 4 / 3;
  if (ratio === "16:9") return 16 / 9;
  return null;
}

function centeredRatioCrop(
  current: CropRect,
  ratio: number,
  naturalWidth: number,
  naturalHeight: number,
): CropRect {
  const centerX = current.x + current.width / 2;
  const centerY = current.y + current.height / 2;

  let width = current.width;
  let height = width / ratio;

  if (height > current.height) {
    height = current.height;
    width = height * ratio;
  }

  width = Math.max(Math.min(width, naturalWidth), Math.min(MIN_CROP_PIXELS, naturalWidth));
  height = Math.max(Math.min(height, naturalHeight), Math.min(MIN_CROP_PIXELS, naturalHeight));

  let x = centerX - width / 2;
  let y = centerY - height / 2;
  x = clamp(x, 0, naturalWidth - width);
  y = clamp(y, 0, naturalHeight - height);

  return { x, y, width, height };
}

function resizeCropFromHandle(
  start: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  naturalWidth: number,
  naturalHeight: number,
  aspectRatio: number | null,
): CropRect {
  const left = start.x;
  const top = start.y;
  const right = start.x + start.width;
  const bottom = start.y + start.height;

  const anchorX = handle.includes("w") ? right : left;
  const anchorY = handle.includes("n") ? bottom : top;
  const movingStartX = handle.includes("w") ? left : right;
  const movingStartY = handle.includes("n") ? top : bottom;

  let movingX = movingStartX + dx;
  let movingY = movingStartY + dy;

  movingX = clamp(movingX, 0, naturalWidth);
  movingY = clamp(movingY, 0, naturalHeight);

  const directionX = handle.includes("w") ? -1 : 1;
  const directionY = handle.includes("n") ? -1 : 1;

  let width = Math.max(MIN_CROP_PIXELS, Math.abs(movingX - anchorX));
  let height = Math.max(MIN_CROP_PIXELS, Math.abs(movingY - anchorY));

  const maxWidth = directionX < 0 ? anchorX : naturalWidth - anchorX;
  const maxHeight = directionY < 0 ? anchorY : naturalHeight - anchorY;

  width = Math.min(width, Math.max(MIN_CROP_PIXELS, maxWidth));
  height = Math.min(height, Math.max(MIN_CROP_PIXELS, maxHeight));

  if (aspectRatio) {
    if (width / height > aspectRatio) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  }

  const x = directionX < 0 ? anchorX - width : anchorX;
  const y = directionY < 0 ? anchorY - height : anchorY;

  return {
    x: clamp(x, 0, naturalWidth - width),
    y: clamp(y, 0, naturalHeight - height),
    width,
    height,
  };
}

function resizeHandle(handle: CropHandle): CSSProperties {
  const vertical = handle.includes("n") ? { top: "-7px" } : { bottom: "-7px" };
  const horizontal = handle.includes("w") ? { left: "-7px" } : { right: "-7px" };

  return {
    position: "absolute",
    ...vertical,
    ...horizontal,
    width: "16px",
    height: "16px",
    padding: 0,
    borderRadius: "50%",
    border: "2px solid #061326",
    background: "#74e7f5",
    cursor:
      handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize",
    touchAction: "none",
  };
}

const cropButton: CSSProperties = {
  minHeight: "36px",
  borderRadius: "9px",
  border: "1px solid rgba(126,232,255,0.30)",
  background: "rgba(53,197,255,0.10)",
  color: "#c5f7ff",
  padding: "0 11px",
  fontSize: "10px",
  fontWeight: 900,
};

const unsupportedNote: CSSProperties = {
  borderRadius: "9px",
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.42)",
  padding: "8px 9px",
  fontSize: "10px",
  lineHeight: 1.4,
};

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 12000,
  display: "grid",
  placeItems: "center",
  padding: "18px",
  background: "rgba(1,5,12,0.92)",
  backdropFilter: "blur(12px)",
};

const modal: CSSProperties = {
  width: "min(1100px, 100%)",
  maxHeight: "calc(100dvh - 36px)",
  overflowY: "auto",
  borderRadius: "22px",
  border: "1px solid rgba(126,232,255,0.25)",
  background: "#08172f",
  color: "white",
  boxShadow: "0 34px 110px rgba(0,0,0,0.60)",
  padding: "18px",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#83ebff",
  fontSize: "9px",
  fontWeight: 950,
  letterSpacing: "0.15em",
};

const titleStyle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "clamp(21px,3vw,30px)",
};

const subtitleStyle: CSSProperties = {
  margin: "7px 0 0",
  maxWidth: "760px",
  color: "rgba(255,255,255,0.52)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const closeButton: CSSProperties = {
  flex: "0 0 auto",
  minHeight: "40px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 13px",
  cursor: "pointer",
  fontWeight: 900,
};

const errorBox: CSSProperties = {
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(248,113,113,0.32)",
  background: "rgba(239,68,68,0.09)",
  color: "#fecaca",
  padding: "11px 12px",
  fontSize: "12px",
  lineHeight: 1.45,
};

const loadingBox: CSSProperties = {
  marginTop: "14px",
  minHeight: "240px",
  display: "grid",
  placeItems: "center",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(255,255,255,0.025)",
  color: "rgba(255,255,255,0.55)",
  fontWeight: 850,
};

const toolbar: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
};

const toolButton: CSSProperties = {
  minHeight: "38px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "rgba(83,215,255,0.08)",
  color: "#c5f7ff",
  padding: "0 12px",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: "11px",
};

const ratioLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  color: "rgba(255,255,255,0.55)",
  fontSize: "11px",
  fontWeight: 850,
};

const ratioSelect: CSSProperties = {
  minHeight: "38px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.20)",
  background: "#102442",
  color: "white",
  padding: "0 10px",
};

const sizeBadge: CSSProperties = {
  marginLeft: "auto",
  minHeight: "34px",
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.55)",
  padding: "0 10px",
  fontSize: "10px",
  fontWeight: 850,
};

const previewStage: CSSProperties = {
  marginTop: "12px",
  minHeight: "280px",
  maxHeight: "64dvh",
  overflow: "auto",
  display: "grid",
  placeItems: "center",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "linear-gradient(45deg,#e9edf2 25%,transparent 25%),linear-gradient(-45deg,#e9edf2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e9edf2 75%),linear-gradient(-45deg,transparent 75%,#e9edf2 75%),#fff",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0,0 10px,10px -10px,-10px 0px",
  padding: "12px",
};

const imageWrap: CSSProperties = {
  position: "relative",
  display: "inline-block",
  maxWidth: "100%",
  touchAction: "none",
  overflow: "hidden",
  borderRadius: "8px",
};

const previewImage: CSSProperties = {
  display: "block",
  maxWidth: "100%",
  maxHeight: "58dvh",
  width: "auto",
  height: "auto",
  userSelect: "none",
};

const hintBox: CSSProperties = {
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,215,106,0.20)",
  background: "rgba(255,215,106,0.06)",
  color: "#ffe8a9",
  padding: "10px 11px",
  fontSize: "11px",
  lineHeight: 1.5,
};

const footerRow: CSSProperties = {
  marginTop: "14px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "9px",
};

const cancelButton: CSSProperties = {
  minHeight: "42px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,0.13)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "0 15px",
  cursor: "pointer",
  fontWeight: 900,
};

const applyButton: CSSProperties = {
  ...cancelButton,
  border: "1px solid rgba(126,232,255,0.42)",
  background: "linear-gradient(135deg,#77e6f5,#74ddc4)",
  color: "#061326",
};
