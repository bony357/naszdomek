import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Empty, Group } from '../components/Group';
import { compareRooms } from '../lib/constants';
import { dayLabel } from '../lib/dates';
import { groupBy, type Filters } from '../lib/filters';
import { useStore } from '../lib/store';
import type { Podzadanie } from '../lib/types';

export function taskProgress(subs: Podzadanie[]) {
  const total = subs.length;
  const done = subs.filter((p) => p.status === 'zrobione').length;
  const inProgress = subs.some((p) => p.status === 'w_trakcie');
  const allIdeas = total > 0 && subs.every((p) => p.status === 'pomysl');
  const status =
    total > 0 && done === total ? '✅ Zrobione' : inProgress || done > 0 ? '🔄 W trakcie' : allIdeas ? '❓ Pomysł' : '⚡ Do zrobienia';
  return { total, done, status, complete: total > 0 && done === total };
}

interface Props {
  filters: Filters;
  onOpenTask: (id: number) => void;
}

/** Odpowiednik "Główne zadania": zadania pogrupowane po pokojach, ze statusem i postępem */
export function TasksView({ filters, onOpenTask }: Props) {
  const { zadania, podzadania, plan, today } = useStore();
  const [hideDone, setHideDone] = useState(true);
  const subsByTask = groupBy(podzadania, (p) => String(p.zadanie_id));
  const q = filters.q.trim().toLocaleLowerCase('pl');

  const rows = zadania
    .map((z) => {
      const subs = subsByTask.get(String(z.id)) ?? [];
      const next = subs
        .map((p) => plan.get(p.id)!)
        .filter((e) => e.state === 'planned' && e.date)
        .map((e) => e.date!)
        .sort()[0];
      return { z, subs, next, ...taskProgress(subs) };
    })
    .filter((r) => !(hideDone && r.complete))
    .filter((r) => !filters.kto || r.subs.some((p) => p.kto === filters.kto && p.status !== 'zrobione'))
    .filter((r) => !filters.rodzaj || r.subs.some((p) => p.rodzaj === filters.rodzaj && p.status !== 'zrobione'))
    .filter((r) => !q || `${r.z.nazwa} ${r.z.pokoj} ${r.z.notatka ?? ''}`.toLocaleLowerCase('pl').includes(q));

  const rooms = [...groupBy(rows, (r) => r.z.pokoj)].sort(([a], [b]) => compareRooms(a, b));

  return (
    <div className="view">
      <div className="view-toolbar">
        <label className="toggle">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> ukryj zakończone
        </label>
      </div>
      {rows.length === 0 && <Empty>Brak zadań</Empty>}
      {rooms.map(([room, list]) => (
        <Group key={room} title={room} count={list.length}>
          {list.map((r) => (
            <button key={r.z.id} className="task-card" onClick={() => onOpenTask(r.z.id)}>
              <div className="task-main">
                <span className="row-title">{r.z.nazwa}</span>
                <span className="row-sub">
                  {r.status}
                  {r.next && ` · następne: ${dayLabel(r.next, today)}`}
                </span>
                {r.total > 0 && (
                  <div className="progress small">
                    <div style={{ width: `${(r.done / r.total) * 100}%` }} />
                  </div>
                )}
              </div>
              <span className="muted">
                {r.done}/{r.total}
              </span>
              <ChevronRight size={18} className="muted" />
            </button>
          ))}
        </Group>
      ))}
    </div>
  );
}
