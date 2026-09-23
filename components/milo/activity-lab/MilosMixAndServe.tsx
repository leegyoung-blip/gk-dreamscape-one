
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, PointerEvent as ReactPointerEvent } from "react";

type StageId = "western" | "stage2";
type ItemType = "ingredient" | "dish";
type IngredientKey =
  | "bun"
  | "beef-patty"
  | "lettuce"
  | "tomato"
  | "potato"
  | "cheese-slice"
  | "bread"
  | "ham"
  | "chicken"
  | "bacon"
  | "egg";

type PrepItem = {
  id: number;
  type: ItemType;
  key: string;
  label: string;
  image: string;
  ingredients: IngredientKey[];
  family?: "burger" | "sandwich" | "fries" | "salad";
  tier?: number;
};

type IngredientDef = {
  key: IngredientKey;
  label: string;
  image: string;
  unlockAt: number;
};

type RecipeDef = {
  key: string;
  family: "burger" | "sandwich" | "fries" | "salad";
  label: string;
  image: string;
  tier: number;
  ingredients: IngredientKey[];
};

type OrderSlot = {
  id: number;
  recipeKey: string;
  reward: number;
  secondsLeft: number;
};

type BoardCell = PrepItem | null;
type DragState = { itemId: number; fromIndex: number; x: number; y: number } | null;

type Props = {
  userId: string;
  mobile: boolean;
  dense: boolean;
  width: number;
  height: number;
  onTokenTransaction: (amount: number, description: string) => Promise<boolean>;
};

const BOARD_SIZE = 20;
const ORDER_DURATION_SECONDS = 30;
const ASSET_BASE = "/milo/activity-lab/mix-serve";

const INGREDIENTS: IngredientDef[] = [
  { key: "bun", label: "Bun", image: `${ASSET_BASE}/ingredients/ingredient-bun.png`, unlockAt: 0 },
  { key: "beef-patty", label: "Beef Patty", image: `${ASSET_BASE}/ingredients/ingredient-beef-patty.png`, unlockAt: 0 },
  { key: "lettuce", label: "Lettuce", image: `${ASSET_BASE}/ingredients/ingredient-lettuce.png`, unlockAt: 0 },
  { key: "tomato", label: "Tomato", image: `${ASSET_BASE}/ingredients/ingredient-tomato.png`, unlockAt: 0 },
  { key: "potato", label: "Potato", image: `${ASSET_BASE}/ingredients/ingredient-potato.png`, unlockAt: 0 },
  { key: "cheese-slice", label: "Cheese Slice", image: `${ASSET_BASE}/ingredients/ingredient-cheese-slice.png`, unlockAt: 3 },
  { key: "bread", label: "Bread", image: `${ASSET_BASE}/ingredients/ingredient-bread.png`, unlockAt: 3 },
  { key: "ham", label: "Ham", image: `${ASSET_BASE}/ingredients/ingredient-ham.png`, unlockAt: 3 },
  { key: "chicken", label: "Chicken", image: `${ASSET_BASE}/ingredients/ingredient-chicken.png`, unlockAt: 3 },
  { key: "bacon", label: "Bacon", image: `${ASSET_BASE}/ingredients/ingredient-bacon.png`, unlockAt: 8 },
  { key: "egg", label: "Egg", image: `${ASSET_BASE}/ingredients/ingredient-egg.png`, unlockAt: 8 },
];

const RECIPES: RecipeDef[] = [
  { key: "dish-burger-tier-1-basic-burger", family: "burger", label: "Basic Burger", image: `${ASSET_BASE}/dishes/dish-burger-tier-1-basic-burger.png`, tier: 1, ingredients: ["bun", "beef-patty"] },
  { key: "dish-burger-tier-2-lettuce-burger", family: "burger", label: "Lettuce Burger", image: `${ASSET_BASE}/dishes/dish-burger-tier-2-lettuce-burger.png`, tier: 2, ingredients: ["bun", "beef-patty", "lettuce"] },
  { key: "dish-burger-tier-3-classic-burger", family: "burger", label: "Classic Burger", image: `${ASSET_BASE}/dishes/dish-burger-tier-3-classic-burger.png`, tier: 3, ingredients: ["bun", "beef-patty", "lettuce", "tomato"] },
  { key: "dish-burger-tier-4-cheeseburger", family: "burger", label: "Cheeseburger", image: `${ASSET_BASE}/dishes/dish-burger-tier-4-cheeseburger.png`, tier: 4, ingredients: ["bun", "beef-patty", "lettuce", "tomato", "cheese-slice"] },
  { key: "dish-burger-tier-5-deluxe-burger", family: "burger", label: "Deluxe Burger", image: `${ASSET_BASE}/dishes/dish-burger-tier-5-deluxe-burger.png`, tier: 5, ingredients: ["bun", "beef-patty", "lettuce", "tomato", "cheese-slice", "bacon"] },

  { key: "dish-sandwich-tier-1-ham-sandwich", family: "sandwich", label: "Ham Sandwich", image: `${ASSET_BASE}/dishes/dish-sandwich-tier-1-ham-sandwich.png`, tier: 1, ingredients: ["bread", "ham"] },
  { key: "dish-sandwich-tier-2-ham-cheese-sandwich", family: "sandwich", label: "Ham Cheese Sandwich", image: `${ASSET_BASE}/dishes/dish-sandwich-tier-2-ham-cheese-sandwich.png`, tier: 2, ingredients: ["bread", "ham", "cheese-slice"] },
  { key: "dish-sandwich-tier-3-club-sandwich", family: "sandwich", label: "Club Sandwich", image: `${ASSET_BASE}/dishes/dish-sandwich-tier-3-club-sandwich.png`, tier: 3, ingredients: ["bread", "ham", "cheese-slice", "lettuce"] },
  { key: "dish-sandwich-tier-4-tomato-club-sandwich", family: "sandwich", label: "Tomato Club Sandwich", image: `${ASSET_BASE}/dishes/dish-sandwich-tier-4-tomato-club-sandwich.png`, tier: 4, ingredients: ["bread", "ham", "cheese-slice", "lettuce", "tomato"] },
  { key: "dish-sandwich-tier-5-ultimate-club-sandwich", family: "sandwich", label: "Ultimate Club Sandwich", image: `${ASSET_BASE}/dishes/dish-sandwich-tier-5-ultimate-club-sandwich.png`, tier: 5, ingredients: ["bread", "ham", "cheese-slice", "lettuce", "tomato", "bacon"] },

  { key: "dish-fries-tier-1-fries", family: "fries", label: "Fries", image: `${ASSET_BASE}/dishes/dish-fries-tier-1-fries.png`, tier: 1, ingredients: ["potato"] },
  { key: "dish-fries-tier-2-cheese-fries", family: "fries", label: "Cheese Fries", image: `${ASSET_BASE}/dishes/dish-fries-tier-2-cheese-fries.png`, tier: 2, ingredients: ["potato", "cheese-slice"] },
  { key: "dish-fries-tier-3-loaded-fries", family: "fries", label: "Loaded Fries", image: `${ASSET_BASE}/dishes/dish-fries-tier-3-loaded-fries.png`, tier: 3, ingredients: ["potato", "cheese-slice", "bacon"] },
  { key: "dish-fries-tier-4-chicken-loaded-fries", family: "fries", label: "Chicken Loaded Fries", image: `${ASSET_BASE}/dishes/dish-fries-tier-4-chicken-loaded-fries.png`, tier: 4, ingredients: ["potato", "cheese-slice", "bacon", "chicken"] },
  { key: "dish-fries-tier-5-supreme-loaded-fries", family: "fries", label: "Supreme Loaded Fries", image: `${ASSET_BASE}/dishes/dish-fries-tier-5-supreme-loaded-fries.png`, tier: 5, ingredients: ["potato", "cheese-slice", "bacon", "chicken", "egg"] },

  { key: "dish-salad-tier-1-side-salad", family: "salad", label: "Side Salad", image: `${ASSET_BASE}/dishes/dish-salad-tier-1-side-salad.png`, tier: 1, ingredients: ["lettuce"] },
  { key: "dish-salad-tier-2-garden-salad", family: "salad", label: "Garden Salad", image: `${ASSET_BASE}/dishes/dish-salad-tier-2-garden-salad.png`, tier: 2, ingredients: ["lettuce", "tomato"] },
  { key: "dish-salad-tier-3-chicken-salad", family: "salad", label: "Chicken Salad", image: `${ASSET_BASE}/dishes/dish-salad-tier-3-chicken-salad.png`, tier: 3, ingredients: ["lettuce", "tomato", "chicken"] },
  { key: "dish-salad-tier-4-chef-salad", family: "salad", label: "Chef Salad", image: `${ASSET_BASE}/dishes/dish-salad-tier-4-chef-salad.png`, tier: 4, ingredients: ["lettuce", "tomato", "chicken", "ham"] },
  { key: "dish-salad-tier-5-supreme-chef-salad", family: "salad", label: "Supreme Chef Salad", image: `${ASSET_BASE}/dishes/dish-salad-tier-5-supreme-chef-salad.png`, tier: 5, ingredients: ["lettuce", "tomato", "chicken", "ham", "egg"] },
];

const RECIPE_BY_KEY = new Map(RECIPES.map((recipe) => [sortKey(recipe.ingredients), recipe]));

const UNLOCK_GROUPS: Array<{
  title: string;
  threshold: string;
  items: IngredientDef[];
}> = [
  {
    title: "Starting Café",
    threshold: "0 orders",
    items: INGREDIENTS.filter((item) => item.unlockAt === 0),
  },
  {
    title: "Mid Shift",
    threshold: "3 orders",
    items: INGREDIENTS.filter((item) => item.unlockAt === 3),
  },
  {
    title: "Busy Café",
    threshold: "8 orders",
    items: INGREDIENTS.filter((item) => item.unlockAt === 8),
  },
];

function sortKey(keys: IngredientKey[]) {
  return [...keys].sort().join("|");
}

function createIngredient(id: number, key: IngredientKey): PrepItem {
  const def = INGREDIENTS.find((item) => item.key === key)!;
  return { id, type: "ingredient", key: def.key, label: def.label, image: def.image, ingredients: [def.key] };
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

function initialBoard(): BoardCell[] {
  const board = Array<BoardCell>(BOARD_SIZE).fill(null);
  const starters: IngredientKey[] = ["bun", "beef-patty", "lettuce", "tomato", "potato"];
  starters.forEach((key, index) => {
    board[index * 2] = createIngredient(index + 1, key);
  });
  return board;
}


function matchRecipe(ingredients: IngredientKey[]) {
  return RECIPE_BY_KEY.get(sortKey(ingredients)) ?? null;
}

function findSinglePrep(item: PrepItem) {
  if (item.type !== "ingredient") return null;
  return RECIPES.find((recipe) => recipe.ingredients.length === 1 && recipe.ingredients[0] === item.ingredients[0]) ?? null;
}

function canCombine(a: PrepItem, b: PrepItem) {
  if (a.type === "dish" && b.type === "dish") return null;
  const combined = [...a.ingredients, ...b.ingredients];
  const unique = Array.from(new Set(combined)) as IngredientKey[];
  if (unique.length !== combined.length) return null;
  return matchRecipe(unique);
}

function familyTint(family: string | undefined) {
  switch (family) {
    case "burger": return "#ffb86b";
    case "sandwich": return "#7ddcff";
    case "fries": return "#ffd66f";
    case "salad": return "#84efb2";
    default: return "#9feeff";
  }
}

function familyLabel(family: string) {
  return family.charAt(0).toUpperCase() + family.slice(1);
}

function orderReward(recipe: RecipeDef) {
  return [0, 150, 240, 360, 520, 720][recipe.tier] ?? 150;
}

function orderTierCap(ordersServed: number) {
  if (ordersServed < 3) return 2;
  if (ordersServed < 8) return 4;
  return 5;
}

export default function MilosMixAndServe({ userId, mobile, dense, width, height, onTokenTransaction }: Props) {
  const compact = height < 760 || width < 1100;
  const [stage, setStage] = useState<StageId>("western");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [board, setBoard] = useState<BoardCell[]>(() => initialBoard());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showRecipeBook, setShowRecipeBook] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [status, setStatus] = useState("Stage 1 is live. Build dishes, beat each 30-second timer and survive until three orders are missed.");
  const [recipesMade, setRecipesMade] = useState(0);
  const [successfulCombines, setSuccessfulCombines] = useState(0);
  const [ingredientsSpawned, setIngredientsSpawned] = useState(0);
  const [orders, setOrders] = useState<OrderSlot[]>([]);
  const [ordersServed, setOrdersServed] = useState(0);
  const [score, setScore] = useState(0);
  const [failedOrders, setFailedOrders] = useState(0);
  const [orderStreak, setOrderStreak] = useState(0);
  const [bestOrderStreak, setBestOrderStreak] = useState(0);
  const [runSeconds, setRunSeconds] = useState(0);
  const [cafeClosed, setCafeClosed] = useState(false);
  const [highestTierServed, setHighestTierServed] = useState(0);
  const [servedByFamily, setServedByFamily] = useState<Record<"burger" | "sandwich" | "fries" | "salad", number>>({
    burger: 0, sandwich: 0, fries: 0, salad: 0,
  });
  const [completedRunId, setCompletedRunId] = useState<number | null>(null);
  const [rewardState, setRewardState] = useState<"idle" | "awarding" | "awarded" | "guest" | "failed">("idle");
  const [awardedDt, setAwardedDt] = useState(0);
  const nextId = useRef(1000);
  const nextOrderId = useRef(1);
  const ordersRef = useRef<OrderSlot[]>([]);
  const ordersServedRef = useRef(0);
  const failedOrdersRef = useRef(0);
  const currentRunId = useRef(0);
  const awardedRunIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!running) setPaused(false);
  }, [running]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (expandedOrderId !== null && !orders.some((order) => order.id === expandedOrderId)) {
      setExpandedOrderId(null);
    }
  }, [orders, expandedOrderId]);

  useEffect(() => {
    ordersServedRef.current = ordersServed;
  }, [ordersServed]);

  useEffect(() => {
    failedOrdersRef.current = failedOrders;
  }, [failedOrders]);

  const hasActiveOrders = orders.length > 0;

  useEffect(() => {
    if (!running || paused || cafeClosed || !hasActiveOrders || ordersRef.current.length === 0) return;

    const timer = window.setInterval(() => {
      const current = ordersRef.current;
      if (current.length === 0) return;

      setRunSeconds((seconds) => seconds + 1);

      const decremented = current.map((order) => ({
        ...order,
        secondsLeft: order.secondsLeft - 1,
      }));
      const expired = decremented.filter((order) => order.secondsLeft <= 0);

      if (expired.length === 0) {
        ordersRef.current = decremented;
        setOrders(decremented);
        return;
      }

      const failuresAfterTick = Math.min(3, failedOrdersRef.current + expired.length);
      failedOrdersRef.current = failuresAfterTick;
      setFailedOrders(failuresAfterTick);
      setOrderStreak(0);

      if (failuresAfterTick >= 3) {
        ordersRef.current = [];
        setOrders([]);
        setRunning(false);
        setPaused(false);
        setCafeClosed(true);
        setCompletedRunId(currentRunId.current);
        setSelectedIndex(null);
        setDragState(null);
        setStatus("Three customer orders were missed. The café is closed for this run.");
        return;
      }

      let nextOrders = decremented.filter((order) => order.secondsLeft > 0);
      for (let index = 0; index < expired.length; index += 1) {
        const avoidKeys = nextOrders.map((order) => order.recipeKey);
        nextOrders.push(createOrder(ordersServedRef.current, avoidKeys));
      }
      // Keep the visual order slots stable by order id after replacements.
      nextOrders = nextOrders.sort((a, b) => a.id - b.id).slice(-3);
      ordersRef.current = nextOrders;
      setOrders(nextOrders);
      setStatus(`${expired.length === 1 ? "An order" : `${expired.length} orders`} timed out. ${failuresAfterTick} / 3 failed orders.`);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, paused, cafeClosed, hasActiveOrders]);

  const occupied = useMemo(() => board.filter(Boolean).length, [board]);
  const unlockedIngredients = useMemo(
    () => INGREDIENTS.filter((item) => ordersServed >= item.unlockAt),
    [ordersServed],
  );
  const scoreDt = Math.floor(score / 700);
  const orderDt = Math.floor(ordersServed / 3);
  const tierDt = highestTierServed >= 5 ? 6 : highestTierServed === 4 ? 4 : highestTierServed === 3 ? 2 : 0;
  const survivalDt = Math.min(10, Math.floor(runSeconds / 90));
  const runDtReward = ordersServed > 0 ? Math.max(1, scoreDt + orderDt + tierDt + survivalDt) : 0;
  const preGameMenu = !running && !cafeClosed && completedRunId === null;
  const highestTierMade = useMemo(() => {
    let highest = 0;
    board.forEach((item) => {
      if (item?.tier && item.tier > highest) highest = item.tier;
    });
    return highest;
  }, [board]);

  useEffect(() => {
    if (!cafeClosed || completedRunId === null) return;
    if (awardedRunIds.current.has(completedRunId)) return;

    if (!userId) {
      setRewardState("guest");
      setAwardedDt(0);
      awardedRunIds.current.add(completedRunId);
      return;
    }

    if (runDtReward <= 0) {
      setRewardState("awarded");
      setAwardedDt(0);
      awardedRunIds.current.add(completedRunId);
      return;
    }

    let cancelled = false;
    awardedRunIds.current.add(completedRunId);
    setRewardState("awarding");

    void onTokenTransaction(runDtReward, `Milo's Mix & Serve reward · Run ${completedRunId}`).then((success) => {
      if (cancelled) return;
      if (success) {
        setAwardedDt(runDtReward);
        setRewardState("awarded");
      } else {
        awardedRunIds.current.delete(completedRunId);
        setAwardedDt(0);
        setRewardState("failed");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cafeClosed, completedRunId, onTokenTransaction, runDtReward, userId]);

  function resetSandbox() {
    setBoard(initialBoard());
    nextId.current = 1000;
    nextOrderId.current = 1;
    setSelectedIndex(null);
    setDragState(null);
    setExpandedOrderId(null);
    setRecipesMade(0);
    setSuccessfulCombines(0);
    setIngredientsSpawned(0);
    setOrdersServed(0);
    ordersServedRef.current = 0;
    setScore(0);
    setFailedOrders(0);
    failedOrdersRef.current = 0;
    setOrderStreak(0);
    setBestOrderStreak(0);
    setRunSeconds(0);
    setCafeClosed(false);
    setHighestTierServed(0);
    setServedByFamily({ burger: 0, sandwich: 0, fries: 0, salad: 0 });
    setCompletedRunId(null);
    setRewardState("idle");
    setAwardedDt(0);
    setOrders([]);
    ordersRef.current = [];
    setStatus("Stage 1 is live. Build dishes, beat each 30-second timer and survive until three orders are missed.");
  }

  function eligibleOrderRecipes(servedCount: number) {
    const unlockedKeys = new Set(INGREDIENTS.filter((item) => servedCount >= item.unlockAt).map((item) => item.key));
    const tierCap = orderTierCap(servedCount);
    return RECIPES.filter(
      (recipe) => recipe.tier <= tierCap && recipe.ingredients.every((ingredient) => unlockedKeys.has(ingredient)),
    );
  }

  function createOrder(servedCount: number, avoidKeys: string[] = []): OrderSlot {
    const eligible = eligibleOrderRecipes(servedCount);
    const fresh = eligible.filter((recipe) => !avoidKeys.includes(recipe.key));
    const pool = fresh.length > 0 ? fresh : eligible;
    const recipe = pool[Math.floor(Math.random() * pool.length)] ?? RECIPES[0];
    return { id: nextOrderId.current++, recipeKey: recipe.key, reward: orderReward(recipe), secondsLeft: ORDER_DURATION_SECONDS };
  }

  function fillInitialOrders() {
    const slots: OrderSlot[] = [];
    for (let index = 0; index < 3; index += 1) {
      slots.push(createOrder(0, slots.map((order) => order.recipeKey)));
    }
    ordersRef.current = slots;
    setOrders(slots);
  }

  function startKitchen() {
    setShowRecipeBook(false);
    currentRunId.current += 1;
    resetSandbox();
    setRunning(true);
    setPaused(false);
    window.setTimeout(fillInitialOrders, 0);
  }

  function emptyCellIndex(cells: BoardCell[]) {
    return cells.findIndex((entry) => entry === null);
  }

  function addStatus(message: string) {
    setStatus(message);
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
    const order = orders.find((entry) => entry.id === orderId);
    const dish = board[fromIndex];
    if (!order || !dish) return;
    if (dish.type !== "dish") {
      addStatus("Only a finished dish can be served to a customer order.");
      return;
    }
    if (dish.key !== order.recipeKey) {
      const requested = RECIPES.find((recipe) => recipe.key === order.recipeKey);
      addStatus(`${dish.label} does not match this order${requested ? ` for ${requested.label}` : ""}.`);
      return;
    }

    setBoard((current) => {
      if (!current[fromIndex] || current[fromIndex]?.id !== dish.id) return current;
      const next = [...current];
      next[fromIndex] = null;
      return next;
    });

    const nextServed = ordersServed + 1;
    const nextStreak = Math.min(5, orderStreak + 1);
    const multiplier = Math.max(1, nextStreak);
    const earned = order.reward * multiplier;
    ordersServedRef.current = nextServed;
    setOrdersServed(nextServed);
    setOrderStreak(nextStreak);
    setBestOrderStreak((current) => Math.max(current, nextStreak));
    setScore((current) => current + earned);
    const servedRecipe = RECIPES.find((recipe) => recipe.key === order.recipeKey);
    if (servedRecipe) {
      setHighestTierServed((current) => Math.max(current, servedRecipe.tier));
      setServedByFamily((current) => ({ ...current, [servedRecipe.family]: current[servedRecipe.family] + 1 }));
    }
    setSelectedIndex(null);
    addStatus(`${dish.label} served! +${earned} points · Order Streak ×${multiplier}.`);
    replaceOrder(orderId, nextServed);
  }

  function serveSelectedToOrder(orderId: number) {
    if (selectedIndex === null) {
      addStatus("Select a finished dish first, then tap the matching customer order.");
      return;
    }
    serveDishToOrder(selectedIndex, orderId);
  }

  function spawnIngredient() {
    if (!running || paused) return;
    setBoard((current) => {
      const emptyIndex = emptyCellIndex(current);
      if (emptyIndex === -1) {
        addStatus("The prep counter is full. Combine or discard something before adding more ingredients.");
        return current;
      }
      const pool = unlockedIngredients;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      const next = [...current];
      next[emptyIndex] = createIngredient(++nextId.current, chosen.key);
      setIngredientsSpawned((count) => count + 1);
      addStatus(`${chosen.label} added to the prep counter.`);
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
      addStatus(`${item.label} removed from the prep counter.`);
      return next;
    });
    setSelectedIndex(null);
  }

  function prepareItemAt(index: number) {
    if (!running || paused) return;
    setBoard((current) => {
      const item = current[index];
      if (!item) return current;
      const recipe = findSinglePrep(item);
      if (!recipe) {
        addStatus(`${item.label} cannot be plated on its own. Try combining it with another ingredient.`);
        return current;
      }
      const next = [...current];
      next[index] = createDish(++nextId.current, recipe);
      setRecipesMade((count) => count + 1);
      setSuccessfulCombines((count) => count + 1);
      addStatus(`${recipe.label} prepared.`);
      return next;
    });
    setSelectedIndex(null);
  }

  function prepareSelected() {
    if (selectedIndex === null) return;
    prepareItemAt(selectedIndex);
  }

  function moveOrCombine(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || paused || !running) return;
    setBoard((current) => {
      const source = current[fromIndex];
      if (!source) return current;
      const destination = current[toIndex];
      const next = [...current];
      if (!destination) {
        next[toIndex] = source;
        next[fromIndex] = null;
        addStatus(`${source.label} moved.`);
        return next;
      }
      const recipe = canCombine(source, destination);
      if (!recipe) {
        addStatus(`That combination does not match a Western Café recipe.`);
        return current;
      }
      next[toIndex] = createDish(++nextId.current, recipe);
      next[fromIndex] = null;
      setRecipesMade((count) => count + 1);
      setSuccessfulCombines((count) => count + 1);
      addStatus(`${recipe.label} created.`);
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

  function beginPointerDrag(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (!mobile || !running || paused || !board[index]) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedIndex(index);
    setDragState({ itemId: board[index]!.id, fromIndex: index, x: event.clientX, y: event.clientY });
  }

  function movePointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    setDragState((current) => current ? { ...current, x: event.clientX, y: event.clientY } : null);
  }

  function resolveDropTarget(target: Element | null) {
    const order = target?.closest("[data-order-id]") as HTMLElement | null;
    if (order?.dataset.orderId !== undefined) return { type: "order" as const, orderId: Number(order.dataset.orderId) };
    const cell = target?.closest("[data-prep-cell]") as HTMLElement | null;
    if (cell?.dataset.prepCell !== undefined) return { type: "cell" as const, index: Number(cell.dataset.prepCell) };
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

  function onDropCell(event: DragEvent<HTMLElement>, toIndex: number) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/milo-prep-cell");
    const fromIndex = Number(raw);
    if (Number.isFinite(fromIndex)) moveOrCombine(fromIndex, toIndex);
  }

  function onDropDiscard(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/milo-prep-cell");
    const fromIndex = Number(raw);
    if (Number.isFinite(fromIndex)) discardItem(fromIndex);
  }

  function onDropPrep(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/milo-prep-cell");
    const fromIndex = Number(raw);
    if (Number.isFinite(fromIndex)) prepareItemAt(fromIndex);
  }

  function onDropOrder(event: DragEvent<HTMLElement>, orderId: number) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/milo-prep-cell");
    const fromIndex = Number(raw);
    if (Number.isFinite(fromIndex)) serveDishToOrder(fromIndex, orderId);
  }

  const panel: CSSProperties = {
    border: "1px solid rgba(128,226,255,.14)",
    background: "linear-gradient(145deg, rgba(8,27,46,.9), rgba(4,13,27,.96))",
    boxShadow: "inset 0 0 30px rgba(86,214,255,.025), 0 14px 34px rgba(0,0,0,.2)",
  };

  if (stage === "stage2") {
    return (
      <div style={{ height: "100%", minHeight: 0, display: "grid", placeItems: "center", padding: mobile ? 12 : 22 }}>
        <div style={{ ...panel, width: "min(760px,100%)", borderRadius: 28, padding: mobile ? "28px 20px" : "42px", textAlign: "center" }}>
          <div style={{ width: 74, height: 74, borderRadius: 22, margin: "0 auto", display: "grid", placeItems: "center", border: "1px solid rgba(255,211,104,.24)", background: "rgba(255,190,65,.07)", fontSize: 30 }}>Ⅱ</div>
          <p style={{ margin: "18px 0 0", color: "#ffd66f", fontSize: 9, fontWeight: 950, letterSpacing: ".16em" }}>STAGE 2</p>
          <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 34 : 46, fontWeight: 400 }}>Coming Soon</h2>
          <p style={{ margin: "12px auto 0", maxWidth: 520, color: "rgba(255,255,255,.48)", fontSize: 12, lineHeight: 1.6 }}>
            A new cuisine, more complex recipes and higher Dream Token rewards will arrive in Stage 2.
          </p>
          <button type="button" onClick={() => setStage("western")} style={{ marginTop: 20, minHeight: 44, padding: "0 20px", borderRadius: 14, border: "1px solid rgba(126,232,255,.22)", background: "rgba(83,215,255,.08)", color: "white", fontWeight: 900, cursor: "pointer" }}>
            Back to Western Café
          </button>
        </div>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#ffbf68", fontSize: mobile ? 9 : 10, fontWeight: 950, letterSpacing: ".16em", textTransform: "uppercase" }}>Milo’s Western Café · Stage 1</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ margin: "3px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 25 : compact ? 29 : 34, lineHeight: 1, fontWeight: 400 }}>Milo’s Mix & Serve</h2>
            {!mobile && <span style={{ color: "rgba(255,255,255,.3)", fontSize: 10, fontWeight: 900 }}>PHASE 4 · REWARDS ONLINE LIVE</span>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" onClick={() => setStage("stage2")} style={{ minHeight: mobile ? 32 : 36, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(255,210,102,.18)", background: "rgba(255,190,65,.055)", color: "#ffd66f", fontSize: mobile ? 10 : 11, fontWeight: 900, cursor: "pointer" }}>
            Stage 2 · Soon
          </button>
          <button type="button" onClick={() => setShowRecipeBook(true)} style={{ minHeight: mobile ? 32 : 36, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(255,191,104,.2)", background: "rgba(255,173,66,.06)", color: "#ffd08a", fontSize: mobile ? 10 : 11, fontWeight: 900, cursor: "pointer" }}>
            Menu Book
          </button>
          <button type="button" onClick={() => setShowHelp(true)} style={{ minHeight: mobile ? 32 : 36, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(128,226,255,.2)", background: "rgba(83,215,255,.06)", color: "#dffaff", fontSize: mobile ? 10 : 11, fontWeight: 900, cursor: "pointer" }}>
            ? How to Play
          </button>
          <button type="button" onClick={() => running && setPaused((value) => !value)} disabled={!running} aria-label={paused ? "Resume kitchen" : "Pause kitchen"} style={{ width: mobile ? 32 : 36, height: mobile ? 32 : 36, borderRadius: 999, border: "1px solid rgba(128,226,255,.18)", background: "rgba(83,215,255,.06)", color: running ? "white" : "rgba(255,255,255,.3)", cursor: running ? "pointer" : "not-allowed" }}>
            {paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 6 }}>
        {[
          ["SCORE", score.toLocaleString(), "Order score"],
          ["ORDERS SERVED", String(ordersServed), "Completed customer orders"],
          ["FAILED ORDERS", `${failedOrders} / 3`, "Third miss closes the café"],
          ["ORDER STREAK", `×${Math.max(1, orderStreak)}`, bestOrderStreak > 0 ? `Best ×${bestOrderStreak}` : "Serve consecutive orders"],
        ].map(([label, value, sub]) => (
          <div key={label} style={{ ...panel, borderRadius: 13, padding: mobile ? "7px 9px" : "8px 10px", minWidth: 0 }}>
            <p style={{ margin: 0, color: "rgba(166,235,255,.46)", fontSize: 8, fontWeight: 950, letterSpacing: ".12em" }}>{label}</p>
            <div style={{ marginTop: 2, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
              <strong style={{ fontSize: mobile ? 18 : 21, lineHeight: 1, color: label === "ORDER STREAK" ? "#ffd66f" : label === "FAILED ORDERS" ? "#ff9ca7" : "white" }}>{value}</strong>
              {!mobile && !compact && <span style={{ color: "rgba(255,255,255,.25)", fontSize: 9, whiteSpace: "nowrap" }}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, minWidth: 0 }}>
        {orders.length > 0 ? orders.map((order) => {
          const recipe = RECIPES.find((entry) => entry.key === order.recipeKey)!;
          const selectedDish = selectedIndex !== null ? board[selectedIndex] : null;
          const selectedMatches = selectedDish?.type === "dish" && selectedDish.key === order.recipeKey;
          return (
            <button
              key={order.id}
              type="button"
              data-order-id={order.id}
              onClick={() => serveSelectedToOrder(order.id)}
              onDragOver={(event) => { if (running && !paused) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
              onDrop={(event) => onDropOrder(event, order.id)}
              style={{
                ...panel,
                minWidth: 0,
                borderRadius: mobile ? 12 : 14,
                padding: mobile ? 7 : 9,
                color: "white",
                textAlign: "left",
                cursor: running && !paused ? "pointer" : "default",
                border: selectedMatches ? "1px solid rgba(132,239,178,.6)" : order.secondsLeft <= 8 ? "1px solid rgba(255,127,140,.55)" : `1px solid ${familyTint(recipe.family)}2a`,
                boxShadow: selectedMatches ? "0 0 20px rgba(132,239,178,.12)" : order.secondsLeft <= 8 ? "0 0 20px rgba(255,127,140,.09), inset 0 0 18px rgba(255,127,140,.04)" : panel.boxShadow,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "36px minmax(0,1fr)" : "46px minmax(0,1fr) auto", alignItems: "center", gap: 7, minWidth: 0 }}>
                <img
                  src={recipe.image}
                  alt=""
                  draggable={false}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedOrderId((current) => current === order.id ? null : order.id);
                  }}
                  style={{ width: mobile ? 40 : 50, height: mobile ? 40 : 50, objectFit: "contain", cursor: "pointer" }}
                />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: familyTint(recipe.family), fontSize: 8, fontWeight: 950, letterSpacing: ".1em" }}>ORDER · TIER {recipe.tier}</p>
                  <strong style={{ display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: mobile ? 10 : 12 }}>{recipe.label}</strong>
                  <span style={{ color: "rgba(255,255,255,.36)", fontSize: 9 }}>+{order.reward} pts</span>
                </div>
                {!mobile && <span style={{ color: selectedMatches ? "#84efb2" : "rgba(255,255,255,.35)", fontSize: 9, fontWeight: 900 }}>{selectedMatches ? "READY" : "SERVE"}</span>}
              </div>
              {expandedOrderId === order.id && (
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    marginTop: 7,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "6px 8px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(2,10,20,.72)",
                  }}
                >
                  {recipe.ingredients.map((ingredientKey) => {
                    const ingredient = INGREDIENTS.find((item) => item.key === ingredientKey)!;
                    return (
                      <img
                        key={ingredientKey}
                        src={ingredient.image}
                        alt=""
                        title={ingredient.label}
                        draggable={false}
                        style={{ width: mobile ? 24 : 30, height: mobile ? 24 : 30, objectFit: "contain" }}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 7 }}>
                <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.055)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, (order.secondsLeft / ORDER_DURATION_SECONDS) * 100))}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: order.secondsLeft > 15 ? "#87efad" : order.secondsLeft > 8 ? "#ffd36c" : "#ff7f8c",
                      boxShadow: order.secondsLeft <= 8 ? "0 0 10px rgba(255,127,140,.35)" : "none",
                      transition: "width 1s linear, background 180ms ease",
                    }}
                  />
                </div>
                <span style={{ color: order.secondsLeft <= 8 ? "#ff9ca7" : "rgba(255,255,255,.54)", fontSize: 9, fontWeight: 950 }}>{order.secondsLeft}s</span>
              </div>
              {!mobile && <p style={{ margin: "4px 0 0", color: order.secondsLeft <= 8 ? "rgba(255,156,167,.72)" : "rgba(255,255,255,.24)", fontSize: 8 }}>{order.secondsLeft <= 8 ? "Hurry — this customer is about to leave." : "Serve before the 30-second order timer runs out."}</p>}
            </button>
          );
        }) : Array.from({ length: 3 }).map((_, index) => (
          <div key={index} style={{ ...panel, borderRadius: mobile ? 12 : 14, padding: mobile ? 7 : 9, minHeight: mobile ? 58 : 72, display: "grid", placeItems: "center", color: "rgba(255,255,255,.25)", fontSize: 8, fontWeight: 900 }}>OPEN THE KITCHEN</div>
        ))}
      </div>

      <div style={{ ...panel, borderRadius: 14, padding: mobile ? 7 : 8, display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1fr) auto", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: mobile ? 10 : 11 }}>{running ? paused ? "Kitchen paused" : "Kitchen open" : "Ready to open the kitchen"}</strong>
          <span style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.34)", fontSize: mobile ? 8 : 9, lineHeight: 1.35 }}>{status}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: mobile ? "stretch" : "flex-end" }}>
          <button type="button" onClick={spawnIngredient} disabled={!running || paused} style={{ minHeight: 36, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.08)", color: "white", fontWeight: 900, cursor: running && !paused ? "pointer" : "not-allowed" }}>Supply +</button>
          <button type="button" onClick={prepareSelected} disabled={!running || paused || selectedIndex === null} style={{ minHeight: 36, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,196,100,.2)", background: "rgba(255,173,66,.08)", color: "white", fontWeight: 900, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>Prep Selected</button>
          <button type="button" onClick={() => selectedIndex !== null && discardItem(selectedIndex)} disabled={!running || paused || selectedIndex === null} style={{ minHeight: 36, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,129,143,.18)", background: "rgba(255,100,120,.06)", color: "white", fontWeight: 900, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>Discard</button>
          <button type="button" onClick={() => { if (running) startKitchen(); else setShowRecipeBook(true); }} style={{ minHeight: 38, padding: "0 16px", borderRadius: 12, border: "1px solid rgba(255,211,104,.34)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontWeight: 950, cursor: "pointer" }}>{running ? "Reset Kitchen" : "View Menu & Start"}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.1fr minmax(280px, .9fr)", gap: 7, minHeight: 0 }}>
        <div style={{ ...panel, minHeight: 0, borderRadius: 16, padding: mobile ? 7 : 9, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div>
              <p style={{ margin: 0, color: "#9feeff", fontSize: 9, fontWeight: 950, letterSpacing: ".14em" }}>PREP COUNTER</p>
              {!mobile && <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.3)", fontSize: 9 }}>Click or drag items into empty cells to move them. Drop one ingredient or dish onto another to create a valid recipe.</p>}
            </div>
            <span style={{ color: "rgba(255,255,255,.34)", fontSize: 9, fontWeight: 850 }}>{occupied} / {BOARD_SIZE} spaces</span>
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
                  onDragOver={(event) => { if (running && !paused) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
                  onDrop={(event) => onDropCell(event, index)}
                  onPointerDown={(event) => beginPointerDrag(event, index)}
                  onPointerMove={movePointerDrag}
                  onPointerUp={endPointerDrag}
                  onPointerCancel={() => setDragState(null)}
                  style={{
                    minWidth: 0,
                    minHeight: mobile ? 58 : compact ? 66 : 78,
                    borderRadius: mobile ? 10 : 12,
                    border: selected ? "1px solid rgba(255,212,102,.82)" : item ? `1px solid ${familyTint(item.family)}22` : "1px solid rgba(255,255,255,.06)",
                    background: selected ? "rgba(255,201,76,.1)" : item ? "linear-gradient(145deg,rgba(18,45,61,.9),rgba(8,19,31,.94))" : "rgba(255,255,255,.018)",
                    boxShadow: selected ? "0 0 18px rgba(255,196,64,.14)" : "inset 0 0 14px rgba(90,220,255,.018)",
                    padding: 4,
                    display: "grid",
                    placeItems: "center",
                    color: "white",
                    cursor: item && running && !paused ? "grab" : running && !paused ? "pointer" : "default",
                    touchAction: mobile ? "none" : undefined,
                    userSelect: "none",
                  }}
                >
                  {item ? (
                    <img
                      src={item.image}
                      alt=""
                      aria-label={item.label}
                      draggable={false}
                      style={{
                        width: "86%",
                        height: "86%",
                        maxWidth: mobile ? 54 : compact ? 66 : 88,
                        maxHeight: mobile ? 54 : compact ? 66 : 88,
                        objectFit: "contain",
                        display: "block",
                        filter: selected ? "drop-shadow(0 0 12px rgba(255,206,92,.28))" : "drop-shadow(0 7px 10px rgba(0,0,0,.26))",
                        pointerEvents: "none",
                      }}
                    />
                  ) : (
                    <span style={{ color: "rgba(255,255,255,.14)", fontSize: 8 }}>+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ minHeight: 0, display: "grid", gridTemplateRows: mobile ? "auto auto auto" : "auto auto minmax(0,1fr)", gap: 7 }}>
          <div style={{ ...panel, borderRadius: 16, padding: 10 }}>
            <p style={{ margin: 0, color: "#ffd08a", fontSize: 9, fontWeight: 950, letterSpacing: ".14em" }}>UNLOCK PROGRESSION</p>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {UNLOCK_GROUPS.map(({ title, threshold, items }) => {
                const unlocked = items.every((item) => ordersServed >= item.unlockAt);
                return (
                  <div key={title} style={{ borderRadius: 12, border: unlocked ? "1px solid rgba(132,239,178,.2)" : "1px solid rgba(255,255,255,.06)", background: unlocked ? "rgba(132,239,178,.04)" : "rgba(255,255,255,.015)", padding: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                      <strong style={{ fontSize: 10.5 }}>{title}</strong>
                      <span style={{ color: unlocked ? "#84efb2" : "rgba(255,255,255,.34)", fontSize: 8.5, fontWeight: 900 }}>{unlocked ? "UNLOCKED" : threshold}</span>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {items.map((item) => (
                        <div key={item.key} title={item.label} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: ordersServed >= item.unlockAt ? "rgba(83,215,255,.06)" : "rgba(255,255,255,.02)", display: "grid", placeItems: "center", opacity: ordersServed >= item.unlockAt ? 1 : 0.38 }}>
                          <img src={item.image} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr", gap: 7 }}>
            <div
              data-prep-zone="prep"
              onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
              onDrop={onDropPrep}
              style={{ ...panel, borderRadius: 16, padding: 12, display: "grid", placeItems: "center", textAlign: "center", minHeight: 110, border: "1px dashed rgba(255,173,66,.28)" }}
            >
              <div>
                <div style={{ width: 46, height: 46, margin: "0 auto", borderRadius: 14, background: "rgba(255,173,66,.08)", display: "grid", placeItems: "center", color: "#ffc46d", fontSize: 18, fontWeight: 950 }}>⌂</div>
                <strong style={{ display: "block", marginTop: 7, fontSize: 12 }}>Prep Station</strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.32)", fontSize: 8.5, lineHeight: 1.4 }}>Use for base one-ingredient dishes like Fries and Side Salad.</p>
              </div>
            </div>

            <div
              data-prep-zone="discard"
              onDragOver={(event) => { if (running && !paused) event.preventDefault(); }}
              onDrop={onDropDiscard}
              style={{ ...panel, borderRadius: 16, padding: 12, display: "grid", placeItems: "center", textAlign: "center", minHeight: 110, border: "1px dashed rgba(255,129,143,.25)" }}
            >
              <div>
                <div style={{ width: 46, height: 46, margin: "0 auto", borderRadius: 14, background: "rgba(255,100,120,.07)", display: "grid", placeItems: "center", color: "#ff9da8", fontSize: 18, fontWeight: 950 }}>↺</div>
                <strong style={{ display: "block", marginTop: 7, fontSize: 12 }}>Discard Tray</strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.32)", fontSize: 8.5, lineHeight: 1.4 }}>Drag unwanted items here to clear board space.</p>
              </div>
            </div>
          </div>

          <div style={{ ...panel, borderRadius: 16, padding: 10, minHeight: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, color: "#9feeff", fontSize: 9, fontWeight: 950, letterSpacing: ".14em" }}>RECIPE FAMILIES</p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.3)", fontSize: 7 }}>Recipes {recipesMade} · Combines {successfulCombines} · Supplies {ingredientsSpawned} · Unlocked {unlockedIngredients.length}/11 · Highest tier {highestTierMade ? `T${highestTierMade}` : "—"}</p>
              </div>
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
              {(["burger", "sandwich", "fries", "salad"] as const).map((family) => {
                const familyRecipes = RECIPES.filter((recipe) => recipe.family === family);
                return (
                  <div key={family} style={{ borderRadius: 12, border: `1px solid ${familyTint(family)}2a`, background: "rgba(255,255,255,.018)", padding: 8 }}>
                    <strong style={{ fontSize: 11, color: familyTint(family) }}>{familyLabel(family)}</strong>
                    <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {familyRecipes.map((recipe) => (
                        <div key={recipe.key} title={recipe.label} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", display: "grid", placeItems: "center" }}>
                          <img src={recipe.image} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {mobile && (
        <div style={{ position: "absolute", right: 9, bottom: 58, zIndex: 14, display: "flex", gap: 5 }}>
          <button type="button" onClick={spawnIngredient} disabled={!running || paused} style={{ ...panel, width: 56, height: 44, borderRadius: 12, display: "grid", placeItems: "center", color: "#9aeaff", fontSize: 7, fontWeight: 950, cursor: running && !paused ? "pointer" : "not-allowed" }}>SUPPLY</button>
          <button type="button" onClick={prepareSelected} disabled={!running || paused || selectedIndex === null} style={{ ...panel, width: 56, height: 44, borderRadius: 12, display: "grid", placeItems: "center", color: "#ffc46d", fontSize: 7, fontWeight: 950, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>PREP</button>
          <button type="button" onClick={() => selectedIndex !== null && discardItem(selectedIndex)} disabled={!running || paused || selectedIndex === null} style={{ ...panel, width: 56, height: 44, borderRadius: 12, display: "grid", placeItems: "center", color: "#ff9da8", fontSize: 7, fontWeight: 950, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>TRASH</button>
        </div>
      )}

      {dragState && mobile && board[dragState.fromIndex] && (
        <div style={{ position: "fixed", left: dragState.x, top: dragState.y, transform: "translate(-50%,-50%)", zIndex: 1000, width: 50, height: 50, borderRadius: 14, border: "1px solid rgba(255,213,104,.72)", background: "rgba(11,17,27,.95)", display: "grid", placeItems: "center", pointerEvents: "none", boxShadow: "0 12px 30px rgba(0,0,0,.4)" }}>
          <img src={board[dragState.fromIndex]?.image} alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
        </div>
      )}

      {cafeClosed && (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.9)", backdropFilter: "blur(11px)" }}>
          <div style={{ ...panel, width: "min(760px,100%)", maxHeight: "94%", overflow: "auto", borderRadius: 28, padding: mobile ? 17 : 24, border: "1px solid rgba(255,127,140,.24)" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, color: "#ff9ca7", fontSize: 8, fontWeight: 950, letterSpacing: ".16em" }}>STAGE 1 · WESTERN CAFÉ</p>
              <h3 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 31 : 42, fontWeight: 400 }}>Café Closed</h3>
              <p style={{ margin: "7px auto 0", maxWidth: 500, color: "rgba(255,255,255,.43)", fontSize: 9, lineHeight: 1.5 }}>Three customer orders were missed. Here is your final run summary and Dream Token reward.</p>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 7 }}>
              {[
                ["FINAL SCORE", score.toLocaleString()],
                ["ORDERS SERVED", String(ordersServed)],
                ["SURVIVAL TIME", `${Math.floor(runSeconds / 60)}:${String(runSeconds % 60).padStart(2, "0")}`],
                ["BEST STREAK", `×${bestOrderStreak}`],
                ["HIGHEST TIER", highestTierServed ? `Tier ${highestTierServed}` : "—"],
                ["DISHES CREATED", String(recipesMade)],
                ["COMBINES", String(successfulCombines)],
                ["INGREDIENTS DRAWN", String(ingredientsSpawned)],
              ].map(([label, value]) => (
                <div key={label} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: mobile ? 8 : 10 }}>
                  <p style={{ margin: 0, color: "rgba(255,255,255,.34)", fontSize: 6, fontWeight: 950, letterSpacing: ".1em" }}>{label}</p>
                  <strong style={{ display: "block", marginTop: 3, fontSize: mobile ? 14 : 17 }}>{value}</strong>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.15fr .85fr", gap: 8 }}>
              <div style={{ borderRadius: 16, border: "1px solid rgba(132,226,255,.12)", background: "rgba(255,255,255,.018)", padding: 11 }}>
                <p style={{ margin: 0, color: "#9feeff", fontSize: 7, fontWeight: 950, letterSpacing: ".13em" }}>ORDERS SERVED BY FAMILY</p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
                  {(["burger", "sandwich", "fries", "salad"] as const).map((family) => (
                    <div key={family} style={{ textAlign: "center", borderRadius: 11, border: `1px solid ${familyTint(family)}24`, background: `${familyTint(family)}09`, padding: 7 }}>
                      <strong style={{ display: "block", color: familyTint(family), fontSize: mobile ? 13 : 16 }}>{servedByFamily[family]}</strong>
                      <span style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.4)", fontSize: 6.5 }}>{familyLabel(family)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderRadius: 16, border: "1px solid rgba(255,214,111,.22)", background: "linear-gradient(145deg,rgba(255,196,72,.075),rgba(255,255,255,.018))", padding: 11 }}>
                <p style={{ margin: 0, color: "#ffd66f", fontSize: 7, fontWeight: 950, letterSpacing: ".13em" }}>DREAM TOKEN REWARD</p>
                <strong style={{ display: "block", marginTop: 6, color: "#ffd66f", fontSize: mobile ? 26 : 31, lineHeight: 1 }}>+{rewardState === "awarded" ? awardedDt : runDtReward} DT</strong>
                <span style={{ display: "block", marginTop: 6, color: rewardState === "failed" ? "#ff9ca7" : "rgba(255,255,255,.38)", fontSize: 7.5, lineHeight: 1.4 }}>
                  {rewardState === "awarding"
                    ? "Adding your reward…"
                    : rewardState === "awarded"
                      ? "Reward added to your Dream Token balance."
                      : rewardState === "guest"
                        ? "Log in to receive Dream Tokens from future runs."
                        : rewardState === "failed"
                          ? "Reward could not be added. Start a new run after checking your connection."
                          : "Reward is based on score, orders served, highest tier and survival time."}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
              {[
                ["Score", `+${scoreDt} DT`],
                ["Orders", `+${orderDt} DT`],
                ["Tier", `+${tierDt} DT`],
                ["Survival", `+${survivalDt} DT`],
              ].map(([label, value]) => (
                <div key={label} style={{ borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.055)", padding: 6, textAlign: "center" }}>
                  <span style={{ display: "block", color: "rgba(255,255,255,.34)", fontSize: 6 }}>{label}</span>
                  <strong style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.82)", fontSize: 8 }}>{value}</strong>
                </div>
              ))}
            </div>

            <button type="button" onClick={startKitchen} style={{ width: "100%", minHeight: 44, marginTop: 13, borderRadius: 14, border: "1px solid rgba(255,211,104,.34)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontWeight: 950, cursor: "pointer" }}>Play Again</button>
          </div>
        </div>
      )}

      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: "absolute", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.82)", backdropFilter: "blur(8px)" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ ...panel, width: "min(640px,100%)", borderRadius: 24, padding: mobile ? 18 : 24 }}>
            <p style={{ margin: 0, color: "#ffbf68", fontSize: 10, fontWeight: 950, letterSpacing: ".15em" }}>MILO’S MIX & SERVE</p>
            <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 28 : 34, fontWeight: 400 }}>How the endless café works</h3>
            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {[
                ["1", "Supply ingredients", "Use Supply + to add a random unlocked ingredient to an empty prep-counter cell."],
                ["2", "Prepare base dishes", "Select Potato or Lettuce and use Prep Selected to create Fries or Side Salad."],
                ["3", "Combine recipes", "Drag or click one item onto another. If their ingredient set matches a recipe, the result dish is created."],
                ["4", "Beat the 30-second timers", "Each customer order counts down independently. Serve the correct dish before its timer reaches zero."],
                ["5", "Protect your streak", "Consecutive successful orders build Order Streak ×1 to ×5. A timed-out order resets the streak."],
                ["6", "Survive the café", "Every timed-out order adds one failure. The Stage 1 run ends when three orders have been missed in total."],
                ["7", "Unlock more ingredients", "After 3 served orders, Cheese, Bread, Ham and Chicken unlock. After 8, Bacon and Egg unlock."],
                ["8", "Earn Dream Tokens", "When the café closes, your final score, served orders, highest dish tier and survival time determine the DT reward."],
              ].map(([num, title, body]) => (
                <div key={num} style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr)", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", border: "1px solid rgba(255,191,104,.2)", background: "rgba(255,173,66,.06)", color: "#ffc46d", fontSize: 9, fontWeight: 950 }}>{num}</div>
                  <div><strong style={{ fontSize: 12 }}>{title}</strong><p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.46)", fontSize: 10.5, lineHeight: 1.5 }}>{body}</p></div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowHelp(false)} style={{ width: "100%", minHeight: 42, marginTop: 16, borderRadius: 13, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontWeight: 900, cursor: "pointer" }}>Back to Kitchen</button>
          </div>
        </div>
      )}

      {showRecipeBook && (
        <div onClick={() => { if (!preGameMenu) setShowRecipeBook(false); }} style={{ position: "absolute", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.84)", backdropFilter: "blur(8px)" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ ...panel, width: "min(900px,100%)", maxHeight: "88%", overflow: "auto", borderRadius: 24, padding: mobile ? 16 : 22 }}>
            <p style={{ margin: 0, color: "#ffd08a", fontSize: 10, fontWeight: 950, letterSpacing: ".15em" }}>WESTERN CAFÉ MENU BOOK</p>
            <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 29 : 36, fontWeight: 400 }}>Stage 1 recipes</h3>
            {preGameMenu && <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.52)", fontSize: mobile ? 10 : 12, lineHeight: 1.45 }}>Study the recipes below first. When you are ready, start the café and the 30-second customer orders will begin immediately.</p>}
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {(["burger", "sandwich", "fries", "salad"] as const).map((family) => {
                const familyRecipes = RECIPES.filter((recipe) => recipe.family === family);
                return (
                  <div key={family} style={{ borderRadius: 18, border: `1px solid ${familyTint(family)}25`, background: "rgba(255,255,255,.018)", padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ color: familyTint(family), fontSize: 14 }}>{familyLabel(family)}</strong>
                      <span style={{ color: "rgba(255,255,255,.35)", fontSize: 10 }}>{familyRecipes.length} tiers</span>
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(5,minmax(0,1fr))", gap: 8 }}>
                      {familyRecipes.map((recipe) => (
                        <div key={recipe.key} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 8, minWidth: 0 }}>
                          <div style={{ display: "grid", placeItems: "center", minHeight: 68 }}>
                            <img src={recipe.image} alt="" style={{ width: 56, height: 56, objectFit: "contain" }} />
                          </div>
                          <strong style={{ display: "block", marginTop: 4, fontSize: 11 }}>{recipe.label}</strong>
                          <span style={{ display: "block", color: "rgba(255,255,255,.35)", fontSize: 9, marginTop: 2 }}>Tier {recipe.tier}</span>
                          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {recipe.ingredients.map((ingredientKey) => {
                              const ingredient = INGREDIENTS.find((item) => item.key === ingredientKey)!;
                              return (
                                <span key={ingredientKey} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 999, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.74)", fontSize: 8, fontWeight: 800 }}>
                                  <img src={ingredient.image} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
                                  {ingredient.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                if (preGameMenu) startKitchen();
                else setShowRecipeBook(false);
              }}
              style={{
                width: "100%",
                minHeight: 48,
                marginTop: 16,
                borderRadius: 14,
                border: preGameMenu ? "1px solid rgba(255,211,104,.38)" : "1px solid rgba(126,232,255,.2)",
                background: preGameMenu ? "linear-gradient(135deg,#ffd16a,#f5a73f)" : "rgba(83,215,255,.07)",
                color: preGameMenu ? "#221400" : "white",
                fontSize: mobile ? 11 : 13,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {preGameMenu ? "Start Game" : "Back to Kitchen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
