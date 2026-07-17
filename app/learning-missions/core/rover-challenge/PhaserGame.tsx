"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 900;

const WORLD_WIDTH = 5200;
const WORLD_HEIGHT = 900;

const GROUND_TOP = 690;

const ROVER_START_X = 400;
const ROVER_START_Y = 520;

class RoverTestScene extends Phaser.Scene {
  private rover?: Phaser.GameObjects.Rectangle;
  private roverBody?: Phaser.Physics.Arcade.Body;

  private roverCabin?: Phaser.GameObjects.Graphics;
  private roverLeftWheel?: Phaser.GameObjects.Arc;
  private roverRightWheel?: Phaser.GameObjects.Arc;
  private roverAntenna?: Phaser.GameObjects.Rectangle;
  private roverAntennaLight?: Phaser.GameObjects.Arc;
  private roverHeadlight?: Phaser.GameObjects.Arc;
  private roverHeadlightGlow?: Phaser.GameObjects.Arc;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyR?: Phaser.Input.Keyboard.Key;
  private boostKey?: Phaser.Input.Keyboard.Key;

  private distanceText?: Phaser.GameObjects.Text;
  private speedText?: Phaser.GameObjects.Text;
  private boostText?: Phaser.GameObjects.Text;
  private boostBarFill?: Phaser.GameObjects.Rectangle;
  private objectiveText?: Phaser.GameObjects.Text;

  private groundGroup?: Phaser.Physics.Arcade.StaticGroup;

  private boostEnergy = 100;
  private readonly maximumBoostEnergy = 100;

  private hasFinished = false;

  private readonly normalAcceleration = 760;
  private readonly boostAcceleration = 1280;
  private readonly maximumSpeed = 600;
  private readonly boostedMaximumSpeed = 860;

  constructor() {
    super({
      key: "RoverTestScene",
    });
  }

  create() {
    this.physics.world.setBounds(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      true,
      true,
      true,
      false,
    );

    this.createBackground();
    this.createTerrain();
    this.createStartGate();
    this.createFinishGate();
    this.createTemporaryRover();
    this.createControls();
    this.createInterface();
    this.configureCamera();

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.R,
    ]);

    this.cameras.main.fadeIn(500, 5, 7, 19);
  }

  update(_time: number, delta: number) {
    if (!this.rover || !this.roverBody) {
      return;
    }

    this.handleMovement(delta);
    this.updateRoverParts(delta);
    this.updateInterface();
    this.checkCourseProgress();
    this.checkFallReset();
  }

  private createBackground() {
    this.cameras.main.setBackgroundColor("#070a18");

    const background = this.add.graphics();

    background.fillStyle(0x151b42, 1);
    background.fillRect(0, 0, WORLD_WIDTH, 390);

    background.fillStyle(0x0e1534, 1);
    background.fillRect(0, 390, WORLD_WIDTH, 300);

    for (let x = 80; x < WORLD_WIDTH; x += 130) {
      const firstY = 60 + ((x * 17) % 270);
      const secondY = 90 + ((x * 29) % 250);

      this.add.circle(x, firstY, 1.5, 0xbadfff, 0.75);
      this.add.circle(x + 55, secondY, 1, 0xffffff, 0.45);
    }

    this.add.circle(1280, 170, 86, 0x8496d7, 0.12);
    this.add.circle(1280, 170, 58, 0xb4c8ff, 0.08);

    this.add.circle(3400, 210, 115, 0x7b88d4, 0.09);
    this.add.circle(3400, 210, 75, 0xc5dcff, 0.06);

    this.createMountainLayer(
      0x111938,
      0.95,
      360,
      610,
      430,
      270,
    );

    this.createMountainLayer(
      0x0b1129,
      1,
      470,
      660,
      330,
      205,
    );

    const haze = this.add.rectangle(
      WORLD_WIDTH / 2,
      590,
      WORLD_WIDTH,
      170,
      0x425cc7,
      0.07,
    );

    haze.setBlendMode(Phaser.BlendModes.ADD);

    for (let x = 900; x < WORLD_WIDTH; x += 900) {
      const towerHeight = 90 + ((x / 10) % 90);

      this.add.rectangle(
        x,
        610 - towerHeight / 2,
        48,
        towerHeight,
        0x182145,
        0.7,
      );

      this.add.rectangle(
        x,
        610 - towerHeight,
        8,
        42,
        0x4beaff,
        0.25,
      );

      this.add.circle(
        x,
        610 - towerHeight - 24,
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
      const peakOffset = (x * 13) % heightVariation;
      const peakY = minimumY + peakOffset;

      mountains.lineTo(peakX, peakY);
      mountains.lineTo(x + sectionWidth, baseY);

      x += sectionWidth;
    }

    mountains.lineTo(WORLD_WIDTH, baseY + 100);
    mountains.lineTo(0, baseY + 100);
    mountains.closePath();
    mountains.fillPath();
  }

  private createTerrain() {
    this.groundGroup = this.physics.add.staticGroup();

    const sectionWidth = 800;
    const sectionHeight = 220;

    for (let x = sectionWidth / 2; x < WORLD_WIDTH; x += sectionWidth) {
      const ground = this.add.rectangle(
        x,
        GROUND_TOP + sectionHeight / 2,
        sectionWidth + 4,
        sectionHeight,
        0x101629,
      );

      ground.setStrokeStyle(2, 0x5ae8ff, 0.15);

      this.physics.add.existing(ground, true);
      this.groundGroup.add(ground);
    }

    this.add.rectangle(
      WORLD_WIDTH / 2,
      GROUND_TOP,
      WORLD_WIDTH,
      8,
      0x62eaff,
      0.35,
    );

    this.add.rectangle(
      WORLD_WIDTH / 2,
      GROUND_TOP + 9,
      WORLD_WIDTH,
      18,
      0x2b7898,
      0.13,
    );

    const terrainDetails = this.add.graphics();

    terrainDetails.lineStyle(2, 0x4a5d86, 0.13);

    for (let x = 0; x < WORLD_WIDTH; x += 100) {
      terrainDetails.lineBetween(
        x,
        GROUND_TOP + 28,
        x + 45,
        GROUND_TOP + 73,
      );

      terrainDetails.lineBetween(
        x + 45,
        GROUND_TOP + 73,
        x + 95,
        GROUND_TOP + 28,
      );
    }

    this.add.ellipse(
      ROVER_START_X,
      GROUND_TOP - 7,
      360,
      54,
      0x3ce7ff,
      0.07,
    );

    this.add.ellipse(
      ROVER_START_X,
      GROUND_TOP - 11,
      280,
      28,
      0x80efff,
      0.1,
    );

    const platformOutline = this.add.ellipse(
      ROVER_START_X,
      GROUND_TOP - 13,
      320,
      38,
      0x000000,
      0,
    );

    platformOutline.setStrokeStyle(2, 0x5eeaff, 0.3);

    for (let x = 900; x < WORLD_WIDTH - 400; x += 700) {
      this.createCourseMarker(x);
    }
  }

  private createCourseMarker(x: number) {
    this.add.rectangle(
      x,
      GROUND_TOP - 34,
      8,
      68,
      0x334566,
      0.8,
    );

    this.add.rectangle(
      x,
      GROUND_TOP - 70,
      28,
      9,
      0x55e8ff,
      0.6,
    );

    this.add.circle(
      x,
      GROUND_TOP - 91,
      8,
      0x77f5ff,
      0.75,
    );
  }

  private createStartGate() {
    const startX = 180;

    this.add.rectangle(
      startX,
      GROUND_TOP - 105,
      18,
      210,
      0x263354,
      1,
    );

    this.add.rectangle(
      startX + 135,
      GROUND_TOP - 105,
      18,
      210,
      0x263354,
      1,
    );

    this.add.rectangle(
      startX + 67.5,
      GROUND_TOP - 205,
      153,
      20,
      0x304267,
      1,
    );

    this.add.rectangle(
      startX + 67.5,
      GROUND_TOP - 203,
      115,
      5,
      0x69f0ff,
      0.8,
    );

    this.add
      .text(startX + 67.5, GROUND_TOP - 240, "START", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#bff8ff",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
  }

  private createFinishGate() {
    const finishX = WORLD_WIDTH - 500;

    this.add.rectangle(
      finishX,
      GROUND_TOP - 130,
      24,
      260,
      0x263354,
      1,
    );

    this.add.rectangle(
      finishX + 240,
      GROUND_TOP - 130,
      24,
      260,
      0x263354,
      1,
    );

    this.add.rectangle(
      finishX + 120,
      GROUND_TOP - 250,
      264,
      24,
      0x304267,
      1,
    );

    const finishGlow = this.add.rectangle(
      finishX + 120,
      GROUND_TOP - 247,
      210,
      6,
      0x7dfcff,
      0.9,
    );

    finishGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.add
      .text(finishX + 120, GROUND_TOP - 290, "FINISH", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#d7fcff",
        letterSpacing: 5,
      })
      .setOrigin(0.5);
  }

  private createTemporaryRover() {
    this.rover = this.add.rectangle(
      ROVER_START_X,
      ROVER_START_Y,
      190,
      92,
      0x818cf8,
      1,
    );

    this.rover.setStrokeStyle(4, 0xc7f7ff, 0.85);
    this.rover.setDepth(20);

    this.physics.add.existing(this.rover);

    this.roverBody =
      this.rover.body as Phaser.Physics.Arcade.Body;

    this.roverBody.setSize(180, 84);
    this.roverBody.setGravityY(1050);
    this.roverBody.setCollideWorldBounds(true);
    this.roverBody.setBounce(0.02);
    this.roverBody.setDragX(900);
    this.roverBody.setMaxVelocity(this.maximumSpeed, 1100);

    if (this.groundGroup) {
      this.physics.add.collider(
        this.rover,
        this.groundGroup,
      );
    }

    this.roverLeftWheel = this.add.circle(
      ROVER_START_X - 56,
      ROVER_START_Y + 40,
      29,
      0x070a14,
    );

    this.roverLeftWheel.setStrokeStyle(7, 0x53627e, 1);
    this.roverLeftWheel.setDepth(22);

    this.roverRightWheel = this.add.circle(
      ROVER_START_X + 56,
      ROVER_START_Y + 40,
      29,
      0x070a14,
    );

    this.roverRightWheel.setStrokeStyle(7, 0x53627e, 1);
    this.roverRightWheel.setDepth(22);

    this.addWheelSpokes(this.roverLeftWheel);
    this.addWheelSpokes(this.roverRightWheel);

    this.roverCabin = this.add.graphics();
    this.roverCabin.setDepth(21);

    this.roverHeadlightGlow = this.add.circle(
      ROVER_START_X + 88,
      ROVER_START_Y - 6,
      25,
      0x68efff,
      0.13,
    );

    this.roverHeadlightGlow.setBlendMode(
      Phaser.BlendModes.ADD,
    );
    this.roverHeadlightGlow.setDepth(23);

    this.roverHeadlight = this.add.circle(
      ROVER_START_X + 88,
      ROVER_START_Y - 6,
      9,
      0xb9ffff,
      1,
    );

    this.roverHeadlight.setBlendMode(
      Phaser.BlendModes.ADD,
    );
    this.roverHeadlight.setDepth(24);

    this.roverAntenna = this.add.rectangle(
      ROVER_START_X,
      ROVER_START_Y - 78,
      4,
      38,
      0xc7f7ff,
      0.75,
    );

    this.roverAntenna.setDepth(21);

    this.roverAntennaLight = this.add.circle(
      ROVER_START_X,
      ROVER_START_Y - 100,
      8,
      0x76efff,
      1,
    );

    this.roverAntennaLight.setDepth(22);

    this.updateCabinGraphics();
  }

  private addWheelSpokes(wheel: Phaser.GameObjects.Arc) {
    const spokes = this.add.graphics();

    spokes.lineStyle(4, 0x98aac9, 0.8);
    spokes.lineBetween(-20, 0, 20, 0);
    spokes.lineBetween(0, -20, 0, 20);

    spokes.setPosition(wheel.x, wheel.y);
    spokes.setDepth(23);

    wheel.setData("spokes", spokes);
  }

  private createControls() {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors =
      this.input.keyboard.createCursorKeys();

    this.keyA = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.A,
    );

    this.keyD = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.D,
    );

    this.keyR = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );

    this.boostKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
  }

  private createInterface() {
    const statusPanel = this.add.rectangle(
      42,
      42,
      360,
      132,
      0x050816,
      0.72,
    );

    statusPanel.setOrigin(0, 0);
    statusPanel.setStrokeStyle(1, 0xffffff, 0.1);
    statusPanel.setScrollFactor(0);
    statusPanel.setDepth(100);

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
      .text(70, 124, "DISTANCE  0 M", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: "#a9b6d1",
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.objectiveText = this.add
      .text(
        70,
        150,
        "OBJECTIVE  REACH THE FINISH GATE",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#8defff",
          letterSpacing: 1,
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    const boostPanel = this.add.rectangle(
      GAME_WIDTH - 390,
      42,
      348,
      102,
      0x050816,
      0.72,
    );

    boostPanel.setOrigin(0, 0);
    boostPanel.setStrokeStyle(1, 0xffffff, 0.1);
    boostPanel.setScrollFactor(0);
    boostPanel.setDepth(100);

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

    const controlsPanel = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 60,
      610,
      62,
      0x050816,
      0.7,
    );

    controlsPanel.setStrokeStyle(1, 0xffffff, 0.08);
    controlsPanel.setScrollFactor(0);
    controlsPanel.setDepth(100);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 60,
        "A / D OR ← / →  DRIVE       SPACE  BOOST       R  RESTART",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          fontStyle: "bold",
          color: "#c6d2ea",
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
  }

  private configureCamera() {
    if (!this.rover) {
      return;
    }

    this.cameras.main.setBounds(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    );

    this.cameras.main.startFollow(
      this.rover,
      true,
      0.075,
      0.075,
      -280,
      30,
    );

    this.cameras.main.setDeadzone(260, 170);
  }

  private handleMovement(delta: number) {
    const {
      rover,
      roverBody,
      cursors,
      keyA,
      keyD,
      keyR,
      boostKey,
    } = this;

    if (
      !rover ||
      !roverBody ||
      !cursors ||
      !keyA ||
      !keyD ||
      !keyR ||
      !boostKey
    ) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(keyR)) {
      this.resetRover();
      return;
    }

    if (this.hasFinished) {
      roverBody.setAccelerationX(0);
      return;
    }

    const movingLeft =
      cursors.left.isDown || keyA.isDown;

    const movingRight =
      cursors.right.isDown || keyD.isDown;

    const usingBoost =
      boostKey.isDown &&
      this.boostEnergy > 0 &&
      (movingLeft || movingRight);

    const acceleration = usingBoost
      ? this.boostAcceleration
      : this.normalAcceleration;

    const currentMaximumSpeed = usingBoost
      ? this.boostedMaximumSpeed
      : this.maximumSpeed;

    roverBody.setMaxVelocity(
      currentMaximumSpeed,
      1100,
    );

    if (movingLeft && !movingRight) {
      roverBody.setAccelerationX(-acceleration);
    } else if (movingRight && !movingLeft) {
      roverBody.setAccelerationX(acceleration);
    } else {
      roverBody.setAccelerationX(0);
    }

    const seconds = delta / 1000;

    if (usingBoost) {
      this.boostEnergy -= 34 * seconds;
    } else {
      this.boostEnergy += 18 * seconds;
    }

    this.boostEnergy = Phaser.Math.Clamp(
      this.boostEnergy,
      0,
      this.maximumBoostEnergy,
    );
  }

  private updateRoverParts(delta: number) {
    if (
      !this.rover ||
      !this.roverBody ||
      !this.roverLeftWheel ||
      !this.roverRightWheel ||
      !this.roverAntenna ||
      !this.roverAntennaLight ||
      !this.roverHeadlight ||
      !this.roverHeadlightGlow
    ) {
      return;
    }

    const roverX = this.rover.x;
    const roverY = this.rover.y;

    this.roverLeftWheel.setPosition(
      roverX - 56,
      roverY + 40,
    );

    this.roverRightWheel.setPosition(
      roverX + 56,
      roverY + 40,
    );

    const leftSpokes = this.roverLeftWheel.getData(
      "spokes",
    ) as Phaser.GameObjects.Graphics | undefined;

    const rightSpokes = this.roverRightWheel.getData(
      "spokes",
    ) as Phaser.GameObjects.Graphics | undefined;

    const wheelRotation =
      (this.roverBody.velocity.x / 75) *
      (delta / 16.667);

    this.roverLeftWheel.rotation += wheelRotation;
    this.roverRightWheel.rotation += wheelRotation;

    if (leftSpokes) {
      leftSpokes.setPosition(
        this.roverLeftWheel.x,
        this.roverLeftWheel.y,
      );

      leftSpokes.rotation =
        this.roverLeftWheel.rotation;
    }

    if (rightSpokes) {
      rightSpokes.setPosition(
        this.roverRightWheel.x,
        this.roverRightWheel.y,
      );

      rightSpokes.rotation =
        this.roverRightWheel.rotation;
    }

    this.roverAntenna.setPosition(
      roverX,
      roverY - 78,
    );

    this.roverAntennaLight.setPosition(
      roverX,
      roverY - 100,
    );

    this.roverHeadlight.setPosition(
      roverX + 88,
      roverY - 6,
    );

    this.roverHeadlightGlow.setPosition(
      roverX + 88,
      roverY - 6,
    );

    this.updateCabinGraphics();
  }

  private updateCabinGraphics() {
    if (!this.rover || !this.roverCabin) {
      return;
    }

    this.roverCabin.clear();

    this.roverCabin.fillStyle(0xa9efff, 0.35);
    this.roverCabin.fillRoundedRect(
      this.rover.x - 42,
      this.rover.y - 65,
      84,
      60,
      18,
    );

    this.roverCabin.lineStyle(
      3,
      0xc5f8ff,
      0.7,
    );

    this.roverCabin.strokeRoundedRect(
      this.rover.x - 42,
      this.rover.y - 65,
      84,
      60,
      18,
    );
  }

  private updateInterface() {
    if (
      !this.rover ||
      !this.roverBody ||
      !this.distanceText ||
      !this.speedText ||
      !this.boostText ||
      !this.boostBarFill
    ) {
      return;
    }

    const speed = Math.round(
      Math.abs(this.roverBody.velocity.x),
    );

    const distance = Math.max(
      0,
      Math.round(
        (this.rover.x - ROVER_START_X) / 4,
      ),
    );

    const boostPercentage = Math.round(
      (this.boostEnergy /
        this.maximumBoostEnergy) *
        100,
    );

    this.speedText.setText(
      `SPEED  ${speed.toString().padStart(3, "0")}`,
    );

    this.distanceText.setText(
      `DISTANCE  ${distance.toLocaleString()} M`,
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

  private checkCourseProgress() {
    if (
      !this.rover ||
      !this.roverBody ||
      !this.objectiveText ||
      this.hasFinished
    ) {
      return;
    }

    const finishLineX = WORLD_WIDTH - 380;

    if (this.rover.x >= finishLineX) {
      this.hasFinished = true;

      this.roverBody.setAccelerationX(0);
      this.roverBody.setVelocityX(
        Math.min(
          this.roverBody.velocity.x,
          220,
        ),
      );

      this.objectiveText
        .setText("OBJECTIVE  COURSE COMPLETE")
        .setColor("#8dffbf");

      this.showFinishMessage();
    }
  }

  private showFinishMessage() {
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      740,
      280,
      0x050816,
      0.92,
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
        GAME_HEIGHT / 2 - 68,
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
        GAME_HEIGHT / 2,
        "The rover movement system is functioning correctly.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          color: "#c7d4e8",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 65,
        "PRESS R TO RUN THE TEST AGAIN",
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

  private checkFallReset() {
    if (!this.rover) {
      return;
    }

    if (this.rover.y > WORLD_HEIGHT + 100) {
      this.resetRover();
    }
  }

  private resetRover() {
    this.hasFinished = false;
    this.boostEnergy =
      this.maximumBoostEnergy;

    this.scene.restart();
  }
}

export default function PhaserGame() {
  const gameContainerRef =
    useRef<HTMLDivElement | null>(null);

  const gameRef =
    useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (
      !gameContainerRef.current ||
      gameRef.current
    ) {
      return;
    }

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
        default: "arcade",

        arcade: {
          gravity: {
            x: 0,
            y: 0,
          },

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

      scene: [RoverTestScene],
    };

    gameRef.current =
      new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
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