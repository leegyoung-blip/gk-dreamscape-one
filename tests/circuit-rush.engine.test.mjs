/** Run with: node --experimental-strip-types --test tests/circuit-rush.engine.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_SIZE, LEVEL_RULES, ENGINE_VERSION, createGame, applyMove,
  replayMoves, findRuns, areAdjacent, hasAvailableMove,
} from '../lib/games/circuit-rush/engine.ts';

const movesFrom = (state) => {
  const moves = [];
  for (let from = 0; from < BOARD_SIZE ** 2; from++) {
    for (const to of [from + 1, from + BOARD_SIZE]) {
      if (areAdjacent(from, to)) {
        const result = applyMove(state, { from, to });
        if (result.accepted) moves.push({ from, to, result });
      }
    }
  }
  return moves;
};

const sortedBoard = (state) => state.board.map(({kind, power}) => [kind, power]);

test('Level configuration is 6×6, 4/5/6 distinct technology types, 5/10/15 DT previews', () => {
  assert.equal(BOARD_SIZE, 6);
  assert.deepEqual(Object.values(LEVEL_RULES).map(x=>x.availableKinds), [4,5,6]);
  assert.deepEqual(Object.values(LEVEL_RULES).map(x=>x.rewardPreviewDT), [5,10,15]);
  assert.equal(ENGINE_VERSION, 1);
});

test('Initial boards are match-free and always have a valid move (500 deterministic scenarios)', () => {
  for (const level of [1,2,3]) for (let i = 0; i < 500; i++) {
    const game = createGame(level, `generation-${i}`);
    assert.equal(game.board.length, 36);
    assert.equal(findRuns(game.board).length, 0, `level ${level}, seed ${i}`);
    assert.ok(hasAvailableMove(game.board), `level ${level}, seed ${i}`);
    assert.ok(game.board.every(t => t.kind < LEVEL_RULES[level].availableKinds));
    assert.equal(new Set(game.board.map(x=>x.id)).size, 36);
  }
});

test('Engine is deterministic and rejects non-neighbour, out-of-range and no-match swaps', () => {
  const state = createGame(2,'same-seed');
  assert.deepEqual(state, createGame(2,'same-seed'));
  assert.notDeepEqual(state.board, createGame(2,'other-seed').board);
  for (const move of [{from:0,to:35},{from:-1,to:0},{from:0,to:36},{from:1.5,to:2}]) {
    const before = JSON.stringify(state);
    const result = applyMove(state,move);
    assert.equal(result.accepted,false);
    assert.equal(result.state.movesUsed,0);
    assert.equal(JSON.stringify(state),before);
  }
  const invalid = [...Array(35)].map((_,from)=>({from,to:from+1})).find(m=>areAdjacent(m.from,m.to)&&!applyMove(state,m).accepted);
  assert.ok(invalid);
  assert.equal(applyMove(state,invalid).accepted,false);
});

test('A valid move consumes exactly one move and resolves all cascades', () => {
  const first = createGame(1,'first-run');
  const options = movesFrom(first);
  assert.ok(options.length > 0);
  const {from,to,result} = options[0];
  assert.equal(result.accepted, true);
  assert.equal(result.state.movesUsed,1);
  assert.ok(result.state.cleared >= 3);
  assert.equal(findRuns(result.state.board).length,0);
  assert.ok(hasAvailableMove(result.state.board));
  assert.equal(new Set(result.state.board.map(x=>x.id)).size,36);
  assert.deepEqual(result,applyMove(first,{from,to}));
  assert.equal(first.movesUsed,0);
});

test('Recorded accepted moves replay exactly; fake steps are rejected', () => {
  for (const level of [1,2,3]) {
    let state = createGame(level,`replay-level-${level}`);
    const moves=[];
    while(state.status === 'playing') {
      const opts = movesFrom(state);
      assert.ok(opts.length>0);
      const move = opts[Math.floor(opts.length/2)];
      moves.push({from:move.from,to:move.to});
      state = move.result.state;
    }
    assert.ok(moves.length <= LEVEL_RULES[level].moveLimit);
    const replay = replayMoves(level,`replay-level-${level}`,moves);
    assert.equal(replay.rejectedAt,null);
    assert.equal(replay.acceptedMoves,moves.length);
    assert.deepEqual(replay.state,state);
    assert.equal(replayMoves(level,`replay-level-${level}`,[{from:0,to:35}]).rejectedAt,0);
    assert.notEqual(replayMoves(level,`replay-level-${level}`,[...moves,...moves]).rejectedAt,null);
    assert.notDeepEqual(sortedBoard(createGame(level,`replay-level-${level}`)),sortedBoard(createGame(level,'mismatched-seed')));
  }
});

test('Large matches can create special tiles and activating them clears a line/area', () => {
  let observedSpecial = false;
  let observedActivation = false;
  for (let attempt=0; attempt<100 && !(observedSpecial && observedActivation);attempt++) {
    let state = createGame(1,`special-${attempt}`);
    while (state.status==='playing') {
      const options = movesFrom(state);
      const preferred = options.find(x => x.result.events.some(e=>e.type==='special-created')) ||
                        options.find(x => x.result.events.some(e=>e.type==='clear'&&e.at.length>3)) || options[0];
      if (!preferred) throw new Error('Stuck board');
      if (preferred.result.events.some(e=>e.type==='special-created')) observedSpecial=true;
      if (state.board.some(x=>x.power)) {
        const activated = options.find(x=>x.result.events.some(e=>e.type==='clear'&&e.at.length>6));
        if (activated) {
          observedActivation=true;
          state=activated.result.state;
          continue;
        }
      }
      state = preferred.result.state;
    }
  }
  assert.ok(observedSpecial,'Expected at least one match-4/match-5 special creation');
  assert.ok(observedActivation,'Expected power tile activation clearing more than 6 tiles');
});

test('No move can be applied after reaching won/lost', () => {
  const initial=createGame(3,'stopped-state');
  const state={...initial,status:'lost'};
  const result=applyMove(state,{from:0,to:1});
  assert.equal(result.accepted,false);
  assert.equal(result.state.movesUsed,0);
});

test('Hundreds of full simulated rounds settle cleanly with bounded scores and unique IDs', () => {
  for(let level of [1,2,3]) {
    for(let round=0; round<110;round++) {
      let state=createGame(level,`fuzz-${level}-${round}`);
      for(let turn=0;state.status==='playing';turn++) {
        assert.ok(turn < LEVEL_RULES[level].moveLimit+1);
        const options=movesFrom(state);
        assert.ok(options.length>0,`No valid move level=${level} seed=${round} turn=${turn}`);
        const choice=options[(turn * 7+round)%options.length];
        state=choice.result.state;
        assert.equal(state.board.length,36);
        assert.equal(findRuns(state.board).length,0);
        assert.equal(new Set(state.board.map(x=>x.id)).size,36);
        assert.ok(state.board.every(x=>x.kind<LEVEL_RULES[level].availableKinds));
        assert.ok(state.cleared>=0);
        assert.ok(state.score>=0);
        assert.ok(state.movesUsed<=LEVEL_RULES[level].moveLimit);
        assert.ok(hasAvailableMove(state.board));
      }
      assert.ok(['won','lost'].includes(state.status));
    }
  }
});
