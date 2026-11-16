export type Status = 'pomysl' | 'do_zrobienia' | 'w_trakcie' | 'zrobione';

export interface Zadanie {
  id: number;
  nazwa: string;
  pokoj: string;
  notatka: string | null;
  created_at: string;
}

export interface Podzadanie {
  id: number;
  zadanie_id: number;
  nazwa: string;
  status: Status;
  rodzaj: string | null;
  kto: string | null;
  nie_wczesniej: string | null;
  notatka: string | null;
  done_at: string | null;
  created_at: string;
}

export interface Zaleznosc {
  podzadanie_id: number;
  blokujace_id: number;
}

export interface Zalacznik {
  id: number;
  zadanie_id: number;
  storage_path: string;
  nazwa: string;
  mime: string | null;
  rozmiar: number | null;
  created_at: string;
}

/** Wynik planowania dla jednego podzadania */
export type PlanState = 'done' | 'idea' | 'blocked' | 'planned';
export interface PlanEntry {
  state: PlanState;
  /** Data planowana (lub data wykonania dla zrobionych), YYYY-MM-DD */
  date: string | null;
  /** Dla zablokowanych: pomysły/zadania, które blokują łańcuch */
  blockedBy: number[];
}
