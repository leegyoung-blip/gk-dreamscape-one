/**
 * Server-only bridge for Vercel Web Analytics aggregated visits.
 * Do not import this module from client components.
 * Reference: https://vercel.com/docs/analytics/web-analytics-api
 */
import "server-only";

export type TrafficRange = "today" | "7d" | "30d";

export type DailyTraffic = {
  date: string;
  visitors: number;
  pageviews: number;
};

export type TrafficDimension = {
  label: string;
  visitors: number;
  pageviews: number;
};

export type TrafficReport = {
  range: TrafficRange;
  since: string;
  until: string;
  timezone: "UTC";
  environment: "production";
  updatedAt: string;
  totalVisitors: number;
  totalPageviews: number;
  daily: DailyTraffic[];
  pages: TrafficDimension[];
  countries: TrafficDimension[];
  referrers: TrafficDimension[];
  devices: TrafficDimension[];
  browsers: TrafficDimension[];
};

type QueryDimension =
  | "day"
  | "requestPath"
  | "country"
  | "referrerHostname"
  | "deviceType"
  | "browserName";

type AggregateRow = Record<string, unknown> & {
  pageviews?: unknown;
  visitors?: unknown;
};

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateRange(range: TrafficRange) {
  const end = new Date();
  const todayUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const since = new Date(todayUTC);
  since.setUTCDate(since.getUTCDate() - days + 1);

  const labels: string[] = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date(since);
    day.setUTCDate(day.getUTCDate() + index);
    labels.push(utcDateString(day));
  }

  return { since: utcDateString(since), until: utcDateString(todayUTC), labels };
}

function numericCount(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    throw new Error("Vercel omitted a required traffic count.");
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("Vercel returned an invalid traffic count.");
  }
  return num;
}

function dimensionLabel(value: unknown, dimension: QueryDimension): string {
  const label = typeof value === "string" ? value.trim() : "";
  if (label) return label;
  if (dimension === "referrerHostname") return "Direct / unknown";
  if (dimension === "country") return "Unknown location";
  return "Unknown";
}

async function aggregate(dimension: QueryDimension, since: string, until: string, limit: number): Promise<AggregateRow[]> {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_ANALYTICS_TEAM_ID || process.env.VERCEL_TEAM_ID;
  const teamSlug = process.env.VERCEL_ANALYTICS_TEAM_SLUG;

  if (!token || !projectId) {
    throw new Error("VERCEL_ANALYTICS_NOT_CONFIGURED");
  }

  const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/aggregate");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("by", dimension);
  url.searchParams.set("limit", String(limit));
  if (teamId) url.searchParams.set("teamId", teamId);
  else if (teamSlug) url.searchParams.set("slug", teamSlug);
  // The API defaults to production-only results if no filter is specified.

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    // Cache upstream responses briefly; the admin API itself is never public-cacheable.
    next: { revalidate: 120 },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`VERCEL_ANALYTICS_UPSTREAM_${response.status}`);
  }
  const json: unknown = await response.json();
  if (!json || typeof json !== "object" || !("data" in json)) {
    throw new Error("VERCEL_ANALYTICS_INVALID_RESPONSE");
  }
  const data = (json as { data: unknown }).data;
  if (!Array.isArray(data) || !data.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    throw new Error("VERCEL_ANALYTICS_INVALID_RESPONSE");
  }
  return data as AggregateRow[];
}

function mapDimension(rows: AggregateRow[], dimension: QueryDimension): TrafficDimension[] {
  return rows.map((row) => ({
    label: dimensionLabel(row[dimension], dimension),
    visitors: numericCount(row.visitors),
    pageviews: numericCount(row.pageviews),
  })).sort((a, b) => b.pageviews - a.pageviews);
}

export function analyticsConfigured(): boolean {
  return Boolean(
    process.env.VERCEL_ANALYTICS_TOKEN &&
      (process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID),
  );
}

export async function readVercelTraffic(range: TrafficRange): Promise<TrafficReport> {
  const { since, until, labels } = dateRange(range);
  const [trendRows, pageRows, countryRows, referrerRows, deviceRows, browserRows] = await Promise.all([
    aggregate("day", since, until, 35),
    aggregate("requestPath", since, until, 12),
    aggregate("country", since, until, 10),
    aggregate("referrerHostname", since, until, 10),
    aggregate("deviceType", since, until, 10),
    aggregate("browserName", since, until, 8),
  ]);

  const countsByDay = new Map<string, DailyTraffic>();
  for (const row of trendRows) {
    const timestamp = row.timestamp;
    const key = typeof timestamp === "string" ? timestamp.slice(0, 10) : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      throw new Error("VERCEL_ANALYTICS_INVALID_DATE");
    }
    const existing = countsByDay.get(key);
    countsByDay.set(key, {
      date: key,
      visitors: (existing?.visitors || 0) + numericCount(row.visitors),
      pageviews: (existing?.pageviews || 0) + numericCount(row.pageviews),
    });
  }

  const daily = labels.map((date) => countsByDay.get(date) || { date, visitors: 0, pageviews: 0 });
  return {
    range,
    since,
    until,
    timezone: "UTC",
    environment: "production",
    updatedAt: new Date().toISOString(),
    // Vercel's anonymous visitor identity resets daily; daily visitors are summed
    // rather than presented as unique individuals over 7/30 days.
    totalVisitors: daily.reduce((sum, item) => sum + item.visitors, 0),
    totalPageviews: daily.reduce((sum, item) => sum + item.pageviews, 0),
    daily,
    pages: mapDimension(pageRows, "requestPath"),
    countries: mapDimension(countryRows, "country"),
    referrers: mapDimension(referrerRows, "referrerHostname"),
    devices: mapDimension(deviceRows, "deviceType"),
    browsers: mapDimension(browserRows, "browserName"),
  };
}
