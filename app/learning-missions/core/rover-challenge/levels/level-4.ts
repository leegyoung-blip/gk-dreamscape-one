import type { RoverLevelConfig } from "./types";

export const levelFour: RoverLevelConfig = {
  id: 4,
  courseId: "fracture-run-04",
  title: "Fracture Run",
  shortDescription:
    "Keep moving as unstable roads fracture beneath the rover and the Dreamkeeper tears the course apart.",
  status: "playable",
  minimumRoverStage: 4,
  prerequisiteLevel: 3,

  worldWidth: 9600,
  worldHeight: 1200,

  start: { x: 360, y: 500 },
  finish: { x: 9250, y: 610 },
  timeLimitSeconds: 140,

  terrainSections: [
    /* OPENING — safe road */
    {
      kind: "ground",
      points: [
        { x: 0, y: 645 },
        { x: 360, y: 645 },
        { x: 760, y: 620 },
        { x: 1120, y: 590 },
        { x: 1460, y: 610 },
      ],
    },

    /* FRACTURE FIELD — three collapsing platforms */
    {
      kind: "platform",
      collisionThickness: 48,
      unstable: true,
      collapseDelayMs: 1200,
      collapseTriggerRadius: 170,
      points: [
        { x: 1500, y: 590 },
        { x: 1740, y: 565 },
        { x: 1980, y: 575 },
      ],
    },
    {
      kind: "platform",
      collisionThickness: 48,
      unstable: true,
      collapseDelayMs: 980,
      collapseTriggerRadius: 170,
      points: [
        { x: 2100, y: 600 },
        { x: 2340, y: 570 },
        { x: 2580, y: 580 },
      ],
    },
    {
      kind: "platform",
      collisionThickness: 48,
      unstable: true,
      collapseDelayMs: 820,
      collapseTriggerRadius: 175,
      points: [
        { x: 2700, y: 610 },
        { x: 2960, y: 575 },
        { x: 3200, y: 595 },
      ],
    },

    /* SPLIT ROUTE — stable lower road */
    {
      kind: "ground",
      points: [
        { x: 3340, y: 650 },
        { x: 3600, y: 675 },
        { x: 3900, y: 690 },
        { x: 4240, y: 675 },
        { x: 4580, y: 650 },
        { x: 4900, y: 625 },
        { x: 5200, y: 610 },
      ],
    },

    /* SPLIT ROUTE — faster unstable high road */
    {
      kind: "platform",
      collisionThickness: 44,
      unstable: true,
      collapseDelayMs: 900,
      collapseTriggerRadius: 180,
      points: [
        { x: 3420, y: 500 },
        { x: 3600, y: 430 },
        { x: 3820, y: 365 },
        { x: 4080, y: 335 },
        { x: 4340, y: 350 },
        { x: 4580, y: 390 },
        { x: 4820, y: 425 },
      ],
    },

    /* COLLAPSE TUNNEL — lower stable path */
    {
      kind: "ground",
      points: [
        { x: 5200, y: 610 },
        { x: 5480, y: 635 },
        { x: 5780, y: 660 },
        { x: 6100, y: 665 },
        { x: 6400, y: 645 },
        { x: 6720, y: 620 },
      ],
    },

    /* COLLAPSE TUNNEL — unstable upper road, enough clearance below */
    {
      kind: "platform",
      collisionThickness: 44,
      unstable: true,
      collapseDelayMs: 760,
      collapseTriggerRadius: 180,
      points: [
        { x: 5300, y: 400 },
        { x: 5520, y: 340 },
        { x: 5780, y: 315 },
        { x: 6060, y: 320 },
        { x: 6340, y: 345 },
        { x: 6560, y: 370 },
      ],
    },

    /* DREAMKEEPER CHASE — collapsing islands */
    {
      kind: "platform",
      collisionThickness: 48,
      unstable: true,
      collapseDelayMs: 700,
      collapseTriggerRadius: 190,
      points: [
        { x: 6840, y: 610 },
        { x: 7100, y: 585 },
        { x: 7320, y: 595 },
      ],
    },
    {
      kind: "platform",
      collisionThickness: 48,
      unstable: true,
      collapseDelayMs: 650,
      collapseTriggerRadius: 190,
      points: [
        { x: 7440, y: 615 },
        { x: 7680, y: 580 },
        { x: 7900, y: 590 },
      ],
    },
    {
      kind: "platform",
      collisionThickness: 48,
      unstable: true,
      collapseDelayMs: 600,
      collapseTriggerRadius: 190,
      points: [
        { x: 8020, y: 610 },
        { x: 8240, y: 575 },
        { x: 8440, y: 590 },
      ],
    },

    /* FINAL FRACTURE BRIDGE — do not stop */
    {
      kind: "platform",
      collisionThickness: 52,
      unstable: true,
      collapseDelayMs: 620,
      collapseTriggerRadius: 200,
      points: [
        { x: 8520, y: 610 },
        { x: 8740, y: 590 },
        { x: 8940, y: 600 },
      ],
    },
    {
      kind: "ground",
      points: [
        { x: 9060, y: 620 },
        { x: 9300, y: 610 },
        { x: 9600, y: 625 },
      ],
    },
  ],

  gapWarnings: [
    { x: 2040, y: 430 },
    { x: 2640, y: 430 },
    { x: 3270, y: 455 },
    { x: 7380, y: 440 },
    { x: 7960, y: 440 },
    { x: 8480, y: 440 },
    { x: 9000, y: 450 },
  ],

  collectibles: [
    { x: 860, y: 500 },
    { x: 1780, y: 455 },
    { x: 2380, y: 455 },
    { x: 3020, y: 460 },
    { x: 4050, y: 245 },
    { x: 4700, y: 540 },
    { x: 5900, y: 225 },
    { x: 7600, y: 470 },
    { x: 8820, y: 480 },
  ],

  checkpoints: [
    { x: 1420, y: 560, respawnX: 1300, respawnY: 500 },
    { x: 3340, y: 600, respawnX: 3260, respawnY: 500 },
    { x: 5200, y: 560, respawnX: 5120, respawnY: 500 },
    { x: 8420, y: 540, respawnX: 8340, respawnY: 490 },
  ],

  routeLabels: [
    {
      x: 2280,
      y: 260,
      title: "FRACTURE FIELD",
      subtitle: "KEEP MOVING",
      color: "#ff9f72",
    },
    {
      x: 4050,
      y: 210,
      title: "UNSTABLE HIGH ROUTE",
      subtitle: "FASTER · NEVER STOP",
      color: "#8ee8ff",
    },
    {
      x: 4070,
      y: 820,
      title: "LOW ROUTE",
      subtitle: "STABLE · MORE HAZARDS",
      color: "#ffbd72",
    },
    {
      x: 7560,
      y: 270,
      title: "DREAMKEEPER OVERRIDE",
      subtitle: "THE ROAD IS COLLAPSING",
      color: "#ff7b91",
    },
    {
      x: 8780,
      y: 280,
      title: "FRACTURE BRIDGE",
      subtitle: "DON'T STOP",
      color: "#ff9f72",
    },
  ],

  pulseGates: [
    {
      id: "split-low-1",
      x: 3860,
      y: 690,
      height: 330,
      activeMs: 1250,
      safeMs: 1550,
      phaseOffsetMs: 350,
      penalty: 300,
    },
    {
      id: "tunnel-low-1",
      x: 5760,
      y: 660,
      height: 300,
      activeMs: 1150,
      safeMs: 1450,
      phaseOffsetMs: 900,
      penalty: 325,
    },
    {
      id: "tunnel-low-2",
      x: 6380,
      y: 645,
      height: 300,
      activeMs: 1100,
      safeMs: 1400,
      phaseOffsetMs: 250,
      penalty: 325,
    },
  ],

  traps: [
    {
      id: "split-low-dynamite-1",
      x: 4380,
      y: 665,
      blastRadius: 62,
      penalty: 275,
      rearmMs: 3200,
    },
    {
      id: "split-low-dynamite-2",
      x: 4860,
      y: 625,
      blastRadius: 62,
      penalty: 275,
      rearmMs: 3200,
    },
    {
      id: "chase-dynamite-1",
      x: 8180,
      y: 585,
      blastRadius: 65,
      penalty: 325,
      rearmMs: 3400,
    },
  ],

  assets: {
    background: "/games/rover/fracture-run-background.png",
    orb: "/games/rover/energy-orb.png",
    dynamite: "/games/rover/dreamkeeper-dynamite.png",
    explosion: "/games/rover/dreamkeeper-explosion.png",
  },
};
