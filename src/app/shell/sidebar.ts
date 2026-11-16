import { Injectable, signal } from '@angular/core';

/** Whether the shell's sidebar shows. It does until something hides it. */
@Injectable({ providedIn: 'root' })
export class Sidebar {
  readonly isOpen = signal(true);

  toggle(): void {
    this.isOpen.update((isOpen) => !isOpen);
  }
}
