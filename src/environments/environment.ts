/** Production settings. The staff values are the ones registered for this deployment's client. */
export const environment = {
  staff: {
    issuer: '',
    clientId: '',
    redirectUri: '',
    postLogoutRedirectUri: '',
    scope: 'openid profile',
  },
  sgt: {
    // sgt's API in this deployment.
    api: '',
  },
  beneficiarios: {
    // The beneficiary registry's API in this deployment, and its identifier in staff.
    api: '',
    resource: '',
  },
  map: {
    // The basemap this deployment serves itself.
    basemapTiles: '',
    basemapAttribution: '',
    // The fonts the map writes labels with, such as how many plots a cluster holds.
    glyphs: '',
  },
};
