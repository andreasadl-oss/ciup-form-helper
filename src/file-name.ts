import { toIsoDate } from './dates';
import type { FillData } from './render';

const PREFIX = 'demande-manifestation';
const MAX_SLUG = 60;

/** Download name from the event date and name, e.g. demande-manifestation-2026-12-12-soiree.pdf. */
export function pdfFileName(data: FillData): string {
  const parts = [PREFIX, isoDate(data.date_debut), slug(data.nom)].filter(Boolean);
  return `${parts.join('-')}.pdf`;
}

/** "12/12/2026" (the form's jj/mm/aaaa) -> "2026-12-12"; anything else -> "". */
function isoDate(value: unknown): string {
  return typeof value === 'string' ? toIsoDate(value) : '';
}

/** Lower-case ASCII letters, digits and single hyphens; accents folded. */
function slug(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, '');
}
