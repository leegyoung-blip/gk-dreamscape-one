/**
 * NOVA Circuit Rush — CR-3 deterministic match-three engine (v1).
 * Pure TypeScript: no React, browser APIs, Supabase or wallet interactions.
 *
 * SECURITY: Client replay is NOT proof of a legitimate win. CR-5 must issue
 * server-controlled seeds and independently replay accepted moves before an
 * atomic server-authorized Dream Token award. Never award DT from this module.
 */

export const BOARD_SIZE = 6 as const;
export const ENGINE_VERSION = 1 as const;
export type TileKind = 0 | 1 | 2 | 3 | 4 | 5;
export type PowerType = "row" | "column" | "pulse";
export type Tile = { id: number; kind: TileKind; power?: PowerType };
export type Board = Tile[];
export type Level = 1 | 2 | 3;
export type GameStatus = "playing" | "won" | "lost";
export type LevelRules = Readonly<{
  level: Level;
  name: string;
  availableKinds: number;
  moveLimit: number;
  clearTarget: number;
  rewardPreviewDT: number;
}>;

/** Preliminary CR-3 tuning; exact targets are beta-testable and versioned. */
export const LEVEL_RULES: Record<Level, LevelRules> = {
  1: { level: 1, name: "Easy", availableKinds: 4, moveLimit: 20, clearTarget: 95, rewardPreviewDT: 5 },
  2: { level: 2, name: "Medium", availableKinds: 5, moveLimit: 20, clearTarget: 105, rewardPreviewDT: 10 },
  3: { level: 3, name: "Hard", availableKinds: 6, moveLimit: 20, clearTarget: 110, rewardPreviewDT: 15 },
};

export const TILE_LABELS = [
  "Power Cell", "Microchip", "Data Crystal", "Circuit Module", "Signal Core", "Nano Gear",
] as const;

export type GameState = {
  version: typeof ENGINE_VERSION;
  level: Level;
  /** Seed must originate from a trusted server in reward-eligible CR-5 play. */
  seed: string;
  board: Board;
  rngState: number;
  nextTileId: number;
  movesUsed: number;
  cleared: number;
  score: number;
  totalCascades: number;
  status: GameStatus;
};

export type GameEvent =
  | { type: "swap"; from: number; to: number }
  | { type: "reject"; reason: "not-adjacent" | "no-match" | "not-playing" | "invalid-position" }
  | { type: "clear"; at: number[]; cascade: number; points: number }
  | { type: "special-created"; at: number; power: PowerType }
  | { type: "fall"; moves: { id: number; from: number; to: number }[] }
  | { type: "spawn"; tiles: { at: number; tile: Tile }[] }
  | { type: "reshuffle" }
  | { type: "finish"; status: "won" | "lost" };

export type Move = { from: number; to: number };
export type MoveResult = { accepted: boolean; state: GameState; events: GameEvent[] };
export type ReplayResult = { state: GameState; acceptedMoves: number; rejectedAt: number | null };

type Run = { cells: number[]; kind: TileKind; axis: "h" | "v" };

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h || 0x6d2b79f5;
}

function nextRandom(state: number): { state: number; value: number } {
  // xorshift32 — deterministic across browsers and Node when values are coerced to uint32.
  let x = state >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  return { state: x, value: x / 4294967296 };
}

function randomKind(rng: { value: number }, n: number): TileKind {
  return Math.floor(rng.value * n) as TileKind;
}

function validPosition(index: number) {
  return Number.isInteger(index) && index >= 0 && index < BOARD_SIZE * BOARD_SIZE;
}

export function areAdjacent(a: number, b: number): boolean {
  return validPosition(a) && validPosition(b) &&
    Math.abs(Math.floor(a / BOARD_SIZE) - Math.floor(b / BOARD_SIZE)) +
    Math.abs((a % BOARD_SIZE) - (b % BOARD_SIZE)) === 1;
}

export function findRuns(board: ReadonlyArray<Tile>): Run[] {
  if (board.length !== BOARD_SIZE * BOARD_SIZE) throw new Error("Invalid board length");
  const runs: Run[] = [];
  for (const axis of ["h", "v"] as const) {
    for (let line = 0; line < BOARD_SIZE; line++) {
      let start = 0;
      while (start < BOARD_SIZE) {
        const at = axis === "h" ? line * BOARD_SIZE + start : start * BOARD_SIZE + line;
        let end = start + 1;
        while (end < BOARD_SIZE) {
          const nextAt = axis === "h" ? line * BOARD_SIZE + end : end * BOARD_SIZE + line;
          if (board[nextAt].kind !== board[at].kind) break;
          end++;
        }
        if (end - start >= 3) {
          const cells: number[] = [];
          for (let k = start; k < end; k++) cells.push(axis === "h" ? line * BOARD_SIZE + k : k * BOARD_SIZE + line);
          runs.push({ cells, kind: board[at].kind, axis });
        }
        start = end;
      }
    }
  }
  return runs;
}

function swapped(board: ReadonlyArray<Tile>, a: number, b: number): Board {
  const result = board.map(t => ({ ...t }));
  [result[a], result[b]] = [result[b], result[a]];
  return result;
}

export function hasAvailableMove(board: ReadonlyArray<Tile>): boolean {
  for (let from = 0; from < board.length; from++) {
    for (const to of [from + 1, from + BOARD_SIZE]) {
      if (!areAdjacent(from, to)) continue;
      if (board[from].power || board[to].power) return true;
      if (board[from].kind === board[to].kind) continue;
      if (findRuns(swapped(board, from, to)).length) return true;
    }
  }
  return false;
}

function freshBoard(seedState: number, availableKinds: number, firstId = 1): {
  board: Board; rngState: number; nextTileId: number;
} {
  let state = seedState >>> 0;
  let nextId = firstId;
  for (let attempt = 0; attempt < 512; attempt++) {
    const board: Tile[] = [];
    for (let at = 0; at < BOARD_SIZE * BOARD_SIZE; at++) {
      const forbidden = new Set<number>();
      const col = at % BOARD_SIZE;
      const row = Math.floor(at / BOARD_SIZE);
      if (col > 1 && board[at - 1].kind === board[at - 2].kind) forbidden.add(board[at - 1].kind);
      if (row > 1 && board[at - BOARD_SIZE].kind === board[at - BOARD_SIZE * 2].kind) forbidden.add(board[at - BOARD_SIZE].kind);
      const allowed = Array.from({ length: availableKinds }, (_, k) => k as TileKind).filter(k => !forbidden.has(k));
      const random = nextRandom(state); state = random.state;
      board.push({ id: nextId++, kind: allowed[Math.floor(random.value * allowed.length)] });
    }
    if (hasAvailableMove(board)) return { board, rngState: state, nextTileId: nextId };
  }
  throw new Error("Could not generate playable board");
}

export function createGame(level: Level, seed: string): GameState {
  if (!LEVEL_RULES[level]) throw new Error("Invalid difficulty level");
  if (typeof seed !== "string" || !seed.length || seed.length > 512) throw new Error("Invalid game seed");
  const created = freshBoard(hashSeed(`CR${ENGINE_VERSION}:${level}:${seed}`), LEVEL_RULES[level].availableKinds);
  return {
    version: ENGINE_VERSION, level, seed, ...created,
    movesUsed: 0, cleared: 0, score: 0, totalCascades: 0, status: "playing",
  };
}

/** Deterministically reshuffle existing tile types; preserve powers and IDs. */
function reshuffle(board: Board, rngState: number, nextTileId: number, availableKinds: number) {
  let state = rngState;
  for (let attempt = 0; attempt < 512; attempt++) {
    const copy = board.map(t => ({ ...t }));
    for (let i = copy.length - 1; i > 0; i--) {
      const random = nextRandom(state); state = random.state;
      const j = Math.floor(random.value * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (findRuns(copy).length === 0 && hasAvailableMove(copy)) return { board: copy, rngState: state, nextTileId };
  }
  // Pathological count distribution: replace with a new stable deterministic board.
  return freshBoard(state, availableKinds, nextTileId);
}

function hitByPower(at: number, power: PowerType): number[] {
  const row = Math.floor(at / BOARD_SIZE), col = at % BOARD_SIZE;
  const cells: number[] = [];
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    const r = Math.floor(i / BOARD_SIZE), c = i % BOARD_SIZE;
    if ((power === "row" && r === row) ||
        (power === "column" && c === col) ||
        (power === "pulse" && Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1)) cells.push(i);
  }
  return cells;
}

/** Resolve a single accepted swap without mutation; a full cascade is one move. */
export function applyMove(state: GameState, move: Move): MoveResult {
  const reject = (reason: Extract<GameEvent, { type: "reject" }>["reason"]): MoveResult => ({
    accepted: false, state, events: [{ type: "reject", reason }],
  });
  if (state.status !== "playing") return reject("not-playing");
  if (!validPosition(move.from) || !validPosition(move.to)) return reject("invalid-position");
  if (!areAdjacent(move.from, move.to)) return reject("not-adjacent");
  const board = swapped(state.board, move.from, move.to);
  const specialActivation = [move.from, move.to].filter(at => Boolean(board[at].power));
  if (!specialActivation.length && !findRuns(board).length) return reject("no-match");

  const events: GameEvent[] = [{ type: "swap", from: move.from, to: move.to }];
  let rngState = state.rngState, nextTileId = state.nextTileId;
  let cleared = state.cleared, score = state.score, cascades = state.totalCascades;
  let triggered = specialActivation;

  for (let depth = 1; depth <= 100; depth++) {
    const runs = findRuns(board);
    if (!runs.length && !triggered.length) break;
    const removal = new Set<number>();
    const created = new Map<number, PowerType>();
    for (const run of runs) for (const at of run.cells) removal.add(at);

    // Exactly one special per large run; a swap destination is preferred.
    // Intersecting runs may upgrade the shared tile to an area pulse.
    for (const run of runs) {
      if (run.cells.length < 4) continue;
      const anchor = run.cells.includes(move.to) && depth === 1 ? move.to : run.cells[Math.floor(run.cells.length / 2)];
      if (board[anchor].power) continue; // Existing power must fire, not be overwritten.
      const power: PowerType = run.cells.length >= 5 ? "pulse" : run.axis === "h" ? "row" : "column";
      created.set(anchor, created.has(anchor) ? "pulse" : power);
    }

    // Existing matched/activated power tiles cause chain reactions.
    const queue = [...new Set([...triggered, ...[...removal].filter(at => Boolean(board[at].power))])];
    const fired = new Set<number>();
    while (queue.length) {
      const at = queue.shift()!;
      if (fired.has(at) || !board[at].power) continue;
      fired.add(at);
      for (const affected of hitByPower(at, board[at].power!)) {
        removal.add(affected);
        if (board[affected].power && !fired.has(affected)) queue.push(affected);
      }
    }
    for (const at of fired) removal.add(at);
    triggered = [];
    for (const [at, power] of created) {
      if (!fired.has(at)) {
        removal.delete(at);
        board[at] = { ...board[at], power };
        events.push({ type: "special-created", at, power });
      }
    }
    if (!removal.size) break;
    cascades++;
    const positions = [...removal].sort((a, b) => a - b);
    const points = positions.length * 10 * depth;
    score += points; cleared += positions.length;
    events.push({ type: "clear", at: positions, cascade: depth, points });

    // Rebuild columns bottom-up; unremoved tiles preserve their IDs and powers.
    const falling: { id: number; from: number; to: number }[] = [];
    const spawning: { at: number; tile: Tile }[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const oldEntries: { from: number; tile: Tile }[] = [];
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        const at = row * BOARD_SIZE + col;
        if (!removal.has(at)) oldEntries.push({ from: at, tile: board[at] });
      }
      let writeRow = BOARD_SIZE - 1;
      for (const { from, tile } of oldEntries) {
        const to = writeRow-- * BOARD_SIZE + col;
        board[to] = tile;
        if (from !== to) falling.push({ id: tile.id, from, to });
      }
      while (writeRow >= 0) {
        const random = nextRandom(rngState); rngState = random.state;
        const tile = { id: nextTileId++, kind: randomKind(random, LEVEL_RULES[state.level].availableKinds) };
        const at = writeRow-- * BOARD_SIZE + col;
        board[at] = tile;
        spawning.push({ at, tile });
      }
    }
    if (falling.length) events.push({ type: "fall", moves: falling });
    if (spawning.length) events.push({ type: "spawn", tiles: spawning });
  }

  // Cannot expose an unresolved board to an active player.
  if (findRuns(board).length) throw new Error("Cascade exceeded safety limit");
  let finalBoard: Board = board;
  if (!hasAvailableMove(board)) {
    const fresh = reshuffle(board, rngState, nextTileId, LEVEL_RULES[state.level].availableKinds);
    finalBoard = fresh.board; rngState = fresh.rngState; nextTileId = fresh.nextTileId;
    events.push({ type: "reshuffle" });
  }
  const movesUsed = state.movesUsed + 1;
  const status: GameStatus = cleared >= LEVEL_RULES[state.level].clearTarget ? "won" :
    movesUsed >= LEVEL_RULES[state.level].moveLimit ? "lost" : "playing";
  if (status !== "playing") events.push({ type: "finish", status });
  return {
    accepted: true,
    state: { ...state, board: finalBoard, rngState, nextTileId, movesUsed, cleared, score, totalCascades: cascades, status },
    events,
  };
}

/** Server-side replay primitive; MUST be paired with authenticated session/award controls in CR-5. */
export function replayMoves(level: Level, seed: string, moves: ReadonlyArray<Move>): ReplayResult {
  let state = createGame(level, seed);
  if (!Array.isArray(moves) || moves.length > LEVEL_RULES[level].moveLimit) {
    return { state, acceptedMoves: 0, rejectedAt: 0 };
  }
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!move || !Number.isInteger(move.from) || !Number.isInteger(move.to))
      return { state, acceptedMoves: i, rejectedAt: i };
    const result = applyMove(state, move);
    if (!result.accepted) return { state, acceptedMoves: i, rejectedAt: i };
    state = result.state;
    if (state.status !== "playing" && i < moves.length - 1) return { state, acceptedMoves: i + 1, rejectedAt: i + 1 };
  }
  return { state, acceptedMoves: moves.length, rejectedAt: null };
}
