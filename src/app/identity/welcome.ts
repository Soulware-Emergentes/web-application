import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Where people without a session land: the organization's logo and a way to sign in with staff. */
@Component({
  selector: 'app-welcome',
  imports: [NgOptimizedImage, TranslocoPipe],
  template: `
    <main class="flex min-h-screen items-center justify-center p-lg">
      <div
        class="flex w-full max-w-100 flex-col items-center gap-xl rounded-lg border border-border-default bg-bg-surface p-xl text-center shadow-sm sm:p-2xl"
      >
        <img
          ngSrc="/images/depro-horizontal-color.svg"
          width="275"
          height="72"
          alt="DEPRO"
          priority
          class="h-12 w-auto"
        />
        <div class="flex flex-col gap-sm">
          <h1 class="text-h3 text-text-primary">{{ 'welcome.title' | transloco }}</h1>
          <p class="text-body-sm text-text-secondary">{{ 'welcome.description' | transloco }}</p>
        </div>
        <button
          class="h-12 w-full rounded-md bg-brand-primary px-xl text-label-lg text-text-on-primary hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:bg-brand-primary-pressed"
          type="button"
          (click)="signIn()"
        >
          {{ 'welcome.signIn' | transloco }}
        </button>
      </div>
    </main>
  `,
})
export class Welcome {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected signIn(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

    void this.router.navigate(['/signing-in'], { queryParams: { returnUrl } });
  }
}
