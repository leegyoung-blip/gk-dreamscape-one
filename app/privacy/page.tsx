import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Dreamscape One",
  description:
    "Privacy Policy for Dreamscape One and related Guru Kids Pro services, including student, parent, teacher, affiliate and licensing data.",
};

const EFFECTIVE_DATE = "1 August 2026";
const POLICY_VERSION = "privacy-v1-2026-08-01";

function Heading({ number, children }: { number: string; children: React.ReactNode }) {
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
            <div className={styles.brandMark} aria-hidden="true">✦</div>
            <div>
              <p className={styles.brandName}>DREAMSCAPE ONE</p>
              <p className={styles.brandSub}>Powered by Guru Kids Pro</p>
            </div>
          </div>

          <p className={styles.eyebrow}>Privacy and data protection</p>
          <h1>Privacy Policy</h1>
          <p className={styles.heroText}>
            This Policy explains how Guru Kids Pro collects, uses, discloses,
            protects and retains personal data across Dreamscape One, affiliate
            activities, Education Licences and related support services.
          </p>

          <div className={styles.metaGrid}>
            <div><span>Effective date</span><strong>{EFFECTIVE_DATE}</strong></div>
            <div><span>Policy version</span><strong>{POLICY_VERSION}</strong></div>
            <div><span>Data protection contact</span><strong>admin@gurukidspro.com</strong></div>
          </div>

          <div className={styles.notice}>
            <strong>Children and payments:</strong> Users below 13 must have a
            parent or guardian create, approve or supervise their account. A paid
            subscription for any user below 18 must be purchased or authorised by
            a parent or guardian.
          </div>
        </header>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <nav aria-label="Privacy Policy navigation">
              <p className={styles.sidebarLabel}>On this page</p>
              <a href="#scope">Scope</a>
              <a href="#collection">Data collected</a>
              <a href="#children">Children</a>
              <a href="#uses">How data is used</a>
              <a href="#sharing">Service providers</a>
              <a href="#retention">Retention</a>
              <a href="#rights">Your choices</a>
              <a href="#contact">Contact</a>
            </nav>
            <div className={styles.sidebarLinks}>
              <p className={styles.sidebarLabel}>Related pages</p>
              <Link href="/affiliate-terms">Affiliate Terms</Link>
              <Link href="/terms">All programme terms</Link>
              <Link href="/affiliate/apply">Affiliate application</Link>
            </div>
          </aside>

          <div>
            <section id="scope" className={styles.card}>
              <Heading number="1">Who we are and who this Policy covers</Heading>
              <p>
                Dreamscape One is operated by <strong>Guru Kids Pro</strong>, UEN
                <strong> 53232375X</strong>, of Blk 4 Queen&apos;s Road, #02-127,
                Singapore (“<strong>Guru Kids Pro</strong>”, “<strong>Dreamscape</strong>”,
                “<strong>we</strong>”, “<strong>us</strong>” or “<strong>our</strong>”).
              </p>
              <p>This Policy covers personal data relating to:</p>
              <ul>
                <li>public Dreamscape students and account holders;</li>
                <li>Guru Kids Pro students, parents and guardians;</li>
                <li>teachers, curriculum personnel and organisation administrators;</li>
                <li>Affiliate applicants and approved Affiliate partners;</li>
                <li>Education Licence applicants, customers and linked students;</li>
                <li>website visitors, support contacts and business enquiries; and</li>
                <li>other persons who interact with Dreamscape or Guru Kids Pro.</li>
              </ul>
              <p>
                This Policy should be read with any applicable programme terms,
                order form, consent notice and Acceptable Use Policy.
              </p>
            </section>

            <section id="collection" className={styles.card}>
              <Heading number="2">Personal data we may collect</Heading>

              <h3>Account and profile information</h3>
              <ul>
                <li>student or user name;</li>
                <li>email address and authentication identifiers;</li>
                <li>age group or year of birth;</li>
                <li>primary school level or learning level;</li>
                <li>country;</li>
                <li>parent or guardian name and email for younger users;</li>
                <li>account role, organisation link and access permissions; and</li>
                <li>profile preferences or avatar choices where provided.</li>
              </ul>

              <h3>Learning, progress and platform activity</h3>
              <ul>
                <li>missions, subjects, topics and quizzes selected or completed;</li>
                <li>questions attempted, submitted answers and answer history;</li>
                <li>correct and incorrect answers, scores, accuracy and completion time;</li>
                <li>progress by subject, topic, mission, level and activity;</li>
                <li>teacher assignments, recorded attempts and dashboard information;</li>
                <li>Dream Tokens, Dream Gems, achievements and platform rewards;</li>
                <li>rover, equipment or feature upgrades;</li>
                <li>Business Builder, Milo Exchange and simulation activity;</li>
                <li>login, session, security and general usage records; and</li>
                <li>support requests, bug reports and communications.</li>
              </ul>

              <h3>Parent, teacher and organisation information</h3>
              <ul>
                <li>name, email, mobile number and organisation details;</li>
                <li>student-account relationships and assignment records;</li>
                <li>teacher or administrator permissions;</li>
                <li>licence package, invoice, renewal and onboarding records; and</li>
                <li>consent, terms acceptance and support history.</li>
              </ul>

              <h3>Affiliate and business-partner information</h3>
              <ul>
                <li>legal and display name, email, mobile number and country;</li>
                <li>business name, UEN or registration number and website;</li>
                <li>social-media profiles, audience size, audience description and locations;</li>
                <li>promotion channels, proposed activities and expected referrals;</li>
                <li>application, approval, review and internal administration records;</li>
                <li>referral code, referral attribution, commission and payout records;</li>
                <li>PayNow mobile number or UEN, payee name and payout verification records; and</li>
                <li>programme and policy acceptance records.</li>
              </ul>

              <h3>Technical and device data</h3>
              <ul>
                <li>IP address, device and browser information;</li>
                <li>login timestamps, request logs and security events;</li>
                <li>cookie, session and authentication information;</li>
                <li>referral source and affiliate attribution data; and</li>
                <li>diagnostic information required to protect and operate the platform.</li>
              </ul>
            </section>

            <section className={styles.card}>
              <Heading number="3">How we collect personal data</Heading>
              <p>We may collect personal data:</p>
              <ul>
                <li>directly from a user, parent, guardian, teacher, Affiliate or business contact;</li>
                <li>when an account, application, checkout, order or support request is submitted;</li>
                <li>automatically when Dreamscape is accessed or used;</li>
                <li>from a linked organisation, teacher or parent authorised to provide it;</li>
                <li>through Google sign-in or another selected authentication provider;</li>
                <li>through Shopify and its payment providers for purchase and order status; and</li>
                <li>from referral links, codes and approved marketing channels.</li>
              </ul>
              <p>
                Where another person provides personal data to us, that person must
                have authority to do so and must provide any legally required notice or
                consent.
              </p>
            </section>

            <section id="children" className={styles.card}>
              <Heading number="4">Children and younger users</Heading>
              <ol>
                <li>
                  Users below 13 must have a parent or guardian create, approve or
                  supervise their Dreamscape account. Either the child or parent may
                  complete the account-creation steps, but the parent or guardian must
                  remain responsible for approval and supervision.
                </li>
                <li>
                  A paid subscription, purchase or payment for any user below 18 must be
                  made or authorised by a parent or guardian.
                </li>
                <li>
                  We aim to use age-appropriate notices, minimise unnecessary collection
                  and give parents or guardians suitable ways to review or manage data.
                </li>
                <li>
                  Parents and guardians should ensure account information is accurate and
                  contact us if an account was created without appropriate authority.
                </li>
                <li>
                  Teachers and Education Licence Organisations must obtain required parent
                  or guardian consent before directing a child to create an account or
                  sending us information for student assignment.
                </li>
              </ol>
            </section>

            <section id="uses" className={styles.card}>
              <Heading number="5">How we use personal data</Heading>
              <p>We may use personal data to:</p>
              <ul>
                <li>create, authenticate, secure and administer accounts;</li>
                <li>provide Learning Missions, quizzes, simulations and other features;</li>
                <li>save progress, answers, rewards, achievements and profile assets;</li>
                <li>show relevant parent, teacher and organisation dashboards;</li>
                <li>assign students, roles, permissions and Education Licence access;</li>
                <li>process orders, subscriptions, renewals, invoices and payment status;</li>
                <li>review Affiliate and licence applications;</li>
                <li>attribute referrals, calculate commission and administer payouts;</li>
                <li>provide technical, account, onboarding and customer support;</li>
                <li>send essential account, payment, security and programme messages;</li>
                <li>send promotional email where consent or another permitted basis applies;</li>
                <li>improve content, usability, reliability, safety and performance;</li>
                <li>detect fraud, abuse, account sharing, security threats and policy violations;</li>
                <li>keep records, resolve disputes and enforce agreements; and</li>
                <li>comply with legal, tax, accounting and regulatory obligations.</li>
              </ul>
              <p>
                We do not send promotional SMS or WhatsApp messages. Essential service or
                support communications may be sent through a channel the user or business
                has chosen, including WhatsApp where relevant to a support relationship.
              </p>
            </section>

            <section className={styles.card}>
              <Heading number="6">Payments and financial information</Heading>
              <ol>
                <li>
                  Dreamscape purchases and Student Access payments are handled through
                  Shopify and its payment providers.
                </li>
                <li>
                  We may receive order details, payment status, subscription status,
                  billing contact information, transaction references and refund records.
                </li>
                <li>
                  We do not normally receive or store complete payment-card details, which
                  are handled by the relevant payment provider.
                </li>
                <li>
                  Affiliate PayNow details are restricted to an approved mobile number or
                  UEN and are stored in encrypted form with access limited to authorised personnel.
                </li>
              </ol>
            </section>

            <section id="sharing" className={styles.card}>
              <Heading number="7">When we disclose personal data</Heading>
              <p>We may disclose personal data to:</p>
              <ul>
                <li>
                  <strong>Supabase</strong> for authentication, database, storage and backend services;
                </li>
                <li><strong>Vercel</strong> for website hosting and server processing;</li>
                <li><strong>Resend</strong> for transactional and approved marketing email;</li>
                <li><strong>Google</strong> where Google sign-in is selected;</li>
                <li>
                  <strong>Shopify and its payment providers</strong> for checkout, orders,
                  subscriptions and payment processing;
                </li>
                <li>professional advisers, auditors, insurers and service contractors;</li>
                <li>teachers, parents, guardians or organisations with appropriate authority;</li>
                <li>
                  regulators, courts, law-enforcement bodies or other persons where required
                  or permitted by law; and
                </li>
                <li>
                  a purchaser, successor or adviser in connection with a genuine business
                  reorganisation, financing, transfer or sale.
                </li>
              </ul>
              <p>
                Service providers receive only the data reasonably needed for their role and
                are expected to handle it under appropriate contractual, security and privacy safeguards.
              </p>
            </section>

            <section className={styles.card}>
              <Heading number="8">Overseas processing and transfers</Heading>
              <p>
                Some providers may store or process information outside Singapore. Where
                personal data is transferred outside Singapore, we take reasonable steps to
                ensure it receives protection comparable to that required under Singapore&apos;s
                Personal Data Protection Act 2012, including through appropriate provider
                terms and safeguards.
              </p>
            </section>

            <section className={styles.card}>
              <Heading number="9">Cookies and similar technologies</Heading>
              <ul>
                <li>Essential cookies support login, authentication, security and sessions.</li>
                <li>Preference cookies may remember user choices and settings.</li>
                <li>
                  If non-essential analytics or advertising technologies are enabled, we will
                  provide suitable notice and obtain consent where required.
                </li>
                <li>
                  Blocking essential cookies may prevent parts of Dreamscape from working correctly.
                </li>
              </ul>
            </section>

            <section className={styles.card}>
              <Heading number="10">Security</Heading>
              <p>
                We use reasonable administrative, technical and organisational measures to
                protect personal data, including access controls, role restrictions,
                authentication, encrypted transmission, encryption for Affiliate payout
                details, logging, backups and vendor safeguards where appropriate.
              </p>
              <p>
                No online service can guarantee absolute security. Users must protect their
                login credentials, avoid sharing accounts and notify us promptly of suspected
                unauthorised access.
              </p>
            </section>

            <section id="retention" className={styles.card}>
              <Heading number="11">Retention</Heading>
              <p>
                We retain personal data only for as long as reasonably needed for the purposes
                described, to protect users and the platform, to resolve disputes, and to meet
                legal, tax, accounting and contractual obligations. Our general schedule is:
              </p>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr><th>Record type</th><th>General retention period</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Incomplete Affiliate applications</td><td>Up to 6 months</td></tr>
                    <tr><td>Rejected Affiliate applications</td><td>Up to 12 months</td></tr>
                    <tr><td>Active Affiliate records</td><td>While active</td></tr>
                    <tr><td>Affiliate commission and payout records</td><td>At least 5 years after the relevant transaction period</td></tr>
                    <tr><td>Education Licence invoices and financial records</td><td>At least 5 years</td></tr>
                    <tr><td>Closed student accounts</td><td>Generally up to 24 months after closure</td></tr>
                    <tr><td>Learning and progress records</td><td>Generally up to 24 months after subscription or organisation access ends</td></tr>
                    <tr><td>Support enquiries</td><td>Generally up to 24 months after resolution</td></tr>
                    <tr><td>Security and system logs</td><td>Generally up to 12 months</td></tr>
                    <tr><td>Terms and consent records</td><td>Relationship duration plus at least 5 years where reasonably required</td></tr>
                  </tbody>
                </table>
              </div>
              <p className={styles.smallPrint}>
                A record may be kept longer where required by law, necessary for an active
                dispute or investigation, or reasonably needed to protect users, rights or platform security.
              </p>
            </section>

            <section id="rights" className={styles.card}>
              <Heading number="12">Access, correction, withdrawal and account closure</Heading>
              <p>A person may contact us to request:</p>
              <ul>
                <li>access to personal data we hold about them, subject to applicable exceptions;</li>
                <li>correction of inaccurate or incomplete data;</li>
                <li>withdrawal of consent for future collection, use or disclosure;</li>
                <li>account closure or deletion where appropriate;</li>
                <li>information about how personal data has been used or disclosed; or</li>
                <li>review of a privacy concern or complaint.</li>
              </ul>
              <p>
                We may need to verify identity and authority before acting. Withdrawing consent
                may prevent us from continuing some services, processing payouts, maintaining
                an account or meeting contractual obligations. We may retain information where
                required or permitted by law.
              </p>
            </section>

            <section className={styles.card}>
              <Heading number="13">Marketing choices</Heading>
              <ol>
                <li>
                  Promotional communications are currently sent by email only, where consent
                  or another permitted basis applies.
                </li>
                <li>
                  A recipient may unsubscribe using the link in a marketing email or by
                  contacting us.
                </li>
                <li>
                  Unsubscribing from marketing does not stop essential account, payment,
                  security, application, support or programme messages.
                </li>
              </ol>
            </section>

            <section className={styles.card}>
              <Heading number="14">Changes to this Policy</Heading>
              <p>
                We may update this Policy to reflect legal, technical, programme or operational
                changes. The current version and effective date will be published on this page.
                Where a change is material, we may also notify affected users through email,
                the platform or another reasonable channel.
              </p>
            </section>

            <section id="contact" className={styles.contactCard}>
              <div>
                <p className={styles.eyebrow}>Data protection contact</p>
                <h2>Contact Guru Kids Pro</h2>
                <p>
                  Guru Kids Pro · UEN 53232375X<br />
                  Blk 4 Queen&apos;s Road, #02-127, Singapore
                </p>
              </div>
              <a className={styles.contactButton} href="mailto:admin@gurukidspro.com">
                admin@gurukidspro.com
              </a>
            </section>

            <footer className={styles.footer}>
              <p>Dreamscape One — Powered by Guru Kids Pro</p>
              <div>
                <Link href="/affiliate-terms">Affiliate Terms</Link>
                <Link href="/affiliate/apply">Apply</Link>
                <a href="#scope">Back to top</a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
