import Link from "next/link";
import { requireAdmin } from "@/lib/affiliate/auth";
import styles from "@/app/affiliate/affiliate.module.css";

const allowedStatuses = [
  "all",
  "submitted",
  "under_review",
  "information_requested",
  "approved_pending_onboarding",
  "active",
  "rejected",
  "suspended",
  "terminated",
];

export default async function AffiliateAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const activeStatus = allowedStatuses.includes(status)
    ? status
    : "all";

  const { admin } = await requireAdmin();

  let query = admin
    .from("affiliate_applications")
    .select(
      "id, application_number, legal_name, business_name, email, country, applicant_type, programme_requested, status, submitted_at",
    )
    .order("submitted_at", { ascending: false })
    .limit(250);

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: applications, error } = await query;

  return (
    <main className={styles.adminPage}>
      <header className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>
            Dreamscape Administration
          </p>

          <h1>Affiliate applications</h1>

          <p>
            Review applicants, approve commission
            rates and issue secure onboarding links.
          </p>
        </div>

        <div className={styles.buttonRow}>
          <Link
            href="/admin/affiliates/finance"
            className={styles.primaryLink}
          >
            Affiliate Finance
          </Link>

          <Link
            href="/affiliate/apply"
            className={styles.secondaryLink}
            target="_blank"
          >
            Open public form
          </Link>
        </div>
      </header>

      <nav
        className={styles.statusTabs}
        aria-label="Filter affiliate applications"
      >
        {allowedStatuses.map((item) => (
          <Link
            key={item}
            href={
              item === "all"
                ? "/admin/affiliates"
                : `/admin/affiliates?status=${item}`
            }
            className={
              activeStatus === item
                ? styles.activeTab
                : ""
            }
          >
            {item.replaceAll("_", " ")}
          </Link>
        ))}
      </nav>

      <section className={styles.adminCard}>
        {error ? (
          <div className={styles.formError}>
            {error.message}
          </div>
        ) : null}

        <div className={styles.tableScroll}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Application</th>
                <th>Applicant</th>
                <th>Type</th>
                <th>Programme</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {applications?.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>
                      {application.application_number}
                    </strong>
                  </td>

                  <td>
                    <strong>
                      {application.business_name ||
                        application.legal_name}
                    </strong>
                    <span>
                      {application.email}
                      <br />
                      {application.country}
                    </span>
                  </td>

                  <td>
                    {application.applicant_type.replaceAll(
                      "_",
                      " ",
                    )}
                  </td>

                  <td>
                    {application.programme_requested}
                  </td>

                  <td>
                    <span
                      className={`${styles.statusPill} ${
                        styles[
                          `status_${application.status}`
                        ]
                      }`}
                    >
                      {application.status.replaceAll(
                        "_",
                        " ",
                      )}
                    </span>
                  </td>

                  <td>
                    {new Date(
                      application.submitted_at,
                    ).toLocaleDateString("en-SG")}
                  </td>

                  <td>
                    <Link
                      href={`/admin/affiliates/${application.id}`}
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}

              {!applications?.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className={styles.emptyCell}
                  >
                    No applications match this
                    filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
