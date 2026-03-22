const STORAGE_KEY = 'app_rural_consolidada_v1';

const FIXED_GENDER_ANIMALS = [
  'Vacas',
  'Borregos',
  'Cabras',
  'Équidos',
  'Cerdos',
  'Perros',
  'Gatos',
  'Conejos',
  'Aves de pelea',
  'Aves de ornato',
  'Aves de corral'
];

const FIXED_ACTIVITIES = [
  'Alimentar', 'Dar agua', 'Llevar al pastoreo', 'Limpiar corrales', 'Ordeñar', 'Aplicar medicamentos',
  'Vacunar', 'Desparasitar', 'Baños garrapaticidas', 'Asistir partos', 'Cuidar crías', 'Cortar forraje',
  'Acopiar alimento', 'Comprar insumos', 'Registrar gastos', 'Vender animales', 'Vender productos',
  'Negociar precios', 'Trasladar animales', 'Lavar bebederos', 'Revisar enfermos', 'Separar lotes',
  'Recolectar huevo', 'Limpiar gallinero', 'Manejo reproductivo', 'Atender clientes', 'Cobrar servicios'
];

const BIRD_SCALE = {
  '1': '1 = Nada',
  '2': '2 = Poco',
  '3': '3 = Regular',
  '4': '4 = Mucho'
};

const state = {
  producers: [],
  meds: [],
  supplies: [],
  procedures: [],
  selectedProducerId: null,
  editing: { producerId: null, animalId: null, medId: null, supplyId: null, procedureId: null },
  ui: { tab: 'producer', medMode: 'MANUAL', supplyMode: 'DISPOSABLE' },
  media: {
    producerPhoto: null,
    animalTempPhotos: [],
    medRxPhoto: null,
    medTicketPhoto: null,
    supplyTicketPhoto: null,
    procedureCasePhotos: [],
    procedureNecropsyPhotos: [],
    procedureChargePhoto: null
  },
  workingProcedure: { medUses: [], vaccineUses: [], supplyUses: [] }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
function text(v) { return v == null ? '' : String(v); }
function escapeHtml(v) { return text(v).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function money(v) { return new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(Number(v || 0)); }
function nowText() { return new Date().toLocaleString('es-MX'); }
function showMessage(id, msg, cls='help') { const el = $('#'+id); if (!el) return; el.textContent = msg || ''; el.className = cls; el.style.display = msg ? 'block' : 'none'; }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function downloadFile(name, content, mime) { const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function getProducerById(id) { return state.producers.find(p => p.id === id) || null; }
function getSelectedProducer() { return getProducerById(state.selectedProducerId); }
function getSelectedOptions(el) { return Array.from(el?.selectedOptions || []).map(o => o.value); }
function setSelectedOptions(el, values=[]) { Array.from(el?.options || []).forEach(o => { o.selected = values.includes(o.value); }); }
function readRadio(name) { return document.querySelector(`input[name="${name}"]:checked`)?.value || ''; }
function setRadio(name, value) { $$(`input[name="${name}"]`).forEach(i => { i.checked = i.value === value; }); }
function clearNode(el, html='') { if (el) el.innerHTML = html; }

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.assign(state, {
      producers: Array.isArray(parsed.producers) ? parsed.producers : [],
      meds: Array.isArray(parsed.meds) ? parsed.meds : [],
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : [],
      procedures: Array.isArray(parsed.procedures) ? parsed.procedures : [],
      selectedProducerId: parsed.selectedProducerId || null,
      ui: { ...state.ui, ...(parsed.ui || {}) }
    });
  } catch (err) { console.error(err); }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function setThumb(id, dataUrl, empty='Sin<br/>foto') {
  const el = $('#'+id);
  if (!el) return;
  el.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="preview">` : `<span>${empty}</span>`;
}

function renderMultiPreview(containerId, items, onRemove) {
  const box = $('#'+containerId);
  if (!box) return;
  box.innerHTML = '';
  items.forEach((img, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'preview-mini';
    wrap.innerHTML = `<img src="${img}" alt="foto ${index + 1}"><button class="mini-remove" type="button">✕</button>`;
    wrap.querySelector('button').addEventListener('click', () => onRemove(index));
    box.appendChild(wrap);
  });
}

function collectFields(ids) {
  const out = {};
  ids.forEach(id => {
    const el = $('#'+id);
    if (!el) return;
    if (el.tagName === 'SELECT' && el.multiple) out[id] = getSelectedOptions(el);
    else out[id] = el.value;
  });
  return out;
}

function fillFields(data) {
  Object.entries(data || {}).forEach(([id, value]) => {
    const el = $('#'+id);
    if (!el) return;
    if (el.tagName === 'SELECT' && el.multiple) setSelectedOptions(el, Array.isArray(value) ? value : []);
    else el.value = value ?? '';
  });
}

function openWord(html, name) { downloadFile(name, '\ufeff'+html, 'application/msword'); }
function rowsToCsv(rows) { return rows.map(r => r.map(v => { const s = text(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n'); }

function classificationLabel(v) {
  return { TRABAJAR:'Sí trabajar', PENDIENTE:'Aún no sé', NO_TRABAJAR:'No' }[v] || '';
}

function animalHasBirds(prod) {
  return (prod?.animals || []).some(a => /ave|gallina|pollo|guajolote|pato|codorniz|ganso|gallo/i.test(a.species || ''));
}

function animalHasRumiants(prod) {
  return (prod?.animals || []).some(a => /borrego|oveja|cabra/i.test(a.species || ''));
}

function ensureQuestionnaire(prod) {
  if (!prod.animalQuestionnaire) {
    prod.animalQuestionnaire = {
      diseases: [], vaccines: [], dewormings: [], traditional: [], genderAnimals: [], genderActivities: []
    };
  }
  const q = prod.animalQuestionnaire;
  q.diseases ||= []; q.vaccines ||= []; q.dewormings ||= []; q.traditional ||= []; q.genderAnimals ||= []; q.genderActivities ||= [];
  return q;
}

function scheduleIds() {
  return ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].map(d => `horario_${d}`);
}

function collectSchedule() {
  return scheduleIds().reduce((acc, id) => {
    acc[id.replace('horario_','')] = $('#'+id)?.value.trim() || '';
    return acc;
  }, {});
}

function fillSchedule(schedule={}) { Object.entries(schedule).forEach(([day, value]) => { const el = $('#horario_'+day); if (el) el.value = value || ''; }); }
function scheduleToHtml(schedule={}) { return Object.entries(schedule).filter(([,v]) => v).map(([d,v]) => `<li><b>${escapeHtml(d)}:</b> ${escapeHtml(v)}</li>`).join('') || '<li>Sin horario capturado.</li>'; }

function bindTabs() {
  const map = { producer:'pageProducer', animals:'pageAnimals', meds:'pageMeds', supplies:'pageSupplies', procedures:'pageProcedures' };
  Object.keys(map).forEach(key => {
    $('#tab'+key.charAt(0).toUpperCase()+key.slice(1))?.addEventListener('click', () => activateTab(key));
  });
}

function activateTab(key) {
  state.ui.tab = key;
  $$('.tab').forEach(b => b.classList.remove('active'));
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#tab'+key.charAt(0).toUpperCase()+key.slice(1))?.classList.add('active');
  $('#page'+key.charAt(0).toUpperCase()+key.slice(1))?.classList.add('active');
  saveState();
}

function updateProducerConditionalFields() {
  $('#grupoIndigenaYoWrap').style.display = $('#pertenenciaIndigena').value === 'YO' ? 'block' : 'none';
  $('#grupoIndigenaFamiliarWrap').style.display = $('#pertenenciaIndigena').value === 'FAMILIAR' ? 'grid' : 'none';
  $('#lenguaYoWrap').style.display = $('#lenguaIndigenaTipo').value === 'YO' ? 'block' : 'none';
  $('#lenguaFamiliarWrap').style.display = $('#lenguaIndigenaTipo').value === 'FAMILIAR' ? 'grid' : 'none';
  $('#alertaWrap').style.display = getClassification() === 'NO_TRABAJAR' ? 'block' : 'none';
}

function bindClassification() {
  $$('#chipsClasificacion .chip').forEach(chip => chip.addEventListener('click', () => setClassification(chip.dataset.value)));
}
function setClassification(value) { $$('#chipsClasificacion .chip').forEach(ch => ch.dataset.active = ch.dataset.value === value ? 'true' : 'false'); updateProducerConditionalFields(); }
function getClassification() { return $('#chipsClasificacion .chip[data-active="true"]')?.dataset.value || 'TRABAJAR'; }

function familyRowTemplate(item={}) {
  return `<tr>
    <td><input class="fam-name" value="${escapeHtml(item.name || '')}"></td>
    <td><input class="fam-relation" value="${escapeHtml(item.relation || '')}"></td>
    <td><input class="fam-occupation" value="${escapeHtml(item.occupation || '')}"></td>
    <td><input class="fam-age" type="number" min="0" value="${escapeHtml(item.age || '')}"></td>
    <td><button class="btn small bad fam-remove" type="button">✖</button></td>
  </tr>`;
}
function addFamilyRow(item={}) {
  $('#familyTbody').insertAdjacentHTML('beforeend', familyRowTemplate(item));
  $('#familyTbody tr:last-child .fam-remove').addEventListener('click', (e) => e.target.closest('tr').remove());
}
function collectFamilyRows() { return Array.from($('#familyTbody').querySelectorAll('tr')).map(tr => ({ name:tr.querySelector('.fam-name').value.trim(), relation:tr.querySelector('.fam-relation').value.trim(), occupation:tr.querySelector('.fam-occupation').value.trim(), age:tr.querySelector('.fam-age').value.trim() })).filter(r => Object.values(r).some(Boolean)); }
function setFamilyRows(rows=[]) { clearNode($('#familyTbody')); (rows.length ? rows : [{}]).forEach(addFamilyRow); }

function bindProducerMedia() {
  $('#btnTakePhoto')?.addEventListener('click', () => $('#fotoTomar').click());
  $('#btnPickPhoto')?.addEventListener('click', () => $('#fotoElegir').click());
  $('#fotoTomar')?.addEventListener('change', async e => { const f=e.target.files?.[0]; if (!f) return; state.media.producerPhoto = await fileToBase64(f); setThumb('photoPreview', state.media.producerPhoto, 'Sin<br/>foto'); e.target.value=''; });
  $('#fotoElegir')?.addEventListener('change', async e => { const f=e.target.files?.[0]; if (!f) return; state.media.producerPhoto = await fileToBase64(f); setThumb('photoPreview', state.media.producerPhoto, 'Sin<br/>foto'); e.target.value=''; });
  $('#btnRemovePhoto')?.addEventListener('click', () => { state.media.producerPhoto = null; setThumb('photoPreview', null, 'Sin<br/>foto'); });
}

function bindLocation() {
  $('#btnGeo')?.addEventListener('click', () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      $('#lat').value = pos.coords.latitude.toFixed(7);
      $('#lng').value = pos.coords.longitude.toFixed(7);
      showMessage('ok', 'Ubicación cargada.', 'success');
    }, () => showMessage('err', 'No se pudo obtener la ubicación.', 'error'));
  });
  $('#btnGenMaps')?.addEventListener('click', () => {
    const lat = $('#lat').value.trim(); const lng = $('#lng').value.trim();
    if (lat && lng) $('#mapsUrl').value = `https://maps.google.com/?q=${lat},${lng}`;
  });
  $('#btnOpenMaps')?.addEventListener('click', () => { const url = $('#mapsUrl').value.trim(); if (url) window.open(url, '_blank'); });
  $('#btnClearLocation')?.addEventListener('click', () => ['lat','lng','mapsUrl'].forEach(id => $('#'+id).value=''));
}

function collectProducer() {
  const old = state.editing.producerId ? getProducerById(state.editing.producerId) : null;
  return {
    id: old?.id || uid(), createdAt: old?.createdAt || nowText(), updatedAt: nowText(),
    basic: {
      name: $('#nombre').value.trim(), age: $('#edad').value, sex: $('#sexo').value, maritalStatus: $('#estadoCivil').value,
      phone: $('#celular').value.trim(), locality: $('#localidad').value.trim(), municipality: $('#municipio').value.trim(), stateName: $('#estado').value.trim(),
      schooling: $('#escolaridad').value, schoolingOther: $('#escolaridadOtro').value.trim(), canRead: readRadio('sabeLeer'), canWrite: readRadio('sabeEscribir'),
      indigenousType: $('#pertenenciaIndigena').value, indigenousSelf: $('#grupoIndigenaYo').value.trim(), indigenousFamilyWho: $('#grupoIndigenaFamiliarQuien').value.trim(), indigenousFamilyGroup: $('#grupoIndigenaFamiliarCual').value.trim(),
      languageType: $('#lenguaIndigenaTipo').value, languageSelf: $('#lenguaYo').value.trim(), languageFamilyWho: $('#lenguaFamiliarQuien').value.trim(), languageFamilyWhich: $('#lenguaFamiliarCual').value.trim(),
      peopleAtHome: $('#personasEnCasa').value.trim(), scheduleVisual: collectSchedule()
    },
    location: { lat: $('#lat').value.trim(), lng: $('#lng').value.trim(), mapsUrl: $('#mapsUrl').value.trim() },
    classification: { status: getClassification(), noReason: $('#alerta').value.trim(), extraNote: $('#notaExtraPersona').value.trim() },
    family: collectFamilyRows(), notes: $('#notas').value.trim(), photo: state.media.producerPhoto || old?.photo || null,
    animals: old?.animals || [], animalQuestionnaire: old?.animalQuestionnaire || null
  };
}

function resetProducerForm() {
  $('#producerForm').reset();
  state.editing.producerId = null; state.media.producerPhoto = null;
  setRadio('sabeLeer', 'SI'); setRadio('sabeEscribir', 'SI'); setClassification('TRABAJAR'); setFamilyRows(); fillSchedule({});
  $('#formTitle').textContent = 'Nuevo productor(a)'; $('#btnCancelEdit').style.display = 'none'; setThumb('photoPreview', null, 'Sin<br/>foto'); updateProducerConditionalFields();
}

function fillProducer(prod) {
  state.editing.producerId = prod.id;
  fillFields({
    nombre: prod.basic?.name, edad: prod.basic?.age, sexo: prod.basic?.sex, estadoCivil: prod.basic?.maritalStatus, celular: prod.basic?.phone,
    localidad: prod.basic?.locality, municipio: prod.basic?.municipality, estado: prod.basic?.stateName, escolaridad: prod.basic?.schooling,
    escolaridadOtro: prod.basic?.schoolingOther, pertenenciaIndigena: prod.basic?.indigenousType, grupoIndigenaYo: prod.basic?.indigenousSelf,
    grupoIndigenaFamiliarQuien: prod.basic?.indigenousFamilyWho, grupoIndigenaFamiliarCual: prod.basic?.indigenousFamilyGroup,
    lenguaIndigenaTipo: prod.basic?.languageType, lenguaYo: prod.basic?.languageSelf, lenguaFamiliarQuien: prod.basic?.languageFamilyWho,
    lenguaFamiliarCual: prod.basic?.languageFamilyWhich, personasEnCasa: prod.basic?.peopleAtHome, lat: prod.location?.lat, lng: prod.location?.lng,
    mapsUrl: prod.location?.mapsUrl, alerta: prod.classification?.noReason, notaExtraPersona: prod.classification?.extraNote, notas: prod.notes
  });
  fillSchedule(prod.basic?.scheduleVisual || {}); setRadio('sabeLeer', prod.basic?.canRead || 'SI'); setRadio('sabeEscribir', prod.basic?.canWrite || 'SI');
  setClassification(prod.classification?.status || 'TRABAJAR'); setFamilyRows(prod.family || []); state.media.producerPhoto = prod.photo || null; setThumb('photoPreview', prod.photo, 'Sin<br/>foto');
  $('#formTitle').textContent = 'Editar productor(a)'; $('#btnCancelEdit').style.display = 'inline-flex'; updateProducerConditionalFields();
}

function saveProducer(e) {
  e.preventDefault();
  const prod = collectProducer();
  if (!prod.basic.name) return showMessage('err', 'El nombre es obligatorio.', 'error');
  const idx = state.producers.findIndex(p => p.id === prod.id);
  if (idx >= 0) state.producers[idx] = prod; else state.producers.unshift(prod);
  state.selectedProducerId = prod.id; saveState(); renderProducerList(); renderProducerOptions(); resetProducerForm(); showMessage('ok', 'Productor(a) guardado.', 'success');
}

function deleteProducer(id) {
  state.producers = state.producers.filter(p => p.id !== id);
  if (state.selectedProducerId === id) state.selectedProducerId = state.producers[0]?.id || null;
  saveState(); renderProducerList(); renderProducerOptions();
}

function producerWordHtml(prod) {
  const q = ensureQuestionnaire(prod);
  const animals = (prod.animals || []).map((a, i) => `<tr><td>${i+1}</td><td>${escapeHtml(a.species)}</td><td>${escapeHtml(a.race)}</td><td>${escapeHtml(a.quantity)}</td><td>${escapeHtml((a.owners||[]).join(', '))}</td><td>${escapeHtml((a.sellDecision||[]).join(', '))}</td><td>${escapeHtml((a.cleanFeedBy||[]).join(', '))}</td><td>${escapeHtml((a.function||[]).join(', '))}</td><td>${escapeHtml(a.installations)}</td><td>${escapeHtml(a.feed)}</td></tr>`).join('') || '<tr><td colspan="10">Sin animales registrados</td></tr>';
  const family = (prod.family || []).map((f, i) => `<tr><td>${i+1}</td><td>${escapeHtml(f.name)}</td><td>${escapeHtml(f.relation)}</td><td>${escapeHtml(f.occupation)}</td><td>${escapeHtml(f.age)}</td></tr>`).join('') || '<tr><td colspan="5">Sin familiares capturados</td></tr>';
  const diseases = q.diseases.map(d => `<li><b>${escapeHtml(d.animal)}</b> · ${escapeHtml(d.name)} · ${escapeHtml(d.date)} · signos: ${escapeHtml(d.signs)} · tratamiento: ${escapeHtml(d.treatment)}</li>`).join('') || '<li>Sin enfermedades capturadas.</li>';
  const vaccines = q.vaccines.map(v => `<li><b>${escapeHtml(v.animal)}</b> · ${escapeHtml(v.name)} · ${escapeHtml(v.date)} · aplicó: ${escapeHtml(v.who)} · notas: ${escapeHtml(v.notes || '')}</li>`).join('') || '<li>Sin vacunaciones capturadas.</li>';
  const dewormings = q.dewormings.map(v => `<li><b>${escapeHtml(v.animal)}</b> · ${escapeHtml(v.product)} · ${escapeHtml(v.date)} · aplicó: ${escapeHtml(v.who)} · rotación: ${escapeHtml(v.changeProduct || '')}</li>`).join('') || '<li>Sin desparasitaciones capturadas.</li>';
  const traditional = q.traditional.map(v => `<li>${escapeHtml(v.name)} · ${escapeHtml(v.type)} · uso: ${escapeHtml(v.use)} · parte: ${escapeHtml(v.part)}</li>`).join('') || '<li>Sin remedios tradicionales.</li>';
  const genderAnimals = q.genderAnimals.map(v => `<li>${escapeHtml(v.animal)} · ${escapeHtml(v.sex)} · ${escapeHtml(v.why)}</li>`).join('') || '<li>Sin registros.</li>';
  const genderActivities = q.genderActivities.map(v => `<li>${escapeHtml(v.activity)} · ${escapeHtml(v.sex)} · ${escapeHtml(v.why)}</li>`).join('') || '<li>Sin registros.</li>';
  const genericQuestionnaire = Object.entries(q).filter(([k]) => !['diseases','vaccines','dewormings','traditional','genderAnimals','genderActivities'].includes(k)).map(([k,v]) => `<li><b>${escapeHtml(k)}:</b> ${escapeHtml(Array.isArray(v) ? v.join(', ') : v)}</li>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px;vertical-align:top}th{background:#eee}img{max-width:220px}ul{margin:0 0 12px 18px}</style></head><body>
  <h1>Expediente consolidado de productor(a)</h1>
  <h2>Datos básicos</h2>
  <p><b>Nombre:</b> ${escapeHtml(prod.basic?.name)}</p>
  <p><b>Edad:</b> ${escapeHtml(prod.basic?.age)}</p>
  <p><b>Sexo:</b> ${escapeHtml(prod.basic?.sex)}</p>
  <p><b>Estado civil:</b> ${escapeHtml(prod.basic?.maritalStatus)}</p>
  <p><b>Celular:</b> ${escapeHtml(prod.basic?.phone)}</p>
  <p><b>Localidad:</b> ${escapeHtml(prod.basic?.locality)}</p>
  <p><b>Municipio:</b> ${escapeHtml(prod.basic?.municipality)}</p>
  <p><b>Estado:</b> ${escapeHtml(prod.basic?.stateName)}</p>
  <p><b>Personas en casa:</b> ${escapeHtml(prod.basic?.peopleAtHome)}</p>
  <p><b>Clasificación:</b> ${escapeHtml(classificationLabel(prod.classification?.status))}</p>
  <p><b>Razón:</b> ${escapeHtml(prod.classification?.noReason)}</p>
  <p><b>Nota:</b> ${escapeHtml(prod.classification?.extraNote)}</p>
  <h3>Horario visual por día</h3><ul>${scheduleToHtml(prod.basic?.scheduleVisual)}</ul>
  <h2>Ubicación</h2>
  <p><b>Latitud:</b> ${escapeHtml(prod.location?.lat)}</p><p><b>Longitud:</b> ${escapeHtml(prod.location?.lng)}</p><p><b>Maps:</b> ${escapeHtml(prod.location?.mapsUrl)}</p>
  <h2>Familia</h2><table><tr><th>#</th><th>Nombre</th><th>Relación</th><th>Ocupación</th><th>Edad</th></tr>${family}</table>
  <h2>Animales</h2><table><tr><th>#</th><th>Especie</th><th>Raza</th><th>Cantidad</th><th>Dueño/a</th><th>Decide venta</th><th>Limpia/alimenta</th><th>Función</th><th>Instalaciones</th><th>Alimentación</th></tr>${animals}</table>
  <h2>Enfermedades</h2><ul>${diseases}</ul>
  <h2>Vacunación</h2><ul>${vaccines}</ul>
  <h2>Desparasitación</h2><ul>${dewormings}</ul>
  <h2>Remedios tradicionales</h2><ul>${traditional}</ul>
  <h2>Animales que cuidan hombres y mujeres</h2><ul>${genderAnimals}</ul>
  <h2>Actividades por género</h2><ul>${genderActivities}</ul>
  <h2>Cuestionario completo</h2><ul>${genericQuestionnaire}</ul>
  ${prod.photo ? `<h2>Foto</h2><img src="${prod.photo}">` : ''}
  </body></html>`;
}

function renderProducerList() {
  const list = $('#producerList'); const count = $('#count'); if (!list) return; list.innerHTML = ''; count.textContent = state.producers.length;
  if (!state.producers.length) return list.innerHTML = '<div class="empty-state">No hay productores registrados todavía.</div>';
  state.producers.forEach(prod => {
    const item = document.createElement('div'); item.className='item';
    item.innerHTML = `<div class="row" style="justify-content:space-between;align-items:flex-start;"><div><h3>${escapeHtml(prod.basic?.name || 'Sin nombre')}</h3><div class="meta">📍 ${escapeHtml(prod.basic?.locality || '')}, ${escapeHtml(prod.basic?.municipality || '')}</div><div class="row"><span class="badge">${escapeHtml(classificationLabel(prod.classification?.status))}</span><span class="badge">🐾 ${(prod.animals||[]).length} grupos</span></div></div>${prod.photo?`<div class="preview-mini"><img src="${prod.photo}" alt="foto"></div>`:''}</div><div class="actions" style="margin-top:12px;"><button class="btn small" data-a="select" type="button">✅ Seleccionar</button><button class="btn small ghost" data-a="edit" type="button">✏️ Editar</button><button class="btn small ghost" data-a="animals" type="button">🐾 Animales</button><button class="btn small ghost" data-a="word" type="button">📄 Word</button><button class="btn small bad" data-a="delete" type="button">🗑️ Eliminar</button></div>`;
    item.querySelector('[data-a="select"]').onclick = () => { state.selectedProducerId = prod.id; saveState(); renderProducerOptions(); renderProcedureFormSupport(); };
    item.querySelector('[data-a="edit"]').onclick = () => { fillProducer(prod); activateTab('producer'); };
    item.querySelector('[data-a="animals"]').onclick = () => { state.selectedProducerId = prod.id; saveState(); renderProducerOptions(); activateTab('animals'); };
    item.querySelector('[data-a="word"]').onclick = () => openWord(producerWordHtml(prod), `${(prod.basic?.name || 'productor').replace(/[^\wáéíóúñ -]/gi,'')}.doc`);
    item.querySelector('[data-a="delete"]').onclick = () => deleteProducer(prod.id);
    list.appendChild(item);
  });
}

function bindProducerSection() {
  bindClassification(); bindProducerMedia(); bindLocation(); setFamilyRows(); updateProducerConditionalFields();
  $('#producerForm')?.addEventListener('submit', saveProducer);
  $('#btnAddFamily')?.addEventListener('click', () => addFamilyRow());
  $('#btnReset')?.addEventListener('click', resetProducerForm);
  $('#btnCancelEdit')?.addEventListener('click', resetProducerForm);
  $('#pertenenciaIndigena')?.addEventListener('change', updateProducerConditionalFields);
  $('#lenguaIndigenaTipo')?.addEventListener('change', updateProducerConditionalFields);
  $('#btnExport')?.addEventListener('click', () => downloadFile('productores.json', JSON.stringify(state.producers, null, 2), 'application/json'));
  $('#btnExportWordProducer')?.addEventListener('click', () => { const prod = getSelectedProducer(); if (prod) openWord(producerWordHtml(prod), `${(prod.basic?.name || 'productor').replace(/[^\wáéíóúñ -]/gi,'')}.doc`); });
  $('#btnWipe')?.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });
  $('#btnImport')?.addEventListener('click', () => $('#importFile').click());
  $('#importFile')?.addEventListener('change', e => { const f=e.target.files?.[0]; if (!f) return; const fr = new FileReader(); fr.onload=()=>{ try{ state.producers = JSON.parse(fr.result); saveState(); renderProducerList(); renderProducerOptions(); }catch(err){ showMessage('err','No se pudo importar el JSON.','error'); } }; fr.readAsText(f); e.target.value=''; });
}

function producerPeopleOptions(prod) {
  const arr = []; if (!prod) return arr;
  if (prod.basic?.name) arr.push(prod.basic.name);
  (prod.family || []).forEach(f => { if (f.name) arr.push(`${f.name}${f.relation ? ` - ${f.relation}` : ''}`); });
  return arr;
}

function renderProducerOptions() {
  const animalsSel = $('#animalsProducerSelect'); const procedureSel = $('#p_producer');
  [animalsSel, procedureSel].forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '<option value="">— Selecciona productor/a —</option>';
    state.producers.forEach(p => sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${escapeHtml(p.basic?.name || 'Sin nombre')}</option>`));
  });
  if (state.selectedProducerId) { if (animalsSel) animalsSel.value = state.selectedProducerId; if (procedureSel) procedureSel.value = state.selectedProducerId; }
  renderAnimalSupport(); renderProcedureFormSupport();
}

function animalFieldIds() { return ['a_especie','a_raza','a_cantidad','a_dueno','a_decideVenta','a_limpiaAlimenta','a_funcion','a_viven','a_feedType']; }

function resetAnimalGroupForm() {
  state.editing.animalId = null; fillFields({ a_especie:'', a_raza:'', a_cantidad:'', a_viven:'', a_feedType:'' }); ['a_dueno','a_decideVenta','a_limpiaAlimenta','a_funcion'].forEach(id => setSelectedOptions($('#'+id), [])); state.media.animalTempPhotos = []; renderAnimalPhotos();
}

function renderAnimalPhotos() {
  $('#a_instHint').textContent = state.media.animalTempPhotos.length ? `${state.media.animalTempPhotos.length} foto(s) cargada(s).` : 'Sin fotos todavía.';
  renderMultiPreview('a_instPreview', state.media.animalTempPhotos, index => { state.media.animalTempPhotos.splice(index, 1); renderAnimalPhotos(); });
}

function bindAnimalPhotos() {
  $('#a_btnInstTake')?.addEventListener('click', () => $('#a_instTake').click());
  $('#a_btnInstPick')?.addEventListener('click', () => $('#a_instPick').click());
  const reader = async e => {
    const files = Array.from(e.target.files || []);
    for (const file of files) state.media.animalTempPhotos.push(await fileToBase64(file));
    renderAnimalPhotos(); e.target.value='';
  };
  $('#a_instTake')?.addEventListener('change', reader); $('#a_instPick')?.addEventListener('change', reader);
  $('#a_btnInstClear')?.addEventListener('click', () => { state.media.animalTempPhotos = []; renderAnimalPhotos(); });
}

function renderAnimalSupport() {
  const prod = getSelectedProducer();
  $('#animalsProducerHint').textContent = prod ? `Trabajando con: ${prod.basic?.name}` : 'Primero selecciona un productor/a';
  const people = producerPeopleOptions(prod);
  ['a_dueno','a_decideVenta','a_limpiaAlimenta','a_vaxWho','a_dewormWho'].forEach(id => {
    const sel = $('#'+id); if (!sel) return; const current = getSelectedOptions(sel); sel.innerHTML=''; people.forEach(p => sel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)); setSelectedOptions(sel, current);
  });
  const animalOptions = (prod?.animals || []).map(a => a.species).filter(Boolean);
  ['a_animalesImportantes','a_enfAnimal','a_vaxAnimal','a_dewormAnimal','p_animalGroup'].forEach(id => {
    const sel = $('#'+id); if (!sel) return; const current = sel.multiple ? getSelectedOptions(sel) : sel.value; sel.innerHTML = `<option value="">${id==='a_animalesImportantes'?'':'— Selecciona —'}</option>`;
    animalOptions.forEach(a => sel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`));
    if (sel.multiple) setSelectedOptions(sel, current); else sel.value = current;
  });
  const fixedSel = $('#a_genderAnimal');
  if (fixedSel) {
    const current = fixedSel.value; fixedSel.innerHTML = '<option value="">— Selecciona —</option>';
    FIXED_GENDER_ANIMALS.forEach(a => fixedSel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`));
    fixedSel.value = current;
  }
  const actList = $('#a_activitySuggestions');
  if (actList) actList.innerHTML = FIXED_ACTIVITIES.map(a => `<option value="${escapeHtml(a)}"></option>`).join('');
  toggleQuestionnaireConditionals();
  renderAnimalsList();
  fillQuestionnaire();
}

function saveAnimalGroup() {
  const prod = getSelectedProducer();
  if (!prod) return showMessage('a_msg', 'Primero selecciona un productor(a).', 'error');
  const record = {
    id: state.editing.animalId || uid(), species: $('#a_especie').value.trim(), race: $('#a_raza').value.trim(), quantity: Number($('#a_cantidad').value || 0),
    owners: getSelectedOptions($('#a_dueno')), sellDecision: getSelectedOptions($('#a_decideVenta')), cleanFeedBy: getSelectedOptions($('#a_limpiaAlimenta')),
    function: getSelectedOptions($('#a_funcion')), installations: $('#a_viven').value.trim(), feed: $('#a_feedType').value.trim(), photos: [...state.media.animalTempPhotos]
  };
  if (!record.species) return showMessage('a_msg','La especie o grupo animal es obligatorio.','error');
  prod.animals ||= [];
  const idx = prod.animals.findIndex(a => a.id === record.id);
  if (idx >= 0) prod.animals[idx] = record; else prod.animals.unshift(record);
  saveState(); resetAnimalGroupForm(); renderAnimalSupport(); showMessage('a_msg', 'Grupo animal guardado.', 'success');
}

function renderAnimalsList() {
  const prod = getSelectedProducer(); const list = $('#a_list'); if (!list) return; list.innerHTML='';
  if (!prod?.animals?.length) return list.innerHTML = '<div class="empty-state">No hay grupos animales registrados.</div>';
  prod.animals.forEach(a => {
    const item = document.createElement('div'); item.className='item';
    item.innerHTML = `<h3>${escapeHtml(a.species)}${a.race ? ` · ${escapeHtml(a.race)}` : ''}</h3><div class="meta">Cantidad: ${escapeHtml(a.quantity)}</div><div class="kv"><div class="line"><b>Dueño/a:</b> ${escapeHtml((a.owners||[]).join(', '))}</div><div class="line"><b>Función:</b> ${escapeHtml((a.function||[]).join(', '))}</div><div class="line"><b>Instalaciones:</b> ${escapeHtml(a.installations || '')}</div><div class="line"><b>Alimentación:</b> ${escapeHtml(a.feed || '')}</div></div><div class="actions" style="margin-top:12px;"><button class="btn small ghost" type="button" data-a="edit">✏️ Editar</button><button class="btn small bad" type="button" data-a="delete">🗑️ Eliminar</button></div>`;
    item.querySelector('[data-a="edit"]').onclick = () => {
      state.editing.animalId = a.id; fillFields({ a_especie:a.species, a_raza:a.race, a_cantidad:a.quantity, a_viven:a.installations, a_feedType:a.feed });
      setSelectedOptions($('#a_dueno'), a.owners || []); setSelectedOptions($('#a_decideVenta'), a.sellDecision || []); setSelectedOptions($('#a_limpiaAlimenta'), a.cleanFeedBy || []); setSelectedOptions($('#a_funcion'), a.function || []); state.media.animalTempPhotos = [...(a.photos || [])]; renderAnimalPhotos();
    };
    item.querySelector('[data-a="delete"]').onclick = () => { prod.animals = prod.animals.filter(x => x.id !== a.id); saveState(); renderAnimalSupport(); renderProcedureFormSupport(); };
    list.appendChild(item);
  });
}

function addListItem(key, item, requiredFields=[]) {
  const prod = getSelectedProducer(); if (!prod) return showMessage('a_msg','Selecciona un productor(a).','error');
  const q = ensureQuestionnaire(prod);
  if (requiredFields.some(([name, value]) => !text(value).trim())) return showMessage('a_msg', `Falta capturar: ${requiredFields.find(([,v]) => !text(v).trim())[0]}.`, 'error');
  q[key].push({ id: uid(), ...item }); saveState(); renderQuestionnaireLists();
}

function renderCollection(listId, items, titleBuilder, linesBuilder, editFn, deleteFn, emptyText) {
  const list = $('#'+listId); if (!list) return; list.innerHTML='';
  if (!items.length) return list.innerHTML = `<div class="empty-state">${emptyText}</div>`;
  items.forEach(item => {
    const div = document.createElement('div'); div.className='item';
    div.innerHTML = `<h3>${titleBuilder(item)}</h3><div class="kv">${linesBuilder(item).map(line => `<div class="line">${line}</div>`).join('')}</div><div class="actions" style="margin-top:12px;"><button class="btn small ghost" type="button" data-a="edit">✏️ Editar</button><button class="btn small bad" type="button" data-a="delete">🗑️ Eliminar</button></div>`;
    div.querySelector('[data-a="edit"]').onclick = () => editFn(item);
    div.querySelector('[data-a="delete"]').onclick = () => deleteFn(item.id);
    list.appendChild(div);
  });
}

function renderQuestionnaireLists() {
  const prod = getSelectedProducer(); if (!prod) return; const q = ensureQuestionnaire(prod);
  renderCollection('a_diseaseList', q.diseases, i => `${escapeHtml(i.animal)}${i.name ? ` · ${escapeHtml(i.name)}` : ''}`, i => [`<b>Fecha:</b> ${escapeHtml(i.date)}`, `<b>Signos:</b> ${escapeHtml(i.signs)}`, `<b>Tratamiento:</b> ${escapeHtml(i.treatment)}`],
    i => { fillFields({ a_lastSick:i.date, a_enfAnimal:i.animal, a_commonDis:i.name, a_signs:i.signs, a_whenSickDo:i.treatment }); q.diseases = q.diseases.filter(x => x.id !== i.id); saveState(); renderQuestionnaireLists(); },
    id => { q.diseases = q.diseases.filter(x => x.id !== id); saveState(); renderQuestionnaireLists(); }, 'No hay enfermedades registradas.');
  renderCollection('a_vaxList', q.vaccines, i => `${escapeHtml(i.animal)}${i.name ? ` · ${escapeHtml(i.name)}` : ''}`, i => [`<b>Fecha:</b> ${escapeHtml(i.date)}`, `<b>Aplicó:</b> ${escapeHtml(i.who)}`, `<b>Notas:</b> ${escapeHtml(i.notes || '')}`],
    i => { fillFields({ a_vaxAnimal:i.animal, a_vaxName:i.name, a_vaxDate:i.date, a_vaxWho:i.who, a_vaxNotes:i.notes }); q.vaccines = q.vaccines.filter(x => x.id !== i.id); saveState(); renderQuestionnaireLists(); },
    id => { q.vaccines = q.vaccines.filter(x => x.id !== id); saveState(); renderQuestionnaireLists(); }, 'No hay vacunaciones registradas.');
  renderCollection('a_dewormList', q.dewormings, i => `${escapeHtml(i.animal)}${i.product ? ` · ${escapeHtml(i.product)}` : ''}`, i => [`<b>Fecha:</b> ${escapeHtml(i.date)}`, `<b>Aplicó:</b> ${escapeHtml(i.who)}`, `<b>Rotación:</b> ${escapeHtml(i.changeProduct || '')}`, `<b>Recomendado por:</b> ${escapeHtml(i.recommendedBy || '')}`],
    i => { fillFields({ a_dewormAnimal:i.animal, a_dewormProd:i.product, a_dewormDate:i.date, a_dewormWho:i.who }); q.dewormings = q.dewormings.filter(x => x.id !== i.id); saveState(); renderQuestionnaireLists(); },
    id => { q.dewormings = q.dewormings.filter(x => x.id !== id); saveState(); renderQuestionnaireLists(); }, 'No hay desparasitaciones registradas.');
  renderCollection('a_tradList', q.traditional, i => escapeHtml(i.name), i => [`<b>Tipo:</b> ${escapeHtml(i.type)}`, `<b>Uso:</b> ${escapeHtml(i.use)}`, `<b>Parte:</b> ${escapeHtml(i.part)}`],
    i => { fillFields({ a_tradNombre:i.name, a_tradTipo:i.type, a_tradUso:i.use, a_tradParte:i.part }); q.traditional = q.traditional.filter(x => x.id !== i.id); saveState(); renderQuestionnaireLists(); },
    id => { q.traditional = q.traditional.filter(x => x.id !== id); saveState(); renderQuestionnaireLists(); }, 'No hay productos/remedios tradicionales.');
  renderCollection('a_genderAnimalList', q.genderAnimals, i => escapeHtml(i.animal), i => [`<b>Quién lo cuida:</b> ${escapeHtml(i.sex)}`, `<b>Por qué:</b> ${escapeHtml(i.why)}`],
    i => { fillFields({ a_genderAnimal:i.animal, a_genderAnimalWho:i.sex, a_genderAnimalWhy:i.why }); q.genderAnimals = q.genderAnimals.filter(x => x.id !== i.id); saveState(); renderQuestionnaireLists(); },
    id => { q.genderAnimals = q.genderAnimals.filter(x => x.id !== id); saveState(); renderQuestionnaireLists(); }, 'No hay registros de animales por género.');
  renderCollection('a_generoActividadList', q.genderActivities, i => escapeHtml(i.activity), i => [`<b>Quién la hace:</b> ${escapeHtml(i.sex)}`, `<b>Por qué:</b> ${escapeHtml(i.why)}`],
    i => { fillFields({ a_actividadGenero:i.activity, a_actividadGeneroSexo:i.sex, a_actividadGeneroRazon:i.why }); q.genderActivities = q.genderActivities.filter(x => x.id !== i.id); saveState(); renderQuestionnaireLists(); },
    id => { q.genderActivities = q.genderActivities.filter(x => x.id !== id); saveState(); renderQuestionnaireLists(); }, 'No hay actividades por género.');
}

function toggleQuestionnaireConditionals() {
  const prod = getSelectedProducer();
  const hasRumiants = animalHasRumiants(prod);
  $('#a_interestRumiants')?.closest('.grid.cols-2')?.classList.toggle('hidden', hasRumiants);
  $('#a_interestBirdsYesWrap').style.display = animalHasBirds(prod) ? 'block' : 'none';
  $('#a_interestBirdsNoWrap').style.display = animalHasBirds(prod) ? 'none' : 'block';
}

function saveQuestionnaire() {
  const prod = getSelectedProducer(); if (!prod) return showMessage('a_msg','Primero selecciona un productor(a).','error');
  const q = ensureQuestionnaire(prod);
  Object.assign(q, {
    importantAnimals: getSelectedOptions($('#a_animalesImportantes')), importantAnimalsWhy: $('#a_importanciaDetalle').value.trim(), hasMilpa: $('#a_tieneMilpa').value, whatSows: $('#a_queSiembra').value.trim(), forageShortage: $('#a_escasezForraje').value.trim(),
    whereAnimalsStay: $('#a_dondeEstanMayorTiempo').value.trim(), vaccinatesAny: $('#a_vaxAny').value, dewormsAny: $('#a_dewormAny').value, changesDewormer: $('#a_changeDewormProduct').value, recommendedBy: $('#a_recommendWho').value.trim(),
    curadorExiste: $('#a_curadorExiste').value, curadorQuien: $('#a_curadorQuien').value.trim(), curadorEdad: $('#a_curadorEdad').value, curadorEspecies: $('#a_curadorEspecies').value.trim(), curadorTiempo: $('#a_curadorTiempo').value.trim(), curadorServicios: $('#a_curadorServicios').value.trim(),
    practicesAny: $('#a_practicas').value, practicesWho: $('#a_practicasQuien').value.trim(), practicesAdvice: $('#a_practicasAsesoria').value, programRegistered: $('#a_programaRegistro').value, programName: $('#a_programaNombre').value.trim(), hasFolio: $('#a_programaFolioTiene').value,
    folio: $('#a_programaFolio').value.trim(), futureCalls: $('#a_programaConvocatorias').value.trim(), huntingCommon: $('#a_cazaComunidad').value, huntingTime: $('#a_cazaTiempo').value.trim(), huntedAnimals: $('#a_cazaAnimales').value.trim(), huntingPlaces: $('#a_cazaLugares').value.trim(),
    huntingSeason: $('#a_cazaEpoca').value.trim(), huntingReasons: $('#a_cazaMotivos').value.trim(), wildProblems: $('#a_silvestresProblemas').value, wildProblemsDetail: $('#a_silvestresQuePaso').value.trim(), riverUse: $('#a_rioUso').value, riverUseFor: $('#a_rioParaQue').value.trim(),
    riverMeaning: $('#a_rioSignificado').value.trim(), riverProblems: $('#a_rioProblemas').value.trim(), localKnowledgeExists: $('#a_saberesLocales').value, localKnowledgeWho: $('#a_saberesQuien').value.trim(), localKnowledgeUseful: $('#a_saberesUtilidad').value,
    hadRumiantsBefore: $('#a_hadRumiantsBefore').value, rumiantInterest: animalHasRumiants(prod) ? 'Ya tiene borregos/cabras' : $('#a_interestRumiants').value, rumiantInterestWhy: animalHasRumiants(prod) ? '' : $('#a_interestRumiantsWhy').value.trim(),
    noRumiantsReason: $('#a_noRumiantsWhy').value.trim(), rumiantAdvice: $('#a_rumiantsAdvice').value, rumiantNeed: $('#a_rumiantsNeed').value.trim(), birdsInterestYes: $('#a_interestBirdsYes').value, birdsInterestNo: $('#a_interestBirdsNo').value
  });
  saveState(); renderProducerList(); showMessage('a_msg','Sección de animales y cuestionario guardada.', 'success');
}

function fillQuestionnaire() {
  const prod = getSelectedProducer(); if (!prod) return; const q = ensureQuestionnaire(prod);
  fillFields({ a_importanciaDetalle:q.importantAnimalsWhy, a_tieneMilpa:q.hasMilpa, a_queSiembra:q.whatSows, a_escasezForraje:q.forageShortage, a_dondeEstanMayorTiempo:q.whereAnimalsStay,
    a_vaxAny:q.vaccinatesAny, a_dewormAny:q.dewormsAny, a_changeDewormProduct:q.changesDewormer, a_recommendWho:q.recommendedBy, a_curadorExiste:q.curadorExiste, a_curadorQuien:q.curadorQuien, a_curadorEdad:q.curadorEdad,
    a_curadorEspecies:q.curadorEspecies, a_curadorTiempo:q.curadorTiempo, a_curadorServicios:q.curadorServicios, a_practicas:q.practicesAny, a_practicasQuien:q.practicesWho, a_practicasAsesoria:q.practicesAdvice,
    a_programaRegistro:q.programRegistered, a_programaNombre:q.programName, a_programaFolioTiene:q.hasFolio, a_programaFolio:q.folio, a_programaConvocatorias:q.futureCalls, a_cazaComunidad:q.huntingCommon,
    a_cazaTiempo:q.huntingTime, a_cazaAnimales:q.huntedAnimals, a_cazaLugares:q.huntingPlaces, a_cazaEpoca:q.huntingSeason, a_cazaMotivos:q.huntingReasons, a_silvestresProblemas:q.wildProblems, a_silvestresQuePaso:q.wildProblemsDetail,
    a_rioUso:q.riverUse, a_rioParaQue:q.riverUseFor, a_rioSignificado:q.riverMeaning, a_rioProblemas:q.riverProblems, a_saberesLocales:q.localKnowledgeExists, a_saberesQuien:q.localKnowledgeWho, a_saberesUtilidad:q.localKnowledgeUseful,
    a_interestRumiants:q.rumiantInterest, a_interestRumiantsWhy:q.rumiantInterestWhy, a_hadRumiantsBefore:q.hadRumiantsBefore, a_noRumiantsWhy:q.noRumiantsReason, a_rumiantsAdvice:q.rumiantAdvice, a_rumiantsNeed:q.rumiantNeed,
    a_interestBirdsYes:q.birdsInterestYes, a_interestBirdsNo:q.birdsInterestNo });
  setSelectedOptions($('#a_animalesImportantes'), q.importantAnimals || []); renderQuestionnaireLists();
}

function bindAnimalsSection() {
  bindAnimalPhotos();
  $('#animalsProducerSelect')?.addEventListener('change', () => { state.selectedProducerId = $('#animalsProducerSelect').value || null; saveState(); renderProducerOptions(); });
  $('#a_save')?.addEventListener('click', saveAnimalGroup);
  $('#a_clear')?.addEventListener('click', resetAnimalGroupForm);
  $('#a_addDisease')?.addEventListener('click', () => addListItem('diseases', { date:$('#a_lastSick').value, animal:$('#a_enfAnimal').value, name:$('#a_commonDis').value.trim(), signs:$('#a_signs').value.trim(), treatment:$('#a_whenSickDo').value.trim() }, [['signos clínicos', $('#a_signs').value], ['animal o especie afectada', $('#a_enfAnimal').value]]));
  $('#a_addVax')?.addEventListener('click', () => addListItem('vaccines', { animal:$('#a_vaxAnimal').value, name:$('#a_vaxName').value.trim(), date:$('#a_vaxDate').value, who:$('#a_vaxWho').value, notes:$('#a_vaxNotes')?.value?.trim() || '' }, [['animal o especie', $('#a_vaxAnimal').value], ['vacuna', $('#a_vaxName').value]]));
  $('#a_addDeworm')?.addEventListener('click', () => addListItem('dewormings', { animal:$('#a_dewormAnimal').value, product:$('#a_dewormProd').value.trim(), date:$('#a_dewormDate').value, who:$('#a_dewormWho').value, changeProduct:$('#a_changeDewormProduct').value, recommendedBy:$('#a_recommendWho').value.trim() }, [['animal o especie', $('#a_dewormAnimal').value], ['producto', $('#a_dewormProd').value]]));
  $('#a_addTrad')?.addEventListener('click', () => addListItem('traditional', { name:$('#a_tradNombre').value.trim(), type:$('#a_tradTipo').value, use:$('#a_tradUso').value.trim(), part:$('#a_tradParte').value.trim() }, [['nombre', $('#a_tradNombre').value]]));
  $('#a_addGenderAnimal')?.addEventListener('click', () => addListItem('genderAnimals', { animal:$('#a_genderAnimal').value, sex:$('#a_genderAnimalWho').value, why:$('#a_genderAnimalWhy').value.trim() }, [['animal', $('#a_genderAnimal').value], ['quién lo cuida', $('#a_genderAnimalWho').value]]));
  $('#a_addGeneroActividad')?.addEventListener('click', () => addListItem('genderActivities', { activity:$('#a_actividadGenero').value.trim(), sex:$('#a_actividadGeneroSexo').value, why:$('#a_actividadGeneroRazon').value.trim() }, [['actividad', $('#a_actividadGenero').value], ['quién la hace', $('#a_actividadGeneroSexo').value]]));
  $('#btnSaveAnimalsFull')?.addEventListener('click', saveQuestionnaire);
}

function medFieldIds() {
  return ['m_brand','m_active','m_owner','m_presentation','m_cost','m_expiry','m_totalQty','m_unit','m_unitCost','m_vaxBrand','m_vaxExpiry','m_vaxPrice','m_vaxCoverageAnimals','m_vaxDiseases','m_use','m_mech','m_adverse','m_preg','m_pk','m_overdose','m_interactions','m_dosing'];
}
function calcMedUnitCost() { const total = Number($('#m_totalQty').value || 0); const cost = Number($('#m_cost').value || 0); $('#m_unitCost').value = total > 0 && cost > 0 ? (cost/total).toFixed(2) : ''; }
function renderMedPhotos() { setThumb('m_rx_preview', state.media.medRxPhoto, 'Sin<br/>receta'); setThumb('m_tk_preview', state.media.medTicketPhoto, 'Sin<br/>ticket'); }
function bindMedPhotos() {
  [['m_btnRxTake','m_rx_take','medRxPhoto'],['m_btnRxPick','m_rx_pick','medRxPhoto'],['m_btnTkTake','m_tk_take','medTicketPhoto'],['m_btnTkPick','m_tk_pick','medTicketPhoto']].forEach(([btn,input,key]) => {
    $('#'+btn)?.addEventListener('click', () => $('#'+input).click());
    $('#'+input)?.addEventListener('change', async e => { const f=e.target.files?.[0]; if (!f) return; state.media[key] = await fileToBase64(f); renderMedPhotos(); e.target.value=''; });
  });
  $('#m_btnRxRemove')?.addEventListener('click', ()=>{ state.media.medRxPhoto=null; renderMedPhotos(); });
  $('#m_btnTkRemove')?.addEventListener('click', ()=>{ state.media.medTicketPhoto=null; renderMedPhotos(); });
}
function collectMed() {
  const old = state.editing.medId ? state.meds.find(m => m.id === state.editing.medId) : null;
  return { id: old?.id || uid(), createdAt: old?.createdAt || nowText(), updatedAt: nowText(), mode: state.ui.medMode, fields: collectFields(medFieldIds()), rxPhoto: state.media.medRxPhoto || old?.rxPhoto || null, ticketPhoto: state.media.medTicketPhoto || old?.ticketPhoto || null };
}
function resetMedForm() { state.editing.medId = null; $('#medForm').reset(); state.media.medRxPhoto = null; state.media.medTicketPhoto = null; renderMedPhotos(); }
function saveMed(e) { e.preventDefault(); const item = collectMed(); if (!item.fields.m_brand || !item.fields.m_active) return showMessage('m_err', 'Marca y activo son obligatorios.', 'error'); const idx = state.meds.findIndex(m => m.id === item.id); if (idx>=0) state.meds[idx]=item; else state.meds.unshift(item); saveState(); resetMedForm(); renderMedList(); renderProcedureFormSupport(); showMessage('m_ok', 'Medicamento guardado.', 'success'); }
function renderMedList() {
  const q = ($('#m_search').value || '').toLowerCase(); const items = state.meds.filter(m => [m.fields.m_brand,m.fields.m_active,m.fields.m_vaxBrand].join(' ').toLowerCase().includes(q)); $('#m_count').textContent = items.length; const list=$('#m_list'); list.innerHTML='';
  if (!items.length) return list.innerHTML='<div class="empty-state">No hay medicamentos registrados.</div>';
  items.forEach(m => { const div=document.createElement('div'); div.className='item'; div.innerHTML=`<h3>${escapeHtml(m.fields.m_brand)} · ${escapeHtml(m.fields.m_active)}</h3><div class="meta">Dueño: ${escapeHtml(m.fields.m_owner)} · Existencia: ${escapeHtml(m.fields.m_totalQty)} ${escapeHtml(m.fields.m_unit)}</div><div class="kv"><div class="line"><b>Uso:</b> ${escapeHtml(m.fields.m_use)}</div><div class="line"><b>Vacuna separada:</b> ${escapeHtml(m.fields.m_vaxBrand || 'Sin vacuna capturada')}</div></div><div class="actions" style="margin-top:12px;"><button class="btn small ghost" data-a="edit" type="button">✏️ Editar</button><button class="btn small bad" data-a="delete" type="button">🗑️ Eliminar</button></div>`;
    div.querySelector('[data-a="edit"]').onclick=()=>{ state.editing.medId=m.id; fillFields(m.fields); state.media.medRxPhoto=m.rxPhoto; state.media.medTicketPhoto=m.ticketPhoto; renderMedPhotos(); };
    div.querySelector('[data-a="delete"]').onclick=()=>{ state.meds=state.meds.filter(x=>x.id!==m.id); saveState(); renderMedList(); renderProcedureFormSupport(); };
    list.appendChild(div); });
}
function bindMeds() {
  bindMedPhotos(); calcMedUnitCost(); $('#m_totalQty')?.addEventListener('input', calcMedUnitCost); $('#m_cost')?.addEventListener('input', calcMedUnitCost); $('#medForm')?.addEventListener('submit', saveMed); $('#m_btnClear')?.addEventListener('click', resetMedForm); $('#m_search')?.addEventListener('input', renderMedList);
  $('#m_modeManual')?.addEventListener('click', ()=>{ state.ui.medMode='MANUAL'; saveState(); }); $('#m_modeChatGPT')?.addEventListener('click', ()=>{ state.ui.medMode='CHATGPT'; saveState(); });
  $('#m_btnExport')?.addEventListener('click', ()=>downloadFile('medicamentos.json', JSON.stringify(state.meds,null,2), 'application/json')); $('#m_btnExportExcel')?.addEventListener('click', ()=>downloadFile('medicamentos.csv', rowsToCsv([['Marca','Activo','Dueño','Cantidad','Unidad','Vacuna'], ...state.meds.map(m => [m.fields.m_brand,m.fields.m_active,m.fields.m_owner,m.fields.m_totalQty,m.fields.m_unit,m.fields.m_vaxBrand])]), 'text/csv;charset=utf-8'));
  $('#m_btnImport')?.addEventListener('click', ()=>$('#m_importFile').click()); $('#m_importFile')?.addEventListener('change', e => { const f=e.target.files?.[0]; if (!f) return; const fr=new FileReader(); fr.onload=()=>{ state.meds = JSON.parse(fr.result); saveState(); renderMedList(); renderProcedureFormSupport(); }; fr.readAsText(f); e.target.value=''; });
}

function supplyFieldIds() { return ['s_name','s_acquired','s_presentation','s_qty','s_price','s_unitCost','s_costAcq','s_lifeMonths','s_estimatedUses','s_costMonth','s_costUse','s_notes']; }
function calcSupplyCosts() {
  const qty=Number($('#s_qty').value||0), price=Number($('#s_price').value||0), life=Number($('#s_lifeMonths').value||0), acq=Number($('#s_costAcq').value||0), uses=Number($('#s_estimatedUses').value||0);
  $('#s_unitCost').value = qty > 0 && price > 0 ? (price/qty).toFixed(2) : '';
  $('#s_costMonth').value = life > 0 && acq > 0 ? (acq/life).toFixed(2) : '';
  $('#s_costUse').value = uses > 0 && acq > 0 ? (acq/uses).toFixed(2) : '';
}
function bindSupplyPhotos() {
  $('#s_btnTkTake')?.addEventListener('click', ()=>$('#s_tk_take').click()); $('#s_btnTkPick')?.addEventListener('click', ()=>$('#s_tk_pick').click());
  $('#s_tk_take')?.addEventListener('change', async e => { const f=e.target.files?.[0]; if (!f) return; state.media.supplyTicketPhoto = await fileToBase64(f); setThumb('s_tk_preview', state.media.supplyTicketPhoto, 'Sin<br/>ticket'); e.target.value=''; });
  $('#s_tk_pick')?.addEventListener('change', async e => { const f=e.target.files?.[0]; if (!f) return; state.media.supplyTicketPhoto = await fileToBase64(f); setThumb('s_tk_preview', state.media.supplyTicketPhoto, 'Sin<br/>ticket'); e.target.value=''; });
  $('#s_btnTkRemove')?.addEventListener('click', ()=>{ state.media.supplyTicketPhoto=null; setThumb('s_tk_preview', null, 'Sin<br/>ticket'); });
}
function collectSupply() { const old = state.editing.supplyId ? state.supplies.find(s => s.id === state.editing.supplyId) : null; return { id: old?.id || uid(), createdAt: old?.createdAt || nowText(), updatedAt: nowText(), mode: state.ui.supplyMode, fields: collectFields(supplyFieldIds()), ticketPhoto: state.media.supplyTicketPhoto || old?.ticketPhoto || null }; }
function resetSupplyForm() { state.editing.supplyId = null; $('#supplyForm').reset(); state.media.supplyTicketPhoto = null; setThumb('s_tk_preview', null, 'Sin<br/>ticket'); calcSupplyCosts(); }
function saveSupply(e) { e.preventDefault(); const item = collectSupply(); if (!item.fields.s_name) return showMessage('s_err','Nombre obligatorio.','error'); const idx=state.supplies.findIndex(s=>s.id===item.id); if (idx>=0) state.supplies[idx]=item; else state.supplies.unshift(item); saveState(); resetSupplyForm(); renderSupplyList(); renderProcedureFormSupport(); showMessage('s_ok','Insumo guardado.','success'); }
function renderSupplyList() {
  const q=($('#s_search').value||'').toLowerCase(); const items=state.supplies.filter(s => (s.fields.s_name||'').toLowerCase().includes(q)); $('#s_count').textContent=items.length; const list=$('#s_list'); list.innerHTML='';
  if (!items.length) return list.innerHTML='<div class="empty-state">No hay insumos registrados.</div>';
  items.forEach(s => { const div=document.createElement('div'); div.className='item'; div.innerHTML=`<h3>${escapeHtml(s.fields.s_name)}</h3><div class="meta">Modo: ${escapeHtml(s.mode)} · Costo unitario: ${s.fields.s_unitCost ? money(s.fields.s_unitCost) : 'Sin calcular'}</div><div class="kv"><div class="line"><b>Presentación:</b> ${escapeHtml(s.fields.s_presentation)}</div><div class="line"><b>Cantidad:</b> ${escapeHtml(s.fields.s_qty)}</div><div class="line"><b>Notas:</b> ${escapeHtml(s.fields.s_notes)}</div></div><div class="actions" style="margin-top:12px;"><button class="btn small ghost" data-a="edit" type="button">✏️ Editar</button><button class="btn small bad" data-a="delete" type="button">🗑️ Eliminar</button></div>`;
    div.querySelector('[data-a="edit"]').onclick=()=>{ state.editing.supplyId=s.id; fillFields(s.fields); state.media.supplyTicketPhoto=s.ticketPhoto; setThumb('s_tk_preview', s.ticketPhoto, 'Sin<br/>ticket'); calcSupplyCosts(); };
    div.querySelector('[data-a="delete"]').onclick=()=>{ state.supplies=state.supplies.filter(x=>x.id!==s.id); saveState(); renderSupplyList(); renderProcedureFormSupport(); };
    list.appendChild(div); });
}
function bindSupplies() {
  bindSupplyPhotos(); ['s_qty','s_price','s_costAcq','s_lifeMonths','s_estimatedUses'].forEach(id => $('#'+id)?.addEventListener('input', calcSupplyCosts)); calcSupplyCosts(); $('#supplyForm')?.addEventListener('submit', saveSupply); $('#s_btnClear')?.addEventListener('click', resetSupplyForm); $('#s_search')?.addEventListener('input', renderSupplyList);
  $('#s_modeDisposable')?.addEventListener('click', ()=>{ state.ui.supplyMode='DISPOSABLE'; saveState(); }); $('#s_modeNonDisposable')?.addEventListener('click', ()=>{ state.ui.supplyMode='NON_DISPOSABLE'; saveState(); });
  $('#s_btnExport')?.addEventListener('click', ()=>downloadFile('insumos.json', JSON.stringify(state.supplies,null,2), 'application/json')); $('#s_btnExportExcel')?.addEventListener('click', ()=>downloadFile('insumos.csv', rowsToCsv([['Nombre','Modo','Cantidad','Costo unitario'], ...state.supplies.map(s => [s.fields.s_name,s.mode,s.fields.s_qty,s.fields.s_unitCost])]), 'text/csv;charset=utf-8'));
  $('#s_btnImport')?.addEventListener('click', ()=>$('#s_importFile').click()); $('#s_importFile')?.addEventListener('change', e => { const f=e.target.files?.[0]; if (!f) return; const fr=new FileReader(); fr.onload=()=>{ state.supplies=JSON.parse(fr.result); saveState(); renderSupplyList(); renderProcedureFormSupport(); }; fr.readAsText(f); e.target.value=''; });
}

function renderProcedureMedia() {
  $('#p_cc_hint').textContent = state.media.procedureCasePhotos.length ? `${state.media.procedureCasePhotos.length} foto(s) cargada(s).` : 'Sin fotos todavía.';
  $('#p_nec_hint').textContent = state.media.procedureNecropsyPhotos.length ? `${state.media.procedureNecropsyPhotos.length} foto(s) cargada(s).` : 'Sin fotos todavía.';
  renderMultiPreview('p_cc_preview', state.media.procedureCasePhotos, i => { state.media.procedureCasePhotos.splice(i,1); renderProcedureMedia(); });
  renderMultiPreview('p_nec_preview', state.media.procedureNecropsyPhotos, i => { state.media.procedureNecropsyPhotos.splice(i,1); renderProcedureMedia(); });
  setThumb('p_charge_preview', state.media.procedureChargePhoto, 'Sin<br/>foto');
}
function bindProcedureMedia() {
  [['p_cc_btnTake','p_cc_take','procedureCasePhotos'],['p_cc_btnPick','p_cc_pick','procedureCasePhotos'],['p_nec_btnTake','p_nec_take','procedureNecropsyPhotos'],['p_nec_btnPick','p_nec_pick','procedureNecropsyPhotos']].forEach(([btn,input,key]) => {
    $('#'+btn)?.addEventListener('click', ()=>$('#'+input).click());
    $('#'+input)?.addEventListener('change', async e => { for (const file of Array.from(e.target.files||[])) state.media[key].push(await fileToBase64(file)); renderProcedureMedia(); e.target.value=''; });
  });
  $('#p_cc_btnClear')?.addEventListener('click', ()=>{ state.media.procedureCasePhotos=[]; renderProcedureMedia(); }); $('#p_nec_btnClear')?.addEventListener('click', ()=>{ state.media.procedureNecropsyPhotos=[]; renderProcedureMedia(); });
  $('#p_charge_btnTake')?.addEventListener('click', ()=>$('#p_charge_take').click()); $('#p_charge_btnPick')?.addEventListener('click', ()=>$('#p_charge_pick').click());
  $('#p_charge_take')?.addEventListener('change', async e => { const f=e.target.files?.[0]; if (!f) return; state.media.procedureChargePhoto=await fileToBase64(f); renderProcedureMedia(); e.target.value=''; });
  $('#p_charge_pick')?.addEventListener('change', async e => { const f=e.target.files?.[0]; if (!f) return; state.media.procedureChargePhoto=await fileToBase64(f); renderProcedureMedia(); e.target.value=''; });
  $('#p_charge_btnClear')?.addEventListener('click', ()=>{ state.media.procedureChargePhoto=null; renderProcedureMedia(); });
}

function renderProcedureFormSupport() {
  const prod = getProducerById($('#p_producer')?.value || state.selectedProducerId);
  const groupSel = $('#p_animalGroup'); if (groupSel) { const current = groupSel.value; groupSel.innerHTML='<option value="">— Selecciona —</option>'; (prod?.animals || []).forEach(a => groupSel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(a.species)}">${escapeHtml(a.species)}</option>`)); groupSel.value = current; }
  const medSel = $('#p_medSelect'); if (medSel) { const cur=medSel.value; medSel.innerHTML='<option value="">— Selecciona —</option>'; state.meds.forEach(m => medSel.insertAdjacentHTML('beforeend', `<option value="${m.id}">${escapeHtml(m.fields.m_brand)} · ${escapeHtml(m.fields.m_active)}</option>`)); medSel.value = cur; }
  const vaxSel = $('#p_vaccineSelect'); if (vaxSel) { const cur=vaxSel.value; vaxSel.innerHTML='<option value="">— Selecciona —</option>'; state.meds.filter(m => m.fields.m_vaxBrand).forEach(m => vaxSel.insertAdjacentHTML('beforeend', `<option value="${m.id}">${escapeHtml(m.fields.m_vaxBrand)} · ${escapeHtml(m.fields.m_vaxDiseases || '')}</option>`)); vaxSel.value = cur; }
  const sSel = $('#p_supplySelect'); if (sSel) { const cur=sSel.value; sSel.innerHTML='<option value="">— Selecciona —</option>'; state.supplies.forEach(s => sSel.insertAdjacentHTML('beforeend', `<option value="${s.id}">${escapeHtml(s.fields.s_name)}</option>`)); sSel.value = cur; }
}

function recalcProcedureCharges() {
  const medTotal = state.workingProcedure.medUses.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const vaxTotal = state.workingProcedure.vaccineUses.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const supplyTotal = state.workingProcedure.supplyUses.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const procedureAmount = Number($('#p_costTotal').value || 0);
  const total = procedureAmount + medTotal + vaxTotal + supplyTotal;
  $('#p_chargeCalculated').value = total.toFixed(2);
  return { procedureAmount, medTotal, vaxTotal, supplyTotal, total };
}

function renderProcedureUses() {
  renderCollection('p_medUseList', state.workingProcedure.medUses, i => escapeHtml(i.label), i => [`<b>Dosis:</b> ${escapeHtml(i.dose)} ${escapeHtml(i.unit)}`, `<b>Costo:</b> ${money(i.cost)}`], i => { state.workingProcedure.medUses = state.workingProcedure.medUses.filter(x => x.id !== i.id); $('#p_medSelect').value = i.medId; $('#p_medDoseKg').value = i.dose; $('#p_medUnitUsed').value = i.unit; renderProcedureUses(); }, id => { state.workingProcedure.medUses = state.workingProcedure.medUses.filter(x => x.id !== id); renderProcedureUses(); }, 'Sin medicamentos agregados.');
  renderCollection('p_vaccineUseList', state.workingProcedure.vaccineUses, i => escapeHtml(i.label), i => [`<b>Animales:</b> ${escapeHtml(i.animalsApplied)}`, `<b>Notas:</b> ${escapeHtml(i.notes)}`, `<b>Costo:</b> ${money(i.cost)}`], i => { state.workingProcedure.vaccineUses = state.workingProcedure.vaccineUses.filter(x => x.id !== i.id); $('#p_vaccineSelect').value = i.medId; $('#p_vaccineAnimalsApplied').value = i.animalsApplied; $('#p_vaccineNotes').value = i.notes; renderProcedureUses(); }, id => { state.workingProcedure.vaccineUses = state.workingProcedure.vaccineUses.filter(x => x.id !== id); renderProcedureUses(); }, 'Sin vacunas agregadas.');
  renderCollection('p_supplyUseList', state.workingProcedure.supplyUses, i => escapeHtml(i.label), i => [`<b>Cantidad:</b> ${escapeHtml(i.qty)}`, `<b>Notas:</b> ${escapeHtml(i.notes)}`, `<b>Costo:</b> ${money(i.cost)}`], i => { state.workingProcedure.supplyUses = state.workingProcedure.supplyUses.filter(x => x.id !== i.id); $('#p_supplySelect').value = i.supplyId; $('#p_supplyQtyUsed').value = i.qty; $('#p_supplyNotes').value = i.notes; renderProcedureUses(); }, id => { state.workingProcedure.supplyUses = state.workingProcedure.supplyUses.filter(x => x.id !== id); renderProcedureUses(); }, 'Sin insumos agregados.');
  recalcProcedureCharges();
}

function addProcedureMedUse() {
  const med = state.meds.find(m => m.id === $('#p_medSelect').value); if (!med) return;
  const dose = Number($('#p_medDoseKg').value || 0); const unit = $('#p_medUnitUsed').value.trim(); const unitCost = Number(med.fields.m_unitCost || 0);
  state.workingProcedure.medUses.push({ id: uid(), medId: med.id, label: `${med.fields.m_brand} · ${med.fields.m_active}`, dose, unit, cost: dose * unitCost });
  renderProcedureUses(); fillFields({ p_medSelect:'', p_medDoseKg:'', p_medUnitUsed:'' });
}
function addProcedureVaccineUse() {
  const med = state.meds.find(m => m.id === $('#p_vaccineSelect').value); if (!med) return; const applied = Number($('#p_vaccineAnimalsApplied').value || 0); const price = Number(med.fields.m_vaxPrice || 0);
  state.workingProcedure.vaccineUses.push({ id: uid(), medId: med.id, label: med.fields.m_vaxBrand, animalsApplied: applied, notes: $('#p_vaccineNotes').value.trim(), cost: applied * price });
  renderProcedureUses(); fillFields({ p_vaccineSelect:'', p_vaccineAnimalsApplied:'', p_vaccineNotes:'' });
}
function addProcedureSupplyUse() {
  const supply = state.supplies.find(s => s.id === $('#p_supplySelect').value); if (!supply) return; const qty = Number($('#p_supplyQtyUsed').value || 0); const unitCost = Number(supply.fields.s_unitCost || 0);
  state.workingProcedure.supplyUses.push({ id: uid(), supplyId: supply.id, label: supply.fields.s_name, qty, notes: $('#p_supplyNotes').value.trim(), cost: qty * unitCost });
  renderProcedureUses(); fillFields({ p_supplySelect:'', p_supplyQtyUsed:'', p_supplyNotes:'' });
}

function procedureFieldIds() {
  return ['p_date','p_type','p_place','p_costTotal','p_producer','p_animalGroup','p_animalsQtyUsed','p_identification','p_weight','p_temperature','p_generalState','p_notes','p_cc_reason','p_cc_anamnesis','p_cc_bodyCondition','p_cc_mucosa','p_cc_tllc','p_cc_hydration','p_cc_fc','p_cc_fr','p_cc_temp','p_cc_weight2','p_cc_exam','p_cc_presumptiveDx','p_cc_treatment','p_cc_recommendations','p_cc_followup','p_nec_idAnimal','p_nec_species','p_nec_breed','p_nec_sex','p_nec_age','p_nec_sterilized','p_nec_color','p_nec_weight','p_nec_birthDate','p_nec_deathDate','p_nec_timeDeathNec','p_nec_sender','p_nec_caseNumber','p_nec_clinicalDx','p_nec_additionalData','p_nec_externalInspection','p_nec_primaryIncision','p_nec_secondaryIncision','p_nec_organExtraction','p_nec_respiratory','p_nec_heart','p_nec_spleen','p_nec_kidneys','p_nec_stomach','p_nec_preliminaryReport','p_nec_morphDx','p_nec_finalDx','p_nec_comments','p_nec_biblioSummary','p_nec_bibliography','p_chargeCalculated','p_chargeManual','p_chargeReason'];
}

function resetProcedureForm() {
  state.editing.procedureId = null; $('#procedureForm').reset(); state.media.procedureCasePhotos=[]; state.media.procedureNecropsyPhotos=[]; state.media.procedureChargePhoto=null; state.workingProcedure={ medUses:[], vaccineUses:[], supplyUses:[] }; renderProcedureMedia(); renderProcedureUses(); renderProcedureFormSupport();
}

function decrementAnimalIfNecropsy(record) {
  if (record.fields.p_type !== 'NECROPSIA') return;
  const prod = getProducerById(record.fields.p_producer); const animal = prod?.animals?.find(a => a.species === record.fields.p_animalGroup); if (!animal) return;
  animal.quantity = Math.max(0, Number(animal.quantity || 0) - 1);
}

function collectProcedure() {
  const old = state.editing.procedureId ? state.procedures.find(p => p.id === state.editing.procedureId) : null; const breakdown = recalcProcedureCharges();
  return { id: old?.id || uid(), createdAt: old?.createdAt || nowText(), updatedAt: nowText(), fields: collectFields(procedureFieldIds()), medUses:[...state.workingProcedure.medUses], vaccineUses:[...state.workingProcedure.vaccineUses], supplyUses:[...state.workingProcedure.supplyUses], casePhotos:[...state.media.procedureCasePhotos], necropsyPhotos:[...state.media.procedureNecropsyPhotos], chargePhoto: state.media.procedureChargePhoto || null, breakdown };
}

function saveProcedure(e) {
  e.preventDefault();
  const item = collectProcedure();
  if (!item.fields.p_type || !item.fields.p_producer) return showMessage('p_msg','Tipo y productor(a) son obligatorios.','error');
  const idx = state.procedures.findIndex(p => p.id === item.id); if (idx>=0) state.procedures[idx]=item; else state.procedures.unshift(item);
  decrementAnimalIfNecropsy(item); saveState(); renderProcedureList(); renderProducerList(); renderProducerOptions(); resetProcedureForm(); showMessage('p_msg','Procedimiento guardado.', 'success');
}

function procedureWordHtml(p) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:11pt}ul{margin-left:18px}</style></head><body><h1>Procedimiento</h1><p><b>Fecha:</b> ${escapeHtml(p.fields.p_date)}</p><p><b>Tipo:</b> ${escapeHtml(p.fields.p_type)}</p><p><b>Productor:</b> ${escapeHtml(getProducerById(p.fields.p_producer)?.basic?.name || '')}</p><p><b>Animal/grupo:</b> ${escapeHtml(p.fields.p_animalGroup)}</p><p><b>Notas:</b> ${escapeHtml(p.fields.p_notes)}</p><h2>Medicamentos</h2><ul>${p.medUses.map(i=>`<li>${escapeHtml(i.label)} · dosis ${escapeHtml(i.dose)} ${escapeHtml(i.unit)} · ${money(i.cost)}</li>`).join('') || '<li>Sin medicamentos.</li>'}</ul><h2>Vacunas</h2><ul>${p.vaccineUses.map(i=>`<li>${escapeHtml(i.label)} · animales ${escapeHtml(i.animalsApplied)} · ${money(i.cost)}</li>`).join('') || '<li>Sin vacunas.</li>'}</ul><h2>Insumos</h2><ul>${p.supplyUses.map(i=>`<li>${escapeHtml(i.label)} · cantidad ${escapeHtml(i.qty)} · ${money(i.cost)}</li>`).join('') || '<li>Sin insumos.</li>'}</ul><h2>Cobro</h2><ul><li>Procedimiento: ${money(p.breakdown.procedureAmount)}</li><li>Medicamentos: ${money(p.breakdown.medTotal)}</li><li>Vacunas: ${money(p.breakdown.vaxTotal)}</li><li>Insumos: ${money(p.breakdown.supplyTotal)}</li><li>Total: ${money(p.breakdown.total)}</li></ul></body></html>`;
}

function renderProcedureList() {
  const q=($('#p_search').value||'').toLowerCase(); const items=state.procedures.filter(p => [p.fields.p_type,p.fields.p_place,p.fields.p_animalGroup].join(' ').toLowerCase().includes(q)); $('#p_count').textContent = items.length; const list=$('#p_list'); list.innerHTML='';
  if (!items.length) return list.innerHTML='<div class="empty-state">No hay procedimientos registrados.</div>';
  items.forEach(p => { const prod = getProducerById(p.fields.p_producer); const div=document.createElement('div'); div.className='item'; div.innerHTML=`<h3>${escapeHtml(p.fields.p_type)} · ${escapeHtml(prod?.basic?.name || '')}</h3><div class="meta">${escapeHtml(p.fields.p_date)} · ${escapeHtml(p.fields.p_animalGroup || '')}</div><div class="kv"><div class="line"><b>Cobro:</b> ${money(p.breakdown.total)}</div><div class="line"><b>Medicamentos:</b> ${p.medUses.length} · <b>Vacunas:</b> ${p.vaccineUses.length} · <b>Insumos:</b> ${p.supplyUses.length}</div></div><div class="actions" style="margin-top:12px;"><button class="btn small ghost" data-a="word" type="button">📄 Word</button><button class="btn small bad" data-a="delete" type="button">🗑️ Eliminar</button></div>`;
    div.querySelector('[data-a="word"]').onclick = () => openWord(procedureWordHtml(p), `procedimiento-${p.id}.doc`);
    div.querySelector('[data-a="delete"]').onclick = () => { state.procedures=state.procedures.filter(x=>x.id!==p.id); saveState(); renderProcedureList(); };
    list.appendChild(div); });
}

function bindProcedures() {
  bindProcedureMedia(); renderProcedureMedia(); renderProcedureUses();
  $('#p_producer')?.addEventListener('change', renderProcedureFormSupport); $('#p_costTotal')?.addEventListener('input', recalcProcedureCharges);
  $('#p_addMedUse')?.addEventListener('click', addProcedureMedUse); $('#p_addVaccineUse')?.addEventListener('click', addProcedureVaccineUse); $('#p_addSupplyUse')?.addEventListener('click', addProcedureSupplyUse);
  $('#procedureForm')?.addEventListener('submit', saveProcedure); $('#p_clear')?.addEventListener('click', resetProcedureForm); $('#p_search')?.addEventListener('input', renderProcedureList);
  $('#p_btnExportJson')?.addEventListener('click', ()=>downloadFile('procedimientos.json', JSON.stringify(state.procedures,null,2), 'application/json')); $('#p_btnImportJson')?.addEventListener('click', ()=>$('#p_importFile').click()); $('#p_importFile')?.addEventListener('change', e => { const f=e.target.files?.[0]; if (!f) return; const fr=new FileReader(); fr.onload=()=>{ state.procedures = JSON.parse(fr.result); saveState(); renderProcedureList(); }; fr.readAsText(f); e.target.value=''; }); $('#p_btnExportExcel')?.addEventListener('click', ()=>downloadFile('procedimientos.csv', rowsToCsv([['Fecha','Tipo','Productor','Animal/grupo','Total'], ...state.procedures.map(p => [p.fields.p_date,p.fields.p_type,getProducerById(p.fields.p_producer)?.basic?.name || '',p.fields.p_animalGroup,p.breakdown.total])]), 'text/csv;charset=utf-8')); $('#p_btnExportWord')?.addEventListener('click', ()=>{ const p=state.procedures[0]; if (p) openWord(procedureWordHtml(p), 'procedimientos.doc'); });
}

function injectHtmlFixes() {
  if ($('#m_vaxNotes')) return;
  $('#a_vaxList')?.insertAdjacentHTML('beforebegin', '<div class="grid cols-2"><div><label for="a_vaxNotes">Notas de vacunación</label><input id="a_vaxNotes"></div><div class="help bird-scale">Escala visible de aves: <b>1 = Nada</b> · <b>2 = Poco</b> · <b>3 = Regular</b> · <b>4 = Mucho</b></div></div>');
}

function init() {
  loadState(); injectHtmlFixes(); bindTabs(); bindProducerSection(); bindAnimalsSection(); bindMeds(); bindSupplies(); bindProcedures(); activateTab(state.ui.tab || 'producer'); renderProducerList(); renderProducerOptions(); renderMedPhotos(); renderMedList(); setThumb('s_tk_preview', null, 'Sin<br/>ticket'); renderSupplyList(); renderProcedureList(); resetProducerForm(); renderAnimalPhotos();
}

document.addEventListener('DOMContentLoaded', init);
