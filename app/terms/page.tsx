"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const EFFECTIVE_DATE = "1 August 2026";

const contents = [
  { id: "acceptance", label: "Acceptance of these Terms" },
  { id: "about", label: "About Dreamscape One" },
  { id: "eligibility", label: "Eligibility and younger users" },
  { id: "accounts", label: "Accounts and security" },
  { id: "education", label: "Educational use and content" },
  { id: "subscriptions", label: "Plans, billing, and renewal" },
  { id: "payments", label: "Payments and refunds" },
  { id: "rewards", label: "Dream Tokens, Gems, and rewards" },
  { id: "licensing", label: "Education Licences and affiliates" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "availability", label: "Availability and changes" },
  { id: "third-parties", label: "Third-party services" },
  { id: "liability", label: "Disclaimers and liability" },
  { id: "termination", label: "Suspension and termination" },
  { id: "privacy", label: "Privacy and communications" },
  { id: "changes", label: "Changes to these Terms" },
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
            maxWidth: "820px",
            color: "rgba(255,255,255,0.7)",
            fontSize: isMobile ? "16px" : "clamp(18px, 1.9vw, 21px)",
            fontWeight: 300,
            lineHeight: 1.72,
          }}
        >
          These Terms govern access to and use of Dreamscape One, including
          student accounts, Learning Missions, Milo’s World, subscriptions,
          virtual rewards, and related services.
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
          Effective {EFFECTIVE_DATE}
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
                Users below 18 may use Dreamscape One only with appropriate
                parent or guardian involvement. A parent, guardian, school, or
                authorised organisation must approve and make any paid
                purchase for a user below 18.
              </p>
            </div>

            <Section id="acceptance" number="01" title="Acceptance of these Terms">
              <Paragraph>
                These Terms & Conditions (“Terms”) form a legal agreement
                between you and Guru Kids Pro, UEN 53232375X, the operator of
                Dreamscape One (“Dreamscape”, “we”, “us”, or “our”).
              </Paragraph>

              <Paragraph>
                By creating an account, accessing Dreamscape, purchasing a
                plan, accepting access through an education organisation, or
                otherwise using the platform, you agree to these Terms and our{" "}
                <Link
                  href="/privacy"
                  style={{ color: "#8ee8ff", textDecoration: "none" }}
                >
                  Privacy Policy
                </Link>
                .
              </Paragraph>

              <Paragraph>
                If you are accepting these Terms for a child, student,
                organisation, or another person, you confirm that you have the
                authority to do so. If you do not agree, do not use the
                platform.
              </Paragraph>
            </Section>

            <Section id="about" number="02" title="About Dreamscape One">
              <Paragraph>
                Dreamscape One is a gamified learning ecosystem by Guru Kids
                Pro. It includes Nova’s World for younger learners and Milo’s
                World for users aged 13 and above, together with Learning
                Missions, thinking challenges, progress records, virtual
                rewards, simulations, and related features.
              </Paragraph>

              <Paragraph>
                Features may differ by age, account role, subscription,
                education licence, beta status, device, and location. Some
                features may be identified as “Coming Soon”, “Beta”, “Pilot”,
                or similar and may not yet be available for purchase or general
                use.
              </Paragraph>
            </Section>

            <Section
              id="eligibility"
              number="03"
              title="Eligibility and younger users"
            >
              <Paragraph>
                Dreamscape is designed for children, teenagers, parents,
                educators, and approved organisations. Age labels are guidance
                for selecting suitable content and do not replace parent,
                guardian, or educator supervision.
              </Paragraph>

              <List>
                <li>Nova’s World is generally designed for learners aged 6–12.</li>
                <li>
                  Milo’s World is generally designed for users aged 13 and above.
                </li>
                <li>
                  Users below 13 should use Dreamscape with active parent,
                  guardian, teacher, or authorised organisation involvement.
                </li>
                <li>
                  Users below 18 may not independently enter into a paid
                  purchase. A parent, guardian, or authorised organisation must
                  approve and complete the purchase.
                </li>
              </List>

              <Paragraph>
                We may request information reasonably necessary to confirm age,
                authority, account ownership, organisational approval, or
                payment authorisation.
              </Paragraph>
            </Section>

            <Section id="accounts" number="04" title="Accounts and security">
              <Paragraph>
                You must provide accurate information and keep account details
                reasonably current. You are responsible for activity carried
                out through your account unless it results from a security
                failure under our control.
              </Paragraph>

              <List>
                <li>Do not share passwords or login links publicly.</li>
                <li>
                  Notify us promptly if you believe an account has been
                  compromised.
                </li>
                <li>
                  Do not create accounts for another person without proper
                  authority.
                </li>
                <li>
                  Schools and education organisations must obtain any required
                  parent or guardian consent before creating or assigning
                  student accounts.
                </li>
              </List>

              <Paragraph>
                We may merge, correct, restrict, or close duplicate,
                unauthorised, fraudulent, or inactive accounts where reasonably
                necessary.
              </Paragraph>
            </Section>

            <Section
              id="education"
              number="05"
              title="Educational use and content"
            >
              <Paragraph>
                Dreamscape supports learning and practice. It is not a
                replacement for professional teaching, school instruction,
                assessment by a qualified educator, or advice tailored to an
                individual learner.
              </Paragraph>

              <Paragraph>
                Content may be developed with AI-assisted tools and is reviewed
                by qualified teachers before publication. We aim for accuracy,
                clarity, age appropriateness, and curriculum relevance, but we
                do not guarantee that every question, explanation, score,
                simulation, or recommendation will be error-free or suitable
                for every learner.
              </Paragraph>

              <Paragraph>
                Dreamscape One is independently developed by Guru Kids Pro. It
                is not represented as officially endorsed, approved, or
                operated by the Singapore Ministry of Education unless we
                expressly state otherwise in writing.
              </Paragraph>

              <Paragraph>
                Results, scores, rewards, leaderboards, and progress indicators
                are platform records. They are not official school grades,
                qualifications, financial advice, or guarantees of academic or
                commercial outcomes.
              </Paragraph>
            </Section>

            <Section
              id="subscriptions"
              number="06"
              title="Plans, billing, and renewal"
            >
              <Paragraph>
                Paid access may be offered as monthly, annual, standalone,
                bundled, pilot, promotional, or organisation-based access.
                Current prices, included features, billing periods, and
                availability are shown on the relevant pricing, checkout, or
                written offer page.
              </Paragraph>

              <List>
                <li>
                  A monthly plan covers the monthly billing period shown at
                  checkout.
                </li>
                <li>
                  An annual plan is generally paid upfront for a 12-month term
                  unless the checkout page states otherwise.
                </li>
                <li>
                  Whether a plan renews automatically will be shown before
                  purchase. If automatic renewal applies, the plan continues
                  until cancelled in accordance with the checkout instructions.
                </li>
                <li>
                  Cancelling a recurring plan stops future renewal charges. It
                  does not normally reverse a completed charge or remove access
                  already paid for, unless required by law or expressly stated.
                </li>
                <li>
                  “Coming Soon” features may be described for information but
                  cannot be relied on as available until formally launched.
                </li>
              </List>

              <Paragraph>
                We may change future prices or plan structures. A price change
                will not alter a completed fixed-term purchase, but it may
                apply to a later renewal, upgrade, or new purchase after notice
                is provided where required.
              </Paragraph>
            </Section>

            <Section id="payments" number="07" title="Payments and refunds">
              <Paragraph>
                Payments may be processed through Shopify or another payment
                provider shown at checkout. Payment providers may apply their
                own terms, privacy notices, authentication, currency
                conversion, and transaction rules.
              </Paragraph>

              <Paragraph>
                You confirm that you are authorised to use the selected payment
                method. Users below 18 must not complete a paid purchase
                without parent, guardian, or authorised organisation approval.
              </Paragraph>

              <Paragraph>
                Unless a specific offer, checkout page, written agreement, or
                applicable law provides otherwise, fees are non-refundable
                after the relevant access period has begun. This does not
                exclude any refund, cancellation, or consumer right that cannot
                lawfully be excluded.
              </Paragraph>

              <Paragraph>
                We may correct obvious pricing, billing, or product-description
                errors before fulfilment. If we cannot provide the purchased
                access, we may offer a correction, replacement access, account
                credit, or refund as appropriate.
              </Paragraph>
            </Section>

            <Section
              id="rewards"
              number="08"
              title="Dream Tokens, Gems, and rewards"
            >
              <Paragraph>
                Dream Tokens, Dream Gems, points, badges, virtual cash,
                property values, stock values, rewards, and other in-platform
                items are digital platform features only.
              </Paragraph>

              <List>
                <li>They are not legal tender, deposits, or stored value.</li>
                <li>
                  They cannot be exchanged for cash unless we expressly state a
                  lawful redemption option in writing.
                </li>
                <li>
                  They cannot be sold, transferred, traded outside Dreamscape,
                  pledged, or used for real-world investment.
                </li>
                <li>
                  Reward rates, limits, eligibility, stock, and redemption
                  options may change.
                </li>
                <li>
                  Quiz, attendance, referral, promotional, and redemption
                  rewards are subject to the applicable programme rules and
                  Terms & Conditions.
                </li>
              </List>

              <Paragraph>
                We may reverse duplicate, mistaken, manipulated, fraudulent, or
                improperly obtained rewards. Closing or losing access to an
                account may result in the loss of unused virtual items where
                permitted by law.
              </Paragraph>
            </Section>

            <Section
              id="licensing"
              number="09"
              title="Education Licences and affiliates"
            >
              <Paragraph>
                Education Licences are subject to these Terms together with the
                package details, onboarding terms, written quotation, licence
                conditions, and other terms accepted by the organisation.
              </Paragraph>

              <Paragraph>
                An education organisation is responsible for authorised user
                access, parent or guardian permissions, seat assignments, and
                appropriate supervision. Student access may not be shared
                across unrelated organisations or branches unless expressly
                approved in writing.
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

            <Section id="acceptable-use" number="10" title="Acceptable use">
              <Paragraph>
                You must use Dreamscape lawfully, respectfully, and only for
                its intended educational, personal, or authorised
                organisational purposes.
              </Paragraph>

              <Paragraph>You must not:</Paragraph>

              <List>
                <li>
                  cheat, automate, script, manipulate, or falsely generate
                  scores, rewards, referrals, attendance, or progress;
                </li>
                <li>
                  access another person’s account, personal information, or
                  restricted educator or administrator tools without authority;
                </li>
                <li>
                  copy, scrape, download in bulk, republish, sell, or build a
                  competing question bank or service from Dreamscape content;
                </li>
                <li>
                  reverse engineer, interfere with, overload, bypass, probe, or
                  compromise platform security or access controls;
                </li>
                <li>
                  upload malware, harmful code, unlawful material, abusive
                  content, or content that infringes another person’s rights;
                </li>
                <li>
                  use Dreamscape to harass, impersonate, mislead, exploit, or
                  endanger another person; or
                </li>
                <li>
                  use student or account data for unrelated advertising,
                  profiling, resale, or unauthorised commercial purposes.
                </li>
              </List>
            </Section>

            <Section
              id="intellectual-property"
              number="11"
              title="Intellectual property"
            >
              <Paragraph>
                Dreamscape One, Guru Kids Pro, Nova, Milo, platform designs,
                characters, graphics, software, questions, explanations,
                missions, simulations, audio, videos, branding, and related
                materials are owned by us or used with permission.
              </Paragraph>

              <Paragraph>
                We grant you a limited, personal, non-exclusive,
                non-transferable, revocable licence to use the platform during
                your authorised access period. This licence does not transfer
                ownership or permit commercial reproduction, public
                distribution, resale, sublicensing, or creation of derivative
                products.
              </Paragraph>

              <Paragraph>
                Educators may display and use assigned Dreamscape content with
                authorised students under an active Education Licence. They may
                not export or reproduce the full content bank for use outside
                the platform.
              </Paragraph>

              <Paragraph>
                If you send feedback or suggestions, you allow us to use them
                to improve Dreamscape without payment or obligation, provided
                we do not publicly identify you without permission.
              </Paragraph>
            </Section>

            <Section
              id="availability"
              number="12"
              title="Availability and changes"
            >
              <Paragraph>
                We aim to keep Dreamscape available but do not guarantee
                uninterrupted, permanent, or error-free access. Maintenance,
                security work, internet failures, device limitations,
                third-party outages, updates, and events beyond reasonable
                control may affect availability.
              </Paragraph>

              <Paragraph>
                We may add, remove, redesign, rebalance, test, or discontinue
                features, content, reward systems, simulations, access rules,
                and supported devices. Where a material change substantially
                affects paid access, we will take reasonable steps such as
                notice, replacement access, account credit, or another
                appropriate remedy.
              </Paragraph>

              <Paragraph>
                Beta, pilot, preview, and coming-soon features may change
                significantly, contain errors, or never proceed to full launch.
              </Paragraph>
            </Section>

            <Section
              id="third-parties"
              number="13"
              title="Third-party services"
            >
              <Paragraph>
                Dreamscape may connect to services operated by other providers,
                including authentication, hosting, email, analytics, payment,
                ecommerce, messaging, and external websites.
              </Paragraph>

              <Paragraph>
                Those services are governed by their own terms and privacy
                practices. We are not responsible for third-party content,
                policies, security, availability, or actions that are outside
                our reasonable control.
              </Paragraph>

              <Paragraph>
                Links to another website do not mean that Dreamscape endorses
                every statement, product, or service on that website.
              </Paragraph>
            </Section>

            <Section
              id="liability"
              number="14"
              title="Disclaimers and liability"
            >
              <Paragraph>
                To the fullest extent permitted by law, Dreamscape is provided
                on an “as available” basis. We do not guarantee specific
                grades, examination results, learning speed, financial
                knowledge, business performance, investment outcomes, or other
                results.
              </Paragraph>

              <Paragraph>
                Milo’s simulations, virtual investments, market information,
                and business activities are educational simulations only. They
                do not involve real securities, real ownership, real profit,
                or personalised financial, legal, tax, or investment advice.
              </Paragraph>

              <Paragraph>
                Nothing in these Terms excludes liability that cannot lawfully
                be excluded, including rights and remedies that apply under
                mandatory consumer law.
              </Paragraph>

              <Paragraph>
                Subject to the previous paragraph, we are not liable for
                indirect, incidental, special, or consequential loss, loss of
                opportunity, loss of data, loss of virtual items, or loss
                caused by unauthorised use, third-party services, or events
                beyond our reasonable control.
              </Paragraph>

              <Paragraph>
                Where liability may lawfully be limited, our total liability
                arising from a paid service will not exceed the amount actually
                paid to us for the affected service during the 12 months before
                the event giving rise to the claim.
              </Paragraph>
            </Section>

            <Section
              id="termination"
              number="15"
              title="Suspension and termination"
            >
              <Paragraph>
                You may stop using Dreamscape at any time. Closing an account
                does not automatically create a refund or cancel an external
                payment arrangement unless the applicable cancellation process
                is also completed.
              </Paragraph>

              <Paragraph>
                We may restrict, suspend, or terminate access where reasonably
                necessary to:
              </Paragraph>

              <List>
                <li>protect users, students, educators, or the platform;</li>
                <li>
                  investigate fraud, security issues, abuse, payment disputes,
                  or serious rule violations;
                </li>
                <li>comply with law or a valid authority request;</li>
                <li>enforce these Terms or programme-specific terms; or</li>
                <li>
                  manage an expired, cancelled, unpaid, or withdrawn licence.
                </li>
              </List>

              <Paragraph>
                Where appropriate, we may give notice and an opportunity to
                correct the issue. Immediate action may be taken for serious
                safety, security, legal, or fraudulent conduct.
              </Paragraph>
            </Section>

            <Section
              id="privacy"
              number="16"
              title="Privacy and communications"
            >
              <Paragraph>
                Our collection and use of personal data are described in the{" "}
                <Link
                  href="/privacy"
                  style={{ color: "#8ee8ff", textDecoration: "none" }}
                >
                  Privacy Policy
                </Link>
                . You should review it before creating or assigning an account.
              </Paragraph>

              <Paragraph>
                We may send service communications needed to operate an
                account, including login, security, purchase, progress,
                support, policy, and access messages.
              </Paragraph>

              <Paragraph>
                Promotional email will be sent only where permitted and may be
                unsubscribed from using the method provided. Service and legal
                notices may still be sent where necessary for an active
                account, transaction, licence, or programme.
              </Paragraph>
            </Section>

            <Section id="changes" number="17" title="Changes to these Terms">
              <Paragraph>
                We may update these Terms to reflect changes to Dreamscape,
                pricing structures, legal requirements, security practices, or
                business operations.
              </Paragraph>

              <Paragraph>
                The updated version will display a new effective or last
                updated date. Where a change materially affects current paid
                access or user rights, we will provide reasonable notice
                through the platform, email, or another appropriate method.
              </Paragraph>

              <Paragraph>
                Continued use after the updated Terms take effect means you
                accept the revised Terms. If you do not agree, you should stop
                using Dreamscape and cancel future renewal where applicable.
              </Paragraph>
            </Section>

            <Section
              id="law"
              number="18"
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
                consumer right or dispute process that cannot lawfully be
                excluded.
              </Paragraph>

              <Paragraph>
                If any provision of these Terms is found invalid or
                unenforceable, the remaining provisions will continue to
                operate to the fullest extent permitted by law.
              </Paragraph>
            </Section>

            <Section id="contact" number="19" title="Contact us">
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
                  Blk 4 Queen’s Road, #02-127, Singapore
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
                Effective {EFFECTIVE_DATE}
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
