import type { Feature, FeatureCollection, Point, Polygon, Position } from 'geojson';

/** Each plot reduced to the point at its middle, which is all a map needs to group plots by. */
export function centresOf(plots: FeatureCollection<Polygon>): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: plots.features.map(
      (plot): Feature<Point> => ({
        type: 'Feature',
        id: plot.id,
        properties: {},
        geometry: { type: 'Point', coordinates: centreOf(plot.geometry) },
      }),
    ),
  };
}

function centreOf(plot: Polygon): Position {
  const corners = plot.coordinates[0].slice(0, -1);
  const [longitudes, latitudes] = corners.reduce(
    ([longitudeSum, latitudeSum], [longitude, latitude]) => [longitudeSum + longitude, latitudeSum + latitude],
    [0, 0],
  );

  return [longitudes / corners.length, latitudes / corners.length];
}
