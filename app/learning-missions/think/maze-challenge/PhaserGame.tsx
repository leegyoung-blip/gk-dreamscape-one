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
    courseId: "uncharted-forest-02",
    title: "Deepwood Crossing",

    // Replace this with "/games/think-forest/level-2-map.png" later.
    background: "/games/think-forest/forest-floor-bg.png",

    novaSpawn: { x: 145, y: WORLD_HEIGHT / 2 },
    exit: { x: WORLD_WIDTH - 132, y: 180 },
    obstacles: [
      {
        texture: "large-rocks",
        x: 350,
        y: 245,
        width: 220,
        height: 188,
        bodyWidth: 158,
        bodyHeight: 96,
      },
      {
        texture: "root-barrier",
        x: 520,
        y: 610,
        width: 320,
        height: 154,
        bodyWidth: 288,
        bodyHeight: 90,
      },
      {
        texture: "large-rocks",
        x: 745,
        y: 405,
        width: 215,
        height: 184,
        bodyWidth: 154,
        bodyHeight: 94,
      },
      {
        texture: "root-barrier",
        x: 960,
        y: 225,
        width: 310,
        height: 150,
        bodyWidth: 278,
        bodyHeight: 88,
      },
      {
        texture: "large-rocks",
        x: 1125,
        y: 690,
        width: 225,
        height: 192,
        bodyWidth: 160,
        bodyHeight: 98,
      },
      {
        texture: "root-barrier",
        x: 1350,
        y: 455,
        width: 300,
        height: 146,
        bodyWidth: 270,
        bodyHeight: 84,
      },
    ],
    energyCores: [
      { x: 455, y: 770 },
      { x: 880, y: 565 },
      { x: 1320, y: 300 },
    ],
    guardEntries: [
      { y: 155, targetX: 1210, delay: 350 },
      { y: 285, targetX: 1165, delay: 1050 },
      { y: 420, targetX: 1240, delay: 1750 },
      { y: 555, targetX: 1175, delay: 2450 },
      { y: 690, targetX: 1230, delay: 3150 },
      { y: 815, targetX: 1140, delay: 3850 },
      { y: 350, targetX: 1325, delay: 4550 },
      { y: 620, targetX: 1285, delay: 5250 },
    ],
    requiredGearStage: 1,
    requiredGearName: "Shadow Visor",
    fogClearBrushSize: 350,
    fogTransitionBrushSize: 570,
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
const DEFAULT_GAME_VOLUME = 0.7;

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

type TouchState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
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

  private touchState: TouchState = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

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

  private healthText?: Phaser.GameObjects.Text;
  private coreText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
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
  private gameVolume = DEFAULT_GAME_VOLUME;
  private pauseSliderMoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pauseSliderUpHandler?: () => void;

  constructor(level: ThinkForestLevel) {
    super({ key: `ThinkForestScene-${level}` });
    this.levelConfig = FOREST_LEVELS[level];
  }

  preload() {
    this.load.image("forest-background", this.levelConfig.background);
    this.load.image("large-rocks", ASSET_PATHS.largeRocks);
    this.load.image("root-barrier", ASSET_PATHS.rootBarrier);
    this.load.image("energy-core", ASSET_PATHS.energyCore);
    this.load.image("forest-exit-gate", ASSET_PATHS.exitGate);
    this.load.image("fog-map", ASSET_PATHS.fogMap);
    this.load.image("fog-reveal-brush", ASSET_PATHS.fogBrush);

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
    this.createBackground();
    this.createAnimations();
    this.createObstacles();
    this.createEnergyCores();
    this.createExitGate();
    this.createNova();
    this.createBoneGuards();
    this.createCollisions();
    this.createFog();
    this.createKeyboardControls();
    this.createHud();
    this.createTouchControls();
    this.configureCamera();

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
    this.updateHud();
  }

  private resetValues() {
    this.touchState = {
      left: false,
      right: false,
      up: false,
      down: false,
    };

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
    this.boneGuards = [];
    this.energyCores = [];
    this.denseFog = undefined;
    this.lightFog = undefined;
    this.denseFogBrush = undefined;
    this.lightFogBrush = undefined;
    this.denseFogMask = undefined;
    this.lightFogMask = undefined;
    this.sound.volume = this.gameVolume;
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
      image.refreshBody();

      const body = image.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(obstacle.bodyWidth, obstacle.bodyHeight);
      body.setOffset(
        (obstacle.width - obstacle.bodyWidth) / 2,
        obstacle.height - obstacle.bodyHeight - 8,
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
      };

      this.boneGuards.push(guard);

      this.time.delayedCall(entry.delay, () => {
        if (this.hasFinished || this.isGameOver || guard.defeated) {
          return;
        }

        guard.active = true;
        guard.entering = true;
        guard.sprite.enableBody(true, spawnX, entry.y, true, true);
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
      .text(x, y - 112, "FOREST EXIT LOCKED", {
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
    const leftPanel = this.add.rectangle(24, 22, 360, 132, 0x030916, 0.82);
    leftPanel.setOrigin(0, 0);
    leftPanel.setStrokeStyle(1, 0x7ee8ff, 0.24);
    leftPanel.setScrollFactor(0);
    leftPanel.setDepth(3000);

    this.add
      .text(
        46,
        40,
        `${this.levelConfig.title.toUpperCase()} · LEVEL ${this.levelConfig.level} · ${this.levelConfig.requiredGearName.toUpperCase()}`,
        {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#7ee8ff",
          letterSpacing: 3,
        },
      )
      .setScrollFactor(0)
      .setDepth(3001);

    this.healthText = this.add
      .text(46, 69, "HEALTH  ♥ ♥ ♥ ♥ ♥", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ff9fae",
      })
      .setScrollFactor(0)
      .setDepth(3001);

    this.coreText = this.add
      .text(46, 98, `ENERGY CORES  0 / ${TOTAL_CORES}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#a8f8ff",
      })
      .setScrollFactor(0)
      .setDepth(3001);

    this.objectiveText = this.add
      .text(46, 124, "FIND ALL CORES, THEN REACH THE EXIT", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#b8c8dd",
        letterSpacing: 1,
      })
      .setScrollFactor(0)
      .setDepth(3001);

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
        "WASD / ARROWS  MOVE     SPACE  ATTACK     P  PAUSE     R  RESTART",
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

    const objects: Phaser.GameObjects.GameObject[] = [];

    const shade = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x020611,
        0.78,
      )
      .setScrollFactor(0)
      .setInteractive();

    const panel = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        720,
        500,
        0x071326,
        0.98,
      )
      .setScrollFactor(0);
    panel.setStrokeStyle(2, 0x7ee8ff, 0.44);

    const title = this.add
      .text(GAME_WIDTH / 2, 150, "LEVEL PAUSED", {
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
        235,
        [
          "INSTRUCTIONS",
          "• Recover all three Energy Cores.",
          "• Avoid or defeat the Bone Guards.",
          "• Reach the Exit Gate after all cores are collected.",
          "• Move with WASD / arrow keys and attack with Space.",
        ].join("\n"),
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#d3deed",
          lineSpacing: 9,
          align: "left",
          wordWrap: { width: 560 },
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    const volumeLabel = this.add
      .text(
        GAME_WIDTH / 2,
        390,
        `VOLUME  ${Math.round(this.gameVolume * 100)}%`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#d9fbff",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    const sliderX = GAME_WIDTH / 2 - 190;
    const sliderY = 430;
    const sliderWidth = 380;

    const sliderTrack = this.add
      .rectangle(sliderX, sliderY, sliderWidth, 10, 0xffffff, 0.13)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    const sliderFill = this.add
      .rectangle(
        sliderX,
        sliderY,
        sliderWidth * this.gameVolume,
        10,
        0x60f0d0,
        0.9,
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    const sliderKnob = this.add
      .circle(
        sliderX + sliderWidth * this.gameVolume,
        sliderY,
        14,
        0xd9fbff,
        1,
      )
      .setScrollFactor(0);

    const sliderZone = this.add
      .zone(sliderX, sliderY, sliderWidth, 42)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    let draggingVolume = false;

    const setVolumeFromPointer = (pointer: Phaser.Input.Pointer) => {
      const nextVolume = Phaser.Math.Clamp(
        (pointer.x - sliderX) / sliderWidth,
        0,
        1,
      );

      this.gameVolume = nextVolume;
      this.sound.volume = nextVolume;
      sliderFill.displayWidth = sliderWidth * nextVolume;
      sliderKnob.x = sliderX + sliderWidth * nextVolume;
      volumeLabel.setText(`VOLUME  ${Math.round(nextVolume * 100)}%`);
    };

    sliderZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      draggingVolume = true;
      setVolumeFromPointer(pointer);
    });

    this.pauseSliderMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (draggingVolume && pointer.isDown) {
        setVolumeFromPointer(pointer);
      }
    };

    this.pauseSliderUpHandler = () => {
      draggingVolume = false;
    };

    this.input.on("pointermove", this.pauseSliderMoveHandler);
    this.input.on("pointerup", this.pauseSliderUpHandler);

    const resumeButton = this.createPauseMenuAction(
      GAME_WIDTH / 2 - 145,
      535,
      "RESUME",
      () => this.resumeGame(),
      0x16445c,
    );

    const restartButton = this.createPauseMenuAction(
      GAME_WIDTH / 2 + 145,
      535,
      "RESTART LEVEL",
      () => this.restartLevel(),
      0x5b2634,
    );

    objects.push(
      shade,
      panel,
      title,
      instructions,
      volumeLabel,
      sliderTrack,
      sliderFill,
      sliderKnob,
      sliderZone,
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
    this.time.paused = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.sound.resumeAll();
    this.physics.world.resume();
    this.isPaused = false;
    this.scene.restart();
  }

  private createTouchControls() {
    this.input.addPointer(4);

    this.createTouchButton(88, GAME_HEIGHT - 120, 64, "←", "left");
    this.createTouchButton(166, GAME_HEIGHT - 120, 64, "→", "right");
    this.createTouchButton(127, GAME_HEIGHT - 198, 64, "↑", "up");
    this.createTouchButton(127, GAME_HEIGHT - 42, 64, "↓", "down");

    const attack = this.add.circle(
      GAME_WIDTH - 92,
      GAME_HEIGHT - 116,
      48,
      0x071326,
      0.76,
    );

    attack.setStrokeStyle(2, 0x7ee8ff, 0.55);
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

    const release = () => {
      attack.setFillStyle(0x071326, 0.76);
      attack.setScale(1);
    };

    attack.on("pointerup", release);
    attack.on("pointerout", release);
    attack.on("pointerupoutside", release);
  }

  private createTouchButton(
    x: number,
    y: number,
    size: number,
    label: string,
    direction: keyof TouchState,
  ) {
    const button = this.add.circle(x, y, size / 2, 0x071326, 0.68);

    button.setStrokeStyle(2, 0x7ee8ff, 0.36);
    button.setScrollFactor(0);
    button.setDepth(3100);
    button.setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "25px",
        fontStyle: "bold",
        color: "#d9fbff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3101);

    const press = () => {
      this.touchState[direction] = true;
      button.setFillStyle(0x17455b, 0.92);
      button.setScale(0.94);
    };

    const release = () => {
      this.touchState[direction] = false;
      button.setFillStyle(0x071326, 0.68);
      button.setScale(1);
    };

    button.on("pointerdown", press);
    button.on("pointerup", release);
    button.on("pointerout", release);
    button.on("pointerupoutside", release);
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
    if (
      !this.nova ||
      !this.cursors ||
      !this.keyW ||
      !this.keyA ||
      !this.keyS ||
      !this.keyD
    ) {
      return;
    }

    if (this.time.now < this.novaHurtUntil || this.isNovaAttacking) {
      this.nova.setVelocity(0, 0);
      return;
    }

    let horizontal = 0;
    let vertical = 0;

    if (this.cursors.left.isDown || this.keyA.isDown || this.touchState.left) {
      horizontal -= 1;
    }

    if (
      this.cursors.right.isDown ||
      this.keyD.isDown ||
      this.touchState.right
    ) {
      horizontal += 1;
    }

    if (this.cursors.up.isDown || this.keyW.isDown || this.touchState.up) {
      vertical -= 1;
    }

    if (
      this.cursors.down.isDown ||
      this.keyS.isDown ||
      this.touchState.down
    ) {
      vertical += 1;
    }

    const movement = new Phaser.Math.Vector2(horizontal, vertical);

    if (movement.lengthSq() > 0) {
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
    if (!this.nova || !this.keySpace) {
      return;
    }

    const attackPressed =
      Phaser.Input.Keyboard.JustDown(this.keySpace) ||
      this.touchAttackRequested;

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
        onComplete: () => guard.sprite.destroy(),
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
      "FOREST ESCAPE COMPLETE",
      `Nova recovered all ${TOTAL_CORES} energy cores and escaped the Dreamkeeper's guards.`,
      "#9affce",
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
      "THE FOREST CLAIMED THIS RUN",
      "Restart and choose a safer path through the skeleton patrols.",
      "#ff9fae",
    );
  }

  private showResultOverlay(title: string, description: string, colour: string) {
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

    const restart = this.add.rectangle(
      GAME_WIDTH / 2,
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
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 135, "PLAY AGAIN", {
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
    const hearts = Array.from({ length: NOVA_MAX_HEALTH }, (_, index) =>
      index < this.health ? "♥" : "♡",
    ).join(" ");

    this.healthText?.setText(`HEALTH  ${hearts}`);
    this.coreText?.setText(
      `ENERGY CORES  ${this.collectedCores} / ${TOTAL_CORES}`,
    );
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

      scene: [new ThinkForestScene(level)],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameVersion, isLevelUnlocked, level]);

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
