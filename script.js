const STORAGE_KEY = "app_rural_consolidada_v1";
const LEGACY_KEYS = ["app_rural_fusion_full_v4", "app_rural_fusion_full_v3", "app_rural_state"];
const WEEK_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const state = {
  producers: [],
  animals: [],
  medications: [],
  vaccines: [],
  supplies: [],
  labTests: [],
  procedures: [],
  editing: {
    producerId: null,
    animalId: null,
    medicationId: null,
    vaccineId: null,
    supplyId: null,
    labId: null,
    procedureId: null
  },
  mediaDrafts: {
    producerPhoto: null,
    animalPhoto: null,
    medicationPhoto: null,
    vaccinePhoto: null,
    labFile: null,
    procedureChargePhoto: null,
    procedurePhotos: []
  },
  ui: {
    medMode: "MANUAL"
  }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const byId = (id) => document.getElementById(id);

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function text(v) { return v == null ? "" : String(v); }
function num(v) { return Number(v || 0); }
function money(v) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(num(v));
}
function escapeHtml(v) {
  return text(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
function getList(type) {
  return {
    producer: state.producers,
    animal: state.animals,
    medication: state.medications,
    vaccine: state.vaccines,
    supply: state.supplies,
    lab: state.labTests,
    procedure: state.procedures
  }[type];
}
function getProducer(id) { return state.producers.find(x => x.id === id) || null; }
function getAnimal(id) { return state.animals.find(x => x.id === id) || null; }
function getProcedure(id) { return state.procedures.find(x => x.id === id) || null; }
function findById(type, id) { return getList(type)?.find(x => x.id === id) || null; }
function removeById(type, id) {
  const list = getList(type);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list.splice(idx, 1);
}
function readMultiSelect(select) { return Array.from(select.selectedOptions).map(opt => opt.value); }
function setMultiSelect(select, values = []) {
  Array.from(select.options).forEach(opt => { opt.selected = values.includes(opt.value); });
}
async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function csvEscape(value) {
  const raw = text(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}
function exportCsv(filename, rows) {
  downloadFile(filename, "\ufeff" + rows.map(row => row.map(csvEscape).join(",")).join("\n"), "text/csv;charset=utf-8;");
}
function isImageDataUrl(dataUrl) { return /^data:image\//.test(text(dataUrl)); }
function openExternal(url) {
  const finalUrl = text(url).trim();
  if (!finalUrl) return;
  window.open(finalUrl, "_blank", "noopener,noreferrer");
}
function initLegacyData() {
  if (localStorage.getItem(STORAGE_KEY)) {
    Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY)));
    state.editing ||= {};
    state.mediaDrafts ||= {};
    state.ui ||= { medMode: "MANUAL" };
    state.animals ||= [];
    state.medications ||= state.meds || [];
    state.vaccines ||= [];
    state.labTests ||= [];
    return;
  }
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const old = JSON.parse(raw);
      state.producers = Array.isArray(old.producers) ? old.producers.map(migrateProducer) : [];
      state.animals = extractAnimalsFromLegacy(old);
      state.medications = Array.isArray(old.medications) ? old.medications : Array.isArray(old.meds) ? old.meds : [];
      state.vaccines = Array.isArray(old.vaccines) ? old.vaccines : [];
      state.supplies = Array.isArray(old.supplies) ? old.supplies : [];
      state.labTests = Array.isArray(old.labTests) ? old.labTests : [];
      state.procedures = Array.isArray(old.procedures) ? old.procedures : [];
      saveState();
      break;
    } catch (err) {
      console.error("No se pudo migrar", key, err);
    }
  }
}
function migrateProducer(p = {}) {
  return {
    id: p.id || uid("prod"),
    name: p.basic?.name || p.name || "",
    age: p.basic?.age || p.age || "",
    gender: p.basic?.gender || p.gender || "",
    civilStatus: p.basic?.civilStatus || "",
    phone: p.basic?.phone || p.celular || "",
    household: p.basic?.peopleHome || "",
    locality: p.basic?.locality || "",
    municipality: p.basic?.municipality || "",
    state: p.basic?.state || "Hidalgo",
    schooling: p.basic?.schooling || "",
    animalFunction: p.classification?.animalFunction || "",
    animalFunctionOther: "",
    lat: p.location?.lat || "",
    lng: p.location?.lng || "",
    mapsUrl: p.location?.mapsUrl || "",
    availability: createEmptyAvailability(),
    helper: { exists: false, name: "", age: "", gender: "", species: "", since: "", services: "", isVet: "", advice: "" },
    traditional: { use: false, how: "", animals: "" },
    programs: [],
    environment: "",
    water: "",
    localKnowledge: { enabled: false, specific: "", teacher: "", usage: "" },
    sheepGoats: { hasNow: false, hadBefore: "", noReason: "", noReasonOther: "" },
    birds: { hasNow: false, interest: "" },
    notes: p.notes || "",
    photo: p.photo || null,
    createdAt: p.createdAt || new Date().toISOString()
  };
}
function extractAnimalsFromLegacy(old) {
  if (Array.isArray(old.animals)) return old.animals;
  const animals = [];
  (old.producers || []).forEach(prod => {
    (prod.animals || []).forEach(animal => {
      animals.push({ ...animal, producerId: prod.id, id: animal.id || uid("animal") });
    });
  });
  return animals;
}
function createEmptyAvailability() {
  return Object.fromEntries(WEEK_DAYS.map(day => [day, { enabled: false, start: "08:00", end: "17:00" }]));
}
function buildAvailabilityGrid() {
  const grid = byId("availabilityGrid");
  grid.innerHTML = "";
  WEEK_DAYS.forEach(day => {
    const row = document.createElement("div");
    row.className = "day-row";
    row.innerHTML = `
      <label class="inline-check"><input type="checkbox" data-day-enabled="${day}" /> ${day}</label>
      <label>Inicio<input type="time" data-day-start="${day}" value="08:00" /></label>
      <label>Fin<input type="time" data-day-end="${day}" value="17:00" /></label>
    `;
    grid.appendChild(row);
  });
}
function readAvailability() {
  return Object.fromEntries(WEEK_DAYS.map(day => [day, {
    enabled: byId(`enabled_${day}`)?.checked ?? $(`[data-day-enabled="${day}"]`).checked,
    start: $(`[data-day-start="${day}"]`).value,
    end: $(`[data-day-end="${day}"]`).value
  }]));
}
function setAvailability(data = createEmptyAvailability()) {
  WEEK_DAYS.forEach(day => {
    const info = data[day] || { enabled: false, start: "08:00", end: "17:00" };
    $(`[data-day-enabled="${day}"]`).checked = !!info.enabled;
    $(`[data-day-start="${day}"]`).value = info.start || "08:00";
    $(`[data-day-end="${day}"]`).value = info.end || "17:00";
  });
}
function renderThumbs(containerId, items, removeCb) {
  const container = byId(containerId);
  container.innerHTML = "";
  const list = Array.isArray(items) ? items : items ? [items] : [];
  if (!list.length) {
    container.innerHTML = `<div class="thumb"><span>Sin evidencia</span></div>`;
    return;
  }
  list.forEach((item, idx) => {
    const val = typeof item === "string" ? item : item?.dataUrl || "";
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if (isImageDataUrl(val)) {
      thumb.innerHTML = `<img src="${val}" alt="Evidencia" />`;
    } else {
      thumb.innerHTML = `<span>Archivo guardado</span>`;
    }
    if (removeCb) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "thumb-remove";
      btn.textContent = "✕";
      btn.addEventListener("click", () => removeCb(idx));
      thumb.appendChild(btn);
    }
    container.appendChild(thumb);
  });
}
function tabSwitch(tabName) {
  $$(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabName));
  $$(".page").forEach(page => page.classList.toggle("active", page.id === `tab-${tabName}`));
}
function fillProducerSelects() {
  const options = ['<option value="">Selecciona productor(a)</option>'].concat(state.producers.map(p => `<option value="${p.id}">${escapeHtml(p.name || "Sin nombre")}</option>`)).join("");
  ["animal_producer", "lab_producer", "proc_producer"].forEach(id => {
    const sel = byId(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = options;
    sel.value = current && state.producers.some(p => p.id === current) ? current : "";
  });
}
function fillAnimalSelects(producerId, targetId, multi = false) {
  const sel = byId(targetId);
  const current = multi ? Array.from(sel.selectedOptions).map(o => o.value) : sel.value;
  const animals = producerId ? state.animals.filter(a => a.producerId === producerId) : state.animals;
  const placeholder = multi ? "" : '<option value="">Selecciona animal</option>';
  sel.innerHTML = placeholder + animals.map(a => `<option value="${a.id}">${escapeHtml(a.name)} · ${escapeHtml(a.species)}</option>`).join("");
  if (multi) setMultiSelect(sel, current.filter(id => animals.some(a => a.id === id)));
  else sel.value = animals.some(a => a.id === current) ? current : "";
}
function fillProcedureSelects() {
  const options = ['<option value="">Sin vincular</option>'].concat(state.procedures.map(p => `<option value="${p.id}">${escapeHtml(p.type)} · ${escapeHtml(getProducer(p.producerId)?.name || "Sin productor")}</option>`)).join("");
  byId("lab_procedure").innerHTML = options;
  const procLab = byId("proc_labLinks");
  const selected = Array.from(procLab.selectedOptions).map(o => o.value);
  procLab.innerHTML = state.labTests.map(l => `<option value="${l.id}">${escapeHtml(l.type)} · ${escapeHtml(l.date || "sin fecha")} · ${escapeHtml(getAnimal(l.animalId)?.name || "sin animal")}</option>`).join("");
  setMultiSelect(procLab, selected.filter(id => state.labTests.some(t => t.id === id)));
}
function fillInventorySelect(select, items, labelBuilder) {
  const current = select.value;
  select.innerHTML = '<option value="">Selecciona</option>' + items.map(item => `<option value="${item.id}">${labelBuilder(item)}</option>`).join("");
  select.value = items.some(i => i.id === current) ? current : "";
}
function createInventoryRow(kind, data = {}) {
  const tpl = byId("inventoryRowTemplate").content.firstElementChild.cloneNode(true);
  tpl.dataset.kind = kind;
  const itemSelect = tpl.querySelector(".inv-item");
  const doseWrap = tpl.querySelector(".inv-dose-wrap");
  const unitWrap = tpl.querySelector(".inv-unit-wrap");
  const targetWrap = tpl.querySelector(".inv-target-wrap");
  const animalsWrap = tpl.querySelector(".inv-animals-wrap");
  const chargeWrap = tpl.querySelector(".inv-charge-wrap");
  const notesWrap = tpl.querySelector(".inv-notes-wrap");
  const removeBtn = tpl.querySelector(".inv-remove");
  const status = tpl.querySelector(".inv-status");

  if (kind === "medication") {
    fillInventorySelect(itemSelect, state.medications, item => `${escapeHtml(item.name)} (${item.stock} ${escapeHtml(item.unit)})`);
    doseWrap.classList.remove("hidden");
    unitWrap.classList.remove("hidden");
    targetWrap.classList.remove("hidden");
    chargeWrap.classList.remove("hidden");
  } else if (kind === "vaccine") {
    fillInventorySelect(itemSelect, state.vaccines, item => `${escapeHtml(item.name)} (${item.stock} ${escapeHtml(item.unit)})`);
    animalsWrap.classList.remove("hidden");
  } else if (kind === "disposable") {
    fillInventorySelect(itemSelect, state.supplies.filter(x => x.type === "Desechable"), item => `${escapeHtml(item.name)} (${item.stock} ${escapeHtml(item.unit)})`);
  } else if (kind === "reusable") {
    fillInventorySelect(itemSelect, state.supplies.filter(x => x.type === "No desechable"), item => `${escapeHtml(item.name)} (${item.stock} ${escapeHtml(item.unit)}) · vida útil ${item.lifeYears || 0} años`);
  }

  tpl.querySelector(".inv-qty").value = data.qty ?? 0;
  tpl.querySelector(".inv-dose").value = data.dose ?? "";
  tpl.querySelector(".inv-unit").value = data.unit ?? "";
  tpl.querySelector(".inv-target").value = data.target ?? "";
  tpl.querySelector(".inv-animals").value = data.animals ?? 0;
  tpl.querySelector(".inv-charge").value = data.chargeToProducer ?? 0;
  tpl.querySelector(".inv-notes").value = data.notes ?? "";
  itemSelect.value = data.itemId ?? "";

  function validate() {
    const item = findById(kind === "medication" ? "medication" : kind === "vaccine" ? "vaccine" : "supply", itemSelect.value);
    const qty = num(tpl.querySelector(".inv-qty").value);
    if (!item) {
      status.textContent = "Selecciona un elemento.";
      return;
    }
    if (kind === "reusable") {
      status.textContent = `Disponible: ${item.stock} ${item.unit}. Costo por uso: ${money(item.useCost)}.`;
      return;
    }
    status.textContent = qty > num(item.stock)
      ? `⚠️ Cantidad usada excede inventario disponible (${item.stock} ${item.unit}).`
      : `Disponible: ${item.stock} ${item.unit}.`;
  }
  itemSelect.addEventListener("change", validate);
  tpl.querySelector(".inv-qty").addEventListener("input", () => { validate(); updateProcedureCharge(); });
  tpl.querySelector(".inv-charge")?.addEventListener("input", updateProcedureCharge);
  removeBtn.addEventListener("click", () => { tpl.remove(); updateProcedureCharge(); });
  validate();
  return tpl;
}
function collectInventoryRows(containerId, kind) {
  return Array.from(byId(containerId).querySelectorAll(".inventory-row")).map(row => ({
    kind,
    itemId: row.querySelector(".inv-item").value,
    qty: num(row.querySelector(".inv-qty").value),
    dose: row.querySelector(".inv-dose")?.value || "",
    unit: row.querySelector(".inv-unit")?.value || "",
    target: row.querySelector(".inv-target")?.value || "",
    animals: num(row.querySelector(".inv-animals")?.value),
    chargeToProducer: num(row.querySelector(".inv-charge")?.value),
    notes: row.querySelector(".inv-notes")?.value || ""
  })).filter(item => item.itemId);
}
function setInventoryRows(containerId, kind, rows = []) {
  const container = byId(containerId);
  container.innerHTML = "";
  rows.forEach(row => container.appendChild(createInventoryRow(kind, row)));
}
function addInventoryRow(containerId, kind) {
  byId(containerId).appendChild(createInventoryRow(kind));
}
function procedureAnimalsForCurrentProducer() {
  const producerId = byId("proc_producer").value;
  return state.animals.filter(an => an.producerId === producerId);
}
function updateProcedureAnimalSelect() {
  const producerId = byId("proc_producer").value;
  fillAnimalSelects(producerId, "proc_animals", true);
  const producer = getProducer(producerId);
  byId("procProducerHint").textContent = producer ? `Trabajando con ${producer.name}.` : "Selecciona un productor(a) registrado(a).";
  validateProcedureCount();
}
function validateProcedureCount() {
  const type = byId("proc_type").value;
  const mode = byId("proc_mode").value;
  const available = procedureAnimalsForCurrentProducer();
  const count = num(byId("proc_animalCount").value);
  const selectedIds = Array.from(byId("proc_animals").selectedOptions).map(o => o.value);
  const msg = byId("procCountMsg");
  if (mode === "individual" || ["Cirugía", "Caso clínico", "Necropsia"].includes(type)) {
    byId("proc_mode").value = "individual";
    if (selectedIds.length > 1) {
      setMultiSelect(byId("proc_animals"), selectedIds.slice(0, 1));
    }
    msg.textContent = "Este tipo de procedimiento es individual y solo permite un animal.";
    return;
  }
  if (count > available.length) {
    msg.textContent = `⚠️ No puedes intervenir ${count} animales; solo hay ${available.length} disponibles para ese productor(a).`;
  } else {
    msg.textContent = `Disponibles: ${available.length} animales. Seleccionados: ${selectedIds.length}.`;
  }
}
function renderProcedureModules() {
  const type = byId("proc_type").value;
  const map = {
    modulePreventive: type === "Medicina preventiva",
    moduleClinicalCare: type === "Atención clínica / zootécnica",
    moduleSurgery: type === "Cirugía",
    moduleCase: type === "Caso clínico",
    moduleNecropsy: type === "Necropsia"
  };
  Object.entries(map).forEach(([id, visible]) => byId(id).classList.toggle("hidden", !visible));
  if (["Cirugía", "Caso clínico", "Necropsia"].includes(type)) byId("proc_mode").value = "individual";
  validateProcedureCount();
}
function updateBirdPrompt() {
  byId("producer_birdsInterestPrompt").textContent = byId("producer_hasBirds").checked
    ? "Si actualmente tiene aves: ¿Qué tanto interés tendría en participar en actividades para aprender más sobre la crianza de aves y mejorar su producción, como entrevistas más detalladas o dinámicas de trabajo relacionadas con el tema?"
    : "Si actualmente no tiene aves: ¿Qué tanto interés tendría en participar en actividades para aprender cómo iniciar la crianza de aves, como entrevistas más detalladas o dinámicas relacionadas con este tema?";
}
function toggleProducerConditionals() {
  byId("producer_animalFunctionOther_wrap").classList.toggle("hidden", byId("producer_animalFunction").value !== "Otro");
  byId("producer_helperWrap").classList.toggle("hidden", !byId("producer_hasHelper").checked);
  byId("producer_helperAdviceWrap").classList.toggle("hidden", byId("producer_helperIsVet").value !== "No");
  const trad = byId("producer_traditionalUse").checked;
  byId("producer_traditionalHow_wrap").classList.toggle("hidden", !trad);
  byId("producer_traditionalAnimals_wrap").classList.toggle("hidden", !trad);
  const knowledge = byId("producer_localKnowledge").checked;
  byId("producer_knowledgeWrap").classList.toggle("hidden", !knowledge);
  const hasSheep = byId("producer_hasSheepGoats").checked;
  byId("producer_hadSheepGoats_wrap").classList.toggle("hidden", !hasSheep);
  byId("producer_noSheepReason_wrap").classList.toggle("hidden", hasSheep);
  byId("producer_noSheepReasonOther_wrap").classList.toggle("hidden", hasSheep || byId("producer_noSheepReason").value !== "Otro");
  updateBirdPrompt();
}
function toggleAnimalConditionals() {
  byId("animal_speciesOther_wrap").classList.toggle("hidden", byId("animal_species").value !== "Otro");
  const producer = getProducer(byId("animal_producer").value);
  byId("animalProducerHint").textContent = producer ? `Productor(a) seleccionado(a): ${producer.name} · ${producer.locality || "sin localidad"}.` : "Selecciona un productor(a) registrado(a).";
}
function toggleSupplyConditionals() {
  const reusable = byId("supply_type").value === "No desechable";
  byId("supply_lifeYears_wrap").classList.toggle("hidden", !reusable);
}
function toggleMedicationOwnerOther() {
  byId("med_ownerOther_wrap").classList.toggle("hidden", byId("med_owner").value !== "Otro");
}
function renderDashboard() {
  const dashboard = byId("dashboardStats");
  dashboard.innerHTML = [
    `Productores registrados: <strong>${state.producers.length}</strong>`,
    `Animales registrados: <strong>${state.animals.length}</strong>`,
    `Medicamentos: <strong>${state.medications.length}</strong>`,
    `Vacunas: <strong>${state.vaccines.length}</strong>`,
    `Insumos: <strong>${state.supplies.length}</strong>`,
    `Pruebas de laboratorio: <strong>${state.labTests.length}</strong>`,
    `Procedimientos: <strong>${state.procedures.length}</strong>`
  ].map(line => `<div class="stat-box">${line}</div>`).join("");
  byId("integrityChecklist").innerHTML = [
    "Medicamentos y vacunas están separados en estructura, interfaz e inventario.",
    "Geolocalización genera latitud, longitud y vínculo Maps relativo al navegador.",
    "Animales se relacionan con productor(a) seleccionado(a).",
    "Word y Excel exportan datos reales capturados desde localStorage.",
    "Pruebas de laboratorio se pueden vincular con procedimientos.",
    "Insumos no desechables registran vida útil en años y costo por uso."
  ].map(item => `<div class="checklist-item">✅ ${item}</div>`).join("");
}
function currentEntityWordHtml(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,sans-serif">${bodyHtml}</body></html>`;
}
function exportProducerWord(producer) {
  if (!producer) return alert("Selecciona o guarda un productor(a) primero.");
  const animals = state.animals.filter(a => a.producerId === producer.id);
  const procedures = state.procedures.filter(p => p.producerId === producer.id);
  const html = currentEntityWordHtml(`Productor ${producer.name}`, `
    <h1>Expediente de productor(a)</h1>
    <p><strong>Nombre:</strong> ${escapeHtml(producer.name)}</p>
    <p><strong>Ubicación:</strong> ${escapeHtml([producer.locality, producer.municipality, producer.state].filter(Boolean).join(", "))}</p>
    <p><strong>Maps:</strong> ${escapeHtml(producer.mapsUrl)}</p>
    <p><strong>Notas:</strong> ${escapeHtml(producer.notes)}</p>
    <h2>Animales</h2>
    <ul>${animals.map(a => `<li>${escapeHtml(a.name)} · ${escapeHtml(a.species)} · ${escapeHtml(a.status)}</li>`).join("") || "<li>Sin animales</li>"}</ul>
    <h2>Procedimientos</h2>
    <ul>${procedures.map(p => `<li>${escapeHtml(p.date)} · ${escapeHtml(p.type)} · ${escapeHtml(p.charge.reason || "sin observación")}</li>`).join("") || "<li>Sin procedimientos</li>"}</ul>
  `);
  downloadFile(`productor_${producer.name.replace(/\s+/g, "_")}.doc`, "\ufeff" + html, "application/msword");
}
function exportProcedureWord(proc) {
  if (!proc) return alert("Selecciona o guarda un procedimiento primero.");
  const producer = getProducer(proc.producerId);
  const animals = proc.animalIds.map(getAnimal).filter(Boolean);
  const labTests = proc.labLinks.map(id => state.labTests.find(l => l.id === id)).filter(Boolean);
  const html = currentEntityWordHtml(`Procedimiento ${proc.type}`, `
    <h1>${escapeHtml(proc.type)}</h1>
    <p><strong>Fecha:</strong> ${escapeHtml(proc.date)}</p>
    <p><strong>Productor(a):</strong> ${escapeHtml(producer?.name || "")}</p>
    <p><strong>Animales:</strong> ${animals.map(a => escapeHtml(a.name)).join(", ")}</p>
    <p><strong>Modalidad:</strong> ${escapeHtml(proc.mode)}</p>
    <h2>Contenido específico</h2>
    <pre>${escapeHtml(JSON.stringify(proc.modules, null, 2))}</pre>
    <h2>Inventario usado</h2>
    <pre>${escapeHtml(JSON.stringify(proc.inventory, null, 2))}</pre>
    <h2>Cobro</h2>
    <pre>${escapeHtml(JSON.stringify(proc.charge, null, 2))}</pre>
    <h2>Pruebas vinculadas</h2>
    <pre>${escapeHtml(JSON.stringify(labTests, null, 2))}</pre>
    <h2>Imágenes / evidencia</h2>
    ${(proc.charge.photo && isImageDataUrl(proc.charge.photo)) ? `<img style="max-width:300px" src="${proc.charge.photo}" />` : "<p>Sin evidencia de cobro.</p>"}
    ${(proc.photos || []).filter(isImageDataUrl).map(img => `<img style="max-width:300px;margin:6px" src="${img}" />`).join("")}
  `);
  downloadFile(`procedimiento_${proc.type.replace(/\s+/g, "_")}.doc`, "\ufeff" + html, "application/msword");
}
function exportAllWord() {
  const html = currentEntityWordHtml("App Rural Consolidada", `
    <h1>Resumen general App Rural Consolidada</h1>
    <p>Productores: ${state.producers.length}</p>
    <p>Animales: ${state.animals.length}</p>
    <p>Medicamentos: ${state.medications.length}</p>
    <p>Vacunas: ${state.vaccines.length}</p>
    <p>Insumos: ${state.supplies.length}</p>
    <p>Laboratorio: ${state.labTests.length}</p>
    <p>Procedimientos: ${state.procedures.length}</p>
    <h2>Procedimientos</h2>
    <ul>${state.procedures.map(p => `<li>${escapeHtml(p.date)} · ${escapeHtml(p.type)} · ${escapeHtml(getProducer(p.producerId)?.name || "")}</li>`).join("")}</ul>
  `);
  downloadFile("app_rural_consolidada.doc", "\ufeff" + html, "application/msword");
}
function exportAllExcel() {
  exportCsv("app_rural_consolidada.csv", [
    ["Sección", "ID", "Nombre/Tipo", "Productor", "Detalle", "Monto"],
    ...state.producers.map(p => ["Productor", p.id, p.name, p.name, p.locality, ""]),
    ...state.animals.map(a => ["Animal", a.id, a.name, getProducer(a.producerId)?.name || "", a.species, ""]),
    ...state.medications.map(m => ["Medicamento", m.id, m.name, "", `${m.stock} ${m.unit}`, m.totalCost]),
    ...state.vaccines.map(v => ["Vacuna", v.id, v.name, "", `${v.stock} ${v.unit}`, v.totalCost]),
    ...state.supplies.map(s => ["Insumo", s.id, s.name, "", `${s.type} · ${s.stock} ${s.unit}`, s.type === "No desechable" ? s.useCost : s.unitCost]),
    ...state.labTests.map(l => ["Laboratorio", l.id, l.type, getProducer(l.producerId)?.name || "", l.result, ""]),
    ...state.procedures.map(p => ["Procedimiento", p.id, p.type, getProducer(p.producerId)?.name || "", p.mode, p.charge.final])
  ]);
}
function backupJson() {
  downloadFile("app-rural-respaldo.json", JSON.stringify(state, null, 2), "application/json");
}
async function restoreJson(file) {
  const textData = await file.text();
  const imported = JSON.parse(textData);
  ["producers","animals","medications","vaccines","supplies","labTests","procedures"].forEach(key => {
    state[key] = Array.isArray(imported[key]) ? imported[key] : [];
  });
  saveState();
  rerenderAll();
}
function readProducerForm() {
  return {
    id: state.editing.producerId || uid("prod"),
    name: byId("producer_name").value.trim(),
    age: byId("producer_age").value,
    gender: byId("producer_gender").value,
    civilStatus: byId("producer_civil").value,
    phone: byId("producer_phone").value,
    household: byId("producer_household").value,
    locality: byId("producer_locality").value,
    municipality: byId("producer_municipality").value,
    state: byId("producer_state").value,
    schooling: byId("producer_schooling").value,
    animalFunction: byId("producer_animalFunction").value,
    animalFunctionOther: byId("producer_animalFunctionOther").value,
    lat: byId("producer_lat").value,
    lng: byId("producer_lng").value,
    mapsUrl: byId("producer_mapsUrl").value,
    availability: readAvailability(),
    helper: {
      exists: byId("producer_hasHelper").checked,
      name: byId("producer_helperName").value,
      age: byId("producer_helperAge").value,
      gender: byId("producer_helperGender").value,
      species: byId("producer_helperSpecies").value,
      since: byId("producer_helperSince").value,
      services: byId("producer_helperServices").value,
      isVet: byId("producer_helperIsVet").value,
      advice: byId("producer_helperAdvice").value
    },
    traditional: {
      use: byId("producer_traditionalUse").checked,
      how: byId("producer_traditionalHow").value,
      animals: byId("producer_traditionalAnimals").value
    },
    programs: readMultiSelect(byId("producer_programs")),
    environment: byId("producer_environment").value,
    water: byId("producer_water").value,
    localKnowledge: {
      enabled: byId("producer_localKnowledge").checked,
      specific: byId("producer_knowledgeSpecific").value,
      teacher: byId("producer_knowledgeTeacher").value,
      usage: byId("producer_knowledgeUsage").value
    },
    sheepGoats: {
      hasNow: byId("producer_hasSheepGoats").checked,
      hadBefore: byId("producer_hadSheepGoats").value,
      noReason: byId("producer_noSheepReason").value,
      noReasonOther: byId("producer_noSheepReasonOther").value
    },
    birds: {
      hasNow: byId("producer_hasBirds").checked,
      interest: byId("producer_birdsInterest").value
    },
    notes: byId("producer_notes").value,
    photo: state.mediaDrafts.producerPhoto,
    createdAt: new Date().toISOString()
  };
}
function resetProducerForm() {
  byId("producerForm").reset();
  state.editing.producerId = null;
  state.mediaDrafts.producerPhoto = null;
  setAvailability(createEmptyAvailability());
  byId("producerFormTitle").textContent = "Nuevo productor(a)";
  renderThumbs("producerPhotoPreview", null, null);
  toggleProducerConditionals();
}
function populateProducerForm(prod) {
  state.editing.producerId = prod.id;
  byId("producerFormTitle").textContent = `Editar productor(a): ${prod.name}`;
  byId("producer_name").value = prod.name || "";
  byId("producer_age").value = prod.age || "";
  byId("producer_gender").value = prod.gender || "";
  byId("producer_civil").value = prod.civilStatus || "";
  byId("producer_phone").value = prod.phone || "";
  byId("producer_household").value = prod.household || "";
  byId("producer_locality").value = prod.locality || "";
  byId("producer_municipality").value = prod.municipality || "";
  byId("producer_state").value = prod.state || "";
  byId("producer_schooling").value = prod.schooling || "";
  byId("producer_animalFunction").value = prod.animalFunction || "";
  byId("producer_animalFunctionOther").value = prod.animalFunctionOther || "";
  byId("producer_lat").value = prod.lat || "";
  byId("producer_lng").value = prod.lng || "";
  byId("producer_mapsUrl").value = prod.mapsUrl || "";
  setAvailability(prod.availability || createEmptyAvailability());
  byId("producer_hasHelper").checked = !!prod.helper?.exists;
  byId("producer_helperName").value = prod.helper?.name || "";
  byId("producer_helperAge").value = prod.helper?.age || "";
  byId("producer_helperGender").value = prod.helper?.gender || "";
  byId("producer_helperSpecies").value = prod.helper?.species || "";
  byId("producer_helperSince").value = prod.helper?.since || "";
  byId("producer_helperServices").value = prod.helper?.services || "";
  byId("producer_helperIsVet").value = prod.helper?.isVet || "";
  byId("producer_helperAdvice").value = prod.helper?.advice || "";
  byId("producer_traditionalUse").checked = !!prod.traditional?.use;
  byId("producer_traditionalHow").value = prod.traditional?.how || "";
  byId("producer_traditionalAnimals").value = prod.traditional?.animals || "";
  setMultiSelect(byId("producer_programs"), prod.programs || []);
  byId("producer_environment").value = prod.environment || "";
  byId("producer_water").value = prod.water || "";
  byId("producer_localKnowledge").checked = !!prod.localKnowledge?.enabled;
  byId("producer_knowledgeSpecific").value = prod.localKnowledge?.specific || "";
  byId("producer_knowledgeTeacher").value = prod.localKnowledge?.teacher || "";
  byId("producer_knowledgeUsage").value = prod.localKnowledge?.usage || "";
  byId("producer_hasSheepGoats").checked = !!prod.sheepGoats?.hasNow;
  byId("producer_hadSheepGoats").value = prod.sheepGoats?.hadBefore || "";
  byId("producer_noSheepReason").value = prod.sheepGoats?.noReason || "";
  byId("producer_noSheepReasonOther").value = prod.sheepGoats?.noReasonOther || "";
  byId("producer_hasBirds").checked = !!prod.birds?.hasNow;
  byId("producer_birdsInterest").value = prod.birds?.interest || "";
  byId("producer_notes").value = prod.notes || "";
  state.mediaDrafts.producerPhoto = prod.photo || null;
  renderThumbs("producerPhotoPreview", prod.photo, () => { state.mediaDrafts.producerPhoto = null; renderThumbs("producerPhotoPreview", null, null); });
  toggleProducerConditionals();
  tabSwitch("productores");
}
function renderProducerList() {
  const term = byId("producerSearch").value.toLowerCase();
  const list = state.producers.filter(p => [p.name, p.locality, p.municipality].join(" ").toLowerCase().includes(term));
  byId("producerList").innerHTML = list.map(prod => `
    <div class="list-item">
      <h4>${escapeHtml(prod.name || "Sin nombre")}</h4>
      <div class="meta">${escapeHtml([prod.locality, prod.municipality, prod.state].filter(Boolean).join(", "))}</div>
      <div class="meta">Animales relacionados: ${state.animals.filter(a => a.producerId === prod.id).length}</div>
      <div class="actions">
        <button class="btn ghost" data-edit-producer="${prod.id}">Editar</button>
        <button class="btn ghost" data-word-producer="${prod.id}">Word</button>
        <button class="btn bad" data-delete-producer="${prod.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="list-item">No hay productores registrados.</div>';
}
function readAnimalForm() {
  return {
    id: state.editing.animalId || uid("animal"),
    producerId: byId("animal_producer").value,
    name: byId("animal_name").value.trim(),
    species: byId("animal_species").value,
    speciesOther: byId("animal_speciesOther").value,
    sex: byId("animal_sex").value,
    age: byId("animal_age").value,
    stage: byId("animal_stage").value,
    role: byId("animal_role").value,
    status: byId("animal_status").value,
    notes: byId("animal_notes").value,
    photo: state.mediaDrafts.animalPhoto,
    createdAt: new Date().toISOString()
  };
}
function resetAnimalForm() {
  byId("animalForm").reset();
  state.editing.animalId = null;
  state.mediaDrafts.animalPhoto = null;
  byId("animalFormTitle").textContent = "Nuevo animal";
  renderThumbs("animalPhotoPreview", null, null);
  toggleAnimalConditionals();
}
function populateAnimalForm(item) {
  state.editing.animalId = item.id;
  byId("animalFormTitle").textContent = `Editar animal: ${item.name}`;
  byId("animal_producer").value = item.producerId || "";
  byId("animal_name").value = item.name || "";
  byId("animal_species").value = item.species || "";
  byId("animal_speciesOther").value = item.speciesOther || "";
  byId("animal_sex").value = item.sex || "";
  byId("animal_age").value = item.age || "";
  byId("animal_stage").value = item.stage || "";
  byId("animal_role").value = item.role || "";
  byId("animal_status").value = item.status || "";
  byId("animal_notes").value = item.notes || "";
  state.mediaDrafts.animalPhoto = item.photo || null;
  renderThumbs("animalPhotoPreview", item.photo, () => { state.mediaDrafts.animalPhoto = null; renderThumbs("animalPhotoPreview", null, null); });
  toggleAnimalConditionals();
  tabSwitch("animales");
}
function renderAnimalList() {
  const term = byId("animalSearch").value.toLowerCase();
  byId("animalList").innerHTML = state.animals.filter(a => [a.name, a.species, getProducer(a.producerId)?.name || ""].join(" ").toLowerCase().includes(term)).map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.name)}</h4>
      <div class="meta">${escapeHtml(item.species === "Otro" ? item.speciesOther : item.species)} · ${escapeHtml(getProducer(item.producerId)?.name || "Sin productor")}</div>
      <div class="actions">
        <button class="btn ghost" data-edit-animal="${item.id}">Editar</button>
        <button class="btn bad" data-delete-animal="${item.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="list-item">No hay animales registrados.</div>';
}
function readMedicationForm() {
  const stock = num(byId("med_stock").value);
  const totalCost = num(byId("med_totalCost").value);
  const unitCost = num(byId("med_unitCost").value) || (stock > 0 ? totalCost / stock : 0);
  return {
    id: state.editing.medicationId || uid("med"),
    name: byId("med_name").value.trim(),
    category: byId("med_category").value,
    presentation: byId("med_presentation").value,
    stock,
    unit: byId("med_unit").value,
    totalCost,
    unitCost,
    owner: byId("med_owner").value,
    ownerOther: byId("med_ownerOther").value,
    notes: byId("med_notes").value,
    photo: state.mediaDrafts.medicationPhoto,
    createdAt: new Date().toISOString()
  };
}
function resetMedicationForm() {
  byId("medForm").reset();
  state.editing.medicationId = null;
  state.mediaDrafts.medicationPhoto = null;
  byId("medFormTitle").textContent = "Nuevo medicamento";
  renderThumbs("medPhotoPreview", null, null);
  toggleMedicationOwnerOther();
}
function populateMedicationForm(item) {
  state.editing.medicationId = item.id;
  byId("medFormTitle").textContent = `Editar medicamento: ${item.name}`;
  ["name","category","presentation","stock","unit","totalCost","unitCost","owner","ownerOther","notes"].forEach(key => {
    const map = { name: "med_name", category: "med_category", presentation: "med_presentation", stock: "med_stock", unit: "med_unit", totalCost: "med_totalCost", unitCost: "med_unitCost", owner: "med_owner", ownerOther: "med_ownerOther", notes: "med_notes" };
    byId(map[key]).value = item[key] ?? "";
  });
  state.mediaDrafts.medicationPhoto = item.photo || null;
  renderThumbs("medPhotoPreview", item.photo, () => { state.mediaDrafts.medicationPhoto = null; renderThumbs("medPhotoPreview", null, null); });
  toggleMedicationOwnerOther();
  tabSwitch("medicamentos");
}
function renderMedicationList() {
  const term = byId("medSearch").value.toLowerCase();
  byId("medList").innerHTML = state.medications.filter(m => [m.name, m.category].join(" ").toLowerCase().includes(term)).map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.name)}</h4>
      <div class="meta">Stock: ${item.stock} ${escapeHtml(item.unit)} · ${money(item.unitCost)} por unidad</div>
      <div class="meta">Pertenencia: ${escapeHtml(item.owner === "Otro" ? item.ownerOther : item.owner)}</div>
      <div class="actions">
        <button class="btn ghost" data-edit-med="${item.id}">Editar</button>
        <button class="btn bad" data-delete-med="${item.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="list-item">No hay medicamentos.</div>';
}
function readVaccineForm() {
  const stock = num(byId("vaccine_stock").value);
  const totalCost = num(byId("vaccine_totalCost").value);
  return {
    id: state.editing.vaccineId || uid("vac"),
    name: byId("vaccine_name").value.trim(),
    batch: byId("vaccine_batch").value,
    expiry: byId("vaccine_expiry").value,
    stock,
    unit: byId("vaccine_unit").value,
    totalCost,
    unitCost: stock > 0 ? totalCost / stock : 0,
    notes: byId("vaccine_notes").value,
    photo: state.mediaDrafts.vaccinePhoto,
    createdAt: new Date().toISOString()
  };
}
function resetVaccineForm() {
  byId("vaccineForm").reset();
  state.editing.vaccineId = null;
  state.mediaDrafts.vaccinePhoto = null;
  byId("vaccineFormTitle").textContent = "Nueva vacuna";
  renderThumbs("vaccinePhotoPreview", null, null);
}
function populateVaccineForm(item) {
  state.editing.vaccineId = item.id;
  byId("vaccineFormTitle").textContent = `Editar vacuna: ${item.name}`;
  ["name","batch","expiry","stock","unit","totalCost","notes"].forEach(key => {
    const ids = { name: "vaccine_name", batch: "vaccine_batch", expiry: "vaccine_expiry", stock: "vaccine_stock", unit: "vaccine_unit", totalCost: "vaccine_totalCost", notes: "vaccine_notes" };
    byId(ids[key]).value = item[key] ?? "";
  });
  state.mediaDrafts.vaccinePhoto = item.photo || null;
  renderThumbs("vaccinePhotoPreview", item.photo, () => { state.mediaDrafts.vaccinePhoto = null; renderThumbs("vaccinePhotoPreview", null, null); });
  tabSwitch("vacunas");
}
function renderVaccineList() {
  const term = byId("vaccineSearch").value.toLowerCase();
  byId("vaccineList").innerHTML = state.vaccines.filter(v => [v.name, v.batch].join(" ").toLowerCase().includes(term)).map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.name)}</h4>
      <div class="meta">Dosis disponibles: ${item.stock} ${escapeHtml(item.unit)} · Lote ${escapeHtml(item.batch)}</div>
      <div class="actions">
        <button class="btn ghost" data-edit-vaccine="${item.id}">Editar</button>
        <button class="btn bad" data-delete-vaccine="${item.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="list-item">No hay vacunas.</div>';
}
function readSupplyForm() {
  return {
    id: state.editing.supplyId || uid("sup"),
    name: byId("supply_name").value.trim(),
    type: byId("supply_type").value,
    stock: num(byId("supply_stock").value),
    unit: byId("supply_unit").value,
    unitCost: num(byId("supply_unitCost").value),
    useCost: num(byId("supply_useCost").value),
    lifeYears: num(byId("supply_lifeYears").value),
    notes: byId("supply_notes").value,
    createdAt: new Date().toISOString()
  };
}
function resetSupplyForm() {
  byId("supplyForm").reset();
  state.editing.supplyId = null;
  byId("supplyFormTitle").textContent = "Nuevo insumo";
  byId("supply_type").value = "Desechable";
  toggleSupplyConditionals();
}
function populateSupplyForm(item) {
  state.editing.supplyId = item.id;
  byId("supplyFormTitle").textContent = `Editar insumo: ${item.name}`;
  byId("supply_name").value = item.name || "";
  byId("supply_type").value = item.type || "Desechable";
  byId("supply_stock").value = item.stock ?? "";
  byId("supply_unit").value = item.unit || "";
  byId("supply_unitCost").value = item.unitCost ?? "";
  byId("supply_useCost").value = item.useCost ?? "";
  byId("supply_lifeYears").value = item.lifeYears ?? "";
  byId("supply_notes").value = item.notes || "";
  toggleSupplyConditionals();
  tabSwitch("insumos");
}
function renderSupplyList() {
  const term = byId("supplySearch").value.toLowerCase();
  byId("supplyList").innerHTML = state.supplies.filter(s => [s.name, s.type].join(" ").toLowerCase().includes(term)).map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.name)}</h4>
      <div class="meta">${escapeHtml(item.type)} · ${item.stock} ${escapeHtml(item.unit)} ${item.type === "No desechable" ? `· vida útil ${item.lifeYears || 0} años` : ""}</div>
      <div class="actions">
        <button class="btn ghost" data-edit-supply="${item.id}">Editar</button>
        <button class="btn bad" data-delete-supply="${item.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="list-item">No hay insumos.</div>';
}
function readLabForm() {
  return {
    id: state.editing.labId || uid("lab"),
    type: byId("lab_type").value.trim(),
    date: byId("lab_date").value,
    producerId: byId("lab_producer").value,
    animalId: byId("lab_animal").value,
    procedureId: byId("lab_procedure").value,
    result: byId("lab_result").value,
    interpretation: byId("lab_interpretation").value,
    observations: byId("lab_observations").value,
    file: state.mediaDrafts.labFile,
    createdAt: new Date().toISOString()
  };
}
function resetLabForm() {
  byId("labForm").reset();
  state.editing.labId = null;
  state.mediaDrafts.labFile = null;
  byId("labFormTitle").textContent = "Nueva prueba de laboratorio";
  renderThumbs("labFilePreview", null, null);
  fillAnimalSelects(byId("lab_producer").value, "lab_animal");
  fillProcedureSelects();
}
function populateLabForm(item) {
  state.editing.labId = item.id;
  byId("labFormTitle").textContent = `Editar prueba: ${item.type}`;
  byId("lab_type").value = item.type || "";
  byId("lab_date").value = item.date || "";
  byId("lab_producer").value = item.producerId || "";
  fillAnimalSelects(item.producerId, "lab_animal");
  byId("lab_animal").value = item.animalId || "";
  fillProcedureSelects();
  byId("lab_procedure").value = item.procedureId || "";
  byId("lab_result").value = item.result || "";
  byId("lab_interpretation").value = item.interpretation || "";
  byId("lab_observations").value = item.observations || "";
  state.mediaDrafts.labFile = item.file || null;
  renderThumbs("labFilePreview", item.file, () => { state.mediaDrafts.labFile = null; renderThumbs("labFilePreview", null, null); });
  tabSwitch("laboratorio");
}
function renderLabList() {
  const term = byId("labSearch").value.toLowerCase();
  byId("labList").innerHTML = state.labTests.filter(l => [l.type, l.result, getProducer(l.producerId)?.name || ""].join(" ").toLowerCase().includes(term)).map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.type)}</h4>
      <div class="meta">${escapeHtml(item.date || "sin fecha")} · ${escapeHtml(getAnimal(item.animalId)?.name || "sin animal")}</div>
      <div class="meta">Vinculada a: ${escapeHtml(getProcedure(item.procedureId)?.type || "ningún procedimiento")}</div>
      <div class="actions">
        <button class="btn ghost" data-edit-lab="${item.id}">Editar</button>
        <button class="btn bad" data-delete-lab="${item.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="list-item">No hay pruebas de laboratorio.</div>';
}
function updateProcedureCharge() {
  const base = num(byId("proc_chargeBase").value);
  const meds = collectInventoryRows("procMedRows", "medication");
  const vaccines = collectInventoryRows("procVaccineRows", "vaccine");
  const disposables = collectInventoryRows("procDisposableRows", "disposable");
  const reusables = collectInventoryRows("procReusableRows", "reusable");
  const medsCost = meds.reduce((sum, row) => {
    const med = state.medications.find(m => m.id === row.itemId);
    return sum + (med ? row.qty * num(med.unitCost) : 0);
  }, 0);
  const vaccinesCost = vaccines.reduce((sum, row) => {
    const item = state.vaccines.find(v => v.id === row.itemId);
    return sum + (item ? row.qty * num(item.unitCost) : 0);
  }, 0);
  const disposablesCost = disposables.reduce((sum, row) => {
    const item = state.supplies.find(s => s.id === row.itemId);
    return sum + (item ? row.qty * num(item.unitCost) : 0);
  }, 0);
  const reusablesCost = reusables.reduce((sum, row) => {
    const item = state.supplies.find(s => s.id === row.itemId);
    return sum + (item ? row.qty * num(item.useCost) : 0);
  }, 0);
  const total = base + medsCost + vaccinesCost + disposablesCost + reusablesCost;
  byId("proc_chargeAuto").value = total.toFixed(2);
  byId("proc_chargeSummary").value = `Base: ${money(base)} | Medicamentos: ${money(medsCost)} | Vacunas: ${money(vaccinesCost)} | Desechables: ${money(disposablesCost)} | No desechables: ${money(reusablesCost)} | Total: ${money(total)}`;
}
function readProcedureForm() {
  const type = byId("proc_type").value;
  const animalIds = Array.from(byId("proc_animals").selectedOptions).map(o => o.value);
  return {
    id: state.editing.procedureId || uid("proc"),
    date: byId("proc_date").value,
    type,
    producerId: byId("proc_producer").value,
    mode: byId("proc_mode").value,
    animalIds,
    animalCount: num(byId("proc_animalCount").value),
    modules: {
      preventive: {
        actions: byId("proc_preventiveActions").value,
        recommendations: byId("proc_preventiveRecommendations").value,
        followup: byId("proc_preventiveFollowup").value
      },
      clinicalCare: {
        evaluation: byId("proc_careEvaluation").value,
        intervention: byId("proc_careIntervention").value,
        plan: byId("proc_carePlan").value,
        recommendations: byId("proc_careRecommendations").value,
        followup: byId("proc_careFollowup").value,
        observations: byId("proc_careObservations").value
      },
      surgery: {
        pre: byId("proc_surgeryPre").value,
        performed: byId("proc_surgeryPerformed").value,
        anesthesia: byId("proc_surgeryAnesthesia").value,
        findings: byId("proc_surgeryFindings").value,
        complications: byId("proc_surgeryComplications").value,
        post: byId("proc_surgeryPost").value,
        prognosis: byId("proc_surgeryPrognosis").value,
        followup: byId("proc_surgeryFollowup").value
      },
      clinicalCase: {
        reason: byId("proc_caseReason").value,
        anamnesis: byId("proc_caseAnamnesis").value,
        problems: byId("proc_caseProblems").value,
        exam: byId("proc_caseExam").value,
        findings: byId("proc_caseFindings").value,
        differentials: byId("proc_caseDifferentials").value,
        diagnostics: byId("proc_caseDiagnostics").value,
        presumptive: byId("proc_casePresumptive").value,
        treatment: byId("proc_caseTreatment").value,
        followup: byId("proc_caseFollowup").value,
        evolution: byId("proc_caseEvolution").value,
        definitive: byId("proc_caseDefinitive").value,
        prognosis: byId("proc_casePrognosis").value,
        recommendations: byId("proc_caseRecommendations").value
      },
      necropsy: {
        identification: byId("proc_necropsyIdentification").value,
        findings: byId("proc_necropsyFindings").value,
        systems: byId("proc_necropsySystems").value,
        morph: byId("proc_necropsyMorph").value,
        final: byId("proc_necropsyFinal").value,
        comments: byId("proc_necropsyComments").value,
        references: byId("proc_necropsyReferences").value,
        chargeNotes: byId("proc_necropsyChargeNotes").value
      }
    },
    labLinks: Array.from(byId("proc_labLinks").selectedOptions).map(o => o.value),
    inventory: {
      medications: collectInventoryRows("procMedRows", "medication"),
      vaccines: collectInventoryRows("procVaccineRows", "vaccine"),
      disposables: collectInventoryRows("procDisposableRows", "disposable"),
      reusables: collectInventoryRows("procReusableRows", "reusable")
    },
    charge: {
      base: num(byId("proc_chargeBase").value),
      auto: num(byId("proc_chargeAuto").value),
      final: num(byId("proc_chargeFinal").value),
      reason: byId("proc_chargeReason").value,
      summary: byId("proc_chargeSummary").value,
      photo: state.mediaDrafts.procedureChargePhoto
    },
    photos: deepClone(state.mediaDrafts.procedurePhotos),
    createdAt: new Date().toISOString()
  };
}
function resetProcedureForm() {
  byId("procedureForm").reset();
  state.editing.procedureId = null;
  state.mediaDrafts.procedureChargePhoto = null;
  state.mediaDrafts.procedurePhotos = [];
  byId("procedureFormTitle").textContent = "Nuevo procedimiento";
  byId("proc_date").valueAsDate = new Date();
  [
    ["procMedRows", "medication"],
    ["procVaccineRows", "vaccine"],
    ["procDisposableRows", "disposable"],
    ["procReusableRows", "reusable"]
  ].forEach(([id, kind]) => setInventoryRows(id, kind, []));
  renderThumbs("procChargePreview", null, null);
  renderThumbs("procPhotoPreview", [], null);
  renderProcedureModules();
  updateProcedureAnimalSelect();
  updateProcedureCharge();
}
function populateProcedureForm(proc) {
  state.editing.procedureId = proc.id;
  byId("procedureFormTitle").textContent = `Editar procedimiento: ${proc.type}`;
  byId("proc_date").value = proc.date || "";
  byId("proc_type").value = proc.type || "";
  byId("proc_producer").value = proc.producerId || "";
  updateProcedureAnimalSelect();
  byId("proc_mode").value = proc.mode || "individual";
  setMultiSelect(byId("proc_animals"), proc.animalIds || []);
  byId("proc_animalCount").value = proc.animalCount || 1;
  const m = proc.modules || {};
  byId("proc_preventiveActions").value = m.preventive?.actions || "";
  byId("proc_preventiveRecommendations").value = m.preventive?.recommendations || "";
  byId("proc_preventiveFollowup").value = m.preventive?.followup || "";
  byId("proc_careEvaluation").value = m.clinicalCare?.evaluation || "";
  byId("proc_careIntervention").value = m.clinicalCare?.intervention || "";
  byId("proc_carePlan").value = m.clinicalCare?.plan || "";
  byId("proc_careRecommendations").value = m.clinicalCare?.recommendations || "";
  byId("proc_careFollowup").value = m.clinicalCare?.followup || "";
  byId("proc_careObservations").value = m.clinicalCare?.observations || "";
  byId("proc_surgeryPre").value = m.surgery?.pre || "";
  byId("proc_surgeryPerformed").value = m.surgery?.performed || "";
  byId("proc_surgeryAnesthesia").value = m.surgery?.anesthesia || "";
  byId("proc_surgeryFindings").value = m.surgery?.findings || "";
  byId("proc_surgeryComplications").value = m.surgery?.complications || "";
  byId("proc_surgeryPost").value = m.surgery?.post || "";
  byId("proc_surgeryPrognosis").value = m.surgery?.prognosis || "";
  byId("proc_surgeryFollowup").value = m.surgery?.followup || "";
  byId("proc_caseReason").value = m.clinicalCase?.reason || "";
  byId("proc_caseAnamnesis").value = m.clinicalCase?.anamnesis || "";
  byId("proc_caseProblems").value = m.clinicalCase?.problems || "";
  byId("proc_caseExam").value = m.clinicalCase?.exam || "";
  byId("proc_caseFindings").value = m.clinicalCase?.findings || "";
  byId("proc_caseDifferentials").value = m.clinicalCase?.differentials || "";
  byId("proc_caseDiagnostics").value = m.clinicalCase?.diagnostics || "";
  byId("proc_casePresumptive").value = m.clinicalCase?.presumptive || "";
  byId("proc_caseTreatment").value = m.clinicalCase?.treatment || "";
  byId("proc_caseFollowup").value = m.clinicalCase?.followup || "";
  byId("proc_caseEvolution").value = m.clinicalCase?.evolution || "";
  byId("proc_caseDefinitive").value = m.clinicalCase?.definitive || "";
  byId("proc_casePrognosis").value = m.clinicalCase?.prognosis || "";
  byId("proc_caseRecommendations").value = m.clinicalCase?.recommendations || "";
  byId("proc_necropsyIdentification").value = m.necropsy?.identification || "";
  byId("proc_necropsyFindings").value = m.necropsy?.findings || "";
  byId("proc_necropsySystems").value = m.necropsy?.systems || "";
  byId("proc_necropsyMorph").value = m.necropsy?.morph || "";
  byId("proc_necropsyFinal").value = m.necropsy?.final || "";
  byId("proc_necropsyComments").value = m.necropsy?.comments || "";
  byId("proc_necropsyReferences").value = m.necropsy?.references || "";
  byId("proc_necropsyChargeNotes").value = m.necropsy?.chargeNotes || "";
  fillProcedureSelects();
  setMultiSelect(byId("proc_labLinks"), proc.labLinks || []);
  setInventoryRows("procMedRows", "medication", proc.inventory?.medications || []);
  setInventoryRows("procVaccineRows", "vaccine", proc.inventory?.vaccines || []);
  setInventoryRows("procDisposableRows", "disposable", proc.inventory?.disposables || []);
  setInventoryRows("procReusableRows", "reusable", proc.inventory?.reusables || []);
  byId("proc_chargeBase").value = proc.charge?.base ?? 0;
  byId("proc_chargeAuto").value = proc.charge?.auto ?? 0;
  byId("proc_chargeFinal").value = proc.charge?.final ?? 0;
  byId("proc_chargeReason").value = proc.charge?.reason || "";
  byId("proc_chargeSummary").value = proc.charge?.summary || "";
  state.mediaDrafts.procedureChargePhoto = proc.charge?.photo || null;
  state.mediaDrafts.procedurePhotos = deepClone(proc.photos || []);
  renderThumbs("procChargePreview", proc.charge?.photo, () => { state.mediaDrafts.procedureChargePhoto = null; renderThumbs("procChargePreview", null, null); });
  renderProcedurePhotoDrafts();
  renderProcedureModules();
  updateProcedureCharge();
  tabSwitch("procedimientos");
}
function renderProcedureList() {
  const term = byId("procSearch").value.toLowerCase();
  byId("procedureList").innerHTML = state.procedures.filter(p => [p.type, getProducer(p.producerId)?.name || "", p.date].join(" ").toLowerCase().includes(term)).map(item => `
    <div class="list-item">
      <h4>${escapeHtml(item.type)}</h4>
      <div class="meta">${escapeHtml(item.date)} · ${escapeHtml(getProducer(item.producerId)?.name || "Sin productor")}</div>
      <div class="meta">Monto final: ${money(item.charge?.final)}</div>
      <div class="actions">
        <button class="btn ghost" data-edit-proc="${item.id}">Editar</button>
        <button class="btn ghost" data-word-proc="${item.id}">Word</button>
        <button class="btn bad" data-delete-proc="${item.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || '<div class="list-item">No hay procedimientos.</div>';
}
function adjustInventoryForProcedure(proc, reverse = false) {
  const factor = reverse ? -1 : 1;
  const adjust = (collection, type) => collection.forEach(row => {
    if (!row.itemId) return;
    const list = type === "medication" ? state.medications : type === "vaccine" ? state.vaccines : state.supplies;
    const item = list.find(x => x.id === row.itemId);
    if (!item) return;
    if (type === "reusable") return;
    item.stock = num(item.stock) - factor * num(row.qty);
  });
  adjust(proc.inventory?.medications || [], "medication");
  adjust(proc.inventory?.vaccines || [], "vaccine");
  adjust(proc.inventory?.disposables || [], "disposable");
}
function validateProcedureInventory(proc) {
  const checks = [];
  (proc.inventory.medications || []).forEach(row => {
    const item = state.medications.find(m => m.id === row.itemId);
    if (!item || row.qty > num(item.stock)) checks.push(`Medicamento insuficiente: ${item?.name || row.itemId}`);
  });
  (proc.inventory.vaccines || []).forEach(row => {
    const item = state.vaccines.find(v => v.id === row.itemId);
    if (!item || row.qty > num(item.stock)) checks.push(`Vacuna insuficiente: ${item?.name || row.itemId}`);
  });
  (proc.inventory.disposables || []).forEach(row => {
    const item = state.supplies.find(s => s.id === row.itemId);
    if (!item || row.qty > num(item.stock)) checks.push(`Insumo desechable insuficiente: ${item?.name || row.itemId}`);
  });
  return checks;
}
function renderProcedurePhotoDrafts() {
  renderThumbs("procPhotoPreview", state.mediaDrafts.procedurePhotos, idx => {
    state.mediaDrafts.procedurePhotos.splice(idx, 1);
    renderProcedurePhotoDrafts();
  });
}
function medPromptTemplate() {
  return JSON.stringify({
    nombre: "Nombre del medicamento",
    categoria: "Antibiótico / antiinflamatorio / etc.",
    presentacion: "Frasco 100 ml",
    cantidadDisponible: 10,
    unidad: "ml",
    costoTotal: 100,
    costoUnitario: 10,
    pertenencia: "Dra. Ana Rosa / Servicios / Otro",
    notas: "Notas útiles"
  }, null, 2);
}
function renderMedMode() {
  const chat = state.ui.medMode === "CHATGPT";
  byId("medChatBlock").classList.toggle("hidden", !chat);
  byId("med_chatPrompt").value = medPromptTemplate();
}
function rerenderAll() {
  fillProducerSelects();
  fillAnimalSelects(byId("lab_producer").value, "lab_animal");
  fillProcedureSelects();
  updateProcedureAnimalSelect();
  renderProducerList();
  renderAnimalList();
  renderMedicationList();
  renderVaccineList();
  renderSupplyList();
  renderLabList();
  renderProcedureList();
  renderDashboard();
  saveState();
}
function bindEvents() {
  $$(".tab").forEach(btn => btn.addEventListener("click", () => tabSwitch(btn.dataset.tab)));
  ["producer_animalFunction", "producer_hasHelper", "producer_helperIsVet", "producer_traditionalUse", "producer_localKnowledge", "producer_hasSheepGoats", "producer_noSheepReason", "producer_hasBirds"].forEach(id => byId(id).addEventListener("change", toggleProducerConditionals));
  ["animal_species", "animal_producer"].forEach(id => byId(id).addEventListener("change", toggleAnimalConditionals));
  byId("med_owner").addEventListener("change", toggleMedicationOwnerOther);
  byId("supply_type").addEventListener("change", toggleSupplyConditionals);
  byId("lab_producer").addEventListener("change", () => fillAnimalSelects(byId("lab_producer").value, "lab_animal"));
  byId("proc_producer").addEventListener("change", updateProcedureAnimalSelect);
  byId("proc_type").addEventListener("change", renderProcedureModules);
  byId("proc_mode").addEventListener("change", validateProcedureCount);
  byId("proc_animals").addEventListener("change", validateProcedureCount);
  byId("proc_animalCount").addEventListener("input", validateProcedureCount);
  ["proc_chargeBase", "proc_chargeFinal"].forEach(id => byId(id).addEventListener("input", updateProcedureCharge));

  byId("producerForm").addEventListener("submit", e => {
    e.preventDefault();
    const prod = readProducerForm();
    if (!prod.name) return alert("El nombre del productor(a) es obligatorio.");
    removeById("producer", prod.id);
    state.producers.unshift(prod);
    resetProducerForm();
    rerenderAll();
  });
  byId("animalForm").addEventListener("submit", e => {
    e.preventDefault();
    const animal = readAnimalForm();
    if (!animal.producerId) return alert("Selecciona un productor(a) registrado(a).");
    if (!animal.name || !animal.species) return alert("Captura nombre y especie del animal.");
    removeById("animal", animal.id);
    state.animals.unshift(animal);
    resetAnimalForm();
    rerenderAll();
  });
  byId("medForm").addEventListener("submit", e => {
    e.preventDefault();
    const med = readMedicationForm();
    if (!med.name) return alert("Nombre del medicamento obligatorio.");
    removeById("medication", med.id);
    state.medications.unshift(med);
    resetMedicationForm();
    rerenderAll();
  });
  byId("vaccineForm").addEventListener("submit", e => {
    e.preventDefault();
    const item = readVaccineForm();
    if (!item.name) return alert("Nombre de vacuna obligatorio.");
    removeById("vaccine", item.id);
    state.vaccines.unshift(item);
    resetVaccineForm();
    rerenderAll();
  });
  byId("supplyForm").addEventListener("submit", e => {
    e.preventDefault();
    const item = readSupplyForm();
    if (!item.name) return alert("Nombre del insumo obligatorio.");
    removeById("supply", item.id);
    state.supplies.unshift(item);
    resetSupplyForm();
    rerenderAll();
  });
  byId("labForm").addEventListener("submit", e => {
    e.preventDefault();
    const item = readLabForm();
    if (!item.type) return alert("Tipo de prueba obligatorio.");
    removeById("lab", item.id);
    state.labTests.unshift(item);
    resetLabForm();
    rerenderAll();
  });
  byId("procedureForm").addEventListener("submit", e => {
    e.preventDefault();
    const proc = readProcedureForm();
    if (!proc.type || !proc.producerId) return alert("Tipo y productor(a) son obligatorios.");
    if (["Cirugía", "Caso clínico", "Necropsia"].includes(proc.type) && proc.animalIds.length !== 1) return alert("Ese procedimiento debe tener exactamente un animal.");
    if ((proc.mode === "grupal" || ["Medicina preventiva", "Atención clínica / zootécnica"].includes(proc.type)) && proc.animalCount > procedureAnimalsForCurrentProducer().length) return alert("La cantidad de animales supera los disponibles.");
    const errors = validateProcedureInventory(proc);
    if (errors.length) return alert(errors.join("\n"));
    const existing = findById("procedure", proc.id);
    if (existing) adjustInventoryForProcedure(existing, true);
    adjustInventoryForProcedure(proc, false);
    removeById("procedure", proc.id);
    state.procedures.unshift(proc);
    state.labTests.forEach(test => { if (proc.labLinks.includes(test.id)) test.procedureId = proc.id; });
    resetProcedureForm();
    rerenderAll();
  });

  [["producerResetBtn", resetProducerForm],["animalResetBtn", resetAnimalForm],["medResetBtn", resetMedicationForm],["vaccineResetBtn", resetVaccineForm],["supplyResetBtn", resetSupplyForm],["labResetBtn", resetLabForm],["procResetBtn", resetProcedureForm]].forEach(([id, fn]) => byId(id).addEventListener("click", fn));

  byId("producer_photo").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { state.mediaDrafts.producerPhoto = await fileToDataUrl(f); renderThumbs("producerPhotoPreview", state.mediaDrafts.producerPhoto, () => { state.mediaDrafts.producerPhoto = null; renderThumbs("producerPhotoPreview", null, null); }); } e.target.value = ""; });
  byId("producer_photo_remove").addEventListener("click", () => { state.mediaDrafts.producerPhoto = null; renderThumbs("producerPhotoPreview", null, null); });
  byId("animal_photo").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { state.mediaDrafts.animalPhoto = await fileToDataUrl(f); renderThumbs("animalPhotoPreview", state.mediaDrafts.animalPhoto, () => { state.mediaDrafts.animalPhoto = null; renderThumbs("animalPhotoPreview", null, null); }); } e.target.value = ""; });
  byId("animal_photo_remove").addEventListener("click", () => { state.mediaDrafts.animalPhoto = null; renderThumbs("animalPhotoPreview", null, null); });
  byId("med_photo").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { state.mediaDrafts.medicationPhoto = await fileToDataUrl(f); renderThumbs("medPhotoPreview", state.mediaDrafts.medicationPhoto, () => { state.mediaDrafts.medicationPhoto = null; renderThumbs("medPhotoPreview", null, null); }); } e.target.value = ""; });
  byId("medPhotoRemove").addEventListener("click", () => { state.mediaDrafts.medicationPhoto = null; renderThumbs("medPhotoPreview", null, null); });
  byId("vaccine_photo").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { state.mediaDrafts.vaccinePhoto = await fileToDataUrl(f); renderThumbs("vaccinePhotoPreview", state.mediaDrafts.vaccinePhoto, () => { state.mediaDrafts.vaccinePhoto = null; renderThumbs("vaccinePhotoPreview", null, null); }); } e.target.value = ""; });
  byId("vaccinePhotoRemove").addEventListener("click", () => { state.mediaDrafts.vaccinePhoto = null; renderThumbs("vaccinePhotoPreview", null, null); });
  byId("lab_file").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { state.mediaDrafts.labFile = await fileToDataUrl(f); renderThumbs("labFilePreview", state.mediaDrafts.labFile, () => { state.mediaDrafts.labFile = null; renderThumbs("labFilePreview", null, null); }); } e.target.value = ""; });
  byId("labFileRemove").addEventListener("click", () => { state.mediaDrafts.labFile = null; renderThumbs("labFilePreview", null, null); });
  byId("proc_chargePhoto").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { state.mediaDrafts.procedureChargePhoto = await fileToDataUrl(f); renderThumbs("procChargePreview", state.mediaDrafts.procedureChargePhoto, () => { state.mediaDrafts.procedureChargePhoto = null; renderThumbs("procChargePreview", null, null); }); } e.target.value = ""; });
  byId("procChargePhotoRemove").addEventListener("click", () => { state.mediaDrafts.procedureChargePhoto = null; renderThumbs("procChargePreview", null, null); });
  byId("proc_casePhotos").addEventListener("change", async e => {
    const files = Array.from(e.target.files || []);
    for (const file of files) state.mediaDrafts.procedurePhotos.push(await fileToDataUrl(file));
    renderProcedurePhotoDrafts();
    e.target.value = "";
  });
  byId("procPhotosClear").addEventListener("click", () => { state.mediaDrafts.procedurePhotos = []; renderProcedurePhotoDrafts(); });

  byId("producerUseLocation").addEventListener("click", () => {
    if (!navigator.geolocation) return byId("producerGeoMsg").textContent = "Tu navegador no soporta geolocalización.";
    byId("producerGeoMsg").textContent = "Obteniendo ubicación...";
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude.toFixed(7);
      const lng = pos.coords.longitude.toFixed(7);
      byId("producer_lat").value = lat;
      byId("producer_lng").value = lng;
      byId("producer_mapsUrl").value = `https://www.google.com/maps?q=${lat},${lng}`;
      byId("producerGeoMsg").textContent = `Ubicación capturada correctamente: ${lat}, ${lng}`;
    }, err => {
      byId("producerGeoMsg").textContent = `No fue posible obtener la ubicación: ${err.message}`;
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
  byId("producerGenerateMaps").addEventListener("click", () => {
    const lat = byId("producer_lat").value;
    const lng = byId("producer_lng").value;
    if (!lat || !lng) return alert("Primero captura latitud y longitud.");
    byId("producer_mapsUrl").value = `https://www.google.com/maps?q=${lat},${lng}`;
    byId("producerGeoMsg").textContent = "Vínculo de Maps generado.";
  });
  byId("producerOpenMaps").addEventListener("click", () => {
    const url = byId("producer_mapsUrl").value || `https://www.google.com/maps?q=${byId("producer_lat").value},${byId("producer_lng").value}`;
    if (!url.includes("maps")) return alert("Primero genera o captura un vínculo Maps válido.");
    openExternal(url);
  });

  byId("medManualModeBtn").addEventListener("click", () => { state.ui.medMode = "MANUAL"; renderMedMode(); saveState(); });
  byId("medChatModeBtn").addEventListener("click", () => { state.ui.medMode = "CHATGPT"; renderMedMode(); saveState(); });
  byId("medCopyPromptBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(byId("med_chatPrompt").value);
    alert("Prompt copiado al portapapeles.");
  });
  byId("medOpenChatBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(byId("med_chatPrompt").value); } catch {}
    openExternal("https://chat.openai.com/");
  });
  byId("medApplyAiBtn").addEventListener("click", () => {
    try {
      const data = JSON.parse(byId("med_aiPaste").value);
      byId("med_name").value = data.nombre || "";
      byId("med_category").value = data.categoria || "";
      byId("med_presentation").value = data.presentacion || "";
      byId("med_stock").value = data.cantidadDisponible || "";
      byId("med_unit").value = data.unidad || "";
      byId("med_totalCost").value = data.costoTotal || "";
      byId("med_unitCost").value = data.costoUnitario || "";
      byId("med_owner").value = data.pertenencia || "";
      byId("med_notes").value = data.notas || "";
    } catch (err) { alert("JSON inválido pegado desde ChatGPT."); }
  });

  [["addProcMedRow","procMedRows","medication"],["addProcVaccineRow","procVaccineRows","vaccine"],["addProcDisposableRow","procDisposableRows","disposable"],["addProcReusableRow","procReusableRows","reusable"]].forEach(([btn, container, kind]) => byId(btn).addEventListener("click", () => { addInventoryRow(container, kind); updateProcedureCharge(); }));
  byId("procCreateLabShortcut").addEventListener("click", () => tabSwitch("laboratorio"));

  byId("producerExportWordBtn").addEventListener("click", () => exportProducerWord(state.editing.producerId ? findById("producer", state.editing.producerId) : null));
  byId("producerExportExcelBtn").addEventListener("click", () => exportCsv("productores.csv", [["ID","Nombre","Localidad","Municipio","Estado","Teléfono"], ...state.producers.map(p => [p.id,p.name,p.locality,p.municipality,p.state,p.phone])]));
  byId("animalExportExcelBtn").addEventListener("click", () => exportCsv("animales.csv", [["ID","Productor","Nombre","Especie","Sexo","Estado"], ...state.animals.map(a => [a.id,getProducer(a.producerId)?.name || "",a.name,a.species === "Otro" ? a.speciesOther : a.species,a.sex,a.status])]));
  byId("medExportExcelBtn").addEventListener("click", () => exportCsv("medicamentos.csv", [["ID","Nombre","Stock","Unidad","Costo unitario","Pertenencia"], ...state.medications.map(m => [m.id,m.name,m.stock,m.unit,m.unitCost,m.owner === "Otro" ? m.ownerOther : m.owner])]));
  byId("vaccineExportExcelBtn").addEventListener("click", () => exportCsv("vacunas.csv", [["ID","Nombre","Lote","Stock","Unidad","Costo unitario"], ...state.vaccines.map(v => [v.id,v.name,v.batch,v.stock,v.unit,v.unitCost])]));
  byId("supplyExportExcelBtn").addEventListener("click", () => exportCsv("insumos.csv", [["ID","Nombre","Tipo","Stock","Unidad","Vida útil años","Costo por uso"], ...state.supplies.map(s => [s.id,s.name,s.type,s.stock,s.unit,s.lifeYears,s.useCost])]));
  byId("labExportExcelBtn").addEventListener("click", () => exportCsv("laboratorio.csv", [["ID","Tipo","Fecha","Productor","Animal","Resultado","Procedimiento"], ...state.labTests.map(l => [l.id,l.type,l.date,getProducer(l.producerId)?.name || "",getAnimal(l.animalId)?.name || "",l.result,getProcedure(l.procedureId)?.type || ""]) ]));
  byId("procExportWordBtn").addEventListener("click", () => exportProcedureWord(state.editing.procedureId ? findById("procedure", state.editing.procedureId) : null));
  byId("procExportExcelBtn").addEventListener("click", () => exportCsv("procedimientos.csv", [["ID","Fecha","Tipo","Productor","Modalidad","Animales","Monto final"], ...state.procedures.map(p => [p.id,p.date,p.type,getProducer(p.producerId)?.name || "",p.mode,p.animalIds.map(id => getAnimal(id)?.name || "").join(" | "),p.charge.final])]));
  byId("exportAllWordBtn").addEventListener("click", exportAllWord);
  byId("exportAllExcelBtn").addEventListener("click", exportAllExcel);
  byId("backupBtn").addEventListener("click", backupJson);
  byId("restoreInput").addEventListener("change", async e => { const file = e.target.files[0]; if (file) await restoreJson(file); e.target.value = ""; });

  ["producerSearch","animalSearch","medSearch","vaccineSearch","supplySearch","labSearch","procSearch"].forEach(id => byId(id).addEventListener("input", rerenderAll));

  document.body.addEventListener("click", e => {
    const t = e.target;
    if (t.matches("[data-edit-producer]")) populateProducerForm(findById("producer", t.dataset.editProducer));
    if (t.matches("[data-word-producer]")) exportProducerWord(findById("producer", t.dataset.wordProducer));
    if (t.matches("[data-delete-producer]")) {
      const id = t.dataset.deleteProducer;
      if (confirm("Eliminar productor(a) y mantener animales/procedimientos vinculados bajo el mismo ID puede causar registros huérfanos. ¿Continuar?")) { removeById("producer", id); rerenderAll(); }
    }
    if (t.matches("[data-edit-animal]")) populateAnimalForm(findById("animal", t.dataset.editAnimal));
    if (t.matches("[data-delete-animal]")) { if (confirm("¿Eliminar animal?")) { removeById("animal", t.dataset.deleteAnimal); rerenderAll(); } }
    if (t.matches("[data-edit-med]")) populateMedicationForm(findById("medication", t.dataset.editMed));
    if (t.matches("[data-delete-med]")) { if (confirm("¿Eliminar medicamento?")) { removeById("medication", t.dataset.deleteMed); rerenderAll(); } }
    if (t.matches("[data-edit-vaccine]")) populateVaccineForm(findById("vaccine", t.dataset.editVaccine));
    if (t.matches("[data-delete-vaccine]")) { if (confirm("¿Eliminar vacuna?")) { removeById("vaccine", t.dataset.deleteVaccine); rerenderAll(); } }
    if (t.matches("[data-edit-supply]")) populateSupplyForm(findById("supply", t.dataset.editSupply));
    if (t.matches("[data-delete-supply]")) { if (confirm("¿Eliminar insumo?")) { removeById("supply", t.dataset.deleteSupply); rerenderAll(); } }
    if (t.matches("[data-edit-lab]")) populateLabForm(findById("lab", t.dataset.editLab));
    if (t.matches("[data-delete-lab]")) { if (confirm("¿Eliminar prueba?")) { removeById("lab", t.dataset.deleteLab); rerenderAll(); } }
    if (t.matches("[data-edit-proc]")) populateProcedureForm(findById("procedure", t.dataset.editProc));
    if (t.matches("[data-word-proc]")) exportProcedureWord(findById("procedure", t.dataset.wordProc));
    if (t.matches("[data-delete-proc]")) {
      const proc = findById("procedure", t.dataset.deleteProc);
      if (proc && confirm("¿Eliminar procedimiento y revertir descuentos de inventario?")) {
        adjustInventoryForProcedure(proc, true);
        removeById("procedure", proc.id);
        rerenderAll();
      }
    }
  });
}
function init() {
  buildAvailabilityGrid();
  initLegacyData();
  bindEvents();
  renderThumbs("producerPhotoPreview", null, null);
  renderThumbs("animalPhotoPreview", null, null);
  renderThumbs("medPhotoPreview", null, null);
  renderThumbs("vaccinePhotoPreview", null, null);
  renderThumbs("labFilePreview", null, null);
  renderThumbs("procChargePreview", null, null);
  renderProcedurePhotoDrafts();
  resetProcedureForm();
  resetProducerForm();
  resetAnimalForm();
  resetMedicationForm();
  resetVaccineForm();
  resetSupplyForm();
  resetLabForm();
  renderMedMode();
  toggleProducerConditionals();
  toggleAnimalConditionals();
  toggleMedicationOwnerOther();
  toggleSupplyConditionals();
  rerenderAll();
}

document.addEventListener("DOMContentLoaded", init);
