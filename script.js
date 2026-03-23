const STORAGE_KEY = "app_rural_consolidada_v2";
const COLLECTION_KEYS = ["producers", "meds", "vaccines", "supplies", "procedures", "labTests"];
const state = {
  producers: [],
  meds: [],
  vaccines: [],
  supplies: [],
  procedures: [],
  labTests: [],
  selectedProducerId: null,
  editing: {
    producerId: null,
    animalId: null,
    medId: null,
    vaccineId: null,
    supplyId: null,
    procedureId: null,
  },
  ui: { medMode: "MANUAL", supplyMode: "DISPOSABLE" },
  draft: {
    animalPhotos: [],
    medRxPhoto: null,
    medTicketPhoto: null,
    vaccinePhoto: null,
    supplyTicketPhoto: null,
    procedureCasePhotos: [],
    procedureNecropsyPhotos: [],
    procedureChargePhoto: null,
    procedureMedUses: [],
    procedureVaccineUses: [],
    procedureSupplyUses: [],
    procedureLabIds: [],
  },
  sync: {
    lastSyncedAt: null,
    lastSyncedUserId: null,
    conflicts: [],
    deletedRecords: {
      producers: [],
      meds: [],
      vaccines: [],
      supplies: [],
      procedures: [],
      labTests: [],
    },
  },
};

const syncHashes = {};
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const uid = (p = "id") =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const money = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number(v || 0),
  );
const safe = (v) => (v == null ? "" : String(v));
const esc = (v) =>
  safe(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const byId = (arr, id) => arr.find((x) => x.id === id);

function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .filter((key) => key !== "_sync")
    .sort()
    .reduce((acc, key) => {
      acc[key] = stableClone(value[key]);
      return acc;
    }, {});
}
function normalizeSyncMeta(record, scope, ownerUserId = null) {
  const now = Date.now();
  const previous = record._sync || {};
  const serialized = JSON.stringify(stableClone(record));
  const cacheKey = `${scope}:${record.id}`;
  const changed = syncHashes[cacheKey] !== serialized;
  syncHashes[cacheKey] = serialized;
  return {
    ...record,
    _sync: {
      createdAt: previous.createdAt || now,
      updatedAt: changed ? now : previous.updatedAt || now,
      syncStatus: changed ? "pending" : previous.syncStatus || "local-only",
      lastSyncedAt: previous.lastSyncedAt || null,
      deletedAt: previous.deletedAt || null,
      conflict: previous.conflict || null,
      ownerUserId: ownerUserId || previous.ownerUserId || state.sync.lastSyncedUserId || null,
      version: Number(previous.version || 0) + (changed ? 1 : 0),
    },
  };
}
function normalizeEntityCollections(ownerUserId = null) {
  state.producers = (state.producers || []).map((producer) => {
    const normalizedAnimals = (producer.animals || []).map((animal) => normalizeSyncMeta(animal, "animals", ownerUserId));
    return normalizeSyncMeta({ ...producer, animals: normalizedAnimals, questionnaire: normalizeQuestionnaire(producer.questionnaire || {}) }, "producers", ownerUserId);
  });
  ["meds", "vaccines", "supplies", "procedures", "labTests"].forEach((key) => {
    state[key] = (state[key] || []).map((record) => normalizeSyncMeta(record, key, ownerUserId));
  });
  state.sync = {
    lastSyncedAt: state.sync?.lastSyncedAt || null,
    lastSyncedUserId: ownerUserId || state.sync?.lastSyncedUserId || null,
    conflicts: Array.isArray(state.sync?.conflicts) ? state.sync.conflicts : [],
    deletedRecords: COLLECTION_KEYS.reduce((acc, key) => ({
      ...acc,
      [key]: Array.isArray(state.sync?.deletedRecords?.[key]) ? state.sync.deletedRecords[key] : [],
    }), {}),
  };
}
function saveState() {
  normalizeEntityCollections(window.AppServices?.auth?.getCurrentUser?.()?.uid || null);
  window.__APP_STATE__ = state;
  if (window.AppServices?.persistence?.saveState) {
    window.AppServices.persistence.saveState(state);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
async function loadState() {
  try {
    let parsed = null;
    if (window.AppServices?.persistence?.loadState) {
      parsed = await window.AppServices.persistence.loadState();
    }
    if (!parsed) {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("app_rural_consolidada_v1");
      parsed = raw ? JSON.parse(raw) : null;
    }
    if (!parsed) return;
    Object.assign(state, {
      producers: Array.isArray(parsed.producers) ? parsed.producers : [],
      meds: Array.isArray(parsed.meds) ? parsed.meds : [],
      vaccines: Array.isArray(parsed.vaccines) ? parsed.vaccines : [],
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : [],
      procedures: Array.isArray(parsed.procedures) ? parsed.procedures : [],
      labTests: Array.isArray(parsed.labTests) ? parsed.labTests : [],
      selectedProducerId: parsed.selectedProducerId || null,
      editing: { ...state.editing, ...(parsed.editing || {}) },
      ui: { ...state.ui, ...(parsed.ui || {}) },
      draft: { ...state.draft, ...(parsed.draft || {}) },
      sync: { ...state.sync, ...(parsed.sync || {}) },
    });
    normalizeEntityCollections(parsed.sync?.lastSyncedUserId || null);
    window.__APP_STATE__ = state;
  } catch (err) {
    console.error(err);
  }
}
function queueDeletedRecord(collection, record) {
  if (!record?.id || !state.sync?.deletedRecords?.[collection]) return;
  state.sync.deletedRecords[collection].push({
    id: record.id,
    deletedAt: Date.now(),
    ownerUserId: window.AppServices?.auth?.getCurrentUser?.()?.uid || state.sync.lastSyncedUserId || null,
  });
}
function updateConnectivityBadge(isOnline) {
  const badge = $("#onlineStatusBadge");
  if (!badge) return;
  badge.textContent = isOnline ? "En línea" : "Sin conexión";
  badge.className = `pill ${isOnline ? "online" : "offline"}`;
}
function updateAuthUi(user) {
  const text = $("#authStatusText");
  const loginBtn = $("#btnGoogleLogin");
  const logoutBtn = $("#btnGoogleLogout");
  if (text) text.textContent = user ? `${user.displayName || user.email || 'Sesión iniciada'}${user.email ? ` · ${user.email}` : ''}` : "Sin sesión";
  if (loginBtn) loginBtn.hidden = Boolean(user);
  if (logoutBtn) logoutBtn.hidden = !user;
}
function getCloudCopy(status = {}, user = window.AppServices?.auth?.getCurrentUser?.() || null) {
  if (user) {
    return {
      title: 'Tu cuenta ya está conectada',
      body: 'Tu información local puede respaldarse y sincronizarse con tu cuenta.',
      local: 'Tus datos también siguen guardándose en este dispositivo.',
      localClass: 'active',
      help: 'Puedes seguir trabajando sin conexión. Cuando vuelvas a tener internet, podrás sincronizar tus cambios.'
    };
  }
  if (status.configured) {
    return {
      title: 'Inicia sesión para respaldar tu información',
      body: 'Al iniciar sesión podrás sincronizar y respaldar tu información entre dispositivos.',
      local: 'Tus datos siguen guardándose en este dispositivo.',
      localClass: 'active',
      help: 'Tu trabajo local no se pierde. La nube solo agrega respaldo y sincronización por cuenta.'
    };
  }
  return {
    title: 'Tus datos siguen guardándose en este dispositivo',
    body: 'Al iniciar sesión podrás sincronizar y respaldar tu información entre dispositivos cuando la nube esté activa.',
    local: 'Respaldo en nube pendiente. Puedes seguir usando la app normalmente.',
    localClass: 'pending',
    help: 'Puedes capturar, editar, exportar y consultar tu información sin depender de la nube.'
  };
}
function updateFirebaseConfigUi(status = {}) {
  const title = $("#firebaseConfigTitle");
  const body = $("#firebaseConfigBody");
  const local = $("#firebaseLocalStatus");
  const syncBtn = $("#btnSyncNow");
  const help = $("#syncHelp");
  const cloudCopy = getCloudCopy(status);
  const hasUser = Boolean(window.AppServices?.auth?.getCurrentUser?.());

  if (title) title.textContent = cloudCopy.title;
  if (body) body.textContent = cloudCopy.body;
  if (local) {
    local.textContent = cloudCopy.local;
    local.className = `cloud-local-status ${cloudCopy.localClass || ''}`.trim();
  }
  if (help) help.textContent = cloudCopy.help;
  if (syncBtn) {
    syncBtn.hidden = !(status.configured && hasUser);
    syncBtn.disabled = !status.configured;
    syncBtn.title = status.configured
      ? 'Sincronizar ahora'
      : 'La nube estará disponible cuando se complete la configuración interna';
  }
}
function friendlyAuthError(error) {
  const code = error?.code || '';
  if (code === 'firebase-not-configured') return 'El respaldo en nube todavía no está activo. Mientras tanto, tus datos siguen guardándose en este dispositivo.';
  if (code === 'firebase-sdk-missing') return 'La conexión con la nube no está disponible en este momento. Puedes seguir usando la app localmente.';
  if (code === 'auth/network-request-failed') return 'No fue posible conectar con Google en este momento. Revisa tu conexión e intenta de nuevo.';
  if (code === 'auth/popup-closed-by-user') return 'Se canceló el inicio de sesión antes de completarse.';
  return error?.message || 'No se pudo completar el inicio de sesión en este momento.';
}
function requestPhotoInput(inputSelector, modeLabel) {
  const input = $(inputSelector);
  if (!input) return;
  const message = modeLabel === 'camera'
    ? 'Se abrirá la cámara para tomar una foto si tu dispositivo lo permite.'
    : 'Selecciona una foto de tu dispositivo para adjuntarla.';
  input.setAttribute('aria-label', message);
  input.click();
}
function requestCurrentLocation(onSuccess) {
  if (!navigator.geolocation) {
    show('msg', 'La ubicación no está disponible en este dispositivo.', 'warning');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    (err) => show('msg', `No fue posible obtener tu ubicación. ${err.message}`, 'error'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
function updateSyncUi(status = {}) {
  const syncText = $("#syncStatusText");
  const lastSync = $("#lastSyncText");
  if (syncText && status.phase) syncText.textContent = {
    running: "Sincronizando…",
    success: `Sincronizado${status.conflicts ? ` · conflictos: ${status.conflicts}` : ''}`,
    error: `Error: ${status.error || 'falló la sincronización'}`,
  }[status.phase] || "Solo local";
  const effectiveLastSync = status.at || state.sync?.lastSyncedAt;
  if (lastSync) lastSync.textContent = effectiveLastSync ? new Date(effectiveLastSync).toLocaleString('es-MX') : 'Pendiente';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
function show(id, msg, type = "help") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || "";
  el.className = type;
  el.style.display = msg ? "block" : "none";
}
function download(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function setThumb(id, src, empty = "Sin<br/>imagen") {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = src
    ? `<img src="${src}" alt="preview">`
    : `<span>${empty}</span>`;
}
function checked(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}
function setChecked(name, value) {
  document
    .querySelectorAll(`input[name="${name}"]`)
    .forEach((i) => (i.checked = i.value === value));
}
function multiValues(sel) {
  return Array.from(sel?.selectedOptions || [])
    .map((o) => o.value)
    .filter(Boolean);
}
function setMulti(sel, values = []) {
  if (!sel) return;
  Array.from(sel.options).forEach(
    (o) => (o.selected = values.includes(o.value)),
  );
}

function getProducer() {
  return byId(state.producers, state.selectedProducerId);
}
function producerName(id) {
  return byId(state.producers, id)?.basic?.name || "Sin productor/a";
}
function currentAnimals() {
  return getProducer()?.animals || [];
}
function animalLabel(an) {
  return [
    an.species,
    an.breed,
    an.quantity ? `(${an.quantity})` : "",
    an.functionOther,
  ]
    .filter(Boolean)
    .join(" ");
}

function inventoryUsage() {
  const meds = {},
    vaccines = {},
    supplies = {};
  state.procedures.forEach((p) => {
    (p.inventory?.meds || []).forEach(
      (i) => (meds[i.itemId] = (meds[i.itemId] || 0) + Number(i.qty || 0)),
    );
    (p.inventory?.vaccines || []).forEach(
      (i) =>
        (vaccines[i.itemId] =
          (vaccines[i.itemId] || 0) + Number(i.animalsApplied || 0)),
    );
    (p.inventory?.supplies || []).forEach(
      (i) =>
        (supplies[i.itemId] = (supplies[i.itemId] || 0) + Number(i.qty || 0)),
    );
  });
  return { meds, vaccines, supplies };
}
function medRemaining(med) {
  return Math.max(
    0,
    Number(med.totalQty || 0) - (inventoryUsage().meds[med.id] || 0),
  );
}
function vaccineRemaining(vax) {
  return Math.max(
    0,
    Number(vax.coverageAnimals || 0) - (inventoryUsage().vaccines[vax.id] || 0),
  );
}
function supplyRemaining(s) {
  return s.type === "NON_DISPOSABLE"
    ? "No aplica"
    : Math.max(0, Number(s.qty || 0) - (inventoryUsage().supplies[s.id] || 0));
}
function supplyDisplayCost(s) {
  return s.type === "NON_DISPOSABLE" ? Number(s.costUse || 0) : Number(s.unitCost || 0);
}
function formatWeeklySchedule(weekly = {}) {
  return Object.entries(weekly).map(([day, hours]) => `${day}: ${hours?.start || "--"}-${hours?.end || "--"}`).join(", ");
}

function activateTab(name) {
  const map = {
    Producer: "pageProducer",
    Animals: "pageAnimals",
    Meds: "pageMeds",
    Vaccines: "pageVaccines",
    Supplies: "pageSupplies",
    Procedures: "pageProcedures",
  };
  Object.entries(map).forEach(([tab, page]) => {
    document
      .getElementById(`tab${tab}`)
      ?.classList.toggle("active", tab === name);
    document.getElementById(page)?.classList.toggle("active", tab === name);
  });
}

function bindTabs() {
  ["Producer", "Animals", "Meds", "Vaccines", "Supplies", "Procedures"].forEach((tab) =>
    $(`#tab${tab}`)?.addEventListener("click", () => activateTab(tab)),
  );
}

function collectWeeklySchedule() {
  const days = [
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
  ];
  return Object.fromEntries(
    days.map((d) => [
      d,
      {
        start: $(`#horario_${d}`)?.value || "",
        end: $(`#horario_${d}_fin`)?.value || "",
      },
    ]),
  );
}
function fillWeeklySchedule(data = {}) {
  Object.entries(data).forEach(([d, v]) => {
    if ($(`#horario_${d}`)) $(`#horario_${d}`).value = v.start || "";
    if ($(`#horario_${d}_fin`)) $(`#horario_${d}_fin`).value = v.end || "";
  });
}

function collectProducerForm() {
  return {
    id: state.editing.producerId || uid("prod"),
    basic: {
      name: $("#nombre").value.trim(),
      age: $("#edad").value,
      sex: $("#sexo").value,
      estadoCivil: $("#estadoCivil").value,
      celular: $("#celular").value.trim(),
      personasEnCasa: $("#personasEnCasa").value,
      localidad: $("#localidad").value.trim(),
      municipio: $("#municipio").value.trim(),
      estado: $("#estado").value.trim(),
      escolaridad: $("#escolaridad").value,
      escolaridadOtro: $("#escolaridadOtro").value.trim(),
      horario: $("#horario").value.trim(),
      weeklySchedule: collectWeeklySchedule(),
      sabeLeer: checked("sabeLeer"),
      sabeEscribir: checked("sabeEscribir"),
      pertenenciaIndigena: $("#pertenenciaIndigena").value,
      grupoIndigenaYo: $("#grupoIndigenaYo").value.trim(),
      grupoIndigenaFamiliarQuien: $("#grupoIndigenaFamiliarQuien").value.trim(),
      grupoIndigenaFamiliarCual: $("#grupoIndigenaFamiliarCual").value.trim(),
      lenguaIndigenaTipo: $("#lenguaIndigenaTipo").value,
      lenguaYo: $("#lenguaYo").value.trim(),
      lenguaFamiliarQuien: $("#lenguaFamiliarQuien").value.trim(),
      lenguaFamiliarCual: $("#lenguaFamiliarCual").value.trim(),
    },
    location: {
      lat: $("#lat").value.trim(),
      lng: $("#lng").value.trim(),
      mapsUrl: $("#mapsUrl").value.trim(),
    },
    photo: state.draft.producerPhoto || null,
    classification: {
      value: document.querySelector("#chipsClasificacion .chip.active")?.dataset.value || "",
      alerta: $("#alerta").value.trim(),
      notaExtraPersona: $("#notaExtraPersona").value.trim(),
    },
    family: collectFamilyRows(),
    notes: $("#notas").value.trim(),
    questionnaire: getProducerQuestionnaireSkeleton(getProducer()),
    animals: getProducer()?.animals || [],
  };
}
const FIXED_GENDER_ANIMAL_OPTIONS = [
  "Vacas",
  "Pequeños rumiantes (borregos y cabras)",
  "Caballos",
  "Burros, mulas",
  "Aves de corral",
  "Guajolotes",
  "Aves de pelea",
  "Cerdos",
  "Perros",
  "Gatos",
  "Conejos",
  "Abejas",
  "Peces",
  "Otro",
];

function normalizeQuestionnaire(questionnaire = {}) {
  return {
    diseases: Array.isArray(questionnaire.diseases) ? questionnaire.diseases : [],
    vaccines: Array.isArray(questionnaire.vaccines) ? questionnaire.vaccines : [],
    deworming: Array.isArray(questionnaire.deworming) ? questionnaire.deworming : [],
    traditional: Array.isArray(questionnaire.traditional) ? questionnaire.traditional : [],
    genderAnimals: Array.isArray(questionnaire.genderAnimals) ? questionnaire.genderAnimals : [],
    genderActivities: Array.isArray(questionnaire.genderActivities) ? questionnaire.genderActivities : [],
    importantAnimals: questionnaire.importantAnimals || [],
    importanceDetail: questionnaire.importanceDetail || "",
    tieneMilpa: questionnaire.tieneMilpa || "",
    queSiembra: questionnaire.queSiembra || "",
    escasezForraje: questionnaire.escasezForraje || "",
    lastSick: questionnaire.lastSick || "",
    recommendWho: questionnaire.recommendWho || "",
    curadorExiste: questionnaire.curadorExiste || "",
    curadorQuien: questionnaire.curadorQuien || "",
    curadorEdad: questionnaire.curadorEdad || "",
    curadorEspecies: questionnaire.curadorEspecies || "",
    curadorTiempo: questionnaire.curadorTiempo || "",
    curadorServicios: questionnaire.curadorServicios || "",
    practicasAsesoria: questionnaire.practicasAsesoria || "",
    programaRegistro: questionnaire.programaRegistro || "",
    programaNombre: questionnaire.programaNombre || "",
    programaFolioTiene: questionnaire.programaFolioTiene || "",
    folio: questionnaire.folio || "",
    futureCalls: questionnaire.futureCalls || "",
    huntingCommon: questionnaire.huntingCommon || "",
    huntingTime: questionnaire.huntingTime || "",
    huntedAnimals: questionnaire.huntedAnimals || "",
    huntingPlaces: questionnaire.huntingPlaces || "",
    huntingSeason: questionnaire.huntingSeason || "",
    huntingReasons: questionnaire.huntingReasons || "",
    wildProblems: questionnaire.wildProblems || "",
    wildProblemsDetail: questionnaire.wildProblemsDetail || "",
    riverUse: questionnaire.riverUse || "",
    riverUseFor: questionnaire.riverUseFor || "",
    riverMeaning: questionnaire.riverMeaning || "",
    riverProblems: questionnaire.riverProblems || "",
    localKnowledgeExists: questionnaire.localKnowledgeExists || "",
    localKnowledgeWho: questionnaire.localKnowledgeWho || "",
    localKnowledgeUseful: questionnaire.localKnowledgeUseful || "",
    rumiantInterest: questionnaire.rumiantInterest || "",
    rumiantInterestWhy: questionnaire.rumiantInterestWhy || "",
    hadRumiantsBefore: questionnaire.hadRumiantsBefore || "",
    noRumiantsReason: questionnaire.noRumiantsReason || "",
    rumiantAdvice: questionnaire.rumiantAdvice || "",
    rumiantNeed: questionnaire.rumiantNeed || "",
    birdsInterestYes: questionnaire.birdsInterestYes || "",
    birdsInterestNo: questionnaire.birdsInterestNo || "",
  };
}

function getProducerQuestionnaireSkeleton(prod) {
  return normalizeQuestionnaire(prod?.questionnaire || {});
}
function collectFamilyRows() {
  return $$("#familyTbody tr").map((tr) => ({
    id: tr.dataset.id || uid("fam"),
    name: tr.querySelector('[data-k="name"]')?.value || "",
    relation: tr.querySelector('[data-k="relation"]')?.value || "",
    age: tr.querySelector('[data-k="age"]')?.value || "",
    occupation: tr.querySelector('[data-k="occupation"]')?.value || "",
  }));
}
function addFamilyRow(item = {}) {
  const tr = document.createElement("tr");
  tr.dataset.id = item.id || uid("fam");
  tr.innerHTML = `<td><input data-k="name" value="${esc(item.name)}"></td><td><input data-k="relation" value="${esc(item.relation)}"></td><td><input data-k="age" value="${esc(item.age)}"></td><td><input data-k="occupation" value="${esc(item.occupation)}"></td><td><button class="btn small bad" type="button">Quitar</button></td>`;
  tr.querySelector("button").addEventListener("click", () => tr.remove());
  $("#familyTbody")?.appendChild(tr);
}
function resetProducerForm() {
  $("#producerForm").reset();
  $("#formTitle").textContent = "Nuevo productor(a)";
  state.editing.producerId = null;
  state.draft.producerPhoto = null;
  setThumb("photoPreview", null, "Sin<br/>foto");
  $("#familyTbody").innerHTML = "";
  document
    .querySelectorAll("#chipsClasificacion .chip")
    .forEach((ch) => { ch.classList.remove("active"); ch.setAttribute("aria-pressed", "false"); });
  fillWeeklySchedule({});
}
function fillProducerForm(prod) {
  resetProducerForm();
  state.editing.producerId = prod.id;
  $("#formTitle").textContent = `Editar productor(a): ${prod.basic.name}`;
  const b = prod.basic || {};
  Object.entries({
    nombre: b.name,
    edad: b.age,
    sexo: b.sex,
    estadoCivil: b.estadoCivil,
    celular: b.celular,
    personasEnCasa: b.personasEnCasa,
    localidad: b.localidad,
    municipio: b.municipio,
    estado: b.estado,
    escolaridad: b.escolaridad,
    escolaridadOtro: b.escolaridadOtro,
    horario: b.horario,
    pertenenciaIndigena: b.pertenenciaIndigena,
    grupoIndigenaYo: b.grupoIndigenaYo,
    grupoIndigenaFamiliarQuien: b.grupoIndigenaFamiliarQuien,
    grupoIndigenaFamiliarCual: b.grupoIndigenaFamiliarCual,
    lenguaIndigenaTipo: b.lenguaIndigenaTipo,
    lenguaYo: b.lenguaYo,
    lenguaFamiliarQuien: b.lenguaFamiliarQuien,
    lenguaFamiliarCual: b.lenguaFamiliarCual,
    lat: prod.location?.lat,
    lng: prod.location?.lng,
    mapsUrl: prod.location?.mapsUrl,
    alerta: prod.classification?.alerta,
    notaExtraPersona: prod.classification?.notaExtraPersona,
    notas: prod.notes,
  }).forEach(([k, v]) => {
    if (document.getElementById(k)) document.getElementById(k).value = safe(v);
  });
  setChecked("sabeLeer", b.sabeLeer || "SI");
  setChecked("sabeEscribir", b.sabeEscribir || "SI");
  fillWeeklySchedule(b.weeklySchedule || {});
  state.draft.producerPhoto = prod.photo || null;
  setThumb("photoPreview", prod.photo, "Sin<br/>foto");
  (prod.family || []).forEach(addFamilyRow);
  document
    .querySelectorAll("#chipsClasificacion .chip")
    .forEach((ch) => {
      const active = ch.dataset.value === (prod.classification?.value || "");
      ch.classList.toggle("active", active);
      ch.setAttribute("aria-pressed", active ? "true" : "false");
    });
  updateProducerConditionalFields();
}
function saveProducer(e) {
  e?.preventDefault?.();
  const prod = collectProducerForm();
  if (!prod.basic.name) {
    show("err", "El nombre del productor(a) es obligatorio.", "error");
    return;
  }
  const idx = state.producers.findIndex((x) => x.id === prod.id);
  if (idx >= 0) state.producers[idx] = prod;
  else state.producers.unshift(prod);
  state.selectedProducerId = prod.id;
  saveState();
  renderAll();
  resetProducerForm();
  show("ok", "Productor(a) guardado correctamente.", "success");
}
function renderProducerList() {
  const list = $("#producerList");
  if (!list) return;
  list.innerHTML = "";
  $("#count").textContent = state.producers.length;
  state.producers.forEach((prod) => {
    const animals = (prod.animals || []).length;
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h3>${esc(prod.basic.name)}</h3><div class="line"><b>Ubicación:</b> ${esc([prod.basic.localidad, prod.basic.municipio, prod.basic.estado].filter(Boolean).join(", "))}</div><div class="line"><b>Animales registrados:</b> ${animals}</div><div class="line"><b>Clasificación:</b> ${esc(prod.classification?.value || "Sin definir")}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Seleccionar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, select, w, e, del] = item.querySelectorAll("button");
    edit.onclick = () => fillProducerForm(prod);
    select.onclick = () => {
      state.selectedProducerId = prod.id;
      saveState();
      renderAll();
      activateTab("Animals");
    };
    w.onclick = () =>
      exportWord(
        `productor_${slug(prod.basic.name)}.doc`,
        producerWordHtml(prod),
      );
    e.onclick = () =>
      exportExcel(
        `productor_${slug(prod.basic.name)}.xls`,
        producerExcelSheets([prod], [], [], [], []),
      );
    del.onclick = () => {
      if (confirm("¿Eliminar productor(a) y sus animales relacionados?")) {
        queueDeletedRecord("producers", prod);
        (state.procedures || []).filter((p) => p.producerId === prod.id).forEach((p) => queueDeletedRecord("procedures", p));
        state.producers = state.producers.filter((x) => x.id !== prod.id);
        state.procedures = state.procedures.filter((p) => p.producerId !== prod.id);
        if (state.selectedProducerId === prod.id)
          state.selectedProducerId = state.producers[0]?.id || null;
        saveState();
        renderAll();
      }
    };
    list.appendChild(item);
  });
}
function updateProducerConditionalFields() {
  $("#grupoIndigenaYoWrap").style.display =
    $("#pertenenciaIndigena").value === "YO" ? "block" : "none";
  $("#grupoIndigenaFamiliarWrap").style.display =
    $("#pertenenciaIndigena").value === "FAMILIAR" ? "grid" : "none";
  $("#lenguaYoWrap").style.display =
    $("#lenguaIndigenaTipo").value === "YO" ? "block" : "none";
  $("#lenguaFamiliarWrap").style.display =
    $("#lenguaIndigenaTipo").value === "FAMILIAR" ? "grid" : "none";
}
function bindProducer() {
  $("#producerForm")?.addEventListener("submit", saveProducer);
  $("#btnSave")?.addEventListener("click", saveProducer);
  $("#btnReset")?.addEventListener("click", resetProducerForm);
  $("#btnCancelEdit")?.addEventListener("click", resetProducerForm);
  $("#btnAddFamily")?.addEventListener("click", () => addFamilyRow());
  $("#pertenenciaIndigena")?.addEventListener(
    "change",
    updateProducerConditionalFields,
  );
  $("#lenguaIndigenaTipo")?.addEventListener(
    "change",
    updateProducerConditionalFields,
  );
  document.querySelectorAll("#chipsClasificacion .chip").forEach((ch) =>
    ch.addEventListener("click", () => {
      document
        .querySelectorAll("#chipsClasificacion .chip")
        .forEach((x) => { x.classList.remove("active"); x.setAttribute("aria-pressed", "false"); });
      ch.classList.add("active");
      ch.setAttribute("aria-pressed", "true");
    }),
  );
  ["fotoTomar", "fotoElegir"].forEach((id) =>
    document.getElementById(id)?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      state.draft.producerPhoto = await fileToBase64(f);
      setThumb("photoPreview", state.draft.producerPhoto, "Sin<br/>foto");
      e.target.value = "";
    }),
  );
  $("#btnTakePhoto")?.addEventListener("click", () => requestPhotoInput("#fotoTomar", 'camera'));
  $("#btnPickPhoto")?.addEventListener("click", () => requestPhotoInput("#fotoElegir", 'gallery'));
  $("#btnRemovePhoto")?.addEventListener("click", () => {
    state.draft.producerPhoto = null;
    setThumb("photoPreview", null, "Sin<br/>foto");
  });
  $("#btnGeo")?.addEventListener("click", () => {
    requestCurrentLocation((pos) => {
      $("#lat").value = pos.coords.latitude.toFixed(6);
      $("#lng").value = pos.coords.longitude.toFixed(6);
      const url = `https://www.google.com/maps?q=${$("#lat").value},${$("#lng").value}`;
      $("#mapsUrl").value = url;
      window.open(url, "_blank", "noopener");
    });
  });
  $("#btnGenMaps")?.addEventListener("click", () => {
    const lat = $("#lat").value.trim(),
      lng = $("#lng").value.trim();
    const url = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : "";
    $("#mapsUrl").value = url;
    if (url) window.open(url, "_blank", "noopener");
  });
  $("#btnOpenMaps")?.addEventListener("click", () => {
    const url = $("#mapsUrl").value.trim();
    if (url) window.open(url, "_blank", "noopener");
  });
  $("#btnClearLocation")?.addEventListener("click", () => {
    ["lat", "lng", "mapsUrl"].forEach((id) => ($("#" + id).value = ""));
  });
}

function renderAnimalsProducerSelect() {
  const sel = $("#animalsProducerSelect");
  if (!sel) return;
  const prev = state.selectedProducerId || sel.value;
  sel.innerHTML =
    '<option value="">— Selecciona productor(a) —</option>' +
    state.producers
      .map((p) => `<option value="${p.id}">${esc(p.basic.name)}</option>`)
      .join("");
  sel.value = prev || "";
  state.selectedProducerId = sel.value || state.selectedProducerId;
  const prod = getProducer();
  $("#animalsProducerHint").textContent = prod
    ? `Trabajando con ${prod.basic.name}. Animales registrados: ${(prod.animals || []).length}.`
    : "Selecciona un productor(a) para registrar y editar animales.";
}
function serializeAnimal() {
  return {
    id: state.editing.animalId || uid("animal"),
    species: $("#a_especie").value.trim(),
    breed: $("#a_raza").value.trim(),
    quantity: $("#a_cantidad").value,
    owner: multiValues($("#a_dueno")),
    decideSale: multiValues($("#a_decideVenta")),
    feedClean: multiValues($("#a_limpiaAlimenta")),
    function: multiValues($("#a_funcion")),
    functionOther: $("#a_funcionOtro").value.trim(),
    housing: $("#a_viven").value.trim(),
    feedType: $("#a_feedType").value.trim(),
    photos: [...state.draft.animalPhotos],
  };
}
function resetAnimalEntry() {
  state.editing.animalId = null;
  [
    "a_especie",
    "a_raza",
    "a_cantidad",
    "a_viven",
    "a_feedType",
    "a_funcionOtro",
  ].forEach((id) => ($("#" + id).value = ""));
  ["#a_dueno", "#a_decideVenta", "#a_limpiaAlimenta", "#a_funcion"].forEach(
    (sel) => setMulti($(sel), []),
  );
  state.draft.animalPhotos = [];
  renderAnimalPhotos();
}
function fillAnimalEntry(an) {
  resetAnimalEntry();
  state.editing.animalId = an.id;
  Object.entries({
    a_especie: an.species,
    a_raza: an.breed,
    a_cantidad: an.quantity,
    a_viven: an.housing,
    a_feedType: an.feedType,
    a_funcionOtro: an.functionOther,
  }).forEach(([k, v]) => ($("#" + k).value = safe(v)));
  setMulti($("#a_dueno"), an.owner || []);
  setMulti($("#a_decideVenta"), an.decideSale || []);
  setMulti($("#a_limpiaAlimenta"), an.feedClean || []);
  setMulti($("#a_funcion"), an.function || []);
  state.draft.animalPhotos = [...(an.photos || [])];
  renderAnimalPhotos();
}
function saveAnimalGroup() {
  const prod = getProducer();
  if (!prod) {
    show("a_msg", "Primero selecciona un productor(a).", "warning");
    return;
  }
  const animal = serializeAnimal();
  if (!animal.species || !animal.quantity) {
    show("a_msg", "Especie y cantidad son obligatorias.", "error");
    return;
  }
  prod.animals = Array.isArray(prod.animals) ? prod.animals : [];
  const idx = prod.animals.findIndex((x) => x.id === animal.id);
  if (idx >= 0) prod.animals[idx] = animal;
  else prod.animals.unshift(animal);
  saveState();
  renderAll();
  resetAnimalEntry();
  show(
    "a_msg",
    "Grupo/animal guardado y vinculado al productor(a).",
    "success",
  );
}
function renderAnimalPeopleSelects() {
  const prod = getProducer();
  const options = [
    { v: "PRODUCTOR", t: "Productor(a)" },
    ...(prod?.family || []).map((f) => ({
      v: f.name,
      t: `${f.name} (${f.relation || "familia"})`,
    })),
    { v: "VETERINARIO", t: "Veterinario(a)" },
    { v: "OTRO", t: "Otro" },
  ];
  ["#a_dueno", "#a_decideVenta", "#a_limpiaAlimenta"].forEach((sel) => {
    const el = $(sel);
    const prev = multiValues(el);
    el.innerHTML = options
      .map((o) => `<option value="${esc(o.v)}">${esc(o.t)}</option>`)
      .join("");
    setMulti(el, prev);
  });
  ["#a_vaxWho", "#a_dewormWho"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    const prev = el.value;
    el.innerHTML =
      '<option value="">— Selecciona —</option>' +
      options
        .map((o) => `<option value="${esc(o.v)}">${esc(o.t)}</option>`)
        .join("");
    el.value = prev;
  });
}
function renderAnimalBasedSelects() {
  const prod = getProducer();
  const animals = prod?.animals || [];
  [
    "#a_animalesImportantes",
    "#a_enfAnimal",
    "#a_vaxAnimal",
    "#a_dewormAnimal",
  ].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    const prev = el.multiple ? multiValues(el) : el.value;
    el.innerHTML =
      (el.multiple ? "" : '<option value="">— Selecciona —</option>') +
      animals
        .map(
          (a) =>
            `<option value="${esc(animalLabel(a))}">${esc(animalLabel(a))}</option>`,
        )
        .join("");
    if (el.multiple) setMulti(el, prev);
    else el.value = prev;
  });
  const genderAnimalSelect = $("#a_genderAnimal");
  if (genderAnimalSelect) {
    const prev = genderAnimalSelect.value;
    genderAnimalSelect.innerHTML =
      '<option value="">— Selecciona —</option>' +
      FIXED_GENDER_ANIMAL_OPTIONS.map(
        (animal) => `<option value="${esc(animal)}">${esc(animal)}</option>`,
      ).join("");
    genderAnimalSelect.value = prev;
  }
  const hasBirds = animals.some((a) =>
    /ave|pollo|gallina|guajolote|pato|codorniz/i.test(a.species || ""),
  );
  $("#a_interestBirdsYesWrap").style.display = hasBirds ? "block" : "none";
  $("#a_interestBirdsNoWrap").style.display = hasBirds ? "none" : "block";
  const hasRumiants = animals.some((a) =>
    /borrego|oveja|cabra|chivo/i.test(a.species || ""),
  );
  $("#a_interestRumiants").closest("div").style.display = hasRumiants
    ? "none"
    : "block";
}
async function bindAnimalPhotos() {
  ["a_instTake", "a_instPick"].forEach((id) =>
    document.getElementById(id)?.addEventListener("change", async (e) => {
      for (const file of Array.from(e.target.files || [])) {
        state.draft.animalPhotos.push(await fileToBase64(file));
      }
      renderAnimalPhotos();
      e.target.value = "";
    }),
  );
  $("#a_btnInstTake")?.addEventListener("click", () =>
    requestPhotoInput("#a_instTake", 'camera'),
  );
  $("#a_btnInstPick")?.addEventListener("click", () =>
    requestPhotoInput("#a_instPick", 'gallery'),
  );
  $("#a_btnInstClear")?.addEventListener("click", () => {
    state.draft.animalPhotos = [];
    renderAnimalPhotos();
  });
}
function renderAnimalPhotos() {
  const box = $("#a_instPreview");
  if (!box) return;
  box.innerHTML = state.draft.animalPhotos.length
    ? state.draft.animalPhotos
        .map(
          (src, i) =>
            `<div class="preview-mini"><img src="${src}" alt="animal ${i + 1}"></div>`,
        )
        .join("")
    : '<div class="preview-box"><span>Sin<br/>fotos</span></div>';
  $("#a_instHint").textContent =
    `${state.draft.animalPhotos.length} foto(s) en borrador.`;
}
function renderAnimalGroups() {
  const list = $("#a_list");
  if (!list) return;
  list.innerHTML = "";
  currentAnimals().forEach((an) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<h4>${esc(animalLabel(an))}</h4><div class="line"><b>Función:</b> ${esc((an.function || []).concat(an.functionOther ? [an.functionOther] : []).join(", "))}</div><div class="line"><b>Instalaciones:</b> ${esc(an.housing)}</div><div class="line"><b>Relación productor(a):</b> ${esc(producerName(state.selectedProducerId))}</div><div class="preview-grid">${(
      an.photos || []
    )
      .slice(0, 4)
      .map((p) => `<div class="preview-mini"><img src="${p}" alt="foto"></div>`)
      .join(
        "",
      )}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, del] = div.querySelectorAll("button");
    edit.onclick = () => fillAnimalEntry(an);
    del.onclick = () => {
      const prod = getProducer();
      prod.animals = prod.animals.filter((x) => x.id !== an.id);
      (state.procedures || []).filter((p) => p.animalId === an.id).forEach((p) => queueDeletedRecord("procedures", p));
      state.procedures = state.procedures.filter((p) => p.animalId !== an.id);
      saveState();
      renderAll();
    };
    list.appendChild(div);
  });
}
function addQuestionnaireItem(key, item) {
  const prod = getProducer();
  if (!prod) return;
  prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
  prod.questionnaire[key].push(item);
  saveState();
  renderAll();
}
function renderSimpleList(listId, arr, titleFn) {
  const list = $(listId);
  if (!list) return;
  list.innerHTML = "";
  arr.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="line">${esc(titleFn(item))}</div>`;
    list.appendChild(div);
  });
}
function saveAnimalQuestionnaireFull() {
  const prod = getProducer();
  if (!prod) {
    show("a_msg", "Selecciona un productor(a).", "warning");
    return;
  }
  prod.questionnaire = {
    ...getProducerQuestionnaireSkeleton(prod),
    importantAnimals: multiValues($("#a_animalesImportantes")),
    importanceDetail: $("#a_importanciaDetalle").value.trim(),
    tieneMilpa: $("#a_tieneMilpa").value,
    queSiembra: $("#a_queSiembra").value.trim(),
    escasezForraje: $("#a_escasezForraje").value.trim(),
    lastSick: $("#a_lastSick").value,
    recommendWho: $("#a_recommendWho").value.trim(),
    curadorExiste: $("#a_curadorExiste").value,
    curadorQuien: $("#a_curadorQuien").value.trim(),
    curadorEdad: $("#a_curadorEdad").value.trim(),
    curadorEspecies: $("#a_curadorEspecies").value.trim(),
    curadorTiempo: $("#a_curadorTiempo").value.trim(),
    curadorServicios: $("#a_curadorServicios").value.trim(),
    practicasAsesoria: $("#a_practicasAsesoria").value,
    programaRegistro: $("#a_programaRegistro").value,
    programaNombre: $("#a_programaNombre").value,
    programaFolioTiene: $("#a_programaFolioTiene").value,
    folio: $("#a_programaFolio").value.trim(),
    futureCalls: $("#a_programaConvocatorias").value.trim(),
    huntingCommon: $("#a_cazaComunidad").value,
    huntingTime: $("#a_cazaTiempo").value.trim(),
    huntedAnimals: $("#a_cazaAnimales").value.trim(),
    huntingPlaces: $("#a_cazaLugares").value.trim(),
    huntingSeason: $("#a_cazaEpoca").value.trim(),
    huntingReasons: $("#a_cazaMotivos").value.trim(),
    wildProblems: $("#a_silvestresProblemas").value,
    wildProblemsDetail: $("#a_silvestresQuePaso").value.trim(),
    riverUse: $("#a_rioUso").value,
    riverUseFor: $("#a_rioParaQue").value.trim(),
    riverMeaning: $("#a_rioSignificado").value.trim(),
    riverProblems: $("#a_rioProblemas").value.trim(),
    localKnowledgeExists: $("#a_saberesLocales").value,
    localKnowledgeWho: $("#a_saberesQuien").value.trim(),
    localKnowledgeUseful: $("#a_saberesUtilidad").value.trim(),
    rumiantInterest: $("#a_interestRumiants").value,
    rumiantInterestWhy: $("#a_interestRumiantsWhy").value.trim(),
    hadRumiantsBefore: $("#a_hadRumiantsBefore").value,
    noRumiantsReason: $("#a_noRumiantsWhy").value.trim(),
    rumiantAdvice: $("#a_rumiantsAdvice").value,
    rumiantNeed: $("#a_rumiantsNeed").value.trim(),
    birdsInterestYes: $("#a_interestBirdsYes").value,
    birdsInterestNo: $("#a_interestBirdsNo").value,
    diseases: getProducerQuestionnaireSkeleton(prod).diseases,
    vaccines: getProducerQuestionnaireSkeleton(prod).vaccines,
    deworming: getProducerQuestionnaireSkeleton(prod).deworming,
    traditional: getProducerQuestionnaireSkeleton(prod).traditional,
    genderAnimals: getProducerQuestionnaireSkeleton(prod).genderAnimals,
    genderActivities: getProducerQuestionnaireSkeleton(prod).genderActivities,
  };
  saveState();
  renderAll();
  show("a_msg", "Cuestionario de animales guardado.", "success");
}
function fillAnimalQuestionnaire() {
  const q = getProducer()?.questionnaire;
  if (!q) return;
  const map = {
    a_importanciaDetalle: q.importanceDetail,
    a_tieneMilpa: q.tieneMilpa,
    a_queSiembra: q.queSiembra,
    a_escasezForraje: q.escasezForraje,
    a_lastSick: q.lastSick,
    a_recommendWho: q.recommendWho,
    a_curadorExiste: q.curadorExiste,
    a_curadorQuien: q.curadorQuien,
    a_curadorEdad: q.curadorEdad,
    a_curadorEspecies: q.curadorEspecies,
    a_curadorTiempo: q.curadorTiempo,
    a_curadorServicios: q.curadorServicios,
    a_practicasAsesoria: q.practicasAsesoria,
    a_programaRegistro: q.programaRegistro,
    a_programaNombre: q.programaNombre,
    a_programaFolioTiene: q.programaFolioTiene,
    a_programaFolio: q.folio,
    a_programaConvocatorias: q.futureCalls,
    a_cazaComunidad: q.huntingCommon,
    a_cazaTiempo: q.huntingTime,
    a_cazaAnimales: q.huntedAnimals,
    a_cazaLugares: q.huntingPlaces,
    a_cazaEpoca: q.huntingSeason,
    a_cazaMotivos: q.huntingReasons,
    a_silvestresProblemas: q.wildProblems,
    a_silvestresQuePaso: q.wildProblemsDetail,
    a_rioUso: q.riverUse,
    a_rioParaQue: q.riverUseFor,
    a_rioSignificado: q.riverMeaning,
    a_rioProblemas: q.riverProblems,
    a_saberesLocales: q.localKnowledgeExists,
    a_saberesQuien: q.localKnowledgeWho,
    a_saberesUtilidad: q.localKnowledgeUseful,
    a_interestRumiants: q.rumiantInterest,
    a_interestRumiantsWhy: q.rumiantInterestWhy,
    a_hadRumiantsBefore: q.hadRumiantsBefore,
    a_noRumiantsWhy: q.noRumiantsReason,
    a_rumiantsAdvice: q.rumiantAdvice,
    a_rumiantsNeed: q.rumiantNeed,
    a_interestBirdsYes: q.birdsInterestYes,
    a_interestBirdsNo: q.birdsInterestNo,
  };
  Object.entries(map).forEach(([k, v]) => {
    if ($("#" + k)) $("#" + k).value = safe(v);
  });
  setMulti($("#a_animalesImportantes"), q.importantAnimals || []);
  renderSimpleList(
    "#a_diseaseList",
    q.diseases || [],
    (x) => `${x.date || ""} · ${x.animal || ""} · ${x.problem || ""}`,
  );
  renderSimpleList(
    "#a_vaxList",
    q.vaccines || [],
    (x) => `${x.date || ""} · ${x.animal || ""} · ${x.name || ""}`,
  );
  renderSimpleList(
    "#a_dewormList",
    q.deworming || [],
    (x) => `${x.date || ""} · ${x.animal || ""} · ${x.product || ""}`,
  );
  renderSimpleList(
    "#a_tradList",
    q.traditional || [],
    (x) => `${x.name || ""} · ${x.use || ""}`,
  );
  renderSimpleList(
    "#a_genderAnimalList",
    q.genderAnimals || [],
    (x) => `${x.animal || ""} · ${x.who || ""}`,
  );
  renderSimpleList(
    "#a_generoActividadList",
    q.genderActivities || [],
    (x) => `${x.activity || ""} · ${x.sex || ""}`,
  );
}
function bindAnimals() {
  bindAnimalPhotos();
  $("#animalsProducerSelect")?.addEventListener("change", () => {
    state.selectedProducerId = $("#animalsProducerSelect").value || null;
    saveState();
    renderAll();
  });
  $("#btnAnimalsSyncProducer")?.addEventListener("click", () => renderAll());
  $("#a_save")?.addEventListener("click", saveAnimalGroup);
  $("#a_clear")?.addEventListener("click", resetAnimalEntry);
  $("#btnSaveAnimalsFull")?.addEventListener(
    "click",
    saveAnimalQuestionnaireFull,
  );
  $("#a_addDisease")?.addEventListener("click", () =>
    addQuestionnaireItem("diseases", {
      id: uid("dis"),
      date: $("#a_lastSick").value,
      animal: $("#a_enfAnimal").value,
      problem: $("#a_commonDis").value,
      signs: $("#a_signs").value,
      treatment: $("#a_whenSickDo").value,
    }),
  );
  $("#a_addVax")?.addEventListener("click", () =>
    addQuestionnaireItem("vaccines", {
      id: uid("vaxr"),
      animal: $("#a_vaxAnimal").value,
      name: $("#a_vaxName").value,
      date: $("#a_vaxDate").value,
      who: $("#a_vaxWho").value,
    }),
  );
  $("#a_addDeworm")?.addEventListener("click", () =>
    addQuestionnaireItem("deworming", {
      id: uid("dwr"),
      animal: $("#a_dewormAnimal").value,
      product: $("#a_dewormProd").value,
      date: $("#a_dewormDate").value,
      who: $("#a_dewormWho").value,
    }),
  );
  $("#a_addTrad")?.addEventListener("click", () =>
    addQuestionnaireItem("traditional", {
      id: uid("trad"),
      name: $("#a_tradNombre").value,
      type: $("#a_tradTipo").value,
      use: $("#a_tradUso").value,
      part: $("#a_tradParte").value,
    }),
  );
  $("#a_addGenderAnimal")?.addEventListener("click", () =>
    addQuestionnaireItem("genderAnimals", {
      id: uid("ga"),
      animal: $("#a_genderAnimal").value,
      who: $("#a_genderAnimalWho").value,
      why: $("#a_genderAnimalWhy").value,
    }),
  );
  $("#a_addGeneroActividad")?.addEventListener("click", () =>
    addQuestionnaireItem("genderActivities", {
      id: uid("act"),
      activity: $("#a_actividadGenero").value,
      sex: $("#a_actividadGeneroSexo").value,
      reason: $("#a_actividadGeneroRazon").value,
    }),
  );
}

function renderMedMode() {
  const isChat = state.ui.medMode === "CHATGPT";
  $("#chatgptBlock").style.display = isChat ? "block" : "none";
  $("#m_modeHint").textContent =
    `Modo actual: ${isChat ? "🪄 ChatGPT" : "✍️ Manual"}`;
  $("#m_modeManual").classList.toggle("ghost", isChat);
  $("#m_modeChatGPT").classList.toggle("ghost", !isChat);
}
function medOwnerLabel(v) {
  return v === "DRA_ANA_ROSA"
    ? "Dra. Ana Rosa"
    : v === "SERVICIOS"
      ? "Servicios"
      : v || "";
}
function collectMed() {
  const id = state.editing.medId || uid("med");
  const totalQty = Number($("#m_totalQty").value || 0);
  const cost = Number($("#m_cost").value || 0);
  return {
    id,
    brand: $("#m_brand").value.trim(),
    active: $("#m_active").value.trim(),
    owner: $("#m_owner").value,
    presentation: $("#m_presentation").value.trim(),
    cost,
    expiry: $("#m_expiry").value,
    totalQty,
    unit: $("#m_unit").value.trim(),
    unitCost: totalQty ? cost / totalQty : 0,
    anaRosaCharge: Number($("#m_anaRosaCharge").value || 0),
    photos: { rx: state.draft.medRxPhoto, ticket: state.draft.medTicketPhoto },
    clinical: {
      use: $("#m_use").value.trim(),
      mech: $("#m_mech").value.trim(),
      adverse: $("#m_adverse").value.trim(),
      preg: $("#m_preg").value.trim(),
      pk: $("#m_pk").value.trim(),
      overdose: $("#m_overdose").value.trim(),
      interactions: $("#m_interactions").value.trim(),
      dosing: $("#m_dosing").value.trim(),
    }
  };
}
function saveMed() {
  const med = collectMed();
  if (!med.brand || !med.active) {
    show(
      "m_err",
      "Nombre comercial y sustancia activa son obligatorios.",
      "error",
    );
    return;
  }
  const idx = state.meds.findIndex((x) => x.id === med.id);
  if (idx >= 0) state.meds[idx] = med;
  else state.meds.unshift(med);
  saveState();
  renderAll();
  resetMed();
  show("m_ok", "Medicamento guardado correctamente.", "success");
}
function resetMed() {
  state.editing.medId = null;
  $("#medForm").reset();
  state.draft.medRxPhoto = null;
  state.draft.medTicketPhoto = null;
  setThumb("m_rx_preview", null, "Sin<br/>receta");
  setThumb("m_tk_preview", null, "Sin<br/>ticket");
  renderMedMode();
}
function fillMed(m) {
  resetMed();
  state.editing.medId = m.id;
  Object.entries({
    m_brand: m.brand,
    m_active: m.active,
    m_owner: m.owner,
    m_presentation: m.presentation,
    m_cost: m.cost,
    m_expiry: m.expiry,
    m_totalQty: m.totalQty,
    m_unit: m.unit,
    m_unitCost: m.unitCost,
    m_anaRosaCharge: m.anaRosaCharge,
    m_use: m.clinical?.use,
    m_mech: m.clinical?.mech,
    m_adverse: m.clinical?.adverse,
    m_preg: m.clinical?.preg,
    m_pk: m.clinical?.pk,
    m_overdose: m.clinical?.overdose,
    m_interactions: m.clinical?.interactions,
    m_dosing: m.clinical?.dosing,
  }).forEach(([k, v]) => {
    if ($("#" + k)) $("#" + k).value = safe(v);
  });
  state.draft.medRxPhoto = m.photos?.rx || null;
  state.draft.medTicketPhoto = m.photos?.ticket || null;
  setThumb("m_rx_preview", state.draft.medRxPhoto, "Sin<br/>receta");
  setThumb("m_tk_preview", state.draft.medTicketPhoto, "Sin<br/>ticket");
}
function renderMedList() {
  const list = $("#m_list");
  if (!list) return;
  list.innerHTML = "";
  const usage = inventoryUsage();
  const anaRosaDue = state.meds
    .filter((m) => m.owner === "DRA_ANA_ROSA")
    .reduce((acc, m) => acc + (m.anaRosaCharge || 0), 0);
  const head = document.createElement("div");
  head.className = "item";
  head.innerHTML = `<div class="kpi-grid"><div class="stat"><b>Medicamentos</b><div>${state.meds.length}</div></div><div class="stat"><b>Vacunas</b><div>${state.vaccines.length}</div></div><div class="stat"><b>Reintegrar a Dra. Ana Rosa</b><div>${money(anaRosaDue)}</div></div></div>`;
  list.appendChild(head);
  state.meds.forEach((m) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h4>${esc(m.brand)} · ${esc(m.active)}</h4><div class="line"><b>Propiedad:</b> ${esc(medOwnerLabel(m.owner))}</div><div class="line"><b>Stock disponible:</b> ${medRemaining(m)} ${esc(m.unit)}</div><div class="line"><b>Costo unitario:</b> ${money(m.unitCost)}</div><div class="line"><b>Cobrado por medicamento Ana Rosa:</b> ${money(m.anaRosaCharge)}</div><div class="line"><b>Ficha clínica:</b> ${esc(m.clinical?.use || "Sin captura clínica")}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, w, e, del] = item.querySelectorAll("button");
    edit.onclick = () => fillMed(m);
    w.onclick = () =>
      exportWord(
        `med_${slug(m.brand)}.doc`,
        `<h1>${esc(m.brand)}</h1><p><b>Sustancia activa:</b> ${esc(m.active)}</p><p><b>Stock:</b> ${medRemaining(m)} ${esc(m.unit)}</p>`,
      );
    e.onclick = () =>
      exportExcel(
        `med_${slug(m.brand)}.xls`,
        producerExcelSheets(
          [],
          [],
          [m],
          state.vaccines.filter((x) => x.medId === m.id),
          [],
        ),
      );
    del.onclick = () => {
      queueDeletedRecord("meds", m);
      state.vaccines.filter((x) => x.medId === m.id).forEach((v) => queueDeletedRecord("vaccines", v));
      state.meds = state.meds.filter((x) => x.id !== m.id);
      state.vaccines = state.vaccines.filter((x) => x.medId !== m.id);
      saveState();
      renderAll();
    };
    list.appendChild(item);
  });
}
function bindMeds() {
  renderMedMode();
  $("#m_modeManual")?.addEventListener("click", () => {
    state.ui.medMode = "MANUAL";
    renderMedMode();
    saveState();
  });
  $("#m_modeChatGPT")?.addEventListener("click", () => {
    state.ui.medMode = "CHATGPT";
    renderMedMode();
    saveState();
  });
  ["m_totalQty", "m_cost"].forEach((id) =>
    $("#" + id)?.addEventListener("input", () => {
      const total = Number($("#m_totalQty").value || 0),
        cost = Number($("#m_cost").value || 0);
      $("#m_unitCost").value = total ? (cost / total).toFixed(2) : "";
    }),
  );
  $("#ai_makePrompt")?.addEventListener("click", () => {
    const source = $("#ai_english").value.trim();
    const prompt = `Analiza este texto de medicamento veterinario y devuelve exclusivamente JSON válido con las llaves use, mech, adverse, preg, pk, overdose, interactions, dosing. Resume en español, conserva dosis prácticas y advertencias. Texto fuente: ${source}`;
    $("#ai_prompt").value = prompt;
  });
  $("#ai_copyPrompt")?.addEventListener("click", () =>
    navigator.clipboard.writeText($("#ai_prompt").value),
  );
  $("#ai_openChatGPT")?.addEventListener("click", () =>
    window.open("https://chatgpt.com/", "_blank", "noopener"),
  );
  $("#ai_runAnalysis")?.addEventListener("click", runMedicationChatGPTAnalysis);
  $("#ai_fillFromJson")?.addEventListener("click", () => {
    try {
      const j = JSON.parse($("#ai_result").value);
      Object.entries({
        m_use: j.use,
        m_mech: j.mech,
        m_adverse: j.adverse,
        m_preg: j.preg,
        m_pk: j.pk,
        m_overdose: j.overdose,
        m_interactions: j.interactions,
        m_dosing: j.dosing,
      }).forEach(([k, v]) => ($("#" + k).value = safe(v)));
      show("ai_status", "JSON aplicado correctamente.", "success");
    } catch (err) {
      show("ai_status", "JSON inválido.", "error");
    }
  });
  $("#ai_copyExample")?.addEventListener("click", async () => {
    const example = JSON.stringify({ use: "Para control antiparasitario", mech: "Actúa sobre canales iónicos", adverse: "Puede causar depresión o vómito", preg: "Usar con criterio veterinario", pk: "Absorción lenta y vida media prolongada", overdose: "Neurológico", interactions: "Precaución con otros lactonas macrocíclicas", dosing: "Según peso vivo y especie" }, null, 2);
    $("#ai_result").value = example;
    await navigator.clipboard.writeText(example);
    show("ai_status", "Ejemplo JSON copiado y pegado en el resultado.", "success");
  });
  $("#ai_clearAll")?.addEventListener("click", () => {
    ["ai_apiKey", "ai_model", "ai_english", "ai_prompt", "ai_result"].forEach(
      (id) => { if ($("#" + id)) $("#" + id).value = id === "ai_model" ? "gpt-4o-mini" : ""; },
    );
    show("ai_status", "", "help");
  });
  ["m_rx_take", "m_rx_pick", "m_tk_take", "m_tk_pick"].forEach((id) =>
    $("#" + id)?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const data = await fileToBase64(f);
      if (id.startsWith("m_rx")) state.draft.medRxPhoto = data;
      else state.draft.medTicketPhoto = data;
      setThumb("m_rx_preview", state.draft.medRxPhoto, "Sin<br/>receta");
      setThumb("m_tk_preview", state.draft.medTicketPhoto, "Sin<br/>ticket");
      e.target.value = "";
    }),
  );
  $("#m_btnRxTake")?.addEventListener("click", () => requestPhotoInput("#m_rx_take", 'camera'));
  $("#m_btnRxPick")?.addEventListener("click", () => requestPhotoInput("#m_rx_pick", 'gallery'));
  $("#m_btnRxRemove")?.addEventListener("click", () => {
    state.draft.medRxPhoto = null;
    setThumb("m_rx_preview", null, "Sin<br/>receta");
  });
  $("#m_btnTkTake")?.addEventListener("click", () => requestPhotoInput("#m_tk_take", 'camera'));
  $("#m_btnTkPick")?.addEventListener("click", () => requestPhotoInput("#m_tk_pick", 'gallery'));
  $("#m_btnTkRemove")?.addEventListener("click", () => {
    state.draft.medTicketPhoto = null;
    setThumb("m_tk_preview", null, "Sin<br/>ticket");
  });
  $("#m_btnClear")?.addEventListener("click", resetMed);
  $("#medForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveMed();
  });
  $("#btnMedWord")?.addEventListener("click", () =>
    exportWord("medicamentos_vacunas.doc", medSummaryHtml()),
  );
  $("#btnMedExcel")?.addEventListener("click", () =>
    exportExcel(
      "medicamentos.xls",
      producerExcelSheets([], [], state.meds, state.vaccines, []),
    ),
  );
}

async function runMedicationChatGPTAnalysis() {
  const apiKey = $("#ai_apiKey")?.value.trim();
  const model = $("#ai_model")?.value.trim() || "gpt-4o-mini";
  const source = $("#ai_english")?.value.trim();
  const prompt = $("#ai_prompt")?.value.trim();
  if (!apiKey || !source || !prompt) {
    show("ai_status", "Captura API key, texto fuente y prompt antes de analizar.", "warning");
    return;
  }
  show("ai_status", "Consultando ChatGPT...", "help");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Eres un asistente veterinario. Devuelve JSON válido con use, mech, adverse, preg, pk, overdose, interactions y dosing en español." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message || "No se pudo obtener respuesta.");
    const content = payload.choices?.[0]?.message?.content || "{}";
    $("#ai_result").value = content;
    $("#ai_fillFromJson").click();
    show("ai_status", "Respuesta recibida y aplicada correctamente.", "success");
  } catch (error) {
    console.error(error);
    show("ai_status", `Falló la consulta real a ChatGPT: ${error.message}`, "error");
  }
}

function collectVaccine() {
  const coverage = Number($("#v_coverageAnimals").value || 0);
  const price = Number($("#v_price").value || 0);
  return {
    id: state.editing.vaccineId || uid("vax"),
    brand: $("#v_brand").value.trim(),
    owner: $("#v_owner").value,
    expiry: $("#v_expiry").value,
    price,
    coverageAnimals: coverage,
    unit: $("#v_unit").value.trim(),
    unitCost: coverage ? price / coverage : 0,
    diseases: $("#v_diseases").value.trim(),
    notes: $("#v_notes").value.trim(),
    photo: state.draft.vaccinePhoto || null,
  };
}
function resetVaccine() {
  state.editing.vaccineId = null;
  $("#vaccineForm")?.reset();
  state.draft.vaccinePhoto = null;
  setThumb("v_photo_preview", null, "Sin<br/>foto");
}
function fillVaccine(v) {
  resetVaccine();
  state.editing.vaccineId = v.id;
  Object.entries({
    v_brand: v.brand,
    v_owner: v.owner,
    v_expiry: v.expiry,
    v_price: v.price,
    v_coverageAnimals: v.coverageAnimals,
    v_unit: v.unit,
    v_unitCost: v.unitCost,
    v_diseases: v.diseases,
    v_notes: v.notes,
  }).forEach(([k, val]) => { if ($("#" + k)) $("#" + k).value = safe(val); });
  state.draft.vaccinePhoto = v.photo || null;
  setThumb("v_photo_preview", v.photo, "Sin<br/>foto");
}
function saveVaccine() {
  const v = collectVaccine();
  if (!v.brand || !v.coverageAnimals) {
    show("v_err", "Marca y cobertura animal son obligatorias.", "error");
    return;
  }
  const idx = state.vaccines.findIndex((x) => x.id === v.id);
  if (idx >= 0) state.vaccines[idx] = v;
  else state.vaccines.unshift(v);
  saveState();
  renderAll();
  resetVaccine();
  show("v_ok", "Vacuna guardada correctamente en su módulo independiente.", "success");
}
function renderVaccineList() {
  const list = $("#v_list");
  if (!list) return;
  list.innerHTML = "";
  $("#v_count").textContent = state.vaccines.length;
  state.vaccines.forEach((v) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h4>${esc(v.brand)}</h4><div class="line"><b>Propiedad:</b> ${esc(medOwnerLabel(v.owner))}</div><div class="line"><b>Cobertura disponible:</b> ${vaccineRemaining(v)} animales</div><div class="line"><b>Costo por animal:</b> ${money(v.unitCost)}</div><div class="line"><b>Enfermedades:</b> ${esc(v.diseases)}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, w, e, del] = item.querySelectorAll("button");
    edit.onclick = () => fillVaccine(v);
    w.onclick = () => exportWord(`vacuna_${slug(v.brand)}.doc`, vaccineWordHtml(v));
    e.onclick = () => exportExcel(`vacuna_${slug(v.brand)}.xls`, producerExcelSheets([], [], [], [v], []));
    del.onclick = () => { queueDeletedRecord("vaccines", v); state.vaccines = state.vaccines.filter((x) => x.id !== v.id); saveState(); renderAll(); };
    list.appendChild(item);
  });
}
function bindVaccines() {
  ["v_price", "v_coverageAnimals"].forEach((id) =>
    $("#" + id)?.addEventListener("input", () => {
      const total = Number($("#v_price").value || 0), coverage = Number($("#v_coverageAnimals").value || 0);
      $("#v_unitCost").value = coverage ? (total / coverage).toFixed(2) : "";
    }),
  );
  ["v_photo_take", "v_photo_pick"].forEach((id) => $("#" + id)?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    state.draft.vaccinePhoto = await fileToBase64(f);
    setThumb("v_photo_preview", state.draft.vaccinePhoto, "Sin<br/>foto");
    e.target.value = "";
  }));
  $("#v_btnTake")?.addEventListener("click", () => requestPhotoInput("#v_photo_take", 'camera'));
  $("#v_btnPick")?.addEventListener("click", () => requestPhotoInput("#v_photo_pick", 'gallery'));
  $("#v_btnRemove")?.addEventListener("click", () => { state.draft.vaccinePhoto = null; setThumb("v_photo_preview", null, "Sin<br/>foto"); });
  $("#v_clear")?.addEventListener("click", resetVaccine);
  $("#vaccineForm")?.addEventListener("submit", (e) => { e.preventDefault(); saveVaccine(); });
  $("#btnVaccineWord")?.addEventListener("click", () => exportWord("vacunas.doc", vaccineSummaryHtml()));
  $("#btnVaccineExcel")?.addEventListener("click", () => exportExcel("vacunas.xls", producerExcelSheets([], [], [], state.vaccines, [])));
}

function renderSupplyMode() {
  const disposable = state.ui.supplyMode === "DISPOSABLE";
  $("#blockDisposable").style.display = disposable ? "block" : "none";
  $("#blockNonDisposable").style.display = disposable ? "none" : "block";
  $("#s_modeHint").textContent =
    `Modo actual: ${disposable ? "🧴 Desechables" : "🔧 No desechables"}`;
  $("#s_modeDisposable").classList.toggle("ghost", !disposable);
  $("#s_modeNonDisposable").classList.toggle("ghost", disposable);
}
function collectSupply() {
  const type =
    state.ui.supplyMode === "DISPOSABLE" ? "DISPOSABLE" : "NON_DISPOSABLE";
  const qty = Number($("#s_qty").value || 0),
    price = Number($("#s_price").value || 0),
    lifeYears = Number($("#s_lifeYears").value || 0),
    costAcq = Number($("#s_costAcq").value || 0),
    estimatedUses = Number($("#s_estimatedUses").value || 0);
  return {
    id: state.editing.supplyId || uid("sup"),
    type,
    name: $("#s_name").value.trim(),
    acquired: $("#s_acquired").value,
    donated: checked("s_donated"),
    presentation: $("#s_presentation").value.trim(),
    qty,
    price,
    unitCost: qty ? price / qty : 0,
    costAcq,
    lifeYears,
    estimatedUses,
    yearlyCost: lifeYears ? costAcq / lifeYears : 0,
    costUse: estimatedUses ? costAcq / estimatedUses : 0,
    notes: $("#s_notes").value.trim(),
    ticket: state.draft.supplyTicketPhoto || null,
  };
}
function saveSupply() {
  const s = collectSupply();
  if (!s.name || !s.acquired) {
    show("s_err", "Nombre y fecha de adquisición son obligatorios.", "error");
    return;
  }
  const idx = state.supplies.findIndex((x) => x.id === s.id);
  if (idx >= 0) state.supplies[idx] = s;
  else state.supplies.unshift(s);
  saveState();
  renderAll();
  resetSupply();
  show("s_ok", "Insumo guardado.", "success");
}
function resetSupply() {
  state.editing.supplyId = null;
  $("#supplyForm").reset();
  state.draft.supplyTicketPhoto = null;
  setThumb("s_tk_preview", null, "Sin<br/>ticket");
  renderSupplyMode();
}
function fillSupply(s) {
  resetSupply();
  state.editing.supplyId = s.id;
  state.ui.supplyMode =
    s.type === "NON_DISPOSABLE" ? "NON_DISPOSABLE" : "DISPOSABLE";
  renderSupplyMode();
  Object.entries({
    s_name: s.name,
    s_acquired: s.acquired,
    s_presentation: s.presentation,
    s_qty: s.qty,
    s_price: s.price,
    s_unitCost: s.unitCost,
    s_costAcq: s.costAcq,
    s_lifeYears: s.lifeYears,
    s_estimatedUses: s.estimatedUses,
    s_costMonth: s.yearlyCost,
    s_costUse: s.costUse,
    s_notes: s.notes,
  }).forEach(([k, v]) => {
    if ($("#" + k)) $("#" + k).value = safe(v);
  });
  setChecked("s_donated", s.donated || "NO");
  state.draft.supplyTicketPhoto = s.ticket || null;
  setThumb("s_tk_preview", s.ticket, "Sin<br/>ticket");
}
function renderSupplyList() {
  const list = $("#s_list");
  if (!list) return;
  list.innerHTML = "";
  state.supplies.forEach((s) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h4>${esc(s.name)}</h4><div class="line"><b>Tipo:</b> ${s.type === "NON_DISPOSABLE" ? "No desechable" : "Desechable"}</div><div class="line"><b>Disponibilidad:</b> ${esc(supplyRemaining(s))}</div><div class="line"><b>${s.type === "NON_DISPOSABLE" ? "Costo por uso" : "Costo unitario real"}:</b> ${money(supplyDisplayCost(s))}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, w, e, del] = item.querySelectorAll("button");
    edit.onclick = () => fillSupply(s);
    w.onclick = () =>
      exportWord(
        `insumo_${slug(s.name)}.doc`,
        `<h1>${esc(s.name)}</h1><p><b>Tipo:</b> ${esc(s.type)}</p>`,
      );
    e.onclick = () =>
      exportExcel(
        `insumo_${slug(s.name)}.xls`,
        producerExcelSheets([], [], [], [], [s]),
      );
    del.onclick = () => {
      queueDeletedRecord("supplies", s);
      state.supplies = state.supplies.filter((x) => x.id !== s.id);
      saveState();
      renderAll();
    };
    list.appendChild(item);
  });
}
function bindSupplies() {
  renderSupplyMode();
  $("#s_modeDisposable")?.addEventListener("click", () => {
    state.ui.supplyMode = "DISPOSABLE";
    renderSupplyMode();
    saveState();
  });
  $("#s_modeNonDisposable")?.addEventListener("click", () => {
    state.ui.supplyMode = "NON_DISPOSABLE";
    renderSupplyMode();
    saveState();
  });
  ["s_qty", "s_price"].forEach((id) =>
    $("#" + id)?.addEventListener("input", () => {
      const q = Number($("#s_qty").value || 0),
        p = Number($("#s_price").value || 0);
      $("#s_unitCost").value = q ? (p / q).toFixed(2) : "";
    }),
  );
  ["s_costAcq", "s_lifeYears", "s_estimatedUses"].forEach((id) =>
    $("#" + id)?.addEventListener("input", () => {
      const acq = Number($("#s_costAcq").value || 0),
        life = Number($("#s_lifeYears").value || 0),
        uses = Number($("#s_estimatedUses").value || 0);
      $("#s_costMonth").value = life ? (acq / life).toFixed(2) : "";
      $("#s_costUse").value = uses ? (acq / uses).toFixed(2) : "";
    }),
  );
  $("#s_tk_take")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    state.draft.supplyTicketPhoto = await fileToBase64(f);
    setThumb("s_tk_preview", state.draft.supplyTicketPhoto, "Sin<br/>ticket");
    e.target.value = "";
  });
  $("#s_tk_pick")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    state.draft.supplyTicketPhoto = await fileToBase64(f);
    setThumb("s_tk_preview", state.draft.supplyTicketPhoto, "Sin<br/>ticket");
    e.target.value = "";
  });
  $("#s_btnTkTake")?.addEventListener("click", () => requestPhotoInput("#s_tk_take", 'camera'));
  $("#s_btnTkPick")?.addEventListener("click", () => requestPhotoInput("#s_tk_pick", 'gallery'));
  $("#s_btnTkRemove")?.addEventListener("click", () => {
    state.draft.supplyTicketPhoto = null;
    setThumb("s_tk_preview", null, "Sin<br/>ticket");
  });
  $("#s_btnClear")?.addEventListener("click", resetSupply);
  $("#supplyForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveSupply();
  });
  $("#btnSupplyWord")?.addEventListener("click", () =>
    exportWord("insumos.doc", supplySummaryHtml()),
  );
  $("#btnSupplyExcel")?.addEventListener("click", () =>
    exportExcel(
      "insumos.xls",
      producerExcelSheets([], [], [], [], state.supplies),
    ),
  );
}

function renderProcedureProducerSelect() {
  const sel = $("#p_producer");
  if (!sel) return;
  const prev = state.selectedProducerId || sel.value;
  sel.innerHTML =
    '<option value="">— Selecciona —</option>' +
    state.producers
      .map((p) => `<option value="${p.id}">${esc(p.basic.name)}</option>`)
      .join("");
  sel.value = prev || "";
}
function renderProcedureAnimalSelect() {
  const prod = byId(
    state.producers,
    $("#p_producer").value || state.selectedProducerId,
  );
  const sel = $("#p_animalGroup");
  const animals = prod?.animals || [];
  const prev = sel.value;
  sel.innerHTML =
    '<option value="">— Selecciona —</option>' +
    animals
      .map((a) => `<option value="${a.id}">${esc(animalLabel(a))}</option>`)
      .join("");
  sel.value = prev;
}
function populateInventorySelects() {
  const medSel = $("#p_medSelect"),
    vaxSel = $("#p_vaccineSelect"),
    supSel = $("#p_supplySelect");
  medSel.innerHTML =
    '<option value="">— Selecciona —</option>' +
    state.meds
      .map(
        (m) =>
          `<option value="${m.id}">${esc(m.brand)} (${medRemaining(m)} ${esc(m.unit)})</option>`,
      )
      .join("");
  vaxSel.innerHTML =
    '<option value="">— Selecciona —</option>' +
    state.vaccines
      .map(
        (v) =>
          `<option value="${v.id}">${esc(v.brand)} (${vaccineRemaining(v)} animales)</option>`,
      )
      .join("");
  supSel.innerHTML =
    '<option value="">— Selecciona —</option>' +
    state.supplies
      .map(
        (s) =>
          `<option value="${s.id}">${esc(s.name)} (${esc(supplyRemaining(s))})</option>`,
      )
      .join("");
}
function renderProcedureType() {
  const type = $("#p_type").value;
  const scope = $("#p_scope").value;
  [
    ["3. Caso clínico", "#p_cc_reason"],
    ["4. Necropsia", "#p_nec_idAnimal"],
    ["5. Atención clínica / zootécnica", "#p_zoo_evaluation"],
    ["6. Cirugía", "#p_sx_preop"],
  ].forEach(() => {});
  const details = $$("#procedureForm details");
  details.forEach((d, idx) => {
    const sum = d.querySelector("summary")?.textContent || "";
    if (sum.includes("Caso clínico"))
      d.style.display = type === "CASO_CLINICO" ? "block" : "none";
    if (sum.includes("Necropsia"))
      d.style.display = type === "NECROPSIA" ? "block" : "none";
    if (sum.includes("Atención clínica"))
      d.style.display = type === "ZOOTECNIA" ? "block" : "none";
    if (sum.includes("Cirugía"))
      d.style.display = type === "CIRUGIA" ? "block" : "none";
  });
  $("#p_scope").disabled = ["CIRUGIA", "CASO_CLINICO", "NECROPSIA"].includes(
    type,
  );
  if (["CIRUGIA", "CASO_CLINICO", "NECROPSIA"].includes(type)) {
    $("#p_scope").value = "INDIVIDUAL";
  }
}
function addProcedureMedUse() {
  const med = byId(state.meds, $("#p_medSelect").value);
  const qty = Number($("#p_medDoseKg").value || 0);
  if (!med || !qty) {
    show("p_msg", "Selecciona medicamento y cantidad/dosis.", "warning");
    return;
  }
  if (qty > medRemaining(med)) {
    show("p_msg", "No hay stock suficiente del medicamento.", "error");
    return;
  }
  state.draft.procedureMedUses.push({
    id: uid("pmed"),
    itemId: med.id,
    name: med.brand,
    qty,
    unit: $("#p_medUnitUsed").value || med.unit,
    unitCost: med.unitCost,
    owner: med.owner,
  });
  renderProcedureDraftLists();
}
function addProcedureVaccineUse() {
  const v = byId(state.vaccines, $("#p_vaccineSelect").value);
  const animalsApplied = Number($("#p_vaccineAnimalsApplied").value || 0);
  if (!v || !animalsApplied) {
    show(
      "p_msg",
      "Selecciona vacuna y cantidad de animales aplicada.",
      "warning",
    );
    return;
  }
  if (animalsApplied > vaccineRemaining(v)) {
    show("p_msg", "La vacuna no alcanza para ese número de animales.", "error");
    return;
  }
  state.draft.procedureVaccineUses.push({
    id: uid("pvax"),
    itemId: v.id,
    name: v.brand,
    animalsApplied,
    price: v.price,
    unitCost: v.unitCost || (v.coverageAnimals ? Number(v.price || 0) / Number(v.coverageAnimals || 1) : 0),
    notes: $("#p_vaccineNotes").value.trim(),
  });
  renderProcedureDraftLists();
}
function addProcedureSupplyUse() {
  const s = byId(state.supplies, $("#p_supplySelect").value);
  const qty = Number($("#p_supplyQtyUsed").value || 0);
  if (!s || !qty) {
    show("p_msg", "Selecciona insumo y cantidad.", "warning");
    return;
  }
  if (s.type === "DISPOSABLE" && qty > supplyRemaining(s)) {
    show(
      "p_msg",
      "No hay disponibilidad suficiente del insumo desechable.",
      "error",
    );
    return;
  }
  state.draft.procedureSupplyUses.push({
    id: uid("psup"),
    itemId: s.id,
    name: s.name,
    qty,
    notes: $("#p_supplyNotes").value.trim(),
    type: s.type,
    unitCost: supplyDisplayCost(s),
  });
  renderProcedureDraftLists();
}
function renderProcedureDraftLists() {
  renderSimpleList(
    "#p_medUseList",
    state.draft.procedureMedUses,
    (x) => `${x.name} · ${x.qty} ${x.unit || ""}`,
  );
  renderSimpleList(
    "#p_vaccineUseList",
    state.draft.procedureVaccineUses,
    (x) => `${x.name} · ${x.animalsApplied} animales`,
  );
  renderSimpleList(
    "#p_supplyUseList",
    state.draft.procedureSupplyUses,
    (x) =>
      `${x.name} · ${x.qty} ${x.type === "NON_DISPOSABLE" ? "usos" : "pzas"}`,
  );
  renderSimpleList(
    "#lab_list",
    state.labTests.filter((l) => state.draft.procedureLabIds.includes(l.id)),
    (x) => `${x.date} · ${x.type} · ${x.result}`,
  );
  const box1 = $("#p_cc_preview"),
    box2 = $("#p_nec_preview");
  if (box1)
    box1.innerHTML = state.draft.procedureCasePhotos.length
      ? state.draft.procedureCasePhotos
          .map((p) => `<div class="preview-mini"><img src="${p}"></div>`)
          .join("")
      : '<div class="preview-box"><span>Sin<br/>fotos</span></div>';
  if (box2)
    box2.innerHTML = state.draft.procedureNecropsyPhotos.length
      ? state.draft.procedureNecropsyPhotos
          .map((p) => `<div class="preview-mini"><img src="${p}"></div>`)
          .join("")
      : '<div class="preview-box"><span>Sin<br/>fotos</span></div>';
  setThumb(
    "p_charge_preview",
    state.draft.procedureChargePhoto,
    "Sin<br/>evidencia",
  );
  const breakdown = calculateProcedureCharge();
  $("#p_chargeCalculated").value = breakdown.total.toFixed(2);
}
function calculateProcedureCharge() {
  const base = Number($("#p_costTotal").value || 0);
  const meds = state.draft.procedureMedUses.reduce(
    (a, x) => a + Number(x.qty || 0) * Number(x.unitCost || 0),
    0,
  );
  const vaccines = state.draft.procedureVaccineUses.reduce(
    (a, x) => a + Number(x.animalsApplied || 0) * (Number(x.unitCost || 0) || Number(x.price || 0)),
    0,
  );
  const supplies = state.draft.procedureSupplyUses.reduce(
    (a, x) => a + Number(x.qty || 0) * Number(x.unitCost || 0),
    0,
  );
  const subtotal = base + meds + vaccines + supplies;
  return { base, meds, vaccines, supplies, subtotal, total: subtotal };
}
async function addLab() {
  const file = $("#lab_file").files?.[0];
  const lab = {
    id: uid("lab"),
    type: $("#lab_type").value.trim(),
    date: $("#lab_date").value,
    animal: $("#lab_animal").value.trim(),
    result: $("#lab_result").value.trim(),
    interpretation: $("#lab_interpretation").value.trim(),
    notes: $("#lab_notes").value.trim(),
    file: file ? await fileToBase64(file) : null,
    linkedProcedureId: state.editing.procedureId || null,
  };
  if (!lab.type || !lab.date) {
    show("p_msg", "Tipo y fecha de prueba son obligatorios.", "warning");
    return;
  }
  state.labTests.unshift(lab);
  state.draft.procedureLabIds.push(lab.id);
  saveState();
  renderProcedureDraftLists();
  [
    "lab_type",
    "lab_date",
    "lab_animal",
    "lab_result",
    "lab_interpretation",
    "lab_notes",
  ].forEach((id) => ($("#" + id).value = ""));
  $("#lab_file").value = "";
}
function collectProcedure() {
  return {
    id: state.editing.procedureId || uid("proc"),
    date: $("#p_date").value,
    type: $("#p_type").value,
    scope: $("#p_scope").value,
    place: $("#p_place").value.trim(),
    producerId: $("#p_producer").value,
    animalId: $("#p_animalGroup").value,
    animalsQtyUsed: Number($("#p_animalsQtyUsed").value || 0),
    species: $("#p_species").value.trim(),
    identification: $("#p_identification").value.trim(),
    weight: $("#p_weight").value,
    temperature: $("#p_temperature").value,
    generalState: $("#p_generalState").value,
    notes: $("#p_notes").value.trim(),
    chargeStatus: $("#p_chargeStatus").value,
    chargeNotes: $("#p_chargeNotes").value.trim(),
    inventory: {
      meds: [...state.draft.procedureMedUses],
      vaccines: [...state.draft.procedureVaccineUses],
      supplies: [...state.draft.procedureSupplyUses],
    },
    caseClinical: {
      reason: $("#p_cc_reason").value.trim(),
      anamnesis: $("#p_cc_anamnesis").value.trim(),
      bodyCondition: $("#p_cc_bodyCondition").value.trim(),
      mucosa: $("#p_cc_mucosa").value.trim(),
      tllc: $("#p_cc_tllc").value.trim(),
      hydration: $("#p_cc_hydration").value.trim(),
      fc: $("#p_cc_fc").value.trim(),
      fr: $("#p_cc_fr").value.trim(),
      temp: $("#p_cc_temp").value.trim(),
      weight: $("#p_cc_weight2").value.trim(),
      exam: $("#p_cc_exam").value.trim(),
      presumptiveDx: $("#p_cc_presumptiveDx").value.trim(),
      treatment: $("#p_cc_treatment").value.trim(),
      recommendations: $("#p_cc_recommendations").value.trim(),
      followup: $("#p_cc_followup").value.trim(),
      photos: [...state.draft.procedureCasePhotos],
    },
    necropsy: {
      idAnimal: $("#p_nec_idAnimal").value.trim(),
      species: $("#p_nec_species").value.trim(),
      breed: $("#p_nec_breed").value.trim(),
      sex: $("#p_nec_sex").value.trim(),
      age: $("#p_nec_age").value.trim(),
      sterilized: $("#p_nec_sterilized").value.trim(),
      color: $("#p_nec_color").value.trim(),
      weight: $("#p_nec_weight").value.trim(),
      birthDate: $("#p_nec_birthDate").value,
      deathDate: $("#p_nec_deathDate").value,
      timeDeathNec: $("#p_nec_timeDeathNec").value.trim(),
      sender: $("#p_nec_sender").value.trim(),
      caseNumber: $("#p_nec_caseNumber").value.trim(),
      clinicalDx: $("#p_nec_clinicalDx").value.trim(),
      additionalData: $("#p_nec_additionalData").value.trim(),
      externalInspection: $("#p_nec_externalInspection").value.trim(),
      primaryIncision: $("#p_nec_primaryIncision").value.trim(),
      secondaryIncision: $("#p_nec_secondaryIncision").value.trim(),
      organExtraction: $("#p_nec_organExtraction").value.trim(),
      respiratory: $("#p_nec_respiratory").value.trim(),
      heart: $("#p_nec_heart").value.trim(),
      spleen: $("#p_nec_spleen").value.trim(),
      kidneys: $("#p_nec_kidneys").value.trim(),
      stomach: $("#p_nec_stomach").value.trim(),
      preliminaryReport: $("#p_nec_preliminaryReport").value.trim(),
      morphDx: $("#p_nec_morphDx").value.trim(),
      finalDx: $("#p_nec_finalDx").value.trim(),
      comments: $("#p_nec_comments").value.trim(),
      biblioSummary: $("#p_nec_biblioSummary").value.trim(),
      bibliography: $("#p_nec_bibliography").value.trim(),
      photos: [...state.draft.procedureNecropsyPhotos],
    },
    zootecnia: {
      evaluation: $("#p_zoo_evaluation").value.trim(),
      intervention: $("#p_zoo_intervention").value.trim(),
      plan: $("#p_zoo_plan").value.trim(),
      followup: $("#p_zoo_followup").value.trim(),
    },
    surgery: {
      preop: $("#p_sx_preop").value.trim(),
      procedure: $("#p_sx_procedure").value.trim(),
      anesthesia: $("#p_sx_anesthesia").value.trim(),
      findings: $("#p_sx_findings").value.trim(),
      postop: $("#p_sx_postop").value.trim(),
      prognosis: $("#p_sx_prognosis").value.trim(),
    },
    charge: {
      ...calculateProcedureCharge(),
      manual: Number($("#p_chargeManual").value || 0),
      reason: $("#p_chargeReason").value.trim(),
      status: $("#p_chargeStatus").value,
      notes: $("#p_chargeNotes").value.trim(),
      photo: state.draft.procedureChargePhoto,
    },
    labIds: [...state.draft.procedureLabIds],
  };
}
function saveProcedure() {
  const p = collectProcedure();
  if (!p.date || !p.type || !p.producerId) {
    show("p_err", "Fecha, tipo y productor(a) son obligatorios.", "error");
    return;
  }
  const animal = byId(currentAnimals(), p.animalId);
  if (
    ["CIRUGIA", "CASO_CLINICO", "NECROPSIA"].includes(p.type) &&
    p.scope !== "INDIVIDUAL"
  )
    p.scope = "INDIVIDUAL";
  if (
    ["CIRUGIA", "CASO_CLINICO", "NECROPSIA"].includes(p.type) &&
    !p.animalId
  ) {
    show("p_err", "Este procedimiento requiere un animal individual.", "error");
    return;
  }
  if (
    p.animalsQtyUsed &&
    animal &&
    p.animalsQtyUsed > Number(animal.quantity || 0)
  ) {
    show(
      "p_err",
      "La cantidad de animales excede los disponibles para ese registro.",
      "error",
    );
    return;
  }
  const idx = state.procedures.findIndex((x) => x.id === p.id);
  const previous = idx >= 0 ? state.procedures[idx] : null;
  if (idx >= 0) state.procedures[idx] = p;
  else state.procedures.unshift(p);
  if (p.type === "NECROPSIA" && p.animalId) {
    const prod = byId(state.producers, p.producerId);
    const animalTarget = byId(prod?.animals || [], p.animalId);
    const alreadyApplied = previous?.type === "NECROPSIA" && previous?.animalId === p.animalId;
    if (animalTarget && !alreadyApplied) {
      animalTarget.quantity = Math.max(0, Number(animalTarget.quantity || 0) - 1);
    }
  }
  saveState();
  renderAll();
  resetProcedure();
  show("p_ok", "Procedimiento guardado.", "success");
}
function resetProcedure() {
  state.editing.procedureId = null;
  $("#procedureForm").reset();
  state.draft.procedureMedUses = [];
  state.draft.procedureVaccineUses = [];
  state.draft.procedureSupplyUses = [];
  state.draft.procedureLabIds = [];
  state.draft.procedureCasePhotos = [];
  state.draft.procedureNecropsyPhotos = [];
  state.draft.procedureChargePhoto = null;
  renderProcedureType();
  renderProcedureDraftLists();
  renderProcedureAnimalSelect();
}
function fillProcedure(p) {
  resetProcedure();
  state.editing.procedureId = p.id;
  Object.entries({
    p_date: p.date,
    p_type: p.type,
    p_scope: p.scope,
    p_place: p.place,
    p_costTotal: p.charge?.total || "",
    p_producer: p.producerId,
    p_animalGroup: p.animalId,
    p_animalsQtyUsed: p.animalsQtyUsed,
    p_species: p.species,
    p_identification: p.identification,
    p_weight: p.weight,
    p_temperature: p.temperature,
    p_generalState: p.generalState,
    p_chargeStatus: p.chargeStatus,
    p_chargeNotes: p.chargeNotes,
    p_notes: p.notes,
    p_cc_reason: p.caseClinical?.reason,
    p_cc_anamnesis: p.caseClinical?.anamnesis,
    p_cc_bodyCondition: p.caseClinical?.bodyCondition,
    p_cc_mucosa: p.caseClinical?.mucosa,
    p_cc_tllc: p.caseClinical?.tllc,
    p_cc_hydration: p.caseClinical?.hydration,
    p_cc_fc: p.caseClinical?.fc,
    p_cc_fr: p.caseClinical?.fr,
    p_cc_temp: p.caseClinical?.temp,
    p_cc_weight2: p.caseClinical?.weight,
    p_cc_exam: p.caseClinical?.exam,
    p_cc_presumptiveDx: p.caseClinical?.presumptiveDx,
    p_cc_treatment: p.caseClinical?.treatment,
    p_cc_recommendations: p.caseClinical?.recommendations,
    p_cc_followup: p.caseClinical?.followup,
    p_nec_idAnimal: p.necropsy?.idAnimal,
    p_nec_species: p.necropsy?.species,
    p_nec_breed: p.necropsy?.breed,
    p_nec_sex: p.necropsy?.sex,
    p_nec_age: p.necropsy?.age,
    p_nec_sterilized: p.necropsy?.sterilized,
    p_nec_color: p.necropsy?.color,
    p_nec_weight: p.necropsy?.weight,
    p_nec_birthDate: p.necropsy?.birthDate,
    p_nec_deathDate: p.necropsy?.deathDate,
    p_nec_timeDeathNec: p.necropsy?.timeDeathNec,
    p_nec_sender: p.necropsy?.sender,
    p_nec_caseNumber: p.necropsy?.caseNumber,
    p_nec_clinicalDx: p.necropsy?.clinicalDx,
    p_nec_additionalData: p.necropsy?.additionalData,
    p_nec_externalInspection: p.necropsy?.externalInspection,
    p_nec_primaryIncision: p.necropsy?.primaryIncision,
    p_nec_secondaryIncision: p.necropsy?.secondaryIncision,
    p_nec_organExtraction: p.necropsy?.organExtraction,
    p_nec_respiratory: p.necropsy?.respiratory,
    p_nec_heart: p.necropsy?.heart,
    p_nec_spleen: p.necropsy?.spleen,
    p_nec_kidneys: p.necropsy?.kidneys,
    p_nec_stomach: p.necropsy?.stomach,
    p_nec_preliminaryReport: p.necropsy?.preliminaryReport,
    p_nec_morphDx: p.necropsy?.morphDx,
    p_nec_finalDx: p.necropsy?.finalDx,
    p_nec_comments: p.necropsy?.comments,
    p_nec_biblioSummary: p.necropsy?.biblioSummary,
    p_nec_bibliography: p.necropsy?.bibliography,
    p_zoo_evaluation: p.zootecnia?.evaluation,
    p_zoo_intervention: p.zootecnia?.intervention,
    p_zoo_plan: p.zootecnia?.plan,
    p_zoo_followup: p.zootecnia?.followup,
    p_sx_preop: p.surgery?.preop,
    p_sx_procedure: p.surgery?.procedure,
    p_sx_anesthesia: p.surgery?.anesthesia,
    p_sx_findings: p.surgery?.findings,
    p_sx_postop: p.surgery?.postop,
    p_sx_prognosis: p.surgery?.prognosis,
    p_chargeManual: p.charge?.manual,
    p_chargeReason: p.charge?.reason,
  }).forEach(([k, v]) => {
    if ($("#" + k)) $("#" + k).value = safe(v);
  });
  renderProcedureAnimalSelect();
  state.draft.procedureMedUses = [...(p.inventory?.meds || [])];
  state.draft.procedureVaccineUses = [...(p.inventory?.vaccines || [])];
  state.draft.procedureSupplyUses = [...(p.inventory?.supplies || [])];
  state.draft.procedureLabIds = [...(p.labIds || [])];
  state.draft.procedureCasePhotos = [...(p.caseClinical?.photos || [])];
  state.draft.procedureNecropsyPhotos = [...(p.necropsy?.photos || [])];
  state.draft.procedureChargePhoto = p.charge?.photo || null;
  renderProcedureType();
  renderProcedureDraftLists();
}
function renderProcedureList() {
  const list = $("#p_list");
  if (!list) return;
  list.innerHTML = "";
  if ($("#p_count")) $("#p_count").textContent = state.procedures.length;
  state.procedures.forEach((p) => {
    const prod = byId(state.producers, p.producerId);
    const animal = (prod?.animals || []).find((a) => a.id === p.animalId);
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h4>${esc(p.type)} · ${esc(prod?.basic?.name || "")}</h4><div class="line"><b>Fecha:</b> ${esc(p.date)}</div><div class="line"><b>Animal:</b> ${esc(animal ? animalLabel(animal) : p.identification || "")}</div><div class="line"><b>Medicamentos usados:</b> ${(p.inventory?.meds || []).length}</div><div class="line"><b>Vacunas usadas:</b> ${(p.inventory?.vaccines || []).length}</div><div class="line"><b>Pruebas vinculadas:</b> ${(p.labIds || []).length}</div><div class="line"><b>Monto calculado:</b> ${money(p.charge?.total)}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, w, e, del] = item.querySelectorAll("button");
    edit.onclick = () => fillProcedure(p);
    w.onclick = () =>
      exportWord(`procedimiento_${slug(p.id)}.doc`, procedureWordHtml(p));
    e.onclick = () =>
      exportExcel(
        `procedimiento_${slug(p.id)}.xls`,
        producerExcelSheets(
          [],
          [],
          [],
          [],
          [],
          [p],
          state.labTests.filter((l) => (p.labIds || []).includes(l.id)),
        ),
      );
    del.onclick = () => {
      queueDeletedRecord("procedures", p);
      state.procedures = state.procedures.filter((x) => x.id !== p.id);
      saveState();
      renderAll();
    };
    list.appendChild(item);
  });
}
function bindProcedures() {
  renderProcedureType();
  $("#p_producer")?.addEventListener("change", () => {
    state.selectedProducerId =
      $("#p_producer").value || state.selectedProducerId;
    renderProcedureAnimalSelect();
  });
  $("#p_type")?.addEventListener("change", renderProcedureType);
  $("#p_scope")?.addEventListener("change", renderProcedureType);
  $("#p_addMedUse")?.addEventListener("click", addProcedureMedUse);
  $("#p_addVaccineUse")?.addEventListener("click", addProcedureVaccineUse);
  $("#p_addSupplyUse")?.addEventListener("click", addProcedureSupplyUse);
  $("#lab_add")?.addEventListener("click", addLab);
  [
    "p_cc_take",
    "p_cc_pick",
    "p_nec_take",
    "p_nec_pick",
    "p_charge_take",
    "p_charge_pick",
  ].forEach((id) =>
    $("#" + id)?.addEventListener("change", async (e) => {
      for (const f of Array.from(e.target.files || [])) {
        const data = await fileToBase64(f);
        if (id.startsWith("p_cc")) state.draft.procedureCasePhotos.push(data);
        else if (id.startsWith("p_nec"))
          state.draft.procedureNecropsyPhotos.push(data);
        else state.draft.procedureChargePhoto = data;
      }
      renderProcedureDraftLists();
      e.target.value = "";
    }),
  );
  $("#p_cc_btnTake")?.addEventListener("click", () => requestPhotoInput("#p_cc_take", 'camera'));
  $("#p_cc_btnPick")?.addEventListener("click", () => requestPhotoInput("#p_cc_pick", 'gallery'));
  $("#p_cc_btnClear")?.addEventListener("click", () => {
    state.draft.procedureCasePhotos = [];
    renderProcedureDraftLists();
  });
  $("#p_nec_btnTake")?.addEventListener("click", () =>
    requestPhotoInput("#p_nec_take", 'camera'),
  );
  $("#p_nec_btnPick")?.addEventListener("click", () =>
    requestPhotoInput("#p_nec_pick", 'gallery'),
  );
  $("#p_nec_btnClear")?.addEventListener("click", () => {
    state.draft.procedureNecropsyPhotos = [];
    renderProcedureDraftLists();
  });
  $("#p_charge_btnTake")?.addEventListener("click", () =>
    requestPhotoInput("#p_charge_take", 'camera'),
  );
  $("#p_charge_btnPick")?.addEventListener("click", () =>
    requestPhotoInput("#p_charge_pick", 'gallery'),
  );
  $("#p_charge_btnClear")?.addEventListener("click", () => {
    state.draft.procedureChargePhoto = null;
    renderProcedureDraftLists();
  });
  $("#procedureForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveProcedure();
  });
  $("#p_save")?.addEventListener("click", saveProcedure);
  $("#p_clear")?.addEventListener("click", resetProcedure);
  $("#btnProcedureWord")?.addEventListener("click", () =>
    exportWord("procedimientos.doc", procedureSummaryHtml()),
  );
  $("#btnProcedureExcel")?.addEventListener("click", () =>
    exportExcel(
      "procedimientos.xls",
      producerExcelSheets([], [], [], [], [], state.procedures, state.labTests),
    ),
  );
}

function slug(v) {
  return safe(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
function exportWord(filename, bodyHtml) {
  download(
    filename,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}img{max-width:280px;height:auto}</style></head><body>${bodyHtml}</body></html>`,
    "application/msword",
  );
}
function xmlCell(v) {
  return `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
}
function exportExcel(filename, sheets) {
  const workbookHeader = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">`;
  const workbookFooter = "</Workbook>";
  const body = sheets
    .map(
      (sheet) =>
        `<Worksheet ss:Name="${esc(sheet.name).slice(0, 31)}"><Table>${sheet.rows.map((r) => `<Row>${r.map(xmlCell).join("")}</Row>`).join("")}</Table></Worksheet>`,
    )
    .join("");
  download(
    filename,
    workbookHeader + body + workbookFooter,
    "application/vnd.ms-excel",
  );
}
function imageHtml(src, label = "imagen") {
  return src ? `<div><b>${esc(label)}:</b><br><img src="${src}" alt="${esc(label)}"></div>` : "";
}
function objectEntriesTable(obj = {}) {
  return `<table><tr><th>Campo</th><th>Valor</th></tr>${Object.entries(obj).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(Array.isArray(v) ? v.join(", ") : typeof v === "object" && v ? JSON.stringify(v) : v)}</td></tr>`).join("")}</table>`;
}
function vaccineWordHtml(v) {
  return `<h1>Vacuna: ${esc(v.brand)}</h1><p><b>Propiedad:</b> ${esc(medOwnerLabel(v.owner))}</p><p><b>Caducidad:</b> ${esc(v.expiry)}</p><p><b>Cobertura total:</b> ${esc(v.coverageAnimals)} animales</p><p><b>Costo total:</b> ${money(v.price)} · <b>Costo unitario:</b> ${money(v.unitCost)}</p><p><b>Enfermedades:</b> ${esc(v.diseases)}</p><p><b>Notas:</b> ${esc(v.notes)}</p>${imageHtml(v.photo, "Evidencia vacuna")}`;
}
function vaccineSummaryHtml() {
  return `<h1>Vacunas</h1>${state.vaccines.map(vaccineWordHtml).join('<div style="page-break-after:always"></div>')}`;
}
function fullProducerSection(prod) {
  const q = getProducerQuestionnaireSkeleton(prod);
  return `<section><h1>Productor(a): ${esc(prod.basic.name)}</h1><p><b>Contacto:</b> ${esc(prod.basic.celular)}</p><p><b>Ubicación:</b> ${esc([prod.basic.localidad, prod.basic.municipio, prod.basic.estado].filter(Boolean).join(", "))}</p><p><b>Horario:</b> ${esc(prod.basic.horario)}</p><p><b>Horario semanal:</b> ${esc(formatWeeklySchedule(prod.basic.weeklySchedule || {}))}</p><p><b>Clasificación:</b> ${esc(prod.classification?.value)} · <b>Alerta:</b> ${esc(prod.classification?.alerta)} · <b>Nota extra:</b> ${esc(prod.classification?.notaExtraPersona)}</p>${imageHtml(prod.photo, "Foto productor(a)")}<h2>Datos básicos completos</h2>${objectEntriesTable(prod.basic || {})}<h2>Ubicación</h2>${objectEntriesTable(prod.location || {})}<h2>Familia</h2><table><tr><th>Nombre</th><th>Parentesco</th><th>Edad</th><th>Ocupación</th></tr>${(prod.family || []).map((f) => `<tr><td>${esc(f.name)}</td><td>${esc(f.relation)}</td><td>${esc(f.age)}</td><td>${esc(f.occupation)}</td></tr>`).join("")}</table><h2>Animales</h2>${(prod.animals || []).map((a) => `<div><h3>${esc(animalLabel(a))}</h3>${objectEntriesTable(a)}${(a.photos || []).map((src, i) => imageHtml(src, `Animal ${i + 1}`)).join("")}</div>`).join("")}<h2>Cuestionario de animales</h2>${objectEntriesTable(q)}<h2>Notas</h2><p>${esc(prod.notes)}</p></section>`;
}
function producerWordHtml(prod) {
  return fullProducerSection(prod);
}
function medSummaryHtml() {
  return `<h1>Medicamentos</h1>${state.meds
    .map((m) => `<section><h2>${esc(m.brand)} · ${esc(m.active)}</h2><p><b>Propiedad:</b> ${esc(medOwnerLabel(m.owner))}</p><p><b>Presentación:</b> ${esc(m.presentation)}</p><p><b>Caducidad:</b> ${esc(m.expiry)}</p><p><b>Cantidad total:</b> ${esc(m.totalQty)} ${esc(m.unit)} · <b>Disponible:</b> ${esc(medRemaining(m))} ${esc(m.unit)}</p><p><b>Costo:</b> ${money(m.cost)} · <b>Costo unitario:</b> ${money(m.unitCost)} · <b>Ana Rosa:</b> ${money(m.anaRosaCharge)}</p><h3>Ficha clínica</h3>${objectEntriesTable(m.clinical || {})}${imageHtml(m.photos?.rx, "Receta")}${imageHtml(m.photos?.ticket, "Ticket")}</section>`).join('<div style="page-break-after:always"></div>')}`;
}
function supplySummaryHtml() {
  return `<h1>Insumos</h1>${state.supplies.map((s) => `<section><h2>${esc(s.name)}</h2><p><b>Tipo:</b> ${esc(s.type)}</p><p><b>Disponibilidad:</b> ${esc(supplyRemaining(s))}</p><p><b>${s.type === "NON_DISPOSABLE" ? "Costo por uso" : "Costo unitario real"}:</b> ${money(supplyDisplayCost(s))}</p>${objectEntriesTable(s)}${imageHtml(s.ticket, "Ticket insumo")}</section>`).join('<div style="page-break-after:always"></div>')}`;
}
function procedureWordHtml(p) {
  const prod = byId(state.producers, p.producerId);
  const animal = (prod?.animals || []).find((a) => a.id === p.animalId);
  const labs = state.labTests.filter((l) => (p.labIds || []).includes(l.id));
  return `<h1>Procedimiento ${esc(p.type)}</h1><p><b>Fecha:</b> ${esc(p.date)}</p><p><b>Productor(a):</b> ${esc(prod?.basic?.name || "")}</p><p><b>Animal:</b> ${esc(animal ? animalLabel(animal) : p.identification)}</p><p><b>Notas:</b> ${esc(p.notes)}</p><h2>Datos generales</h2>${objectEntriesTable({ fecha: p.date, tipo: p.type, alcance: p.scope, lugar: p.place, productor: prod?.basic?.name || "", animal: animal ? animalLabel(animal) : p.identification, cantidad_animales: p.animalsQtyUsed, especie: p.species, identificacion: p.identification, peso: p.weight, temperatura: p.temperature, estado_general: p.generalState, estado_cobro: p.chargeStatus, notas_cobro: p.chargeNotes, notas_generales: p.notes })}<h2>Inventario usado</h2><table><tr><th>Tipo</th><th>Nombre</th><th>Cantidad</th><th>Costo</th><th>Notas</th></tr>${(p.inventory?.meds || []).map((i) => `<tr><td>Medicamento</td><td>${esc(i.name)}</td><td>${esc(i.qty)} ${esc(i.unit || "")}</td><td>${money(Number(i.qty || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.owner || "")}</td></tr>`).join("")}${(p.inventory?.vaccines || []).map((i) => `<tr><td>Vacuna</td><td>${esc(i.name)}</td><td>${esc(i.animalsApplied)} animales</td><td>${money(Number(i.animalsApplied || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.notes || "")}</td></tr>`).join("")}${(p.inventory?.supplies || []).map((i) => `<tr><td>Insumo</td><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${money(Number(i.qty || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.notes || "")}</td></tr>`).join("")}</table><h2>Caso clínico</h2>${objectEntriesTable(p.caseClinical || {})}<h2>Necropsia</h2>${objectEntriesTable(p.necropsy || {})}<h2>Atención clínica / zootécnica</h2>${objectEntriesTable(p.zootecnia || {})}<h2>Cirugía</h2>${objectEntriesTable(p.surgery || {})}<h2>Pruebas vinculadas</h2><table><tr><th>Tipo</th><th>Fecha</th><th>Animal</th><th>Resultado</th><th>Interpretación</th><th>Observaciones</th></tr>${labs.map((l) => `<tr><td>${esc(l.type)}</td><td>${esc(l.date)}</td><td>${esc(l.animal)}</td><td>${esc(l.result)}</td><td>${esc(l.interpretation)}</td><td>${esc(l.notes)}</td></tr>`).join("")}</table>${labs.map((l, idx) => imageHtml(l.file, `Archivo prueba ${idx + 1}`)).join("")}<h2>Cobro y evidencia</h2>${objectEntriesTable({ procedimiento: money(p.charge?.base), medicamentos: money(p.charge?.meds), vacunas: money(p.charge?.vaccines), insumos: money(p.charge?.supplies), subtotal: money(p.charge?.subtotal), total: money(p.charge?.total), monto_final: money(p.charge?.manual), estatus: p.charge?.status, observaciones: p.charge?.reason || p.charge?.notes })}${(p.caseClinical?.photos || []).map((src, i) => imageHtml(src, `Caso clínico ${i + 1}`)).join("")}${(p.necropsy?.photos || []).map((src, i) => imageHtml(src, `Necropsia ${i + 1}`)).join("")}${imageHtml(p.charge?.photo, "Evidencia de cobro")}`;
}
function procedureSummaryHtml() {
  return `<h1>Procedimientos consolidados</h1>${state.procedures.map(procedureWordHtml).join('<div style="page-break-after:always"></div>')}`;
}
function producerExcelSheets(
  producers = state.producers,
  animals = [],
  meds = state.meds,
  vaccines = state.vaccines,
  supplies = state.supplies,
  procedures = state.procedures,
  labs = state.labTests,
) {
  const animalRows = animals.length
    ? animals
    : producers.flatMap((p) =>
        (p.animals || []).map((a) => ({ producer: p.basic.name, ...a })),
      );
  return [
    {
      name: "Productores",
      rows: [
        [
          "Nombre",
          "Celular",
          "Localidad",
          "Municipio",
          "Estado",
          "Clasificación",
          "Razones no trabajar",
          "Nota extra",
          "Maps",
          "Notas",
        ],
        ...producers.map((p) => [
          p.basic.name,
          p.basic.celular,
          p.basic.localidad,
          p.basic.municipio,
          p.basic.estado,
          p.classification?.value || "",
          p.classification?.alerta || "",
          p.classification?.notaExtraPersona || "",
          p.location?.mapsUrl || "",
          p.notes || "",
        ]),
      ],
    },
    {
      name: "Animales",
      rows: [
        ["Productor(a)", "Especie", "Raza", "Cantidad", "Función", "Extra"],
        ...animalRows.map((a) => [
          a.producer || producerName(state.selectedProducerId),
          a.species,
          a.breed,
          a.quantity,
          (a.function || []).join(", "),
          a.functionOther || "",
        ]),
      ],
    },
    {
      name: "Medicamentos",
      rows: [
        [
          "Nombre",
          "Activo",
          "Propiedad",
          "Cantidad",
          "Unidad",
          "Disponible",
          "Cobrado Ana Rosa",
        ],
        ...meds.map((m) => [
          m.brand,
          m.active,
          medOwnerLabel(m.owner),
          m.totalQty,
          m.unit,
          medRemaining(m),
          m.anaRosaCharge,
        ]),
      ],
    },
    {
      name: "Vacunas",
      rows: [
        ["Marca", "Propiedad", "Caducidad", "Cobertura", "Disponible", "Costo total", "Costo unitario", "Enfermedades", "Notas"],
        ...vaccines.map((v) => [
          v.brand,
          medOwnerLabel(v.owner),
          v.expiry,
          v.coverageAnimals,
          vaccineRemaining(v),
          v.price,
          v.unitCost,
          v.diseases,
          v.notes || "",
        ]),
      ],
    },
    {
      name: "Insumos",
      rows: [
        ["Nombre", "Tipo", "Cantidad", "Disponible", "Costo mostrado", "Notas"],
        ...supplies.map((s) => [
          s.name,
          s.type,
          s.qty,
          supplyRemaining(s),
          supplyDisplayCost(s),
          s.notes || "",
        ]),
      ],
    },
    {
      name: "Procedimientos",
      rows: [
        [
          "Fecha",
          "Tipo",
          "Productor(a)",
          "Animal",
          "Cobro procedimiento",
          "Cobro medicamentos",
          "Cobro vacunas",
          "Cobro insumos",
          "Subtotal",
          "Total",
          "Cobro final",
          "Observaciones",
        ],
        ...procedures.map((p) => [
          p.date,
          p.type,
          producerName(p.producerId),
          byId(byId(state.producers, p.producerId)?.animals || [], p.animalId)
            ?.species ||
            p.identification ||
            "",
          p.charge?.base,
          p.charge?.meds,
          p.charge?.vaccines,
          p.charge?.supplies,
          p.charge?.subtotal,
          p.charge?.total,
          p.charge?.manual,
          p.charge?.reason || p.charge?.notes || "",
        ]),
      ],
    },
    {
      name: "PruebasLab",
      rows: [
        [
          "Tipo",
          "Fecha",
          "Animal",
          "Resultado",
          "Interpretación",
          "Procedimiento",
        ],
        ...labs.map((l) => [
          l.type,
          l.date,
          l.animal,
          l.result,
          l.interpretation,
          l.linkedProcedureId || "",
        ]),
      ],
    },
  ];
}

function renderAll() {
  renderProducerList();
  renderAnimalsProducerSelect();
  renderAnimalPeopleSelects();
  renderAnimalBasedSelects();
  renderAnimalGroups();
  fillAnimalQuestionnaire();
  renderMedList();
  renderVaccineList();
  renderSupplyList();
  renderProcedureProducerSelect();
  renderProcedureAnimalSelect();
  populateInventorySelects();
  renderProcedureDraftLists();
  renderProcedureList();
}

function bindGlobal() {
  $("#btnExportAllWord")?.addEventListener("click", () =>
    exportWord(
      "app_rural_resumen.doc",
      `<h1>Resumen App Rural</h1>${state.producers.map(fullProducerSection).join('<div style="page-break-after:always"></div>')}<div style="page-break-after:always"></div>${medSummaryHtml()}<div style="page-break-after:always"></div>${vaccineSummaryHtml()}<div style="page-break-after:always"></div>${supplySummaryHtml()}<div style="page-break-after:always"></div>${procedureSummaryHtml()}`,
    ),
  );
  $("#btnExportAllExcel")?.addEventListener("click", () =>
    exportExcel("app_rural_resumen.xls", producerExcelSheets()),
  );
  $("#btnBackupJson")?.addEventListener("click", () =>
    download(
      `app_rural_backup_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(state, null, 2),
      "application/json",
    ),
  );
  $("#btnRestoreJsonInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = async () => {
      try {
        const parsed = JSON.parse(fr.result);
        Object.assign(state, parsed);
        normalizeEntityCollections(window.AppServices?.auth?.getCurrentUser?.()?.uid || null);
        saveState();
        await loadState();
        renderAll();
        updateSyncUi();
      } catch (err) {
        alert("JSON inválido");
      }
    };
    fr.readAsText(f);
    e.target.value = "";
  });
  $("#btnGoogleLogin")?.addEventListener("click", async () => {
    try {
      const result = await window.AppServices?.auth?.signInWithGoogle?.();
      if (result?.redirected) alert('Se abrirá Google para completar el inicio de sesión.');
    } catch (error) {
      updateFirebaseConfigUi(error?.firebaseStatus || window.AppServices?.firebase?.getStatus?.() || {});
      alert(friendlyAuthError(error));
    }
  });
  $("#btnGoogleLogout")?.addEventListener("click", async () => {
    try {
      await window.AppServices?.auth?.signOut?.();
      updateAuthUi(null);
    } catch (error) {
      alert(error.message || "No se pudo cerrar sesión");
    }
  });
  $("#btnSyncNow")?.addEventListener("click", async () => {
    saveState();
    const result = await window.AppServices?.sync?.triggerSync?.(state);
    if (result?.reason === 'firebase-config') {
      updateFirebaseConfigUi(result.firebaseStatus || window.AppServices?.firebase?.getStatus?.() || {});
      alert('El respaldo en nube todavía no está activo. Tus datos siguen guardándose en este dispositivo.');
    }
    if (result?.reason === 'auth') alert('Inicia sesión con Google para respaldar y sincronizar tu información.');
    updateSyncUi({ phase: result?.ok ? 'success' : result?.error ? 'error' : undefined, at: Date.now(), error: result?.error?.message || result?.error, conflicts: result?.conflicts || 0 });
    renderAll();
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  window.AppServices?.init?.();
  updateFirebaseConfigUi(window.AppServices?.firebase?.getStatus?.() || {});
  await loadState();
  bindTabs();
  bindProducer();
  bindAnimals();
  bindMeds();
  bindVaccines();
  bindSupplies();
  bindProcedures();
  bindGlobal();
  window.AppServices?.connectivity?.onChange?.((online) => {
    updateConnectivityBadge(online);
    if (online) {
      saveState();
      window.AppServices?.sync?.triggerSync?.(state).then((result) => {
        if (result?.ok) renderAll();
      });
    }
  });
  window.AppServices?.auth?.onAuthChanged?.((user) => {
    updateAuthUi(user);
    updateFirebaseConfigUi(window.AppServices?.firebase?.getStatus?.() || {});
    saveState();
  });
  window.AppServices?.sync?.onSyncChanged?.((status) => {
    if (status?.phase === 'success') {
      state.sync.lastSyncedAt = status.at;
      saveState();
      renderAll();
    }
    updateSyncUi(status);
  });
  if (!state.selectedProducerId && state.producers[0])
    state.selectedProducerId = state.producers[0].id;
  renderAll();
  activateTab("Producer");
  updateProducerConditionalFields();
  updateConnectivityBadge(window.AppServices?.connectivity?.isOnline?.() ?? navigator.onLine);
  updateAuthUi(window.AppServices?.auth?.getCurrentUser?.() || null);
  updateFirebaseConfigUi(window.AppServices?.firebase?.getStatus?.() || {});
  updateSyncUi();
  saveState();
});
