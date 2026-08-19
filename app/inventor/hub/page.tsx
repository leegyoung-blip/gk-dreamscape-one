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
import RugCollectionPanel, {
  type CleaningToolCatalogItem,
  type RugCatalogItem,
} from "@/components/nova-home/RugCollectionPanel";
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

type RugPurchaseResult = {
  rug_key: string;
  currency_code: "DT" | "DG";
  cost_paid: number;
  new_dt_balance: number;
  new_dg_balance: number;
  already_owned: boolean;
};

type CleaningToolPurchaseResult = {
  cleaning_tool_key: string;
  currency_code: "DT" | "DG";
  cost_paid: number;
  new_dt_balance: number;
  new_dg_balance: number;
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
    text: "Unlock the Workstation, Display Shelf, and Comfort & Decor whenever you want. Comfort & Decor opens Rug Rush and Nova’s Rug Collection, where you can buy and equip different rugs using DT or special DG rugs.",
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
const DEFAULT_RUG_KEY = "nova-classic-rug";
const DEFAULT_RUG_GAME_IMAGE = "/activities/nova-home/rugs/nova-classic-rug.png";
const DEFAULT_CLEANING_TOOL_KEY = "yellow-sponge";
const DEFAULT_CLEANING_TOOL_IMAGE = "/activities/nova-home/rug-rush/yellow-sponge.png";

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

function formatDG(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DG`;
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

function getRugPurchaseResult(data: unknown): RugPurchaseResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const result = row as Record<string, unknown>;
  const rugKey = String(result.rug_key || "");
  const currencyCode = String(result.currency_code || "");
  const costPaid = Number(result.cost_paid);
  const newDtBalance = Number(result.new_dt_balance);
  const newDgBalance = Number(result.new_dg_balance);
  const alreadyOwned = Boolean(result.already_owned);

  if (
    !rugKey ||
    (currencyCode !== "DT" && currencyCode !== "DG") ||
    !Number.isFinite(costPaid) ||
    !Number.isFinite(newDtBalance) ||
    !Number.isFinite(newDgBalance)
  ) {
    return null;
  }

  return {
    rug_key: rugKey,
    currency_code: currencyCode,
    cost_paid: costPaid,
    new_dt_balance: newDtBalance,
    new_dg_balance: newDgBalance,
    already_owned: alreadyOwned,
  };
}

function getCleaningToolPurchaseResult(data: unknown): CleaningToolPurchaseResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const result = row as Record<string, unknown>;
  const cleaningToolKey = String(result.cleaning_tool_key || "");
  const currencyCode = String(result.currency_code || "");
  const costPaid = Number(result.cost_paid);
  const newDtBalance = Number(result.new_dt_balance);
  const newDgBalance = Number(result.new_dg_balance);
  const alreadyOwned = Boolean(result.already_owned);

  if (
    !cleaningToolKey ||
    (currencyCode !== "DT" && currencyCode !== "DG") ||
    !Number.isFinite(costPaid) ||
    !Number.isFinite(newDtBalance) ||
    !Number.isFinite(newDgBalance)
  ) {
    return null;
  }

  return {
    cleaning_tool_key: cleaningToolKey,
    currency_code: currencyCode,
    cost_paid: costPaid,
    new_dt_balance: newDtBalance,
    new_dg_balance: newDgBalance,
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
  const novaHomeRootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const roomViewportRef = useRef<HTMLDivElement | null>(null);
  const maskPixelsRef = useRef<Map<ZoneKey, MaskPixels>>(new Map());
  const rugRushSparkleTimerRef = useRef<number | null>(null);
  const intendedFullscreenExitRef = useRef(false);
  const wasFullscreenRef = useRef(false);
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const touchGestureRef = useRef({
    mode: "none" as "none" | "pan" | "pinch",
    startScale: 1,
    startPanX: 0,
    startPanY: 0,
    startPointerX: 0,
    startPointerY: 0,
    startDistance: 0,
    startMidX: 0,
    startMidY: 0,
    moved: false,
    hadPinch: false,
  });

  const [currentArea, setCurrentArea] = useState<AreaKey>("area-1");
  const [area2ImageFailed, setArea2ImageFailed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [dreamGemBalance, setDreamGemBalance] = useState(0);
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
  const [rugCollectionOpen, setRugCollectionOpen] = useState(false);
  const [rugCollectionLoading, setRugCollectionLoading] = useState(true);
  const [rugCatalog, setRugCatalog] = useState<RugCatalogItem[]>([]);
  const [rugOwned, setRugOwned] = useState<Set<string>>(() => new Set([DEFAULT_RUG_KEY]));
  const [equippedRugKey, setEquippedRugKey] = useState(DEFAULT_RUG_KEY);
  const [selectedRugKey, setSelectedRugKey] = useState<string | null>(DEFAULT_RUG_KEY);
  const [rugPurchasingKey, setRugPurchasingKey] = useState<string | null>(null);
  const [rugEquippingKey, setRugEquippingKey] = useState<string | null>(null);
  const [cleaningToolCatalog, setCleaningToolCatalog] = useState<CleaningToolCatalogItem[]>([]);
  const [cleaningToolOwned, setCleaningToolOwned] = useState<Set<string>>(() => new Set([DEFAULT_CLEANING_TOOL_KEY]));
  const [equippedCleaningToolKey, setEquippedCleaningToolKey] = useState(DEFAULT_CLEANING_TOOL_KEY);
  const [selectedCleaningToolKey, setSelectedCleaningToolKey] = useState<string | null>(DEFAULT_CLEANING_TOOL_KEY);
  const [cleaningToolPurchasingKey, setCleaningToolPurchasingKey] = useState<string | null>(null);
  const [cleaningToolEquippingKey, setCleaningToolEquippingKey] = useState<string | null>(null);
  const [rugMessage, setRugMessage] = useState("");

  const [responsiveReady, setResponsiveReady] = useState(false);
  const [landscapeRequired, setLandscapeRequired] = useState(false);
  const [portraitOrientation, setPortraitOrientation] = useState(false);
  const [touchDeviceLayout, setTouchDeviceLayout] = useState(false);
  const [phoneDeviceLayout, setPhoneDeviceLayout] = useState(false);
  const [phoneLandscapeLayout, setPhoneLandscapeLayout] = useState(false);
  const [isIOSPhone, setIsIOSPhone] = useState(false);
  const [isStandaloneWebApp, setIsStandaloneWebApp] = useState(false);
  const [phoneWindowedExitAllowed, setPhoneWindowedExitAllowed] = useState(false);
  const [fullscreenResumeRequired, setFullscreenResumeRequired] = useState(false);
  const [mobileZoneMenuOpen, setMobileZoneMenuOpen] = useState(false);
  const [mobileZonePanelOpen, setMobileZonePanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const [roomTransform, setRoomTransform] = useState({ scale: 1, x: 0, y: 0 });

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
  const guideTargetZoneKey = guideOpen
    ? NOVA_HOME_GUIDE_STEPS[guideStep]?.targetZoneKey ?? null
    : null;
  const touchExploreEnabled =
    touchDeviceLayout && !portraitOrientation && currentArea === "area-1";
  const phoneImmersiveActive = isFullscreen || isStandaloneWebApp;
  const phoneFullscreenGateRequired =
    responsiveReady &&
    phoneDeviceLayout &&
    !portraitOrientation &&
    !phoneWindowedExitAllowed &&
    !phoneImmersiveActive;
  const touchHeaderHeight = phoneLandscapeLayout ? 48 : 62;
  const touchPreferredZoom = phoneLandscapeLayout ? 1.2 : 1.08;

  const equippedRug = useMemo(
    () => rugCatalog.find((rug) => rug.rug_key === equippedRugKey) ?? rugCatalog.find((rug) => rug.rug_key === DEFAULT_RUG_KEY) ?? null,
    [equippedRugKey, rugCatalog],
  );
  const equippedCleaningTool = useMemo(
    () =>
      cleaningToolCatalog.find((tool) => tool.cleaning_tool_key === equippedCleaningToolKey) ??
      cleaningToolCatalog.find((tool) => tool.cleaning_tool_key === DEFAULT_CLEANING_TOOL_KEY) ??
      null,
    [cleaningToolCatalog, equippedCleaningToolKey],
  );

  useEffect(() => {
    function updateResponsiveMode() {
      const ua = navigator.userAgent || "";
      const platform = navigator.platform || "";
      const touchPoints = Number(navigator.maxTouchPoints || 0);
      const appleTouchTablet = platform === "MacIntel" && touchPoints > 1;
      const touchPhoneOrTablet =
        /Android|iPhone|iPad|iPod/i.test(ua) || appleTouchTablet;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const portrait = touchPhoneOrTablet && height > width;
      const screenShortSide = Math.min(
        Number(window.screen?.width || width),
        Number(window.screen?.height || height),
      );
      const phoneClass = touchPhoneOrTablet && screenShortSide <= 600;
      const shortLandscapePhone = phoneClass && width >= height;
      const iosPhone =
        /iPhone|iPod/i.test(ua) ||
        (appleTouchTablet && phoneClass);
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches === true ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

      setLandscapeRequired(touchPhoneOrTablet);
      setPortraitOrientation(portrait);
      setTouchDeviceLayout(touchPhoneOrTablet);
      setPhoneDeviceLayout(phoneClass);
      setPhoneLandscapeLayout(shortLandscapePhone);
      setIsIOSPhone(iosPhone);
      setIsStandaloneWebApp(standalone);
      setResponsiveReady(true);

      if (!touchPhoneOrTablet) {
        setMobileZoneMenuOpen(false);
        setMobileZonePanelOpen(false);
      }
    }

    updateResponsiveMode();
    window.addEventListener("resize", updateResponsiveMode);
    window.addEventListener("orientationchange", updateResponsiveMode);

    return () => {
      window.removeEventListener("resize", updateResponsiveMode);
      window.removeEventListener("orientationchange", updateResponsiveMode);
    };
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      const documentWithWebkit = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      setIsFullscreen(
        Boolean(document.fullscreenElement || documentWithWebkit.webkitFullscreenElement),
      );
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!responsiveReady || !phoneDeviceLayout || isStandaloneWebApp) {
      wasFullscreenRef.current = isFullscreen;
      return;
    }

    const wasFullscreen = wasFullscreenRef.current;
    if (isFullscreen) {
      setFullscreenResumeRequired(false);
      setPhoneWindowedExitAllowed(false);
      intendedFullscreenExitRef.current = false;
    } else if (wasFullscreen && !intendedFullscreenExitRef.current) {
      // Browsers do not let a page silently re-enter fullscreen after the user
      // or OS exits it. Instead, immediately block gameplay until the user
      // explicitly resumes fullscreen with one tap.
      setFullscreenResumeRequired(true);
      setPhoneWindowedExitAllowed(false);
    }

    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen, isStandaloneWebApp, phoneDeviceLayout, responsiveReady]);

  const clampRoomTransform = useCallback(
    (next: { scale: number; x: number; y: number }) => {
      const scale = Math.max(1, Math.min(2.8, next.scale));
      const viewport = roomViewportRef.current;
      if (!viewport || stageSize.width <= 0 || stageSize.height <= 0) {
        return { scale, x: next.x, y: next.y };
      }

      const rect = viewport.getBoundingClientRect();
      const renderedWidth = stageSize.width * scale;
      const renderedHeight = stageSize.height * scale;
      const maxX = Math.max(0, (renderedWidth - rect.width) / 2);
      const maxY = Math.max(0, (renderedHeight - rect.height) / 2);

      return {
        scale,
        x: Math.max(-maxX, Math.min(maxX, next.x)),
        y: Math.max(-maxY, Math.min(maxY, next.y)),
      };
    },
    [stageSize.height, stageSize.width],
  );

  const resetTouchRoomView = useCallback(() => {
    if (!touchExploreEnabled) {
      setRoomTransform({ scale: 1, x: 0, y: 0 });
      return;
    }

    const viewportRect = roomViewportRef.current?.getBoundingClientRect();
    const coverScale =
      viewportRect && stageSize.width > 0 && stageSize.height > 0
        ? Math.max(
            viewportRect.width / stageSize.width,
            viewportRect.height / stageSize.height,
          )
        : 1;
    const initialScale = Math.min(2, Math.max(touchPreferredZoom, coverScale * 1.02));

    setRoomTransform(
      clampRoomTransform({ scale: initialScale, x: 0, y: 0 }),
    );
  }, [
    clampRoomTransform,
    stageSize.height,
    stageSize.width,
    touchExploreEnabled,
    touchPreferredZoom,
  ]);

  useEffect(() => {
    if (!touchExploreEnabled) {
      setRoomTransform({ scale: 1, x: 0, y: 0 });
      return;
    }

    const frame = window.requestAnimationFrame(() => resetTouchRoomView());
    return () => window.cancelAnimationFrame(frame);
  }, [
    currentArea,
    isFullscreen,
    phoneLandscapeLayout,
    resetTouchRoomView,
    stageSize.height,
    stageSize.width,
    touchExploreEnabled,
  ]);

  async function toggleNovaHomeFullscreen() {
    const element = novaHomeRootRef.current;
    if (!element) return;

    // iPhone Safari does not expose arbitrary-element fullscreen for ordinary
    // webpages. When Nova Home is launched as a Home Screen web app, the
    // browser chrome is already removed, so this button exits Nova Home instead.
    if (phoneDeviceLayout && isStandaloneWebApp) {
      setPhoneWindowedExitAllowed(true);
      router.push("/inventor");
      return;
    }

    const documentWithWebkit = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const elementWithWebkit = element as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const fullscreenElement =
      document.fullscreenElement || documentWithWebkit.webkitFullscreenElement;

    try {
      setFullscreenMessage("");
      if (fullscreenElement) {
        intendedFullscreenExitRef.current = true;
        setFullscreenResumeRequired(false);
        setPhoneWindowedExitAllowed(true);
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (documentWithWebkit.webkitExitFullscreen) {
          await documentWithWebkit.webkitExitFullscreen();
        }
        window.setTimeout(() => {
          intendedFullscreenExitRef.current = false;
        }, 250);
      } else if (element.requestFullscreen) {
        intendedFullscreenExitRef.current = false;
        setPhoneWindowedExitAllowed(false);
        setFullscreenResumeRequired(false);
        await element.requestFullscreen({ navigationUI: "hide" });
      } else if (elementWithWebkit.webkitRequestFullscreen) {
        intendedFullscreenExitRef.current = false;
        setPhoneWindowedExitAllowed(false);
        setFullscreenResumeRequired(false);
        await elementWithWebkit.webkitRequestFullscreen();
      } else {
        setFullscreenMessage(
          isIOSPhone
            ? "iPhone Safari requires Nova Home to be opened from the Home Screen for browser-free play."
            : "Fullscreen is not available in this browser.",
        );
      }
    } catch {
      setFullscreenMessage(
        "Fullscreen could not be opened. Tap Resume Full Screen again after interacting with the page.",
      );
    }
  }

  async function resumeRequiredPhoneFullscreen() {
    intendedFullscreenExitRef.current = false;
    setPhoneWindowedExitAllowed(false);
    setFullscreenResumeRequired(false);
    await toggleNovaHomeFullscreen();
  }

  useEffect(() => {
    if (!fullscreenMessage) return;
    const timer = window.setTimeout(() => setFullscreenMessage(""), 3600);
    return () => window.clearTimeout(timer);
  }, [fullscreenMessage]);

  useEffect(() => {
    if (!authChecked || wardrobeOpen || rugRushOpen || rugCollectionOpen) return;

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
  }, [authChecked, wardrobeOpen, rugRushOpen, rugCollectionOpen]);

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
    setMobileZoneMenuOpen(false);
    setMobileZonePanelOpen(false);
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
    setRugCollectionOpen(false);
    setGuideOpen(false);
    setMobileZoneMenuOpen(false);
    setMobileZonePanelOpen(false);
    setSelectedZoneKey("extra-zone");
    setHoveredZoneKey("extra-zone");
    setMessage("");
    setRugRushOpen(true);
  }

  function openRugCollection() {
    if (!unlockedZones.has("extra-zone")) return;
    setGuideOpen(false);
    setRugRushOpen(false);
    setMobileZoneMenuOpen(false);
    setMobileZonePanelOpen(false);
    setSelectedZoneKey("extra-zone");
    setHoveredZoneKey("extra-zone");
    setRugMessage("");
    setSelectedRugKey(equippedRugKey || DEFAULT_RUG_KEY);
    setSelectedCleaningToolKey(equippedCleaningToolKey || DEFAULT_CLEANING_TOOL_KEY);
    setRugCollectionOpen(true);
  }

  function closeRugCollection() {
    setRugCollectionOpen(false);
    setRugMessage("");
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
      setRugCollectionLoading(false);
      router.replace("/login");
      return;
    }

    setRugCollectionLoading(true);

    const [
      balanceResult,
      gemResult,
      catalogResult,
      unlockResult,
      rugCatalogResult,
      rugOwnershipResult,
      rugEquippedResult,
      cleaningToolCatalogResult,
      cleaningToolOwnershipResult,
      cleaningToolEquippedResult,
    ] = await Promise.all([
      supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual"),
      supabase
        .from("profiles")
        .select("dream_gem_balance")
        .eq("id", user.id)
        .maybeSingle(),
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
      supabase
        .from("nova_home_rug_catalog")
        .select("rug_key,title,description,currency_code,price_amount,game_image,room_image,thumbnail_image,is_starter,is_placeholder,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("nova_home_rug_ownership")
        .select("rug_key")
        .eq("user_id", user.id),
      supabase
        .from("nova_home_rug_equipped")
        .select("rug_key")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("nova_home_cleaning_tool_catalog")
        .select("cleaning_tool_key,title,description,currency_code,price_amount,power_multiplier,game_image,thumbnail_image,is_starter,is_placeholder,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("nova_home_cleaning_tool_ownership")
        .select("cleaning_tool_key")
        .eq("user_id", user.id),
      supabase
        .from("nova_home_cleaning_tool_equipped")
        .select("cleaning_tool_key")
        .eq("user_id", user.id)
        .maybeSingle(),
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

    if (gemResult.error) {
      console.warn("Could not load Dream Gem balance:", gemResult.error.message);
      setDreamGemBalance(0);
    } else {
      setDreamGemBalance(Math.max(0, Number(gemResult.data?.dream_gem_balance || 0)));
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

    if (rugCatalogResult.error) {
      console.warn("Could not load Nova Home rug catalog:", rugCatalogResult.error.message);
      setRugCatalog([]);
      setRugMessage("Rug Collection is not ready yet. Run SQL 319 in Supabase.");
    } else {
      const rugs = (rugCatalogResult.data || []).map((row) => ({
        rug_key: String(row.rug_key || ""),
        title: String(row.title || "Rug"),
        description: row.description ? String(row.description) : null,
        currency_code: String(row.currency_code || "DT") === "DG" ? "DG" as const : "DT" as const,
        price_amount: Math.max(0, Number(row.price_amount || 0)),
        game_image: String(row.game_image || DEFAULT_RUG_GAME_IMAGE),
        room_image: row.room_image ? String(row.room_image) : null,
        thumbnail_image: row.thumbnail_image ? String(row.thumbnail_image) : null,
        is_starter: Boolean(row.is_starter),
        is_placeholder: Boolean(row.is_placeholder),
        sort_order: Number(row.sort_order || 0),
      })) satisfies RugCatalogItem[];
      setRugCatalog(rugs);

      const validKeys = new Set(rugs.map((rug) => rug.rug_key));
      const owned = new Set<string>([DEFAULT_RUG_KEY]);
      if (!rugOwnershipResult.error) {
        (rugOwnershipResult.data || []).forEach((row) => {
          const key = String(row.rug_key || "");
          if (validKeys.has(key)) owned.add(key);
        });
      }
      setRugOwned(owned);

      const savedEquipped = rugEquippedResult.error ? "" : String(rugEquippedResult.data?.rug_key || "");
      const nextEquipped = validKeys.has(savedEquipped) ? savedEquipped : DEFAULT_RUG_KEY;
      setEquippedRugKey(nextEquipped);
      setSelectedRugKey((current) => current && validKeys.has(current) ? current : nextEquipped);
    }

    if (cleaningToolCatalogResult.error) {
      console.warn("Could not load Rug Rush cleaning tool catalog:", cleaningToolCatalogResult.error.message);
      setCleaningToolCatalog([]);
      setRugMessage("Cleaning tools are not ready yet. Run SQL 320 in Supabase.");
    } else {
      const tools = (cleaningToolCatalogResult.data || []).map((row) => ({
        cleaning_tool_key: String(row.cleaning_tool_key || ""),
        title: String(row.title || "Cleaning Tool"),
        description: row.description ? String(row.description) : null,
        currency_code: String(row.currency_code || "DT") === "DG" ? "DG" as const : "DT" as const,
        price_amount: Math.max(0, Number(row.price_amount || 0)),
        power_multiplier: Math.max(0.5, Number(row.power_multiplier || 1)),
        game_image: String(row.game_image || DEFAULT_CLEANING_TOOL_IMAGE),
        thumbnail_image: row.thumbnail_image ? String(row.thumbnail_image) : null,
        is_starter: Boolean(row.is_starter),
        is_placeholder: Boolean(row.is_placeholder),
        sort_order: Number(row.sort_order || 0),
      })) satisfies CleaningToolCatalogItem[];
      setCleaningToolCatalog(tools);

      const validToolKeys = new Set(tools.map((tool) => tool.cleaning_tool_key));
      const ownedTools = new Set<string>([DEFAULT_CLEANING_TOOL_KEY]);
      if (!cleaningToolOwnershipResult.error) {
        (cleaningToolOwnershipResult.data || []).forEach((row) => {
          const key = String(row.cleaning_tool_key || "");
          if (validToolKeys.has(key)) ownedTools.add(key);
        });
      }
      setCleaningToolOwned(ownedTools);

      const savedTool = cleaningToolEquippedResult.error
        ? ""
        : String(cleaningToolEquippedResult.data?.cleaning_tool_key || "");
      const nextTool = validToolKeys.has(savedTool)
        ? savedTool
        : DEFAULT_CLEANING_TOOL_KEY;
      setEquippedCleaningToolKey(nextTool);
      setSelectedCleaningToolKey((current) =>
        current && validToolKeys.has(current) ? current : nextTool,
      );
    }

    setBalanceLoading(false);
    setCatalogLoading(false);
    setRugCollectionLoading(false);
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
    window.addEventListener("dream-gems-updated", refreshFromWalletEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshFromWalletEvent);
      window.removeEventListener(
        "dream-tokens-updated",
        refreshFromWalletEvent,
      );
      window.removeEventListener(
        "dream-gems-updated",
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
  }, [currentArea, setupError, authChecked, responsiveReady, phoneLandscapeLayout]);

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

  function selectZoneAtClientPoint(clientX: number, clientY: number) {
    if (maskLoading || purchasingZoneKey || currentArea !== "area-1") return;

    const key = getZoneAtClientPoint(clientX, clientY);
    if (!key) {
      setSelectedZoneKey(null);
      setMobileZonePanelOpen(false);
      setMessage("");
      return;
    }

    setSelectedZoneKey(key);
    setMobileZonePanelOpen(true);
    setMessage("");
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (maskLoading || purchasingZoneKey || currentArea !== "area-1") return;
    const key = getZoneAtClientPoint(event.clientX, event.clientY);
    setHoveredZoneKey(key);
  }

  function handlePointerLeave() {
    setHoveredZoneKey(null);
  }

  function handleZoneTap(event: ReactPointerEvent<HTMLDivElement>) {
    selectZoneAtClientPoint(event.clientX, event.clientY);
  }

  function beginTouchExplorePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!touchExploreEnabled || event.pointerType === "mouse") return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    touchPointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setHoveredZoneKey(null);

    const points = Array.from(touchPointersRef.current.values());
    const gesture = touchGestureRef.current;

    if (points.length === 1) {
      gesture.mode = "pan";
      gesture.startScale = roomTransform.scale;
      gesture.startPanX = roomTransform.x;
      gesture.startPanY = roomTransform.y;
      gesture.startPointerX = event.clientX;
      gesture.startPointerY = event.clientY;
      gesture.moved = false;
      gesture.hadPinch = false;
      return;
    }

    const first = points[0];
    const second = points[1];
    gesture.mode = "pinch";
    gesture.startScale = roomTransform.scale;
    gesture.startPanX = roomTransform.x;
    gesture.startPanY = roomTransform.y;
    gesture.startDistance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    gesture.startMidX = (first.x + second.x) / 2;
    gesture.startMidY = (first.y + second.y) / 2;
    gesture.moved = true;
    gesture.hadPinch = true;
  }

  function moveTouchExplorePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!touchExploreEnabled || event.pointerType === "mouse") return;
    if (!touchPointersRef.current.has(event.pointerId)) return;

    event.preventDefault();
    touchPointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = Array.from(touchPointersRef.current.values());
    const gesture = touchGestureRef.current;

    if (points.length >= 2) {
      const first = points[0];
      const second = points[1];
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const midX = (first.x + second.x) / 2;
      const midY = (first.y + second.y) / 2;

      if (gesture.mode !== "pinch") {
        gesture.mode = "pinch";
        gesture.startScale = roomTransform.scale;
        gesture.startPanX = roomTransform.x;
        gesture.startPanY = roomTransform.y;
        gesture.startDistance = distance;
        gesture.startMidX = midX;
        gesture.startMidY = midY;
        gesture.hadPinch = true;
      }

      const nextScale = Math.max(
        1,
        Math.min(2.8, gesture.startScale * (distance / Math.max(1, gesture.startDistance))),
      );
      const viewportRect = roomViewportRef.current?.getBoundingClientRect();
      const centerX = viewportRect ? viewportRect.left + viewportRect.width / 2 : window.innerWidth / 2;
      const centerY = viewportRect ? viewportRect.top + viewportRect.height / 2 : window.innerHeight / 2;
      const ratio = nextScale / Math.max(0.001, gesture.startScale);
      const nextX =
        midX - centerX - ratio * (gesture.startMidX - centerX - gesture.startPanX);
      const nextY =
        midY - centerY - ratio * (gesture.startMidY - centerY - gesture.startPanY);

      setRoomTransform(clampRoomTransform({ scale: nextScale, x: nextX, y: nextY }));
      gesture.moved = true;
      gesture.hadPinch = true;
      return;
    }

    if (points.length === 1 && gesture.mode === "pan") {
      const dx = event.clientX - gesture.startPointerX;
      const dy = event.clientY - gesture.startPointerY;
      if (Math.hypot(dx, dy) > 6) gesture.moved = true;
      setRoomTransform(
        clampRoomTransform({
          scale: gesture.startScale,
          x: gesture.startPanX + dx,
          y: gesture.startPanY + dy,
        }),
      );
    }
  }

  function endTouchExplorePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!touchExploreEnabled || event.pointerType === "mouse") return;

    event.preventDefault();
    const gesture = touchGestureRef.current;
    const wasOnlyPointer = touchPointersRef.current.size === 1;
    const shouldTap =
      wasOnlyPointer &&
      gesture.mode === "pan" &&
      !gesture.moved &&
      !gesture.hadPinch;

    touchPointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can already be released by the browser.
    }

    const remaining = Array.from(touchPointersRef.current.values());
    if (remaining.length === 1) {
      const point = remaining[0];
      gesture.mode = "pan";
      gesture.startScale = roomTransform.scale;
      gesture.startPanX = roomTransform.x;
      gesture.startPanY = roomTransform.y;
      gesture.startPointerX = point.x;
      gesture.startPointerY = point.y;
      gesture.moved = true;
      gesture.hadPinch = true;
    } else if (remaining.length === 0) {
      gesture.mode = "none";
    }

    if (shouldTap) {
      selectZoneAtClientPoint(event.clientX, event.clientY);
    }
  }

  function cancelTouchExplorePointer(event: ReactPointerEvent<HTMLDivElement>) {
    touchPointersRef.current.delete(event.pointerId);
    const gesture = touchGestureRef.current;
    gesture.mode = "none";
    gesture.moved = true;
    gesture.hadPinch = true;
  }

  function selectZone(zoneKey: ZoneKey) {
    setSelectedZoneKey(zoneKey);
    setHoveredZoneKey(zoneKey);
    setMobileZonePanelOpen(true);
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
    setMobileZoneMenuOpen(false);
    setMobileZonePanelOpen(false);
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

  async function equipRug(rugKey: string, quiet = false, assumeOwned = false) {
    const rug = rugCatalog.find((entry) => entry.rug_key === rugKey);
    if (!rug || rugEquippingKey) return false;

    if (!rug.is_starter && !assumeOwned && !rugOwned.has(rugKey)) {
      setRugMessage("Purchase this rug before equipping it.");
      return false;
    }

    setRugEquippingKey(rugKey);
    if (!quiet) setRugMessage("");

    const { data, error } = await supabase.rpc("equip_nova_home_rug", {
      p_rug_key: rugKey,
    });

    setRugEquippingKey(null);

    if (error) {
      setRugMessage(error.message || "This rug could not be equipped.");
      return false;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const savedKey = row && typeof row === "object" ? String((row as Record<string, unknown>).rug_key || rugKey) : rugKey;
    setEquippedRugKey(savedKey);
    setSelectedRugKey(savedKey);
    if (!quiet) setRugMessage(`${rug.title} equipped. Rug Rush will use it automatically.`);
    return true;
  }

  async function purchaseRug(rugKey: string) {
    const rug = rugCatalog.find((entry) => entry.rug_key === rugKey);
    if (!rug || rugPurchasingKey || rugEquippingKey) return;

    if (rug.is_starter || rugOwned.has(rugKey)) {
      await equipRug(rugKey);
      return;
    }

    const availableBalance = rug.currency_code === "DG" ? dreamGemBalance : dreamTokenBalance;
    if (availableBalance < rug.price_amount) {
      setRugMessage(
        `You need ${rug.currency_code === "DG" ? formatDG(rug.price_amount - availableBalance) : formatDT(rug.price_amount - availableBalance)} more for ${rug.title}.`,
      );
      return;
    }

    setRugPurchasingKey(rugKey);
    setRugMessage("");

    const { data, error } = await supabase.rpc("purchase_nova_home_rug", {
      p_rug_key: rugKey,
    });

    setRugPurchasingKey(null);

    if (error) {
      setRugMessage(error.message || "This rug could not be purchased.");
      return;
    }

    const result = getRugPurchaseResult(data);
    if (!result) {
      setRugMessage("The rug purchase completed, but the result could not be read. Refresh Nova Home.");
      return;
    }

    setDreamTokenBalance(Math.max(0, result.new_dt_balance));
    setDreamGemBalance(Math.max(0, result.new_dg_balance));
    setRugOwned((current) => {
      const next = new Set(current);
      next.add(rugKey);
      return next;
    });

    window.dispatchEvent(new Event("dream-tokens-updated"));
    window.dispatchEvent(new Event("dream-gems-updated"));

    const equipped = await equipRug(rugKey, true, true);
    const paid = rug.currency_code === "DG" ? formatDG(result.cost_paid) : formatDT(result.cost_paid);
    setRugMessage(
      result.already_owned
        ? equipped
          ? `${rug.title} was already owned and is now equipped.`
          : `${rug.title} was already owned.`
        : equipped
          ? `${rug.title} purchased for ${paid} and equipped.`
          : `${rug.title} purchased for ${paid}.`,
    );
  }

  async function equipCleaningTool(
    cleaningToolKey: string,
    quiet = false,
    assumeOwned = false,
  ) {
    const tool = cleaningToolCatalog.find(
      (entry) => entry.cleaning_tool_key === cleaningToolKey,
    );
    if (!tool || cleaningToolEquippingKey) return false;

    if (
      !tool.is_starter &&
      !assumeOwned &&
      !cleaningToolOwned.has(cleaningToolKey)
    ) {
      setRugMessage("Purchase this cleaning tool before equipping it.");
      return false;
    }

    setCleaningToolEquippingKey(cleaningToolKey);
    if (!quiet) setRugMessage("");

    const { data, error } = await supabase.rpc(
      "equip_nova_home_cleaning_tool",
      {
        p_cleaning_tool_key: cleaningToolKey,
      },
    );

    setCleaningToolEquippingKey(null);

    if (error) {
      setRugMessage(error.message || "This cleaning tool could not be equipped.");
      return false;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const savedKey =
      row && typeof row === "object"
        ? String(
            (row as Record<string, unknown>).cleaning_tool_key ||
              cleaningToolKey,
          )
        : cleaningToolKey;

    setEquippedCleaningToolKey(savedKey);
    setSelectedCleaningToolKey(savedKey);
    if (!quiet) {
      setRugMessage(
        `${tool.title} equipped. Rug Rush will use its ${Math.round(
          tool.power_multiplier * 100,
        )}% cleaning power automatically.`,
      );
    }
    return true;
  }

  async function purchaseCleaningTool(cleaningToolKey: string) {
    const tool = cleaningToolCatalog.find(
      (entry) => entry.cleaning_tool_key === cleaningToolKey,
    );
    if (
      !tool ||
      cleaningToolPurchasingKey ||
      cleaningToolEquippingKey
    ) {
      return;
    }

    if (tool.is_starter || cleaningToolOwned.has(cleaningToolKey)) {
      await equipCleaningTool(cleaningToolKey);
      return;
    }

    const availableBalance =
      tool.currency_code === "DG" ? dreamGemBalance : dreamTokenBalance;
    if (availableBalance < tool.price_amount) {
      setRugMessage(
        `You need ${
          tool.currency_code === "DG"
            ? formatDG(tool.price_amount - availableBalance)
            : formatDT(tool.price_amount - availableBalance)
        } more for ${tool.title}.`,
      );
      return;
    }

    setCleaningToolPurchasingKey(cleaningToolKey);
    setRugMessage("");

    const { data, error } = await supabase.rpc(
      "purchase_nova_home_cleaning_tool",
      {
        p_cleaning_tool_key: cleaningToolKey,
      },
    );

    setCleaningToolPurchasingKey(null);

    if (error) {
      setRugMessage(error.message || "This cleaning tool could not be purchased.");
      return;
    }

    const result = getCleaningToolPurchaseResult(data);
    if (!result) {
      setRugMessage(
        "The cleaning tool purchase completed, but the result could not be read. Refresh Nova Home.",
      );
      return;
    }

    setDreamTokenBalance(Math.max(0, result.new_dt_balance));
    setDreamGemBalance(Math.max(0, result.new_dg_balance));
    setCleaningToolOwned((current) => {
      const next = new Set(current);
      next.add(cleaningToolKey);
      return next;
    });

    window.dispatchEvent(new Event("dream-tokens-updated"));
    window.dispatchEvent(new Event("dream-gems-updated"));

    const equipped = await equipCleaningTool(cleaningToolKey, true, true);
    const paid =
      tool.currency_code === "DG"
        ? formatDG(result.cost_paid)
        : formatDT(result.cost_paid);
    setRugMessage(
      result.already_owned
        ? equipped
          ? `${tool.title} was already owned and is now equipped.`
          : `${tool.title} was already owned.`
        : equipped
          ? `${tool.title} purchased for ${paid} and equipped.`
          : `${tool.title} purchased for ${paid}.`,
    );
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

  function renderZoneActionContent(zone: ZoneView, compact = false) {
    const unlocked = !zone.isAreaExit && unlockedZones.has(zone.key);
    const affordable = !zone.isAreaExit && dreamTokenBalance >= zone.dtCost;

    return (
      <div className={compact ? "space-y-2.5" : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}>
        <div className="min-w-0">
          <p
            className={`${compact ? "text-[7px]" : "text-[9px]"} font-black uppercase tracking-[0.15em] ${
              zone.isAreaExit ? "text-amber-200/65" : "text-cyan-200/58"
            }`}
          >
            {zone.isAreaExit
              ? "Coming Soon"
              : unlocked
                ? "Zone Unlocked"
                : "Room Upgrade"}
          </p>
          <h2 className={`${compact ? "mt-0.5 text-sm" : "mt-1 text-base sm:text-lg"} font-black text-white`}>
            {zone.title}
          </h2>
          <p className={`${compact ? "mt-1 text-[9px] leading-4" : "mt-1 max-w-md text-[11px] leading-5 sm:text-xs"} text-white/50`}>
            {zone.subtitle}
          </p>
          {zone.key === "extra-zone" && unlocked && (
            <p className={`${compact ? "mt-1 text-[7px]" : "mt-1.5 text-[9px]"} font-black uppercase tracking-[0.1em] text-violet-200/58`}>
              Equipped rug · {equippedRug?.title || "Nova Classic Rug"}
            </p>
          )}
          {message && selectedZoneKey === zone.key && (
            <p className={`${compact ? "mt-1.5 text-[8px] leading-4" : "mt-2 text-[10px] leading-5 sm:text-xs"} font-bold text-amber-100/85`}>
              {message}
            </p>
          )}
        </div>

        <div className={compact ? "w-full" : "shrink-0 sm:min-w-[185px] sm:text-right"}>
          {zone.isAreaExit ? (
            <span className={`inline-flex ${compact ? "min-h-9 w-full text-[9px]" : "min-h-11 w-full text-[11px] sm:w-auto"} items-center justify-center rounded-full border border-amber-200/24 bg-amber-300/10 px-5 font-black uppercase tracking-[0.1em] text-amber-100`}>
              Coming Soon
            </span>
          ) : unlocked ? (
            zone.key === "bed-zone" ? (
              <button
                type="button"
                onClick={openWardrobe}
                className={`${compact ? "min-h-9 text-[9px]" : "min-h-11 text-[11px]"} w-full rounded-full bg-cyan-300 px-5 font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-cyan-200 sm:w-auto`}
              >
                Open Wardrobe Bay →
              </button>
            ) : zone.key === "extra-zone" ? (
              <div className={`flex ${compact ? "w-full flex-col gap-1.5" : "flex-wrap justify-end gap-2"}`}>
                <button
                  type="button"
                  onClick={openRugRush}
                  className={`${compact ? "min-h-9 w-full text-[9px]" : "min-h-11 text-[11px]"} rounded-full bg-cyan-300 px-5 font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-cyan-200`}
                >
                  Play Rug Rush →
                </button>
                <button
                  type="button"
                  onClick={openRugCollection}
                  className={`${compact ? "min-h-9 w-full text-[9px]" : "min-h-11 text-[11px]"} rounded-full border border-violet-200/24 bg-violet-300/[0.08] px-5 font-black uppercase tracking-[0.1em] text-violet-100 transition hover:bg-violet-300/[0.13]`}
                >
                  Rug Collection
                </button>
              </div>
            ) : (
              <span className={`inline-flex ${compact ? "min-h-9 w-full justify-center text-[9px]" : "min-h-11 text-[11px]"} items-center rounded-full border border-emerald-200/24 bg-emerald-300/10 px-5 font-black uppercase tracking-[0.1em] text-emerald-100`}>
                ✓ Unlocked
              </span>
            )
          ) : selectedZoneKey === zone.key ? (
            <button
              type="button"
              disabled={
                purchasingZoneKey === zone.key ||
                catalogLoading ||
                Boolean(setupError) ||
                dreamTokenBalance < zone.dtCost
              }
              onClick={() => purchaseZone(zone.key)}
              className={`${compact ? "min-h-9 text-[9px]" : "min-h-11 text-[11px]"} w-full rounded-full px-5 font-black uppercase tracking-[0.1em] transition sm:w-auto ${
                affordable && !setupError
                  ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-55"
                  : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/32"
              }`}
            >
              {purchasingZoneKey === zone.key
                ? "Unlocking..."
                : affordable
                  ? `Unlock · ${formatDT(zone.dtCost)}`
                  : `Need ${formatDT(zone.dtCost - dreamTokenBalance)}`}
            </button>
          ) : (
            <div className={compact ? "text-left" : ""}>
              <p className={`${compact ? "text-base" : "text-xl sm:text-2xl"} font-black text-cyan-100`}>
                {catalogLoading ? "..." : formatDT(zone.dtCost)}
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white/34">
                Select zone to unlock
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderArea1Stage(showInlineZonePanel: boolean, touchExplore = false) {
    return (
      <div
        ref={stageRef}
        onPointerMove={touchExplore ? undefined : handlePointerMove}
        onPointerLeave={touchExplore ? undefined : handlePointerLeave}
        onPointerUp={touchExplore ? undefined : handleZoneTap}
        className={`relative isolate w-full select-none overflow-hidden rounded-[20px] border border-cyan-200/18 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.56)] sm:rounded-[24px] ${
          touchExplore ? "touch-none" : "touch-manipulation"
        } ${activeZoneKey ? "cursor-pointer" : "cursor-default"}`}
        style={{
          width: stageSize.width > 0 ? `${stageSize.width}px` : "100%",
          height: stageSize.height > 0 ? `${stageSize.height}px` : "auto",
          aspectRatio: "1535 / 1024",
          maxWidth: "100%",
          maxHeight: "100%",
          transform: touchExplore
            ? `translate3d(${roomTransform.x}px, ${roomTransform.y}px, 0) scale(${roomTransform.scale})`
            : undefined,
          transformOrigin: "center center",
          willChange: touchExplore ? "transform" : undefined,
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
            {RUG_RUSH_SPARKLES.map((sparkle) => (
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

        {showInlineZonePanel && !maskLoading && activeZone && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[min(620px,calc(100%-20px))] -translate-x-1/2 sm:bottom-4">
            <div
              onPointerMove={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              className={`pointer-events-auto rounded-[20px] border px-4 py-3 shadow-[0_24px_62px_rgba(0,0,0,0.52)] backdrop-blur-xl sm:px-5 sm:py-4 ${
                activeZone.isAreaExit
                  ? "border-amber-200/28 bg-slate-950/90"
                  : "border-cyan-200/30 bg-slate-950/90"
              }`}
            >
              {renderZoneActionContent(activeZone)}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!authChecked || !responsiveReady) {
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
    <main ref={novaHomeRootRef} className="fixed inset-x-0 top-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(39,145,190,0.16),transparent_38%),linear-gradient(180deg,#04101d_0%,#020713_72%)]" />

      {touchDeviceLayout ? (
        <>
          <header
            className={`relative z-50 flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-slate-950/78 backdrop-blur-xl ${phoneLandscapeLayout ? "gap-2 px-2" : "gap-3 px-4"}`}
            style={{ height: `${touchHeaderHeight}px` }}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/inventor")}
                className={`flex shrink-0 items-center justify-center rounded-full border border-cyan-200/25 bg-white/[0.035] font-black text-white/80 ${phoneLandscapeLayout ? "h-9 w-9 text-base" : "h-11 w-11 text-xl"}`}
                aria-label="Back to Nova's World"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileZonePanelOpen(false);
                  setMobileZoneMenuOpen((open) => !open);
                }}
                className={`flex items-center gap-1.5 rounded-full border border-cyan-200/30 bg-cyan-300/[0.075] font-black uppercase tracking-[0.1em] text-cyan-50 ${phoneLandscapeLayout ? "h-9 px-3 text-[9px]" : "h-11 px-4 text-[11px]"}`}
              >
                <span aria-hidden="true">☰</span>
                Zones
              </button>
            </div>

            <div className="min-w-0 flex-1 text-center">
              <h1 className={`truncate font-serif font-medium tracking-[-0.03em] text-white ${phoneLandscapeLayout ? "text-[17px]" : "text-[24px]"}`}>
                Nova’s Home
              </h1>
              <p className={`truncate font-black uppercase tracking-[0.13em] text-cyan-200/48 ${phoneLandscapeLayout ? "text-[7px]" : "text-[9px]"}`}>
                Area 1 · {roomUnlockedCount}/4 furnished
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <div className="rounded-full border border-cyan-200/24 bg-slate-950/72 px-3 py-1.5 text-right">
                <p className="text-[6px] font-black uppercase tracking-[0.12em] text-cyan-200/45">DT</p>
                <p className="text-[10px] font-black text-cyan-50">
                  {balanceLoading ? "…" : Math.round(dreamTokenBalance).toLocaleString("en-SG")}
                </p>
              </div>
              <div className="rounded-full border border-violet-200/20 bg-slate-950/72 px-2.5 py-1.5 text-right">
                <p className="text-[6px] font-black uppercase tracking-[0.12em] text-violet-200/50">DG</p>
                <p className="text-[10px] font-black text-violet-50">
                  {balanceLoading ? "…" : Math.round(dreamGemBalance).toLocaleString("en-SG")}
                </p>
              </div>
              <button
                type="button"
                onClick={startNovaHomeGuide}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-950/78 text-sm text-cyan-100"
                aria-label="Open Nova Guide"
              >
                ✦
              </button>
            </div>
          </header>

          <section className="relative z-10 flex min-h-0 flex-1 overflow-hidden p-1.5">
            {setupError && (
              <div className="absolute left-1/2 top-1.5 z-30 max-w-[62vw] -translate-x-1/2 rounded-full border border-amber-200/25 bg-amber-950/90 px-3 py-1.5 text-[8px] font-bold text-amber-50 shadow-xl">
                {setupError}
              </div>
            )}

            <div
              ref={roomViewportRef}
              onPointerDown={beginTouchExplorePointer}
              onPointerMove={moveTouchExplorePointer}
              onPointerUp={endTouchExplorePointer}
              onPointerCancel={cancelTouchExplorePointer}
              className="flex min-h-0 min-w-0 flex-1 touch-none items-center justify-center overflow-hidden"
            >
              {renderArea1Stage(false, true)}
            </div>

            {!mobileZoneMenuOpen && !mobileZonePanelOpen && (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <div className={`rounded-full border border-white/9 bg-slate-950/68 font-bold uppercase tracking-[0.11em] text-white/52 backdrop-blur-md ${phoneLandscapeLayout ? "px-3 py-1 text-[7px]" : "px-4 py-1.5 text-[9px]"}`}>
                  Drag to explore · Pinch to zoom · Tap a zone
                </div>
              </div>
            )}
          </section>

          {(mobileZoneMenuOpen || mobileZonePanelOpen) && (
            <button
              type="button"
              aria-label="Close Nova Home side menu"
              onClick={() => {
                setMobileZoneMenuOpen(false);
                setMobileZonePanelOpen(false);
              }}
              className="fixed inset-0 z-[54] bg-black/38"
            />
          )}

          <aside
            className={`fixed bottom-0 left-0 z-[55] border-r border-cyan-200/16 bg-[linear-gradient(160deg,rgba(3,18,34,0.985),rgba(2,7,19,0.99))] shadow-[20px_0_55px_rgba(0,0,0,0.48)] backdrop-blur-xl transition-transform duration-200 ${phoneLandscapeLayout ? "w-[min(310px,46vw)] p-2.5" : "w-[min(390px,38vw)] p-4"} ${
              mobileZoneMenuOpen ? "translate-x-0" : "-translate-x-[105%]"
            }`}
            style={{ top: `${touchHeaderHeight}px` }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.15em] text-cyan-200/52">Area 1</p>
                <h2 className="text-sm font-black text-white">Room Zones</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileZoneMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-white/60"
                aria-label="Close zones"
              >
                ×
              </button>
            </div>

            <div className="mt-2 grid max-h-[calc(100dvh-108px)] gap-1.5 overflow-y-auto pr-0.5">
              {zones.map((zone) => {
                const unlocked = !zone.isAreaExit && unlockedZones.has(zone.key);
                const selected = selectedZoneKey === zone.key;
                const affordable = !zone.isAreaExit && dreamTokenBalance >= zone.dtCost;
                return (
                  <button
                    key={zone.key}
                    type="button"
                    onClick={() => {
                      selectZone(zone.key);
                      setMobileZoneMenuOpen(false);
                      setMobileZonePanelOpen(true);
                    }}
                    className={`rounded-[12px] border px-2.5 py-2 text-left transition ${
                      selected
                        ? "border-cyan-200/48 bg-cyan-300/[0.1]"
                        : zone.isAreaExit
                          ? "border-amber-200/14 bg-amber-300/[0.035]"
                          : unlocked
                            ? "border-emerald-200/12 bg-emerald-300/[0.04]"
                            : "border-white/8 bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-black text-white">{zone.title}</p>
                        <p className={`mt-0.5 text-[7px] font-bold uppercase tracking-[0.09em] ${zone.isAreaExit ? "text-amber-200/60" : unlocked ? "text-emerald-200/60" : affordable ? "text-cyan-200/55" : "text-white/28"}`}>
                          {zone.isAreaExit
                            ? "Coming Soon"
                            : unlocked
                              ? zone.key === "bed-zone"
                                ? "Wardrobe Bay"
                                : zone.key === "extra-zone"
                                  ? "Rug Rush · Rugs"
                                  : "Unlocked"
                              : affordable
                                ? "Available"
                                : "Save more DT"}
                        </p>
                      </div>
                      <strong className={`shrink-0 text-[8px] ${zone.isAreaExit ? "text-amber-200" : unlocked ? "text-emerald-200" : affordable ? "text-cyan-200" : "text-white/30"}`}>
                        {zone.isAreaExit ? "SOON" : unlocked ? "✓" : formatDT(zone.dtCost)}
                      </strong>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <aside
            className={`fixed bottom-0 right-0 z-[55] border-l border-cyan-200/16 bg-[linear-gradient(200deg,rgba(3,18,34,0.985),rgba(2,7,19,0.99))] shadow-[-20px_0_55px_rgba(0,0,0,0.48)] backdrop-blur-xl transition-transform duration-200 ${phoneLandscapeLayout ? "w-[min(320px,47vw)] p-3" : "w-[min(410px,40vw)] p-5"} ${
              mobileZonePanelOpen && activeZone ? "translate-x-0" : "translate-x-[105%]"
            }`}
            style={{ top: `${touchHeaderHeight}px` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[7px] font-black uppercase tracking-[0.14em] text-cyan-200/48">Room Action</p>
                <p className="mt-0.5 truncate text-[10px] font-black text-white/65">Tap the room to switch zones</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileZonePanelOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-white/60"
                aria-label="Close room action"
              >
                ×
              </button>
            </div>
            {activeZone && <div className="mt-3">{renderZoneActionContent(activeZone, true)}</div>}
          </aside>
        </>
      ) : (
        <>
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
                <div className="rounded-full border border-violet-200/24 bg-slate-950/72 px-4 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-200/55">Dream Gems</p>
                  <p className="mt-0.5 text-sm font-black text-violet-50">
                    {balanceLoading ? "Loading..." : formatDG(dreamGemBalance)}
                  </p>
                </div>

                <div className="rounded-full border border-cyan-200/30 bg-slate-950/72 px-4 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-200/55">Dream Tokens</p>
                  <p className="mt-0.5 text-sm font-black text-cyan-50">
                    {balanceLoading ? "Loading..." : formatDT(dreamTokenBalance)}
                  </p>
                </div>

                <div className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-right">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/38">Starter Quarters</p>
                  <p className="mt-0.5 text-sm font-black text-white">{roomUnlockedCount}/4 furnished</p>
                </div>

                <div className="rounded-full border border-amber-200/18 bg-amber-300/[0.05] px-4 py-2 text-right">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/38">Area 2</p>
                  <p className="mt-0.5 text-sm font-black text-amber-100/75">Coming Soon</p>
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
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/55">Area 1 · Starter Quarters</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/40">Select a room zone to inspect or unlock it. Area 2 is coming soon.</p>
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
                            <p className="truncate text-xs font-black text-white sm:text-sm">{zone.title}</p>
                            <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.1em] ${zone.isAreaExit ? "text-amber-200/65" : unlocked ? "text-emerald-200/65" : affordable ? "text-cyan-200/58" : "text-white/28"}`}>
                              {zone.isAreaExit
                                ? "Coming Soon"
                                : unlocked
                                  ? zone.key === "bed-zone"
                                    ? "Wardrobe Bay"
                                    : zone.key === "extra-zone"
                                      ? "Rug Rush · Rugs"
                                      : "Unlocked"
                                  : affordable
                                    ? "Available"
                                    : "Save more DT"}
                            </p>
                          </div>
                          <strong className={`shrink-0 text-[10px] ${unlocked ? "text-emerald-200" : zone.isAreaExit ? "text-amber-200" : affordable ? "text-cyan-200" : "text-white/30"}`}>
                            {zone.isAreaExit ? "Soon" : unlocked ? "✓" : formatDT(zone.dtCost)}
                          </strong>
                        </div>
                      </button>
                    );
                  })}
                </aside>

                <div ref={roomViewportRef} className="flex min-h-0 min-w-0 items-start justify-center overflow-hidden">
                  {renderArea1Stage(true)}
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
                      <p className="text-[9px] font-black uppercase tracking-[0.17em] text-emerald-200/72">Future Expansion</p>
                      <h2 className="mt-2 text-2xl font-black sm:text-3xl">Area 2 · Coming Soon</h2>
                      <p className="mt-2 text-xs leading-6 text-white/52 sm:text-sm">Area 2 is not available yet. This connected room will open in a future Nova Home update.</p>
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

          {!wardrobeOpen && !rugRushOpen && !rugCollectionOpen && (
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
        </>
      )}

      <NovaHomeGuide
        open={guideOpen && !wardrobeOpen && !rugRushOpen && !rugCollectionOpen}
        stepIndex={guideStep}
        onStepChange={setGuideStep}
        onClose={closeNovaHomeGuide}
        compact={phoneLandscapeLayout}
      />

      <RugCollectionPanel
        open={rugCollectionOpen}
        rugCatalog={rugCatalog}
        rugOwnedKeys={rugOwned}
        equippedRugKey={equippedRugKey}
        selectedRugKey={selectedRugKey}
        rugPurchasingKey={rugPurchasingKey}
        rugEquippingKey={rugEquippingKey}
        onSelectRug={(rugKey) => {
          setSelectedRugKey(rugKey);
          setRugMessage("");
        }}
        onPurchaseRug={(rugKey) => void purchaseRug(rugKey)}
        onEquipRug={(rugKey) => void equipRug(rugKey)}
        cleaningToolCatalog={cleaningToolCatalog}
        cleaningToolOwnedKeys={cleaningToolOwned}
        equippedCleaningToolKey={equippedCleaningToolKey}
        selectedCleaningToolKey={selectedCleaningToolKey}
        cleaningToolPurchasingKey={cleaningToolPurchasingKey}
        cleaningToolEquippingKey={cleaningToolEquippingKey}
        onSelectCleaningTool={(cleaningToolKey) => {
          setSelectedCleaningToolKey(cleaningToolKey);
          setRugMessage("");
        }}
        onPurchaseCleaningTool={(cleaningToolKey) =>
          void purchaseCleaningTool(cleaningToolKey)
        }
        onEquipCleaningTool={(cleaningToolKey) =>
          void equipCleaningTool(cleaningToolKey)
        }
        dreamTokenBalance={dreamTokenBalance}
        dreamGemBalance={dreamGemBalance}
        loading={rugCollectionLoading}
        message={rugMessage}
        onClose={closeRugCollection}
      />

      {rugRushOpen && (
        <RugRushGame
          onClose={closeRugRush}
          onRoundComplete={handleRugRushComplete}
          rugImage={equippedRug?.game_image || DEFAULT_RUG_GAME_IMAGE}
          rugTitle={equippedRug?.title || "Nova Classic Rug"}
          cleaningToolImage={
            equippedCleaningTool?.game_image || DEFAULT_CLEANING_TOOL_IMAGE
          }
          cleaningToolTitle={equippedCleaningTool?.title || "Soft Sponge"}
          cleaningPowerMultiplier={equippedCleaningTool?.power_multiplier || 1}
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
          compactMobile={phoneLandscapeLayout}
        />
      )}

      {touchDeviceLayout && !portraitOrientation && !phoneFullscreenGateRequired && (
        <div
          className="fixed z-[500] flex items-center gap-1.5"
          style={{
            left: "max(10px, env(safe-area-inset-left))",
            bottom: "max(10px, env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={() => void toggleNovaHomeFullscreen()}
            className={`flex items-center justify-center gap-2 rounded-full border border-cyan-200/35 bg-slate-950/88 font-black uppercase tracking-[0.1em] text-cyan-50 shadow-[0_12px_34px_rgba(0,0,0,0.46),0_0_18px_rgba(83,215,255,0.12)] backdrop-blur-xl ${
              wardrobeOpen || rugRushOpen || rugCollectionOpen
                ? "h-10 w-10 p-0 text-base"
                : phoneLandscapeLayout
                  ? "h-10 px-3 text-[8px]"
                  : "h-11 px-4 text-[10px]"
            }`}
            aria-label={phoneImmersiveActive ? "Exit full screen" : "Enter full screen"}
            title={phoneImmersiveActive ? "Exit Full Screen" : "Full Screen"}
          >
            <span aria-hidden="true">{phoneImmersiveActive ? "↙" : "⛶"}</span>
            {!wardrobeOpen && !rugRushOpen && !rugCollectionOpen && (
              <span>{phoneImmersiveActive ? "Exit Full Screen" : "Full Screen"}</span>
            )}
          </button>

          {currentArea === "area-1" && !wardrobeOpen && !rugRushOpen && !rugCollectionOpen && (
            <button
              type="button"
              onClick={resetTouchRoomView}
              className={`flex items-center justify-center rounded-full border border-white/12 bg-slate-950/80 font-black uppercase tracking-[0.1em] text-white/65 backdrop-blur-xl ${
                phoneLandscapeLayout ? "h-10 px-3 text-[8px]" : "h-11 px-4 text-[10px]"
              }`}
            >
              Reset View
            </button>
          )}
        </div>
      )}

      {fullscreenMessage && touchDeviceLayout && !portraitOrientation && (
        <div
          className="fixed z-[501] rounded-full border border-amber-200/22 bg-amber-950/92 px-3 py-2 text-[9px] font-bold text-amber-50 shadow-xl backdrop-blur-xl"
          style={{
            left: "max(10px, env(safe-area-inset-left))",
            bottom: "max(58px, calc(env(safe-area-inset-bottom) + 58px))",
          }}
        >
          {fullscreenMessage}
        </div>
      )}

      {phoneFullscreenGateRequired && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[radial-gradient(circle_at_50%_32%,rgba(36,183,226,0.18),transparent_34%),linear-gradient(180deg,#04101d,#020713)] px-5 text-center">
          <div className="w-full max-w-md rounded-[26px] border border-cyan-200/18 bg-slate-950/88 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.58),0_0_48px_rgba(83,215,255,0.10)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-300/[0.07] text-2xl text-cyan-100 shadow-[0_0_28px_rgba(83,215,255,0.14)]">
              ⛶
            </div>
            <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/58">Nova’s Home</p>
            <h2 className="mt-1.5 font-serif text-2xl font-medium tracking-[-0.03em] text-white">
              {fullscreenResumeRequired ? "Resume full screen" : "Full-screen play required"}
            </h2>

            {isIOSPhone ? (
              <>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/58">
                  iPhone Safari cannot remove its browser bars for an interactive webpage. To use Nova’s Home without Safari controls, add Dreamscape One to your Home Screen once, then open Nova Home from that icon.
                </p>
                <div className="mx-auto mt-4 grid max-w-sm gap-2 text-left text-[11px] leading-5 text-white/72">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><b className="text-cyan-100">1.</b> Tap Safari’s <b>Share</b> button.</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><b className="text-cyan-100">2.</b> Choose <b>Add to Home Screen</b>.</div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><b className="text-cyan-100">3.</b> Keep <b>Open as Web App</b> enabled, then open the new Dreamscape icon.</div>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 h-11 rounded-full border border-cyan-200/32 bg-cyan-300/[0.10] px-5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50"
                >
                  I’ve opened the Home Screen app
                </button>
              </>
            ) : (
              <>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/58">
                  Nova’s Home uses the whole phone screen so the room and activities have enough space to play properly.
                </p>
                <button
                  type="button"
                  onClick={() => void resumeRequiredPhoneFullscreen()}
                  className="mt-5 h-12 rounded-full border border-cyan-100/38 bg-cyan-300 px-6 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_28px_rgba(83,215,255,0.24)]"
                >
                  {fullscreenResumeRequired ? "Resume Full Screen" : "Enter Full Screen"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {landscapeRequired && portraitOrientation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(36,183,226,0.16),transparent_36%),linear-gradient(180deg,#04101d,#020713)] px-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex h-20 w-14 rotate-90 items-center justify-center rounded-[16px] border-2 border-cyan-200/52 bg-cyan-300/[0.07] shadow-[0_0_38px_rgba(83,215,255,0.18)]">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-200/60" />
            </div>
            <p className="mt-7 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/58">Nova’s Home</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-[-0.03em] text-white">Turn your device sideways</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/52">
              Nova’s Home and its activities are designed for landscape play on phones and tablets.
            </p>
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.05] px-4 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/72">
              ↻ Rotate to landscape to continue
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


function NovaHomeGuide({
  open,
  stepIndex,
  onStepChange,
  onClose,
  compact = false,
}: {
  open: boolean;
  stepIndex: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  compact?: boolean;
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

  if (compact) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[90]">
        <div className="pointer-events-auto absolute bottom-2 right-2 w-[min(430px,66vw)] overflow-hidden rounded-[18px] border border-cyan-200/30 bg-[linear-gradient(145deg,rgba(4,30,49,0.98),rgba(2,10,24,0.99))] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.62),0_0_26px_rgba(83,215,255,0.12)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Nova Guide"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-sm text-white/65"
          >
            ×
          </button>

          <div className="flex items-start gap-2.5 pr-7">
            <div className="flex h-11 w-11 shrink-0 items-end justify-center overflow-hidden rounded-[13px] border border-cyan-200/20 bg-cyan-300/[0.06]">
              <img
                src="/nova/nova-character.png"
                alt="Nova"
                className="h-[58px] w-auto translate-y-1.5 object-contain"
                draggable={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[6px] font-black uppercase tracking-[0.16em] text-cyan-200/58">{step.eyebrow}</p>
              <h2 className="mt-0.5 truncate font-serif text-base font-medium tracking-[-0.02em] text-white">{step.title}</h2>
              <p className="mt-1 text-[9px] leading-4 text-white/56">{step.text}</p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1" aria-label="Guide progress">
              {NOVA_HOME_GUIDE_STEPS.map((_, index) => (
                <span
                  key={index}
                  className={`h-1 rounded-full transition-all ${index === stepIndex ? "w-4 bg-cyan-300" : index < stepIndex ? "w-1.5 bg-cyan-200/40" : "w-1.5 bg-white/14"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
                  className="min-h-8 rounded-full border border-white/10 bg-white/[0.035] px-3 text-[7px] font-black uppercase tracking-[0.09em] text-white/60"
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
                className="min-h-8 rounded-full bg-cyan-300 px-4 text-[7px] font-black uppercase tracking-[0.1em] text-slate-950"
              >
                {isLast ? "Explore" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
  compactMobile,
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
  compactMobile: boolean;
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


  if (compactMobile) {
    const selectedPriceLabel = selectedItem
      ? selectedItem.is_starter || ownedItems.has(selectedItem.item_key)
        ? isEquipped
          ? "Equipped"
          : "Owned"
        : formatDT(selectedItem.dt_cost)
      : "";

    const mobilePrimaryAction = selectedItem ? (
      isEquipped && selectedItem.category === "accessory" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUnequip(selectedItem.item_key)}
          className="min-h-10 rounded-full border border-rose-200/24 bg-rose-300/[0.09] px-4 text-[9px] font-black uppercase tracking-[0.09em] text-rose-100 disabled:opacity-45"
        >
          {equippingItemKey === selectedItem.item_key ? "Unequipping..." : "Unequip"}
        </button>
      ) : isEquipped ? (
        <span className="flex min-h-10 items-center rounded-full border border-emerald-200/22 bg-emerald-300/[0.08] px-4 text-[9px] font-black uppercase tracking-[0.09em] text-emerald-100">
          ✓ Equipped
        </span>
      ) : isOwned ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onEquip(selectedItem.item_key)}
          className="min-h-10 rounded-full bg-cyan-300 px-4 text-[9px] font-black uppercase tracking-[0.09em] text-slate-950 disabled:opacity-45"
        >
          {equippingItemKey === selectedItem.item_key ? "Equipping..." : "Wear This"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || dreamTokenBalance < selectedItem.dt_cost}
          onClick={() => onPurchase(selectedItem.item_key)}
          className={`min-h-10 rounded-full px-4 text-[9px] font-black uppercase tracking-[0.09em] disabled:opacity-45 ${
            dreamTokenBalance >= selectedItem.dt_cost
              ? "bg-cyan-300 text-slate-950"
              : "border border-white/10 bg-white/[0.04] text-white/35"
          }`}
        >
          {purchasingItemKey === selectedItem.item_key
            ? "Buying..."
            : dreamTokenBalance >= selectedItem.dt_cost
              ? `Buy · ${formatDT(selectedItem.dt_cost)}`
              : `Need ${formatDT(selectedItem.dt_cost - dreamTokenBalance)}`}
        </button>
      )
    ) : null;

    return (
      <div className="fixed inset-0 z-[120] overflow-hidden bg-[#01040b] text-white">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Nova Wardrobe Bay"
          className="grid h-[100dvh] w-full grid-rows-[44px_minmax(0,1fr)_58px] overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.13),transparent_38%),linear-gradient(145deg,#061526,#020713)]"
        >
          <header className="relative z-30 flex min-w-0 items-center gap-2 border-b border-white/[0.07] bg-slate-950/80 px-2 backdrop-blur-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/11 bg-white/[0.045] text-base font-black text-white/74 disabled:opacity-40"
              aria-label="Close Wardrobe Bay"
            >
              ←
            </button>

            <div className="min-w-0">
              <p className="truncate text-[7px] font-black uppercase tracking-[0.15em] text-cyan-200/55">Sleep Zone</p>
              <h2 className="truncate text-sm font-black text-white">Wardrobe Bay</h2>
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                disabled={busy || savingLook || exportingPng || (activeCharacter === "milo" && !miloUnlocked)}
                onClick={() => void saveCurrentLook()}
                className="min-h-8 rounded-full border border-emerald-200/20 bg-emerald-300/[0.07] px-3 text-[7px] font-black uppercase tracking-[0.08em] text-emerald-100/82 disabled:opacity-35"
                title="Save Look"
              >
                {savingLook ? "Saving..." : "Save Look"}
              </button>
              <button
                type="button"
                disabled={busy || savingLook || exportingPng || (activeCharacter === "milo" && !miloUnlocked)}
                onClick={() => void downloadCurrentLookPng()}
                className="min-h-8 rounded-full border border-violet-200/20 bg-violet-300/[0.07] px-3 text-[7px] font-black uppercase tracking-[0.08em] text-violet-100/82 disabled:opacity-35"
                title="Download transparent PNG"
              >
                {exportingPng ? "Creating..." : "PNG"}
              </button>
              <div className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.05] px-2.5 py-1.5 text-right">
                <p className="text-[6px] font-black uppercase tracking-[0.11em] text-cyan-200/48">DT</p>
                <p className="text-[10px] font-black text-cyan-50">{formatDT(dreamTokenBalance)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/11 bg-white/[0.045] text-lg text-white/72 disabled:opacity-40"
                aria-label="Close Wardrobe Bay"
              >
                ×
              </button>
            </div>
          </header>

          <div className="grid min-h-0 grid-cols-[78px_minmax(0,1fr)_188px] overflow-hidden">
            <aside className="flex min-h-0 flex-col border-r border-white/[0.07] bg-slate-950/54 p-1.5">
              <p className="px-1 pb-1 text-[6px] font-black uppercase tracking-[0.13em] text-white/26">Character</p>
              <div className="grid gap-1">
                <button
                  type="button"
                  onClick={() => onCharacterChange("nova")}
                  className={`rounded-[11px] border px-1 py-2 text-center ${
                    activeCharacter === "nova"
                      ? "border-cyan-200/38 bg-cyan-300/[0.11] text-cyan-50"
                      : "border-white/[0.07] bg-white/[0.025] text-white/46"
                  }`}
                >
                  <span className="block text-base">✦</span>
                  <span className="mt-0.5 block text-[7px] font-black uppercase tracking-[0.07em]">Nova</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCharacterChange("milo")}
                  className={`rounded-[11px] border px-1 py-2 text-center ${
                    activeCharacter === "milo"
                      ? miloUnlocked
                        ? "border-emerald-200/34 bg-emerald-300/[0.09] text-emerald-50"
                        : "border-amber-200/34 bg-amber-300/[0.08] text-amber-50"
                      : "border-white/[0.07] bg-white/[0.025] text-white/46"
                  }`}
                >
                  <span className="block text-base">{miloUnlocked ? "◆" : "🔒"}</span>
                  <span className="mt-0.5 block text-[7px] font-black uppercase tracking-[0.07em]">Milo</span>
                </button>
              </div>

              <div className="my-1.5 h-px bg-white/[0.07]" />
              <p className="px-1 pb-1 text-[6px] font-black uppercase tracking-[0.13em] text-white/26">Browse</p>
              <div className="grid gap-1">
                {WARDROBE_CATEGORIES.map((category) => {
                  const active = activeCategory === category.key;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => onCategoryChange(category.key)}
                      className={`rounded-[11px] border px-1 py-2 text-center ${
                        active
                          ? "border-cyan-200/36 bg-cyan-300/[0.1] text-cyan-50"
                          : "border-white/[0.07] bg-white/[0.025] text-white/44"
                      }`}
                    >
                      <span className="block text-base">{category.icon}</span>
                      <span className="mt-0.5 block text-[7px] font-black uppercase tracking-[0.06em]">
                        {category.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto rounded-[10px] border border-white/[0.06] bg-white/[0.025] px-1.5 py-2 text-center">
                <p className="text-[6px] font-black uppercase tracking-[0.08em] text-white/28">Equipped</p>
                <p className="mt-0.5 text-[8px] font-black text-white/58">{effectiveEquipped.length} items</p>
              </div>
            </aside>

            <div className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(83,215,255,0.17),transparent_33%),linear-gradient(180deg,rgba(4,17,31,0.28),rgba(2,7,19,0.64))]">
              <div className="pointer-events-none absolute inset-x-[17%] bottom-[7%] h-[20%] rounded-[50%] bg-cyan-300/[0.08] blur-2xl" />

              <div className="absolute left-2 top-2 z-30 max-w-[60%] rounded-full border border-white/[0.08] bg-slate-950/58 px-2.5 py-1 backdrop-blur">
                <p className="truncate text-[7px] font-black uppercase tracking-[0.08em] text-white/48">
                  {activeCharacter === "nova" ? "Nova" : "Milo"} · {selectedCategoryMeta.label}
                </p>
              </div>

              {adjustmentMode && selectedItem?.category === "accessory" && (
                <div className="pointer-events-none absolute right-2 top-2 z-30 rounded-full border border-amber-200/24 bg-amber-300/[0.1] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-amber-100 backdrop-blur">
                  Drag to move
                </div>
              )}

              {(lookActionMessage || message) && (
                <div className="pointer-events-none absolute bottom-2 left-1/2 z-40 max-w-[90%] -translate-x-1/2 rounded-full border border-cyan-200/16 bg-slate-950/78 px-3 py-1.5 text-center text-[7px] font-bold text-cyan-100/78 backdrop-blur">
                  {lookActionMessage || message}
                </div>
              )}

              {activeCharacter === "nova" || miloUnlocked ? (
                <div
                  className={`relative aspect-square shrink-0 ${
                    adjustmentMode
                      ? placementDrag
                        ? "cursor-grabbing"
                        : "cursor-grab"
                      : ""
                  }`}
                  style={{
                    width: "min(100%, calc(100dvh - 116px))",
                    touchAction: adjustmentMode ? "none" : undefined,
                  }}
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
                      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
                      draggable={false}
                    />
                  ) : activeCharacter === "nova" ? (
                    <img
                      src={NOVA_CHARACTER_IMAGE}
                      alt="Nova wardrobe preview"
                      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-[8px] font-black uppercase tracking-[0.1em] text-white/34">
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
                <div className="w-[min(290px,82%)] rounded-[18px] border border-amber-200/22 bg-slate-950/72 p-3 text-center shadow-[0_18px_42px_rgba(0,0,0,0.4)] backdrop-blur">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/28 bg-amber-300/[0.1] text-xl font-black text-amber-100">M</div>
                  <h3 className="mt-2 text-sm font-black text-white">Unlock Milo</h3>
                  <p className="mt-1 text-[8px] leading-4 text-white/42">
                    Add Milo permanently to Wardrobe Bay for {formatDT(miloCatalog?.dt_cost ?? 1000)}.
                  </p>
                  <button
                    type="button"
                    onClick={() => onPurchaseCharacter("milo")}
                    disabled={Boolean(purchasingCharacter) || dreamTokenBalance < (miloCatalog?.dt_cost ?? 1000)}
                    className={`mt-2 min-h-9 w-full rounded-full px-4 text-[8px] font-black uppercase tracking-[0.08em] disabled:opacity-45 ${
                      dreamTokenBalance >= (miloCatalog?.dt_cost ?? 1000)
                        ? "bg-amber-300 text-slate-950"
                        : "border border-white/10 bg-white/[0.04] text-white/34"
                    }`}
                  >
                    {purchasingCharacter === "milo"
                      ? "Unlocking..."
                      : dreamTokenBalance >= (miloCatalog?.dt_cost ?? 1000)
                        ? `Unlock · ${formatDT(miloCatalog?.dt_cost ?? 1000)}`
                        : `Need ${formatDT((miloCatalog?.dt_cost ?? 1000) - dreamTokenBalance)}`}
                  </button>
                </div>
              )}
            </div>

            <aside className="grid min-h-0 grid-rows-[34px_minmax(0,1fr)] border-l border-white/[0.07] bg-slate-950/46">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-2">
                <div className="min-w-0">
                  <p className="truncate text-[7px] font-black uppercase tracking-[0.1em] text-cyan-200/52">
                    {selectedCategoryMeta.label}
                  </p>
                </div>
                <span className="text-[7px] font-black text-white/28">{visibleItems.length}</span>
              </div>

              <div className="min-h-0 overflow-y-auto p-1.5 [scrollbar-width:thin]">
                {setupError ? (
                  <div className="rounded-[12px] border border-amber-200/22 bg-amber-300/[0.07] p-2 text-[8px] leading-4 text-amber-50/84">
                    {setupError}
                  </div>
                ) : loading ? (
                  <div className="flex h-full items-center justify-center text-center text-[7px] font-black uppercase tracking-[0.1em] text-cyan-100/48">
                    Loading wardrobe...
                  </div>
                ) : activeCharacter === "milo" && !miloUnlocked ? (
                  <div className="flex h-full items-center justify-center px-2 text-center text-[8px] leading-4 text-white/35">
                    Unlock Milo from the centre panel to use his wardrobe.
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-2 text-center text-[8px] text-white/34">
                    No {selectedCategoryMeta.label.toLowerCase()} yet.
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    {visibleItems.map((item) => {
                      const owned = item.is_starter || ownedItems.has(item.item_key);
                      const equipped = effectiveEquipped.some((entry) => entry.item_key === item.item_key);
                      const selected = selectedItem?.item_key === item.item_key;

                      return (
                        <button
                          key={item.item_key}
                          type="button"
                          onClick={() => onSelectItem(item.item_key)}
                          className={`grid min-h-[58px] grid-cols-[46px_minmax(0,1fr)] items-center gap-2 rounded-[12px] border p-1.5 text-left ${
                            selected
                              ? "border-cyan-200/42 bg-cyan-300/[0.09]"
                              : "border-white/[0.07] bg-white/[0.025]"
                          }`}
                        >
                          <div
                            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[10px] border"
                            style={{
                              background: `${item.accent_hex}16`,
                              borderColor: `${item.accent_hex}38`,
                              color: item.accent_hex,
                            }}
                          >
                            {item.thumbnail_image ? (
                              <img src={item.thumbnail_image} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <span className="text-sm">{selectedCategoryMeta.icon}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[8px] font-black text-white/82">{item.title}</p>
                            <div className="mt-1 flex items-center gap-1">
                              <span className={`truncate text-[6px] font-black uppercase tracking-[0.06em] ${
                                equipped ? "text-emerald-200" : owned ? "text-cyan-200/70" : "text-white/34"
                              }`}>
                                {equipped ? "Equipped" : owned ? "Owned" : formatDT(item.dt_cost)}
                              </span>
                              {item.category === "accessory" && item.accessory_slot && (
                                <span className="truncate text-[6px] font-black uppercase tracking-[0.05em] text-white/25">
                                  · {getAccessorySlotLabel(item.accessory_slot)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>

          <footer className="relative z-30 flex min-w-0 items-center gap-2 border-t border-white/[0.07] bg-slate-950/86 px-2 backdrop-blur-xl">
            {adjustmentMode && selectedItem?.category === "accessory" ? (
              <>
                <button
                  type="button"
                  onClick={() => setAdjustmentMode(false)}
                  className="min-h-9 rounded-full border border-white/11 bg-white/[0.04] px-3 text-[7px] font-black uppercase tracking-[0.08em] text-white/58"
                >
                  Done
                </button>

                <div className="flex min-w-0 items-center gap-1 rounded-full border border-amber-200/16 bg-amber-300/[0.055] px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => setPlacementDraft((current) => ({ ...current, scale: Math.max(0.05, Number((current.scale - 0.05).toFixed(2))) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-sm font-black text-white/72"
                    aria-label="Make accessory smaller"
                  >
                    −
                  </button>
                  <div className="min-w-[70px] text-center">
                    <p className="text-[6px] font-black uppercase tracking-[0.08em] text-amber-100/44">Size</p>
                    <p className="text-[8px] font-black text-amber-50">{placementDraft.scale.toFixed(2)}×</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlacementDraft((current) => ({ ...current, scale: Math.min(3, Number((current.scale + 0.05).toFixed(2))) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-sm font-black text-white/72"
                    aria-label="Make accessory larger"
                  >
                    +
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8px] font-black text-white/78">{selectedItem.title}</p>
                  <p className="truncate text-[6px] font-bold text-white/30">Drag on the character to move it</p>
                </div>

                <button
                  type="button"
                  onClick={() => setPlacementDraft({ scale: 1, offset_x_pct: 0, offset_y_pct: 0 })}
                  disabled={Boolean(savingPlacementItemKey)}
                  className="min-h-9 rounded-full border border-white/11 bg-white/[0.04] px-3 text-[7px] font-black uppercase tracking-[0.07em] text-white/58 disabled:opacity-35"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setPlacementDraft(savedPlacement)}
                  disabled={!placementChanged || Boolean(savingPlacementItemKey)}
                  className="min-h-9 rounded-full border border-white/11 bg-white/[0.04] px-3 text-[7px] font-black uppercase tracking-[0.07em] text-white/58 disabled:opacity-30"
                >
                  Undo
                </button>
                <button
                  type="button"
                  disabled={!isOwned || Boolean(savingPlacementItemKey)}
                  onClick={() => void onSavePlacement(selectedItem.item_key, placementDraft)}
                  className="min-h-9 rounded-full bg-amber-300 px-4 text-[7px] font-black uppercase tracking-[0.08em] text-slate-950 disabled:opacity-40"
                >
                  {savingPlacementItemKey === selectedItem.item_key ? "Saving..." : "Save Placement"}
                </button>
              </>
            ) : selectedItem ? (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-[9px] font-black text-white/86">{selectedItem.title}</p>
                    <span className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.06em] text-white/35">
                      {selectedPriceLabel}
                    </span>
                  </div>
                  <p className="truncate text-[7px] text-white/34">
                    {selectedItem.category === "accessory" && selectedItem.accessory_slot
                      ? `${getAccessorySlotLabel(selectedItem.accessory_slot)} accessory`
                      : selectedItem.description || selectedCategoryMeta.label}
                  </p>
                </div>

                {selectedItem.category === "accessory" && adjustmentAvailable && (
                  <button
                    type="button"
                    onClick={() => setAdjustmentMode(true)}
                    className="min-h-10 rounded-full border border-amber-200/22 bg-amber-300/[0.08] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100"
                  >
                    Adjust
                  </button>
                )}

                {mobilePrimaryAction}
              </>
            ) : (
              <p className="text-[8px] font-bold text-white/38">
                Choose an outfit or accessory from the right.
              </p>
            )}
          </footer>
        </section>
      </div>
    );
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

