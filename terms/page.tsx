import type { Metadata } from "next";
import styles from "./terms.module.css";

export const metadata: Metadata = {
  title: "Terms & Conditions | Dreamscape One",
  description:
    "Terms and conditions for the Dreamscape Affiliate Programme and Dreamscape Education Licence.",
};

const LINKS = {
  privacy: "/privacy",
  acceptableUse: "/acceptable-use",
  parentalConsent: "/parental-consent",
  affiliateApplication: "/affiliate/apply",
  educationLicenceApplication: "/education-licence/apply",
};

const effectiveDate = "1 August 2026";

function SectionHeading({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span>{number}</span>
      <h3>{title}</h3>
    </div>
  );
}

function DefinitionList({
  items,
}: {
  items: Array<{ term: string; description: string }>;
}) {
  return (
    <dl className={styles.definitionList}>
      {items.map((item) => (
        <div key={item.term}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.backgroundOrbOne} aria-hidden="true" />
      <div className={styles.backgroundOrbTwo} aria-hidden="true" />

      <header className={styles.hero}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark} aria-hidden="true">
            ✦
          </div>
          <div>
            <p className={styles.brandName}>DREAMSCAPE ONE</p>
            <p className={styles.poweredBy}>Powered by Guru Kids Pro</p>
          </div>
        </div>

        <p className={styles.eyebrow}>Legal & Programme Terms</p>
        <h1>Terms &amp; Conditions</h1>
        <p className={styles.heroText}>
          These terms govern participation in the Dreamscape Affiliate
          Programme and use of the Dreamscape Education Licence.
        </p>

        <div className={styles.metaGrid}>
          <div>
            <span>Effective date</span>
            <strong>{effectiveDate}</strong>
          </div>
          <div>
            <span>Last updated</span>
            <strong>{effectiveDate}</strong>
          </div>
          <div>
            <span>Operator</span>
            <strong>Guru Kids Pro · UEN 53232375X</strong>
          </div>
        </div>

        <div className={styles.notice}>
          <strong>Important:</strong> By submitting an application, selecting an
          acceptance checkbox, paying an invoice, signing an order form, or
          continuing to participate after receiving updated terms, you agree to
          the applicable provisions on this page.
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav aria-label="Terms page navigation">
            <p className={styles.sidebarLabel}>On this page</p>
            <a href="#overview">Overview</a>
            <a href="#affiliate">Affiliate Programme</a>
            <a href="#education-licence">Education Licence</a>
            <a href="#general-terms">General Terms</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className={styles.quickLinks}>
            <p className={styles.sidebarLabel}>Related policies</p>
            <a href={LINKS.privacy}>Privacy Policy</a>
            <a href={LINKS.acceptableUse}>Acceptable Use Policy</a>
            <a href={LINKS.parentalConsent}>Parent / Guardian Consent</a>
          </div>

          <p className={styles.printNote}>Use your browser’s print command for a print-friendly copy.</p>
        </aside>

        <div className={styles.content}>
          <section id="overview" className={styles.card}>
            <p className={styles.eyebrow}>Overview</p>
            <h2>Who you are contracting with</h2>
            <p>
              These Terms are issued by <strong>Guru Kids Pro</strong>, UEN{" "}
              <strong>53232375X</strong>, of Blk 4 Queen&apos;s Road, #02-127,
              Singapore (“<strong>Guru Kids Pro</strong>”, “
              <strong>Dreamscape</strong>”, “<strong>we</strong>”, “
              <strong>us</strong>” or “<strong>our</strong>”).
            </p>
            <p>
              All legal, affiliate, licensing, billing and support
              communications should be sent to{" "}
              <a href="mailto:admin@gurukidspro.com">
                admin@gurukidspro.com
              </a>
              .
            </p>

            <div className={styles.twoColumnNote}>
              <div>
                <strong>Affiliate Programme</strong>
                <p>
                  For approved educators, child-focused businesses and
                  parenting or education creators who promote eligible
                  Dreamscape Student Access subscriptions.
                </p>
                <a href="#affiliate">Read Affiliate Terms →</a>
              </div>
              <div>
                <strong>Education Licence</strong>
                <p>
                  For approved private tutors, tuition centres and education
                  businesses purchasing 5–20 student licences.
                </p>
                <a href="#education-licence">Read Licence Terms →</a>
              </div>
            </div>
          </section>

          <article id="affiliate" className={styles.programme}>
            <div className={`${styles.programmeHeader} ${styles.affiliateHeader}`}>
              <p className={styles.eyebrow}>Programme One</p>
              <h2>Dreamscape Affiliate Programme Terms</h2>
              <p>
                These provisions apply to every approved standard affiliate and
                to KOL or creator partners except where a separate written
                campaign agreement expressly overrides them.
              </p>
              <a
                href={LINKS.affiliateApplication}
                className={styles.headerButton}
              >
                Affiliate application
              </a>
            </div>

            <section className={styles.card}>
              <SectionHeading number="1" title="Definitions" />
              <DefinitionList
                items={[
                  {
                    term: "Affiliate",
                    description:
                      "A person or organisation approved in writing to participate in the Dreamscape Affiliate Programme.",
                  },
                  {
                    term: "Eligible Customer",
                    description:
                      "A new customer who purchases an eligible Dreamscape Student Access subscription through a valid affiliate link or referral code and satisfies these Terms.",
                  },
                  {
                    term: "Eligible Subscription",
                    description:
                      "A paid public Dreamscape Student Access plan designated by us as commissionable. Guru Kids Pro class-companion plans, Education Licences, refunds, free access and excluded promotions are not commissionable unless we confirm otherwise in writing.",
                  },
                  {
                    term: "Completed Billing Cycle",
                    description:
                      "A paid subscription period that has been fully completed without refund, reversal, chargeback, fraud or payment failure.",
                  },
                  {
                    term: "Net Subscription Revenue",
                    description:
                      "Subscription fees actually received by us after discounts, credits, refunds, reversals, chargebacks and applicable taxes.",
                  },
                ]}
              />
            </section>

            <section className={styles.card}>
              <SectionHeading number="2" title="Eligibility and approval" />
              <ol>
                <li>
                  Applicants must be at least 18 years old and legally able to
                  enter into a binding agreement.
                </li>
                <li>
                  The standard programme is intended for educators, private
                  tutors, child-focused businesses, and parenting or education
                  creators whose audience is relevant to Dreamscape.
                </li>
                <li>
                  Singapore affiliates are paid through PayNow. International
                  participation is available only with our prior written
                  approval and may require a different payment arrangement.
                </li>
                <li>
                  Submission of an application does not guarantee approval. We
                  may approve, reject, suspend, request additional information,
                  or place conditions on an account at our discretion.
                </li>
                <li>
                  An approval is personal to the approved Affiliate and may not
                  be transferred, sublicensed or shared.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="3" title="Referral tracking and attribution" />
              <ol>
                <li>
                  Approved referrals may be tracked through a unique affiliate
                  link, referral code, or another tracking method supplied by us.
                </li>
                <li>
                  A valid affiliate link normally has a 30-day tracking period,
                  subject to browser settings, device changes, cookie deletion,
                  technical limitations and customer actions.
                </li>
                <li>
                  A valid referral code entered during signup overrides an
                  earlier tracked affiliate link.
                </li>
                <li>
                  Where no referral code is used, the most recent valid affiliate
                  link recorded by our system receives attribution.
                </li>
                <li>
                  Attribution cannot normally be added, transferred or changed
                  after signup. Our tracking records are final unless there is a
                  clear and verifiable technical error.
                </li>
                <li>
                  No second-level, chain or multi-level commission applies. If a
                  referred customer later refers someone else, that new signup
                  does not belong to the original Affiliate unless it uses that
                  Affiliate&apos;s valid link or code.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="4" title="Standard commission" />
              <div className={styles.highlightBox}>
                <strong>Current standard rate: 20% recurring commission</strong>
                <p>
                  Calculated on Net Subscription Revenue from each eligible
                  referred subscription.
                </p>
              </div>

              <h4>Monthly subscriptions</h4>
              <ol>
                <li>
                  Commission eligibility begins only after the Eligible Customer
                  completes the first full paid billing cycle.
                </li>
                <li>
                  A commission is then earned for each later eligible completed
                  billing cycle while the subscription remains active and paid.
                </li>
                <li>
                  Commission stops when the subscription is cancelled, expires,
                  becomes unpaid, is refunded, is charged back, or otherwise
                  becomes ineligible.
                </li>
              </ol>

              <h4>Annual subscriptions</h4>
              <ol>
                <li>
                  The total commission for an annual plan is 20% of the eligible
                  annual Net Subscription Revenue.
                </li>
                <li>
                  That commission is released in 12 monthly portions, beginning
                  after the first month of active paid service.
                </li>
                <li>
                  Minor rounding adjustments may be made to the final portion so
                  the total equals the applicable commission percentage.
                </li>
                <li>
                  Cancelling automatic renewal does not end commission during
                  the already-paid annual term. Eligibility ends if the annual
                  payment is refunded, reversed, charged back, fraudulent, or
                  the account is terminated for abuse.
                </li>
                <li>
                  A paid annual renewal begins a new 12-month commission term.
                </li>
              </ol>

              <p className={styles.smallPrint}>
                Illustrations and earnings examples are not guarantees. Actual
                commission depends on the plan purchased, discounts, customer
                eligibility, continued payment and these Terms.
              </p>
            </section>

            <section className={styles.card}>
              <SectionHeading number="5" title="Payouts, records and adjustments" />
              <ol>
                <li>
                  Eligible commission is collated at the end of each calendar
                  month.
                </li>
                <li>
                  Payouts are scheduled between the 7th and 10th of the following
                  month. If the date falls on a weekend, public holiday, banking
                  disruption or processing delay, payment may be made on the next
                  practical business day.
                </li>
                <li>
                  Singapore payouts are made through PayNow using the verified
                  details supplied by the Affiliate. There is currently no
                  minimum payout threshold.
                </li>
                <li>
                  The Affiliate is responsible for keeping payment and contact
                  details accurate. We are not responsible for delay caused by
                  incomplete or incorrect details.
                </li>
                <li>
                  If commission was paid on a transaction later refunded,
                  reversed, charged back, disputed, fraudulent or otherwise
                  ineligible, we may deduct the amount from future payouts or
                  request repayment.
                </li>
                <li>
                  Affiliates must raise a payout query within 30 days after the
                  relevant statement or payment date and provide reasonable
                  supporting information.
                </li>
                <li>
                  Affiliates are responsible for their own taxes, reporting,
                  registrations and professional advice.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="6" title="KOL and creator partnerships" />
              <ol>
                <li>
                  Approved parenting and education creators may be offered an
                  enhanced commission rate of up to 40%.
                </li>
                <li>
                  The maximum rate is not automatic. Rates depend on audience
                  fit, content quality, campaign scope, deliverables, usage
                  rights, performance and written approval.
                </li>
                <li>
                  KOL deliverables, timelines, disclosure requirements,
                  exclusivity, content approvals and payment terms may be set out
                  in a separate written campaign agreement.
                </li>
                <li>
                  Where a signed campaign agreement conflicts with these Terms,
                  the campaign agreement controls only for that campaign.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="7" title="Promotion and brand standards" />
              <p>The Affiliate must:</p>
              <ul>
                <li>
                  make truthful, accurate and age-appropriate statements;
                </li>
                <li>
                  clearly disclose the affiliate or sponsored relationship where
                  required;
                </li>
                <li>
                  use only current, approved logos, prices, claims and materials;
                </li>
                <li>
                  follow applicable advertising, privacy, anti-spam, platform
                  and consumer-protection rules; and
                </li>
                <li>
                  stop using outdated materials or claims when instructed.
                </li>
              </ul>

              <p>The Affiliate must not:</p>
              <ul>
                <li>
                  make guaranteed income, guaranteed academic-result or
                  misleading product claims;
                </li>
                <li>
                  send spam, use deceptive messaging, impersonate Dreamscape or
                  pressure parents or children;
                </li>
                <li>
                  bid on Dreamscape or Guru Kids Pro brand terms in paid search,
                  register confusing domains or social handles, or run
                  unauthorised advertisements;
                </li>
                <li>
                  alter our branding in a misleading way or claim to be an
                  employee, franchisee, exclusive representative or owner;
                </li>
                <li>
                  purchase through their own referral code, arrange circular
                  referrals, manipulate tracking or create false accounts; or
                </li>
                <li>
                  promote Dreamscape alongside unlawful, harmful,
                  discriminatory, sexually explicit or otherwise unsuitable
                  content.
                </li>
              </ul>
            </section>

            <section className={styles.card}>
              <SectionHeading number="8" title="Data, confidentiality and access" />
              <ol>
                <li>
                  Affiliates may receive only the information reasonably needed
                  to administer the programme and must protect it from
                  unauthorised access or disclosure.
                </li>
                <li>
                  Affiliates must not collect children&apos;s personal data on our
                  behalf unless expressly authorised in writing.
                </li>
                <li>
                  Non-public commercial, campaign, customer or technical
                  information must be kept confidential.
                </li>
                <li>
                  Programme dashboards, links, codes and materials may be used
                  only for approved programme purposes.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="9" title="Leaving, suspension and termination" />
              <ol>
                <li>
                  An Affiliate may leave the programme by written notice to{" "}
                  <a href="mailto:admin@gurukidspro.com">
                    admin@gurukidspro.com
                  </a>
                  .
                </li>
                <li>
                  Valid commission accrued before the effective termination date
                  remains payable after verification.
                </li>
                <li>
                  Recurring commission eligibility for existing subscribers ends
                  when the Affiliate&apos;s participation ends. There is no
                  continuing lifetime right to future commission.
                </li>
                <li>
                  We may suspend or terminate participation immediately for
                  fraud, manipulation, spam, unlawful conduct, misleading claims,
                  brand misuse, confidentiality breach, non-cooperation or any
                  material breach.
                </li>
                <li>
                  Commission connected to fraud, deliberate manipulation or a
                  serious breach may be withheld or forfeited to the extent
                  reasonably connected to that conduct.
                </li>
                <li>
                  We may amend, suspend or discontinue the programme. We will
                  provide reasonable notice where practicable, but immediate
                  action may be required for legal, safety, security, financial
                  or platform reasons.
                </li>
              </ol>
            </section>
          </article>

          <article id="education-licence" className={styles.programme}>
            <div className={`${styles.programmeHeader} ${styles.licenceHeader}`}>
              <p className={styles.eyebrow}>Programme Two</p>
              <h2>Dreamscape Education Licence Terms</h2>
              <p>
                These provisions apply to approved private tutors, tuition
                centres and education businesses purchasing a standard
                Dreamscape Education Licence for 5–20 student accounts.
              </p>
              <a
                href={LINKS.educationLicenceApplication}
                className={styles.headerButton}
              >
                Licence enquiry
              </a>
            </div>

            <section className={styles.card}>
              <SectionHeading number="1" title="Definitions and licence scope" />
              <DefinitionList
                items={[
                  {
                    term: "Organisation",
                    description:
                      "The approved business, private tutor or education provider named on the invoice or order form.",
                  },
                  {
                    term: "Student Seat",
                    description:
                      "One named student account allocated to the Organisation during the active Licence Term.",
                  },
                  {
                    term: "Teacher/Admin Account",
                    description:
                      "A combined educator and organisation-administration account authorised to manage the Organisation’s linked students.",
                  },
                  {
                    term: "Licence Term",
                    description:
                      "The 12-month period beginning on the agreed activation date.",
                  },
                  {
                    term: "Learning Missions",
                    description:
                      "The included Core English, Core Mathematics and Science Missions, assessments and related progress features made available under the package.",
                  },
                ]}
              />

              <p>
                The Licence is a limited, non-exclusive, non-transferable,
                revocable right to access Dreamscape for the Organisation&apos;s
                own educational activities. No ownership or intellectual
                property rights are transferred.
              </p>
            </section>

            <section className={styles.card}>
              <SectionHeading number="2" title="Launch packages and fees" />
              <div className={styles.tableWrapper}>
                <table>
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Student accounts</th>
                      <th>Teacher/Admin</th>
                      <th>Annual fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Starter</td>
                      <td>5</td>
                      <td>1</td>
                      <td>SGD799</td>
                    </tr>
                    <tr>
                      <td>Classroom</td>
                      <td>10</td>
                      <td>1</td>
                      <td>SGD1,399</td>
                    </tr>
                    <tr>
                      <td>Growth</td>
                      <td>15</td>
                      <td>1</td>
                      <td>SGD1,999</td>
                    </tr>
                    <tr>
                      <td>Centre</td>
                      <td>20</td>
                      <td>1</td>
                      <td>SGD2,499</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <ul>
                <li>
                  The current standard programme supports 5–20 student accounts.
                </li>
                <li>
                  Each package includes one combined Teacher/Admin Account.
                </li>
                <li>
                  Additional Teacher/Admin Accounts cost SGD149 per account per
                  year.
                </li>
                <li>
                  The usual setup fee is SGD15 per activated account and is
                  currently waived for standard annual packages. We may revise
                  or withdraw the waiver for future purchases or renewals.
                </li>
                <li>
                  Prices are in Singapore dollars and may be subject to
                  applicable taxes, bank charges and transfer fees.
                </li>
              </ul>
            </section>

            <section className={styles.card}>
              <SectionHeading number="3" title="Term, payment and renewal" />
              <ol>
                <li>
                  The Licence runs for 12 months from the agreed start date and
                  may begin at any time in the calendar year.
                </li>
                <li>
                  The full annual fee must be paid in advance before activation.
                </li>
                <li>
                  Singapore customers may pay through PayNow or bank transfer.
                  International customers must use the method specified on the
                  invoice.
                </li>
                <li>
                  Renewal is manual. The Organisation must confirm and pay for
                  renewal before the next anniversary date.
                </li>
                <li>
                  Fees are non-refundable after activation except where we cannot
                  provide the contracted service, where the order form expressly
                  provides otherwise, or where a refund is required by law.
                </li>
                <li>
                  Renewal prices, packages and features may differ from the
                  previous term. Updated terms apply only after notice and
                  acceptance for the new term.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="4" title="Demonstration and 14-day pilot" />
              <ol>
                <li>An introductory product demonstration is complimentary.</li>
                <li>
                  An approved 14-day pilot costs SGD49.90 and includes five
                  Student Seats, one Teacher/Admin Account, account setup and an
                  introductory walkthrough.
                </li>
                <li>
                  The SGD49.90 pilot fee is credited in full against an eligible
                  annual package purchased within seven days after the pilot
                  ends.
                </li>
                <li>
                  Pilot fees are otherwise non-refundable. Pilot accounts may
                  have limits and may be removed after the pilot period.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="5" title="Included access" />
              <p>During an active Licence Term, each allocated student receives:</p>
              <ul>
                <li>
                  an individual Dreamscape account with saved progress;
                </li>
                <li>
                  access to included Core English, Core Mathematics and Science
                  Learning Missions;
                </li>
                <li>
                  included assessments, activities, results and explanations;
                </li>
                <li>
                  relevant content and platform updates released during the
                  active term; and
                </li>
                <li>
                  access at the Organisation&apos;s premises and at home, subject
                  to these Terms and the Acceptable Use Policy.
                </li>
              </ul>
              <p>
                Other Dreamscape worlds, premium activities, future modules,
                physical classes, merchandise, financial features or separate
                products are not included unless expressly stated in the order
                form.
              </p>
            </section>

            <section className={styles.card}>
              <SectionHeading number="6" title="Teacher and administration functions" />
              <p>The included Teacher/Admin Account may:</p>
              <ul>
                <li>view all linked student accounts in the Organisation;</li>
                <li>assign available Learning Missions and assessments;</li>
                <li>review attempts, submitted answers and explanations;</li>
                <li>monitor progress by subject, topic and activity; and</li>
                <li>request allocation or removal of Student Seats.</li>
              </ul>
              <p>
                Teachers may not presently create, edit, upload or customise
                official Dreamscape lessons, quizzes, questions or curriculum
                content. We may introduce additional functions later, subject to
                separate terms or pricing.
              </p>
            </section>

            <section className={styles.card}>
              <SectionHeading number="7" title="Account creation and student assignment" />
              <ol>
                <li>
                  Students or their parents create their own Dreamscape accounts
                  through the approved registration process.
                </li>
                <li>
                  The Organisation supplies the information reasonably required
                  for us to assign those accounts to the Organisation.
                </li>
                <li>
                  The Organisation must ensure all details are accurate and that
                  each account belongs to the correct authorised student.
                </li>
                <li>
                  Accounts, login credentials and Student Seats may not be
                  shared between multiple students.
                </li>
                <li>
                  One package is for one approved company, business or
                  independent tutor. It may not be shared across unrelated
                  tutors, separate legal entities, franchisees or branches
                  unless expressly approved in writing.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="8" title="Additional seats and package upgrades" />
              <h4>Additional Student Seats</h4>
              <ol>
                <li>
                  Seats may be added during an active term up to the maximum of
                  20 total Student Seats.
                </li>
                <li>
                  The fee is SGD19.90 per added student for each full Licence
                  month remaining.
                </li>
                <li>
                  A new seat activates on the next monthly licence anniversary
                  after payment is received. Partial months are not charged or
                  activated.
                </li>
              </ol>

              <h4>Package upgrades</h4>
              <div className={styles.formula}>
                Upgrade fee = annual package price difference ÷ 12 × full months
                remaining + SGD49 administration fee
              </div>
              <ol>
                <li>
                  Upgraded seats activate on the next monthly licence
                  anniversary after payment.
                </li>
                <li>
                  We do not charge both the SGD49 upgrade administration fee and
                  the usual SGD15-per-account setup fee for the same upgrade.
                </li>
                <li>
                  Downgrades are not available during an active term. A smaller
                  package may be selected at renewal if the number of active
                  accounts permits.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="9" title="Seat reassignment and unused seats" />
              <ol>
                <li>
                  A Student Seat may be reassigned when the original student
                  permanently leaves the Organisation.
                </li>
                <li>
                  Each purchased seat may be reassigned up to two times during
                  one annual Licence Term.
                </li>
                <li>
                  The replacement student receives a separate account and does
                  not inherit the previous student&apos;s answers, progress,
                  rewards or records.
                </li>
                <li>
                  Unused seats remain available for assignment during the active
                  term but do not extend the expiry date and have no cash,
                  refund, rollover or credit value.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="10" title="Setup, onboarding and support" />
              <ol>
                <li>
                  Included onboarding covers organisation setup,
                  student-assignment guidance, Teacher/Admin Account
                  introduction and a platform walkthrough.
                </li>
                <li>
                  Onboarding is normally scheduled within one week after full
                  payment and receipt of required information.
                </li>
                <li>
                  Standard support is provided through email and WhatsApp.
                </li>
                <li>
                  Non-urgent requests normally receive an initial response
                  within one to two business days. Resolution time depends on
                  complexity and third-party dependencies.
                </li>
                <li>
                  Guaranteed response times, emergency support and a dedicated
                  account manager are not included in the current 5–20 seat
                  programme.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="11" title="Consent, privacy and student data" />
              <ol>
                <li>
                  The Organisation is responsible for obtaining all legally
                  required parent or guardian consents before directing a child
                  to create an account or providing information for assignment.
                </li>
                <li>
                  The Organisation must clearly inform parents and students how
                  Dreamscape will be used and comply with applicable education,
                  privacy and child-data laws.
                </li>
                <li>
                  Each party must protect personal data under its control and use
                  it only for lawful, disclosed and authorised purposes.
                </li>
                <li>
                  International Organisations may be required to sign additional
                  data-processing or transfer terms.
                </li>
                <li>
                  The Organisation must promptly notify us of an account error,
                  unauthorised access or suspected data incident involving
                  Dreamscape.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="12" title="Branding and partner status" />
              <ol>
                <li>
                  The platform remains branded as{" "}
                  <strong>Dreamscape One — Powered by Guru Kids Pro</strong>.
                </li>
                <li>
                  Standard packages do not include white-labelling,
                  organisation logos, custom domains or platform rebranding.
                </li>
                <li>
                  During an active term, an approved Organisation may describe
                  itself as a <strong>Dreamscape Education Partner</strong>,
                  subject to our brand guidelines.
                </li>
                <li>
                  This description does not create a franchise, agency,
                  employment relationship, endorsement beyond the active
                  Licence, exclusivity or territorial rights.
                </li>
                <li>
                  The description and all brand materials must be removed when
                  the Licence expires, is suspended or is terminated.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="13" title="Intellectual property and prohibited use" />
              <p>The Organisation must not:</p>
              <ul>
                <li>claim Dreamscape content as its own;</li>
                <li>
                  copy, scrape, photograph, record, extract or reproduce content
                  except for ordinary authorised platform use;
                </li>
                <li>resell, sublicense or distribute platform access;</li>
                <li>
                  share accounts with another business, branch or unauthorised
                  person;
                </li>
                <li>
                  reverse engineer, interfere with, overload or attempt to bypass
                  platform controls;
                </li>
                <li>remove Dreamscape or Guru Kids Pro branding;</li>
                <li>
                  use content or data to build, train or improve a competing
                  product or dataset; or
                </li>
                <li>
                  upload unlawful, harmful, infringing or unsuitable content.
                </li>
              </ul>
              <p>
                All software, characters, designs, questions, text, graphics,
                databases, trademarks and other intellectual property remain
                owned by Guru Kids Pro or the relevant rights holder.
              </p>
            </section>

            <section className={styles.card}>
              <SectionHeading number="14" title="Availability, changes and maintenance" />
              <ol>
                <li>
                  Dreamscape is an evolving platform. We may update, replace,
                  reorganise or discontinue individual features and content.
                </li>
                <li>
                  We do not guarantee uninterrupted, completely secure or
                  error-free access. Maintenance, outages, security work and
                  third-party disruptions may affect availability.
                </li>
                <li>
                  We will not normally materially reduce the core paid Learning
                  Missions access purchased for an active term, except where
                  reasonably required for security, law, child safety, rights
                  protection, technical integrity or circumstances beyond our
                  reasonable control.
                </li>
                <li>
                  Content, reporting and functionality may differ across
                  devices, regions, user roles and release stages.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="15" title="Suspension, expiry and termination" />
              <ol>
                <li>
                  We may restrict or suspend access for non-payment, account
                  sharing, false registrations, fraud, content copying, data
                  misuse, security risk, unlawful activity or material breach.
                </li>
                <li>
                  Where reasonably possible, we will notify the Organisation and
                  allow a remediable breach to be corrected.
                </li>
                <li>
                  A 14-day grace period may be provided after expiry. During the
                  grace period, Teacher/Admin functions may become read-only or
                  restricted and no new work should be assigned unless renewal
                  is confirmed.
                </li>
                <li>
                  After the grace period, organisation-linked access, reporting
                  and assignment functions may be disabled.
                </li>
                <li>
                  Eligible students may be offered the option to continue
                  through a personal Student Access plan.
                </li>
                <li>
                  Termination for the Organisation&apos;s breach does not create a
                  refund right.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="16" title="International applications" />
              <ol>
                <li>
                  International applications are accepted subject to review,
                  technical availability, payment arrangements and applicable
                  legal requirements.
                </li>
                <li>
                  Approval is not guaranteed in every country or territory.
                </li>
                <li>
                  International customers are invoiced in Singapore dollars and
                  are responsible for transfer charges, taxes, duties and local
                  compliance.
                </li>
                <li>
                  We may require additional contractual, privacy, consent or
                  data-transfer documents before activation.
                </li>
              </ol>
            </section>
          </article>

          <article id="general-terms" className={styles.programme}>
            <div className={`${styles.programmeHeader} ${styles.generalHeader}`}>
              <p className={styles.eyebrow}>Applies to both programmes</p>
              <h2>General Legal Terms</h2>
              <p>
                These provisions apply to Affiliates and Education Licence
                Organisations unless a more specific provision above states
                otherwise.
              </p>
            </div>

            <section className={styles.card}>
              <SectionHeading number="1" title="Electronic acceptance and authority" />
              <ol>
                <li>
                  Acceptance may be recorded electronically through a checkbox,
                  submitted application, payment, digital signature, signed
                  order form, email confirmation or continued participation
                  after notice of updated terms.
                </li>
                <li>
                  A person accepting on behalf of a business confirms that they
                  have authority to bind that business.
                </li>
                <li>
                  We may retain electronic records of the accepted version, date,
                  account, order and related communications.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="2" title="Order of precedence" />
              <p>
                If documents conflict, the following order applies unless the
                later document expressly states otherwise:
              </p>
              <ol>
                <li>a signed campaign agreement or signed order form;</li>
                <li>an invoice or written commercial schedule;</li>
                <li>these Terms;</li>
                <li>the Acceptable Use Policy and linked policies; and</li>
                <li>general website or promotional materials.</li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="3" title="Disclaimers" />
              <ol>
                <li>
                  Dreamscape is an educational and simulation platform. It does
                  not guarantee academic grades, examination results, financial
                  outcomes, business success, user engagement or income.
                </li>
                <li>
                  Business, investing and financial simulations are for
                  educational purposes and are not financial, investment, legal
                  or tax advice.
                </li>
                <li>
                  To the extent permitted by law, the services are provided on an
                  “as available” basis and implied terms are excluded only to the
                  extent they may lawfully be excluded.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="4" title="Limitation of liability" />
              <ol>
                <li>
                  Neither party is liable for indirect, incidental, special or
                  consequential loss, loss of profit, loss of opportunity, loss
                  of goodwill, or loss arising from an unauthorised or
                  unsupported use of the service.
                </li>
                <li>
                  For an Affiliate claim, our total aggregate liability is
                  limited to the approved commission paid or payable to that
                  Affiliate during the six months immediately before the event
                  giving rise to the claim.
                </li>
                <li>
                  For an Education Licence claim, our total aggregate liability
                  is limited to the licence fees paid for the current Licence
                  Term.
                </li>
                <li>
                  Nothing in these Terms excludes or limits liability that cannot
                  lawfully be excluded or limited.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="5" title="Responsibility for breach" />
              <p>
                A participant is responsible for loss, claims, regulatory action
                or reasonable costs arising from its fraud, unlawful promotion,
                infringement, failure to obtain required consent, misuse of
                personal data, unauthorised account sharing, content copying or
                material breach of these Terms.
              </p>
            </section>

            <section className={styles.card}>
              <SectionHeading number="6" title="Events beyond reasonable control" />
              <p>
                Neither party is liable for delay or failure caused by events
                beyond its reasonable control, including internet or cloud
                outages, cyber incidents not caused by a failure to take
                reasonable precautions, natural events, public-health events,
                government action, labour disruption, utility failure or
                third-party service failure. Payment obligations already due are
                not excused.
              </p>
            </section>

            <section className={styles.card}>
              <SectionHeading number="7" title="Changes to these Terms" />
              <ol>
                <li>
                  We may update these Terms to reflect programme, pricing, legal,
                  security or operational changes.
                </li>
                <li>
                  Material changes will be notified through email, the platform,
                  the application flow or another reasonable channel.
                </li>
                <li>
                  Changes do not normally reduce a fully paid active Licence
                  Term&apos;s core purchased access, except for the reasons stated
                  in the Education Licence provisions.
                </li>
                <li>
                  Continued participation after an effective update constitutes
                  acceptance where legally permitted. If the participant does
                  not accept a material update, its remedy is to stop future
                  participation or decline renewal, subject to accrued
                  obligations.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="8" title="Notices" />
              <ol>
                <li>
                  Notices to Guru Kids Pro must be sent to{" "}
                  <a href="mailto:admin@gurukidspro.com">
                    admin@gurukidspro.com
                  </a>
                  .
                </li>
                <li>
                  We may send notices to the email address, platform account or
                  business contact supplied by the participant.
                </li>
                <li>
                  Participants must keep contact details current and are
                  responsible for reviewing notices sent to those details.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="9" title="Governing law and disputes" />
              <ol>
                <li>
                  These Terms are governed by the laws of Singapore.
                </li>
                <li>
                  Before commencing formal proceedings, the parties should first
                  attempt in good faith to resolve a dispute through written
                  discussion for at least 30 days, unless urgent relief is
                  reasonably required.
                </li>
                <li>
                  The courts of Singapore have exclusive jurisdiction, subject
                  to any mandatory rights that cannot lawfully be excluded.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <SectionHeading number="10" title="General" />
              <ol>
                <li>
                  These Terms do not create employment, partnership, joint
                  venture, franchise, fiduciary or agency relationships.
                </li>
                <li>
                  A participant may not assign its rights or obligations without
                  our written consent. We may assign these Terms as part of a
                  business transfer, restructuring or transfer of the
                  Dreamscape service.
                </li>
                <li>
                  If a provision is invalid or unenforceable, it will be adjusted
                  or removed only to the minimum extent required. The remaining
                  provisions continue.
                </li>
                <li>
                  A failure or delay in enforcing a right is not a waiver.
                </li>
                <li>
                  A person who is not a party to these Terms has no right to
                  enforce them under the Contracts (Rights of Third Parties) Act
                  2001.
                </li>
                <li>
                  Headings are for convenience and do not affect interpretation.
                </li>
              </ol>
            </section>
          </article>

          <section id="contact" className={styles.contactCard}>
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
              href="mailto:admin@gurukidspro.com"
              className={styles.contactButton}
            >
              admin@gurukidspro.com
            </a>
          </section>

          <footer className={styles.footer}>
            <p>
              Dreamscape One — Powered by Guru Kids Pro · Effective{" "}
              {effectiveDate}
            </p>
            <div>
              <a href={LINKS.privacy}>Privacy</a>
              <a href={LINKS.acceptableUse}>Acceptable Use</a>
              <a href="#overview">Back to top</a>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
