/** The documents a beneficiary is known by, as sgt and the beneficiary registry name them. */
export type LegalDocumentType = 'DNI' | 'FOREIGNER_ID_CARD' | 'PASSPORT';

export interface LegalDocument {
  type: LegalDocumentType;
  number: string;
}

export const LEGAL_DOCUMENT_TYPES: readonly LegalDocumentType[] = ['DNI', 'FOREIGNER_ID_CARD', 'PASSPORT'];

/** The numbers each kind of document carries, checked the same way sgt and the registry check them. */
export const DOCUMENT_NUMBER_FORMATS: Record<LegalDocumentType, RegExp> = {
  DNI: /^\d{8}$/,
  FOREIGNER_ID_CARD: /^[A-Za-z0-9]{9,12}$/,
  PASSPORT: /^[A-Za-z0-9]{6,12}$/,
};
