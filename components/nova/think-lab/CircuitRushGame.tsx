"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  applyMove,
  areAdjacent,
  BOARD_SIZE,
  createGame,
  LEVEL_RULES,
} from "@/lib/games/circuit-rush/engine";
import type { GameState, Level, Move } from "@/lib/games/circuit-rush/engine";
import { buildCircuitRushFrames, copyBoard } from "@/lib/games/circuit-rush/presentation";
import type { DisplayTile } from "@/lib/games/circuit-rush/presentation";
import { CIRCUIT_RUSH_TILE_ASSETS } from "@/lib/games/circuit-rush/assets";
import styles from "./CircuitRushGame.module.css";

// CR-4 IS A PRACTICE PREVIEW: no Supabase, no wallet, no award RPC calls.
// CR-5 must add server-issued sessions and independent replay before any DT awards.

function freshSeed(level: Level, number: number) {
  // Practice-only entropy. This seed MUST NOT be trusted for CR-5 DT rewards.
  return `practice-${level}-${Date.now()}-${number}`;
}

export default function CircuitRushGame() {
  // Constant first seed avoids SSR hydration mismatch.
  const [game, setGame] = useState<GameState>(() => createGame(1, "cr4-preview-initial"));
  const gameRef = useRef(game);
  const [display, setDisplay] = useState<DisplayTile[]>(() => copyBoard(createGame(1, "cr4-preview-initial").board));
  const [selected, setSelected] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("Swap matching components to charge NOVA's circuits.");
  const [combo, setCombo] = useState(0);
  const [hit, setHit] = useState<number[]>([]);
  const [fallingIds, setFallingIds] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const touchStart = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const session = useRef(0);
  const boardEl = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
      void audioContext.current?.close();
      audioContext.current = null;
    };
  }, []);

  function playNote(frequency: number, length = 0.08) {
    if (!soundOn || typeof window === "undefined") return;
    try {
      const Context = window.AudioContext;
      if (!Context) return;
      const ctx = audioContext.current ?? new Context();
      audioContext.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + length);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + length + 0.01);
    } catch {
      // Sound is optional; never block gameplay because of audio permissions.
    }
  }

  const clearTimers = useCallback(() => {
    session.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    busyRef.current = false;
    setBusy(false);
  }, []);

  function restart(level: Level = gameRef.current.level) {
    clearTimers();
    const next = createGame(level, freshSeed(level, session.current));
    gameRef.current = next;
    setGame(next);
    setDisplay(copyBoard(next.board));
    setSelected(null);
    setFocusIndex(0);
    setCombo(0);
    setHit([]);
    setFallingIds([]);
    setFinished(false);
    setMessage(`New ${LEVEL_RULES[level].name} circuit ready. Make your first match!`);
  }

  function attemptSwap(move: Move) {
    if (busyRef.current || gameRef.current.status !== "playing") return;
    const result = applyMove(gameRef.current, move);
    if (!result.accepted) {
      setSelected(null);
      setMessage(result.events[0]?.type === "reject" && result.events[0].reason === "no-match"
        ? "No match — try another adjacent swap." : "Choose two neighbouring components.");
      playNote(170, 0.06);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setSelected(null);
    const previous = gameRef.current;
    gameRef.current = result.state;
    setGame(result.state);
    const clears = result.events.filter(e => e.type === "clear");
    const special = result.events.some(e => e.type === "special-created");
    setCombo(clears.length);
    if (special) setMessage("Power tile created! Swap it to activate its charge.");
    else if (clears.length > 1) setMessage(`${clears.length}× CASCADE! Amazing chain reaction!`);
    else setMessage("Great circuit! Keep the energy flowing.");
    playNote(clears.length > 1 ? 740 : 490, 0.1);

    const frames = buildCircuitRushFrames(previous.board, result.events, result.state.board);
    const ownSession = ++session.current;
    if (reducedMotion.current) {
      setDisplay(copyBoard(result.state.board));
      setHit([]);
      setFallingIds([]);
      busyRef.current = false;
      setBusy(false);
      if (result.state.status !== "playing") setFinished(true);
      return;
    }
    let elapsed = 0;
    for (const frame of frames) {
      const at = elapsed;
      const timer = setTimeout(() => {
        if (ownSession !== session.current) return;
        setDisplay(frame.board);
        setHit(frame.hit);
        setFallingIds(frame.fallingIds);
      }, at);
      timers.current.push(timer);
      elapsed += frame.duration;
    }
    const end = setTimeout(() => {
      if (ownSession !== session.current) return;
      setDisplay(copyBoard(result.state.board));
      setHit([]);
      setFallingIds([]);
      busyRef.current = false;
      setBusy(false);
      setCombo(0);
      timers.current = [];
      if (result.state.status !== "playing") {
        setFinished(true);
        playNote(result.state.status === "won" ? 980 : 250, 0.18);
        setMessage(result.state.status === "won" ? "Circuit fully charged!" : "Out of moves — another round?");
      }
    }, elapsed + 30);
    timers.current.push(end);
  }

  function choose(index: number) {
    if (busyRef.current || gameRef.current.status !== "playing") return;
    if (selected === null) {
      setSelected(index);
      playNote(320, 0.06);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (!areAdjacent(selected, index)) {
      setSelected(index);
      return;
    }
    attemptSwap({ from: selected, to: index });
  }

  function onBoardPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (busyRef.current || gameRef.current.status !== "playing") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cr-index]");
    if (!target || !boardEl.current?.contains(target)) return;
    touchStart.current = Number(target.dataset.crIndex);
    // Capture on the board, so pointer-up is received even after a quick swipe.
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture may be unavailable */ }
  }

  function onBoardPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (touchStart.current === null) return;
    const from = touchStart.current;
    touchStart.current = null;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-cr-index]");
    const to = target && boardEl.current?.contains(target) ? Number(target.dataset.crIndex) : null;
    if (to === null) return;
    if (to !== from && areAdjacent(from, to)) {
      setSelected(null);
      attemptSwap({ from, to });
    } else if (to === from) {
      choose(from);
    }
  }

  function onCellKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowLeft": next = col ? index - 1 : index; break;
      case "ArrowRight": next = col < BOARD_SIZE - 1 ? index + 1 : index; break;
      case "ArrowUp": next = row ? index - BOARD_SIZE : index; break;
      case "ArrowDown": next = row < BOARD_SIZE - 1 ? index + BOARD_SIZE : index; break;
      case " ":
      case "Enter":
        event.preventDefault(); choose(index); return;
      case "Escape":
        setSelected(null); return;
      default: return;
    }
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    cellRefs.current[next]?.focus();
  }

  const rules = LEVEL_RULES[game.level];
  const remaining = Math.max(0, rules.moveLimit - game.movesUsed);
  const progress = Math.min(100, (game.cleared / rules.clearTarget) * 100);
  const statusLabel = game.status === "won" ? "CHARGED" : game.status === "lost" ? "OUT OF MOVES" : "SYSTEM READY";
  const boardClass = [styles.board, busy ? styles.boardBusy : ""].filter(Boolean).join(" ");
  const hitSet = new Set(hit);
  const fallingSet = new Set(fallingIds);

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/nova/thinking-skills-lab" className={styles.back} aria-label="Return to NOVA's Think Lab">← <span>Think Lab</span></Link>
        <div className={styles.wordmark}><span className={styles.wordmarkIcon}>✦</span><span>NOVA<span className={styles.wordmarkDim}> / CIRCUIT RUSH</span></span></div>
        <div className={styles.headActions}>
          <span className={styles.previewPill}><span className={styles.previewLong}>PRACTICE PREVIEW · NO DT AWARDED</span><span className={styles.previewShort}>PRACTICE · 0 DT</span></span>
          <button className={styles.iconButton} type="button" onClick={() => setSoundOn(on => !on)} aria-label={soundOn ? "Mute sound" : "Enable sound"} title={soundOn ? "Mute sound" : "Enable sound"}>{soundOn ? "♫" : "♪"}</button>
          <button className={styles.helpButton} type="button" onClick={() => setInstructionsOpen(true)}>?</button>
        </div>
      </header>

      <section className={styles.content} aria-label="Circuit Rush practice game">
        <div className={styles.playArea}>
          <div className={styles.headline}>
            <div>
              <p className={styles.eyebrow}>NOVA'S THINK LAB <span>·</span> MATCH THREE</p>
              <h1>Circuit <span>Rush</span></h1>
              <p className={styles.subheading}>Swap tech parts. Trigger chain reactions. Power the circuit.</p>
            </div>
            <div className={styles.levelSwitch} aria-label="Select practice difficulty">
              {([1, 2, 3] as const).map(level => {
                return <button key={level} type="button" aria-pressed={game.level === level}
                  className={`${styles.levelButton} ${game.level === level ? styles.activeLevel : ""}`}
                  onClick={() => restart(level)}>{LEVEL_RULES[level].name}</button>;
              })}
            </div>
          </div>

          <div className={styles.gameStage}>
            <div className={styles.boardShell}>
              <div className={styles.boardHeader}>
                <span className={styles.systemStatus}><i /> {statusLabel}</span>
                <span className={styles.boardHeaderRight}>CORE MATRIX 06 × 06</span>
              </div>
              <div className={boardClass} ref={boardEl} onPointerDown={onBoardPointerDown} onPointerUp={onBoardPointerUp}
                onPointerCancel={() => { touchStart.current = null; }} role="grid"
                aria-label={`Circuit Rush ${rules.name}, six by six grid, ${remaining} moves left`} aria-describedby="cr-controls">
                {display.map((tile, index) => {
                  const meta = tile ? CIRCUIT_RUSH_TILE_ASSETS[tile.kind] : null;
                  return (
                    <button key={index} ref={el => { cellRefs.current[index] = el; }} type="button" role="gridcell"
                      className={[styles.tile, selected === index ? styles.selected : "", tile?.power ? styles.powerTile : "", tile?.power === "pulse" ? styles.pulseTile : "", tile ? "" : styles.emptyTile, hitSet.has(index) ? styles.clearingTile : "", tile && fallingSet.has(tile.id) ? styles.fallingTile : ""].filter(Boolean).join(" ")}
                      data-cr-index={index}
                      style={{ "--tile-accent": meta?.colour ?? "#56a4e8" } as CSSProperties}
                      disabled={busy || game.status !== "playing" || tile === null}
                      tabIndex={index === focusIndex ? 0 : -1}
                      onFocus={() => setFocusIndex(index)}
                      onClick={event => { if (event.detail === 0) choose(index); }}
                      onKeyDown={event => onCellKeyDown(event, index)}
                      aria-label={`Row ${Math.floor(index / 6) + 1}, column ${index % 6 + 1}, ${meta?.name ?? "empty"}${tile?.power ? `, ${tile.power} power` : ""}${selected === index ? ", selected" : ""}`} aria-selected={selected === index}
                    >
                      {tile && meta ? <>
                        <img key={tile.id} className={`${styles.tileImage} ${tile.id > 36 ? styles.newTile : ""}`} src={meta.src} alt="" draggable={false}/>
                        {tile.power && <span className={styles.powerMark} aria-hidden="true">{tile.power === "row" ? "↔" : tile.power === "column" ? "↕" : "✦"}</span>}
                      </> : null}
                      {selected === index && <span className={styles.selectCorners} aria-hidden="true"/>}
                    </button>
                  );
                })}
                {busy && combo > 1 && <div className={styles.comboToast} aria-hidden="true">{combo}× CASCADE!</div>}
              </div>
              <div className={styles.boardFooter}>
                <span className={styles.eventMessage} aria-live="polite" aria-atomic="true">{message}</span>
                <span className={styles.boardFooterIcon} aria-hidden="true">◈</span>
              </div>
              {finished && <div className={styles.finishedOverlay} role="dialog" aria-modal="true" aria-label={game.status === "won" ? "Circuit complete" : "Round ended"}>
                <div className={styles.finishedCard}>
                  <span className={styles.finishGlyph}>{game.status === "won" ? "✦" : "↻"}</span>
                  <h2>{game.status === "won" ? "Circuit charged!" : "Power depleted"}</h2>
                  <p>{game.status === "won" ? "Nice work! You completed the circuit challenge." : "No moves left. Try a fresh circuit."}</p>
                  <div className={styles.finishScore}>{game.score.toLocaleString()} <small>POINTS</small></div>
                  <p className={styles.noReward}>Practice only — no Dream Tokens earned.</p>
                  <button className={styles.primaryButton} type="button" onClick={() => restart()}>Play again ↻</button>
                </div>
              </div>}
            </div>
          </div>
        </div>

        <aside className={styles.sidebar} aria-label="Circuit Rush status and rules">
          <div className={styles.missionCard}>
            <div className={styles.cardEyebrow}>DAILY CIRCUIT SIMULATION</div>
            <h2>Charge the reactor</h2>
            <p>Clear enough components before your moves run out.</p>
            <div className={styles.stats}>
              <div className={styles.stat}><span>MOVES LEFT</span><strong>{remaining}<small> / {rules.moveLimit}</small></strong></div>
              <div className={styles.stat}><span>COMPONENTS</span><strong>{game.cleared}<small> / {rules.clearTarget}</small></strong></div>
            </div>
            <div className={styles.progressLabels}><span>CHARGE LEVEL</span><strong>{Math.round(progress)}%</strong></div>
            <div className={styles.progressTrack} role="progressbar" aria-label="Circuit completion" aria-valuenow={game.cleared} aria-valuemin={0} aria-valuemax={rules.clearTarget}>
              <span style={{ width: `${progress}%` }}/>
            </div>
            <div className={styles.scoreline}><span>SCORE</span><strong>{game.score.toLocaleString()}</strong></div>
          </div>
          <div className={styles.rewardCard}>
            <span className={styles.smallEyebrow}>FUTURE REWARD</span>
            <div className={styles.rewardNumber}>{rules.rewardPreviewDT} <small>DT</small></div>
            <p>Preview only. Rewards activate after server verification in CR-5.</p>
          </div>
          <div className={styles.tipsCard} id="cr-controls">
            <span className={styles.smallEyebrow}>HOW TO PLAY</span>
            <p>Tap two neighbours or swipe one into another to match 3 or more of the same tech component.</p>
            <div className={styles.tipsIcons}>
              <span>↔ 4 MATCH <b>LINE BOOST</b></span>
              <span>✦ 5 MATCH <b>PULSE BOOST</b></span>
            </div>
            <p className={styles.keyboardHelp}>{"Use arrow keys to move focus. Press Space or Enter to choose a tile, then choose an adjacent tile. You can also swipe tiles."}</p>
          </div>
          <div className={styles.bottomActions}>
            <button className={styles.restartButton} type="button" onClick={() => restart()}>↻ New board</button>
            <span>NO TIMER · PLAN YOUR MOVES</span>
          </div>
        </aside>
      </section>

      {instructionsOpen && <div className={styles.modalShade} onMouseDown={event => { if (event.target === event.currentTarget) setInstructionsOpen(false); }}>
        <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cr-help-heading">
          <div className={styles.modalHeader}><h2 id="cr-help-heading">How to play Circuit Rush</h2><button type="button" onClick={() => setInstructionsOpen(false)} aria-label="Close instructions">×</button></div>
          <p>Match 3 or more of the same technology components. Each valid swap uses one move.</p>
          <ol>
            <li>Tap one tile, then an adjacent tile, or swipe between them.</li>
            <li>A matching line disappears; new components fall and may form chain reactions.</li>
            <li>Matching 4 creates a row or column power tile. Matching 5 creates a pulse boost. Swap power tiles to activate them.</li>
            <li>Clear the target number before the move limit is reached.</li>
          </ol>
          <p className={styles.modalNote}>This CR-4 preview is for practice. No Dream Tokens are spent or awarded, and no progress is saved.</p>
          <button className={styles.primaryButton} type="button" onClick={() => setInstructionsOpen(false)}>Start playing</button>
        </div>
      </div>}
    </main>
  );
}
