import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Language } from './language';

/** Asks every API for answers, error messages included, in the app's language. */
export const acceptLanguageInterceptor: HttpInterceptorFn = (request, next) =>
  next(request.clone({ setHeaders: { 'Accept-Language': inject(Language).current() } }));
