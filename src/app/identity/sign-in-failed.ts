import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Where the BFF sends the browser when staff refused the sign-in or it could not be completed. */
@Component({
  selector: 'app-sign-in-failed',
  imports: [TranslocoPipe],
  template: `
    <main class="flex min-h-screen items-center justify-center p-lg">
      <div
        class="flex flex-wrap items-center gap-sm rounded-lg border border-status-error bg-status-error-subtle px-lg py-md text-label-md text-status-error-text"
        role="alert"
      >
        {{ 'signInFailed.message' | transloco }}
        <button
          class="text-text-link underline hover:text-text-link-hover"
          type="button"
          (click)="retry()"
        >
          {{ 'signInFailed.retry' | transloco }}
        </button>
      </div>
    </main>
  `,
})
export class SignInFailed {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected retry(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

    void this.router.navigate(['/signing-in'], { queryParams: { returnUrl }, replaceUrl: true });
  }
}
