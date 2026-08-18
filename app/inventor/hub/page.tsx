"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WardrobeFittedLayer from "@/components/nova-home/WardrobeFittedLayer";
import RugRushGame, { type RugRushCompletion } from "@/components/nova-home/RugRushGame";
import { MILO_WARDROBE_RIG, NOVA_WARDROBE_RIG } from "@/lib/novaHome/wardrobeRig";
import { createWardrobeSnapshotPng, downloadBlob } from "@/lib/novaHome/wardrobeSnapshot";

type AreaKey = "area-1" | "area-2";

type ZoneKey =
  | "bed-zone"
  | "desk-zone"
  | "display-zone"
  | "extra-zone"
  | "door-zone";

type ZoneVisual = {
  key: ZoneKey;
  fallbackTitle: string;
  fallbackSubtitle: string;
  fallbackCost: number;
  maskImage: string;
  accent: string;
  isAreaExit?: boolean;
};

type ZoneCatalogRow = {
  zone_key: string;
  title: string;
  subtitle: string | null;
  dt_cost: number;
  sort_order: number;
};

type ZoneUnlockRow = {
  zone_key: string;
};

type PurchaseResult = {
  zone_key: string;
  cost_paid: number;
  new_balance: number;
  already_owned: boolean;
};

type WardrobeCharacter = "nova" | "milo";
type WardrobeCategory = "outfit" | "top" | "bottom" | "shoes" | "accessory";
type WardrobeAccessorySlot = "head" | "face" | "ears" | "wrist" | "companion" | "effect" | null;
type WardrobeEquipSlot = "outfit" | "top" | "bottom" | "shoes" | "head" | "face" | "ears" | "wrist" | "companion" | "effect";

type CharacterCatalogRow = {
  character_key: WardrobeCharacter;
  title: string;
  description: string | null;
  dt_cost: number;
  is_starter: boolean;
};

type CharacterUnlockRow = {
  character_key: WardrobeCharacter;
};

type CharacterPurchaseResult = {
  character_key: WardrobeCharacter;
  cost_paid: number;
  new_balance: number;
  already_owned: boolean;
};

type WardrobeCatalogRow = {
  item_key: string;
  character_key: WardrobeCharacter;
  category: WardrobeCategory;
  title: string;
  description: string | null;
  dt_cost: number;
  is_starter: boolean;
  thumbnail_image: string | null;
  layer_image: string | null;
  accent_hex: string;
  layer_order: number;
  sort_order: number;
  fit_mode: "auto" | "manual";
  fit_scale: number;
  fit_scale_x: number;
  fit_scale_y: number;
  fit_offset_x_pct: number;
  fit_offset_y_pct: number;
  fit_rotation_deg: number;
  fit_skew_x_deg: number;
  fit_skew_y_deg: number;
  fit_stretch_mode: "contain" | "stretch";
  accessory_slot: WardrobeAccessorySlot;
};

type WardrobeUserAccessoryFitRow = {
  item_key: string;
  scale: number;
  offset_x_pct: number;
  offset_y_pct: number;
};

type WardrobeUserPlacementDraft = {
  scale: number;
  offset_x_pct: number;
  offset_y_pct: number;
};

type WardrobeOwnershipRow = {
  item_key: string;
};

type WardrobeEquippedRow = {
  character_key: WardrobeCharacter;
  category: WardrobeCategory;
  equip_slot: WardrobeEquipSlot;
  item_key: string;
};

type WardrobePurchaseResult = {
  item_key: string;
  cost_paid: number;
  new_balance: number;
  already_owned: boolean;
};

type WardrobeEquipResult = {
  item_key: string;
  character_key: WardrobeCharacter;
  category: WardrobeCategory;
  equip_slot: WardrobeEquipSlot;
};

type ZoneView = ZoneVisual & {
  title: string;
  subtitle: string;
  dtCost: number;
};

type MaskPixels = {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
};

type NovaHomeGuideStep = {
  eyebrow: string;
  title: string;
  text: string;
  targetZoneKey?: ZoneKey;
};

const NOVA_HOME_GUIDE_STORAGE_KEY = "nova-home-guide-completed-v1";

const NOVA_HOME_GUIDE_STEPS: NovaHomeGuideStep[] = [
  {
    eyebrow: "Welcome Home",
    title: "This is Nova’s Home.",
    text: "This is your play-and-customise space. Spend Dream Tokens on room upgrades, outfits, accessories, and other fun additions as Nova’s Home grows.",
  },
  {
    eyebrow: "Room Upgrades",
    title: "Turn the dark zones into your room.",
    text: "Darkened furnishings are still locked. Hover or tap a room zone to see its DT price, then unlock it when you are ready. The dark overlay disappears after purchase.",
  },
  {
    eyebrow: "Sleep Zone",
    title: "Your character wardrobe lives here.",
    text: "Unlock the Sleep Zone to enter Wardrobe Bay. This is where you can change Nova’s full outfit and customise her accessories.",
    targetZoneKey: "bed-zone",
  },
  {
    eyebrow: "Nova & Milo",
    title: "Build a look that feels like yours.",
    text: "Wardrobe Bay lets you customise Nova, or unlock Milo for 1,000 DT. Choose a full outfit, equip accessories, then drag and scale accessories until they sit where you want them.",
    targetZoneKey: "bed-zone",
  },
  {
    eyebrow: "Save Your Character",
    title: "Keep the look you created.",
    text: "Inside Wardrobe Bay, use Save Look to keep your current setup. You can also Download PNG to export your customised Nova or Milo with a transparent background.",
    targetZoneKey: "bed-zone",
  },
  {
    eyebrow: "Spend at Your Pace",
    title: "The rest of Area 1 is yours to build.",
    text: "Unlock the Workstation, Display Shelf, and Comfort & Decor whenever you want. Comfort & Decor also opens Rug Rush, a quick 10-second cleaning challenge on Nova’s rug.",
    targetZoneKey: "desk-zone",
  },
  {
    eyebrow: "Future Expansion",
    title: "Area 2 is coming soon.",
    text: "The connected doorway stays visible so you can see where Nova’s Home will grow next. Area 2 is not for sale yet, so you do not need to save DT for the door.",
    targetZoneKey: "door-zone",
  },
  {
    eyebrow: "You’re Ready",
    title: "Make Nova’s Home your own.",
    text: "Start with any Area 1 upgrade you like. Tap Nova Guide again whenever you want a quick reminder of how the home works.",
  },
];

const AREA_1_IMAGE = "/activities/nova-home/area-1/area-1-furnished.png";
const AREA_2_PLACEHOLDER_IMAGE = "/activities/nova-home/area-2-placeholder.png";

const RUG_RUSH_SPARKLES = [
  { left: 31, top: 63, size: 14, delay: 0 },
  { left: 39, top: 72, size: 10, delay: 120 },
  { left: 47, top: 61, size: 12, delay: 240 },
  { left: 54, top: 76, size: 15, delay: 360 },
  { left: 61, top: 66, size: 9, delay: 480 },
  { left: 44, top: 81, size: 11, delay: 600 },
  { left: 57, top: 84, size: 8, delay: 720 },
  { left: 35, top: 79, size: 9, delay: 840 },
] as const;

const ZONE_VISUALS: ZoneVisual[] = [
  {
    key: "bed-zone",
    fallbackTitle: "Sleep Zone",
    fallbackSubtitle: "Unlock Nova's bed and rest corner.",
    fallbackCost: 200,
    maskImage: "/activities/nova-home/area-1/zone-bed-locked.png",
    accent: "#6ee7ff",
  },
  {
    key: "desk-zone",
    fallbackTitle: "Workstation",
    fallbackSubtitle: "Unlock Nova's desk, chair, and main computer.",
    fallbackCost: 300,
    maskImage: "/activities/nova-home/area-1/zone-desk-locked.png",
    accent: "#7dd3fc",
  },
  {
    key: "display-zone",
    fallbackTitle: "Display Shelf",
    fallbackSubtitle: "Unlock books, models, trophies, and collectibles.",
    fallbackCost: 150,
    maskImage: "/activities/nova-home/area-1/zone-display-locked.png",
    accent: "#a5b4fc",
  },
  {
    key: "extra-zone",
    fallbackTitle: "Comfort & Decor",
    fallbackSubtitle:
      "Unlock the rug, wall art, plant, speaker, and extra room details.",
    fallbackCost: 100,
    maskImage: "/activities/nova-home/area-1/zone-extra-locked.png",
    accent: "#c4b5fd",
  },
  {
    key: "door-zone",
    fallbackTitle: "Area 2",
    fallbackSubtitle:
      "A new connected expansion of Nova's Home is coming soon.",
    fallbackCost: 0,
    maskImage: "/activities/nova-home/area-1/zone-door-locked.png",
    accent: "#fbbf24",
    isAreaExit: true,
  },
];

// Put the doorway first because it sits close to the right-side decor mask.
const HIT_TEST_ORDER: ZoneKey[] = [
  "door-zone",
  "display-zone",
  "desk-zone",
  "bed-zone",
  "extra-zone",
];

const ROOM_ZONE_KEYS: ZoneKey[] = [
  "bed-zone",
  "desk-zone",
  "display-zone",
  "extra-zone",
];

const NOVA_CHARACTER_IMAGE = "/activities/nova-home/wardrobe/nova/nova-outfit-classic.png";

const WARDROBE_CATEGORIES: {
  key: WardrobeCategory;
  label: string;
  shortLabel: string;
  icon: string;
}[] = [
  { key: "outfit", label: "Outfits", shortLabel: "Outfit", icon: "✦" },
  { key: "accessory", label: "Accessories", shortLabel: "Accessory", icon: "◇" },
];

const WARDROBE_COLLECTION_LABELS: Record<string, string> = {
  "nova-accessory-star-hair-clip": "Accessory Set",
  "nova-accessory-sky-shades": "Accessory Set",
  "nova-accessory-visor": "Accessory Set",
  "nova-accessory-starlink-headset": "Accessory Set",
  "nova-accessory-crystal-tiara": "Premium Accessory",
  "nova-accessory-moonlight-earrings": "Accessory Set",
  "nova-accessory-wrist-band": "Accessory Set",
  "nova-accessory-explorer-smartwatch": "Accessory Set",
  "nova-accessory-mini-star-bot": "Companion",
  "nova-accessory-cosmic-aura": "Premium Effect",
  "nova-classic": "Core Set",
  "nova-home-explorer": "Core Set",
  "nova-cosmic-explorer": "Premium Set",
  "nova-weekend-denim": "Everyday Set",
  "nova-cozy-home-set": "Everyday Set",
  "nova-art-club-overalls": "Everyday Set",
  "nova-garden-day-dress": "Everyday Set",
  "nova-sports-day": "Everyday Set",
  "nova-star-party-dress": "Premium Set",
  "nova-moonlight-gala": "Premium Set",
  "milo-classic": "Core Set",
  "milo-home-explorer": "Core Set",
  "milo-skyline-streetwear": "Everyday Set",
  "milo-trail-scout": "Explorer Set",
  "milo-game-night-set": "Everyday Set",
  "milo-creative-workshop": "Workshop Set",
  "milo-sports-sprint": "Everyday Set",
  "milo-night-gala": "Premium Set",
};

function getWardrobeCollectionLabel(itemKey: string) {
  return WARDROBE_COLLECTION_LABELS[itemKey] ?? "Core Set";
}

const WARDROBE_ACCESSORY_SLOT_LABELS: Record<Exclude<WardrobeAccessorySlot, null>, string> = {
  head: "Head",
  face: "Face",
  ears: "Ears",
  wrist: "Wrist",
  companion: "Companion",
  effect: "Effect",
};

function getAccessorySlotLabel(slot: WardrobeAccessorySlot) {
  if (!slot) return "Accessory";
  return WARDROBE_ACCESSORY_SLOT_LABELS[slot] ?? "Accessory";
}

function getWardrobeEquipSlotForItem(item: Pick<WardrobeCatalogRow, "category" | "accessory_slot">): WardrobeEquipSlot {
  if (item.category === "accessory") {
    return (item.accessory_slot ?? "head") as WardrobeEquipSlot;
  }
  return item.category as WardrobeEquipSlot;
}

function formatDT(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

function getPurchaseResult(data: unknown): PurchaseResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const result = row as Record<string, unknown>;
  const zoneKey = String(result.zone_key || "");
  const costPaid = Number(result.cost_paid);
  const newBalance = Number(result.new_balance);
  const alreadyOwned = Boolean(result.already_owned);

  if (!zoneKey || !Number.isFinite(costPaid) || !Number.isFinite(newBalance)) {
    return null;
  }

  return {
    zone_key: zoneKey,
    cost_paid: costPaid,
    new_balance: newBalance,
    already_owned: alreadyOwned,
  };
}

function getCharacterPurchaseResult(data: unknown): CharacterPurchaseResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const result = row as Record<string, unknown>;
  const characterKey = String(result.character_key || "") as WardrobeCharacter;
  const costPaid = Number(result.cost_paid);
  const newBalance = Number(result.new_balance);
  const alreadyOwned = Boolean(result.already_owned);

  if (
    (characterKey !== "nova" && characterKey !== "milo") ||
    !Number.isFinite(costPaid) ||
    !Number.isFinite(newBalance)
  ) {
    return null;
  }

  return {
    character_key: characterKey,
    cost_paid: costPaid,
    new_balance: newBalance,
    already_owned: alreadyOwned,
  };
}

function getWardrobePurchaseResult(data: unknown): WardrobePurchaseResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const result = row as Record<string, unknown>;
  const itemKey = String(result.item_key || "");
  const costPaid = Number(result.cost_paid);
  const newBalance = Number(result.new_balance);
  const alreadyOwned = Boolean(result.already_owned);

  if (!itemKey || !Number.isFinite(costPaid) || !Number.isFinite(newBalance)) {
    return null;
  }

  return {
    item_key: itemKey,
    cost_paid: costPaid,
    new_balance: newBalance,
    already_owned: alreadyOwned,
  };
}

function getWardrobeEquipResult(data: unknown): WardrobeEquipResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const result = row as Record<string, unknown>;
  const itemKey = String(result.item_key || "");
  const characterKey = String(result.character_key || "");
  const category = String(result.category || "");
  const equipSlot = String(result.equip_slot || "");

  if (
    !itemKey ||
    (characterKey !== "nova" && characterKey !== "milo") ||
    !["outfit", "top", "bottom", "shoes", "accessory"].includes(category)
  ) {
    return null;
  }

  const normalisedEquipSlot = (["outfit", "top", "bottom", "shoes", "head", "face", "ears", "wrist", "companion", "effect"].includes(equipSlot)
    ? equipSlot
    : category === "accessory"
      ? "head"
      : category) as WardrobeEquipSlot;

  return {
    item_key: itemKey,
    character_key: characterKey,
    category: category as WardrobeCategory,
    equip_slot: normalisedEquipSlot,
  };
}

export default function NovaHomePage() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const roomViewportRef = useRef<HTMLDivElement | null>(null);
  const maskPixelsRef = useRef<Map<ZoneKey, MaskPixels>>(new Map());
  const rugRushSparkleTimerRef = useRef<number | null>(null);

  const [currentArea, setCurrentArea] = useState<AreaKey>("area-1");
  const [area2ImageFailed, setArea2ImageFailed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [maskLoading, setMaskLoading] = useState(true);
  const [catalogRows, setCatalogRows] = useState<ZoneCatalogRow[]>([]);
  const [unlockedZones, setUnlockedZones] = useState<Set<ZoneKey>>(
    () => new Set(),
  );
  const [hoveredZoneKey, setHoveredZoneKey] = useState<ZoneKey | null>(null);
  const [selectedZoneKey, setSelectedZoneKey] = useState<ZoneKey | null>(null);
  const [purchasingZoneKey, setPurchasingZoneKey] = useState<ZoneKey | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [setupError, setSetupError] = useState("");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [wardrobeLoading, setWardrobeLoading] = useState(false);
  const [wardrobeSetupError, setWardrobeSetupError] = useState("");
  const [wardrobeCatalog, setWardrobeCatalog] = useState<WardrobeCatalogRow[]>([]);
  const [wardrobeOwned, setWardrobeOwned] = useState<Set<string>>(() => new Set());
  const [wardrobeEquipped, setWardrobeEquipped] = useState<WardrobeEquippedRow[]>([]);
  const [wardrobeCategory, setWardrobeCategory] = useState<WardrobeCategory>("outfit");
  const [wardrobeSelectedItemKey, setWardrobeSelectedItemKey] = useState<string | null>(null);
  const [wardrobePurchasingItemKey, setWardrobePurchasingItemKey] = useState<string | null>(null);
  const [wardrobeEquippingItemKey, setWardrobeEquippingItemKey] = useState<string | null>(null);
  const [wardrobeSavingPlacementItemKey, setWardrobeSavingPlacementItemKey] = useState<string | null>(null);
  const [wardrobeUserAccessoryFits, setWardrobeUserAccessoryFits] = useState<Record<string, WardrobeUserAccessoryFitRow>>({});
  const [wardrobeMessage, setWardrobeMessage] = useState("");
  const [wardrobeCharacter, setWardrobeCharacter] = useState<WardrobeCharacter>("nova");
  const [characterCatalog, setCharacterCatalog] = useState<CharacterCatalogRow[]>([]);
  const [unlockedCharacters, setUnlockedCharacters] = useState<Set<WardrobeCharacter>>(() => new Set(["nova"]));
  const [purchasingCharacter, setPurchasingCharacter] = useState<WardrobeCharacter | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [rugRushOpen, setRugRushOpen] = useState(false);
  const [rugRushLastResult, setRugRushLastResult] = useState<RugRushCompletion | null>(null);
  const [rugRushSparkle, setRugRushSparkle] = useState(false);

  const zones = useMemo<ZoneView[]>(() => {
    const catalog = new Map<string, ZoneCatalogRow>(
      catalogRows.map((row) => [row.zone_key, row]),
    );

    return ZONE_VISUALS.map((visual) => {
      const row = catalog.get(visual.key);

      return {
        ...visual,
        title: visual.isAreaExit ? visual.fallbackTitle : row?.title || visual.fallbackTitle,
        subtitle: visual.isAreaExit ? visual.fallbackSubtitle : row?.subtitle || visual.fallbackSubtitle,
        dtCost: visual.isAreaExit ? 0 : Number(row?.dt_cost ?? visual.fallbackCost),
      };
    });
  }, [catalogRows]);

  const zoneMap = useMemo<Map<ZoneKey, ZoneView>>(
    () => new Map<ZoneKey, ZoneView>(zones.map((zone) => [zone.key, zone])),
    [zones],
  );

  const activeZoneKey = selectedZoneKey ?? hoveredZoneKey;
  const activeZone = activeZoneKey ? zoneMap.get(activeZoneKey) ?? null : null;
  const roomUnlockedCount = ROOM_ZONE_KEYS.filter((key) =>
    unlockedZones.has(key),
  ).length;
  const area2Unlocked = false;
  const guideTargetZoneKey = guideOpen
    ? NOVA_HOME_GUIDE_STEPS[guideStep]?.targetZoneKey ?? null
    : null;

  useEffect(() => {
    if (!authChecked || wardrobeOpen || rugRushOpen) return;

    try {
      const completed = window.localStorage.getItem(NOVA_HOME_GUIDE_STORAGE_KEY);
      if (!completed) {
        setGuideStep(0);
        setGuideOpen(true);
      }
    } catch {
      setGuideStep(0);
      setGuideOpen(true);
    }
  }, [authChecked, wardrobeOpen, rugRushOpen]);

  useEffect(() => {
    return () => {
      if (rugRushSparkleTimerRef.current !== null) {
        window.clearTimeout(rugRushSparkleTimerRef.current);
      }
    };
  }, []);

  function startNovaHomeGuide() {
    setCurrentArea("area-1");
    setSelectedZoneKey(null);
    setHoveredZoneKey(null);
    setMessage("");
    setGuideStep(0);
    setGuideOpen(true);
  }

  function closeNovaHomeGuide() {
    try {
      window.localStorage.setItem(NOVA_HOME_GUIDE_STORAGE_KEY, "true");
    } catch {
      // The guide still closes when local storage is unavailable.
    }

    setGuideOpen(false);
  }

  function openRugRush() {
    if (!unlockedZones.has("extra-zone")) return;
    if (rugRushSparkleTimerRef.current !== null) {
      window.clearTimeout(rugRushSparkleTimerRef.current);
      rugRushSparkleTimerRef.current = null;
    }
    setRugRushSparkle(false);
    setRugRushLastResult(null);
    setGuideOpen(false);
    setSelectedZoneKey("extra-zone");
    setHoveredZoneKey("extra-zone");
    setMessage("");
    setRugRushOpen(true);
  }

  function handleRugRushComplete(result: RugRushCompletion) {
    setRugRushLastResult(result);
  }

  function closeRugRush() {
    setRugRushOpen(false);
    setHoveredZoneKey(null);

    if (rugRushLastResult && rugRushLastResult.cleanPercent >= 80) {
      setSelectedZoneKey("extra-zone");
      setRugRushSparkle(true);
      if (rugRushSparkleTimerRef.current !== null) {
        window.clearTimeout(rugRushSparkleTimerRef.current);
      }
      rugRushSparkleTimerRef.current = window.setTimeout(() => {
        setRugRushSparkle(false);
        setSelectedZoneKey((current) => (current === "extra-zone" ? null : current));
        rugRushSparkleTimerRef.current = null;
      }, rugRushLastResult.perfect ? 6500 : 4500);
    }
  }

  const loadNovaHome = useCallback(async () => {
    setBalanceLoading(true);
    setCatalogLoading(true);
    setSetupError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAuthChecked(true);
      setBalanceLoading(false);
      setCatalogLoading(false);
      router.replace("/login");
      return;
    }

    const [balanceResult, catalogResult, unlockResult] =
      await Promise.all([
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),
        supabase
          .from("nova_home_zone_catalog")
          .select("zone_key,title,subtitle,dt_cost,sort_order")
          .eq("area_key", "area-1")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("nova_home_zone_unlocks")
          .select("zone_key")
          .eq("user_id", user.id),
      ]);

    setAuthChecked(true);

    if (balanceResult.error) {
      console.warn(
        "Could not load Dream Token balance:",
        balanceResult.error.message,
      );
      setDreamTokenBalance(0);
    } else {
      const total = (balanceResult.data || []).reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0,
      );
      setDreamTokenBalance(total);
    }

    if (catalogResult.error) {
      console.warn(
        "Could not load Nova Home zone catalog:",
        catalogResult.error.message,
      );
      setCatalogRows([]);
      setSetupError(
        "Nova Home zone tables are not ready. Run SQL 302 before testing unlocks.",
      );
    } else {
      const rows = (catalogResult.data || []).map((row) => ({
        zone_key: String(row.zone_key),
        title: String(row.title || ""),
        subtitle: row.subtitle ? String(row.subtitle) : null,
        dt_cost: Number(row.dt_cost || 0),
        sort_order: Number(row.sort_order || 0),
      }));

      setCatalogRows(rows);

      const requiredKeys = new Set(ZONE_VISUALS.map((zone) => zone.key));
      const receivedKeys = new Set(rows.map((row) => row.zone_key));
      const missing = [...requiredKeys].filter((key) => !receivedKeys.has(key));

      if (missing.length > 0) {
        setSetupError(
          `Nova Home catalog is missing: ${missing.join(", ")}. Run SQL 302 to repair and seed Area 1.`,
        );
      }
    }

    if (unlockResult.error) {
      console.warn(
        "Could not load Nova Home unlocks:",
        unlockResult.error.message,
      );
      setUnlockedZones(new Set());
    } else {
      const validZoneKeys = new Set<ZoneKey>(
        ZONE_VISUALS.map((zone) => zone.key),
      );
      const owned = new Set<ZoneKey>();

      ((unlockResult.data || []) as ZoneUnlockRow[]).forEach((row) => {
        const key = String(row.zone_key) as ZoneKey;
        if (validZoneKeys.has(key) && key !== "door-zone") owned.add(key);
      });

      setUnlockedZones(owned);
    }

    setBalanceLoading(false);
    setCatalogLoading(false);
  }, [router]);

  useEffect(() => {
    loadNovaHome();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadNovaHome();
    });

    function refreshFromWalletEvent() {
      loadNovaHome();
    }

    window.addEventListener("focus", refreshFromWalletEvent);
    window.addEventListener("dream-tokens-updated", refreshFromWalletEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshFromWalletEvent);
      window.removeEventListener(
        "dream-tokens-updated",
        refreshFromWalletEvent,
      );
    };
  }, [loadNovaHome]);

  useEffect(() => {
    let cancelled = false;

    async function loadMasks() {
      setMaskLoading(true);
      const loaded = new Map<ZoneKey, MaskPixels>();

      await Promise.all(
        ZONE_VISUALS.map(
          (zone) =>
            new Promise<void>((resolve) => {
              const image = new Image();
              image.decoding = "async";

              image.onload = () => {
                if (cancelled) {
                  resolve();
                  return;
                }

                const canvas = document.createElement("canvas");
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;

                const context = canvas.getContext("2d", {
                  willReadFrequently: true,
                });

                if (!context) {
                  resolve();
                  return;
                }

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0);

                const imageData = context.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                );
                const alpha = new Uint8ClampedArray(
                  canvas.width * canvas.height,
                );

                for (let pixel = 0; pixel < alpha.length; pixel += 1) {
                  alpha[pixel] = imageData.data[pixel * 4 + 3];
                }

                loaded.set(zone.key, {
                  width: canvas.width,
                  height: canvas.height,
                  alpha,
                });

                resolve();
              };

              image.onerror = () => resolve();
              image.src = zone.maskImage;
            }),
        ),
      );

      if (cancelled) return;
      maskPixelsRef.current = loaded;
      setMaskLoading(false);
    }

    loadMasks();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    const viewport = roomViewportRef.current;
    if (!viewport) return;

    const ROOM_RATIO = 1535 / 1024;

    function fitStageToViewport() {
      const element = roomViewportRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const availableWidth = Math.max(0, rect.width);
      const availableHeight = Math.max(0, rect.height);

      if (availableWidth <= 0 || availableHeight <= 0) return;

      const width = Math.min(availableWidth, availableHeight * ROOM_RATIO);
      const height = width / ROOM_RATIO;

      setStageSize((current) => {
        if (
          Math.abs(current.width - width) < 0.5 &&
          Math.abs(current.height - height) < 0.5
        ) {
          return current;
        }

        return { width, height };
      });
    }

    fitStageToViewport();

    const observer = new ResizeObserver(fitStageToViewport);
    observer.observe(viewport);
    window.addEventListener("resize", fitStageToViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitStageToViewport);
    };
  }, [currentArea, setupError]);

  const getZoneAtClientPoint = useCallback(
    (clientX: number, clientY: number): ZoneKey | null => {
      const stage = stageRef.current;
      if (!stage) return null;

      const rect = stage.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        return null;
      }

      const xRatio = (clientX - rect.left) / rect.width;
      const yRatio = (clientY - rect.top) / rect.height;

      for (const key of HIT_TEST_ORDER) {
        const mask = maskPixelsRef.current.get(key);
        if (!mask) continue;

        const x = Math.min(
          mask.width - 1,
          Math.max(0, Math.floor(xRatio * mask.width)),
        );
        const y = Math.min(
          mask.height - 1,
          Math.max(0, Math.floor(yRatio * mask.height)),
        );
        const alpha = mask.alpha[y * mask.width + x];

        if (alpha > 18) return key;
      }

      return null;
    },
    [],
  );

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (maskLoading || purchasingZoneKey || currentArea !== "area-1") return;
    const key = getZoneAtClientPoint(event.clientX, event.clientY);
    setHoveredZoneKey(key);
  }

  function handlePointerLeave() {
    setHoveredZoneKey(null);
  }

  function handleZoneTap(event: ReactPointerEvent<HTMLDivElement>) {
    if (maskLoading || purchasingZoneKey || currentArea !== "area-1") return;

    const key = getZoneAtClientPoint(event.clientX, event.clientY);
    if (!key) {
      setSelectedZoneKey(null);
      setMessage("");
      return;
    }

    setSelectedZoneKey(key);
    setMessage("");
  }

  function selectZone(zoneKey: ZoneKey) {
    setSelectedZoneKey(zoneKey);
    setHoveredZoneKey(zoneKey);
    setMessage("");
  }

  const loadWardrobe = useCallback(async () => {
    setWardrobeLoading(true);
    setWardrobeSetupError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setWardrobeLoading(false);
      router.push("/login");
      return;
    }

    const [characterCatalogResult, characterUnlockResult, catalogResult, ownershipResult, equippedResult, userAccessoryFitResult] = await Promise.all([
      supabase
        .from("nova_home_character_catalog")
        .select("character_key,title,description,dt_cost,is_starter")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("nova_home_character_unlocks")
        .select("character_key")
        .eq("user_id", user.id),
      supabase
        .from("nova_home_wardrobe_catalog")
        .select(
          "item_key,character_key,category,accessory_slot,title,description,dt_cost,is_starter,thumbnail_image,layer_image,accent_hex,layer_order,sort_order,fit_mode,fit_scale,fit_scale_x,fit_scale_y,fit_offset_x_pct,fit_offset_y_pct,fit_rotation_deg,fit_skew_x_deg,fit_skew_y_deg,fit_stretch_mode",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("nova_home_wardrobe_ownership")
        .select("item_key")
        .eq("user_id", user.id),
      supabase
        .from("nova_home_wardrobe_equipped")
        .select("character_key,category,equip_slot,item_key")
        .eq("user_id", user.id),
      supabase
        .from("nova_home_wardrobe_user_accessory_fit")
        .select("item_key,scale,offset_x_pct,offset_y_pct")
        .eq("user_id", user.id),
    ]);

    if (characterCatalogResult.error || characterUnlockResult.error) {
      console.warn(
        "Could not load character unlock data:",
        characterCatalogResult.error?.message || characterUnlockResult.error?.message,
      );
      setCharacterCatalog([]);
      setUnlockedCharacters(new Set<WardrobeCharacter>(["nova"]));
      setWardrobeSetupError(
        "Milo unlock is not ready. Run SQL 306 before testing Step 1.",
      );
    } else {
      setCharacterCatalog(
        (characterCatalogResult.data || []).map((row) => ({
          character_key: String(row.character_key) as WardrobeCharacter,
          title: String(row.title || row.character_key),
          description: row.description ? String(row.description) : null,
          dt_cost: Number(row.dt_cost || 0),
          is_starter: Boolean(row.is_starter),
        })),
      );
      const nextUnlocked = new Set<WardrobeCharacter>(["nova"]);
      ((characterUnlockResult.data || []) as CharacterUnlockRow[]).forEach((row) => {
        if (row.character_key === "milo") nextUnlocked.add("milo");
      });
      setUnlockedCharacters(nextUnlocked);
    }

    if (catalogResult.error) {
      console.warn("Could not load wardrobe catalog:", catalogResult.error.message);
      setWardrobeCatalog([]);
      setWardrobeSetupError(
        catalogResult.error.message.includes("fit_")
          ? "Advanced Wardrobe Rig fields are not ready. Run SQL 309 before testing Phase 2B."
          : "Wardrobe Bay tables are not ready. Run SQL 303 before testing this activity.",
      );
    } else {
      const rows: WardrobeCatalogRow[] = (catalogResult.data || []).map(
        (row): WardrobeCatalogRow => ({
          item_key: String(row.item_key),
          character_key: String(row.character_key) as WardrobeCharacter,
          category: String(row.category) as WardrobeCategory,
          accessory_slot: ["head", "face", "ears", "wrist", "companion", "effect"].includes(
            String(row.accessory_slot || ""),
          )
            ? (String(row.accessory_slot) as Exclude<WardrobeAccessorySlot, null>)
            : null,
          title: String(row.title || "Wardrobe Item"),
          description: row.description ? String(row.description) : null,
          dt_cost: Number(row.dt_cost || 0),
          is_starter: Boolean(row.is_starter),
          thumbnail_image: row.thumbnail_image ? String(row.thumbnail_image) : null,
          layer_image: row.layer_image ? String(row.layer_image) : null,
          accent_hex: String(row.accent_hex || "#6ee7ff"),
          layer_order: Number(row.layer_order || 50),
          sort_order: Number(row.sort_order || 0),
          fit_mode: String(row.fit_mode || "auto") === "manual" ? "manual" : "auto",
          fit_scale: Number(row.fit_scale ?? 1),
          fit_scale_x: Number(row.fit_scale_x ?? 1),
          fit_scale_y: Number(row.fit_scale_y ?? 1),
          fit_offset_x_pct: Number(row.fit_offset_x_pct ?? 0),
          fit_offset_y_pct: Number(row.fit_offset_y_pct ?? 0),
          fit_rotation_deg: Number(row.fit_rotation_deg ?? 0),
          fit_skew_x_deg: Number(row.fit_skew_x_deg ?? 0),
          fit_skew_y_deg: Number(row.fit_skew_y_deg ?? 0),
          fit_stretch_mode:
            String(row.fit_stretch_mode || "contain") === "stretch"
              ? "stretch"
              : "contain",
        }),
      );
      setWardrobeCatalog(rows);

      if (!wardrobeSelectedItemKey && rows.length > 0) {
        const novaRows = rows.filter((item) => item.character_key === "nova");
        setWardrobeSelectedItemKey(
          novaRows.find((item) => item.category === "outfit")?.item_key ?? novaRows[0]?.item_key ?? null,
        );
      }
    }

    if (ownershipResult.error) {
      console.warn("Could not load wardrobe ownership:", ownershipResult.error.message);
      setWardrobeOwned(new Set());
    } else {
      setWardrobeOwned(
        new Set(
          ((ownershipResult.data || []) as WardrobeOwnershipRow[]).map((row) => String(row.item_key)),
        ),
      );
    }

    if (equippedResult.error) {
      console.warn("Could not load equipped wardrobe items:", equippedResult.error.message);
      setWardrobeEquipped([]);
    } else {
      setWardrobeEquipped(
        ((equippedResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
          character_key: String(row.character_key) as WardrobeCharacter,
          category: String(row.category) as WardrobeCategory,
          equip_slot: (["outfit", "top", "bottom", "shoes", "head", "face", "ears", "wrist", "companion", "effect"].includes(String(row.equip_slot || ""))
            ? String(row.equip_slot)
            : String(row.category) === "accessory"
              ? "head"
              : String(row.category)) as WardrobeEquipSlot,
          item_key: String(row.item_key),
        })),
      );
    }

    if (userAccessoryFitResult.error) {
      console.warn("Could not load personal accessory placement:", userAccessoryFitResult.error.message);
      setWardrobeUserAccessoryFits({});
      setWardrobeSetupError((current) =>
        current || "Personal accessory placement is not ready. Run SQL 315 before testing this phase.",
      );
    } else {
      const nextFits: Record<string, WardrobeUserAccessoryFitRow> = {};
      ((userAccessoryFitResult.data || []) as Array<Record<string, unknown>>).forEach((row) => {
        const itemKey = String(row.item_key || "");
        if (!itemKey) return;
        nextFits[itemKey] = {
          item_key: itemKey,
          scale: Number(row.scale ?? 1),
          offset_x_pct: Number(row.offset_x_pct ?? 0),
          offset_y_pct: Number(row.offset_y_pct ?? 0),
        };
      });
      setWardrobeUserAccessoryFits(nextFits);
    }

    setWardrobeLoading(false);
  }, [router, wardrobeSelectedItemKey]);

  function changeWardrobeCharacter(character: WardrobeCharacter) {
    setWardrobeCharacter(character);
    setWardrobeCategory("outfit");
    setWardrobeMessage("");
    const rows = wardrobeCatalog.filter((item) => item.character_key === character);
    setWardrobeSelectedItemKey(
      rows.find((item) => item.category === "outfit")?.item_key ?? rows[0]?.item_key ?? null,
    );
  }

  async function purchaseCharacterUnlock(character: WardrobeCharacter) {
    if (character !== "milo" || purchasingCharacter || wardrobeSetupError) return;

    const characterRow = characterCatalog.find((entry) => entry.character_key === character);
    if (!characterRow) {
      setWardrobeMessage("Milo unlock data is not ready. Run SQL 306 first.");
      return;
    }

    if (unlockedCharacters.has(character) || characterRow.is_starter) {
      changeWardrobeCharacter(character);
      return;
    }

    if (dreamTokenBalance < characterRow.dt_cost) {
      setWardrobeMessage(
        `You need ${formatDT(characterRow.dt_cost - dreamTokenBalance)} more to unlock Milo.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Unlock Milo permanently for ${formatDT(characterRow.dt_cost)}?`,
    );
    if (!confirmed) return;

    setPurchasingCharacter(character);
    setWardrobeMessage("");

    const { data, error } = await supabase.rpc("purchase_nova_home_character_unlock", {
      p_character_key: character,
    });

    setPurchasingCharacter(null);

    if (error) {
      setWardrobeMessage(error.message || "Milo could not be unlocked.");
      return;
    }

    const result = getCharacterPurchaseResult(data);
    if (!result) {
      setWardrobeMessage("Milo was unlocked, but the purchase result could not be read.");
      await loadWardrobe();
      return;
    }

    setDreamTokenBalance(Math.max(0, result.new_balance));
    setUnlockedCharacters((current) => new Set<WardrobeCharacter>([...current, "milo"]));
    setWardrobeCharacter("milo");
    setWardrobeCategory("outfit");
    const firstMiloOutfit =
      wardrobeCatalog.find((item) => item.item_key === "milo-classic") ??
      wardrobeCatalog.find((item) => item.character_key === "milo" && item.category === "outfit") ??
      null;
    setWardrobeSelectedItemKey(firstMiloOutfit?.item_key ?? null);
    setWardrobeMessage(
      result.already_owned
        ? "Milo was already unlocked. Choose an outfit for him."
        : `Milo unlocked permanently for ${formatDT(result.cost_paid)}. Choose an outfit for him.`,
    );
    window.dispatchEvent(new Event("dream-tokens-updated"));
  }

  function openWardrobe() {
    if (!unlockedZones.has("bed-zone")) return;
    setWardrobeOpen(true);
    setWardrobeMessage("");
    setWardrobeCharacter("nova");
    setWardrobeCategory("outfit");
    void loadWardrobe();
  }

  function closeWardrobe() {
    if (wardrobePurchasingItemKey || wardrobeEquippingItemKey || wardrobeSavingPlacementItemKey || purchasingCharacter) return;
    setWardrobeOpen(false);
    setWardrobeMessage("");
  }

  async function equipWardrobeItem(
    itemKey: string,
    quiet = false,
    forceOwned = false,
  ) {
    const item = wardrobeCatalog.find((entry) => entry.item_key === itemKey);
    if (!item || wardrobeEquippingItemKey || wardrobeSetupError) return false;

    const owned = forceOwned || item.is_starter || wardrobeOwned.has(item.item_key);
    if (!owned) {
      if (!quiet) setWardrobeMessage("Buy this wardrobe item before equipping it.");
      return false;
    }

    setWardrobeEquippingItemKey(itemKey);
    if (!quiet) setWardrobeMessage("");

    const { data, error } = await supabase.rpc("equip_nova_home_wardrobe_item", {
      p_item_key: itemKey,
    });

    setWardrobeEquippingItemKey(null);

    if (error) {
      setWardrobeMessage(error.message || "This wardrobe item could not be equipped.");
      return false;
    }

    const result = getWardrobeEquipResult(data);
    if (!result) {
      setWardrobeMessage("The outfit changed, but the equipped state could not be read.");
      await loadWardrobe();
      return false;
    }

    setWardrobeEquipped((current) => {
      const targetSlot = result.equip_slot || getWardrobeEquipSlotForItem(item);
      let next = current.filter((entry) => {
        if (entry.character_key !== result.character_key) return true;
        if (result.category === "outfit") {
          return !["outfit", "top", "bottom", "shoes"].includes(entry.equip_slot);
        }
        if (["top", "bottom", "shoes"].includes(result.category)) {
          if (entry.equip_slot === "outfit") return false;
          return entry.equip_slot !== targetSlot;
        }
        return entry.equip_slot !== targetSlot;
      });

      next = [
        ...next,
        {
          item_key: result.item_key,
          character_key: result.character_key,
          category: result.category,
          equip_slot: targetSlot,
        },
      ];
      return next;
    });

    if (!quiet) setWardrobeMessage(`${item.title} equipped.`);
    return true;
  }

  async function unequipWardrobeAccessory(itemKey: string) {
    const item = wardrobeCatalog.find((entry) => entry.item_key === itemKey);
    if (
      !item ||
      item.category !== "accessory" ||
      wardrobeEquippingItemKey ||
      wardrobeSetupError
    ) {
      return false;
    }

    setWardrobeEquippingItemKey(itemKey);
    setWardrobeMessage("");

    const { error } = await supabase.rpc("unequip_nova_home_wardrobe_accessory", {
      p_item_key: itemKey,
    });

    setWardrobeEquippingItemKey(null);

    if (error) {
      setWardrobeMessage(error.message || "This accessory could not be unequipped.");
      return false;
    }

    const targetSlot = getWardrobeEquipSlotForItem(item);
    setWardrobeEquipped((current) =>
      current.filter(
        (entry) =>
          !(
            entry.character_key === item.character_key &&
            entry.category === "accessory" &&
            entry.equip_slot === targetSlot
          ),
      ),
    );
    setWardrobeMessage(`${item.title} unequipped.`);
    return true;
  }

  async function purchaseWardrobeItem(itemKey: string) {
    const item = wardrobeCatalog.find((entry) => entry.item_key === itemKey);
    if (!item || wardrobePurchasingItemKey || wardrobeSetupError) return;

    if (item.is_starter || wardrobeOwned.has(item.item_key)) {
      await equipWardrobeItem(item.item_key);
      return;
    }

    if (dreamTokenBalance < item.dt_cost) {
      setWardrobeMessage(
        `You need ${formatDT(item.dt_cost - dreamTokenBalance)} more for ${item.title}.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Buy ${item.title} for ${formatDT(item.dt_cost)} and wear it now?`,
    );
    if (!confirmed) return;

    setWardrobePurchasingItemKey(itemKey);
    setWardrobeMessage("");

    const { data, error } = await supabase.rpc(
      "purchase_nova_home_wardrobe_item",
      { p_item_key: itemKey },
    );

    setWardrobePurchasingItemKey(null);

    if (error) {
      setWardrobeMessage(error.message || "The wardrobe item could not be purchased.");
      return;
    }

    const result = getWardrobePurchaseResult(data);
    if (!result) {
      setWardrobeMessage("The purchase completed, but the result could not be read.");
      await loadWardrobe();
      return;
    }

    setDreamTokenBalance(Math.max(0, result.new_balance));
    if (!item.is_starter) {
      setWardrobeOwned((current) => {
        const next = new Set(current);
        next.add(item.item_key);
        return next;
      });
    }

    window.dispatchEvent(new Event("dream-tokens-updated"));

    const equipped = await equipWardrobeItem(item.item_key, true, true);
    setWardrobeMessage(
      result.already_owned
        ? equipped
          ? `${item.title} was already owned and is now equipped.`
          : `${item.title} was already owned.`
        : equipped
          ? `${item.title} purchased for ${formatDT(result.cost_paid)} and equipped.`
          : `${item.title} purchased for ${formatDT(result.cost_paid)}.`,
    );
  }

  async function saveUserAccessoryPlacement(
    itemKey: string,
    placement: WardrobeUserPlacementDraft,
  ): Promise<boolean> {
    const item = wardrobeCatalog.find((entry) => entry.item_key === itemKey);
    if (!item || item.category !== "accessory" || wardrobeSavingPlacementItemKey || wardrobeSetupError) return false;

    setWardrobeSavingPlacementItemKey(itemKey);
    setWardrobeMessage("");

    const { data, error } = await supabase.rpc(
      "save_nova_home_user_accessory_fit",
      {
        p_item_key: itemKey,
        p_scale: placement.scale,
        p_offset_x_pct: placement.offset_x_pct,
        p_offset_y_pct: placement.offset_y_pct,
      },
    );

    setWardrobeSavingPlacementItemKey(null);

    if (error) {
      setWardrobeMessage(error.message || "Your accessory placement could not be saved.");
      return false;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") {
      setWardrobeMessage("The placement was saved, but the saved values could not be read.");
      await loadWardrobe();
      return false;
    }

    const result = row as Record<string, unknown>;
    const saved: WardrobeUserAccessoryFitRow = {
      item_key: String(result.item_key || itemKey),
      scale: Number(result.scale ?? placement.scale),
      offset_x_pct: Number(result.offset_x_pct ?? placement.offset_x_pct),
      offset_y_pct: Number(result.offset_y_pct ?? placement.offset_y_pct),
    };

    setWardrobeUserAccessoryFits((current) => ({
      ...current,
      [itemKey]: saved,
    }));
    setWardrobeMessage(`${item.title} placement saved.`);
    return true;
  }

  async function purchaseZone(zoneKey: ZoneKey) {
    const zone = zoneMap.get(zoneKey);
    if (!zone || purchasingZoneKey || setupError) return;

    if (zone.isAreaExit) {
      setMessage("Area 2 is coming soon.");
      return;
    }

    if (unlockedZones.has(zoneKey)) {
      return;
    }

    if (dreamTokenBalance < zone.dtCost) {
      setMessage(
        `You need ${formatDT(zone.dtCost - dreamTokenBalance)} more to unlock ${zone.title}.`,
      );
      return;
    }

    const confirmed = window.confirm(
      zone.isAreaExit
        ? `Unlock Area 2 for ${formatDT(zone.dtCost)}?`
        : `Unlock ${zone.title} for ${formatDT(zone.dtCost)}?`,
    );
    if (!confirmed) return;

    setPurchasingZoneKey(zoneKey);
    setMessage("");

    const { data, error } = await supabase.rpc("purchase_nova_home_zone", {
      p_zone_key: zoneKey,
    });

    setPurchasingZoneKey(null);

    if (error) {
      setMessage(error.message || "The zone could not be unlocked.");
      return;
    }

    const result = getPurchaseResult(data);
    if (!result) {
      setMessage("The purchase completed, but the result could not be read.");
      await loadNovaHome();
      return;
    }

    setUnlockedZones((current) => {
      const next = new Set(current);
      next.add(zoneKey);
      return next;
    });
    setDreamTokenBalance(Math.max(0, result.new_balance));
    setMessage(
      result.already_owned
        ? `${zone.title} was already unlocked.`
        : `${zone.title} unlocked for ${formatDT(result.cost_paid)}.`,
    );

    window.dispatchEvent(new Event("dream-tokens-updated"));

  }

  if (!authChecked) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#020713] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_28px_rgba(83,215,255,0.28)]" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">
            Loading Nova Home
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-x-0 top-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(39,145,190,0.16),transparent_38%),linear-gradient(180deg,#04101d_0%,#020713_72%)]" />

      <header className="relative z-30 shrink-0 border-b border-white/[0.06] bg-slate-950/42 px-3 py-2 backdrop-blur-xl sm:px-5 lg:px-7">
        <div className="mx-auto grid w-full max-w-[1800px] gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                currentArea === "area-2"
                  ? setCurrentArea("area-1")
                  : router.push("/inventor")
              }
              className="flex h-11 items-center gap-2 rounded-full border border-cyan-200/35 bg-slate-950/65 px-4 text-xs font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition hover:bg-cyan-300/10"
            >
              <span aria-hidden="true">←</span>
              {currentArea === "area-2" ? "Area 1" : "Nova’s World"}
            </button>
          </div>

          <div className="min-w-0 md:px-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-xl font-medium tracking-[-0.035em] text-white sm:text-2xl xl:text-3xl">
                Nova’s Home
              </h1>
              <span className="text-[9px] font-black uppercase tracking-[0.17em] text-cyan-300/75 sm:text-[10px]">
                Customise & Play
              </span>
            </div>
            <p className="mt-0.5 max-w-3xl text-[10px] leading-4 text-white/50 sm:text-[11px] xl:text-xs">
              {currentArea === "area-1"
                ? "Choose a darkened room zone, view its DT price, and unlock it to reveal the furnishing beneath."
                : "Area 2 is coming soon."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <div className="rounded-full border border-cyan-200/30 bg-slate-950/72 px-4 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-200/55">
                Dream Tokens
              </p>
              <p className="mt-0.5 text-sm font-black text-cyan-50">
                {balanceLoading ? "Loading..." : formatDT(dreamTokenBalance)}
              </p>
            </div>

            <div className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/38">
                Starter Quarters
              </p>
              <p className="mt-0.5 text-sm font-black text-white">
                {roomUnlockedCount}/4 furnished
              </p>
            </div>

            <div
              className="rounded-full border border-amber-200/18 bg-amber-300/[0.05] px-4 py-2 text-right"
            >
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/38">
                Area 2
              </p>
              <p
                className="mt-0.5 text-sm font-black text-amber-100/75"
              >
                Coming Soon
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col overflow-hidden px-3 py-2 sm:px-5 lg:px-7">
        {setupError && (
          <div className="mb-2 shrink-0 rounded-[14px] border border-amber-200/28 bg-amber-300/[0.08] px-4 py-2 text-xs leading-5 text-amber-50/88">
            {setupError}
          </div>
        )}

        {currentArea === "area-1" ? (
          <div className="grid min-h-0 flex-1 items-stretch gap-3 md:grid-cols-[190px_minmax(0,1fr)] lg:grid-cols-[215px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="grid min-h-0 grid-cols-5 content-start gap-1.5 md:grid-cols-1 md:grid-rows-[auto_repeat(5,minmax(0,1fr))] md:gap-2">
              <div className="col-span-5 mb-0.5 md:col-span-1">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/55">
                  Area 1 · Starter Quarters
                </p>
                <p className="mt-1 text-[11px] leading-5 text-white/40">
                  Select a room zone to inspect or unlock it. Area 2 is coming soon.
                </p>
              </div>

              {zones.map((zone) => {
                const unlocked = !zone.isAreaExit && unlockedZones.has(zone.key);
                const selected = selectedZoneKey === zone.key;
                const affordable = !zone.isAreaExit && dreamTokenBalance >= zone.dtCost;
                const guideHighlighted = guideTargetZoneKey === zone.key;

                return (
                  <button
                    key={zone.key}
                    type="button"
                    onMouseEnter={() => setHoveredZoneKey(zone.key)}
                    onMouseLeave={() => setHoveredZoneKey(null)}
                    onClick={() => selectZone(zone.key)}
                    className={`group min-h-0 rounded-[14px] border px-2 py-2 text-left transition md:px-3 md:py-2 ${
                      guideHighlighted
                        ? zone.isAreaExit
                          ? "relative z-[95] border-amber-200/70 bg-amber-300/[0.13] shadow-[0_0_0_3px_rgba(251,191,36,0.13),0_0_32px_rgba(251,191,36,0.26)]"
                          : "relative z-[95] border-cyan-200/75 bg-cyan-300/[0.14] shadow-[0_0_0_3px_rgba(83,215,255,0.13),0_0_34px_rgba(83,215,255,0.28)]"
                        : selected
                          ? "border-cyan-200/52 bg-cyan-300/[0.1] shadow-[0_0_24px_rgba(83,215,255,0.11)]"
                          : unlocked
                            ? "border-emerald-200/15 bg-emerald-300/[0.045]"
                            : zone.isAreaExit
                              ? "border-amber-200/16 bg-amber-300/[0.035] hover:border-amber-200/30"
                              : "border-white/9 bg-white/[0.025] hover:border-cyan-200/24 hover:bg-cyan-300/[0.045]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-white sm:text-sm">
                          {zone.title}
                        </p>
                        <p
                          className={`mt-1 text-[9px] font-bold uppercase tracking-[0.1em] ${
                            zone.isAreaExit
                              ? "text-amber-200/65"
                              : unlocked
                                ? "text-emerald-200/65"
                                : affordable
                                  ? "text-cyan-200/58"
                                  : "text-white/28"
                          }`}
                        >
                          {zone.isAreaExit
                            ? "Coming Soon"
                            : unlocked
                              ? zone.key === "bed-zone"
                                ? "Wardrobe Bay"
                                : zone.key === "extra-zone"
                                  ? "Rug Rush"
                                  : "Unlocked"
                              : affordable
                                ? "Available"
                                : "Save more DT"}
                        </p>
                      </div>

                      <strong
                        className={`shrink-0 text-[10px] ${
                          unlocked
                            ? "text-emerald-200"
                            : zone.isAreaExit
                              ? "text-amber-200"
                              : affordable
                                ? "text-cyan-200"
                                : "text-white/30"
                        }`}
                      >
                        {zone.isAreaExit ? "Soon" : unlocked ? "✓" : formatDT(zone.dtCost)}
                      </strong>
                    </div>
                  </button>
                );
              })}
            </aside>

            <div
              ref={roomViewportRef}
              className="flex min-h-0 min-w-0 items-start justify-center overflow-hidden"
            >
              <div
                ref={stageRef}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerUp={handleZoneTap}
                className={`relative isolate w-full touch-manipulation select-none overflow-hidden rounded-[20px] border border-cyan-200/18 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.56)] sm:rounded-[24px] ${
                  activeZoneKey ? "cursor-pointer" : "cursor-default"
                }`}
                style={{
                  width: stageSize.width > 0 ? `${stageSize.width}px` : "100%",
                  height: stageSize.height > 0 ? `${stageSize.height}px` : "auto",
                  aspectRatio: "1535 / 1024",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
                aria-label="Interactive Nova Home Area 1"
              >
                <img
                  src={AREA_1_IMAGE}
                  alt="Nova's fully furnished starter room"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  draggable={false}
                />

                {zones.map((zone) => {
                  if (!zone.isAreaExit && unlockedZones.has(zone.key)) return null;

                  const hovered = hoveredZoneKey === zone.key;
                  const selected = selectedZoneKey === zone.key;
                  const guideHighlighted = guideTargetZoneKey === zone.key;

                  return (
                    <img
                      key={zone.key}
                      src={zone.maskImage}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full transition duration-150"
                      draggable={false}
                      style={{
                        opacity: guideHighlighted ? 0.48 : hovered || selected ? 0.6 : 1,
                        filter:
                          guideHighlighted || hovered || selected
                            ? `drop-shadow(0 0 8px ${zone.accent}) drop-shadow(0 0 20px rgba(83,215,255,0.42))`
                            : "none",
                      }}
                    />
                  );
                })}

                {rugRushSparkle && currentArea === "area-1" && (
                  <div className="pointer-events-none absolute inset-0 z-[12] overflow-hidden">
                    <div
                      className={`absolute rounded-full border ${rugRushLastResult?.perfect ? "border-amber-100/45 shadow-[0_0_36px_rgba(251,191,36,0.20)]" : "border-cyan-100/35 shadow-[0_0_32px_rgba(103,232,249,0.18)]"}`}
                      style={{
                        left: "27%",
                        top: "57%",
                        width: "38%",
                        height: "29%",
                        transform: "rotate(-1deg)",
                        background: rugRushLastResult?.perfect
                          ? "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.08), transparent 72%)"
                          : "radial-gradient(circle at 50% 50%, rgba(103,232,249,0.07), transparent 72%)",
                      }}
                    />
                    {RUG_RUSH_SPARKLES.map((sparkle, index) => (
                      <span
                        key={`${sparkle.left}-${sparkle.top}`}
                        className={`absolute animate-pulse font-black ${rugRushLastResult?.perfect ? "text-amber-100" : "text-cyan-100"}`}
                        style={{
                          left: `${sparkle.left}%`,
                          top: `${sparkle.top}%`,
                          fontSize: `${sparkle.size}px`,
                          animationDelay: `${sparkle.delay}ms`,
                          filter: rugRushLastResult?.perfect
                            ? "drop-shadow(0 0 7px rgba(251,191,36,0.8))"
                            : "drop-shadow(0 0 7px rgba(103,232,249,0.8))",
                        }}
                        aria-hidden="true"
                      >
                        ✦
                      </span>
                    ))}
                    <div
                      className={`absolute rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] backdrop-blur-md ${rugRushLastResult?.perfect ? "border-amber-100/25 bg-amber-950/65 text-amber-100" : "border-cyan-100/22 bg-cyan-950/65 text-cyan-100"}`}
                      style={{ left: "42%", top: "70%", transform: "translate(-50%, -50%)" }}
                    >
                      {rugRushLastResult?.perfect ? "Perfectly Clean ✦" : "Rug Cleaned ✦"}
                    </div>
                  </div>
                )}

                {maskLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/34 backdrop-blur-[1px]">
                    <div className="rounded-full border border-cyan-200/24 bg-slate-950/78 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 backdrop-blur-xl">
                      Loading room zones...
                    </div>
                  </div>
                )}

                {!maskLoading && activeZone && (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[min(620px,calc(100%-20px))] -translate-x-1/2 sm:bottom-4">
                    <div
                      onPointerMove={(event) => event.stopPropagation()}
                      onPointerUp={(event) => event.stopPropagation()}
                      className={`pointer-events-auto rounded-[20px] border px-4 py-3 shadow-[0_24px_62px_rgba(0,0,0,0.52)] backdrop-blur-xl sm:px-5 sm:py-4 ${
                        (!activeZone.isAreaExit && unlockedZones.has(activeZone.key))
                          ? "border-emerald-200/24 bg-emerald-950/88"
                          : activeZone.isAreaExit
                            ? "border-amber-200/28 bg-slate-950/90"
                            : "border-cyan-200/30 bg-slate-950/90"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p
                            className={`text-[9px] font-black uppercase tracking-[0.15em] ${
                              activeZone.isAreaExit
                                ? "text-amber-200/65"
                                : "text-cyan-200/58"
                            }`}
                          >
                            {activeZone.isAreaExit
                              ? "Coming Soon"
                              : unlockedZones.has(activeZone.key)
                                ? "Zone Unlocked"
                                : "Room Upgrade"}
                          </p>

                          <h2 className="mt-1 text-base font-black text-white sm:text-lg">
                            {activeZone.title}
                          </h2>

                          <p className="mt-1 max-w-md text-[11px] leading-5 text-white/50 sm:text-xs">
                            {activeZone.subtitle}
                          </p>

                          {message && selectedZoneKey === activeZone.key && (
                            <p className="mt-2 text-[10px] font-bold leading-5 text-amber-100/85 sm:text-xs">
                              {message}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 sm:min-w-[185px] sm:text-right">
                          {activeZone.isAreaExit ? (
                            <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-amber-200/24 bg-amber-300/10 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-amber-100 sm:w-auto">
                              Coming Soon
                            </span>
                          ) : unlockedZones.has(activeZone.key) ? (
                            activeZone.key === "bed-zone" ? (
                              <button
                                type="button"
                                onClick={openWardrobe}
                                className="min-h-11 w-full rounded-full bg-cyan-300 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-cyan-200 sm:w-auto"
                              >
                                Open Wardrobe Bay →
                              </button>
                            ) : activeZone.key === "extra-zone" ? (
                              <button
                                type="button"
                                onClick={openRugRush}
                                className="min-h-11 w-full rounded-full bg-cyan-300 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-cyan-200 sm:w-auto"
                              >
                                Play Rug Rush →
                              </button>
                            ) : (
                              <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-200/24 bg-emerald-300/10 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-100">
                                ✓ Unlocked
                              </span>
                            )
                          ) : selectedZoneKey === activeZone.key ? (
                            <button
                              type="button"
                              disabled={
                                purchasingZoneKey === activeZone.key ||
                                catalogLoading ||
                                Boolean(setupError) ||
                                dreamTokenBalance < activeZone.dtCost
                              }
                              onClick={() => purchaseZone(activeZone.key)}
                              className={`min-h-11 w-full rounded-full px-5 text-[11px] font-black uppercase tracking-[0.1em] transition sm:w-auto ${
                                dreamTokenBalance >= activeZone.dtCost &&
                                !setupError
                                  ? activeZone.isAreaExit
                                    ? "bg-amber-300 text-slate-950 hover:bg-amber-200 disabled:opacity-55"
                                    : "bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-55"
                                  : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/32"
                              }`}
                            >
                              {purchasingZoneKey === activeZone.key
                                ? "Unlocking..."
                                : dreamTokenBalance >= activeZone.dtCost
                                  ? `Unlock · ${formatDT(activeZone.dtCost)}`
                                  : `Need ${formatDT(activeZone.dtCost - dreamTokenBalance)}`}
                            </button>
                          ) : (
                            <div>
                              <p
                                className={`text-xl font-black sm:text-2xl ${
                                  activeZone.isAreaExit
                                    ? "text-amber-100"
                                    : "text-cyan-100"
                                }`}
                              >
                                {catalogLoading
                                  ? "..."
                                  : formatDT(activeZone.dtCost)}
                              </p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/34">
                                Click zone to unlock
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div ref={roomViewportRef} className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
            <div
              className="relative isolate overflow-hidden rounded-[24px] border border-emerald-200/18 bg-[radial-gradient(circle_at_50%_35%,rgba(30,150,190,0.17),transparent_45%),linear-gradient(145deg,#07172a,#020713)] shadow-[0_30px_100px_rgba(0,0,0,0.56)]"
              style={{
                width: stageSize.width > 0 ? `${stageSize.width}px` : "100%",
                height: stageSize.height > 0 ? `${stageSize.height}px` : "auto",
                aspectRatio: "1535 / 1024",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              {!area2ImageFailed && (
                <img
                  src={AREA_2_PLACEHOLDER_IMAGE}
                  alt="Nova Home Area 2 placeholder"
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                  onError={() => setArea2ImageFailed(true)}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/42" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                <div className="max-w-xl rounded-[22px] border border-emerald-200/22 bg-slate-950/82 p-5 backdrop-blur-xl sm:p-6">
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-emerald-200/72">
                    Future Expansion
                  </p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    Area 2 · Coming Soon
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-white/52 sm:text-sm">
                    Area 2 is not available yet. This connected room will open in a future Nova Home update.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentArea("area-1")}
                    className="mt-4 min-h-11 rounded-full border border-emerald-200/24 bg-emerald-300/10 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-100 hover:bg-emerald-300/16"
                  >
                    ← Return to Area 1
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {!wardrobeOpen && !rugRushOpen && (
        <div className="pointer-events-none fixed bottom-2 right-2 z-40 flex flex-col items-center sm:bottom-3 sm:right-4 lg:right-5">
          <img
            src="/nova/nova-character.png"
            alt="Nova"
            className="pointer-events-none h-[108px] w-auto drop-shadow-[0_20px_28px_rgba(0,0,0,0.56)] sm:h-[138px] xl:h-[168px]"
            draggable={false}
          />
          <button
            type="button"
            onClick={startNovaHomeGuide}
            className="pointer-events-auto -mt-1 flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-200/55 bg-cyan-950/88 px-4 text-[10px] font-black uppercase tracking-[0.11em] text-white shadow-[0_16px_36px_rgba(0,0,0,0.34),0_0_22px_rgba(83,215,255,0.15)] backdrop-blur-xl transition hover:bg-cyan-900/90 sm:min-h-11 sm:px-5 sm:text-[11px]"
          >
            <span aria-hidden="true">✦</span>
            Nova Guide
          </button>
        </div>
      )}

      <NovaHomeGuide
        open={guideOpen && !wardrobeOpen && !rugRushOpen}
        stepIndex={guideStep}
        onStepChange={setGuideStep}
        onClose={closeNovaHomeGuide}
      />

      {rugRushOpen && (
        <RugRushGame
          onClose={closeRugRush}
          onRoundComplete={handleRugRushComplete}
        />
      )}

      {wardrobeOpen && (
        <WardrobeBay
          catalog={wardrobeCatalog}
          ownedItems={wardrobeOwned}
          equippedItems={wardrobeEquipped}
          characterCatalog={characterCatalog}
          unlockedCharacters={unlockedCharacters}
          activeCharacter={wardrobeCharacter}
          purchasingCharacter={purchasingCharacter}
          activeCategory={wardrobeCategory}
          selectedItemKey={wardrobeSelectedItemKey}
          dreamTokenBalance={dreamTokenBalance}
          loading={wardrobeLoading}
          setupError={wardrobeSetupError}
          message={wardrobeMessage}
          purchasingItemKey={wardrobePurchasingItemKey}
          equippingItemKey={wardrobeEquippingItemKey}
          savingPlacementItemKey={wardrobeSavingPlacementItemKey}
          userAccessoryFits={wardrobeUserAccessoryFits}
          onClose={closeWardrobe}
          onCharacterChange={changeWardrobeCharacter}
          onPurchaseCharacter={(character) => void purchaseCharacterUnlock(character)}
          onCategoryChange={(category) => {
            setWardrobeCategory(category);
            const first = wardrobeCatalog.find((item) => item.character_key === wardrobeCharacter && item.category === category);
            setWardrobeSelectedItemKey(first?.item_key ?? null);
            setWardrobeMessage("");
          }}
          onSelectItem={(itemKey) => {
            setWardrobeSelectedItemKey(itemKey);
            setWardrobeMessage("");
          }}
          onPurchase={purchaseWardrobeItem}
          onEquip={(itemKey) => void equipWardrobeItem(itemKey)}
          onUnequip={(itemKey) => void unequipWardrobeAccessory(itemKey)}
          onSavePlacement={saveUserAccessoryPlacement}
        />
      )}
    </main>
  );
}


function NovaHomeGuide({
  open,
  stepIndex,
  onStepChange,
  onClose,
}: {
  open: boolean;
  stepIndex: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}) {
  const step = NOVA_HOME_GUIDE_STEPS[stepIndex] ?? NOVA_HOME_GUIDE_STEPS[0];
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= NOVA_HOME_GUIDE_STEPS.length - 1;

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="pointer-events-none absolute inset-0 bg-slate-950/58 backdrop-blur-[1px]" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_76%,rgba(32,174,220,0.13),transparent_32%)]" />

      <div className="absolute inset-x-3 bottom-3 z-[100] flex justify-center sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(470px,calc(100vw-40px))]">
        <div className="relative w-full overflow-hidden rounded-[26px] border border-cyan-200/32 bg-[linear-gradient(145deg,rgba(4,30,49,0.98),rgba(2,10,24,0.99))] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.65),0_0_34px_rgba(83,215,255,0.13)] backdrop-blur-2xl sm:p-5">
          <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Nova Guide"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-lg text-white/68 transition hover:bg-white/[0.09]"
          >
            ×
          </button>

          <div className="relative flex items-start gap-3 pr-9 sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-[18px] border border-cyan-200/24 bg-cyan-300/[0.07] sm:h-16 sm:w-16">
              <img
                src="/nova/nova-character.png"
                alt="Nova"
                className="h-[72px] w-auto translate-y-2 object-contain sm:h-[82px]"
                draggable={false}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.17em] text-cyan-200/62 sm:text-[9px]">
                {step.eyebrow}
              </p>
              <h2 className="mt-1 font-serif text-xl font-medium tracking-[-0.02em] text-white sm:text-2xl">
                {step.title}
              </h2>
              <p className="mt-2 text-[11px] leading-5 text-white/58 sm:text-xs sm:leading-6">
                {step.text}
              </p>
            </div>
          </div>

          {step.targetZoneKey && (
            <div className="relative mt-3 rounded-[14px] border border-cyan-200/13 bg-cyan-300/[0.045] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.11em] text-cyan-100/64">
              ✦ The matching room zone is highlighted behind this guide.
            </div>
          )}

          <div className="relative mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-label="Guide progress">
              {NOVA_HOME_GUIDE_STEPS.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === stepIndex
                      ? "w-5 bg-cyan-300"
                      : index < stepIndex
                        ? "w-2 bg-cyan-200/42"
                        : "w-2 bg-white/14"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
                  className="min-h-10 rounded-full border border-white/11 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/62 transition hover:bg-white/[0.075]"
                >
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isLast) {
                    onClose();
                    return;
                  }
                  onStepChange(Math.min(NOVA_HOME_GUIDE_STEPS.length - 1, stepIndex + 1));
                }}
                className="min-h-10 rounded-full bg-cyan-300 px-5 text-[9px] font-black uppercase tracking-[0.11em] text-slate-950 transition hover:bg-cyan-200"
              >
                {isLast ? "Start Exploring" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WardrobeBay({
  catalog,
  ownedItems,
  equippedItems,
  characterCatalog,
  unlockedCharacters,
  activeCharacter,
  purchasingCharacter,
  activeCategory,
  selectedItemKey,
  dreamTokenBalance,
  loading,
  setupError,
  message,
  purchasingItemKey,
  equippingItemKey,
  savingPlacementItemKey,
  userAccessoryFits,
  onClose,
  onCharacterChange,
  onPurchaseCharacter,
  onCategoryChange,
  onSelectItem,
  onPurchase,
  onEquip,
  onUnequip,
  onSavePlacement,
}: {
  catalog: WardrobeCatalogRow[];
  ownedItems: Set<string>;
  equippedItems: WardrobeEquippedRow[];
  characterCatalog: CharacterCatalogRow[];
  unlockedCharacters: Set<WardrobeCharacter>;
  activeCharacter: WardrobeCharacter;
  purchasingCharacter: WardrobeCharacter | null;
  activeCategory: WardrobeCategory;
  selectedItemKey: string | null;
  dreamTokenBalance: number;
  loading: boolean;
  setupError: string;
  message: string;
  purchasingItemKey: string | null;
  equippingItemKey: string | null;
  savingPlacementItemKey: string | null;
  userAccessoryFits: Record<string, WardrobeUserAccessoryFitRow>;
  onClose: () => void;
  onCharacterChange: (character: WardrobeCharacter) => void;
  onPurchaseCharacter: (character: WardrobeCharacter) => void;
  onCategoryChange: (category: WardrobeCategory) => void;
  onSelectItem: (itemKey: string) => void;
  onPurchase: (itemKey: string) => void;
  onEquip: (itemKey: string) => void;
  onUnequip: (itemKey: string) => void;
  onSavePlacement: (itemKey: string, placement: WardrobeUserPlacementDraft) => Promise<boolean>;
}) {
  const visibleItems = catalog.filter((item) => item.character_key === activeCharacter && item.category === activeCategory);
  const selectedItem =
    catalog.find((item) => item.item_key === selectedItemKey && item.character_key === activeCharacter) ?? visibleItems[0] ?? null;

  const [adjustmentMode, setAdjustmentMode] = useState(false);
  const [placementDraft, setPlacementDraft] = useState<WardrobeUserPlacementDraft>({
    scale: 1,
    offset_x_pct: 0,
    offset_y_pct: 0,
  });
  const [placementDrag, setPlacementDrag] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const [savingLook, setSavingLook] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [lookActionMessage, setLookActionMessage] = useState("");

  useEffect(() => {
    setAdjustmentMode(false);
    setPlacementDrag(null);
  }, [activeCharacter]);

  useEffect(() => {
    if (selectedItem?.category !== "accessory") {
      setAdjustmentMode(false);
      setPlacementDrag(null);
    }
  }, [selectedItem?.category]);

  useEffect(() => {
    if (!selectedItem || selectedItem.category !== "accessory") {
      setPlacementDraft({ scale: 1, offset_x_pct: 0, offset_y_pct: 0 });
      return;
    }

    const saved = userAccessoryFits[selectedItem.item_key];
    setPlacementDraft({
      scale: Number(saved?.scale ?? 1),
      offset_x_pct: Number(saved?.offset_x_pct ?? 0),
      offset_y_pct: Number(saved?.offset_y_pct ?? 0),
    });
  }, [selectedItem?.item_key, selectedItem?.category, userAccessoryFits]);

  const characterEquipped = equippedItems.filter((entry) => entry.character_key === activeCharacter);
  const baseClothingEquipped = characterEquipped.some((entry) =>
    ["outfit", "top", "bottom", "shoes"].includes(entry.category),
  );

  const effectiveEquipped = [...characterEquipped];
  if (!baseClothingEquipped) {
    const defaultOutfitKey = activeCharacter === "nova" ? "nova-classic" : "milo-classic";
    const classic = catalog.find(
      (item) => item.character_key === activeCharacter && item.item_key === defaultOutfitKey,
    );
    if (classic) {
      effectiveEquipped.push({
        character_key: activeCharacter,
        category: "outfit",
        equip_slot: "outfit",
        item_key: classic.item_key,
      });
    }
  }

  const currentOutfitEntry =
    effectiveEquipped.find((entry) => entry.category === "outfit") ?? null;
  const currentOutfitItem = currentOutfitEntry
    ? catalog.find((item) => item.item_key === currentOutfitEntry.item_key) ?? null
    : null;
  const currentAccessoryItems = effectiveEquipped
    .filter((entry) => entry.category === "accessory")
    .map((entry) => catalog.find((item) => item.item_key === entry.item_key))
    .filter((item): item is WardrobeCatalogRow => Boolean(item?.layer_image));

  let previewEquipped = [...effectiveEquipped];
  if (selectedItem) {
    if (selectedItem.category === "outfit") {
      previewEquipped = previewEquipped.filter(
        (entry) => !["outfit", "top", "bottom", "shoes"].includes(entry.equip_slot),
      );
    } else if (selectedItem.category === "accessory") {
      const selectedSlot = getWardrobeEquipSlotForItem(selectedItem);
      previewEquipped = previewEquipped.filter(
        (entry) => !(entry.category === "accessory" && entry.equip_slot === selectedSlot),
      );
    } else {
      const selectedSlot = getWardrobeEquipSlotForItem(selectedItem);
      previewEquipped = previewEquipped.filter(
        (entry) => entry.equip_slot !== selectedSlot,
      );
    }

    previewEquipped.push({
      character_key: activeCharacter,
      category: selectedItem.category,
      equip_slot: getWardrobeEquipSlotForItem(selectedItem),
      item_key: selectedItem.item_key,
    });
  }

  const previewOutfitEntry =
    previewEquipped.find((entry) => entry.category === "outfit") ??
    effectiveEquipped.find((entry) => entry.category === "outfit") ??
    null;

  const defaultPreviewOutfitKey = activeCharacter === "nova" ? "nova-classic" : "milo-classic";
  const previewOutfitItem =
    (previewOutfitEntry
      ? catalog.find((item) => item.item_key === previewOutfitEntry.item_key)
      : null) ??
    catalog.find(
      (item) => item.character_key === activeCharacter && item.item_key === defaultPreviewOutfitKey,
    ) ??
    null;

  const previewAccessoryLayers = previewEquipped
    .filter((entry) => entry.category === "accessory")
    .map((entry) => catalog.find((item) => item.item_key === entry.item_key))
    .filter((item): item is WardrobeCatalogRow => Boolean(item?.layer_image))
    .sort((a, b) => a.layer_order - b.layer_order);

  const placedPreviewAccessories = previewAccessoryLayers.map((item) => {
    const savedPlacement = userAccessoryFits[item.item_key];
    const activePlacement =
      adjustmentMode &&
      selectedItem?.item_key === item.item_key &&
      selectedItem.category === "accessory"
        ? placementDraft
        : {
            scale: Number(savedPlacement?.scale ?? 1),
            offset_x_pct: Number(savedPlacement?.offset_x_pct ?? 0),
            offset_y_pct: Number(savedPlacement?.offset_y_pct ?? 0),
          };

    return {
      ...item,
      fit_scale: Number(item.fit_scale ?? 1) * activePlacement.scale,
      fit_offset_x_pct: Number(item.fit_offset_x_pct ?? 0) + activePlacement.offset_x_pct,
      fit_offset_y_pct: Number(item.fit_offset_y_pct ?? 0) + activePlacement.offset_y_pct,
    };
  });

  const previewBackdropAccessories = placedPreviewAccessories.filter(
    (item) => item.accessory_slot === "effect",
  );
  const previewForegroundAccessories = placedPreviewAccessories.filter(
    (item) => item.accessory_slot !== "effect",
  );

  const isOwned = selectedItem
    ? selectedItem.is_starter || ownedItems.has(selectedItem.item_key)
    : false;

  const isEquipped = selectedItem
    ? effectiveEquipped.some((entry) => entry.item_key === selectedItem.item_key)
    : false;

  const busy = Boolean(purchasingItemKey || equippingItemKey || savingPlacementItemKey || purchasingCharacter);
  const miloCatalog = characterCatalog.find((entry) => entry.character_key === "milo");
  const miloUnlocked = unlockedCharacters.has("milo") || Boolean(miloCatalog?.is_starter);
  const selectedCategoryMeta =
    WARDROBE_CATEGORIES.find((entry) => entry.key === activeCategory) ??
    WARDROBE_CATEGORIES[0];
  const activeWardrobeRig = activeCharacter === "milo" ? MILO_WARDROBE_RIG : NOVA_WARDROBE_RIG;
  const adjustmentAvailable =
    (activeCharacter === "nova" || miloUnlocked) &&
    selectedItem?.character_key === activeCharacter &&
    selectedItem?.category === "accessory" &&
    Boolean(selectedItem?.layer_image);
  const selectedSavedPlacement = selectedItem?.category === "accessory"
    ? userAccessoryFits[selectedItem.item_key]
    : undefined;
  const savedPlacement: WardrobeUserPlacementDraft = {
    scale: Number(selectedSavedPlacement?.scale ?? 1),
    offset_x_pct: Number(selectedSavedPlacement?.offset_x_pct ?? 0),
    offset_y_pct: Number(selectedSavedPlacement?.offset_y_pct ?? 0),
  };
  const placementChanged = Boolean(
    selectedItem?.category === "accessory" &&
      (Math.abs(placementDraft.scale - savedPlacement.scale) > 0.0001 ||
        Math.abs(placementDraft.offset_x_pct - savedPlacement.offset_x_pct) > 0.0001 ||
        Math.abs(placementDraft.offset_y_pct - savedPlacement.offset_y_pct) > 0.0001),
  );

  function startPlacementDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!adjustmentMode || !selectedItem || selectedItem.category !== "accessory") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPlacementDrag({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: placementDraft.offset_x_pct,
      startOffsetY: placementDraft.offset_y_pct,
    });
  }

  function movePlacementDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!placementDrag || placementDrag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dxPct = ((event.clientX - placementDrag.startX) / rect.width) * 100;
    const dyPct = ((event.clientY - placementDrag.startY) / rect.height) * 100;
    setPlacementDraft((current) => ({
      ...current,
      offset_x_pct: Math.min(60, Math.max(-60, placementDrag.startOffsetX + dxPct)),
      offset_y_pct: Math.min(60, Math.max(-60, placementDrag.startOffsetY + dyPct)),
    }));
  }

  function endPlacementDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!placementDrag || placementDrag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPlacementDrag(null);
  }

  async function saveCurrentLook() {
    if (savingLook || exportingPng) return;
    setSavingLook(true);
    setLookActionMessage("");

    if (
      adjustmentMode &&
      placementChanged &&
      selectedItem?.category === "accessory" &&
      isEquipped
    ) {
      const placementSaved = await onSavePlacement(selectedItem.item_key, placementDraft);
      if (!placementSaved) {
        setSavingLook(false);
        setLookActionMessage("Save the accessory placement before saving this look.");
        return;
      }
    }

    const { data, error } = await supabase.rpc("save_nova_home_current_look", {
      p_character_key: activeCharacter,
    });

    setSavingLook(false);

    if (error) {
      setLookActionMessage(error.message || "Your look could not be saved.");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") {
      setLookActionMessage("Your look was saved.");
      return;
    }

    setLookActionMessage(`${activeCharacter === "nova" ? "Nova" : "Milo"} look saved.`);
  }

  async function downloadCurrentLookPng() {
    if (exportingPng || savingLook) return;
    if (!currentOutfitItem?.layer_image) {
      setLookActionMessage("Equip an outfit before downloading your character PNG.");
      return;
    }

    setExportingPng(true);
    setLookActionMessage("");

    try {
      const rig = activeCharacter === "milo" ? MILO_WARDROBE_RIG : NOVA_WARDROBE_RIG;
      const placements = Object.fromEntries(
        currentAccessoryItems.map((item) => {
          const useLiveDraft =
            adjustmentMode &&
            selectedItem?.item_key === item.item_key &&
            selectedItem.category === "accessory" &&
            isEquipped;
          const placement = useLiveDraft
            ? placementDraft
            : {
                scale: Number(userAccessoryFits[item.item_key]?.scale ?? 1),
                offset_x_pct: Number(userAccessoryFits[item.item_key]?.offset_x_pct ?? 0),
                offset_y_pct: Number(userAccessoryFits[item.item_key]?.offset_y_pct ?? 0),
              };
          return [item.item_key, placement];
        }),
      );

      const blob = await createWardrobeSnapshotPng({
        outfit: currentOutfitItem,
        accessories: currentAccessoryItems,
        placements,
        rig,
        size: 2048,
      });

      const dateStamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `dreamscape-${activeCharacter}-look-${dateStamp}.png`);
      setLookActionMessage("Transparent PNG created from your equipped look.");
    } catch (error) {
      console.error("Wardrobe PNG export failed:", error);
      setLookActionMessage(
        error instanceof Error ? error.message : "The PNG could not be created.",
      );
    } finally {
      setExportingPng(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#01040b]/88 p-2 backdrop-blur-md sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Nova Wardrobe Bay"
        className="relative grid h-[min(900px,calc(100dvh-16px))] w-[min(1500px,calc(100vw-16px))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[24px] border border-cyan-200/28 bg-[radial-gradient(circle_at_22%_25%,rgba(34,211,238,0.15),transparent_34%),linear-gradient(145deg,rgba(5,24,43,0.99),rgba(2,7,19,0.99))] text-white shadow-[0_40px_140px_rgba(0,0,0,0.78)] sm:h-[min(900px,calc(100dvh-32px))] sm:w-[min(1500px,calc(100vw-32px))] sm:rounded-[30px]"
      >
        <header className="grid shrink-0 gap-3 border-b border-white/[0.07] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/65">
                Sleep Zone Activity
              </p>
              <span className="rounded-full border border-cyan-200/16 bg-cyan-300/[0.06] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/70">
                Character Snapshot · Phase 2
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-[-0.035em] sm:text-3xl">
              Wardrobe Bay
            </h2>
            <p className="mt-1 max-w-2xl text-[10px] leading-4 text-white/46 sm:text-xs sm:leading-5">
              Choose a full outfit, position your accessories, then save the finished look or export your equipped character as a transparent PNG.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <button
              type="button"
              disabled={!adjustmentAvailable}
              onClick={() => setAdjustmentMode((current) => !current)}
              className={`min-h-10 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-35 ${
                adjustmentMode
                  ? "border-amber-200/35 bg-amber-300/[0.12] text-amber-100"
                  : "border-cyan-200/20 bg-cyan-300/[0.06] text-cyan-100/72 hover:bg-cyan-300/[0.1]"
              }`}
              title={adjustmentAvailable ? "Move and resize the selected accessory" : "Select an accessory first"}
            >
              {adjustmentMode ? "Done Adjusting" : "Adjust Accessory"}
            </button>
            <button
              type="button"
              disabled={busy || savingLook || exportingPng || (activeCharacter === "milo" && !miloUnlocked)}
              onClick={() => void saveCurrentLook()}
              className="min-h-10 rounded-full border border-emerald-200/22 bg-emerald-300/[0.07] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100/80 transition hover:bg-emerald-300/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
              title="Save your currently equipped outfit, accessories, and placements"
            >
              {savingLook ? "Saving..." : "Save Look"}
            </button>
            <button
              type="button"
              disabled={busy || savingLook || exportingPng || (activeCharacter === "milo" && !miloUnlocked)}
              onClick={() => void downloadCurrentLookPng()}
              className="min-h-10 rounded-full border border-violet-200/22 bg-violet-300/[0.07] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100/82 transition hover:bg-violet-300/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
              title="Download your equipped character on a transparent background"
            >
              {exportingPng ? "Creating PNG..." : "Download PNG"}
            </button>
            <div className="rounded-full border border-cyan-200/25 bg-slate-950/70 px-4 py-2 text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200/55">
                Dream Tokens
              </p>
              <p className="text-sm font-black text-cyan-50">{formatDT(dreamTokenBalance)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-xl text-white/80 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Close Wardrobe Bay"
            >
              ×
            </button>
          </div>
        </header>

        {lookActionMessage && (
          <div className="border-b border-white/[0.05] bg-cyan-300/[0.035] px-4 py-2 text-center text-[9px] font-bold text-cyan-100/76 sm:px-6 sm:text-[10px]">
            {lookActionMessage}
          </div>
        )}

        <div className="grid min-h-0 gap-2 p-2 sm:gap-3 sm:p-3 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-cyan-200/13 bg-slate-950/38 sm:rounded-[24px]">
            <div className="grid grid-cols-2 gap-2 border-b border-white/[0.06] p-2 sm:p-3">
              <button
                type="button"
                onClick={() => onCharacterChange("nova")}
                className={`rounded-[14px] border px-3 py-2 text-left transition ${
                  activeCharacter === "nova"
                    ? "border-cyan-200/34 bg-cyan-300/[0.11]"
                    : "border-white/9 bg-white/[0.025] hover:bg-white/[0.05]"
                }`}
              >
                <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200/58">
                  Character
                </span>
                <strong className="mt-0.5 block text-sm text-white">Nova</strong>
              </button>
              <button
                type="button"
                onClick={() => onCharacterChange("milo")}
                className={`rounded-[14px] border px-3 py-2 text-left transition ${
                  activeCharacter === "milo"
                    ? miloUnlocked
                      ? "border-emerald-200/30 bg-emerald-300/[0.09]"
                      : "border-amber-200/30 bg-amber-300/[0.08]"
                    : "border-white/9 bg-white/[0.025] hover:bg-white/[0.05]"
                }`}
              >
                <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                  Character
                </span>
                <strong className="mt-0.5 flex items-center gap-2 text-sm text-white/82">
                  Milo
                  <span className={`text-[9px] ${miloUnlocked ? "text-emerald-200/75" : "text-amber-200/75"}`}>
                    {miloUnlocked ? "✓ Unlocked" : `🔒 ${formatDT(miloCatalog?.dt_cost ?? 1000)}`}
                  </span>
                </strong>
              </button>
            </div>

            <div className="relative flex min-h-0 items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_36%,rgba(83,215,255,0.16),transparent_34%),linear-gradient(180deg,rgba(5,21,39,0.26),rgba(2,7,19,0.64))] px-4 pt-2">
              <div className="pointer-events-none absolute inset-x-[12%] bottom-[8%] h-[22%] rounded-[50%] bg-cyan-300/[0.08] blur-2xl" />
              <div className="relative flex h-full max-h-[680px] w-full max-w-[560px] items-start justify-center pt-0">
                {activeCharacter === "nova" || miloUnlocked ? (
                  <div
                    className={`relative aspect-square w-[min(100%,535px)] shrink-0 ${
                      adjustmentMode
                        ? placementDrag
                          ? "cursor-grabbing"
                          : "cursor-grab"
                        : ""
                    }`}
                    style={{ touchAction: adjustmentMode ? "none" : undefined }}
                    onPointerDown={startPlacementDrag}
                    onPointerMove={movePlacementDrag}
                    onPointerUp={endPlacementDrag}
                    onPointerCancel={endPlacementDrag}
                  >
                    {previewBackdropAccessories.map((item) => (
                      <WardrobeFittedLayer
                        key={item.item_key}
                        item={item}
                        rig={activeWardrobeRig}
                      />
                    ))}
                    {previewOutfitItem?.layer_image ? (
                      <img
                        src={previewOutfitItem.layer_image}
                        alt={previewOutfitItem.title}
                        className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain object-bottom drop-shadow-[0_28px_44px_rgba(0,0,0,0.55)]"
                        draggable={false}
                      />
                    ) : activeCharacter === "nova" ? (
                      <img
                        src={NOVA_CHARACTER_IMAGE}
                        alt="Nova wardrobe preview"
                        className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain object-bottom drop-shadow-[0_28px_44px_rgba(0,0,0,0.55)]"
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
                        Milo outfit loading...
                      </div>
                    )}
                    {previewForegroundAccessories.map((item) => (
                      <WardrobeFittedLayer
                        key={item.item_key}
                        item={item}
                        rig={activeWardrobeRig}
                      />
                    ))}

                  </div>
                ) : (
                  <div className="relative z-20 mb-auto mt-auto w-[min(360px,90%)] rounded-[24px] border border-amber-200/24 bg-slate-950/76 p-5 text-center shadow-[0_28px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/[0.1] text-4xl font-black text-amber-100">
                      M
                    </div>
                    <h3 className="mt-4 text-xl font-black text-white">Milo</h3>
                    <p className="mt-2 text-[11px] leading-5 text-white/48">
                      {miloCatalog?.description || "Bring Milo into Nova's Home as a permanent customisable character."}
                    </p>
                    <button
                        type="button"
                        onClick={() => onPurchaseCharacter("milo")}
                        disabled={Boolean(purchasingCharacter) || dreamTokenBalance < (miloCatalog?.dt_cost ?? 1000)}
                        className={`mt-4 min-h-11 w-full rounded-full px-5 text-[10px] font-black uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          dreamTokenBalance >= (miloCatalog?.dt_cost ?? 1000)
                            ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                            : "border border-white/10 bg-white/[0.04] text-white/34"
                        }`}
                      >
                        {purchasingCharacter === "milo"
                          ? "Unlocking Milo..."
                          : dreamTokenBalance >= (miloCatalog?.dt_cost ?? 1000)
                            ? `Unlock Permanently · ${formatDT(miloCatalog?.dt_cost ?? 1000)}`
                            : `Need ${formatDT((miloCatalog?.dt_cost ?? 1000) - dreamTokenBalance)}`}
                      </button>
                  </div>
                )}
              </div>

            </div>

            <div className="border-t border-white/[0.06] p-2 sm:p-3">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/34">
                Equipped Look
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {effectiveEquipped.map((entry) => {
                  const item = catalog.find((candidate) => candidate.item_key === entry.item_key);
                  if (!item) return null;
                  return (
                    <span
                      key={`${entry.category}-${entry.item_key}`}
                      className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[8px] font-bold text-white/58"
                    >
                      {item.title}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.025] sm:rounded-[24px]">
            <div className="border-b border-white/[0.06] p-2 sm:p-3">
              <div className="grid grid-cols-2 gap-1.5">
                {WARDROBE_CATEGORIES.map((category) => {
                  const active = activeCategory === category.key;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => onCategoryChange(category.key)}
                      className={`rounded-[12px] border px-1.5 py-2 text-center transition sm:px-2 ${
                        active
                          ? "border-cyan-200/38 bg-cyan-300/[0.11] text-cyan-50"
                          : "border-white/[0.07] bg-white/[0.025] text-white/45 hover:bg-white/[0.055]"
                      }`}
                    >
                      <span className="block text-sm">{category.icon}</span>
                      <span className="mt-0.5 block truncate text-[8px] font-black uppercase tracking-[0.08em] sm:text-[9px]">
                        {category.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-2 [scrollbar-width:thin] sm:p-3">
              {setupError ? (
                <div className="rounded-[18px] border border-amber-200/28 bg-amber-300/[0.08] p-4 text-xs leading-5 text-amber-50/88">
                  {setupError}
                </div>
              ) : loading ? (
                <div className="flex h-full min-h-[220px] items-center justify-center">
                  <div className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/72">
                    Loading wardrobe...
                  </div>
                </div>
              ) : activeCharacter === "milo" && !miloUnlocked ? (
                <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center">
                  <div>
                    <p className="text-sm font-black text-white/70">Unlock Milo to use his wardrobe</p>
                    <p className="mt-2 text-[10px] leading-5 text-white/36">
                      Milo is a one-time {formatDT(miloCatalog?.dt_cost ?? 1000)} unlock.
                    </p>
                  </div>
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="flex h-full min-h-[220px] items-center justify-center text-center text-xs text-white/38">
                  No {selectedCategoryMeta.label.toLowerCase()} have been added yet.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleItems.map((item) => {
                    const owned = item.is_starter || ownedItems.has(item.item_key);
                    const equipped = effectiveEquipped.some(
                      (entry) => entry.item_key === item.item_key,
                    );
                    const selected = selectedItem?.item_key === item.item_key;

                    return (
                      <button
                        key={item.item_key}
                        type="button"
                        onClick={() => onSelectItem(item.item_key)}
                        className={`group relative min-h-[118px] overflow-hidden rounded-[16px] border p-3 text-left transition ${
                          selected
                            ? "border-cyan-200/48 bg-cyan-300/[0.09] shadow-[0_0_24px_rgba(83,215,255,0.09)]"
                            : "border-white/[0.075] bg-slate-950/34 hover:border-white/16 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-white/10 text-sm font-black"
                            style={{
                              background: `${item.accent_hex}18`,
                              color: item.accent_hex,
                              borderColor: `${item.accent_hex}45`,
                            }}
                          >
                            {item.thumbnail_image ? (
                              <img
                                src={item.thumbnail_image}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              selectedCategoryMeta.icon
                            )}
                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[0.09em] ${
                              equipped
                                ? "bg-emerald-300/12 text-emerald-200"
                                : owned
                                  ? "bg-cyan-300/9 text-cyan-200/75"
                                  : "bg-white/[0.045] text-white/40"
                            }`}
                          >
                            {equipped ? "Equipped" : owned ? "Owned" : formatDT(item.dt_cost)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <p className="min-w-0 truncate text-xs font-black text-white">
                            {item.title}
                          </p>
                          <span className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-white/42">
                            {getWardrobeCollectionLabel(item.item_key)}
                          </span>
                          {item.category === "accessory" && item.accessory_slot && (
                            <span className="rounded-full border border-cyan-200/12 bg-cyan-300/[0.05] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-cyan-100/60">
                              {getAccessorySlotLabel(item.accessory_slot)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 max-h-8 overflow-hidden text-[9px] leading-4 text-white/38">
                          {item.description || "Nova wardrobe item."}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.07] bg-slate-950/48 p-3 sm:p-4">
              {adjustmentMode && selectedItem && selectedItem.category === "accessory" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-white sm:text-base">Adjust {selectedItem.title}</h3>
                        {placementChanged && (
                          <span className="rounded-full border border-fuchsia-200/18 bg-fuchsia-300/[0.07] px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-fuchsia-100/70">
                            Unsaved changes
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[9px] leading-4 text-white/44 sm:text-[10px]">
                        Drag anywhere on the character preview to move this accessory. Resize it with the scale control, then save the placement to your account.
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.05] px-3 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-100/65">
                      {selectedItem.accessory_slot ? `${getAccessorySlotLabel(selectedItem.accessory_slot)} slot` : "Accessory"}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto_auto] sm:items-end">
                    <CalibrationNumberControl
                      label="Accessory size"
                      value={placementDraft.scale}
                      min={0.05}
                      max={3}
                      step={0.01}
                      onChange={(value) => setPlacementDraft((current) => ({ ...current, scale: value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setPlacementDraft((current) => ({ ...current, offset_x_pct: Math.max(-60, current.offset_x_pct - 1) }))}
                      className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white/70 hover:bg-white/[0.08]"
                      aria-label="Move accessory left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacementDraft((current) => ({ ...current, offset_x_pct: Math.min(60, current.offset_x_pct + 1) }))}
                      className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white/70 hover:bg-white/[0.08]"
                      aria-label="Move accessory right"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacementDraft((current) => ({ ...current, offset_y_pct: Math.max(-60, current.offset_y_pct - 1) }))}
                      className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white/70 hover:bg-white/[0.08]"
                      aria-label="Move accessory up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlacementDraft((current) => ({ ...current, offset_y_pct: Math.min(60, current.offset_y_pct + 1) }))}
                      className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white/70 hover:bg-white/[0.08]"
                      aria-label="Move accessory down"
                    >
                      ↓
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPlacementDraft({ scale: 1, offset_x_pct: 0, offset_y_pct: 0 })}
                        disabled={Boolean(savingPlacementItemKey)}
                        className="min-h-10 rounded-full border border-white/12 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.09em] text-white/62 transition hover:bg-white/[0.075] disabled:opacity-40"
                      >
                        Reset Position
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlacementDraft(savedPlacement)}
                        disabled={!placementChanged || Boolean(savingPlacementItemKey)}
                        className="min-h-10 rounded-full border border-white/12 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.09em] text-white/62 transition hover:bg-white/[0.075] disabled:opacity-35"
                      >
                        Undo Changes
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!isOwned || Boolean(savingPlacementItemKey)}
                      onClick={() => void onSavePlacement(selectedItem.item_key, placementDraft)}
                      className="min-h-10 rounded-full bg-amber-300 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
                      title={isOwned ? "Save your accessory placement" : "Buy this accessory before saving its placement"}
                    >
                      {savingPlacementItemKey === selectedItem.item_key
                        ? "Saving..."
                        : isOwned
                          ? "Save Placement"
                          : "Buy to Save"}
                    </button>
                  </div>
                  {message && (
                    <p className="text-[9px] font-bold leading-4 text-amber-100/82 sm:text-[10px]">{message}</p>
                  )}
                </div>
              ) : selectedItem ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-white sm:text-base">{selectedItem.title}</h3>
                      <span className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/38">
                        {selectedCategoryMeta.shortLabel}
                      </span>
                      <span className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/38">
                        {getWardrobeCollectionLabel(selectedItem.item_key)}
                      </span>
                      {selectedItem.category === "accessory" && selectedItem.accessory_slot && (
                        <span className="rounded-full border border-cyan-200/12 bg-cyan-300/[0.05] px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-cyan-100/60">
                          {getAccessorySlotLabel(selectedItem.accessory_slot)} Slot
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-2xl text-[9px] leading-4 text-white/42 sm:text-[10px]">
                      {selectedItem.description}
                    </p>
                    {message && (
                      <p className="mt-1.5 text-[9px] font-bold leading-4 text-amber-100/82 sm:text-[10px]">
                        {message}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 sm:min-w-[190px]">
                    {isEquipped && selectedItem.category === "accessory" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUnequip(selectedItem.item_key)}
                        className="min-h-11 w-full rounded-full border border-rose-200/22 bg-rose-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-rose-100 transition hover:bg-rose-300/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {equippingItemKey === selectedItem.item_key ? "Unequipping..." : "Unequip Accessory"}
                      </button>
                    ) : isEquipped ? (
                      <span className="flex min-h-11 w-full items-center justify-center rounded-full border border-emerald-200/22 bg-emerald-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
                        ✓ Equipped
                      </span>
                    ) : isOwned ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onEquip(selectedItem.item_key)}
                        className="min-h-11 w-full rounded-full bg-cyan-300 px-5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {equippingItemKey === selectedItem.item_key ? "Equipping..." : "Wear This"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || dreamTokenBalance < selectedItem.dt_cost}
                        onClick={() => onPurchase(selectedItem.item_key)}
                        className={`min-h-11 w-full rounded-full px-5 text-[10px] font-black uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          dreamTokenBalance >= selectedItem.dt_cost
                            ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                            : "border border-white/10 bg-white/[0.04] text-white/34"
                        }`}
                      >
                        {purchasingItemKey === selectedItem.item_key
                          ? "Buying..."
                          : dreamTokenBalance >= selectedItem.dt_cost
                            ? `Buy & Wear · ${formatDT(selectedItem.dt_cost)}`
                            : `Need ${formatDT(selectedItem.dt_cost - dreamTokenBalance)}`}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center text-[10px] text-white/36">{activeCharacter === "milo" && !miloUnlocked
                    ? "Unlock Milo from the character preview to continue."
                    : "Select a wardrobe item."}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CalibrationNumberControl({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;

  function commit(next: number) {
    if (!Number.isFinite(next)) return;
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <div className="rounded-[14px] border border-white/9 bg-white/[0.025] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/42">{label}</span>
        <span className="text-[9px] font-black text-cyan-100/72">
          {Number(safeValue.toFixed(2))}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(event) => commit(Number(event.target.value))}
        className="mt-2 w-full accent-cyan-300"
      />
      <div className="mt-1.5 grid grid-cols-[32px_minmax(0,1fr)_32px] gap-1.5">
        <button
          type="button"
          onClick={() => commit(safeValue - step)}
          className="h-7 rounded-lg border border-white/10 bg-white/[0.035] text-sm font-black text-white/60 hover:bg-white/[0.07]"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(safeValue.toFixed(2))}
          onChange={(event) => commit(Number(event.target.value))}
          className="h-7 min-w-0 rounded-lg border border-white/10 bg-slate-950/65 px-2 text-center text-[9px] font-bold text-white/72 outline-none focus:border-cyan-200/35"
        />
        <button
          type="button"
          onClick={() => commit(safeValue + step)}
          className="h-7 rounded-lg border border-white/10 bg-white/[0.035] text-sm font-black text-white/60 hover:bg-white/[0.07]"
        >
          +
        </button>
      </div>
    </div>
  );
}

