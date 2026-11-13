import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Splash } from '../shared/splash';
import { Identity, InteractionRequired } from './identity';
import { SIGNED_OUT_PARAMETER } from './identity.guard';

/**
 * Where staff redirects back to after sign-in: completes it and continues to the app. A silent
 * sign-in that found no staff session goes to the welcome page instead, to sign in from there.
 */
@Component({
  selector: 'app-callback',
  imports: [Splash, TranslocoPipe],
  template: `
    @if (failed()) {
      <main class="flex min-h-screen items-center justify-center p-lg">
        <div
          class="flex flex-wrap items-center gap-sm rounded-lg border border-status-error bg-status-error-subtle px-lg py-md text-label-md text-status-error-text"
          role="alert"
        >
          {{ 'callback.failed' | transloco }}
          <button
            class="text-text-link underline hover:text-text-link-hover"
            type="button"
            (click)="retry()"
          >
            {{ 'callback.retry' | transloco }}
          </button>
        </div>
      </main>
    } @else {
      <app-splash />
    }
  `,
})
export class Callback implements OnInit {
  private readonly identity = inject(Identity);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;

    try {
      const returnUrl = await this.identity.completeSignIn({
        code: params.get('code'),
        state: params.get('state'),
        error: params.get('error'),
      });
      await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    } catch (error) {
      if (error instanceof InteractionRequired) {
        await this.router.navigate(['/welcome'], {
          queryParams: { returnUrl: error.returnUrl, [SIGNED_OUT_PARAMETER]: '' },
          replaceUrl: true,
        });
        return;
      }
      this.failed.set(true);
    }
  }

  protected retry(): void {
    void this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
