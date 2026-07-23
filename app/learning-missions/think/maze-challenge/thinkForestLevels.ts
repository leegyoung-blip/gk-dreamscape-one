export type ThinkForestLevelNumber = 1 | 2;

export type ThinkForestObstacleConfig = {
  texture: "large-rocks" | "root-barrier";
  x: number;
  y: number;
  width: number;
  height: number;
  bodyWidth: number;
  bodyHeight: number;
};

export type ThinkForestGuardEntry = {
  y: number;
  targetX: number;
  delay: number;
};

export type ThinkForestPoint = {
  x: number;
  y: number;
};

export type ThinkForestLevelConfig = {
  level: ThinkForestLevelNumber;
  title: string;
  courseId: string;
  background: string;
  worldWidth: number;
  worldHeight: number;
  novaSpawn: ThinkForestPoint;
  exit: ThinkForestPoint;
  obstacles: ThinkForestObstacleConfig[];
  energyCores: ThinkForestPoint[];
  guardEntries: ThinkForestGuardEntry[];
};

export const THINK_FOREST_LEVELS: Record<
  ThinkForestLevelNumber,
  ThinkForestLevelConfig
> = {
  1: {
    level: 1,
    title: "Uncharted Forest",
    courseId: "uncharted-forest-01",
    background: "/games/think-forest/forest-floor-bg.png",
    worldWidth: 1672,
    worldHeight: 941,
    novaSpawn: {
      x: 145,
      y: 470,
    },
    exit: {
      x: 1540,
      y: 470,
    },
    obstacles: [
      {
        texture: "large-rocks",
        x: 430,
        y: 235,
        width: 210,
        height: 180,
        bodyWidth: 150,
        bodyHeight: 92,
      },
      {
        texture: "large-rocks",
        x: 770,
        y: 660,
        width: 225,
        height: 192,
        bodyWidth: 160,
        bodyHeight: 98,
      },
      {
        texture: "large-rocks",
        x: 1110,
        y: 260,
        width: 205,
        height: 176,
        bodyWidth: 148,
        bodyHeight: 90,
      },
      {
        texture: "root-barrier",
        x: 600,
        y: 450,
        width: 310,
        height: 150,
        bodyWidth: 278,
        bodyHeight: 88,
      },
      {
        texture: "root-barrier",
        x: 1000,
        y: 485,
        width: 320,
        height: 154,
        bodyWidth: 288,
        bodyHeight: 90,
      },
      {
        texture: "root-barrier",
        x: 1275,
        y: 735,
        width: 290,
        height: 140,
        bodyWidth: 260,
        bodyHeight: 80,
      },
    ],
    energyCores: [
      { x: 390, y: 745 },
      { x: 860, y: 175 },
      { x: 1270, y: 610 },
    ],
    guardEntries: [
      { y: 185, targetX: 1110, delay: 450 },
      { y: 325, targetX: 1160, delay: 1350 },
      { y: 470, targetX: 1090, delay: 2250 },
      { y: 615, targetX: 1175, delay: 3150 },
      { y: 770, targetX: 1125, delay: 4050 },
    ],
  },

  2: {
    level: 2,
    title: "Deepwood Crossing",
    courseId: "uncharted-forest-02",

    /*
     * Temporary background so Level 2 can already run.
     * After adding the new map, replace this with:
     * "/games/think-forest/level-2-map.png"
     */
    background: "/games/think-forest/forest-floor-bg.png",

    worldWidth: 1672,
    worldHeight: 941,
    novaSpawn: {
      x: 145,
      y: 470,
    },
    exit: {
      x: 1540,
      y: 185,
    },
    obstacles: [
      {
        texture: "large-rocks",
        x: 360,
        y: 245,
        width: 220,
        height: 188,
        bodyWidth: 158,
        bodyHeight: 96,
      },
      {
        texture: "root-barrier",
        x: 520,
        y: 600,
        width: 320,
        height: 154,
        bodyWidth: 288,
        bodyHeight: 90,
      },
      {
        texture: "large-rocks",
        x: 760,
        y: 405,
        width: 215,
        height: 184,
        bodyWidth: 154,
        bodyHeight: 94,
      },
      {
        texture: "root-barrier",
        x: 970,
        y: 210,
        width: 310,
        height: 150,
        bodyWidth: 278,
        bodyHeight: 88,
      },
      {
        texture: "large-rocks",
        x: 1120,
        y: 690,
        width: 225,
        height: 192,
        bodyWidth: 160,
        bodyHeight: 98,
      },
      {
        texture: "root-barrier",
        x: 1350,
        y: 455,
        width: 300,
        height: 146,
        bodyWidth: 270,
        bodyHeight: 84,
      },
    ],
    energyCores: [
      { x: 455, y: 770 },
      { x: 885, y: 560 },
      { x: 1315, y: 295 },
    ],
    guardEntries: [
      { y: 155, targetX: 1220, delay: 350 },
      { y: 285, targetX: 1165, delay: 1100 },
      { y: 425, targetX: 1260, delay: 1850 },
      { y: 565, targetX: 1185, delay: 2600 },
      { y: 705, targetX: 1240, delay: 3350 },
      { y: 825, targetX: 1140, delay: 4100 },
    ],
  },
};
