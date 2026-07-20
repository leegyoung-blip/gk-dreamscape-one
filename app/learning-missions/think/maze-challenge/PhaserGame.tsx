"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import type { ThinkMazeAbilities } from "@/lib/thinkGearProgress";

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 800;
const GRID_COLUMNS = 25;
const GRID_ROWS = 15;
const CELL_SIZE = 44;
const GRID_OFFSET_X = 50;
const GRID_OFFSET_Y = 90;
const COURSE_ID = "logic-maze-01";
const REQUIRED_CORES = 3;
const REQUIRED_PUZZLES = 3;

const PUZZLE_DATA = [
  {
    question: "Which symbol completes the pattern: ▲ ● ▲ ● ?",
    options: ["▲", "■", "◆"],
    correctIndex: 0,
  },
  {
    question: "A gate flashes 2, 4, 8, 16. What comes next?",
    options: ["18", "24", "32"],
    correctIndex: 2,
  },
  {
    question: "All blue crystals glow. This crystal is blue. What must be true?",
    options: [
      "It glows",
      "It is the largest crystal",
      "It opens every gate",
    ],
    correctIndex: 0,
  },
];

type GridCell = {
  column: number;
  row: number;
};

type CoreItem = GridCell & {
  sprite: Phaser.Physics.Arcade.Image;
  collected: boolean;
};

type ClueItem = GridCell & {
  sprite: Phaser.Physics.Arcade.Image;
  collected: boolean;
};

type PuzzleItem = GridCell & {
  sprite: Phaser.Physics.Arcade.Image;
  label: Phaser.GameObjects.Text;
  question: string;
  options: string[];
  correctIndex: number;
  solved: boolean;
};

type TrapItem = GridCell & {
  sprite: Phaser.Physics.Arcade.Image;
  triggered: boolean;
};

type ThinkMazeCompleteDetail = {
  runId: string;
  courseId: string;
  gearStage: number;
  score: number;
  completionTimeMs: number;
  coresCollected: number;
  cluesCollected: number;
  puzzlesSolved: number;
  mistakes: number;
  trapsTriggered: number;
};

export type PhaserGameProps = {
  gearStage: number;
  gearName: string;
  abilities: ThinkMazeAbilities;
};

function seededRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function generateMaze(columns: number, rows: number) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => 1),
  );
  const random = seededRandom(20260720);
  const stack: GridCell[] = [{ column: 1, row: 1 }];
  grid[1][1] = 0;

  const directions = [
    { column: 0, row: -2 },
    { column: 2, row: 0 },
    { column: 0, row: 2 },
    { column: -2, row: 0 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = shuffle(directions, random).filter((direction) => {
      const nextColumn = current.column + direction.column;
      const nextRow = current.row + direction.row;

      return (
        nextColumn > 0 &&
        nextColumn < columns - 1 &&
        nextRow > 0 &&
        nextRow < rows - 1 &&
        grid[nextRow][nextColumn] === 1
      );
    });

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const direction = candidates[0];
    const nextColumn = current.column + direction.column;
    const nextRow = current.row + direction.row;
    const wallColumn = current.column + direction.column / 2;
    const wallRow = current.row + direction.row / 2;

    grid[wallRow][wallColumn] = 0;
    grid[nextRow][nextColumn] = 0;
    stack.push({ column: nextColumn, row: nextRow });
  }

  return grid;
}

function cellKey(column: number, row: number) {
  return `${column}:${row}`;
}

class ThinkMazeScene extends Phaser.Scene {
  private readonly gearStage: number;
  private readonly gearName: string;
  private readonly initialAbilities: ThinkMazeAbilities;

  private mazeGrid: number[][] = [];
  private wallGroup?: Phaser.Physics.Arcade.StaticGroup;
  private wallByCell = new Map<string, Phaser.Physics.Arcade.Image>();
  private player?: Phaser.Physics.Arcade.Image;
  private exit?: Phaser.Physics.Arcade.Image;

  private coreGroup?: Phaser.Physics.Arcade.StaticGroup;
  private clueGroup?: Phaser.Physics.Arcade.StaticGroup;
  private puzzleGroup?: Phaser.Physics.Arcade.StaticGroup;
  private trapGroup?: Phaser.Physics.Arcade.StaticGroup;

  private cores: CoreItem[] = [];
  private clues: ClueItem[] = [];
  private puzzles: PuzzleItem[] = [];
  private traps: TrapItem[] = [];

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyE?: Phaser.Input.Keyboard.Key;
  private keyR?: Phaser.Input.Keyboard.Key;
  private keyOne?: Phaser.Input.Keyboard.Key;
  private keyTwo?: Phaser.Input.Keyboard.Key;
  private keyThree?: Phaser.Input.Keyboard.Key;
  private keyFour?: Phaser.Input.Keyboard.Key;
  private keyFive?: Phaser.Input.Keyboard.Key;
  private keyOptionOne?: Phaser.Input.Keyboard.Key;
  private keyOptionTwo?: Phaser.Input.Keyboard.Key;
  private keyOptionThree?: Phaser.Input.Keyboard.Key;

  private touchUp = false;
  private touchDown = false;
  private touchLeft = false;
  private touchRight = false;

  private elapsedMilliseconds = 0;
  private hasStarted = false;
  private hasFinished = false;
  private coresCollected = 0;
  private cluesCollected = 0;
  private puzzlesSolved = 0;
  private mistakes = 0;
  private trapsTriggered = 0;

  private logicLensCharges = 0;
  private scannerCharges = 0;
  private compassCharges = 0;
  private shieldCharges = 0;
  private wrenchCharges = 0;
  private sparkCharges = 0;

  private logicLensUntil = 0;
  private scannerUntil = 0;
  private compassUntil = 0;
  private scannerGraphics?: Phaser.GameObjects.Graphics;
  private compassGraphics?: Phaser.GameObjects.Graphics;

  private activePuzzle: PuzzleItem | null = null;
  private puzzleOverlay?: Phaser.GameObjects.Container;
  private puzzleFeedbackText?: Phaser.GameObjects.Text;
  private sparkHintText?: Phaser.GameObjects.Text;
  private nearbyPuzzle: PuzzleItem | null = null;

  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private gearText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private toolText?: Phaser.GameObjects.Text;

  constructor({ gearStage, gearName, abilities }: PhaserGameProps) {
    super({ key: "ThinkMazeScene" });
    this.gearStage = gearStage;
    this.gearName = gearName;
    this.initialAbilities = { ...abilities };
  }

  create() {
    this.resetRunValues();
    this.createTextures();
    this.createBackground();
    this.createMaze();
    this.createPlayer();
    this.createObjectives();
    this.createInput();
    this.createInterface();
    this.createTouchControls();
    this.createCollisions();
    this.cameras.main.fadeIn(350, 4, 10, 24);
  }

  update(_time: number, delta: number) {
    if (!this.player || this.hasFinished) return;

    if (this.activePuzzle) {
      this.player.setVelocity(0, 0);
      this.handlePuzzleKeyboard();
      this.updateInterface();
      return;
    }

    this.handleMovement();
    this.handleActions();
    this.updateTimer(delta);
    this.updateNearbyPuzzle();
    this.updateHiddenClues();
    this.updateScanner();
    this.updateCompass();
    this.updateInterface();
  }

  private resetRunValues() {
    this.mazeGrid = generateMaze(GRID_COLUMNS, GRID_ROWS);
    this.wallByCell.clear();
    this.cores = [];
    this.clues = [];
    this.puzzles = [];
    this.traps = [];

    this.elapsedMilliseconds = 0;
    this.hasStarted = false;
    this.hasFinished = false;
    this.coresCollected = 0;
    this.cluesCollected = 0;
    this.puzzlesSolved = 0;
    this.mistakes = 0;
    this.trapsTriggered = 0;

    this.logicLensCharges = this.initialAbilities.logicLensCharges;
    this.scannerCharges = this.initialAbilities.scannerCharges;
    this.compassCharges = this.initialAbilities.compassCharges;
    this.shieldCharges = this.initialAbilities.shieldCharges;
    this.wrenchCharges = this.initialAbilities.wrenchCharges;
    this.sparkCharges = this.initialAbilities.sparkCharges;

    this.logicLensUntil = 0;
    this.scannerUntil = 0;
    this.compassUntil = 0;
    this.activePuzzle = null;
    this.nearbyPuzzle = null;
    this.touchUp = false;
    this.touchDown = false;
    this.touchLeft = false;
    this.touchRight = false;
  }

  private createTextures() {
    const createRectangleTexture = (
      key: string,
      width: number,
      height: number,
      color: number,
      alpha = 1,
    ) => {
      if (this.textures.exists(key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(color, alpha);
      graphics.fillRoundedRect(0, 0, width, height, Math.min(width, height) / 5);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    };

    const createCircleTexture = (
      key: string,
      size: number,
      color: number,
      ringColor?: number,
    ) => {
      if (this.textures.exists(key)) return;
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(color, 1);
      graphics.fillCircle(size / 2, size / 2, size * 0.36);
      if (ringColor !== undefined) {
        graphics.lineStyle(3, ringColor, 1);
        graphics.strokeCircle(size / 2, size / 2, size * 0.43);
      }
      graphics.generateTexture(key, size, size);
      graphics.destroy();
    };

    createRectangleTexture("maze-wall", CELL_SIZE - 2, CELL_SIZE - 2, 0x15345c);
    createCircleTexture("maze-player", 32, 0x60f0d0, 0xffffff);
    createCircleTexture("maze-core", 28, 0xffd76a, 0xffffff);
    createCircleTexture("maze-clue", 22, 0x7ee8ff, 0xffffff);
    createRectangleTexture("maze-puzzle", 30, 30, 0xb58cff);
    createRectangleTexture("maze-trap", 28, 28, 0xef476f, 0.88);
    createRectangleTexture("maze-exit", 34, 34, 0x22c55e);
  }

  private createBackground() {
    this.cameras.main.setBackgroundColor("#050914");

    const background = this.add.graphics();
    background.fillGradientStyle(0x07111f, 0x07111f, 0x0b1930, 0x0b1930, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    background.lineStyle(1, 0x60f0d0, 0.06);
    for (let x = 0; x <= GAME_WIDTH; x += 40) {
      background.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y <= GAME_HEIGHT; y += 40) {
      background.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createMaze() {
    this.wallGroup = this.physics.add.staticGroup();

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        if (this.mazeGrid[row][column] !== 1) continue;

        const position = this.cellToWorld(column, row);
        const wall = this.wallGroup.create(
          position.x,
          position.y,
          "maze-wall",
        ) as Phaser.Physics.Arcade.Image;

        wall.setTint(row % 2 === 0 ? 0x163b68 : 0x123158);
        wall.refreshBody();
        this.wallByCell.set(cellKey(column, row), wall);
      }
    }
  }

  private createPlayer() {
    const start = this.cellToWorld(1, 1);
    this.player = this.physics.add.image(start.x, start.y, "maze-player");
    this.player.setCircle(13);
    this.player.setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(900, 900);
    this.player.setMaxVelocity(250, 250);

    this.add
      .text(start.x, start.y - 24, "NOVA", {
        fontFamily: "Arial",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#b9fff0",
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setData("followPlayer", true);
  }

  private createObjectives() {
    const start = { column: 1, row: 1 };
    const exitCell = { column: GRID_COLUMNS - 2, row: GRID_ROWS - 2 };
    const openCells = this.getOpenCells().filter(
      (cell) =>
        cellKey(cell.column, cell.row) !== cellKey(start.column, start.row) &&
        cellKey(cell.column, cell.row) !==
          cellKey(exitCell.column, exitCell.row),
    );

    const pathToExit = this.findPath(start, exitCell);
    const reserved = new Set<string>([
      cellKey(start.column, start.row),
      cellKey(exitCell.column, exitCell.row),
    ]);

    this.coreGroup = this.physics.add.staticGroup();
    this.clueGroup = this.physics.add.staticGroup();
    this.puzzleGroup = this.physics.add.staticGroup();
    this.trapGroup = this.physics.add.staticGroup();

    const pathIndexes = [0.26, 0.52, 0.76].map((fraction) =>
      Math.min(
        pathToExit.length - 2,
        Math.max(1, Math.floor(pathToExit.length * fraction)),
      ),
    );

    for (const pathIndex of pathIndexes) {
      const cell = pathToExit[pathIndex];
      const key = cellKey(cell.column, cell.row);
      if (reserved.has(key)) continue;
      reserved.add(key);
      this.addCore(cell);
    }

    const random = seededRandom(9102026);
    const candidates = shuffle(
      openCells.filter((cell) => !reserved.has(cellKey(cell.column, cell.row))),
      random,
    );

    for (let index = 0; index < REQUIRED_PUZZLES; index += 1) {
      const cell = this.takeSeparatedCell(candidates, reserved, 3);
      if (!cell) break;
      reserved.add(cellKey(cell.column, cell.row));
      this.addPuzzle(cell, PUZZLE_DATA[index]);
    }

    for (let index = 0; index < 6; index += 1) {
      const cell = this.takeSeparatedCell(candidates, reserved, 2);
      if (!cell) break;
      reserved.add(cellKey(cell.column, cell.row));
      this.addClue(cell);
    }

    for (let index = 0; index < 5; index += 1) {
      const cell = this.takeSeparatedCell(candidates, reserved, 2);
      if (!cell) break;
      reserved.add(cellKey(cell.column, cell.row));
      this.addTrap(cell);
    }

    const exitPosition = this.cellToWorld(exitCell.column, exitCell.row);
    this.exit = this.physics.add.staticImage(
      exitPosition.x,
      exitPosition.y,
      "maze-exit",
    );
    this.exit.setDepth(7);
    this.exit.setTint(0x64748b);

    this.add
      .text(exitPosition.x, exitPosition.y - 27, "EXIT", {
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#cbd5e1",
      })
      .setOrigin(0.5)
      .setDepth(8);
  }

  private takeSeparatedCell(
    candidates: GridCell[],
    reserved: Set<string>,
    minimumDistance: number,
  ) {
    while (candidates.length > 0) {
      const candidate = candidates.shift();
      if (!candidate) return null;
      const key = cellKey(candidate.column, candidate.row);
      if (reserved.has(key)) continue;

      const tooClose = Array.from(reserved).some((reservedKey) => {
        const [column, row] = reservedKey.split(":").map(Number);
        return (
          Math.abs(column - candidate.column) +
            Math.abs(row - candidate.row) <
          minimumDistance
        );
      });

      if (!tooClose) return candidate;
    }

    return null;
  }

  private addCore(cell: GridCell) {
    if (!this.coreGroup) return;
    const position = this.cellToWorld(cell.column, cell.row);
    const sprite = this.coreGroup.create(
      position.x,
      position.y,
      "maze-core",
    ) as Phaser.Physics.Arcade.Image;
    sprite.setDepth(8);
    sprite.setData("cellKey", cellKey(cell.column, cell.row));
    this.cores.push({ ...cell, sprite, collected: false });
  }

  private addClue(cell: GridCell) {
    if (!this.clueGroup) return;
    const position = this.cellToWorld(cell.column, cell.row);
    const sprite = this.clueGroup.create(
      position.x,
      position.y,
      "maze-clue",
    ) as Phaser.Physics.Arcade.Image;
    sprite.setDepth(8);
    sprite.setAlpha(0.12);
    sprite.setData("cellKey", cellKey(cell.column, cell.row));
    this.clues.push({ ...cell, sprite, collected: false });
  }

  private addPuzzle(
    cell: GridCell,
    puzzleData: (typeof PUZZLE_DATA)[number],
  ) {
    if (!this.puzzleGroup) return;
    const position = this.cellToWorld(cell.column, cell.row);
    const sprite = this.puzzleGroup.create(
      position.x,
      position.y,
      "maze-puzzle",
    ) as Phaser.Physics.Arcade.Image;
    sprite.setDepth(8);
    sprite.setData("cellKey", cellKey(cell.column, cell.row));

    const label = this.add
      .text(position.x, position.y, "?", {
        fontFamily: "Arial",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(9);

    this.puzzles.push({
      ...cell,
      sprite,
      label,
      question: puzzleData.question,
      options: puzzleData.options,
      correctIndex: puzzleData.correctIndex,
      solved: false,
    });
  }

  private addTrap(cell: GridCell) {
    if (!this.trapGroup) return;
    const position = this.cellToWorld(cell.column, cell.row);
    const sprite = this.trapGroup.create(
      position.x,
      position.y,
      "maze-trap",
    ) as Phaser.Physics.Arcade.Image;
    sprite.setDepth(6);
    sprite.setAlpha(0.35);
    sprite.setAngle(45);
    sprite.setData("cellKey", cellKey(cell.column, cell.row));
    this.traps.push({ ...cell, sprite, triggered: false });
  }

  private createInput() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyOne = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyTwo = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keyThree = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.THREE,
    );
    this.keyFour = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.FOUR,
    );
    this.keyFive = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.FIVE,
    );
    this.keyOptionOne = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
    );
    this.keyOptionTwo = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
    );
    this.keyOptionThree = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
    );

    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.E,
      Phaser.Input.Keyboard.KeyCodes.R,
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
    ]);
  }

  private createInterface() {
    this.add
      .rectangle(GAME_WIDTH / 2, 41, GAME_WIDTH - 28, 68, 0x050914, 0.9)
      .setStrokeStyle(1, 0x60f0d0, 0.18)
      .setDepth(30);

    this.objectiveText = this.add
      .text(28, 18, "", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setDepth(31);

    this.scoreText = this.add
      .text(565, 18, "", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#60f0d0",
      })
      .setDepth(31);

    this.timerText = this.add
      .text(780, 18, "", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffd76a",
      })
      .setDepth(31);

    this.gearText = this.add
      .text(1168, 18, this.gearName, {
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#b9fff0",
        align: "right",
      })
      .setOrigin(1, 0)
      .setDepth(31);

    this.toolText = this.add
      .text(28, 48, "", {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#94a3b8",
      })
      .setDepth(31);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 72, "", {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#f8fafc",
        backgroundColor: "rgba(5,9,20,0.82)",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.scannerGraphics = this.add.graphics().setDepth(15);
    this.compassGraphics = this.add.graphics().setDepth(35);
    this.updateInterface();
  }

  private createTouchControls() {
    const createHoldButton = (
      x: number,
      y: number,
      label: string,
      onDown: () => void,
      onUp: () => void,
    ) => {
      const button = this.add
        .rectangle(x, y, 54, 54, 0x07111f, 0.72)
        .setStrokeStyle(1, 0x7ee8ff, 0.35)
        .setInteractive()
        .setDepth(50);
      this.add
        .text(x, y, label, {
          fontFamily: "Arial",
          fontSize: "20px",
          fontStyle: "bold",
          color: "#e2faff",
        })
        .setOrigin(0.5)
        .setDepth(51);

      button.on("pointerdown", onDown);
      button.on("pointerup", onUp);
      button.on("pointerout", onUp);
      button.on("pointerupoutside", onUp);
    };

    const createTapButton = (
      x: number,
      y: number,
      width: number,
      label: string,
      onTap: () => void,
      tint = 0x0b2640,
    ) => {
      const button = this.add
        .rectangle(x, y, width, 42, tint, 0.8)
        .setStrokeStyle(1, 0x60f0d0, 0.35)
        .setInteractive()
        .setDepth(50);
      this.add
        .text(x, y, label, {
          fontFamily: "Arial",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#e2fff8",
        })
        .setOrigin(0.5)
        .setDepth(51);
      button.on("pointerdown", onTap);
    };

    createHoldButton(82, 690, "←", () => (this.touchLeft = true), () => {
      this.touchLeft = false;
    });
    createHoldButton(146, 690, "→", () => (this.touchRight = true), () => {
      this.touchRight = false;
    });
    createHoldButton(114, 626, "↑", () => (this.touchUp = true), () => {
      this.touchUp = false;
    });
    createHoldButton(114, 754, "↓", () => (this.touchDown = true), () => {
      this.touchDown = false;
    });

    createTapButton(1000, 690, 92, "INTERACT", () => this.interactWithPuzzle());
    createTapButton(1104, 690, 92, "RESTART", () => this.requestRestart(), 0x351728);

    createTapButton(882, 748, 58, "LENS", () => this.useLogicLens());
    createTapButton(946, 748, 58, "SCAN", () => this.useScanner());
    createTapButton(1010, 748, 58, "COMP", () => this.useCompass());
    createTapButton(1074, 748, 58, "FIX", () => this.useWrench());
    createTapButton(1138, 748, 58, "SPARK", () => this.useSparkStaff());
  }

  private createCollisions() {
    if (!this.player || !this.wallGroup) return;

    this.physics.add.collider(this.player, this.wallGroup);

    if (this.coreGroup) {
      this.physics.add.overlap(
        this.player,
        this.coreGroup,
        (_player, coreObject) => {
          this.collectCore(coreObject as Phaser.Physics.Arcade.Image);
        },
      );
    }

    if (this.clueGroup) {
      this.physics.add.overlap(
        this.player,
        this.clueGroup,
        (_player, clueObject) => {
          this.collectClue(clueObject as Phaser.Physics.Arcade.Image);
        },
      );
    }

    if (this.trapGroup) {
      this.physics.add.overlap(
        this.player,
        this.trapGroup,
        (_player, trapObject) => {
          this.triggerTrap(trapObject as Phaser.Physics.Arcade.Image);
        },
      );
    }

    if (this.exit) {
      this.physics.add.overlap(this.player, this.exit, () => {
        this.tryFinishMaze();
      });
    }
  }

  private handleMovement() {
    if (!this.player) return;

    const left = this.cursors?.left.isDown || this.keyA?.isDown || this.touchLeft;
    const right =
      this.cursors?.right.isDown || this.keyD?.isDown || this.touchRight;
    const up = this.cursors?.up.isDown || this.keyW?.isDown || this.touchUp;
    const down = this.cursors?.down.isDown || this.keyS?.isDown || this.touchDown;

    let horizontal = 0;
    let vertical = 0;

    if (left) horizontal -= 1;
    if (right) horizontal += 1;
    if (up) vertical -= 1;
    if (down) vertical += 1;

    const moving = horizontal !== 0 || vertical !== 0;
    const speed = 178 + this.gearStage * 7;

    if (moving) {
      const vector = new Phaser.Math.Vector2(horizontal, vertical).normalize();
      this.player.setVelocity(vector.x * speed, vector.y * speed);
      this.hasStarted = true;
    } else {
      this.player.setVelocity(0, 0);
    }

    const novaLabel = this.children.list.find(
      (child) => child.getData?.("followPlayer") === true,
    ) as Phaser.GameObjects.Text | undefined;

    if (novaLabel) {
      novaLabel.setPosition(this.player.x, this.player.y - 24);
    }
  }

  private handleActions() {
    if (this.justDown(this.keyR)) this.requestRestart();
    if (this.justDown(this.keyE)) this.interactWithPuzzle();
    if (this.justDown(this.keyOne)) this.useLogicLens();
    if (this.justDown(this.keyTwo)) this.useScanner();
    if (this.justDown(this.keyThree)) this.useCompass();
    if (this.justDown(this.keyFour)) this.useWrench();
    if (this.justDown(this.keyFive)) this.useSparkStaff();
  }

  private handlePuzzleKeyboard() {
    if (!this.activePuzzle) return;

    if (this.justDown(this.keyR)) {
      this.requestRestart();
      return;
    }

    if (
      this.justDown(this.keyOne) ||
      this.justDown(this.keyOptionOne)
    ) {
      this.answerPuzzle(0);
    }

    if (
      this.justDown(this.keyTwo) ||
      this.justDown(this.keyOptionTwo)
    ) {
      this.answerPuzzle(1);
    }

    if (
      this.justDown(this.keyThree) ||
      this.justDown(this.keyOptionThree)
    ) {
      this.answerPuzzle(2);
    }

    if (this.justDown(this.keyFive)) {
      this.useSparkStaff();
    }
  }

  private justDown(key?: Phaser.Input.Keyboard.Key) {
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }

  private updateTimer(delta: number) {
    if (this.hasStarted && !this.hasFinished) {
      this.elapsedMilliseconds += delta;
    }
  }

  private updateNearbyPuzzle() {
    if (!this.player) return;

    const nearest = this.puzzles
      .filter((puzzle) => !puzzle.solved)
      .map((puzzle) => ({
        puzzle,
        distance: Phaser.Math.Distance.Between(
          this.player!.x,
          this.player!.y,
          puzzle.sprite.x,
          puzzle.sprite.y,
        ),
      }))
      .sort((first, second) => first.distance - second.distance)[0];

    this.nearbyPuzzle = nearest && nearest.distance <= 54 ? nearest.puzzle : null;

    if (this.nearbyPuzzle) {
      this.statusText?.setText("Press E or INTERACT to use this puzzle terminal.");
    } else if (this.statusText?.text.includes("Press E")) {
      this.statusText.setText("");
    }
  }

  private updateHiddenClues() {
    if (!this.player) return;
    const lensActive = this.time.now < this.logicLensUntil;

    for (const clue of this.clues) {
      if (clue.collected) continue;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        clue.sprite.x,
        clue.sprite.y,
      );
      clue.sprite.setAlpha(lensActive ? 1 : distance < 88 ? 0.85 : 0.12);
    }

    for (const trap of this.traps) {
      if (trap.triggered) continue;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        trap.sprite.x,
        trap.sprite.y,
      );
      trap.sprite.setAlpha(lensActive ? 0.95 : distance < 76 ? 0.55 : 0.25);
    }
  }

  private updateScanner() {
    if (!this.scannerGraphics) return;

    if (this.time.now >= this.scannerUntil) {
      this.scannerGraphics.clear();
    }
  }

  private updateCompass() {
    if (!this.compassGraphics || !this.player) return;

    this.compassGraphics.clear();
    if (this.time.now >= this.compassUntil) return;

    const target = this.getNearestObjectiveCell();
    if (!target) return;

    const targetWorld = this.cellToWorld(target.column, target.row);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      targetWorld.x,
      targetWorld.y,
    );
    const arrowLength = 60;
    const endX = this.player.x + Math.cos(angle) * arrowLength;
    const endY = this.player.y + Math.sin(angle) * arrowLength;

    this.compassGraphics.lineStyle(6, 0xffd76a, 0.92);
    this.compassGraphics.lineBetween(this.player.x, this.player.y, endX, endY);
    this.compassGraphics.fillStyle(0xffd76a, 1);
    this.compassGraphics.fillTriangle(
      endX,
      endY,
      endX - Math.cos(angle - 0.6) * 16,
      endY - Math.sin(angle - 0.6) * 16,
      endX - Math.cos(angle + 0.6) * 16,
      endY - Math.sin(angle + 0.6) * 16,
    );
  }

  private updateInterface() {
    const score = this.calculateCurrentScore(false);
    const elapsedSeconds = Math.floor(this.elapsedMilliseconds / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    this.objectiveText?.setText(
      `CORES ${this.coresCollected}/${REQUIRED_CORES}   PUZZLES ${this.puzzlesSolved}/${REQUIRED_PUZZLES}   CLUES ${this.cluesCollected}`,
    );
    this.scoreText?.setText(`SCORE ${score.toLocaleString()}`);
    this.timerText?.setText(
      `TIME ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0",
      )}`,
    );
    this.toolText?.setText(
      `1 Lens ${this.logicLensCharges}   2 Scanner ${this.scannerCharges}   3 Compass ${this.compassCharges}   Shield ${this.shieldCharges}   4 Wrench ${this.wrenchCharges}   5 Spark ${this.sparkCharges}`,
    );

    if (this.exit) {
      const ready =
        this.coresCollected >= REQUIRED_CORES &&
        this.puzzlesSolved >= REQUIRED_PUZZLES;
      this.exit.setTint(ready ? 0x22c55e : 0x64748b);
      this.exit.setAlpha(ready ? 1 : 0.48);
    }
  }

  private collectCore(coreSprite: Phaser.Physics.Arcade.Image) {
    if (this.hasFinished || !coreSprite.active) return;
    const core = this.cores.find((item) => item.sprite === coreSprite);
    if (!core || core.collected) return;

    core.collected = true;
    this.coresCollected += 1;
    core.sprite.disableBody(true, true);
    this.cameras.main.flash(130, 255, 215, 106);
    this.showMessage("Energy core collected. +250 points", "#ffe6a8");
  }

  private collectClue(clueSprite: Phaser.Physics.Arcade.Image) {
    if (this.hasFinished || !clueSprite.active) return;
    const clue = this.clues.find((item) => item.sprite === clueSprite);
    if (!clue || clue.collected) return;

    clue.collected = true;
    this.cluesCollected += 1;
    clue.sprite.disableBody(true, true);
    this.showMessage("Hidden clue found. +50 points", "#b9f5ff");
  }

  private triggerTrap(trapSprite: Phaser.Physics.Arcade.Image) {
    if (this.hasFinished || !trapSprite.active) return;
    const trap = this.traps.find((item) => item.sprite === trapSprite);
    if (!trap || trap.triggered) return;

    trap.triggered = true;
    trap.sprite.disableBody(true, true);

    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.cameras.main.flash(120, 181, 140, 255);
      this.showMessage("Puzzle Shield blocked a trap penalty.", "#d8c7ff");
      return;
    }

    this.trapsTriggered += 1;
    this.cameras.main.shake(180, 0.006);
    this.showMessage("Maze trap triggered. −150 points", "#fda4af");
  }

  private interactWithPuzzle() {
    if (this.activePuzzle || this.hasFinished) return;

    if (!this.nearbyPuzzle) {
      this.showMessage("Move closer to an unsolved puzzle terminal.", "#cbd5e1");
      return;
    }

    this.openPuzzle(this.nearbyPuzzle);
  }

  private openPuzzle(puzzle: PuzzleItem) {
    if (this.activePuzzle || puzzle.solved) return;
    this.activePuzzle = puzzle;
    this.player?.setVelocity(0, 0);

    const overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(100);
    const backdrop = this.add
      .rectangle(0, 0, 720, 460, 0x050914, 0.97)
      .setStrokeStyle(2, 0xb58cff, 0.75);
    const eyebrow = this.add
      .text(0, -184, "PUZZLE TERMINAL", {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#cdb7ff",
      })
      .setOrigin(0.5);
    const question = this.add
      .text(0, -125, puzzle.question, {
        fontFamily: "Arial",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 610 },
      })
      .setOrigin(0.5);

    overlay.add([backdrop, eyebrow, question]);

    puzzle.options.forEach((option, index) => {
      const y = -38 + index * 72;
      const button = this.add
        .rectangle(0, y, 600, 54, 0x10264a, 0.95)
        .setStrokeStyle(1, 0x7ee8ff, 0.38)
        .setInteractive();
      const text = this.add
        .text(-270, y, `${index + 1}. ${option}`, {
          fontFamily: "Arial",
          fontSize: "17px",
          color: "#edfaff",
        })
        .setOrigin(0, 0.5);

      button.on("pointerdown", () => this.answerPuzzle(index));
      overlay.add([button, text]);
    });

    this.puzzleFeedbackText = this.add
      .text(0, 182, "Choose 1, 2 or 3.", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#94a3b8",
        align: "center",
      })
      .setOrigin(0.5);

    this.sparkHintText = this.add
      .text(0, 208, this.sparkCharges > 0 ? "Press 5 for Spark Staff hint." : "", {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#ffb6f2",
      })
      .setOrigin(0.5);

    overlay.add([this.puzzleFeedbackText, this.sparkHintText]);
    this.puzzleOverlay = overlay;
  }

  private answerPuzzle(answerIndex: number) {
    const puzzle = this.activePuzzle;
    if (!puzzle || puzzle.solved) return;

    if (answerIndex === puzzle.correctIndex) {
      puzzle.solved = true;
      this.puzzlesSolved += 1;
      puzzle.sprite.setTint(0x22c55e);
      puzzle.label.setText("✓");
      this.puzzleFeedbackText?.setColor("#86efac");
      this.puzzleFeedbackText?.setText("Correct. Puzzle terminal activated. +200 points");

      this.time.delayedCall(650, () => this.closePuzzleOverlay());
      return;
    }

    this.mistakes += 1;
    this.puzzleFeedbackText?.setColor("#fca5a5");
    this.puzzleFeedbackText?.setText("Incorrect. −100 points. Try again.");
    this.cameras.main.shake(100, 0.003);
  }

  private closePuzzleOverlay() {
    this.puzzleOverlay?.destroy(true);
    this.puzzleOverlay = undefined;
    this.puzzleFeedbackText = undefined;
    this.sparkHintText = undefined;
    this.activePuzzle = null;
  }

  private useLogicLens() {
    if (this.activePuzzle || this.hasFinished) return;
    if (this.logicLensCharges <= 0) {
      this.showMessage("Logic Lens is locked or has no charges left.", "#94a3b8");
      return;
    }

    this.logicLensCharges -= 1;
    this.logicLensUntil = this.time.now + 6500;
    this.cameras.main.flash(100, 96, 240, 208);
    this.showMessage("Logic Lens active: hidden objects revealed.", "#a7f3d0");
  }

  private useScanner() {
    if (this.activePuzzle || this.hasFinished) return;
    if (this.scannerCharges <= 0) {
      this.showMessage("Pattern Scanner is locked or has no charges left.", "#94a3b8");
      return;
    }
    if (!this.player || !this.scannerGraphics) return;

    const playerCell = this.worldToCell(this.player.x, this.player.y);
    const target = this.getNearestObjectiveCell();

    if (!target) {
      this.showMessage("No remaining objective found.", "#94a3b8");
      return;
    }

    const path = this.findPath(playerCell, target);
    if (path.length === 0) {
      this.showMessage("Scanner could not establish a route.", "#94a3b8");
      return;
    }

    this.scannerCharges -= 1;
    this.scannerUntil = this.time.now + 6000;
    this.scannerGraphics.clear();
    this.scannerGraphics.fillStyle(0x7ee8ff, 0.66);

    for (const cell of path.filter((_cell, index) => index % 2 === 0)) {
      const position = this.cellToWorld(cell.column, cell.row);
      this.scannerGraphics.fillCircle(position.x, position.y, 4);
    }

    this.showMessage("Pattern Scanner mapped the nearest objective.", "#b9f5ff");
  }

  private useCompass() {
    if (this.activePuzzle || this.hasFinished) return;
    if (this.compassCharges <= 0) {
      this.showMessage("Clue Compass is locked or has no charges left.", "#94a3b8");
      return;
    }

    const target = this.getNearestObjectiveCell();
    if (!target) {
      this.showMessage("No remaining objective found.", "#94a3b8");
      return;
    }

    this.compassCharges -= 1;
    this.compassUntil = this.time.now + 7000;
    this.showMessage("Clue Compass is pointing to the nearest objective.", "#ffe6a8");
  }

  private useWrench() {
    if (this.activePuzzle || this.hasFinished) return;
    if (this.wrenchCharges <= 0) {
      this.showMessage("Energy Wrench is locked or has no charges left.", "#94a3b8");
      return;
    }
    if (!this.player) return;

    const playerCell = this.worldToCell(this.player.x, this.player.y);
    const directions = [
      { column: 1, row: 0 },
      { column: -1, row: 0 },
      { column: 0, row: 1 },
      { column: 0, row: -1 },
    ];

    const removable = directions
      .map((direction) => ({
        wallColumn: playerCell.column + direction.column,
        wallRow: playerCell.row + direction.row,
        beyondColumn: playerCell.column + direction.column * 2,
        beyondRow: playerCell.row + direction.row * 2,
      }))
      .find(
        (candidate) =>
          candidate.wallColumn > 0 &&
          candidate.wallColumn < GRID_COLUMNS - 1 &&
          candidate.wallRow > 0 &&
          candidate.wallRow < GRID_ROWS - 1 &&
          this.mazeGrid[candidate.wallRow]?.[candidate.wallColumn] === 1 &&
          this.mazeGrid[candidate.beyondRow]?.[candidate.beyondColumn] === 0,
      );

    if (!removable) {
      this.showMessage(
        "Stand beside an internal wall with a corridor behind it.",
        "#ffe6a8",
      );
      return;
    }

    const key = cellKey(removable.wallColumn, removable.wallRow);
    const wall = this.wallByCell.get(key);

    if (!wall) {
      this.showMessage("This wall cannot be removed.", "#94a3b8");
      return;
    }

    wall.destroy();
    this.wallByCell.delete(key);
    this.mazeGrid[removable.wallRow][removable.wallColumn] = 0;
    this.wrenchCharges -= 1;
    this.cameras.main.flash(110, 255, 204, 102);
    this.showMessage("Energy Wrench opened a maze shortcut.", "#ffe6a8");
  }

  private useSparkStaff() {
    if (!this.activePuzzle) {
      if (this.sparkCharges <= 0) {
        this.showMessage("Spark Staff is locked or has no charges left.", "#94a3b8");
      } else {
        this.showMessage("Use Spark Staff while a puzzle terminal is open.", "#ffb6f2");
      }
      return;
    }

    if (this.sparkCharges <= 0) {
      this.sparkHintText?.setText("Spark Staff has no charges left.");
      return;
    }

    this.sparkCharges -= 1;
    const correctNumber = this.activePuzzle.correctIndex + 1;
    this.sparkHintText?.setText(
      `Spark Staff analysis: option ${correctNumber} is correct.`,
    );
    this.sparkHintText?.setColor("#ffb6f2");
  }

  private tryFinishMaze() {
    if (this.hasFinished) return;

    if (
      this.coresCollected < REQUIRED_CORES ||
      this.puzzlesSolved < REQUIRED_PUZZLES
    ) {
      this.showMessage(
        `Exit locked: collect ${REQUIRED_CORES - this.coresCollected} more core(s) and solve ${
          REQUIRED_PUZZLES - this.puzzlesSolved
        } more puzzle(s).`,
        "#cbd5e1",
      );
      return;
    }

    this.completeMaze();
  }

  private completeMaze() {
    if (this.hasFinished || !this.player) return;
    this.hasFinished = true;
    this.player.setVelocity(0, 0);

    const completionTimeMs = Math.max(1000, Math.floor(this.elapsedMilliseconds));
    const score = this.calculateCurrentScore(true);
    const timeBonus = this.calculateTimeBonus();

    const detail: ThinkMazeCompleteDetail = {
      runId: `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`,
      courseId: COURSE_ID,
      gearStage: this.gearStage,
      score,
      completionTimeMs,
      coresCollected: this.coresCollected,
      cluesCollected: this.cluesCollected,
      puzzlesSolved: this.puzzlesSolved,
      mistakes: this.mistakes,
      trapsTriggered: this.trapsTriggered,
    };

    window.dispatchEvent(
      new CustomEvent<ThinkMazeCompleteDetail>("think-maze-complete", {
        detail,
      }),
    );

    const overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(120);
    const backdrop = this.add
      .rectangle(0, 0, 650, 430, 0x050914, 0.97)
      .setStrokeStyle(2, 0x60f0d0, 0.82);
    const title = this.add
      .text(0, -155, "LOGIC MAZE COMPLETE", {
        fontFamily: "Arial",
        fontSize: "30px",
        fontStyle: "bold",
        color: "#b9fff0",
      })
      .setOrigin(0.5);
    const scoreText = this.add
      .text(0, -84, score.toLocaleString(), {
        fontFamily: "Arial",
        fontSize: "58px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const label = this.add
      .text(0, -38, "TOTAL SCORE", {
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#60f0d0",
      })
      .setOrigin(0.5);
    const summary = this.add
      .text(
        0,
        48,
        [
          `Time: ${this.formatMilliseconds(completionTimeMs)}`,
          `Cores: ${this.coresCollected}  ·  Puzzles: ${this.puzzlesSolved}  ·  Clues: ${this.cluesCollected}`,
          `Time bonus: +${timeBonus}  ·  Mistakes: ${this.mistakes}  ·  Traps: ${this.trapsTriggered}`,
        ].join("\n"),
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#cbd5e1",
          align: "center",
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5);

    const restartButton = this.add
      .rectangle(0, 153, 230, 54, 0x60f0d0, 0.95)
      .setInteractive();
    const restartText = this.add
      .text(0, 153, "PLAY AGAIN", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#041522",
      })
      .setOrigin(0.5);
    restartButton.on("pointerdown", () => this.requestRestart());

    overlay.add([
      backdrop,
      title,
      scoreText,
      label,
      summary,
      restartButton,
      restartText,
    ]);
    this.cameras.main.flash(260, 96, 240, 208);
  }

  private calculateCurrentScore(includeCompletion: boolean) {
    const completionScore = includeCompletion ? 1000 : 0;
    const coreScore = this.coresCollected * 250;
    const puzzleScore = this.puzzlesSolved * 200;
    const clueScore = this.cluesCollected * 50;
    const timeBonus = includeCompletion ? this.calculateTimeBonus() : 0;
    const mistakePenalty = this.mistakes * 100;
    const trapPenalty = this.trapsTriggered * 150;

    return Math.max(
      0,
      completionScore +
        coreScore +
        puzzleScore +
        clueScore +
        timeBonus -
        mistakePenalty -
        trapPenalty,
    );
  }

  private calculateTimeBonus() {
    const elapsedSeconds = Math.floor(this.elapsedMilliseconds / 1000);
    return Math.max(0, 1000 - elapsedSeconds * 4);
  }

  private getNearestObjectiveCell(): GridCell | null {
    if (!this.player) return null;

    const objectives: GridCell[] = [
      ...this.cores.filter((core) => !core.collected),
      ...this.puzzles.filter((puzzle) => !puzzle.solved),
    ];

    if (
      objectives.length === 0 &&
      this.coresCollected >= REQUIRED_CORES &&
      this.puzzlesSolved >= REQUIRED_PUZZLES
    ) {
      objectives.push({
        column: GRID_COLUMNS - 2,
        row: GRID_ROWS - 2,
      });
    }

    if (objectives.length === 0) return null;

    return objectives
      .map((objective) => {
        const world = this.cellToWorld(objective.column, objective.row);
        return {
          objective,
          distance: Phaser.Math.Distance.Between(
            this.player!.x,
            this.player!.y,
            world.x,
            world.y,
          ),
        };
      })
      .sort((first, second) => first.distance - second.distance)[0].objective;
  }

  private getOpenCells() {
    const cells: GridCell[] = [];

    for (let row = 0; row < this.mazeGrid.length; row += 1) {
      for (let column = 0; column < this.mazeGrid[row].length; column += 1) {
        if (this.mazeGrid[row][column] === 0) {
          cells.push({ column, row });
        }
      }
    }

    return cells;
  }

  private findPath(start: GridCell, target: GridCell) {
    const startKey = cellKey(start.column, start.row);
    const targetKey = cellKey(target.column, target.row);
    const queue: GridCell[] = [start];
    const previous = new Map<string, string | null>([[startKey, null]]);
    const cells = new Map<string, GridCell>([[startKey, start]]);
    const directions = [
      { column: 1, row: 0 },
      { column: -1, row: 0 },
      { column: 0, row: 1 },
      { column: 0, row: -1 },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const currentKey = cellKey(current.column, current.row);
      if (currentKey === targetKey) break;

      for (const direction of directions) {
        const next = {
          column: current.column + direction.column,
          row: current.row + direction.row,
        };
        const nextKey = cellKey(next.column, next.row);

        if (
          next.row < 0 ||
          next.row >= GRID_ROWS ||
          next.column < 0 ||
          next.column >= GRID_COLUMNS ||
          this.mazeGrid[next.row][next.column] !== 0 ||
          previous.has(nextKey)
        ) {
          continue;
        }

        previous.set(nextKey, currentKey);
        cells.set(nextKey, next);
        queue.push(next);
      }
    }

    if (!previous.has(targetKey)) return [];

    const path: GridCell[] = [];
    let cursor: string | null = targetKey;

    while (cursor) {
      const cell = cells.get(cursor);
      if (cell) path.push(cell);
      cursor = previous.get(cursor) ?? null;
    }

    return path.reverse();
  }

  private cellToWorld(column: number, row: number) {
    return {
      x: GRID_OFFSET_X + column * CELL_SIZE + CELL_SIZE / 2,
      y: GRID_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  private worldToCell(x: number, y: number) {
    return {
      column: Phaser.Math.Clamp(
        Math.floor((x - GRID_OFFSET_X) / CELL_SIZE),
        0,
        GRID_COLUMNS - 1,
      ),
      row: Phaser.Math.Clamp(
        Math.floor((y - GRID_OFFSET_Y) / CELL_SIZE),
        0,
        GRID_ROWS - 1,
      ),
    };
  }

  private showMessage(message: string, color: string) {
    this.statusText?.setColor(color);
    this.statusText?.setText(message);

    this.time.delayedCall(2400, () => {
      if (this.statusText?.text === message) {
        this.statusText.setText("");
      }
    });
  }

  private requestRestart() {
    window.dispatchEvent(new Event("think-maze-restart-requested"));
  }

  private formatMilliseconds(milliseconds: number) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }
}

export default function PhaserGame({
  gearStage,
  gearName,
  abilities,
}: PhaserGameProps) {
  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameVersion, setGameVersion] = useState(0);

  useEffect(() => {
    function handleRestartRequest() {
      setGameVersion((current) => current + 1);
    }

    window.addEventListener(
      "think-maze-restart-requested",
      handleRestartRequest,
    );

    return () => {
      window.removeEventListener(
        "think-maze-restart-requested",
        handleRestartRequest,
      );
    };
  }, []);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    gameRef.current?.destroy(true);
    gameRef.current = null;

    const scene = new ThinkMazeScene({
      gearStage,
      gearName,
      abilities,
    });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: gameContainerRef.current,
      backgroundColor: "#050914",
      transparent: false,
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
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

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [abilities, gameVersion, gearName, gearStage]);

  return (
    <div
      ref={gameContainerRef}
      className="aspect-[3/2] min-h-[310px] w-full overflow-hidden bg-[#050914]"
      aria-label="Logic Maze Challenge game"
    />
  );
}
