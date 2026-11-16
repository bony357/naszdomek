-- =====================================================================
-- Nasz domek — planer remontu
-- Osobny schemat `naszdomek`, żeby ten sam projekt Supabase mógł
-- hostować kolejne, niezależne aplikacje (każda we własnym schemacie).
-- =====================================================================

create schema if not exists naszdomek;

-- ---------------------------------------------------------------------
-- Członkowie aplikacji (kto z użytkowników projektu ma dostęp)
-- ---------------------------------------------------------------------
create table naszdomek.members (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create or replace function naszdomek.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from naszdomek.members m where m.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Zadania (główne)
-- ---------------------------------------------------------------------
create table naszdomek.zadania (
  id          bigint generated always as identity primary key,
  nazwa       text not null check (length(trim(nazwa)) > 0),
  pokoj       text not null default 'Całe mieszkanie',
  notatka     text,
  legacy_uid  text unique,               -- UID z AppSheet (migracja)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Podzadania
-- ---------------------------------------------------------------------
create table naszdomek.podzadania (
  id             bigint generated always as identity primary key,
  zadanie_id     bigint not null references naszdomek.zadania (id) on delete cascade,
  nazwa          text not null check (length(trim(nazwa)) > 0),
  status         text not null default 'do_zrobienia'
                 check (status in ('pomysl', 'do_zrobienia', 'w_trakcie', 'zrobione')),
  rodzaj         text,                   -- Remont / Plan / Sprzątanie / Zakupy / ...
  kto            text,                   -- Bartek / Kasia / ...
  nie_wczesniej  date,                   -- opcjonalnie: nie planuj przed tą datą
  notatka        text,
  done_at        timestamptz,            -- ustawiane automatycznie przy statusie "zrobione"
  legacy_uid     text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index podzadania_zadanie_idx on naszdomek.podzadania (zadanie_id);

-- ---------------------------------------------------------------------
-- Zależności: podzadanie `podzadanie_id` jest zablokowane przez `blokujace_id`.
-- FK z ON DELETE CASCADE zastępuje ręczne czyszczenie "martwych" zależności.
-- ---------------------------------------------------------------------
create table naszdomek.zaleznosci (
  podzadanie_id  bigint not null references naszdomek.podzadania (id) on delete cascade,
  blokujace_id   bigint not null references naszdomek.podzadania (id) on delete cascade,
  primary key (podzadanie_id, blokujace_id),
  check (podzadanie_id <> blokujace_id)
);

create index zaleznosci_blokujace_idx on naszdomek.zaleznosci (blokujace_id);

-- Blokada cykli (A czeka na B, B czeka na A)
create or replace function naszdomek.zaleznosci_no_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    with recursive przodkowie(id) as (
      select new.blokujace_id
      union
      select z.blokujace_id
      from naszdomek.zaleznosci z
      join przodkowie p on z.podzadanie_id = p.id
    )
    select 1 from przodkowie where id = new.podzadanie_id
  ) then
    raise exception 'Ta zależność utworzyłaby cykl' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger zaleznosci_no_cycle
before insert or update on naszdomek.zaleznosci
for each row execute function naszdomek.zaleznosci_no_cycle();

-- ---------------------------------------------------------------------
-- Załączniki (pliki w Supabase Storage, bucket `naszdomek`)
-- ---------------------------------------------------------------------
create table naszdomek.zalaczniki (
  id            bigint generated always as identity primary key,
  zadanie_id    bigint not null references naszdomek.zadania (id) on delete cascade,
  storage_path  text not null unique,
  nazwa         text not null,
  mime          text,
  rozmiar       bigint,
  created_at    timestamptz not null default now()
);

create index zalaczniki_zadanie_idx on naszdomek.zalaczniki (zadanie_id);

-- ---------------------------------------------------------------------
-- Triggery pomocnicze
-- ---------------------------------------------------------------------
create or replace function naszdomek.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger zadania_touch before update on naszdomek.zadania
for each row execute function naszdomek.touch_updated_at();

create trigger podzadania_touch before update on naszdomek.podzadania
for each row execute function naszdomek.touch_updated_at();

create or replace function naszdomek.podzadania_done_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'zrobione' and (tg_op = 'INSERT' or old.status is distinct from 'zrobione') then
    new.done_at := coalesce(new.done_at, now());
  elsif new.status <> 'zrobione' then
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger podzadania_done_at before insert or update of status on naszdomek.podzadania
for each row execute function naszdomek.podzadania_done_at();

-- ---------------------------------------------------------------------
-- Uprawnienia + RLS: dostęp tylko dla członków aplikacji
-- ---------------------------------------------------------------------
grant usage on schema naszdomek to authenticated;
grant select, insert, update, delete on all tables in schema naszdomek to authenticated;
grant execute on function naszdomek.is_member() to authenticated;
revoke all on naszdomek.members from authenticated;
grant select on naszdomek.members to authenticated;

alter table naszdomek.members    enable row level security;
alter table naszdomek.zadania    enable row level security;
alter table naszdomek.podzadania enable row level security;
alter table naszdomek.zaleznosci enable row level security;
alter table naszdomek.zalaczniki enable row level security;

create policy members_read on naszdomek.members
  for select to authenticated using (naszdomek.is_member());

create policy zadania_all on naszdomek.zadania
  for all to authenticated using (naszdomek.is_member()) with check (naszdomek.is_member());

create policy podzadania_all on naszdomek.podzadania
  for all to authenticated using (naszdomek.is_member()) with check (naszdomek.is_member());

create policy zaleznosci_all on naszdomek.zaleznosci
  for all to authenticated using (naszdomek.is_member()) with check (naszdomek.is_member());

create policy zalaczniki_all on naszdomek.zalaczniki
  for all to authenticated using (naszdomek.is_member()) with check (naszdomek.is_member());

-- ---------------------------------------------------------------------
-- Storage: prywatny bucket na załączniki
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('naszdomek', 'naszdomek', false, 52428800)
on conflict (id) do nothing;

create policy naszdomek_storage_select on storage.objects
  for select to authenticated using (bucket_id = 'naszdomek' and naszdomek.is_member());
create policy naszdomek_storage_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'naszdomek' and naszdomek.is_member());
create policy naszdomek_storage_update on storage.objects
  for update to authenticated using (bucket_id = 'naszdomek' and naszdomek.is_member());
create policy naszdomek_storage_delete on storage.objects
  for delete to authenticated using (bucket_id = 'naszdomek' and naszdomek.is_member());

-- ---------------------------------------------------------------------
-- Realtime: zmiany drugiej osoby widoczne od razu
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  naszdomek.zadania, naszdomek.podzadania, naszdomek.zaleznosci, naszdomek.zalaczniki;
