export type CoreRoverGameStats = {
  normalSpeed: number;
  boostSpeed: number;
  accelerationRate: number;
  brakingRate: number;
  jumpVelocity: number;
  boostCapacity: number;
  boostDrainRate: number;
  boostRechargeRate: number;
  airTiltStrength: number;
  crashPenaltyMultiplier?: number;
  trapPenaltyMultiplier?: number;
  groundAlignmentMultiplier?: number;
  slopeAssistMultiplier?: number;
  landingToleranceMultiplier?: number;
  overturnToleranceMultiplier?: number;
};

export type CoreRoverUpgrade = {
  stage: number;
  roverNumber: number;
  slug: string;
  priceDt: number;
  name: string;
  shortName: string;
  description: string;
  imageSrc: string;
  gameBodySrc: string;
  gameFrontWheelSrc: string | null;
  gameBackWheelSrc: string | null;
  gameMode: "wheeled" | "hover";
  accent: string;
  gameStats: CoreRoverGameStats;
};

const ROVER_ASSET_ROOT =
  "/activities/learning-missions/core/rover/vehicles";

export const coreUpgradeTrack: CoreRoverUpgrade[] = [
  {
    stage: 0,
    roverNumber: 1,
    slug: "scout-buggy",
    priceDt: 0,
    name: "Scout Buggy",
    shortName: "Scout",
    description:
      "A lightweight exploration buggy with exposed suspension, a compact cockpit and responsive handling for first expeditions.",
    imageSrc: `${ROVER_ASSET_ROOT}/scout-buggy.png`,
    gameBodySrc: `${ROVER_ASSET_ROOT}/side-scout-buggy-body.png`,
    gameFrontWheelSrc: `${ROVER_ASSET_ROOT}/side-scout-buggy-front-wheel.png`,
    gameBackWheelSrc: `${ROVER_ASSET_ROOT}/side-scout-buggy-back-wheel.png`,
    gameMode: "wheeled",
    accent: "#7ee8ff",
    gameStats: {
      normalSpeed: 8.8,
      boostSpeed: 11.5,
      accelerationRate: 7,
      brakingRate: 7.5,
      jumpVelocity: -10.5,
      boostCapacity: 75,
      boostDrainRate: 14.5,
      boostRechargeRate: 15,
      airTiltStrength: 0.015,
      crashPenaltyMultiplier: 0.9,
      trapPenaltyMultiplier: 1,
    },
  },
  {
    stage: 1,
    roverNumber: 2,
    slug: "ignition-runner",
    priceDt: 100,
    name: "Ignition Runner",
    shortName: "Ignition",
    description:
      "A low, aggressive performance rover built around oversized rear power units, stronger acceleration and a larger boost reserve.",
    imageSrc: `${ROVER_ASSET_ROOT}/ignition-runner.png`,
    gameBodySrc: `${ROVER_ASSET_ROOT}/side-ignition-runner-body.png`,
    gameFrontWheelSrc: `${ROVER_ASSET_ROOT}/side-ignition-runner-front-wheel.png`,
    gameBackWheelSrc: `${ROVER_ASSET_ROOT}/side-ignition-runner-back-wheel.png`,
    gameMode: "wheeled",
    accent: "#ffd76a",
    gameStats: {
      normalSpeed: 11.2,
      boostSpeed: 15.5,
      accelerationRate: 8.5,
      brakingRate: 7.2,
      jumpVelocity: -11.5,
      boostCapacity: 105,
      boostDrainRate: 12.5,
      boostRechargeRate: 18,
      airTiltStrength: 0.014,
      crashPenaltyMultiplier: 1,
      trapPenaltyMultiplier: 1,
    },
  },
  {
    stage: 2,
    roverNumber: 3,
    slug: "pathfinder-command",
    priceDt: 250,
    name: "Pathfinder Command",
    shortName: "Pathfinder",
    description:
      "A long-range command rover packed with navigation arrays, communications equipment and steadier all-terrain control.",
    imageSrc: `${ROVER_ASSET_ROOT}/pathfinder-command.png`,
    gameBodySrc: `${ROVER_ASSET_ROOT}/side-pathfinder-command-body.png`,
    gameFrontWheelSrc: `${ROVER_ASSET_ROOT}/side-pathfinder-command-front-wheel.png`,
    gameBackWheelSrc: `${ROVER_ASSET_ROOT}/side-pathfinder-command-back-wheel.png`,
    gameMode: "wheeled",
    accent: "#60f0d0",
    gameStats: {
      normalSpeed: 9.8,
      boostSpeed: 13.5,
      accelerationRate: 7.8,
      brakingRate: 9.2,
      jumpVelocity: -10.8,
      boostCapacity: 95,
      boostDrainRate: 13,
      boostRechargeRate: 19,
      airTiltStrength: 0.016,
      crashPenaltyMultiplier: 0.8,
      trapPenaltyMultiplier: 0.9,
    },
  },
  {
    stage: 3,
    roverNumber: 4,
    slug: "turbo-striker",
    priceDt: 625,
    name: "Turbo Striker",
    shortName: "Striker",
    description:
      "A sleek high-speed rover with twin turbo assemblies, a low aerodynamic profile and major gains in speed and jump power.",
    imageSrc: `${ROVER_ASSET_ROOT}/turbo-striker.png`,
    gameBodySrc: `${ROVER_ASSET_ROOT}/side-turbo-striker-body.png`,
    gameFrontWheelSrc: `${ROVER_ASSET_ROOT}/side-turbo-striker-front-wheel.png`,
    gameBackWheelSrc: `${ROVER_ASSET_ROOT}/side-turbo-striker-back-wheel.png`,
    gameMode: "wheeled",
    accent: "#8da2ff",
    gameStats: {
      normalSpeed: 13.5,
      boostSpeed: 19,
      accelerationRate: 9.2,
      brakingRate: 8.2,
      jumpVelocity: -13.2,
      boostCapacity: 110,
      boostDrainRate: 11.5,
      boostRechargeRate: 20,
      airTiltStrength: 0.021,
      crashPenaltyMultiplier: 1,
      trapPenaltyMultiplier: 1,
    },
  },
  {
    stage: 4,
    roverNumber: 5,
    slug: "aegis-defender",
    priceDt: 1560,
    name: "Aegis Defender",
    shortName: "Aegis",
    description:
      "A heavily armoured expedition rover designed to absorb punishment from crashes, traps and hostile course hazards.",
    imageSrc: `${ROVER_ASSET_ROOT}/aegis-defender.png`,
    gameBodySrc: `${ROVER_ASSET_ROOT}/side-aegis-defender-body.png`,
    gameFrontWheelSrc: `${ROVER_ASSET_ROOT}/side-aegis-defender-front-wheel.png`,
    gameBackWheelSrc: `${ROVER_ASSET_ROOT}/side-aegis-defender-back-wheel.png`,
    gameMode: "wheeled",
    accent: "#ff9df0",
    gameStats: {
      normalSpeed: 9.3,
      boostSpeed: 12.8,
      accelerationRate: 6.6,
      brakingRate: 8.8,
      jumpVelocity: -9.2,
      boostCapacity: 105,
      boostDrainRate: 12.5,
      boostRechargeRate: 19,
      airTiltStrength: 0.01,
      crashPenaltyMultiplier: 0.55,
      trapPenaltyMultiplier: 0.55,
    },
  },
  {
    stage: 5,
    roverNumber: 6,
    slug: "nova-hover-x",
    priceDt: 3900,
    name: "Nova Hover X",
    shortName: "Hover X",
    description:
      "The ultimate Skyforge vehicle: a high-output hover rover combining advanced propulsion, maximum aerial control and protective systems.",
    imageSrc: `${ROVER_ASSET_ROOT}/nova-hover-x.png`,
    gameBodySrc: `${ROVER_ASSET_ROOT}/side-nova-hover-x.png`,
    gameFrontWheelSrc: null,
    gameBackWheelSrc: null,
    gameMode: "hover",
    accent: "#53d7ff",
    gameStats: {
      normalSpeed: 14,
      boostSpeed: 20,
      accelerationRate: 9.4,
      brakingRate: 9.4,
      jumpVelocity: -14.5,
      boostCapacity: 130,
      boostDrainRate: 10,
      boostRechargeRate: 23,
      airTiltStrength: 0.025,
      crashPenaltyMultiplier: 0.7,
      trapPenaltyMultiplier: 0.7,
    },
  },
];

export function getCoreRoverByStage(stage: number) {
  const normalisedStage = Math.min(
    coreUpgradeTrack.length - 1,
    Math.max(0, Math.floor(Number(stage) || 0)),
  );

  return (
    coreUpgradeTrack.find((upgrade) => upgrade.stage === normalisedStage) ??
    coreUpgradeTrack[0]
  );
}

export function getCurrentCoreRoverUpgrade(stage: number) {
  return getCoreRoverByStage(stage);
}

export function getNextCoreRoverUpgrade(stage: number) {
  const current = getCoreRoverByStage(stage);

  return coreUpgradeTrack.find(
    (upgrade) => upgrade.stage === current.stage + 1,
  );
}

export function getCoreRoverProgress(stage: number) {
  const currentUpgrade = getCoreRoverByStage(stage);
  const nextUpgrade = getNextCoreRoverUpgrade(currentUpgrade.stage);
  const finalUpgrade = coreUpgradeTrack[coreUpgradeTrack.length - 1];

  return {
    currentUpgrade,
    nextUpgrade,
    progressPercentage: nextUpgrade ? 0 : 100,
    isComplete: !nextUpgrade,
    finalUpgrade,
    missionsToNext: 0,
  };
}
