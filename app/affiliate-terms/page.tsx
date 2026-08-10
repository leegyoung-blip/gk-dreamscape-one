import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Affiliate Programme Terms | Dreamscape One",
  description:
    "Terms and conditions for participation in the Dreamscape Affiliate Programme operated by Guru Kids Pro.",
};

const EFFECTIVE_DATE = "11 August 2026";
const TERMS_VERSION = "affiliate-terms-v3-2026-08-11";

function Heading({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span>{number}</span>
      <h2>{children}</h2>
    </div>
  );
}

export default function AffiliateTermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden="true">
              ✦
            </div>
            <div>
              <p className={styles.brandName}>DREAMSCAPE ONE</p>
              <p className={styles.brandSub}>Powered by Guru Kids Pro</p>
            </div>
          </div>

          <p className={styles.eyebrow}>Programme terms</p>
          <h1>Affiliate Programme Terms</h1>
          <p className={styles.heroText}>
            These Terms govern applications to and participation in the currently
            available Dreamscape Regular Affiliate Programme. Affiliate Plus and
            Affiliate Pro are announced as coming soon but are not currently open
            for application, purchase, approval, activation, or participation.
          </p>

          <div className={styles.metaGrid}>
            <div>
              <span>Effective date</span>
              <strong>{EFFECTIVE_DATE}</strong>
            </div>
            <div>
              <span>Terms version</span>
              <strong>{TERMS_VERSION}</strong>
            </div>
            <div>
              <span>Operator</span>
              <strong>Guru Kids Pro · UEN 53232375X</strong>
            </div>
          </div>

          <div className={styles.notice}>
            <strong>Acceptance:</strong> By submitting an application, selecting an
            acceptance checkbox, completing approved onboarding, or continuing to
            participate after an updated version takes effect, you agree to these Terms.
          </div>
        </header>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <nav aria-label="Affiliate Terms navigation">
              <p className={styles.sidebarLabel}>On this page</p>
              <a href="#operator">Operator</a>
              <a href="#eligibility">Eligibility</a>
              <a href="#tracking">Referral attribution</a>
              <a href="#commission">Commission</a>
              <a href="#future-tiers">Future tiers</a>
              <a href="#payouts">Payouts</a>
              <a href="#promotion">Promotion rules</a>
              <a href="#termination">Termination</a>
              <a href="#legal">Legal terms</a>
            </nav>
            <div className={styles.sidebarLinks}>
              <p className={styles.sidebarLabel}>Related pages</p>
              <Link href="/affiliate">Programme overview</Link>
              <Link href="/affiliate/apply">Regular Affiliate application</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">All programme terms</Link>
            </div>
          </aside>

          <div>
            <section id="operator" className={styles.card}>
              <Heading number="1">Operator and scope</Heading>
              <p>
                The Dreamscape Affiliate Programme is operated by{" "}
                <strong>Guru Kids Pro</strong>, UEN <strong>53232375X</strong>, of
                Blk 4 Queen&apos;s Road, #02-127, Singapore (“<strong>Guru Kids Pro</strong>”,
                “<strong>Dreamscape</strong>”, “<strong>we</strong>”, “<strong>us</strong>”
                or “<strong>our</strong>”).
              </p>
              <p>
                These Terms apply to every approved participant in the currently
                available Regular Affiliate tier. A separate signed creator, KOL,
                campaign or commercial agreement may add to or override specific
                provisions only for the arrangement it expressly covers.
              </p>
              <p>
                Affiliate Plus and Affiliate Pro may be displayed publicly as coming
                soon. Their planned descriptions do not make those tiers available and
                do not create a contractual right to any future feature, price,
                commission rate, qualification rule, launch date or benefit.
              </p>
              <p>
                Programme enquiries and formal notices must be sent to{" "}
                <a href="mailto:admin@gurukidspro.com">admin@gurukidspro.com</a>.
              </p>
            </section>

            <section className={styles.card}>
              <Heading number="2">Definitions</Heading>
              <dl className={styles.definitionList}>
                <div>
                  <dt>Affiliate</dt>
                  <dd>
                    A person or organisation approved in writing to participate in
                    the Regular Affiliate tier under these Terms.
                  </dd>
                </div>
                <div>
                  <dt>Eligible Customer</dt>
                  <dd>
                    A new customer whose eligible Dreamscape Student Access purchase
                    is validly attributed to the Affiliate and satisfies these Terms.
                  </dd>
                </div>
                <div>
                  <dt>Eligible Subscription</dt>
                  <dd>
                    A paid public Dreamscape Student Access subscription designated by
                    us as commissionable. Guru Kids Pro class-companion plans,
                    Education Licences, complimentary access and excluded promotions
                    are not commissionable unless confirmed in writing.
                  </dd>
                </div>
                <div>
                  <dt>Completed Billing Cycle</dt>
                  <dd>
                    A paid subscription period completed without refund, reversal,
                    chargeback, fraud, payment failure or other ineligibility.
                  </dd>
                </div>
                <div>
                  <dt>Net Subscription Revenue</dt>
                  <dd>
                    Eligible subscription fees actually received by us after
                    discounts, credits, taxes where applicable, refunds, reversals and
                    chargebacks.
                  </dd>
                </div>
              </dl>
            </section>

            <section id="eligibility" className={styles.card}>
              <Heading number="3">Eligibility and approval</Heading>
              <ol>
                <li>
                  Applicants must be at least 18 years old and able to enter a binding
                  agreement.
                </li>
                <li>
                  The Programme is intended for suitable educators, private tutors,
                  child-focused businesses, and parenting or education creators.
                </li>
                <li>
                  The public application currently applies only to the Regular Affiliate
                  tier. Affiliate Plus and Affiliate Pro cannot presently be selected or
                  applied for.
                </li>
                <li>
                  Singapore Affiliates are normally paid through PayNow. International
                  participation requires prior written approval and may use a separately
                  agreed payout method.
                </li>
                <li>
                  Submission does not guarantee approval. We may approve, reject,
                  request more information, impose conditions, suspend review, or close
                  an application at our discretion.
                </li>
                <li>
                  Approval is personal to the approved Affiliate and may not be
                  transferred, sold, sublicensed, shared or used by an unapproved person
                  or entity.
                </li>
                <li>
                  The Affiliate must keep application, contact, payment and business
                  information accurate throughout participation.
                </li>
              </ol>
            </section>

            <section id="tracking" className={styles.card}>
              <Heading number="4">Referral tracking and attribution</Heading>
              <ol>
                <li>
                  A referral is commissionable only when the Eligible Customer enters
                  and submits the specific referral code assigned to the Affiliate
                  during the relevant Dreamscape signup or purchase process.
                </li>
                <li>
                  An affiliate link may direct the customer to Dreamscape or prefill a
                  referral code, but the referral code must still be successfully
                  recorded in our systems. Link clicks, cookies, browser history or
                  verbal claims alone do not create attribution.
                </li>
                <li>
                  The customer must use the Affiliate&apos;s own approved code. A missing,
                  invalid, expired, altered or different referral code does not qualify.
                </li>
                <li>
                  Only one Affiliate may be attributed to an Eligible Customer.
                  Attribution cannot normally be added, transferred, replaced or
                  changed after the customer&apos;s first eligible signup or purchase.
                </li>
                <li>
                  Our referral-code and transaction records are final unless we identify
                  a clear and verifiable technical error.
                </li>
                <li>
                  There are no second-level or multi-level commissions. A referred
                  customer&apos;s later referrals do not generate commission for the original
                  Affiliate.
                </li>
              </ol>
            </section>

            <section id="commission" className={styles.card}>
              <Heading number="5">Regular commission and 12-month limit</Heading>
              <div className={styles.highlight}>
                <strong>Current Regular Affiliate rate: 10%</strong>
                <p>
                  Commission is calculated on Net Subscription Revenue from an
                  Eligible Subscription validly attributed through the Affiliate&apos;s
                  specific referral code.
                </p>
              </div>

              <h3>Maximum commission period per referred customer</h3>
              <ol>
                <li>
                  Each Eligible Customer may generate commission for a maximum of
                  <strong> 12 consecutive months</strong>, beginning on the date of that
                  customer&apos;s first successful eligible subscription payment.
                </li>
                <li>
                  The 12-month period continues to run even if the customer pauses,
                  downgrades, upgrades, changes plans or temporarily stops paying.
                </li>
                <li>
                  Only eligible paid billing cycles completed within that 12-month
                  period are commissionable.
                </li>
                <li>
                  No commission is payable for any payment, renewal or reactivation
                  occurring after the end of the customer&apos;s 12-month commission period.
                </li>
                <li>
                  The 12-month limit applies separately to each validly referred
                  customer, not to each subscription, product, plan change or account
                  created for the same customer.
                </li>
              </ol>

              <h3>Monthly subscriptions</h3>
              <ol>
                <li>
                  The first monthly billing cycle becomes commissionable only after it
                  has been successfully paid and completed without refund, reversal,
                  chargeback, fraud, payment failure or other ineligibility.
                </li>
                <li>
                  Commission may then be earned on each eligible completed monthly
                  billing cycle falling within the customer&apos;s 12-month commission period.
                </li>
                <li>
                  Commission stops at the earliest of cancellation, expiry, payment
                  failure, refund, chargeback, fraud, other ineligibility, termination of
                  the Affiliate&apos;s participation, or the end of the 12-month commission
                  period.
                </li>
              </ol>

              <h3>Annual subscriptions</h3>
              <ol>
                <li>
                  Total Regular Affiliate annual commission is 10% of eligible annual
                  Net Subscription Revenue actually received by us.
                </li>
                <li>
                  Annual commission may be released in 12 monthly portions after the
                  annual payment is verified, subject to continued eligibility and
                  adjustment for refunds, reversals, disputes, chargebacks or fraud.
                </li>
                <li>
                  Minor rounding adjustments may be applied to the final portion so the
                  total paid commission equals the approved percentage.
                </li>
                <li>
                  An annual renewal is commissionable only when the renewal payment falls
                  within the original customer&apos;s 12-month commission period. A renewal
                  after that period does not begin a new commission term.
                </li>
              </ol>

              <p className={styles.smallPrint}>
                Illustrations and earnings examples are not guarantees. Actual earnings
                depend on the approved rate, purchased plan, valid referral-code
                attribution, discounts, customer eligibility, completed payment, the
                12-month limit and these Terms.
              </p>
            </section>

            <section id="future-tiers" className={styles.card}>
              <Heading number="6">Affiliate Plus, Affiliate Pro and separate campaigns</Heading>

              <h3>Affiliate Plus and Affiliate Pro</h3>
              <ol>
                <li>
                  As at the Effective Date, Affiliate Plus and Affiliate Pro are
                  <strong> coming soon</strong> and are not available for application,
                  purchase, approval, activation or participation.
                </li>
                <li>
                  Any public reference to a planned Plus toolkit price, wallet pass,
                  QR tools, marketing materials, advanced analytics, higher commission,
                  co-branding, custom landing pages or other planned feature is
                  informational only until the relevant tier formally launches.
                </li>
                <li>
                  A Regular Affiliate does not acquire a right to future Plus or Pro
                  access merely by joining, paying another Dreamscape fee, generating a
                  particular number of referrals or remaining active for a particular
                  period.
                </li>
                <li>
                  If either tier launches, we may introduce separate eligibility rules,
                  pricing, commission rates, benefits, additional terms, limits and
                  onboarding requirements.
                </li>
              </ol>

              <h3>Separate creator or campaign arrangements</h3>
              <ol>
                <li>
                  Dreamscape may separately negotiate a written creator, KOL, campaign,
                  sponsorship or commercial arrangement with a suitable party at its
                  discretion.
                </li>
                <li>
                  A separate arrangement is not Affiliate Plus or Affiliate Pro unless
                  the written agreement expressly says so.
                </li>
                <li>
                  Any separately agreed commission rate, content deliverables, usage
                  rights, fixed fees, campaign period or commercial conditions apply only
                  to the extent stated in that written agreement.
                </li>
              </ol>
            </section>

            <section id="payouts" className={styles.card}>
              <Heading number="7">Payouts, records and adjustments</Heading>
              <ol>
                <li>Eligible commission is collated at the end of each calendar month.</li>
                <li>
                  Payouts are scheduled between the 7th and 10th of the following month.
                  A weekend, public holiday, banking disruption or processing issue may
                  move payment to the next practical business day.
                </li>
                <li>
                  Singapore payouts are made through PayNow using verified details
                  supplied by the Affiliate. There is currently no minimum payout
                  threshold.
                </li>
                <li>
                  Only an approved mobile number or UEN may be collected as a PayNow
                  proxy. Affiliates must not submit another person&apos;s details without
                  authority.
                </li>
                <li>
                  If commission is paid on a transaction later refunded, reversed,
                  disputed, charged back, fraudulent or otherwise ineligible, we may
                  deduct the amount from future payouts or request repayment.
                </li>
                <li>
                  Payout queries must be raised within 30 days after the relevant
                  statement or payment date with reasonable supporting information.
                </li>
                <li>
                  Affiliates are responsible for their own tax, accounting, reporting
                  and professional-advice obligations.
                </li>
              </ol>
            </section>

            <section id="promotion" className={styles.card}>
              <Heading number="8">Promotion, advertising and brand standards</Heading>
              <p>The Affiliate must:</p>
              <ul>
                <li>make truthful, current, accurate and age-appropriate statements;</li>
                <li>
                  clearly disclose the affiliate or sponsored relationship where required;
                </li>
                <li>use only approved logos, prices, claims, links, codes and materials;</li>
                <li>
                  comply with applicable advertising, anti-spam, privacy, platform and
                  consumer-protection rules; and
                </li>
                <li>remove or stop using outdated materials when instructed.</li>
              </ul>

              <p>The Affiliate must not:</p>
              <ul>
                <li>
                  promise guaranteed academic results, guaranteed earnings or
                  unauthorised discounts;
                </li>
                <li>
                  send spam, use deceptive messaging, impersonate Dreamscape or pressure
                  children or parents;
                </li>
                <li>
                  bid on Dreamscape or Guru Kids Pro brand terms in paid search, register
                  confusing domains or social handles, or run unauthorised advertisements;
                </li>
                <li>
                  claim to be an employee, franchisee, exclusive representative, owner or
                  authorised agent beyond the limited affiliate relationship;
                </li>
                <li>
                  use self-referrals, circular referrals, fake accounts, tracking
                  manipulation or other artificial transactions; or
                </li>
                <li>
                  promote Dreamscape alongside unlawful, harmful, discriminatory,
                  sexually explicit or otherwise unsuitable content.
                </li>
              </ul>
            </section>

            <section className={styles.card}>
              <Heading number="9">Data protection and confidentiality</Heading>
              <ol>
                <li>
                  Personal data is handled in accordance with the Dreamscape Privacy
                  Policy and applicable law.
                </li>
                <li>
                  Affiliates must not collect children&apos;s personal data on our behalf
                  unless expressly authorised in writing.
                </li>
                <li>
                  Non-public programme, customer, campaign, payout, commercial and
                  technical information must be kept confidential and securely protected.
                </li>
                <li>
                  Affiliate links, codes, dashboards and materials may be used only for
                  approved Programme purposes.
                </li>
              </ol>
            </section>

            <section id="termination" className={styles.card}>
              <Heading number="10">Leaving, suspension and termination</Heading>
              <ol>
                <li>
                  An Affiliate may leave by written notice to{" "}
                  <a href="mailto:admin@gurukidspro.com">admin@gurukidspro.com</a>.
                </li>
                <li>
                  Valid commission accrued before the effective termination date remains
                  payable after verification.
                </li>
                <li>
                  Commission eligibility for existing subscribers ends at the earliest of
                  the Affiliate&apos;s effective termination date, the customer becoming
                  ineligible, or the end of that customer&apos;s 12-month commission period.
                  There is no lifetime, perpetual or post-termination right to future
                  commission.
                </li>
                <li>
                  We may suspend or terminate immediately for fraud, manipulation, spam,
                  unlawful conduct, misleading claims, brand misuse, confidentiality
                  breach, non-cooperation or material breach.
                </li>
                <li>
                  Commission connected to fraud, deliberate manipulation or serious
                  breach may be withheld or forfeited to the extent reasonably connected
                  to that conduct.
                </li>
                <li>
                  We may amend, suspend or discontinue the Programme. Reasonable notice
                  will be given where practicable, but immediate action may be required
                  for legal, financial, security, safety or platform reasons.
                </li>
              </ol>
            </section>

            <section id="legal" className={styles.card}>
              <Heading number="11">General legal terms</Heading>
              <ol>
                <li>
                  The Affiliate is an independent participant. These Terms do not create
                  employment, agency, franchise, partnership, joint venture or exclusivity.
                </li>
                <li>
                  Dreamscape does not guarantee traffic, referrals, approval, subscriber
                  retention, commission level or income.
                </li>
                <li>
                  To the extent permitted by law, neither party is liable for indirect,
                  incidental, special or consequential loss, lost profit, lost opportunity
                  or reputational loss.
                </li>
                <li>
                  Our total aggregate liability for an Affiliate claim is limited to
                  approved commission paid or payable to that Affiliate during the six
                  months before the event giving rise to the claim, except where liability
                  cannot lawfully be limited.
                </li>
                <li>
                  The Affiliate may not assign participation without our written consent.
                </li>
                <li>
                  If a provision is invalid or unenforceable, it will be adjusted or
                  removed only to the minimum extent required and the remaining provisions
                  continue.
                </li>
                <li>
                  These Terms are governed by Singapore law. The parties should first
                  attempt to resolve a dispute through written discussion for at least 30
                  days, unless urgent relief is reasonably required. Singapore courts have
                  exclusive jurisdiction, subject to mandatory rights that cannot be excluded.
                </li>
              </ol>
            </section>

            <section className={styles.contactCard}>
              <div>
                <p className={styles.eyebrow}>Questions or formal notices</p>
                <h2>Contact Guru Kids Pro</h2>
                <p>
                  Guru Kids Pro · UEN 53232375X
                  <br />
                  Blk 4 Queen&apos;s Road, #02-127, Singapore
                </p>
              </div>
              <a
                className={styles.contactButton}
                href="mailto:admin@gurukidspro.com"
              >
                admin@gurukidspro.com
              </a>
            </section>

            <footer className={styles.footer}>
              <p>Dreamscape One — Powered by Guru Kids Pro</p>
              <div>
                <Link href="/affiliate">Programme</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/affiliate/apply">Apply Regular</Link>
                <a href="#operator">Back to top</a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
