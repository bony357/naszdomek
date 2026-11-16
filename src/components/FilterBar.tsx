import { Search, X } from 'lucide-react';
import { OSOBY, RODZAJE } from '../lib/constants';
import type { Filters } from '../lib/filters';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="filterbar">
      <div className="search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Szukaj…"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
        {filters.q && (
          <button className="icon-btn small" onClick={() => onChange({ ...filters, q: '' })} aria-label="Wyczyść">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="chips">
        {OSOBY.map((o) => (
          <button
            key={o.name}
            className={`chip ${filters.kto === o.name ? 'active' : ''}`}
            style={filters.kto === o.name ? { background: o.color, borderColor: o.color } : undefined}
            onClick={() => onChange({ ...filters, kto: filters.kto === o.name ? null : o.name })}
          >
            {o.name}
          </button>
        ))}
        <span className="chip-sep" />
        {RODZAJE.filter((r) => r.value !== 'Wyprowadzka').map((r) => (
          <button
            key={r.value}
            className={`chip ${filters.rodzaj === r.value ? 'active' : ''}`}
            onClick={() => onChange({ ...filters, rodzaj: filters.rodzaj === r.value ? null : r.value })}
            title={r.value}
          >
            {r.icon} {r.value}
          </button>
        ))}
      </div>
    </div>
  );
}
