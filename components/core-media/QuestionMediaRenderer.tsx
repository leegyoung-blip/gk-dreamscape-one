"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

export type CoreMediaType = "image" | "svg" | "audio" | "video";

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

function StimulusText({
  stimulus,
}: {
  stimulus: CoreQuizStimulus;
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
    ? body.rows.filter(Array.isArray).map((row) => row.map((item) => String(item)))
    : [];

  if (stimulus.stimulus_type === "table" && headers.length > 0) {
    return (
      <div style={tableScroller}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={`${header}-${index}`} style={tableHeaderCell}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} style={tableCell}>
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

  return <p style={stimulusText}>{bodyText}</p>;
}

export default function QuestionMediaRenderer({
  stimulus,
  assets,
}: {
  stimulus?: CoreQuizStimulus | null;
  assets?: CoreQuestionAsset[] | null;
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

  if (!stimulus && orderedAssets.length === 0) return null;

  return (
    <>
      <div style={mediaStack}>
        {stimulus && (
          <section style={mediaCard}>
            {stimulus.title && <h2 style={mediaTitle}>{stimulus.title}</h2>}

            {hasStimulusText && <StimulusText stimulus={stimulus} />}

            {stimulusUrl &&
              ["image", "diagram", "graph"].includes(stimulus.stimulus_type) && (
                <ImageFrame
                  src={stimulusUrl}
                  alt={stimulus.alt_text || "Question stimulus"}
                  caption={stimulus.title}
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
                style={videoStyle}
              >
                Your browser does not support video playback.
              </video>
            )}
          </section>
        )}

        {orderedAssets.length > 0 && (
          <div style={assetGrid}>
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
                  <figure key={asset.id} style={assetFigure}>
                    <audio
                      controls
                      preload="metadata"
                      src={url}
                      style={audioStyle}
                    >
                      Your browser does not support audio playback.
                    </audio>
                    {asset.caption && (
                      <figcaption style={captionStyle}>
                        {asset.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              return (
                <figure key={asset.id} style={assetFigure}>
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={getPosterUrl(asset) || undefined}
                    src={url}
                    style={videoStyle}
                  >
                    Your browser does not support video playback.
                  </video>
                  {asset.caption && (
                    <figcaption style={captionStyle}>
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
  objectFit = "contain",
  onOpen,
}: {
  src: string;
  alt: string;
  caption: string | null;
  objectFit?: "contain" | "cover";
  onOpen: () => void;
}) {
  return (
    <figure style={assetFigure}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Expand image: ${alt}`}
        style={imageButton}
      >
        <img
          src={src}
          alt={alt}
          loading="eager"
          style={{
            ...imageStyle,
            objectFit,
          }}
        />
        <span style={expandBadge}>Expand</span>
      </button>
      {caption && <figcaption style={captionStyle}>{caption}</figcaption>}
    </figure>
  );
}

const mediaStack: CSSProperties = {
  display: "grid",
  gap: "14px",
  margin: "12px 0 18px",
};

const mediaCard: CSSProperties = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(7,22,39,0.72)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

const mediaTitle: CSSProperties = {
  margin: "0 0 10px",
  fontSize: "18px",
  lineHeight: 1.25,
  color: "#ffffff",
};

const stimulusText: CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: "clamp(15px, 1.8vw, 18px)",
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.9)",
};

const assetGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "14px",
};

const assetFigure: CSSProperties = {
  width: "100%",
  margin: 0,
  padding: "12px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.055)",
};

const imageButton: CSSProperties = {
  position: "relative",
  display: "block",
  width: "100%",
  padding: 0,
  overflow: "hidden",
  border: "none",
  borderRadius: "13px",
  background: "rgba(255,255,255,0.96)",
  cursor: "zoom-in",
};

const imageStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  maxHeight: "min(48dvh, 520px)",
  minHeight: "120px",
  objectPosition: "center",
};

const expandBadge: CSSProperties = {
  position: "absolute",
  right: "10px",
  bottom: "10px",
  padding: "6px 9px",
  borderRadius: "999px",
  background: "rgba(2,8,19,0.78)",
  color: "white",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const captionStyle: CSSProperties = {
  marginTop: "9px",
  color: "rgba(255,255,255,0.72)",
  fontSize: "13px",
  lineHeight: 1.45,
};

const audioStyle: CSSProperties = {
  display: "block",
  width: "100%",
};

const videoStyle: CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: "min(52dvh, 560px)",
  borderRadius: "13px",
  background: "#000",
};

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

const tableHeaderCell: CSSProperties = {
  padding: "10px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(126,232,255,0.14)",
  textAlign: "left",
};

const tableCell: CSSProperties = {
  padding: "10px",
  border: "1px solid rgba(255,255,255,0.14)",
  verticalAlign: "top",
};

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
