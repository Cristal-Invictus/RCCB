const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// DB (Supabase Postgres)
// On attend une variable DATABASE_URL (Supabase fournit ce format).
// Exemple: postgres://USER:PASSWORD@HOST:5432/postgres
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL. Configure it (e.g. Supabase Postgres connection string).');
}

function shouldUseSsl(databaseUrl) {
  const env = (process.env.PGSSL || '').toLowerCase();
  // PGSSL=disable pour forcer sans SSL (utile en local)
  if (env === 'disable' || env === 'false' || env === '0') return false;
  // PGSSL=require pour forcer SSL
  if (env === 'require' || env === 'true' || env === '1') return true;
  // Par défaut: SSL uniquement pour Supabase (évite de casser un Postgres local)
  return /supabase\.com/i.test(databaseUrl || '');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : false
});

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
    const presenceDate = (_req.query && String(_req.query.date || '').trim()) || '';
    const q = presenceDate
      ? 'SELECT * FROM inscriptions WHERE presence_date = $1 ORDER BY id DESC'
      : 'SELECT * FROM inscriptions ORDER BY id DESC';

    const params = presenceDate ? [presenceDate] : [];
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

// Export CSV (admin)
app.get('/api/inscriptions.csv', requireAdmin, async (_req, res) => {
  try {
    const presenceDate = (_req.query && String(_req.query.date || '').trim()) || '';
    const q = presenceDate
      ? 'SELECT * FROM inscriptions WHERE presence_date = $1 ORDER BY id DESC'
      : 'SELECT * FROM inscriptions ORDER BY id DESC';
    const params = presenceDate ? [presenceDate] : [];

    const result = await pool.query(q, params);
    const rows = result.rows;
    const headers = [
      'id',
      'presence_date',
      'created_at',
      'nom',
      'prenom',
      'date_naissance',
      'sexe',
      'situation_relationnelle',
      'profession',
      'telephone',
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
  const required = ['nom', 'prenom', 'date_naissance', 'sexe', 'vicariat', 'paroisse', 'presence_date'];
    const missing = required.filter((k) => !data[k]);

    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

    const dn = String(data.date_naissance || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dn)) {
      return res.status(400).json({ error: 'Date de naissance invalide (format attendu: YYYY-MM-DD)' });
    }

    const presenceDate = String(data.presence_date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(presenceDate)) {
      return res.status(400).json({ error: 'Date de présence invalide (format attendu: YYYY-MM-DD)' });
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
  date_naissance: dn,
      sexe: String(data.sexe),
  situation_relationnelle: data.situation_relationnelle ? String(data.situation_relationnelle) : '',
      profession: data.profession || '',
      telephone: data.telephone || '',
      photo,
      vicariat: String(data.vicariat),
      paroisse: String(data.paroisse),
      commentaires: data.commentaires || '',
  presence_date: presenceDate,
      created_at: new Date().toISOString()
    };

    const q = `
      INSERT INTO inscriptions
  (nom, prenom, date_naissance, sexe, situation_relationnelle, profession, telephone, photo, vicariat, paroisse, commentaires, presence_date, created_at)
      VALUES
  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id;
    `;

    const r = await pool.query(q, [
      payload.nom,
      payload.prenom,
  payload.date_naissance,
      payload.sexe,
  payload.situation_relationnelle,
      payload.profession,
      payload.telephone,
      payload.photo,
      payload.vicariat,
      payload.paroisse,
      payload.commentaires,
  payload.presence_date,
  payload.created_at
    ]);

    res.status(201).json({ id: r.rows?.[0]?.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  // Create tables if needed
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inscriptions (
      id BIGSERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
  date_naissance DATE NOT NULL,
      sexe TEXT NOT NULL,
  situation_relationnelle TEXT,
      profession TEXT,
      telephone TEXT,
      photo TEXT,
      vicariat TEXT NOT NULL,
      paroisse TEXT NOT NULL,
      commentaires TEXT,
  presence_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  app.listen(PORT, () => {
    console.log(`RCCB app running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
