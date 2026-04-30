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
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      age INTEGER NOT NULL,
      sexe TEXT NOT NULL,
      profession TEXT,
      telephone TEXT,
      email TEXT,
      photo TEXT,
      vicariat TEXT NOT NULL,
      paroisse TEXT NOT NULL,
      commentaires TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/api/inscriptions', async (_req, res) => {
  try {
    if (useSupabase) {
      const rows = await supabaseRequest('inscriptions?select=*&order=created_at.desc');
      return res.json(rows);
    }

    const rows = db.prepare('SELECT * FROM inscriptions ORDER BY id DESC').all();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/inscriptions', async (req, res) => {
  const data = req.body || {};
  const required = ['nom', 'prenom', 'age', 'sexe', 'vicariat', 'paroisse'];
  const missing = required.filter((k) => !data[k]);

  if (missing.length) {
    return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
  }

  const payload = {
    nom: String(data.nom).trim(),
    prenom: String(data.prenom).trim(),
    age: Number(data.age),
    sexe: String(data.sexe),
    profession: data.profession || '',
    telephone: data.telephone || '',
    email: data.email || '',
    photo: data.photo || '',
    vicariat: String(data.vicariat),
    paroisse: String(data.paroisse),
    commentaires: data.commentaires || '',
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
      INSERT INTO inscriptions (nom, prenom, age, sexe, profession, telephone, email, photo, vicariat, paroisse, commentaires, created_at)
      VALUES (@nom, @prenom, @age, @sexe, @profession, @telephone, @email, @photo, @vicariat, @paroisse, @commentaires, @created_at)
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
