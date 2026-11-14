import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Sidebar } from './sidebar';

/** Where a signed-in person works: a sidebar to move between views, and the view. */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  host: { class: 'flex h-screen' },
  template: `
    <nav
      id="sidebar"
      class="flex w-64 shrink-0 flex-col gap-xs bg-bg-inverse p-md"
      [hidden]="!sidebar.isOpen()"
      [attr.aria-label]="'shell.navigation' | transloco"
    >
      @for (view of views; track view.path) {
        <a
          class="rounded-md px-md py-sm text-label-md text-text-on-inverse hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
          [routerLink]="view.path"
          routerLinkActive="bg-brand-primary hover:bg-brand-primary-hover"
          ariaCurrentWhenActive="page"
        >
          {{ view.label | transloco }}
        </a>
      }
    </nav>

    <div class="min-w-0 flex-1 overflow-auto">
      <router-outlet />
    </div>
  `,
})
export class Shell {
  protected readonly sidebar = inject(Sidebar);

  protected readonly views = [
    { path: '/map', label: 'shell.map' },
    { path: '/session', label: 'shell.session' },
  ];
}
