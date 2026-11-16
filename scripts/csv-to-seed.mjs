// Konwersja eksportu z AppSheet (CSV) do pliku SQL z danymi.
// Użycie: node scripts/csv-to-seed.mjs [zadania.csv] [podzadania.csv] > supabase/seed.sql
import { readFileSync } from 'node:fs';

const zadaniaPath = process.argv[2] ?? 'Zadania - Zadania.csv';
const podzadaniaPath = process.argv[3] ?? 'Zadania - Podzadania.csv';

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows;
  return data
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const STATUS = (s) => {
  if (s.includes('Zrobione')) return 'zrobione';
  if (s.includes('trakcie')) return 'w_trakcie';
  if (s.includes('Pomysł')) return 'pomysl';
  return 'do_zrobienia';
};
const RODZAJ = (s) => {
  if (!s) return null;
  for (const k of ['Remont', 'Plan', 'Sprzątanie', 'Zakupy', 'Wyprowadzka']) if (s.includes(k)) return k;
  return s;
};

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

const zadania = parseCsv(readFileSync(zadaniaPath, 'utf8')).filter((z) => z.UID);
const podzadania = parseCsv(readFileSync(podzadaniaPath, 'utf8')).filter((p) => p.UID && p['UID Zadanie']);

const zadaniaUids = new Set(zadania.map((z) => z.UID));
const podUids = new Set(podzadania.map((p) => p.UID));

const out = [];
const warn = (m) => process.stderr.write(`UWAGA: ${m}\n`);
out.push('-- Wygenerowano z eksportu AppSheet: node scripts/csv-to-seed.mjs');
out.push('begin;');

out.push('insert into naszdomek.zadania (legacy_uid, nazwa, pokoj, notatka) values');
out.push(zadania.map((z) => `  (${q(z.UID)}, ${q(z.Zadanie)}, ${q(z['Pokój'] || 'Całe mieszkanie')}, ${q(z.Notatka)})`).join(',\n') + ';');

const podRows = podzadania.filter((p) => {
  if (!zadaniaUids.has(p['UID Zadanie'])) { warn(`podzadanie ${p.UID} wskazuje na nieistniejące zadanie`); return false; }
  return true;
});
out.push('insert into naszdomek.podzadania (legacy_uid, zadanie_id, nazwa, status, rodzaj, kto, done_at) values');
out.push(podRows.map((p) => {
  const status = STATUS(p.Status);
  return `  (${q(p.UID)}, (select id from naszdomek.zadania where legacy_uid = ${q(p['UID Zadanie'])}), ${q(p.Podzadanie)}, ${q(status)}, ${q(RODZAJ(p['Rodzaj pracy']))}, ${q(p['Kto zrobi'])}, null)`;
}).join(',\n') + ';');

const deps = [];
for (const p of podRows) {
  const parents = (p['Zależność'] || '').split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const parent of parents) {
    if (!podUids.has(parent)) { warn(`pominięto martwą zależność ${p.UID} -> ${parent}`); continue; }
    if (parent === p.UID) continue;
    deps.push([p.UID, parent]);
  }
}
if (deps.length) {
  out.push('insert into naszdomek.zaleznosci (podzadanie_id, blokujace_id)');
  out.push('select c.id, b.id from (values');
  out.push(deps.map(([c, b]) => `  (${q(c)}, ${q(b)})`).join(',\n'));
  out.push(') as d(child, parent)');
  out.push('join naszdomek.podzadania c on c.legacy_uid = d.child');
  out.push('join naszdomek.podzadania b on b.legacy_uid = d.parent;');
}
// AppSheet nie znał prawdziwej daty wykonania (nocny skrypt nadpisywał ją dzisiejszą),
// więc dla zmigrowanych zrobionych zadań zostawiamy datę pustą.
out.push("update naszdomek.podzadania set done_at = null where legacy_uid is not null and status = 'zrobione';");
out.push('commit;');
process.stdout.write(out.join('\n') + '\n');
process.stderr.write(`OK: ${zadania.length} zadań, ${podRows.length} podzadań, ${deps.length} zależności\n`);
