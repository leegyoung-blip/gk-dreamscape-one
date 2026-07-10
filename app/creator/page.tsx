"use client";

import TopNav from "@/app/components/topnav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

type LandmarkType = "singapore" | null;

function Model({
  path,
  position,
  scale,
  rotation = [0, 0, 0],
  animated = false,
}: {
  path: string;
  position: [number, number, number];
  scale: number | [number, number, number];
  rotation?: [number, number, number];
  animated?: boolean;
}) {
  const group = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF(path);

  const clonedScene = useMemo(() => {
    return clone(scene);
  }, [scene]);

  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    if (!animated) return;

    console.log("Animation clips found:", names);

    if (names.length === 0) {
      console.warn("No animations found inside this GLB:", path);
      return;
    }

    const firstAnimation = names[0];

    actions[firstAnimation]?.reset().fadeIn(0.2).play();

    return () => {
      actions[firstAnimation]?.fadeOut(0.2);
    };
  }, [animated, actions, names, path]);

  return (
      <group position={position} scale={scale} rotation={rotation}>
        <group ref={group}>
          <primitive object={clonedScene} />
        </group>
      </group>
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
      if (i > text.length) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayed}</>;
}

function HoverLabel({
  title,
  subtitle,
  visible,
  buttonText,
  onButtonClick,
}: {
  title: string;
  subtitle: string;
  visible: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
}) {
  if (!visible) return null;

  return (
    <Html position={[0, 1, 0]} center distanceFactor={7}>
      <div className="text-center whitespace-nowrap">
        <div className="pointer-events-none">
          <p className="text-xl font-light tracking-wide text-amber-950">
            {title}
          </p>

          <div className="mx-auto mt-3 h-[1px] w-14 bg-orange-400/80" />

          <p className="mt-3 text-sm font-light text-amber-900/80">
            {subtitle}
          </p>
        </div>

        {buttonText && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onButtonClick?.();
            }}
            className="mt-4 rounded-full bg-amber-950 px-5 py-2 text-sm font-semibold tracking-wide text-white shadow-lg transition hover:bg-amber-800"
          >
            {buttonText}
          </button>
        )}
      </div>
    </Html>
  );
}

function Landmark({
  children,
  title,
  subtitle,
  onClick,
  buttonText,
  onButtonClick,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  buttonText?: string;
  onButtonClick?: () => void;
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
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {children}
      <HoverLabel
        title={title}
        subtitle={subtitle}
        visible={hovered}
        buttonText={buttonText}
        onButtonClick={onButtonClick}
      />
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

  return (
    <div className="absolute right-8 top-1/2 z-30 w-80 -translate-y-1/2 rounded-3xl bg-white/80 p-6 text-amber-950 shadow-xl backdrop-blur-md">
      <button
        onClick={onClose}
        className="absolute right-5 top-4 text-sm text-amber-950/60"
      >
        ✕
      </button>

      <h2 className="text-2xl font-light tracking-wide">
        Milo&apos;s Singapore Adventure
      </h2>

      <p className="mt-4 text-sm leading-6 text-amber-950/80">
        Milo dreams of taking a proper holiday through Singapore, collecting
        postcards, memories and travel discoveries.
      </p>

      <p className="mt-5 rounded-2xl bg-orange-100 px-4 py-3 text-sm font-medium">
        Landmark: Singapore travel missions.
      </p>
    </div>
  );
}

function DialogueBox({
  lines,
  onFinish,
}: {
  lines: string[];
  onFinish: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const isLastLine = lineIndex === lines.length - 1;

  return (
    <div className="absolute bottom-8 left-1/2 z-30 w-[760px] -translate-x-1/2 rounded-3xl bg-white/75 px-8 py-6 shadow-xl backdrop-blur-md">
      <p className="mb-2 text-sm font-medium tracking-[0.18em] text-amber-900/60">
        MILO
      </p>

      <p className="min-h-[64px] text-lg font-light leading-8 text-amber-950">
        <Typewriter text={lines[lineIndex]} />
      </p>

      <div className="mt-5 flex justify-end">
        {!isLastLine ? (
          <button
            onClick={() => setLineIndex((current) => current + 1)}
            className="rounded-full px-4 py-2 text-sm tracking-wide text-amber-950 hover:bg-white"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="rounded-full bg-amber-950 px-5 py-2 text-sm tracking-wide text-white hover:bg-amber-900"
          >
            Start Exploring
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreatorWorld() {
  const router = useRouter();

  const [activeLandmark, setActiveLandmark] = useState<LandmarkType>(null);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [dialogueOpen, setDialogueOpen] = useState(false);

  useEffect(() => {
    const seenCreatorIntro = localStorage.getItem("seen-creator-intro");

    if (!seenCreatorIntro) {
      setDialogueOpen(true);
      setIntroCompleted(false);
    } else {
      setDialogueOpen(false);
      setIntroCompleted(true);
    }
  }, []);

  const miloDialogue = [
    "Welcome to Creator World.",
    "I used to spend all my time working on the next big thing.",
    "Then I realised inspiration can come from anywhere — a place, a story, a memory, or even a simple conversation.",
    "So I built this world to collect the things that inspire me.",
    "Maybe you'll discover something that inspires you too.",
    "Come on. Let's explore together.",
  ];

 function loadMyTree() {
  const savedTreeType = localStorage.getItem("dream-tree-type");

  if (savedTreeType === "evergreen") {
    router.push("/creator/dream-tree/evergreen");
    return;
  }

  if (savedTreeType === "circuit") {
    router.push("/creator/dream-tree/circuit");
    return;
  }

  if (savedTreeType === "celestial") {
    router.push("/creator/dream-tree/celestial");
    return;
  }

  router.push("/creator/dream-tree");
}
  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-white"
      style={{
        backgroundImage: "url('/backgrounds/dreamscape.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-orange-50/20" />

      <TopNav />

      <Link
      href="/"
      className="absolute left-8 top-8 z-30 rounded-full bg-white/75 px-5 py-2 text-sm font-light tracking-wide text-amber-950 shadow-md backdrop-blur-md transition hover:bg-white"
    >
      ← Back
    </Link>

    <button
      onClick={loadMyTree}
      className="absolute bottom-8 left-8 z-40 rounded-full bg-amber-950 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-xl transition hover:scale-105 hover:bg-amber-900"
    >
      Load My Tree
    </button>

      <header className="absolute left-0 right-0 top-12 z-20 text-center">
        <p className="text-sm font-light tracking-[0.3em] text-amber-900/70">
          DREAMSCAPE ONE BY GKDL.CO
        </p>

        <h1 className="mt-4 text-5xl font-extralight tracking-[0.22em] text-amber-950 drop-shadow-sm">
          CREATOR WORLD
        </h1>

        <p className="mt-5 text-lg font-light tracking-[0.16em] text-amber-900/80">
          A place for ideas, memories and the things that inspire us
        </p>
      </header>

      <InfoPanel
        landmark={activeLandmark}
        onClose={() => setActiveLandmark(null)}
      />

      {dialogueOpen && (
        <DialogueBox
          lines={miloDialogue}
          onFinish={() => {
            localStorage.setItem("seen-creator-intro", "true");
            setIntroCompleted(true);
            setDialogueOpen(false);
          }}
        />
      )}

      <Canvas
        camera={{ position: [0, 1.4, 6.2], fov: 42 }}
        className="absolute inset-0 z-10"
      >
        <ambientLight intensity={2.3} />
        <directionalLight position={[4, 6, 5]} intensity={2.6} />

        <Suspense fallback={null}>
          <Landmark
            title="The Dream Tree"
            subtitle="Build your dream ecosystem and collect rewards"
            onClick={() => {
              if (!introCompleted) return;
              router.push("/creator/dream-tree");
            }}
          >
            <Model
              path="/models/creator/landmarks/dream-tree.glb"
              position={[-3.2, -0.45, -1]}
              scale={1.3}
            />
          </Landmark>

          <Landmark
            title="The Dreamshop"
            subtitle="Creator World's central hub"
            onClick={() => {
              if (!introCompleted) return;
              router.push("/creator/dreamshop");
            }}
          >
            <Model
              path="/models/creator/landmarks/dreamshop.glb"
              position={[0, -1, -2]}
              scale={2.5}
            />
          </Landmark>

          <Landmark
            title="Milo's Singapore Adventure"
            subtitle="Postcards, food, culture and memories"
            onClick={() => {
              if (!introCompleted) return;
              setActiveLandmark("singapore");
            }}
          >
            <Model
              path="/models/creator/landmarks/singapore-adventure.glb"
              position={[3.5, -0.45, -2]}
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
            <Model
              path="/models/creator/milo/milo-animated.glb"
              position={[0, -1.8, -0.3]}
              scale={0.6}
              rotation={[0, 0, 0]}
              animated
            />
          </group>
        </Suspense>

        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          zoomSpeed={0.8}
          rotateSpeed={0.6}
          panSpeed={0.6}
        />
      </Canvas>
    </main>
  );
}