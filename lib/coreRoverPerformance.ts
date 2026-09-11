import type { CoreRoverGameStats } from "@/lib/coreRoverProgress";

export type RoverPerformanceCategory =
  | "engine"
  | "traction"
  | "stability"
  | "suspension"
  | "energy";

export type RoverPerformanceLevels = Record<RoverPerformanceCategory, number>;

export type RoverPerformanceRatings = {
  speed: number;
  handling: number;
  balance: number;
  airMobility: number;
  boost: number;
};

export type RoverPerformanceBuildRow = {
  selected_stage: number;
  rover_number: number;
  rover_name: string;
  category: RoverPerformanceCategory;
  category_title: string;
  base_rating: number;
  current_level: number;
  current_rating: number;
  max_useful_level: number;
  next_level: number | null;
  next_name: string | null;
  next_description: string | null;
  next_price_dt: number | null;
  next_rating: number | null;
  can_purchase: boolean;
  can_afford: boolean;
  dt_balance: number;
  admin_access: boolean;
};

export type RoverPerformancePurchaseRow = {
  success: boolean;
  rover_stage: number;
  category: RoverPerformanceCategory;
  purchased_level: number;
  upgrade_name: string;
  dt_cost: number;
  new_balance: number;
  transaction_id: string | null;
  result_message: string;
};

export type RoverPerformanceTier = {
  level: number;
  name: string;
  description: string;
  priceDt: number;
  imageSrc?: string;
};

export type RoverPerformanceCategoryConfig = {
  id: RoverPerformanceCategory;
  title: string;
  statLabel: keyof RoverPerformanceRatings;
  shortDescription: string;
  effectSummary: string;
  tiers: RoverPerformanceTier[];
};

const PRICE_BY_LEVEL = [50, 100, 200, 400, 800] as const;

const ROVER_CUSTOM_BUILD_ASSET_ROOT =
  "/activities/learning-missions/core/rover/custom-build";

export const roverPerformanceCategories: RoverPerformanceCategoryConfig[] = [
  {
    id: "engine",
    title: "Engine",
    statLabel: "speed",
    shortDescription:
      "Higher-output engines increase sustained speed and acceleration.",
    effectSummary: "Speed · Acceleration · Small boost-speed gain",
    tiers: [
      {
        level: 1,
        name: "SparkDrive Engine",
        description:
          "Compact high-efficiency performance engine for a sharper first step.",
        priceDt: PRICE_BY_LEVEL[0],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/engine/sparkdrive-engine.png`,
      },
      {
        level: 2,
        name: "Twin Ion Engine",
        description:
          "Twin performance units deliver stronger sustained propulsion and response.",
        priceDt: PRICE_BY_LEVEL[1],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/engine/twin-ion-engine.png`,
      },
      {
        level: 3,
        name: "Pulse Turbine",
        description:
          "A turbine-assisted performance engine keeps power delivery strong under load.",
        priceDt: PRICE_BY_LEVEL[2],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/engine/pulse-turbine.png`,
      },
      {
        level: 4,
        name: "Vector Fusion Engine",
        description:
          "A high-output fusion drivetrain pushes the rover toward elite speed.",
        priceDt: PRICE_BY_LEVEL[3],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/engine/vector-fusion-engine.png`,
      },
      {
        level: 5,
        name: "Nova Flux Engine",
        description:
          "Skyforge's ultimate high-performance rover engine.",
        priceDt: PRICE_BY_LEVEL[4],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/engine/nova-flux-engine.png`,
      },
    ],
  },
  {
    id: "traction",
    title: "Traction System",
    statLabel: "handling",
    shortDescription:
      "Improves braking, terrain grip, slope response and road alignment.",
    effectSummary: "Handling · Braking · Uphill grip",
    tiers: [
      {
        level: 1,
        name: "Grip Controller",
        description:
          "Compact electronic drivetrain controller that improves torque delivery and basic grip.",
        priceDt: PRICE_BY_LEVEL[0],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/traction/grip-controller.png`,
      },
      {
        level: 2,
        name: "Terrain Vectoring Unit",
        description:
          "Active torque-vectoring hardware distributes drive response across uneven terrain.",
        priceDt: PRICE_BY_LEVEL[1],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/traction/terrain-vectoring-unit.png`,
      },
      {
        level: 3,
        name: "Adaptive Traction System",
        description:
          "Integrated traction and suspension control responds rapidly to changing gradients.",
        priceDt: PRICE_BY_LEVEL[2],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/traction/adaptive-traction-system.png`,
      },
      {
        level: 4,
        name: "Quantum Steering Matrix",
        description:
          "Advanced steer-by-wire control delivers precise correction at high speed.",
        priceDt: PRICE_BY_LEVEL[3],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/traction/quantum-steering-matrix.png`,
      },
      {
        level: 5,
        name: "Nova Precision Array",
        description:
          "Ultimate integrated steering and torque-vectoring system for maximum course control.",
        priceDt: PRICE_BY_LEVEL[4],
        imageSrc: `${ROVER_CUSTOM_BUILD_ASSET_ROOT}/traction/nova-precision-array.png`,
      },
    ],
  },
  {
    id: "stability",
    title: "Stability Core",
    statLabel: "balance",
    shortDescription: "Keeps the chassis composed through landings, impacts and steep terrain.",
    effectSummary: "Balance · Landing tolerance · Overturn resistance",
    tiers: [
      ["Gyro Module", "Adds basic inertial correction during rough course transitions."],
      ["Dual Gyro", "Two-axis stabilisation reduces unwanted chassis rotation."],
      ["Stability Matrix", "Predictive control steadies landings before wheel contact."],
      ["Aegis Stabiliser", "Heavy-duty stabilisation for severe impacts and gradients."],
      ["Inertial Anchor", "Maximum active balance control for the Skyforge platform."],
    ].map(([name, description], index) => ({
      level: index + 1,
      name,
      description,
      priceDt: PRICE_BY_LEVEL[index],
    })),
  },
  {
    id: "suspension",
    title: "Suspension / Lift",
    statLabel: "airMobility",
    shortDescription: "Improves jump response, aerial control and landing compliance.",
    effectSummary: "Air Mobility · Jump · Mid-air control",
    tiers: [
      ["Flex Suspension", "Improves travel and gives the rover a cleaner take-off."],
      ["Launch Suspension", "Stores and releases more energy during jump initiation."],
      ["Aero Struts", "Combines suspension travel with stronger aerial correction."],
      ["Gravity Dampers", "Reduces instability through hard transitions and landings."],
      ["Skyforge Lift System", "Maximum jump and aerial-control package for wheeled rovers."],
    ].map(([name, description], index) => ({
      level: index + 1,
      name,
      description,
      priceDt: PRICE_BY_LEVEL[index],
    })),
  },
  {
    id: "energy",
    title: "Energy System",
    statLabel: "boost",
    shortDescription: "Expands boost reserves while improving recharge and power delivery.",
    effectSummary: "Boost · Capacity · Recharge · Efficiency",
    tiers: [
      ["Boost Cell", "Adds a compact reserve cell for longer boost bursts."],
      ["Dual Cell", "Pairs energy cells to improve capacity and recharge."],
      ["Pulse Capacitor", "Stores high-output energy with lower sustained drain."],
      ["Flux Battery", "Large-capacity power unit for repeated high-speed boosts."],
      ["Nova Energy Core", "Maximum Skyforge boost capacity and regeneration."],
    ].map(([name, description], index) => ({
      level: index + 1,
      name,
      description,
      priceDt: PRICE_BY_LEVEL[index],
    })),
  },
];

export const roverBaseRatingsByStage: Record<number, RoverPerformanceRatings> = {
  0: { speed: 50, handling: 78, balance: 62, airMobility: 72, boost: 48 },
  1: { speed: 74, handling: 63, balance: 54, airMobility: 64, boost: 76 },
  2: { speed: 62, handling: 90, balance: 82, airMobility: 60, boost: 66 },
  3: { speed: 92, handling: 72, balance: 58, airMobility: 80, boost: 92 },
  4: { speed: 54, handling: 60, balance: 100, airMobility: 38, boost: 60 },
  5: { speed: 96, handling: 88, balance: 86, airMobility: 100, boost: 96 },
};

export const emptyRoverPerformanceLevels: RoverPerformanceLevels = {
  engine: 0,
  traction: 0,
  stability: 0,
  suspension: 0,
  energy: 0,
};

export function getRoverBaseRatings(stage: number): RoverPerformanceRatings {
  return roverBaseRatingsByStage[stage] ?? roverBaseRatingsByStage[0];
}

export function getMaxUsefulPerformanceLevel(baseRating: number) {
  if (baseRating >= 100) return 0;
  return Math.min(5, Math.max(0, Math.ceil((100 - baseRating) / 4)));
}

export function performanceLevelsFromRows(
  rows: RoverPerformanceBuildRow[],
): RoverPerformanceLevels {
  const levels = { ...emptyRoverPerformanceLevels };

  for (const row of rows) {
    if (row.category in levels) {
      levels[row.category] = Math.max(0, Math.min(5, Number(row.current_level) || 0));
    }
  }

  return levels;
}

export function getEffectiveRoverRatings(
  stage: number,
  levels: RoverPerformanceLevels,
): RoverPerformanceRatings {
  const base = getRoverBaseRatings(stage);

  return {
    speed: Math.min(100, base.speed + levels.engine * 4),
    handling: Math.min(100, base.handling + levels.traction * 4),
    balance: Math.min(100, base.balance + levels.stability * 4),
    airMobility: Math.min(100, base.airMobility + levels.suspension * 4),
    boost: Math.min(100, base.boost + levels.energy * 4),
  };
}

export function applyRoverPerformanceUpgrades(
  baseStats: CoreRoverGameStats,
  levels: RoverPerformanceLevels,
): CoreRoverGameStats {
  const engine = Math.max(0, Math.min(5, levels.engine));
  const traction = Math.max(0, Math.min(5, levels.traction));
  const stability = Math.max(0, Math.min(5, levels.stability));
  const suspension = Math.max(0, Math.min(5, levels.suspension));
  const energy = Math.max(0, Math.min(5, levels.energy));

  return {
    ...baseStats,
    normalSpeed: baseStats.normalSpeed * (1 + engine * 0.025),
    boostSpeed:
      baseStats.boostSpeed *
      (1 + engine * 0.012) *
      (1 + energy * 0.025),
    accelerationRate:
      baseStats.accelerationRate *
      (1 + engine * 0.03) *
      (1 + traction * 0.015),
    brakingRate: baseStats.brakingRate * (1 + traction * 0.04),
    jumpVelocity:
      baseStats.jumpVelocity < 0
        ? baseStats.jumpVelocity * (1 + suspension * 0.025)
        : baseStats.jumpVelocity,
    boostCapacity: baseStats.boostCapacity * (1 + energy * 0.07),
    boostDrainRate: Math.max(
      baseStats.boostDrainRate * 0.72,
      baseStats.boostDrainRate * (1 - energy * 0.04),
    ),
    boostRechargeRate:
      baseStats.boostRechargeRate * (1 + energy * 0.07),
    airTiltStrength: baseStats.airTiltStrength * (1 + suspension * 0.05),
    crashPenaltyMultiplier: Math.max(
      0.45,
      (baseStats.crashPenaltyMultiplier ?? 1) * (1 - stability * 0.04),
    ),
    trapPenaltyMultiplier: baseStats.trapPenaltyMultiplier ?? 1,
    groundAlignmentMultiplier: 1 + traction * 0.05,
    slopeAssistMultiplier: 1 + traction * 0.06,
    landingToleranceMultiplier:
      (1 + stability * 0.05) * (1 + suspension * 0.025),
    overturnToleranceMultiplier: 1 + stability * 0.04,
  };
}
