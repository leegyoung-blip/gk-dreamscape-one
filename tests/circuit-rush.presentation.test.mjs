/** Run with: node --experimental-strip-types --test tests/circuit-rush.presentation.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, areAdjacent, createGame } from '../lib/games/circuit-rush/engine.ts';
import { buildCircuitRushFrames } from '../lib/games/circuit-rush/presentation.ts';

function firstValidMove(state) {
  for (let from = 0; from < 36; from++) for (const to of [from + 1, from + 6]) {
    if (!areAdjacent(from, to)) continue;
    const result = applyMove(state, {from, to});
    if (result.accepted) return result;
  }
  throw new Error('Expected at least one legal move');
}

test('CR-4 animation always finishes on the authoritative CR-3 board', () => {
  for (let level of [1,2,3]) {
    for (let seed = 0; seed < 100; seed++) {
      const original = createGame(level, `ui-${level}-${seed}`);
      const next = firstValidMove(original);
      const frames = buildCircuitRushFrames(original.board, next.events, next.state.board);
      assert.ok(frames.length >= 2);
      assert.deepEqual(frames.at(-1).board, next.state.board);
      assert.equal(frames.at(-1).duration, 0);
      assert.deepEqual(original.board, createGame(level, `ui-${level}-${seed}`).board);
      for (const frame of frames) assert.equal(frame.board.length,36);
    }
  }
});

test('Clear frames identify impacted tiles and spawn frames render deterministic new components', () => {
  const initial = createGame(1,'frame-check');
  const result = firstValidMove(initial);
  const frames = buildCircuitRushFrames(initial.board,result.events,result.state.board);
  const matched = frames.filter(frame => frame.hit.length);
  assert.ok(matched.length);
  assert.ok(matched.every(frame => frame.hit.length >= 3));
  assert.ok(frames.some(frame => frame.fallingIds.length));
});

test('No app, database, wallet or network dependency is required to build frames', () => {
  const initial = createGame(3,'independent-presentation');
  const next = firstValidMove(initial);
  const frames = buildCircuitRushFrames(initial.board,next.events,next.state.board);
  assert.ok(frames.every(f => Number.isFinite(f.duration) && f.duration >= 0));
});
