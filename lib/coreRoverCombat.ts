export type CoreRoverCombatStats = {
  maxHp: number;
  maxShield: number;
  shieldRegenDelayMs: number;
  shieldRegenPerSecond: number;
};

export type RoverWeaponProjectileType =
  | "bullet"
  | "heavy-round"
  | "rocket"
  | "guided"
  | "homing";

export type CoreRoverWeaponSpec = {
  level: number;
  name: string;
  projectileType: RoverWeaponProjectileType;
  damage: number;
  fireCooldownMs: number;
  projectileSpeed: number;
  projectileLifetimeMs: number;
  projectileWidth: number;
  blastRadius: number;
  trackingStrength: number;

  burstCount: number;
  burstIntervalMs: number;
  guidanceRange: number;
  lockConeDegrees: number;
  turnRateRadPerSecond: number;
  canReacquireTarget: boolean;
};

const BASE_REGEN_DELAY_MS = 4000;
const BASE_REGEN_FRACTION_PER_SECOND = 0.08;

const COMBAT_BY_STAGE: Record<
  number,
  { maxHp: number; maxShield: number }
> = {
  0: { maxHp: 750, maxShield: 250 }, // Scout Buggy
  1: { maxHp: 800, maxShield: 300 }, // Ignition Runner
  2: { maxHp: 850, maxShield: 400 }, // Pathfinder Command
  3: { maxHp: 780, maxShield: 350 }, // Turbo Striker
  4: { maxHp: 1200, maxShield: 600 }, // Aegis Defender
  5: { maxHp: 950, maxShield: 700 }, // Nova Hover X
};

export function getCoreRoverCombatStats(
  roverStage: number,
): CoreRoverCombatStats {
  const resolved = COMBAT_BY_STAGE[roverStage] ?? COMBAT_BY_STAGE[0];

  return {
    maxHp: resolved.maxHp,
    maxShield: resolved.maxShield,
    shieldRegenDelayMs: BASE_REGEN_DELAY_MS,
    shieldRegenPerSecond:
      resolved.maxShield * BASE_REGEN_FRACTION_PER_SECOND,
  };
}

export const roverWeaponSpecs: Record<number, CoreRoverWeaponSpec> = {
  1: {
    level: 1,
    name: "Skyforge Machine Gun",
    projectileType: "bullet",
    damage: 16,
    fireCooldownMs: 105,
    projectileSpeed: 1200,
    projectileLifetimeMs: 1500,
    projectileWidth: 32,
    blastRadius: 0,
    trackingStrength: 0,
    burstCount: 1,
    burstIntervalMs: 0,
    guidanceRange: 0,
    lockConeDegrees: 0,
    turnRateRadPerSecond: 0,
    canReacquireTarget: false,
  },
  2: {
    level: 2,
    name: "Twin Autocannon",
    projectileType: "heavy-round",
    damage: 42,
    fireCooldownMs: 240,
    projectileSpeed: 1050,
    projectileLifetimeMs: 1800,
    projectileWidth: 44,
    blastRadius: 0,
    trackingStrength: 0,
    burstCount: 1,
    burstIntervalMs: 0,
    guidanceRange: 0,
    lockConeDegrees: 0,
    turnRateRadPerSecond: 0,
    canReacquireTarget: false,
  },
  3: {
    level: 3,
    name: "Micro-Rocket Pod",
    projectileType: "rocket",
    damage: 65,
    fireCooldownMs: 850,
    projectileSpeed: 820,
    projectileLifetimeMs: 2500,
    projectileWidth: 58,
    blastRadius: 60,
    trackingStrength: 0,
    burstCount: 3,
    burstIntervalMs: 125,
    guidanceRange: 0,
    lockConeDegrees: 0,
    turnRateRadPerSecond: 0,
    canReacquireTarget: false,
  },
  4: {
    level: 4,
    name: "Seeker Missile Rack",
    projectileType: "guided",
    damage: 125,
    fireCooldownMs: 850,
    projectileSpeed: 760,
    projectileLifetimeMs: 3200,
    projectileWidth: 68,
    blastRadius: 82,
    trackingStrength: 0.04,
    burstCount: 1,
    burstIntervalMs: 0,
    guidanceRange: 1120,
    lockConeDegrees: 58,
    turnRateRadPerSecond: 1.25,
    canReacquireTarget: false,
  },
  5: {
    level: 5,
    name: "Nova Homing Missile System",
    projectileType: "homing",
    damage: 190,
    fireCooldownMs: 1200,
    projectileSpeed: 720,
    projectileLifetimeMs: 4200,
    projectileWidth: 76,
    blastRadius: 105,
    trackingStrength: 0.1,
    burstCount: 1,
    burstIntervalMs: 0,
    guidanceRange: 1700,
    lockConeDegrees: 165,
    turnRateRadPerSecond: 3.0,
    canReacquireTarget: true,
  },
};

export function getCoreRoverWeaponSpec(
  weaponLevel: number,
): CoreRoverWeaponSpec | null {
  const level = Math.max(0, Math.min(5, Math.floor(weaponLevel || 0)));
  return roverWeaponSpecs[level] ?? null;
}


export type BoneGuardCombatSpec = {
  maxHp: number;
  moveSpeed: number;
  stopRange: number;
  blasterDamage: number;
  fireCooldownMs: number;
  blasterSpeed: number;
  blasterLifetimeMs: number;
  waveSize: number;
  spawnIntervalMs: number;
  maximumAlive: number;
  defeatScore: number;
};

export const boneGuardCombatSpec: BoneGuardCombatSpec = {
  maxHp: 180,
  moveSpeed: 118,
  stopRange: 560,
  blasterDamage: 60,
  fireCooldownMs: 1450,
  blasterSpeed: 520,
  blasterLifetimeMs: 2800,
  waveSize: 5,
  spawnIntervalMs: 3400,
  maximumAlive: 3,
  defeatScore: 250,
};
