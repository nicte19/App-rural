const STORAGE_KEY = 'app_rural_green_v1';

const state = loadState();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function loadState() {
  try {
    return {
      producers: [],
      animals: [],
      meds: [],
      supplies: [],
      procedures: [],
      media: {
        producerPhoto: null,
        animalTempPhotos: [],
        medRxPhoto: null,
        medTicketPhoto: null,
        supplyTicketPhoto: null,
        procedureCasePhotos: [],
        procedureNecropsyPhotos: [],
        procedureChargePhoto: null,
      },
      editing: {},
      ui: { medMode: 'MANUAL', supplyMode: 'DISPOSABLE', tab: 'producer' },
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),
    };
  } catch {
    return {
      producers: [], animals: [], meds: [], supplies: [], procedures: [],
      media: { producerPhoto: null, animalTempPhotos: [], medRxPhoto: null, medTicketPhoto: null, supplyTicketPhoto: null, procedureCasePhotos: [], procedureNecropsyPhotos: [], procedureChargePhoto: null },
      editing: {}, ui: { medMode: 'MANUAL', supplyMode: 'DISPOSABLE', tab: 'producer' },
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showText(id, text, kind = 'help') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
  el.className = kind;
}

function clearMessages(prefixes) {
  prefixes.forEach((prefix) => {
    ['msg', 'err', 'ok'].forEach((suffix) => {
      const id = prefix ? `${prefix}_${suffix}` : suffix;
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.style.display = suffix === 'msg' ? 'block' : 'none';
      }
    });
  });
}

function serializeForm(form) {
  const data = {};
  const radioNames = new Set();
  form.querySelectorAll('input, select, textarea').forEach((field) => {
    const key = field.id || field.name;
    if (!key || field.type === 'file') return;
    if (field.type === 'radio') {
      if (radioNames.has(field.name)) return;
      radioNames.add(field.name);
      data[field.name] = form.querySelector(`input[name="${field.name}"]:checked`)?.value || '';
      return;
    }
    if (field.multiple) {
      data[key] = Array.from(field.selectedOptions).map((opt) => opt.value);
      return;
    }
    if (field.type === 'checkbox') {
      data[key] = field.checked;
      return;
    }
    data[key] = field.value ?? '';
  });
  return data;
}

function fillForm(form, data = {}) {
  form.querySelectorAll('input, select, textarea').forEach((field) => {
    const key = field.id || field.name;
    if (!key || field.type === 'file' || !(key in data) && !(field.name in data)) return;
    const value = data[key] ?? data[field.name];
    if (field.type === 'radio') {
      field.checked = field.value === value;
    } else if (field.multiple && Array.isArray(value)) {
      Array.from(field.options).forEach((opt) => { opt.selected = value.includes(opt.value); });
    } else if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = value ?? '';
    }
  });
}

function resetForm(form) {
  form.reset();
  form.querySelectorAll('select[multiple]').forEach((select) => Array.from(select.options).forEach((opt) => { opt.selected = false; }));
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function download(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setPreview(id, dataUrl, fallback = 'Sin imagen') {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="preview" />` : `<span>${fallback}</span>`;
}

function setPreviewList(id, images = [], emptyText = 'Sin fotos todavía.') {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!images.length) {
    wrap.innerHTML = `<div class="help">${emptyText}</div>`;
    return;
  }
  images.forEach((img, index) => {
    const div = document.createElement('div');
    div.className = 'preview-mini';
    div.innerHTML = `<img src="${img}" alt="foto ${index + 1}" />`;
    wrap.appendChild(div);
  });
}

function activateTab(tab) {
  state.ui.tab = tab;
  saveState();
  const map = {
    producer: ['tabProducer', 'pageProducer'],
    animals: ['tabAnimals', 'pageAnimals'],
    meds: ['tabMeds', 'pageMeds'],
    supplies: ['tabSupplies', 'pageSupplies'],
    procedures: ['tabProcedures', 'pageProcedures'],
  };
  Object.entries(map).forEach(([name, [tabId, pageId]]) => {
    document.getElementById(tabId)?.classList.toggle('active', name === tab);
    document.getElementById(pageId)?.classList.toggle('active', name === tab);
  });
}

function updateConditionalFields() {
  const indigena = $('#pertenenciaIndigena')?.value;
  $('#grupoIndigenaYoWrap').style.display = indigena === 'YO' ? 'block' : 'none';
  $('#grupoIndigenaFamiliarWrap').style.display = indigena === 'FAMILIAR' ? 'grid' : 'none';
  const lengua = $('#lenguaIndigenaTipo')?.value;
  $('#lenguaYoWrap').style.display = lengua === 'YO' ? 'block' : 'none';
  $('#lenguaFamiliarWrap').style.display = lengua === 'FAMILIAR' ? 'grid' : 'none';
}

function addFamilyRow(item = {}) {
  const tbody = $('#familyTbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="fam-name" value="${esc(item.name)}" /></td>
    <td><input class="fam-relation" value="${esc(item.relation)}" /></td>
    <td><input class="fam-occupation" value="${esc(item.occupation)}" /></td>
    <td><input class="fam-age" type="number" min="0" value="${esc(item.age)}" /></td>
    <td><button class="btn bad small fam-remove" type="button">✖</button></td>`;
  tr.querySelector('.fam-remove').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

function collectFamily() {
  return Array.from(document.querySelectorAll('#familyTbody tr')).map((row) => ({
    name: row.querySelector('.fam-name')?.value.trim() || '',
    relation: row.querySelector('.fam-relation')?.value.trim() || '',
    occupation: row.querySelector('.fam-occupation')?.value.trim() || '',
    age: row.querySelector('.fam-age')?.value.trim() || '',
  })).filter((item) => Object.values(item).some(Boolean));
}

function producerLabel(prod) {
  return prod.nombre || 'Productor sin nombre';
}

function saveProducer(event) {
  event.preventDefault();
  const form = $('#producerForm');
  const data = serializeForm(form);
  if (!data.nombre?.trim()) {
    showText('err', 'El nombre del productor es obligatorio.', 'error');
    return;
  }
  data.family = collectFamily();
  data.photo = state.media.producerPhoto;
  data.id = state.editing.producerId || uid();
  data.createdAt = new Date().toISOString();
  const idx = state.producers.findIndex((item) => item.id === data.id);
  if (idx >= 0) state.producers[idx] = { ...state.producers[idx], ...data };
  else state.producers.unshift(data);
  state.selectedProducerId = data.id;
  state.editing.producerId = null;
  saveState();
  renderAll();
  showText('ok', 'Productor guardado correctamente.', 'success');
  $('#btnCancelEdit').style.display = 'none';
}

function editProducer(id) {
  const prod = state.producers.find((item) => item.id === id);
  if (!prod) return;
  state.editing.producerId = id;
  fillForm($('#producerForm'), prod);
  $('#familyTbody').innerHTML = '';
  (prod.family || []).forEach(addFamilyRow);
  state.media.producerPhoto = prod.photo || null;
  setPreview('photoPreview', prod.photo, 'Sin<br/>foto');
  $('#btnCancelEdit').style.display = 'inline-flex';
  $('#formTitle').textContent = `Editando: ${producerLabel(prod)}`;
  updateConditionalFields();
  activateTab('producer');
}

function resetProducerForm() {
  state.editing.producerId = null;
  state.media.producerPhoto = null;
  resetForm($('#producerForm'));
  $('#familyTbody').innerHTML = '';
  setPreview('photoPreview', null, 'Sin<br/>foto');
  $('#formTitle').textContent = 'Nuevo productor(a)';
  $('#btnCancelEdit').style.display = 'none';
  updateConditionalFields();
  clearMessages(['']);
}

function deleteProducer(id) {
  state.producers = state.producers.filter((item) => item.id !== id);
  state.animals = state.animals.filter((item) => item.producerId !== id);
  if (state.selectedProducerId === id) state.selectedProducerId = null;
  saveState();
  renderAll();
}

function renderProducerList() {
  const list = $('#producerList');
  $('#count').textContent = String(state.producers.length);
  list.innerHTML = '';
  if (!state.producers.length) {
    list.innerHTML = '<div class="item"><div class="help">Todavía no hay productores guardados.</div></div>';
    return;
  }
  state.producers.forEach((prod) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <h3>${esc(producerLabel(prod))}</h3>
      <div class="meta">${esc([prod.localidad, prod.municipio, prod.estado].filter(Boolean).join(', ')) || 'Sin ubicación escrita'}</div>
      <div class="actions">
        <button class="btn small" type="button" data-action="select">Seleccionar</button>
        <button class="btn small ghost" type="button" data-action="edit">Editar</button>
        <button class="btn small ghost" type="button" data-action="animals">Animales</button>
        <button class="btn small ghost" type="button" data-action="word">Word</button>
        <button class="btn bad small" type="button" data-action="delete">Eliminar</button>
      </div>`;
    div.querySelector('[data-action="select"]').addEventListener('click', () => {
      state.selectedProducerId = prod.id;
      saveState();
      renderAnimalsProducerSelect();
      showText('msg', `${producerLabel(prod)} seleccionado para las demás secciones.`);
    });
    div.querySelector('[data-action="edit"]').addEventListener('click', () => editProducer(prod.id));
    div.querySelector('[data-action="animals"]').addEventListener('click', () => {
      state.selectedProducerId = prod.id;
      saveState();
      renderAnimalsProducerSelect();
      activateTab('animals');
    });
    div.querySelector('[data-action="word"]').addEventListener('click', () => exportSingleProducer(prod.id));
    div.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProducer(prod.id));
    list.appendChild(div);
  });
}

function exportSingleProducer(id) {
  const prod = state.producers.find((item) => item.id === id);
  if (!prod) return;
  const html = `<!doctype html><html><body><h1>${esc(producerLabel(prod))}</h1><p>${esc(JSON.stringify(prod, null, 2))}</p></body></html>`;
  download(`${producerLabel(prod).replace(/\s+/g, '_')}.doc`, html, 'application/msword');
}

function importJsonFile(input, cb) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      cb(JSON.parse(String(reader.result || '{}')));
    } catch {
      alert('El archivo JSON no es válido.');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function renderAnimalsProducerSelect() {
  const select = $('#animalsProducerSelect');
  if (!select) return;
  select.innerHTML = '<option value="">— Selecciona un productor —</option>';
  state.producers.forEach((prod) => {
    const opt = document.createElement('option');
    opt.value = prod.id;
    opt.textContent = producerLabel(prod);
    opt.selected = prod.id === state.selectedProducerId;
    select.appendChild(opt);
  });
  $('#animalsProducerHint').textContent = state.selectedProducerId ? `Trabajando con: ${producerLabel(state.producers.find((p) => p.id === state.selectedProducerId) || {})}` : 'Selecciona un productor para guardar sus animales.';
}

function syncAnimalOwnerOptions() {
  const selectIds = ['a_dueno', 'a_decideVenta', 'a_limpiaAlimenta', 'a_animalesImportantes'];
  const baseOptions = state.producers.map((prod) => ({ value: prod.id, label: producerLabel(prod) }));
  selectIds.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const selected = Array.from(select.selectedOptions).map((opt) => opt.value);
    select.innerHTML = '';
    baseOptions.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      opt.selected = selected.includes(value);
      select.appendChild(opt);
    });
  });
}


function syncProcedureOptions() {
  const producerSelect = $('#p_producer');
  if (producerSelect) {
    const current = producerSelect.value;
    producerSelect.innerHTML = '<option value=>— Selecciona —</option>';
    state.producers.forEach((prod) => {
      const opt = document.createElement('option');
      opt.value = prod.id;
      opt.textContent = producerLabel(prod);
      opt.selected = current === prod.id;
      producerSelect.appendChild(opt);
    });
  }
  const animalSelect = $('#p_animalGroup');
  if (animalSelect) {
    const current = animalSelect.value;
    animalSelect.innerHTML = '<option value=>— Selecciona —</option>';
    state.animals.forEach((animal) => {
      const opt = document.createElement('option');
      opt.value = animal.id;
      opt.textContent = `${animal.a_especie || 'Grupo'} · ${producerLabel(state.producers.find((p) => p.id === animal.producerId) || {})}`;
      opt.selected = current === animal.id;
      animalSelect.appendChild(opt);
    });
  }
  [['p_medSelect', state.meds, 'm_brand'], ['p_vaccineSelect', state.meds.filter((item) => item.m_vaxBrand), 'm_vaxBrand'], ['p_supplySelect', state.supplies, 's_name']].forEach(([id, items, field]) => {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value=>— Selecciona —</option>';
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item[field] || 'Registro';
      opt.selected = current === item.id;
      select.appendChild(opt);
    });
  });
}

function saveAnimalGroup() {
  const producerId = $('#animalsProducerSelect').value;
  if (!producerId) {
    showText('a_msg', 'Primero selecciona un productor.', 'error');
    return;
  }
  const data = serializeForm($('#animalForm'));
  if (!data.a_especie?.trim()) {
    showText('a_msg', 'La especie es obligatoria.', 'error');
    return;
  }
  const item = { ...data, id: state.editing.animalId || uid(), producerId, photos: [...state.media.animalTempPhotos] };
  const idx = state.animals.findIndex((entry) => entry.id === item.id);
  if (idx >= 0) state.animals[idx] = item; else state.animals.unshift(item);
  state.editing.animalId = null;
  state.media.animalTempPhotos = [];
  saveState();
  renderAnimals();
  renderAll();
  showText('a_msg', 'Grupo de animales guardado.', 'success');
}

function renderAnimals() {
  const list = $('#a_list');
  if (!list) return;
  const producerId = $('#animalsProducerSelect')?.value || state.selectedProducerId;
  const items = state.animals.filter((item) => !producerId || item.producerId === producerId);
  list.innerHTML = items.length ? '' : '<div class="item"><div class="help">No hay grupos de animales guardados.</div></div>';
  items.forEach((animal) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <h3>${esc(animal.a_especie || 'Grupo animal')}</h3>
      <div class="meta">Cantidad: ${esc(animal.a_cantidad || '0')} · Productor: ${esc(producerLabel(state.producers.find((p) => p.id === animal.producerId) || {}))}</div>
      <div class="actions">
        <button class="btn small ghost" type="button" data-action="edit">Editar</button>
        <button class="btn bad small" type="button" data-action="delete">Eliminar</button>
      </div>`;
    div.querySelector('[data-action="edit"]').addEventListener('click', () => {
      state.editing.animalId = animal.id;
      fillForm($('#animalForm'), animal);
      state.media.animalTempPhotos = [...(animal.photos || [])];
      setPreviewList('a_instPreview', state.media.animalTempPhotos);
      $('#a_instHint').textContent = `${state.media.animalTempPhotos.length} foto(s) cargada(s).`;
    });
    div.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.animals = state.animals.filter((entry) => entry.id !== animal.id);
      saveState();
      renderAnimals();
    });
    list.appendChild(div);
  });
}

function resetAnimalForm() {
  resetForm($('#animalForm'));
  state.editing.animalId = null;
  state.media.animalTempPhotos = [];
  setPreviewList('a_instPreview', []);
  $('#a_instHint').textContent = 'Sin fotos todavía.';
  showText('a_msg', 'Formulario de animales limpio.');
}

function genericCollectionHelpers(config) {
  const { key, formId, listId, countId, searchId, titleFields, msgId, okId, resetButtonId, exportButtonId, importButtonId, importInputId, exportMime = 'application/json', exportName, photoKeys = [] } = config;
  const form = document.getElementById(formId);
  const list = document.getElementById(listId);
  const count = document.getElementById(countId);

  function titleOf(item) {
    return titleFields.map((field) => item[field]).find((value) => value && String(value).trim()) || `${key} sin título`;
  }

  function render() {
    const search = document.getElementById(searchId)?.value.trim().toLowerCase() || '';
    const items = state[key].filter((item) => !search || JSON.stringify(item).toLowerCase().includes(search));
    count.textContent = String(state[key].length);
    list.innerHTML = items.length ? '' : `<div class="item"><div class="help">No hay registros en ${key}.</div></div>`;
    items.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <h3>${esc(titleOf(item))}</h3>
        <div class="meta">Actualizado: ${esc(item.updatedAt || item.createdAt || '')}</div>
        <div class="actions">
          <button class="btn small ghost" type="button" data-action="edit">Editar</button>
          <button class="btn bad small" type="button" data-action="delete">Eliminar</button>
        </div>`;
      div.querySelector('[data-action="edit"]').addEventListener('click', () => {
        state.editing[`${key}Id`] = item.id;
        fillForm(form, item);
        photoKeys.forEach(({ stateKey, previewId, multiple }) => {
          const value = item[stateKey] || (multiple ? [] : null);
          state.media[stateKey] = Array.isArray(value) ? [...value] : value;
          if (multiple) setPreviewList(previewId, state.media[stateKey]);
          else setPreview(previewId, state.media[stateKey], 'Sin imagen');
        });
        showText(msgId, `Editando ${titleOf(item)}.`);
      });
      div.querySelector('[data-action="delete"]').addEventListener('click', () => {
        state[key] = state[key].filter((entry) => entry.id !== item.id);
        saveState();
        render();
      });
      list.appendChild(div);
    });
  }

  function save() {
    const data = serializeForm(form);
    const item = { ...data, id: state.editing[`${key}Id`] || uid(), createdAt: new Date().toLocaleString('es-MX'), updatedAt: new Date().toLocaleString('es-MX') };
    photoKeys.forEach(({ stateKey }) => { item[stateKey] = state.media[stateKey]; });
    const idx = state[key].findIndex((entry) => entry.id === item.id);
    if (idx >= 0) state[key][idx] = { ...state[key][idx], ...item }; else state[key].unshift(item);
    state.editing[`${key}Id`] = null;
    saveState();
    render();
    showText(okId || msgId, `Registro guardado en ${key}.`, 'success');
  }

  document.getElementById(resetButtonId)?.addEventListener('click', () => {
    resetForm(form);
    state.editing[`${key}Id`] = null;
    photoKeys.forEach(({ stateKey, previewId, multiple }) => {
      state.media[stateKey] = multiple ? [] : null;
      if (multiple) setPreviewList(previewId, []);
      else setPreview(previewId, null, 'Sin imagen');
    });
    showText(msgId, `Formulario ${key} limpio.`);
  });

  document.getElementById(exportButtonId)?.addEventListener('click', () => {
    const payload = exportMime.includes('csv')
      ? state[key].map((item) => JSON.stringify(item)).join('\n')
      : JSON.stringify(state[key], null, 2);
    download(exportName, payload, exportMime);
  });

  document.getElementById(importButtonId)?.addEventListener('click', () => document.getElementById(importInputId)?.click());
  document.getElementById(importInputId)?.addEventListener('change', (e) => {
    importJsonFile(e.target, (data) => {
      state[key] = Array.isArray(data) ? data : [];
      saveState();
      render();
      showText(okId || msgId, `Importación de ${key} completada.`, 'success');
    });
  });

  document.getElementById(searchId)?.addEventListener('input', render);

  return { render, save, titleOf };
}

function bindPhotoInput(buttonId, inputId, stateKey, renderFn, multiple = false) {
  document.getElementById(buttonId)?.addEventListener('click', () => document.getElementById(inputId)?.click());
  document.getElementById(inputId)?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const values = await Promise.all(files.map(fileToBase64));
    state.media[stateKey] = multiple ? [...(state.media[stateKey] || []), ...values] : values[0];
    renderFn();
    saveState();
    e.target.value = '';
  });
}

function bindStaticButtons() {
  $('#tabProducer').addEventListener('click', () => activateTab('producer'));
  $('#tabAnimals').addEventListener('click', () => activateTab('animals'));
  $('#tabMeds').addEventListener('click', () => activateTab('meds'));
  $('#tabSupplies').addEventListener('click', () => activateTab('supplies'));
  $('#tabProcedures').addEventListener('click', () => activateTab('procedures'));
  $('#btnGoProducerFromAnimals').addEventListener('click', () => activateTab('producer'));

  $('#pertenenciaIndigena').addEventListener('change', updateConditionalFields);
  $('#lenguaIndigenaTipo').addEventListener('change', updateConditionalFields);
  $('#btnAddFamily').addEventListener('click', () => addFamilyRow());
  $$('#chipsClasificacion .chip').forEach((chip) => chip.addEventListener('click', () => {
    $$('#chipsClasificacion .chip').forEach((item) => { item.dataset.active = String(item === chip); });
    $('#alertaWrap').style.display = chip.dataset.value === 'NO_TRABAJAR' ? 'block' : 'none';
  }));
  $('#producerForm').addEventListener('submit', saveProducer);
  $('#btnReset').addEventListener('click', resetProducerForm);
  $('#btnCancelEdit').addEventListener('click', resetProducerForm);

  $('#btnGeo').addEventListener('click', () => {
    if (!navigator.geolocation) {
      showText('err', 'Tu navegador no permite geolocalización aquí.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      $('#lat').value = pos.coords.latitude.toFixed(6);
      $('#lng').value = pos.coords.longitude.toFixed(6);
      showText('ok', 'Ubicación cargada.', 'success');
    }, () => showText('err', 'No se pudo obtener la ubicación.', 'error'));
  });
  $('#btnGenMaps').addEventListener('click', () => {
    const lat = $('#lat').value.trim();
    const lng = $('#lng').value.trim();
    if (!lat || !lng) return showText('err', 'Captura latitud y longitud primero.', 'error');
    $('#mapsUrl').value = `https://maps.google.com/?q=${lat},${lng}`;
    showText('ok', 'Enlace de Google Maps generado.', 'success');
  });
  $('#btnOpenMaps').addEventListener('click', () => {
    const url = $('#mapsUrl').value.trim();
    if (url) window.open(url, '_blank', 'noopener');
  });
  $('#btnClearLocation').addEventListener('click', () => {
    ['lat', 'lng', 'mapsUrl'].forEach((id) => { document.getElementById(id).value = ''; });
    showText('msg', 'Ubicación limpiada.');
  });

  bindPhotoInput('btnTakePhoto', 'fotoTomar', 'producerPhoto', () => setPreview('photoPreview', state.media.producerPhoto, 'Sin<br/>foto'));
  bindPhotoInput('btnPickPhoto', 'fotoElegir', 'producerPhoto', () => setPreview('photoPreview', state.media.producerPhoto, 'Sin<br/>foto'));
  $('#btnRemovePhoto').addEventListener('click', () => {
    state.media.producerPhoto = null;
    setPreview('photoPreview', null, 'Sin<br/>foto');
  });

  $('#btnExport').addEventListener('click', () => download('productores.json', JSON.stringify(state.producers, null, 2)));
  $('#btnImport').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => importJsonFile(e.target, (data) => { state.producers = Array.isArray(data) ? data : []; saveState(); renderAll(); }));
  $('#btnExportWordProducer').addEventListener('click', () => download('productores.doc', `<!doctype html><html><body><pre>${esc(JSON.stringify(state.producers, null, 2))}</pre></body></html>`, 'application/msword'));
  $('#btnWipe').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  $('#animalsProducerSelect').addEventListener('change', (e) => {
    state.selectedProducerId = e.target.value || null;
    saveState();
    renderAnimalsProducerSelect();
    renderAnimals();
  });
  bindPhotoInput('a_btnInstTake', 'a_instTake', 'animalTempPhotos', () => {
    setPreviewList('a_instPreview', state.media.animalTempPhotos);
    $('#a_instHint').textContent = `${state.media.animalTempPhotos.length} foto(s) cargada(s).`;
  }, true);
  bindPhotoInput('a_btnInstPick', 'a_instPick', 'animalTempPhotos', () => {
    setPreviewList('a_instPreview', state.media.animalTempPhotos);
    $('#a_instHint').textContent = `${state.media.animalTempPhotos.length} foto(s) cargada(s).`;
  }, true);
  $('#a_btnInstClear').addEventListener('click', () => { state.media.animalTempPhotos = []; setPreviewList('a_instPreview', []); $('#a_instHint').textContent = 'Sin fotos todavía.'; });
  $('#a_save').addEventListener('click', saveAnimalGroup);
  $('#a_clear').addEventListener('click', resetAnimalForm);
  ['a_addDisease', 'a_addVax', 'a_addDeworm', 'a_addTrad', 'a_addGenderAnimal', 'a_addGeneroActividad'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => showText('a_msg', 'Puedes capturar esa información directamente en el formulario y luego guardar la sección completa.'));
  });
  $('#btnSaveAnimalsFull').addEventListener('click', () => { saveAnimalGroup(); showText('a_msg', 'Se guardó la sección de animales y cuestionario.', 'success'); });

  $('#m_modeManual').addEventListener('click', () => { state.ui.medMode = 'MANUAL'; $('#m_modeHint').textContent = 'Modo actual: ✍️ Manual'; saveState(); });
  $('#m_modeChatGPT').addEventListener('click', () => { state.ui.medMode = 'CHATGPT'; $('#m_modeHint').textContent = 'Modo actual: 🪄 ChatGPT'; saveState(); });
  $('#s_modeDisposable').addEventListener('click', () => { state.ui.supplyMode = 'DISPOSABLE'; $('#s_modeHint').textContent = 'Modo actual: 🧴 Desechables'; saveState(); });
  $('#s_modeNonDisposable').addEventListener('click', () => { state.ui.supplyMode = 'NON_DISPOSABLE'; $('#s_modeHint').textContent = 'Modo actual: 🔧 No desechables'; saveState(); });

  bindPhotoInput('m_btnRxTake', 'm_rx_take', 'medRxPhoto', () => setPreview('m_rx_preview', state.media.medRxPhoto, 'Sin<br/>receta'));
  bindPhotoInput('m_btnRxPick', 'm_rx_pick', 'medRxPhoto', () => setPreview('m_rx_preview', state.media.medRxPhoto, 'Sin<br/>receta'));
  bindPhotoInput('m_btnTkTake', 'm_tk_take', 'medTicketPhoto', () => setPreview('m_tk_preview', state.media.medTicketPhoto, 'Sin<br/>ticket'));
  bindPhotoInput('m_btnTkPick', 'm_tk_pick', 'medTicketPhoto', () => setPreview('m_tk_preview', state.media.medTicketPhoto, 'Sin<br/>ticket'));
  $('#m_btnRxRemove').addEventListener('click', () => { state.media.medRxPhoto = null; setPreview('m_rx_preview', null, 'Sin<br/>receta'); });
  $('#m_btnTkRemove').addEventListener('click', () => { state.media.medTicketPhoto = null; setPreview('m_tk_preview', null, 'Sin<br/>ticket'); });
  $('#ai_makePrompt').addEventListener('click', () => {
    const source = $('#ai_english').value.trim();
    $('#ai_prompt').value = source ? `Traduce y devuelve un JSON estructurado para este medicamento:\n\n${source}` : '';
    $('#ai_status').textContent = source ? 'Prompt generado.' : 'Pega primero un texto fuente.';
  });
  $('#ai_copyPrompt').addEventListener('click', async () => navigator.clipboard?.writeText($('#ai_prompt').value || ''));
  $('#ai_openChatGPT').addEventListener('click', () => window.open('https://chat.openai.com/', '_blank', 'noopener'));
  $('#ai_clearAll').addEventListener('click', () => ['ai_english', 'ai_prompt', 'ai_result'].forEach((id) => { document.getElementById(id).value = ''; }));
  $('#ai_fillFromJson').addEventListener('click', () => {
    try {
      const data = JSON.parse($('#ai_result').value || '{}');
      fillForm($('#medForm'), data);
      $('#ai_status').textContent = 'JSON aplicado al formulario.';
    } catch {
      $('#ai_status').textContent = 'El JSON pegado no es válido.';
    }
  });
  $('#ai_copyExample').addEventListener('click', async () => navigator.clipboard?.writeText(JSON.stringify({ m_brand: 'Ejemplo', m_active: 'Ingrediente activo' }, null, 2)));

  bindPhotoInput('s_btnTkTake', 's_tk_take', 'supplyTicketPhoto', () => setPreview('s_tk_preview', state.media.supplyTicketPhoto, 'Sin<br/>ticket'));
  bindPhotoInput('s_btnTkPick', 's_tk_pick', 'supplyTicketPhoto', () => setPreview('s_tk_preview', state.media.supplyTicketPhoto, 'Sin<br/>ticket'));
  $('#s_btnTkRemove').addEventListener('click', () => { state.media.supplyTicketPhoto = null; setPreview('s_tk_preview', null, 'Sin<br/>ticket'); });

  ['p_addMedUse', 'p_addVaccineUse', 'p_addSupplyUse'].forEach((id) => document.getElementById(id)?.addEventListener('click', () => showText('p_msg', 'Puedes registrar el detalle en los campos de texto y luego guardar el procedimiento.')));
  bindPhotoInput('p_cc_btnTake', 'p_cc_take', 'procedureCasePhotos', () => setPreviewList('p_cc_preview', state.media.procedureCasePhotos), true);
  bindPhotoInput('p_cc_btnPick', 'p_cc_pick', 'procedureCasePhotos', () => setPreviewList('p_cc_preview', state.media.procedureCasePhotos), true);
  bindPhotoInput('p_nec_btnTake', 'p_nec_take', 'procedureNecropsyPhotos', () => setPreviewList('p_nec_preview', state.media.procedureNecropsyPhotos), true);
  bindPhotoInput('p_nec_btnPick', 'p_nec_pick', 'procedureNecropsyPhotos', () => setPreviewList('p_nec_preview', state.media.procedureNecropsyPhotos), true);
  bindPhotoInput('p_charge_btnTake', 'p_charge_take', 'procedureChargePhoto', () => setPreview('p_charge_preview', state.media.procedureChargePhoto, 'Sin<br/>comprobante'));
  bindPhotoInput('p_charge_btnPick', 'p_charge_pick', 'procedureChargePhoto', () => setPreview('p_charge_preview', state.media.procedureChargePhoto, 'Sin<br/>comprobante'));
  $('#p_cc_btnClear').addEventListener('click', () => { state.media.procedureCasePhotos = []; setPreviewList('p_cc_preview', []); });
  $('#p_nec_btnClear').addEventListener('click', () => { state.media.procedureNecropsyPhotos = []; setPreviewList('p_nec_preview', []); });
  $('#p_charge_btnClear').addEventListener('click', () => { state.media.procedureChargePhoto = null; setPreview('p_charge_preview', null, 'Sin<br/>comprobante'); });
}

const medsHelper = genericCollectionHelpers({
  key: 'meds', formId: 'medForm', listId: 'm_list', countId: 'm_count', searchId: 'm_search', titleFields: ['m_brand', 'm_active'], msgId: 'm_msg', okId: 'm_ok', resetButtonId: 'm_btnClear', exportButtonId: 'm_btnExport', importButtonId: 'm_btnImport', importInputId: 'm_importFile', exportMime: 'text/csv', exportName: 'medicamentos.csv', photoKeys: [{ stateKey: 'medRxPhoto', previewId: 'm_rx_preview' }, { stateKey: 'medTicketPhoto', previewId: 'm_tk_preview' }],
});
const suppliesHelper = genericCollectionHelpers({
  key: 'supplies', formId: 'supplyForm', listId: 's_list', countId: 's_count', searchId: 's_search', titleFields: ['s_name'], msgId: 's_msg', okId: 's_ok', resetButtonId: 's_btnClear', exportButtonId: 's_btnExport', importButtonId: 's_btnImport', importInputId: 's_importFile', exportMime: 'text/csv', exportName: 'insumos.csv', photoKeys: [{ stateKey: 'supplyTicketPhoto', previewId: 's_tk_preview' }],
});
const proceduresHelper = genericCollectionHelpers({
  key: 'procedures', formId: 'procedureForm', listId: 'p_list', countId: 'p_count', searchId: 'p_search', titleFields: ['p_type', 'p_place', 'p_notes'], msgId: 'p_msg', okId: 'p_ok', resetButtonId: 'p_clear', exportButtonId: 'p_btnExportJson', importButtonId: 'p_btnImportJson', importInputId: 'p_importFile', exportName: 'procedimientos.json', photoKeys: [{ stateKey: 'procedureCasePhotos', previewId: 'p_cc_preview', multiple: true }, { stateKey: 'procedureNecropsyPhotos', previewId: 'p_nec_preview', multiple: true }, { stateKey: 'procedureChargePhoto', previewId: 'p_charge_preview' }],
});

function bindSaveButtons() {
  $('#medForm')?.addEventListener('submit', (e) => { e.preventDefault(); medsHelper.save(); });
  $('#supplyForm')?.addEventListener('submit', (e) => { e.preventDefault(); suppliesHelper.save(); });
  $('#procedureForm')?.addEventListener('submit', (e) => { e.preventDefault(); proceduresHelper.save(); });
  $('#p_btnExportWord')?.addEventListener('click', () => download('procedimientos.doc', `<!doctype html><html><body><pre>${esc(JSON.stringify(state.procedures, null, 2))}</pre></body></html>`, 'application/msword'));
  $('#m_btnExportExcel')?.addEventListener('click', () => download('medicamentos.xls', JSON.stringify(state.meds, null, 2), 'application/vnd.ms-excel'));
  $('#s_btnExportExcel')?.addEventListener('click', () => download('insumos.xls', JSON.stringify(state.supplies, null, 2), 'application/vnd.ms-excel'));
}

function renderAll() {
  updateConditionalFields();
  renderProducerList();
  renderAnimalsProducerSelect();
  syncAnimalOwnerOptions();
  renderAnimals();
  syncProcedureOptions();
  medsHelper.render();
  suppliesHelper.render();
  proceduresHelper.render();
  setPreview('photoPreview', state.media.producerPhoto, 'Sin<br/>foto');
  setPreviewList('a_instPreview', state.media.animalTempPhotos);
  setPreview('m_rx_preview', state.media.medRxPhoto, 'Sin<br/>receta');
  setPreview('m_tk_preview', state.media.medTicketPhoto, 'Sin<br/>ticket');
  setPreview('s_tk_preview', state.media.supplyTicketPhoto, 'Sin<br/>ticket');
  setPreviewList('p_cc_preview', state.media.procedureCasePhotos);
  setPreviewList('p_nec_preview', state.media.procedureNecropsyPhotos);
  setPreview('p_charge_preview', state.media.procedureChargePhoto, 'Sin<br/>comprobante');
  $('#m_modeHint').textContent = state.ui.medMode === 'CHATGPT' ? 'Modo actual: 🪄 ChatGPT' : 'Modo actual: ✍️ Manual';
  $('#s_modeHint').textContent = state.ui.supplyMode === 'NON_DISPOSABLE' ? 'Modo actual: 🔧 No desechables' : 'Modo actual: 🧴 Desechables';
  activateTab(state.ui.tab || 'producer');
}

bindStaticButtons();
bindSaveButtons();
if (!state.producers.length) addFamilyRow();
renderAll();
