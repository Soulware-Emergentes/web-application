import { inject } from '@angular/core';
import { RedirectFunction } from '@angular/router';
import { Roles } from './roles';

/** Where a signed-in person lands: field agents on the plot map, their working view; anyone else on their session. */
export const home: RedirectFunction = () => (inject(Roles).active() === 'field-agent' ? '/map' : '/session');
