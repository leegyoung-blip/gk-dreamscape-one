"use client";

import TopNav from "@/app/components/topnav";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import Link from "next/link";
import * as THREE from "three";
import { supabase } from "@/lib/supabase";

type LandmarkType = "hub" | "workshop" | "skyforge" | null;

function Model({
  path,
  position,
  scale,
  rotation = [0, 0, 0],
}: {
  path: string;
  position: [number, number, number];
  scale: number | [number, number, number];
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(path);

  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  );
}

function AnimatedModel({
  path,
  position,
  scale,
  rotation = [0, 0, 0],
}: {
  path: string;
  position: [number, number, number];
  scale: number | [number, number, number];
  rotation?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(path);

  const clonedScene = useMemo(() => clone(scene), [scene]);

  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    const firstAnimation = Object.values(actions)[0];

    if (!firstAnimation) return;

    firstAnimation.reset().fadeIn(0.2).play();

    return () => {
      firstAnimation.fadeOut(0.2);
      firstAnimation.stop();
    };
  }, [actions]);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      rotation={rotation}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

function HoverLabel({
  title,
  subtitle,
  visible,
}: {
  title: string;
  subtitle: string;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <Html
      position={[0, 1, 0]}
      center
      distanceFactor={7}
      style={{ pointerEvents: "none" }}
    >
      <div className="text-center whitespace-nowrap">
        <p className="text-xl font-light tracking-wide text-indigo-950">
          {title}
        </p>
        <div className="mx-auto mt-3 h-[1px] w-14 bg-violet-500/70" />
        <p className="mt-3 text-sm font-light text-indigo-900/80">
          {subtitle}
        </p>
      </div>
    </Html>
  );
}

function Landmark({
  children,
  title,
  subtitle,
  onClick,
  onHoverChange,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const targetScale = hovered ? 1.05 : 1;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
  });

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      onPointerOver={() => {
        setHovered(true);
        onHoverChange?.(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        onHoverChange?.(false);
        document.body.style.cursor = "default";
      }}
    >
      {children}

      <HoverLabel title={title} subtitle={subtitle} visible={hovered} />

      {hovered && (
        <pointLight position={[0, 1.2, 0]} intensity={2} distance={4} />
      )}
    </group>
  );
}

function InfoPanel({
  landmark,
  onClose,
}: {
  landmark: LandmarkType;
  onClose: () => void;
}) {
  if (!landmark) return null;

  const content = {
    hub: {
      title: "Inventor Hub",
      text: "Welcome to Inventor World. This is the central hub where ideas, gadgets, robots and future technology begin.",
      reward: "First Mission: Find the three Innovation Sparks.",
    },
    workshop: {
      title: "Robot Workshop",
      text: "This is where Bolt and the helper robots are built, repaired and tested.",
      reward: "Reward: Robot Workshop Stamp",
    },
    skyforge: {
      title: "SkyForge Hangar",
      text: "Build and customize your own multi-terrain vehicle for exploring Dreamscape One.",
      reward: "Reward: SkyForge Pilot Badge",
    },
  }[landmark];

  return (
    <div className="absolute right-8 top-1/2 z-30 w-80 -translate-y-1/2 rounded-3xl bg-white/80 p-6 text-indigo-950 shadow-xl backdrop-blur-md">
      <button
        onClick={onClose}
        className="absolute right-5 top-4 text-sm text-indigo-950/60"
      >
        ✕
      </button>

      <h2 className="text-2xl font-light tracking-wide">{content.title}</h2>

      <p className="mt-4 text-sm leading-6 text-indigo-950/80">
        {content.text}
      </p>

      <p className="mt-5 rounded-2xl bg-indigo-100 px-4 py-3 text-sm font-medium">
        {content.reward}
      </p>
    </div>
  );
}

function RobotWorkshopActivity({ onClose }: { onClose: () => void }) {
  const stages = [
    {
      key: "antenna",
      title: "Choose Bolt's new antenna",
      image: "/activities/robot-workshop/antenna-options.png",
      options: [
        {
          name: "Explorer Antenna",
          description: "Helps Bolt scan new places and detect hidden signals.",
        },
        {
          name: "Lightning Antenna",
          description: "Boosts Bolt's energy and reaction speed.",
        },
        {
          name: "Satellite Antenna",
          description:
            "Connects Bolt to long-range signals across Inventor World.",
        },
      ],
    },
    {
      key: "eye",
      title: "Choose Bolt's new eye",
      image: "/activities/robot-workshop/eye-options.png",
      options: [
        {
          name: "Blue Lens",
          description: "A reliable sensor lens for everyday scanning.",
        },
        {
          name: "Green Scan Lens",
          description: "Detects small details and hidden patterns.",
        },
        {
          name: "Multi-Scan Lens",
          description: "Reads colour, movement and energy signals.",
        },
      ],
    },
    {
      key: "leg",
      title: "Choose Bolt's new leg",
      image: "/activities/robot-workshop/leg-options.png",
      options: [
        {
          name: "Speed Leg",
          description: "Lets Bolt move quickly across smooth paths.",
        },
        {
          name: "Flying Leg",
          description: "Lets Bolt hover and fly for short distances.",
        },
        {
          name: "All-Terrain Leg",
          description: "Gives Bolt better balance on rough surfaces.",
        },
      ],
    },
  ];

  const [introShown, setIntroShown] = useState(true);
  const [stage, setStage] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const finalBoltRef = useRef<HTMLDivElement>(null);
  async function saveBoltToProfile() {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    alert("Please log in first.");
    return;
  }

  const { error } = await supabase
    .from("custom_bolts")
    .insert({
      user_id: data.user.id,
      antenna: choices[0],
      eye: choices[1],
      leg: choices[2],
    });

  if (error) {
    alert(error.message);
  } else {
    alert("Bolt saved!");
  }
}

const antennaImages: Record<string, string> = {
  "Explorer Antenna": "/activities/robot-workshop/bolt-final/explorer-antenna.png",
  "Lightning Antenna": "/activities/robot-workshop/bolt-final/lightning-antenna.png",
  "Satellite Antenna": "/activities/robot-workshop/bolt-final/satellite-antenna.png",
};

const eyeImages: Record<string, string> = {
  "Blue Lens": "/activities/robot-workshop/bolt-final/eye-blue-lens.png",
  "Green Scan Lens": "/activities/robot-workshop/bolt-final/eye-green-scan.png",
  "Multi-Scan Lens": "/activities/robot-workshop/bolt-final/eye-multi-scan.png",
};

const legImages: Record<string, string> = {
  "All-Terrain Leg": "/activities/robot-workshop/bolt-final/all-terrain leg.png",
  "Flying Leg": "/activities/robot-workshop/bolt-final/flying-leg.png",
  "Speed Leg": "/activities/robot-workshop/bolt-final/speed-leg.png",
};


async function downloadBolt() {
  if (!finalBoltRef.current) return;

  const canvas = await html2canvas(finalBoltRef.current);
  const link = document.createElement("a");
  link.download = "my-custom-bolt.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}


  const completed = !introShown && stage >= stages.length;

  function choose(option: string) {
    setChoices((prev) => [...prev, option]);
    setStage((prev) => prev + 1);
    setHoveredOption(null);
  }

  function goBack() {
    if (completed) {
      setStage(stages.length - 1);
      setChoices((prev) => prev.slice(0, -1));
      return;
    }

    if (stage > 0) {
      setStage((prev) => prev - 1);
      setChoices((prev) => prev.slice(0, -1));
    } else {
      setIntroShown(true);
      setChoices([]);
    }

    setHoveredOption(null);
  }

  return (
    <div className="absolute left-1/2 top-1/2 z-40 w-[520px] rounded-[2rem] -translate-x-1/2 -translate-y-1/2 border border-violet-200/60 bg-white/85 p-4 text-indigo-950 backdrop-blur-xl shadow-[0_0_80px_rgba(196,181,253,0.55)]">
      <button
        onClick={onClose}
        className="absolute right-6 top-5 z-50 text-sm text-indigo-950/60"
      >
        ✕
      </button>

      <div
        className="overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-cover bg-center p-4"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.84), rgba(255,255,255,0.84)), url('/activities/robot-workshop/robot-workshop-bg.png')",
        }}
      >
        <p className="text-xs font-medium tracking-[0.18em] text-indigo-900/60">
          ROBOT WORKSHOP
        </p>

        {introShown ? (
          <>
            <div className="relative mt-3 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-md">
              <img
                src="/activities/robot-workshop/bolt-missing-parts.png"
                alt="Bolt with missing parts"
                className="h-[620px] w-full object-cover object-center"
              />

              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/85 px-5 py-4 shadow-lg backdrop-blur-md">
                <p className="mb-1 text-xs font-medium tracking-[0.18em] text-indigo-900/60">
                  NOVA
                </p>

                <p className="min-h-[72px] text-sm font-light leading-6 text-indigo-950">
                  <Typewriter text="Something happened to Bolt. The Dream Core signal damaged his antenna, eye and leg module. Help me repair him." />
                </p>
              </div>
            </div>

            <button
              onClick={() => setIntroShown(false)}
              className="mt-4 w-full rounded-full bg-indigo-950 px-5 py-3 text-xs tracking-[0.16em] text-white hover:bg-indigo-900"
            >
              START REPAIR
            </button>
          </>
        ) : !completed ? (
          <>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={goBack}
                className="rounded-full px-3 py-2 text-xs tracking-[0.12em] text-indigo-950/70 hover:bg-white"
              >
                ← BACK
              </button>

              <p className="text-xs tracking-[0.14em] text-indigo-900/50">
                STEP {stage + 1} / {stages.length}
              </p>
            </div>

            <h2 className="mt-2 text-xl font-light tracking-wide">
              {stages[stage].title}
            </h2>

            <p className="mt-2 text-sm text-indigo-950/70">
              Click one of the three parts to install it on Bolt.
            </p>

            <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-md">
              <img
                src={stages[stage].image}
                alt={stages[stage].title}
                className="mx-auto max-h-[320px] w-auto"
              />

              {stages[stage].options.map((option, index) => (
                <button
                  key={option.name}
                  onClick={() => choose(option.name)}
                  onMouseEnter={() => setHoveredOption(index)}
                  onMouseLeave={() => setHoveredOption(null)}
                  className={`absolute top-0 h-full w-1/3 transition-all duration-200 ${
                    index === 0
                      ? "left-0"
                      : index === 1
                        ? "left-1/3"
                        : "right-0"
                  } ${
                    hoveredOption === index
                      ? "scale-105 rounded-2xl border-2 border-violet-400 bg-white/20 shadow-[0_0_30px_rgba(139,92,246,0.45)]"
                      : ""
                  }`}
                  aria-label={option.name}
                />
              ))}

              {hoveredOption !== null && (
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/85 px-4 py-3 text-center shadow-lg backdrop-blur-md">
                  <p className="text-sm font-medium tracking-wide text-indigo-950">
                    {stages[stage].options[hoveredOption].name}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-indigo-900/75">
                    {stages[stage].options[hoveredOption].description}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={goBack}
              className="mt-3 rounded-full px-3 py-2 text-xs tracking-[0.12em] text-indigo-950/70 hover:bg-white"
            >
              ← CHANGE PARTS
            </button>

            <div
            ref={finalBoltRef}
            className="relative mt-3 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-md"
          >
            <img
              src="/activities/robot-workshop/bolt-base.png"
              alt="Final repaired Bolt"
              className="h-[560px] w-full object-cover object-center"
            />

            {choices[0] && antennaImages[choices[0]] && (
              <img
                src={antennaImages[choices[0]]}
                alt={choices[0]}
                style={{
                  position: "absolute",
                  left: "51%",
                  top: "0px",
                  width: "55px",
                  transform: "translateX(-50%)",
                }}
              />
            )}

            {choices[1] && eyeImages[choices[1]] && (
              <img
                src={eyeImages[choices[1]]}
                alt={choices[1]}
                style={{
                  position: "absolute",
                  left: "50.5%",
                  top: "97px",
                  width: "179px",
                  transform: "translateX(-50%)",
                }}
              />
            )}

            {choices[2] && legImages[choices[2]] && (
              <img
                src={legImages[choices[2]]}
                alt={choices[2]}
                style={{
                  position: "absolute",
                  left: "50.2%",
                  top: "348px",
                  width: "275px",
                  transform: "translateX(-50%)",
                }}
              />
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-white/85 px-5 py-4 shadow-lg backdrop-blur-md">
          <p className="mb-1 text-xs font-medium tracking-[0.18em] text-indigo-900/60">
            NOVA
          </p>

          <p className="text-sm font-light leading-6 text-indigo-950">
            <Typewriter text="Amazing work. Bolt is fully repaired and ready for his next adventure." />
          </p>
        </div>

          <button
            onClick={saveBoltToProfile}
            className="mt-4 w-full rounded-full bg-violet-100 px-5 py-3 text-xs tracking-[0.16em] text-indigo-950 hover:bg-violet-200"
          >
            SAVE TO PROFILE
          </button>
          </>
        )}
      </div>
    </div>
  );
}

function SkyForgeActivity({ onClose }: { onClose: () => void }) {
  type Origin = "land" | "air" | "sea";
  type Step = "intro" | "origin" | "body" | "upgrade" | "final";

  const [step, setStep] = useState<Step>("intro");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [bodyChoice, setBodyChoice] = useState("");
  const [upgradeChoice, setUpgradeChoice] = useState("");

  const bodyImages = {
    land: "/activities/skyforge/land-main-body.png",
    air: "/activities/skyforge/air-main-body.png",
    sea: "/activities/skyforge/sea-main-body.png",
  };

  const upgradeImages = {
    land: "/activities/skyforge/land-upgrades.png",
    air: "/activities/skyforge/air-upgrades.png",
    sea: "/activities/skyforge/sea-upgrades.png",
  };

  const bodyChoices = {
    land: ["Scout Bike", "Explorer Rover", "Titan Crawler"],
    air: ["Scout Glider", "Explorer Aircraft", "Titan Skycruiser"],
    sea: ["Scout Hydrocraft", "Explorer Submersible", "Titan Deep Explorer"],
  };

  const upgradeChoices = {
    land: ["Wings System", "Hover Drive System", "Rocket Booster System"],
    air: ["Amphibious Pods", "Hover Matrix", "Mech Walker System"],
    sea: ["Wings Module", "Hover Matrix", "Mech Walker System"],
  };

  function chooseByZone(index: number) {
    if (!origin) return;

    if (step === "body") {
      setBodyChoice(bodyChoices[origin][index]);
      setStep("upgrade");
    }

    if (step === "upgrade") {
      setUpgradeChoice(upgradeChoices[origin][index]);
      setStep("final");
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="relative w-[1200px] max-h-[94vh] overflow-hidden rounded-[2rem] bg-white p-5 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-7 top-6 z-50 rounded-full bg-white/80 px-3 py-1 text-indigo-950 shadow"
        >
          ✕
        </button>

        {step === "intro" && (
          <>
            <img
              src="/activities/skyforge/skyforge-hangar-bg.png"
              className="h-[650px] w-full rounded-[1.5rem] object-cover"
              alt="SkyForge Hangar"
            />

            <div className="mt-4 rounded-2xl bg-indigo-50 px-6 py-5 text-indigo-950">
              <p className="mb-2 text-xs tracking-[0.18em] text-indigo-900/60">
                NOVA
              </p>
              <p className="text-sm leading-6">
                <Typewriter text="Welcome to SkyForge Hangar. This is where we build vehicles to travel throughout Dreamscape One." />
              </p>
            </div>

            <button
              onClick={() => setStep("origin")}
              className="mt-4 w-full rounded-full bg-indigo-950 py-3 text-sm tracking-[0.16em] text-white"
            >
              START BUILDING
            </button>
          </>
        )}

        {step === "origin" && (
  <div className="relative">
    <img
      src="/activities/skyforge/vehicle-origin.png"
      className="h-[720px] w-full rounded-[1.5rem] object-cover"
      alt="Choose your vehicle origin"
    />

    <div className="absolute left-8 top-8 max-w-[430px] rounded-2xl bg-white/90 px-6 py-5 text-indigo-950 shadow-lg backdrop-blur-md">
      <p className="mb-2 text-xs tracking-[0.18em] text-indigo-900/60">
        NOVA
      </p>
      <p className="text-sm leading-6">
        <Typewriter text="Every vehicle in Dreamscape One can eventually travel on land, through the air and underwater. But each origin has different strengths, so choose the one that fits how you want to explore." />
      </p>
    </div>

    <button
      onClick={() => {
        setOrigin("land");
        setStep("body");
      }}
      className="absolute left-[5%] top-[24%] h-[63%] w-[28%] rounded-3xl hover:bg-white/10"
    />

    <button
      onClick={() => {
        setOrigin("air");
        setStep("body");
      }}
      className="absolute left-[36%] top-[24%] h-[63%] w-[28%] rounded-3xl hover:bg-white/10"
    />

    <button
      onClick={() => {
        setOrigin("sea");
        setStep("body");
      }}
      className="absolute left-[67%] top-[24%] h-[63%] w-[28%] rounded-3xl hover:bg-white/10"
    />

    <button
      onClick={() => setStep("intro")}
      className="absolute bottom-8 left-8 rounded-full bg-white/80 px-6 py-3 text-indigo-950 shadow"
    >
      ← Back
    </button>
  </div>
)}

        {step === "body" && origin && (
          <div className="relative">
            <img
              src={bodyImages[origin]}
              className="h-[720px] w-full rounded-[1.5rem] object-cover"
              alt={`${origin} body choices`}
            />

            <button
              onClick={() => chooseByZone(0)}
              className="absolute left-[3%] top-[25%] h-[63%] w-[30%] rounded-3xl hover:bg-white/10"
            />
            <button
              onClick={() => chooseByZone(1)}
              className="absolute left-[35%] top-[25%] h-[63%] w-[30%] rounded-3xl hover:bg-white/10"
            />
            <button
              onClick={() => chooseByZone(2)}
              className="absolute left-[67%] top-[25%] h-[63%] w-[30%] rounded-3xl hover:bg-white/10"
            />

            <button
              onClick={() => setStep("origin")}
              className="absolute bottom-8 left-8 rounded-full bg-white/80 px-6 py-3 text-indigo-950 shadow"
            >
              ← Back
            </button>
          </div>
        )}

        {step === "upgrade" && origin && (
          <div className="relative">
            <img
              src={upgradeImages[origin]}
              className="h-[720px] w-full rounded-[1.5rem] object-cover"
              alt={`${origin} upgrade choices`}
            />

            <button
              onClick={() => chooseByZone(0)}
              className="absolute left-[4%] top-[48%] h-[43%] w-[29%] rounded-3xl hover:bg-white/10"
            />
            <button
              onClick={() => chooseByZone(1)}
              className="absolute left-[35.5%] top-[48%] h-[43%] w-[29%] rounded-3xl hover:bg-white/10"
            />
            <button
              onClick={() => chooseByZone(2)}
              className="absolute left-[67%] top-[48%] h-[43%] w-[29%] rounded-3xl hover:bg-white/10"
            />

            <button
              onClick={() => setStep("body")}
              className="absolute bottom-8 left-8 rounded-full bg-white/80 px-6 py-3 text-indigo-950 shadow"
            >
              ← Back
            </button>
          </div>
        )}

        {step === "final" && (
          <div className="p-10 text-center text-indigo-950">
            <h2 className="text-5xl font-light">Vehicle Complete</h2>

            <div className="mx-auto mt-10 max-w-2xl rounded-3xl bg-indigo-50 p-8 shadow">
              <p className="text-xs tracking-[0.18em] text-indigo-900/50">
                YOUR SKYFORGE BUILD
              </p>

              <h3 className="mt-4 text-3xl font-light">{bodyChoice}</h3>
              <p className="mt-3 text-lg">with</p>
              <h3 className="mt-3 text-3xl font-light">{upgradeChoice}</h3>

              <p className="mt-8 text-sm leading-6 text-indigo-950/70">
                Nova saves this vehicle design to your Inventor Profile. In future, this build can be used for missions, races and exploration across Dreamscape One.
              </p>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => {
                  setStep("origin");
                  setOrigin(null);
                  setBodyChoice("");
                  setUpgradeChoice("");
                }}
                className="w-1/2 rounded-full bg-violet-100 py-3 text-sm tracking-[0.16em] text-indigo-950"
              >
                REBUILD
              </button>

              <button
                onClick={onClose}
                className="w-1/2 rounded-full bg-indigo-950 py-3 text-sm tracking-[0.16em] text-white"
              >
                SAVE VEHICLE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;

      if (i > text.length) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayed}</>;
}

function DialogueBox({
  lines,
  onFinish,
}: {
  lines: string[];
  onFinish: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);

  const isFirstLine = lineIndex === 0;
  const isLastLine = lineIndex === lines.length - 1;

  function nextLine() {
    if (!isLastLine) {
      setLineIndex((current) => current + 1);
    }
  }

  function previousLine() {
    if (!isFirstLine) {
      setLineIndex((current) => current - 1);
    }
  }

  return (
    <div className="absolute bottom-8 left-1/2 z-30 w-[760px] -translate-x-1/2 rounded-3xl bg-white/75 px-8 py-6 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-sm font-medium tracking-[0.18em] text-indigo-900/60">
        NOVA
      </p>

      <p className="min-h-[64px] text-lg font-light leading-8 text-indigo-950">
        <Typewriter text={lines[lineIndex]} />
      </p>

      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={previousLine}
          disabled={isFirstLine}
          className={`rounded-full px-4 py-2 text-sm tracking-wide ${
            isFirstLine
              ? "cursor-not-allowed text-gray-400"
              : "text-indigo-950 hover:bg-white"
          }`}
        >
          ← Back
        </button>

        {!isLastLine ? (
          <button
            onClick={nextLine}
            className="rounded-full px-4 py-2 text-sm tracking-wide text-indigo-950 hover:bg-white"
          >
            Next →
          </button>
        ) : (
          <button
  onClick={onFinish}
  className="rounded-full bg-indigo-950 px-5 py-2 text-sm tracking-wide text-white hover:bg-indigo-900"
>
  Start Exploring
</button>
        )}
      </div>
    </div>
  );
}

function RotatingSpark({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const { scene } = useGLTF("/models/inventor/landmarks/spark.glb");
  const sparkRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (sparkRef.current) {
      sparkRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={sparkRef} position={position} scale={scale}>
      <primitive object={scene.clone()} />
      <pointLight color="#8b5cf6" intensity={2.5} distance={3} />
    </group>
  );
}

export default function InventorWorld() {
  const [activeLandmark, setActiveLandmark] = useState<LandmarkType>(null);
  const [robotActivityOpen, setRobotActivityOpen] = useState(false);
  const [skyforgeActivityOpen, setSkyforgeActivityOpen] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [hubHovered, setHubHovered] = useState(false);
  const router = useRouter();

useEffect(() => {
  const seenInventorIntro = localStorage.getItem("seen-inventor-intro");

  if (!seenInventorIntro) {
    setDialogueOpen(true);
  } else {
    setIntroCompleted(true);
  }
}, []);

  const novaDialogue = [
    "Welcome to Inventor World. Every invention begins with an idea.",
    "Something strange has happened here. The Dream Core that powers our inventions has gone dormant.",
    "To wake it up, we need to find three Innovation Sparks hidden across Inventor World.",
    "The first spark may be inside the Inventor Hub. The second is near the Robot Workshop.",
    "Help me collect them, and we may discover why this dream keeps pulling us here.",
  ];

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-white"
      style={{
        backgroundImage: "url('/backgrounds/dreamscape.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      
    >
      <div className="absolute inset-0 bg-white/10" />

      <TopNav />

      <Link
        href="/"
        className="absolute left-8 top-8 z-30 rounded-full bg-white/75 px-5 py-2 text-sm font-light tracking-wide text-indigo-950 shadow-md backdrop-blur-md transition hover:bg-white"
      >
        ← Back
      </Link>

      <header className="absolute left-0 right-0 top-12 z-20 text-center">
        <p className="text-sm font-light tracking-[0.3em] text-indigo-900/70">
          DREAMSCAPE ONE BY GKDL.CO
        </p>

        <h1 className="mt-4 text-5xl font-extralight tracking-[0.22em] text-indigo-950 drop-shadow-sm">
          INVENTOR WORLD
        </h1>

        <p className="mt-5 text-lg font-light tracking-[0.16em] text-indigo-900/80">
          Create robots, gadgets and future technology.
        </p>
      </header>

      <InfoPanel
        landmark={activeLandmark}
        onClose={() => setActiveLandmark(null)}
      />

      {robotActivityOpen && (
       <RobotWorkshopActivity
          onClose={() => setRobotActivityOpen(false)}
        />
      )}

      {skyforgeActivityOpen && (
        <SkyForgeActivity
          onClose={() => setSkyforgeActivityOpen(false)}
        />
      )}

      {dialogueOpen && (
  <DialogueBox
    lines={novaDialogue}
    onFinish={() => {
      localStorage.setItem("seen-inventor-intro", "true");
      setIntroCompleted(true);
      setDialogueOpen(false);
    }}
  />
)}

      <Canvas
        camera={{ position: [0, 1.4, 6.2], fov: 42 }}
        className="absolute inset-0 z-10"
      >
        <ambientLight intensity={2.2} />
        <directionalLight position={[4, 6, 5]} intensity={2.5} />

        <Suspense fallback={null}>
          <RotatingSpark position={[3.3, -0.5, 0.2]} scale={0.2} />

          <Landmark
            title="SkyForge Hangar"
            subtitle="Build your vehicle"
            onClick={() => {
              if (!introCompleted) return;
              setActiveLandmark(null);
              setSkyforgeActivityOpen(true);
            }}
          >
            <Model
              path="/models/inventor/landmarks/SkyForge-Hangar.glb"
              position={[-3.2, -0.45, -1]}
              scale={1.4}
            />
          </Landmark>

          <Landmark
              title="Inventor Hub"
              subtitle="Nova's supplies and creations"
              onHoverChange={setHubHovered}
              onClick={() => {
                if (!introCompleted) return;
                router.push("/inventor/hub");
              }}
            >
            <Model
              path="/models/inventor/landmarks/INVENTOR HUB.glb"
              position={[0, -1.45, 0]}
              scale={1.9}
            />
          </Landmark>

          <Landmark
            title="Robot Workshop"
            subtitle="Meet Bolt"
            onClick={() => {
  if (!introCompleted) return;
  setActiveLandmark(null);
  setRobotActivityOpen(true);
}}
          >
            <Model
              path="/models/inventor/landmarks/Robot Workshop.glb"
              position={[3.2, -0.45, 0]}
              scale={1.4}
            />
          </Landmark>

          <group
  onClick={() => setDialogueOpen(true)}
  onPointerOver={() => {
    document.body.style.cursor = "pointer";
  }}
  onPointerOut={() => {
    document.body.style.cursor = "default";
  }}
>
  <AnimatedModel
  path="/models/inventor/nova/nova-animated.glb"
  position={[-0.3, -0.9, 0]}
  scale={0.6}
/>

</group>
        </Suspense>

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          zoomSpeed={0.8}
          rotateSpeed={0.6}
          panSpeed={0.6}
        />
      </Canvas>
    </main>
  );
}