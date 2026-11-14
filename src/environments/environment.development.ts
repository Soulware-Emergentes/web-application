/** Local settings, pointing at staff as `./mvnw spring-boot:run` serves it and at its dev client. */
export const environment = {
  staff: {
    issuer: 'http://localhost:8082',
    clientId: 'sgt-web-dev',
    redirectUri: 'http://localhost:4200/callback',
    postLogoutRedirectUri: 'http://localhost:4200/',
    scope: 'openid profile sgt-api-dev',
  },
  sgt: {
    // sgt as `./mvnw spring-boot:run` serves it.
    api: 'http://localhost:8080/api/v1',
  },
  beneficiarios: {
    // The beneficiary registry as `./mvnw spring-boot:run` serves it, and the identifier staff
    // knows its API by, which the token for it is asked under.
    api: 'http://localhost:8081/api/v1',
    resource: 'beneficiarios-api-dev',
  },
  map: {
    // OpenStreetMap's own tiles: fine for development, not for production use.
    basemapTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    basemapAttribution: '© OpenStreetMap contributors',
    // The fonts the map writes labels with, such as how many plots a cluster holds.
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  },
};
