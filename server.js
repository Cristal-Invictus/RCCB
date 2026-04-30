const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let db;
if (!useSupabase) {
  db = new Database(path.join(__dirname, 'data', 'rccb.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS inscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presence_date TEXT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      age INTEGER,
      sexe TEXT NOT NULL,
      situation_relationnelle TEXT,
      profession TEXT,
      telephone TEXT,
      photo TEXT,
      vicariat TEXT NOT NULL,
      paroisse TEXT NOT NULL,
      commentaires TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const existingColumns = db.prepare('PRAGMA table_info(inscriptions)').all().map((c) => c.name);
  const neededColumns = {
    presence_date: 'TEXT',
    date_naissance: 'TEXT',
    situation_relationnelle: 'TEXT'
  };
  for (const [name, type] of Object.entries(neededColumns)) {
    if (!existingColumns.includes(name)) {
      db.exec(`ALTER TABLE inscriptions ADD COLUMN ${name} ${type};`);
    }
  }
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function computeAgeFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}


async function supabaseRequest(endpoint, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${base}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase error ${res.status}: ${txt}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: useSupabase ? 'supabase' : 'sqlite' });
});

app.get('/api/inscriptions', async (req, res) => {
  try {
    if (useSupabase) {
      const date = asText(req.query.date);
      const filter = date ? `&presence_date=eq.${encodeURIComponent(date)}` : '';
      const rows = await supabaseRequest(`inscriptions?select=*&order=created_at.desc${filter}`);
      return res.json(rows);
    }

    const date = asText(req.query.date);
    const rows = date
      ? db.prepare('SELECT * FROM inscriptions WHERE presence_date = ? ORDER BY id DESC').all(date)
      : db.prepare('SELECT * FROM inscriptions ORDER BY id DESC').all();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/inscriptions', async (req, res) => {
  const data = req.body || {};
  const derivedAge = data.age ? Number(data.age) : computeAgeFromDate(data.date_naissance || data.dateNaissance);
  const required = ['presence_date', 'nom', 'prenom', 'date_naissance', 'sexe', 'situation_relationnelle', 'vicariat', 'paroisse'];
  const missing = required.filter((k) => !data[k]);

  if (missing.length) {
    return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
  }

  if (!Number.isFinite(derivedAge) || derivedAge < 1 || derivedAge > 120) {
    return res.status(400).json({ error: 'Âge invalide. Renseigne un âge ou une date de naissance valide.' });
  }

  const payload = {
    presence_date: asText(data.presence_date),
    nom: asText(data.nom),
    prenom: asText(data.prenom),
    date_naissance: asText(data.date_naissance || data.dateNaissance),
    age: Number.isFinite(derivedAge) ? derivedAge : null,
    sexe: asText(data.sexe),
    situation_relationnelle: asText(data.situation_relationnelle),
    profession: asText(data.profession),
    telephone: asText(data.telephone),
    photo: asText(data.photo),
    vicariat: asText(data.vicariat),
    paroisse: asText(data.paroisse),
    commentaires: asText(data.commentaires),
    created_at: new Date().toISOString()
  };

  try {
    if (useSupabase) {
      const inserted = await supabaseRequest('inscriptions', {
        method: 'POST',
        body: JSON.stringify([payload])
      });
      return res.status(201).json(inserted[0]);
    }

    const stmt = db.prepare(`
      INSERT INTO inscriptions (presence_date, nom, prenom, date_naissance, age, sexe, situation_relationnelle, profession, telephone, photo, vicariat, paroisse, commentaires, created_at)
      VALUES (@presence_date, @nom, @prenom, @date_naissance, @age, @sexe, @situation_relationnelle, @profession, @telephone, @photo, @vicariat, @paroisse, @commentaires, @created_at)
    `);

    const info = stmt.run(payload);
    return res.status(201).json({ id: info.lastInsertRowid, ...payload });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`RCCB app running on http://localhost:${PORT} (${useSupabase ? 'supabase' : 'sqlite'})`);
});
