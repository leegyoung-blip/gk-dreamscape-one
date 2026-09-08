export type MultiplayerExpeditionPlayer = {
  userId: string;
  displayName: string;
  points: number;
  score: number;
};

export type MultiplayerVehicleVariant = {
  key: string;
  color: string;
  softColor: string;
  sideAsset: string;
  topAsset: string;
  useDedicatedTopAsset: boolean;
};

const EXPEDITION_BASE = "/milo-world/activities/categories/expedition";
const VEHICLE_BASE = `${EXPEDITION_BASE}/vehicles`;

export const MULTIPLAYER_VEHICLE_VARIANTS: MultiplayerVehicleVariant[] = [
  {
    key: "blue",
    color: "#60a5fa",
    softColor: "rgba(96,165,250,.28)",
    sideAsset: `${VEHICLE_BASE}/vehicle-body-blue.png`,
    topAsset: `${EXPEDITION_BASE}/milo-vehicle-top.png`,
    useDedicatedTopAsset: false,
  },
  {
    key: "emerald",
    color: "#34d399",
    softColor: "rgba(52,211,153,.28)",
    sideAsset: `${VEHICLE_BASE}/vehicle-body-emerald.png`,
    topAsset: `${EXPEDITION_BASE}/milo-vehicle-top.png`,
    useDedicatedTopAsset: false,
  },
  {
    key: "crimson",
    color: "#fb7185",
    softColor: "rgba(251,113,133,.28)",
    sideAsset: `${VEHICLE_BASE}/vehicle-body-crimson.png`,
    topAsset: `${EXPEDITION_BASE}/milo-vehicle-top.png`,
    useDedicatedTopAsset: false,
  },
  {
    key: "violet",
    color: "#c084fc",
    softColor: "rgba(192,132,252,.28)",
    sideAsset: `${VEHICLE_BASE}/vehicle-body-violet.png`,
    topAsset: `${EXPEDITION_BASE}/milo-vehicle-top.png`,
    useDedicatedTopAsset: false,
  },
  {
    key: "amber",
    color: "#fbbf24",
    softColor: "rgba(251,191,36,.28)",
    sideAsset: `${VEHICLE_BASE}/vehicle-body-amber.png`,
    topAsset: `${EXPEDITION_BASE}/milo-vehicle-top.png`,
    useDedicatedTopAsset: false,
  },
  {
    key: "cyan",
    color: "#22d3ee",
    softColor: "rgba(34,211,238,.28)",
    sideAsset: `${VEHICLE_BASE}/vehicle-body-cyan.png`,
    topAsset: `${EXPEDITION_BASE}/milo-vehicle-top.png`,
    useDedicatedTopAsset: false,
  },
  {
    key: "rose",
    color: "#f472b6",
    softColor: "rgba(244,114,182,.28)",
    sideAsset: `${VEHICLE_BASE}/vehicle-body-rose.png`,
    topAsset: `${EXPEDITION_BASE}/milo-vehicle-top.png`,
    useDedicatedTopAsset: false,
  },
];

function stablePlayerHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getMultiplayerVehicleVariant(userId: string) {
  const index = stablePlayerHash(userId) % MULTIPLAYER_VEHICLE_VARIANTS.length;
  return MULTIPLAYER_VEHICLE_VARIANTS[index];
}

export function getVehicleVariantByKey(key: string) {
  return MULTIPLAYER_VEHICLE_VARIANTS.find((variant) => variant.key === key)
    ?? MULTIPLAYER_VEHICLE_VARIANTS[0];
}

export function shortenMultiplayerName(name: string, maxLength = 12) {
  const clean = name.trim() || "Player";
  return clean.length <= maxLength ? clean : `${clean.slice(0, Math.max(1, maxLength - 1))}…`;
}
