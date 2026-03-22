/* =========================================================
   APP RURAL · SCRIPT CONSOLIDADO Y FUNCIONAL
========================================================= */

const STORAGE_KEY = "app_rural_main_full_v5";

const state = {
  producers: [],
  meds: [],
  supplies: [],
  procedures: [],
  selectedProducerId: null,
  ui: {
    medMode: "MANUAL",
    supplyMode: "DISPOSABLE"
  },
  editing: {
    producerId: null,
    medId: null,
    supplyId: null,
    procedureId: null,
    animalId: null
  },
  media: {
    producerPhoto: null,
    animalTempPhotos: [],
    medRxPhoto: null,
    medTicketPhoto: null,
    supplyTicketPhoto: null,
    procedureCasePhotos: [],
    procedureNecropsyPhotos: [],
    procedureChargePhoto: null
  }
};

const animalDraft = {
  diseases: [],
  vaccines: [],
  dewormings: [],
  traditional: [],
  genderAnimals: [],
  genderActivities: []
};

const procedureDraft = {
  meds: [],
  vaccines: [],
  supplies: []
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowText() {
  return new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function money(v) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(Number(v || 0));
}

function safeText(v) {
  return v == null ? "" : String(v);
}

function escapeHtml(str) {
  return safeText(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(id, text, kind = "help") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.className = kind;
  el.style.display = text ? "block" : "none";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setThumb(id, dataUrl, emptyHtml = "Sin<br/>archivo") {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="preview" />` : `<span>${emptyHtml}</span>`;
}

function setMultiThumbs(previewId, files = [], empty = "Sin<br/>evidencia") {
  const el = document.getElementById(previewId);
  if (!el) return;
  if (!files.length) {
    el.innerHTML = `<div class="thumb"><span>${empty}</span></div>`;
    return;
  }
  el.innerHTML = files.map((img, index) => `
    <div class="preview-mini">
      <img src="${img}" alt="evidencia ${index + 1}" />
      <button class="mini-remove" type="button" data-index="${index}">✖</button>
    </div>
  `).join("");
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = safeText(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function downloadCSV(filename, rows) {
  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  downloadFile(filename, "\ufeff" + csv, "text/csv;charset=utf-8;");
}

function openUrl(url) {
  if (!url) return;
  const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  window.open(finalUrl, "_blank", "noopener,noreferrer");
}

function getCheckedRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function setCheckedRadio(name, value) {
  $$(`input[name="${name}"]`).forEach(input => {
    input.checked = input.value === value;
  });
}

function selectValues(selectEl) {
  return Array.from(selectEl?.selectedOptions || []).map(opt => opt.value);
}

function setSelectValues(selectEl, values = []) {
  Array.from(selectEl?.options || []).forEach(opt => {
    opt.selected = values.includes(opt.value);
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    producers: state.producers,
    meds: state.meds,
    supplies: state.supplies,
    procedures: state.procedures,
    selectedProducerId: state.selectedProducerId,
    ui: state.ui
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.producers = Array.isArray(parsed.producers) ? parsed.producers : [];
    state.meds = Array.isArray(parsed.meds) ? parsed.meds : [];
    state.supplies = Array.isArray(parsed.supplies) ? parsed.supplies : [];
    state.procedures = Array.isArray(parsed.procedures) ? parsed.procedures : [];
    state.selectedProducerId = parsed.selectedProducerId || state.producers[0]?.id || null;
    state.ui = {
      medMode: parsed.ui?.medMode || "MANUAL",
      supplyMode: parsed.ui?.supplyMode || "DISPOSABLE"
    };
  } catch (error) {
    console.error("No se pudo cargar el estado:", error);
  }
}

function getProducerById(id) {
  return state.producers.find(item => item.id === id) || null;
}

function getSelectedProducer() {
  return getProducerById(state.selectedProducerId);
}

function producerLabel(producer) {
  const b = producer?.basic || {};
  return [b.name, b.locality, b.municipality].filter(Boolean).join(" · ");
}

function animalLabel(animal) {
  return [animal?.species, animal?.race, animal?.quantity ? `(${animal.quantity})` : ""].filter(Boolean).join(" ");
}

function medLabel(med) {
  return [med.brand, med.active].filter(Boolean).join(" · ");
}

function supplyLabel(item) {
  return [item.name, item.mode === "NON_DISPOSABLE" ? "No desechable" : "Desechable"].filter(Boolean).join(" · ");
}

function ensureProducerStructures(producer) {
  producer.animals ||= [];
  producer.animalQuestionnaire ||= {
    importantAnimals: [],
    importantAnimalsWhy: "",
    hasMilpa: "",
    whatSows: "",
    forageShortage: "",
    whereAnimalsStay: "",
    lastSick: "",
    commonDiseaseAnimal: "",
    commonDisease: "",
    signs: "",
    whenSickDo: "",
    diseases: [],
    vaccinatesAny: "",
    vaccines: [],
    dewormsAny: "",
    changesDewormer: "",
    dewormings: [],
    recommendedBy: "",
    curadorExiste: "",
    curadorQuien: "",
    curadorEdad: "",
    curadorEspecies: "",
    curadorTiempo: "",
    curadorServicios: "",
    practicesAny: "",
    practicesWho: "",
    practicesAdvice: "",
    traditional: [],
    genderAnimals: [],
    genderActivities: [],
    programRegistered: "",
    programName: "",
    hasFolio: "",
    folio: "",
    futureCalls: "",
    huntingCommon: "",
    huntingTime: "",
    huntedAnimals: "",
    huntingPlaces: "",
    huntingSeason: "",
    huntingReasons: "",
    wildProblems: "",
    wildProblemsDetail: "",
    riverUse: "",
    riverUseFor: "",
    riverMeaning: "",
    riverProblems: "",
    localKnowledgeExists: "",
    localKnowledgeWho: "",
    localKnowledgeUseful: "",
    rumiantInterest: "",
    rumiantInterestWhy: "",
    hadRumiantsBefore: "",
    noRumiantsReason: "",
    rumiantAdvice: "",
    rumiantOthers: "",
    rumiantWomen: "",
    rumiantNeed: "",
    birdsInterestYes: "",
    birdsInterestNo: ""
  };
  return producer;
}

function activateTab(name) {
  const map = {
    producer: ["#tabProducer", "#pageProducer"],
    animals: ["#tabAnimals", "#pageAnimals"],
    meds: ["#tabMeds", "#pageMeds"],
    supplies: ["#tabSupplies", "#pageSupplies"],
    procedures: ["#tabProcedures", "#pageProcedures"]
  };

  Object.values(map).forEach(([tab, page]) => {
    $(tab)?.classList.remove("active");
    $(page)?.classList.remove("active");
  });

  $(map[name][0])?.classList.add("active");
  $(map[name][1])?.classList.add("active");
}

function bindTabs() {
  $("#tabProducer")?.addEventListener("click", () => activateTab("producer"));
  $("#tabAnimals")?.addEventListener("click", () => activateTab("animals"));
  $("#tabMeds")?.addEventListener("click", () => activateTab("meds"));
  $("#tabSupplies")?.addEventListener("click", () => activateTab("supplies"));
  $("#tabProcedures")?.addEventListener("click", () => activateTab("procedures"));
  $("#btnGoProducerFromAnimals")?.addEventListener("click", () => activateTab("producer"));
}

/* =========================================================
   PRODUCTORES
========================================================= */
function getProducerClassification() {
  return $("#chipsClasificacion .chip[data-active='true']")?.dataset.value || "TRABAJAR";
}

function setProducerClassification(value) {
  $$("#chipsClasificacion .chip").forEach(chip => {
    chip.dataset.active = chip.dataset.value === value ? "true" : "false";
  });
  updateProducerConditionalFields();
}

function bindProducerClassification() {
  $$("#chipsClasificacion .chip").forEach(chip => {
    chip.addEventListener("click", () => setProducerClassification(chip.dataset.value));
  });
}

function updateProducerConditionalFields() {
  const indigenous = $("#pertenenciaIndigena")?.value || "";
  const language = $("#lenguaIndigenaTipo")?.value || "";
  $("#grupoIndigenaYoWrap").style.display = indigenous === "YO" ? "block" : "none";
  $("#grupoIndigenaFamiliarWrap").style.display = indigenous === "FAMILIAR" ? "grid" : "none";
  $("#lenguaYoWrap").style.display = language === "YO" ? "block" : "none";
  $("#lenguaFamiliarWrap").style.display = language === "FAMILIAR" ? "grid" : "none";
  $("#alertaWrap").style.display = getProducerClassification() === "NO_TRABAJAR" ? "block" : "none";
}

function familyRowTemplate(item = {}) {
  return `
    <tr>
      <td><input class="fam-name" type="text" value="${escapeHtml(item.name || "")}" placeholder="Nombre" /></td>
      <td><input class="fam-relation" type="text" value="${escapeHtml(item.relation || "")}" placeholder="Relación" /></td>
      <td><input class="fam-occupation" type="text" value="${escapeHtml(item.occupation || "")}" placeholder="Ocupación" /></td>
      <td><input class="fam-age" type="number" min="0" step="1" value="${escapeHtml(item.age || "")}" placeholder="Edad" /></td>
      <td><button class="btn small bad fam-remove" type="button">✖</button></td>
    </tr>
  `;
}

function addFamilyRow(item = {}) {
  const tbody = $("#familyTbody");
  if (!tbody) return;
  tbody.insertAdjacentHTML("beforeend", familyRowTemplate(item));
  tbody.lastElementChild?.querySelector(".fam-remove")?.addEventListener("click", () => {
    tbody.lastElementChild?.remove;
  });
  tbody.lastElementChild?.querySelector(".fam-remove")?.addEventListener("click", (event) => {
    event.currentTarget.closest("tr")?.remove();
  });
}

function setFamilyRows(items = []) {
  const tbody = $("#familyTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!items.length) {
    addFamilyRow();
    return;
  }
  items.forEach(addFamilyRow);
}

function collectFamilyRows() {
  return Array.from($("#familyTbody")?.querySelectorAll("tr") || [])
    .map(row => ({
      name: row.querySelector(".fam-name")?.value.trim() || "",
      relation: row.querySelector(".fam-relation")?.value.trim() || "",
      occupation: row.querySelector(".fam-occupation")?.value.trim() || "",
      age: row.querySelector(".fam-age")?.value.trim() || ""
    }))
    .filter(item => Object.values(item).some(Boolean));
}

async function bindSingleFileButtons(config) {
  const { takeBtn, pickBtn, takeInput, pickInput, removeBtn, onLoad, onClear } = config;
  $(takeBtn)?.addEventListener("click", () => $(takeInput)?.click());
  $(pickBtn)?.addEventListener("click", () => $(pickInput)?.click());
  $(removeBtn)?.addEventListener("click", onClear);
  [takeInput, pickInput].forEach(sel => {
    $(sel)?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await onLoad(file);
      event.target.value = "";
    });
  });
}

function bindProducerPhoto() {
  bindSingleFileButtons({
    takeBtn: "#btnTakePhoto",
    pickBtn: "#btnPickPhoto",
    takeInput: "#fotoTomar",
    pickInput: "#fotoElegir",
    removeBtn: "#btnRemovePhoto",
    onLoad: async (file) => {
      state.media.producerPhoto = await fileToBase64(file);
      setThumb("photoPreview", state.media.producerPhoto, "Sin<br/>foto");
    },
    onClear: () => {
      state.media.producerPhoto = null;
      setThumb("photoPreview", null, "Sin<br/>foto");
    }
  });
}

function bindProducerLocation() {
  $("#btnGeo")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showMessage("err", "Tu navegador no soporta geolocalización.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        $("#lat").value = pos.coords.latitude.toFixed(7);
        $("#lng").value = pos.coords.longitude.toFixed(7);
        showMessage("ok", "Ubicación cargada correctamente.", "success");
      },
      () => showMessage("err", "No se pudo obtener la ubicación.", "error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  $("#btnGenMaps")?.addEventListener("click", () => {
    const lat = $("#lat").value.trim();
    const lng = $("#lng").value.trim();
    if (!lat || !lng) {
      showMessage("err", "Debes capturar latitud y longitud.", "error");
      return;
    }
    $("#mapsUrl").value = `https://maps.google.com/?q=${lat},${lng}`;
    showMessage("ok", "Liga de Maps generada.", "success");
  });

  $("#btnOpenMaps")?.addEventListener("click", () => openUrl($("#mapsUrl").value.trim()));
  $("#btnClearLocation")?.addEventListener("click", () => {
    $("#lat").value = "";
    $("#lng").value = "";
    $("#mapsUrl").value = "";
  });
}

function collectProducerForm() {
  const existing = state.editing.producerId ? getProducerById(state.editing.producerId) : null;
  return ensureProducerStructures({
    id: state.editing.producerId || uid(),
    createdAt: existing?.createdAt || nowText(),
    updatedAt: nowText(),
    basic: {
      name: $("#nombre").value.trim(),
      age: $("#edad").value.trim(),
      sex: $("#sexo").value,
      maritalStatus: $("#estadoCivil").value,
      phone: $("#celular").value.trim(),
      peopleAtHome: $("#personasEnCasa").value.trim(),
      locality: $("#localidad").value.trim(),
      municipality: $("#municipio").value.trim(),
      stateName: $("#estado").value.trim(),
      schooling: $("#escolaridad").value,
      schoolingOther: $("#escolaridadOtro").value.trim(),
      schedule: $("#horario").value.trim(),
      canRead: getCheckedRadio("sabeLeer"),
      canWrite: getCheckedRadio("sabeEscribir"),
      indigenousType: $("#pertenenciaIndigena").value,
      indigenousSelf: $("#grupoIndigenaYo").value.trim(),
      indigenousFamilyWho: $("#grupoIndigenaFamiliarQuien").value.trim(),
      indigenousFamilyGroup: $("#grupoIndigenaFamiliarCual").value.trim(),
      languageType: $("#lenguaIndigenaTipo").value,
      languageSelf: $("#lenguaYo").value.trim(),
      languageFamilyWho: $("#lenguaFamiliarQuien").value.trim(),
      languageFamilyWhich: $("#lenguaFamiliarCual").value.trim()
    },
    location: {
      lat: $("#lat").value.trim(),
      lng: $("#lng").value.trim(),
      mapsUrl: $("#mapsUrl").value.trim()
    },
    classification: {
      status: getProducerClassification(),
      noReason: $("#alerta").value.trim(),
      extraNote: $("#notaExtraPersona").value.trim()
    },
    family: collectFamilyRows(),
    notes: $("#notas").value.trim(),
    photo: state.media.producerPhoto || null,
    animals: existing?.animals || [],
    animalQuestionnaire: existing?.animalQuestionnaire || null
  });
}

function resetProducerForm() {
  $("#producerForm")?.reset();
  state.editing.producerId = null;
  state.media.producerPhoto = null;
  setCheckedRadio("sabeLeer", "SI");
  setCheckedRadio("sabeEscribir", "SI");
  setProducerClassification("TRABAJAR");
  setThumb("photoPreview", null, "Sin<br/>foto");
  setFamilyRows([]);
  $("#formTitle").textContent = "Nuevo productor(a)";
  $("#btnCancelEdit").style.display = "none";
  showMessage("msg", "", "help");
  showMessage("err", "", "help");
  showMessage("ok", "", "help");
}

function fillProducerForm(producer) {
  state.editing.producerId = producer.id;
  $("#formTitle").textContent = "Editar productor(a)";
  $("#btnCancelEdit").style.display = "inline-flex";

  $("#nombre").value = producer.basic?.name || "";
  $("#edad").value = producer.basic?.age || "";
  $("#sexo").value = producer.basic?.sex || "";
  $("#estadoCivil").value = producer.basic?.maritalStatus || "";
  $("#celular").value = producer.basic?.phone || "";
  $("#personasEnCasa").value = producer.basic?.peopleAtHome || "";
  $("#localidad").value = producer.basic?.locality || "";
  $("#municipio").value = producer.basic?.municipality || "";
  $("#estado").value = producer.basic?.stateName || "";
  $("#escolaridad").value = producer.basic?.schooling || "";
  $("#escolaridadOtro").value = producer.basic?.schoolingOther || "";
  $("#horario").value = producer.basic?.schedule || "";
  setCheckedRadio("sabeLeer", producer.basic?.canRead || "SI");
  setCheckedRadio("sabeEscribir", producer.basic?.canWrite || "SI");
  $("#pertenenciaIndigena").value = producer.basic?.indigenousType || "";
  $("#grupoIndigenaYo").value = producer.basic?.indigenousSelf || "";
  $("#grupoIndigenaFamiliarQuien").value = producer.basic?.indigenousFamilyWho || "";
  $("#grupoIndigenaFamiliarCual").value = producer.basic?.indigenousFamilyGroup || "";
  $("#lenguaIndigenaTipo").value = producer.basic?.languageType || "";
  $("#lenguaYo").value = producer.basic?.languageSelf || "";
  $("#lenguaFamiliarQuien").value = producer.basic?.languageFamilyWho || "";
  $("#lenguaFamiliarCual").value = producer.basic?.languageFamilyWhich || "";
  $("#lat").value = producer.location?.lat || "";
  $("#lng").value = producer.location?.lng || "";
  $("#mapsUrl").value = producer.location?.mapsUrl || "";
  setProducerClassification(producer.classification?.status || "TRABAJAR");
  $("#alerta").value = producer.classification?.noReason || "";
  $("#notaExtraPersona").value = producer.classification?.extraNote || "";
  $("#notas").value = producer.notes || "";
  state.media.producerPhoto = producer.photo || null;
  setThumb("photoPreview", state.media.producerPhoto, "Sin<br/>foto");
  setFamilyRows(producer.family || []);
  updateProducerConditionalFields();
}

function producerWordHtml(producer) {
  const animals = producer.animals || [];
  const procedures = state.procedures.filter(p => p.producerId === producer.id);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(producer.basic?.name || "Productor")}</title></head><body>
    <h1>${escapeHtml(producer.basic?.name || "Productor(a)")}</h1>
    <p><b>Teléfono:</b> ${escapeHtml(producer.basic?.phone || "")}</p>
    <p><b>Ubicación:</b> ${escapeHtml([producer.basic?.locality, producer.basic?.municipality, producer.basic?.stateName].filter(Boolean).join(", "))}</p>
    <p><b>Maps:</b> ${escapeHtml(producer.location?.mapsUrl || "")}</p>
    <p><b>Clasificación:</b> ${escapeHtml(producer.classification?.status || "")}</p>
    <p><b>Notas:</b> ${escapeHtml(producer.notes || "")}</p>
    <h2>Familia</h2>
    <ul>${(producer.family || []).map(item => `<li>${escapeHtml([item.name, item.relation, item.occupation, item.age].filter(Boolean).join(" · "))}</li>`).join("") || "<li>Sin registros</li>"}</ul>
    <h2>Animales</h2>
    <ul>${animals.map(item => `<li>${escapeHtml(animalLabel(item))}</li>`).join("") || "<li>Sin registros</li>"}</ul>
    <h2>Procedimientos</h2>
    <ul>${procedures.map(item => `<li>${escapeHtml([item.date, item.type, item.place, item.chargeCalculated].filter(Boolean).join(" · "))}</li>`).join("") || "<li>Sin registros</li>"}</ul>
  </body></html>`;
}

function exportProducerWord(id) {
  const producer = getProducerById(id);
  if (!producer) return;
  downloadFile(`${(producer.basic?.name || "productor").replace(/[^\wáéíóúÁÉÍÓÚñÑ\- ]/g, "").trim() || "productor"}.doc`, "\ufeff" + producerWordHtml(producer), "application/msword");
}

function renderProducerList() {
  const box = $("#producerList");
  if (!box) return;
  $("#count").textContent = `${state.producers.length}`;
  if (!state.producers.length) {
    box.innerHTML = '<div class="empty-state">Aún no hay productores(as) registrados.</div>';
    return;
  }

  box.innerHTML = "";
  state.producers.forEach(producer => {
    ensureProducerStructures(producer);
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:14px;">
        <div class="kv" style="flex:1;">
          <h3>${escapeHtml(producer.basic?.name || "Sin nombre")}</h3>
          <div class="meta">${escapeHtml([producer.basic?.locality, producer.basic?.municipality, producer.basic?.stateName].filter(Boolean).join(", "))}</div>
          <div class="line"><b>Tel:</b> ${escapeHtml(producer.basic?.phone || "—")}</div>
          <div class="line"><b>Clasificación:</b> ${escapeHtml(producer.classification?.status || "TRABAJAR")}</div>
          <div class="line"><b>Animales:</b> ${producer.animals.length}</div>
        </div>
        <div class="thumb">${producer.photo ? `<img src="${producer.photo}" alt="${escapeHtml(producer.basic?.name || "productor")}" />` : "<span>Sin<br/>foto</span>"}</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small primary" type="button" data-action="select">Usar</button>
        <button class="btn small" type="button" data-action="edit">Editar</button>
        <button class="btn small ghost" type="button" data-action="word">📄 Word</button>
        <button class="btn small ghost" type="button" data-action="maps">🗺️ Maps</button>
        <button class="btn small bad" type="button" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="select"]').addEventListener("click", () => {
      state.selectedProducerId = producer.id;
      saveState();
      renderProducerList();
      renderAnimalsProducerSelect();
      renderProcedureProducerSelect();
      activateTab("animals");
    });
    div.querySelector('[data-action="edit"]').addEventListener("click", () => fillProducerForm(producer));
    div.querySelector('[data-action="word"]').addEventListener("click", () => exportProducerWord(producer.id));
    div.querySelector('[data-action="maps"]').addEventListener("click", () => openUrl(producer.location?.mapsUrl || ""));
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (!confirm(`¿Eliminar a ${producer.basic?.name || "este productor(a)"}?`)) return;
      state.producers = state.producers.filter(item => item.id !== producer.id);
      state.procedures = state.procedures.filter(item => item.producerId !== producer.id);
      if (state.selectedProducerId === producer.id) {
        state.selectedProducerId = state.producers[0]?.id || null;
      }
      saveState();
      renderAll();
      resetProducerForm();
    });
    if (state.selectedProducerId === producer.id) {
      div.style.outline = "2px solid rgba(34,197,94,.45)";
    }
    box.appendChild(div);
  });
}

function exportProducersJSON() {
  downloadFile("productores-app-rural.json", JSON.stringify(state.producers, null, 2), "application/json;charset=utf-8;");
}

function bindProducerSection() {
  $("#btnAddFamily")?.addEventListener("click", () => addFamilyRow());
  $("#producerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const producer = collectProducerForm();
    if (!producer.basic.name) {
      showMessage("err", "El nombre completo es obligatorio.", "error");
      return;
    }
    const index = state.producers.findIndex(item => item.id === producer.id);
    if (index >= 0) state.producers[index] = producer;
    else state.producers.unshift(producer);
    state.selectedProducerId = producer.id;
    saveState();
    renderAll();
    resetProducerForm();
    showMessage("ok", index >= 0 ? "Productor(a) actualizado correctamente." : "Productor(a) guardado correctamente.", "success");
  });
  $("#btnReset")?.addEventListener("click", resetProducerForm);
  $("#btnCancelEdit")?.addEventListener("click", resetProducerForm);
  $("#btnExport")?.addEventListener("click", exportProducersJSON);
  $("#btnExportWordProducer")?.addEventListener("click", () => exportProducerWord(state.selectedProducerId));
  $("#btnImport")?.addEventListener("click", () => $("#importFile")?.click());
  $("#importFile")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = JSON.parse(await file.text());
    state.producers = Array.isArray(parsed) ? parsed.map(ensureProducerStructures) : [];
    state.selectedProducerId = state.producers[0]?.id || null;
    saveState();
    renderAll();
    event.target.value = "";
  });
  $("#btnWipe")?.addEventListener("click", () => {
    if (!confirm("¿Borrar toda la información almacenada en este navegador?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
  ["#pertenenciaIndigena", "#lenguaIndigenaTipo"].forEach(sel => $(sel)?.addEventListener("change", updateProducerConditionalFields));
}

/* =========================================================
   ANIMALES
========================================================= */
function renderAnimalsProducerSelect() {
  const select = $("#animalsProducerSelect");
  if (!select) return;
  select.innerHTML = state.producers.map(producer => `<option value="${producer.id}">${escapeHtml(producerLabel(producer))}</option>`).join("");
  if (state.selectedProducerId) select.value = state.selectedProducerId;
  $("#animalsProducerHint").textContent = state.selectedProducerId ? `Trabajando con: ${producerLabel(getSelectedProducer())}` : "Primero registra o selecciona un productor(a).";
  renderAnimalList();
  loadAnimalQuestionnaireIntoForm();
}

async function bindAnimalPhotos() {
  const loadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    const images = [];
    for (const file of files) images.push(await fileToBase64(file));
    state.media.animalTempPhotos = images;
    renderAnimalPhotoPreview();
  };
  $("#a_btnInstTake")?.addEventListener("click", () => $("#a_instTake")?.click());
  $("#a_btnInstPick")?.addEventListener("click", () => $("#a_instPick")?.click());
  $("#a_btnInstClear")?.addEventListener("click", () => {
    state.media.animalTempPhotos = [];
    renderAnimalPhotoPreview();
  });
  ["#a_instTake", "#a_instPick"].forEach(sel => {
    $(sel)?.addEventListener("change", async (event) => {
      await loadFiles(event.target.files);
      event.target.value = "";
    });
  });
}

function renderAnimalPhotoPreview() {
  setMultiThumbs("a_instPreview", state.media.animalTempPhotos, "Sin<br/>fotos");
  $("#a_instHint").textContent = state.media.animalTempPhotos.length ? `${state.media.animalTempPhotos.length} evidencia(s) cargada(s).` : "Puedes adjuntar una o varias fotos.";
  $("#a_instPreview")?.querySelectorAll(".mini-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      state.media.animalTempPhotos.splice(Number(btn.dataset.index), 1);
      renderAnimalPhotoPreview();
    });
  });
}

function currentProducerForAnimals() {
  const producer = getSelectedProducer();
  if (!producer) {
    showMessage("a_msg", "Debes seleccionar un productor(a).", "error");
    return null;
  }
  return ensureProducerStructures(producer);
}

function collectAnimalGroupForm() {
  return {
    id: state.editing.animalId || uid(),
    createdAt: nowText(),
    updatedAt: nowText(),
    species: $("#a_especie").value.trim(),
    race: $("#a_raza").value.trim(),
    quantity: $("#a_cantidad").value.trim(),
    owner: $("#a_dueno").value.trim(),
    saleDecision: $("#a_decideVenta").value.trim(),
    feedingCareBy: $("#a_limpiaAlimenta").value.trim(),
    function: $("#a_funcion").value.trim(),
    whereLive: $("#a_viven").value.trim(),
    feedType: $("#a_feedType").value.trim(),
    photos: [...state.media.animalTempPhotos]
  };
}

function resetAnimalGroupForm() {
  $("#animalForm")?.reset();
  state.editing.animalId = null;
  state.media.animalTempPhotos = [];
  renderAnimalPhotoPreview();
  showMessage("a_msg", "", "help");
}

function saveAnimalGroup() {
  const producer = currentProducerForAnimals();
  if (!producer) return;
  const animal = collectAnimalGroupForm();
  if (!animal.species || !animal.quantity) {
    showMessage("a_msg", "Especie y cantidad son obligatorias para guardar el grupo animal.", "error");
    return;
  }
  const index = producer.animals.findIndex(item => item.id === animal.id);
  if (index >= 0) producer.animals[index] = { ...producer.animals[index], ...animal, updatedAt: nowText() };
  else producer.animals.unshift(animal);
  saveState();
  renderAll();
  resetAnimalGroupForm();
  showMessage("a_msg", index >= 0 ? "Grupo animal actualizado." : "Grupo animal guardado.", "success");
}

function renderSimpleList(containerId, items, templateFn, removeFn) {
  const box = $(containerId);
  if (!box) return;
  if (!items.length) {
    box.innerHTML = '<div class="empty-state">Sin registros.</div>';
    return;
  }
  box.innerHTML = "";
  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="kv">${templateFn(item)}</div>
      <div class="actions" style="margin-top:10px;">
        <button class="btn small bad" type="button">Eliminar</button>
      </div>
    `;
    div.querySelector("button")?.addEventListener("click", () => removeFn(index));
    box.appendChild(div);
  });
}

function addDisease() {
  animalDraft.diseases.push({
    animal: $("#a_enfAnimal").value.trim(),
    disease: $("#a_commonDis").value.trim(),
    signs: $("#a_signs").value.trim(),
    whatDo: $("#a_whenSickDo").value.trim()
  });
  ["#a_enfAnimal", "#a_commonDis", "#a_signs", "#a_whenSickDo"].forEach(sel => $(sel).value = "");
  renderAnimalDraftLists();
}
function addVaccineRecord() {
  animalDraft.vaccines.push({
    animal: $("#a_vaxAnimal").value.trim(),
    name: $("#a_vaxName").value.trim(),
    date: $("#a_vaxDate").value,
    who: $("#a_vaxWho").value.trim()
  });
  ["#a_vaxAnimal", "#a_vaxName", "#a_vaxDate", "#a_vaxWho"].forEach(sel => $(sel).value = "");
  renderAnimalDraftLists();
}
function addDeworming() {
  animalDraft.dewormings.push({
    animal: $("#a_dewormAnimal").value.trim(),
    product: $("#a_dewormProd").value.trim(),
    date: $("#a_dewormDate").value,
    who: $("#a_dewormWho").value.trim()
  });
  ["#a_dewormAnimal", "#a_dewormProd", "#a_dewormDate", "#a_dewormWho"].forEach(sel => $(sel).value = "");
  renderAnimalDraftLists();
}
function addTraditional() {
  animalDraft.traditional.push({
    name: $("#a_tradNombre").value.trim(),
    type: $("#a_tradTipo").value.trim(),
    use: $("#a_tradUso").value.trim(),
    part: $("#a_tradParte").value.trim()
  });
  ["#a_tradNombre", "#a_tradTipo", "#a_tradUso", "#a_tradParte"].forEach(sel => $(sel).value = "");
  renderAnimalDraftLists();
}
function addGenderAnimal() {
  animalDraft.genderAnimals.push({
    animal: $("#a_genderAnimal").value.trim(),
    who: $("#a_genderAnimalWho").value.trim(),
    why: $("#a_genderAnimalWhy").value.trim()
  });
  ["#a_genderAnimal", "#a_genderAnimalWho", "#a_genderAnimalWhy"].forEach(sel => $(sel).value = "");
  renderAnimalDraftLists();
}
function addGenderActivity() {
  animalDraft.genderActivities.push({
    activity: $("#a_actividadGenero").value.trim(),
    sex: $("#a_actividadGeneroSexo").value.trim(),
    reason: $("#a_actividadGeneroRazon").value.trim()
  });
  ["#a_actividadGenero", "#a_actividadGeneroSexo", "#a_actividadGeneroRazon"].forEach(sel => $(sel).value = "");
  renderAnimalDraftLists();
}

function renderAnimalDraftLists() {
  renderSimpleList("#a_diseaseList", animalDraft.diseases, item => `
    <div class="line"><b>Animal:</b> ${escapeHtml(item.animal)}</div>
    <div class="line"><b>Enfermedad:</b> ${escapeHtml(item.disease)}</div>
    <div class="line"><b>Signos:</b> ${escapeHtml(item.signs)}</div>
    <div class="line"><b>Qué hacen:</b> ${escapeHtml(item.whatDo)}</div>
  `, index => { animalDraft.diseases.splice(index, 1); renderAnimalDraftLists(); });

  renderSimpleList("#a_vaxList", animalDraft.vaccines, item => `
    <div class="line"><b>Animal:</b> ${escapeHtml(item.animal)}</div>
    <div class="line"><b>Vacuna:</b> ${escapeHtml(item.name)}</div>
    <div class="line"><b>Fecha:</b> ${escapeHtml(item.date)}</div>
    <div class="line"><b>Aplicó:</b> ${escapeHtml(item.who)}</div>
  `, index => { animalDraft.vaccines.splice(index, 1); renderAnimalDraftLists(); });

  renderSimpleList("#a_dewormList", animalDraft.dewormings, item => `
    <div class="line"><b>Animal:</b> ${escapeHtml(item.animal)}</div>
    <div class="line"><b>Producto:</b> ${escapeHtml(item.product)}</div>
    <div class="line"><b>Fecha:</b> ${escapeHtml(item.date)}</div>
    <div class="line"><b>Aplicó:</b> ${escapeHtml(item.who)}</div>
  `, index => { animalDraft.dewormings.splice(index, 1); renderAnimalDraftLists(); });

  renderSimpleList("#a_tradList", animalDraft.traditional, item => `
    <div class="line"><b>Nombre:</b> ${escapeHtml(item.name)}</div>
    <div class="line"><b>Tipo:</b> ${escapeHtml(item.type)}</div>
    <div class="line"><b>Uso:</b> ${escapeHtml(item.use)}</div>
    <div class="line"><b>Parte:</b> ${escapeHtml(item.part)}</div>
  `, index => { animalDraft.traditional.splice(index, 1); renderAnimalDraftLists(); });

  renderSimpleList("#a_genderAnimalList", animalDraft.genderAnimals, item => `
    <div class="line"><b>Animal:</b> ${escapeHtml(item.animal)}</div>
    <div class="line"><b>Quién:</b> ${escapeHtml(item.who)}</div>
    <div class="line"><b>Razón:</b> ${escapeHtml(item.why)}</div>
  `, index => { animalDraft.genderAnimals.splice(index, 1); renderAnimalDraftLists(); });

  renderSimpleList("#a_generoActividadList", animalDraft.genderActivities, item => `
    <div class="line"><b>Actividad:</b> ${escapeHtml(item.activity)}</div>
    <div class="line"><b>Sexo:</b> ${escapeHtml(item.sex)}</div>
    <div class="line"><b>Razón:</b> ${escapeHtml(item.reason)}</div>
  `, index => { animalDraft.genderActivities.splice(index, 1); renderAnimalDraftLists(); });
}

function saveAnimalQuestionnaireFull() {
  const producer = currentProducerForAnimals();
  if (!producer) return;
  producer.animalQuestionnaire = {
    importantAnimals: selectValues($("#a_animalesImportantes")),
    importantAnimalsWhy: $("#a_importanciaDetalle").value.trim(),
    hasMilpa: $("#a_tieneMilpa").value,
    whatSows: $("#a_queSiembra").value.trim(),
    forageShortage: $("#a_escasezForraje").value.trim(),
    whereAnimalsStay: $("#a_dondeEstanMayorTiempo").value.trim(),
    lastSick: $("#a_lastSick").value.trim(),
    commonDiseaseAnimal: $("#a_enfAnimal").value.trim(),
    commonDisease: $("#a_commonDis").value.trim(),
    signs: $("#a_signs").value.trim(),
    whenSickDo: $("#a_whenSickDo").value.trim(),
    diseases: [...animalDraft.diseases],
    vaccinatesAny: $("#a_vaxAny").value,
    vaccines: [...animalDraft.vaccines],
    dewormsAny: $("#a_dewormAny").value,
    changesDewormer: $("#a_changeDewormProduct").value,
    dewormings: [...animalDraft.dewormings],
    recommendedBy: $("#a_recommendWho").value.trim(),
    curadorExiste: $("#a_curadorExiste").value,
    curadorQuien: $("#a_curadorQuien").value.trim(),
    curadorEdad: $("#a_curadorEdad").value.trim(),
    curadorEspecies: $("#a_curadorEspecies").value.trim(),
    curadorTiempo: $("#a_curadorTiempo").value.trim(),
    curadorServicios: $("#a_curadorServicios").value.trim(),
    practicesAny: $("#a_practicas").value,
    practicesWho: $("#a_practicasQuien").value.trim(),
    practicesAdvice: $("#a_practicasAsesoria").value.trim(),
    traditional: [...animalDraft.traditional],
    genderAnimals: [...animalDraft.genderAnimals],
    genderActivities: [...animalDraft.genderActivities],
    programRegistered: $("#a_programaRegistro").value,
    programName: $("#a_programaNombre").value.trim(),
    hasFolio: $("#a_programaFolioTiene").value,
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
    rumiantAdvice: $("#a_rumiantsAdvice").value.trim(),
    rumiantOthers: $("#a_rumiantsOthers").value.trim(),
    rumiantWomen: $("#a_rumiantsWomen").value.trim(),
    rumiantNeed: $("#a_rumiantsNeed").value.trim(),
    birdsInterestYes: $("#a_interestBirdsYes").value.trim(),
    birdsInterestNo: $("#a_interestBirdsNo").value.trim()
  };
  saveState();
  showMessage("a_msg", "Cuestionario de animales guardado correctamente.", "success");
}

function loadAnimalQuestionnaireIntoForm() {
  const producer = getSelectedProducer();
  if (!producer) return;
  ensureProducerStructures(producer);
  const q = producer.animalQuestionnaire;
  setSelectValues($("#a_animalesImportantes"), q.importantAnimals || []);
  $("#a_importanciaDetalle").value = q.importantAnimalsWhy || "";
  $("#a_tieneMilpa").value = q.hasMilpa || "";
  $("#a_queSiembra").value = q.whatSows || "";
  $("#a_escasezForraje").value = q.forageShortage || "";
  $("#a_dondeEstanMayorTiempo").value = q.whereAnimalsStay || "";
  $("#a_lastSick").value = q.lastSick || "";
  $("#a_vaxAny").value = q.vaccinatesAny || "";
  $("#a_dewormAny").value = q.dewormsAny || "";
  $("#a_changeDewormProduct").value = q.changesDewormer || "";
  $("#a_recommendWho").value = q.recommendedBy || "";
  $("#a_curadorExiste").value = q.curadorExiste || "";
  $("#a_curadorQuien").value = q.curadorQuien || "";
  $("#a_curadorEdad").value = q.curadorEdad || "";
  $("#a_curadorEspecies").value = q.curadorEspecies || "";
  $("#a_curadorTiempo").value = q.curadorTiempo || "";
  $("#a_curadorServicios").value = q.curadorServicios || "";
  $("#a_practicas").value = q.practicesAny || "";
  $("#a_practicasQuien").value = q.practicesWho || "";
  $("#a_practicasAsesoria").value = q.practicesAdvice || "";
  $("#a_programaRegistro").value = q.programRegistered || "";
  $("#a_programaNombre").value = q.programName || "";
  $("#a_programaFolioTiene").value = q.hasFolio || "";
  $("#a_programaFolio").value = q.folio || "";
  $("#a_programaConvocatorias").value = q.futureCalls || "";
  $("#a_cazaComunidad").value = q.huntingCommon || "";
  $("#a_cazaTiempo").value = q.huntingTime || "";
  $("#a_cazaAnimales").value = q.huntedAnimals || "";
  $("#a_cazaLugares").value = q.huntingPlaces || "";
  $("#a_cazaEpoca").value = q.huntingSeason || "";
  $("#a_cazaMotivos").value = q.huntingReasons || "";
  $("#a_silvestresProblemas").value = q.wildProblems || "";
  $("#a_silvestresQuePaso").value = q.wildProblemsDetail || "";
  $("#a_rioUso").value = q.riverUse || "";
  $("#a_rioParaQue").value = q.riverUseFor || "";
  $("#a_rioSignificado").value = q.riverMeaning || "";
  $("#a_rioProblemas").value = q.riverProblems || "";
  $("#a_saberesLocales").value = q.localKnowledgeExists || "";
  $("#a_saberesQuien").value = q.localKnowledgeWho || "";
  $("#a_saberesUtilidad").value = q.localKnowledgeUseful || "";
  $("#a_interestRumiants").value = q.rumiantInterest || "";
  $("#a_interestRumiantsWhy").value = q.rumiantInterestWhy || "";
  $("#a_hadRumiantsBefore").value = q.hadRumiantsBefore || "";
  $("#a_noRumiantsWhy").value = q.noRumiantsReason || "";
  $("#a_rumiantsAdvice").value = q.rumiantAdvice || "";
  $("#a_rumiantsOthers").value = q.rumiantOthers || "";
  $("#a_rumiantsWomen").value = q.rumiantWomen || "";
  $("#a_rumiantsNeed").value = q.rumiantNeed || "";
  $("#a_interestBirdsYes").value = q.birdsInterestYes || "";
  $("#a_interestBirdsNo").value = q.birdsInterestNo || "";

  animalDraft.diseases = [...(q.diseases || [])];
  animalDraft.vaccines = [...(q.vaccines || [])];
  animalDraft.dewormings = [...(q.dewormings || [])];
  animalDraft.traditional = [...(q.traditional || [])];
  animalDraft.genderAnimals = [...(q.genderAnimals || [])];
  animalDraft.genderActivities = [...(q.genderActivities || [])];
  renderAnimalDraftLists();
}

function renderAnimalList() {
  const box = $("#a_list");
  if (!box) return;
  const producer = getSelectedProducer();
  if (!producer) {
    box.innerHTML = '<div class="empty-state">Selecciona un productor(a) para ver sus animales.</div>';
    return;
  }
  ensureProducerStructures(producer);
  if (!producer.animals.length) {
    box.innerHTML = '<div class="empty-state">No hay grupos animales registrados para este productor(a).</div>';
    return;
  }
  box.innerHTML = "";
  producer.animals.forEach(animal => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:flex-start;gap:14px;">
        <div class="kv" style="flex:1;">
          <h3>${escapeHtml(animalLabel(animal))}</h3>
          <div class="line"><b>Dueño:</b> ${escapeHtml(animal.owner || "")}</div>
          <div class="line"><b>Función:</b> ${escapeHtml(animal.function || "")}</div>
          <div class="line"><b>Alimento:</b> ${escapeHtml(animal.feedType || "")}</div>
        </div>
        <div class="row" style="flex-wrap:wrap;justify-content:flex-end;max-width:320px;">${(animal.photos || []).slice(0, 3).map(img => `<div class="preview-mini"><img src="${img}" alt="animal" /></div>`).join("") || '<div class="thumb"><span>Sin<br/>fotos</span></div>'}</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small" type="button" data-action="edit">Editar</button>
        <button class="btn small bad" type="button" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      state.editing.animalId = animal.id;
      $("#a_especie").value = animal.species || "";
      $("#a_raza").value = animal.race || "";
      $("#a_cantidad").value = animal.quantity || "";
      $("#a_dueno").value = animal.owner || "";
      $("#a_decideVenta").value = animal.saleDecision || "";
      $("#a_limpiaAlimenta").value = animal.feedingCareBy || "";
      $("#a_funcion").value = animal.function || "";
      $("#a_viven").value = animal.whereLive || "";
      $("#a_feedType").value = animal.feedType || "";
      state.media.animalTempPhotos = [...(animal.photos || [])];
      renderAnimalPhotoPreview();
      activateTab("animals");
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      producer.animals = producer.animals.filter(item => item.id !== animal.id);
      saveState();
      renderAll();
    });
    box.appendChild(div);
  });
}

function bindAnimalsSection() {
  bindAnimalPhotos();
  $("#animalsProducerSelect")?.addEventListener("change", () => {
    state.selectedProducerId = $("#animalsProducerSelect").value || null;
    saveState();
    renderAnimalsProducerSelect();
    renderProcedureProducerSelect();
  });
  $("#a_save")?.addEventListener("click", saveAnimalGroup);
  $("#a_clear")?.addEventListener("click", resetAnimalGroupForm);
  $("#a_addDisease")?.addEventListener("click", addDisease);
  $("#a_addVax")?.addEventListener("click", addVaccineRecord);
  $("#a_addDeworm")?.addEventListener("click", addDeworming);
  $("#a_addTrad")?.addEventListener("click", addTraditional);
  $("#a_addGenderAnimal")?.addEventListener("click", addGenderAnimal);
  $("#a_addGeneroActividad")?.addEventListener("click", addGenderActivity);
  $("#btnSaveAnimalsFull")?.addEventListener("click", saveAnimalQuestionnaireFull);
}

/* =========================================================
   MEDICAMENTOS / VACUNAS
========================================================= */
function renderMedMode() {
  const isChat = state.ui.medMode === "CHATGPT";
  $("#chatgptBlock").style.display = isChat ? "block" : "none";
  $("#m_modeHint").textContent = `Modo actual: ${isChat ? "🪄 ChatGPT" : "✍️ Manual"}`;
  $("#m_modeManual").classList.toggle("ghost", isChat);
  $("#m_modeChatGPT").classList.toggle("ghost", !isChat);
}

function bindMedMode() {
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
}

function calcMedUnitCost() {
  const total = Number($("#m_totalQty").value || 0);
  const cost = Number($("#m_cost").value || 0);
  $("#m_unitCost").value = total > 0 ? (cost / total).toFixed(2) : "";
}

function renderMedPhotos() {
  setThumb("m_rx_preview", state.media.medRxPhoto, "Sin<br/>receta");
  setThumb("m_tk_preview", state.media.medTicketPhoto, "Sin<br/>ticket");
}

function bindMedPhotos() {
  bindSingleFileButtons({
    takeBtn: "#m_btnRxTake",
    pickBtn: "#m_btnRxPick",
    takeInput: "#m_rx_take",
    pickInput: "#m_rx_pick",
    removeBtn: "#m_btnRxRemove",
    onLoad: async (file) => {
      state.media.medRxPhoto = await fileToBase64(file);
      renderMedPhotos();
    },
    onClear: () => {
      state.media.medRxPhoto = null;
      renderMedPhotos();
    }
  });
  bindSingleFileButtons({
    takeBtn: "#m_btnTkTake",
    pickBtn: "#m_btnTkPick",
    takeInput: "#m_tk_take",
    pickInput: "#m_tk_pick",
    removeBtn: "#m_btnTkRemove",
    onLoad: async (file) => {
      state.media.medTicketPhoto = await fileToBase64(file);
      renderMedPhotos();
    },
    onClear: () => {
      state.media.medTicketPhoto = null;
      renderMedPhotos();
    }
  });
}

function makeAIPrompt() {
  const prompt = {
    idioma: $("#ai_english")?.checked ? "english" : "spanish",
    contexto: "Analiza el medicamento o vacuna veterinaria y devuelve JSON plano.",
    campos: {
      brand: $("#m_brand").value.trim(),
      active: $("#m_active").value.trim(),
      use: $("#m_use").value.trim(),
      mechanism: $("#m_mech").value.trim(),
      adverse: $("#m_adverse").value.trim(),
      pregnancy: $("#m_preg").value.trim(),
      pk: $("#m_pk").value.trim(),
      overdose: $("#m_overdose").value.trim(),
      interactions: $("#m_interactions").value.trim(),
      dosing: $("#m_dosing").value.trim()
    },
    salida: {
      brand: "",
      active: "",
      use: "",
      mechanism: "",
      adverse: "",
      pregnancy: "",
      pk: "",
      overdose: "",
      interactions: "",
      dosing: ""
    }
  };
  $("#ai_prompt").value = JSON.stringify(prompt, null, 2);
  $("#ai_status").textContent = "Prompt generado. Puedes copiarlo o abrir ChatGPT.";
}

function fillMedFromAI() {
  try {
    const parsed = JSON.parse($("#ai_result").value);
    $("#m_brand").value = parsed.brand || $("#m_brand").value;
    $("#m_active").value = parsed.active || $("#m_active").value;
    $("#m_use").value = parsed.use || "";
    $("#m_mech").value = parsed.mechanism || "";
    $("#m_adverse").value = parsed.adverse || "";
    $("#m_preg").value = parsed.pregnancy || "";
    $("#m_pk").value = parsed.pk || "";
    $("#m_overdose").value = parsed.overdose || "";
    $("#m_interactions").value = parsed.interactions || "";
    $("#m_dosing").value = parsed.dosing || "";
    showMessage("m_ok", "Datos pegados desde JSON de ChatGPT.", "success");
  } catch {
    showMessage("m_err", "El JSON pegado en ChatGPT no es válido.", "error");
  }
}

function collectMedForm() {
  const current = state.meds.find(item => item.id === state.editing.medId);
  return {
    id: state.editing.medId || uid(),
    createdAt: current?.createdAt || nowText(),
    updatedAt: nowText(),
    mode: state.ui.medMode,
    brand: $("#m_brand").value.trim(),
    active: $("#m_active").value.trim(),
    owner: $("#m_owner").value,
    presentation: $("#m_presentation").value.trim(),
    cost: $("#m_cost").value.trim(),
    expiry: $("#m_expiry").value,
    totalQty: $("#m_totalQty").value.trim(),
    unit: $("#m_unit").value.trim(),
    unitCost: $("#m_unitCost").value.trim(),
    vaccineBrand: $("#m_vaxBrand").value.trim(),
    vaccineExpiry: $("#m_vaxExpiry").value,
    vaccinePrice: $("#m_vaxPrice").value.trim(),
    vaccineCoverageAnimals: $("#m_vaxCoverageAnimals").value.trim(),
    vaccineDiseases: $("#m_vaxDiseases").value.trim(),
    use: $("#m_use").value.trim(),
    mechanism: $("#m_mech").value.trim(),
    adverse: $("#m_adverse").value.trim(),
    pregnancy: $("#m_preg").value.trim(),
    pk: $("#m_pk").value.trim(),
    overdose: $("#m_overdose").value.trim(),
    interactions: $("#m_interactions").value.trim(),
    dosing: $("#m_dosing").value.trim(),
    rxPhoto: state.media.medRxPhoto,
    ticketPhoto: state.media.medTicketPhoto
  };
}

function resetMedForm() {
  $("#medForm")?.reset();
  state.editing.medId = null;
  state.media.medRxPhoto = null;
  state.media.medTicketPhoto = null;
  renderMedPhotos();
  calcMedUnitCost();
}

function renderMedList() {
  const box = $("#m_list");
  const term = $("#m_search")?.value.trim().toLowerCase() || "";
  const items = state.meds.filter(item => [item.brand, item.active, item.vaccineBrand, item.vaccineDiseases].join(" ").toLowerCase().includes(term));
  $("#m_count").textContent = `${state.meds.length}`;
  if (!items.length) {
    box.innerHTML = '<div class="empty-state">Sin medicamentos o vacunas registrados.</div>';
    return;
  }
  box.innerHTML = "";
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(medLabel(item) || item.vaccineBrand || "Medicamento / Vacuna")}</h3>
      <div class="meta">${escapeHtml([item.presentation, item.unit ? `${item.totalQty || 0} ${item.unit}` : "", item.expiry].filter(Boolean).join(" · "))}</div>
      <div class="line"><b>Costo:</b> ${money(item.cost || item.vaccinePrice || 0)}</div>
      <div class="line"><b>Dosis/uso:</b> ${escapeHtml(item.dosing || item.use || "")}</div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small" type="button" data-action="edit">Editar</button>
        <button class="btn small bad" type="button" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      state.editing.medId = item.id;
      Object.entries({
        m_brand: item.brand,
        m_active: item.active,
        m_owner: item.owner,
        m_presentation: item.presentation,
        m_cost: item.cost,
        m_expiry: item.expiry,
        m_totalQty: item.totalQty,
        m_unit: item.unit,
        m_unitCost: item.unitCost,
        m_vaxBrand: item.vaccineBrand,
        m_vaxExpiry: item.vaccineExpiry,
        m_vaxPrice: item.vaccinePrice,
        m_vaxCoverageAnimals: item.vaccineCoverageAnimals,
        m_vaxDiseases: item.vaccineDiseases,
        m_use: item.use,
        m_mech: item.mechanism,
        m_adverse: item.adverse,
        m_preg: item.pregnancy,
        m_pk: item.pk,
        m_overdose: item.overdose,
        m_interactions: item.interactions,
        m_dosing: item.dosing
      }).forEach(([id, value]) => { if ($("#" + id)) $("#" + id).value = value || ""; });
      state.media.medRxPhoto = item.rxPhoto || null;
      state.media.medTicketPhoto = item.ticketPhoto || null;
      renderMedPhotos();
      activateTab("meds");
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.meds = state.meds.filter(med => med.id !== item.id);
      saveState();
      renderAll();
    });
    box.appendChild(div);
  });
}

function exportMedsJson() {
  downloadFile("medicamentos-app-rural.json", JSON.stringify(state.meds, null, 2), "application/json;charset=utf-8;");
}

function exportMedsCsv() {
  downloadCSV("medicamentos-app-rural.csv", [
    ["Marca", "Activo", "Presentación", "Costo", "Caducidad", "Uso", "Dosis", "Cobertura vacuna"],
    ...state.meds.map(item => [item.brand, item.active, item.presentation, item.cost, item.expiry, item.use, item.dosing, item.vaccineCoverageAnimals])
  ]);
}

function bindMedsSection() {
  bindMedMode();
  bindMedPhotos();
  $("#m_totalQty")?.addEventListener("input", calcMedUnitCost);
  $("#m_cost")?.addEventListener("input", calcMedUnitCost);
  $("#m_btnClear")?.addEventListener("click", resetMedForm);
  $("#m_search")?.addEventListener("input", renderMedList);
  $("#m_btnExport")?.addEventListener("click", exportMedsJson);
  $("#m_btnExportExcel")?.addEventListener("click", exportMedsCsv);
  $("#m_btnImport")?.addEventListener("click", () => $("#m_importFile")?.click());
  $("#m_importFile")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.meds = JSON.parse(await file.text());
    saveState();
    renderAll();
    event.target.value = "";
  });
  $("#ai_makePrompt")?.addEventListener("click", makeAIPrompt);
  $("#ai_copyPrompt")?.addEventListener("click", async () => navigator.clipboard.writeText($("#ai_prompt").value));
  $("#ai_openChatGPT")?.addEventListener("click", () => openUrl("https://chatgpt.com/"));
  $("#ai_clearAll")?.addEventListener("click", () => {
    $("#ai_prompt").value = "";
    $("#ai_result").value = "";
    $("#ai_status").textContent = "";
  });
  $("#ai_fillFromJson")?.addEventListener("click", fillMedFromAI);
  $("#ai_copyExample")?.addEventListener("click", async () => {
    const example = JSON.stringify({ brand: "Ejemplo", active: "Ivermectina", use: "Antiparasitario", mechanism: "", adverse: "", pregnancy: "", pk: "", overdose: "", interactions: "", dosing: "1 ml / 50 kg" }, null, 2);
    await navigator.clipboard.writeText(example);
    $("#ai_status").textContent = "Ejemplo copiado al portapapeles.";
  });
  $("#medForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const med = collectMedForm();
    if (!med.brand && !med.vaccineBrand) {
      showMessage("m_err", "Captura al menos marca del medicamento o vacuna.", "error");
      return;
    }
    const index = state.meds.findIndex(item => item.id === med.id);
    if (index >= 0) state.meds[index] = med;
    else state.meds.unshift(med);
    saveState();
    renderAll();
    resetMedForm();
    showMessage("m_ok", index >= 0 ? "Medicamento actualizado." : "Medicamento guardado.", "success");
  });
}

/* =========================================================
   INSUMOS
========================================================= */
function renderSupplyMode() {
  const isNonDisposable = state.ui.supplyMode === "NON_DISPOSABLE";
  $("#blockDisposable").style.display = isNonDisposable ? "none" : "block";
  $("#blockNonDisposable").style.display = isNonDisposable ? "block" : "none";
  $("#s_modeHint").textContent = `Modo actual: ${isNonDisposable ? "♻️ No desechable" : "🧴 Desechable"}`;
  $("#s_modeDisposable").classList.toggle("ghost", isNonDisposable);
  $("#s_modeNonDisposable").classList.toggle("ghost", !isNonDisposable);
}

function calcSupplyCosts() {
  const qty = Number($("#s_qty").value || 0);
  const price = Number($("#s_price").value || 0);
  $("#s_unitCost").value = qty > 0 ? (price / qty).toFixed(2) : "";

  const costAcq = Number($("#s_costAcq").value || 0);
  const lifeMonths = Number($("#s_lifeMonths").value || 0);
  const estimatedUses = Number($("#s_estimatedUses").value || 0);
  $("#s_costMonth").value = lifeMonths > 0 ? (costAcq / lifeMonths).toFixed(2) : "";
  $("#s_costUse").value = estimatedUses > 0 ? (costAcq / estimatedUses).toFixed(2) : "";
}

function renderSupplyPhoto() {
  setThumb("s_tk_preview", state.media.supplyTicketPhoto, "Sin<br/>ticket");
}

function bindSupplySection() {
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
  ["#s_qty", "#s_price", "#s_costAcq", "#s_lifeMonths", "#s_estimatedUses"].forEach(sel => $(sel)?.addEventListener("input", calcSupplyCosts));
  bindSingleFileButtons({
    takeBtn: "#s_btnTkTake",
    pickBtn: "#s_btnTkPick",
    takeInput: "#s_tk_take",
    pickInput: "#s_tk_pick",
    removeBtn: "#s_btnTkRemove",
    onLoad: async (file) => {
      state.media.supplyTicketPhoto = await fileToBase64(file);
      renderSupplyPhoto();
    },
    onClear: () => {
      state.media.supplyTicketPhoto = null;
      renderSupplyPhoto();
    }
  });
  $("#s_btnClear")?.addEventListener("click", resetSupplyForm);
  $("#s_search")?.addEventListener("input", renderSupplyList);
  $("#s_btnExport")?.addEventListener("click", () => downloadFile("insumos-app-rural.json", JSON.stringify(state.supplies, null, 2), "application/json;charset=utf-8;"));
  $("#s_btnExportExcel")?.addEventListener("click", () => downloadCSV("insumos-app-rural.csv", [["Nombre", "Modo", "Cantidad", "Costo"], ...state.supplies.map(i => [i.name, i.mode, i.qty, i.mode === "NON_DISPOSABLE" ? i.costAcq : i.price])]));
  $("#s_btnImport")?.addEventListener("click", () => $("#s_importFile")?.click());
  $("#s_importFile")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.supplies = JSON.parse(await file.text());
    saveState();
    renderAll();
    event.target.value = "";
  });
  $("#supplyForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const supply = collectSupplyForm();
    if (!supply.name) {
      showMessage("s_err", "El nombre del insumo es obligatorio.", "error");
      return;
    }
    const index = state.supplies.findIndex(item => item.id === supply.id);
    if (index >= 0) state.supplies[index] = supply;
    else state.supplies.unshift(supply);
    saveState();
    renderAll();
    resetSupplyForm();
    showMessage("s_ok", index >= 0 ? "Insumo actualizado." : "Insumo guardado.", "success");
  });
}

function collectSupplyForm() {
  const current = state.supplies.find(item => item.id === state.editing.supplyId);
  const mode = state.ui.supplyMode === "NON_DISPOSABLE" ? "NON_DISPOSABLE" : "DISPOSABLE";
  return {
    id: state.editing.supplyId || uid(),
    createdAt: current?.createdAt || nowText(),
    updatedAt: nowText(),
    mode,
    name: $("#s_name").value.trim(),
    acquired: $("#s_acquired").value,
    presentation: $("#s_presentation").value.trim(),
    qty: $("#s_qty").value.trim(),
    price: $("#s_price").value.trim(),
    unitCost: $("#s_unitCost").value.trim(),
    costAcq: $("#s_costAcq").value.trim(),
    lifeMonths: $("#s_lifeMonths").value.trim(),
    estimatedUses: $("#s_estimatedUses").value.trim(),
    costMonth: $("#s_costMonth").value.trim(),
    costUse: $("#s_costUse").value.trim(),
    notes: $("#s_notes").value.trim(),
    ticketPhoto: state.media.supplyTicketPhoto || null
  };
}

function resetSupplyForm() {
  $("#supplyForm")?.reset();
  state.editing.supplyId = null;
  state.media.supplyTicketPhoto = null;
  renderSupplyPhoto();
  calcSupplyCosts();
}

function renderSupplyList() {
  const box = $("#s_list");
  const term = $("#s_search")?.value.trim().toLowerCase() || "";
  const items = state.supplies.filter(item => [item.name, item.presentation, item.notes].join(" ").toLowerCase().includes(term));
  $("#s_count").textContent = `${state.supplies.length}`;
  if (!items.length) {
    box.innerHTML = '<div class="empty-state">Sin insumos registrados.</div>';
    return;
  }
  box.innerHTML = "";
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.name)}</h3>
      <div class="meta">${escapeHtml(item.mode === "NON_DISPOSABLE" ? "No desechable" : "Desechable")}</div>
      <div class="line"><b>Presentación:</b> ${escapeHtml(item.presentation || "")}</div>
      <div class="line"><b>Costo:</b> ${money(item.mode === "NON_DISPOSABLE" ? item.costAcq : item.price)}</div>
      <div class="line"><b>Costo por uso:</b> ${money(item.costUse || item.unitCost || 0)}</div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small" type="button" data-action="edit">Editar</button>
        <button class="btn small bad" type="button" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      state.editing.supplyId = item.id;
      state.ui.supplyMode = item.mode;
      renderSupplyMode();
      Object.entries({
        s_name: item.name,
        s_acquired: item.acquired,
        s_presentation: item.presentation,
        s_qty: item.qty,
        s_price: item.price,
        s_unitCost: item.unitCost,
        s_costAcq: item.costAcq,
        s_lifeMonths: item.lifeMonths,
        s_estimatedUses: item.estimatedUses,
        s_costMonth: item.costMonth,
        s_costUse: item.costUse,
        s_notes: item.notes
      }).forEach(([id, value]) => { if ($("#" + id)) $("#" + id).value = value || ""; });
      state.media.supplyTicketPhoto = item.ticketPhoto || null;
      renderSupplyPhoto();
      activateTab("supplies");
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.supplies = state.supplies.filter(supply => supply.id !== item.id);
      saveState();
      renderAll();
    });
    box.appendChild(div);
  });
}

/* =========================================================
   PROCEDIMIENTOS
========================================================= */
function currentProcedureProducer() {
  return getProducerById($("#p_producer").value) || null;
}

function renderProcedureProducerSelect() {
  const select = $("#p_producer");
  if (!select) return;
  select.innerHTML = '<option value="">— Selecciona productor(a) —</option>' + state.producers.map(producer => `<option value="${producer.id}">${escapeHtml(producerLabel(producer))}</option>`).join("");
  if (state.selectedProducerId) select.value = state.selectedProducerId;
  renderProcedureAnimalOptions();
  renderProcedureResourceOptions();
}

function renderProcedureAnimalOptions() {
  const select = $("#p_animalGroup");
  const producer = currentProcedureProducer();
  select.innerHTML = '<option value="">— Selecciona grupo animal —</option>';
  if (!producer) return;
  ensureProducerStructures(producer);
  producer.animals.forEach(animal => {
    select.insertAdjacentHTML("beforeend", `<option value="${animal.id}">${escapeHtml(animalLabel(animal))}</option>`);
  });
}

function renderProcedureResourceOptions() {
  ["#p_medSelect", "#p_vaccineSelect"].forEach(sel => {
    const select = $(sel);
    if (!select) return;
    select.innerHTML = '<option value="">— Selecciona —</option>';
    state.meds.forEach(item => {
      select.insertAdjacentHTML("beforeend", `<option value="${item.id}">${escapeHtml(medLabel(item) || item.vaccineBrand || "Medicamento/Vacuna")}</option>`);
    });
  });
  const supplySelect = $("#p_supplySelect");
  if (supplySelect) {
    supplySelect.innerHTML = '<option value="">— Selecciona —</option>';
    state.supplies.forEach(item => {
      supplySelect.insertAdjacentHTML("beforeend", `<option value="${item.id}">${escapeHtml(supplyLabel(item))}</option>`);
    });
  }
}

function calculateProcedureCharge() {
  const medsCost = procedureDraft.meds.reduce((acc, item) => acc + Number(item.totalCost || 0), 0);
  const vaxCost = procedureDraft.vaccines.reduce((acc, item) => acc + Number(item.totalCost || 0), 0);
  const supplyCost = procedureDraft.supplies.reduce((acc, item) => acc + Number(item.totalCost || 0), 0);
  const manual = Number($("#p_costTotal").value || 0);
  const total = medsCost + vaxCost + supplyCost + manual;
  $("#p_chargeCalculated").value = total.toFixed(2);
}

function addProcedureMedUse() {
  const med = state.meds.find(item => item.id === $("#p_medSelect").value);
  if (!med) return;
  const unitUsed = Number($("#p_medUnitUsed").value || 0);
  const doseKg = $("#p_medDoseKg").value.trim();
  procedureDraft.meds.push({
    medId: med.id,
    label: medLabel(med) || med.vaccineBrand || med.brand,
    doseKg,
    unitUsed,
    unitCost: Number(med.unitCost || 0),
    totalCost: (unitUsed * Number(med.unitCost || 0)).toFixed(2)
  });
  $("#p_medDoseKg").value = "";
  $("#p_medUnitUsed").value = "";
  renderProcedureUseLists();
}

function addProcedureVaccineUse() {
  const med = state.meds.find(item => item.id === $("#p_vaccineSelect").value);
  if (!med) return;
  const animalsApplied = Number($("#p_vaccineAnimalsApplied").value || 0);
  const coverage = Number(med.vaccineCoverageAnimals || 0);
  const price = Number(med.vaccinePrice || med.cost || 0);
  const estimatedCost = coverage > 0 ? (animalsApplied / coverage) * price : price;
  procedureDraft.vaccines.push({
    medId: med.id,
    label: med.vaccineBrand || med.brand || medLabel(med),
    animalsApplied,
    notes: $("#p_vaccineNotes").value.trim(),
    totalCost: estimatedCost.toFixed(2)
  });
  $("#p_vaccineAnimalsApplied").value = "";
  $("#p_vaccineNotes").value = "";
  renderProcedureUseLists();
}

function addProcedureSupplyUse() {
  const supply = state.supplies.find(item => item.id === $("#p_supplySelect").value);
  if (!supply) return;
  const qty = Number($("#p_supplyQtyUsed").value || 0);
  const costPer = Number(supply.mode === "NON_DISPOSABLE" ? (supply.costUse || 0) : (supply.unitCost || 0));
  procedureDraft.supplies.push({
    supplyId: supply.id,
    label: supply.name,
    qty,
    notes: $("#p_supplyNotes").value.trim(),
    totalCost: (qty * costPer).toFixed(2)
  });
  $("#p_supplyQtyUsed").value = "";
  $("#p_supplyNotes").value = "";
  renderProcedureUseLists();
}

function renderProcedureUseLists() {
  renderSimpleList("#p_medUseList", procedureDraft.meds, item => `
    <div class="line"><b>Medicamento:</b> ${escapeHtml(item.label)}</div>
    <div class="line"><b>Dosis/kg:</b> ${escapeHtml(item.doseKg)}</div>
    <div class="line"><b>Unidades usadas:</b> ${escapeHtml(item.unitUsed)}</div>
    <div class="line"><b>Costo:</b> ${money(item.totalCost)}</div>
  `, index => { procedureDraft.meds.splice(index, 1); renderProcedureUseLists(); });

  renderSimpleList("#p_vaccineUseList", procedureDraft.vaccines, item => `
    <div class="line"><b>Vacuna:</b> ${escapeHtml(item.label)}</div>
    <div class="line"><b>Aplicada a:</b> ${escapeHtml(item.animalsApplied)} animales</div>
    <div class="line"><b>Notas:</b> ${escapeHtml(item.notes)}</div>
    <div class="line"><b>Costo:</b> ${money(item.totalCost)}</div>
  `, index => { procedureDraft.vaccines.splice(index, 1); renderProcedureUseLists(); });

  renderSimpleList("#p_supplyUseList", procedureDraft.supplies, item => `
    <div class="line"><b>Insumo:</b> ${escapeHtml(item.label)}</div>
    <div class="line"><b>Cantidad usada:</b> ${escapeHtml(item.qty)}</div>
    <div class="line"><b>Notas:</b> ${escapeHtml(item.notes)}</div>
    <div class="line"><b>Costo:</b> ${money(item.totalCost)}</div>
  `, index => { procedureDraft.supplies.splice(index, 1); renderProcedureUseLists(); });

  calculateProcedureCharge();
}

async function bindMultiPhotoSet(config) {
  const { takeBtn, pickBtn, takeInput, pickInput, clearBtn, stateKey, previewId, hintId, emptyLabel } = config;
  const load = async (files) => {
    const arr = [];
    for (const file of Array.from(files || [])) arr.push(await fileToBase64(file));
    state.media[stateKey] = arr;
    renderMultiPhotoState(previewId, hintId, state.media[stateKey], emptyLabel, stateKey);
  };
  $(takeBtn)?.addEventListener("click", () => $(takeInput)?.click());
  $(pickBtn)?.addEventListener("click", () => $(pickInput)?.click());
  $(clearBtn)?.addEventListener("click", () => {
    state.media[stateKey] = [];
    renderMultiPhotoState(previewId, hintId, [], emptyLabel, stateKey);
  });
  [takeInput, pickInput].forEach(sel => {
    $(sel)?.addEventListener("change", async (event) => {
      await load(event.target.files);
      event.target.value = "";
    });
  });
}

function renderMultiPhotoState(previewId, hintId, files, emptyLabel, stateKey) {
  setMultiThumbs(previewId, files, emptyLabel);
  if ($(hintId)) $(hintId).textContent = files.length ? `${files.length} archivo(s) cargado(s).` : "Sin archivos cargados.";
  $(previewId)?.querySelectorAll(".mini-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      state.media[stateKey].splice(Number(btn.dataset.index), 1);
      renderMultiPhotoState(previewId, hintId, state.media[stateKey], emptyLabel, stateKey);
    });
  });
}

function bindProcedurePhotoSets() {
  bindMultiPhotoSet({
    takeBtn: "#p_cc_btnTake",
    pickBtn: "#p_cc_btnPick",
    takeInput: "#p_cc_take",
    pickInput: "#p_cc_pick",
    clearBtn: "#p_cc_btnClear",
    stateKey: "procedureCasePhotos",
    previewId: "p_cc_preview",
    hintId: "p_cc_hint",
    emptyLabel: "Sin<br/>caso"
  });
  bindMultiPhotoSet({
    takeBtn: "#p_nec_btnTake",
    pickBtn: "#p_nec_btnPick",
    takeInput: "#p_nec_take",
    pickInput: "#p_nec_pick",
    clearBtn: "#p_nec_btnClear",
    stateKey: "procedureNecropsyPhotos",
    previewId: "p_nec_preview",
    hintId: "p_nec_hint",
    emptyLabel: "Sin<br/>necropsia"
  });
  bindSingleFileButtons({
    takeBtn: "#p_charge_btnTake",
    pickBtn: "#p_charge_btnPick",
    takeInput: "#p_charge_take",
    pickInput: "#p_charge_pick",
    removeBtn: "#p_charge_btnClear",
    onLoad: async (file) => {
      state.media.procedureChargePhoto = await fileToBase64(file);
      setThumb("p_charge_preview", state.media.procedureChargePhoto, "Sin<br/>comprobante");
    },
    onClear: () => {
      state.media.procedureChargePhoto = null;
      setThumb("p_charge_preview", null, "Sin<br/>comprobante");
    }
  });
}

function collectProcedureForm() {
  const existing = state.procedures.find(item => item.id === state.editing.procedureId);
  return {
    id: state.editing.procedureId || uid(),
    createdAt: existing?.createdAt || nowText(),
    updatedAt: nowText(),
    date: $("#p_date").value,
    type: $("#p_type").value,
    place: $("#p_place").value.trim(),
    producerId: $("#p_producer").value,
    animalGroupId: $("#p_animalGroup").value,
    animalsQtyUsed: $("#p_animalsQtyUsed").value.trim(),
    species: $("#p_species").value.trim(),
    identification: $("#p_identification").value.trim(),
    weight: $("#p_weight").value.trim(),
    temperature: $("#p_temperature").value.trim(),
    generalState: $("#p_generalState").value.trim(),
    costTotal: $("#p_costTotal").value.trim(),
    chargeStatus: $("#p_chargeStatus").value,
    chargeNotes: $("#p_chargeNotes").value.trim(),
    notes: $("#p_notes").value.trim(),
    meds: [...procedureDraft.meds],
    vaccines: [...procedureDraft.vaccines],
    supplies: [...procedureDraft.supplies],
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
      photos: [...state.media.procedureCasePhotos]
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
      photos: [...state.media.procedureNecropsyPhotos]
    },
    chargeCalculated: $("#p_chargeCalculated").value.trim(),
    chargeManual: $("#p_chargeManual").value.trim(),
    chargeReason: $("#p_chargeReason").value.trim(),
    chargePhoto: state.media.procedureChargePhoto || null
  };
}

function resetProcedureForm() {
  $("#procedureForm")?.reset();
  state.editing.procedureId = null;
  procedureDraft.meds = [];
  procedureDraft.vaccines = [];
  procedureDraft.supplies = [];
  state.media.procedureCasePhotos = [];
  state.media.procedureNecropsyPhotos = [];
  state.media.procedureChargePhoto = null;
  renderProcedureUseLists();
  renderMultiPhotoState("p_cc_preview", "p_cc_hint", [], "Sin<br/>caso", "procedureCasePhotos");
  renderMultiPhotoState("p_nec_preview", "p_nec_hint", [], "Sin<br/>necropsia", "procedureNecropsyPhotos");
  setThumb("p_charge_preview", null, "Sin<br/>comprobante");
  if (state.selectedProducerId) $("#p_producer").value = state.selectedProducerId;
  renderProcedureAnimalOptions();
}

function procedureWordHtml(item) {
  const producer = getProducerById(item.producerId);
  const animal = producer?.animals?.find(a => a.id === item.animalGroupId);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Procedimiento</title></head><body>
    <h1>Procedimiento ${escapeHtml(item.type || "")}</h1>
    <p><b>Fecha:</b> ${escapeHtml(item.date || "")}</p>
    <p><b>Productor(a):</b> ${escapeHtml(producer?.basic?.name || "")}</p>
    <p><b>Grupo animal:</b> ${escapeHtml(animalLabel(animal) || item.species || "")}</p>
    <p><b>Cantidad aplicada:</b> ${escapeHtml(item.animalsQtyUsed || "")}</p>
    <p><b>Cobro calculado:</b> ${escapeHtml(item.chargeCalculated || "")}</p>
    <p><b>Estatus de cobro:</b> ${escapeHtml(item.chargeStatus || "")}</p>
    <h2>Medicamentos</h2>
    <ul>${item.meds.map(x => `<li>${escapeHtml(x.label)} - ${escapeHtml(x.unitUsed)} - ${escapeHtml(x.totalCost)}</li>`).join("") || "<li>Sin registros</li>"}</ul>
    <h2>Vacunas</h2>
    <ul>${item.vaccines.map(x => `<li>${escapeHtml(x.label)} - ${escapeHtml(x.animalsApplied)} - ${escapeHtml(x.totalCost)}</li>`).join("") || "<li>Sin registros</li>"}</ul>
    <h2>Insumos</h2>
    <ul>${item.supplies.map(x => `<li>${escapeHtml(x.label)} - ${escapeHtml(x.qty)} - ${escapeHtml(x.totalCost)}</li>`).join("") || "<li>Sin registros</li>"}</ul>
    <h2>Notas</h2>
    <p>${escapeHtml(item.notes || "")}</p>
  </body></html>`;
}

function renderProcedureList() {
  const box = $("#p_list");
  const term = $("#p_search")?.value.trim().toLowerCase() || "";
  const items = state.procedures.filter(item => JSON.stringify(item).toLowerCase().includes(term));
  $("#p_count").textContent = `${state.procedures.length}`;
  if (!items.length) {
    box.innerHTML = '<div class="empty-state">Sin procedimientos registrados.</div>';
    return;
  }
  box.innerHTML = "";
  items.forEach(item => {
    const producer = getProducerById(item.producerId);
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.type || "Procedimiento")}</h3>
      <div class="meta">${escapeHtml([item.date, producer?.basic?.name, item.place].filter(Boolean).join(" · "))}</div>
      <div class="line"><b>Animales aplicados:</b> ${escapeHtml(item.animalsQtyUsed || "0")}</div>
      <div class="line"><b>Cobro calculado:</b> ${money(item.chargeCalculated || 0)}</div>
      <div class="line"><b>Estatus:</b> ${escapeHtml(item.chargeStatus || "")}</div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small" type="button" data-action="edit">Editar</button>
        <button class="btn small ghost" type="button" data-action="word">📄 Word</button>
        <button class="btn small bad" type="button" data-action="delete">Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => fillProcedureForm(item));
    div.querySelector('[data-action="word"]').addEventListener("click", () => downloadFile(`procedimiento-${item.id}.doc`, "\ufeff" + procedureWordHtml(item), "application/msword"));
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      state.procedures = state.procedures.filter(proc => proc.id !== item.id);
      saveState();
      renderAll();
    });
    box.appendChild(div);
  });
}

function fillProcedureForm(item) {
  state.editing.procedureId = item.id;
  Object.entries({
    p_date: item.date,
    p_type: item.type,
    p_place: item.place,
    p_costTotal: item.costTotal,
    p_producer: item.producerId,
    p_animalsQtyUsed: item.animalsQtyUsed,
    p_species: item.species,
    p_identification: item.identification,
    p_weight: item.weight,
    p_temperature: item.temperature,
    p_generalState: item.generalState,
    p_chargeStatus: item.chargeStatus,
    p_chargeNotes: item.chargeNotes,
    p_notes: item.notes,
    p_cc_reason: item.caseClinical?.reason,
    p_cc_anamnesis: item.caseClinical?.anamnesis,
    p_cc_bodyCondition: item.caseClinical?.bodyCondition,
    p_cc_mucosa: item.caseClinical?.mucosa,
    p_cc_tllc: item.caseClinical?.tllc,
    p_cc_hydration: item.caseClinical?.hydration,
    p_cc_fc: item.caseClinical?.fc,
    p_cc_fr: item.caseClinical?.fr,
    p_cc_temp: item.caseClinical?.temp,
    p_cc_weight2: item.caseClinical?.weight,
    p_cc_exam: item.caseClinical?.exam,
    p_cc_presumptiveDx: item.caseClinical?.presumptiveDx,
    p_cc_treatment: item.caseClinical?.treatment,
    p_cc_recommendations: item.caseClinical?.recommendations,
    p_cc_followup: item.caseClinical?.followup,
    p_nec_idAnimal: item.necropsy?.idAnimal,
    p_nec_species: item.necropsy?.species,
    p_nec_breed: item.necropsy?.breed,
    p_nec_sex: item.necropsy?.sex,
    p_nec_age: item.necropsy?.age,
    p_nec_sterilized: item.necropsy?.sterilized,
    p_nec_color: item.necropsy?.color,
    p_nec_weight: item.necropsy?.weight,
    p_nec_birthDate: item.necropsy?.birthDate,
    p_nec_deathDate: item.necropsy?.deathDate,
    p_nec_timeDeathNec: item.necropsy?.timeDeathNec,
    p_nec_sender: item.necropsy?.sender,
    p_nec_caseNumber: item.necropsy?.caseNumber,
    p_nec_clinicalDx: item.necropsy?.clinicalDx,
    p_nec_additionalData: item.necropsy?.additionalData,
    p_nec_externalInspection: item.necropsy?.externalInspection,
    p_nec_primaryIncision: item.necropsy?.primaryIncision,
    p_nec_secondaryIncision: item.necropsy?.secondaryIncision,
    p_nec_organExtraction: item.necropsy?.organExtraction,
    p_nec_respiratory: item.necropsy?.respiratory,
    p_nec_heart: item.necropsy?.heart,
    p_nec_spleen: item.necropsy?.spleen,
    p_nec_kidneys: item.necropsy?.kidneys,
    p_nec_stomach: item.necropsy?.stomach,
    p_nec_preliminaryReport: item.necropsy?.preliminaryReport,
    p_nec_morphDx: item.necropsy?.morphDx,
    p_nec_finalDx: item.necropsy?.finalDx,
    p_nec_comments: item.necropsy?.comments,
    p_nec_biblioSummary: item.necropsy?.biblioSummary,
    p_nec_bibliography: item.necropsy?.bibliography,
    p_chargeCalculated: item.chargeCalculated,
    p_chargeManual: item.chargeManual,
    p_chargeReason: item.chargeReason
  }).forEach(([id, value]) => { if ($("#" + id)) $("#" + id).value = value || ""; });
  renderProcedureAnimalOptions();
  $("#p_animalGroup").value = item.animalGroupId || "";
  procedureDraft.meds = [...(item.meds || [])];
  procedureDraft.vaccines = [...(item.vaccines || [])];
  procedureDraft.supplies = [...(item.supplies || [])];
  state.media.procedureCasePhotos = [...(item.caseClinical?.photos || [])];
  state.media.procedureNecropsyPhotos = [...(item.necropsy?.photos || [])];
  state.media.procedureChargePhoto = item.chargePhoto || null;
  renderProcedureUseLists();
  renderMultiPhotoState("p_cc_preview", "p_cc_hint", state.media.procedureCasePhotos, "Sin<br/>caso", "procedureCasePhotos");
  renderMultiPhotoState("p_nec_preview", "p_nec_hint", state.media.procedureNecropsyPhotos, "Sin<br/>necropsia", "procedureNecropsyPhotos");
  setThumb("p_charge_preview", state.media.procedureChargePhoto, "Sin<br/>comprobante");
  activateTab("procedures");
}

function bindProceduresSection() {
  bindProcedurePhotoSets();
  $("#p_producer")?.addEventListener("change", () => {
    state.selectedProducerId = $("#p_producer").value || null;
    renderProcedureAnimalOptions();
  });
  $("#p_addMedUse")?.addEventListener("click", addProcedureMedUse);
  $("#p_addVaccineUse")?.addEventListener("click", addProcedureVaccineUse);
  $("#p_addSupplyUse")?.addEventListener("click", addProcedureSupplyUse);
  $("#p_costTotal")?.addEventListener("input", calculateProcedureCharge);
  $("#p_btnExportJson")?.addEventListener("click", () => downloadFile("procedimientos-app-rural.json", JSON.stringify(state.procedures, null, 2), "application/json;charset=utf-8;"));
  $("#p_btnImportJson")?.addEventListener("click", () => $("#p_importFile")?.click());
  $("#p_importFile")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.procedures = JSON.parse(await file.text());
    saveState();
    renderAll();
    event.target.value = "";
  });
  $("#p_btnExportWord")?.addEventListener("click", () => {
    const current = state.procedures.find(item => item.id === state.editing.procedureId);
    if (current) downloadFile(`procedimiento-${current.id}.doc`, "\ufeff" + procedureWordHtml(current), "application/msword");
  });
  $("#p_search")?.addEventListener("input", renderProcedureList);
  $("#p_clear")?.addEventListener("click", resetProcedureForm);
  $("#procedureForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const procedure = collectProcedureForm();
    if (!procedure.producerId || !procedure.type) {
      showMessage("p_err", "Debes seleccionar productor(a) y tipo de procedimiento.", "error");
      return;
    }
    const index = state.procedures.findIndex(item => item.id === procedure.id);
    if (index >= 0) state.procedures[index] = procedure;
    else state.procedures.unshift(procedure);
    saveState();
    renderAll();
    resetProcedureForm();
    showMessage("p_ok", index >= 0 ? "Procedimiento actualizado." : "Procedimiento guardado.", "success");
  });
}

/* =========================================================
   RENDER / INIT
========================================================= */
function renderAll() {
  renderProducerList();
  renderAnimalsProducerSelect();
  renderMedMode();
  renderMedPhotos();
  renderMedList();
  renderSupplyMode();
  renderSupplyPhoto();
  renderSupplyList();
  renderProcedureProducerSelect();
  renderProcedureUseLists();
  renderProcedureList();
  updateProducerConditionalFields();
}

function init() {
  loadState();
  bindTabs();
  bindProducerClassification();
  bindProducerPhoto();
  bindProducerLocation();
  bindProducerSection();
  bindAnimalsSection();
  bindMedsSection();
  bindSupplySection();
  bindProceduresSection();

  setCheckedRadio("sabeLeer", "SI");
  setCheckedRadio("sabeEscribir", "SI");
  setFamilyRows([]);
  renderAnimalPhotoPreview();
  renderMedPhotos();
  renderSupplyPhoto();
  renderMultiPhotoState("p_cc_preview", "p_cc_hint", [], "Sin<br/>caso", "procedureCasePhotos");
  renderMultiPhotoState("p_nec_preview", "p_nec_hint", [], "Sin<br/>necropsia", "procedureNecropsyPhotos");
  setThumb("p_charge_preview", null, "Sin<br/>comprobante");

  if (!state.selectedProducerId && state.producers.length) {
    state.selectedProducerId = state.producers[0].id;
  }

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
