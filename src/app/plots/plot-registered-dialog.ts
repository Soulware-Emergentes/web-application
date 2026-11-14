import { DialogRef } from '@angular/cdk/dialog';
import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** Tells that a plot has just been registered, before the map shows it. */
@Component({
  selector: 'app-plot-registered-dialog',
  imports: [NgOptimizedImage, TranslocoPipe],
  host: {
    class: 'flex w-100 max-w-[calc(100vw-2rem)] flex-col items-center gap-xl rounded-xl bg-bg-surface p-2xl text-center shadow-lg',
  },
  template: `
    <span class="grid size-20 place-items-center rounded-full bg-status-success-subtle">
      <img ngSrc="/icons/check.svg" width="44" height="44" alt="" />
    </span>
    <div class="flex flex-col gap-sm">
      <h2 [id]="titleId" class="text-h3 text-text-primary">{{ 'plotRegistered.title' | transloco }}</h2>
      <p class="text-body-md text-text-secondary">{{ 'plotRegistered.message' | transloco }}</p>
    </div>
    <button
      type="button"
      cdkFocusInitial
      class="h-12 w-full rounded-md bg-brand-primary px-xl text-label-lg text-text-on-primary hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:bg-brand-primary-pressed"
      (click)="dialogRef.close()"
    >
      {{ 'plotRegistered.close' | transloco }}
    </button>
  `,
})
export class PlotRegisteredDialog {
  static readonly titleId = 'plot-registered-dialog-title';

  protected readonly titleId = PlotRegisteredDialog.titleId;
  protected readonly dialogRef = inject(DialogRef);
}
