import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from './session';

/**
 * The query parameter the BFF adds when sending the person to the welcome page after a silent
 * sign-in found no staff session, so the welcome page shows instead of trying again.
 */
export const SIGNED_OUT_PARAMETER = 'signedOut';

/** What a route does with someone already signed in. */
export interface IdentityGuardOptions {
  /** `pass` lets them in, for protected routes; `leave` sends them on to where they were headed. */
  whenSignedIn: 'pass' | 'leave';
}

/**
 * Decides who reaches a route. Anyone the BFF holds no session for is signed in silently first: a
 * browser that has already logged in to staff, from another tab or application, comes straight back
 * with a session. Only once staff has said there is none does the welcome page show.
 */
export function identityGuard({ whenSignedIn }: IdentityGuardOptions): CanActivateFn {
  return async (route, state) => {
    const session = inject(Session);
    const router = inject(Router);
    const leaving = whenSignedIn === 'leave';
    const returnUrl = leaving ? (route.queryParamMap.get('returnUrl') ?? '/') : state.url;

    // The BFF only sends the browser here once staff has said there is no session: nothing to ask.
    if (leaving && route.queryParamMap.has(SIGNED_OUT_PARAMETER)) {
      return true;
    }
    if (await session.restore()) {
      return leaving ? router.parseUrl(returnUrl) : true;
    }

    session.signIn(returnUrl, { silent: true });
    return false;
  };
}
