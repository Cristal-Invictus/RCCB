const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const ExcelJS = require('exceljs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// DB (Supabase Postgres)
// On attend une variable DATABASE_URL (Supabase fournit ce format).
// Exemple: postgres://USER:PASSWORD@HOST:5432/postgres
const DATABASE_URL = process.env.DATABASE_URL;
const FORCE_MEMORY_DB = String(process.env.RCCB_USE_MEMORY_DB || '').toLowerCase();
const MEMORY_DB_FORCED = FORCE_MEMORY_DB === '1' || FORCE_MEMORY_DB === 'true' || FORCE_MEMORY_DB === 'yes';
const PRODUCTION_RUNTIME = process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.RENDER;
const STORAGE_WARNING = !DATABASE_URL && PRODUCTION_RUNTIME && !MEMORY_DB_FORCED
  ? 'DATABASE_URL manquant: le site utilise seulement la sauvegarde locale de secours.'
  : '';
const USE_MEMORY_DB = MEMORY_DB_FORCED || !DATABASE_URL;
const DB_TIMEOUT_MS = Math.max(500, Number(process.env.RCCB_DB_TIMEOUT_MS || 3500));
const DB_RETRY_MS = Math.max(1000, Number(process.env.RCCB_DB_RETRY_MS || 30000));
const BACKUP_FILE = process.env.RCCB_BACKUP_FILE
  || (process.env.VERCEL
    ? path.join('/tmp', 'rccb-backup.json')
    : path.join(__dirname, 'data', 'rccb-backup.json'));
const BACKUP_IS_TMP = BACKUP_FILE.startsWith('/tmp/') || BACKUP_FILE === '/tmp';
if (STORAGE_WARNING) {
  console.warn(`[RCCB] ${STORAGE_WARNING}`);
} else if (USE_MEMORY_DB) {
  console.warn('[RCCB] DATABASE_URL missing -> using local backup storage.');
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

let dbUnavailableUntil = 0;
let backupQueue = Promise.resolve();
let lastBackupSyncAttempt = 0;
let backupSyncPromise = null;

app.use(express.json({ limit: '6mb' }));

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

function requireConfiguredStorage(_req, _res, next) {
  next();
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[\n\r",]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
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

function canTryDb() {
  return Boolean(pool) && Date.now() >= dbUnavailableUntil;
}

function markDbUnavailable(err) {
  dbUnavailableUntil = Date.now() + DB_RETRY_MS;
  console.warn(`[RCCB] Postgres indisponible, bascule secours ${Math.round(DB_RETRY_MS / 1000)}s: ${String(err && err.message ? err.message : err)}`);
}

async function dbQuery(query, params = []) {
  if (!canTryDb()) {
    throw new Error('Postgres temporairement indisponible');
  }

  let timer = null;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Postgres timeout après ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS);
    });
    return await Promise.race([pool.query(query, params), timeout]);
  } catch (err) {
    markDbUnavailable(err);
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function emptyBackupData() {
  return {
    seq: 1,
    saveSeq: 1,
    inscriptions: [],
    presenceSaves: []
  };
}

function normalizeBackupData(data) {
  const out = data && typeof data === 'object' ? data : emptyBackupData();
  out.seq = Number.isInteger(Number(out.seq)) && Number(out.seq) > 0 ? Number(out.seq) : 1;
  out.saveSeq = Number.isInteger(Number(out.saveSeq)) && Number(out.saveSeq) > 0 ? Number(out.saveSeq) : 1;
  out.inscriptions = Array.isArray(out.inscriptions) ? out.inscriptions : [];
  out.presenceSaves = Array.isArray(out.presenceSaves) ? out.presenceSaves : [];

  for (const row of out.inscriptions) {
    if (Number.isInteger(Number(row.id)) && Number(row.id) >= out.seq) out.seq = Number(row.id) + 1;
  }
  for (const save of out.presenceSaves) {
    if (Number.isInteger(Number(save.id)) && Number(save.id) >= out.saveSeq) out.saveSeq = Number(save.id) + 1;
  }
  return out;
}

async function readBackupData() {
  try {
    const raw = await fs.promises.readFile(BACKUP_FILE, 'utf8');
    return normalizeBackupData(JSON.parse(raw));
  } catch (err) {
    if (err && err.code === 'ENOENT') return emptyBackupData();
    console.warn(`[RCCB] Lecture sauvegarde secours impossible: ${String(err && err.message ? err.message : err)}`);
    return emptyBackupData();
  }
}

async function writeBackupData(data) {
  const normalized = normalizeBackupData(data);
  await fs.promises.mkdir(path.dirname(BACKUP_FILE), { recursive: true });
  const tmpFile = `${BACKUP_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmpFile, JSON.stringify(normalized, null, 2), 'utf8');
  await fs.promises.rename(tmpFile, BACKUP_FILE);
}

function updateBackup(mutator) {
  const run = backupQueue.then(async () => {
    const data = await readBackupData();
    const result = await mutator(data);
    await writeBackupData(data);
    return result;
  });
  backupQueue = run.catch(() => {});
  return run;
}

function sameInscription(a, b) {
  return normalizePersonKey(a.nom) === normalizePersonKey(b.nom)
    && normalizePersonKey(a.prenom) === normalizePersonKey(b.prenom)
    && asYmd(a.date_naissance) === asYmd(b.date_naissance)
    && asYmd(a.presence_date) === asYmd(b.presence_date);
}

function publicBackupRow(row) {
  const { _pending_db: _pendingDb, ...publicRow } = row;
  return publicRow;
}

async function fetchBackupInscriptionsRows(presenceDate = '') {
  const data = await readBackupData();
  const rows = presenceDate
    ? data.inscriptions.filter((r) => asYmd(r.presence_date) === presenceDate)
    : data.inscriptions;
  return rows.slice().reverse().map(publicBackupRow);
}

async function findBackupDuplicateInscription(payload) {
  const data = await readBackupData();
  return data.inscriptions.find((row) => sameInscription(row, payload)) || null;
}

async function upsertBackupInscription(row, pendingDb = false) {
  return updateBackup((data) => {
    const existingIndex = data.inscriptions.findIndex((item) => sameInscription(item, row));
    const saved = {
      ...row,
      id: row.id || data.seq++,
      presence_date: asYmd(row.presence_date),
      date_naissance: asYmd(row.date_naissance),
      _pending_db: Boolean(pendingDb)
    };
    if (existingIndex >= 0) {
      saved.id = data.inscriptions[existingIndex].id;
      saved._pending_db = Boolean(pendingDb || data.inscriptions[existingIndex]._pending_db);
      data.inscriptions[existingIndex] = saved;
    } else {
      data.inscriptions.push(saved);
    }
    return publicBackupRow(saved);
  });
}

async function replaceBackupInscriptionsSnapshot(rows) {
  return updateBackup((data) => {
    for (const row of rows) {
      const existingIndex = data.inscriptions.findIndex((item) => sameInscription(item, row));
      const saved = {
        ...row,
        presence_date: asYmd(row.presence_date),
        date_naissance: asYmd(row.date_naissance),
        _pending_db: existingIndex >= 0 ? Boolean(data.inscriptions[existingIndex]._pending_db) : false
      };
      if (existingIndex >= 0) {
        data.inscriptions[existingIndex] = { ...data.inscriptions[existingIndex], ...saved };
      } else {
        data.inscriptions.push({ ...saved, id: saved.id || data.seq++ });
      }
    }
  });
}

async function listBackupPresenceSaves() {
  const data = await readBackupData();
  return data.presenceSaves
    .slice()
    .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at) || Number(b.id) - Number(a.id))
    .map(({ rows: _rows, _pending_db: _pendingDb, ...save }) => save);
}

async function getBackupPresenceSave(id) {
  const data = await readBackupData();
  const save = data.presenceSaves.find((s) => Number(s.id) === Number(id));
  if (!save) return null;
  const { _pending_db: _pendingDb, ...publicSave } = save;
  return {
    ...publicSave,
    presence_date: asYmd(save.presence_date),
    rows: Array.isArray(save.rows) ? save.rows.map(publicBackupRow) : []
  };
}

async function createBackupPresenceSave(presenceDate, rows, pendingDb = false, seed = {}) {
  return updateBackup((data) => {
    const save = {
      id: seed.id || data.saveSeq++,
      presence_date: presenceDate,
      saved_at: seed.saved_at || new Date().toISOString(),
      participant_count: rows.length,
      rows: rows.map(publicBackupRow),
      _pending_db: Boolean(pendingDb)
    };
    data.presenceSaves.push(save);
    const { rows: _rows, _pending_db: _pendingDb, ...publicSave } = save;
    return publicSave;
  });
}

async function upsertBackupPresenceSave(save, rows, pendingDb = false) {
  return updateBackup((data) => {
    const existingIndex = data.presenceSaves.findIndex((item) =>
      asYmd(item.presence_date) === asYmd(save.presence_date) && String(item.saved_at) === String(save.saved_at)
    );
    const saved = {
      id: save.id || data.saveSeq++,
      presence_date: asYmd(save.presence_date),
      saved_at: save.saved_at || new Date().toISOString(),
      participant_count: Number(save.participant_count ?? rows.length),
      rows: Array.isArray(rows) ? rows.map(publicBackupRow) : [],
      _pending_db: Boolean(pendingDb)
    };
    if (existingIndex >= 0) {
      saved.id = data.presenceSaves[existingIndex].id;
      saved._pending_db = Boolean(pendingDb || data.presenceSaves[existingIndex]._pending_db);
      data.presenceSaves[existingIndex] = saved;
    } else {
      data.presenceSaves.push(saved);
    }
    const { rows: _rows, _pending_db: _pendingDb, ...publicSave } = saved;
    return publicSave;
  });
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

const EXCEL_COLUMN_WIDTHS = {
  id: 8,
  presence_date: 14,
  created_at: 22,
  nom: 18,
  prenom: 20,
  date_naissance: 16,
  sexe: 12,
  situation_relationnelle: 22,
  profession: 22,
  telephone: 16,
  photo: 14,
  vicariat: 34,
  paroisse: 34,
  raison_presence: 36,
  canal_information: 26,
  commentaires: 28
};

function excelCellValue(row, key) {
  if (key === 'presence_date' || key === 'date_naissance') return asYmd(row[key]);
  if (key === 'created_at') {
    const value = row[key];
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
  }
  if (key === 'photo') return row.photo ? 'Photo intégrée' : '';
  return row[key] === null || row[key] === undefined ? '' : String(row[key]);
}

function parseDataUrlImage(value) {
  const match = /^data:image\/(png|jpe?g);base64,([a-z0-9+/=\r\n]+)$/i.exec(String(value || ''));
  if (!match) return null;

  const extension = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!buffer.length) return null;
  return { buffer, extension };
}

async function buildInscriptionsXlsxBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RCCB';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Inscriptions', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  worksheet.columns = INSCRIPTION_CSV_HEADERS.map((header) => ({
    header,
    key: header,
    width: EXCEL_COLUMN_WIDTHS[header] || 18,
    style: {
      alignment: { vertical: 'middle', wrapText: true }
    }
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8F000D' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const photoColumn = INSCRIPTION_CSV_HEADERS.indexOf('photo') + 1;

  rows.forEach((row) => {
    const values = {};
    INSCRIPTION_CSV_HEADERS.forEach((header) => {
      values[header] = excelCellValue(row, header);
    });

    const excelRow = worksheet.addRow(values);
    excelRow.height = row.photo ? 58 : 24;

    const image = parseDataUrlImage(row.photo);
    if (image) {
      const imageId = workbook.addImage(image);
      worksheet.addImage(imageId, {
        tl: { col: photoColumn - 1 + 0.15, row: excelRow.number - 1 + 0.15 },
        ext: { width: 58, height: 58 },
        editAs: 'oneCell'
      });
      excelRow.getCell(photoColumn).value = '';
    } else if (row.photo) {
      excelRow.getCell(photoColumn).value = 'Photo non intégrée';
    }
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: INSCRIPTION_CSV_HEADERS.length }
  };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv);
}

function sendXlsx(res, filename, buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

async function fetchInscriptionsRows(presenceDate = '') {
  if (!canTryDb()) {
    return fetchBackupInscriptionsRows(presenceDate);
  }

  const q = presenceDate
    ? 'SELECT * FROM inscriptions WHERE presence_date = $1 ORDER BY id DESC'
    : 'SELECT * FROM inscriptions ORDER BY id DESC';
  const params = presenceDate ? [presenceDate] : [];
  try {
    const { rows } = await dbQuery(q, params);
    await replaceBackupInscriptionsSnapshot(rows);
    return rows;
  } catch {
    return fetchBackupInscriptionsRows(presenceDate);
  }
}

async function findDuplicateInDb({ nom, prenom, date_naissance, presence_date }) {
  const { rows } = await dbQuery(
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

async function findDuplicateInscription(payload) {
  const backupDuplicate = await findBackupDuplicateInscription(payload);
  if (backupDuplicate) return backupDuplicate;

  if (!canTryDb()) {
    return null;
  }

  try {
    return await findDuplicateInDb(payload);
  } catch {
    return findBackupDuplicateInscription(payload);
  }
}

async function insertInscriptionIntoDb(payload) {
  const q = `
    INSERT INTO inscriptions
    (nom, prenom, date_naissance, sexe, situation_relationnelle, profession, telephone, photo, vicariat, paroisse, raison_presence, canal_information, commentaires, presence_date, created_at)
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING id;
  `;

  const r = await dbQuery(q, [
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

  return { id: r.rows?.[0]?.id, ...payload };
}

async function syncBackupToDb() {
  if (!canTryDb()) return;
  if (Date.now() - lastBackupSyncAttempt < DB_RETRY_MS) return;
  if (backupSyncPromise) return backupSyncPromise;

  lastBackupSyncAttempt = Date.now();
  backupSyncPromise = (async () => {
    const data = await readBackupData();
    let changed = false;

    for (const row of data.inscriptions.filter((item) => item._pending_db)) {
      const duplicate = await findDuplicateInDb(row);
      if (duplicate) {
        row.id = duplicate.id || row.id;
        row._pending_db = false;
        changed = true;
        continue;
      }
      const inserted = await insertInscriptionIntoDb(publicBackupRow(row));
      row.id = inserted.id || row.id;
      row._pending_db = false;
      changed = true;
    }

    for (const save of data.presenceSaves.filter((item) => item._pending_db)) {
      const existing = await dbQuery(
        'SELECT id FROM presence_saves WHERE presence_date = $1 AND saved_at = $2 LIMIT 1',
        [asYmd(save.presence_date), save.saved_at]
      );
      if (!existing.rows.length) {
        const created = await dbQuery(
          `
            INSERT INTO presence_saves (presence_date, saved_at, participant_count, rows)
            VALUES ($1, $2, $3, $4::jsonb)
            RETURNING id;
          `,
          [
            asYmd(save.presence_date),
            save.saved_at,
            Number(save.participant_count || 0),
            JSON.stringify(Array.isArray(save.rows) ? save.rows.map(publicBackupRow) : [])
          ]
        );
        save.id = created.rows?.[0]?.id || save.id;
      } else {
        save.id = existing.rows[0].id || save.id;
      }
      save._pending_db = false;
      changed = true;
    }

    if (changed) await writeBackupData(data);
  })().catch((err) => {
    markDbUnavailable(err);
  }).finally(() => {
    backupSyncPromise = null;
  });

  return backupSyncPromise;
}

// Lettres (avec accents), espaces, apostrophe et tiret.
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/;
// Bénin: 01 + 8 chiffres => 10 chiffres au total.
const BJ_PHONE_RE = /^01\d{8}$/;

// Pages admin (protégées)
app.get('/admin', requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin-login.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/api/health', (_req, res) => {
  const dbCoolingDown = Boolean(pool && Date.now() < dbUnavailableUntil);
  res.status(200).json({
    ok: true,
    storage: pool && !dbCoolingDown ? 'postgres+backup' : 'backup',
    databaseConfigured: Boolean(DATABASE_URL),
    backupFile: BACKUP_FILE,
    backupDurable: !BACKUP_IS_TMP,
    productionRuntime: Boolean(PRODUCTION_RUNTIME),
    warning: STORAGE_WARNING || (BACKUP_IS_TMP ? 'La sauvegarde est dans /tmp: elle sert au secours temporaire mais pas a la persistance longue duree.' : undefined),
    dbUnavailableUntil: dbCoolingDown ? new Date(dbUnavailableUntil).toISOString() : undefined
  });
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

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', requireConfiguredStorage);
app.use('/api', async (_req, res, next) => {
  try {
    await ensureSchema();
    await syncBackupToDb();
    next();
  } catch (err) {
    console.warn(`[RCCB] Base principale indisponible, API en mode secours: ${String(err && err.message ? err.message : err)}`);
    next();
  }
});

// Lecture = admin (dashboard). Écriture = public (formulaire)
app.get('/api/inscriptions', requireAdmin, async (_req, res) => {
  try {
    const presenceDate = (_req.query && String(_req.query.date || '').trim()) || '';
    const rows = await fetchInscriptionsRows(presenceDate);
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

app.get(['/api/inscriptions.xlsx', '/api/inscriptions.xls'], requireAdmin, async (_req, res) => {
  try {
    const presenceDate = (_req.query && String(_req.query.date || '').trim()) || '';
    const rows = await fetchInscriptionsRows(presenceDate);
    const buffer = await buildInscriptionsXlsxBuffer(rows);
    sendXlsx(res, 'inscriptions.xlsx', buffer);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('/api/presence-saves', requireAdmin, async (_req, res) => {
  try {
    if (!canTryDb()) {
      return res.json(await listBackupPresenceSaves());
    }

    try {
      const { rows } = await dbQuery(`
        SELECT id, presence_date, saved_at, participant_count
        FROM presence_saves
        ORDER BY saved_at DESC, id DESC;
      `);
      res.json(rows);
    } catch {
      res.json(await listBackupPresenceSaves());
    }
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

    try {
      if (!canTryDb()) throw new Error('Postgres temporairement indisponible');
      const selected = await dbQuery(
        'SELECT * FROM inscriptions WHERE presence_date = $1 ORDER BY id ASC',
        [presenceDate]
      );
      const snapshotRows = selected.rows.map((row) => ({
        ...row,
        presence_date: asYmd(row.presence_date),
        date_naissance: asYmd(row.date_naissance)
      }));
      const savedAt = new Date().toISOString();
      const created = await dbQuery(
        `
          INSERT INTO presence_saves (presence_date, saved_at, participant_count, rows)
          VALUES ($1, $2, $3, $4::jsonb)
          RETURNING id, presence_date, saved_at, participant_count;
        `,
        [presenceDate, savedAt, snapshotRows.length, JSON.stringify(snapshotRows)]
      );
      await upsertBackupPresenceSave(created.rows[0], snapshotRows, false);
      return res.status(201).json(created.rows[0]);
    } catch {
      const snapshotRows = (await fetchBackupInscriptionsRows(presenceDate))
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id));
      const save = await createBackupPresenceSave(presenceDate, snapshotRows, true);
      return res.status(201).json(save);
    }
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

    let save = null;
    if (canTryDb()) {
      try {
        const { rows } = await dbQuery(
          'SELECT id, presence_date, saved_at, participant_count, rows FROM presence_saves WHERE id = $1',
          [id]
        );
        save = rows[0] || null;
        if (save) await upsertBackupPresenceSave(save, Array.isArray(save.rows) ? save.rows : [], false);
      } catch {
        save = null;
      }
    }
    if (!save) save = await getBackupPresenceSave(id);
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

app.get(['/api/presence-saves/:id.xlsx', '/api/presence-saves/:id.xls'], requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Sauvegarde invalide' });
    }

    let save = null;
    if (canTryDb()) {
      try {
        const { rows } = await dbQuery(
          'SELECT id, presence_date, saved_at, participant_count, rows FROM presence_saves WHERE id = $1',
          [id]
        );
        save = rows[0] || null;
        if (save) await upsertBackupPresenceSave(save, Array.isArray(save.rows) ? save.rows : [], false);
      } catch {
        save = null;
      }
    }
    if (!save) save = await getBackupPresenceSave(id);
    if (!save) return res.status(404).json({ error: 'Sauvegarde introuvable' });

    const snapshotRows = Array.isArray(save.rows) ? save.rows : [];
    const buffer = await buildInscriptionsXlsxBuffer(snapshotRows);
    sendXlsx(
      res,
      `presences-${asYmd(save.presence_date)}-sauvegarde-${save.id}.xlsx`,
      buffer
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

    let save = null;
    if (canTryDb()) {
      try {
        const { rows } = await dbQuery(
          'SELECT id, presence_date, saved_at, participant_count, rows FROM presence_saves WHERE id = $1',
          [id]
        );
        save = rows[0] || null;
        if (save) await upsertBackupPresenceSave(save, Array.isArray(save.rows) ? save.rows : [], false);
      } catch {
        save = null;
      }
    }
    if (!save) save = await getBackupPresenceSave(id);
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

    if (!canTryDb()) {
      const row = await upsertBackupInscription(payload, true);
      return res.status(201).json(row);
    }

    try {
      const row = await insertInscriptionIntoDb(payload);
      await upsertBackupInscription(row, false);
      return res.status(201).json(row);
    } catch {
      const row = await upsertBackupInscription(payload, true);
      return res.status(201).json(row);
    }
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: String(err && err.message ? err.message : err) });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let schemaPromise = null;

async function ensureSchema() {
  if (!pool) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await dbQuery(`
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
      await dbQuery('ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS raison_presence TEXT;');
      await dbQuery('ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS canal_information TEXT;');
      await dbQuery(`
      CREATE TABLE IF NOT EXISTS presence_saves (
        id BIGSERIAL PRIMARY KEY,
        presence_date DATE NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL,
        participant_count INTEGER NOT NULL DEFAULT 0,
        rows JSONB NOT NULL
      );
    `);
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  await schemaPromise;
}

async function start() {
  try {
    await ensureSchema();
    await syncBackupToDb();
  } catch (err) {
    console.warn(`[RCCB] Demarrage en mode secours: ${String(err && err.message ? err.message : err)}`);
  }
  app.listen(PORT, () => {
    console.log(`RCCB app running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { app, start, ensureSchema };
