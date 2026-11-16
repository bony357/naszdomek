import { useState } from 'react';
import { Empty, Group } from '../components/Group';
import { SubtaskRow } from '../components/SubtaskRow';
import { addDays, dayHeader } from '../lib/dates';
import { groupBy, matches, type Filters } from '../lib/filters';
import { useStore } from '../lib/store';

interface Props {
  filters: Filters;
  onOpen: (id: number) => void;
}

/** Odpowiednik widoku "Kalendarz": podzadania pogrupowane po dniu */
export function CalendarView({ filters, onOpen }: Props) {
  const { podzadania, plan, today, zadanieById } = useStore();
  const [showDone, setShowDone] = useState(false);
  const from = addDays(today, -7);

  const items = podzadania.filter((p) => {
    const e = plan.get(p.id)!;
    if (!e.date) return false;
    if (e.state === 'done' && (!showDone || e.date < from)) return false;
    return matches(p, zadanieById.get(p.zadanie_id), filters);
  });

  const days = [...groupBy(items, (p) => plan.get(p.id)!.date!)].sort(([a], [b]) => (a < b ? -1 : 1));

  return (
    <div className="view">
      <div className="view-toolbar">
        <label className="toggle">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> pokaż zrobione (ostatnie 7 dni)
        </label>
      </div>
      {days.length === 0 && <Empty>Brak zaplanowanych zadań</Empty>}
      {days.map(([day, list]) => (
        <Group key={day} title={dayHeader(day, today)} count={list.length} defaultOpen={day >= today}>
          {list
            .sort((a, b) => {
              const za = zadanieById.get(a.zadanie_id);
              const zb = zadanieById.get(b.zadanie_id);
              return (
                Number(plan.get(a.id)!.state === 'done') - Number(plan.get(b.id)!.state === 'done') ||
                (za?.nazwa ?? '').localeCompare(zb?.nazwa ?? '', 'pl') ||
                (za?.pokoj ?? '').localeCompare(zb?.pokoj ?? '', 'pl') ||
                (a.kto ?? '').localeCompare(b.kto ?? '', 'pl')
              );
            })
            .map((p) => (
              <SubtaskRow key={p.id} pod={p} onOpen={onOpen} />
            ))}
        </Group>
      ))}
    </div>
  );
}
