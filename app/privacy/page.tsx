import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Dreamscape One",
  description:
    "Privacy Policy for Dreamscape One and related Guru Kids Pro services, including student, parent, teacher, affiliate, billing, licensing and account-deletion data.",
};

const EFFECTIVE_DATE = "24 August 2026";
const POLICY_VERSION = "privacy-v2-2026-08-24";

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

export default function PrivacyPage() {
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

          <p className={styles.eyebrow}>Privacy and data protection</p>
          <h1>Privacy Policy</h1>

          <p className={styles.heroText}>
            This Policy explains how Guru Kids Pro collects, uses, discloses,
            protects, retains, corrects, anonymises and deletes personal data
            across Dreamscape One, Guru Kids Pro-managed access, affiliate
            activities, Education Licences and related support services.
          </p>

          <div className={styles.metaGrid}>
            <div>
              <span>Effective date</span>
              <strong>{EFFECTIVE_DATE}</strong>
            </div>
            <div>
              <span>Policy version</span>
              <strong>{POLICY_VERSION}</strong>
            </div>
            <div>
              <span>Data protection contact</span>
              <strong>admin@gurukidspro.com</strong>
            </div>
          </div>

          <div className={styles.notice}>
            <strong>Children:</strong> For a child below 13, a parent or legal
            guardian must provide the consent required for us to collect, use
            and disclose the child&apos;s personal data. A paid Dreamscape
            purchase for a user below 18 must be approved and completed by a
            parent, guardian or authorised organisation under our platform
            rules.
          </div>
        </header>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <nav aria-label="Privacy Policy navigation">
              <p className={styles.sidebarLabel}>On this page</p>
              <a href="#scope">Scope</a>
              <a href="#collection">Data collected</a>
              <a href="#collection-methods">How data is collected</a>
              <a href="#children">Children</a>
              <a href="#uses">How data is used</a>
              <a href="#payments">Payments</a>
              <a href="#sharing">Service providers</a>
              <a href="#transfers">Overseas transfers</a>
              <a href="#cookies">Cookies</a>
              <a href="#security">Security</a>
              <a href="#deletion">Account deletion</a>
              <a href="#retention">Retention</a>
              <a href="#rights">Your choices and rights</a>
              <a href="#marketing">Marketing</a>
              <a href="#changes">Policy changes</a>
              <a href="#contact">Contact</a>
            </nav>

            <div className={styles.sidebarLinks}>
              <p className={styles.sidebarLabel}>Related pages</p>
              <Link href="/terms">Terms & Conditions</Link>
              <Link href="/affiliate-terms">Affiliate Terms</Link>
              <Link href="/affiliate/apply">Affiliate application</Link>
            </div>
          </aside>

          <div>
            <section id="scope" className={styles.card}>
              <Heading number="1">Who we are and who this Policy covers</Heading>

              <p>
                Dreamscape One is operated by <strong>Guru Kids Pro</strong>,
                UEN <strong>53232375X</strong>, of Blk 4 Queen&apos;s Road,
                #02-127, Singapore (“<strong>Guru Kids Pro</strong>”, “
                <strong>Dreamscape</strong>”, “<strong>we</strong>”, “
                <strong>us</strong>” or “<strong>our</strong>”).
              </p>

              <p>This Policy covers personal data relating to:</p>

              <ul>
                <li>public Dreamscape students and account holders;</li>
                <li>Guru Kids Pro students, parents and guardians;</li>
                <li>
                  teachers, curriculum personnel, administrators and other
                  staff users;
                </li>
                <li>Affiliate applicants and approved Affiliate partners;</li>
                <li>
                  Education Licence applicants, customers, administrators and
                  linked students;
                </li>
                <li>website visitors, support contacts and business enquiries;</li>
                <li>
                  persons who make or manage Dreamscape subscription payments;
                  and
                </li>
                <li>
                  other persons who interact with Dreamscape or Guru Kids Pro.
                </li>
              </ul>

              <p>
                This Policy should be read with our{" "}
                <Link href="/terms">Terms & Conditions</Link>, any applicable
                programme terms, order form, consent notice and other notices
                provided at the point of collection.
              </p>
            </section>

            <section id="collection" className={styles.card}>
              <Heading number="2">Personal data we may collect</Heading>

              <h3>Account and identity information</h3>
              <ul>
                <li>name or display name;</li>
                <li>username;</li>
                <li>email address and authentication identifiers;</li>
                <li>date of birth, age and age band where provided;</li>
                <li>school level, curriculum level or learning level;</li>
                <li>country or general location information where relevant;</li>
                <li>
                  parent or guardian name, email and relationship information
                  for younger users where needed;
                </li>
                <li>
                  account role, organisation link, permissions and staff access
                  status; and
                </li>
                <li>profile preferences, avatar or customisation choices.</li>
              </ul>

              <h3>Learning, progress and platform activity</h3>
              <ul>
                <li>missions, subjects, topics and quizzes selected or completed;</li>
                <li>questions attempted, answers submitted and answer history;</li>
                <li>
                  correct and incorrect answers, scores, accuracy, timing and
                  completion records;
                </li>
                <li>
                  progress by subject, topic, mission, level, skill and activity;
                </li>
                <li>
                  teacher assignments, recorded attempts and dashboard
                  information;
                </li>
                <li>Dream Tokens, Dream Gems, achievements and rewards;</li>
                <li>rover, equipment, home, outfit or feature upgrades;</li>
                <li>
                  Business Builder, Milo Exchange, virtual property and
                  simulation activity;
                </li>
                <li>referral participation and reward status;</li>
                <li>
                  login, session, security, device and general usage records;
                  and
                </li>
                <li>support requests, bug reports and communications.</li>
              </ul>

              <h3>Subscription, billing and transaction information</h3>
              <ul>
                <li>selected plan, billing cycle and price;</li>
                <li>
                  subscription status, renewal status, pause status, paid-through
                  date and plan-change information;
                </li>
                <li>
                  payment-provider customer, checkout, subscription, invoice
                  and transaction references;
                </li>
                <li>
                  payment status, refund status, chargeback or dispute status;
                </li>
                <li>billing contact information; and</li>
                <li>
                  records needed for accounting, tax, reconciliation and fraud
                  prevention.
                </li>
              </ul>

              <h3>Parent, teacher and organisation information</h3>
              <ul>
                <li>name, email, mobile number and organisation details;</li>
                <li>student-account relationships and assignment records;</li>
                <li>teacher, curriculum or administrator permissions;</li>
                <li>licence package, invoice, renewal and onboarding records;</li>
                <li>
                  organisation membership, roster and seat-assignment
                  information; and
                </li>
                <li>consent, terms acceptance and support history.</li>
              </ul>

              <h3>Affiliate and business-partner information</h3>
              <ul>
                <li>legal and display name, email, mobile number and country;</li>
                <li>business name, UEN or registration number and website;</li>
                <li>
                  social-media profiles, audience size, audience description
                  and locations;
                </li>
                <li>
                  promotion channels, proposed activities and expected
                  referrals;
                </li>
                <li>
                  application, approval, review and internal administration
                  records;
                </li>
                <li>
                  referral code, referral attribution, commission and payout
                  records;
                </li>
                <li>
                  PayNow mobile number or UEN, payee name and payout
                  verification records where applicable; and
                </li>
                <li>programme and policy acceptance records.</li>
              </ul>

              <h3>Technical and device data</h3>
              <ul>
                <li>IP address and network information;</li>
                <li>device, operating system and browser information;</li>
                <li>login timestamps, request logs and security events;</li>
                <li>cookie, session and authentication information;</li>
                <li>referral source and attribution data; and</li>
                <li>
                  diagnostic information reasonably required to protect,
                  troubleshoot and operate the platform.
                </li>
              </ul>
            </section>

            <section id="collection-methods" className={styles.card}>
              <Heading number="3">How we collect personal data</Heading>

              <p>We may collect personal data:</p>

              <ul>
                <li>
                  directly from a user, parent, guardian, teacher, Affiliate,
                  organisation administrator or business contact;
                </li>
                <li>
                  when an account, application, checkout, order, form or support
                  request is submitted;
                </li>
                <li>automatically when Dreamscape is accessed or used;</li>
                <li>
                  from a linked organisation, teacher, parent or guardian
                  authorised to provide it;
                </li>
                <li>
                  through Google sign-in or another selected authentication
                  provider;
                </li>
                <li>
                  through Stripe, HitPay or another payment provider used for
                  the relevant transaction;
                </li>
                <li>
                  through referral links, codes and approved marketing channels;
                  and
                </li>
                <li>
                  from service providers where necessary to maintain security,
                  deliver a service or reconcile a transaction.
                </li>
              </ul>

              <p>
                Where another person provides personal data to us, that person
                must have authority to do so and must provide any legally
                required notice or consent.
              </p>
            </section>

            <section id="children" className={styles.card}>
              <Heading number="4">Children and younger users</Heading>

              <ol>
                <li>
                  Where we rely on consent to collect, use or disclose personal
                  data about a child below 13, we require consent from the
                  child&apos;s parent or legal guardian.
                </li>
                <li>
                  We aim to present notices in language and formats appropriate
                  to the user and to minimise collection that is not reasonably
                  needed for the service.
                </li>
                <li>
                  A paid Dreamscape purchase for a user below 18 must be made
                  or authorised by a parent, guardian or authorised organisation
                  under our platform rules.
                </li>
                <li>
                  Parents and guardians may contact us about a younger
                  user&apos;s account, subject to appropriate identity and
                  authority verification.
                </li>
                <li>
                  Teachers and Education Licence organisations must obtain any
                  required parent or guardian consent before directing a child
                  to create an account or sending us personal data for student
                  assignment.
                </li>
              </ol>

              <p>
                If we learn that personal data about a child was provided
                without required authority or consent, we may restrict the
                account and take reasonable steps to correct, delete or
                otherwise address the data.
              </p>
            </section>

            <section id="uses" className={styles.card}>
              <Heading number="5">How we use personal data</Heading>

              <p>We may use personal data to:</p>

              <ul>
                <li>create, authenticate, secure and administer accounts;</li>
                <li>provide Learning Missions, quizzes, simulations and other features;</li>
                <li>save progress, answers, rewards, achievements and profile assets;</li>
                <li>
                  personalise age-appropriate explanations, recommendations,
                  missions or interface elements;
                </li>
                <li>show relevant parent, teacher and organisation dashboards;</li>
                <li>assign students, roles, permissions and Education Licence access;</li>
                <li>
                  process subscriptions, plan changes, pauses, resumptions,
                  renewals, cancellations, invoices and payment status;
                </li>
                <li>
                  process and audit account-correction and account-deletion
                  requests;
                </li>
                <li>review Affiliate and licence applications;</li>
                <li>attribute referrals, calculate commission and administer payouts;</li>
                <li>provide technical, account, onboarding and customer support;</li>
                <li>send essential account, payment, security and programme messages;</li>
                <li>
                  send promotional communications where consent or another
                  permitted basis applies;
                </li>
                <li>improve content, usability, reliability, safety and performance;</li>
                <li>
                  conduct internal analytics using data that is aggregated,
                  de-identified or minimised where reasonably appropriate;
                </li>
                <li>
                  detect fraud, abuse, account sharing, security threats and
                  policy violations;
                </li>
                <li>keep records, resolve disputes and enforce agreements; and</li>
                <li>comply with legal, tax, accounting and regulatory obligations.</li>
              </ul>

              <p>
                We do not sell student personal data. We do not disclose
                student personal data to third parties for their own direct
                marketing without appropriate authority, notice or consent.
              </p>
            </section>

            <section id="payments" className={styles.card}>
              <Heading number="6">Payments and financial information</Heading>

              <ol>
                <li>
                  Public Dreamscape subscriptions are generally processed
                  through <strong>Stripe</strong>.
                </li>
                <li>
                  Guru Kids Pro-managed access and certain legacy arrangements
                  may use <strong>HitPay</strong> or another payment method
                  communicated to the payer.
                </li>
                <li>
                  We may receive plan and order details, billing contact
                  information, payment status, subscription status, invoice or
                  transaction references, refund information and dispute
                  status.
                </li>
                <li>
                  We do not normally receive or store complete payment-card
                  details. Those details are handled by the relevant payment
                  provider.
                </li>
                <li>
                  Affiliate PayNow details, where collected, are used for
                  payout administration and access is limited to authorised
                  personnel and systems.
                </li>
              </ol>
            </section>

            <section id="sharing" className={styles.card}>
              <Heading number="7">When we disclose personal data</Heading>

              <p>
                We may disclose personal data where reasonably necessary to
                provide, secure or administer Dreamscape, including to current
                service providers such as:
              </p>

              <ul>
                <li>
                  <strong>Supabase</strong> for authentication, database,
                  storage and backend services;
                </li>
                <li>
                  <strong>Vercel</strong> for website hosting and server
                  processing;
                </li>
                <li>
                  <strong>Resend</strong> for transactional and approved
                  marketing email;
                </li>
                <li>
                  <strong>Google</strong> where Google sign-in or another
                  Google service is selected;
                </li>
                <li>
                  <strong>Stripe</strong> for public Dreamscape checkout,
                  subscription and payment processing;
                </li>
                <li>
                  <strong>HitPay</strong> for Guru Kids Pro-managed or
                  applicable legacy payment processing;
                </li>
                <li>
                  analytics, security, communications or support providers
                  enabled for the platform from time to time;
                </li>
                <li>professional advisers, auditors, insurers and service contractors;</li>
                <li>
                  teachers, parents, guardians or organisations with
                  appropriate authority;
                </li>
                <li>
                  regulators, courts, law-enforcement bodies or other persons
                  where required or permitted by law; and
                </li>
                <li>
                  a purchaser, successor or adviser in connection with a
                  genuine business reorganisation, financing, transfer or sale,
                  subject to appropriate safeguards.
                </li>
              </ul>

              <p>
                Service providers receive only the data reasonably needed for
                their role and are expected to handle it under appropriate
                contractual, security and privacy safeguards. Providers may
                change as our systems evolve; this Policy describes the
                categories and current principal providers rather than an
                immutable vendor list.
              </p>
            </section>

            <section id="transfers" className={styles.card}>
              <Heading number="8">Overseas processing and transfers</Heading>

              <p>
                Some service providers may store or process information outside
                Singapore. Where personal data is transferred outside
                Singapore, we take reasonable steps to ensure it receives a
                standard of protection comparable to the protection required
                under Singapore&apos;s Personal Data Protection Act 2012,
                including through appropriate provider terms and safeguards.
              </p>
            </section>

            <section id="cookies" className={styles.card}>
              <Heading number="9">Cookies and similar technologies</Heading>

              <ul>
                <li>
                  Essential cookies or local-storage items support login,
                  authentication, security, sessions and core functionality.
                </li>
                <li>
                  Preference technologies may remember user choices, settings
                  and interface state.
                </li>
                <li>
                  Referral or attribution technologies may record the source of
                  an approved referral or affiliate visit.
                </li>
                <li>
                  If non-essential analytics or advertising technologies are
                  enabled, we will provide suitable notice and obtain consent
                  where required.
                </li>
                <li>
                  Blocking essential technologies may prevent parts of
                  Dreamscape from working correctly.
                </li>
              </ul>
            </section>

            <section id="security" className={styles.card}>
              <Heading number="10">Security and data incidents</Heading>

              <p>
                We use reasonable administrative, technical and organisational
                measures to protect personal data. Depending on the system,
                these may include role-based access controls, authentication,
                encrypted transmission, restricted administrator access,
                logging, backups, provider safeguards and security monitoring.
              </p>

              <p>
                No online service can guarantee absolute security. Users must
                protect login credentials, avoid sharing accounts and notify us
                promptly of suspected unauthorised access.
              </p>

              <p>
                If a personal-data breach occurs, we will assess it and notify
                the Personal Data Protection Commission and affected
                individuals where notification is required by applicable law.
              </p>
            </section>

            <section id="deletion" className={styles.card}>
              <Heading number="11">Account closure, deletion and anonymisation</Heading>

              <p>
                Dreamscape distinguishes between stopping a subscription,
                pausing a membership and deleting an account. These actions
                have different effects.
              </p>

              <h3>Self-service deletion</h3>

              <p>
                Eligible users may request permanent account deletion from
                their account settings. Before deletion, we may verify the
                account and check whether there are unresolved staff,
                organisation, licence or non-Stripe billing responsibilities.
                Some staff, organisation-managed, Guru Kids Pro-managed or
                legacy accounts therefore require assisted closure through
                Support.
              </p>

              <h3>What happens when an eligible account is deleted</h3>

              <ul>
                <li>
                  the Dreamscape authentication account is disabled or
                  soft-deleted so the user can no longer sign in;
                </li>
                <li>
                  an active public Stripe subscription linked to that eligible
                  account is cancelled as part of the self-service deletion
                  workflow so it cannot renew;
                </li>
                <li>
                  active learning entitlements are removed and paid learning
                  access ends;
                </li>
                <li>
                  profile identifiers such as email, username and date of birth
                  are deleted, redacted or replaced with non-user-facing
                  deletion values where a database record must be retained;
                </li>
                <li>
                  learner progress, quiz responses, Dream Token and Dream Gem
                  records, virtual holdings, referral relationships and other
                  account-specific learning data are deleted where applicable
                  to the account and system;
                </li>
                <li>
                  retained Dreamscape billing or accounting records are
                  anonymised or minimised where reasonably possible; and
                </li>
                <li>
                  we retain a restricted deletion-audit record so we can show
                  that the request was processed and investigate operational,
                  security or legal issues if necessary.
                </li>
              </ul>

              <p>
                A deletion audit may contain a deletion-request identifier,
                the former internal user identifier and a cryptographic hash of
                the former email address. Because such data may still be
                linkable in limited circumstances, we treat it as restricted
                data and retain it only as long as reasonably necessary for
                audit, security, dispute or legal purposes.
              </p>

              <p>
                Payment providers such as Stripe or HitPay may retain their own
                transaction records under their legal, regulatory and business
                obligations. Account deletion from Dreamscape does not require
                those providers to erase records they are independently
                required or permitted to retain.
              </p>

              <p>
                Deleting an account does not automatically issue a refund for
                payments already completed. Refund rights, if any, are handled
                separately under the applicable purchase terms and law.
              </p>

              <p>
                Secure backups may continue to contain historical data for a
                limited backup-rotation period. Backup copies are not used as
                active account records and are overwritten or deleted in the
                ordinary backup lifecycle, subject to legal or security
                requirements.
              </p>
            </section>

            <section id="retention" className={styles.card}>
              <Heading number="12">Retention</Heading>

              <p>
                We keep personal data only for as long as reasonably necessary
                for the purposes described in this Policy, to protect users and
                the platform, resolve disputes, maintain appropriate audit
                records and meet legal, tax, accounting and contractual
                obligations. Different record types require different periods.
              </p>

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Record type</th>
                      <th>General retention approach</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Active account and profile information</td>
                      <td>
                        While the account is active and for a reasonable period
                        needed for account administration, unless deletion or
                        another lawful request is completed earlier.
                      </td>
                    </tr>
                    <tr>
                      <td>Learning and progress records</td>
                      <td>
                        Generally while access is active and up to 24 months
                        after access ends, unless deleted earlier through an
                        eligible account-deletion process or needed for an
                        active dispute or organisation requirement.
                      </td>
                    </tr>
                    <tr>
                      <td>Deleted-account learner/profile data</td>
                      <td>
                        Deleted or anonymised as part of the deletion workflow,
                        subject to technical completion, restricted audit data,
                        backups and records that must lawfully be retained.
                      </td>
                    </tr>
                    <tr>
                      <td>Deletion audit records</td>
                      <td>
                        Generally up to 7 years after completion, or longer
                        where reasonably necessary for a dispute, investigation
                        or legal obligation.
                      </td>
                    </tr>
                    <tr>
                      <td>Payment, invoice and accounting records</td>
                      <td>
                        At least 5 years from the relevant accounting or tax
                        period where required, and longer if reasonably
                        necessary for tax, audit, dispute or legal purposes.
                      </td>
                    </tr>
                    <tr>
                      <td>Incomplete Affiliate applications</td>
                      <td>Generally up to 6 months.</td>
                    </tr>
                    <tr>
                      <td>Rejected Affiliate applications</td>
                      <td>Generally up to 12 months.</td>
                    </tr>
                    <tr>
                      <td>Active Affiliate records</td>
                      <td>While active and as required for administration.</td>
                    </tr>
                    <tr>
                      <td>Affiliate commission and payout records</td>
                      <td>
                        At least 5 years from the relevant transaction or
                        accounting period where required.
                      </td>
                    </tr>
                    <tr>
                      <td>Education Licence financial records</td>
                      <td>
                        At least 5 years from the relevant accounting or tax
                        period where required.
                      </td>
                    </tr>
                    <tr>
                      <td>Support enquiries</td>
                      <td>
                        Generally up to 24 months after resolution, longer if
                        connected to a dispute or security matter.
                      </td>
                    </tr>
                    <tr>
                      <td>Security and system logs</td>
                      <td>
                        Generally up to 12 months, longer where needed to
                        investigate or document a security incident.
                      </td>
                    </tr>
                    <tr>
                      <td>Terms, consent and authority records</td>
                      <td>
                        For the relationship and for a reasonable period
                        afterwards, commonly up to 7 years where needed to
                        establish consent, authority, contractual rights or
                        defend claims.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className={styles.smallPrint}>
                These are general periods, not promises that every record will
                be held for the maximum period. We may shorten retention where
                information is no longer needed, and may retain a record longer
                where required by law or reasonably necessary for an active
                dispute, investigation, fraud-prevention, tax, accounting or
                security purpose. Where continued identification is no longer
                needed, we may anonymise data instead of retaining identifiable
                personal data.
              </p>
            </section>

            <section id="rights" className={styles.card}>
              <Heading number="13">
                Access, correction, withdrawal, deletion and complaints
              </Heading>

              <p>A person may contact us to request:</p>

              <ul>
                <li>
                  access to personal data in our possession or control and
                  information about how it has been used or disclosed, subject
                  to applicable exceptions;
                </li>
                <li>correction of inaccurate or incomplete personal data;</li>
                <li>
                  withdrawal of consent for future collection, use or
                  disclosure where consent is the applicable basis;
                </li>
                <li>
                  account closure or deletion where the account and applicable
                  records are eligible for that process;
                </li>
                <li>review of a privacy concern or complaint; or</li>
                <li>
                  any other data-protection right that applies under
                  Singapore law.
                </li>
              </ul>

              <p>
                We may need to verify identity, authority and the scope of a
                request before acting. A parent, guardian, teacher or
                organisation administrator requesting data about another
                person must show appropriate authority.
              </p>

              <p>
                Withdrawal of consent affects our future collection, use or
                disclosure for the relevant purpose and may prevent us from
                continuing a service. Withdrawal does not automatically require
                destruction of every existing record. We may continue to retain
                information where required or permitted by law or reasonably
                necessary for legal or business purposes.
              </p>
            </section>

            <section id="marketing" className={styles.card}>
              <Heading number="14">Marketing choices</Heading>

              <ol>
                <li>
                  Promotional communications are sent only where consent or
                  another permitted basis applies.
                </li>
                <li>
                  A recipient may unsubscribe using the method provided in a
                  marketing communication or by contacting us.
                </li>
                <li>
                  Unsubscribing from marketing does not stop essential account,
                  payment, security, application, support, legal or programme
                  messages.
                </li>
                <li>
                  We do not use student personal data for third-party direct
                  marketing without appropriate authority, notice or consent.
                </li>
              </ol>
            </section>

            <section id="changes" className={styles.card}>
              <Heading number="15">Changes to this Policy</Heading>

              <p>
                We may update this Policy to reflect legal, technical,
                programme, vendor, payment, account-management or operational
                changes. The current version, policy version identifier and
                effective date will be published on this page.
              </p>

              <p>
                Where a change materially affects how we use personal data or
                the rights and choices available to affected users, we will
                provide reasonable additional notice through email, the
                platform or another appropriate channel where required.
              </p>
            </section>

            <section id="contact" className={styles.contactCard}>
              <div>
                <p className={styles.eyebrow}>Data protection contact</p>
                <h2>Contact Guru Kids Pro</h2>
                <p>
                  Guru Kids Pro · UEN 53232375X
                  <br />
                  Blk 4 Queen&apos;s Road, #02-127, Singapore
                </p>
                <p>
                  Contact us about access, correction, consent withdrawal,
                  account deletion, privacy complaints or other data-protection
                  matters.
                </p>
              </div>

              <a
                className={styles.contactButton}
                href="mailto:admin@gurukidspro.com?subject=Dreamscape%20One%20Privacy%20Enquiry"
              >
                admin@gurukidspro.com
              </a>
            </section>

            <footer className={styles.footer}>
              <p>
                Dreamscape One — Powered by Guru Kids Pro · {POLICY_VERSION}
              </p>
              <div>
                <Link href="/terms">Terms & Conditions</Link>
                <Link href="/affiliate-terms">Affiliate Terms</Link>
                <a href="#scope">Back to top</a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
