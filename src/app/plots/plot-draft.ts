import type { Polygon } from 'geojson';
import { LegalDocumentType } from '../beneficiaries/legal-document';
import { Vertex, completeVertices, emptyVertex } from './perimeter';
import { RegisteredPlot, UtmZone } from './plots-api';
import { southernUtmToLngLat } from './utm';

/** A plot being entered, not sent to sgt yet. */
export interface NewPlot {
  documentType: LegalDocumentType;
  documentNumber: string;
  vertices: Vertex[];
}

/**
 * A plot looked at on the map, whether it looked like it crossed a registered one, and whether sgt
 * refused it for crossing one, which settles that it does.
 */
export interface DraftedPlot {
  readonly plot: NewPlot;
  readonly crossing: boolean;
  readonly refused: boolean;
}

/**
 * How the form to create a plot closed: with a plot to look at on the map, with one sgt refused for
 * crossing registered plots, with one it registered, or with the drafted plot thrown away. It closes
 * with nothing when dismissed, which leaves the drafted plot as it was.
 */
export type CreatePlotOutcome =
  | { readonly kind: 'DRAFTED'; readonly drafted: DraftedPlot }
  | { readonly kind: 'DISCARDED' }
  | { readonly kind: 'REFUSED'; readonly drafted: DraftedPlot; readonly crossedPlots: readonly string[] }
  | { readonly kind: 'REGISTERED'; readonly registered: RegisteredPlot };

/** The fewest corners a perimeter can close with. */
export const MIN_VERTICES = 3;
/** The design offers no choice of zone yet; plots are surveyed in 18S. */
export const UTM_ZONE: UtmZone = 'ZONE_18S';
const UTM_ZONE_NUMBER = 18;

export function emptyPlot(): NewPlot {
  return {
    documentType: 'DNI',
    documentNumber: '',
    vertices: Array.from({ length: MIN_VERTICES }, emptyVertex),
  };
}

export function samePerimeter(first: Polygon | null, second: Polygon | null): boolean {
  return JSON.stringify(first?.coordinates ?? null) === JSON.stringify(second?.coordinates ?? null);
}

export function sameVertices(first: readonly Vertex[], second: readonly Vertex[]): boolean {
  return (
    first.length === second.length &&
    first.every((vertex, at) => vertex.easting === second[at].easting && vertex.northing === second[at].northing)
  );
}

/** The plot's perimeter on WGS 84, from its complete vertices. */
export function perimeterOf(plot: NewPlot): Polygon {
  const ring = completeVertices(plot.vertices).map(({ easting, northing }) =>
    southernUtmToLngLat(easting, northing, UTM_ZONE_NUMBER),
  );
  return { type: 'Polygon', coordinates: [[...ring, ring[0]]] };
}

/** The perimeter's bounding box as sgt takes it: west,south,east,north. */
export function boundingBoxOf(perimeter: Polygon): string {
  const ring = perimeter.coordinates[0];
  const longitudes = ring.map(([longitude]) => longitude);
  const latitudes = ring.map(([, latitude]) => latitude);
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)]
    .map((degrees) => degrees.toFixed(6))
    .join(',');
}
