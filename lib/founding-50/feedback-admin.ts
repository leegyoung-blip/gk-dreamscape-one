/** Server-side Founding 50 reporting; no browser/client Supabase reads. */
export const SCORE_KEYS = [
  "overall_experience", "ease_of_use", "child_engagement",
  "learning_usefulness", "reliability",
] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

export const FEATURES = [
  "mission_centre", "think_lab", "knowledge_arena",
  "skyforge_hangar", "nova_home", "not_explored",
] as const;

export type F50Application = {
  id: string; student_name: string; parent_email: string; status: string;
  beta_starts_at: string | null; beta_ends_at: string | null;
  survey_completed_at: string | null; created_at: string;
};
export type F50Feedback = {
  application_id: string; submitted_at: string;
  overall_experience: number; ease_of_use: number; child_engagement: number;
  learning_usefulness: number; reliability: number;
  favourite_feature: string | null; recommendation: string | null;
  suggestions: string | null;
};
export type F50Mail = {
  application_id: string; kind: string; generation: number;
  status: string; sent_at: string | null; created_at: string;
};
export type F50Discount = {
  application_id: string; state: string; issued_at: string | null;
  redeem_by: string | null;
};
export type FeedbackReportRow = {
  applicationId: string; studentName: string; parentEmail: string;
  betaStartsAt: string | null; betaEndsAt: string | null;
  surveyCompletedAt: string | null; submittedAt: string | null;
  eligibleToSurvey: boolean; feedbackStatus: "received" | "due" | "not_open";
  feedback: F50Feedback | null;
  invitationStatus: string | null; reminderStatus: string | null;
  manualReminderCount: number; lastSurveyEmailAt: string | null;
  discountState: string; discountIssuedAt: string | null;
  discountRedeemBy: string | null;
};

const DAY = 86_400_000;

export function discountStatus(app: F50Application, feedback: F50Feedback | null,
  discount: F50Discount | undefined, launchAt: string | undefined, nowMs: number): string {
  if (discount?.state === "issued") return "issued";
  if (discount?.state === "error") return "issuance_error";
  if (discount?.state === "issuing") return "issuing";
  if (!feedback) return "survey_required";
  const endMs = Date.parse(app.beta_ends_at || "");
  if (!Number.isFinite(endMs) || nowMs < endMs) return "beta_in_progress";
  const launchMs = Date.parse(launchAt || "");
  if (!Number.isFinite(launchMs)) return "launch_not_configured";
  if (nowMs < launchMs) return "awaiting_launch";
  if (nowMs > Math.max(endMs, launchMs) + 60 * DAY) return "redemption_window_expired";
  return "eligible_to_claim";
}

export function buildF50FeedbackReport(
  apps: F50Application[], feedback: F50Feedback[], mail: F50Mail[], discounts: F50Discount[],
  launchAt: string | undefined, nowMs: number = Date.now(),
) {
  const feedbackByApp = new Map(feedback.map(f => [f.application_id, f]));
  const discountsByApp = new Map(discounts.map(d => [d.application_id, d]));
  const mailByApp = new Map<string, F50Mail[]>();
  for (const m of mail) {
    const previous = mailByApp.get(m.application_id) || [];
    previous.push(m);
    mailByApp.set(m.application_id, previous);
  }
  const active = apps.filter(a => a.status === "activated");
  const rows: FeedbackReportRow[] = active.map(app => {
    const response = feedbackByApp.get(app.id) || null;
    const emails = mailByApp.get(app.id) || [];
    const endMs = Date.parse(app.beta_ends_at || "");
    const startMs = Date.parse(app.beta_starts_at || "");
    const eligible = !!response || (Number.isFinite(startMs) && nowMs >= startMs + 23 * DAY);
    const latest = (kind: string) => emails.filter(m => m.kind === kind)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    const surveyMessages = emails.filter(m => [
      "beta_feedback_day23", "beta_feedback_reminder_day27", "beta_feedback_manual",
    ].includes(m.kind));
    const last = surveyMessages.sort((a,b) =>
      Date.parse(b.sent_at || b.created_at) - Date.parse(a.sent_at || a.created_at))[0];
    return {
      applicationId: app.id, studentName: app.student_name, parentEmail: app.parent_email,
      betaStartsAt: app.beta_starts_at, betaEndsAt: app.beta_ends_at,
      surveyCompletedAt: app.survey_completed_at,
      submittedAt: response?.submitted_at || null,
      eligibleToSurvey: eligible,
      feedbackStatus: response ? "received" as const : eligible ? "due" as const : "not_open" as const,
      feedback: response,
      invitationStatus: latest("beta_feedback_day23")?.status || null,
      reminderStatus: latest("beta_feedback_manual")?.status || latest("beta_feedback_reminder_day27")?.status || null,
      manualReminderCount: emails.filter(m => m.kind === "beta_feedback_manual").length,
      lastSurveyEmailAt: last?.sent_at || last?.created_at || null,
      discountState: discountStatus(app, response, discountsByApp.get(app.id), launchAt, nowMs),
      discountIssuedAt: discountsByApp.get(app.id)?.issued_at || null,
      discountRedeemBy: discountsByApp.get(app.id)?.redeem_by || null,
    };
  });
  const recorded = rows.filter(r => r.feedback !== null);
  const eligible = rows.filter(r => r.eligibleToSurvey);
  const average = Object.fromEntries(SCORE_KEYS.map(key => {
    const scores = recorded.map(r => Number(r.feedback?.[key])).filter(v => Number.isFinite(v) && v >= 1 && v <= 5);
    return [key, scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : null];
  })) as Record<ScoreKey, number | null>;
  const features = Object.fromEntries(FEATURES.map(f => [f,
    recorded.filter(r => r.feedback?.favourite_feature === f).length])) as Record<string,number>;
  const recommendations = Object.fromEntries(["yes", "maybe", "no"].map(value => [value,
    recorded.filter(r => r.feedback?.recommendation === value).length])) as Record<string,number>;
  return {
    summary: {
      activated: active.length, eligible: eligible.length, received: recorded.length,
      pending: eligible.filter(r => r.feedback === null).length,
      responseRate: eligible.length ? Math.round(recorded.length / eligible.length * 1000) / 10 : 0,
      averages: average, features, recommendations,
    },
    rows: rows.sort((a,b) => Date.parse(b.submittedAt || b.betaStartsAt || "") - Date.parse(a.submittedAt || a.betaStartsAt || "")),
  };
}

/** Avoid spreadsheet formula injection even when exporting student/parent input. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value).replace(/\r\n?/g, "\n");
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function f50FeedbackCsv(rows: FeedbackReportRow[]): string {
  const columns = ["Student", "Parent email", "Application ID", "Beta starts", "Beta ends", "Survey submitted",
    "Status", "Overall", "Ease of use", "Engagement", "Learning usefulness", "Reliability", "Favourite feature",
    "Recommendation", "Suggestions", "Day 23 email", "Reminder email", "Discount status", "Discount issued at"];
  const records = rows.map(r => [r.studentName, r.parentEmail, r.applicationId, r.betaStartsAt,
    r.betaEndsAt, r.submittedAt, r.feedbackStatus, r.feedback?.overall_experience,
    r.feedback?.ease_of_use, r.feedback?.child_engagement, r.feedback?.learning_usefulness,
    r.feedback?.reliability, r.feedback?.favourite_feature, r.feedback?.recommendation,
    r.feedback?.suggestions, r.invitationStatus, r.reminderStatus, r.discountState, r.discountIssuedAt]);
  return "\uFEFF" + [columns, ...records].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
