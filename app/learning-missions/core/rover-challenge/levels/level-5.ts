import type { RoverLevelConfig } from "./types";

export const levelFive: RoverLevelConfig = {
  id: 5,
  courseId: "boneguard-breach-05",
  title: "Boneguard Breach",
  shortDescription:
    "Push through the fractured frontier while Bone Guards emerge from the Bone Gate, advance on Nova's rover and open fire.",
  status: "playable",
  minimumRoverStage: 0,
  prerequisiteLevel: 4,

  worldWidth: 7000,
  worldHeight: 1200,

  start: { x: 360, y: 555 },
  finish: { x: 6620, y: 620 },
  timeLimitSeconds: 165,

  terrainSections: [
    /* APPROACH — readable terrain for first contact */
    {
      kind: "ground",
      points: [
        { x: 100, y: 650 },
        { x: 650, y: 646 },
        { x: 1100, y: 620 },
        { x: 1500, y: 640 },
        { x: 1800, y: 615 },
      ],
    },

    /* FRACTURE PASS A */
    {
      kind: "ground",
      points: [
        { x: 1980, y: 632 },
        { x: 2320, y: 585 },
        { x: 2660, y: 535 },
        { x: 3000, y: 605 },
      ],
    },

    /* FRACTURE PASS B — unstable under enemy fire */
    {
      kind: "platform",
      collisionThickness: 78,
      unstable: true,
      collapseDelayMs: 1500,
      collapseTriggerRadius: 190,
      points: [
        { x: 3135, y: 605 },
        { x: 3400, y: 560 },
        { x: 3675, y: 545 },
        { x: 3930, y: 600 },
      ],
    },

    /* TRANSITION */
    {
      kind: "ground",
      points: [
        { x: 4060, y: 615 },
        { x: 4380, y: 590 },
        { x: 4740, y: 625 },
        { x: 5150, y: 602 },
      ],
    },

    /* PORTAL ASSAULT — broad final combat arena */
    {
      kind: "ground",
      points: [
        { x: 5250, y: 610 },
        { x: 5600, y: 620 },
        { x: 5950, y: 612 },
        { x: 6300, y: 620 },
        { x: 6900, y: 620 },
      ],
    },
  ],

  gapWarnings: [
    { x: 1890, y: 590 },
    { x: 3065, y: 555 },
    { x: 3995, y: 565 },
    { x: 5200, y: 565 },
  ],

  collectibles: [
    { x: 850, y: 520 },
    { x: 1370, y: 520 },
    { x: 2250, y: 470 },
    { x: 2740, y: 430 },
    { x: 3470, y: 430 },
    { x: 4460, y: 485 },
    { x: 5510, y: 500 },
    { x: 6150, y: 500 },
  ],

  checkpoints: [
    { x: 1750, y: 615, respawnX: 1640, respawnY: 520 },
    { x: 4010, y: 610, respawnX: 4100, respawnY: 515 },
    { x: 5480, y: 615, respawnX: 5380, respawnY: 520 },
  ],

  routeLabels: [
    {
      x: 1180,
      y: 380,
      title: "APPROACH",
      subtitle: "FIRST CONTACT",
      color: "#9eeeff",
    },
    {
      x: 3300,
      y: 350,
      title: "FRACTURE PASS",
      subtitle: "KEEP MOVING · RETURN FIRE",
      color: "#d5adff",
    },
    {
      x: 5750,
      y: 390,
      title: "PORTAL ASSAULT",
      subtitle: "CLEAR THE BONE GUARDS",
      color: "#ffb4ff",
    },
  ],

  traps: [],

  assets: {
    /*
     * Temporary Stage 2 treatment.
     * Phaser applies the violet/blue Beyond-the-Fracture overlay at runtime.
     * We can replace this with a dedicated Expedition 5 background later.
     */
    background: "/games/rover/skyforge-course-background.png",
    orb: "/games/rover/energy-orb.png",
  },
};
