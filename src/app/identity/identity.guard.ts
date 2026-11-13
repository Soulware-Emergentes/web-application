import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Identity } from './identity';

/**
 * The query parameter the callback adds when sending the person to the welcome page after a silent
 * sign-in found no staff session, so the welcome page shows instead of trying again.
 */
export const SIGNED_OUT_PARAMETER = 'signedOut';

/** What a route does with someone already signed in in this tab. */
export interface IdentityGuardOptions {
  /** `pass` lets them in, for protected routes; `leave` sends them on to where they were headed. */
  whenSignedIn: 'pass' | 'leave';
}

/**
 * Decides who reaches a route. Anyone not signed in in this tab is signed in silently first: a
 * browser that has already logged in to staff, from another tab or application, comes straight back
 * with a session. Only once staff has said there is none does the welcome page show.
 */
export function identityGuard({ whenSignedIn }: IdentityGuardOptions): CanActivateFn {
  return (route, state) => {
    const identity = inject(Identity);
    const leaving = whenSignedIn === 'leave';
    const returnUrl = leaving ? (route.queryParamMap.get('returnUrl') ?? '/') : state.url;

    if (identity.isSignedIn()) {
      return leaving ? inject(Router).parseUrl(returnUrl) : true;
    }
    if (leaving && route.queryParamMap.has(SIGNED_OUT_PARAMETER)) {
      return true;
    }

    void identity.signIn(returnUrl, { silent: true });
    return false;
  };
}
