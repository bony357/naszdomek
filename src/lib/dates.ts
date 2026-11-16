/** Daty jako stringi YYYY-MM-DD w lokalnej strefie urządzenia. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function diffDays(a: string, b: string): number {
  const pa = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const pb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((pa - pb) / 86400000);
}

const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const WEEKDAYS_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

function weekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "16.11" */
export function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

/** Nagłówek grupy w kalendarzu: "Dziś · poniedziałek 16.11" */
export function dayHeader(iso: string, today: string): string {
  const diff = diffDays(iso, today);
  const base = `${WEEKDAYS[weekday(iso)]} ${shortDate(iso)}`;
  if (diff === 0) return `Dziś · ${base}`;
  if (diff === 1) return `Jutro · ${base}`;
  if (diff === -1) return `Wczoraj · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Krótka etykieta przy wierszu: "dziś", "jutro", "śr 18.11" */
export function dayLabel(iso: string, today: string): string {
  const diff = diffDays(iso, today);
  if (diff === 0) return 'dziś';
  if (diff === 1) return 'jutro';
  if (diff === -1) return 'wczoraj';
  return `${WEEKDAYS_SHORT[weekday(iso)]} ${shortDate(iso)}`;
}

/** done_at (timestamptz) -> lokalna data */
export function timestampToISODate(ts: string): string {
  return toISODate(new Date(ts));
}
