import { Check, Lock } from 'lucide-react';
import { rodzajIcon, osobaColor } from '../lib/constants';
import { dayLabel } from '../lib/dates';
import { useStore } from '../lib/store';
import type { Podzadanie } from '../lib/types';

interface Props {
  pod: Podzadanie;
  /** co pokazać pod nazwą: pokój + zadanie, tylko zadanie, albo nic */
  context?: 'full' | 'zadanie' | 'pokoj' | 'none';
  onOpen: (id: number) => void;
}

export function SubtaskRow({ pod, context = 'full', onOpen }: Props) {
  const { plan, zadanieById, podById, today, setStatus } = useStore();
  const entry = plan.get(pod.id)!;
  const z = zadanieById.get(pod.zadanie_id);
  const done = entry.state === 'done';
  const color = osobaColor(pod.kto);

  const sub =
    context === 'full' ? `${z?.pokoj ?? ''} · ${z?.nazwa ?? ''}` : context === 'zadanie' ? z?.nazwa : context === 'pokoj' ? z?.pokoj : null;

  let when: string;
  if (entry.state === 'idea') when = 'pomysł';
  else if (entry.state === 'blocked') when = '';
  else if (entry.date) when = dayLabel(entry.date, today);
  else when = '';

  const blockers = entry.blockedBy.map((b) => podById.get(b)?.nazwa).filter(Boolean);

  return (
    <div className={`row state-${entry.state} status-${pod.status}`}>
      <button
        className="check"
        aria-label={done ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'}
        onClick={() => setStatus(pod.id, done ? 'do_zrobienia' : 'zrobione')}
      >
        {done ? <Check size={16} strokeWidth={3} /> : pod.status === 'w_trakcie' ? <span className="half" /> : null}
      </button>
      <button className="row-main" onClick={() => onOpen(pod.id)}>
        <span className="row-title" style={color && !done ? { color } : undefined}>
          {pod.nazwa}
        </span>
        {sub && <span className="row-sub">{sub}</span>}
        {entry.state === 'blocked' && (
          <span className="row-blocked">
            <Lock size={12} /> czeka na: {blockers.join(', ')}
          </span>
        )}
      </button>
      <div className="row-meta">
        {when && <span className={`when ${entry.date === today && !done ? 'today' : ''}`}>{when}</span>}
        <span className="row-icons">
          {pod.kto && <span className="avatar" style={{ background: color ?? '#888' }}>{pod.kto[0]}</span>}
          {rodzajIcon(pod.rodzaj)}
        </span>
      </div>
    </div>
  );
}
