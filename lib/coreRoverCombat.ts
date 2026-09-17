export type CoreRoverCombatStats = {
  maxHp: number;
  maxShield: number;

  /**
   * Phase 5E combat identity.
   *
   * hullDamageMultiplier applies only after the shield has been depleted.
   * 1.00 = normal hull damage
   * 0.78 = 22% hull damage reduction
   * 1.05 = 5% additional hull damage
   */
  combatRole: string;
  combatTrait: string;
  hullDamageMultiplier: number;

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

type CoreRoverCombatProfile = {
  maxHp: number;
  maxShield: number;
  combatRole: string;
  combatTrait: string;
  hullDamageMultiplier: number;
  shieldRegenDelayMs: number;
  shieldRegenFractionPerSecond: number;
};

const COMBAT_BY_STAGE: Record<number, CoreRoverCombatProfile> = {
  0: {
    // Rover 1 · Scout Buggy
    maxHp: 750,
    maxShield: 250,
    combatRole: "RECON SKIRMISHER",
    combatTrait: "FAST SHIELD RECOVERY",
    hullDamageMultiplier: 1,
    shieldRegenDelayMs: 3400,
    shieldRegenFractionPerSecond: 0.1,
  },

  1: {
    // Rover 2 · Ignition Runner
    maxHp: 800,
    maxShield: 300,
    combatRole: "ASSAULT RUNNER",
    combatTrait: "MOBILE ATTACK PLATFORM",
    hullDamageMultiplier: 0.98,
    shieldRegenDelayMs: 3700,
    shieldRegenFractionPerSecond: 0.09,
  },

  2: {
    // Rover 3 · Pathfinder Command
    maxHp: 850,
    maxShield: 400,
    combatRole: "TACTICAL ALL-ROUNDER",
    combatTrait: "BALANCED ARMOUR + SHIELD",
    hullDamageMultiplier: 0.92,
    shieldRegenDelayMs: 3900,
    shieldRegenFractionPerSecond: 0.085,
  },

  3: {
    // Rover 4 · Turbo Striker
    maxHp: 780,
    maxShield: 350,
    combatRole: "GLASS CANNON",
    combatTrait: "HIGH PERFORMANCE · LIGHT ARMOUR",
    hullDamageMultiplier: 1.05,
    shieldRegenDelayMs: 3500,
    shieldRegenFractionPerSecond: 0.085,
  },

  4: {
    // Rover 5 · Aegis Defender
    maxHp: 1200,
    maxShield: 600,
    combatRole: "HEAVY TANK",
    combatTrait: "22% HULL DAMAGE REDUCTION",
    hullDamageMultiplier: 0.78,
    shieldRegenDelayMs: 4400,
    shieldRegenFractionPerSecond: 0.065,
  },

  5: {
    // Rover 6 · Nova Hover X
    maxHp: 950,
    maxShield: 700,
    combatRole: "SHIELD VANGUARD",
    combatTrait: "FASTEST SHIELD RECHARGE",
    hullDamageMultiplier: 0.9,
    shieldRegenDelayMs: 3000,
    shieldRegenFractionPerSecond: 0.11,
  },
};

export function getCoreRoverCombatStats(
  roverStage: number,
): CoreRoverCombatStats {
  const resolved =
    COMBAT_BY_STAGE[roverStage] ??
    COMBAT_BY_STAGE[0];

  return {
    maxHp: resolved.maxHp,
    maxShield: resolved.maxShield,
    combatRole: resolved.combatRole,
    combatTrait: resolved.combatTrait,
    hullDamageMultiplier: resolved.hullDamageMultiplier,
    shieldRegenDelayMs: resolved.shieldRegenDelayMs,
    shieldRegenPerSecond:
      resolved.maxShield *
      resolved.shieldRegenFractionPerSecond,
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
    projectileSpeed: 780,
    projectileLifetimeMs: 3600,
    projectileWidth: 68,
    blastRadius: 86,

    // Moderate lock and steering. This missile tracks one target only.
    trackingStrength: 0.62,
    burstCount: 1,
    burstIntervalMs: 0,
    guidanceRange: 1350,
    lockConeDegrees: 105,
    turnRateRadPerSecond: 2.35,
    canReacquireTarget: false,
  },
  5: {
    level: 5,
    name: "Nova Homing Missile System",
    projectileType: "homing",
    damage: 190,
    fireCooldownMs: 1200,
    projectileSpeed: 760,
    projectileLifetimeMs: 5200,
    projectileWidth: 76,
    blastRadius: 112,

    // Strong pursuit with a very wide lock cone and target reacquisition.
    trackingStrength: 1,
    burstCount: 1,
    burstIntervalMs: 0,
    guidanceRange: 2100,
    lockConeDegrees: 300,
    turnRateRadPerSecond: 5.4,
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

  /**
   * Phase 5F balancing.
   * The three course sections scale incoming Bone Guard damage gradually.
   */
  blasterDamage: number;
  phaseDamageMultipliers: readonly [number, number, number];
  aimSpreadRadians: number;

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
  moveSpeed: 210,
  stopRange: 610,

  // Base hit = 52.
  // Approach = 44, Fracture Pass = 52, Portal Assault = 57.
  blasterDamage: 52,
  phaseDamageMultipliers: [0.85, 1, 1.1],
  aimSpreadRadians: 0.045,

  fireCooldownMs: 1600,
  blasterSpeed: 500,
  blasterLifetimeMs: 3000,
  waveSize: 7,
  spawnIntervalMs: 2600,
  maximumAlive: 3,
  defeatScore: 250,
};
