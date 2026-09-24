"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, PointerEvent as ReactPointerEvent } from "react";

type StageId = "stage1" | "stage2";
type Family = "burger" | "salad";
type ItemType = "ingredient" | "dish";
type IngredientKey =
  | "bun"
  | "beef-patty"
  | "lettuce"
  | "tomato"
  | "cheese-slice"
  | "bacon"
  | "ham";

type IngredientDef = {
  key: IngredientKey;
  label: string;
  image: string;
};

type RecipeDef = {
  key: string;
  family: Family;
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
  family?: Family;
  tier?: number;
};

type BoardCell = PrepItem | null;
type OrderSlot = {
  id: number;
  recipeKey: string;
  secondsLeft: number;
};
type DragState = { fromIndex: number; x: number; y: number } | null;

type StageResult = {
  success: boolean;
  stageId: StageId;
  runId: number;
  stars: number;
};

type Props = {
  userId: string;
  mobile: boolean;
  dense: boolean;
  width: number;
  height: number;
  onTokenTransaction: (amount: number, description: string) => Promise<boolean>;
};

const BOARD_SIZE = 20;
const STAGE_ORDER_GOAL = 10;
const MAX_FAILED_ORDERS = 3;
const ORDER_DURATION_SECONDS = 45;
const ASSET_BASE = "/milo/activity-lab/mix-serve";

const INGREDIENTS: IngredientDef[] = [
  { key: "bun", label: "Bun", image: `${ASSET_BASE}/ingredients/ingredient-bun.png` },
  { key: "beef-patty", label: "Beef Patty", image: `${ASSET_BASE}/ingredients/ingredient-beef-patty.png` },
  { key: "lettuce", label: "Lettuce", image: `${ASSET_BASE}/ingredients/ingredient-lettuce.png` },
  { key: "tomato", label: "Tomato", image: `${ASSET_BASE}/ingredients/ingredient-tomato.png` },
  { key: "cheese-slice", label: "Cheese", image: `${ASSET_BASE}/ingredients/ingredient-cheese-slice.png` },
  { key: "bacon", label: "Bacon", image: `${ASSET_BASE}/ingredients/ingredient-bacon.png` },
  { key: "ham", label: "Ham", image: `${ASSET_BASE}/ingredients/ingredient-ham.png` },
];

const BURGER_RECIPES: RecipeDef[] = [
  {
    key: "dish-burger-tier-1-basic-burger",
    family: "burger",
    label: "Basic Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-1-basic-burger.png`,
    tier: 1,
    ingredients: ["bun", "beef-patty"],
  },
  {
    key: "dish-burger-tier-2-lettuce-burger",
    family: "burger",
    label: "Lettuce Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-2-lettuce-burger.png`,
    tier: 2,
    ingredients: ["bun", "beef-patty", "lettuce"],
  },
  {
    key: "dish-burger-tier-3-classic-burger",
    family: "burger",
    label: "Classic Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-3-classic-burger.png`,
    tier: 3,
    ingredients: ["bun", "beef-patty", "lettuce", "tomato"],
  },
  {
    key: "dish-burger-tier-4-cheeseburger",
    family: "burger",
    label: "Cheeseburger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-4-cheeseburger.png`,
    tier: 4,
    ingredients: ["bun", "beef-patty", "lettuce", "tomato", "cheese-slice"],
  },
  {
    key: "dish-burger-tier-5-deluxe-burger",
    family: "burger",
    label: "Deluxe Burger",
    image: `${ASSET_BASE}/dishes/dish-burger-tier-5-deluxe-burger.png`,
    tier: 5,
    ingredients: ["bun", "beef-patty", "lettuce", "tomato", "cheese-slice", "bacon"],
  },
];

const SALAD_RECIPES: RecipeDef[] = [
  {
    key: "dish-salad-tier-1-side-salad",
    family: "salad",
    label: "Side Salad",
    image: `${ASSET_BASE}/dishes/dish-salad-tier-1-side-salad.png`,
    tier: 1,
    ingredients: ["lettuce"],
  },
  {
    key: "dish-salad-tier-2-garden-salad",
    family: "salad",
    label: "Garden Salad",
    image: `${ASSET_BASE}/dishes/dish-salad-tier-2-garden-salad.png`,
    tier: 2,
    ingredients: ["lettuce", "tomato"],
  },
  {
    key: "dish-salad-tier-3-ham-salad",
    family: "salad",
    label: "Ham Salad",
    image: `${ASSET_BASE}/dishes/dish-salad-tier-4-chef-salad.png`,
    tier: 3,
    ingredients: ["lettuce", "tomato", "ham"],
  },
];

const STAGES = {
  stage1: {
    id: "stage1" as const,
    number: 1,
    title: "Burger Basics",
    eyebrow: "Milo’s Burger Lesson",
    description: "Learn Milo’s burger recipes, then complete 10 customer orders.",
    ingredients: ["bun", "beef-patty", "lettuce", "tomato", "cheese-slice", "bacon"] as IngredientKey[],
    recipes: BURGER_RECIPES,
    dtByStars: { 1: 6, 2: 9, 3: 12 } as Record<number, number>,
  },
  stage2: {
    id: "stage2" as const,
    number: 2,
    title: "Salad Shift",
    eyebrow: "Salads Join the Menu",
    description: "Burger orders continue and Milo introduces three simple salad recipes.",
    ingredients: ["bun", "beef-patty", "lettuce", "tomato", "cheese-slice", "bacon", "ham"] as IngredientKey[],
    recipes: [...BURGER_RECIPES, ...SALAD_RECIPES],
    dtByStars: { 1: 9, 2: 13, 3: 18 } as Record<number, number>,
  },
};

function ingredientDef(key: IngredientKey) {
  return INGREDIENTS.find((item) => item.key === key)!;
}

function sortKey(keys: IngredientKey[]) {
  return [...keys].sort().join("|");
}

function createIngredient(id: number, key: IngredientKey): PrepItem {
  const item = ingredientDef(key);
  return {
    id,
    type: "ingredient",
    key: item.key,
    label: item.label,
    image: item.image,
    ingredients: [item.key],
  };
}

function createDish(id: number, recipe: RecipeDef): PrepItem {
  return {
    id,
    type: "dish",
    key: recipe.key,
    label: recipe.label,
    image: recipe.image,
    ingredients: [...recipe.ingredients],
    family: recipe.family,
    tier: recipe.tier,
  };
}

function stageRecipeMap(stageId: StageId) {
  return new Map(STAGES[stageId].recipes.map((recipe) => [sortKey(recipe.ingredients), recipe]));
}

function matchRecipe(stageId: StageId, ingredients: IngredientKey[]) {
  return stageRecipeMap(stageId).get(sortKey(ingredients)) ?? null;
}

function canCombine(stageId: StageId, a: PrepItem, b: PrepItem) {
  const recipes = STAGES[stageId].recipes;

  // A finished dish can only advance one tier at a time by adding the exact
  // next ingredient in that recipe family. This enforces Milo's build order.
  const dish = a.type === "dish" ? a : b.type === "dish" ? b : null;
  const ingredient = a.type === "ingredient" ? a : b.type === "ingredient" ? b : null;

  if (dish && ingredient) {
    const current = recipes.find((recipe) => recipe.key === dish.key);
    if (!current) return null;
    const next = recipes.find(
      (recipe) => recipe.family === current.family && recipe.tier === current.tier + 1,
    );
    if (!next) return null;

    const addedIngredients = next.ingredients.filter((key) => !current.ingredients.includes(key));
    return addedIngredients.length === 1 && ingredient.ingredients[0] === addedIngredients[0]
      ? next
      : null;
  }

  // Raw ingredients may only create the first multi-ingredient dish in a chain.
  if (a.type === "ingredient" && b.type === "ingredient") {
    const combined = Array.from(new Set([...a.ingredients, ...b.ingredients])) as IngredientKey[];
    if (combined.length !== 2) return null;
    return recipes.find(
      (recipe) => recipe.tier === 1 && recipe.ingredients.length === 2 && sortKey(recipe.ingredients) === sortKey(combined),
    ) ?? null;
  }

  return null;
}

function findSinglePrep(stageId: StageId, item: PrepItem) {
  if (item.type !== "ingredient") return null;
  return STAGES[stageId].recipes.find(
    (recipe) => recipe.ingredients.length === 1 && recipe.ingredients[0] === item.ingredients[0],
  ) ?? null;
}

function initialBoard(stageId: StageId): BoardCell[] {
  const board = Array<BoardCell>(BOARD_SIZE).fill(null);
  const starters = stageId === "stage1"
    ? (["bun", "beef-patty", "lettuce", "tomato", "cheese-slice"] as IngredientKey[])
    : (["bun", "beef-patty", "lettuce", "tomato", "ham"] as IngredientKey[]);
  starters.forEach((key, index) => {
    board[index * 2] = createIngredient(index + 1, key);
  });
  return board;
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

function familyTint(family?: Family) {
  return family === "salad" ? "#84efb2" : "#ffb86b";
}

export default function MilosMixAndServe({
  userId,
  mobile,
  dense,
  width,
  height,
  onTokenTransaction,
}: Props) {
  const compact = height < 760 || width < 1100;
  const [stage, setStage] = useState<StageId>("stage1");
  const [stage2Unlocked, setStage2Unlocked] = useState(false);
  const stageConfig = STAGES[stage];

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRecipeBook, setShowRecipeBook] = useState(true);
  const [guideStep, setGuideStep] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [board, setBoard] = useState<BoardCell[]>(() => initialBoard("stage1"));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [orders, setOrders] = useState<OrderSlot[]>([]);
  const [ordersServed, setOrdersServed] = useState(0);
  const [failedOrders, setFailedOrders] = useState(0);
  const [score, setScore] = useState(0);
  const [runSeconds, setRunSeconds] = useState(0);
  const [recipesMade, setRecipesMade] = useState(0);
  const [ingredientsSpawned, setIngredientsSpawned] = useState(0);
  const [status, setStatus] = useState("Milo will show you the Stage 1 burger recipes before the game begins.");
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const [rewardState, setRewardState] = useState<"idle" | "awarding" | "awarded" | "guest" | "failed">("idle");
  const [awardedDt, setAwardedDt] = useState(0);

  const nextItemId = useRef(1000);
  const nextOrderId = useRef(1);
  const currentStageRunId = useRef(0);
  const ordersRef = useRef<OrderSlot[]>([]);
  const ordersServedRef = useRef(0);
  const failedOrdersRef = useRef(0);
  const awardedStageRuns = useRef<Set<string>>(new Set());
  const supplyMissesRef = useRef<Partial<Record<IngredientKey, number>>>({});

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    ordersServedRef.current = ordersServed;
  }, [ordersServed]);

  useEffect(() => {
    failedOrdersRef.current = failedOrders;
  }, [failedOrders]);

  useEffect(() => {
    if (expandedOrderId !== null && !orders.some((order) => order.id === expandedOrderId)) {
      setExpandedOrderId(null);
    }
  }, [orders, expandedOrderId]);

  const occupied = useMemo(() => board.filter(Boolean).length, [board]);
  const currentStarsPreview = starsForStage(true, failedOrders);
  const stageDtPreview = stageConfig.dtByStars[currentStarsPreview] ?? 0;
  const resultDt = stageResult?.success ? STAGES[stageResult.stageId].dtByStars[stageResult.stars] ?? 0 : 0;
  const selectedItem = selectedIndex === null ? null : board[selectedIndex];

  function resetStageState(stageId: StageId) {
    setRunning(false);
    setPaused(false);
    setBoard(initialBoard(stageId));
    setSelectedIndex(null);
    setDragState(null);
    setOrders([]);
    ordersRef.current = [];
    setOrdersServed(0);
    ordersServedRef.current = 0;
    setFailedOrders(0);
    failedOrdersRef.current = 0;
    setScore(0);
    setRunSeconds(0);
    setRecipesMade(0);
    setIngredientsSpawned(0);
    setExpandedOrderId(null);
    setStageResult(null);
    setRewardState("idle");
    setAwardedDt(0);
    nextItemId.current = 1000;
    nextOrderId.current = 1;
    supplyMissesRef.current = {};
  }

  function selectStage(nextStage: StageId) {
    if (running) return;
    if (nextStage === "stage2" && !stage2Unlocked && stage !== "stage2") return;
    setStage(nextStage);
    resetStageState(nextStage);
    setGuideStep(0);
    setShowRecipeBook(true);
    setStatus(
      nextStage === "stage1"
        ? "Milo will show you the burger recipes before the game begins."
        : "Stage 2 adds three salad recipes. Review the menu before starting.",
    );
  }

  function eligibleRecipes(servedCount: number) {
    const cap = tierCapForProgress(servedCount);
    return stageConfig.recipes.filter((recipe) => recipe.tier <= cap);
  }

  function createOrder(servedCount: number, avoidKeys: string[] = [], preferredFamily?: Family): OrderSlot {
    const eligible = eligibleRecipes(servedCount);
    const fresh = eligible.filter((recipe) => !avoidKeys.includes(recipe.key));
    let pool = fresh.length ? fresh : eligible;

    if (preferredFamily) {
      const preferred = pool.filter((recipe) => recipe.family === preferredFamily);
      if (preferred.length) pool = preferred;
    } else if (stage === "stage2" && Math.random() < 0.45) {
      const salads = pool.filter((recipe) => recipe.family === "salad");
      if (salads.length) pool = salads;
    }

    const recipe = pool[Math.floor(Math.random() * pool.length)] ?? stageConfig.recipes[0];
    return {
      id: nextOrderId.current++,
      recipeKey: recipe.key,
      secondsLeft: ORDER_DURATION_SECONDS,
    };
  }

  function fillInitialOrders() {
    const initial: OrderSlot[] = [];
    for (let index = 0; index < 3; index += 1) {
      const preferredFamily = stage === "stage2" && index === 0 ? "salad" : undefined;
      initial.push(createOrder(0, initial.map((order) => order.recipeKey), preferredFamily));
    }
    ordersRef.current = initial;
    setOrders(initial);
  }

  function startStage() {
    resetStageState(stage);
    currentStageRunId.current += 1;
    setShowRecipeBook(false);
    setRunning(true);
    setPaused(false);
    setStatus(`${stageConfig.title} started. Complete ${STAGE_ORDER_GOAL} orders before missing three.`);
    window.setTimeout(fillInitialOrders, 0);
  }

  function completeStage(success: boolean, failuresOverride?: number) {
    const finalFailures = failuresOverride ?? failedOrdersRef.current;
    const stars = starsForStage(success, finalFailures);
    setRunning(false);
    setPaused(false);
    setOrders([]);
    ordersRef.current = [];
    setSelectedIndex(null);
    setDragState(null);
    setStageResult({
      success,
      stageId: stage,
      runId: currentStageRunId.current,
      stars,
    });
    if (success && stage === "stage1") setStage2Unlocked(true);
    setStatus(success ? `${stageConfig.title} complete!` : `${stageConfig.title} failed after three missed orders.`);
  }

  useEffect(() => {
    if (!running || paused || stageResult || ordersRef.current.length === 0) return;

    const timer = window.setInterval(() => {
      setRunSeconds((value) => value + 1);
      const decremented = ordersRef.current.map((order) => ({
        ...order,
        secondsLeft: order.secondsLeft - 1,
      }));
      const expired = decremented.filter((order) => order.secondsLeft <= 0);

      if (expired.length === 0) {
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
      setStatus(`${expired.length === 1 ? "One customer left" : `${expired.length} customers left`}. ${nextFailures} / ${MAX_FAILED_ORDERS} missed.`);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, paused, stageResult, stage]);

  useEffect(() => {
    if (!stageResult?.success) return;
    const key = `${stageResult.stageId}-${stageResult.runId}`;
    if (awardedStageRuns.current.has(key)) return;
    const reward = STAGES[stageResult.stageId].dtByStars[stageResult.stars] ?? 0;

    if (!userId) {
      awardedStageRuns.current.add(key);
      setRewardState("guest");
      return;
    }

    if (reward <= 0) {
      awardedStageRuns.current.add(key);
      setRewardState("awarded");
      setAwardedDt(0);
      return;
    }

    let cancelled = false;
    awardedStageRuns.current.add(key);
    setRewardState("awarding");

    void onTokenTransaction(
      reward,
      `Milo's Mix & Serve · Stage ${STAGES[stageResult.stageId].number} reward · Run ${stageResult.runId}`,
    ).then((success) => {
      if (cancelled) return;
      if (success) {
        setAwardedDt(reward);
        setRewardState("awarded");
      } else {
        awardedStageRuns.current.delete(key);
        setAwardedDt(0);
        setRewardState("failed");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [stageResult, userId, onTokenTransaction]);

  function emptyCellIndex(cells: BoardCell[]) {
    return cells.findIndex((item) => item === null);
  }

  function spawnIngredient() {
    if (!running || paused) return;
    setBoard((current) => {
      const empty = emptyCellIndex(current);
      if (empty === -1) {
        setStatus("The prep counter is full. Combine or discard an item first.");
        return current;
      }

      // Supply drought protection: once an ingredient has missed four supply
      // draws, it is forced into the next available draw. If several are due,
      // the most overdue one is served first.
      const pool = stageConfig.ingredients;
      const misses = supplyMissesRef.current;
      const overdue = pool
        .map((key) => ({ key, misses: misses[key] ?? 0 }))
        .filter((entry) => entry.misses >= 4)
        .sort((a, b) => b.misses - a.misses);

      const key = overdue.length
        ? overdue[0].key
        : pool[Math.floor(Math.random() * pool.length)];

      pool.forEach((ingredientKey) => {
        misses[ingredientKey] = ingredientKey === key ? 0 : (misses[ingredientKey] ?? 0) + 1;
      });

      const next = [...current];
      const item = createIngredient(++nextItemId.current, key);
      next[empty] = item;
      setIngredientsSpawned((value) => value + 1);
      setStatus(`${item.label} added to the prep counter.`);
      return next;
    });
  }

  function discardItem(index: number) {
    if (!running || paused) return;
    setBoard((current) => {
      const item = current[index];
      if (!item) return current;
      const next = [...current];
      next[index] = null;
      setStatus(`${item.label} discarded.`);
      return next;
    });
    setSelectedIndex(null);
  }

  function prepareItemAt(index: number) {
    if (!running || paused) return;
    setBoard((current) => {
      const item = current[index];
      if (!item) return current;
      const recipe = findSinglePrep(stage, item);
      if (!recipe) {
        setStatus(`${item.label} needs another ingredient before it becomes a dish.`);
        return current;
      }
      const next = [...current];
      next[index] = createDish(++nextItemId.current, recipe);
      setRecipesMade((value) => value + 1);
      setStatus(`${recipe.label} prepared.`);
      return next;
    });
    setSelectedIndex(null);
  }

  function moveOrCombine(fromIndex: number, toIndex: number) {
    if (!running || paused || fromIndex === toIndex) return;
    setBoard((current) => {
      const source = current[fromIndex];
      if (!source) return current;
      const destination = current[toIndex];
      const next = [...current];

      if (!destination) {
        next[toIndex] = source;
        next[fromIndex] = null;
        return next;
      }

      const recipe = canCombine(stage, source, destination);
      if (!recipe) {
        setStatus("Those items do not make a recipe in this stage.");
        return current;
      }

      next[toIndex] = createDish(++nextItemId.current, recipe);
      next[fromIndex] = null;
      setRecipesMade((value) => value + 1);
      setStatus(`${recipe.label} created.`);
      return next;
    });
    setSelectedIndex(null);
  }

  function handleCellClick(index: number) {
    if (!running || paused) return;
    if (selectedIndex === null) {
      if (board[index]) setSelectedIndex(index);
      return;
    }
    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }
    moveOrCombine(selectedIndex, index);
  }

  function replaceOrder(orderId: number, servedCount: number) {
    const current = ordersRef.current;
    const otherKeys = current.filter((order) => order.id !== orderId).map((order) => order.recipeKey);
    const next = current.map((order) =>
      order.id === orderId ? createOrder(servedCount, otherKeys) : order,
    );
    ordersRef.current = next;
    setOrders(next);
  }

  function serveDishToOrder(fromIndex: number, orderId: number) {
    if (!running || paused) return;
    const dish = board[fromIndex];
    const order = ordersRef.current.find((item) => item.id === orderId);
    if (!dish || !order) return;
    if (dish.type !== "dish") {
      setStatus("Only a finished dish can be served.");
      return;
    }
    if (dish.key !== order.recipeKey) {
      const requested = stageConfig.recipes.find((recipe) => recipe.key === order.recipeKey);
      setStatus(`${dish.label} does not match ${requested?.label ?? "this order"}.`);
      return;
    }

    const recipe = stageConfig.recipes.find((item) => item.key === order.recipeKey);
    if (!recipe) return;

    setBoard((current) => {
      const next = [...current];
      next[fromIndex] = null;
      return next;
    });

    const earned = scoreForOrder(recipe, order.secondsLeft);
    const nextServed = ordersServedRef.current + 1;
    ordersServedRef.current = nextServed;
    setOrdersServed(nextServed);
    setScore((value) => value + earned);
    setSelectedIndex(null);
    setStatus(`${recipe.label} served with ${order.secondsLeft}s left · +${earned} points.`);

    if (nextServed >= STAGE_ORDER_GOAL) {
      completeStage(true);
      return;
    }

    replaceOrder(orderId, nextServed);
  }

  function serveSelectedToOrder(orderId: number) {
    if (selectedIndex === null) {
      setStatus("Select a finished dish first, then tap the matching order.");
      return;
    }
    serveDishToOrder(selectedIndex, orderId);
  }

  function beginPointerDrag(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (!mobile || !running || paused || !board[index]) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedIndex(index);
    setDragState({ fromIndex: index, x: event.clientX, y: event.clientY });
  }

  function movePointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    setDragState((current) => current ? { ...current, x: event.clientX, y: event.clientY } : null);
  }

  function resolveDropTarget(target: Element | null) {
    const orderElement = target?.closest("[data-order-id]") as HTMLElement | null;
    if (orderElement?.dataset.orderId) {
      return { type: "order" as const, orderId: Number(orderElement.dataset.orderId) };
    }
    const cell = target?.closest("[data-prep-cell]") as HTMLElement | null;
    if (cell?.dataset.prepCell !== undefined) {
      return { type: "cell" as const, index: Number(cell.dataset.prepCell) };
    }
    if (target?.closest('[data-prep-zone="discard"]')) return { type: "discard" as const };
    if (target?.closest('[data-prep-zone="prep"]')) return { type: "prep" as const };
    return null;
  }

  function endPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    const target = resolveDropTarget(document.elementFromPoint(event.clientX, event.clientY));
    if (target?.type === "order") serveDishToOrder(dragState.fromIndex, target.orderId);
    else if (target?.type === "cell") moveOrCombine(dragState.fromIndex, target.index);
    else if (target?.type === "discard") discardItem(dragState.fromIndex);
    else if (target?.type === "prep") prepareItemAt(dragState.fromIndex);
    setDragState(null);
  }

  function onDragStart(event: DragEvent<HTMLButtonElement>, index: number) {
    if (!running || paused || !board[index]) {
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

  function workstationCards() {
    const cards = [
      {
        id: "pan",
        title: "Pan",
        icon: "◉",
        detail: stage === "stage1" ? "Beef Patty · Bacon" : "Beef Patty · Bacon · Ham",
        accent: "#ffb86b",
      },
      {
        id: "chopping",
        title: "Chopping Board",
        icon: "▱",
        detail: stage === "stage1" ? "Lettuce · Tomato" : "Lettuce · Tomato · Ham",
        accent: "#8ee8ff",
      },
      ...(stage === "stage2"
        ? [{ id: "salad", title: "Salad Bowl", icon: "◡", detail: "Lettuce → Tomato → Ham", accent: "#84efb2" }]
        : []),
    ];
    return cards;
  }

  const panel: CSSProperties = {
    border: "1px solid rgba(128,226,255,.14)",
    background: "linear-gradient(145deg, rgba(8,27,46,.9), rgba(4,13,27,.96))",
    boxShadow: "inset 0 0 30px rgba(86,214,255,.025), 0 14px 34px rgba(0,0,0,.2)",
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

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
        @keyframes miloGuidePulse {
          0%,100% { box-shadow: 0 0 0 rgba(255,190,92,0); }
          50% { box-shadow: 0 0 24px rgba(255,190,92,.18); }
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: stage === "stage1" ? "#ffbf68" : "#84efb2", fontSize: mobile ? 9 : 11, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase" }}>
            Stage {stageConfig.number} · {stageConfig.eyebrow}
          </p>
          <h2 style={{ margin: "3px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 25 : compact ? 30 : 36, lineHeight: 1, fontWeight: 400 }}>
            Milo’s Mix & Serve
          </h2>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => selectStage("stage1")}
            disabled={running}
            style={{ minHeight: 36, padding: "0 11px", borderRadius: 999, border: stage === "stage1" ? "1px solid rgba(255,191,104,.48)" : "1px solid rgba(255,255,255,.1)", background: stage === "stage1" ? "rgba(255,173,66,.1)" : "rgba(255,255,255,.03)", color: stage === "stage1" ? "#ffd08a" : "rgba(255,255,255,.58)", fontSize: 11, fontWeight: 900, cursor: running ? "not-allowed" : "pointer" }}
          >
            Stage 1
          </button>
          <button
            type="button"
            onClick={() => selectStage("stage2")}
            disabled={running || !stage2Unlocked}
            style={{ minHeight: 36, padding: "0 11px", borderRadius: 999, border: stage === "stage2" ? "1px solid rgba(132,239,178,.44)" : "1px solid rgba(255,255,255,.1)", background: stage === "stage2" ? "rgba(132,239,178,.08)" : "rgba(255,255,255,.03)", color: !stage2Unlocked && stage !== "stage2" ? "rgba(255,255,255,.24)" : stage === "stage2" ? "#84efb2" : "rgba(255,255,255,.58)", fontSize: 11, fontWeight: 900, cursor: running || !stage2Unlocked ? "not-allowed" : "pointer" }}
          >
            {stage2Unlocked || stage === "stage2" ? "Stage 2" : "Stage 2 · Locked"}
          </button>
          <button type="button" onClick={() => setShowRecipeBook(true)} style={{ minHeight: 36, padding: "0 11px", borderRadius: 999, border: "1px solid rgba(255,191,104,.2)", background: "rgba(255,173,66,.06)", color: "#ffd08a", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>
            Menu Book
          </button>
          <button type="button" onClick={() => setShowHelp(true)} style={{ minHeight: 36, padding: "0 11px", borderRadius: 999, border: "1px solid rgba(128,226,255,.2)", background: "rgba(83,215,255,.06)", color: "#dffaff", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>
            ? How to Play
          </button>
          <button type="button" onClick={() => running && setPaused((value) => !value)} disabled={!running} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(128,226,255,.18)", background: "rgba(83,215,255,.06)", color: running ? "white" : "rgba(255,255,255,.28)", cursor: running ? "pointer" : "not-allowed" }}>
            {paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 6 }}>
        {[
          ["SCORE", score.toLocaleString(), "Tier points + speed bonus"],
          ["ORDERS", `${ordersServed} / ${STAGE_ORDER_GOAL}`, "Complete 10 to clear the stage"],
          ["MISSED", `${failedOrders} / ${MAX_FAILED_ORDERS}`, "Third miss fails this stage"],
          ["STAGE DT", `Up to +${stageConfig.dtByStars[3]}`, `Current rating would earn +${stageDtPreview}`],
        ].map(([label, value, sub]) => (
          <div key={label} style={{ ...panel, borderRadius: 13, padding: mobile ? "8px 9px" : "9px 11px", minWidth: 0 }}>
            <p style={{ margin: 0, color: "rgba(166,235,255,.48)", fontSize: 9, fontWeight: 950, letterSpacing: ".1em" }}>{label}</p>
            <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
              <strong style={{ fontSize: mobile ? 18 : 22, lineHeight: 1, color: label === "MISSED" ? "#ff9ca7" : label === "STAGE DT" ? "#ffd66f" : "white" }}>{value}</strong>
              {!mobile && !compact && <span style={{ color: "rgba(255,255,255,.28)", fontSize: 9 }}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
        {orders.map((order) => {
          const recipe = stageConfig.recipes.find((item) => item.key === order.recipeKey)!;
          const warning = order.secondsLeft <= 15;
          const urgent = order.secondsLeft <= 10;
          const shakeNow = order.secondsLeft === 15;
          const ready = selectedItem?.type === "dish" && selectedItem.key === order.recipeKey;
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
              onClick={() => serveSelectedToOrder(order.id)}
              style={{
                ...panel,
                borderRadius: 14,
                padding: mobile ? 7 : 9,
                position: "relative",
                minWidth: 0,
                cursor: running && !paused ? "pointer" : "default",
                border: ready
                  ? "1px solid rgba(132,239,178,.62)"
                  : warning
                    ? "1px solid rgba(255,128,143,.42)"
                    : "1px solid rgba(128,226,255,.14)",
                animation: shakeNow ? "mixServeOrderShake .5s ease-in-out" : undefined,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "42px minmax(0,1fr)" : "50px minmax(0,1fr) auto", alignItems: "center", gap: 8, minWidth: 0 }}>
                <img src={recipe.image} alt="" style={{ width: mobile ? 42 : 50, height: mobile ? 42 : 50, objectFit: "contain" }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: familyTint(recipe.family), fontSize: 8, fontWeight: 950, letterSpacing: ".08em" }}>ORDER · TIER {recipe.tier}</p>
                  <strong style={{ display: "block", marginTop: 2, fontSize: mobile ? 10 : 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipe.label}</strong>
                  <span style={{ color: "rgba(255,255,255,.42)", fontSize: 9 }}>Base {tierBaseScore(recipe.tier)} + speed</span>
                </div>
                {!mobile && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 6 }}>
                    <span style={{ color: "rgba(255,255,255,.36)", fontSize: 7, fontWeight: 950, marginRight: 2 }}>RECIPE</span>
                    {recipe.ingredients.map((key) => (
                      <div key={key} title={ingredientDef(key).label} style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.035)" }}>
                        <img src={ingredientDef(key).image} alt="" style={{ width: 25, height: 25, objectFit: "contain" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {mobile && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ color: "rgba(255,255,255,.36)", fontSize: 7, fontWeight: 950 }}>RECIPE</span>
                  {recipe.ingredients.map((key) => (
                    <div key={key} style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(255,255,255,.035)" }}>
                      <img src={ingredientDef(key).image} alt="" style={{ width: 23, height: 23, objectFit: "contain" }} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, alignItems: "center" }}>
                <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,.055)", overflow: "hidden", boxShadow: warning ? "0 0 12px rgba(255,108,128,.18)" : "none" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, order.secondsLeft / ORDER_DURATION_SECONDS * 100))}%`, height: "100%", borderRadius: 999, background: urgent ? "linear-gradient(90deg,#ffbd65,#ff6577)" : warning ? "linear-gradient(90deg,#ffe17a,#ff9b67)" : "linear-gradient(90deg,#78efad,#d3ef86)" }} />
                </div>
                <strong style={{ color: warning ? "#ffb47a" : "rgba(255,255,255,.64)", fontSize: 10 }}>{order.secondsLeft}s</strong>
              </div>
            </div>
          );
        })}
        {!running && !stageResult && [0, 1, 2].map((index) => (
          <div key={index} style={{ ...panel, minHeight: 82, borderRadius: 14, display: "grid", placeItems: "center", color: "rgba(255,255,255,.24)", fontSize: 10 }}>
            Orders begin after Start Game
          </div>
        ))}
      </div>

      <div style={{ ...panel, borderRadius: 14, padding: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 11 }}>{paused ? "Stage paused" : running ? `${stageConfig.title} in progress` : stageConfig.description}</strong>
          <span style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.36)", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{status}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
          <button type="button" onClick={spawnIngredient} disabled={!running || paused} style={{ minHeight: 38, padding: "0 16px", borderRadius: 12, border: "1px solid rgba(126,232,255,.22)", background: "rgba(83,215,255,.08)", color: "white", fontSize: 11, fontWeight: 900, cursor: running && !paused ? "pointer" : "not-allowed" }}>Supply +</button>
          <button type="button" onClick={() => selectedIndex !== null && discardItem(selectedIndex)} disabled={!running || paused || selectedIndex === null} style={{ minHeight: 38, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,129,143,.2)", background: "rgba(255,100,120,.07)", color: "white", fontSize: 11, fontWeight: 900, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>Discard</button>
          {!running && !stageResult && (
            <button type="button" onClick={() => setShowRecipeBook(true)} style={{ minHeight: 38, padding: "0 16px", borderRadius: 12, border: "1px solid rgba(255,211,104,.36)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontSize: 11, fontWeight: 950, cursor: "pointer" }}>View Menu & Start</button>
          )}
        </div>
      </div>

      <div style={{ minHeight: 0, display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1.18fr) minmax(300px,.82fr)", gap: 7 }}>
        <div style={{ ...panel, minHeight: 0, borderRadius: 16, padding: 9, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "#9feeff", fontSize: 9, fontWeight: 950, letterSpacing: ".12em" }}>PREP COUNTER</p>
              {!mobile && <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.32)", fontSize: 9 }}>Drag ingredients together to form the exact recipe shown in the Menu Book.</p>}
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
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = readDragIndex(event);
                    if (fromIndex !== null) moveOrCombine(fromIndex, index);
                  }}
                  onPointerDown={(event) => beginPointerDrag(event, index)}
                  onPointerMove={movePointerDrag}
                  onPointerUp={endPointerDrag}
                  onPointerCancel={() => setDragState(null)}
                  style={{ minWidth: 0, minHeight: mobile ? 52 : compact ? 58 : 70, borderRadius: 12, border: selected ? "1px solid rgba(255,212,102,.82)" : item ? `1px solid ${familyTint(item.family)}20` : "1px solid rgba(255,255,255,.06)", background: selected ? "rgba(255,201,76,.09)" : item ? "linear-gradient(145deg,rgba(18,45,61,.86),rgba(8,19,31,.94))" : "rgba(255,255,255,.016)", boxShadow: selected ? "0 0 18px rgba(255,196,64,.15)" : "none", padding: 2, display: "grid", placeItems: "center", cursor: item && running && !paused ? "grab" : running && !paused ? "pointer" : "default", touchAction: mobile ? "none" : undefined }}
                >
                  {item ? (
                    <img src={item.image} alt="" draggable={false} style={{ width: mobile ? "78%" : "82%", height: mobile ? "78%" : "82%", maxWidth: 82, maxHeight: 82, objectFit: "contain", pointerEvents: "none" }} />
                  ) : (
                    <span style={{ color: "rgba(255,255,255,.11)", fontSize: 10 }}>+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ minHeight: 0, display: "grid", gridTemplateRows: `repeat(${workstationCards().length + 1}, minmax(0,1fr))`, gap: 7 }}>
          {workstationCards().map((station) => (
            <div
              key={station.id}
              data-prep-zone={station.id === "salad" ? "prep" : undefined}
              onDragOver={(event) => {
                if (station.id === "salad" && running && !paused) event.preventDefault();
              }}
              onDrop={(event) => {
                if (station.id !== "salad") return;
                event.preventDefault();
                const fromIndex = readDragIndex(event);
                if (fromIndex !== null) prepareItemAt(fromIndex);
              }}
              style={{
                ...panel,
                minHeight: 0,
                borderRadius: 16,
                border: `1px dashed ${station.accent}44`,
                display: "grid",
                gridTemplateColumns: "64px minmax(0,1fr)",
                alignItems: "center",
                gap: 12,
                padding: 14,
              }}
            >
              <div style={{ width: 58, height: 58, borderRadius: 17, display: "grid", placeItems: "center", background: `${station.accent}12`, border: `1px solid ${station.accent}33`, color: station.accent, fontSize: 26, fontWeight: 950 }}>
                {station.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 14, color: station.accent }}>{station.title}</strong>
                <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.5)", fontSize: 10, lineHeight: 1.45 }}>{station.detail}</p>
                <span style={{ display: "block", marginTop: 5, color: "rgba(255,255,255,.27)", fontSize: 8 }}>
                  {station.id === "salad" ? "Drop Lettuce here to start Side Salad." : "Workstation for the ingredients shown above."}
                </span>
              </div>
            </div>
          ))}

          <div
            data-prep-zone="discard"
            onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
            onDrop={(event) => {
              event.preventDefault();
              const fromIndex = readDragIndex(event);
              if (fromIndex !== null) discardItem(fromIndex);
            }}
            style={{
              ...panel,
              minHeight: 0,
              borderRadius: 16,
              border: "1px dashed rgba(255,129,143,.32)",
              display: "grid",
              gridTemplateColumns: "64px minmax(0,1fr)",
              alignItems: "center",
              gap: 12,
              padding: 14,
            }}
          >
            <div style={{ width: 58, height: 58, borderRadius: 17, display: "grid", placeItems: "center", background: "rgba(255,100,120,.08)", border: "1px solid rgba(255,129,143,.22)", color: "#ff9da8", fontSize: 27, fontWeight: 950 }}>↺</div>
            <div>
              <strong style={{ display: "block", fontSize: 14, color: "#ff9da8" }}>Discard Tray</strong>
              <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.5)", fontSize: 10, lineHeight: 1.45 }}>Drag unwanted ingredients here to clear prep-counter space.</p>
            </div>
          </div>
        </div>
      </div>

      {dragState && mobile && board[dragState.fromIndex] && (
        <div style={{ position: "fixed", left: dragState.x, top: dragState.y, transform: "translate(-50%,-50%)", zIndex: 1000, width: 58, height: 58, borderRadius: 14, border: "1px solid rgba(255,213,104,.72)", background: "rgba(11,17,27,.96)", display: "grid", placeItems: "center", pointerEvents: "none", boxShadow: "0 12px 30px rgba(0,0,0,.42)" }}>
          <img src={board[dragState.fromIndex]?.image} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} />
        </div>
      )}

      {showRecipeBook && (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.88)", backdropFilter: "blur(9px)" }}>
          <div style={{ ...panel, width: "min(900px,100%)", maxHeight: "90%", overflow: "auto", borderRadius: 24, padding: mobile ? 16 : 22 }}>
            <div style={{ borderRadius: 18, border: `1px solid ${stage === "stage1" ? "rgba(255,191,104,.28)" : "rgba(132,239,178,.24)"}`, background: stage === "stage1" ? "rgba(255,173,66,.055)" : "rgba(132,239,178,.045)", padding: mobile ? 12 : 15 }}>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "92px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
                <div style={{ width: mobile ? 70 : 82, height: mobile ? 70 : 82, borderRadius: 24, display: "grid", placeItems: "center", margin: mobile ? "0 auto" : 0, border: "1px solid rgba(255,200,105,.32)", background: "radial-gradient(circle at 50% 35%, rgba(255,211,112,.18), rgba(83,215,255,.08))", color: "#ffd16a", animation: "miloGuidePulse 2.1s ease-in-out infinite" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 30, lineHeight: 1 }}>✦</div>
                    <strong style={{ display: "block", marginTop: 3, fontSize: 10, letterSpacing: ".12em" }}>MILO</strong>
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, color: stage === "stage1" ? "#ffd08a" : "#84efb2", fontSize: 10, fontWeight: 950, letterSpacing: ".14em" }}>MILO GUIDE · STEP {guideStep + 1} OF {stage === "stage1" ? 4 : 3}</p>
                  <h3 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 25 : 31, fontWeight: 400 }}>
                    {stage === "stage1"
                      ? ["Welcome to Burger Basics", "Know your stations", "Build burgers in order", "Serve the customer"][guideStep] ?? "Burger Basics"
                      : ["Salads join the café", "Use the Salad Bowl", "Build salads in order"][guideStep] ?? "Salad Shift"}
                  </h3>
                  <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.68)", fontSize: 11, lineHeight: 1.55 }}>
                    {stage === "stage1"
                      ? [
                          "I’ll guide you through the café. Supply only gives Burger Basics ingredients in this stage. Complete 10 orders to clear it.",
                          "Use the Pan for Beef Patty and Bacon, and the Chopping Board for Lettuce and Tomato. Keep your prep counter organised.",
                          "Important: burgers must be built in order. Start with Bun + Beef Patty, then add Lettuce, then Tomato, then Cheese, then Bacon. You cannot skip ahead.",
                          "Each order has 45 seconds. The order shakes when 15 seconds remain. Match the ingredient pictures beside the order, finish the burger, then serve it.",
                        ][guideStep]
                      : [
                          "Stage 2 keeps the burger skills you learned and adds salads. Salad ingredients are Lettuce, Tomato and Ham.",
                          "The Salad Bowl is now active. Drop Lettuce into it to make Side Salad, then continue building on the prep counter.",
                          "Salads must also be built in order: Side Salad → add Tomato for Garden Salad → add Ham for Ham Salad. Complete 10 orders to clear Stage 2.",
                        ][guideStep]}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {Array.from({ length: stage === "stage1" ? 4 : 3 }, (_, index) => (
                    <button key={index} type="button" onClick={() => setGuideStep(index)} style={{ width: 30, height: 30, borderRadius: 999, border: guideStep === index ? "1px solid rgba(255,211,104,.54)" : "1px solid rgba(255,255,255,.1)", background: guideStep === index ? "rgba(255,191,82,.12)" : "rgba(255,255,255,.025)", color: guideStep === index ? "#ffd16a" : "rgba(255,255,255,.44)", fontSize: 10, fontWeight: 950, cursor: "pointer" }}>{index + 1}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {guideStep > 0 && <button type="button" onClick={() => setGuideStep((value) => Math.max(0, value - 1))} style={{ minHeight: 34, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.035)", color: "white", fontSize: 10, fontWeight: 900, cursor: "pointer" }}>Back</button>}
                  {guideStep < (stage === "stage1" ? 3 : 2) && <button type="button" onClick={() => setGuideStep((value) => value + 1)} style={{ minHeight: 34, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.08)", color: "white", fontSize: 10, fontWeight: 900, cursor: "pointer" }}>Next</button>}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {(["burger", "salad"] as Family[]).filter((family) => stageConfig.recipes.some((recipe) => recipe.family === family)).map((family) => (
                <div key={family} style={{ borderRadius: 17, border: `1px solid ${familyTint(family)}25`, background: "rgba(255,255,255,.018)", padding: 11 }}>
                  <strong style={{ color: familyTint(family), fontSize: 12 }}>{family === "burger" ? "Burger Recipes" : "Salad Recipes"}</strong>
                  <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: mobile ? "1fr" : `repeat(${Math.min(5, stageConfig.recipes.filter((recipe) => recipe.family === family).length)},minmax(0,1fr))`, gap: 8 }}>
                    {stageConfig.recipes.filter((recipe) => recipe.family === family).map((recipe) => (
                      <div key={recipe.key} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.018)", padding: 8 }}>
                        <img src={recipe.image} alt="" style={{ width: 64, height: 64, objectFit: "contain", display: "block", margin: "0 auto" }} />
                        <strong style={{ display: "block", marginTop: 4, fontSize: 10, textAlign: "center" }}>{recipe.label}</strong>
                        <div style={{ marginTop: 7, display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
                          {recipe.ingredients.map((key) => (
                            <div key={key} title={ingredientDef(key).label} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.035)", display: "grid", placeItems: "center" }}>
                              <img src={ingredientDef(key).image} alt="" style={{ width: 25, height: 25, objectFit: "contain" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!running && !stageResult ? (
              <button
                type="button"
                onClick={startStage}
                disabled={guideStep < (stage === "stage1" ? 3 : 2)}
                style={{
                  width: "100%", minHeight: 48, marginTop: 15, borderRadius: 14,
                  border: "1px solid rgba(255,211,104,.45)",
                  background: guideStep < (stage === "stage1" ? 3 : 2) ? "rgba(255,255,255,.05)" : "linear-gradient(135deg,#ffd16a,#f5a73f)",
                  color: guideStep < (stage === "stage1" ? 3 : 2) ? "rgba(255,255,255,.34)" : "#221400",
                  fontSize: 13, fontWeight: 950,
                  cursor: guideStep < (stage === "stage1" ? 3 : 2) ? "not-allowed" : "pointer",
                }}
              >
                {guideStep < (stage === "stage1" ? 3 : 2) ? "Finish Milo’s Guide to Start" : `Start Game · Stage ${stageConfig.number}`}
              </button>
            ) : (
              <button type="button" onClick={() => setShowRecipeBook(false)} style={{ width: "100%", minHeight: 44, marginTop: 15, borderRadius: 13, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
                Back to Stage
              </button>
            )}
          </div>
        </div>
      )}

      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: "absolute", inset: 0, zIndex: 70, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.86)", backdropFilter: "blur(8px)" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ ...panel, width: "min(620px,100%)", borderRadius: 23, padding: mobile ? 17 : 22 }}>
            <p style={{ margin: 0, color: "#9feeff", fontSize: 10, fontWeight: 950, letterSpacing: ".13em" }}>HOW TO PLAY</p>
            <h3 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 29, fontWeight: 400 }}>Mix, build, serve</h3>
            <div style={{ marginTop: 12, display: "grid", gap: 8, color: "rgba(255,255,255,.62)", fontSize: 11, lineHeight: 1.45 }}>
              <div><strong style={{ color: "white" }}>1. Supply:</strong> Add ingredients allowed in the current stage.</div>
              <div><strong style={{ color: "white" }}>2. Combine:</strong> Drag one ingredient or partial dish onto another to make the recipe.</div>
              <div><strong style={{ color: "white" }}>3. Serve:</strong> Drag the finished dish to its customer order before the 45-second timer expires.</div>
              <div><strong style={{ color: "white" }}>4. Stage goal:</strong> Complete 10 orders. Three missed orders fail the stage.</div>
              <div><strong style={{ color: "white" }}>5. Score:</strong> Tier base points + 4 points for every second remaining.</div>
              <div><strong style={{ color: "white" }}>6. Stars:</strong> 3★ with no misses, 2★ with one miss, 1★ with two misses.</div>
            </div>
            <button type="button" onClick={() => setShowHelp(false)} style={{ width: "100%", minHeight: 43, marginTop: 14, borderRadius: 13, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>Back</button>
          </div>
        </div>
      )}

      {stageResult && (
        <div style={{ position: "absolute", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.9)", backdropFilter: "blur(9px)" }}>
          <div style={{ ...panel, width: "min(650px,100%)", borderRadius: 25, padding: mobile ? 18 : 25, textAlign: "center" }}>
            <p style={{ margin: 0, color: stageResult.success ? "#84efb2" : "#ff9ca7", fontSize: 10, fontWeight: 950, letterSpacing: ".14em" }}>
              STAGE {STAGES[stageResult.stageId].number} {stageResult.success ? "COMPLETE" : "FAILED"}
            </p>
            <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 31 : 40, fontWeight: 400 }}>
              {STAGES[stageResult.stageId].title}
            </h3>
            <div style={{ marginTop: 10, fontSize: mobile ? 33 : 42, letterSpacing: ".08em", color: "#ffd66f" }}>
              {[1, 2, 3].map((starNumber) => (
                <span key={starNumber} style={{ opacity: starNumber <= stageResult.stars ? 1 : 0.18 }}>★</span>
              ))}
            </div>

            <div style={{ marginTop: 15, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
              {[
                ["Score", score.toLocaleString()],
                ["Orders", `${ordersServed}/${STAGE_ORDER_GOAL}`],
                ["Missed", `${failedOrders}/${MAX_FAILED_ORDERS}`],
                ["Time", formatTime(runSeconds)],
              ].map(([label, value]) => (
                <div key={label} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", padding: 9 }}>
                  <span style={{ display: "block", color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900 }}>{label}</span>
                  <strong style={{ display: "block", marginTop: 4, fontSize: 15 }}>{value}</strong>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, borderRadius: 15, border: "1px solid rgba(255,214,111,.17)", background: "rgba(255,196,64,.04)", padding: 11 }}>
              <span style={{ color: "rgba(255,255,255,.44)", fontSize: 9, fontWeight: 900 }}>STAGE DREAM TOKENS</span>
              <strong style={{ display: "block", marginTop: 5, color: stageResult.success ? "#ffd66f" : "rgba(255,255,255,.3)", fontSize: 28 }}>
                +{stageResult.success ? (rewardState === "awarded" ? awardedDt : resultDt) : 0} DT
              </strong>
              <span style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,.38)", fontSize: 9 }}>
                {!stageResult.success
                  ? "Complete the stage to collect DT."
                  : rewardState === "awarding"
                    ? "Adding DT to your balance…"
                    : rewardState === "guest"
                      ? "Log in to collect stage DT."
                      : rewardState === "failed"
                        ? "DT payout failed. Retry the stage or refresh and try again."
                        : `${stageResult.stars}★ Stage ${STAGES[stageResult.stageId].number} reward`}
              </span>
            </div>

            <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {!stageResult.success ? (
                <button type="button" onClick={() => { resetStageState(stageResult.stageId); setStage(stageResult.stageId); setGuideStep(0); setShowRecipeBook(true); }} style={{ minHeight: 44, padding: "0 22px", borderRadius: 13, border: "1px solid rgba(255,211,104,.38)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>
                  Retry Stage {STAGES[stageResult.stageId].number}
                </button>
              ) : stageResult.stageId === "stage1" ? (
                <>
                  <button type="button" onClick={() => { setStage2Unlocked(true); setStage("stage2"); resetStageState("stage2"); setGuideStep(0); setShowRecipeBook(true); setStatus("Stage 2 adds salads to the café. Review the new menu first."); }} style={{ minHeight: 44, padding: "0 22px", borderRadius: 13, border: "1px solid rgba(132,239,178,.34)", background: "linear-gradient(135deg,#89efb5,#69cfa0)", color: "#092117", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>
                    Continue to Stage 2
                  </button>
                  <button type="button" onClick={() => { resetStageState("stage1"); setStage("stage1"); setGuideStep(0); setShowRecipeBook(true); }} style={{ minHeight: 44, padding: "0 18px", borderRadius: 13, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>
                    Replay Stage 1
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => { resetStageState("stage2"); setStage("stage2"); setGuideStep(0); setShowRecipeBook(true); }} style={{ minHeight: 44, padding: "0 22px", borderRadius: 13, border: "1px solid rgba(255,211,104,.38)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>
                  Play Stage 2 Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
