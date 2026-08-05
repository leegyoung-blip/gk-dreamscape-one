"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Package = {
  name: string;
  students: number;
  teachers: number;
  annualPrice: number;
  description: string;
  accent: string;
};

type EmailCopySource = "hero" | "pilot" | "footer";

const packages: Package[] = [
  {
    name: "Starter",
    students: 5,
    teachers: 1,
    annualPrice: 899,
    description:
      "A focused starting point for an independent educator, small learning group, or pilot cohort.",
    accent: "#53d7ff",
  },
  {
    name: "Classroom",
    students: 10,
    teachers: 1,
    annualPrice: 1599,
    description:
      "Designed for one active class or a growing tuition-centre programme.",
    accent: "#8ee8ff",
  },
  {
    name: "Growth",
    students: 15,
    teachers: 1,
    annualPrice: 2199,
    description:
      "More student capacity for centres expanding Dreamscape across multiple groups.",
    accent: "#c58cff",
  },
  {
    name: "Centre",
    students: 20,
    teachers: 2,
    annualPrice: 2699,
    description:
      "The largest standard package for one approved education organisation.",
    accent: "#ffae5c",
  },
];

const includedItems = [
  "Core English Learning Missions",
  "Core Mathematics Learning Missions",
  "Science Learning Missions",
  "Student home access during the active term",
  "Teacher dashboard access for included teacher accounts",
  "Assignments, progress review, and learning visibility",
  "Platform updates and new eligible mission content",
  "Dreamscape Education Partner status while active",
];

const operationalTerms = [
  {
    title: "One organisation",
    text: "Each package is for one approved business or organisation and may not be shared across unrelated tutors, outlets, branches, companies, or entities without written approval.",
  },
  {
    title: "12-month term",
    text: "Annual licences are paid upfront and run for 12 months from the agreed activation date. Renewal is manual and there is no automatic renewal.",
  },
  {
    title: "Seat reassignment",
    text: "After the initial assignment, a student seat may normally be reassigned once every 30 days when a learner leaves. The previous learner loses organisation-funded access and progress is not transferred.",
  },
  {
    title: "Additional students",
    text: "Additional seats are prorated using the effective per-seat rate of the organisation’s current package for the remaining full months. Activation is normally within 1–2 business days after payment. More than 20 seats require a package upgrade or custom quote.",
  },
  {
    title: "Extra staff access",
    text: "Additional named Teacher/Admin accounts are SGD 149 per year. Staff accounts are personal and may not be shared.",
  },
  {
    title: "Upgrades",
    text: "Mid-term upgrades are based on the package-price difference for the remaining full months. No administration fee applies, and activation is normally within 1–2 business days after payment.",
  },
];

const faqItems = [
  {
    question: "Who can apply for an Education Licence?",
    answer:
      "Tuition centres, enrichment providers, independent educators, schools, and other approved education organisations may enquire. Applications are reviewed by Guru Kids Pro.",
  },
  {
    question: "Can the teacher create custom quizzes?",
    answer:
      "The standard Education Licence allows teachers to assign, review, and monitor eligible Dreamscape content. It does not include custom lesson or quiz creation.",
  },
  {
    question: "Can students use Dreamscape at home?",
    answer:
      "Yes. An active assigned student seat may be used from home during the organisation’s paid licence term.",
  },
  {
    question: "Who obtains parental consent?",
    answer:
      "The licensed organisation is responsible for obtaining any required parent or guardian consent before creating or assigning student accounts.",
  },
  {
    question: "Is there a grace period after expiry?",
    answer:
      "Renewal reminders may be sent before expiry. During days 1–14 after expiry, access may be restricted or read-only for renewal and account administration. Access may be suspended after the grace period.",
  },
  {
    question: "Are international organisations accepted?",
    answer:
      "International applications may be reviewed case by case. Pricing, payment methods, taxes, and support arrangements may differ.",
  },
];

const ADMIN_EMAIL = "admin@gurukidspro.com";

const whatsappHref =
  "https://wa.me/6583888949?text=Hello%20Guru%20Kids%20Pro%2C%20I%20would%20like%20to%20enquire%20about%20the%20Dreamscape%20Education%20Licence.";

const pilotWhatsappHref =
  "https://wa.me/6583888949?text=Hello%20Guru%20Kids%20Pro%2C%20I%20would%20like%20to%20enquire%20about%20the%2014-day%20Dreamscape%20education%20pilot.";

export default function EducationLicencePage() {
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [copiedEmailSource, setCopiedEmailSource] =
    useState<EmailCopySource | null>(null);
  const [showLicenceTerms, setShowLicenceTerms] = useState(false);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  async function copyAdminEmail(source: EmailCopySource) {
    function fallbackCopy() {
      const textArea = document.createElement("textarea");
      textArea.value = ADMIN_EMAIL;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(ADMIN_EMAIL);
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }

    setCopiedEmailSource(source);

    window.setTimeout(() => {
      setCopiedEmailSource((current) =>
        current === source ? null : current,
      );
    }, 2400);
  }

  const isMobile = viewportWidth <= 700;
  const isCompact = viewportWidth <= 1180;

  const navLinkStyle: CSSProperties = {
    color: "rgba(255,255,255,0.72)",
    textDecoration: "none",
    fontSize: "14px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 12%, rgba(83,215,255,0.14), transparent 28%), radial-gradient(circle at 88% 30%, rgba(197,140,255,0.14), transparent 30%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          minHeight: isMobile ? "72px" : "86px",
          padding: isMobile ? "0 14px" : isCompact ? "0 28px" : "0 6vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(2,8,19,0.9)",
          backdropFilter: "blur(18px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "13px",
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
              objectFit: "contain",
              borderRadius: "999px",
            }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: isMobile ? "10px" : isCompact ? "13px" : "16px",
                letterSpacing: isMobile
                  ? "0.12em"
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
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Education Licence
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
            </>
          )}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: isMobile ? "9px 11px" : "11px 18px",
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
            {isMobile ? "WHATSAPP" : "WHATSAPP 8388 8949"}
          </a>
        </nav>
      </header>

      <section
        style={{
          padding: isMobile ? "72px 18px 60px" : isCompact ? "88px 34px 70px" : "110px 6vw 82px",
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
          Dreamscape for Educators
        </p>

        <h1
          style={{
            margin: "22px auto 0",
            maxWidth: "1080px",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "clamp(38px, 11vw, 46px)" : "clamp(50px, 6.2vw, 76px)",
            fontWeight: 400,
            lineHeight: 1.04,
          }}
        >
          Bring Learning Missions into your education organisation.
        </h1>

        <p
          style={{
            margin: "28px auto 0",
            maxWidth: "900px",
            color: "rgba(255,255,255,0.7)",
            fontSize: isMobile ? "16px" : "clamp(18px, 1.9vw, 21px)",
            fontWeight: 300,
            lineHeight: 1.72,
          }}
        >
          Give students structured English, Mathematics, and Science practice
          while educators assign work, review progress, and support learning
          across class and home.
        </p>

        <div
          style={{
            marginTop: "36px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "13px",
          }}
        >
          <button
            type="button"
            onClick={() => copyAdminEmail("hero")}
            style={{
              width: isMobile ? "100%" : "auto",
              minHeight: "56px",
              padding: "14px 24px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              borderRadius: "999px",
              background:
                "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
              color: "#160729",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxSizing: "border-box",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {copiedEmailSource === "hero"
              ? "Email copied"
              : "Copy admin@gurukidspro.com"}
          </button>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: isMobile ? "100%" : "auto",
              minHeight: "56px",
              padding: "14px 24px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.26)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxSizing: "border-box",
            }}
          >
            WhatsApp 8388 8949
          </a>
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? "0 18px 80px" : isCompact ? "0 34px 94px" : "0 6vw 110px",
        }}
      >
        <div
          style={{
            maxWidth: "1480px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? "18px" : isCompact ? "20px" : "22px",
            alignItems: "stretch",
          }}
        >
          {packages.map((item) => (
            <article
              key={item.name}
              style={{
                minHeight: isMobile ? "420px" : "440px",
                display: "flex",
                flexDirection: "column",
                padding: isMobile ? "28px 23px" : isCompact ? "30px 25px" : "32px 27px",
                borderRadius: "28px",
                border: `1px solid ${item.accent}55`,
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02))",
                boxShadow: "0 25px 70px rgba(0,0,0,0.3)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: item.accent,
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Annual Education Licence
              </p>

              <h2
                style={{
                  margin: "15px 0 0",
                  fontSize: isMobile
                    ? "27px"
                    : isCompact
                      ? "29px"
                      : "31px",
                  fontWeight: 800,
                }}
              >
                {item.name}
              </h2>

              <p
                style={{
                  margin: "20px 0 0",
                  color: "rgba(255,255,255,0.58)",
                  fontSize: "13px",
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                Up to {item.students} students
              </p>

              <div
                style={{
                  marginTop: "21px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "7px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "16px",
                    paddingBottom: "7px",
                  }}
                >
                  SGD
                </span>
                <span
                  style={{
                    fontSize: isMobile
                      ? "clamp(40px, 12vw, 48px)"
                      : isCompact
                        ? "clamp(42px, 4.6vw, 48px)"
                        : "52px",
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {item.annualPrice.toLocaleString("en-SG")}
                </span>
              </div>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(255,255,255,0.52)",
                  fontSize: "13px",
                }}
              >
                per organisation, per year
              </p>

              <p
                style={{
                  margin: "23px 0 0",
                  color: "rgba(255,255,255,0.68)",
                  fontSize: "15px",
                  fontWeight: 300,
                  lineHeight: 1.65,
                  flex: 1,
                }}
              >
                {item.description}
              </p>

              <div
                style={{
                  marginTop: "23px",
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "11px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "14px",
                  }}
                >
                  ✓ {item.students} student seats
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "14px",
                  }}
                >
                  ✓ {item.teachers} Teacher/Admin {item.teachers === 1 ? "account" : "accounts"}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "14px",
                  }}
                >
                  ✓ 12-month access
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? "76px 18px" : isCompact ? "88px 34px" : "105px 6vw",
          background:
            "linear-gradient(180deg, rgba(8,22,40,0.78), rgba(2,8,19,0.98))",
          borderTop: "1px solid rgba(142,232,255,0.13)",
        }}
      >
        <div
          style={{
            maxWidth: "1360px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "0.9fr 1.1fr",
            gap: isMobile ? "34px" : isCompact ? "44px" : "70px",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffae5c",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Try Before Annual Access
            </p>

            <h2
              style={{
                margin: "18px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "36px" : "clamp(42px, 5vw, 58px)",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              14-day education pilot.
            </h2>

            <p
              style={{
                margin: "23px 0 0",
                color: "rgba(255,255,255,0.7)",
                fontSize: "18px",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              Pilot Dreamscape with up to five students and one Teacher/Admin
              account for SGD 49.90.
            </p>

            <p
              style={{
                margin: "17px 0 0",
                color: "#8ee8ff",
                fontSize: "15px",
                fontWeight: 800,
                lineHeight: 1.6,
              }}
            >
              The pilot fee is credited in full when an eligible annual package is
              purchased during the pilot or within 30 days after it ends.
            </p>

            <div
              style={{
                marginTop: "29px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => copyAdminEmail("pilot")}
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "54px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 23px",
                  border: "none",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                  color: "#160729",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copiedEmailSource === "pilot"
                  ? "Email copied"
                  : "Copy email for pilot enquiry"}
              </button>

              <a
                href={pilotWhatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "54px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 23px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.24)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "13px",
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

          <div
            style={{
              padding: isMobile ? "28px 22px" : isCompact ? "32px 28px" : "38px 34px",
              borderRadius: "30px",
              border: "1px solid rgba(142,232,255,0.22)",
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.022))",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "16px",
            }}
          >
            {includedItems.map((item) => (
              <div
                key={item}
                style={{
                  minHeight: "82px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "17px",
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: "#8ee8ff",
                    fontWeight: 900,
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.72)",
                    fontSize: "14px",
                    lineHeight: 1.55,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? "78px 18px" : isCompact ? "92px 34px" : "110px 6vw",
        }}
      >
        <div style={{ maxWidth: "1350px", margin: "0 auto" }}>
          <p
            style={{
              margin: 0,
              textAlign: "center",
              color: "#8ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            How the Licence Works
          </p>

          <h2
            style={{
              margin: "18px auto 0",
              maxWidth: "900px",
              textAlign: "center",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "36px" : "clamp(42px, 4.8vw, 56px)",
              fontWeight: 400,
            }}
          >
            Clear rules for seats, teachers, and upgrades.
          </h2>

          <div
            style={{
              marginTop: "44px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
              gap: "18px",
            }}
          >
            {operationalTerms.map((item) => (
              <article
                key={item.title}
                style={{
                  minHeight: "220px",
                  padding: "27px 25px",
                  borderRadius: "22px",
                  border: "1px solid rgba(142,232,255,0.17)",
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "21px",
                    fontWeight: 800,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    margin: "15px 0 0",
                    color: "rgba(255,255,255,0.67)",
                    fontSize: "15px",
                    fontWeight: 300,
                    lineHeight: 1.68,
                  }}
                >
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? "76px 18px" : isCompact ? "88px 34px" : "105px 6vw",
          background:
            "linear-gradient(180deg, rgba(9,20,37,0.78), rgba(2,8,19,0.98))",
          borderTop: "1px solid rgba(142,232,255,0.12)",
        }}
      >
        <div
          style={{
            maxWidth: "1050px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Questions
          </p>

          <h2
            style={{
              margin: "18px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "35px" : "clamp(41px, 4.6vw, 54px)",
              fontWeight: 400,
            }}
          >
            Before your organisation joins.
          </h2>

          <div
            style={{
              marginTop: "38px",
              display: "flex",
              flexDirection: "column",
              gap: "13px",
              textAlign: "left",
            }}
          >
            {faqItems.map((item) => (
              <details
                key={item.question}
                style={{
                  borderRadius: "18px",
                  border: "1px solid rgba(142,232,255,0.18)",
                  background: "rgba(255,255,255,0.035)",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "21px 23px",
                    cursor: "pointer",
                    color: "white",
                    fontSize: "17px",
                    fontWeight: 800,
                  }}
                >
                  {item.question}
                </summary>
                <p
                  style={{
                    margin: 0,
                    padding: "0 23px 23px",
                    color: "rgba(255,255,255,0.68)",
                    fontSize: "15px",
                    lineHeight: 1.7,
                  }}
                >
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          <div
            style={{
              marginTop: "38px",
              padding: isMobile ? "30px 23px" : "38px 34px",
              borderRadius: "28px",
              border: "1px solid rgba(197,140,255,0.23)",
              background:
                "radial-gradient(circle at 50% 0%, rgba(197,140,255,0.13), transparent 40%), rgba(255,255,255,0.035)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: isMobile ? "25px" : "clamp(28px, 3vw, 33px)",
              }}
            >
              Ready to discuss your organisation?
            </h3>
            <p
              style={{
                margin: "16px auto 0",
                maxWidth: "720px",
                color: "rgba(255,255,255,0.68)",
                fontSize: "16px",
                lineHeight: 1.65,
              }}
            >
              Tell us your organisation name, expected student seats, and
              preferred package. We will reply with the next onboarding steps.
            </p>
            <div
              style={{
                marginTop: "25px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => copyAdminEmail("footer")}
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "54px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 23px",
                  border: "none",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                  color: "#160729",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copiedEmailSource === "footer"
                  ? "Email copied"
                  : "Copy admin@gurukidspro.com"}
              </button>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "54px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 23px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.24)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxSizing: "border-box",
                }}
              >
                WhatsApp 8388 8949
              </a>

              <button
                type="button"
                onClick={() => setShowLicenceTerms(true)}
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "54px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 23px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,174,92,0.3)",
                  background: "rgba(255,174,92,0.08)",
                  color: "#ffcb92",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                View Licence T&Cs
              </button>
            </div>

            <p
              style={{
                margin: "18px 0 0",
                color: "rgba(255,255,255,0.56)",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              Email: admin@gurukidspro.com · WhatsApp: 8388 8949
            </p>
          </div>

          <p
            style={{
              margin: "30px auto 0",
              maxWidth: "820px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            Prices are in Singapore dollars and exclude GST where applicable.
            Standard organisation setup is included at no additional charge.
            Packages above 20 student seats require a custom quote. Final
            access remains subject to approval and the applicable Education
            Licence Terms.
          </p>

          <div
            style={{
              marginTop: "22px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => setShowLicenceTerms(true)}
              style={{
                ...navLinkStyle,
                border: "none",
                padding: 0,
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Education Licence Terms
            </button>
            <Link href="/privacy" style={navLinkStyle}>
              Privacy Policy
            </Link>
            <Link href="/pricing" style={navLinkStyle}>
              Student Access Plans
            </Link>
          </div>
        </div>
      </section>

      {showLicenceTerms && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="education-licence-terms-title"
          onClick={() => setShowLicenceTerms(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "14px" : "28px",
            background: "rgba(1,4,11,0.8)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(820px, 100%)",
              maxHeight: "calc(100dvh - 28px)",
              overflowY: "auto",
              padding: isMobile ? "32px 22px 26px" : "42px 40px 34px",
              borderRadius: isMobile ? "24px" : "30px",
              border: "1px solid rgba(142,232,255,0.3)",
              background:
                "radial-gradient(circle at 8% 0%, rgba(83,215,255,0.14), transparent 32%), radial-gradient(circle at 100% 100%, rgba(197,140,255,0.13), transparent 34%), #071326",
              boxShadow:
                "0 34px 100px rgba(0,0,0,0.6), 0 0 38px rgba(83,215,255,0.1)",
              color: "white",
            }}
          >
            <button
              type="button"
              aria-label="Close Education Licence terms"
              onClick={() => setShowLicenceTerms(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "38px",
                height: "38px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontSize: "22px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

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
              Dreamscape One
            </p>

            <h2
              id="education-licence-terms-title"
              style={{
                margin: "15px 42px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "34px" : "44px",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              Education Licence Terms & Conditions
            </h2>

            <p
              style={{
                margin: "20px 0 0",
                color: "rgba(255,255,255,0.68)",
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: 1.7,
              }}
            >
              These summary terms apply together with the accepted quotation,
              onboarding details, Dreamscape One Terms & Conditions, and
              Privacy Policy. The final written offer will govern the approved
              organisation’s licence.
            </p>

            <ol
              style={{
                margin: "26px 0 0",
                paddingLeft: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                color: "rgba(255,255,255,0.74)",
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: 1.72,
              }}
            >
              <li>
                Education Licences are available only to organisations and
                educators approved by Guru Kids Pro.
              </li>
              <li>
                Each package is for one approved organisation. Access may not
                be shared across unrelated companies, organisations, or
                branches without written approval.
              </li>
              <li>
                Standard licences are prepaid for 12 months from the agreed
                activation date. Renewal is manual unless otherwise agreed in
                writing.
              </li>
              <li>
                The package includes only the stated number of student seats
                and Teacher/Admin accounts. Additional Teacher/Admin accounts
                are SGD 149 per year.
              </li>
              <li>
                Each Teacher/Admin account must be assigned to a named staff
                member and may not be shared. Non-urgent support enquiries are
                normally answered within 1–2 business days.
              </li>
              <li>
                Additional student seats are prorated using the effective
                per-seat rate of the organisation’s current package for the
                remaining full months. They normally activate within 1–2
                business days after payment. More than 20 seats require a
                package upgrade or custom quote.
              </li>
              <li>
                Mid-term upgrades are calculated using the package-price
                difference for the remaining full months. No administration
                fee applies. Upgrades normally activate within 1–2 business
                days after payment.
              </li>
              <li>
                After initial assignment, a student seat may normally be
                reassigned once every 30 days when a learner leaves, subject
                to reasonable-use controls. The previous learner loses
                organisation-funded access, and progress is not transferred.
              </li>
              <li>
                Unused seats do not roll over and are not refundable or
                exchangeable for credit, except where required by law or
                expressly agreed in writing.
              </li>
              <li>
                The licensed organisation is responsible for obtaining any
                required parent or guardian consent and for assigning accounts
                only to authorised students and staff.
              </li>
              <li>
                Teacher/Admin users may assign eligible work, review answers,
                and monitor progress. The standard licence does not include
                custom quiz or lesson creation.
              </li>
              <li>
                Students may use their assigned access at home during the
                active licence term. Accounts and login details must not be
                shared outside the approved users.
              </li>
              <li>
                The 14-day pilot includes up to five students and one named
                Teacher/Admin account for SGD 49.90. The pilot fee is credited
                in full when an eligible annual package is purchased during
                the pilot or within 30 days after it ends. Otherwise, the pilot
                fee is non-refundable.
              </li>
              <li>
                Standard organisation setup is included at no additional
                charge. Onboarding is normally completed within one week after
                full payment and receipt of the required account details.
              </li>
              <li>
                Renewal reminders may be sent before expiry. During days
                1–14 after expiry, access may be restricted or read-only for
                renewal and account administration. Access may be suspended
                after the grace period.
              </li>
              <li>
                Dreamscape content, software, questions, dashboards, and
                branding may not be copied, resold, exported in bulk, or used
                to create a competing product or question bank.
              </li>
              <li>
                Guru Kids Pro may suspend or terminate access for non-payment,
                unauthorised sharing, misuse, security concerns, or material
                breach of the applicable terms.
              </li>
            </ol>

            <div
              style={{
                marginTop: "27px",
                padding: "18px",
                borderRadius: "18px",
                border: "1px solid rgba(142,232,255,0.18)",
                background: "rgba(255,255,255,0.035)",
                color: "rgba(255,255,255,0.65)",
                fontSize: "13px",
                lineHeight: 1.65,
              }}
            >
              Contact Guru Kids Pro at admin@gurukidspro.com or WhatsApp
              8388 8949 before accepting a licence if any term is unclear.
            </div>

            <div
              style={{
                marginTop: "23px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                gap: "11px",
              }}
            >
              <button
                type="button"
                onClick={() => setShowLicenceTerms(false)}
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "52px",
                  padding: "13px 22px",
                  border: "none",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                  color: "#160729",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Close
              </button>

              <Link
                href="/terms"
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "52px",
                  padding: "13px 22px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.22)",
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
                General Terms
              </Link>

              <Link
                href="/privacy"
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "52px",
                  padding: "13px 22px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.22)",
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
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
