import type { Metadata } from "next";
import Link from "next/link";
import styles from "./programme.module.css";

export const metadata: Metadata = {
  title: "Affiliate Programme | Dreamscape One",
  description:
    "Join the Dreamscape Affiliate Programme. The Regular Affiliate tier is available now with 10% recurring commission. Affiliate Plus and Pro are coming soon.",
};

const regularFeatures = [
  "10% recurring commission on eligible Net Subscription Revenue",
  "Commission for up to 12 consecutive months per eligible referred customer",
  "Unique referral code and referral link after approval and onboarding",
  "Monthly Singapore PayNow payouts between the 7th and 10th",
  "No minimum payout threshold currently",
];

const plusFeatures = [
  "Planned Apple Wallet and Google Wallet referral card",
  "Personal QR code and share page",
  "WhatsApp and social sharing toolkit",
  "Printable referral posters and cards",
  "Approved demo and parent-facing marketing copy",
];

const proFeatures = [
  "Planned higher partner commission structure",
  "Advanced referral and campaign analytics",
  "Co-branded promotional assets",
  "Custom partner landing tools",
  "Priority and early campaign opportunities",
];

const steps = [
  {
    number: "01",
    title: "Apply",
    text: "Submit the Regular Affiliate application. Participation is subject to approval.",
  },
  {
    number: "02",
    title: "Get approved",
    text: "Approved applicants complete onboarding and receive an official Dreamscape referral code.",
  },
  {
    number: "03",
    title: "Share",
    text: "Recommend Dreamscape through suitable, truthful and clearly disclosed promotion.",
  },
  {
    number: "04",
    title: "Record the code",
    text: "The customer must have your specific referral code successfully recorded by Dreamscape for attribution.",
  },
  {
    number: "05",
    title: "Earn",
    text: "Eligible completed billing cycles can generate 10% commission during the customer’s 12-month commission period.",
  },
  {
    number: "06",
    title: "Get paid",
    text: "Eligible Singapore commission is collated monthly and scheduled for PayNow payout between the 7th and 10th.",
  },
];

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className={styles.featureList}>
      {items.map((item) => (
        <li key={item}>
          <span aria-hidden="true">✓</span>
          <p>{item}</p>
        </li>
      ))}
    </ul>
  );
}

export default function AffiliateProgrammePage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Dreamscape One home">
          <span className={styles.brandMark} aria-hidden="true">✦</span>
          <span className={styles.brandText}>
            <strong>DREAMSCAPE ONE</strong>
            <small>Powered by Guru Kids Pro</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Affiliate programme navigation">
          <Link href="/">Home</Link>
          <Link href="/affiliate-terms">Programme Terms</Link>
          <Link href="/affiliate/apply" className={styles.navCta}>
            Apply
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlowOne} />
        <div className={styles.heroGlowTwo} />

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Dreamscape Affiliate Programme</p>
          <h1>Share Dreamscape. Earn when families subscribe.</h1>
          <p className={styles.heroLead}>
            A partner programme for suitable educators, private tutors,
            child-focused businesses, and parenting or education creators who
            want to introduce more families to Dreamscape One.
          </p>

          <div className={styles.heroButtons}>
            <Link href="/affiliate/apply" className={styles.primaryButton}>
              Apply for Regular Affiliate
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/affiliate-terms" className={styles.secondaryButton}>
              Read Programme Terms
            </Link>
          </div>

          <p className={styles.heroNote}>
            Regular Affiliate is the only tier currently open for applications.
            Affiliate Plus and Affiliate Pro are coming soon.
          </p>
        </div>

        <div className={styles.heroStats}>
          <article>
            <span>Current commission</span>
            <strong>10%</strong>
            <p>Regular Affiliate</p>
          </article>
          <article>
            <span>Maximum period</span>
            <strong>12</strong>
            <p>consecutive months per eligible referred customer</p>
          </article>
          <article>
            <span>Singapore payout window</span>
            <strong>7–10</strong>
            <p>of the following month</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Affiliate tiers</p>
          <h2>Start with Regular. More partner tools are on the way.</h2>
          <p>
            Only the Regular Affiliate tier can be applied for now. Plus and Pro
            are shown as a preview of the planned programme direction and are not
            yet available for purchase, application, approval, or activation.
          </p>
        </div>

        <div className={styles.tierGrid}>
          <article className={`${styles.tierCard} ${styles.tierAvailable}`}>
            <div className={styles.tierTopline}>
              <span className={styles.availableBadge}>Available now</span>
              <span className={styles.tierLabel}>Regular</span>
            </div>
            <h3>Affiliate Regular</h3>
            <p className={styles.price}>Free</p>
            <p className={styles.commission}>10% recurring commission</p>
            <p className={styles.tierIntro}>
              The straightforward way to recommend Dreamscape and earn on
              eligible subscriptions attributed to your approved referral code.
            </p>
            <CheckList items={regularFeatures} />
            <Link href="/affiliate/apply" className={styles.cardButton}>
              Apply for Regular Affiliate
              <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className={`${styles.tierCard} ${styles.tierComingSoon}`}>
            <div className={styles.tierTopline}>
              <span className={styles.comingSoonBadge}>Coming soon</span>
              <span className={styles.tierLabel}>Plus</span>
            </div>
            <h3>Affiliate Plus</h3>
            <p className={styles.price}>S$19.90</p>
            <p className={styles.commission}>Planned one-time marketing toolkit</p>
            <p className={styles.tierIntro}>
              Planned for affiliates who want ready-made sharing tools while
              keeping the Regular Affiliate commission structure.
            </p>
            <CheckList items={plusFeatures} />
            <button type="button" className={styles.disabledButton} disabled>
              Coming Soon
            </button>
            <p className={styles.cardSmallPrint}>
              Planned price and features are informational until launch. The
              toolkit will be optional; paying for tools will not buy approval or
              a higher Regular commission rate.
            </p>
          </article>

          <article className={`${styles.tierCard} ${styles.tierComingSoon}`}>
            <div className={styles.tierTopline}>
              <span className={styles.comingSoonBadge}>Coming soon</span>
              <span className={styles.tierLabel}>Pro</span>
            </div>
            <h3>Affiliate Pro</h3>
            <p className={styles.price}>Invite / earned</p>
            <p className={styles.commission}>Planned advanced partner tier</p>
            <p className={styles.tierIntro}>
              Planned for proven partners who demonstrate strong customer quality,
              retention, brand compliance, and sustainable performance.
            </p>
            <CheckList items={proFeatures} />
            <button type="button" className={styles.disabledButton} disabled>
              Coming Soon
            </button>
            <p className={styles.cardSmallPrint}>
              Qualification rules, commission rates, features, and availability
              will be confirmed only when Affiliate Pro launches.
            </p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.howSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>How it works</p>
          <h2>One clear referral path.</h2>
          <p>
            Dreamscape uses the affiliate’s approved referral code as the key
            attribution record. Your affiliate link may help direct or prefill the
            journey, but the code must be successfully recorded in our systems.
          </p>
        </div>

        <div className={styles.stepGrid}>
          {steps.map((step) => (
            <article key={step.number} className={styles.stepCard}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.earningsSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Illustrative earnings</p>
          <h2>Simple commission examples.</h2>
          <p>
            The examples below assume the current 10% Regular Affiliate rate and
            an otherwise eligible completed monthly billing cycle. They are
            illustrations, not earnings guarantees.
          </p>
        </div>

        <div className={styles.exampleGrid}>
          <article>
            <span>Core Missions</span>
            <strong>S$19.90</strong>
            <p>customer monthly price</p>
            <div>S$1.99 affiliate commission</div>
          </article>
          <article>
            <span>Full Missions</span>
            <strong>S$24.90</strong>
            <p>customer monthly price</p>
            <div>S$2.49 affiliate commission</div>
          </article>
        </div>

        <div className={styles.exampleCallout}>
          <strong>Example:</strong> 100 eligible Full Missions billing cycles at
          S$24.90 × 10% = <b>S$249</b> in illustrative commission for that month.
          Actual commission depends on valid attribution, eligibility, discounts,
          completed payment, refunds or reversals, and the 12-month limit.
        </div>
      </section>

      <section className={`${styles.section} ${styles.whoSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Who can apply</p>
          <h2>Built for trusted adult-led recommendations.</h2>
        </div>

        <div className={styles.whoGrid}>
          {["Private tutors", "Educators", "Child-focused businesses", "Enrichment providers", "Parenting creators", "Education creators"].map(
            (item) => (
              <div key={item}>{item}</div>
            ),
          )}
        </div>
      </section>

      <section className={`${styles.section} ${styles.faqSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>FAQ</p>
          <h2>Before you apply.</h2>
        </div>

        <div className={styles.faqGrid}>
          <article>
            <h3>Does it cost anything to join?</h3>
            <p>
              The currently available Regular Affiliate tier is free to apply for
              and join after approval and onboarding.
            </p>
          </article>
          <article>
            <h3>Can I apply for Plus or Pro?</h3>
            <p>
              Not yet. Affiliate Plus and Affiliate Pro are coming soon. The
              current application form submits Regular Affiliate applications only.
            </p>
          </article>
          <article>
            <h3>How long can one customer generate commission?</h3>
            <p>
              Up to 12 consecutive months from that customer’s first successful
              eligible subscription payment, subject to the Programme Terms.
            </p>
          </article>
          <article>
            <h3>How is a referral attributed?</h3>
            <p>
              The affiliate’s specific approved referral code must be successfully
              recorded during the relevant signup or purchase flow. A link or verbal
              claim alone does not create attribution.
            </p>
          </article>
          <article>
            <h3>When are Singapore affiliates paid?</h3>
            <p>
              Eligible commission is collated monthly and scheduled for PayNow
              payout between the 7th and 10th of the following month. There is
              currently no minimum payout threshold.
            </p>
          </article>
          <article>
            <h3>What purchases are commissionable?</h3>
            <p>
              Eligible public Dreamscape Student Access subscriptions designated as
              commissionable. GKP class-companion plans, Education Licences,
              complimentary access, and excluded promotions are not commissionable
              unless confirmed in writing.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.eyebrow}>Regular Affiliate · Available now</p>
        <h2>Ready to partner with Dreamscape?</h2>
        <p>
          Apply for the currently available Regular Affiliate tier. Plus and Pro
          will be introduced later.
        </p>
        <div className={styles.heroButtons}>
          <Link href="/affiliate/apply" className={styles.primaryButton}>
            Start Application
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/affiliate-terms" className={styles.secondaryButton}>
            Programme Terms
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>Dreamscape One</strong>
          <p>Powered by Guru Kids Pro</p>
        </div>
        <nav aria-label="Affiliate footer navigation">
          <Link href="/">Home</Link>
          <Link href="/affiliate/apply">Apply</Link>
          <Link href="/affiliate-terms">Affiliate Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </main>
  );
}
