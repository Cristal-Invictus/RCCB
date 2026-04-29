const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, 'data', 'rccb.db'));
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

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/inscriptions', (_req, res) => {
  const rows = db.prepare('SELECT * FROM inscriptions ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/inscriptions', (req, res) => {
  const data = req.body || {};
  const required = ['nom', 'prenom', 'age', 'sexe', 'vicariat', 'paroisse'];
  const missing = required.filter((k) => !data[k]);

  if (missing.length) {
    return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
  }

  const stmt = db.prepare(`
    INSERT INTO inscriptions (nom, prenom, age, sexe, profession, telephone, email, photo, vicariat, paroisse, commentaires, created_at)
    VALUES (@nom, @prenom, @age, @sexe, @profession, @telephone, @email, @photo, @vicariat, @paroisse, @commentaires, @created_at)
  `);

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

  const info = stmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid, ...payload });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`RCCB app running on http://localhost:${PORT}`);
});
