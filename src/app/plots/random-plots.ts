import type { FeatureCollection, Polygon } from 'geojson';

/**
 * Made-up plots to try the map with until sgt answers with real ones: a few dozen around each of
 * several farming areas of Peru, each a four-sided field of 60 to 250 metres a side, turned at random.
 * They change on every load.
 */

/** Farming areas, as longitude and latitude. */
const AREAS: [number, number][] = [
  [-80.63, -5.19], // Piura
  [-79.84, -6.77], // Lambayeque
  [-79.03, -8.11], // Trujillo
  [-78.51, -7.16], // Cajamarca
  [-76.37, -6.49], // Tarapoto
  [-77.21, -11.49], // Huaral
  [-75.21, -12.07], // Huancayo
  [-75.73, -14.07], // Ica
  [-72.08, -13.33], // Sacred Valley
  [-71.54, -16.41], // Arequipa
  [-70.02, -15.84], // Puno
];
const PLOTS_PER_AREA = 25;
const AREA_RADIUS_DEGREES = 0.08;
const METRES_PER_DEGREE = 111_320;

export function randomPlots(): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: AREAS.flatMap(([longitude, latitude], area) =>
      Array.from({ length: PLOTS_PER_AREA }, (_, index) => ({
        type: 'Feature' as const,
        id: area * PLOTS_PER_AREA + index,
        properties: {},
        geometry: randomField(
          longitude + jitter(AREA_RADIUS_DEGREES),
          latitude + jitter(AREA_RADIUS_DEGREES),
        ),
      })),
    ),
  };
}

function randomField(longitude: number, latitude: number): Polygon {
  const width = between(60, 250);
  const depth = between(60, 250);
  const turn = between(0, Math.PI);
  const longitudeScale = Math.cos((latitude * Math.PI) / 180);

  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ].map(([x, y]) => {
    // A little skew, so not every field is a perfect rectangle.
    const skewedX = x + jitter(width * 0.1);
    const skewedY = y + jitter(depth * 0.1);
    const east = skewedX * Math.cos(turn) - skewedY * Math.sin(turn);
    const north = skewedX * Math.sin(turn) + skewedY * Math.cos(turn);
    return [
      longitude + east / (METRES_PER_DEGREE * longitudeScale),
      latitude + north / METRES_PER_DEGREE,
    ];
  });

  return { type: 'Polygon', coordinates: [[...corners, corners[0]]] };
}

function between(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function jitter(spread: number): number {
  return between(-spread, spread);
}
