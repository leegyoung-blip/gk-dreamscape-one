"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import type { CoreRoverGameStats } from "@/lib/coreRoverProgress";
import {
  boneGuardCombatSpec,
  getCoreRoverWeaponSpec,
  type CoreRoverCombatStats,
  type CoreRoverWeaponSpec,
} from "@/lib/coreRoverCombat";
import type { RoverLevelConfig } from "./levels";
import type { RoverTrap } from "./levels/types";

const GAME_WIDTH = 1600;
const GAME_HEIGHT = 900;

const ROVER_BODY_WIDTH = 300;
const ROVER_BODY_HEIGHT = 188;

const ROVER_COLLISION_WIDTH = 238;
const ROVER_COLLISION_HEIGHT = 82;

/*
 * Rover rendering uses the user's full-canvas exports.
 *
 * WHEELED ROVERS
 * - body PNG: full original transparent canvas, wheels removed
 * - front wheel PNG: SAME canvas size/position, only the front wheel visible
 * - back wheel PNG: SAME canvas size/position, only the back wheel visible
 *
 * Phaser scans the alpha bounds of each wheel layer at runtime. This gives us
 * the actual wheel centre and bottom edge without hard-coded wheel coordinates.
 * Each wheel layer is then pivoted around its own detected centre and rotated.
 * The entire visual assembly is vertically shifted so the wheel bottoms sit on
 * the invisible Matter chassis road-contact line.
 *
 * NOVA HOVER X
 * Uses one complete side-nova-hover-x.png and no wheel layers. Its visible
 * vehicle is lifted above the road-contact line and given a subtle hover bob.
 */
type RoverVisualLayout = {
  bodyMaxWidth: number;
  bodyMaxHeight: number;
};

const ROVER_VISUAL_LAYOUT: Record<number, RoverVisualLayout> = {
  0: { bodyMaxWidth: 300, bodyMaxHeight: 188 }, // Scout Buggy
  1: { bodyMaxWidth: 320, bodyMaxHeight: 188 }, // Ignition Runner
  2: { bodyMaxWidth: 330, bodyMaxHeight: 205 }, // Pathfinder Command
  3: { bodyMaxWidth: 330, bodyMaxHeight: 188 }, // Turbo Striker
  4: { bodyMaxWidth: 325, bodyMaxHeight: 192 }, // Aegis Defender
  5: { bodyMaxWidth: 330, bodyMaxHeight: 195 }, // Nova Hover X
};

const WHEEL_ALPHA_THRESHOLD = 24;
const ROAD_CONTACT_VISUAL_OFFSET = -1;
const HOVER_CLEARANCE = 48;
const HOVER_BOB_AMOUNT = 4;
const HOVER_BOB_SPEED = 0.0042;

/*
 * Stage 5 weapon preparation.
 *
 * The garage now stores a per-rover weapon tier. Expeditions 1–4 do not fire
 * these projectiles yet, but Phaser already resolves and loads the equipped
 * tier's side-view ammunition texture. Stage 5 can therefore spawn
 * "selected-rover-ammo" without changing the asset pipeline again.
 */
const ROVER_AMMO_ASSET_ROOT =
  "/activities/learning-missions/core/rover/custom-build/weapons/ammo";

const BONE_GUARD_SPRITE_SRC =
  "/activities/learning-missions/core/rover/enemies/bone-guard/bone-guard-spritesheet.png";
const BONE_GUARD_FRAME_SIZE = 362;
const BONE_GUARD_DISPLAY_HEIGHT = 132;
const BONE_GUARD_BLASTER_TEXTURE = "bone-guard-blaster-bolt";

type RoverAmmoAsset = {
  level: number;
  name: string;
  projectileType: "bullet" | "heavy-round" | "rocket" | "guided" | "homing";
  src: string;
  textureKey: string;
};

const ROVER_AMMO_BY_LEVEL: Record<number, RoverAmmoAsset> = {
  1: {
    level: 1,
    name: "Machine Gun Round",
    projectileType: "bullet",
    src: `${ROVER_AMMO_ASSET_ROOT}/machine-gun-round.png`,
    textureKey: "rover-ammo-tier-1",
  },
  2: {
    level: 2,
    name: "Autocannon Round",
    projectileType: "heavy-round",
    src: `${ROVER_AMMO_ASSET_ROOT}/autocannon-round.png`,
    textureKey: "rover-ammo-tier-2",
  },
  3: {
    level: 3,
    name: "Micro Rocket",
    projectileType: "rocket",
    src: `${ROVER_AMMO_ASSET_ROOT}/micro-rocket.png`,
    textureKey: "rover-ammo-tier-3",
  },
  4: {
    level: 4,
    name: "Seeker Missile",
    projectileType: "guided",
    src: `${ROVER_AMMO_ASSET_ROOT}/seeker-missile.png`,
    textureKey: "rover-ammo-tier-4",
  },
  5: {
    level: 5,
    name: "Nova Homing Missile",
    projectileType: "homing",
    src: `${ROVER_AMMO_ASSET_ROOT}/nova-homing-missile.png`,
    textureKey: "rover-ammo-tier-5",
  },
};

type OpaqueBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
};

type WheelVisualItem = {
  sprite: Phaser.GameObjects.Image;
  localX: number;
  localY: number;
};

export type PhaserGameProps = {
  levelConfig: RoverLevelWithPulseGates;
  roverStage: number;
  roverName: string;
  roverBodySrc: string;
  roverFrontWheelSrc: string | null;
  roverBackWheelSrc: string | null;
  roverGameMode: "wheeled" | "hover";
  weaponLevel: number;
  combatMode: boolean;
  combatStats: CoreRoverCombatStats;
  gameStats: CoreRoverGameStats;
};

type CollectibleItem = {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  glow: Phaser.GameObjects.Arc;
  orb: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
};

type CheckpointItem = {
  id: number;
  x: number;
  y: number;
  respawnX: number;
  respawnY: number;
  reached: boolean;
  light: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type TouchButton = {
  background: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type CombatProjectile = {
  sprite: Phaser.GameObjects.Image;
  velocityX: number;
  velocityY: number;
  speed: number;
  expiresAt: number;
  damage: number;
  projectileType: CoreRoverWeaponSpec["projectileType"];
  blastRadius: number;
  trackingStrength: number;
  targetGuardId: number | null;
  guidanceRange: number;
  turnRateRadPerSecond: number;
  canReacquireTarget: boolean;
  nextTrailAt: number;
};

type BoneGuardState =
  | "walking"
  | "firing"
  | "hit"
  | "dying"
  | "dead";

type BoneGuardEnemy = {
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  hp: number;
  maxHp: number;
  state: BoneGuardState;
  surfaceY: number;
  lastFireAt: number;

  /**
   * 1 = Approach
   * 2 = Fracture Pass
   * 3 = Portal Assault
   *
   * Damage is locked to the phase in which the guard spawned, so an existing
   * guard does not suddenly become stronger just because Nova crosses a later
   * course threshold.
   */
  spawnPhase: 1 | 2 | 3;

  /**
   * Once true, the guard reached the end of the current blue zone and must
   * remain there instead of stepping onto orange/collapsing terrain.
   */
  terrainBlocked: boolean;

  healthBackground: Phaser.GameObjects.Rectangle;
  healthFill: Phaser.GameObjects.Rectangle;
};

type BoneGuardBlasterProjectile = {
  sprite: Phaser.GameObjects.Image;
  velocityX: number;
  velocityY: number;
  expiresAt: number;
  damage: number;
};

type TrapItem = Omit<RoverTrap, "y"> & {
  y: number;
  armed: boolean;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
};

export type PulseGateConfig = {
  id: string;
  x: number;
  /** Approximate terrain y used to select the intended route surface. */
  y?: number;
  /** Beam height in world pixels. Corridor gates use ~500; bypass gates can be shorter. */
  height?: number;
  activeMs: number;
  safeMs: number;
  phaseOffsetMs?: number;
  penalty: number;
};

type RoverLevelWithPulseGates = RoverLevelConfig & {
  pulseGates?: PulseGateConfig[];
};

type PulseGateItem = PulseGateConfig & {
  surfaceY: number;
  topY: number;
  active: boolean;
  glowBeam: Phaser.GameObjects.Rectangle;
  beam: Phaser.GameObjects.Rectangle;
  topNode: Phaser.GameObjects.Arc;
  baseNode: Phaser.GameObjects.Arc;
  statusText: Phaser.GameObjects.Text;
};

type CollapsibleTerrainItem = {
  sampledPoints: Array<{ x: number; y: number }>;
  terrainThickness: number;
  collapseDelayMs: number;
  collapseTriggerRadius: number;
  triggered: boolean;
  collapsed: boolean;
  bodies: MatterJS.BodyType[];
  fill: Phaser.GameObjects.Graphics;
  surfaceGlow: Phaser.GameObjects.Graphics;
  surface: Phaser.GameObjects.Graphics;
  warningGlow: Phaser.GameObjects.Graphics;
  collapseTimer?: Phaser.Time.TimerEvent;
};

class RoverMatterScene extends Phaser.Scene {
  private backgroundTile?: Phaser.GameObjects.TileSprite;
  private roverBody?: Phaser.Physics.Matter.Image;
  private roverBodyVisual?: Phaser.GameObjects.Image;
  private roverWheelVisuals: WheelVisualItem[] = [];
  private wheelSpin = 0;
  private roverBodyDisplayWidth = ROVER_BODY_WIDTH;
  private roverBodyDisplayHeight = ROVER_BODY_HEIGHT;
  private roverVisualOffsetY = 0;

  private terrainSections: Array<Array<{ x: number; y: number }>> = [];

  /**
   * Bone Guards only walk on permanent blue terrain.
   * Unstable/orange sections are excluded from enemy navigation.
   */
  private boneGuardTerrainSections: Array<
    Array<{ x: number; y: number }>
  > = [];

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyR?: Phaser.Input.Keyboard.Key;
  private boostKey?: Phaser.Input.Keyboard.Key;
  private fireKey?: Phaser.Input.Keyboard.Key;

  private touchLeft = false;
  private touchRight = false;
  private touchBoost = false;
  private touchFire = false;

  private speedText?: Phaser.GameObjects.Text;
  private distanceText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private collectibleText?: Phaser.GameObjects.Text;
  private checkpointText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private roverStageText?: Phaser.GameObjects.Text;
  private boostText?: Phaser.GameObjects.Text;
  private boostBarFill?: Phaser.GameObjects.Rectangle;

  private combatShieldText?: Phaser.GameObjects.Text;
  private combatHpText?: Phaser.GameObjects.Text;
  private combatRoleText?: Phaser.GameObjects.Text;
  private combatWeaponText?: Phaser.GameObjects.Text;
  private combatShieldBarFill?: Phaser.GameObjects.Rectangle;
  private combatHpBarFill?: Phaser.GameObjects.Rectangle;

  private collectibles: CollectibleItem[] = [];
  private checkpoints: CheckpointItem[] = [];
  private traps: TrapItem[] = [];
  private pulseGates: PulseGateItem[] = [];
  private collapsibleTerrain: CollapsibleTerrainItem[] = [];
  private trapCollisionLocked = false;

  private boostEnergy = 60;
  private maximumBoostEnergy = 60;
  private boostDrainRate = 15;
  private boostRechargeRate = 14;

  private score = 0;
  private distanceScore = 0;
  private collectibleScore = 0;
  private checkpointScore = 0;
  private completionScore = 0;
  private timeBonus = 0;
  private crashPenalty = 0;

  private collectedCount = 0;
  private reachedCheckpointCount = 0;

  private elapsedSeconds = 0;
  private hasStarted = false;
  private hasFinished = false;

  private latestCheckpointX = 0;
  private latestCheckpointY = 0;

  private activeTerrainContacts = new Set<string>();
  private maximumAirborneDownwardVelocity = 0;
  private airborneTime = 0;
  private overturnedTime = 0;
  private lastJumpAt = -1000;
  private restartRequested = false;

  private roverStage = 0;
  private roverName = "Scout Buggy";
  private roverBodySrc = "";
  private roverFrontWheelSrc: string | null = null;
  private roverBackWheelSrc: string | null = null;
  private roverGameMode: "wheeled" | "hover" = "wheeled";
  private weaponLevel = 0;
  private selectedAmmoAsset: RoverAmmoAsset | null = null;
  private weaponSpec: CoreRoverWeaponSpec | null = null;

  private combatMode = false;
  private combatStats: CoreRoverCombatStats;
  private roverHp = 0;
  private roverShield = 0;
  private lastCombatDamageAt = -100000;
  private lastWeaponFireAt = -100000;
  private roverDisabled = false;
  private shieldRegenActive = false;
  private shieldRegenAnnounced = false;

  // Phase 5G combat report metrics.
  private shotsFired = 0;
  private shotsHit = 0;
  private damageDealt = 0;
  private damageReceived = 0;
  private shieldDamageAbsorbed = 0;
  private combatAccuracyBonus = 0;
  private combatSurvivalBonus = 0;

  private combatProjectiles: CombatProjectile[] = [];
  private autocannonBarrelSide: -1 | 1 = -1;

  private combatLockTargetId: number | null = null;
  private combatTargetReticle?: Phaser.GameObjects.Arc;
  private combatTargetReticleInner?: Phaser.GameObjects.Arc;
  private combatTargetText?: Phaser.GameObjects.Text;

  private boneGuards: BoneGuardEnemy[] = [];
  private boneGuardProjectiles: BoneGuardBlasterProjectile[] = [];
  private boneGuardPortal?: Phaser.GameObjects.Container;
  private boneGuardPortalX = 0;
  private boneGuardPortalY = 0;
  private nextBoneGuardId = 1;
  private boneGuardsSpawned = 0;
  private boneGuardsDefeated = 0;
  private nextBoneGuardSpawnAt = 0;
  private boneGuardWaveStarted = false;
  private boneGuardWaveComplete = false;
  private boneGuardWavePhase = 0;
  private combatScore = 0;
  private combatEnemyText?: Phaser.GameObjects.Text;

  private combatFinishBarrier?: MatterJS.BodyType;
  private combatFinishBarrierVisual?: Phaser.GameObjects.Rectangle;
  private combatFinishBarrierGlow?: Phaser.GameObjects.Rectangle;

  private levelConfig: RoverLevelWithPulseGates;

  private normalMaximumSpeed = 5.5;
  private boostedMaximumSpeed = 7.0;
  private accelerationRate = 4.2;
  private brakingRate = 6.2;
  private groundAlignmentRate = 8.5;
  private slopeAssistMultiplier = 1;
  private landingToleranceMultiplier = 1;
  private overturnToleranceMultiplier = 1;
  private jumpVelocity = 0;
  private airTiltStrength = 0.006;
  private crashPenaltyMultiplier = 1;
  private trapPenaltyMultiplier = 1;

  private readonly jumpCooldownMs = 420;
  private readonly airborneTiltDelayMs = 150;
  private readonly airborneLevelingDelayMs = 220;
  private readonly airborneLevelingRate = 3.8;
  private readonly airborneAngularDampingRate = 6.5;

  constructor({
    levelConfig,
    roverStage,
    roverName,
    roverBodySrc,
    roverFrontWheelSrc,
    roverBackWheelSrc,
    roverGameMode,
    weaponLevel,
    combatMode,
    combatStats,
    gameStats,
  }: PhaserGameProps) {
    super({
      key: "RoverMatterScene",
    });

    this.levelConfig = levelConfig;
    this.roverStage = roverStage;
    this.roverName = roverName;
    this.roverBodySrc = roverBodySrc;
    this.roverFrontWheelSrc = roverFrontWheelSrc;
    this.roverBackWheelSrc = roverBackWheelSrc;
    this.roverGameMode = roverGameMode;
    this.weaponLevel = Math.max(0, Math.min(5, Math.floor(weaponLevel || 0)));
    this.selectedAmmoAsset = ROVER_AMMO_BY_LEVEL[this.weaponLevel] ?? null;
    this.weaponSpec = getCoreRoverWeaponSpec(this.weaponLevel);

    this.combatMode = Boolean(combatMode);
    this.combatStats = combatStats;
    this.roverHp = combatStats.maxHp;
    this.roverShield = combatStats.maxShield;

    this.normalMaximumSpeed = gameStats.normalSpeed;

    this.boostedMaximumSpeed = gameStats.boostSpeed;

    this.accelerationRate = gameStats.accelerationRate;

    this.brakingRate = gameStats.brakingRate;

    // Jump velocity is now stored as the final tuned value for each rover stage.
    // Keeping one source of truth prevents later stages from becoming overpowered.
    this.jumpVelocity = gameStats.jumpVelocity;

    this.maximumBoostEnergy = gameStats.boostCapacity;

    this.boostDrainRate = gameStats.boostDrainRate;

    this.boostRechargeRate = gameStats.boostRechargeRate;

    this.airTiltStrength = gameStats.airTiltStrength;

    this.crashPenaltyMultiplier = gameStats.crashPenaltyMultiplier ?? 1;

    this.trapPenaltyMultiplier = gameStats.trapPenaltyMultiplier ?? 1;

    this.groundAlignmentRate *= gameStats.groundAlignmentMultiplier ?? 1;
    this.slopeAssistMultiplier = gameStats.slopeAssistMultiplier ?? 1;
    this.landingToleranceMultiplier = gameStats.landingToleranceMultiplier ?? 1;
    this.overturnToleranceMultiplier = gameStats.overturnToleranceMultiplier ?? 1;

    this.boostEnergy = gameStats.boostCapacity;
  }

  preload() {
    this.load.image(
      "skyforge-background",
      this.levelConfig.assets.background,
    );

    this.load.image("energy-orb", this.levelConfig.assets.orb);

    if (this.levelConfig.assets.dynamite) {
      this.load.image("dreamkeeper-dynamite", this.levelConfig.assets.dynamite);
    }

    if (this.levelConfig.assets.explosion) {
      this.load.image("dreamkeeper-explosion", this.levelConfig.assets.explosion);
    }

    /*
     * Load the side-view PNG belonging to the rover currently equipped in
     * My Rover. The URL comes from coreRoverProgress.ts via
     * RoverChallengeClient.
     */
    this.load.image("selected-rover-body", this.roverBodySrc);

    if (this.roverGameMode === "wheeled") {
      if (this.roverFrontWheelSrc) {
        this.load.image("selected-rover-front-wheel", this.roverFrontWheelSrc);
      }

      if (this.roverBackWheelSrc) {
        this.load.image("selected-rover-back-wheel", this.roverBackWheelSrc);
      }
    }

    /*
     * Only the equipped weapon tier's ammunition is loaded. This keeps current
     * expeditions light while giving Stage 5 a stable texture key to spawn.
     */
    if (this.selectedAmmoAsset) {
      this.load.image(
        this.selectedAmmoAsset.textureKey,
        this.selectedAmmoAsset.src,
      );
    }

    if (this.combatMode) {
      this.load.spritesheet(
        "bone-guard",
        BONE_GUARD_SPRITE_SRC,
        {
          frameWidth: BONE_GUARD_FRAME_SIZE,
          frameHeight: BONE_GUARD_FRAME_SIZE,
        },
      );
    }

    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        console.error(`[Rover Challenge] Could not load asset: ${file.src}`);
      },
    );
  }

  create() {
    this.resetGameValues();

    this.matter.world.setBounds(
      0,
      0,
      this.levelConfig.worldWidth,
      this.levelConfig.worldHeight,
      64,
      true,
      true,
      true,
      false,
    );

    this.createBackground();

    if (!this.verifyRoverAssets()) {
      return;
    }

    this.createTerrain();
    this.createRouteLabels();
    this.createStartGate();
    this.createFinishGate();
    this.createCollectibles();
    this.createCheckpoints();
    this.createTraps();
    this.createPulseGates();
    this.createRover();
    this.createControls();
    this.createInterface();
    this.createTouchControls();
    this.configureCamera();
    this.registerCollisionHandlers();
    this.registerCombatFoundation();
    this.createBoneGuardCombatFoundation();

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.R,
      Phaser.Input.Keyboard.KeyCodes.F,
    ]);

    this.cameras.main.fadeIn(450, 5, 7, 19);
  }

  update(_time: number, delta: number) {
    if (!this.roverBody) {
      return;
    }

    this.updateBackgroundParallax();
    this.updateGroundState(delta);
    this.handleMovement(delta);
    this.stabilizeRover(delta);
    this.updateRoverVisuals(delta);
    this.updateTimer(delta);
    this.updateAirborneVelocity();
    this.updateCollectibles(delta);
    this.updateCheckpoints();
    this.updateTraps();
    this.updatePulseGates();
    this.updateCollapsibleTerrain();
    this.handleWeaponInput();
    this.updateCombat(delta);
    this.updateBoneGuardCombat(delta);
    this.updateScore();
    this.updateInterface();
    this.checkFinish();
    this.checkFall();
    this.checkOverturned(delta);
  }

  private resetGameValues() {
    this.collectibles = [];
    this.checkpoints = [];
    this.traps = [];
    this.pulseGates = [];
    this.collapsibleTerrain = [];
    this.terrainSections = [];
    this.boneGuardTerrainSections = [];
    this.trapCollisionLocked = false;

    this.touchLeft = false;
    this.touchRight = false;
    this.touchBoost = false;
    this.touchFire = false;

    this.boostEnergy = this.maximumBoostEnergy;

    this.roverHp = this.combatStats.maxHp;
    this.roverShield = this.combatStats.maxShield;
    this.lastCombatDamageAt = -100000;
    this.lastWeaponFireAt = -100000;
    this.roverDisabled = false;
    this.shieldRegenActive = false;
    this.shieldRegenAnnounced = false;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.damageDealt = 0;
    this.damageReceived = 0;
    this.shieldDamageAbsorbed = 0;
    this.combatAccuracyBonus = 0;
    this.combatSurvivalBonus = 0;

    this.combatProjectiles.forEach((projectile) => projectile.sprite.destroy());
    this.combatProjectiles = [];
    this.autocannonBarrelSide = -1;
    this.combatLockTargetId = null;

    this.combatTargetReticle?.destroy();
    this.combatTargetReticle = undefined;
    this.combatTargetReticleInner?.destroy();
    this.combatTargetReticleInner = undefined;
    this.combatTargetText?.destroy();
    this.combatTargetText = undefined;

    this.boneGuards.forEach((guard) => {
      guard.sprite.destroy();
      guard.healthBackground.destroy();
      guard.healthFill.destroy();
    });
    this.boneGuards = [];

    this.boneGuardProjectiles.forEach((projectile) =>
      projectile.sprite.destroy(),
    );
    this.boneGuardProjectiles = [];

    this.boneGuardPortal?.destroy(true);
    this.boneGuardPortal = undefined;
    this.nextBoneGuardId = 1;
    this.boneGuardsSpawned = 0;
    this.boneGuardsDefeated = 0;
    this.nextBoneGuardSpawnAt = 0;
    this.boneGuardWaveStarted = false;
    this.boneGuardWaveComplete = false;
    this.boneGuardWavePhase = 0;
    this.combatScore = 0;

    if (this.combatFinishBarrier) {
      this.matter.world.remove(this.combatFinishBarrier);
      this.combatFinishBarrier = undefined;
    }

    this.combatFinishBarrierVisual?.destroy();
    this.combatFinishBarrierVisual = undefined;
    this.combatFinishBarrierGlow?.destroy();
    this.combatFinishBarrierGlow = undefined;

    this.score = 0;
    this.distanceScore = 0;
    this.collectibleScore = 0;
    this.checkpointScore = 0;
    this.completionScore = 0;
    this.timeBonus = 0;
    this.crashPenalty = 0;

    this.collectedCount = 0;
    this.reachedCheckpointCount = 0;

    this.elapsedSeconds = 0;
    this.hasStarted = false;
    this.hasFinished = false;

    this.latestCheckpointX = this.levelConfig.start.x;
    this.latestCheckpointY = this.levelConfig.start.y;

    this.activeTerrainContacts.clear();
    this.maximumAirborneDownwardVelocity = 0;
    this.airborneTime = 0;
    this.overturnedTime = 0;
    this.lastJumpAt = -1000;
    this.restartRequested = false;
    this.roverWheelVisuals = [];
    this.wheelSpin = 0;
    this.roverBodyDisplayWidth = ROVER_BODY_WIDTH;
    this.roverBodyDisplayHeight = ROVER_BODY_HEIGHT;
    this.roverVisualOffsetY = 0;
  }

  private verifyRoverAssets() {
    const missingAssets: string[] = [];

    if (!this.textures.exists("selected-rover-body")) {
      missingAssets.push(
        this.roverBodySrc
          ? `public${this.roverBodySrc}`
          : "selected rover body PNG",
      );
    }

    if (this.roverGameMode === "wheeled") {
      if (!this.textures.exists("selected-rover-front-wheel")) {
        missingAssets.push(
          this.roverFrontWheelSrc
            ? `public${this.roverFrontWheelSrc}`
            : "selected rover front-wheel PNG",
        );
      }

      if (!this.textures.exists("selected-rover-back-wheel")) {
        missingAssets.push(
          this.roverBackWheelSrc
            ? `public${this.roverBackWheelSrc}`
            : "selected rover back-wheel PNG",
        );
      }
    }

    if (!this.textures.exists("skyforge-background")) {
      missingAssets.push("public/games/rover/skyforge-course-background.png");
    }

    if (!this.textures.exists("energy-orb")) {
      missingAssets.push("public/games/rover/energy-orb.png");
    }

    if (
      this.combatMode &&
      this.weaponSpec &&
      this.selectedAmmoAsset &&
      !this.textures.exists(
        this.selectedAmmoAsset.textureKey,
      )
    ) {
      missingAssets.push(
        `public${this.selectedAmmoAsset.src}`,
      );
    }

    if (
      this.combatMode &&
      !this.textures.exists("bone-guard")
    ) {
      missingAssets.push(`public${BONE_GUARD_SPRITE_SRC}`);
    }

    if (
      (this.levelConfig.traps?.length ?? 0) > 0 &&
      !this.textures.exists("dreamkeeper-dynamite")
    ) {
      missingAssets.push("public/games/rover/dreamkeeper-dynamite.png");
    }

    if (
      (this.levelConfig.traps?.length ?? 0) > 0 &&
      !this.textures.exists("dreamkeeper-explosion")
    ) {
      missingAssets.push("public/games/rover/dreamkeeper-explosion.png");
    }

    if (missingAssets.length === 0) {
      return true;
    }

    const panel = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      1050,
      340,
      0x070b18,
      0.96,
    );

    panel.setStrokeStyle(2, 0xff8f8f, 0.6);
    panel.setScrollFactor(0);
    panel.setDepth(500);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 105,
        "ROVER GAME ASSET FILES NOT FOUND",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "34px",
          fontStyle: "bold",
          color: "#ffb3b3",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(501);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 20,
        [
          "Save the PNG files at these exact paths:",
          "",
          ...missingAssets,
          "",
          "Then redeploy / refresh the app and hard-refresh the page.",
        ].join("\n"),
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          lineSpacing: 9,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(501);

    return false;
  }

  private createBackground() {
    this.cameras.main.setBackgroundColor("#070a18");

    this.backgroundTile = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "skyforge-background")
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-1000);

    if (Number(this.levelConfig.id) >= 5) {
      this.add
        .rectangle(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2,
          GAME_WIDTH,
          GAME_HEIGHT,
          0x160a31,
          0.26,
        )
        .setScrollFactor(0)
        .setDepth(-999)
        .setBlendMode(Phaser.BlendModes.MULTIPLY);

      this.add
        .ellipse(
          GAME_WIDTH * 0.78,
          GAME_HEIGHT * 0.27,
          760,
          520,
          0x7728c9,
          0.12,
        )
        .setScrollFactor(0)
        .setDepth(-998)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.add
        .ellipse(
          GAME_WIDTH * 0.25,
          GAME_HEIGHT * 0.6,
          900,
          560,
          0x1a7cc9,
          0.07,
        )
        .setScrollFactor(0)
        .setDepth(-998)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  private updateBackgroundParallax() {
    if (!this.backgroundTile) {
      return;
    }

    this.backgroundTile.tilePositionX = this.cameras.main.scrollX * 0.01;
    this.backgroundTile.tilePositionY = this.cameras.main.scrollY * 0.04;
  }

  private createTerrain() {
    /*
     * Each section is a Catmull-Rom curve sampled into many small,
     * overlapping Matter bodies. Level 4 can mark a section as unstable;
     * those sections warn, lose collision, and visually drop away shortly
     * after the rover reaches them.
     */
    this.levelConfig.terrainSections.forEach((section) => {
      if (Array.isArray(section)) {
        this.createSmoothTerrainSection(section, "ground", 220);
        return;
      }

      this.createSmoothTerrainSection(
        section.points,
        section.kind ?? "ground",
        section.collisionThickness ??
          (section.kind === "platform" ? 44 : 220),
        {
          unstable: Boolean(section.unstable),
          collapseDelayMs: section.collapseDelayMs ?? 900,
          collapseTriggerRadius: section.collapseTriggerRadius ?? 175,
        },
      );
    });

    this.createStartingPlatform();
    this.levelConfig.gapWarnings.forEach(({ x, y }) => {
      this.createGapWarning(x, y);
    });
  }

  private createSmoothTerrainSection(
    controlPoints: Array<{ x: number; y: number }>,
    kind: "ground" | "platform",
    terrainThickness: number,
    options?: {
      unstable?: boolean;
      collapseDelayMs?: number;
      collapseTriggerRadius?: number;
    },
  ) {
    const sampledPoints = this.sampleCatmullRom(controlPoints, 12);

    if (sampledPoints.length < 2) {
      return;
    }

    this.terrainSections.push(sampledPoints);

    if (!options?.unstable) {
      this.boneGuardTerrainSections.push(sampledPoints);
    }

    const fill = this.add.graphics();
    fill.setDepth(10);
    fill.fillStyle(options?.unstable ? 0x171827 : 0x101629, 1);
    fill.beginPath();
    fill.moveTo(sampledPoints[0].x, sampledPoints[0].y);

    for (let index = 1; index < sampledPoints.length; index += 1) {
      fill.lineTo(sampledPoints[index].x, sampledPoints[index].y);
    }

    if (kind === "platform") {
      for (let index = sampledPoints.length - 1; index >= 0; index -= 1) {
        fill.lineTo(
          sampledPoints[index].x,
          sampledPoints[index].y + terrainThickness,
        );
      }
    } else {
      const finalPoint = sampledPoints[sampledPoints.length - 1];
      fill.lineTo(finalPoint.x, this.levelConfig.worldHeight);
      fill.lineTo(sampledPoints[0].x, this.levelConfig.worldHeight);
    }

    fill.closePath();
    fill.fillPath();

    const surfaceGlow = this.add.graphics();
    surfaceGlow.setDepth(11);
    surfaceGlow.lineStyle(20, options?.unstable ? 0xff6f45 : 0x2b7898, options?.unstable ? 0.14 : 0.1);
    surfaceGlow.beginPath();
    surfaceGlow.moveTo(sampledPoints[0].x, sampledPoints[0].y + 7);
    for (let index = 1; index < sampledPoints.length; index += 1) {
      surfaceGlow.lineTo(sampledPoints[index].x, sampledPoints[index].y + 7);
    }
    surfaceGlow.strokePath();

    const surface = this.add.graphics();
    surface.setDepth(12);
    surface.lineStyle(8, options?.unstable ? 0xff8a5c : 0x62eaff, options?.unstable ? 0.72 : 0.38);
    surface.beginPath();
    surface.moveTo(sampledPoints[0].x, sampledPoints[0].y);
    for (let index = 1; index < sampledPoints.length; index += 1) {
      surface.lineTo(sampledPoints[index].x, sampledPoints[index].y);
    }
    surface.strokePath();

    const warningGlow = this.add.graphics();
    warningGlow.setDepth(13);
    warningGlow.lineStyle(5, 0xffc06a, 0.78);
    warningGlow.beginPath();
    warningGlow.moveTo(sampledPoints[0].x, sampledPoints[0].y - 4);
    for (let index = 1; index < sampledPoints.length; index += 1) {
      warningGlow.lineTo(sampledPoints[index].x, sampledPoints[index].y - 4);
    }
    warningGlow.strokePath();
    warningGlow.setAlpha(options?.unstable ? 0.22 : 0);

    const bodies = this.createTerrainCollisionBodies(
      sampledPoints,
      terrainThickness,
    );

    if (options?.unstable) {
      this.collapsibleTerrain.push({
        sampledPoints,
        terrainThickness,
        collapseDelayMs: options.collapseDelayMs ?? 900,
        collapseTriggerRadius: options.collapseTriggerRadius ?? 175,
        triggered: false,
        collapsed: false,
        bodies,
        fill,
        surfaceGlow,
        surface,
        warningGlow,
      });
    }
  }

  private createTerrainCollisionBodies(
    sampledPoints: Array<{ x: number; y: number }>,
    terrainThickness: number,
  ) {
    const bodies: MatterJS.BodyType[] = [];
    const collisionOverlap = 14;

    for (let index = 0; index < sampledPoints.length - 1; index += 1) {
      const current = sampledPoints[index];
      const next = sampledPoints[index + 1];
      const deltaX = next.x - current.x;
      const deltaY = next.y - current.y;
      const length = Math.hypot(deltaX, deltaY);

      if (length <= 0.01) continue;

      const angle = Math.atan2(deltaY, deltaX);
      const normalX = -deltaY / length;
      const normalY = deltaX / length;
      const midpointX = (current.x + next.x) / 2;
      const midpointY = (current.y + next.y) / 2;
      const bodyX = midpointX + normalX * (terrainThickness / 2);
      const bodyY = midpointY + normalY * (terrainThickness / 2);

      const body = this.matter.add.rectangle(
        bodyX,
        bodyY,
        length + collisionOverlap,
        terrainThickness,
        {
          isStatic: true,
          angle,
          friction: 1,
          frictionStatic: 1,
          restitution: 0,
          label: "terrain",
        },
      );
      bodies.push(body);
    }

    return bodies;
  }

  private updateCollapsibleTerrain() {
    if (!this.roverBody || this.hasFinished) return;

    const roverSurfaceY = this.roverBody.y + ROVER_COLLISION_HEIGHT / 2;

    for (const item of this.collapsibleTerrain) {
      if (item.triggered || item.collapsed) continue;

      const first = item.sampledPoints[0];
      const last = item.sampledPoints[item.sampledPoints.length - 1];
      const minX = first.x - item.collapseTriggerRadius;
      const maxX = last.x + item.collapseTriggerRadius;

      if (this.roverBody.x < minX || this.roverBody.x > maxX) continue;

      const surfaceY = this.getSurfaceYForSectionAtX(
        item.sampledPoints,
        Phaser.Math.Clamp(this.roverBody.x, first.x, last.x),
      );

      if (surfaceY === null || Math.abs(roverSurfaceY - surfaceY) > 165) continue;

      this.triggerTerrainCollapse(item);
    }
  }

  private getSurfaceYForSectionAtX(
    section: Array<{ x: number; y: number }>,
    x: number,
  ) {
    for (let index = 0; index < section.length - 1; index += 1) {
      const current = section[index];
      const next = section[index + 1];
      if (x < current.x || x > next.x) continue;
      const span = Math.max(0.001, next.x - current.x);
      const ratio = Phaser.Math.Clamp((x - current.x) / span, 0, 1);
      return Phaser.Math.Linear(current.y, next.y, ratio);
    }
    return null;
  }

  private triggerTerrainCollapse(item: CollapsibleTerrainItem) {
    item.triggered = true;
    this.showStatusMessage("FRACTURE!  KEEP MOVING", "#ffb06f");

    this.tweens.add({
      targets: item.warningGlow,
      alpha: { from: 0.25, to: 1 },
      duration: 120,
      yoyo: true,
      repeat: Math.max(2, Math.floor(item.collapseDelayMs / 240)),
    });

    item.collapseTimer = this.time.delayedCall(item.collapseDelayMs, () => {
      if (this.hasFinished) return;

      item.collapsed = true;
      item.bodies.forEach((body) => this.matter.world.remove(body));
      item.bodies = [];
      this.activeTerrainContacts.clear();

      this.tweens.add({
        targets: [item.fill, item.surfaceGlow, item.surface, item.warningGlow],
        y: "+=150",
        alpha: 0,
        duration: 460,
        ease: "Quad.easeIn",
      });

      this.cameras.main.shake(180, 0.006);
    });
  }

  private resetCollapsibleTerrain() {
    for (const item of this.collapsibleTerrain) {
      item.collapseTimer?.remove(false);
      item.collapseTimer = undefined;

      if (item.bodies.length === 0) {
        item.bodies = this.createTerrainCollisionBodies(
          item.sampledPoints,
          item.terrainThickness,
        );
      }

      item.triggered = false;
      item.collapsed = false;

      for (const graphic of [
        item.fill,
        item.surfaceGlow,
        item.surface,
        item.warningGlow,
      ]) {
        this.tweens.killTweensOf(graphic);
        graphic.setY(0);
        graphic.setAlpha(1);
      }

      item.warningGlow.setAlpha(0.22);
    }
  }

  private sampleCatmullRom(
    controlPoints: Array<{ x: number; y: number }>,
    samplesPerSpan: number,
  ) {
    const samples: Array<{
      x: number;
      y: number;
    }> = [];

    if (controlPoints.length < 2) {
      return samples;
    }

    for (let span = 0; span < controlPoints.length - 1; span += 1) {
      const point0 = controlPoints[Math.max(0, span - 1)];

      const point1 = controlPoints[span];

      const point2 = controlPoints[span + 1];

      const point3 =
        controlPoints[Math.min(controlPoints.length - 1, span + 2)];

      for (let step = 0; step < samplesPerSpan; step += 1) {
        const time = step / samplesPerSpan;

        const timeSquared = time * time;

        const timeCubed = timeSquared * time;

        samples.push({
          x:
            0.5 *
            (2 * point1.x +
              (-point0.x + point2.x) * time +
              (2 * point0.x - 5 * point1.x + 4 * point2.x - point3.x) *
                timeSquared +
              (-point0.x + 3 * point1.x - 3 * point2.x + point3.x) * timeCubed),

          y:
            0.5 *
            (2 * point1.y +
              (-point0.y + point2.y) * time +
              (2 * point0.y - 5 * point1.y + 4 * point2.y - point3.y) *
                timeSquared +
              (-point0.y + 3 * point1.y - 3 * point2.y + point3.y) * timeCubed),
        });
      }
    }

    const lastPoint = controlPoints[controlPoints.length - 1];

    samples.push({
      x: lastPoint.x,
      y: lastPoint.y,
    });

    return samples;
  }

  private createStartingPlatform() {
    const startX = this.levelConfig.start.x;
    const groundY = this.getStartingGroundY();

    this.add.ellipse(startX, groundY - 14, 360, 54, 0x3ce7ff, 0.07);

    this.add.ellipse(startX, groundY - 18, 280, 28, 0x80efff, 0.1);

    const outline = this.add.ellipse(
      startX,
      groundY - 20,
      320,
      38,
      0x000000,
      0,
    );

    outline.setStrokeStyle(2, 0x5eeaff, 0.3);
  }

  private createGapWarning(x: number, y: number) {
    this.add
      .text(x, y, "GAP", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffbd72",
        letterSpacing: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 28, "BOOST OR JUMP", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#c79568",
        letterSpacing: 2,
      })
      .setOrigin(0.5);
  }

  private createStartGate() {
    const startX = Math.max(100, this.levelConfig.start.x - 220);
    const groundY = this.getStartingGroundY();

    this.add.rectangle(startX, groundY - 105, 18, 210, 0x263354, 1);

    this.add.rectangle(startX + 150, groundY - 105, 18, 210, 0x263354, 1);

    this.add.rectangle(startX + 75, groundY - 205, 168, 20, 0x304267, 1);

    this.add.rectangle(startX + 75, groundY - 203, 125, 5, 0x69f0ff, 0.8);

    this.add
      .text(startX + 75, groundY - 240, "START", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#bff8ff",
        letterSpacing: 4,
      })
      .setOrigin(0.5);
  }

  private getStartingGroundY() {
    const firstSection = this.levelConfig.terrainSections[0];
    const firstPoint = Array.isArray(firstSection)
      ? firstSection[0]
      : firstSection?.points[0];

    return firstPoint?.y ?? 645;
  }

  private createFinishGate() {
    const { x: finishX, y: groundY } = this.levelConfig.finish;

    this.add.rectangle(finishX - 110, groundY - 120, 24, 240, 0x263354, 1);

    this.add.rectangle(finishX + 110, groundY - 120, 24, 240, 0x263354, 1);

    this.add.rectangle(finishX, groundY - 230, 244, 24, 0x304267, 1);

    const finishGlow = this.add.rectangle(
      finishX,
      groundY - 227,
      190,
      6,
      0x7dfcff,
      0.9,
    );

    finishGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.add
      .text(finishX, groundY - 270, "FINISH", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#d7fcff",
        letterSpacing: 5,
      })
      .setOrigin(0.5);
  }

  private createCollectibles() {
    this.levelConfig.collectibles.forEach((position, index) => {
      const glow = this.add.circle(position.x, position.y, 35, 0x65f7ff, 0.12);

      glow.setBlendMode(Phaser.BlendModes.ADD);

      const orb = this.add
        .image(position.x, position.y, "energy-orb")
        .setDisplaySize(72, 72)
        .setDepth(20);

      const ring = this.add.circle(position.x, position.y, 23, 0x000000, 0);

      ring.setStrokeStyle(2, 0x71ecff, 0.55);

      glow.setDepth(18);
      ring.setDepth(19);

      this.collectibles.push({
        id: index + 1,
        x: position.x,
        y: position.y,
        collected: false,
        glow,
        orb,
        ring,
      });
    });
  }

  private createCheckpoints() {
    this.levelConfig.checkpoints.forEach((checkpoint, index) => {
      this.add.rectangle(checkpoint.x, checkpoint.y, 12, 135, 0x3a4d72, 1);

      const glow = this.add.circle(
        checkpoint.x,
        checkpoint.y - 80,
        30,
        0x68eaff,
        0.1,
      );

      glow.setBlendMode(Phaser.BlendModes.ADD);

      const light = this.add.circle(
        checkpoint.x,
        checkpoint.y - 80,
        11,
        0x6defff,
        1,
      );

      const label = this.add
        .text(checkpoint.x, checkpoint.y - 122, `CHECKPOINT ${index + 1}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#9af6ff",
          letterSpacing: 2,
        })
        .setOrigin(0.5);

      this.checkpoints.push({
        id: index + 1,
        x: checkpoint.x,
        y: checkpoint.y,
        respawnX: checkpoint.respawnX,
        respawnY: checkpoint.respawnY,
        reached: false,
        light,
        glow,
        label,
      });
    });
  }

  private createRouteLabels() {
    (this.levelConfig.routeLabels ?? []).forEach((marker) => {
      this.add
        .text(marker.x, marker.y, marker.title, {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          fontStyle: "bold",
          color: marker.color,
          letterSpacing: 4,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(30);

      this.add
        .text(marker.x, marker.y + 30, marker.subtitle, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: marker.color,
          letterSpacing: 2,
          align: "center",
        })
        .setOrigin(0.5)
        .setAlpha(0.72)
        .setDepth(30);
    });
  }

  private createTraps() {
    if (
      !this.levelConfig.assets.dynamite ||
      !this.levelConfig.assets.explosion
    ) {
      return;
    }

    (this.levelConfig.traps ?? []).forEach((trap) => {
      // trap.y is used only as a route hint when multiple terrain surfaces
      // overlap at the same x-position. The exact sprite position still
      // comes from the sampled terrain surface below.
      const terrainPose = this.getTerrainPoseAtX(trap.x, trap.y);
      const surfaceY = terrainPose?.y ?? trap.y ?? this.levelConfig.start.y;
      const spriteY = surfaceY - 24;
      const terrainAngle = terrainPose?.angle ?? 0;

      const glow = this.add.circle(trap.x, spriteY, 36, 0xff5c72, 0.11);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(17);

      const sprite = this.add
        .image(trap.x, spriteY, "dreamkeeper-dynamite")
        .setDisplaySize(80, 54)
        .setRotation(terrainAngle)
        .setDepth(24);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.08, to: 0.22 },
        scale: { from: 0.88, to: 1.12 },
        duration: 680,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.traps.push({
        ...trap,
        y: spriteY,
        armed: true,
        sprite,
        glow,
      });
    });
  }

  private getCrashPenalty(basePenalty: number) {
    return Math.max(0, Math.round(basePenalty * this.crashPenaltyMultiplier));
  }

  private getTrapPenalty(basePenalty: number) {
    return Math.max(0, Math.round(basePenalty * this.trapPenaltyMultiplier));
  }

  private updateTraps() {
    if (!this.roverBody || this.hasFinished || this.trapCollisionLocked) {
      return;
    }

    const triggeredTrap = this.traps.find(
      (trap) =>
        trap.armed &&
        Phaser.Math.Distance.Between(
          this.roverBody!.x,
          this.roverBody!.y,
          trap.x,
          trap.y,
        ) <= trap.blastRadius,
    );

    if (triggeredTrap) {
      this.triggerTrap(triggeredTrap);
    }
  }

  private triggerTrap(trap: TrapItem) {
    if (!this.roverBody || !trap.armed) {
      return;
    }

    trap.armed = false;
    this.trapCollisionLocked = true;
    trap.sprite.setVisible(false);
    trap.glow.setVisible(false);

    const appliedPenalty = this.getTrapPenalty(trap.penalty);
    this.crashPenalty += appliedPenalty;

    const explosion = this.add
      .image(trap.x, trap.y - 8, "dreamkeeper-explosion")
      .setDisplaySize(80, 80)
      .setDepth(80)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: explosion,
      displayWidth: 250,
      displayHeight: 250,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => explosion.destroy(),
    });

    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(120, 255, 108, 70);
    this.showStatusMessage(
      `DREAMKEEPER TRAP  -${appliedPenalty}`,
      "#ffb18b",
    );

    this.roverBody.setVelocity(-4.5, -5.5);
    this.roverBody.setAngularVelocity(0);

    this.time.delayedCall(360, () => {
      this.respawnVehicle();
      this.trapCollisionLocked = false;
    });

    this.time.delayedCall(trap.rearmMs, () => {
      if (!this.hasFinished) {
        trap.armed = true;
        trap.sprite.setVisible(true).setAlpha(0);
        trap.glow.setVisible(true);
        this.tweens.add({
          targets: trap.sprite,
          alpha: 1,
          duration: 260,
        });
      }
    });
  }

  private createPulseGates() {
    (this.levelConfig.pulseGates ?? []).forEach((gate) => {
      const terrainPose = this.getTerrainPoseAtX(gate.x, gate.y);
      const surfaceY = terrainPose?.y ?? gate.y ?? this.levelConfig.start.y;
      const height = Math.max(180, gate.height ?? 500);
      const topY = Math.max(70, surfaceY - height);
      const resolvedHeight = Math.max(120, surfaceY - topY);
      const centreY = topY + resolvedHeight / 2;

      const glowBeam = this.add
        .rectangle(gate.x, centreY, 44, resolvedHeight, 0xff477a, 0.08)
        .setDepth(21)
        .setBlendMode(Phaser.BlendModes.ADD);

      const beam = this.add
        .rectangle(gate.x, centreY, 12, resolvedHeight, 0xff628d, 0.92)
        .setDepth(23)
        .setBlendMode(Phaser.BlendModes.ADD);

      const topNode = this.add
        .circle(gate.x, topY, 23, 0x52142c, 1)
        .setStrokeStyle(3, 0xff759b, 0.9)
        .setDepth(24);

      const baseNode = this.add
        .circle(gate.x, surfaceY - 6, 25, 0x52142c, 1)
        .setStrokeStyle(3, 0xff759b, 0.9)
        .setDepth(24);

      this.add
        .circle(gate.x, topY, 8, 0xff759b, 1)
        .setDepth(25)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.add
        .circle(gate.x, surfaceY - 6, 9, 0xff759b, 1)
        .setDepth(25)
        .setBlendMode(Phaser.BlendModes.ADD);

      const statusText = this.add
        .text(gate.x + 38, topY + 18, "PULSE GATE\nACTIVE", {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#ff9ab6",
          letterSpacing: 2,
          lineSpacing: 4,
        })
        .setOrigin(0, 0.5)
        .setDepth(30);

      this.pulseGates.push({
        ...gate,
        surfaceY,
        topY,
        active: true,
        glowBeam,
        beam,
        topNode,
        baseNode,
        statusText,
      });
    });
  }

  private updatePulseGates() {
    if (!this.roverBody || this.hasFinished) {
      return;
    }

    const now = this.time.now;

    for (const gate of this.pulseGates) {
      const cycleLength = Math.max(1, gate.activeMs + gate.safeMs);
      const cycleTime = (now + (gate.phaseOffsetMs ?? 0)) % cycleLength;
      const active = cycleTime < gate.activeMs;

      if (active !== gate.active) {
        gate.active = active;

        if (active) {
          gate.beam.setFillStyle(0xff628d, 1);
          gate.glowBeam.setFillStyle(0xff477a, 0.1);
          gate.topNode
            .setFillStyle(0x52142c, 1)
            .setStrokeStyle(3, 0xff759b, 0.9);
          gate.baseNode
            .setFillStyle(0x52142c, 1)
            .setStrokeStyle(3, 0xff759b, 0.9);
          gate.statusText.setText("PULSE GATE\nACTIVE").setColor("#ff9ab6");
        } else {
          gate.beam.setFillStyle(0x66eaff, 0.12);
          gate.glowBeam.setFillStyle(0x66eaff, 0.025);
          gate.topNode
            .setFillStyle(0x102c3a, 1)
            .setStrokeStyle(2, 0x66eaff, 0.34);
          gate.baseNode
            .setFillStyle(0x102c3a, 1)
            .setStrokeStyle(2, 0x66eaff, 0.34);
          gate.statusText.setText("PULSE GATE\nOPEN").setColor("#84efff");
        }
      }

      const pulse = 0.78 + Math.sin(now * 0.018 + gate.x * 0.004) * 0.16;
      gate.beam.setAlpha(active ? pulse : 0.12);
      gate.glowBeam.setAlpha(active ? 0.08 + pulse * 0.08 : 0.025);

      if (!active || this.trapCollisionLocked) {
        continue;
      }

      const roverLeft = this.roverBody.x - ROVER_COLLISION_WIDTH / 2;
      const roverRight = this.roverBody.x + ROVER_COLLISION_WIDTH / 2;
      const roverTop = this.roverBody.y - ROVER_COLLISION_HEIGHT / 2;
      const roverBottom = this.roverBody.y + ROVER_COLLISION_HEIGHT / 2;

      const crossesBeam = roverRight >= gate.x - 8 && roverLeft <= gate.x + 8;
      const overlapsBeamVertically =
        roverBottom >= gate.topY && roverTop <= gate.surfaceY + 18;

      if (crossesBeam && overlapsBeamVertically) {
        this.triggerPulseGate(gate);
        break;
      }
    }
  }

  private triggerPulseGate(gate: PulseGateItem) {
    if (!this.roverBody || this.trapCollisionLocked) {
      return;
    }

    this.trapCollisionLocked = true;

    const appliedPenalty = this.getTrapPenalty(gate.penalty);
    this.crashPenalty += appliedPenalty;

    const shock = this.add
      .circle(this.roverBody.x, this.roverBody.y, 42, 0xff5f94, 0.22)
      .setStrokeStyle(5, 0x8beeff, 0.8)
      .setDepth(82)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: shock,
      scale: 4.2,
      alpha: 0,
      duration: 440,
      ease: "Cubic.easeOut",
      onComplete: () => shock.destroy(),
    });

    this.cameras.main.shake(240, 0.01);
    this.cameras.main.flash(120, 255, 76, 126);
    this.showStatusMessage(`PULSE GATE  -${appliedPenalty}`, "#ff9ab6");

    this.roverBody.setVelocity(-5.2, -4.8);
    this.roverBody.setAngularVelocity(0);

    this.time.delayedCall(420, () => {
      this.respawnVehicle();
      this.trapCollisionLocked = false;
    });
  }

  private getOpaqueBounds(textureKey: string): OpaqueBounds | null {
    const texture = this.textures.get(textureKey);
    const sourceImage = texture.getSourceImage() as
      | HTMLImageElement
      | HTMLCanvasElement;

    const sourceWidth = Math.max(1, Number(sourceImage.width) || 1);
    const sourceHeight = Math.max(1, Number(sourceImage.height) || 1);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      const context = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!context) return null;

      context.clearRect(0, 0, sourceWidth, sourceHeight);
      context.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);

      const pixels = context.getImageData(
        0,
        0,
        sourceWidth,
        sourceHeight,
      ).data;

      let minX = sourceWidth;
      let minY = sourceHeight;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < sourceHeight; y += 1) {
        const rowStart = y * sourceWidth * 4;

        for (let x = 0; x < sourceWidth; x += 1) {
          const alpha = pixels[rowStart + x * 4 + 3];
          if (alpha <= WHEEL_ALPHA_THRESHOLD) continue;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      if (maxX < minX || maxY < minY) {
        return null;
      }

      return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        sourceWidth,
        sourceHeight,
      };
    } catch (error) {
      console.warn(
        `[Rover Challenge] Could not inspect ${textureKey} transparency:`,
        error,
      );
      return null;
    }
  }

  private getFallbackWheelBounds(
    textureKey: string,
    front: boolean,
  ): OpaqueBounds {
    const sourceImage = this.textures
      .get(textureKey)
      .getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    const sourceWidth = Math.max(1, Number(sourceImage.width) || 1);
    const sourceHeight = Math.max(1, Number(sourceImage.height) || 1);
    const centreX = sourceWidth * (front ? 0.76 : 0.24);
    const centreY = sourceHeight * 0.72;
    const diameter = Math.min(sourceWidth, sourceHeight) * 0.22;

    return {
      minX: centreX - diameter / 2,
      minY: centreY - diameter / 2,
      maxX: centreX + diameter / 2,
      maxY: centreY + diameter / 2,
      centerX: centreX,
      centerY: centreY,
      width: diameter,
      height: diameter,
      sourceWidth,
      sourceHeight,
    };
  }

  private createFullCanvasWheelVisual(
    textureKey: string,
    front: boolean,
    bodyDisplayWidth: number,
    bodyDisplayHeight: number,
    visualOffsetY: number,
  ): WheelVisualItem {
    const bounds =
      this.getOpaqueBounds(textureKey) ??
      this.getFallbackWheelBounds(textureKey, front);

    const originX = Phaser.Math.Clamp(
      bounds.centerX / bounds.sourceWidth,
      0,
      1,
    );
    const originY = Phaser.Math.Clamp(
      bounds.centerY / bounds.sourceHeight,
      0,
      1,
    );

    const localX =
      (originX - 0.5) * bodyDisplayWidth;
    const localY =
      (originY - 0.5) * bodyDisplayHeight + visualOffsetY;

    const sprite = this.add.image(
      this.levelConfig.start.x + localX,
      this.levelConfig.start.y + localY,
      textureKey,
    );

    sprite.setDisplaySize(bodyDisplayWidth, bodyDisplayHeight);
    sprite.setOrigin(originX, originY);
    sprite.setFlipX(false);
    sprite.setDepth(20);

    return {
      sprite,
      localX,
      localY,
    };
  }

  private getRoadAlignedVisualOffset(
    bodyDisplayHeight: number,
    frontBounds: OpaqueBounds,
    backBounds: OpaqueBounds,
  ) {
    const frontBottom =
      (frontBounds.maxY / frontBounds.sourceHeight - 0.5) *
      bodyDisplayHeight;

    const backBottom =
      (backBounds.maxY / backBounds.sourceHeight - 0.5) *
      bodyDisplayHeight;

    const lowestWheelBottom = Math.max(frontBottom, backBottom);

    return (
      ROVER_COLLISION_HEIGHT / 2 +
      ROAD_CONTACT_VISUAL_OFFSET -
      lowestWheelBottom
    );
  }

  private getHoverVisualOffset(bodyDisplayHeight: number) {
    const bounds = this.getOpaqueBounds("selected-rover-body");

    if (!bounds) {
      return -86;
    }

    const bodyBottom =
      (bounds.maxY / bounds.sourceHeight - 0.5) * bodyDisplayHeight;

    return (
      ROVER_COLLISION_HEIGHT / 2 -
      HOVER_CLEARANCE -
      bodyBottom
    );
  }

  private createRover() {
    /*
     * Matter provides the shared invisible chassis. Wheeled rovers render a
     * body layer plus separate full-canvas front/back wheel layers. Hover X
     * renders only its complete vehicle image above the contact surface.
     */
    const roverBody = this.matter.add.image(
      this.levelConfig.start.x,
      this.levelConfig.start.y,
      "selected-rover-body",
    );

    roverBody.setDisplaySize(ROVER_BODY_WIDTH, ROVER_BODY_HEIGHT);
    roverBody.setRectangle(ROVER_COLLISION_WIDTH, ROVER_COLLISION_HEIGHT, {
      label: "rover-chassis",
    });
    roverBody.setMass(12);
    roverBody.setFriction(0.88);
    roverBody.setFrictionStatic(1);
    roverBody.setFrictionAir(0.035);
    roverBody.setBounce(0.01);
    roverBody.setAlpha(0);
    roverBody.setDepth(18);
    this.roverBody = roverBody;

    const layout =
      ROVER_VISUAL_LAYOUT[this.roverStage] ??
      ROVER_VISUAL_LAYOUT[0];

    const sourceImage = this.textures
      .get("selected-rover-body")
      .getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    const sourceWidth = Math.max(1, Number(sourceImage.width) || 1);
    const sourceHeight = Math.max(1, Number(sourceImage.height) || 1);
    const fitScale = Math.min(
      layout.bodyMaxWidth / sourceWidth,
      layout.bodyMaxHeight / sourceHeight,
    );

    this.roverBodyDisplayWidth = Math.max(1, sourceWidth * fitScale);
    this.roverBodyDisplayHeight = Math.max(1, sourceHeight * fitScale);

    if (this.roverGameMode === "hover") {
      this.roverVisualOffsetY = this.getHoverVisualOffset(
        this.roverBodyDisplayHeight,
      );
    } else {
      const frontBounds =
        this.getOpaqueBounds("selected-rover-front-wheel") ??
        this.getFallbackWheelBounds(
          "selected-rover-front-wheel",
          true,
        );

      const backBounds =
        this.getOpaqueBounds("selected-rover-back-wheel") ??
        this.getFallbackWheelBounds(
          "selected-rover-back-wheel",
          false,
        );

      this.roverVisualOffsetY = this.getRoadAlignedVisualOffset(
        this.roverBodyDisplayHeight,
        frontBounds,
        backBounds,
      );
    }

    this.roverBodyVisual = this.add.image(
      this.levelConfig.start.x,
      this.levelConfig.start.y + this.roverVisualOffsetY,
      "selected-rover-body",
    );

    this.roverBodyVisual.setDisplaySize(
      this.roverBodyDisplayWidth,
      this.roverBodyDisplayHeight,
    );
    this.roverBodyVisual.setFlipX(false);
    this.roverBodyVisual.setDepth(21);

    this.roverWheelVisuals = [];

    if (this.roverGameMode === "wheeled") {
      this.roverWheelVisuals = [
        this.createFullCanvasWheelVisual(
          "selected-rover-back-wheel",
          false,
          this.roverBodyDisplayWidth,
          this.roverBodyDisplayHeight,
          this.roverVisualOffsetY,
        ),
        this.createFullCanvasWheelVisual(
          "selected-rover-front-wheel",
          true,
          this.roverBodyDisplayWidth,
          this.roverBodyDisplayHeight,
          this.roverVisualOffsetY,
        ),
      ];
    }

    this.updateRoverVisuals(0);
  }

  private createControls() {
    if (!this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.boostKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    this.fireKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.F,
    );
  }

  private createInterface() {
    const statusPanel = this.createHudPanel(
      42,
      42,
      390,
      this.combatMode ? 452 : 245,
    );

    statusPanel.setOrigin(0, 0);

    this.add
      .text(70, 62, "ROVER STATUS", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#72eaff",
        letterSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.speedText = this.add
      .text(70, 92, "SPEED  000", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.distanceText = this.add
      .text(70, 122, "DISTANCE  0 M", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#a9b6d1",
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.scoreText = this.add
      .text(70, 149, "SCORE  0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.collectibleText = this.add
      .text(
        70,
        178,
        `ENERGY ORBS  0 / ${this.levelConfig.collectibles.length}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#89edf8",
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.checkpointText = this.add
      .text(
        70,
        201,
        `CHECKPOINTS  0 / ${this.levelConfig.checkpoints.length}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#89edf8",
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.objectiveText = this.add
      .text(
        70,
        227,
        this.combatMode
          ? "OBJECTIVE  SURVIVE BONE GUARDS · REACH FINISH"
          : this.levelConfig.terrainSections.some(
              (section) => !Array.isArray(section) && section.unstable,
            )
            ? "OBJECTIVE  KEEP MOVING · SURVIVE FRACTURES · FINISH"
            : (this.levelConfig.pulseGates?.length ?? 0) > 0
            ? (this.levelConfig.traps?.length ?? 0) > 0
              ? "OBJECTIVE  TIME GATES · AVOID TRAPS · FINISH"
              : "OBJECTIVE  TIME PULSE GATES · REACH FINISH"
            : (this.levelConfig.traps?.length ?? 0) > 0
              ? "OBJECTIVE  REACH FINISH · AVOID TRAPS"
              : "OBJECTIVE  REACH THE FINISH GATE",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#8defff",
          letterSpacing: 1,
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    this.roverStageText = this.add
      .text(
        70,
        252,
        `ROVER ${this.roverStage + 1}  ${this.roverName.toUpperCase()}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#ffd76a",
          letterSpacing: 1,
        },
      )
      .setScrollFactor(0)
      .setDepth(101);

    if (this.combatMode) {
      this.add
        .text(70, 286, "COMBAT SYSTEMS", {
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          color: "#ffd76a",
          letterSpacing: 2,
        })
        .setScrollFactor(0)
        .setDepth(101);

      this.combatRoleText = this.add
        .text(
          70,
          305,
          `${this.combatStats.combatRole} · ${this.combatStats.combatTrait}`,
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "8px",
            fontStyle: "bold",
            color: "#d7c8ff",
            letterSpacing: 1,
          },
        )
        .setScrollFactor(0)
        .setDepth(101);

      this.combatShieldText = this.add
        .text(70, 326, `SHIELD  ${Math.round(this.roverShield)} / ${this.combatStats.maxShield}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#77ecff",
        })
        .setScrollFactor(0)
        .setDepth(101);

      const shieldBg = this.add.rectangle(70, 349, 326, 9, 0x26314d, 1);
      shieldBg.setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

      this.combatShieldBarFill = this.add.rectangle(
        70,
        349,
        326,
        9,
        0x62edff,
        1,
      );
      this.combatShieldBarFill
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(102);

      this.combatHpText = this.add
        .text(70, 364, `HP  ${Math.round(this.roverHp)} / ${this.combatStats.maxHp}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#9cffb3",
        })
        .setScrollFactor(0)
        .setDepth(101);

      const hpBg = this.add.rectangle(70, 387, 326, 9, 0x26314d, 1);
      hpBg.setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

      this.combatHpBarFill = this.add.rectangle(
        70,
        387,
        326,
        9,
        0x79f5a6,
        1,
      );
      this.combatHpBarFill
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(102);

      const weaponBehaviour =
        this.weaponSpec?.projectileType === "homing"
          ? "LOCK-ON"
          : this.weaponSpec?.projectileType === "guided"
            ? "SEEKER"
            : this.weaponSpec?.projectileType === "rocket"
              ? "3-ROCKET BURST"
              : this.weaponSpec?.projectileType === "heavy-round"
                ? "TWIN AUTOCANNON"
                : "RAPID FIRE";

      this.combatWeaponText = this.add
        .text(
          70,
          399,
          this.weaponSpec
            ? `WEAPON  ${this.weaponSpec.name.toUpperCase()} · ${weaponBehaviour}`
            : "WEAPON  NOT INSTALLED",
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "9px",
            fontStyle: "bold",
            color: this.weaponSpec ? "#ffd76a" : "#ff9d9d",
            letterSpacing: 1,
          },
        )
        .setScrollFactor(0)
        .setDepth(101);

      this.combatEnemyText = this.add
        .text(
          70,
          419,
          `BONE GUARDS  0 / ${boneGuardCombatSpec.waveSize}`,
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "9px",
            fontStyle: "bold",
            color: "#c8a7ff",
            letterSpacing: 1,
          },
        )
        .setScrollFactor(0)
        .setDepth(101);
    }

    const timerPanel = this.createHudPanel(GAME_WIDTH / 2 - 115, 42, 230, 92);

    timerPanel.setOrigin(0, 0);

    this.add
      .text(
        GAME_WIDTH / 2,
        62,
        `LEVEL ${this.levelConfig.id} · ${this.levelConfig.title.toUpperCase()}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          color: "#91a4c9",
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 91, "00:00.0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "29px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    const boostPanel = this.createHudPanel(GAME_WIDTH - 390, 42, 348, 102);

    boostPanel.setOrigin(0, 0);

    this.boostText = this.add
      .text(GAME_WIDTH - 362, 64, "BOOST ENERGY  100%", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#9af6ff",
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(101);

    const boostBarBackground = this.add.rectangle(
      GAME_WIDTH - 362,
      106,
      290,
      14,
      0x26314d,
      1,
    );

    boostBarBackground.setOrigin(0, 0.5);

    boostBarBackground.setScrollFactor(0);

    boostBarBackground.setDepth(101);

    this.boostBarFill = this.add.rectangle(
      GAME_WIDTH - 362,
      106,
      290,
      14,
      0x62edff,
      1,
    );

    this.boostBarFill.setOrigin(0, 0.5);
    this.boostBarFill.setScrollFactor(0);
    this.boostBarFill.setDepth(102);

    const controlsPanel = this.createHudPanel(
      GAME_WIDTH / 2 - 445,
      GAME_HEIGHT - 93,
      890,
      62,
    );

    controlsPanel.setOrigin(0, 0);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 62,
        this.combatMode
          ? this.jumpVelocity < 0
            ? "A / D OR ← / →  DRIVE     W OR ↑  JUMP     SPACE  BOOST     F  FIRE     R  RESTART"
            : "A / D OR ← / →  DRIVE     JUMP LOCKED     SPACE  BOOST     F  FIRE     R  RESTART"
          : this.jumpVelocity < 0
            ? "A / D OR ← / →  DRIVE     W OR ↑  JUMP     SPACE  BOOST     R  RESTART"
            : "A / D OR ← / →  DRIVE     JUMP MODULE LOCKED     SPACE  BOOST     R  RESTART",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#c6d2ea",
          letterSpacing: 1,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
  }

  private createHudPanel(x: number, y: number, width: number, height: number) {
    const panel = this.add.rectangle(x, y, width, height, 0x050816, 0.76);

    panel.setStrokeStyle(1, 0xffffff, 0.1);

    panel.setScrollFactor(0);
    panel.setDepth(100);

    return panel;
  }

  private requestRestart() {
    if (this.restartRequested) {
      return;
    }

    this.restartRequested = true;

    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
    }

    window.dispatchEvent(new Event("rover-restart-requested"));
  }

  private createTouchControls() {
    this.input.addPointer(3);

    this.createTouchButton(
      105,
      GAME_HEIGHT - 125,
      80,
      "←",
      () => {
        this.touchLeft = true;
      },
      () => {
        this.touchLeft = false;
      },
    );

    this.createTouchButton(
      205,
      GAME_HEIGHT - 125,
      80,
      "→",
      () => {
        this.touchRight = true;
      },
      () => {
        this.touchRight = false;
      },
    );

    if (this.combatMode) {
      this.createTouchButton(
        GAME_WIDTH - 455,
        GAME_HEIGHT - 125,
        88,
        this.weaponSpec ? "FIRE" : "NO GUN",
        () => {
          if (this.weaponSpec) {
            this.touchFire = true;
            this.tryFireWeapon();
          } else {
            this.showStatusMessage("NO WEAPON INSTALLED", "#ff9d9d");
          }
        },
        () => {
          this.touchFire = false;
        },
      );
    }

    this.createTouchButton(
      this.combatMode ? GAME_WIDTH - 340 : GAME_WIDTH - 330,
      GAME_HEIGHT - 125,
      88,
      this.jumpVelocity < 0 ? "JUMP" : "LOCKED",
      () => {
        this.tryJump();
      },
      () => undefined,
    );

    this.createTouchButton(
      this.combatMode ? GAME_WIDTH - 220 : GAME_WIDTH - 205,
      GAME_HEIGHT - 125,
      100,
      "BOOST",
      () => {
        this.touchBoost = true;
      },
      () => {
        this.touchBoost = false;
      },
    );

    this.createTouchButton(
      GAME_WIDTH - 85,
      GAME_HEIGHT - 125,
      66,
      "R",
      () => {
        this.requestRestart();
      },
      () => undefined,
    );
  }

  private createTouchButton(
    x: number,
    y: number,
    size: number,
    label: string,
    onPress: () => void,
    onRelease: () => void,
  ): TouchButton {
    const background = this.add.circle(x, y, size / 2, 0x071020, 0.72);

    background.setStrokeStyle(2, 0x78efff, 0.4);

    background.setScrollFactor(0);
    background.setDepth(150);

    background.setInteractive({
      useHandCursor: true,
    });

    const buttonLabel = this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize:
          label === "BOOST" ||
          label === "JUMP" ||
          label === "LOCKED" ||
          label === "FIRE" ||
          label === "NO GUN"
            ? "12px"
            : "28px",
        fontStyle: "bold",
        color: "#d8fbff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(151);

    const press = () => {
      background.setFillStyle(0x17465a, 0.92);

      background.setScale(0.94);
      buttonLabel.setScale(0.94);
      onPress();
    };

    const release = () => {
      background.setFillStyle(0x071020, 0.72);

      background.setScale(1);
      buttonLabel.setScale(1);
      onRelease();
    };

    background.on("pointerdown", press);
    background.on("pointerup", release);
    background.on("pointerout", release);
    background.on("pointerupoutside", release);

    buttonLabel.setInteractive({
      useHandCursor: true,
    });
    buttonLabel.on("pointerdown", press);
    buttonLabel.on("pointerup", release);
    buttonLabel.on("pointerout", release);
    buttonLabel.on("pointerupoutside", release);

    return {
      background,
      label: buttonLabel,
    };
  }

  private configureCamera() {
    if (!this.roverBody) {
      return;
    }

    this.cameras.main.setBounds(
      0,
      0,
      this.levelConfig.worldWidth,
      this.levelConfig.worldHeight,
    );

    this.cameras.main.startFollow(this.roverBody, true, 0.075, 0.075, -280, 80);

    this.cameras.main.setDeadzone(260, 170);
  }

  private handleMovement(delta: number) {
    const { roverBody, cursors, keyA, keyD, keyW, keyR, boostKey } = this;

    if (
      !roverBody ||
      !cursors ||
      !keyA ||
      !keyD ||
      !keyW ||
      !keyR ||
      !boostKey
    ) {
      return;
    }

    const body = roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(keyR)) {
      this.requestRestart();
      return;
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(keyW) ||
      Phaser.Input.Keyboard.JustDown(cursors.up);

    if (jumpPressed) {
      this.tryJump();
    }

    if (this.hasFinished || this.roverDisabled) {
      roverBody.setVelocityX(body.velocity.x * 0.92);

      return;
    }

    const movingLeft = cursors.left.isDown || keyA.isDown || this.touchLeft;

    const movingRight = cursors.right.isDown || keyD.isDown || this.touchRight;

    const direction =
      movingRight && !movingLeft ? 1 : movingLeft && !movingRight ? -1 : 0;

    const usingBoost =
      (boostKey.isDown || this.touchBoost) &&
      this.boostEnergy > 0 &&
      direction !== 0;

    if ((direction !== 0 || jumpPressed) && !this.hasStarted) {
      this.hasStarted = true;
    }

    const maximumSpeed = usingBoost
      ? this.boostedMaximumSpeed
      : this.normalMaximumSpeed;

    const targetVelocityX = direction * maximumSpeed;
    const grounded = this.activeTerrainContacts.size > 0;
    const terrainAngle = grounded
      ? (this.getTerrainAngleAtX(roverBody.x) ?? 0)
      : 0;

    /*
     * Positive screen Y points downward, so travelling uphill means the
     * terrain tangent has a vertical component opposite the travel direction.
     *
     * The old controller only targeted world-X velocity. On a hill, Matter
     * contact + gravity consumed most of that velocity and Boost barely
     * changed the result. Grounded uphill driving now follows the terrain
     * tangent as well as maintaining horizontal speed.
     */
    const uphill =
      grounded &&
      direction !== 0 &&
      direction * Math.sin(terrainAngle) < -0.035;

    const slopeSeverity = uphill
      ? Phaser.Math.Clamp(
          Math.abs(Math.sin(terrainAngle)) / 0.55,
          0,
          1,
        )
      : 0;

    const baseResponseRate =
      direction === 0 ? this.brakingRate : this.accelerationRate;

    const slopeResponseMultiplier = uphill
      ? (usingBoost ? 2.35 : 1.45) * this.slopeAssistMultiplier
      : 1;

    const responseRate =
      baseResponseRate * slopeResponseMultiplier;

    const horizontalSmoothing =
      1 - Math.exp(-responseRate * (delta / 1000));

    const nextVelocityX = Phaser.Math.Linear(
      body.velocity.x,
      targetVelocityX,
      horizontalSmoothing,
    );

    roverBody.setVelocityX(nextVelocityX);

    if (uphill) {
      /*
       * Match the rover's vertical velocity to the road tangent. This is
       * deliberately applied only while grounded and climbing, so jumps,
       * descents and airborne physics remain natural.
       *
       * Boost receives the strongest tangent lock. Normal drive still gets
       * enough assistance that ordinary hills do not require jumping.
       */
      const maximumSlopeVelocity =
        maximumSpeed * (usingBoost ? 0.95 : 0.78);

      const desiredSlopeVelocityY = Phaser.Math.Clamp(
        targetVelocityX * Math.tan(terrainAngle),
        -maximumSlopeVelocity,
        maximumSlopeVelocity,
      );

      const verticalFollowRate =
        (usingBoost ? 10.5 : 6.2) *
        this.slopeAssistMultiplier *
        (0.55 + slopeSeverity * 0.45);

      const verticalSmoothing =
        1 - Math.exp(-verticalFollowRate * (delta / 1000));

      roverBody.setVelocityY(
        Phaser.Math.Linear(
          body.velocity.y,
          desiredSlopeVelocityY,
          verticalSmoothing,
        ),
      );
    }

    /*
     * Only provide gentle air tilt after the rover has
     * genuinely left the terrain.
     */
    const travellingAtHighSpeed =
      Math.abs(body.velocity.x) >= this.normalMaximumSpeed * 0.9;

    if (
      this.isProbablyAirborne() &&
      direction !== 0 &&
      !travellingAtHighSpeed
    ) {
      const targetAngularVelocity = direction * this.airTiltStrength;

      const nextAngularVelocity = Phaser.Math.Linear(
        body.angularVelocity,
        targetAngularVelocity,
        0.06,
      );

      roverBody.setAngularVelocity(
        Phaser.Math.Clamp(nextAngularVelocity, -0.026, 0.026),
      );
    }

    const seconds = delta / 1000;

    if (usingBoost) {
      this.boostEnergy -= this.boostDrainRate * seconds;
    } else {
      this.boostEnergy += this.boostRechargeRate * seconds;
    }

    this.boostEnergy = Phaser.Math.Clamp(
      this.boostEnergy,
      0,
      this.maximumBoostEnergy,
    );
  }

  private tryJump() {
    if (!this.roverBody) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    if (this.jumpVelocity >= 0) {
      this.showStatusMessage("JUMP MODULE LOCKED", "#ffd76a");

      return;
    }

    const now = this.time.now;

    const jumpReady = now - this.lastJumpAt >= this.jumpCooldownMs;

    const grounded = this.activeTerrainContacts.size > 0;

    if (!jumpReady || !grounded || this.hasFinished) {
      return;
    }

    this.lastJumpAt = now;
    this.hasStarted = true;

    this.roverBody.setVelocityY(this.jumpVelocity);

    this.showStatusMessage("JUMP", "#9af6ff");
  }

  private updateGroundState(delta: number) {
    if (this.activeTerrainContacts.size === 0) {
      this.airborneTime += delta;
    } else {
      this.airborneTime = 0;
    }
  }

  private isProbablyAirborne() {
    return (
      this.activeTerrainContacts.size === 0 &&
      this.airborneTime >= this.airborneTiltDelayMs
    );
  }

  private stabilizeRover(delta: number) {
    if (!this.roverBody) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const grounded = this.activeTerrainContacts.size > 0;

    const currentRotation = Phaser.Math.Angle.Wrap(this.roverBody.rotation);

    if (this.roverGameMode === "hover") {
      const terrainAngle =
        this.getTerrainAngleAtX(this.roverBody.x) ?? 0;

      // Hover X should read as a flying craft, not a wheeled chassis glued to
      // every slope. Follow only a small portion of the road pitch and become
      // even flatter as speed increases.
      const speedRatio = Phaser.Math.Clamp(
        Math.abs(body.velocity.x) / Math.max(1, this.boostedMaximumSpeed),
        0,
        1,
      );
      const maxHoverPitch = Phaser.Math.DegToRad(8 - speedRatio * 3);
      const targetHoverPitch = grounded
        ? Phaser.Math.Clamp(terrainAngle * 0.28, -maxHoverPitch, maxHoverPitch)
        : 0;
      const hoverLevelingRate = 10 + speedRatio * 10;
      const hoverSmoothing =
        1 - Math.exp(-hoverLevelingRate * (delta / 1000));

      this.roverBody.setRotation(
        Phaser.Math.Linear(
          currentRotation,
          targetHoverPitch,
          hoverSmoothing,
        ),
      );
      this.roverBody.setAngularVelocity(
        Phaser.Math.Linear(body.angularVelocity, 0, hoverSmoothing),
      );
      return;
    }

    if (grounded) {
      const terrainAngle =
        this.getTerrainAngleAtX(this.roverBody.x) ?? currentRotation;

      const angleError = Phaser.Math.Angle.Wrap(terrainAngle - currentRotation);

      const alignmentSmoothing =
        1 - Math.exp(-this.groundAlignmentRate * (delta / 1000));

      /*
       * Rotate the complete collision chassis toward the local slope.
       * The visible body and both wheels use this same rotation.
       */
      this.roverBody.setRotation(
        currentRotation + angleError * alignmentSmoothing,
      );

      this.roverBody.setAngularVelocity(
        Phaser.Math.Linear(body.angularVelocity, 0, alignmentSmoothing),
      );

      return;
    }

    const travellingAtHighSpeed =
      Math.abs(body.velocity.x) >= this.normalMaximumSpeed * 0.9;

    if (travellingAtHighSpeed) {
      const highSpeedLeveling = 1 - Math.exp(-12 * (delta / 1000));

      this.roverBody.setRotation(
        Phaser.Math.Linear(currentRotation, 0, highSpeedLeveling),
      );
      this.roverBody.setAngularVelocity(
        Phaser.Math.Linear(body.angularVelocity, 0, highSpeedLeveling),
      );

      return;
    }

    /*
     * At boost speed the rover can leave a hill while still carrying
     * the hill's pitch and collision-generated angular velocity. A
     * short delay preserves the natural take-off angle, then a gentle
     * spring brings the chassis back toward level for a predictable
     * landing. The hard limit is only a final safety net.
     */
    const maximumAirRotation = Phaser.Math.DegToRad(34);

    const boundedRotation = Phaser.Math.Clamp(
      currentRotation,
      -maximumAirRotation,
      maximumAirRotation,
    );

    if (boundedRotation !== currentRotation) {
      this.roverBody.setRotation(boundedRotation);
    }

    if (this.airborneTime < this.airborneLevelingDelayMs) {
      if (boundedRotation !== currentRotation) {
        this.roverBody.setAngularVelocity(body.angularVelocity * 0.2);
      }

      return;
    }

    const seconds = delta / 1000;

    const levelingSmoothing =
      1 - Math.exp(-this.airborneLevelingRate * seconds);

    const angularDamping = Math.exp(-this.airborneAngularDampingRate * seconds);

    const levelledRotation = Phaser.Math.Linear(
      boundedRotation,
      0,
      levelingSmoothing,
    );

    this.roverBody.setRotation(
      Phaser.Math.Clamp(
        levelledRotation,
        -maximumAirRotation,
        maximumAirRotation,
      ),
    );

    this.roverBody.setAngularVelocity(
      Phaser.Math.Clamp(body.angularVelocity * angularDamping, -0.018, 0.018),
    );
  }

  private getTerrainAngleAtX(x: number) {
    const targetSurfaceY =
      (this.roverBody?.y ?? this.levelConfig.start.y) +
      ROVER_COLLISION_HEIGHT / 2;
    let closest:
      | {
          angle: number;
          distance: number;
        }
      | undefined;

    for (const section of this.terrainSections) {
      if (section.length < 2) {
        continue;
      }

      const first = section[0];

      const last = section[section.length - 1];

      if (x < first.x || x > last.x) {
        continue;
      }

      let low = 0;
      let high = section.length - 2;

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);

        const current = section[middle];

        const next = section[middle + 1];

        if (x >= current.x && x <= next.x) {
          const span = Math.max(0.001, next.x - current.x);
          const ratio = Phaser.Math.Clamp((x - current.x) / span, 0, 1);
          const surfaceY = Phaser.Math.Linear(current.y, next.y, ratio);
          const candidate = {
            angle: Math.atan2(next.y - current.y, next.x - current.x),
            distance: Math.abs(surfaceY - targetSurfaceY),
          };

          if (!closest || candidate.distance < closest.distance) {
            closest = candidate;
          }

          break;
        }

        if (x < current.x) {
          high = middle - 1;
        } else {
          low = middle + 1;
        }
      }
    }

    return closest?.angle ?? null;
  }

  private getBoneGuardTerrainPoseAtX(
    x: number,
    preferredSurfaceY?: number,
  ) {
    const candidates: Array<{ y: number; angle: number }> = [];

    for (const section of this.boneGuardTerrainSections) {
      if (section.length < 2) {
        continue;
      }

      const firstPoint = section[0];
      const lastPoint = section[section.length - 1];

      if (x < firstPoint.x || x > lastPoint.x) {
        continue;
      }

      for (
        let index = 0;
        index < section.length - 1;
        index += 1
      ) {
        const current = section[index];
        const next = section[index + 1];

        if (x < current.x || x > next.x) {
          continue;
        }

        const span = Math.max(0.001, next.x - current.x);
        const ratio = Phaser.Math.Clamp(
          (x - current.x) / span,
          0,
          1,
        );

        candidates.push({
          y: Phaser.Math.Linear(current.y, next.y, ratio),
          angle: Math.atan2(
            next.y - current.y,
            next.x - current.x,
          ),
        });

        break;
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    if (preferredSurfaceY === undefined) {
      return candidates[0];
    }

    return candidates.reduce(
      (closest, candidate) =>
        Math.abs(candidate.y - preferredSurfaceY) <
        Math.abs(closest.y - preferredSurfaceY)
          ? candidate
          : closest,
    );
  }

  private getTerrainPoseAtX(x: number, preferredSurfaceY?: number) {
    const candidates: Array<{ y: number; angle: number }> = [];

    for (const section of this.terrainSections) {
      if (section.length < 2) {
        continue;
      }

      const firstPoint = section[0];
      const lastPoint = section[section.length - 1];

      if (x < firstPoint.x || x > lastPoint.x) {
        continue;
      }

      for (let index = 0; index < section.length - 1; index += 1) {
        const current = section[index];
        const next = section[index + 1];

        if (x < current.x || x > next.x) {
          continue;
        }

        const span = Math.max(0.001, next.x - current.x);
        const ratio = Phaser.Math.Clamp((x - current.x) / span, 0, 1);

        candidates.push({
          y: Phaser.Math.Linear(current.y, next.y, ratio),
          angle: Math.atan2(next.y - current.y, next.x - current.x),
        });

        break;
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    if (preferredSurfaceY === undefined) {
      return candidates[0];
    }

    return candidates.reduce((closest, candidate) =>
      Math.abs(candidate.y - preferredSurfaceY) <
      Math.abs(closest.y - preferredSurfaceY)
        ? candidate
        : closest,
    );
  }

  private updateRoverVisuals(delta = 0) {
    if (!this.roverBody || !this.roverBodyVisual) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;
    if (!body) {
      return;
    }

    const physicsRotation = this.roverBody.rotation;
    const rotation =
      this.roverGameMode === "hover"
        ? Phaser.Math.Clamp(
            physicsRotation * 0.45,
            -Phaser.Math.DegToRad(5.5),
            Phaser.Math.DegToRad(5.5),
          )
        : physicsRotation;

    const hoverBob =
      this.roverGameMode === "hover"
        ? Math.sin(this.time.now * HOVER_BOB_SPEED) * HOVER_BOB_AMOUNT
        : 0;

    const bodyOffset = this.rotateOffset(
      0,
      this.roverVisualOffsetY + hoverBob,
      rotation,
    );

    this.roverBodyVisual.setPosition(
      this.roverBody.x + bodyOffset.x,
      this.roverBody.y + bodyOffset.y,
    );
    this.roverBodyVisual.setRotation(rotation);

    if (this.roverGameMode === "hover") {
      return;
    }

    this.wheelSpin += body.velocity.x * 0.012 * (delta / 16.667);

    this.roverWheelVisuals.forEach((wheel) => {
      const offset = this.rotateOffset(
        wheel.localX,
        wheel.localY,
        rotation,
      );

      wheel.sprite.setPosition(
        this.roverBody!.x + offset.x,
        this.roverBody!.y + offset.y,
      );

      wheel.sprite.setRotation(rotation + this.wheelSpin);
    });
  }

  private rotateOffset(offsetX: number, offsetY: number, rotation: number) {
    return {
      x: offsetX * Math.cos(rotation) - offsetY * Math.sin(rotation),

      y: offsetX * Math.sin(rotation) + offsetY * Math.cos(rotation),
    };
  }

  private registerCollisionHandlers() {
    const collisionStart = (
      event: Phaser.Physics.Matter.Events.CollisionStartEvent,
    ) => {
      event.pairs.forEach((pair) => {
        if (!this.isRoverTerrainPair(pair)) {
          return;
        }

        const wasAirborne = this.activeTerrainContacts.size === 0;

        this.activeTerrainContacts.add(pair.id);

        if (wasAirborne) {
          this.handleLanding();
        }
      });
    };

    const collisionEnd = (
      event: Phaser.Physics.Matter.Events.CollisionEndEvent,
    ) => {
      event.pairs.forEach((pair) => {
        if (!this.isRoverTerrainPair(pair)) {
          return;
        }

        this.activeTerrainContacts.delete(pair.id);
      });
    };

    this.matter.world.on("collisionstart", collisionStart);

    this.matter.world.on("collisionend", collisionEnd);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.matter.world.off("collisionstart", collisionStart);

      this.matter.world.off("collisionend", collisionEnd);
    });
  }

  private isRoverTerrainPair(
    pair: Phaser.Types.Physics.Matter.MatterCollisionPair,
  ) {
    const labels = [pair.bodyA.label, pair.bodyB.label];

    return labels.includes("rover-chassis") && labels.includes("terrain");
  }

  private updateAirborneVelocity() {
    if (!this.isProbablyAirborne() || !this.roverBody) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    this.maximumAirborneDownwardVelocity = Math.max(
      this.maximumAirborneDownwardVelocity,
      body.velocity.y,
    );
  }

  private handleLanding() {
    const landingVelocity = this.maximumAirborneDownwardVelocity;

    this.maximumAirborneDownwardVelocity = 0;

    if (landingVelocity >= 13.5 * this.landingToleranceMultiplier) {
      const appliedPenalty = this.getCrashPenalty(250);
      this.crashPenalty += appliedPenalty;

      this.showStatusMessage(
        `CRASH LANDING  -${appliedPenalty}`,
        "#ff9f9f",
      );

      this.time.delayedCall(180, () => {
        this.respawnVehicle();
      });

      return;
    }

    if (landingVelocity >= 8.5 * this.landingToleranceMultiplier) {
      const appliedPenalty = this.getCrashPenalty(100);
      this.crashPenalty += appliedPenalty;

      this.showStatusMessage(
        `HARD LANDING  -${appliedPenalty}`,
        "#ffc582",
      );
    }
  }

  private showStatusMessage(message: string, colour: string) {
    const text = this.add
      .text(GAME_WIDTH / 2, 175, message, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: colour,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(190)
      .setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: 160,
      duration: 180,
      yoyo: true,
      hold: 500,
      onComplete: () => {
        text.destroy();
      },
    });
  }

  private updateTimer(delta: number) {
    if (!this.hasStarted || this.hasFinished) {
      return;
    }

    this.elapsedSeconds += delta / 1000;
  }

  private updateCollectibles(delta: number) {
    if (!this.roverBody) {
      return;
    }

    const rover = this.roverBody;

    this.collectibles.forEach((collectible) => {
      if (collectible.collected) {
        return;
      }

      collectible.ring.rotation += 0.025 * (delta / 16.667);

      collectible.orb.rotation += 0.008 * (delta / 16.667);

      collectible.orb.y =
        collectible.y + Math.sin(this.time.now / 350 + collectible.id) * 7;

      collectible.ring.y = collectible.orb.y;

      collectible.glow.y = collectible.orb.y;

      const distance = Phaser.Math.Distance.Between(
        rover.x,
        rover.y,
        collectible.x,
        collectible.orb.y,
      );

      if (distance <= 120) {
        collectible.collected = true;

        this.collectedCount += 1;
        this.collectibleScore += 100;

        this.tweens.add({
          targets: [collectible.orb, collectible.ring, collectible.glow],
          scale: 1.8,
          alpha: 0,
          duration: 220,
          ease: "Quad.easeOut",
          onComplete: () => {
            collectible.orb.destroy();
            collectible.ring.destroy();
            collectible.glow.destroy();
          },
        });
      }
    });
  }

  private updateCheckpoints() {
    if (!this.roverBody) {
      return;
    }

    const rover = this.roverBody;

    this.checkpoints.forEach((checkpoint) => {
      if (checkpoint.reached) {
        return;
      }

      const horizontalDistance = Math.abs(rover.x - checkpoint.x);

      const verticalDistance = Math.abs(rover.y - checkpoint.y);

      if (horizontalDistance <= 120 && verticalDistance <= 190) {
        checkpoint.reached = true;

        this.reachedCheckpointCount += 1;

        this.checkpointScore += 250;

        this.latestCheckpointX = checkpoint.respawnX;

        this.latestCheckpointY = checkpoint.respawnY;

        checkpoint.light.setFillStyle(0x8dffbf, 1);

        checkpoint.glow.setFillStyle(0x65ffac, 0.15);

        checkpoint.label
          .setText(`CHECKPOINT ${checkpoint.id} ACTIVE`)
          .setColor("#8dffbf");

        this.tweens.add({
          targets: checkpoint.glow,
          scale: 1.8,
          alpha: 0.25,
          duration: 280,
          yoyo: true,
        });
      }
    });
  }

  private updateScore() {
    if (!this.roverBody) {
      return;
    }

    this.distanceScore = Math.max(
      this.distanceScore,
      Math.floor(
        Math.max(0, this.roverBody.x - this.levelConfig.start.x) / 4,
      ),
    );

    this.score = Math.max(
      0,
      this.distanceScore +
        this.collectibleScore +
        this.checkpointScore +
        this.combatScore +
        this.combatAccuracyBonus +
        this.combatSurvivalBonus +
        this.completionScore +
        this.timeBonus -
        this.crashPenalty,
    );
  }

  private updateInterface() {
    if (
      !this.roverBody ||
      !this.speedText ||
      !this.distanceText ||
      !this.scoreText ||
      !this.timerText ||
      !this.collectibleText ||
      !this.checkpointText ||
      !this.boostText ||
      !this.boostBarFill
    ) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const speed = Math.round(Math.abs(body.velocity.x) * 45);

    const distance = Math.max(
      0,
      Math.round((this.roverBody.x - this.levelConfig.start.x) / 4),
    );

    const boostPercentage = Math.round(
      (this.boostEnergy / this.maximumBoostEnergy) * 100,
    );

    this.speedText.setText(`SPEED  ${speed.toString().padStart(3, "0")}`);

    this.distanceText.setText(`DISTANCE  ${distance.toLocaleString()} M`);

    this.scoreText.setText(`SCORE  ${this.score.toLocaleString()}`);

    this.collectibleText.setText(
      `ENERGY ORBS  ${this.collectedCount} / ${this.collectibles.length}`,
    );

    this.checkpointText.setText(
      `CHECKPOINTS  ${this.reachedCheckpointCount} / ${this.checkpoints.length}`,
    );

    this.timerText.setText(this.formatTime(this.elapsedSeconds));

    this.boostText.setText(`BOOST ENERGY  ${boostPercentage}%`);

    this.boostBarFill.width =
      290 * (this.boostEnergy / this.maximumBoostEnergy);

    if (this.boostEnergy <= 20) {
      this.boostBarFill.setFillStyle(0xffbd72, 1);
    } else {
      this.boostBarFill.setFillStyle(0x62edff, 1);
    }

    if (
      this.combatMode &&
      this.combatShieldText &&
      this.combatHpText &&
      this.combatShieldBarFill &&
      this.combatHpBarFill
    ) {
      const shieldRatio = Phaser.Math.Clamp(
        this.roverShield / Math.max(1, this.combatStats.maxShield),
        0,
        1,
      );
      const hpRatio = Phaser.Math.Clamp(
        this.roverHp / Math.max(1, this.combatStats.maxHp),
        0,
        1,
      );

      this.combatShieldText.setText(
        `SHIELD  ${Math.ceil(this.roverShield)} / ${this.combatStats.maxShield}`,
      );
      this.combatHpText.setText(
        `HP  ${Math.ceil(this.roverHp)} / ${this.combatStats.maxHp}`,
      );

      this.combatShieldBarFill.width = 326 * shieldRatio;
      this.combatHpBarFill.width = 326 * hpRatio;

      if (this.shieldRegenActive) {
        this.combatShieldBarFill.setFillStyle(0x76ffd9, 1);
        this.combatShieldText.setColor("#9dffe5");
      } else if (shieldRatio <= 0.2) {
        this.combatShieldBarFill.setFillStyle(0xffbd72, 1);
        this.combatShieldText.setColor("#ffd08a");
      } else {
        this.combatShieldBarFill.setFillStyle(0x62edff, 1);
        this.combatShieldText.setColor("#77ecff");
      }

      if (this.combatEnemyText) {
        this.combatEnemyText.setText(
          `BONE GUARDS  ${this.boneGuardsDefeated} / ${boneGuardCombatSpec.waveSize}`,
        );

        if (this.boneGuardWaveComplete) {
          this.combatEnemyText.setColor("#8dffbf");
        } else {
          this.combatEnemyText.setColor("#c8a7ff");
        }
      }

      if (hpRatio <= 0.25) {
        this.combatHpBarFill.setFillStyle(0xff6b72, 1);
        this.combatHpText.setColor("#ff9297");
      } else if (hpRatio <= 0.5) {
        this.combatHpBarFill.setFillStyle(0xffc15f, 1);
        this.combatHpText.setColor("#ffd38a");
      } else {
        this.combatHpBarFill.setFillStyle(0x79f5a6, 1);
        this.combatHpText.setColor("#9cffb3");
      }
    }
  }

  private registerCombatFoundation() {
    if (!this.combatMode) {
      return;
    }

    const damageListener = (event: Event) => {
      const detail = (event as CustomEvent<{ amount?: number }>).detail;
      const amount = Number(detail?.amount ?? 0);

      if (Number.isFinite(amount) && amount > 0) {
        this.applyRoverDamage(amount);
      }
    };

    window.addEventListener("rover-combat-damage", damageListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("rover-combat-damage", damageListener);
    });
  }

  private updateCombat(delta: number) {
    if (!this.combatMode) {
      return;
    }

    this.handleWeaponInput();
    this.updateCombatProjectiles(delta);

    if (
      this.roverDisabled ||
      this.hasFinished ||
      this.roverShield >= this.combatStats.maxShield
    ) {
      this.shieldRegenActive = false;
      return;
    }

    const timeSinceDamage =
      this.time.now - this.lastCombatDamageAt;

    if (timeSinceDamage < this.combatStats.shieldRegenDelayMs) {
      this.shieldRegenActive = false;
      return;
    }

    this.shieldRegenActive = true;

    if (!this.shieldRegenAnnounced) {
      this.shieldRegenAnnounced = true;
      this.showStatusMessage(
        "SHIELD RECHARGING",
        "#8dffe2",
      );
    }

    this.roverShield = Math.min(
      this.combatStats.maxShield,
      this.roverShield +
        this.combatStats.shieldRegenPerSecond * (delta / 1000),
    );

    if (this.roverShield >= this.combatStats.maxShield) {
      this.shieldRegenActive = false;
    }
  }

  private handleWeaponInput() {
    if (
      !this.fireKey ||
      this.hasFinished ||
      this.roverDisabled ||
      !this.weaponSpec
    ) {
      return;
    }

    if (this.fireKey.isDown || this.touchFire) {
      this.tryFireWeapon();
    }
  }

  private tryFireWeapon() {
    if (
      !this.combatMode ||
      !this.roverBody ||
      !this.weaponSpec ||
      this.hasFinished ||
      this.roverDisabled
    ) {
      return;
    }

    if (!this.selectedAmmoAsset) {
      this.showStatusMessage(
        "AMMO CONFIGURATION MISSING",
        "#ff9d9d",
      );
      return;
    }

    if (
      !this.textures.exists(
        this.selectedAmmoAsset.textureKey,
      )
    ) {
      this.showStatusMessage(
        `AMMO FILE MISSING · TIER ${this.weaponLevel}`,
        "#ff9d9d",
      );
      return;
    }

    const now = this.time.now;

    if (now - this.lastWeaponFireAt < this.weaponSpec.fireCooldownMs) {
      return;
    }

    this.lastWeaponFireAt = now;

    if (!this.hasStarted) {
      this.hasStarted = true;
    }

    const burstCount = Math.max(1, this.weaponSpec.burstCount);

    for (let shotIndex = 0; shotIndex < burstCount; shotIndex += 1) {
      const delay =
        shotIndex * Math.max(0, this.weaponSpec.burstIntervalMs);

      if (delay === 0) {
        this.fireSingleRoverProjectile(shotIndex, burstCount);
      } else {
        this.time.delayedCall(delay, () => {
          if (
            this.hasFinished ||
            this.roverDisabled ||
            !this.roverBody ||
            !this.weaponSpec
          ) {
            return;
          }

          this.fireSingleRoverProjectile(shotIndex, burstCount);
        });
      }
    }
  }

  private fireSingleRoverProjectile(
    shotIndex: number,
    burstCount: number,
  ) {
    if (
      !this.roverBody ||
      !this.weaponSpec ||
      !this.selectedAmmoAsset ||
      !this.textures.exists(
        this.selectedAmmoAsset.textureKey,
      )
    ) {
      return;
    }

    const now = this.time.now;
    const body = this.roverBody.body as MatterJS.BodyType | null;
    const bodyAngle = body?.angle ?? 0;

    let muzzleDistance = this.roverBodyDisplayWidth * 0.43;
    let muzzleLift = this.roverBodyDisplayHeight * 0.13;

    if (this.weaponSpec.projectileType === "heavy-round") {
      muzzleLift += this.autocannonBarrelSide * 9;
      this.autocannonBarrelSide =
        this.autocannonBarrelSide === -1 ? 1 : -1;
    }

    if (
      this.weaponSpec.projectileType === "rocket" &&
      burstCount > 1
    ) {
      const burstCenter = (burstCount - 1) / 2;
      muzzleLift += (shotIndex - burstCenter) * 11;
      muzzleDistance -= Math.abs(shotIndex - burstCenter) * 3;
    }

    const perpendicularX = -Math.sin(bodyAngle);
    const perpendicularY = Math.cos(bodyAngle);

    const muzzleX =
      this.roverBody.x +
      Math.cos(bodyAngle) * muzzleDistance -
      perpendicularX * muzzleLift;

    const muzzleY =
      this.roverBody.y +
      Math.sin(bodyAngle) * muzzleDistance -
      perpendicularY * muzzleLift;

    const target = this.acquireWeaponTarget(
      this.weaponSpec,
      muzzleX,
      muzzleY,
      bodyAngle,
    );

    let launchAngle = bodyAngle;

    if (
      target &&
      this.weaponSpec.projectileType === "homing"
    ) {
      launchAngle = Phaser.Math.Angle.Between(
        muzzleX,
        muzzleY,
        target.sprite.x,
        target.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.52,
      );
    }

    const sprite = this.add.image(
      muzzleX,
      muzzleY,
      this.selectedAmmoAsset.textureKey,
    );

    sprite
      .setDepth(46)
      .setRotation(launchAngle)
      .setOrigin(0.5);

    const source = this.textures
      .get(this.selectedAmmoAsset.textureKey)
      .getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    const sourceWidth = Math.max(1, Number(source.width) || 1);
    const sourceHeight = Math.max(1, Number(source.height) || 1);
    const displayWidth = this.weaponSpec.projectileWidth;
    const displayHeight = Math.max(
      6,
      displayWidth * (sourceHeight / sourceWidth),
    );

    sprite.setDisplaySize(displayWidth, displayHeight);

    const inheritedSpeed =
      Math.max(0, body?.velocity.x ?? 0) * 20;

    const projectileSpeed =
      this.weaponSpec.projectileSpeed + inheritedSpeed;

    this.combatProjectiles.push({
      sprite,
      velocityX: Math.cos(launchAngle) * projectileSpeed,
      velocityY: Math.sin(launchAngle) * projectileSpeed,
      speed: projectileSpeed,
      expiresAt: now + this.weaponSpec.projectileLifetimeMs,
      damage: this.weaponSpec.damage,
      projectileType: this.weaponSpec.projectileType,
      blastRadius: this.weaponSpec.blastRadius,
      trackingStrength: this.weaponSpec.trackingStrength,
      targetGuardId: target?.id ?? null,
      guidanceRange: this.weaponSpec.guidanceRange,
      turnRateRadPerSecond: this.weaponSpec.turnRateRadPerSecond,
      canReacquireTarget: this.weaponSpec.canReacquireTarget,
      nextTrailAt: now,
    });

    this.shotsFired += 1;
    this.createMuzzleFlash(muzzleX, muzzleY, launchAngle);

    if (
      this.weaponSpec.projectileType === "guided" ||
      this.weaponSpec.projectileType === "homing"
    ) {
      this.combatLockTargetId = target?.id ?? null;
    }
  }

  private acquireWeaponTarget(
    spec: CoreRoverWeaponSpec,
    originX: number,
    originY: number,
    facingAngle: number,
  ): BoneGuardEnemy | null {
    if (
      spec.projectileType !== "guided" &&
      spec.projectileType !== "homing"
    ) {
      return null;
    }

    const halfConeRadians =
      Phaser.Math.DegToRad(spec.lockConeDegrees) / 2;

    let selected: BoneGuardEnemy | null = null;
    let selectedScore = Number.POSITIVE_INFINITY;

    for (const guard of this.boneGuards) {
      if (!this.isBoneGuardTargetable(guard)) {
        continue;
      }

      const targetX = guard.sprite.x;
      const targetY =
        guard.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.52;

      const distance = Phaser.Math.Distance.Between(
        originX,
        originY,
        targetX,
        targetY,
      );

      if (distance > spec.guidanceRange) {
        continue;
      }

      const targetAngle = Phaser.Math.Angle.Between(
        originX,
        originY,
        targetX,
        targetY,
      );

      const angleError = Math.abs(
        Phaser.Math.Angle.Wrap(targetAngle - facingAngle),
      );

      if (angleError > halfConeRadians) {
        continue;
      }

      const anglePenalty =
        spec.projectileType === "guided"
          ? angleError * 260
          : angleError * 70;

      const score = distance + anglePenalty;

      if (score < selectedScore) {
        selected = guard;
        selectedScore = score;
      }
    }

    return selected;
  }

  private isBoneGuardTargetable(guard: BoneGuardEnemy) {
    return (
      guard.state !== "dying" &&
      guard.state !== "dead" &&
      guard.sprite.active
    );
  }

  private findBoneGuardById(id: number | null) {
    if (id == null) return null;

    return (
      this.boneGuards.find(
        (guard) =>
          guard.id === id &&
          this.isBoneGuardTargetable(guard),
      ) ?? null
    );
  }

  private createMuzzleFlash(x: number, y: number, angle: number) {
    const flash = this.add
      .ellipse(x, y, 34, 14, 0xffd76a, 0.95)
      .setRotation(angle)
      .setDepth(47)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scaleX: 1.8,
      scaleY: 0.65,
      alpha: 0,
      duration: 90,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private updateCombatProjectiles(delta: number) {
    if (this.combatProjectiles.length === 0) {
      return;
    }

    const dt = delta / 1000;
    const now = this.time.now;

    this.combatProjectiles = this.combatProjectiles.filter((projectile) => {
      if (!projectile.sprite.active) {
        return false;
      }

      this.updateProjectileGuidance(projectile, dt);

      projectile.sprite.x += projectile.velocityX * dt;
      projectile.sprite.y += projectile.velocityY * dt;

      if (
        projectile.projectileType === "rocket" ||
        projectile.projectileType === "guided" ||
        projectile.projectileType === "homing"
      ) {
        this.updateMissileTrail(projectile, now);
      }

      const guardHit = this.findBoneGuardHitByPlayerProjectile(
        projectile.sprite.x,
        projectile.sprite.y,
      );

      if (guardHit) {
        this.shotsHit += 1;

        if (projectile.blastRadius > 0) {
          this.damageBoneGuardsInRadius(
            projectile.sprite.x,
            projectile.sprite.y,
            projectile.blastRadius,
            projectile.damage,
          );

          this.createProjectileExplosion(
            projectile.sprite.x,
            projectile.sprite.y,
            projectile.blastRadius,
          );
        } else {
          this.damageBoneGuard(guardHit, projectile.damage);
          this.createPlayerImpact(
            projectile.sprite.x,
            projectile.sprite.y,
          );
        }

        projectile.sprite.destroy();
        return false;
      }

      const expired = now >= projectile.expiresAt;

      const outsideWorld =
        projectile.sprite.x < -200 ||
        projectile.sprite.x > this.levelConfig.worldWidth + 200 ||
        projectile.sprite.y < -200 ||
        projectile.sprite.y > this.levelConfig.worldHeight + 200;

      if (expired || outsideWorld) {
        projectile.sprite.destroy();
        return false;
      }

      return true;
    });
  }

  private updateProjectileGuidance(
    projectile: CombatProjectile,
    dt: number,
  ) {
    if (
      projectile.projectileType !== "guided" &&
      projectile.projectileType !== "homing"
    ) {
      return;
    }

    let target = this.findBoneGuardById(
      projectile.targetGuardId,
    );

    if (!target && projectile.canReacquireTarget) {
      const currentAngle = Math.atan2(
        projectile.velocityY,
        projectile.velocityX,
      );

      if (
        this.weaponSpec &&
        this.weaponSpec.projectileType === "homing"
      ) {
        target = this.acquireWeaponTarget(
          this.weaponSpec,
          projectile.sprite.x,
          projectile.sprite.y,
          currentAngle,
        );

        projectile.targetGuardId = target?.id ?? null;
      }
    }

    if (!target) {
      return;
    }

    const targetX = target.sprite.x;
    const targetY =
      target.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.52;

    const distance = Phaser.Math.Distance.Between(
      projectile.sprite.x,
      projectile.sprite.y,
      targetX,
      targetY,
    );

    if (distance > projectile.guidanceRange * 1.25) {
      if (projectile.canReacquireTarget) {
        projectile.targetGuardId = null;
      }
      return;
    }

    const currentAngle = Math.atan2(
      projectile.velocityY,
      projectile.velocityX,
    );

    const desiredAngle = Phaser.Math.Angle.Between(
      projectile.sprite.x,
      projectile.sprite.y,
      targetX,
      targetY,
    );

    const angularError = Phaser.Math.Angle.Wrap(
      desiredAngle - currentAngle,
    );

    const guidanceModifier =
      projectile.projectileType === "guided"
        ? 0.78
        : 1;

    const maximumTurn =
      projectile.turnRateRadPerSecond *
      guidanceModifier *
      dt;

    const appliedTurn = Phaser.Math.Clamp(
      angularError,
      -maximumTurn,
      maximumTurn,
    );

    const newAngle = currentAngle + appliedTurn;

    projectile.velocityX =
      Math.cos(newAngle) * projectile.speed;
    projectile.velocityY =
      Math.sin(newAngle) * projectile.speed;
    projectile.sprite.setRotation(newAngle);
  }

  private updateMissileTrail(
    projectile: CombatProjectile,
    now: number,
  ) {
    if (now < projectile.nextTrailAt) {
      return;
    }

    projectile.nextTrailAt =
      now +
      (projectile.projectileType === "homing"
        ? 36
        : projectile.projectileType === "guided"
          ? 44
          : 58);

    const angle = Math.atan2(
      projectile.velocityY,
      projectile.velocityX,
    );

    const trailDistance = Math.max(
      10,
      projectile.sprite.displayWidth * 0.38,
    );

    const trailX =
      projectile.sprite.x -
      Math.cos(angle) * trailDistance;

    const trailY =
      projectile.sprite.y -
      Math.sin(angle) * trailDistance;

    const color =
      projectile.projectileType === "homing"
        ? 0x63e9ff
        : projectile.projectileType === "guided"
          ? 0x9d8bff
          : 0xffb264;

    const trail = this.add
      .circle(
        trailX,
        trailY,
        projectile.projectileType === "homing"
          ? 5
          : 4,
        color,
        0.64,
      )
      .setDepth(44)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: trail,
      scale: 0.25,
      alpha: 0,
      duration:
        projectile.projectileType === "homing"
          ? 260
          : 210,
      ease: "Cubic.easeOut",
      onComplete: () => trail.destroy(),
    });
  }

  private findBoneGuardHitByPlayerProjectile(
    x: number,
    y: number,
  ) {
    return this.boneGuards.find((guard) => {
      if (
        guard.state === "dying" ||
        guard.state === "dead" ||
        !guard.sprite.active
      ) {
        return false;
      }

      const bounds = guard.sprite.getBounds();
      return (
        x >= bounds.left - 8 &&
        x <= bounds.right + 8 &&
        y >= bounds.top - 8 &&
        y <= bounds.bottom + 8
      );
    });
  }

  private damageBoneGuardsInRadius(
    x: number,
    y: number,
    radius: number,
    damage: number,
  ) {
    this.boneGuards.forEach((guard) => {
      if (
        guard.state === "dying" ||
        guard.state === "dead" ||
        !guard.sprite.active
      ) {
        return;
      }

      const targetX = guard.sprite.x;
      const targetY = guard.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.48;
      const distance = Phaser.Math.Distance.Between(
        x,
        y,
        targetX,
        targetY,
      );

      if (distance > radius) {
        return;
      }

      const falloff = Phaser.Math.Clamp(
        1 - distance / Math.max(1, radius),
        0.45,
        1,
      );

      this.damageBoneGuard(
        guard,
        Math.max(1, Math.round(damage * falloff)),
      );
    });
  }

  private createPlayerImpact(x: number, y: number) {
    const impact = this.add
      .circle(x, y, 13, 0x8defff, 0.9)
      .setDepth(53)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: impact,
      scale: 2.2,
      alpha: 0,
      duration: 150,
      ease: "Cubic.easeOut",
      onComplete: () => impact.destroy(),
    });
  }

  private createProjectileExplosion(
    x: number,
    y: number,
    radius: number,
  ) {
    const explosion = this.add
      .circle(x, y, Math.max(18, radius * 0.3), 0xffb05f, 0.72)
      .setDepth(53)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: explosion,
      scale: Math.max(2, radius / Math.max(18, radius * 0.3)),
      alpha: 0,
      duration: 230,
      ease: "Cubic.easeOut",
      onComplete: () => explosion.destroy(),
    });
  }

  private createBoneGuardCombatFoundation() {
    if (!this.combatMode || !this.textures.exists("bone-guard")) {
      return;
    }

    this.createBoneGuardAnimations();
    this.createBoneGuardBlasterTexture();
    this.createBoneGuardPortal();
    this.createCombatTargetReticle();

    if (Number(this.levelConfig.id) === 5) {
      this.createCombatFinishBarrier();
    }

    this.nextBoneGuardSpawnAt = this.time.now + 1800;
  }

  private createCombatTargetReticle() {
    if (
      !this.combatMode ||
      !this.weaponSpec ||
      (
        this.weaponSpec.projectileType !== "guided" &&
        this.weaponSpec.projectileType !== "homing"
      )
    ) {
      return;
    }

    const reticleColor =
      this.weaponSpec.projectileType === "homing"
        ? 0x65efff
        : 0xb39cff;

    this.combatTargetReticle = this.add
      .circle(0, 0, 48)
      .setStrokeStyle(3, reticleColor, 0.92)
      .setFillStyle(0x000000, 0)
      .setDepth(55)
      .setVisible(false);

    this.combatTargetReticleInner = this.add
      .circle(0, 0, 29)
      .setStrokeStyle(1, reticleColor, 0.62)
      .setFillStyle(0x000000, 0)
      .setDepth(55)
      .setVisible(false);

    this.combatTargetText = this.add
      .text(
        0,
        0,
        this.weaponSpec.projectileType === "homing"
          ? "LOCK"
          : "SEEK",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "9px",
          fontStyle: "bold",
          color:
            this.weaponSpec.projectileType === "homing"
              ? "#9ff8ff"
              : "#d6c5ff",
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(56)
      .setVisible(false);

    this.tweens.add({
      targets: [
        this.combatTargetReticle,
        this.combatTargetReticleInner,
      ],
      scale: 1.08,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private updateCombatTargetReticle() {
    if (
      !this.combatTargetReticle ||
      !this.combatTargetReticleInner ||
      !this.combatTargetText ||
      !this.weaponSpec ||
      !this.roverBody ||
      this.roverDisabled ||
      this.hasFinished
    ) {
      return;
    }

    const body =
      this.roverBody.body as MatterJS.BodyType | null;

    const facingAngle = body?.angle ?? 0;

    let target = this.findBoneGuardById(
      this.combatLockTargetId,
    );

    if (!target) {
      target = this.acquireWeaponTarget(
        this.weaponSpec,
        this.roverBody.x,
        this.roverBody.y,
        facingAngle,
      );

      this.combatLockTargetId = target?.id ?? null;
    }

    if (!target) {
      this.combatTargetReticle.setVisible(false);
      this.combatTargetReticleInner.setVisible(false);
      this.combatTargetText.setVisible(false);
      return;
    }

    const targetX = target.sprite.x;
    const targetY =
      target.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.53;

    this.combatTargetReticle
      .setVisible(true)
      .setPosition(targetX, targetY);

    this.combatTargetReticleInner
      .setVisible(true)
      .setPosition(targetX, targetY);

    this.combatTargetText
      .setVisible(true)
      .setPosition(targetX, targetY - 62);
  }

  private createBoneGuardAnimations() {
    if (!this.anims.exists("bone-guard-walk")) {
      this.anims.create({
        key: "bone-guard-walk",
        frames: this.anims.generateFrameNumbers("bone-guard", {
          start: 0,
          end: 3,
        }),
        frameRate: 7,
        repeat: -1,
      });
    }

    if (!this.anims.exists("bone-guard-fire")) {
      this.anims.create({
        key: "bone-guard-fire",
        frames: this.anims.generateFrameNumbers("bone-guard", {
          start: 4,
          end: 7,
        }),
        frameRate: 9,
        repeat: 0,
      });
    }

    if (!this.anims.exists("bone-guard-death")) {
      this.anims.create({
        key: "bone-guard-death",
        frames: this.anims.generateFrameNumbers("bone-guard", {
          start: 8,
          end: 11,
        }),
        frameRate: 7,
        repeat: 0,
      });
    }
  }

  private createBoneGuardBlasterTexture() {
    if (this.textures.exists(BONE_GUARD_BLASTER_TEXTURE)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0x6b31ff, 0.35);
    graphics.fillRoundedRect(0, 3, 46, 14, 7);
    graphics.fillStyle(0xd2b6ff, 1);
    graphics.fillRoundedRect(4, 7, 36, 6, 3);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillRoundedRect(8, 9, 26, 2, 1);
    graphics.generateTexture(BONE_GUARD_BLASTER_TEXTURE, 46, 20);
    graphics.destroy();
  }

  private createBoneGuardPortal() {
    const portalX = Math.max(
      this.levelConfig.start.x + 1200,
      this.levelConfig.finish.x - 260,
    );

    const preferredY = this.levelConfig.finish.y;
    const pose = this.getTerrainPoseAtX(portalX, preferredY);
    const surfaceY = pose?.y ?? preferredY;

    this.boneGuardPortalX = portalX;
    this.boneGuardPortalY = surfaceY;

    const container = this.add.container(
      portalX,
      surfaceY - 115,
    );

    const outerGlow = this.add
      .ellipse(0, 0, 168, 226, 0x7c31ff, 0.13)
      .setStrokeStyle(7, 0xa65cff, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD);

    const middleRing = this.add
      .ellipse(0, 0, 128, 190, 0x2a0a52, 0.48)
      .setStrokeStyle(4, 0x8b45ff, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD);

    const innerGlow = this.add
      .ellipse(0, 0, 82, 150, 0x4f1a96, 0.84)
      .setStrokeStyle(3, 0xd2a2ff, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD);

    const label = this.add
      .text(0, -132, "BONE GATE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#d9b9ff",
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    container.add([outerGlow, middleRing, innerGlow, label]);
    container.setDepth(14);

    this.tweens.add({
      targets: outerGlow,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.7,
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: innerGlow,
      scaleX: 0.9,
      scaleY: 1.04,
      alpha: 0.58,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.boneGuardPortal = container;
  }

  private updateBoneGuardCombat(delta: number) {
    if (
      !this.combatMode ||
      !this.roverBody ||
      this.roverDisabled ||
      this.hasFinished
    ) {
      return;
    }

    const now = this.time.now;
    const roverX = this.roverBody.x;

    let desiredPhase = 0;
    let spawnTarget = 0;

    // Approach: 2 guards.
    if (roverX >= 1050) {
      desiredPhase = 1;
      spawnTarget = 2;
    }

    // Fracture Pass: 2 more guards.
    if (roverX >= 3000) {
      desiredPhase = 2;
      spawnTarget = 4;
    }

    // Portal Assault: final 3 guards.
    if (roverX >= 5050) {
      desiredPhase = 3;
      spawnTarget = boneGuardCombatSpec.waveSize;
    }

    if (desiredPhase > this.boneGuardWavePhase) {
      this.boneGuardWavePhase = desiredPhase;
      this.boneGuardWaveStarted = desiredPhase > 0;
      this.nextBoneGuardSpawnAt = now + 350;

      if (desiredPhase === 1) {
        this.showStatusMessage(
          "FIRST CONTACT · BONE GUARDS INBOUND",
          "#cf9dff",
        );
      } else if (desiredPhase === 2) {
        this.showStatusMessage(
          "FRACTURE PASS · HOSTILES ADVANCING",
          "#cf9dff",
        );
      } else if (desiredPhase === 3) {
        this.showStatusMessage(
          "PORTAL ASSAULT · CLEAR THE GATE",
          "#ffb4ff",
        );
      }
    }

    if (
      this.boneGuardWaveStarted &&
      !this.boneGuardWaveComplete &&
      this.boneGuardsSpawned < spawnTarget &&
      this.getLivingBoneGuardCount() < boneGuardCombatSpec.maximumAlive &&
      now >= this.nextBoneGuardSpawnAt
    ) {
      this.spawnBoneGuard();
      this.nextBoneGuardSpawnAt =
        now + boneGuardCombatSpec.spawnIntervalMs;
    }

    const dt = delta / 1000;

    this.boneGuards.forEach((guard) => {
      if (
        guard.state === "dying" ||
        guard.state === "dead" ||
        !guard.sprite.active
      ) {
        return;
      }

      const horizontalDistance =
        guard.sprite.x - this.roverBody!.x;

      if (
        !guard.terrainBlocked &&
        horizontalDistance > boneGuardCombatSpec.stopRange
      ) {
        this.updateWalkingBoneGuard(guard, dt);
      } else {
        this.updateFiringBoneGuard(guard, now);
      }

      this.updateBoneGuardHealthBar(guard);
    });

    this.updateBoneGuardBlasterProjectiles(delta);
    this.updateCombatTargetReticle();

    if (
      !this.boneGuardWaveComplete &&
      this.boneGuardsSpawned >= boneGuardCombatSpec.waveSize &&
      this.boneGuardsDefeated >= boneGuardCombatSpec.waveSize
    ) {
      this.boneGuardWaveComplete = true;
      this.showStatusMessage(
        "BONE GATE SECURED · EXIT OPEN",
        "#8dffbf",
      );
      this.unlockCombatFinish();
    }
  }

  private createCombatFinishBarrier() {
    if (this.combatFinishBarrier) {
      return;
    }

    const barrierX = this.levelConfig.finish.x - 115;
    const pose = this.getTerrainPoseAtX(
      barrierX,
      this.levelConfig.finish.y,
    );

    const surfaceY = pose?.y ?? this.levelConfig.finish.y;
    const height = 500;
    const centreY = Math.max(120, surfaceY - height / 2);

    this.combatFinishBarrier = this.matter.add.rectangle(
      barrierX,
      centreY,
      34,
      height,
      {
        isStatic: true,
        label: "bone-gate-exit-barrier",
      },
    );

    this.combatFinishBarrierGlow = this.add
      .rectangle(
        barrierX,
        centreY,
        72,
        height,
        0x8f3dff,
        0.12,
      )
      .setDepth(28)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.combatFinishBarrierVisual = this.add
      .rectangle(
        barrierX,
        centreY,
        16,
        height,
        0xb36cff,
        0.82,
      )
      .setDepth(29)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.add
      .text(
        barrierX - 18,
        Math.max(85, surfaceY - height - 15),
        "BONE GATE LOCK",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          color: "#d7b7ff",
          letterSpacing: 2,
        },
      )
      .setOrigin(1, 0.5)
      .setDepth(30);

    this.tweens.add({
      targets: [
        this.combatFinishBarrierGlow,
        this.combatFinishBarrierVisual,
      ],
      alpha: { from: 0.45, to: 0.9 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private unlockCombatFinish() {
    if (this.combatFinishBarrier) {
      this.matter.world.remove(this.combatFinishBarrier);
      this.combatFinishBarrier = undefined;
    }

    const visuals = [
      this.combatFinishBarrierGlow,
      this.combatFinishBarrierVisual,
    ].filter(Boolean) as Phaser.GameObjects.Rectangle[];

    for (const visual of visuals) {
      this.tweens.killTweensOf(visual);
    }

    if (visuals.length > 0) {
      this.tweens.add({
        targets: visuals,
        alpha: 0,
        scaleX: 2.4,
        duration: 430,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.combatFinishBarrierGlow?.destroy();
          this.combatFinishBarrierGlow = undefined;
          this.combatFinishBarrierVisual?.destroy();
          this.combatFinishBarrierVisual = undefined;
        },
      });
    }
  }

  private spawnBoneGuard() {
    const spawnOffset = Phaser.Math.Between(-28, 28);
    const spawnX = this.boneGuardPortalX + spawnOffset;
    const pose =
      this.getBoneGuardTerrainPoseAtX(
        spawnX,
        this.boneGuardPortalY,
      ) ??
      this.getTerrainPoseAtX(
        spawnX,
        this.boneGuardPortalY,
      );

    const surfaceY = pose?.y ?? this.boneGuardPortalY;

    const sprite = this.add.sprite(
      spawnX,
      surfaceY + 4,
      "bone-guard",
      0,
    );

    sprite.setOrigin(0.5, 1);
    sprite.setDepth(34);
    sprite.setFlipX(false);

    const scale =
      BONE_GUARD_DISPLAY_HEIGHT / BONE_GUARD_FRAME_SIZE;
    sprite.setScale(scale);

    const healthBackground = this.add
      .rectangle(
        spawnX - 42,
        surfaceY - BONE_GUARD_DISPLAY_HEIGHT - 13,
        84,
        6,
        0x1d1730,
        0.9,
      )
      .setOrigin(0, 0.5)
      .setDepth(36);

    const healthFill = this.add
      .rectangle(
        spawnX - 42,
        surfaceY - BONE_GUARD_DISPLAY_HEIGHT - 13,
        84,
        6,
        0xb776ff,
        1,
      )
      .setOrigin(0, 0.5)
      .setDepth(37);

    const guard: BoneGuardEnemy = {
      id: this.nextBoneGuardId++,
      sprite,
      hp: boneGuardCombatSpec.maxHp,
      maxHp: boneGuardCombatSpec.maxHp,
      state: "walking",
      surfaceY,
      lastFireAt:
        this.time.now +
        Phaser.Math.Between(500, 1100) -
        boneGuardCombatSpec.fireCooldownMs,
      spawnPhase: Phaser.Math.Clamp(
        this.boneGuardWavePhase,
        1,
        3,
      ) as 1 | 2 | 3,
      terrainBlocked: false,
      healthBackground,
      healthFill,
    };

    sprite.play("bone-guard-walk");

    this.boneGuards.push(guard);
    this.boneGuardsSpawned += 1;

    const portalFlash = this.add
      .ellipse(
        this.boneGuardPortalX,
        this.boneGuardPortalY - 105,
        92,
        150,
        0xb56aff,
        0.48,
      )
      .setDepth(35)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: portalFlash,
      scaleX: 1.5,
      scaleY: 1.35,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => portalFlash.destroy(),
    });
  }

  private getLivingBoneGuardCount() {
    return this.boneGuards.filter(
      (guard) =>
        guard.state !== "dying" &&
        guard.state !== "dead" &&
        guard.sprite.active,
    ).length;
  }

  private updateWalkingBoneGuard(
    guard: BoneGuardEnemy,
    dt: number,
  ) {
    if (guard.state !== "walking") {
      guard.state = "walking";
      guard.sprite.play("bone-guard-walk", true);
    }

    const nextX =
      guard.sprite.x - boneGuardCombatSpec.moveSpeed * dt;

    const pose = this.getBoneGuardTerrainPoseAtX(
      nextX,
      guard.surfaceY,
    );

    if (!pose) {
      /*
       * Stop on the last supported blue pixel. Do not cross orange sections
       * or unsupported gaps, even if those surfaces still exist elsewhere in
       * the general terrain lookup.
       */
      guard.terrainBlocked = true;
      guard.state = "firing";
      guard.sprite.setRotation(0);
      guard.sprite.setFrame(4);
      guard.lastFireAt = Math.min(
        guard.lastFireAt,
        this.time.now -
          boneGuardCombatSpec.fireCooldownMs +
          220,
      );
      return;
    }

    guard.sprite.x = nextX;
    guard.surfaceY = pose.y;
    guard.sprite.y = pose.y + 4;

    guard.sprite.setRotation(
      Phaser.Math.Clamp(
        pose.angle * 0.22,
        -0.08,
        0.08,
      ),
    );
  }

  private updateFiringBoneGuard(
    guard: BoneGuardEnemy,
    now: number,
  ) {
    guard.sprite.setRotation(0);

    if (
      guard.state !== "firing" &&
      now - guard.lastFireAt < boneGuardCombatSpec.fireCooldownMs
    ) {
      guard.sprite.setFrame(4);
      return;
    }

    if (
      now - guard.lastFireAt <
      boneGuardCombatSpec.fireCooldownMs
    ) {
      return;
    }

    guard.lastFireAt = now;
    guard.state = "firing";
    guard.sprite.play("bone-guard-fire", true);

    this.time.delayedCall(170, () => {
      if (
        !guard.sprite.active ||
        guard.state === "dying" ||
        guard.state === "dead" ||
        !this.roverBody ||
        this.roverDisabled ||
        this.hasFinished
      ) {
        return;
      }

      this.fireBoneGuardBlaster(guard);
    });

    guard.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      () => {
        if (
          guard.state !== "dying" &&
          guard.state !== "dead" &&
          guard.sprite.active
        ) {
          guard.state = "firing";
          guard.sprite.setFrame(4);
        }
      },
    );
  }

  private fireBoneGuardBlaster(guard: BoneGuardEnemy) {
    if (!this.roverBody) {
      return;
    }

    const muzzleX = guard.sprite.x - 64;
    const muzzleY =
      guard.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.58;

    const targetX = this.roverBody.x + 25;
    const targetY = this.roverBody.y - 5;

    const directAngle = Phaser.Math.Angle.Between(
      muzzleX,
      muzzleY,
      targetX,
      targetY,
    );

    /*
     * Phase 5F: Bone Guard fire is deliberately not hitscan-perfect.
     * A small spread makes high-speed driving and jumping meaningful defensive
     * tools while preserving a clear threat from several guards at once.
     */
    const angle =
      directAngle +
      Phaser.Math.FloatBetween(
        -boneGuardCombatSpec.aimSpreadRadians,
        boneGuardCombatSpec.aimSpreadRadians,
      );

    const sprite = this.add
      .image(
        muzzleX,
        muzzleY,
        BONE_GUARD_BLASTER_TEXTURE,
      )
      .setDepth(45)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD);

    const speed = boneGuardCombatSpec.blasterSpeed;
    const phaseMultiplier =
      boneGuardCombatSpec.phaseDamageMultipliers[
        guard.spawnPhase - 1
      ] ?? 1;

    const phaseDamage = Math.max(
      1,
      Math.round(
        boneGuardCombatSpec.blasterDamage *
          phaseMultiplier,
      ),
    );

    this.boneGuardProjectiles.push({
      sprite,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      expiresAt:
        this.time.now + boneGuardCombatSpec.blasterLifetimeMs,
      damage: phaseDamage,
    });

    const flash = this.add
      .circle(muzzleX, muzzleY, 13, 0xcaa8ff, 0.92)
      .setDepth(46)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scale: 2.1,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy(),
    });
  }

  private updateBoneGuardBlasterProjectiles(delta: number) {
    if (
      this.boneGuardProjectiles.length === 0 ||
      !this.roverBody
    ) {
      return;
    }

    const dt = delta / 1000;
    const now = this.time.now;

    this.boneGuardProjectiles =
      this.boneGuardProjectiles.filter((projectile) => {
        if (!projectile.sprite.active) {
          return false;
        }

        projectile.sprite.x += projectile.velocityX * dt;
        projectile.sprite.y += projectile.velocityY * dt;

        const roverHit =
          Math.abs(projectile.sprite.x - this.roverBody!.x) < 92 &&
          Math.abs(projectile.sprite.y - this.roverBody!.y) < 66;

        if (roverHit) {
          this.applyRoverDamage(projectile.damage);

          const hit = this.add
            .circle(
              projectile.sprite.x,
              projectile.sprite.y,
              15,
              0xb37aff,
              0.78,
            )
            .setDepth(47)
            .setBlendMode(Phaser.BlendModes.ADD);

          this.tweens.add({
            targets: hit,
            scale: 2.2,
            alpha: 0,
            duration: 160,
            onComplete: () => hit.destroy(),
          });

          projectile.sprite.destroy();
          return false;
        }

        const expired = now >= projectile.expiresAt;
        const outside =
          projectile.sprite.x < -120 ||
          projectile.sprite.x > this.levelConfig.worldWidth + 120 ||
          projectile.sprite.y < -120 ||
          projectile.sprite.y > this.levelConfig.worldHeight + 120;

        if (expired || outside) {
          projectile.sprite.destroy();
          return false;
        }

        return true;
      });
  }

  private damageBoneGuard(
    guard: BoneGuardEnemy,
    damage: number,
  ) {
    if (
      guard.state === "dying" ||
      guard.state === "dead" ||
      damage <= 0
    ) {
      return;
    }

    const actualDamage = Math.min(
      guard.hp,
      Math.max(0, damage),
    );

    this.damageDealt += actualDamage;
    guard.hp = Math.max(0, guard.hp - damage);

    guard.sprite.setTintFill(0xf2d7ff);
    this.time.delayedCall(70, () => {
      if (
        guard.sprite.active &&
        guard.state !== "dying" &&
        guard.state !== "dead"
      ) {
        guard.sprite.clearTint();
      }
    });

    const impact = this.add
      .circle(
        guard.sprite.x - 18,
        guard.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.56,
        11,
        0x93eeff,
        0.82,
      )
      .setDepth(48)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: impact,
      scale: 2,
      alpha: 0,
      duration: 120,
      onComplete: () => impact.destroy(),
    });

    this.updateBoneGuardHealthBar(guard);

    if (guard.hp <= 0) {
      this.defeatBoneGuard(guard);
    }
  }

  private updateBoneGuardHealthBar(
    guard: BoneGuardEnemy,
  ) {
    if (
      !guard.sprite.active ||
      guard.state === "dead"
    ) {
      return;
    }

    const topY =
      guard.sprite.y - BONE_GUARD_DISPLAY_HEIGHT - 13;
    const leftX = guard.sprite.x - 42;

    guard.healthBackground.setPosition(leftX, topY);
    guard.healthFill.setPosition(leftX, topY);

    guard.healthFill.width =
      84 *
      Phaser.Math.Clamp(
        guard.hp / Math.max(1, guard.maxHp),
        0,
        1,
      );

    if (guard.hp / guard.maxHp <= 0.3) {
      guard.healthFill.setFillStyle(0xff759b, 1);
    } else {
      guard.healthFill.setFillStyle(0xb776ff, 1);
    }
  }

  private defeatBoneGuard(guard: BoneGuardEnemy) {
    if (
      guard.state === "dying" ||
      guard.state === "dead"
    ) {
      return;
    }

    guard.state = "dying";
    guard.healthBackground.setVisible(false);
    guard.healthFill.setVisible(false);
    guard.sprite.clearTint();
    guard.sprite.play("bone-guard-death", true);

    this.boneGuardsDefeated += 1;
    this.combatScore += boneGuardCombatSpec.defeatScore;

    if (this.combatLockTargetId === guard.id) {
      this.combatLockTargetId = null;
    }

    const deathPulse = this.add
      .circle(
        guard.sprite.x,
        guard.sprite.y - BONE_GUARD_DISPLAY_HEIGHT * 0.5,
        30,
        0x7d32c9,
        0.3,
      )
      .setDepth(33)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: deathPulse,
      scale: 2.3,
      alpha: 0,
      duration: 420,
      onComplete: () => deathPulse.destroy(),
    });

    guard.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      () => {
        if (!guard.sprite.active) {
          return;
        }

        guard.state = "dead";

        this.tweens.add({
          targets: guard.sprite,
          alpha: 0,
          duration: 600,
          delay: 220,
          onComplete: () => {
            guard.sprite.destroy();
            guard.healthBackground.destroy();
            guard.healthFill.destroy();
          },
        });
      },
    );
  }

  /**
   * Stage 5 Bone Guards will call this directly when a blaster bolt hits.
   * Phase 5A also exposes a browser CustomEvent with the same behaviour so the
   * shield/HP system can be tested before enemies are added:
   *
   * window.dispatchEvent(new CustomEvent("rover-combat-damage", {
   *   detail: { amount: 60 },
   * }));
   */
  private applyRoverDamage(amount: number) {
    if (
      !this.combatMode ||
      this.hasFinished ||
      this.roverDisabled ||
      amount <= 0
    ) {
      return;
    }

    this.lastCombatDamageAt = this.time.now;
    this.shieldRegenActive = false;
    this.shieldRegenAnnounced = false;

    const shieldBefore = this.roverShield;
    const absorbedByShield = Math.min(
      this.roverShield,
      amount,
    );

    this.roverShield = Math.max(
      0,
      this.roverShield - absorbedByShield,
    );

    const remainingDamage = Math.max(
      0,
      amount - absorbedByShield,
    );

    if (absorbedByShield > 0) {
      this.shieldDamageAbsorbed += absorbedByShield;
      this.damageReceived += absorbedByShield;
      this.showShieldImpact(absorbedByShield);
    }

    if (
      shieldBefore > 0 &&
      this.roverShield <= 0
    ) {
      this.showStatusMessage("SHIELD DOWN", "#ffbd72");
    }

    if (remainingDamage > 0) {
      /*
       * Phase 5E: rover identity now affects actual combat survivability.
       * Shield damage remains universal; hull armour only changes damage that
       * penetrates the shield.
       */
      const hullDamage = Math.max(
        1,
        Math.round(
          remainingDamage *
            this.combatStats.hullDamageMultiplier,
        ),
      );

      this.roverHp = Math.max(
        0,
        this.roverHp - hullDamage,
      );

      this.damageReceived += hullDamage;
      this.flashRoverDamage();

      if (
        this.combatStats.hullDamageMultiplier < 1 &&
        hullDamage < remainingDamage
      ) {
        const mitigated = Math.max(
          0,
          Math.round(remainingDamage - hullDamage),
        );

        if (mitigated > 0) {
          this.showStatusMessage(
            `ARMOUR ABSORBED ${mitigated}`,
            "#ffd98a",
          );
        }
      }
    }

    if (this.roverHp <= 0) {
      this.disableRover();
    }
  }

  private showShieldImpact(absorbedDamage: number) {
    if (!this.roverBody) {
      return;
    }

    const shield = this.add
      .ellipse(
        this.roverBody.x,
        this.roverBody.y,
        this.roverBodyDisplayWidth * 1.08,
        this.roverBodyDisplayHeight * 0.82,
        0x48dfff,
        0.08,
      )
      .setStrokeStyle(5, 0x76efff, 0.86)
      .setDepth(60)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: shield,
      scaleX: 1.1,
      scaleY: 1.15,
      alpha: 0,
      duration: 220,
      ease: "Cubic.easeOut",
      onComplete: () => shield.destroy(),
    });

    this.showStatusMessage(
      `SHIELD  -${Math.round(absorbedDamage)}`,
      "#84efff",
    );
  }

  private flashRoverDamage() {
    this.cameras.main.flash(90, 255, 72, 82, false, undefined, this);

    const visuals = [
      this.roverBodyVisual,
      ...this.roverWheelVisuals.map((wheel) => wheel.sprite),
    ].filter(Boolean) as Phaser.GameObjects.Image[];

    visuals.forEach((visual) => visual.setTint(0xff767d));

    this.time.delayedCall(120, () => {
      visuals.forEach((visual) => {
        if (visual.active) {
          visual.clearTint();
        }
      });
    });
  }

  private disableRover() {
    if (this.roverDisabled) {
      return;
    }

    this.roverDisabled = true;
    this.hasFinished = true;
    this.touchFire = false;
    this.touchBoost = false;

    if (this.roverBody) {
      this.roverBody.setVelocity(0, 0);
      this.roverBody.setAngularVelocity(0);
    }

    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(140, 255, 70, 70);
    this.showRoverDisabledOverlay();
  }

  private showRoverDisabledOverlay() {
    const overlay = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        720,
        330,
        0x050816,
        0.95,
      )
      .setStrokeStyle(2, 0xff6e78, 0.42)
      .setScrollFactor(0)
      .setDepth(220);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 88, "ROVER DISABLED", {
        fontFamily: "Arial, sans-serif",
        fontSize: "38px",
        fontStyle: "bold",
        color: "#ff969c",
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(221);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 18,
        "Your vehicle has lost all HP.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          color: "#d4dced",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(221);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 48,
        "Press R to restart the expedition.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          color: "#ffd76a",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(221);

    overlay.setInteractive();
  }

  private formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toFixed(1)
      .padStart(4, "0")}`;
  }

  private checkFinish() {
    if (!this.roverBody || !this.objectiveText || this.hasFinished) {
      return;
    }

    if (this.roverBody.x < this.levelConfig.finish.x) {
      return;
    }

    if (
      Number(this.levelConfig.id) === 5 &&
      !this.boneGuardWaveComplete
    ) {
      this.objectiveText
        .setText(
          `OBJECTIVE  DEFEAT BONE GUARDS · ${this.boneGuardsDefeated}/${boneGuardCombatSpec.waveSize}`,
        )
        .setColor("#e0b7ff");

      this.showStatusMessage(
        "EXIT SEALED · CLEAR THE BONE GATE",
        "#d8adff",
      );
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    this.hasFinished = true;
    this.completionScore = 2000;

    this.timeBonus = Math.max(
      0,
      Math.round(
        (this.levelConfig.timeLimitSeconds - this.elapsedSeconds) * 15,
      ),
    );

    if (this.combatMode) {
      const accuracy =
        this.shotsFired > 0
          ? this.shotsHit / this.shotsFired
          : 0;

      const hpRatio = Phaser.Math.Clamp(
        this.roverHp / Math.max(1, this.combatStats.maxHp),
        0,
        1,
      );

      const shieldRatio = Phaser.Math.Clamp(
        this.roverShield /
          Math.max(1, this.combatStats.maxShield),
        0,
        1,
      );

      /*
       * Accuracy rewards controlled fire without overwhelming the course score.
       * Survival rewards both hull preservation and intelligent shield use.
       */
      this.combatAccuracyBonus = Math.round(
        accuracy * 750,
      );

      this.combatSurvivalBonus = Math.round(
        hpRatio * 500 +
          shieldRatio * 350,
      );
    }

    this.updateScore();

    this.objectiveText
      .setText("OBJECTIVE  COURSE COMPLETE")
      .setColor("#8dffbf");

    this.roverBody.setVelocityX(Math.min(body.velocity.x, 2.2));

    this.showFinishResults();
    this.emitCourseCompleted();
  }

  private emitCourseCompleted() {
    window.dispatchEvent(
      new CustomEvent("rover-course-complete", {
        detail: {
          levelId: this.levelConfig.id,
          courseId: this.levelConfig.courseId,
          roverStage: this.roverStage,
          score: this.score,
          completionTimeMs: Math.max(1, Math.round(this.elapsedSeconds * 1000)),
          orbsCollected: this.collectedCount,
          checkpointsReached: this.reachedCheckpointCount,
          crashPenalty: this.crashPenalty,

          combatMode: this.combatMode,
          weaponLevel: this.weaponLevel,
          weaponName: this.weaponSpec?.name ?? null,
          boneGuardsDefeated: this.boneGuardsDefeated,
          shotsFired: this.shotsFired,
          shotsHit: this.shotsHit,
          accuracyPercent:
            this.shotsFired > 0
              ? Math.round(
                  (this.shotsHit / this.shotsFired) * 1000,
                ) / 10
              : 0,
          damageDealt: Math.round(this.damageDealt),
          damageReceived: Math.round(this.damageReceived),
          shieldDamageAbsorbed: Math.round(
            this.shieldDamageAbsorbed,
          ),
          remainingHp: Math.round(this.roverHp),
          maxHp: this.combatStats.maxHp,
          remainingShield: Math.round(this.roverShield),
          maxShield: this.combatStats.maxShield,
          combatScore: this.combatScore,
          accuracyBonus: this.combatAccuracyBonus,
          survivalBonus: this.combatSurvivalBonus,
        },
      }),
    );
  }

  private showFinishResults() {
    const isCombatResult = this.combatMode;

    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      isCombatResult ? 980 : 840,
      isCombatResult ? 650 : 550,
      0x050816,
      0.96,
    );

    overlay.setStrokeStyle(
      2,
      isCombatResult ? 0xb77cff : 0x7fffe5,
      0.42,
    );

    overlay.setScrollFactor(0);
    overlay.setDepth(200);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - (isCombatResult ? 270 : 210),
        isCombatResult
          ? "BONE GATE SECURED"
          : "COURSE COMPLETE",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: isCombatResult ? "40px" : "42px",
          fontStyle: "bold",
          color: isCombatResult ? "#e2c1ff" : "#baffdf",
          letterSpacing: 4,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - (isCombatResult ? 216 : 140),
        `FINAL SCORE  ${this.score.toLocaleString()}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "29px",
          fontStyle: "bold",
          color: "#ffffff",
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);

    if (isCombatResult) {
      const accuracy =
        this.shotsFired > 0
          ? (this.shotsHit / this.shotsFired) * 100
          : 0;

      const leftResults = [
        `Course time: ${this.formatTime(this.elapsedSeconds)}`,
        `Bone Guards: ${this.boneGuardsDefeated} / ${boneGuardCombatSpec.waveSize}`,
        `Shots fired: ${this.shotsFired}`,
        `Shots hit: ${this.shotsHit}`,
        `Accuracy: ${accuracy.toFixed(1)}%`,
        `Damage dealt: ${Math.round(this.damageDealt).toLocaleString()}`,
      ];

      const rightResults = [
        `Damage received: ${Math.round(this.damageReceived).toLocaleString()}`,
        `Shield absorbed: ${Math.round(this.shieldDamageAbsorbed).toLocaleString()}`,
        `HP remaining: ${Math.round(this.roverHp)} / ${this.combatStats.maxHp}`,
        `Shield remaining: ${Math.round(this.roverShield)} / ${this.combatStats.maxShield}`,
        `Accuracy bonus: +${this.combatAccuracyBonus.toLocaleString()}`,
        `Survival bonus: +${this.combatSurvivalBonus.toLocaleString()}`,
      ];

      this.add
        .text(
          GAME_WIDTH / 2 - 230,
          GAME_HEIGHT / 2 - 40,
          leftResults.join("\n"),
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "17px",
            color: "#d6dfef",
            align: "left",
            lineSpacing: 12,
          },
        )
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(201);

      this.add
        .text(
          GAME_WIDTH / 2 + 230,
          GAME_HEIGHT / 2 - 40,
          rightResults.join("\n"),
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "17px",
            color: "#d6dfef",
            align: "left",
            lineSpacing: 12,
          },
        )
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(201);

      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2 + 205,
          `${this.weaponSpec?.name ?? "No weapon"} · Combat +${(
            this.combatScore +
            this.combatAccuracyBonus +
            this.combatSurvivalBonus
          ).toLocaleString()} pts`,
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffd98a",
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);
    } else {
      const results = [
        `Course time: ${this.formatTime(this.elapsedSeconds)}`,
        `Distance points: ${this.distanceScore.toLocaleString()}`,
        `Energy orbs: ${this.collectedCount} / ${this.collectibles.length}  (+${this.collectibleScore.toLocaleString()})`,
        `Checkpoints: ${this.reachedCheckpointCount} / ${this.checkpoints.length}  (+${this.checkpointScore.toLocaleString()})`,
        `Completion bonus: +${this.completionScore.toLocaleString()}`,
        `Time bonus: +${this.timeBonus.toLocaleString()}`,
        `Crash penalties: -${this.crashPenalty.toLocaleString()}`,
      ];

      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2 + 25,
          results.join("\n"),
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "18px",
            color: "#c7d4e8",
            align: "center",
            lineSpacing: 11,
          },
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);
    }

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + (isCombatResult ? 280 : 235),
        "PRESS R TO RUN THE COURSE AGAIN",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          fontStyle: "bold",
          color: "#ffd76a",
          letterSpacing: 2,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);
  }

  private checkFall() {
    if (!this.roverBody) {
      return;
    }

    if (this.roverBody.y > this.levelConfig.worldHeight - 170) {
      const appliedPenalty = this.getCrashPenalty(150);
      this.crashPenalty += appliedPenalty;

      this.showStatusMessage(
        `COURSE FALL  -${appliedPenalty}`,
        "#ffb0b0",
      );

      this.respawnVehicle();
    }
  }

  private checkOverturned(delta: number) {
    if (!this.roverBody || this.hasFinished) {
      return;
    }

    const body = this.roverBody.body as MatterJS.BodyType | null;

    if (!body) {
      return;
    }

    const rotation = Math.abs(Phaser.Math.Angle.Wrap(this.roverBody.rotation));

    const badlyOverturned =
      rotation >
      Phaser.Math.DegToRad(
        Math.min(68, 48 * this.overturnToleranceMultiplier),
      );

    const movingSlowly =
      Math.abs(body.velocity.x) < 0.8 && Math.abs(body.velocity.y) < 0.8;

    const grounded = this.activeTerrainContacts.size > 0;

    if (badlyOverturned && movingSlowly && grounded) {
      this.overturnedTime += delta;
    } else {
      this.overturnedTime = 0;
    }

    if (this.overturnedTime >= 1500) {
      const appliedPenalty = this.getCrashPenalty(200);
      this.crashPenalty += appliedPenalty;

      this.showStatusMessage(
        `ROVER OVERTURNED  -${appliedPenalty}`,
        "#ffb0b0",
      );

      this.respawnVehicle();
    }
  }

  private respawnVehicle() {
    if (!this.roverBody) {
      return;
    }

    this.cameras.main.flash(180, 90, 120, 160);

    this.activeTerrainContacts.clear();
    this.resetCollapsibleTerrain();
    this.maximumAirborneDownwardVelocity = 0;
    this.airborneTime = 0;
    this.overturnedTime = 0;

    this.roverBody.setPosition(this.latestCheckpointX, this.latestCheckpointY);

    this.roverBody.setVelocity(0, 0);
    this.roverBody.setAngularVelocity(0);
    this.roverBody.setRotation(0);

    this.boostEnergy = Math.max(this.boostEnergy, 40);

    this.updateRoverVisuals(0);
  }
}

export default function PhaserGame({
  levelConfig,
  roverStage,
  roverName,
  roverBodySrc,
  roverFrontWheelSrc,
  roverBackWheelSrc,
  roverGameMode,
  weaponLevel,
  combatMode,
  combatStats,
  gameStats,
}: PhaserGameProps) {
  const gameContainerRef =
    useRef<HTMLDivElement | null>(null);

  const gameRef =
    useRef<Phaser.Game | null>(null);

  /*
   * Keep the newest props available for an intentional replay without
   * allowing ordinary React prop refreshes to destroy the current run.
   *
   * The old implementation placed levelConfig, roverStage, roverName,
   * roverBodySrc, roverFrontWheelSrc, roverBackWheelSrc, roverGameMode,
   * weaponLevel and gameStats in the Phaser creation effect dependency list. Any refreshed
   * object identity could therefore destroy Phaser.Game and create a new one.
   */
  const latestGamePropsRef =
    useRef<PhaserGameProps>({
      levelConfig,
      roverStage,
      roverName,
      roverBodySrc,
      roverFrontWheelSrc,
      roverBackWheelSrc,
      roverGameMode,
      weaponLevel,
      combatMode,
      combatStats,
      gameStats,
    });

  latestGamePropsRef.current = {
    levelConfig,
    roverStage,
    roverName,
    roverBodySrc,
    roverFrontWheelSrc,
    roverBackWheelSrc,
    roverGameMode,
    weaponLevel,
    combatMode,
    combatStats,
    gameStats,
  };

  const [gameVersion, setGameVersion] =
    useState(0);

  useEffect(() => {
    const handleRestartRequest = () => {
      /*
       * This is the ONLY normal in-page event that deliberately recreates
       * Phaser. It is used by the R key and the Replay button.
       */
      setGameVersion(
        (current) => current + 1,
      );
    };

    window.addEventListener(
      "rover-restart-requested",
      handleRestartRequest,
    );

    return () => {
      window.removeEventListener(
        "rover-restart-requested",
        handleRestartRequest,
      );
    };
  }, []);

  useEffect(() => {
    const container =
      gameContainerRef.current;

    if (!container) {
      return;
    }

    /*
     * A new game is created only when this component first mounts or when
     * gameVersion changes because the player intentionally requested Replay.
     *
     * Auth refreshes, focus changes, screenshots, balance refreshes and
     * progression revalidation do not change gameVersion and therefore cannot
     * restart the current run.
     */
    const currentProps =
      latestGamePropsRef.current;

    gameRef.current?.destroy(true);
    gameRef.current = null;

    const scene =
      new RoverMatterScene({
        levelConfig:
          currentProps.levelConfig,
        roverStage:
          currentProps.roverStage,
        roverName:
          currentProps.roverName,
        roverBodySrc:
          currentProps.roverBodySrc,
        roverFrontWheelSrc:
          currentProps.roverFrontWheelSrc,
        roverBackWheelSrc:
          currentProps.roverBackWheelSrc,
        roverGameMode:
          currentProps.roverGameMode,
        weaponLevel:
          currentProps.weaponLevel,
        combatMode:
          currentProps.combatMode,
        combatStats:
          currentProps.combatStats,
        gameStats:
          currentProps.gameStats,
      });

    const config:
      Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,

      width: GAME_WIDTH,
      height: GAME_HEIGHT,

      parent: container,

      backgroundColor: "#070a18",

      transparent: false,
      antialias: true,
      pixelArt: false,
      roundPixels: false,

      physics: {
        default: "matter",

        matter: {
          gravity: {
            x: 0,
            y: 1.15,
          },

          enableSleeping: false,
          debug: false,
        },
      },

      scale: {
        /*
         * Cover the complete game area while preserving the 1600×900 scene
         * aspect ratio. Any excess outer edge is cropped instead of leaving a
         * black side strip. The rover body and wheel layers receive the same
         * uniform canvas scale, so wheel alignment is preserved.
         */
        mode: Phaser.Scale.ENVELOP,

        autoCenter:
          Phaser.Scale.CENTER_BOTH,

        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },

      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
      },

      scene: [scene],
    };

    const game =
      new Phaser.Game(config);

    gameRef.current = game;

    /*
     * Resize only the Phaser scale manager. Resizing the browser, entering
     * fullscreen or returning from a screenshot must never recreate the game.
     */
    const resizeObserver =
      new ResizeObserver(() => {
        window.requestAnimationFrame(
          () => {
            if (
              gameRef.current === game
            ) {
              game.scale.refresh();
            }
          },
        );
      });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();

      /*
       * This cleanup now runs only for:
       * - intentional Replay (gameVersion change), or
       * - genuine React unmount/route navigation.
       */
      if (
        gameRef.current === game
      ) {
        game.destroy(true);
        gameRef.current = null;
      } else {
        game.destroy(true);
      }
    };
  }, [gameVersion]);

  return (
    <div
      ref={gameContainerRef}
      className="absolute inset-0 h-full w-full overflow-hidden bg-[#070a18]"
      aria-label="Rover Expedition game"
      style={{
        width: "100%",
        height: "100%",
        minWidth: "100%",
        minHeight: "100%",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    />
  );
}
