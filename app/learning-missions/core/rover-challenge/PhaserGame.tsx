"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import type { CoreRoverGameStats } from "@/lib/coreRoverProgress";
import type { RoverLevelConfig } from "./levels";
import type { RoverTrap } from "./levels/types";

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 900;

const ROVER_BODY_WIDTH = 300;
const ROVER_BODY_HEIGHT = 188;

const ROVER_COLLISION_WIDTH = 238;
const ROVER_COLLISION_HEIGHT = 82;

const WHEEL_SIZE = 78;
const LEFT_WHEEL_OFFSET_X = -88;
const RIGHT_WHEEL_OFFSET_X = 88;

/*
 * Wheel centres now sit on the same local vertical line as the
 * collision chassis. This keeps the wheel bottoms above the terrain.
 */
const WHEEL_OFFSET_Y = 15;

/*
 * The detailed body artwork is a separate visual layer positioned
 * above the invisible Matter chassis.
 */
const ROVER_BODY_VISUAL_OFFSET_Y = -30;

export type PhaserGameProps = {
  levelConfig: RoverLevelConfig;
  roverStage: number;
  roverName: string;
  gameStats: CoreRoverGameStats;
};

type CollectibleItem = {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  glow: Phaser.GameObjects.Arc;
  orb: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
};

type CheckpointItem = {
  id: number;
  x: number;
  y: number;
  respawnX: number;
  respawnY: number;
  reached: boolean;
  light: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type TouchButton = {
  background: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type TrapItem = Omit<RoverTrap, "y"> & {
  y: number;
  armed: boolean;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
};

class RoverMatterScene extends Phaser.Scene {
  private backgroundTile?: Phaser.GameObjects.TileSprite;
  private roverBody?: Phaser.Physics.Matter.Image;
  private roverBodyVisual?: Phaser.GameObjects.Image;
  private leftWheelVisual?: Phaser.GameObjects.Image;
  private rightWheelVisual?: Phaser.GameObjects.Image;

  private terrainSections: Array<Array<{ x: number; y: number }>> = [];

  private wheelSpin = 0;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyR?: Phaser.Input.Keyboard.Key;
  private boostKey?: Phaser.Input.Keyboard.Key;

  private touchLeft = false;
  private touchRight = false;
  private touchBoost = false;

  private speedText?: Phaser.GameObjects.Text;
  private distanceText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private collectibleText?: Phaser.GameObjects.Text;
  private checkpointText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private roverStageText?: Phaser.GameObjects.Text;
  private boostText?: Phaser.GameObjects.Text;
  private boostBarFill?: Phaser.GameObjects.Rectangle;

  private collectibles: CollectibleItem[] = [];
  private checkpoints: CheckpointItem[] = [];
  private traps: TrapItem[] = [];
  private trapCollisionLocked = false;

  private boostEnergy = 60;
  private maximumBoostEnergy = 60;
  private boostDrainRate = 15;
  private boostRechargeRate = 14;

  private score = 0;
  private distanceScore = 0;
  private collectibleScore = 0;
  private checkpointScore = 0;
  private completionScore = 0;
  private timeBonus = 0;
  private crashPenalty = 0;

  private collectedCount = 0;
  private reachedCheckpointCount = 0;

  private elapsedSeconds = 0;
  private hasStarted = false;
  private hasFinished = false;

  private latestCheckpointX = 0;
  private latestCheckpointY = 0;

  private activeTerrainContacts = new Set<string>();
  private maximumAirborneDownwardVelocity = 0;
  private airborneTime = 0;
  private overturnedTime = 0;
  private lastJumpAt = -1000;
  private restartRequested = false;

  private roverStage = 0;
  private roverName = "Basic Rover Frame";
  private levelConfig: RoverLevelConfig;

  private normalMaximumSpeed = 5.5;
  private boostedMaximumSpeed = 7.0;
  private accelerationRate = 4.2;
  private brakingRate = 6.2;
  private groundAlignmentRate = 8.5;
  private jumpVelocity = 0;
  private airTiltStrength = 0.006;

  private readonly jumpCooldownMs = 420;
  private readonly airborneTiltDelayMs = 150;
  private readonly airborneLevelingDelayMs = 220;
  private readonly airborneLevelingRate = 3.8;
  private readonly airborneAngularDampingRate = 6.5;

  constructor({ levelConfig, roverStage, roverName, gameStats }: PhaserGameProps) {
    super({
      key: "RoverMatterScene",
    });

    this.levelConfig = levelConfig;
    this.roverStage = roverStage;
    this.roverName = roverName;

    this.normalMaximumSpeed = gameStats.normalSpeed;

    this.boostedMaximumSpeed = gameStats.boostSpeed;

    this.accelerationRate = gameStats.accelerationRate;

    this.brakingRate = gameStats.brakingRate;

    // Every rover gets a 35% stronger jump while preserving the upgrade curve.
    this.jumpVelocity = gameStats.jumpVelocity * 1.7;

    this.maximumBoostEnergy = gameStats.boostCapacity;

    this.boostDrainRate = gameStats.boostDrainRate;

    this.boostRechargeRate = gameStats.boostRechargeRate;

    this.airTiltStrength = gameStats.airTiltStrength;

    this.boostEnergy = gameStats.boostCapacity;
  }

  preload() {
    this.load.image(
      "skyforge-background",
      this.levelConfig.assets.background,
    );

    this.load.image("energy-orb", this.levelConfig.assets.orb);

    if (this.levelConfig.assets.dynamite) {
      this.load.image("dreamkeeper-dynamite", this.levelConfig.assets.dynamite);
    }

    if (this.levelConfig.assets.explosion) {
      this.load.image("dreamkeeper-explosion", this.levelConfig.assets.explosion);
    }

    this.load.image("rover-body", "/games/rover/rover-body.png");

    this.load.image("rover-wheel", "/games/rover/rover-wheel.png");

    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        console.error(`[Rover Challenge] Could not load asset: ${file.src}`);
      },
    );
  }

  create() {
    this.resetGameValues();

    this.matter.world.setBounds(
      0,
      0,
      this.levelConfig.worldWidth,
      this.levelConfig.worldHeight,
      64,
      true,
      true,
      true,
      false,
    );

    this.createBackground();

    if (!this.verifyRoverAssets()) {
      return;
    }

    this.createTerrain();
    this.createRouteLabels();
    this.createStartGate();
    this.createFinishGate();
    this.createCollectibles();
    this.createCheckpoints();
    this.createTraps();
    this.createRover();
    this.createControls();
    this.createInterface();
    this.createTouchControls();
    this.configureCamera();
    this.registerCollisionHandlers();

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.R,
    ]);

    this.cameras.main.fadeIn(450, 5, 7, 19);
  }

  update(_time: number, delta: number) {
    if (!this.roverBody) {
      return;
    }

    this.updateBackgroundParallax();
    this.updateGroundState(delta);
    this.handleMovement(delta);
    this.stabilizeRover(delta);
    this.updateRoverVisuals(delta);
    this.updateTimer(delta);
    this.updateAirborneVelocity();
    this.updateCollectibles(delta);
    this.updateCheckpoints();
    this.updateTraps();
    this.updateScore();
    this.updateInterface();
    this.checkFinish();
    this.checkFall();
    this.checkOverturned(delta);
  }

  private resetGameValues() {
    this.collectibles = [];
    this.checkpoints = [];
    this.traps = [];
    this.terrainSections = [];
    this.trapCollisionLocked = false;

    this.touchLeft = false;
    this.touchRight = false;
    this.touchBoost = false;

    this.boostEnergy = this.maximumBoostEnergy;

    this.score = 0;
    this.distanceScore = 0;
    this.collectibleScore = 0;
    this.checkpointScore = 0;
    this.completionScore = 0;
    this.timeBonus = 0;
    this.crashPenalty = 0;

    this.collectedCount = 0;
    this.reachedCheckpointCount = 0;

    this.elapsedSeconds = 0;
    this.hasStarted = false;
    this.hasFinished = false;

    this.latestCheckpointX = this.levelConfig.start.x;
    this.latestCheckpointY = this.levelConfig.start.y;

    this.activeTerrainContacts.clear();
    this.maximumAirborneDownwardVelocity = 0;
    this.airborneTime = 0;
    this.overturnedTime = 0;
    this.lastJumpAt = -1000;
    this.restartRequested = false;
    this.wheelSpin = 0;
  }

  private verifyRoverAssets() {
    const missingAssets: string[] = [];

    if (!this.textures.exists("rover-body")) {
      missingAssets.push("public/games/rover/rover-body.png");
    }

    if (!this.textures.exists("rover-wheel")) {
      missingAssets.push("public/games/rover/rover-wheel.png");
    }

    if (!this.textures.exists("skyforge-background")) {
      missingAssets.push("public/games/rover/skyforge-course-background.png");
    }

    if (!this.textures.exists("energy-orb")) {
      missingAssets.push("public/games/rover/energy-orb.png");
    }

    if (
      (this.levelConfig.traps?.length ?? 0) > 0 &&
      !this.textures.exists("dreamkeeper-dynamite")
    ) {
      missingAssets.push("public/games/rover/dreamkeeper-dynamite.png");
    }

    if (
      (this.levelConfig.traps?.length ?? 0) > 0 &&
      !this.textures.exists("dreamkeeper-explosion")
    ) {
      missingAssets.push("public/games/rover/dreamkeeper-explosion.png");
    }

    if (missingAssets.length === 0) {
      return true;
    }

    const panel = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      1050,
      340,
      0x070b18,
      0.96,
    );

    panel.setStrokeStyle(2, 0xff8f8f, 0.6);
    panel.setScrollFactor(0);
    panel.setDepth(500);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 105,
        "ROVER IMAGE FILES NOT FOUND",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "34px",
          fontStyle: "bold",
          color: "#ffb3b3",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(501);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 20,
        [
          "Save the PNG files at these exact paths:",
          "",
          ...missingAssets,
          "",
          "Then restart npm run dev and hard-refresh the page.",
        ].join("\n"),
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          lineSpacing: 9,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(501);

    return false;
  }

  private createBackground() {
    this.cameras.main.setBackgroundColor("#070a18");

    this.backgroundTile = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "skyforge-background")
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-1000);
  }

  private updateBackgroundParallax() {
    if (!this.backgroundTile) {
      return;
    }

    this.backgroundTile.tilePositionX = this.cameras.main.scrollX * 0.01;
    this.backgroundTile.tilePositionY = this.cameras.main.scrollY * 0.04;
  }

  private createTerrain() {
    /*
     * Each section is a Catmull-Rom curve sampled into many small,
     * overlapping Matter bodies. This creates smooth hills and valleys
     * instead of long straight ramps with sharp joins.
     */
    this.levelConfig.terrainSections.forEach((section) => {
      if (Array.isArray(section)) {
        this.createSmoothTerrainSection(section, "ground", 220);
        return;
      }

      this.createSmoothTerrainSection(
        section.points,
        section.kind ?? "ground",
        section.collisionThickness ??
          (section.kind === "platform" ? 44 : 220),
      );
    });

    this.createStartingPlatform();
    this.levelConfig.gapWarnings.forEach(({ x, y }) => {
      this.createGapWarning(x, y);
    });
  }

  private createSmoothTerrainSection(
    controlPoints: Array<{ x: number; y: number }>,
    kind: "ground" | "platform",
    terrainThickness: number,
  ) {
    const sampledPoints = this.sampleCatmullRom(controlPoints, 12);

    if (sampledPoints.length < 2) {
      return;
    }

    /*
     * Keep the sampled surface so the rover can align itself to the
     * exact local hill angle while it is touching the terrain.
     */
    this.terrainSections.push(sampledPoints);

    /*
     * Filled terrain artwork.
     */
    const fill = this.add.graphics();
    fill.setDepth(10);
    fill.fillStyle(0x101629, 1);
    fill.beginPath();
    fill.moveTo(sampledPoints[0].x, sampledPoints[0].y);

    for (let index = 1; index < sampledPoints.length; index += 1) {
      fill.lineTo(sampledPoints[index].x, sampledPoints[index].y);
    }

    if (kind === "platform") {
      for (let index = sampledPoints.length - 1; index >= 0; index -= 1) {
        fill.lineTo(
          sampledPoints[index].x,
          sampledPoints[index].y + terrainThickness,
        );
      }
    } else {
      const finalPoint = sampledPoints[sampledPoints.length - 1];
      fill.lineTo(finalPoint.x, this.levelConfig.worldHeight);
      fill.lineTo(sampledPoints[0].x, this.levelConfig.worldHeight);
    }

    fill.closePath();
    fill.fillPath();

    /*
     * Glowing upper surface.
     */
    const surfaceGlow = this.add.graphics();
    surfaceGlow.setDepth(11);
    surfaceGlow.lineStyle(20, 0x2b7898, 0.1);

    surfaceGlow.beginPath();
    surfaceGlow.moveTo(sampledPoints[0].x, sampledPoints[0].y + 7);

    for (let index = 1; index < sampledPoints.length; index += 1) {
      surfaceGlow.lineTo(sampledPoints[index].x, sampledPoints[index].y + 7);
    }

    surfaceGlow.strokePath();

    const surface = this.add.graphics();
    surface.setDepth(12);
    surface.lineStyle(8, 0x62eaff, 0.38);

    surface.beginPath();
    surface.moveTo(sampledPoints[0].x, sampledPoints[0].y);

    for (let index = 1; index < sampledPoints.length; index += 1) {
      surface.lineTo(sampledPoints[index].x, sampledPoints[index].y);
    }

    surface.strokePath();

    /*
     * Collision surface. Short overlapping rectangles closely follow
     * the sampled curve, avoiding sharp corners that trap the rover.
     */
    const collisionOverlap = 14;

    for (let index = 0; index < sampledPoints.length - 1; index += 1) {
      const current = sampledPoints[index];
      const next = sampledPoints[index + 1];

      const deltaX = next.x - current.x;
      const deltaY = next.y - current.y;
      const length = Math.hypot(deltaX, deltaY);

      if (length <= 0.01) {
        continue;
      }

      const angle = Math.atan2(deltaY, deltaX);

      /*
       * This is the segment's downward-facing normal in screen space.
       * Moving the body's centre down by half its thickness puts the
       * collision body's top edge directly on the visible curve.
       */
      const normalX = -deltaY / length;

      const normalY = deltaX / length;

      const midpointX = (current.x + next.x) / 2;

      const midpointY = (current.y + next.y) / 2;

      const bodyX = midpointX + normalX * (terrainThickness / 2);

      const bodyY = midpointY + normalY * (terrainThickness / 2);

      this.matter.add.rectangle(
        bodyX,
        bodyY,
        length + collisionOverlap,
        terrainThickness,
        {
          isStatic: true,
          angle,
          friction: 1,
          frictionStatic: 1,
          restitution: 0,
          label: "terrain",
        },
      );
    }
  }

  private sampleCatmullRom(
    controlPoints: Array<{ x: number; y: number }>,
    samplesPerSpan: number,
  ) {
    const samples: Array<{
      x: number;
      y: number;
    }> = [];

    if (controlPoints.length < 2) {
      return samples;
    }

    for (let span = 0; span < controlPoints.length - 1; span += 1) {
      const point0 = controlPoints[Math.max(0, span - 1)];

      const point1 = controlPoints[span];

      const point2 = controlPoints[span + 1];

      const point3 =
        controlPoints[Math.min(controlPoints.length - 1, span + 2)];

      for (let step = 0; step < samplesPerSpan; step += 1) {
        const time = step / samplesPerSpan;

        const timeSquared = time * time;

        const timeCubed = timeSquared * time;

        samples.push({
          x:
            0.5 *
            (2 * point1.x +
              (-point0.x + point2.x) * time +
              (2 * point0.x - 5 * point1.x + 4 * point2.x - point3.x) *
                timeSquared +
              (-point0.x + 3 * point1.x - 3 * point2.x + point3.x) * timeCubed),

          y:
            0.5 *
            (2 * point1.y +
              (-point0.y + point2.y) * time +
              (2 * point0.y - 5 * point1.y + 4 * point2.y - point3.y) *
                timeSquared +
              (-point0.y + 3 * point1.y - 3 * point2.y + point3.y) * timeCubed),
        });
      }
    }

    const lastPoint = controlPoints[controlPoints.length - 1];

    samples.push({
      x: lastPoint.x,
      y: lastPoint.y,
    });

    return samples;
  }

  private createStartingPlatform() {
    const startX = this.levelConfig.start.x;
    const groundY = this.getStartingGroundY();

    this.add.ellipse(startX, groundY - 14, 360, 54, 0x3ce7ff, 0.07);

    this.add.ellipse(startX, groundY - 18, 280, 28, 0x80efff, 0.1);

    const outline = this.add.ellipse(
      startX,
      groundY - 20,
      320,
      38,
      0x000000,
      0,
    );

    outline.setStrokeStyle(2, 0x5eeaff, 0.3);
  }

  private createGapWarning(x: number, y: number) {
    this.add
      .text(x, y, "GAP", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffbd72",
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 28, "BOOST OR JUMP", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#c79568",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
  }

  private createStartGate() {
    const startX = Math.max(100, this.levelConfig.start.x - 220);
    const groundY = this.getStartingGroundY();

    this.add.rectangle(startX, groundY - 105, 18, 210, 0x263354, 1);

    this.add.rectangle(startX + 150, groundY - 105, 18, 210, 0x263354, 1);

    this.add.rectangle(startX + 75, groundY - 205, 168, 20, 0x304267, 1);

    this.add.rectangle(startX + 75, groundY - 203, 125, 5, 0x69f0ff, 0.8);

    this.add
      .text(startX + 75, groundY - 240, "START", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#bff8ff",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
  }

  private getStartingGroundY() {
    const firstSection = this.levelConfig.terrainSections[0];
    const firstPoint = Array.isArray(firstSection)
      ? firstSection[0]
      : firstSection?.points[0];

    return firstPoint?.y ?? 645;
  }

  private createFinishGate() {
    const { x: finishX, y: groundY } = this.levelConfig.finish;

    this.add.rectangle(finishX - 110, groundY - 120, 24, 240, 0x263354, 1);

    this.add.rectangle(finishX + 110, groundY - 120, 24, 240, 0x263354, 1);

    this.add.rectangle(finishX, groundY - 230, 244, 24, 0x304267, 1);

    const finishGlow = this.add.rectangle(
      finishX,
      groundY - 227,
      190,
      6,
      0x7dfcff,
      0.9,
    );

    finishGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.add
      .text(finishX, groundY - 270, "FINISH", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#d7fcff",
        letterSpacing: 5,
      })
      .setOrigin(0.5);
  }

  private createCollectibles() {
    this.levelConfig.collectibles.forEach((position, index) => {
      const glow = this.add.circle(position.x, position.y, 35, 0x65f7ff, 0.12);

      glow.setBlendMode(Phaser.BlendModes.ADD);

      const orb = this.add
        .image(position.x, position.y, "energy-orb")
        .setDisplaySize(72, 72)
        .setDepth(20);

      const ring = this.add.circle(position.x, position.y, 23, 0x000000, 0);

      ring.setStrokeStyle(2, 0x71ecff, 0.55);

      glow.setDepth(18);
      ring.setDepth(19);

      this.collectibles.push({
        id: index + 1,
        x: position.x,
        y: position.y,
        collected: false,
        glow,
        orb,
        ring,
      });
    });
  }

  private createCheckpoints() {
    this.levelConfig.checkpoints.forEach((checkpoint, index) => {
      this.add.rectangle(checkpoint.x, checkpoint.y, 12, 135, 0x3a4d72, 1);

      const glow = this.add.circle(
        checkpoint.x,
        checkpoint.y - 80,
        30,
        0x68eaff,
        0.1,
      );

      glow.setBlendMode(Phaser.BlendModes.ADD);

      const light = this.add.circle(
        checkpoint.x,
        checkpoint.y - 80,
        11,
        0x6defff,
        1,
      );

      const label = this.add
        .text(checkpoint.x, checkpoint.y - 122, `CHECKPOINT ${index + 1}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#9af6ff",
          letterSpacing: 2,
        })
        .setOrigin(0.5);

      this.checkpoints.push({
        id: index + 1,
        x: checkpoint.x,
        y: checkpoint.y,
        respawnX: checkpoint.respawnX,
        respawnY: checkpoint.respawnY,
        reached: false,
        light,
        glow,
        label,
      });
    });
  }

  private createRouteLabels() {
    (this.levelConfig.routeLabels ?? []).forEach((marker) => {
      this.add
        .text(marker.x, marker.y, marker.title, {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          fontStyle: "bold",
          color: marker.color,
          letterSpacing: 4,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(30);

      this.add
        .text(marker.x, marker.y + 30, marker.subtitle, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: marker.color,
          letterSpacing: 2,
          align: "center",
        })
        .setOrigin(0.5)
        .setAlpha(0.72)
        .setDepth(30);
    });
  }

  private createTraps() {
    if (
      !this.levelConfig.assets.dynamite ||
      !this.levelConfig.assets.explosion
    ) {
      return;
    }

    (this.levelConfig.traps ?? []).forEach((trap) => {
      // trap.y is used only as a route hint when multiple terrain surfaces
      // overlap at the same x-position. The exact sprite position still
      // comes from the sampled terrain surface below.
      const terrainPose = this.getTerrainPoseAtX(trap.x, trap.y);
      const surfaceY = terrainPose?.y ?? trap.y ?? this.levelConfig.start.y;
      const spriteY = surfaceY - 32;
      const terrainAngle = terrainPose?.angle ?? 0;

      const glow = this.add.circle(trap.x, spriteY, 48, 0xff5c72, 0.12);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(17);

      const sprite = this.add
        .image(trap.x, spriteY, "dreamkeeper-dynamite")
        .setDisplaySize(80, 54)
        .setRotation(terrainAngle)
        .setDepth(24);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.08, to: 0.22 },
        scale: { from: 0.88, to: 1.12 },
        duration: 680,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.traps.push({
        ...trap,
        y: spriteY,
        armed: true,
        sprite,
        glow,
      });
    });
  }

  private updateTraps() {
    if (!this.roverBody || this.hasFinished || this.trapCollisionLocked) {
      return;
    }

    const triggeredTrap = this.traps.find(
      (trap) =>
        trap.armed &&
        Phaser.Math.Distance.Between(
          this.roverBody!.x,
          this.roverBody!.y,
          trap.x,
          trap.y,
        ) <= trap.blastRadius,
    );

    if (triggeredTrap) {
      this.triggerTrap(triggeredTrap);
    }
  }

  private triggerTrap(trap: TrapItem) {
    if (!this.roverBody || !trap.armed) {
      return;
    }

    trap.armed = false;
    this.trapCollisionLocked = true;
    trap.sprite.setVisible(false);
    trap.glow.setVisible(false);
    this.crashPenalty += trap.penalty;

    const explosion = this.add
      .image(trap.x, trap.y - 8, "dreamkeeper-explosion")
      .setDisplaySize(80, 80)
      .setDepth(80)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: explosion,
      displayWidth: 250,
      displayHeight: 250,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => explosion.destroy(),
    });

    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(120, 255, 108, 70);
    this.showStatusMessage(
      `DREAMKEEPER TRAP  -${trap.penalty}`,
      "#ffb18b",
    );

    this.roverBody.setVelocity(-4.5, -5.5);
    this.roverBody.setAngularVelocity(0);

    this.time.delayedCall(360, () => {
      this.respawnVehicle();
      this.trapCollisionLocked = false;
    });

    this.time.delayedCall(trap.rearmMs, () => {
      if (!this.hasFinished) {
        trap.armed = true;
        trap.sprite.setVisible(true).setAlpha(0);
        trap.glow.setVisible(true);
        this.tweens.add({
          targets: trap.sprite,
          alpha: 1,
          duration: 260,
        });
      }
    });
  }

  private createRover() {
    /*
     * The Matter image provides the collision and movement body, but
     * its artwork is hidden. A separate normal image is used for the
     * detailed body PNG so it can be shifted upward independently.
     */
    const roverBody = this.matter.add.image(
      this.levelConfig.start.x,
      this.levelConfig.start.y,
      "rover-body",
    );

    roverBody.setDisplaySize(ROVER_BODY_WIDTH, ROVER_BODY_HEIGHT);

    roverBody.setRectangle(ROVER_COLLISION_WIDTH, ROVER_COLLISION_HEIGHT, {
      label: "rover-chassis",
    });

    roverBody.setMass(12);
    roverBody.setFriction(0.88);
    roverBody.setFrictionStatic(1);
    roverBody.setFrictionAir(0.035);
    roverBody.setBounce(0.01);
    roverBody.setAlpha(0);
    roverBody.setDepth(18);

    this.roverBody = roverBody;

    this.roverBodyVisual = this.add.image(
      this.levelConfig.start.x,
      this.levelConfig.start.y + ROVER_BODY_VISUAL_OFFSET_Y,
      "rover-body",
    );

    this.roverBodyVisual.setDisplaySize(ROVER_BODY_WIDTH, ROVER_BODY_HEIGHT);

    /*
     * The source body PNG faces left. Flip only the visible artwork.
     */
    this.roverBodyVisual.setFlipX(true);
    this.roverBodyVisual.setDepth(20);

    this.leftWheelVisual = this.add.image(
      this.levelConfig.start.x + LEFT_WHEEL_OFFSET_X,
      this.levelConfig.start.y + WHEEL_OFFSET_Y,
      "rover-wheel",
    );

    this.leftWheelVisual.setDisplaySize(WHEEL_SIZE, WHEEL_SIZE);

    /*
     * Wheels are placed in front of the body artwork so the lower
     * armour cannot hide most of each wheel.
     */
    this.leftWheelVisual.setDepth(21);

    this.rightWheelVisual = this.add.image(
      this.levelConfig.start.x + RIGHT_WHEEL_OFFSET_X,
      this.levelConfig.start.y + WHEEL_OFFSET_Y,
      "rover-wheel",
    );

    this.rightWheelVisual.setDisplaySize(WHEEL_SIZE, WHEEL_SIZE);

    this.rightWheelVisual.setDepth(21);

    this.updateRoverVisuals(0);
  }

  private createControls() {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.boostKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
  }

  private createInterface() {
    const statusPanel = this.createHudPanel(42, 42, 390, 245);

    statusPanel.setOrigin(0, 0);

    this.add
      .text(70, 62, "ROVER STATUS", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#72eaff",
        letterSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.speedText = this.add
      .text(70, 92, "SPEED  000", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.distanceText = this.add
      .text(70, 122, "DISTANCE  0 M", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#a9b6d1",
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.scoreText = this.add
      .text(70, 149, "SCORE  0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.collectibleText = this.add
      .text(
        70,
        178,
        `ENERGY ORBS  0 / ${this.levelConfig.collectibles.length}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#89edf8",
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.checkpointText = this.add
      .text(
        70,
        201,
        `CHECKPOINTS  0 / ${this.levelConfig.checkpoints.length}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#89edf8",
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.objectiveText = this.add
      .text(
        70,
        227,
        (this.levelConfig.traps?.length ?? 0) > 0
          ? "OBJECTIVE  REACH FINISH · AVOID TRAPS"
          : "OBJECTIVE  REACH THE FINISH GATE",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#8defff",
          letterSpacing: 1,
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.roverStageText = this.add
      .text(
        70,
        252,
        `STAGE ${this.roverStage}  ${this.roverName.toUpperCase()}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#ffd76a",
          letterSpacing: 1,
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    const timerPanel = this.createHudPanel(GAME_WIDTH / 2 - 115, 42, 230, 92);

    timerPanel.setOrigin(0, 0);

    this.add
      .text(
        GAME_WIDTH / 2,
        62,
        `LEVEL ${this.levelConfig.id} · ${this.levelConfig.title.toUpperCase()}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          color: "#91a4c9",
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 91, "00:00.0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "29px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    const boostPanel = this.createHudPanel(GAME_WIDTH - 390, 42, 348, 102);

    boostPanel.setOrigin(0, 0);

    this.boostText = this.add
      .text(GAME_WIDTH - 362, 64, "BOOST ENERGY  100%", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#9af6ff",
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(101);

    const boostBarBackground = this.add.rectangle(
      GAME_WIDTH - 362,
      106,
      290,
      14,
      0x26314d,
      1,
    );

    boostBarBackground.setOrigin(0, 0.5);

    boostBarBackground.setScrollFactor(0);

    boostBarBackground.setDepth(101);

    this.boostBarFill = this.add.rectangle(
      GAME_WIDTH - 362,
      106,
      290,
      14,
      0x62edff,
      1,
    );

    this.boostBarFill.setOrigin(0, 0.5);
    this.boostBarFill.setScrollFactor(0);
    this.boostBarFill.setDepth(102);

    const controlsPanel = this.createHudPanel(
      GAME_WIDTH / 2 - 445,
      GAME_HEIGHT - 93,
      890,
      62,
    );

    controlsPanel.setOrigin(0, 0);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 62,
        this.jumpVelocity < 0
          ? "A / D OR ← / →  DRIVE     W OR ↑  JUMP     SPACE  BOOST     R  RESTART"
          : "A / D OR ← / →  DRIVE     JUMP MODULE LOCKED     SPACE  BOOST     R  RESTART",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#c6d2ea",
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
  }

  private createHudPanel(x: number, y: number, width: number, height: number) {
    const panel = this.add.rectangle(x, y, width, height, 0x050816, 0.76);

    panel.setStrokeStyle(1, 0xffffff, 0.1);

    panel.setScrollFactor(0);
    panel.setDepth(100);

    return panel;
  }

  private requestRestart() {
    if (this.restartRequested) {
      return;
    }

    this.restartRequested = true;

    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
    }

    window.dispatchEvent(new Event("rover-restart-requested"));
  }

  private createTouchControls() {
    this.input.addPointer(3);

    this.createTouchButton(
      105,
      GAME_HEIGHT - 125,
      80,
      "←",
      () => {
        this.touchLeft = true;
      },
      () => {
        this.touchLeft = false;
      },
    );

    this.createTouchButton(
      205,
      GAME_HEIGHT - 125,
      80,
      "→",
      () => {
        this.touchRight = true;
      },
      () => {
        this.touchRight = false;
      },
    );

    this.createTouchButton(
      GAME_WIDTH - 330,
      GAME_HEIGHT - 125,
      88,
      this.jumpVelocity < 0 ? "JUMP" : "LOCKED",
      () => {
        this.tryJump();
      },
      () => undefined,
    );

    this.createTouchButton(
      GAME_WIDTH - 205,
      GAME_HEIGHT - 125,
      100,
      "BOOST",
      () => {
        this.touchBoost = true;
      },
      () => {
        this.touchBoost = false;
      },
    );

    this.createTouchButton(
      GAME_WIDTH - 85,
      GAME_HEIGHT - 125,
      66,
      "R",
      () => {
        this.requestRestart();
      },
      () => undefined,
    );
  }

  private createTouchButton(
    x: number,
    y: number,
    size: number,
    label: string,
    onPress: () => void,
    onRelease: () => void,
  ): TouchButton {
    const background = this.add.circle(x, y, size / 2, 0x071020, 0.72);

    background.setStrokeStyle(2, 0x78efff, 0.4);

    background.setScrollFactor(0);
    background.setDepth(150);

    background.setInteractive({
      useHandCursor: true,
    });

    const buttonLabel = this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize:
          label === "BOOST" || label === "JUMP" || label === "LOCKED"
            ? "12px"
            : "28px",
        fontStyle: "bold",
        color: "#d8fbff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(151);

    const press = () => {
      background.setFillStyle(0x17465a, 0.92);

      background.setScale(0.94);
      buttonLabel.setScale(0.94);
      onPress();
    };

    const release = () => {
      background.setFillStyle(0x071020, 0.72);

      background.setScale(1);
      buttonLabel.setScale(1);
      onRelease();
    };

    background.on("pointerdown", press);

    background.on("pointerup", release);

    background.on("pointerout", release);

    background.on("pointerupoutside", release);

    return {
      background,
      label: buttonLabel,
    };
  }

  private configureCamera() {
    if (!this.roverBody) {
      return;
    }

    this.cameras.main.setBounds(
      0,
      0,
      this.levelConfig.worldWidth,
      this.levelConfig.worldHeight,
    );

    this.cameras.main.startFollow(this.roverBody, true, 0.075, 0.075, -280, 80);

    this.cameras.main.setDeadzone(260, 170);
  }

  private handleMovement(delta: number) {
    const { roverBody, cursors, keyA, keyD, keyW, keyR, boostKey } = this;

    if (
      !roverBody ||
      !cursors ||
      !keyA ||
      !keyD ||
      !keyW ||
      !keyR ||
      !boostKey
    ) {
      return;
    }

    const body = roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(keyR)) {
      this.requestRestart();
      return;
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(keyW) ||
      Phaser.Input.Keyboard.JustDown(cursors.up);

    if (jumpPressed) {
      this.tryJump();
    }

    if (this.hasFinished) {
      roverBody.setVelocityX(body.velocity.x * 0.95);

      return;
    }

    const movingLeft = cursors.left.isDown || keyA.isDown || this.touchLeft;

    const movingRight = cursors.right.isDown || keyD.isDown || this.touchRight;

    const direction =
      movingRight && !movingLeft ? 1 : movingLeft && !movingRight ? -1 : 0;

    const usingBoost =
      (boostKey.isDown || this.touchBoost) &&
      this.boostEnergy > 0 &&
      direction !== 0;

    if ((direction !== 0 || jumpPressed) && !this.hasStarted) {
      this.hasStarted = true;
    }

    const maximumSpeed = usingBoost
      ? this.boostedMaximumSpeed
      : this.normalMaximumSpeed;

    const targetVelocityX = direction * maximumSpeed;

    const responseRate =
      direction === 0 ? this.brakingRate : this.accelerationRate;

    const horizontalSmoothing = 1 - Math.exp(-responseRate * (delta / 1000));

    const nextVelocityX = Phaser.Math.Linear(
      body.velocity.x,
      targetVelocityX,
      horizontalSmoothing,
    );

    /*
     * Matter gravity controls vertical movement. We only smooth the
     * horizontal drive speed, preventing slopes from draining power or
     * forcing the rover to hover above the course.
     */
    roverBody.setVelocityX(nextVelocityX);

    /*
     * Only provide gentle air tilt after the rover has
     * genuinely left the terrain.
     */
    const travellingAtHighSpeed =
      Math.abs(body.velocity.x) >= this.normalMaximumSpeed * 0.9;

    if (
      this.isProbablyAirborne() &&
      direction !== 0 &&
      !travellingAtHighSpeed
    ) {
      const targetAngularVelocity = direction * this.airTiltStrength;

      const nextAngularVelocity = Phaser.Math.Linear(
        body.angularVelocity,
        targetAngularVelocity,
        0.06,
      );

      roverBody.setAngularVelocity(
        Phaser.Math.Clamp(nextAngularVelocity, -0.026, 0.026),
      );
    }

    const seconds = delta / 1000;

    if (usingBoost) {
      this.boostEnergy -= this.boostDrainRate * seconds;
    } else {
      this.boostEnergy += this.boostRechargeRate * seconds;
    }

    this.boostEnergy = Phaser.Math.Clamp(
      this.boostEnergy,
      0,
      this.maximumBoostEnergy,
    );
  }

  private tryJump() {
    if (!this.roverBody) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    if (this.jumpVelocity >= 0) {
      this.showStatusMessage("JUMP MODULE LOCKED", "#ffd76a");

      return;
    }

    const now = this.time.now;

    const jumpReady = now - this.lastJumpAt >= this.jumpCooldownMs;

    const grounded = this.activeTerrainContacts.size > 0;

    if (!jumpReady || !grounded || this.hasFinished) {
      return;
    }

    this.lastJumpAt = now;
    this.hasStarted = true;

    this.roverBody.setVelocityY(this.jumpVelocity);

    this.showStatusMessage("JUMP", "#9af6ff");
  }

  private updateGroundState(delta: number) {
    if (this.activeTerrainContacts.size === 0) {
      this.airborneTime += delta;
    } else {
      this.airborneTime = 0;
    }
  }

  private isProbablyAirborne() {
    return (
      this.activeTerrainContacts.size === 0 &&
      this.airborneTime >= this.airborneTiltDelayMs
    );
  }

  private stabilizeRover(delta: number) {
    if (!this.roverBody) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const grounded = this.activeTerrainContacts.size > 0;

    const currentRotation = Phaser.Math.Angle.Wrap(this.roverBody.rotation);

    if (grounded) {
      const terrainAngle =
        this.getTerrainAngleAtX(this.roverBody.x) ?? currentRotation;

      const angleError = Phaser.Math.Angle.Wrap(terrainAngle - currentRotation);

      const alignmentSmoothing =
        1 - Math.exp(-this.groundAlignmentRate * (delta / 1000));

      /*
       * Rotate the complete collision chassis toward the local slope.
       * The visible body and both wheels use this same rotation.
       */
      this.roverBody.setRotation(
        currentRotation + angleError * alignmentSmoothing,
      );

      this.roverBody.setAngularVelocity(
        Phaser.Math.Linear(body.angularVelocity, 0, alignmentSmoothing),
      );

      return;
    }

    const travellingAtHighSpeed =
      Math.abs(body.velocity.x) >= this.normalMaximumSpeed * 0.9;

    if (travellingAtHighSpeed) {
      const highSpeedLeveling = 1 - Math.exp(-12 * (delta / 1000));

      this.roverBody.setRotation(
        Phaser.Math.Linear(currentRotation, 0, highSpeedLeveling),
      );
      this.roverBody.setAngularVelocity(
        Phaser.Math.Linear(body.angularVelocity, 0, highSpeedLeveling),
      );

      return;
    }

    /*
     * At boost speed the rover can leave a hill while still carrying
     * the hill's pitch and collision-generated angular velocity. A
     * short delay preserves the natural take-off angle, then a gentle
     * spring brings the chassis back toward level for a predictable
     * landing. The hard limit is only a final safety net.
     */
    const maximumAirRotation = Phaser.Math.DegToRad(34);

    const boundedRotation = Phaser.Math.Clamp(
      currentRotation,
      -maximumAirRotation,
      maximumAirRotation,
    );

    if (boundedRotation !== currentRotation) {
      this.roverBody.setRotation(boundedRotation);
    }

    if (this.airborneTime < this.airborneLevelingDelayMs) {
      if (boundedRotation !== currentRotation) {
        this.roverBody.setAngularVelocity(body.angularVelocity * 0.2);
      }

      return;
    }

    const seconds = delta / 1000;

    const levelingSmoothing =
      1 - Math.exp(-this.airborneLevelingRate * seconds);

    const angularDamping = Math.exp(-this.airborneAngularDampingRate * seconds);

    const levelledRotation = Phaser.Math.Linear(
      boundedRotation,
      0,
      levelingSmoothing,
    );

    this.roverBody.setRotation(
      Phaser.Math.Clamp(
        levelledRotation,
        -maximumAirRotation,
        maximumAirRotation,
      ),
    );

    this.roverBody.setAngularVelocity(
      Phaser.Math.Clamp(body.angularVelocity * angularDamping, -0.018, 0.018),
    );
  }

  private getTerrainAngleAtX(x: number) {
    const targetSurfaceY =
      (this.roverBody?.y ?? this.levelConfig.start.y) +
      ROVER_COLLISION_HEIGHT / 2;
    let closest:
      | {
          angle: number;
          distance: number;
        }
      | undefined;

    for (const section of this.terrainSections) {
      if (section.length < 2) {
        continue;
      }

      const first = section[0];

      const last = section[section.length - 1];

      if (x < first.x || x > last.x) {
        continue;
      }

      let low = 0;
      let high = section.length - 2;

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);

        const current = section[middle];

        const next = section[middle + 1];

        if (x >= current.x && x <= next.x) {
          const span = Math.max(0.001, next.x - current.x);
          const ratio = Phaser.Math.Clamp((x - current.x) / span, 0, 1);
          const surfaceY = Phaser.Math.Linear(current.y, next.y, ratio);
          const candidate = {
            angle: Math.atan2(next.y - current.y, next.x - current.x),
            distance: Math.abs(surfaceY - targetSurfaceY),
          };

          if (!closest || candidate.distance < closest.distance) {
            closest = candidate;
          }

          break;
        }

        if (x < current.x) {
          high = middle - 1;
        } else {
          low = middle + 1;
        }
      }
    }

    return closest?.angle ?? null;
  }

  private getTerrainPoseAtX(x: number, preferredSurfaceY?: number) {
    const candidates: Array<{ y: number; angle: number }> = [];

    for (const section of this.terrainSections) {
      if (section.length < 2) {
        continue;
      }

      const firstPoint = section[0];
      const lastPoint = section[section.length - 1];

      if (x < firstPoint.x || x > lastPoint.x) {
        continue;
      }

      for (let index = 0; index < section.length - 1; index += 1) {
        const current = section[index];
        const next = section[index + 1];

        if (x < current.x || x > next.x) {
          continue;
        }

        const span = Math.max(0.001, next.x - current.x);
        const ratio = Phaser.Math.Clamp((x - current.x) / span, 0, 1);

        candidates.push({
          y: Phaser.Math.Linear(current.y, next.y, ratio),
          angle: Math.atan2(next.y - current.y, next.x - current.x),
        });

        break;
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    if (preferredSurfaceY === undefined) {
      return candidates[0];
    }

    return candidates.reduce((closest, candidate) =>
      Math.abs(candidate.y - preferredSurfaceY) <
      Math.abs(closest.y - preferredSurfaceY)
        ? candidate
        : closest,
    );
  }

  private updateRoverVisuals(delta: number) {
    if (
      !this.roverBody ||
      !this.roverBodyVisual ||
      !this.leftWheelVisual ||
      !this.rightWheelVisual
    ) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const rotation = this.roverBody.rotation;

    const bodyOffset = this.rotateOffset(
      0,
      ROVER_BODY_VISUAL_OFFSET_Y,
      rotation,
    );

    this.roverBodyVisual.setPosition(
      this.roverBody.x + bodyOffset.x,
      this.roverBody.y + bodyOffset.y,
    );

    this.roverBodyVisual.setRotation(rotation);

    const leftOffset = this.rotateOffset(
      LEFT_WHEEL_OFFSET_X,
      WHEEL_OFFSET_Y,
      rotation,
    );

    const rightOffset = this.rotateOffset(
      RIGHT_WHEEL_OFFSET_X,
      WHEEL_OFFSET_Y,
      rotation,
    );

    this.leftWheelVisual.setPosition(
      this.roverBody.x + leftOffset.x,
      this.roverBody.y + leftOffset.y,
    );

    this.rightWheelVisual.setPosition(
      this.roverBody.x + rightOffset.x,
      this.roverBody.y + rightOffset.y,
    );

    this.wheelSpin += body.velocity.x * 0.012 * (delta / 16.667);

    /*
     * The wheel artwork spins around the same base slope angle as the
     * body, so all rover components visually follow hills together.
     */
    this.leftWheelVisual.setRotation(rotation + this.wheelSpin);

    this.rightWheelVisual.setRotation(rotation + this.wheelSpin);
  }

  private rotateOffset(offsetX: number, offsetY: number, rotation: number) {
    return {
      x: offsetX * Math.cos(rotation) - offsetY * Math.sin(rotation),

      y: offsetX * Math.sin(rotation) + offsetY * Math.cos(rotation),
    };
  }

  private registerCollisionHandlers() {
    const collisionStart = (
      event: Phaser.Physics.Matter.Events.CollisionStartEvent,
    ) => {
      event.pairs.forEach((pair) => {
        if (!this.isRoverTerrainPair(pair)) {
          return;
        }

        const wasAirborne = this.activeTerrainContacts.size === 0;

        this.activeTerrainContacts.add(pair.id);

        if (wasAirborne) {
          this.handleLanding();
        }
      });
    };

    const collisionEnd = (
      event: Phaser.Physics.Matter.Events.CollisionEndEvent,
    ) => {
      event.pairs.forEach((pair) => {
        if (!this.isRoverTerrainPair(pair)) {
          return;
        }

        this.activeTerrainContacts.delete(pair.id);
      });
    };

    this.matter.world.on("collisionstart", collisionStart);

    this.matter.world.on("collisionend", collisionEnd);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.matter.world.off("collisionstart", collisionStart);

      this.matter.world.off("collisionend", collisionEnd);
    });
  }

  private isRoverTerrainPair(
    pair: Phaser.Types.Physics.Matter.MatterCollisionPair,
  ) {
    const labels = [pair.bodyA.label, pair.bodyB.label];

    return labels.includes("rover-chassis") && labels.includes("terrain");
  }

  private updateAirborneVelocity() {
    if (!this.isProbablyAirborne() || !this.roverBody) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    this.maximumAirborneDownwardVelocity = Math.max(
      this.maximumAirborneDownwardVelocity,
      body.velocity.y,
    );
  }

  private handleLanding() {
    const landingVelocity = this.maximumAirborneDownwardVelocity;

    this.maximumAirborneDownwardVelocity = 0;

    if (landingVelocity >= 13.5) {
      this.crashPenalty += 250;

      this.showStatusMessage("CRASH LANDING  -250", "#ff9f9f");

      this.time.delayedCall(180, () => {
        this.respawnVehicle();
      });

      return;
    }

    if (landingVelocity >= 8.5) {
      this.crashPenalty += 100;

      this.showStatusMessage("HARD LANDING  -100", "#ffc582");
    }
  }

  private showStatusMessage(message: string, colour: string) {
    const text = this.add
      .text(GAME_WIDTH / 2, 175, message, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: colour,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(190)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 160,
      duration: 180,
      yoyo: true,
      hold: 500,
      onComplete: () => {
        text.destroy();
      },
    });
  }

  private updateTimer(delta: number) {
    if (!this.hasStarted || this.hasFinished) {
      return;
    }

    this.elapsedSeconds += delta / 1000;
  }

  private updateCollectibles(delta: number) {
    if (!this.roverBody) {
      return;
    }

    const rover = this.roverBody;

    this.collectibles.forEach((collectible) => {
      if (collectible.collected) {
        return;
      }

      collectible.ring.rotation += 0.025 * (delta / 16.667);

      collectible.orb.rotation += 0.008 * (delta / 16.667);

      collectible.orb.y =
        collectible.y + Math.sin(this.time.now / 350 + collectible.id) * 7;

      collectible.ring.y = collectible.orb.y;

      collectible.glow.y = collectible.orb.y;

      const distance = Phaser.Math.Distance.Between(
        rover.x,
        rover.y,
        collectible.x,
        collectible.orb.y,
      );

      if (distance <= 120) {
        collectible.collected = true;

        this.collectedCount += 1;
        this.collectibleScore += 100;

        this.tweens.add({
          targets: [collectible.orb, collectible.ring, collectible.glow],
          scale: 1.8,
          alpha: 0,
          duration: 220,
          ease: "Quad.easeOut",
          onComplete: () => {
            collectible.orb.destroy();
            collectible.ring.destroy();
            collectible.glow.destroy();
          },
        });
      }
    });
  }

  private updateCheckpoints() {
    if (!this.roverBody) {
      return;
    }

    const rover = this.roverBody;

    this.checkpoints.forEach((checkpoint) => {
      if (checkpoint.reached) {
        return;
      }

      const horizontalDistance = Math.abs(rover.x - checkpoint.x);

      const verticalDistance = Math.abs(rover.y - checkpoint.y);

      if (horizontalDistance <= 120 && verticalDistance <= 190) {
        checkpoint.reached = true;

        this.reachedCheckpointCount += 1;

        this.checkpointScore += 250;

        this.latestCheckpointX = checkpoint.respawnX;

        this.latestCheckpointY = checkpoint.respawnY;

        checkpoint.light.setFillStyle(0x8dffbf, 1);

        checkpoint.glow.setFillStyle(0x65ffac, 0.15);

        checkpoint.label
          .setText(`CHECKPOINT ${checkpoint.id} ACTIVE`)
          .setColor("#8dffbf");

        this.tweens.add({
          targets: checkpoint.glow,
          scale: 1.8,
          alpha: 0.25,
          duration: 280,
          yoyo: true,
        });
      }
    });
  }

  private updateScore() {
    if (!this.roverBody) {
      return;
    }

    this.distanceScore = Math.max(
      this.distanceScore,
      Math.floor(
        Math.max(0, this.roverBody.x - this.levelConfig.start.x) / 4,
      ),
    );

    this.score = Math.max(
      0,
      this.distanceScore +
        this.collectibleScore +
        this.checkpointScore +
        this.completionScore +
        this.timeBonus -
        this.crashPenalty,
    );
  }

  private updateInterface() {
    if (
      !this.roverBody ||
      !this.speedText ||
      !this.distanceText ||
      !this.scoreText ||
      !this.timerText ||
      !this.collectibleText ||
      !this.checkpointText ||
      !this.boostText ||
      !this.boostBarFill
    ) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const speed = Math.round(Math.abs(body.velocity.x) * 45);

    const distance = Math.max(
      0,
      Math.round((this.roverBody.x - this.levelConfig.start.x) / 4),
    );

    const boostPercentage = Math.round(
      (this.boostEnergy / this.maximumBoostEnergy) * 100,
    );

    this.speedText.setText(`SPEED  ${speed.toString().padStart(3, "0")}`);

    this.distanceText.setText(`DISTANCE  ${distance.toLocaleString()} M`);

    this.scoreText.setText(`SCORE  ${this.score.toLocaleString()}`);

    this.collectibleText.setText(
      `ENERGY ORBS  ${this.collectedCount} / ${this.collectibles.length}`,
    );

    this.checkpointText.setText(
      `CHECKPOINTS  ${this.reachedCheckpointCount} / ${this.checkpoints.length}`,
    );

    this.timerText.setText(this.formatTime(this.elapsedSeconds));

    this.boostText.setText(`BOOST ENERGY  ${boostPercentage}%`);

    this.boostBarFill.width =
      290 * (this.boostEnergy / this.maximumBoostEnergy);

    if (this.boostEnergy <= 20) {
      this.boostBarFill.setFillStyle(0xffbd72, 1);
    } else {
      this.boostBarFill.setFillStyle(0x62edff, 1);
    }
  }

  private formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toFixed(1)
      .padStart(4, "0")}`;
  }

  private checkFinish() {
    if (!this.roverBody || !this.objectiveText || this.hasFinished) {
      return;
    }

    if (this.roverBody.x < this.levelConfig.finish.x) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    this.hasFinished = true;
    this.completionScore = 2000;

    this.timeBonus = Math.max(
      0,
      Math.round(
        (this.levelConfig.timeLimitSeconds - this.elapsedSeconds) * 15,
      ),
    );

    this.updateScore();

    this.objectiveText
      .setText("OBJECTIVE  COURSE COMPLETE")
      .setColor("#8dffbf");

    this.roverBody.setVelocityX(Math.min(body.velocity.x, 2.2));

    this.showFinishResults();
    this.emitCourseCompleted();
  }

  private emitCourseCompleted() {
    window.dispatchEvent(
      new CustomEvent("rover-course-complete", {
        detail: {
          levelId: this.levelConfig.id,
          courseId: this.levelConfig.courseId,
          roverStage: this.roverStage,
          score: this.score,
          completionTimeMs: Math.max(1, Math.round(this.elapsedSeconds * 1000)),
          orbsCollected: this.collectedCount,
          checkpointsReached: this.reachedCheckpointCount,
          crashPenalty: this.crashPenalty,
        },
      }),
    );
  }

  private showFinishResults() {
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      840,
      550,
      0x050816,
      0.95,
    );

    overlay.setStrokeStyle(2, 0x7fffe5, 0.35);

    overlay.setScrollFactor(0);
    overlay.setDepth(200);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 210, "COURSE COMPLETE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "42px",
        fontStyle: "bold",
        color: "#baffdf",
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 140,
        `FINAL SCORE  ${this.score.toLocaleString()}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "29px",
          fontStyle: "bold",
          color: "#ffffff",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    const results = [
      `Course time: ${this.formatTime(this.elapsedSeconds)}`,
      `Distance points: ${this.distanceScore.toLocaleString()}`,
      `Energy orbs: ${this.collectedCount} / ${this.collectibles.length}  (+${this.collectibleScore.toLocaleString()})`,
      `Checkpoints: ${this.reachedCheckpointCount} / ${this.checkpoints.length}  (+${this.checkpointScore.toLocaleString()})`,
      `Completion bonus: +${this.completionScore.toLocaleString()}`,
      `Time bonus: +${this.timeBonus.toLocaleString()}`,
      `Crash penalties: -${this.crashPenalty.toLocaleString()}`,
    ];

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25, results.join("\n"), {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#c7d4e8",
        align: "center",
        lineSpacing: 11,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 235,
        "PRESS R TO RUN THE COURSE AGAIN",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          fontStyle: "bold",
          color: "#7cecff",
          letterSpacing: 3,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);
  }

  private checkFall() {
    if (!this.roverBody) {
      return;
    }

    if (this.roverBody.y > this.levelConfig.worldHeight - 170) {
      this.crashPenalty += 150;

      this.showStatusMessage("COURSE FALL  -150", "#ffb0b0");

      this.respawnVehicle();
    }
  }

  private checkOverturned(delta: number) {
    if (!this.roverBody || this.hasFinished) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const rotation = Math.abs(Phaser.Math.Angle.Wrap(this.roverBody.rotation));

    const badlyOverturned = rotation > Phaser.Math.DegToRad(48);

    const movingSlowly =
      Math.abs(body.velocity.x) < 0.8 && Math.abs(body.velocity.y) < 0.8;

    const grounded = this.activeTerrainContacts.size > 0;

    if (badlyOverturned && movingSlowly && grounded) {
      this.overturnedTime += delta;
    } else {
      this.overturnedTime = 0;
    }

    if (this.overturnedTime >= 1500) {
      this.crashPenalty += 200;

      this.showStatusMessage("ROVER OVERTURNED  -200", "#ffb0b0");

      this.respawnVehicle();
    }
  }

  private respawnVehicle() {
    if (!this.roverBody) {
      return;
    }

    this.cameras.main.flash(180, 90, 120, 160);

    this.activeTerrainContacts.clear();
    this.maximumAirborneDownwardVelocity = 0;
    this.airborneTime = 0;
    this.overturnedTime = 0;

    this.roverBody.setPosition(this.latestCheckpointX, this.latestCheckpointY);

    this.roverBody.setVelocity(0, 0);
    this.roverBody.setAngularVelocity(0);
    this.roverBody.setRotation(0);

    this.boostEnergy = Math.max(this.boostEnergy, 40);

    this.updateRoverVisuals(0);
  }
}

export default function PhaserGame({
  levelConfig,
  roverStage,
  roverName,
  gameStats,
}: PhaserGameProps) {
  const gameContainerRef = useRef<HTMLDivElement | null>(null);

  const gameRef = useRef<Phaser.Game | null>(null);

  const [gameVersion, setGameVersion] = useState(0);

  useEffect(() => {
    const handleRestartRequest = () => {
      setGameVersion((current) => current + 1);
    };

    window.addEventListener("rover-restart-requested", handleRestartRequest);

    return () => {
      window.removeEventListener(
        "rover-restart-requested",
        handleRestartRequest,
      );
    };
  }, []);

  useEffect(() => {
    if (!gameContainerRef.current) {
      return;
    }

    gameRef.current?.destroy(true);
    gameRef.current = null;

    const scene = new RoverMatterScene({
      levelConfig,
      roverStage,
      roverName,
      gameStats,
    });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,

      width: GAME_WIDTH,
      height: GAME_HEIGHT,

      parent: gameContainerRef.current,

      backgroundColor: "#070a18",

      transparent: false,
      antialias: true,
      pixelArt: false,
      roundPixels: false,

      physics: {
        default: "matter",

        matter: {
          gravity: {
            x: 0,
            y: 1.15,
          },

          enableSleeping: false,
          debug: false,
        },
      },

      scale: {
        mode: Phaser.Scale.FIT,

        autoCenter: Phaser.Scale.CENTER_BOTH,

        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },

      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
      },

      scene: [scene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (gameRef.current === game) {
          game.scale.refresh();
        }
      });
    });

    resizeObserver.observe(gameContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameVersion, levelConfig, roverStage, roverName, gameStats]);

  return (
    <div
      ref={gameContainerRef}
      className="h-full w-full overflow-hidden bg-[#070a18]"
      aria-label="Rover Challenge game"
      style={{
        width: "100vw",
        height: "100dvh",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    />
  );
}
