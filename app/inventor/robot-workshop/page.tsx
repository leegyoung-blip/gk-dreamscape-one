"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type PartType = "antenna" | "eye" | "leg";

type SelectedParts = {
  antenna: number | null;
  eye: number | null;
  leg: number | null;
};

type PartOption = {
  label: string;
  description: string;
  src: string;
};

const assets = {
  background: "/activities/robot-workshop/robot-workshop-background.png",
  boltBase: "/activities/robot-workshop/Bolt-Base.png",
  boltMissing: "/activities/robot-workshop/Bolt-Missing-Parts.png",
};

const partOptions: Record<PartType, PartOption[]> = {
  antenna: [
    {
      label: "Explorer Antenna",
      description: "A balanced antenna for scanning nearby workshop signals.",
      src: "/activities/robot-workshop/bolt-final/explorer-antenna.png",
    },
    {
      label: "Lightning Antenna",
      description: "A fast-response antenna for quick energy detection.",
      src: "/activities/robot-workshop/bolt-final/lightning-antenna.png",
    },
    {
      label: "Satellite Antenna",
      description: "A long-range antenna that connects Bolt to Nova Labs.",
      src: "/activities/robot-workshop/bolt-final/satellite-antenna.png",
    },
  ],
  eye: [
    {
      label: "Blue Lens",
      description: "A clean vision lens for focused scanning and precision.",
      src: "/activities/robot-workshop/bolt-final/eye-blue-lens.png",
    },
    {
      label: "Green Scan",
      description: "A scanning eye that helps Bolt detect hidden repair clues.",
      src: "/activities/robot-workshop/bolt-final/eye-green-scan.png",
    },
    {
      label: "Multi Scan",
      description: "A multi-mode eye upgrade for wider detection and analysis.",
      src: "/activities/robot-workshop/bolt-final/eye-multi-scan.png",
    },
  ],
  leg: [
    {
      label: "All-Terrain Leg",
      description: "Stable movement across rough workshop floors and platforms.",
      src: "/activities/robot-workshop/bolt-final/all-terrain leg.png",
    },
    {
      label: "Flying Leg",
      description: "A hover-style movement system for light and agile travel.",
      src: "/activities/robot-workshop/bolt-final/flying-leg.png",
    },
    {
      label: "Speed Leg",
      description: "A fast boost system for quick missions and movement.",
      src: "/activities/robot-workshop/bolt-final/speed-leg.png",
    },
  ],
};

const steps: {
  type: PartType;
  title: string;
  description: string;
}[] = [
  {
    type: "antenna",
    title: "Choose Bolt’s Antenna",
    description: "Pick the signal part that helps Bolt connect to Nova’s lab.",
  },
  {
    type: "eye",
    title: "Choose Bolt’s Eye Upgrade",
    description: "Pick the vision part that helps Bolt scan, focus, and detect.",
  },
  {
    type: "leg",
    title: "Choose Bolt’s Legs",
    description:
      "Pick the movement part that helps Bolt travel around the workshop.",
  },
];

function getOptions(type: PartType) {
  return partOptions[type];
}

export default function RobotWorkshopPage() {
  const router = useRouter();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedParts, setSelectedParts] = useState<SelectedParts>({
    antenna: null,
    eye: null,
    leg: null,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState("");

  const currentStep = steps[currentStepIndex];

  const currentPartSelected = selectedParts[currentStep.type] !== null;
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === steps.length - 1;

  const isComplete =
    selectedParts.antenna !== null &&
    selectedParts.eye !== null &&
    selectedParts.leg !== null;

  const progress = useMemo(() => {
    let count = 0;

    if (selectedParts.antenna !== null) count += 1;
    if (selectedParts.eye !== null) count += 1;
    if (selectedParts.leg !== null) count += 1;

    return count;
  }, [selectedParts]);

  function choosePart(type: PartType, index: number) {
  setSaved(false);

  setSelectedParts((prev) => ({
    ...prev,
    [type]: index,
  }));
}

  function goToStep(index: number) {
    setCurrentStepIndex(index);
    setSaved(false);
  }

  function goBack() {
  if (currentStepIndex === 0) return;

  setCurrentStepIndex((prev) => prev - 1);
  setSaved(false);
}

async function goNext() {
  if (!currentPartSelected) return;

  if (isLastStep) {
    if (isComplete) {
      await saveBolt();
    }

    return;
  }

  setCurrentStepIndex((prev) => prev + 1);
  setSaved(false);
}

  function resetBolt() {
    setSelectedParts({
      antenna: null,
      eye: null,
      leg: null,
    });
    setCurrentStepIndex(0);
    setSaved(false);
  }

async function saveBolt() {
  if (!isComplete) return;

  setSaving(true);
  setSaved(false);
  setSaveError("");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setSaving(false);
    router.push("/login");
    return;
  }

  const antenna =
    selectedParts.antenna !== null
      ? partOptions.antenna[selectedParts.antenna]
      : null;

  const eye =
    selectedParts.eye !== null ? partOptions.eye[selectedParts.eye] : null;

  const leg =
    selectedParts.leg !== null ? partOptions.leg[selectedParts.leg] : null;

  if (!antenna || !eye || !leg) {
    setSaving(false);
    setSaveError("Please complete all parts before saving Bolt.");
    return;
  }

  const { error } = await supabase.from("custom_bolts").insert({
    user_id: user.id,

    // Save the actual image paths so the profile can display them properly
    antenna: antenna.src,
    eye: eye.src,
    leg: leg.src,
  });

  if (error) {
    setSaving(false);
    setSaveError(error.message);
    return;
  }

  setSaving(false);
  setSaved(true);
}

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
        color: "white",
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(2, 8, 18, 0.72) 0%,
            rgba(2, 8, 18, 0.48) 45%,
            rgba(2, 8, 18, 0.92) 100%
          ),
          url(${assets.background})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <TopControls />

      <section
        style={{
          position: "relative",
          zIndex: 5,
          height: "100vh",
          display: "grid",
          gridTemplateColumns: "44% 56%",
          gap: "28px",
          padding: "86px 44px 38px",
        }}
      >
        <section
          style={{
            position: "relative",
            borderRadius: "30px",
            border: "1px solid rgba(116,200,255,0.24)",
            background:
              "linear-gradient(145deg, rgba(2,14,28,0.64), rgba(2,8,19,0.76))",
            backdropFilter: "blur(20px)",
            boxShadow:
              "0 28px 80px rgba(0,0,0,0.42), inset 0 0 36px rgba(83,215,255,0.04)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 30%, rgba(83,215,255,0.14), transparent 44%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              padding: "32px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#53d7ff",
                fontSize: "13px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
              Robot Workshop
            </p>

            <h1
              style={{
                margin: "14px 0 0",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "46px",
                fontWeight: 500,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
              }}
            >
              Fix and customise Bolt.
            </h1>

            <p
              style={{
                margin: "16px 0 0",
                maxWidth: "480px",
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                lineHeight: 1.65,
              }}
            >
              Bolt is missing a few key parts. Choose an antenna, eye upgrade,
              and legs to bring him back online.
            </p>

            <div
              style={{
                marginTop: "24px",
                display: "flex",
                gap: "10px",
              }}
            >
              {steps.map((step, index) => {
                const type = step.type;
                const selected = selectedParts[type] !== null;
                const active = currentStepIndex === index;

                return (
                  <button
                    key={step.type}
                    type="button"
                    onClick={() => goToStep(index)}
                    style={{
                      height: "38px",
                      padding: "0 15px",
                      borderRadius: "999px",
                      border: active
                        ? "1px solid rgba(83,215,255,0.85)"
                        : "1px solid rgba(255,255,255,0.16)",
                      background: active
                        ? "rgba(83,215,255,0.14)"
                        : "rgba(255,255,255,0.04)",
                      color: selected ? "#53d7ff" : "rgba(255,255,255,0.72)",
                      cursor: "pointer",
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                position: "relative",
                flex: 1,
                marginTop: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 0,
              }}
            >
              <BoltPreview selectedParts={selectedParts} />
            </div>

            <div
              style={{
                height: "74px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                paddingTop: "18px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.58)",
                  }}
                >
                  Repair Status
                </p>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: isComplete ? "#53d7ff" : "rgba(255,255,255,0.84)",
                    fontSize: "15px",
                  }}
                >
                  {progress}/3 parts installed
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={resetBolt}
                  style={{
                    height: "42px",
                    padding: "0 18px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.04)",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={saveBolt}
                  disabled={!isComplete || saving}
                  style={{
                    height: "42px",
                    padding: "0 20px",
                    borderRadius: "999px",
                    border: isComplete
                      ? "1px solid rgba(83,215,255,0.75)"
                      : "1px solid rgba(255,255,255,0.12)",
                    background: isComplete
                      ? "rgba(83,215,255,0.16)"
                      : "rgba(255,255,255,0.04)",
                    color: isComplete ? "#bdf6ff" : "rgba(255,255,255,0.35)",
                    cursor: isComplete ? "pointer" : "not-allowed",
                  }}
                >
                  {saving ? "Saving..." : saved ? "Saved ✓" : "Save Bolt"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            borderRadius: "30px",
            border: "1px solid rgba(116,200,255,0.24)",
            background:
              "linear-gradient(145deg, rgba(2,14,28,0.56), rgba(2,8,19,0.72))",
            backdropFilter: "blur(20px)",
            boxShadow:
              "0 28px 80px rgba(0,0,0,0.42), inset 0 0 36px rgba(83,215,255,0.04)",
            padding: "34px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#53d7ff",
              fontSize: "13px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
            }}
          >
            Step {currentStepIndex + 1}
          </p>

          <h2
            style={{
              margin: "14px 0 0",
              fontSize: "38px",
              fontWeight: 500,
              lineHeight: 1.15,
            }}
          >
            {currentStep.title}
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              maxWidth: "650px",
              color: "rgba(255,255,255,0.66)",
              fontSize: "16px",
              lineHeight: 1.65,
            }}
          >
            {currentStep.description}
          </p>

          <OptionPanel
            type={currentStep.type}
            selectedIndex={selectedParts[currentStep.type]}
            onChoose={(index) => choosePart(currentStep.type, index)}
          />

          <div
  style={{
    marginTop: "auto",
    paddingTop: "22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    color: "rgba(255,255,255,0.6)",
    fontSize: "14px",
  }}
>
  <span>
    {currentPartSelected
      ? `${getOptions(currentStep.type)[selectedParts[currentStep.type] as number].label} selected.`
      : "Choose one upgrade option to install on Bolt."}
  </span>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }}
  >
    <button
      type="button"
      onClick={goBack}
      disabled={isFirstStep}
      style={{
        height: "42px",
        padding: "0 22px",
        borderRadius: "999px",
        border: isFirstStep
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(255,255,255,0.22)",
        background: isFirstStep
          ? "rgba(255,255,255,0.025)"
          : "rgba(255,255,255,0.06)",
        color: isFirstStep ? "rgba(255,255,255,0.28)" : "white",
        cursor: isFirstStep ? "not-allowed" : "pointer",
      }}
    >
      Back
    </button>

    <button
      type="button"
      onClick={goNext}
      disabled={!currentPartSelected || (isLastStep && !isComplete) || saving}
      style={{
        height: "42px",
        padding: "0 24px",
        borderRadius: "999px",
        border:
          currentPartSelected && (!isLastStep || isComplete)
            ? "1px solid rgba(83,215,255,0.75)"
            : "1px solid rgba(255,255,255,0.1)",
        background:
          currentPartSelected && (!isLastStep || isComplete)
            ? "rgba(83,215,255,0.16)"
            : "rgba(255,255,255,0.025)",
        color:
          currentPartSelected && (!isLastStep || isComplete)
            ? "#bdf6ff"
            : "rgba(255,255,255,0.28)",
        cursor:
          currentPartSelected && (!isLastStep || isComplete)
            ? "pointer"
            : "not-allowed",
      }}
    >
      {isLastStep
  ? saving
    ? "Saving..."
    : saved
      ? "Finished ✓"
      : "Finish"
  : "Next"}
    </button>
  </div>
</div>
        </section>
      </section>
    </main>
  );
}

function TopControls() {
  return (
    <>
      <Link
        href="/inventor"
        style={{
          position: "fixed",
          top: "24px",
          left: "32px",
          zIndex: 70,
          height: "46px",
          padding: "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(116,200,255,0.5)",
          background: "rgba(2,8,19,0.48)",
          backdropFilter: "blur(16px)",
          color: "white",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
        }}
      >
        <span style={{ fontSize: "18px" }}>←</span>
        Return to Nova
      </Link>

      <Link
        href="/"
        style={{
          position: "fixed",
          top: "24px",
          right: "32px",
          zIndex: 70,
          height: "46px",
          padding: "0 22px",
          borderRadius: "999px",
          border: "1px solid rgba(116,200,255,0.5)",
          background: "rgba(2,8,19,0.48)",
          backdropFilter: "blur(16px)",
          color: "white",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
        }}
      >
        Home
        <span style={{ fontSize: "18px" }}>→</span>
      </Link>
    </>
  );
}

function BoltPreview({ selectedParts }: { selectedParts: SelectedParts }) {
  const selectedAntenna =
    selectedParts.antenna !== null
      ? partOptions.antenna[selectedParts.antenna]
      : null;

  const selectedEye =
    selectedParts.eye !== null ? partOptions.eye[selectedParts.eye] : null;

  const selectedLeg =
    selectedParts.leg !== null ? partOptions.leg[selectedParts.leg] : null;

  const hasAnyPart = selectedAntenna || selectedEye || selectedLeg;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "310px",
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "8%",
            borderRadius: "999px",
            background:
              "radial-gradient(circle, rgba(83,215,255,0.22), transparent 62%)",
            filter: "blur(10px)",
          }}
        />

        <img
          src={hasAnyPart ? assets.boltBase : assets.boltMissing}
          alt="Bolt"
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 26px 35px rgba(0,0,0,0.5))",
          }}
        />

        {selectedAntenna && (
          <PartOverlay
            src={selectedAntenna.src}
            style={{
              top: "-15px",
              left: "51%",
              width: "150px",
              height: "90px",
              transform: "translateX(-50%)",
            }}
          />
        )}

        {selectedEye && (
          <PartOverlay
            src={selectedEye.src}
            style={{
              top: "75px",
              left: "51%",
              width: "190px",
              height: "90px",
              transform: "translateX(-50%)",
            }}
          />
        )}

        {selectedLeg && (
          <PartOverlay
            src={selectedLeg.src}
            style={{
              bottom: "25px",
              left: "50%",
              width: "230px",
              height: "130px",
              transform: "translateX(-50%)",
            }}
          />
        )}
      </div>
    </div>
  );
}

function PartOverlay({
  src,
  style,
}: {
  src: string;
  style: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 4,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function OptionPanel({
  type,
  selectedIndex,
  onChoose,
}: {
  type: PartType;
  selectedIndex: number | null;
  onChoose: (index: number) => void;
}) {
  const options = getOptions(type);

  return (
    <div
      style={{
        marginTop: "28px",
        borderRadius: "24px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.045)",
        boxShadow: "inset 0 0 34px rgba(83,215,255,0.04)",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {options.map((option, index) => {
          const selected = selectedIndex === index;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChoose(index)}
              style={{
                height: "190px",
                borderRadius: "18px",
                border: selected
                  ? "2px solid rgba(83,215,255,0.95)"
                  : "1px solid rgba(255,255,255,0.14)",
                background: selected
                  ? "rgba(83,215,255,0.08)"
                  : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: selected
                  ? "inset 0 0 28px rgba(83,215,255,0.18)"
                  : "none",
              }}
              aria-label={`Choose ${type} option ${index + 1}`}
            >
              <img
                src={option.src}
                alt={option.label}
                style={{
                  maxWidth: "88%",
                  maxHeight: "88%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {options.map((option, index) => {
          const selected = selectedIndex === index;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChoose(index)}
              style={{
                minHeight: "104px",
                borderRadius: "16px",
                border: selected
                  ? "1px solid rgba(83,215,255,0.7)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: selected
                  ? "rgba(83,215,255,0.1)"
                  : "rgba(255,255,255,0.025)",
                padding: "16px",
                textAlign: "left",
                color: "white",
                cursor: "pointer",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: selected ? "#53d7ff" : "rgba(255,255,255,0.52)",
                  fontSize: "12px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Option {index + 1}
              </p>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "white",
                }}
              >
                {option.label}
              </p>

              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "13px",
                  lineHeight: 1.45,
                  color: "rgba(255,255,255,0.58)",
                }}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}