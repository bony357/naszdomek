import { FileText, Image as ImageIcon, Paperclip, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { POKOJE } from '../lib/constants';
import { byPlan } from '../lib/filters';
import { useStore } from '../lib/store';
import type { Zalacznik } from '../lib/types';
import { taskProgress } from '../views/TasksView';
import { DepItem } from './DepItem';
import { Sheet, type SheetStackProps } from './Sheet';
import { SubtaskRow } from './SubtaskRow';

interface Props extends SheetStackProps {
  id: number | null;
  onClose: () => void;
  onOpenSub: (id: number) => void;
  onAddSub: (zadanieId: number) => void;
  onCreated: (id: number) => void;
}

export function TaskSheet({ id, stacked, hidden, onClose, onOpenSub, onAddSub, onCreated }: Props) {
  const store = useStore();
  const { zadanieById, podzadania, zalaczniki, plan, parentsOf, childrenOf, podById } = store;
  const z = id !== null ? zadanieById.get(id) : undefined;
  const [form, setForm] = useState({ nazwa: z?.nazwa ?? '', pokoj: z?.pokoj ?? POKOJE[0], notatka: z?.notatka ?? '' });
  const [showDone, setShowDone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Gdy druga osoba zmieni zadanie (realtime), a my nie edytujemy — podmieniamy wartości
  useEffect(() => {
    if (z) setForm({ nazwa: z.nazwa, pokoj: z.pokoj, notatka: z.notatka ?? '' });
  }, [z?.nazwa, z?.pokoj, z?.notatka]); // eslint-disable-line react-hooks/exhaustive-deps

  if (id !== null && !z) {
    return (
      <Sheet title="Zadanie" onClose={onClose}>
        <p className="muted">To zadanie zostało usunięte.</p>
      </Sheet>
    );
  }

  const subs = id !== null ? podzadania.filter((p) => p.zadanie_id === id).sort(byPlan(plan)) : [];
  const visibleSubs = showDone ? subs : subs.filter((p) => p.status !== 'zrobione');
  const files = id !== null ? zalaczniki.filter((a) => a.zadanie_id === id) : [];
  const progress = taskProgress(subs);

  // Zależności z innymi zadaniami (tylko niezrobione), w obie strony
  const own = new Set(subs.map((p) => p.id));
  const external = (map: Map<number, number[]>) => [
    ...new Set(
      subs
        .filter((p) => p.status !== 'zrobione')
        .flatMap((p) => map.get(p.id) ?? [])
        .filter((x) => !own.has(x) && podById.get(x)?.status !== 'zrobione'),
    ),
  ];
  const waitsFor = external(parentsOf);
  const blocks = external(childrenOf);

  const dirty = !z || form.nazwa !== z.nazwa || form.pokoj !== z.pokoj || form.notatka !== (z.notatka ?? '');

  const save = async () => {
    if (!form.nazwa.trim()) return;
    const input = { nazwa: form.nazwa.trim(), pokoj: form.pokoj.trim() || 'Całe mieszkanie', notatka: form.notatka.trim() || null };
    const res = await store.saveZadanie(id, input);
    if (res !== null && id === null) onCreated(res);
  };

  const remove = async () => {
    if (id === null) return;
    if (!confirm(`Usunąć zadanie „${z?.nazwa}” razem z ${subs.length} podzadaniami?`)) return;
    await store.deleteZadanie(id);
    onClose();
  };

  const upload = async (list: FileList | null) => {
    if (!list || id === null) return;
    setUploading(true);
    for (const f of Array.from(list)) await store.uploadFile(id, f);
    setUploading(false);
  };

  const openFile = async (a: Zalacznik) => {
    // Okno otwieramy od razu (Safari blokuje window.open po await)
    const w = window.open('', '_blank');
    const url = await store.fileUrl(a);
    if (url && w) w.location.href = url;
    else w?.close();
  };

  return (
    <Sheet
      stacked={stacked}
      hidden={hidden}
      title={id === null ? 'Nowe zadanie' : `${z!.pokoj} — ${z!.nazwa}`}
      onClose={onClose}
      actions={
        id !== null && (
          <button className="icon-btn danger" onClick={remove} aria-label="Usuń zadanie">
            <Trash2 size={20} />
          </button>
        )
      }
      footer={
        dirty && (
          <button className="btn primary block" disabled={!form.nazwa.trim()} onClick={save}>
            {id === null ? 'Utwórz zadanie' : 'Zapisz zmiany'}
          </button>
        )
      }
    >
      <div className="grid2">
        <label className="field">
          <span>Zadanie</span>
          <input autoFocus={id === null} value={form.nazwa} onChange={(e) => setForm({ ...form, nazwa: e.target.value })} />
        </label>
        <label className="field">
          <span>Pokój</span>
          <input list="pokoje-task" value={form.pokoj} onChange={(e) => setForm({ ...form, pokoj: e.target.value })} />
          <datalist id="pokoje-task">
            {POKOJE.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
      </div>
      <label className="field">
        <span>Notatka</span>
        <textarea rows={2} value={form.notatka} onChange={(e) => setForm({ ...form, notatka: e.target.value })} />
      </label>

      {id !== null && (
        <>
          <div className="section-head">
            <h3>
              Podzadania <span className="muted">{progress.done}/{progress.total}</span>
            </h3>
            <label className="toggle">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> zrobione
            </label>
          </div>
          {(waitsFor.length > 0 || blocks.length > 0) && (
            <div className="deps-summary">
              {waitsFor.length > 0 && (
                <div className="field">
                  <span>Czeka na (inne zadania)</span>
                  <div className="dep-list">
                    {waitsFor.map((d) => (
                      <DepItem key={d} id={d} onOpen={onOpenSub} />
                    ))}
                  </div>
                </div>
              )}
              {blocks.length > 0 && (
                <div className="field">
                  <span>Blokuje (inne zadania)</span>
                  <div className="dep-list">
                    {blocks.map((d) => (
                      <DepItem key={d} id={d} onOpen={onOpenSub} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="list">
            {visibleSubs.map((p) => (
              <SubtaskRow key={p.id} pod={p} context="none" showDeps onOpen={onOpenSub} />
            ))}
          </div>
          <button className="btn ghost" onClick={() => onAddSub(id)}>
            <Plus size={16} /> Dodaj podzadanie
          </button>

          <div className="section-head">
            <h3>Załączniki</h3>
            <button className="btn ghost small" disabled={uploading} onClick={() => fileInput.current?.click()}>
              <Paperclip size={14} /> {uploading ? 'Wgrywanie…' : 'Dodaj plik / zdjęcie'}
            </button>
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
          </div>
          <div className="files">
            {files.map((a) => (
              <div key={a.id} className="file">
                <button className="file-open" onClick={() => openFile(a)}>
                  {a.mime?.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                  <span>{a.nazwa}</span>
                </button>
                <button
                  className="icon-btn small"
                  aria-label="Usuń plik"
                  onClick={() => confirm(`Usunąć plik „${a.nazwa}”?`) && store.deleteFile(a)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {files.length === 0 && <div className="muted">Brak załączników</div>}
          </div>
        </>
      )}
    </Sheet>
  );
}
