import { Lock, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { compareRooms, OSOBY, POKOJE, RODZAJE, STATUSES } from '../lib/constants';
import { dayHeader } from '../lib/dates';
import { groupBy } from '../lib/filters';
import { computeSchedule, descendants } from '../lib/schedule';
import { useStore } from '../lib/store';
import type { Podzadanie, Status } from '../lib/types';
import { DepItem } from './DepItem';
import { Sheet, type SheetStackProps } from './Sheet';

interface Props extends SheetStackProps {
  id: number | null;
  zadanieId?: number;
  onClose: () => void;
  onOpenSub: (id: number) => void;
  onOpenTask: (id: number) => void;
}

const NEW_TASK = -1;

export function SubtaskForm({ id, stacked, hidden, zadanieId, onClose, onOpenSub, onOpenTask }: Props) {
  const store = useStore();
  const { podById, zadanieById, zadania, podzadania, zaleznosci, parentsOf, childrenOf, today } = store;
  const existing = id !== null ? podById.get(id) : undefined;

  const [form, setForm] = useState({
    zadanie_id: existing?.zadanie_id ?? zadanieId ?? zadania[0]?.id ?? NEW_TASK,
    nazwa: existing?.nazwa ?? '',
    status: (existing?.status ?? 'do_zrobienia') as Status,
    rodzaj: (existing ? existing.rodzaj : 'Remont') as string | null,
    kto: (existing?.kto ?? null) as string | null,
    nie_wczesniej: (existing?.nie_wczesniej ?? null) as string | null,
    notatka: existing?.notatka ?? '',
  });
  const [deps, setDeps] = useState<number[]>(id !== null ? parentsOf.get(id) ?? [] : []);
  const [newTask, setNewTask] = useState({ nazwa: '', pokoj: POKOJE[0] });
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Podgląd daty na żywo, z uwzględnieniem niezapisanych zmian
  const preview = useMemo(() => {
    const tmpId = id ?? -999;
    const me: Podzadanie = {
      id: tmpId,
      zadanie_id: form.zadanie_id,
      nazwa: form.nazwa,
      status: form.status,
      rodzaj: form.rodzaj,
      kto: form.kto,
      nie_wczesniej: form.nie_wczesniej,
      notatka: null,
      done_at: existing?.done_at ?? (form.status === 'zrobione' ? new Date().toISOString() : null),
      created_at: '',
    };
    const pods = [...podzadania.filter((p) => p.id !== tmpId), me];
    const ds = [...zaleznosci.filter((z) => z.podzadanie_id !== tmpId), ...deps.map((b) => ({ podzadanie_id: tmpId, blokujace_id: b }))];
    return computeSchedule(pods, ds, today).get(tmpId)!;
  }, [form, deps, podzadania, zaleznosci, today, id, existing]);

  const forbidden = useMemo(() => {
    const s = id !== null ? descendants(id, zaleznosci) : new Set<number>();
    if (id !== null) s.add(id);
    return s;
  }, [id, zaleznosci]);

  const candidates = useMemo(() => {
    const q = query.toLocaleLowerCase('pl');
    return podzadania
      .filter((p) => !forbidden.has(p.id) && !deps.includes(p.id))
      .filter((p) => {
        if (!q) return true;
        const z = zadanieById.get(p.zadanie_id);
        return `${p.nazwa} ${z?.nazwa} ${z?.pokoj}`.toLocaleLowerCase('pl').includes(q);
      })
      .sort((a, b) => (a.status === 'zrobione' ? 1 : 0) - (b.status === 'zrobione' ? 1 : 0) || b.id - a.id)
      .slice(0, 40);
  }, [podzadania, forbidden, deps, query, zadanieById]);

  const label = (pid: number) => {
    const p = podById.get(pid);
    const z = p && zadanieById.get(p.zadanie_id);
    return p ? `${p.nazwa} — ${z?.pokoj} · ${z?.nazwa}` : `#${pid}`;
  };

  const tasksByRoom = useMemo(
    () => [...groupBy(zadania, (z) => z.pokoj)].sort(([a], [b]) => compareRooms(a, b)),
    [zadania],
  );

  const canSave = form.nazwa.trim() && (form.zadanie_id !== NEW_TASK || newTask.nazwa.trim());

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    let zid = form.zadanie_id;
    if (zid === NEW_TASK) {
      const created = await store.saveZadanie(null, { nazwa: newTask.nazwa.trim(), pokoj: newTask.pokoj, notatka: null });
      if (created === null) return setSaving(false);
      zid = created;
    }
    const res = await store.savePodzadanie(
      id,
      {
        ...form,
        zadanie_id: zid,
        nazwa: form.nazwa.trim(),
        notatka: form.notatka.trim() || null,
      },
      deps,
    );
    setSaving(false);
    if (res !== null) onClose();
  };

  const remove = async () => {
    if (id === null || !confirm(`Usunąć „${existing?.nazwa}”?`)) return;
    await store.deletePodzadanie(id);
    onClose();
  };

  const zadanie = zadanieById.get(form.zadanie_id);
  const children = id !== null ? childrenOf.get(id) ?? [] : [];

  return (
    <Sheet
      stacked={stacked}
      hidden={hidden}
      title={id === null ? 'Nowe podzadanie' : 'Podzadanie'}
      onClose={onClose}
      actions={
        id !== null && (
          <button className="icon-btn danger" onClick={remove} aria-label="Usuń">
            <Trash2 size={20} />
          </button>
        )
      }
      footer={
        <button className="btn primary block" disabled={!canSave || saving} onClick={save}>
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      }
    >
      <label className="field">
        <span>Zadanie</span>
        <div className="inline">
          <select value={form.zadanie_id} onChange={(e) => set('zadanie_id', Number(e.target.value))}>
            {tasksByRoom.map(([room, list]) => (
              <optgroup key={room} label={room}>
                {list.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nazwa}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={NEW_TASK}>+ Nowe zadanie…</option>
          </select>
          {zadanie && (
            <button type="button" className="btn ghost" onClick={() => onOpenTask(zadanie.id)}>
              Otwórz
            </button>
          )}
        </div>
      </label>

      {form.zadanie_id === NEW_TASK && (
        <div className="subform">
          <label className="field">
            <span>Nazwa nowego zadania</span>
            <input value={newTask.nazwa} onChange={(e) => setNewTask({ ...newTask, nazwa: e.target.value })} placeholder="np. Ściany" />
          </label>
          <label className="field">
            <span>Pokój</span>
            <input list="pokoje" value={newTask.pokoj} onChange={(e) => setNewTask({ ...newTask, pokoj: e.target.value })} />
          </label>
        </div>
      )}
      {zadanie?.notatka && <p className="hint">📝 {zadanie.notatka}</p>}

      <label className="field">
        <span>Podzadanie</span>
        <input
          autoFocus={id === null}
          value={form.nazwa}
          onChange={(e) => set('nazwa', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Co trzeba zrobić?"
        />
      </label>

      <div className="field">
        <span>Status</span>
        <div className="segmented grid4">
          {STATUSES.map((s) => (
            <button key={s.value} className={form.status === s.value ? 'active' : ''} onClick={() => set('status', s.value)}>
              <span className="seg-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Rodzaj pracy</span>
        <div className="segmented wrap">
          {RODZAJE.map((r) => (
            <button
              key={r.value}
              className={form.rodzaj === r.value ? 'active' : ''}
              onClick={() => set('rodzaj', form.rodzaj === r.value ? null : r.value)}
            >
              {r.icon} {r.value}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Kto zrobi</span>
        <div className="segmented">
          {OSOBY.map((o) => (
            <button
              key={o.name}
              className={form.kto === o.name ? 'active' : ''}
              style={form.kto === o.name ? { background: o.color, borderColor: o.color, color: '#fff' } : undefined}
              onClick={() => set('kto', form.kto === o.name ? null : o.name)}
            >
              {o.name}
            </button>
          ))}
          <button className={form.kto === null ? 'active' : ''} onClick={() => set('kto', null)}>
            Ktokolwiek
          </button>
        </div>
      </div>

      <div className="plan-box">
        <div>
          <span className="muted">Kiedy: </span>
          {preview.state === 'done' && <strong>✅ zrobione{preview.date ? ` ${dayHeader(preview.date, today).toLowerCase()}` : ''}</strong>}
          {preview.state === 'idea' && <strong>❓ pomysł — bez terminu</strong>}
          {preview.state === 'blocked' && (
            <strong>
              <Lock size={13} /> czeka na pomysł: {preview.blockedBy.map((b) => podById.get(b)?.nazwa).join(', ')}
            </strong>
          )}
          {preview.state === 'planned' && preview.date && <strong>{dayHeader(preview.date, today)}</strong>}
        </div>
        <label className="inline small">
          <span className="muted">Nie wcześniej niż</span>
          <input type="date" value={form.nie_wczesniej ?? ''} onChange={(e) => set('nie_wczesniej', e.target.value || null)} />
          {form.nie_wczesniej && (
            <button className="icon-btn small" onClick={() => set('nie_wczesniej', null)} aria-label="Wyczyść datę">
              <X size={14} />
            </button>
          )}
        </label>
      </div>

      <div className="field">
        <span>Czeka na</span>
        {deps.length > 0 && (
          <div className="dep-list">
            {deps.map((d) => (
              <DepItem key={d} id={d} onOpen={onOpenSub} onRemove={() => setDeps(deps.filter((x) => x !== d))} />
            ))}
          </div>
        )}
        {deps.length === 0 && !picking && <span className="muted small-text">Nic — można zaczynać od razu</span>}
        {!picking && (
          <button className="btn ghost small align-start" onClick={() => setPicking(true)}>
            <Plus size={14} /> Dodaj zależność
          </button>
        )}
        {picking && (
          <div className="picker">
            <input autoFocus placeholder="Szukaj podzadania…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="picker-list">
              {candidates.map((p) => (
                <button
                  key={p.id}
                  className={p.status === 'zrobione' ? 'done' : ''}
                  onClick={() => {
                    setDeps([...deps, p.id]);
                    setQuery('');
                    setPicking(false);
                  }}
                >
                  {label(p.id)}
                </button>
              ))}
              {candidates.length === 0 && <div className="muted pad">Brak wyników</div>}
            </div>
            <button className="btn ghost small" onClick={() => setPicking(false)}>
              Anuluj
            </button>
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div className="field">
          <span>Blokuje</span>
          <div className="dep-list">
            {children.map((c) => (
              <DepItem key={c} id={c} onOpen={onOpenSub} />
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>Notatka</span>
        <textarea rows={3} value={form.notatka} onChange={(e) => set('notatka', e.target.value)} />
      </label>

      <datalist id="pokoje">
        {POKOJE.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </Sheet>
  );
}
