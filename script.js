const STORAGE_KEY = 'app_rural_netlify_v1';

const state = {
  producers: [],
  selectedProducerId: null,
  editingProducerId: null,
  editingAnimalId: null,
  media: {
    producerPhoto: null,
    animalTempPhotos: []
  }
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const DAYS = [
  ['lun', 'Lunes'],
  ['mar', 'Martes'],
  ['mie', 'Miércoles'],
  ['jue', 'Jueves'],
  ['vie', 'Viernes'],
  ['sab', 'Sábado'],
  ['dom', 'Domingo']
];
const BIRD_KEYWORDS = ['gallina','gallo','pollo','pollos','guajolote','pavo','ave','aves','pato','patos','codorniz'];
const RUMINANT_KEYWORDS = ['borrego','borregos','oveja','ovejas','cabra','cabras','chivo','chivos'];

function uid(){ return `${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function safe(v){ return v == null ? '' : String(v); }
function escapeHtml(v){ return safe(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function show(el, on=true){ if(el) el.style.display = on ? '' : 'none'; }
function value(id){ return $(id)?.value?.trim?.() ?? ''; }
function selectedRadio(name){ return document.querySelector(`input[name="${name}"]:checked`)?.value || ''; }
function multiselectValues(el){ return Array.from(el?.selectedOptions || []).map(o => o.value).filter(Boolean); }
function setMulti(el, values){ const set = new Set(values || []); Array.from(el?.options || []).forEach(o => o.selected = set.has(o.value)); }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){ try{ Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }catch{} state.producers ||= []; state.media ||= {producerPhoto:null, animalTempPhotos:[]}; }
function producerById(id){ return state.producers.find(p => p.id === id) || null; }
function currentProducer(){ return producerById(state.selectedProducerId); }
function ensureQuestionnaire(prod){
  prod.animalQuestionnaire ||= {
    diseases: [], vaccines: [], dewormings: [], traditional: [], genderAnimals: [], genderActivities: [],
    importantAnimals: [], importantAnimalsWhy: '', hasMilpa: '', whatSows: '', forageShortage: '',
    vaccinatesAny: '', dewormsAny: '', changesDewormer: '', recommendedBy: '',
    healerExists: '', healerName: '', healerAge: '', healerGender: '', healerSpecies: '', healerSince: '', healerServices: '', healerIsVet: '', healerVetAdvice: '',
    practicesAny: '', practicesKinds: '', practicesWho: '',
    selectedPrograms: [], hasProgramFolio: '', programFolio: '', futureCalls: '',
    huntingCommon: '', huntingTime: '', huntedAnimals: '', huntingPlaces: '', huntingSeason: '', huntingReasons: '', wildProblems: '', wildProblemsDetail: '',
    riverUse: '', riverUseFor: '', riverMeaning: '', riverProblems: '',
    localKnowledgeExists: '', localKnowledgeWhat: '', localKnowledgeWho: '', localKnowledgeUseLevel: '',
    rumiantInterest: '', rumiantInterestWhy: '', hadRumiantsBefore: '', noRumiantsReason: '', rumiantAdvice: '', rumiantOthers: '', rumiantWomen: '', rumiantNeed: '',
    birdsInterestCurrent: '', birdsInterestStart: ''
  };
  return prod.animalQuestionnaire;
}

function hasBirds(prod){ return (prod?.animals || []).some(a => BIRD_KEYWORDS.some(k => safe(a.species).toLowerCase().includes(k))); }
function hasRuminants(prod){ return (prod?.animals || []).some(a => RUMINANT_KEYWORDS.some(k => safe(a.species).toLowerCase().includes(k))); }

function producerPeople(prod, includeVet=false){
  if(!prod) return [];
  const base = [];
  if(prod.basic?.name) base.push(`Productor(a): ${prod.basic.name}`);
  (prod.family || []).forEach(f => { if(f.name) base.push([f.name,f.relation].filter(Boolean).join(' - ')); });
  if(includeVet) base.push('Veterinario(a)');
  base.push('Otro');
  return [...new Set(base)];
}

function animalLabel(a){ return [a.species, a.race && `(${a.race})`, a.quantity && `x${a.quantity}`].filter(Boolean).join(' '); }
function setThumb(id, src, fallback='Sin<br>foto'){ const el=$(id); if(!el) return; el.innerHTML = src ? `<img src="${src}" alt="foto">` : `<span>${fallback}</span>`; }
async function fileToBase64(file){ return new Promise((res, rej)=>{ const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }

function activateTab(name){
  ['Producer','Animals','Meds','Supplies','Procedures'].forEach(key=>{
    $(`#tab${key}`)?.classList.toggle('active', key.toLowerCase()===name);
    $(`#page${key}`)?.classList.toggle('active', key.toLowerCase()===name);
  });
}

function renderFamilyRows(items=[]){
  const tbody = $('#familyTbody'); if(!tbody) return;
  tbody.innerHTML='';
  (items.length ? items : [{}]).forEach(item => addFamilyRow(item));
}
function addFamilyRow(item={}){
  const tbody = $('#familyTbody'); if(!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input data-k="name" value="${escapeHtml(item.name||'')}"></td>
    <td><input data-k="relation" value="${escapeHtml(item.relation||'')}"></td>
    <td><input data-k="occupation" value="${escapeHtml(item.occupation||'')}"></td>
    <td><input data-k="age" type="number" min="0" value="${escapeHtml(item.age||'')}"></td>
    <td><button class="btn small bad" type="button">✖</button></td>`;
  tr.querySelector('button').addEventListener('click',()=> tr.remove());
  tbody.appendChild(tr);
}
function collectFamily(){
  return $$('#familyTbody tr').map(tr => ({
    name: tr.querySelector('[data-k="name"]').value.trim(),
    relation: tr.querySelector('[data-k="relation"]').value.trim(),
    occupation: tr.querySelector('[data-k="occupation"]').value.trim(),
    age: tr.querySelector('[data-k="age"]').value.trim()
  })).filter(f => Object.values(f).some(Boolean));
}

function buildScheduleSummary(data){
  return DAYS.map(([k,l]) => {
    const d = data?.[k];
    return d?.enabled && (d.start || d.end) ? `${l}: ${d.start || '--:--'}-${d.end || '--:--'}` : null;
  }).filter(Boolean).join(' · ');
}
function initSchedulePicker(){
  const wrap = document.createElement('div');
  wrap.className = 'schedule-picker';
  wrap.innerHTML = `<div class="schedule-picker__header">🗓️ Horarios por día</div><div class="schedule-grid"></div>`;
  const grid = wrap.querySelector('.schedule-grid');
  DAYS.forEach(([key,label]) => {
    const row = document.createElement('div');
    row.className = 'schedule-row';
    row.innerHTML = `
      <label class="schedule-day"><input type="checkbox" data-day="${key}" data-role="enabled"> <span>${label}</span></label>
      <input type="time" data-day="${key}" data-role="start">
      <span class="schedule-sep">a</span>
      <input type="time" data-day="${key}" data-role="end">`;
    grid.appendChild(row);
  });
  $('#horario')?.insertAdjacentElement('afterend', wrap);
  wrap.addEventListener('input', syncScheduleField);
}
function setScheduleData(data={}){
  DAYS.forEach(([key]) => {
    const day = data[key] || {};
    const enabled = document.querySelector(`[data-day="${key}"][data-role="enabled"]`);
    const start = document.querySelector(`[data-day="${key}"][data-role="start"]`);
    const end = document.querySelector(`[data-day="${key}"][data-role="end"]`);
    if(enabled) enabled.checked = !!day.enabled;
    if(start) start.value = day.start || '';
    if(end) end.value = day.end || '';
  });
  syncScheduleField();
}
function getScheduleData(){
  const out = {};
  DAYS.forEach(([key]) => {
    out[key] = {
      enabled: !!document.querySelector(`[data-day="${key}"][data-role="enabled"]`)?.checked,
      start: document.querySelector(`[data-day="${key}"][data-role="start"]`)?.value || '',
      end: document.querySelector(`[data-day="${key}"][data-role="end"]`)?.value || ''
    };
  });
  return out;
}
function syncScheduleField(){ const input=$('#horario'); if(input) input.value = buildScheduleSummary(getScheduleData()); }

function updateProducerConditionals(){
  const p = $('#pertenenciaIndigena')?.value;
  show($('#grupoIndigenaYoWrap'), p === 'YO');
  show($('#grupoIndigenaFamiliarWrap'), p === 'FAMILIAR');
  const l = $('#lenguaIndigenaTipo')?.value;
  show($('#lenguaYoWrap'), l === 'YO');
  show($('#lenguaFamiliarWrap'), l === 'FAMILIAR');
  show($('#alertaWrap'), document.querySelector('.chip[data-active="true"]')?.dataset.value === 'NO_TRABAJAR');
}

function collectProducer(){
  return {
    id: state.editingProducerId || uid(),
    basic: {
      name: value('#nombre'), age: value('#edad'), sex: value('#sexo'), maritalStatus: value('#estadoCivil'),
      celular: value('#celular'), peopleAtHome: value('#personasEnCasa'), locality: value('#localidad'), municipality: value('#municipio'),
      stateName: value('#estado'), schooling: value('#escolaridad'), schoolingOther: value('#escolaridadOtro'),
      schedule: value('#horario'), scheduleData: getScheduleData(), reads: selectedRadio('sabeLeer'), writes: selectedRadio('sabeEscribir'),
      indigenousBelonging: value('#pertenenciaIndigena'), indigenousGroupSelf: value('#grupoIndigenaYo'),
      indigenousFamilyWho: value('#grupoIndigenaFamiliarQuien'), indigenousFamilyGroup: value('#grupoIndigenaFamiliarCual'),
      indigenousLanguageType: value('#lenguaIndigenaTipo'), indigenousLanguageSelf: value('#lenguaYo'),
      indigenousLanguageFamilyWho: value('#lenguaFamiliarQuien'), indigenousLanguageFamily: value('#lenguaFamiliarCual')
    },
    location: { lat: value('#lat'), lng: value('#lng'), mapsUrl: value('#mapsUrl') },
    classification: { value: document.querySelector('.chip[data-active="true"]')?.dataset.value || 'TRABAJAR', alert: value('#alerta'), note: value('#notaExtraPersona') },
    family: collectFamily(),
    notes: value('#notas'),
    housePhoto: state.media.producerPhoto || null,
    animals: producerById(state.editingProducerId)?.animals || [],
    animalQuestionnaire: producerById(state.editingProducerId)?.animalQuestionnaire || null
  };
}
function resetProducerForm(){
  $('#producerForm')?.reset();
  state.editingProducerId = null;
  state.media.producerPhoto = null;
  setThumb('photoPreview', null);
  setScheduleData({});
  renderFamilyRows([]);
  $$('.chip').forEach((chip,i)=> chip.dataset.active = i===0 ? 'true' : 'false');
  updateProducerConditionals();
  $('#formTitle').textContent = 'Nuevo productor(a)';
  show($('#btnCancelEdit'), false);
}
function fillProducerForm(prod){
  if(!prod) return;
  state.editingProducerId = prod.id;
  $('#formTitle').textContent = `Editando: ${prod.basic?.name || ''}`;
  show($('#btnCancelEdit'), true);
  $('#nombre').value = prod.basic?.name || '';
  $('#edad').value = prod.basic?.age || '';
  $('#sexo').value = prod.basic?.sex || '';
  $('#estadoCivil').value = prod.basic?.maritalStatus || '';
  $('#celular').value = prod.basic?.celular || '';
  $('#personasEnCasa').value = prod.basic?.peopleAtHome || '';
  $('#localidad').value = prod.basic?.locality || '';
  $('#municipio').value = prod.basic?.municipality || '';
  $('#estado').value = prod.basic?.stateName || '';
  $('#escolaridad').value = prod.basic?.schooling || '';
  $('#escolaridadOtro').value = prod.basic?.schoolingOther || '';
  $('input[name="sabeLeer"][value="'+(prod.basic?.reads || 'SI')+'"]').checked = true;
  $('input[name="sabeEscribir"][value="'+(prod.basic?.writes || 'SI')+'"]').checked = true;
  $('#pertenenciaIndigena').value = prod.basic?.indigenousBelonging || '';
  $('#grupoIndigenaYo').value = prod.basic?.indigenousGroupSelf || '';
  $('#grupoIndigenaFamiliarQuien').value = prod.basic?.indigenousFamilyWho || '';
  $('#grupoIndigenaFamiliarCual').value = prod.basic?.indigenousFamilyGroup || '';
  $('#lenguaIndigenaTipo').value = prod.basic?.indigenousLanguageType || '';
  $('#lenguaYo').value = prod.basic?.indigenousLanguageSelf || '';
  $('#lenguaFamiliarQuien').value = prod.basic?.indigenousLanguageFamilyWho || '';
  $('#lenguaFamiliarCual').value = prod.basic?.indigenousLanguageFamily || '';
  $('#lat').value = prod.location?.lat || '';
  $('#lng').value = prod.location?.lng || '';
  $('#mapsUrl').value = prod.location?.mapsUrl || '';
  $('#alerta').value = prod.classification?.alert || '';
  $('#notaExtraPersona').value = prod.classification?.note || '';
  $('#notas').value = prod.notes || '';
  state.media.producerPhoto = prod.housePhoto || null;
  setThumb('photoPreview', state.media.producerPhoto);
  setScheduleData(prod.basic?.scheduleData || {});
  renderFamilyRows(prod.family || []);
  $$('.chip').forEach(chip => chip.dataset.active = chip.dataset.value === (prod.classification?.value || 'TRABAJAR') ? 'true' : 'false');
  updateProducerConditionals();
}
function saveProducer(ev){
  ev?.preventDefault();
  const item = collectProducer();
  if(!item.basic.name){ alert('El nombre es obligatorio.'); return; }
  const idx = state.producers.findIndex(p => p.id === item.id);
  if(idx >= 0) state.producers[idx] = item; else state.producers.unshift(item);
  state.selectedProducerId = item.id;
  saveState();
  renderProducerList();
  renderAnimalsProducerSelect();
  resetProducerForm();
}
function renderProducerList(){
  const list = $('#producerList'); if(!list) return;
  $('#count').textContent = String(state.producers.length);
  list.innerHTML = '';
  if(!state.producers.length){ list.innerHTML = '<div class="empty-state">Todavía no hay productores guardados.</div>'; return; }
  state.producers.forEach(prod => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <h3>${escapeHtml(prod.basic?.name || '')}</h3>
      <div class="meta">${escapeHtml(prod.basic?.locality || '')} · ${escapeHtml(prod.basic?.municipality || '')}</div>
      <div class="kv">
        <div class="line"><b>Horario:</b> ${escapeHtml(prod.basic?.schedule || 'Sin horario')}</div>
        <div class="line"><b>Animales:</b> ${escapeHtml(String((prod.animals || []).length))} grupos</div>
      </div>
      <div class="actions" style="margin-top:12px;">
        <button class="btn small ghost" type="button" data-a="edit">✏️ Editar</button>
        <button class="btn small ghost" type="button" data-a="animals">🐾 Animales</button>
        <button class="btn small bad" type="button" data-a="delete">🗑️ Eliminar</button>
      </div>`;
    div.querySelector('[data-a="edit"]').addEventListener('click',()=> fillProducerForm(prod));
    div.querySelector('[data-a="animals"]').addEventListener('click',()=>{ state.selectedProducerId = prod.id; saveState(); renderAnimalsProducerSelect(); activateTab('animals'); });
    div.querySelector('[data-a="delete"]').addEventListener('click',()=>{ state.producers = state.producers.filter(p => p.id !== prod.id); if(state.selectedProducerId===prod.id) state.selectedProducerId = state.producers[0]?.id || null; saveState(); renderProducerList(); renderAnimalsProducerSelect(); resetProducerForm(); });
    list.appendChild(div);
  });
}

function renderAnimalsProducerSelect(){
  const sel = $('#animalsProducerSelect'); if(!sel) return;
  const prev = state.selectedProducerId || '';
  sel.innerHTML = '<option value="">— Selecciona productor/a —</option>';
  state.producers.forEach(p => sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${escapeHtml(p.basic?.name || 'Sin nombre')}</option>`));
  sel.value = prev;
  const prod = currentProducer();
  $('#animalsProducerHint').textContent = prod ? `Trabajando con: ${prod.basic?.name || ''}` : 'Primero selecciona un productor/a';
  renderAnimalPeopleSelects();
  renderAnimalBasedSelects();
  renderAnimalGroups();
  fillQuestionnaire();
}
function renderAnimalPeopleSelects(){
  const prod = currentProducer();
  const normal = producerPeople(prod,false), withVet = producerPeople(prod,true);
  [['#a_dueno',normal],['#a_decideVenta',normal],['#a_limpiaAlimenta',normal]].forEach(([id, opts])=>{
    const s=$(id); if(!s) return; const prev=multiselectValues(s); s.innerHTML=''; opts.forEach(v=>s.insertAdjacentHTML('beforeend', `<option>${escapeHtml(v)}</option>`)); setMulti(s, prev);
  });
  [['#a_vaxWho',withVet],['#a_dewormWho',withVet]].forEach(([id,opts])=>{ const s=$(id); if(!s) return; const prev=s.value; s.innerHTML='<option value="">— Selecciona —</option>'; opts.forEach(v=>s.insertAdjacentHTML('beforeend', `<option>${escapeHtml(v)}</option>`)); s.value=prev; });
}
function renderAnimalBasedSelects(){
  const prod = currentProducer();
  const labels = (prod?.animals || []).map(animalLabel);
  ['#a_enfAnimal','#a_vaxAnimal','#a_dewormAnimal','#a_animalesImportantes'].forEach(id=>{
    const s=$(id); if(!s) return; const isMulti=s.multiple; const prev=isMulti ? multiselectValues(s) : s.value; s.innerHTML=isMulti?'':'<option value="">— Selecciona —</option>'; labels.forEach(v=>s.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)); isMulti?setMulti(s,prev):s.value=prev;
  });
  const birds = hasBirds(prod);
  show($('#a_interestBirdsCurrentWrap'), birds);
  show($('#a_interestBirdsStartWrap'), !birds);
  show($('#rumiantInterestWrap'), !hasRuminants(prod));
  updateAnimalConditionals();
}

function collectAnimalGroup(){
  return {
    id: state.editingAnimalId || uid(),
    species: value('#a_especie'), race: value('#a_raza'), quantity: value('#a_cantidad'),
    owners: multiselectValues($('#a_dueno')), sellDecision: multiselectValues($('#a_decideVenta')), cleanFeedBy: multiselectValues($('#a_limpiaAlimenta')),
    function: multiselectValues($('#a_funcion')), installations: value('#a_viven'), feed: value('#a_feedType'), photos: [...state.media.animalTempPhotos]
  };
}
function resetAnimalGroupForm(){ $('#a_especie').value=''; $('#a_raza').value=''; $('#a_cantidad').value=''; $('#a_viven').value=''; $('#a_feedType').value=''; ['#a_dueno','#a_decideVenta','#a_limpiaAlimenta','#a_funcion'].forEach(id=> setMulti($(id),[])); state.media.animalTempPhotos=[]; state.editingAnimalId=null; renderAnimalTempPhotos(); }
async function bindAnimalPhotos(){
  $('#a_btnInstTake')?.addEventListener('click',()=> $('#a_instTake')?.click());
  $('#a_btnInstPick')?.addEventListener('click',()=> $('#a_instPick')?.click());
  $('#a_btnInstClear')?.addEventListener('click',()=>{ state.media.animalTempPhotos=[]; renderAnimalTempPhotos(); });
  for(const id of ['#a_instTake','#a_instPick']) $(id)?.addEventListener('change', async e=>{ for(const f of Array.from(e.target.files||[])) state.media.animalTempPhotos.push(await fileToBase64(f)); renderAnimalTempPhotos(); e.target.value=''; });
}
function renderAnimalTempPhotos(){ const box=$('#a_instPreview'), hint=$('#a_instHint'); if(!box||!hint) return; box.innerHTML=''; hint.textContent = state.media.animalTempPhotos.length ? `${state.media.animalTempPhotos.length} foto(s) cargada(s).` : 'Sin fotos todavía.'; state.media.animalTempPhotos.forEach((src,i)=>{ const d=document.createElement('div'); d.className='preview-mini'; d.innerHTML=`<img src="${src}" alt="animal"><button class="mini-remove" type="button">✖</button>`; d.querySelector('button').addEventListener('click',()=>{ state.media.animalTempPhotos.splice(i,1); renderAnimalTempPhotos(); }); box.appendChild(d); }); }
function saveAnimalGroup(){
  const prod=currentProducer(); if(!prod) return alert('Selecciona primero un productor/a.');
  const item=collectAnimalGroup(); if(!item.species || !item.quantity) return alert('Especie y cantidad son obligatorias.');
  prod.animals ||= []; const idx = prod.animals.findIndex(a=>a.id===item.id); if(idx>=0) prod.animals[idx]=item; else prod.animals.unshift(item);
  state.editingAnimalId=null; saveState(); resetAnimalGroupForm(); renderAnimalGroups(); renderAnimalBasedSelects();
}
function renderAnimalGroups(){
  const list=$('#a_list'); if(!list) return; const prod=currentProducer(); list.innerHTML='';
  if(!prod){ list.innerHTML='<div class="empty-state">Selecciona un productor/a.</div>'; return; }
  if(!(prod.animals||[]).length){ list.innerHTML='<div class="empty-state">No hay grupos registrados.</div>'; return; }
  prod.animals.forEach(animal=>{ const div=document.createElement('div'); div.className='item'; div.innerHTML=`<h3>${escapeHtml(animal.species)}</h3><div class="meta">${escapeHtml(animal.race||'')} · ${escapeHtml(animal.quantity||'')}</div><div class="kv"><div class="line"><b>Función:</b> ${escapeHtml((animal.function||[]).join(', '))}</div><div class="line"><b>Instalaciones:</b> ${escapeHtml(animal.installations||'')}</div><div class="line"><b>Alimentación:</b> ${escapeHtml(animal.feed||'')}</div></div><div class="actions" style="margin-top:12px;"><button class="btn small ghost" type="button" data-a="edit">✏️ Editar</button><button class="btn small bad" type="button" data-a="delete">🗑️ Eliminar</button></div>`; div.querySelector('[data-a="edit"]').addEventListener('click',()=>{ state.editingAnimalId=animal.id; $('#a_especie').value=animal.species||''; $('#a_raza').value=animal.race||''; $('#a_cantidad').value=animal.quantity||''; $('#a_viven').value=animal.installations||''; $('#a_feedType').value=animal.feed||''; setMulti($('#a_dueno'), animal.owners||[]); setMulti($('#a_decideVenta'), animal.sellDecision||[]); setMulti($('#a_limpiaAlimenta'), animal.cleanFeedBy||[]); setMulti($('#a_funcion'), animal.function||[]); state.media.animalTempPhotos=[...(animal.photos||[])]; renderAnimalTempPhotos(); }); div.querySelector('[data-a="delete"]').addEventListener('click',()=>{ prod.animals = prod.animals.filter(a=>a.id!==animal.id); saveState(); renderAnimalGroups(); renderAnimalBasedSelects(); }); list.appendChild(div); });
}

function renderSimpleList(containerId, items, titleBuilder, metaBuilder, fillCb, emptyText){
  const box=$(containerId); if(!box) return; box.innerHTML='';
  if(!items.length){ box.innerHTML=`<div class="empty-state">${emptyText}</div>`; return; }
  items.forEach(item=>{ const div=document.createElement('div'); div.className='item'; div.innerHTML=`<h3>${escapeHtml(titleBuilder(item))}</h3><div class="meta">${escapeHtml(metaBuilder(item))}</div><div class="actions" style="margin-top:12px;"><button class="btn small ghost" type="button" data-a="edit">✏️ Editar</button><button class="btn small bad" type="button" data-a="delete">🗑️ Eliminar</button></div>`; div.querySelector('[data-a="edit"]').addEventListener('click',()=> fillCb(item,true)); div.querySelector('[data-a="delete"]').addEventListener('click',()=> fillCb(item,false)); box.appendChild(div); });
}
function upsertById(arr, item){ const idx=arr.findIndex(x=>x.id===item.id); if(idx>=0) arr[idx]=item; else arr.unshift(item); }
function addDisease(){ const prod=currentProducer(); if(!prod) return; const q=ensureQuestionnaire(prod); const item={id: $('#a_lastSick').dataset.editId || uid(), date:value('#a_lastSick'), animal:value('#a_enfAnimal'), name:value('#a_commonDis'), signs:value('#a_signs'), treatment:value('#a_whenSickDo')}; if(!item.signs) return alert('Los signos clínicos son obligatorios.'); upsertById(q.diseases,item); ['#a_lastSick','#a_enfAnimal','#a_commonDis','#a_signs','#a_whenSickDo'].forEach(id=>$(id).value=''); $('#a_lastSick').dataset.editId=''; saveState(); renderQuestionnaireLists(); }
function addVax(){ const prod=currentProducer(); if(!prod) return; const q=ensureQuestionnaire(prod); const item={id: $('#a_vaxName').dataset.editId || uid(), animal:value('#a_vaxAnimal'), name:value('#a_vaxName'), date:value('#a_vaxDate'), who:value('#a_vaxWho')}; upsertById(q.vaccines,item); ['#a_vaxAnimal','#a_vaxName','#a_vaxDate','#a_vaxWho'].forEach(id=>$(id).value=''); $('#a_vaxName').dataset.editId=''; saveState(); renderQuestionnaireLists(); }
function addDeworm(){ const prod=currentProducer(); if(!prod) return; const q=ensureQuestionnaire(prod); const item={id: $('#a_dewormProd').dataset.editId || uid(), animal:value('#a_dewormAnimal'), product:value('#a_dewormProd'), date:value('#a_dewormDate'), who:value('#a_dewormWho')}; upsertById(q.dewormings,item); ['#a_dewormAnimal','#a_dewormProd','#a_dewormDate','#a_dewormWho'].forEach(id=>$(id).value=''); $('#a_dewormProd').dataset.editId=''; saveState(); renderQuestionnaireLists(); }
function addTraditional(){ const prod=currentProducer(); if(!prod) return; const q=ensureQuestionnaire(prod); const item={id: $('#a_tradNombre').dataset.editId || uid(), name:value('#a_tradNombre'), type:value('#a_tradTipo'), use:value('#a_tradUso'), how:value('#a_tradComo'), animals:value('#a_tradAnimales'), part:value('#a_tradParte')}; if(!item.name) return alert('Agrega el nombre del remedio.'); upsertById(q.traditional,item); ['#a_tradNombre','#a_tradTipo','#a_tradUso','#a_tradComo','#a_tradAnimales','#a_tradParte'].forEach(id=>$(id).value=''); $('#a_tradNombre').dataset.editId=''; saveState(); renderQuestionnaireLists(); }
function addGenderAnimal(){ const prod=currentProducer(); if(!prod) return; const q=ensureQuestionnaire(prod); const animal = value('#a_genderAnimal') === 'Otro' ? value('#a_genderAnimalOtro') : value('#a_genderAnimal'); const item={id: $('#a_genderAnimalWhy').dataset.editId || uid(), animal, sex:value('#a_genderAnimalWho'), why:value('#a_genderAnimalWhy')}; if(!item.animal || !item.sex) return alert('Completa el animal y quién lo cuida más.'); upsertById(q.genderAnimals,item); ['#a_genderAnimalWho','#a_genderAnimalWhy','#a_genderAnimalOtro'].forEach(id=>$(id).value=''); $('#a_genderAnimal').value='Vacas'; $('#a_genderAnimalWhy').dataset.editId=''; updateAnimalConditionals(); saveState(); renderQuestionnaireLists(); }
function addGenderActivity(){ const prod=currentProducer(); if(!prod) return; const q=ensureQuestionnaire(prod); const item={id: $('#a_actividadGenero').dataset.editId || uid(), activity:value('#a_actividadGenero'), sex:value('#a_actividadGeneroSexo'), why:value('#a_actividadGeneroRazon')}; if(!item.activity || !item.sex) return alert('Completa la actividad y quién la realiza.'); upsertById(q.genderActivities,item); ['#a_actividadGenero','#a_actividadGeneroSexo','#a_actividadGeneroRazon'].forEach(id=>$(id).value=''); $('#a_actividadGenero').dataset.editId=''; saveState(); renderQuestionnaireLists(); }
function renderQuestionnaireLists(){
  const prod=currentProducer(); if(!prod) return; const q=ensureQuestionnaire(prod);
  renderSimpleList('#a_diseaseList', q.diseases, i=>`${i.animal || 'Sin especie'} ${i.name ? '· ' + i.name : ''}`, i=>`${i.date || ''} ${i.signs ? '· ' + i.signs : ''}`, (item, edit)=>{ if(edit){ $('#a_lastSick').dataset.editId=item.id; $('#a_lastSick').value=item.date||''; $('#a_enfAnimal').value=item.animal||''; $('#a_commonDis').value=item.name||''; $('#a_signs').value=item.signs||''; $('#a_whenSickDo').value=item.treatment||''; } else { q.diseases=q.diseases.filter(x=>x.id!==item.id); saveState(); renderQuestionnaireLists(); } }, 'No hay enfermedades registradas.');
  renderSimpleList('#a_vaxList', q.vaccines, i=>`${i.animal || 'Sin especie'} ${i.name ? '· ' + i.name : ''}`, i=>`${i.date || ''} ${i.who ? '· ' + i.who : ''}`, (item, edit)=>{ if(edit){ $('#a_vaxName').dataset.editId=item.id; $('#a_vaxAnimal').value=item.animal||''; $('#a_vaxName').value=item.name||''; $('#a_vaxDate').value=item.date||''; $('#a_vaxWho').value=item.who||''; } else { q.vaccines=q.vaccines.filter(x=>x.id!==item.id); saveState(); renderQuestionnaireLists(); } }, 'No hay vacunaciones registradas.');
  renderSimpleList('#a_dewormList', q.dewormings, i=>`${i.animal || 'Sin especie'} ${i.product ? '· ' + i.product : ''}`, i=>`${i.date || ''} ${i.who ? '· ' + i.who : ''}`, (item, edit)=>{ if(edit){ $('#a_dewormProd').dataset.editId=item.id; $('#a_dewormAnimal').value=item.animal||''; $('#a_dewormProd').value=item.product||''; $('#a_dewormDate').value=item.date||''; $('#a_dewormWho').value=item.who||''; } else { q.dewormings=q.dewormings.filter(x=>x.id!==item.id); saveState(); renderQuestionnaireLists(); } }, 'No hay desparasitaciones registradas.');
  renderSimpleList('#a_tradList', q.traditional, i=>i.name || 'Sin nombre', i=>[i.type,i.animals].filter(Boolean).join(' · '), (item, edit)=>{ if(edit){ $('#a_tradNombre').dataset.editId=item.id; $('#a_tradNombre').value=item.name||''; $('#a_tradTipo').value=item.type||''; $('#a_tradUso').value=item.use||''; $('#a_tradComo').value=item.how||''; $('#a_tradAnimales').value=item.animals||''; $('#a_tradParte').value=item.part||''; } else { q.traditional=q.traditional.filter(x=>x.id!==item.id); saveState(); renderQuestionnaireLists(); } }, 'No hay medicina tradicional registrada.');
  renderSimpleList('#a_genderAnimalList', q.genderAnimals, i=>i.animal || 'Sin animal', i=>`${i.sex || ''} ${i.why ? '· ' + i.why : ''}`, (item, edit)=>{ if(edit){ $('#a_genderAnimalWhy').dataset.editId=item.id; $('#a_genderAnimal').value = ['Vacas','Pequeños rumiantes (borregos y cabras)','Caballos','Burros, mulas','Aves de corral','Guajolotes','Aves de pelea','Cerdos','Perros','Gatos','Conejos','Abejas','Peces'].includes(item.animal) ? item.animal : 'Otro'; $('#a_genderAnimalOtro').value = $('#a_genderAnimal').value === 'Otro' ? item.animal : ''; $('#a_genderAnimalWho').value=item.sex||''; $('#a_genderAnimalWhy').value=item.why||''; updateAnimalConditionals(); } else { q.genderAnimals=q.genderAnimals.filter(x=>x.id!==item.id); saveState(); renderQuestionnaireLists(); } }, 'No hay registros de cuidado por género.');
  renderSimpleList('#a_generoActividadList', q.genderActivities, i=>i.activity || 'Sin actividad', i=>`${i.sex || ''} ${i.why ? '· ' + i.why : ''}`, (item, edit)=>{ if(edit){ $('#a_actividadGenero').dataset.editId=item.id; $('#a_actividadGenero').value=item.activity||''; $('#a_actividadGeneroSexo').value=item.sex||''; $('#a_actividadGeneroRazon').value=item.why||''; } else { q.genderActivities=q.genderActivities.filter(x=>x.id!==item.id); saveState(); renderQuestionnaireLists(); } }, 'No hay actividades por género.');
}

function checkedPrograms(){ return $$('input[name="a_programas[]"]:checked').map(i=>i.value); }
function setCheckedPrograms(vals=[]){ const set=new Set(vals); $$('input[name="a_programas[]"]').forEach(i=>i.checked=set.has(i.value)); }
function birdScaleValue(name){ return document.querySelector(`input[name="${name}"]:checked`)?.value || ''; }
function setBirdScale(name, value){ const el = document.querySelector(`input[name="${name}"][value="${value}"]`); if(el) el.checked = true; else document.querySelectorAll(`input[name="${name}"]`).forEach(i=>i.checked=false); }

function updateAnimalConditionals(){
  show($('#a_queSiembraWrap'), value('#a_tieneMilpa') === 'Sí');
  show($('#a_vaxBlock'), value('#a_vaxAny') !== 'No' && value('#a_vaxAny') !== '');
  show($('#a_dewormBlock'), value('#a_dewormAny') !== 'No' && value('#a_dewormAny') !== '');
  show($('#a_curadorDetalleWrap'), value('#a_curadorExiste') === 'Sí');
  show($('#a_curadorAsesoriaWrap'), value('#a_curadorExiste') === 'Sí' && value('#a_curadorEsVet') === 'No');
  show($('#a_practicasDetalleWrap'), value('#a_practicas') === 'Sí');
  show($('#a_programaFolioWrap'), checkedPrograms().length > 0);
  show($('#a_programaConvocatoriasWrap'), checkedPrograms().length === 0);
  show($('#a_cazaDetalleWrap'), value('#a_cazaComunidad') === 'Sí');
  show($('#a_silvestresDetalleWrap'), value('#a_silvestresProblemas') === 'Sí');
  show($('#a_rioDetalleWrap'), value('#a_rioUso') === 'Sí');
  show($('#a_saberesDetalleWrap'), value('#a_saberesLocales') === 'Sí');
  show($('#a_genderAnimalOtroWrap'), value('#a_genderAnimal') === 'Otro');
  const currentHasRuminants = hasRuminants(currentProducer());
  show($('#rumiantInterestWrap'), !currentHasRuminants);
  show($('#rumiantNoCurrentReasonWrap'), !currentHasRuminants);
  show($('#rumiantWomenNeedWrap'), value('#a_rumiantsWomen') === 'Sí');
}

function saveQuestionnaire(){
  const prod=currentProducer(); if(!prod) return alert('Selecciona un productor/a.');
  const q=ensureQuestionnaire(prod);
  q.importantAnimals = multiselectValues($('#a_animalesImportantes'));
  q.importantAnimalsWhy = value('#a_importanciaDetalle');
  q.hasMilpa = value('#a_tieneMilpa');
  q.whatSows = value('#a_queSiembra');
  q.forageShortage = value('#a_escasezForraje');
  q.vaccinatesAny = value('#a_vaxAny');
  q.dewormsAny = value('#a_dewormAny');
  q.changesDewormer = value('#a_changeDewormProduct');
  q.recommendedBy = value('#a_recommendWho');
  q.healerExists = value('#a_curadorExiste');
  q.healerName = value('#a_curadorQuien');
  q.healerAge = value('#a_curadorEdad');
  q.healerGender = value('#a_curadorGenero');
  q.healerSpecies = value('#a_curadorEspecies');
  q.healerSince = value('#a_curadorTiempo');
  q.healerServices = value('#a_curadorServicios');
  q.healerIsVet = value('#a_curadorEsVet');
  q.healerVetAdvice = value('#a_curadorAsesoriaVet');
  q.practicesAny = value('#a_practicas');
  q.practicesKinds = value('#a_practicasCuales');
  q.practicesWho = value('#a_practicasQuien');
  q.selectedPrograms = checkedPrograms();
  q.hasProgramFolio = value('#a_programaFolioTiene');
  q.programFolio = value('#a_programaFolio');
  q.futureCalls = value('#a_programaConvocatorias');
  q.huntingCommon = value('#a_cazaComunidad');
  q.huntingTime = value('#a_cazaTiempo');
  q.huntedAnimals = value('#a_cazaAnimales');
  q.huntingPlaces = value('#a_cazaLugares');
  q.huntingSeason = value('#a_cazaEpoca');
  q.huntingReasons = value('#a_cazaMotivos');
  q.wildProblems = value('#a_silvestresProblemas');
  q.wildProblemsDetail = value('#a_silvestresQuePaso');
  q.riverUse = value('#a_rioUso');
  q.riverUseFor = value('#a_rioParaQue');
  q.riverMeaning = value('#a_rioSignificado');
  q.riverProblems = value('#a_rioProblemas');
  q.localKnowledgeExists = value('#a_saberesLocales');
  q.localKnowledgeWhat = value('#a_saberesCual');
  q.localKnowledgeWho = value('#a_saberesQuien');
  q.localKnowledgeUseLevel = value('#a_saberesUso');
  q.rumiantInterest = hasRuminants(prod) ? '' : value('#a_interestRumiants');
  q.rumiantInterestWhy = hasRuminants(prod) ? '' : value('#a_interestRumiantsWhy');
  q.hadRumiantsBefore = value('#a_hadRumiantsBefore');
  q.noRumiantsReason = hasRuminants(prod) ? '' : value('#a_noRumiantsWhy');
  q.rumiantAdvice = value('#a_rumiantsAdvice');
  q.rumiantOthers = value('#a_rumiantsOthers');
  q.rumiantWomen = value('#a_rumiantsWomen');
  q.rumiantNeed = value('#a_rumiantsNeed');
  q.birdsInterestCurrent = birdScaleValue('birds_current');
  q.birdsInterestStart = birdScaleValue('birds_start');
  saveState();
  renderProducerList();
  alert('Se guardó la sección de animales.');
}
function fillQuestionnaire(){
  const prod=currentProducer();
  if(!prod){ $('#animalForm')?.reset(); ['#a_diseaseList','#a_vaxList','#a_dewormList','#a_tradList','#a_genderAnimalList','#a_generoActividadList'].forEach(id=>$(id).innerHTML=''); updateAnimalConditionals(); return; }
  const q=ensureQuestionnaire(prod);
  setMulti($('#a_animalesImportantes'), q.importantAnimals || []);
  $('#a_importanciaDetalle').value = q.importantAnimalsWhy || '';
  $('#a_tieneMilpa').value = q.hasMilpa || '';
  $('#a_queSiembra').value = q.whatSows || '';
  $('#a_escasezForraje').value = q.forageShortage || '';
  $('#a_vaxAny').value = q.vaccinatesAny || '';
  $('#a_dewormAny').value = q.dewormsAny || '';
  $('#a_changeDewormProduct').value = q.changesDewormer || '';
  $('#a_recommendWho').value = q.recommendedBy || '';
  $('#a_curadorExiste').value = q.healerExists || '';
  $('#a_curadorQuien').value = q.healerName || '';
  $('#a_curadorEdad').value = q.healerAge || '';
  $('#a_curadorGenero').value = q.healerGender || '';
  $('#a_curadorEspecies').value = q.healerSpecies || '';
  $('#a_curadorTiempo').value = q.healerSince || '';
  $('#a_curadorServicios').value = q.healerServices || '';
  $('#a_curadorEsVet').value = q.healerIsVet || '';
  $('#a_curadorAsesoriaVet').value = q.healerVetAdvice || '';
  $('#a_practicas').value = q.practicesAny || '';
  $('#a_practicasCuales').value = q.practicesKinds || '';
  $('#a_practicasQuien').value = q.practicesWho || '';
  setCheckedPrograms(q.selectedPrograms || []);
  $('#a_programaFolioTiene').value = q.hasProgramFolio || '';
  $('#a_programaFolio').value = q.programFolio || '';
  $('#a_programaConvocatorias').value = q.futureCalls || '';
  $('#a_cazaComunidad').value = q.huntingCommon || '';
  $('#a_cazaTiempo').value = q.huntingTime || '';
  $('#a_cazaAnimales').value = q.huntedAnimals || '';
  $('#a_cazaLugares').value = q.huntingPlaces || '';
  $('#a_cazaEpoca').value = q.huntingSeason || '';
  $('#a_cazaMotivos').value = q.huntingReasons || '';
  $('#a_silvestresProblemas').value = q.wildProblems || '';
  $('#a_silvestresQuePaso').value = q.wildProblemsDetail || '';
  $('#a_rioUso').value = q.riverUse || '';
  $('#a_rioParaQue').value = q.riverUseFor || '';
  $('#a_rioSignificado').value = q.riverMeaning || '';
  $('#a_rioProblemas').value = q.riverProblems || '';
  $('#a_saberesLocales').value = q.localKnowledgeExists || '';
  $('#a_saberesCual').value = q.localKnowledgeWhat || '';
  $('#a_saberesQuien').value = q.localKnowledgeWho || '';
  $('#a_saberesUso').value = q.localKnowledgeUseLevel || '';
  $('#a_interestRumiants').value = q.rumiantInterest || '';
  $('#a_interestRumiantsWhy').value = q.rumiantInterestWhy || '';
  $('#a_hadRumiantsBefore').value = q.hadRumiantsBefore || '';
  $('#a_noRumiantsWhy').value = q.noRumiantsReason || '';
  $('#a_rumiantsAdvice').value = q.rumiantAdvice || '';
  $('#a_rumiantsOthers').value = q.rumiantOthers || '';
  $('#a_rumiantsWomen').value = q.rumiantWomen || '';
  $('#a_rumiantsNeed').value = q.rumiantNeed || '';
  setBirdScale('birds_current', q.birdsInterestCurrent || '');
  setBirdScale('birds_start', q.birdsInterestStart || '');
  renderQuestionnaireLists();
  updateAnimalConditionals();
}

function bindPhotoButtons(){
  $('#btnTakePhoto')?.addEventListener('click',()=> $('#fotoTomar')?.click());
  $('#btnPickPhoto')?.addEventListener('click',()=> $('#fotoElegir')?.click());
  $('#btnRemovePhoto')?.addEventListener('click',()=>{ state.media.producerPhoto = null; setThumb('photoPreview', null); });
  ['#fotoTomar','#fotoElegir'].forEach(id => $(id)?.addEventListener('change', async e=>{ const file=e.target.files?.[0]; if(!file) return; state.media.producerPhoto = await fileToBase64(file); setThumb('photoPreview', state.media.producerPhoto); e.target.value=''; }));
}

function bindBasics(){
  bindPhotoButtons(); bindAnimalPhotos(); initSchedulePicker(); renderFamilyRows([]); resetProducerForm();
  $('#producerForm')?.addEventListener('submit', saveProducer);
  $('#btnReset')?.addEventListener('click', resetProducerForm);
  $('#btnCancelEdit')?.addEventListener('click', resetProducerForm);
  $('#btnAddFamily')?.addEventListener('click',()=> addFamilyRow({}));
  ['#pertenenciaIndigena','#lenguaIndigenaTipo'].forEach(id => $(id)?.addEventListener('change', updateProducerConditionals));
  $$('.chip').forEach(chip => chip.addEventListener('click', ()=>{ $$('.chip').forEach(c => c.dataset.active='false'); chip.dataset.active='true'; updateProducerConditionals(); }));
  $('#animalsProducerSelect')?.addEventListener('change',()=>{ state.selectedProducerId = $('#animalsProducerSelect').value || null; saveState(); renderAnimalsProducerSelect(); });
  $('#btnGoProducerFromAnimals')?.addEventListener('click',()=> activateTab('producer'));
  $('#a_save')?.addEventListener('click', saveAnimalGroup);
  $('#a_clear')?.addEventListener('click', resetAnimalGroupForm);
  $('#a_addDisease')?.addEventListener('click', addDisease);
  $('#a_addVax')?.addEventListener('click', addVax);
  $('#a_addDeworm')?.addEventListener('click', addDeworm);
  $('#a_addTrad')?.addEventListener('click', addTraditional);
  $('#a_addGenderAnimal')?.addEventListener('click', addGenderAnimal);
  $('#a_addGeneroActividad')?.addEventListener('click', addGenderActivity);
  $('#btnSaveAnimalsFull')?.addEventListener('click', saveQuestionnaire);
  ['#a_tieneMilpa','#a_vaxAny','#a_dewormAny','#a_curadorExiste','#a_curadorEsVet','#a_practicas','#a_cazaComunidad','#a_silvestresProblemas','#a_rioUso','#a_saberesLocales','#a_genderAnimal','#a_rumiantsWomen'].forEach(id => $(id)?.addEventListener('change', updateAnimalConditionals));
  $$('input[name="a_programas[]"]').forEach(i => i.addEventListener('change', updateAnimalConditionals));
  ['#tabProducer','#tabAnimals','#tabMeds','#tabSupplies','#tabProcedures'].forEach(id=> $(id)?.addEventListener('click',()=> activateTab(id.replace('#tab','').toLowerCase())));
}

loadState();
window.addEventListener('DOMContentLoaded', ()=>{
  bindBasics();
  renderProducerList();
  if(!state.selectedProducerId && state.producers[0]) state.selectedProducerId = state.producers[0].id;
  renderAnimalsProducerSelect();
  activateTab('producer');
  setThumb('photoPreview', state.media.producerPhoto);
});
