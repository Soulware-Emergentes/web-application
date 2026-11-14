import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Identity } from './identity';

/**
 * Proves who is calling with the access token staff issued for the API the request goes to: sgt's
 * to sgt, the beneficiary registry's to it. No other host gets either.
 */
export const bearerTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const identity = inject(Identity);
  const goesTo = (api: string) => api !== '' && request.url.startsWith(api);
  const accessToken = goesTo(environment.sgt.api)
    ? identity.accessToken()
    : goesTo(environment.beneficiarios.api)
      ? identity.beneficiariosToken()
      : null;

  return accessToken
    ? next(request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }))
    : next(request);
};
