import { DialogRef } from '@angular/cdk/dialog';
import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Tells the person their session has ended, once the login has lasted its maximum, and takes them
 * to sign in again, back to where they were. It cannot be dismissed: nothing works until then.
 */
@Component({
  selector: 'app-session-ended-dialog',
  imports: [NgOptimizedImage, TranslocoPipe],
  host: {
    class: 'flex w-100 max-w-[calc(100vw-2rem)] flex-col items-center gap-xl rounded-xl bg-bg-surface p-2xl text-center shadow-lg',
  },
  template: `
    <span class="grid size-20 place-items-center rounded-full bg-status-warning-subtle">
      <img ngSrc="/icons/warning.svg" width="44" height="44" alt="" />
    </span>
    <div class="flex flex-col gap-sm">
      <h2 [id]="titleId" class="text-h3 text-text-primary">{{ 'sessionEnded.title' | transloco }}</h2>
      <p class="text-body-md text-text-secondary">{{ 'sessionEnded.message' | transloco }}</p>
    </div>
    <button
      type="button"
      cdkFocusInitial
      class="h-12 w-full rounded-md bg-brand-primary px-xl text-label-lg text-text-on-primary hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:bg-brand-primary-pressed"
      (click)="signIn()"
    >
      {{ 'sessionEnded.signIn' | transloco }}
    </button>
  `,
})
export class SessionEndedDialog {
  static readonly titleId = 'session-ended-dialog-title';

  protected readonly titleId = SessionEndedDialog.titleId;
  private readonly router = inject(Router);
  private readonly dialogRef = inject(DialogRef);

  /**
   * Through the notice the welcome page signs in through, back to where the person was. The dialog
   * closes first: navigating within the app does not close it, and it would cover the notice.
   */
  protected signIn(): void {
    const returnUrl = this.router.url;
    this.dialogRef.close();
    void this.router.navigate(['/signing-in'], { queryParams: { returnUrl } });
  }
}
