import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT, Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Language } from '../i18n/language';

/** The claims of a token staff issued, as the BFF reads them out. */
export type Claims = Record<string, unknown>;

/**
 * What the BFF answers `/bff/me` with: the claims of the person's ID token and of sgt's access token,
 * and how many seconds the login has left.
 */
interface Me {
  idToken: Claims;
  accessToken: Claims;
  expiresIn: number;
}

/** How a sign-in reaches staff. */
export interface SignInOptions {
  /**
   * Asks staff not to show anything (`prompt=none`): it answers at once when the browser has
   * already logged in there, and the BFF sends the browser to the welcome page when it has not.
   */
  silent?: boolean;
}

/** The cookie the BFF hands the CSRF token in, which a form it is sent to must echo. */
const CSRF_COOKIE = 'XSRF-TOKEN';

/**
 * Who is signed in. The BFF holds the session and the tokens; the browser holds only its cookie, so
 * this asks the BFF who the person is, and sends the browser to it to sign in and out.
 */
@Service()
export class Session {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly language = inject(Language);
  /** Undefined until the BFF has been asked; null when it holds no session. */
  private readonly me = signal<Me | null | undefined>(undefined);

  readonly isSignedIn = computed(() => !!this.me());
  readonly idTokenClaims = computed(() => this.me()?.idToken ?? null);
  readonly accessTokenClaims = computed(() => this.me()?.accessToken ?? null);
  /** When the login ends, in milliseconds since the epoch by this browser's clock; null without one. */
  readonly endsAt = signal<number | null>(null);
  /** Whether the session ended while the person was using the app, which they are told about. */
  readonly ended = signal(false);

  /** @returns whether the BFF holds a session for this browser, asking it only the first time */
  async restore(): Promise<boolean> {
    if (this.me() === undefined) {
      const me = await firstValueFrom(this.http.get<Me>('/bff/me')).catch((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return null;
        }
        throw error;
      });
      this.me.set(me);
      this.endsAt.set(me ? Date.now() + me.expiresIn * 1000 : null);
    }
    return this.isSignedIn();
  }

  /** Marks the session as ended, as when the BFF answers 401 once the login has lasted its maximum. */
  end(): void {
    if (this.isSignedIn()) {
      this.ended.set(true);
    }
  }

  /** Sends the browser to the BFF to sign in with staff, remembering where to come back to. */
  signIn(returnUrl: string, { silent = false }: SignInOptions = {}): void {
    const login = new URLSearchParams({ returnUrl, ui_locales: this.language.current() });
    if (silent) {
      login.set('prompt', 'none');
    }
    this.document.location.assign(`/bff/login?${login}`);
  }

  /**
   * Ends the session in the BFF, which sends the browser on to staff to end it there too, and back
   * here, so the next visit asks for credentials again. A form, so the browser follows those
   * redirects itself.
   */
  signOut(): void {
    const form = this.document.createElement('form');
    form.method = 'POST';
    form.action = '/bff/logout';
    const fields = { _csrf: this.cookie(CSRF_COOKIE) ?? '', ui_locales: this.language.current() };
    for (const [name, value] of Object.entries(fields)) {
      const input = this.document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.append(input);
    }
    this.document.body.append(form);
    form.submit();
  }

  private cookie(name: string): string | null {
    const cookie = this.document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
  }
}
