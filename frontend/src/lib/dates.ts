import type { IsoDate } from '../api/types';

/** Today's date in Sydney, where the statutory days are counted. */
export function todaySydney(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(now);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(date: IsoDate | null | undefined): string {
  if (!date) return '—';
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function describeDaysRemaining(days: number, responded: boolean): string {
  if (responded) return days >= 0 ? `Met with ${days} day${days === 1 ? '' : 's'} to spare` : `${-days} day${days === -1 ? '' : 's'} late`;
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}
