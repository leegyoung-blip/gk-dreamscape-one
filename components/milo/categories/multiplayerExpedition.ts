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
  // When the dedicated recoloured rover PNGs are created, set these paths
  // and switch `useDedicatedAsset` to true. Until then the shared rover art
  // is used with a strongly coloured ring/nameplate so every player remains
  // visually distinct without distorting Milo, the brass, tyres or lights.
  topAsset: string;
  useDedicatedAsset: boolean;
};

export const MULTIPLAYER_VEHICLE_VARIANTS: MultiplayerVehicleVariant[] = [
  { key: "blue", color: "#60a5fa", softColor: "rgba(96,165,250,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
  { key: "emerald", color: "#34d399", softColor: "rgba(52,211,153,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
  { key: "crimson", color: "#fb7185", softColor: "rgba(251,113,133,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
  { key: "violet", color: "#c084fc", softColor: "rgba(192,132,252,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
  { key: "amber", color: "#fbbf24", softColor: "rgba(251,191,36,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
  { key: "cyan", color: "#22d3ee", softColor: "rgba(34,211,238,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
  { key: "rose", color: "#f472b6", softColor: "rgba(244,114,182,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
  { key: "silver", color: "#cbd5e1", softColor: "rgba(203,213,225,.28)", topAsset: "/milo-world/activities/categories/expedition/milo-vehicle-top.png", useDedicatedAsset: false },
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

export function shortenMultiplayerName(name: string, maxLength = 12) {
  const clean = name.trim() || "Player";
  return clean.length <= maxLength ? clean : `${clean.slice(0, Math.max(1, maxLength - 1))}…`;
}
