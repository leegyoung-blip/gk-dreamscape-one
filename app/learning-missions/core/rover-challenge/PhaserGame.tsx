"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 900;

class RoverTestScene extends Phaser.Scene {
  private rover?: Phaser.GameObjects.Rectangle;
  private leftWheel?: Phaser.GameObjects.Arc;
  private rightWheel?: Phaser.GameObjects.Arc;

  constructor() {
    super({
      key: "RoverTestScene",
    });
  }

  create() {
    this.cameras.main.setBackgroundColor("#090d22");

    this.createBackground();
    this.createTerrain();
    this.createTemporaryRover();
    this.createInterface();

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  update() {
    if (!this.rover || !this.leftWheel || !this.rightWheel) {
      return;
    }

    /*
     * The wheels are temporary decorative objects.
     * They follow the physical rover body.
     */
    this.leftWheel.setPosition(this.rover.x - 56, this.rover.y + 40);
    this.rightWheel.setPosition(this.rover.x + 56, this.rover.y + 40);
  }

  private createBackground() {
    // Deep-space upper glow
    const upperGlow = this.add.graphics();

    upperGlow.fillStyle(0x151b42, 1);
    upperGlow.fillRect(0, 0, GAME_WIDTH, 390);

    upperGlow.fillStyle(0x0e1534, 1);
    upperGlow.fillRect(0, 390, GAME_WIDTH, 250);

    // Stars and particles
    const stars = [
      [120, 110, 2],
      [225, 185, 1],
      [360, 85, 2],
      [510, 155, 1],
      [670, 95, 2],
      [820, 205, 1],
      [985, 115, 2],
      [1140, 175, 1],
      [1310, 75, 2],
      [1460, 145, 1],
      [90, 300, 1],
      [430, 285, 2],
      [760, 315, 1],
      [1070, 275, 2],
      [1380, 330, 1],
    ];

    stars.forEach(([x, y, radius]) => {
      this.add.circle(x, y, radius, 0xbadfff, 0.8);
    });

    // Distant moon
    this.add.circle(1280, 175, 86, 0x8496d7, 0.12);
    this.add.circle(1280, 175, 59, 0xb4c8ff, 0.08);

    // Distant mountain silhouettes
    const farMountains = this.add.graphics();

    farMountains.fillStyle(0x111938, 1);
    farMountains.beginPath();
    farMountains.moveTo(0, 620);
    farMountains.lineTo(0, 455);
    farMountains.lineTo(170, 335);
    farMountains.lineTo(320, 475);
    farMountains.lineTo(520, 300);
    farMountains.lineTo(750, 485);
    farMountains.lineTo(920, 355);
    farMountains.lineTo(1120, 480);
    farMountains.lineTo(1340, 295);
    farMountains.lineTo(1600, 475);
    farMountains.lineTo(1600, 620);
    farMountains.closePath();
    farMountains.fillPath();

    const nearMountains = this.add.graphics();

    nearMountains.fillStyle(0x0b1129, 1);
    nearMountains.beginPath();
    nearMountains.moveTo(0, 650);
    nearMountains.lineTo(0, 535);
    nearMountains.lineTo(220, 410);
    nearMountains.lineTo(430, 560);
    nearMountains.lineTo(690, 425);
    nearMountains.lineTo(900, 575);
    nearMountains.lineTo(1160, 420);
    nearMountains.lineTo(1385, 555);
    nearMountains.lineTo(1600, 430);
    nearMountains.lineTo(1600, 650);
    nearMountains.closePath();
    nearMountains.fillPath();

    // Horizon haze
    const haze = this.add.rectangle(
      GAME_WIDTH / 2,
      585,
      GAME_WIDTH,
      150,
      0x425cc7,
      0.08,
    );

    haze.setBlendMode(Phaser.BlendModes.ADD);
  }

  private createTerrain() {
    // Main ground
    const ground = this.add.rectangle(
      GAME_WIDTH / 2,
      785,
      GAME_WIDTH,
      230,
      0x101629,
    );

    ground.setStrokeStyle(2, 0x5ae8ff, 0.23);

    this.physics.add.existing(ground, true);

    // Ground top surface
    this.add.rectangle(
      GAME_WIDTH / 2,
      669,
      GAME_WIDTH,
      8,
      0x62eaff,
      0.35,
    );

    this.add.rectangle(
      GAME_WIDTH / 2,
      677,
      GAME_WIDTH,
      18,
      0x2b7898,
      0.13,
    );

    // Terrain details
    const terrainDetails = this.add.graphics();

    terrainDetails.lineStyle(2, 0x4a5d86, 0.15);

    for (let x = 0; x < GAME_WIDTH; x += 100) {
      terrainDetails.lineBetween(x, 690, x + 45, 735);
      terrainDetails.lineBetween(x + 45, 735, x + 95, 690);
    }

    // Landing platform underneath the rover
    this.add.ellipse(800, 682, 360, 54, 0x3ce7ff, 0.07);
    this.add.ellipse(800, 678, 280, 28, 0x80efff, 0.1);

    const platformLine = this.add.ellipse(
      800,
      676,
      320,
      38,
      0x000000,
      0,
    );

    platformLine.setStrokeStyle(2, 0x5eeaff, 0.3);
  }

  private createTemporaryRover() {
    /*
     * This rectangle is the temporary physical rover body.
     * It will later be replaced with the user's actual rover image.
     */
    this.rover = this.add.rectangle(800, 520, 190, 92, 0x818cf8, 1);

    this.rover.setStrokeStyle(4, 0xc7f7ff, 0.85);

    this.physics.add.existing(this.rover);

    const roverBody = this.rover.body as Phaser.Physics.Arcade.Body;

    roverBody.setGravityY(900);
    roverBody.setCollideWorldBounds(true);
    roverBody.setBounce(0.05);
    roverBody.setDragX(600);
    roverBody.setMaxVelocity(800, 1000);

    // Terrain object is retrieved by its position.
    const ground = this.children.list.find(
      (child) =>
        child instanceof Phaser.GameObjects.Rectangle &&
        child.y === 785 &&
        child.width === GAME_WIDTH,
    ) as Phaser.GameObjects.Rectangle | undefined;

    if (ground) {
      this.physics.add.collider(this.rover, ground);
    }

    // Temporary wheel graphics
    this.leftWheel = this.add.circle(
      this.rover.x - 56,
      this.rover.y + 40,
      29,
      0x070a14,
    );

    this.leftWheel.setStrokeStyle(7, 0x53627e, 1);

    this.rightWheel = this.add.circle(
      this.rover.x + 56,
      this.rover.y + 40,
      29,
      0x070a14,
    );

    this.rightWheel.setStrokeStyle(7, 0x53627e, 1);

    // Temporary cabin
    const cabin = this.add.graphics();

    cabin.fillStyle(0xa9efff, 0.35);
    cabin.fillRoundedRect(758, 455, 84, 60, 18);

    cabin.lineStyle(3, 0xc5f8ff, 0.7);
    cabin.strokeRoundedRect(758, 455, 84, 60, 18);

    // Temporary front light
    const headlight = this.add.circle(888, 514, 9, 0xb9ffff, 1);

    headlight.setBlendMode(Phaser.BlendModes.ADD);

    const headlightGlow = this.add.circle(888, 514, 25, 0x68efff, 0.13);

    headlightGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Temporary antenna
    this.add.rectangle(800, 442, 4, 38, 0xc7f7ff, 0.75);
    this.add.circle(800, 420, 8, 0x76efff, 1);
  }

  private createInterface() {
    // Upper-left status
    const panel = this.add.rectangle(52, 48, 315, 92, 0x050816, 0.66);

    panel.setOrigin(0, 0);
    panel.setStrokeStyle(1, 0xffffff, 0.1);

    this.add
      .text(78, 70, "ROVER STATUS", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#72eaff",
        letterSpacing: 3,
      })
      .setOrigin(0);

    this.add
      .text(78, 100, "Prototype connected", {
        fontFamily: "Arial, sans-serif",
        fontSize: "21px",
        color: "#ffffff",
      })
      .setOrigin(0);

    // Centre calibration label
    this.add
      .text(800, 255, "SKYFORGE TERRAIN SIMULATOR", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#d9faff",
        letterSpacing: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.add
      .text(800, 290, "CALIBRATION MODE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "44px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(800, 340, "Movement controls will be activated in the next stage.", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#9ba9c9",
      })
      .setOrigin(0.5);

    // Bottom-right build label
    this.add
      .text(1540, 842, "TEST BUILD 0.1", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#6c7895",
        letterSpacing: 2,
      })
      .setOrigin(1, 0.5);
  }
}

export default function PhaserGame() {
  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameContainerRef.current || gameRef.current) {
      return;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: gameContainerRef.current,
      backgroundColor: "#090d22",
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
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },

      scene: [RoverTestScene],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={gameContainerRef}
      className="aspect-video min-h-[280px] w-full overflow-hidden bg-[#090d22]"
      aria-label="Rover Challenge game"
    />
  );
}