# Nasz domek: planer remontu

Następca aplikacji AppSheet „Nasz domek LOL”. Statyczna aplikacja PWA (React + Vite) z bazą w Supabase.

## Co się zmieniło względem AppSheet

| AppSheet | Teraz |
|---|---|
| Kolumna „Kiedy” liczona przez Apps Script (`onEdit`, automatyzacja, trigger nocny) | Data liczona na bieżąco w aplikacji z zależności ([src/lib/schedule.ts](src/lib/schedule.ts)), więc nie ma skryptów ani nocnego przeliczania |
| Zależności jako tekst `"uid1, uid2"` + czyszczenie „martwych” UID | Tabela `zaleznosci` z kluczami obcymi (usunięcie kasuje zależności) i blokadą cykli w bazie |
| Zrobiony poprzednik nadal przesuwał następcę na jutro | Zrobione zadania nie blokują; następca jest od razu na dziś |
| Pomysł blokował następcę tylko, gdy *wszyscy* poprzednicy byli bez daty | Każdy niezrobiony pomysł w łańcuchu blokuje; widać „czeka na: …” |
| Brak możliwości ustawienia terminu | Pole „Nie wcześniej niż” (np. dostawa), które przesuwa też następców |
| Zaległe | Nie występują: niezrobione zadania zawsze są „dziś lub później” |
| Załącznik: jeden plik z Dysku Google | Wiele plików/zdjęć na zadanie (Supabase Storage, prywatny bucket) |
| Widoki Podzadania + Pokoje | Jeden widok „Pokoje” z grupowaniem (pokoje/osoby) i filtrem stanu |
| — | Wyszukiwarka, filtry osoba/rodzaj pracy we wszystkich widokach, zmiany na żywo (realtime), tryb ciemny, instalacja na telefonie |

Widoki: **Dziś** (W trakcie + dzisiejsze wg pokoju + zrobione dziś), **Kalendarz** (grupowanie po dniu), **Pokoje** (Pokój → Zadanie → podzadania), **Zadania** (główne zadania ze statusem i postępem).

## Baza (Supabase)

Wszystko w osobnym schemacie `naszdomek`, dzięki czemu w tym samym projekcie mogą żyć inne aplikacje (każda we własnym schemacie).
Dostęp mają tylko użytkownicy wpisani do `naszdomek.members` (RLS).

1. Uruchom migrację [supabase/migrations/20261116000000_naszdomek_init.sql](supabase/migrations/20261116000000_naszdomek_init.sql) (SQL Editor albo `supabase db push`).
2. **Project Settings → Data API → Exposed schemas**: dodaj `naszdomek`.
3. Import danych z AppSheet: `npm run seed > supabase/seed.sql`, potem uruchom `supabase/seed.sql`.
4. Utwórz konta (Authentication → Users → Add user, z hasłem) i dodaj je do aplikacji:
   ```sql
   insert into naszdomek.members (user_id, display_name)
   select id, 'Bartek' from auth.users where email = '…';
   ```

## Uruchomienie lokalne

```bash
cp .env.example .env   # uzupełnij URL i anon/publishable key
npm install
npm run dev
npm test               # testy logiki harmonogramu
```

## Deployment

GitHub Pages przez [.github/workflows/deploy.yml](.github/workflows/deploy.yml). W repozytorium ustaw zmienne (Settings → Secrets and variables → Actions → Variables):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (klucz publiczny, zabezpieczeniem jest RLS). Pages → Source: GitHub Actions.

Build to zwykłe pliki statyczne w `dist/`, więc tak samo działa Cloudflare Pages (build: `npm run build`, katalog: `dist`).
