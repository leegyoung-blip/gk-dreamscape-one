export type NovaVariantSlug = "original" | "striker" | "vanguard" | "pulse";

export type NovaVariantDefinition = {
  slug: NovaVariantSlug;
  label: string;
  shortLabel: string;
  subtitle: string;
  sprite: string;
  beam: {
    core: string;
    mid: string;
    edge: string;
    glow: string;
  };
  muzzle: {
    x: number;
    y: number;
    sourceWidth: number;
    sourceHeight: number;
  };
};

export const NOVA_VARIANTS: NovaVariantDefinition[] = [
  {
    slug: "original",
    label: "Blue Nova",
    shortLabel: "Blue",
    subtitle: "Azure battle suit",
    sprite: "/activities/learning-missions/knowledge-arena/versus/novas/nova-original.png",
    beam: { core: "#ffffff", mid: "#9ff4ff", edge: "#37b8ff", glow: "rgba(40,143,255,.78)" },
    muzzle: { x: 935.8 / 1086, y: 357.0 / 1448, sourceWidth: 1086, sourceHeight: 1448 },
  },
  {
    slug: "striker",
    label: "Red Nova",
    shortLabel: "Red",
    subtitle: "Crimson battle suit",
    sprite: "/activities/learning-missions/knowledge-arena/versus/novas/nova-striker.png",
    beam: { core: "#ffffff", mid: "#ffb0b0", edge: "#ff3b3b", glow: "rgba(255,45,45,.78)" },
    muzzle: { x: 941.2 / 1086, y: 358.8 / 1448, sourceWidth: 1086, sourceHeight: 1448 },
  },
  {
    slug: "vanguard",
    label: "Green Nova",
    shortLabel: "Green",
    subtitle: "Emerald battle suit",
    sprite: "/activities/learning-missions/knowledge-arena/versus/novas/nova-vanguard.png",
    beam: { core: "#ffffff", mid: "#a7ffc3", edge: "#2be86a", glow: "rgba(35,221,96,.78)" },
    muzzle: { x: 943.9 / 1086, y: 359.5 / 1448, sourceWidth: 1086, sourceHeight: 1448 },
  },
  {
    slug: "pulse",
    label: "Purple Nova",
    shortLabel: "Purple",
    subtitle: "Violet battle suit",
    sprite: "/activities/learning-missions/knowledge-arena/versus/novas/nova-pulse.png",
    beam: { core: "#ffffff", mid: "#e4b1ff", edge: "#9a42ff", glow: "rgba(146,55,255,.80)" },
    muzzle: { x: 941.8 / 1086, y: 360.8 / 1448, sourceWidth: 1086, sourceHeight: 1448 },
  },
];

export const NOVA_VARIANT_BY_SLUG = Object.fromEntries(
  NOVA_VARIANTS.map((variant) => [variant.slug, variant]),
) as Record<NovaVariantSlug, NovaVariantDefinition>;

export function getNovaVariant(slug: string | null | undefined) {
  return NOVA_VARIANT_BY_SLUG[(slug || "original") as NovaVariantSlug] || NOVA_VARIANT_BY_SLUG.original;
}
