/** CR-4 presentation snapshots derived from the deterministic CR-3 event stream. */
const BOARD_SIZE = 6 as const; // Matches the locked CR-3 six-column board.
import type { Board, GameEvent, Tile } from "./engine";

export type DisplayTile = Tile | null;
export type AnimationFrame = {
  board: DisplayTile[];
  hit: number[];
  fallingIds: number[];
  label: string;
  duration: number;
};

const TILE_KEYS = [0, 1, 2, 3, 4, 5] as const;
const KEYBOARD_HELP = "Use arrow keys to move focus. Press Space or Enter to choose a tile, then choose an adjacent tile. You can also swipe tiles.";

export function copyBoard(board: ReadonlyArray<DisplayTile>): DisplayTile[] {
  return board.map(tile => tile ? { ...tile } : null);
}

/** Convert CR-3's deterministic event stream into visual snapshots. The engine remains authoritative. */
export function buildCircuitRushFrames(
  previous: Board,
  events: ReadonlyArray<GameEvent>,
  finalBoard: Board,
): AnimationFrame[] {
  let board: DisplayTile[] = copyBoard(previous);
  const frames: AnimationFrame[] = [];
  const push = (label: string, duration: number, hit: number[] = [], fallingIds: number[] = []) => {
    frames.push({ board: copyBoard(board), hit, fallingIds, label, duration });
  };
  for (const event of events) {
    switch (event.type) {
      case "swap": {
        [board[event.from], board[event.to]] = [board[event.to], board[event.from]];
        push("Circuit connected", 125);
        break;
      }
      case "special-created": {
        const tile = board[event.at];
        if (tile) board[event.at] = { ...tile, power: event.power };
        break;
      }
      case "clear": {
        push(event.cascade > 1 ? `Chain reaction ×${event.cascade}` : `+${event.points} points`, 170, event.at);
        for (const at of event.at) board[at] = null;
        break;
      }
      case "fall": {
        const movement = new Map(event.moves.map(m => [m.id, m.to]));
        const moved = new Set(movement.keys());
        const next: DisplayTile[] = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
        for (let from = 0; from < board.length; from++) {
          const tile = board[from];
          if (tile) next[movement.get(tile.id) ?? from] = tile;
        }
        board = next;
        push("Recharging", 140, [], [...moved]);
        break;
      }
      case "spawn": {
        for (const { at, tile } of event.tiles) board[at] = { ...tile };
        push("New components", 175, [], event.tiles.map(s => s.tile.id));
        break;
      }
      case "reshuffle": {
        board = copyBoard(finalBoard);
        push("Board reorganised", 230);
        break;
      }
      default:
        break;
    }
  }
  // Always use the authoritative engine state after the animated steps.
  push("Ready", 0);
  return frames;
}

