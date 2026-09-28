"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CreatorClub = {
  club_id: string;
  club_name: string;
  club_slug: string;
  topic: string | null;
  status: string;
};

type ClubDetail = {
  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  logo_image_url: string | null;
  cover_image_url: string | null;
};

const DEFAULT_BACKGROUND =
  "/milo-world/quiz-hall/backgrounds/dreamscape-core-glow.png";

const BACKGROUNDS = [
  {
    label: "Dreamscape Core Glow",
    url: DEFAULT_BACKGROUND,
  },
  {
    label: "Knowledge Grid",
    url: "/milo-world/quiz-hall/backgrounds/knowledge-grid.png",
  },
  {
    label: "Neon Horizon",
    url: "/milo-world/quiz-hall/backgrounds/neon-horizon.png",
  },
  {
    label: "Adventure Map",
    url: "/milo-world/quiz-hall/backgrounds/adventure-map.png",
  },
  {
    label: "Cosmic Arena",
    url: "/milo-world/quiz-hall/backgrounds/cosmic-arena.png",
  },
];

const INTERESTS = [
  "Football",
  "K-Pop",
  "Science & Technology",
  "Sports",
  "Animals & Nature",
  "World & History",
  "Games & Strategy",
  "Entertainment",
  "Cars & Machines",
  "Creative Skills",
];

const BUCKET = "creator-club-media";
const MAX_BYTES = 5 * 1024 * 1024;

function ext(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName === "png" || fromName === "webp") return fromName;
  return "jpg";
}

async function upload(file: File, slug: string, kind: "logo" | "background") {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Use a PNG, JPG or WebP image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image files must be 5 MB or smaller.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Log in again before uploading.");

  const path = `${user.id}/${slug}/${kind}-${Date.now()}.${ext(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function CreatorClubSettingsPanel({
  clubs,
  onSaved,
}: {
  clubs: CreatorClub[];
  onSaved?: () => void;
}) {
  const [selectedId, setSelectedId] = useState(clubs[0]?.club_id || "");
  const [detail, setDetail] = useState<ClubDetail | null>(null);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState(DEFAULT_BACKGROUND);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedClub = useMemo(
    () => clubs.find((club) => club.club_id === selectedId) || clubs[0] || null,
    [clubs, selectedId],
  );

  useEffect(() => {
    if (!selectedClub) return;
    void load(selectedClub.club_id);
  }, [selectedClub?.club_id]);

  async function load(clubId: string) {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_get_my_club_settings_v1",
      {
        p_club_id: clubId,
      },
    );

    if (error) {
      setErrorMessage("Club settings could not be loaded.");
      setLoading(false);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as ClubDetail | null;
    if (!row) {
      setErrorMessage(
        "Your club exists, but its editable settings could not be resolved. Refresh once and try again.",
      );
      setLoading(false);
      return;
    }

    setDetail(row);
    setName(String(row.club_name || ""));
    setTopic(String(row.topic || ""));
    setTagline(String(row.tagline || ""));
    setDescription(String(row.description || ""));
    setLogoUrl(String(row.logo_image_url || ""));
    setBackgroundUrl(String(row.cover_image_url || DEFAULT_BACKGROUND));
    setLogoFile(null);
    setBackgroundFile(null);
    setLoading(false);
  }

  async function save() {
    if (!detail) return;

    if (name.trim().length < 3) {
      setErrorMessage("Club name must be at least 3 characters.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      let nextLogo = logoUrl;
      let nextBackground = backgroundUrl || DEFAULT_BACKGROUND;

      if (logoFile) {
        nextLogo = await upload(logoFile, detail.club_slug, "logo");
      }
      if (backgroundFile) {
        nextBackground = await upload(
          backgroundFile,
          detail.club_slug,
          "background",
        );
      }

      const { error } = await supabase.rpc("creator_update_my_club_settings_v1", {
        p_club_id: detail.club_id,
        p_club_name: name.trim(),
        p_topic: topic,
        p_tagline: tagline.trim(),
        p_description: description.trim(),
        p_logo_image_url: nextLogo || null,
        p_background_image_url: nextBackground,
      });

      if (error) throw error;

      setLogoUrl(nextLogo);
      setBackgroundUrl(nextBackground);
      setLogoFile(null);
      setBackgroundFile(null);
      setMessage("Club settings saved.");
      onSaved?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Club settings could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (clubs.length === 0) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
        <h2 className="text-xl font-black">Create a club first.</h2>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/58">
            Club Settings
          </p>
          <h2 className="mt-1 text-2xl font-black">Manage how your club appears.</h2>
          <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/38">
            Your background is shared by the club page and every challenge in this club.
          </p>
        </div>

        {clubs.length > 1 && (
          <select
            value={selectedClub?.club_id || ""}
            onChange={(event) => setSelectedId(event.target.value)}
            className={inputClass}
          >
            {clubs.map((club) => (
              <option key={club.club_id} value={club.club_id}>
                {club.club_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {(message || errorMessage) && (
        <div className="mt-4">
          {message && (
            <p className="rounded-xl border border-emerald-200/14 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-100">
              {message}
            </p>
          )}
          {errorMessage && (
            <p className="rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <p className="mt-5 text-xs text-white/36">Loading club settings...</p>
      ) : detail ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Club name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
              />
            </label>

            <label>
              <span className={labelClass}>Club URL</span>
              <input
                value={detail.club_slug}
                readOnly
                className={`${inputClass} opacity-55`}
              />
              <small className="mt-1 block text-[8px] text-white/24">
                Club URLs stay fixed after creation.
              </small>
            </label>

            <label>
              <span className={labelClass}>Interest</span>
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className={inputClass}
              >
                {INTERESTS.map((interest) => (
                  <option key={interest} value={interest}>
                    {interest}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={labelClass}>Tagline</span>
              <input
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                maxLength={180}
                className={inputClass}
              />
            </label>

            <label className="md:col-span-2">
              <span className={labelClass}>About this club</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                maxLength={1200}
                className={textareaClass}
              />
            </label>

            <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
              <FilePicker
                label="Club logo"
                file={logoFile}
                currentUrl={logoUrl}
                onChange={setLogoFile}
              />
              <FilePicker
                label="Custom background"
                file={backgroundFile}
                currentUrl={backgroundUrl}
                onChange={(file) => {
                  setBackgroundFile(file);
                  if (file) setBackgroundUrl("");
                }}
              />
            </div>
          </div>

          <aside className="rounded-[22px] border border-cyan-200/12 bg-[#061426] p-4">
            <p className={labelClass}>Club background</p>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => {
                    setBackgroundUrl(item.url);
                    setBackgroundFile(null);
                  }}
                  className={`relative min-h-[90px] overflow-hidden rounded-xl border text-left ${
                    backgroundUrl === item.url && !backgroundFile
                      ? "border-cyan-200/50"
                      : "border-white/8"
                  }`}
                >
                  <img
                    src={item.url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/5" />
                  <span className="relative z-10 flex min-h-[90px] items-end p-2.5 text-[7px] font-black uppercase tracking-[0.06em] text-white">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="mt-4 min-h-11 w-full rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Club Settings"}
            </button>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function FilePicker({
  label,
  file,
  currentUrl,
  onChange,
}: {
  label: string;
  file: File | null;
  currentUrl: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/9 bg-black/14 p-3">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-3">
        {currentUrl && (
          <img
            src={currentUrl}
            alt=""
            className="h-11 w-16 shrink-0 rounded-lg object-cover"
          />
        )}
        <label className="inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-white/12 bg-white/[0.04] px-3 text-[7px] font-black uppercase tracking-[0.07em] text-white/60">
          Choose File
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              onChange(event.target.files?.[0] || null);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <span className="min-w-0 truncate text-[8px] text-white/30">
          {file?.name || "No new file selected"}
        </span>
      </div>
    </div>
  );
}

const labelClass =
  "mb-2 block text-[8px] font-black uppercase tracking-[0.10em] text-white/32";
const inputClass =
  "h-11 w-full rounded-2xl border border-white/10 bg-[#061632]/80 px-4 text-xs text-white outline-none focus:border-cyan-200/30";
const textareaClass =
  "w-full resize-y rounded-2xl border border-white/10 bg-[#061632]/80 px-4 py-3 text-xs leading-5 text-white outline-none focus:border-cyan-200/30";
