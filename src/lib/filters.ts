import type { PlanEntry, Podzadanie, Zadanie } from './types';

export interface Filters {
  kto: string | null;
  rodzaj: string | null;
  q: string;
}

export const EMPTY_FILTERS: Filters = { kto: null, rodzaj: null, q: '' };

const norm = (s: string) => s.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function matches(p: Podzadanie, z: Zadanie | undefined, f: Filters): boolean {
  if (f.kto && p.kto !== f.kto) return false;
  if (f.rodzaj && p.rodzaj !== f.rodzaj) return false;
  if (f.q.trim()) {
    const hay = norm([p.nazwa, p.notatka ?? '', z?.nazwa ?? '', z?.pokoj ?? '', p.kto ?? ''].join(' '));
    if (!norm(f.q).split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

const STATE_ORDER = { planned: 0, blocked: 1, idea: 2, done: 3 } as const;

/** Sortowanie jak w AppSheet: niezrobione najpierw, potem po dacie */
export function byPlan(plan: Map<number, PlanEntry>) {
  return (a: Podzadanie, b: Podzadanie) => {
    const pa = plan.get(a.id)!;
    const pb = plan.get(b.id)!;
    if (pa.state !== pb.state) return STATE_ORDER[pa.state] - STATE_ORDER[pb.state];
    const da = pa.date ?? '9999';
    const db = pb.date ?? '9999';
    if (da !== db) return pa.state === 'done' ? (da < db ? 1 : -1) : da < db ? -1 : 1;
    if (a.status !== b.status) return a.status === 'w_trakcie' ? -1 : b.status === 'w_trakcie' ? 1 : 0;
    return a.id - b.id;
  };
}

export function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = m.get(k);
    if (list) list.push(it);
    else m.set(k, [it]);
  }
  return m;
}
