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

const packages: Package[] = [
  {
    name: "Starter",
    students: 5,
    teachers: 1,
    annualPrice: 799,
    description:
      "A focused starting point for an independent educator, small learning group, or pilot cohort.",
    accent: "#53d7ff",
  },
  {
    name: "Classroom",
    students: 10,
    teachers: 1,
    annualPrice: 1399,
    description:
      "Designed for one active class or a growing tuition-centre programme.",
    accent: "#8ee8ff",
  },
  {
    name: "Growth",
    students: 15,
    teachers: 1,
    annualPrice: 1999,
    description:
      "More student capacity for centres expanding Dreamscape across multiple groups.",
    accent: "#c58cff",
  },
  {
    name: "Centre",
    students: 20,
    teachers: 1,
    annualPrice: 2499,
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
    text: "Each package is for one approved business or organisation and may not be shared across unrelated branches or entities.",
  },
  {
    title: "12-month term",
    text: "Annual licences are paid in advance and run for 12 months from the agreed activation date. Renewal is manual.",
  },
  {
    title: "Seat changes",
    text: "Student seats may be reassigned up to two times per school term when a learner leaves. Existing progress is not transferred.",
  },
  {
    title: "Additional students",
    text: "Additional students are charged at SGD 19.90 for each full remaining month and activate on the next monthly anniversary. Standard packages support up to 20 students.",
  },
  {
    title: "Extra teacher access",
    text: "Additional Teacher/Admin accounts are SGD 149 per year.",
  },
  {
    title: "Upgrades",
    text: "Mid-term upgrades are calculated using the annual package difference divided by 12, multiplied by full remaining months, plus a SGD 49 administration fee.",
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
      "A 14-day expiry grace period may be provided for renewal and account administration. Continued full access is not guaranteed after the paid term ends.",
  },
  {
    question: "Are international organisations accepted?",
    answer:
      "International applications may be reviewed case by case. Pricing, payment methods, taxes, and support arrangements may differ.",
  },
];

const enquiryHref =
  "mailto:admin@gurukidspro.com?subject=Dreamscape%20Education%20Licence%20Enquiry&body=Organisation%20name%3A%0AContact%20person%3A%0AEstimated%20student%20seats%3A%0APackage%20of%20interest%3A";

const pilotHref =
  "mailto:admin@gurukidspro.com?subject=Dreamscape%2014-Day%20Education%20Pilot&body=Organisation%20name%3A%0AContact%20person%3A%0AProposed%20pilot%20start%20date%3A";

export default function EducationLicencePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
          padding: isMobile ? "0 18px" : "0 6vw",
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
              width: isMobile ? "40px" : "50px",
              height: isMobile ? "40px" : "50px",
              objectFit: "contain",
              borderRadius: "999px",
            }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: isMobile ? "12px" : "16px",
                letterSpacing: isMobile ? "0.16em" : "0.3em",
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
            gap: isMobile ? "10px" : "22px",
          }}
        >
          {!isMobile && (
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
            href={enquiryHref}
            style={{
              padding: isMobile ? "10px 13px" : "11px 18px",
              borderRadius: "999px",
              color: "#170827",
              background:
                "linear-gradient(90deg, #8ee8ff, #c58cff 62%, #ffae5c)",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            ENQUIRE
          </a>
        </nav>
      </header>

      <section
        style={{
          padding: isMobile ? "78px 20px 66px" : "110px 6vw 82px",
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
            fontSize: isMobile ? "46px" : "76px",
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
            fontSize: isMobile ? "17px" : "21px",
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
          <a
            href={enquiryHref}
            style={{
              width: isMobile ? "100%" : "auto",
              minHeight: "56px",
              padding: "14px 24px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "999px",
              textDecoration: "none",
              background:
                "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
              color: "#160729",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxSizing: "border-box",
            }}
          >
            Request an Education Licence
          </a>

          <a
            href={pilotHref}
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
            Start a 14-Day Pilot
          </a>
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? "0 20px 88px" : "0 6vw 110px",
        }}
      >
        <div
          style={{
            maxWidth: "1480px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? "20px" : "22px",
            alignItems: "stretch",
          }}
        >
          {packages.map((item) => (
            <article
              key={item.name}
              style={{
                minHeight: "470px",
                display: "flex",
                flexDirection: "column",
                padding: "32px 27px",
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
                  fontSize: "31px",
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
                    fontSize: isMobile ? "48px" : "52px",
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
                  ✓ {item.teachers} Teacher/Admin account
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

              <a
                href={`${enquiryHref}%0APackage%20selected%3A%20${encodeURIComponent(
                  item.name,
                )}`}
                style={{
                  marginTop: "26px",
                  minHeight: "52px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.94)",
                  color: "#19092e",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Enquire about {item.name}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? "80px 20px" : "105px 6vw",
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
            gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr",
            gap: isMobile ? "38px" : "70px",
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
                fontSize: isMobile ? "40px" : "58px",
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
              The pilot fee is credited when an annual package is purchased
              within seven days after the pilot ends.
            </p>

            <a
              href={pilotHref}
              style={{
                marginTop: "29px",
                minHeight: "54px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 23px",
                borderRadius: "999px",
                textDecoration: "none",
                background:
                  "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                color: "#160729",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Request a Pilot
            </a>
          </div>

          <div
            style={{
              padding: isMobile ? "30px 24px" : "38px 34px",
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
          padding: isMobile ? "84px 20px" : "110px 6vw",
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
              fontSize: isMobile ? "40px" : "56px",
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
          padding: isMobile ? "82px 20px" : "105px 6vw",
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
              fontSize: isMobile ? "39px" : "54px",
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
                fontSize: isMobile ? "27px" : "33px",
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
            <a
              href={enquiryHref}
              style={{
                marginTop: "25px",
                minHeight: "54px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 23px",
                borderRadius: "999px",
                textDecoration: "none",
                background:
                  "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                color: "#160729",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Email Guru Kids Pro
            </a>
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
            Prices are in Singapore dollars. The usual SGD 15 setup fee per
            account is currently waived. Unused seats do not roll over beyond
            the active term. Final access remains subject to approval and the
            applicable Education Licence Terms.
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
            <Link href="/terms" style={navLinkStyle}>
              Terms & Conditions
            </Link>
            <Link href="/privacy" style={navLinkStyle}>
              Privacy Policy
            </Link>
            <Link href="/pricing" style={navLinkStyle}>
              Student Access Plans
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
