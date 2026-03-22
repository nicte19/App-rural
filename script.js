const STORAGE_KEY = "app_rural_netlify_v1";

const state = {
  producers: [],
  meds: [],
  supplies: [],
  selectedProducerId: null,
  editing: { producerId: null, medId: null, supplyId: null },
  ui: { medMode: "MANUAL", supplyMode: "DISPOSABLE", producerClassification: "TRABAJAR" },
  media: { producerPhoto: null, medRxPhoto: null, medTicketPhoto: null, supplyTicketPhoto: null }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n || 0));

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed) return;
    Object.assign(state, {
      producers: parsed.producers || [],
      meds: parsed.meds || [],
      supplies: parsed.supplies || [],
      selectedProducerId: parsed.selectedProducerId || null
    });
    state.ui = { ...state.ui, ...(parsed.ui || {}) };
  } catch (error) {
    console.error("No se pudo cargar el estado", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    producers: state.producers,
    meds: state.meds,
    supplies: state.supplies,
    selectedProducerId: state.selectedProducerId,
    ui: state.ui
  }));
}

function showMessage(okId, errId, okText = "", errText = "") {
  const ok = $(okId);
  const err = $(errId);
  if (ok) {
    ok.textContent = okText;
    ok.style.display = okText ? "block" : "none";
  }
  if (err) {
    err.textContent = errText;
    err.style.display = errText ? "block" : "none";
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setThumb(id, dataUrl, fallback) {
  const el = $("#" + id);
  if (!el) return;
  el.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="preview" />` : `<span>${fallback}</span>`;
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

function familyRowTemplate(item = {}) {
  return `<tr>
    <td><input type="text" class="fam-name" value="${item.name || ""}" placeholder="Nombre" /></td>
    <td><input type="text" class="fam-relation" value="${item.relation || ""}" placeholder="Relación" /></td>
    <td><input type="text" class="fam-occupation" value="${item.occupation || ""}" placeholder="Ocupación" /></td>
    <td><input type="number" class="fam-age" value="${item.age || ""}" min="0" step="1" placeholder="Edad" /></td>
    <td><button type="button" class="btn bad small fam-remove">✖</button></td>
  </tr>`;
}

function addFamilyRow(item = {}) {
  const tbody = $("#familyTbody");
  if (!tbody) return;
  tbody.insertAdjacentHTML("beforeend", familyRowTemplate(item));
  tbody.lastElementChild.querySelector(".fam-remove")?.addEventListener("click", (e) => e.currentTarget.closest("tr")?.remove());
}

function collectFamilyRows() {
  return $$("#familyTbody tr").map((row) => ({
    name: row.querySelector(".fam-name")?.value.trim() || "",
    relation: row.querySelector(".fam-relation")?.value.trim() || "",
    occupation: row.querySelector(".fam-occupation")?.value.trim() || "",
    age: row.querySelector(".fam-age")?.value.trim() || ""
  })).filter((row) => Object.values(row).some(Boolean));
}

function setFamilyRows(items = []) {
  const tbody = $("#familyTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  (items.length ? items : [{}]).forEach(addFamilyRow);
}

function updateProducerConditionalFields() {
  const pertenencia = $("#pertenenciaIndigena")?.value;
  const lengua = $("#lenguaIndigenaTipo")?.value;
  $("#grupoIndigenaYoWrap").style.display = pertenencia === "YO" ? "block" : "none";
  $("#grupoIndigenaFamiliarWrap").style.display = pertenencia === "FAMILIAR" ? "grid" : "none";
  $("#lenguaYoWrap").style.display = lengua === "YO" ? "block" : "none";
  $("#lenguaFamiliarWrap").style.display = lengua === "FAMILIAR" ? "grid" : "none";
}

function setProducerClassification(value) {
  state.ui.producerClassification = value;
  $$("#chipsClasificacion .chip").forEach((chip) => chip.dataset.active = String(chip.dataset.value === value));
  $("#alertaWrap").style.display = value === "NO_TRABAJAR" ? "block" : "none";
}

function getProducerClassification() {
  return state.ui.producerClassification || "TRABAJAR";
}

function producerFromForm() {
  return {
    id: state.editing.producerId || uid(),
    basic: {
      name: $("#nombre")?.value.trim() || "",
      edad: $("#edad")?.value || "",
      sexo: $("#sexo")?.value || "",
      estadoCivil: $("#estadoCivil")?.value || "",
      celular: $("#celular")?.value.trim() || "",
      personasEnCasa: $("#personasEnCasa")?.value || "",
      localidad: $("#localidad")?.value.trim() || "",
      municipio: $("#municipio")?.value.trim() || "",
      estado: $("#estado")?.value.trim() || ""
    },
    family: collectFamilyRows(),
    indigenous: {
      pertenencia: $("#pertenenciaIndigena")?.value || "",
      grupoYo: $("#grupoIndigenaYo")?.value.trim() || "",
      familiarQuien: $("#grupoIndigenaFamiliarQuien")?.value.trim() || "",
      familiarCual: $("#grupoIndigenaFamiliarCual")?.value.trim() || "",
      lenguaTipo: $("#lenguaIndigenaTipo")?.value || "",
      lenguaYo: $("#lenguaYo")?.value.trim() || "",
      lenguaFamiliarQuien: $("#lenguaFamiliarQuien")?.value.trim() || "",
      lenguaFamiliarCual: $("#lenguaFamiliarCual")?.value.trim() || ""
    },
    classification: getProducerClassification(),
    alerta: $("#alerta")?.value.trim() || "",
    notaExtraPersona: $("#notaExtraPersona")?.value.trim() || "",
    notas: $("#notas")?.value.trim() || "",
    photo: state.media.producerPhoto || null,
    createdAt: new Date().toISOString()
  };
}

function resetProducerForm() {
  $("#producerForm")?.reset();
  state.editing.producerId = null;
  state.media.producerPhoto = null;
  setThumb("photoPreview", null, "Sin<br/>foto");
  setProducerClassification("TRABAJAR");
  setFamilyRows([{}]);
  updateProducerConditionalFields();
  $("#btnCancelEdit").style.display = "none";
  showMessage("#ok", "#err");
}

function fillProducerForm(producer) {
  state.editing.producerId = producer.id;
  $("#nombre").value = producer.basic.name || "";
  $("#edad").value = producer.basic.edad || "";
  $("#sexo").value = producer.basic.sexo || "";
  $("#estadoCivil").value = producer.basic.estadoCivil || "";
  $("#celular").value = producer.basic.celular || "";
  $("#personasEnCasa").value = producer.basic.personasEnCasa || "";
  $("#localidad").value = producer.basic.localidad || "";
  $("#municipio").value = producer.basic.municipio || "";
  $("#estado").value = producer.basic.estado || "";
  $("#pertenenciaIndigena").value = producer.indigenous.pertenencia || "";
  $("#grupoIndigenaYo").value = producer.indigenous.grupoYo || "";
  $("#grupoIndigenaFamiliarQuien").value = producer.indigenous.familiarQuien || "";
  $("#grupoIndigenaFamiliarCual").value = producer.indigenous.familiarCual || "";
  $("#lenguaIndigenaTipo").value = producer.indigenous.lenguaTipo || "";
  $("#lenguaYo").value = producer.indigenous.lenguaYo || "";
  $("#lenguaFamiliarQuien").value = producer.indigenous.lenguaFamiliarQuien || "";
  $("#lenguaFamiliarCual").value = producer.indigenous.lenguaFamiliarCual || "";
  $("#alerta").value = producer.alerta || "";
  $("#notaExtraPersona").value = producer.notaExtraPersona || "";
  $("#notas").value = producer.notas || "";
  state.media.producerPhoto = producer.photo || null;
  setThumb("photoPreview", producer.photo || null, "Sin<br/>foto");
  setProducerClassification(producer.classification || "TRABAJAR");
  setFamilyRows(producer.family || [{}]);
  updateProducerConditionalFields();
  $("#btnCancelEdit").style.display = "inline-flex";
  activateTab("producer");
}

function renderProducerList() {
  const list = $("#producerList");
  const count = $("#count");
  if (!list || !count) return;
  count.textContent = String(state.producers.length);
  if (!state.producers.length) {
    list.innerHTML = '<div class="empty-state">Aún no hay productores guardados.</div>';
    return;
  }
  list.innerHTML = state.producers.map((producer) => `
    <article class="item">
      <h3>${producer.basic.name}</h3>
      <div class="meta">${[producer.basic.localidad, producer.basic.municipio, producer.basic.estado].filter(Boolean).join(", ") || "Sin ubicación"}</div>
      <div class="row" style="margin-bottom:10px;">
        <span class="badge">👨‍👩‍👧‍👦 ${producer.family.length} familiares</span>
        <span class="badge ${producer.classification === "NO_TRABAJAR" ? "bad" : producer.classification === "PENDIENTE" ? "warn" : "ok"}">${producer.classification}</span>
      </div>
      <div class="actions">
        <button class="btn small" data-action="edit" data-id="${producer.id}">✏️ Editar</button>
        <button class="btn small bad" data-action="delete" data-id="${producer.id}">🗑️ Borrar</button>
      </div>
    </article>`).join("");

  list.querySelectorAll("[data-action='edit']").forEach((btn) => btn.addEventListener("click", () => {
    const producer = state.producers.find((item) => item.id === btn.dataset.id);
    if (producer) fillProducerForm(producer);
  }));
  list.querySelectorAll("[data-action='delete']").forEach((btn) => btn.addEventListener("click", () => {
    state.producers = state.producers.filter((item) => item.id !== btn.dataset.id);
    saveState();
    renderProducerList();
    showMessage("#ok", "#err", "Productor eliminado.");
  }));
}

function saveProducer(event) {
  event.preventDefault();
  const producer = producerFromForm();
  if (!producer.basic.name) {
    showMessage("#ok", "#err", "", "El nombre del productor(a) es obligatorio.");
    return;
  }
  const idx = state.producers.findIndex((item) => item.id === producer.id);
  if (idx >= 0) state.producers[idx] = producer; else state.producers.unshift(producer);
  state.selectedProducerId = producer.id;
  saveState();
  renderProducerList();
  showMessage("#ok", "#err", "Productor(a) guardado correctamente.");
  resetProducerForm();
}

function bindProducerSection() {
  setFamilyRows([{}]);
  $$("#chipsClasificacion .chip").forEach((chip) => chip.addEventListener("click", () => setProducerClassification(chip.dataset.value)));
  $("#btnAddFamily")?.addEventListener("click", () => addFamilyRow());
  $("#producerForm")?.addEventListener("submit", saveProducer);
  $("#btnReset")?.addEventListener("click", resetProducerForm);
  $("#btnCancelEdit")?.addEventListener("click", resetProducerForm);
  $("#pertenenciaIndigena")?.addEventListener("change", updateProducerConditionalFields);
  $("#lenguaIndigenaTipo")?.addEventListener("change", updateProducerConditionalFields);
  $("#btnPickPhoto")?.addEventListener("click", () => $("#fotoElegir")?.click());
  $("#btnTakePhoto")?.addEventListener("click", () => $("#fotoTomar")?.click());
  ["#fotoTomar", "#fotoElegir"].forEach((id) => $(id)?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.media.producerPhoto = await readFileAsBase64(file);
    setThumb("photoPreview", state.media.producerPhoto, "Sin<br/>foto");
    e.target.value = "";
  }));
  $("#btnRemovePhoto")?.addEventListener("click", () => {
    state.media.producerPhoto = null;
    setThumb("photoPreview", null, "Sin<br/>foto");
  });
  $("#btnWipe")?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function medFromForm() {
  return {
    id: state.editing.medId || uid(),
    brand: $("#m_brand")?.value.trim() || "",
    active: $("#m_active")?.value.trim() || "",
    owner: $("#m_owner")?.value || "",
    presentation: $("#m_presentation")?.value.trim() || "",
    cost: Number($("#m_cost")?.value || 0),
    expiry: $("#m_expiry")?.value || "",
    totalQty: Number($("#m_totalQty")?.value || 0),
    unit: $("#m_unit")?.value || "",
    unitCost: Number($("#m_unitCost")?.value || 0),
    use: $("#m_use")?.value.trim() || "",
    mech: $("#m_mech")?.value.trim() || "",
    adverse: $("#m_adverse")?.value.trim() || "",
    preg: $("#m_preg")?.value.trim() || "",
    pk: $("#m_pk")?.value.trim() || "",
    overdose: $("#m_overdose")?.value.trim() || "",
    interactions: $("#m_interactions")?.value.trim() || "",
    dosing: $("#m_dosing")?.value.trim() || "",
    rxPhoto: state.media.medRxPhoto || null,
    ticketPhoto: state.media.medTicketPhoto || null
  };
}

function calcMedUnitCost() {
  const qty = Number($("#m_totalQty")?.value || 0);
  const cost = Number($("#m_cost")?.value || 0);
  $("#m_unitCost").value = qty > 0 ? (cost / qty).toFixed(2) : "";
}

function renderMedMode() {
  const isChat = state.ui.medMode === "CHATGPT";
  $("#chatgptBlock").style.display = isChat ? "block" : "none";
  $("#m_modeHint").textContent = `Modo actual: ${isChat ? "🪄 ChatGPT" : "✍️ Manual"}`;
  $("#m_modeManual").classList.toggle("ghost", isChat);
  $("#m_modeChatGPT").classList.toggle("ghost", !isChat);
}

function buildMedicationPrompt(sourceText) {
  return `Convierte la siguiente información veterinaria al español y responde SOLO con JSON válido.\n\nCampos requeridos:\n{\n  "brand": "",\n  "active": "",\n  "use": "",\n  "mechanism": "",\n  "adverse": "",\n  "pregnancy": "",\n  "pharmacokinetics": "",\n  "overdose": "",\n  "interactions": "",\n  "dosing": ""\n}\n\nSi falta un dato, deja cadena vacía. Resume en lenguaje claro para campo.\n\nTexto fuente:\n${sourceText}`;
}

function fillMedicationFromJson(jsonText) {
  const parsed = JSON.parse(jsonText);
  $("#m_brand").value = parsed.brand || $("#m_brand").value;
  $("#m_active").value = parsed.active || $("#m_active").value;
  $("#m_use").value = parsed.use || parsed.para_que_se_ocupa || "";
  $("#m_mech").value = parsed.mechanism || parsed.mecanismo || "";
  $("#m_adverse").value = parsed.adverse || parsed.efectos_adversos || "";
  $("#m_preg").value = parsed.pregnancy || parsed.gestacion || "";
  $("#m_pk").value = parsed.pharmacokinetics || parsed.farmacocinetica || "";
  $("#m_overdose").value = parsed.overdose || parsed.sobredosis || "";
  $("#m_interactions").value = parsed.interactions || parsed.interacciones || "";
  $("#m_dosing").value = parsed.dosing || parsed.dosificacion || "";
}

function resetMedForm() {
  $("#medForm")?.reset();
  state.editing.medId = null;
  state.media.medRxPhoto = null;
  state.media.medTicketPhoto = null;
  setThumb("m_rx_preview", null, "Sin<br/>receta");
  setThumb("m_tk_preview", null, "Sin<br/>ticket");
  $("#ai_prompt").value = "";
  $("#ai_result").value = "";
  $("#ai_status").textContent = "";
}

function renderMedList() {
  const list = $("#m_list");
  const query = $("#m_search")?.value.trim().toLowerCase() || "";
  const items = state.meds.filter((med) => !query || `${med.brand} ${med.active}`.toLowerCase().includes(query));
  $("#m_count").textContent = String(state.meds.length);
  list.innerHTML = items.length ? items.map((med) => `
    <article class="item">
      <h3>${med.brand || "Sin nombre"}</h3>
      <div class="meta">${med.active || "Sin sustancia activa"}</div>
      <div class="kv">
        <div class="line"><b>Dueño:</b> <span>${med.owner || "—"}</span></div>
        <div class="line"><b>Costo unitario:</b> <span>${med.unitCost ? money(med.unitCost) : "—"}</span></div>
      </div>
      <div class="actions">
        <button class="btn small" data-edit="${med.id}">✏️ Editar</button>
        <button class="btn small bad" data-delete="${med.id}">🗑️ Borrar</button>
      </div>
    </article>`).join("") : '<div class="empty-state">No hay medicamentos guardados.</div>';
  list.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => {
    const med = state.meds.find((item) => item.id === btn.dataset.edit);
    if (!med) return;
    state.editing.medId = med.id;
    Object.entries({
      m_brand: med.brand, m_active: med.active, m_owner: med.owner, m_presentation: med.presentation,
      m_cost: med.cost, m_expiry: med.expiry, m_totalQty: med.totalQty, m_unit: med.unit,
      m_unitCost: med.unitCost, m_use: med.use, m_mech: med.mech, m_adverse: med.adverse,
      m_preg: med.preg, m_pk: med.pk, m_overdose: med.overdose, m_interactions: med.interactions, m_dosing: med.dosing
    }).forEach(([id, value]) => { const el = $("#" + id); if (el) el.value = value || ""; });
    state.media.medRxPhoto = med.rxPhoto || null;
    state.media.medTicketPhoto = med.ticketPhoto || null;
    setThumb("m_rx_preview", med.rxPhoto, "Sin<br/>receta");
    setThumb("m_tk_preview", med.ticketPhoto, "Sin<br/>ticket");
    activateTab("meds");
  }));
  list.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => {
    state.meds = state.meds.filter((item) => item.id !== btn.dataset.delete);
    saveState();
    renderMedList();
  }));
}

function saveMed(event) {
  event.preventDefault();
  const med = medFromForm();
  if (!med.brand || !med.active) {
    showMessage("#m_ok", "#m_err", "", "Nombre comercial y sustancia activa son obligatorios.");
    return;
  }
  const idx = state.meds.findIndex((item) => item.id === med.id);
  if (idx >= 0) state.meds[idx] = med; else state.meds.unshift(med);
  saveState();
  renderMedList();
  resetMedForm();
  showMessage("#m_ok", "#m_err", "Medicamento guardado correctamente.");
}

function bindMedSection() {
  $("#m_modeManual")?.addEventListener("click", () => { state.ui.medMode = "MANUAL"; renderMedMode(); saveState(); });
  $("#m_modeChatGPT")?.addEventListener("click", () => { state.ui.medMode = "CHATGPT"; renderMedMode(); saveState(); });
  $("#m_totalQty")?.addEventListener("input", calcMedUnitCost);
  $("#m_cost")?.addEventListener("input", calcMedUnitCost);
  [["#m_btnRxTake", "#m_rx_take"], ["#m_btnRxPick", "#m_rx_pick"], ["#m_btnTkTake", "#m_tk_take"], ["#m_btnTkPick", "#m_tk_pick"]].forEach(([btn, input]) => {
    $(btn)?.addEventListener("click", () => $(input)?.click());
  });
  [["#m_rx_take", "medRxPhoto", "m_rx_preview", "Sin<br/>receta"], ["#m_rx_pick", "medRxPhoto", "m_rx_preview", "Sin<br/>receta"], ["#m_tk_take", "medTicketPhoto", "m_tk_preview", "Sin<br/>ticket"], ["#m_tk_pick", "medTicketPhoto", "m_tk_preview", "Sin<br/>ticket"]].forEach(([input, key, preview, fallback]) => {
    $(input)?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      state.media[key] = await readFileAsBase64(file);
      setThumb(preview, state.media[key], fallback);
      e.target.value = "";
    });
  });
  $("#m_btnRxRemove")?.addEventListener("click", () => { state.media.medRxPhoto = null; setThumb("m_rx_preview", null, "Sin<br/>receta"); });
  $("#m_btnTkRemove")?.addEventListener("click", () => { state.media.medTicketPhoto = null; setThumb("m_tk_preview", null, "Sin<br/>ticket"); });
  $("#ai_makePrompt")?.addEventListener("click", () => {
    const source = $("#ai_english")?.value.trim();
    $("#ai_prompt").value = buildMedicationPrompt(source);
    $("#ai_status").textContent = source ? "Prompt listo para copiar en ChatGPT." : "Puedes usar el prompt aunque el texto fuente esté vacío.";
  });
  $("#ai_copyPrompt")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText($("#ai_prompt").value || "");
    $("#ai_status").textContent = "Prompt copiado.";
  });
  $("#ai_openChatGPT")?.addEventListener("click", () => window.open("https://chat.openai.com/", "_blank", "noopener,noreferrer"));
  $("#ai_copyExample")?.addEventListener("click", async () => {
    const example = JSON.stringify({ brand: "Ivomec", active: "Ivermectina", use: "Control de parásitos internos y externos", mechanism: "Actúa sobre canales de cloro del parásito", adverse: "Letargo, salivación", pregnancy: "Usar con criterio veterinario", pharmacokinetics: "Absorción sistémica con eliminación lenta", overdose: "Depresión del SNC", interactions: "Evitar combinar con otros lactonas macrocíclicas", dosing: "Seguir dosis por especie y peso" }, null, 2);
    await navigator.clipboard.writeText(example);
    $("#ai_status").textContent = "Ejemplo JSON copiado.";
  });
  $("#ai_fillFromJson")?.addEventListener("click", () => {
    try {
      fillMedicationFromJson($("#ai_result").value || "{}");
      $("#ai_status").textContent = "Ficha rellenada con el JSON.";
    } catch (error) {
      $("#ai_status").textContent = "El JSON no es válido. Revisa llaves, comas y comillas.";
    }
  });
  $("#ai_clearAll")?.addEventListener("click", () => {
    $("#ai_english").value = "";
    $("#ai_prompt").value = "";
    $("#ai_result").value = "";
    $("#ai_status").textContent = "";
  });
  $("#medForm")?.addEventListener("submit", saveMed);
  $("#m_btnClear")?.addEventListener("click", resetMedForm);
  $("#m_search")?.addEventListener("input", renderMedList);
  renderMedMode();
}

function calcSupplyCosts() {
  const qty = Number($("#s_qty")?.value || 0);
  const price = Number($("#s_price")?.value || 0);
  $("#s_unitCost").value = qty > 0 ? (price / qty).toFixed(2) : "";

  const acq = Number($("#s_costAcq")?.value || 0);
  const months = Number($("#s_lifeMonths")?.value || 0);
  const uses = Number($("#s_estimatedUses")?.value || 0);
  const costMonth = months > 0 ? acq / months : 0;
  const costUse = uses > 0 ? acq / uses : 0;
  const suggestedCharge = costUse ? costUse * 1.15 : 0;
  $("#s_costMonth").value = costMonth ? costMonth.toFixed(2) : "";
  $("#s_costUse").value = costUse ? costUse.toFixed(2) : "";
  $("#s_formulaMonth").textContent = months > 0 ? `Costo por mes = ${money(acq)} ÷ ${months} meses = ${money(costMonth)}.` : "Costo por mes = costo de adquisición ÷ vida útil.";
  $("#s_formulaUse").textContent = uses > 0 ? `Costo por uso = ${money(acq)} ÷ ${uses} usos = ${money(costUse)}.` : "Costo por uso = costo de adquisición ÷ usos estimados.";
  $("#s_formulaCharge").textContent = costUse ? `Cobro sugerido = ${money(costUse)} + 15% (${money(suggestedCharge - costUse)}) = ${money(suggestedCharge)} por uso.` : "Cobro sugerido = costo por uso + 15% para mantenimiento/reposición.";
}

function renderSupplyMode() {
  const isNonDisposable = state.ui.supplyMode === "NON_DISPOSABLE";
  $("#blockDisposable").style.display = isNonDisposable ? "none" : "block";
  $("#blockNonDisposable").style.display = isNonDisposable ? "block" : "none";
  $("#s_modeHint").textContent = `Modo actual: ${isNonDisposable ? "🔧 No desechables" : "🧴 Desechables"}`;
  $("#s_modeDisposable").classList.toggle("ghost", isNonDisposable);
  $("#s_modeNonDisposable").classList.toggle("ghost", !isNonDisposable);
}

function supplyFromForm() {
  return {
    id: state.editing.supplyId || uid(),
    mode: state.ui.supplyMode,
    name: $("#s_name")?.value.trim() || "",
    acquired: $("#s_acquired")?.value || "",
    donated: document.querySelector('input[name="s_donated"]:checked')?.value || "NO",
    presentation: $("#s_presentation")?.value.trim() || "",
    qty: Number($("#s_qty")?.value || 0),
    price: Number($("#s_price")?.value || 0),
    unitCost: Number($("#s_unitCost")?.value || 0),
    ticketPhoto: state.media.supplyTicketPhoto || null,
    costAcq: Number($("#s_costAcq")?.value || 0),
    lifeMonths: Number($("#s_lifeMonths")?.value || 0),
    estimatedUses: Number($("#s_estimatedUses")?.value || 0),
    costMonth: Number($("#s_costMonth")?.value || 0),
    costUse: Number($("#s_costUse")?.value || 0),
    notes: $("#s_notes")?.value.trim() || ""
  };
}

function resetSupplyForm() {
  $("#supplyForm")?.reset();
  state.editing.supplyId = null;
  state.media.supplyTicketPhoto = null;
  setThumb("s_tk_preview", null, "Sin<br/>ticket");
  calcSupplyCosts();
}

function renderSupplyList() {
  const query = $("#s_search")?.value.trim().toLowerCase() || "";
  const list = $("#s_list");
  const items = state.supplies.filter((s) => !query || s.name.toLowerCase().includes(query));
  $("#s_count").textContent = String(state.supplies.length);
  list.innerHTML = items.length ? items.map((s) => `
    <article class="item">
      <h3>${s.name}</h3>
      <div class="meta">${s.mode === "NON_DISPOSABLE" ? "No desechable" : "Desechable"} · ${s.acquired || "sin fecha"}</div>
      <div class="kv">
        <div class="line"><b>Costo:</b> <span>${s.mode === "NON_DISPOSABLE" ? money(s.costAcq) : money(s.price)}</span></div>
        <div class="line"><b>Cobro base:</b> <span>${s.mode === "NON_DISPOSABLE" ? (s.costUse ? money(s.costUse) : "Calcula usos") : (s.unitCost ? money(s.unitCost) : "—")}</span></div>
      </div>
      <div class="actions">
        <button class="btn small" data-edit="${s.id}">✏️ Editar</button>
        <button class="btn small bad" data-delete="${s.id}">🗑️ Borrar</button>
      </div>
    </article>`).join("") : '<div class="empty-state">No hay insumos guardados.</div>';
  list.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => {
    const s = state.supplies.find((item) => item.id === btn.dataset.edit);
    if (!s) return;
    state.editing.supplyId = s.id;
    state.ui.supplyMode = s.mode;
    renderSupplyMode();
    Object.entries({ s_name: s.name, s_acquired: s.acquired, s_presentation: s.presentation, s_qty: s.qty, s_price: s.price, s_unitCost: s.unitCost, s_costAcq: s.costAcq, s_lifeMonths: s.lifeMonths, s_estimatedUses: s.estimatedUses, s_costMonth: s.costMonth, s_costUse: s.costUse, s_notes: s.notes }).forEach(([id, value]) => { const el = $("#" + id); if (el) el.value = value || ""; });
    document.querySelectorAll('input[name="s_donated"]').forEach((radio) => radio.checked = radio.value === (s.donated || "NO"));
    state.media.supplyTicketPhoto = s.ticketPhoto || null;
    setThumb("s_tk_preview", s.ticketPhoto, "Sin<br/>ticket");
    calcSupplyCosts();
    activateTab("supplies");
  }));
  list.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => {
    state.supplies = state.supplies.filter((item) => item.id !== btn.dataset.delete);
    saveState();
    renderSupplyList();
  }));
}

function saveSupply(event) {
  event.preventDefault();
  const supply = supplyFromForm();
  if (!supply.name || !supply.acquired) {
    showMessage("#s_ok", "#s_err", "", "Nombre y fecha de adquisición son obligatorios.");
    return;
  }
  if (supply.mode === "NON_DISPOSABLE" && (!supply.costAcq || !supply.lifeMonths)) {
    showMessage("#s_ok", "#s_err", "", "Para no desechables captura costo de adquisición y vida útil.");
    return;
  }
  const idx = state.supplies.findIndex((item) => item.id === supply.id);
  if (idx >= 0) state.supplies[idx] = supply; else state.supplies.unshift(supply);
  saveState();
  renderSupplyList();
  resetSupplyForm();
  showMessage("#s_ok", "#s_err", "Insumo guardado correctamente.");
}

function bindSupplySection() {
  $("#s_modeDisposable")?.addEventListener("click", () => { state.ui.supplyMode = "DISPOSABLE"; renderSupplyMode(); saveState(); });
  $("#s_modeNonDisposable")?.addEventListener("click", () => { state.ui.supplyMode = "NON_DISPOSABLE"; renderSupplyMode(); saveState(); calcSupplyCosts(); });
  ["#s_qty", "#s_price", "#s_costAcq", "#s_lifeMonths", "#s_estimatedUses"].forEach((id) => $(id)?.addEventListener("input", calcSupplyCosts));
  $("#s_btnTkTake")?.addEventListener("click", () => $("#s_tk_take")?.click());
  $("#s_btnTkPick")?.addEventListener("click", () => $("#s_tk_pick")?.click());
  ["#s_tk_take", "#s_tk_pick"].forEach((id) => $(id)?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.media.supplyTicketPhoto = await readFileAsBase64(file);
    setThumb("s_tk_preview", state.media.supplyTicketPhoto, "Sin<br/>ticket");
    e.target.value = "";
  }));
  $("#s_btnTkRemove")?.addEventListener("click", () => { state.media.supplyTicketPhoto = null; setThumb("s_tk_preview", null, "Sin<br/>ticket"); });
  $("#supplyForm")?.addEventListener("submit", saveSupply);
  $("#s_btnClear")?.addEventListener("click", resetSupplyForm);
  $("#s_search")?.addEventListener("input", renderSupplyList);
  renderSupplyMode();
  calcSupplyCosts();
}

function init() {
  loadState();
  bindTabs();
  bindProducerSection();
  bindMedSection();
  bindSupplySection();
  renderProducerList();
  renderMedList();
  renderSupplyList();
  updateProducerConditionalFields();
  setProducerClassification(state.ui.producerClassification || "TRABAJAR");
}

document.addEventListener("DOMContentLoaded", init);
