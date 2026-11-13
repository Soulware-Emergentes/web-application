import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Splash } from './shared/splash';

@Component({
  imports: [RouterOutlet, Splash],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  /** Whether a route has rendered yet; a guard still deciding, or a silent sign-in, keeps it false. */
  protected readonly routed = signal(false);
}
