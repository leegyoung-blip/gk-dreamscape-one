import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/affiliate/auth";
import {
  approveAffiliateApplication,
  markAffiliateUnderReview,
  rejectAffiliateApplication,
  requestAffiliateInformation,
  resendAffiliateApprovalLink,
} from "../actions";
import styles from "@/app/affiliate/affiliate.module.css";

function formatJsonLinks(value: unknown) {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).filter(
    ([, link]) => typeof link === "string" && link,
  ) as Array<[string, string]>;
}

export default async function AffiliateApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const { admin } = await requireAdmin();

  const [{ data: application }, { data: partner }, { data: audit }] =
    await Promise.all([
      admin.from("affiliate_applications").select("*").eq("id", id).maybeSingle(),
      admin
        .from("affiliate_partners")
        .select("*")
        .eq("application_id", id)
        .maybeSingle(),
      admin
        .from("affiliate_admin_audit_log")
        .select("id, action, details, created_at, actor_user_id")
        .eq("application_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (!application) notFound();

  const socialLinks = formatJsonLinks(application.social_links);
  const canApprove = [
    "submitted",
    "under_review",
    "information_requested",
    "approved_pending_onboarding",
  ].includes(application.status);

  return (
    <main className={styles.adminPage}>
      <div className={styles.backRow}>
        <Link href="/admin/affiliates">← All applications</Link>
        <span
          className={`${styles.statusPill} ${
            styles[`status_${application.status}`]
          }`}
        >
          {application.status.replaceAll("_", " ")}
        </span>
      </div>

      <header className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>{application.application_number}</p>
          <h1>{application.business_name || application.legal_name}</h1>
          <p>
            {application.email} · {application.country}
          </p>
        </div>
      </header>

      {messages.success ? (
        <div className={styles.successBanner}>{messages.success}</div>
      ) : null}
      {messages.error ? (
        <div className={styles.formError}>{messages.error}</div>
      ) : null}

      <div className={styles.adminDetailGrid}>
        <div>
          <section className={styles.adminCard}>
            <h2>Applicant profile</h2>
            <dl className={styles.detailList}>
              <div>
                <dt>Legal name</dt>
                <dd>{application.legal_name}</dd>
              </div>
              <div>
                <dt>Display name</dt>
                <dd>{application.display_name || "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{application.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{application.phone}</dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{application.country}</dd>
              </div>
              <div>
                <dt>Applicant type</dt>
                <dd>{application.applicant_type.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Business</dt>
                <dd>{application.business_name || "—"}</dd>
              </div>
              <div>
                <dt>Registration number</dt>
                <dd>{application.registration_number || "—"}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>
                  {application.website ? (
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open website
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Programme requested</dt>
                <dd>{application.programme_requested}</dd>
              </div>
              <div>
                <dt>Expected referrals</dt>
                <dd>{application.expected_referrals ?? "Not supplied"}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>
                  {new Date(application.submitted_at).toLocaleString("en-SG")}
                </dd>
              </div>
            </dl>
          </section>

          <section className={styles.adminCard}>
            <h2>Audience and promotion</h2>
            <h3>Promotion channels</h3>
            <div className={styles.tagList}>
              {(application.promotion_channels as string[])?.map((channel) => (
                <span key={channel}>{channel}</span>
              ))}
            </div>
            <h3>Social links</h3>
            {socialLinks.length ? (
              <div className={styles.linkList}>
                {socialLinks.map(([platform, link]) => (
                  <a
                    key={platform}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {platform} →
                  </a>
                ))}
              </div>
            ) : (
              <p>None supplied.</p>
            )}
            <h3>Audience description</h3>
            <p className={styles.preWrap}>{application.audience_description}</p>
            <h3>Audience size</h3>
            <p>{application.audience_size ?? "Not supplied"}</p>
            <h3>Audience countries</h3>
            <p>{application.audience_countries || "Not supplied"}</p>
            <h3>Promotion plan</h3>
            <p className={styles.preWrap}>{application.promotion_plan}</p>
          </section>

          {partner ? (
            <section className={styles.adminCard}>
              <h2>Partner record</h2>
              <dl className={styles.detailList}>
                <div>
                  <dt>Partner number</dt>
                  <dd>{partner.partner_number}</dd>
                </div>
                <div>
                  <dt>Partner type</dt>
                  <dd>{partner.partner_type}</dd>
                </div>
                <div>
                  <dt>Commission rate</dt>
                  <dd>{Number(partner.commission_rate)}%</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{partner.status.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Referral code</dt>
                  <dd>{partner.referral_code || "Not activated"}</dd>
                </div>
                <div>
                  <dt>Activated</dt>
                  <dd>
                    {partner.activated_at
                      ? new Date(partner.activated_at).toLocaleString("en-SG")
                      : "Not yet"}
                  </dd>
                </div>
              </dl>
              {application.status === "approved_pending_onboarding" ? (
                <form
                  action={resendAffiliateApprovalLink}
                  className={styles.inlineForm}
                >
                  <input type="hidden" name="application_id" value={id} />
                  <button type="submit" className={styles.secondaryButton}>
                    Send a new onboarding link
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}

          <section className={styles.adminCard}>
            <h2>Review history</h2>
            <div className={styles.auditList}>
              {audit?.map((item) => (
                <div key={item.id}>
                  <strong>{item.action.replaceAll("_", " ")}</strong>
                  <span>{new Date(item.created_at).toLocaleString("en-SG")}</span>
                  {item.details && Object.keys(item.details).length ? (
                    <pre>{JSON.stringify(item.details, null, 2)}</pre>
                  ) : null}
                </div>
              ))}
              {!audit?.length ? <p>No review actions recorded yet.</p> : null}
            </div>
          </section>
        </div>

        <aside className={styles.adminActionsColumn}>
          {application.status === "submitted" ||
          application.status === "information_requested" ? (
            <section className={styles.adminCard}>
              <h2>Begin review</h2>
              <form action={markAffiliateUnderReview}>
                <input type="hidden" name="application_id" value={id} />
                <button type="submit" className={styles.secondaryButton}>
                  Mark under review
                </button>
              </form>
            </section>
          ) : null}

          {canApprove ? (
            <section className={`${styles.adminCard} ${styles.approveCard}`}>
              <h2>Approve applicant</h2>
              <form
                action={approveAffiliateApplication}
                className={styles.adminForm}
              >
                <input type="hidden" name="application_id" value={id} />
                <label>
                  Partner type
                  <select
                    name="partner_type"
                    defaultValue={
                      application.programme_requested === "kol"
                        ? "kol"
                        : application.applicant_type === "registered_business"
                          ? "business"
                          : application.applicant_type === "content_creator"
                            ? "standard"
                            : "educator"
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="kol">KOL creator</option>
                    <option value="business">Child-focused business</option>
                    <option value="educator">Educator</option>
                  </select>
                </label>
                <label>
                  Approved commission rate
                  <div className={styles.inputSuffix}>
                    <input
                      name="commission_rate"
                      type="number"
                      min="1"
                      max="20"
                      step="0.01"
                      defaultValue={10}
                      required
                    />
                    <span>%</span>
                  </div>
                </label>
                <label>
                  Internal notes
                  <textarea
                    name="admin_notes"
                    rows={4}
                    defaultValue={application.admin_notes ?? ""}
                  />
                </label>
                <button type="submit" className={styles.approveButton}>
                  Approve and send onboarding link
                </button>
              </form>
            </section>
          ) : null}

          {!['active', 'rejected', 'terminated'].includes(application.status) ? (
            <section className={styles.adminCard}>
              <h2>Request information</h2>
              <form
                action={requestAffiliateInformation}
                className={styles.adminForm}
              >
                <input type="hidden" name="application_id" value={id} />
                <label>
                  Message to applicant
                  <textarea
                    name="request_message"
                    rows={5}
                    required
                    placeholder="Explain what information is needed."
                  />
                </label>
                <label>
                  Internal notes
                  <textarea
                    name="admin_notes"
                    rows={3}
                    defaultValue={application.admin_notes ?? ""}
                  />
                </label>
                <button type="submit" className={styles.secondaryButton}>
                  Send information request
                </button>
              </form>
            </section>
          ) : null}

          {!['active', 'rejected', 'terminated'].includes(application.status) ? (
            <section className={`${styles.adminCard} ${styles.rejectCard}`}>
              <h2>Reject application</h2>
              <form
                action={rejectAffiliateApplication}
                className={styles.adminForm}
              >
                <input type="hidden" name="application_id" value={id} />
                <label>
                  Internal rejection reason
                  <textarea name="rejection_reason" rows={4} required />
                </label>
                <label>
                  Internal notes
                  <textarea
                    name="admin_notes"
                    rows={3}
                    defaultValue={application.admin_notes ?? ""}
                  />
                </label>
                <button type="submit" className={styles.rejectButton}>
                  Reject and notify applicant
                </button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
