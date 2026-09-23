
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

type BoardCell = PrepItem | null;
type DragState = { itemId: number; fromIndex: number; x: number; y: number } | null;

type Props = {
  mobile: boolean;
  dense: boolean;
  width: number;
  height: number;
};

const BOARD_SIZE = 20;
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
    threshold: "0 recipes",
    items: INGREDIENTS.filter((item) => item.unlockAt === 0),
  },
  {
    title: "Mid Shift",
    threshold: "3 recipes",
    items: INGREDIENTS.filter((item) => item.unlockAt === 3),
  },
  {
    title: "Busy Café",
    threshold: "8 recipes",
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

function nextUnlockThreshold(recipesMade: number) {
  if (recipesMade < 3) return 3;
  if (recipesMade < 8) return 8;
  return null;
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

export default function MilosMixAndServe({ mobile, dense, width, height }: Props) {
  const compact = height < 760 || width < 1100;
  const [stage, setStage] = useState<StageId>("western");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [board, setBoard] = useState<BoardCell[]>(() => initialBoard());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showRecipeBook, setShowRecipeBook] = useState(false);
  const [status, setStatus] = useState("Phase 2 is live. Generate ingredients, prepare base dishes and combine recipes on the prep counter.");
  const [recipesMade, setRecipesMade] = useState(0);
  const [successfulCombines, setSuccessfulCombines] = useState(0);
  const [ingredientsSpawned, setIngredientsSpawned] = useState(0);
  const nextId = useRef(1000);

  useEffect(() => {
    if (!running) setPaused(false);
  }, [running]);

  const occupied = useMemo(() => board.filter(Boolean).length, [board]);
  const unlockedIngredients = useMemo(
    () => INGREDIENTS.filter((item) => recipesMade >= item.unlockAt),
    [recipesMade],
  );
  const highestTierMade = useMemo(() => {
    let highest = 0;
    board.forEach((item) => {
      if (item?.tier && item.tier > highest) highest = item.tier;
    });
    return highest;
  }, [board]);
  const unlockTarget = nextUnlockThreshold(recipesMade);

  function resetSandbox() {
    setBoard(initialBoard());
    nextId.current = 1000;
    setSelectedIndex(null);
    setDragState(null);
    setRecipesMade(0);
    setSuccessfulCombines(0);
    setIngredientsSpawned(0);
    setStatus("Phase 2 is live. Generate ingredients, prepare base dishes and combine recipes on the prep counter.");
  }

  function startKitchen() {
    resetSandbox();
    setRunning(true);
    setPaused(false);
  }

  function emptyCellIndex(cells: BoardCell[]) {
    return cells.findIndex((entry) => entry === null);
  }

  function addStatus(message: string) {
    setStatus(message);
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

  function prepareSelected() {
    if (!running || paused || selectedIndex === null) return;
    setBoard((current) => {
      const item = current[selectedIndex];
      if (!item) return current;
      const recipe = findSinglePrep(item);
      if (!recipe) {
        addStatus(`${item.label} cannot be plated on its own. Try combining it with another ingredient.`);
        return current;
      }
      const next = [...current];
      next[selectedIndex] = createDish(++nextId.current, recipe);
      setRecipesMade((count) => count + 1);
      setSuccessfulCombines((count) => count + 1);
      addStatus(`${recipe.label} prepared.`);
      return next;
    });
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
    const cell = target?.closest("[data-prep-cell]") as HTMLElement | null;
    if (cell?.dataset.prepCell !== undefined) return { type: "cell" as const, index: Number(cell.dataset.prepCell) };
    if (target?.closest('[data-prep-zone="discard"]')) return { type: "discard" as const };
    if (target?.closest('[data-prep-zone="prep"]')) return { type: "prep" as const };
    return null;
  }

  function endPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragState) return;
    const target = resolveDropTarget(document.elementFromPoint(event.clientX, event.clientY));
    if (target?.type === "cell") moveOrCombine(dragState.fromIndex, target.index);
    else if (target?.type === "discard") discardItem(dragState.fromIndex);
    else if (target?.type === "prep") {
      setSelectedIndex(dragState.fromIndex);
      setTimeout(() => prepareSelected(), 0);
    }
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
    if (Number.isFinite(fromIndex)) {
      setSelectedIndex(fromIndex);
      setTimeout(() => prepareSelected(), 0);
    }
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
        gridTemplateRows: "auto auto auto minmax(0,1fr) auto",
        gap: mobile ? 6 : 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#ffbf68", fontSize: mobile ? 7 : 8, fontWeight: 950, letterSpacing: ".16em", textTransform: "uppercase" }}>Milo’s Western Café · Stage 1</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ margin: "3px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 25 : compact ? 29 : 34, lineHeight: 1, fontWeight: 400 }}>Milo’s Mix & Serve</h2>
            {!mobile && <span style={{ color: "rgba(255,255,255,.3)", fontSize: 8, fontWeight: 900 }}>PHASE 2 · RECIPE SANDBOX</span>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" onClick={() => setStage("stage2")} style={{ minHeight: mobile ? 32 : 36, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(255,210,102,.18)", background: "rgba(255,190,65,.055)", color: "#ffd66f", fontSize: mobile ? 8 : 9, fontWeight: 900, cursor: "pointer" }}>
            Stage 2 · Soon
          </button>
          <button type="button" onClick={() => setShowRecipeBook(true)} style={{ minHeight: mobile ? 32 : 36, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(255,191,104,.2)", background: "rgba(255,173,66,.06)", color: "#ffd08a", fontSize: mobile ? 8 : 9, fontWeight: 900, cursor: "pointer" }}>
            Menu Book
          </button>
          <button type="button" onClick={() => setShowHelp(true)} style={{ minHeight: mobile ? 32 : 36, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(128,226,255,.2)", background: "rgba(83,215,255,.06)", color: "#dffaff", fontSize: mobile ? 8 : 9, fontWeight: 900, cursor: "pointer" }}>
            ? How to Play
          </button>
          <button type="button" onClick={() => running && setPaused((value) => !value)} disabled={!running} aria-label={paused ? "Resume kitchen" : "Pause kitchen"} style={{ width: mobile ? 32 : 36, height: mobile ? 32 : 36, borderRadius: 999, border: "1px solid rgba(128,226,255,.18)", background: "rgba(83,215,255,.06)", color: running ? "white" : "rgba(255,255,255,.3)", cursor: running ? "pointer" : "not-allowed" }}>
            {paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 6 }}>
        {[
          ["RECIPES MADE", String(recipesMade), "Successful dish creations"],
          ["COMBINES", String(successfulCombines), "Prep + merge actions"],
          ["UNLOCKED", `${unlockedIngredients.length} / 11`, unlockTarget ? `Next unlock at ${unlockTarget} recipes` : "All Stage 1 ingredients unlocked"],
          ["HIGHEST TIER", highestTierMade ? `T${highestTierMade}` : "—", "Best dish currently on board"],
        ].map(([label, value, sub]) => (
          <div key={label} style={{ ...panel, borderRadius: 13, padding: mobile ? "7px 9px" : "8px 10px", minWidth: 0 }}>
            <p style={{ margin: 0, color: "rgba(166,235,255,.46)", fontSize: 6, fontWeight: 950, letterSpacing: ".12em" }}>{label}</p>
            <div style={{ marginTop: 2, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
              <strong style={{ fontSize: mobile ? 15 : 18, lineHeight: 1, color: label === "UNLOCKED" ? "#ffd66f" : "white" }}>{value}</strong>
              {!mobile && !compact && <span style={{ color: "rgba(255,255,255,.25)", fontSize: 7, whiteSpace: "nowrap" }}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...panel, borderRadius: 14, padding: mobile ? 7 : 8, display: "grid", gridTemplateColumns: mobile ? "1fr" : "minmax(0,1fr) auto", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: mobile ? 8 : 9 }}>{running ? paused ? "Kitchen paused" : "Kitchen open" : "Ready to open the kitchen"}</strong>
          <span style={{ display: "block", marginTop: 2, color: "rgba(255,255,255,.34)", fontSize: mobile ? 6 : 7, lineHeight: 1.35 }}>{status}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: mobile ? "stretch" : "flex-end" }}>
          <button type="button" onClick={spawnIngredient} disabled={!running || paused} style={{ minHeight: 36, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.08)", color: "white", fontWeight: 900, cursor: running && !paused ? "pointer" : "not-allowed" }}>Supply +</button>
          <button type="button" onClick={prepareSelected} disabled={!running || paused || selectedIndex === null} style={{ minHeight: 36, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,196,100,.2)", background: "rgba(255,173,66,.08)", color: "white", fontWeight: 900, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>Prep Selected</button>
          <button type="button" onClick={() => selectedIndex !== null && discardItem(selectedIndex)} disabled={!running || paused || selectedIndex === null} style={{ minHeight: 36, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,129,143,.18)", background: "rgba(255,100,120,.06)", color: "white", fontWeight: 900, cursor: running && !paused && selectedIndex !== null ? "pointer" : "not-allowed" }}>Discard</button>
          <button type="button" onClick={startKitchen} style={{ minHeight: 36, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,211,104,.34)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#221400", fontWeight: 950, cursor: "pointer" }}>{running ? "Reset Kitchen" : "Start Kitchen"}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.1fr minmax(280px, .9fr)", gap: 7, minHeight: 0 }}>
        <div style={{ ...panel, minHeight: 0, borderRadius: 16, padding: mobile ? 7 : 9, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div>
              <p style={{ margin: 0, color: "#9feeff", fontSize: 7, fontWeight: 950, letterSpacing: ".14em" }}>PREP COUNTER</p>
              {!mobile && <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.3)", fontSize: 7 }}>Click or drag items into empty cells to move them. Drop one ingredient or dish onto another to create a valid recipe.</p>}
            </div>
            <span style={{ color: "rgba(255,255,255,.34)", fontSize: 7, fontWeight: 850 }}>{occupied} / {BOARD_SIZE} spaces</span>
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
                    minHeight: mobile ? 54 : compact ? 58 : 70,
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
                    <div style={{ textAlign: "center", minWidth: 0, width: "100%" }}>
                      <img src={item.image} alt="" draggable={false} style={{ width: mobile ? 34 : 40, height: mobile ? 34 : 40, objectFit: "contain", display: "block", margin: "0 auto" }} />
                      {!mobile && !compact && (
                        <>
                          <span style={{ display: "block", marginTop: 3, color: "white", fontSize: 7.2, fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.label}</span>
                          <span style={{ display: "block", marginTop: 1, color: item.type === "dish" ? familyTint(item.family) : "rgba(255,255,255,.32)", fontSize: 6.3, fontWeight: 850 }}>
                            {item.type === "dish" ? `${familyLabel(item.family!)} · Tier ${item.tier}` : "Ingredient"}
                          </span>
                        </>
                      )}
                    </div>
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
            <p style={{ margin: 0, color: "#ffd08a", fontSize: 7, fontWeight: 950, letterSpacing: ".14em" }}>UNLOCK PROGRESSION</p>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {UNLOCK_GROUPS.map(({ title, threshold, items }) => {
                const unlocked = items.every((item) => recipesMade >= item.unlockAt);
                return (
                  <div key={title} style={{ borderRadius: 12, border: unlocked ? "1px solid rgba(132,239,178,.2)" : "1px solid rgba(255,255,255,.06)", background: unlocked ? "rgba(132,239,178,.04)" : "rgba(255,255,255,.015)", padding: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                      <strong style={{ fontSize: 9 }}>{title}</strong>
                      <span style={{ color: unlocked ? "#84efb2" : "rgba(255,255,255,.34)", fontSize: 7, fontWeight: 900 }}>{unlocked ? "UNLOCKED" : threshold}</span>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {items.map((item) => (
                        <div key={item.key} title={item.label} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: recipesMade >= item.unlockAt ? "rgba(83,215,255,.06)" : "rgba(255,255,255,.02)", display: "grid", placeItems: "center", opacity: recipesMade >= item.unlockAt ? 1 : 0.38 }}>
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
                <strong style={{ display: "block", marginTop: 7, fontSize: 10 }}>Prep Station</strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.32)", fontSize: 7, lineHeight: 1.35 }}>Use for base one-ingredient dishes like Fries and Side Salad.</p>
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
                <strong style={{ display: "block", marginTop: 7, fontSize: 10 }}>Discard Tray</strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.32)", fontSize: 7, lineHeight: 1.35 }}>Drag unwanted items here to clear board space.</p>
              </div>
            </div>
          </div>

          <div style={{ ...panel, borderRadius: 16, padding: 10, minHeight: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, color: "#9feeff", fontSize: 7, fontWeight: 950, letterSpacing: ".14em" }}>RECIPE FAMILIES</p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.3)", fontSize: 7 }}>All 20 Western Café dish assets are wired into the recipe engine.</p>
              </div>
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
              {(["burger", "sandwich", "fries", "salad"] as const).map((family) => {
                const familyRecipes = RECIPES.filter((recipe) => recipe.family === family);
                return (
                  <div key={family} style={{ borderRadius: 12, border: `1px solid ${familyTint(family)}2a`, background: "rgba(255,255,255,.018)", padding: 8 }}>
                    <strong style={{ fontSize: 9, color: familyTint(family) }}>{familyLabel(family)}</strong>
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

      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: "absolute", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.82)", backdropFilter: "blur(8px)" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ ...panel, width: "min(640px,100%)", borderRadius: 24, padding: mobile ? 18 : 24 }}>
            <p style={{ margin: 0, color: "#ffbf68", fontSize: 8, fontWeight: 950, letterSpacing: ".15em" }}>MILO’S MIX & SERVE</p>
            <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 28 : 34, fontWeight: 400 }}>How Phase 2 works</h3>
            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {[
                ["1", "Supply ingredients", "Use Supply + to add a random unlocked ingredient to an empty prep-counter cell."],
                ["2", "Prepare base dishes", "Select Potato or Lettuce and use Prep Selected to create Fries or Side Salad."],
                ["3", "Combine recipes", "Drag or click one item onto another. If their ingredient set matches a recipe, the result dish is created."],
                ["4", "Unlock more ingredients", "After 3 successful recipes, Cheese, Bread, Ham and Chicken unlock. After 8, Bacon and Egg unlock."],
              ].map(([num, title, body]) => (
                <div key={num} style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr)", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", border: "1px solid rgba(255,191,104,.2)", background: "rgba(255,173,66,.06)", color: "#ffc46d", fontSize: 9, fontWeight: 950 }}>{num}</div>
                  <div><strong style={{ fontSize: 10 }}>{title}</strong><p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.42)", fontSize: 9, lineHeight: 1.45 }}>{body}</p></div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowHelp(false)} style={{ width: "100%", minHeight: 42, marginTop: 16, borderRadius: 13, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontWeight: 900, cursor: "pointer" }}>Back to Kitchen</button>
          </div>
        </div>
      )}

      {showRecipeBook && (
        <div onClick={() => setShowRecipeBook(false)} style={{ position: "absolute", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 14, background: "rgba(1,6,14,.84)", backdropFilter: "blur(8px)" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ ...panel, width: "min(900px,100%)", maxHeight: "88%", overflow: "auto", borderRadius: 24, padding: mobile ? 16 : 22 }}>
            <p style={{ margin: 0, color: "#ffd08a", fontSize: 8, fontWeight: 950, letterSpacing: ".15em" }}>WESTERN CAFÉ MENU BOOK</p>
            <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 26 : 32, fontWeight: 400 }}>Stage 1 recipes</h3>
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {(["burger", "sandwich", "fries", "salad"] as const).map((family) => {
                const familyRecipes = RECIPES.filter((recipe) => recipe.family === family);
                return (
                  <div key={family} style={{ borderRadius: 18, border: `1px solid ${familyTint(family)}25`, background: "rgba(255,255,255,.018)", padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ color: familyTint(family), fontSize: 12 }}>{familyLabel(family)}</strong>
                      <span style={{ color: "rgba(255,255,255,.35)", fontSize: 8 }}>{familyRecipes.length} tiers</span>
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(5,minmax(0,1fr))", gap: 8 }}>
                      {familyRecipes.map((recipe) => (
                        <div key={recipe.key} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 8, minWidth: 0 }}>
                          <div style={{ display: "grid", placeItems: "center", minHeight: 68 }}>
                            <img src={recipe.image} alt="" style={{ width: 56, height: 56, objectFit: "contain" }} />
                          </div>
                          <strong style={{ display: "block", marginTop: 4, fontSize: 9 }}>{recipe.label}</strong>
                          <span style={{ display: "block", color: "rgba(255,255,255,.35)", fontSize: 7, marginTop: 2 }}>Tier {recipe.tier}</span>
                          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {recipe.ingredients.map((ingredientKey) => {
                              const ingredient = INGREDIENTS.find((item) => item.key === ingredientKey)!;
                              return (
                                <span key={ingredientKey} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 999, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.74)", fontSize: 6.5, fontWeight: 800 }}>
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
            <button type="button" onClick={() => setShowRecipeBook(false)} style={{ width: "100%", minHeight: 42, marginTop: 16, borderRadius: 13, border: "1px solid rgba(126,232,255,.2)", background: "rgba(83,215,255,.07)", color: "white", fontWeight: 900, cursor: "pointer" }}>Back to Kitchen</button>
          </div>
        </div>
      )}
    </div>
  );
}
