import type { DateStr } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 기기의 지역 날짜 기준 오늘. 테스트에서는 주입한다. */
export function today(now: Date = new Date()): DateStr {
  return toDateStr(now);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** s가 base로부터 며칠 뒤인지. 음수면 과거 */
export function daysBetween(base: DateStr, s: DateStr): number {
  const a = parseDate(base);
  const b = parseDate(s);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function formatShort(s: DateStr): string {
  const d = parseDate(s);
  return `${d.getMonth() + 1}.${pad(d.getDate())}`;
}

export function isDateStr(v: unknown): v is DateStr {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
