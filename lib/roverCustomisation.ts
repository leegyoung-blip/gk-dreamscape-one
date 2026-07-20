export type RoverCustomisationCategory = "color" | "trail" | "decal";

export type RoverCustomisationItem = {
  key: string;
  category: RoverCustomisationCategory;
  name: string;
  description: string;
  price: number;
  previewColor: string;
  secondaryColor?: string;
  icon?: string;
};

export type RoverLoadout = {
  colorKey: string;
  trailKey: string;
  decalKey: string;
};

export const DEFAULT_ROVER_LOADOUT: RoverLoadout = {
  colorKey: "color-sky-blue",
  trailKey: "trail-none",
  decalKey: "decal-none",
};

export const roverCustomisationItems: RoverCustomisationItem[] = [
  {
    key: "color-sky-blue",
    category: "color",
    name: "Sky Blue",
    description: "Nova’s standard Skyforge finish.",
    price: 0,
    previewColor: "#53d7ff",
    secondaryColor: "#dffaff",
  },
  {
    key: "color-crimson",
    category: "color",
    name: "Crimson",
    description: "A bold red expedition finish.",
    price: 40,
    previewColor: "#ff5f72",
    secondaryColor: "#ffd5dc",
  },
  {
    key: "color-emerald",
    category: "color",
    name: "Emerald",
    description: "A bright green exploration finish.",
    price: 40,
    previewColor: "#54e5a5",
    secondaryColor: "#d8ffed",
  },
  {
    key: "color-violet",
    category: "color",
    name: "Violet",
    description: "A futuristic purple energy finish.",
    price: 50,
    previewColor: "#a88cff",
    secondaryColor: "#eadfff",
  },
  {
    key: "color-solar-gold",
    category: "color",
    name: "Solar Gold",
    description: "A premium gold Skyforge finish.",
    price: 80,
    previewColor: "#ffd76a",
    secondaryColor: "#fff4c9",
  },
  {
    key: "trail-none",
    category: "trail",
    name: "Standard Exhaust",
    description: "The rover’s standard engine trail.",
    price: 0,
    previewColor: "transparent",
  },
  {
    key: "trail-plasma",
    category: "trail",
    name: "Plasma Trail",
    description: "A bright cyan trail behind the rover.",
    price: 60,
    previewColor: "#53d7ff",
    secondaryColor: "#7effd9",
  },
  {
    key: "trail-spark",
    category: "trail",
    name: "Spark Trail",
    description: "A charged yellow energy trail.",
    price: 75,
    previewColor: "#ffd76a",
    secondaryColor: "#ff9df0",
  },
  {
    key: "trail-starlight",
    category: "trail",
    name: "Starlight Trail",
    description: "A premium violet and blue light trail.",
    price: 100,
    previewColor: "#a88cff",
    secondaryColor: "#53d7ff",
  },
  {
    key: "decal-none",
    category: "decal",
    name: "No Decal",
    description: "Keep the rover body clean and minimal.",
    price: 0,
    previewColor: "#ffffff",
    icon: "",
  },
  {
    key: "decal-star",
    category: "decal",
    name: "Sky Star",
    description: "A bright explorer star emblem.",
    price: 35,
    previewColor: "#ffd76a",
    icon: "★",
  },
  {
    key: "decal-bolt",
    category: "decal",
    name: "Energy Bolt",
    description: "A lightning emblem for the rover body.",
    price: 35,
    previewColor: "#7ee8ff",
    icon: "ϟ",
  },
  {
    key: "decal-explorer",
    category: "decal",
    name: "Explorer Crest",
    description: "Nova’s expedition crest.",
    price: 50,
    previewColor: "#60f0d0",
    icon: "◇",
  },
];

export function getRoverCustomisationItem(key: string) {
  return roverCustomisationItems.find((item) => item.key === key);
}

export function getRoverCustomisationItems(
  category: RoverCustomisationCategory
) {
  return roverCustomisationItems.filter((item) => item.category === category);
}
