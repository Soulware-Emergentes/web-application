import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { acceptLanguageInterceptor } from './i18n/accept-language.interceptor';
import { bearerTokenInterceptor } from './identity/bearer-token.interceptor';
import { LANGUAGES, Language } from './i18n/language';
import { TranslocoHttpLoader } from './i18n/transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([acceptLanguageInterceptor, bearerTokenInterceptor])),
    provideTransloco({
      config: {
        availableLangs: [...LANGUAGES],
        defaultLang: LANGUAGES[0],
        fallbackLang: LANGUAGES[0],
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideAppInitializer(() => inject(Language).restore()),
  ],
};
