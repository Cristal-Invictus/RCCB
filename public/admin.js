const stats = document.getElementById('stats');
const rows = document.getElementById('rows');
const searchInput = document.getElementById('search');
const adminHint = document.getElementById('adminHint');
const logoutBtn = document.getElementById('logoutBtn');
const details = document.getElementById('details');
const presenceDateInput = document.getElementById('presenceDate');
const downloadCsv = document.getElementById('downloadCsv');

let inscriptions = [];

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

function showDetails(x) {
  if (!details) return;
  if (!x) {
    details.style.display = 'none';
    details.innerHTML = '';
    return;
  }

  const photo = x.photo ? `<img class="avatar" src="${escapeHtml(x.photo)}" alt="photo" />` : '<div class="avatar avatarEmpty">Aucune</div>';
  details.innerHTML = `
    <div class="detailsHead">
      <div>
        <strong>${escapeHtml(x.nom)} ${escapeHtml(x.prenom)}</strong>
  <div class="hint">Enregistré le ${escapeHtml(new Date(x.created_at).toLocaleString())}</div>
      </div>
      <button id="closeDetails" class="btnSmall" type="button">Fermer</button>
    </div>
    <div class="detailsGrid">
      <div class="detailsCard">${photo}</div>
      <div class="detailsCard">
  <div><span class="k">Date de présence</span><span class="v">${escapeHtml(asYmd(x.presence_date || ''))}</span></div>
  <div><span class="k">Date de naissance</span><span class="v">${escapeHtml(asYmd(x.date_naissance || ''))}</span></div>
        <div><span class="k">Sexe</span><span class="v">${escapeHtml(x.sexe)}</span></div>
  <div><span class="k">Situation relationnelle</span><span class="v">${escapeHtml(x.situation_relationnelle || '')}</span></div>
        <div><span class="k">Profession</span><span class="v">${escapeHtml(x.profession || '')}</span></div>
      </div>
      <div class="detailsCard">
        <div><span class="k">Vicariat</span><span class="v">${escapeHtml(x.vicariat)}</span></div>
        <div><span class="k">Paroisse</span><span class="v">${escapeHtml(x.paroisse)}</span></div>
        <div><span class="k">Téléphone</span><span class="v">${escapeHtml(x.telephone || '')}</span></div>
      </div>
      <div class="detailsCard" style="grid-column:1/-1;">
        <div><span class="k">Commentaires</span><span class="v">${escapeHtml(x.commentaires || '')}</span></div>
      </div>
    </div>
  `;
  details.style.display = 'block';
  details.querySelector('#closeDetails')?.addEventListener('click', () => showDetails(null));
  details.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function render(list) {
  const total = list.length;
  const men = list.filter((x) => x.sexe === 'Masculin').length;
  const women = list.filter((x) => x.sexe === 'Féminin').length;

  stats.innerHTML = `<div class="stat"><b>${total}</b><br>Total</div><div class="stat"><b>${men}</b><br>Hommes</div><div class="stat"><b>${women}</b><br>Femmes</div>`;
  rows.innerHTML = list
    .map(
      (x) =>
        `<tr class="clickRow" data-id="${x.id}">
          <td>${escapeHtml(asYmd(x.presence_date || ''))}</td>
          <td><strong>${escapeHtml(x.nom)} ${escapeHtml(x.prenom)}</strong></td>
          <td>${escapeHtml(asYmd(x.date_naissance || ''))}</td>
          <td>${escapeHtml(x.sexe)}</td>
          <td>${escapeHtml(x.situation_relationnelle || '')}</td>
          <td>${escapeHtml(x.profession || '')}</td>
          <td>${escapeHtml(x.vicariat)}</td>
          <td>${escapeHtml(x.paroisse)}</td>
          <td>${escapeHtml(x.telephone || '')}</td>
          <td>${x.photo ? '<span class="pill">Voir</span>' : ''}</td>
        </tr>`
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
  const q = (searchInput.value || '').trim().toLowerCase();
  const filtered = inscriptions.filter((x) =>
  [x.presence_date, x.nom, x.prenom, x.vicariat, x.paroisse, x.profession, x.telephone, x.situation_relationnelle]
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
  } catch (err) {
    stats.innerHTML = '<div class="stat" style="grid-column:1/-1; border-color:#fecaca; background:#fff1f2;">Impossible de charger les inscriptions.</div>';
    rows.innerHTML = '';
    if (adminHint) {
      adminHint.textContent = `Erreur API: ${String(err && err.message ? err.message : err)}`;
      adminHint.style.color = 'crimson';
    }
  }
}

searchInput.addEventListener('input', applySearch);

presenceDateInput?.addEventListener('change', () => {
  showDetails(null);
  fetchInscriptions();
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
  } finally {
    location.href = '/admin/login';
  }
});

fetchInscriptions();
