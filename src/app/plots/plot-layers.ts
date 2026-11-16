import type { FeatureCollection, Point, Polygon } from 'geojson';
import { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { centresOf } from './plot-centres';

/**
 * How plots show at each zoom. Far out a plot is smaller than a pixel, so it shows as a point, and
 * points close together on screen merge into one cluster labelled with how many plots it holds.
 * From {@link OUTLINES_FROM_ZOOM} on, a plot is big enough to draw as its own outline.
 */
const OUTLINES_FROM_ZOOM = 12;
const CLUSTER_RADIUS_PIXELS = 50;
const LABEL_FONT = ['Open Sans Semibold'];
/** A marked plot's outline, at rest and at the top of a pulse. */
const MARKED_LINE_WIDTH = 3.5;
const PULSE_LINE_WIDTH = 7;
/** How a newly crossed plot draws the eye: a few pulses of its outline. */
const PULSES = 3;
const PULSE_MS = 550;

const SOURCES = { outlines: 'plot-outlines', centres: 'plot-centres' } as const;
const LAYERS = {
  fill: 'plot-fill',
  outline: 'plot-outline',
  clusters: 'plot-clusters',
  clusterCounts: 'plot-cluster-counts',
  points: 'plot-points',
  crossedFill: 'plot-crossed-fill',
  crossedOutline: 'plot-crossed-outline',
  registeredFill: 'plot-registered-fill',
  registeredOutline: 'plot-registered-outline',
} as const;

export interface PlotColours {
  plot: string;
  label: string;
  /** A registered plot a new one was refused for crossing. */
  crossed: string;
  /** A plot just registered. */
  registered: string;
}

/** The plots to set apart from the rest, by id. */
export interface MarkedPlots {
  crossed: readonly string[];
  registered: readonly string[];
}

const NO_PLOTS: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] };

/** Adds the layers plots show in, empty until {@link showPlots} fills them. */
export function addPlotLayers(map: MapLibreMap, colours: PlotColours): void {
  addOutlines(map, colours);
  addMarkedOutlines(map, colours);
  addClusteredCentres(map, colours);
  zoomIntoClustersOnClick(map);
}

export function showPlots(map: MapLibreMap, plots: FeatureCollection<Polygon>): void {
  // Each plot's id as a property too, since MapLibre only matches ids that are numbers.
  const withIds: FeatureCollection<Polygon> = {
    ...plots,
    features: plots.features.map((plot) => ({ ...plot, properties: { ...plot.properties, id: plot.id } })),
  };
  map.getSource<GeoJSONSource>(SOURCES.outlines)?.setData(withIds);
  map.getSource<GeoJSONSource>(SOURCES.centres)?.setData(centresOf(plots));
}

/**
 * Sets apart the plots given, over the rest and over the drafted plot's preview, until marked
 * again; the outlines of the plots it marks pulse a few times so they catch the eye.
 */
export function markPlots(map: MapLibreMap, { crossed, registered }: MarkedPlots): void {
  [LAYERS.crossedFill, LAYERS.crossedOutline, LAYERS.registeredFill, LAYERS.registeredOutline].forEach((layer) =>
    map.moveLayer(layer),
  );
  map.setFilter(LAYERS.crossedFill, withIdIn(crossed));
  map.setFilter(LAYERS.crossedOutline, withIdIn(crossed));
  map.setFilter(LAYERS.registeredFill, withIdIn(registered));
  map.setFilter(LAYERS.registeredOutline, withIdIn(registered));
  if (crossed.length > 0) {
    pulse(map, LAYERS.crossedOutline);
  }
  if (registered.length > 0) {
    pulse(map, LAYERS.registeredOutline);
  }
}

/** The pulse under way on each layer, so a new one takes its place rather than running beside it. */
const pulses = new Map<string, number>();

function pulse(map: MapLibreMap, layer: string): void {
  cancelAnimationFrame(pulses.get(layer) ?? 0);
  const start = performance.now();
  const step = (now: number) => {
    const progress = (now - start) / (PULSES * PULSE_MS);
    if (progress >= 1 || !map.getLayer(layer)) {
      if (map.getLayer(layer)) {
        map.setPaintProperty(layer, 'line-width', MARKED_LINE_WIDTH);
      }
      pulses.delete(layer);
      return;
    }
    const swell = (1 - Math.cos(2 * Math.PI * PULSES * progress)) / 2;
    map.setPaintProperty(layer, 'line-width', MARKED_LINE_WIDTH + (PULSE_LINE_WIDTH - MARKED_LINE_WIDTH) * swell);
    pulses.set(layer, requestAnimationFrame(step));
  };
  pulses.set(layer, requestAnimationFrame(step));
}

function withIdIn(ids: readonly string[]): ExpressionSpecification {
  return ['in', ['get', 'id'], ['literal', [...ids]]];
}

function addMarkedOutlines(map: MapLibreMap, colours: PlotColours): void {
  const marked = [
    { fill: LAYERS.crossedFill, outline: LAYERS.crossedOutline, colour: colours.crossed },
    { fill: LAYERS.registeredFill, outline: LAYERS.registeredOutline, colour: colours.registered },
  ];
  for (const { fill, outline, colour } of marked) {
    map.addLayer({
      id: fill,
      type: 'fill',
      source: SOURCES.outlines,
      minzoom: OUTLINES_FROM_ZOOM,
      filter: withIdIn([]),
      paint: { 'fill-color': colour, 'fill-opacity': 0.45 },
    });
    map.addLayer({
      id: outline,
      type: 'line',
      source: SOURCES.outlines,
      minzoom: OUTLINES_FROM_ZOOM,
      filter: withIdIn([]),
      paint: { 'line-color': colour, 'line-width': MARKED_LINE_WIDTH },
    });
  }
}

function addOutlines(map: MapLibreMap, colours: PlotColours): void {
  map.addSource(SOURCES.outlines, { type: 'geojson', data: NO_PLOTS });

  map.addLayer({
    id: LAYERS.fill,
    type: 'fill',
    source: SOURCES.outlines,
    minzoom: OUTLINES_FROM_ZOOM,
    paint: { 'fill-color': colours.plot, 'fill-opacity': 0.3 },
  });
  map.addLayer({
    id: LAYERS.outline,
    type: 'line',
    source: SOURCES.outlines,
    minzoom: OUTLINES_FROM_ZOOM,
    paint: { 'line-color': colours.plot, 'line-width': 1.5 },
  });
}

function addClusteredCentres(map: MapLibreMap, colours: PlotColours): void {
  map.addSource(SOURCES.centres, {
    type: 'geojson',
    data: centresOf(NO_PLOTS),
    cluster: true,
    clusterRadius: CLUSTER_RADIUS_PIXELS,
    clusterMaxZoom: OUTLINES_FROM_ZOOM - 1,
  });

  map.addLayer({
    id: LAYERS.clusters,
    type: 'circle',
    source: SOURCES.centres,
    maxzoom: OUTLINES_FROM_ZOOM,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': colours.plot,
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26],
      'circle-stroke-color': colours.label,
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: LAYERS.clusterCounts,
    type: 'symbol',
    source: SOURCES.centres,
    maxzoom: OUTLINES_FROM_ZOOM,
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': LABEL_FONT, 'text-size': 13 },
    paint: { 'text-color': colours.label },
  });
  map.addLayer({
    id: LAYERS.points,
    type: 'circle',
    source: SOURCES.centres,
    maxzoom: OUTLINES_FROM_ZOOM,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': colours.plot,
      'circle-radius': 6,
      'circle-stroke-color': colours.label,
      'circle-stroke-width': 2,
    },
  });
}

function zoomIntoClustersOnClick(map: MapLibreMap): void {
  map.on('click', LAYERS.clusters, async (event: MapLayerMouseEvent) => {
    const cluster = event.features?.[0];
    const centres = map.getSource<GeoJSONSource>(SOURCES.centres);
    if (!cluster || !centres) {
      return;
    }

    const zoom = await centres.getClusterExpansionZoom(cluster.properties['cluster_id']);
    const [longitude, latitude] = (cluster.geometry as Point).coordinates;
    map.easeTo({ center: [longitude, latitude], zoom });
  });

  map.on('mouseenter', LAYERS.clusters, () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', LAYERS.clusters, () => (map.getCanvas().style.cursor = ''));
}
