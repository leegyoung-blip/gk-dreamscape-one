/** Asset map for the CR-4 UI; the engine itself has no image dependencies. */
import type { TileKind } from "./engine";

export const CIRCUIT_RUSH_TILE_ASSETS: Record<TileKind, { src: string; name: string; colour: string }> = {
  0: { src: "/nova/thinking-skills/circuit-rush/tiles/power-cell.png", name: "Power Cell", colour: "#2DD4FF" },
  1: { src: "/nova/thinking-skills/circuit-rush/tiles/microchip.png", name: "Microchip", colour: "#FFE241" },
  2: { src: "/nova/thinking-skills/circuit-rush/tiles/data-crystal.png", name: "Data Crystal", colour: "#AA74FF" },
  3: { src: "/nova/thinking-skills/circuit-rush/tiles/circuit-module.png", name: "Circuit Module", colour: "#7BEA32" },
  4: { src: "/nova/thinking-skills/circuit-rush/tiles/signal-core.png", name: "Signal Core", colour: "#FF58C7" },
  5: { src: "/nova/thinking-skills/circuit-rush/tiles/nano-gear.png", name: "Nano Gear", colour: "#FF9B30" },
};
