import type { RoverLevelConfig } from "./types";

export const levelSix: RoverLevelConfig = {
  id: 6,
  courseId: "fractured-frontier-06",
  title: "Fractured Frontier",
  shortDescription:
    "Assault fortified Bone Guard positions across a continuous frontier road. Jump or destroy their barricades, break their cover and clear every defender.",
  status: "playable",
  minimumRoverStage: 0,
  prerequisiteLevel: 5,

  worldWidth: 10200,
  worldHeight: 1200,

  start: { x: 340, y: 560 },
  finish: { x: 9900, y: 610 },
  timeLimitSeconds: 175,

  /*
   * Expedition 6 deliberately has NO gaps and NO unstable terrain.
   * The traversal challenge comes from rolling slopes + physical barricades.
   */
  terrainSections: [
    {
      kind: "ground",
      points: [
        { x: 0, y: 650 },
        { x: 500, y: 646 },
        { x: 950, y: 628 },
        { x: 1350, y: 612 },
        { x: 1750, y: 628 },
        { x: 2200, y: 610 },
        { x: 2700, y: 632 },
        { x: 3150, y: 645 },
        { x: 3600, y: 615 },
        { x: 4050, y: 585 },
        { x: 4500, y: 600 },
        { x: 5000, y: 628 },
        { x: 5480, y: 646 },
        { x: 5950, y: 620 },
        { x: 6420, y: 585 },
        { x: 6900, y: 570 },
        { x: 7350, y: 598 },
        { x: 7800, y: 625 },
        { x: 8250, y: 612 },
        { x: 8700, y: 590 },
        { x: 9150, y: 582 },
        { x: 9600, y: 605 },
        { x: 10200, y: 620 },
      ],
    },
  ],

  gapWarnings: [],

  collectibles: [
    { x: 820, y: 520 },
    { x: 1450, y: 505 },
    { x: 2520, y: 515 },
    { x: 3880, y: 455 },
    { x: 4740, y: 500 },
    { x: 5750, y: 510 },
    { x: 6750, y: 445 },
    { x: 8000, y: 500 },
    { x: 9480, y: 470 },
  ],

  checkpoints: [
    { x: 2200, y: 610, respawnX: 2070, respawnY: 520 },
    { x: 4800, y: 616, respawnX: 4660, respawnY: 515 },
    { x: 7100, y: 582, respawnX: 6960, respawnY: 490 },
    { x: 8900, y: 586, respawnX: 8760, respawnY: 495 },
  ],

  /*
   * Each barricade is BOTH cover and a physical jump obstacle.
   * Player projectiles hit the barricade before the Bone Guard behind it.
   * Guards cannot be targeted or damaged until their own cover is destroyed.
   */
  barricades: [
    {
      id: "alpha-1",
      x: 1850,
      y: 625,
      maxHp: 180,
      width: 190,
      height: 96,
      guards: [
        { offsetX: 48, hp: 220 },
      ],
    },
    {
      id: "convoy-1",
      x: 3450,
      y: 625,
      maxHp: 220,
      width: 200,
      height: 98,
      guards: [
        { offsetX: 50, hp: 230 },
      ],
    },
    {
      id: "convoy-2",
      x: 4380,
      y: 595,
      maxHp: 320,
      width: 215,
      height: 104,
      guards: [
        { offsetX: 52, hp: 250 },
      ],
    },
    {
      id: "fortress-1",
      x: 6060,
      y: 612,
      maxHp: 320,
      width: 230,
      height: 108,
      guards: [
        { offsetX: 38, hp: 260 },
        { offsetX: 94, hp: 260 },
      ],
    },
    {
      id: "fortress-2",
      x: 6980,
      y: 574,
      maxHp: 320,
      width: 220,
      height: 106,
      guards: [
        { offsetX: 56, hp: 280 },
      ],
    },
    {
      id: "strongpoint-1",
      x: 8300,
      y: 608,
      maxHp: 240,
      width: 205,
      height: 100,
      guards: [
        { offsetX: 52, hp: 280 },
      ],
    },
    {
      id: "strongpoint-final",
      x: 9250,
      y: 585,
      maxHp: 500,
      width: 250,
      height: 118,
      guards: [
        { offsetX: 40, hp: 320 },
        { offsetX: 102, hp: 480, heavy: true },
      ],
    },
  ],

  routeLabels: [
    {
      x: 1250,
      y: 360,
      title: "FRONTIER APPROACH",
      subtitle: "DEFENSIVE POSITION DETECTED",
      color: "#9eeeff",
    },
    {
      x: 3900,
      y: 330,
      title: "BROKEN CONVOY",
      subtitle: "BREAK COVER · CLEAR DEFENDERS",
      color: "#d5adff",
    },
    {
      x: 6400,
      y: 315,
      title: "FORTRESS APPROACH",
      subtitle: "MULTIPLE FIRING POSITIONS",
      color: "#ffbd72",
    },
    {
      x: 8850,
      y: 305,
      title: "FRONTIER STRONGPOINT",
      subtitle: "DESTROY THE FINAL DEFENCE LINE",
      color: "#ff9dcf",
    },
  ],

  traps: [],
  pulseGates: [],

  assets: {
    background:
      "/games/rover/expedition-6/fractured-frontier-background.png",
    orb: "/games/rover/energy-orb.png",
    barricade:
      "/games/rover/expedition-6/frontier-barricade.png",
    barricadeDestroyed:
      "/games/rover/expedition-6/frontier-barricade-destroyed.png",
  },
};
