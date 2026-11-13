import { HttpClient, HttpParams } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Language } from '../i18n/language';

/** Keys under which the pending authorization request is kept until staff redirects back. */
const AUTHORIZATION_REQUEST_KEYS = {
  state: 'staff.state',
  codeVerifier: 'staff.code_verifier',
  returnUrl: 'staff.return_url',
  silent: 'staff.silent',
} as const;

/**
 * What staff answers a silent sign-in with when it cannot complete it without showing the person
 * something, which for staff means they have not logged in there yet.
 */
const INTERACTION_REQUIRED_ERRORS = new Set([
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
]);

/** What staff's token endpoint answers with. */
interface TokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
}

/** What staff redirected back to the callback with. */
export interface AuthorizationResponse {
  code: string | null;
  state: string | null;
  error: string | null;
}

/** Why a sign-in came back without a session. */
export class SignInError extends Error {}

/** A silent sign-in found no staff session: the person has to sign in themselves. */
export class InteractionRequired extends SignInError {
  constructor(readonly returnUrl: string) {
    super('interaction_required');
  }
}

/** How a sign-in reaches staff. */
export interface SignInOptions {
  /**
   * Asks staff not to show anything (`prompt=none`): it answers at once with a code when the
   * browser has already logged in there, and with an error when it has not.
   */
  silent?: boolean;
}

/** Who is signed in, and how to sign in with staff (authorization code with PKCE). */
@Injectable({ providedIn: 'root' })
export class Identity {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly language = inject(Language);
  private readonly tokens = signal<{ accessToken: string; idToken: string } | null>(null);

  readonly isSignedIn = computed(() => this.tokens() !== null);
  readonly accessToken = computed(() => this.tokens()?.accessToken ?? null);
  readonly idToken = computed(() => this.tokens()?.idToken ?? null);

  /** Sends the browser to staff's authorization endpoint, remembering where to come back to. */
  async signIn(returnUrl: string, { silent = false }: SignInOptions = {}): Promise<void> {
    const { issuer, clientId, redirectUri, scope } = environment.staff;
    const state = randomString();
    const codeVerifier = randomString();

    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.state, state);
    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.codeVerifier, codeVerifier);
    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.returnUrl, returnUrl);
    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.silent, String(silent));

    const authorize = new URL('/oauth2/authorize', issuer);
    authorize.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      code_challenge: await sha256(codeVerifier),
      code_challenge_method: 'S256',
      ui_locales: this.language.current(),
      ...(silent ? { prompt: 'none' } : {}),
    }).toString();

    this.document.location.assign(authorize.toString());
  }

  /**
   * Forgets the tokens and sends the browser to staff's logout endpoint, which ends the staff
   * session and redirects back here, so the next visit asks for credentials again.
   */
  signOut(): void {
    const { issuer, clientId, postLogoutRedirectUri } = environment.staff;
    const idToken = this.idToken();

    this.tokens.set(null);

    const logout = new URL('/connect/logout', issuer);
    logout.search = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: postLogoutRedirectUri,
      ui_locales: this.language.current(),
      ...(idToken ? { id_token_hint: idToken } : {}),
    }).toString();

    this.document.location.assign(logout.toString());
  }

  /**
   * Exchanges the code staff redirected back with for tokens, after checking it answers the
   * request this browser made.
   *
   * @throws InteractionRequired when a silent sign-in found no staff session
   * @throws SignInError when staff refused the sign-in or the response does not answer it
   * @returns the URL the person was headed to before signing in
   */
  async completeSignIn(response: AuthorizationResponse): Promise<string> {
    const state = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.state);
    const codeVerifier = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.codeVerifier);
    const returnUrl = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.returnUrl) ?? '/';
    const silent = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.silent) === 'true';
    Object.values(AUTHORIZATION_REQUEST_KEYS).forEach((key) => sessionStorage.removeItem(key));

    if (silent && response.error && INTERACTION_REQUIRED_ERRORS.has(response.error) && response.state === state) {
      throw new InteractionRequired(returnUrl);
    }
    if (response.error) {
      throw new SignInError(response.error);
    }
    if (!response.code || !codeVerifier || response.state !== state) {
      throw new SignInError('invalid_response');
    }

    const { issuer, clientId, redirectUri } = environment.staff;
    const body = new HttpParams({
      fromObject: {
        grant_type: 'authorization_code',
        code: response.code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      },
    });
    const tokens = await firstValueFrom(
      this.http.post<TokenResponse>(new URL('/oauth2/token', issuer).toString(), body),
    );

    this.tokens.set({ accessToken: tokens.access_token, idToken: tokens.id_token });
    return returnUrl;
  }
}

function randomString(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
