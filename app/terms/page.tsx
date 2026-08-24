"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const EFFECTIVE_DATE = "24 August 2026";
const TERMS_VERSION = "terms-v2-2026-08-24";

const contents = [
  { id: "acceptance", label: "Acceptance and scope" },
  { id: "about", label: "About Dreamscape One" },
  { id: "eligibility", label: "Eligibility and younger users" },
  { id: "accounts", label: "Accounts and security" },
  { id: "parents", label: "Parents, guardians, schools and organisations" },
  { id: "education", label: "Educational content and AI-assisted tools" },
  { id: "subscriptions", label: "Plans, subscriptions and renewal" },
  { id: "membership-controls", label: "Plan changes, pause, cancellation and resumption" },
  { id: "payments", label: "Payments, taxes, refunds and disputes" },
  { id: "deletion", label: "Account deletion" },
  { id: "rewards", label: "Dream Tokens, Dream Gems and rewards" },
  { id: "licensing", label: "Education Licences and affiliates" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "user-content", label: "User submissions and feedback" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "availability", label: "Availability and changes" },
  { id: "third-parties", label: "Third-party services" },
  { id: "termination", label: "Suspension and termination" },
  { id: "privacy", label: "Privacy and communications" },
  { id: "liability", label: "Disclaimers and liability" },
  { id: "changes", label: "Changes to these Terms" },
  { id: "general", label: "General legal terms" },
  { id: "law", label: "Governing law and disputes" },
  { id: "contact", label: "Contact us" },
];

const emailHref =
  "mailto:admin@gurukidspro.com?subject=Dreamscape%20One%20Terms%20Enquiry";

const whatsappHref =
  "https://wa.me/6583888949?text=Hello%20Guru%20Kids%20Pro%2C%20I%20have%20a%20question%20about%20the%20Dreamscape%20One%20Terms%20and%20Conditions.";

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        scrollMarginTop: "112px",
        padding: "0 0 42px",
        borderBottom: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#8ee8ff",
          fontSize: "11px",
          fontWeight: 900,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        Section {number}
      </p>

      <h2
        style={{
          margin: "13px 0 0",
          color: "white",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "clamp(29px, 3.2vw, 42px)",
          fontWeight: 400,
          lineHeight: 1.16,
        }}
      >
        {title}
      </h2>

      <div
        style={{
          marginTop: "20px",
          color: "rgba(255,255,255,0.72)",
          fontSize: "clamp(15px, 1.55vw, 17px)",
          fontWeight: 300,
          lineHeight: 1.78,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 16px" }}>{children}</p>;
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul
      style={{
        margin: "8px 0 18px",
        paddingLeft: "22px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {children}
    </ul>
  );
}

export default function TermsPage() {
  const [viewportWidth, setViewportWidth] = useState(1440);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = viewportWidth <= 700;
  const isCompact = viewportWidth <= 1100;

  const navLinkStyle: CSSProperties = {
    color: "rgba(255,255,255,0.72)",
    textDecoration: "none",
    fontSize: "14px",
    whiteSpace: "nowrap",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 8%, rgba(83,215,255,0.14), transparent 28%), radial-gradient(circle at 88% 24%, rgba(197,140,255,0.13), transparent 30%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "hidden",
      }}
    >
      <header
        style={{
          minHeight: isMobile ? "72px" : "86px",
          padding: isMobile
            ? "0 14px"
            : isCompact
              ? "0 28px"
              : "0 6vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(2,8,19,0.92)",
          backdropFilter: "blur(18px)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <Link
          href="/"
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "10px" : "13px",
            color: "white",
            textDecoration: "none",
          }}
        >
          <img
            src="/home/dreamscape-logo.png"
            alt="Dreamscape One"
            style={{
              width: isMobile ? "38px" : isCompact ? "44px" : "50px",
              height: isMobile ? "38px" : isCompact ? "44px" : "50px",
              flexShrink: 0,
              objectFit: "contain",
              borderRadius: "999px",
              boxShadow:
                "0 0 18px rgba(83,215,255,0.2), 0 0 20px rgba(197,140,255,0.18)",
            }}
          />

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: isMobile ? "10px" : isCompact ? "13px" : "16px",
                letterSpacing: isMobile
                  ? "0.11em"
                  : isCompact
                    ? "0.2em"
                    : "0.3em",
                whiteSpace: "nowrap",
              }}
            >
              DREAMSCAPE ONE
            </p>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(255,255,255,0.5)",
                fontSize: isMobile ? "8px" : "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Terms & Conditions
            </p>
          </div>
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "8px" : isCompact ? "12px" : "22px",
          }}
        >
          {!isCompact && (
            <>
              <Link href="/" style={navLinkStyle}>
                Home
              </Link>
              <Link href="/pricing" style={navLinkStyle}>
                Student Plans
              </Link>
              <Link href="/education-licence" style={navLinkStyle}>
                Education Licence
              </Link>
            </>
          )}

          <a
            href={emailHref}
            style={{
              minHeight: isMobile ? "38px" : "42px",
              padding: isMobile ? "9px 11px" : "10px 17px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              color: "#170827",
              background:
                "linear-gradient(90deg, #8ee8ff, #c58cff 62%, #ffae5c)",
              textDecoration: "none",
              fontSize: isMobile ? "9px" : "11px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              whiteSpace: "nowrap",
            }}
          >
            CONTACT
          </a>
        </nav>
      </header>

      <section
        style={{
          padding: isMobile
            ? "72px 18px 58px"
            : isCompact
              ? "90px 34px 68px"
              : "112px 6vw 82px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "13px",
            fontWeight: 900,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
          }}
        >
          Legal
        </p>

        <h1
          style={{
            margin: "22px auto 0",
            maxWidth: "1020px",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? "clamp(42px, 12vw, 52px)"
              : "clamp(58px, 7vw, 82px)",
            fontWeight: 400,
            lineHeight: 1.03,
          }}
        >
          Terms & Conditions
        </h1>

        <p
          style={{
            margin: "25px auto 0",
            maxWidth: "860px",
            color: "rgba(255,255,255,0.7)",
            fontSize: isMobile ? "16px" : "clamp(18px, 1.9vw, 21px)",
            fontWeight: 300,
            lineHeight: 1.72,
          }}
        >
          These Terms govern access to and use of Dreamscape One, including
          student and staff accounts, Learning Missions, Nova&apos;s World,
          Milo&apos;s World, subscriptions, virtual rewards, Education
          Licences, affiliate participation and related services.
        </p>

        <div
          style={{
            margin: "31px auto 0",
            width: "fit-content",
            maxWidth: "100%",
            padding: "11px 16px",
            borderRadius: "999px",
            border: "1px solid rgba(142,232,255,0.2)",
            background: "rgba(255,255,255,0.045)",
            color: "rgba(255,255,255,0.65)",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          Effective {EFFECTIVE_DATE} · {TERMS_VERSION}
        </div>
      </section>

      <section
        style={{
          padding: isMobile
            ? "0 18px 86px"
            : isCompact
              ? "0 34px 100px"
              : "0 6vw 120px",
        }}
      >
        <div
          style={{
            maxWidth: "1420px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isCompact
              ? "minmax(0, 1fr)"
              : "300px minmax(0, 1fr)",
            gap: isCompact ? "28px" : "46px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              position: isCompact ? "relative" : "sticky",
              top: isCompact ? "auto" : "112px",
              padding: isMobile ? "23px 20px" : "27px 24px",
              borderRadius: "25px",
              border: "1px solid rgba(142,232,255,0.2)",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              boxShadow:
                "0 24px 65px rgba(0,0,0,0.28), inset 0 0 24px rgba(83,215,255,0.02)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.19em",
                textTransform: "uppercase",
              }}
            >
              On this page
            </p>

            <nav
              aria-label="Terms sections"
              style={{
                marginTop: "19px",
                display: "grid",
                gridTemplateColumns:
                  isCompact && !isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "1fr",
                gap: "10px 22px",
              }}
            >
              {contents.map((item, index) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    color: "rgba(255,255,255,0.66)",
                    textDecoration: "none",
                    fontSize: "13px",
                    lineHeight: 1.45,
                  }}
                >
                  <span
                    style={{
                      color: "#8ee8ff",
                      fontSize: "10px",
                      fontWeight: 900,
                      lineHeight: 1.9,
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
          </aside>

          <article
            style={{
              minWidth: 0,
              padding: isMobile
                ? "31px 22px"
                : isCompact
                  ? "42px 38px"
                  : "52px 54px",
              borderRadius: isMobile ? "26px" : "32px",
              border: "1px solid rgba(142,232,255,0.19)",
              background:
                "radial-gradient(circle at 92% 2%, rgba(197,140,255,0.09), transparent 25%), linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))",
              boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
            }}
          >
            <div
              style={{
                marginBottom: "42px",
                padding: isMobile ? "24px 21px" : "28px 27px",
                borderRadius: "22px",
                border: "1px solid rgba(255,174,92,0.22)",
                background:
                  "radial-gradient(circle at 0% 0%, rgba(255,174,92,0.12), transparent 36%), rgba(255,255,255,0.035)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#ffbd73",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Important for parents and guardians
              </p>

              <p
                style={{
                  margin: "13px 0 0",
                  color: "rgba(255,255,255,0.76)",
                  fontSize: "15px",
                  lineHeight: 1.7,
                }}
              >
                Users below 13 require parent or guardian consent for the
                collection, use and disclosure of their personal data and
                should use Dreamscape with appropriate adult involvement.
                A parent, guardian, school or other authorised organisation
                must approve and complete any paid purchase for a user below
                18.
              </p>
            </div>

            <Section id="acceptance" number="01" title="Acceptance and scope">
              <Paragraph>
                These Terms & Conditions (“Terms”) form a legal agreement
                between you and Guru Kids Pro, UEN 53232375X, the operator of
                Dreamscape One (“Dreamscape”, “we”, “us” or “our”).
              </Paragraph>

              <Paragraph>
                By creating an account, accessing Dreamscape, purchasing or
                managing a plan, accepting access through an education
                organisation, participating in an affiliate or licence
                programme, or otherwise using the platform, you agree to these
                Terms and our{" "}
                <Link
                  href="/privacy"
                  style={{ color: "#8ee8ff", textDecoration: "none" }}
                >
                  Privacy Policy
                </Link>
                .
              </Paragraph>

              <Paragraph>
                If you accept these Terms for a child, student, school,
                organisation or another person, you confirm that you have the
                authority to do so. If you do not agree to these Terms, do not
                use the platform.
              </Paragraph>

              <Paragraph>
                Certain features or programmes may have additional written
                terms. Where programme-specific terms conflict with these
                general Terms, the more specific terms apply to that feature
                or programme to the extent of the conflict.
              </Paragraph>
            </Section>

            <Section id="about" number="02" title="About Dreamscape One">
              <Paragraph>
                Dreamscape One is a gamified learning ecosystem by Guru Kids
                Pro. It includes Nova&apos;s World, Milo&apos;s World, Learning
                Missions, thinking challenges, progress records, teacher and
                organisation tools, virtual rewards, simulations, commerce,
                support and related services.
              </Paragraph>

              <Paragraph>
                Features may differ by age, account role, subscription,
                Education Licence, beta status, device, location and launch
                stage. Features identified as “Coming Soon”, “Beta”, “Pilot”,
                “Preview” or similar are developmental and may change,
                be delayed or not proceed to general release.
              </Paragraph>
            </Section>

            <Section
              id="eligibility"
              number="03"
              title="Eligibility and younger users"
            >
              <Paragraph>
                Dreamscape is designed for children, teenagers, parents,
                educators and approved organisations. Age labels are guidance
                for selecting suitable content and do not replace parent,
                guardian or educator supervision.
              </Paragraph>

              <List>
                <li>Nova&apos;s World is generally designed for learners aged 6–12.</li>
                <li>Milo&apos;s World is generally designed for users aged 13 and above.</li>
                <li>
                  For a child below 13, a parent or legal guardian must provide
                  the consent required for Dreamscape to collect, use and
                  disclose the child&apos;s personal data.
                </li>
                <li>
                  Users below 18 may not independently complete a paid
                  Dreamscape purchase under our platform rules. A parent,
                  guardian or authorised organisation must approve and complete
                  the purchase.
                </li>
              </List>

              <Paragraph>
                We may request information reasonably necessary to confirm age,
                authority, account ownership, organisational approval or payment
                authorisation. If we learn that a younger user&apos;s account
                lacks required authority or consent, we may restrict the
                account while the issue is resolved.
              </Paragraph>
            </Section>

            <Section id="accounts" number="04" title="Accounts and security">
              <Paragraph>
                You must provide accurate information and keep account details
                reasonably current. You are responsible for activity carried
                out through your account except to the extent it results from
                a security failure under our control or applicable law provides
                otherwise.
              </Paragraph>

              <List>
                <li>Do not share passwords, one-time codes or login links publicly.</li>
                <li>Notify us promptly if you believe an account has been compromised.</li>
                <li>Do not create or control an account for another person without proper authority.</li>
                <li>
                  If an account email, learner assignment or other account
                  detail is entered incorrectly, contact us promptly so we can
                  verify and correct the record.
                </li>
                <li>
                  Do not circumvent age, role, subscription, organisation or
                  staff access controls.
                </li>
              </List>

              <Paragraph>
                We may verify, merge, correct, restrict or close duplicate,
                unauthorised, fraudulent, compromised or materially inaccurate
                accounts where reasonably necessary. We may require additional
                verification before transferring an account, subscription or
                learner entitlement to a different account.
              </Paragraph>
            </Section>

            <Section
              id="parents"
              number="05"
              title="Parents, guardians, schools and organisations"
            >
              <Paragraph>
                A parent, guardian, teacher, school or Education Licence
                organisation that creates, approves, assigns or manages a
                learner account must have the authority to do so and must
                provide any notice or obtain any consent required by law.
              </Paragraph>

              <List>
                <li>
                  Parents and guardians remain responsible for supervising
                  younger users and reviewing purchases made for them.
                </li>
                <li>
                  Schools and organisations are responsible for authorised
                  roster uploads, seat assignment and role administration.
                </li>
                <li>
                  Organisation administrators must promptly remove access when
                  a student, teacher or administrator is no longer authorised.
                </li>
                <li>
                  Staff and organisation-managed accounts may be subject to
                  additional restrictions on self-service account deletion
                  where responsibilities, records or licences must first be
                  transferred or closed.
                </li>
              </List>
            </Section>

            <Section
              id="education"
              number="06"
              title="Educational content and AI-assisted tools"
            >
              <Paragraph>
                Dreamscape supports learning and practice. It is not a
                replacement for professional teaching, school instruction,
                assessment by a qualified educator, or advice tailored to an
                individual learner.
              </Paragraph>

              <Paragraph>
                Some content, explanations, recommendations or internal
                workflows may use automated or AI-assisted tools. Published
                learning content may also be reviewed or edited by educators.
                We aim for accuracy, clarity, age appropriateness and curriculum
                relevance, but we do not guarantee that every question,
                explanation, score, simulation or recommendation will be
                error-free or suitable for every learner.
              </Paragraph>

              <Paragraph>
                Dreamscape One is independently developed by Guru Kids Pro. It
                is not represented as officially endorsed, approved or operated
                by the Singapore Ministry of Education unless we expressly
                state otherwise in writing.
              </Paragraph>

              <Paragraph>
                Results, scores, rewards, leaderboards and progress indicators
                are platform records. They are not official school grades,
                qualifications, financial advice, investment advice or
                guarantees of academic or commercial outcomes.
              </Paragraph>
            </Section>

            <Section
              id="subscriptions"
              number="07"
              title="Plans, subscriptions and renewal"
            >
              <Paragraph>
                Paid access may be offered as monthly, annual, standalone,
                bundled, pilot, promotional, school-managed or
                organisation-based access. The current price, billing interval,
                included features, renewal status and material purchase terms
                are shown on the relevant pricing, checkout or written offer
                page before payment.
              </Paragraph>

              <List>
                <li>
                  Public Dreamscape recurring subscriptions are generally
                  processed through Stripe.
                </li>
                <li>
                  Guru Kids Pro-managed access and certain legacy arrangements
                  may be billed separately through Guru Kids Pro, HitPay or
                  another payment method stated to the payer.
                </li>
                <li>
                  A monthly plan renews at the monthly interval shown at
                  checkout unless cancelled or otherwise stated.
                </li>
                <li>
                  An annual plan is generally charged upfront for the annual
                  billing period shown at checkout and renews at that interval
                  if automatic renewal is selected.
                </li>
                <li>
                  We will not intentionally enrol a consumer into a recurring
                  subscription without presenting the recurring nature and
                  price before authorisation.
                </li>
              </List>

              <Paragraph>
                We may change future prices or plan structures. A change does
                not alter a completed fixed-term purchase, but may apply to a
                future renewal, upgrade, downgrade or new purchase after notice
                where required.
              </Paragraph>
            </Section>

            <Section
              id="membership-controls"
              number="08"
              title="Plan changes, pause, cancellation and resumption"
            >
              <Paragraph>
                Where self-service membership controls are available, the
                options shown in your account govern how a change is applied.
                The following concepts are different and should not be treated
                as interchangeable.
              </Paragraph>

              <List>
                <li>
                  <strong>Plan change.</strong> A scheduled upgrade, downgrade
                  or billing-cycle change will normally take effect at the next
                  paid billing cycle unless the confirmation screen states
                  otherwise. Your current paid entitlement remains in place
                  until the change becomes effective.
                </li>
                <li>
                  <strong>Pause Membership.</strong> If offered for the
                  subscription, pausing may stop paid learning access and
                  subscription invoice generation from the effective pause
                  time. The confirmation screen will state the billing effect,
                  treatment of unused paid time or credits, and what is
                  required to resume.
                </li>
                <li>
                  <strong>Resume Membership.</strong> Resumption may require a
                  successful payment before paid learning access is restored.
                  Any amount due, credit or new billing date is determined by
                  the payment provider and displayed where applicable.
                </li>
                <li>
                  <strong>Stop future renewal.</strong> Cancelling automatic
                  renewal normally leaves paid access available through the
                  current paid-through date, after which paid access ends.
                </li>
                <li>
                  <strong>Keep Membership.</strong> If a future cancellation has
                  not yet taken effect, an eligible user may be able to reverse
                  it and restore normal renewal.
                </li>
              </List>

              <Paragraph>
                Some membership states cannot be combined. For example, you may
                need to cancel a pending plan change before pausing or ending a
                subscription. Availability also depends on the provider,
                billing state, payment status and type of access.
              </Paragraph>
            </Section>

            <Section
              id="payments"
              number="09"
              title="Payments, taxes, refunds and disputes"
            >
              <Paragraph>
                Payment processing is performed by the provider shown at
                checkout. Public Dreamscape subscriptions are generally
                processed by Stripe; Guru Kids Pro-managed and legacy billing
                may use HitPay or another stated method. Payment providers have
                their own terms, authentication and privacy practices.
              </Paragraph>

              <List>
                <li>
                  You confirm that you are authorised to use the selected
                  payment method and to approve any recurring charge shown at
                  checkout.
                </li>
                <li>
                  The total amount and recurring billing interval, where
                  applicable, are displayed before payment. Mandatory taxes or
                  charges are included or disclosed as required by applicable
                  law.
                </li>
                <li>
                  We may receive payment status, transaction identifiers,
                  subscription identifiers, billing contact details and refund
                  information, but we do not normally receive or store complete
                  payment-card details.
                </li>
              </List>

              <Paragraph>
                Unless a specific offer, checkout page, written agreement or
                applicable law provides otherwise, completed subscription
                charges are non-refundable once the relevant access period has
                begun. Cancelling renewal, pausing a membership or deleting an
                account does not by itself create a refund for a completed
                charge. This does not exclude any refund, cancellation or
                consumer right that cannot lawfully be excluded.
              </Paragraph>

              <Paragraph>
                If you believe a charge is duplicate, incorrect, unauthorised
                or inconsistent with the purchase terms, contact us promptly.
                We may investigate payment disputes and may temporarily
                restrict paid access while a chargeback or fraud investigation
                is unresolved, where reasonable and permitted by law.
              </Paragraph>
            </Section>

            <Section id="deletion" number="10" title="Account deletion">
              <Paragraph>
                Eligible users may request permanent Dreamscape account
                deletion through the account settings or by contacting us.
                Account deletion is different from pausing a membership or
                stopping future renewal.
              </Paragraph>

              <List>
                <li>
                  Deleting an eligible account ends Dreamscape learning access
                  and may permanently remove learner progress, quiz history,
                  Dream Tokens, Dream Gems, virtual holdings, referrals and
                  other account data.
                </li>
                <li>
                  If an eligible account has a live public Stripe subscription,
                  our current self-service deletion process cancels that
                  subscription so it cannot renew. Paid learning access ends as
                  part of the deletion process.
                </li>
                <li>
                  Account deletion does not automatically create a refund for
                  charges already completed.
                </li>
                <li>
                  Staff, organisation-managed, Guru Kids Pro-managed or certain
                  legacy accounts may not be eligible for immediate
                  self-service deletion because roles, student relationships,
                  licences, billing or records must first be transferred or
                  closed.
                </li>
                <li>
                  We may retain limited billing, tax, security, dispute and
                  deletion-audit records where reasonably necessary or
                  required by law. Personal identifiers in retained Dreamscape
                  records are deleted, redacted, anonymised or pseudonymised
                  where appropriate.
                </li>
              </List>

              <Paragraph>
                More detail about deletion, anonymisation and retention is
                provided in our{" "}
                <Link
                  href="/privacy"
                  style={{ color: "#8ee8ff", textDecoration: "none" }}
                >
                  Privacy Policy
                </Link>
                .
              </Paragraph>
            </Section>

            <Section
              id="rewards"
              number="11"
              title="Dream Tokens, Dream Gems and rewards"
            >
              <Paragraph>
                Dream Tokens, Dream Gems, points, badges, virtual cash,
                simulated property values, simulated stock values, rewards and
                other in-platform items are digital platform features only.
              </Paragraph>

              <List>
                <li>They are not legal tender, deposits or stored value.</li>
                <li>
                  They cannot be exchanged for cash unless we expressly state a
                  lawful redemption option in writing.
                </li>
                <li>
                  They cannot be sold, transferred, traded outside Dreamscape,
                  pledged or used for real-world investment.
                </li>
                <li>
                  Reward rates, eligibility, limits, stock and redemption
                  options may change.
                </li>
                <li>
                  Quiz, attendance, referral, promotional and redemption
                  rewards are subject to the applicable programme rules.
                </li>
              </List>

              <Paragraph>
                We may reverse duplicate, mistaken, manipulated, fraudulent or
                improperly obtained rewards. Closing or deleting an account may
                result in the permanent loss of unused virtual items, subject
                to applicable law.
              </Paragraph>
            </Section>

            <Section
              id="licensing"
              number="12"
              title="Education Licences and affiliates"
            >
              <Paragraph>
                Education Licences are subject to these Terms together with the
                package details, onboarding terms, quotation, licence
                conditions and other written terms accepted by the
                organisation.
              </Paragraph>

              <Paragraph>
                An education organisation is responsible for authorised user
                access, required parent or guardian permissions, seat
                assignments, role administration and appropriate supervision.
                Student access may not be shared across unrelated organisations
                or branches unless expressly approved.
              </Paragraph>

              <Paragraph>
                Affiliate participation is additionally governed by the{" "}
                <Link
                  href="/affiliate-terms"
                  style={{ color: "#8ee8ff", textDecoration: "none" }}
                >
                  Affiliate Programme Terms
                </Link>
                . If programme-specific terms conflict with these general
                Terms, the programme-specific terms apply to that programme.
              </Paragraph>
            </Section>

            <Section id="acceptable-use" number="13" title="Acceptable use">
              <Paragraph>
                You must use Dreamscape lawfully, respectfully and only for its
                intended educational, personal or authorised organisational
                purposes.
              </Paragraph>

              <Paragraph>You must not:</Paragraph>

              <List>
                <li>
                  cheat, automate, script, manipulate or falsely generate
                  scores, rewards, referrals, attendance or progress;
                </li>
                <li>
                  access another person&apos;s account, personal information or
                  restricted educator, curriculum or administrator tools
                  without authority;
                </li>
                <li>
                  copy, scrape, download in bulk, republish, sell or build a
                  competing question bank or service from Dreamscape content;
                </li>
                <li>
                  reverse engineer, interfere with, overload, bypass, probe or
                  compromise platform security or access controls;
                </li>
                <li>
                  upload malware, harmful code, unlawful material, abusive
                  content or content that infringes another person&apos;s rights;
                </li>
                <li>
                  use Dreamscape to harass, impersonate, mislead, exploit or
                  endanger another person; or
                </li>
                <li>
                  use student or account data for unrelated advertising,
                  profiling, resale or unauthorised commercial purposes.
                </li>
              </List>
            </Section>

            <Section
              id="user-content"
              number="14"
              title="User submissions and feedback"
            >
              <Paragraph>
                If Dreamscape allows you to submit text, files, images,
                business-builder materials, support attachments, comments or
                other content, you retain any ownership you already have in
                that material.
              </Paragraph>

              <Paragraph>
                You grant us a limited licence to host, process, reproduce and
                display the submitted material only as reasonably necessary to
                operate, secure, support and improve the relevant Dreamscape
                feature. You must have the right to submit the material and
                must not upload unlawful, confidential or infringing content
                that you are not authorised to provide.
              </Paragraph>

              <Paragraph>
                If you voluntarily send product feedback or suggestions, you
                allow us to use those ideas to improve Dreamscape without
                payment or obligation, provided we do not publicly identify
                you without permission.
              </Paragraph>
            </Section>

            <Section
              id="intellectual-property"
              number="15"
              title="Intellectual property"
            >
              <Paragraph>
                Dreamscape One, Guru Kids Pro, Nova, Milo, platform designs,
                characters, graphics, software, questions, explanations,
                missions, simulations, audio, videos, branding and related
                materials are owned by us or used with permission.
              </Paragraph>

              <Paragraph>
                We grant you a limited, personal, non-exclusive,
                non-transferable and revocable licence to use the platform
                during your authorised access period. This licence does not
                transfer ownership or permit commercial reproduction, public
                distribution, resale, sublicensing or creation of derivative
                products except where we expressly permit it.
              </Paragraph>

              <Paragraph>
                Educators may display and use assigned Dreamscape content with
                authorised students under an active Education Licence. They may
                not export or reproduce the full content bank for use outside
                the platform.
              </Paragraph>
            </Section>

            <Section
              id="availability"
              number="16"
              title="Availability and changes"
            >
              <Paragraph>
                We aim to keep Dreamscape available but do not guarantee
                uninterrupted, permanent or error-free access. Maintenance,
                security work, internet failures, device limitations,
                third-party outages, updates and events beyond reasonable
                control may affect availability.
              </Paragraph>

              <Paragraph>
                We may add, remove, redesign, rebalance, test or discontinue
                features, content, reward systems, simulations, access rules
                and supported devices. Where a material change substantially
                affects a current paid entitlement, we will take reasonable
                steps such as notice, replacement access, account credit,
                refund or another appropriate remedy depending on the
                circumstances and applicable law.
              </Paragraph>
            </Section>

            <Section
              id="third-parties"
              number="17"
              title="Third-party services"
            >
              <Paragraph>
                Dreamscape relies on third-party providers for functions such
                as hosting, authentication, databases, email, payments,
                analytics, communications and external websites. Current
                providers may include Supabase, Vercel, Resend, Google, Stripe
                and HitPay depending on the service used.
              </Paragraph>

              <Paragraph>
                Third-party services are governed by their own terms and
                privacy practices. We remain responsible for our own
                obligations, but are not responsible for third-party content,
                policies, security, availability or actions outside our
                reasonable control.
              </Paragraph>
            </Section>

            <Section
              id="termination"
              number="18"
              title="Suspension and termination"
            >
              <Paragraph>
                You may stop using Dreamscape at any time. If you have a
                recurring subscription, stopping use of the platform does not
                by itself stop future billing; use the applicable membership
                cancellation or account-deletion process.
              </Paragraph>

              <Paragraph>
                We may restrict, suspend or terminate access where reasonably
                necessary to:
              </Paragraph>

              <List>
                <li>protect users, students, educators or the platform;</li>
                <li>
                  investigate fraud, security issues, abuse, payment disputes
                  or serious rule violations;
                </li>
                <li>comply with law or a valid authority request;</li>
                <li>enforce these Terms or programme-specific terms;</li>
                <li>
                  manage an expired, cancelled, unpaid, paused or withdrawn
                  subscription or licence; or
                </li>
                <li>
                  address an account whose required parent, guardian or
                  organisational authority cannot be verified.
                </li>
              </List>

              <Paragraph>
                Where appropriate, we may give notice and an opportunity to
                correct the issue. Immediate action may be taken for serious
                safety, security, legal or fraudulent conduct.
              </Paragraph>
            </Section>

            <Section
              id="privacy"
              number="19"
              title="Privacy and communications"
            >
              <Paragraph>
                Our collection, use, disclosure, protection, retention and
                deletion of personal data are described in the{" "}
                <Link
                  href="/privacy"
                  style={{ color: "#8ee8ff", textDecoration: "none" }}
                >
                  Privacy Policy
                </Link>
                . You should review it before creating, approving or assigning
                an account.
              </Paragraph>

              <Paragraph>
                We may send service communications reasonably required to
                operate an account or programme, including login, security,
                purchase, billing, progress, support, policy, access and
                account-lifecycle messages.
              </Paragraph>

              <Paragraph>
                Promotional communications will be sent only where permitted.
                Where an unsubscribe option is provided, you may use it to stop
                the relevant promotional messages. Service, transaction,
                security and legal notices may still be sent where necessary.
              </Paragraph>
            </Section>

            <Section
              id="liability"
              number="20"
              title="Disclaimers and liability"
            >
              <Paragraph>
                To the fullest extent permitted by law, Dreamscape is provided
                on an “as available” basis. We do not guarantee specific
                grades, examination results, learning speed, financial
                knowledge, business performance, investment outcomes or other
                results.
              </Paragraph>

              <Paragraph>
                Milo&apos;s simulations, virtual investments, market
                information and business activities are educational
                simulations only. They do not involve real securities, real
                ownership, real profit or personalised financial, legal, tax
                or investment advice.
              </Paragraph>

              <Paragraph>
                Nothing in these Terms excludes or limits liability, rights or
                remedies that cannot lawfully be excluded or limited,
                including mandatory consumer protections.
              </Paragraph>

              <Paragraph>
                Subject to the previous paragraph and to the fullest extent
                permitted by law, we are not liable for indirect, incidental,
                special or consequential loss, loss of opportunity, loss of
                virtual items or loss caused by unauthorised use, third-party
                services or events beyond our reasonable control.
              </Paragraph>

              <Paragraph>
                Where liability for a paid Dreamscape service may lawfully be
                limited, our aggregate liability arising from that paid service
                will not exceed the amount actually paid to us for the affected
                service during the 12 months before the event giving rise to
                the claim.
              </Paragraph>
            </Section>

            <Section id="changes" number="21" title="Changes to these Terms">
              <Paragraph>
                We may update these Terms to reflect changes to Dreamscape,
                pricing structures, membership controls, payment providers,
                legal requirements, security practices or business operations.
              </Paragraph>

              <Paragraph>
                The updated version will display a new effective date and
                version identifier. Where a change materially affects current
                paid access or user rights, we will provide reasonable notice
                through the platform, email or another appropriate method.
              </Paragraph>

              <Paragraph>
                Continued use after updated Terms take effect means you accept
                the revised Terms to the extent permitted by law. If you do not
                agree, you should stop using Dreamscape and cancel future
                renewal where applicable.
              </Paragraph>
            </Section>

            <Section id="general" number="22" title="General legal terms">
              <Paragraph>
                These Terms, together with the Privacy Policy and any
                applicable programme-specific terms, form the agreement
                governing the relevant Dreamscape service.
              </Paragraph>

              <List>
                <li>
                  If any provision is invalid or unenforceable, the remaining
                  provisions continue to apply to the fullest extent permitted
                  by law.
                </li>
                <li>
                  A delay or failure by either party to enforce a provision
                  does not automatically waive that provision.
                </li>
                <li>
                  You may not transfer a personal account or subscription to
                  another person without our approval. We may transfer these
                  Terms as part of a genuine business reorganisation or
                  transfer, subject to applicable law.
                </li>
                <li>
                  Headings are for convenience and do not change the meaning of
                  the Terms.
                </li>
              </List>
            </Section>

            <Section
              id="law"
              number="23"
              title="Governing law and disputes"
            >
              <Paragraph>
                These Terms are governed by the laws of Singapore.
              </Paragraph>

              <Paragraph>
                Before starting formal proceedings, you and Guru Kids Pro agree
                to make a reasonable good-faith attempt to resolve the matter
                by contacting each other and providing relevant details.
              </Paragraph>

              <Paragraph>
                If a dispute cannot be resolved informally, the courts of
                Singapore will have jurisdiction, subject to any mandatory
                consumer right, statutory remedy or dispute process that cannot
                lawfully be excluded.
              </Paragraph>
            </Section>

            <Section id="contact" number="24" title="Contact us">
              <Paragraph>Dreamscape One is operated by:</Paragraph>

              <div
                style={{
                  marginTop: "20px",
                  padding: isMobile ? "23px 20px" : "28px 27px",
                  borderRadius: "22px",
                  border: "1px solid rgba(142,232,255,0.2)",
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "white",
                    fontSize: "21px",
                    fontWeight: 800,
                  }}
                >
                  Guru Kids Pro
                </p>

                <p style={{ margin: "10px 0 0" }}>UEN 53232375X</p>
                <p style={{ margin: "5px 0 0" }}>
                  Blk 4 Queen&apos;s Road, #02-127, Singapore
                </p>
                <p style={{ margin: "5px 0 0" }}>
                  Email: admin@gurukidspro.com
                </p>
                <p style={{ margin: "5px 0 0" }}>
                  WhatsApp: +65 8388 8949
                </p>

                <div
                  style={{
                    marginTop: "23px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <a
                    href={emailHref}
                    style={{
                      width: isMobile ? "100%" : "auto",
                      minHeight: "52px",
                      padding: "13px 21px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      background:
                        "linear-gradient(90deg, #8ee8ff, #c58cff 62%, #ffae5c)",
                      color: "#160729",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      boxSizing: "border-box",
                    }}
                  >
                    Email Guru Kids Pro
                  </a>

                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: isMobile ? "100%" : "auto",
                      minHeight: "52px",
                      padding: "13px 21px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.24)",
                      background: "rgba(255,255,255,0.045)",
                      color: "white",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      boxSizing: "border-box",
                    }}
                  >
                    WhatsApp 8388 8949
                  </a>
                </div>
              </div>
            </Section>

            <div
              style={{
                marginTop: "42px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "18px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.48)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Effective {EFFECTIVE_DATE} · {TERMS_VERSION}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "15px",
                }}
              >
                <Link href="/" style={navLinkStyle}>
                  Home
                </Link>
                <Link href="/privacy" style={navLinkStyle}>
                  Privacy Policy
                </Link>
                <Link href="/affiliate-terms" style={navLinkStyle}>
                  Affiliate Terms
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
