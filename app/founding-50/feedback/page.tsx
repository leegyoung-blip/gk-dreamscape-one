"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./FeedbackPage.module.css";

const RATINGS = [
  { key: "overall", label: "Overall experience", hint: "How was your family's experience with DREAMSCAPE ONE?" },
  { key: "ease", label: "Ease of use", hint: "How easy was it to find your way around Nova's World?" },
  { key: "engagement", label: "Child engagement", hint: "How much did the activities keep your child interested?" },
  { key: "learning", label: "Learning usefulness", hint: "How helpful did you find the learning activities?" },
  { key: "reliability", label: "Platform reliability", hint: "How smoothly did the experience work on your devices?" },
] as const;

type RatingKey = (typeof RATINGS)[number]["key"];
type Favourite = "mission_centre" | "think_lab" | "knowledge_arena" | "skyforge_hangar" | "nova_home" | "not_explored";
type Recommendation = "yes" | "maybe" | "no";
type Screen = "loading" | "ready" | "early" | "complete" | "not_found" | "error";
type FeedbackStatus = {
  application?: {
    student_name?: string;
    status?: string;
    beta_starts_at?: string | null;
    survey_completed_at?: string | null;
  } | null;
  surveyAvailable?: boolean;
};

const FAVOURITES: { id: Favourite; label: string; icon: string }[] = [
  { id: "mission_centre", label: "Mission Centre", icon: "✦" },
  { id: "think_lab", label: "Think Lab", icon: "◇" },
  { id: "knowledge_arena", label: "Knowledge Arena", icon: "⚡" },
  { id: "skyforge_hangar", label: "Skyforge Hangar", icon: "✧" },
  { id: "nova_home", label: "Nova Home", icon: "⌂" },
  { id: "not_explored", label: "Not explored enough yet", icon: "○" },
];

export default function Founding50Feedback() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [scores, setScores] = useState<Partial<Record<RatingKey, number>>>({});
  const [favourite, setFavourite] = useState<Favourite | "">("");
  const [recommendation, setRecommendation] = useState<Recommendation | "">("");
  const [suggestions, setSuggestions] = useState("");
  const [studentName, setStudentName] = useState("");
  const [opensOn, setOpensOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const completed = useMemo(() =>
    RATINGS.filter((item) => scores[item.key] !== undefined).length +
    (favourite ? 1 : 0) + (recommendation ? 1 : 0),
    [scores, favourite, recommendation]
  );
  const readyToSubmit = completed === 7;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Please sign in with your registered parent account, then reload this page.");
        const result = await fetch("/api/founding-50/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const data = (await result.json()) as FeedbackStatus & { error?: string };
        if (!result.ok) throw new Error(data.error || "Unable to check Founding 50 access.");
        if (!active) return;
        const app = data.application;
        if (!app || app.status !== "activated") { setScreen("not_found"); return; }
        setStudentName(app.student_name || "your child");
        if (app.survey_completed_at) { setScreen("complete"); return; }
        if (!data.surveyAvailable) {
          const start = Date.parse(app.beta_starts_at || "");
          if (Number.isFinite(start)) {
            setOpensOn(new Intl.DateTimeFormat("en-SG", {
              timeZone: "Asia/Singapore", dateStyle: "long",
            }).format(new Date(start + 23 * 24 * 60 * 60 * 1000)));
          }
          setScreen("early");
          return;
        }
        setScreen("ready");
      } catch (error) {
        if (!active) return;
        setScreen("error");
        setMessage(error instanceof Error ? error.message : "Unable to load your survey.");
      }
    })();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!readyToSubmit || saving || screen !== "ready") return;
    setSaving(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/founding-50/feedback", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...scores,
          favourite_feature: favourite,
          recommendation,
          suggestions: suggestions.trim(),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; code?: string };
      if (!response.ok) {
        if (data.code === "already_submitted") { setScreen("complete"); return; }
        throw new Error(data.error || "Unable to save your survey.");
      }
      setScreen("complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>DREAMSCAPE ONE <span aria-hidden="true">✦</span> FOUNDING 50</p>
          <div className={styles.heroIcon} aria-hidden="true">✦</div>
          <h1>How Was Your Adventure?</h1>
          <p>Tell us what your family loved and what we could make better.</p>
          <div className={styles.estimate}>A short, 2–3 minute family survey</div>
        </header>

        <div className={styles.content}>
          {screen === "loading" && <div role="status" className={styles.state}>Checking your Founding 50 survey access…</div>}
          {screen === "not_found" && <div className={styles.state}>
            <h2>No activated beta found</h2>
            <p>Sign in with the account used to activate your Founding 50 invitation.</p>
            <Link href="/">Return to DREAMSCAPE ONE →</Link>
          </div>}
          {screen === "early" && <div className={styles.state}>
            <h2>Your survey is coming soon!</h2>
            <p>Thank you for exploring Nova's World. Your family's feedback survey opens on Day 23 of your beta{opensOn ? ` (${opensOn}, Singapore time)` : ""}.</p>
            <p>We look forward to hearing about your adventure during your final week.</p>
            <Link href="/inventor">Continue exploring Nova's World →</Link>
          </div>}
          {screen === "complete" && <div className={styles.state} role="status">
            <div className={styles.successMark} aria-hidden="true">✓</div>
            <h2>Thank you for helping us grow!</h2>
            <p>Your family's survey has been received. Your feedback will help make DREAMSCAPE ONE better for future families.</p>
            <p>You can check your Founding 50 benefits after completing the full 30-day beta.</p>
            <Link href="/founding-50/benefits">View Founding 50 benefits →</Link>
          </div>}
          {screen === "error" && <div className={styles.state} role="alert">
            <h2>We couldn't load your survey</h2>
            <p>{message}</p>
            <button className={styles.retry} type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>}
          {screen === "ready" && <form onSubmit={(event: FormEvent<HTMLFormElement>) => void submit(event)} noValidate>
            <div className={styles.intro}>
              <div>
                <h2>Thanks for exploring with us!</h2>
                <p>We'd love to hear how {studentName || "your child"} enjoyed the experience. There are no right or wrong answers.</p>
              </div>
              <span className={styles.counter}>{completed} of 7 answered</span>
            </div>
            <div className={styles.progressTrack} role="progressbar" aria-label="Survey progress" aria-valuemin={0} aria-valuemax={7} aria-valuenow={completed}>
              <div className={styles.progressFill} style={{ width: `${completed / 7 * 100}%` }} />
            </div>

            <div className={styles.groupHeading}><span>01</span><div><h2>Tell us about your experience</h2><p>Rate each area from 1 (low) to 5 (excellent).</p></div></div>
            <div className={styles.ratings}>
              {RATINGS.map((item, index) => (
                <fieldset className={styles.ratingCard} key={item.key}>
                  <legend>{index + 1}. {item.label}</legend>
                  <p>{item.hint}</p>
                  <div className={styles.stars} aria-label={`${item.label}: choose one to five stars`}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button type="button" key={value}
                        className={`${styles.star} ${scores[item.key] !== undefined && value <= scores[item.key]! ? styles.starSelected : ""}`}
                        aria-label={`${value} ${value === 1 ? "star" : "stars"} for ${item.label}`}
                        aria-pressed={scores[item.key] === value}
                        onClick={() => setScores((previous) => ({ ...previous, [item.key]: value }))}>★</button>
                    ))}
                    <span className={styles.starValue} aria-live="polite">{scores[item.key] ? `${scores[item.key]} / 5` : "Not rated"}</span>
                  </div>
                </fieldset>
              ))}
            </div>

            <div className={styles.groupHeading}><span>02</span><div><h2>Your favourite part</h2><p>Which place did your child enjoy the most?</p></div></div>
            <fieldset className={styles.choiceGroup}>
              <legend className={styles.srOnly}>Favourite Nova location</legend>
              {FAVOURITES.map((item) => (
                <label className={`${styles.choice} ${favourite === item.id ? styles.choiceSelected : ""}`} key={item.id}>
                  <input type="radio" name="favourite" value={item.id} checked={favourite === item.id} onChange={() => setFavourite(item.id)} />
                  <span className={styles.choiceIcon} aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                </label>
              ))}
            </fieldset>

            <div className={styles.groupHeading}><span>03</span><div><h2>Would you recommend Dreamscape?</h2><p>Would you recommend DREAMSCAPE ONE to another family?</p></div></div>
            <fieldset className={styles.recommendations}>
              <legend className={styles.srOnly}>Recommendation</legend>
              {(["yes", "maybe", "no"] as const).map((value) => (
                <label key={value} className={`${styles.recommendation} ${recommendation === value ? styles.recommendationSelected : ""}`}>
                  <input name="recommendation" type="radio" value={value} checked={recommendation === value} onChange={() => setRecommendation(value)} />
                  {value === "yes" ? "Yes" : value === "maybe" ? "Maybe" : "No"}
                </label>
              ))}
            </fieldset>

            <div className={styles.groupHeading}><span>04</span><div><h2>What should we improve?</h2><p>One suggestion can make a big difference. This is optional.</p></div></div>
            <label className={styles.textLabel} htmlFor="f50-suggestions">Your suggestions</label>
            <textarea id="f50-suggestions" className={styles.textarea} value={suggestions} onChange={(event: { target: { value: string } }) => setSuggestions(event.target.value)} maxLength={2000} rows={4} placeholder="Tell us what worked well or what could be better…" />
            <p className={styles.charCount}>{suggestions.length} / 2,000 characters</p>

            <div className={styles.submitArea}>
              <p>Your feedback is private. We'll never publish your words as a testimonial without separate permission. Your answers are final once submitted.</p>
              <button type="submit" className={styles.submit} disabled={!readyToSubmit || saving}>{saving ? "Sending your feedback…" : "Submit my feedback →"}</button>
              {!readyToSubmit && <span className={styles.helper}>Complete all five ratings and two choices to submit.</span>}
              {message && <p className={styles.error} role="alert">{message}</p>}
            </div>
          </form>}
        </div>
        <footer className={styles.footer}>DREAMSCAPE ONE · Building better learning adventures together</footer>
      </section>
    </main>
  );
}
