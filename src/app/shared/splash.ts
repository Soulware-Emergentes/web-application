import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * The full-page spinner shown while there is nothing to show yet: before a route renders, and while
 * a sign-in completes. index.html paints the same markup before the app boots, so every page load
 * of a sign-in round trip looks the same and nothing flickers between them.
 */
@Component({
  selector: 'app-splash',
  imports: [TranslocoPipe],
  template: `
    <div class="app-splash" role="status">
      <span class="app-splash__spinner" aria-hidden="true"></span>
      <span class="app-splash__label">{{ 'splash.loading' | transloco }}</span>
    </div>
  `,
})
export class Splash {}
