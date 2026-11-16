import { useState } from 'react';
import { Empty, Group } from '../components/Group';
import { SubtaskRow } from '../components/SubtaskRow';
import { compareRooms } from '../lib/constants';
import { byPlan, groupBy, matches, type Filters } from '../lib/filters';
import { useStore } from '../lib/store';
import type { PlanState } from '../lib/types';

interface Props {
  filters: Filters;
  onOpen: (id: number) => void;
  onOpenTask: (id: number) => void;
}

type Show = 'otwarte' | 'pomysly' | 'zablokowane' | 'zrobione' | 'wszystkie';
type GroupMode = 'pokoj' | 'osoba';

const SHOW: { value: Show; label: string; states: PlanState[] }[] = [
  { value: 'otwarte', label: 'Otwarte', states: ['planned', 'blocked', 'idea'] },
  { value: 'zablokowane', label: '🔒 Zablokowane', states: ['blocked'] },
  { value: 'pomysly', label: '❓ Pomysły', states: ['idea'] },
  { value: 'zrobione', label: '✅ Zrobione', states: ['done'] },
  { value: 'wszystkie', label: 'Wszystkie', states: ['planned', 'blocked', 'idea', 'done'] },
];

/** Połączone widoki "Podzadania" i "Pokoje" z AppSheet: grupowanie Pokój → Zadanie lub po osobie */
export function ListView({ filters, onOpen, onOpenTask }: Props) {
  const { podzadania, plan, zadanieById } = useStore();
  const [show, setShow] = useState<Show>('otwarte');
  const [mode, setMode] = useState<GroupMode>('pokoj');
  const states = SHOW.find((s) => s.value === show)!.states;

  const items = podzadania
    .filter((p) => states.includes(plan.get(p.id)!.state))
    .filter((p) => matches(p, zadanieById.get(p.zadanie_id), filters))
    .sort(byPlan(plan));

  return (
    <div className="view">
      <div className="view-toolbar">
        <div className="segmented small">
          {SHOW.map((s) => (
            <button key={s.value} className={show === s.value ? 'active' : ''} onClick={() => setShow(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="segmented small">
          <button className={mode === 'pokoj' ? 'active' : ''} onClick={() => setMode('pokoj')}>
            Pokoje
          </button>
          <button className={mode === 'osoba' ? 'active' : ''} onClick={() => setMode('osoba')}>
            Osoby
          </button>
        </div>
      </div>

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
                    <span
                      className="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTask(Number(zid));
                      }}
                    >
                      szczegóły
                    </span>
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
