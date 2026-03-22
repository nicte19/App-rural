const STORAGE_KEY = "app_rural_netlify_v1";

const SECTION_CONFIG = {
  producerForm: {
    key: "producers",
    listId: "list",
    countId: "count",
    searchId: null,
    messageIds: { msg: "msg", ok: "ok", err: "err" },
    primaryFieldCandidates: ["nombre", "localidad", "municipio"],
    cardTitle: "Productores"
  },
  animalForm: {
    key: "animals",
    listId: "a_list",
    countId: null,
    searchId: null,
    messageIds: { msg: "a_msg", ok: null, err: null },
    primaryFieldCandidates: ["a_especie", "a_raza", "a_dueno"],
    cardTitle: "Registros animales"
  },
  medForm: {
    key: "meds",
    listId: "m_list",
    countId: "m_count",
    searchId: "m_search",
    messageIds: { msg: "m_msg", ok: "m_ok", err: "m_err" },
    primaryFieldCandidates: ["m_brand", "m_active", "m_presentation"],
    cardTitle: "Medicamentos"
  },
  supplyForm: {
    key: "supplies",
    listId: "s_list",
    countId: "s_count",
    searchId: "s_search",
    messageIds: { msg: "s_msg", ok: "s_ok", err: "s_err" },
    primaryFieldCandidates: ["s_name", "s_presentation"],
    cardTitle: "Insumos"
  },
  procedureForm: {
    key: "procedures",
    listId: "p_list",
    countId: "p_count",
    searchId: "p_search",
    messageIds: { msg: "p_msg", ok: "p_ok", err: "p_err" },
    primaryFieldCandidates: ["p_type", "p_place", "p_identification"],
    cardTitle: "Procedimientos"
  }
};

const FILE_INPUT_CONFIG = {
  fotoTomar: { storageKey: "producerPhoto", previewId: "fotoPreview", multiple: false },
  fotoElegir: { storageKey: "producerPhoto", previewId: "fotoPreview", multiple: false },
  a_instTake: { storageKey: "animalEvidence", previewId: "a_instPreview", hintId: "a_instHint", multiple: true },
  a_instPick: { storageKey: "animalEvidence", previewId: "a_instPreview", hintId: "a_instHint", multiple: true },
  m_rx_take: { storageKey: "medRxPhoto", previewId: "m_rx_preview", multiple: false },
  m_rx_pick: { storageKey: "medRxPhoto", previewId: "m_rx_preview", multiple: false },
  m_tk_take: { storageKey: "medTicketPhoto", previewId: "m_tk_preview", multiple: false },
  m_tk_pick: { storageKey: "medTicketPhoto", previewId: "m_tk_preview", multiple: false },
  s_tk_take: { storageKey: "supplyTicketPhoto", previewId: "s_tk_preview", multiple: false },
  s_tk_pick: { storageKey: "supplyTicketPhoto", previewId: "s_tk_preview", multiple: false },
  p_cc_take: { storageKey: "procedureCasePhotos", previewId: "p_cc_preview", hintId: "p_cc_hint", multiple: true },
  p_cc_pick: { storageKey: "procedureCasePhotos", previewId: "p_cc_preview", hintId: "p_cc_hint", multiple: true },
  p_nec_take: { storageKey: "procedureNecropsyPhotos", previewId: "p_nec_preview", hintId: "p_nec_hint", multiple: true },
  p_nec_pick: { storageKey: "procedureNecropsyPhotos", previewId: "p_nec_preview", hintId: "p_nec_hint", multiple: true },
  p_charge_take: { storageKey: "procedureChargePhoto", previewId: "p_charge_preview", multiple: false },
  p_charge_pick: { storageKey: "procedureChargePhoto", previewId: "p_charge_preview", multiple: false }
};

const state = loadState();

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function loadState() {
  try {
    return {
      drafts: {},
      collections: {
        producers: [],
        animals: [],
        meds: [],
        supplies: [],
        procedures: []
      },
      files: {},
      editing: {},
      ui: { activePage: "pageProducer" },
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    };
  } catch {
    return { drafts: {}, collections: { producers: [], animals: [], meds: [], supplies: [], procedures: [] }, files: {}, editing: {}, ui: { activePage: "pageProducer" } };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSectionConfig(formId) {
  return SECTION_CONFIG[formId];
}

function safeJsonDownload(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sectionLabel(formId, record) {
  const config = getSectionConfig(formId);
  const base = config.primaryFieldCandidates.map((field) => record.data[field]).find(Boolean);
  return base || `${config.cardTitle} · ${new Date(record.savedAt).toLocaleString("es-MX")}`;
}

function setMessage({ msgId, okId, errId }, type, text) {
  [msgId, okId, errId].forEach((id) => {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === (type === "ok" ? okId : type === "err" ? errId : msgId) ? "block" : "none";
    if (id === msgId || id === okId || id === errId) el.textContent = id === (type === "ok" ? okId : type === "err" ? errId : msgId) ? text : "";
  });
}

function serializeForm(form) {
  const data = {};
  const elements = Array.from(form.elements).filter((el) => el.id || el.name);
  elements.forEach((el) => {
    const key = el.id || el.name;
    if (!key || el.type === "file" || el.type === "submit" || el.type === "button") return;
    if (el.type === "radio") {
      if (el.checked) data[key] = el.value;
      return;
    }
    if (el.type === "checkbox") {
      data[key] = el.checked;
      return;
    }
    if (el.tagName === "SELECT" && el.multiple) {
      data[key] = Array.from(el.selectedOptions).map((option) => option.value);
      return;
    }
    data[key] = el.value;
  });
  return data;
}

function restoreForm(form, values = {}) {
  const elements = Array.from(form.elements).filter((el) => el.id || el.name);
  elements.forEach((el) => {
    const key = el.id || el.name;
    if (!key || !(key in values) || el.type === "file") return;
    const value = values[key];
    if (el.type === "radio") {
      el.checked = el.value === value;
      return;
    }
    if (el.type === "checkbox") {
      el.checked = Boolean(value);
      return;
    }
    if (el.tagName === "SELECT" && el.multiple && Array.isArray(value)) {
      Array.from(el.options).forEach((option) => {
        option.selected = value.includes(option.value);
      });
      return;
    }
    el.value = value ?? "";
  });
  runVisibilityRules();
  recalculateDerivedFields();
}

function resetForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.reset();
  state.drafts[formId] = {};
  delete state.editing[formId];
  if (formId === "producerForm") {
    ["producerPhoto"].forEach(clearStoredFile);
  }
  if (formId === "animalForm") {
    clearStoredFile("animalEvidence");
  }
  if (formId === "medForm") {
    ["medRxPhoto", "medTicketPhoto"].forEach(clearStoredFile);
  }
  if (formId === "supplyForm") {
    clearStoredFile("supplyTicketPhoto");
  }
  if (formId === "procedureForm") {
    ["procedureCasePhotos", "procedureNecropsyPhotos", "procedureChargePhoto"].forEach(clearStoredFile);
  }
  saveState();
  restoreForm(form, {});
  renderAllFiles();
}

function bindDraftPersistence(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("input", () => {
    state.drafts[formId] = serializeForm(form);
    saveState();
    runVisibilityRules();
    recalculateDerivedFields();
  });
  form.addEventListener("change", () => {
    state.drafts[formId] = serializeForm(form);
    saveState();
    runVisibilityRules();
    recalculateDerivedFields();
  });
}

function saveRecord(formId) {
  const form = document.getElementById(formId);
  const config = getSectionConfig(formId);
  if (!form || !config) return;

  const data = serializeForm(form);
  const collection = state.collections[config.key];
  const editingId = state.editing[formId];
  const record = {
    id: editingId || uid(),
    data,
    files: snapshotFilesForForm(formId),
    savedAt: new Date().toISOString()
  };

  const index = collection.findIndex((item) => item.id === record.id);
  if (index >= 0) collection[index] = record;
  else collection.unshift(record);

  state.drafts[formId] = data;
  delete state.editing[formId];
  saveState();
  renderCollection(formId);
  setMessage(config.messageIds, "ok", "Registro guardado localmente.");
}

function snapshotFilesForForm(formId) {
  const mapping = {
    producerForm: ["producerPhoto"],
    animalForm: ["animalEvidence"],
    medForm: ["medRxPhoto", "medTicketPhoto"],
    supplyForm: ["supplyTicketPhoto"],
    procedureForm: ["procedureCasePhotos", "procedureNecropsyPhotos", "procedureChargePhoto"]
  };
  return Object.fromEntries((mapping[formId] || []).map((key) => [key, state.files[key] ?? null]));
}

function renderCollection(formId) {
  const config = getSectionConfig(formId);
  if (!config?.listId) return;
  const list = document.getElementById(config.listId);
  if (!list) return;
  const query = config.searchId ? (document.getElementById(config.searchId)?.value || "").trim().toLowerCase() : "";
  const items = state.collections[config.key].filter((record) => {
    if (!query) return true;
    return JSON.stringify(record.data).toLowerCase().includes(query);
  });

  if (config.countId) {
    const countEl = document.getElementById(config.countId);
    if (countEl) countEl.textContent = String(items.length);
  }

  if (!items.length) {
    list.innerHTML = `<div class="help">Sin registros guardados en ${escapeHtml(config.cardTitle.toLowerCase())}.</div>`;
    return;
  }

  list.innerHTML = items.map((record) => `
    <article class="list-item">
      <div>
        <strong>${escapeHtml(sectionLabel(formId, record))}</strong>
        <div class="help">${new Date(record.savedAt).toLocaleString("es-MX")}</div>
      </div>
      <div class="row">
        <button class="btn small ghost" type="button" data-action="edit" data-form="${formId}" data-id="${record.id}">Editar</button>
        <button class="btn small ghost" type="button" data-action="export-one" data-form="${formId}" data-id="${record.id}">JSON</button>
        <button class="btn small bad" type="button" data-action="delete" data-form="${formId}" data-id="${record.id}">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function editRecord(formId, id) {
  const config = getSectionConfig(formId);
  const record = state.collections[config.key].find((item) => item.id === id);
  if (!record) return;
  state.editing[formId] = id;
  state.drafts[formId] = record.data;
  Object.assign(state.files, record.files || {});
  saveState();
  restoreForm(document.getElementById(formId), record.data);
  renderAllFiles();
  setMessage(config.messageIds, "msg", "Editando registro guardado.");
}

function deleteRecord(formId, id) {
  const config = getSectionConfig(formId);
  state.collections[config.key] = state.collections[config.key].filter((item) => item.id !== id);
  saveState();
  renderCollection(formId);
  setMessage(config.messageIds, "msg", "Registro eliminado.");
}

function clearStoredFile(storageKey) {
  delete state.files[storageKey];
}

function renderSinglePreview(previewId, fileData, emptyLabel = "Sin foto") {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  preview.innerHTML = fileData ? `<img src="${fileData}" alt="Vista previa" />` : `<span>${emptyLabel}</span>`;
}

function renderMultiPreview(previewId, files = [], hintId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  preview.innerHTML = files.length
    ? files.map((src, index) => `<div class="thumb thumb-multi"><img src="${src}" alt="Evidencia ${index + 1}" /></div>`).join("")
    : "";
  const hint = hintId ? document.getElementById(hintId) : null;
  if (hint) hint.textContent = files.length ? `${files.length} archivo(s) cargado(s).` : "Sin fotos todavía.";
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderAllFiles() {
  renderSinglePreview("fotoPreview", state.files.producerPhoto, "Sin<br/>foto");
  renderSinglePreview("m_rx_preview", state.files.medRxPhoto, "Sin<br/>receta");
  renderSinglePreview("m_tk_preview", state.files.medTicketPhoto, "Sin<br/>ticket");
  renderSinglePreview("s_tk_preview", state.files.supplyTicketPhoto, "Sin<br/>ticket");
  renderSinglePreview("p_charge_preview", state.files.procedureChargePhoto, "Sin<br/>foto");
  renderMultiPreview("a_instPreview", state.files.animalEvidence || [], "a_instHint");
  renderMultiPreview("p_cc_preview", state.files.procedureCasePhotos || [], "p_cc_hint");
  renderMultiPreview("p_nec_preview", state.files.procedureNecropsyPhotos || [], "p_nec_hint");
}

function bindFileInputs() {
  Object.entries(FILE_INPUT_CONFIG).forEach(([inputId, config]) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener("change", async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      const encoded = await Promise.all(files.map(fileToBase64));
      state.files[config.storageKey] = config.multiple ? encoded : encoded[0];
      saveState();
      renderAllFiles();
      event.target.value = "";
    });
  });

  const clickMap = {
    btnTakePhoto: "fotoTomar",
    btnPickPhoto: "fotoElegir",
    a_btnInstTake: "a_instTake",
    a_btnInstPick: "a_instPick",
    m_btnRxTake: "m_rx_take",
    m_btnRxPick: "m_rx_pick",
    m_btnTkTake: "m_tk_take",
    m_btnTkPick: "m_tk_pick",
    s_btnTkTake: "s_tk_take",
    s_btnTkPick: "s_tk_pick",
    p_cc_btnTake: "p_cc_take",
    p_cc_btnPick: "p_cc_pick",
    p_nec_btnTake: "p_nec_take",
    p_nec_btnPick: "p_nec_pick",
    p_charge_btnTake: "p_charge_take",
    p_charge_btnPick: "p_charge_pick"
  };

  Object.entries(clickMap).forEach(([buttonId, inputId]) => {
    document.getElementById(buttonId)?.addEventListener("click", () => document.getElementById(inputId)?.click());
  });

  const clearMap = {
    btnRemovePhoto: "producerPhoto",
    a_btnInstClear: "animalEvidence",
    m_btnRxRemove: "medRxPhoto",
    m_btnTkRemove: "medTicketPhoto",
    s_btnTkRemove: "supplyTicketPhoto",
    p_cc_btnClear: "procedureCasePhotos",
    p_nec_btnClear: "procedureNecropsyPhotos",
    p_charge_btnClear: "procedureChargePhoto"
  };

  Object.entries(clearMap).forEach(([buttonId, storageKey]) => {
    document.getElementById(buttonId)?.addEventListener("click", () => {
      clearStoredFile(storageKey);
      saveState();
      renderAllFiles();
    });
  });
}

function bindTabs() {
  const tabs = [
    ["tabProducer", "pageProducer"],
    ["tabAnimals", "pageAnimals"],
    ["tabMeds", "pageMeds"],
    ["tabSupplies", "pageSupplies"],
    ["tabProcedures", "pageProcedures"]
  ];

  function activate(pageId) {
    state.ui.activePage = pageId;
    tabs.forEach(([tabId, currentPageId]) => {
      document.getElementById(tabId)?.classList.toggle("active", currentPageId === pageId);
      document.getElementById(currentPageId)?.classList.toggle("active", currentPageId === pageId);
    });
    saveState();
  }

  tabs.forEach(([tabId, pageId]) => document.getElementById(tabId)?.addEventListener("click", () => activate(pageId)));
  document.getElementById("btnGoProducerFromAnimals")?.addEventListener("click", () => activate("pageProducer"));
  activate(state.ui.activePage || "pageProducer");
}

function bindGeoTools() {
  document.getElementById("btnGeo")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setMessage(SECTION_CONFIG.producerForm.messageIds, "err", "Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        document.getElementById("lat").value = coords.latitude.toFixed(7);
        document.getElementById("lng").value = coords.longitude.toFixed(7);
        state.drafts.producerForm = serializeForm(document.getElementById("producerForm"));
        saveState();
      },
      () => setMessage(SECTION_CONFIG.producerForm.messageIds, "err", "No fue posible obtener tu ubicación.")
    );
  });

  document.getElementById("btnGenMaps")?.addEventListener("click", () => {
    const lat = document.getElementById("lat")?.value?.trim();
    const lng = document.getElementById("lng")?.value?.trim();
    if (!lat || !lng) return;
    document.getElementById("mapsUrl").value = `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lng}`)}`;
    state.drafts.producerForm = serializeForm(document.getElementById("producerForm"));
    saveState();
  });

  document.getElementById("btnOpenMaps")?.addEventListener("click", () => {
    const url = document.getElementById("mapsUrl")?.value?.trim();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });

  document.getElementById("btnClearLocation")?.addEventListener("click", () => {
    ["lat", "lng", "mapsUrl"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.value = "";
    });
    state.drafts.producerForm = serializeForm(document.getElementById("producerForm"));
    saveState();
  });
}

function bindCollectionActions() {
  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, form, id } = button.dataset;
    if (action === "edit") editRecord(form, id);
    if (action === "delete") deleteRecord(form, id);
    if (action === "export-one") {
      const config = getSectionConfig(form);
      const record = state.collections[config.key].find((item) => item.id === id);
      if (record) safeJsonDownload(`${config.key}-${id}.json`, record);
    }
  });
}

function exportSection(formId) {
  const config = getSectionConfig(formId);
  safeJsonDownload(`${config.key}.json`, state.collections[config.key]);
}

function importSection(formId, file) {
  const reader = new FileReader();
  const config = getSectionConfig(formId);
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state.collections[config.key] = Array.isArray(parsed) ? parsed : [parsed];
      saveState();
      renderCollection(formId);
      setMessage(config.messageIds, "ok", "Importación completada.");
    } catch {
      setMessage(config.messageIds, "err", "El archivo JSON no es válido.");
    }
  };
  reader.readAsText(file);
}

function exportWordLike(formId) {
  const config = getSectionConfig(formId);
  const html = `
    <html><head><meta charset="utf-8"><title>${config.cardTitle}</title></head><body>
      <h1>${config.cardTitle}</h1>
      ${state.collections[config.key].map((record) => `
        <section>
          <h2>${escapeHtml(sectionLabel(formId, record))}</h2>
          <pre>${escapeHtml(JSON.stringify(record.data, null, 2))}</pre>
        </section>`).join("")}
    </body></html>`;
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.key}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function bindImportsExports() {
  const bindings = [
    ["btnExport", () => exportSection("producerForm")],
    ["btnImport", () => document.getElementById("importFile")?.click()],
    ["btnExportWordProducer", () => exportWordLike("producerForm")],
    ["m_btnExport", () => exportSection("medForm")],
    ["m_btnImport", () => document.getElementById("m_importFile")?.click()],
    ["m_btnExportExcel", () => exportWordLike("medForm")],
    ["s_btnExport", () => exportSection("supplyForm")],
    ["s_btnImport", () => document.getElementById("s_importFile")?.click()],
    ["s_btnExportExcel", () => exportWordLike("supplyForm")],
    ["p_btnExportJson", () => exportSection("procedureForm")],
    ["p_btnImportJson", () => document.getElementById("p_importFile")?.click()],
    ["p_btnExportWord", () => exportWordLike("procedureForm")]
  ];
  bindings.forEach(([id, handler]) => document.getElementById(id)?.addEventListener("click", handler));

  [
    ["importFile", "producerForm"],
    ["m_importFile", "medForm"],
    ["s_importFile", "supplyForm"],
    ["p_importFile", "procedureForm"]
  ].forEach(([inputId, formId]) => {
    document.getElementById(inputId)?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) importSection(formId, file);
      event.target.value = "";
    });
  });

  document.getElementById("btnWipe")?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });
}

function bindFormButtons() {
  const saveButtons = {
    producerForm: { event: "submit", buttonId: null },
    animalForm: { event: "click", buttonId: "a_save" },
    medForm: { event: "submit", buttonId: null },
    supplyForm: { event: "submit", buttonId: null },
    procedureForm: { event: "submit", buttonId: null }
  };

  Object.entries(saveButtons).forEach(([formId, cfg]) => {
    const form = document.getElementById(formId);
    if (!form) return;
    if (cfg.event === "submit") {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveRecord(formId);
      });
    } else {
      document.getElementById(cfg.buttonId)?.addEventListener("click", () => saveRecord(formId));
    }
  });

  [
    ["btnReset", "producerForm"],
    ["a_clear", "animalForm"],
    ["m_btnClear", "medForm"],
    ["s_btnClear", "supplyForm"],
    ["p_clear", "procedureForm"]
  ].forEach(([buttonId, formId]) => document.getElementById(buttonId)?.addEventListener("click", () => resetForm(formId)));
}

function runVisibilityRules() {
  const toggle = (value, expected, targetId, display = "block") => {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.style.display = value === expected ? display : "none";
  };

  const pInd = document.getElementById("pertenenciaIndigena")?.value;
  toggle(pInd, "YO", "grupoIndigenaYoWrap");
  toggle(pInd, "FAMILIAR", "grupoIndigenaFamiliarWrap", "grid");

  const lengua = document.getElementById("lenguaIndigenaTipo")?.value;
  toggle(lengua, "YO", "lenguaYoWrap");
  toggle(lengua, "FAMILIAR", "lenguaFamiliarWrap", "grid");

  const birdsYes = document.getElementById("a_interestBirdsYes")?.value;
  const birdsNo = document.getElementById("a_interestBirdsNo")?.value;
  if (document.getElementById("a_interestBirdsYesWrap")) document.getElementById("a_interestBirdsYesWrap").style.display = birdsYes === "SI" ? "block" : "none";
  if (document.getElementById("a_interestBirdsNoWrap")) document.getElementById("a_interestBirdsNoWrap").style.display = birdsNo === "SI" ? "block" : "none";
}

function recalculateDerivedFields() {
  const totalQty = parseFloat(document.getElementById("m_totalQty")?.value || "0");
  const cost = parseFloat(document.getElementById("m_cost")?.value || "0");
  const unitCost = document.getElementById("m_unitCost");
  if (unitCost) unitCost.value = totalQty > 0 && cost > 0 ? (cost / totalQty).toFixed(2) : "";

  const sQty = parseFloat(document.getElementById("s_qty")?.value || "0");
  const sPrice = parseFloat(document.getElementById("s_price")?.value || "0");
  const sUnitCost = document.getElementById("s_unitCost");
  if (sUnitCost) sUnitCost.value = sQty > 0 && sPrice > 0 ? (sPrice / sQty).toFixed(2) : "";

  const sCostAcq = parseFloat(document.getElementById("s_costAcq")?.value || "0");
  const sLifeMonths = parseFloat(document.getElementById("s_lifeMonths")?.value || "0");
  const sEstimatedUses = parseFloat(document.getElementById("s_estimatedUses")?.value || "0");
  const sCostMonth = document.getElementById("s_costMonth");
  const sCostUse = document.getElementById("s_costUse");
  if (sCostMonth) sCostMonth.value = sCostAcq > 0 && sLifeMonths > 0 ? (sCostAcq / sLifeMonths).toFixed(2) : "";
  if (sCostUse) sCostUse.value = sCostAcq > 0 && sEstimatedUses > 0 ? (sCostAcq / sEstimatedUses).toFixed(2) : "";
}

function hydrateForms() {
  Object.keys(SECTION_CONFIG).forEach((formId) => {
    const form = document.getElementById(formId);
    if (!form) return;
    restoreForm(form, state.drafts[formId] || {});
    bindDraftPersistence(formId);
    renderCollection(formId);
    const searchId = SECTION_CONFIG[formId].searchId;
    if (searchId) document.getElementById(searchId)?.addEventListener("input", () => renderCollection(formId));
  });
}

function bindFamilyRepeater() {
  document.getElementById("btnAddFamily")?.addEventListener("click", () => {
    const container = document.getElementById("familyList");
    if (!container) return;
    const item = document.createElement("div");
    item.className = "grid cols-3 family-item";
    item.innerHTML = `
      <input type="text" placeholder="Nombre" />
      <input type="text" placeholder="Parentesco" />
      <input type="number" min="0" step="1" placeholder="Edad" />`;
    container.appendChild(item);
  });
}

function init() {
  bindTabs();
  bindGeoTools();
  bindFileInputs();
  bindCollectionActions();
  bindImportsExports();
  bindFormButtons();
  hydrateForms();
  bindFamilyRepeater();
  renderAllFiles();
  runVisibilityRules();
  recalculateDerivedFields();
}

document.addEventListener("DOMContentLoaded", init);
