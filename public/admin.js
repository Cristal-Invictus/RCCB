const stats = document.getElementById('stats');
const rows = document.getElementById('rows');
const searchInput = document.getElementById('search');
const adminHint = document.getElementById('adminHint');
const logoutBtn = document.getElementById('logoutBtn');
const details = document.getElementById('details');

let inscriptions = [];

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
        <div class="hint">Inscrit le ${escapeHtml(new Date(x.created_at).toLocaleString())}</div>
      </div>
      <button id="closeDetails" class="btnSmall" type="button">Fermer</button>
    </div>
    <div class="detailsGrid">
      <div class="detailsCard">${photo}</div>
      <div class="detailsCard">
        <div><span class="k">Âge</span><span class="v">${escapeHtml(x.age)}</span></div>
        <div><span class="k">Sexe</span><span class="v">${escapeHtml(x.sexe)}</span></div>
        <div><span class="k">Statut marital</span><span class="v">${escapeHtml(x.statut_marital || '')}</span></div>
        <div><span class="k">Profession</span><span class="v">${escapeHtml(x.profession || '')}</span></div>
      </div>
      <div class="detailsCard">
        <div><span class="k">Vicariat</span><span class="v">${escapeHtml(x.vicariat)}</span></div>
        <div><span class="k">Paroisse</span><span class="v">${escapeHtml(x.paroisse)}</span></div>
        <div><span class="k">Téléphone</span><span class="v">${escapeHtml(x.telephone || '')}</span></div>
        <div><span class="k">Email</span><span class="v">${escapeHtml(x.email || '')}</span></div>
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
  const avgAge = total ? Math.round(list.reduce((a, x) => a + Number(x.age || 0), 0) / total) : 0;
  const men = list.filter((x) => x.sexe === 'Masculin').length;
  const women = list.filter((x) => x.sexe === 'Féminin').length;

  stats.innerHTML = `<div class="stat"><b>${total}</b><br>Total</div><div class="stat"><b>${avgAge}</b><br>Âge moyen</div><div class="stat"><b>${men}</b><br>Hommes</div><div class="stat"><b>${women}</b><br>Femmes</div>`;
  rows.innerHTML = list
    .map(
      (x) =>
        `<tr class="clickRow" data-id="${x.id}">
          <td>${escapeHtml(new Date(x.created_at).toLocaleString())}</td>
          <td><strong>${escapeHtml(x.nom)} ${escapeHtml(x.prenom)}</strong></td>
          <td>${escapeHtml(x.age)}</td>
          <td>${escapeHtml(x.sexe)}</td>
          <td>${escapeHtml(x.statut_marital || '')}</td>
          <td>${escapeHtml(x.profession || '')}</td>
          <td>${escapeHtml(x.vicariat)}</td>
          <td>${escapeHtml(x.paroisse)}</td>
          <td>${escapeHtml(x.telephone || '')}${x.email ? '<br>' + escapeHtml(x.email) : ''}</td>
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
  [x.nom, x.prenom, x.vicariat, x.paroisse, x.profession, x.telephone, x.email, x.statut_marital]
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
  render(filtered);
}

async function fetchInscriptions() {
  try {
    const r = await fetch('/api/inscriptions');
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

logoutBtn?.addEventListener('click', async () => {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
  } finally {
    location.href = '/admin/login';
  }
});

fetchInscriptions();
