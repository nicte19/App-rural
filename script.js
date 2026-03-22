const STORAGE_KEY = 'app_rural_netlify_v1';

const state = {
  producers: [],
  meds: [],
  supplies: [],
  procedures: [],
  selectedProducerId: null,
  editing: { producerId: null, medId: null, supplyId: null, procedureId: null },
  media: {
    producerPhoto: null,
    animalInstallationPhoto: null,
    medRxPhoto: null,
    medTicketPhoto: null,
    supplyTicketPhoto: null,
    procedureCasePhotos: [],
    procedureNecropsyPhotos: [],
    procedureChargePhoto: null
  },
  animalsDraft: { diseases: [], vaccines: [], dewormings: [], traditional: [], genderAnimals: [], genderActivities: [] },
  procedureDraft: { meds: [], vaccines: [], supplies: [] }
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
const money = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v || 0));
const text = v => v == null ? '' : String(v);
const esc = s => text(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.assign(state, {
      producers: Array.isArray(raw.producers) ? raw.producers : [],
      meds: Array.isArray(raw.meds) ? raw.meds : [],
      supplies: Array.isArray(raw.supplies) ? raw.supplies : [],
      procedures: Array.isArray(raw.procedures) ? raw.procedures : [],
      selectedProducerId: raw.selectedProducerId || null
    });
  } catch (e) {
    console.error('No se pudo cargar estado', e);
  }
}
function showMessage(id, msg, cls='help') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || '';
  el.className = cls;
  el.style.display = msg ? 'block' : 'none';
}
function setChipGroup(container, value) {
  $$(container + ' .chip').forEach(ch => ch.dataset.active = ch.dataset.value === value ? 'true' : 'false');
}
function activeChipValue(container) {
  return document.querySelector(`${container} .chip[data-active="true"]`)?.dataset.value || '';
}
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function setThumb(id, dataUrl, fallback='Sin<br/>foto') {
  const el = $("#" + id);
  if (!el) return;
  el.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="preview" />` : `<span>${fallback}</span>`;
}
function renderPhotoStrip(containerId, photos = []) {
  const el = $("#" + containerId);
  if (!el) return;
  el.innerHTML = photos.map(src => `<div class="thumb small-thumb"><img src="${src}" alt="foto" /></div>`).join('') || '<div class="help">Sin fotos todavía.</div>';
}
function serializeFields(root) {
  const data = {};
  if (!root) return data;
  root.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    if (el.type === 'file') return;
    if (el.type === 'radio') {
      if (!data[el.name]) data[el.name] = root.querySelector(`input[name="${el.name}"]:checked`)?.value || '';
      return;
    }
    if (el.tagName === 'SELECT' && el.multiple) {
      data[el.id] = Array.from(el.selectedOptions).map(o => o.value);
      return;
    }
    data[el.id] = el.value;
  });
  return data;
}
function fillFields(values) {
  Object.entries(values || {}).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'radio') return;
    if (el.tagName === 'SELECT' && el.multiple && Array.isArray(value)) {
      Array.from(el.options).forEach(opt => opt.selected = value.includes(opt.value));
      return;
    }
    el.value = value ?? '';
  });
}
function getProducerById(id) { return state.producers.find(x => x.id === id); }
function getProcedureById(id) { return state.procedures.find(x => x.id === id); }
function producerName(id) { return getProducerById(id)?.basic?.nombre || 'Sin productor'; }
function animalLabel(a) { return [a.a_especie, a.a_raza].filter(Boolean).join(' · ') + (a.a_cantidad ? ` (${a.a_cantidad})` : ''); }

function activateTab(name) {
  const map = { producer:'Producer', animals:'Animals', meds:'Meds', supplies:'Supplies', procedures:'Procedures' };
  Object.entries(map).forEach(([k, suf]) => {
    $("#tab" + suf)?.classList.toggle('active', k === name);
    $("#page" + suf)?.classList.toggle('active', k === name);
  });
}

function bindTabs() {
  $('#tabProducer')?.addEventListener('click', () => activateTab('producer'));
  $('#tabAnimals')?.addEventListener('click', () => activateTab('animals'));
  $('#tabMeds')?.addEventListener('click', () => activateTab('meds'));
  $('#tabSupplies')?.addEventListener('click', () => activateTab('supplies'));
  $('#tabProcedures')?.addEventListener('click', () => activateTab('procedures'));
  $('#btnGoProducerFromAnimals')?.addEventListener('click', () => activateTab('producer'));
}

function updateProducerConditionals() {
  const indig = $('#pertenenciaIndigena')?.value || '';
  $('#grupoIndigenaYoWrap').style.display = indig === 'YO' ? 'block' : 'none';
  $('#grupoIndigenaFamiliarWrap').style.display = indig === 'FAMILIAR' ? 'grid' : 'none';
  const lang = $('#lenguaIndigenaTipo')?.value || '';
  $('#lenguaYoWrap').style.display = lang === 'YO' ? 'block' : 'none';
  $('#lenguaFamiliarWrap').style.display = lang === 'FAMILIAR' ? 'grid' : 'none';
  $('#alertaWrap').style.display = activeChipValue('#chipsClasificacion') === 'NO_TRABAJAR' ? 'block' : 'none';
}
function addFamilyRow(item = {}) {
  $('#familyTbody').insertAdjacentHTML('beforeend', `
    <tr>
      <td><input type="text" class="fam-name" value="${esc(item.name)}" /></td>
      <td><input type="text" class="fam-relation" value="${esc(item.relation)}" /></td>
      <td><input type="text" class="fam-occupation" value="${esc(item.occupation)}" /></td>
      <td><input type="number" class="fam-age" value="${esc(item.age)}" min="0" /></td>
      <td><button class="btn small bad fam-remove" type="button">✖</button></td>
    </tr>`);
  $('#familyTbody tr:last-child .fam-remove')?.addEventListener('click', e => e.target.closest('tr').remove());
}
function collectFamily() {
  return Array.from($('#familyTbody').querySelectorAll('tr')).map(row => ({
    name: row.querySelector('.fam-name')?.value.trim() || '',
    relation: row.querySelector('.fam-relation')?.value.trim() || '',
    occupation: row.querySelector('.fam-occupation')?.value.trim() || '',
    age: row.querySelector('.fam-age')?.value || ''
  })).filter(x => Object.values(x).some(Boolean));
}
function resetProducerForm() {
  $('#producerForm').reset();
  state.editing.producerId = null;
  state.media.producerPhoto = null;
  setThumb('photoPreview', null);
  setChipGroup('#chipsClasificacion', 'TRABAJAR');
  $('#familyTbody').innerHTML = '';
  addFamilyRow();
  $('#formTitle').textContent = 'Nuevo productor(a)';
  $('#btnCancelEdit').style.display = 'none';
  updateProducerConditionals();
}
function saveProducer(evt) {
  evt.preventDefault();
  const values = serializeFields($('#producerForm'));
  if (!values.nombre?.trim()) return showMessage('err', 'El nombre del productor(a) es obligatorio.', 'error');
  const item = {
    id: state.editing.producerId || uid(),
    createdAt: getProducerById(state.editing.producerId)?.createdAt || now(),
    updatedAt: now(),
    basic: values,
    classification: activeChipValue('#chipsClasificacion') || 'TRABAJAR',
    family: collectFamily(),
    photo: state.media.producerPhoto,
    animals: getProducerById(state.editing.producerId)?.animals || [],
    animalQuestionnaire: getProducerById(state.editing.producerId)?.animalQuestionnaire || {}
  };
  state.producers = state.producers.filter(x => x.id !== item.id);
  state.producers.unshift(item);
  state.selectedProducerId ||= item.id;
  saveState();
  renderAll();
  showMessage('ok', 'Productor(a) guardado.', 'success');
  resetProducerForm();
}
function editProducer(id) {
  const item = getProducerById(id);
  if (!item) return;
  state.editing.producerId = id;
  fillFields(item.basic);
  setChipGroup('#chipsClasificacion', item.classification || 'TRABAJAR');
  $('#familyTbody').innerHTML = '';
  (item.family?.length ? item.family : [{}]).forEach(addFamilyRow);
  state.media.producerPhoto = item.photo || null;
  setThumb('photoPreview', state.media.producerPhoto);
  $('#formTitle').textContent = 'Editar productor(a)';
  $('#btnCancelEdit').style.display = 'inline-flex';
  updateProducerConditionals();
  activateTab('producer');
}
function deleteProducer(id) {
  if (!confirm('¿Eliminar productor(a) y toda su información asociada?')) return;
  state.producers = state.producers.filter(x => x.id !== id);
  state.procedures = state.procedures.filter(x => x.p_producer !== id);
  if (state.selectedProducerId === id) state.selectedProducerId = state.producers[0]?.id || null;
  saveState();
  renderAll();
}
function exportJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function bindProducer() {
  $$('#chipsClasificacion .chip').forEach(ch => ch.addEventListener('click', () => { setChipGroup('#chipsClasificacion', ch.dataset.value); updateProducerConditionals(); }));
  ['pertenenciaIndigena', 'lenguaIndigenaTipo'].forEach(id => $('#'+id)?.addEventListener('change', updateProducerConditionals));
  $('#btnAddFamily')?.addEventListener('click', () => addFamilyRow());
  $('#producerForm')?.addEventListener('submit', saveProducer);
  $('#btnReset')?.addEventListener('click', resetProducerForm);
  $('#btnCancelEdit')?.addEventListener('click', resetProducerForm);
  $('#btnExport')?.addEventListener('click', () => exportJson('productores.json', state.producers));
  $('#btnImport')?.addEventListener('click', () => $('#importFile').click());
  $('#importFile')?.addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    state.producers = JSON.parse(await file.text()); saveState(); renderAll(); e.target.value='';
  });
  $('#btnWipe')?.addEventListener('click', () => { if (confirm('¿Borrar toda la base local?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); } });
  $('#btnExportWordProducer')?.addEventListener('click', () => exportJson('productor-expediente.json', state.producers));
  $('#btnGeo')?.addEventListener('click', () => navigator.geolocation?.getCurrentPosition(pos => {
    $('#lat').value = pos.coords.latitude.toFixed(7); $('#lng').value = pos.coords.longitude.toFixed(7);
  }));
  $('#btnGenMaps')?.addEventListener('click', () => { if ($('#lat').value && $('#lng').value) $('#mapsUrl').value = `https://maps.google.com/?q=${$('#lat').value},${$('#lng').value}`; });
  $('#btnOpenMaps')?.addEventListener('click', () => { if ($('#mapsUrl').value) window.open($('#mapsUrl').value, '_blank','noopener'); });
  $('#btnClearLocation')?.addEventListener('click', () => ['lat','lng','mapsUrl'].forEach(id => $('#'+id).value=''));
  bindSinglePhoto('fotoTomar','btnTakePhoto', 'producerPhoto', 'photoPreview', 'Sin<br/>foto');
  bindSinglePhoto('fotoElegir','btnPickPhoto', 'producerPhoto', 'photoPreview', 'Sin<br/>foto');
  $('#btnRemovePhoto')?.addEventListener('click', () => { state.media.producerPhoto = null; setThumb('photoPreview', null); });
}
function renderProducerList() {
  $('#count').textContent = String(state.producers.length);
  const list = $('#producerList');
  if (!state.producers.length) return list.innerHTML = '<div class="empty-state">No hay productores registrados.</div>';
  list.innerHTML = state.producers.map(p => `
    <article class="item-card">
      <div>
        <strong>${esc(p.basic.nombre)}</strong>
        <div class="help">${esc(p.basic.localidad)} · ${esc(p.basic.municipio)} · ${esc(p.basic.tenenciaComunal || '')}</div>
        <div class="help">Clasificación: ${esc(p.classification)} · Animales: ${(p.animals || []).length}</div>
      </div>
      <div class="row">
        <button class="btn small producer-select" data-id="${p.id}" type="button">Trabajar</button>
        <button class="btn small ghost producer-edit" data-id="${p.id}" type="button">Editar</button>
        <button class="btn small bad producer-del" data-id="${p.id}" type="button">Eliminar</button>
      </div>
    </article>`).join('');
  $$('.producer-select').forEach(b => b.addEventListener('click', () => { state.selectedProducerId = b.dataset.id; saveState(); renderAll(); activateTab('animals'); }));
  $$('.producer-edit').forEach(b => b.addEventListener('click', () => editProducer(b.dataset.id)));
  $$('.producer-del').forEach(b => b.addEventListener('click', () => deleteProducer(b.dataset.id)));
}

function getSelectedProducer() { return getProducerById(state.selectedProducerId); }
function renderProducerOptions() {
  const options = ['<option value="">— Selecciona productor/a —</option>'].concat(state.producers.map(p => `<option value="${p.id}">${esc(p.basic.nombre)}</option>`)).join('');
  ['animalsProducerSelect','p_producer'].forEach(id => {
    const sel = $('#'+id); if (!sel) return; sel.innerHTML = options; sel.value = state.selectedProducerId || '';
  });
  $('#animalsProducerHint').textContent = getSelectedProducer() ? `Trabajando con: ${getSelectedProducer().basic.nombre}` : 'Primero selecciona un productor/a';
}
function renderAnimalList() {
  const prod = getSelectedProducer();
  const list = $('#a_list');
  if (!prod) return list.innerHTML = '<div class="empty-state">Selecciona un productor/a.</div>';
  list.innerHTML = (prod.animals || []).map(a => `
    <article class="item-card">
      <div><strong>${esc(animalLabel(a))}</strong><div class="help">Dueño: ${esc(a.a_dueno)} · Vive en: ${esc(a.a_viven)}</div></div>
      <button class="btn small bad animal-del" data-id="${a.id}" type="button">Eliminar</button>
    </article>`).join('') || '<div class="empty-state">No hay animales registrados.</div>';
  $$('.animal-del').forEach(b => b.addEventListener('click', () => {
    prod.animals = prod.animals.filter(x => x.id !== b.dataset.id); saveState(); renderAll();
  }));
}
function renderAnimalDerivedLists() {
  const prod = getSelectedProducer();
  const options = ['<option value="">— Selecciona —</option>'].concat((prod?.animals || []).map(a => `<option value="${a.id}">${esc(animalLabel(a))}</option>`)).join('');
  $('#p_animalGroup').innerHTML = options;
}
function addDraftItem(kind, item) {
  state.animalsDraft[kind].push(item);
  renderAnimalsDrafts();
}
function renderSimpleDraft(containerId, arr, formatter) {
  const el = $('#'+containerId);
  el.innerHTML = arr.map((x, i) => `<article class="pill-row"><span>${formatter(x)}</span><button class="btn small bad" data-index="${i}" data-container="${containerId}" type="button">Quitar</button></article>`).join('') || '<div class="help">Sin registros todavía.</div>';
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const key = { a_diseaseList:'diseases', a_vaxList:'vaccines', a_dewormList:'dewormings', a_tradList:'traditional', a_genderAnimalList:'genderAnimals', a_generoActividadList:'genderActivities' }[containerId];
    state.animalsDraft[key].splice(Number(b.dataset.index),1); renderAnimalsDrafts();
  }));
}
function renderAnimalsDrafts() {
  renderSimpleDraft('a_diseaseList', state.animalsDraft.diseases, x => `${x.a_enfAnimal || 'Animal'}: ${x.a_commonDis || x.a_signs || 'Sin detalle'}`);
  renderSimpleDraft('a_vaxList', state.animalsDraft.vaccines, x => `${x.a_vaxAnimal}: ${x.a_vaxName} (${x.a_vaxDate || 'sin fecha'})`);
  renderSimpleDraft('a_dewormList', state.animalsDraft.dewormings, x => `${x.a_dewormAnimal}: ${x.a_dewormProd} (${x.a_dewormDate || 'sin fecha'})`);
  renderSimpleDraft('a_tradList', state.animalsDraft.traditional, x => `${x.a_tradNombre} · ${x.a_tradTipo}`);
  renderSimpleDraft('a_genderAnimalList', state.animalsDraft.genderAnimals, x => `${x.a_genderAnimal}: ${x.a_genderAnimalWho}`);
  renderSimpleDraft('a_generoActividadList', state.animalsDraft.genderActivities, x => `${x.a_actividadGenero}: ${x.a_actividadGeneroSexo}`);
}
function resetAnimalForm() {
  $('#animalForm').reset();
  state.media.animalInstallationPhoto = null;
  setThumb('a_instPreview', null, 'Sin<br/>foto');
}
function saveAnimalGroup() {
  const prod = getSelectedProducer();
  if (!prod) return showMessage('a_msg', 'Primero selecciona un productor(a).', 'error');
  const values = serializeFields($('#animalForm'));
  values.id = uid();
  values.installationPhoto = state.media.animalInstallationPhoto;
  prod.animals ||= [];
  prod.animals.unshift(values);
  saveState();
  resetAnimalForm();
  renderAll();
  showMessage('a_msg', 'Grupo animal guardado.', 'success');
}
function saveAnimalQuestionnaireFull() {
  const prod = getSelectedProducer();
  if (!prod) return showMessage('a_msg', 'Primero selecciona un productor(a).', 'error');
  prod.animalQuestionnaire = {
    ...serializeFields($('#pageAnimals')),
    diseases: [...state.animalsDraft.diseases],
    vaccines: [...state.animalsDraft.vaccines],
    dewormings: [...state.animalsDraft.dewormings],
    traditional: [...state.animalsDraft.traditional],
    genderAnimals: [...state.animalsDraft.genderAnimals],
    genderActivities: [...state.animalsDraft.genderActivities]
  };
  saveState(); showMessage('a_msg', 'Cuestionario animal guardado.', 'success'); renderAll();
}
function loadAnimalQuestionnaire() {
  const q = getSelectedProducer()?.animalQuestionnaire || {};
  fillFields(q);
  state.animalsDraft.diseases = q.diseases || [];
  state.animalsDraft.vaccines = q.vaccines || [];
  state.animalsDraft.dewormings = q.dewormings || [];
  state.animalsDraft.traditional = q.traditional || [];
  state.animalsDraft.genderAnimals = q.genderAnimals || [];
  state.animalsDraft.genderActivities = q.genderActivities || [];
  renderAnimalsDrafts();
}
function bindAnimals() {
  $('#animalsProducerSelect')?.addEventListener('change', e => { state.selectedProducerId = e.target.value || null; saveState(); renderAll(); });
  bindSinglePhoto('a_instTake','a_btnInstTake','animalInstallationPhoto','a_instPreview','Sin<br/>foto');
  bindSinglePhoto('a_instPick','a_btnInstPick','animalInstallationPhoto','a_instPreview','Sin<br/>foto');
  $('#a_btnInstClear')?.addEventListener('click', () => { state.media.animalInstallationPhoto = null; setThumb('a_instPreview', null, 'Sin<br/>foto'); });
  $('#a_save')?.addEventListener('click', saveAnimalGroup);
  $('#a_clear')?.addEventListener('click', resetAnimalForm);
  $('#btnSaveAnimalsFull')?.addEventListener('click', saveAnimalQuestionnaireFull);
  $('#a_addDisease')?.addEventListener('click', () => addDraftItem('diseases', { a_enfAnimal: $('#a_enfAnimal').value, a_commonDis: $('#a_commonDis').value, a_signs: $('#a_signs').value, a_whenSickDo: $('#a_whenSickDo').value }));
  $('#a_addVax')?.addEventListener('click', () => addDraftItem('vaccines', { a_vaxAnimal: $('#a_vaxAnimal').value, a_vaxName: $('#a_vaxName').value, a_vaxDate: $('#a_vaxDate').value, a_vaxWho: $('#a_vaxWho').value }));
  $('#a_addDeworm')?.addEventListener('click', () => addDraftItem('dewormings', { a_dewormAnimal: $('#a_dewormAnimal').value, a_dewormProd: $('#a_dewormProd').value, a_dewormDate: $('#a_dewormDate').value, a_dewormWho: $('#a_dewormWho').value }));
  $('#a_addTrad')?.addEventListener('click', () => addDraftItem('traditional', { a_tradNombre: $('#a_tradNombre').value, a_tradTipo: $('#a_tradTipo').value, a_tradUso: $('#a_tradUso').value, a_tradParte: $('#a_tradParte').value }));
  $('#a_addGenderAnimal')?.addEventListener('click', () => addDraftItem('genderAnimals', { a_genderAnimal: $('#a_genderAnimal').value, a_genderAnimalWho: $('#a_genderAnimalWho').value, a_genderAnimalWhy: $('#a_genderAnimalWhy').value }));
  $('#a_addGeneroActividad')?.addEventListener('click', () => addDraftItem('genderActivities', { a_actividadGenero: $('#a_actividadGenero').value, a_actividadGeneroSexo: $('#a_actividadGeneroSexo').value, a_actividadGeneroRazon: $('#a_actividadGeneroRazon').value }));
}

function bindSinglePhoto(inputId, buttonId, mediaKey, previewId, fallback) {
  $('#'+buttonId)?.addEventListener('click', () => $('#'+inputId).click());
  $('#'+inputId)?.addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    state.media[mediaKey] = await readFileAsBase64(file);
    setThumb(previewId, state.media[mediaKey], fallback);
    e.target.value = '';
  });
}
function bindMultiPhoto(inputId, buttonId, mediaKey, hintId, previewId) {
  $('#'+buttonId)?.addEventListener('click', () => $('#'+inputId).click());
  $('#'+inputId)?.addEventListener('change', async e => {
    const files = Array.from(e.target.files || []);
    const added = await Promise.all(files.map(readFileAsBase64));
    state.media[mediaKey].push(...added);
    $('#'+hintId).textContent = `${state.media[mediaKey].length} foto(s) cargadas.`;
    renderPhotoStrip(previewId, state.media[mediaKey]);
    e.target.value = '';
  });
}

function calcMedUnitCost() { const q = Number($('#m_totalQty').value || 0), c = Number($('#m_cost').value || 0); $('#m_unitCost').value = q > 0 ? (c / q).toFixed(2) : ''; }
function saveMed(evt) {
  evt.preventDefault();
  const item = { id: state.editing.medId || uid(), ...serializeFields($('#medForm')), rxPhoto: state.media.medRxPhoto, ticketPhoto: state.media.medTicketPhoto, updatedAt: now() };
  state.meds = state.meds.filter(x => x.id !== item.id); state.meds.unshift(item); state.editing.medId = null;
  saveState(); renderAll(); $('#medForm').reset(); state.media.medRxPhoto = null; state.media.medTicketPhoto = null; setThumb('m_rx_preview', null, 'Sin<br/>receta'); setThumb('m_tk_preview', null, 'Sin<br/>ticket');
  showMessage('m_ok', 'Medicamento/vacuna guardado.', 'success');
}
function renderMeds() {
  $('#m_count').textContent = String(state.meds.length);
  $('#m_list').innerHTML = state.meds.map(m => `<article class="item-card"><div><strong>${esc(m.m_brand || m.m_vaxBrand || 'Sin nombre')}</strong><div class="help">Activo: ${esc(m.m_active)} · Stock: ${esc(m.m_totalQty)} ${esc(m.m_unit)}</div></div><button class="btn small bad med-del" data-id="${m.id}" type="button">Eliminar</button></article>`).join('') || '<div class="empty-state">No hay medicamentos.</div>';
  $$('.med-del').forEach(b => b.addEventListener('click', () => { state.meds = state.meds.filter(x => x.id !== b.dataset.id); saveState(); renderAll(); }));
  const medOptions = ['<option value="">— Selecciona —</option>'].concat(state.meds.map(m => `<option value="${m.id}">${esc(m.m_brand || m.m_vaxBrand || 'Medicamento')}</option>`)).join('');
  $('#p_medSelect').innerHTML = medOptions; $('#p_vaccineSelect').innerHTML = medOptions;
}
function bindMeds() {
  $('#medForm')?.addEventListener('submit', saveMed);
  $('#m_totalQty')?.addEventListener('input', calcMedUnitCost); $('#m_cost')?.addEventListener('input', calcMedUnitCost);
  bindSinglePhoto('m_rx_take','m_btnRxTake','medRxPhoto','m_rx_preview','Sin<br/>receta');
  bindSinglePhoto('m_rx_pick','m_btnRxPick','medRxPhoto','m_rx_preview','Sin<br/>receta');
  bindSinglePhoto('m_tk_take','m_btnTkTake','medTicketPhoto','m_tk_preview','Sin<br/>ticket');
  bindSinglePhoto('m_tk_pick','m_btnTkPick','medTicketPhoto','m_tk_preview','Sin<br/>ticket');
  $('#m_btnRxRemove')?.addEventListener('click', () => { state.media.medRxPhoto = null; setThumb('m_rx_preview', null, 'Sin<br/>receta'); });
  $('#m_btnTkRemove')?.addEventListener('click', () => { state.media.medTicketPhoto = null; setThumb('m_tk_preview', null, 'Sin<br/>ticket'); });
  $('#m_btnClear')?.addEventListener('click', () => $('#medForm').reset());
  $('#m_btnExport')?.addEventListener('click', () => exportJson('medicamentos.json', state.meds));
  $('#m_btnExportExcel')?.addEventListener('click', () => exportJson('medicamentos.xlsx.json', state.meds));
}

function calcSupplyCosts() {
  const qty = Number($('#s_qty').value || 0), price = Number($('#s_price').value || 0);
  $('#s_unitCost').value = qty > 0 ? (price / qty).toFixed(2) : '';
  const acq = Number($('#s_costAcq').value || 0), life = Number($('#s_lifeMonths').value || 0), uses = Number($('#s_estimatedUses').value || 0);
  $('#s_costMonth').value = life > 0 ? (acq / life).toFixed(2) : '';
  $('#s_costUse').value = uses > 0 ? (acq / uses).toFixed(2) : '';
}
function saveSupply(evt) {
  evt.preventDefault();
  const item = { id: state.editing.supplyId || uid(), ...serializeFields($('#supplyForm')), ticketPhoto: state.media.supplyTicketPhoto, updatedAt: now() };
  state.supplies = state.supplies.filter(x => x.id !== item.id); state.supplies.unshift(item); saveState(); renderAll(); $('#supplyForm').reset(); state.media.supplyTicketPhoto = null; setThumb('s_tk_preview', null, 'Sin<br/>ticket');
  showMessage('s_ok', 'Insumo guardado.', 'success');
}
function renderSupplies() {
  $('#s_count').textContent = String(state.supplies.length);
  $('#s_list').innerHTML = state.supplies.map(s => `<article class="item-card"><div><strong>${esc(s.s_name || 'Insumo')}</strong><div class="help">Presentación: ${esc(s.s_presentation)} · Cantidad: ${esc(s.s_qty)}</div></div><button class="btn small bad supply-del" data-id="${s.id}" type="button">Eliminar</button></article>`).join('') || '<div class="empty-state">No hay insumos.</div>';
  $$('.supply-del').forEach(b => b.addEventListener('click', () => { state.supplies = state.supplies.filter(x => x.id !== b.dataset.id); saveState(); renderAll(); }));
  const opts = ['<option value="">— Selecciona —</option>'].concat(state.supplies.map(s => `<option value="${s.id}">${esc(s.s_name || 'Insumo')}</option>`)).join('');
  $('#p_supplySelect').innerHTML = opts;
}
function bindSupplies() {
  $('#supplyForm')?.addEventListener('submit', saveSupply);
  ['s_qty','s_price','s_costAcq','s_lifeMonths','s_estimatedUses'].forEach(id => $('#'+id)?.addEventListener('input', calcSupplyCosts));
  bindSinglePhoto('s_tk_take','s_btnTkTake','supplyTicketPhoto','s_tk_preview','Sin<br/>ticket');
  bindSinglePhoto('s_tk_pick','s_btnTkPick','supplyTicketPhoto','s_tk_preview','Sin<br/>ticket');
  $('#s_btnTkRemove')?.addEventListener('click', () => { state.media.supplyTicketPhoto = null; setThumb('s_tk_preview', null, 'Sin<br/>ticket'); });
  $('#s_btnClear')?.addEventListener('click', () => $('#supplyForm').reset());
  $('#s_btnExport')?.addEventListener('click', () => exportJson('insumos.json', state.supplies));
  $('#s_btnExportExcel')?.addEventListener('click', () => exportJson('insumos.xlsx.json', state.supplies));
}

function pushProcedureUse(kind, item) {
  state.procedureDraft[kind].push(item);
  renderProcedureDrafts();
}
function renderProcedureDrafts() {
  const medMap = Object.fromEntries(state.meds.map(m => [m.id, m.m_brand || m.m_vaxBrand || 'Medicamento']));
  const supplyMap = Object.fromEntries(state.supplies.map(s => [s.id, s.s_name || 'Insumo']));
  const render = (id, arr, labeler, key) => {
    $('#'+id).innerHTML = arr.map((x,i)=>`<article class="pill-row"><span>${labeler(x)}</span><button class="btn small bad" data-kind="${key}" data-index="${i}" type="button">Quitar</button></article>`).join('') || '<div class="help">Sin elementos agregados.</div>';
    $('#'+id).querySelectorAll('button').forEach(b => b.addEventListener('click', ()=>{ state.procedureDraft[b.dataset.kind].splice(Number(b.dataset.index),1); renderProcedureDrafts(); }));
  };
  render('p_medUseList', state.procedureDraft.meds, x => `${medMap[x.id] || 'Medicamento'} · ${x.dose} ${x.unit}`, 'meds');
  render('p_vaccineUseList', state.procedureDraft.vaccines, x => `${medMap[x.id] || 'Vacuna'} · ${x.animals} animales`, 'vaccines');
  render('p_supplyUseList', state.procedureDraft.supplies, x => `${supplyMap[x.id] || 'Insumo'} · ${x.qty}`, 'supplies');
}
function updateProcedureConditionals() {
  const t = $('#p_type').value;
  const show = (id, on) => { const el = $('#'+id); if (el) el.style.display = on ? 'block' : 'none'; };
  show('p_preventiveSection', t === 'PREVENTIVA');
  show('p_labSection', ['CASO_CLINICO','NECROPSIA','PREVENTIVA'].includes(t));
  show('p_zootecSection', t === 'ZOOTECNIA');
  $('#p_cc_reason').closest('details').style.display = t === 'CASO_CLINICO' ? 'block' : 'none';
  $('#p_nec_idAnimal').closest('details').style.display = t === 'NECROPSIA' ? 'block' : 'none';
}
function resetProcedureForm() {
  $('#procedureForm').reset();
  state.editing.procedureId = null;
  state.procedureDraft = { meds: [], vaccines: [], supplies: [] };
  state.media.procedureCasePhotos = []; state.media.procedureNecropsyPhotos = []; state.media.procedureChargePhoto = null;
  renderProcedureDrafts(); renderPhotoStrip('p_cc_preview', []); renderPhotoStrip('p_nec_preview', []); setThumb('p_charge_preview', null, 'Sin<br/>foto');
  $('#p_cc_hint').textContent = 'Sin fotos todavía.'; $('#p_nec_hint').textContent = 'Sin fotos todavía.';
  updateProcedureConditionals();
}
function saveProcedure(evt) {
  evt.preventDefault();
  const values = serializeFields($('#procedureForm'));
  if (!values.p_type || !values.p_producer) return showMessage('p_err', 'Selecciona tipo de procedimiento y productor(a).', 'error');
  const item = {
    id: state.editing.procedureId || uid(),
    ...values,
    medUses: [...state.procedureDraft.meds],
    vaccineUses: [...state.procedureDraft.vaccines],
    supplyUses: [...state.procedureDraft.supplies],
    casePhotos: [...state.media.procedureCasePhotos],
    necropsyPhotos: [...state.media.procedureNecropsyPhotos],
    chargePhoto: state.media.procedureChargePhoto,
    createdAt: getProcedureById(state.editing.procedureId)?.createdAt || now(),
    updatedAt: now()
  };
  state.procedures = state.procedures.filter(x => x.id !== item.id); state.procedures.unshift(item);
  saveState(); renderAll(); resetProcedureForm(); showMessage('p_ok', 'Procedimiento guardado.', 'success');
}
function editProcedure(id) {
  const item = getProcedureById(id); if (!item) return;
  state.editing.procedureId = id; fillFields(item); state.procedureDraft = { meds: item.medUses || [], vaccines: item.vaccineUses || [], supplies: item.supplyUses || [] };
  state.media.procedureCasePhotos = item.casePhotos || []; state.media.procedureNecropsyPhotos = item.necropsyPhotos || []; state.media.procedureChargePhoto = item.chargePhoto || null;
  renderProcedureDrafts(); renderPhotoStrip('p_cc_preview', state.media.procedureCasePhotos); renderPhotoStrip('p_nec_preview', state.media.procedureNecropsyPhotos); setThumb('p_charge_preview', state.media.procedureChargePhoto, 'Sin<br/>foto');
  $('#p_cc_hint').textContent = `${state.media.procedureCasePhotos.length} foto(s) cargadas.`; $('#p_nec_hint').textContent = `${state.media.procedureNecropsyPhotos.length} foto(s) cargadas.`;
  updateProcedureConditionals(); activateTab('procedures');
}
function renderProcedures() {
  $('#p_count').textContent = String(state.procedures.length);
  const q = ($('#p_search').value || '').toLowerCase();
  const rows = state.procedures.filter(p => JSON.stringify(p).toLowerCase().includes(q));
  $('#p_list').innerHTML = rows.map(p => `
    <article class="item-card">
      <div>
        <strong>${esc(p.p_type)} · ${esc(producerName(p.p_producer))}</strong>
        <div class="help">${esc(p.p_date)} · Animal: ${esc(p.p_species || p.p_animalGroup || '')}</div>
        <div class="help">Preventiva: ${esc(p.p_preventiveSubtype || '')} · Zootecnia: ${esc(p.p_zoo_technique || '')}</div>
      </div>
      <div class="row">
        <button class="btn small ghost proc-edit" data-id="${p.id}" type="button">Editar</button>
        <button class="btn small bad proc-del" data-id="${p.id}" type="button">Eliminar</button>
      </div>
    </article>`).join('') || '<div class="empty-state">No hay procedimientos.</div>';
  $$('.proc-edit').forEach(b => b.addEventListener('click', () => editProcedure(b.dataset.id)));
  $$('.proc-del').forEach(b => b.addEventListener('click', () => { state.procedures = state.procedures.filter(x => x.id !== b.dataset.id); saveState(); renderAll(); }));
}
function bindProcedures() {
  $('#procedureForm')?.addEventListener('submit', saveProcedure);
  $('#p_type')?.addEventListener('change', updateProcedureConditionals);
  $('#p_producer')?.addEventListener('change', e => { state.selectedProducerId = e.target.value || null; renderAnimalDerivedLists(); saveState(); });
  $('#p_addMedUse')?.addEventListener('click', () => pushProcedureUse('meds', { id: $('#p_medSelect').value, dose: $('#p_medDoseKg').value, unit: $('#p_medUnitUsed').value }));
  $('#p_addVaccineUse')?.addEventListener('click', () => pushProcedureUse('vaccines', { id: $('#p_vaccineSelect').value, animals: $('#p_vaccineAnimalsApplied').value, notes: $('#p_vaccineNotes').value }));
  $('#p_addSupplyUse')?.addEventListener('click', () => pushProcedureUse('supplies', { id: $('#p_supplySelect').value, qty: $('#p_supplyQtyUsed').value, notes: $('#p_supplyNotes').value }));
  bindMultiPhoto('p_cc_take','p_cc_btnTake','procedureCasePhotos','p_cc_hint','p_cc_preview');
  bindMultiPhoto('p_cc_pick','p_cc_btnPick','procedureCasePhotos','p_cc_hint','p_cc_preview');
  bindMultiPhoto('p_nec_take','p_nec_btnTake','procedureNecropsyPhotos','p_nec_hint','p_nec_preview');
  bindMultiPhoto('p_nec_pick','p_nec_btnPick','procedureNecropsyPhotos','p_nec_hint','p_nec_preview');
  bindSinglePhoto('p_charge_take','p_charge_btnTake','procedureChargePhoto','p_charge_preview','Sin<br/>foto');
  bindSinglePhoto('p_charge_pick','p_charge_btnPick','procedureChargePhoto','p_charge_preview','Sin<br/>foto');
  $('#p_cc_btnClear')?.addEventListener('click', () => { state.media.procedureCasePhotos = []; $('#p_cc_hint').textContent = 'Sin fotos todavía.'; renderPhotoStrip('p_cc_preview', []); });
  $('#p_nec_btnClear')?.addEventListener('click', () => { state.media.procedureNecropsyPhotos = []; $('#p_nec_hint').textContent = 'Sin fotos todavía.'; renderPhotoStrip('p_nec_preview', []); });
  $('#p_charge_btnClear')?.addEventListener('click', () => { state.media.procedureChargePhoto = null; setThumb('p_charge_preview', null, 'Sin<br/>foto'); });
  $('#p_clear')?.addEventListener('click', resetProcedureForm);
  $('#p_btnExportJson')?.addEventListener('click', () => exportJson('procedimientos.json', state.procedures));
  $('#p_btnExportWord')?.addEventListener('click', () => exportJson('procedimientos-word.json', state.procedures));
  $('#p_btnImportJson')?.addEventListener('click', () => $('#p_importFile').click());
  $('#p_importFile')?.addEventListener('change', async e => { const file = e.target.files?.[0]; if (!file) return; state.procedures = JSON.parse(await file.text()); saveState(); renderAll(); e.target.value=''; });
  $('#p_search')?.addEventListener('input', renderProcedures);
}

function renderAll() {
  renderProducerList();
  renderProducerOptions();
  renderAnimalList();
  renderAnimalDerivedLists();
  loadAnimalQuestionnaire();
  renderMeds();
  renderSupplies();
  renderProcedureDrafts();
  renderProcedures();
  updateProducerConditionals();
  updateProcedureConditionals();
}

function init() {
  loadState();
  bindTabs(); bindProducer(); bindAnimals(); bindMeds(); bindSupplies(); bindProcedures();
  addFamilyRow();
  renderAll();
  activateTab('producer');
}

document.addEventListener('DOMContentLoaded', init);
