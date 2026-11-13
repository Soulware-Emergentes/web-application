import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Identity } from '../identity/identity';
import { readClaims } from '../identity/jwt';

/** Claims holding a time, in seconds since the epoch. */
const TIME_CLAIMS = new Set(['iat', 'exp', 'nbf', 'auth_time']);

interface Claim {
  name: string;
  value: string;
}

/** Shows every claim of the tokens staff issued at sign-in, to check a login end to end. */
@Component({
  selector: 'app-token-details',
  imports: [TranslocoPipe],
  template: `
    <main class="mx-auto flex max-w-content flex-col gap-xl p-lg sm:p-2xl">
      <header class="flex flex-wrap items-center justify-between gap-md">
        <h1 class="text-h2 text-text-primary">{{ 'tokenDetails.title' | transloco }}</h1>
        <button
          class="h-12 rounded-md bg-brand-primary px-xl text-label-lg text-text-on-primary hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:bg-brand-primary-pressed"
          type="button"
          (click)="signOut()"
        >
          {{ 'tokenDetails.signOut' | transloco }}
        </button>
      </header>

      @for (token of tokens(); track token.key) {
        <section
          class="flex flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-xl shadow-sm"
        >
          <h2 class="text-h4 text-text-primary">{{ token.key | transloco }}</h2>
          <dl class="grid grid-cols-1 gap-x-xl gap-y-sm sm:grid-cols-[max-content_1fr]">
            @for (claim of token.claims; track claim.name) {
              <dt class="text-label-md text-text-secondary">{{ claim.name }}</dt>
              <dd class="text-body-md break-all text-text-primary">{{ claim.value }}</dd>
            }
          </dl>
        </section>
      }
    </main>
  `,
})
export class TokenDetails {
  private readonly identity = inject(Identity);
  private readonly router = inject(Router);

  protected readonly tokens = computed(() => [
    { key: 'tokenDetails.idToken', claims: claimsOf(this.identity.idToken()) },
    { key: 'tokenDetails.accessToken', claims: claimsOf(this.identity.accessToken()) },
  ]);

  protected signOut(): void {
    void this.router.navigateByUrl('/signing-out');
  }
}

function claimsOf(token: string | null): Claim[] {
  if (!token) {
    return [];
  }

  return Object.entries(readClaims(token)).map(([name, value]) => ({
    name,
    value: format(name, value),
  }));
}

function format(name: string, value: unknown): string {
  if (TIME_CLAIMS.has(name) && typeof value === 'number') {
    return `${new Date(value * 1000).toLocaleString()} (${value})`;
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
