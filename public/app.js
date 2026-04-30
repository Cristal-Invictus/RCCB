const VICARIATS_PAROISSES = {
  "Vicariat Forain Notre-Dame Cotonou": ["Cathédrale Notre-Dame de Miséricorde", "Saint Michel", "Saint Jean-Baptiste", "Sainte Cécile", "Sainte Rita", "Saint Antoine de Padoue, ZOGBO", "Sainte Famille DJIDJE", "Sainte Marie Mère du Sauveur MIDEDJI", "N-D de la Visitation", "Saint Joseph VOSSA"],
  "Vicariat Forain Sacré-Cœur": ["Sacré-Cœur", "Saint Martin (1980)", "Sainte Thérèse de l'Enfant-Jésus PK6", "Saint Joseph AGBATO", "Sainte Trinité AVOTROU", "Saint Augustin COTONOU", "Saints Pierre et Paul YENAWA", "Christ-Roi AKPAKPA-DODOME", "Saint Mathieu KPONDEHOU", "Saint Antoine de Padoue, TANTO"],
  "Vicariat Forain Bon Pasteur": ["Bon Pasteur CADJEHOUN", "Sts Pierre et Paul AGLA – KOUHOUNOU", "Jésus Eucharistie de VEDOKO", "Saint Louis de GBEDEGBE", "Saint François d'Assise FIDJROSSE", "Saint Charles Lwanga AGLA-AKPLOMEY", "Sainte Famille AGLA-AKOGBATO", "Communauté Chrétienne de DJEBOU", "Sainte Trinité AGLA-HLAZOUNTO", "Marie Auxiliatrice MENONTIN", "Saint Jean Bosco SETOVI"],
  "Vicariat Forain Ste Thérèse Godomey": ["Sainte Thérèse GODOMEY", "Notre-Dame de Charité GODOMEY GARE", "Sainte Claire TOGBIN DAHO", "Communauté Chrétienne TOGBIN DENOU", "Saint Joseph DEKOUNGBE", "Saint Jean-Eudes ATROKPOCODJI", "Sainte Jeanne d'Arc LOBOZOUNKPA", "Saint Pio COCOTOMEY", "Saint Antoine de Padoue COCOTOMEY", "Saint Joseph GBODJE", "Saint Gabriel COCOCODJI"],
  "Vicariat Forain St Michel Togoudo": ["Saint Michel TOGOUDO", "Sainte Famille TANKPE", "Saint Benoît WOMEY", "Saint Daniel COMBONI SODO", "Saint Luc YENADJRO", "Saint Michel HOUETO", "Sainte Thérèse d'Avila GANKON", "Communauté Chrétienne Immaculée Conception DJADJO"],
  "Vicariat Forain St Antoine de Padoue Calavi": ["Saint Antoine de Padoue CALAVI", "Sainte Joséphine BAKHITA CALAVI", "Saint Paul de ZOGBADJE", "Saint Albert Le Grand AÏTCHEDJI", "Communauté Chrétienne St Gérard Magellan AHOSSOUGBETA", "Saint Michel CALAVI GBODJO", "Sainte Trinité CALAVI ZOPAH", "Notre-Dame de l'Immaculée Conception AKASSATO", "Saint Jean Apôtre OUEGA", "Communauté Chrétienne KANSOUNKPA", "Sainte Thérèse ADJAGBO", "Communauté Chrétienne d'ATADJE", "Saint Pierre TOKAN"],
  "Vicariat Forain Saint Luc Ouedo": ["Saint Luc OUEDO", "Sainte Bernadette HEVIE DODJI", "Saint Michel Archange HEVIE HOUINME", "Saint Isidore de HEVIE-ADOVIE", "Saint Pierre Claver DJEGANTO", "Notre Dame des Douleurs AMIGONIEN-COME", "Notre-Dame de l'Assomption SOME", "Saint Martin OUEDO ADJAGBO"],
  "Vicariat Forain Saint Jean l'Evangéliste Zinvié": ["Saint Jean l'Evangéliste ZINVIE", "Saint Michel ZE", "Saint Joseph HEKANME", "St Jean Marie Vianney WAWATA", "Sainte Thérèse Enfant-Jésus AÏFA", "St Pierre Claver KOUNDOKPOE", "Rosa Mystica de WAWATA-ZOUNTO", "Saint Jean-Baptiste SEDJE DENOU", "St Jean de la Croix KPODJI-LES-MONTS", "Saint Dorothée ADJAN"],
  "Vicariat Forain Saint Joseph de Glo-Yekon": ["Saint Michel AGBODJEDO", "Saint Paul TANGBO-DJEVIE", "Saints Pierre et Paul DJIGBE AGA", "Saint Joseph GLO YEKON", "Saint Etienne AGONGBE", "Sainte Bernadette Soubirous AGONME", "Sainte Cécile DOMEGBO", "Sainte Rita GBETAGBO", "Notre-Dame du Rosaire AGASSA GODOMEY"],
  "Vicariat Forain Notre Dame de l'Immaculée Conception du Lac Nokoué": ["Notre-Dame de l'Immaculée Conception SO-TCHANHOUE", "Saint Ambroise LOKPO", "Saints Pierre et Paul GANVIE", "Saint Antoine de Padoue DEKANMEY", "Sainte Bernadette Soubirous SÔ-AVA"],
  "Vicariat Forain Sainte Jeanne d'Arc d'Allada": ["Sainte Jeanne d'Arc ALLADA", "St Jean-Baptiste TORI-BOSSITO", "Saint Mathieu TORI-CADA", "Saint Etienne GLOTOMEY", "Saint Christophe ATTOGON", "N-D de l'Immaculée Conception TORI-GARE", "Saint Joseph AZOHOUE CADA", "Saint Christophe Sékou", "N-D de l'Immaculée Conception AYOU", "Transfiguration ALLADA DOGOUDO"],
  "Vicariat Forain Saint Antoine de Padoue de Houegbo": ["Saint Antoine de Padoue HOUEGBO", "Saint Benoît TOFFO", "Sacré-Cœur SEHOUE", "Sacré-Cœur SEY-COUFFO", "Saint Cyprien DESSAH", "Sainte Anne AGON", "Notre-Dame de l'Assomption HINVI"],
  "Vicariat Forain Sainte Geneviève de Pahou": ["Sainte Géneviève PAHOU", "Saint Antoine de Padoue AHOZON", "Saint Jude Thaddée ZOUNGOUDO", "Sainte Famille KPOVIE", "Saint Paul ADJARRA ADOVIE", "Saint Grégoire le Grand AKADJAMEY"],
  "Vicariat Forain Notre-Dame de l'Immaculée Conception Ouidah": ["Basilique Notre Dame de l'Immaculée Conception OUIDAH", "Saint Paul de TOVE OUIDAH", "Saint Jean GBENA", "Sacré-Cœur de SAVI", "Sacré-Cœur GBENA", "Saint Martin de Tours GBEZOUNME", "Epiphanie OUESSE-SEGBANOU"],
  "Vicariat Forain Saint Antoine de Padoue du Lac Ahémé": ["Saint Antoine de Padoue SEGBOHOUE", "Ste Catherine de Sienne TOKPA DOME", "Ste Marie Madeleine DEKANMEY", "Sainte Trinité ATCHAKANMEY", "Saint François d'Assise AGBANTO"]
};

const form = document.getElementById('inscriptionForm');
const vicariatSelect = document.getElementById('vicariat');
const paroisseSelect = document.getElementById('paroisse');
const flash = document.getElementById('flash');
const presenceDateFilter = document.getElementById('presenceDateFilter');

function initVicariats() { /*...*/
  vicariatSelect.innerHTML = '<option value="">Choisir</option>';
  Object.keys(VICARIATS_PAROISSES).forEach((v) => {
    const o = document.createElement('option'); o.value = v; o.textContent = v;
    vicariatSelect.appendChild(o);
  });
}
function populateParoisses(v) {
  paroisseSelect.innerHTML = '<option value="">Choisir</option>';
  (VICARIATS_PAROISSES[v] || []).forEach((p) => {
    const o = document.createElement('option'); o.value = p; o.textContent = p;
    paroisseSelect.appendChild(o);
  });
}

function render(list) {
  const total = list.length;
  const men = list.filter((x) => x.sexe === 'Masculin').length;
  const women = list.filter((x) => x.sexe === 'Féminin').length;

  stats.innerHTML = `<div class="stat"><b>${total}</b><br>Total</div><div class="stat"><b>${men}</b><br>Hommes</div><div class="stat"><b>${women}</b><br>Femmes</div>`;
  rows.innerHTML = list.map((x) => `<tr><td>${x.presence_date || ''}</td><td>${x.nom} ${x.prenom}</td><td>${x.date_naissance || ''}</td><td>${x.sexe}</td><td>${x.situation_relationnelle || ''}</td><td>${x.vicariat}</td><td>${x.paroisse}</td><td>${x.telephone || ''}</td></tr>`).join('');
}

function applySearch() {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = inscriptions.filter((x) => [x.nom, x.prenom, x.vicariat, x.paroisse, x.profession, x.telephone, x.situation_relationnelle, x.presence_date, x.date_naissance].join(' ').toLowerCase().includes(q));
  render(filtered);
}

async function fetchInscriptions() {
  const d = (presenceDateFilter?.value || '').trim();
  const url = d ? `/api/inscriptions?date=${encodeURIComponent(d)}` : '/api/inscriptions';
  const r = await fetch(url);
  inscriptions = await r.json();
  applySearch();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  flash.textContent = '';
  const data = Object.fromEntries(new FormData(form).entries());
  const r = await fetch('/api/inscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!r.ok) {
    const err = await r.json();
    flash.textContent = err.error || 'Erreur';
    flash.style.color = 'crimson';
    return;
  }

  flash.textContent = 'Présence enregistrée.';
  flash.style.color = 'green';
  form.reset();
  populateParoisses('');
});
vicariatSelect.addEventListener('change', (e) => populateParoisses(e.target.value));
searchInput.addEventListener('input', applySearch);
presenceDateFilter?.addEventListener('change', fetchInscriptions);

initVicariats();
populateParoisses('');
