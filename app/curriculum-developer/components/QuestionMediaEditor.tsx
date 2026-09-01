"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  assetTypeFromFile,
  publicMediaUrl,
  type OptionImageDraft,
  type QuestionAssetDraft,
  type QuestionMediaDraft,
  type StimulusDraft,
} from "../media";
import type { CoreStimulusType, SupportedQuestionType } from "../types";
import { CropImageButton } from "./ImageCropEditor";

const STIMULUS_TYPES: Array<[CoreStimulusType, string]> = [
  ["passage", "Passage"],
  ["visual_text", "Visual text / notice"],
  ["image", "Image"],
  ["diagram", "Diagram"],
  ["graph", "Graph"],
  ["audio", "Audio"],
  ["video", "Video"],
];

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fileAcceptForStimulus(type: CoreStimulusType) {
  if (["image", "diagram", "graph"].includes(type)) {
    return "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";
  }
  if (type === "audio") return "audio/mpeg,audio/mp4,audio/ogg,audio/wav";
  if (type === "video") return "video/mp4,video/webm,video/quicktime";
  return undefined;
}

function isTextStimulus(type: CoreStimulusType) {
  return ["passage", "visual_text", "table"].includes(type);
}

function defaultOptionImage(optionId: string): OptionImageDraft {
  return {
    optionId,
    existingUrl: null,
    existingBucket: null,
    existingPath: null,
    file: null,
    altText: "",
    showTextWithImage: true,
    removed: false,
  };
}

export default function QuestionMediaEditor({
  value,
  questionType,
  optionLabels,
  disabled,
  onChange,
}: {
  value: QuestionMediaDraft;
  questionType: SupportedQuestionType;
  optionLabels: string[];
  disabled: boolean;
  onChange: (value: QuestionMediaDraft) => void;
}) {
  const activeAssets = value.assets.filter((asset) => !asset.removed);

  function updateStimulus(patch: Partial<StimulusDraft>) {
    onChange({
      ...value,
      stimulus: {
        ...value.stimulus,
        ...patch,
        dirty: true,
      },
    });
  }

  function changeStimulusType(type: CoreStimulusType) {
    updateStimulus({
      type,
      mode: isTextStimulus(type) ? "text" : "media",
      file: null,
    });
  }

  function addAssets(files: FileList | null) {
    if (!files?.length) return;

    const additions: QuestionAssetDraft[] = Array.from(files).map((file) => ({
      localId: randomId(),
      existingId: null,
      assetType: assetTypeFromFile(file),
      existingBucket: null,
      existingPath: null,
      file,
      altText: "",
      caption: "",
      objectFit: "contain",
      removed: false,
    }));

    onChange({ ...value, assets: [...value.assets, ...additions] });
  }

  function updateAsset(localId: string, patch: Partial<QuestionAssetDraft>) {
    onChange({
      ...value,
      assets: value.assets.map((asset) =>
        asset.localId === localId ? { ...asset, ...patch } : asset,
      ),
    });
  }

  function removeAsset(asset: QuestionAssetDraft) {
    if (asset.existingId) {
      updateAsset(asset.localId, { removed: true, file: null });
      return;
    }

    onChange({
      ...value,
      assets: value.assets.filter((item) => item.localId !== asset.localId),
    });
  }

  function updateOptionImage(optionId: string, patch: Partial<OptionImageDraft>) {
    const current = value.optionImages[optionId] || defaultOptionImage(optionId);
    onChange({
      ...value,
      optionImages: {
        ...value.optionImages,
        [optionId]: { ...current, ...patch },
      },
    });
  }

  return (
    <section style={mediaPanel}>
      <div style={headingRow}>
        <div>
          <p style={eyebrow}>QUESTION MEDIA</p>
          <h4 style={sectionTitle}>Images, audio, video and shared material</h4>
          <p style={description}>
            Media is optional. Add a shared passage or clip, question-specific
            files, or images for individual answer choices.
          </p>
        </div>
        <span style={mediaCountBadge}>
          {activeAssets.length + (value.stimulus.mode === "none" ? 0 : 1)} item
          {activeAssets.length + (value.stimulus.mode === "none" ? 0 : 1) === 1
            ? ""
            : "s"}
        </span>
      </div>

      <div style={sectionBlock}>
        <div style={sectionHeadingRow}>
          <div>
            <p style={smallEyebrow}>SHARED STIMULUS</p>
            <h5 style={smallTitle}>Material shown before the question</h5>
          </div>
          <select
            value={value.stimulus.mode === "none" ? "none" : value.stimulus.type}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "none") {
                updateStimulus({ mode: "none", file: null });
              } else {
                changeStimulusType(next as CoreStimulusType);
              }
            }}
            style={selectInput}
          >
            <option value="none">No shared stimulus</option>
            {STIMULUS_TYPES.map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {value.stimulus.mode !== "none" && (
          <div style={editorGrid}>
            <label style={fieldLabel}>
              Optional title
              <input
                value={value.stimulus.title}
                disabled={disabled}
                onChange={(event) => updateStimulus({ title: event.target.value })}
                placeholder="e.g. Read the poster"
                style={input}
              />
            </label>

            {isTextStimulus(value.stimulus.type) ? (
              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Passage or visual-text content
                <textarea
                  value={value.stimulus.bodyText}
                  disabled={disabled}
                  onChange={(event) =>
                    updateStimulus({ bodyText: event.target.value })
                  }
                  rows={7}
                  placeholder="Enter the passage, notice or shared text here."
                  style={textArea}
                />
              </label>
            ) : (
              <>
                <label style={fieldLabel}>
                  Upload {value.stimulus.type}
                  <input
                    type="file"
                    accept={fileAcceptForStimulus(value.stimulus.type)}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStimulus({ file: event.target.files?.[0] || null })
                    }
                    style={fileInput}
                  />
                </label>

                <MediaPreview
                  file={value.stimulus.file}
                  bucket={value.stimulus.existingBucket}
                  path={value.stimulus.existingPath}
                  mediaType={value.stimulus.type}
                  alt={value.stimulus.altText || "Stimulus preview"}
                />

                {["image", "diagram", "graph"].includes(value.stimulus.type) && (
                  <CropImageButton
                    file={value.stimulus.file}
                    url={publicMediaUrl(
                      value.stimulus.existingBucket,
                      value.stimulus.existingPath,
                    )}
                    alt={value.stimulus.altText || "Stimulus preview"}
                    title="Crop / Reposition Shared Stimulus"
                    disabled={disabled}
                    filenameHint={`stimulus-${value.stimulus.type}`}
                    onCropped={(file) => updateStimulus({ file })}
                  />
                )}
              </>
            )}

            <label style={fieldLabel}>
              Alternative text
              <input
                value={value.stimulus.altText}
                disabled={disabled}
                onChange={(event) => updateStimulus({ altText: event.target.value })}
                placeholder="Describe what the learner needs to know from the media."
                style={input}
              />
            </label>

            {(value.stimulus.type === "audio" ||
              value.stimulus.type === "video") && (
              <label style={{ ...fieldLabel, gridColumn: "1 / -1" }}>
                Transcript
                <textarea
                  value={value.stimulus.transcript}
                  disabled={disabled}
                  onChange={(event) =>
                    updateStimulus({ transcript: event.target.value })
                  }
                  rows={4}
                  placeholder="Enter the spoken content for accessibility and teacher review."
                  style={textArea}
                />
              </label>
            )}
          </div>
        )}
      </div>

      <div style={sectionBlock}>
        <div style={sectionHeadingRow}>
          <div>
            <p style={smallEyebrow}>QUESTION ATTACHMENTS</p>
            <h5 style={smallTitle}>Files used only by this question</h5>
          </div>
          <label style={uploadButton}>
            + Add Media
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,audio/mpeg,audio/mp4,audio/ogg,audio/wav,video/mp4,video/webm,video/quicktime"
              disabled={disabled}
              onChange={(event) => {
                addAssets(event.target.files);
                event.currentTarget.value = "";
              }}
              style={hiddenFileInput}
            />
          </label>
        </div>

        {activeAssets.length === 0 ? (
          <div style={emptyState}>No question-specific media attached.</div>
        ) : (
          <div style={assetGrid}>
            {activeAssets.map((asset) => (
              <article key={asset.localId} style={assetCard}>
                <MediaPreview
                  file={asset.file}
                  bucket={asset.existingBucket}
                  path={asset.existingPath}
                  mediaType={asset.assetType}
                  alt={asset.altText || "Question media preview"}
                />

                {(asset.assetType === "image" || asset.assetType === "svg") && !asset.removed && (
                  <div style={{ padding: "0 11px 2px" }}>
                    <CropImageButton
                      file={asset.file}
                      url={publicMediaUrl(asset.existingBucket, asset.existingPath)}
                      alt={asset.altText || "Question media preview"}
                      title="Crop / Reposition Question Image"
                      disabled={disabled}
                      filenameHint={`question-image-${asset.localId}`}
                      onCropped={(file) =>
                        updateAsset(asset.localId, {
                          file,
                          assetType: assetTypeFromFile(file),
                        })
                      }
                    />
                  </div>
                )}

                <div style={assetFields}>
                  <p style={assetTypeLabel}>{asset.assetType}</p>
                  <label style={fieldLabel}>
                    Alternative text
                    <input
                      value={asset.altText}
                      disabled={disabled}
                      onChange={(event) =>
                        updateAsset(asset.localId, { altText: event.target.value })
                      }
                      style={input}
                    />
                  </label>
                  <label style={fieldLabel}>
                    Caption
                    <input
                      value={asset.caption}
                      disabled={disabled}
                      onChange={(event) =>
                        updateAsset(asset.localId, { caption: event.target.value })
                      }
                      style={input}
                    />
                  </label>
                  {(asset.assetType === "image" || asset.assetType === "svg") && (
                    <label style={fieldLabel}>
                      Image fitting
                      <select
                        value={asset.objectFit}
                        disabled={disabled}
                        onChange={(event) =>
                          updateAsset(asset.localId, {
                            objectFit: event.target.value as "contain" | "cover",
                          })
                        }
                        style={selectInput}
                      >
                        <option value="contain">Show complete image</option>
                        <option value="cover">Fill the frame</option>
                      </select>
                    </label>
                  )}
                  {asset.existingId && (
                    <label style={replaceLabel}>
                      Replace file
                      <input
                        type="file"
                        accept="image/*,audio/*,video/*,.svg"
                        disabled={disabled}
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          if (!file) return;
                          updateAsset(asset.localId, {
                            file,
                            assetType: assetTypeFromFile(file),
                          });
                        }}
                        style={fileInput}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeAsset(asset)}
                    style={removeButton}
                  >
                    Remove Media
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {["multiple_choice", "multiple_select"].includes(questionType) && (
        <div style={sectionBlock}>
          <div>
            <p style={smallEyebrow}>ANSWER-OPTION IMAGES</p>
            <h5 style={smallTitle}>Optional image for each answer</h5>
          </div>

          <div style={optionImageGrid}>
            {optionLabels.slice(0, 4).map((label, index) => {
              const optionId = String.fromCharCode(97 + index);
              const optionImage =
                value.optionImages[optionId] || defaultOptionImage(optionId);

              return (
                <article key={optionId} style={optionImageCard}>
                  <div style={optionHeading}>
                    <span style={optionLetter}>{optionId.toUpperCase()}</span>
                    <strong style={optionText}>{label || `Option ${optionId.toUpperCase()}`}</strong>
                  </div>

                  {!optionImage.removed &&
                    (optionImage.file || optionImage.existingUrl || optionImage.existingPath) && (
                      <MediaPreview
                        file={optionImage.file}
                        directUrl={optionImage.existingUrl}
                        bucket={optionImage.existingBucket}
                        path={optionImage.existingPath}
                        mediaType="image"
                        alt={optionImage.altText || label || "Answer option image"}
                      />
                    )}

                  {!optionImage.removed &&
                    (optionImage.file || optionImage.existingUrl || optionImage.existingPath) && (
                      <CropImageButton
                        file={optionImage.file}
                        url={
                          optionImage.existingUrl ||
                          publicMediaUrl(
                            optionImage.existingBucket,
                            optionImage.existingPath,
                          )
                        }
                        alt={optionImage.altText || label || "Answer option image"}
                        title={`Crop / Reposition Option ${optionId.toUpperCase()}`}
                        disabled={disabled}
                        filenameHint={`option-${optionId}`}
                        onCropped={(file) =>
                          updateOptionImage(optionId, {
                            file,
                            removed: false,
                          })
                        }
                      />
                    )}

                  <label style={fieldLabel}>
                    Image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      disabled={disabled}
                      onChange={(event) =>
                        updateOptionImage(optionId, {
                          file: event.target.files?.[0] || null,
                          removed: false,
                        })
                      }
                      style={fileInput}
                    />
                  </label>

                  <label style={fieldLabel}>
                    Alternative text
                    <input
                      value={optionImage.altText}
                      disabled={disabled}
                      onChange={(event) =>
                        updateOptionImage(optionId, {
                          altText: event.target.value,
                          removed: false,
                        })
                      }
                      style={input}
                    />
                  </label>

                  {(optionImage.file || optionImage.existingUrl || optionImage.existingPath) &&
                    !optionImage.removed && (
                      <label style={checkLabel}>
                        <input
                          type="checkbox"
                          checked={optionImage.showTextWithImage}
                          disabled={disabled}
                          onChange={(event) =>
                            updateOptionImage(optionId, {
                              showTextWithImage: event.target.checked,
                              removed: false,
                            })
                          }
                        />
                        Show answer text together with the image
                      </label>
                    )}

                  {(optionImage.file || optionImage.existingUrl || optionImage.existingPath) &&
                    !optionImage.removed && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          updateOptionImage(optionId, {
                            file: null,
                            removed: true,
                          })
                        }
                        style={removeButton}
                      >
                        Remove Option Image
                      </button>
                    )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div style={noticeBox}>
        PNG, WebP, JPEG and SVG images are supported. Replacing or removing an
        image updates the live question reference; physical orphan-file cleanup
        is intentionally deferred to the later storage-cleanup phase.
      </div>
    </section>
  );
}

function MediaPreview({
  file,
  directUrl,
  bucket,
  path,
  mediaType,
  alt,
}: {
  file?: File | null;
  directUrl?: string | null;
  bucket?: string | null;
  path?: string | null;
  mediaType: CoreStimulusType | "svg";
  alt: string;
}) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setLocalUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const url = useMemo(
    () => localUrl || directUrl || publicMediaUrl(bucket, path),
    [bucket, directUrl, localUrl, path],
  );

  if (!url) return <div style={previewPlaceholder}>No file selected</div>;

  if (["image", "diagram", "graph", "svg"].includes(mediaType)) {
    return <img src={url} alt={alt} style={imagePreview} />;
  }

  if (mediaType === "audio") {
    return <audio controls preload="metadata" src={url} style={audioPreview} />;
  }

  return <video controls playsInline preload="metadata" src={url} style={videoPreview} />;
}

const mediaPanel: CSSProperties = {
  marginTop: "14px",
  borderRadius: "20px",
  border: "1px solid rgba(198,166,255,0.32)",
  background: "linear-gradient(145deg,rgba(55,29,92,0.28),rgba(6,22,48,0.72))",
  padding: "clamp(14px,2.2vw,20px)",
  display: "grid",
  gap: "14px",
};
const headingRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};
const sectionHeadingRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#e7b7ff",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.15em",
};
const smallEyebrow: CSSProperties = {
  ...eyebrow,
  color: "#7ee8ff",
  fontSize: "9px",
};
const sectionTitle: CSSProperties = {
  margin: "5px 0 0",
  fontSize: "18px",
};
const smallTitle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "15px",
};
const description: CSSProperties = {
  margin: "7px 0 0",
  maxWidth: "680px",
  color: "rgba(255,255,255,0.58)",
  fontSize: "12px",
  lineHeight: 1.5,
};
const mediaCountBadge: CSSProperties = {
  minHeight: "30px",
  borderRadius: "999px",
  border: "1px solid rgba(231,183,255,0.3)",
  background: "rgba(168,85,247,0.12)",
  padding: "0 10px",
  display: "inline-flex",
  alignItems: "center",
  color: "#f2d7ff",
  fontSize: "10px",
  fontWeight: 900,
};
const sectionBlock: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(255,255,255,0.035)",
  padding: "13px",
};
const editorGrid: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
  gap: "10px",
  alignItems: "start",
};
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "rgba(255,255,255,0.66)",
  fontSize: "11px",
  fontWeight: 800,
};
const input: CSSProperties = {
  width: "100%",
  minHeight: "42px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.22)",
  background: "#102442",
  color: "white",
  padding: "8px 10px",
  outline: "none",
};
const selectInput: CSSProperties = {
  ...input,
  width: "auto",
  minWidth: "190px",
  colorScheme: "dark",
};
const textArea: CSSProperties = {
  ...input,
  resize: "vertical",
  lineHeight: 1.5,
};
const fileInput: CSSProperties = {
  ...input,
  paddingTop: "9px",
  colorScheme: "dark",
};
const hiddenFileInput: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
};
const uploadButton: CSSProperties = {
  position: "relative",
  minHeight: "38px",
  borderRadius: "10px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(53,197,255,0.12)",
  color: "white",
  padding: "0 13px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 900,
};
const emptyState: CSSProperties = {
  marginTop: "10px",
  borderRadius: "12px",
  border: "1px dashed rgba(126,232,255,0.18)",
  padding: "14px",
  color: "rgba(255,255,255,0.45)",
  textAlign: "center",
  fontSize: "12px",
};
const assetGrid: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
  gap: "10px",
};
const assetCard: CSSProperties = {
  minWidth: 0,
  borderRadius: "14px",
  border: "1px solid rgba(126,232,255,0.18)",
  background: "rgba(3,15,34,0.55)",
  overflow: "hidden",
};
const assetFields: CSSProperties = {
  padding: "11px",
  display: "grid",
  gap: "9px",
};
const assetTypeLabel: CSSProperties = {
  margin: 0,
  color: "#7ee8ff",
  fontSize: "9px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};
const replaceLabel: CSSProperties = {
  ...fieldLabel,
  marginTop: "2px",
};
const removeButton: CSSProperties = {
  minHeight: "36px",
  borderRadius: "9px",
  border: "1px solid rgba(248,113,113,0.28)",
  background: "rgba(239,68,68,0.08)",
  color: "#fecaca",
  padding: "0 11px",
  cursor: "pointer",
  fontSize: "10px",
  fontWeight: 900,
};
const optionImageGrid: CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "9px",
};
const optionImageCard: CSSProperties = {
  minWidth: 0,
  borderRadius: "13px",
  border: "1px solid rgba(126,232,255,0.16)",
  background: "rgba(3,15,34,0.48)",
  padding: "10px",
  display: "grid",
  gap: "9px",
};
const optionHeading: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
};
const optionLetter: CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  background: "rgba(126,232,255,0.13)",
  display: "grid",
  placeItems: "center",
  color: "#7ee8ff",
  fontWeight: 900,
  flexShrink: 0,
};
const optionText: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "12px",
};
const checkLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "rgba(255,255,255,0.66)",
  fontSize: "11px",
  fontWeight: 800,
};
const previewPlaceholder: CSSProperties = {
  minHeight: "110px",
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.38)",
  fontSize: "11px",
};
const imagePreview: CSSProperties = {
  display: "block",
  width: "100%",
  height: "min(260px,30vh)",
  objectFit: "contain",
  background: "white",
};
const audioPreview: CSSProperties = {
  display: "block",
  width: "calc(100% - 20px)",
  margin: "10px",
};
const videoPreview: CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: "280px",
  background: "black",
};
const noticeBox: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(255,215,106,0.25)",
  background: "rgba(255,215,106,0.07)",
  color: "#ffe8a9",
  padding: "11px",
  fontSize: "11px",
  lineHeight: 1.5,
};
