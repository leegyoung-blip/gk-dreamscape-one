import type { RoverLevelConfig } from "./types";

type PulseGateConfig = {
  id: string;
  x: number;
  /** Approximate terrain y used to select the intended route surface. */
  y?: number;
  /** Beam height in world pixels. */
  height?: number;
  activeMs: number;
  safeMs: number;
  phaseOffsetMs?: number;
  penalty: number;
};

type LevelThreeConfig = RoverLevelConfig & {
  pulseGates: PulseGateConfig[];
};

export const levelThree: LevelThreeConfig = {
  id: 3,
  courseId: "dreamkeeper-gauntlet-03",
  title: "Dreamkeeper's Gauntlet",
  shortDescription:
    "Time the pulse gates, cross the broken road and survive the Dreamkeeper's final ambush.",
  status: "playable",
  minimumRoverStage: 4,
  prerequisiteLevel: 2,

  worldWidth: 9000,
  worldHeight: 1200,

  start: {
    x: 360,
    y: 500,
  },

  finish: {
    x: 8660,
    y: 610,
  },

  timeLimitSeconds: 135,

  terrainSections: [
    /*
     * SECTION 1 + 2
     * Approach and Pulse Gate Corridor.
     * Continuous, forgiving terrain so the new timing mechanic is learned
     * before the jumping section begins.
     */
    {
      kind: "ground",
      points: [
        { x: 0, y: 645 },
        { x: 360, y: 645 },
        { x: 780, y: 620 },
        { x: 1160, y: 585 },
        { x: 1500, y: 610 },
        { x: 1840, y: 595 },
        { x: 2180, y: 615 },
        { x: 2480, y: 600 },
        { x: 2780, y: 575 },
        { x: 3220, y: 610 },
      ],
    },

    /*
     * SECTION 3 — BROKEN SPINE A
     */
    {
      kind: "ground",
      points: [
        { x: 3220, y: 610 },
        { x: 3430, y: 575 },
        { x: 3600, y: 565 },
        { x: 3720, y: 600 },
      ],
    },

    /*
     * BROKEN SPINE B
     * Gap 1: x 3720 -> 3940
     */
    {
      kind: "ground",
      points: [
        { x: 3940, y: 620 },
        { x: 4140, y: 590 },
        { x: 4320, y: 565 },
        { x: 4450, y: 600 },
      ],
    },

    /*
     * BROKEN SPINE C
     * Gap 2: x 4450 -> 4720. This is the longer boost + jump gap.
     */
    {
      kind: "ground",
      points: [
        { x: 4720, y: 630 },
        { x: 4910, y: 595 },
        { x: 5070, y: 565 },
        { x: 5200, y: 600 },
      ],
    },

    /*
     * SECTION 4 — DREAMKEEPER AMBUSH, MAIN / LOWER ROUTE
     */
    {
      kind: "ground",
      points: [
        { x: 5200, y: 600 },
        { x: 5400, y: 625 },
        { x: 5600, y: 670 },
        { x: 5850, y: 690 },
        { x: 6120, y: 675 },
        { x: 6400, y: 650 },
        { x: 6660, y: 620 },
        { x: 6900, y: 600 },
      ],
    },

    /*
     * OPTIONAL HIGH BYPASS
     * The short Pulse Gate at x 6120 ends below this platform, so a player
     * who makes the climb can pass above that gate and the lower-route traps.
     */
    {
      kind: "platform",
      collisionThickness: 44,
      points: [
        { x: 5300, y: 520 },
        { x: 5450, y: 455 },
        { x: 5630, y: 390 },
        { x: 5860, y: 355 },
        { x: 6100, y: 365 },
        { x: 6320, y: 390 },
        { x: 6480, y: 420 },
      ],
    },

    /*
     * SECTION 5 — FINAL GAUNTLET A
     */
    {
      kind: "ground",
      points: [
        { x: 6900, y: 600 },
        { x: 7130, y: 585 },
        { x: 7320, y: 570 },
        { x: 7480, y: 600 },
      ],
    },

    /*
     * FINAL GAP: x 7480 -> 7730
     */
    {
      kind: "ground",
      points: [
        { x: 7730, y: 630 },
        { x: 7910, y: 610 },
        { x: 8150, y: 585 },
        { x: 8390, y: 595 },
        { x: 8620, y: 610 },
        { x: 8840, y: 625 },
        { x: 9000, y: 630 },
      ],
    },
  ],

  gapWarnings: [
    { x: 3830, y: 430 },
    { x: 4585, y: 430 },
    { x: 7605, y: 430 },
  ],

  collectibles: [
    { x: 820, y: 500 },
    { x: 1370, y: 485 },
    { x: 2120, y: 505 },
    { x: 3500, y: 465 },
    { x: 4160, y: 475 },
    { x: 4940, y: 470 },
    { x: 5880, y: 255 },
    { x: 8110, y: 475 },
  ],

  checkpoints: [
    {
      x: 1640,
      y: 565,
      respawnX: 1500,
      respawnY: 500,
    },
    {
      x: 3370,
      y: 545,
      respawnX: 3260,
      respawnY: 500,
    },
    {
      x: 5260,
      y: 555,
      respawnX: 5180,
      respawnY: 495,
    },
    {
      x: 6960,
      y: 550,
      respawnX: 6860,
      respawnY: 490,
    },
  ],

  routeLabels: [
    {
      x: 2420,
      y: 255,
      title: "PULSE CORRIDOR",
      subtitle: "WAIT FOR THE OPENING",
      color: "#ff9ab6",
    },
    {
      x: 4160,
      y: 275,
      title: "BROKEN SPINE",
      subtitle: "BOOST · JUMP · LAND",
      color: "#ffbd72",
    },
    {
      x: 5810,
      y: 215,
      title: "HIGH BYPASS",
      subtitle: "FASTER · HARDER CLIMB",
      color: "#8ee8ff",
    },
  ],

  /*
   * The new Level 3 mechanic.
   *
   * activeMs: time the barrier is dangerous.
   * safeMs: time the barrier is open.
   * phaseOffsetMs: prevents every gate changing state together.
   * y: route/surface hint; PhaserGame snaps the gate to sampled terrain.
   *
   * The first three gates are tall enough that jumping is not a solution.
   * The ambush gate is deliberately shorter so the optional high bypass
   * travels above it while the lower route must time the opening.
   */
  pulseGates: [
    {
      id: "corridor-1",
      x: 1840,
      y: 595,
      height: 500,
      activeMs: 1500,
      safeMs: 2100,
      phaseOffsetMs: 0,
      penalty: 250,
    },
    {
      id: "corridor-2",
      x: 2480,
      y: 600,
      height: 500,
      activeMs: 1400,
      safeMs: 1800,
      phaseOffsetMs: 1050,
      penalty: 250,
    },
    {
      id: "corridor-3",
      x: 3020,
      y: 590,
      height: 510,
      activeMs: 1250,
      safeMs: 1650,
      phaseOffsetMs: 2050,
      penalty: 300,
    },
    {
      id: "ambush-1",
      x: 6120,
      y: 675,
      height: 235,
      activeMs: 1300,
      safeMs: 1600,
      phaseOffsetMs: 650,
      penalty: 300,
    },
    {
      id: "final-1",
      x: 7130,
      y: 585,
      height: 500,
      activeMs: 1200,
      safeMs: 1550,
      phaseOffsetMs: 350,
      penalty: 325,
    },
    {
      id: "final-2",
      x: 8380,
      y: 595,
      height: 500,
      activeMs: 1100,
      safeMs: 1450,
      phaseOffsetMs: 900,
      penalty: 350,
    },
  ],

  /*
   * Level 3 keeps the smaller Level 2 dynamite balancing.
   * Radius is intentionally close to the obstacle, not the old oversized
   * activation zone.
   */
  traps: [
    {
      id: "ambush-lower-1",
      x: 5530,
      y: 655,
      blastRadius: 62,
      penalty: 250,
      rearmMs: 3000,
    },
    {
      id: "ambush-lower-2",
      x: 6460,
      y: 645,
      blastRadius: 62,
      penalty: 275,
      rearmMs: 3200,
    },
    {
      id: "final-dynamite-1",
      x: 7920,
      y: 610,
      blastRadius: 65,
      penalty: 300,
      rearmMs: 3400,
    },
  ],

  assets: {
    background: "/games/rover/dreamkeeper-gauntlet-background.png",
    orb: "/games/rover/energy-orb.png",
    dynamite: "/games/rover/dreamkeeper-dynamite.png",
    explosion: "/games/rover/dreamkeeper-explosion.png",
  },
};
