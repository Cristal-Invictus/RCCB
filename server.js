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
const FORCE_MEMORY_DB = String(process.env.RCCB_USE_MEMORY_DB || '').toLowerCase();
const USE_MEMORY_DB = FORCE_MEMORY_DB === '1' || FORCE_MEMORY_DB === 'true' || FORCE_MEMORY_DB === 'yes' || !DATABASE_URL;
if (USE_MEMORY_DB) {
  console.warn('[RCCB] DATABASE_URL missing -> using in-memory storage (local dev).');
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

const pool = USE_MEMORY_DB
  ? null
  : new Pool({
      connectionString: DATABASE_URL,
      ssl: shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : false
    });

// In-memory fallback (local dev only)
const mem = {
  seq: 1,
  saveSeq: 1,
  inscriptions: [],
  presenceSaves: []
};

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

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function normalizePersonKey(value) {
  return normalizeSpaces(value).toLowerCase();
}

function isYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function asYmd(value) {
  if (!value) return '';
  const s = String(value);
  if (isYmd(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function isAtLeastAge(birthDate, minAge, referenceDate = new Date()) {
  if (!isYmd(birthDate)) return false;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (birth > ref) return false;
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= minAge;
}

const INSCRIPTION_CSV_HEADERS = [
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
  'raison_presence',
  'canal_information',
  'commentaires'
];

function buildInscriptionsCsv(rows) {
  return [
    INSCRIPTION_CSV_HEADERS.join(','),
    ...rows.map((r) => INSCRIPTION_CSV_HEADERS.map((h) => escapeCsv(r[h])).join(','))
  ].join('\n');
}

function buildInscriptionsExcel(rows) {
  const headerCells = INSCRIPTION_CSV_HEADERS
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join('');
  const bodyRows = rows.map((row) => {
    const cells = INSCRIPTION_CSV_HEADERS
      .map((h) => `<td>${escapeHtml(row[h])}</td>`)
      .join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; mso-number-format:"\\@"; }
    th { background: #f3f4f6; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
}

function sendExcel(res, filename, html) {
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + html);
}

async function fetchInscriptionsRows(presenceDate = '') {
  if (!pool) {
    return presenceDate
      ? mem.inscriptions.filter((r) => asYmd(r.presence_date) === presenceDate).slice().reverse()
      : mem.inscriptions.slice().reverse();
  }

  const q = presenceDate
    ? 'SELECT * FROM inscriptions WHERE presence_date = $1 ORDER BY id DESC'
    : 'SELECT * FROM inscriptions ORDER BY id DESC';
  const params = presenceDate ? [presenceDate] : [];
  const { rows } = await pool.query(q, params);
  return rows;
}

async function findDuplicateInscription({ nom, prenom, date_naissance, presence_date }) {
  if (!pool) {
    return mem.inscriptions.find((row) =>
      normalizePersonKey(row.nom) === normalizePersonKey(nom)
      && normalizePersonKey(row.prenom) === normalizePersonKey(prenom)
      && asYmd(row.date_naissance) === date_naissance
      && asYmd(row.presence_date) === presence_date
    ) || null;
  }

  const { rows } = await pool.query(
    `
      SELECT id
      FROM inscriptions
      WHERE lower(trim(regexp_replace(nom, '[[:space:]]+', ' ', 'g'))) = $1
        AND lower(trim(regexp_replace(prenom, '[[:space:]]+', ' ', 'g'))) = $2
        AND date_naissance = $3
        AND presence_date = $4
      LIMIT 1;
    `,
    [
      normalizePersonKey(nom),
      normalizePersonKey(prenom),
      date_naissance,
      presence_date
    ]
  );
  return rows[0] || null;
}

// Lettres (avec accents), espaces, apostrophe et tiret.
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/;
// Bénin: 01 + 8 chiffres => 10 chiffres au total.
const BJ_PHONE_RE = /^01\d{8}$/;

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
    if (!pool) {
      const presenceDate = (_req.query && String(_req.query.date || '').trim()) || '';
      const rows = presenceDate
        ? mem.inscriptions.filter((r) => r.presence_date === presenceDate).slice().reverse()
        : mem.inscriptions.slice().reverse();
      return res.json(rows);
    }

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
    const rows = await fetchInscriptionsRows(presenceDate);
    sendCsv(res, 'inscriptions.csv', buildInscriptionsCsv(rows));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/inscriptions.xls', requireAdmin, async (_req, res) => {
  try {
    const presenceDate = (_req.query && String(_req.query.date || '').trim()) || '';
    const rows = await fetchInscriptionsRows(presenceDate);
    sendExcel(res, 'inscriptions.xls', buildInscriptionsExcel(rows));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/presence-saves', requireAdmin, async (_req, res) => {
  try {
    if (!pool) {
      const rows = mem.presenceSaves
        .slice()
        .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
        .map(({ rows: _rows, ...save }) => save);
      return res.json(rows);
    }

    const { rows } = await pool.query(`
      SELECT id, presence_date, saved_at, participant_count
      FROM presence_saves
      ORDER BY saved_at DESC, id DESC;
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/presence-saves', requireAdmin, async (req, res) => {
  try {
    const presenceDate = String((req.body && req.body.presence_date) || '').trim();
    if (!isYmd(presenceDate)) {
      return res.status(400).json({ error: 'Date de présence invalide (format attendu: YYYY-MM-DD)' });
    }

    if (!pool) {
      const rows = mem.inscriptions
        .filter((r) => asYmd(r.presence_date) === presenceDate)
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id));
      const save = {
        id: mem.saveSeq++,
        presence_date: presenceDate,
        saved_at: new Date().toISOString(),
        participant_count: rows.length,
        rows
      };
      mem.presenceSaves.push(save);
      const { rows: _rows, ...publicSave } = save;
      return res.status(201).json(publicSave);
    }

    const selected = await pool.query(
      'SELECT * FROM inscriptions WHERE presence_date = $1 ORDER BY id ASC',
      [presenceDate]
    );
    const snapshotRows = selected.rows.map((row) => ({
      ...row,
      presence_date: asYmd(row.presence_date),
      date_naissance: asYmd(row.date_naissance)
    }));
    const savedAt = new Date().toISOString();
    const created = await pool.query(
      `
        INSERT INTO presence_saves (presence_date, saved_at, participant_count, rows)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING id, presence_date, saved_at, participant_count;
      `,
      [presenceDate, savedAt, snapshotRows.length, JSON.stringify(snapshotRows)]
    );
    res.status(201).json(created.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/presence-saves/:id.csv', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Sauvegarde invalide' });
    }

    if (!pool) {
      const save = mem.presenceSaves.find((s) => Number(s.id) === id);
      if (!save) return res.status(404).json({ error: 'Sauvegarde introuvable' });
      return sendCsv(
        res,
        `presences-${save.presence_date}-sauvegarde-${save.id}.csv`,
        buildInscriptionsCsv(save.rows)
      );
    }

    const { rows } = await pool.query(
      'SELECT id, presence_date, rows FROM presence_saves WHERE id = $1',
      [id]
    );
    const save = rows[0];
    if (!save) return res.status(404).json({ error: 'Sauvegarde introuvable' });

    const snapshotRows = Array.isArray(save.rows) ? save.rows : [];
    sendCsv(
      res,
      `presences-${asYmd(save.presence_date)}-sauvegarde-${save.id}.csv`,
      buildInscriptionsCsv(snapshotRows)
    );
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/presence-saves/:id.xls', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Sauvegarde invalide' });
    }

    if (!pool) {
      const save = mem.presenceSaves.find((s) => Number(s.id) === id);
      if (!save) return res.status(404).json({ error: 'Sauvegarde introuvable' });
      return sendExcel(
        res,
        `presences-${save.presence_date}-sauvegarde-${save.id}.xls`,
        buildInscriptionsExcel(save.rows)
      );
    }

    const { rows } = await pool.query(
      'SELECT id, presence_date, rows FROM presence_saves WHERE id = $1',
      [id]
    );
    const save = rows[0];
    if (!save) return res.status(404).json({ error: 'Sauvegarde introuvable' });

    const snapshotRows = Array.isArray(save.rows) ? save.rows : [];
    sendExcel(
      res,
      `presences-${asYmd(save.presence_date)}-sauvegarde-${save.id}.xls`,
      buildInscriptionsExcel(snapshotRows)
    );
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/presence-saves/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Sauvegarde invalide' });
    }

    if (!pool) {
      const save = mem.presenceSaves.find((s) => Number(s.id) === id);
      if (!save) return res.status(404).json({ error: 'Sauvegarde introuvable' });
      return res.json({
        id: save.id,
        presence_date: save.presence_date,
        saved_at: save.saved_at,
        participant_count: save.participant_count,
        rows: Array.isArray(save.rows) ? save.rows : []
      });
    }

    const { rows } = await pool.query(
      'SELECT id, presence_date, saved_at, participant_count, rows FROM presence_saves WHERE id = $1',
      [id]
    );
    const save = rows[0];
    if (!save) return res.status(404).json({ error: 'Sauvegarde introuvable' });

    const snapshotRows = Array.isArray(save.rows) ? save.rows : [];
    res.json({
      id: save.id,
      presence_date: asYmd(save.presence_date),
      saved_at: save.saved_at,
      participant_count: save.participant_count,
      rows: snapshotRows.map((row) => ({
        ...row,
        presence_date: asYmd(row.presence_date),
        date_naissance: asYmd(row.date_naissance)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.post('/api/inscriptions', async (req, res) => {
  try {
    const data = req.body || {};
  const required = ['nom', 'prenom', 'date_naissance', 'sexe', 'situation_relationnelle', 'photo', 'vicariat', 'paroisse', 'presence_date', 'raison_presence', 'canal_information'];
    const missing = required.filter((k) => !data[k]);

    if (missing.length) {
      return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
    }

  const dn = String(data.date_naissance || '').trim();
    if (!isYmd(dn)) {
      return res.status(400).json({ error: 'Date de naissance invalide (format attendu: YYYY-MM-DD)' });
    }
    if (!isAtLeastAge(dn, 13)) {
      return res.status(400).json({ error: 'Date de naissance invalide: le participant doit avoir au moins 13 ans.' });
    }

    const presenceDate = String(data.presence_date || '').trim();
    if (!isYmd(presenceDate)) {
      return res.status(400).json({ error: 'Date de présence invalide (format attendu: YYYY-MM-DD)' });
    }

    const nom = normalizeSpaces(data.nom);
    const prenom = normalizeSpaces(data.prenom);
    if (!nom || !NAME_RE.test(nom)) {
      return res.status(400).json({ error: "Nom invalide (lettres uniquement, espaces, '-' et apostrophe autorisés)." });
    }
    if (!prenom || !NAME_RE.test(prenom)) {
      return res.status(400).json({ error: "Prénom invalide (lettres uniquement, espaces, '-' et apostrophe autorisés)." });
    }

    const telephone = data.telephone ? String(data.telephone).replace(/\s+/g, '') : '';
    if (telephone && !BJ_PHONE_RE.test(telephone)) {
      return res.status(400).json({ error: 'Téléphone invalide (format attendu: 01XXXXXXXX).' });
    }

    const raisonPresence = normalizeSpaces(data.raison_presence);
    const canalInformation = normalizeSpaces(data.canal_information);
    if (!raisonPresence) {
      return res.status(400).json({ error: 'Veuillez répondre à la question: pourquoi as-tu choisi de venir à cette rencontre ?' });
    }
    if (!canalInformation) {
      return res.status(400).json({ error: 'Veuillez indiquer par quel canal tu as été informé de cette rencontre.' });
    }

    let photo = data.photo || '';
    if (photo && typeof photo === 'string') {
      const isDataUrl = photo.startsWith('data:image/');
      if (!isDataUrl) {
        return res.status(400).json({ error: 'Photo invalide (format)'});
      }
      // Accepte une image jusqu'a environ 2Mo avant encodage base64.
      if (photo.length > 3_000_000) {
        return res.status(400).json({ error: 'Photo trop lourde' });
      }
    } else {
      return res.status(400).json({ error: 'Photo obligatoire' });
    }

    const payload = {
  nom,
  prenom,
  date_naissance: dn,
      sexe: String(data.sexe),
  situation_relationnelle: data.situation_relationnelle ? String(data.situation_relationnelle) : '',
      profession: data.profession || '',
  telephone,
      photo,
      vicariat: String(data.vicariat),
      paroisse: String(data.paroisse),
      raison_presence: raisonPresence,
      canal_information: canalInformation,
      commentaires: data.commentaires || '',
  presence_date: presenceDate,
  created_at: new Date().toISOString()
    };

    const duplicate = await findDuplicateInscription(payload);
    if (duplicate) {
      return res.status(409).json({ error: 'Cette personne est déjà inscrite pour cette rencontre.' });
    }

    if (!pool) {
      const row = { id: mem.seq++, ...payload };
      mem.inscriptions.push(row);
      return res.status(201).json(row);
    }

    const q = `
      INSERT INTO inscriptions
  (nom, prenom, date_naissance, sexe, situation_relationnelle, profession, telephone, photo, vicariat, paroisse, raison_presence, canal_information, commentaires, presence_date, created_at)
      VALUES
  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
      payload.raison_presence,
      payload.canal_information,
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
  // Create tables if needed (only when DB configured)
  if (pool) {
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
        raison_presence TEXT,
        canal_information TEXT,
        commentaires TEXT,
        presence_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
    `);
    await pool.query('ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS raison_presence TEXT;');
    await pool.query('ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS canal_information TEXT;');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS presence_saves (
        id BIGSERIAL PRIMARY KEY,
        presence_date DATE NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL,
        participant_count INTEGER NOT NULL DEFAULT 0,
        rows JSONB NOT NULL
      );
    `);
  }

  app.listen(PORT, () => {
    console.log(`RCCB app running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
