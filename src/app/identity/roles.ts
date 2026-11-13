import { Injectable, computed, inject } from '@angular/core';
import { Identity } from './identity';
import { readClaims } from './jwt';

/**
 * The signed-in person's roles in this app, as staff put them in the access token. {@link active}
 * is the role they act as, null when they hold several and have not picked one; {@link eligible}
 * is every role their groups hold here.
 */
@Injectable({ providedIn: 'root' })
export class Roles {
  private readonly identity = inject(Identity);
  private readonly claims = computed(() => {
    const token = this.identity.accessToken();
    return token ? readClaims(token) : {};
  });

  readonly active = computed(() => strings(this.claims()['roles'])[0] ?? null);
  readonly eligible = computed(() => strings(this.claims()['eligible_roles']));
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
