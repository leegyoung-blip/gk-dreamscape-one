"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ApplicationStatus =
  | "pending"
  | "approved"
  | "waitlisted"
  | "declined"
  | "invited"
  | "activated";

type Founding50Application = {
  id: string;
  parent_email: string;
  student_name: string;
  student_age: number;
  status: ApplicationStatus;
  created_at: string;
  admin_notes: string | null;
  invited_at: string | null;
  activated_at: string | null;
  survey_completed_at: string | null;
};

const filters: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Waitlisted", value: "waitlisted" },
  { label: "Declined", value: "declined" },
  { label: "Invited", value: "invited" },
  { label: "Activated", value: "activated" },
];

export default function Founding50AdminPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [applications, setApplications] = useState<Founding50Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sign in using an authorised admin account.");
    return { Authorization: `Bearer ${session.access_token}` };
  }

  async function loadApplications(nextFilter = statusFilter) {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/admin/founding-50?status=${encodeURIComponent(nextFilter)}`, { headers: await authHeaders(), cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to load applications.");
      setApplications(payload.applications ?? []);
      setIsAuthorized(true);
    } catch (error) {
      setIsAuthorized(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load applications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function updateStatus(id: string, status: ApplicationStatus) {
    setActiveApplicationId(id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/admin/founding-50/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          status,
          adminNotes: notesDraft[id] ?? "",
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Unable to update application.");
      await loadApplications(statusFilter);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update application.");
    } finally {
      setActiveApplicationId(null);
    }
  }

  async function inviteApplication(id: string) {
    setActiveApplicationId(id);
    setErrorMessage("");
    try {
      const response=await fetch(`/api/admin/founding-50/${id}/invite`, {method:"POST",headers:await authHeaders()});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.error || "Could not send invite.");
      await loadApplications(statusFilter);
    } catch(error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send invitation.");
    } finally { setActiveApplicationId(null); }
  }

  async function deliverRewards(id: string) {
    setActiveApplicationId(id); setErrorMessage("");
    try {
      const r = await fetch(`/api/admin/founding-50/${id}/rewards`, { method:"POST",headers:await authHeaders() });
      const d = await r.json();
      if(!r.ok)throw new Error(d?.error||"Delivery unavailable");
      if(d.status==="pending")setErrorMessage("Rewards are queued. Configure the wallet ledger adapter to deliver them.");
      await loadApplications(statusFilter);
    } catch(e) { setErrorMessage(e instanceof Error?e.message:"Rewards unavailable"); }
    finally {setActiveApplicationId(null);}
  }

  const summary = useMemo(() => {
    const counts = {
      total: applications.length,
      pending: 0,
      approved: 0,
      waitlisted: 0,
      declined: 0,
      invited: 0,
      activated: 0,
    };

    for (const application of applications) {
      if (Object.hasOwn(counts, application.status)) counts[application.status] += 1;
    }

    return counts;
  }, [applications]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "34px 22px 40px",
        background:
          "radial-gradient(circle at 18% 0%, rgba(83,215,255,0.12), transparent 24%), radial-gradient(circle at 88% 14%, rgba(197,140,255,0.12), transparent 24%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1340px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "18px" }}>
          <div>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Dreamscape Founding 50
            </p>
            <h1 style={{ margin: "14px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "48px", fontWeight: 400, lineHeight: 1.05 }}>
              Beta Applications
            </h1>
            <p style={{ margin: "14px 0 0", maxWidth: "860px", color: "rgba(255,255,255,0.72)", fontSize: "16px", lineHeight: 1.7 }}>
              Review eligible applicants, reserve beta places, and send secure activation invitations. Only authorised admin accounts can access these records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadApplications(statusFilter)}
            style={{
              minHeight: "46px",
              padding: "12px 18px",
              borderRadius: "999px",
              border: "1px solid rgba(142,232,255,0.24)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {isAuthorized === false && <p style={{marginTop:20,color:"#ffbd73"}}>Admin access is restricted. Make sure your user UUID has been added to founding_50_admin_users.</p>}
        <div style={{ marginTop: "26px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
          {[
            ["Visible list", String(summary.total)],
            ["Pending", String(summary.pending)],
            ["Approved", String(summary.approved)],
            ["Waitlisted", String(summary.waitlisted)],
            ["Activated", String(summary.activated)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: "18px",
                borderRadius: "22px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              }}
            >
              <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</p>
              <p style={{ margin: "10px 0 0", fontSize: "36px", fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {filters.map((filter) => {
            const isActive = filter.value === statusFilter;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                style={{
                  minHeight: "40px",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.12)",
                  background: isActive
                    ? "linear-gradient(90deg, #8ee8ff, #c58cff)"
                    : "rgba(255,255,255,0.05)",
                  color: isActive ? "#100622" : "white",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {errorMessage ? (
          <div style={{ marginTop: "18px", padding: "14px 16px", borderRadius: "18px", border: "1px solid rgba(255,138,92,0.24)", background: "rgba(255,138,92,0.08)", color: "#ffd2bf", fontSize: "14px", lineHeight: 1.6 }}>
            {errorMessage}
          </div>
        ) : null}

        <div style={{ marginTop: "20px", display: "grid", gap: "14px" }}>
          {isLoading ? (
            <div style={{ padding: "26px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontSize: "15px" }}>
              Loading Founding 50 applications…
            </div>
          ) : applications.length === 0 ? (
            <div style={{ padding: "26px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontSize: "15px" }}>
              No applications found for this filter.
            </div>
          ) : (
            applications.map((application) => {
              const isBusy = activeApplicationId === application.id;
              return (
                <section
                  key={application.id}
                  style={{
                    padding: "22px",
                    borderRadius: "24px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "18px" }}>
                    <div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                        <span style={{ padding: "7px 10px", borderRadius: "999px", background: "rgba(83,215,255,0.10)", border: "1px solid rgba(142,232,255,0.18)", color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{application.status}</span>
                        <span style={{ color: "rgba(255,255,255,0.48)", fontSize: "12px" }}>
                          Submitted {new Date(application.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h2 style={{ margin: "14px 0 0", fontSize: "26px", fontWeight: 700 }}>{application.student_name}</h2>
                      <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.76)", fontSize: "15px", lineHeight: 1.65 }}>
                        Age {application.student_age} · {application.parent_email}
                      </p>

                      <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
                        <MiniFact label="Invited" value={application.invited_at ? new Date(application.invited_at).toLocaleDateString() : "—"} />
                        <MiniFact label="Activated" value={application.activated_at ? new Date(application.activated_at).toLocaleDateString() : "—"} />
                        <MiniFact label="Survey" value={application.survey_completed_at ? "Completed" : "Pending"} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: "rgba(255,255,255,0.82)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Admin notes
                      </label>
                      <textarea
                        value={notesDraft[application.id] ?? application.admin_notes ?? ""}
                        onChange={(event) =>
                          setNotesDraft((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))
                        }
                        rows={5}
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          borderRadius: "18px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.05)",
                          color: "white",
                          fontSize: "14px",
                          lineHeight: 1.55,
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />

                      <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {[
                          ["Approve", "approved"],
                          ["Waitlist", "waitlisted"],
                          ["Decline", "declined"],

                        ].map(([label, status]) => (
                          <button
                            key={status}
                            type="button"
                            disabled={isBusy}
                            onClick={() => void updateStatus(application.id, status as ApplicationStatus)}
                            style={{
                              minHeight: "42px",
                              padding: "10px 14px",
                              borderRadius: "999px",
                              border: label === "Approve" ? "none" : "1px solid rgba(255,255,255,0.12)",
                              background: label === "Approve"
                                ? "linear-gradient(90deg, #8ee8ff, #c58cff)"
                                : "rgba(255,255,255,0.05)",
                              color: label === "Approve" ? "#100622" : "white",
                              fontSize: "11px",
                              fontWeight: 900,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              cursor: isBusy ? "default" : "pointer",
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            {isBusy ? "Saving…" : label}
                          </button>
                        ))}
                        {application.status === "activated" && <button type="button" disabled={isBusy} onClick={()=>void deliverRewards(application.id)} style={{ minHeight:42,padding:"10px 16px",borderRadius:99,border:"1px solid #8ee8ff",background:"rgba(83,215,255,.1)",color:"#8ee8ff",fontWeight:900,cursor:"pointer" }}>Deliver Reward Pack</button>}
                        {(["approved", "invited"].includes(application.status)) && (
                          <button type="button" disabled={isBusy} onClick={() => void inviteApplication(application.id)}
                            style={{ minHeight:"42px",padding:"10px 16px",borderRadius:"999px",border:"1px solid rgba(142,232,255,0.45)",background:"rgba(83,215,255,0.1)",color:"#8ee8ff",fontSize:"11px",fontWeight:900,cursor:isBusy?"default":"pointer" }}>
                            {application.status==="invited" ? "Resend Invite" : "Send Invitation"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.48)", fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "8px 0 0", color: "white", fontSize: "14px", fontWeight: 600 }}>{value}</p>
    </div>
  );
}
