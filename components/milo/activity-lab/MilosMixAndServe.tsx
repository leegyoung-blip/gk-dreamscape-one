"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, PointerEvent as ReactPointerEvent } from "react";

type ItemType = "ingredient" | "dish";
type IngredientKey =
  | "bun"
  | "raw-beef-patty"
  | "cooked-beef-patty"
  | "lettuce"
  | "whole-tomato"
  | "chopped-tomato"
  | "cheese-slice"
  | "bacon";

type IngredientDef = {
  key: IngredientKey;
  label: string;
  image: string;
  supply?: boolean;
};

type RecipeDef = {
  key: string;
  label: string;
  image: string;
  tier: number;
  ingredients: IngredientKey[];
};

type PrepItem = {
  id: number;
  type: ItemType;
  key: string;
  label: string;
  image: string;
  ingredients: IngredientKey[];
  tier?: number;
};

type BoardCell = PrepItem | null;
type OrderSlot = { id: number; recipeKey: string; secondsLeft: number };
type DragState = { fromIndex: number; x: number; y: number } | null;
type ProcessStatus = "processing" | "ready" | "warning" | "burnt";
type WorkstationJob = {
  id: number;
  kind: "patty" | "tomato";
  status: ProcessStatus;
  elapsedTicks: number;
};
type StageResult = { success: boolean; runId: number; stars: number };

type Props = {
  userId: string;
  mobile: boolean;
  dense: boolean;
  width: number;
  height: number;
  onTokenTransaction: (amount: number, description: string) => Promise<boolean>;
  batteryCanStart?: boolean;
  onBatteryBlocked?: () => void;
  onGameplayActivityChange?: (active: boolean) => void;
};

const BOARD_SIZE = 20;
const STAGE_ORDER_GOAL = 10;
const MAX_FAILED_ORDERS = 3;
const ORDER_DURATION_SECONDS = 60;
const PROCESS_TICK_MS = 250;
const PROCESS_DONE_TICKS = 20; // 5 seconds
const AUTO_RETURN_TICKS = 22; // show the green tick briefly before returning
const PAN_WARNING_TICKS = 28;
const PAN_BURNT_TICKS = 36;
const ASSET_BASE = "/milo/activity-lab/mix-serve";

const WORKSTATION_ASSETS = {
  emptyPan: `${ASSET_BASE}/workstations/pan-empty.png`,
  cookingPan: `${ASSET_BASE}/workstations/pan-cooking-patty.png`,
  burntPan: `${ASSET_BASE}/workstations/pan-burnt-patty.png`,
  choppingBoard: `${ASSET_BASE}/workstations/chopping-board.png`,
};
const INGREDIENTS: IngredientDef[] = [
  { key: "bun", label: "Bun", image: `${ASSET_BASE}/ingredients/ingredient-bun.png`, supply: true },
  { key: "raw-beef-patty", label: "Raw Beef Patty", image: `${ASSET_BASE}/ingredients/ingredient-raw-beef-patty.png`, supply: true },
  { key: "cooked-beef-patty", label: "Cooked Beef Patty", image: `${ASSET_BASE}/ingredients/ingredient-beef-patty.png` },
  { key: "lettuce", label: "Lettuce", image: `${ASSET_BASE}/ingredients/ingredient-lettuce.png`, supply: true },
  { key: "whole-tomato", label: "Whole Tomato", image: `${ASSET_BASE}/ingredients/ingredient-whole-tomato.png`, supply: true },
  { key: "chopped-tomato", label: "Chopped Tomato", image: `${ASSET_BASE}/ingredients/ingredient-tomato.png` },
  { key: "cheese-slice", label: "Cheese", image: `${ASSET_BASE}/ingredients/ingredient-cheese-slice.png`, supply: true },
  { key: "bacon", label: "Bacon", image: `${ASSET_BASE}/ingredients/ingredient-bacon.png`, supply: true },
];

const SUPPLY_KEYS = INGREDIENTS.filter((item) => item.supply).map((item) => item.key);

const BURGER_RECIPES: RecipeDef[] = [
  {
    key: "dish-burger-tier-1-basic-burger",
    label: "Basic Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-1-basic-burger.png`,
    tier: 1,
    ingredients: ["bun", "cooked-beef-patty"],
  },
  {
    key: "dish-burger-tier-2-lettuce-burger",
    label: "Lettuce Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-2-lettuce-burger.png`,
    tier: 2,
    ingredients: ["bun", "cooked-beef-patty", "lettuce"],
  },
  {
    key: "dish-burger-tier-3-classic-burger",
    label: "Classic Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-3-classic-burger.png`,
    tier: 3,
    ingredients: ["bun", "cooked-beef-patty", "lettuce", "chopped-tomato"],
  },
  {
    key: "dish-burger-tier-4-cheeseburger",
    label: "Cheeseburger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-4-cheeseburger.png`,
    tier: 4,
    ingredients: ["bun", "cooked-beef-patty", "lettuce", "chopped-tomato", "cheese-slice"],
  },
  {
    key: "dish-burger-tier-5-deluxe-burger",
    label: "Deluxe Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-5-deluxe-burger.png`,
    tier: 5,
    ingredients: ["bun", "cooked-beef-patty", "lettuce", "chopped-tomato", "cheese-slice", "bacon"],
  },
];

const STAGE1_DT_BY_STARS: Record<number, number> = { 1: 6, 2: 9, 3: 12 };

function ingredientDef(key: IngredientKey) {
  return INGREDIENTS.find((item) => item.key === key)!;
}

function createIngredient(id: number, key: IngredientKey): PrepItem {
  const item = ingredientDef(key);
  return { id, type: "ingredient", key, label: item.label, image: item.image, ingredients: [key] };
}

function createDish(id: number, recipe: RecipeDef): PrepItem {
  return {
    id,
    type: "dish",
    key: recipe.key,
    label: recipe.label,
    image: recipe.image,
    ingredients: [...recipe.ingredients],
    tier: recipe.tier,
  };
}

function initialBoard(): BoardCell[] {
  const board = Array<BoardCell>(BOARD_SIZE).fill(null);
  const starters: IngredientKey[] = ["bun", "raw-beef-patty", "lettuce", "whole-tomato", "cheese-slice"];
  starters.forEach((key, index) => {
    board[index * 2] = createIngredient(index + 1, key);
  });
  return board;
}

function shuffledSupplyKeys() {
  const keys = [...SUPPLY_KEYS];
  for (let index = keys.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [keys[index], keys[swap]] = [keys[swap], keys[index]];
  }
  return keys;
}

function tierBaseScore(tier: number) {
  return [0, 100, 150, 200, 250, 300][tier] ?? 100;
}

function scoreForOrder(recipe: RecipeDef, secondsLeft: number) {
  return tierBaseScore(recipe.tier) + Math.max(0, secondsLeft) * 4;
}

function tierCapForProgress(ordersServed: number) {
  if (ordersServed < 2) return 2;
  if (ordersServed < 5) return 3;
  if (ordersServed < 8) return 4;
  return 5;
}

function starsForStage(success: boolean, failedOrders: number) {
  if (!success) return 0;
  if (failedOrders === 0) return 3;
  if (failedOrders === 1) return 2;
  return 1;
}

function nextBurgerRecipe(a: PrepItem, b: PrepItem) {
  const dish = a.type === "dish" ? a : b.type === "dish" ? b : null;
  const ingredient = a.type === "ingredient" ? a : b.type === "ingredient" ? b : null;

  if (dish && ingredient) {
    const current = BURGER_RECIPES.find((recipe) => recipe.key === dish.key);
    if (!current) return null;
    const next = BURGER_RECIPES.find((recipe) => recipe.tier === current.tier + 1);
    if (!next) return null;
    const added = next.ingredients.filter((key) => !current.ingredients.includes(key));
    return added.length === 1 && ingredient.key === added[0] ? next : null;
  }

  if (a.type === "ingredient" && b.type === "ingredient") {
    const keys = new Set([a.key, b.key]);
    if (keys.has("bun") && keys.has("cooked-beef-patty")) return BURGER_RECIPES[0];
  }

  return null;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function MilosMixAndServe({
  userId,
  mobile,
  dense,
  width,
  height,
  onTokenTransaction,
  batteryCanStart = true,
  onBatteryBlocked,
  onGameplayActivityChange,
}: Props) {
  const compact = height < 760 || width < 1100;
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [guideStep, setGuideStep] = useState(0);
  const [board, setBoard] = useState<BoardCell[]>(() => initialBoard());
  const boardRef = useRef<BoardCell[]>(board);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [orders, setOrders] = useState<OrderSlot[]>([]);
  const ordersRef = useRef<OrderSlot[]>([]);
  const [orderTimersStarted, setOrderTimersStarted] = useState(false);
  const [ordersServed, setOrdersServed] = useState(0);
  const ordersServedRef = useRef(0);
  const [failedOrders, setFailedOrders] = useState(0);
  const failedOrdersRef = useRef(0);
  const [score, setScore] = useState(0);
  const [runSeconds, setRunSeconds] = useState(0);
  const [status, setStatus] = useState("Milo will show you how to cook and build the burgers before Stage 1 starts.");
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const [rewardState, setRewardState] = useState<"idle" | "awarding" | "awarded" | "guest" | "failed">("idle");
  const [awardedDt, setAwardedDt] = useState(0);
  const [panJobs, setPanJobs] = useState<Array<WorkstationJob | null>>([null, null, null]);
  const [choppingJob, setChoppingJob] = useState<WorkstationJob | null>(null);

  const nextItemId = useRef(1000);
  const nextOrderId = useRef(1);
  const nextJobId = useRef(1);
  const currentStageRunId = useRef(0);
  const awardedStageRuns = useRef<Set<string>>(new Set());
  const supplyOrderRef = useRef<IngredientKey[]>(shuffledSupplyKeys());
  const supplyIndexRef = useRef(0);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  useEffect(() => {
    ordersServedRef.current = ordersServed;
  }, [ordersServed]);
  useEffect(() => {
    failedOrdersRef.current = failedOrders;
  }, [failedOrders]);

  const panel: CSSProperties = {
    border: "1px solid rgba(128,226,255,.14)",
    background: "linear-gradient(145deg, rgba(8,27,46,.9), rgba(4,13,27,.96))",
    boxShadow: "inset 0 0 30px rgba(86,214,255,.025), 0 14px 34px rgba(0,0,0,.2)",
  };

  const occupied = useMemo(() => board.filter(Boolean).length, [board]);
  const currentStarsPreview = starsForStage(true, failedOrders);
  const stageDtPreview = STAGE1_DT_BY_STARS[currentStarsPreview] ?? 0;
  const resultDt = stageResult?.success ? STAGE1_DT_BY_STARS[stageResult.stars] ?? 0 : 0;

  function resetStageState() {
    const initial = initialBoard();
    setRunning(false);
    setPaused(false);
    setBoard(initial);
    boardRef.current = initial;
    setSelectedIndex(null);
    setDragState(null);
    setOrders([]);
    ordersRef.current = [];
    setOrderTimersStarted(false);
    setOrdersServed(0);
    ordersServedRef.current = 0;
    setFailedOrders(0);
    failedOrdersRef.current = 0;
    setScore(0);
    setRunSeconds(0);
    setStageResult(null);
    setRewardState("idle");
    setAwardedDt(0);
    setPanJobs([null, null, null]);
    setChoppingJob(null);
    nextItemId.current = 1000;
    nextOrderId.current = 1;
    nextJobId.current = 1;
    supplyOrderRef.current = shuffledSupplyKeys();
    supplyIndexRef.current = 0;
  }

  function eligibleRecipes(servedCount: number) {
    const cap = tierCapForProgress(servedCount);
    return BURGER_RECIPES.filter((recipe) => recipe.tier <= cap);
  }

  function createOrder(servedCount: number, avoidKeys: string[] = []): OrderSlot {
    const eligible = eligibleRecipes(servedCount);
    const fresh = eligible.filter((recipe) => !avoidKeys.includes(recipe.key));
    const pool = fresh.length ? fresh : eligible;
    const recipe = pool[Math.floor(Math.random() * pool.length)] ?? BURGER_RECIPES[0];
    return { id: nextOrderId.current++, recipeKey: recipe.key, secondsLeft: ORDER_DURATION_SECONDS };
  }

  function fillInitialOrders() {
    const initial: OrderSlot[] = [];
    for (let index = 0; index < 3; index += 1) {
      initial.push(createOrder(0, initial.map((order) => order.recipeKey)));
    }
    ordersRef.current = initial;
    setOrders(initial);
  }

  useEffect(() => {
    onGameplayActivityChange?.(running && !paused);
  }, [onGameplayActivityChange, paused, running]);

  useEffect(() => {
    return () => onGameplayActivityChange?.(false);
  }, [onGameplayActivityChange]);

  function startStage() {
    if (!batteryCanStart) {
      onBatteryBlocked?.();
      return false;
    }

    resetStageState();
    currentStageRunId.current += 1;
    setShowGuide(false);
    setRunning(true);
    setPaused(false);
    setStatus("Burger Basics started. Customer clocks will begin after you serve the first order.");
    window.setTimeout(fillInitialOrders, 0);
    return true;
  }

  function completeStage(success: boolean, failuresOverride?: number) {
    const finalFailures = failuresOverride ?? failedOrdersRef.current;
    setRunning(false);
    setPaused(false);
    setOrders([]);
    ordersRef.current = [];
    setOrderTimersStarted(false);
    setSelectedIndex(null);
    setDragState(null);
    setStageResult({
      success,
      runId: currentStageRunId.current,
      stars: starsForStage(success, finalFailures),
    });
    setStatus(success ? "Burger Basics complete! Replay Stage 1 to chase a higher score." : "Stage failed after three missed orders. Try Stage 1 again.");
  }

  useEffect(() => {
    if (!running || paused || stageResult) return;
    const timer = window.setInterval(() => {
      setRunSeconds((value) => value + 1);
      if (!orderTimersStarted || ordersRef.current.length === 0) return;

      const decremented = ordersRef.current.map((order) => ({ ...order, secondsLeft: order.secondsLeft - 1 }));
      const expired = decremented.filter((order) => order.secondsLeft <= 0);
      if (!expired.length) {
        ordersRef.current = decremented;
        setOrders(decremented);
        return;
      }

      const nextFailures = Math.min(MAX_FAILED_ORDERS, failedOrdersRef.current + expired.length);
      failedOrdersRef.current = nextFailures;
      setFailedOrders(nextFailures);
      if (nextFailures >= MAX_FAILED_ORDERS) {
        completeStage(false, nextFailures);
        return;
      }

      let nextOrders = decremented.filter((order) => order.secondsLeft > 0);
      expired.forEach(() => {
        nextOrders.push(createOrder(ordersServedRef.current, nextOrders.map((order) => order.recipeKey)));
      });
      nextOrders = nextOrders.slice(-3);
      ordersRef.current = nextOrders;
      setOrders(nextOrders);
      setStatus(`${expired.length === 1 ? "One order expired" : `${expired.length} orders expired`}. ${nextFailures} / ${MAX_FAILED_ORDERS} missed.`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, paused, stageResult, orderTimersStarted]);

  // Workstation processing loop. Both raw patties and whole tomatoes take 5 seconds.
  // Finished food auto-returns to the prep counter after a brief green-tick state.
  useEffect(() => {
    if (!running || paused || stageResult) return;

    const timer = window.setInterval(() => {
      setPanJobs((currentJobs) => {
        let boardCopy = [...boardRef.current];
        let boardChanged = false;
        const nextJobs = currentJobs.map((job) => {
          if (!job || job.status === "burnt") return job;
          const nextTicks = job.elapsedTicks + 1;
          let status: ProcessStatus = job.status;
          if (nextTicks >= PROCESS_DONE_TICKS && status === "processing") status = "ready";
          if (nextTicks >= PAN_WARNING_TICKS && status === "ready") status = "warning";
          if (nextTicks >= PAN_BURNT_TICKS) status = "burnt";

          if (status !== "burnt" && nextTicks >= AUTO_RETURN_TICKS) {
            const empty = boardCopy.findIndex((item) => item === null);
            if (empty !== -1) {
              boardCopy[empty] = createIngredient(++nextItemId.current, "cooked-beef-patty");
              boardChanged = true;
              setStatus("Cooked patty returned to the prep counter.");
              return null;
            }
          }

          return { ...job, elapsedTicks: nextTicks, status };
        });
        if (boardChanged) {
          boardRef.current = boardCopy;
          setBoard(boardCopy);
        }
        return nextJobs;
      });

      setChoppingJob((job) => {
        if (!job) return null;
        const nextTicks = job.elapsedTicks + 1;
        const status: ProcessStatus = nextTicks >= PROCESS_DONE_TICKS ? "ready" : "processing";
        if (nextTicks >= AUTO_RETURN_TICKS) {
          const boardCopy = [...boardRef.current];
          const empty = boardCopy.findIndex((item) => item === null);
          if (empty !== -1) {
            boardCopy[empty] = createIngredient(++nextItemId.current, "chopped-tomato");
            boardRef.current = boardCopy;
            setBoard(boardCopy);
            setStatus("Chopped tomato returned to the prep counter.");
            return null;
          }
        }
        return { ...job, elapsedTicks: nextTicks, status };
      });
    }, PROCESS_TICK_MS);

    return () => window.clearInterval(timer);
  }, [running, paused, stageResult]);

  useEffect(() => {
    if (!stageResult?.success) return;
    const key = `stage1-${stageResult.runId}`;
    if (awardedStageRuns.current.has(key)) return;
    const reward = STAGE1_DT_BY_STARS[stageResult.stars] ?? 0;

    if (!userId) {
      awardedStageRuns.current.add(key);
      setRewardState("guest");
      return;
    }

    awardedStageRuns.current.add(key);
    setRewardState("awarding");
    void onTokenTransaction(reward, `Milo's Mix & Serve · Stage 1 reward · Run ${stageResult.runId}`).then((success) => {
      if (success) {
        setAwardedDt(reward);
        setRewardState("awarded");
      } else {
        awardedStageRuns.current.delete(key);
        setRewardState("failed");
      }
    });
  }, [stageResult, userId, onTokenTransaction]);

  function spawnIngredient() {
    if (!running || paused) return;
    const current = [...boardRef.current];
    const empty = current.findIndex((item) => item === null);
    if (empty === -1) {
      setStatus("The prep counter is full. Combine, cook, chop or discard an item first.");
      return;
    }

    // Fair supply rotation: the six Stage 1 supply ingredients cycle in a randomised
    // order. That guarantees no ingredient can disappear for more than five other clicks.
    const supplyOrder = supplyOrderRef.current;
    const key = supplyOrder[supplyIndexRef.current % supplyOrder.length];
    supplyIndexRef.current += 1;
    const item = createIngredient(++nextItemId.current, key);
    current[empty] = item;
    boardRef.current = current;
    setBoard(current);
    setStatus(`${item.label} added to the prep counter.`);
  }

  function discardItem(index: number) {
    if (!running || paused) return;
    const current = [...boardRef.current];
    const item = current[index];
    if (!item) return;
    current[index] = null;
    boardRef.current = current;
    setBoard(current);
    setSelectedIndex(null);
    setStatus(`${item.label} discarded.`);
  }

  function moveOrCombine(fromIndex: number, toIndex: number) {
    if (!running || paused || fromIndex === toIndex) return;
    const current = [...boardRef.current];
    const source = current[fromIndex];
    if (!source) return;
    const destination = current[toIndex];

    if (!destination) {
      current[toIndex] = source;
      current[fromIndex] = null;
      boardRef.current = current;
      setBoard(current);
      setSelectedIndex(null);
      return;
    }

    const recipe = nextBurgerRecipe(source, destination);
    if (recipe) {
      current[toIndex] = createDish(++nextItemId.current, recipe);
      current[fromIndex] = null;
      boardRef.current = current;
      setBoard(current);
      setStatus(`${recipe.label} created.`);
    } else {
      // Wrong-order combinations are non-destructive: swap the two board positions.
      current[toIndex] = source;
      current[fromIndex] = destination;
      boardRef.current = current;
      setBoard(current);
      setStatus("That is not the next burger step — the two items swapped places.");
    }
    setSelectedIndex(null);
  }

  function handleCellClick(index: number) {
    if (!running || paused) return;
    if (selectedIndex === null) {
      if (boardRef.current[index]) setSelectedIndex(index);
      return;
    }
    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }
    moveOrCombine(selectedIndex, index);
  }

  function sendToPan(fromIndex: number, panIndex: number) {
    if (!running || paused) return;
    const item = boardRef.current[fromIndex];
    if (!item) return;
    if (item.type !== "ingredient" || item.key !== "raw-beef-patty") {
      setStatus("Only a raw beef patty goes into the pan.");
      return;
    }
    if (panJobs[panIndex]) {
      setStatus(`Pan ${panIndex + 1} is already occupied.`);
      return;
    }
    const current = [...boardRef.current];
    current[fromIndex] = null;
    boardRef.current = current;
    setBoard(current);
    setPanJobs((jobs) => jobs.map((job, index) => index === panIndex ? { id: nextJobId.current++, kind: "patty", status: "processing", elapsedTicks: 0 } : job));
    setSelectedIndex(null);
    setStatus(`Patty cooking in Pan ${panIndex + 1} · 5 seconds.`);
  }

  function sendToChoppingBoard(fromIndex: number) {
    if (!running || paused) return;
    const item = boardRef.current[fromIndex];
    if (!item) return;
    if (item.type !== "ingredient" || item.key !== "whole-tomato") {
      setStatus("Only a whole tomato needs the chopping board in Stage 1.");
      return;
    }
    if (choppingJob) {
      setStatus("The chopping board is already in use.");
      return;
    }
    const current = [...boardRef.current];
    current[fromIndex] = null;
    boardRef.current = current;
    setBoard(current);
    setChoppingJob({ id: nextJobId.current++, kind: "tomato", status: "processing", elapsedTicks: 0 });
    setSelectedIndex(null);
    setStatus("Tomato chopping · 5 seconds.");
  }

  function clearBurntPan(panIndex: number) {
    setPanJobs((jobs) => jobs.map((job, index) => index === panIndex ? null : job));
    setStatus(`Burnt patty cleared from Pan ${panIndex + 1}.`);
  }

  function replaceOrder(orderId: number, servedCount: number) {
    const current = ordersRef.current;
    const otherKeys = current.filter((order) => order.id !== orderId).map((order) => order.recipeKey);
    const next = current.map((order) => order.id === orderId ? createOrder(servedCount, otherKeys) : order);
    ordersRef.current = next;
    setOrders(next);
  }

  function serveDishToOrder(fromIndex: number, orderId: number) {
    if (!running || paused) return;
    const dish = boardRef.current[fromIndex];
    const order = ordersRef.current.find((item) => item.id === orderId);
    if (!dish || !order) return;
    if (dish.type !== "dish") {
      setStatus("Only a finished burger can be served.");
      return;
    }
    if (dish.key !== order.recipeKey) {
      const requested = BURGER_RECIPES.find((recipe) => recipe.key === order.recipeKey);
      setStatus(`${dish.label} does not match ${requested?.label ?? "this order"}.`);
      return;
    }

    const recipe = BURGER_RECIPES.find((item) => item.key === order.recipeKey);
    if (!recipe) return;

    const current = [...boardRef.current];
    current[fromIndex] = null;
    boardRef.current = current;
    setBoard(current);

    const earned = scoreForOrder(recipe, order.secondsLeft);
    const nextServed = ordersServedRef.current + 1;
    ordersServedRef.current = nextServed;
    setOrdersServed(nextServed);
    setScore((value) => value + earned);
    setSelectedIndex(null);

    if (!orderTimersStarted) {
      setOrderTimersStarted(true);
      setStatus(`${recipe.label} served · +${earned} points. The 60-second customer clocks are now running!`);
    } else {
      setStatus(`${recipe.label} served with ${order.secondsLeft}s left · +${earned} points.`);
    }

    if (nextServed >= STAGE_ORDER_GOAL) {
      completeStage(true);
      return;
    }
    replaceOrder(orderId, nextServed);
  }

  function beginPointerDrag(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (!mobile || !running || paused || !boardRef.current[index]) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedIndex(index);
    setDragState({ fromIndex: index, x: event.clientX, y: event.clientY });
  }

  function movePointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    setDragState((current) => current ? { ...current, x: event.clientX, y: event.clientY } : null);
  }

  function resolveDropTarget(target: Element | null) {
    const order = target?.closest("[data-order-id]") as HTMLElement | null;
    if (order?.dataset.orderId) return { type: "order" as const, orderId: Number(order.dataset.orderId) };
    const pan = target?.closest("[data-pan-index]") as HTMLElement | null;
    if (pan?.dataset.panIndex !== undefined) return { type: "pan" as const, panIndex: Number(pan.dataset.panIndex) };
    if (target?.closest('[data-prep-zone="chopping"]')) return { type: "chopping" as const };
    if (target?.closest('[data-prep-zone="discard"]')) return { type: "discard" as const };
    const cell = target?.closest("[data-prep-cell]") as HTMLElement | null;
    if (cell?.dataset.prepCell !== undefined) return { type: "cell" as const, index: Number(cell.dataset.prepCell) };
    return null;
  }

  function endPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    const target = resolveDropTarget(document.elementFromPoint(event.clientX, event.clientY));
    if (target?.type === "order") serveDishToOrder(dragState.fromIndex, target.orderId);
    else if (target?.type === "pan") sendToPan(dragState.fromIndex, target.panIndex);
    else if (target?.type === "chopping") sendToChoppingBoard(dragState.fromIndex);
    else if (target?.type === "discard") discardItem(dragState.fromIndex);
    else if (target?.type === "cell") moveOrCombine(dragState.fromIndex, target.index);
    setDragState(null);
  }

  function onDragStart(event: DragEvent<HTMLButtonElement>, index: number) {
    if (!running || paused || !boardRef.current[index]) {
      event.preventDefault();
      return;
    }
    setSelectedIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/milo-prep-cell", String(index));
  }

  function readDragIndex(event: DragEvent<HTMLElement>) {
    const value = Number(event.dataTransfer.getData("text/milo-prep-cell"));
    return Number.isFinite(value) ? value : null;
  }

  function workstationProgress(job: WorkstationJob | null) {
    if (!job) return 0;
    return Math.min(100, (Math.min(job.elapsedTicks, PROCESS_DONE_TICKS) / PROCESS_DONE_TICKS) * 100);
  }

  function renderEquipmentItem(job: WorkstationJob | null, kind: "pan" | "chopping") {
    const statusBorder = job?.status === "burnt"
      ? "rgba(255,96,108,.6)"
      : job?.status === "warning"
        ? "rgba(255,196,70,.55)"
        : "rgba(132,239,178,.22)";

    if (kind === "pan") {
      const image = !job
        ? WORKSTATION_ASSETS.emptyPan
        : job.status === "burnt"
          ? WORKSTATION_ASSETS.burntPan
          : WORKSTATION_ASSETS.cookingPan;

      return (
        <div
          style={{
            width: 82,
            height: 76,
            borderRadius: 16,
            border: `1px solid ${job ? statusBorder : "rgba(255,255,255,.08)"}`,
            background: "rgba(255,255,255,.018)",
            display: "grid",
            placeItems: "center",
            position: "relative",
            overflow: "visible",
          }}
        >
          <img
            src={image}
            alt=""
            draggable={false}
            style={{
              width: 76,
              height: 70,
              objectFit: "contain",
              pointerEvents: "none",
              animation: job?.status === "warning" ? "mixServeEquipmentShake .5s linear infinite" : undefined,
            }}
          />
          {(job?.status === "ready" || job?.status === "warning") && (
            <span
              style={{
                position: "absolute",
                right: -3,
                top: -5,
                width: 23,
                height: 23,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: job.status === "warning" ? "#ffbf45" : "#70e9a4",
                color: "#05150c",
                fontSize: 13,
                fontWeight: 950,
                animation: job.status === "warning" ? "mixServeWarningFlash .55s ease-in-out infinite" : undefined,
                boxShadow: "0 3px 10px rgba(0,0,0,.35)",
              }}
            >
              {job.status === "warning" ? "!" : "✓"}
            </span>
          )}
          {job?.status === "burnt" && (
            <span style={{ position: "absolute", right: -3, top: -5, width: 23, height: 23, borderRadius: 999, display: "grid", placeItems: "center", background: "#ff6b78", color: "white", fontSize: 12, fontWeight: 950, boxShadow: "0 3px 10px rgba(0,0,0,.35)" }}>×</span>
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          width: 82,
          height: 70,
          borderRadius: 15,
          border: `1px solid ${job ? statusBorder : "rgba(255,255,255,.08)"}`,
          background: "rgba(255,255,255,.018)",
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <img src={WORKSTATION_ASSETS.choppingBoard} alt="" draggable={false} style={{ width: 78, height: 66, objectFit: "contain", pointerEvents: "none" }} />
        {job && (
          <img
            src={ingredientDef("whole-tomato").image}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "48%",
              transform: "translate(-50%,-50%)",
              width: 36,
              height: 36,
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        )}
        {job?.status === "ready" && (
          <span style={{ position: "absolute", right: -3, top: -5, width: 23, height: 23, borderRadius: 999, display: "grid", placeItems: "center", background: "#70e9a4", color: "#05150c", fontSize: 13, fontWeight: 950, boxShadow: "0 3px 10px rgba(0,0,0,.35)" }}>✓</span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: mobile ? 14 : 18,
        background: "radial-gradient(circle at 50% 0%, rgba(255,174,70,.08), transparent 28%), linear-gradient(155deg,#061524,#040b18 58%,#080815)",
        padding: mobile ? 7 : dense ? 8 : 10,
        display: "grid",
        gridTemplateRows: "auto auto auto auto minmax(0,1fr)",
        gap: mobile ? 6 : 8,
      }}
    >
      <style>{`
        @keyframes mixServeOrderShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes mixServeEquipmentShake {
          0%,100% { transform: rotate(0deg) translateX(0); }
          25% { transform: rotate(-3deg) translateX(-2px); }
          75% { transform: rotate(3deg) translateX(2px); }
        }
        @keyframes mixServeWarningFlash {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: .35; transform: scale(1.16); }
        }
        @keyframes miloGuidePulse {
          0%,100% { box-shadow: 0 0 0 rgba(255,190,92,0); }
          50% { box-shadow: 0 0 24px rgba(255,190,92,.18); }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#ffbf68", fontSize: mobile ? 9 : 11, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase" }}>Stage 1 · Milo’s Burger Lesson</p>
          <h2 style={{ margin: "3px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 25 : compact ? 30 : 36, lineHeight: 1, fontWeight: 400 }}>Milo’s Mix & Serve</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" disabled style={{ minHeight: 36, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", color: "rgba(255,255,255,.3)", fontSize: 10, fontWeight: 900 }}>Stage 2 · Coming Soon</button>
          <button type="button" onClick={() => { setGuideStep(0); setShowGuide(true); }} style={{ minHeight: 36, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,191,104,.22)", background: "rgba(255,173,66,.06)", color: "#ffd08a", fontSize: 10, fontWeight: 900, cursor: "pointer" }}>Milo Guide</button>
          <button type="button" onClick={() => setShowHelp(true)} style={{ minHeight: 36, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.06)", color: "#dffaff", fontSize: 10, fontWeight: 900, cursor: "pointer" }}>? How to Play</button>
          <button type="button" onClick={() => running && setPaused((value) => !value)} disabled={!running} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(126,232,255,.18)", background: "rgba(83,215,255,.06)", color: running ? "white" : "rgba(255,255,255,.3)" }}>{paused ? "▶" : "Ⅱ"}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 6 }}>
        {[
          ["SCORE", score.toLocaleString(), "Tier points + speed bonus"],
          ["ORDERS", `${ordersServed} / ${STAGE_ORDER_GOAL}`, "Complete 10 to clear Stage 1"],
          ["MISSED", `${failedOrders} / ${MAX_FAILED_ORDERS}`, "Third miss fails the stage"],
          ["STAGE DT", `Up to +${STAGE1_DT_BY_STARS[3]}`, `Current rating would earn +${stageDtPreview}`],
        ].map(([label, value, sub]) => (
          <div key={label} style={{ ...panel, borderRadius: 13, padding: "8px 10px", minWidth: 0 }}>
            <p style={{ margin: 0, color: "rgba(166,235,255,.5)", fontSize: 8, fontWeight: 950, letterSpacing: ".11em" }}>{label}</p>
            <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 7 }}>
              <strong style={{ fontSize: mobile ? 16 : 19, lineHeight: 1, color: label === "MISSED" ? "#ff9ca7" : label === "STAGE DT" ? "#ffd66f" : "white" }}>{value}</strong>
              {!mobile && !compact && <span style={{ color: "rgba(255,255,255,.28)", fontSize: 7.5 }}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
        {orders.map((order) => {
          const recipe = BURGER_RECIPES.find((item) => item.key === order.recipeKey)!;
          const urgent = orderTimersStarted && order.secondsLeft <= 15;
          const shakeNow = orderTimersStarted && order.secondsLeft === 15;
          const progress = (order.secondsLeft / ORDER_DURATION_SECONDS) * 100;
          return (
            <div
              key={order.id}
              data-order-id={order.id}
              onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = readDragIndex(event);
                if (fromIndex !== null) serveDishToOrder(fromIndex, order.id);
              }}
              onClick={() => selectedIndex !== null && serveDishToOrder(selectedIndex, order.id)}
              style={{ ...panel, minWidth: 0, borderRadius: 14, padding: 8, border: urgent ? "1px solid rgba(255,105,117,.42)" : "1px solid rgba(128,226,255,.14)", animation: shakeNow ? "mixServeOrderShake .65s ease-in-out 1" : undefined }}
            >
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "42px minmax(0,1fr)" : "48px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
                <img src={recipe.image} alt="" style={{ width: mobile ? 40 : 46, height: mobile ? 40 : 46, objectFit: "contain" }} />
                <div style={{ minWidth: 0 }}>
                  <span style={{ display: "block", color: "#ffd08a", fontSize: 7, fontWeight: 950, letterSpacing: ".1em" }}>ORDER · TIER {recipe.tier}</span>
                  <strong style={{ display: "block", marginTop: 2, fontSize: mobile ? 10 : 12, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{recipe.label}</strong>
                  <span style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.34)", fontSize: 7 }}>Base {tierBaseScore(recipe.tier)} + speed</span>
                </div>
                {!mobile && (
                  <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", flexWrap: "wrap", maxWidth: 150 }}>
                    {recipe.ingredients.map((key) => (
                      <span key={key} title={ingredientDef(key).label} style={{ width: 26, height: 26, borderRadius: 8, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)", display: "grid", placeItems: "center" }}>
                        <img src={ingredientDef(key).image} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, alignItems: "center" }}>
                <div style={{ height: 9, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                  <div style={{ width: `${progress}%`, height: "100%", borderRadius: 999, background: !orderTimersStarted ? "#7fe7ff" : urgent ? "#ff6e79" : order.secondsLeft <= 30 ? "#ffd36d" : "#86efad", transition: "width .25s linear" }} />
                </div>
                <strong style={{ color: urgent ? "#ff8e98" : "rgba(255,255,255,.55)", fontSize: 9 }}>{orderTimersStarted ? `${order.secondsLeft}s` : "WAITING"}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...panel, borderRadius: 14, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 10 }}>{running ? paused ? "Kitchen paused" : orderTimersStarted ? "Customer clocks running" : "Build and serve the first order to start the clocks" : "Burger Basics ready"}</strong>
          <span style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.36)", fontSize: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{status}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={spawnIngredient} disabled={!running || paused} style={{ minHeight: 38, padding: "0 16px", borderRadius: 12, border: "1px solid rgba(126,232,255,.22)", background: "rgba(83,215,255,.08)", color: "white", fontSize: 11, fontWeight: 950, cursor: running && !paused ? "pointer" : "not-allowed" }}>Supply +</button>
          <button type="button" onClick={() => selectedIndex !== null && discardItem(selectedIndex)} disabled={!running || paused || selectedIndex === null} style={{ minHeight: 38, padding: "0 16px", borderRadius: 12, border: "1px solid rgba(255,129,143,.2)", background: "rgba(255,100,120,.07)", color: "white", fontSize: 11, fontWeight: 900, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>Discard</button>
          {!running && !stageResult && <button type="button" onClick={() => { setGuideStep(0); setShowGuide(true); }} style={{ minHeight: 38, padding: "0 16px", borderRadius: 12, border: "1px solid rgba(255,211,104,.36)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontSize: 11, fontWeight: 950, cursor: "pointer" }}>Milo Guide & Start</button>}
        </div>
      </div>

      <div style={{ minHeight: 0, display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1.18fr) minmax(350px,.82fr)", gap: 7 }}>
        <div style={{ ...panel, minHeight: 0, borderRadius: 16, padding: 9, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "#9feeff", fontSize: 9, fontWeight: 950, letterSpacing: ".12em" }}>PREP COUNTER</p>
              {!mobile && <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.32)", fontSize: 8.5 }}>Cook patties, chop tomatoes, then build burgers in the exact Milo Guide order.</p>}
            </div>
            <span style={{ color: "rgba(255,255,255,.38)", fontSize: 9 }}>{occupied} / {BOARD_SIZE}</span>
          </div>
          <div style={{ minHeight: 0, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gridTemplateRows: "repeat(4,minmax(0,1fr))", gap: mobile ? 5 : 6 }}>
            {board.map((item, index) => {
              const selected = selectedIndex === index;
              return (
                <button
                  key={index}
                  type="button"
                  data-prep-cell={index}
                  draggable={!mobile && Boolean(item) && running && !paused}
                  onClick={() => handleCellClick(index)}
                  onDragStart={(event) => onDragStart(event, index)}
                  onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
                  onDrop={(event) => { event.preventDefault(); const from = readDragIndex(event); if (from !== null) moveOrCombine(from, index); }}
                  onPointerDown={(event) => beginPointerDrag(event, index)}
                  onPointerMove={movePointerDrag}
                  onPointerUp={endPointerDrag}
                  onPointerCancel={() => setDragState(null)}
                  style={{ minWidth: 0, minHeight: mobile ? 52 : compact ? 58 : 70, borderRadius: 12, border: selected ? "1px solid rgba(255,212,102,.82)" : item ? "1px solid rgba(126,232,255,.12)" : "1px solid rgba(255,255,255,.06)", background: selected ? "rgba(255,201,76,.09)" : item ? "linear-gradient(145deg,rgba(18,45,61,.86),rgba(8,19,31,.94))" : "rgba(255,255,255,.016)", boxShadow: selected ? "0 0 18px rgba(255,196,64,.15)" : "none", padding: 2, display: "grid", placeItems: "center", cursor: item && running && !paused ? "grab" : running && !paused ? "pointer" : "default", touchAction: mobile ? "none" : undefined }}
                >
                  {item ? <img src={item.image} alt="" draggable={false} style={{ width: "84%", height: "84%", maxWidth: 82, maxHeight: 82, objectFit: "contain", pointerEvents: "none" }} /> : <span style={{ color: "rgba(255,255,255,.11)", fontSize: 10 }}>+</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ minHeight: 0, display: "grid", gridTemplateRows: "minmax(0,1.35fr) minmax(0,.9fr) minmax(0,.55fr)", gap: 7 }}>
          <div style={{ ...panel, minHeight: 0, borderRadius: 16, padding: 10, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, color: "#ffb86b", fontSize: 9, fontWeight: 950, letterSpacing: ".12em" }}>COOKING LINE · 3 PANS</p>
                <span style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.35)", fontSize: 8 }}>Raw beef patties only · cook for 5 seconds</span>
              </div>
              <span style={{ color: "rgba(255,255,255,.28)", fontSize: 8 }}>Auto-returns when ready</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, minHeight: 0 }}>
              {panJobs.map((job, panIndex) => {
                const progress = workstationProgress(job);
                return (
                  <div
                    key={panIndex}
                    data-pan-index={panIndex}
                    onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
                    onDrop={(event) => { event.preventDefault(); const from = readDragIndex(event); if (from !== null) sendToPan(from, panIndex); }}
                    style={{ minHeight: 0, borderRadius: 13, border: `1px dashed ${job?.status === "burnt" ? "rgba(255,97,110,.42)" : "rgba(255,184,107,.28)"}`, background: "rgba(255,255,255,.018)", padding: 8, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 6, placeItems: "center" }}
                  >
                    <strong style={{ fontSize: 9, color: job?.status === "burnt" ? "#ff818d" : "#ffc17e" }}>PAN {panIndex + 1}</strong>
                    {renderEquipmentItem(job, "pan")}
                    {job ? (
                      <div style={{ width: "100%" }}>
                        <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                          <div style={{ width: `${progress}%`, height: "100%", background: job.status === "burnt" ? "#ff6976" : job.status === "warning" ? "#ffbf45" : job.status === "ready" ? "#70e9a4" : "#ffb86b" }} />
                        </div>
                        <span style={{ display: "block", marginTop: 4, textAlign: "center", color: "rgba(255,255,255,.42)", fontSize: 7.5 }}>
                          {job.status === "processing" ? `${Math.max(0, 5 - job.elapsedTicks * PROCESS_TICK_MS / 1000).toFixed(1)}s` : job.status === "ready" ? "DONE" : job.status === "warning" ? "REMOVE!" : "BURNT"}
                        </span>
                        {job.status === "burnt" && <button type="button" onClick={() => clearBurntPan(panIndex)} style={{ width: "100%", marginTop: 4, minHeight: 24, borderRadius: 8, border: "1px solid rgba(255,106,118,.25)", background: "rgba(255,106,118,.08)", color: "#ff9ca5", fontSize: 7.5, fontWeight: 900, cursor: "pointer" }}>Clear Pan</button>}
                      </div>
                    ) : <span style={{ color: "rgba(255,255,255,.26)", fontSize: 7.5 }}>Drop raw patty</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            data-prep-zone="chopping"
            onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); const from = readDragIndex(event); if (from !== null) sendToChoppingBoard(from); }}
            style={{ ...panel, minHeight: 0, borderRadius: 16, padding: 11, border: "1px dashed rgba(126,232,255,.3)", display: "grid", gridTemplateColumns: "78px minmax(0,1fr)", alignItems: "center", gap: 12 }}
          >
            {renderEquipmentItem(choppingJob, "chopping")}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <div>
                  <strong style={{ display: "block", color: "#8ee8ff", fontSize: 13 }}>Chopping Board</strong>
                  <span style={{ display: "block", marginTop: 3, color: "rgba(255,255,255,.42)", fontSize: 8.5 }}>Whole tomatoes only · 5 seconds</span>
                </div>
                {choppingJob?.status === "ready" && <span style={{ color: "#70e9a4", fontSize: 10, fontWeight: 950 }}>✓ DONE</span>}
              </div>
              <div style={{ marginTop: 9, height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}>
                <div style={{ width: `${workstationProgress(choppingJob)}%`, height: "100%", background: choppingJob?.status === "ready" ? "#70e9a4" : "#8ee8ff" }} />
              </div>
              <span style={{ display: "block", marginTop: 5, color: "rgba(255,255,255,.3)", fontSize: 7.5 }}>{choppingJob ? choppingJob.status === "ready" ? "Returning chopped tomato…" : `${Math.max(0, 5 - choppingJob.elapsedTicks * PROCESS_TICK_MS / 1000).toFixed(1)}s remaining` : "Drop a whole tomato here."}</span>
            </div>
          </div>

          <div
            data-prep-zone="discard"
            onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); const from = readDragIndex(event); if (from !== null) discardItem(from); }}
            style={{ ...panel, minHeight: 0, borderRadius: 16, padding: 10, border: "1px dashed rgba(255,129,143,.3)", display: "grid", gridTemplateColumns: "48px minmax(0,1fr)", alignItems: "center", gap: 10 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,100,120,.08)", color: "#ff9da8", fontSize: 22, fontWeight: 950 }}>↺</div>
            <div><strong style={{ display: "block", color: "#ff9da8", fontSize: 12 }}>Discard Tray</strong><span style={{ display: "block", marginTop: 3, color: "rgba(255,255,255,.38)", fontSize: 8 }}>Clear unwanted ingredients or failed prep from the counter.</span></div>
          </div>
        </div>
      </div>

      {dragState && mobile && board[dragState.fromIndex] && (
        <div style={{ position: "fixed", left: dragState.x, top: dragState.y, transform: "translate(-50%,-50%)", zIndex: 1000, width: 58, height: 58, borderRadius: 14, border: "1px solid rgba(255,213,104,.72)", background: "rgba(11,17,27,.96)", display: "grid", placeItems: "center", pointerEvents: "none", boxShadow: "0 12px 30px rgba(0,0,0,.42)" }}>
          <img src={board[dragState.fromIndex]?.image} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} />
        </div>
      )}

      {showGuide && (
        <div style={{ position: "absolute", inset: 0, zIndex: 70, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.9)", backdropFilter: "blur(9px)" }}>
          <div style={{ ...panel, width: "min(820px,100%)", maxHeight: "92%", overflow: "auto", borderRadius: 24, padding: mobile ? 16 : 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "94px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
              <div style={{ width: 82, height: 82, borderRadius: 24, display: "grid", placeItems: "center", margin: mobile ? "0 auto" : 0, border: "1px solid rgba(255,200,105,.32)", background: "radial-gradient(circle at 50% 35%, rgba(255,211,112,.18), rgba(83,215,255,.08))", color: "#ffd16a", animation: "miloGuidePulse 2.1s ease-in-out infinite" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 30, lineHeight: 1 }}>✦</div><strong style={{ display: "block", marginTop: 3, fontSize: 10, letterSpacing: ".12em" }}>MILO</strong></div>
              </div>
              <div>
                <p style={{ margin: 0, color: "#ffd08a", fontSize: 10, fontWeight: 950, letterSpacing: ".14em" }}>MILO GUIDE · STEP {guideStep + 1} OF 5</p>
                <h3 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 25 : 31, fontWeight: 400 }}>
                  {["Welcome to Burger Basics", "Cook every patty", "Chop every tomato", "Build in the exact order", "Serve 10 customers"][guideStep]}
                </h3>
                <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.68)", fontSize: 11, lineHeight: 1.55 }}>
                  {[
                    "Stage 1 is burger-only. Supply gives you Bun, raw Beef Patty, Lettuce, whole Tomato, Cheese and Bacon. Complete 10 orders to clear the stage.",
                    "A raw patty cannot go into a burger. Drag it into any of the three pans. It cooks for 5 seconds, shows a green tick when ready, then returns to the prep counter as a cooked patty. If the counter is full, rescue it before it burns.",
                    "Whole tomatoes cannot go into a burger either. Drag a tomato to the Chopping Board. After 5 seconds the chopped tomato automatically returns to the prep counter. Bun, Lettuce, Cheese and Bacon need no prep.",
                    "Burgers MUST be built in order: Bun + Cooked Patty → Lettuce → Chopped Tomato → Cheese → Bacon. If you combine the wrong next item, nothing is lost — the two items simply swap positions.",
                    "The three customer timers wait at 60 seconds until you serve your FIRST order. Then all customer clocks begin. At 15 seconds an order shakes as a warning. Three missed orders fail the stage. Stage 2 is coming soon, so replay Stage 1 for a higher score.",
                  ][guideStep]}
                </p>
              </div>
            </div>

            {guideStep === 0 && (
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 7 }}>
                {SUPPLY_KEYS.map((key) => (
                  <div key={key} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 8, textAlign: "center" }}>
                    <img src={ingredientDef(key).image} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
                    <strong style={{ display: "block", marginTop: 4, fontSize: 8 }}>{ingredientDef(key).label}</strong>
                  </div>
                ))}
              </div>
            )}
            {guideStep === 3 && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                {["bun", "cooked-beef-patty", "lettuce", "chopped-tomato", "cheese-slice", "bacon"].map((raw, index) => {
                  const key = raw as IngredientKey;
                  return <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 50, height: 50, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", display: "grid", placeItems: "center" }}><img src={ingredientDef(key).image} alt="" style={{ width: 42, height: 42, objectFit: "contain" }} /></div>{index < 5 && <span style={{ color: "#ffd16a", fontWeight: 950 }}>→</span>}</div>;
                })}
              </div>
            )}

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>
              {[0, 1, 2, 3, 4].map((step) => <button key={step} type="button" onClick={() => setGuideStep(step)} style={{ height: 7, border: 0, borderRadius: 999, background: step <= guideStep ? "#ffd16a" : "rgba(255,255,255,.08)", cursor: "pointer" }} />)}
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button type="button" onClick={() => setGuideStep((value) => Math.max(0, value - 1))} disabled={guideStep === 0} style={{ minHeight: 42, padding: "0 18px", borderRadius: 12, border: "1px solid rgba(126,232,255,.18)", background: "rgba(83,215,255,.05)", color: guideStep === 0 ? "rgba(255,255,255,.25)" : "white", fontWeight: 900 }}>Back</button>
              {guideStep < 4 ? (
                <button type="button" onClick={() => setGuideStep((value) => Math.min(4, value + 1))} style={{ minHeight: 42, padding: "0 22px", borderRadius: 12, border: "1px solid rgba(255,211,104,.34)", background: "rgba(255,190,65,.08)", color: "#ffd16a", fontWeight: 950, cursor: "pointer" }}>Next</button>
              ) : !running && !stageResult ? (
                <button type="button" onClick={startStage} style={{ minHeight: 44, padding: "0 24px", borderRadius: 13, border: "1px solid rgba(255,211,104,.4)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>Start Stage 1</button>
              ) : (
                <button type="button" onClick={() => setShowGuide(false)} style={{ minHeight: 42, padding: "0 22px", borderRadius: 12, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontWeight: 900, cursor: "pointer" }}>Back to Kitchen</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: "absolute", inset: 0, zIndex: 75, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.86)", backdropFilter: "blur(8px)" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ ...panel, width: "min(620px,100%)", borderRadius: 23, padding: mobile ? 17 : 22 }}>
            <p style={{ margin: 0, color: "#9feeff", fontSize: 10, fontWeight: 950, letterSpacing: ".13em" }}>HOW TO PLAY</p>
            <h3 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 29, fontWeight: 400 }}>Burger Basics</h3>
            <div style={{ marginTop: 12, display: "grid", gap: 8, color: "rgba(255,255,255,.62)", fontSize: 11, lineHeight: 1.45 }}>
              <div><strong style={{ color: "white" }}>Cook:</strong> Raw patties need 5 seconds in one of three pans.</div>
              <div><strong style={{ color: "white" }}>Chop:</strong> Whole tomatoes need 5 seconds on the chopping board.</div>
              <div><strong style={{ color: "white" }}>Build:</strong> Bun + cooked patty → lettuce → chopped tomato → cheese → bacon.</div>
              <div><strong style={{ color: "white" }}>Wrong order:</strong> Invalid ingredient combinations swap positions instead of disappearing.</div>
              <div><strong style={{ color: "white" }}>Timers:</strong> Customer clocks begin only after your first successful order, then each new order has 60 seconds.</div>
              <div><strong style={{ color: "white" }}>Goal:</strong> Serve 10 orders. Three misses fail the stage. Stage 2 is coming soon.</div>
            </div>
            <button type="button" onClick={() => setShowHelp(false)} style={{ width: "100%", minHeight: 43, marginTop: 14, borderRadius: 13, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>Back</button>
          </div>
        </div>
      )}

      {stageResult && (
        <div style={{ position: "absolute", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.9)", backdropFilter: "blur(9px)" }}>
          <div style={{ ...panel, width: "min(650px,100%)", borderRadius: 25, padding: mobile ? 18 : 25, textAlign: "center" }}>
            <p style={{ margin: 0, color: stageResult.success ? "#84efb2" : "#ff9ca7", fontSize: 10, fontWeight: 950, letterSpacing: ".14em" }}>STAGE 1 {stageResult.success ? "COMPLETE" : "FAILED"}</p>
            <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 31 : 40, fontWeight: 400 }}>Burger Basics</h3>
            <div style={{ marginTop: 10, fontSize: mobile ? 33 : 42, letterSpacing: ".08em", color: "#ffd66f" }}>{[1,2,3].map((star) => <span key={star} style={{ opacity: star <= stageResult.stars ? 1 : .18 }}>★</span>)}</div>
            <div style={{ marginTop: 15, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
              {[["Score", score.toLocaleString()], ["Orders", `${ordersServed}/${STAGE_ORDER_GOAL}`], ["Missed", `${failedOrders}/${MAX_FAILED_ORDERS}`], ["Time", formatTime(runSeconds)]].map(([label, value]) => <div key={label} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 9 }}><span style={{ display: "block", color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900 }}>{label}</span><strong style={{ display: "block", marginTop: 4, fontSize: 15 }}>{value}</strong></div>)}
            </div>
            <div style={{ marginTop: 14, borderRadius: 15, border: "1px solid rgba(255,214,111,.17)", background: "rgba(255,196,64,.04)", padding: 11 }}>
              <span style={{ color: "rgba(255,255,255,.44)", fontSize: 9, fontWeight: 900 }}>STAGE DREAM TOKENS</span>
              <strong style={{ display: "block", marginTop: 5, color: stageResult.success ? "#ffd66f" : "rgba(255,255,255,.3)", fontSize: 28 }}>+{stageResult.success ? (rewardState === "awarded" ? awardedDt : resultDt) : 0} DT</strong>
              <span style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,.38)", fontSize: 9 }}>{!stageResult.success ? "Complete Stage 1 to collect DT." : rewardState === "awarding" ? "Adding DT to your balance…" : rewardState === "guest" ? "Log in to collect stage DT." : rewardState === "failed" ? "DT payout failed." : `${stageResult.stars}★ Stage 1 reward`}</span>
            </div>
            <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => { resetStageState(); setGuideStep(0); setShowGuide(true); }} style={{ minHeight: 44, padding: "0 22px", borderRadius: 13, border: "1px solid rgba(255,211,104,.38)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>{stageResult.success ? "Replay Stage 1 for Higher Score" : "Retry Stage 1"}</button>
              {stageResult.success && <span style={{ alignSelf: "center", color: "rgba(255,255,255,.38)", fontSize: 10, fontWeight: 850 }}>Stage 2 · Coming Soon</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
