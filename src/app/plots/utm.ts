/** WGS 84, the ellipsoid UTM zones are drawn on. */
const SEMI_MAJOR_AXIS = 6_378_137;
const FLATTENING = 1 / 298.257_223_563;
const SCALE_ON_CENTRAL_MERIDIAN = 0.9996;
const FALSE_EASTING = 500_000;
/** Southern zones count northing up from 10 000 km south of the equator, so it never goes negative. */
const FALSE_NORTHING_SOUTH = 10_000_000;

const ECCENTRICITY_SQUARED = FLATTENING * (2 - FLATTENING);
const SECOND_ECCENTRICITY_SQUARED = ECCENTRICITY_SQUARED / (1 - ECCENTRICITY_SQUARED);

/**
 * A point of a southern UTM zone as longitude and latitude in degrees, by the inverse transverse
 * Mercator series (Snyder, Map Projections: A Working Manual, 1987), accurate to well under a
 * metre within a zone: enough to show a plot where it lies.
 */
export function southernUtmToLngLat(easting: number, northing: number, zone: number): [number, number] {
  const e2 = ECCENTRICITY_SQUARED;
  const ep2 = SECOND_ECCENTRICITY_SQUARED;
  const x = easting - FALSE_EASTING;
  const meridionalArc = (northing - FALSE_NORTHING_SOUTH) / SCALE_ON_CENTRAL_MERIDIAN;

  const mu = meridionalArc / (SEMI_MAJOR_AXIS * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const footprintLatitude =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sin = Math.sin(footprintLatitude);
  const cos = Math.cos(footprintLatitude);
  const tan = Math.tan(footprintLatitude);
  const radiusInPrimeVertical = SEMI_MAJOR_AXIS / Math.sqrt(1 - e2 * sin ** 2);
  const radiusInMeridian = (SEMI_MAJOR_AXIS * (1 - e2)) / (1 - e2 * sin ** 2) ** 1.5;
  const t = tan ** 2;
  const c = ep2 * cos ** 2;
  const d = x / (radiusInPrimeVertical * SCALE_ON_CENTRAL_MERIDIAN);

  const latitude =
    footprintLatitude -
    ((radiusInPrimeVertical * tan) / radiusInMeridian) *
      (d ** 2 / 2 -
        ((5 + 3 * t + 10 * c - 4 * c ** 2 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t + 298 * c + 45 * t ** 2 - 252 * ep2 - 3 * c ** 2) * d ** 6) / 720);
  const longitudeFromCentralMeridian =
    (d - ((1 + 2 * t + c) * d ** 3) / 6 + ((5 - 2 * c + 28 * t - 3 * c ** 2 + 8 * ep2 + 24 * t ** 2) * d ** 5) / 120) /
    cos;
  const centralMeridian = zone * 6 - 183;

  return [centralMeridian + toDegrees(longitudeFromCentralMeridian), toDegrees(latitude)];
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
