"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type BuilderApplication = {
  id: string;
  application_code: string;
  full_name: string;
  email: string;
  school_organisation: string | null;
  career_stage: string;
  area: string;
  project_id: string;
  project_title: string;
  application_mode: "project" | "interest" | "pitch";
  skills_summary: string;
  learning_goal: string;
  self_started_example: string;
  portfolio_url: string | null;
  availability: string;
  cv_path: string | null;
  status: string;
  notification_status: "pending" | "sent" | "failed";
  notification_error: string | null;
  resend_email_id: string | null;
  notified_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  contacted_at: string | null;
  contacted_by: string | null;
  status_updated_at: string | null;
  status_updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type AdminNote = {
  id: string;
  note: string;
  created_by: string;
  created_at: string;
};

type StatusHistoryItem = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  created_at: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const STATUS_OPTIONS = [
  "all",
  "new",
  "reviewing",
  "shortlisted",
  "accepted",
  "declined",
  "completed",
];

const AREA_OPTIONS = [
  "all",
  "Build & Engineering",
  "AI & Learning",
  "Education & Curriculum",
  "Design & Creative",
  "Content & Growth",
];

const PROJECT_OPTIONS = [
  { value: "all", label: "All projects" },
  { value: "science-curriculum", label: "Science Curriculum Developer" },
  { value: "critical-thinking", label: "Critical Thinking Activities Developer" },
  { value: "content-creator", label: "Dreamscape Content Creator" },
  { value: "build-interest", label: "Build & Engineering Interest" },
  { value: "ai-interest", label: "AI & Learning Interest" },
  { value: "design-interest", label: "Design & Creative Interest" },
  { value: "pitch-yourself", label: "Pitch Yourself" },
];

export default function BuildersAdminPage() {
  const [isCompact, setIsCompact] = useState(false);
  const [applications, setApplications] = useState<BuilderApplication[]>([]);
  const [selected, setSelected] = useState<BuilderApplication | null>(null);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });

  const [status, setStatus] = useState("all");
  const [area, setArea] = useState("all");
  const [project, setProject] = useState("all");
  const [contacted, setContacted] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < 1000);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const adminFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await getAccessToken();
      if (!token) {
        setAccessDenied(true);
        throw new Error("Please sign in with an admin account.");
      }

      const response = await fetch(url, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      const body = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) setAccessDenied(true);
      if (!response.ok || !body?.ok) throw new Error(body?.error || "Request failed.");
      return body;
    },
    [getAccessToken],
  );

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        status,
        area,
        project,
        contacted,
        page: String(page),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const body = await adminFetch(`/api/admin/builders?${params.toString()}`);
      setApplications(body.applications || []);
      setPagination(body.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, [adminFetch, status, area, project, contacted, page, debouncedSearch]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function openApplication(id: string) {
    setDetailLoading(true);
    setError("");
    setSuccess("");
    try {
      const body = await adminFetch(`/api/admin/builders?id=${encodeURIComponent(id)}`);
      setSelected(body.application);
      setNotes(body.notes || []);
      setStatusHistory(body.statusHistory || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open application.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshSelected(id: string) {
    const body = await adminFetch(`/api/admin/builders?id=${encodeURIComponent(id)}`);
    setSelected(body.application);
    setNotes(body.notes || []);
    setStatusHistory(body.statusHistory || []);
  }

  async function openCv(application: BuilderApplication) {
    setCvLoading(true);
    setError("");
    try {
      const body = await adminFetch(
        `/api/admin/builders/${encodeURIComponent(application.id)}/cv`,
      );
      window.open(body.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open CV.");
    } finally {
      setCvLoading(false);
    }
  }

  async function updateApplication(payload: { status?: string; contacted?: boolean }) {
    if (!selected) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await adminFetch(`/api/admin/builders/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await refreshSelected(selected.id);
      await loadApplications();
      setSuccess("Application updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update application.");
    } finally {
      setActionLoading(false);
    }
  }

  async function addNote() {
    if (!selected) return;
    const trimmed = noteDraft.trim();
    if (!trimmed) return;

    setNoteLoading(true);
    setError("");
    setSuccess("");
    try {
      await adminFetch(`/api/admin/builders/${encodeURIComponent(selected.id)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed }),
      });
      setNoteDraft("");
      await refreshSelected(selected.id);
      setSuccess("Internal note saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save note.");
    } finally {
      setNoteLoading(false);
    }
  }

  async function retryNotification() {
    if (!selected) return;
    setRetryLoading(true);
    setError("");
    setSuccess("");
    try {
      await adminFetch(
        `/api/admin/builders/${encodeURIComponent(selected.id)}/retry-notification`,
        { method: "POST" },
      );
      await refreshSelected(selected.id);
      await loadApplications();
      setSuccess("Admin notification sent successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retry notification.");
      await refreshSelected(selected.id).catch(() => undefined);
    } finally {
      setRetryLoading(false);
    }
  }

  const newCount = useMemo(
    () => applications.filter((application) => application.status === "new").length,
    [applications],
  );

  const failedCount = useMemo(
    () =>
      applications.filter((application) => application.notification_status === "failed")
        .length,
    [applications],
  );

  if (accessDenied) {
    return (
      <main style={pageStyle}>
        <div style={centerCardStyle}>
          <p style={eyebrowStyle}>Admin access</p>
          <h1 style={emptyHeadingStyle}>Dreamscape Builders</h1>
          <p style={emptyTextStyle}>
            This page is available only to authorised Dreamscape administrators.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div
        style={{
          maxWidth: "1540px",
          margin: "0 auto",
          padding: isCompact ? "24px 16px 60px" : "34px 28px 70px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={eyebrowStyle}>Admin · Dreamscape Builders</p>
            <h1
              style={{
                margin: "10px 0 0",
                color: "white",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isCompact ? "34px" : "42px",
                fontWeight: 400,
                lineHeight: 1.05,
              }}
            >
              Builder Applications
            </h1>
            <p
              style={{
                margin: "13px 0 0",
                color: "rgba(255,255,255,0.58)",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              Review, track and manage Dreamscape Builders applications from one place.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <StatPill label="Showing" value={String(applications.length)} />
            <StatPill label="New on page" value={String(newCount)} accent="#8ee8ff" />
            <StatPill label="Failed email" value={String(failedCount)} accent="#ff9b9b" />
            <StatPill label="Total" value={String(pagination.total)} accent="#c58cff" />
          </div>
        </header>

        <section
          style={{
            marginTop: "30px",
            padding: "18px",
            borderRadius: "22px",
            border: "1px solid rgba(255,255,255,0.09)",
            background: "rgba(255,255,255,0.025)",
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(220px,1.2fr) repeat(4,minmax(150px,.68fr))",
            gap: "12px",
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or application reference..."
            style={inputStyle}
          />

          <FilterSelect
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={STATUS_OPTIONS.map((option) => ({
              value: option,
              label: option === "all" ? "All statuses" : labelStatus(option),
            }))}
          />

          <FilterSelect
            value={area}
            onChange={(value) => {
              setArea(value);
              setPage(1);
            }}
            options={AREA_OPTIONS.map((option) => ({
              value: option,
              label: option === "all" ? "All areas" : option,
            }))}
          />

          <FilterSelect
            value={project}
            onChange={(value) => {
              setProject(value);
              setPage(1);
            }}
            options={PROJECT_OPTIONS}
          />

          <FilterSelect
            value={contacted}
            onChange={(value) => {
              setContacted(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All contact states" },
              { value: "yes", label: "Contacted" },
              { value: "no", label: "Not contacted" },
            ]}
          />
        </section>

        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}

        {isCompact ? (
          <section style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
            {loading ? (
              <div style={loadingStyle}>Loading applications…</div>
            ) : applications.length === 0 ? (
              <div style={loadingStyle}>No applications match these filters.</div>
            ) : (
              applications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => void openApplication(application.id)}
                  style={compactRowStyle}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, color: "white", fontSize: "15px", fontWeight: 800 }}>
                        {application.full_name}
                      </p>
                      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.42)", fontSize: "11px" }}>
                        {application.application_code}
                      </p>
                    </div>
                    <StatusBadge status={application.status} />
                  </div>
                  <p style={{ margin: "14px 0 0", color: "rgba(255,255,255,0.76)", fontSize: "13px", fontWeight: 700 }}>
                    {application.project_title}
                  </p>
                  <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                    {application.area}
                  </p>
                  <div style={{ marginTop: "13px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <NotificationBadge status={application.notification_status} />
                    {application.contacted_at ? <ContactedBadge /> : null}
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                      {formatDate(application.created_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </section>
        ) : (
          <section style={tableShellStyle}>
            <div style={tableHeaderStyle}>
              <span>Applicant</span>
              <span>Project</span>
              <span>Area</span>
              <span>Status</span>
              <span>Contact</span>
              <span>Notification</span>
              <span>Submitted</span>
            </div>

            {loading ? (
              <div style={loadingStyle}>Loading applications…</div>
            ) : applications.length === 0 ? (
              <div style={loadingStyle}>No applications match these filters.</div>
            ) : (
              applications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => void openApplication(application.id)}
                  style={tableRowStyle}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>
                      {application.full_name}
                    </p>
                    <p style={smallMutedLineStyle}>{application.application_code}</p>
                  </div>
                  <span style={cellTextStyle}>{application.project_title}</span>
                  <span style={cellTextStyle}>{application.area}</span>
                  <span><StatusBadge status={application.status} /></span>
                  <span>{application.contacted_at ? <ContactedBadge /> : <NotContactedBadge />}</span>
                  <span><NotificationBadge status={application.notification_status} /></span>
                  <span style={cellTextStyle}>{formatDate(application.created_at)}</span>
                </button>
              ))
            )}
          </section>
        )}

        <div style={pagerShellStyle}>
          <span style={{ color: "rgba(255,255,255,0.46)", fontSize: "12px" }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              style={pagerButtonStyle(page <= 1)}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
              style={pagerButtonStyle(page >= pagination.totalPages)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {(selected || detailLoading) && (
        <>
          <button
            type="button"
            aria-label="Close application"
            onClick={() => setSelected(null)}
            style={drawerBackdropStyle}
          />
          <aside
            style={{
              ...drawerStyle,
              width: isCompact ? "100vw" : "min(760px, 94vw)",
              padding: isCompact ? "22px 18px 40px" : "28px",
            }}
          >
            {detailLoading && !selected ? (
              <div style={loadingStyle}>Loading application…</div>
            ) : selected ? (
              <ApplicationDetail
                application={selected}
                notes={notes}
                statusHistory={statusHistory}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                actionLoading={actionLoading}
                noteLoading={noteLoading}
                retryLoading={retryLoading}
                cvLoading={cvLoading}
                onOpenCv={() => void openCv(selected)}
                onStatusChange={(next) => void updateApplication({ status: next })}
                onToggleContacted={() =>
                  void updateApplication({ contacted: !Boolean(selected.contacted_at) })
                }
                onAddNote={() => void addNote()}
                onRetryNotification={() => void retryNotification()}
                onClose={() => setSelected(null)}
              />
            ) : null}
          </aside>
        </>
      )}
    </main>
  );
}

function ApplicationDetail({
  application,
  notes,
  statusHistory,
  noteDraft,
  setNoteDraft,
  actionLoading,
  noteLoading,
  retryLoading,
  cvLoading,
  onOpenCv,
  onStatusChange,
  onToggleContacted,
  onAddNote,
  onRetryNotification,
  onClose,
}: {
  application: BuilderApplication;
  notes: AdminNote[];
  statusHistory: StatusHistoryItem[];
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  actionLoading: boolean;
  noteLoading: boolean;
  retryLoading: boolean;
  cvLoading: boolean;
  onOpenCv: () => void;
  onStatusChange: (status: string) => void;
  onToggleContacted: () => void;
  onAddNote: () => void;
  onRetryNotification: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div style={detailHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>Application detail</p>
          <h2 style={detailNameStyle}>{application.full_name}</h2>
          <p style={detailCodeStyle}>{application.application_code}</p>
        </div>
        <button type="button" onClick={onClose} style={closeButtonStyle}>×</button>
      </div>

      <div style={{ marginTop: "22px", display: "flex", gap: "9px", flexWrap: "wrap" }}>
        <StatusBadge status={application.status} />
        <NotificationBadge status={application.notification_status} />
        <span style={modeBadgeStyle}>{labelMode(application.application_mode)}</span>
        {application.contacted_at ? <ContactedBadge /> : null}
      </div>

      <section style={workflowCardStyle}>
        <p style={workflowLabelStyle}>Review workflow</p>
        <div style={{ marginTop: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label style={fieldLabelStyle}>
            <span>Status</span>
            <select
              value={application.status}
              disabled={actionLoading}
              onChange={(event) => onStatusChange(event.target.value)}
              style={inputStyle}
            >
              {STATUS_OPTIONS.filter((option) => option !== "all").map((option) => (
                <option key={option} value={option}>{labelStatus(option)}</option>
              ))}
            </select>
          </label>

          <div style={fieldLabelStyle}>
            <span>Contact</span>
            <button
              type="button"
              disabled={actionLoading}
              onClick={onToggleContacted}
              style={application.contacted_at ? secondaryActionStyle : primaryActionStyle}
            >
              {application.contacted_at ? "Undo contacted" : "Mark contacted"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <MiniInfo label="Reviewed" value={application.reviewed_at ? formatDateTime(application.reviewed_at) : "Not yet"} />
          <MiniInfo label="Contacted" value={application.contacted_at ? formatDateTime(application.contacted_at) : "Not yet"} />
        </div>
      </section>

      <DetailSection title="Project">
        <InfoRow label="Project" value={application.project_title} />
        <InfoRow label="Area" value={application.area} />
        <InfoRow label="Availability" value={application.availability} />
        <InfoRow label="Submitted" value={formatDateTime(application.created_at)} />
      </DetailSection>

      <DetailSection title="Applicant">
        <InfoRow label="Email" value={application.email} />
        <InfoRow label="School / organisation" value={application.school_organisation || "Not provided"} />
        <InfoRow label="Current stage" value={application.career_stage} />
        <InfoRow label="Portfolio" value={application.portfolio_url || "Not provided"} link={application.portfolio_url || undefined} />
      </DetailSection>

      <DetailSection title="What they can do"><LongText text={application.skills_summary} /></DetailSection>
      <DetailSection title="What they want to learn or build"><LongText text={application.learning_goal} /></DetailSection>
      <DetailSection title="Something they made, started or figured out"><LongText text={application.self_started_example} /></DetailSection>

      <DetailSection title="CV / Resume">
        {application.cv_path ? (
          <button type="button" disabled={cvLoading} onClick={onOpenCv} style={primaryActionStyle}>
            {cvLoading ? "Opening…" : "View CV securely"}
          </button>
        ) : (
          <p style={mutedTextStyle}>No CV / Resume uploaded.</p>
        )}
        {application.cv_path ? (
          <p style={{ ...mutedTextStyle, marginTop: "10px" }}>Private signed link · expires after 10 minutes.</p>
        ) : null}
      </DetailSection>

      <DetailSection title="Internal notes">
        <textarea
          value={noteDraft}
          maxLength={4000}
          onChange={(event) => setNoteDraft(event.target.value)}
          placeholder="Add a private note about this applicant..."
          style={noteTextareaStyle}
        />
        <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.34)", fontSize: "10px" }}>{noteDraft.length}/4000</span>
          <button
            type="button"
            disabled={noteLoading || !noteDraft.trim()}
            onClick={onAddNote}
            style={primaryActionStyle}
          >
            {noteLoading ? "Saving…" : "Add note"}
          </button>
        </div>

        <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
          {notes.length === 0 ? (
            <p style={mutedTextStyle}>No internal notes yet.</p>
          ) : (
            notes.map((note) => (
              <article key={note.id} style={noteCardStyle}>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: "12px", lineHeight: 1.62, whiteSpace: "pre-wrap" }}>{note.note}</p>
                <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.34)", fontSize: "10px" }}>
                  {formatDateTime(note.created_at)} · Admin {shortId(note.created_by)}
                </p>
              </article>
            ))
          )}
        </div>
      </DetailSection>

      <DetailSection title="Status history">
        <div style={{ display: "grid", gap: "9px" }}>
          {statusHistory.length === 0 ? (
            <p style={mutedTextStyle}>No status changes recorded yet.</p>
          ) : (
            statusHistory.map((item) => (
              <div key={item.id} style={historyRowStyle}>
                <div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.76)", fontSize: "12px", fontWeight: 800 }}>
                    {item.old_status ? `${labelStatus(item.old_status)} → ` : ""}{labelStatus(item.new_status)}
                  </p>
                  <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.34)", fontSize: "10px" }}>
                    {formatDateTime(item.created_at)} · Admin {shortId(item.changed_by)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DetailSection>

      <DetailSection title="Admin notification">
        <InfoRow label="Status" value={labelStatus(application.notification_status)} />
        <InfoRow label="Notified" value={application.notified_at ? formatDateTime(application.notified_at) : "Not yet recorded"} />
        {application.notification_error ? (
          <div style={notificationErrorStyle}>{application.notification_error}</div>
        ) : null}
        {application.notification_status !== "sent" ? (
          <button
            type="button"
            disabled={retryLoading}
            onClick={onRetryNotification}
            style={{ ...secondaryActionStyle, marginTop: "12px" }}
          >
            {retryLoading ? "Retrying…" : "Retry admin notification"}
          </button>
        ) : null}
      </DetailSection>
    </>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const error = tone === "error";
  return (
    <div style={{ marginTop: "18px", padding: "14px 16px", borderRadius: "14px", border: `1px solid ${error ? "rgba(255,120,120,0.22)" : "rgba(123,243,183,0.2)"}`, background: error ? "rgba(255,80,80,0.07)" : "rgba(123,243,183,0.06)", color: error ? "#ffb2b2" : "#aef7cf", fontSize: "13px", lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: "24px", paddingTop: "22px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <h3 style={{ margin: 0, color: "rgba(255,255,255,0.88)", fontSize: "14px", fontWeight: 900, letterSpacing: "0.03em" }}>{title}</h3>
      <div style={{ marginTop: "14px" }}>{children}</div>
    </section>
  );
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: "18px", padding: "8px 0" }}>
      <span style={{ color: "rgba(255,255,255,0.38)", fontSize: "12px" }}>{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" style={{ color: "#8ee8ff", fontSize: "12px", lineHeight: 1.5, overflowWrap: "anywhere" }}>{value}</a>
      ) : (
        <span style={{ color: "rgba(255,255,255,0.76)", fontSize: "12px", lineHeight: 1.5, overflowWrap: "anywhere" }}>{value}</span>
      )}
    </div>
  );
}

function LongText({ text }: { text: string }) {
  return <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{text}</p>;
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "11px 12px", borderRadius: "13px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.34)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.74)", fontSize: "11px", lineHeight: 1.4 }}>{value}</p>
    </div>
  );
}

function StatPill({ label, value, accent = "#ffbd73" }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ minWidth: "100px", padding: "11px 13px", borderRadius: "15px", border: `1px solid ${accent}22`, background: `${accent}08` }}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "5px 0 0", color: accent, fontSize: "20px", fontWeight: 900 }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    new: { color: "#8ee8ff", bg: "rgba(83,215,255,0.09)" },
    reviewing: { color: "#ffd36e", bg: "rgba(255,211,110,0.08)" },
    shortlisted: { color: "#c58cff", bg: "rgba(197,140,255,0.09)" },
    accepted: { color: "#7bf3b7", bg: "rgba(123,243,183,0.08)" },
    declined: { color: "#ff9b9b", bg: "rgba(255,120,120,0.07)" },
    completed: { color: "#d6e1ee", bg: "rgba(214,225,238,0.07)" },
  };
  const tone = map[status] || map.new;
  return <span style={{ display: "inline-flex", padding: "6px 9px", borderRadius: "999px", background: tone.bg, color: tone.color, fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{labelStatus(status)}</span>;
}

function NotificationBadge({ status }: { status: "pending" | "sent" | "failed" }) {
  const tone = status === "sent" ? { color: "#7bf3b7", bg: "rgba(123,243,183,0.08)" } : status === "failed" ? { color: "#ff9b9b", bg: "rgba(255,120,120,0.07)" } : { color: "#ffd36e", bg: "rgba(255,211,110,0.08)" };
  return <span style={{ display: "inline-flex", padding: "6px 9px", borderRadius: "999px", background: tone.bg, color: tone.color, fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{labelStatus(status)}</span>;
}

function ContactedBadge() {
  return <span style={{ display: "inline-flex", padding: "6px 9px", borderRadius: "999px", background: "rgba(123,243,183,0.08)", color: "#7bf3b7", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Contacted</span>;
}

function NotContactedBadge() {
  return <span style={{ display: "inline-flex", padding: "6px 9px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.38)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Not contacted</span>;
}

function labelMode(mode: string) {
  if (mode === "interest") return "Register Interest";
  if (mode === "pitch") return "Pitch Yourself";
  return "Project Application";
}

function labelStatus(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function shortId(value: string) {
  return value ? value.slice(0, 8) : "unknown";
}

function pagerButtonStyle(disabled: boolean): CSSProperties {
  return { minHeight: "38px", padding: "9px 13px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.1)", background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)", color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)", fontSize: "10px", fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer" };
}

const pageStyle: CSSProperties = { minHeight: "100vh", background: "radial-gradient(circle at 10% 0%, rgba(83,215,255,0.1), transparent 26%), radial-gradient(circle at 90% 10%, rgba(197,140,255,0.08), transparent 28%), #020813", color: "white", fontFamily: "Arial, Helvetica, sans-serif" };
const centerCardStyle: CSSProperties = { width: "min(620px, calc(100vw - 40px))", margin: "14vh auto 0", padding: "38px", borderRadius: "28px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.035)", textAlign: "center" };
const eyebrowStyle: CSSProperties = { margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" };
const emptyHeadingStyle: CSSProperties = { margin: "12px 0 0", color: "white", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "38px", fontWeight: 400 };
const emptyTextStyle: CSSProperties = { margin: "18px auto 0", maxWidth: "470px", color: "rgba(255,255,255,0.58)", fontSize: "14px", lineHeight: 1.65 };
const inputStyle: CSSProperties = { width: "100%", minHeight: "44px", padding: "10px 12px", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(2,8,19,0.8)", color: "white", fontSize: "12px", outline: "none" };
const loadingStyle: CSSProperties = { padding: "42px 20px", color: "rgba(255,255,255,0.46)", fontSize: "13px", textAlign: "center" };
const cellTextStyle: CSSProperties = { color: "rgba(255,255,255,0.68)", fontSize: "12px", lineHeight: 1.4 };
const smallMutedLineStyle: CSSProperties = { margin: "5px 0 0", color: "rgba(255,255,255,0.42)", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const tableShellStyle: CSSProperties = { marginTop: "18px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.09)", overflow: "hidden", background: "rgba(255,255,255,0.018)" };
const tableHeaderStyle: CSSProperties = { display: "grid", gridTemplateColumns: "1.12fr 1.3fr .95fr .72fr .75fr .75fr .68fr", gap: "14px", padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.42)", fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" };
const tableRowStyle: CSSProperties = { width: "100%", display: "grid", gridTemplateColumns: "1.12fr 1.3fr .95fr .72fr .75fr .75fr .68fr", gap: "14px", padding: "17px 18px", alignItems: "center", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "transparent", color: "white", textAlign: "left", cursor: "pointer" };
const compactRowStyle: CSSProperties = { width: "100%", padding: "17px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", textAlign: "left", cursor: "pointer" };
const pagerShellStyle: CSSProperties = { marginTop: "18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" };
const drawerBackdropStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 80, border: "none", background: "rgba(0,0,0,0.62)", backdropFilter: "blur(7px)", cursor: "pointer" };
const drawerStyle: CSSProperties = { position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 90, overflowY: "auto", borderLeft: "1px solid rgba(142,232,255,0.17)", background: "radial-gradient(circle at 100% 0%, rgba(197,140,255,0.13), transparent 27%), rgba(3,9,20,0.985)", boxShadow: "-24px 0 70px rgba(0,0,0,0.45)" };
const detailHeaderStyle: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "18px" };
const detailNameStyle: CSSProperties = { margin: "10px 0 0", color: "white", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "34px", fontWeight: 400, lineHeight: 1.08 };
const detailCodeStyle: CSSProperties = { margin: "8px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "12px" };
const closeButtonStyle: CSSProperties = { width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: "22px", lineHeight: 1, cursor: "pointer" };
const modeBadgeStyle: CSSProperties = { display: "inline-flex", padding: "6px 9px", borderRadius: "999px", background: "rgba(197,140,255,0.08)", color: "#c58cff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" };
const mutedTextStyle: CSSProperties = { margin: 0, color: "rgba(255,255,255,0.48)", fontSize: "12px", lineHeight: 1.55 };
const workflowCardStyle: CSSProperties = { marginTop: "22px", padding: "18px", borderRadius: "20px", border: "1px solid rgba(142,232,255,0.14)", background: "linear-gradient(145deg, rgba(83,215,255,0.05), rgba(197,140,255,0.035))" };
const workflowLabelStyle: CSSProperties = { margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" };
const fieldLabelStyle: CSSProperties = { display: "grid", gap: "8px", color: "rgba(255,255,255,0.5)", fontSize: "10px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" };
const primaryActionStyle: CSSProperties = { minHeight: "42px", padding: "10px 14px", borderRadius: "999px", border: "none", background: "linear-gradient(90deg, #8ee8ff, #c58cff)", color: "#130725", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" };
const secondaryActionStyle: CSSProperties = { minHeight: "42px", padding: "10px 14px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.055)", color: "rgba(255,255,255,0.78)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" };
const noteTextareaStyle: CSSProperties = { width: "100%", minHeight: "100px", padding: "12px 13px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(2,8,19,0.72)", color: "white", fontSize: "12px", fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.55, resize: "vertical", outline: "none" };
const noteCardStyle: CSSProperties = { padding: "13px 14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" };
const historyRowStyle: CSSProperties = { padding: "12px 13px", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" };
const notificationErrorStyle: CSSProperties = { marginTop: "12px", padding: "12px 14px", borderRadius: "13px", border: "1px solid rgba(255,120,120,0.16)", background: "rgba(255,80,80,0.05)", color: "#ffb3b3", fontSize: "12px", lineHeight: 1.55, whiteSpace: "pre-wrap" };
