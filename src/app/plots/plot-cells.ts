import { LngLatBounds } from 'maplibre-gl';

/**
 * The map split into fixed cells, the slippy-map tiles of one zoom level. Plots are asked for one
 * cell at a time: a cell's bounding box never changes, so the same cell is the same URL and the
 * browser can answer it from its cache.
 */
export interface Cell {
  zoom: number;
  x: number;
  y: number;
}

/** Cells a couple of levels coarser than the map, so a view spans a handful of them, not dozens. */
const LEVELS_COARSER_THAN_THE_MAP = 2;
/** Plots turn into outlines at zoom 12; past this level cells stop shrinking, so zooming in asks nothing. */
const FINEST_CELL_ZOOM = 10;
/** How far past each side of the view cells are loaded, as a share of the view, so short pans find them there. */
const MARGIN = 0.42;
/** The latitudes web mercator tiles reach. */
const MAX_LATITUDE = 85.0511;

export function cellsAround(view: LngLatBounds, mapZoom: number): Cell[] {
  const zoom = clamp(Math.floor(mapZoom) - LEVELS_COARSER_THAN_THE_MAP, 0, FINEST_CELL_ZOOM);
  const width = view.getEast() - view.getWest();
  const height = view.getNorth() - view.getSouth();

  const [westX, northY] = cellIndexAt(view.getWest() - width * MARGIN, view.getNorth() + height * MARGIN, zoom);
  const [eastX, southY] = cellIndexAt(view.getEast() + width * MARGIN, view.getSouth() - height * MARGIN, zoom);

  const cells: Cell[] = [];
  for (let x = westX; x <= eastX; x++) {
    for (let y = northY; y <= southY; y++) {
      cells.push({ zoom, x, y });
    }
  }
  return cells;
}

/** The cell one level coarser that holds this one, or null for the cell holding the whole world. */
export function parentOf(cell: Cell): Cell | null {
  return cell.zoom === 0 ? null : { zoom: cell.zoom - 1, x: cell.x >> 1, y: cell.y >> 1 };
}

export function keyOf(cell: Cell): string {
  return `${cell.zoom}/${cell.x}/${cell.y}`;
}

/** west,south,east,north, written the same way every time so the URL repeats. */
export function boundingBoxOf(cell: Cell): string {
  return [
    longitudeAt(cell.x, cell.zoom),
    latitudeAt(cell.y + 1, cell.zoom),
    longitudeAt(cell.x + 1, cell.zoom),
    latitudeAt(cell.y, cell.zoom),
  ]
    .map((degrees) => degrees.toFixed(6))
    .join(',');
}

function cellIndexAt(longitude: number, latitude: number, zoom: number): [number, number] {
  const cellsPerSide = 2 ** zoom;
  const radians = (clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180;
  const x = ((clamp(longitude, -180, 180) + 180) / 360) * cellsPerSide;
  const y = ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * cellsPerSide;

  return [clamp(Math.floor(x), 0, cellsPerSide - 1), clamp(Math.floor(y), 0, cellsPerSide - 1)];
}

function longitudeAt(x: number, zoom: number): number {
  return (x / 2 ** zoom) * 360 - 180;
}

function latitudeAt(y: number, zoom: number): number {
  const mercator = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (Math.atan(Math.sinh(mercator)) * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
