import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Session } from './session';

/** How long before the session ends the person is warned. */
const WARN_BEFORE_MS = 2 * 60_000;
const TICK_MS = 1000;

/**
 * Warns that the session is about to end, counting down the time left, with a way to keep working,
 * which signs in again, or to sign out now. Nothing runs until the warning is due: one timer waits
 * for it, and only then does the countdown tick, once a second. When it reaches zero the session
 * has ended.
 */
@Component({
  selector: 'app-session-ending-notice',
  imports: [TranslocoPipe],
  template: `
    @let left = remaining();
    @if (left !== null) {
      <div
        class="fixed right-lg bottom-lg z-10 flex w-90 max-w-[calc(100vw-2rem)] flex-col gap-md rounded-lg border border-border-default bg-bg-surface p-lg shadow-lg"
        role="status"
      >
        <div class="flex flex-col gap-xs">
          <p class="text-label-lg text-text-primary">{{ 'sessionEnding.title' | transloco }}</p>
          <p class="text-body-sm text-text-secondary">
            {{ 'sessionEnding.message' | transloco }}
            <span class="font-medium text-text-primary tabular-nums" aria-hidden="true">{{ left }}</span>
          </p>
        </div>
        <div class="flex flex-wrap justify-end gap-sm">
          <button
            type="button"
            class="h-10 rounded-md border border-border-strong bg-bg-surface px-lg text-label-md text-text-primary hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
            (click)="signOut()"
          >
            {{ 'sessionEnding.signOut' | transloco }}
          </button>
          <button
            type="button"
            class="h-10 rounded-md bg-brand-primary px-lg text-label-md text-text-on-primary hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus active:bg-brand-primary-pressed"
            (click)="keepWorking()"
          >
            {{ 'sessionEnding.keepWorking' | transloco }}
          </button>
        </div>
      </div>
    }
  `,
})
export class SessionEndingNotice {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  /** The milliseconds left, while the warning shows; null before it is due. */
  private readonly remainingMs = signal<number | null>(null);

  protected readonly remaining = computed(() => {
    const ms = this.remainingMs();
    if (ms === null) {
      return null;
    }
    const seconds = Math.ceil(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  constructor() {
    effect((onCleanup) => {
      const endsAt = this.session.endsAt();
      if (endsAt === null || this.session.ended()) {
        this.remainingMs.set(null);
        return;
      }
      let ticking: ReturnType<typeof setInterval> | undefined;
      const tick = () => {
        const left = endsAt - Date.now();
        if (left > 0) {
          this.remainingMs.set(left);
          return;
        }
        clearInterval(ticking);
        this.remainingMs.set(null);
        this.session.end();
      };
      const due = setTimeout(
        () => {
          tick();
          ticking = setInterval(tick, TICK_MS);
        },
        Math.max(0, endsAt - WARN_BEFORE_MS - Date.now()),
      );
      onCleanup(() => {
        clearTimeout(due);
        clearInterval(ticking);
      });
    });
  }

  /**
   * Signs in again, which gives a new session, and comes back to where the person was. Straight
   * away, without the notice the welcome page signs in through, so as not to interrupt their work.
   */
  protected keepWorking(): void {
    this.session.signIn(this.router.url);
  }

  protected signOut(): void {
    void this.router.navigateByUrl('/signing-out');
  }
}
