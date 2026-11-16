import { Empty, Group } from '../components/Group';
import { SubtaskRow } from '../components/SubtaskRow';
import { compareRooms } from '../lib/constants';
import { byPlan, groupBy, matches, type Filters } from '../lib/filters';
import { useStore } from '../lib/store';

interface Props {
  filters: Filters;
  onOpen: (id: number) => void;
}

/** Odpowiednik dashboardu "Plan → Dzisiaj" (+ dawne "Zaległe", które teraz nie występują) */
export function TodayView({ filters, onOpen }: Props) {
  const { podzadania, plan, today, zadanieById } = useStore();
  const visible = podzadania.filter((p) => matches(p, zadanieById.get(p.zadanie_id), filters));

  const todo = visible.filter((p) => {
    const e = plan.get(p.id)!;
    return e.state === 'planned' && e.date !== null && e.date <= today;
  });
  const inProgress = todo.filter((p) => p.status === 'w_trakcie').sort(byPlan(plan));
  const rest = todo.filter((p) => p.status !== 'w_trakcie');
  const doneToday = visible.filter((p) => {
    const e = plan.get(p.id)!;
    return e.state === 'done' && e.date === today;
  });
  const byRoom = [...groupBy(rest, (p) => zadanieById.get(p.zadanie_id)?.pokoj ?? '—')].sort(([a], [b]) => compareRooms(a, b));

  return (
    <div className="view">
      <div className="summary">
        <div>
          <strong>{todo.length}</strong> do zrobienia dziś
        </div>
        <div>
          <strong>{doneToday.length}</strong> zrobione dziś
        </div>
      </div>

      {todo.length === 0 && <Empty>Na dziś nic nie zostało 🎉</Empty>}

      {inProgress.length > 0 && (
        <Group title="🔄 W trakcie" count={inProgress.length}>
          {inProgress.map((p) => (
            <SubtaskRow key={p.id} pod={p} onOpen={onOpen} />
          ))}
        </Group>
      )}

      {byRoom.map(([room, list]) => (
        <Group key={room} title={room} count={list.length}>
          {list.sort(byPlan(plan)).map((p) => (
            <SubtaskRow key={p.id} pod={p} context="zadanie" onOpen={onOpen} />
          ))}
        </Group>
      ))}

      {doneToday.length > 0 && (
        <Group title="✅ Zrobione dziś" count={doneToday.length} defaultOpen={false}>
          {doneToday.map((p) => (
            <SubtaskRow key={p.id} pod={p} onOpen={onOpen} />
          ))}
        </Group>
      )}
    </div>
  );
}
