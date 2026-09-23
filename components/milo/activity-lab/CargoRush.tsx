"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

type CargoRushProps = {
  mobile: boolean;
  dense: boolean;
  width: number;
  height: number;
};

type CargoBay = {
  id: "food" | "tech" | "fashion" | "energy";
  title: string;
  code: string;
  hint: string;
  accent: string;
};

const CARGO_BAYS: CargoBay[] = [
  {
    id: "food",
    title: "Food",
    code: "FD-01",
    hint: "Fresh & pantry",
    accent: "#72f0b0",
  },
  {
    id: "tech",
    title: "Tech",
    code: "TC-02",
    hint: "Devices & gear",
    accent: "#78ddff",
  },
  {
    id: "fashion",
    title: "Fashion",
    code: "FS-03",
    hint: "Wearables",
    accent: "#d5a4ff",
  },
  {
    id: "energy",
    title: "Energy",
    code: "EN-04",
    hint: "Power cargo",
    accent: "#ffd56f",
  },
];

const PACKAGE_PREVIEWS = [
  { label: "Apples", category: "FOOD", lane: 0 },
  { label: "Laptop", category: "TECH", lane: 1 },
  { label: "Jacket", category: "FASHION", lane: 2 },
];

export default function CargoRush({
  mobile,
  dense,
  width,
  height,
}: CargoRushProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPreviewNotice, setShowPreviewNotice] = useState(false);

  const veryCompact = width < 980 || height < 720;
  const bayColumns = mobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))";

  const glassPanel: CSSProperties = {
    border: "1px solid rgba(133,226,255,0.16)",
    background:
      "linear-gradient(145deg, rgba(9,26,47,0.82), rgba(4,12,28,0.9))",
    boxShadow:
      "0 24px 62px rgba(0,0,0,0.24), inset 0 0 28px rgba(78,211,255,0.028)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };

  const hudTile: CSSProperties = {
    ...glassPanel,
    minWidth: 0,
    borderRadius: mobile ? "12px" : "16px",
    padding: mobile ? "8px 9px" : dense ? "9px 11px" : "11px 13px",
  };

  return (
    <div
      className="cargo-rush-shell"
      style={{
        position: "relative",
        width: "100%",
        minHeight: mobile ? "760px" : "100%",
        height: mobile ? "auto" : "100%",
        overflow: "hidden",
        borderRadius: mobile ? "14px" : "20px",
        border: "1px solid rgba(136,231,255,0.13)",
        background:
          "linear-gradient(180deg, rgba(2,11,25,0.2), rgba(2,7,18,0.9)), radial-gradient(circle at 50% -10%, rgba(46,177,224,0.22), transparent 38%), #030a16",
      }}
    >
      <style>{`
        @keyframes cargoGridMove {
          from { background-position: 0 0; }
          to { background-position: 48px 0; }
        }
        @keyframes cargoPulse {
          0%, 100% { opacity: .5; transform: scale(1); }
          50% { opacity: .9; transform: scale(1.03); }
        }
        @keyframes cargoBeltMove {
          from { background-position-x: 0; }
          to { background-position-x: 36px; }
        }
        .cargo-rush-shell button { font-family: inherit; }
        .cargo-belt-track {
          background-image: repeating-linear-gradient(90deg, rgba(149,227,255,.08) 0 16px, rgba(149,227,255,.015) 16px 32px);
          animation: cargoBeltMove 1.8s linear infinite;
        }
        .cargo-floor-grid {
          background-image:
            linear-gradient(rgba(122,221,255,.065) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122,221,255,.065) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: cargoGridMove 7s linear infinite;
        }
      `}</style>

      {/* PHASE 1 ASSET PLACEHOLDER
          Replace this visual layer later with:
          /public/milo/activity-lab/cargo-rush/warehouse-bg.png
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(180deg, rgba(4,15,31,0.18), rgba(2,8,20,0.72))",
        }}
      />

      <div
        aria-hidden="true"
        className="cargo-floor-grid"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: mobile ? "52%" : "58%",
          opacity: 0.42,
          transform: "perspective(500px) rotateX(58deg) scale(1.4)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, black 45%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, black 45%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: mobile ? "72px 8px auto" : "74px 18px auto",
          height: mobile ? "104px" : "128px",
          borderRadius: "20px",
          border: "1px dashed rgba(143,231,255,0.22)",
          background:
            "linear-gradient(135deg, rgba(20,95,126,0.09), rgba(84,65,155,0.08))",
          display: "grid",
          placeItems: "center",
          color: "rgba(176,238,255,0.34)",
          fontSize: mobile ? "8px" : "9px",
          fontWeight: 900,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Warehouse background PNG placeholder
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 3,
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "auto auto minmax(0, 1fr) auto",
          gap: mobile ? "8px" : dense ? "9px" : "12px",
          padding: mobile ? "9px" : dense ? "10px" : "13px",
        }}
      >
        <div
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: mobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: mobile ? "8px" : "9px",
                fontWeight: 950,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Milo Logistics Network
            </p>
            <div
              style={{
                marginTop: "2px",
                display: "flex",
                alignItems: "baseline",
                gap: "9px",
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: mobile ? "28px" : dense ? "30px" : "36px",
                  lineHeight: 1,
                  fontWeight: 400,
                }}
              >
                Cargo Rush
              </h2>
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: mobile ? "8px" : "9px",
                  fontWeight: 850,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Phase 1 Preview
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              style={{
                minHeight: mobile ? "34px" : "38px",
                padding: mobile ? "0 10px" : "0 13px",
                borderRadius: "999px",
                border: "1px solid rgba(131,224,255,0.22)",
                background: "rgba(6,22,40,0.76)",
                color: "#dff9ff",
                fontSize: mobile ? "9px" : "10px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ? How to Play
            </button>
            <button
              type="button"
              disabled
              aria-label="Pause will be enabled when Cargo Rush gameplay is built"
              title="Pause becomes active with gameplay in Phase 2"
              style={{
                width: mobile ? "34px" : "38px",
                height: mobile ? "34px" : "38px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.035)",
                color: "rgba(255,255,255,0.36)",
                fontWeight: 900,
                cursor: "not-allowed",
              }}
            >
              Ⅱ
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobile
              ? "repeat(2, minmax(0,1fr))"
              : "repeat(4, minmax(0,1fr))",
            gap: mobile ? "6px" : "8px",
          }}
        >
          {[
            ["TIME", "01:00", "Run timer"],
            ["SCORE", "0", "Sort to score"],
            ["COMBO", "×1", "Build to ×5"],
            ["RUN DT", "+0", "Awarded later"],
          ].map(([label, value, sub]) => (
            <div key={label} style={hudTile}>
              <p
                style={{
                  margin: 0,
                  color: "rgba(162,234,255,0.52)",
                  fontSize: mobile ? "7px" : "8px",
                  fontWeight: 950,
                  letterSpacing: "0.13em",
                }}
              >
                {label}
              </p>
              <div
                style={{
                  marginTop: "2px",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "6px",
                }}
              >
                <strong
                  style={{
                    color: label === "COMBO" ? "#ffd66f" : "white",
                    fontSize: mobile ? "17px" : dense ? "19px" : "22px",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </strong>
                {!mobile && !veryCompact && (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.32)",
                      fontSize: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sub}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            minHeight: mobile ? "430px" : 0,
            display: "grid",
            gridTemplateRows: "minmax(0, 1fr) auto",
            gap: mobile ? "8px" : "10px",
          }}
        >
          <div
            style={{
              ...glassPanel,
              minHeight: 0,
              borderRadius: mobile ? "16px" : "22px",
              padding: mobile ? "9px" : dense ? "10px" : "13px",
              display: "grid",
              gridTemplateRows: "auto repeat(3, minmax(0, 1fr))",
              gap: mobile ? "6px" : "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#a7efff",
                    fontSize: mobile ? "8px" : "9px",
                    fontWeight: 950,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Incoming Cargo
                </p>
                {!mobile && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "9px",
                    }}
                  >
                    Three starting conveyor lanes · live movement begins in Phase 2
                  </p>
                )}
              </div>

              <span
                style={{
                  padding: "5px 8px",
                  borderRadius: "999px",
                  border: "1px solid rgba(115,239,176,0.18)",
                  background: "rgba(115,239,176,0.055)",
                  color: "#89f3bd",
                  fontSize: mobile ? "7px" : "8px",
                  fontWeight: 950,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Bay system online
              </span>
            </div>

            {[0, 1, 2].map((lane) => {
              const preview = PACKAGE_PREVIEWS.find((item) => item.lane === lane);
              return (
                <div
                  key={lane}
                  className="cargo-belt-track"
                  style={{
                    position: "relative",
                    minHeight: mobile ? "80px" : dense ? "66px" : "76px",
                    overflow: "hidden",
                    borderRadius: mobile ? "12px" : "15px",
                    border: "1px solid rgba(145,226,255,0.12)",
                    backgroundColor: "rgba(1,9,20,0.76)",
                    boxShadow:
                      "inset 0 8px 22px rgba(0,0,0,0.35), inset 0 -2px 0 rgba(119,219,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: mobile ? "35px" : "42px",
                      borderRight: "1px solid rgba(146,231,255,0.1)",
                      background: "rgba(92,218,255,0.035)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(180,239,255,0.38)",
                      fontSize: "8px",
                      fontWeight: 950,
                      writingMode: mobile ? "vertical-rl" : undefined,
                    }}
                  >
                    {mobile ? `L${lane + 1}` : `L${lane + 1}`}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: mobile ? "50px" : "64px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: mobile ? "110px" : dense ? "126px" : "142px",
                      minHeight: mobile ? "56px" : "58px",
                      borderRadius: "13px",
                      border: "1px solid rgba(255,255,255,0.13)",
                      background:
                        "linear-gradient(145deg, rgba(21,45,66,0.96), rgba(7,17,31,0.98))",
                      boxShadow: "0 12px 24px rgba(0,0,0,0.28)",
                      padding: mobile ? "7px 9px" : "8px 10px",
                      display: "grid",
                      gridTemplateColumns: "36px minmax(0,1fr)",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      aria-label="Package art placeholder"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "9px",
                        border: "1px dashed rgba(160,231,255,0.3)",
                        background: "rgba(112,214,255,0.05)",
                        display: "grid",
                        placeItems: "center",
                        color: "rgba(191,242,255,0.52)",
                        fontSize: "7px",
                        fontWeight: 950,
                        textAlign: "center",
                        lineHeight: 1.05,
                      }}
                    >
                      PNG
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(152,230,255,0.52)",
                          fontSize: "7px",
                          fontWeight: 950,
                          letterSpacing: "0.08em",
                        }}
                      >
                        {preview?.category}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: mobile ? "11px" : "12px",
                          fontWeight: 900,
                        }}
                      >
                        {preview?.label}
                      </p>
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: mobile ? "10px" : "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgba(137,232,255,0.3)",
                      fontSize: mobile ? "18px" : "24px",
                      fontWeight: 400,
                    }}
                  >
                    →
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: bayColumns,
              gap: mobile ? "6px" : "8px",
            }}
          >
            {CARGO_BAYS.map((bay) => (
              <div
                key={bay.id}
                style={{
                  position: "relative",
                  minHeight: mobile ? "82px" : dense ? "78px" : "88px",
                  overflow: "hidden",
                  borderRadius: mobile ? "13px" : "17px",
                  border: `1px solid ${bay.accent}33`,
                  background:
                    "linear-gradient(180deg, rgba(11,27,43,0.94), rgba(5,12,27,0.98))",
                  boxShadow: `inset 0 0 30px ${bay.accent}0d, 0 12px 28px rgba(0,0,0,.18)`,
                  padding: mobile ? "9px" : "10px 11px",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: "3px",
                    background: bay.accent,
                    opacity: 0.7,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "7px",
                  }}
                >
                  <div
                    style={{
                      width: mobile ? "30px" : "34px",
                      height: mobile ? "30px" : "34px",
                      flex: "0 0 auto",
                      borderRadius: "9px",
                      border: `1px dashed ${bay.accent}66`,
                      background: `${bay.accent}0d`,
                      color: `${bay.accent}bb`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: "7px",
                      fontWeight: 950,
                      textAlign: "center",
                    }}
                  >
                    ICON
                  </div>
                  <span
                    style={{
                      color: `${bay.accent}bb`,
                      fontSize: "7px",
                      fontWeight: 950,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {bay.code}
                  </span>
                </div>
                <p
                  style={{
                    margin: "7px 0 0",
                    color: "white",
                    fontSize: mobile ? "12px" : "13px",
                    fontWeight: 950,
                    lineHeight: 1,
                  }}
                >
                  {bay.title}
                </p>
                {!veryCompact && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "rgba(255,255,255,0.33)",
                      fontSize: "8px",
                    }}
                  >
                    {bay.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            ...glassPanel,
            borderRadius: mobile ? "14px" : "18px",
            padding: mobile ? "8px" : "9px 11px",
            display: "flex",
            alignItems: mobile ? "stretch" : "center",
            justifyContent: "space-between",
            flexDirection: mobile ? "column" : "row",
            gap: mobile ? "7px" : "12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.74)",
                fontSize: mobile ? "9px" : "10px",
                fontWeight: 850,
              }}
            >
              Route every package to the correct cargo bay before time runs out.
            </p>
            {!mobile && (
              <p
                style={{
                  margin: "3px 0 0",
                  color: "rgba(255,255,255,0.34)",
                  fontSize: "8px",
                }}
              >
                Gameplay, sorting controls and live scoring are intentionally not active in Phase 1.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPreviewNotice(true)}
            style={{
              flex: "0 0 auto",
              minHeight: mobile ? "42px" : "44px",
              padding: mobile ? "0 18px" : "0 23px",
              borderRadius: "14px",
              border: "1px solid rgba(255,215,111,0.36)",
              background:
                "linear-gradient(135deg, rgba(255,206,82,0.98), rgba(246,166,59,0.94))",
              boxShadow: "0 12px 32px rgba(239,164,44,0.2)",
              color: "#201300",
              fontSize: mobile ? "11px" : "12px",
              fontWeight: 950,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Start Run
          </button>
        </div>
      </div>

      {(showInstructions || showPreviewNotice) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: mobile ? "14px" : "24px",
            background: "rgba(1,5,13,0.76)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={() => {
            setShowInstructions(false);
            setShowPreviewNotice(false);
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              borderRadius: mobile ? "20px" : "26px",
              border: "1px solid rgba(137,231,255,0.22)",
              background:
                "linear-gradient(150deg, rgba(10,31,53,0.99), rgba(3,11,25,0.99))",
              boxShadow: "0 34px 90px rgba(0,0,0,0.52)",
              padding: mobile ? "22px 18px" : "30px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "8px",
                fontWeight: 950,
                letterSpacing: "0.17em",
                textTransform: "uppercase",
              }}
            >
              Cargo Rush
            </p>
            <h3
              style={{
                margin: "7px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: mobile ? "28px" : "34px",
                fontWeight: 400,
              }}
            >
              {showPreviewNotice ? "Gameplay starts in Phase 2" : "How to Play"}
            </h3>

            {showPreviewNotice ? (
              <p
                style={{
                  margin: "13px 0 0",
                  color: "rgba(255,255,255,0.58)",
                  fontSize: mobile ? "11px" : "12px",
                  lineHeight: 1.65,
                }}
              >
                Phase 1A + 1B builds the complete responsive warehouse shell and visual system only.
                Package spawning, movement, sorting and score logic will be connected in Phase 2.
              </p>
            ) : (
              <div
                style={{
                  marginTop: "16px",
                  display: "grid",
                  gap: "9px",
                }}
              >
                {[
                  ["1", "Watch the lanes", "Packages will enter on three conveyor lanes."],
                  ["2", "Choose the right bay", "Send Food, Tech, Fashion and Energy cargo to its matching destination."],
                  ["3", "Build your combo", "Consecutive correct deliveries will increase the combo up to ×5."],
                  ["4", "Beat the rush", "The warehouse will speed up as the 60-second run progresses."],
                ].map(([num, title, body]) => (
                  <div
                    key={num}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "34px minmax(0,1fr)",
                      gap: "10px",
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "10px",
                        border: "1px solid rgba(137,231,255,0.2)",
                        background: "rgba(92,218,255,0.065)",
                        color: "#9aecff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "11px",
                        fontWeight: 950,
                      }}
                    >
                      {num}
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: mobile ? "11px" : "12px",
                          fontWeight: 900,
                        }}
                      >
                        {title}
                      </p>
                      <p
                        style={{
                          margin: "3px 0 0",
                          color: "rgba(255,255,255,0.45)",
                          fontSize: mobile ? "10px" : "11px",
                          lineHeight: 1.45,
                        }}
                      >
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowInstructions(false);
                setShowPreviewNotice(false);
              }}
              style={{
                width: "100%",
                minHeight: "44px",
                marginTop: "20px",
                borderRadius: "13px",
                border: "1px solid rgba(132,226,255,0.22)",
                background: "rgba(86,213,255,0.09)",
                color: "white",
                fontSize: "11px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Back to Warehouse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
