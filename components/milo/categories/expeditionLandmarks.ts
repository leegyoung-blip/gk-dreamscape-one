export type ExpeditionLandmark = {
  id: string;
  name: string;
  location: string;
  year: string;
  thresholdMetres: number;
  mapX: number;
  mapY: number;
  cardAlign?: "left" | "center" | "right";
  // Position inside the three side-scrolling landscape images.
  // These coordinates are UI/art coordinates, not geographic coordinates.
  liveSceneIndex: 0 | 1 | 2;
  liveXPercent: number;
  liveYPercent: number;
};

export const EXPEDITION_METRES_PER_POINT = 10;
export const MAX_EXPEDITION_POINTS = 1000;
export const MAX_EXPEDITION_METRES = MAX_EXPEDITION_POINTS * EXPEDITION_METRES_PER_POINT;

// The live threshold values are aligned to the actual landmark positions in the
// three 3:1 scrolling artwork tiles. They are intentionally not evenly spaced:
// a landmark counts as passed only when its artwork reaches Milo's fixed vehicle
// position near the left side of the viewport.
export const EXPEDITION_LANDMARKS: ExpeditionLandmark[] = [
  {
    id: "acropolis",
    name: "Acropolis of Athens",
    location: "Athens, Greece",
    year: "432 BCE",
    thresholdMetres: 300,
    mapX: 6.0,
    mapY: 38.2,
    cardAlign: "left",
    liveSceneIndex: 0,
    liveXPercent: 17.0,
    liveYPercent: 51.0,
  },
  {
    id: "giza",
    name: "Pyramids of Giza",
    location: "Giza, Egypt",
    year: "c. 2560 BCE",
    thresholdMetres: 1500,
    mapX: 20.5,
    mapY: 52.4,
    liveSceneIndex: 0,
    liveXPercent: 52.5,
    liveYPercent: 58.5,
  },
  {
    id: "petra",
    name: "Petra — Ad Deir",
    location: "Petra, Jordan",
    year: "c. 100 CE",
    thresholdMetres: 2800,
    mapX: 35.0,
    mapY: 57.0,
    liveSceneIndex: 0,
    liveXPercent: 90.0,
    liveYPercent: 64.0,
  },
  {
    id: "pont-du-gard",
    name: "Pont du Gard",
    location: "Occitanie, France",
    year: "c. 50 CE",
    thresholdMetres: 3600,
    mapX: 49.0,
    mapY: 53.2,
    liveSceneIndex: 1,
    liveXPercent: 15.0,
    liveYPercent: 56.0,
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu",
    location: "Cusco Region, Peru",
    year: "c. 1450 CE",
    thresholdMetres: 4850,
    mapX: 64.3,
    mapY: 29.8,
    liveSceneIndex: 1,
    liveXPercent: 52.5,
    liveYPercent: 54.0,
  },
  {
    id: "morro-castle",
    name: "Morro Castle & Lighthouse",
    location: "Havana, Cuba",
    year: "1589 CE",
    thresholdMetres: 5900,
    mapX: 69.4,
    mapY: 45.0,
    liveSceneIndex: 1,
    liveXPercent: 84.0,
    liveYPercent: 54.0,
  },
  {
    id: "tikal",
    name: "Tikal",
    location: "Petén, Guatemala",
    year: "c. 200 CE",
    thresholdMetres: 6950,
    mapX: 79.0,
    mapY: 56.0,
    liveSceneIndex: 2,
    liveXPercent: 15.5,
    liveYPercent: 52.0,
  },
  {
    id: "mesa-verde",
    name: "Mesa Verde Cliff Palace",
    location: "Colorado, USA",
    year: "c. 1200 CE",
    thresholdMetres: 8200,
    mapX: 91.8,
    mapY: 45.2,
    cardAlign: "right",
    liveSceneIndex: 2,
    liveXPercent: 52.5,
    liveYPercent: 51.0,
  },
  {
    id: "registan",
    name: "Registan",
    location: "Samarkand, Uzbekistan",
    year: "1417 CE",
    thresholdMetres: 9250,
    mapX: 94.0,
    mapY: 18.6,
    cardAlign: "right",
    liveSceneIndex: 2,
    liveXPercent: 84.0,
    liveYPercent: 55.0,
  },
];

// Approximate points following the glowing route painted into world-map.png.
// These are UI coordinates, not geographic coordinates.
export const EXPEDITION_ROUTE_POINTS = [
  { metres: 0, x: 1.5, y: 42.0 },
  { metres: 300, x: 6.0, y: 38.2 },
  { metres: 1500, x: 20.5, y: 52.4 },
  { metres: 2800, x: 35.0, y: 57.0 },
  { metres: 3600, x: 49.0, y: 53.2 },
  { metres: 4850, x: 64.3, y: 29.8 },
  { metres: 5900, x: 69.4, y: 45.0 },
  { metres: 6950, x: 79.0, y: 56.0 },
  { metres: 8200, x: 91.8, y: 45.2 },
  { metres: 9250, x: 94.0, y: 18.6 },
  { metres: 10000, x: 97.2, y: 14.0 },
] as const;

export function getExpeditionPosition(metres: number) {
  const pose = getExpeditionPose(metres);
  return { x: pose.x, y: pose.y };
}

export function getExpeditionPose(metres: number) {
  const clamped = Math.min(MAX_EXPEDITION_METRES, Math.max(0, metres));

  for (let index = 0; index < EXPEDITION_ROUTE_POINTS.length - 1; index += 1) {
    const current = EXPEDITION_ROUTE_POINTS[index];
    const next = EXPEDITION_ROUTE_POINTS[index + 1];

    if (clamped <= next.metres) {
      const span = Math.max(1, next.metres - current.metres);
      const t = (clamped - current.metres) / span;
      const x = current.x + (next.x - current.x) * t;
      const y = current.y + (next.y - current.y) * t;
      const routeHeading = Math.atan2(next.y - current.y, next.x - current.x) * (180 / Math.PI);

      // The generated top-view rover artwork already points roughly 35° down-right.
      // Subtract that intrinsic heading so the vehicle nose follows the map route.
      const angle = routeHeading - 35;

      return { x, y, angle };
    }
  }

  const last = EXPEDITION_ROUTE_POINTS[EXPEDITION_ROUTE_POINTS.length - 1];
  const previous = EXPEDITION_ROUTE_POINTS[EXPEDITION_ROUTE_POINTS.length - 2];
  const routeHeading = Math.atan2(last.y - previous.y, last.x - previous.x) * (180 / Math.PI);
  return { x: last.x, y: last.y, angle: routeHeading - 35 };
}
