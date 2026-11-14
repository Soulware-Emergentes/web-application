import type { Polygon } from 'geojson';
import { ExpressionSpecification, GeoJSONSource, LngLatBounds, Map as MapLibreMap } from 'maplibre-gl';

const SOURCE = 'plot-preview';
const FIT_PADDING_PIXELS = 80;
/** How close the map comes to a previewed plot, so a small one still shows its surroundings. */
const FIT_MAX_ZOOM = 17;
/**
 * The way to a previewed plot: the map holds almost still for a moment, so it reads as the plot
 * being found, then zooms in fast and settles onto it.
 */
const HOLD_MS = 1500;
const ZOOM_MS = 1650;
/** How much of the way the map drifts while it holds, enough to show it is not stuck. */
const DRIFT_WHILE_HOLDING = 0.06;
const FIT_DURATION_MS = HOLD_MS + ZOOM_MS;

function holdThenZoom(progress: number): number {
  const holdShare = HOLD_MS / FIT_DURATION_MS;
  if (progress < holdShare) {
    return DRIFT_WHILE_HOLDING * (progress / holdShare) ** 2;
  }
  // The zoom picks up at the speed the hold ends with, so it gathers pace instead of jolting, and
  // comes to rest on the plot: a cubic Hermite curve from where the hold left off to the end.
  const zooming = (progress - holdShare) / (1 - holdShare);
  const speedLeavingTheHold = (2 * DRIFT_WHILE_HOLDING * (1 - holdShare)) / holdShare;
  const fromHold = 2 * zooming ** 3 - 3 * zooming ** 2 + 1;
  const withSpeed = zooming ** 3 - 2 * zooming ** 2 + zooming;
  const toEnd = -2 * zooming ** 3 + 3 * zooming ** 2;
  return fromHold * DRIFT_WHILE_HOLDING + withSpeed * speedLeavingTheHold + toEnd;
}

/** Adds the layers a draft plot shows in, drawn apart from registered plots: dashed and on top. */
export interface PlotPreviewColours {
  /** For a preview that crosses no registered plot, apart from the colour registered plots take. */
  plot: string;
  /** For a preview that looks like it crosses a registered plot. */
  crossing: string;
}

export function addPlotPreviewLayer(map: MapLibreMap, colours: PlotPreviewColours): void {
  const colour: ExpressionSpecification = ['case', ['get', 'crossing'], colours.crossing, colours.plot];

  map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'plot-preview-fill',
    type: 'fill',
    source: SOURCE,
    paint: { 'fill-color': colour, 'fill-opacity': 0.15 },
  });
  map.addLayer({
    id: 'plot-preview-outline',
    type: 'line',
    source: SOURCE,
    paint: { 'line-color': colour, 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
  });
}

/** Draws the draft plot, in the crossing colour when it looks like it crosses a registered plot, or clears it. */
export function showPlotPreview(map: MapLibreMap, perimeter: Polygon | null, crossing: boolean): void {
  map.getSource<GeoJSONSource>(SOURCE)?.setData(
    perimeter ? { type: 'Feature', properties: { crossing }, geometry: perimeter } : { type: 'FeatureCollection', features: [] },
  );
}

/** Brings the draft plot into view. */
export function flyToPlotPreview(map: MapLibreMap, perimeter: Polygon | null): void {
  if (perimeter) {
    map.fitBounds(boundsOf(perimeter), {
      padding: FIT_PADDING_PIXELS,
      maxZoom: FIT_MAX_ZOOM,
      duration: FIT_DURATION_MS,
      easing: holdThenZoom,
    });
  }
}

/**
 * Glides to the previewed perimeter, moving and zooming at a nearly even pace (an ease rather than
 * MapLibre's default arc, which zooms out and back in).
 */
export function glideToPlotPreview(map: MapLibreMap, perimeter: Polygon): void {
  map.fitBounds(boundsOf(perimeter), {
    padding: FIT_PADDING_PIXELS,
    maxZoom: FIT_MAX_ZOOM,
    linear: true,
    duration: GLIDE_MS,
    easing: nearlyLinear,
  });
}

const GLIDE_MS = 900;
/** How much of a smooth start and stop is mixed into an even pace. */
const GLIDE_SOFTENING = 0.25;

function nearlyLinear(t: number): number {
  const smooth = t * t * (3 - 2 * t);
  return (1 - GLIDE_SOFTENING) * t + GLIDE_SOFTENING * smooth;
}

function boundsOf(perimeter: Polygon): LngLatBounds {
  const bounds = new LngLatBounds();
  perimeter.coordinates[0].forEach(([longitude, latitude]) => bounds.extend([longitude, latitude]));
  return bounds;
}
