const stats = document.getElementById('stats');
const rows = document.getElementById('rows');
const searchInput = document.getElementById('search');
const searchMobileInput = document.getElementById('searchMobile');
const adminHint = document.getElementById('adminHint');
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');
const details = document.getElementById('details');
const presenceDateInput = document.getElementById('presenceDate');
const downloadCsv = document.getElementById('downloadCsv');
const downloadExcel = document.getElementById('downloadExcel');
const tableSummary = document.getElementById('tableSummary');
const savePresenceBtn = document.getElementById('savePresenceBtn');
const savePresenceStatus = document.getElementById('savePresenceStatus');
const presenceSavesRows = document.getElementById('presenceSavesRows');
const presenceSavesEmpty = document.getElementById('presenceSavesEmpty');
const adminMeetingDateLabel = document.getElementById('adminMeetingDateLabel');

let inscriptions = [];
let presenceSaves = [];
let savePresenceStatusTimer = null;

function asYmd(value) {
  if (!value) return '';
  // Supabase/pg peut renvoyer DATE comme string 'YYYY-MM-DD' ou en ISO.
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatYmdFr(value) {
  const ymd = asYmd(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatDateTimeFr(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function firstSundayOfMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (7 - d.getDay()) % 7;
  d.setDate(1 + offset);
  return d;
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMeetingDateFr(value) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return formatYmdFr(value);
  const formatted = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  return formatted.replace(/\b([a-zà-ÿ])/g, (letter) => letter.toUpperCase());
}

function syncAdminMeetingDate() {
  const value = presenceDateInput?.value || '';
  if (adminMeetingDateLabel) {
    adminMeetingDateLabel.textContent = value ? formatMeetingDateFr(value) : '--/--/----';
  }
}

function initAdminMeetingDate() {
  if (!presenceDateInput) return;
  if (!presenceDateInput.value) {
    presenceDateInput.value = toYmd(firstSundayOfMonth());
  }
  syncAdminMeetingDate();
}

function setSavePresenceStatus(message, tone = 'info') {
  if (!savePresenceStatus) return;
  if (savePresenceStatusTimer) clearTimeout(savePresenceStatusTimer);
  const colors = {
    info: 'text-slate-500',
    success: 'text-green-700',
    error: 'text-red-700'
  };
  savePresenceStatus.className = `text-xs font-medium transition-opacity duration-300 ${colors[tone] || colors.info}`;
  savePresenceStatus.textContent = message || '';
  if (message) {
    savePresenceStatusTimer = setTimeout(() => {
      savePresenceStatus.textContent = '';
    }, 5000);
  }
}

function setPresenceSavesEmpty(message, icon = 'cloud_off') {
  if (!presenceSavesEmpty) return;
  const safeIcon = escapeHtml(icon);
  const safeMessage = escapeHtml(message);
  presenceSavesEmpty.innerHTML = `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
        <span class="material-symbols-outlined text-3xl text-slate-300">${safeIcon}</span>
      </div>
      <p class="text-slate-500 font-medium tracking-tight">${safeMessage}</p>
    </div>`;
  presenceSavesEmpty.classList.remove('hidden');
}

function renderPresenceSaves(list) {
  if (!presenceSavesRows) return;
  if (!list.length) {
    presenceSavesRows.innerHTML = '';
    setPresenceSavesEmpty('Aucune sauvegarde disponible', 'folder_off');
    return;
  }

  if (presenceSavesEmpty) presenceSavesEmpty.classList.add('hidden');
  presenceSavesRows.innerHTML = list.map((save) => {
    const safeMeetingLabel = escapeHtml(`Réunion du ${formatYmdFr(save.presence_date)}`);
    const count = Number(save.participant_count || 0);
    const safeCountLabel = escapeHtml(`${count} participant${count > 1 ? 's' : ''}`);
    const safeSavedAt = escapeHtml(formatDateTimeFr(save.saved_at));
    const safeDownloadUrl = escapeHtml(`/api/presence-saves/${encodeURIComponent(save.id)}.csv`);
    const safeExcelUrl = escapeHtml(`/api/presence-saves/${encodeURIComponent(save.id)}.xls`);

    return `
      <tr class="hover:bg-orange-50/30 transition-colors border-b border-slate-100 last:border-0">
        <td class="px-6 py-4 font-semibold text-slate-900">
          ${safeMeetingLabel}
        </td>
        <td class="px-6 py-4">
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            ${safeCountLabel}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-slate-500">
          ${safeSavedAt}
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex flex-col sm:flex-row justify-end gap-3">
          <a href="${safeDownloadUrl}" class="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-red-700 transition-colors" download>
            <span class="material-symbols-outlined text-lg">cloud_download</span>
            CSV
          </a>
          <a href="${safeExcelUrl}" class="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors" download>
            <span class="material-symbols-outlined text-lg">table_view</span>
            Excel
          </a>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function fetchPresenceSaves() {
  try {
    setPresenceSavesEmpty('Chargement des sauvegardes...', 'cloud_sync');
    const r = await fetch('/api/presence-saves');
    if (r.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt || `HTTP ${r.status}`);
    }
    presenceSaves = await r.json();
    renderPresenceSaves(presenceSaves);
  } catch (err) {
    presenceSaves = [];
    if (presenceSavesRows) presenceSavesRows.innerHTML = '';
    setPresenceSavesEmpty('Impossible de charger les sauvegardes', 'error');
  }
}

function showDetails(x) {
  if (!details) return;
  if (!x) {
    details.classList.add('hidden');
    details.innerHTML = '';
    return;
  }

  const photo = x.photo
    ? `<img class="w-full max-w-[180px] aspect-square rounded-xl object-cover border-4 border-white shadow-sm" src="${escapeHtml(x.photo)}" alt="photo" />`
    : '<div class="w-full max-w-[180px] aspect-square rounded-xl bg-white border border-surface-container-highest flex items-center justify-center text-outline text-sm">Aucune photo</div>';
  details.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <strong class="text-2xl text-primary">${escapeHtml(x.nom)} ${escapeHtml(x.prenom)}</strong>
        <div class="text-sm text-outline">Enregistré le ${escapeHtml(new Date(x.created_at).toLocaleString())}</div>
      </div>
      <button id="closeDetails" class="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-primary text-primary font-semibold hover:bg-red-50" type="button">Fermer</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="admin-detail-card bg-white rounded-xl p-4">${photo}</div>
      <div class="admin-detail-card bg-white rounded-xl p-4 space-y-4">
        <div><span class="k">Date de présence</span><span class="v">${escapeHtml(asYmd(x.presence_date || ''))}</span></div>
        <div><span class="k">Date de naissance</span><span class="v">${escapeHtml(asYmd(x.date_naissance || ''))}</span></div>
        <div><span class="k">Sexe</span><span class="v">${escapeHtml(x.sexe)}</span></div>
        <div><span class="k">Situation relationnelle</span><span class="v">${escapeHtml(x.situation_relationnelle || '')}</span></div>
        <div><span class="k">Profession</span><span class="v">${escapeHtml(x.profession || '')}</span></div>
      </div>
      <div class="admin-detail-card bg-white rounded-xl p-4 space-y-4">
        <div><span class="k">Vicariat</span><span class="v">${escapeHtml(x.vicariat)}</span></div>
        <div><span class="k">Paroisse</span><span class="v">${escapeHtml(x.paroisse)}</span></div>
        <div><span class="k">Téléphone</span><span class="v">${escapeHtml(x.telephone || '')}</span></div>
      </div>
      <div class="admin-detail-card bg-white rounded-xl p-4 md:col-span-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span class="k">Pourquoi cette rencontre ?</span><span class="v">${escapeHtml(x.raison_presence || '')}</span></div>
          <div><span class="k">Canal d'information</span><span class="v">${escapeHtml(x.canal_information || '')}</span></div>
        </div>
      </div>
    </div>
  `;
  details.classList.remove('hidden');
  details.querySelector('#closeDetails')?.addEventListener('click', () => showDetails(null));
  details.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function render(list) {
  const total = list.length;
  const normSex = (v) => String(v || '').toLowerCase();
  const men = list.filter((x) => ['masculin', 'homme', 'm'].includes(normSex(x.sexe))).length;
  const women = list.filter((x) => ['féminin', 'feminin', 'femme', 'f'].includes(normSex(x.sexe))).length;

  if (stats) {
    stats.innerHTML = `
      <div class="bg-white p-lg rounded-xl shadow-[0_20px_20px_rgba(143,0,13,0.04)] border-t-2 border-secondary-container relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 text-red-50 group-hover:text-red-100 transition-colors">
          <span class="material-symbols-outlined text-[120px] opacity-20">person_add</span>
        </div>
        <p class="text-sm font-semibold uppercase tracking-wider text-outline mb-2">Total inscrits</p>
        <div class="flex items-end gap-2">
          <h3 class="text-5xl font-extrabold text-primary">${total}</h3>
        </div>
      </div>
      <div class="bg-white p-lg rounded-xl shadow-[0_20px_20px_rgba(143,0,13,0.04)] border-t-2 border-secondary-container relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 text-red-50 group-hover:text-red-100 transition-colors">
          <span class="material-symbols-outlined text-[120px] opacity-20">man</span>
        </div>
        <p class="text-sm font-semibold uppercase tracking-wider text-outline mb-2">Hommes</p>
        <div class="flex items-end gap-2">
          <h3 class="text-5xl font-extrabold text-primary">${men}</h3>
        </div>
      </div>
      <div class="bg-white p-lg rounded-xl shadow-[0_20px_20px_rgba(143,0,13,0.04)] border-t-2 border-secondary-container relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 text-red-50 group-hover:text-red-100 transition-colors">
          <span class="material-symbols-outlined text-[120px] opacity-20">woman</span>
        </div>
        <p class="text-sm font-semibold uppercase tracking-wider text-outline mb-2">Femmes</p>
        <div class="flex items-end gap-2">
          <h3 class="text-5xl font-extrabold text-primary">${women}</h3>
        </div>
      </div>
    `;
  }

  if (tableSummary) {
    tableSummary.textContent = list.length
      ? `Affichage de ${list.length} participant${list.length > 1 ? 's' : ''}`
      : 'Aucun participant à afficher';
  }

  rows.innerHTML = list
    .map(
      (x) => {
        const initials = `${String(x.nom || '').charAt(0)}${String(x.prenom || '').charAt(0)}`.toUpperCase();
        const photo = x.photo
          ? `<img alt="Photo de ${escapeHtml(x.nom)} ${escapeHtml(x.prenom)}" class="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" src="${escapeHtml(x.photo)}" />`
          : `<div class="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">${escapeHtml(initials || 'R')}</div>`;
        return `<tr class="clickRow hover:bg-red-50/30 transition-colors group cursor-pointer" data-id="${x.id}">
          <td class="px-md py-sm">${photo}</td>
          <td class="px-md py-sm">
            <p class="font-bold text-on-surface">${escapeHtml(x.nom)} ${escapeHtml(x.prenom)}</p>
            <p class="text-xs text-outline">${escapeHtml(x.telephone || '')}</p>
          </td>
          <td class="px-md py-sm text-outline">${escapeHtml(x.sexe)}</td>
          <td class="px-md py-sm">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">${escapeHtml(x.situation_relationnelle || 'Inscrit')}</span>
          </td>
          <td class="px-md py-sm text-on-surface-variant">${escapeHtml(x.paroisse)}</td>
          <td class="px-md py-sm text-outline">${escapeHtml(asYmd(x.presence_date || ''))}</td>
          <td class="px-md py-sm text-right">
            <button class="text-outline hover:text-primary transition-colors" type="button" aria-label="Voir les détails">
              <span class="material-symbols-outlined">more_vert</span>
            </button>
          </td>
        </tr>`
      }
    )
    .join('');

  // Click -> détails
  rows.querySelectorAll('tr.clickRow').forEach((tr) => {
    tr.addEventListener('click', () => {
      const id = Number(tr.getAttribute('data-id'));
      const found = inscriptions.find((x) => Number(x.id) === id);
      showDetails(found);
    });
  });
}

function applySearch() {
  const q = ((searchInput && searchInput.value) || (searchMobileInput && searchMobileInput.value) || '').trim().toLowerCase();
  const filtered = inscriptions.filter((x) =>
  [x.presence_date, x.nom, x.prenom, x.vicariat, x.paroisse, x.profession, x.telephone, x.situation_relationnelle, x.raison_presence, x.canal_information]
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
  render(filtered);
}

async function fetchInscriptions() {
  try {
  const d = (presenceDateInput?.value || '').trim();
  const url = d ? `/api/inscriptions?date=${encodeURIComponent(d)}` : '/api/inscriptions';
  const r = await fetch(url);
    if (r.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt || `HTTP ${r.status}`);
    }
    inscriptions = await r.json();
    applySearch();

    // Met à jour le lien CSV pour inclure le filtre date
    if (downloadCsv) {
      downloadCsv.href = d ? `/api/inscriptions.csv?date=${encodeURIComponent(d)}` : '/api/inscriptions.csv';
    }
    if (downloadExcel) {
      downloadExcel.href = d ? `/api/inscriptions.xls?date=${encodeURIComponent(d)}` : '/api/inscriptions.xls';
    }
  } catch (err) {
    if (stats) {
      stats.innerHTML = '<div class="md:col-span-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 font-semibold">Impossible de charger les inscriptions.</div>';
    }
    rows.innerHTML = '';
    if (tableSummary) tableSummary.textContent = 'Chargement impossible';
    if (adminHint) {
      adminHint.textContent = `Erreur API: ${String(err && err.message ? err.message : err)}`;
      adminHint.style.color = 'crimson';
    }
  }
}

async function savePresence() {
  const presenceDate = (presenceDateInput?.value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(presenceDate)) {
    setSavePresenceStatus('Choisissez une date de présence.', 'error');
    presenceDateInput?.focus();
    return;
  }

  try {
    if (savePresenceBtn) {
      savePresenceBtn.disabled = true;
      savePresenceBtn.classList.add('opacity-70', 'cursor-wait');
    }
    setSavePresenceStatus('Sauvegarde en cours...', 'info');
    const r = await fetch('/api/presence-saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presence_date: presenceDate })
    });
    if (r.status === 401) {
      location.href = '/admin/login';
      return;
    }
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${r.status}`);
    }
    const saved = await r.json();
    const count = Number(saved.participant_count || 0);
    setSavePresenceStatus(`Sauvegarde créée: ${count} participant${count > 1 ? 's' : ''}.`, 'success');
    await fetchPresenceSaves();
  } catch (err) {
    setSavePresenceStatus(`Erreur: ${String(err && err.message ? err.message : err)}`, 'error');
  } finally {
    if (savePresenceBtn) {
      savePresenceBtn.disabled = false;
      savePresenceBtn.classList.remove('opacity-70', 'cursor-wait');
    }
  }
}

searchInput?.addEventListener('input', () => {
  if (searchMobileInput) searchMobileInput.value = searchInput.value;
  applySearch();
});

searchMobileInput?.addEventListener('input', () => {
  if (searchInput) searchInput.value = searchMobileInput.value;
  applySearch();
});

presenceDateInput?.addEventListener('change', () => {
  showDetails(null);
  syncAdminMeetingDate();
  fetchInscriptions();
});

async function logout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
  } finally {
    location.href = '/admin/login';
  }
}

logoutBtn?.addEventListener('click', logout);
logoutBtnMobile?.addEventListener('click', logout);
savePresenceBtn?.addEventListener('click', savePresence);
initAdminMeetingDate();
fetchInscriptions();
fetchPresenceSaves();
