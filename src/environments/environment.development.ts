/** Local settings. */
export const environment = {
  // Every API is reached through the BFF, which `ng serve` proxies to (proxy.conf.json).
  sgt: { api: '/api/sgt' },
  beneficiarios: { api: '/api/beneficiarios' },
  map: {
    // OpenStreetMap's own tiles: fine for development, not for production use.
    basemapTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    basemapAttribution: '© OpenStreetMap contributors',
    // The fonts the map writes labels with, such as how many plots a cluster holds.
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  },
};
