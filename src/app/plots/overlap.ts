import type { Polygon, Position } from 'geojson';

/** Below this, in degrees (about a tenth of a millimetre), two points or a point and an edge meet. */
const MEETING_DISTANCE = 1e-9;

/**
 * Whether two plots look like they share ground, as a first hint before sgt, which measures the
 * area they share and has the final say. It finds a plot crossing another, lying inside it, or
 * being the same, and lets plots that only meet along an edge or at a corner through, as sgt does.
 * It does not measure how much they share, so a sliver sgt would tolerate still shows up here.
 */
export function overlaps(first: Polygon, second: Polygon): boolean {
  const a = first.coordinates[0];
  const b = second.coordinates[0];

  if (!boundsMeet(a, b)) {
    return false;
  }
  return edgesCross(a, b) || pointsOf(a).some((point) => strictlyInside(point, b)) || pointsOf(b).some((point) => strictlyInside(point, a));
}

/** The corners and one point well inside, which tells a plot lying exactly on another. */
function pointsOf(ring: Position[]): Position[] {
  const inner = interiorPoint(ring);
  return inner ? [...ring, inner] : ring;
}

function boundsMeet(a: Position[], b: Position[]): boolean {
  const [aWest, aSouth, aEast, aNorth] = boundsOf(a);
  const [bWest, bSouth, bEast, bNorth] = boundsOf(b);
  return aWest < bEast && bWest < aEast && aSouth < bNorth && bSouth < aNorth;
}

function boundsOf(ring: Position[]): [number, number, number, number] {
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Whether an edge of one ring crosses an edge of the other through both, not just touching. */
function edgesCross(a: Position[], b: Position[]): boolean {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      if (crossThrough(a[i], a[i + 1], b[j], b[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

function crossThrough(p: Position, q: Position, r: Position, s: Position): boolean {
  const d1 = side(r, s, p);
  const d2 = side(r, s, q);
  const d3 = side(p, q, r);
  const d4 = side(p, q, s);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Which side of the line from a to b the point lies on: positive, negative, or zero when on it. */
function side(a: Position, b: Position, point: Position): number {
  const cross = (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
  return Math.abs(cross) < MEETING_DISTANCE ** 2 ? 0 : Math.sign(cross);
}

/** Inside the ring and not on its edge, by casting a ray east and counting the edges it crosses. */
function strictlyInside(point: Position, ring: Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (onEdge(point, ring[j], ring[i])) {
      return false;
    }
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function onEdge(point: Position, a: Position, b: Position): boolean {
  if (side(a, b, point) !== 0) {
    return false;
  }
  return (
    Math.min(a[0], b[0]) - MEETING_DISTANCE <= point[0] &&
    point[0] <= Math.max(a[0], b[0]) + MEETING_DISTANCE &&
    Math.min(a[1], b[1]) - MEETING_DISTANCE <= point[1] &&
    point[1] <= Math.max(a[1], b[1]) + MEETING_DISTANCE
  );
}

/**
 * A point inside the ring: its centroid when that falls inside, as it does for most plots, or
 * else the middle of the first stretch inside along the horizontal line through the centroid.
 */
function interiorPoint(ring: Position[]): Position | null {
  const centroid = centroidOf(ring);
  if (!centroid) {
    return null;
  }
  if (strictlyInside(centroid, ring)) {
    return centroid;
  }
  const y = centroid[1];
  const crossings: number[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    if (y1 > y !== y2 > y) {
      crossings.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
  }
  crossings.sort((left, right) => left - right);
  return crossings.length >= 2 ? [(crossings[0] + crossings[1]) / 2, y] : null;
}

function centroidOf(ring: Position[]): Position | null {
  let twiceTheArea = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const cross = x1 * y2 - x2 * y1;
    twiceTheArea += cross;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
  }
  return twiceTheArea === 0 ? null : [x / (3 * twiceTheArea), y / (3 * twiceTheArea)];
}
