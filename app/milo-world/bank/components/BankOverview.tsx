"use client";

import type { BankAccountSnapshot, BankScreenMode } from "../lib/bank-types";

function formatDt(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

export default function BankOverview({
  account,
  loading,
  screenMode,
}: {
  account: BankAccountSnapshot;
  loading: boolean;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const metrics = [
    { label: "Available", value: account.available, icon: "✦" },
    { label: "Savings", value: account.savings, icon: "◎" },
    { label: "Bonds", value: account.bonds, icon: "◆" },
    { label: "Interest Earned", value: account.interestEarned, icon: "+" },
  ];

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: isMobile ? "24px" : "32px",
        border: "1px solid rgba(126,232,255,0.2)",
        background:
          "linear-gradient(135deg, rgba(8,37,64,0.92), rgba(12,15,40,0.94) 54%, rgba(29,20,63,0.92))",
        boxShadow:
          "0 34px 90px rgba(0,0,0,0.34), inset 0 0 80px rgba(83,215,255,0.035)",
        padding: isMobile ? "22px" : "30px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 10% 0%, rgba(126,232,255,0.16), transparent 30%), radial-gradient(circle at 90% 0%, rgba(164,112,255,0.14), transparent 30%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.19em",
                textTransform: "uppercase",
              }}
            >
              Total Bank Value
            </p>

            <strong
              style={{
                display: "block",
                marginTop: "9px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "42px" : "58px",
                lineHeight: 0.98,
                fontWeight: 500,
                letterSpacing: "-0.045em",
              }}
            >
              {loading ? "—" : formatDt(account.total)}
            </strong>
          </div>

          <div
            style={{
              minHeight: "36px",
              padding: "0 13px",
              borderRadius: "999px",
              border: "1px solid rgba(159,255,210,0.18)",
              background: "rgba(93,255,181,0.06)",
              color: "#9fffd2",
              display: "inline-flex",
              alignItems: "center",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Save · Plan · Grow
          </div>
        </div>

        <div
          style={{
            marginTop: isMobile ? "22px" : "28px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, minmax(0, 1fr))",
            gap: "10px",
          }}
        >
          {metrics.map((metric) => (
            <div
              key={metric.label}
              style={{
                minHeight: isMobile ? "92px" : "104px",
                borderRadius: "18px",
                border: "1px solid rgba(126,232,255,0.12)",
                background: "rgba(255,255,255,0.045)",
                padding: isMobile ? "14px" : "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.58)",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {metric.label}
                </span>
                <span style={{ color: "#8ee8ff", fontSize: "14px" }}>{metric.icon}</span>
              </div>

              <strong
                style={{
                  fontSize: isMobile ? "18px" : "21px",
                  lineHeight: 1,
                  letterSpacing: "-0.025em",
                }}
              >
                {loading ? "—" : formatDt(metric.value)}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
