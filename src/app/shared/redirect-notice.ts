import { Component, input } from '@angular/core';

/** How long a redirect notice stays up before the browser leaves, so it can be read. */
export const REDIRECT_NOTICE_MS = 2000;

/** A full-page spinner telling the person where the browser is about to take them. */
@Component({
  selector: 'app-redirect-notice',
  template: `
    <main class="flex min-h-screen items-center justify-center p-lg">
      <div class="flex flex-col items-center gap-lg text-center" role="status" aria-live="polite">
        <span
          class="size-10 animate-spin rounded-full border-4 border-border-default border-t-brand-primary motion-reduce:animate-none"
          aria-hidden="true"
        ></span>
        <div class="flex flex-col gap-xs">
          <p class="text-h4 text-text-primary">{{ title() }}</p>
          <p class="text-body-sm text-text-secondary">{{ description() }}</p>
        </div>
      </div>
    </main>
  `,
})
export class RedirectNotice {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
