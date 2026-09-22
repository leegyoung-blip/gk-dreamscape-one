"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

export type CoreMediaType = "image" | "svg" | "audio" | "video";
export type CoreMediaVariant = "default" | "core_mission" | "math";
export type CoreMediaSize = "compact" | "standard" | "large";

export type CoreQuestionAsset = {
  id: string;
  asset_type: CoreMediaType;
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  metadata?: Record<string, unknown> | null;
};

export type CoreQuizStimulus = {
  id: string;
  stimulus_type:
    | "passage"
    | "visual_text"
    | "image"
    | "audio"
    | "video"
    | "diagram"
    | "table"
    | "graph";
  title: string | null;
  body: Record<string, unknown> | null;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
};

type ImagePreview = {
  src: string;
  alt: string;
  caption: string | null;
};

type MediaMetrics = {
  stackGap: number;
  stackMargin: string;
  cardPadding: number;
  cardRadius: number;
  figurePadding: number;
  figureRadius: number;
  gridGap: number;
  gridMinWidth: number;
  imageHeight: string | null;
  imageMinHeight: string | number;
  imageMaxHeight: string;
  videoMaxHeight: string;
  titleSize: string;
  bodySize: string;
  captionSize: string;
  tableCellPadding: number;
};

function getPublicUrl(bucket?: string | null, path?: string | null) {
  if (!bucket || !path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function metadataValue(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  return metadata ? textValue(metadata[key]) : "";
}

function getPosterUrl(asset: CoreQuestionAsset) {
  const metadata = asset.metadata ?? {};
  const directUrl = metadataValue(metadata, "poster_url");

  if (directUrl) return directUrl;

  const posterBucket =
    metadataValue(metadata, "poster_bucket") || asset.storage_bucket;
  const posterPath = metadataValue(metadata, "poster_path");

  return getPublicUrl(posterBucket, posterPath);
}

function getMediaMetrics(
  variant: CoreMediaVariant,
  size: CoreMediaSize,
  multipleVisuals: boolean,
): MediaMetrics {
  if (variant === "default") {
    return {
      stackGap: 14,
      stackMargin: "12px 0 18px",
      cardPadding: 16,
      cardRadius: 18,
      figurePadding: 12,
      figureRadius: 18,
      gridGap: 14,
      gridMinWidth: 260,
      imageHeight: null,
      imageMinHeight: 120,
      imageMaxHeight: "min(48dvh, 520px)",
      videoMaxHeight: "min(52dvh, 560px)",
      titleSize: "18px",
      bodySize: "clamp(15px, 1.8vw, 18px)",
      captionSize: "13px",
      tableCellPadding: 10,
    };
  }

  if (variant === "math") {
    if (size === "compact") {
      return {
        stackGap: 6,
        stackMargin: "0",
        cardPadding: 6,
        cardRadius: 13,
        figurePadding: 5,
        figureRadius: 12,
        gridGap: 6,
        gridMinWidth: 170,
        imageHeight: multipleVisuals
          ? "clamp(105px, 17dvh, 145px)"
          : "clamp(140px, 23dvh, 205px)",
        imageMinHeight: 0,
        imageMaxHeight: "none",
        videoMaxHeight: "min(25dvh, 220px)",
        titleSize: "13px",
        bodySize: "13px",
        captionSize: "10px",
        tableCellPadding: 6,
      };
    }

    if (size === "large") {
      return {
        stackGap: 9,
        stackMargin: "0",
        cardPadding: 8,
        cardRadius: 15,
        figurePadding: 7,
        figureRadius: 14,
        gridGap: 8,
        gridMinWidth: 220,
        imageHeight: multipleVisuals
          ? "clamp(150px, 24dvh, 225px)"
          : "clamp(220px, 37dvh, 390px)",
        imageMinHeight: 0,
        imageMaxHeight: "none",
        videoMaxHeight: "min(42dvh, 430px)",
        titleSize: "15px",
        bodySize: "clamp(14px, 1.35vw, 17px)",
        captionSize: "11px",
        tableCellPadding: 8,
      };
    }

    return {
      stackGap: 8,
      stackMargin: "0",
      cardPadding: 7,
      cardRadius: 14,
      figurePadding: 6,
      figureRadius: 13,
      gridGap: 7,
      gridMinWidth: 200,
      imageHeight: multipleVisuals
        ? "clamp(130px, 20dvh, 185px)"
        : "clamp(180px, 30dvh, 300px)",
      imageMinHeight: 0,
      imageMaxHeight: "none",
      videoMaxHeight: "min(34dvh, 340px)",
      titleSize: "14px",
      bodySize: "clamp(13px, 1.25vw, 16px)",
      captionSize: "11px",
      tableCellPadding: 7,
    };
  }

  // Generic Core Mission media. This is intentionally conservative for now;
  // Math is the first presentation mode to use the semantic sizing API.
  return {
    stackGap: size === "compact" ? 7 : 10,
    stackMargin: "0",
    cardPadding: size === "compact" ? 7 : 10,
    cardRadius: 15,
    figurePadding: size === "compact" ? 6 : 8,
    figureRadius: 14,
    gridGap: size === "compact" ? 7 : 9,
    gridMinWidth: size === "compact" ? 180 : 220,
    imageHeight:
      size === "compact"
        ? multipleVisuals
          ? "clamp(110px, 18dvh, 150px)"
          : "clamp(150px, 24dvh, 215px)"
        : size === "large"
          ? multipleVisuals
            ? "clamp(155px, 24dvh, 225px)"
            : "clamp(220px, 36dvh, 380px)"
          : multipleVisuals
            ? "clamp(135px, 21dvh, 190px)"
            : "clamp(185px, 30dvh, 300px)",
    imageMinHeight: 0,
    imageMaxHeight: "none",
    videoMaxHeight:
      size === "compact" ? "min(26dvh, 230px)" : "min(40dvh, 420px)",
    titleSize: size === "compact" ? "13px" : "15px",
    bodySize: size === "compact" ? "13px" : "clamp(14px, 1.4vw, 17px)",
    captionSize: size === "compact" ? "10px" : "11px",
    tableCellPadding: size === "compact" ? 6 : 8,
  };
}

function StimulusText({
  stimulus,
  metrics,
}: {
  stimulus: CoreQuizStimulus;
  metrics: MediaMetrics;
}) {
  const body = stimulus.body ?? {};
  const bodyText =
    textValue(body.text) ||
    textValue(body.content) ||
    textValue(body.passage);

  const headers = Array.isArray(body.headers)
    ? body.headers.map((item) => String(item))
    : [];

  const rows = Array.isArray(body.rows)
    ? body.rows
        .filter(Array.isArray)
        .map((row) => row.map((item) => String(item)))
    : [];

  if (stimulus.stimulus_type === "table" && headers.length > 0) {
    return (
      <div style={tableScroller}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  style={tableHeaderCell(metrics)}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    style={tableCell(metrics)}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!bodyText) return null;

  return <p style={stimulusText(metrics)}>{bodyText}</p>;
}

export default function QuestionMediaRenderer({
  stimulus,
  assets,
  variant = "default",
  size = "standard",
}: {
  stimulus?: CoreQuizStimulus | null;
  assets?: CoreQuestionAsset[] | null;
  variant?: CoreMediaVariant;
  size?: CoreMediaSize;
}) {
  const [preview, setPreview] = useState<ImagePreview | null>(null);

  const orderedAssets = useMemo(
    () => (Array.isArray(assets) ? assets : []),
    [assets],
  );

  const stimulusUrl = getPublicUrl(
    stimulus?.storage_bucket,
    stimulus?.storage_path,
  );

  const hasStimulusText =
    stimulus &&
    ["passage", "visual_text", "table"].includes(stimulus.stimulus_type);

  const stimulusIsVisual = Boolean(
    stimulus &&
      ["image", "diagram", "graph"].includes(stimulus.stimulus_type),
  );
  const visualAssetCount = orderedAssets.filter(
    (asset) => asset.asset_type === "image" || asset.asset_type === "svg",
  ).length;
  const visualItemCount = (stimulusIsVisual ? 1 : 0) + visualAssetCount;
  const multipleVisuals = visualItemCount > 1;
  const metrics = getMediaMetrics(variant, size, multipleVisuals);

  if (!stimulus && orderedAssets.length === 0) return null;

  return (
    <>
      <div
        data-core-media-variant={variant}
        data-core-media-size={size}
        data-core-media-multiple={multipleVisuals ? "true" : "false"}
        style={mediaStack(metrics)}
      >
        {stimulus && (
          <section style={mediaCard(metrics, variant)}>
            {stimulus.title && (
              <h2 style={mediaTitle(metrics)}>{stimulus.title}</h2>
            )}

            {hasStimulusText && (
              <StimulusText stimulus={stimulus} metrics={metrics} />
            )}

            {stimulusUrl &&
              ["image", "diagram", "graph"].includes(
                stimulus.stimulus_type,
              ) && (
                <ImageFrame
                  src={stimulusUrl}
                  alt={stimulus.alt_text || "Question stimulus"}
                  caption={stimulus.title}
                  metrics={metrics}
                  onOpen={() =>
                    setPreview({
                      src: stimulusUrl,
                      alt: stimulus.alt_text || "Question stimulus",
                      caption: stimulus.title,
                    })
                  }
                />
              )}

            {stimulusUrl && stimulus.stimulus_type === "audio" && (
              <audio
                controls
                preload="metadata"
                src={stimulusUrl}
                style={audioStyle}
              >
                Your browser does not support audio playback.
              </audio>
            )}

            {stimulusUrl && stimulus.stimulus_type === "video" && (
              <video
                controls
                playsInline
                preload="metadata"
                src={stimulusUrl}
                style={videoStyle(metrics)}
              >
                Your browser does not support video playback.
              </video>
            )}
          </section>
        )}

        {orderedAssets.length > 0 && (
          <div style={assetGrid(metrics)}>
            {orderedAssets.map((asset) => {
              const url = getPublicUrl(
                asset.storage_bucket,
                asset.storage_path,
              );

              if (!url) return null;

              if (
                asset.asset_type === "image" ||
                asset.asset_type === "svg"
              ) {
                return (
                  <ImageFrame
                    key={asset.id}
                    src={url}
                    alt={asset.alt_text || "Question image"}
                    caption={asset.caption}
                    metrics={metrics}
                    objectFit={
                      metadataValue(asset.metadata, "object_fit") === "cover"
                        ? "cover"
                        : "contain"
                    }
                    onOpen={() =>
                      setPreview({
                        src: url,
                        alt: asset.alt_text || "Question image",
                        caption: asset.caption,
                      })
                    }
                  />
                );
              }

              if (asset.asset_type === "audio") {
                return (
                  <figure key={asset.id} style={assetFigure(metrics)}>
                    <audio
                      controls
                      preload="metadata"
                      src={url}
                      style={audioStyle}
                    >
                      Your browser does not support audio playback.
                    </audio>
                    {asset.caption && (
                      <figcaption style={captionStyle(metrics)}>
                        {asset.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              return (
                <figure key={asset.id} style={assetFigure(metrics)}>
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={getPosterUrl(asset) || undefined}
                    src={url}
                    style={videoStyle(metrics)}
                  >
                    Your browser does not support video playback.
                  </video>
                  {asset.caption && (
                    <figcaption style={captionStyle(metrics)}>
                      {asset.caption}
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded question image"
          style={lightboxBackdrop}
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            aria-label="Close expanded image"
            onClick={() => setPreview(null)}
            style={closeButton}
          >
            ×
          </button>

          <figure
            style={lightboxFigure}
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={preview.src}
              alt={preview.alt}
              style={lightboxImage}
            />
            {preview.caption && (
              <figcaption style={lightboxCaption}>
                {preview.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}

function ImageFrame({
  src,
  alt,
  caption,
  metrics,
  objectFit = "contain",
  onOpen,
}: {
  src: string;
  alt: string;
  caption: string | null;
  metrics: MediaMetrics;
  objectFit?: "contain" | "cover";
  onOpen: () => void;
}) {
  return (
    <figure style={assetFigure(metrics)}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Expand image: ${alt}`}
        style={imageButton(metrics)}
      >
        <img
          src={src}
          alt={alt}
          loading="eager"
          style={{
            ...imageStyle(metrics),
            objectFit,
          }}
        />
        <span style={expandBadge}>Expand</span>
      </button>
      {caption && (
        <figcaption style={captionStyle(metrics)}>{caption}</figcaption>
      )}
    </figure>
  );
}

function mediaStack(metrics: MediaMetrics): CSSProperties {
  return {
    display: "grid",
    gap: metrics.stackGap,
    margin: metrics.stackMargin,
  };
}

function mediaCard(
  metrics: MediaMetrics,
  variant: CoreMediaVariant,
): CSSProperties {
  return {
    padding: metrics.cardPadding,
    borderRadius: metrics.cardRadius,
    border:
      variant === "math"
        ? "1px solid rgba(125,211,252,0.14)"
        : "1px solid rgba(126,232,255,0.24)",
    background:
      variant === "math"
        ? "rgba(2,10,25,0.18)"
        : "rgba(7,22,39,0.72)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    boxSizing: "border-box",
  };
}

function mediaTitle(metrics: MediaMetrics): CSSProperties {
  return {
    margin: "0 0 7px",
    fontSize: metrics.titleSize,
    lineHeight: 1.25,
    color: "#ffffff",
  };
}

function stimulusText(metrics: MediaMetrics): CSSProperties {
  return {
    margin: 0,
    whiteSpace: "pre-wrap",
    fontSize: metrics.bodySize,
    lineHeight: 1.65,
    color: "rgba(255,255,255,0.9)",
  };
}

function assetGrid(metrics: MediaMetrics): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${metrics.gridMinWidth}px), 1fr))`,
    gap: metrics.gridGap,
  };
}

function assetFigure(metrics: MediaMetrics): CSSProperties {
  return {
    width: "100%",
    margin: 0,
    padding: metrics.figurePadding,
    borderRadius: metrics.figureRadius,
    border: "1px solid rgba(255,255,255,0.11)",
    background: "rgba(255,255,255,0.045)",
    boxSizing: "border-box",
    minWidth: 0,
  };
}

function imageButton(metrics: MediaMetrics): CSSProperties {
  return {
    position: "relative",
    display: "block",
    width: "100%",
    padding: 0,
    overflow: "hidden",
    border: "none",
    borderRadius: Math.max(9, metrics.figureRadius - 5),
    background: "rgba(255,255,255,0.96)",
    cursor: "zoom-in",
  };
}

function imageStyle(metrics: MediaMetrics): CSSProperties {
  return {
    display: "block",
    width: "100%",
    height: metrics.imageHeight ?? "auto",
    maxHeight: metrics.imageMaxHeight,
    minHeight: metrics.imageMinHeight,
    objectPosition: "center",
  };
}

const expandBadge: CSSProperties = {
  position: "absolute",
  right: "9px",
  bottom: "9px",
  padding: "5px 8px",
  borderRadius: "999px",
  background: "rgba(2,8,19,0.78)",
  color: "white",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.04em",
};

function captionStyle(metrics: MediaMetrics): CSSProperties {
  return {
    marginTop: "7px",
    color: "rgba(255,255,255,0.72)",
    fontSize: metrics.captionSize,
    lineHeight: 1.4,
  };
}

const audioStyle: CSSProperties = {
  display: "block",
  width: "100%",
};

function videoStyle(metrics: MediaMetrics): CSSProperties {
  return {
    display: "block",
    width: "100%",
    maxHeight: metrics.videoMaxHeight,
    borderRadius: Math.max(9, metrics.figureRadius - 5),
    background: "#000",
  };
}

const tableScroller: CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "440px",
  borderCollapse: "collapse",
  color: "white",
};

function tableHeaderCell(metrics: MediaMetrics): CSSProperties {
  return {
    padding: metrics.tableCellPadding,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(126,232,255,0.14)",
    textAlign: "left",
  };
}

function tableCell(metrics: MediaMetrics): CSSProperties {
  return {
    padding: metrics.tableCellPadding,
    border: "1px solid rgba(255,255,255,0.14)",
    verticalAlign: "top",
  };
}

const lightboxBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  display: "grid",
  placeItems: "center",
  padding: "20px",
  background: "rgba(1,5,12,0.94)",
  backdropFilter: "blur(12px)",
};

const closeButton: CSSProperties = {
  position: "fixed",
  top: "16px",
  right: "18px",
  zIndex: 10001,
  width: "44px",
  height: "44px",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  fontSize: "28px",
  lineHeight: 1,
  cursor: "pointer",
};

const lightboxFigure: CSSProperties = {
  display: "grid",
  gap: "10px",
  maxWidth: "min(96vw, 1400px)",
  maxHeight: "92dvh",
  margin: 0,
};

const lightboxImage: CSSProperties = {
  display: "block",
  maxWidth: "100%",
  maxHeight: "84dvh",
  margin: "0 auto",
  objectFit: "contain",
  borderRadius: "12px",
  background: "white",
};

const lightboxCaption: CSSProperties = {
  color: "rgba(255,255,255,0.82)",
  textAlign: "center",
  fontSize: "14px",
  lineHeight: 1.45,
};
