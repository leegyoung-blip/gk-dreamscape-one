import { levelOne } from "./level-1";
import { levelTwo } from "./level-2";
import type { RoverLevelConfig, RoverLevelId } from "./types";

export const roverLevels: Record<RoverLevelId, RoverLevelConfig> = {
  1: levelOne,
  2: levelTwo,
};

export function isRoverLevelId(value: number): value is RoverLevelId {
  return value === 1 || value === 2;
}

export function getRoverLevel(level: RoverLevelId) {
  return roverLevels[level];
}

export type { RoverLevelAccess, RoverLevelConfig, RoverLevelId } from "./types";
