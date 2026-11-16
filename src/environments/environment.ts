/** Production settings. */
export const environment = {
  // Every API is reached through the BFF, which serves the SPA too, so on the SPA's own origin.
  sgt: { api: '/api/sgt' },
  beneficiarios: { api: '/api/beneficiarios' },
  map: {
    // The basemap this deployment serves itself.
    basemapTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    basemapAttribution: '© OpenStreetMap contributors',
    // The fonts the map writes labels with, such as how many plots a cluster holds.
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  },
};
