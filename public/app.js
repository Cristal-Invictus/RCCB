const VICARIATS_PAROISSES = {
  Cotonou: ["Sainte Rita", "Saint Michel", "Notre Dame"],
  "Porto-Novo": ["Notre Dame de Lourdes", "Saint Pierre", "Sainte Famille"],
  Parakou: ["Saints Pierre et Paul", "Saint Joseph", "Sainte Thérèse"]
};

const form = document.getElementById('inscriptionForm');
const vicariatSelect = document.getElementById('vicariat');
const paroisseSelect = document.getElementById('paroisse');
const stats = document.getElementById('stats');
const rows = document.getElementById('rows');
const searchInput = document.getElementById('search');
const flash = document.getElementById('flash');

let inscriptions = [];

function initVicariats() {
  vicariatSelect.innerHTML = '<option value="">Choisir</option>';
  Object.keys(VICARIATS_PAROISSES).forEach((v) => {
    const o = document.createElement('option'); o.value = v; o.textContent = v;
    vicariatSelect.appendChild(o);
  });
}

function populateParoisses(vicariat) {
  paroisseSelect.innerHTML = '<option value="">Choisir</option>';
  (VICARIATS_PAROISSES[vicariat] || []).forEach((p) => {
    const o = document.createElement('option'); o.value = p; o.textContent = p;
    paroisseSelect.appendChild(o);
  });
}

function render(list) {
  const total = list.length;
  const avgAge = total ? Math.round(list.reduce((a, x) => a + Number(x.age || 0), 0) / total) : 0;
  const men = list.filter((x) => x.sexe === 'Masculin').length;
  const women = list.filter((x) => x.sexe === 'Féminin').length;

  stats.innerHTML = `<div class="stat"><b>${total}</b><br>Total</div><div class="stat"><b>${avgAge}</b><br>Âge moyen</div><div class="stat"><b>${men}</b><br>Hommes</div><div class="stat"><b>${women}</b><br>Femmes</div>`;
  rows.innerHTML = list.map((x) => `<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${x.nom} ${x.prenom}</td><td>${x.age}</td><td>${x.sexe}</td><td>${x.vicariat}</td><td>${x.paroisse}</td><td>${x.telephone || ''} ${x.email ? '<br>'+x.email:''}</td></tr>`).join('');
}

function applySearch() {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = inscriptions.filter((x) => [x.nom, x.prenom, x.vicariat, x.paroisse, x.profession, x.telephone, x.email].join(' ').toLowerCase().includes(q));
  render(filtered);
}

async function fetchInscriptions() {
  const r = await fetch('/api/inscriptions');
  inscriptions = await r.json();
  applySearch();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  flash.textContent = '';
  const data = Object.fromEntries(new FormData(form).entries());
  const r = await fetch('/api/inscriptions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });

  if (!r.ok) {
    const err = await r.json();
    flash.textContent = err.error || 'Erreur';
    flash.style.color = 'crimson';
    return;
  }

  flash.textContent = 'Inscription enregistrée.';
  flash.style.color = 'green';
  form.reset();
  populateParoisses('');
  await fetchInscriptions();
});

vicariatSelect.addEventListener('change', (e) => populateParoisses(e.target.value));
searchInput.addEventListener('input', applySearch);

initVicariats();
populateParoisses('');
fetchInscriptions();
