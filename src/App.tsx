import type { Session } from '@supabase/supabase-js';
import { CalendarDays, ListTree, LogOut, Plus, RefreshCw, Star, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FilterBar } from './components/FilterBar';
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

type Tab = 'dzis' | 'kalendarz' | 'lista' | 'zadania';
const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'dzis', label: 'Dziś', icon: Sun },
  { id: 'kalendarz', label: 'Kalendarz', icon: CalendarDays },
  { id: 'lista', label: 'Pokoje', icon: ListTree },
  { id: 'zadania', label: 'Zadania', icon: Star },
];

type Modal =
  | { kind: 'sub'; id: number | null; zadanieId?: number }
  | { kind: 'task'; id: number | null };

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

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab]);

  const push = useCallback((m: Modal) => setStack((s) => [...s, m]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const openSub = useCallback((id: number) => push({ kind: 'sub', id }), [push]);
  const openTask = useCallback((id: number) => push({ kind: 'task', id }), [push]);

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
    <div className="app">
      <header className="topbar">
        <h1>{tab === 'dzis' ? 'Nasz domek' : TABS.find((t) => t.id === tab)!.label}</h1>
        <button className="icon-btn" onClick={() => refresh()} aria-label="Odśwież">
          <RefreshCw size={18} />
        </button>
        <button className="icon-btn" onClick={() => confirm('Wylogować?') && supabase.auth.signOut()} aria-label="Wyloguj">
          <LogOut size={18} />
        </button>
      </header>
      <FilterBar filters={filters} onChange={setFilters} />

      <main>
        {tab === 'dzis' && <TodayView filters={filters} onOpen={openSub} />}
        {tab === 'kalendarz' && <CalendarView filters={filters} onOpen={openSub} />}
        {tab === 'lista' && <ListView filters={filters} onOpen={openSub} onOpenTask={openTask} />}
        {tab === 'zadania' && <TasksView filters={filters} onOpenTask={openTask} />}
      </main>

      <button
        className="fab"
        aria-label={tab === 'zadania' ? 'Nowe zadanie' : 'Nowe podzadanie'}
        onClick={() => push(tab === 'zadania' ? { kind: 'task', id: null } : { kind: 'sub', id: null })}
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
            key={i}
            id={m.id}
            zadanieId={m.zadanieId}
            onClose={pop}
            onOpenSub={openSub}
            onOpenTask={openTask}
          />
        ) : (
          <TaskSheet
            key={`${i}-${m.id}`}
            id={m.id}
            onClose={pop}
            onOpenSub={openSub}
            onAddSub={(zadanieId) => push({ kind: 'sub', id: null, zadanieId })}
            onCreated={(id) => setStack((s) => [...s.slice(0, -1), { kind: 'task', id }])}
          />
        ),
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
