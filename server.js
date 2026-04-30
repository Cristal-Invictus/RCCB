const path = require('path');
const express = require('express');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';
const ADMIN_SESSION = process.env.ADMIN_SESSION || crypto.createHash('sha256').update(ADMIN_TOKEN).digest('hex');
const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let db;
if (!useSupabase) {
  db = new Database(path.join(__dirname, 'data', 'rccb.db'));
  db.exec(`CREATE TABLE IF NOT EXISTS inscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, presence_date TEXT, nom TEXT NOT NULL, prenom TEXT NOT NULL, date_naissance TEXT, age INTEGER, sexe TEXT NOT NULL, situation_relationnelle TEXT, profession TEXT, telephone TEXT, photo TEXT, vicariat TEXT NOT NULL, paroisse TEXT NOT NULL, commentaires TEXT, created_at TEXT NOT NULL);`);
  const existingColumns = db.prepare('PRAGMA table_info(inscriptions)').all().map((c) => c.name);
  const neededColumns = { presence_date: 'TEXT', date_naissance: 'TEXT', situation_relationnelle: 'TEXT' };
  for (const [name, type] of Object.entries(neededColumns)) if (!existingColumns.includes(name)) db.exec(`ALTER TABLE inscriptions ADD COLUMN ${name} ${type};`);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function asText(v) { if (v === null || v === undefined) return ''; return typeof v === 'string' ? v.trim() : String(v); }
function computeAgeFromDate(dateStr) { const d = new Date(dateStr); if (Number.isNaN(d.getTime())) return null; const now = new Date(); let age = now.getFullYear() - d.getFullYear(); const m = now.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--; return age >= 0 ? age : null; }
function getCookie(req, name) { const raw = req.headers.cookie || ''; const pairs = raw.split(';').map((x) => x.trim().split('=')); const f = pairs.find(([k]) => k === name); return f ? decodeURIComponent(f[1] || '') : ''; }
function requireAdmin(req, res, next) { return getCookie(req, 'rccb_admin') === ADMIN_SESSION ? next() : res.status(401).json({ error: 'Non autorisé' }); }

async function supabaseRequest(endpoint, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${base}/rest/v1/${endpoint}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(options.headers || {}) } });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, storage: useSupabase ? 'supabase' : 'sqlite' }));
app.post('/api/admin/login', (req, res) => {
  if (asText(req.body?.password) !== ADMIN_TOKEN) return res.status(401).json({ error: 'Mot de passe invalide' });
  res.setHeader('Set-Cookie', `rccb_admin=${encodeURIComponent(ADMIN_SESSION)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  return res.json({ ok: true });
});
app.post('/api/admin/logout', (_req, res) => { res.setHeader('Set-Cookie', 'rccb_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'); return res.json({ ok: true }); });

app.get('/api/inscriptions', requireAdmin, async (req, res) => {
  try {
    const date = asText(req.query.date);
    if (useSupabase) return res.json(await supabaseRequest(`inscriptions?select=*&order=created_at.desc${date ? `&presence_date=eq.${encodeURIComponent(date)}` : ''}`));
    return res.json(date ? db.prepare('SELECT * FROM inscriptions WHERE presence_date = ? ORDER BY id DESC').all(date) : db.prepare('SELECT * FROM inscriptions ORDER BY id DESC').all());
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

app.get('/api/inscriptions.csv', requireAdmin, async (req, res) => {
  const date = asText(req.query.date);
  const rows = useSupabase ? await supabaseRequest(`inscriptions?select=*&order=created_at.desc${date ? `&presence_date=eq.${encodeURIComponent(date)}` : ''}`) : (date ? db.prepare('SELECT * FROM inscriptions WHERE presence_date = ? ORDER BY id DESC').all(date) : db.prepare('SELECT * FROM inscriptions ORDER BY id DESC').all());
  const header = ['presence_date','nom','prenom','date_naissance','sexe','situation_relationnelle','profession','telephone','vicariat','paroisse','commentaires'];
  const csv = [header.join(',')].concat(rows.map((r) => header.map((k) => `"${String(r[k] || '').replaceAll('"', '""')}"`).join(','))).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(csv);
});

app.post('/api/inscriptions', async (req, res) => {
  const data = req.body || {};
  const required = ['presence_date', 'nom', 'prenom', 'date_naissance', 'sexe', 'situation_relationnelle', 'vicariat', 'paroisse'];
  const missing = required.filter((k) => !data[k]);
  if (missing.length) return res.status(400).json({ error: `Champs obligatoires manquants: ${missing.join(', ')}` });
  const age = computeAgeFromDate(data.date_naissance || data.dateNaissance);
  if (!Number.isFinite(age) || age < 1 || age > 120) return res.status(400).json({ error: 'Date de naissance invalide.' });
  const payload = { presence_date: asText(data.presence_date), nom: asText(data.nom), prenom: asText(data.prenom), date_naissance: asText(data.date_naissance || data.dateNaissance), age, sexe: asText(data.sexe), situation_relationnelle: asText(data.situation_relationnelle), profession: asText(data.profession), telephone: asText(data.telephone), photo: asText(data.photo), vicariat: asText(data.vicariat), paroisse: asText(data.paroisse), commentaires: asText(data.commentaires), created_at: new Date().toISOString() };
  try {
    if (useSupabase) return res.status(201).json((await supabaseRequest('inscriptions', { method: 'POST', body: JSON.stringify([payload]) }))[0]);
    const info = db.prepare('INSERT INTO inscriptions (presence_date, nom, prenom, date_naissance, age, sexe, situation_relationnelle, profession, telephone, photo, vicariat, paroisse, commentaires, created_at) VALUES (@presence_date, @nom, @prenom, @date_naissance, @age, @sexe, @situation_relationnelle, @profession, @telephone, @photo, @vicariat, @paroisse, @commentaires, @created_at)').run(payload);
    return res.status(201).json({ id: info.lastInsertRowid, ...payload });
  } catch (error) { return res.status(500).json({ error: error.message }); }
});

app.get('/admin/login', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/admin', (req, res) => (getCookie(req, 'rccb_admin') === ADMIN_SESSION ? res.sendFile(path.join(__dirname, 'public', 'admin.html')) : res.redirect('/admin/login')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`RCCB app running on http://localhost:${PORT} (${useSupabase ? 'supabase' : 'sqlite'})`));
