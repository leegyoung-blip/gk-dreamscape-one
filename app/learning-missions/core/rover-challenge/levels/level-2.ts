import type { RoverLevelConfig } from "./types";

export const levelTwo: RoverLevelConfig = {
  id: 2,
  courseId: "dreamkeeper-divide-02",
  title: "Dreamkeeper Divide",
  shortDescription:
    "Choose an upper or lower route and survive the Dreamkeeper's traps.",
  status: "playable",
  minimumRoverStage: 3,
  prerequisiteLevel: 1,
  worldWidth: 7800,
  worldHeight: 1200,
  start: { x: 360, y: 500 },
  finish: { x: 7420, y: 610 },
  timeLimitSeconds: 115,

  terrainSections: [
    {
      kind: "ground",
      points: [
        { x: 0, y: 645 },
        { x: 360, y: 645 },
        { x: 760, y: 620 },
        { x: 1120, y: 565 },
        { x: 1480, y: 590 },
        { x: 1750, y: 570 },
        { x: 1950, y: 600 },
        { x: 2150, y: 660 },
        { x: 2450, y: 760 },
        { x: 2800, y: 790 },
        { x: 3200, y: 770 },
        { x: 3600, y: 735 },
        { x: 4050, y: 685 },
        { x: 4400, y: 640 },
      ],
    },
    {
      kind: "platform",
      collisionThickness: 44,
      points: [
        { x: 2300, y: 535 },
        { x: 2450, y: 500 },
        { x: 2620, y: 430 },
        { x: 2740, y: 350 },
        { x: 3000, y: 330 },
      ],
    },
    {
      kind: "platform",
      collisionThickness: 44,
      points: [
        { x: 3350, y: 380 },
        { x: 3650, y: 410 },
        { x: 3970, y: 510 },
        { x: 4400, y: 580 },
      ],
    },
    {
      kind: "ground",
      points: [
        { x: 4460, y: 620 },
        { x: 4720, y: 600 },
        { x: 5000, y: 560 },
        { x: 5200, y: 545 },
      ],
    },
    {
      kind: "ground",
      points: [
        { x: 5560, y: 650 },
        { x: 5780, y: 620 },
        { x: 6100, y: 570 },
        { x: 6450, y: 555 },
        { x: 6800, y: 575 },
        { x: 7150, y: 600 },
        { x: 7600, y: 630 },
        { x: 7800, y: 640 },
      ],
    },
  ],

  gapWarnings: [
    { x: 3175, y: 250 },
    { x: 5380, y: 505 },
  ],

  collectibles: [
    { x: 820, y: 505 },
    { x: 1320, y: 455 },
    { x: 1820, y: 525 },
    { x: 2130, y: 505 },
    { x: 4580, y: 505 },
    { x: 5720, y: 510 },
    { x: 6180, y: 455 },
    { x: 7000, y: 490 },
  ],

  checkpoints: [
    { x: 1810, y: 550, respawnX: 1720, respawnY: 500 },
    { x: 4650, y: 510, respawnX: 4520, respawnY: 480 },
    { x: 5900, y: 520, respawnX: 5730, respawnY: 475 },
  ],

  routeLabels: [
    {
      x: 2760,
      y: 220,
      title: "HIGH ROUTE",
      subtitle: "FASTER · BIG JUMP",
      color: "#8ee8ff",
    },
    {
      x: 2500,
      y: 900,
      title: "LOW ROUTE",
      subtitle: "LONGER · MORE TRAPS",
      color: "#ffbd72",
    },
  ],

  /*
   * y is an approximate route/surface hint. PhaserGame.tsx uses it only
   * to choose the correct terrain when an upper and lower route overlap
   * at the same x-coordinate. The dynamite is then snapped to the exact
   * sampled terrain surface and rotated to match that surface.
   *
   * This keeps RoverTrap unchanged and removes the terrainSectionIndex
   * TypeScript errors from both files.
   */
  traps: [
    {
      id: "lower-1",
      x: 2730,
      y: 785,
      blastRadius: 105,
      penalty: 250,
      rearmMs: 3000,
    },
    {
      id: "lower-2",
      x: 3330,
      y: 760,
      blastRadius: 105,
      penalty: 250,
      rearmMs: 3000,
    },
    {
      id: "upper-1",
      x: 3670,
      y: 415,
      blastRadius: 100,
      penalty: 250,
      rearmMs: 3000,
    },
    {
      id: "final-1",
      x: 6350,
      y: 560,
      blastRadius: 110,
      penalty: 300,
      rearmMs: 3400,
    },
  ],

  assets: {
    background: "/games/rover/dreamkeeper-divide-background.png",
    orb: "/games/rover/energy-orb.png",
    dynamite: "/games/rover/dreamkeeper-dynamite.png",
    explosion: "/games/rover/dreamkeeper-explosion.png",
  },
};
