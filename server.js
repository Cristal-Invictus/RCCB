const path = require('path');
const fs = require('fs');
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, 'rccb.db');
let db;

app.use(express.json({ limit: '6mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i === -1) continue;
    const k = p.slice(0, i).trim();
    const v = decodeURIComponent(p.slice(i + 1).trim());
    out[k] = v;
  }
  return out;
}

function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  // Si aucun token n'est configuré, on laisse passer (mode local / démo)
  if (!token) return next();

  const cookies = parseCookies(req);
  if (cookies && cookies.rccb_admin === token) return next();

  const provided = (req.query && req.query.token) || req.get('x-admin-token');
  if (provided === token) return next();
  return res.status(401).json({ error: 'Non autorisé' });
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[\n\r",]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Pages admin (protégées)
app.get('/admin', requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/api/admin/login', (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  // Si aucun token n'est configuré, on "log" quand même (dev)
  const { password } = req.body || {};
  if (token && password !== token) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  // Cookie simple (non chiffré). Suffisant pour une protection basique.
  // En prod derrière HTTPS, on met Secure=true automatiquement si possible.
  const secure = (req.headers['x-forwarded-proto'] || '').toString().includes('https');
  const cookie = [
    `rccb_admin=${encodeURIComponent(token || 'dev')}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    // 7 jours
    `Max-Age=${60 * 60 * 24 * 7}`,
    secure ? 'Secure' : ''
  ].filter(Boolean).join('; ');

  res.setHeader('Set-Cookie', cookie);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'rccb_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.json({ ok: true });
});

// Lecture = admin (dashboard). Écriture = public (formulaire)
app.get('/api/inscriptions', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.all('SELECT * FROM inscriptions ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

// Export CSV (admin)
app.get('/api/inscriptions.csv', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.all('SELECT * FROM inscriptions ORDER BY id DESC');
    const headers = [
      'id',
      'created_at',
      'nom',
      'prenom',
      'age',
      'sexe',
  'statut_marital',
      'profession',
      'telephone',
      'email',
      'photo',
      'vicariat',
      'paroisse',
      'commentaires'
    ];

    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inscriptions.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/inscriptions', async (req, res) => {
  try {
    const data = req.body || {};
    const required = ['nom', 'prenom', 'age', 'sexe', 'vicariat', 'paroisse'];
    const missing = required.filter((k) => !data[k]);

    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    const age = Number(data.age);
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      return res.status(400).json({ error: 'Âge invalide' });
    }

    let photo = data.photo || '';
    if (photo && typeof photo === 'string') {
      // Optionnel: vérifier que c'est bien un data URL base64 image
      const isDataUrl = photo.startsWith('data:image/');
      if (!isDataUrl) {
        return res.status(400).json({ error: 'Photo invalide (format)'});
      }
      // limite ~1.2MB en string (approximatif)
      if (photo.length > 1_200_000) {
        return res.status(400).json({ error: 'Photo trop lourde' });
      }
    } else {
      photo = '';
    }

    const payload = {
      nom: String(data.nom).trim(),
      prenom: String(data.prenom).trim(),
      age,
      sexe: String(data.sexe),
  statut_marital: data.statut_marital ? String(data.statut_marital) : '',
      profession: data.profession || '',
      telephone: data.telephone || '',
      email: data.email || '',
      photo,
      vicariat: String(data.vicariat),
      paroisse: String(data.paroisse),
      commentaires: data.commentaires || '',
      created_at: new Date().toISOString()
    };

    const result = await db.run(
  `INSERT INTO inscriptions (nom, prenom, age, sexe, statut_marital, profession, telephone, email, photo, vicariat, paroisse, commentaires, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      payload.nom,
      payload.prenom,
      payload.age,
      payload.sexe,
  payload.statut_marital,
      payload.profession,
      payload.telephone,
      payload.email,
      payload.photo,
      payload.vicariat,
      payload.paroisse,
      payload.commentaires,
      payload.created_at
    );

    res.status(201).json({ id: result.lastID, ...payload });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  db = await open({ filename: dbFile, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      age INTEGER NOT NULL,
      sexe TEXT NOT NULL,
      statut_marital TEXT,
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

  // Migration légère: ajouter la colonne si la table existait déjà
  const columns = await db.all(`PRAGMA table_info(inscriptions)`);
  const hasStatut = columns.some((c) => c && c.name === 'statut_marital');
  if (!hasStatut) {
    await db.exec(`ALTER TABLE inscriptions ADD COLUMN statut_marital TEXT`);
  }

  app.listen(PORT, () => {
    console.log(`RCCB app running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
