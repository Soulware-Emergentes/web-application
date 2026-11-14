import { HttpClient, HttpParams } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Language } from '../i18n/language';
import { readClaims } from './jwt';

/** Keys under which the pending authorization request is kept until staff redirects back. */
const AUTHORIZATION_REQUEST_KEYS = {
  state: 'staff.state',
  codeVerifier: 'staff.code_verifier',
  returnUrl: 'staff.return_url',
  silent: 'staff.silent',
  api: 'staff.api',
} as const;

/**
 * Where the tokens are kept for the life of the tab. A login ends with a second trip to staff, for
 * the beneficiary registry, and the page reloads on the way back, so memory alone would lose the
 * first token. Closing the tab forgets them.
 */
const TOKENS_KEY = 'staff.tokens';

/** The APIs this app calls, each with its own access token. */
type Api = 'sgt' | 'beneficiarios';

interface Tokens {
  accessToken: string;
  idToken: string;
  /** For the beneficiary registry; null when staff gave none, as to someone with no role there. */
  beneficiariosToken: string | null;
}

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
  id_token?: string;
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
  private readonly tokens = signal<Tokens | null>(restoredTokens());

  readonly isSignedIn = computed(() => this.tokens() !== null);
  readonly accessToken = computed(() => this.tokens()?.accessToken ?? null);
  readonly idToken = computed(() => this.tokens()?.idToken ?? null);
  readonly beneficiariosToken = computed(() => this.tokens()?.beneficiariosToken ?? null);

  /** Sends the browser to staff's authorization endpoint, remembering where to come back to. */
  async signIn(returnUrl: string, { silent = false }: SignInOptions = {}): Promise<void> {
    await this.authorize('sgt', environment.staff.scope, returnUrl, silent);
  }

  /**
   * Forgets the tokens and sends the browser to staff's logout endpoint, which ends the staff
   * session and redirects back here, so the next visit asks for credentials again.
   */
  signOut(): void {
    const { issuer, clientId, postLogoutRedirectUri } = environment.staff;
    const idToken = this.idToken();

    this.keep(null);

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
   * request this browser made. A login for sgt then goes straight back to staff, silently, for a
   * token for the beneficiary registry; that trip ends here too, with or without one.
   *
   * @throws InteractionRequired when a silent sign-in found no staff session
   * @throws SignInError when staff refused the sign-in or the response does not answer it
   * @returns the URL the person was headed to before signing in, or null while the browser is on
   *          its way to staff for the second token
   */
  async completeSignIn(response: AuthorizationResponse): Promise<string | null> {
    const state = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.state);
    const codeVerifier = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.codeVerifier);
    const returnUrl = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.returnUrl) ?? '/';
    const silent = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.silent) === 'true';
    const api = sessionStorage.getItem(AUTHORIZATION_REQUEST_KEYS.api) as Api | null;
    Object.values(AUTHORIZATION_REQUEST_KEYS).forEach((key) => sessionStorage.removeItem(key));
    const answersThisRequest = !response.error && !!response.code && !!codeVerifier && response.state === state;

    if (api === 'beneficiarios') {
      const signedIn = this.tokens();
      if (signedIn && answersThisRequest) {
        const tokens = await this.exchange(response.code!, codeVerifier!).catch(() => null);
        this.keep({ ...signedIn, beneficiariosToken: tokens?.access_token ?? null });
      }
      return returnUrl;
    }

    if (silent && response.error && INTERACTION_REQUIRED_ERRORS.has(response.error) && response.state === state) {
      throw new InteractionRequired(returnUrl);
    }
    if (response.error) {
      throw new SignInError(response.error);
    }
    if (!answersThisRequest) {
      throw new SignInError('invalid_response');
    }

    const tokens = await this.exchange(response.code!, codeVerifier!);
    this.keep({ accessToken: tokens.access_token, idToken: tokens.id_token ?? '', beneficiariosToken: null });

    await this.authorize('beneficiarios', environment.beneficiarios.resource, returnUrl, true);
    return null;
  }

  private async authorize(api: Api, scope: string, returnUrl: string, silent: boolean): Promise<void> {
    const { issuer, clientId, redirectUri } = environment.staff;
    const state = randomString();
    const codeVerifier = randomString();

    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.state, state);
    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.codeVerifier, codeVerifier);
    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.returnUrl, returnUrl);
    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.silent, String(silent));
    sessionStorage.setItem(AUTHORIZATION_REQUEST_KEYS.api, api);

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

  private exchange(code: string, codeVerifier: string): Promise<TokenResponse> {
    const { issuer, clientId, redirectUri } = environment.staff;
    const body = new HttpParams({
      fromObject: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      },
    });
    return firstValueFrom(this.http.post<TokenResponse>(new URL('/oauth2/token', issuer).toString(), body));
  }

  private keep(tokens: Tokens | null): void {
    this.tokens.set(tokens);
    if (tokens) {
      sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } else {
      sessionStorage.removeItem(TOKENS_KEY);
    }
  }
}

/** The tokens this tab signed in with, unless sgt's has expired, which means signing in again. */
function restoredTokens(): Tokens | null {
  try {
    const tokens = JSON.parse(sessionStorage.getItem(TOKENS_KEY) ?? 'null') as Tokens | null;
    const expiresAt = tokens ? Number(readClaims(tokens.accessToken)['exp']) * 1000 : 0;
    return expiresAt > Date.now() ? tokens : null;
  } catch {
    return null;
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
