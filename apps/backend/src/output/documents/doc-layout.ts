import type { Content, TableCell } from 'pdfmake/interfaces';
import type { CaseDocData } from './case-document.loader';

const WATERMARK = new Set(['MODERATION', 'DIRECTOR_REVIEW']);

/** Diagonal watermark text for a status, or null when the clean (approved) version applies. */
export function watermarkForStatus(status: string): string | null {
  if (status === 'REJECTED') return 'RAD ETILGAN';
  if (status === 'CANCELLED') return 'BEKOR QILINGAN';
  return WATERMARK.has(status) ? 'TASDIQLANMAGAN' : null;
}

export const money = (n: unknown): string =>
  n == null ? '—' : new Intl.NumberFormat('ru-RU').format(Number(n)) + " so'm";

/** A two-column label/value row for a pdfmake table body. */
export const kv = (label: string, val: string): TableCell[] => [
  { text: label, bold: true, margin: [0, 2, 0, 2] },
  { text: val || '—', margin: [0, 2, 0, 2] },
];

/** Org letterhead block from the Organization record. */
export function orgHeader(org: CaseDocData['organization']): Content {
  return {
    stack: [
      { text: org?.nameUpper ?? 'МКО', bold: true, fontSize: 11 },
      { text: org?.address ?? '', fontSize: 8, color: '#555' },
      { text: [org?.bankName, org?.bankAccount].filter(Boolean).join(' · '), fontSize: 8, color: '#555' },
    ],
    margin: [0, 0, 0, 12],
  };
}
