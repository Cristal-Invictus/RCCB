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

const VERSETS_RENCONTRE = [
  {
    text: "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.",
    reference: 'Matthieu 18:20'
  },
  {
    text: "Vous recevrez une puissance, le Saint-Esprit survenant sur vous.",
    reference: 'Actes 1:8'
  },
  {
    text: 'Que personne ne méprise ta jeunesse; mais sois un modèle pour les fidèles.',
    reference: '1 Timothée 4:12'
  },
  {
    text: "Là où est l'Esprit du Seigneur, là est la liberté.",
    reference: '2 Corinthiens 3:17'
  },
  {
    text: 'Fortifie-toi et prends courage.',
    reference: 'Josué 1:9'
  }
];

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

function dataUrlToFile(dataUrl, filename) {
  const parts = String(dataUrl || '').split(',');
  const meta = parts[0] || '';
  const base64 = parts[1] || '';
  const mimeMatch = /^data:([^;]+);base64$/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

function firstSundayOfMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (7 - d.getDay()) % 7;
  d.setDate(1 + offset);
  return d;
}

function minBirthDateForAge(age, referenceDate = new Date()) {
  return new Date(referenceDate.getFullYear() - age, referenceDate.getMonth(), referenceDate.getDate());
}

function isAtLeastAge(birthDate, minAge, referenceDate = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate || ''))) return false;
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

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMeetingDateFr(value) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const formatted = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  return formatted.replace(/\b([a-zà-ÿ])/g, (letter) => letter.toUpperCase());
}

function setPhotoPreview(dataUrl) {
  const finalPreview = $('#photoFinalPreview');
  const placeholder = $('.photo-placeholder');
  if (!finalPreview || !placeholder) return;
  finalPreview.src = dataUrl;
  finalPreview.classList.remove('hidden');
  placeholder.classList.add('border-primary');
}

function setFlash(message, type = 'info') {
  const el = $('#flash');
  if (!el) return;
  el.textContent = message || '';
  el.dataset.type = type;
}

function initVerseRotator() {
  const verseText = $('#verseText');
  const verseReference = $('#verseReference');
  if (!verseText || !verseReference || VERSETS_RENCONTRE.length < 2) return;

  let index = 0;
  setInterval(() => {
    verseText.classList.add('opacity-0', 'translate-y-3');
    verseReference.classList.add('opacity-0');

    setTimeout(() => {
      index = (index + 1) % VERSETS_RENCONTRE.length;
      verseText.textContent = `"${VERSETS_RENCONTRE[index].text}"`;
      verseReference.textContent = VERSETS_RENCONTRE[index].reference;
      verseText.classList.remove('opacity-0', 'translate-y-3');
      verseReference.classList.remove('opacity-0');
    }, 550);
  }, 6000);
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

function initMeetingDate() {
  const presenceDateInput = $('#presence-date');
  const meetingDateLabel = $('#meetingDateLabel');
  if (!presenceDateInput) return;

  if (!presenceDateInput.value) {
    presenceDateInput.value = toYmd(firstSundayOfMonth());
  }

  function syncLabel() {
    if (meetingDateLabel) {
      meetingDateLabel.textContent = formatMeetingDateFr(presenceDateInput.value);
    }
  }

  syncLabel();
  presenceDateInput.addEventListener('change', syncLabel);
}

function initBirthDateRules() {
  const birthDateInput = $('#birth-date');
  if (!birthDateInput) return;
  birthDateInput.max = toYmd(minBirthDateForAge(13));
}

function initCanalInformation() {
  const canalSelect = $('#canal_information');
  const autreWrapper = $('#wrapper-canal-autre');
  const autreInput = $('#canal-information-autre');
  if (!canalSelect || !autreWrapper || !autreInput) return;

  function syncAutre() {
    if (canalSelect.value === 'Autre') {
      autreWrapper.classList.remove('hidden');
      autreWrapper.classList.add('flex');
      autreInput.required = true;
    } else {
      autreWrapper.classList.add('hidden');
      autreWrapper.classList.remove('flex');
      autreInput.required = false;
      autreInput.value = '';
    }
  }

  canalSelect.addEventListener('change', syncAutre);
  syncAutre();
}

function resetMeetingDate() {
  const presenceDateInput = $('#presence-date');
  const meetingDateLabel = $('#meetingDateLabel');
  if (!presenceDateInput) return;
  presenceDateInput.value = toYmd(firstSundayOfMonth());
  if (meetingDateLabel) {
    meetingDateLabel.textContent = formatMeetingDateFr(presenceDateInput.value);
  }
}

function initPhotoUpload() {
  const placeholder = $('.photo-placeholder');
  const input = $('#photo');
  const cameraInput = $('#cameraPhoto');
  const photoDataInput = $('#photoData');
  const choosePhotoBtn = $('#choosePhotoBtn');
  const openCameraBtn = $('#openCameraBtn');
  const panel = $('#photoCapturePanel');
  const video = $('#cameraPreview');
  const canvas = $('#cameraCanvas');
  const captureBtn = $('#capturePhotoBtn');
  const retakeBtn = $('#retakePhotoBtn');
  const useBtn = $('#usePhotoBtn');
  const closeBtn = $('#closeCameraBtn');
  const controlsInitial = $('#cameraControlsInitial');
  const controlsReview = $('#cameraControlsReview');
  if (!placeholder || !input) return;

  let stream = null;

  function shouldUseNativeCameraInput() {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const isTouchDevice = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return Boolean(cameraInput && (isMobile || isTouchDevice));
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  function closeCamera() {
    stopCamera();
    panel?.classList.add('hidden');
    panel?.classList.remove('flex');
  }

  async function getCameraStream() {
    const constraints = [
      {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      { video: true, audio: false }
    ];
    let lastError = null;
    for (const constraint of constraints) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraint);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Caméra indisponible');
  }

  async function openCamera() {
    if (shouldUseNativeCameraInput()) {
      setFlash('');
      cameraInput.value = '';
      cameraInput.click();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setFlash('Caméra indisponible sur ce navigateur. Utilisez “Choisir une photo”.', 'error');
      return;
    }

    try {
      setFlash('');
      stopCamera();
      panel?.classList.remove('hidden');
      panel?.classList.add('flex');
      controlsInitial?.classList.remove('hidden');
      controlsInitial?.classList.add('flex');
      controlsReview?.classList.add('hidden');
      controlsReview?.classList.remove('flex');
      stream = await getCameraStream();
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.muted = true;
        await video.play();
      }
    } catch {
      closeCamera();
      setFlash('Impossible d’ouvrir la caméra. Autorisez la caméra dans le navigateur ou utilisez “Choisir une photo”.', 'error');
    }
  }

  placeholder.addEventListener('click', openCamera);
  choosePhotoBtn?.addEventListener('click', () => input.click());
  openCameraBtn?.addEventListener('click', openCamera);
  closeBtn?.addEventListener('click', closeCamera);

  async function handleSelectedPhoto(fileInput) {
    setFlash('');
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      fileInput.value = '';
      setFlash('Photo trop lourde (max 2Mo).', 'error');
      return;
    }
    try {
      const url = await fileToDataUrl(file);
      if (photoDataInput) photoDataInput.value = url;
      setPhotoPreview(url);
    } catch {
      fileInput.value = '';
      setFlash("Impossible de lire l'image.", 'error');
    }
  }

  input.addEventListener('change', () => handleSelectedPhoto(input));
  cameraInput?.addEventListener('change', () => handleSelectedPhoto(cameraInput));

  captureBtn?.addEventListener('click', () => {
    if (!video || !canvas) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    video.pause();
    controlsInitial?.classList.add('hidden');
    controlsInitial?.classList.remove('flex');
    controlsReview?.classList.remove('hidden');
    controlsReview?.classList.add('flex');
  });

  retakeBtn?.addEventListener('click', () => {
    video?.play();
    controlsInitial?.classList.remove('hidden');
    controlsInitial?.classList.add('flex');
    controlsReview?.classList.add('hidden');
    controlsReview?.classList.remove('flex');
  });

  useBtn?.addEventListener('click', () => {
    if (!canvas || !photoDataInput) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    photoDataInput.value = dataUrl;
    setPhotoPreview(dataUrl);
    try {
      const photoFile = dataUrlToFile(dataUrl, 'photo-camera.jpg');
      const dt = new DataTransfer();
      dt.items.add(photoFile);
      input.files = dt.files;
    } catch {
      input.value = '';
    }
    closeCamera();
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
  const raison_presence = normalizeSpaces(fd.get('raison_presence'));
  const canalBase = String(fd.get('canal_information') || '').trim();
  const canalAutre = normalizeSpaces(fd.get('canal_information_autre'));
  const canal_information = canalBase === 'Autre' ? canalAutre : canalBase;

  if (!nom || !NAME_RE.test(nom)) {
    throw new Error("Nom invalide (lettres uniquement, espaces, '-' et apostrophe autorisés).");
  }
  if (!prenom || !NAME_RE.test(prenom)) {
    throw new Error("Prénom invalide (lettres uniquement, espaces, '-' et apostrophe autorisés).");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_naissance)) {
    throw new Error('Date de naissance invalide (format attendu: YYYY-MM-DD).');
  }
  if (!isAtLeastAge(date_naissance, 13)) {
    throw new Error('Date de naissance invalide: le participant doit avoir au moins 13 ans.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(presence_date)) {
    throw new Error('Date de présence invalide (format attendu: YYYY-MM-DD).');
  }
  if (!sexe) throw new Error('Veuillez sélectionner le sexe.');
  if (!situation_relationnelle) throw new Error('Veuillez sélectionner la situation relationnelle.');
  if (!vicariat) throw new Error('Veuillez sélectionner le vicariat.');
  if (!paroisse) throw new Error('Veuillez renseigner la paroisse.');
  if (!raison_presence) throw new Error('Veuillez répondre à la question: pourquoi as-tu choisi de venir à cette rencontre ?');
  if (!canal_information) throw new Error('Veuillez indiquer par quel canal tu as été informé de cette rencontre.');

  let telephone = telephoneRaw;
  if (telephone) {
    if (!BJ_PHONE_RE.test(telephone)) {
      throw new Error('Téléphone invalide (format attendu: 01XXXXXXXX).');
    }
  }

  let photo = '';
  const photoData = String($('#photoData')?.value || '').trim();
  const file = fd.get('photo');
  if (photoData) {
    if (!photoData.startsWith('data:image/')) {
      throw new Error('Photo invalide.');
    }
    if (photoData.length > 3_000_000) {
      throw new Error('Photo trop lourde (max 2Mo).');
    }
    photo = photoData;
  } else if (!file || !(file instanceof File) || file.size <= 0) {
    throw new Error('Veuillez ajouter une photo.');
  } else {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Photo trop lourde (max 2Mo).');
    }
    photo = await fileToDataUrl(file);
  }

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
    raison_presence,
    canal_information,
    commentaires: '',
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
  initMeetingDate();
  initBirthDateRules();
  initCanalInformation();
  initPhotoUpload();
  initVerseRotator();
  initThemeToggle();

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
    const photoDataInput = $('#photoData');
    const finalPreview = $('#photoFinalPreview');
    const placeholder = $('.photo-placeholder');
    if (photoDataInput) photoDataInput.value = '';
    if (finalPreview) {
      finalPreview.removeAttribute('src');
      finalPreview.classList.add('hidden');
    }
    placeholder?.classList.remove('border-primary');
    setTimeout(resetMeetingDate, 0);
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
