"use client";

import Link from "next/link";
import { useState } from "react";

const STUDENT_CHECKOUT_URL =
  "https://gurukidspro.com/products/dreamscape-one-student-access";

const STUDENT_COVER_IMAGE = "/nova/membership/student-access-cover.png";

export default function NovaMembershipPortalPage() {
  const [studentHovered, setStudentHovered] = useState(false);
  const [showActivationForm, setShowActivationForm] = useState(false);
  const [activationName, setActivationName] = useState("");
  const [activationEmail, setActivationEmail] = useState("");
  const [activationStatus, setActivationStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [activationError, setActivationError] = useState("");

  function openStudentShopifyPage() {
    window.open(STUDENT_CHECKOUT_URL, "_blank", "noopener,noreferrer");
  }

  function openGkpActivationForm() {
    setShowActivationForm(true);
    setActivationStatus("idle");
    setActivationError("");
  }

  async function submitGkpActivationForm(event: React.FormEvent) {
    event.preventDefault();

    setActivationStatus("submitting");
    setActivationError("");

    try {
      const response = await fetch("/api/gkp-student-activation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: activationName,
          email: activationEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not submit request.");
      }

      setActivationStatus("success");
      setActivationName("");
      setActivationEmail("");
    } catch (error) {
      setActivationStatus("error");
      setActivationError(
        error instanceof Error
          ? error.message
          : "Could not submit activation request."
      );
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top, rgba(53,197,255,0.22), transparent 34%), linear-gradient(180deg, #041124 0%, #020813 100%)",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "28px 20px 72px",
      }}
    >
      <div
        style={{
          width: "min(1180px, 100%)",
          margin: "0 auto",
        }}
      >
        <Link
          href="/inventor"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            height: "44px",
            padding: "0 18px",
            borderRadius: "999px",
            border: "1px solid rgba(126,232,255,0.28)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            textDecoration: "none",
            fontSize: "14px",
            boxShadow: "0 16px 36px rgba(0,0,0,0.24)",
          }}
        >
          ← Back to Nova’s World
        </Link>

        <section
          style={{
            marginTop: "54px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7ee8ff",
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Dreamscape One
          </p>

          <h1
            style={{
              margin: "14px 0 0",
              fontSize: "clamp(42px, 8vw, 78px)",
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-0.055em",
              textShadow: "0 0 34px rgba(126,232,255,0.16)",
            }}
          >
            Student Access
          </h1>

          <p
            style={{
              margin: "20px auto 0",
              maxWidth: "760px",
              color: "rgba(255,255,255,0.78)",
              fontSize: "clamp(17px, 2.4vw, 21px)",
              lineHeight: 1.55,
            }}
          >
            Choose your student access path for Dreamscape One.
          </p>
        </section>

        <section
          style={{
            marginTop: "52px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "26px",
            alignItems: "stretch",
          }}
        >
          <article
            style={{
              minHeight: "540px",
              borderRadius: "34px",
              border: "1px solid rgba(255,188,120,0.42)",
              background:
                "linear-gradient(180deg, rgba(112,57,18,0.92), rgba(55,24,4,0.98))",
              padding: "34px",
              boxShadow:
                "0 0 34px rgba(255,160,83,0.16), 0 26px 74px rgba(0,0,0,0.36)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at top left, rgba(255,204,140,0.13), transparent 42%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: "#ffd18a",
                  fontSize: "13px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                For active GKP students
              </p>

              <h2
                style={{
                  margin: "24px 0 0",
                  fontSize: "clamp(34px, 5vw, 52px)",
                  lineHeight: 1.02,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                }}
              >
                Guru Kids Pro Student Access
              </h2>

              <p
                style={{
                  margin: "28px 0 0",
                  fontSize: "clamp(58px, 7vw, 86px)",
                  lineHeight: 0.95,
                  fontWeight: 800,
                  color: "#ffd18a",
                  textShadow: "0 0 24px rgba(255,209,138,0.18)",
                }}
              >
                Included
              </p>

              <p
                style={{
                  margin: "24px 0 0",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: "16px",
                  lineHeight: 1.6,
                }}
              >
                Student Access is included for active Guru Kids Pro students.
                Activate it using the email linked to your Dreamscape account.
              </p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "32px 0 0",
                  display: "grid",
                  gap: "16px",
                }}
              >
                {[
                  "Included for active GKP students",
                  "Manual verification by admin",
                  "Access after approval",
                  "Usually verified within 1–3 working days",
                ].map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr",
                      gap: "12px",
                      alignItems: "start",
                      color: "rgba(255,255,255,0.84)",
                      fontSize: "15px",
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,209,138,0.65)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffd18a",
                        fontSize: "13px",
                        fontWeight: 900,
                        background: "rgba(255,209,138,0.1)",
                      }}
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={openGkpActivationForm}
              style={{
                position: "relative",
                zIndex: 1,
                marginTop: "48px",
                width: "100%",
                height: "56px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.32)",
                background: "linear-gradient(135deg, #ffb347, #ff7a2f)",
                color: "white",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 24px rgba(255,153,83,0.22)",
              }}
            >
              Activate GKP Student Access
            </button>
          </article>

          <article
            onMouseEnter={() => setStudentHovered(true)}
            onMouseLeave={() => setStudentHovered(false)}
            onTouchStart={() => setStudentHovered((current) => !current)}
            onClick={openStudentShopifyPage}
            style={{
              position: "relative",
              minHeight: "540px",
              borderRadius: "34px",
              overflow: "hidden",
              border: "1px solid rgba(126,232,255,0.42)",
              background:
                "linear-gradient(180deg, rgba(22,89,145,0.96), rgba(6,32,80,0.98))",
              boxShadow:
                "0 0 38px rgba(83,215,255,0.22), 0 26px 74px rgba(0,0,0,0.42)",
              cursor: "pointer",
            }}
          >
            <img
              src={STUDENT_COVER_IMAGE}
              alt="General Student Access"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "30% center",
                display: "block",
                transform: studentHovered ? "scale(1.035)" : "scale(1)",
                transition: "transform 320ms ease",
              }}
              draggable={false}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: studentHovered
                  ? "linear-gradient(180deg, rgba(2,8,19,0.24), rgba(2,8,19,0.84))"
                  : "linear-gradient(180deg, rgba(2,8,19,0.02), rgba(2,8,19,0.2))",
                transition: "background 260ms ease",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "22px",
                left: "22px",
                right: "22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  minHeight: "34px",
                  padding: "0 16px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.42)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 900,
                  background: "rgba(53,197,255,0.82)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                ✦ General Student Access
              </div>

              <div
                style={{
                  minHeight: "34px",
                  padding: "0 16px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.38)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 900,
                  background: "rgba(0,0,0,0.34)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                $1 first month
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: "24px",
                right: "24px",
                bottom: "24px",
                zIndex: 2,
                transform: studentHovered ? "translateY(0)" : "translateY(18px)",
                opacity: studentHovered ? 1 : 0,
                transition: "opacity 240ms ease, transform 240ms ease",
              }}
            >
              <div
                style={{
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(4,16,38,0.78)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  padding: "24px",
                  color: "white",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#7ee8ff",
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  General Student Access Includes
                </p>

                <h3
                  style={{
                    margin: "10px 0 0",
                    fontSize: "clamp(28px, 4vw, 38px)",
                    lineHeight: 1.05,
                    fontWeight: 900,
                    letterSpacing: "-0.045em",
                  }}
                >
                  Full missions, rewards, and learning upgrades.
                </h3>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "18px 0 0",
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  {[
                    "All Learning Missions",
                    "Regularly updated activities",
                    "Dreamscape Token rewards",
                    "Unlock and purchase future items",
                  ].map((feature) => (
                    <li
                      key={feature}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "22px 1fr",
                        gap: "10px",
                        alignItems: "start",
                        color: "rgba(255,255,255,0.86)",
                        fontSize: "14px",
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: "#7ee8ff", fontWeight: 900 }}>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div
                  style={{
                    marginTop: "20px",
                    height: "52px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.32)",
                    background: "linear-gradient(135deg, #35c5ff, #4c6dff)",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 14px 28px rgba(83,215,255,0.2)",
                  }}
                >
                  Start General Student Access ›
                </div>
              </div>
            </div>

            {!studentHovered && (
              <div
                style={{
                  position: "absolute",
                  left: "24px",
                  right: "24px",
                  bottom: "24px",
                  zIndex: 2,
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(126,232,255,0.24)",
                  padding: "16px 18px",
                  color: "#061632",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#256d91",
                    fontSize: "12px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  General Student Access
                </p>

                <h3
                  style={{
                    margin: "6px 0 0",
                    fontSize: "24px",
                    lineHeight: 1.08,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                  }}
                >
                  $1 first month
                </h3>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "rgba(6,22,50,0.62)",
                    fontSize: "13px",
                    lineHeight: 1.45,
                  }}
                >
                  Then $19.90/month. Use code DREAM1 at checkout.
                </p>
              </div>
            )}
          </article>
        </section>

        <section
          style={{
            marginTop: "22px",
            borderRadius: "22px",
            border: "1px solid rgba(126,232,255,0.16)",
            background: "rgba(255,255,255,0.04)",
            padding: "18px 20px",
            color: "rgba(255,255,255,0.68)",
            fontSize: "14px",
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: "white" }}>Note:</strong> Active Guru Kids Pro
          students can activate included access for verification. General Student
          Access users can apply code{" "}
          <strong style={{ color: "#7ee8ff" }}>DREAM1</strong> at checkout to
          receive the first month at $1.
        </section>
      </div>

      {showActivationForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(2,8,19,0.72)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              borderRadius: "28px",
              border: "1px solid rgba(255,186,120,0.42)",
              background:
                "linear-gradient(180deg, rgba(94,48,14,0.98), rgba(64,26,4,0.98))",
              boxShadow:
                "0 0 42px rgba(255,170,83,0.2), 0 28px 80px rgba(0,0,0,0.5)",
              padding: "30px",
              color: "white",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setShowActivationForm(false)}
              style={{
                position: "absolute",
                top: "18px",
                right: "18px",
                width: "38px",
                height: "38px",
                borderRadius: "999px",
                border: "1px solid rgba(255,214,168,0.35)",
                background: "rgba(255,255,255,0.08)",
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
                color: "#ffd18a",
                fontSize: "13px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Guru Kids Pro Students
            </p>

            <h2
              style={{
                margin: "14px 0 0",
                fontSize: "32px",
                lineHeight: 1.15,
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              Activate Student Access
            </h2>

            {activationStatus === "success" ? (
              <div
                style={{
                  marginTop: "24px",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,214,168,0.28)",
                  background: "rgba(255,209,138,0.12)",
                  padding: "18px",
                  color: "#fff3df",
                  lineHeight: 1.6,
                }}
              >
                <strong>Request submitted.</strong>
                <br />
                We’ll verify your Guru Kids Pro student status within 1–3
                working days.
              </div>
            ) : (
              <form
                onSubmit={submitGkpActivationForm}
                style={{ marginTop: "24px" }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                    marginBottom: "8px",
                  }}
                >
                  Full Name
                </label>

                <input
                  value={activationName}
                  onChange={(event) => setActivationName(event.target.value)}
                  required
                  placeholder="Enter student's full name"
                  style={{
                    width: "100%",
                    height: "52px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,214,168,0.24)",
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    padding: "0 16px",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />

                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                    marginTop: "18px",
                    marginBottom: "8px",
                  }}
                >
                  Email linked to Dreamscape account
                </label>

                <input
                  value={activationEmail}
                  onChange={(event) => setActivationEmail(event.target.value)}
                  required
                  type="email"
                  placeholder="Enter account email"
                  style={{
                    width: "100%",
                    height: "52px",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,214,168,0.24)",
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                    padding: "0 16px",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />

                {activationStatus === "error" && (
                  <div
                    style={{
                      marginTop: "16px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,120,120,0.35)",
                      background: "rgba(255,90,90,0.12)",
                      color: "#ffd4d4",
                      padding: "12px 14px",
                      fontSize: "14px",
                    }}
                  >
                    {activationError}
                  </div>
                )}

                <p
                  style={{
                    margin: "18px 0 0",
                    color: "rgba(255,255,255,0.66)",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  Verification usually takes 1–3 working days.
                </p>

                <button
                  type="submit"
                  disabled={activationStatus === "submitting"}
                  style={{
                    marginTop: "24px",
                    width: "100%",
                    height: "56px",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.32)",
                    background:
                      activationStatus === "submitting"
                        ? "rgba(255,255,255,0.12)"
                        : "linear-gradient(135deg, #ffb347, #ff7a2f)",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor:
                      activationStatus === "submitting" ? "default" : "pointer",
                    boxShadow: "0 0 24px rgba(255,153,83,0.22)",
                  }}
                >
                  {activationStatus === "submitting"
                    ? "Submitting..."
                    : "Submit for Verification"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}