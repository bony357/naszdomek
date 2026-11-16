import { addDays, maxDate, timestampToISODate } from './dates';
import type { PlanEntry, Podzadanie, Zaleznosc } from './types';

/**
 * Wylicza daty podzadań na podstawie zależności (zastępuje skrypt Apps Script + nocny trigger).
 *
 * Zasady:
 *  - Zrobione: data = dzień wykonania; nie blokuje nikogo.
 *  - Pomysł: bez daty; blokuje wszystkie zadania, które od niego zależą.
 *  - Pozostałe: data = max(dziś, "nie wcześniej niż", max(data niezrobionego poprzednika) + 1).
 *    Jeśli którykolwiek niezrobiony poprzednik jest pomysłem / zablokowany -> zablokowane (bez daty).
 *
 * Liczone na bieżąco, więc "dziś" przesuwa się samo i nie trzeba nocnego przeliczania.
 */
export function computeSchedule(
  pods: Podzadanie[],
  deps: Zaleznosc[],
  today: string,
): Map<number, PlanEntry> {
  const byId = new Map(pods.map((p) => [p.id, p]));
  const parents = new Map<number, number[]>();
  for (const d of deps) {
    if (!byId.has(d.podzadanie_id) || !byId.has(d.blokujace_id)) continue;
    const list = parents.get(d.podzadanie_id);
    if (list) list.push(d.blokujace_id);
    else parents.set(d.podzadanie_id, [d.blokujace_id]);
  }

  const result = new Map<number, PlanEntry>();
  const visiting = new Set<number>();

  const visit = (id: number): PlanEntry => {
    const cached = result.get(id);
    if (cached) return cached;
    const p = byId.get(id)!;

    if (p.status === 'zrobione') {
      const entry: PlanEntry = {
        state: 'done',
        date: p.done_at ? timestampToISODate(p.done_at) : null,
        blockedBy: [],
      };
      result.set(id, entry);
      return entry;
    }
    if (p.status === 'pomysl') {
      const entry: PlanEntry = { state: 'idea', date: null, blockedBy: [] };
      result.set(id, entry);
      return entry;
    }
    if (visiting.has(id)) {
      // Cykl (baza na to nie pozwala, ale zabezpieczamy się) — traktujemy jak blokadę.
      return { state: 'blocked', date: null, blockedBy: [id] };
    }

    visiting.add(id);
    let date: string | null = maxDate(today, p.nie_wczesniej);
    const blockedBy = new Set<number>();
    for (const parentId of parents.get(id) ?? []) {
      const pe = visit(parentId);
      if (pe.state === 'done') continue;
      if (pe.state === 'idea') blockedBy.add(parentId);
      else if (pe.state === 'blocked') pe.blockedBy.forEach((b) => blockedBy.add(b));
      else if (pe.date) date = maxDate(date, addDays(pe.date, 1));
    }
    visiting.delete(id);

    const entry: PlanEntry =
      blockedBy.size > 0
        ? { state: 'blocked', date: null, blockedBy: [...blockedBy] }
        : { state: 'planned', date, blockedBy: [] };
    result.set(id, entry);
    return entry;
  };

  for (const p of pods) visit(p.id);
  return result;
}

/** Wszyscy potomkowie (zadania, które pośrednio czekają na `id`) — do blokowania cykli w UI. */
export function descendants(id: number, deps: Zaleznosc[]): Set<number> {
  const children = new Map<number, number[]>();
  for (const d of deps) {
    const list = children.get(d.blokujace_id);
    if (list) list.push(d.podzadanie_id);
    else children.set(d.blokujace_id, [d.podzadanie_id]);
  }
  const out = new Set<number>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of children.get(cur) ?? []) {
      if (!out.has(c)) {
        out.add(c);
        stack.push(c);
      }
    }
  }
  return out;
}
