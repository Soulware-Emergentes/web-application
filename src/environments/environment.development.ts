/** Local settings, pointing at staff as `./mvnw spring-boot:run` serves it and at its dev client. */
export const environment = {
  staff: {
    issuer: 'http://localhost:8082',
    clientId: 'sgt-web-dev',
    redirectUri: 'http://localhost:4200/callback',
    postLogoutRedirectUri: 'http://localhost:4200/',
    scope: 'openid profile sgt-api-dev',
  },
};
