import { Check, Circle, Lock, X } from 'lucide-react';
import { dayLabel } from '../lib/dates';
import { useStore } from '../lib/store';

interface Props {
  id: number;
  onOpen: (id: number) => void;
  onRemove?: () => void;
  /** pokaż też pokój · zadanie (gdy zależność jest spoza bieżącego zadania) */
  withContext?: boolean;
}

/** Jedna pozycja na liście zależności: stan, nazwa, kontekst, termin */
export function DepItem({ id, onOpen, onRemove, withContext = true }: Props) {
  const { podById, zadanieById, plan, today } = useStore();
  const p = podById.get(id);
  if (!p) return null;
  const z = zadanieById.get(p.zadanie_id);
  const e = plan.get(id)!;
  const icon =
    e.state === 'done' ? <Check size={14} /> : e.state === 'blocked' || e.state === 'idea' ? <Lock size={14} /> : <Circle size={14} />;
  const when = e.state === 'done' ? 'zrobione' : e.state === 'idea' ? 'pomysł' : e.state === 'blocked' ? 'zablokowane' : e.date ? dayLabel(e.date, today) : '';

  return (
    <div className={`dep state-${e.state}`}>
      <button className="dep-label" onClick={() => onOpen(id)}>
        <span className="dep-icon">{icon}</span>
        <span className="dep-text">
          <span className="dep-name">{p.nazwa}</span>
          {withContext && (
            <span className="dep-ctx">
              {z?.pokoj} · {z?.nazwa}
            </span>
          )}
        </span>
        <span className="dep-when">{when}</span>
      </button>
      {onRemove && (
        <button className="icon-btn small" onClick={onRemove} aria-label="Usuń zależność">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
