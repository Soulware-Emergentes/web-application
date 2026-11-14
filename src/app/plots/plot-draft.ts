import type { Polygon } from 'geojson';
import { LegalDocumentType } from '../beneficiaries/legal-document';
import { Vertex, completeVertices, emptyVertex } from './perimeter';
import { UtmZone } from './plots-api';
import { southernUtmToLngLat } from './utm';

/** A plot being entered, not sent to sgt yet. */
export interface NewPlot {
  documentType: LegalDocumentType;
  documentNumber: string;
  vertices: Vertex[];
}

/** A plot looked at on the map, and whether it looked like it crossed a registered one. */
export interface DraftedPlot {
  readonly plot: NewPlot;
  readonly crossing: boolean;
}

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
