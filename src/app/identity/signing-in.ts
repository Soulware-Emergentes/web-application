import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { REDIRECT_NOTICE_MS, RedirectNotice } from '../shared/redirect-notice';
import { Identity } from './identity';

/** Tells the person they are being taken to sign in, then sends them to staff. */
@Component({
  selector: 'app-signing-in',
  imports: [RedirectNotice, TranslocoPipe],
  template: `
    <app-redirect-notice
      [title]="'signingIn.title' | transloco"
      [description]="'signingIn.description' | transloco"
    />
  `,
})
export class SigningIn implements OnInit {
  private readonly identity = inject(Identity);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';

    setTimeout(() => void this.identity.signIn(returnUrl), REDIRECT_NOTICE_MS);
  }
}
