import { ArrowRight, Check, Lock } from 'lucide-react';
import { osobaColor, rodzajIcon } from '../lib/constants';
import { dayLabel } from '../lib/dates';
import { useStore } from '../lib/store';
import type { Podzadanie } from '../lib/types';

interface Props {
  pod: Podzadanie;
  /** co pokazać pod nazwą: pokój + zadanie, samo zadanie, sam pokój albo nic */
  context?: 'full' | 'zadanie' | 'pokoj' | 'none';
  /** pokaż niezrobione zależności w obie strony (czeka na / blokuje) */
  showDeps?: boolean;
  onOpen: (id: number) => void;
}

export function SubtaskRow({ pod, context = 'full', showDeps = false, onOpen }: Props) {
  const { plan, zadanieById, podById, parentsOf, childrenOf, today, setStatus } = useStore();
  const entry = plan.get(pod.id)!;
  const z = zadanieById.get(pod.zadanie_id);
  const done = entry.state === 'done';
  const color = osobaColor(pod.kto);

  const sub =
    context === 'full' ? `${z?.pokoj ?? ''} · ${z?.nazwa ?? ''}` : context === 'zadanie' ? z?.nazwa : context === 'pokoj' ? z?.pokoj : null;

  let when = '';
  if (entry.state === 'idea') when = 'pomysł';
  else if (entry.date && entry.state === 'planned') when = dayLabel(entry.date, today);
  else if (entry.date && done) when = dayLabel(entry.date, today);

  const depName = (id: number) => {
    const p = podById.get(id);
    if (!p) return '';
    return p.zadanie_id === pod.zadanie_id ? p.nazwa : `${p.nazwa} (${zadanieById.get(p.zadanie_id)?.nazwa})`;
  };
  const notDone = (id: number) => podById.get(id)?.status !== 'zrobione';
  const waitsFor = showDeps && !done ? (parentsOf.get(pod.id) ?? []).filter(notDone) : [];
  const blocks = showDeps && !done ? (childrenOf.get(pod.id) ?? []).filter(notDone) : [];
  const ideaBlockers = !showDeps && entry.state === 'blocked' ? entry.blockedBy.map(depName) : [];

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
        {ideaBlockers.length > 0 && (
          <span className="row-dep">
            <Lock size={12} /> czeka na: {ideaBlockers.join(', ')}
          </span>
        )}
        {waitsFor.length > 0 && (
          <span className="row-dep">
            <Lock size={12} /> czeka na: {waitsFor.map(depName).join(', ')}
          </span>
        )}
        {blocks.length > 0 && (
          <span className="row-dep">
            <ArrowRight size={12} /> blokuje: {blocks.map(depName).join(', ')}
          </span>
        )}
      </button>
      <div className="row-meta">
        {when && <span className="when">{when}</span>}
        <span className="row-icons">
          {pod.kto && (
            <span className="avatar" style={{ background: color ?? '#888' }} title={pod.kto}>
              {pod.kto[0]}
            </span>
          )}
          {rodzajIcon(pod.rodzaj)}
        </span>
      </div>
    </div>
  );
}
