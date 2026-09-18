// Ported verbatim from the validated ACORD 25 trainer's grading engine
// (COI-Simulator's index.html / ams-qqcatalyst.html) - generic on purpose,
// doesn't reference FIELDS/SCENARIOS so it can't drift from the source of truth.
import type { CompareKind, BlankCompareKind, FormValue } from '@/types';

export function normalizeText(v: FormValue | undefined): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
}
export function normalizeMoney(v: FormValue | undefined): string {
  return String(v ?? '').replace(/[$,\s]/g, '').trim();
}
export function normalizePhone(v: FormValue | undefined): string {
  return String(v ?? '').replace(/\D/g, '');
}
export function normalizeDate(v: FormValue | undefined): string {
  return String(v ?? '').replace(/\D/g, '');
}
export function normalizeCode(v: FormValue | undefined): string {
  return String(v ?? '').replace(/\s+/g, '').trim().toUpperCase();
}
export function normalizeEmail(v: FormValue | undefined): string {
  return String(v ?? '').trim().toLowerCase();
}

export function compareValue(actual: FormValue | undefined, expected: FormValue, compare: CompareKind): boolean {
  if (compare === 'checkbox') return !!actual === !!expected;
  if (compare === 'money') return normalizeMoney(actual) === normalizeMoney(expected);
  if (compare === 'phone') return normalizePhone(actual) === normalizePhone(expected);
  if (compare === 'date') return normalizeDate(actual) === normalizeDate(expected);
  if (compare === 'code' || compare === 'zip') return normalizeCode(actual) === normalizeCode(expected);
  if (compare === 'email') return normalizeEmail(actual) === normalizeEmail(expected);
  return normalizeText(actual) === normalizeText(expected);
}

export function isBlankValue(actual: FormValue | undefined, compare: BlankCompareKind): boolean {
  if (compare === 'unchecked') return !actual;
  return normalizeText(actual) === '';
}
