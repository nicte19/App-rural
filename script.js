const STORAGE_KEY = "app_rural_fusion_full_v4";

const state = {
  producers: [],
  meds: [],
  vaccines: [],
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
    procedureId: null
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

/* =========================================================
   HELPERS
========================================================= */
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

function safeText(v) {
  return v == null ? "" : String(v);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ownerLabel(owner) {
  if (owner === "DRA_ANA_ROSA") return "Dra. Ana Rosa";
  if (owner === "SERVICIOS") return "Servicios";
  if (owner === "OTRO") return "Otro";
  return "";
}

function procedureTypeLabel(v) {
  if (v === "PREVENTIVA") return "Medicina preventiva";
  if (v === "ZOOTECNIA") return "Asesoría zootécnica";
  if (v === "CASO_CLINICO") return "Caso clínico";
  if (v === "NECROPSIA") return "Necropsia";
  return "";
}

function classificationLabel(v) {
  if (v === "TRABAJAR") return "Sí trabajar";
  if (v === "PENDIENTE") return "Aún no sé";
  if (v === "NO_TRABAJAR") return "No trabajar";
  return "";
}

function money(v) {
  const n = Number(v || 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(n);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    state.producers = Array.isArray(parsed.producers) ? parsed.producers : [];
    state.meds = Array.isArray(parsed.meds) ? parsed.meds : [];
    state.vaccines = Array.isArray(parsed.vaccines) ? parsed.vaccines : [];
    state.supplies = Array.isArray(parsed.supplies) ? parsed.supplies : [];
    state.procedures = Array.isArray(parsed.procedures) ? parsed.procedures : [];
    state.selectedProducerId = parsed.selectedProducerId || null;

    if (parsed.ui) {
      state.ui.medMode = parsed.ui.medMode || "MANUAL";
      state.ui.supplyMode = parsed.ui.supplyMode || "DISPOSABLE";
    }
  } catch (err) {
    console.error("Error cargando state:", err);
  }
}

function showMessage(id, text, kind = "help") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.className = kind;
  el.style.display = text ? "block" : "none";
}

function resetMessages(ids = []) {
  ids.forEach(id => showMessage(id, "", "help"));
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function setThumb(id, dataUrl, emptyHtml = "Sin<br/>foto") {
  const el = document.getElementById(id);
  if (!el) return;
  if (!dataUrl) {
    el.innerHTML = `<span>${emptyHtml}</span>`;
    return;
  }
  el.innerHTML = `<img src="${dataUrl}" alt="preview" />`;
}

function openUrl(url) {
  if (!url) return;
  let finalUrl = String(url).trim();
  if (!finalUrl) return;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = "https://" + finalUrl;
  }
  window.open(finalUrl, "_blank", "noopener,noreferrer");
}

function getCheckedRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function setCheckedRadio(name, value) {
  $$(`input[name="${name}"]`).forEach(r => {
    r.checked = r.value === value;
  });
}

function getSelectedOptions(selectEl) {
  return Array.from(selectEl?.selectedOptions || []).map(o => o.value);
}

function setSelectedOptions(selectEl, values = []) {
  Array.from(selectEl?.options || []).forEach(opt => {
    opt.selected = values.includes(opt.value);
  });
}

function resetMultiSelect(selectEl) {
  Array.from(selectEl?.options || []).forEach(opt => opt.selected = false);
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
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
  downloadFile(filename, "\ufeff" + csv, "text/csv;charset=utf-8;");
}

function getSelectedProducer() {
  return state.producers.find(p => p.id === state.selectedProducerId) || null;
}

function getProducerById(id) {
  return state.producers.find(p => p.id === id) || null;
}

function ensureQuestionnaire(prod) {
  if (!prod.animalQuestionnaire) {
    prod.animalQuestionnaire = {
      diseases: [],
      vaccines: [],
      dewormings: [],
      traditional: [],
      genderAnimals: [],
      genderActivities: [],
      importantAnimals: [],
      importantAnimalsWhy: "",
      hasMilpa: "",
      whatSows: "",
      forageShortage: "",
      whereAnimalsStay: "",
      vaccinatesAny: "",
      dewormsAny: "",
      changesDewormer: "",
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
  }
  return prod.animalQuestionnaire;
}

function producerPeopleOptions(prod, includeVet = false) {
  if (!prod) return [];
  const arr = [];
  const mainName = (prod.basic?.name || "").trim();
  arr.push(mainName ? `Productor(a): ${mainName}` : "Productor(a)");

  (prod.family || []).forEach(f => {
    const label = [f.name, f.relation].filter(Boolean).join(" - ").trim();
    if (label) arr.push(label);
  });

  if (includeVet) arr.push("Veterinario(a)");
  arr.push("Otro");
  return [...new Set(arr)];
}

function animalGroupLabel(a) {
  return `${a.species || ""}${a.race ? " - " + a.race : ""}${a.quantity ? " (" + a.quantity + ")" : ""}`;
}

function producerHasBirds(prod) {
  return (prod?.animals || []).some(a => {
    const t = (a.species || "").toLowerCase();
    return (
      t.includes("gallina") ||
      t.includes("gallo") ||
      t.includes("guajolote") ||
      t.includes("pollo") ||
      t.includes("ave") ||
      t.includes("pato") ||
      t.includes("codorniz")
    );
  });
}

/* =========================================================
   TABS
========================================================= */
function activateTab(name) {
  const map = {
    producer: ["#tabProducer", "#pageProducer"],
    animals: ["#tabAnimals", "#pageAnimals"],
    meds: ["#tabMeds", "#pageMeds"],
    supplies: ["#tabSupplies", "#pageSupplies"],
    procedures: ["#tabProcedures", "#pageProcedures"]
  };

  Object.values(map).forEach(([b, p]) => {
    $(b)?.classList.remove("active");
    $(p)?.classList.remove("active");
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
   PRODUCTOR/A
========================================================= */
function updateProducerConditionalFields() {
  const pertenencia = $("#pertenenciaIndigena")?.value || "";
  $("#grupoIndigenaYoWrap").style.display = pertenencia === "YO" ? "block" : "none";
  $("#grupoIndigenaFamiliarWrap").style.display = pertenencia === "FAMILIAR" ? "grid" : "none";

  const lengua = $("#lenguaIndigenaTipo")?.value || "";
  $("#lenguaYoWrap").style.display = lengua === "YO" ? "block" : "none";
  $("#lenguaFamiliarWrap").style.display = lengua === "FAMILIAR" ? "grid" : "none";

  $("#alertaWrap").style.display = getProducerClassification() === "NO_TRABAJAR" ? "block" : "none";
}

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

function familyRowTemplate(item = {}) {
  return `
    <tr>
      <td><input type="text" class="fam-name" value="${escapeHtml(item.name || "")}" placeholder="Nombre" /></td>
      <td><input type="text" class="fam-relation" value="${escapeHtml(item.relation || "")}" placeholder="Relación" /></td>
      <td><input type="text" class="fam-occupation" value="${escapeHtml(item.occupation || item.job || "")}" placeholder="Ocupación" /></td>
      <td><input type="number" min="0" step="1" class="fam-age" value="${escapeHtml(item.age || "")}" placeholder="Edad" /></td>
      <td><button class="btn small bad fam-remove" type="button">✖</button></td>
    </tr>
  `;
}

function addFamilyRow(item = {}) {
  const tbody = $("#familyTbody");
  if (!tbody) return;
  tbody.insertAdjacentHTML("beforeend", familyRowTemplate(item));
  const row = tbody.lastElementChild;
  row.querySelector(".fam-remove")?.addEventListener("click", () => row.remove());
}

function setFamilyRows(items = []) {
  const tbody = $("#familyTbody");
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
    .filter(x => x.name || x.relation || x.occupation || x.age);
}

async function onProducerPhotoSelected(file) {
  if (!file) return;
  state.media.producerPhoto = await fileToBase64(file);
  setThumb("photoPreview", state.media.producerPhoto, "Sin<br/>foto");
}

function bindProducerPhoto() {
  $("#btnTakePhoto")?.addEventListener("click", () => $("#fotoTomar")?.click());
  $("#btnPickPhoto")?.addEventListener("click", () => $("#fotoElegir")?.click());

  $("#fotoTomar")?.addEventListener("change", async (e) => {
    await onProducerPhotoSelected(e.target.files?.[0]);
    e.target.value = "";
  });

  $("#fotoElegir")?.addEventListener("change", async (e) => {
    await onProducerPhotoSelected(e.target.files?.[0]);
    e.target.value = "";
  });

  $("#btnRemovePhoto")?.addEventListener("click", () => {
    state.media.producerPhoto = null;
    setThumb("photoPreview", null, "Sin<br/>foto");
  });
}

function bindProducerLocation() {
  const buildMapsUrl = () => {
    const lat = $("#lat").value.trim();
    const lng = $("#lng").value.trim();
    if (!lat || !lng) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  };

  $("#btnGeo")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showMessage("err", "Tu navegador no soporta geolocalización.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        $("#lat").value = pos.coords.latitude.toFixed(7);
        $("#lng").value = pos.coords.longitude.toFixed(7);
        $("#mapsUrl").value = buildMapsUrl();
        showMessage("ok", "Ubicación cargada y enlace de Google Maps generado.", "success");
      },
      (err) => showMessage("err", `No se pudo obtener la ubicación. ${err?.message || ""}`.trim(), "error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  $("#btnGenMaps")?.addEventListener("click", () => {
    const url = buildMapsUrl();
    if (!url) {
      showMessage("err", "Primero captura latitud y longitud.", "error");
      return;
    }
    $("#mapsUrl").value = url;
    showMessage("ok", "Link de Maps generado.", "success");
  });

  $("#btnOpenMaps")?.addEventListener("click", () => {
    const url = $("#mapsUrl").value.trim() || buildMapsUrl();
    if (!url) {
      showMessage("err", "No hay link de Maps.", "error");
      return;
    }
    $("#mapsUrl").value = url;
    openUrl(url);
  });

  $("#btnClearLocation")?.addEventListener("click", () => {
    $("#lat").value = "";
    $("#lng").value = "";
    $("#mapsUrl").value = "";
  });
}

function resetProducerForm() {
  $("#producerForm")?.reset();
  state.editing.producerId = null;
  state.media.producerPhoto = null;

  setCheckedRadio("sabeLeer", "SI");
  setCheckedRadio("sabeEscribir", "SI");
  setProducerClassification("TRABAJAR");
  setFamilyRows([]);

  $("#formTitle").textContent = "Nuevo productor(a)";
  $("#btnCancelEdit").style.display = "none";
  setThumb("photoPreview", null, "Sin<br/>foto");
  resetMessages(["msg", "err", "ok"]);
  updateProducerConditionalFields();
}

function collectProducerForm() {
  const old = state.editing.producerId ? getProducerById(state.editing.producerId) : null;

  return {
    id: state.editing.producerId || uid(),
    createdAt: old?.createdAt || nowText(),
    updatedAt: nowText(),

    basic: {
      name: $("#nombre").value.trim(),
      age: $("#edad").value.trim(),
      sex: $("#sexo").value,
      maritalStatus: $("#estadoCivil").value,
      phone: $("#celular").value.trim(),
      locality: $("#localidad").value.trim(),
      municipality: $("#municipio").value.trim(),
      stateName: $("#estado").value.trim(),
      schooling: $("#escolaridad").value,
      schoolingOther: $("#escolaridadOtro").value.trim(),
      canRead: getCheckedRadio("sabeLeer"),
      canWrite: getCheckedRadio("sabeEscribir"),
      indigenousType: $("#pertenenciaIndigena").value,
      indigenousSelf: $("#grupoIndigenaYo").value.trim(),
      indigenousFamilyWho: $("#grupoIndigenaFamiliarQuien").value.trim(),
      indigenousFamilyGroup: $("#grupoIndigenaFamiliarCual").value.trim(),
      languageType: $("#lenguaIndigenaTipo").value,
      languageSelf: $("#lenguaYo").value.trim(),
      languageFamilyWho: $("#lenguaFamiliarQuien").value.trim(),
      languageFamilyWhich: $("#lenguaFamiliarCual").value.trim(),
      schedule: $("#horario").value.trim(),
      peopleAtHome: $("#personasEnCasa").value.trim()
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
    animals: old?.animals || [],
    animalQuestionnaire: old?.animalQuestionnaire || null
  };
}

function saveProducer(e) {
  e.preventDefault();
  resetMessages(["msg", "err", "ok"]);

  const prod = collectProducerForm();
  if (!prod.basic.name) {
    showMessage("err", "El nombre es obligatorio.", "error");
    return;
  }

  const idx = state.producers.findIndex(p => p.id === prod.id);
  if (idx >= 0) {
    state.producers[idx] = prod;
    showMessage("ok", "Productor(a) actualizado.", "success");
  } else {
    state.producers.unshift(prod);
    showMessage("ok", "Productor(a) guardado.", "success");
  }

  state.selectedProducerId = prod.id;
  saveState();
  renderProducerList();
  renderAnimalsProducerSelect();
  renderProcedureProducerSelect();
  resetProducerForm();
}

function fillProducerForm(prod) {
  state.editing.producerId = prod.id;

  $("#formTitle").textContent = "Editar productor(a)";
  $("#btnCancelEdit").style.display = "inline-flex";

  $("#nombre").value = prod.basic?.name || "";
  $("#edad").value = prod.basic?.age || "";
  $("#sexo").value = prod.basic?.sex || "";
  $("#estadoCivil").value = prod.basic?.maritalStatus || "";
  $("#celular").value = prod.basic?.phone || "";
  $("#localidad").value = prod.basic?.locality || "";
  $("#municipio").value = prod.basic?.municipality || "";
  $("#estado").value = prod.basic?.stateName || "";
  $("#escolaridad").value = prod.basic?.schooling || "";
  $("#escolaridadOtro").value = prod.basic?.schoolingOther || "";
  setCheckedRadio("sabeLeer", prod.basic?.canRead || "SI");
  setCheckedRadio("sabeEscribir", prod.basic?.canWrite || "SI");
  $("#pertenenciaIndigena").value = prod.basic?.indigenousType || "";
  $("#grupoIndigenaYo").value = prod.basic?.indigenousSelf || "";
  $("#grupoIndigenaFamiliarQuien").value = prod.basic?.indigenousFamilyWho || "";
  $("#grupoIndigenaFamiliarCual").value = prod.basic?.indigenousFamilyGroup || "";
  $("#lenguaIndigenaTipo").value = prod.basic?.languageType || "";
  $("#lenguaYo").value = prod.basic?.languageSelf || "";
  $("#lenguaFamiliarQuien").value = prod.basic?.languageFamilyWho || "";
  $("#lenguaFamiliarCual").value = prod.basic?.languageFamilyWhich || "";
  $("#horario").value = prod.basic?.schedule || "";
  $("#personasEnCasa").value = prod.basic?.peopleAtHome || "";

  $("#lat").value = prod.location?.lat || "";
  $("#lng").value = prod.location?.lng || "";
  $("#mapsUrl").value = prod.location?.mapsUrl || "";

  setProducerClassification(prod.classification?.status || "TRABAJAR");
  $("#alerta").value = prod.classification?.noReason || "";
  $("#notaExtraPersona").value = prod.classification?.extraNote || "";
  $("#notas").value = prod.notes || "";

  state.media.producerPhoto = prod.photo || null;
  setThumb("photoPreview", state.media.producerPhoto, "Sin<br/>foto");
  setFamilyRows(prod.family || []);
  updateProducerConditionalFields();
}

function deleteProducer(id) {
  const prod = getProducerById(id);
  if (!prod) return;
  if (!confirm(`¿Eliminar a "${prod.basic?.name || "este productor(a)"}"?`)) return;

  state.producers = state.producers.filter(p => p.id !== id);
  if (state.selectedProducerId === id) {
    state.selectedProducerId = state.producers[0]?.id || null;
  }
  if (state.editing.producerId === id) resetProducerForm();

  saveState();
  renderProducerList();
  renderAnimalsProducerSelect();
  renderProcedureProducerSelect();
}

function producerWordHtml(prod) {
  const animals = prod.animals || [];
  const fam = prod.family || [];
  const q = ensureQuestionnaire(prod);

  const famRows = fam.map((f, i) => `
    <tr><td>${i + 1}</td><td>${escapeHtml(f.name)}</td><td>${escapeHtml(f.relation)}</td><td>${escapeHtml(f.occupation)}</td><td>${escapeHtml(f.age)}</td></tr>
  `).join("");

  const animalRows = animals.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(a.species)}</td>
      <td>${escapeHtml(a.race)}</td>
      <td>${escapeHtml(a.quantity)}</td>
      <td>${escapeHtml((a.owners || []).join(", "))}</td>
      <td>${escapeHtml((a.sellDecision || []).join(", "))}</td>
      <td>${escapeHtml((a.cleanFeedBy || []).join(", "))}</td>
      <td>${escapeHtml((a.function || []).join(", "))}</td>
      <td>${escapeHtml(a.installations)}</td>
      <td>${escapeHtml(a.feed)}</td>
    </tr>
  `).join("");

  return `
  <html><head><meta charset="utf-8">
  <style>
  body{font-family:Arial,sans-serif;font-size:11pt;color:#111}
  h1,h2{color:#111827}
  table{border-collapse:collapse;width:100%;margin-bottom:14px}
  th,td{border:1px solid #999;padding:6px;vertical-align:top}
  th{background:#eee}
  img{max-width:180px}
  </style></head><body>
    <h1>Expediente de productor(a)</h1>
    <h2>Datos básicos</h2>
    <p><b>Nombre:</b> ${escapeHtml(prod.basic?.name || "")}</p>
    <p><b>Edad:</b> ${escapeHtml(prod.basic?.age || "")}</p>
    <p><b>Sexo:</b> ${escapeHtml(prod.basic?.sex || "")}</p>
    <p><b>Estado civil:</b> ${escapeHtml(prod.basic?.maritalStatus || "")}</p>
    <p><b>Celular:</b> ${escapeHtml(prod.basic?.phone || "")}</p>
    <p><b>Localidad:</b> ${escapeHtml(prod.basic?.locality || "")}</p>
    <p><b>Municipio:</b> ${escapeHtml(prod.basic?.municipality || "")}</p>
    <p><b>Estado:</b> ${escapeHtml(prod.basic?.stateName || "")}</p>
    <p><b>Horario:</b> ${escapeHtml(prod.basic?.schedule || "")}</p>
    <p><b>Personas en casa:</b> ${escapeHtml(prod.basic?.peopleAtHome || "")}</p>
    <p><b>Clasificación:</b> ${escapeHtml(classificationLabel(prod.classification?.status))}</p>
    <p><b>Razón si no:</b> ${escapeHtml(prod.classification?.noReason || "")}</p>
    <p><b>Nota extra:</b> ${escapeHtml(prod.classification?.extraNote || "")}</p>
    <p><b>Notas generales:</b> ${escapeHtml(prod.notes || "")}</p>

    <h2>Ubicación</h2>
    <p><b>Latitud:</b> ${escapeHtml(prod.location?.lat || "")}</p>
    <p><b>Longitud:</b> ${escapeHtml(prod.location?.lng || "")}</p>
    <p><b>Maps:</b> ${escapeHtml(prod.location?.mapsUrl || "")}</p>

    <h2>Familia</h2>
    <table>
      <tr><th>#</th><th>Nombre</th><th>Relación</th><th>Ocupación</th><th>Edad</th></tr>
      ${famRows || `<tr><td colspan="5">Sin registros</td></tr>`}
    </table>

    <h2>Animales</h2>
    <table>
      <tr><th>#</th><th>Especie</th><th>Raza</th><th>Cantidad</th><th>Dueño/a</th><th>Decide venta</th><th>Limpia/alimenta</th><th>Función</th><th>Instalaciones</th><th>Alimentación</th></tr>
      ${animalRows || `<tr><td colspan="10">Sin registros</td></tr>`}
    </table>

    <h2>Cuestionario</h2>
    <p><b>Animales importantes:</b> ${escapeHtml((q.importantAnimals || []).join(", "))}</p>
    <p><b>¿Por qué son importantes?:</b> ${escapeHtml(q.importantAnimalsWhy || "")}</p>
    <p><b>¿Tiene milpa?:</b> ${escapeHtml(q.hasMilpa || "")}</p>
    <p><b>¿Qué siembra?:</b> ${escapeHtml(q.whatSows || "")}</p>
    <p><b>Escasez de forraje:</b> ${escapeHtml(q.forageShortage || "")}</p>

    ${prod.photo ? `<h2>Foto de la casa</h2><img src="${prod.photo}" />` : ""}
  </body></html>`;
}

function exportProducerWord(id) {
  const prod = getProducerById(id);
  if (!prod) return;
  const html = producerWordHtml(prod);
  downloadFile(`${(prod.basic?.name || "productor").replace(/[^\wáéíóúÁÉÍÓÚñÑ\- ]/g, "").trim() || "productor"}.doc`, "\ufeff" + html, "application/msword");
}

function exportProducersJSON() {
  downloadFile("productores.json", JSON.stringify(state.producers, null, 2), "application/json");
}

function importProducersJSON(file) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const parsed = JSON.parse(fr.result);
      if (!Array.isArray(parsed)) throw new Error();
      state.producers = parsed;
      state.selectedProducerId = state.producers[0]?.id || null;
      saveState();
      renderProducerList();
      renderAnimalsProducerSelect();
      renderProcedureProducerSelect();
      showMessage("ok", "Productores importados.", "success");
    } catch {
      showMessage("err", "No se pudo importar el JSON.", "error");
    }
  };
  fr.readAsText(file);
}

function renderProducerList() {
  const list = $("#producerList");
  const count = $("#count");
  list.innerHTML = "";
  count.textContent = String(state.producers.length);

  if (!state.producers.length) {
    list.innerHTML = `<div class="empty-state">No hay productores registrados todavía.</div>`;
    return;
  }

  state.producers.forEach(prod => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:flex-start;">
        <div>
          <h3>${escapeHtml(prod.basic?.name || "Sin nombre")}</h3>
          <div class="meta">📍 ${escapeHtml(prod.basic?.locality || "")}, ${escapeHtml(prod.basic?.municipality || "")}, ${escapeHtml(prod.basic?.stateName || "")}</div>
          <div class="row">
            <span class="badge">${escapeHtml(classificationLabel(prod.classification?.status))}</span>
            <span class="badge">👨‍👩‍👧‍👦 ${(prod.family || []).length} familiares</span>
            <span class="badge">🐾 ${(prod.animals || []).length} grupos</span>
          </div>
        </div>
        ${prod.photo ? `<div class="preview-mini"><img src="${prod.photo}" alt="foto"/></div>` : ""}
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small" type="button" data-action="select">✅ Seleccionar</button>
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small ghost" type="button" data-action="animals">🐾 Animales</button>
        <button class="btn small ghost" type="button" data-action="word">📄 Word</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;

    item.querySelector('[data-action="select"]').addEventListener("click", () => {
      state.selectedProducerId = prod.id;
      saveState();
      renderProducerList();
      renderAnimalsProducerSelect();
      renderProcedureProducerSelect();
    });
    item.querySelector('[data-action="edit"]').addEventListener("click", () => {
      fillProducerForm(prod);
      activateTab("producer");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    item.querySelector('[data-action="animals"]').addEventListener("click", () => {
      state.selectedProducerId = prod.id;
      saveState();
      renderAnimalsProducerSelect();
      activateTab("animals");
    });
    item.querySelector('[data-action="word"]').addEventListener("click", () => exportProducerWord(prod.id));
    item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteProducer(prod.id));
    list.appendChild(item);
  });
}

function wipeAll() {
  if (!confirm("Esto borrará TODO lo guardado localmente. ¿Continuar?")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function bindProducerSection() {
  bindProducerClassification();
  bindProducerPhoto();
  bindProducerLocation();

  $("#producerForm")?.addEventListener("submit", saveProducer);
  $("#btnReset")?.addEventListener("click", resetProducerForm);
  $("#btnCancelEdit")?.addEventListener("click", resetProducerForm);
  $("#btnAddFamily")?.addEventListener("click", () => addFamilyRow());
  $("#pertenenciaIndigena")?.addEventListener("change", updateProducerConditionalFields);
  $("#lenguaIndigenaTipo")?.addEventListener("change", updateProducerConditionalFields);

  $("#btnExport")?.addEventListener("click", exportProducersJSON);
  $("#btnImport")?.addEventListener("click", () => $("#importFile")?.click());
  $("#importFile")?.addEventListener("change", (e) => {
    importProducersJSON(e.target.files?.[0]);
    e.target.value = "";
  });
  $("#btnExportWordProducer")?.addEventListener("click", () => {
    if (!state.selectedProducerId) {
      showMessage("err", "Primero selecciona un productor(a).", "error");
      return;
    }
    exportProducerWord(state.selectedProducerId);
  });
  $("#btnWipe")?.addEventListener("click", wipeAll);
}

/* =========================================================
   ANIMALES
========================================================= */
function renderAnimalsProducerSelect() {
  const sel = $("#animalsProducerSelect");
  const hint = $("#animalsProducerHint");
  sel.innerHTML = `<option value="">— Selecciona productor/a —</option>`;

  state.producers.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.basic?.name || "Sin nombre";
    sel.appendChild(opt);
  });

  if (state.selectedProducerId) sel.value = state.selectedProducerId;
  const prod = getSelectedProducer();
  hint.textContent = prod ? `Trabajando con: ${prod.basic?.name || ""}` : "Primero selecciona un productor/a";

  renderAnimalPeopleSelects();
  renderAnimalBasedSelects();
  renderAnimalGroups();
  fillAnimalQuestionnaireFields();
}

function renderAnimalPeopleSelects() {
  const prod = getSelectedProducer();
  const normalPeople = producerPeopleOptions(prod, false);
  const withVet = producerPeopleOptions(prod, true);

  const currentOwners = getSelectedOptions($("#a_dueno"));
  const currentSell = getSelectedOptions($("#a_decideVenta"));
  const currentFeed = getSelectedOptions($("#a_limpiaAlimenta"));
  const currentVaxWho = $("#a_vaxWho")?.value || "";
  const currentDewormWho = $("#a_dewormWho")?.value || "";

  [["#a_dueno", normalPeople, currentOwners], ["#a_decideVenta", normalPeople, currentSell], ["#a_limpiaAlimenta", normalPeople, currentFeed]].forEach(([id, opts, vals]) => {
    const s = $(id);
    s.innerHTML = "";
    opts.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      s.appendChild(opt);
    });
    setSelectedOptions(s, vals);
  });

  [["#a_vaxWho", withVet, currentVaxWho], ["#a_dewormWho", withVet, currentDewormWho]].forEach(([id, opts, val]) => {
    const s = $(id);
    s.innerHTML = `<option value="">— Selecciona —</option>`;
    opts.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      s.appendChild(opt);
    });
    s.value = val || "";
  });
}

function renderAnimalBasedSelects() {
  const prod = getSelectedProducer();
  const labels = (prod?.animals || []).map(animalGroupLabel);

  [["#a_enfAnimal", false], ["#a_vaxAnimal", false], ["#a_dewormAnimal", false]].forEach(([id]) => {
    const s = $(id);
    const prev = s.value || "";
    s.innerHTML = `<option value="">— Selecciona —</option>`;
    labels.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      s.appendChild(opt);
    });
    s.value = prev;
  });

  const imp = $("#a_animalesImportantes");
  const prevImp = getSelectedOptions(imp);
  imp.innerHTML = "";
  labels.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    imp.appendChild(opt);
  });
  setSelectedOptions(imp, prevImp);

  $("#a_interestBirdsYesWrap").style.display = producerHasBirds(prod) ? "block" : "none";
  $("#a_interestBirdsNoWrap").style.display = producerHasBirds(prod) ? "none" : "block";
}

async function bindAnimalPhotos() {
  $("#a_btnInstTake")?.addEventListener("click", () => $("#a_instTake")?.click());
  $("#a_btnInstPick")?.addEventListener("click", () => $("#a_instPick")?.click());
  $("#a_btnInstClear")?.addEventListener("click", () => {
    state.media.animalTempPhotos = [];
    renderAnimalTempPhotos();
  });

  $("#a_instTake")?.addEventListener("change", async (e) => {
    for (const f of Array.from(e.target.files || [])) {
      state.media.animalTempPhotos.push(await fileToBase64(f));
    }
    renderAnimalTempPhotos();
    e.target.value = "";
  });

  $("#a_instPick")?.addEventListener("change", async (e) => {
    for (const f of Array.from(e.target.files || [])) {
      state.media.animalTempPhotos.push(await fileToBase64(f));
    }
    renderAnimalTempPhotos();
    e.target.value = "";
  });
}

function renderAnimalTempPhotos() {
  const box = $("#a_instPreview");
  const hint = $("#a_instHint");
  box.innerHTML = "";
  if (!state.media.animalTempPhotos.length) {
    hint.textContent = "Sin fotos todavía.";
    return;
  }
  hint.textContent = `${state.media.animalTempPhotos.length} foto(s) cargada(s).`;

  state.media.animalTempPhotos.forEach((src, i) => {
    const div = document.createElement("div");
    div.className = "preview-mini";
    div.innerHTML = `<img src="${src}" alt="animal"><button class="mini-remove" type="button">✖</button>`;
    div.querySelector("button").addEventListener("click", () => {
      state.media.animalTempPhotos.splice(i, 1);
      renderAnimalTempPhotos();
    });
    box.appendChild(div);
  });
}

function collectAnimalGroupForm() {
  return {
    id: uid(),
    species: $("#a_especie").value.trim(),
    race: $("#a_raza").value.trim(),
    quantity: $("#a_cantidad").value.trim(),
    owners: getSelectedOptions($("#a_dueno")),
    sellDecision: getSelectedOptions($("#a_decideVenta")),
    cleanFeedBy: getSelectedOptions($("#a_limpiaAlimenta")),
    function: getSelectedOptions($("#a_funcion")),
    installations: $("#a_viven").value.trim(),
    feed: $("#a_feedType").value.trim(),
    photos: [...state.media.animalTempPhotos]
  };
}

function resetAnimalGroupForm() {
  $("#a_especie").value = "";
  $("#a_raza").value = "";
  $("#a_cantidad").value = "";
  $("#a_viven").value = "";
  $("#a_feedType").value = "";
  resetMultiSelect($("#a_dueno"));
  resetMultiSelect($("#a_decideVenta"));
  resetMultiSelect($("#a_limpiaAlimenta"));
  resetMultiSelect($("#a_funcion"));
  state.media.animalTempPhotos = [];
  renderAnimalTempPhotos();
}

function saveAnimalGroup() {
  const prod = getSelectedProducer();
  if (!prod) {
    showMessage("a_msg", "Selecciona primero un productor/a.", "error");
    return;
  }

  const item = collectAnimalGroupForm();
  if (!item.species || !item.quantity) {
    showMessage("a_msg", "Especie y cantidad son obligatorias.", "error");
    return;
  }

  prod.animals = prod.animals || [];
  prod.animals.push(item);
  saveState();
  renderAnimalGroups();
  renderAnimalBasedSelects();
  renderProcedureProducerSelect();
  resetAnimalGroupForm();
  showMessage("a_msg", "Grupo de animales guardado.", "success");
}

function renderAnimalGroups() {
  const prod = getSelectedProducer();
  const list = $("#a_list");
  list.innerHTML = "";

  if (!prod) {
    list.innerHTML = `<div class="empty-state">Selecciona un productor/a.</div>`;
    return;
  }

  if (!(prod.animals || []).length) {
    list.innerHTML = `<div class="empty-state">No hay grupos de animales registrados.</div>`;
    return;
  }

  prod.animals.forEach(animal => {
    const photos = (animal.photos || []).slice(0, 4).map(src => `<div class="preview-mini"><img src="${src}" alt="animal"></div>`).join("");
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(animal.species || "")} ${animal.race ? `· ${escapeHtml(animal.race)}` : ""}</h3>
      <div class="meta">Cantidad: ${escapeHtml(animal.quantity || "")}</div>
      <div class="kv">
        <div class="line"><b>Dueño/a:</b> ${escapeHtml((animal.owners || []).join(", "))}</div>
        <div class="line"><b>Decide venta:</b> ${escapeHtml((animal.sellDecision || []).join(", "))}</div>
        <div class="line"><b>Limpia/alimenta:</b> ${escapeHtml((animal.cleanFeedBy || []).join(", "))}</div>
        <div class="line"><b>Función:</b> ${escapeHtml((animal.function || []).join(", "))}</div>
        <div class="line"><b>Instalaciones:</b> ${escapeHtml(animal.installations || "")}</div>
        <div class="line"><b>Alimentación:</b> ${escapeHtml(animal.feed || "")}</div>
      </div>
      ${photos ? `<div class="row" style="margin-top:10px;">${photos}</div>` : ""}
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      $("#a_especie").value = animal.species || "";
      $("#a_raza").value = animal.race || "";
      $("#a_cantidad").value = animal.quantity || "";
      $("#a_viven").value = animal.installations || "";
      $("#a_feedType").value = animal.feed || "";
      renderAnimalPeopleSelects();
      setSelectedOptions($("#a_dueno"), animal.owners || []);
      setSelectedOptions($("#a_decideVenta"), animal.sellDecision || []);
      setSelectedOptions($("#a_limpiaAlimenta"), animal.cleanFeedBy || []);
      setSelectedOptions($("#a_funcion"), animal.function || []);
      state.media.animalTempPhotos = [...(animal.photos || [])];
      renderAnimalTempPhotos();

      prod.animals = prod.animals.filter(a => a.id !== animal.id);
      saveState();
      renderAnimalGroups();
      renderAnimalBasedSelects();
      renderProcedureProducerSelect();
    });

    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      prod.animals = prod.animals.filter(a => a.id !== animal.id);
      saveState();
      renderAnimalGroups();
      renderAnimalBasedSelects();
      renderProcedureProducerSelect();
    });

    list.appendChild(div);
  });
}

function addDisease() {
  const prod = getSelectedProducer();
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  const item = {
    id: uid(),
    date: $("#a_lastSick").value,
    animal: $("#a_enfAnimal").value,
    name: $("#a_commonDis").value.trim(),
    signs: $("#a_signs").value.trim(),
    treatment: $("#a_whenSickDo").value.trim()
  };

  if (!item.signs) {
    showMessage("a_msg", "Los signos clínicos son obligatorios.", "error");
    return;
  }

  q.diseases.push(item);
  saveState();
  renderDiseaseList();

  $("#a_lastSick").value = "";
  $("#a_enfAnimal").value = "";
  $("#a_commonDis").value = "";
  $("#a_signs").value = "";
  $("#a_whenSickDo").value = "";
}

function renderDiseaseList() {
  const prod = getSelectedProducer();
  const list = $("#a_diseaseList");
  list.innerHTML = "";
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  if (!q.diseases.length) {
    list.innerHTML = `<div class="empty-state">No hay enfermedades registradas.</div>`;
    return;
  }

  q.diseases.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.animal || "")} ${item.name ? `· ${escapeHtml(item.name)}` : ""}</h3>
      <div class="meta">📅 ${escapeHtml(item.date || "")}</div>
      <div class="kv">
        <div class="line"><b>Signos:</b> ${escapeHtml(item.signs || "")}</div>
        <div class="line"><b>Tratamiento:</b> ${escapeHtml(item.treatment || "")}</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      $("#a_lastSick").value = item.date || "";
      $("#a_enfAnimal").value = item.animal || "";
      $("#a_commonDis").value = item.name || "";
      $("#a_signs").value = item.signs || "";
      $("#a_whenSickDo").value = item.treatment || "";
      q.diseases = q.diseases.filter(x => x.id !== item.id);
      saveState();
      renderDiseaseList();
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      q.diseases = q.diseases.filter(x => x.id !== item.id);
      saveState();
      renderDiseaseList();
    });
    list.appendChild(div);
  });
}

function addVaccineRecord() {
  const prod = getSelectedProducer();
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  q.vaccines.push({
    id: uid(),
    animal: $("#a_vaxAnimal").value,
    name: $("#a_vaxName").value.trim(),
    date: $("#a_vaxDate").value,
    who: $("#a_vaxWho").value
  });

  saveState();
  renderVaccineList();

  $("#a_vaxAnimal").value = "";
  $("#a_vaxName").value = "";
  $("#a_vaxDate").value = "";
  $("#a_vaxWho").value = "";
}

function renderVaccineList() {
  const prod = getSelectedProducer();
  const list = $("#a_vaxList");
  list.innerHTML = "";
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  if (!q.vaccines.length) {
    list.innerHTML = `<div class="empty-state">No hay vacunaciones registradas.</div>`;
    return;
  }

  q.vaccines.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.animal || "")} ${item.name ? `· ${escapeHtml(item.name)}` : ""}</h3>
      <div class="meta">📅 ${escapeHtml(item.date || "")} · 👤 ${escapeHtml(item.who || "")}</div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      $("#a_vaxAnimal").value = item.animal || "";
      $("#a_vaxName").value = item.name || "";
      $("#a_vaxDate").value = item.date || "";
      $("#a_vaxWho").value = item.who || "";
      q.vaccines = q.vaccines.filter(x => x.id !== item.id);
      saveState();
      renderVaccineList();
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      q.vaccines = q.vaccines.filter(x => x.id !== item.id);
      saveState();
      renderVaccineList();
    });
    list.appendChild(div);
  });
}

function addDeworming() {
  const prod = getSelectedProducer();
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  q.dewormings.push({
    id: uid(),
    animal: $("#a_dewormAnimal").value,
    product: $("#a_dewormProd").value.trim(),
    date: $("#a_dewormDate").value,
    who: $("#a_dewormWho").value
  });

  saveState();
  renderDewormList();

  $("#a_dewormAnimal").value = "";
  $("#a_dewormProd").value = "";
  $("#a_dewormDate").value = "";
  $("#a_dewormWho").value = "";
}

function renderDewormList() {
  const prod = getSelectedProducer();
  const list = $("#a_dewormList");
  list.innerHTML = "";
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  if (!q.dewormings.length) {
    list.innerHTML = `<div class="empty-state">No hay desparasitaciones registradas.</div>`;
    return;
  }

  q.dewormings.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.animal || "")} ${item.product ? `· ${escapeHtml(item.product)}` : ""}</h3>
      <div class="meta">📅 ${escapeHtml(item.date || "")} · 👤 ${escapeHtml(item.who || "")}</div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      $("#a_dewormAnimal").value = item.animal || "";
      $("#a_dewormProd").value = item.product || "";
      $("#a_dewormDate").value = item.date || "";
      $("#a_dewormWho").value = item.who || "";
      q.dewormings = q.dewormings.filter(x => x.id !== item.id);
      saveState();
      renderDewormList();
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      q.dewormings = q.dewormings.filter(x => x.id !== item.id);
      saveState();
      renderDewormList();
    });
    list.appendChild(div);
  });
}

function addTraditional() {
  const prod = getSelectedProducer();
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  const item = {
    id: uid(),
    name: $("#a_tradNombre").value.trim(),
    type: $("#a_tradTipo").value,
    use: $("#a_tradUso").value.trim(),
    part: $("#a_tradParte").value.trim()
  };

  if (!item.name) {
    showMessage("a_msg", "Pon nombre del producto/remedio.", "error");
    return;
  }

  q.traditional.push(item);
  saveState();
  renderTraditionalList();

  $("#a_tradNombre").value = "";
  $("#a_tradTipo").value = "";
  $("#a_tradUso").value = "";
  $("#a_tradParte").value = "";
}

function renderTraditionalList() {
  const prod = getSelectedProducer();
  const list = $("#a_tradList");
  list.innerHTML = "";
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  if (!q.traditional.length) {
    list.innerHTML = `<div class="empty-state">No hay productos/remedios tradicionales.</div>`;
    return;
  }

  q.traditional.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.name || "")}</h3>
      <div class="meta">${escapeHtml(item.type || "")}</div>
      <div class="kv">
        <div class="line"><b>Uso:</b> ${escapeHtml(item.use || "")}</div>
        <div class="line"><b>Parte:</b> ${escapeHtml(item.part || "")}</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      $("#a_tradNombre").value = item.name || "";
      $("#a_tradTipo").value = item.type || "";
      $("#a_tradUso").value = item.use || "";
      $("#a_tradParte").value = item.part || "";
      q.traditional = q.traditional.filter(x => x.id !== item.id);
      saveState();
      renderTraditionalList();
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      q.traditional = q.traditional.filter(x => x.id !== item.id);
      saveState();
      renderTraditionalList();
    });
    list.appendChild(div);
  });
}

function addGenderAnimal() {
  const prod = getSelectedProducer();
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  const item = {
    id: uid(),
    animal: $("#a_genderAnimal").value,
    sex: $("#a_genderAnimalWho").value,
    why: $("#a_genderAnimalWhy").value.trim()
  };

  if (!item.sex) {
    showMessage("a_msg", "Selecciona quién cuida más ese animal.", "error");
    return;
  }

  q.genderAnimals.push(item);
  saveState();
  renderGenderAnimalList();

  $("#a_genderAnimalWho").value = "";
  $("#a_genderAnimalWhy").value = "";
}

function renderGenderAnimalList() {
  const prod = getSelectedProducer();
  const list = $("#a_genderAnimalList");
  list.innerHTML = "";
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  if (!q.genderAnimals.length) {
    list.innerHTML = `<div class="empty-state">No hay registros de animales por género.</div>`;
    return;
  }

  q.genderAnimals.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.animal || "")}</h3>
      <div class="meta">👤 ${escapeHtml(item.sex || "")}</div>
      <div class="kv">
        <div class="line"><b>Por qué:</b> ${escapeHtml(item.why || "")}</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      $("#a_genderAnimal").value = item.animal || "";
      $("#a_genderAnimalWho").value = item.sex || "";
      $("#a_genderAnimalWhy").value = item.why || "";
      q.genderAnimals = q.genderAnimals.filter(x => x.id !== item.id);
      saveState();
      renderGenderAnimalList();
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      q.genderAnimals = q.genderAnimals.filter(x => x.id !== item.id);
      saveState();
      renderGenderAnimalList();
    });
    list.appendChild(div);
  });
}

function addGenderActivity() {
  const prod = getSelectedProducer();
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  const item = {
    id: uid(),
    activity: $("#a_actividadGenero").value.trim(),
    sex: $("#a_actividadGeneroSexo").value,
    why: $("#a_actividadGeneroRazon").value.trim()
  };

  if (!item.activity || !item.sex) {
    showMessage("a_msg", "Actividad y sexo son obligatorios.", "error");
    return;
  }

  q.genderActivities.push(item);
  saveState();
  renderGenderActivityList();

  $("#a_actividadGenero").value = "";
  $("#a_actividadGeneroSexo").value = "";
  $("#a_actividadGeneroRazon").value = "";
}

function renderGenderActivityList() {
  const prod = getSelectedProducer();
  const list = $("#a_generoActividadList");
  list.innerHTML = "";
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  if (!q.genderActivities.length) {
    list.innerHTML = `<div class="empty-state">No hay actividades por género.</div>`;
    return;
  }

  q.genderActivities.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>${escapeHtml(item.activity || "")}</h3>
      <div class="meta">👤 ${escapeHtml(item.sex || "")}</div>
      <div class="kv">
        <div class="line"><b>Por qué:</b> ${escapeHtml(item.why || "")}</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="edit">✏️ Editar</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>
    `;
    div.querySelector('[data-action="edit"]').addEventListener("click", () => {
      $("#a_actividadGenero").value = item.activity || "";
      $("#a_actividadGeneroSexo").value = item.sex || "";
      $("#a_actividadGeneroRazon").value = item.why || "";
      q.genderActivities = q.genderActivities.filter(x => x.id !== item.id);
      saveState();
      renderGenderActivityList();
    });
    div.querySelector('[data-action="delete"]').addEventListener("click", () => {
      q.genderActivities = q.genderActivities.filter(x => x.id !== item.id);
      saveState();
      renderGenderActivityList();
    });
    list.appendChild(div);
  });
}

function saveAnimalQuestionnaireFull() {
  const prod = getSelectedProducer();
  if (!prod) {
    showMessage("a_msg", "Primero selecciona un productor/a.", "error");
    return;
  }

  const q = ensureQuestionnaire(prod);
  q.importantAnimals = getSelectedOptions($("#a_animalesImportantes"));
  q.importantAnimalsWhy = $("#a_importanciaDetalle").value.trim();
  q.hasMilpa = $("#a_tieneMilpa").value;
  q.whatSows = $("#a_queSiembra").value.trim();
  q.forageShortage = $("#a_escasezForraje").value.trim();
  q.whereAnimalsStay = $("#a_dondeEstanMayorTiempo").value.trim();
  q.vaccinatesAny = $("#a_vaxAny").value;
  q.dewormsAny = $("#a_dewormAny").value;
  q.changesDewormer = $("#a_changeDewormProduct").value;
  q.recommendedBy = $("#a_recommendWho").value.trim();
  q.curadorExiste = $("#a_curadorExiste").value;
  q.curadorQuien = $("#a_curadorQuien").value.trim();
  q.curadorEdad = $("#a_curadorEdad").value.trim();
  q.curadorEspecies = $("#a_curadorEspecies").value.trim();
  q.curadorTiempo = $("#a_curadorTiempo").value.trim();
  q.curadorServicios = $("#a_curadorServicios").value.trim();
  q.practicesAny = $("#a_practicas").value;
  q.practicesWho = $("#a_practicasQuien").value.trim();
  q.practicesAdvice = $("#a_practicasAsesoria").value;
  q.programRegistered = $("#a_programaRegistro").value;
  q.programName = $("#a_programaNombre").value.trim();
  q.hasFolio = $("#a_programaFolioTiene").value;
  q.folio = $("#a_programaFolio").value.trim();
  q.futureCalls = $("#a_programaConvocatorias").value.trim();
  q.huntingCommon = $("#a_cazaComunidad").value;
  q.huntingTime = $("#a_cazaTiempo").value.trim();
  q.huntedAnimals = $("#a_cazaAnimales").value.trim();
  q.huntingPlaces = $("#a_cazaLugares").value.trim();
  q.huntingSeason = $("#a_cazaEpoca").value.trim();
  q.huntingReasons = $("#a_cazaMotivos").value.trim();
  q.wildProblems = $("#a_silvestresProblemas").value;
  q.wildProblemsDetail = $("#a_silvestresQuePaso").value.trim();
  q.riverUse = $("#a_rioUso").value;
  q.riverUseFor = $("#a_rioParaQue").value.trim();
  q.riverMeaning = $("#a_rioSignificado").value.trim();
  q.riverProblems = $("#a_rioProblemas").value.trim();
  q.localKnowledgeExists = $("#a_saberesLocales").value;
  q.localKnowledgeWho = $("#a_saberesQuien").value.trim();
  q.localKnowledgeUseful = $("#a_saberesUtilidad").value;
  q.rumiantInterest = $("#a_interestRumiants").value;
  q.rumiantInterestWhy = $("#a_interestRumiantsWhy").value.trim();
  q.hadRumiantsBefore = $("#a_hadRumiantsBefore").value;
  q.noRumiantsReason = $("#a_noRumiantsWhy").value.trim();
  q.rumiantAdvice = $("#a_rumiantsAdvice").value;
  q.rumiantOthers = $("#a_rumiantsOthers").value;
  q.rumiantWomen = $("#a_rumiantsWomen").value;
  q.rumiantNeed = $("#a_rumiantsNeed").value.trim();
  q.birdsInterestYes = $("#a_interestBirdsYes").value;
  q.birdsInterestNo = $("#a_interestBirdsNo").value;

  saveState();
  renderProducerList();
  showMessage("a_msg", "Sección de animales y cuestionario guardada.", "success");
}

function fillAnimalQuestionnaireFields() {
  const prod = getSelectedProducer();
  if (!prod) return;
  const q = ensureQuestionnaire(prod);

  setSelectedOptions($("#a_animalesImportantes"), q.importantAnimals || []);
  $("#a_importanciaDetalle").value = q.importantAnimalsWhy || "";
  $("#a_tieneMilpa").value = q.hasMilpa || "";
  $("#a_queSiembra").value = q.whatSows || "";
  $("#a_escasezForraje").value = q.forageShortage || "";
  $("#a_dondeEstanMayorTiempo").value = q.whereAnimalsStay || "";
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

  renderDiseaseList();
  renderVaccineList();
  renderDewormList();
  renderTraditionalList();
  renderGenderAnimalList();
  renderGenderActivityList();
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
   MEDICAMENTOS

/* =========================================================
   MEDICAMENTOS Y VACUNAS
========================================================= */
function renderMedMode() {
  const isChat = state.ui.medMode === "CHATGPT";
  if ($("#chatgptBlock")) $("#chatgptBlock").style.display = isChat ? "block" : "none";
  if ($("#m_modeHint")) $("#m_modeHint").textContent = `Modo actual: ${isChat ? "🪄 ChatGPT" : "✍️ Manual"}`;
  $("#m_modeManual")?.classList.toggle("ghost", isChat);
  $("#m_modeChatGPT")?.classList.toggle("ghost", !isChat);
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
  const total = Number($("#m_totalQty")?.value || 0);
  const cost = Number($("#m_cost")?.value || 0);
  $("#m_unitCost").value = total > 0 ? (cost / total).toFixed(2) : "";
}

function bindMedCalc() {
  $("#m_totalQty")?.addEventListener("input", calcMedUnitCost);
  $("#m_cost")?.addEventListener("input", calcMedUnitCost);
}

function renderMedPhotos() {
  setThumb("m_rx_preview", state.media.medRxPhoto, "Sin<br/>receta");
  setThumb("m_tk_preview", state.media.medTicketPhoto, "Sin<br/>ticket");
}

function bindMedPhotos() {
  $("#m_btnRxTake")?.addEventListener("click", () => $("#m_rx_take")?.click());
  $("#m_btnRxPick")?.addEventListener("click", () => $("#m_rx_pick")?.click());
  $("#m_btnTkTake")?.addEventListener("click", () => $("#m_tk_take")?.click());
  $("#m_btnTkPick")?.addEventListener("click", () => $("#m_tk_pick")?.click());
  $("#m_rx_take")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.media.medRxPhoto = await fileToBase64(file);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_rx_pick")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.media.medRxPhoto = await fileToBase64(file);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_tk_take")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.media.medTicketPhoto = await fileToBase64(file);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_tk_pick")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.media.medTicketPhoto = await fileToBase64(file);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_btnRxRemove")?.addEventListener("click", () => {
    state.media.medRxPhoto = null;
    renderMedPhotos();
  });
  $("#m_btnTkRemove")?.addEventListener("click", () => {
    state.media.medTicketPhoto = null;
    renderMedPhotos();
  });
}

function toggleAnaRosaFields() {
  const show = $("#m_owner")?.value === "DRA_ANA_ROSA";
  if ($("#m_anaRosaWrap")) $("#m_anaRosaWrap").style.display = show ? "block" : "none";
  if (!show) {
    $("#m_anaRosaCharge").value = "";
    $("#m_anaRosaRefund").value = "";
    $("#m_anaRosaNotes").value = "";
  }
}

function resetVaccineFields() {
  ["m_vaxBrand","m_vaxExpiry","m_vaxPrice","m_vaxCoverageAnimals","m_vaxDiseases"].forEach(id => {
    if ($("#"+id)) $("#"+id).value = "";
  });
}

function resetMedForm() {
  $("#medForm")?.reset();
  state.editing.medId = null;
  state.media.medRxPhoto = null;
  state.media.medTicketPhoto = null;
  renderMedPhotos();
  calcMedUnitCost();
  toggleAnaRosaFields();
  resetVaccineFields();
  renderMedMode();
  resetMessages(["m_msg","m_err","m_ok"]);
}

function collectMedForm() {
  const totalQty = Number($("#m_totalQty").value || 0);
  const cost = Number($("#m_cost").value || 0);
  const unitCost = totalQty > 0 ? cost / totalQty : 0;
  return {
    id: state.editing.medId || uid(),
    createdAt: nowText(),
    updatedAt: nowText(),
    brand: $("#m_brand").value.trim(),
    active: $("#m_active").value.trim(),
    owner: $("#m_owner").value,
    presentation: $("#m_presentation").value.trim(),
    cost,
    expiry: $("#m_expiry").value,
    totalQty,
    unit: $("#m_unit").value,
    unitCost,
    clinical: {
      use: $("#m_use").value.trim(), mech: $("#m_mech").value.trim(), adverse: $("#m_adverse").value.trim(),
      preg: $("#m_preg").value.trim(), pk: $("#m_pk").value.trim(), overdose: $("#m_overdose").value.trim(),
      interactions: $("#m_interactions").value.trim(), dosing: $("#m_dosing").value.trim()
    },
    evidence: { rxPhoto: state.media.medRxPhoto || null, ticketPhoto: state.media.medTicketPhoto || null },
    anaRosa: $("#m_owner").value === "DRA_ANA_ROSA" ? {
      chargePerUnit: Number($("#m_anaRosaCharge").value || 0),
      notes: $("#m_anaRosaNotes").value.trim()
    } : null
  };
}

function saveMed(e) {
  e?.preventDefault?.();
  resetMessages(["m_msg","m_err","m_ok"]);
  const med = collectMedForm();
  if (!med.brand || !med.active) {
    showMessage("m_err", "Completa al menos nombre comercial y sustancia activa.", "error");
    return;
  }
  const idx = state.meds.findIndex(item => item.id === med.id);
  if (idx >= 0) state.meds[idx] = med; else state.meds.unshift(med);
  saveState();
  renderMedList();
  renderProcedureInventorySelects();
  showMessage("m_ok", "Medicamento guardado correctamente.", "success");
  resetMedForm();
}

function collectVaccineForm() {
  return {
    id: uid(),
    createdAt: nowText(),
    updatedAt: nowText(),
    brand: $("#m_vaxBrand").value.trim(),
    expiry: $("#m_vaxExpiry").value,
    price: Number($("#m_vaxPrice").value || 0),
    coverageAnimals: Number($("#m_vaxCoverageAnimals").value || 0),
    diseases: $("#m_vaxDiseases").value.trim()
  };
}

function saveVaccine() {
  const vaccine = collectVaccineForm();
  if (!vaccine.brand) {
    showMessage("m_err", "Pon al menos la marca/nombre de la vacuna.", "error");
    return;
  }
  state.vaccines.unshift(vaccine);
  saveState();
  renderVaccineLibrary();
  renderProcedureInventorySelects();
  showMessage("m_ok", "Vacuna guardada en inventario independiente.", "success");
  resetVaccineFields();
}

function medWordHtml(item) {
  return `<html><head><meta charset="utf-8"></head><body>
  <h1>Ficha de medicamento</h1>
  <p><b>Nombre comercial:</b> ${escapeHtml(item.brand)}</p>
  <p><b>Sustancia activa:</b> ${escapeHtml(item.active)}</p>
  <p><b>Propietario:</b> ${escapeHtml(ownerLabel(item.owner))}</p>
  <p><b>Costo:</b> ${escapeHtml(money(item.cost))}</p>
  <p><b>Cantidad:</b> ${escapeHtml(item.totalQty)} ${escapeHtml(item.unit || "")}</p>
  <p><b>Costo unitario:</b> ${escapeHtml(money(item.unitCost || 0))}</p>
  <p><b>Uso:</b> ${escapeHtml(item.clinical?.use || "")}</p>
  <p><b>Dosificación:</b> ${escapeHtml(item.clinical?.dosing || "")}</p>
  <p><b>Ana Rosa:</b> ${item.anaRosa ? escapeHtml(`Cobro por unidad ${money(item.anaRosa.chargePerUnit || 0)}. ${item.anaRosa.notes || ''}`) : 'No aplica'}</p>
  </body></html>`;
}

function exportMedsExcel() {
  const rows = [["Tipo","Nombre","Activo/Enfermedades","Propietario","Costo","Cantidad","Unidad","Costo unitario","Caducidad"]];
  state.meds.forEach(item => rows.push(["Medicamento", item.brand, item.active, ownerLabel(item.owner), item.cost, item.totalQty, item.unit, item.unitCost, item.expiry]));
  state.vaccines.forEach(item => rows.push(["Vacuna", item.brand, item.diseases, "", item.price, item.coverageAnimals, "animales", "", item.expiry]));
  downloadCSV("medicamentos_vacunas.csv", rows);
}

function exportMedsWord() {
  const html = `<html><head><meta charset="utf-8"></head><body>
  <h1>Inventario de medicamentos y vacunas</h1>
  <h2>Medicamentos</h2>
  ${state.meds.map(m => `<p><b>${escapeHtml(m.brand)}</b> · ${escapeHtml(m.active)} · ${escapeHtml(ownerLabel(m.owner))}</p>`).join("") || "<p>Sin registros</p>"}
  <h2>Vacunas</h2>
  ${state.vaccines.map(v => `<p><b>${escapeHtml(v.brand)}</b> · ${escapeHtml(v.diseases || '')}</p>`).join("") || "<p>Sin registros</p>"}
  </body></html>`;
  downloadFile("medicamentos_vacunas.doc", "\ufeff" + html, "application/msword");
}

function renderMedList() {
  const q = $("#m_search")?.value.trim().toLowerCase() || "";
  const list = $("#m_list");
  if (!list) return;
  const filtered = state.meds.filter(item => !q || [item.brand, item.active].join(" ").toLowerCase().includes(q));
  $("#m_count").textContent = String(state.meds.length + state.vaccines.length);
  list.innerHTML = filtered.length ? "" : `<div class="empty-state">No hay medicamentos registrados.</div>`;
  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<h3>${escapeHtml(item.brand)}</h3>
      <div class="meta">${escapeHtml(item.active)} · ${escapeHtml(ownerLabel(item.owner))}</div>
      <div class="kv">
        <div class="line"><b>Cantidad:</b> ${escapeHtml(item.totalQty)} ${escapeHtml(item.unit || '')}</div>
        <div class="line"><b>Costo unitario:</b> ${escapeHtml(money(item.unitCost || 0))}</div>
        <div class="line"><b>Caducidad:</b> ${escapeHtml(item.expiry || '')}</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-action="word">📄 Word</button>
        <button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button>
      </div>`;
    div.querySelector('[data-action="word"]').addEventListener('click', () => downloadFile(`${(item.brand || 'medicamento').replace(/\s+/g,'_')}.doc`, "\ufeff" + medWordHtml(item), "application/msword"));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.meds = state.meds.filter(x => x.id !== item.id);
      saveState(); renderMedList(); renderProcedureInventorySelects();
    });
    list.appendChild(div);
  });
}

function renderVaccineLibrary() {
  const list = $("#m_vaccineList");
  if (!list) return;
  list.innerHTML = state.vaccines.length ? "" : `<div class="empty-state">No hay vacunas registradas.</div>`;
  state.vaccines.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<h3>${escapeHtml(item.brand)}</h3>
      <div class="meta">Cobertura: ${escapeHtml(item.coverageAnimals || 0)} animales</div>
      <div class="kv"><div class="line"><b>Enfermedades:</b> ${escapeHtml(item.diseases || '')}</div></div>
      <div class="actions" style="margin-top:12px;"><button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button></div>`;
    div.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.vaccines = state.vaccines.filter(x => x.id !== item.id);
      saveState(); renderVaccineLibrary(); renderProcedureInventorySelects(); renderMedList();
    });
    list.appendChild(div);
  });
  $("#m_count").textContent = String(state.meds.length + state.vaccines.length);
}

function bindMedSection() {
  bindMedMode();
  bindMedCalc();
  bindMedPhotos();
  $("#m_owner")?.addEventListener("change", toggleAnaRosaFields);
  $("#medForm")?.addEventListener("submit", saveMed);
  $("#m_btnClear")?.addEventListener("click", resetMedForm);
  $("#m_btnSaveVaccine")?.addEventListener("click", saveVaccine);
  $("#m_btnClearVaccine")?.addEventListener("click", resetVaccineFields);
  $("#m_btnExportExcel")?.addEventListener("click", exportMedsExcel);
  $("#m_btnExportWord")?.addEventListener("click", exportMedsWord);
  $("#m_search")?.addEventListener("input", renderMedList);
  $("#m_btnExport")?.addEventListener("click", () => downloadFile("medicamentos_vacunas.json", JSON.stringify({ meds: state.meds, vaccines: state.vaccines }, null, 2), "application/json"));
  $("#m_btnImport")?.addEventListener("click", () => $("#m_importFile")?.click());
  $("#m_importFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const parsed = JSON.parse(await file.text());
    state.meds = Array.isArray(parsed.meds) ? parsed.meds : [];
    state.vaccines = Array.isArray(parsed.vaccines) ? parsed.vaccines : [];
    saveState(); renderMedList(); renderVaccineLibrary(); renderProcedureInventorySelects(); e.target.value = "";
  });
  renderMedMode();
  toggleAnaRosaFields();
  renderMedPhotos();
  renderMedList();
  renderVaccineLibrary();
}

/* =========================================================
   INSUMOS
========================================================= */
function renderSupplyMode() {
  const disposable = state.ui.supplyMode === "DISPOSABLE";
  $("#blockDisposable").style.display = disposable ? "block" : "none";
  $("#blockNonDisposable").style.display = disposable ? "none" : "block";
  $("#s_modeHint").textContent = `Modo actual: ${disposable ? "🧴 Desechables" : "🔧 No desechables"}`;
  $("#s_modeDisposable").classList.toggle("ghost", !disposable);
  $("#s_modeNonDisposable").classList.toggle("ghost", disposable);
}

function calcSupplyCosts() {
  const qty = Number($("#s_qty").value || 0);
  const price = Number($("#s_price").value || 0);
  $("#s_unitCost").value = qty > 0 ? (price / qty).toFixed(2) : "";
  const years = Number($("#s_lifeMonths").value || 0);
  const costAcq = Number($("#s_costAcq").value || 0);
  const estimatedUses = Number($("#s_estimatedUses").value || 0);
  $("#s_costMonth").value = years > 0 ? (costAcq / years).toFixed(2) : "";
  $("#s_costUse").value = estimatedUses > 0 ? (costAcq / estimatedUses).toFixed(2) : "";
}

function resetSupplyForm() {
  $("#supplyForm")?.reset();
  state.editing.supplyId = null;
  state.media.supplyTicketPhoto = null;
  setThumb("s_tk_preview", null, "Sin<br/>ticket");
  calcSupplyCosts();
}

function collectSupplyForm() {
  return {
    id: state.editing.supplyId || uid(), createdAt: nowText(), updatedAt: nowText(), mode: state.ui.supplyMode,
    name: $("#s_name").value.trim(), acquired: $("#s_acquired").value,
    donated: getCheckedRadio("s_donated"), presentation: $("#s_presentation").value.trim(), qty: Number($("#s_qty").value || 0), price: Number($("#s_price").value || 0),
    unitCost: Number($("#s_unitCost").value || 0),
    costAcq: Number($("#s_costAcq").value || 0), lifeYears: Number($("#s_lifeMonths").value || 0), estimatedUses: Number($("#s_estimatedUses").value || 0),
    costPerYear: Number($("#s_costMonth").value || 0), costPerUse: Number($("#s_costUse").value || 0), notes: $("#s_notes").value.trim(),
    ticketPhoto: state.media.supplyTicketPhoto || null
  };
}

function saveSupply(e) {
  e?.preventDefault?.();
  const item = collectSupplyForm();
  if (!item.name || !item.acquired) return showMessage("s_err", "Nombre y fecha de adquisición son obligatorios.", "error");
  const idx = state.supplies.findIndex(x => x.id === item.id);
  if (idx >= 0) state.supplies[idx] = item; else state.supplies.unshift(item);
  saveState(); renderSupplyList(); renderProcedureInventorySelects(); showMessage("s_ok", "Insumo guardado correctamente.", "success"); resetSupplyForm();
}

function renderSupplyList() {
  const list = $("#s_list"); const q = $("#s_search")?.value.trim().toLowerCase() || "";
  const filtered = state.supplies.filter(x => !q || (x.name || '').toLowerCase().includes(q));
  $("#s_count").textContent = String(state.supplies.length);
  list.innerHTML = filtered.length ? "" : `<div class="empty-state">No hay insumos registrados.</div>`;
  filtered.forEach(item => {
    const div = document.createElement("div"); div.className = "item";
    div.innerHTML = `<h3>${escapeHtml(item.name)}</h3><div class="meta">${escapeHtml(item.mode === 'DISPOSABLE' ? 'Desechable' : 'No desechable')}</div>
    <div class="kv"><div class="line"><b>Vida útil:</b> ${escapeHtml(item.lifeYears || '')} años</div><div class="line"><b>Costo por uso:</b> ${escapeHtml(money(item.costPerUse || 0))}</div></div>
    <div class="actions" style="margin-top:12px;"><button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button></div>`;
    div.querySelector('[data-action="delete"]').addEventListener('click', () => { state.supplies = state.supplies.filter(x => x.id !== item.id); saveState(); renderSupplyList(); renderProcedureInventorySelects(); });
    list.appendChild(div);
  });
}

function exportSuppliesExcel() {
  downloadCSV("insumos.csv", [["Nombre","Modo","Fecha","Vida útil (años)","Costo por uso"], ...state.supplies.map(i => [i.name, i.mode, i.acquired, i.lifeYears, i.costPerUse])]);
}

function bindSupplySection() {
  $("#s_modeDisposable")?.addEventListener("click", () => { state.ui.supplyMode = "DISPOSABLE"; renderSupplyMode(); saveState(); });
  $("#s_modeNonDisposable")?.addEventListener("click", () => { state.ui.supplyMode = "NON_DISPOSABLE"; renderSupplyMode(); saveState(); });
  ["#s_qty", "#s_price", "#s_costAcq", "#s_lifeMonths", "#s_estimatedUses"].forEach(sel => $(sel)?.addEventListener("input", calcSupplyCosts));
  $("#s_btnTkTake")?.addEventListener("click", () => $("#s_tk_take")?.click());
  $("#s_btnTkPick")?.addEventListener("click", () => $("#s_tk_pick")?.click());
  $("#s_tk_take")?.addEventListener("change", async e => { const f = e.target.files?.[0]; if (!f) return; state.media.supplyTicketPhoto = await fileToBase64(f); setThumb("s_tk_preview", state.media.supplyTicketPhoto, "Sin<br/>ticket"); e.target.value = ""; });
  $("#s_tk_pick")?.addEventListener("change", async e => { const f = e.target.files?.[0]; if (!f) return; state.media.supplyTicketPhoto = await fileToBase64(f); setThumb("s_tk_preview", state.media.supplyTicketPhoto, "Sin<br/>ticket"); e.target.value = ""; });
  $("#s_btnTkRemove")?.addEventListener("click", () => { state.media.supplyTicketPhoto = null; setThumb("s_tk_preview", null, "Sin<br/>ticket"); });
  $("#supplyForm")?.addEventListener("submit", saveSupply);
  $("#s_btnClear")?.addEventListener("click", resetSupplyForm);
  $("#s_search")?.addEventListener("input", renderSupplyList);
  $("#s_btnExportExcel")?.addEventListener("click", exportSuppliesExcel);
  $("#s_btnExport")?.addEventListener("click", () => downloadFile("insumos.json", JSON.stringify(state.supplies, null, 2), "application/json"));
  $("#s_btnImport")?.addEventListener("click", () => $("#s_importFile")?.click());
  $("#s_importFile")?.addEventListener("change", async e => { const f = e.target.files?.[0]; if (!f) return; state.supplies = JSON.parse(await f.text()); saveState(); renderSupplyList(); renderProcedureInventorySelects(); e.target.value = ""; });
  renderSupplyMode(); calcSupplyCosts(); renderSupplyList();
}

/* =========================================================
   PROCEDIMIENTOS
========================================================= */
function renderProcedureProducerSelect() {
  const sel = $("#p_producer"); if (!sel) return;
  const current = state.selectedProducerId || sel.value || "";
  sel.innerHTML = `<option value="">— Selecciona productor/a —</option>` + state.producers.map(p => `<option value="${p.id}">${escapeHtml(p.basic?.name || 'Sin nombre')}</option>`).join("");
  sel.value = state.producers.some(p => p.id === current) ? current : "";
  renderProcedureAnimalGroups();
}

function renderProcedureAnimalGroups() {
  const sel = $("#p_animalGroup"); if (!sel) return;
  const prod = getProducerById($("#p_producer")?.value || state.selectedProducerId);
  const animals = prod?.animals || [];
  sel.innerHTML = `<option value="">— Selecciona grupo —</option>` + animals.map(a => `<option value="${a.id}">${escapeHtml(animalGroupLabel(a))}</option>`).join("");
}

function renderProcedureInventorySelects() {
  if ($("#p_medSelect")) $("#p_medSelect").innerHTML = `<option value="">— Selecciona medicamento —</option>` + state.meds.map(m => `<option value="${m.id}">${escapeHtml(m.brand)} (${escapeHtml(m.unit || '')})</option>`).join("");
  if ($("#p_vaccineSelect")) $("#p_vaccineSelect").innerHTML = `<option value="">— Selecciona vacuna —</option>` + state.vaccines.map(v => `<option value="${v.id}">${escapeHtml(v.brand)}</option>`).join("");
  if ($("#p_supplySelect")) $("#p_supplySelect").innerHTML = `<option value="">— Selecciona insumo —</option>` + state.supplies.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
}

function ensureProcedureDraft() {
  if (!state.procedureDraft) state.procedureDraft = { meds: [], vaccines: [], supplies: [] };
  return state.procedureDraft;
}

function renderProcedureDraftLists() {
  const draft = ensureProcedureDraft();
  $("#p_medUseList").innerHTML = draft.meds.length ? draft.meds.map((m,i) => `<div class="item"><h3>${escapeHtml(m.name)}</h3><div class="meta">${escapeHtml(m.qty)} ${escapeHtml(m.unit || '')}</div><div class="line"><b>Devolver a Ana Rosa:</b> ${escapeHtml(money(m.refundAnaRosa || 0))}</div><button class="btn small bad" type="button" data-med-remove="${i}">🗑️ Quitar</button></div>`).join("") : `<div class="empty-state">Sin medicamentos agregados.</div>`;
  $("#p_vaccineUseList").innerHTML = draft.vaccines.length ? draft.vaccines.map((v,i) => `<div class="item"><h3>${escapeHtml(v.name)}</h3><div class="meta">${escapeHtml(v.animalsApplied)} animales</div><button class="btn small bad" type="button" data-vax-remove="${i}">🗑️ Quitar</button></div>`).join("") : `<div class="empty-state">Sin vacunas agregadas.</div>`;
  $("#p_supplyUseList").innerHTML = draft.supplies.length ? draft.supplies.map((s,i) => `<div class="item"><h3>${escapeHtml(s.name)}</h3><div class="meta">${escapeHtml(s.qtyUsed)}</div><button class="btn small bad" type="button" data-supply-remove="${i}">🗑️ Quitar</button></div>`).join("") : `<div class="empty-state">Sin insumos agregados.</div>`;
  $$('[data-med-remove]').forEach(btn => btn.addEventListener('click', () => { draft.meds.splice(Number(btn.dataset.medRemove),1); renderProcedureDraftLists(); }));
  $$('[data-vax-remove]').forEach(btn => btn.addEventListener('click', () => { draft.vaccines.splice(Number(btn.dataset.vaxRemove),1); renderProcedureDraftLists(); }));
  $$('[data-supply-remove]').forEach(btn => btn.addEventListener('click', () => { draft.supplies.splice(Number(btn.dataset.supplyRemove),1); renderProcedureDraftLists(); }));
  const refund = draft.meds.reduce((sum,m) => sum + Number(m.refundAnaRosa || 0), 0);
  if ($("#p_chargeCalculated")) $("#p_chargeCalculated").value = refund ? money(refund) : "";
  if ($("#m_anaRosaRefund")) $("#m_anaRosaRefund").value = refund ? money(refund) : "";
}

function addProcedureMedUse() {
  const med = state.meds.find(x => x.id === $("#p_medSelect").value); if (!med) return;
  const qty = Number($("#p_medDoseKg").value || 0);
  const refundAnaRosa = med.owner === 'DRA_ANA_ROSA' ? qty * Number(med.anaRosa?.chargePerUnit || med.unitCost || 0) : 0;
  ensureProcedureDraft().meds.push({ id: med.id, name: med.brand, qty, unit: $("#p_medUnitUsed").value || med.unit, refundAnaRosa });
  $("#p_medDoseKg").value = ""; $("#p_medUnitUsed").value = ""; $("#p_medSelect").value = ""; renderProcedureDraftLists();
}

function addProcedureVaccineUse() {
  const vaccine = state.vaccines.find(x => x.id === $("#p_vaccineSelect").value); if (!vaccine) return;
  ensureProcedureDraft().vaccines.push({ id: vaccine.id, name: vaccine.brand, animalsApplied: Number($("#p_vaccineAnimalsApplied").value || 0), notes: $("#p_vaccineNotes").value.trim() });
  $("#p_vaccineAnimalsApplied").value = ""; $("#p_vaccineNotes").value = ""; $("#p_vaccineSelect").value = ""; renderProcedureDraftLists();
}

function addProcedureSupplyUse() {
  const supply = state.supplies.find(x => x.id === $("#p_supplySelect").value); if (!supply) return;
  ensureProcedureDraft().supplies.push({ id: supply.id, name: supply.name, qtyUsed: Number($("#p_supplyQtyUsed").value || 0), notes: $("#p_supplyNotes").value.trim() });
  $("#p_supplyQtyUsed").value = ""; $("#p_supplyNotes").value = ""; $("#p_supplySelect").value = ""; renderProcedureDraftLists();
}

function resetProcedureForm() {
  $("#procedureForm")?.reset();
  state.editing.procedureId = null; state.procedureDraft = { meds: [], vaccines: [], supplies: [] }; renderProcedureDraftLists();
}

function saveProcedure(e) {
  e?.preventDefault?.();
  const draft = ensureProcedureDraft();
  const item = {
    id: state.editing.procedureId || uid(), createdAt: nowText(), updatedAt: nowText(),
    date: $("#p_date").value, type: $("#p_type").value, place: $("#p_place").value.trim(), producerId: $("#p_producer").value,
    animalGroupId: $("#p_animalGroup").value, animalsQtyUsed: $("#p_animalsQtyUsed").value, chargeStatus: $("#p_chargeStatus").value,
    chargeNotes: $("#p_chargeNotes").value.trim(), notes: $("#p_notes").value.trim(),
    meds: draft.meds, vaccines: draft.vaccines, supplies: draft.supplies,
    chargeCalculated: draft.meds.reduce((sum,m)=>sum+Number(m.refundAnaRosa||0),0), chargeManual: $("#p_chargeManual").value.trim(), chargeReason: $("#p_chargeReason").value.trim()
  };
  if (!item.date || !item.producerId) return showMessage("p_err", "Fecha y productor/a son obligatorios.", "error");
  const idx = state.procedures.findIndex(x => x.id === item.id); if (idx >= 0) state.procedures[idx] = item; else state.procedures.unshift(item);
  saveState(); renderProcedureList(); showMessage("p_ok", "Procedimiento guardado correctamente.", "success"); resetProcedureForm();
}

function procedureWordHtml(item) {
  const producer = getProducerById(item.producerId);
  return `<html><head><meta charset="utf-8"></head><body><h1>Procedimiento veterinario</h1>
  <p><b>Fecha:</b> ${escapeHtml(item.date)}</p><p><b>Productor/a:</b> ${escapeHtml(producer?.basic?.name || '')}</p>
  <p><b>Tipo:</b> ${escapeHtml(procedureTypeLabel(item.type) || item.type || '')}</p>
  <p><b>Devolución Ana Rosa:</b> ${escapeHtml(money(item.chargeCalculated || 0))}</p>
  <h2>Medicamentos</h2>${item.meds.map(m=>`<p>${escapeHtml(m.name)} · ${escapeHtml(m.qty)} ${escapeHtml(m.unit || '')}</p>`).join('') || '<p>Sin registros</p>'}
  <h2>Vacunas</h2>${item.vaccines.map(v=>`<p>${escapeHtml(v.name)} · ${escapeHtml(v.animalsApplied)} animales</p>`).join('') || '<p>Sin registros</p>'}
  <h2>Insumos</h2>${item.supplies.map(s=>`<p>${escapeHtml(s.name)} · ${escapeHtml(s.qtyUsed)}</p>`).join('') || '<p>Sin registros</p>'}
  </body></html>`;
}

function exportProceduresWord() {
  const html = `<html><head><meta charset="utf-8"></head><body><h1>Procedimientos</h1>${state.procedures.map(p => `<p><b>${escapeHtml(p.date)}</b> · ${escapeHtml(getProducerById(p.producerId)?.basic?.name || '')} · ${escapeHtml(money(p.chargeCalculated || 0))}</p>`).join('') || '<p>Sin registros</p>'}</body></html>`;
  downloadFile("procedimientos.doc", "\ufeff" + html, "application/msword");
}

function renderProcedureList() {
  const list = $("#p_list"); const q = $("#p_search")?.value.trim().toLowerCase() || "";
  const filtered = state.procedures.filter(p => {
    const producer = getProducerById(p.producerId);
    return !q || [p.date, producer?.basic?.name, p.place, p.type].join(' ').toLowerCase().includes(q);
  });
  $("#p_count").textContent = String(state.procedures.length);
  list.innerHTML = filtered.length ? "" : `<div class="empty-state">No hay procedimientos registrados.</div>`;
  filtered.forEach(item => {
    const producer = getProducerById(item.producerId);
    const div = document.createElement("div"); div.className = "item";
    div.innerHTML = `<h3>${escapeHtml(item.date)} · ${escapeHtml(producer?.basic?.name || '')}</h3>
    <div class="meta">${escapeHtml(procedureTypeLabel(item.type) || item.type || '')}</div>
    <div class="kv"><div class="line"><b>Devolución Ana Rosa:</b> ${escapeHtml(money(item.chargeCalculated || 0))}</div></div>
    <div class="actions" style="margin-top:12px;"><button class="btn small ghost" type="button" data-action="word">📄 Word</button><button class="btn small bad" type="button" data-action="delete">🗑️ Eliminar</button></div>`;
    div.querySelector('[data-action="word"]').addEventListener('click', () => downloadFile(`procedimiento_${item.date || item.id}.doc`, "\ufeff" + procedureWordHtml(item), "application/msword"));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => { state.procedures = state.procedures.filter(x => x.id !== item.id); saveState(); renderProcedureList(); });
    list.appendChild(div);
  });
}

function bindProcedureSection() {
  $("#p_producer")?.addEventListener("change", renderProcedureAnimalGroups);
  $("#p_addMedUse")?.addEventListener("click", addProcedureMedUse);
  $("#p_addVaccineUse")?.addEventListener("click", addProcedureVaccineUse);
  $("#p_addSupplyUse")?.addEventListener("click", addProcedureSupplyUse);
  $("#procedureForm")?.addEventListener("submit", saveProcedure);
  $("#p_save")?.addEventListener("click", saveProcedure);
  $("#p_clear")?.addEventListener("click", resetProcedureForm);
  $("#p_search")?.addEventListener("input", renderProcedureList);
  $("#p_btnExportWord")?.addEventListener("click", exportProceduresWord);
  $("#p_btnExportJson")?.addEventListener("click", () => downloadFile("procedimientos.json", JSON.stringify(state.procedures, null, 2), "application/json"));
  $("#p_btnImportJson")?.addEventListener("click", () => $("#p_importFile")?.click());
  $("#p_importFile")?.addEventListener("change", async e => { const f = e.target.files?.[0]; if (!f) return; state.procedures = JSON.parse(await f.text()); saveState(); renderProcedureList(); e.target.value = ""; });
  renderProcedureProducerSelect(); renderProcedureInventorySelects(); renderProcedureDraftLists(); renderProcedureList();
}

/* =========================================================
   INICIO
========================================================= */
function initApp() {
  loadState();
  bindTabs();
  bindProducerClassification();
  bindProducerPhoto();
  bindProducerLocation();
  bindProducerSection();
  bindAnimalsSection();
  bindMedSection();
  bindSupplySection();
  bindProcedureSection();
  renderProducerList();
  renderAnimalsProducerSelect();
  renderProcedureProducerSelect();
  renderProcedureInventorySelects();
  renderSupplyList();
  renderMedList();
  renderVaccineLibrary();
  updateProducerConditionalFields();
  calcSupplyCosts();
  calcMedUnitCost();
  renderMedPhotos();
  renderSupplyMode();
  if (state.selectedProducerId) {
    const animalSelect = $("#animalsProducerSelect");
    if (animalSelect) animalSelect.value = state.selectedProducerId;
  }
}

document.addEventListener("DOMContentLoaded", initApp);
