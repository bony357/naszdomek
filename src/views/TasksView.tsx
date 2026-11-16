import { ChevronRight } from 'lucide-react';
import { Empty, Group } from '../components/Group';
import { compareRooms } from '../lib/constants';
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

/** Odpowiednik "Główne zadania": zadania pogrupowane po pokojach */
export function TasksView({ filters, onOpenTask }: Props) {
  const { zadania, podzadania } = useStore();
  const subsByTask = groupBy(podzadania, (p) => String(p.zadanie_id));
  const q = filters.q.trim().toLocaleLowerCase('pl');

  const rows = zadania
    .map((z) => ({ z, subs: subsByTask.get(String(z.id)) ?? [] }))
    .map((r) => ({ ...r, ...taskProgress(r.subs) }))
    .filter((r) => filters.tasksShowDone || !r.complete)
    .filter((r) => !filters.kto || r.subs.some((p) => p.kto === filters.kto && p.status !== 'zrobione'))
    .filter((r) => !filters.rodzaj || r.subs.some((p) => p.rodzaj === filters.rodzaj && p.status !== 'zrobione'))
    .filter((r) => !q || `${r.z.nazwa} ${r.z.pokoj} ${r.z.notatka ?? ''}`.toLocaleLowerCase('pl').includes(q));

  const rooms = [...groupBy(rows, (r) => r.z.pokoj)].sort(([a], [b]) => compareRooms(a, b));

  return (
    <div className="view">
      {rows.length === 0 && <Empty>Brak zadań</Empty>}
      {rooms.map(([room, list]) => (
        <Group key={room} title={room} count={list.length}>
          {list.map((r) => (
            <button key={r.z.id} className={`task-card ${r.complete ? 'complete' : ''}`} onClick={() => onOpenTask(r.z.id)}>
              <span className="task-name">{r.z.nazwa}</span>
              {r.total > 0 && (
                <span className="task-count">
                  {r.done}/{r.total}
                </span>
              )}
              <ChevronRight size={16} className="muted" />
            </button>
          ))}
        </Group>
      ))}
    </div>
  );
}
