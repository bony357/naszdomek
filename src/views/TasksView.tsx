import { ChevronRight } from 'lucide-react';
import { Empty, Group } from '../components/Group';
import { compareRooms } from '../lib/constants';
import { SubtaskRow } from '../components/SubtaskRow';
import { byPlan, groupBy, matches, type Filters } from '../lib/filters';
import { useStore } from '../lib/store';
import type { Podzadanie, Zadanie } from '../lib/types';

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
  onFilters: (f: Filters) => void;
  onOpen: (id: number) => void;
  onOpenTask: (id: number) => void;
}

/** Odpowiednik "Główne zadania": zadania po pokojach; opcjonalnie z podzadaniami (wtedy szukanie obejmuje też je) */
export function TasksView({ filters, onFilters, onOpen, onOpenTask }: Props) {
  const { zadania, podzadania, plan, zadanieById } = useStore();
  const subsByTask = groupBy(podzadania, (p) => String(p.zadanie_id));
  const q = filters.q.trim();
  const qLower = q.toLocaleLowerCase('pl');
  const showSubs = filters.tasksShowSubs;

  const taskMatchesQuery = (z: Zadanie) => !q || `${z.nazwa} ${z.pokoj} ${z.notatka ?? ''}`.toLocaleLowerCase('pl').includes(qLower);
  // podzadania widoczne w trybie "z podzadaniami": filtry osoba/rodzaj zawsze, szukanie tylko gdy zadanie samo nie pasuje
  const visibleSubs = (z: Zadanie, subs: Podzadanie[]) =>
    subs
      .filter((p) => filters.tasksShowDone || p.status !== 'zrobione')
      .filter((p) => matches(p, z, { ...filters, q: taskMatchesQuery(z) ? '' : filters.q }))
      .sort(byPlan(plan));

  const rows = zadania
    .map((z) => {
      const subs = subsByTask.get(String(z.id)) ?? [];
      return { z, subs, shown: showSubs ? visibleSubs(z, subs) : [], ...taskProgress(subs) };
    })
    .filter((r) => filters.tasksShowDone || !r.complete)
    .filter((r) => {
      if (showSubs) {
        const anyFilter = q || filters.kto || filters.rodzaj;
        return !anyFilter || r.shown.length > 0 || (taskMatchesQuery(r.z) && !filters.kto && !filters.rodzaj);
      }
      return (
        taskMatchesQuery(r.z) &&
        (!filters.kto || r.subs.some((p) => p.kto === filters.kto && p.status !== 'zrobione')) &&
        (!filters.rodzaj || r.subs.some((p) => p.rodzaj === filters.rodzaj && p.status !== 'zrobione'))
      );
    });

  // Podpowiedź: szukana fraza pasuje do podzadań, które są ukryte
  const hiddenSubHits =
    !showSubs && q ? podzadania.filter((p) => p.status !== 'zrobione' && matches(p, zadanieById.get(p.zadanie_id), { ...filters, q })).length : 0;

  const rooms = [...groupBy(rows, (r) => r.z.pokoj)].sort(([a], [b]) => compareRooms(a, b));

  return (
    <div className="view">
      {hiddenSubHits > 0 && (
        <div className="hint-bar">
          <span>
            {hiddenSubHits} {hiddenSubHits === 1 ? 'pasujące podzadanie' : 'pasujących podzadań'}
          </span>
          <button className="btn ghost small" onClick={() => onFilters({ ...filters, tasksShowSubs: true })}>
            Pokaż podzadania
          </button>
        </div>
      )}
      {rows.length === 0 && hiddenSubHits === 0 && <Empty>Brak zadań</Empty>}
      {rooms.map(([room, list]) => (
        <Group key={room} title={room} count={list.length}>
          {showSubs
            ? list.map((r) => (
                <Group
                  key={r.z.id}
                  level={2}
                  title={r.z.nazwa}
                  count={r.shown.length}
                  defaultOpen
                  right={
                    <button className="icon-btn small subtle" onClick={() => onOpenTask(r.z.id)} aria-label="Szczegóły zadania" title="Szczegóły zadania">
                      <ChevronRight size={16} />
                    </button>
                  }
                >
                  {r.shown.map((p) => (
                    <SubtaskRow key={p.id} pod={p} context="none" onOpen={onOpen} />
                  ))}
                </Group>
              ))
            : list.map((r) => (
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
