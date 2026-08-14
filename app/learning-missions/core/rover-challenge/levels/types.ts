export type RoverLevelId = 1 | 2;

export type CoursePoint = {
  x: number;
  y: number;
};

export type RoverCheckpoint = CoursePoint & {
  respawnX: number;
  respawnY: number;
};

export type RoverTerrainSection = {
  points: CoursePoint[];
  kind?: "ground" | "platform";
  collisionThickness?: number;
};

export type RoverTrap = CoursePoint & {
  id: string;
  blastRadius: number;
  penalty: number;
  rearmMs: number;
};

export type RoverRouteLabel = CoursePoint & {
  title: string;
  subtitle: string;
  color: string;
};

export type RoverLevelConfig = {
  id: RoverLevelId;
  courseId: string;
  title: string;
  shortDescription: string;
  status: "playable" | "phase-2";
  minimumRoverStage: number;
  prerequisiteLevel: RoverLevelId | null;
  worldWidth: number;
  worldHeight: number;
  start: CoursePoint;
  finish: CoursePoint;
  timeLimitSeconds: number;
  terrainSections: Array<CoursePoint[] | RoverTerrainSection>;
  gapWarnings: CoursePoint[];
  collectibles: CoursePoint[];
  checkpoints: RoverCheckpoint[];
  traps?: RoverTrap[];
  routeLabels?: RoverRouteLabel[];
  assets: {
    background: string;
    orb: string;
    dynamite?: string;
    explosion?: string;
  };
};

export type RoverLevelAccess = {
  level_id: RoverLevelId;
  course_id: string;
  title: string;
  minimum_rover_stage: number;
  prerequisite_level: RoverLevelId | null;
  current_rover_stage: number;
  unlocked: boolean;
  stage_ready: boolean;
  completed: boolean;
  best_score: number | null;
  best_time_ms: number | null;
  completed_at: string | null;
};
