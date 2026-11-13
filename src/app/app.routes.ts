import { Routes } from '@angular/router';
import { identityGuard } from './identity/identity.guard';

export const routes: Routes = [
  {
    path: 'welcome',
    canActivate: [identityGuard({ whenSignedIn: 'leave' })],
    loadComponent: () => import('./identity/welcome').then((m) => m.Welcome),
  },
  {
    path: 'signing-in',
    loadComponent: () => import('./identity/signing-in').then((m) => m.SigningIn),
  },
  {
    path: 'signing-out',
    loadComponent: () => import('./identity/signing-out').then((m) => m.SigningOut),
  },
  {
    path: 'callback',
    loadComponent: () => import('./identity/callback').then((m) => m.Callback),
  },
  {
    path: '',
    canActivate: [identityGuard({ whenSignedIn: 'pass' })],
    loadComponent: () => import('./token-details/token-details').then((m) => m.TokenDetails),
  },
];
