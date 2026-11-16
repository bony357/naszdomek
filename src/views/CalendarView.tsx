import { Empty, Group } from '../components/Group';
import { SubtaskRow } from '../components/SubtaskRow';
import { compareRooms } from '../lib/constants';
import { addDays, dayHeader } from '../lib/dates';
import { groupBy, matches, type Filters } from '../lib/filters';
import { useStore } from '../lib/store';
import type { Podzadanie } from '../lib/types';

interface Props {
  filters: Filters;
  onOpen: (id: number) => void;
}

/** Odpowiednik widoku "Kalendarz": dzień → (pokój | osoba | zadanie) */
export function CalendarView({ filters, onOpen }: Props) {
  const { podzadania, plan, today, zadanieById } = useStore();
  const from = addDays(today, -7);

  const items = podzadania.filter((p) => {
    const e = plan.get(p.id)!;
    if (!e.date) return false;
    if (e.state === 'done' && (!filters.calShowDone || e.date < from)) return false;
    return matches(p, zadanieById.get(p.zadanie_id), filters);
  });

  const sortRows = (list: Podzadanie[]) =>
    list.sort((a, b) => {
      const za = zadanieById.get(a.zadanie_id);
      const zb = zadanieById.get(b.zadanie_id);
      return (
        Number(plan.get(a.id)!.state === 'done') - Number(plan.get(b.id)!.state === 'done') ||
        compareRooms(za?.pokoj ?? '', zb?.pokoj ?? '') ||
        (za?.nazwa ?? '').localeCompare(zb?.nazwa ?? '', 'pl') ||
        a.id - b.id
      );
    });

  const mode = filters.calGroup;
  const subKey = (p: Podzadanie) => {
    const z = zadanieById.get(p.zadanie_id);
    if (mode === 'pokoj') return z?.pokoj ?? '—';
    if (mode === 'osoba') return p.kto ?? 'Ktokolwiek';
    return `${z?.pokoj} · ${z?.nazwa}`;
  };
  const subOrder = (a: string, b: string) => {
    if (mode === 'pokoj') return compareRooms(a, b);
    if (mode === 'osoba') return a === 'Ktokolwiek' ? 1 : b === 'Ktokolwiek' ? -1 : a.localeCompare(b, 'pl');
    return compareRooms(a.split(' · ')[0], b.split(' · ')[0]) || a.localeCompare(b, 'pl');
  };
  const rowContext = mode === 'pokoj' ? 'zadanie' : mode === 'zadanie' ? 'none' : 'full';

  const days = [...groupBy(items, (p) => plan.get(p.id)!.date!)].sort(([a], [b]) => (a < b ? -1 : 1));

  return (
    <div className="view">
      {days.length === 0 && <Empty>Brak zaplanowanych zadań</Empty>}
      {days.map(([day, list]) => (
        <Group key={day} title={dayHeader(day, today)} count={list.length} defaultOpen={day >= today}>
          {mode === 'brak'
            ? sortRows(list).map((p) => <SubtaskRow key={p.id} pod={p} onOpen={onOpen} />)
            : [...groupBy(sortRows(list), subKey)]
                .sort(([a], [b]) => subOrder(a, b))
                .map(([key, subs]) => (
                  <Group key={key} level={2} title={key} count={subs.length}>
                    {subs.map((p) => (
                      <SubtaskRow key={p.id} pod={p} context={rowContext} onOpen={onOpen} />
                    ))}
                  </Group>
                ))}
        </Group>
      ))}
    </div>
  );
}
