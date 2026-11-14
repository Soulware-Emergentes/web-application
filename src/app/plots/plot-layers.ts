import type { FeatureCollection, Point, Polygon } from 'geojson';
import { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { centresOf } from './plot-centres';

/**
 * How plots show at each zoom. Far out a plot is smaller than a pixel, so it shows as a point, and
 * points close together on screen merge into one cluster labelled with how many plots it holds.
 * From {@link OUTLINES_FROM_ZOOM} on, a plot is big enough to draw as its own outline.
 */
const OUTLINES_FROM_ZOOM = 12;
const CLUSTER_RADIUS_PIXELS = 50;
const LABEL_FONT = ['Open Sans Semibold'];

const SOURCES = { outlines: 'plot-outlines', centres: 'plot-centres' } as const;
const LAYERS = {
  fill: 'plot-fill',
  outline: 'plot-outline',
  clusters: 'plot-clusters',
  clusterCounts: 'plot-cluster-counts',
  points: 'plot-points',
} as const;

export interface PlotColours {
  plot: string;
  label: string;
}

const NO_PLOTS: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] };

/** Adds the layers plots show in, empty until {@link showPlots} fills them. */
export function addPlotLayers(map: MapLibreMap, colours: PlotColours): void {
  addOutlines(map, colours);
  addClusteredCentres(map, colours);
  zoomIntoClustersOnClick(map);
}

export function showPlots(map: MapLibreMap, plots: FeatureCollection<Polygon>): void {
  map.getSource<GeoJSONSource>(SOURCES.outlines)?.setData(plots);
  map.getSource<GeoJSONSource>(SOURCES.centres)?.setData(centresOf(plots));
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
