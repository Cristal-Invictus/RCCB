// Frontend <-> Backend connector for RCCB registration
// - Sends JSON to POST /api/inscriptions
// - Sends the required photo as base64 data URL

const VICARIATS_PAROISSES = {
  "Vicariat Forain Notre-Dame Cotonou": [
    "Cathédrale Notre-Dame de Miséricorde",
    "Saint Michel",
    "Saint Jean-Baptiste",
    "Sainte Cécile",
    "Sainte Rita",
    "Saint Antoine de Padoue, ZOGBO",
    "Sainte Famille DJIDJE",
    "Sainte Marie Mère du Sauveur MIDEDJI",
    "N-D de la Visitation",
    "Saint Joseph VOSSA"
  ],
  "Vicariat Forain Sacré-Cœur": [
    "Sacré-Cœur",
    "Saint Martin (1980)",
    "Sainte Thérèse de l'Enfant-Jésus PK6",
    "Saint Joseph AGBATO",
    "Sainte Trinité AVOTROU",
    "Saint Augustin COTONOU",
    "Saints Pierre et Paul YENAWA",
    "Christ-Roi AKPAKPA-DODOME",
    "Saint Mathieu KPONDEHOU",
    "Saint Antoine de Padoue, TANTO"
  ],
  "Vicariat Forain Bon Pasteur": [
    "Bon Pasteur CADJEHOUN",
    "Sts Pierre et Paul AGLA – KOUHOUNOU",
    "Jésus Eucharistie de VEDOKO",
    "Saint Louis de GBEDEGBE",
    "Saint François d'Assise FIDJROSSE",
    "Saint Charles Lwanga AGLA-AKPLOMEY",
    "Sainte Famille AGLA-AKOGBATO",
    "Communauté Chrétienne de DJEBOU",
    "Sainte Trinité AGLA-HLAZOUNTO",
    "Marie Auxiliatrice MENONTIN",
    "Saint Jean Bosco SETOVI"
  ],
  "Vicariat Forain Ste Thérèse Godomey": [
    "Sainte Thérèse GODOMEY",
    "Notre-Dame de Charité GODOMEY GARE",
    "Sainte Claire TOGBIN DAHO",
    "Communauté Chrétienne TOGBIN DENOU",
    "Saint Joseph DEKOUNGBE",
    "Saint Jean-Eudes ATROKPOCODJI",
    "Sainte Jeanne d'Arc LOBOZOUNKPA",
    "Saint Pio COCOTOMEY",
    "Saint Antoine de Padoue COCOTOMEY",
    "Saint Joseph GBODJE",
    "Saint Gabriel COCOCODJI"
  ],
  "Vicariat Forain St Michel Togoudo": [
    "Saint Michel TOGOUDO",
    "Sainte Famille TANKPE",
    "Saint Benoît WOMEY",
    "Saint Daniel COMBONI SODO",
    "Saint Luc YENADJRO",
    "Saint Michel HOUETO",
    "Sainte Thérèse d'Avila GANKON",
    "Communauté Chrétienne Immaculée Conception DJADJO"
  ],
  "Vicariat Forain St Antoine de Padoue Calavi": [
    "Saint Antoine de Padoue CALAVI",
    "Sainte Joséphine BAKHITA CALAVI",
    "Saint Paul de ZOGBADJE",
    "Saint Albert Le Grand AÏTCHEDJI",
    "Communauté Chrétienne St Gérard Magellan AHOSSOUGBETA",
    "Saint Michel CALAVI GBODJO",
    "Sainte Trinité CALAVI ZOPAH",
    "Notre-Dame de l'Immaculée Conception AKASSATO",
    "Saint Jean Apôtre OUEGA",
    "Communauté Chrétienne KANSOUNKPA",
    "Sainte Thérèse ADJAGBO",
    "Communauté Chrétienne d'ATADJE",
    "Saint Pierre TOKAN"
  ],
  "Vicariat Forain Saint Luc Ouedo": [
    "Saint Luc OUEDO",
    "Sainte Bernadette HEVIE DODJI",
    "Saint Michel Archange HEVIE HOUINME",
    "Saint Isidore de HEVIE-ADOVIE",
    "Saint Pierre Claver DJEGANTO",
    "Notre Dame des Douleurs AMIGONIEN-COME",
    "Notre-Dame de l'Assomption SOME",
    "Saint Martin OUEDO ADJAGBO"
  ],
  "Vicariat Forain Saint Jean l'Evangéliste Zinvié": [
    "Saint Jean l'Evangéliste ZINVIE",
    "Saint Michel ZE",
    "Saint Joseph HEKANME",
    "St Jean Marie Vianney WAWATA",
    "Sainte Thérèse Enfant-Jésus AÏFA",
    "St Pierre Claver KOUNDOKPOE",
    "Rosa Mystica de WAWATA-ZOUNTO",
    "Saint Jean-Baptiste SEDJE DENOU",
    "St Jean de la Croix KPODJI-LES-MONTS",
    "Saint Dorothée ADJAN"
  ],
  "Vicariat Forain Saint Joseph de Glo-Yekon": [
    "Saint Michel AGBODJEDO",
    "Saint Paul TANGBO-DJEVIE",
    "Saints Pierre et Paul DJIGBE AGA",
    "Saint Joseph GLO YEKON",
    "Saint Etienne AGONGBE",
    "Sainte Bernadette Soubirous AGONME",
    "Sainte Cécile DOMEGBO",
    "Sainte Rita GBETAGBO",
    "Notre-Dame du Rosaire AGASSA GODOMEY"
  ],
  "Vicariat Forain Notre Dame de l'Immaculée Conception du Lac Nokoué": [
    "Notre-Dame de l'Immaculée Conception SO-TCHANHOUE",
    "Saint Ambroise LOKPO",
    "Saints Pierre et Paul GANVIE",
    "Saint Antoine de Padoue DEKANMEY",
    "Sainte Bernadette Soubirous SÔ-AVA"
  ],
  "Vicariat Forain Sainte Jeanne d'Arc d'Allada": [
    "Sainte Jeanne d'Arc ALLADA",
    "St Jean-Baptiste TORI-BOSSITO",
    "Saint Mathieu TORI-CADA",
    "Saint Etienne GLOTOMEY",
    "Saint Christophe ATTOGON",
    "N-D de l'Immaculée Conception TORI-GARE",
    "Saint Joseph AZOHOUE CADA",
    "Saint Christophe Sékou",
    "N-D de l'Immaculée Conception AYOU",
    "Transfiguration ALLADA DOGOUDO"
  ],
  "Vicariat Forain Saint Antoine de Padoue de Houegbo": [
    "Saint Antoine de Padoue HOUEGBO",
    "Saint Benoît TOFFO",
    "Sacré-Cœur SEHOUE",
    "Sacré-Cœur SEY-COUFFO",
    "Saint Cyprien DESSAH",
    "Sainte Anne AGON",
    "Notre-Dame de l'Assomption HINVI"
  ],
  "Vicariat Forain Sainte Geneviève de Pahou": [
    "Sainte Géneviève PAHOU",
    "Saint Antoine de Padoue AHOZON",
    "Saint Jude Thaddée ZOUNGOUDO",
    "Sainte Famille KPOVIE",
    "Saint Paul ADJARRA ADOVIE",
    "Saint Grégoire le Grand AKADJAMEY"
  ],
  "Vicariat Forain Notre-Dame de l'Immaculée Conception Ouidah": [
    "Basilique Notre Dame de l'Immaculée Conception OUIDAH",
    "Saint Paul de TOVE OUIDAH",
    "Saint Jean GBENA",
    "Sacré-Cœur de SAVI",
    "Sacré-Cœur GBENA",
    "Saint Martin de Tours GBEZOUNME",
    "Epiphanie OUESSE-SEGBANOU"
  ],
  "Vicariat Forain Saint Antoine de Padoue du Lac Ahémé": [
    "Saint Antoine de Padoue SEGBOHOUE",
    "Ste Catherine de Sienne TOKPA DOME",
    "Ste Marie Madeleine DEKANMEY",
    "Sainte Trinité ATCHAKANMEY",
    "Saint François d'Assise AGBANTO"
  ]
};

const VICARIATS = Object.keys(VICARIATS_PAROISSES);

function $(sel) {
  return document.querySelector(sel);
}

function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// Lettres (avec accents), espaces, apostrophe et tiret.
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ'\- ]+$/;
// Bénin: 01 + 8 chiffres => 10 chiffres au total.
const BJ_PHONE_RE = /^01\d{8}$/;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}
function setFlash(message, type = 'info') {
  const el = $('#flash');
  if (!el) return;
  el.textContent = message || '';
  el.dataset.type = type;
}

function initVicariats() {
  const vicariatSelect = $('#vicariat');
  if (!vicariatSelect) return;
  // Remove existing options except placeholder
  [...vicariatSelect.querySelectorAll('option')]
    .filter((o) => o.value !== '')
    .forEach((o) => o.remove());
  VICARIATS.forEach((v) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    vicariatSelect.appendChild(o);
  });
}

function populateParoisses(vicariat) {
  const paroisseSelect = $('#paroisse');
  if (!paroisseSelect) return;

  paroisseSelect.innerHTML = '<option value="">Choisir la paroisse</option>';
  (VICARIATS_PAROISSES[vicariat] || []).forEach((p) => {
    const o = document.createElement('option');
    o.value = p;
    o.textContent = p;
    paroisseSelect.appendChild(o);
  });
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function initPhotoUpload() {
  const placeholder = $('.photo-placeholder');
  const input = $('#photo');
  if (!placeholder || !input) return;

  placeholder.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    setFlash('');
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      input.value = '';
      setFlash('Photo trop lourde (max 2Mo).', 'error');
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      placeholder.innerHTML = `<img src="${url}" alt="Aperçu" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    } catch {
      input.value = '';
      setFlash("Impossible de lire l'image.", 'error');
    }
  });
}

async function buildPayloadFromForm(form) {
  const fd = new FormData(form);

  const nom = normalizeSpaces(fd.get('nom'));
  const prenom = normalizeSpaces(fd.get('prenom'));
  const date_naissance = String(fd.get('date_naissance') || '').trim();
  const presence_date = String(fd.get('presence_date') || '').trim();
  const sexe = String(fd.get('sexe') || '').trim();
  const situation_relationnelle = String(fd.get('situation_relationnelle') || '').trim();
  const profession = normalizeSpaces(fd.get('profession'));
  const telephoneRaw = String(fd.get('telephone') || '').replace(/\s+/g, '').trim();
  const vicariat = String(fd.get('vicariat') || '').trim();
  const paroisse = normalizeSpaces(fd.get('paroisse'));
  const commentaires = normalizeSpaces(fd.get('commentaires'));

  if (!nom || !NAME_RE.test(nom)) {
    throw new Error("Nom invalide (lettres uniquement, espaces, '-' et apostrophe autorisés).");
  }
  if (!prenom || !NAME_RE.test(prenom)) {
    throw new Error("Prénom invalide (lettres uniquement, espaces, '-' et apostrophe autorisés).");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_naissance)) {
    throw new Error('Date de naissance invalide (format attendu: YYYY-MM-DD).');
  }
  if (!/^\d{4}-\d{{2}}-\d{2}$/.test(presence_date)) {
    // NOTE: kept as string; fix regexp below
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(presence_date)) {
    throw new Error('Date de présence invalide (format attendu: YYYY-MM-DD).');
  }
  if (!sexe) throw new Error('Veuillez sélectionner le sexe.');
  if (!situation_relationnelle) throw new Error('Veuillez sélectionner la situation relationnelle.');
  if (!vicariat) throw new Error('Veuillez sélectionner le vicariat.');
  if (!paroisse) throw new Error('Veuillez renseigner la paroisse.');

  let telephone = telephoneRaw;
  if (telephone) {
    if (!BJ_PHONE_RE.test(telephone)) {
      throw new Error('Téléphone invalide (format attendu: 01XXXXXXXX).');
    }
  }

  let photo = '';
  const file = fd.get('photo');
  if (!file || !(file instanceof File) || file.size <= 0) {
    throw new Error('Veuillez ajouter une photo.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Photo trop lourde (max 2Mo).');
  }
  photo = await fileToDataUrl(file);

  return {
    nom,
    prenom,
    date_naissance,
    sexe,
    situation_relationnelle,
    profession,
    telephone,
    photo,
    vicariat,
    paroisse,
    commentaires,
    presence_date
  };
}

async function submitInscription(payload) {
  const r = await fetch('/api/inscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await r.json() : await r.text();
  if (!r.ok) {
    const message = (body && body.error) || (typeof body === 'string' ? body : 'Erreur lors de la soumission.');
    throw new Error(message);
  }
  return body;
}

function initThemeToggle() {
  const t = $('.theme-toggle');
  if (!t) return;
  if (localStorage.getItem('theme') === 'dark-mode') {
    document.body.classList.add('dark-mode');
  }
  t.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark-mode');
    } else {
      localStorage.removeItem('theme');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initVicariats();
  initPhotoUpload();
  initThemeToggle();

  const presenceDateInput = $('#presence-date');
  if (presenceDateInput && !presenceDateInput.value) {
    presenceDateInput.value = todayYmd();
  }

  const vicariatSelect = $('#vicariat');
  if (vicariatSelect) {
    populateParoisses(vicariatSelect.value);
    vicariatSelect.addEventListener('change', (e) => {
      populateParoisses(e.target.value);
    });
  }

  const form = $('#registration-form');
  if (!form) return;

  form.addEventListener('reset', () => {
    setFlash('');
    const placeholder = $('.photo-placeholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <span class="material-symbols-outlined text-outline text-5xl mb-2">add_a_photo</span>
        <span class="text-xs font-semibold text-outline-variant uppercase tracking-widest">Photo (Upload)</span>
      `;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFlash('');

    const submitBtn = form.querySelector('button[type="submit"]');
    const oldHtml = submitBtn ? submitBtn.innerHTML : '';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Envoi…';
      }

      const payload = await buildPayloadFromForm(form);
      await submitInscription(payload);

      setFlash('Enregistrement réussi.', 'success');
      form.reset();
    } catch (err) {
      setFlash(String(err && err.message ? err.message : err), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = oldHtml;
      }
    }
  });
});

// (Dark-mode styles are handled in CSS; keep JS minimal.)
