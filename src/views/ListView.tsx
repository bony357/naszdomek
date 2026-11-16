import { ChevronRight } from 'lucide-react';
import { Empty, Group } from '../components/Group';
import { SubtaskRow } from '../components/SubtaskRow';
import { compareRooms } from '../lib/constants';
import { byPlan, groupBy, matches, type Filters, type ListShow } from '../lib/filters';
import { useStore } from '../lib/store';
import type { PlanState } from '../lib/types';

interface Props {
  filters: Filters;
  onOpen: (id: number) => void;
  onOpenTask: (id: number) => void;
}

const STATES: Record<ListShow, PlanState[]> = {
  otwarte: ['planned', 'blocked', 'idea'],
  zablokowane: ['blocked'],
  pomysly: ['idea'],
  zrobione: ['done'],
  wszystkie: ['planned', 'blocked', 'idea', 'done'],
};

/** Połączone widoki "Podzadania" i "Pokoje" z AppSheet: grupowanie Pokój → Zadanie lub po osobie */
export function ListView({ filters, onOpen, onOpenTask }: Props) {
  const { podzadania, plan, zadanieById } = useStore();
  const states = STATES[filters.listShow];
  const mode = filters.listGroup;

  const items = podzadania
    .filter((p) => states.includes(plan.get(p.id)!.state))
    .filter((p) => matches(p, zadanieById.get(p.zadanie_id), filters))
    .sort(byPlan(plan));

  return (
    <div className="view">
      {items.length === 0 && <Empty>Brak podzadań</Empty>}

      {mode === 'pokoj' &&
        [...groupBy(items, (p) => zadanieById.get(p.zadanie_id)?.pokoj ?? '—')]
          .sort(([a], [b]) => compareRooms(a, b))
          .map(([room, list]) => (
            <Group key={room} title={room} count={list.length}>
              {[...groupBy(list, (p) => String(p.zadanie_id))].map(([zid, subs]) => (
                <Group
                  key={zid}
                  level={2}
                  title={zadanieById.get(Number(zid))?.nazwa}
                  count={subs.length}
                  right={
                    <button className="icon-btn small subtle" onClick={() => onOpenTask(Number(zid))} aria-label="Szczegóły zadania" title="Szczegóły zadania">
                      <ChevronRight size={16} />
                    </button>
                  }
                >
                  {subs.map((p) => (
                    <SubtaskRow key={p.id} pod={p} context="none" onOpen={onOpen} />
                  ))}
                </Group>
              ))}
            </Group>
          ))}

      {mode === 'osoba' &&
        [...groupBy(items, (p) => p.kto ?? 'Ktokolwiek')]
          .sort(([a], [b]) => (a === 'Ktokolwiek' ? 1 : b === 'Ktokolwiek' ? -1 : a.localeCompare(b, 'pl')))
          .map(([who, list]) => (
            <Group key={who} title={who} count={list.length}>
              {list.map((p) => (
                <SubtaskRow key={p.id} pod={p} onOpen={onOpen} />
              ))}
            </Group>
          ))}
    </div>
  );
}
