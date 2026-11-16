import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { OSOBY, RODZAJE } from '../lib/constants';
import { EMPTY_FILTERS, type Filters, type ListShow, type SubGroup } from '../lib/filters';

export type Tab = 'dzis' | 'kalendarz' | 'lista' | 'zadania';

interface Props {
  tab: Tab;
  filters: Filters;
  onChange: (f: Filters) => void;
}

const LIST_SHOW: { value: ListShow; label: string }[] = [
  { value: 'otwarte', label: 'Otwarte' },
  { value: 'zablokowane', label: 'Zablokowane' },
  { value: 'pomysly', label: 'Pomysły' },
  { value: 'zrobione', label: 'Zrobione' },
  { value: 'wszystkie', label: 'Wszystkie' },
];
const CAL_GROUP: { value: SubGroup; label: string }[] = [
  { value: 'pokoj', label: 'Pokój' },
  { value: 'osoba', label: 'Osoba' },
  { value: 'zadanie', label: 'Zadanie' },
  { value: 'brak', label: 'Bez' },
];

interface Active {
  label: string;
  clear: Partial<Filters>;
}

function activeFilters(tab: Tab, f: Filters): Active[] {
  const out: Active[] = [];
  if (f.kto) out.push({ label: f.kto, clear: { kto: null } });
  if (f.rodzaj) out.push({ label: f.rodzaj, clear: { rodzaj: null } });
  if (tab === 'lista') {
    if (f.listShow !== EMPTY_FILTERS.listShow)
      out.push({ label: LIST_SHOW.find((s) => s.value === f.listShow)!.label, clear: { listShow: EMPTY_FILTERS.listShow } });
    if (f.listGroup !== EMPTY_FILTERS.listGroup) out.push({ label: 'Grupuj: osoby', clear: { listGroup: EMPTY_FILTERS.listGroup } });
  }
  if (tab === 'kalendarz') {
    if (f.calGroup !== EMPTY_FILTERS.calGroup)
      out.push({ label: `Grupuj: ${CAL_GROUP.find((g) => g.value === f.calGroup)!.label.toLowerCase()}`, clear: { calGroup: EMPTY_FILTERS.calGroup } });
    if (f.calShowDone) out.push({ label: 'Ze zrobionymi', clear: { calShowDone: false } });
  }
  if (tab === 'zadania' && f.tasksShowDone) out.push({ label: 'Z zakończonymi', clear: { tasksShowDone: false } });
  return out;
}

function Options<T extends string | boolean | null>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="opt-row">
      <span className="opt-label">{label}</span>
      <div className="opt-values">
        {options.map((o) => (
          <button key={String(o.value)} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterBar({ tab, filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const active = activeFilters(tab, filters);

  return (
    <div className="filterbar">
      <div className="filter-row">
        <div className="search">
          <Search size={16} />
          <input type="search" placeholder="Szukaj…" value={filters.q} onChange={(e) => set({ q: e.target.value })} />
          {filters.q && (
            <button className="icon-btn small" onClick={() => set({ q: '' })} aria-label="Wyczyść">
              <X size={14} />
            </button>
          )}
        </div>
        <button className={`filter-btn ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
          <SlidersHorizontal size={16} />
          <span>Filtry</span>
          {active.length > 0 && <span className="badge">{active.length}</span>}
        </button>
      </div>

      {!open && active.length > 0 && (
        <div className="active-filters">
          {active.map((a) => (
            <button key={a.label} className="tag" onClick={() => set(a.clear)}>
              {a.label} <X size={12} />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="filter-panel">
          <Options
            label="Osoba"
            value={filters.kto}
            options={[{ value: null, label: 'Wszyscy' }, ...OSOBY.map((o) => ({ value: o.name, label: o.name }))]}
            onChange={(kto) => set({ kto })}
          />
          <Options
            label="Rodzaj"
            value={filters.rodzaj}
            options={[
              { value: null, label: 'Wszystkie' },
              ...RODZAJE.filter((r) => r.value !== 'Wyprowadzka').map((r) => ({ value: r.value, label: r.value })),
            ]}
            onChange={(rodzaj) => set({ rodzaj })}
          />
          {tab === 'lista' && (
            <>
              <Options label="Pokaż" value={filters.listShow} options={LIST_SHOW} onChange={(listShow) => set({ listShow })} />
              <Options
                label="Grupuj"
                value={filters.listGroup}
                options={[
                  { value: 'pokoj', label: 'Pokój → zadanie' },
                  { value: 'osoba', label: 'Osoba' },
                ]}
                onChange={(listGroup) => set({ listGroup })}
              />
            </>
          )}
          {tab === 'kalendarz' && (
            <>
              <Options label="Grupuj" value={filters.calGroup} options={CAL_GROUP} onChange={(calGroup) => set({ calGroup })} />
              <Options
                label="Zrobione"
                value={filters.calShowDone}
                options={[
                  { value: false, label: 'Ukryj' },
                  { value: true, label: 'Pokaż (7 dni)' },
                ]}
                onChange={(calShowDone) => set({ calShowDone })}
              />
            </>
          )}
          {tab === 'zadania' && (
            <Options
              label="Zakończone"
              value={filters.tasksShowDone}
              options={[
                { value: false, label: 'Ukryj' },
                { value: true, label: 'Pokaż' },
              ]}
              onChange={(tasksShowDone) => set({ tasksShowDone })}
            />
          )}
          <div className="filter-panel-foot">
            <button className="btn ghost small" onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q })}>
              Wyczyść
            </button>
            <button className="btn primary small" onClick={() => setOpen(false)}>
              Gotowe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
