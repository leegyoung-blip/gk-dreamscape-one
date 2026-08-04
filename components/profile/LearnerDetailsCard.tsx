"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfileStatus = {
  complete?: boolean;
  date_of_birth?: string | null;
  age_years?: number | null;
  age_band?: string | null;
};

function formatAgeBand(value: string | null | undefined) {
  const labels: Record<string, string> = {
    "4_5": "Ages 4–5",
    "6_7": "Ages 6–7",
    "8_9": "Ages 8–9",
    "10_12": "Ages 10–12",
    "13_15": "Ages 13–15",
    "16_17": "Ages 16–17",
    "18_plus": "Age 18+",
  };

  return value ? labels[value] || value : "Not available";
}

export default function LearnerDetailsCard() {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ageYears, setAgeYears] = useState<number | null>(null);
  const [ageBand, setAgeBand] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadStatus() {
    setLoading(true);

    const { data, error } = await supabase.rpc(
      "get_my_learning_profile_status",
    );

    setLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    const status = (data || {}) as ProfileStatus;

    setDateOfBirth(status.date_of_birth || "");
    setAgeYears(
      typeof status.age_years === "number"
        ? status.age_years
        : null,
    );
    setAgeBand(status.age_band || null);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!dateOfBirth) {
      setMessage("Date of birth is required.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.rpc(
      "update_my_learning_profile",
      {
        p_date_of_birth: dateOfBirth,
      },
    );

    setSaving(false);

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }

    const status = (data || {}) as ProfileStatus;

    setAgeYears(
      typeof status.age_years === "number"
        ? status.age_years
        : null,
    );
    setAgeBand(status.age_band || null);
    setMessage("Learner details saved.");
    setMessageType("success");

    window.dispatchEvent(new Event("learning-profile-updated"));
  }

  const today = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );

  return (
    <section className="rounded-[28px] border border-cyan-200/15 bg-white/[0.045] p-5 text-white backdrop-blur-xl sm:p-7">
      <p className="m-0 text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-200">
        Learner Details
      </p>

      <h2 className="mt-3 text-2xl font-black">
        Age Profile
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
        Nova uses this information to adjust explanations and learning
        recommendations. Your age does not change quiz marks.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-white/55">
          Loading learner details...
        </p>
      ) : (
        <form onSubmit={save} className="mt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_0.7fr_0.8fr]">
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                Date of birth
              </span>

              <input
                type="date"
                required
                max={today}
                value={dateOfBirth}
                onChange={(event) => {
                  setDateOfBirth(event.target.value);
                  setMessage("");
                  setMessageType("");
                }}
                className="h-14 w-full rounded-2xl border border-white/12 bg-[#020a1b]/70 px-4 text-white outline-none focus:border-cyan-200/45"
              />
            </label>

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                Current age
              </span>

              <div className="flex h-14 items-center rounded-2xl border border-white/10 bg-white/5 px-4 font-bold">
                {ageYears === null ? "—" : `${ageYears} years`}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                Nova age band
              </span>

              <div className="flex h-14 items-center rounded-2xl border border-white/10 bg-white/5 px-4 font-bold">
                {formatAgeBand(ageBand)}
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                messageType === "success"
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-300/20 bg-rose-400/10 text-rose-100"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 h-12 rounded-full bg-white px-6 text-sm font-extrabold text-[#071329] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Learner Details"}
          </button>
        </form>
      )}
    </section>
  );
}
