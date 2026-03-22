:root{
  --bg:#0f172a;
  --panel:#111827;
  --panel-2:#1f2937;
  --muted:#94a3b8;
  --text:#e5e7eb;
  --line:#334155;
  --primary:#22c55e;
  --primary-2:#16a34a;
  --danger:#ef4444;
  --warn:#f59e0b;
  --info:#38bdf8;
  --chip:#0b1220;
  --shadow:0 10px 30px rgba(0,0,0,.25);
  --radius:18px;
  --radius-sm:12px;
}

*{
  box-sizing:border-box;
}

html,body{
  margin:0;
  padding:0;
  background:linear-gradient(180deg,#0b1020 0%, #0f172a 100%);
  color:var(--text);
  font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
}

body{
  min-height:100vh;
}

header{
  max-width:1400px;
  margin:0 auto;
  padding:22px 18px 10px;
}

header h1{
  margin:0 0 6px;
  font-size:clamp(1.2rem, 2vw, 2rem);
  line-height:1.2;
}

header p{
  margin:0;
  color:var(--muted);
  font-size:.95rem;
}

.tabs{
  max-width:1400px;
  margin:8px auto 0;
  padding:0 18px 10px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.tab{
  appearance:none;
  border:1px solid var(--line);
  background:rgba(255,255,255,.03);
  color:var(--text);
  padding:12px 16px;
  border-radius:999px;
  cursor:pointer;
  transition:.2s ease;
  font-weight:600;
}

.tab:hover{
  transform:translateY(-1px);
  border-color:#475569;
}

.tab.active{
  background:rgba(34,197,94,.18);
  border-color:rgba(34,197,94,.55);
  color:#dcfce7;
}

.pages{
  max-width:1400px;
  margin:0 auto;
  padding:0 18px 24px;
}

.page{
  display:none;
}

.page.active{
  display:block;
}

main{
  display:grid;
  grid-template-columns:1.15fr .85fr;
  gap:18px;
}

.card{
  background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02));
  border:1px solid rgba(148,163,184,.18);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  overflow:hidden;
}

.card h2{
  margin:0;
  padding:18px 18px 0;
  font-size:1.05rem;
}

.content{
  padding:18px;
}

.sep{
  height:1px;
  background:linear-gradient(90deg, transparent, rgba(148,163,184,.25), transparent);
  margin:16px 0;
}

.grid{
  display:grid;
  gap:14px;
}

.grid.cols-2{
  grid-template-columns:repeat(2,minmax(0,1fr));
}

.grid.cols-3{
  grid-template-columns:repeat(3,minmax(0,1fr));
}

.grid.cols-4{
  grid-template-columns:repeat(4,minmax(0,1fr));
}

.grid.cols-5{
  grid-template-columns:repeat(5,minmax(0,1fr));
}

.row{
  display:flex;
  gap:10px;
  align-items:center;
  flex-wrap:wrap;
}

label{
  display:block;
  margin:0 0 6px;
  font-size:.92rem;
  color:#f3f4f6;
  font-weight:600;
}

input,
select,
textarea,
button{
  font:inherit;
}

input,
select,
textarea{
  width:100%;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid rgba(148,163,184,.22);
  background:rgba(15,23,42,.72);
  color:var(--text);
  outline:none;
  transition:border-color .2s ease, box-shadow .2s ease, transform .06s ease;
}

input::placeholder,
textarea::placeholder{
  color:#7c8aa0;
}

input:focus,
select:focus,
textarea:focus{
  border-color:rgba(56,189,248,.55);
  box-shadow:0 0 0 3px rgba(56,189,248,.15);
}

textarea{
  min-height:96px;
  resize:vertical;
}

select[multiple]{
  min-height:120px;
}

button{
  border:none;
  border-radius:14px;
  padding:12px 16px;
  cursor:pointer;
  transition:transform .08s ease, opacity .2s ease, background .2s ease, border-color .2s ease;
}

button:active{
  transform:translateY(1px);
}

.btn{
  background:#334155;
  color:#fff;
  border:1px solid transparent;
}

.btn:hover{
  opacity:.96;
}

.btn.primary{
  background:linear-gradient(180deg,var(--primary),var(--primary-2));
  color:#08130c;
  font-weight:800;
}

.btn.bad{
  background:linear-gradient(180deg,#ef4444,#dc2626);
  color:#fff;
}

.btn.ghost{
  background:transparent;
  color:#dbeafe;
  border:1px solid rgba(148,163,184,.28);
}

.btn.small{
  padding:9px 12px;
  border-radius:12px;
  font-size:.92rem;
}

.help{
  color:var(--muted);
  font-size:.9rem;
  line-height:1.4;
}

.error,
.success{
  margin-top:8px;
  padding:10px 12px;
  border-radius:12px;
  font-size:.92rem;
}

.error{
  background:rgba(239,68,68,.12);
  color:#fecaca;
  border:1px solid rgba(239,68,68,.28);
}

.success{
  background:rgba(34,197,94,.12);
  color:#dcfce7;
  border:1px solid rgba(34,197,94,.28);
}

details{
  border:1px solid rgba(148,163,184,.16);
  border-radius:16px;
  overflow:hidden;
  background:rgba(255,255,255,.02);
}

details summary{
  list-style:none;
  cursor:pointer;
  padding:14px 16px;
  font-weight:800;
  background:rgba(255,255,255,.03);
  border-bottom:1px solid rgba(148,163,184,.12);
}

details summary::-webkit-details-marker{
  display:none;
}

details .inner{
  padding:14px;
}

.list{
  display:grid;
  gap:12px;
}

.item{
  border:1px solid rgba(148,163,184,.18);
  background:rgba(255,255,255,.025);
  border-radius:16px;
  padding:14px;
}

.item h3{
  margin:0 0 8px;
  font-size:1rem;
}

.item .meta{
  color:var(--muted);
  font-size:.9rem;
  margin-bottom:10px;
}

.item .actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.family-table{
  width:100%;
  border-collapse:separate;
  border-spacing:0;
  min-width:720px;
}

.family-table th,
.family-table td{
  padding:10px;
  text-align:left;
  border-bottom:1px solid rgba(148,163,184,.14);
}

.family-table th{
  color:#cbd5e1;
  font-size:.9rem;
  background:rgba(255,255,255,.03);
  position:sticky;
  top:0;
}

table{
  width:100%;
  border-collapse:separate;
  border-spacing:0;
  min-width:720px;
}

th,
td{
  padding:10px;
  text-align:left;
  border-bottom:1px solid rgba(148,163,184,.14);
  vertical-align:top;
}

th{
  color:#cbd5e1;
  font-size:.9rem;
  background:rgba(255,255,255,.03);
}

.thumb{
  width:120px;
  height:120px;
  border-radius:18px;
  border:1px dashed rgba(148,163,184,.35);
  background:rgba(255,255,255,.02);
  overflow:hidden;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  color:var(--muted);
  font-size:.88rem;
  flex:0 0 auto;
}

.thumb img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.preview-mini{
  width:88px;
  height:88px;
  border-radius:14px;
  overflow:hidden;
  border:1px solid rgba(148,163,184,.18);
  background:rgba(255,255,255,.03);
  position:relative;
  flex:0 0 auto;
}

.preview-mini img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

.preview-mini .mini-remove{
  position:absolute;
  right:6px;
  top:6px;
  width:24px;
  height:24px;
  border-radius:999px;
  padding:0;
  background:rgba(15,23,42,.85);
  color:#fff;
  border:1px solid rgba(255,255,255,.15);
  font-size:.8rem;
}

.chips{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}

.chip{
  padding:10px 14px;
  border-radius:999px;
  background:var(--chip);
  border:1px solid rgba(148,163,184,.2);
  cursor:pointer;
  user-select:none;
  transition:.2s ease;
  font-weight:700;
}

.chip:hover{
  transform:translateY(-1px);
}

.chip[data-active="true"]{
  outline:2px solid rgba(255,255,255,.08);
}

.chip.good[data-active="true"]{
  background:rgba(34,197,94,.14);
  border-color:rgba(34,197,94,.4);
  color:#dcfce7;
}

.chip.warn[data-active="true"]{
  background:rgba(245,158,11,.14);
  border-color:rgba(245,158,11,.42);
  color:#fef3c7;
}

.chip.bad[data-active="true"]{
  background:rgba(239,68,68,.14);
  border-color:rgba(239,68,68,.42);
  color:#fee2e2;
}

.radio{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(148,163,184,.2);
  background:rgba(255,255,255,.025);
  cursor:pointer;
}

.radio input{
  width:auto;
  margin:0;
}

.kv{
  display:grid;
  gap:8px;
}

.kv .line{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  color:#cbd5e1;
  font-size:.94rem;
}

.kv .line b{
  color:#fff;
}

.mono{
  font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
}

.badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:6px 10px;
  border-radius:999px;
  font-size:.82rem;
  border:1px solid rgba(148,163,184,.18);
  background:rgba(255,255,255,.04);
  color:#e2e8f0;
}

.badge.ok{
  background:rgba(34,197,94,.12);
  border-color:rgba(34,197,94,.3);
  color:#dcfce7;
}

.badge.warn{
  background:rgba(245,158,11,.12);
  border-color:rgba(245,158,11,.3);
  color:#fef3c7;
}

.badge.bad{
  background:rgba(239,68,68,.12);
  border-color:rgba(239,68,68,.3);
  color:#fee2e2;
}

input[disabled],
textarea[disabled]{
  opacity:.78;
  cursor:not-allowed;
}

.hidden{
  display:none !important;
}

.empty-state{
  color:var(--muted);
  font-size:.95rem;
  padding:10px 4px;
}

#pageProcedures textarea{
  min-height:110px;
}

#pageProcedures .thumb{
  width:130px;
  height:130px;
}

#pageProcedures .list .item{
  border-left:4px solid rgba(56,189,248,.35);
}

@media (max-width: 1180px){
  main{
    grid-template-columns:1fr;
  }
}

@media (max-width: 980px){
  .grid.cols-5{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
}

@media (max-width: 900px){
  .grid.cols-4{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }
}

@media (max-width: 700px){
  .grid.cols-2,
  .grid.cols-3,
  .grid.cols-4,
  .grid.cols-5{
    grid-template-columns:1fr;
  }

  .tabs{
    gap:8px;
  }

  .tab{
    width:100%;
    text-align:center;
  }

  .content{
    padding:14px;
  }

  header{
    padding:18px 14px 8px;
  }

  .pages{
    padding:0 14px 20px;
  }

  .thumb{
    width:100px;
    height:100px;
  }

  #pageProcedures .thumb{
    width:100px;
    height:100px;
  }
}
/* =========================================================
   APP RURAL FUSIONADA · SCRIPT COMPLETO
========================================================= */

const STORAGE_KEY = "app_rural_fusion_full_v4";

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
  $("#btnGeo")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showMessage("err", "Tu navegador no soporta geolocalización.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        $("#lat").value = pos.coords.latitude.toFixed(7);
        $("#lng").value = pos.coords.longitude.toFixed(7);
        showMessage("ok", "Ubicación cargada.", "success");
      },
      () => showMessage("err", "No se pudo obtener la ubicación.", "error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  $("#btnGenMaps")?.addEventListener("click", () => {
    const lat = $("#lat").value.trim();
    const lng = $("#lng").value.trim();
    if (!lat || !lng) {
      showMessage("err", "Primero captura latitud y longitud.", "error");
      return;
    }
    $("#mapsUrl").value = `https://maps.google.com/?q=${lat},${lng}`;
    showMessage("ok", "Link de Maps generado.", "success");
  });

  $("#btnOpenMaps")?.addEventListener("click", () => {
    const url = $("#mapsUrl").value.trim();
    if (!url) {
      showMessage("err", "No hay link de Maps.", "error");
      return;
    }
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
      schedule: $("#horario")?.value.trim() || "",
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
  if ($("#horario")) $("#horario").value = prod.basic?.schedule || "";
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
    part: $("#a_tradParte").value.trim(),
    animals: $("#a_tradAnimales")?.value.trim() || ""
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
  if ($("#a_tradAnimales")) $("#a_tradAnimales").value = "";
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
        <div class="line"><b>Animales:</b> ${escapeHtml(item.animals || "")}</div>
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
      if ($("#a_tradAnimales")) $("#a_tradAnimales").value = item.animals || "";
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
  q.attendedVetCare = $("#a_atencionVeterinaria")?.value || "";
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
  q.localKnowledgeWhat = $("#a_saberesCual")?.value.trim() || "";
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
  if ($("#a_atencionVeterinaria")) $("#a_atencionVeterinaria").value = q.attendedVetCare || "";
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
  if ($("#a_saberesCual")) $("#a_saberesCual").value = q.localKnowledgeWhat || "";
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
  const total = parseFloat($("#m_totalQty").value || "0");
  const cost = parseFloat($("#m_cost").value || "0");
  $("#m_unitCost").value = total > 0 && cost > 0 ? (cost / total).toFixed(2) : "";
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
    const f = e.target.files?.[0];
    if (!f) return;
    state.media.medRxPhoto = await fileToBase64(f);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_rx_pick")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    state.media.medRxPhoto = await fileToBase64(f);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_tk_take")?.addEventListener("change", async (e) => {
    const f = e.target.files
    /* =========================================================
   APP RURAL FUSIONADA · SCRIPT COMPLETO
========================================================= */

const STORAGE_KEY = "app_rural_fusion_full_v4";

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
  $("#btnGeo")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showMessage("err", "Tu navegador no soporta geolocalización.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        $("#lat").value = pos.coords.latitude.toFixed(7);
        $("#lng").value = pos.coords.longitude.toFixed(7);
        showMessage("ok", "Ubicación cargada.", "success");
      },
      () => showMessage("err", "No se pudo obtener la ubicación.", "error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  $("#btnGenMaps")?.addEventListener("click", () => {
    const lat = $("#lat").value.trim();
    const lng = $("#lng").value.trim();
    if (!lat || !lng) {
      showMessage("err", "Primero captura latitud y longitud.", "error");
      return;
    }
    $("#mapsUrl").value = `https://maps.google.com/?q=${lat},${lng}`;
    showMessage("ok", "Link de Maps generado.", "success");
  });

  $("#btnOpenMaps")?.addEventListener("click", () => {
    const url = $("#mapsUrl").value.trim();
    if (!url) {
      showMessage("err", "No hay link de Maps.", "error");
      return;
    }
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
      schedule: $("#horario")?.value.trim() || "",
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
  if ($("#horario")) $("#horario").value = prod.basic?.schedule || "";
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
    part: $("#a_tradParte").value.trim(),
    animals: $("#a_tradAnimales")?.value.trim() || ""
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
  if ($("#a_tradAnimales")) $("#a_tradAnimales").value = "";
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
        <div class="line"><b>Animales:</b> ${escapeHtml(item.animals || "")}</div>
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
      if ($("#a_tradAnimales")) $("#a_tradAnimales").value = item.animals || "";
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
  q.attendedVetCare = $("#a_atencionVeterinaria")?.value || "";
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
  q.localKnowledgeWhat = $("#a_saberesCual")?.value.trim() || "";
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
  if ($("#a_atencionVeterinaria")) $("#a_atencionVeterinaria").value = q.attendedVetCare || "";
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
  if ($("#a_saberesCual")) $("#a_saberesCual").value = q.localKnowledgeWhat || "";
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
  const total = parseFloat($("#m_totalQty").value || "0");
  const cost = parseFloat($("#m_cost").value || "0");
  $("#m_unitCost").value = total > 0 && cost > 0 ? (cost / total).toFixed(2) : "";
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
    const f = e.target.files?.[0];
    if (!f) return;
    state.media.medRxPhoto = await fileToBase64(f);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_rx_pick")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    state.media.medRxPhoto = await fileToBase64(f);
    renderMedPhotos();
    e.target.value = "";
  });
  $("#m_tk_take")?.addEventListener("change", async (e) => {
    const f = e.target.files