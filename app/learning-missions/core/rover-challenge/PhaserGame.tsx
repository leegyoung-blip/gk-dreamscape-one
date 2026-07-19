"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 900;

const WORLD_WIDTH = 6500;
const WORLD_HEIGHT = 1200;

const ROVER_START_X = 360;
const ROVER_START_Y = 500;

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

const COURSE_ID = "skyforge-test-track-01";

const FINISH_X = 6120;
const COURSE_TIME_LIMIT_SECONDS = 90;

const TOTAL_COLLECTIBLES = 8;
const TOTAL_CHECKPOINTS = 3;

type CollectibleItem = {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  glow: Phaser.GameObjects.Arc;
  orb: Phaser.GameObjects.Arc;
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

class RoverMatterScene extends Phaser.Scene {
  private roverBody?: Phaser.Physics.Matter.Image;
  private roverBodyVisual?: Phaser.GameObjects.Image;
  private leftWheelVisual?: Phaser.GameObjects.Image;
  private rightWheelVisual?: Phaser.GameObjects.Image;

  private terrainSections: Array<
    Array<{ x: number; y: number }>
  > = [];

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
  private boostText?: Phaser.GameObjects.Text;
  private boostBarFill?: Phaser.GameObjects.Rectangle;

  private collectibles: CollectibleItem[] = [];
  private checkpoints: CheckpointItem[] = [];

  private boostEnergy = 100;
  private readonly maximumBoostEnergy = 100;

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

  private latestCheckpointX = ROVER_START_X;
  private latestCheckpointY = ROVER_START_Y;

  private activeTerrainContacts = new Set<string>();
  private maximumAirborneDownwardVelocity = 0;
  private airborneTime = 0;
  private overturnedTime = 0;
  private lastJumpAt = -1000;
  private restartRequested = false;

  /*
   * Balanced driving values: faster than the previous build,
   * but still gradual and controllable.
   */
  private readonly normalMaximumSpeed = 12.0;
  private readonly boostedMaximumSpeed = 18.0;

  /*
   * These are response rates per second rather than fixed per-frame
   * percentages, so movement remains smooth at different frame rates.
   */
  private readonly accelerationRate = 4.6;
  private readonly brakingRate = 6.5;
  private readonly slopeVelocityRate = 5.5;
  private readonly groundAlignmentRate = 8.5;
  private readonly jumpVelocity = -8.6;
  private readonly jumpCooldownMs = 420;
  private readonly airborneTiltDelayMs = 150;

  constructor() {
    super({
      key: "RoverMatterScene",
    });
  }

  preload() {
    this.load.image(
      "rover-body",
      "/games/rover/rover-body.png",
    );

    this.load.image(
      "rover-wheel",
      "/games/rover/rover-wheel.png",
    );

    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        console.error(
          `[Rover Challenge] Could not load asset: ${file.src}`,
        );
      },
    );
  }

  create() {
    this.resetGameValues();

    this.matter.world.setBounds(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
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
    this.createStartGate();
    this.createFinishGate();
    this.createCollectibles();
    this.createCheckpoints();
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

    this.updateGroundState(delta);
    this.handleMovement(delta);
    this.stabilizeRover(delta);
    this.updateRoverVisuals(delta);
    this.updateTimer(delta);
    this.updateAirborneVelocity();
    this.updateCollectibles(delta);
    this.updateCheckpoints();
    this.updateScore();
    this.updateInterface();
    this.checkFinish();
    this.checkFall();
    this.checkOverturned(delta);
  }

  private resetGameValues() {
    this.collectibles = [];
    this.checkpoints = [];
    this.terrainSections = [];

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

    this.latestCheckpointX = ROVER_START_X;
    this.latestCheckpointY = ROVER_START_Y;

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
      missingAssets.push(
        "public/games/rover/rover-body.png",
      );
    }

    if (!this.textures.exists("rover-wheel")) {
      missingAssets.push(
        "public/games/rover/rover-wheel.png",
      );
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

    const background = this.add.graphics();

    background.fillStyle(0x151b42, 1);
    background.fillRect(0, 0, WORLD_WIDTH, 420);

    background.fillStyle(0x0e1534, 1);
    background.fillRect(0, 420, WORLD_WIDTH, 430);

    background.fillStyle(0x080c1e, 1);
    background.fillRect(0, 850, WORLD_WIDTH, 350);

    for (let x = 80; x < WORLD_WIDTH; x += 130) {
      const firstY = 60 + ((x * 17) % 280);
      const secondY = 80 + ((x * 29) % 280);

      this.add.circle(
        x,
        firstY,
        1.5,
        0xbadfff,
        0.75,
      );

      this.add.circle(
        x + 55,
        secondY,
        1,
        0xffffff,
        0.45,
      );
    }

    this.add.circle(
      1280,
      170,
      86,
      0x8496d7,
      0.12,
    );

    this.add.circle(
      1280,
      170,
      58,
      0xb4c8ff,
      0.08,
    );

    this.add.circle(
      3900,
      220,
      118,
      0x7b88d4,
      0.09,
    );

    this.add.circle(
      3900,
      220,
      76,
      0xc5dcff,
      0.06,
    );

    this.createMountainLayer(
      0x111938,
      0.95,
      350,
      650,
      430,
      250,
    );

    this.createMountainLayer(
      0x0b1129,
      1,
      460,
      720,
      330,
      190,
    );

    const haze = this.add.rectangle(
      WORLD_WIDTH / 2,
      620,
      WORLD_WIDTH,
      190,
      0x425cc7,
      0.07,
    );

    haze.setBlendMode(Phaser.BlendModes.ADD);

    for (let x = 900; x < WORLD_WIDTH; x += 900) {
      const towerHeight =
        90 + ((x / 10) % 90);

      this.add.rectangle(
        x,
        640 - towerHeight / 2,
        48,
        towerHeight,
        0x182145,
        0.7,
      );

      this.add.rectangle(
        x,
        640 - towerHeight,
        8,
        42,
        0x4beaff,
        0.25,
      );

      this.add.circle(
        x,
        640 - towerHeight - 24,
        6,
        0x7effff,
        0.65,
      );
    }
  }

  private createMountainLayer(
    colour: number,
    alpha: number,
    minimumY: number,
    baseY: number,
    sectionWidth: number,
    heightVariation: number,
  ) {
    const mountains = this.add.graphics();

    mountains.fillStyle(colour, alpha);
    mountains.beginPath();
    mountains.moveTo(0, baseY);

    let x = 0;

    while (x <= WORLD_WIDTH) {
      const peakX = x + sectionWidth / 2;
      const peakOffset =
        (x * 13) % heightVariation;
      const peakY = minimumY + peakOffset;

      mountains.lineTo(peakX, peakY);
      mountains.lineTo(
        x + sectionWidth,
        baseY,
      );

      x += sectionWidth;
    }

    mountains.lineTo(
      WORLD_WIDTH,
      baseY + 150,
    );

    mountains.lineTo(
      0,
      baseY + 150,
    );

    mountains.closePath();
    mountains.fillPath();
  }

  private createTerrain() {
    /*
     * Each section is a Catmull-Rom curve sampled into many small,
     * overlapping Matter bodies. This creates smooth hills and valleys
     * instead of long straight ramps with sharp joins.
     */
    this.createSmoothTerrainSection([
      { x: 0, y: 645 },
      { x: 360, y: 645 },
      { x: 700, y: 635 },
      { x: 1050, y: 585 },
      { x: 1350, y: 560 },
      { x: 1650, y: 610 },
      { x: 1950, y: 650 },
      { x: 2200, y: 635 },
      { x: 2300, y: 610 },
    ]);

    // First jump gap: x 2300–2520.
    this.createSmoothTerrainSection([
      { x: 2520, y: 650 },
      { x: 2750, y: 645 },
      { x: 3050, y: 585 },
      { x: 3350, y: 535 },
      { x: 3650, y: 550 },
      { x: 3950, y: 610 },
      { x: 4250, y: 650 },
      { x: 4400, y: 625 },
    ]);

    // Second jump gap: x 4400–4650.
    this.createSmoothTerrainSection([
      { x: 4650, y: 655 },
      { x: 4900, y: 640 },
      { x: 5200, y: 590 },
      { x: 5500, y: 560 },
      { x: 5800, y: 570 },
      { x: 6100, y: 600 },
      { x: 6350, y: 630 },
      { x: 6500, y: 640 },
    ]);

    this.createStartingPlatform();
    this.createGapWarning(2410, 535);
    this.createGapWarning(4525, 545);
  }

  private createSmoothTerrainSection(
    controlPoints: Array<{ x: number; y: number }>,
  ) {
    const sampledPoints = this.sampleCatmullRom(
      controlPoints,
      12,
    );

    if (sampledPoints.length < 2) {
      return;
    }

    /*
     * Keep the sampled surface so the rover can align itself to the
     * exact local hill angle while it is touching the terrain.
     */
    this.terrainSections.push(
      sampledPoints,
    );

    /*
     * Filled terrain artwork.
     */
    const fill = this.add.graphics();
    fill.setDepth(10);
    fill.fillStyle(0x101629, 1);
    fill.beginPath();
    fill.moveTo(
      sampledPoints[0].x,
      sampledPoints[0].y,
    );

    for (let index = 1; index < sampledPoints.length; index += 1) {
      fill.lineTo(
        sampledPoints[index].x,
        sampledPoints[index].y,
      );
    }

    const finalPoint =
      sampledPoints[sampledPoints.length - 1];

    fill.lineTo(
      finalPoint.x,
      WORLD_HEIGHT,
    );

    fill.lineTo(
      sampledPoints[0].x,
      WORLD_HEIGHT,
    );

    fill.closePath();
    fill.fillPath();

    /*
     * Glowing upper surface.
     */
    const surfaceGlow = this.add.graphics();
    surfaceGlow.setDepth(11);
    surfaceGlow.lineStyle(
      20,
      0x2b7898,
      0.1,
    );

    surfaceGlow.beginPath();
    surfaceGlow.moveTo(
      sampledPoints[0].x,
      sampledPoints[0].y + 7,
    );

    for (let index = 1; index < sampledPoints.length; index += 1) {
      surfaceGlow.lineTo(
        sampledPoints[index].x,
        sampledPoints[index].y + 7,
      );
    }

    surfaceGlow.strokePath();

    const surface = this.add.graphics();
    surface.setDepth(12);
    surface.lineStyle(
      8,
      0x62eaff,
      0.38,
    );

    surface.beginPath();
    surface.moveTo(
      sampledPoints[0].x,
      sampledPoints[0].y,
    );

    for (let index = 1; index < sampledPoints.length; index += 1) {
      surface.lineTo(
        sampledPoints[index].x,
        sampledPoints[index].y,
      );
    }

    surface.strokePath();

    /*
     * Collision surface. Short overlapping rectangles closely follow
     * the sampled curve, avoiding sharp corners that trap the rover.
     */
    const terrainThickness = 220;
    const collisionOverlap = 14;

    for (let index = 0; index < sampledPoints.length - 1; index += 1) {
      const current = sampledPoints[index];
      const next = sampledPoints[index + 1];

      const deltaX = next.x - current.x;
      const deltaY = next.y - current.y;
      const length = Math.hypot(
        deltaX,
        deltaY,
      );

      if (length <= 0.01) {
        continue;
      }

      const angle = Math.atan2(
        deltaY,
        deltaX,
      );

      /*
       * This is the segment's downward-facing normal in screen space.
       * Moving the body's centre down by half its thickness puts the
       * collision body's top edge directly on the visible curve.
       */
      const normalX =
        -deltaY / length;

      const normalY =
        deltaX / length;

      const midpointX =
        (current.x + next.x) / 2;

      const midpointY =
        (current.y + next.y) / 2;

      const bodyX =
        midpointX +
        normalX *
          (terrainThickness / 2);

      const bodyY =
        midpointY +
        normalY *
          (terrainThickness / 2);

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

    for (
      let span = 0;
      span < controlPoints.length - 1;
      span += 1
    ) {
      const point0 =
        controlPoints[
          Math.max(
            0,
            span - 1,
          )
        ];

      const point1 =
        controlPoints[span];

      const point2 =
        controlPoints[span + 1];

      const point3 =
        controlPoints[
          Math.min(
            controlPoints.length - 1,
            span + 2,
          )
        ];

      for (
        let step = 0;
        step < samplesPerSpan;
        step += 1
      ) {
        const time =
          step / samplesPerSpan;

        const timeSquared =
          time * time;

        const timeCubed =
          timeSquared * time;

        samples.push({
          x:
            0.5 *
            (
              2 * point1.x +
              (-point0.x + point2.x) *
                time +
              (
                2 * point0.x -
                5 * point1.x +
                4 * point2.x -
                point3.x
              ) *
                timeSquared +
              (
                -point0.x +
                3 * point1.x -
                3 * point2.x +
                point3.x
              ) *
                timeCubed
            ),

          y:
            0.5 *
            (
              2 * point1.y +
              (-point0.y + point2.y) *
                time +
              (
                2 * point0.y -
                5 * point1.y +
                4 * point2.y -
                point3.y
              ) *
                timeSquared +
              (
                -point0.y +
                3 * point1.y -
                3 * point2.y +
                point3.y
              ) *
                timeCubed
            ),
        });
      }
    }

    const lastPoint =
      controlPoints[
        controlPoints.length - 1
      ];

    samples.push({
      x: lastPoint.x,
      y: lastPoint.y,
    });

    return samples;
  }

  private createStartingPlatform() {
    this.add.ellipse(
      ROVER_START_X,
      631,
      360,
      54,
      0x3ce7ff,
      0.07,
    );

    this.add.ellipse(
      ROVER_START_X,
      627,
      280,
      28,
      0x80efff,
      0.1,
    );

    const outline =
      this.add.ellipse(
        ROVER_START_X,
        625,
        320,
        38,
        0x000000,
        0,
      );

    outline.setStrokeStyle(
      2,
      0x5eeaff,
      0.3,
    );
  }

  private createGapWarning(
    x: number,
    y: number,
  ) {
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
      .text(
        x,
        y + 28,
        "BOOST OR JUMP",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#c79568",
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5);
  }

  private createStartGate() {
    const startX = 140;
    const groundY = 645;

    this.add.rectangle(
      startX,
      groundY - 105,
      18,
      210,
      0x263354,
      1,
    );

    this.add.rectangle(
      startX + 150,
      groundY - 105,
      18,
      210,
      0x263354,
      1,
    );

    this.add.rectangle(
      startX + 75,
      groundY - 205,
      168,
      20,
      0x304267,
      1,
    );

    this.add.rectangle(
      startX + 75,
      groundY - 203,
      125,
      5,
      0x69f0ff,
      0.8,
    );

    this.add
      .text(
        startX + 75,
        groundY - 240,
        "START",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#bff8ff",
          letterSpacing: 4,
        },
      )
      .setOrigin(0.5);
  }

  private createFinishGate() {
    const groundY = 610;

    this.add.rectangle(
      FINISH_X - 110,
      groundY - 120,
      24,
      240,
      0x263354,
      1,
    );

    this.add.rectangle(
      FINISH_X + 110,
      groundY - 120,
      24,
      240,
      0x263354,
      1,
    );

    this.add.rectangle(
      FINISH_X,
      groundY - 230,
      244,
      24,
      0x304267,
      1,
    );

    const finishGlow =
      this.add.rectangle(
        FINISH_X,
        groundY - 227,
        190,
        6,
        0x7dfcff,
        0.9,
      );

    finishGlow.setBlendMode(
      Phaser.BlendModes.ADD,
    );

    this.add
      .text(
        FINISH_X,
        groundY - 270,
        "FINISH",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "22px",
          fontStyle: "bold",
          color: "#d7fcff",
          letterSpacing: 5,
        },
      )
      .setOrigin(0.5);
  }

  private createCollectibles() {
    const positions = [
      { x: 900, y: 500 },
      { x: 1370, y: 470 },
      { x: 2050, y: 535 },
      { x: 2740, y: 530 },
      { x: 3500, y: 415 },
      { x: 4200, y: 520 },
      { x: 4950, y: 500 },
      { x: 5670, y: 450 },
    ];

    positions.forEach(
      (position, index) => {
        const glow =
          this.add.circle(
            position.x,
            position.y,
            35,
            0x65f7ff,
            0.12,
          );

        glow.setBlendMode(
          Phaser.BlendModes.ADD,
        );

        const orb =
          this.add.circle(
            position.x,
            position.y,
            14,
            0x8dfcff,
            1,
          );

        orb.setStrokeStyle(
          3,
          0xd8ffff,
          0.9,
        );

        const ring =
          this.add.circle(
            position.x,
            position.y,
            23,
            0x000000,
            0,
          );

        ring.setStrokeStyle(
          2,
          0x71ecff,
          0.55,
        );

        this.collectibles.push({
          id: index + 1,
          x: position.x,
          y: position.y,
          collected: false,
          glow,
          orb,
          ring,
        });
      },
    );
  }

  private createCheckpoints() {
    const checkpointData = [
      {
        x: 1950,
        y: 565,
        respawnX: 1900,
        respawnY: 500,
      },
      {
        x: 3710,
        y: 455,
        respawnX: 3650,
        respawnY: 410,
      },
      {
        x: 5250,
        y: 510,
        respawnX: 5180,
        respawnY: 440,
      },
    ];

    checkpointData.forEach(
      (checkpoint, index) => {
        this.add.rectangle(
          checkpoint.x,
          checkpoint.y,
          12,
          135,
          0x3a4d72,
          1,
        );

        const glow =
          this.add.circle(
            checkpoint.x,
            checkpoint.y - 80,
            30,
            0x68eaff,
            0.1,
          );

        glow.setBlendMode(
          Phaser.BlendModes.ADD,
        );

        const light =
          this.add.circle(
            checkpoint.x,
            checkpoint.y - 80,
            11,
            0x6defff,
            1,
          );

        const label = this.add
          .text(
            checkpoint.x,
            checkpoint.y - 122,
            `CHECKPOINT ${index + 1}`,
            {
              fontFamily: "Arial, sans-serif",
              fontSize: "12px",
              fontStyle: "bold",
              color: "#9af6ff",
              letterSpacing: 2,
            },
          )
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
      },
    );
  }

  private createRover() {
    /*
     * The Matter image provides the collision and movement body, but
     * its artwork is hidden. A separate normal image is used for the
     * detailed body PNG so it can be shifted upward independently.
     */
    const roverBody =
      this.matter.add.image(
        ROVER_START_X,
        ROVER_START_Y,
        "rover-body",
      );

    roverBody.setDisplaySize(
      ROVER_BODY_WIDTH,
      ROVER_BODY_HEIGHT,
    );

    roverBody.setRectangle(
      ROVER_COLLISION_WIDTH,
      ROVER_COLLISION_HEIGHT,
      {
        label: "rover-chassis",
      },
    );

    roverBody.setMass(12);
    roverBody.setFriction(0.88);
    roverBody.setFrictionStatic(1);
    roverBody.setFrictionAir(0.035);
    roverBody.setBounce(0.01);
    roverBody.setAlpha(0);
    roverBody.setDepth(18);

    this.roverBody = roverBody;

    this.roverBodyVisual =
      this.add.image(
        ROVER_START_X,
        ROVER_START_Y +
          ROVER_BODY_VISUAL_OFFSET_Y,
        "rover-body",
      );

    this.roverBodyVisual.setDisplaySize(
      ROVER_BODY_WIDTH,
      ROVER_BODY_HEIGHT,
    );

    /*
     * The source body PNG faces left. Flip only the visible artwork.
     */
    this.roverBodyVisual.setFlipX(true);
    this.roverBodyVisual.setDepth(20);

    this.leftWheelVisual =
      this.add.image(
        ROVER_START_X +
          LEFT_WHEEL_OFFSET_X,
        ROVER_START_Y +
          WHEEL_OFFSET_Y,
        "rover-wheel",
      );

    this.leftWheelVisual.setDisplaySize(
      WHEEL_SIZE,
      WHEEL_SIZE,
    );

    /*
     * Wheels are placed in front of the body artwork so the lower
     * armour cannot hide most of each wheel.
     */
    this.leftWheelVisual.setDepth(21);

    this.rightWheelVisual =
      this.add.image(
        ROVER_START_X +
          RIGHT_WHEEL_OFFSET_X,
        ROVER_START_Y +
          WHEEL_OFFSET_Y,
        "rover-wheel",
      );

    this.rightWheelVisual.setDisplaySize(
      WHEEL_SIZE,
      WHEEL_SIZE,
    );

    this.rightWheelVisual.setDepth(21);

    this.updateRoverVisuals(0);
  }

  private createControls() {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors =
      this.input.keyboard.createCursorKeys();

    this.keyA =
      this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.A,
      );

    this.keyD =
      this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.D,
      );

    this.keyW =
      this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.W,
      );

    this.keyR =
      this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.R,
      );

    this.boostKey =
      this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      );
  }

  private createInterface() {
    const statusPanel =
      this.createHudPanel(
        42,
        42,
        390,
        215,
      );

    statusPanel.setOrigin(0, 0);

    this.add
      .text(
        70,
        62,
        "ROVER STATUS",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#72eaff",
          letterSpacing: 3,
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.speedText = this.add
      .text(
        70,
        92,
        "SPEED  000",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          fontStyle: "bold",
          color: "#ffffff",
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.distanceText = this.add
      .text(
        70,
        122,
        "DISTANCE  0 M",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#a9b6d1",
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.scoreText = this.add
      .text(
        70,
        149,
        "SCORE  0",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#ffffff",
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.collectibleText =
      this.add
        .text(
          70,
          178,
          `ENERGY ORBS  0 / ${TOTAL_COLLECTIBLES}`,
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            color: "#89edf8",
          },
        )
        .setScrollFactor(0)
        .setDepth(101);

    this.checkpointText =
      this.add
        .text(
          70,
          201,
          `CHECKPOINTS  0 / ${TOTAL_CHECKPOINTS}`,
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            color: "#89edf8",
          },
        )
        .setScrollFactor(0)
        .setDepth(101);

    this.objectiveText =
      this.add
        .text(
          70,
          227,
          "OBJECTIVE  REACH THE FINISH GATE",
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

    const timerPanel =
      this.createHudPanel(
        GAME_WIDTH / 2 - 115,
        42,
        230,
        92,
      );

    timerPanel.setOrigin(0, 0);

    this.add
      .text(
        GAME_WIDTH / 2,
        62,
        "COURSE TIME",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#91a4c9",
          letterSpacing: 3,
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    this.timerText = this.add
      .text(
        GAME_WIDTH / 2,
        91,
        "00:00.0",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "29px",
          fontStyle: "bold",
          color: "#ffffff",
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    const boostPanel =
      this.createHudPanel(
        GAME_WIDTH - 390,
        42,
        348,
        102,
      );

    boostPanel.setOrigin(0, 0);

    this.boostText = this.add
      .text(
        GAME_WIDTH - 362,
        64,
        "BOOST ENERGY  100%",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#9af6ff",
          letterSpacing: 2,
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    const boostBarBackground =
      this.add.rectangle(
        GAME_WIDTH - 362,
        106,
        290,
        14,
        0x26314d,
        1,
      );

    boostBarBackground.setOrigin(
      0,
      0.5,
    );

    boostBarBackground.setScrollFactor(
      0,
    );

    boostBarBackground.setDepth(101);

    this.boostBarFill =
      this.add.rectangle(
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

    const controlsPanel =
      this.createHudPanel(
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
        "A / D OR ← / →  DRIVE     W OR ↑  JUMP     SPACE  BOOST     R  RESTART",
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

  private createHudPanel(
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const panel =
      this.add.rectangle(
        x,
        y,
        width,
        height,
        0x050816,
        0.76,
      );

    panel.setStrokeStyle(
      1,
      0xffffff,
      0.1,
    );

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

    window.dispatchEvent(
      new Event("rover-restart-requested"),
    );
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
      "JUMP",
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
    const background =
      this.add.circle(
        x,
        y,
        size / 2,
        0x071020,
        0.72,
      );

    background.setStrokeStyle(
      2,
      0x78efff,
      0.4,
    );

    background.setScrollFactor(0);
    background.setDepth(150);

    background.setInteractive({
      useHandCursor: true,
    });

    const buttonLabel =
      this.add
        .text(
          x,
          y,
          label,
          {
            fontFamily: "Arial, sans-serif",
            fontSize:
              label === "BOOST" ||
              label === "JUMP"
                ? "12px"
                : "28px",
            fontStyle: "bold",
            color: "#d8fbff",
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(151);

    const press = () => {
      background.setFillStyle(
        0x17465a,
        0.92,
      );

      background.setScale(0.94);
      buttonLabel.setScale(0.94);
      onPress();
    };

    const release = () => {
      background.setFillStyle(
        0x071020,
        0.72,
      );

      background.setScale(1);
      buttonLabel.setScale(1);
      onRelease();
    };

    background.on(
      "pointerdown",
      press,
    );

    background.on(
      "pointerup",
      release,
    );

    background.on(
      "pointerout",
      release,
    );

    background.on(
      "pointerupoutside",
      release,
    );

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
      WORLD_WIDTH,
      WORLD_HEIGHT,
    );

    this.cameras.main.startFollow(
      this.roverBody,
      true,
      0.075,
      0.075,
      -280,
      80,
    );

    this.cameras.main.setDeadzone(
      260,
      170,
    );
  }

  private handleMovement(
    delta: number,
  ) {
    const {
      roverBody,
      cursors,
      keyA,
      keyD,
      keyW,
      keyR,
      boostKey,
    } = this;

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

    const body =
      roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(
        keyR,
      )
    ) {
      this.requestRestart();
      return;
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(
        keyW,
      ) ||
      Phaser.Input.Keyboard.JustDown(
        cursors.up,
      );

    if (jumpPressed) {
      this.tryJump();
    }

    if (this.hasFinished) {
      roverBody.setVelocityX(
        body.velocity.x * 0.95,
      );

      return;
    }

    const movingLeft =
      cursors.left.isDown ||
      keyA.isDown ||
      this.touchLeft;

    const movingRight =
      cursors.right.isDown ||
      keyD.isDown ||
      this.touchRight;

    const direction =
      movingRight && !movingLeft
        ? 1
        : movingLeft && !movingRight
          ? -1
          : 0;

    const usingBoost =
      (boostKey.isDown ||
        this.touchBoost) &&
      this.boostEnergy > 0 &&
      direction !== 0;

    if (
      (direction !== 0 ||
        jumpPressed) &&
      !this.hasStarted
    ) {
      this.hasStarted = true;
    }

    const maximumSpeed =
      usingBoost
        ? this.boostedMaximumSpeed
        : this.normalMaximumSpeed;

    const grounded =
      this.activeTerrainContacts.size >
      0;

    const terrainAngle =
      grounded
        ? this.getTerrainAngleAtX(
            roverBody.x,
          ) ?? roverBody.rotation
        : 0;

    /*
     * Move along the local terrain tangent. This prevents the chassis
     * from pushing horizontally into a rising hill and makes climbing
     * and descending feel much smoother.
     */
    const targetVelocityX =
      direction *
      maximumSpeed *
      Math.cos(terrainAngle);

    const targetVelocityY =
      direction *
      maximumSpeed *
      Math.sin(terrainAngle);

    const responseRate =
      direction === 0
        ? this.brakingRate
        : this.accelerationRate;

    const horizontalSmoothing =
      1 -
      Math.exp(
        -responseRate *
          (delta / 1000),
      );

    const nextVelocityX =
      Phaser.Math.Linear(
        body.velocity.x,
        targetVelocityX,
        horizontalSmoothing,
      );

    roverBody.setVelocityX(
      nextVelocityX,
    );

    if (
      grounded &&
      direction !== 0
    ) {
      const verticalSmoothing =
        1 -
        Math.exp(
          -this.slopeVelocityRate *
            (delta / 1000),
        );

      roverBody.setVelocityY(
        Phaser.Math.Linear(
          body.velocity.y,
          targetVelocityY,
          verticalSmoothing,
        ),
      );
    }

    /*
     * Only provide gentle air tilt after the rover has
     * genuinely left the terrain.
     */
    if (
      this.isProbablyAirborne() &&
      direction !== 0
    ) {
      const targetAngularVelocity =
        direction * 0.018;

      const nextAngularVelocity =
        Phaser.Math.Linear(
          body.angularVelocity,
          targetAngularVelocity,
          0.06,
        );

      roverBody.setAngularVelocity(
        Phaser.Math.Clamp(
          nextAngularVelocity,
          -0.026,
          0.026,
        ),
      );
    }

    const seconds = delta / 1000;

    if (usingBoost) {
      this.boostEnergy -=
        22 * seconds;
    } else {
      this.boostEnergy +=
        15 * seconds;
    }

    this.boostEnergy =
      Phaser.Math.Clamp(
        this.boostEnergy,
        0,
        this.maximumBoostEnergy,
      );
  }

  private tryJump() {
    if (!this.roverBody) {
      return;
    }

    const body =
      this.roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    const now = this.time.now;

    const jumpReady =
      now - this.lastJumpAt >=
      this.jumpCooldownMs;

    const grounded =
      this.activeTerrainContacts.size > 0;

    if (
      !jumpReady ||
      !grounded ||
      this.hasFinished
    ) {
      return;
    }

    this.lastJumpAt = now;
    this.hasStarted = true;

    this.roverBody.setVelocityY(
      this.jumpVelocity,
    );

    this.showStatusMessage(
      "JUMP",
      "#9af6ff",
    );
  }

  private updateGroundState(
    delta: number,
  ) {
    if (
      this.activeTerrainContacts.size ===
      0
    ) {
      this.airborneTime += delta;
    } else {
      this.airborneTime = 0;
    }
  }

  private isProbablyAirborne() {
    return (
      this.activeTerrainContacts.size ===
        0 &&
      this.airborneTime >=
        this.airborneTiltDelayMs
    );
  }

  private stabilizeRover(
    delta: number,
  ) {
    if (!this.roverBody) {
      return;
    }

    const body =
      this.roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    const grounded =
      this.activeTerrainContacts.size >
      0;

    const currentRotation =
      Phaser.Math.Angle.Wrap(
        this.roverBody.rotation,
      );

    if (grounded) {
      const terrainAngle =
        this.getTerrainAngleAtX(
          this.roverBody.x,
        ) ?? currentRotation;

      const angleError =
        Phaser.Math.Angle.Wrap(
          terrainAngle -
            currentRotation,
        );

      const alignmentSmoothing =
        1 -
        Math.exp(
          -this.groundAlignmentRate *
            (delta / 1000),
        );

      /*
       * Rotate the complete collision chassis toward the local slope.
       * The visible body and both wheels use this same rotation.
       */
      this.roverBody.setRotation(
        currentRotation +
          angleError *
            alignmentSmoothing,
      );

      this.roverBody.setAngularVelocity(
        Phaser.Math.Linear(
          body.angularVelocity,
          0,
          alignmentSmoothing,
        ),
      );

      return;
    }

    /*
     * While airborne, retain gentle air tilt but prevent unrealistic
     * full rotations.
     */
    const maximumAirRotation =
      Phaser.Math.DegToRad(52);

    if (
      Math.abs(currentRotation) >
      maximumAirRotation
    ) {
      this.roverBody.setRotation(
        Phaser.Math.Clamp(
          currentRotation,
          -maximumAirRotation,
          maximumAirRotation,
        ),
      );

      this.roverBody.setAngularVelocity(
        body.angularVelocity * 0.18,
      );
    }
  }

  private getTerrainAngleAtX(
    x: number,
  ) {
    for (
      const section of
      this.terrainSections
    ) {
      if (section.length < 2) {
        continue;
      }

      const first =
        section[0];

      const last =
        section[
          section.length - 1
        ];

      if (
        x < first.x ||
        x > last.x
      ) {
        continue;
      }

      let low = 0;
      let high =
        section.length - 2;

      while (low <= high) {
        const middle =
          Math.floor(
            (low + high) / 2,
          );

        const current =
          section[middle];

        const next =
          section[middle + 1];

        if (
          x >= current.x &&
          x <= next.x
        ) {
          return Math.atan2(
            next.y - current.y,
            next.x - current.x,
          );
        }

        if (x < current.x) {
          high = middle - 1;
        } else {
          low = middle + 1;
        }
      }
    }

    return null;
  }

  private updateRoverVisuals(
    delta: number,
  ) {
    if (
      !this.roverBody ||
      !this.roverBodyVisual ||
      !this.leftWheelVisual ||
      !this.rightWheelVisual
    ) {
      return;
    }

    const body =
      this.roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    const rotation =
      this.roverBody.rotation;

    const bodyOffset =
      this.rotateOffset(
        0,
        ROVER_BODY_VISUAL_OFFSET_Y,
        rotation,
      );

    this.roverBodyVisual.setPosition(
      this.roverBody.x +
        bodyOffset.x,
      this.roverBody.y +
        bodyOffset.y,
    );

    this.roverBodyVisual.setRotation(
      rotation,
    );

    const leftOffset =
      this.rotateOffset(
        LEFT_WHEEL_OFFSET_X,
        WHEEL_OFFSET_Y,
        rotation,
      );

    const rightOffset =
      this.rotateOffset(
        RIGHT_WHEEL_OFFSET_X,
        WHEEL_OFFSET_Y,
        rotation,
      );

    this.leftWheelVisual.setPosition(
      this.roverBody.x +
        leftOffset.x,
      this.roverBody.y +
        leftOffset.y,
    );

    this.rightWheelVisual.setPosition(
      this.roverBody.x +
        rightOffset.x,
      this.roverBody.y +
        rightOffset.y,
    );

    this.wheelSpin +=
      body.velocity.x *
      0.012 *
      (delta / 16.667);

    /*
     * The wheel artwork spins around the same base slope angle as the
     * body, so all rover components visually follow hills together.
     */
    this.leftWheelVisual.setRotation(
      rotation + this.wheelSpin,
    );

    this.rightWheelVisual.setRotation(
      rotation + this.wheelSpin,
    );
  }

  private rotateOffset(
    offsetX: number,
    offsetY: number,
    rotation: number,
  ) {
    return {
      x:
        offsetX *
          Math.cos(rotation) -
        offsetY *
          Math.sin(rotation),

      y:
        offsetX *
          Math.sin(rotation) +
        offsetY *
          Math.cos(rotation),
    };
  }

  private registerCollisionHandlers() {
    const collisionStart = (
      event: Phaser.Physics.Matter.Events.CollisionStartEvent,
    ) => {
      event.pairs.forEach(
        (pair) => {
          if (
            !this.isRoverTerrainPair(
              pair,
            )
          ) {
            return;
          }

          const wasAirborne =
            this.activeTerrainContacts
              .size === 0;

          this.activeTerrainContacts.add(
            pair.id,
          );

          if (wasAirborne) {
            this.handleLanding();
          }
        },
      );
    };

    const collisionEnd = (
      event: Phaser.Physics.Matter.Events.CollisionEndEvent,
    ) => {
      event.pairs.forEach(
        (pair) => {
          if (
            !this.isRoverTerrainPair(
              pair,
            )
          ) {
            return;
          }

          this.activeTerrainContacts.delete(
            pair.id,
          );
        },
      );
    };

    this.matter.world.on(
      "collisionstart",
      collisionStart,
    );

    this.matter.world.on(
      "collisionend",
      collisionEnd,
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        this.matter.world.off(
          "collisionstart",
          collisionStart,
        );

        this.matter.world.off(
          "collisionend",
          collisionEnd,
        );
      },
    );
  }

  private isRoverTerrainPair(
    pair: Phaser.Types.Physics.Matter.MatterCollisionPair,
  ) {
    const labels = [
      pair.bodyA.label,
      pair.bodyB.label,
    ];

    return (
      labels.includes(
        "rover-chassis",
      ) &&
      labels.includes("terrain")
    );
  }

  private updateAirborneVelocity() {
    if (
      !this.isProbablyAirborne() ||
      !this.roverBody
    ) {
      return;
    }

    const body =
      this.roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    this.maximumAirborneDownwardVelocity =
      Math.max(
        this
          .maximumAirborneDownwardVelocity,
        body.velocity.y,
      );
  }

  private handleLanding() {
    const landingVelocity =
      this
        .maximumAirborneDownwardVelocity;

    this.maximumAirborneDownwardVelocity =
      0;

    if (landingVelocity >= 13.5) {
      this.crashPenalty += 250;

      this.showStatusMessage(
        "CRASH LANDING  -250",
        "#ff9f9f",
      );

      this.time.delayedCall(
        180,
        () => {
          this.respawnVehicle();
        },
      );

      return;
    }

    if (landingVelocity >= 8.5) {
      this.crashPenalty += 100;

      this.showStatusMessage(
        "HARD LANDING  -100",
        "#ffc582",
      );
    }
  }

  private showStatusMessage(
    message: string,
    colour: string,
  ) {
    const text = this.add
      .text(
        GAME_WIDTH / 2,
        175,
        message,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "22px",
          fontStyle: "bold",
          color: colour,
          letterSpacing: 3,
        },
      )
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

  private updateTimer(
    delta: number,
  ) {
    if (
      !this.hasStarted ||
      this.hasFinished
    ) {
      return;
    }

    this.elapsedSeconds +=
      delta / 1000;
  }

  private updateCollectibles(
    delta: number,
  ) {
    if (!this.roverBody) {
      return;
    }

    const rover = this.roverBody;

    this.collectibles.forEach(
      (collectible) => {
        if (collectible.collected) {
          return;
        }

        collectible.ring.rotation +=
          0.025 *
          (delta / 16.667);

        collectible.orb.y =
          collectible.y +
          Math.sin(
            this.time.now / 350 +
              collectible.id,
          ) *
            7;

        collectible.ring.y =
          collectible.orb.y;

        collectible.glow.y =
          collectible.orb.y;

        const distance =
          Phaser.Math.Distance.Between(
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
            targets: [
              collectible.orb,
              collectible.ring,
              collectible.glow,
            ],
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
      },
    );
  }

  private updateCheckpoints() {
    if (!this.roverBody) {
      return;
    }

    const rover = this.roverBody;

    this.checkpoints.forEach(
      (checkpoint) => {
        if (checkpoint.reached) {
          return;
        }

        const horizontalDistance =
          Math.abs(
            rover.x - checkpoint.x,
          );

        const verticalDistance =
          Math.abs(
            rover.y - checkpoint.y,
          );

        if (
          horizontalDistance <= 120 &&
          verticalDistance <= 190
        ) {
          checkpoint.reached = true;

          this.reachedCheckpointCount +=
            1;

          this.checkpointScore += 250;

          this.latestCheckpointX =
            checkpoint.respawnX;

          this.latestCheckpointY =
            checkpoint.respawnY;

          checkpoint.light.setFillStyle(
            0x8dffbf,
            1,
          );

          checkpoint.glow.setFillStyle(
            0x65ffac,
            0.15,
          );

          checkpoint.label
            .setText(
              `CHECKPOINT ${checkpoint.id} ACTIVE`,
            )
            .setColor("#8dffbf");

          this.tweens.add({
            targets:
              checkpoint.glow,
            scale: 1.8,
            alpha: 0.25,
            duration: 280,
            yoyo: true,
          });
        }
      },
    );
  }

  private updateScore() {
    if (!this.roverBody) {
      return;
    }

    this.distanceScore =
      Math.max(
        this.distanceScore,
        Math.floor(
          Math.max(
            0,
            this.roverBody.x -
              ROVER_START_X,
          ) / 4,
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

    const body =
      this.roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    const speed = Math.round(
      Math.abs(body.velocity.x) *
        45,
    );

    const distance = Math.max(
      0,
      Math.round(
        (this.roverBody.x -
          ROVER_START_X) /
          4,
      ),
    );

    const boostPercentage =
      Math.round(
        (this.boostEnergy /
          this.maximumBoostEnergy) *
          100,
      );

    this.speedText.setText(
      `SPEED  ${speed
        .toString()
        .padStart(3, "0")}`,
    );

    this.distanceText.setText(
      `DISTANCE  ${distance.toLocaleString()} M`,
    );

    this.scoreText.setText(
      `SCORE  ${this.score.toLocaleString()}`,
    );

    this.collectibleText.setText(
      `ENERGY ORBS  ${this.collectedCount} / ${this.collectibles.length}`,
    );

    this.checkpointText.setText(
      `CHECKPOINTS  ${this.reachedCheckpointCount} / ${this.checkpoints.length}`,
    );

    this.timerText.setText(
      this.formatTime(
        this.elapsedSeconds,
      ),
    );

    this.boostText.setText(
      `BOOST ENERGY  ${boostPercentage}%`,
    );

    this.boostBarFill.width =
      290 *
      (this.boostEnergy /
        this.maximumBoostEnergy);

    if (this.boostEnergy <= 20) {
      this.boostBarFill.setFillStyle(
        0xffbd72,
        1,
      );
    } else {
      this.boostBarFill.setFillStyle(
        0x62edff,
        1,
      );
    }
  }

  private formatTime(
    seconds: number,
  ) {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${minutes
      .toString()
      .padStart(
        2,
        "0",
      )}:${remainingSeconds
      .toFixed(1)
      .padStart(4, "0")}`;
  }

  private checkFinish() {
    if (
      !this.roverBody ||
      !this.objectiveText ||
      this.hasFinished
    ) {
      return;
    }

    if (this.roverBody.x < FINISH_X) {
      return;
    }

    const body =
      this.roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    this.hasFinished = true;
    this.completionScore = 2000;

    this.timeBonus = Math.max(
      0,
      Math.round(
        (COURSE_TIME_LIMIT_SECONDS -
          this.elapsedSeconds) *
          15,
      ),
    );

    this.updateScore();

    this.objectiveText
      .setText(
        "OBJECTIVE  COURSE COMPLETE",
      )
      .setColor("#8dffbf");

    this.roverBody.setVelocityX(
      Math.min(
        body.velocity.x,
        2.2,
      ),
    );

    this.showFinishResults();
    this.emitCourseCompleted();
  }

  private emitCourseCompleted() {
    window.dispatchEvent(
      new CustomEvent(
        "rover-course-complete",
        {
          detail: {
            courseId: COURSE_ID,
            score: this.score,
            completionTimeMs: Math.max(
              1,
              Math.round(
                this.elapsedSeconds * 1000,
              ),
            ),
            orbsCollected: this.collectedCount,
            checkpointsReached:
              this.reachedCheckpointCount,
            crashPenalty: this.crashPenalty,
          },
        },
      ),
    );
  }

  private showFinishResults() {
    const overlay =
      this.add.rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        840,
        550,
        0x050816,
        0.95,
      );

    overlay.setStrokeStyle(
      2,
      0x7fffe5,
      0.35,
    );

    overlay.setScrollFactor(0);
    overlay.setDepth(200);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 210,
        "COURSE COMPLETE",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "42px",
          fontStyle: "bold",
          color: "#baffdf",
          letterSpacing: 4,
        },
      )
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
      `Course time: ${this.formatTime(
        this.elapsedSeconds,
      )}`,
      `Distance points: ${this.distanceScore.toLocaleString()}`,
      `Energy orbs: ${this.collectedCount} / ${this.collectibles.length}  (+${this.collectibleScore.toLocaleString()})`,
      `Checkpoints: ${this.reachedCheckpointCount} / ${this.checkpoints.length}  (+${this.checkpointScore.toLocaleString()})`,
      `Completion bonus: +${this.completionScore.toLocaleString()}`,
      `Time bonus: +${this.timeBonus.toLocaleString()}`,
      `Crash penalties: -${this.crashPenalty.toLocaleString()}`,
    ];

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 25,
        results.join("\n"),
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          color: "#c7d4e8",
          align: "center",
          lineSpacing: 11,
        },
      )
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

    if (this.roverBody.y > 1030) {
      this.crashPenalty += 150;

      this.showStatusMessage(
        "COURSE FALL  -150",
        "#ffb0b0",
      );

      this.respawnVehicle();
    }
  }

  private checkOverturned(
    delta: number,
  ) {
    if (
      !this.roverBody ||
      this.hasFinished
    ) {
      return;
    }

    const body =
      this.roverBody.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    const rotation =
      Math.abs(
        Phaser.Math.Angle.Wrap(
          this.roverBody.rotation,
        ),
      );

    const badlyOverturned =
      rotation >
      Phaser.Math.DegToRad(48);

    const movingSlowly =
      Math.abs(body.velocity.x) <
        0.8 &&
      Math.abs(body.velocity.y) <
        0.8;

    const grounded =
      this.activeTerrainContacts.size >
      0;

    if (
      badlyOverturned &&
      movingSlowly &&
      grounded
    ) {
      this.overturnedTime += delta;
    } else {
      this.overturnedTime = 0;
    }

    if (
      this.overturnedTime >= 1500
    ) {
      this.crashPenalty += 200;

      this.showStatusMessage(
        "ROVER OVERTURNED  -200",
        "#ffb0b0",
      );

      this.respawnVehicle();
    }
  }

  private respawnVehicle() {
    if (!this.roverBody) {
      return;
    }

    this.cameras.main.flash(
      180,
      90,
      120,
      160,
    );

    this.activeTerrainContacts.clear();
    this.maximumAirborneDownwardVelocity =
      0;
    this.airborneTime = 0;
    this.overturnedTime = 0;

    this.roverBody.setPosition(
      this.latestCheckpointX,
      this.latestCheckpointY,
    );

    this.roverBody.setVelocity(0, 0);
    this.roverBody.setAngularVelocity(0);
    this.roverBody.setRotation(0);

    this.boostEnergy = Math.max(
      this.boostEnergy,
      40,
    );

    this.updateRoverVisuals(0);
  }
}

export default function PhaserGame() {
  const gameContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const gameRef =
    useRef<Phaser.Game | null>(
      null,
    );

  const [gameVersion, setGameVersion] =
    useState(0);

  useEffect(() => {
    const handleRestartRequest = () => {
      setGameVersion(
        (current) => current + 1,
      );
    };

    window.addEventListener(
      "rover-restart-requested",
      handleRestartRequest,
    );

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

    const config: Phaser.Types.Core.GameConfig =
      {
        type: Phaser.AUTO,

        width: GAME_WIDTH,
        height: GAME_HEIGHT,

        parent:
          gameContainerRef.current,

        backgroundColor:
          "#070a18",

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

          autoCenter:
            Phaser.Scale.CENTER_BOTH,

          width: GAME_WIDTH,
          height: GAME_HEIGHT,
        },

        render: {
          antialias: true,
          pixelArt: false,
          roundPixels: false,
        },

        scene: [
          RoverMatterScene,
        ],
      };

    gameRef.current =
      new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameVersion]);

  return (
    <div
      ref={gameContainerRef}
      className="aspect-video min-h-[280px] w-full overflow-hidden bg-[#070a18]"
      aria-label="Rover Challenge game"
    />
  );
}
