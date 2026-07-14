export type CoreRoverUpgrade = {
  missionsRequired: number;
  name: string;
  shortName: string;
  description: string;
  imageSrc: string;
  accent: string;
};

export const coreUpgradeTrack: CoreRoverUpgrade[] = [
  {
    missionsRequired: 0,
    name: "Basic Rover Frame",
    shortName: "Frame",
    description: "Nova has the starting frame of her Skyforge Rover.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-0-frame.png",
    accent: "#7ee8ff",
  },
  {
    missionsRequired: 1,
    name: "Energy Engine",
    shortName: "Engine",
    description: "The rover can now power up and move through Dreamscape.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-1-engine.png",
    accent: "#ffd76a",
  },
  {
    missionsRequired: 3,
    name: "Navigation Console",
    shortName: "Navigation",
    description: "Nova can now find safer paths through mission zones.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-3-navigation.png",
    accent: "#60f0d0",
  },
  {
    missionsRequired: 5,
    name: "Turbo Wheels",
    shortName: "Turbo Wheels",
    description: "The rover moves faster across learning routes.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-5-turbo-wheels.png",
    accent: "#8da2ff",
  },
  {
    missionsRequired: 8,
    name: "Shield Plating",
    shortName: "Shield",
    description: "The rover is protected during harder missions.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-8-shield.png",
    accent: "#ff9df0",
  },
  {
    missionsRequired: 12,
    name: "Hover Boosters",
    shortName: "Hover Rover",
    description:
      "Nova’s rover is fully upgraded with hover boosters for advanced expeditions.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-12-hover.png",
    accent: "#53d7ff",
  },
];

export function getCurrentCoreRoverUpgrade(completedCount: number) {
  let currentUpgrade = coreUpgradeTrack[0];

  for (const upgrade of coreUpgradeTrack) {
    if (completedCount >= upgrade.missionsRequired) {
      currentUpgrade = upgrade;
    }
  }

  return currentUpgrade;
}

export function getNextCoreRoverUpgrade(completedCount: number) {
  return coreUpgradeTrack.find(
    (upgrade) => completedCount < upgrade.missionsRequired
  );
}

export function getCoreRoverProgress(completedCount: number) {
  const currentUpgrade = getCurrentCoreRoverUpgrade(completedCount);
  const nextUpgrade = getNextCoreRoverUpgrade(completedCount);

  const finalUpgrade = coreUpgradeTrack[coreUpgradeTrack.length - 1];

  const progressTarget =
    nextUpgrade?.missionsRequired ?? finalUpgrade.missionsRequired;

  const previousTarget = currentUpgrade.missionsRequired;
  const progressRange = Math.max(1, progressTarget - previousTarget);
  const progressWithinRange = Math.max(0, completedCount - previousTarget);

  const progressPercentage = nextUpgrade
    ? Math.min(100, Math.round((progressWithinRange / progressRange) * 100))
    : 100;

  return {
    currentUpgrade,
    nextUpgrade,
    progressPercentage,
    isComplete: !nextUpgrade,
    finalUpgrade,
    missionsToNext: nextUpgrade
      ? Math.max(0, nextUpgrade.missionsRequired - completedCount)
      : 0,
  };
}