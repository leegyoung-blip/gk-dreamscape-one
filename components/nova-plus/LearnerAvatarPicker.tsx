"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./LearnerAvatarPicker.module.css";

type AvatarPreset = {
  id: string;
  symbol: string;
  label: string;
  className: string;
};

const PRESETS: AvatarPreset[] = [
  { id: "aurora", symbol: "✦", label: "Aurora", className: styles.blue },
  { id: "prism", symbol: "◇", label: "Prism", className: styles.purple },
  { id: "orbit", symbol: "◎", label: "Orbit", className: styles.gold },
  { id: "summit", symbol: "△", label: "Summit", className: styles.cyan },
  { id: "hex", symbol: "⬡", label: "Hex", className: styles.orange },
  { id: "spark", symbol: "✧", label: "Spark", className: styles.green },
];

type StoredAvatar =
  | { kind: "preset"; value: string }
  | { kind: "upload"; value: string };

function storageKey(learnerId: string) {
  return `dreamscape:nova-plus-avatar:${learnerId}`;
}

async function resizeImage(file: File) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });

  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.max(0, (image.naturalWidth - size) / 2);
  const sy = Math.max(0, (image.naturalHeight - size) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(image, sx, sy, size, size, 0, 0, 512, 512);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export default function LearnerAvatarPicker({
  learnerId,
  learnerLabel,
}: {
  learnerId: string;
  learnerLabel: string;
}) {
  const [avatar, setAvatar] = useState<StoredAvatar>({
    kind: "preset",
    value: "aurora",
  });
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(learnerId));
      if (stored) setAvatar(JSON.parse(stored) as StoredAvatar);
      else setAvatar({ kind: "preset", value: "aurora" });
    } catch {
      setAvatar({ kind: "preset", value: "aurora" });
    }
  }, [learnerId]);

  function save(next: StoredAvatar) {
    setAvatar(next);
    try {
      localStorage.setItem(storageKey(learnerId), JSON.stringify(next));
    } catch {
      // Browser storage may be unavailable. The selection still works for this session.
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      save({ kind: "upload", value: dataUrl });
      setOpen(false);
    } finally {
      setUploading(false);
    }
  }

  const preset = useMemo(
    () => PRESETS.find((item) => item.id === avatar.value) ?? PRESETS[0],
    [avatar],
  );

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Change ${learnerLabel}'s learner picture`}
      >
        {avatar.kind === "upload" ? (
          <img src={avatar.value} alt="Learner profile" />
        ) : (
          <span className={`${styles.presetFace} ${preset.className}`}>
            {preset.symbol}
          </span>
        )}
        <span className={styles.editBadge}>✎</span>
      </button>

      {open && (
        <div className={styles.picker}>
          <div className={styles.heading}>
            <div>
              <strong>Choose learner picture</strong>
              <small>Use a graphic or your own image.</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </div>

          <div className={styles.presetGrid}>
            {PRESETS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={avatar.kind === "preset" && avatar.value === item.id ? styles.selected : ""}
                onClick={() => {
                  save({ kind: "preset", value: item.id });
                  setOpen(false);
                }}
                aria-label={item.label}
              >
                <span className={`${styles.presetFace} ${item.className}`}>{item.symbol}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <span>＋</span>
            {uploading ? "Preparing image…" : "Choose image from device"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleUpload}
          />
        </div>
      )}
    </div>
  );
}
