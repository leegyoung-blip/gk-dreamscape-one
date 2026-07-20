export type ThinkMazeAbilities = {
  logicLensCharges: number;
  scannerCharges: number;
  compassCharges: number;
  shieldCharges: number;
  wrenchCharges: number;
  sparkCharges: number;
};

export type ThinkGearUpgrade = {
  stage: number;
  missionsRequired: number;
  name: string;
  shortName: string;
  description: string;
  imageSrc: string;
  accent: string;
  icon: string;
  mazeAbilities: ThinkMazeAbilities;
};

export const thinkGearTrack: ThinkGearUpgrade[] = [
  {
    stage: 0,
    missionsRequired: 0,
    name: "Basic Explorer Kit",
    shortName: "Explorer Kit",
    description:
      "Nova can enter the Logic Maze with a standard explorer kit and basic movement controls.",
    imageSrc:
      "/learning-missions/think/items/empty-gear-wall.png",
    accent: "#7ee8ff",
    icon: "◇",
    mazeAbilities: {
      logicLensCharges: 0,
      scannerCharges: 0,
      compassCharges: 0,
      shieldCharges: 0,
      wrenchCharges: 0,
      sparkCharges: 0,
    },
  },
  {
    stage: 1,
    missionsRequired: 1,
    name: "Logic Lens",
    shortName: "Logic Lens",
    description:
      "Nova can briefly reveal hidden clues, puzzle terminals and energy cores inside the maze.",
    imageSrc:
      "/learning-missions/think/items/logic-lens.png",
    accent: "#60f0d0",
    icon: "◉",
    mazeAbilities: {
      logicLensCharges: 1,
      scannerCharges: 0,
      compassCharges: 0,
      shieldCharges: 0,
      wrenchCharges: 0,
      sparkCharges: 0,
    },
  },
  {
    stage: 2,
    missionsRequired: 3,
    name: "Pattern Scanner",
    shortName: "Scanner",
    description:
      "Nova can scan the maze and reveal a route towards the nearest unfinished objective.",
    imageSrc:
      "/learning-missions/think/items/pattern-scanner.png",
    accent: "#7ee8ff",
    icon: "⌁",
    mazeAbilities: {
      logicLensCharges: 1,
      scannerCharges: 1,
      compassCharges: 0,
      shieldCharges: 0,
      wrenchCharges: 0,
      sparkCharges: 0,
    },
  },
  {
    stage: 3,
    missionsRequired: 5,
    name: "Clue Compass",
    shortName: "Compass",
    description:
      "Nova can point directly towards the nearest remaining core, puzzle or maze exit.",
    imageSrc:
      "/learning-missions/think/items/clue-compass.png",
    accent: "#ffd76a",
    icon: "✦",
    mazeAbilities: {
      logicLensCharges: 1,
      scannerCharges: 1,
      compassCharges: 1,
      shieldCharges: 0,
      wrenchCharges: 0,
      sparkCharges: 0,
    },
  },
  {
    stage: 4,
    missionsRequired: 8,
    name: "Puzzle Shield",
    shortName: "Shield",
    description:
      "Nova can block the penalty from one maze trap during every completed run.",
    imageSrc:
      "/learning-missions/think/items/puzzle-shield.png",
    accent: "#b58cff",
    icon: "⬡",
    mazeAbilities: {
      logicLensCharges: 1,
      scannerCharges: 1,
      compassCharges: 1,
      shieldCharges: 1,
      wrenchCharges: 0,
      sparkCharges: 0,
    },
  },
  {
    stage: 5,
    missionsRequired: 12,
    name: "Energy Wrench",
    shortName: "Wrench",
    description:
      "Nova can remove one nearby internal maze wall to create a useful shortcut.",
    imageSrc:
      "/learning-missions/think/items/energy-wrench.png",
    accent: "#ffcc66",
    icon: "⚙",
    mazeAbilities: {
      logicLensCharges: 1,
      scannerCharges: 1,
      compassCharges: 1,
      shieldCharges: 1,
      wrenchCharges: 1,
      sparkCharges: 0,
    },
  },
  {
    stage: 6,
    missionsRequired: 16,
    name: "Spark Staff",
    shortName: "Spark Staff",
    description:
      "Nova can reveal the correct answer for one active puzzle terminal during each run.",
    imageSrc:
      "/learning-missions/think/items/spark-staff.png",
    accent: "#ff9df0",
    icon: "✧",
    mazeAbilities: {
      logicLensCharges: 1,
      scannerCharges: 1,
      compassCharges: 1,
      shieldCharges: 1,
      wrenchCharges: 1,
      sparkCharges: 1,
    },
  },
  {
    stage: 7,
    missionsRequired: 20,
    name: "Advanced Gear Inventory",
    shortName: "Full Inventory",
    description:
      "Nova’s full Think Mission loadout is ready, with additional charges for advanced maze expeditions.",
    imageSrc:
      "/learning-missions/think/items/advanced-gear-inventory.png",
    accent: "#60f0d0",
    icon: "✺",
    mazeAbilities: {
      logicLensCharges: 2,
      scannerCharges: 2,
      compassCharges: 2,
      shieldCharges: 2,
      wrenchCharges: 2,
      sparkCharges: 2,
    },
  },
];

export function getCurrentThinkGearUpgrade(completedCount: number) {
  let currentUpgrade = thinkGearTrack[0];

  for (const upgrade of thinkGearTrack) {
    if (completedCount >= upgrade.missionsRequired) {
      currentUpgrade = upgrade;
    }
  }

  return currentUpgrade;
}

export function getNextThinkGearUpgrade(completedCount: number) {
  return thinkGearTrack.find(
    (upgrade) => completedCount < upgrade.missionsRequired,
  );
}

export function getThinkGearProgress(completedCount: number) {
  const currentUpgrade = getCurrentThinkGearUpgrade(completedCount);
  const nextUpgrade = getNextThinkGearUpgrade(completedCount);
  const finalUpgrade = thinkGearTrack[thinkGearTrack.length - 1];

  const progressTarget =
    nextUpgrade?.missionsRequired ?? finalUpgrade.missionsRequired;
  const previousTarget = currentUpgrade.missionsRequired;
  const progressRange = Math.max(1, progressTarget - previousTarget);
  const progressWithinRange = Math.max(
    0,
    completedCount - previousTarget,
  );

  const progressPercentage = nextUpgrade
    ? Math.min(
        100,
        Math.round((progressWithinRange / progressRange) * 100),
      )
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
