"use client";

import { useTexture } from "@react-three/drei";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import TopNav from "../components/topnav";
import PrologueIntro from "@/app/components/PrologueIntro";
import ChapterOneIntro from "@/app/components/ChapterOneIntro";

type Zone = "explorer" | "inventor" | "creator" | null;

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

function ZoneLabel({
  title,
  message,
  hovered,
}: {
  title: string;
  message: string;
  hovered: boolean;
}) {
  return (
    <Html
      position={[0, 1.25, 0]}
      center
      distanceFactor={7}
      style={{ pointerEvents: "none" }}
    >
      <div className="text-center whitespace-nowrap">
        <p className="text-xl font-light tracking-wide text-indigo-950 drop-shadow-sm">
          {title}
        </p>

        <div className="mx-auto mt-3 h-[1px] w-14 bg-violet-500/70" />

        {hovered && (
          <p className="mt-5 rounded-full bg-white/75 px-4 py-2 text-sm font-light text-indigo-950 shadow-md backdrop-blur-md">
            {message}
          </p>
        )}
      </div>
    </Html>
  );
}


function GlowParticles({
  visible,
  color,
}: {
  visible: boolean;
  color: string;
}) {
  if (!visible) return null;

  return (
    <group>
      {Array.from({ length: 80 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const radius = 0.4 + (i % 5) * 0.25;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              -0.5 + (i % 4) * 0.6,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.03, 3, 3]} />
            <meshBasicMaterial color={color} transparent opacity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

function ZoneGroup({
  zone,
  selected,
  setSelected,
  groupPosition,
  labelTitle,
  labelMessage,
  children,
}: {
  zone: Zone;
  selected: Zone;
  setSelected: (zone: Zone) => void;
  groupPosition: [number, number, number];
  labelTitle: string;
  labelMessage: string;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
  if (!groupRef.current) return;

  const targetScale = hovered || selected === zone ? 1.08 : 1;

  groupRef.current.scale.lerp(
    new THREE.Vector3(targetScale, targetScale, targetScale),
    0.12
  );

  // slow island rotation
  groupRef.current.rotation.y += 0.001;
});

  return (
    <group
      ref={groupRef}
      position={groupPosition}
      onClick={() => setSelected(zone)}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
    <GlowParticles
      visible={hovered || selected === zone}
      color={
        zone === "explorer"
          ? "#22c55e"
          : zone === "inventor"
            ? "#a855f7"
            : "#fb923c"
      }
    />
      {children}

      <ZoneLabel
        title={labelTitle}
        message={labelMessage}
        hovered={hovered}
      />

      {(hovered || selected === zone) && (
        <pointLight position={[0, 1.2, 0]} intensity={2.5} distance={4} />
      )}
    </group>
  );
}

function AnimatedAvatarPreview({ path }: { path: string }) {
  const avatarRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(path);
  const { actions } = useAnimations(animations, avatarRef);

  useEffect(() => {
    const names = Object.keys(actions);
    if (names.length === 0) return;

    const action = actions[names[0]];
    action?.reset().play();

    return () => {
      action?.stop();
    };
  }, [actions]);

  return (
    <primitive
      ref={avatarRef}
      object={scene}
      position={[0, -1.7, 0]}
      scale={1.7}
      rotation={[0, Math.PI+1.57+1.57, 0]}
    />
  );
}

function SelectedWorldAvatar({ path }: { path: string }) {
  const avatarRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(path);
  const { actions } = useAnimations(animations, avatarRef);

  useEffect(() => {
    const names = Object.keys(actions);
    if (names.length === 0) return;

    const action = actions[names[0]];
    action?.reset().play();

    return () => {
      action?.stop();
    };
  }, [actions]);

  return (
    <primitive
      ref={avatarRef}
      object={scene}
      position={[0, -1.25, 2.6]}
      scale={0.6}
      rotation={[0, Math.PI, 0]}
    />
  );
}

function AvatarChoice({
  onSelect,
}: {
  onSelect: (avatar: "male" | "female") => void;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70">
      <div className="w-[900px] rounded-3xl bg-white/90 p-8 text-center text-indigo-950 shadow-2xl backdrop-blur-md">
        <p className="text-sm tracking-[0.25em] text-indigo-900/60">
          CHOOSE YOUR AVATAR
        </p>

        <h2 className="mt-3 text-4xl font-light">
          Who will enter Dreamscape?
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <button
            onClick={() => onSelect("male")}
            className="rounded-3xl border border-violet-200 bg-white p-5 shadow-md hover:scale-[1.02]"
          >
            <div className="h-[360px] overflow-hidden rounded-2xl bg-white-50">
              <Canvas camera={{ position: [0, 1.2, 5], fov: 35 }}>
                <ambientLight intensity={2} />
                <directionalLight position={[3, 4, 5]} intensity={2} />
                <Suspense fallback={null}>
                  <AnimatedAvatarPreview path="/models/avatar/avatar-male.glb" />
                </Suspense>
              </Canvas>
            </div>
          </button>

          <button
            onClick={() => onSelect("female")}
            className="rounded-3xl border border-violet-200 bg-white p-5 shadow-md hover:scale-[1.02]"
          >
            <div className="h-[360px] overflow-hidden rounded-2xl bg-white-50">
              <Canvas camera={{ position: [0, 1.2, 5], fov: 35 }}>
                <ambientLight intensity={2} />
                <directionalLight position={[3, 4, 5]} intensity={2} />
                <Suspense fallback={null}>
                  <AnimatedAvatarPreview path="/models/avatar/avatar-female.glb" />
                </Suspense>
              </Canvas>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}


export default function Home() {
  const [selected, setSelected] = useState<Zone>(null);
  const [showChapterOne, setShowChapterOne] = useState(false);
  const [showChapterGuide, setShowChapterGuide] = useState(false);
  const [showAvatarChoice, setShowAvatarChoice] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<"male" | "female" | null>(null);

  const [showPrologue, setShowPrologue] = useState(false);

useEffect(() => {
  const seenPrologue = localStorage.getItem("seen-prologue");
  const seenChapterGuide = localStorage.getItem("seen-chapter-guide");

  if (!seenPrologue) {
    setShowPrologue(true);
  }

  if (!seenChapterGuide) {
    setShowChapterGuide(true);
  }
}, []);

  return (
    
    <main
      className="relative h-screen w-screen overflow-hidden bg-white"
      style={{
        backgroundImage: "url('/backgrounds/dreamscape.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

      {showPrologue && (
        <PrologueIntro
  onFinish={() => {
    localStorage.setItem("seen-prologue", "true");
    setShowPrologue(false);
  }}
/>
      )}

      <button
        onClick={() => {
          localStorage.setItem("seen-chapter-guide", "true");
          setShowChapterGuide(false);
          setShowChapterOne(true);
        }}
        className="absolute bottom-10 right-1 z-40 -translate-x-1/2 rounded-full bg-indigo-950 px-8 py-3 text-sm tracking-[0.18em] text-white shadow-xl"
      >
        BEGIN CHAPTER 1
      </button>

      {showChapterOne && (
        <ChapterOneIntro
          onFinish={() => {
            setShowChapterOne(false);
            setShowAvatarChoice(true);
          }}
        />
      )}

{showAvatarChoice && (
  <AvatarChoice
    onSelect={(avatar) => {
      setSelectedAvatar(avatar);
      localStorage.setItem("selected-avatar", avatar);
      setShowAvatarChoice(false);
    }}
  />
)}


      {showChapterGuide && !showPrologue && !showChapterOne && (
  <>
    <div className="absolute inset-0 z-30 bg-black/60" />

    <div className="absolute bottom-28 right-11/100 z-50 -translate-x-1/2 text-center">
      <div className="mb-4 text-6xl text-white animate-bounce">
        ↓
      </div>
    </div>
  </>
)}

<TopNav />
      <header className="absolute left-0 right-0 top-16 z-20 text-center">
        <h1 className="text-6xl font-extralight tracking-[0.24em] text-indigo-950 drop-shadow-sm">
          DREAMSCAPE ONE
        </h1>

        <p className="mt-6 text-2xl font-light tracking-[0.22em] text-indigo-950/80">
          Explore • Imagine • Create
        </p>

        <p className="mt-6 text-2xl font-light tracking-[0.22em] text-indigo-950/80">
          A world by GKDL.co
        </p>
      </header>
      
      

      {selected && (
  <Link
    href={`/${selected}`}
    className="absolute bottom-10 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/75 px-8 py-3 text-sm font-medium tracking-[0.2em] text-indigo-950 shadow-lg backdrop-blur-md transition hover:bg-white"
  >
    ENTER {selected.toUpperCase()} ZONE
  </Link>
)}

      <Canvas
        camera={{ position: [0, 1.5, 7.5], fov: 42 }}
        className="absolute inset-0 z-10"
      >
        <ambientLight intensity={2.2} />
        <directionalLight position={[4, 6, 5]} intensity={2.5} />

        <Suspense fallback={null}>
          {selectedAvatar && (
        <SelectedWorldAvatar
          path={
            selectedAvatar === "male"
              ? "/models/avatar/avatar-male.glb"
              : "/models/avatar/avatar-female.glb"
          }
        />
      )}
        
            
          <ZoneGroup
            zone="explorer"
            selected={selected}
            setSelected={setSelected}
            groupPosition={[-3.2, -0.7, 0]}
            labelTitle="Explorer World (COMING SOON)"
            labelMessage="Hi, I'm Rex. Discover dinosaurs, oceans and ancient mysteries!"
          >
            <Model
              path="/models/explorer/terrain/Explorer World Terrain.glb"
              position={[0, 0, 0]}
              scale={1.25}
            />
            <Model
              path="/models/explorer/rex/Rex 1.glb"
              position={[0.55, 0.35, 0.35]}
              scale={0.4}
              rotation={[0, Math.PI / 6, 0]}
            />
            <Model
              path="/models/explorer/terrain/campsite.glb"
              position={[-0.32, 0.2, -0.2]}
              scale={0.6}
              rotation={[0, Math.PI / 6, 0]}
            />
          </ZoneGroup>

          <ZoneGroup
            zone="inventor"
            selected={selected}
            setSelected={setSelected}
            groupPosition={[0, -0.7, -0.15]}
            labelTitle="Inventor World"
            labelMessage="Hi, I'm Nova. Create robots, gadgets and future technology!"
          >
            <Model
              path="/models/inventor/terrain/Inventor World.glb"
              position={[0, -0.2, 0]}
              scale={1.25}
            />
            <Model
              path="/models/inventor/nova/Nova 1.glb"
              position={[0, 0.3, 0.4]}
              scale={0.4}
            />
          </ZoneGroup>

          <ZoneGroup
            zone="creator"
            selected={selected}
            setSelected={setSelected}
            groupPosition={[3.25, -0.7, -0.15]}
            labelTitle="Creator World"
            labelMessage="Hi, I'm Milo. Create toys, gifts and products from your imagination!"
          >
            <Model
              path="/models/creator/terrain/Creator World.glb"
              position={[0, -0.15, 0]}
              scale={1.25}
            />
            <Model
              path="/models/creator/milo/Milo 1.glb"
              position={[0, 0.3, 0.4]}
              scale={0.38}
              rotation={[0, -Math.PI / 8, 0]}
            />
          </ZoneGroup>
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