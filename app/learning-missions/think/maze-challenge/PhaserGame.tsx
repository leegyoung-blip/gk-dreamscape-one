"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const WORLD_WIDTH = 1672;
const WORLD_HEIGHT = 941;

type FacingDirection = "down" | "left" | "right" | "up";

type ThinkForestLevel = 1 | 2;

type ForestObstacleConfig = {
  texture: "large-rocks" | "root-barrier";
  x: number;
  y: number;
  width: number;
  height: number;
  bodyWidth: number;
  bodyHeight: number;
  visible?: boolean;
  centerBody?: boolean;
};

type ForestLevelConfig = {
  level: ThinkForestLevel;
  courseId: string;
  title: string;
  background: string;
  novaSpawn: { x: number; y: number };
  exit: { x: number; y: number };
  obstacles: ForestObstacleConfig[];
  energyCores: Array<{ x: number; y: number }>;
  guardEntries: Array<{ y: number; targetX: number; delay: number }>;
  requiredGearStage: number;
  requiredGearName: string;
  fogClearBrushSize: number;
  fogTransitionBrushSize: number;
};

const FOREST_LEVELS: Record<ThinkForestLevel, ForestLevelConfig> = {
  1: {
    level: 1,
    courseId: "uncharted-forest-01",
    title: "Uncharted Forest",
    background: "/games/think-forest/forest-floor-bg.png",
    novaSpawn: { x: 145, y: WORLD_HEIGHT / 2 },
    exit: { x: WORLD_WIDTH - 132, y: WORLD_HEIGHT / 2 },
    obstacles: [
      {
        texture: "large-rocks",
        x: 430,
        y: 235,
        width: 210,
        height: 180,
        bodyWidth: 150,
        bodyHeight: 92,
      },
      {
        texture: "large-rocks",
        x: 770,
        y: 660,
        width: 225,
        height: 192,
        bodyWidth: 160,
        bodyHeight: 98,
      },
      {
        texture: "large-rocks",
        x: 1110,
        y: 260,
        width: 205,
        height: 176,
        bodyWidth: 148,
        bodyHeight: 90,
      },
      {
        texture: "root-barrier",
        x: 600,
        y: 450,
        width: 310,
        height: 150,
        bodyWidth: 278,
        bodyHeight: 88,
      },
      {
        texture: "root-barrier",
        x: 1000,
        y: 485,
        width: 320,
        height: 154,
        bodyWidth: 288,
        bodyHeight: 90,
      },
      {
        texture: "root-barrier",
        x: 1275,
        y: 735,
        width: 290,
        height: 140,
        bodyWidth: 260,
        bodyHeight: 80,
      },
    ],
    energyCores: [
      { x: 390, y: 745 },
      { x: 860, y: 175 },
      { x: 1270, y: 610 },
    ],
    guardEntries: [
      { y: 185, targetX: 1110, delay: 450 },
      { y: 325, targetX: 1160, delay: 1350 },
      { y: 470, targetX: 1090, delay: 2250 },
      { y: 615, targetX: 1175, delay: 3150 },
      { y: 770, targetX: 1125, delay: 4050 },
    ],
    requiredGearStage: 0,
    requiredGearName: "Explorer Gear",
    fogClearBrushSize: 250,
    fogTransitionBrushSize: 430,
  },
  2: {
    level: 2,
    courseId: "eclipse-ruins-02",
    title: "Eclipse Ruins",
    background: "/games/think-forest/eclipse-ruins-map.png",
    novaSpawn: { x: 180, y: 755 },
    exit: { x: 1460, y: 250 },

    /*
     * Eclipse Ruins uses invisible collision zones that follow collapsed
     * walls, voids and blocked courtyards already painted into the map.
     * This avoids placing forest rocks or roots over the ruined-city art.
     */
    obstacles: [
      {
        texture: "large-rocks",
        x: 420,
        y: 155,
        width: 270,
        height: 180,
        bodyWidth: 270,
        bodyHeight: 180,
        visible: false,
        centerBody: true,
      },
      {
        texture: "large-rocks",
        x: 625,
        y: 275,
        width: 125,
        height: 185,
        bodyWidth: 125,
        bodyHeight: 185,
        visible: false,
        centerBody: true,
      },
      {
        texture: "large-rocks",
        x: 1360,
        y: 160,
        width: 265,
        height: 180,
        bodyWidth: 265,
        bodyHeight: 180,
        visible: false,
        centerBody: true,
      },
      {
        texture: "root-barrier",
        x: 535,
        y: 485,
        width: 150,
        height: 225,
        bodyWidth: 150,
        bodyHeight: 225,
        visible: false,
        centerBody: true,
      },
      {
        texture: "root-barrier",
        x: 1070,
        y: 485,
        width: 155,
        height: 225,
        bodyWidth: 155,
        bodyHeight: 225,
        visible: false,
        centerBody: true,
      },
      {
        texture: "root-barrier",
        x: 815,
        y: 730,
        width: 255,
        height: 125,
        bodyWidth: 255,
        bodyHeight: 125,
        visible: false,
        centerBody: true,
      },
      {
        texture: "large-rocks",
        x: 350,
        y: 840,
        width: 180,
        height: 105,
        bodyWidth: 180,
        bodyHeight: 105,
        visible: false,
        centerBody: true,
      },
      {
        texture: "large-rocks",
        x: 1370,
        y: 750,
        width: 225,
        height: 145,
        bodyWidth: 225,
        bodyHeight: 145,
        visible: false,
        centerBody: true,
      },
      {
        texture: "root-barrier",
        x: 82,
        y: 485,
        width: 95,
        height: 255,
        bodyWidth: 95,
        bodyHeight: 255,
        visible: false,
        centerBody: true,
      },
      {
        texture: "root-barrier",
        x: 1592,
        y: 485,
        width: 92,
        height: 300,
        bodyWidth: 92,
        bodyHeight: 300,
        visible: false,
        centerBody: true,
      },
      {
        texture: "large-rocks",
        x: 830,
        y: 145,
        width: 270,
        height: 78,
        bodyWidth: 270,
        bodyHeight: 78,
        visible: false,
        centerBody: true,
      },
    ],
    energyCores: [
      { x: 235, y: 355 },
      { x: 825, y: 500 },
      { x: 1375, y: 690 },
    ],
    guardEntries: [
      { y: 145, targetX: 1450, delay: 300 },
      { y: 230, targetX: 1330, delay: 900 },
      { y: 325, targetX: 1430, delay: 1500 },
      { y: 415, targetX: 1290, delay: 2100 },
      { y: 505, targetX: 1400, delay: 2700 },
      { y: 595, targetX: 1260, delay: 3300 },
      { y: 685, targetX: 1370, delay: 3900 },
      { y: 775, targetX: 1240, delay: 4500 },
      { y: 360, targetX: 1510, delay: 5100 },
      { y: 650, targetX: 1490, delay: 5700 },
    ],
    requiredGearStage: 1,
    requiredGearName: "Shadow Visor",
    fogClearBrushSize: 370,
    fogTransitionBrushSize: 610,
  },
};

type NovaWalkCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const NOVA_WALK_CROP: Record<FacingDirection, NovaWalkCrop> = {
  down: { x: 0, y: 0, width: 256, height: 256 },
  left: { x: 0, y: 0, width: 256, height: 256 },

  /*
   * The generated right and up rows contain a detached fragment near the
   * bottom edge. These tighter source rectangles remove that fragment.
   * Adjust only these values if the source sheet is regenerated.
   */
  right: { x: 8, y: 0, width: 240, height: 208 },
  up: { x: 8, y: 0, width: 240, height: 208 },
};

/*
 * Two fog layers use the same full-map PNG and two differently sized organic
 * alpha brushes:
 *
 * - The smaller brush removes both fog layers around Nova.
 * - The larger brush removes only the dense layer.
 *
 * This produces a clear centre, a translucent cloudy transition and dense fog
 * across the rest of the map without a rigid circular edge.
 */
// Visibility radius is configured per level so newly unlocked gear can alter it.
const FOG_DENSE_ALPHA = 0.9;
const FOG_LIGHT_ALPHA = 0.38;
const FOG_BREATHING_AMOUNT = 0.025;
const DEFAULT_SFX_VOLUME = 0.76;
const DEFAULT_MUSIC_VOLUME = 0.34;
const ORBIT_DEAD_ZONE = 0.14;

const NOVA_SPEED = 250;
const NOVA_MAX_HEALTH = 5;
const NOVA_ATTACK_DAMAGE = 1;
const NOVA_ATTACK_RANGE = 108;
const NOVA_ATTACK_COOLDOWN_MS = 430;
const NOVA_HURT_INVULNERABILITY_MS = 900;

const BONE_GUARD_SPEED = 82;
const BONE_GUARD_CHASE_SPEED = 118;
const BONE_GUARD_CHASE_RANGE = 330;
const BONE_GUARD_ATTACK_RANGE = 84;
const BONE_GUARD_ATTACK_COOLDOWN_MS = 1050;
const BONE_GUARD_HEALTH = 3;

const TOTAL_CORES = 3;

const ASSET_PATHS = {
  background: "/games/think-forest/forest-floor-bg.png",
  largeRocks: "/games/think-forest/large-rocks.png",
  rootBarrier: "/games/think-forest/root-barrier.png",
  energyCore: "/games/think-forest/energy-core.png",
  exitGate: "/games/think-forest/forest-exit-gate.png",
  fogMap: "/games/think-forest/fog-map.png",
  fogBrush: "/games/think-forest/fog-reveal-brush.png",

  novaAttackSfx: "/games/think-forest/audio/nova-attack.wav",
  novaHitSfx: "/games/think-forest/audio/nova-hit.wav",
  backgroundMusic: "/games/think-forest/audio/dreamkeeper-ambient.wav",

  novaWalk: "/games/think-forest/nova-walk.png",
  novaIdle: "/games/think-forest/nova-idle.png",
  novaAttack: "/games/think-forest/nova-attack.png",
  novaHurt: "/games/think-forest/nova-hurt.png",

  boneWalk: "/games/think-forest/bone-guard-walk.png",
  boneIdle: "/games/think-forest/bone-guard-idle.png",
  boneAttack: "/games/think-forest/bone-guard-attack.png",
  boneHurt: "/games/think-forest/bone-guard-hurt.png",
  boneDefeated: "/games/think-forest/bone-guard-defeated.png",
} as const;

type CharacterHealthBar = {
  background: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  width: number;
};

type BoneGuardData = {
  sprite: Phaser.Physics.Arcade.Sprite;
  health: number;
  facing: FacingDirection;
  spawnX: number;
  spawnY: number;
  entryTargetX: number;
  entryTargetY: number;
  patrolAngle: number;
  patrolDirection: number;
  lastAttackAt: number;
  hurtUntil: number;
  defeated: boolean;
  active: boolean;
  entering: boolean;
  avoidanceX: number;
  avoidanceY: number;
  avoidUntil: number;
  lastX: number;
  lastY: number;
  stuckForMs: number;
  healthBar: CharacterHealthBar;
};

type EnergyCore = {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  glow: Phaser.GameObjects.Arc;
  image: Phaser.GameObjects.Image;
};

type ThinkForestCompletionDetail = {
  courseId: string;
  score: number;
  completionTimeMs: number;
  coresCollected: number;
  guardsDefeated: number;
};

class ThinkForestScene extends Phaser.Scene {
  private readonly levelConfig: ForestLevelConfig;

  private nova?: Phaser.Physics.Arcade.Sprite;
  private obstacleGroup?: Phaser.Physics.Arcade.StaticGroup;
  private boneGuardGroup?: Phaser.Physics.Arcade.Group;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;
  private keyR?: Phaser.Input.Keyboard.Key;
  private keyP?: Phaser.Input.Keyboard.Key;

  private isTouchDevice = false;
  private orbitVector = new Phaser.Math.Vector2(0, 0);
  private orbitPointerId: number | null = null;
  private orbitMoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private orbitUpHandler?: (pointer: Phaser.Input.Pointer) => void;
  private touchAttackRequested = false;

  private facing: FacingDirection = "right";
  private health = NOVA_MAX_HEALTH;
  private collectedCores = 0;
  private defeatedGuards = 0;
  private score = 0;
  private elapsedSeconds = 0;

  private lastNovaAttackAt = -1000;
  private novaHurtUntil = 0;
  private isNovaAttacking = false;
  private hasStarted = false;
  private hasFinished = false;
  private isGameOver = false;
  private resultSubmitted = false;

  private boneGuards: BoneGuardData[] = [];
  private energyCores: EnergyCore[] = [];

  private exitGateImage?: Phaser.GameObjects.Image;
  private exitGlow?: Phaser.GameObjects.Arc;
  private exitLabel?: Phaser.GameObjects.Text;

  private healthLabel?: Phaser.GameObjects.Text;
  private healthBarBackground?: Phaser.GameObjects.Rectangle;
  private healthBarFill?: Phaser.GameObjects.Rectangle;
  private novaWorldHealthBar?: CharacterHealthBar;
  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private energyCoreLabel?: Phaser.GameObjects.Text;
  private energyCoreIcons: Phaser.GameObjects.Image[] = [];
  private objectiveText?: Phaser.GameObjects.Text;

  private denseFog?: Phaser.GameObjects.Image;
  private lightFog?: Phaser.GameObjects.Image;
  private denseFogBrush?: Phaser.GameObjects.Image;
  private lightFogBrush?: Phaser.GameObjects.Image;
  private denseFogMask?: Phaser.Display.Masks.BitmapMask;
  private lightFogMask?: Phaser.Display.Masks.BitmapMask;
  private fogAnimationTime = 0;

  private isPaused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private sfxVolume = DEFAULT_SFX_VOLUME;
  private musicVolume = DEFAULT_MUSIC_VOLUME;
  private backgroundMusic?: Phaser.Sound.BaseSound & {
    setVolume?: (volume: number) => unknown;
    volume?: number;
  };
  private audioStarted = false;
  private audioUnlockHandler?: () => void;
  private pauseSliderMoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pauseSliderUpHandler?: () => void;

  private readonly gearStage: number;

  constructor(level: ThinkForestLevel, gearStage: number) {
    super({ key: `ThinkForestScene-${level}` });
    this.levelConfig = FOREST_LEVELS[level];
    this.gearStage = gearStage;
  }

  preload() {
    this.load.image("forest-background", this.levelConfig.background);
    this.load.image("large-rocks", ASSET_PATHS.largeRocks);
    this.load.image("root-barrier", ASSET_PATHS.rootBarrier);
    this.load.image("energy-core", ASSET_PATHS.energyCore);
    this.load.image("forest-exit-gate", ASSET_PATHS.exitGate);
    this.load.image("fog-map", ASSET_PATHS.fogMap);
    this.load.image("fog-reveal-brush", ASSET_PATHS.fogBrush);
    this.load.audio("nova-attack-sfx", ASSET_PATHS.novaAttackSfx);
    this.load.audio("nova-hit-sfx", ASSET_PATHS.novaHitSfx);
    this.load.audio("background-music", ASSET_PATHS.backgroundMusic);

    this.load.spritesheet("nova-walk", ASSET_PATHS.novaWalk, {
      frameWidth: 256,
      frameHeight: 256,
    });

    this.load.spritesheet("nova-idle", ASSET_PATHS.novaIdle, {
      frameWidth: 313,
      frameHeight: 313,
    });

    this.load.spritesheet("nova-attack", ASSET_PATHS.novaAttack, {
      frameWidth: 313,
      frameHeight: 313,
    });

    this.load.spritesheet("nova-hurt", ASSET_PATHS.novaHurt, {
      frameWidth: 313,
      frameHeight: 313,
    });

    /*
     * The generated Bone Guard walking sheet is 1254 × 1254. That height
     * cannot be divided evenly into four integer rows, so a normal Phaser
     * spritesheet loader cuts alternating rows slightly off. Load it as one
     * image and register exact row boundaries in createAnimations instead.
     */
    this.load.image("bone-walk-sheet", ASSET_PATHS.boneWalk);

    this.load.spritesheet("bone-idle", ASSET_PATHS.boneIdle, {
      frameWidth: 313,
      frameHeight: 313,
    });

    this.load.spritesheet("bone-attack", ASSET_PATHS.boneAttack, {
      frameWidth: 313,
      frameHeight: 313,
    });

    this.load.spritesheet("bone-hurt", ASSET_PATHS.boneHurt, {
      frameWidth: 313,
      frameHeight: 313,
    });

    this.load.spritesheet("bone-defeated", ASSET_PATHS.boneDefeated, {
      frameWidth: 313,
      frameHeight: 313,
    });

    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        console.error(`[Think Forest] Could not load asset: ${file.src}`);
      },
    );
  }

  create() {
    this.resetValues();
    this.isTouchDevice = this.detectTouchDevice();
    this.createBackground();
    this.createAnimations();
    this.createObstacles();
    this.createEnergyCores();
    this.createExitGate();
    this.createNova();
    this.createBoneGuards();
    this.createCollisions();
    this.createFog();

    if (this.isTouchDevice) {
      this.createOrbitControls();
    } else {
      this.createKeyboardControls();
    }

    this.createHud();
    this.createAudio();
    this.configureCamera();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearOrbitHandlers();
      this.backgroundMusic?.stop();
      this.backgroundMusic?.destroy();
      this.backgroundMusic = undefined;
    });

    this.cameras.main.fadeIn(450, 2, 6, 18);
  }

  update(_time: number, delta: number) {
    if (!this.nova) {
      return;
    }

    if (this.keyP && Phaser.Input.Keyboard.JustDown(this.keyP)) {
      if (this.isPaused) {
        this.resumeGame();
      } else {
        this.openPauseMenu();
      }
    }

    if (this.isPaused) {
      return;
    }

    if (this.keyR && Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.restartLevel();
      return;
    }

    if (this.hasStarted && !this.hasFinished && !this.isGameOver) {
      this.elapsedSeconds += delta / 1000;
    }

    if (!this.hasFinished && !this.isGameOver) {
      this.updateNovaMovement();
      this.updateNovaAttack();
      this.updateBoneGuards(delta);
      this.updateEnergyCores(delta);
      this.checkExit();
    } else {
      this.nova.setVelocity(0, 0);
    }

    this.updateFog(delta);
    this.updateDepths();
    this.updateWorldHealthBars();
    this.updateHud();
  }

  private resetValues() {
    this.orbitVector.set(0, 0);
    this.orbitPointerId = null;
    this.touchAttackRequested = false;
    this.facing = "right";
    this.health = NOVA_MAX_HEALTH;
    this.collectedCores = 0;
    this.defeatedGuards = 0;
    this.score = 0;
    this.elapsedSeconds = 0;
    this.lastNovaAttackAt = -1000;
    this.novaHurtUntil = 0;
    this.isNovaAttacking = false;
    this.hasStarted = false;
    this.hasFinished = false;
    this.isGameOver = false;
    this.resultSubmitted = false;
    this.fogAnimationTime = 0;
    this.isPaused = false;
    this.pauseOverlay = undefined;
    this.novaWorldHealthBar = undefined;
    this.energyCoreIcons = [];
    this.audioStarted = false;
    this.boneGuards = [];
    this.energyCores = [];
    this.denseFog = undefined;
    this.lightFog = undefined;
    this.denseFogBrush = undefined;
    this.lightFogBrush = undefined;
    this.denseFogMask = undefined;
    this.lightFogMask = undefined;
    this.sound.volume = 1;
  }

  private createAudio() {
    if (this.cache.audio.exists("background-music")) {
      this.backgroundMusic = this.sound.add("background-music", {
        loop: true,
        volume: this.musicVolume,
      });
    } else {
      console.warn(
        "[Think Forest] Background music was not loaded. Check public/games/think-forest/audio/dreamkeeper-ambient.wav",
      );
    }

    this.audioUnlockHandler = () => {
      this.ensureAudioUnlocked();
    };

    this.input.on("pointerdown", this.audioUnlockHandler);
    this.input.keyboard?.on("keydown", this.audioUnlockHandler);

    /*
     * Browsers often block audio until the first interaction inside the
     * Phaser canvas. The first pointer, keyboard, orbit-pad or attack input
     * will unlock the AudioContext and start the music.
     */
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.audioUnlockHandler) {
        this.input.off("pointerdown", this.audioUnlockHandler);
        this.input.keyboard?.off("keydown", this.audioUnlockHandler);
      }
    });
  }

  private ensureAudioUnlocked(afterUnlock?: () => void) {
    const soundManager = this.sound as Phaser.Sound.BaseSoundManager & {
      locked?: boolean;
      unlock?: () => void;
      context?: AudioContext;
    };

    try {
      if (soundManager.locked && typeof soundManager.unlock === "function") {
        soundManager.unlock();
      }
    } catch (error) {
      console.warn("[Think Forest] Audio unlock failed:", error);
    }

    const finish = () => {
      this.audioStarted = true;

      if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
        this.backgroundMusic.play();
      }

      afterUnlock?.();
    };

    if (soundManager.context?.state === "suspended") {
      void soundManager.context
        .resume()
        .then(finish)
        .catch((error) => {
          console.warn("[Think Forest] AudioContext could not resume:", error);
        });
      return;
    }

    finish();
  }

  private playSfx(key: "nova-attack-sfx" | "nova-hit-sfx") {
    if (!this.cache.audio.exists(key)) {
      console.warn(
        `[Think Forest] Missing sound effect "${key}". Check the files in public/games/think-forest/audio/.`,
      );
      return;
    }

    this.ensureAudioUnlocked(() => {
      this.sound.play(key, {
        volume: this.sfxVolume,
      });
    });
  }

  private applyBackgroundMusicVolume(nextVolume: number) {
    if (!this.backgroundMusic) {
      return;
    }

    if (typeof this.backgroundMusic.setVolume === "function") {
      this.backgroundMusic.setVolume(nextVolume);
      return;
    }

    if ("volume" in this.backgroundMusic) {
      this.backgroundMusic.volume = nextVolume;
    }
  }

  private detectTouchDevice() {
    if (typeof navigator === "undefined") {
      return false;
    }

    return (
      navigator.maxTouchPoints > 0 ||
      window.matchMedia?.("(pointer: coarse)").matches === true
    );
  }

  private createBackground() {
    const background = this.add.image(0, 0, "forest-background");
    background.setOrigin(0, 0);
    background.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
    background.setDepth(-100);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private createFog() {
    if (!this.nova) {
      return;
    }

    /*
     * Draw the complete rectangular fog map twice.
     *
     * Dense fog is removed with the larger brush.
     * Light fog is removed with the smaller brush.
     *
     * Because the brush PNG has an uneven, feathered alpha edge, the reveal
     * boundary follows the cloud shape rather than a mathematical circle.
     */
    this.denseFog = this.add
      .image(0, 0, "fog-map")
      .setOrigin(0)
      .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
      .setAlpha(FOG_DENSE_ALPHA)
      .setTint(0xe8edf1)
      .setDepth(2448);

    this.lightFog = this.add
      .image(0, 0, "fog-map")
      .setOrigin(0)
      .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
      .setAlpha(FOG_LIGHT_ALPHA)
      .setTint(0xf5f7f8)
      .setDepth(2449);

    /*
     * Keep the mask sources behind the map so they never appear as visible
     * white shapes. BitmapMask still reads their alpha channel.
     */
    this.denseFogBrush = this.add
      .image(this.nova.x, this.nova.y, "fog-reveal-brush")
      .setDisplaySize(
        this.levelConfig.fogTransitionBrushSize,
        this.levelConfig.fogTransitionBrushSize,
      )
      .setOrigin(0.5)
      .setDepth(-10000);

    this.lightFogBrush = this.add
      .image(this.nova.x, this.nova.y, "fog-reveal-brush")
      .setDisplaySize(
        this.levelConfig.fogClearBrushSize,
        this.levelConfig.fogClearBrushSize,
      )
      .setOrigin(0.5)
      .setDepth(-9999);

    this.denseFogMask = new Phaser.Display.Masks.BitmapMask(
      this,
      this.denseFogBrush,
    );
    this.denseFogMask.invertAlpha = true;

    this.lightFogMask = new Phaser.Display.Masks.BitmapMask(
      this,
      this.lightFogBrush,
    );
    this.lightFogMask.invertAlpha = true;

    this.denseFog.setMask(this.denseFogMask);
    this.lightFog.setMask(this.lightFogMask);

    this.updateFog(0);
  }

  private updateFog(delta: number) {
    if (
      !this.nova ||
      !this.denseFog ||
      !this.lightFog ||
      !this.denseFogBrush ||
      !this.lightFogBrush
    ) {
      return;
    }

    this.fogAnimationTime += delta / 1000;

    this.denseFogBrush.setPosition(this.nova.x, this.nova.y);
    this.lightFogBrush.setPosition(this.nova.x, this.nova.y);

    /*
     * Very slight independent rotation and scale changes stop the feathered
     * perimeter from looking frozen while keeping the cleared area centred on
     * Nova.
     */
    this.denseFogBrush.setRotation(
      Math.sin(this.fogAnimationTime * 0.14) * 0.08,
    );
    this.lightFogBrush.setRotation(
      -Math.sin(this.fogAnimationTime * 0.19) * 0.06,
    );

    const densePulse =
      1 + Math.sin(this.fogAnimationTime * 0.32) * FOG_BREATHING_AMOUNT;
    const lightPulse =
      1 + Math.cos(this.fogAnimationTime * 0.38) * FOG_BREATHING_AMOUNT;

    this.denseFogBrush.setDisplaySize(
      this.levelConfig.fogTransitionBrushSize * densePulse,
      this.levelConfig.fogTransitionBrushSize * densePulse,
    );
    this.lightFogBrush.setDisplaySize(
      this.levelConfig.fogClearBrushSize * lightPulse,
      this.levelConfig.fogClearBrushSize * lightPulse,
    );

    /*
     * A subtle opacity drift gives the full rectangular fog map some life
     * without moving it far enough to expose its outer edges.
     */
    this.denseFog.setAlpha(
      FOG_DENSE_ALPHA +
        Math.sin(this.fogAnimationTime * 0.17) * 0.025,
    );
    this.lightFog.setAlpha(
      FOG_LIGHT_ALPHA +
        Math.cos(this.fogAnimationTime * 0.22) * 0.02,
    );
  }

  private createAnimations() {
    const directions: FacingDirection[] = [
      "down",
      "left",
      "right",
      "up",
    ];

    this.registerUnevenGridFrames(
      "bone-walk-sheet",
      "bone-walk-frame",
      6,
      4,
    );

    directions.forEach((direction, row) => {
      this.createAnimation(
        `nova-walk-${direction}`,
        "nova-walk",
        row * 6,
        row * 6 + 5,
        10,
        -1,
      );

      this.createAnimation(
        `nova-idle-${direction}`,
        "nova-idle",
        row * 4,
        row * 4 + 3,
        5,
        -1,
      );

      this.createAnimation(
        `nova-attack-${direction}`,
        "nova-attack",
        row * 4,
        row * 4 + 3,
        12,
        0,
      );

      this.createAnimation(
        `nova-hurt-${direction}`,
        "nova-hurt",
        row * 4,
        row * 4 + 3,
        11,
        0,
      );

      this.createNamedFrameAnimation(
        `bone-walk-${direction}`,
        "bone-walk-sheet",
        Array.from(
          { length: 6 },
          (_, column) => `bone-walk-frame-${row}-${column}`,
        ),
        8,
        -1,
      );

      this.createAnimation(
        `bone-idle-${direction}`,
        "bone-idle",
        row * 4,
        row * 4 + 3,
        5,
        -1,
      );

      this.createAnimation(
        `bone-attack-${direction}`,
        "bone-attack",
        row * 4,
        row * 4 + 3,
        10,
        0,
      );

      this.createAnimation(
        `bone-hurt-${direction}`,
        "bone-hurt",
        row * 4,
        row * 4 + 3,
        10,
        0,
      );

      this.createAnimation(
        `bone-defeated-${direction}`,
        "bone-defeated",
        row * 4,
        row * 4 + 3,
        8,
        0,
      );
    });
  }

  private registerUnevenGridFrames(
    textureKey: string,
    framePrefix: string,
    columns: number,
    rows: number,
  ) {
    const texture = this.textures.get(textureKey);
    const source = texture.getSourceImage() as {
      width: number;
      height: number;
    };

    for (let row = 0; row < rows; row += 1) {
      const top = Math.round((row * source.height) / rows);
      const bottom = Math.round(((row + 1) * source.height) / rows);

      for (let column = 0; column < columns; column += 1) {
        const left = Math.round((column * source.width) / columns);
        const right = Math.round(((column + 1) * source.width) / columns);
        const frameName = `${framePrefix}-${row}-${column}`;

        if (!texture.has(frameName)) {
          texture.add(
            frameName,
            0,
            left,
            top,
            right - left,
            bottom - top,
          );
        }
      }
    }
  }

  private createNamedFrameAnimation(
    key: string,
    texture: string,
    frameNames: string[],
    frameRate: number,
    repeat: number,
  ) {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: frameNames.map((frame) => ({
        key: texture,
        frame,
      })),
      frameRate,
      repeat,
    });
  }

  private createAnimation(
    key: string,
    texture: string,
    start: number,
    end: number,
    frameRate: number,
    repeat: number,
  ) {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(texture, {
        start,
        end,
      }),
      frameRate,
      repeat,
    });
  }

  private createObstacles() {
    this.obstacleGroup = this.physics.add.staticGroup();

    const obstacles = this.levelConfig.obstacles;

    obstacles.forEach((obstacle) => {
      const image = this.obstacleGroup!.create(
        obstacle.x,
        obstacle.y,
        obstacle.texture,
      ) as Phaser.Physics.Arcade.Image;

      image.setDisplaySize(obstacle.width, obstacle.height);
      image.setDepth(obstacle.y + 45);
      image.setAlpha(obstacle.visible === false ? 0 : 1);
      image.refreshBody();

      const body = image.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(obstacle.bodyWidth, obstacle.bodyHeight);
      body.setOffset(
        (obstacle.width - obstacle.bodyWidth) / 2,
        obstacle.centerBody
          ? (obstacle.height - obstacle.bodyHeight) / 2
          : obstacle.height - obstacle.bodyHeight - 8,
      );
    });
  }

  private createNova() {
    const nova = this.physics.add.sprite(
      this.levelConfig.novaSpawn.x,
      this.levelConfig.novaSpawn.y,
      "nova-idle",
      8,
    );

    nova.setDisplaySize(118, 118);
    nova.setCollideWorldBounds(true);
    nova.setDepth(nova.y + 100);

    const body = nova.body as Phaser.Physics.Arcade.Body;
    body.setSize(44, 54);
    body.setOffset(106, 178);

    this.nova = nova;
    this.novaWorldHealthBar = this.createWorldHealthBar(64, 0x64e7ff);

    nova.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (animation: Phaser.Animations.Animation) => {
        if (animation.key.startsWith("nova-walk-")) {
          this.applyNovaWalkCrop();
        }
      },
    );

    this.showStaticNovaIdleFrame();
  }

  private createBoneGuards() {
    this.boneGuardGroup = this.physics.add.group();

    const guardEntries = this.levelConfig.guardEntries;

    guardEntries.forEach((entry, index) => {
      const spawnX = GAME_WIDTH + 95;

      const sprite = this.physics.add.sprite(
        spawnX,
        entry.y,
        "bone-idle",
        4,
      );

      sprite.setDisplaySize(112, 112);
      sprite.setCollideWorldBounds(true);
      sprite.setDepth(sprite.y + 100);
      sprite.setVisible(false);
      sprite.disableBody(true, true);

      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(46, 52);
      body.setOffset(132, 178);

      this.boneGuardGroup!.add(sprite);

      const healthBar = this.createWorldHealthBar(58, 0xff7187);
      healthBar.background.setVisible(false);
      healthBar.fill.setVisible(false);

      const guard: BoneGuardData = {
        sprite,
        health: BONE_GUARD_HEALTH,
        facing: "left",
        spawnX: entry.targetX,
        spawnY: entry.y,
        entryTargetX: entry.targetX,
        entryTargetY: entry.y,
        patrolAngle: index * 1.27,
        patrolDirection: index % 2 === 0 ? 1 : -1,
        lastAttackAt: -1000,
        hurtUntil: 0,
        defeated: false,
        active: false,
        entering: true,
        avoidanceX: 0,
        avoidanceY: 0,
        avoidUntil: 0,
        lastX: spawnX,
        lastY: entry.y,
        stuckForMs: 0,
        healthBar,
      };

      this.boneGuards.push(guard);

      this.time.delayedCall(entry.delay, () => {
        if (this.hasFinished || this.isGameOver || guard.defeated) {
          return;
        }

        guard.active = true;
        guard.entering = true;
        guard.sprite.enableBody(true, spawnX, entry.y, true, true);
        guard.healthBar.background.setVisible(true);
        guard.healthBar.fill.setVisible(true);
        guard.sprite.setVelocity(-BONE_GUARD_SPEED, 0);
        this.playBoneAnimation(guard.sprite, "walk", "left");
      });
    });
  }

  private createCollisions() {
    if (!this.obstacleGroup || !this.nova) {
      return;
    }

    this.physics.add.collider(this.nova, this.obstacleGroup);

    if (this.boneGuardGroup) {
      this.physics.add.collider(
        this.boneGuardGroup,
        this.obstacleGroup,
        (guardObject, obstacleObject) => {
          this.handleGuardObstacleCollision(
            guardObject as Phaser.Physics.Arcade.Sprite,
            obstacleObject as Phaser.Physics.Arcade.Image,
          );
        },
      );
    }
  }

  private createEnergyCores() {
    const positions = this.levelConfig.energyCores;

    positions.forEach((position, index) => {
      const glow = this.add.circle(
        position.x,
        position.y,
        46,
        0x5defff,
        0.16,
      );

      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(position.y + 25);

      const image = this.add.image(position.x, position.y, "energy-core");
      image.setDisplaySize(88, 88);
      image.setDepth(position.y + 35);

      this.energyCores.push({
        id: index + 1,
        x: position.x,
        y: position.y,
        collected: false,
        glow,
        image,
      });
    });
  }

  private createExitGate() {
    const x = this.levelConfig.exit.x;
    const y = this.levelConfig.exit.y;

    const glow = this.add.circle(x, y, 82, 0x7ee8ff, 0.08);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(y + 10);

    const gate = this.add.image(x, y, "forest-exit-gate");
    gate.setDisplaySize(178, 178);
    gate.setDepth(y + 40);
    gate.setTint(0x75808f);
    gate.setAlpha(0.78);

    const label = this.add
      .text(
        x,
        y - 112,
        this.levelConfig.level === 2
          ? "ECLIPSE GATE LOCKED"
          : "FOREST EXIT LOCKED",
        {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#9fb4c6",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(y + 60);

    this.exitGateImage = gate;
    this.exitGlow = glow;
    this.exitLabel = label;
  }

  private createKeyboardControls() {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.R,
      Phaser.Input.Keyboard.KeyCodes.P,
    ]);
  }

  private createHud() {
    const leftPanel = this.add.rectangle(24, 22, 320, 104, 0x030916, 0.84);
    leftPanel.setOrigin(0, 0);
    leftPanel.setStrokeStyle(1, 0x7ee8ff, 0.24);
    leftPanel.setScrollFactor(0);
    leftPanel.setDepth(3000);

    this.healthLabel = this.add
      .text(46, 43, "HEALTH", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ff9fae",
      })
      .setScrollFactor(0)
      .setDepth(3001);

    this.healthBarBackground = this.add
      .rectangle(136, 56, 148, 16, 0x243044, 0.95)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x91a7c2, 0.35)
      .setScrollFactor(0)
      .setDepth(3001);

    this.healthBarFill = this.add
      .rectangle(136, 56, 148, 12, 0xff8ea1, 0.98)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(3002);

    this.energyCoreLabel = this.add
      .text(46, 78, "ENERGY CORES", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#a8f8ff",
      })
      .setScrollFactor(0)
      .setDepth(3001);

    const coreIconStartX = 188;
    for (let index = 0; index < TOTAL_CORES; index += 1) {
      const icon = this.add.image(coreIconStartX + index * 36, 86, "energy-core");
      icon.setDisplaySize(26, 26);
      icon.setAlpha(0.22);
      icon.setTint(0x5d7088);
      icon.setScrollFactor(0);
      icon.setDepth(3002);
      this.energyCoreIcons.push(icon);
    }

    const rightPanel = this.add.rectangle(
      GAME_WIDTH - 280,
      22,
      256,
      104,
      0x030916,
      0.82,
    );

    rightPanel.setOrigin(0, 0);
    rightPanel.setStrokeStyle(1, 0x7ee8ff, 0.2);
    rightPanel.setScrollFactor(0);
    rightPanel.setDepth(3000);

    this.timerText = this.add
      .text(GAME_WIDTH - 254, 43, "TIME  00:00.0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(3001);

    this.scoreText = this.add
      .text(GAME_WIDTH - 254, 78, "SCORE  0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#7ee8ff",
      })
      .setScrollFactor(0)
      .setDepth(3001);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 30,
        this.isTouchDevice
          ? "ORBIT PAD  MOVE     ATTACK BUTTON  STRIKE     PAUSE BUTTON  MENU"
          : "WASD / ARROWS  MOVE     SPACE  ATTACK     P  PAUSE     R  RESTART",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "rgba(255,255,255,0.72)",
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3001);

    this.createPauseButton();
  }

  private createPauseButton() {
    const x = GAME_WIDTH / 2;
    const y = 44;

    const button = this.add.rectangle(x, y, 132, 42, 0x030916, 0.9);
    button.setStrokeStyle(1, 0x7ee8ff, 0.42);
    button.setScrollFactor(0);
    button.setDepth(3200);
    button.setInteractive({ useHandCursor: true });

    const label = this.add
      .text(x, y, "Ⅱ  PAUSE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#d9fbff",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3201);

    button.on("pointerover", () => {
      button.setFillStyle(0x16445c, 0.96);
      label.setColor("#ffffff");
    });

    button.on("pointerout", () => {
      button.setFillStyle(0x030916, 0.9);
      label.setColor("#d9fbff");
    });

    button.on("pointerdown", () => {
      if (!this.isPaused && !this.hasFinished && !this.isGameOver) {
        this.openPauseMenu();
      }
    });
  }

  private openPauseMenu() {
    if (this.isPaused || this.pauseOverlay) {
      return;
    }

    this.isPaused = true;
    this.physics.world.pause();
    this.anims.pauseAll();
    this.tweens.pauseAll();
    this.sound.pauseAll();
    this.time.paused = true;
    this.orbitVector.set(0, 0);

    const objects: Phaser.GameObjects.GameObject[] = [];

    const shade = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x020611,
        0.8,
      )
      .setScrollFactor(0)
      .setInteractive();

    const panel = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        740,
        590,
        0x071326,
        0.98,
      )
      .setScrollFactor(0);
    panel.setStrokeStyle(2, 0x7ee8ff, 0.44);

    const title = this.add
      .text(GAME_WIDTH / 2, 100, "LEVEL PAUSED", {
        fontFamily: "Arial, sans-serif",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#9bf4ff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const instructions = this.add
      .text(
        GAME_WIDTH / 2,
        155,
        [
          "INSTRUCTIONS",
          "• Recover all three Energy Cores.",
          "• Avoid or defeat the Bone Guards.",
          "• Reach the Exit Gate after all cores are collected.",
          this.isTouchDevice
            ? "• Move with the Orbit Control and tap Attack to strike."
            : "• Move with WASD / arrow keys and attack with Space.",
        ].join("\n"),
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#d3deed",
          lineSpacing: 8,
          align: "left",
          wordWrap: { width: 580 },
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    const sliderX = GAME_WIDTH / 2 - 205;
    const sliderWidth = 410;
    let draggingSlider: "sfx" | "music" | null = null;

    const createVolumeSlider = (
      kind: "sfx" | "music",
      y: number,
      titleText: string,
      initialVolume: number,
      colour: number,
    ) => {
      const label = this.add
        .text(
          GAME_WIDTH / 2,
          y - 30,
          `${titleText}  ${Math.round(initialVolume * 100)}%`,
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            fontStyle: "bold",
            color: "#d9fbff",
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0);

      const track = this.add
        .rectangle(sliderX, y, sliderWidth, 10, 0xffffff, 0.13)
        .setOrigin(0, 0.5)
        .setScrollFactor(0);

      const fill = this.add
        .rectangle(
          sliderX,
          y,
          sliderWidth * initialVolume,
          10,
          colour,
          0.92,
        )
        .setOrigin(0, 0.5)
        .setScrollFactor(0);

      const knob = this.add
        .circle(
          sliderX + sliderWidth * initialVolume,
          y,
          14,
          0xd9fbff,
          1,
        )
        .setScrollFactor(0);

      const zone = this.add
        .zone(sliderX, y, sliderWidth, 44)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      const update = (pointer: Phaser.Input.Pointer) => {
        const nextVolume = Phaser.Math.Clamp(
          (pointer.x - sliderX) / sliderWidth,
          0,
          1,
        );

        if (kind === "sfx") {
          this.sfxVolume = nextVolume;
        } else {
          this.musicVolume = nextVolume;
          this.applyBackgroundMusicVolume(nextVolume);
        }

        fill.displayWidth = sliderWidth * nextVolume;
        knob.x = sliderX + sliderWidth * nextVolume;
        label.setText(`${titleText}  ${Math.round(nextVolume * 100)}%`);
      };

      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        draggingSlider = kind;
        update(pointer);
      });

      return { objects: [label, track, fill, knob, zone], update };
    };

    const sfxSlider = createVolumeSlider(
      "sfx",
      355,
      "SOUND EFFECTS",
      this.sfxVolume,
      0x60f0d0,
    );
    const musicSlider = createVolumeSlider(
      "music",
      435,
      "BACKGROUND MUSIC",
      this.musicVolume,
      0x8b7cff,
    );

    this.pauseSliderMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      if (draggingSlider === "sfx") sfxSlider.update(pointer);
      if (draggingSlider === "music") musicSlider.update(pointer);
    };

    this.pauseSliderUpHandler = () => {
      draggingSlider = null;
    };

    this.input.on("pointermove", this.pauseSliderMoveHandler);
    this.input.on("pointerup", this.pauseSliderUpHandler);

    const resumeButton = this.createPauseMenuAction(
      GAME_WIDTH / 2 - 145,
      560,
      "RESUME",
      () => this.resumeGame(),
      0x16445c,
    );

    const restartButton = this.createPauseMenuAction(
      GAME_WIDTH / 2 + 145,
      560,
      "RESTART LEVEL",
      () => this.restartLevel(),
      0x5b2634,
    );

    objects.push(
      shade,
      panel,
      title,
      instructions,
      ...sfxSlider.objects,
      ...musicSlider.objects,
      ...resumeButton,
      ...restartButton,
    );

    this.pauseOverlay = this.add.container(0, 0, objects);
    this.pauseOverlay.setScrollFactor(0);
    this.pauseOverlay.setDepth(6000);
  }

  private createPauseMenuAction(
    x: number,
    y: number,
    labelText: string,
    onPress: () => void,
    colour: number,
  ) {
    const button = this.add
      .rectangle(x, y, 240, 54, colour, 0.95)
      .setScrollFactor(0);
    button.setStrokeStyle(1, 0x7ee8ff, 0.45);
    button.setInteractive({ useHandCursor: true });

    const label = this.add
      .text(x, y, labelText, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    button.on("pointerdown", onPress);

    return [button, label];
  }

  private clearPauseOverlay() {
    if (this.pauseSliderMoveHandler) {
      this.input.off("pointermove", this.pauseSliderMoveHandler);
      this.pauseSliderMoveHandler = undefined;
    }

    if (this.pauseSliderUpHandler) {
      this.input.off("pointerup", this.pauseSliderUpHandler);
      this.pauseSliderUpHandler = undefined;
    }

    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = undefined;
  }

  private resumeGame() {
    if (!this.isPaused) {
      return;
    }

    this.clearPauseOverlay();
    this.time.paused = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.sound.resumeAll();
    this.physics.world.resume();
    this.isPaused = false;
  }

  private restartLevel() {
    this.clearPauseOverlay();
    this.orbitVector.set(0, 0);
    this.time.paused = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.sound.resumeAll();
    this.physics.world.resume();
    this.isPaused = false;
    this.scene.restart();
  }

  private createOrbitControls() {
    this.input.addPointer(4);

    const baseX = 118;
    const baseY = GAME_HEIGHT - 112;
    const baseRadius = 66;
    const travelRadius = 43;

    const base = this.add
      .circle(baseX, baseY, baseRadius, 0x071326, 0.72)
      .setScrollFactor(0)
      .setDepth(3100);
    base.setStrokeStyle(2, 0x7ee8ff, 0.42);

    this.add
      .text(baseX, baseY - 88, "ORBIT CONTROL", {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "rgba(217,251,255,0.72)",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3101);

    const knob = this.add
      .circle(baseX, baseY, 27, 0x4bbdd9, 0.9)
      .setScrollFactor(0)
      .setDepth(3102);
    knob.setStrokeStyle(2, 0xd9fbff, 0.7);

    const zone = this.add
      .zone(baseX, baseY, 190, 190)
      .setScrollFactor(0)
      .setDepth(3103)
      .setInteractive({ useHandCursor: true });

    const updateOrbit = (pointer: Phaser.Input.Pointer) => {
      const offset = new Phaser.Math.Vector2(
        pointer.x - baseX,
        pointer.y - baseY,
      );

      if (offset.length() > travelRadius) {
        offset.setLength(travelRadius);
      }

      knob.setPosition(baseX + offset.x, baseY + offset.y);

      const normalized = new Phaser.Math.Vector2(
        offset.x / travelRadius,
        offset.y / travelRadius,
      );

      if (normalized.length() < ORBIT_DEAD_ZONE) {
        this.orbitVector.set(0, 0);
      } else {
        this.orbitVector.copy(normalized);
      }
    };

    const releaseOrbit = (pointer: Phaser.Input.Pointer) => {
      if (
        this.orbitPointerId !== null &&
        pointer.id !== this.orbitPointerId
      ) {
        return;
      }

      this.orbitPointerId = null;
      this.orbitVector.set(0, 0);
      knob.setPosition(baseX, baseY);
    };

    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.orbitPointerId = pointer.id;
      updateOrbit(pointer);
    });

    this.orbitMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (
        this.orbitPointerId === pointer.id &&
        pointer.isDown
      ) {
        updateOrbit(pointer);
      }
    };

    this.orbitUpHandler = releaseOrbit;
    this.input.on("pointermove", this.orbitMoveHandler);
    this.input.on("pointerup", this.orbitUpHandler);

    const attack = this.add.circle(
      GAME_WIDTH - 92,
      GAME_HEIGHT - 116,
      50,
      0x071326,
      0.78,
    );

    attack.setStrokeStyle(2, 0x7ee8ff, 0.58);
    attack.setScrollFactor(0);
    attack.setDepth(3100);
    attack.setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH - 92, GAME_HEIGHT - 116, "ATTACK", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#d9fbff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3101);

    attack.on("pointerdown", () => {
      attack.setFillStyle(0x17455b, 0.96);
      attack.setScale(0.94);
      this.touchAttackRequested = true;
    });

    const releaseAttack = () => {
      attack.setFillStyle(0x071326, 0.78);
      attack.setScale(1);
    };

    attack.on("pointerup", releaseAttack);
    attack.on("pointerout", releaseAttack);
    attack.on("pointerupoutside", releaseAttack);
  }

  private clearOrbitHandlers() {
    if (this.orbitMoveHandler) {
      this.input.off("pointermove", this.orbitMoveHandler);
      this.orbitMoveHandler = undefined;
    }

    if (this.orbitUpHandler) {
      this.input.off("pointerup", this.orbitUpHandler);
      this.orbitUpHandler = undefined;
    }

    this.orbitPointerId = null;
    this.orbitVector.set(0, 0);
  }

  private configureCamera() {
    if (!this.nova) {
      return;
    }

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.nova, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(220, 150);
    this.cameras.main.setZoom(1);
  }

  private updateNovaMovement() {
    if (!this.nova) {
      return;
    }

    if (this.time.now < this.novaHurtUntil || this.isNovaAttacking) {
      this.nova.setVelocity(0, 0);
      return;
    }

    let horizontal = this.isTouchDevice ? this.orbitVector.x : 0;
    let vertical = this.isTouchDevice ? this.orbitVector.y : 0;

    if (
      !this.isTouchDevice &&
      this.cursors &&
      this.keyW &&
      this.keyA &&
      this.keyS &&
      this.keyD
    ) {
      if (this.cursors.left.isDown || this.keyA.isDown) horizontal -= 1;
      if (this.cursors.right.isDown || this.keyD.isDown) horizontal += 1;
      if (this.cursors.up.isDown || this.keyW.isDown) vertical -= 1;
      if (this.cursors.down.isDown || this.keyS.isDown) vertical += 1;
    }

    const movement = new Phaser.Math.Vector2(horizontal, vertical);

    if (movement.lengthSq() > 0.01) {
      movement.normalize().scale(NOVA_SPEED);
      this.nova.setVelocity(movement.x, movement.y);
      this.hasStarted = true;

      this.facing = this.directionFromVector(movement.x, movement.y);
      this.nova.play(`nova-walk-${this.facing}`, true);
      this.nova.setDisplaySize(118, 118);
      this.applyNovaWalkCrop();
    } else {
      this.nova.setVelocity(0, 0);
      this.showStaticNovaIdleFrame();
    }
  }

  private showStaticNovaIdleFrame() {
    if (!this.nova) {
      return;
    }

    const frameByDirection: Record<FacingDirection, number> = {
      down: 0,
      left: 4,
      right: 8,
      up: 12,
    };

    this.nova.anims.stop();
    this.nova.setCrop();
    this.nova.setTexture("nova-idle", frameByDirection[this.facing]);
    this.nova.setDisplaySize(118, 118);
  }

  private applyNovaWalkCrop() {
    if (!this.nova) {
      return;
    }

    const crop = NOVA_WALK_CROP[this.facing];

    this.nova.setDisplaySize(118, 118);

    if (
      crop.x === 0 &&
      crop.y === 0 &&
      crop.width === 256 &&
      crop.height === 256
    ) {
      this.nova.setCrop();
      return;
    }

    this.nova.setCrop(
      crop.x,
      crop.y,
      crop.width,
      crop.height,
    );
  }

  private updateNovaAttack() {
    if (!this.nova) {
      return;
    }

    const keyboardAttackPressed =
      Boolean(this.keySpace) &&
      Phaser.Input.Keyboard.JustDown(this.keySpace!);
    const attackPressed =
      keyboardAttackPressed || this.touchAttackRequested;

    this.touchAttackRequested = false;

    if (!attackPressed || this.isNovaAttacking) {
      return;
    }

    if (this.time.now - this.lastNovaAttackAt < NOVA_ATTACK_COOLDOWN_MS) {
      return;
    }

    if (this.time.now < this.novaHurtUntil) {
      return;
    }

    this.hasStarted = true;
    this.isNovaAttacking = true;
    this.lastNovaAttackAt = this.time.now;
    this.nova.setVelocity(0, 0);
    this.nova.setCrop();
    this.nova.play(`nova-attack-${this.facing}`, true);
    this.playSfx("nova-attack-sfx");

    this.time.delayedCall(105, () => {
      this.applyNovaAttackDamage();
    });

    this.nova.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isNovaAttacking = false;

      if (!this.isGameOver && !this.hasFinished) {
        this.showStaticNovaIdleFrame();
      }
    });
  }

  private applyNovaAttackDamage() {
    if (!this.nova) {
      return;
    }

    const attackPoint = this.getPointInFront(
      this.nova.x,
      this.nova.y,
      this.facing,
      58,
    );

    const flash = this.add.circle(
      attackPoint.x,
      attackPoint.y,
      42,
      0x5defff,
      0.22,
    );

    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setDepth(2500);

    this.tweens.add({
      targets: flash,
      scale: 1.6,
      alpha: 0,
      duration: 170,
      onComplete: () => flash.destroy(),
    });

    this.boneGuards.forEach((guard) => {
      if (
        !guard.active ||
        guard.defeated ||
        this.time.now < guard.hurtUntil
      ) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        attackPoint.x,
        attackPoint.y,
        guard.sprite.x,
        guard.sprite.y,
      );

      if (distance > NOVA_ATTACK_RANGE) {
        return;
      }

      guard.health -= NOVA_ATTACK_DAMAGE;
      guard.hurtUntil = this.time.now + 360;
      guard.sprite.setVelocity(0, 0);
      this.playBoneAnimation(guard.sprite, "hurt", guard.facing, false);

      const knockback = new Phaser.Math.Vector2(
        guard.sprite.x - this.nova!.x,
        guard.sprite.y - this.nova!.y,
      );

      if (knockback.lengthSq() > 0) {
        knockback.normalize().scale(125);
        guard.sprite.setVelocity(knockback.x, knockback.y);
      }

      if (guard.health <= 0) {
        this.defeatBoneGuard(guard);
      } else {
        this.score += 50;
      }
    });
  }

  private playBoneAnimation(
    sprite: Phaser.Physics.Arcade.Sprite,
    action: "walk" | "idle" | "attack" | "hurt" | "defeated",
    direction: FacingDirection,
    ignoreIfPlaying = true,
  ) {
    const animationKey = `bone-${action}-${direction}`;

    sprite.play(animationKey, ignoreIfPlaying);

    /*
     * Walk frames are narrower than the idle/attack sheets. Re-applying the
     * same display size after every animation switch prevents guards from
     * shrinking, stretching or flickering between animation types.
     */
    sprite.setDisplaySize(112, 112);
  }

  private updateBoneGuards(delta: number) {
    if (!this.nova) {
      return;
    }

    this.boneGuards.forEach((guard) => {
      if (!guard.active || guard.defeated) {
        return;
      }

      if (this.time.now < guard.avoidUntil) {
        guard.sprite.setVelocity(guard.avoidanceX, guard.avoidanceY);
        guard.facing = this.directionFromVector(
          guard.avoidanceX,
          guard.avoidanceY,
        );
        this.playBoneAnimation(guard.sprite, "walk", guard.facing);
        this.trackGuardMovement(guard, delta);
        return;
      }

      if (guard.entering) {
        const entranceMovement = new Phaser.Math.Vector2(
          guard.entryTargetX - guard.sprite.x,
          guard.entryTargetY - guard.sprite.y,
        );

        if (entranceMovement.length() <= 12) {
          guard.sprite.setPosition(
            guard.entryTargetX,
            guard.entryTargetY,
          );
          guard.sprite.setVelocity(0, 0);
          guard.entering = false;
          this.playBoneAnimation(guard.sprite, "idle", "left");
        } else {
          entranceMovement.normalize().scale(BONE_GUARD_SPEED);
          guard.sprite.setVelocity(
            entranceMovement.x,
            entranceMovement.y,
          );
          guard.facing = this.directionFromVector(
            entranceMovement.x,
            entranceMovement.y,
          );
          this.playBoneAnimation(guard.sprite, "walk", guard.facing);
        }

        return;
      }

      const distanceToNova = Phaser.Math.Distance.Between(
        guard.sprite.x,
        guard.sprite.y,
        this.nova!.x,
        this.nova!.y,
      );

      if (this.time.now < guard.hurtUntil) {
        return;
      }

      if (distanceToNova <= BONE_GUARD_ATTACK_RANGE) {
        guard.sprite.setVelocity(0, 0);
        guard.facing = this.directionFromVector(
          this.nova!.x - guard.sprite.x,
          this.nova!.y - guard.sprite.y,
        );

        if (
          this.time.now - guard.lastAttackAt >=
          BONE_GUARD_ATTACK_COOLDOWN_MS
        ) {
          this.attackNova(guard);
        } else if (!guard.sprite.anims.isPlaying) {
          this.playBoneAnimation(guard.sprite, "idle", guard.facing);
        }

        return;
      }

      if (distanceToNova <= BONE_GUARD_CHASE_RANGE) {
        const chase = new Phaser.Math.Vector2(
          this.nova!.x - guard.sprite.x,
          this.nova!.y - guard.sprite.y,
        );

        chase.normalize().scale(BONE_GUARD_CHASE_SPEED);
        guard.sprite.setVelocity(chase.x, chase.y);
        guard.facing = this.directionFromVector(chase.x, chase.y);
        this.playBoneAnimation(guard.sprite, "walk", guard.facing);
        this.trackGuardMovement(guard, delta);
        return;
      }

      guard.patrolAngle += guard.patrolDirection * (delta / 1000) * 0.75;

      const targetX = guard.spawnX + Math.cos(guard.patrolAngle) * 72;
      const targetY = guard.spawnY + Math.sin(guard.patrolAngle) * 48;

      const patrol = new Phaser.Math.Vector2(
        targetX - guard.sprite.x,
        targetY - guard.sprite.y,
      );

      if (patrol.length() > 7) {
        patrol.normalize().scale(BONE_GUARD_SPEED);
        guard.sprite.setVelocity(patrol.x, patrol.y);
        guard.facing = this.directionFromVector(patrol.x, patrol.y);
        this.playBoneAnimation(guard.sprite, "walk", guard.facing);
        this.trackGuardMovement(guard, delta);
      } else {
        guard.sprite.setVelocity(0, 0);
        this.playBoneAnimation(guard.sprite, "idle", guard.facing);
        guard.stuckForMs = 0;
        guard.lastX = guard.sprite.x;
        guard.lastY = guard.sprite.y;
      }
    });
  }

  private handleGuardObstacleCollision(
    sprite: Phaser.Physics.Arcade.Sprite,
    obstacle: Phaser.Physics.Arcade.Image,
  ) {
    const guard = this.boneGuards.find((item) => item.sprite === sprite);

    if (!guard || !guard.active || guard.defeated) {
      return;
    }

    if (this.time.now < guard.avoidUntil - 180) {
      return;
    }

    const away = new Phaser.Math.Vector2(
      sprite.x - obstacle.x,
      sprite.y - obstacle.y,
    );

    if (away.lengthSq() < 0.01) {
      away.set(1, guard.patrolDirection);
    }

    away.normalize();

    const clockwise = new Phaser.Math.Vector2(-away.y, away.x);
    const counterClockwise = new Phaser.Math.Vector2(away.y, -away.x);

    const towardsNova = this.nova
      ? new Phaser.Math.Vector2(
          this.nova.x - sprite.x,
          this.nova.y - sprite.y,
        ).normalize()
      : new Phaser.Math.Vector2(-1, 0);

    const preferred =
      clockwise.dot(towardsNova) >= counterClockwise.dot(towardsNova)
        ? clockwise
        : counterClockwise;

    if (guard.patrolDirection < 0) {
      preferred.scale(-1);
    }

    preferred.normalize().scale(BONE_GUARD_SPEED);

    guard.avoidanceX = preferred.x;
    guard.avoidanceY = preferred.y;
    guard.avoidUntil = this.time.now + 900;
    guard.patrolDirection *= -1;
    guard.stuckForMs = 0;

    sprite.setVelocity(preferred.x, preferred.y);
    guard.facing = this.directionFromVector(preferred.x, preferred.y);
    this.playBoneAnimation(sprite, "walk", guard.facing);
  }

  private trackGuardMovement(guard: BoneGuardData, delta: number) {
    const moved = Phaser.Math.Distance.Between(
      guard.lastX,
      guard.lastY,
      guard.sprite.x,
      guard.sprite.y,
    );

    const body = guard.sprite.body as Phaser.Physics.Arcade.Body;
    const tryingToMove = body.velocity.lengthSq() > 100;

    if (tryingToMove && moved < 0.55) {
      guard.stuckForMs += delta;
    } else {
      guard.stuckForMs = 0;
    }

    guard.lastX = guard.sprite.x;
    guard.lastY = guard.sprite.y;

    if (guard.stuckForMs < 280 || this.time.now < guard.avoidUntil) {
      return;
    }

    const current = new Phaser.Math.Vector2(
      body.velocity.x || -1,
      body.velocity.y,
    );

    if (current.lengthSq() < 0.01) {
      current.set(-1, guard.patrolDirection);
    }

    current.normalize();

    const turned =
      guard.patrolDirection > 0
        ? new Phaser.Math.Vector2(-current.y, current.x)
        : new Phaser.Math.Vector2(current.y, -current.x);

    turned.normalize().scale(BONE_GUARD_SPEED);

    guard.avoidanceX = turned.x;
    guard.avoidanceY = turned.y;
    guard.avoidUntil = this.time.now + 760;
    guard.patrolDirection *= -1;
    guard.stuckForMs = 0;
  }

  private attackNova(guard: BoneGuardData) {
    if (!this.nova || this.isGameOver || this.hasFinished) {
      return;
    }

    guard.lastAttackAt = this.time.now;
    guard.sprite.setVelocity(0, 0);
    this.playBoneAnimation(guard.sprite, "attack", guard.facing, false);

    this.time.delayedCall(165, () => {
      if (!this.nova || guard.defeated || !guard.active) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        guard.sprite.x,
        guard.sprite.y,
        this.nova.x,
        this.nova.y,
      );

      if (distance <= BONE_GUARD_ATTACK_RANGE + 14) {
        this.damageNova(guard.sprite.x, guard.sprite.y);
      }
    });
  }

  private damageNova(sourceX: number, sourceY: number) {
    if (!this.nova || this.time.now < this.novaHurtUntil) {
      return;
    }

    this.health = Math.max(0, this.health - 1);
    this.playSfx("nova-hit-sfx");
    this.novaHurtUntil = this.time.now + NOVA_HURT_INVULNERABILITY_MS;
    this.isNovaAttacking = false;
    this.nova.setCrop();
    this.nova.play(`nova-hurt-${this.facing}`, true);

    const knockback = new Phaser.Math.Vector2(
      this.nova.x - sourceX,
      this.nova.y - sourceY,
    );

    if (knockback.lengthSq() > 0) {
      knockback.normalize().scale(230);
      this.nova.setVelocity(knockback.x, knockback.y);
    }

    this.cameras.main.shake(130, 0.006);
    this.cameras.main.flash(90, 130, 25, 35);

    if (this.health <= 0) {
      this.time.delayedCall(250, () => this.finishAsDefeat());
    }
  }

  private defeatBoneGuard(guard: BoneGuardData) {
    guard.defeated = true;
    guard.active = false;
    guard.healthBar.background.setVisible(false);
    guard.healthBar.fill.setVisible(false);
    guard.sprite.setVelocity(0, 0);
    guard.sprite.disableBody(false, false);
    this.playBoneAnimation(guard.sprite, "defeated", guard.facing, false);
    this.defeatedGuards += 1;
    this.score += 300;

    guard.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.tweens.add({
        targets: guard.sprite,
        alpha: 0,
        duration: 420,
        delay: 250,
        onComplete: () => {
          guard.healthBar.background.destroy();
          guard.healthBar.fill.destroy();
          guard.sprite.destroy();
        },
      });
    });
  }

  private updateEnergyCores(delta: number) {
    if (!this.nova) {
      return;
    }

    this.energyCores.forEach((core) => {
      if (core.collected) {
        return;
      }

      const bob = Math.sin(this.time.now / 330 + core.id) * 5;
      core.image.y = core.y + bob;
      core.glow.y = core.y + bob;
      core.image.rotation += 0.0025 * (delta / 16.667);

      const distance = Phaser.Math.Distance.Between(
        this.nova!.x,
        this.nova!.y,
        core.x,
        core.y,
      );

      if (distance <= 64) {
        core.collected = true;
        this.collectedCores += 1;
        this.score += 500;

        this.tweens.add({
          targets: [core.glow, core.image],
          scale: 1.7,
          alpha: 0,
          duration: 260,
          onComplete: () => {
            core.glow.destroy();
            core.image.destroy();
          },
        });

        if (this.collectedCores === TOTAL_CORES) {
          this.unlockExit();
        }
      }
    });
  }

  private unlockExit() {
    this.exitGlow?.setFillStyle(0x6fffc5, 0.23);
    this.exitGlow?.setRadius(92);
    this.exitGateImage?.clearTint().setAlpha(1);
    this.exitLabel?.setText("EXIT OPEN").setColor("#86efac");
    this.objectiveText
      ?.setText("ALL CORES FOUND — REACH THE EXIT")
      .setColor("#86efac");

    if (this.exitGlow) {
      this.tweens.add({
        targets: this.exitGlow,
        scale: 1.25,
        alpha: 0.16,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private checkExit() {
    if (!this.nova || this.collectedCores < TOTAL_CORES) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.nova.x,
      this.nova.y,
      this.levelConfig.exit.x,
      this.levelConfig.exit.y,
    );

    if (distance <= 84) {
      this.finishAsVictory();
    }
  }

  private finishAsVictory() {
    if (this.hasFinished) {
      return;
    }

    this.hasFinished = true;
    this.score += Math.max(0, Math.round(2500 - this.elapsedSeconds * 18));
    this.objectiveText?.setText("FOREST ESCAPE COMPLETE").setColor("#86efac");

    this.submitCompletionEvent();

    this.showResultOverlay(
      this.levelConfig.level === 2
        ? "ECLIPSE RUINS CLEARED"
        : "FOREST ESCAPE COMPLETE",
      `Nova recovered all ${TOTAL_CORES} energy cores and escaped the Dreamkeeper's guards.`,
      "#9affce",
      true,
    );
  }

  private submitCompletionEvent() {
    if (this.resultSubmitted || typeof window === "undefined") {
      return;
    }

    this.resultSubmitted = true;

    const detail: ThinkForestCompletionDetail = {
      courseId: this.levelConfig.courseId,
      score: this.score,
      completionTimeMs: Math.max(1000, Math.round(this.elapsedSeconds * 1000)),
      coresCollected: this.collectedCores,
      guardsDefeated: this.defeatedGuards,
    };

    window.dispatchEvent(
      new CustomEvent<ThinkForestCompletionDetail>(
        "think-forest-complete",
        { detail },
      ),
    );
  }

  private finishAsDefeat() {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.nova?.setVelocity(0, 0);
    this.objectiveText?.setText("NOVA WAS OVERWHELMED").setColor("#ff9fae");

    this.showResultOverlay(
      "GAME OVER",
      "Restart and choose a safer path through the skeleton patrols.",
      "#ff9fae",
    );
  }

  private showResultOverlay(
    title: string,
    description: string,
    colour: string,
    completedLevel = false,
  ) {
    const shade = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x020611,
      0.68,
    );

    shade.setScrollFactor(0);
    shade.setDepth(5000);

    const panel = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      700,
      360,
      0x050d1d,
      0.96,
    );

    panel.setStrokeStyle(
      2,
      Phaser.Display.Color.HexStringToColor(colour).color,
      0.45,
    );
    panel.setScrollFactor(0);
    panel.setDepth(5001);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, title, {
        fontFamily: "Arial, sans-serif",
        fontSize: "31px",
        fontStyle: "bold",
        color: colour,
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5002);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 22, description, {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        color: "#d3deed",
        align: "center",
        wordWrap: { width: 570 },
        lineSpacing: 7,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5002);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 68,
        `SCORE  ${this.score.toLocaleString()}     TIME  ${this.formatTime(
          this.elapsedSeconds,
        )}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          fontStyle: "bold",
          color: "#ffffff",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5002);

    const hasFutureLevel = this.levelConfig.level < 2;
    const nextLevel = hasFutureLevel
      ? ((this.levelConfig.level + 1) as ThinkForestLevel)
      : null;
    const nextLevelUnlocked =
      nextLevel !== null &&
      this.gearStage >= FOREST_LEVELS[nextLevel].requiredGearStage;

    const restartX = hasFutureLevel
      ? GAME_WIDTH / 2 - 128
      : GAME_WIDTH / 2;

    const restart = this.add.rectangle(
      restartX,
      GAME_HEIGHT / 2 + 135,
      220,
      50,
      0x16445c,
      0.95,
    );

    restart.setStrokeStyle(1, 0x7ee8ff, 0.6);
    restart.setScrollFactor(0);
    restart.setDepth(5002);
    restart.setInteractive({ useHandCursor: true });

    this.add
      .text(restartX, GAME_HEIGHT / 2 + 135, "PLAY AGAIN", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5003);

    restart.on("pointerdown", () => this.scene.restart());

    if (completedLevel && nextLevel !== null) {
      const nextX = GAME_WIDTH / 2 + 128;
      const nextButton = this.add.rectangle(
        nextX,
        GAME_HEIGHT / 2 + 135,
        220,
        50,
        nextLevelUnlocked ? 0x23644f : 0x2d313b,
        nextLevelUnlocked ? 0.98 : 0.9,
      );

      nextButton.setStrokeStyle(
        1,
        nextLevelUnlocked ? 0x86efac : 0xa8b0bd,
        nextLevelUnlocked ? 0.72 : 0.3,
      );
      nextButton.setScrollFactor(0);
      nextButton.setDepth(5002);

      const nextLabel = nextLevelUnlocked
        ? "NEXT LEVEL"
        : `${FOREST_LEVELS[nextLevel].requiredGearName.toUpperCase()} REQUIRED`;

      this.add
        .text(nextX, GAME_HEIGHT / 2 + 135, nextLabel, {
          fontFamily: "Arial, sans-serif",
          fontSize: nextLevelUnlocked ? "14px" : "10px",
          fontStyle: "bold",
          color: nextLevelUnlocked ? "#eafff2" : "#b8c0cc",
          letterSpacing: nextLevelUnlocked ? 2 : 1,
          align: "center",
          wordWrap: { width: 190 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(5003);

      if (nextLevelUnlocked) {
        nextButton.setInteractive({ useHandCursor: true });
        nextButton.on("pointerdown", () => {
          if (typeof window === "undefined") {
            return;
          }

          window.dispatchEvent(
            new CustomEvent<{ nextLevel: ThinkForestLevel }>(
              "think-forest-next-level",
              {
                detail: {
                  nextLevel,
                },
              },
            ),
          );
        });
      }
    }
  }

  private createWorldHealthBar(
    width: number,
    fillColour: number,
  ): CharacterHealthBar {
    const background = this.add
      .rectangle(0, 0, width, 9, 0x030711, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0xffffff, 0.28);

    const fill = this.add
      .rectangle(0, 0, width - 4, 5, fillColour, 1)
      .setOrigin(0, 0.5);

    return {
      background,
      fill,
      width,
    };
  }

  private positionWorldHealthBar(
    bar: CharacterHealthBar,
    x: number,
    y: number,
    currentHealth: number,
    maximumHealth: number,
    depth: number,
    visible: boolean,
  ) {
    const ratio = Phaser.Math.Clamp(currentHealth / maximumHealth, 0, 1);
    const innerWidth = bar.width - 4;

    bar.background.setPosition(x, y);
    bar.background.setDepth(depth);
    bar.background.setVisible(visible);

    bar.fill.setPosition(x - innerWidth / 2, y);
    bar.fill.displayWidth = innerWidth * ratio;
    bar.fill.setDepth(depth + 1);
    bar.fill.setVisible(visible);
  }

  private updateWorldHealthBars() {
    if (this.nova && this.novaWorldHealthBar) {
      this.positionWorldHealthBar(
        this.novaWorldHealthBar,
        this.nova.x,
        this.nova.y - 67,
        this.health,
        NOVA_MAX_HEALTH,
        this.nova.depth + 35,
        !this.hasFinished && !this.isGameOver,
      );
    }

    this.boneGuards.forEach((guard) => {
      const visible =
        guard.active &&
        !guard.defeated &&
        guard.sprite.active &&
        guard.sprite.visible;

      this.positionWorldHealthBar(
        guard.healthBar,
        guard.sprite.x,
        guard.sprite.y - 64,
        guard.health,
        BONE_GUARD_HEALTH,
        guard.sprite.depth + 35,
        visible,
      );
    });
  }

  private updateDepths() {
    this.nova?.setDepth(this.nova.y + 100);

    this.boneGuards.forEach((guard) => {
      if (guard.active && !guard.defeated && guard.sprite.active) {
        guard.sprite.setDepth(guard.sprite.y + 100);
      }
    });
  }

  private updateHud() {
    const healthRatio = Phaser.Math.Clamp(this.health / NOVA_MAX_HEALTH, 0, 1);

    if (this.healthBarFill) {
      this.healthBarFill.displayWidth = 148 * healthRatio;
      this.healthBarFill.setFillStyle(
        healthRatio > 0.6 ? 0xff8ea1 : healthRatio > 0.3 ? 0xf3c56b : 0xff6a6a,
        0.98,
      );
    }

    this.energyCoreIcons.forEach((icon, index) => {
      const collected = index < this.collectedCores;
      icon.setAlpha(collected ? 1 : 0.22);
      icon.clearTint();
      if (!collected) {
        icon.setTint(0x5d7088);
      }
    });

    this.scoreText?.setText(`SCORE  ${this.score.toLocaleString()}`);
    this.timerText?.setText(`TIME  ${this.formatTime(this.elapsedSeconds)}`);
  }

  private formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remaining
      .toFixed(1)
      .padStart(4, "0")}`;
  }

  private directionFromVector(x: number, y: number): FacingDirection {
    if (Math.abs(x) > Math.abs(y)) {
      return x < 0 ? "left" : "right";
    }

    return y < 0 ? "up" : "down";
  }

  private getPointInFront(
    x: number,
    y: number,
    direction: FacingDirection,
    distance: number,
  ) {
    if (direction === "left") {
      return { x: x - distance, y };
    }

    if (direction === "right") {
      return { x: x + distance, y };
    }

    if (direction === "up") {
      return { x, y: y - distance };
    }

    return { x, y: y + distance };
  }
}

export default function PhaserGame({
  level = 1,
  gearStage = 0,
}: {
  level?: ThinkForestLevel;
  gearStage?: number;
}) {
  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameVersion, setGameVersion] = useState(0);

  const levelConfig = FOREST_LEVELS[level];
  const isLevelUnlocked = gearStage >= levelConfig.requiredGearStage;

  useEffect(() => {
    function restartFromPage() {
      setGameVersion((version) => version + 1);
    }

    window.addEventListener("think-forest-restart", restartFromPage);

    return () => {
      window.removeEventListener("think-forest-restart", restartFromPage);
    };
  }, []);

  useEffect(() => {
    if (!isLevelUnlocked || !gameContainerRef.current) {
      return;
    }

    gameRef.current?.destroy(true);
    gameRef.current = null;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: gameContainerRef.current,
      backgroundColor: "#030816",
      antialias: true,
      pixelArt: false,
      roundPixels: false,

      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },

      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },

      scene: [new ThinkForestScene(level, gearStage)],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameVersion, gearStage, isLevelUnlocked, level]);

  if (!isLevelUnlocked) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#030816] p-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-amber-200/20 bg-black/35 p-7 backdrop-blur-xl">
          <p className="text-xs font-black tracking-[0.2em] text-amber-200/70">
            LEVEL {level} LOCKED
          </p>
          <h2 className="mt-3 text-3xl font-black">
            {levelConfig.requiredGearName} required
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Complete more Think Missions to unlock this tool before entering
            the level.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={gameContainerRef}
      className="h-full w-full overflow-hidden bg-[#030816]"
      aria-label="Think Missions forest maze game"
      style={{ touchAction: "none" }}
    />
  );
}
