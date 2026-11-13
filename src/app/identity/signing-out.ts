import { Component, OnInit, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { REDIRECT_NOTICE_MS, RedirectNotice } from '../shared/redirect-notice';
import { Identity } from './identity';

/** Tells the person they are being signed out, then sends them to staff to end the session. */
@Component({
  selector: 'app-signing-out',
  imports: [RedirectNotice, TranslocoPipe],
  template: `
    <app-redirect-notice
      [title]="'signingOut.title' | transloco"
      [description]="'signingOut.description' | transloco"
    />
  `,
})
export class SigningOut implements OnInit {
  private readonly identity = inject(Identity);

  ngOnInit(): void {
    setTimeout(() => this.identity.signOut(), REDIRECT_NOTICE_MS);
  }
}
