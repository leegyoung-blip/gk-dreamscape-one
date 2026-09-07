export type ExpeditionLandmark = {
  id: string;
  name: string;
  location: string;
  year: string;
  thresholdMetres: number;
  mapX: number;
  mapY: number;
  cardAlign?: "left" | "center" | "right";
};

export const EXPEDITION_METRES_PER_POINT = 10;
export const MAX_EXPEDITION_POINTS = 1000;
export const MAX_EXPEDITION_METRES = MAX_EXPEDITION_POINTS * EXPEDITION_METRES_PER_POINT;

export const EXPEDITION_LANDMARKS: ExpeditionLandmark[] = [
  {
    id: "acropolis",
    name: "Acropolis of Athens",
    location: "Athens, Greece",
    year: "432 BCE",
    thresholdMetres: 800,
    mapX: 6.0,
    mapY: 38.2,
    cardAlign: "left",
  },
  {
    id: "giza",
    name: "Pyramids of Giza",
    location: "Giza, Egypt",
    year: "c. 2560 BCE",
    thresholdMetres: 1800,
    mapX: 20.5,
    mapY: 52.4,
  },
  {
    id: "petra",
    name: "Petra — Ad Deir",
    location: "Petra, Jordan",
    year: "c. 100 CE",
    thresholdMetres: 2800,
    mapX: 35.0,
    mapY: 57.0,
  },
  {
    id: "pont-du-gard",
    name: "Pont du Gard",
    location: "Occitanie, France",
    year: "c. 50 CE",
    thresholdMetres: 3800,
    mapX: 49.0,
    mapY: 53.2,
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu",
    location: "Cusco Region, Peru",
    year: "c. 1450 CE",
    thresholdMetres: 4800,
    mapX: 64.3,
    mapY: 29.8,
  },
  {
    id: "morro-castle",
    name: "Morro Castle",
    location: "Havana, Cuba",
    year: "1589 CE",
    thresholdMetres: 5800,
    mapX: 61.8,
    mapY: 60.2,
  },
  {
    id: "tikal",
    name: "Tikal",
    location: "Petén, Guatemala",
    year: "c. 200 CE",
    thresholdMetres: 6800,
    mapX: 79.0,
    mapY: 56.0,
  },
  {
    id: "mesa-verde",
    name: "Mesa Verde Cliff Palace",
    location: "Colorado, USA",
    year: "c. 1200 CE",
    thresholdMetres: 7800,
    mapX: 91.8,
    mapY: 45.2,
    cardAlign: "right",
  },
  {
    id: "registan",
    name: "Registan",
    location: "Samarkand, Uzbekistan",
    year: "1417 CE",
    thresholdMetres: 8800,
    mapX: 94.0,
    mapY: 18.6,
    cardAlign: "right",
  },
];

// Approximate points following the glowing route painted into world-map.png.
// These are UI coordinates, not geographic coordinates.
export const EXPEDITION_ROUTE_POINTS = [
  { metres: 0, x: 1.5, y: 42.0 },
  { metres: 800, x: 6.0, y: 38.2 },
  { metres: 1800, x: 20.5, y: 52.4 },
  { metres: 2800, x: 35.0, y: 57.0 },
  { metres: 3800, x: 49.0, y: 53.2 },
  { metres: 4800, x: 64.3, y: 29.8 },
  { metres: 5800, x: 69.4, y: 45.0 },
  { metres: 6800, x: 79.0, y: 56.0 },
  { metres: 7800, x: 91.8, y: 45.2 },
  { metres: 8800, x: 94.0, y: 18.6 },
  { metres: 10000, x: 97.2, y: 14.0 },
] as const;

export function getExpeditionPosition(metres: number) {
  const clamped = Math.min(MAX_EXPEDITION_METRES, Math.max(0, metres));

  for (let index = 0; index < EXPEDITION_ROUTE_POINTS.length - 1; index += 1) {
    const current = EXPEDITION_ROUTE_POINTS[index];
    const next = EXPEDITION_ROUTE_POINTS[index + 1];

    if (clamped <= next.metres) {
      const span = Math.max(1, next.metres - current.metres);
      const t = (clamped - current.metres) / span;
      return {
        x: current.x + (next.x - current.x) * t,
        y: current.y + (next.y - current.y) * t,
      };
    }
  }

  const last = EXPEDITION_ROUTE_POINTS[EXPEDITION_ROUTE_POINTS.length - 1];
  return { x: last.x, y: last.y };
}
