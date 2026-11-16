import type { Session } from '@supabase/supabase-js';
import { CalendarDays, ListTree, LogOut, Plus, RefreshCw, Star, Sun } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilterBar, type Tab } from './components/FilterBar';
import { SubtaskForm } from './components/SubtaskForm';
import { TaskSheet } from './components/TaskSheet';
import { EMPTY_FILTERS, type Filters } from './lib/filters';
import { StoreProvider, useStore } from './lib/store';
import { isConfigured, supabase } from './lib/supabase';
import { CalendarView } from './views/CalendarView';
import { ListView } from './views/ListView';
import { Login } from './views/Login';
import { TasksView } from './views/TasksView';
import { TodayView } from './views/TodayView';

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'dzis', label: 'Dziś', icon: Sun },
  { id: 'kalendarz', label: 'Kalendarz', icon: CalendarDays },
  { id: 'lista', label: 'Pokoje', icon: ListTree },
  { id: 'zadania', label: 'Zadania', icon: Star },
];

type Modal = { key: number } & (
  | { kind: 'sub'; id: number | null; zadanieId?: number }
  | { kind: 'task'; id: number | null }
);
type ModalInput = Modal extends infer M ? (M extends Modal ? Omit<M, 'key'> : never) : never;
let modalKey = 0;

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <div className="login">
        <div className="login-card">
          <h1>Brak konfiguracji</h1>
          <p className="muted">Ustaw VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY w pliku .env</p>
        </div>
      </div>
    );
  }
  if (session === undefined) return <div className="splash">🏠</div>;
  if (!session) return <Login />;
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function initialTab(): Tab {
  const h = location.hash.slice(1) as Tab;
  return TABS.some((t) => t.id === h) ? h : 'dzis';
}

function Shell() {
  const { loading, error, toast, refresh } = useStore();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [stack, setStack] = useState<Modal[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  // Wysokość przypiętego nagłówka -> offset dla przyklejonych nagłówków grup
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--top-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  });

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab]);

  // Z listy: panel zaczyna od nowa (bez "długiego powrotu").
  // Z wnętrza panelu: kolejny poziom, strzałka wraca do poprzedniego.
  const open = useCallback((m: ModalInput) => setStack([{ ...m, key: ++modalKey } as Modal]), []);
  const push = useCallback((m: ModalInput) => setStack((s) => [...s, { ...m, key: ++modalKey } as Modal]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const openSub = useCallback((id: number) => open({ kind: 'sub', id }), [open]);
  const openTask = useCallback((id: number) => open({ kind: 'task', id }), [open]);
  const pushSub = useCallback((id: number) => push({ kind: 'sub', id }), [push]);
  const pushTask = useCallback((id: number) => push({ kind: 'task', id }), [push]);

  if (loading) return <div className="splash">🏠</div>;

  if (error) {
    return (
      <div className="login">
        <div className="login-card">
          <h1>Brak dostępu</h1>
          <p className="muted">{error}</p>
          <p className="muted">Jeśli to nowe konto, poproś o dodanie do aplikacji (tabela naszdomek.members).</p>
          <button className="btn primary block" onClick={() => refresh()}>
            Spróbuj ponownie
          </button>
          <button className="btn ghost block" onClick={() => supabase.auth.signOut()}>
            Wyloguj
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${stack.length ? 'has-panel' : ''}`}>
      <div className="top" ref={topRef}>
      <header className="topbar">
        <h1>{tab === 'dzis' ? 'Nasz domek' : TABS.find((t) => t.id === tab)!.label}</h1>
        <button className="icon-btn" onClick={() => refresh()} aria-label="Odśwież">
          <RefreshCw size={18} />
        </button>
        <button className="icon-btn" onClick={() => confirm('Wylogować?') && supabase.auth.signOut()} aria-label="Wyloguj">
          <LogOut size={18} />
        </button>
      </header>
      <FilterBar tab={tab} filters={filters} onChange={setFilters} />
      </div>

      <main>
        {tab === 'dzis' && <TodayView filters={filters} onOpen={openSub} />}
        {tab === 'kalendarz' && <CalendarView filters={filters} onOpen={openSub} />}
        {tab === 'lista' && <ListView filters={filters} onOpen={openSub} onOpenTask={openTask} />}
        {tab === 'zadania' && <TasksView filters={filters} onFilters={setFilters} onOpen={openSub} onOpenTask={openTask} />}
      </main>

      <button
        className="fab"
        aria-label={tab === 'zadania' ? 'Nowe zadanie' : 'Nowe podzadanie'}
        onClick={() => open(tab === 'zadania' ? { kind: 'task', id: null } : { kind: 'sub', id: null })}
      >
        <Plus size={26} />
      </button>

      <nav className="bottomnav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <t.icon size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {stack.map((m, i) =>
        m.kind === 'sub' ? (
          <SubtaskForm
            key={m.key}
            id={m.id}
            zadanieId={m.zadanieId}
            stacked={i > 0}
            hidden={i < stack.length - 1}
            onClose={pop}
            onOpenSub={pushSub}
            onOpenTask={pushTask}
          />
        ) : (
          <TaskSheet
            key={m.key}
            id={m.id}
            stacked={i > 0}
            hidden={i < stack.length - 1}
            onClose={pop}
            onOpenSub={pushSub}
            onAddSub={(zadanieId) => push({ kind: 'sub', id: null, zadanieId })}
            onCreated={(id) => setStack((s) => [...s.slice(0, -1), { kind: 'task', id, key: ++modalKey }])}
          />
        ),
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
