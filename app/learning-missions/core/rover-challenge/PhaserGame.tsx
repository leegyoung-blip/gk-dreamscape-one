"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 900;

const WORLD_WIDTH = 6500;
const WORLD_HEIGHT = 1200;

const ROVER_START_X = 360;
const ROVER_START_Y = 500;

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
  post: Phaser.GameObjects.Rectangle;
  light: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type TouchButton = {
  background: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

class RoverMatterScene extends Phaser.Scene {
  private roverChassis?: Phaser.Physics.Matter.Image;
  private roverLeftWheel?: Phaser.Physics.Matter.Image;
  private roverRightWheel?: Phaser.Physics.Matter.Image;

  private leftSuspension?: MatterJS.ConstraintType;
  private rightSuspension?: MatterJS.ConstraintType;
  private axleConstraint?: MatterJS.ConstraintType;

  private roverCabin?: Phaser.GameObjects.Graphics;
  private roverAntenna?: Phaser.GameObjects.Rectangle;
  private roverAntennaLight?: Phaser.GameObjects.Arc;
  private roverHeadlight?: Phaser.GameObjects.Arc;
  private roverHeadlightGlow?: Phaser.GameObjects.Arc;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
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

  private overturnedTime = 0;
  private activeWheelTerrainPairs = new Set<string>();
  private maximumAirborneDownwardVelocity = 0;

  private readonly normalWheelSpeed = 0.34;
  private readonly boostedWheelSpeed = 0.52;
  private readonly maximumHorizontalSpeed = 14;
  private readonly boostedMaximumHorizontalSpeed = 19;

  constructor() {
    super({
      key: "RoverMatterScene",
    });
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

    this.createVehicleTextures();
    this.createBackground();
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
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.R,
    ]);

    this.cameras.main.fadeIn(450, 5, 7, 19);
  }

  update(_time: number, delta: number) {
    if (!this.roverChassis) {
      return;
    }

    this.handleMovement(delta);
    this.updateRoverVisualParts();
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

    this.overturnedTime = 0;
    this.activeWheelTerrainPairs.clear();
    this.maximumAirborneDownwardVelocity = 0;
  }

  private createVehicleTextures() {
    if (!this.textures.exists("rover-chassis")) {
      const graphics = this.make.graphics({
        x: 0,
        y: 0,
      });

      graphics.fillStyle(0x818cf8, 1);
      graphics.fillRoundedRect(4, 8, 182, 68, 18);

      graphics.lineStyle(4, 0xc7f7ff, 0.9);
      graphics.strokeRoundedRect(4, 8, 182, 68, 18);

      graphics.fillStyle(0x5d66cf, 1);
      graphics.fillRoundedRect(20, 54, 150, 18, 7);

      graphics.generateTexture(
        "rover-chassis",
        190,
        84,
      );

      graphics.destroy();
    }

    if (!this.textures.exists("rover-wheel")) {
      const graphics = this.make.graphics({
        x: 0,
        y: 0,
      });

      graphics.fillStyle(0x070a14, 1);
      graphics.fillCircle(34, 34, 31);

      graphics.lineStyle(7, 0x53627e, 1);
      graphics.strokeCircle(34, 34, 27);

      graphics.lineStyle(4, 0x98aac9, 0.85);
      graphics.lineBetween(14, 34, 54, 34);
      graphics.lineBetween(34, 14, 34, 54);

      graphics.lineStyle(2, 0xc4d0e6, 0.6);
      graphics.strokeCircle(34, 34, 9);

      graphics.generateTexture(
        "rover-wheel",
        68,
        68,
      );

      graphics.destroy();
    }
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

    for (
      let x = 900;
      x < WORLD_WIDTH;
      x += 900
    ) {
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
      const peakX =
        x + sectionWidth / 2;

      const peakOffset =
        (x * 13) % heightVariation;

      const peakY =
        minimumY + peakOffset;

      mountains.lineTo(
        peakX,
        peakY,
      );

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
    this.createTerrainSegment(
      350,
      735,
      700,
      180,
      0,
    );

    this.createTerrainSegment(
      900,
      690,
      500,
      180,
      -10,
    );

    this.createTerrainSegment(
      1335,
      645,
      380,
      180,
      0,
    );

    this.createTerrainSegment(
      1700,
      690,
      400,
      180,
      13,
    );

    this.createTerrainSegment(
      2110,
      735,
      450,
      180,
      0,
    );

    // First gap.
    this.createTerrainSegment(
      2730,
      735,
      360,
      180,
      0,
    );

    this.createTerrainSegment(
      3110,
      675,
      450,
      180,
      -14,
    );

    this.createTerrainSegment(
      3500,
      615,
      360,
      180,
      0,
    );

    this.createTerrainSegment(
      3870,
      675,
      420,
      180,
      16,
    );

    this.createTerrainSegment(
      4260,
      735,
      360,
      180,
      0,
    );

    // Second gap.
    this.createTerrainSegment(
      4900,
      715,
      440,
      180,
      -5,
    );

    this.createTerrainSegment(
      5310,
      680,
      390,
      180,
      -6,
    );

    this.createTerrainSegment(
      5700,
      650,
      400,
      180,
      0,
    );

    this.createTerrainSegment(
      6180,
      690,
      560,
      180,
      8,
    );

    this.createStartingPlatform();
    this.createGapWarning(2440, 565);
    this.createGapWarning(4550, 565);
  }

  private createTerrainSegment(
    x: number,
    y: number,
    width: number,
    height: number,
    angleDegrees: number,
  ) {
    const angleRadians =
      Phaser.Math.DegToRad(
        angleDegrees,
      );

    const terrainVisual =
      this.add.rectangle(
        x,
        y,
        width,
        height,
        0x101629,
        1,
      );

    terrainVisual.setStrokeStyle(
      2,
      0x5ae8ff,
      0.18,
    );

    terrainVisual.setRotation(
      angleRadians,
    );

    terrainVisual.setDepth(10);

    this.matter.add.rectangle(
      x,
      y,
      width,
      height,
      {
        isStatic: true,
        angle: angleRadians,
        friction: 1,
        frictionStatic: 1,
        restitution: 0,
        label: "terrain",
      },
    );

    const surface =
      this.add.rectangle(
        x,
        y - height / 2 + 2,
        width,
        8,
        0x62eaff,
        0.38,
      );

    surface.setRotation(
      angleRadians,
    );

    surface.setDepth(11);

    const glow =
      this.add.rectangle(
        x,
        y - height / 2 + 10,
        width,
        16,
        0x2b7898,
        0.12,
      );

    glow.setRotation(
      angleRadians,
    );

    glow.setDepth(11);
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
        fontFamily:
          "Arial, sans-serif",
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
        "BOOST RECOMMENDED",
        {
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
          fontSize: "18px",
          fontStyle: "bold",
          color: "#bff8ff",
          letterSpacing: 4,
        },
      )
      .setOrigin(0.5);
  }

  private createFinishGate() {
    const groundY = 575;

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
          fontFamily:
            "Arial, sans-serif",
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
        const post =
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
              fontFamily:
                "Arial, sans-serif",
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
          respawnX:
            checkpoint.respawnX,
          respawnY:
            checkpoint.respawnY,
          reached: false,
          post,
          light,
          glow,
          label,
        });
      },
    );
  }

  private createRover() {
    const nonCollidingGroup =
      this.matter.world.nextGroup(
        true,
      );

    const chassis =
      this.matter.add.image(
        ROVER_START_X,
        ROVER_START_Y,
        "rover-chassis",
      );

    chassis.setRectangle(
      180,
      68,
      {
        label: "rover-chassis",
      },
    );

    chassis.setMass(8);
    chassis.setFriction(0.7);
    chassis.setFrictionStatic(0.9);
    chassis.setFrictionAir(0.018);
    chassis.setBounce(0.02);

    chassis.setCollisionGroup(
      nonCollidingGroup,
    );

    chassis.setDepth(20);

    const leftWheel =
      this.matter.add.image(
        ROVER_START_X - 58,
        ROVER_START_Y + 48,
        "rover-wheel",
      );

    leftWheel.setCircle(
      30,
      {
        label: "rover-wheel",
      },
    );

    leftWheel.setMass(2.2);
    leftWheel.setFriction(1.1);
    leftWheel.setFrictionStatic(1.2);
    leftWheel.setFrictionAir(0.01);
    leftWheel.setBounce(0.04);

    leftWheel.setCollisionGroup(
      nonCollidingGroup,
    );

    leftWheel.setDepth(22);

    const rightWheel =
      this.matter.add.image(
        ROVER_START_X + 58,
        ROVER_START_Y + 48,
        "rover-wheel",
      );

    rightWheel.setCircle(
      30,
      {
        label: "rover-wheel",
      },
    );

    rightWheel.setMass(2.2);
    rightWheel.setFriction(1.1);
    rightWheel.setFrictionStatic(1.2);
    rightWheel.setFrictionAir(0.01);
    rightWheel.setBounce(0.04);

    rightWheel.setCollisionGroup(
      nonCollidingGroup,
    );

    rightWheel.setDepth(22);

    this.roverChassis = chassis;
    this.roverLeftWheel = leftWheel;
    this.roverRightWheel = rightWheel;

    const chassisBody =
      chassis.body as
        | MatterJS.BodyType
        | null;

    const leftWheelBody =
      leftWheel.body as
        | MatterJS.BodyType
        | null;

    const rightWheelBody =
      rightWheel.body as
        | MatterJS.BodyType
        | null;

    if (
      !chassisBody ||
      !leftWheelBody ||
      !rightWheelBody
    ) {
      return;
    }

    this.leftSuspension =
      this.matter.add.constraint(
        chassisBody,
        leftWheelBody,
        52,
        0.55,
        {
          pointA: {
            x: -58,
            y: 24,
          },
          pointB: {
            x: 0,
            y: 0,
          },
          damping: 0.15,
          angularStiffness: 0.1,
          label: "left-suspension",
        },
      );

    this.rightSuspension =
      this.matter.add.constraint(
        chassisBody,
        rightWheelBody,
        52,
        0.55,
        {
          pointA: {
            x: 58,
            y: 24,
          },
          pointB: {
            x: 0,
            y: 0,
          },
          damping: 0.15,
          angularStiffness: 0.1,
          label: "right-suspension",
        },
      );

    this.axleConstraint =
      this.matter.add.constraint(
        leftWheelBody,
        rightWheelBody,
        116,
        0.72,
        {
          damping: 0.12,
          label: "wheel-stabiliser",
        },
      );

    this.createRoverDecorations();
  }

  private createRoverDecorations() {
    this.roverCabin =
      this.add.graphics();

    this.roverCabin.setDepth(21);

    this.roverCabin.fillStyle(
      0xa9efff,
      0.35,
    );

    this.roverCabin.fillRoundedRect(
      -42,
      -64,
      84,
      55,
      16,
    );

    this.roverCabin.lineStyle(
      3,
      0xc5f8ff,
      0.7,
    );

    this.roverCabin.strokeRoundedRect(
      -42,
      -64,
      84,
      55,
      16,
    );

    this.roverAntenna =
      this.add.rectangle(
        ROVER_START_X,
        ROVER_START_Y - 82,
        4,
        38,
        0xc7f7ff,
        0.75,
      );

    this.roverAntenna.setDepth(21);

    this.roverAntennaLight =
      this.add.circle(
        ROVER_START_X,
        ROVER_START_Y - 104,
        8,
        0x76efff,
        1,
      );

    this.roverAntennaLight.setDepth(
      22,
    );

    this.roverHeadlightGlow =
      this.add.circle(
        ROVER_START_X + 91,
        ROVER_START_Y - 4,
        25,
        0x68efff,
        0.13,
      );

    this.roverHeadlightGlow.setBlendMode(
      Phaser.BlendModes.ADD,
    );

    this.roverHeadlightGlow.setDepth(
      23,
    );

    this.roverHeadlight =
      this.add.circle(
        ROVER_START_X + 91,
        ROVER_START_Y - 4,
        9,
        0xb9ffff,
        1,
      );

    this.roverHeadlight.setBlendMode(
      Phaser.BlendModes.ADD,
    );

    this.roverHeadlight.setDepth(24);

    this.updateRoverVisualParts();
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

    this.keyR =
      this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.R,
      );

    this.boostKey =
      this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes
          .SPACE,
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
            fontFamily:
              "Arial, sans-serif",
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
            fontFamily:
              "Arial, sans-serif",
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
            fontFamily:
              "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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

    this.boostBarFill.setOrigin(
      0,
      0.5,
    );

    this.boostBarFill.setScrollFactor(
      0,
    );

    this.boostBarFill.setDepth(102);

    const controlsPanel =
      this.createHudPanel(
        GAME_WIDTH / 2 - 330,
        GAME_HEIGHT - 93,
        660,
        62,
      );

    controlsPanel.setOrigin(0, 0);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 62,
        "A / D OR ← / →  DRIVE + AIR TILT     SPACE  BOOST     R  RESTART",
        {
          fontFamily:
            "Arial, sans-serif",
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

  private createTouchControls() {
    this.input.addPointer(2);

    this.createTouchButton(
      120,
      GAME_HEIGHT - 125,
      86,
      "←",
      () => {
        this.touchLeft = true;
      },
      () => {
        this.touchLeft = false;
      },
    );

    this.createTouchButton(
      225,
      GAME_HEIGHT - 125,
      86,
      "→",
      () => {
        this.touchRight = true;
      },
      () => {
        this.touchRight = false;
      },
    );

    this.createTouchButton(
      GAME_WIDTH - 145,
      GAME_HEIGHT - 125,
      106,
      "BOOST",
      () => {
        this.touchBoost = true;
      },
      () => {
        this.touchBoost = false;
      },
    );

    this.createTouchButton(
      GAME_WIDTH - 275,
      GAME_HEIGHT - 125,
      72,
      "R",
      () => {
        this.scene.restart();
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
            fontFamily:
              "Arial, sans-serif",
            fontSize:
              label === "BOOST"
                ? "13px"
                : "30px",
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
    if (!this.roverChassis) {
      return;
    }

    this.cameras.main.setBounds(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    );

    this.cameras.main.startFollow(
      this.roverChassis,
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
      roverChassis,
      roverLeftWheel,
      roverRightWheel,
      cursors,
      keyA,
      keyD,
      keyR,
      boostKey,
    } = this;

    if (
      !roverChassis ||
      !roverLeftWheel ||
      !roverRightWheel ||
      !cursors ||
      !keyA ||
      !keyD ||
      !keyR ||
      !boostKey
    ) {
      return;
    }

    const chassisBody =
      roverChassis.body as
        | MatterJS.BodyType
        | null;

    const leftWheelBody =
      roverLeftWheel.body as
        | MatterJS.BodyType
        | null;

    const rightWheelBody =
      roverRightWheel.body as
        | MatterJS.BodyType
        | null;

    if (
      !chassisBody ||
      !leftWheelBody ||
      !rightWheelBody
    ) {
      return;
    }

    if (
      Phaser.Input.Keyboard.JustDown(
        keyR,
      )
    ) {
      this.scene.restart();
      return;
    }

    if (this.hasFinished) {
      roverLeftWheel.setAngularVelocity(
        leftWheelBody.angularVelocity *
          0.9,
      );

      roverRightWheel.setAngularVelocity(
        rightWheelBody.angularVelocity *
          0.9,
      );

      roverChassis.setVelocityX(
        chassisBody.velocity.x * 0.97,
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

    const usingBoost =
      (boostKey.isDown ||
        this.touchBoost) &&
      this.boostEnergy > 0 &&
      (movingLeft || movingRight);

    if (
      (movingLeft || movingRight) &&
      !this.hasStarted
    ) {
      this.hasStarted = true;
    }

    const targetWheelSpeed =
      usingBoost
        ? this.boostedWheelSpeed
        : this.normalWheelSpeed;

    const horizontalSpeedLimit =
      usingBoost
        ? this
            .boostedMaximumHorizontalSpeed
        : this.maximumHorizontalSpeed;

    if (
      movingRight &&
      !movingLeft
    ) {
      roverLeftWheel.setAngularVelocity(
        targetWheelSpeed,
      );

      roverRightWheel.setAngularVelocity(
        targetWheelSpeed,
      );
    } else if (
      movingLeft &&
      !movingRight
    ) {
      roverLeftWheel.setAngularVelocity(
        -targetWheelSpeed,
      );

      roverRightWheel.setAngularVelocity(
        -targetWheelSpeed,
      );
    } else {
      roverLeftWheel.setAngularVelocity(
        leftWheelBody.angularVelocity *
          0.93,
      );

      roverRightWheel.setAngularVelocity(
        rightWheelBody.angularVelocity *
          0.93,
      );
    }

    if (
      Math.abs(
        chassisBody.velocity.x,
      ) > horizontalSpeedLimit
    ) {
      roverChassis.setVelocityX(
        Math.sign(
          chassisBody.velocity.x,
        ) * horizontalSpeedLimit,
      );
    }

    if (
      this.isProbablyAirborne()
    ) {
      const currentAngularVelocity =
        chassisBody.angularVelocity;

      if (
        movingLeft &&
        !movingRight
      ) {
        roverChassis.setAngularVelocity(
          Phaser.Math.Clamp(
            currentAngularVelocity -
              0.014,
            -0.095,
            0.095,
          ),
        );
      }

      if (
        movingRight &&
        !movingLeft
      ) {
        roverChassis.setAngularVelocity(
          Phaser.Math.Clamp(
            currentAngularVelocity +
              0.014,
            -0.095,
            0.095,
          ),
        );
      }
    }

    const seconds =
      delta / 1000;

    if (usingBoost) {
      this.boostEnergy -=
        34 * seconds;
    } else {
      this.boostEnergy +=
        18 * seconds;
    }

    this.boostEnergy =
      Phaser.Math.Clamp(
        this.boostEnergy,
        0,
        this.maximumBoostEnergy,
      );
  }

  private updateRoverVisualParts() {
    if (
      !this.roverChassis ||
      !this.roverCabin ||
      !this.roverAntenna ||
      !this.roverAntennaLight ||
      !this.roverHeadlight ||
      !this.roverHeadlightGlow
    ) {
      return;
    }

    const chassis =
      this.roverChassis;

    const rotation =
      chassis.rotation;

    this.roverCabin.setPosition(
      chassis.x,
      chassis.y,
    );

    this.roverCabin.setRotation(
      rotation,
    );

    const antennaOffset =
      this.rotateOffset(
        0,
        -82,
        rotation,
      );

    this.roverAntenna.setPosition(
      chassis.x + antennaOffset.x,
      chassis.y + antennaOffset.y,
    );

    this.roverAntenna.setRotation(
      rotation,
    );

    const antennaLightOffset =
      this.rotateOffset(
        0,
        -104,
        rotation,
      );

    this.roverAntennaLight.setPosition(
      chassis.x +
        antennaLightOffset.x,
      chassis.y +
        antennaLightOffset.y,
    );

    const headlightOffset =
      this.rotateOffset(
        91,
        -4,
        rotation,
      );

    this.roverHeadlight.setPosition(
      chassis.x + headlightOffset.x,
      chassis.y + headlightOffset.y,
    );

    this.roverHeadlightGlow.setPosition(
      chassis.x + headlightOffset.x,
      chassis.y + headlightOffset.y,
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
            !this.isWheelTerrainPair(
              pair,
            )
          ) {
            return;
          }

          const wasAirborne =
            this
              .activeWheelTerrainPairs
              .size === 0;

          this.activeWheelTerrainPairs.add(
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
            !this.isWheelTerrainPair(
              pair,
            )
          ) {
            return;
          }

          this.activeWheelTerrainPairs.delete(
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

  private isWheelTerrainPair(
    pair: Phaser.Types.Physics.Matter.MatterCollisionPair,
  ) {
    const labels = [
      pair.bodyA.label,
      pair.bodyB.label,
    ];

    return (
      labels.includes(
        "rover-wheel",
      ) &&
      labels.includes("terrain")
    );
  }

  private isProbablyAirborne() {
    return (
      this.activeWheelTerrainPairs
        .size === 0
    );
  }

  private updateAirborneVelocity() {
    if (
      !this.isProbablyAirborne() ||
      !this.roverChassis ||
      !this.roverLeftWheel ||
      !this.roverRightWheel
    ) {
      return;
    }

    const chassisBody =
      this.roverChassis.body as
        | MatterJS.BodyType
        | null;

    const leftWheelBody =
      this.roverLeftWheel.body as
        | MatterJS.BodyType
        | null;

    const rightWheelBody =
      this.roverRightWheel.body as
        | MatterJS.BodyType
        | null;

    if (
      !chassisBody ||
      !leftWheelBody ||
      !rightWheelBody
    ) {
      return;
    }

    this.maximumAirborneDownwardVelocity =
      Math.max(
        this
          .maximumAirborneDownwardVelocity,
        chassisBody.velocity.y,
        leftWheelBody.velocity.y,
        rightWheelBody.velocity.y,
      );
  }

  private handleLanding() {
    const landingVelocity =
      this
        .maximumAirborneDownwardVelocity;

    this.maximumAirborneDownwardVelocity =
      0;

    if (
      landingVelocity >= 13.5
    ) {
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

    if (
      landingVelocity >= 8.5
    ) {
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
          fontFamily:
            "Arial, sans-serif",
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
      hold: 650,

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
    if (!this.roverChassis) {
      return;
    }

    const rover =
      this.roverChassis;

    this.collectibles.forEach(
      (collectible) => {
        if (
          collectible.collected
        ) {
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

        if (distance <= 100) {
          collectible.collected =
            true;

          this.collectedCount += 1;
          this.collectibleScore +=
            100;

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
    if (!this.roverChassis) {
      return;
    }

    const rover =
      this.roverChassis;

    this.checkpoints.forEach(
      (checkpoint) => {
        if (
          checkpoint.reached
        ) {
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
          horizontalDistance <= 110 &&
          verticalDistance <= 190
        ) {
          checkpoint.reached = true;

          this.reachedCheckpointCount +=
            1;

          this.checkpointScore +=
            250;

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
    if (!this.roverChassis) {
      return;
    }

    this.distanceScore =
      Math.max(
        this.distanceScore,
        Math.floor(
          Math.max(
            0,
            this.roverChassis.x -
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
      !this.roverChassis ||
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

    const chassisBody =
      this.roverChassis.body as
        | MatterJS.BodyType
        | null;

    if (!chassisBody) {
      return;
    }

    const speed = Math.round(
      Math.abs(
        chassisBody.velocity.x,
      ) * 45,
    );

    const distance = Math.max(
      0,
      Math.round(
        (this.roverChassis.x -
          ROVER_START_X) /
          4,
      ),
    );

    const boostPercentage =
      Math.round(
        (this.boostEnergy /
          this
            .maximumBoostEnergy) *
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

    if (
      this.boostEnergy <= 20
    ) {
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
      !this.roverChassis ||
      !this.objectiveText ||
      this.hasFinished
    ) {
      return;
    }

    if (
      this.roverChassis.x <
      FINISH_X
    ) {
      return;
    }

    const chassisBody =
      this.roverChassis.body as
        | MatterJS.BodyType
        | null;

    if (!chassisBody) {
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

    this.roverChassis.setVelocityX(
      Math.min(
        chassisBody.velocity.x,
        4,
      ),
    );

    this.showFinishResults();
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
          fontFamily:
            "Arial, sans-serif",
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
    if (
      !this.roverChassis ||
      !this.roverLeftWheel ||
      !this.roverRightWheel
    ) {
      return;
    }

    const hasFallen =
      this.roverChassis.y > 1020 ||
      this.roverLeftWheel.y > 1080 ||
      this.roverRightWheel.y > 1080;

    if (hasFallen) {
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
      !this.roverChassis ||
      this.hasFinished
    ) {
      return;
    }

    const body =
      this.roverChassis.body as
        | MatterJS.BodyType
        | null;

    if (!body) {
      return;
    }

    const angle =
      Phaser.Math.Angle.Wrap(
        this.roverChassis.rotation,
      );

    const badlyOverturned =
      Math.abs(angle) >
      Phaser.Math.DegToRad(115);

    const movingSlowly =
      Math.abs(
        body.velocity.x,
      ) < 1.6 &&
      Math.abs(
        body.velocity.y,
      ) < 1.6;

    const touchingTerrain =
      this.activeWheelTerrainPairs
        .size > 0;

    if (
      badlyOverturned &&
      movingSlowly &&
      touchingTerrain
    ) {
      this.overturnedTime += delta;
    } else {
      this.overturnedTime = 0;
    }

    if (
      this.overturnedTime >= 1800
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
    if (
      !this.roverChassis ||
      !this.roverLeftWheel ||
      !this.roverRightWheel
    ) {
      return;
    }

    this.cameras.main.flash(
      180,
      90,
      120,
      160,
    );

    this.activeWheelTerrainPairs.clear();

    this.maximumAirborneDownwardVelocity =
      0;

    this.overturnedTime = 0;

    this.roverChassis.setPosition(
      this.latestCheckpointX,
      this.latestCheckpointY,
    );

    this.roverLeftWheel.setPosition(
      this.latestCheckpointX - 58,
      this.latestCheckpointY + 48,
    );

    this.roverRightWheel.setPosition(
      this.latestCheckpointX + 58,
      this.latestCheckpointY + 48,
    );

    this.roverChassis.setVelocity(
      0,
      0,
    );

    this.roverLeftWheel.setVelocity(
      0,
      0,
    );

    this.roverRightWheel.setVelocity(
      0,
      0,
    );

    this.roverChassis.setAngularVelocity(
      0,
    );

    this.roverLeftWheel.setAngularVelocity(
      0,
    );

    this.roverRightWheel.setAngularVelocity(
      0,
    );

    this.roverChassis.setRotation(0);
    this.roverLeftWheel.setRotation(0);
    this.roverRightWheel.setRotation(0);

    this.boostEnergy = Math.max(
      this.boostEnergy,
      40,
    );
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

  useEffect(() => {
    if (
      !gameContainerRef.current ||
      gameRef.current
    ) {
      return;
    }

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
          mode:
            Phaser.Scale.FIT,

          autoCenter:
            Phaser.Scale
              .CENTER_BOTH,

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
      gameRef.current?.destroy(
        true,
      );

      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={gameContainerRef}
      className="aspect-video min-h-[280px] w-full overflow-hidden bg-[#070a18]"
      aria-label="Rover Challenge game"
    />
  );
}