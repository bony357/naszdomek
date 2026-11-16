import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { todayISO } from './dates';
import { computeSchedule } from './schedule';
import { STORAGE_BUCKET, supabase } from './supabase';
import type { PlanEntry, Podzadanie, Status, Zadanie, Zalacznik, Zaleznosc } from './types';

export type PodzadanieInput = Pick<Podzadanie, 'zadanie_id' | 'nazwa' | 'status' | 'rodzaj' | 'kto' | 'nie_wczesniej' | 'notatka'>;
export type ZadanieInput = Pick<Zadanie, 'nazwa' | 'pokoj' | 'notatka'>;

interface Data {
  zadania: Zadanie[];
  podzadania: Podzadanie[];
  zaleznosci: Zaleznosc[];
  zalaczniki: Zalacznik[];
}

interface Store extends Data {
  loading: boolean;
  error: string | null;
  today: string;
  plan: Map<number, PlanEntry>;
  zadanieById: Map<number, Zadanie>;
  podById: Map<number, Podzadanie>;
  /** id podzadania -> lista id podzadań, na które czeka */
  parentsOf: Map<number, number[]>;
  /** id podzadania -> lista id podzadań, które blokuje */
  childrenOf: Map<number, number[]>;
  toast: string | null;
  showToast: (msg: string) => void;
  refresh: () => Promise<void>;
  setStatus: (id: number, status: Status) => Promise<void>;
  savePodzadanie: (id: number | null, input: PodzadanieInput, deps: number[]) => Promise<number | null>;
  deletePodzadanie: (id: number) => Promise<void>;
  saveZadanie: (id: number | null, input: ZadanieInput) => Promise<number | null>;
  deleteZadanie: (id: number) => Promise<void>;
  uploadFile: (zadanieId: number, file: File) => Promise<void>;
  deleteFile: (z: Zalacznik) => Promise<void>;
  fileUrl: (z: Zalacznik) => Promise<string | null>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore poza StoreProvider');
  return s;
}

const EMPTY: Data = { zadania: [], podzadania: [], zaleznosci: [], zalaczniki: [] };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(todayISO());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const refresh = useCallback(async () => {
    const [z, p, d, a] = await Promise.all([
      supabase.from('zadania').select('id,nazwa,pokoj,notatka,created_at').order('id'),
      supabase.from('podzadania').select('id,zadanie_id,nazwa,status,rodzaj,kto,nie_wczesniej,notatka,done_at,created_at').order('id'),
      supabase.from('zaleznosci').select('podzadanie_id,blokujace_id'),
      supabase.from('zalaczniki').select('id,zadanie_id,storage_path,nazwa,mime,rozmiar,created_at').order('id'),
    ]);
    const err = z.error ?? p.error ?? d.error ?? a.error;
    if (err) {
      setError(err.message);
    } else {
      setError(null);
      setData({
        zadania: z.data as Zadanie[],
        podzadania: p.data as Podzadanie[],
        zaleznosci: d.data as Zaleznosc[],
        zalaczniki: a.data as Zalacznik[],
      });
    }
    setLoading(false);
  }, []);

  // Debounced refresh — używany po zmianach i przy zdarzeniach realtime
  const refreshTimer = useRef<number>();
  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => void refresh(), 400);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('naszdomek-changes')
      .on('postgres_changes', { event: '*', schema: 'naszdomek' }, scheduleRefresh)
      .subscribe();
    // "Dziś" przesuwa się samo (zastępuje nocny trigger) + odświeżenie po powrocie do aplikacji
    const tick = () => setToday(todayISO());
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        tick();
        scheduleRefresh();
      }
    };
    const interval = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, scheduleRefresh]);

  const fail = useCallback(
    (msg: string) => {
      showToast(msg);
      scheduleRefresh();
    },
    [showToast, scheduleRefresh],
  );

  const setStatus = useCallback(
    async (id: number, status: Status) => {
      // Optymistycznie — UI reaguje natychmiast
      setData((d) => ({
        ...d,
        podzadania: d.podzadania.map((p) =>
          p.id === id ? { ...p, status, done_at: status === 'zrobione' ? p.done_at ?? new Date().toISOString() : null } : p,
        ),
      }));
      const { error } = await supabase.from('podzadania').update({ status }).eq('id', id);
      if (error) fail(`Nie udało się zmienić statusu: ${error.message}`);
    },
    [fail],
  );

  const savePodzadanie = useCallback(
    async (id: number | null, input: PodzadanieInput, deps: number[]) => {
      let podId = id;
      if (podId === null) {
        const { data: row, error } = await supabase.from('podzadania').insert(input).select('id').single();
        if (error) {
          fail(`Nie udało się zapisać: ${error.message}`);
          return null;
        }
        podId = row.id as number;
      } else {
        const { error } = await supabase.from('podzadania').update(input).eq('id', podId);
        if (error) {
          fail(`Nie udało się zapisać: ${error.message}`);
          return null;
        }
      }
      // Synchronizacja zależności
      const current = new Set(data.zaleznosci.filter((z) => z.podzadanie_id === podId).map((z) => z.blokujace_id));
      const wanted = new Set(deps);
      const toRemove = [...current].filter((x) => !wanted.has(x));
      const toAdd = [...wanted].filter((x) => !current.has(x));
      if (toRemove.length) {
        const { error } = await supabase.from('zaleznosci').delete().eq('podzadanie_id', podId).in('blokujace_id', toRemove);
        if (error) fail(`Błąd zależności: ${error.message}`);
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from('zaleznosci')
          .insert(toAdd.map((b) => ({ podzadanie_id: podId, blokujace_id: b })));
        if (error) fail(`Błąd zależności: ${error.message}`);
      }
      await refresh();
      return podId;
    },
    [data.zaleznosci, fail, refresh],
  );

  const deletePodzadanie = useCallback(
    async (id: number) => {
      setData((d) => ({
        ...d,
        podzadania: d.podzadania.filter((p) => p.id !== id),
        zaleznosci: d.zaleznosci.filter((z) => z.podzadanie_id !== id && z.blokujace_id !== id),
      }));
      const { error } = await supabase.from('podzadania').delete().eq('id', id);
      if (error) fail(`Nie udało się usunąć: ${error.message}`);
    },
    [fail],
  );

  const saveZadanie = useCallback(
    async (id: number | null, input: ZadanieInput) => {
      if (id === null) {
        const { data: row, error } = await supabase.from('zadania').insert(input).select('id').single();
        if (error) {
          fail(`Nie udało się zapisać: ${error.message}`);
          return null;
        }
        await refresh();
        return row.id as number;
      }
      setData((d) => ({ ...d, zadania: d.zadania.map((z) => (z.id === id ? { ...z, ...input } : z)) }));
      const { error } = await supabase.from('zadania').update(input).eq('id', id);
      if (error) {
        fail(`Nie udało się zapisać: ${error.message}`);
        return null;
      }
      return id;
    },
    [fail, refresh],
  );

  const deleteZadanie = useCallback(
    async (id: number) => {
      const paths = data.zalaczniki.filter((a) => a.zadanie_id === id).map((a) => a.storage_path);
      if (paths.length) await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      const { error } = await supabase.from('zadania').delete().eq('id', id);
      if (error) fail(`Nie udało się usunąć: ${error.message}`);
      await refresh();
    },
    [data.zalaczniki, fail, refresh],
  );

  const uploadFile = useCallback(
    async (zadanieId: number, file: File) => {
      const safe = file.name.normalize('NFD').replace(/[^\w.-]+/g, '_');
      const path = `zadania/${zadanieId}/${Date.now()}_${safe}`;
      const up = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type });
      if (up.error) return fail(`Nie udało się wgrać pliku: ${up.error.message}`);
      const { error } = await supabase.from('zalaczniki').insert({
        zadanie_id: zadanieId,
        storage_path: path,
        nazwa: file.name,
        mime: file.type || null,
        rozmiar: file.size,
      });
      if (error) fail(`Nie udało się zapisać załącznika: ${error.message}`);
      await refresh();
    },
    [fail, refresh],
  );

  const deleteFile = useCallback(
    async (z: Zalacznik) => {
      setData((d) => ({ ...d, zalaczniki: d.zalaczniki.filter((a) => a.id !== z.id) }));
      await supabase.storage.from(STORAGE_BUCKET).remove([z.storage_path]);
      const { error } = await supabase.from('zalaczniki').delete().eq('id', z.id);
      if (error) fail(`Nie udało się usunąć pliku: ${error.message}`);
    },
    [fail],
  );

  const fileUrl = useCallback(async (z: Zalacznik) => {
    const { data: signed, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(z.storage_path, 3600);
    if (error) {
      showToast(`Nie można otworzyć pliku: ${error.message}`);
      return null;
    }
    return signed.signedUrl;
  }, [showToast]);

  const derived = useMemo(() => {
    const zadanieById = new Map(data.zadania.map((z) => [z.id, z]));
    const podById = new Map(data.podzadania.map((p) => [p.id, p]));
    const parentsOf = new Map<number, number[]>();
    const childrenOf = new Map<number, number[]>();
    for (const d of data.zaleznosci) {
      (parentsOf.get(d.podzadanie_id) ?? parentsOf.set(d.podzadanie_id, []).get(d.podzadanie_id)!).push(d.blokujace_id);
      (childrenOf.get(d.blokujace_id) ?? childrenOf.set(d.blokujace_id, []).get(d.blokujace_id)!).push(d.podzadanie_id);
    }
    const plan = computeSchedule(data.podzadania, data.zaleznosci, today);
    return { zadanieById, podById, parentsOf, childrenOf, plan };
  }, [data, today]);

  const value: Store = {
    ...data,
    ...derived,
    loading,
    error,
    today,
    toast,
    showToast,
    refresh,
    setStatus,
    savePodzadanie,
    deletePodzadanie,
    saveZadanie,
    deleteZadanie,
    uploadFile,
    deleteFile,
    fileUrl,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
