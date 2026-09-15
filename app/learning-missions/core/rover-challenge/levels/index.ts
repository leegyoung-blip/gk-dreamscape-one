import { levelOne } from "./level-1";
import { levelTwo } from "./level-2";
import { levelThree } from "./level-3";
import { levelFour } from "./level-4";
import { levelFive } from "./level-5";
import type { RoverLevelConfig, RoverLevelId } from "./types";

export const roverLevels: Record<RoverLevelId, RoverLevelConfig> = {
  1: levelOne,
  2: levelTwo,
  3: levelThree,
  4: levelFour,
  5: levelFive,
};

export function isRoverLevelId(value: number): value is RoverLevelId {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5
  );
}

export function getRoverLevel(level: RoverLevelId) {
  return roverLevels[level];
}

export type {
  RoverLevelAccess,
  RoverLevelConfig,
  RoverLevelId,
  RoverPulseGate,
  RoverTerrainSection,
} from "./types";
