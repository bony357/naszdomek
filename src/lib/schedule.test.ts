import { describe, expect, it } from 'vitest';
import { computeSchedule, descendants } from './schedule';
import type { Podzadanie, Status } from './types';

const T = '2026-11-16';
let n = 0;
const pod = (id: number, status: Status = 'do_zrobienia', extra: Partial<Podzadanie> = {}): Podzadanie => ({
  id, zadanie_id: 1, nazwa: `p${id}`, status, rodzaj: null, kto: null, nie_wczesniej: null,
  notatka: null, done_at: status === 'zrobione' ? '2026-11-10T12:00:00Z' : null, created_at: String(n++), ...extra,
});
const dep = (child: number, parent: number) => ({ podzadanie_id: child, blokujace_id: parent });

describe('computeSchedule', () => {
  it('zadania bez zależności są na dziś', () => {
    const s = computeSchedule([pod(1)], [], T);
    expect(s.get(1)).toEqual({ state: 'planned', date: T, blockedBy: [] });
  });

  it('łańcuch przesuwa się o dzień za każdym ogniwem', () => {
    const s = computeSchedule([pod(1), pod(2), pod(3)], [dep(2, 1), dep(3, 2)], T);
    expect(s.get(2)?.date).toBe('2026-11-17');
    expect(s.get(3)?.date).toBe('2026-11-18');
  });

  it('bierze najpóźniejszego poprzednika', () => {
    const s = computeSchedule([pod(1), pod(2), pod(3), pod(4)], [dep(2, 1), dep(4, 2), dep(4, 3)], T);
    expect(s.get(4)?.date).toBe('2026-11-18');
  });

  it('zrobiony poprzednik nie blokuje', () => {
    const s = computeSchedule([pod(1, 'zrobione'), pod(2)], [dep(2, 1)], T);
    expect(s.get(1)).toEqual({ state: 'done', date: '2026-11-10', blockedBy: [] });
    expect(s.get(2)?.date).toBe(T);
  });

  it('pomysł blokuje cały łańcuch za sobą', () => {
    const s = computeSchedule([pod(1, 'pomysl'), pod(2), pod(3), pod(4)], [dep(2, 1), dep(3, 2), dep(3, 4)], T);
    expect(s.get(1)?.state).toBe('idea');
    expect(s.get(2)).toEqual({ state: 'blocked', date: null, blockedBy: [1] });
    expect(s.get(3)).toEqual({ state: 'blocked', date: null, blockedBy: [1] });
    expect(s.get(4)?.date).toBe(T);
  });

  it('"nie wcześniej niż" przesuwa zadanie i jego następców', () => {
    const s = computeSchedule([pod(1, 'do_zrobienia', { nie_wczesniej: '2026-11-20' }), pod(2)], [dep(2, 1)], T);
    expect(s.get(1)?.date).toBe('2026-11-20');
    expect(s.get(2)?.date).toBe('2026-11-21');
  });

  it('data w przeszłości w "nie wcześniej niż" nie cofa planu przed dziś', () => {
    const s = computeSchedule([pod(1, 'do_zrobienia', { nie_wczesniej: '2026-11-01' })], [], T);
    expect(s.get(1)?.date).toBe(T);
  });

  it('cykl nie zawiesza obliczeń', () => {
    const s = computeSchedule([pod(1), pod(2)], [dep(1, 2), dep(2, 1)], T);
    expect(s.get(1)?.state).toBe('blocked');
  });

  it('ignoruje zależności do nieistniejących zadań', () => {
    const s = computeSchedule([pod(1)], [dep(1, 99)], T);
    expect(s.get(1)?.date).toBe(T);
  });
});

describe('descendants', () => {
  it('zwraca wszystkich potomków', () => {
    expect([...descendants(1, [dep(2, 1), dep(3, 2), dep(4, 9)])].sort()).toEqual([2, 3]);
  });
});
