import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Session } from './session';

/**
 * Notices the session ending: the BFF answers 401 to a call once the login has lasted its maximum,
 * or staff no longer renews it, and the person is then told so.
 */
export const sessionEndedInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(Session);
  const goesToTheBff = request.url.startsWith('/api/') || request.url.startsWith('/bff/');

  return next(request).pipe(
    catchError((error: unknown) => {
      if (goesToTheBff && error instanceof HttpErrorResponse && error.status === 401) {
        session.end();
      }
      return throwError(() => error);
    }),
  );
};
