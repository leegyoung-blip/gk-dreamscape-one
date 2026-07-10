"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BodyId = "land" | "air" | "sea";
type Stage = "body" | "upgrade";

type Stats = {
  speed: number;
  control: number;
  durability: number;
  discovery: number;
};

type BodyOption = {
  id: BodyId;
  name: string;
  terrain: string;
  image: string;
  description: string;
  baseStats: Stats;
};

type UpgradeOption = {
  name: string;
  edition: string;
  description: string;
  stats: Stats;
  previewImage: string;
};

type VehicleSelection = {
  body: BodyId | null;
  upgrade: number | null;
};

const assets = {
  background: "/activities/skyforge/skyforge-hangar-bg.png",
};

const bodyOptions: BodyOption[] = [
  {
    id: "land",
    name: "Terra Scout",
    terrain: "Land Vehicle",
    image: "/activities/skyforge/terra-scout.png",
    description:
      "A fast ground vehicle built for roads, workshop tracks, and rough terrain.",
    baseStats: {
      speed: 3,
      control: 4,
      durability: 3,
      discovery: 2,
    },
  },
  {
    id: "air",
    name: "Sky Glider",
    terrain: "Air Vehicle",
    image: "/activities/skyforge/sky-glider.png",
    description:
      "A flying vehicle built for aerial routes, sky missions, and fast vertical travel.",
    baseStats: {
      speed: 4,
      control: 3,
      durability: 2,
      discovery: 3,
    },
  },
  {
    id: "sea",
    name: "Aqua Rover",
    terrain: "Sea Vehicle",
    image: "/activities/skyforge/aqua-rover.png",
    description:
      "A water-ready vehicle built for sea paths, floating platforms, and hidden routes.",
    baseStats: {
      speed: 2,
      control: 3,
      durability: 4,
      discovery: 4,
    },
  },
];

const upgradeOptions: Record<BodyId, UpgradeOption[]> = {
  land: [
    {
      name: "Turbo Wheels",
      edition: "Turbo Edition",
      description: "Built for fast land movement and quick mission routes.",
      previewImage: "/activities/skyforge/variations/terra-scout-turbo.png",
      stats: {
        speed: 5,
        control: 3,
        durability: 3,
        discovery: 2,
      },
    },
    {
      name: "Armour Frame",
      edition: "Armour Edition",
      description: "Built for stronger protection and rough terrain missions.",
      previewImage: "/activities/skyforge/variations/terra-scout-armour.png",
      stats: {
        speed: 2,
        control: 4,
        durability: 5,
        discovery: 2,
      },
    },
    {
      name: "Trail Scanner",
      edition: "Scanner Edition",
      description: "Built for finding hidden paths and exploration clues.",
      previewImage: "/activities/skyforge/variations/terra-scout-scanner.png",
      stats: {
        speed: 3,
        control: 4,
        durability: 3,
        discovery: 5,
      },
    },
  ],

  air: [
    {
      name: "Jet Core",
      edition: "Jet Edition",
      description: "Built for fast air travel and high-speed sky routes.",
      previewImage: "/activities/skyforge/variations/sky-glider-jet.png",
      stats: {
        speed: 5,
        control: 3,
        durability: 2,
        discovery: 3,
      },
    },
    {
      name: "Stabiliser Wings",
      edition: "Stabiliser Edition",
      description: "Built for smooth flying, sharp turns, and better handling.",
      previewImage: "/activities/skyforge/variations/sky-glider-stabiliser.png",
      stats: {
        speed: 4,
        control: 5,
        durability: 2,
        discovery: 3,
      },
    },
    {
      name: "Cloud Scanner",
      edition: "Cloud Scanner Edition",
      description: "Built for discovering hidden sky paths and aerial secrets.",
      previewImage:
        "/activities/skyforge/variations/sky-glider-cloud-scanner.png",
      stats: {
        speed: 4,
        control: 3,
        durability: 2,
        discovery: 5,
      },
    },
  ],

  sea: [
    {
      name: "Hydro Jets",
      edition: "Hydro Edition",
      description: "Built for faster water travel and smooth sea movement.",
      previewImage: "/activities/skyforge/variations/aqua-rover-hydro.png",
      stats: {
        speed: 4,
        control: 3,
        durability: 4,
        discovery: 4,
      },
    },
    {
      name: "Float Armour",
      edition: "Armour Edition",
      description: "Built for strong protection and stable water missions.",
      previewImage: "/activities/skyforge/variations/aqua-rover-armour.png",
      stats: {
        speed: 2,
        control: 4,
        durability: 5,
        discovery: 4,
      },
    },
    {
      name: "Deep Scanner",
      edition: "Deep Scan Edition",
      description:
        "Built for hidden discoveries, underwater clues, and exploration.",
      previewImage: "/activities/skyforge/variations/aqua-rover-deep-scan.png",
      stats: {
        speed: 2,
        control: 3,
        durability: 4,
        discovery: 5,
      },
    },
  ],
};

export default function SkyforgeHangarPage() {
  const [stage, setStage] = useState<Stage>("body");
  const [selection, setSelection] = useState<VehicleSelection>({
    body: null,
    upgrade: null,
  });
  const [saved, setSaved] = useState(false);

  const selectedBody = useMemo(() => {
    if (!selection.body) return null;
    return bodyOptions.find((body) => body.id === selection.body) ?? null;
  }, [selection.body]);

  const selectedUpgrade = useMemo(() => {
    if (!selection.body || selection.upgrade === null) return null;
    return upgradeOptions[selection.body][selection.upgrade] ?? null;
  }, [selection.body, selection.upgrade]);

  const displayName = selectedBody
    ? selectedUpgrade
      ? `${selectedBody.name}: ${selectedUpgrade.edition}`
      : selectedBody.name
    : "Choose a Vehicle Body";

  const displayImage = selectedBody
    ? selectedUpgrade
      ? selectedUpgrade.previewImage
      : selectedBody.image
    : "";

  const displayStats =
    selectedUpgrade?.stats ?? selectedBody?.baseStats ?? null;

  const canGoNext =
    stage === "body" ? selection.body !== null : selection.upgrade !== null;

  function chooseBody(bodyId: BodyId) {
    setSelection({
      body: bodyId,
      upgrade: null,
    });
    setSaved(false);
  }

  function chooseUpgrade(index: number) {
    setSelection((current) => ({
      ...current,
      upgrade: index,
    }));
    setSaved(false);
  }

  function goBack() {
    if (stage === "upgrade") {
      setStage("body");
    }
  }

  function goNext() {
    if (!canGoNext) return;

    if (stage === "body") {
      setStage("upgrade");
      return;
    }

    saveVehicle();
  }

  function resetBuild() {
    setSelection({
      body: null,
      upgrade: null,
    });
    setStage("body");
    setSaved(false);
  }

  function saveVehicle() {
    if (!selectedBody || !selectedUpgrade || !displayStats) return;

    const savedVehicle = {
      body: selectedBody.name,
      terrain: selectedBody.terrain,
      upgrade: selectedUpgrade.name,
      edition: selectedUpgrade.edition,
      vehicleName: `${selectedBody.name}: ${selectedUpgrade.edition}`,
      image: selectedUpgrade.previewImage,
      stats: displayStats,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "dreamscape-skyforge-vehicle",
      JSON.stringify(savedVehicle)
    );

    setSaved(true);
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100vw",
        overflowX: "hidden",
        color: "white",
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(2, 8, 18, 0.74) 0%,
            rgba(2, 8, 18, 0.52) 42%,
            rgba(2, 8, 18, 0.94) 100%
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
          minHeight: "100vh",
          padding: "88px 44px 38px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            margin: "0 auto",
            width: "100%",
            maxWidth: "1540px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "28px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#53d7ff",
                fontSize: "13px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
              Skyforge Hangar
            </p>

            <h1
              style={{
                margin: "14px 0 0",
                fontSize: "54px",
                fontWeight: 500,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
              }}
            >
              {stage === "body" ? "Choose Main Body" : "Choose Upgrade"}
            </h1>

            <p
              style={{
                margin: "14px 0 0",
                maxWidth: "680px",
                color: "rgba(255,255,255,0.7)",
                fontSize: "17px",
                lineHeight: 1.65,
              }}
            >
              {stage === "body"
                ? "Select one vehicle body. Each body belongs to a different terrain type."
                : selectedBody
                  ? `Choose one upgrade system for the ${selectedBody.name}.`
                  : "Choose a body first before selecting an upgrade."}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              paddingTop: "12px",
            }}
          >
            <StepPill
              number="1"
              label="Body"
              active={stage === "body"}
              complete={selection.body !== null}
              onClick={() => setStage("body")}
            />

            <StepPill
              number="2"
              label="Upgrade"
              active={stage === "upgrade"}
              complete={selection.upgrade !== null}
              onClick={() => {
                if (selection.body) setStage("upgrade");
              }}
            />
          </div>
        </header>

        <div
          style={{
            margin: "30px auto 0",
            width: "100%",
            maxWidth: "1540px",
            flex: 1,
            borderRadius: "32px",
            border: "1px solid rgba(116,200,255,0.24)",
            background:
              "linear-gradient(145deg, rgba(2,14,28,0.64), rgba(2,8,19,0.78))",
            backdropFilter: "blur(20px)",
            boxShadow:
              "0 28px 80px rgba(0,0,0,0.42), inset 0 0 36px rgba(83,215,255,0.04)",
            padding: "30px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {stage === "body" ? (
            <BodyStep selectedBody={selection.body} onChoose={chooseBody} />
          ) : (
            <UpgradeStep
              body={selectedBody}
              selectedUpgrade={selection.upgrade}
              onChoose={chooseUpgrade}
              displayName={displayName}
              displayImage={displayImage}
              displayStats={displayStats}
            />
          )}

          <footer
            style={{
              marginTop: "28px",
              paddingTop: "22px",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "18px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Build Status
              </p>

              <p
                style={{
                  margin: "6px 0 0",
                  color:
                    selection.body && selection.upgrade !== null
                      ? "#53d7ff"
                      : "rgba(255,255,255,0.78)",
                  fontSize: "15px",
                }}
              >
                {selection.body ? selectedBody?.terrain : "No body selected"}
                {selection.upgrade !== null && selectedUpgrade
                  ? ` • ${selectedUpgrade.name}`
                  : ""}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={resetBuild}
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
                onClick={goBack}
                disabled={stage === "body"}
                style={{
                  height: "42px",
                  padding: "0 22px",
                  borderRadius: "999px",
                  border:
                    stage === "body"
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid rgba(255,255,255,0.22)",
                  background:
                    stage === "body"
                      ? "rgba(255,255,255,0.025)"
                      : "rgba(255,255,255,0.06)",
                  color:
                    stage === "body"
                      ? "rgba(255,255,255,0.28)"
                      : "white",
                  cursor: stage === "body" ? "not-allowed" : "pointer",
                }}
              >
                Back
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                style={{
                  height: "42px",
                  padding: "0 24px",
                  borderRadius: "999px",
                  border: canGoNext
                    ? "1px solid rgba(83,215,255,0.75)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: canGoNext
                    ? "rgba(83,215,255,0.16)"
                    : "rgba(255,255,255,0.025)",
                  color: canGoNext ? "#bdf6ff" : "rgba(255,255,255,0.28)",
                  cursor: canGoNext ? "pointer" : "not-allowed",
                }}
              >
                {stage === "upgrade"
                  ? saved
                    ? "Finished ✓"
                    : "Finish"
                  : "Next"}
              </button>
            </div>
          </footer>
        </div>
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

function StepPill({
  number,
  label,
  active,
  complete,
  onClick,
}: {
  number: string;
  label: string;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        color: complete ? "#53d7ff" : "rgba(255,255,255,0.72)",
        cursor: "pointer",
        fontSize: "12px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {complete ? "✓ " : ""}
      {number} {label}
    </button>
  );
}

function BodyStep({
  selectedBody,
  onChoose,
}: {
  selectedBody: BodyId | null;
  onChoose: (bodyId: BodyId) => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "24px",
        minHeight: 0,
      }}
    >
      {bodyOptions.map((body) => {
        const selected = selectedBody === body.id;

        return (
          <button
            key={body.id}
            type="button"
            onClick={() => onChoose(body.id)}
            style={{
              minHeight: "620px",
              borderRadius: "24px",
              border: selected
                ? "2px solid rgba(83,215,255,0.95)"
                : "1px solid rgba(255,255,255,0.14)",
              background: selected
                ? "rgba(83,215,255,0.08)"
                : "rgba(255,255,255,0.035)",
              cursor: "pointer",
              padding: "18px",
              display: "grid",
              gridTemplateRows: "1fr auto",
              boxShadow: selected
                ? "0 0 30px rgba(83,215,255,0.22), inset 0 0 28px rgba(83,215,255,0.14)"
                : "none",
              color: "white",
              textAlign: "left",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                minHeight: 0,
                borderRadius: "18px",
                background: "rgba(2,8,19,0.44)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={body.image}
                alt={body.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div
              style={{
                padding: "18px 4px 4px",
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
                {body.terrain}
              </p>

              <h3
                style={{
                  margin: "8px 0 0",
                  fontSize: "24px",
                  fontWeight: 600,
                }}
              >
                {body.name}
              </h3>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(255,255,255,0.62)",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                {body.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function UpgradeStep({
  body,
  selectedUpgrade,
  onChoose,
  displayName,
  displayImage,
  displayStats,
}: {
  body: BodyOption | null;
  selectedUpgrade: number | null;
  onChoose: (index: number) => void;
  displayName: string;
  displayImage: string;
  displayStats: Stats | null;
}) {
  if (!body) {
    return (
      <div
        style={{
          minHeight: "520px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.68)",
          fontSize: "18px",
        }}
      >
        Choose a vehicle body first.
      </div>
    );
  }

  const upgrades = upgradeOptions[body.id];

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateRows: "minmax(260px, 42vh) auto",
        gap: "24px",
        minHeight: 0,
      }}
    >
      <div
        style={{
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "radial-gradient(circle at 50% 38%, rgba(83,215,255,0.14), rgba(255,255,255,0.035) 62%)",
          display: "grid",
          gridTemplateColumns: "42% 58%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <img
            src={displayImage}
            alt={displayName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(2,8,19,0.52)",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#53d7ff",
              fontSize: "12px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {body.terrain}
          </p>

          <h3
            style={{
              margin: "10px 0 0",
              fontSize: "34px",
              lineHeight: 1.1,
              fontWeight: 600,
            }}
          >
            {displayName}
          </h3>

          {displayStats && (
            <div
              style={{
                marginTop: "22px",
                display: "grid",
                gap: "10px",
                maxWidth: "560px",
              }}
            >
              <StatLine label="Speed" value={displayStats.speed} />
              <StatLine label="Control" value={displayStats.control} />
              <StatLine label="Durability" value={displayStats.durability} />
              <StatLine label="Discovery" value={displayStats.discovery} />
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}
      >
        {upgrades.map((upgrade, index) => {
          const selected = selectedUpgrade === index;

          return (
            <button
              key={upgrade.name}
              type="button"
              onClick={() => onChoose(index)}
              style={{
                minHeight: "260px",
                borderRadius: "20px",
                border: selected
                  ? "2px solid rgba(83,215,255,0.95)"
                  : "1px solid rgba(255,255,255,0.14)",
                background: selected
                  ? "rgba(83,215,255,0.08)"
                  : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                padding: "20px",
                color: "white",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                boxShadow: selected
                  ? "inset 0 0 28px rgba(83,215,255,0.18)"
                  : "none",
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
                Upgrade {index + 1}
              </p>

              <h3
                style={{
                  margin: "12px 0 0",
                  fontSize: "22px",
                  fontWeight: 600,
                }}
              >
                {upgrade.name}
              </h3>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(255,255,255,0.64)",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                {upgrade.description}
              </p>

              <div
                style={{
                  marginTop: "18px",
                  display: "grid",
                  gap: "9px",
                }}
              >
                <StatLine label="Speed" value={upgrade.stats.speed} />
                <StatLine label="Control" value={upgrade.stats.control} />
                <StatLine label="Durability" value={upgrade.stats.durability} />
                <StatLine label="Discovery" value={upgrade.stats.discovery} />
              </div>

              <div
                style={{
                  marginTop: "auto",
                  paddingTop: "16px",
                  color: selected ? "#53d7ff" : "rgba(255,255,255,0.44)",
                  fontSize: "13px",
                }}
              >
                {selected ? "Selected" : "Click to select"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "86px 1fr 34px",
        gap: "10px",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.65)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "5px",
        }}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            style={{
              height: "8px",
              borderRadius: "999px",
              background:
                index < value
                  ? "linear-gradient(90deg, #53d7ff, #8ee8ff)"
                  : "rgba(255,255,255,0.13)",
              boxShadow:
                index < value ? "0 0 8px rgba(83,215,255,0.45)" : "none",
            }}
          />
        ))}
      </div>

      <span
        style={{
          color: "#53d7ff",
          fontSize: "12px",
          textAlign: "right",
        }}
      >
        {value}/5
      </span>
    </div>
  );
}