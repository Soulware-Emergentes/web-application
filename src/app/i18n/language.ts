import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

/** The languages the app is translated to, the default first. */
export const LANGUAGES = ['en', 'es'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'language';

/**
 * The language the app shows. Picked once at start-up, from the one stored in this browser, then
 * the browser's own preferences, then English, and kept in the browser so it survives the round
 * trip to staff's login page and back.
 */
@Injectable({ providedIn: 'root' })
export class Language {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly language = signal<LanguageCode>(LANGUAGES[0]);

  readonly current = this.language.asReadonly();

  /** Applies the start-up language and waits for its translations. */
  restore(): Promise<unknown> {
    return this.use(stored() ?? preferred() ?? LANGUAGES[0]);
  }

  /** Switches to a language, remembering it for this browser. */
  use(language: LanguageCode): Promise<unknown> {
    this.language.set(language);
    this.document.documentElement.lang = language;
    this.transloco.setActiveLang(language);
    store(language);

    return firstValueFrom(this.transloco.load(language));
  }
}

function supported(tag: string | null | undefined): LanguageCode | null {
  const language = tag?.split('-')[0].toLowerCase();
  return LANGUAGES.find((code) => code === language) ?? null;
}

function preferred(): LanguageCode | null {
  return navigator.languages.map(supported).find((code) => code !== null) ?? null;
}

function stored(): LanguageCode | null {
  try {
    return supported(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function store(language: LanguageCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage blocked: the language still applies until the page is left.
  }
}
