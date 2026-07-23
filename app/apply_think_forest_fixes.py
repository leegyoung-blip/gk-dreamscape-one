#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit(
        "Usage: python apply_think_forest_fixes.py path/to/PhaserGame.tsx"
    )

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str):
    global text
    if old not in text:
        raise SystemExit(
            f"Could not find the expected {label} block. "
            "Make sure this is the latest obstacle-enabled PhaserGame.tsx."
        )
    text = text.replace(old, new, 1)

replace_once(
'''import Phaser from "phaser";
''',
'''import Phaser from "phaser";
import {
  THINK_FOREST_LEVELS,
  type ThinkForestLevelNumber,
} from "./thinkForestLevels";
''',
"import",
)

replace_once(
'''const WORLD_WIDTH = 1672;
const WORLD_HEIGHT = 941;

const COURSE_ID = "uncharted-forest-01";
''',
'''/*
 * Change this to 2 whenever you want to test the Level 2 layout.
 * Level 2 currently reuses the first background until its own map PNG is added.
 */
const ACTIVE_LEVEL: ThinkForestLevelNumber = 1;
const LEVEL_CONFIG = THINK_FOREST_LEVELS[ACTIVE_LEVEL];

const WORLD_WIDTH = LEVEL_CONFIG.worldWidth;
const WORLD_HEIGHT = LEVEL_CONFIG.worldHeight;

const COURSE_ID = LEVEL_CONFIG.courseId;
''',
"level constants",
)

replace_once(
'''  background: "/games/think-forest/forest-floor-bg.png",
''',
'''  background: LEVEL_CONFIG.background,
''',
"background path",
)

replace_once(
'''  entering: boolean;
};
''',
'''  entering: boolean;
  avoidanceX: number;
  avoidanceY: number;
  avoidUntil: number;
  lastPositionX: number;
  lastPositionY: number;
  stuckForMs: number;
};
''',
"BoneGuardData fields",
)

old_obstacles = '''    const obstacles = [
      {
        texture: "large-rocks",
        x: 430,
        y: 235,
        width: 210,
        height: 180,
        bodyWidth: 150,
        bodyHeight: 92,
      },
      {
        texture: "large-rocks",
        x: 770,
        y: 660,
        width: 225,
        height: 192,
        bodyWidth: 160,
        bodyHeight: 98,
      },
      {
        texture: "large-rocks",
        x: 1110,
        y: 260,
        width: 205,
        height: 176,
        bodyWidth: 148,
        bodyHeight: 90,
      },
      {
        texture: "root-barrier",
        x: 600,
        y: 450,
        width: 310,
        height: 150,
        bodyWidth: 278,
        bodyHeight: 88,
      },
      {
        texture: "root-barrier",
        x: 1000,
        y: 485,
        width: 320,
        height: 154,
        bodyWidth: 288,
        bodyHeight: 90,
      },
      {
        texture: "root-barrier",
        x: 1275,
        y: 735,
        width: 290,
        height: 140,
        bodyWidth: 260,
        bodyHeight: 80,
      },
    ];
'''
replace_once(old_obstacles, '''    const obstacles = LEVEL_CONFIG.obstacles;
''', "obstacle list")

replace_once(
'''    const nova = this.physics.add.sprite(
      145,
      WORLD_HEIGHT / 2,
      "nova-idle",
      8,
    );
''',
'''    const nova = this.physics.add.sprite(
      LEVEL_CONFIG.novaSpawn.x,
      LEVEL_CONFIG.novaSpawn.y,
      "nova-idle",
      8,
    );
''',
"Nova spawn",
)

replace_once(
'''    nova.play("nova-idle-right");
    this.nova = nova;
''',
'''    this.nova = nova;
    this.showStaticNovaIdleFrame();
''',
"Nova initial idle",
)

old_guard_entries = '''    const guardEntries = [
      { y: 185, targetX: 1110, delay: 450 },
      { y: 325, targetX: 1160, delay: 1350 },
      { y: 470, targetX: 1090, delay: 2250 },
      { y: 615, targetX: 1175, delay: 3150 },
      { y: 770, targetX: 1125, delay: 4050 },
    ];
'''
replace_once(old_guard_entries, '''    const guardEntries = LEVEL_CONFIG.guardEntries;
''', "guard entry list")

replace_once(
'''      const spawnX = GAME_WIDTH + 95;
''',
'''      const spawnX = WORLD_WIDTH + 95;
''',
"guard spawn X",
)

replace_once(
'''        active: false,
        entering: true,
      };
''',
'''        active: false,
        entering: true,
        avoidanceX: 0,
        avoidanceY: 0,
        avoidUntil: 0,
        lastPositionX: spawnX,
        lastPositionY: entry.y,
        stuckForMs: 0,
      };
''',
"guard avoidance defaults",
)

replace_once(
'''    if (this.boneGuardGroup) {
      this.physics.add.collider(this.boneGuardGroup, this.obstacleGroup);
    }
''',
'''    if (this.boneGuardGroup) {
      this.physics.add.collider(
        this.boneGuardGroup,
        this.obstacleGroup,
        (guardObject, obstacleObject) => {
          this.turnBoneGuardAroundObstacle(
            guardObject as Phaser.Physics.Arcade.Sprite,
            obstacleObject as Phaser.Physics.Arcade.Image,
          );
        },
      );
    }
''',
"guard obstacle collider",
)

replace_once(
'''    const positions = [
      { x: 390, y: 745 },
      { x: 860, y: 175 },
      { x: 1270, y: 610 },
    ];
''',
'''    const positions = LEVEL_CONFIG.energyCores;
''',
"energy core positions",
)

replace_once(
'''    const x = WORLD_WIDTH - 132;
    const y = WORLD_HEIGHT / 2;
''',
'''    const x = LEVEL_CONFIG.exit.x;
    const y = LEVEL_CONFIG.exit.y;
''',
"exit position",
)

replace_once(
'''      .text(46, 40, "UNCHARTED FOREST", {
''',
'''      .text(
        46,
        40,
        `${LEVEL_CONFIG.title.toUpperCase()} · LEVEL ${LEVEL_CONFIG.level}`,
        {
''',
"HUD level title start",
)

replace_once(
'''        letterSpacing: 3,
      })
      .setScrollFactor(0)
''',
'''          letterSpacing: 3,
        },
      )
      .setScrollFactor(0)
''',
"HUD level title end",
)

replace_once(
'''      this.facing = this.directionFromVector(movement.x, movement.y);
      this.nova.play(`nova-walk-${this.facing}`, true);
    } else {
      this.nova.setVelocity(0, 0);
      this.nova.play(`nova-idle-${this.facing}`, true);
    }
  }

  private updateNovaAttack() {
''',
'''      this.facing = this.directionFromVector(movement.x, movement.y);
      this.nova.play(`nova-walk-${this.facing}`, true);
      this.applyNovaWalkCrop();
    } else {
      this.nova.setVelocity(0, 0);
      this.showStaticNovaIdleFrame();
    }
  }

  /*
   * Keep Nova completely still while idle by using one frame instead of
   * looping the generated idle animation.
   */
  private showStaticNovaIdleFrame() {
    if (!this.nova) {
      return;
    }

    const frameByDirection: Record<FacingDirection, number> = {
      down: 0,
      left: 4,
      right: 8,
      up: 12,
    };

    this.nova.stop();
    this.nova.clearCrop();
    this.nova.setTexture("nova-idle", frameByDirection[this.facing]);
  }

  /*
   * The bottom strip of the generated right/up walk rows contains a small
   * piece of neighbouring art. Crop only those two directions.
   */
  private applyNovaWalkCrop() {
    if (!this.nova) {
      return;
    }

    if (this.facing === "right" || this.facing === "up") {
      this.nova.setCrop(0, 0, 256, 232);
    } else {
      this.nova.clearCrop();
    }
  }

  private updateNovaAttack() {
''',
"Nova movement and idle",
)

replace_once(
'''        this.nova?.play(`nova-idle-${this.facing}`, true);
''',
'''        this.showStaticNovaIdleFrame();
''',
"post-attack idle",
)

replace_once(
'''      if (guard.entering) {
''',
'''      if (this.time.now < guard.avoidUntil) {
        guard.sprite.setVelocity(guard.avoidanceX, guard.avoidanceY);
        guard.facing = this.directionFromVector(
          guard.avoidanceX,
          guard.avoidanceY,
        );
        guard.sprite.play(`bone-walk-${guard.facing}`, true);
        this.updateGuardStuckState(guard, delta);
        return;
      }

      if (guard.entering) {
''',
"guard avoidance movement",
)

replace_once(
'''        guard.sprite.play(`bone-walk-${guard.facing}`, true);
        return;
      }

      guard.patrolAngle += guard.patrolDirection * (delta / 1000) * 0.75;
''',
'''        guard.sprite.play(`bone-walk-${guard.facing}`, true);
        this.updateGuardStuckState(guard, delta);
        return;
      }

      guard.patrolAngle += guard.patrolDirection * (delta / 1000) * 0.75;
''',
"chase stuck tracking",
)

replace_once(
'''        guard.sprite.play(`bone-walk-${guard.facing}`, true);
      } else {
        guard.sprite.setVelocity(0, 0);
        guard.sprite.play(`bone-idle-${guard.facing}`, true);
      }
    });
  }

  private attackNova(guard: BoneGuardData) {
''',
'''        guard.sprite.play(`bone-walk-${guard.facing}`, true);
        this.updateGuardStuckState(guard, delta);
      } else {
        guard.sprite.setVelocity(0, 0);
        guard.sprite.play(`bone-idle-${guard.facing}`, true);
        guard.stuckForMs = 0;
        guard.lastPositionX = guard.sprite.x;
        guard.lastPositionY = guard.sprite.y;
      }
    });
  }

  private turnBoneGuardAroundObstacle(
    sprite: Phaser.Physics.Arcade.Sprite,
    obstacle: Phaser.Physics.Arcade.Image,
  ) {
    const guard = this.boneGuards.find((entry) => entry.sprite === sprite);

    if (
      !guard ||
      !guard.active ||
      guard.defeated ||
      this.time.now < guard.avoidUntil - 300
    ) {
      return;
    }

    const away = new Phaser.Math.Vector2(
      sprite.x - obstacle.x,
      sprite.y - obstacle.y,
    );

    if (away.lengthSq() < 0.01) {
      away.set(
        guard.patrolDirection > 0 ? 1 : -1,
        guard.patrolDirection > 0 ? -1 : 1,
      );
    }

    away.normalize();

    const tangent =
      guard.patrolDirection > 0
        ? new Phaser.Math.Vector2(-away.y, away.x)
        : new Phaser.Math.Vector2(away.y, -away.x);

    tangent.normalize().scale(BONE_GUARD_SPEED);

    guard.avoidanceX = tangent.x;
    guard.avoidanceY = tangent.y;
    guard.avoidUntil = this.time.now + 850;
    guard.patrolDirection *= -1;
    guard.stuckForMs = 0;

    sprite.setVelocity(tangent.x, tangent.y);
    guard.facing = this.directionFromVector(tangent.x, tangent.y);
    sprite.play(`bone-walk-${guard.facing}`, true);
  }

  private updateGuardStuckState(guard: BoneGuardData, delta: number) {
    const moved = Phaser.Math.Distance.Between(
      guard.lastPositionX,
      guard.lastPositionY,
      guard.sprite.x,
      guard.sprite.y,
    );

    const body = guard.sprite.body as Phaser.Physics.Arcade.Body;
    const isTryingToMove = body.velocity.lengthSq() > 100;

    if (isTryingToMove && moved < 0.7) {
      guard.stuckForMs += delta;
    } else {
      guard.stuckForMs = 0;
    }

    guard.lastPositionX = guard.sprite.x;
    guard.lastPositionY = guard.sprite.y;

    if (guard.stuckForMs < 260 || this.time.now < guard.avoidUntil) {
      return;
    }

    const current = new Phaser.Math.Vector2(
      body.velocity.x || (guard.patrolDirection > 0 ? 1 : -1),
      body.velocity.y,
    );

    if (current.lengthSq() < 0.01) {
      current.set(1, guard.patrolDirection);
    }

    current.normalize();

    const turned =
      guard.patrolDirection > 0
        ? new Phaser.Math.Vector2(-current.y, current.x)
        : new Phaser.Math.Vector2(current.y, -current.x);

    turned.normalize().scale(BONE_GUARD_SPEED);

    guard.avoidanceX = turned.x;
    guard.avoidanceY = turned.y;
    guard.avoidUntil = this.time.now + 700;
    guard.patrolDirection *= -1;
    guard.stuckForMs = 0;
  }

  private attackNova(guard: BoneGuardData) {
''',
"guard obstacle methods",
)

backup = path.with_suffix(path.suffix + ".before-level-fixes")
backup.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
path.write_text(text, encoding="utf-8")

print(f"Updated: {path}")
print(f"Backup:  {backup}")
print("Current active level: 1")
