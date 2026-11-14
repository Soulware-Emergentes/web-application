import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Sidebar } from './sidebar';

/** Where a signed-in person works: a sidebar to move between views, and the view. */
@Component({
  selector: 'app-shell',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  host: { class: 'flex h-screen' },
  template: `
    @let open = sidebar.isOpen();
    <nav
      id="sidebar"
      class="flex shrink-0 flex-col bg-bg-inverse transition-[width] duration-200"
      [class]="open ? 'w-64' : 'w-17'"
      [attr.aria-label]="'shell.navigation' | transloco"
    >
      <div class="flex min-h-0 flex-1 flex-col gap-xl px-md py-lg">
        <div class="flex items-center gap-md" [class.px-sm]="open">
          <span class="grid size-11 shrink-0 place-items-center rounded-md bg-bg-surface">
            <img ngSrc="/images/sgt-icon-centered.svg" width="36" height="36" alt="" />
          </span>
          <span class="text-h4 text-text-on-inverse" [class.sr-only]="!open">SGT</span>
        </div>

        <div class="flex flex-col gap-sm">
          @for (view of views; track view.path) {
            <a
              class="group relative flex items-center gap-md rounded-md px-md py-md text-label-md text-text-on-inverse hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
              [routerLink]="view.path"
              routerLinkActive="bg-brand-primary hover:bg-brand-primary-hover"
              ariaCurrentWhenActive="page"
            >
              <img class="shrink-0" [ngSrc]="view.icon" width="20" height="20" alt="" />
              <span class="whitespace-nowrap" [class.sr-only]="!open">{{ view.label | transloco }}</span>
              @if (!open) {
                <span
                  aria-hidden="true"
                  class="pointer-events-none absolute top-1/2 left-full z-10 ml-sm -translate-y-1/2 rounded-md bg-bg-inverse px-sm py-xs text-label-sm whitespace-nowrap text-text-on-inverse opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {{ view.label | transloco }}
                </span>
              }
            </a>
          }
        </div>
      </div>

      <button
        type="button"
        class="flex h-14 shrink-0 items-center gap-md bg-brand-primary text-label-md text-text-on-primary hover:bg-brand-primary-hover active:bg-brand-primary-pressed focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus"
        [class]="open ? 'justify-between px-xl' : 'justify-center'"
        aria-controls="sidebar"
        [attr.aria-expanded]="open"
        [attr.aria-label]="open ? null : ('shell.expandNavigation' | transloco)"
        (click)="sidebar.toggle()"
      >
        @if (open) {
          <span class="whitespace-nowrap">{{ 'shell.collapseNavigation' | transloco }}</span>
        }
        <img class="shrink-0" ngSrc="/icons/collapse.svg" width="28" height="28" alt="" [class.rotate-180]="!open" />
      </button>
    </nav>

    <div class="min-w-0 flex-1 overflow-auto">
      <router-outlet />
    </div>
  `,
})
export class Shell {
  protected readonly sidebar = inject(Sidebar);

  protected readonly views = [
    { path: '/map', label: 'shell.map', icon: '/icons/map.svg' },
    { path: '/session', label: 'shell.session', icon: '/icons/session.svg' },
  ];
}
