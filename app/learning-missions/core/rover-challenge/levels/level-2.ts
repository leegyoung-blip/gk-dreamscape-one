import type { RoverLevelConfig } from "./types";

// Phase 1 reserves the route, metadata and progression gate. Phase 2 supplies
// the branching terrain, dynamite traps and the finished playable map.
export const levelTwo: RoverLevelConfig = {
  id: 2,
  courseId: "dreamkeeper-divide-02",
  title: "Dreamkeeper Divide",
  shortDescription: "Choose an upper or lower route and survive the Dreamkeeper's traps.",
  status: "phase-2",
  minimumRoverStage: 3,
  prerequisiteLevel: 1,
  worldWidth: 7200,
  worldHeight: 1200,
  start: { x: 360, y: 500 },
  finish: { x: 6800, y: 610 },
  timeLimitSeconds: 105,
  terrainSections: [],
  gapWarnings: [],
  collectibles: [],
  checkpoints: [],
  assets: {
    background: "/games/rover/skyforge-course-background.png",
    orb: "/games/rover/energy-orb.png",
  },
};
