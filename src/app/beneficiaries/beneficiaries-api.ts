import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { LegalDocument } from './legal-document';

interface Beneficiary {
  legalDocument: LegalDocument;
  names: string;
  paternalSurname: string;
  maternalSurname: string;
}

interface LookupResponse {
  found: Beneficiary[];
  notFound: LegalDocument[];
}

/** The beneficiary registry, asked directly with the person's own token for it. */
@Injectable({ providedIn: 'root' })
export class BeneficiariesApi {
  private readonly http = inject(HttpClient);

  /** @returns the full name of whoever holds the document, or null when nobody in the registry does */
  nameOf(document: LegalDocument): Observable<string | null> {
    const request = { legalDocuments: [document] };

    return this.http.post<LookupResponse>(`${environment.beneficiarios.api}/beneficiaries/lookup`, request).pipe(
      map(({ found }) => {
        const holder = found[0];
        return holder ? `${holder.names} ${holder.paternalSurname} ${holder.maternalSurname}` : null;
      }),
    );
  }
}
