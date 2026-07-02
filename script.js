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
    labTestId: null,
    procedureId: null,
    traditionalId: null,
    genderAnimalId: null,
    diseaseId: null,
    programId: null,
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
    procedureAnimalEntries: [],
    procedureFollowupMedicationEntries: [],
    procedureFollowupMedicationEditId: null,
    procedureSpeciesDoses: [],
    procedureClinicalDayMedications: [],
    procedureClinicalDaySupplies: [],
    procedureClinicalDays: [],
    procedureClinicalDayEditId: null,
    labImages: [],
    labSupplyUses: [],
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
  anaRosaDebt: {
    records: [],
    paidHistory: [],
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
      synced: changed ? false : Boolean(previous.synced),
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
    const normalizedAnimals = normalizeProducerAnimals(producer).map((animal) =>
      normalizeSyncMeta(animal, "animals", ownerUserId),
    );
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
      anaRosaDebt: {
        records: Array.isArray(parsed.anaRosaDebt?.records) ? parsed.anaRosaDebt.records : [],
        paidHistory: Array.isArray(parsed.anaRosaDebt?.paidHistory) ? parsed.anaRosaDebt.paidHistory : [],
      },
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
  if (code === 'auth/popup-blocked') return 'Tu navegador bloqueó la ventana de Google. Intenta de nuevo y permite la ventana emergente.';
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
    (err) => {
      const readable = err?.code === err?.PERMISSION_DENIED
        ? 'Activa el permiso de ubicación para completar este paso cuando lo necesites.'
        : 'No fue posible obtener tu ubicación en este momento.';
      show('msg', readable, 'warning');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
function updateSyncUi(status = {}) {
  const syncText = $("#syncStatusText");
  const lastSync = $("#lastSyncText");
  if (syncText && status.phase) syncText.textContent = {
    running: "Sincronizando…",
    success: `Sincronización al día${status.conflicts ? ` · conflictos: ${status.conflicts}` : ''}`,
    error: 'Tus cambios siguen guardados localmente',
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
  if (type === "success" && ["a_msg", "ok", "p_ok", "lab_okStandalone", "m_ok"].includes(id)) {
    showFloatingNotice(msg || "Cambios guardados");
  }
}
function showFloatingNotice(message) {
  if (!message) return;
  const id = "saveFloatingNotice";
  let box = document.getElementById(id);
  if (!box) {
    box = document.createElement("aside");
    box.id = id;
    box.className = "save-toast";
    document.body.appendChild(box);
  }
  box.textContent = `✅ ${message}`;
  box.classList.add("visible");
  clearTimeout(showFloatingNotice._timer);
  showFloatingNotice._timer = setTimeout(() => box.classList.remove("visible"), 3200);
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
function cloneStateWithImageRefs(input, imageMap = {}, path = "root") {
  if (Array.isArray(input)) {
    return input.map((item, idx) => cloneStateWithImageRefs(item, imageMap, `${path}.${idx}`));
  }
  if (!input || typeof input !== "object") {
    if (typeof input === "string" && input.startsWith("data:image/")) {
      const key = `img_${Object.keys(imageMap).length + 1}`;
      imageMap[key] = { path, dataUrl: input };
      return `__IMG_REF__:${key}`;
    }
    return input;
  }
  return Object.entries(input).reduce((acc, [key, value]) => {
    acc[key] = cloneStateWithImageRefs(value, imageMap, `${path}.${key}`);
    return acc;
  }, {});
}
function restoreStateImageRefs(input, imageMap = {}) {
  if (Array.isArray(input)) return input.map((item) => restoreStateImageRefs(item, imageMap));
  if (!input || typeof input !== "object") {
    if (typeof input === "string" && input.startsWith("__IMG_REF__:")) {
      const key = input.split(":")[1];
      return imageMap[key]?.dataUrl || "";
    }
    return input;
  }
  return Object.entries(input).reduce((acc, [key, value]) => {
    acc[key] = restoreStateImageRefs(value, imageMap);
    return acc;
  }, {});
}
function fileExtensionFromDataUrl(dataUrl = "") {
  const mime = dataUrl.match(/^data:([^;]+);/i)?.[1]?.toLowerCase() || "";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("bmp")) return "bmp";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("heif")) return "heif";
  if (mime.includes("svg")) return "svg";
  return "jpg";
}
function sanitizeFilePart(value, fallback = "sin-dato") {
  const cleaned = safe(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return cleaned || fallback;
}
function normalizeDateText(value) {
  const raw = safe(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}
function inferImageContext(path, rootState) {
  const segments = safe(path).split(".").slice(1);
  const moduleRaw = segments[0] || "general";
  const moduleName = sanitizeFilePart(moduleRaw, "general");
  const labels = [];
  let cursor = rootState;
  let dateLabel = "";
  for (const segment of segments) {
    if (!cursor) break;
    const next = Array.isArray(cursor) ? cursor[Number(segment)] : cursor[segment];
    if (next && typeof next === "object") {
      const producerNameLabel = next.basic?.name || next.producerName;
      if (producerNameLabel) labels.push(`prod-${sanitizeFilePart(producerNameLabel)}`);
      if (next.name) labels.push(sanitizeFilePart(next.name));
      if (next.brand) labels.push(sanitizeFilePart(next.brand));
      if (next.type) labels.push(sanitizeFilePart(next.type));
      if (next.id) labels.push(sanitizeFilePart(next.id));
      if (!dateLabel) {
        const fromObj = normalizeDateText(next.date || next.sampleDate || next.resultDate || "");
        if (fromObj) dateLabel = fromObj;
      }
    }
    cursor = next;
  }
  const uniqueLabels = [...new Set(labels)].filter(Boolean).slice(0, 3);
  const finalDate = dateLabel || new Date().toISOString().slice(0, 10);
  return { moduleName, label: uniqueLabels.join("_"), dateLabel: finalDate };
}
async function exportUploadedImagesZip(currentState) {
  const ZipCtor = window.JSZip;
  if (!ZipCtor) {
    throw new Error("No se pudo cargar el generador ZIP. Revisa la conexión e intenta de nuevo.");
  }
  const imageMap = {};
  cloneStateWithImageRefs(currentState, imageMap);
  const entries = Object.entries(imageMap);
  if (!entries.length) throw new Error("No hay imágenes subidas para descargar.");
  const zip = new ZipCtor();
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalImages: entries.length,
    notes: "Respaldo de imágenes exportadas desde App Rural. Usa este archivo junto con el respaldo JSON principal.",
    files: [],
  };
  entries.forEach(([key, image], index) => {
    const dataUrl = image?.dataUrl || "";
    if (!dataUrl.startsWith("data:image/")) return;
    const { moduleName, label, dateLabel } = inferImageContext(image.path, currentState);
    const extension = fileExtensionFromDataUrl(dataUrl);
    const indexTag = String(index + 1).padStart(4, "0");
    const fileBase = [moduleName, label, dateLabel, indexTag].filter(Boolean).join("__");
    const relativePath = `${moduleName}/${fileBase}.${extension}`;
    const base64 = dataUrl.split(",")[1] || "";
    zip.file(relativePath, base64, { base64: true });
    manifest.files.push({ key, path: image.path, file: relativePath, module: moduleName });
  });
  zip.file("manifest-imagenes.json", JSON.stringify(manifest, null, 2));
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(zipBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `app_rural_imagenes_${stamp}.zip`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  return { total: manifest.files.length };
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
function checkedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map((i) => i.value)
    .filter(Boolean);
}
function setCheckedValues(name, values = []) {
  const set = new Set(Array.isArray(values) ? values : []);
  document
    .querySelectorAll(`input[name="${name}"]`)
    .forEach((i) => (i.checked = set.has(i.value)));
}
function multiValues(sel) {
  return Array.from(sel?.selectedOptions || [])
    .map((o) => o.value)
    .filter(Boolean);
}
function checklistValues(selectorOrElement) {
  const el = typeof selectorOrElement === "string" ? $(selectorOrElement) : selectorOrElement;
  if (!el) return [];
  return Array.from(el.querySelectorAll("input[type='checkbox']:checked"))
    .map((input) => input.value)
    .filter(Boolean);
}
function setChecklistValues(selectorOrElement, values = []) {
  const el = typeof selectorOrElement === "string" ? $(selectorOrElement) : selectorOrElement;
  if (!el) return;
  const selected = new Set(Array.isArray(values) ? values : []);
  el.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = selected.has(input.value);
  });
}
function toArrayValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}
function setMulti(sel, values = []) {
  if (!sel) return;
  Array.from(sel.options).forEach(
    (o) => (o.selected = values.includes(o.value)),
  );
}
const ANIMAL_FUNCTION_OPTIONS = [
  { v: "Autoconsumo", t: "Autoconsumo" },
  { v: "Venta", t: "Venta" },
  { v: "Ahorro", t: "Ahorro" },
  { v: "Tradición familiar", t: "Tradición familiar" },
  { v: "Compañía", t: "Compañía" },
  { v: "Distracción", t: "Distracción" },
  { v: "Ornato", t: "Ornato" },
  { v: "Trabajo", t: "Trabajo" },
  { v: "Otro", t: "Otro" },
];
const SALE_DECISION_NO_SALE = "NO_SE_VENDEN";
const animalPeopleLabel = (value = "") => {
  if (value === "PRODUCTOR") return "Productor(a)";
  if (value === "VETERINARIO") return "Veterinario(a)";
  if (value === "OTRO") return "Otro";
  if (value === SALE_DECISION_NO_SALE) return "No se venden";
  return value;
};
function renderChecklist(containerSelector, options = [], values = [], onChange = null) {
  const el = $(containerSelector);
  if (!el) return;
  const selected = new Set(toArrayValue(values));
  el.innerHTML = options
    .map((option, idx) => `<label class="multi-checklist-item"><input type="checkbox" value="${esc(option.v)}" data-index="${idx}" ${selected.has(option.v) ? "checked" : ""}/><span>${esc(option.t)}</span></label>`)
    .join("");
  if (typeof onChange === "function") {
    el.querySelectorAll("input[type='checkbox']").forEach((input) =>
      input.addEventListener("change", () => onChange(input, el)),
    );
  }
}
function displayAnimalPeople(values = []) {
  return toArrayValue(values).map((value) => animalPeopleLabel(value));
}
function getProducer() {
  return byId(state.producers, state.selectedProducerId);
}
function normalizeProducerAnimals(producer = {}) {
  const producerId = producer?.id || null;
  const producerDisplayName = producer?.basic?.name || producer?.producerName || "";
  return (producer?.animals || []).map((animal) => ({
    ...animal,
    producerId: producerId || animal?.producerId || null,
    producerName: producerDisplayName || animal?.producerName || "",
    owner: toArrayValue(animal?.owner),
    decideSale: toArrayValue(animal?.decideSale),
    feedClean: toArrayValue(animal?.feedClean),
    function: toArrayValue(animal?.function),
  }));
}
function producerName(id) {
  return byId(state.producers, id)?.basic?.name || "Sin productor/a";
}
function procedureProducerName(procedure = {}) {
  return byId(state.producers, procedure.producerId)?.basic?.name || procedure.unregisteredClientName || procedure.producerName || "Sin productor registrado";
}
function deepJsonClone(value) {
  return JSON.parse(JSON.stringify(value || null));
}
function buildProducerTransferPayload(producers = []) {
  const selectedProducers = (producers || []).filter(Boolean);
  const producerIds = new Set(selectedProducers.map((producer) => producer.id));
  const procedures = (state.procedures || []).filter((procedure) =>
    producerIds.has(procedure.producerId),
  );
  const procedureIds = new Set(procedures.map((procedure) => procedure.id));
  const labTests = (state.labTests || []).filter((lab) =>
    producerIds.has(lab.producerId) || procedureIds.has(lab.linkedProcedureId),
  );
  return {
    format: "app-rural-producer-transfer",
    version: 1,
    exportedAt: new Date().toISOString(),
    notes:
      "Exportación JSON de productor(es) con datos básicos, animales, cuestionarios, roles, medicina tradicional, procedimientos y laboratorio relacionado.",
    producers: deepJsonClone(selectedProducers),
    procedures: deepJsonClone(procedures),
    labTests: deepJsonClone(labTests),
  };
}
function exportProducersJson(producers = state.producers, filename = "productores_app_rural") {
  const selectedProducers = (producers || []).filter(Boolean);
  if (!selectedProducers.length) {
    alert("No hay productores para exportar.");
    return;
  }
  const payload = buildProducerTransferPayload(selectedProducers);
  download(
    `${filename}_${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
  showFloatingNotice(
    `Exportación JSON generada: ${selectedProducers.length} productor(es).`,
  );
}
function extractProducerTransferPayload(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.format === "app-rural-producer-transfer") return parsed;
  if (parsed.producer) {
    return {
      format: "app-rural-producer-transfer",
      version: 1,
      producers: [parsed.producer],
      procedures: parsed.procedures || [],
      labTests: parsed.labTests || [],
    };
  }
  if (Array.isArray(parsed.producers)) {
    return {
      format: "app-rural-producer-transfer",
      version: parsed.version || 1,
      producers: parsed.producers,
      procedures: parsed.procedures || [],
      labTests: parsed.labTests || [],
    };
  }
  return null;
}
function remapIdsDeep(value, idMap) {
  if (Array.isArray(value)) return value.map((item) => remapIdsDeep(item, idMap));
  if (!value || typeof value !== "object") {
    return typeof value === "string" && idMap[value] ? idMap[value] : value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, remapIdsDeep(child, idMap)]),
  );
}
function importSingleProducerPayload(parsed) {
  const payload = extractProducerTransferPayload(parsed);
  if (!payload || !Array.isArray(payload.producers)) {
    throw new Error("El JSON no tiene formato de productor exportado desde App Rural.");
  }
  if (payload.producers.length !== 1) {
    throw new Error("Para importar se requiere un JSON con exactamente 1 productor(a).");
  }

  const sourceProducer = deepJsonClone(payload.producers[0]);
  const sourceProcedures = deepJsonClone(payload.procedures || []);
  const sourceLabTests = deepJsonClone(payload.labTests || []);
  const oldProducerId = sourceProducer.id;
  const idMap = { [oldProducerId]: uid("prod") };

  (sourceProducer.animals || []).forEach((animal) => {
    if (animal?.id) idMap[animal.id] = uid("animal");
  });
  sourceProcedures.forEach((procedure) => {
    if (procedure?.id) idMap[procedure.id] = uid("proc");
  });
  sourceLabTests.forEach((lab) => {
    if (lab?.id) idMap[lab.id] = uid("lab");
  });

  const importedProducer = remapIdsDeep(sourceProducer, idMap);
  importedProducer.id = idMap[oldProducerId];
  importedProducer.animals = normalizeProducerAnimals(importedProducer);

  const importedProcedures = sourceProcedures
    .filter((procedure) => procedure?.producerId === oldProducerId)
    .map((procedure) => remapIdsDeep(procedure, idMap));
  const importedProcedureIds = new Set(importedProcedures.map((procedure) => procedure.id));
  const importedLabTests = sourceLabTests
    .filter(
      (lab) =>
        lab?.producerId === oldProducerId ||
        (lab?.linkedProcedureId && idMap[lab.linkedProcedureId]),
    )
    .map((lab) => remapIdsDeep(lab, idMap))
    .filter((lab) => !lab.linkedProcedureId || importedProcedureIds.has(lab.linkedProcedureId));

  state.producers.unshift(importedProducer);
  state.procedures.unshift(...importedProcedures);
  state.labTests.unshift(...importedLabTests);
  state.selectedProducerId = importedProducer.id;
  saveState();
  renderAll();
  return {
    producer: importedProducer,
    procedures: importedProcedures.length,
    labTests: importedLabTests.length,
  };
}
function currentAnimals() {
  const producer = getProducer();
  if (!producer) return [];
  return (producer.animals || []).filter(
    (animal) => !animal?.producerId || animal.producerId === producer.id,
  );
}
function animalLabel(an = {}) {
  const base = [
    an.species,
    an.breed,
    an.quantity ? `(${an.quantity})` : "",
    an.functionOther,
  ]
    .filter(Boolean)
    .join(" ");
  return an.clinicalStatus === "DECESO" ? `${base || "Animal"} · Deceso` : base;
}

function inventoryUsage() {
  const meds = {},
    vaccines = {},
    supplies = {};
  state.procedures.forEach((p) => {
    (p.inventory?.meds || []).forEach(
      (i) => (meds[i.itemId] = (meds[i.itemId] || 0) + Number(i.inventoryDeductionQty || i.chargeableQty || i.qty || 0)),
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
  state.labTests.forEach((lab) => {
    (lab.inventory?.meds || []).forEach(
      (i) => (meds[i.itemId] = (meds[i.itemId] || 0) + Number(i.inventoryDeductionQty || i.chargeableQty || i.qty || 0)),
    );
    (lab.inventory?.vaccines || []).forEach(
      (i) =>
        (vaccines[i.itemId] =
          (vaccines[i.itemId] || 0) + Number(i.animalsApplied || 0)),
    );
    (lab.inventory?.supplies || []).forEach(
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
    Lab: "pageLab",
    Procedures: "pageProcedures",
    Debt: "pageDebt",
  };
  Object.entries(map).forEach(([tab, page]) => {
    document
      .getElementById(`tab${tab}`)
      ?.classList.toggle("active", tab === name);
    document.getElementById(page)?.classList.toggle("active", tab === name);
  });
}

function bindTabs() {
  ["Producer", "Animals", "Meds", "Vaccines", "Supplies", "Lab", "Procedures", "Debt"].forEach((tab) =>
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
  const editingProducer = state.editing.producerId
    ? byId(state.producers, state.editing.producerId)
    : null;
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
    questionnaire: getProducerQuestionnaireSkeleton(editingProducer),
    animals: normalizeProducerAnimals(editingProducer),
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
  const legacyProgramName = questionnaire.programaNombre || "";
  const legacyProgramHasFolio = questionnaire.programaFolioTiene || "";
  const legacyProgramFolio = questionnaire.folio || "";
  const normalizedPrograms = Array.isArray(questionnaire.programs)
    ? questionnaire.programs
    : legacyProgramName || legacyProgramHasFolio || legacyProgramFolio
      ? [{
          id: uid("prog"),
          name: legacyProgramName,
          hasFolio: legacyProgramHasFolio,
          folio: legacyProgramFolio,
        }]
      : [];
  return {
    diseases: Array.isArray(questionnaire.diseases) ? questionnaire.diseases : [],
    vaccines: Array.isArray(questionnaire.vaccines) ? questionnaire.vaccines : [],
    deworming: Array.isArray(questionnaire.deworming) ? questionnaire.deworming : [],
    genderAnimals: Array.isArray(questionnaire.genderAnimals) ? questionnaire.genderAnimals : [],
    genderActivities: Array.isArray(questionnaire.genderActivities) ? questionnaire.genderActivities : [],
    A6: questionnaire.A6 || "",
    A7: questionnaire.A7 || "",
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
    programs: normalizedPrograms.map((entry) => ({
      id: entry?.id || uid("prog"),
      name: entry?.name || entry?.program || "",
      hasFolio: entry?.hasFolio || entry?.programaFolioTiene || "",
      folio: entry?.folio || "",
    })),
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
    rumiantNeedOptions: Array.isArray(questionnaire.rumiantNeedOptions)
      ? questionnaire.rumiantNeedOptions.filter(Boolean)
      : [],
    rumiantNeedOther: questionnaire.rumiantNeedOther || "",
    rumiantNeedExplain: questionnaire.rumiantNeedExplain || "",
    rumiantNeed: questionnaire.rumiantNeed || "",
    rumiantTrainingTopics: Array.isArray(questionnaire.rumiantTrainingTopics)
      ? questionnaire.rumiantTrainingTopics.filter(Boolean)
      : [],
    birdsInterest: questionnaire.birdsInterest || questionnaire.birdsInterestYes || questionnaire.birdsInterestNo || "",
    traditional: (Array.isArray(questionnaire.traditional) ? questionnaire.traditional : []).map((item) => ({
      ...item,
      targetAnimals: item?.targetAnimals || item?.animals || "",
    })),
  };
}

function getProducerQuestionnaireSkeleton(prod) {
  return normalizeQuestionnaire(prod?.questionnaire || {});
}
function normalizeAnimalText(value = "") {
  return safe(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
function producerHasRegisteredBirds(prod = getProducer()) {
  return (prod?.animals || []).some((animal) => {
    const haystack = [animal?.species, animal?.breed, animal?.functionOther]
      .map(normalizeAnimalText)
      .join(" ");
    return /(aves? de corral|otras? aves?|aves? de pelea|gall(?:ina|inas|o|os)|pollo|pollos|guajolote|guajolotes|pato|patos|ganso|gansos|codorniz|codornices|ave)/.test(haystack);
  });
}
function birdInterestPrompt(hasBirds) {
  return hasBirds
    ? "Si actualmente tiene aves, ¿qué tanto interés tendría en participar en actividades para mejorar la crianza y manejo de sus aves? (1 a 4)"
    : "Si actualmente no tiene aves, ¿qué tanto interés tendría en participar en actividades para aprender cómo iniciar la crianza de aves? (1 a 4)";
}
function resetTraditionalForm() {
  state.editing.traditionalId = null;
  ["a_tradNombre", "a_tradTipo", "a_tradUso", "a_tradParte", "a_tradAnimales"].forEach((id) => {
    if ($("#" + id)) $("#" + id).value = "";
  });
  if ($("#a_addTrad")) {
    $("#a_addTrad").textContent = "➕ Agregar producto/remedio";
  }
}

function resetGenderAnimalForm() {
  state.editing.genderAnimalId = null;
  if ($("#a_genderAnimal")) $("#a_genderAnimal").value = FIXED_GENDER_ANIMAL_OPTIONS[0] || "";
  if ($("#a_genderAnimalWho")) $("#a_genderAnimalWho").value = "";
  if ($("#a_genderAnimalWhy")) $("#a_genderAnimalWhy").value = "";
  if ($("#a_addGenderAnimal")) $("#a_addGenderAnimal").textContent = "➕ Agregar registro";
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
  clearProducerScopedDraftState();
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
  const previousProducerId = state.selectedProducerId;
  const prod = collectProducerForm();
  if (!prod.basic.name) {
    show("err", "El nombre del productor(a) es obligatorio.", "error");
    return;
  }
  prod.animals = normalizeProducerAnimals(prod);
  const idx = state.producers.findIndex((x) => x.id === prod.id);
  if (idx >= 0) state.producers[idx] = prod;
  else state.producers.unshift(prod);
  if (previousProducerId !== prod.id) clearProducerScopedDraftState();
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
    item.innerHTML = `<h3>${esc(prod.basic.name)}</h3><div class="line"><b>Ubicación:</b> ${esc([prod.basic.localidad, prod.basic.municipio, prod.basic.estado].filter(Boolean).join(", "))}</div><div class="line"><b>Animales registrados:</b> ${animals}</div><div class="line"><b>Clasificación:</b> ${esc(prod.classification?.value || "Sin definir")}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Seleccionar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small ghost">JSON</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, select, w, e, json, del] = item.querySelectorAll("button");
    edit.onclick = () => fillProducerForm(prod);
    select.onclick = () => {
      if (state.selectedProducerId !== prod.id) clearProducerScopedDraftState();
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
    json.onclick = () =>
      exportProducersJson([prod], `productor_${slug(prod.basic.name || prod.id)}`);
    del.onclick = () => {
      if (confirm("¿Eliminar productor(a) y sus animales relacionados?")) {
        queueDeletedRecord("producers", prod);
        (state.procedures || []).filter((p) => p.producerId === prod.id).forEach((p) => queueDeletedRecord("procedures", p));
        state.producers = state.producers.filter((x) => x.id !== prod.id);
        state.procedures = state.procedures.filter((p) => p.producerId !== prod.id);
        if (state.selectedProducerId === prod.id) {
          clearProducerScopedDraftState();
          state.selectedProducerId = state.producers[0]?.id || null;
        }
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
  $("#btnExport")?.addEventListener("click", () =>
    exportProducersJson(state.producers, "productores_app_rural"),
  );
  $("#btnImport")?.addEventListener("click", () => $("#importFile")?.click());
  $("#importFile")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = importSingleProducerPayload(JSON.parse(reader.result));
        showFloatingNotice(
          `Productor(a) importado: ${result.producer.basic?.name || "sin nombre"}.`,
        );
        alert(
          `Se agregó 1 productor(a) sin modificar los demás datos. También se agregaron ${result.procedures} procedimiento(s) y ${result.labTests} prueba(s) de laboratorio relacionados.`,
        );
      } catch (error) {
        alert(error.message || "JSON inválido para importar productor(a).");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
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
  const producer = getProducer();
  const decideSale = checklistValues("#a_decideVenta");
  const normalizedDecideSale = decideSale.includes(SALE_DECISION_NO_SALE)
    ? [SALE_DECISION_NO_SALE]
    : decideSale;
  return {
    id: state.editing.animalId || uid("animal"),
    producerId: producer?.id || null,
    producerName: producer?.basic?.name || "",
    species: $("#a_especie").value.trim(),
    breed: $("#a_raza").value.trim(),
    quantity: $("#a_cantidad").value,
    owner: checklistValues("#a_dueno"),
    decideSale: normalizedDecideSale,
    feedClean: checklistValues("#a_limpiaAlimenta"),
    function: checklistValues("#a_funcion"),
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
    (sel) => setChecklistValues(sel, []),
  );
  state.draft.animalPhotos = [];
  renderAnimalPhotos();
}
function clearProducerScopedDraftState() {
  state.editing.animalId = null;
  state.editing.diseaseId = null;
  state.editing.programId = null;
  state.editing.traditionalId = null;
  state.editing.genderAnimalId = null;
  state.draft.animalPhotos = [];
  state.draft.labSelectedAnimalIds = [];
  state.draft.procedureAnimalEntries = [];
  state.draft.procedureFollowupMedicationEntries = [];
  state.draft.procedureFollowupMedicationEditId = null;
  state.draft.procedureSpeciesDoses = [];
  state.draft.procedureNecropsyFindings = [];
  state.draft.procedureClinicalDayMedications = [];
  state.draft.procedureClinicalDaySupplies = [];
  state.draft.procedureClinicalDays = [];
  state.draft.procedureClinicalDayEditId = null;
  if ($("#p_speciesDoseJson")) $("#p_speciesDoseJson").value = "";
  renderNecropsySystematicList([]);
  if ($("#a_especie")) resetAnimalEntry();
  if ($("#a_diseaseList")) resetDiseaseForm();
  if ($("#a_programasList")) resetProgramForm();
  if ($("#a_tradList")) resetTraditionalForm();
  if ($("#a_genderAnimalList")) resetGenderAnimalForm();
  if ($("#procedureForm")) resetProcedure();
  if ($("#labStandaloneForm")) resetLabStandalone();
}
function ensureSelectedProducerIntegrity() {
  if (!state.selectedProducerId) return;
  if (!byId(state.producers, state.selectedProducerId)) state.selectedProducerId = null;
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
  setChecklistValues("#a_dueno", an.owner || []);
  setChecklistValues("#a_decideVenta", an.decideSale || []);
  setChecklistValues("#a_limpiaAlimenta", an.feedClean || []);
  setChecklistValues("#a_funcion", an.function || []);
  state.draft.animalPhotos = [...(an.photos || [])];
  renderAnimalPhotos();
}
function saveAnimalGroup() {
  const prod = getProducer();
  if (!prod?.id) {
    show("a_msg", "Primero carga un productor(a) válido antes de guardar animales.", "warning");
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
  const personOptions = [
    { v: "PRODUCTOR", t: "Productor(a)" },
    ...(prod?.family || []).map((f) => ({
      v: f.name,
      t: `${f.name} (${f.relation || "familia"})`,
    })),
    { v: "VETERINARIO", t: "Veterinario(a)" },
    { v: "OTRO", t: "Otro" },
  ];
  const ownerPrev = checklistValues("#a_dueno");
  const decisionPrev = checklistValues("#a_decideVenta");
  const carePrev = checklistValues("#a_limpiaAlimenta");
  renderChecklist("#a_dueno", personOptions, ownerPrev);
  renderChecklist("#a_limpiaAlimenta", personOptions, carePrev);
  renderChecklist(
    "#a_decideVenta",
    [...personOptions, { v: SALE_DECISION_NO_SALE, t: "No se venden" }],
    decisionPrev,
    (input, container) => {
      if (input.value === SALE_DECISION_NO_SALE && input.checked) {
        container
          .querySelectorAll("input[type='checkbox']")
          .forEach((node) => {
            if (node.value !== SALE_DECISION_NO_SALE) node.checked = false;
          });
        return;
      }
      if (input.value !== SALE_DECISION_NO_SALE && input.checked) {
        const noSale = container.querySelector(
          `input[type='checkbox'][value='${SALE_DECISION_NO_SALE}']`,
        );
        if (noSale) noSale.checked = false;
      }
    },
  );
  const functionPrev = checklistValues("#a_funcion");
  renderChecklist("#a_funcion", ANIMAL_FUNCTION_OPTIONS, functionPrev);
  ["#a_vaxWho", "#a_dewormWho"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    const prev = el.value;
    el.innerHTML =
      '<option value="">— Selecciona —</option>' +
      personOptions
        .map((o) => `<option value="${esc(o.v)}">${esc(o.t)}</option>`)
        .join("");
    el.value = prev;
  });
}
function renderAnimalBasedSelects() {
  const prod = getProducer();
  const animals = prod?.animals || [];
  ["#a_enfAnimal", "#a_vaxAnimal", "#a_dewormAnimal"].forEach((sel) => {
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
  const hasBirds = producerHasRegisteredBirds(getProducer());
  if ($("#a_interestBirdsLabel")) {
    $("#a_interestBirdsLabel").textContent = birdInterestPrompt(hasBirds);
  }
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
            `<div class="preview-mini" style="position:relative;"><img src="${src}" alt="animal ${i + 1}"><button class="btn small bad" type="button" data-remove-photo="${i}" style="position:absolute;top:4px;right:4px;padding:2px 6px;">✕</button></div>`,
        )
        .join("")
    : '<div class="preview-box"><span>Sin<br/>fotos</span></div>';
  box.querySelectorAll("[data-remove-photo]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-remove-photo"));
      state.draft.animalPhotos = state.draft.animalPhotos.filter((_, i) => i !== idx);
      renderAnimalPhotos();
    }),
  );
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
    div.innerHTML = `<h4>${esc(animalLabel(an))}</h4><div class="line"><b>¿De quién son?:</b> ${esc(displayAnimalPeople(an.owner || []).join(", ") || "Sin captura")}</div><div class="line"><b>¿Quién decide si se venden?:</b> ${esc(displayAnimalPeople(an.decideSale || []).join(", ") || "Sin captura")}</div><div class="line"><b>¿Quién les limpia y alimenta?:</b> ${esc(displayAnimalPeople(an.feedClean || []).join(", ") || "Sin captura")}</div><div class="line"><b>Función:</b> ${esc((an.function || []).concat(an.functionOther ? [an.functionOther] : []).join(", ") || "Sin captura")}</div><div class="line"><b>Estado clínico:</b> ${esc(an.clinicalStatus === "DECESO" ? `Deceso${an.deathCause ? ` · Posible causa: ${an.deathCause}` : ""}` : "Activo")}</div><div class="line"><b>Instalaciones:</b> ${esc(an.housing)}</div><div class="line"><b>Relación productor(a):</b> ${esc(an.producerName || producerName(an.producerId || state.selectedProducerId))}</div><div class="preview-grid">${(
      an.photos || []
    )
      .slice(0, 4)
      .map((p) => `<button class="preview-mini" type="button" data-change-image title="Cambiar imagen"><img src="${p}" alt="foto"></button>`)
      .join(
        "",
      ) || '<div class="help">Sin imagen</div>'}</div><div class="actions"><button class="btn small" type="button">Editar</button><button class="btn small ghost" type="button" data-change-image>Cambiar imagen</button><button class="btn small ghost" type="button" data-delete-image>Eliminar imagen</button><button class="btn small bad" type="button">Eliminar</button></div><input type="file" accept="image/*" style="display:none" data-image-input>`;
    const edit = div.querySelector(".actions button.btn.small");
    const del = div.querySelector(".actions button.btn.small.bad");
    if (edit) edit.onclick = () => fillAnimalEntry(an);
    if (del) del.onclick = () => {
      const prod = getProducer();
      prod.animals = prod.animals.filter((x) => x.id !== an.id);
      (state.procedures || []).filter((p) => p.animalId === an.id).forEach((p) => queueDeletedRecord("procedures", p));
      state.procedures = state.procedures.filter((p) => p.animalId !== an.id);
      saveState();
      renderAll();
    };
    const imgInput = div.querySelector("[data-image-input]");
    div.querySelectorAll("[data-change-image]").forEach((btn) => {
      btn.addEventListener("click", () => imgInput?.click());
    });
    div.querySelector("[data-delete-image]")?.addEventListener("click", () => {
      const prod = getProducer();
      if (!prod) return;
      const target = prod.animals.find((x) => x.id === an.id);
      if (!target) return;
      target.photos = [];
      saveState();
      renderAll();
      show("a_msg", "Imagen eliminada correctamente.", "success");
    });
    imgInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const prod = getProducer();
      if (!prod) return;
      const target = prod.animals.find((x) => x.id === an.id);
      if (!target) return;
      target.photos = [await fileToBase64(file)];
      saveState();
      renderAll();
      show("a_msg", "Imagen reemplazada correctamente.", "success");
      e.target.value = "";
    });
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
function selectedGenderActivity() {
  const selected = $("#a_actividadGenero")?.value || "";
  if (selected === "Otro") return ($("#a_actividadGeneroOtro")?.value || "").trim();
  return selected.trim();
}
function toggleGenderActivityOther() {
  const isOther = ($("#a_actividadGenero")?.value || "") === "Otro";
  if ($("#a_actividadGeneroOtro")) {
    $("#a_actividadGeneroOtro").style.display = isOther ? "block" : "none";
    if (!isOther) $("#a_actividadGeneroOtro").value = "";
  }
}
function resetGenderActivityForm() {
  if ($("#a_actividadGenero")) $("#a_actividadGenero").value = "";
  if ($("#a_actividadGeneroOtro")) $("#a_actividadGeneroOtro").value = "";
  if ($("#a_actividadGeneroSexo")) $("#a_actividadGeneroSexo").value = "";
  if ($("#a_actividadGeneroRazon")) $("#a_actividadGeneroRazon").value = "";
  toggleGenderActivityOther();
}
function renderGenderActivitiesList(items = []) {
  const list = $("#a_generoActividadList");
  if (!list) return;
  list.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="line"><b>${esc(item.activity || "Sin actividad")}</b> · ${esc(item.sex || "Sin registro")}</div>
      <div class="line"><b>¿Por qué lo creen?:</b> ${esc(item.reason || "Sin registro")}</div>
      <div class="actions"><button class="btn small bad" type="button">Eliminar</button></div>
    `;
    const deleteBtn = div.querySelector("button");
    deleteBtn.onclick = () => {
      const prod = getProducer();
      if (!prod) return;
      prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
      prod.questionnaire.genderActivities = (prod.questionnaire.genderActivities || []).filter((entry) => entry.id !== item.id);
      saveState();
      renderAll();
    };
    list.appendChild(div);
  });
}
function resetDiseaseForm() {
  state.editing.diseaseId = null;
  ["a_lastSick", "a_enfAnimal", "a_commonDis", "a_signs", "a_whenSickDo"].forEach((id) => {
    if ($("#" + id)) $("#" + id).value = "";
  });
  if ($("#a_addDisease")) $("#a_addDisease").textContent = "➕ Agregar enfermedad";
}
function renderDiseaseList(items = []) {
  const list = $("#a_diseaseList");
  if (!list) return;
  list.innerHTML = "";
  if (!items.length) {
    if (!state.editing.diseaseId && $("#a_addDisease")) $("#a_addDisease").textContent = "➕ Agregar enfermedad";
    return;
  }
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="line"><b>${esc(item.date || "Sin fecha")} · ${esc(item.animal || "Sin animal")} · ${esc(item.problem || "Sin problema")}</b></div>
      <div class="line"><b>Signos clínicos:</b> ${esc(item.signs || "Sin registro")}</div>
      <div class="line"><b>Tratamiento/acciones:</b> ${esc(item.treatment || "Sin registro")}</div>
      <div class="actions"><button class="btn small" type="button">Editar</button><button class="btn small bad" type="button">Eliminar</button></div>
    `;
    const [editBtn, deleteBtn] = div.querySelectorAll("button");
    editBtn.onclick = () => {
      state.editing.diseaseId = item.id;
      $("#a_lastSick").value = safe(item.date);
      $("#a_enfAnimal").value = safe(item.animal);
      $("#a_commonDis").value = safe(item.problem);
      $("#a_signs").value = safe(item.signs);
      $("#a_whenSickDo").value = safe(item.treatment);
      $("#a_addDisease").textContent = "💾 Guardar enfermedad";
    };
    deleteBtn.onclick = () => {
      const prod = getProducer();
      if (!prod) return;
      prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
      prod.questionnaire.diseases = (prod.questionnaire.diseases || []).filter((entry) => entry.id !== item.id);
      if (state.editing.diseaseId === item.id) resetDiseaseForm();
      saveState();
      renderAll();
    };
    list.appendChild(div);
  });
}
function resetProgramForm() {
  state.editing.programId = null;
  ["a_programaNombre", "a_programaFolioTiene", "a_programaFolio"].forEach((id) => {
    if ($("#" + id)) $("#" + id).value = "";
  });
  if ($("#a_addPrograma")) $("#a_addPrograma").textContent = "➕ Agregar programa";
}
function updateProgramsVisibility() {
  const hasProgram = ($("#a_programaRegistro")?.value || "") === "Sí";
  if ($("#a_programaRegistroSiBlock")) $("#a_programaRegistroSiBlock").style.display = hasProgram ? "grid" : "none";
  if ($("#a_programaRegistroSiActions")) $("#a_programaRegistroSiActions").style.display = hasProgram ? "flex" : "none";
  if ($("#a_programasList")) $("#a_programasList").style.display = hasProgram ? "grid" : "none";
  if ($("#a_programaConvocatoriasWrap")) $("#a_programaConvocatoriasWrap").style.display = hasProgram ? "none" : "block";
  const hasFolio = ($("#a_programaFolioTiene")?.value || "") === "Sí";
  if ($("#a_programaFolioWrap")) $("#a_programaFolioWrap").style.display = hasProgram && hasFolio ? "block" : "none";
  if (!hasProgram) resetProgramForm();
}
function renderProgramsList(items = []) {
  const list = $("#a_programasList");
  if (!list) return;
  list.innerHTML = "";
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="line"><b>Programa:</b> ${esc(item.name || "Sin nombre")}</div>
      <div class="line"><b>Folio:</b> ${esc(item.hasFolio === "Sí" ? (item.folio || "(sin folio)") : "(sin folio)")}</div>
      <div class="actions"><button class="btn small" type="button">Editar</button><button class="btn small bad" type="button">Eliminar</button></div>
    `;
    const [editBtn, deleteBtn] = div.querySelectorAll("button");
    editBtn.onclick = () => {
      state.editing.programId = item.id;
      $("#a_programaNombre").value = safe(item.name);
      $("#a_programaFolioTiene").value = safe(item.hasFolio);
      $("#a_programaFolio").value = safe(item.folio);
      $("#a_addPrograma").textContent = "💾 Guardar programa";
    };
    deleteBtn.onclick = () => {
      const prod = getProducer();
      if (!prod) return;
      prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
      prod.questionnaire.programs = (prod.questionnaire.programs || []).filter((entry) => entry.id !== item.id);
      if (state.editing.programId === item.id) resetProgramForm();
      saveState();
      renderAll();
    };
    list.appendChild(div);
  });
}
function renderTraditionalList(items) {
  const list = $("#a_tradList");
  if (!list) return;
  list.innerHTML = "";
  if (!items.length) resetTraditionalForm();
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<h4>${esc(item.name || "Sin nombre")}</h4><div class="line"><b>Tipo:</b> ${esc(item.type || "")}</div><div class="line"><b>Uso:</b> ${esc(item.use || "")}</div><div class="line"><b>Parte:</b> ${esc(item.part || "")}</div><div class="line"><b>Animales:</b> ${esc(item.targetAnimals || "")}</div><div class="actions"><button class="btn small" type="button">Editar</button><button class="btn small bad" type="button">Eliminar</button></div>`;
    const [editBtn, deleteBtn] = div.querySelectorAll("button");
    editBtn.onclick = () => {
      state.editing.traditionalId = item.id;
      $("#a_tradNombre").value = safe(item.name);
      $("#a_tradTipo").value = safe(item.type);
      $("#a_tradUso").value = safe(item.use);
      $("#a_tradParte").value = safe(item.part);
      $("#a_tradAnimales").value = safe(item.targetAnimals);
      $("#a_addTrad").textContent = "💾 Guardar producto/remedio";
    };
    deleteBtn.onclick = () => {
      const prod = getProducer();
      if (!prod) return;
      prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
      prod.questionnaire.traditional = prod.questionnaire.traditional.filter((entry) => entry.id !== item.id);
      if (state.editing.traditionalId === item.id) resetTraditionalForm();
      saveState();
      renderAll();
    };
    list.appendChild(div);
  });
}
function renderGenderAnimalsList(items) {
  const list = $("#a_genderAnimalList");
  if (!list) return;
  list.innerHTML = "";
  if (!items.length) resetGenderAnimalForm();
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="line"><b>Animal:</b> ${esc(item.animal || "")}</div><div class="line"><b>Cuida:</b> ${esc(item.who || "")}</div><div class="line"><b>Motivo:</b> ${esc(item.why || "")}</div><div class="actions"><button class="btn small" type="button">Editar</button><button class="btn small bad" type="button">Eliminar</button></div>`;
    const [editBtn, deleteBtn] = div.querySelectorAll("button");
    editBtn.onclick = () => {
      state.editing.genderAnimalId = item.id;
      if ($("#a_genderAnimal")) $("#a_genderAnimal").value = safe(item.animal);
      if ($("#a_genderAnimalWho")) $("#a_genderAnimalWho").value = safe(item.who);
      if ($("#a_genderAnimalWhy")) $("#a_genderAnimalWhy").value = safe(item.why);
      if ($("#a_addGenderAnimal")) $("#a_addGenderAnimal").textContent = "💾 Guardar registro";
    };
    deleteBtn.onclick = () => {
      const prod = getProducer();
      if (!prod) return;
      prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
      prod.questionnaire.genderAnimals = (prod.questionnaire.genderAnimals || []).filter((entry) => entry.id !== item.id);
      if (state.editing.genderAnimalId === item.id) resetGenderAnimalForm();
      saveState();
      renderAll();
    };
    list.appendChild(div);
  });
}

const QUESTIONNAIRE_SECTION_CONFIG = {
  III: {
    rootId: "questionnaireSectionIII",
    buttonId: "btnSaveQuestionnaireIII",
    statusId: "saveStatusIII",
    storageKey: "cuestionario_seccion_III",
    fields: ["tieneMilpa", "queSiembra", "escasezForraje", "lastSick", "recommendWho"],
  },
  IV: {
    rootId: "questionnaireSectionIV",
    buttonId: "btnSaveQuestionnaireIV",
    statusId: "saveStatusIV",
    storageKey: "cuestionario_seccion_IV",
    fields: ["curadorExiste", "curadorQuien", "curadorEdad", "curadorEspecies", "curadorTiempo", "curadorServicios", "practicasAsesoria"],
  },
  FAUNA: {
    rootId: "questionnaireSectionFauna",
    buttonId: "btnSaveQuestionnaireFauna",
    statusId: "saveStatusFauna",
    storageKey: "cuestionario_fauna",
    fields: [
      "programaRegistro", "futureCalls", "huntingCommon", "huntingTime", "huntedAnimals",
      "huntingPlaces", "huntingSeason", "huntingReasons", "wildProblems", "wildProblemsDetail",
      "riverUse", "riverUseFor", "riverMeaning", "riverProblems", "localKnowledgeExists",
      "localKnowledgeWho", "localKnowledgeUseful",
    ],
  },
  RUMIANTS: {
    rootId: "questionnaireSectionRumiants",
    buttonId: "btnSaveQuestionnaireRumiants",
    statusId: "saveStatusRumiants",
    storageKey: "cuestionario_rumiantes",
    fields: ["rumiantInterest", "rumiantInterestWhy", "hadRumiantsBefore", "noRumiantsReason", "rumiantAdvice", "rumiantNeedOptions", "rumiantNeedOther", "rumiantNeedExplain", "rumiantNeed", "rumiantTrainingTopics"],
  },
};
const questionnaireAutosaveTimers = {};

function questionnaireSectionStorageKey(sectionKey, producerId) {
  const section = QUESTIONNAIRE_SECTION_CONFIG[sectionKey];
  return `${section.storageKey}_${producerId}`;
}
function updateQuestionnaireSaveStatus(sectionKey, manual = false) {
  const statusEl = $("#" + QUESTIONNAIRE_SECTION_CONFIG[sectionKey].statusId);
  if (!statusEl) return;
  statusEl.textContent = manual ? "Guardado ✔️" : "Autoguardado ✔️";
  window.clearTimeout(statusEl._hideTimer);
  statusEl._hideTimer = window.setTimeout(() => {
    statusEl.textContent = "";
  }, 1800);
}
function collectAnimalQuestionnaireFormData(prod) {
  const rumiantNeedOptions = checkedValues("a_rumiantsNeedOptions");
  const rumiantNeedOther = $("#a_rumiantsNeedOther").value.trim();
  const rumiantNeedExplain = $("#a_rumiantsNeedExplain").value.trim();
  const rumiantTrainingTopics = checkedValues("a_rumiantsTrainingTopics");
  const rumiantNeedSummary = [
    ...rumiantNeedOptions.filter((option) => option !== "Otro"),
    ...(rumiantNeedOptions.includes("Otro") ? [`Otro: ${rumiantNeedOther || "Sin especificar"}`] : []),
    ...(rumiantNeedExplain ? [`Explique brevemente: ${rumiantNeedExplain}`] : []),
  ].join(" | ");
  return {
    ...getProducerQuestionnaireSkeleton(prod),
    A6: $("#A6").value.trim(),
    A7: $("#A7").value.trim(),
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
    programaNombre: "",
    programaFolioTiene: "",
    folio: "",
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
    rumiantNeedOptions,
    rumiantNeedOther,
    rumiantNeedExplain,
    rumiantNeed: rumiantNeedSummary,
    rumiantTrainingTopics,
    birdsInterest: $("#a_interestBirds").value,
    diseases: getProducerQuestionnaireSkeleton(prod).diseases,
    vaccines: getProducerQuestionnaireSkeleton(prod).vaccines,
    deworming: getProducerQuestionnaireSkeleton(prod).deworming,
    programs: getProducerQuestionnaireSkeleton(prod).programs,
    traditional: getProducerQuestionnaireSkeleton(prod).traditional,
    genderAnimals: getProducerQuestionnaireSkeleton(prod).genderAnimals,
    genderActivities: getProducerQuestionnaireSkeleton(prod).genderActivities,
  };
}
function persistQuestionnaireSectionDraft(sectionKey, producerId, questionnaireData) {
  const section = QUESTIONNAIRE_SECTION_CONFIG[sectionKey];
  const payload = section.fields.reduce((acc, key) => {
    acc[key] = questionnaireData[key];
    return acc;
  }, {});
  localStorage.setItem(
    questionnaireSectionStorageKey(sectionKey, producerId),
    JSON.stringify({ updatedAt: Date.now(), producerId, payload }),
  );
}
function restoreQuestionnaireSectionDrafts(prod) {
  let updated = false;
  Object.keys(QUESTIONNAIRE_SECTION_CONFIG).forEach((sectionKey) => {
    const raw = localStorage.getItem(questionnaireSectionStorageKey(sectionKey, prod.id));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.payload || typeof parsed.payload !== "object") return;
      Object.entries(parsed.payload).forEach(([field, value]) => {
        if (JSON.stringify(prod.questionnaire?.[field]) !== JSON.stringify(value)) {
          prod.questionnaire[field] = value;
          updated = true;
        }
      });
    } catch (error) {
      // ignora JSON inválido sin romper el flujo
    }
  });
  if (updated) saveState();
}
function saveAnimalQuestionnaireSection(sectionKey, { manual = false, showToast = false } = {}) {
  const prod = getProducer();
  if (!prod) {
    show("a_msg", "Selecciona un productor(a).", "warning");
    return;
  }
  const formData = collectAnimalQuestionnaireFormData(prod);
  prod.questionnaire = formData;
  persistQuestionnaireSectionDraft(sectionKey, prod.id, formData);
  saveState();
  updateQuestionnaireSaveStatus(sectionKey, manual);
  if (showToast) show("a_msg", "Guardado ✔️", "success");
}
function saveAnimalQuestionnaireFull() {
  const prod = getProducer();
  if (!prod) {
    show("a_msg", "Selecciona un productor(a).", "warning");
    return;
  }
  const formData = collectAnimalQuestionnaireFormData(prod);
  prod.questionnaire = formData;
  Object.keys(QUESTIONNAIRE_SECTION_CONFIG).forEach((sectionKey) =>
    persistQuestionnaireSectionDraft(sectionKey, prod.id, formData));
  saveState();
  renderAll();
  show("a_msg", "Cuestionario de animales guardado.", "success");
}
function fillAnimalQuestionnaire() {
  const producer = getProducer();
  const q = producer?.questionnaire;
  if (!q || !producer) return;
  restoreQuestionnaireSectionDrafts(producer);
  const map = {
    A6: q.A6,
    A7: q.A7,
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
    a_rumiantsNeedOther: q.rumiantNeedOther,
    a_rumiantsNeedExplain: q.rumiantNeedExplain,
    a_interestBirds: q.birdsInterest,
  };
  Object.entries(map).forEach(([k, v]) => {
    if ($("#" + k)) $("#" + k).value = safe(v);
  });
  setCheckedValues("a_rumiantsNeedOptions", q.rumiantNeedOptions || []);
  setCheckedValues("a_rumiantsTrainingTopics", q.rumiantTrainingTopics || []);
  renderSimpleList(
    "#a_vaxList",
    q.vaccines || [],
    (x) => `${x.date || ""} · ${x.animal || ""} · ${x.name || ""}`,
  );
  renderDiseaseList(q.diseases || []);
  renderProgramsList(q.programs || []);
  updateProgramsVisibility();
  renderSimpleList(
    "#a_dewormList",
    q.deworming || [],
    (x) => `${x.date || ""} · ${x.animal || ""} · ${x.product || ""}`,
  );
  renderTraditionalList(q.traditional || []);
  if (!state.editing.traditionalId) resetTraditionalForm();
  renderGenderAnimalsList(q.genderAnimals || []);
  renderGenderActivitiesList(q.genderActivities || []);
  toggleGenderActivityOther();
}
function bindAnimals() {
  bindAnimalPhotos();
  $("#animalsProducerSelect")?.addEventListener("change", () => {
    const nextProducerId = $("#animalsProducerSelect").value || null;
    if (state.selectedProducerId !== nextProducerId) clearProducerScopedDraftState();
    state.selectedProducerId = nextProducerId;
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
  Object.entries(QUESTIONNAIRE_SECTION_CONFIG).forEach(([sectionKey, section]) => {
    $("#" + section.buttonId)?.addEventListener("click", () =>
      saveAnimalQuestionnaireSection(sectionKey, { manual: true, showToast: true }));
    const root = $("#" + section.rootId);
    if (!root) return;
    const autosave = () => {
      window.clearTimeout(questionnaireAutosaveTimers[sectionKey]);
      questionnaireAutosaveTimers[sectionKey] = window.setTimeout(() => {
        saveAnimalQuestionnaireSection(sectionKey, { manual: false, showToast: false });
      }, 350);
    };
    root.querySelectorAll("input, textarea, select").forEach((control) => {
      if (control.type === "file") return;
      control.addEventListener("input", autosave);
      control.addEventListener("change", autosave);
    });
  });
  $("#a_addDisease")?.addEventListener("click", () => {
    const prod = getProducer();
    if (!prod) return;
    const item = {
      id: state.editing.diseaseId || uid("dis"),
      date: $("#a_lastSick").value,
      animal: $("#a_enfAnimal").value,
      problem: $("#a_commonDis").value,
      signs: $("#a_signs").value.trim(),
      treatment: $("#a_whenSickDo").value.trim(),
    };
    prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
    if (state.editing.diseaseId) {
      prod.questionnaire.diseases = (prod.questionnaire.diseases || []).map((entry) =>
        entry.id === state.editing.diseaseId ? item : entry,
      );
      saveState();
      renderAll();
    } else {
      addQuestionnaireItem("diseases", item);
    }
    resetDiseaseForm();
  });
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
  $("#a_addTrad")?.addEventListener("click", () => {
    const prod = getProducer();
    if (!prod) return;
    const item = {
      id: state.editing.traditionalId || uid("trad"),
      name: $("#a_tradNombre").value.trim(),
      type: $("#a_tradTipo").value,
      use: $("#a_tradUso").value.trim(),
      part: $("#a_tradParte").value.trim(),
      targetAnimals: $("#a_tradAnimales").value.trim(),
    };
    prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
    if (state.editing.traditionalId) {
      prod.questionnaire.traditional = prod.questionnaire.traditional.map((entry) =>
        entry.id === state.editing.traditionalId ? item : entry,
      );
      saveState();
      renderAll();
    } else {
      addQuestionnaireItem("traditional", item);
    }
    resetTraditionalForm();
  });
  $("#a_clearTrad")?.addEventListener("click", resetTraditionalForm);
  $("#a_addGenderAnimal")?.addEventListener("click", () => {
    const prod = getProducer();
    if (!prod) return;
    const item = {
      id: state.editing.genderAnimalId || uid("ga"),
      animal: $("#a_genderAnimal").value,
      who: $("#a_genderAnimalWho").value,
      why: $("#a_genderAnimalWhy").value.trim(),
    };
    prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
    if (state.editing.genderAnimalId) {
      prod.questionnaire.genderAnimals = (prod.questionnaire.genderAnimals || []).map((entry) =>
        entry.id === state.editing.genderAnimalId ? item : entry,
      );
      saveState();
      renderAll();
    } else {
      addQuestionnaireItem("genderAnimals", item);
    }
    resetGenderAnimalForm();
  });
  $("#a_actividadGenero")?.addEventListener("change", toggleGenderActivityOther);
  $("#a_addGeneroActividad")?.addEventListener("click", () => {
    const activity = selectedGenderActivity();
    if (!activity) {
      show("a_msg", "Selecciona o captura una actividad.", "warning");
      return;
    }
    addQuestionnaireItem("genderActivities", {
      id: uid("act"),
      activity,
      sex: $("#a_actividadGeneroSexo").value,
      reason: $("#a_actividadGeneroRazon").value.trim(),
    });
    resetGenderActivityForm();
  });
  $("#a_programaRegistro")?.addEventListener("change", updateProgramsVisibility);
  $("#a_programaFolioTiene")?.addEventListener("change", () => {
    const hasFolio = ($("#a_programaFolioTiene")?.value || "") === "Sí";
    if ($("#a_programaFolioWrap")) $("#a_programaFolioWrap").style.display = hasFolio ? "block" : "none";
    if (!hasFolio && $("#a_programaFolio")) $("#a_programaFolio").value = "";
  });
  $("#a_addPrograma")?.addEventListener("click", () => {
    const prod = getProducer();
    if (!prod) return;
    const item = {
      id: state.editing.programId || uid("prog"),
      name: $("#a_programaNombre").value.trim(),
      hasFolio: $("#a_programaFolioTiene").value,
      folio: ($("#a_programaFolioTiene").value || "") === "Sí" ? $("#a_programaFolio").value.trim() : "",
    };
    if (!item.name) {
      show("a_msg", "Captura el nombre del programa.", "warning");
      return;
    }
    prod.questionnaire = getProducerQuestionnaireSkeleton(prod);
    if (state.editing.programId) {
      prod.questionnaire.programs = (prod.questionnaire.programs || []).map((entry) =>
        entry.id === state.editing.programId ? item : entry,
      );
      saveState();
      renderAll();
    } else {
      addQuestionnaireItem("programs", item);
    }
    resetProgramForm();
  });
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
function medicationExpiryInfo(expiryDate) {
  if (!expiryDate) return { status: "missing", text: "Sin fecha de caducidad registrada", css: "expiry-missing", warning: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00");
  if (Number.isNaN(expiry.getTime())) return { status: "missing", text: "Sin fecha de caducidad registrada", css: "expiry-missing", warning: "" };
  const msDiff = expiry.getTime() - today.getTime();
  const days = Math.ceil(msDiff / 86400000);
  if (days < 0) return { status: "expired", text: "Caducado", css: "expiry-expired", warning: "Advertencia: medicamento caducado." };
  if (days <= 90) return { status: "warning", text: "Próximo a caducar", css: "expiry-warning", warning: "Advertencia: medicamento próximo a caducar." };
  return { status: "valid", text: "Vigente", css: "expiry-valid", warning: "" };
}
function ensureAnaRosaDebtState() {
  if (!state.anaRosaDebt || typeof state.anaRosaDebt !== "object") state.anaRosaDebt = { records: [], paidHistory: [] };
  state.anaRosaDebt.records = Array.isArray(state.anaRosaDebt.records) ? state.anaRosaDebt.records : [];
  state.anaRosaDebt.paidHistory = Array.isArray(state.anaRosaDebt.paidHistory) ? state.anaRosaDebt.paidHistory : [];
  state.anaRosaDebt.records = state.anaRosaDebt.records.map((item) => ({ ...item, paid: false }));
}
function reconcileAnaRosaDebtFromProcedures() {
  ensureAnaRosaDebtState();
  const activeByKey = new Map((state.anaRosaDebt.records || []).map((item) => [item.debtKey, item]));
  const paidByKey = new Set((state.anaRosaDebt.paidHistory || []).filter((item) => item.paymentStatus === "Pagado" || item.paid).map((item) => item.debtKey));
  const rebuilt = [];
  (state.procedures || []).forEach((proc) => {
    procedureDebtRecords(proc).forEach((debt) => {
      const debtKey = `${proc.id}::${debt.kind}::${debt.itemId}`;
      const base = activeByKey.get(debtKey) || {
        id: uid("debt"),
        debtKey,
        procedureId: proc.id,
        procedureLabel: debt.procedureLabel,
        date: debt.date,
        paymentStatus: "Pendiente",
      };
      rebuilt.push({
        ...base,
        ...debt,
        debtKey,
        amount: debt.amount,
        paid: false,
        paymentStatus: base.paymentStatus && base.paymentStatus !== "Pagado" ? base.paymentStatus : "Pendiente",
      });
    });
  });
  state.anaRosaDebt.records = rebuilt.filter((item) => !paidByKey.has(item.debtKey));
}
function renderAnaRosaDebtSidebar() {
  ensureAnaRosaDebtState();
  const totalEl = $("#anaRosaDebtTotal");
  const activeEl = $("#anaRosaDebtActiveList");
  const paidEl = $("#anaRosaDebtPaidList");
  if (!totalEl || !activeEl || !paidEl) return;
  const total = (state.anaRosaDebt.records || []).reduce((acc, item) => acc + Number(item.amount || 0), 0);
  totalEl.textContent = money(total);
  activeEl.innerHTML = (state.anaRosaDebt.records || []).length
    ? state.anaRosaDebt.records.map((item) => `<div class="item"><div class="line"><b>Procedimiento:</b> ${esc(item.procedureLabel || item.procedureId || "")}</div><div class="line"><b>Fecha:</b> ${esc(item.date || "")}</div><div class="line"><b>Concepto:</b> ${esc(item.kind || "")} · ${esc(item.itemName || item.medicationName || "")}</div><div class="line"><b>Productor(a) / animal:</b> ${esc(item.producerName || "")} · ${esc(item.animalName || "")}</div><div class="line"><b>Persona propietaria:</b> ${esc(medOwnerLabel(item.owner || ""))}</div><div class="line"><b>Cantidad usada:</b> ${Number(item.qtyUsed || 0).toFixed(2)} ${esc(item.unit || "")}</div><div class="line"><b>Costo unitario:</b> ${money(item.unitCost || 0)} · <b>Monto:</b> ${money(item.amount || 0)}</div><div class="line"><b>Estado:</b> ${esc(item.paymentStatus || "Pendiente")}</div><div class="actions"><button class="btn small" type="button" data-mark-debt-paid="${esc(item.id)}">Marcar como pagado</button></div></div>`).join("")
    : '<div class="help">Sin deuda activa con Dra. Ana Rosa.</div>';
  paidEl.innerHTML = (state.anaRosaDebt.paidHistory || []).length
    ? state.anaRosaDebt.paidHistory.slice().reverse().map((item) => `<div class="item"><div class="line"><b>${esc(item.itemName || item.medicationName || "")}</b> · ${money(item.amount || 0)}</div><div class="help">${esc(item.date || "")} · ${esc(item.procedureLabel || "")}</div></div>`).join("")
    : '<div class="help">Sin pagos registrados todavía.</div>';
  activeEl.querySelectorAll('[data-mark-debt-paid]').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-mark-debt-paid');
    const record = (state.anaRosaDebt.records || []).find((item) => item.id === id);
    if (!record) return;
    state.anaRosaDebt.records = state.anaRosaDebt.records.filter((item) => item.id !== id);
    state.anaRosaDebt.paidHistory.push({ ...record, paidAt: new Date().toISOString(), paid: true, paymentStatus: "Pagado" });
    saveState();
    renderAll();
  }));
}
function normalizeSpeciesRef(value = "") {
  return safe(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
function isUniversalSpeciesDoseLabel(value = "") {
  const ref = normalizeSpeciesRef(value).replace(/\s+/g, " ");
  if (!ref) return false;
  return ref === "*"
    || /(^| )(cualquier|cualquiera|todas|todo)( |$)/.test(ref)
    || /especie/.test(ref) && /(universal|general|any)/.test(ref)
    || /(any species|all species|universal)/.test(ref);
}
function doseRuleDenominator(mode = "") {
  return mode === "PER_KG" ? "kg"
    : mode === "PER_ANIMAL" ? "animal"
      : mode === "PER_LITER" ? "litro"
        : mode === "PER_KG_FEED" ? "kg alimento"
          : "";
}
function doseRuleLabel(mode = "") {
  return mode === "PER_KG" ? "Por kg"
    : mode === "PER_ANIMAL" ? "Por animal"
      : mode === "PER_PATIENT" ? "Por paciente"
        : mode === "PER_GROUP" ? "Por grupo"
          : mode === "PER_ML" ? "Por mL"
            : mode === "PER_LITER" ? "Por litro"
              : mode === "PER_KG_FEED" ? "Por kg alimento"
                : mode === "FIXED" ? "Dosis fija"
                  : mode === "MANUAL" ? "Manual"
                    : mode || "";
}
const MASS_UNIT_FACTORS_MG = {
  mcg: 0.001,
  ug: 0.001,
  mg: 1,
  g: 1000,
  kg: 1000000,
};
const VOLUME_UNIT_FACTORS_ML = {
  ml: 1,
  l: 1000,
};
function normalizeUnitToken(unit = "") {
  return safe(unit)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");
}
function canonicalUnit(unit = "") {
  const token = normalizeUnitToken(unit);
  const aliases = {
    microgramo: "mcg",
    microgramos: "mcg",
    ug: "mcg",
    µg: "mcg",
    mcg: "mcg",
    miligramo: "mg",
    miligramos: "mg",
    mg: "mg",
    ui: "U.I.",
    iu: "U.I.",
    unidadinternacional: "U.I.",
    unidadesinternacionales: "U.I.",
    gramo: "g",
    gramos: "g",
    g: "g",
    kilogramo: "kg",
    kilogramos: "kg",
    kg: "kg",
    ml: "mL",
    mililitro: "mL",
    mililitros: "mL",
    l: "L",
    litro: "L",
    litros: "L",
    tableta: "tableta",
    tabletas: "tableta",
    comprimida: "tableta",
    comprimidas: "tableta",
    capsula: "cápsula",
    capsulas: "cápsula",
    "cápsula": "cápsula",
    "cápsulas": "cápsula",
    sobre: "sobre",
    sobres: "sobre",
    dosis: "dosis",
    gota: "gota",
    gotas: "gota",
    comprimido: "tableta",
    comprimidos: "tableta",
    bolo: "bolo",
    bolos: "bolo",
    animal: "animal",
    animales: "animal",
    paciente: "paciente",
    pacientes: "paciente",
    frasco: "frasco",
    frascos: "frasco",
    ampolleta: "ampolleta",
    ampolletas: "ampolleta",
    unidad: "unidad",
    unidades: "unidad",
    ui: "U.I.",
    iu: "U.I.",
    "%": "%",
    porcentaje: "%",
  };
  return aliases[token] || safe(unit).trim();
}
function isMassUnit(unit = "") {
  return MASS_UNIT_FACTORS_MG[normalizeUnitToken(canonicalUnit(unit))] > 0;
}
function isVolumeUnit(unit = "") {
  return VOLUME_UNIT_FACTORS_ML[normalizeUnitToken(canonicalUnit(unit))] > 0;
}
function convertCompatibleUnits(value = 0, fromUnit = "", toUnit = "") {
  const from = canonicalUnit(fromUnit);
  const to = canonicalUnit(toUnit);
  if (!from || !to) return null;
  if (from === to) return Number(value || 0);
  const fromMass = MASS_UNIT_FACTORS_MG[normalizeUnitToken(from)];
  const toMass = MASS_UNIT_FACTORS_MG[normalizeUnitToken(to)];
  if (fromMass && toMass) return (Number(value || 0) * fromMass) / toMass;
  const fromVolume = VOLUME_UNIT_FACTORS_ML[normalizeUnitToken(from)];
  const toVolume = VOLUME_UNIT_FACTORS_ML[normalizeUnitToken(to)];
  if (fromVolume && toVolume) return (Number(value || 0) * fromVolume) / toVolume;
  return null;
}
function resolveMedicationAppliedAmount({ med = null, qty = 0, unit = "" }) {
  const requestedQty = Number(qty || 0);
  const requestedUnit = canonicalUnit(unit || "");
  const inventoryUnit = canonicalUnit(med?.unit || "");
  if (!inventoryUnit) return { qty: requestedQty, unit: requestedUnit || "" };
  if (!requestedUnit || requestedUnit === inventoryUnit) return { qty: requestedQty, unit: inventoryUnit };
  const converted = convertCompatibleUnits(requestedQty, requestedUnit, inventoryUnit);
  return {
    qty: Number((converted != null ? converted : requestedQty).toFixed(4)),
    unit: inventoryUnit,
  };
}
function medicationConcentrationSummary(med = {}) {
  const c = med?.concentration || {};
  if (!Number(c.activeAmount || 0) || !c.activeUnit || !Number(c.perAmount || 0) || !c.perUnit) return "";
  const percentNote = canonicalUnit(c.activeUnit) === "%" ? " (1% = 10 mg/mL o 10 mg/g según presentación)" : "";
  return `${Number(c.activeAmount).toFixed(4).replace(/\.?0+$/, "")} ${c.activeUnit} por ${Number(c.perAmount).toFixed(4).replace(/\.?0+$/, "")} ${c.perUnit}${percentNote}`;
}
function normalizeMedicationPresentationKind(med = {}) {
  const text = normalizeUnitToken([med.unit, med.presentation, med.concentration?.perUnit].filter(Boolean).join(" "));
  if (/gota/.test(text)) return "gota";
  if (/tab|comp/.test(text)) return "tableta";
  if (/caps/.test(text)) return "cápsula";
  if (/bolo/.test(text)) return "bolo";
  if (/ml|frasco|inyect|solucion|suspension|oral|jarabe/.test(text)) return "mL";
  if (/polvo|sobre/.test(text)) return "sobre/polvo";
  return med.unit || med.presentation || "presentación";
}
function normalizeConcentrationForDose(med = {}) {
  const concentration = med?.concentration || {};
  const activeAmount = Number(concentration.activeAmount || 0);
  const perAmount = Number(concentration.perAmount || 0);
  const activeUnit = canonicalUnit(concentration.activeUnit || "");
  const perUnit = canonicalUnit(concentration.perUnit || "");
  if (!activeAmount || !perAmount || !activeUnit || !perUnit) return null;
  if (activeUnit === "%") {
    const perToken = normalizeUnitToken(perUnit);
    const physicalUnit = perToken === "l" ? "L" : perToken === "kg" ? "kg" : perUnit;
    const activeMg = activeAmount * 10 * (perToken === "l" || perToken === "kg" ? 1000 : 1);
    return { activeAmount: activeMg, activeUnit: "mg", perAmount: 1, perUnit: physicalUnit, percentConverted: true };
  }
  return { activeAmount, activeUnit, perAmount, perUnit, percentConverted: false };
}
function calculateConvertedMedicationDose({
  med = null,
  theoreticalQty = 0,
  theoreticalUnit = "",
  rule = "PER_KG",
  basisValue = 0,
  basisLabel = "",
}) {
  const theoretical = Number(theoreticalQty || 0);
  const unit = canonicalUnit(theoreticalUnit);
  const concentration = normalizeConcentrationForDose(med);
  const activeAmount = Number(concentration?.activeAmount || 0);
  const perAmount = Number(concentration?.perAmount || 0);
  const activeUnit = canonicalUnit(concentration?.activeUnit || "");
  const perUnit = canonicalUnit(concentration?.perUnit || "");
  const inventoryUnit = canonicalUnit(med?.unit || "");
  const denominator = doseRuleDenominator(rule) || (rule === "MANUAL" ? "total" : "base");
  const baseDose = theoretical > 0 && basisValue > 0 ? theoretical / basisValue : theoretical;
  const lines = [`Dosis indicada: ${Number(baseDose).toFixed(4).replace(/\.?0+$/, "")} ${unit || med?.unit || "u"}/${denominator}`];
  if (basisLabel) lines.push(basisLabel);
  lines.push(`Total de principio activo requerido: ${Number(theoretical).toFixed(4).replace(/\.?0+$/, "")} ${unit || med?.unit || "u"}`);
  if (!med?.presentation && !med?.unit) {
    return { convertedQty: 0, convertedUnit: "", requiredActiveQty: theoretical, requiredActiveUnit: unit || "", warning: "Falta la presentación/unidad del medicamento en inventario; no se puede convertir a dosis administrable.", explanation: `${lines.join(" · ")} · Falta presentación/unidad del medicamento en inventario.`, conversionApplied: false };
  }
  if (med?.useTherapeuticDoseOnly) {
    const fallbackUnit = unit || inventoryUnit || med?.unit || "";
    return { convertedQty: theoretical, convertedUnit: fallbackUnit, requiredActiveQty: null, requiredActiveUnit: "", warning: "", explanation: `${lines.join(" · ")} · Modo sin concentración estructurada: cantidad editable por criterio clínico.`, conversionApplied: false };
  }
  const directInventoryQty = convertCompatibleUnits(theoretical, unit, inventoryUnit || unit);
  if (!activeAmount || !perAmount || !activeUnit || !perUnit) {
    if (directInventoryQty != null && inventoryUnit) {
      return { convertedQty: Number(directInventoryQty.toFixed(4)), convertedUnit: inventoryUnit, requiredActiveQty: theoretical, requiredActiveUnit: unit || "", warning: "", explanation: `${lines.join(" · ")} · La unidad de dosis es compatible con inventario; no se requiere concentración/equivalencia.`, conversionApplied: false };
    }
    return { convertedQty: 0, convertedUnit: inventoryUnit || unit || "", requiredActiveQty: theoretical, requiredActiveUnit: unit || "", warning: "Se calculó la dosis teórica, pero no se pudo convertir a la presentación real del medicamento porque falta concentración o equivalencia.", explanation: `${lines.join(" · ")} · Falta concentración/equivalencia registrada en medicamentos; captura cantidad administrable manualmente y, si corresponde, guarda la equivalencia en Medicamentos para futuras ocasiones.`, conversionApplied: false };
  }
  lines.push(`Concentración registrada: ${medicationConcentrationSummary(med)}`);
  if (concentration.percentConverted) lines.push(`Porcentaje convertido automáticamente a ${activeAmount} ${activeUnit}/${perAmount} ${perUnit}`);
  const requiredInActiveUnit = convertCompatibleUnits(theoretical, unit, activeUnit);
  if (requiredInActiveUnit != null) {
    const presentationQty = requiredInActiveUnit / (activeAmount / perAmount);
    const inventoryQty = convertCompatibleUnits(presentationQty, perUnit, inventoryUnit || perUnit);
    const convertedQty = Number(((inventoryQty != null ? inventoryQty : presentationQty)).toFixed(4));
    const convertedUnit = inventoryQty != null ? (inventoryUnit || perUnit) : perUnit;
    lines.push(`Dosis real administrable (${normalizeMedicationPresentationKind(med)}): ${Number(convertedQty).toFixed(4).replace(/\.?0+$/, "")} ${convertedUnit}`);
    return { convertedQty, convertedUnit, requiredActiveQty: Number(requiredInActiveUnit.toFixed(4)), requiredActiveUnit: activeUnit, warning: "", explanation: lines.join(" · "), conversionApplied: true };
  }
  return { convertedQty: 0, convertedUnit: inventoryUnit || perUnit || unit || "", requiredActiveQty: theoretical, requiredActiveUnit: unit || "", warning: `La unidad de dosis (${unit || "sin unidad"}) no es compatible con la concentración registrada (${activeUnit}/${perUnit}).`, explanation: `${lines.join(" · ")} · Unidad de dosis incompatible con la concentración.`, conversionApplied: false };
}

function doseUnitOptions(selected = "") {
  const units = ["mL", "mg", "U.I.", "gotas", "tabletas", "cápsulas", "bolos", "g", "L", "dosis", "otro"];
  const value = canonicalUnit(selected || "");
  const options = units.map((unit) => `<option value="${esc(unit)}" ${canonicalUnit(unit) === value ? "selected" : ""}>${esc(unit === "U.I." ? "U.I. / Unidades Internacionales" : unit)}</option>`).join("");
  const custom = value && !units.some((unit) => canonicalUnit(unit) === value) ? `<option value="${esc(value)}" selected>${esc(value)}</option>` : "";
  return `<option value="">— Unidad —</option>${options}${custom}`;
}
function medicationSpeciesDosePrompt(source = "") {
  return `Analiza el siguiente texto de medicamento veterinario y extrae exclusivamente las dosis estructuradas por especie. Devuelve únicamente JSON válido con la llave dosis_por_especie. Cada elemento debe incluir: especie, cantidad, unidad, por_cada, unidad_base, regla_compatible, frecuencia, duracion, indicacion y observaciones. No inventes dosis. Si un dato no aparece, usa null o string vacío. Conserva advertencias importantes en observaciones. No devuelvas explicación, solo JSON. Texto fuente: ${source}`;
}
function parsePossiblyWrappedJson(value = "") {
  const raw = safe(value).trim();
  if (!raw) return {};
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try { return JSON.parse(candidate); } catch (_) {
    const startObj = candidate.indexOf("{");
    const endObj = candidate.lastIndexOf("}");
    const startArr = candidate.indexOf("[");
    const endArr = candidate.lastIndexOf("]");
    if (startObj >= 0 && endObj > startObj) return JSON.parse(candidate.slice(startObj, endObj + 1));
    if (startArr >= 0 && endArr > startArr) return JSON.parse(candidate.slice(startArr, endArr + 1));
    throw new Error("JSON inválido. Pega JSON válido, aunque venga dentro de texto o bloque ```json.");
  }
}
function normalizeDoseRule(value = "", unitBase = "") {
  const text = safe(value).trim().toLowerCase();
  if (["per_liter", "por litro", "por l", "l"].includes(text)) return "PER_LITER";
  if (["per_ml", "por ml", "ml"].includes(text)) return "PER_ML";
  if (["per_kg_feed", "por kg alimento", "por kg de alimento", "kg alimento"].includes(text)) return "PER_KG_FEED";
  if (["per_animal", "por animal", "animal"].includes(text)) return "PER_ANIMAL";
  if (["per_patient", "por paciente", "paciente"].includes(text)) return "PER_PATIENT";
  if (["fixed", "dosis fija", "fija"].includes(text)) return "FIXED";
  if (["manual"].includes(text)) return "MANUAL";
  const base = safe(unitBase).trim().toLowerCase();
  if (["l", "litro", "litros"].includes(base)) return "PER_LITER";
  if (base === "ml") return "PER_ML";
  if (base.includes("alimento")) return "PER_KG_FEED";
  if (["animal", "paciente"].includes(base)) return "PER_ANIMAL";
  return value || "PER_KG";
}
function normalizeDoseRow(raw = {}, speciesFallback = "") {
  const unitBaseHint = raw.unitBase || raw.unidad_base || raw.baseUnit || raw["unidad base"] || "";
  const calculationMode = normalizeDoseRule(raw.calculationMode || raw.modo_calculo || raw.regla || raw.compatibleRule || raw.regla_compatible || raw["regla compatible"] || "", unitBaseHint);
  const porCada = Number(raw.porCada ?? raw.por_cada ?? raw.perEvery ?? raw.perQuantity ?? raw.base ?? (calculationMode === "PER_ANIMAL" ? 1 : 1)) || 1;
  const unitBase = unitBaseHint || (calculationMode === "PER_ANIMAL" ? "animal" : calculationMode === "PER_LITER" ? "L" : calculationMode === "PER_KG_FEED" ? "kg alimento" : "kg");
  return {
    species: safe(raw.species ?? raw.especie ?? speciesFallback).trim(),
    dose: Number(raw.dose ?? raw.cantidad ?? raw.quantity ?? raw.amount ?? 0) || 0,
    doseUnit: canonicalUnit(raw.doseUnit ?? raw.unidad ?? raw.unit ?? ""),
    porCada: Number(raw.porCada ?? raw.por_cada ?? raw.perQuantity ?? raw["por cada"] ?? porCada) || 1,
    unitBase: raw.unitBase || raw.unidad_base || raw.baseUnit || raw["unidad base"] || unitBase,
    calculationMode,
    indication: safe(raw.indication ?? raw.indicacion ?? raw.indicación ?? "").trim(),
    route: safe(raw.route ?? raw.via ?? raw.vía ?? "").trim(),
    frequency: safe(raw.frequency ?? raw.frecuencia ?? "").trim(),
    duration: safe(raw.duration ?? raw.duracion ?? raw.duración ?? "").trim(),
    notes: safe(raw.notes ?? raw.observaciones ?? "").trim(),
  };
}
function flattenSpeciesDoseJson(payload = {}) {
  const hasSpanishKey = payload && Object.prototype.hasOwnProperty.call(payload, "dosis_por_especie");
  const hasEnglishKey = payload && Object.prototype.hasOwnProperty.call(payload, "dosesBySpecies");
  let source = Array.isArray(payload) ? payload : (hasSpanishKey ? payload.dosis_por_especie : (hasEnglishKey ? payload.dosesBySpecies : payload.speciesDoses));
  if (!Array.isArray(payload) && !hasSpanishKey && !hasEnglishKey && !payload.speciesDoses) {
    throw new Error("El JSON no contiene dosis por especie. Debe incluir la llave dosis_por_especie o dosesBySpecies.");
  }
  if (source && !Array.isArray(source)) source = [source];
  if (!Array.isArray(source)) throw new Error("El JSON no contiene dosis por especie. Debe incluir la llave dosis_por_especie o dosesBySpecies.");
  const skipped = [];
  const rows = source.flatMap((group, index) => {
    const species = group.especie || group.species || "";
    const doses = Array.isArray(group.dosis || group.doses) ? (group.dosis || group.doses) : [group];
    return doses.map((dose) => normalizeDoseRow(dose, species)).filter((row) => {
      if (row.species) return true;
      skipped.push(index + 1);
      return false;
    });
  }).filter((row) => row.species || row.dose || row.doseUnit || row.indication || row.notes);
  rows.skippedWithoutSpecies = skipped.length;
  return rows;
}
function groupSpeciesDoseRows(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const normalized = normalizeDoseRow(row);
    if (!normalized.species) return;
    if (!map.has(normalized.species)) map.set(normalized.species, []);
    map.get(normalized.species).push(normalized);
  });
  return Array.from(map.entries()).map(([species, dosis]) => ({ especie: species, dosis: dosis.map((row) => ({ indicacion: row.indication || "", cantidad: row.dose, unidad: row.doseUnit, por_cada: row.porCada || 1, unidad_base: row.unitBase || doseRuleDenominator(row.calculationMode) || "kg", frecuencia: row.frequency || "", duracion: row.duration || "", observaciones: row.notes || "" })) }));
}
function validateSpeciesDoseRows(rows = []) {
  const errors = [];
  rows.forEach((row, index) => {
    const n = index + 1;
    if (!row.species) errors.push(`Dosis ${n}: captura especie.`);
    if (!(Number(row.dose || 0) > 0)) errors.push(`Dosis ${n}: falta cantidad; puedes completar manualmente antes de guardar.`);
    if (!row.doseUnit) errors.push(`Dosis ${n}: falta unidad; puedes completar manualmente antes de guardar.`);
    if (!(Number(row.porCada || 0) > 0)) errors.push(`Dosis ${n}: por cada cuántos kg/base debe ser mayor a 0.`);
    if (!row.unitBase) errors.push(`Dosis ${n}: captura unidad base.`);
  });
  return errors;
}
function speciesDoseSummary(row = {}) {
  const n = normalizeDoseRow(row);
  return `${n.species}: ${n.indication ? `${n.indication} · ` : ""}${linkedDosePhrase(n)}${n.frequency ? ` · ${n.frequency}` : ""}${n.duration ? ` · ${n.duration}` : ""}${n.notes ? ` · ${n.notes}` : ""}`;
}
function linkedDosePhrase(row = {}) {
  const n = normalizeDoseRow(row);
  return `${n.dose || 0} ${n.doseUnit || ""} por cada ${n.porCada || 1} ${n.unitBase || doseRuleDenominator(n.calculationMode) || ""}`.replace(/\s+/g, " ").trim();
}
function speciesDoseJsonExample() {
  return JSON.stringify({ dosis_por_especie: [{ especie: "Aves", cantidad: 2, unidad: "g", por_cada: 1, unidad_base: "L", regla_compatible: "Por litro", frecuencia: "cada 24 h", duracion: "3 días", indicacion: "Infecciones susceptibles", observaciones: "Usar según criterio clínico" }, { especie: "Bovinos", cantidad: 1, unidad: "mL", por_cada: 20, unidad_base: "kg", regla_compatible: "Por kg de peso vivo", frecuencia: "cada 24 h", duracion: "3 días", indicacion: "Infecciones susceptibles", observaciones: "" }, { especie: "Perros", cantidad: 10, unidad: "mg", por_cada: 1, unidad_base: "kg", regla_compatible: "Por kg de peso vivo", frecuencia: "cada 12 h", duracion: "5 días", indicacion: "Infecciones susceptibles", observaciones: "" }] }, null, 2);
}

function getMedicationSpeciesDoseRows() {
  return $$("#m_speciesDoseList [data-dose-row]")
    .map((row) => normalizeDoseRow({
      species: row.querySelector('[data-field="species"]')?.value.trim() || "",
      dose: row.querySelector('[data-field="dose"]')?.value || 0,
      doseUnit: row.querySelector('[data-field="doseUnit"]')?.value.trim() || "",
      indication: row.querySelector('[data-field="indication"]')?.value.trim() || "",
      porCada: row.querySelector('[data-field="porCada"]')?.value || 1,
      unitBase: row.querySelector('[data-field="unitBase"]')?.value.trim() || "kg",
      calculationMode: row.querySelector('[data-field="calculationMode"]')?.value || "PER_KG",
      frequency: row.querySelector('[data-field="frequency"]')?.value.trim() || "",
      duration: row.querySelector('[data-field="duration"]')?.value.trim() || "",
      notes: row.querySelector('[data-field="notes"]')?.value.trim() || "",
    }))
    .filter((row) => row.species || row.dose || row.doseUnit || row.indication || row.notes);
}
function firstDoseRoute(rows = []) {
  return (rows || []).map((row) => normalizeDoseRow(row).route).find((route) => route) || "";
}
function getIncomingGeneralRoute(payload = {}, rows = []) {
  return safe(payload.via_administracion ?? payload.route ?? payload.via ?? payload.vía ?? payload.administration_route ?? firstDoseRoute(rows)).trim();
}
function fillGeneralRouteFromLegacyDose(payload = {}, rows = []) {
  const route = getIncomingGeneralRoute(payload, rows);
  const routeField = $("#m_route");
  if (route && routeField && !routeField.value.trim()) routeField.value = route;
  return route;
}
function renderMedicationSpeciesDoseRows(rows = []) {
  const box = $("#m_speciesDoseList");
  if (!box) return;
  const normalizedRows = (rows || []).map((row) => normalizeDoseRow(row)).filter((row) => row.species || row.dose || row.doseUnit || row.indication || row.notes);
  if (!normalizedRows.length) {
    box.innerHTML =
      '<div class="help">Todavía no hay dosis por especie. Agrégalas o pega JSON para que procedimientos usen medicamentos existentes con cálculo automático por animal.</div>';
    return;
  }
  box.innerHTML = normalizedRows
    .map(
      (row, index) => `<div class="item stacked-dose-row" data-dose-row="${index}">
      <div class="grid cols-5">
        <div><label>Especie</label><input data-field="species" type="text" value="${esc(row.species || "")}" placeholder="Ej. Bovinos, Perros, *" /></div>
        <div><label>Cantidad</label><input data-field="dose" type="number" min="0" step="0.0001" value="${esc(row.dose || "")}" /></div>
        <div><label>Unidad</label><select data-field="doseUnit">${doseUnitOptions(row.doseUnit)}</select></div>
        <div><label>Por cada</label><input data-field="porCada" type="number" min="0.0001" step="0.0001" value="${esc(row.porCada || 1)}" /></div>
        <div><label>Unidad base</label><select data-field="unitBase"><option value="kg" ${row.unitBase === "kg" ? "selected" : ""}>kg</option><option value="animal" ${row.unitBase === "animal" ? "selected" : ""}>animal</option><option value="L" ${row.unitBase === "L" ? "selected" : ""}>L</option><option value="kg alimento" ${row.unitBase === "kg alimento" ? "selected" : ""}>kg alimento</option></select></div>
      </div>
      <div class="grid cols-4">
        <div><label>Regla compatible</label><select data-field="calculationMode"><option value="PER_KG" ${row.calculationMode === "PER_KG" ? "selected" : ""}>Por peso/base kg</option><option value="PER_ANIMAL" ${row.calculationMode === "PER_ANIMAL" ? "selected" : ""}>Por animal</option><option value="PER_LITER" ${row.calculationMode === "PER_LITER" ? "selected" : ""}>Por litro</option><option value="PER_KG_FEED" ${row.calculationMode === "PER_KG_FEED" ? "selected" : ""}>Por kg alimento</option></select></div>
        <div><label>Frecuencia</label><input data-field="frequency" type="text" value="${esc(row.frequency || "")}" placeholder="cada 24 h" /></div>
        <div><label>Duración</label><input data-field="duration" type="text" value="${esc(row.duration || "")}" placeholder="3 días" /></div>
        <div style="display:flex;align-items:flex-end;gap:6px;"><button class="btn small ghost" type="button" data-action="duplicate">Duplicar</button><button class="btn small bad" type="button" data-action="remove">Eliminar</button></div>
      </div>
      <div class="grid cols-2">
        <div><label>Indicación</label><input data-field="indication" type="text" value="${esc(row.indication || "")}" placeholder="Ej. Infecciones susceptibles" /></div>
        <div><label>Observaciones</label><input data-field="notes" type="text" value="${esc(row.notes || "")}" placeholder="Opcional" /></div>
      </div>
    </div>`,
    )
    .join("");
  box.querySelectorAll('[data-action="remove"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      const row = btn.closest("[data-dose-row]");
      const idx = Number(row?.dataset.doseRow || -1);
      renderMedicationSpeciesDoseRows(getMedicationSpeciesDoseRows().filter((_, i) => i !== idx));
    }),
  );
  box.querySelectorAll('[data-action="duplicate"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      const idx = Number(btn.closest("[data-dose-row]")?.dataset.doseRow || -1);
      const rows = getMedicationSpeciesDoseRows();
      if (idx >= 0) rows.splice(idx + 1, 0, { ...rows[idx] });
      renderMedicationSpeciesDoseRows(rows);
    }),
  );
}

function getMedicationDoseProfiles(med, species = "") {
  const rows = (med?.speciesDoses || []).map((row) => normalizeDoseRow(row)).filter((row) => row.species || row.dose || row.doseUnit || row.indication);
  if (!rows.length) return [];
  const matches = rows.filter((row) => !isUniversalSpeciesDoseLabel(row.species) && speciesMatchesDose(species, row.species));
  if (matches.length) return matches;
  const universal = rows.filter((row) => isUniversalSpeciesDoseLabel(row.species));
  return universal.length ? universal : [];
}
function syncProcedureDoseProfileOptions() {
  const select = $("#p_medDoseProfile");
  if (!select) return [];
  const med = byProcedureProductId($("#p_medSelect")?.value, getProcedureProductType());
  const rows = getProcedureProductType() === "MEDICAMENTO" ? getMedicationDoseProfiles(med, getProcedureMedicationSpecies()) : [];
  const prev = select.value;
  select.innerHTML = '<option value="">— Dosis manual/editable —</option>' + rows.map((row, index) => `<option value="${index}">${esc(speciesDoseSummary(row))}</option>`).join("");
  select.dataset.doses = JSON.stringify(rows);
  select.value = rows[Number(prev)] ? prev : (rows.length === 1 ? "0" : "");
  return rows;
}
function getSelectedProcedureDoseProfile(med, species = "") {
  const select = $("#p_medDoseProfile");
  const rows = syncProcedureDoseProfileOptions();
  if (select && select.value !== "" && rows[Number(select.value)]) return rows[Number(select.value)];
  return rows[0] || getMedicationDoseProfile(med, species);
}

function getMedicationDoseProfile(med, species = "") {
  const rows = (med?.speciesDoses || []).map((row) => normalizeDoseRow(row));
  const specific = rows.find((row) => !isUniversalSpeciesDoseLabel(row.species) && speciesMatchesDose(species, row.species));
  if (specific) return specific;
  return rows.find((row) => isUniversalSpeciesDoseLabel(row.species)) || null;
}
function usesStructuredConcentration(med = {}) {
  return !med?.useTherapeuticDoseOnly;
}
function renderMedicationConcentrationMode() {
  const onlyDose = Boolean($("#m_useTherapeuticDoseOnly")?.checked);
  const block = $("#m_concentrationBlock");
  const help = $("#m_concentrationHelp");
  const modeHelp = $("#m_useTherapeuticDoseOnlyHelp");
  if (block) block.style.display = onlyDose ? "none" : "";
  if (help) {
    help.textContent = onlyDose
      ? "Este medicamento usará solo dosis terapéutica por especie."
      : "La concentración/equivalencia es independiente de la dosis terapéutica por especie. Ejemplo: 2 mg por 1 mL, 50 mg por 1 tableta.";
  }
  if (modeHelp) {
    modeHelp.textContent = onlyDose
      ? "Modo activo: este medicamento se calculará con dosis terapéutica por especie, sin exigir concentración estructurada."
      : "Activa este modo para medicamentos multiactivos o cuando no deseas capturar concentración/equivalencia detallada.";
  }
  if (onlyDose && $("#m_err")) $("#m_err").style.display = "none";
}
function medStockType() {
  return $("#m_stockType")?.value || "NUEVO";
}
function getMedPackageCount() {
  return Math.max(1, Number($("#m_packageCount")?.value || 1));
}
function getMedContentPerPresentation() {
  return Number($("#m_contentPerPresentation")?.value || 0);
}
function computeMedTotalExistence() {
  return getMedPackageCount() * getMedContentPerPresentation();
}
function refreshMedicationTotals() {
  const isUsed = medStockType() === "USADO";
  const total = isUsed
    ? Number($("#m_remainingQty")?.value || 0)
    : computeMedTotalExistence();
  if ($("#m_totalQty")) $("#m_totalQty").value = total > 0 ? String(total) : "";
}
function renderMedStockType() {
  const type = medStockType();
  const used = type === "USADO";
  const usedFields = $("#m_usedFields");
  const help = $("#m_stockTypeHelp");
  if (usedFields) usedFields.style.display = used ? "grid" : "none";
  if (help) {
    help.textContent = used
      ? "Para medicamento usado, disponibilidad inicial = lo que sobra actualmente. Costo unitario = costo original / contenido original."
      : "Para medicamento nuevo, existencia total = contenido por presentación × número de presentaciones/envases.";
  }
  refreshMedicationTotals();
}
function collectMed(id = uid("med")) {
  const stockType = medStockType();
  const totalQty = Number($("#m_totalQty")?.value || 0);
  const contentPerPresentation = getMedContentPerPresentation();
  const packageCount = getMedPackageCount();
  const cost = Number($("#m_cost")?.value || 0);
  const originalQty = Number($("#m_originalQty")?.value || 0);
  const originalCost = Number($("#m_originalCost")?.value || 0);
  const remainingQty = Number($("#m_remainingQty")?.value || 0);
  const isUsed = stockType === "USADO";
  const effectiveQty = isUsed ? remainingQty : totalQty;
  const effectiveCost = isUsed ? originalCost : cost;
  const costBasisQty = isUsed ? originalQty : contentPerPresentation;
  const concentration = {
    activeAmount: Number($("#m_concentrationActiveAmount")?.value || 0),
    activeUnit: canonicalUnit($("#m_concentrationActiveUnit")?.value || ""),
    perAmount: Number($("#m_concentrationPerAmount")?.value || 0),
    perUnit: canonicalUnit($("#m_concentrationPerUnit")?.value || ""),
  };
  return {
    id,
    brand: $("#m_brand")?.value.trim() || "",
    active: $("#m_active")?.value.trim() || "",
    owner: $("#m_owner")?.value || "",
    presentation: $("#m_presentation")?.value.trim() || "",
    cost: effectiveCost,
    expiry: $("#m_expiry")?.value || "",
    totalQty: effectiveQty,
    contentPerPresentation,
    packageCount,
    unit: $("#m_unit")?.value.trim() || "",
    unitCost: costBasisQty ? effectiveCost / costBasisQty : 0,
    route: $("#m_route")?.value.trim() || "",
    useTherapeuticDoseOnly: Boolean($("#m_useTherapeuticDoseOnly")?.checked),
    stockType,
    stockMeta: isUsed
      ? { originalQty, originalCost, remainingQty }
      : null,
    concentration,
    speciesDoses: getMedicationSpeciesDoseRows(),
    dosis_por_especie: groupSpeciesDoseRows(getMedicationSpeciesDoseRows()),
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
  const editingId = state.editing.medId;
  const editingIndex = editingId
    ? state.meds.findIndex((item) => item.id === editingId)
    : -1;
  const isEditing = editingIndex >= 0;
  const med = collectMed(isEditing ? editingId : uid("med"));
  if (!med.brand || !med.active) {
    show(
      "m_err",
      "Nombre comercial y sustancia activa son obligatorios.",
      "error",
    );
    return;
  }
  if (!med.owner) {
    show("m_err", "Selecciona a quién pertenece el medicamento.", "error");
    return;
  }
  if (!med.totalQty || med.totalQty <= 0) {
    show("m_err", "La existencia total calculada debe ser mayor a 0 para guardar en inventario.", "error");
    return;
  }
  if (med.stockType !== "USADO") {
    if (!Number(med.contentPerPresentation || 0) || Number(med.contentPerPresentation || 0) <= 0) {
      show("m_err", "Para medicamento nuevo captura contenido por presentación mayor a 0.", "error");
      return;
    }
    if (!Number(med.packageCount || 0) || Number(med.packageCount || 0) <= 0) {
      show("m_err", "Captura un número de presentaciones/envases mayor a 0.", "error");
      return;
    }
  }
  if (med.stockType === "USADO") {
    const originalQty = Number(med.stockMeta?.originalQty || 0);
    const originalCost = Number(med.stockMeta?.originalCost || 0);
    const remainingQty = Number(med.stockMeta?.remainingQty || 0);
    if (!originalQty || !originalCost || remainingQty < 0) {
      show("m_err", "Para medicamento usado captura contenido original, costo original y cantidad restante válidos.", "error");
      return;
    }
    if (remainingQty > originalQty) {
      show("m_err", "La cantidad restante no puede ser mayor al contenido original.", "error");
      return;
    }
  }
  const doseErrors = validateSpeciesDoseRows(med.speciesDoses || []).filter((msg) => /captura especie|por cada|unidad base/.test(msg));
  if (doseErrors.length) {
    show("m_err", doseErrors[0], "error");
    return;
  }
  const conc = med.concentration || {};
  const concFilled = [conc.activeUnit, conc.perUnit].some((v) => String(v || "").trim() !== "")
    || Number(conc.activeAmount || 0) > 0
    || Number(conc.perAmount || 0) > 0;
  if (!med.useTherapeuticDoseOnly && concFilled) {
    if (!(Number(conc.activeAmount || 0) > 0) || !conc.activeUnit || !(Number(conc.perAmount || 0) > 0) || !conc.perUnit) {
      show("m_err", "Si capturas concentración/equivalencia debes completar cantidad, unidad de activo, cantidad física y unidad física.", "error");
      return;
    }
  }
  if (isEditing) {
    state.meds[editingIndex] = med;
  } else {
    state.meds.unshift(med);
  }
  state.editing.medId = null;
  resetMed();
  saveState();
  renderAll();
  show("m_ok", isEditing ? "Medicamento actualizado correctamente." : "Medicamento guardado correctamente.", "success");
}
function resetMed() {
  state.editing.medId = null;
  $("#medForm").reset();
  if ($("#m_packageCount")) $("#m_packageCount").value = "1";
  if ($("#m_stockType")) $("#m_stockType").value = "NUEVO";
  if ($("#m_useTherapeuticDoseOnly")) $("#m_useTherapeuticDoseOnly").checked = false;
  if ($("#m_concentrationPerAmount")) $("#m_concentrationPerAmount").value = "1";
  renderMedicationSpeciesDoseRows([]);
  renderMedStockType();
  renderMedicationConcentrationMode();
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
    m_contentPerPresentation: m.contentPerPresentation || m.totalQty || "",
    m_packageCount: m.packageCount || 1,
    m_totalQty: m.totalQty,
    m_unit: m.unit,
    m_unitCost: m.unitCost,
    m_route: m.route || "",
    m_useTherapeuticDoseOnly: m.useTherapeuticDoseOnly ? "1" : "",
    m_stockType: m.stockType || "NUEVO",
    m_originalQty: m.stockMeta?.originalQty || "",
    m_originalCost: m.stockMeta?.originalCost || "",
    m_remainingQty: m.stockMeta?.remainingQty || "",
    m_concentrationActiveAmount: m.concentration?.activeAmount || "",
    m_concentrationActiveUnit: m.concentration?.activeUnit || "",
    m_concentrationPerAmount: m.concentration?.perAmount || 1,
    m_concentrationPerUnit: m.concentration?.perUnit || "",
    m_use: m.clinical?.use,
    m_mech: m.clinical?.mech,
    m_adverse: m.clinical?.adverse,
    m_preg: m.clinical?.preg,
    m_pk: m.clinical?.pk,
    m_overdose: m.clinical?.overdose,
    m_interactions: m.clinical?.interactions,
    m_dosing: m.clinical?.dosing,
  }).forEach(([k, v]) => {
    const el = $("#" + k);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(v);
    else el.value = safe(v);
  });
  renderMedStockType();
  renderMedicationConcentrationMode();
  const loadedSpeciesDoses = (m.speciesDoses || []).length
    ? m.speciesDoses
    : (m.dosis_por_especie ? flattenSpeciesDoseJson({ dosis_por_especie: m.dosis_por_especie }) : []);
  fillGeneralRouteFromLegacyDose(m, loadedSpeciesDoses);
  renderMedicationSpeciesDoseRows(loadedSpeciesDoses);
  state.draft.medRxPhoto = m.photos?.rx || null;
  state.draft.medTicketPhoto = m.photos?.ticket || null;
  setThumb("m_rx_preview", state.draft.medRxPhoto, "Sin<br/>receta");
  setThumb("m_tk_preview", state.draft.medTicketPhoto, "Sin<br/>ticket");
}
function duplicateMed(m) {
  const copy = JSON.parse(JSON.stringify(m || {}));
  copy.id = uid("med");
  copy.brand = `${copy.brand || "Medicamento"} (copia)`;
  state.meds.unshift(copy);
  state.editing.medId = null;
  saveState();
  renderAll();
  fillMed(copy);
  show("m_ok", "Medicamento duplicado. Puedes editar la copia y guardarla como registro independiente.", "success");
}
function renderMedList() {
  const list = $("#m_list");
  if (!list) return;
  list.innerHTML = "";
  const usage = inventoryUsage();
  const head = document.createElement("div");
  head.className = "item";
  head.innerHTML = `<div class="kpi-grid"><div class="stat"><b>Medicamentos</b><div>${state.meds.length}</div></div><div class="stat"><b>Vacunas</b><div>${state.vaccines.length}</div></div></div>`;
  list.appendChild(head);
  state.meds.forEach((m) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h4>${esc(m.brand)} · ${esc(m.active)}</h4><div class="line"><b>Propiedad:</b> ${esc(medOwnerLabel(m.owner))}</div><div class="line"><b>Tipo:</b> ${esc(m.stockType === "USADO" ? "Usado" : "Nuevo")}</div><div class="line"><b>Modo de cálculo:</b> ${esc(usesStructuredConcentration(m) ? "Con concentración estructurada" : "Solo dosis terapéutica por especie")}</div><div class="line"><b>Contenido por presentación:</b> ${esc(m.contentPerPresentation || "-")} ${esc(m.unit)}</div><div class="line"><b>Número de presentaciones:</b> ${esc(m.packageCount || 1)}</div><div class="line"><b>Existencia total:</b> ${esc(m.totalQty)} ${esc(m.unit)} · <b>Stock disponible:</b> ${medRemaining(m)} ${esc(m.unit)}</div><div class="line"><b>Costo por presentación:</b> ${money(m.cost)} · <b>Costo unitario:</b> ${money(m.unitCost)}</div><div class="line"><b>Vía de administración:</b> ${esc(m.route || "Sin vía de administración registrada")}</div><div class="line"><b>Concentración / equivalencia:</b> ${esc(usesStructuredConcentration(m) ? (medicationConcentrationSummary(m) || "Sin captura") : "No aplica (solo dosis terapéutica)")}</div>${m.stockType === "USADO" ? `<div class="line"><b>Origen usado:</b> ${esc(m.stockMeta?.remainingQty)} de ${esc(m.stockMeta?.originalQty)} ${esc(m.unit)} (costo original ${money(m.stockMeta?.originalCost)})</div>` : ""}<div class="line"><b>Dosis por especie:</b> ${esc((m.speciesDoses || []).map(speciesDoseSummary).join(" · ") || "Sin captura estructurada")}</div><div class="line"><b>Caducidad:</b> ${esc(m.expiry || "Sin fecha de caducidad registrada")}</div><div class="line"><b>Ficha clínica:</b> ${esc(m.clinical?.use || "Sin captura clínica")}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Duplicar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, duplicate, w, e, del] = item.querySelectorAll("button");
    edit.onclick = () => fillMed(m);
    duplicate.onclick = () => duplicateMed(m);
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
function safeSetMedicationJsonField(id, incomingValue, label, applied = { fields: 0, skipped: 0 }) {
  const el = $("#" + id);
  if (!el) return applied;
  const incoming = safe(incomingValue).trim();
  if (!incoming) {
    applied.skipped += 1;
    return applied;
  }
  const current = safe(el.value).trim();
  if (!current) {
    el.value = incoming;
    applied.fields += 1;
    return applied;
  }
  if (current === incoming) return applied;
  const replace = window.confirm(`El campo “${label}” ya tiene información. ¿Deseas reemplazarla con el JSON?\n\nAceptar = reemplazar\nCancelar = conservar lo capturado`);
  if (replace) {
    el.value = incoming;
    applied.fields += 1;
  } else {
    applied.skipped += 1;
  }
  return applied;
}
function chooseSpeciesDoseMergeMode(existingCount = 0, incomingCount = 0) {
  if (!existingCount) return "append";
  const answer = window.prompt(
    `Ya existen ${existingCount} dosis estructurada(s) y el JSON trae ${incomingCount}.\n\nEscribe una opción:\n1 = Agregar dosis nuevas sin borrar las existentes (seguro, recomendado)\n2 = Reemplazar dosis existentes\n3 = Cancelar`,
    "1",
  );
  const normalized = safe(answer).trim().toLowerCase();
  if (!normalized || normalized === "1" || normalized.startsWith("agregar")) return "append";
  if (normalized === "2" || normalized.startsWith("reemplazar")) {
    return window.confirm("Confirmación explícita: ¿reemplazar y borrar las dosis estructuradas existentes?") ? "replace" : "cancel";
  }
  return "cancel";
}
function applySpeciesDoseRowsSafely(rows = [], statusTarget = "ai_status", payload = {}) {
  const errors = validateSpeciesDoseRows(rows);
  const blocking = errors.filter((msg) => /captura especie/.test(msg));
  if (blocking.length) throw new Error(blocking[0]);
  if (errors.length) show(statusTarget, `Advertencia: ${errors[0]}`, "warning");
  fillGeneralRouteFromLegacyDose(payload, rows);
  const existing = getMedicationSpeciesDoseRows();
  const mode = chooseSpeciesDoseMergeMode(existing.length, rows.length);
  if (mode === "cancel") {
    show(statusTarget, "Aplicación de dosis cancelada; no se modificaron las dosis existentes.", "warning");
    return { applied: false, count: 0, mode };
  }
  const finalRows = mode === "replace" ? rows : existing.concat(rows);
  renderMedicationSpeciesDoseRows(finalRows);
  return { applied: true, count: rows.length, mode };
}

function bindMeds() {
  renderMedMode();
  renderMedicationSpeciesDoseRows([]);
  renderMedStockType();
  renderMedicationConcentrationMode();
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
  ["m_contentPerPresentation", "m_packageCount", "m_cost"].forEach((id) =>
    $("#" + id)?.addEventListener("input", () => {
      refreshMedicationTotals();
      const qty = Number($("#m_contentPerPresentation")?.value || 0);
      const cost = Number($("#m_cost")?.value || 0);
      $("#m_unitCost").value = qty ? (cost / qty).toFixed(2) : "";
    }),
  );
  const refreshUsedMedCalc = () => {
      renderMedStockType();
      const isUsed = medStockType() === "USADO";
      const qty = Number((isUsed ? $("#m_originalQty") : $("#m_contentPerPresentation"))?.value || 0);
      const baseCost = Number((isUsed ? $("#m_originalCost") : $("#m_cost"))?.value || 0);
      if ($("#m_unitCost")) $("#m_unitCost").value = qty > 0 ? (baseCost / qty).toFixed(2) : "";
      if (isUsed && $("#m_cost")) $("#m_cost").value = $("#m_originalCost")?.value || "";
    };
  ["m_stockType", "m_originalQty", "m_originalCost", "m_remainingQty", "m_contentPerPresentation", "m_packageCount"].forEach((id) => {
    $("#" + id)?.addEventListener("input", refreshUsedMedCalc);
    $("#" + id)?.addEventListener("change", refreshUsedMedCalc);
  });
  $("#m_useTherapeuticDoseOnly")?.addEventListener("change", renderMedicationConcentrationMode);
  $("#ai_makePrompt")?.addEventListener("click", () => {
    const source = $("#ai_english").value.trim();
    const prompt = `Analiza el siguiente texto de medicamento veterinario y extrae la ficha clínica y las dosis estructuradas por especie. Devuelve exclusivamente JSON válido. Para ficha clínica usa las llaves use, mech, adverse, preg, pk, overdose, interactions y dosing. Para medicamentos estructurados por especie devuelve la llave dosesBySpecies; cada elemento debe incluir species, quantity, unit, perQuantity, baseUnit, compatibleRule, frequency, duration, indication y observations. Si un dato no aparece, usa string vacío o null. No inventes dosis. No mezcles especies. Conserva advertencias importantes en observations. Texto fuente: ${source}`;
    $("#ai_prompt").value = prompt;
  });
  $("#ai_copyPrompt")?.addEventListener("click", () =>
    navigator.clipboard.writeText($("#ai_prompt").value),
  );
  $("#ai_openChatGPT")?.addEventListener("click", () =>
    window.open("https://chatgpt.com/", "_blank", "noopener"),
  );
  $("#ai_runAnalysis")?.addEventListener("click", runMedicationChatGPTAnalysis);
  $("#m_addSpeciesDose")?.addEventListener("click", () => {
    const rows = getMedicationSpeciesDoseRows();
    rows.push({
      species: "",
      dose: 0,
      doseUnit: "",
      porCada: 1,
      unitBase: "kg",
      calculationMode: "PER_KG",
      indication: "",
      frequency: "",
      duration: "",
      notes: "",
    });
    renderMedicationSpeciesDoseRows(rows);
  });
  $("#m_makeSpeciesDosePrompt")?.addEventListener("click", () => {
    const source = $("#m_speciesDoseSource")?.value.trim() || "";
    if ($("#m_speciesDosePrompt")) $("#m_speciesDosePrompt").value = medicationSpeciesDosePrompt(source);
    show("m_speciesDoseStatus", "Prompt específico de dosis por especie generado.", "success");
  });
  $("#m_copySpeciesDosePrompt")?.addEventListener("click", async () => {
    const prompt = $("#m_speciesDosePrompt")?.value || medicationSpeciesDosePrompt($("#m_speciesDoseSource")?.value.trim() || "");
    if ($("#m_speciesDosePrompt")) $("#m_speciesDosePrompt").value = prompt;
    await navigator.clipboard?.writeText?.(prompt);
    show("m_speciesDoseStatus", "Prompt de dosis copiado.", "success");
  });
  $("#m_openSpeciesDoseChatGPT")?.addEventListener("click", () =>
    window.open("https://chatgpt.com/", "_blank", "noopener"),
  );

  $("#m_applySpeciesDoseJson")?.addEventListener("click", () => {
    try {
      const payload = parsePossiblyWrappedJson($("#m_speciesDoseJson")?.value || "{}");
      const rows = flattenSpeciesDoseJson(payload);
      const result = applySpeciesDoseRowsSafely(rows, "m_speciesDoseStatus", payload);
      if (result.applied) {
        const skipped = rows.skippedWithoutSpecies ? ` Advertencia: ${rows.skippedWithoutSpecies} dosis sin especie no se agregaron.` : "";
        show("m_speciesDoseStatus", `JSON de dosis aplicado: ${rows.length} dosis ${result.mode === "append" ? "agregadas sin borrar las existentes" : "reemplazadas por confirmación"}.${skipped}`, rows.skippedWithoutSpecies ? "warning" : "success");
      }
    } catch (error) {
      show("m_speciesDoseStatus", error.message || "JSON de dosis inválido.", "error");
    }
  });
  $("#m_copySpeciesDoseJsonExample")?.addEventListener("click", async () => {
    const example = speciesDoseJsonExample();
    if ($("#m_speciesDoseJson")) $("#m_speciesDoseJson").value = example;
    await navigator.clipboard?.writeText?.(example);
    show("m_speciesDoseStatus", "Ejemplo de dosis JSON copiado y pegado.", "success");
  });
  $("#ai_fillFromJson")?.addEventListener("click", () => {
    try {
      const j = parsePossiblyWrappedJson($("#ai_result").value);
      const stats = { fields: 0, skipped: 0 };
      Object.entries({
        m_use: [j.use, "Uso"],
        m_mech: [j.mech, "Mecanismo de acción"],
        m_adverse: [j.adverse, "Efectos adversos"],
        m_preg: [j.preg, "Precauciones"],
        m_pk: [j.pk, "Farmacocinética"],
        m_overdose: [j.overdose, "Sobredosis"],
        m_interactions: [j.interactions, "Interacciones"],
        m_dosing: [j.dosing, "Dosing"],
      }).forEach(([k, [v, label]]) => safeSetMedicationJsonField(k, v, label, stats));
      safeSetMedicationJsonField("m_route", j.via_administracion ?? j.route ?? j.via ?? j.vía, "Vía de administración", stats);
      let doseMessage = "sin dosis estructuradas en el JSON";
      if (j.dosis_por_especie || j.speciesDoses || j.dosesBySpecies) {
        const rows = flattenSpeciesDoseJson(j);
        const result = applySpeciesDoseRowsSafely(rows, "ai_status", j);
        doseMessage = result.applied
          ? `${rows.length} dosis ${result.mode === "append" ? "agregadas sin borrar las existentes" : "reemplazadas por confirmación"}`
          : "dosis no aplicadas por cancelación";
      }
      show("ai_status", `JSON aplicado con merge seguro: ${stats.fields} campo(s) llenado(s)/actualizado(s), ${stats.skipped} conservado(s), ${doseMessage}.`, "success");
    } catch (err) {
      show("ai_status", err.message || "JSON inválido.", "error");
    }
  });
  $("#ai_copyExample")?.addEventListener("click", async () => {
    const example = JSON.stringify({ use: "Para control antiparasitario", mech: "Actúa sobre canales iónicos", adverse: "Puede causar depresión o vómito", preg: "Usar con criterio veterinario", pk: "Absorción lenta y vida media prolongada", overdose: "Neurológico", interactions: "Precaución con otros lactonas macrocíclicas", dosing: "Según peso vivo y especie", via_administracion: "Subcutánea e intramuscular", dosis_por_especie: JSON.parse(speciesDoseJsonExample()).dosis_por_especie }, null, 2);
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
function renderSupplyFormState() {
  const editing = Boolean(state.editing.supplyId);
  const badge = $("#s_formModeBadge");
  const submitBtn = $('#supplyForm button[type="submit"]');
  const clearBtn = $("#s_btnClear");
  const cancelBtn = $("#s_btnCancelEdit");
  if (badge) {
    badge.textContent = editing ? "Editando insumo" : "Nuevo insumo";
    badge.classList.toggle("warn", editing);
  }
  if (submitBtn) submitBtn.textContent = editing ? "💾 Guardar cambios" : "💾 Guardar insumo";
  if (clearBtn) clearBtn.textContent = editing ? "🧽 Limpiar para nuevo insumo" : "🧽 Limpiar";
  if (cancelBtn) cancelBtn.style.display = editing ? "inline-flex" : "none";
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
    type,
    name: $("#s_name").value.trim(),
    acquired: $("#s_acquired").value,
    owner: $("#s_owner")?.value || "SERVICIOS",
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
  const draft = collectSupply();
  if (!draft.name || !draft.acquired) {
    show("s_err", "Nombre y fecha de adquisición son obligatorios.", "error");
    return;
  }
  const editingId = state.editing.supplyId;
  if (editingId) {
    const idx = state.supplies.findIndex((x) => x.id === editingId);
    if (idx >= 0) state.supplies[idx] = { ...draft, id: editingId };
    else state.supplies.unshift({ ...draft, id: uid("sup") });
  } else {
    state.supplies.unshift({ ...draft, id: uid("sup") });
  }
  saveState();
  renderAll();
  resetSupply("DISPOSABLE");
  show("s_ok", editingId ? "Insumo actualizado y formulario listo para nuevo registro." : "Insumo guardado.", "success");
}
function resetSupply(nextMode = "DISPOSABLE") {
  state.editing.supplyId = null;
  $("#supplyForm").reset();
  state.ui.supplyMode = nextMode === "NON_DISPOSABLE" ? "NON_DISPOSABLE" : "DISPOSABLE";
  state.draft.supplyTicketPhoto = null;
  setThumb("s_tk_preview", null, "Sin<br/>ticket");
  renderSupplyMode();
  renderSupplyFormState();
}
function fillSupply(s) {
  resetSupply(s.type === "NON_DISPOSABLE" ? "NON_DISPOSABLE" : "DISPOSABLE");
  state.editing.supplyId = s.id;
  state.ui.supplyMode =
    s.type === "NON_DISPOSABLE" ? "NON_DISPOSABLE" : "DISPOSABLE";
  renderSupplyMode();
  Object.entries({
    s_name: s.name,
    s_acquired: s.acquired,
    s_owner: s.owner || "SERVICIOS",
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
  renderSupplyFormState();
}
function renderSupplyList() {
  const list = $("#s_list");
  if (!list) return;
  list.innerHTML = "";
  state.supplies.forEach((s) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h4>${esc(s.name)}</h4><div class="line"><b>Tipo:</b> ${s.type === "NON_DISPOSABLE" ? "No desechable" : "Desechable"}</div><div class="line"><b>Pertenece a:</b> ${esc(medOwnerLabel(s.owner || "SERVICIOS"))}</div><div class="line"><b>Disponibilidad:</b> ${esc(supplyRemaining(s))}</div><div class="line"><b>${s.type === "NON_DISPOSABLE" ? "Costo por uso" : "Costo unitario real"}:</b> ${money(supplyDisplayCost(s))}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
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
  renderSupplyFormState();
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
  $("#s_btnClear")?.addEventListener("click", () => {
    const keepMode = state.editing.supplyId ? "DISPOSABLE" : state.ui.supplyMode;
    resetSupply(keepMode);
  });
  $("#s_btnCancelEdit")?.addEventListener("click", () => {
    resetSupply("DISPOSABLE");
    show("s_msg", "Edición cancelada. Ya puedes capturar un nuevo insumo.", "warning");
  });
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
    $("#p_producer")?.value || state.selectedProducerId,
  );
  const animals = prod?.animals || [];
  const fillAnimalSelect = (sel) => {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML =
      '<option value="">— Selecciona —</option>' +
      animals
        .map((a) => `<option value="${a.id}">${esc(animalLabel(a))}</option>`)
        .join("");
    sel.value = animals.some((a) => a.id === prev) ? prev : "";
  };
  fillAnimalSelect($("#p_animalGroup"));
  fillAnimalSelect($("#p_cc_registeredAnimal"));
}
function populateInventorySelects() {
  const medSel = $("#p_medSelect"),
    groupMedSel = $("#p_groupMedSelect"),
    vaxSel = $("#p_vaccineSelect"),
    supSel = $("#p_supplySelect"),
    labSupSel = $("#lab_supplySelectStandalone");
  if (medSel) populateProcedureProductSelect();
  if (groupMedSel) {
    groupMedSel.innerHTML =
      '<option value="">— Selecciona —</option>' +
      state.meds
        .map(
          (m) =>
            `<option value="${m.id}">${esc(m.brand)} (${medRemaining(m)} ${esc(m.unit)})</option>`,
        )
        .join("");
  }
  if (vaxSel) {
    vaxSel.innerHTML =
      '<option value="">— Selecciona —</option>' +
      state.vaccines
        .map(
          (v) =>
            `<option value="${v.id}">${esc(v.brand)} (${vaccineRemaining(v)} animales)</option>`,
        )
        .join("");
  }
  if (supSel) {
    supSel.innerHTML =
      '<option value="">— Selecciona —</option>' +
      state.supplies
        .map(
          (s) =>
            `<option value="${s.id}">${esc(s.name)} (${esc(supplyRemaining(s))})</option>`,
        )
        .join("");
  }
  if (labSupSel) {
    labSupSel.innerHTML =
      '<option value="">— Selecciona —</option>' +
      state.supplies
        .map(
          (s) =>
            `<option value="${s.id}">${esc(s.name)} (${esc(supplyRemaining(s))})</option>`,
        )
        .join("");
  }
  populateClinicalDayInventorySelectors();
}

function getProcedureProductType() {
  return $("#p_productType")?.value || "MEDICAMENTO";
}
function procedureProductCollection(type = getProcedureProductType()) {
  if (type === "VACUNA") return state.vaccines || [];
  if (type === "INSUMO") return state.supplies || [];
  return state.meds || [];
}
function procedureProductName(product, type = getProcedureProductType()) {
  return type === "INSUMO" ? (product?.name || "Insumo") : (product?.brand || "Producto");
}
function procedureProductRemaining(product, type = getProcedureProductType()) {
  if (!product) return "";
  if (type === "VACUNA") return `${vaccineRemaining(product)} dosis/animales`;
  if (type === "INSUMO") return `${supplyRemaining(product)} ${product.type === "NON_DISPOSABLE" ? "usos" : "pzas"}`;
  return `${medRemaining(product)} ${product.unit || ""}`.trim();
}
function procedureProductUnitCost(product, type = getProcedureProductType()) {
  if (!product) return 0;
  if (type === "VACUNA") return Number(product.unitCost || product.pricePerDose || product.price || 0);
  if (type === "INSUMO") return Number(supplyDisplayCost(product) || 0);
  return Number(product.unitCost || 0);
}
function procedureProductUnit(product, type = getProcedureProductType()) {
  if (!product) return "";
  if (type === "VACUNA") return product.unit || "dosis";
  if (type === "INSUMO") return product.unit || (product.type === "NON_DISPOSABLE" ? "uso" : "pieza");
  return product.unit || "";
}
function byProcedureProductId(id, type = getProcedureProductType()) {
  return byId(procedureProductCollection(type), id);
}
function populateProcedureProductSelect() {
  const sel = $("#p_medSelect");
  if (!sel) return;
  const prev = sel.value;
  const type = getProcedureProductType();
  sel.innerHTML = '<option value="">— Selecciona —</option>' + procedureProductCollection(type).map((item) => `<option value="${item.id}">${esc(procedureProductName(item, type))} (${esc(procedureProductRemaining(item, type))})</option>`).join("");
  sel.value = procedureProductCollection(type).some((item) => item.id === prev) ? prev : "";
}

function isUnregisteredClinicalCase() {
  return $("#p_type")?.value === "CASO_CLINICO" && $("#p_caseOwnerMode")?.value === "UNREGISTERED";
}
function toggleProcedureOwnerModeUi() {
  const type = $("#p_type")?.value || "";
  const ownerMode = $("#p_caseOwnerMode")?.value || "REGISTERED";
  const isClinical = type === "CASO_CLINICO";
  const isUnregistered = isClinical && ownerMode === "UNREGISTERED";
  const modeWrap = $("#p_caseOwnerMode")?.closest("div");
  const producerWrap = $("#p_producer")?.closest("div");
  const clientWrap = $("#p_unregisteredClientName")?.closest("div");
  const animalWrap = $("#p_unregisteredAnimalName")?.closest("div");
  if (modeWrap) modeWrap.style.display = isClinical ? "block" : "none";
  if (producerWrap) producerWrap.style.display = !isClinical || ownerMode === "REGISTERED" ? "block" : "none";
  if (clientWrap) clientWrap.style.display = isUnregistered ? "block" : "none";
  if (animalWrap) animalWrap.style.display = isUnregistered ? "block" : "none";
  const individualControls = $("#p_individualAnimalControls");
  if (individualControls && isUnregistered) individualControls.style.display = "none";
  const clinicalRegisteredAnimalWrap = $("#p_cc_registeredAnimal")?.closest("div");
  if (clinicalRegisteredAnimalWrap) clinicalRegisteredAnimalWrap.style.display = isUnregistered ? "none" : "block";
}
function applyClinicalOutcomeToRegisteredAnimal(procedure, previousProcedure = null) {
  const prevAnimalId = previousProcedure?.animalId || "";
  if (previousProcedure?.caseClinical?.outcome === "DECESO" && prevAnimalId && prevAnimalId !== procedure.animalId) {
    const prevProducer = byId(state.producers, previousProcedure.producerId);
    const prevAnimal = byId(prevProducer?.animals || [], prevAnimalId);
    if (prevAnimal?.deathProcedureId === previousProcedure.id) {
      prevAnimal.clinicalStatus = "ACTIVO";
      prevAnimal.deathCause = "";
      prevAnimal.deathDate = "";
      prevAnimal.deathProcedureId = "";
    }
  }
  if (procedure.type !== "CASO_CLINICO" || !procedure.producerId || !procedure.animalId) return;
  const prod = byId(state.producers, procedure.producerId);
  const animal = byId(prod?.animals || [], procedure.animalId);
  if (!animal) return;
  if (procedure.caseClinical?.outcome === "DECESO") {
    animal.clinicalStatus = "DECESO";
    animal.deathCause = procedure.caseClinical?.deathCause || "";
    animal.deathDate = procedure.date || "";
    animal.deathProcedureId = procedure.id;
  } else if (previousProcedure?.caseClinical?.outcome === "DECESO" && animal.deathProcedureId === procedure.id) {
    animal.clinicalStatus = "ACTIVO";
    animal.deathCause = "";
    animal.deathDate = "";
    animal.deathProcedureId = "";
  }
}
function renderProcedureType() {
  const type = $("#p_type")?.value || "";
  toggleProcedureOwnerModeUi();
  const clinical = type === "CASO_CLINICO";
  const blockVisibility = {
    clinical,
    necropsy: type === "NECROPSIA",
    zootecnia: type === "ZOOTECNIA",
    inventory: !clinical,
    "animal-breakdown": !clinical,
  };
  if (type === "PREVENTIVA") blockVisibility.inventory = true;
  $$("#procedureForm details").forEach((d) => {
    const block = d.dataset.procedureBlock;
    if (!block || block === "base") return;
    if (Object.prototype.hasOwnProperty.call(blockVisibility, block)) {
      d.style.display = blockVisibility[block] ? "block" : "none";
      return;
    }
    const sum = d.querySelector("summary")?.textContent || "";
    if (sum.includes("Caso clínico")) d.style.display = clinical ? "block" : "none";
    if (sum.includes("Necropsia")) d.style.display = type === "NECROPSIA" ? "block" : "none";
    if (sum.includes("Atención clínica")) d.style.display = type === "ZOOTECNIA" ? "block" : "none";
  });
  if ($("#p_scope")) {
    $("#p_scope").disabled = ["CIRUGIA", "CASO_CLINICO", "NECROPSIA"].includes(type);
    if (["CIRUGIA", "CASO_CLINICO", "NECROPSIA"].includes(type)) $("#p_scope").value = "INDIVIDUAL";
  }
  toggleProcedureMedicationModeUi();
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
  show("p_msg", "La vacuna ahora se registra por animal desde cada subregistro individual para conservar peso, especie y trazabilidad.", "warning");
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
  renderProcedureMedUseList();
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
  renderProcedureChargeBreakdown(breakdown);
  renderClinicalConsumptionSummary();
}
function calculateProcedureChargeBreakdown() {
  const meds = (state.draft.procedureMedUses || []).map((x) => {
    const qty = Number(x.totalUsedQty || x.chargeableQty || x.inventoryDeductionQty || x.qty || 0);
    const unitCost = Number(x.unitCost || 0);
    return {
      category: "Medicamentos",
      name: x.name || "Medicamento",
      qty,
      qtyLabel: `${Number(qty || 0).toFixed(2)} ${x.unit || ""}`.trim(),
      unitCost,
      unitCostLabel: money(unitCost),
      costSuggested: x.costSuggested ?? qty * unitCost,
      subtotal: x.costCharged ?? x.priceCharged ?? x.costSuggested ?? qty * unitCost,
      extraLabel: x.calculationSummary || "",
    };
  });
  const vaccines = (state.draft.procedureVaccineUses || []).map((x) => {
    const animalsApplied = Number(x.animalsApplied || 0);
    const unitCost = Number(x.unitCost || x.price || 0);
    return {
      category: "Vacunas",
      name: x.name || "Vacuna",
      qty: animalsApplied,
      qtyLabel: `${animalsApplied} animales`,
      unitCost,
      unitCostLabel: money(unitCost),
      subtotal: animalsApplied * unitCost,
      extraLabel: x.notes || "",
    };
  });
  const supplies = (state.draft.procedureSupplyUses || []).map((x) => {
    const qty = Number(x.qty || 0);
    const unitCost = Number(x.unitCost || 0);
    return {
      category: "Insumos",
      name: x.name || "Insumo",
      qty,
      qtyLabel: `${Number(qty || 0).toFixed(2)} ${x.type === "NON_DISPOSABLE" ? "usos" : "pzas"}`,
      unitCost,
      unitCostLabel: money(unitCost),
      subtotal: qty * unitCost,
      extraLabel: x.notes || "",
    };
  });
  const base = Number($("#p_costTotal").value || 0);
  const service = base > 0
    ? [{
      category: "Servicio",
      name: $("#p_type")?.selectedOptions?.[0]?.textContent || "Servicio",
      qty: Number($("#p_animalsQtyUsed")?.value || 0),
      qtyLabel: Number($("#p_animalsQtyUsed")?.value || 0) > 0 ? `${Number($("#p_animalsQtyUsed")?.value || 0)} animales` : "Servicio general",
      unitCost: base,
      unitCostLabel: money(base),
      subtotal: base,
      extraLabel: "Costo base del procedimiento",
    }]
    : [];
  return { meds, vaccines, supplies, service };
}
function calculateProcedureCharge() {
  const base = Number($("#p_costTotal").value || 0);
  const breakdownItems = calculateProcedureChargeBreakdown();
  const meds = breakdownItems.meds.reduce((acc, item) => acc + item.subtotal, 0);
  const vaccines = breakdownItems.vaccines.reduce((acc, item) => acc + item.subtotal, 0);
  const supplies = breakdownItems.supplies.reduce((acc, item) => acc + item.subtotal, 0);
  const subtotal = base + meds + vaccines + supplies;
  return { base, meds, vaccines, supplies, subtotal, total: subtotal, breakdown: breakdownItems };
}
function preventiveFinalSummaryHtml() {
  if (($("#p_type")?.value || "") !== "PREVENTIVA") return "";
  const draftProcedure = collectProcedure();
  const summary = consumptionDebtSummary(draftProcedure);
  const animalRows = (draftProcedure.animals || []).map((animal) => {
    const meds = (animal.medicationsApplied || []).map((item) => `${item.medicationName || "Medicamento"} (${Number(item.inventoryDiscount || item.finalAppliedAmount || 0).toFixed(2)} ${item.inventoryDiscountUnit || item.finalUnit || ""})`).join(", ") || "Sin medicamentos/vacunas";
    const supplies = (animal.suppliesApplied || []).map((item) => `${item.name || "Insumo"} (${Number(item.qty || 0).toFixed(2)} ${item.unit || ""})`).join(", ") || "Sin insumos";
    return `<li><b>${esc(animal.identification || animal.sourceLabel || "Animal")}</b>: ${esc(meds)} · ${esc(supplies)}</li>`;
  }).join("") || "<li>Sin animales atendidos.</li>";
  const medRows = [
    ...summary.meds.map((item) => {
      const med = byId(state.meds, item.itemId);
      const qty = Number(item.inventoryDeductionQty || item.qty || 0);
      return `<li>${esc(item.name || "Medicamento")} · total ${qty.toFixed(2)} ${esc(item.inventoryDeductionUnit || item.unit || "")} · restante ${esc(med ? `${medRemaining(med)} ${med.unit || ""}` : "N/A")} · sugerido ${money(qty * Number(item.unitCost || 0))}</li>`;
    }),
    ...(draftProcedure.inventory?.vaccines || []).map((item) => {
      const vaccine = byId(state.vaccines, item.itemId);
      return `<li>${esc(item.name || "Vacuna")} · total ${Number(item.animalsApplied || 0).toFixed(2)} animales · restante ${esc(vaccine ? `${vaccineRemaining(vaccine)} animales` : "N/A")} · sugerido ${money(item.costSuggested ?? Number(item.animalsApplied || 0) * Number(item.unitCost || 0))}</li>`;
    }),
  ].join("") || "<li>Sin medicamentos/vacunas usados.</li>";
  const supRows = summary.supplies.map((item) => {
    const supply = byId(state.supplies, item.itemId);
    return `<li>${esc(item.name || "Insumo")} · total ${Number(item.qty || 0).toFixed(2)} ${esc(item.unit || (item.type === "NON_DISPOSABLE" ? "usos" : "pzas"))} · restante ${esc(supply ? supplyRemaining(supply) : "N/A")} · sugerido ${money(Number(item.qty || 0) * Number(item.unitCost || 0))}</li>`;
  }).join("") || "<li>Sin insumos usados.</li>";
  const debtRows = summary.debt.map((item) => `<li>${esc(item.itemName)} · ${money(item.amount || 0)} · ${esc(medOwnerLabel(item.owner))}</li>`).join("") || "<li>Sin deuda a personas propietarias.</li>";
  return `<section class="card" style="margin-top:10px;"><h4>Resumen final de Medicina preventiva</h4><div class="grid cols-3"><div><b>Animales atendidos</b><ul>${animalRows}</ul></div><div><b>Total medicamentos/vacunas</b><ul>${medRows}</ul></div><div><b>Total insumos y deuda</b><ul>${supRows}</ul><b>Deuda</b><ul>${debtRows}</ul></div></div><div class="line"><b>Costo automático sugerido:</b> ${money((summary.medsCost || 0) + (summary.suppliesCost || 0))} · <b>Precio cobrado editable:</b> ${money(Number($("#p_chargeManual")?.value || calculateProcedureCharge().total || 0))} · <b>Total adeudado:</b> ${money(summary.debtTotal || 0)}</div></section>`;
}
function renderProcedureChargeBreakdown(breakdown = calculateProcedureCharge()) {
  const box = $("#p_chargeBreakdown");
  if (!box) return;
  const drawRows = (title, items) => {
    if (!items.length) return `<h5>${title}</h5><div class="help">Sin registros.</div>`;
    return `<h5>${title}</h5><ul>${items.map((item) => `<li><b>${esc(item.name)}</b> → ${esc(item.qtyLabel)} → ${esc(item.unitCostLabel)} → <b>${money(item.subtotal)}</b>${item.extraLabel ? ` <small>(${esc(item.extraLabel)})</small>` : ""}</li>`).join("")}</ul>`;
  };
  const charge = breakdown || calculateProcedureCharge();
  const detail = charge.breakdown || calculateProcedureChargeBreakdown();
  box.innerHTML = `
    ${drawRows("Medicamentos", detail.meds || [])}
    ${drawRows("Vacunas", detail.vaccines || [])}
    ${drawRows("Insumos", detail.supplies || [])}
    ${drawRows("Servicio", detail.service || [])}
    <h5>TOTAL</h5>
    <p><b>${money(charge.total || 0)}</b></p>
  `;
}
async function addLab() {
  const file = $("#lab_file").files?.[0];
  const suggested = Number($("#lab_costSuggested")?.value || 0);
  const charged = Number($("#lab_costCharged")?.value || suggested || 0);
  const id = state.editing.procedureLabId || uid("lab");
  const lab = {
    id,
    type: $("#lab_type").value.trim(),
    name: $("#lab_name")?.value.trim() || $("#lab_type")?.value.trim() || "",
    sampleType: $("#lab_sampleType")?.value.trim() || "",
    date: $("#lab_date").value,
    sampleDate: $("#lab_date").value,
    resultDate: $("#lab_resultDate")?.value || "",
    responsible: $("#lab_responsible")?.value.trim() || "",
    animal: $("#lab_animal").value.trim(),
    result: $("#lab_result").value.trim(),
    results: $("#lab_result").value.trim(),
    interpretation: $("#lab_interpretation").value.trim(),
    notes: $("#lab_notes").value.trim(),
    relatedTo: $("#lab_relatedTo")?.value.trim() || "",
    costSuggested: suggested,
    costCharged: charged,
    charge: { unitCost: suggested, animalCount: 1, subtotal: suggested, supplies: 0, total: charged },
    file: file ? await fileToBase64(file) : null,
    linkedProcedureId: state.editing.procedureId || null,
  };
  if (!lab.type || !lab.date) {
    show("p_msg", "Tipo y fecha de prueba son obligatorios.", "warning");
    return;
  }
  const idx = state.labTests.findIndex((item) => item.id === lab.id);
  if (idx >= 0) state.labTests[idx] = { ...state.labTests[idx], ...lab, file: lab.file || state.labTests[idx].file || null };
  else state.labTests.unshift(lab);
  if (!state.draft.procedureLabIds.includes(lab.id)) state.draft.procedureLabIds.push(lab.id);
  state.editing.procedureLabId = null;
  saveState();
  renderProcedureDraftLists();
  [
    "lab_type",
    "lab_name",
    "lab_sampleType",
    "lab_date",
    "lab_resultDate",
    "lab_responsible",
    "lab_animal",
    "lab_result",
    "lab_relatedTo",
    "lab_costSuggested",
    "lab_costCharged",
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
    producerId: isUnregisteredClinicalCase() ? "" : $("#p_producer").value,
    producerName: isUnregisteredClinicalCase() ? ($("#p_unregisteredClientName")?.value.trim() || "") : producerName($("#p_producer").value),
    ownerMode: isUnregisteredClinicalCase() ? "UNREGISTERED" : "REGISTERED",
    unregisteredClientName: $("#p_unregisteredClientName")?.value.trim() || "",
    unregisteredAnimalName: $("#p_unregisteredAnimalName")?.value.trim() || "",
    animalId: isUnregisteredClinicalCase() ? "" : (($("#p_type")?.value || "") === "CASO_CLINICO" ? ($("#p_cc_registeredAnimal")?.value || "") : (($("#p_scope")?.value || "INDIVIDUAL") === "GRUPAL" ? ($("#p_groupAnimalBase")?.value || "") : $("#p_animalGroup").value)),
    animalsQtyUsed: Number($("#p_animalsQtyUsed").value || 0),
    species: $("#p_species").value.trim(),
    identification: $("#p_identification").value.trim(),
    weight: $("#p_weight").value,
    temperature: $("#p_temperature").value,
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
  if (!persistActiveClinicalDayEdit()) return show("p_err", "El día de medicación en edición debe conservar al menos un medicamento o insumo, o elimínalo antes de guardar.", "error");
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
  applyClinicalOutcomeToRegisteredAnimal(p, previous);
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
  state.editing.procedureLabId = null;
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
    p_cc_followup: p.caseClinical?.followup, p_cc_outcome: p.caseClinical?.outcome || "", p_cc_deathCause: p.caseClinical?.deathCause || "",
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
    p_nec_bibliography: p.necropsy?.bibliography, p_nec_samplesTaken: p.necropsy?.samplesTaken,
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
  state.draft.procedureMedUses = [
    ...(legacyGroupMedicationToProcedureUse(p.groupMedication) ? [legacyGroupMedicationToProcedureUse(p.groupMedication)] : []),
    ...(p.inventory?.meds || []).filter((item) => !item.linkedAnimals?.length && !item.applicationMode && item.source !== "FOLLOWUP" && item.source !== "CLINICAL_DAY").map((item) => ({ ...item, productType: item.productType || "MEDICAMENTO" })),
    ...(p.inventory?.vaccines || []).filter((item) => item.source === "PROCEDURE_MANUAL" || item.productType === "VACUNA").map((item) => ({ ...item, productType: "VACUNA", qty: item.qty || item.inventoryDeductionQty || item.animalsApplied || 0, baseAmount: item.baseAmount || item.animalsApplied || item.qty || 0, costCharged: item.costCharged ?? item.priceCharged })),
    ...(p.inventory?.supplies || []).filter((item) => item.source === "PROCEDURE_MANUAL" || item.productType === "INSUMO").map((item) => ({ ...item, productType: "INSUMO" })),
  ];
  state.draft.procedureVaccineUses = [];
  state.draft.procedureSupplyUses = [...(p.inventory?.supplies || []).filter((item) => item.source !== "CLINICAL_DAY" && item.source !== "PROCEDURE_MANUAL" && item.productType !== "INSUMO")];
  state.draft.procedureLabIds = [...(p.labIds || [])];
  state.draft.procedureCasePhotos = [...(p.caseClinical?.photos || [])];
  state.draft.procedureNecropsyPhotos = [...(p.necropsy?.photos || [])];
  state.draft.procedureNecropsyFindings = migrateLegacyNecropsyFieldsToSystematic(p.necropsy || {}, p.necropsy?.systematicFindings || []);
  renderNecropsySystematicList(state.draft.procedureNecropsyFindings);
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
    item.innerHTML = `<h4>${esc(p.type)} · ${esc(prod?.basic?.name || p.unregisteredClientName || p.producerName || "Sin productor registrado")}</h4><div class="line"><b>Fecha:</b> ${esc(p.date)}</div><div class="line"><b>Animal:</b> ${esc(animal ? animalLabel(animal) : p.identification || "")}</div><div class="line"><b>Medicamentos usados:</b> ${(p.inventory?.meds || []).length}</div><div class="line"><b>Vacunas usadas:</b> ${(p.inventory?.vaccines || []).length}</div><div class="line"><b>Pruebas vinculadas:</b> ${(p.labIds || []).length}</div><div class="line"><b>Monto calculado:</b> ${money(p.charge?.total)}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
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
  resetProcedureFollowupMedicationForm();
  $("#p_producer")?.addEventListener("change", () => {
    state.selectedProducerId =
      $("#p_producer").value || state.selectedProducerId;
    renderProcedureAnimalSelect();
  });
  $("#p_cc_registeredAnimal")?.addEventListener("change", () => { applyRegisteredClinicalAnimalToForm(); syncClinicalDayMedicationSelection(); renderProcedureDraftLists(); });
  $("#p_cc_dayMedSelect")?.addEventListener("change", syncClinicalDayMedicationSelection);
  $("#p_cc_dayDoseSelect")?.addEventListener("change", () => { applyClinicalDoseSelection(); syncClinicalDayMedicationCalculation(); });
  ["p_cc_dayDoseQty", "p_cc_dayDoseUnit", "p_cc_dayPerKg", "p_cc_dayUnitBase"].forEach((id) => $("#" + id)?.addEventListener("input", () => { ["p_cc_dayTheoreticalDose", "p_cc_dayAdminDose"].forEach((manualId) => { const el = $("#" + manualId); if (el) delete el.dataset.manual; }); syncClinicalDayMedicationCalculation(); }));
  $("#p_cc_dayAdminUnit")?.addEventListener("input", () => syncClinicalDayMedicationCalculation({ preserveCharged: true }));
  $("#p_cc_dayTheoreticalDose")?.addEventListener("input", () => { $("#p_cc_dayTheoreticalDose").dataset.manual = "1"; const admin = $("#p_cc_dayAdminDose"); if (admin) delete admin.dataset.manual; syncClinicalDayMedicationCalculation(); });
  $("#p_cc_dayAdminDose")?.addEventListener("input", () => { $("#p_cc_dayAdminDose").dataset.manual = "1"; syncClinicalDayMedicationCalculation({ preserveCharged: true }); });
  $("#p_cc_dayMedCostCharged")?.addEventListener("input", () => { $("#p_cc_dayMedCostCharged").dataset.manual = "1"; });
  $("#p_cc_daySupplySelect")?.addEventListener("change", syncClinicalDaySupplySelection);
  ["p_cc_daySupplyQty", "p_cc_daySupplyUnit"].forEach((id) => $("#" + id)?.addEventListener("input", () => syncClinicalDaySupplyCost({ preserveCharged: true })));
  $("#p_cc_daySupplyUnitCost")?.addEventListener("input", () => { $("#p_cc_daySupplyUnitCost").dataset.manual = "1"; syncClinicalDaySupplyCost({ preserveCharged: true }); });
  $("#p_cc_daySupplyCostCharged")?.addEventListener("input", () => { $("#p_cc_daySupplyCostCharged").dataset.manual = "1"; });
  $("#p_cc_species")?.addEventListener("input", syncClinicalDayMedicationSelection);
  $("#p_cc_addDayMedication")?.addEventListener("click", addClinicalDayMedication);
  $("#p_cc_addDaySupply")?.addEventListener("click", addClinicalDaySupply);
  $("#p_cc_addClinicalDay")?.addEventListener("click", addClinicalDay);
  $("#p_caseOwnerMode")?.addEventListener("change", () => { renderProcedureType(); renderProcedureAnimalSelect(); renderProcedureDraftLists(); });
  ["p_unregisteredClientName", "p_unregisteredAnimalName", "p_cc_outcome", "p_cc_deathCause"].forEach((id) => $("#" + id)?.addEventListener("input", renderProcedureDraftLists));
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
function formatExportValue(value) {
  if (Array.isArray(value)) {
    if (!value.length) return "";
    return value
      .map((item) => (typeof item === "object" && item ? Object.entries(item).map(([k, v]) => `${k}: ${formatExportValue(v)}`).join(" | ") : formatExportValue(item)))
      .join(" ; ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([k, v]) => `${k}: ${formatExportValue(v)}`).join(" | ");
  }
  return value == null ? "" : String(value);
}
function objectEntriesTable(obj = {}) {
  return `<table><tr><th>Campo</th><th>Valor</th></tr>${Object.entries(obj).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(formatExportValue(v))}</td></tr>`).join("")}</table>`;
}
function vaccineWordHtml(v) {
  return `<h1>Vacuna: ${esc(v.brand)}</h1><p><b>Propiedad:</b> ${esc(medOwnerLabel(v.owner))}</p><p><b>Caducidad:</b> ${esc(v.expiry)}</p><p><b>Cobertura total:</b> ${esc(v.coverageAnimals)} animales</p><p><b>Costo total:</b> ${money(v.price)} · <b>Costo unitario:</b> ${money(v.unitCost)}</p><p><b>Enfermedades:</b> ${esc(v.diseases)}</p><p><b>Notas:</b> ${esc(v.notes)}</p>${imageHtml(v.photo, "Evidencia vacuna")}`;
}
function vaccineSummaryHtml() {
  return `<h1>Vacunas</h1>${state.vaccines.map(vaccineWordHtml).join('<div style="page-break-after:always"></div>')}`;
}
function traditionalRemediesTable(items = []) {
  if (!items.length) return '<p>Sin registros de medicina tradicional.</p>';
  return `<table><tr><th>Nombre</th><th>Tipo</th><th>Uso</th><th>Parte</th><th>Animales</th></tr>${items.map((item) => `<tr><td>${esc(item.name || "")}</td><td>${esc(item.type || "")}</td><td>${esc(item.use || "")}</td><td>${esc(item.part || "")}</td><td>${esc(item.targetAnimals || "")}</td></tr>`).join("")}</table>`;
}
function genderAnimalsTable(items = []) {
  if (!items.length) return '<p>Sin registros de animales por roles de género.</p>';
  return `<table><tr><th>Animal</th><th>Quién lo cuida</th><th>¿Por qué?</th></tr>${items.map((item) => `<tr><td>${esc(item.animal || "")}</td><td>${esc(item.who || "")}</td><td>${esc(item.why || "")}</td></tr>`).join("")}</table>`;
}
function genderActivitiesTable(items = []) {
  if (!items.length) return '<p>Sin actividades registradas por roles de género.</p>';
  return `<table><tr><th>Actividad</th><th>¿Quién la hace?</th><th>¿Por qué lo creen?</th></tr>${items.map((item) => `<tr><td>${esc(item.activity || "")}</td><td>${esc(item.sex || "")}</td><td>${esc(item.reason || "")}</td></tr>`).join("")}</table>`;
}
function diseaseRecordsTable(items = []) {
  if (!items.length) return "<p>Sin enfermedades registradas.</p>";
  return `<table><tr><th>Fecha</th><th>Animal/especie</th><th>Enfermedad/problema</th><th>Signos clínicos</th><th>Tratamiento/acciones</th></tr>${items.map((item) => `<tr><td>${esc(item.date || "")}</td><td>${esc(item.animal || "")}</td><td>${esc(item.problem || "")}</td><td>${esc(item.signs || "")}</td><td>${esc(item.treatment || "")}</td></tr>`).join("")}</table>`;
}
function programsTable(items = []) {
  if (!items.length) return "<p>Sin programas registrados.</p>";
  return `<table><tr><th>Programa</th><th>¿Recibió folio?</th><th>Folio</th></tr>${items.map((item) => `<tr><td>${esc(item.name || "")}</td><td>${esc(item.hasFolio || "")}</td><td>${esc(item.hasFolio === "Sí" ? (item.folio || "(sin folio)") : "(sin folio)")}</td></tr>`).join("")}</table>`;
}
function questionnaireExportRows(prod) {
  const q = getProducerQuestionnaireSkeleton(prod);
  return [[
    prod.basic?.name || "",
    q.A6 || "",
    q.A7 || "",
    producerHasRegisteredBirds(prod) ? "Sí" : "No",
    q.birdsInterest || "",
    q.traditional.length,
    q.traditional.map((item) => item.name || "").filter(Boolean).join(", "),
    q.traditional.map((item) => item.targetAnimals || "").filter(Boolean).join(" | "),
    q.genderAnimals.length,
    q.genderAnimals.map((item) => item.animal || "").filter(Boolean).join(" | "),
    q.genderAnimals.map((item) => item.who || "").filter(Boolean).join(" | "),
    q.genderAnimals.map((item) => item.why || "").filter(Boolean).join(" | "),
    (q.rumiantTrainingTopics || []).join(" | "),
  ]];
}
function genderAnimalsExportRows(prod) {
  return getProducerQuestionnaireSkeleton(prod).genderAnimals.map((item) => [
    prod.basic?.name || "",
    item.animal || "",
    item.who || "",
    item.why || "",
  ]);
}
function genderActivitiesExportRows(prod) {
  return getProducerQuestionnaireSkeleton(prod).genderActivities.map((item) => [
    prod.basic?.name || "",
    item.activity || "",
    item.sex || "",
    item.reason || "",
  ]);
}
function diseaseExportRows(prod) {
  return getProducerQuestionnaireSkeleton(prod).diseases.map((item) => [
    prod.basic?.name || "",
    item.date || "",
    item.animal || "",
    item.problem || "",
    item.signs || "",
    item.treatment || "",
  ]);
}
function programsExportRows(prod) {
  return getProducerQuestionnaireSkeleton(prod).programs.map((item) => [
    prod.basic?.name || "",
    item.name || "",
    item.hasFolio || "",
    item.hasFolio === "Sí" ? (item.folio || "") : "",
  ]);
}
function fullProducerSection(prod) {
  const q = getProducerQuestionnaireSkeleton(prod);
  return `<section><h1>Productor(a): ${esc(prod.basic.name)}</h1><p><b>Contacto:</b> ${esc(prod.basic.celular)}</p><p><b>Ubicación:</b> ${esc([prod.basic.localidad, prod.basic.municipio, prod.basic.estado].filter(Boolean).join(", "))}</p><p><b>Horario:</b> ${esc(prod.basic.horario)}</p><p><b>Horario semanal:</b> ${esc(formatWeeklySchedule(prod.basic.weeklySchedule || {}))}</p><p><b>Clasificación:</b> ${esc(prod.classification?.value)} · <b>Alerta:</b> ${esc(prod.classification?.alerta)} · <b>Nota extra:</b> ${esc(prod.classification?.notaExtraPersona)}</p>${imageHtml(prod.photo, "Foto productor(a)")}<h2>Datos básicos completos</h2>${objectEntriesTable(prod.basic || {})}<h2>Ubicación</h2>${objectEntriesTable(prod.location || {})}<h2>Familia</h2><table><tr><th>Nombre</th><th>Parentesco</th><th>Edad</th><th>Ocupación</th></tr>${(prod.family || []).map((f) => `<tr><td>${esc(f.name)}</td><td>${esc(f.relation)}</td><td>${esc(f.age)}</td><td>${esc(f.occupation)}</td></tr>`).join("")}</table><h2>Animales</h2>${(prod.animals || []).map((a) => `<div><h3>${esc(animalLabel(a))}</h3>${objectEntriesTable({ ...a, owner: displayAnimalPeople(a.owner || []).join(", "), decideSale: displayAnimalPeople(a.decideSale || []).join(", "), feedClean: displayAnimalPeople(a.feedClean || []).join(", "), function: (a.function || []).join(", ") })}${(a.photos || []).map((src, i) => imageHtml(src, `Animal ${i + 1}`)).join("")}</div>`).join("")}<h2>Cuestionario de animales</h2><h3>17. ¿Qué importancia tienen los animales para la vida de su familia?</h3><p>${esc(q.A6 || "")}</p><h3>18. ¿Algún o algunos de sus animales tiene un valor emocional para usted o alguien de su familia?</h3><p>${esc(q.A7 || "")}</p>${objectEntriesTable({ ...q, traditional: `${q.traditional.length} registro(s)` })}<h3>Enfermedades registradas</h3>${diseaseRecordsTable(q.diseases || [])}<h3>Programas registrados</h3>${programsTable(q.programs || [])}<h3>VIII. Interés en aves</h3><p><b>Pregunta mostrada:</b> ${esc(birdInterestPrompt(producerHasRegisteredBirds(prod)))}</p><p><b>Escala visible:</b> 1 = Nada · 2 = Poco · 3 = Regular · 4 = Mucho</p><p><b>Respuesta capturada:</b> ${esc(q.birdsInterest || "")}</p><h3>Medicina tradicional</h3>${traditionalRemediesTable(q.traditional || [])}<h3>Animales que cuidan hombres y mujeres</h3>${genderAnimalsTable(q.genderAnimals || [])}<h3>Actividades que hacen normalmente hombres y mujeres</h3>${genderActivitiesTable(q.genderActivities || [])}<h2>Notas</h2><p>${esc(prod.notes)}</p></section>`;
}
function producerWordHtml(prod) {
  return fullProducerSection(prod);
}
function medSummaryHtml() {
  return `<h1>Medicamentos</h1>${state.meds
    .map((m) => `<section><h2>${esc(m.brand)} · ${esc(m.active)}</h2><p><b>Propiedad:</b> ${esc(medOwnerLabel(m.owner))}</p><p><b>Tipo de inventario:</b> ${esc(m.stockType === "USADO" ? "Usado" : "Nuevo")}</p><p><b>Modo de cálculo:</b> ${esc(usesStructuredConcentration(m) ? "Con concentración estructurada" : "Solo dosis terapéutica por especie")}</p>${m.stockType === "USADO" ? `<p><b>Registro usado:</b> Traía ${esc(m.stockMeta?.originalQty)} ${esc(m.unit)}, costó ${money(m.stockMeta?.originalCost)} y actualmente queda ${esc(m.stockMeta?.remainingQty)} ${esc(m.unit)}.</p>` : ""}<p><b>Presentación:</b> ${esc(m.presentation)}</p><p><b>Caducidad:</b> ${esc(m.expiry)}</p><p><b>Contenido por presentación:</b> ${esc(m.contentPerPresentation || "")} ${esc(m.unit)} · <b>Número de presentaciones:</b> ${esc(m.packageCount || 1)}</p><p><b>Concentración/equivalencia:</b> ${esc(usesStructuredConcentration(m) ? (medicationConcentrationSummary(m) || "Sin captura") : "No aplica (solo dosis terapéutica)")}</p><p><b>Existencia total calculada:</b> ${esc(m.totalQty)} ${esc(m.unit)} · <b>Disponible:</b> ${esc(medRemaining(m))} ${esc(m.unit)}</p><p><b>Costo por presentación:</b> ${money(m.cost)} · <b>Costo unitario:</b> ${money(m.unitCost)} · <b>Vía de administración:</b> ${esc(m.route || "Sin vía de administración registrada")}</p><h3>Dosis estructurada por especie</h3><table><tr><th>Especie</th><th>Cantidad</th><th>Unidad</th><th>Por cada</th><th>Vía</th><th>Frecuencia</th><th>Duración</th><th>Observaciones</th></tr>${(m.speciesDoses || []).map((row) => { const d = normalizeDoseRow(row); return `<tr><td>${esc(d.species)}</td><td>${esc(d.dose)}</td><td>${esc(d.doseUnit)}</td><td>${esc(d.porCada)} ${esc(d.unitBase)}</td><td>${esc(d.route)}</td><td>${esc(d.frequency)}</td><td>${esc(d.duration)}</td><td>${esc(d.notes)}</td></tr>`; }).join("")}</table><h3>Ficha clínica</h3>${objectEntriesTable(m.clinical || {})}${imageHtml(m.photos?.rx, "Receta")}${imageHtml(m.photos?.ticket, "Ticket")}</section>`).join('<div style="page-break-after:always"></div>')}`;
}
function supplySummaryHtml() {
  return `<h1>Insumos</h1>${state.supplies.map((s) => `<section><h2>${esc(s.name)}</h2><p><b>Tipo:</b> ${esc(s.type)}</p><p><b>Disponibilidad:</b> ${esc(supplyRemaining(s))}</p><p><b>${s.type === "NON_DISPOSABLE" ? "Costo por uso" : "Costo unitario real"}:</b> ${money(supplyDisplayCost(s))}</p>${objectEntriesTable(s)}${imageHtml(s.ticket, "Ticket insumo")}</section>`).join('<div style="page-break-after:always"></div>')}`;
}
function procedureWordHtml(p) {
  const prod = byId(state.producers, p.producerId);
  const animal = (prod?.animals || []).find((a) => a.id === p.animalId);
  const labs = state.labTests.filter((l) => (p.labIds || []).includes(l.id));
  return `<h1>Procedimiento ${esc(p.type)}</h1><p><b>Fecha:</b> ${esc(p.date)}</p><p><b>Productor(a):</b> ${esc(procedureProducerName(p))}</p><p><b>Animal:</b> ${esc(animal ? animalLabel(animal) : p.identification)}</p><p><b>Notas:</b> ${esc(p.notes)}</p><h2>Datos generales</h2>${objectEntriesTable({ fecha: p.date, tipo: p.type, alcance: p.scope, lugar: p.place, productor: procedureProducerName(p), animal: animal ? animalLabel(animal) : p.identification, cantidad_animales: p.animalsQtyUsed, especie: p.species, identificacion: p.identification, peso: p.weight, temperatura: p.temperature, estado_cobro: p.chargeStatus, notas_cobro: p.chargeNotes, notas_generales: p.notes })}<h2>Inventario usado</h2><table><tr><th>Tipo</th><th>Nombre</th><th>Cantidad</th><th>Costo</th><th>Notas</th></tr>${(p.inventory?.meds || []).map((i) => `<tr><td>Medicamento</td><td>${esc(i.name)}</td><td>${esc(i.qty)} ${esc(i.unit || "")}</td><td>${money(Number(i.qty || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.owner || "")}</td></tr>`).join("")}${(p.inventory?.vaccines || []).map((i) => `<tr><td>Vacuna</td><td>${esc(i.name)}</td><td>${esc(i.animalsApplied)} animales</td><td>${money(Number(i.animalsApplied || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.notes || "")}</td></tr>`).join("")}${(p.inventory?.supplies || []).map((i) => `<tr><td>Insumo</td><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${money(Number(i.qty || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.notes || "")}</td></tr>`).join("")}</table><h2>Caso clínico</h2>${objectEntriesTable(p.caseClinical || {})}<h2>Necropsia</h2>${objectEntriesTable(p.necropsy || {})}<h2>Atención clínica / zootécnica</h2>${objectEntriesTable(p.zootecnia || {})}<h2>Pruebas vinculadas</h2><table><tr><th>Tipo</th><th>Fecha</th><th>Animal</th><th>Resultado</th><th>Interpretación</th><th>Observaciones</th></tr>${labs.map((l) => `<tr><td>${esc(l.type)}</td><td>${esc(l.date)}</td><td>${esc(l.animal)}</td><td>${esc(l.result)}</td><td>${esc(l.interpretation)}</td><td>${esc(l.notes)}</td></tr>`).join("")}</table>${labs.map((l, idx) => imageHtml(l.file, `Archivo prueba ${idx + 1}`)).join("")}<h2>Cobro y evidencia</h2>${objectEntriesTable({ procedimiento: money(p.charge?.base), medicamentos: money(p.charge?.meds), vacunas: money(p.charge?.vaccines), insumos: money(p.charge?.supplies), subtotal: money(p.charge?.subtotal), total: money(p.charge?.total), monto_final: money(p.charge?.manual), estatus: p.charge?.status, observaciones: p.charge?.reason || p.charge?.notes })}${(p.caseClinical?.photos || []).map((src, i) => imageHtml(src, `Caso clínico ${i + 1}`)).join("")}${(p.necropsy?.photos || []).map((src, i) => imageHtml(src, `Necropsia ${i + 1}`)).join("")}${imageHtml(p.charge?.photo, "Evidencia de cobro")}`;
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
        ["Productor(a)", "Especie", "Raza", "Cantidad", "¿De quién son?", "¿Quién decide si se venden?", "¿Quién limpia/alimenta?", "Función", "Extra"],
        ...animalRows.map((a) => [
          a.producer || producerName(state.selectedProducerId),
          a.species,
          a.breed,
          a.quantity,
          displayAnimalPeople(a.owner || []).join(", "),
          displayAnimalPeople(a.decideSale || []).join(", "),
          displayAnimalPeople(a.feedClean || []).join(", "),
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
          "Contenido por presentación",
          "No. presentaciones/envases",
          "Existencia total",
          "Unidad",
          "Disponible",
          "Costo por presentación",
          "Costo unitario",
          "Vía administración",
          "Modo cálculo",
          "Concentración",
        ],
        ...meds.map((m) => [
          m.brand,
          m.active,
          medOwnerLabel(m.owner),
          m.contentPerPresentation || "",
          m.packageCount || 1,
          m.totalQty,
          m.unit,
          medRemaining(m),
          m.cost,
          m.unitCost,
          m.route || "Sin vía de administración registrada",
          usesStructuredConcentration(m) ? "Con concentración estructurada" : "Solo dosis terapéutica por especie",
          usesStructuredConcentration(m) ? (medicationConcentrationSummary(m) || "Sin captura") : "No aplica (solo dosis terapéutica)",
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
          procedureProducerName(p),
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
  ensureSelectedProducerIntegrity();
  renderProducerList();
  renderAnimalsProducerSelect();
  renderAnimalPeopleSelects();
  renderAnimalBasedSelects();
  renderAnimalGroups();
  fillAnimalQuestionnaire();
  renderMedList();
  renderVaccineList();
  renderSupplyList();
  renderLabProducerSelect();
  renderLabProcedureSelect();
  renderLabSupplyList();
  renderLabImagePreview();
  renderLabListStandalone();
  renderProcedureProducerSelect();
  renderProcedureAnimalSelect();
  populateInventorySelects();
  renderProcedureDraftLists();
  renderProcedureList();
  reconcileAnaRosaDebtFromProcedures();
  renderAnaRosaDebtSidebar();
}

function bindGlobal() {
  $("#btnExportAllWord")?.addEventListener("click", () =>
    exportWord(
      "app_rural_resumen.doc",
      `<h1>Resumen App Rural</h1>${state.producers.map(fullProducerSection).join('<div style="page-break-after:always"></div>')}<div style="page-break-after:always"></div>${medSummaryHtml()}<div style="page-break-after:always"></div>${vaccineSummaryHtml()}<div style="page-break-after:always"></div>${supplySummaryHtml()}<div style="page-break-after:always"></div>${labSummaryHtml()}<div style="page-break-after:always"></div>${procedureSummaryHtml()}`,
    ),
  );
  $("#btnExportAllExcel")?.addEventListener("click", () =>
    exportExcel("app_rural_resumen.xls", producerExcelSheets()),
  );
  $("#btnBackupJson")?.addEventListener("click", () =>
    (() => {
      const imageMap = {};
      const data = cloneStateWithImageRefs(state, imageMap);
      const payload = {
        format: "app-rural-full-backup",
        version: 2,
        exportedAt: new Date().toISOString(),
        data,
        imageMap,
      };
      download(`app_rural_backup_completo_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
      showFloatingNotice("Respaldo JSON completo generado (datos e imágenes en un solo archivo).");
    })(),
  );
  $("#btnRestoreJsonInput")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = async () => {
      try {
        const parsed = JSON.parse(fr.result);
        const restored = parsed?.format === "app-rural-full-backup"
          ? restoreStateImageRefs(parsed.data || {}, parsed.imageMap || {})
          : restoreStateImageRefs(parsed, {});
        Object.assign(state, restored);
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
  $("#btnDownloadImages")?.addEventListener("click", async () => {
    try {
      const result = await exportUploadedImagesZip(state);
      showFloatingNotice(`Descarga completada: ${result.total} imagen(es) en ZIP.`);
    } catch (error) {
      alert(error.message || "No se pudieron descargar las imágenes.");
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
  bindLabStandalone();
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

function normalizeSpeciesName(species = "") {
  return normalizeSpeciesRef(species);
}
function speciesAliasTokens(species = "") {
  const ref = normalizeSpeciesRef(species);
  if (!ref) return [];
  const aliasMap = [
    { pattern: /(bovin|vaca|vacuno|toro|res|ganado bovino)/, aliases: ["bovino", "bovinos", "vaca", "vacas", "toro", "toros", "ganado bovino"] },
    { pattern: /(equin|caball|yegua|potro)/, aliases: ["equino", "equinos", "caballo", "caballos", "yegua", "yeguas"] },
    { pattern: /(caprin|cabra|chivo)/, aliases: ["caprino", "caprinos", "cabra", "cabras", "chivo", "chivos"] },
    { pattern: /(ovin|borreg|oveja|corder)/, aliases: ["ovino", "ovinos", "borrego", "borregos", "oveja", "ovejas", "cordero", "corderos"] },
    { pattern: /(canin|perr)/, aliases: ["canino", "caninos", "perro", "perros"] },
    { pattern: /(felin|gat)/, aliases: ["felino", "felinos", "gato", "gatos"] },
    { pattern: /(porcin|cerd|puerc)/, aliases: ["porcino", "porcinos", "cerdo", "cerdos", "puerco", "puercos"] },
    { pattern: /(aviar|ave|gallin|pollo|pato|guajolote)/, aliases: ["ave", "aves", "aviar", "gallina", "gallinas", "pollo", "pollos", "pato", "patos", "guajolote", "guajolotes"] },
  ];
  for (const group of aliasMap) {
    if (group.pattern.test(ref)) return [...new Set([ref, ...group.aliases.map(normalizeSpeciesRef)])];
  }
  return [ref];
}
function speciesMatchesDose(species = "", configuredSpecies = "") {
  const speciesTokens = speciesAliasTokens(species);
  const configuredTokens = speciesAliasTokens(configuredSpecies);
  return speciesTokens.some((token) => configuredTokens.includes(token));
}
function isHorseOrCattleSpecies(species = "") {
  return /caball|equin|yegua|vaca|bovin|toro/.test(normalizeSpeciesRef(species));
}
function getWeightMethodOptions(species = "") {
  const normalized = normalizeSpeciesName(species);
  if (/caball|equin|yegua/.test(normalized) || /vaca|bovin|toro/.test(normalized)) {
    return [
      { value: "BASCULA", label: "Báscula" },
      { value: "CINTA_ESPECIAL", label: "Cinta especial" },
    ];
  }
  if (/borreg|oveja|cabra|chivo/.test(normalized)) {
    return [
      { value: "BASCULA", label: "Báscula" },
      { value: "CINTA", label: "Cinta" },
    ];
  }
  return [{ value: "MANUAL", label: "Registro manual" }];
}
function usesTapeFormula(species = "", method = "") {
  return /borreg|oveja|cabra|chivo/.test(normalizeSpeciesName(species)) && method === "CINTA";
}
function calculateTapeWeight(pt, lc) {
  const chest = Number(pt || 0);
  const length = Number(lc || 0);
  if (!chest || !length) return 0;
  return (chest * chest * length) / 10838;
}
function getProcedureAnimalMedicationSummary(entry) {
  const med = byId(state.meds, entry.medicationId);
  const profile = med ? getMedicationDoseProfile(med, entry.species) : null;
  const mode = profile?.calculationMode || "PER_KG";
  const weight = Number(entry.weightRecordedKg || 0);
  const volumeLiters = Number(entry.doseVolumeLiters || 0);
  const baseDose = Number(profile?.dose || 0);
  const porCada = Number(profile?.porCada || 1) || 1;
  const individualMode = !isGroupMedicationMode();
  const incompatibleIndividualMode = individualMode && mode === "PER_LITER";
  const basisValue = mode === "PER_ANIMAL" ? 1 : mode === "PER_LITER" || mode === "PER_KG_FEED" ? volumeLiters : weight;
  const basisLabel = mode === "PER_ANIMAL"
    ? "Base aplicada: 1 animal"
    : mode === "PER_LITER"
      ? `Base aplicada: ${Number(volumeLiters || 0).toFixed(2)} L`
      : mode === "PER_KG_FEED"
        ? `Base aplicada: ${Number(volumeLiters || 0).toFixed(2)} kg alimento`
        : `Peso del animal: ${Number(weight || 0).toFixed(2)} kg`;
  const theoreticalDoseTotal = profile
    ? mode === "PER_ANIMAL"
      ? baseDose * (basisValue / porCada)
      : incompatibleIndividualMode
        ? 0
        : baseDose * (basisValue / porCada)
    : 0;
  const missingWeight = profile && mode === "PER_KG" && weight <= 0;
  const missingVolume = profile && ["PER_LITER", "PER_KG_FEED"].includes(mode) && basisValue <= 0;
  const converted = med && profile
    ? calculateConvertedMedicationDose({
      med,
      theoreticalQty: theoreticalDoseTotal,
      theoreticalUnit: profile?.doseUnit || med?.unit || "",
      rule: mode,
      basisValue,
      basisLabel,
    })
    : null;
  const warning = med
    ? !profile
      ? `Falta definir la dosis de ${med.brand} para la especie ${entry.species || "seleccionada"} en el módulo de medicamentos.`
      : incompatibleIndividualMode
        ? `${med.brand} usa regla por litro y no aplica para dosificación individual por animal.`
      : missingWeight
        ? `Captura un peso válido para calcular automáticamente ${med.brand}.`
        : missingVolume
          ? `Captura un volumen/base válido para calcular automáticamente ${med.brand}.`
          : converted?.warning
            ? converted.warning
        : ""
    : "";
  return {
    med,
    profile,
    mode,
    baseDose,
    unit: profile?.doseUnit || med?.unit || "",
    theoreticalDoseTotal: Number(theoreticalDoseTotal.toFixed(4)),
    convertedDoseQty: Number((converted?.convertedQty || theoreticalDoseTotal || 0).toFixed(4)),
    convertedDoseUnit: converted?.convertedUnit || profile?.doseUnit || med?.unit || "",
    requiredActiveQty: Number((converted?.requiredActiveQty || 0).toFixed(4)),
    requiredActiveUnit: converted?.requiredActiveUnit || "",
    conversionApplied: Boolean(converted?.conversionApplied),
    conversionExplanation: converted?.explanation || "",
    indication: profile?.indication || "",
    frequency: profile?.frequency || "",
    duration: profile?.duration || "",
    observations: profile?.notes || "",
    warning,
    summary: med
      ? profile
        ? speciesDoseSummary(profile)
        : `Falta dosis por especie para ${entry.species || "este animal"}`
      : "",
  };
}
function createProcedureAnimalEntry(baseAnimal = {}, extra = {}) {
  const species = extra.species || baseAnimal.species || $("#p_species")?.value || "";
  const identification = extra.identification || baseAnimal.identification || baseAnimal.breed || animalLabel(baseAnimal) || "";
  const methodOptions = getWeightMethodOptions(species);
  const weightMethod = extra.weightMethod || methodOptions[0]?.value || "MANUAL";
  const weight = Number((extra.weight ?? baseAnimal.weight ?? $("#p_weight")?.value) || 0) || 0;
  const chestGirth = Number(extra.chestGirth || 0) || 0;
  const bodyLength = Number(extra.bodyLength || 0) || 0;
  const estimatedWeight = Number(extra.estimatedWeight || (usesTapeFormula(species, weightMethod) ? calculateTapeWeight(chestGirth, bodyLength) : weight)) || 0;
  return {
    id: extra.id || uid("pan"),
    animalId: extra.animalId || baseAnimal.id || "",
    sourceLabel: extra.sourceLabel || animalLabel(baseAnimal) || identification,
    identification,
    species,
    age: extra.age || baseAnimal.age || "",
    sex: extra.sex || baseAnimal.sex || "",
    procedureReason: extra.procedureReason || extra.reason || "",
    weightMethod,
    weight,
    chestGirth,
    bodyLength,
    estimatedWeight,
    weightRecordedKg: Number(extra.weightRecordedKg || estimatedWeight || weight || 0) || 0,
    notes: extra.notes || "",
    generalState: extra.generalState || "",
    medicationId: extra.medicationId || "",
    doseReferenceMedicationId: extra.doseReferenceMedicationId || extra.medicationId || "",
    vaccineId: extra.vaccineId || "",
    doseUnit: extra.doseUnit || "",
    doseSummary: extra.doseSummary || "",
    doseBase: Number(extra.doseBase || 0) || 0,
    doseCalculationMode: extra.doseCalculationMode || "",
    medicationName: extra.medicationName || "",
    medicationWarning: extra.medicationWarning || "",
    manualDoseAdjusted: Boolean(extra.manualDoseAdjusted),
    manualDoseAdjustmentReason: extra.manualDoseAdjustmentReason || "",
    suggestedDoseQty: Number(extra.suggestedDoseQty || 0) || 0,
    suggestedDoseUnit: extra.suggestedDoseUnit || "",
    suggestedInventoryDeductionQty: Number(extra.suggestedInventoryDeductionQty || 0) || 0,
    suggestedInventoryDeductionUnit: extra.suggestedInventoryDeductionUnit || "",
    inventoryDeductionQty: Number(extra.inventoryDeductionQty || 0) || 0,
    inventoryDeductionUnit: extra.inventoryDeductionUnit || "",
    convertedDoseQty: Number(extra.convertedDoseQty || 0) || 0,
    convertedDoseUnit: extra.convertedDoseUnit || "",
    requiredActiveQty: Number(extra.requiredActiveQty || 0) || 0,
    requiredActiveUnit: extra.requiredActiveUnit || "",
    conversionApplied: Boolean(extra.conversionApplied),
    conversionExplanation: extra.conversionExplanation || "",
    examIncluded: Boolean(extra.examIncluded),
    exam: {
      temperature: extra.exam?.temperature || "",
      generalState: extra.exam?.generalState || "",
      findings: extra.exam?.findings || "",
    },
    theoreticalDoseTotal: Number(extra.theoreticalDoseTotal || 0) || 0,
    doseVolumeLiters: Number(extra.doseVolumeLiters || 0) || 0,
    medicationsApplied: Array.isArray(extra.medicationsApplied)
      ? extra.medicationsApplied.map((item) => ({ ...item }))
      : [],
    vaccinesApplied: Array.isArray(extra.vaccinesApplied)
      ? extra.vaccinesApplied.map((item) => ({ ...item }))
      : [],
    suppliesApplied: Array.isArray(extra.suppliesApplied)
      ? extra.suppliesApplied.map((item) => ({ ...item }))
      : [],
    supplyId: extra.supplyId || "",
    supplyQty: Number(extra.supplyQty || 0) || 0,
    supplyUnit: extra.supplyUnit || "",
    supplyPriceCharged: extra.supplyPriceCharged ?? "",
    supplyNotes: extra.supplyNotes || "",
    medicationPriceCharged: extra.medicationPriceCharged ?? "",
  };
}
function normalizeEntryMedicationApplied(entry = {}) {
  if (!Array.isArray(entry.medicationsApplied)) entry.medicationsApplied = [];
  if (!entry.medicationsApplied.length && entry.medicationId) {
    const med = byId(state.meds, entry.medicationId);
    entry.medicationsApplied.push({
      id: uid("amed"),
      medicationId: entry.medicationId || "",
      medicationName: entry.medicationName || med?.brand || "",
      speciesDetected: entry.species || "",
      doseBase: Number(entry.doseBase || 0) || 0,
      doseUnit: entry.doseUnit || "",
      rule: entry.doseCalculationMode || "",
      requiredDose: Number(entry.theoreticalDoseTotal || 0) || 0,
      calculatedSuggestion: Number(entry.suggestedDoseQty || 0) || 0,
      calculatedSuggestionUnit: entry.suggestedDoseUnit || "",
      finalAppliedAmount: Number(entry.convertedDoseQty || 0) || 0,
      finalUnit: entry.convertedDoseUnit || entry.suggestedDoseUnit || "",
      indication: entry.doseIndication || "",
      route: med?.route || "",
      frequency: entry.doseFrequency || "",
      duration: entry.doseDuration || "",
      observations: entry.doseObservations || "",
      concentrationSummary: usesStructuredConcentration(med) ? (medicationConcentrationSummary(med) || "") : "Modo sin concentración estructurada",
      expiryDate: med?.expiry || "",
      expiryStatus: medicationExpiryInfo(med?.expiry || "").text,
      inventoryDiscount: Number(entry.inventoryDeductionQty || 0) || 0,
      inventoryDiscountUnit: entry.inventoryDeductionUnit || med?.unit || "",
      manualAdjustment: Boolean(entry.manualDoseAdjusted),
      notes: entry.notes || "",
      conversionExplanation: entry.conversionExplanation || "",
    });
  }
  return entry;
}
function addMedicationAppliedToEntry(entry) {
  if (!entry?.medicationId) return false;
  syncProcedureAnimalSummary(entry);
  if (entry.medicationWarning) return false;
  const med = byId(state.meds, entry.medicationId);
  const suggestedCost = Number(entry.inventoryDeductionQty || 0) * Number(med?.unitCost || 0);
  entry.medicationsApplied.push({
    id: uid("amed"),
    medicationId: entry.medicationId || "",
    medicationName: entry.medicationName || med?.brand || "",
    speciesDetected: entry.species || "",
    doseBase: Number(entry.doseBase || 0) || 0,
    doseUnit: entry.doseUnit || "",
    rule: entry.doseCalculationMode || "",
    requiredDose: Number(entry.theoreticalDoseTotal || 0) || 0,
    calculatedSuggestion: Number(entry.suggestedDoseQty || 0) || 0,
    calculatedSuggestionUnit: entry.suggestedDoseUnit || "",
    finalAppliedAmount: Number(entry.convertedDoseQty || 0) || 0,
    finalUnit: entry.convertedDoseUnit || entry.suggestedDoseUnit || "",
    indication: entry.doseIndication || "",
    route: med?.route || "",
    frequency: entry.doseFrequency || "",
    duration: entry.doseDuration || "",
    observations: entry.doseObservations || "",
    concentrationSummary: usesStructuredConcentration(med) ? (medicationConcentrationSummary(med) || "") : "Modo sin concentración estructurada",
    expiryDate: med?.expiry || "",
    expiryStatus: medicationExpiryInfo(med?.expiry || "").text,
    inventoryDiscount: Number(entry.inventoryDeductionQty || 0) || 0,
    inventoryDiscountUnit: entry.inventoryDeductionUnit || med?.unit || "",
    costSuggested: Number(entry.inventoryDeductionQty || 0) * Number(med?.unitCost || 0),
    priceCharged: entry.medicationPriceCharged === "" || entry.medicationPriceCharged == null ? Number(entry.inventoryDeductionQty || 0) * Number(med?.unitCost || 0) : Number(entry.medicationPriceCharged || 0),
    manualAdjustment: Boolean(entry.manualDoseAdjusted),
    notes: entry.notes || "",
    conversionExplanation: entry.conversionExplanation || "",
  });
  entry.medicationId = "";
  entry.medicationName = "";
  entry.doseReferenceMedicationId = "";
  entry.medicationWarning = "";
  entry.doseUnit = "";
  entry.doseSummary = "";
  entry.doseBase = 0;
  entry.doseCalculationMode = "";
  entry.dosePorCada = 1;
  entry.doseUnitBase = "";
  entry.doseIndication = "";
  entry.doseRoute = "";
  entry.doseFrequency = "";
  entry.doseDuration = "";
  entry.doseObservations = "";
  entry.theoreticalDoseTotal = 0;
  entry.suggestedDoseQty = 0;
  entry.suggestedDoseUnit = "";
  entry.convertedDoseQty = 0;
  entry.convertedDoseUnit = "";
  entry.inventoryDeductionQty = 0;
  entry.inventoryDeductionUnit = "";
  entry.suggestedInventoryDeductionQty = 0;
  entry.suggestedInventoryDeductionUnit = "";
  entry.requiredActiveQty = 0;
  entry.requiredActiveUnit = "";
  entry.conversionApplied = false;
  entry.conversionExplanation = "";
  entry.manualDoseAdjusted = false;
  entry.manualDoseAdjustmentReason = "";
  entry.medicationPriceCharged = "";
  return true;
}
function addVaccineAppliedToEntry(entry) {
  const vaccine = byId(state.vaccines, entry?.vaccineId || "");
  if (!vaccine) return false;
  if (!Array.isArray(entry.vaccinesApplied)) entry.vaccinesApplied = [];
  const unitCost = Number(vaccine.unitCost || (vaccine.coverageAnimals ? Number(vaccine.price || 0) / Number(vaccine.coverageAnimals || 1) : 0));
  entry.vaccinesApplied.push({
    id: uid("avax"),
    itemId: vaccine.id,
    name: vaccine.brand,
    animalsApplied: 1,
    unitCost,
    owner: vaccine.owner || "SERVICIOS",
    costSuggested: unitCost,
    priceCharged: entry.medicationPriceCharged === "" || entry.medicationPriceCharged == null ? unitCost : Number(entry.medicationPriceCharged || 0),
    notes: entry.notes || "",
  });
  entry.vaccineId = "";
  return true;
}
function addSupplyAppliedToEntry(entry) {
  const supply = byId(state.supplies, entry?.supplyId || "");
  const qty = Number(entry?.supplyQty || 0);
  if (!supply || qty <= 0) return false;
  const unitCost = supplyDisplayCost(supply);
  const costSuggested = qty * unitCost;
  if (!Array.isArray(entry.suppliesApplied)) entry.suppliesApplied = [];
  entry.suppliesApplied.push({
    id: uid("asup"),
    itemId: supply.id,
    name: supply.name,
    qty,
    unit: entry.supplyUnit || (supply.type === "NON_DISPOSABLE" ? "usos" : "pzas"),
    type: supply.type,
    owner: supply.owner || "SERVICIOS",
    unitCost,
    costSuggested,
    priceCharged: entry.supplyPriceCharged === "" || entry.supplyPriceCharged == null ? costSuggested : Number(entry.supplyPriceCharged || 0),
    notes: entry.supplyNotes || "",
  });
  entry.supplyId = "";
  entry.supplyQty = 0;
  entry.supplyUnit = "";
  entry.supplyPriceCharged = "";
  entry.supplyNotes = "";
  return true;
}
function syncProcedureAnimalManualDoseFlags(entry) {
  const suggested = Number(entry.suggestedDoseQty || 0);
  const finalQty = Number(entry.convertedDoseQty || 0);
  const sameUnit = canonicalUnit(entry.convertedDoseUnit || "") === canonicalUnit(entry.suggestedDoseUnit || "");
  const changedQty = Math.abs(finalQty - suggested) > 0.0001;
  entry.manualDoseAdjusted = Boolean(entry.medicationId) && (changedQty || !sameUnit);
  if (!entry.manualDoseAdjusted) entry.manualDoseAdjustmentReason = "";
}
function syncProcedureAnimalSummary(entry) {
  entry.estimatedWeight = usesTapeFormula(entry.species, entry.weightMethod)
    ? calculateTapeWeight(entry.chestGirth, entry.bodyLength)
    : Number(entry.estimatedWeight || 0);
  entry.weightRecordedKg = Number(
    usesTapeFormula(entry.species, entry.weightMethod)
      ? entry.estimatedWeight
      : entry.weight || entry.estimatedWeight || 0,
  ) || 0;
  const medSummary = getProcedureAnimalMedicationSummary(entry);
  if ((entry.doseReferenceMedicationId || "") !== (entry.medicationId || "")) {
    entry.manualDoseAdjusted = false;
    entry.doseReferenceMedicationId = entry.medicationId || "";
  }
  entry.theoreticalDoseTotal = medSummary.theoreticalDoseTotal;
  entry.doseUnit = medSummary.unit;
  entry.doseSummary = medSummary.summary;
  entry.doseBase = medSummary.baseDose;
  entry.doseCalculationMode = medSummary.mode;
  entry.dosePorCada = medSummary.profile?.porCada || 1;
  entry.doseUnitBase = medSummary.profile?.unitBase || doseRuleDenominator(medSummary.mode);
  entry.doseIndication = medSummary.indication || "";
  entry.doseRoute = medSummary.med?.route || "";
  entry.doseFrequency = medSummary.frequency || "";
  entry.doseDuration = medSummary.duration || "";
  entry.doseObservations = medSummary.observations || "";
  entry.medicationName = medSummary.med?.brand || "";
  entry.medicationWarning = medSummary.warning || "";
  entry.suggestedDoseQty = Number(medSummary.convertedDoseQty || medSummary.theoreticalDoseTotal || 0);
  entry.suggestedDoseUnit = medSummary.convertedDoseUnit || medSummary.unit;
  entry.requiredActiveQty = medSummary.requiredActiveQty || 0;
  entry.requiredActiveUnit = medSummary.requiredActiveUnit || "";
  entry.conversionApplied = Boolean(medSummary.conversionApplied);
  entry.conversionExplanation = medSummary.conversionExplanation || "";
  if (!entry.manualDoseAdjusted) {
    entry.convertedDoseQty = entry.suggestedDoseQty;
    entry.convertedDoseUnit = entry.suggestedDoseUnit;
  } else if (!entry.convertedDoseUnit) {
    entry.convertedDoseUnit = entry.suggestedDoseUnit;
  }
  const medInventoryUnit = canonicalUnit(medSummary.med?.unit || "");
  const suggestedInventoryQty = convertCompatibleUnits(
    entry.suggestedDoseQty,
    entry.suggestedDoseUnit,
    medInventoryUnit || entry.suggestedDoseUnit,
  );
  entry.suggestedInventoryDeductionQty = Number((suggestedInventoryQty != null ? suggestedInventoryQty : entry.suggestedDoseQty || 0).toFixed(4));
  entry.suggestedInventoryDeductionUnit = medInventoryUnit || entry.suggestedDoseUnit || medSummary.unit;
  const convertedInventoryQty = convertCompatibleUnits(
    entry.convertedDoseQty,
    entry.convertedDoseUnit,
    medInventoryUnit || entry.convertedDoseUnit,
  );
  entry.inventoryDeductionQty = Number((convertedInventoryQty != null ? convertedInventoryQty : entry.convertedDoseQty || medSummary.theoreticalDoseTotal).toFixed(4));
  entry.inventoryDeductionUnit = medInventoryUnit || entry.convertedDoseUnit || medSummary.unit;
  syncProcedureAnimalManualDoseFlags(entry);
  return entry;
}
function animalRegisteredQuantity(animal = {}) {
  return Number(animal.quantity ?? animal.cantidad ?? animal.total ?? animal.count ?? 0) || 0;
}
function selectedProcedureSpeciesAnimal() {
  const animals = currentAnimals();
  const scope = $("#p_scope")?.value || "INDIVIDUAL";
  const groupSelected = byId(animals, $("#p_groupAnimalBase")?.value || "");
  const individualSelected = byId(animals, $("#p_animalGroup")?.value || "");
  return scope === "GRUPAL" ? (groupSelected || individualSelected) : (individualSelected || groupSelected);
}
function updateProcedureProducerAnimalTotal() {
  const selectedAnimal = selectedProcedureSpeciesAnimal();
  if ($("#p_totalProducerAnimals")) $("#p_totalProducerAnimals").value = selectedAnimal ? animalRegisteredQuantity(selectedAnimal) : "";
  if ($("#p_groupDetectedSpecies")) $("#p_groupDetectedSpecies").value = selectedAnimal?.species || "";
}
function renderProcedureAnimalSelect() {
  const prod = byId(
    state.producers,
    $("#p_producer").value || state.selectedProducerId,
  );
  const animals = prod?.animals || [];
  const sel = $("#p_animalGroup");
  const groupSel = $("#p_groupAnimalBase");
  const clinicalSel = $("#p_cc_registeredAnimal");
  const options =
    '<option value="">— Selecciona —</option>' +
    animals
      .map((a) => `<option value="${a.id}">${esc(animalLabel(a))}</option>`)
      .join("");
  [sel, groupSel, clinicalSel].forEach((target) => {
    if (!target) return;
    const prev = target.value;
    target.innerHTML = options;
    target.value = animals.some((animal) => animal.id === prev) ? prev : "";
  });
  updateProcedureProducerAnimalTotal();
}
function ensureProcedureAnimalEntriesForScope() {
  if (!state.draft.procedureAnimalEntries) state.draft.procedureAnimalEntries = [];
  const scope = $("#p_scope")?.value;
  if (scope !== "INDIVIDUAL" || isGroupMedicationMode()) return;
  const isClinicalCase = $("#p_type")?.value === "CASO_CLINICO";
  if (isClinicalCase) return;
  const selectedAnimal = byId(currentAnimals(), $("#p_animalGroup")?.value);
  if (!selectedAnimal) return;
  const exists = state.draft.procedureAnimalEntries.some((item) => item.animalId === selectedAnimal.id);
  if (state.draft.procedureAnimalEntries.length > 1) {
    state.draft.procedureAnimalEntries = state.draft.procedureAnimalEntries.filter((item) => item.animalId === selectedAnimal.id);
  } else if (state.draft.procedureAnimalEntries.length === 1 && !exists) {
    state.draft.procedureAnimalEntries = [];
  }
}
function getProcedureMedicationApplicationMode() {
  return "INDIVIDUAL_ANIMAL";
}
function isGroupMedicationMode() {
  return getProcedureMedicationApplicationMode() === "GROUP_WATER_FEED";
}
function shouldShowMedicationModeQuestion() {
  return false;
}

function legacyGroupMedicationToProcedureUse(groupMedication = {}) {
  if (!groupMedication?.medicationId) return null;
  const med = byId(state.meds, groupMedication.medicationId) || {};
  const qty = Number(groupMedication.convertedQty || groupMedication.totalQty || 0);
  const unit = groupMedication.convertedUnit || groupMedication.doseUnit || med.unit || "";
  const unitCost = Number(med.unitCost || 0);
  return {
    id: groupMedication.id || uid("pmed"),
    productType: "MEDICAMENTO",
    itemId: groupMedication.medicationId,
    medicationId: groupMedication.medicationId,
    name: groupMedication.medicationName || med.brand || "Medicamento grupal migrado",
    medicationName: groupMedication.medicationName || med.brand || "Medicamento grupal migrado",
    species: groupMedication.species || "",
    doseSource: "LEGACY_GROUP_MIGRATED",
    administrationType: groupMedication.administrationType || "",
    baseAmount: Number(groupMedication.totalVolumeKg || 0),
    baseUnit: groupMedication.rule === "PER_KG_FEED" ? "kg" : groupMedication.rule === "PER_LITER" ? "L" : doseRuleDenominator(groupMedication.rule || "MANUAL"),
    calculationMode: groupMedication.rule || "MANUAL",
    doseBase: Number(groupMedication.doseBase || 0),
    doseUnit: groupMedication.doseUnit || med.unit || "",
    theoreticalQty: Number(groupMedication.totalQty || qty || 0),
    theoreticalUnit: groupMedication.doseUnit || med.unit || "",
    calculatedTotal: Number(groupMedication.totalQty || qty || 0),
    qty,
    totalUsedQty: qty,
    inventoryDeductionQty: qty,
    chargeableQty: qty,
    unit,
    inventoryDeductionUnit: unit,
    unitCost,
    costSuggested: Number((qty * unitCost).toFixed(2)),
    costCharged: Number(groupMedication.costCharged ?? groupMedication.priceCharged ?? (qty * unitCost).toFixed(2)),
    route: groupMedication.administrationType || med.route || "",
    owner: med.owner || "",
    source: "PROCEDURE_MANUAL",
    migratedFrom: "groupMedication",
    calculationSummary: [groupMedication.summary, groupMedication.conversionExplanation, groupMedication.warning].filter(Boolean).join(" · "),
    notes: "Migrado del bloque grupal antiguo; editable en Medicamentos / vacunas / insumos usados.",
  };
}

function calculateGroupMedicationDraft() {
  const entries = (state.draft.procedureAnimalEntries || []).map(syncProcedureAnimalSummary);
  const animalsCount = entries.length || Number($("#p_animalsQtyUsed")?.value || 0);
  const totalWeight = entries.reduce((acc, entry) => acc + Number(entry.weightRecordedKg || 0), 0);
  const totalVolumeKg = Number($("#p_groupTotalVolumeKg")?.value || 0);
  const administrationType = $("#p_groupAdministrationType")?.value || "AGUA";
  const selectedGroupAnimal = byId(currentAnimals(), $("#p_groupAnimalBase")?.value || "");
  const selectedSpecies = selectedGroupAnimal?.species || "";
  if ($("#p_groupDetectedSpecies")) $("#p_groupDetectedSpecies").value = selectedSpecies;
  const med = byId(state.meds, $("#p_groupMedSelect")?.value || "");
  const speciesRef = selectedSpecies || entries[0]?.species || "";
  const profile = med ? getMedicationDoseProfile(med, speciesRef) : null;
  const currentRule = $("#p_groupDoseRule")?.value || "PER_LITER";
  let rule = currentRule;
  if (profile) {
    if (profile.calculationMode === "PER_LITER") rule = "PER_LITER";
    if (profile.calculationMode === "PER_KG") rule = administrationType === "ALIMENTO" ? "PER_KG_FEED" : "PER_KG";
    if (profile.calculationMode === "PER_ANIMAL") rule = "PER_ANIMAL";
    if (administrationType === "AGUA" && rule === "PER_KG_FEED") rule = "PER_LITER";
    if (administrationType === "ALIMENTO" && rule === "PER_LITER") rule = "PER_KG_FEED";
  } else if (administrationType === "AGUA" && rule === "PER_KG_FEED") {
    rule = "PER_LITER";
  } else if (administrationType === "ALIMENTO" && rule === "PER_LITER") {
    rule = "PER_KG_FEED";
  }
  if ($("#p_groupDoseRule")) {
    $("#p_groupDoseRule").value = rule;
    $("#p_groupDoseRule").disabled = Boolean(profile);
  }
  const autoDoseBase = Number(profile?.dose || 0);
  const dosePorCada = Number(profile?.porCada || 1) || 1;
  const doseBaseInput = $("#p_groupDoseBase");
  if (doseBaseInput && autoDoseBase > 0) doseBaseInput.value = autoDoseBase;
  const doseBase = autoDoseBase > 0 ? autoDoseBase : Number(doseBaseInput?.value || 0);
  const autoUnit = (profile?.doseUnit || med?.unit || "").trim();
  const unitInput = $("#p_groupDoseUnit");
  if (unitInput && autoUnit) unitInput.value = autoUnit;
  const unit = autoUnit || (unitInput?.value || "").trim() || med?.unit || "";
  const basis = rule === "PER_LITER" || rule === "PER_KG_FEED"
    ? totalVolumeKg
    : rule === "PER_ANIMAL"
      ? animalsCount
      : totalWeight;
  const basisLabel = rule === "PER_LITER"
    ? `${totalVolumeKg} L`
    : rule === "PER_KG_FEED"
      ? `${totalVolumeKg} kg alimento`
      : rule === "PER_ANIMAL"
        ? `${animalsCount} animales`
        : `${totalWeight.toFixed(2)} kg vivos`;
  const totalQty = doseBase * (basis / dosePorCada);
  const convertedGroup = med
    ? calculateConvertedMedicationDose({
      med,
      theoreticalQty: totalQty,
      theoreticalUnit: unit || med?.unit || "",
      rule,
      basisValue: basis,
      basisLabel: `Base aplicada grupal: ${basisLabel}`,
    })
    : null;
  const summary = doseBase > 0 && basis > 0
    ? `${doseBase} ${unit || med?.unit || "u"}/${dosePorCada} ${profile?.unitBase || doseRuleDenominator(rule)} × ${basisLabel} = ${Number(totalQty).toFixed(2)} ${unit || med?.unit || "u"}`
    : "Selecciona medicamento y captura la base del cálculo grupal.";
  const warning = profile && ["PER_ANIMAL", "PER_KG"].includes(profile.calculationMode)
    ? "Advertencia: la regla principal del medicamento es por animal/peso; para agua/alimento se recomienda regla por litro o por kg de alimento."
    : "";
  return {
    medicationId: med?.id || "",
    medicationName: med?.brand || "",
    groupAnimalId: selectedGroupAnimal?.id || "",
    groupAnimalLabel: selectedGroupAnimal ? animalLabel(selectedGroupAnimal) : "",
    species: speciesRef,
    administrationType,
    rule,
    doseBase,
    doseUnit: unit || med?.unit || "",
    totalVolumeKg,
    totalQty: Number(totalQty.toFixed(4)),
    convertedQty: Number((convertedGroup?.convertedQty || totalQty || 0).toFixed(4)),
    convertedUnit: convertedGroup?.convertedUnit || unit || med?.unit || "",
    conversionExplanation: convertedGroup?.explanation || "",
    summary,
    warning: [warning, convertedGroup?.warning || ""].filter(Boolean).join(" · "),
  };
}
function toggleProcedureMedicationModeUi() {
  const showModeQuestion = shouldShowMedicationModeQuestion();
  const modeQuestion = $("#p_medicationModeQuestion");
  const group = isGroupMedicationMode();
  const individualControls = $("#p_individualMedicationControls");
  const groupBlock = $("#p_groupMedicationBlock");
  const individualAnimalControls = $("#p_individualAnimalControls");
  const groupAnimalBaseWrap = $("#p_groupAnimalBaseWrap");
  const groupDetectedSpeciesWrap = $("#p_groupDetectedSpeciesWrap");
  const animalsCards = $("#p_groupAnimalList");
  if (modeQuestion) modeQuestion.style.display = showModeQuestion ? "" : "none";
  if (!showModeQuestion && $("#p_medicationApplicationMode")) $("#p_medicationApplicationMode").value = "INDIVIDUAL_ANIMAL";
  const preventive = $("#p_type")?.value === "PREVENTIVA";
  const groupScope = ($("#p_scope")?.value || "INDIVIDUAL") === "GRUPAL";
  if (individualControls) individualControls.style.display = (group || preventive) ? "none" : "";
  if (groupBlock) groupBlock.style.display = showModeQuestion && group ? "" : "none";
  if (showModeQuestion) {
    if (individualAnimalControls) individualAnimalControls.style.display = (group || groupScope) ? "none" : "";
    if (groupAnimalBaseWrap) groupAnimalBaseWrap.style.display = (group || groupScope) ? "" : "none";
    if (groupDetectedSpeciesWrap) groupDetectedSpeciesWrap.style.display = (group || groupScope) ? "" : "none";
    if (animalsCards) animalsCards.style.display = (group || groupScope) ? "none" : "";
    if (group && (state.draft.procedureAnimalEntries || []).length) state.draft.procedureAnimalEntries = [];
  } else {
    if (individualAnimalControls) individualAnimalControls.style.display = groupScope ? "none" : "";
    if (groupAnimalBaseWrap) groupAnimalBaseWrap.style.display = groupScope ? "" : "none";
    if (groupDetectedSpeciesWrap) groupDetectedSpeciesWrap.style.display = groupScope ? "" : "none";
    if (animalsCards) animalsCards.style.display = groupScope ? "none" : "";
  }
  const helper = $("#p_animalsHelper");
  if (helper && preventive) {
    helper.textContent = "Medicina preventiva: define especie/grupo, número de animales, peso si aplica y observaciones. Los productos se agregan solo en la sección única de productos usados.";
  } else if (helper && showModeQuestion) {
    helper.textContent = group
      ? "Modo grupal activo: captura total de animales y selecciona un grupo/animal del productor(a). La especie, regla y dosis se detectan automáticamente para calcular en bloque único (agua/alimento)."
      : "Modo individual activo: selecciona un animal y usa “Agregar animal al procedimiento” para crear su tarjeta clínica individual.";
  }
}
function renderProcedureType() {
  const type = $("#p_type")?.value || "";
  const scope = $("#p_scope")?.value || "INDIVIDUAL";
  const hasType = Boolean(type);
  const clinical = type === "CASO_CLINICO";
  $$('details[data-procedure-block]').forEach((detail) => {
    const block = detail.dataset.procedureBlock;
    if (block === "base") return;
    const visible = hasType && (
      (block === "clinical" && clinical) ||
      (block === "necropsy" && type === "NECROPSIA") ||
      (block === "zootecnia" && type === "ZOOTECNIA") ||
      (block === "animal-breakdown" && !clinical) ||
      (block === "inventory" && !clinical)
    );
    detail.style.display = visible ? "block" : "none";
  });
  if ($("#p_scope")) {
    $("#p_scope").disabled = ["CASO_CLINICO", "NECROPSIA"].includes(type);
    if (["CASO_CLINICO", "NECROPSIA"].includes(type)) $("#p_scope").value = "INDIVIDUAL";
  }
  if ((type === "CASO_CLINICO" || type === "NECROPSIA") && $("#p_animalsQtyUsed")) $("#p_animalsQtyUsed").value = 1;
  if ($("#p_preventiveSubtype")) $("#p_preventiveSubtype").closest("div").style.display = type === "PREVENTIVA" ? "block" : "none";
  if ($("#p_zoo_activity")) $("#p_zoo_activity").closest("div").style.display = type === "ZOOTECNIA" ? "block" : "none";
  const labDecision = $("#p_linkLabDecision")?.value || "NO";
  const labFieldsVisible = labDecision === "SI";
  ["lab_type","lab_name","lab_sampleType","lab_date","lab_resultDate","lab_responsible","lab_animal","lab_result","lab_relatedTo","lab_costSuggested","lab_costCharged","lab_interpretation","lab_notes","lab_file","lab_add"].forEach((id) => {
    const el = $("#" + id);
    if (el && el.closest("div")) el.closest("div").style.display = labFieldsVisible ? "" : "none";
  });
  const helper = $("#p_animalsHelper");
  if (helper) {
    helper.textContent = clinical
      ? "Caso clínico individual: no se agregan varios animales. Captura el animal atendido en la sección del caso clínico."
      : !hasType
      ? "Primero selecciona el tipo de procedimiento para mostrar la captura específica."
      : scope === "GRUPAL"
      ? "Selecciona productor(a), fecha, tipo, subtipo, animales y luego define el modo de medicación cuando aplique."
      : "Selecciona un solo animal y el sistema genera automáticamente su tarjeta individual.";
  }
  toggleProcedureMedicationModeUi();
  toggleProcedureOwnerModeUi();
  if (!hasType) return;
  if (!clinical) ensureProcedureAnimalEntriesForScope();
  renderProcedureDraftLists();
}
function operationalMarginConfig(qty, applicationType = "INYECTABLE", profile = "ESTANDAR") {
  const quantity = Number(qty || 0);
  const quantityCv = quantity <= 5 ? 0.12 : quantity <= 20 ? 0.08 : quantity <= 50 ? 0.05 : 0.03;
  const routeFactor = { INYECTABLE: 1.1, ORAL: 0.85, TOPICA: 1.2, OTRA: 1 }[applicationType] || 1;
  const profileFactor = { CONSERVADOR: 0.85, ESTANDAR: 1, AMPLIO: 1.2 }[profile] || 1;
  const fixedLoss = { INYECTABLE: 0.15, ORAL: 0.1, TOPICA: 0.2, OTRA: 0.12 }[applicationType] || 0.12;
  const pct = quantityCv * routeFactor * profileFactor;
  return { pct, fixedLoss, rationale: `CV base ${(quantityCv * 100).toFixed(1)}% · ruta ${applicationType.toLowerCase()} · perfil ${profile.toLowerCase()}` };
}
function getProcedureWeightBasis(entries = []) {
  return entries.reduce((acc, entry) => acc + Number(syncProcedureAnimalSummary(entry).weightRecordedKg || 0), 0);
}
function recalculateProcedureMedicationUse(use) {
  const entries = (state.draft.procedureAnimalEntries || []).map(syncProcedureAnimalSummary);
  const animalsCount = Math.max(entries.length, Number($("#p_animalsQtyUsed")?.value || 0), 1);
  const weightBasis = getProcedureWeightBasis(entries) || Number($("#p_weight")?.value || 0) || 0;
  const volumeBasis = entries.reduce((acc, entry) => acc + Number(entry.doseVolumeLiters || 0), 0);
  const doseBase = Number(use.doseBase || use.qty || 0);
  const calculationMode = use.calculationMode || "MANUAL";
  const theoreticalQty = calculationMode === "PER_KG"
    ? doseBase * weightBasis
    : calculationMode === "PER_ANIMAL"
      ? doseBase * animalsCount
      : calculationMode === "PER_LITER"
        ? doseBase * volumeBasis
      : doseBase;
  const config = operationalMarginConfig(theoreticalQty, use.applicationType, use.marginProfile);
  const marginPct = use.marginOverridePct > 0 ? Number(use.marginOverridePct) / 100 : config.pct;
  const marginQty = theoreticalQty > 0 ? Math.max(theoreticalQty * marginPct, config.fixedLoss) : 0;
  const chargeableQty = theoreticalQty + marginQty;
  use.theoreticalQty = Number(theoreticalQty.toFixed(4));
  use.marginPct = Number((marginPct * 100).toFixed(2));
  use.marginQty = Number(marginQty.toFixed(4));
  use.chargeableQty = Number(chargeableQty.toFixed(4));
  use.qty = use.chargeableQty;
  use.calculationSummary = calculationMode === "PER_KG"
    ? `${doseBase} ${use.unit || "u"}/kg × ${weightBasis.toFixed(2)} kg`
    : calculationMode === "PER_ANIMAL"
      ? `${doseBase} ${use.unit || "u"}/animal × ${animalsCount} animales`
      : calculationMode === "PER_LITER"
        ? `${doseBase} ${use.unit || "u"}/litro × ${volumeBasis.toFixed(2)} L`
      : `Cantidad manual total ${doseBase} ${use.unit || "u"}`;
  use.marginRationale = use.marginOverridePct > 0
    ? `Margen manual ${Number(use.marginOverridePct).toFixed(2)}%`
    : config.rationale;
  entries.forEach((entry) => {
    entry.theoreticalDoseTotal = calculationMode === "PER_KG"
      ? Number((doseBase * Number(entry.weightRecordedKg || 0)).toFixed(4))
       : calculationMode === "PER_ANIMAL"
        ? Number(doseBase.toFixed(4))
        : calculationMode === "PER_LITER"
          ? Number((doseBase * Number(entry.doseVolumeLiters || 0)).toFixed(4))
        : 0;
  });
  return use;
}
function addProcedureAnimalEntry() {
  if (shouldShowMedicationModeQuestion() && isGroupMedicationMode()) {
    return show("p_msg", "En modo grupal no se agregan tarjetas individuales. Captura cantidad, grupo/animal base y bloque de medicación.", "warning");
  }
  const isClinicalCase = $("#p_type")?.value === "CASO_CLINICO";
  const unregisteredClinical = isUnregisteredClinicalCase();
  const selected = unregisteredClinical ? null : byId(currentAnimals(), $("#p_animalGroup")?.value);
  if (!selected && !unregisteredClinical) {
    show("p_msg", "Selecciona un animal existente del productor(a).", "warning");
    return;
  }
  if (!state.draft.procedureAnimalEntries) state.draft.procedureAnimalEntries = [];
  const scope = $("#p_scope")?.value || "INDIVIDUAL";
  const unregisteredAnimalName = $("#p_unregisteredAnimalName")?.value.trim() || "Paciente sin registro";
  const entry = unregisteredClinical
    ? createProcedureAnimalEntry({}, { animalId: "", sourceLabel: unregisteredAnimalName, identification: unregisteredAnimalName })
    : createProcedureAnimalEntry(selected, { identification: animalLabel(selected) });
  if (scope === "INDIVIDUAL" && !isClinicalCase) {
    state.draft.procedureAnimalEntries = [entry];
  } else {
    const exists = state.draft.procedureAnimalEntries.some((item) => item.animalId === selected.id);
    if (scope !== "INDIVIDUAL" && exists) return show("p_msg", "Ese animal ya está agregado al procedimiento.", "warning");
    state.draft.procedureAnimalEntries.push(entry);
  }
  renderProcedureDraftLists();
}
function aggregateProcedureInventoryFromAnimals(entries = state.draft.procedureAnimalEntries || []) {
  if (isGroupMedicationMode()) {
    const groupDraft = calculateGroupMedicationDraft();
    const meds = [];
    if (groupDraft.medicationId && groupDraft.totalQty > 0) {
      const med = byId(state.meds, groupDraft.medicationId);
      if (med) {
        const convertedApplied = resolveMedicationAppliedAmount({
          med,
          qty: groupDraft.convertedQty,
          unit: groupDraft.convertedUnit || groupDraft.doseUnit || med.unit,
        });
        meds.push({
          id: uid("pmed"),
          itemId: med.id,
          name: med.brand,
          unit: med.unit || convertedApplied.unit || "",
          theoreticalUnit: groupDraft.doseUnit || med.unit || "",
          unitCost: med.unitCost,
          owner: med.owner,
          route: med.route || "",
          expiry: med.expiry || "",
          expiryLabel: med.expiry || "Sin fecha de caducidad registrada",
          calculationMode: groupDraft.rule,
          theoreticalQty: groupDraft.totalQty,
          totalUsedQty: convertedApplied.qty,
          inventoryDeductionQty: convertedApplied.qty,
          inventoryDeductionUnit: convertedApplied.unit || med.unit || "",
          chargeableQty: convertedApplied.qty,
          qty: convertedApplied.qty,
          marginQty: 0,
          marginPct: 0,
          marginRationale: "Modo grupal sin margen por animal",
          calculationSummary: [groupDraft.summary, groupDraft.conversionExplanation].filter(Boolean).join(" · "),
          applicationMode: "GROUP_WATER_FEED",
          administrationType: groupDraft.administrationType,
        });
      }
    }
    return { meds, vaccines: [], supplies: [] };
  }
  const meds = new Map();
  const vaccines = new Map();
  const supplies = [];
  entries.map(syncProcedureAnimalSummary).forEach((entry) => {
    normalizeEntryMedicationApplied(entry);
    const medications = entry.medicationsApplied || [];
    medications.forEach((medicationItem) => {
      const med = byId(state.meds, medicationItem.medicationId);
      if (!med) return;
      const current = meds.get(med.id) || {
          id: uid("pmed"),
          itemId: med.id,
          name: med.brand,
          unit: med.unit || "",
          theoreticalUnit: medicationItem.doseUnit || med.unit || "",
          unitCost: med.unitCost,
          owner: med.owner,
          route: med.route || "",
          expiry: med.expiry || "",
          expiryLabel: med.expiry || "Sin fecha de caducidad registrada",
          theoreticalQty: 0,
          convertedQty: 0,
          totalUsedQty: 0,
          inventoryDeductionQty: 0,
          linkedAnimals: [],
        };
      current.theoreticalQty += Number(medicationItem.requiredDose || 0);
      current.convertedQty += Number(medicationItem.inventoryDiscount || medicationItem.finalAppliedAmount || 0);
        current.linkedAnimals.push({
          animalId: entry.animalId,
          identification: entry.identification,
          species: entry.species,
          weightKg: entry.weightRecordedKg,
          doseBase: medicationItem.doseBase,
          doseUnit: medicationItem.doseUnit,
          dose: medicationItem.requiredDose,
          doseCalculationMode: medicationItem.rule,
          doseSummary: entry.doseSummary,
          manualDoseAdjusted: Boolean(medicationItem.manualAdjustment),
          suggestedDoseQty: medicationItem.calculatedSuggestion,
          suggestedDoseUnit: medicationItem.calculatedSuggestionUnit,
          inventoryDeductionQty: medicationItem.inventoryDiscount,
          suggestedInventoryDeductionQty: medicationItem.inventoryDiscount,
          convertedDoseQty: medicationItem.finalAppliedAmount,
          convertedDoseUnit: medicationItem.finalUnit,
          conversionExplanation: medicationItem.conversionExplanation || "",
          medicationWarning: entry.medicationWarning || "",
          weightMethod: entry.weightMethod,
          chestGirth: entry.chestGirth,
          bodyLength: entry.bodyLength,
          notes: medicationItem.notes || entry.notes,
        });
      meds.set(med.id, current);
    });
    (entry.suppliesApplied || []).forEach((supplyItem) => {
      const supply = byId(state.supplies, supplyItem.itemId);
      if (!supply) return;
      const qty = Number(supplyItem.qty || 0);
      const unitCost = Number(supplyItem.unitCost || supplyDisplayCost(supply) || 0);
      supplies.push({
        id: supplyItem.id || uid("psup"),
        itemId: supply.id,
        name: supply.name,
        qty,
        unit: supplyItem.unit || (supply.type === "NON_DISPOSABLE" ? "usos" : "pzas"),
        notes: supplyItem.notes || "",
        type: supply.type,
        unitCost,
        owner: supply.owner || "SERVICIOS",
        costSuggested: supplyItem.costSuggested ?? qty * unitCost,
        priceCharged: supplyItem.priceCharged ?? (supplyItem.costSuggested ?? qty * unitCost),
        source: "ANIMAL_CARD",
        animalId: entry.animalId,
        animalLabel: entry.identification || entry.sourceLabel || "Animal",
      });
    });
    const vaccineItems = [...(entry.vaccinesApplied || [])];
    if (entry.vaccineId) vaccineItems.push({ itemId: entry.vaccineId, animalsApplied: 1 });
    vaccineItems.forEach((vaccineItem) => {
      const vaccine = byId(state.vaccines, vaccineItem.itemId);
      if (!vaccine) return;
      const current = vaccines.get(vaccine.id) || {
        id: uid("pvax"),
        itemId: vaccine.id,
        name: vaccine.brand,
        unitCost: vaccineItem.unitCost ?? vaccine.unitCost ?? (vaccine.coverageAnimals ? Number(vaccine.price || 0) / Number(vaccine.coverageAnimals || 1) : 0),
        owner: vaccine.owner || vaccineItem.owner || "SERVICIOS",
        priceCharged: 0,
        costSuggested: 0,
        animalsApplied: 0,
        linkedAnimals: [],
      };
      const vaccineQty = Number(vaccineItem.animalsApplied || 1);
      current.animalsApplied += vaccineQty;
      current.costSuggested += Number(vaccineItem.costSuggested ?? (current.unitCost * vaccineQty));
      current.priceCharged += Number(vaccineItem.priceCharged ?? vaccineItem.costSuggested ?? (current.unitCost * vaccineQty));
      current.linkedAnimals.push({
        animalId: entry.animalId,
        identification: entry.identification,
        species: entry.species,
        weightKg: entry.weightRecordedKg,
      });
      vaccines.set(vaccine.id, current);
    });
  });
  const applicationType = $("#p_medApplicationType")?.value || "INYECTABLE";
  const marginProfile = $("#p_medMarginProfile")?.value || "ESTANDAR";
  const marginOverridePct = Number($("#p_medMarginOverride")?.value || 0);
  const normalizedMeds = Array.from(meds.values()).map((item) => {
    const baseQtyForUse = Number(item.convertedQty || item.theoreticalQty || 0);
    const manualAdjustments = item.linkedAnimals.filter((animal) => animal.manualDoseAdjusted).length;
    const config = operationalMarginConfig(baseQtyForUse, applicationType, marginProfile);
    const marginPct = marginOverridePct > 0 ? Number(marginOverridePct) / 100 : config.pct;
    const marginQty = baseQtyForUse > 0 ? Math.max(baseQtyForUse * marginPct, config.fixedLoss) : 0;
    const totalUsedQty = baseQtyForUse + marginQty;
    return {
      ...item,
      calculationMode: "POR_ANIMAL_RELACIONAL",
      applicationType,
      marginProfile,
      marginOverridePct,
      marginPct: Number((marginPct * 100).toFixed(2)),
      marginQty: Number(marginQty.toFixed(4)),
      totalUsedQty: Number(totalUsedQty.toFixed(4)),
      inventoryDeductionQty: Number(totalUsedQty.toFixed(4)),
      chargeableQty: Number(totalUsedQty.toFixed(4)),
      qty: Number(totalUsedQty.toFixed(4)),
      calculationSummary: `Suma individual (${item.linkedAnimals.length} animales) · requerido ${Number(item.theoreticalQty || 0).toFixed(2)} ${item.theoreticalUnit || item.linkedAnimals[0]?.doseUnit || item.unit || ""} · aplicado ${Number(baseQtyForUse || 0).toFixed(2)} ${item.unit || ""} · ajustes manuales ${manualAdjustments}`,
      marginRationale: marginOverridePct > 0
        ? `Margen manual ${Number(marginOverridePct).toFixed(2)}%`
        : config.rationale,
    };
  });
  return {
    meds: normalizedMeds,
    vaccines: Array.from(vaccines.values()),
    supplies,
  };
}
function validateProcedureAnimalEntries(entries = [], previousProcedure = null) {
  const problems = [];
  if (isGroupMedicationMode()) {
    const aggregatedGroup = aggregateProcedureInventoryFromAnimals(entries);
    aggregatedGroup.meds.forEach((use) => {
      const med = byId(state.meds, use.itemId);
      if (!med) return;
      const previousQty = previousProcedure ? Number((previousProcedure.inventory?.meds || []).find((item) => item.itemId === med.id)?.inventoryDeductionQty || (previousProcedure.inventory?.meds || []).find((item) => item.itemId === med.id)?.qty || 0) : 0;
      const available = medRemaining(med) + previousQty;
      if (Number(use.inventoryDeductionQty || 0) > available + 0.0001) {
        problems.push(`No hay stock suficiente de ${med.brand}. Disponible: ${available.toFixed(2)} ${med.unit || ''}. Requerido: ${Number(use.inventoryDeductionQty || 0).toFixed(2)} ${use.unit || med.unit || ''}.`);
      }
    });
    return problems;
  }
  entries.forEach((entry) => {
    const synced = syncProcedureAnimalSummary(entry);
    normalizeEntryMedicationApplied(synced);
    const medsToValidate = synced.medicationsApplied?.length
      ? synced.medicationsApplied.map((item) => ({ medicationId: item.medicationId, species: item.speciesDetected || synced.species }))
      : synced.medicationId ? [{ medicationId: synced.medicationId, species: synced.species }] : [];
    medsToValidate.forEach((item) => {
      const med = byId(state.meds, item.medicationId);
      const profile = med ? getMedicationDoseProfile(med, item.species || synced.species) : null;
      if (!med) {
        problems.push(`No se encontró el medicamento seleccionado para ${synced.identification || synced.sourceLabel || 'el animal'}.`);
        return;
      }
      if (!profile) {
        problems.push(`Falta definir la dosis de ${med.brand} para la especie ${item.species || synced.species || 'seleccionada'} en el módulo de medicamentos.`);
      }
      if (profile?.calculationMode === 'PER_KG' && Number(synced.weightRecordedKg || 0) <= 0) {
        problems.push(`Captura un peso utilizable mayor a 0 kg para calcular ${med.brand} en ${synced.identification || synced.sourceLabel || 'el animal'}.`);
      }
      if (!isGroupMedicationMode() && profile?.calculationMode === 'PER_LITER') {
        problems.push(`${med.brand} está configurado por litro y no puede usarse dentro de una tarjeta individual por animal.`);
      }
    });
  });
  const aggregated = aggregateProcedureInventoryFromAnimals(entries);
  aggregated.meds.forEach((use) => {
    const med = byId(state.meds, use.itemId);
    if (!med) return;
    const previousQty = previousProcedure ? Number((previousProcedure.inventory?.meds || []).find((item) => item.itemId === med.id)?.inventoryDeductionQty || (previousProcedure.inventory?.meds || []).find((item) => item.itemId === med.id)?.qty || 0) : 0;
    const available = medRemaining(med) + previousQty;
    if (Number(use.inventoryDeductionQty || 0) > available + 0.0001) {
      problems.push(`No hay stock suficiente de ${med.brand}. Disponible: ${available.toFixed(2)} ${med.unit || ''}. Requerido: ${Number(use.inventoryDeductionQty || 0).toFixed(2)} ${use.unit || med.unit || ''}.`);
    }
  });
  (aggregated.vaccines || []).forEach((use) => {
    const vaccine = byId(state.vaccines, use.itemId);
    if (!vaccine) return;
    const previousQty = previousProcedure ? Number((previousProcedure.inventory?.vaccines || []).filter((item) => item.itemId === vaccine.id).reduce((acc, item) => acc + Number(item.animalsApplied || 0), 0)) : 0;
    const available = vaccineRemaining(vaccine) + previousQty;
    const required = Number(use.animalsApplied || 0);
    if (required > available + 0.0001) {
      problems.push(`No hay disponibilidad suficiente de ${vaccine.brand}. Disponible: ${available.toFixed(2)} animales. Requerido: ${required.toFixed(2)}.`);
    }
  });
  (aggregated.supplies || []).forEach((use) => {
    const supply = byId(state.supplies, use.itemId);
    if (!supply || supply.type === "NON_DISPOSABLE") return;
    const previousQty = previousProcedure ? Number((previousProcedure.inventory?.supplies || []).filter((item) => item.itemId === supply.id).reduce((acc, item) => acc + Number(item.qty || 0), 0)) : 0;
    const available = Number(supplyRemaining(supply) || 0) + previousQty;
    const required = Number(use.qty || 0);
    if (required > available + 0.0001) {
      problems.push(`No hay disponibilidad suficiente de ${supply.name}. Disponible: ${available.toFixed(2)} piezas. Requerido: ${required.toFixed(2)}.`);
    }
  });
  return problems;
}

function renderProcedureAnimalCards() {
  const box = $("#p_groupAnimalList");
  if (!box) return;
  const entries = state.draft.procedureAnimalEntries || [];
  const groupMode = isGroupMedicationMode();
  const isClinicalCase = $("#p_type")?.value === "CASO_CLINICO";
  const isPreventive = $("#p_type")?.value === "PREVENTIVA";
  if (shouldShowMedicationModeQuestion() && groupMode) {
    box.innerHTML = "";
    return;
  }
  if (!entries.length) {
    box.innerHTML = '<div class="help">Todavía no hay animales agregados al procedimiento.</div>';
    return;
  }
  const medOptions =
    '<option value="">— Sin medicamento —</option>' +
    state.meds.map((med) => `<option value="${med.id}">${esc(med.brand)}</option>`).join("");
  const vaccineOptions =
    '<option value="">— Sin vacuna —</option>' +
    state.vaccines.map((vac) => `<option value="${vac.id}">${esc(vac.brand)}</option>`).join("");
  const supplyOptions =
    '<option value="">— Sin insumo —</option>' +
    state.supplies.map((sup) => `<option value="${sup.id}">${esc(sup.name)} (${esc(supplyRemaining(sup))})</option>`).join("");
  box.innerHTML = entries.map((entry, index) => {
    syncProcedureAnimalSummary(entry);
    normalizeEntryMedicationApplied(entry);
    const methodOptions = getWeightMethodOptions(entry.species)
      .map((opt) => `<option value="${opt.value}" ${opt.value === entry.weightMethod ? "selected" : ""}>${opt.label}</option>`)
      .join("");
    const tapeFormula = usesTapeFormula(entry.species, entry.weightMethod);
    const manualTapeWeight = isHorseOrCattleSpecies(entry.species) && entry.weightMethod === "CINTA_ESPECIAL";
    return `<div class="item procedure-animal-card" data-proc-animal="${entry.id}">
      <div class="procedure-animal-card__header">
        <h4>${index + 1}. ${esc(entry.identification || entry.sourceLabel || "Animal")}</h4>
        <div class="chips">
          <span class="chip">${esc(entry.species || "Sin especie")}</span>
          <span class="chip">${esc(entry.weightMethod || "Sin método")}</span>
          <span class="chip">${esc((entry.weightRecordedKg || 0).toFixed(2))} kg utilizable</span>
          <span class="chip ${esc(medicationExpiryInfo(byId(state.meds, entry.medicationId)?.expiry).css)}">${esc(medicationExpiryInfo(byId(state.meds, entry.medicationId)?.expiry).text)}</span>
        </div>
      </div>
      <div class="grid cols-4">
        <div><label>Animal base</label><div class="help">${esc(entry.sourceLabel || "Sin referencia")}</div></div>
        <div><label>Identificación</label><input data-field="identification" type="text" value="${esc(entry.identification)}"></div>
        <div><label>Especie / tipo</label><input data-field="species" type="text" value="${esc(entry.species)}"></div>
        <div><label>Edad</label><input data-field="age" type="text" value="${esc(entry.age || "")}" placeholder="Ej. 2 años"></div>
        <div><label>Sexo</label><input data-field="sex" type="text" value="${esc(entry.sex || "")}" placeholder="Hembra, macho..."></div>
        <div><label>Método de peso</label><select data-field="weightMethod">${methodOptions}</select></div>
      </div>
      <div class="grid cols-4">
        <div><label>${tapeFormula ? "Peso estimado (kg)" : manualTapeWeight ? "Peso estimado manual (kg)" : "Peso (kg)"}</label><input data-field="weight" type="number" min="0" step="0.01" value="${esc(tapeFormula ? entry.estimatedWeight : entry.weight)}" ${tapeFormula ? "disabled" : ""}></div>
        <div><label>Peso utilizable para dosis (kg)</label><input type="number" value="${esc((entry.weightRecordedKg || 0).toFixed(2))}" disabled></div>
        <div><label>Condición general</label><select data-field="generalState"><option value="">— Selecciona —</option><option value="Sano">Sano</option><option value="Enfermo">Enfermo</option><option value="Regular">Regular</option><option value="Otro">Otro</option></select></div>
        <div><label>Motivo del procedimiento/consulta</label><input data-field="procedureReason" type="text" value="${esc(entry.procedureReason || "")}"></div>
        <div><label>Observaciones del desglose</label><input data-field="notes" type="text" value="${esc(entry.notes)}"></div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px;">
          <label><input data-field="examIncluded" type="checkbox" ${entry.examIncluded ? "checked" : ""}> Examen físico general</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            ${!groupMode && !isPreventive ? `<button class="btn small" type="button" data-action="add-medication">➕ ${(entry.medicationsApplied || []).length ? "Agregar otro medicamento/vacuna" : "Agregar medicamento/vacuna"}</button>` : ""}
            ${!groupMode && !isPreventive ? `<button class="btn small" type="button" data-action="add-supply">➕ ${(entry.suppliesApplied || []).length ? "Agregar otro insumo" : "Agregar insumo"}</button>` : ""}
            <button class="btn small bad" type="button" data-action="remove">${isClinicalCase ? "Quitar animal" : "Quitar"}</button>
          </div>
        </div>
      </div>
      ${tapeFormula ? `<div class="grid cols-3"><div><label>Perímetro torácico</label><input data-field="chestGirth" type="number" min="0" step="0.01" value="${esc(entry.chestGirth)}"></div><div><label>Largo del cuerpo</label><input data-field="bodyLength" type="number" min="0" step="0.01" value="${esc(entry.bodyLength)}"></div><div><label>Fórmula usada</label><div class="help">(PT² × LC) / 10838 = ${esc((entry.estimatedWeight || 0).toFixed(2))} kg</div></div></div>` : ""}
      ${manualTapeWeight ? `<div class="help">Para caballos y vacas con cinta especial se captura manualmente el peso final estimado; no se usa fórmula automática.</div>` : ""}
      ${groupMode || isPreventive ? "" : `<div class="grid cols-4">
        <div><label>Medicamento del sistema</label><select data-field="medicationId">${medOptions}</select></div>
        <div><label>Vacuna del sistema</label><select data-field="vaccineId">${vaccineOptions}</select></div>
        <div><label>Dosis total requerida</label><input type="text" value="${esc(entry.theoreticalDoseTotal ? `${Number(entry.theoreticalDoseTotal).toFixed(2)} ${entry.doseUnit || ""}` : "Sin cálculo")} " disabled></div>
        <div><label>Cálculo sugerido automático</label><input type="text" value="${esc(entry.suggestedDoseQty ? `${Number(entry.suggestedDoseQty).toFixed(2)} ${entry.suggestedDoseUnit || ""}` : "Sin cálculo")} " disabled></div>
        <div><label>Cantidad final aplicada (editable)</label><input data-field="convertedDoseQty" type="number" min="0" step="0.0001" value="${esc(entry.convertedDoseQty || 0)}"></div>
        <div><label>Unidad final</label><input type="text" value="${esc(entry.convertedDoseUnit || entry.suggestedDoseUnit || "")}" disabled></div>
        <div><label>Costo automático sugerido</label><input type="text" value="${esc(money(Number(entry.inventoryDeductionQty || 0) * Number(byId(state.meds, entry.medicationId)?.unitCost || 0)))}" disabled></div>
        <div><label>Precio cobrado</label><input data-field="medicationPriceCharged" type="number" min="0" step="0.01" value="${esc(entry.medicationPriceCharged ?? "")}" placeholder="Editable"></div>
        <div><label>Relación especie-medicamento</label><input type="text" value="${esc(entry.doseSummary || "")}" disabled></div>
      </div>
      <div class="grid cols-4">
        <div><label>Vía de administración</label><input type="text" value="${esc(byId(state.meds, entry.medicationId)?.route || "Sin vía de administración registrada")}" disabled></div>
        <div><label>Caducidad</label><input type="text" value="${esc(byId(state.meds, entry.medicationId)?.expiry || "Sin fecha de caducidad registrada")}" disabled></div>
        <div><label>Concentración registrada</label><input type="text" value="${esc(usesStructuredConcentration(byId(state.meds, entry.medicationId)) ? (medicationConcentrationSummary(byId(state.meds, entry.medicationId)) || "Sin concentración registrada") : "Modo sin concentración estructurada")}" disabled></div>
        <div><label>Estado de caducidad</label><span class="chip expiry-badge ${esc(medicationExpiryInfo(byId(state.meds, entry.medicationId)?.expiry).css)}">${esc(medicationExpiryInfo(byId(state.meds, entry.medicationId)?.expiry).text)}</span></div>
      </div>
      <div class="grid cols-4">
        <div><label>Especie detectada</label><input type="text" value="${esc(entry.species || "")}" disabled></div>
        <div><label>Dosis base por especie</label><input type="text" value="${esc(entry.doseBase ? `${Number(entry.doseBase).toFixed(4)} ${entry.doseUnit || ""}/${doseRuleDenominator(entry.doseCalculationMode)}` : "Sin configurar")}" disabled></div>
        <div><label>Descuento individual de inventario</label><input type="text" value="${esc(entry.inventoryDeductionQty ? `${Number(entry.inventoryDeductionQty).toFixed(2)} ${entry.inventoryDeductionUnit || ""}` : "Sin descuento")}" disabled></div>
        <div><label>Medicamento/vacuna</label><input type="text" value="${esc([entry.medicationName, byId(state.vaccines, entry.vaccineId)?.brand || ""].filter(Boolean).join(" · ") || "Sin selección")}" disabled></div>
      </div>
      ${entry.manualDoseAdjusted ? `<div class="help"><b>⚠️ Ajuste manual:</b> sugerida ${Number(entry.suggestedDoseQty || 0).toFixed(2)} ${esc(entry.suggestedDoseUnit || "")} · final ${Number(entry.convertedDoseQty || 0).toFixed(2)} ${esc(entry.convertedDoseUnit || "")}</div>` : `<div class="help"><b>Dosis final:</b> sin ajuste manual (coincide con la sugerencia automática).</div>`}
      ${isClinicalCase ? `<div class="help"><b>Flujo clínico:</b> selecciona medicamento → revisa cálculo automático → ajusta cantidad final si hace falta → pulsa <b>Agregar medicamento</b> para conservarlo y abrir otro registro.</div>` : ""}
      <div class="help"><b>Cálculo explicado:</b> ${esc(entry.conversionExplanation || "Sin cálculo automático disponible todavía.")}</div>`}
      ${!groupMode && !isPreventive ? `<div class="item" style="margin-top:8px;"><b>Medicamentos/vacunas aplicados a este animal:</b>${(entry.medicationsApplied || []).length || (entry.vaccinesApplied || []).length
        ? `<ul style="margin:8px 0 0 18px;">${[...(entry.medicationsApplied || []).map((med) => `<li>${esc(med.medicationName || "Medicamento")} → ${Number(med.finalAppliedAmount || 0).toFixed(2)} ${esc(med.finalUnit || "")} · descuento ${Number(med.inventoryDiscount || 0).toFixed(2)} ${esc(med.inventoryDiscountUnit || "")} · sugerido ${money(med.costSuggested || (Number(med.inventoryDiscount || 0) * Number(byId(state.meds, med.medicationId)?.unitCost || 0)))} · cobrado ${money(med.priceCharged ?? med.costSuggested ?? 0)} · ${esc(med.notes || "Sin observaciones")} <button class="btn small ghost" type="button" data-action="edit-medication" data-med-id="${esc(med.id)}">Editar</button> <button class="btn small bad" type="button" data-action="remove-medication" data-med-id="${esc(med.id)}">Eliminar</button></li>`), ...(entry.vaccinesApplied || []).map((vac) => `<li>${esc(vac.name || "Vacuna")} → 1 animal · sugerido ${money(vac.costSuggested ?? vac.unitCost ?? 0)} · cobrado ${money(vac.priceCharged ?? vac.costSuggested ?? vac.unitCost ?? 0)} <button class="btn small bad" type="button" data-action="remove-vaccine" data-vaccine-id="${esc(vac.id)}">Eliminar</button></li>`)].join("")}</ul>`
        : '<div class="help">Aún no hay medicamentos/vacunas agregados.</div>'}
      </div>
      <div class="item" style="margin-top:8px;">
        <b>Insumos usados en este animal</b>
        <div class="grid cols-4" style="margin-top:8px;">
          <div><label>Insumo (inventario)</label><select data-field="supplyId">${supplyOptions}</select></div>
          <div><label>Cantidad usada</label><input data-field="supplyQty" type="number" min="0" step="0.01" value="${esc(entry.supplyQty || "")}"></div>
          <div><label>Unidad</label><input data-field="supplyUnit" type="text" value="${esc(entry.supplyUnit || "")}" placeholder="pzas, usos..."></div>
          <div><label>Precio cobrado</label><input data-field="supplyPriceCharged" type="number" min="0" step="0.01" value="${esc(entry.supplyPriceCharged ?? "")}" placeholder="Editable"></div>
          <div style="grid-column:1/-1;"><label>Observaciones del insumo</label><input data-field="supplyNotes" type="text" value="${esc(entry.supplyNotes || "")}"></div>
        </div>
        ${(entry.suppliesApplied || []).length
          ? `<ul style="margin:8px 0 0 18px;">${(entry.suppliesApplied || []).map((sup) => `<li>${esc(sup.name || "Insumo")} → ${Number(sup.qty || 0).toFixed(2)} ${esc(sup.unit || "")} · sugerido ${money(sup.costSuggested || (Number(sup.qty || 0) * Number(sup.unitCost || 0)))} · cobrado ${money(sup.priceCharged ?? sup.costSuggested ?? 0)} · ${esc(sup.notes || "Sin observaciones")} <button class="btn small bad" type="button" data-action="remove-supply" data-supply-id="${esc(sup.id)}">Eliminar</button></li>`).join("")}</ul>`
          : '<div class="help">Aún no hay insumos agregados.</div>'}
      </div>` : ""}
      ${groupMode ? `<div class="help">Modo grupal: esta tarjeta solo mantiene referencia del animal y datos clínicos.</div>` : ""}
      ${!groupMode && !isPreventive && (entry.medicationWarning || medicationExpiryInfo(byId(state.meds, entry.medicationId)?.expiry).warning) ? `<div class="error inline-error" style="display:block;">${esc([entry.medicationWarning, medicationExpiryInfo(byId(state.meds, entry.medicationId)?.expiry).warning].filter(Boolean).join(" · "))}</div>` : ""}
      ${entry.examIncluded ? `<div class="grid cols-2"><div><label>Temperatura (°C)</label><input data-field="exam.temperature" type="number" step="0.1" value="${esc(entry.exam?.temperature || "")}"></div><div><label>Hallazgos examen</label><input data-field="exam.findings" type="text" value="${esc(entry.exam?.findings || "")}"></div></div>` : ""}
      <div class="help">${isPreventive ? "Grupo/animal para medicina preventiva: registra especie, número, peso y observaciones. Los productos usados se capturan únicamente en la lista única de productos." : groupMode ? "Ficha clínica por animal para referencia del procedimiento grupal." : "Ficha clínica rápida por animal: peso y método, medicamento/vacuna, dosis base por especie, cantidad calculada y descuento de inventario."}</div>
    </div>`;
  }).join("");
  box.querySelectorAll("[data-proc-animal]").forEach((card) => {
    const entry = entries.find((item) => item.id === card.dataset.procAnimal);
    if (!entry) return;
    const medicationSelect = card.querySelector('[data-field="medicationId"]');
    const vaccineSelect = card.querySelector('[data-field="vaccineId"]');
    if (medicationSelect) medicationSelect.value = entry.medicationId || "";
    if (vaccineSelect) vaccineSelect.value = entry.vaccineId || "";
    const supplySelect = card.querySelector('[data-field="supplyId"]');
    if (supplySelect) supplySelect.value = entry.supplyId || "";
    const stateSelect = card.querySelector('[data-field="generalState"]');
    if (stateSelect) stateSelect.value = entry.generalState || "";
    card.querySelectorAll("input[data-field], select[data-field]").forEach((input) => {
      input.addEventListener("change", () => {
        const path = input.dataset.field;
        const value = input.type === "checkbox" ? input.checked : input.value;
        if (path.includes(".")) {
          const [parent, child] = path.split(".");
          entry[parent] = entry[parent] || {};
          entry[parent][child] = value;
        } else if (["weight", "chestGirth", "bodyLength", "convertedDoseQty", "supplyQty", "supplyPriceCharged", "medicationPriceCharged"].includes(path)) {
          entry[path] = Number(value || 0);
        } else {
          entry[path] = value;
        }
        if (path === "convertedDoseQty") syncProcedureAnimalManualDoseFlags(entry);
        syncProcedureAnimalSummary(entry);
        renderProcedureDraftLists();
      });
    });
    card.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
      state.draft.procedureAnimalEntries = entries.filter((item) => item.id !== entry.id);
      renderProcedureDraftLists();
    });
    card.querySelector('[data-action="add-medication"]')?.addEventListener("click", () => {
      if (!entry.medicationId && !entry.vaccineId) return show("p_msg", "Primero selecciona un medicamento/vacuna antes de agregar otro registro.", "warning");
      if (entry.medicationId && !addMedicationAppliedToEntry(entry)) return show("p_msg", entry.medicationWarning || "No se pudo agregar el medicamento; revisa peso, concentración y presentación.", "warning");
      if (entry.vaccineId) addVaccineAppliedToEntry(entry);
      renderProcedureDraftLists();
      show("p_msg", "Medicamento/vacuna agregado al animal. Ya puedes capturar otro sin sobrescribir el anterior.", "success");
    });
    card.querySelector('[data-action="add-supply"]')?.addEventListener("click", () => {
      if (!entry.supplyId) return show("p_msg", "Primero selecciona un insumo antes de agregar otro registro.", "warning");
      if (!addSupplyAppliedToEntry(entry)) return show("p_msg", "Selecciona insumo y cantidad mayor a cero.", "warning");
      renderProcedureDraftLists();
      show("p_msg", "Insumo agregado al animal. Ya puedes capturar otro sin sobrescribir el anterior.", "success");
    });
    card.querySelectorAll('[data-action="remove-medication"]').forEach((btn) => btn.addEventListener("click", () => {
      const medId = btn.getAttribute("data-med-id");
      entry.medicationsApplied = (entry.medicationsApplied || []).filter((item) => item.id !== medId);
      renderProcedureDraftLists();
    }));
    card.querySelectorAll('[data-action="remove-vaccine"]').forEach((btn) => btn.addEventListener("click", () => {
      const vaccineId = btn.getAttribute("data-vaccine-id");
      entry.vaccinesApplied = (entry.vaccinesApplied || []).filter((item) => item.id !== vaccineId);
      renderProcedureDraftLists();
    }));
    card.querySelectorAll('[data-action="remove-supply"]').forEach((btn) => btn.addEventListener("click", () => {
      const supplyId = btn.getAttribute("data-supply-id");
      entry.suppliesApplied = (entry.suppliesApplied || []).filter((item) => item.id !== supplyId);
      renderProcedureDraftLists();
    }));
    card.querySelectorAll('[data-action="edit-medication"]').forEach((btn) => btn.addEventListener("click", () => {
      const medId = btn.getAttribute("data-med-id");
      const medItem = (entry.medicationsApplied || []).find((item) => item.id === medId);
      if (!medItem) return;
      entry.medicationId = medItem.medicationId || "";
      entry.convertedDoseQty = Number(medItem.finalAppliedAmount || 0) || 0;
      entry.convertedDoseUnit = medItem.finalUnit || "";
      entry.medicationPriceCharged = medItem.priceCharged ?? "";
      entry.medicationsApplied = (entry.medicationsApplied || []).filter((item) => item.id !== medId);
      syncProcedureAnimalSummary(entry);
      renderProcedureDraftLists();
      show("p_msg", "Medicamento cargado al formulario para editar. Guarda con “Agregar medicamento”.", "warning");
    }));
  });
}

const NECROPSY_DEFAULT_SYSTEMS = [
  { section: "Datos generales", organs: ["Fecha de necropsia", "Hora de necropsia", "Responsable / médico veterinario", "Propietario o unidad productiva", "Estado productivo", "Fecha y hora de muerte", "Método de conservación del cadáver", "Tiempo post mortem aproximado", "Condición del cadáver", "Grado de autólisis / descomposición", "Diagnóstico clínico presuntivo", "Motivo de necropsia", "Antecedentes relevantes", "Signos clínicos previos", "Tratamientos previos", "Vacunas / desparasitaciones"] },
  { section: "Examen externo", organs: ["Condición corporal", "Estado de hidratación", "Piel", "Pelo / plumas / lana", "Mucosas", "Ojos", "Oídos", "Narinas", "Cavidad oral externa", "Ano / cloaca", "Genitales externos", "Heridas", "Abscesos", "Tumores o masas", "Ectoparásitos", "Secreciones", "Traumatismos", "Fracturas visibles", "Lesiones externas", "Observaciones generales"] },
  { section: "Tejido subcutáneo, musculatura y linfonodos superficiales", organs: ["Grasa subcutánea", "Edema", "Hemorragias", "Coloración de músculos", "Lesiones musculares", "Linfonodos mandibulares", "Linfonodos cervicales", "Linfonodos axilares", "Linfonodos inguinales", "Otros linfonodos superficiales"] },
  { section: "Cavidades corporales", organs: ["Cavidad torácica", "Cavidad abdominal", "Cavidad pélvica", "Presencia de líquido", "Cantidad de líquido", "Color", "Olor", "Transparencia", "Fibrina", "Exudado", "Adherencias", "Hemorragias", "Contenido anormal", "Peritoneo", "Pleura", "Pericardio"] },
  { section: "Sistema cardiovascular", organs: ["Corazón", "Pericardio", "Epicardio", "Miocardio", "Endocardio", "Válvulas", "Grandes vasos", "Coronarias", "Contenido de cámaras cardiacas", "Coágulos", "Hemorragias", "Malformaciones", "Grosor ventricular", "Observaciones"] },
  { section: "Sistema respiratorio", organs: ["Narinas", "Cavidad nasal", "Senos paranasales", "Laringe", "Tráquea", "Bronquios", "Pulmones", "Pleura", "Linfonodos traqueobronquiales / mediastínicos", "Sacos aéreos en aves", "Exudado", "Congestión", "Edema", "Consolidación", "Neumonía", "Hemorragias", "Parásitos", "Observaciones"] },
  { section: "Sistema digestivo completo", organs: ["Cavidad oral", "Lengua", "Dientes / pico", "Encías", "Paladar", "Glándulas salivales", "Faringe", "Esófago", "Buche en aves", "Estómago", "Proventrículo en aves", "Molleja en aves", "Rumen", "Retículo", "Omaso", "Abomaso", "Duodeno", "Yeyuno", "Íleon", "Ciegos", "Ciego / ciegos aviares", "Colon", "Recto", "Ano", "Cloaca en aves", "Contenido gastrointestinal", "Color del contenido", "Consistencia", "Olor", "Parásitos", "Hemorragias", "Úlceras", "Enteritis", "Necrosis", "Impactación", "Cuerpos extraños", "Linfonodos mesentéricos"] },
  { section: "Hígado, vesícula biliar y vías biliares", organs: ["Hígado", "Tamaño", "Color", "Bordes", "Consistencia", "Patrón lobulillar", "Congestión", "Degeneración", "Necrosis", "Abscesos", "Parásitos", "Vesícula biliar", "Contenido biliar", "Conductos biliares", "Observaciones"] },
  { section: "Páncreas", organs: ["Páncreas", "Tamaño", "Color", "Consistencia", "Hemorragias", "Necrosis", "Lesiones focales", "Observaciones"] },
  { section: "Bazo", organs: ["Bazo", "Tamaño", "Color", "Consistencia", "Bordes", "Congestión", "Infartos", "Nódulos", "Ruptura", "Observaciones"] },
  { section: "Sistema urinario", organs: ["Riñón derecho", "Riñón izquierdo", "Cápsula renal", "Corteza", "Médula", "Pelvis renal", "Uréteres", "Vejiga urinaria", "Uretra", "Orina", "Color de orina", "Sedimento", "Cálculos", "Hemorragias", "Nefritis", "Uratos en aves", "Observaciones"] },
  { section: "Sistema reproductor", organs: ["Ovarios", "Oviductos", "Útero", "Cérvix", "Vagina", "Vulva", "Oviducto aviar", "Folículos ováricos en aves", "Huevo retenido", "Gestación", "Placenta", "Testículos", "Epidídimos", "Conductos deferentes", "Próstata", "Glándulas accesorias", "Pene", "Prepucio", "Lesiones"] },
  { section: "Sistema endocrino", organs: ["Tiroides", "Paratiroides", "Glándulas adrenales", "Hipófisis", "Observaciones"] },
  { section: "Sistema nervioso", organs: ["Cráneo", "Encéfalo", "Cerebro", "Cerebelo", "Tronco encefálico", "Médula espinal", "Meninges", "Nervios periféricos", "Hemorragias", "Congestión", "Malformaciones", "Traumatismos", "Observaciones"] },
  { section: "Sistema musculoesquelético", organs: ["Músculos", "Huesos", "Articulaciones", "Cartílago", "Tendones", "Médula ósea", "Fracturas", "Artritis", "Deformaciones", "Lesiones traumáticas", "Observaciones"] },
  { section: "Sistema linfático e inmune", organs: ["Linfonodos superficiales", "Linfonodos profundos", "Linfonodos mesentéricos", "Timo en animales jóvenes", "Bolsa de Fabricio en aves", "Bazo", "Observaciones"] },
  { section: "Órganos especiales en aves", organs: ["Pico", "Coanas", "Buche", "Proventrículo", "Molleja", "Sacos aéreos", "Siringe", "Ovario / testículos", "Oviducto", "Bolsa de Fabricio", "Médula ósea", "Plumas y piel", "Músculos pectorales", "Quilla", "Grasa abdominal", "Lesiones respiratorias/digestivas/septicémicas/parasitarias/metabólicas"] },
  { section: "Diagnósticos", organs: ["Diagnósticos macroscópicos", "Diagnóstico presuntivo", "Diagnósticos diferenciales", "Causa probable de muerte", "Mecanismo probable de muerte", "Recomendaciones", "Pruebas complementarias sugeridas", "Comentarios finales"] },
];

function necropsyKey(section, organ) { return `${section}::${organ}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase(); }
function defaultNecropsyFinding(section, organ) { return { key: necropsyKey(section, organ), section, organ, status: "NO_REVISADO", description: "", lesions: "", distribution: "", severity: "", color: "", size: "", consistency: "", content: "", odor: "", parasites: "", samples: "", photos: "", observations: "", custom: false }; }
const NECROPSY_LEGACY_FIELD_MAPPINGS = {
  externalInspection: ["Datos generales", "Inspección externa"],
  primaryIncision: ["Datos generales", "Incisión primaria"],
  secondaryIncision: ["Datos generales", "Incisión secundaria"],
  organExtraction: ["Datos generales", "Extracción de órganos"],
  respiratory: ["Sistema respiratorio", "Sistema respiratorio"],
  heart: ["Sistema cardiovascular", "Corazón"],
  spleen: ["Sistema linfático e inmune", "Bazo"],
  kidneys: ["Sistema urinario", "Riñones"],
  stomach: ["Sistema digestivo completo", "Estómago"],
  inspeccion_externa: ["Datos generales", "Inspección externa"],
  incision_primaria: ["Datos generales", "Incisión primaria"],
  incision_secundaria: ["Datos generales", "Incisión secundaria"],
  extraccion_organos: ["Datos generales", "Extracción de órganos"],
  sistema_respiratorio: ["Sistema respiratorio", "Sistema respiratorio"],
  corazon: ["Sistema cardiovascular", "Corazón"],
  bazo: ["Sistema linfático e inmune", "Bazo"],
  rinones: ["Sistema urinario", "Riñones"],
  riñones: ["Sistema urinario", "Riñones"],
  estomago: ["Sistema digestivo completo", "Estómago"],
};
function normalizeNecropsyStatus(value) {
  const text = String(value || "no revisado").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").trim();
  if (text.includes("con lesion")) return "CON_LESIONES";
  if (text.includes("sin lesion")) return "SIN_LESIONES";
  if (text.includes("no aplica")) return "NO_APLICA";
  return "NO_REVISADO";
}
function normalizeNecropsyArrayValue(value) { return Array.isArray(value) ? value.filter(Boolean).join(", ") : (value || ""); }
function normalizeNecropsyJsonFinding(raw = {}, fallbackSection = "Personalizado") {
  if (!raw || typeof raw !== "object") return null;
  const organ = jsonValue(raw, ["organo", "órgano", "organ", "name", "campo"]) || raw.organo;
  const section = jsonValue(raw, ["sistema", "system", "seccion", "sección"]) || fallbackSection;
  const description = jsonValue(raw, ["descripcion_macroscopica", "descripcion", "descripción", "hallazgos_macroscopicos", "description"]);
  const lesions = jsonValue(raw, ["lesiones_encontradas", "lesiones", "hallazgos", "lesions"]);
  if (!organ && !description && !lesions && !jsonValue(raw, ["observaciones", "observations"])) return null;
  return {
    sistema: section || "Personalizado",
    organo: organ || section || "Órgano",
    estado: jsonValue(raw, ["estado", "status"]),
    distribucion: jsonValue(raw, ["distribucion", "distribución", "distribution"]),
    severidad: jsonValue(raw, ["severidad", "severity"]),
    descripcion_macroscopica: description,
    lesiones_encontradas: lesions,
    color: jsonValue(raw, ["color"]),
    tamano: jsonValue(raw, ["tamano", "tamaño", "size"]),
    consistencia: jsonValue(raw, ["consistencia", "consistency"]),
    contenido: jsonValue(raw, ["contenido", "content"]),
    olor: jsonValue(raw, ["olor", "odor"]),
    parasitos: jsonValue(raw, ["parasitos", "parásitos", "parasites"]),
    muestras_tomadas: jsonValue(raw, ["muestras_tomadas", "muestras", "samples"]),
    fotos_referencias: jsonValue(raw, ["fotos_referencias", "fotos", "referencias", "photos"]),
    observaciones: jsonValue(raw, ["observaciones", "observations", "notes"]),
  };
}
function normalizeNecropsySectionPayload(n = {}) {
  const payload = n && typeof n === "object" ? stableClone(n) : {};
  const rows = [];
  const addRow = (row, fallbackSection) => { const normalized = normalizeNecropsyJsonFinding(row, fallbackSection); if (normalized) rows.push(normalized); };
  (Array.isArray(payload.reporte_sistematico) ? payload.reporte_sistematico : []).forEach((row) => addRow(row));
  (Array.isArray(payload.organos_sistemas) ? payload.organos_sistemas : []).forEach((row) => addRow(row));
  if (Array.isArray(payload.datos_generales)) payload.datos_generales.forEach((row) => addRow({ sistema: "Datos generales", ...row }, "Datos generales"));
  Object.entries(NECROPSY_LEGACY_FIELD_MAPPINGS).forEach(([key, [section, organ]]) => { if (payload[key]) rows.push({ sistema: section, organo: organ, descripcion_macroscopica: payload[key], estado: "con lesiones" }); });
  payload.reporte_sistematico = rows;
  return payload;
}
function migrateLegacyNecropsyFieldsToSystematic(necropsy = {}, saved = []) {
  const rows = mergeNecropsyFindings(saved || []);
  Object.entries(NECROPSY_LEGACY_FIELD_MAPPINGS).forEach(([field, [section, organ]]) => {
    const value = necropsy[field];
    if (!value || !String(value).trim()) return;
    const key = necropsyKey(section, organ);
    let row = rows.find((item) => item.key === key);
    if (!row) { row = { ...defaultNecropsyFinding(section, organ), custom: true }; rows.push(row); }
    if (!row.description) row.description = String(value).trim();
    if (row.status === "NO_REVISADO") row.status = "CON_LESIONES";
  });
  return rows;
}
function getNecropsyFindingsFromDom() {
  return $$("#p_nec_systematicList [data-nec-key]").map((el) => ({ key: el.dataset.necKey, section: el.dataset.section || "", organ: el.dataset.organ || "", custom: el.dataset.custom === "true", status: el.querySelector('[data-field="status"]')?.value || "NO_REVISADO", description: el.querySelector('[data-field="description"]')?.value.trim() || "", lesions: el.querySelector('[data-field="lesions"]')?.value.trim() || "", distribution: el.querySelector('[data-field="distribution"]')?.value || "", severity: el.querySelector('[data-field="severity"]')?.value || "", color: el.querySelector('[data-field="color"]')?.value.trim() || "", size: el.querySelector('[data-field="size"]')?.value.trim() || "", consistency: el.querySelector('[data-field="consistency"]')?.value.trim() || "", content: el.querySelector('[data-field="content"]')?.value.trim() || "", odor: el.querySelector('[data-field="odor"]')?.value.trim() || "", parasites: el.querySelector('[data-field="parasites"]')?.value.trim() || "", samples: el.querySelector('[data-field="samples"]')?.value.trim() || "", photos: el.querySelector('[data-field="photos"]')?.value.trim() || "", observations: el.querySelector('[data-field="observations"]')?.value.trim() || "" }));
}
function mergeNecropsyFindings(saved = []) {
  const map = new Map((Array.isArray(saved) ? saved : []).map((f) => [f.key || necropsyKey(f.section || "Personalizado", f.organ || f.name || "Órgano"), f]));
  const defaults = NECROPSY_DEFAULT_SYSTEMS.flatMap((g) => g.organs.map((organ) => defaultNecropsyFinding(g.section, organ)));
  const merged = defaults.map((d) => ({ ...d, ...(map.get(d.key) || {}) }));
  (Array.isArray(saved) ? saved : []).forEach((f) => { const key = f.key || necropsyKey(f.section || "Personalizado", f.organ || f.name || "Órgano"); if (!merged.some((x) => x.key === key)) merged.push({ ...defaultNecropsyFinding(f.section || "Personalizado", f.organ || f.name || "Órgano"), ...f, key, custom: true }); });
  return merged;
}
function renderNecropsySystematicList(saved = null) {
  const box = $("#p_nec_systematicList"); if (!box) return;
  const rows = mergeNecropsyFindings(saved || state.draft.procedureNecropsyFindings || []);
  state.draft.procedureNecropsyFindings = rows;
  const groups = new Map(); rows.forEach((r) => { if (!groups.has(r.section)) groups.set(r.section, []); groups.get(r.section).push(r); });
  box.innerHTML = Array.from(groups.entries()).map(([section, items]) => `<details class="item" data-nec-section open><summary><b>${esc(section)}</b> · ${items.length} campos/órganos</summary>${items.map((r) => `<div class="item" data-nec-key="${esc(r.key)}" data-section="${esc(r.section)}" data-organ="${esc(r.organ)}" data-custom="${r.custom ? "true" : "false"}"><div class="grid cols-4"><div><label>${esc(r.organ)}</label><select data-field="status"><option value="NO_REVISADO" ${r.status === "NO_REVISADO" ? "selected" : ""}>No revisado</option><option value="SIN_LESIONES" ${r.status === "SIN_LESIONES" ? "selected" : ""}>Sin lesiones macroscópicas relevantes</option><option value="CON_LESIONES" ${r.status === "CON_LESIONES" ? "selected" : ""}>Con lesiones</option><option value="NO_APLICA" ${r.status === "NO_APLICA" ? "selected" : ""}>No aplica</option></select></div><div><label>Distribución</label><select data-field="distribution"><option></option><option>focal</option><option>multifocal</option><option>difusa</option><option>segmentaria</option><option>bilateral</option><option>unilateral</option></select></div><div><label>Severidad</label><select data-field="severity"><option></option><option>leve</option><option>moderada</option><option>severa</option></select></div><div style="display:flex;align-items:end"><button class="btn small ghost" type="button" data-nec-normal>Sin lesiones</button></div></div><div class="grid cols-2"><div><label>Descripción macroscópica</label><textarea data-field="description">${esc(r.description || "")}</textarea></div><div><label>Lesiones encontradas</label><textarea data-field="lesions">${esc(r.lesions || "")}</textarea></div></div><div class="grid cols-4"><input data-field="color" placeholder="Color" value="${esc(r.color || "")}"/><input data-field="size" placeholder="Tamaño" value="${esc(r.size || "")}"/><input data-field="consistency" placeholder="Consistencia" value="${esc(r.consistency || "")}"/><input data-field="content" placeholder="Contenido" value="${esc(r.content || "")}"/></div><div class="grid cols-4"><input data-field="odor" placeholder="Olor" value="${esc(r.odor || "")}"/><input data-field="parasites" placeholder="Parásitos" value="${esc(r.parasites || "")}"/><input data-field="samples" placeholder="Muestras tomadas" value="${esc(r.samples || "")}"/><input data-field="photos" placeholder="Fotos/referencias" value="${esc(r.photos || "")}"/></div><textarea data-field="observations" placeholder="Observaciones">${esc(r.observations || "")}</textarea></div>`).join("")}</details>`).join("");
  box.querySelectorAll('[data-field="distribution"]').forEach((el) => { const row = rows.find((r) => r.key === el.closest('[data-nec-key]')?.dataset.necKey); if (row) el.value = row.distribution || ""; });
  box.querySelectorAll('[data-field="severity"]').forEach((el) => { const row = rows.find((r) => r.key === el.closest('[data-nec-key]')?.dataset.necKey); if (row) el.value = row.severity || ""; });
  box.querySelectorAll('[data-nec-normal]').forEach((btn) => btn.addEventListener("click", () => { const card = btn.closest('[data-nec-key]'); card.querySelector('[data-field="status"]').value = "SIN_LESIONES"; }));
}
function wireNecropsyControls() {
  $("#p_nec_markAllUnreviewed")?.addEventListener("click", () => $$('#p_nec_systematicList [data-field="status"]').forEach((el) => { el.value = "NO_REVISADO"; }));
  $("#p_nec_markAllNormal")?.addEventListener("click", () => $$('#p_nec_systematicList [data-field="status"]').forEach((el) => { el.value = "SIN_LESIONES"; }));
  $("#p_nec_expandAll")?.addEventListener("click", () => $$('#p_nec_systematicList details').forEach((el) => { el.open = true; }));
  $("#p_nec_collapseAll")?.addEventListener("click", () => $$('#p_nec_systematicList details').forEach((el) => { el.open = false; }));
  $("#p_nec_addCustomOrgan")?.addEventListener("click", () => { const name = $("#p_nec_customOrganName")?.value.trim(); if (!name) return; const rows = getNecropsyFindingsFromDom(); rows.push({ ...defaultNecropsyFinding("Órganos personalizados", name), custom: true }); if ($("#p_nec_customOrganName")) $("#p_nec_customOrganName").value = ""; renderNecropsySystematicList(rows); });
  renderNecropsySystematicList();
}


function procedureManualMedRuleUi(rule = $("#p_medCalculationRule")?.value || "MANUAL") {
  const labels = {
    PER_LITER: ["Litros usados", "L"],
    PER_ML: ["mL usados", "mL"],
    PER_KG_FEED: ["Kg de alimento", "kg"],
    PER_KG: ["Peso vivo del paciente o grupo (kg)", "kg"],
    PER_ANIMAL: ["Número de animales", "animal"],
    PER_PATIENT: ["Número de pacientes", "paciente"],
    PER_GROUP: ["Número de grupos", "grupo"],
    PER_DOSE: ["Número de dosis", "dosis"],
    FIXED: ["Número de dosis o aplicaciones", "dosis"],
    MANUAL: ["Cantidad usada manual", "otra"],
  };
  const type = getProcedureProductType();
  const [label, unit] = labels[rule] || labels.MANUAL;
  if ($("#p_medBaseAmountLabel")) $("#p_medBaseAmountLabel").textContent = type === "INSUMO" ? "Cantidad usada" : label;
  if ($("#p_medBaseUnit") && (!$("#p_medBaseUnit").value || $("#p_medBaseUnit").value === "otra" || rule !== "MANUAL")) $("#p_medBaseUnit").value = unit;
  ["p_medSpecies", "p_medDoseProfile", "p_medAdministrationType", "p_medCalculationRule", "p_medDoseBase", "p_medDoseUnit", "p_medCalculatedTotal"].forEach((id) => {
    const wrap = $("#" + id)?.closest("div");
    if (!wrap) return;
    const hideForSupply = type === "INSUMO" && id !== "p_medCalculatedTotal";
    const hideForVaccine = type === "VACUNA" && id === "p_medDoseProfile";
    wrap.style.display = hideForSupply || hideForVaccine ? "none" : "";
  });
}
function showProcedureManualMedEditor(show = true) {
  const editor = $("#p_medUseEditor");
  if (editor) editor.style.display = show ? "" : "none";
  if (show) procedureManualMedRuleUi();
}

function getProcedureMedicationSpecies() {
  return $("#p_medSpecies")?.value.trim() || $("#p_nec_species")?.value.trim() || $("#p_cc_species")?.value.trim() || $("#p_species")?.value.trim() || "";
}
function medicationDosingReferenceText(med = {}) {
  return [
    med?.clinical?.dosing,
    med?.dosificacion_es,
    med?.dosificacionES,
    med?.dosing_es,
    med?.dosingEs,
    med?.dosing,
    med?.dosis_texto,
    med?.dosageText,
    med?.fichaFarmacologica?.dosing,
  ].find((value) => String(value || "").trim())?.trim() || "";
}
function renderMedicationDosingReference({ med, hasStructuredDose = false, selectedManual = true, cardId, textId }) {
  const card = $("#" + cardId);
  const box = $("#" + textId);
  if (!card || !box) return;
  if (!med || !selectedManual) {
    card.style.display = "none";
    box.textContent = "";
    return;
  }
  const text = medicationDosingReferenceText(med);
  card.style.display = "";
  box.textContent = text || (hasStructuredDose
    ? "No hay dosificación en texto registrada para este medicamento. Puedes capturar manualmente la dosis del procedimiento."
    : "No hay dosis por especie vinculada ni dosificación en texto registrada para este medicamento.");
}
function applyMedicationDoseProfileToProcedure(force = false) {
  const type = getProcedureProductType();
  const med = byProcedureProductId($("#p_medSelect")?.value, type);
  const species = getProcedureMedicationSpecies();
  const selectedProfileValue = $("#p_medDoseProfile")?.value || "";
  const profile = type === "MEDICAMENTO" && med && selectedProfileValue !== "" ? getSelectedProcedureDoseProfile(med, species) : null;
  const help = $("#p_medSuggestedDose");
  if (!med) { renderMedicationDosingReference({ med: null, cardId: "p_medDosingReferenceCard", textId: "p_medDosingReferenceText" }); if (help) help.textContent = "Selecciona producto y especie/grupo para calcular medicamento, vacuna o insumo."; return; }
  if (type === "VACUNA") { renderMedicationDosingReference({ med: null, cardId: "p_medDosingReferenceCard", textId: "p_medDosingReferenceText" }); if ($("#p_medDoseBase")) $("#p_medDoseBase").value = $("#p_medDoseBase").value || 1; if ($("#p_medDoseUnit")) $("#p_medDoseUnit").value = $("#p_medDoseUnit").value || "dosis"; if ($("#p_medCalculationRule")) $("#p_medCalculationRule").value = $("#p_medCalculationRule").value || "PER_ANIMAL"; procedureManualMedRuleUi("PER_ANIMAL"); if ($("#p_medUnitUsed") && !$("#p_medUnitUsed").value) $("#p_medUnitUsed").value = procedureProductUnit(med, type); if (help) help.textContent = "Vacuna: regla sugerida 1 dosis por animal. Captura número de animales/dosis; todo es editable."; return; }
  if (type === "INSUMO") { renderMedicationDosingReference({ med: null, cardId: "p_medDosingReferenceCard", textId: "p_medDosingReferenceText" }); if ($("#p_medCalculationRule")) $("#p_medCalculationRule").value = "MANUAL"; procedureManualMedRuleUi("MANUAL"); if ($("#p_medUnitUsed") && !$("#p_medUnitUsed").value) $("#p_medUnitUsed").value = procedureProductUnit(med, type); if (help) help.textContent = "Insumo: captura cantidad usada real. Todo es editable."; return; }
  if (profile) {
    const row = normalizeDoseRow(profile, species);
    if (force || !$("#p_medDoseBase")?.value) $("#p_medDoseBase").value = row.dose || "";
    if (force || !$("#p_medDoseUnit")?.value) $("#p_medDoseUnit").value = row.doseUnit || med.unit || "";
    if (force || !$("#p_medPorCada")?.value) $("#p_medPorCada").value = row.porCada || 1;
    if (force || !$("#p_medUnitBaseDose")?.value) $("#p_medUnitBaseDose").value = row.unitBase || doseRuleDenominator(row.calculationMode) || "kg";
    if (force || !$("#p_medCalculationRule")?.value) $("#p_medCalculationRule").value = row.calculationMode || "MANUAL";
    procedureManualMedRuleUi($("#p_medCalculationRule")?.value || row.calculationMode || "MANUAL");
    if (force || !$("#p_medBaseUnit")?.value) $("#p_medBaseUnit").value = row.unitBase === "kg alimento" ? "kg" : (row.unitBase || "kg");
    if (force || !$("#p_medAdministrationType")?.value) $("#p_medAdministrationType").value = med.route || $("#p_medAdministrationType")?.value || "Otro";
    if (help) help.textContent = `Dosis vinculada: ${linkedDosePhrase(row)} · ${row.frequency || "sin frecuencia"} · ${row.duration || "sin duración"} · ${row.indication || "sin indicación"}. Todo es editable en este procedimiento.`;
    renderProcedureManualDoseCard(false);
    renderMedicationDosingReference({ med, hasStructuredDose: true, selectedManual: $("#p_medDoseProfile")?.value === "", cardId: "p_medDosingReferenceCard", textId: "p_medDosingReferenceText" });
  } else if (help) {
    help.textContent = "No hay dosis por especie vinculada para este medicamento y esta especie.";
    renderProcedureManualDoseCard(true);
    procedureManualMedRuleUi($("#p_medCalculationRule")?.value || "MANUAL");
    renderMedicationDosingReference({ med, hasStructuredDose: false, selectedManual: true, cardId: "p_medDosingReferenceCard", textId: "p_medDosingReferenceText" });
  }
}
function procedureManualDoseText() {
  const amount = $("#p_medDoseBase")?.value || "";
  const unit = $("#p_medDoseUnit")?.value || "";
  const per = $("#p_medPorCada")?.value || "1";
  const base = $("#p_medUnitBaseDose")?.value || $("#p_medBaseUnit")?.value || "";
  const freq = $("#p_medNotes")?.value.trim() || "";
  return [amount && unit ? `${amount} ${unit} por cada ${per} ${base}` : "", freq].filter(Boolean).join(", ");
}
function renderProcedureManualDoseCard(showCard = null) {
  const card = $("#p_manualDoseCard");
  if (!card) return;
  const text = procedureManualDoseText();
  if (showCard == null) showCard = card.style.display !== "none";
  card.style.display = showCard ? "" : "none";
  if ($("#p_manualDoseText")) $("#p_manualDoseText").textContent = text ? `“${text}”` : "Captura cantidad, unidad, por cada, unidad base, frecuencia/duración u observaciones para copiar o guardar esta dosis.";
}
function saveManualProcedureDoseToMedication() {
  const med = byProcedureProductId($("#p_medSelect")?.value, "MEDICAMENTO");
  if (!med) return show("p_msg", "Selecciona un medicamento para guardar la dosis.", "warning");
  const species = getProcedureMedicationSpecies();
  if (!species) return show("p_msg", "Captura la especie para guardar la dosis en Medicamentos.", "warning");
  const row = normalizeDoseRow({
    species,
    dose: $("#p_medDoseBase")?.value || 0,
    doseUnit: $("#p_medDoseUnit")?.value || "",
    porCada: $("#p_medPorCada")?.value || 1,
    unitBase: $("#p_medUnitBaseDose")?.value || $("#p_medBaseUnit")?.value || "",
    calculationMode: $("#p_medCalculationRule")?.value || "MANUAL",
    notes: $("#p_medNotes")?.value.trim() || "",
  });
  med.speciesDoses = [...(med.speciesDoses || []), row];
  saveState();
  syncProcedureDoseProfileOptions();
  show("p_msg", `Dosis guardada en Medicamentos: ${linkedDosePhrase(row)}.`, "success");
}
async function copyMedicationDosingReference(textId, messageTarget = "p_msg") {
  const text = $("#" + textId)?.textContent.trim() || "";
  if (!text || text.startsWith("No hay ")) return show(messageTarget, "No hay dosificación en texto registrada para copiar.", "warning");
  await navigator.clipboard?.writeText(text);
  show(messageTarget, "Dosificación registrada en Medicamentos copiada.", "success");
}
function useMedicationDosingReferenceAsManualBase(textId, targetId, messageTarget = "p_msg") {
  const text = $("#" + textId)?.textContent.trim() || "";
  const target = $("#" + targetId);
  if (!text || text.startsWith("No hay ")) return show(messageTarget, "No hay dosificación en texto registrada para usar como base.", "warning");
  if (target) target.value = target.value ? `${target.value}\n${text}` : text;
  renderProcedureManualDoseCard(true);
  show(messageTarget, "Texto agregado como referencia editable de la dosis manual.", "success");
}
function procedureManualMedDraftFromForm(existingId = null) {
  const productType = getProcedureProductType();
  const med = byProcedureProductId($("#p_medSelect")?.value, productType);
  if (!med) return null;
  const baseAmount = Number($("#p_medBaseAmount")?.value || 0);
  const doseBase = Number($("#p_medDoseBase")?.value || 0);
  const rule = $("#p_medCalculationRule")?.value || "MANUAL";
  const profileForDraft = productType === "MEDICAMENTO" ? getSelectedProcedureDoseProfile(med, getProcedureMedicationSpecies()) : null;
  const perEvery = Number($("#p_medPorCada")?.value || profileForDraft?.porCada || 1) || 1;
  const calculatedTotal = Number($("#p_medCalculatedTotal")?.value || 0) || (["MANUAL", "FIXED"].includes(rule) ? doseBase : doseBase * (baseAmount / perEvery));
  const converted = productType === "MEDICAMENTO" ? calculateConvertedMedicationDose({ med, theoreticalQty: calculatedTotal, theoreticalUnit: $("#p_medDoseUnit")?.value || med.unit || "", rule: ["PER_PATIENT", "PER_GROUP", "PER_DOSE"].includes(rule) ? "PER_ANIMAL" : rule, basisValue: baseAmount, basisLabel: `${baseAmount || 0} ${$("#p_medBaseUnit")?.value || "base"}` }) : { convertedQty: calculatedTotal || baseAmount, convertedUnit: procedureProductUnit(med, productType), explanation: productType === "VACUNA" ? `${doseBase || 1} dosis/animal × ${baseAmount || 0} animales = ${calculatedTotal || 0} dosis` : `Cantidad manual: ${calculatedTotal || baseAmount || 0} ${procedureProductUnit(med, productType)}` };
  const usedQty = Number($("#p_medDoseKg")?.value || 0) || Number(converted.convertedQty || calculatedTotal || 0);
  const usedUnit = $("#p_medUnitUsed")?.value.trim() || converted.convertedUnit || procedureProductUnit(med, productType) || "";
  const autoCost = Number((usedQty * procedureProductUnitCost(med, productType)).toFixed(2));
  return { id: existingId || uid("pmed"), productType, itemId: med.id, medicationId: productType === "MEDICAMENTO" ? med.id : "", vaccineId: productType === "VACUNA" ? med.id : "", supplyId: productType === "INSUMO" ? med.id : "", name: procedureProductName(med, productType), medicationName: procedureProductName(med, productType), species: getProcedureMedicationSpecies(), doseSource: profileForDraft ? "MEDICATION" : "PROCEDURE_MANUAL", structuredDoseIndex: $("#p_medDoseProfile")?.value || "", administrationType: $("#p_medAdministrationType")?.value || "", baseAmount, baseUnit: $("#p_medBaseUnit")?.value || "", calculationMode: rule, doseBase, doseUnit: $("#p_medDoseUnit")?.value || "", porCada: perEvery, unitBase: $("#p_medUnitBaseDose")?.value || profileForDraft?.unitBase || doseRuleDenominator(rule), linkedDoseText: `${doseBase || 0} ${$("#p_medDoseUnit")?.value || ""} por cada ${perEvery} ${$("#p_medUnitBaseDose")?.value || doseRuleDenominator(rule)}`, theoreticalQty: calculatedTotal, theoreticalUnit: $("#p_medDoseUnit")?.value || "", calculatedTotal, qty: usedQty, totalUsedQty: usedQty, inventoryDeductionQty: usedQty, chargeableQty: usedQty, unit: usedUnit, inventoryDeductionUnit: usedUnit, unitCost: procedureProductUnitCost(med, productType), costSuggested: autoCost, costCharged: Number($("#p_medCostCharged")?.value || autoCost), route: $("#p_medAdministrationType")?.value || med.route || "", owner: med.owner || "", frequency: profileForDraft?.frequency || "", duration: profileForDraft?.duration || "", indication: profileForDraft?.indication || "", observations: profileForDraft?.notes || "", notes: $("#p_medNotes")?.value.trim() || "", source: "PROCEDURE_MANUAL", calculationSummary: [`Dosis vinculada: ${doseBase || 0} ${$("#p_medDoseUnit")?.value || ""} por cada ${perEvery} ${$("#p_medUnitBaseDose")?.value || doseRuleDenominator(rule)}`, converted.explanation, converted.warning].filter(Boolean).join(" · "), warning: converted.warning || "" };
}
function syncProcedureManualMedCalculation() {
  const med = byProcedureProductId($("#p_medSelect")?.value, getProcedureProductType());
  if (!med) return;
  if ($("#p_medUnitUsed") && !$("#p_medUnitUsed").value) $("#p_medUnitUsed").value = procedureProductUnit(med, getProcedureProductType()) || "";
  procedureManualMedRuleUi();
  const draft = procedureManualMedDraftFromForm(state.draft.procedureMedUseEditId);
  if (!draft) return;
  if ($("#p_medCalculatedTotal")) $("#p_medCalculatedTotal").value = Number(draft.calculatedTotal || 0).toFixed(4).replace(/\.?0+$/, "");
  if ($("#p_medDoseKg") && !$("#p_medDoseKg").value) $("#p_medDoseKg").value = Number(draft.qty || 0).toFixed(4).replace(/\.?0+$/, "");
  if ($("#p_medCostSuggested")) $("#p_medCostSuggested").value = Number(draft.costSuggested || 0).toFixed(2);
  const chargedInput = $("#p_medCostCharged");
  if (chargedInput && (!chargedInput.dataset.manual || !chargedInput.value)) chargedInput.value = Number(draft.costCharged || 0).toFixed(2);
  if ($("#p_medNotes") && !$("#p_medNotes").value) $("#p_medNotes").value = draft.calculationSummary || "";
}
function clearProcedureManualMedForm() { ["p_medSpecies","p_medBaseAmount","p_medDoseBase","p_medCalculatedTotal","p_medDoseKg","p_medUnitUsed","p_medCostSuggested","p_medCostCharged","p_medNotes"].forEach((id)=>{ if ($("#"+id)) { $("#"+id).value=""; delete $("#"+id).dataset.manual; } }); if ($("#p_medPorCada")) $("#p_medPorCada").value = "1"; if ($("#p_medUnitBaseDose")) $("#p_medUnitBaseDose").value = "kg"; if ($("#p_medSelect")) $("#p_medSelect").value = ""; state.draft.procedureMedUseEditId = null; renderProcedureManualDoseCard(false); applyMedicationDoseProfileToProcedure(true); showProcedureManualMedEditor(false); }
function addProcedureMedUse() {
  const draft = procedureManualMedDraftFromForm(state.draft.procedureMedUseEditId);
  if (!draft) return show("p_msg", "Selecciona un medicamento de inventario.", "warning");
  if (!(Number(draft.qty || 0) > 0)) return show("p_msg", "Captura la cantidad usada real para descontar inventario.", "warning");
  if (draft.productType === "MEDICAMENTO" && draft.doseSource === "PROCEDURE_MANUAL" && draft.species && draft.doseBase > 0) {
    const med = byId(state.meds, draft.itemId);
    if (med && confirm("Este medicamento no tiene dosis estructurada registrada para esta especie. ¿Guardar también esta dosis manual en Medicamentos para usarla después? Aceptar = guardar también; Cancelar = usar solo en este procedimiento.")) {
      med.speciesDoses = [...(med.speciesDoses || []), normalizeDoseRow({ species: draft.species, dose: draft.doseBase, doseUnit: draft.doseUnit, porCada: draft.porCada || 1, unitBase: draft.unitBase || draft.baseUnit || doseRuleDenominator(draft.calculationMode), calculationMode: draft.calculationMode, indication: draft.indication || "Dosis agregada desde procedimiento", frequency: draft.frequency || "", duration: draft.duration || "", notes: draft.notes || "" })];
      save();
      draft.doseSource = "MEDICATION_SAVED_FROM_PROCEDURE";
    }
  }
  const existingSameMed = (state.draft.procedureMedUses || []).find((item) => item.itemId === draft.itemId && (item.productType || "MEDICAMENTO") === draft.productType && item.id !== draft.id);
  if (existingSameMed && !state.draft.procedureMedUseEditId) {
    const separate = confirm("Este producto ya está agregado. ¿Quieres agregarlo como una aplicación separada? Aceptar = aplicación separada; Cancelar = editar el existente.");
    if (!separate) {
      state.draft.procedureMedUseEditId = existingSameMed.id;
      showProcedureManualMedEditor(true);
      show("p_msg", "Medicamento existente cargado para editar.", "warning");
      return;
    }
    const appNo = (state.draft.procedureMedUses || []).filter((item) => item.itemId === draft.itemId && (item.productType || "MEDICAMENTO") === draft.productType).length + 1;
    draft.applicationNumber = appNo;
    draft.name = `${draft.name} — aplicación ${appNo}`;
    draft.medicationName = draft.name;
  }
  const idx = (state.draft.procedureMedUses || []).findIndex((item) => item.id === draft.id);
  if (idx >= 0) state.draft.procedureMedUses[idx] = draft; else state.draft.procedureMedUses.push(draft);
  clearProcedureManualMedForm(); renderProcedureDraftLists(); show("p_msg", `Producto usado guardado: ${draft.name}.`, "success");
}
function renderProcedureMedUseList() {
  const list = $("#p_medUseList"); if (!list) return;
  const rows = state.draft.procedureMedUses || [];
  const emptyLabel = ($("#p_type")?.value === "PREVENTIVA") ? "Sin productos usados agregados." : "Sin medicamentos o vacunas usados agregados.";
  list.innerHTML = (state.draft.procedureMedUseEditId ? '<div class="help">Nuevo medicamento/vacuna en edición.</div>' : '') + (rows.length ? rows.map((m) => `<div class="item"><h4>${esc(m.name)}</h4><div class="line"><b>Tipo:</b> ${esc(m.productType || "MEDICAMENTO")} · <b>Especie/grupo:</b> ${esc(m.species || "")} · <b>Administración:</b> ${esc(m.administrationType || m.route || "")} · <b>Regla:</b> ${esc(doseRuleLabel(m.calculationMode) || m.calculationMode || "")} · <b>Dosis sugerida:</b> ${esc(m.doseBase || "")} ${esc(m.doseUnit || "")} · <b>Base usada:</b> ${esc(m.baseAmount || "")} ${esc(m.baseUnit || "")} · <b>Calculada:</b> ${esc(m.calculatedTotal || m.theoreticalQty || "")} ${esc(m.theoreticalUnit || "")} · <b>Usada real:</b> ${esc(m.qty)} ${esc(m.unit || "")} · <b>Costo final:</b> ${money(m.costCharged ?? (Number(m.qty || 0) * Number(m.unitCost || 0)))}</div><div class="help">${esc(m.calculationSummary || m.notes || "")}</div><div class="actions"><button class="btn small" data-med-action="edit" data-id="${esc(m.id)}">Editar</button><button class="btn small bad" data-med-action="remove" data-id="${esc(m.id)}">Eliminar</button><button class="btn small" data-med-action="duplicate" data-id="${esc(m.id)}">Duplicar</button></div></div>`).join("") : `<div class="help">${emptyLabel}</div>`);
  list.querySelectorAll("[data-med-action]").forEach((btn) => btn.addEventListener("click", () => {
    const item = (state.draft.procedureMedUses || []).find((x) => x.id === btn.dataset.id); if (!item) return;
    if (btn.dataset.medAction === "remove") state.draft.procedureMedUses = state.draft.procedureMedUses.filter((x) => x.id !== item.id);
    if (btn.dataset.medAction === "duplicate") { const copy = { ...item, id: uid("pmed"), applicationNumber: (Number(item.applicationNumber || 1) + 1), name: `${(item.name || "Producto").replace(/ — aplicación \d+$/, "")} — aplicación ${(Number(item.applicationNumber || 1) + 1)}` }; state.draft.procedureMedUses.push(copy); }
    if (btn.dataset.medAction === "edit") { showProcedureManualMedEditor(true); state.draft.procedureMedUseEditId = item.id; if ($("#p_productType")) $("#p_productType").value = item.productType || "MEDICAMENTO"; populateProcedureProductSelect(); if ($("#p_medSelect")) $("#p_medSelect").value = item.itemId || ""; if ($("#p_medSpecies")) $("#p_medSpecies").value = item.species || ""; if ($("#p_medAdministrationType")) $("#p_medAdministrationType").value = item.administrationType || item.route || "Otro"; if ($("#p_medBaseAmount")) $("#p_medBaseAmount").value = item.baseAmount || ""; if ($("#p_medBaseUnit")) $("#p_medBaseUnit").value = item.baseUnit || "kg"; syncProcedureDoseProfileOptions(); if ($("#p_medDoseProfile")) $("#p_medDoseProfile").value = item.structuredDoseIndex || ""; if ($("#p_medCalculationRule")) $("#p_medCalculationRule").value = item.calculationMode || "MANUAL"; if ($("#p_medDoseBase")) $("#p_medDoseBase").value = item.doseBase || ""; if ($("#p_medDoseUnit")) $("#p_medDoseUnit").value = item.doseUnit || item.theoreticalUnit || ""; if ($("#p_medPorCada")) $("#p_medPorCada").value = item.porCada || 1; if ($("#p_medUnitBaseDose")) $("#p_medUnitBaseDose").value = item.unitBase || item.baseUnit || doseRuleDenominator(item.calculationMode); if ($("#p_medCalculatedTotal")) $("#p_medCalculatedTotal").value = item.calculatedTotal || item.theoreticalQty || ""; if ($("#p_medDoseKg")) $("#p_medDoseKg").value = item.qty || ""; if ($("#p_medUnitUsed")) $("#p_medUnitUsed").value = item.unit || ""; if ($("#p_medCostSuggested")) $("#p_medCostSuggested").value = item.costSuggested ?? (Number(item.qty || 0) * Number(item.unitCost || 0)); if ($("#p_medCostCharged")) { $("#p_medCostCharged").value = item.costCharged ?? item.priceCharged ?? item.costSuggested ?? ""; $("#p_medCostCharged").dataset.manual = "1"; } if ($("#p_medNotes")) $("#p_medNotes").value = item.notes || item.calculationSummary || ""; renderProcedureManualDoseCard(item.doseSource === "PROCEDURE_MANUAL"); }
    renderProcedureDraftLists();
  }));
}
function renderProcedureSpeciesDoseList() {
  const list = $("#p_speciesDoseList");
  if (!list) return;
  const rows = state.draft.procedureSpeciesDoses || [];
  list.innerHTML = rows.length
    ? rows.map((row) => `<div class="item"><div class="line">${esc(speciesDoseSummary(row))}</div></div>`).join("")
    : '<div class="help">Sin dosis JSON validadas para este procedimiento.</div>';
}
function resetClinicalDayEditor(keepDate = true) {
  const keep = keepDate ? { date: $("#p_cc_dayDate")?.value || "", hour: $("#p_cc_dayHour")?.value || "", notes: $("#p_cc_dayNotes")?.value || "" } : {};
  ["p_cc_dayMedSelect", "p_cc_dayMedName", "p_cc_dayDoseSelect", "p_cc_dayMedRoute", "p_cc_dayIndication", "p_cc_dayDoseQty", "p_cc_dayDoseUnit", "p_cc_dayPerKg", "p_cc_dayUnitBase", "p_cc_dayFrequency", "p_cc_dayDuration", "p_cc_dayMedObs", "p_cc_dayTheoreticalDose", "p_cc_dayAdminDose", "p_cc_dayAdminUnit", "p_cc_dayMedCostSuggested", "p_cc_dayMedCostCharged", "p_cc_dayCalcNote", "p_cc_daySupplySelect", "p_cc_daySupplyName", "p_cc_daySupplyQty", "p_cc_daySupplyUnit", "p_cc_daySupplyUnitCost", "p_cc_daySupplyCostSuggested", "p_cc_daySupplyCostCharged", "p_cc_daySupplyObs"].forEach((id) => { if ($("#" + id)) $("#" + id).value = ""; });
  state.draft.procedureClinicalDayEditId = null;
  syncClinicalDayMedicationSelection();
  syncClinicalDaySupplySelection();
  if (!keepDate) ["p_cc_dayDate", "p_cc_dayHour", "p_cc_dayNotes"].forEach((id) => { if ($("#" + id)) $("#" + id).value = ""; });
  else {
    if ($("#p_cc_dayDate")) $("#p_cc_dayDate").value = keep.date;
    if ($("#p_cc_dayHour")) $("#p_cc_dayHour").value = keep.hour;
    if ($("#p_cc_dayNotes")) $("#p_cc_dayNotes").value = keep.notes;
  }
  updateClinicalDaySaveButton();
}
function updateClinicalDaySaveButton() {
  const btn = $("#p_cc_addClinicalDay");
  if (!btn) return;
  btn.textContent = state.draft.procedureClinicalDayEditId ? "💾 Guardar cambios del día" : "➕ Agregar día de seguimiento";
}

function clinicalMedicationOptionLabel(m) {
  return [
    m.brand || "Medicamento",
    m.active ? `Activo: ${m.active}` : "Sin sustancia activa",
    m.presentation || m.stockType || "Sin presentación",
    `Existencia: ${Number(medRemaining(m) || 0).toFixed(2)} ${m.unit || ""}`.trim(),
    `Pertenece a: ${medOwnerLabel(m.owner || "SERVICIOS") || "Sin propietario"}`,
    `Vía: ${m.route || "Sin vía"}`,
    `Costo: ${money(m.unitCost || 0)}/${m.unit || "u"}`,
  ].join(" · ");
}
function clinicalSupplyOptionLabel(s) {
  return [
    s.name || "Insumo",
    s.type === "NON_DISPOSABLE" ? "No desechable" : "Desechable",
    `Existencia: ${supplyRemaining(s)} ${s.type === "NON_DISPOSABLE" ? "" : "pzas"}`.trim(),
    `Pertenece a: ${medOwnerLabel(s.owner || "SERVICIOS")}`,
    `Costo: ${money(supplyDisplayCost(s))}/${s.type === "NON_DISPOSABLE" ? "uso" : "pieza"}`,
  ].join(" · ");
}
function populateClinicalDayInventorySelectors() {
  const medSelect = $("#p_cc_dayMedSelect");
  if (medSelect) {
    const prev = medSelect.value || "";
    medSelect.innerHTML = '<option value="">— Selecciona medicamento de inventario —</option><option value="__EXTERNAL__">Uso externo/no inventariado</option>' + state.meds.map((m) => `<option value="${m.id}">${esc(clinicalMedicationOptionLabel(m))}</option>`).join("");
    medSelect.value = state.meds.some((m) => m.id === prev) || prev === "__EXTERNAL__" ? prev : "";
  }
  const supplySelect = $("#p_cc_daySupplySelect");
  if (supplySelect) {
    const prev = supplySelect.value || "";
    supplySelect.innerHTML = '<option value="">— Selecciona insumo de inventario —</option><option value="__EXTERNAL__">Uso externo/no inventariado</option>' + state.supplies.map((sup) => `<option value="${sup.id}">${esc(clinicalSupplyOptionLabel(sup))}</option>`).join("");
    supplySelect.value = state.supplies.some((sup) => sup.id === prev) || prev === "__EXTERNAL__" ? prev : "";
  }
  syncClinicalDayMedicationSelection();
  syncClinicalDaySupplySelection();
}
function clinicalDoseRowsForMedication(med) {
  const rows = (med?.speciesDoses || []).map((row) => normalizeDoseRow(row)).filter((row) => row.species || row.dose || row.doseUnit || row.indication);
  const species = normalizeSpeciesRef($("#p_cc_species")?.value || "");
  if (!species) return rows;
  const matching = rows.filter((row) => normalizeSpeciesRef(row.species) === species);
  return matching.length ? matching : rows;
}
function syncClinicalDayDoseOptions(med) {
  const doseSelect = $("#p_cc_dayDoseSelect");
  if (!doseSelect) return;
  const rows = clinicalDoseRowsForMedication(med);
  doseSelect.innerHTML = '<option value="">— Dosis manual/editable —</option>' + rows.map((row, index) => `<option value="${index}">${esc(speciesDoseSummary(row))}</option>`).join("");
  doseSelect.dataset.medicationId = med?.id || "";
  doseSelect.dataset.doses = JSON.stringify(rows);
}
function applyClinicalDoseSelection() {
  const doseSelect = $("#p_cc_dayDoseSelect");
  const med = byId(state.meds, $("#p_cc_dayMedSelect")?.value || "");
  const rows = JSON.parse(doseSelect?.dataset.doses || "[]");
  if (!doseSelect || doseSelect.value === "") {
    renderMedicationDosingReference({ med, hasStructuredDose: rows.length > 0, selectedManual: true, cardId: "p_cc_dayDosingReferenceCard", textId: "p_cc_dayDosingReferenceText" });
    return;
  }
  renderMedicationDosingReference({ med, hasStructuredDose: rows.length > 0, selectedManual: false, cardId: "p_cc_dayDosingReferenceCard", textId: "p_cc_dayDosingReferenceText" });
  const row = normalizeDoseRow(rows[Number(doseSelect.value)] || {});
  if ($("#p_cc_dayIndication")) $("#p_cc_dayIndication").value = row.indication || "";
  if ($("#p_cc_dayDoseQty")) $("#p_cc_dayDoseQty").value = row.dose || "";
  if ($("#p_cc_dayDoseUnit")) $("#p_cc_dayDoseUnit").value = row.doseUnit || "";
  if ($("#p_cc_dayPerKg")) $("#p_cc_dayPerKg").value = row.porCada || "";
  if ($("#p_cc_dayUnitBase")) $("#p_cc_dayUnitBase").value = row.unitBase || doseRuleDenominator(row.calculationMode) || "";
  if ($("#p_cc_dayFrequency")) $("#p_cc_dayFrequency").value = row.frequency || "";
  if ($("#p_cc_dayDuration")) $("#p_cc_dayDuration").value = row.duration || "";
  if ($("#p_cc_dayMedObs")) $("#p_cc_dayMedObs").value = row.notes || "";
}
function syncClinicalDayMedicationCalculation({ preserveCharged = false } = {}) {
  const selected = $("#p_cc_dayMedSelect")?.value || "";
  const med = byId(state.meds, selected);
  const external = selected === "__EXTERNAL__";
  const indicatedDoseQty = Number($("#p_cc_dayDoseQty")?.value || 0);
  const indicatedDoseUnit = $("#p_cc_dayDoseUnit")?.value || med?.unit || "";
  const perCada = $("#p_cc_dayPerKg")?.value || "";
  const unitBase = $("#p_cc_dayUnitBase")?.value.trim() || "";
  let draft = !external && med
    ? buildClinicalDayMedicationDoseDraft(med, { doseQty: indicatedDoseQty, doseUnit: indicatedDoseUnit, perCada, unitBase })
    : { administeredQty: indicatedDoseQty, administeredUnit: indicatedDoseUnit, theoreticalQty: indicatedDoseQty, theoreticalUnit: indicatedDoseUnit, calculationSummary: "Uso externo/no inventariado o dosis manual." };
  const theoreticalManual = $("#p_cc_dayTheoreticalDose")?.dataset.manual;
  const theoretical = Number(theoreticalManual ? ($("#p_cc_dayTheoreticalDose")?.value || 0) : (draft.theoreticalQty ?? indicatedDoseQty ?? 0));
  if (theoreticalManual && med && !external) {
    const converted = calculateConvertedMedicationDose({ med, theoreticalQty: theoretical, theoreticalUnit: indicatedDoseUnit || med.unit || "", rule: "MANUAL", basisValue: 0, basisLabel: "Dosis total teórica editada manualmente" });
    draft = { ...draft, theoreticalQty: theoretical, administeredQty: converted.convertedQty || theoretical, administeredUnit: converted.convertedUnit || med.unit || indicatedDoseUnit, calculationSummary: converted.explanation || draft.calculationSummary, warning: converted.warning || "", conversionApplied: Boolean(converted.conversionApplied) };
  }
  const administered = Number($("#p_cc_dayAdminDose")?.value || draft.administeredQty || 0);
  const adminUnit = $("#p_cc_dayAdminUnit")?.value.trim() || draft.administeredUnit || med?.unit || indicatedDoseUnit || "";
  const unitCost = external ? 0 : Number(med?.unitCost || 0);
  const suggested = Number((administered * unitCost).toFixed(2));
  if ($("#p_cc_dayTheoreticalDose")) $("#p_cc_dayTheoreticalDose").value = Number(theoretical || 0).toFixed(4).replace(/\.?0+$/, "");
  if ($("#p_cc_dayAdminDose") && !$("#p_cc_dayAdminDose").dataset.manual) $("#p_cc_dayAdminDose").value = Number(draft.administeredQty || 0).toFixed(4).replace(/\.?0+$/, "");
  if ($("#p_cc_dayAdminUnit") && !$("#p_cc_dayAdminUnit").value) $("#p_cc_dayAdminUnit").value = adminUnit;
  if ($("#p_cc_dayMedCostSuggested")) $("#p_cc_dayMedCostSuggested").value = suggested.toFixed(2);
  if ($("#p_cc_dayMedCostCharged") && (!preserveCharged || !$("#p_cc_dayMedCostCharged").dataset.manual)) $("#p_cc_dayMedCostCharged").value = suggested.toFixed(2);
  if ($("#p_cc_dayCalcNote")) $("#p_cc_dayCalcNote").value = [draft.calculationSummary || "", draft.warning || ""].filter(Boolean).join(" · ");
}
function syncClinicalDaySupplyCost({ preserveCharged = false } = {}) {
  const supply = byId(state.supplies, $("#p_cc_daySupplySelect")?.value || "");
  const external = $("#p_cc_daySupplySelect")?.value === "__EXTERNAL__";
  const qty = Number($("#p_cc_daySupplyQty")?.value || 0);
  const unitCost = external ? Number($("#p_cc_daySupplyUnitCost")?.value || 0) : Number(supply ? supplyDisplayCost(supply) : 0);
  const suggested = Number((qty * unitCost).toFixed(2));
  if ($("#p_cc_daySupplyUnit") && !$("#p_cc_daySupplyUnit").value) $("#p_cc_daySupplyUnit").value = supply ? (supply.type === "NON_DISPOSABLE" ? "uso" : "pieza") : "";
  if ($("#p_cc_daySupplyUnitCost") && !$("#p_cc_daySupplyUnitCost").dataset.manual) $("#p_cc_daySupplyUnitCost").value = unitCost ? unitCost.toFixed(2) : "";
  if ($("#p_cc_daySupplyCostSuggested")) $("#p_cc_daySupplyCostSuggested").value = suggested.toFixed(2);
  if ($("#p_cc_daySupplyCostCharged") && (!preserveCharged || !$("#p_cc_daySupplyCostCharged").dataset.manual)) $("#p_cc_daySupplyCostCharged").value = suggested.toFixed(2);
}
function syncClinicalDayMedicationSelection() {
  const selected = $("#p_cc_dayMedSelect")?.value || "";
  const med = byId(state.meds, selected);
  const external = selected === "__EXTERNAL__";
  const externalInput = $("#p_cc_dayMedName");
  if (externalInput) {
    externalInput.disabled = !external;
    if (!external) externalInput.value = "";
  }
  if ($("#p_cc_dayMedRoute")) $("#p_cc_dayMedRoute").value = med?.route || "";
  if ($("#p_cc_dayMedInfo")) $("#p_cc_dayMedInfo").textContent = med ? clinicalMedicationOptionLabel(med) : external ? "Uso externo/no inventariado: no descuenta existencias ni genera deuda." : "Selecciona un medicamento para ver nombre comercial, sustancia activa, existencia, unidad, costo, pertenencia y dosis.";
  syncClinicalDayDoseOptions(med);
  if (med) {
    if ($("#p_cc_dayDoseUnit") && !$("#p_cc_dayDoseUnit").value) $("#p_cc_dayDoseUnit").value = med.unit || "";
    if ($("#p_cc_dayAdminUnit") && !$("#p_cc_dayAdminUnit").value) $("#p_cc_dayAdminUnit").value = med.unit || "";
    const rows = clinicalDoseRowsForMedication(med);
    if (rows.length && $("#p_cc_dayDoseSelect")) {
      $("#p_cc_dayDoseSelect").value = "0";
      applyClinicalDoseSelection();
    } else {
      renderMedicationDosingReference({ med, hasStructuredDose: false, selectedManual: true, cardId: "p_cc_dayDosingReferenceCard", textId: "p_cc_dayDosingReferenceText" });
    }
  } else {
    renderMedicationDosingReference({ med: null, cardId: "p_cc_dayDosingReferenceCard", textId: "p_cc_dayDosingReferenceText" });
  }
  ["p_cc_dayAdminDose", "p_cc_dayMedCostCharged"].forEach((id) => { const el = $("#" + id); if (el) delete el.dataset.manual; });
  syncClinicalDayMedicationCalculation();
}
function syncClinicalDaySupplySelection() {
  const selected = $("#p_cc_daySupplySelect")?.value || "";
  const supply = byId(state.supplies, selected);
  const external = selected === "__EXTERNAL__";
  const externalInput = $("#p_cc_daySupplyName");
  if (externalInput) {
    externalInput.disabled = !external;
    if (!external) externalInput.value = "";
  }
  if ($("#p_cc_daySupplyInfo")) $("#p_cc_daySupplyInfo").textContent = supply ? clinicalSupplyOptionLabel(supply) : external ? "Uso externo/no inventariado: no descuenta existencias ni genera deuda." : "Selecciona un insumo para ver categoría, existencia, unidad, costo y pertenencia.";
  ["p_cc_daySupplyUnitCost", "p_cc_daySupplyCostCharged"].forEach((id) => { const el = $("#" + id); if (el) delete el.dataset.manual; });
  syncClinicalDaySupplyCost();
}
function buildClinicalDayMedicationDoseDraft(med, { doseQty = 0, doseUnit = "", perCada = 0, unitBase = "" } = {}) {
  const context = getProcedureFollowupAnimalContext();
  const baseUnit = normalizeUnitToken(unitBase || "");
  const mode = baseUnit === "kg" || /kilo/.test(baseUnit)
    ? "PER_KG"
    : baseUnit === "animal" || /animal|paciente/.test(baseUnit)
      ? "PER_ANIMAL"
      : "MANUAL";
  const denominator = Number(perCada || 0) > 0 ? Number(perCada || 0) : 1;
  if (mode === "PER_KG" && !(Number(context.weightKg || 0) > 0)) return { warning: "Falta el peso del paciente; captura peso antes de calcular dosis mg/kg." };
  const basisValue = mode === "PER_KG" ? Number(context.weightKg || 0) : mode === "PER_ANIMAL" ? 1 : 0;
  const theoreticalQty = mode === "PER_KG" || mode === "PER_ANIMAL" ? Number(doseQty || 0) * (basisValue / denominator) : Number(doseQty || 0);
  const converted = calculateConvertedMedicationDose({
    med,
    theoreticalQty,
    theoreticalUnit: doseUnit || med?.unit || "",
    rule: mode,
    basisValue,
    basisLabel: mode === "PER_KG" ? `Peso del paciente usado: ${Number(context.weightKg || 0).toFixed(2)} kg` : mode === "PER_ANIMAL" ? "Base aplicada: 1 animal" : "Dosis indicada como total",
  });
  const hasConversionWarning = Boolean(converted?.warning);
  return {
    mode,
    perCada: denominator,
    weightKg: Number(context.weightKg || 0),
    theoreticalQty: Number(theoreticalQty.toFixed(4)),
    theoreticalUnit: canonicalUnit(doseUnit || med?.unit || ""),
    administeredQty: Number(converted?.convertedQty || 0),
    administeredUnit: converted?.convertedUnit || med?.unit || "",
    requiredActiveQty: Number(converted?.requiredActiveQty || theoreticalQty || 0),
    requiredActiveUnit: converted?.requiredActiveUnit || canonicalUnit(doseUnit || med?.unit || ""),
    calculationSummary: converted?.explanation || "",
    conversionApplied: Boolean(converted?.conversionApplied),
    warning: hasConversionWarning ? converted.warning : "",
  };
}

function ownerCreatesDebt(owner) {
  return owner && owner !== "SERVICIOS";
}
function clinicalInventoryFromDays(days = []) {
  const meds = [];
  const supplies = [];
  (days || []).forEach((day) => {
    (day.medications || []).forEach((item) => {
      if (!item.itemId || item.external) return;
      const med = byId(state.meds, item.itemId);
      if (!med) return;
      const applied = resolveMedicationAppliedAmount({ med, qty: item.administeredQty ?? item.doseQty ?? 0, unit: item.administeredUnit || item.doseUnit || med.unit || "" });
      meds.push({
        id: item.id || uid("ccmed"), itemId: med.id, name: med.brand, unit: applied.unit || med.unit || "", unitCost: Number(item.unitCost ?? med.unitCost ?? 0), costSuggested: item.costSuggested ?? Number(applied.qty || 0) * Number(item.unitCost ?? med.unitCost ?? 0), costCharged: item.costCharged ?? item.priceCharged ?? item.costSuggested, owner: med.owner || "SERVICIOS", route: med.route || "", theoreticalQty: Number(item.theoreticalQty ?? item.indicatedDoseQty ?? item.doseQty ?? 0), theoreticalUnit: item.theoreticalUnit || item.indicatedDoseUnit || item.doseUnit || med.unit || "", qty: Number(applied.qty || 0), totalUsedQty: Number(applied.qty || 0), inventoryDeductionQty: Number(applied.qty || 0), inventoryDeductionUnit: applied.unit || med.unit || "", chargeableQty: Number(applied.qty || 0), source: "CLINICAL_DAY", applicationDate: day.date, notes: item.observations || "", calculationSummary: item.calculationSummary || item.indication || "Día de medicación / seguimiento",
      });
    });
    (day.supplies || []).forEach((item) => {
      if (!item.itemId || item.external) return;
      const sup = byId(state.supplies, item.itemId);
      if (!sup) return;
      supplies.push({ id: item.id || uid("ccsup"), itemId: sup.id, name: sup.name, qty: Number(item.qty || 0), unit: item.unit || (sup.type === "NON_DISPOSABLE" ? "uso" : "pieza"), notes: item.observations || "", type: sup.type, unitCost: Number(item.unitCost ?? supplyDisplayCost(sup)), costSuggested: item.costSuggested ?? Number(item.qty || 0) * Number(item.unitCost ?? supplyDisplayCost(sup)), costCharged: item.costCharged ?? item.priceCharged ?? item.costSuggested, owner: sup.owner || "SERVICIOS", source: "CLINICAL_DAY", applicationDate: day.date });
    });
  });
  return { meds, supplies };
}
function nextDateValue(dateValue) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
function cloneClinicalDayMedication(item = {}) {
  const med = byId(state.meds, item.itemId);
  return { ...item, id: uid("ccmed"), route: med?.route || item.route || "" };
}
function cloneClinicalDaySupply(item = {}) {
  return { ...item, id: uid("ccsup") };
}
function cloneClinicalDay(day = {}, overrides = {}) {
  return {
    ...day,
    id: uid("ccday"),
    date: overrides.date ?? nextDateValue(day.date),
    hour: overrides.hour ?? (day.hour || ""),
    medications: (day.medications || []).map(cloneClinicalDayMedication),
    supplies: (day.supplies || []).map(cloneClinicalDaySupply),
    observations: day.observations || "",
  };
}
function fillClinicalDayMedicationForm(item = {}) {
  if ($("#p_cc_dayMedSelect")) $("#p_cc_dayMedSelect").value = item.external ? "__EXTERNAL__" : (item.itemId || "");
  syncClinicalDayMedicationSelection();
  if ($("#p_cc_dayMedName")) $("#p_cc_dayMedName").value = item.external ? (item.name || "") : "";
  if ($("#p_cc_dayDoseSelect")) $("#p_cc_dayDoseSelect").value = "";
  if ($("#p_cc_dayMedRoute")) $("#p_cc_dayMedRoute").value = byId(state.meds, item.itemId)?.route || item.route || "";
  if ($("#p_cc_dayIndication")) $("#p_cc_dayIndication").value = item.indication || "";
  if ($("#p_cc_dayDoseQty")) $("#p_cc_dayDoseQty").value = item.indicatedDoseQty ?? item.doseQty ?? "";
  if ($("#p_cc_dayDoseUnit")) $("#p_cc_dayDoseUnit").value = item.indicatedDoseUnit || item.theoreticalUnit || item.doseUnit || "";
  if ($("#p_cc_dayPerKg")) $("#p_cc_dayPerKg").value = item.perKg || "";
  if ($("#p_cc_dayUnitBase")) $("#p_cc_dayUnitBase").value = item.unitBase || "";
  if ($("#p_cc_dayFrequency")) $("#p_cc_dayFrequency").value = item.frequency || "";
  if ($("#p_cc_dayDuration")) $("#p_cc_dayDuration").value = item.duration || "";
  if ($("#p_cc_dayMedObs")) $("#p_cc_dayMedObs").value = item.observations || "";
  if ($("#p_cc_dayTheoreticalDose")) $("#p_cc_dayTheoreticalDose").value = item.theoreticalQty ?? "";
  if ($("#p_cc_dayAdminDose")) { $("#p_cc_dayAdminDose").value = item.administeredQty ?? item.doseQty ?? ""; $("#p_cc_dayAdminDose").dataset.manual = "1"; }
  if ($("#p_cc_dayAdminUnit")) $("#p_cc_dayAdminUnit").value = item.administeredUnit || item.doseUnit || "";
  if ($("#p_cc_dayMedCostSuggested")) $("#p_cc_dayMedCostSuggested").value = item.costSuggested ?? "";
  if ($("#p_cc_dayMedCostCharged")) { $("#p_cc_dayMedCostCharged").value = item.costCharged ?? item.priceCharged ?? item.costSuggested ?? ""; $("#p_cc_dayMedCostCharged").dataset.manual = "1"; }
  if ($("#p_cc_dayCalcNote")) $("#p_cc_dayCalcNote").value = item.calculationSummary || "";
}
function fillClinicalDaySupplyForm(item = {}) {
  if ($("#p_cc_daySupplySelect")) $("#p_cc_daySupplySelect").value = item.external ? "__EXTERNAL__" : (item.itemId || "");
  syncClinicalDaySupplySelection();
  if ($("#p_cc_daySupplyName")) $("#p_cc_daySupplyName").value = item.external ? (item.name || "") : "";
  if ($("#p_cc_daySupplyQty")) $("#p_cc_daySupplyQty").value = item.qty || "";
  if ($("#p_cc_daySupplyUnit")) $("#p_cc_daySupplyUnit").value = item.unit || "";
  if ($("#p_cc_daySupplyUnitCost")) { $("#p_cc_daySupplyUnitCost").value = item.unitCost ?? ""; $("#p_cc_daySupplyUnitCost").dataset.manual = "1"; }
  if ($("#p_cc_daySupplyCostSuggested")) $("#p_cc_daySupplyCostSuggested").value = item.costSuggested ?? "";
  if ($("#p_cc_daySupplyCostCharged")) { $("#p_cc_daySupplyCostCharged").value = item.costCharged ?? item.priceCharged ?? item.costSuggested ?? ""; $("#p_cc_daySupplyCostCharged").dataset.manual = "1"; }
  if ($("#p_cc_daySupplyObs")) $("#p_cc_daySupplyObs").value = item.observations || "";
}
function editClinicalDayMedication(id) {
  const idx = (state.draft.procedureClinicalDayMedications || []).findIndex((item) => item.id === id);
  if (idx < 0) return;
  const [item] = state.draft.procedureClinicalDayMedications.splice(idx, 1);
  fillClinicalDayMedicationForm(item);
  renderProcedureDraftLists();
  show("p_msg", "Medicamento cargado para editar. Ajusta los datos y vuelve a agregarlo al día.", "warning");
}
function editClinicalDaySupply(id) {
  const idx = (state.draft.procedureClinicalDaySupplies || []).findIndex((item) => item.id === id);
  if (idx < 0) return;
  const [item] = state.draft.procedureClinicalDaySupplies.splice(idx, 1);
  fillClinicalDaySupplyForm(item);
  renderProcedureDraftLists();
  show("p_msg", "Insumo cargado para editar. Ajusta los datos y vuelve a agregarlo al día.", "warning");
}
function loadClinicalDayForEdit(dayId) {
  const day = (state.draft.procedureClinicalDays || []).find((item) => item.id === dayId);
  if (!day) return;
  state.draft.procedureClinicalDayEditId = day.id;
  if ($("#p_cc_dayDate")) $("#p_cc_dayDate").value = day.date || "";
  if ($("#p_cc_dayHour")) $("#p_cc_dayHour").value = day.hour || "";
  if ($("#p_cc_dayNotes")) $("#p_cc_dayNotes").value = day.observations || "";
  state.draft.procedureClinicalDayMedications = (day.medications || []).map((item) => ({ ...item }));
  state.draft.procedureClinicalDaySupplies = (day.supplies || []).map((item) => ({ ...item }));
  updateClinicalDaySaveButton();
  renderProcedureDraftLists();
  show("p_msg", "Día de medicación cargado para editar. Guarda los cambios del día antes de guardar el procedimiento.", "warning");
}
function duplicateClinicalDay(dayId) {
  const original = (state.draft.procedureClinicalDays || []).find((item) => item.id === dayId);
  if (!original) return;
  const duplicated = cloneClinicalDay(original);
  state.draft.procedureClinicalDays.push(duplicated);
  loadClinicalDayForEdit(duplicated.id);
  show("p_msg", "Tratamiento duplicado. Revisa fecha, hora, cantidades, medicamentos e insumos antes de guardar el procedimiento.", "success");
}
function addClinicalDayMedication() {
  const selected = $("#p_cc_dayMedSelect")?.value || "";
  const med = byId(state.meds, selected);
  const external = selected === "__EXTERNAL__";
  const name = external ? ($("#p_cc_dayMedName")?.value.trim() || "") : (med?.brand || "");
  if (!name) return show("p_msg", "Selecciona un medicamento o captura uso externo.", "warning");
  const indicatedDoseQty = Number($("#p_cc_dayDoseQty")?.value || 0);
  if (indicatedDoseQty <= 0) return show("p_msg", "Captura cantidad usada/dosis del medicamento.", "warning");
  const indicatedDoseUnit = $("#p_cc_dayDoseUnit")?.value || med?.unit || "";
  const perCada = $("#p_cc_dayPerKg")?.value || "";
  const unitBase = $("#p_cc_dayUnitBase")?.value.trim() || "";
  const doseDraft = !external && med
    ? buildClinicalDayMedicationDoseDraft(med, { doseQty: indicatedDoseQty, doseUnit: indicatedDoseUnit, perCada, unitBase })
    : { administeredQty: indicatedDoseQty, administeredUnit: indicatedDoseUnit, theoreticalQty: indicatedDoseQty, theoreticalUnit: indicatedDoseUnit, calculationSummary: "Uso externo/no inventariado o dosis manual." };
  const theoreticalQty = Number($("#p_cc_dayTheoreticalDose")?.value || doseDraft.theoreticalQty || indicatedDoseQty || 0);
  const administeredQty = Number($("#p_cc_dayAdminDose")?.value || doseDraft.administeredQty || indicatedDoseQty || 0);
  const administeredUnit = $("#p_cc_dayAdminUnit")?.value.trim() || doseDraft.administeredUnit || indicatedDoseUnit;
  const unitCost = med ? Number(med.unitCost || 0) : 0;
  const costSuggested = Number($("#p_cc_dayMedCostSuggested")?.value || (administeredQty * unitCost).toFixed(2));
  const costCharged = Number($("#p_cc_dayMedCostCharged")?.value || costSuggested || 0);
  const calculationSummary = $("#p_cc_dayCalcNote")?.value.trim() || doseDraft.calculationSummary || "";
  const conversionWarning = doseDraft.warning || "";
  state.draft.procedureClinicalDayMedications.push({
    id: uid("ccmed"),
    itemId: med?.id || "",
    external,
    name,
    active: med?.active || "",
    indication: $("#p_cc_dayIndication")?.value.trim() || "",
    indicatedDoseQty,
    indicatedDoseUnit,
    doseQty: administeredQty,
    doseUnit: administeredUnit,
    theoreticalQty,
    theoreticalUnit: doseDraft.theoreticalUnit || indicatedDoseUnit,
    administeredQty,
    administeredUnit,
    requiredActiveQty: doseDraft.requiredActiveQty ?? indicatedDoseQty,
    requiredActiveUnit: doseDraft.requiredActiveUnit || indicatedDoseUnit,
    unitCost,
    costSuggested,
    costCharged,
    priceCharged: costCharged,
    calculationSummary: [calculationSummary, conversionWarning].filter(Boolean).join(" · "),
    conversionWarning,
    conversionApplied: Boolean(doseDraft.conversionApplied),
    weightKg: doseDraft.weightKg || 0,
    perKg: perCada,
    unitBase,
    route: med?.route || $("#p_cc_dayMedRoute")?.value.trim() || "",
    frequency: $("#p_cc_dayFrequency")?.value.trim() || "",
    duration: $("#p_cc_dayDuration")?.value.trim() || "",
    observations: $("#p_cc_dayMedObs")?.value.trim() || "",
  });
  ["p_cc_dayMedSelect", "p_cc_dayMedName", "p_cc_dayDoseSelect", "p_cc_dayMedRoute", "p_cc_dayIndication", "p_cc_dayDoseQty", "p_cc_dayDoseUnit", "p_cc_dayPerKg", "p_cc_dayUnitBase", "p_cc_dayFrequency", "p_cc_dayDuration", "p_cc_dayMedObs", "p_cc_dayTheoreticalDose", "p_cc_dayAdminDose", "p_cc_dayAdminUnit", "p_cc_dayMedCostSuggested", "p_cc_dayMedCostCharged", "p_cc_dayCalcNote"].forEach((id) => { if ($("#" + id)) { $("#" + id).value = ""; delete $("#" + id).dataset.manual; } });
  syncClinicalDayMedicationSelection();
  renderProcedureDraftLists();
  if (conversionWarning) show("p_msg", conversionWarning, "warning");
}

function addClinicalDaySupply() {
  const selected = $("#p_cc_daySupplySelect")?.value || "";
  const supply = byId(state.supplies, selected);
  const external = selected === "__EXTERNAL__";
  const name = external ? ($("#p_cc_daySupplyName")?.value.trim() || "") : (supply?.name || "");
  if (!name) return show("p_msg", "Selecciona un insumo o captura uso externo.", "warning");
  const qty = Number($("#p_cc_daySupplyQty")?.value || 0);
  if (qty <= 0) return show("p_msg", "Captura cantidad de insumo.", "warning");
  const unitCost = Number($("#p_cc_daySupplyUnitCost")?.value || (supply ? supplyDisplayCost(supply) : 0));
  const costSuggested = Number($("#p_cc_daySupplyCostSuggested")?.value || (qty * unitCost).toFixed(2));
  const costCharged = Number($("#p_cc_daySupplyCostCharged")?.value || costSuggested || 0);
  state.draft.procedureClinicalDaySupplies.push({ id: uid("ccsup"), itemId: supply?.id || "", external, name, qty, unit: $("#p_cc_daySupplyUnit")?.value.trim() || (supply?.type === "NON_DISPOSABLE" ? "uso" : "pieza"), costSuggested, costCharged, priceCharged: costCharged, observations: $("#p_cc_daySupplyObs")?.value.trim() || "", type: supply?.type || "EXTERNAL", unitCost, owner: supply?.owner || "", stockBefore: supply ? supplyRemaining(supply) : "" });
  ["p_cc_daySupplySelect", "p_cc_daySupplyName", "p_cc_daySupplyQty", "p_cc_daySupplyUnit", "p_cc_daySupplyUnitCost", "p_cc_daySupplyCostSuggested", "p_cc_daySupplyCostCharged", "p_cc_daySupplyObs"].forEach((id) => { if ($("#" + id)) { $("#" + id).value = ""; delete $("#" + id).dataset.manual; } });
  syncClinicalDaySupplySelection();
  renderProcedureDraftLists();
}
function persistActiveClinicalDayEdit() {
  const editId = state.draft.procedureClinicalDayEditId;
  if (!editId) return true;
  if (!state.draft.procedureClinicalDayMedications.length && !state.draft.procedureClinicalDaySupplies.length) return false;
  const idx = (state.draft.procedureClinicalDays || []).findIndex((item) => item.id === editId);
  const updated = {
    id: editId,
    date: $("#p_cc_dayDate")?.value || "",
    hour: $("#p_cc_dayHour")?.value || "",
    medications: state.draft.procedureClinicalDayMedications.map((item) => ({ ...item, route: byId(state.meds, item.itemId)?.route || item.route || "" })),
    supplies: state.draft.procedureClinicalDaySupplies.map((item) => ({ ...item })),
    observations: $("#p_cc_dayNotes")?.value.trim() || "",
  };
  if (idx >= 0) state.draft.procedureClinicalDays[idx] = updated;
  else state.draft.procedureClinicalDays.push(updated);
  return true;
}
function addClinicalDay() {
  if (!state.draft.procedureClinicalDayMedications.length && !state.draft.procedureClinicalDaySupplies.length) return show("p_msg", "Agrega al menos un medicamento o insumo al día.", "warning");
  const day = {
    id: state.draft.procedureClinicalDayEditId || uid("ccday"),
    date: $("#p_cc_dayDate")?.value || "",
    hour: $("#p_cc_dayHour")?.value || "",
    medications: state.draft.procedureClinicalDayMedications.map((item) => ({ ...item, route: byId(state.meds, item.itemId)?.route || item.route || "" })),
    supplies: state.draft.procedureClinicalDaySupplies.map((item) => ({ ...item })),
    observations: $("#p_cc_dayNotes")?.value.trim() || "",
  };
  const idx = (state.draft.procedureClinicalDays || []).findIndex((item) => item.id === day.id);
  if (idx >= 0) state.draft.procedureClinicalDays[idx] = day;
  else state.draft.procedureClinicalDays.push(day);
  state.draft.procedureClinicalDayMedications = [];
  state.draft.procedureClinicalDaySupplies = [];
  resetClinicalDayEditor(false);
  renderProcedureDraftLists();
}
function renderClinicalDayItemDraftList(listId, arr, titleFn, editAttr, removeAttr) {
  const list = $(listId);
  if (!list) return;
  list.innerHTML = arr.length ? arr.map((item) => `<div class="item"><div class="line">${esc(titleFn(item))}</div><div class="actions"><button class="btn small" type="button" ${editAttr}="${esc(item.id)}">Editar</button><button class="btn small bad" type="button" ${removeAttr}="${esc(item.id)}">Quitar</button></div></div>`).join("") : "";
  list.querySelectorAll(`[${editAttr}]`).forEach((btn) => btn.addEventListener("click", () => editAttr.includes("med") ? editClinicalDayMedication(btn.getAttribute(editAttr)) : editClinicalDaySupply(btn.getAttribute(editAttr))));
  list.querySelectorAll(`[${removeAttr}]`).forEach((btn) => btn.addEventListener("click", () => {
    const id = btn.getAttribute(removeAttr);
    if (removeAttr.includes("med")) state.draft.procedureClinicalDayMedications = (state.draft.procedureClinicalDayMedications || []).filter((item) => item.id !== id);
    else state.draft.procedureClinicalDaySupplies = (state.draft.procedureClinicalDaySupplies || []).filter((item) => item.id !== id);
    renderProcedureDraftLists();
  }));
}
function renderClinicalDayDraftLists() {
  renderClinicalDayItemDraftList("#p_cc_dayMedicationDraftList", state.draft.procedureClinicalDayMedications || [], (x) => `${x.name} · indicada ${(x.indicatedDoseQty ?? x.doseQty) || ""} ${x.indicatedDoseUnit || x.doseUnit || ""}${x.perKg ? ` / cada ${x.perKg} ${x.unitBase || "kg"}` : ""} · total activo ${Number(x.requiredActiveQty ?? x.theoreticalQty ?? x.doseQty ?? 0).toFixed(2)} ${x.requiredActiveUnit || x.theoreticalUnit || x.doseUnit || ""} · administrable ${Number(x.administeredQty ?? x.doseQty ?? 0).toFixed(2)} ${x.administeredUnit || x.doseUnit || ""} · costo final ${money(x.costCharged ?? x.priceCharged ?? x.costSuggested ?? 0)} · ${x.route || "Sin vía"} · ${x.frequency || "Sin frecuencia"} · ${x.duration || "Sin duración"}${x.observations ? ` · ${x.observations}` : ""}${x.external ? " · externo/no inventariado" : ""}`, "data-edit-clinical-day-med", "data-remove-clinical-day-med");
  renderClinicalDayItemDraftList("#p_cc_daySupplyDraftList", state.draft.procedureClinicalDaySupplies || [], (x) => `${x.name} · ${x.qty || 0} ${x.unit || ""} · costo final ${money(x.costCharged ?? x.priceCharged ?? x.costSuggested ?? 0)}${x.observations ? ` · ${x.observations}` : ""}`, "data-edit-clinical-day-supply", "data-remove-clinical-day-supply");
  const list = $("#p_cc_clinicalDayList");
  if (!list) return;
  const days = state.draft.procedureClinicalDays || [];
  list.innerHTML = days.length ? days.map((day) => {
    const medRows = (day.medications || []).map((m, idx) => `<li><b>${idx + 1}. ${esc(m.name || "Medicamento")}</b><br><span class="help">Vía: ${esc(m.route || "")} · Dosis: ${esc([m.indicatedDoseQty ?? m.doseQty ?? "", m.indicatedDoseUnit || m.doseUnit || ""].filter((x) => x !== "").join(" "))}${m.perKg ? ` por cada ${esc(m.perKg)} ${esc(m.unitBase || "kg")}` : ""} · Dosis total teórica: ${esc([m.theoreticalQty ?? "", m.theoreticalUnit || ""].filter((x) => x !== "").join(" "))} · Dosis administrable: ${esc([m.administeredQty ?? m.doseQty ?? "", m.administeredUnit || m.doseUnit || ""].filter((x) => x !== "").join(" "))} · Costo final cobrado: ${money(m.costCharged ?? m.priceCharged ?? m.costSuggested ?? 0)}${m.external ? " · externo/no inventariado" : ""}</span></li>`).join("") || "<li>Sin medicamentos</li>";
    const supplyRows = (day.supplies || []).map((sup, idx) => `<li><b>${idx + 1}. ${esc(sup.name || "Insumo")}</b><br><span class="help">Cantidad: ${esc([sup.qty ?? "", sup.unit || ""].filter((x) => x !== "").join(" "))} · Costo final cobrado: ${money(sup.costCharged ?? sup.priceCharged ?? sup.costSuggested ?? 0)}${sup.external ? " · externo/no inventariado" : ""}</span></li>`).join("") || "<li>Sin insumos</li>";
    return `<div class="item"><h4>Día de medicación / seguimiento · ${esc(day.date || "Sin fecha")}${day.hour ? ` · ${esc(day.hour)}` : ""}${state.draft.procedureClinicalDayEditId === day.id ? " · Editando" : ""}</h4><div class="line"><b>Observaciones del día:</b> ${esc(day.observations || "")}</div><div class="line"><b>Medicamentos:</b><ol>${medRows}</ol></div><div class="line"><b>Insumos:</b><ol>${supplyRows}</ol></div><div class="actions"><button class="btn small" type="button" data-edit-clinical-day="${esc(day.id)}">Editar</button><button class="btn small" type="button" data-duplicate-clinical-day="${esc(day.id)}">Duplicar tratamiento</button><button class="btn small bad" type="button" data-remove-clinical-day="${esc(day.id)}">Eliminar</button></div></div>`;
  }).join("") : '<div class="help">Aún no hay días de medicación o seguimiento agregados.</div>';
  list.querySelectorAll("[data-edit-clinical-day]").forEach((btn) => btn.addEventListener("click", () => loadClinicalDayForEdit(btn.getAttribute("data-edit-clinical-day"))));
  list.querySelectorAll("[data-duplicate-clinical-day]").forEach((btn) => btn.addEventListener("click", () => duplicateClinicalDay(btn.getAttribute("data-duplicate-clinical-day"))));
  list.querySelectorAll("[data-remove-clinical-day]").forEach((btn) => btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-remove-clinical-day");
    state.draft.procedureClinicalDays = (state.draft.procedureClinicalDays || []).filter((day) => day.id !== id);
    if (state.draft.procedureClinicalDayEditId === id) {
      state.draft.procedureClinicalDayMedications = [];
      state.draft.procedureClinicalDaySupplies = [];
      resetClinicalDayEditor(false);
    }
    renderProcedureDraftLists();
  }));
  updateClinicalDaySaveButton();
}
function previousInventoryQty(previous, collection, itemId) {
  return Number(((previous?.inventory?.[collection] || []).filter((item) => item.itemId === itemId).reduce((acc, item) => acc + Number(item.inventoryDeductionQty || item.totalUsedQty || item.chargeableQty || item.qty || 0), 0)).toFixed(4));
}

function validateProcedureInventoryStock(p, previous) {
  const problems = [];
  const medTotals = new Map();
  const supplyTotals = new Map();
  const vaccineTotals = new Map();
  (p.inventory?.meds || []).forEach((item) => {
    if (!item.itemId) return;
    const qty = Number(item.inventoryDeductionQty || item.totalUsedQty || item.chargeableQty || item.qty || 0);
    if (qty > 0) medTotals.set(item.itemId, Number((Number(medTotals.get(item.itemId) || 0) + qty).toFixed(4)));
  });
  (p.inventory?.vaccines || []).forEach((item) => {
    if (!item.itemId) return;
    const qty = Number(item.animalsApplied || item.inventoryDeductionQty || item.qty || 0);
    if (qty > 0) vaccineTotals.set(item.itemId, Number((Number(vaccineTotals.get(item.itemId) || 0) + qty).toFixed(4)));
  });
  (p.inventory?.supplies || []).forEach((item) => {
    if (!item.itemId) return;
    const qty = Number(item.qty || item.inventoryDeductionQty || 0);
    if (qty > 0) supplyTotals.set(item.itemId, Number((Number(supplyTotals.get(item.itemId) || 0) + qty).toFixed(4)));
  });
  medTotals.forEach((required, itemId) => {
    const med = byId(state.meds, itemId);
    if (!med) return problems.push("No se encontró un medicamento seleccionado para el procedimiento.");
    const available = Number(medRemaining(med) || 0) + previousInventoryQty(previous, "meds", med.id);
    if (required > available + 0.0001) problems.push(`No hay stock suficiente de ${med.brand}. Disponible: ${available.toFixed(2)} ${med.unit || ""}. Requerido: ${required.toFixed(2)} ${med.unit || ""}.`);
  });
  vaccineTotals.forEach((required, itemId) => {
    const vaccine = byId(state.vaccines, itemId);
    if (!vaccine) return problems.push("No se encontró una vacuna seleccionada para el procedimiento.");
    const previousQty = previous ? Number((previous.inventory?.vaccines || []).filter((item) => item.itemId === itemId).reduce((acc, item) => acc + Number(item.animalsApplied || item.inventoryDeductionQty || item.qty || 0), 0)) : 0;
    const available = Number(vaccineRemaining(vaccine) || 0) + previousQty;
    if (required > available + 0.0001) problems.push(`No hay disponibilidad suficiente de ${vaccine.brand}. Disponible: ${available.toFixed(2)} dosis/animales. Requerido: ${required.toFixed(2)}.`);
  });
  supplyTotals.forEach((required, itemId) => {
    const sup = byId(state.supplies, itemId);
    if (!sup) return problems.push("No se encontró un insumo seleccionado para el procedimiento.");
    if (sup.type === "NON_DISPOSABLE") return;
    const available = Number(supplyRemaining(sup) || 0) + previousInventoryQty(previous, "supplies", sup.id);
    if (required > available + 0.0001) problems.push(`No hay existencia suficiente de ${sup.name}. Disponible: ${available.toFixed(2)} piezas. Requerido: ${required.toFixed(2)}.`);
  });
  return problems;
}

function validateClinicalDayInventory(p, previous) {
  const problems = [];
  const medTotals = new Map();
  const supplyTotals = new Map();
  (p.inventory?.meds || []).filter((item) => item.source === "CLINICAL_DAY").forEach((item) => medTotals.set(item.itemId, Number((Number(medTotals.get(item.itemId) || 0) + Number(item.inventoryDeductionQty || item.qty || 0)).toFixed(4))));
  (p.inventory?.supplies || []).filter((item) => item.source === "CLINICAL_DAY").forEach((item) => supplyTotals.set(item.itemId, Number((Number(supplyTotals.get(item.itemId) || 0) + Number(item.qty || 0)).toFixed(4))));
  medTotals.forEach((required, itemId) => {
    const med = byId(state.meds, itemId);
    if (!med) return problems.push("No se encontró un medicamento de día clínico seleccionado.");
    const available = Number(medRemaining(med) || 0) + previousInventoryQty(previous, "meds", med.id);
    if (required > available + 0.0001) problems.push(`No hay stock suficiente de ${med.brand} para día clínico. Disponible: ${available.toFixed(2)} ${med.unit || ""}. Requerido: ${required.toFixed(2)} ${med.unit || ""}.`);
  });
  supplyTotals.forEach((required, itemId) => {
    const sup = byId(state.supplies, itemId);
    if (!sup) return problems.push("No se encontró un insumo de día clínico seleccionado.");
    if (sup.type === "NON_DISPOSABLE") return;
    const available = Number(supplyRemaining(sup) || 0) + previousInventoryQty(previous, "supplies", sup.id);
    if (required > available + 0.0001) problems.push(`No hay existencia suficiente de ${sup.name}. Disponible: ${available.toFixed(2)} piezas. Requerido: ${required.toFixed(2)}.`);
  });
  return problems;
}
function procedureDebtRecords(p) {
  const person = procedureProducerName(p) || p.producerName || "";
  const animal = p.identification || p.caseClinical?.animalName || "";
  const grouped = new Map();
  const addDebtItem = (item) => {
    const key = `${item.kind}::${item.itemId}`;
    const current = grouped.get(key) || { ...item, qtyUsed: 0, amount: 0 };
    current.qtyUsed = Number((Number(current.qtyUsed || 0) + Number(item.qtyUsed || 0)).toFixed(4));
    current.amount = Number((Number(current.amount || 0) + Number(item.amount ?? (Number(item.qtyUsed || 0) * Number(item.unitCost || 0)))).toFixed(2));
    grouped.set(key, current);
  };
  (p.inventory?.meds || []).forEach((use) => {
    const med = byId(state.meds, use.itemId);
    const owner = med?.owner || use.owner || "";
    if (!ownerCreatesDebt(owner)) return;
    const qty = Number(use.inventoryDeductionQty || use.totalUsedQty || use.chargeableQty || use.qty || 0);
    if (qty <= 0) return;
    addDebtItem({ kind: "Medicamento", itemId: use.itemId, itemName: use.name || med?.brand || "Medicamento", qtyUsed: qty, unit: use.inventoryDeductionUnit || use.unit || med?.unit || "", unitCost: Number(use.unitCost || med?.unitCost || 0), amount: use.costCharged ?? use.priceCharged ?? use.costSuggested, owner });
  });
  (p.inventory?.vaccines || []).forEach((use) => {
    const vax = byId(state.vaccines, use.itemId);
    const owner = vax?.owner || use.owner || "";
    if (!ownerCreatesDebt(owner)) return;
    const qty = Number(use.animalsApplied || use.inventoryDeductionQty || use.qty || 0);
    if (qty <= 0) return;
    addDebtItem({ kind: "Vacuna", itemId: use.itemId, itemName: use.name || vax?.brand || "Vacuna", qtyUsed: qty, unit: use.inventoryDeductionUnit || use.unit || "dosis/animales", unitCost: Number(use.unitCost || vax?.unitCost || 0), owner });
  });
  (p.inventory?.supplies || []).forEach((use) => {
    const sup = byId(state.supplies, use.itemId);
    const owner = sup?.owner || use.owner || "";
    if (!ownerCreatesDebt(owner)) return;
    const qty = Number(use.qty || 0);
    if (qty <= 0) return;
    addDebtItem({ kind: "Insumo", itemId: use.itemId, itemName: use.name || sup?.name || "Insumo", qtyUsed: qty, unit: use.unit || (use.type === "NON_DISPOSABLE" ? "usos" : "pzas"), unitCost: Number(use.unitCost || supplyDisplayCost(sup || {}) || 0), amount: use.costCharged ?? use.priceCharged ?? use.costSuggested, owner });
  });
  return Array.from(grouped.values()).map((item) => ({ ...item, procedureId: p.id, procedureLabel: `${p.date || "Sin fecha"} · ${p.type || "Procedimiento"}`, date: p.date || "", producerName: person, animalName: animal, paymentStatus: "Pendiente" }));
}
function buildProcedureInventoryMovements(p) {
  const movements = [];
  (p.inventory?.meds || []).forEach((item) => {
    if (!item.itemId || Number(item.inventoryDeductionQty || item.qty || 0) <= 0) return;
    movements.push({ id: uid("mov"), procedureId: p.id, date: p.date, type: "SALIDA", category: "MEDICAMENTO", itemId: item.itemId, itemName: item.name, qty: Number(item.inventoryDeductionQty || item.qty || 0), unit: item.inventoryDeductionUnit || item.unit || "", source: item.source || item.applicationMode || "PROCEDURE" });
  });
  (p.inventory?.vaccines || []).forEach((item) => {
    const qty = Number(item.animalsApplied || item.inventoryDeductionQty || item.qty || 0);
    if (!item.itemId || qty <= 0) return;
    movements.push({ id: uid("mov"), procedureId: p.id, date: p.date, type: "SALIDA", category: "VACUNA", itemId: item.itemId, itemName: item.name, qty, unit: item.inventoryDeductionUnit || item.unit || "dosis/animales", source: item.source || "PROCEDURE" });
  });
  (p.inventory?.supplies || []).forEach((item) => {
    if (!item.itemId || Number(item.qty || item.inventoryDeductionQty || 0) <= 0) return;
    movements.push({ id: uid("mov"), procedureId: p.id, date: p.date, type: "SALIDA", category: "INSUMO", itemId: item.itemId, itemName: item.name, qty: Number(item.qty || item.inventoryDeductionQty || 0), unit: item.type === "NON_DISPOSABLE" ? "usos" : "pzas", source: item.source || "PROCEDURE" });
  });
  return movements;
}
function consumptionDebtSummary(p = collectProcedure()) {
  const meds = (p.inventory?.meds || []).filter((item) => item.source === "CLINICAL_DAY" || item.source === "FOLLOWUP" || item.applicationMode || item.itemId);
  const supplies = p.inventory?.supplies || [];
  const debt = procedureDebtRecords(p);
  return { meds, supplies, debt, medsCost: meds.reduce((acc, item) => acc + Number(item.costCharged ?? item.priceCharged ?? (Number(item.inventoryDeductionQty || item.qty || 0) * Number(item.unitCost || 0))), 0), suppliesCost: supplies.reduce((acc, item) => acc + Number(item.costCharged ?? item.priceCharged ?? (Number(item.qty || 0) * Number(item.unitCost || 0))), 0), debtTotal: debt.reduce((acc, item) => acc + Number(item.amount || 0), 0) };
}
function renderClinicalConsumptionSummary() {
  const box = $("#p_cc_consumptionDebtSummary");
  if (!box) return;
  const p = collectProcedure();
  const summary = consumptionDebtSummary(p);
  const medRows = summary.meds.map((m) => `<li>${esc(m.name || "Medicamento")} · ${Number(m.inventoryDeductionQty || m.qty || 0).toFixed(2)} ${esc(m.inventoryDeductionUnit || m.unit || "")} · restante: ${esc(m.itemId ? medRemaining(byId(state.meds, m.itemId) || {}) : "N/A")} · ${money(Number(m.inventoryDeductionQty || m.qty || 0) * Number(m.unitCost || 0))}</li>`).join("") || "<li>Sin medicamentos usados.</li>";
  const supRows = summary.supplies.map((sup) => `<li>${esc(sup.name || "Insumo")} · ${Number(sup.qty || 0).toFixed(2)} ${esc(sup.type === "NON_DISPOSABLE" ? "usos" : "pzas")} · restante: ${esc(sup.itemId ? supplyRemaining(byId(state.supplies, sup.itemId) || {}) : "N/A")} · ${money(Number(sup.qty || 0) * Number(sup.unitCost || 0))}</li>`).join("") || "<li>Sin insumos usados.</li>";
  const debtRows = summary.debt.map((d) => `<li>${esc(d.itemName)} · ${Number(d.qtyUsed || 0).toFixed(2)} ${esc(d.unit || "")} · ${money(d.amount || 0)} · ${esc(medOwnerLabel(d.owner))} · ${esc(d.paymentStatus || "Pendiente")}</li>`).join("") || "<li>Sin deuda con personas propietarias externas.</li>";
  box.innerHTML = `<h4>Resumen de consumo y deuda</h4><div class="grid cols-3"><div><b>Medicamentos usados</b><ul>${medRows}</ul></div><div><b>Insumos usados</b><ul>${supRows}</ul></div><div><b>Deuda</b><ul>${debtRows}</ul></div></div><div class="line"><b>Costo total medicamentos:</b> ${money(summary.medsCost)} · <b>Costo total insumos:</b> ${money(summary.suppliesCost)} · <b>Total adeudado:</b> ${money(summary.debtTotal)}</div>`;
}

function applyRegisteredClinicalAnimalToForm() {
  const animal = byId(currentAnimals(), $("#p_cc_registeredAnimal")?.value || "");
  if (!animal) return;
  if ($("#p_animalGroup")) $("#p_animalGroup").value = animal.id;
  const values = {
    p_cc_animalName: animalLabel(animal),
    p_cc_species: animal.species || "",
    p_cc_breed: animal.breed || "",
    p_cc_sex: animal.sex || "",
    p_cc_age: animal.age || "",
    p_cc_weight: animal.weight || "",
  };
  Object.entries(values).forEach(([id, value]) => { if ($("#" + id)) $("#" + id).value = value || ""; });
}

function normalizePreventiveProductUses() {
  if (($("#p_type")?.value || "") !== "PREVENTIVA") return;
  const migratedSupplies = (state.draft.procedureSupplyUses || []).map((item) => ({
    ...item,
    id: item.id || uid("pmed"),
    productType: "INSUMO",
    supplyId: item.supplyId || item.itemId || "",
    itemId: item.itemId || item.supplyId || "",
    name: item.name || "Insumo",
    unit: item.unit || (item.type === "NON_DISPOSABLE" ? "uso" : "pieza"),
    costSuggested: item.costSuggested ?? Number(item.qty || 0) * Number(item.unitCost || 0),
    costCharged: item.costCharged ?? item.priceCharged ?? item.costSuggested ?? Number(item.qty || 0) * Number(item.unitCost || 0),
    inventoryDeductionQty: item.inventoryDeductionQty || item.qty || 0,
    source: "PROCEDURE_MANUAL",
  }));
  if (migratedSupplies.length) {
    const existingKeys = new Set((state.draft.procedureMedUses || []).map((item) => item.id));
    state.draft.procedureMedUses = [...(state.draft.procedureMedUses || []), ...migratedSupplies.filter((item) => !existingKeys.has(item.id))];
    state.draft.procedureSupplyUses = [];
  }
}
function renderProcedureDraftLists() {
  normalizePreventiveProductUses();
  renderClinicalDayDraftLists();
  renderProcedureFollowupMedicationDraft();
  renderProcedureAnimalCards();
  renderProcedureSpeciesDoseList();
  const aggregated = aggregateProcedureInventoryFromAnimals();
  const caseMedicationList = (state.draft.procedureAnimalEntries || [])
    .flatMap((entry) => {
      normalizeEntryMedicationApplied(entry);
      return (entry.medicationsApplied || []).map((item) => `${entry.identification || entry.sourceLabel || "Animal"}: ${item.medicationName || "Medicamento"} → ${Number(item.finalAppliedAmount || 0).toFixed(2)} ${item.finalUnit || ""} → ${item.route || "Sin vía"}`);
    });
  renderSimpleList("#p_caseMedicationAppliedList", caseMedicationList, (x) => x);
  const groupDraft = calculateGroupMedicationDraft();
  if ($("#p_groupTotalCalculated")) {
    $("#p_groupTotalCalculated").value = groupDraft.convertedQty
      ? `${Number(groupDraft.convertedQty).toFixed(2)} ${groupDraft.convertedUnit || groupDraft.doseUnit || ""}`.trim()
      : "";
  }
  if ($("#p_groupCalcSummary")) $("#p_groupCalcSummary").textContent = [groupDraft.summary, groupDraft.conversionExplanation, groupDraft.warning].filter(Boolean).join(" · ");
  const groupMed = byId(state.meds, groupDraft.medicationId);
  const groupExpiry = medicationExpiryInfo(groupMed?.expiry);
  if ($("#p_groupCalcSummary") && groupMed) {
    $("#p_groupCalcSummary").textContent = [
      groupDraft.summary,
      `Vía: ${groupMed.route || "Sin vía de administración registrada"}`,
      `Caducidad: ${groupMed.expiry || "Sin fecha de caducidad registrada"}`,
      `Estado: ${groupExpiry.text}`,
      groupExpiry.warning,
      groupDraft.warning,
    ].filter(Boolean).join(" · ");
  }
  renderProcedureMedUseList();
  renderSimpleList("#p_vaccineUseList", aggregated.vaccines, (x) => `${x.name} · ${x.animalsApplied} animales`);
  renderSimpleList("#p_supplyUseList", [...(aggregated.supplies || []), ...(state.draft.procedureSupplyUses || [])], (x) => `${x.animalLabel ? `${x.animalLabel} · ` : ""}${x.name} · ${x.qty} ${x.unit || (x.type === "NON_DISPOSABLE" ? "usos" : "pzas")}`);
  renderProcedureLinkedLabList();
  const box1 = $("#p_cc_preview"), box2 = $("#p_nec_preview");
  if (box1) box1.innerHTML = state.draft.procedureCasePhotos.length ? state.draft.procedureCasePhotos.map((p) => `<div class="preview-mini"><img src="${p}"></div>`).join("") : '<div class="preview-box"><span>Sin<br/>fotos</span></div>';
  if (box2) box2.innerHTML = state.draft.procedureNecropsyPhotos.length ? state.draft.procedureNecropsyPhotos.map((p) => `<div class="preview-mini"><img src="${p}"></div>`).join("") : '<div class="preview-box"><span>Sin<br/>fotos</span></div>';
  setThumb("p_charge_preview", state.draft.procedureChargePhoto, "Sin<br/>evidencia");
  const breakdown = calculateProcedureCharge();
  $("#p_chargeCalculated").value = breakdown.total.toFixed(2);
  renderProcedureChargeBreakdown(breakdown);
  renderClinicalConsumptionSummary();
}
function renderProcedureLinkedLabList() {
  const box = $("#lab_list");
  if (!box) return;
  const labs = state.labTests.filter((l) => state.draft.procedureLabIds.includes(l.id));
  box.innerHTML = labs.length ? labs.map((l) => `<div class="item"><h4>${esc(l.name || l.type || "Estudio de laboratorio")}</h4><div class="line"><b>Tipo:</b> ${esc(l.type || "")} · <b>Muestra:</b> ${esc(l.sampleType || "")} · <b>Toma:</b> ${esc(l.sampleDate || l.date || "")} · <b>Resultado:</b> ${esc(l.resultDate || "")}</div><div class="line"><b>Resultado:</b> ${esc(l.result || l.results || "")} · <b>Interpretación:</b> ${esc(l.interpretation || "")}</div><div class="line"><b>Cobro final:</b> ${money(l.charge?.total ?? l.costCharged ?? l.costSuggested ?? 0)}</div><div class="actions"><button class="btn small" type="button" data-proc-lab-edit="${esc(l.id)}">Editar</button><button class="btn small ghost" type="button" data-proc-lab-dup="${esc(l.id)}">Duplicar</button><button class="btn small bad" type="button" data-proc-lab-del="${esc(l.id)}">Eliminar vínculo</button></div></div>`).join("") : '<div class="help">Sin estudios de laboratorio vinculados a este caso/procedimiento.</div>';
  box.querySelectorAll("[data-proc-lab-edit]").forEach((btn) => btn.addEventListener("click", () => fillProcedureLabForm(btn.dataset.procLabEdit)));
  box.querySelectorAll("[data-proc-lab-dup]").forEach((btn) => btn.addEventListener("click", () => duplicateProcedureLab(btn.dataset.procLabDup)));
  box.querySelectorAll("[data-proc-lab-del]").forEach((btn) => btn.addEventListener("click", () => { state.draft.procedureLabIds = state.draft.procedureLabIds.filter((id) => id !== btn.dataset.procLabDel); renderProcedureDraftLists(); }));
}
function fillProcedureLabForm(id) {
  const lab = byId(state.labTests, id);
  if (!lab) return;
  state.editing.procedureLabId = id;
  Object.entries({ lab_type: lab.type, lab_name: lab.name || "", lab_sampleType: lab.sampleType || "", lab_date: lab.sampleDate || lab.date || "", lab_resultDate: lab.resultDate || "", lab_responsible: lab.responsible || lab.laboratory || "", lab_animal: lab.animal || "", lab_result: lab.result || lab.results || "", lab_relatedTo: lab.relatedTo || "", lab_costSuggested: lab.costSuggested ?? lab.charge?.unitCost ?? "", lab_costCharged: lab.costCharged ?? lab.charge?.total ?? "", lab_interpretation: lab.interpretation || "", lab_notes: lab.notes || "" }).forEach(([fieldId, value]) => { if ($("#" + fieldId)) $("#" + fieldId).value = safe(value); });
  show("p_msg", "Estudio de laboratorio cargado para editar.", "warning");
}
function duplicateProcedureLab(id) {
  const lab = byId(state.labTests, id);
  if (!lab) return;
  const copy = { ...lab, id: uid("lab"), name: `${lab.name || lab.type || "Estudio"} (copia)`, linkedProcedureId: state.editing.procedureId || null };
  state.labTests.unshift(copy);
  state.draft.procedureLabIds.push(copy.id);
  saveState();
  renderProcedureDraftLists();
}
function getProcedureFollowupAnimalContext() {
  const fromDraft = (state.draft.procedureAnimalEntries || [])[0];
  const selected = byId(currentAnimals(), $("#p_animalGroup")?.value || "");
  const source = fromDraft || selected || {};
  return {
    animalId: source.animalId || source.id || "",
    identification: source.identification || source.sourceLabel || animalLabel(source || {}) || "",
    species: source.species || "",
    weightKg: Number(source.weightRecordedKg || source.weight || $("#p_weight")?.value || 0),
  };
}
function buildProcedureFollowupMedicationDraft(medicationId = "", qtyOverride = null) {
  const med = byId(state.meds, medicationId || $("#p_cc_followMedSelect")?.value);
  if (!med) return null;
  const context = getProcedureFollowupAnimalContext();
  const profile = getMedicationDoseProfile(med, context.species || "");
  const doseBase = Number(profile?.dose || 0);
  const doseUnit = profile?.doseUnit || med.unit || "";
  const mode = profile?.calculationMode || "PER_KG";
  const porCada = Number(profile?.porCada || 1) || 1;
  const basis = mode === "PER_KG" ? Number(context.weightKg || 0) : 1;
  const theoreticalQty = doseBase * (basis / porCada);
  const converted = calculateConvertedMedicationDose({
    med,
    theoreticalQty,
    theoreticalUnit: doseUnit,
    rule: mode,
    basisValue: basis,
    basisLabel: mode === "PER_KG" ? `Peso usado: ${Number(context.weightKg || 0).toFixed(2)} kg` : "Regla: por animal",
  });
  const suggestedQty = Number(converted.convertedQty || 0);
  const hasManualQty = qtyOverride != null && String(qtyOverride).trim() !== "";
  const finalQty = hasManualQty ? Number(qtyOverride || 0) : suggestedQty;
  const manualAdjusted = hasManualQty && Math.abs(finalQty - suggestedQty) > 0.0000001;
  const applied = resolveMedicationAppliedAmount({
    med,
    qty: finalQty,
    unit: converted.convertedUnit || med.unit || "",
  });
  return {
    id: uid("followmed"),
    date: $("#p_cc_followMedDate")?.value || new Date().toISOString().slice(0, 10),
    medicationId: med.id,
    medicationName: med.brand,
    route: med.route || "Sin vía de administración registrada",
    species: context.species || "",
    weightKg: Number(context.weightKg || 0),
    doseBase,
    doseUnit,
    doseCalculationMode: mode,
    calculationSummary: converted.explanation || "",
    suggestedQty,
    suggestedUnit: converted.convertedUnit || med.unit || "",
    theoreticalQty: Number(theoreticalQty.toFixed(4)),
    theoreticalUnit: doseUnit,
    qty: Number((applied.qty || 0).toFixed(4)),
    unit: applied.unit || med.unit || "",
    manualQty: hasManualQty ? Number((finalQty || 0).toFixed(4)) : null,
    manualAdjusted,
    unitCost: Number(med.unitCost || 0),
    subtotal: Number((Number(applied.qty || 0) * Number(med.unitCost || 0)).toFixed(4)),
    notes: $("#p_cc_followMedObs")?.value?.trim() || "",
    animalId: context.animalId,
    animalIdentification: context.identification,
  };
}
function renderProcedureFollowupMedicationDraft() {
  const select = $("#p_cc_followMedSelect");
  if (select) {
    const prev = select.value || "";
    select.innerHTML = '<option value="">— Selecciona —</option>' + state.meds.map((m) => `<option value="${m.id}">${esc(m.brand)} · ${esc(m.route || "Sin vía")} · ${money(m.unitCost || 0)}/${esc(m.unit || "u")}</option>`).join("");
    select.value = prev;
  }
  const list = $("#p_cc_followMedicationList");
  const items = state.draft.procedureFollowupMedicationEntries || [];
  if (list) {
    list.innerHTML = items.length
      ? items.map((item) => `<div class="item"><div><b>${esc(item.date || "")}</b> · ${esc(item.medicationName)} · ${Number(item.qty || 0).toFixed(2)} ${esc(item.unit || "")} · ${esc(item.route || "")} · ${money(item.subtotal || 0)}</div><div class="help">${esc(item.calculationSummary || "")} · Ajuste manual: ${item.manualAdjusted ? "Sí" : "No"}</div><div class="row"><button class="btn small ghost" type="button" data-followmed-edit="${item.id}">Editar</button><button class="btn small bad" type="button" data-followmed-del="${item.id}">Eliminar</button></div></div>`).join("")
      : '<div class="help">Aún no hay aplicaciones de medicamento registradas en seguimiento.</div>';
    list.querySelectorAll("[data-followmed-edit]").forEach((btn) => btn.addEventListener("click", () => editProcedureFollowupMedication(btn.getAttribute("data-followmed-edit"))));
    list.querySelectorAll("[data-followmed-del]").forEach((btn) => btn.addEventListener("click", () => removeProcedureFollowupMedication(btn.getAttribute("data-followmed-del"))));
  }
}
function syncProcedureFollowupMedicationForm(options = {}) {
  const { preserveQty = false } = options;
  const qtyInput = $("#p_cc_followMedQty");
  const draft = buildProcedureFollowupMedicationDraft($("#p_cc_followMedSelect")?.value, qtyInput?.value);
  if ($("#p_cc_followMedRoute")) $("#p_cc_followMedRoute").value = draft?.route || "";
  if ($("#p_cc_followMedCalc")) $("#p_cc_followMedCalc").value = draft?.calculationSummary || "Selecciona medicamento para calcular automáticamente.";
  if (!qtyInput || preserveQty) return;
  const hasManualValue = String(qtyInput.value || "").trim() !== "";
  const shouldAutofill = !hasManualValue || document.activeElement === $("#p_cc_followMedSelect");
  if (shouldAutofill && document.activeElement !== qtyInput) qtyInput.value = draft?.suggestedQty ? Number(draft.suggestedQty).toFixed(4) : "";
}
function resetProcedureFollowupMedicationForm() {
  state.draft.procedureFollowupMedicationEditId = null;
  if ($("#p_cc_followMedDate")) $("#p_cc_followMedDate").value = new Date().toISOString().slice(0, 10);
  ["p_cc_followMedSelect","p_cc_followMedRoute","p_cc_followMedCalc","p_cc_followMedQty","p_cc_followMedObs"].forEach((id) => { if ($("#" + id)) $("#" + id).value = ""; });
}
function addOrUpdateProcedureFollowupMedication() {
  const draft = buildProcedureFollowupMedicationDraft($("#p_cc_followMedSelect")?.value, $("#p_cc_followMedQty")?.value);
  if (!draft?.medicationId) return show("p_msg", "Selecciona un medicamento para el seguimiento farmacológico.", "warning");
  if (!draft.date) return show("p_msg", "Captura la fecha de aplicación en seguimiento.", "warning");
  if (Number(draft.qty || 0) <= 0) return show("p_msg", "La cantidad final aplicada debe ser mayor a 0.", "warning");
  const editingId = state.draft.procedureFollowupMedicationEditId;
  const current = state.draft.procedureFollowupMedicationEntries || [];
  if (editingId) {
    state.draft.procedureFollowupMedicationEntries = current.map((item) => item.id === editingId ? { ...draft, id: editingId } : item);
  } else {
    state.draft.procedureFollowupMedicationEntries = [...current, draft];
  }
  resetProcedureFollowupMedicationForm();
  renderProcedureDraftLists();
}
function editProcedureFollowupMedication(id) {
  const item = (state.draft.procedureFollowupMedicationEntries || []).find((x) => x.id === id);
  if (!item) return;
  state.draft.procedureFollowupMedicationEditId = id;
  $("#p_cc_followMedDate").value = item.date || "";
  $("#p_cc_followMedSelect").value = item.medicationId || "";
  $("#p_cc_followMedQty").value = Number(item.qty || 0).toFixed(4);
  $("#p_cc_followMedObs").value = item.notes || "";
  syncProcedureFollowupMedicationForm({ preserveQty: true });
}
function removeProcedureFollowupMedication(id) {
  state.draft.procedureFollowupMedicationEntries = (state.draft.procedureFollowupMedicationEntries || []).filter((item) => item.id !== id);
  renderProcedureDraftLists();
}
function calculateProcedureChargeBreakdown() {
  const aggregated = aggregateProcedureInventoryFromAnimals();
  const medsProcedure = (state.draft.procedureAnimalEntries || []).flatMap((entry) => {
    normalizeEntryMedicationApplied(entry);
    return (entry.medicationsApplied || []).map((item) => {
      const qty = Number(item.inventoryDiscount || item.finalAppliedAmount || 0);
      const unitCost = Number(byId(state.meds, item.medicationId)?.unitCost || 0);
      return {
        category: "Medicamento procedimiento",
        name: `${entry.identification || entry.sourceLabel || "Animal"} · ${item.medicationName || "Medicamento"}`,
        qty,
        qtyLabel: `${qty.toFixed(2)} ${item.inventoryDiscountUnit || item.finalUnit || ""}`.trim(),
        unitCost,
        unitCostLabel: money(unitCost),
        costSuggested: item.costSuggested ?? qty * unitCost,
        subtotal: item.priceCharged ?? item.costSuggested ?? qty * unitCost,
        extraLabel: [item.notes, item.conversionExplanation || item.route, `sugerido ${money(item.costSuggested ?? qty * unitCost)}`].filter(Boolean).join(" · "),
        removable: true,
        removeType: "procedure-medication",
        removeTarget: { entryId: entry.id, medicationApplicationId: item.id },
      };
    });
  }).concat((state.draft.procedureMedUses || []).filter((item) => (item.productType || "MEDICAMENTO") === "MEDICAMENTO").map((item) => {
    const qty = Number(item.inventoryDeductionQty || item.qty || 0);
    const unitCost = Number(item.unitCost || byId(state.meds, item.itemId)?.unitCost || 0);
    return { category: "Medicamento procedimiento", name: item.name || "Medicamento", qty, qtyLabel: `${qty.toFixed(2)} ${item.inventoryDeductionUnit || item.unit || ""}`.trim(), unitCost, unitCostLabel: money(unitCost), costSuggested: item.costSuggested ?? qty * unitCost, subtotal: item.costCharged ?? item.priceCharged ?? item.costSuggested ?? qty * unitCost, extraLabel: [item.calculationSummary, item.notes, `sugerido ${money(item.costSuggested ?? qty * unitCost)}`].filter(Boolean).join(" · "), removable: true, removeType: "manual-product", removeTarget: { useId: item.id } };
  }));
  const clinicalDayInventory = clinicalInventoryFromDays(state.draft.procedureClinicalDays || []);
  const medsClinicalDays = (clinicalDayInventory.meds || []).map((x) => {
    const qty = Number(x.inventoryDeductionQty || x.qty || 0);
    const unitCost = Number(x.unitCost || 0);
    return {
      category: "Medicamento por día clínico",
      name: `${x.applicationDate || ""} · ${x.name || "Medicamento"}`.trim(),
      qty,
      qtyLabel: `${qty.toFixed(2)} ${x.inventoryDeductionUnit || x.unit || ""}`.trim(),
      unitCost,
      unitCostLabel: money(unitCost),
      subtotal: x.costCharged ?? x.priceCharged ?? x.costSuggested ?? qty * unitCost,
      extraLabel: [x.notes || x.calculationSummary || "", `sugerido ${money(x.costSuggested ?? qty * unitCost)}`].filter(Boolean).join(" · "),
    };
  });
  const medsFollowup = (state.draft.procedureFollowupMedicationEntries || []).map((x) => {
    const qty = Number(x.qty || 0);
    const unitCost = Number(x.unitCost || 0);
    return {
      category: "Medicamento seguimiento",
      name: `${x.date || ""} · ${x.medicationName || ""}`.trim(),
      qty,
      qtyLabel: `${qty.toFixed(2)} ${x.unit || ""}`.trim(),
      unitCost,
      unitCostLabel: money(unitCost),
      subtotal: x.costCharged ?? x.priceCharged ?? x.costSuggested ?? qty * unitCost,
      extraLabel: [x.notes || x.calculationSummary || "", `sugerido ${money(x.costSuggested ?? qty * unitCost)}`].filter(Boolean).join(" · "),
      removable: true,
      removeType: "followup-medication",
      removeTarget: { followupId: x.id },
    };
  });
  const vaccines = aggregated.vaccines.concat((state.draft.procedureMedUses || []).filter((item) => item.productType === "VACUNA").map((item) => ({ ...item, animalsApplied: item.baseAmount || item.qty, unitCost: item.unitCost, priceCharged: item.costCharged }))).map((x) => {
    const qty = Number(x.animalsApplied || x.inventoryDeductionQty || x.qty || 0);
    const unitCost = Number(x.unitCost || 0);
    return { category: "Vacuna", name: x.name, qty, qtyLabel: `${qty.toFixed(2)} ${x.inventoryDeductionUnit || x.unit || "dosis/animales"}`.trim(), unitCost, unitCostLabel: money(unitCost), subtotal: x.priceCharged ?? x.costCharged ?? x.costSuggested ?? qty * unitCost, extraLabel: [x.calculationSummary, x.notes, `sugerido ${money(x.costSuggested ?? qty * unitCost)}`].filter(Boolean).join(" · "), removable: x.source === "PROCEDURE_MANUAL", removeType: "manual-product", removeTarget: { useId: x.id } };
  });
  const supplies = ([...(aggregated.supplies || []), ...(state.draft.procedureSupplyUses || []), ...(state.draft.procedureMedUses || []).filter((item) => item.productType === "INSUMO"), ...(clinicalDayInventory.supplies || [])]).map((x) => {
    const qty = Number(x.qty || 0);
    const unitCost = Number(x.unitCost || 0);
    return {
      category: "Insumo",
      name: `${x.animalLabel ? `${x.animalLabel} · ` : ""}${x.name}`,
      qty,
      qtyLabel: `${qty.toFixed(2)} ${x.unit || (x.type === "NON_DISPOSABLE" ? "usos" : "pzas")}`,
      unitCost,
      unitCostLabel: money(unitCost),
      costSuggested: x.costSuggested ?? qty * unitCost,
      subtotal: x.costCharged ?? x.priceCharged ?? x.costSuggested ?? qty * unitCost,
      extraLabel: [x.notes, `sugerido ${money(x.costSuggested ?? qty * unitCost)}`].filter(Boolean).join(" · "),
      removable: true,
      removeType: "supply",
      removeTarget: { supplyUseId: x.id, entryId: x.source === "ANIMAL_CARD" ? x.animalId || x.entryId : "", source: x.source || "" },
    };
  });
  const labs = state.labTests.filter((l) => state.draft.procedureLabIds.includes(l.id)).map((l) => {
    const subtotal = Number(l.charge?.total ?? l.costCharged ?? l.costFinal ?? l.costSuggested ?? 0);
    return { category: "Laboratorio", name: l.name || l.type || "Estudio de laboratorio", qty: 1, qtyLabel: "1 estudio", unitCost: subtotal, unitCostLabel: money(subtotal), subtotal, extraLabel: [l.sampleType, l.interpretation, `sugerido ${money(l.costSuggested ?? l.charge?.unitCost ?? subtotal)}`].filter(Boolean).join(" · "), removable: true, removeType: "lab", removeTarget: { labId: l.id } };
  });
  const base = Number($("#p_costTotal").value || 0);
  const service = base > 0 ? [{ category: "Servicio", name: $("#p_type")?.selectedOptions?.[0]?.textContent || "Servicio", qty: 1, qtyLabel: "1 servicio", unitCost: base, unitCostLabel: money(base), subtotal: base, extraLabel: "Costo base del procedimiento" }] : [];
  return { medsProcedure: [...medsProcedure, ...medsClinicalDays], medsFollowup, vaccines, supplies, labs, service };
}
function removeProcedureChargeBreakdownItem(item) {
  if (!item?.removable || !item.removeType) return;
  if (!window.confirm("¿Seguro que quieres eliminar este elemento del cobro?")) return;
  if (item.removeType === "procedure-medication") {
    const target = item.removeTarget || {};
    const entry = (state.draft.procedureAnimalEntries || []).find((candidate) => candidate.id === target.entryId);
    if (!entry) return;
    normalizeEntryMedicationApplied(entry);
    entry.medicationsApplied = (entry.medicationsApplied || []).filter((medItem) => medItem.id !== target.medicationApplicationId);
  }
  if (item.removeType === "followup-medication") {
    state.draft.procedureFollowupMedicationEntries = (state.draft.procedureFollowupMedicationEntries || []).filter((candidate) => candidate.id !== item.removeTarget?.followupId);
  }
  if (item.removeType === "manual-product") {
    state.draft.procedureMedUses = (state.draft.procedureMedUses || []).filter((candidate) => candidate.id !== item.removeTarget?.useId);
  }
  if (item.removeType === "supply") {
    const target = item.removeTarget || {};
    let removedFromAnimal = false;
    (state.draft.procedureAnimalEntries || []).forEach((entry) => {
      const before = (entry.suppliesApplied || []).length;
      entry.suppliesApplied = (entry.suppliesApplied || []).filter((candidate) => candidate.id !== target.supplyUseId);
      if ((entry.suppliesApplied || []).length !== before) removedFromAnimal = true;
    });
    if (!removedFromAnimal) state.draft.procedureSupplyUses = (state.draft.procedureSupplyUses || []).filter((candidate) => candidate.id !== target.supplyUseId);
  }
  if (item.removeType === "lab") {
    state.draft.procedureLabIds = (state.draft.procedureLabIds || []).filter((id) => id !== item.removeTarget?.labId);
  }
  renderProcedureDraftLists();
  show("p_msg", "Elemento eliminado del desglose y del cobro.", "success");
}
function calculateProcedureCharge() {
  const base = Number($("#p_costTotal").value || 0);
  const detail = calculateProcedureChargeBreakdown();
  const meds = [...(detail.medsProcedure || []), ...(detail.medsFollowup || [])].reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const vaccines = (detail.vaccines || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const supplies = (detail.supplies || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const labs = (detail.labs || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  const subtotal = base + meds + vaccines + supplies + labs;
  return { base, meds, vaccines, supplies, labs, subtotal, total: subtotal, breakdown: detail };
}
function preventiveFinalSummaryHtml() {
  if (($("#p_type")?.value || "") !== "PREVENTIVA") return "";
  const draftProcedure = collectProcedure();
  const summary = consumptionDebtSummary(draftProcedure);
  const animalRows = (draftProcedure.animals || []).map((animal) => {
    const meds = (animal.medicationsApplied || []).map((item) => `${item.medicationName || "Medicamento"} (${Number(item.inventoryDiscount || item.finalAppliedAmount || 0).toFixed(2)} ${item.inventoryDiscountUnit || item.finalUnit || ""})`).join(", ") || "Sin medicamentos/vacunas";
    const supplies = (animal.suppliesApplied || []).map((item) => `${item.name || "Insumo"} (${Number(item.qty || 0).toFixed(2)} ${item.unit || ""})`).join(", ") || "Sin insumos";
    return `<li><b>${esc(animal.identification || animal.sourceLabel || "Animal")}</b>: ${esc(meds)} · ${esc(supplies)}</li>`;
  }).join("") || "<li>Sin animales atendidos.</li>";
  const medRows = [
    ...summary.meds.map((item) => {
      const med = byId(state.meds, item.itemId);
      const qty = Number(item.inventoryDeductionQty || item.qty || 0);
      return `<li>${esc(item.name || "Medicamento")} · total ${qty.toFixed(2)} ${esc(item.inventoryDeductionUnit || item.unit || "")} · restante ${esc(med ? `${medRemaining(med)} ${med.unit || ""}` : "N/A")} · sugerido ${money(qty * Number(item.unitCost || 0))}</li>`;
    }),
    ...(draftProcedure.inventory?.vaccines || []).map((item) => {
      const vaccine = byId(state.vaccines, item.itemId);
      return `<li>${esc(item.name || "Vacuna")} · total ${Number(item.animalsApplied || 0).toFixed(2)} animales · restante ${esc(vaccine ? `${vaccineRemaining(vaccine)} animales` : "N/A")} · sugerido ${money(item.costSuggested ?? Number(item.animalsApplied || 0) * Number(item.unitCost || 0))}</li>`;
    }),
  ].join("") || "<li>Sin medicamentos/vacunas usados.</li>";
  const supRows = summary.supplies.map((item) => {
    const supply = byId(state.supplies, item.itemId);
    return `<li>${esc(item.name || "Insumo")} · total ${Number(item.qty || 0).toFixed(2)} ${esc(item.unit || (item.type === "NON_DISPOSABLE" ? "usos" : "pzas"))} · restante ${esc(supply ? supplyRemaining(supply) : "N/A")} · sugerido ${money(Number(item.qty || 0) * Number(item.unitCost || 0))}</li>`;
  }).join("") || "<li>Sin insumos usados.</li>";
  const debtRows = summary.debt.map((item) => `<li>${esc(item.itemName)} · ${money(item.amount || 0)} · ${esc(medOwnerLabel(item.owner))}</li>`).join("") || "<li>Sin deuda a personas propietarias.</li>";
  return `<section class="card" style="margin-top:10px;"><h4>Resumen final de Medicina preventiva</h4><div class="grid cols-3"><div><b>Animales atendidos</b><ul>${animalRows}</ul></div><div><b>Total medicamentos/vacunas</b><ul>${medRows}</ul></div><div><b>Total insumos y deuda</b><ul>${supRows}</ul><b>Deuda</b><ul>${debtRows}</ul></div></div><div class="line"><b>Costo automático sugerido:</b> ${money((summary.medsCost || 0) + (summary.suppliesCost || 0))} · <b>Precio cobrado editable:</b> ${money(Number($("#p_chargeManual")?.value || calculateProcedureCharge().total || 0))} · <b>Total adeudado:</b> ${money(summary.debtTotal || 0)}</div></section>`;
}
function renderProcedureChargeBreakdown(breakdown = calculateProcedureCharge()) {
  const box = $("#p_chargeBreakdown");
  if (!box) return;
  const detail = breakdown?.breakdown || calculateProcedureChargeBreakdown();
  const drawRows = (title, items = [], keyPrefix = "") => items.length
    ? `<h5>${title}</h5><ul>${items.map((item, index) => `<li><span><b>${esc(item.name || "")}</b> → ${esc(item.qtyLabel || "")} → ${esc(item.unitCostLabel || "")} → <b>${money(item.subtotal || 0)}</b>${item.extraLabel ? ` <small>(${esc(item.extraLabel)})</small>` : ""}</span>${item.removable ? ` <button class="btn small bad" type="button" data-remove-charge-item="${esc(`${keyPrefix}-${index}`)}">Eliminar</button>` : ""}</li>`).join("")}</ul>`
    : `<h5>${title}</h5><div class="help">Sin registros.</div>`;
  const hasItems = ["medsProcedure", "medsFollowup", "vaccines", "supplies", "service"].some((key) => (detail[key] || []).length);
  if (!hasItems) {
    box.innerHTML = '<div class="help">Aún no hay conceptos cobrables registrados.</div>';
    return;
  }
  box.innerHTML = `${drawRows("Medicamentos del procedimiento", detail.medsProcedure, "medsProcedure")}${drawRows("Medicamentos de seguimiento", detail.medsFollowup, "medsFollowup")}${drawRows("Vacunas", detail.vaccines, "vaccines")}${drawRows("Insumos", detail.supplies, "supplies")}${drawRows("Laboratorio", detail.labs || [], "labs")}${drawRows("Servicio", detail.service, "service")}<h5>Total</h5><p><b>${money(breakdown.total || 0)}</b></p>${preventiveFinalSummaryHtml()}`;
  const allRows = {
    medsProcedure: detail.medsProcedure || [],
    medsFollowup: detail.medsFollowup || [],
    vaccines: detail.vaccines || [],
    supplies: detail.supplies || [],
    service: detail.service || [],
  };
  box.querySelectorAll("[data-remove-charge-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const marker = btn.getAttribute("data-remove-charge-item") || "";
      const [groupKey, itemIndexRaw] = marker.split("-");
      const itemIndex = Number(itemIndexRaw);
      const item = allRows[groupKey]?.[itemIndex];
      removeProcedureChargeBreakdownItem(item);
    });
  });
}
function collectProcedure() {
  normalizePreventiveProductUses();
  let animals = (state.draft.procedureAnimalEntries || []).map((entry) => {
    const cloned = syncProcedureAnimalSummary({ ...entry, exam: { ...(entry.exam || {}) } });
    normalizeEntryMedicationApplied(cloned);
    return cloned;
  });
  if (($("#p_type")?.value || "") === "CASO_CLINICO") {
    const existingClinicalDraft = (state.draft.procedureAnimalEntries || [])[0] || {};
    const selectedClinicalAnimal = byId(currentAnimals(), $("#p_cc_registeredAnimal")?.value || $("#p_animalGroup")?.value || "");
    const animalName = $("#p_cc_animalName")?.value.trim() || $("#p_unregisteredAnimalName")?.value.trim() || animalLabel(selectedClinicalAnimal || {}) || "Animal atendido";
    animals = [createProcedureAnimalEntry(selectedClinicalAnimal || {}, {
      animalId: selectedClinicalAnimal?.id || "",
      sourceLabel: animalName,
      identification: animalName,
      species: $("#p_cc_species")?.value.trim() || selectedClinicalAnimal?.species || "",
      age: $("#p_cc_age")?.value.trim() || selectedClinicalAnimal?.age || "",
      sex: $("#p_cc_sex")?.value.trim() || selectedClinicalAnimal?.sex || "",
      weight: Number($("#p_cc_weight")?.value || selectedClinicalAnimal?.weight || 0) || 0,
      weightRecordedKg: Number($("#p_cc_weight")?.value || selectedClinicalAnimal?.weight || 0) || 0,
      procedureReason: $("#p_cc_reason")?.value.trim() || "",
      generalState: $("#p_cc_animalObservations")?.value.trim() || "",
      examIncluded: true,
      exam: { temperature: $("#p_cc_temp")?.value.trim() || "", findings: $("#p_cc_exam")?.value.trim() || "" },
      medicationsApplied: existingClinicalDraft.medicationsApplied || [],
      vaccinesApplied: existingClinicalDraft.vaccinesApplied || [],
      suppliesApplied: existingClinicalDraft.suppliesApplied || [],
    })];
  }
  if (isUnregisteredClinicalCase() && !animals.length) {
    const unregisteredAnimalName = $("#p_unregisteredAnimalName")?.value.trim() || "Paciente sin registro";
    animals = [createProcedureAnimalEntry({}, { sourceLabel: unregisteredAnimalName, identification: unregisteredAnimalName })];
  }
  const primary = animals[0] || {};
  const medicationApplicationMode = getProcedureMedicationApplicationMode();
  const groupMedication = calculateGroupMedicationDraft();
  const aggregated = aggregateProcedureInventoryFromAnimals(animals);
  const clinicalDayInventory = clinicalInventoryFromDays(state.draft.procedureClinicalDays || []);
  const followupInventoryMeds = (state.draft.procedureFollowupMedicationEntries || []).map((item) => ({
    id: item.id || uid("pmed"),
    itemId: item.medicationId,
    name: item.medicationName,
    unit: item.unit,
    unitCost: item.unitCost,
    theoreticalQty: item.theoreticalQty || 0,
    theoreticalUnit: item.theoreticalUnit || item.unit,
    qty: item.qty,
    totalUsedQty: item.qty,
    inventoryDeductionQty: item.qty,
    inventoryDeductionUnit: item.unit,
    chargeableQty: item.qty,
    route: item.route,
    suggestedQty: item.suggestedQty || 0,
    manualAdjusted: !!item.manualAdjusted,
    manualQty: item.manualQty,
    finalAppliedQty: item.qty,
    calculationMode: item.doseCalculationMode || "PER_KG",
    calculationSummary: item.calculationSummary || "",
    marginQty: 0,
    marginPct: 0,
    marginRationale: "Seguimiento farmacológico",
    source: "FOLLOWUP",
    applicationDate: item.date,
    notes: item.notes || "",
    owner: byId(state.meds, item.medicationId)?.owner || "",
  }));
  const selectedGroupProcedureAnimal = selectedProcedureSpeciesAnimal();
  const groupIdentification = groupMedication?.groupAnimalLabel || animalLabel(selectedGroupProcedureAnimal || {}) || "";
  const groupSpecies = groupMedication?.species || selectedGroupProcedureAnimal?.species || "";
  return {
    id: state.editing.procedureId || uid("proc"),
    date: $("#p_date").value,
    type: $("#p_type").value,
    scope: $("#p_scope").value,
    place: $("#p_place").value.trim(),
    producerId: isUnregisteredClinicalCase() ? "" : $("#p_producer").value,
    producerName: isUnregisteredClinicalCase() ? ($("#p_unregisteredClientName")?.value.trim() || "") : producerName($("#p_producer").value),
    ownerMode: isUnregisteredClinicalCase() ? "UNREGISTERED" : "REGISTERED",
    unregisteredClientName: $("#p_unregisteredClientName")?.value.trim() || "",
    unregisteredAnimalName: $("#p_unregisteredAnimalName")?.value.trim() || "",
    animalId: isUnregisteredClinicalCase() ? "" : (($("#p_type")?.value || "") === "CASO_CLINICO" ? ($("#p_cc_registeredAnimal")?.value || "") : (($("#p_scope")?.value || "INDIVIDUAL") === "GRUPAL" ? ($("#p_groupAnimalBase")?.value || "") : $("#p_animalGroup").value)),
    animalsQtyUsed: Number($("#p_animalsQtyUsed").value || animals.length || 0),
    species: primary.species || ((medicationApplicationMode === "GROUP_WATER_FEED" || ($("#p_scope")?.value || "INDIVIDUAL") === "GRUPAL") ? groupSpecies : ""),
    identification: primary.identification || ((medicationApplicationMode === "GROUP_WATER_FEED" || ($("#p_scope")?.value || "INDIVIDUAL") === "GRUPAL") ? groupIdentification : ""),
    weight: primary.weightRecordedKg || "",
    temperature: primary.exam?.temperature || "",
    preventiveSubtype: $("#p_preventiveSubtype")?.value || "",
    zootecniaActivity: $("#p_zoo_activity")?.value.trim() || "",
    notes: $("#p_notes").value.trim(),
    chargeStatus: $("#p_chargeStatus").value,
    chargeNotes: $("#p_chargeNotes").value.trim(),
    medicationApplicationMode,
    groupMedication,
    animals: animals,
    inventory: {
      meds: [...aggregated.meds, ...(state.draft.procedureMedUses || []).filter((item) => (item.productType || "MEDICAMENTO") === "MEDICAMENTO"), ...followupInventoryMeds, ...clinicalDayInventory.meds],
      vaccines: [...aggregated.vaccines, ...(state.draft.procedureMedUses || []).filter((item) => item.productType === "VACUNA").map((item) => ({ ...item, animalsApplied: item.baseAmount || item.qty, priceCharged: item.costCharged }))],
      supplies: [...(aggregated.supplies || []), ...state.draft.procedureSupplyUses, ...(state.draft.procedureMedUses || []).filter((item) => item.productType === "INSUMO"), ...clinicalDayInventory.supplies],
    },
    procedureSpeciesDoses: [...(state.draft.procedureSpeciesDoses || [])],
    dosis_por_especie: groupSpeciesDoseRows(state.draft.procedureSpeciesDoses || []),
    caseClinical: {
      animalName: $("#p_cc_animalName")?.value.trim() || primary.identification || "",
      species: $("#p_cc_species")?.value.trim() || primary.species || "",
      breed: $("#p_cc_breed")?.value.trim() || "",
      sex: $("#p_cc_sex")?.value.trim() || primary.sex || "",
      age: $("#p_cc_age")?.value.trim() || primary.age || "",
      weight: $("#p_cc_weight")?.value || primary.weightRecordedKg || "",
      bodyCondition: $("#p_cc_bodyCondition")?.value.trim() || "",
      reproductiveStatus: $("#p_cc_reproductiveStatus")?.value.trim() || "",
      animalObservations: $("#p_cc_animalObservations")?.value.trim() || "",
      reason: primary.procedureReason || $("#p_cc_reason")?.value?.trim?.() || "",
      anamnesis: $("#p_cc_anamnesis")?.value.trim() || "",
      mucosa: $("#p_cc_mucosa")?.value.trim() || "",
      tllc: $("#p_cc_tllc")?.value.trim() || "",
      hydration: $("#p_cc_hydration")?.value.trim() || "",
      fc: $("#p_cc_fc")?.value.trim() || "",
      fr: $("#p_cc_fr")?.value.trim() || "",
      temp: $("#p_cc_temp")?.value.trim() || "",
      otherSigns: $("#p_cc_otherSigns")?.value.trim() || "",
      exam: $("#p_cc_exam")?.value.trim() || "",
      presumptiveDx: $("#p_cc_presumptiveDx")?.value.trim() || "",
      differentialDx: $("#p_cc_differentialDx")?.value.trim() || "",
      tests: $("#p_cc_tests")?.value.trim() || "",
      medicationDays: [...(state.draft.procedureClinicalDays || [])],
      recommendations: $("#p_cc_recommendations")?.value.trim() || "",
      followup: $("#p_cc_followup")?.value.trim() || "",
      nextReview: $("#p_cc_nextReview")?.value || "",
      treatmentChanges: $("#p_cc_treatmentChanges")?.value.trim() || "",
      followupObservations: $("#p_cc_followupObservations")?.value.trim() || "",
      prognosis: $("#p_cc_prognosis")?.value || "",
      outcome: $("#p_cc_outcome")?.value || "",
      closeDate: $("#p_cc_closeDate")?.value || "",
      deathCause: $("#p_cc_deathCause")?.value.trim() || "",
      finalRecommendations: $("#p_cc_finalRecommendations")?.value.trim() || "",
      followupMedications: [...(state.draft.procedureFollowupMedicationEntries || [])],
      structuredDoses: [...(state.draft.procedureSpeciesDoses || [])],
      photos: [...state.draft.procedureCasePhotos]
    },
    necropsy: { idAnimal: $("#p_nec_idAnimal").value.trim(), species: $("#p_nec_species").value.trim(), breed: $("#p_nec_breed").value.trim(), sex: $("#p_nec_sex").value.trim(), age: $("#p_nec_age").value.trim(), sterilized: $("#p_nec_sterilized").value.trim(), color: $("#p_nec_color").value.trim(), weight: $("#p_nec_weight").value.trim(), birthDate: $("#p_nec_birthDate").value, deathDate: $("#p_nec_deathDate").value, timeDeathNec: $("#p_nec_timeDeathNec").value.trim(), sender: $("#p_nec_sender").value.trim(), caseNumber: $("#p_nec_caseNumber").value.trim(), clinicalDx: $("#p_nec_clinicalDx").value.trim(), additionalData: $("#p_nec_additionalData").value.trim(), externalInspection: $("#p_nec_externalInspection").value.trim(), primaryIncision: $("#p_nec_primaryIncision").value.trim(), secondaryIncision: $("#p_nec_secondaryIncision").value.trim(), organExtraction: $("#p_nec_organExtraction").value.trim(), respiratory: $("#p_nec_respiratory").value.trim(), heart: $("#p_nec_heart").value.trim(), spleen: $("#p_nec_spleen").value.trim(), kidneys: $("#p_nec_kidneys").value.trim(), stomach: $("#p_nec_stomach").value.trim(), preliminaryReport: $("#p_nec_preliminaryReport").value.trim(), morphDx: $("#p_nec_morphDx").value.trim(), finalDx: $("#p_nec_finalDx").value.trim(), comments: $("#p_nec_comments").value.trim(), biblioSummary: $("#p_nec_biblioSummary").value.trim(), bibliography: $("#p_nec_bibliography").value.trim(), samplesTaken: $("#p_nec_samplesTaken")?.value.trim() || "", systematicFindings: getNecropsyFindingsFromDom(), photos: [...state.draft.procedureNecropsyPhotos] },
    zootecnia: { activity: $("#p_zoo_activity").value.trim(), evaluation: $("#p_zoo_evaluation").value.trim(), intervention: $("#p_zoo_intervention").value.trim(), plan: $("#p_zoo_plan").value.trim(), followup: $("#p_zoo_followup").value.trim() },
    surgery: {},
    charge: { ...calculateProcedureCharge(), manual: Number($("#p_chargeManual").value || 0), reason: $("#p_chargeReason").value.trim(), status: $("#p_chargeStatus").value, notes: $("#p_chargeNotes").value.trim(), photo: state.draft.procedureChargePhoto },
    labIds: [...state.draft.procedureLabIds],
  };
}
function saveProcedure() {
  if (!persistActiveClinicalDayEdit()) return show("p_err", "El día de medicación en edición debe conservar al menos un medicamento o insumo, o elimínalo antes de guardar.", "error");
  const p = collectProcedure();
  if (!p.date || !p.type) return show("p_err", "Fecha y tipo son obligatorios.", "error");
  if (!p.producerId && !(p.type === "CASO_CLINICO" && p.ownerMode === "UNREGISTERED")) return show("p_err", "Productor(a) es obligatorio salvo caso clínico sin productor registrado.", "error");
  if (p.type === "CASO_CLINICO" && p.ownerMode === "UNREGISTERED" && !p.unregisteredClientName) return show("p_err", "Captura el nombre de la persona atendida para el caso clínico sin productor registrado.", "error");
  if (p.type === "PREVENTIVA" && !p.preventiveSubtype) return show("p_err", "Selecciona el subtipo de medicina preventiva.", "error");
  if (p.type === "ZOOTECNIA" && !p.zootecniaActivity) return show("p_err", "Captura la actividad flexible de asesoría clínica / zootécnica.", "error");
  if (p.scope === "INDIVIDUAL" && p.medicationApplicationMode !== "GROUP_WATER_FEED" && !p.animals.length) return show("p_err", "Agrega al menos un animal tratado dentro del procedimiento.", "error");
  if (p.scope === "GRUPAL" && Number(p.animalsQtyUsed || 0) <= 0) return show("p_err", "En procedimiento grupal captura un número válido de animales atendidos.", "error");
  if (p.medicationApplicationMode === "GROUP_WATER_FEED") {
    if (!p.groupMedication?.medicationId) return show("p_err", "En aplicación grupal selecciona un medicamento.", "error");
    if (Number(p.animalsQtyUsed || 0) <= 0) return show("p_err", "En aplicación grupal captura a cuántos animales aplica.", "error");
    if (!p.groupMedication?.groupAnimalId) return show("p_err", "En aplicación grupal selecciona un grupo/animal registrado del productor(a).", "error");
    if (!p.groupMedication?.species) return show("p_err", "En aplicación grupal el sistema no pudo detectar la especie del grupo/animal seleccionado.", "error");
    const rule = p.groupMedication?.rule || "PER_LITER";
    const requiresVolume = ["PER_LITER", "PER_KG_FEED"].includes(rule);
    const requiresAnimals = rule === "PER_ANIMAL";
    const requiresWeight = rule === "PER_KG";
    const volumeOk = !requiresVolume || Number(p.groupMedication?.totalVolumeKg || 0) > 0;
    const animalsOk = !requiresAnimals || Number((p.animals || []).length || 0) > 0;
    const weightOk = !requiresWeight || Number((p.animals || []).reduce((acc, item) => acc + Number(item.weightRecordedKg || 0), 0)) > 0;
    if (Number(p.groupMedication?.doseBase || 0) <= 0 || !volumeOk || !animalsOk || !weightOk) {
      return show("p_err", "En aplicación grupal captura una dosis base válida y la base de cálculo correspondiente (L, kg alimento, animales o kg vivo).", "error");
    }
  }
  if (["CASO_CLINICO", "NECROPSIA"].includes(p.type) && p.scope !== "INDIVIDUAL") p.scope = "INDIVIDUAL";
  if (p.type === "NECROPSIA" && !p.animalId) return show("p_err", "Este procedimiento requiere un animal individual.", "error");
  if (p.scope === "INDIVIDUAL" && p.medicationApplicationMode !== "GROUP_WATER_FEED" && p.animalsQtyUsed && p.animals.length !== p.animalsQtyUsed) return show("p_err", "La cantidad capturada no coincide con los animales individuales agregados.", "error");
  const idx = state.procedures.findIndex((x) => x.id === p.id);
  const previous = idx >= 0 ? state.procedures[idx] : null;
  const validationProblems = validateProcedureAnimalEntries(p.animals || [], previous);
  if (validationProblems.length) return show("p_err", validationProblems[0], "error");
  const followupStockProblems = (p.caseClinical?.followupMedications || []).map((item) => {
    const med = byId(state.meds, item.medicationId);
    if (!med) return `No se encontró el medicamento de seguimiento (${item.medicationName || "sin nombre"}).`;
    const prevQty = Number((previous?.caseClinical?.followupMedications || []).filter((old) => old.medicationId === item.medicationId).reduce((acc, old) => acc + Number(old.qty || 0), 0));
    const available = Number(medRemaining(med) || 0) + prevQty;
    const required = Number(item.qty || 0);
    return required > available + 0.0001 ? `No hay stock suficiente de ${med.brand} para seguimiento. Disponible: ${available.toFixed(2)} ${med.unit || ""}. Requerido: ${required.toFixed(2)} ${item.unit || med.unit || ""}.` : "";
  }).filter(Boolean);
  if (followupStockProblems.length) return show("p_err", followupStockProblems[0], "error");
  const inventoryStockProblems = validateProcedureInventoryStock(p, previous);
  if (inventoryStockProblems.length) return show("p_err", inventoryStockProblems[0], "error");
  const clinicalStockProblems = validateClinicalDayInventory(p, previous);
  if (clinicalStockProblems.length) return show("p_err", clinicalStockProblems[0], "error");
  p.inventoryMovements = buildProcedureInventoryMovements(p);
  if (idx >= 0) state.procedures[idx] = p; else state.procedures.unshift(p);
  reconcileAnaRosaDebtFromProcedures();
  applyClinicalOutcomeToRegisteredAnimal(p, previous);
  if (p.type === "NECROPSIA" && p.animalId) {
    const prod = byId(state.producers, p.producerId);
    const animalTarget = byId(prod?.animals || [], p.animalId);
    const alreadyApplied = previous?.type === "NECROPSIA" && previous?.animalId === p.animalId;
    if (animalTarget && !alreadyApplied) animalTarget.quantity = Math.max(0, Number(animalTarget.quantity || 0) - 1);
  }
  saveState(); renderAll(); resetProcedure(); show("p_ok", "Procedimiento guardado.", "success");
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
  state.draft.procedureAnimalEntries = [];
  state.draft.procedureFollowupMedicationEntries = [];
  state.draft.procedureFollowupMedicationEditId = null;
  state.draft.procedureSpeciesDoses = [];
  state.draft.procedureClinicalDayMedications = [];
  state.draft.procedureClinicalDaySupplies = [];
  state.draft.procedureClinicalDays = [];
  state.draft.procedureClinicalDayEditId = null;
  if ($("#p_speciesDoseJson")) $("#p_speciesDoseJson").value = "";
  resetProcedureFollowupMedicationForm();
  showProcedureManualMedEditor(false);
  renderProcedureType(); renderProcedureDraftLists(); renderProcedureAnimalSelect();
}
function fillProcedure(p) {
  resetProcedure();
  state.editing.procedureId = p.id;
  Object.entries({ p_date: p.date, p_type: p.type, p_caseOwnerMode: p.ownerMode || (p.producerId ? "REGISTERED" : "UNREGISTERED"), p_unregisteredClientName: p.unregisteredClientName || p.producerName || "", p_unregisteredAnimalName: p.unregisteredAnimalName || p.identification || "", p_scope: p.scope, p_place: p.place, p_costTotal: p.charge?.base || "", p_producer: p.producerId, p_animalGroup: p.animalId, p_animalsQtyUsed: p.animalsQtyUsed, p_preventiveSubtype: p.preventiveSubtype || "", p_zoo_activity: p.zootecniaActivity || p.zootecnia?.activity || "", p_chargeStatus: p.chargeStatus, p_chargeNotes: p.chargeNotes, p_notes: p.notes, p_medicationApplicationMode: p.medicationApplicationMode || "INDIVIDUAL_ANIMAL", p_groupMedSelect: p.groupMedication?.medicationId || "", p_groupAdministrationType: p.groupMedication?.administrationType || "AGUA", p_groupDoseRule: p.groupMedication?.rule || "PER_LITER", p_groupDoseBase: p.groupMedication?.doseBase || "", p_groupDoseUnit: p.groupMedication?.doseUnit || "", p_groupTotalVolumeKg: p.groupMedication?.totalVolumeKg || "", p_groupAnimalBase: p.groupMedication?.groupAnimalId || (p.scope === "GRUPAL" ? p.animalId : ""), p_groupDetectedSpecies: p.groupMedication?.species || "", p_cc_registeredAnimal: p.animalId || "", p_cc_animalName: p.caseClinical?.animalName || p.identification || p.unregisteredAnimalName || "", p_cc_species: p.caseClinical?.species || p.species || "", p_cc_breed: p.caseClinical?.breed || "", p_cc_sex: p.caseClinical?.sex || "", p_cc_age: p.caseClinical?.age || "", p_cc_weight: p.caseClinical?.weight || p.weight || "", p_cc_reproductiveStatus: p.caseClinical?.reproductiveStatus || "", p_cc_animalObservations: p.caseClinical?.animalObservations || "", p_cc_reason: p.caseClinical?.reason, p_cc_anamnesis: p.caseClinical?.anamnesis, p_cc_bodyCondition: p.caseClinical?.bodyCondition, p_cc_mucosa: p.caseClinical?.mucosa, p_cc_tllc: p.caseClinical?.tllc, p_cc_hydration: p.caseClinical?.hydration, p_cc_fc: p.caseClinical?.fc, p_cc_fr: p.caseClinical?.fr, p_cc_temp: p.caseClinical?.temp, p_cc_age: p.caseClinical?.age, p_cc_exam: p.caseClinical?.exam, p_cc_presumptiveDx: p.caseClinical?.presumptiveDx, p_cc_otherSigns: p.caseClinical?.otherSigns || "", p_cc_differentialDx: p.caseClinical?.differentialDx || "", p_cc_tests: p.caseClinical?.tests || "", p_cc_nextReview: p.caseClinical?.nextReview || "", p_cc_treatmentChanges: p.caseClinical?.treatmentChanges || "", p_cc_followupObservations: p.caseClinical?.followupObservations || "", p_cc_prognosis: p.caseClinical?.prognosis || "", p_cc_closeDate: p.caseClinical?.closeDate || "", p_cc_finalRecommendations: p.caseClinical?.finalRecommendations || "", p_cc_treatment: p.caseClinical?.treatment, p_cc_recommendations: p.caseClinical?.recommendations, p_cc_followup: p.caseClinical?.followup, p_cc_outcome: p.caseClinical?.outcome || "", p_cc_deathCause: p.caseClinical?.deathCause || "", p_nec_idAnimal: p.necropsy?.idAnimal, p_nec_species: p.necropsy?.species, p_nec_breed: p.necropsy?.breed, p_nec_sex: p.necropsy?.sex, p_nec_age: p.necropsy?.age, p_nec_sterilized: p.necropsy?.sterilized, p_nec_color: p.necropsy?.color, p_nec_weight: p.necropsy?.weight, p_nec_birthDate: p.necropsy?.birthDate, p_nec_deathDate: p.necropsy?.deathDate, p_nec_timeDeathNec: p.necropsy?.timeDeathNec, p_nec_sender: p.necropsy?.sender, p_nec_caseNumber: p.necropsy?.caseNumber, p_nec_clinicalDx: p.necropsy?.clinicalDx, p_nec_additionalData: p.necropsy?.additionalData, p_nec_externalInspection: p.necropsy?.externalInspection, p_nec_primaryIncision: p.necropsy?.primaryIncision, p_nec_secondaryIncision: p.necropsy?.secondaryIncision, p_nec_organExtraction: p.necropsy?.organExtraction, p_nec_respiratory: p.necropsy?.respiratory, p_nec_heart: p.necropsy?.heart, p_nec_spleen: p.necropsy?.spleen, p_nec_kidneys: p.necropsy?.kidneys, p_nec_stomach: p.necropsy?.stomach, p_nec_preliminaryReport: p.necropsy?.preliminaryReport, p_nec_morphDx: p.necropsy?.morphDx, p_nec_finalDx: p.necropsy?.finalDx, p_nec_comments: p.necropsy?.comments, p_nec_biblioSummary: p.necropsy?.biblioSummary, p_nec_bibliography: p.necropsy?.bibliography, p_nec_samplesTaken: p.necropsy?.samplesTaken, p_zoo_evaluation: p.zootecnia?.evaluation, p_zoo_intervention: p.zootecnia?.intervention, p_zoo_plan: p.zootecnia?.plan, p_zoo_followup: p.zootecnia?.followup, p_chargeManual: p.charge?.manual, p_chargeReason: p.charge?.reason }).forEach(([k, v]) => { if ($("#" + k)) $("#" + k).value = safe(v); });
  renderProcedureAnimalSelect();
  state.draft.procedureAnimalEntries = ((p.animals || []).length ? p.animals : [createProcedureAnimalEntry(byId(currentAnimals(), p.animalId) || {}, { animalId: p.animalId, identification: p.identification, species: p.species, weight: p.weight, examIncluded: false })]).map((entry) => createProcedureAnimalEntry(byId(currentAnimals(), entry.animalId) || {}, { ...entry, age: entry.age || p.caseClinical?.age || "", sex: entry.sex || p.caseClinical?.sex || "", procedureReason: entry.procedureReason || p.caseClinical?.reason || "" }));
  state.draft.procedureMedUses = [
    ...(legacyGroupMedicationToProcedureUse(p.groupMedication) ? [legacyGroupMedicationToProcedureUse(p.groupMedication)] : []),
    ...(p.inventory?.meds || []).filter((item) => !item.linkedAnimals?.length && !item.applicationMode && item.source !== "FOLLOWUP" && item.source !== "CLINICAL_DAY").map((item) => ({ ...item, productType: item.productType || "MEDICAMENTO" })),
    ...(p.inventory?.vaccines || []).filter((item) => item.source === "PROCEDURE_MANUAL" || item.productType === "VACUNA").map((item) => ({ ...item, productType: "VACUNA", qty: item.qty || item.inventoryDeductionQty || item.animalsApplied || 0, baseAmount: item.baseAmount || item.animalsApplied || item.qty || 0, costCharged: item.costCharged ?? item.priceCharged })),
    ...(p.inventory?.supplies || []).filter((item) => item.source === "PROCEDURE_MANUAL" || item.productType === "INSUMO").map((item) => ({ ...item, productType: "INSUMO" })),
  ];
  state.draft.procedureVaccineUses = [];
  state.draft.procedureSupplyUses = [...(p.inventory?.supplies || []).filter((item) => item.source !== "CLINICAL_DAY" && item.source !== "PROCEDURE_MANUAL" && item.productType !== "INSUMO")];
  state.draft.procedureLabIds = [...(p.labIds || [])];
  state.draft.procedureCasePhotos = [...(p.caseClinical?.photos || [])];
  state.draft.procedureFollowupMedicationEntries = [...(p.caseClinical?.followupMedications || [])];
  state.draft.procedureFollowupMedicationEditId = null;
  state.draft.procedureClinicalDayMedications = [];
  state.draft.procedureClinicalDaySupplies = [];
  state.draft.procedureClinicalDays = [...(p.caseClinical?.medicationDays || [])];
  state.draft.procedureClinicalDayEditId = null;
  state.draft.procedureSpeciesDoses = (p.procedureSpeciesDoses || p.caseClinical?.structuredDoses || (p.dosis_por_especie ? flattenSpeciesDoseJson({ dosis_por_especie: p.dosis_por_especie }) : []));
  if ($("#p_speciesDoseJson")) $("#p_speciesDoseJson").value = state.draft.procedureSpeciesDoses.length ? JSON.stringify({ dosis_por_especie: groupSpeciesDoseRows(state.draft.procedureSpeciesDoses) }, null, 2) : "";
  resetProcedureFollowupMedicationForm();
  state.draft.procedureNecropsyPhotos = [...(p.necropsy?.photos || [])];
  state.draft.procedureNecropsyFindings = migrateLegacyNecropsyFieldsToSystematic(p.necropsy || {}, p.necropsy?.systematicFindings || []);
  renderNecropsySystematicList(state.draft.procedureNecropsyFindings);
  state.draft.procedureChargePhoto = p.charge?.photo || null;
  renderProcedureType(); renderProcedureDraftLists();
}
function procedureAnimalSummaryText(p) {
  const animals = p.animals || [];
  return animals.map((entry) => {
    normalizeEntryMedicationApplied(entry);
    const medsCount = (entry.medicationsApplied || []).length;
    return `${entry.identification || entry.sourceLabel} · ${entry.species || ""} · ${Number(entry.weightRecordedKg || 0).toFixed(2)} kg · ${entry.weightMethod}${medsCount ? ` · ${medsCount} medicamento(s)` : ""}${entry.vaccineId ? " · vacuna" : ""}${entry.examIncluded ? " · con examen" : ""}`;
  }).join(" | ");
}
function renderProcedureList() {
  const list = $("#p_list"); if (!list) return; list.innerHTML = ""; if ($("#p_count")) $("#p_count").textContent = state.procedures.length;
  state.procedures.forEach((p) => {
    const prod = byId(state.producers, p.producerId);
    const item = document.createElement("div"); item.className = "item";
    item.innerHTML = `<h4>${esc(p.type)} · ${esc(prod?.basic?.name || p.unregisteredClientName || p.producerName || "Sin productor registrado")}</h4><div class="line"><b>Fecha:</b> ${esc(p.date)}</div><div class="line"><b>Modalidad:</b> ${esc(p.scope)} · <b>Animales:</b> ${(p.animals || []).length}</div><div class="line"><b>Detalle:</b> ${esc(procedureAnimalSummaryText(p) || p.identification || "")}</div><div class="line"><b>Medicamentos usados:</b> ${(p.inventory?.meds || []).length}</div><div class="line"><b>Monto calculado:</b> ${money(p.charge?.total)}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, w, e, del] = item.querySelectorAll("button");
    edit.onclick = () => fillProcedure(p);
    w.onclick = () => exportWord(`procedimiento_${slug(p.id)}.doc`, procedureWordHtml(p));
    e.onclick = () => exportExcel(`procedimiento_${slug(p.id)}.xls`, producerExcelSheets([], [], [], [], [], [p], state.labTests.filter((l) => (p.labIds || []).includes(l.id) || l.linkedProcedureId === p.id)));
    del.onclick = () => { state.labTests.forEach((lab) => { if (lab.linkedProcedureId === p.id) lab.linkedProcedureId = null; }); queueDeletedRecord("procedures", p); state.procedures = state.procedures.filter((x) => x.id !== p.id); saveState(); renderAll(); };
    list.appendChild(item);
  });
}
function caseMedicationAppliedTable(entries = []) {
  const meds = (entries || []).flatMap((entry) => {
    normalizeEntryMedicationApplied(entry);
    return (entry.medicationsApplied || []).map((item) => ({ entry, item }));
  });
  if (!meds.length) return "<p>Sin medicamentos aplicados en el caso clínico.</p>";
  return `<h3>Tratamiento farmacológico</h3><table><tr><th>#</th><th>Animal</th><th>Medicamento</th><th>Cantidad final</th><th>Vía</th><th>Ajuste manual</th></tr>${meds.map(({ entry, item }, idx) => {
    return `<tr><td>${idx + 1}</td><td>${esc(entry.identification || entry.sourceLabel || "")}</td><td>${esc(item.medicationName || "")}</td><td>${esc(`${Number(item.finalAppliedAmount || 0).toFixed(2)} ${item.finalUnit || ""}`.trim())}</td><td>${esc(item.route || "Sin vía de administración registrada")}</td><td>${item.manualAdjustment ? "Sí" : "No"}</td></tr>`;
  }).join("")}</table>`;
}
function followupMedicationAppliedTable(items = []) {
  const rows = items || [];
  if (!rows.length) return "<p>Sin medicamentos registrados en seguimiento.</p>";
  return `<h3>Seguimiento farmacológico</h3><table><tr><th>Fecha</th><th>Medicamento</th><th>Sugerida</th><th>Cantidad final</th><th>Ajuste manual</th><th>Vía</th><th>Costo</th><th>Cálculo</th><th>Observaciones</th></tr>${rows.map((item) => `<tr><td>${esc(item.date || "")}</td><td>${esc(item.medicationName || "")}</td><td>${esc(`${Number(item.suggestedQty || 0).toFixed(2)} ${item.suggestedUnit || item.unit || ""}`.trim())}</td><td>${esc(`${Number(item.qty || 0).toFixed(2)} ${item.unit || ""}`.trim())}</td><td>${item.manualAdjusted ? "Sí" : "No"}</td><td>${esc(item.route || "")}</td><td>${money(Number(item.subtotal || (Number(item.qty || 0) * Number(item.unitCost || 0))))}</td><td>${esc(item.calculationSummary || "")}</td><td>${esc(item.notes || "")}</td></tr>`).join("")}</table>`;
}
function medicationBreakdownTable(meds = []) {
  return `<table><tr><th>Medicamento</th><th>Base</th><th>Vía</th><th>Caducidad</th><th>Dosis teórica</th><th>Margen</th><th>Total usado</th><th>Descuento inventario</th><th>Costo</th><th>Explicación</th></tr>${meds.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(doseRuleLabel(m.calculationMode))}</td><td>${esc(m.route || "Sin vía de administración registrada")}</td><td>${esc(m.expiryLabel || "Sin fecha de caducidad registrada")}</td><td>${Number(m.theoreticalQty || 0).toFixed(2)} ${esc(m.theoreticalUnit || m.unit || "")}</td><td>${Number(m.marginQty || 0).toFixed(2)} ${esc(m.unit || "")} (${Number(m.marginPct || 0).toFixed(2)}%)</td><td>${Number(m.totalUsedQty || m.chargeableQty || 0).toFixed(2)} ${esc(m.unit || "")}</td><td>${Number(m.inventoryDeductionQty || m.qty || 0).toFixed(2)} ${esc(m.inventoryDeductionUnit || m.unit || "")}</td><td>${money(Number(m.inventoryDeductionQty || m.totalUsedQty || m.chargeableQty || 0) * Number(m.unitCost || 0))}</td><td>${esc(m.calculationSummary || "")} · ${esc(m.marginRationale || "")}</td></tr>`).join("")}</table>`;
}
function chargeBreakdownTable(charge = {}) {
  const breakdown = charge.breakdown || {};
  const rows = [
    ...(breakdown.medsProcedure || breakdown.meds || []).map((item) => ["Medicamento (procedimiento)", item.name, item.qtyLabel, item.unitCostLabel, money(item.subtotal)]),
    ...(breakdown.medsFollowup || []).map((item) => ["Medicamento (seguimiento)", item.name, item.qtyLabel, item.unitCostLabel, money(item.subtotal)]),
    ...(breakdown.vaccines || []).map((item) => ["Vacuna", item.name, item.qtyLabel, item.unitCostLabel, money(item.subtotal)]),
    ...(breakdown.supplies || []).map((item) => ["Insumo", item.name, item.qtyLabel, item.unitCostLabel, money(item.subtotal)]),
    ...(breakdown.service || []).map((item) => ["Servicio", item.name, item.qtyLabel, item.unitCostLabel, money(item.subtotal)]),
  ];
  if (!rows.length) return "<div class=\"help\">Aún no hay conceptos cobrables registrados.</div>";
  return `<table><tr><th>Tipo</th><th>Concepto</th><th>Cantidad</th><th>Costo unitario</th><th>Subtotal</th></tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
}
function procedureAnimalsTable(animals = []) {
  return `<table><tr><th>Identificación</th><th>Especie</th><th>Edad</th><th>Sexo</th><th>Método de peso</th><th>Peso utilizable (kg)</th><th>Motivo</th><th>Medicamentos aplicados</th><th>Vacuna</th><th>Condición general</th><th>Examen físico</th><th>Observaciones</th></tr>${animals.map((a) => {
    normalizeEntryMedicationApplied(a);
    const medsText = (a.medicationsApplied || []).map((med, idx) => `${idx + 1}. ${med.medicationName || ""} (${Number(med.finalAppliedAmount || 0).toFixed(2)} ${med.finalUnit || ""}, ${med.route || "Sin vía"})`).join(" | ");
    return `<tr><td>${esc(a.identification || a.sourceLabel)}</td><td>${esc(a.species)}</td><td>${esc(a.age || "")}</td><td>${esc(a.sex || "")}</td><td>${esc(a.weightMethod)}</td><td>${Number(a.weightRecordedKg || 0).toFixed(2)}</td><td>${esc(a.procedureReason || "")}</td><td>${esc(medsText || "Sin medicamentos agregados")}</td><td>${esc(byId(state.vaccines, a.vaccineId)?.brand || "")}</td><td>${esc(a.generalState || "")}</td><td>${a.examIncluded ? esc([a.exam?.temperature ? `Temp ${a.exam.temperature}` : "", a.exam?.findings].filter(Boolean).join(" · ")) : "No"}</td><td>${esc([a.notes || "", medsText ? `Total medicamentos: ${(a.medicationsApplied || []).length}` : ""].filter(Boolean).join(" · "))}</td></tr>`;
  }).join("")}</table>`;
}
function procedureWordHtml(p) {
  const prod = byId(state.producers, p.producerId); const labs = state.labTests.filter((l) => (p.labIds || []).includes(l.id) || l.linkedProcedureId === p.id);
  const medicationMode = p.medicationApplicationMode || "INDIVIDUAL_ANIMAL";
  const groupText = medicationMode === "GROUP_WATER_FEED"
    ? `Se administró medicamento en ${safe((p.groupMedication?.administrationType || "AGUA")).toLowerCase()}: ${Number(p.groupMedication?.totalQty || 0).toFixed(2)} ${p.groupMedication?.doseUnit || ""} en ${Number(p.groupMedication?.totalVolumeKg || 0).toFixed(2)} ${p.groupMedication?.rule === "PER_KG_FEED" ? "kg" : "L"}.`
    : `Se aplicó a ${(p.animals || []).length} animales con dosis individual por peso/registro.`;
  return `<h1>Procedimiento ${esc(p.type)}</h1><p><b>Fecha:</b> ${esc(p.date)}</p><p><b>Productor(a):</b> ${esc(procedureProducerName(p))}</p><p><b>Modalidad:</b> ${esc(p.scope)}</p><p><b>Tipo de aplicación de medicamento:</b> ${esc(medicationMode === "GROUP_WATER_FEED" ? "Grupal (agua / alimento)" : "Individual por animal")}</p><p><b>Animales incluidos:</b> ${(p.animals || []).length}</p><p><b>Resumen de medicación:</b> ${esc(groupText)}</p><p><b>Notas:</b> ${esc(p.notes)}</p><h2>Datos generales</h2>${objectEntriesTable({ fecha: p.date, tipo: p.type, subtipo_preventiva: p.preventiveSubtype || "", actividad_zootecnia: p.zootecniaActivity || p.zootecnia?.activity || "", alcance: p.scope, lugar: p.place, productor: procedureProducerName(p), cantidad_animales: p.animalsQtyUsed, especie: p.species, identificacion: p.identification, peso: p.weight, temperatura: p.temperature, estado_cobro: p.chargeStatus, notas_cobro: p.chargeNotes, notas_generales: p.notes, tipo_aplicacion_medicamento: medicationMode, grupo_animal_base: p.groupMedication?.groupAnimalLabel || "", especie_detectada_grupal: p.groupMedication?.species || "", regla_grupal: doseRuleLabel(p.groupMedication?.rule || ""), dosis_base_grupal: p.groupMedication?.doseBase ? `${Number(p.groupMedication?.doseBase || 0).toFixed(4)} ${p.groupMedication?.doseUnit || ""}` : "", medicacion_grupal: medicationMode === "GROUP_WATER_FEED" ? `${p.groupMedication?.medicationName || ""} · ${p.groupMedication?.summary || ""}` : "" })}<h2>Animales tratados</h2>${procedureAnimalsTable(p.animals || [])}<h2>Inventario usado</h2>${medicationBreakdownTable(p.inventory?.meds || [])}<table><tr><th>Tipo</th><th>Nombre</th><th>Cantidad</th><th>Costo</th><th>Notas</th></tr>${(p.inventory?.vaccines || []).map((i) => `<tr><td>Vacuna</td><td>${esc(i.name)}</td><td>${esc(i.animalsApplied)} animales</td><td>${money(Number(i.animalsApplied || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.notes || "")}</td></tr>`).join("")}${(p.inventory?.supplies || []).map((i) => `<tr><td>Insumo</td><td>${esc(i.name)}</td><td>${esc(i.qty)}</td><td>${money(Number(i.qty || 0) * Number(i.unitCost || 0))}</td><td>${esc(i.notes || "")}</td></tr>`).join("")}</table><h2>Dosis estructuradas del procedimiento</h2><table><tr><th>Especie</th><th>Dosis</th></tr>${(p.procedureSpeciesDoses || p.caseClinical?.structuredDoses || []).map((row) => `<tr><td>${esc(normalizeDoseRow(row).species)}</td><td>${esc(speciesDoseSummary(row))}</td></tr>`).join("")}</table><h2>Caso clínico</h2>${caseMedicationAppliedTable(p.animals || [])}${followupMedicationAppliedTable(p.caseClinical?.followupMedications || [])}${objectEntriesTable(p.caseClinical || {})}<h2>Necropsia</h2>${objectEntriesTable(p.necropsy || {})}<h2>Atención clínica / zootécnica</h2>${objectEntriesTable(p.zootecnia || {})}<h2>Pruebas vinculadas</h2><table><tr><th>Tipo</th><th>Fecha</th><th>Animal</th><th>Resultado</th><th>Interpretación</th><th>Observaciones</th></tr>${labs.map((l) => `<tr><td>${esc(l.type)}</td><td>${esc(l.date)}</td><td>${esc(l.animal)}</td><td>${esc(l.result)}</td><td>${esc(l.interpretation)}</td><td>${esc(l.notes)}</td></tr>`).join("")}</table>${labs.map((l, idx) => imageHtml(l.file, `Archivo prueba ${idx + 1}`)).join("")}<h2>Cobro y evidencia</h2>${chargeBreakdownTable(p.charge || {})}${objectEntriesTable({ procedimiento: money(p.charge?.base), medicamentos: money(p.charge?.meds), vacunas: money(p.charge?.vaccines), insumos: money(p.charge?.supplies), subtotal: money(p.charge?.subtotal), total: money(p.charge?.total), monto_final: money(p.charge?.manual), estatus: p.charge?.status, observaciones: p.charge?.reason || p.charge?.notes })}${(p.caseClinical?.photos || []).map((src, i) => imageHtml(src, `Caso clínico ${i + 1}`)).join("")}${(p.necropsy?.photos || []).map((src, i) => imageHtml(src, `Necropsia ${i + 1}`)).join("")}${imageHtml(p.charge?.photo, "Evidencia de cobro")}`;
}
function procedureSummaryHtml() { return `<h1>Procedimientos consolidados</h1>${state.procedures.map(procedureWordHtml).join('<div style="page-break-after:always"></div>')}`; }
function producerExcelSheets(producers = state.producers, animals = [], meds = state.meds, vaccines = state.vaccines, supplies = state.supplies, procedures = state.procedures, labs = state.labTests) {
  const animalRows = animals.length ? animals : producers.flatMap((p) => (p.animals || []).map((a) => ({ producer: p.basic.name, ...a })));
  const procedureRows = procedures.flatMap((p) => (p.animals || []).length ? (p.animals || []).map((a) => {
    normalizeEntryMedicationApplied(a);
    const medsText = (a.medicationsApplied || []).map((med) => `${med.medicationName || ""}: ${Number(med.finalAppliedAmount || 0).toFixed(2)} ${med.finalUnit || ""} (${med.route || "Sin vía"})`).join(" | ");
    return [p.date, p.type, p.scope, procedureProducerName(p), a.identification || a.sourceLabel || "", a.species || "", a.weightMethod || "", Number(a.weightRecordedKg || 0).toFixed(2), p.caseClinical?.age || "", Number(a.doseVolumeLiters || 0).toFixed(2), a.chestGirth || "", a.bodyLength || "", medsText, "", "", "", "", "", "", byId(state.vaccines, a.vaccineId)?.brand || "", a.generalState || "", a.examIncluded ? "Sí" : "No", a.exam?.findings || "", "", [a.notes || '', medsText ? `Total medicamentos: ${(a.medicationsApplied || []).length}` : ''].filter(Boolean).join(' · ')];
  }) : [[p.date, p.type, p.scope, procedureProducerName(p), p.identification || "", p.species || "", "", p.weight || "", p.caseClinical?.age || "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]]);
  const medRows = procedures.flatMap((p) => (p.inventory?.meds || []).map((m) => [p.date, p.type, procedureProducerName(p), m.name, m.route || "Sin vía de administración registrada", m.expiry || "Sin fecha de caducidad registrada", doseRuleLabel(m.calculationMode || ""), m.calculationSummary || "", `${Number(m.theoreticalQty || 0).toFixed(2)} ${m.theoreticalUnit || m.unit || ""}`.trim(), `${Number(m.marginQty || 0).toFixed(2)} ${m.unit || ""} (${Number(m.marginPct || 0).toFixed(2)}%)`.trim(), `${Number(m.totalUsedQty || m.chargeableQty || 0).toFixed(2)} ${m.unit || ""}`.trim(), `${Number(m.inventoryDeductionQty || m.qty || 0).toFixed(2)} ${m.inventoryDeductionUnit || m.unit || ""}`.trim(), Number(m.unitCost || 0).toFixed(2), money(Number(m.inventoryDeductionQty || m.totalUsedQty || m.chargeableQty || 0) * Number(m.unitCost || 0)), m.marginRationale || ""]));
  const chargeDetailRows = procedures.flatMap((p) => {
    const blocks = p.charge?.breakdown || {};
    const items = []
      .concat((blocks.medsProcedure || blocks.meds || []).map((item) => ["Medicamento procedimiento", item]))
      .concat((blocks.medsFollowup || []).map((item) => ["Medicamento seguimiento", item]))
      .concat((blocks.vaccines || []).map((item) => ["Vacuna", item]))
      .concat((blocks.supplies || []).map((item) => ["Insumo", item]))
      .concat((blocks.service || []).map((item) => ["Servicio", item]));
    return items.map(([kind, item]) => [p.date, p.type, procedureProducerName(p), kind, item.name || "", item.qtyLabel || "", Number(item.unitCost || 0).toFixed(2), Number(item.subtotal || 0).toFixed(2), item.extraLabel || ""]);
  });
  const labRows = labs.map((lab) => [
    producerName(lab.producerId) || lab.producerName || "",
    (lab.animals || []).map((animal) => animal.label).join(", ") || lab.animal || "",
    lab.type,
    lab.sampleDate || lab.date || "",
    lab.resultDate || "",
    Number(lab.charge?.unitCost || 0).toFixed(2),
    lab.charge?.animalCount || (lab.animalIds || []).length || 0,
    Number(lab.charge?.subtotal || 0).toFixed(2),
    Number(lab.charge?.supplies || 0).toFixed(2),
    Number(lab.charge?.total || 0).toFixed(2),
    (lab.inventory?.supplies || []).map((item) => `${item.name} (${item.qty})`).join(" | "),
    lab.results || lab.result || "",
    lab.interpretation || "",
    (lab.images || (lab.file ? [lab.file] : [])).length ? "Sí" : "No",
    lab.linkedProcedureId || "",
  ]);
  return [
    { name: "Productores", rows: [["Nombre","Celular","Localidad","Municipio","Estado","Clasificación","Razones no trabajar","Nota extra","Maps","Notas"], ...producers.map((p) => [p.basic.name,p.basic.celular,p.basic.localidad,p.basic.municipio,p.basic.estado,p.classification?.value || "",p.classification?.alerta || "",p.classification?.notaExtraPersona || "",p.location?.mapsUrl || "",p.notes || ""])] },
    { name: "Animales", rows: [["Productor(a)","Especie","Raza","Cantidad","¿De quién son?","¿Quién decide si se venden?","¿Quién limpia/alimenta?","Función","Extra"], ...animalRows.map((a) => [a.producer || producerName(state.selectedProducerId), a.species, a.breed, a.quantity, displayAnimalPeople(a.owner || []).join(", "), displayAnimalPeople(a.decideSale || []).join(", "), displayAnimalPeople(a.feedClean || []).join(", "), (a.function || []).join(", "), a.functionOther || ""])] },
    { name: "Medicamentos", rows: [["Nombre","Activo","Propiedad","Tipo inventario","Contenido por presentación","No. presentaciones/envases","Existencia total","Unidad","Concentración/equivalencia","Disponible","Costo por presentación","Costo unitario","Vía administración","Contenido original","Costo original","Cantidad remanente","Dosis por especie"], ...meds.map((m) => [m.brand,m.active,medOwnerLabel(m.owner),m.stockType === "USADO" ? "Usado" : "Nuevo",m.contentPerPresentation || "",m.packageCount || 1,m.totalQty,m.unit,medicationConcentrationSummary(m) || "",medRemaining(m),m.cost,m.unitCost,m.route || "Sin vía de administración registrada",m.stockMeta?.originalQty || "",m.stockMeta?.originalCost || "",m.stockMeta?.remainingQty || "",(m.speciesDoses || []).map(speciesDoseSummary).join(" | ")])] },
    { name: "Vacunas", rows: [["Marca","Propiedad","Caducidad","Cobertura","Disponible","Costo total","Costo unitario","Enfermedades","Notas"], ...vaccines.map((v) => [v.brand,medOwnerLabel(v.owner),v.expiry,v.coverageAnimals,vaccineRemaining(v),v.price,v.unitCost,v.diseases,v.notes || ""])] },
    { name: "Insumos", rows: [["Nombre","Tipo","Pertenece a","Cantidad","Disponible","Costo mostrado","Notas"], ...supplies.map((s) => [s.name,s.type,medOwnerLabel(s.owner || "SERVICIOS"),s.qty,supplyRemaining(s),supplyDisplayCost(s),s.notes || ""])] },
    { name: "Procedimientos", rows: [["Fecha","Tipo","Modalidad","Productor(a)","Identificación animal","Especie","Método peso","Peso utilizable (kg)","Edad caso clínico","Volumen (L)","PT","LC","Medicamento","Dosis base especie","Dosis teórica","Sugerida automática","Cantidad final","Ajuste manual","Descuento inventario","Vacuna","Estado general","Examen físico","Hallazgos","Cálculo explicado","Observaciones"], ...procedureRows] },
    { name: "MedicamentosProc", rows: [["Fecha","Procedimiento","Productor(a)","Medicamento","Base cálculo","Detalle cálculo","Dosis total","Margen operativo","Total usado","Descuento inventario","Costo unitario","Costo calculado","Justificación"], ...medRows] },
    { name: "CobrosProc", rows: [["Fecha","Tipo","Productor(a)","Cobro procedimiento","Costo medicamentos","Cobro vacunas","Cobro insumos","Subtotal","Total","Cobro final","Observaciones"], ...procedures.map((p) => [p.date,p.type,procedureProducerName(p),p.charge?.base,p.charge?.meds,p.charge?.vaccines,p.charge?.supplies,p.charge?.subtotal,p.charge?.total,p.charge?.manual,p.charge?.reason || p.charge?.notes || ""])] },
    { name: "CobroDetalleProc", rows: [["Fecha","Procedimiento","Productor(a)","Categoría","Concepto","Cantidad","Costo unitario","Subtotal","Notas"], ...chargeDetailRows] },
    { name: "PruebasLab", rows: [["Productor(a)","Animales","Tipo","Fecha toma muestra","Fecha resultados","Costo unitario","Núm. animales","Subtotal","Insumos","Total","Detalle insumos","Resultados","Interpretación","Imágenes","Procedimiento"], ...labRows] },
    { name: "CuestionarioAnimales", rows: [["Productor(a)","A6","A7","Tiene aves registradas","Interés en aves (1-4)","Núm. remedios/plantas","Remedios/plantas","Animales donde se usan","Núm. registros roles género","Animales roles género","Quién cuida","¿Por qué?","Temas de interés en pequeños rumiantes"], ...producers.flatMap((prod) => questionnaireExportRows(prod))] },
    { name: "EnfermedadesCuestionario", rows: [["Productor(a)","Fecha","Animal o especie","Enfermedad o problema","Signos clínicos","Tratamiento/acciones"], ...producers.flatMap((prod) => diseaseExportRows(prod))] },
    { name: "ProgramasCuestionario", rows: [["Productor(a)","Programa","¿Recibió folio?","Folio"], ...producers.flatMap((prod) => programsExportRows(prod))] },
    { name: "MedicinaTradicional", rows: [["Productor(a)","Nombre","Tipo","Uso","Parte","Animales donde se usa"], ...producers.flatMap((prod) => getProducerQuestionnaireSkeleton(prod).traditional.map((item) => [prod.basic?.name || "", item.name || "", item.type || "", item.use || "", item.part || "", item.targetAnimals || ""]))] },
    { name: "RolesGeneroAnimales", rows: [["Productor(a)","Animal","Quién lo cuida","¿Por qué?"], ...producers.flatMap((prod) => genderAnimalsExportRows(prod))] },
    { name: "RolesGeneroActividades", rows: [["Productor(a)","Actividad","¿Quién la hace?","¿Por qué lo creen?"], ...producers.flatMap((prod) => genderActivitiesExportRows(prod))] },
  ];
}
function renderLabProducerSelect() {
  const sel = $("#lab_producer");
  if (!sel) return;
  const prev = sel.value || state.selectedProducerId || "";
  sel.innerHTML = '<option value="">— Selecciona productor(a) —</option>' + state.producers.map((p) => `<option value="${p.id}">${esc(p.basic?.name || "Sin nombre")}</option>`).join("");
  sel.value = prev;
  renderLabAnimalChecklist();
}
function renderLabAnimalChecklist() {
  const producerId = $("#lab_producer")?.value || "";
  const prod = byId(state.producers, producerId);
  const box = $("#lab_animalChecklist");
  const hint = $("#lab_animalsHint");
  if (!box || !hint) return;
  const selected = new Set((state.draft.labSelectedAnimalIds || []).map(String));
  const animals = prod?.animals || [];
  hint.textContent = prod ? `Se muestran únicamente animales de ${prod.basic?.name || "este productor(a)"}. Registros disponibles: ${animals.length}.` : "Selecciona primero un productor(a) para cargar únicamente sus animales.";
  if (!prod) {
    box.innerHTML = '<div class="help">Sin productor(a) seleccionado.</div>';
    updateLabTotals();
    return;
  }
  if (!animals.length) {
    box.innerHTML = '<div class="help">Este productor(a) todavía no tiene animales registrados.</div>';
    updateLabTotals();
    return;
  }
  box.innerHTML = animals.map((animal) => `<label class="item" style="display:flex;gap:10px;align-items:flex-start;"><input type="checkbox" data-lab-animal="${animal.id}" ${selected.has(String(animal.id)) ? "checked" : ""} /><span><b>${esc(animalLabel(animal))}</b><br><small>${esc(animal.species || "")}${animal.breed ? ` · ${esc(animal.breed)}` : ""}</small></span></label>`).join("");
  box.querySelectorAll("[data-lab-animal]").forEach((input) => input.addEventListener("change", () => {
    state.draft.labSelectedAnimalIds = Array.from(box.querySelectorAll("[data-lab-animal]:checked")).map((node) => node.getAttribute("data-lab-animal"));
    updateLabTotals();
  }));
  updateLabTotals();
}
function renderLabProcedureSelect() {
  const sel = $("#lab_linkProcedureSelect");
  if (!sel) return;
  const selectedProducerId = $("#lab_producer")?.value || "";
  const procedures = state.procedures.filter((p) => !selectedProducerId || p.producerId === selectedProducerId);
  const prev = sel.value || "";
  sel.innerHTML = '<option value="">— Selecciona procedimiento —</option>' + procedures.map((p) => `<option value="${p.id}">${esc(p.date || "")} · ${esc(p.type || "")} · ${esc(procedureProducerName(p))}</option>`).join("");
  sel.value = prev;
}
function toggleLabProcedureLink() {
  const wrap = $("#lab_linkProcedureWrap");
  const showWrap = $("#lab_linkProcedureDecision")?.value === "SI";
  if (wrap) wrap.style.display = showWrap ? "block" : "none";
  if (!showWrap && $("#lab_linkProcedureSelect")) $("#lab_linkProcedureSelect").value = "";
}
function renderLabSupplyList() {
  const box = $("#lab_supplyUseListStandalone");
  if (!box) return;
  const rows = state.draft.labSupplyUses || [];
  box.innerHTML = rows.length ? rows.map((item) => `<div class="item"><div class="line"><b>${esc(item.name)}</b> · ${Number(item.qty || 0).toFixed(2)} ${esc(item.unit || (item.type === "NON_DISPOSABLE" ? "usos" : "pzas"))} · unitario ${money(item.unitCost || 0)} · sugerido ${money(item.costSuggested ?? Number(item.qty || 0) * Number(item.unitCost || 0))} · cobrado ${money(item.costCharged ?? item.priceCharged ?? item.costSuggested ?? 0)}</div><div class="help">${esc(item.notes || "Sin observaciones")}</div><div class="actions"><button class="btn small" type="button" data-lab-supply-edit="${esc(item.id)}">Editar</button><button class="btn small bad" type="button" data-lab-supply-remove="${esc(item.id)}">Eliminar</button></div></div>`).join("") : '<div class="help">Sin insumos agregados.</div>';
  box.querySelectorAll("[data-lab-supply-remove]").forEach((btn) => btn.addEventListener("click", () => { state.draft.labSupplyUses = (state.draft.labSupplyUses || []).filter((item) => item.id !== btn.dataset.labSupplyRemove); renderLabSupplyList(); updateLabTotals(); }));
  box.querySelectorAll("[data-lab-supply-edit]").forEach((btn) => btn.addEventListener("click", () => {
    const item = (state.draft.labSupplyUses || []).find((row) => row.id === btn.dataset.labSupplyEdit);
    if (!item) return;
    state.draft.labSupplyUseEditId = item.id;
    if ($("#lab_supplySelectStandalone")) $("#lab_supplySelectStandalone").value = item.itemId || "";
    if ($("#lab_supplyQtyStandalone")) $("#lab_supplyQtyStandalone").value = item.qty || "";
    if ($("#lab_supplyUnitStandalone")) $("#lab_supplyUnitStandalone").value = item.unit || "";
    if ($("#lab_supplyUnitCostStandalone")) $("#lab_supplyUnitCostStandalone").value = item.unitCost ?? "";
    if ($("#lab_supplyCostSuggestedStandalone")) $("#lab_supplyCostSuggestedStandalone").value = item.costSuggested ?? "";
    if ($("#lab_supplyCostChargedStandalone")) { $("#lab_supplyCostChargedStandalone").value = item.costCharged ?? item.priceCharged ?? item.costSuggested ?? ""; $("#lab_supplyCostChargedStandalone").dataset.manual = "1"; }
    if ($("#lab_supplyNotesStandalone")) $("#lab_supplyNotesStandalone").value = item.notes || "";
  }));
}
function renderLabImagePreview() {
  const box = $("#lab_imagesPreview");
  const hint = $("#lab_imagesHint");
  if (!box || !hint) return;
  const images = state.draft.labImages || [];
  box.innerHTML = images.length ? images.map((src, index) => `<div class="preview-mini" style="position:relative;"><img src="${src}" alt="laboratorio ${index + 1}"><button class="btn small bad" type="button" data-lab-remove-image="${index}" style="position:absolute;right:4px;bottom:4px;">✕</button></div>`).join("") : '<div class="preview-box"><span>Sin<br/>imágenes</span></div>';
  hint.textContent = images.length ? `${images.length} imagen(es) en borrador.` : "Sin imágenes todavía.";
  box.querySelectorAll("[data-lab-remove-image]").forEach((btn) => btn.addEventListener("click", () => {
    const index = Number(btn.getAttribute("data-lab-remove-image"));
    state.draft.labImages.splice(index, 1);
    renderLabImagePreview();
  }));
}
function calculateLabCharge() {
  const unitCost = Number($("#lab_costPerAnimal")?.value || 0);
  const animalCount = (state.draft.labSelectedAnimalIds || []).length;
  const subtotal = unitCost * animalCount;
  const supplies = (state.draft.labSupplyUses || []).reduce((acc, item) => acc + Number(item.costCharged ?? item.priceCharged ?? item.costSuggested ?? (Number(item.qty || 0) * Number(item.unitCost || 0))), 0);
  return { unitCost, animalCount, subtotal, supplies, total: subtotal + supplies };
}
function updateLabTotals() {
  const breakdown = calculateLabCharge();
  if ($("#lab_animalsCount")) $("#lab_animalsCount").value = String(breakdown.animalCount);
  if ($("#lab_subtotalTests")) $("#lab_subtotalTests").value = money(breakdown.subtotal);
  if ($("#lab_suppliesTotal")) $("#lab_suppliesTotal").value = money(breakdown.supplies);
  if ($("#lab_totalFinal")) $("#lab_totalFinal").value = money(breakdown.total);
}
function syncLabSupplyStandaloneCost({ preserveCharged = false } = {}) {
  const supply = byId(state.supplies, $("#lab_supplySelectStandalone")?.value);
  const qty = Number($("#lab_supplyQtyStandalone")?.value || 0);
  const unitCost = Number(supply ? supplyDisplayCost(supply) : 0);
  const suggested = Number((qty * unitCost).toFixed(2));
  if ($("#lab_supplyUnitStandalone") && !$("#lab_supplyUnitStandalone").value) $("#lab_supplyUnitStandalone").value = supply ? (supply.unit || (supply.type === "NON_DISPOSABLE" ? "uso" : "pieza")) : "";
  if ($("#lab_supplyUnitCostStandalone")) $("#lab_supplyUnitCostStandalone").value = unitCost ? unitCost.toFixed(2) : "";
  if ($("#lab_supplyCostSuggestedStandalone")) $("#lab_supplyCostSuggestedStandalone").value = suggested.toFixed(2);
  const charged = $("#lab_supplyCostChargedStandalone");
  if (charged && (!preserveCharged || !charged.dataset.manual)) charged.value = suggested.toFixed(2);
}
function addLabSupplyUseStandalone() {
  const supply = byId(state.supplies, $("#lab_supplySelectStandalone")?.value);
  const qty = Number($("#lab_supplyQtyStandalone")?.value || 0);
  if (!supply || !qty) return show("lab_msgStandalone", "Selecciona insumo y cantidad.", "warning");
  const previousLab = state.editing.labTestId ? byId(state.labTests, state.editing.labTestId) : null;
  const editingDraftQty = (state.draft.labSupplyUses || []).filter((item) => item.itemId === supply.id && item.id !== state.draft.labSupplyUseEditId).reduce((acc, item) => acc + Number(item.qty || 0), 0);
  const available = Number(supplyRemaining(supply) || 0) + previousInventoryQty(previousLab, "supplies", supply.id) - editingDraftQty;
  if (supply.type === "DISPOSABLE" && qty > available + 0.0001) return show("lab_errStandalone", `No hay disponibilidad suficiente del insumo seleccionado. Disponible: ${available.toFixed(2)}.`, "error");
  state.draft.labSupplyUses = state.draft.labSupplyUses || [];
  const unitCost = Number($("#lab_supplyUnitCostStandalone")?.value || supplyDisplayCost(supply));
  const costSuggested = Number($("#lab_supplyCostSuggestedStandalone")?.value || (qty * unitCost).toFixed(2));
  const costCharged = Number($("#lab_supplyCostChargedStandalone")?.value || costSuggested || 0);
  const row = { id: state.draft.labSupplyUseEditId || uid("lsup"), itemId: supply.id, name: supply.name, qty, unit: $("#lab_supplyUnitStandalone")?.value.trim() || supply.unit || (supply.type === "NON_DISPOSABLE" ? "uso" : "pieza"), notes: $("#lab_supplyNotesStandalone")?.value.trim() || "", type: supply.type, unitCost, costSuggested, costCharged, priceCharged: costCharged };
  const idx = state.draft.labSupplyUses.findIndex((item) => item.id === row.id);
  if (idx >= 0) state.draft.labSupplyUses[idx] = row; else state.draft.labSupplyUses.push(row);
  state.draft.labSupplyUseEditId = null;
  ["lab_supplyQtyStandalone","lab_supplyUnitStandalone","lab_supplyUnitCostStandalone","lab_supplyCostSuggestedStandalone","lab_supplyCostChargedStandalone","lab_supplyNotesStandalone"].forEach((id) => { if ($("#" + id)) { $("#" + id).value = ""; delete $("#" + id).dataset.manual; } });
  if ($("#lab_supplySelectStandalone")) $("#lab_supplySelectStandalone").value = "";
  renderLabSupplyList();
  updateLabTotals();
}
function collectLabTestStandalone() {
  const producerId = $("#lab_producer")?.value || "";
  const producer = byId(state.producers, producerId);
  const animalIds = state.draft.labSelectedAnimalIds || [];
  const selectedAnimals = (producer?.animals || []).filter((animal) => animalIds.includes(animal.id));
  const charge = calculateLabCharge();
  return {
    id: state.editing.labTestId || uid("lab"),
    producerId,
    producerName: producer?.basic?.name || "",
    animalIds: [...animalIds],
    animals: selectedAnimals.map((animal) => ({ id: animal.id, label: animalLabel(animal), species: animal.species || "", breed: animal.breed || "", quantity: animal.quantity || "" })),
    animal: selectedAnimals.map((animal) => animalLabel(animal)).join(", "),
    type: $("#lab_typeSelect")?.value.trim() || "",
    date: $("#lab_sampleDate")?.value || "",
    sampleDate: $("#lab_sampleDate")?.value || "",
    resultDate: $("#lab_resultDate")?.value || "",
    result: $("#lab_resultsText")?.value.trim() || "",
    results: $("#lab_resultsText")?.value.trim() || "",
    interpretation: $("#lab_interpretationStandalone")?.value.trim() || "",
    notes: $("#lab_notesStandalone")?.value.trim() || "",
    status: $("#lab_status")?.value || "PENDIENTE_RESULTADOS",
    chargeStatus: $("#lab_chargeStatusStandalone")?.value || "",
    chargeNotes: $("#lab_chargeNotesStandalone")?.value.trim() || "",
    images: [...(state.draft.labImages || [])],
    file: (state.draft.labImages || [])[0] || null,
    inventory: { supplies: [...(state.draft.labSupplyUses || [])] },
    charge,
    linkedProcedureId: $("#lab_linkProcedureDecision")?.value === "SI" ? $("#lab_linkProcedureSelect")?.value || null : null,
  };
}
function saveLabStandalone() {
  const lab = collectLabTestStandalone();
  if (!lab.producerId || !lab.type || !lab.sampleDate) return show("lab_errStandalone", "Productor(a), tipo de prueba y fecha de toma de muestra son obligatorios.", "error");
  if (!lab.animals.length) return show("lab_errStandalone", "Selecciona al menos un animal del productor(a).", "error");
  const idx = state.labTests.findIndex((item) => item.id === lab.id);
  const previous = idx >= 0 ? state.labTests[idx] : null;
  if (idx >= 0) state.labTests[idx] = lab; else state.labTests.unshift(lab);
  if (previous?.linkedProcedureId && previous.linkedProcedureId !== lab.linkedProcedureId) {
    const oldProcedure = byId(state.procedures, previous.linkedProcedureId);
    if (oldProcedure) oldProcedure.labIds = (oldProcedure.labIds || []).filter((id) => id !== lab.id);
  }
  if (lab.linkedProcedureId) {
    const procedure = byId(state.procedures, lab.linkedProcedureId);
    if (procedure) {
      procedure.labIds = Array.isArray(procedure.labIds) ? procedure.labIds : [];
      if (!procedure.labIds.includes(lab.id)) procedure.labIds.push(lab.id);
    }
  }
  saveState();
  renderAll();
  resetLabStandalone();
  show("lab_okStandalone", "Prueba de laboratorio guardada.", "success");
}
function resetLabStandalone() {
  state.editing.labTestId = null;
  state.draft.labImages = [];
  state.draft.labSupplyUses = [];
  state.draft.labSupplyUseEditId = null;
  state.draft.labSelectedAnimalIds = [];
  $("#labStandaloneForm")?.reset();
  toggleLabProcedureLink();
  renderLabProducerSelect();
  renderLabProcedureSelect();
  renderLabSupplyList();
  renderLabImagePreview();
  updateLabTotals();
}
function fillLabStandalone(lab) {
  resetLabStandalone();
  state.editing.labTestId = lab.id;
  Object.entries({ lab_producer: lab.producerId, lab_sampleDate: lab.sampleDate || lab.date, lab_resultDate: lab.resultDate, lab_costPerAnimal: lab.charge?.unitCost || "", lab_typeSelect: lab.type, lab_status: lab.status || ((lab.results || lab.result) ? "RESULTADOS_CAPTURADOS" : "PENDIENTE_RESULTADOS"), lab_chargeStatusStandalone: lab.chargeStatus || "", lab_chargeNotesStandalone: lab.chargeNotes || "", lab_resultsText: lab.results || lab.result || "", lab_interpretationStandalone: lab.interpretation || "", lab_notesStandalone: lab.notes || "", lab_linkProcedureDecision: lab.linkedProcedureId ? "SI" : "NO" }).forEach(([id, value]) => { if ($("#" + id)) $("#" + id).value = safe(value); });
  state.draft.labSelectedAnimalIds = [...(lab.animalIds || [])];
  state.draft.labImages = [...(lab.images || (lab.file ? [lab.file] : []))];
  state.draft.labSupplyUses = [...(lab.inventory?.supplies || [])];
  renderLabProducerSelect();
  renderLabProcedureSelect();
  toggleLabProcedureLink();
  if ($("#lab_linkProcedureSelect")) $("#lab_linkProcedureSelect").value = lab.linkedProcedureId || "";
  renderLabSupplyList();
  renderLabImagePreview();
  updateLabTotals();
}
function deleteLabStandalone(lab) {
  if (lab.linkedProcedureId) {
    const procedure = byId(state.procedures, lab.linkedProcedureId);
    if (procedure) procedure.labIds = (procedure.labIds || []).filter((id) => id !== lab.id);
  }
  queueDeletedRecord("labTests", lab);
  state.labTests = state.labTests.filter((item) => item.id !== lab.id);
  saveState();
  renderAll();
}
function labWordHtml(lab) {
  return `<section><h1>Prueba de laboratorio: ${esc(lab.type)}</h1><p><b>Productor(a):</b> ${esc(producerName(lab.producerId) || lab.producerName || "")}</p><p><b>Animales:</b> ${esc((lab.animals || []).map((animal) => animal.label).join(", ") || lab.animal || "")}</p><p><b>Fecha toma de muestra:</b> ${esc(lab.sampleDate || lab.date || "")}</p><p><b>Fecha de resultados:</b> ${esc(lab.resultDate || "")}</p><p><b>Procedimiento vinculado:</b> ${esc(lab.linkedProcedureId || "Sin vínculo")}</p><h2>Resumen</h2>${objectEntriesTable({ tipo_prueba: lab.type, productor: producerName(lab.producerId) || lab.producerName || "", animales: (lab.animals || []).map((animal) => animal.label).join(", "), fecha_toma_muestra: lab.sampleDate || lab.date || "", fecha_resultados: lab.resultDate || "", costo_unitario: money(lab.charge?.unitCost), numero_animales: lab.charge?.animalCount, subtotal_pruebas: money(lab.charge?.subtotal), total_insumos: money(lab.charge?.supplies), total_final: money(lab.charge?.total), estado_registro: lab.status || "", estado_cobro: lab.chargeStatus || "", notas_cobro: lab.chargeNotes || "", resultado: lab.results || lab.result || "", interpretacion: lab.interpretation || "", observaciones: lab.notes || "", procedimiento_vinculado: lab.linkedProcedureId || "" })}<h2>Insumos</h2><table><tr><th>Nombre</th><th>Cantidad</th><th>Costo</th><th>Notas</th></tr>${(lab.inventory?.supplies || []).map((item) => `<tr><td>${esc(item.name)}</td><td>${esc(item.qty)}</td><td>${money(item.costCharged ?? item.priceCharged ?? item.costSuggested ?? (Number(item.qty || 0) * Number(item.unitCost || 0)))}</td><td>${esc(item.notes || "")}</td></tr>`).join("")}</table>${(lab.images || (lab.file ? [lab.file] : [])).map((src, index) => imageHtml(src, `Imagen laboratorio ${index + 1}`)).join("")}</section>`;
}
function labSummaryHtml() {
  return `<h1>Pruebas de laboratorio</h1>${state.labTests.map(labWordHtml).join('<div style="page-break-after:always"></div>')}`;
}
function renderLabListStandalone() {
  const list = $("#lab_listStandalone");
  if (!list) return;
  list.innerHTML = "";
  if ($("#lab_countStandalone")) $("#lab_countStandalone").textContent = state.labTests.length;
  state.labTests.forEach((lab) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<h4>${esc(lab.type)} · ${esc(producerName(lab.producerId) || lab.producerName || "")}</h4><div class="line"><b>Toma de muestra:</b> ${esc(lab.sampleDate || lab.date || "")}</div><div class="line"><b>Fecha de resultados:</b> ${esc(lab.resultDate || "Pendiente")}</div><div class="line"><b>Animales:</b> ${esc((lab.animals || []).map((animal) => animal.label).join(", ") || lab.animal || "")}</div><div class="line"><b>Total final:</b> ${money(lab.charge?.total)}</div><div class="line"><b>Procedimiento vinculado:</b> ${esc(lab.linkedProcedureId || "Sin vínculo")}</div><div class="actions"><button class="btn small">Editar</button><button class="btn small ghost">Word</button><button class="btn small ghost">Excel</button><button class="btn small bad">Eliminar</button></div>`;
    const [edit, word, excel, del] = item.querySelectorAll("button");
    edit.onclick = () => fillLabStandalone(lab);
    word.onclick = () => exportWord(`laboratorio_${slug(lab.id)}.doc`, labWordHtml(lab));
    excel.onclick = () => exportExcel(`laboratorio_${slug(lab.id)}.xls`, producerExcelSheets([], [], [], [], [], [], [lab]));
    del.onclick = () => deleteLabStandalone(lab);
    list.appendChild(item);
  });
}
function bindLabStandalone() {
  $("#lab_producer")?.addEventListener("change", () => {
    const nextProducerId = $("#lab_producer").value || null;
    if (state.selectedProducerId !== nextProducerId) clearProducerScopedDraftState();
    state.selectedProducerId = nextProducerId;
    state.draft.labSelectedAnimalIds = [];
    renderLabAnimalChecklist();
    renderLabProcedureSelect();
  });
  $("#lab_costPerAnimal")?.addEventListener("input", updateLabTotals);
  $("#lab_linkProcedureDecision")?.addEventListener("change", toggleLabProcedureLink);
  $("#lab_addSupplyStandalone")?.addEventListener("click", addLabSupplyUseStandalone);
  ["lab_images_take", "lab_images_pick"].forEach((id) => $("#" + id)?.addEventListener("change", async (e) => {
    state.draft.labImages = state.draft.labImages || [];
    for (const file of Array.from(e.target.files || [])) state.draft.labImages.push(await fileToBase64(file));
    renderLabImagePreview();
    e.target.value = "";
  }));
  $("#lab_btnTakeImage")?.addEventListener("click", () => requestPhotoInput("#lab_images_take", "camera"));
  $("#lab_btnPickImage")?.addEventListener("click", () => requestPhotoInput("#lab_images_pick", "gallery"));
  $("#lab_btnClearImages")?.addEventListener("click", () => { state.draft.labImages = []; renderLabImagePreview(); });
  $("#labStandaloneForm")?.addEventListener("submit", (e) => { e.preventDefault(); saveLabStandalone(); });
  $("#lab_clearStandalone")?.addEventListener("click", resetLabStandalone);
  $("#btnLabWord")?.addEventListener("click", () => exportWord("laboratorio.doc", labSummaryHtml()));
  $("#btnLabExcel")?.addEventListener("click", () => exportExcel("laboratorio.xls", producerExcelSheets([], [], [], [], [], [], state.labTests)));
}

const JSON_SECTION_TYPES = {
  clinical: "caso_clinico_individual",
  necropsy: "necropsia",
  advice: "asesoria",
  lab: "estudios_laboratorio",
};
const BASE_PROCEDURE_KEYS = ["productor", "productora", "producer", "producerId", "fecha", "date", "tipo_procedimiento", "type", "lugar", "place", "comunidad", "modo", "scope", "estado_cobro", "chargeStatus", "notas_generales", "notes", "costo_total", "cobro"];
state.draft.lastSectionJsonUndo = state.draft.lastSectionJsonUndo || null;
state.draft.sectionJson = state.draft.sectionJson || { section: null, parsed: null, previewed: false };

function sectionJsonPrompt(section, source = "") {
  const sourceText = source || (section === "necropsy" ? "[Pegar aquí el texto de necropsia]" : section === "clinical" ? "[Pegar aquí el texto clínico]" : "[Pegar aquí el texto]");
  const prompts = {
    clinical: `Analiza el siguiente texto clínico veterinario y conviértelo en JSON válido para llenar únicamente la sección de caso clínico individual de la app.

No incluyas datos base del procedimiento como productor, fecha base del procedimiento, tipo de procedimiento, lugar, modo, estado de cobro ni notas generales.

Devuelve exclusivamente JSON válido, sin explicación, sin markdown y sin texto adicional.

No inventes datos.
Si un dato no aparece, usa null o string vacío.
Si hay medicamentos o insumos, colócalos obligatoriamente dentro de medicacion_insumos_por_dia.
Si no se menciona fecha de medicación, usa fecha vacía.
Si no se menciona hora, usa hora vacía.
Si no se menciona costo, usa null.
No conviertas medicamentos a texto libre: cada medicamento debe ser un objeto dentro de medicamentos.
No conviertas insumos a texto libre: cada insumo debe ser un objeto dentro de insumos.

Usa exactamente esta estructura:

{
"tipo_carga": "caso_clinico_individual",
"caso_clinico": {
"animal_atendido": {
"animal_registrado": "",
"nombre_identificacion": "",
"especie": "",
"raza_linea_tipo_cruza": "",
"sexo": "",
"edad": "",
"peso": "",
"condicion_corporal": "",
"estado_reproductivo": "",
"observaciones_generales": ""
},
"evaluacion_clinica": {
"motivo_consulta": "",
"anamnesis": "",
"constantes_fisiologicas": {
"fc": "",
"fr": "",
"temperatura": "",
"mucosas": "",
"tllc": "",
"hidratacion_deshidratacion": "",
"otros_signos_relevantes": ""
},
"examen_fisico_hallazgos": "",
"diagnostico_presuntivo": "",
"diagnosticos_diferenciales": "",
"pruebas_realizadas": ""
},
"medicacion_insumos_por_dia": [
{
"fecha": "",
"hora": "",
"observaciones_dia": "",
"medicamentos": [
{
"medicamento_nombre": "",
"uso_externo": false,
"via_administracion": "",
"indicacion": "",
"dosis_texto": "",
"dosis_estructurada": {
"cantidad": null,
"unidad": "",
"por_cada": null,
"unidad_base": "",
"regla_compatible": ""
},
"dosis_total_teorica": {
"cantidad": null,
"unidad": ""
},
"cantidad_administrable": {
"cantidad": null,
"unidad": ""
},
"frecuencia": "",
"duracion": "",
"observaciones": "",
"costo_sugerido": null,
"costo_final_cobrado": null,
"nota_calculo": ""
}
],
"insumos": [
{
"insumo_nombre": "",
"uso_externo": false,
"cantidad_usada": null,
"unidad_usada": "",
"costo_unitario": null,
"costo_sugerido": null,
"costo_final_cobrado": null,
"observaciones": ""
}
]
}
]
}
}

Texto fuente:
${sourceText}`,
    necropsy: `Analiza el siguiente texto de necropsia veterinaria y conviértelo en JSON válido para llenar únicamente el reporte sistemático de necropsia de la app.\n\nNo incluyas datos base del procedimiento.\nNo inventes datos.\nSi un órgano no se menciona, déjalo vacío o como no revisado.\nDevuelve exclusivamente JSON válido, sin explicación, sin markdown y sin texto adicional.\n\nUsa la estructura:\n{\n"tipo_carga": "necropsia",\n"necropsia": {\n"datos_generales": {},\n"reporte_sistematico": [{ "sistema": "", "organo": "", "estado": "no revisado", "descripcion_macroscopica": "", "lesiones_encontradas": "", "distribucion": "", "severidad": "", "color": "", "tamano": "", "consistencia": "", "contenido": "", "olor": "", "parasitos": "", "muestras_tomadas": [], "fotos_referencias": [], "observaciones": "" }],\n"muestras": [],\n"diagnosticos_macroscopicos": [],\n"diagnostico_presuntivo": "",\n"causa_probable_muerte": "",\n"recomendaciones": "",\n"observaciones_finales": ""\n}\n}\n\nTexto fuente:\n${sourceText}`,
    advice: `Analiza el siguiente texto de asesoría veterinaria y conviértelo en JSON válido para llenar únicamente la sección interna de asesoría clínica o técnica.\n\nNo incluyas datos base del procedimiento.\nDevuelve exclusivamente JSON válido, sin explicación, sin markdown y sin texto adicional.\nNo inventes datos. Si falta información, usa null o string vacío.\n\nUsa la estructura:\n{\n"tipo_carga": "asesoria",\n"asesoria": {\n"tipo_asesoria": "",\n"descripcion": "",\n"problemas_detectados": [],\n"recomendaciones": [],\n"plan_accion": "",\n"medicamentos_usados": [],\n"vacunas_usadas": [],\n"insumos_usados": [],\n"costo_sugerido": null,\n"costo_final_cobrado": null,\n"observaciones": ""\n}\n}\n\nTexto fuente:\n${sourceText}`,
    lab: `Analiza el siguiente texto de estudios de laboratorio veterinarios y conviértelo en JSON válido para llenar únicamente estudios de laboratorio vinculados al caso clínico. No incluyas datos base del procedimiento. Devuelve exclusivamente JSON válido.\n{ "tipo_carga": "estudios_laboratorio", "estudios_laboratorio": [{ "nombre_estudio": "", "tipo_muestra": "", "fecha_toma": "", "fecha_resultado": "", "resultado": "", "interpretacion": "", "diagnostico_relacionado": "", "costo_sugerido": null, "costo_final_cobrado": null, "observaciones": "" }] }\n\nTexto fuente:\n${sourceText}`,
  };
  return prompts[section] || prompts.clinical;
}

function installSectionJsonImportUi() {
  const targets = [
    ["clinical", document.querySelector('[data-procedure-block="clinical"] .inner')],
    ["necropsy", document.querySelector('[data-procedure-block="necropsy"] .inner')],
    ["advice", document.querySelector('[data-procedure-block="zootecnia"] .inner') || document.querySelector('[data-procedure-block="zoo"] .inner')],
    ["lab", document.querySelector('[data-procedure-block="lab"] .inner') || $("#lab_list")?.parentElement],
  ];
  targets.forEach(([section, container]) => {
    if (!container || container.querySelector(`[data-json-panel="${section}"]`)) return;
    container.insertAdjacentHTML("afterbegin", `<section class="card section-json-import" data-json-panel="${section}"><h3>Carga rápida por JSON</h3><div class="help">Llenar esta sección desde JSON es opcional, parcial y no modifica Datos base del procedimiento.</div><div class="row"><button class="btn small" type="button" data-json-open="${section}">Llenar esta sección desde JSON</button><button class="btn small ghost" type="button" data-json-undo="${section}">Deshacer última carga JSON</button></div><div class="section-json-body" data-json-body="${section}" hidden><label>Texto fuente opcional</label><textarea data-json-source="${section}"></textarea><div class="row"><button class="btn small" type="button" data-json-prompt="${section}">Generar prompt</button><button class="btn small ghost" type="button" data-json-copy="${section}">Copiar prompt</button></div><textarea data-json-generated="${section}" readonly placeholder="Prompt generado"></textarea><label>Pegar respuesta JSON</label><textarea data-json-input="${section}" placeholder="Pega aquí JSON válido"></textarea><div class="row"><button class="btn small primary" type="button" data-json-apply="${section}">Aplicar JSON</button><button class="btn small bad" type="button" data-json-clear="${section}">Limpiar</button></div><div class="help" data-json-msg="${section}"></div><div class="item" data-json-preview-box="${section}"></div></div></section>`);
  });

  consolidateNecropsySystematicUi();
  document.querySelectorAll("[data-json-open]").forEach((b) => b.onclick = () => { const body = document.querySelector(`[data-json-body="${b.dataset.jsonOpen}"]`); if (body) body.hidden = !body.hidden; });
  document.querySelectorAll("[data-json-cancel]").forEach((b) => b.onclick = () => { const body = document.querySelector(`[data-json-body="${b.dataset.jsonCancel}"]`); if (body) body.hidden = true; });
  document.querySelectorAll("[data-json-prompt]").forEach((b) => b.onclick = () => { const sec = b.dataset.jsonPrompt; const out = document.querySelector(`[data-json-generated="${sec}"]`); if (out) out.value = sectionJsonPrompt(sec, document.querySelector(`[data-json-source="${sec}"]`)?.value); });
  document.querySelectorAll("[data-json-copy]").forEach((b) => b.onclick = async () => { const sec = b.dataset.jsonCopy; const text = document.querySelector(`[data-json-generated="${sec}"]`)?.value || sectionJsonPrompt(sec); await navigator.clipboard?.writeText?.(text); sectionJsonMessage(sec, "Prompt copiado.", false); });
  document.querySelectorAll("[data-json-clear]").forEach((b) => b.onclick = () => { const sec = b.dataset.jsonClear; const input = document.querySelector(`[data-json-input="${sec}"]`); const msg = document.querySelector(`[data-json-msg="${sec}"]`); const box = document.querySelector(`[data-json-preview-box="${sec}"]`); if (input) input.value = ""; if (msg) msg.textContent = ""; if (box) box.innerHTML = ""; });
  document.querySelectorAll("[data-json-apply]").forEach((b) => b.onclick = () => applySectionJsonDirect(b.dataset.jsonApply));
  document.querySelectorAll("[data-json-undo]").forEach((b) => b.onclick = undoLastSectionJsonImport);
}
function consolidateNecropsySystematicUi() {
  const nec = document.querySelector('[data-procedure-block="necropsy"] .inner');
  if (!nec || nec.querySelector('[data-necropsy-consolidated-note]')) return;
  const firstGrid = nec.querySelector('.grid.cols-4');
  firstGrid?.insertAdjacentHTML('beforebegin', '<div class="help" data-necropsy-consolidated-note>Necropsia organizada como Datos generales · 16 campos/órganos + Reporte sistemático por aparatos, sistemas y órganos. Los campos repetitivos de órganos se integran en el reporte sistemático para evitar duplicados.</div>');
  ["p_nec_externalInspection", "p_nec_primaryIncision", "p_nec_secondaryIncision", "p_nec_organExtraction", "p_nec_respiratory", "p_nec_heart", "p_nec_spleen", "p_nec_kidneys", "p_nec_stomach"].forEach((id) => {
    const field = $("#" + id);
    const wrapper = field?.closest('.grid') || field?.parentElement;
    if (wrapper) wrapper.hidden = true;
  });
}

function sectionJsonMessage(section, msg, error = false) { const el = document.querySelector(`[data-json-msg="${section}"]`); if (el) { el.textContent = msg; el.className = `help ${error ? "error" : "success"}`; } }
function parseSectionJsonInput(section) { return JSON.parse(document.querySelector(`[data-json-input="${section}"]`)?.value || "{}"); }
function hasBaseProcedureData(obj) { const text = JSON.stringify(obj || {}).toLowerCase(); return BASE_PROCEDURE_KEYS.some((k) => text.includes(`"${String(k).toLowerCase()}"`)); }
function jsonValue(obj, keys = []) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== undefined && obj[key] !== "") return obj[key];
  }
  return undefined;
}
function normalizeJsonName(value = "") {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
function findMedicationFromJson(item = {}) {
  const id = jsonValue(item, ["medicamento_id", "medication_id", "id_medicamento", "id"]);
  const name = jsonValue(item, ["medicamento_nombre", "medicamento", "nombre_medicamento", "producto", "farmaco", "fármaco", "medicamento_administrado", "medicationName", "medication_name", "nombre", "name"]);
  if (id) {
    const byExactId = byId(state.meds, String(id));
    if (byExactId) return byExactId;
  }
  if (name) {
    const exact = state.meds.find((m) => String(m.brand || "") === String(name));
    if (exact) return exact;
    const normalized = normalizeJsonName(name);
    return state.meds.find((m) => normalizeJsonName(m.brand) === normalized) || null;
  }
  return null;
}
function findSupplyFromJson(item = {}) {
  const id = jsonValue(item, ["insumo_id", "supply_id", "id_insumo", "id"]);
  const name = jsonValue(item, ["insumo_nombre", "insumo", "nombre_insumo", "material", "material_usado", "supplyName", "supply_name", "nombre", "name"]);
  if (id) {
    const byExactId = byId(state.supplies, String(id));
    if (byExactId) return byExactId;
  }
  if (name) {
    const exact = state.supplies.find((s) => String(s.name || "") === String(name));
    if (exact) return exact;
    const normalized = normalizeJsonName(name);
    return state.supplies.find((s) => normalizeJsonName(s.name) === normalized) || null;
  }
  return null;
}
function asJsonArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
function extractClinicalJsonPayload(parsed = {}) {
  const c = parsed.caso_clinico || parsed.clinical_case || parsed.caseClinical || parsed;
  return c && typeof c === "object" ? c : {};
}
function clinicalJsonMedicationItems(day = {}) {
  return asJsonArray(jsonValue(day, ["medicamentos", "medicamentos_usados", "medicamentos_del_dia", "medicacion", "tratamiento_medicamentoso", "medications", "medications_used", "daily_medications"]));
}
function clinicalJsonSupplyItems(day = {}) {
  return asJsonArray(jsonValue(day, ["insumos", "insumos_usados", "insumos_del_dia", "materiales", "material_usado", "supplies", "supplies_used", "daily_supplies"]));
}
function normalizeClinicalJsonDays(source = {}) {
  const c = extractClinicalJsonPayload(source);
  const dayKeys = ["medicacion_insumos_por_dia", "medicacion_por_dia", "medicamentos_insumos_por_dia", "seguimientos", "tratamientos_por_dia", "medication_supplies_by_day", "medications_by_day", "treatments_by_day", "followups"];
  const directDays = jsonValue(c, dayKeys) ?? jsonValue(source, dayKeys);
  if (directDays) return asJsonArray(directDays);
  const medKeys = ["medicamentos", "medicamentos_usados", "medicamentos_del_dia", "medicacion", "tratamiento_medicamentoso", "medications", "medications_used"];
  const supplyKeys = ["insumos", "insumos_usados", "insumos_del_dia", "materiales", "material_usado", "supplies", "supplies_used"];
  const meds = jsonValue(c, medKeys) ?? jsonValue(source, medKeys);
  const supplies = jsonValue(c, supplyKeys) ?? jsonValue(source, supplyKeys);
  if (meds || supplies) return [{ medicamentos: asJsonArray(meds), insumos: asJsonArray(supplies) }];
  return [];
}
function clinicalJsonDayCounts(source = {}) {
  const days = normalizeClinicalJsonDays(source);
  return {
    days: days.length,
    meds: days.reduce((acc, d) => acc + clinicalJsonMedicationItems(d).length, 0),
    supplies: days.reduce((acc, d) => acc + clinicalJsonSupplyItems(d).length, 0),
  };
}
function validateSectionJson(section, announce = false) {
  try {
    const parsed = parseSectionJsonInput(section);
    const expected = JSON_SECTION_TYPES[section];
    if (!parsed || (parsed.tipo_carga && parsed.tipo_carga !== expected)) throw new Error("No se encontró ninguna sección compatible.");
    if (section === "clinical" && !parsed.caso_clinico && !normalizeClinicalJsonDays(parsed).length) throw new Error("No se encontró ninguna sección compatible.");
    if (section === "necropsy" && !parsed.necropsia) throw new Error("No se encontró ninguna sección compatible.");
    if (section === "advice" && !parsed.asesoria) throw new Error("No se encontró ninguna sección compatible.");
    if (section === "lab" && !Array.isArray(parsed.estudios_laboratorio)) throw new Error("Los estudios_laboratorio deben ser un arreglo.");
    state.draft.sectionJson = { section, parsed, previewed: false, hasBase: hasBaseProcedureData(parsed) };
    if (announce) sectionJsonMessage(section, hasBaseProcedureData(parsed) ? "Este JSON contiene datos base del procedimiento. No se aplicarán automáticamente." : "JSON válido. Genera la vista previa antes de aplicar.");
    return parsed;
  } catch (e) { sectionJsonMessage(section, e instanceof SyntaxError ? "El JSON no es válido." : e.message, true); return null; }
}
function previewSectionJson(section) {
  const parsed = validateSectionJson(section);
  if (!parsed) return;
  const items = [];
  let clinicalExtra = "";
  if (section === "clinical") {
    const c = extractClinicalJsonPayload(parsed);
    const counts = clinicalJsonDayCounts(parsed);
    const days = normalizeClinicalJsonDays(parsed);
    const missing = new Set();
    const warnings = [];
    if (c.animal_atendido) items.push("Animal atendido");
    if (c.evaluacion_clinica) items.push("Evaluación clínica");
    if (counts.days) items.push(`${counts.days} día(s) de medicación / seguimiento`);
    if (counts.meds) items.push(`${counts.meds} medicamento(s)`);
    if (counts.supplies) items.push(`${counts.supplies} insumo(s)`);
    if (!counts.meds && !counts.supplies) items.push("El JSON es válido, pero no contiene medicamentos o insumos para esta sección.");
    days.forEach((day) => {
      clinicalJsonMedicationItems(day).forEach((med) => {
        if (!jsonValue(med, ["frecuencia", "frequency"])) missing.add("Frecuencia");
        if (!jsonValue(med, ["duracion", "duración", "duration"])) missing.add("Duración");
        if (!jsonValue(med, ["observaciones", "observations", "notes"])) missing.add("Observaciones del medicamento");
        if (!findMedicationFromJson(med) && jsonValue(med, ["medicamento_nombre", "nombre_medicamento", "medicationName", "medication_name", "nombre", "name", "medicamento"])) warnings.push("Este medicamento no existe en inventario.");
        const structured = med.dosis_estructurada || med.structured_dose || {};
        const theoretical = med.dosis_total_teorica || med.theoretical_total_dose || {};
        const admin = med.cantidad_administrable || med.dosis_administrable || med.administered_amount || {};
        if (!jsonValue(med, ["medicamento_nombre", "nombre_medicamento", "medicationName", "medication_name", "nombre", "name", "medicamento"]) && (structured.cantidad || theoretical.cantidad || admin.cantidad)) warnings.push("Hay una dosis sin medicamento asociado. Revisa o completa manualmente.");
      });
      clinicalJsonSupplyItems(day).forEach((sup) => {
        if (!jsonValue(sup, ["observaciones", "observations", "notes"])) missing.add("Observaciones del insumo");
      });
    });
    clinicalExtra = `${missing.size ? `<b>Campos sin información:</b><ul>${Array.from(missing).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${warnings.length ? `<b>Advertencias:</b><ul>${[...new Set(warnings)].map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`;
  }
  if (section === "necropsy") { const n = normalizeNecropsySectionPayload(parsed.necropsia || {}); const counts = {}; (n.reporte_sistematico || []).forEach((row) => { counts[row.sistema || "Personalizado"] = (counts[row.sistema || "Personalizado"] || 0) + 1; }); items.push("Necropsia sistemática"); ["Datos generales", "Sistema respiratorio", "Sistema cardiovascular", "Sistema digestivo completo", "Sistema urinario"].forEach((name) => items.push(`${name}: ${counts[name] || 0} campos/órganos`)); items.push(`Muestras: ${Array.isArray(n.muestras) ? n.muestras.length : 0}`); items.push(`Diagnósticos: ${Array.isArray(n.diagnosticos_macroscopicos) ? n.diagnosticos_macroscopicos.length : 0}`); }
  if (section === "advice") items.push("Asesoría clínica/técnica");
  if (section === "lab") items.push(`${parsed.estudios_laboratorio.length} estudio(s) de laboratorio vinculados`);
  const baseWarning = hasBaseProcedureData(parsed) ? `<p><b>Referencia:</b> El JSON contiene datos base del procedimiento. Esta sección se llena manualmente y no será modificada automáticamente.</p>` : "";
  const box = document.querySelector(`[data-json-preview-box="${section}"]`);
  if (box) {
    let detailHtml = "";
    if (section === "clinical") {
      const days = normalizeClinicalJsonDays(parsed);
      detailHtml = `<p><b>Se cargará en “Medicación e insumos por día”:</b></p>${days.map((day) => {
        const meds = clinicalJsonMedicationItems(day);
        const supplies = clinicalJsonSupplyItems(day);
        return `<div class="item"><b>${esc(jsonValue(day, ["fecha", "date"]) || "Día sin fecha")}</b><div>Medicamentos: ${meds.length}</div><ul>${meds.map((m) => `<li>${esc(jsonValue(m, ["medicamento_nombre", "nombre_medicamento", "medicationName", "medication_name", "nombre", "name", "medicamento"]) || "Medicamento sin nombre")}</li>`).join("")}</ul><div>Insumos: ${supplies.length}</div><ul>${supplies.map((i) => `<li>${esc(jsonValue(i, ["insumo_nombre", "nombre_insumo", "supplyName", "supply_name", "nombre", "name", "insumo"]) || "Insumo sin nombre")}</li>`).join("")}</ul></div>`;
      }).join("")}`;
    }
    box.innerHTML = `${baseWarning}<b>Se llenará:</b><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${detailHtml}${clinicalExtra}<b>No se modificará:</b><ul><li>Productor(a)</li><li>Fecha base del procedimiento</li><li>Tipo de procedimiento</li><li>Lugar / comunidad</li><li>Modo del procedimiento</li><li>Estado de cobro</li><li>Notas generales</li></ul>`;
  }
  state.draft.sectionJson = { section, parsed, previewed: true, hasBase: hasBaseProcedureData(parsed) };
  sectionJsonMessage(section, "Vista previa generada. Ahora puedes aplicar con confirmación.");
}
function snapshotSectionJsonUndo() { state.draft.lastSectionJsonUndo = { fields: {}, clinicalDays: stableClone(state.draft.procedureClinicalDays || []), necropsyFindings: stableClone(state.draft.procedureNecropsyFindings || []), labIds: [...(state.draft.procedureLabIds || [])], labTests: stableClone(state.labTests || []) }; document.querySelectorAll("#procedureForm input, #procedureForm textarea, #procedureForm select").forEach((el) => { if (el.id) state.draft.lastSectionJsonUndo.fields[el.id] = el.value; }); }
function undoLastSectionJsonImport() { const u = state.draft.lastSectionJsonUndo; if (!u) return show("p_msg", "No hay carga JSON para deshacer.", "warning"); Object.entries(u.fields || {}).forEach(([id, value]) => { if ($("#" + id)) $("#" + id).value = value; }); state.draft.procedureClinicalDays = stableClone(u.clinicalDays || []); state.draft.procedureNecropsyFindings = stableClone(u.necropsyFindings || []); state.draft.procedureLabIds = [...(u.labIds || [])]; state.labTests = stableClone(u.labTests || []); state.draft.lastSectionJsonUndo = null; renderNecropsySystematicList?.(); renderProcedureDraftLists(); show("p_msg", "Se deshizo la última carga JSON parcial.", "success"); }
function setIfAllowed(id, value, mode) { const el = $("#" + id); if (!el || value == null) return; if (mode === "merge" && String(el.value || "").trim()) return; el.value = value; }
function showSectionJsonModeChooser(section) {
  if (!state.draft.sectionJson?.previewed || state.draft.sectionJson.section !== section) return sectionJsonMessage(section, "Primero valida y genera la vista previa.", true);
  const box = document.querySelector(`[data-json-preview-box="${section}"]`);
  if (!box) return applySectionJsonWithMode(section, "merge");
  const existing = box.querySelector("[data-json-mode-panel]");
  if (existing) existing.remove();
  const replaceLabel = section === "necropsy" ? "Reemplaza únicamente Necropsia sistemática; no toca datos base ni cobros." : "Reemplaza únicamente “Medicación e insumos por día”, no todo el procedimiento.";
  box.insertAdjacentHTML("beforeend", `<div class="card" data-json-mode-panel><h3>¿Cómo quieres aplicar este JSON?</h3><div class="help"><b>Agregar como nuevo:</b> Crea nuevos registros sistemáticos sin tocar los existentes.</div><div class="help"><b>Fusionar con campos vacíos:</b> Llena campos vacíos sin borrar información capturada.</div><div class="help"><b>Reemplazar solo esta sección:</b> ${esc(replaceLabel)}</div><div class="help"><b>Cancelar:</b> No aplica nada.</div><div class="row"><button class="btn small" type="button" data-json-mode="add">Agregar como nuevo</button><button class="btn small primary" type="button" data-json-mode="merge">Fusionar con campos vacíos</button><button class="btn small bad" type="button" data-json-mode="replace">Reemplazar solo sección de necropsia</button><button class="btn small ghost" type="button" data-json-mode="cancel">Cancelar</button></div></div>`);
  box.querySelectorAll("[data-json-mode]").forEach((button) => {
    button.onclick = () => {
      const mode = button.dataset.jsonMode;
      if (mode === "cancel") return sectionJsonMessage(section, "Aplicación cancelada.");
      applySectionJsonWithMode(section, mode);
    };
  });
}
function applySectionJsonDirect(section) {
  const parsed = validateSectionJson(section);
  if (!parsed) return;
  state.draft.sectionJson = { section, parsed, previewed: true, hasBase: hasBaseProcedureData(parsed) };
  snapshotSectionJsonUndo();
  if (section === "clinical") {
    const stats = applyClinicalSectionJson(parsed, "merge");
    if (!stats.loaded && !stats.daysAdded && !stats.medsAdded && !stats.suppliesAdded) {
      sectionJsonMessage(section, "El JSON es válido, pero no contiene datos compatibles para medicación e insumos por día.", true);
      return;
    }
    renderProcedureDraftLists();
    sectionJsonMessage(section, `JSON aplicado correctamente. Se fusionó: ${stats.daysAdded} día(s) de medicación, ${stats.medsAdded} medicamento(s), ${stats.suppliesAdded} insumo(s).`);
    return;
  }
  applySectionJsonWithMode(section, "merge");
}
function applySectionJsonWithMode(section, mode = "merge") {
  if (!state.draft.sectionJson?.previewed || state.draft.sectionJson.section !== section) return sectionJsonMessage(section, "Primero valida y genera la vista previa.", true);
  snapshotSectionJsonUndo();
  const parsed = state.draft.sectionJson.parsed;
  if (section === "clinical") {
    const stats = applyClinicalSectionJson(parsed, mode);
    if (!stats.loaded) {
      sectionJsonMessage(section, "El JSON es válido, pero no contiene medicamentos o insumos compatibles para esta sección.", true);
      return;
    }
  }
  if (section === "necropsy") {
    const stats = applyNecropsySectionJson(parsed.necropsia || {}, mode);
    if (!stats.loaded) {
      sectionJsonMessage(section, "El JSON es válido, pero no contiene datos compatibles para Necropsia sistemática.", true);
      return;
    }
  }
  if (section === "advice") applyAdviceSectionJson(parsed.asesoria || {}, mode);
  if (section === "lab") applyLabSectionJson(parsed.estudios_laboratorio || [], mode);
  renderProcedureDraftLists();
  sectionJsonMessage(section, "JSON aplicado solo en esta sección. Datos base del procedimiento no fueron modificados.");
}
function applyClinicalSectionJson(c, mode) {
  const payload = extractClinicalJsonPayload(c);
  const a = payload.animal_atendido || {}, e = payload.evaluacion_clinica || {}, cf = e.constantes_fisiologicas || {};
  let fieldCount = 0;
  Object.entries({ p_cc_registeredAnimal:a.animal_registrado, p_cc_animalName:a.nombre_identificacion, p_cc_species:a.especie, p_cc_breed:a.raza_linea_tipo_cruza, p_cc_sex:a.sexo, p_cc_age:a.edad, p_cc_weight:a.peso, p_cc_bodyCondition:a.condicion_corporal, p_cc_reproductiveStatus:a.estado_reproductivo, p_cc_animalObservations:a.observaciones_generales, p_cc_reason:e.motivo_consulta, p_cc_anamnesis:e.anamnesis, p_cc_fc:cf.fc, p_cc_fr:cf.fr, p_cc_temp:cf.temperatura, p_cc_mucosa:cf.mucosas, p_cc_tllc:cf.tllc, p_cc_hydration:cf.hidratacion_deshidratacion, p_cc_otherSigns:cf.otros_signos_relevantes, p_cc_exam:e.examen_fisico_hallazgos, p_cc_presumptiveDx:e.diagnostico_presuntivo, p_cc_differentialDx:e.diagnosticos_diferenciales, p_cc_tests:e.pruebas_realizadas }).forEach(([id, v]) => { if (v !== undefined && v !== null && v !== "") fieldCount += 1; setIfAllowed(id, v, mode === "replace" ? "merge" : mode); });
  const days = normalizeClinicalJsonDays(c);
  if (mode === "replace" && days.length) state.draft.procedureClinicalDays = [];
  let loaded = 0, daysAdded = 0, medsAdded = 0, suppliesAdded = 0;
  days.forEach((d) => {
    const medications = clinicalJsonMedicationItems(d).map(normalizeJsonClinicalMedication).filter(Boolean);
    const supplies = clinicalJsonSupplyItems(d).map(normalizeJsonClinicalSupply).filter(Boolean);
    if (!medications.length && !supplies.length) return;
    const day = { id: uid("ccday"), date: jsonValue(d, ["fecha", "date", "dia", "día", "fecha_medicacion", "fecha_seguimiento"]) || "", hour: jsonValue(d, ["hora", "time", "hora_aplicacion", "hora_seguimiento", "hour"]) || "", observations: jsonValue(d, ["observaciones_dia", "observaciones", "notas_dia", "notas", "evolución", "evolucion", "notes", "observations"]) || "", medications, supplies };
    if (mode === "merge") {
      const existing = (state.draft.procedureClinicalDays || []).find((row) => safe(row.date) === safe(day.date));
      if (existing) {
        if (!safe(existing.hour) && safe(day.hour)) existing.hour = day.hour;
        if (!safe(existing.observations) && safe(day.observations)) existing.observations = day.observations;
        medications.forEach((med) => {
          const dup = (existing.medications || []).find((current) => clinicalMedicationDuplicateKey(current) === clinicalMedicationDuplicateKey(med));
          if (dup) mergeMissingFields(dup, med);
          else { existing.medications = existing.medications || []; existing.medications.push(med); loaded += 1; medsAdded += 1; }
        });
        supplies.forEach((supply) => {
          const dup = (existing.supplies || []).find((current) => clinicalSupplyDuplicateKey(current) === clinicalSupplyDuplicateKey(supply));
          if (dup) mergeMissingFields(dup, supply);
          else { existing.supplies = existing.supplies || []; existing.supplies.push(supply); loaded += 1; suppliesAdded += 1; }
        });
        return;
      }
    }
    const duplicate = (state.draft.procedureClinicalDays || []).some((existing) => clinicalDayDuplicateKey(existing) === clinicalDayDuplicateKey(day));
    if (!duplicate || mode === "replace") { state.draft.procedureClinicalDays.push(day); loaded += medications.length + supplies.length; daysAdded += 1; medsAdded += medications.length; suppliesAdded += supplies.length; }
  });
  return { loaded, fieldCount, daysAdded, medsAdded, suppliesAdded };
}
function mergeMissingFields(target = {}, source = {}) { Object.entries(source || {}).forEach(([k, v]) => { if ((target[k] === undefined || target[k] === null || target[k] === "") && v !== undefined && v !== null && v !== "") target[k] = v; }); }
function clinicalMedicationDuplicateKey(m = {}) { return JSON.stringify([m.itemId || normalizeJsonName(m.name)]); }
function clinicalSupplyDuplicateKey(s = {}) { return JSON.stringify([s.itemId || normalizeJsonName(s.name)]); }
function clinicalDayDuplicateKey(day = {}) { return JSON.stringify({ date: day.date || "", meds: (day.medications || []).map(clinicalMedicationDuplicateKey).sort(), supplies: (day.supplies || []).map(clinicalSupplyDuplicateKey).sort() }); }
function normalizeJsonClinicalMedication(m) {
  const inv = findMedicationFromJson(m);
  const name = jsonValue(m, ["medicamento_nombre", "medicamento", "nombre_medicamento", "producto", "farmaco", "fármaco", "medicamento_administrado", "medicationName", "medication_name", "nombre", "name"]);
  const structured = jsonValue(m, ["dosis_estructurada", "dosis", "dosis_usada", "dosis_manual", "dosis_registrada", "structured_dose"]) || {};
  const theoreticalRaw = jsonValue(m, ["dosis_total_teorica", "dosis_total", "total_activo", "cantidad_total_teorica", "theoretical_total_dose"]);
  const adminRaw = jsonValue(m, ["cantidad_administrable", "dosis_administrable", "administrable", "cantidad_real", "cantidad_usada_real", "administered_amount"]);
  const theoretical = theoreticalRaw && typeof theoreticalRaw === "object" ? theoreticalRaw : { cantidad: theoreticalRaw };
  const admin = adminRaw && typeof adminRaw === "object" ? adminRaw : { cantidad: adminRaw };
  if (!inv && !name && (structured.cantidad || theoretical.cantidad || admin.cantidad)) {
    return null;
  }
  const externalFlag = jsonValue(m, ["uso_externo", "externo", "no_inventariado", "external", "not_in_inventory"]);
  const noInventoryWarning = !inv ? "Este medicamento no existe en inventario. Vincúlalo manualmente o márcalo como externo/no inventariado." : "Vinculado a inventario";
  const indicatedDoseQty = jsonValue(structured, ["cantidad", "cantidad_dosis", "dosis_cantidad", "quantity"]) ?? jsonValue(m, ["cantidad", "cantidad_dosis"]);
  const indicatedDoseUnit = jsonValue(structured, ["unidad", "unidad_dosis", "unit"]) ?? jsonValue(m, ["unidad", "unidad_dosis"]);
  const administeredQty = jsonValue(admin, ["cantidad", "quantity"]);
  const administeredUnit = jsonValue(admin, ["unidad", "unit"]);
  return { id: uid("ccmed"), itemId: inv?.id || "", external: Boolean(externalFlag) || !inv, name: inv?.brand || name || "Uso externo/no inventariado", route: jsonValue(m, ["via_administracion", "vía_administración", "via", "vía", "ruta", "tipo_administracion", "route"]) || inv?.route || "", indicatedDoseQty, indicatedDoseUnit, perKg: jsonValue(structured, ["por_cada", "cada", "por", "perQuantity", "per_quantity"]) ?? jsonValue(m, ["por_cada", "cada", "por"]), unitBase: jsonValue(structured, ["unidad_base", "base", "unidad_por_cada", "baseUnit", "base_unit"]) ?? jsonValue(m, ["unidad_base", "base", "unidad_por_cada"]), compatibleRule: jsonValue(structured, ["regla_compatible", "regla", "regla_calculo", "compatibleRule", "compatible_rule"]) ?? jsonValue(m, ["regla_compatible", "regla", "regla_calculo"]), theoreticalQty: jsonValue(theoretical, ["cantidad", "quantity"]), theoreticalUnit: jsonValue(theoretical, ["unidad", "unit"]), administeredQty, administeredUnit, doseQty: administeredQty ?? indicatedDoseQty, doseUnit: administeredUnit || indicatedDoseUnit || "", frequency: jsonValue(m, ["frecuencia", "cada_cuanto", "intervalo", "frequency"]) || "", duration: jsonValue(m, ["duracion", "duración", "tiempo_tratamiento", "duration"]) || "", indication: jsonValue(m, ["indicacion", "indicación", "motivo", "uso", "para_que", "indication"]) || "", observations: jsonValue(m, ["observaciones", "observaciones_medicamento", "notas_medicamento", "observations", "notes"]) || "", costSuggested: jsonValue(m, ["costo_sugerido", "costo_automatico", "costo_sugerido_automatico", "suggested_cost", "costSuggested"]), costCharged: jsonValue(m, ["costo_final_cobrado", "costo_final", "costo_cobrado", "precio_final", "final_charged_cost", "costCharged", "priceCharged"]), priceCharged: jsonValue(m, ["costo_final_cobrado", "costo_final", "costo_cobrado", "precio_final", "final_charged_cost", "costCharged", "priceCharged"]), calculationSummary: jsonValue(m, ["nota_calculo", "calculo", "explicación_calculo", "explicacion_calculo", "calculation_note", "calculationSummary"]) || noInventoryWarning, unitCost: inv ? Number(inv.unitCost || 0) : "", owner: inv?.owner || "" };
}
function normalizeJsonClinicalSupply(i) {
  const inv = findSupplyFromJson(i);
  const name = jsonValue(i, ["insumo_nombre", "insumo", "nombre_insumo", "material", "material_usado", "supplyName", "supply_name", "nombre", "name"]);
  const externalFlag = jsonValue(i, ["uso_externo", "externo", "no_inventariado", "external", "not_in_inventory"]);
  const qty = jsonValue(i, ["cantidad_usada", "cantidad", "cantidad_insumos", "numero", "número", "quantity_used", "qty"]);
  const unitCost = jsonValue(i, ["costo_unitario", "costo_unitario_inventario", "precio_unitario", "unit_cost", "unitCost"]);
  return { id: uid("ccsup"), itemId: inv?.id || "", external: Boolean(externalFlag) || !inv, name: inv?.name || name || "Uso externo/no inventariado", qty, unit: jsonValue(i, ["unidad_usada", "unidad", "presentacion", "presentación", "used_unit", "unit"]) || inv?.unit || "", unitCost: unitCost ?? (inv ? supplyDisplayCost(inv) : ""), costSuggested: jsonValue(i, ["costo_sugerido", "costo_automatico", "costo_sugerido_automatico", "suggested_cost", "costSuggested"]), costCharged: jsonValue(i, ["costo_final_cobrado", "costo_final", "costo_cobrado", "precio_final", "final_charged_cost", "costCharged", "priceCharged"]), priceCharged: jsonValue(i, ["costo_final_cobrado", "costo_final", "costo_cobrado", "precio_final", "final_charged_cost", "costCharged", "priceCharged"]), observations: jsonValue(i, ["observaciones", "notas", "observaciones_insumo", "observations", "notes"]) || (!inv ? "Este insumo no existe en inventario. Vincúlalo manualmente o márcalo como externo/no inventariado." : ""), type: inv?.type || "EXTERNAL", owner: inv?.owner || "" };
}
function applyAdviceSectionJson(a, mode) { Object.entries({ p_zoo_activity:a.tipo_asesoria, p_zoo_evaluation:[a.descripcion, ...(a.problemas_detectados || [])].filter(Boolean).join("\n"), p_zoo_intervention:[...(a.recomendaciones || []), ...(a.medicamentos_usados || []), ...(a.vacunas_usadas || []), ...(a.insumos_usados || [])].filter(Boolean).join("\n"), p_zoo_plan:a.plan_accion, p_zoo_followup:a.observaciones }).forEach(([id, v]) => setIfAllowed(id, v, mode)); }
function applyNecropsySectionJson(n, mode) {
  const payload = normalizeNecropsySectionPayload(n);
  const g = payload.datos_generales && !Array.isArray(payload.datos_generales) ? payload.datos_generales : {};
  let loaded = 0;
  Object.entries({ p_nec_idAnimal:g.identificacion_animal, p_nec_species:g.especie, p_nec_breed:g.raza, p_nec_sex:g.sexo, p_nec_age:g.edad, p_nec_weight:g.peso, p_nec_color:g.color, p_nec_birthDate:g.fecha_nacimiento, p_nec_deathDate:g.fecha_muerte, p_nec_timeDeathNec:g.tiempo_post_mortem, p_nec_sender:g.remitente, p_nec_caseNumber:g.numero_caso_necropsia, p_nec_clinicalDx:g.diagnosticos_clinicos_relevantes, p_nec_additionalData:[g.antecedentes, g.datos_adicionales].filter(Boolean).join("\n"), p_nec_samplesTaken:Array.isArray(payload.muestras) ? payload.muestras.map((m) => typeof m === "string" ? m : [m.tipo_muestra, m.organo_origen, m.prueba_solicitada, m.conservador, m.observaciones].filter(Boolean).join(" · ")).filter(Boolean).join("\n") : undefined, p_nec_morphDx:Array.isArray(payload.diagnosticos_macroscopicos) ? payload.diagnosticos_macroscopicos.join("\n") : undefined, p_nec_finalDx:payload.diagnostico_presuntivo, p_nec_comments:[payload.causa_probable_muerte, payload.recomendaciones, payload.observaciones_finales].filter(Boolean).join("\n") }).forEach(([id, v]) => { if (v !== undefined && v !== null && String(v).trim()) loaded += 1; setIfAllowed(id, v, mode); });
  if (mode === "replace") state.draft.procedureNecropsyFindings = mergeNecropsyFindings([]);
  state.draft.procedureNecropsyFindings = mergeNecropsyFindings(state.draft.procedureNecropsyFindings || []);
  (payload.reporte_sistematico || []).forEach((r) => {
    const section = r.sistema || "Personalizado", organ = r.organo || section;
    const key = necropsyKey(section, organ);
    let row = (state.draft.procedureNecropsyFindings || []).find((x) => x.key === key);
    if (!row) { row = defaultNecropsyFinding(section, organ); row.custom = true; state.draft.procedureNecropsyFindings.push(row); }
    const updates = { status: normalizeNecropsyStatus(r.estado || (r.descripcion_macroscopica || r.lesiones_encontradas ? "con lesiones" : row.status)), description: r.descripcion_macroscopica, lesions: r.lesiones_encontradas, distribution: r.distribucion, severity: r.severidad, color: r.color, size: r.tamano, consistency: r.consistencia, content: r.contenido, odor: r.olor, parasites: r.parasitos, samples: normalizeNecropsyArrayValue(r.muestras_tomadas), photos: normalizeNecropsyArrayValue(r.fotos_referencias), observations: r.observaciones };
    Object.entries(updates).forEach(([field, value]) => { if (value === undefined || value === null || value === "") return; if (mode === "merge" && field !== "status" && String(row[field] || "").trim()) return; row[field] = value; loaded += 1; });
  });
  renderNecropsySystematicList?.();
  return { loaded };
}
function applyLabSectionJson(rows, mode) { if (mode === "replace") state.draft.procedureLabIds = []; rows.forEach((r) => { const lab = { id: uid("lab"), type: r.nombre_estudio || "Estudio de laboratorio", name: r.nombre_estudio || "", sampleType: r.tipo_muestra || "", sampleDate: r.fecha_toma || "", resultDate: r.fecha_resultado || "", result: r.resultado || "", results: r.resultado || "", interpretation: r.interpretacion || "", relatedTo: r.diagnostico_relacionado || "", costSuggested: r.costo_sugerido ?? 0, costCharged: r.costo_final_cobrado ?? r.costo_sugerido ?? 0, notes: r.observaciones || "", linkedProcedureId: state.editing.procedureId || null, charge: { unitCost: r.costo_sugerido ?? 0, total: r.costo_final_cobrado ?? r.costo_sugerido ?? 0 } }; state.labTests.unshift(lab); state.draft.procedureLabIds.push(lab.id); }); saveState(); }

function bindProcedures() {
  installSectionJsonImportUi();
  renderProcedureType();
  $("#p_producer")?.addEventListener("change", () => {
    const nextProducerId = $("#p_producer").value || null;
    if (state.selectedProducerId !== nextProducerId) clearProducerScopedDraftState();
    state.selectedProducerId = nextProducerId;
    renderProcedureAnimalSelect();
    renderProcedureDraftLists();
  });
  $("#p_cc_registeredAnimal")?.addEventListener("change", () => { applyRegisteredClinicalAnimalToForm(); syncClinicalDayMedicationSelection(); renderProcedureDraftLists(); });
  $("#p_cc_dayMedSelect")?.addEventListener("change", syncClinicalDayMedicationSelection);
  $("#p_cc_dayDoseSelect")?.addEventListener("change", () => { applyClinicalDoseSelection(); syncClinicalDayMedicationCalculation(); });
  ["p_cc_dayDoseQty", "p_cc_dayDoseUnit", "p_cc_dayPerKg", "p_cc_dayUnitBase"].forEach((id) => $("#" + id)?.addEventListener("input", () => { ["p_cc_dayTheoreticalDose", "p_cc_dayAdminDose"].forEach((manualId) => { const el = $("#" + manualId); if (el) delete el.dataset.manual; }); syncClinicalDayMedicationCalculation(); }));
  $("#p_cc_dayAdminUnit")?.addEventListener("input", () => syncClinicalDayMedicationCalculation({ preserveCharged: true }));
  $("#p_cc_dayTheoreticalDose")?.addEventListener("input", () => { $("#p_cc_dayTheoreticalDose").dataset.manual = "1"; const admin = $("#p_cc_dayAdminDose"); if (admin) delete admin.dataset.manual; syncClinicalDayMedicationCalculation(); });
  $("#p_cc_dayAdminDose")?.addEventListener("input", () => { $("#p_cc_dayAdminDose").dataset.manual = "1"; syncClinicalDayMedicationCalculation({ preserveCharged: true }); });
  $("#p_cc_dayMedCostCharged")?.addEventListener("input", () => { $("#p_cc_dayMedCostCharged").dataset.manual = "1"; });
  $("#p_cc_daySupplySelect")?.addEventListener("change", syncClinicalDaySupplySelection);
  ["p_cc_daySupplyQty", "p_cc_daySupplyUnit"].forEach((id) => $("#" + id)?.addEventListener("input", () => syncClinicalDaySupplyCost({ preserveCharged: true })));
  $("#p_cc_daySupplyUnitCost")?.addEventListener("input", () => { $("#p_cc_daySupplyUnitCost").dataset.manual = "1"; syncClinicalDaySupplyCost({ preserveCharged: true }); });
  $("#p_cc_daySupplyCostCharged")?.addEventListener("input", () => { $("#p_cc_daySupplyCostCharged").dataset.manual = "1"; });
  $("#p_cc_species")?.addEventListener("input", syncClinicalDayMedicationSelection);
  $("#p_cc_addDayMedication")?.addEventListener("click", addClinicalDayMedication);
  $("#p_cc_addDaySupply")?.addEventListener("click", addClinicalDaySupply);
  $("#p_cc_addClinicalDay")?.addEventListener("click", addClinicalDay);
  $("#p_caseOwnerMode")?.addEventListener("change", () => { renderProcedureType(); renderProcedureAnimalSelect(); renderProcedureDraftLists(); });
  ["p_unregisteredClientName", "p_unregisteredAnimalName", "p_cc_outcome", "p_cc_deathCause"].forEach((id) => $("#" + id)?.addEventListener("input", renderProcedureDraftLists));
  $("#p_type")?.addEventListener("change", renderProcedureType);
  $("#p_scope")?.addEventListener("change", renderProcedureType);
  $("#p_medicationApplicationMode")?.addEventListener("change", () => { toggleProcedureMedicationModeUi(); renderProcedureDraftLists(); });
  ["p_productType", "p_groupMedSelect", "p_groupAnimalBase", "p_groupAdministrationType", "p_groupTotalVolumeKg", "p_groupDoseRule", "p_groupDoseBase", "p_groupDoseUnit", "p_medApplicationType", "p_medMarginProfile", "p_medMarginOverride", "p_costTotal", "p_medSelect", "p_medDoseProfile", "p_medSpecies", "p_medAdministrationType", "p_medBaseAmount", "p_medBaseUnit", "p_medCalculationRule", "p_medDoseBase", "p_medDoseUnit", "p_medPorCada", "p_medUnitBaseDose", "p_medCalculatedTotal", "p_medDoseKg", "p_medUnitUsed", "p_medCostCharged"].forEach((id) => {
    const handler = () => { if (id === "p_medCostCharged") $("#p_medCostCharged").dataset.manual = "1"; if (id === "p_productType") populateProcedureProductSelect(); if (["p_medSelect", "p_medSpecies", "p_productType"].includes(id)) { const charged = $("#p_medCostCharged"); if (charged) delete charged.dataset.manual; syncProcedureDoseProfileOptions(); } procedureManualMedRuleUi(); applyMedicationDoseProfileToProcedure(id === "p_medDoseProfile"); renderProcedureManualDoseCard(); syncProcedureManualMedCalculation(); renderProcedureDraftLists(); };
    $("#" + id)?.addEventListener("input", handler);
    $("#" + id)?.addEventListener("change", handler);
  });
  ["lab_supplySelectStandalone", "lab_supplyQtyStandalone", "lab_supplyUnitStandalone"].forEach((id) => {
    const handler = () => { if (id === "lab_supplySelectStandalone") { const charged = $("#lab_supplyCostChargedStandalone"); if (charged) delete charged.dataset.manual; } syncLabSupplyStandaloneCost({ preserveCharged: true }); };
    $("#" + id)?.addEventListener("input", handler);
    $("#" + id)?.addEventListener("change", handler);
  });
  $("#lab_supplyCostChargedStandalone")?.addEventListener("input", () => { $("#lab_supplyCostChargedStandalone").dataset.manual = "1"; });
  $("#p_preventiveSubtype")?.addEventListener("change", renderProcedureType);
  $("#p_zoo_activity")?.addEventListener("change", renderProcedureDraftLists);
  $("#p_linkLabDecision")?.addEventListener("change", renderProcedureType);
  $("#p_newProcedure")?.addEventListener("click", () => { resetProcedure(); showProcedureManualMedEditor(true); $("#procedureForm")?.scrollIntoView({ behavior: "smooth", block: "start" }); show("p_msg", "Nuevo procedimiento listo para capturar.", "success"); });
  $("#p_copyManualDose")?.addEventListener("click", async () => { const text = procedureManualDoseText(); if (!text) return show("p_msg", "Captura primero una dosis manual.", "warning"); await navigator.clipboard?.writeText(text); show("p_msg", "Dosis manual copiada.", "success"); });
  $("#p_copyMedicationDosingReference")?.addEventListener("click", () => copyMedicationDosingReference("p_medDosingReferenceText"));
  $("#p_useMedicationDosingReference")?.addEventListener("click", () => useMedicationDosingReferenceAsManualBase("p_medDosingReferenceText", "p_medNotes"));
  $("#p_referenceSaveManualDoseToMedication")?.addEventListener("click", saveManualProcedureDoseToMedication);
  $("#p_cc_copyMedicationDosingReference")?.addEventListener("click", () => copyMedicationDosingReference("p_cc_dayDosingReferenceText"));
  $("#p_cc_useMedicationDosingReference")?.addEventListener("click", () => useMedicationDosingReferenceAsManualBase("p_cc_dayDosingReferenceText", "p_cc_dayMedObs"));
  $("#p_saveManualDoseToMedication")?.addEventListener("click", saveManualProcedureDoseToMedication);
  $("#p_useManualDoseOnly")?.addEventListener("click", () => { renderProcedureManualDoseCard(false); show("p_msg", "La dosis manual se usará solo en este procedimiento.", "success"); });
  $("#p_animalGroup")?.addEventListener("change", () => {
    updateProcedureProducerAnimalTotal();
    if (($("#p_scope")?.value || "INDIVIDUAL") === "INDIVIDUAL") ensureProcedureAnimalEntriesForScope();
    renderProcedureDraftLists();
  });
  $("#p_groupAnimalBase")?.addEventListener("change", () => {
    updateProcedureProducerAnimalTotal();
    renderProcedureDraftLists();
  });
  $("#p_addGroupAnimal")?.addEventListener("click", addProcedureAnimalEntry);
  $("#p_animalsQtyUsed")?.addEventListener("change", renderProcedureDraftLists);
  ["p_cc_followMedDate", "p_cc_followMedSelect", "p_cc_followMedQty", "p_cc_followMedObs"].forEach((id) => {
    $("#" + id)?.addEventListener("input", syncProcedureFollowupMedicationForm);
    $("#" + id)?.addEventListener("change", syncProcedureFollowupMedicationForm);
  });
  $("#p_cc_followMedAdd")?.addEventListener("click", addOrUpdateProcedureFollowupMedication);
  $("#p_cc_followMedCancelEdit")?.addEventListener("click", () => { resetProcedureFollowupMedicationForm(); renderProcedureDraftLists(); });

  $("#p_applySpeciesDoseJson")?.addEventListener("click", () => {
    try {
      const rows = flattenSpeciesDoseJson(parsePossiblyWrappedJson($("#p_speciesDoseJson")?.value || "{}"));
      const errors = validateSpeciesDoseRows(rows);
      if (errors.length) throw new Error(errors[0]);
      state.draft.procedureSpeciesDoses = rows;
      renderProcedureDraftLists();
      show("p_msg", `JSON de dosis validado y guardado en el procedimiento: ${rows.length} dosis.`, "success");
    } catch (error) {
      show("p_err", error.message || "JSON de dosis inválido.", "error");
    }
  });
  $("#p_copySpeciesDoseJsonExample")?.addEventListener("click", async () => {
    const example = speciesDoseJsonExample();
    if ($("#p_speciesDoseJson")) $("#p_speciesDoseJson").value = example;
    await navigator.clipboard?.writeText?.(example);
    show("p_msg", "Ejemplo de dosis JSON copiado y pegado.", "success");
  });
    $("#p_startMedUse")?.addEventListener("click", () => { clearProcedureManualMedForm(); showProcedureManualMedEditor(true); });
  $("#p_cancelMedUse")?.addEventListener("click", () => { clearProcedureManualMedForm(); renderProcedureDraftLists(); });
  $("#p_addMedUse")?.addEventListener("click", addProcedureMedUse);
  $("#p_addVaccineUse")?.addEventListener("click", addProcedureVaccineUse);
  $("#p_addSupplyUse")?.addEventListener("click", addProcedureSupplyUse);
  $("#lab_add")?.addEventListener("click", addLab);
  ["p_cc_take","p_cc_pick","p_nec_take","p_nec_pick","p_charge_take","p_charge_pick"].forEach((id) => $("#" + id)?.addEventListener("change", async (e) => { for (const f of Array.from(e.target.files || [])) { const data = await fileToBase64(f); if (id.startsWith("p_cc")) state.draft.procedureCasePhotos.push(data); else if (id.startsWith("p_nec")) state.draft.procedureNecropsyPhotos.push(data); else state.draft.procedureChargePhoto = data; } renderProcedureDraftLists(); e.target.value = ""; }));
  $("#p_cc_btnTake")?.addEventListener("click", () => requestPhotoInput("#p_cc_take", 'camera'));
  $("#p_cc_btnPick")?.addEventListener("click", () => requestPhotoInput("#p_cc_pick", 'gallery'));
  $("#p_cc_btnClear")?.addEventListener("click", () => { state.draft.procedureCasePhotos = []; renderProcedureDraftLists(); });
  wireNecropsyControls();
  $("#p_nec_btnTake")?.addEventListener("click", () => requestPhotoInput("#p_nec_take", 'camera'));
  $("#p_nec_btnPick")?.addEventListener("click", () => requestPhotoInput("#p_nec_pick", 'gallery'));
  $("#p_nec_btnClear")?.addEventListener("click", () => { state.draft.procedureNecropsyPhotos = []; renderProcedureDraftLists(); });
  $("#p_charge_btnTake")?.addEventListener("click", () => requestPhotoInput("#p_charge_take", 'camera'));
  $("#p_charge_btnPick")?.addEventListener("click", () => requestPhotoInput("#p_charge_pick", 'gallery'));
  $("#p_charge_btnClear")?.addEventListener("click", () => { state.draft.procedureChargePhoto = null; renderProcedureDraftLists(); });
  $("#procedureForm")?.addEventListener("submit", (e) => { e.preventDefault(); saveProcedure(); });
  $("#p_save")?.addEventListener("click", saveProcedure);
  $("#p_clear")?.addEventListener("click", resetProcedure);
  $("#btnProcedureWord")?.addEventListener("click", () => exportWord("procedimientos.doc", procedureSummaryHtml()));
  $("#btnProcedureExcel")?.addEventListener("click", () => exportExcel("procedimientos.xls", producerExcelSheets([], [], [], [], [], state.procedures, state.labTests)));
}
