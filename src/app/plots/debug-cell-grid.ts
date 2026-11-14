// TEMPORARY: draws the cells plots are loaded by, to check the grid by eye. Remove this file and its
// two lines in plot-map.ts when done.
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { boundingBoxOf, cellsAround, keyOf } from './plot-cells';

const SOURCE = 'debug-cells';

export function showCellGrid(map: MapLibreMap): void {
  map.addSource(SOURCE, { type: 'geojson', data: gridAround(map) });
  map.addLayer({
    id: 'debug-cell-edges',
    type: 'line',
    source: SOURCE,
    paint: { 'line-color': '#ff00aa', 'line-width': 2, 'line-dasharray': [3, 2] },
  });
  map.addLayer({
    id: 'debug-cell-keys',
    type: 'symbol',
    source: SOURCE,
    layout: { 'text-field': ['get', 'key'], 'text-font': ['Open Sans Semibold'], 'text-size': 14 },
    paint: { 'text-color': '#ff00aa', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
  });

  map.on('moveend', () => map.getSource<GeoJSONSource>(SOURCE)?.setData(gridAround(map)));
}

function gridAround(map: MapLibreMap): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: cellsAround(map.getBounds(), map.getZoom()).map((cell): Feature<Polygon> => {
      const [west, south, east, north] = boundingBoxOf(cell).split(',').map(Number);
      return {
        type: 'Feature',
        properties: { key: keyOf(cell) },
        geometry: {
          type: 'Polygon',
          coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
        },
      };
    }),
  };
}
