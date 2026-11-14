/** A corner of a plot's perimeter, in metres on its UTM zone's grid. */
export interface Vertex {
  easting: number | null;
  northing: number | null;
}

interface Point {
  easting: number;
  northing: number;
}

const SQUARE_METRES_PER_HECTARE = 10_000;

export function emptyVertex(): Vertex {
  return { easting: null, northing: null };
}

/** The vertices with both coordinates entered, in order. */
export function completeVertices(vertices: readonly Vertex[]): Point[] {
  return vertices.filter((vertex): vertex is Point => vertex.easting !== null && vertex.northing !== null);
}

/** The area the closed perimeter encloses, by the shoelace formula; UTM metres make it square metres. */
export function areaInHectares(points: readonly Point[]): number {
  let twiceTheArea = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    twiceTheArea += point.easting * next.northing - next.easting * point.northing;
  });
  return Math.abs(twiceTheArea) / 2 / SQUARE_METRES_PER_HECTARE;
}

/**
 * The perimeter scaled into a width × height box with the same proportions, north up, as the
 * points attribute of an SVG polygon.
 */
export function previewPoints(points: readonly Point[], width: number, height: number): string {
  const eastings = points.map((point) => point.easting);
  const northings = points.map((point) => point.northing);
  const west = Math.min(...eastings);
  const south = Math.min(...northings);
  const spanEast = Math.max(...eastings) - west || 1;
  const spanNorth = Math.max(...northings) - south || 1;
  const scale = Math.min(width / spanEast, height / spanNorth);
  const offsetX = (width - spanEast * scale) / 2;
  const offsetY = (height - spanNorth * scale) / 2;

  return points
    .map((point) => {
      const x = offsetX + (point.easting - west) * scale;
      const y = height - offsetY - (point.northing - south) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * The points of a total station export in PNEZD order (point, northing, easting, elevation,
 * description), one per line, separated by commas, semicolons, tabs or spaces. Lines whose
 * northing and easting are not numbers, such as a header, are skipped.
 */
export function verticesFromStationFile(text: string): Vertex[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().split(/[,;\t ]+/))
    .map(([, northing, easting]) => ({ easting: Number(easting), northing: Number(northing) }))
    .filter((vertex) => Number.isFinite(vertex.easting) && Number.isFinite(vertex.northing));
}
