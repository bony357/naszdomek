import type { Status } from './types';

export const STATUSES: { value: Status; label: string; icon: string }[] = [
  { value: 'pomysl', label: 'Pomysł', icon: '❓' },
  { value: 'do_zrobienia', label: 'Do zrobienia', icon: '⚡' },
  { value: 'w_trakcie', label: 'W trakcie', icon: '🔄' },
  { value: 'zrobione', label: 'Zrobione', icon: '✅' },
];
export const statusInfo = (s: Status) => STATUSES.find((x) => x.value === s)!;

export const RODZAJE: { value: string; icon: string }[] = [
  { value: 'Remont', icon: '👷‍♂️' },
  { value: 'Plan', icon: '📋' },
  { value: 'Sprzątanie', icon: '🧹' },
  { value: 'Zakupy', icon: '🛒' },
  { value: 'Wyprowadzka', icon: '📦' },
];
export const rodzajIcon = (r: string | null) => RODZAJE.find((x) => x.value === r)?.icon ?? '';

/** Osoby + kolory (odpowiednik reguły formatowania "Kasia/Bartek" z AppSheet) */
export const OSOBY: { name: string; color: string }[] = [
  { name: 'Bartek', color: '#3b6fb6' },
  { name: 'Kasia', color: '#c75d6f' },
];
export const osobaColor = (name: string | null) => OSOBY.find((o) => o.name === name)?.color;

export const POKOJE = [
  'Całe mieszkanie',
  '1p Przedpokój',
  '1p Kuchnia',
  '1p Łazienka',
  '1p Salon',
  '2p Przedpokój',
  '2p Łazienka',
  '2p Sypialnia',
  '2p Biuro',
  '2p Gościnny',
  '2p Taras',
];

/** Kolejność pokoi przy grupowaniu (znane najpierw, potem alfabetycznie) */
export function compareRooms(a: string, b: string): number {
  const ia = POKOJE.indexOf(a);
  const ib = POKOJE.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  return a.localeCompare(b, 'pl');
}
