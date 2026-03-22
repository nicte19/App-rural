const STORAGE_KEY = 'app-rural-netlify-v1';
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const state = {
  producers: [],
  selectedProducerId: null,
  editingProducerId: null,
  editingAnimalGroupId: null,
  editingTraditionalId: null,
  editingGenderAnimalId: null
};

const $ = (selector) => document.querySelector(selector);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.producers = Array.isArray(parsed.producers) ? parsed.producers : [];
    state.selectedProducerId = parsed.selectedProducerId || null;
  } catch (error) {
    console.error('No se pudo cargar la app:', error);
  }
}

function getSelectedProducer() {
  return state.producers.find((item) => item.id === state.selectedProducerId) || null;
}

function ensureProducerStructures(producer) {
  producer.animalGroups ||= [];
  producer.questionnaire ||= {
    importantAnimals: '',
    importantAnimalsWhy: '',
    hasMilpa: '',
    whatSows: '',
    forageShortage: '',
    vaccinatesAny: '',
    vaccinesDetail: '',
    dewormsAny: '',
    dewormingDetail: '',
    recommendedBy: '',
    healerExists: '',
    healerWho: '',
    healerAge: '',
    healerGender: '',
    healerSpecies: '',
    healerSince: '',
    healerServices: '',
    healerIsVet: '',
    healerAdvice: '',
    practicesAny: '',
    practicesWho: '',
    practicesAdvice: '',
    programs: [],
    programNotes: '',
    huntingCommon: '',
    huntingTime: '',
    huntedAnimals: '',
    huntingReasons: '',
    wildProblems: '',
    wildProblemsDetail: '',
    riverUse: '',
    riverUseFor: '',
    riverMeaning: '',
    riverProblems: '',
    localKnowledgeExists: '',
    localKnowledgeSpecific: '',
    localKnowledgeWho: '',
    localKnowledgeUsage: '',
    rumiantInterest: '',
    rumiantInterestWhy: '',
    hadRumiantsBefore: '',
    noRumiantsReason: '',
    noRumiantsReasonOther: '',
    rumiantAdvice: '',
    rumiantOthers: '',
    birdsInterest: '',
    traditional: [],
    genderAnimals: []
  };
}

function renderScheduleGrid() {
  const container = $('#scheduleGrid');
  container.innerHTML = DAYS.map((day, index) => `
    <article class="day-card" data-day-card="${index}">
      <header>
        <input type="checkbox" id="day_enabled_${index}" data-day-enabled="${index}" />
        <span class="day-dot"></span>
        <label class="day-name" for="day_enabled_${index}">${day}</label>
      </header>
      <div class="time-range">
        <label>Desde <input type="time" data-day-start="${index}" /></label>
        <label>Hasta <input type="time" data-day-end="${index}" /></label>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-day-enabled]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => syncScheduleCards());
  });

  syncScheduleCards();
}

function syncScheduleCards() {
  DAYS.forEach((_, index) => {
    const enabled = $(`[data-day-enabled="${index}"]`).checked;
    const card = $(`[data-day-card="${index}"]`);
    card.classList.toggle('disabled', !enabled);
    if (!enabled) {
      $(`[data-day-start="${index}"]`).value = '';
      $(`[data-day-end="${index}"]`).value = '';
    }
  });
}

function collectSchedule() {
  return DAYS.map((day, index) => ({
    day,
    enabled: $(`[data-day-enabled="${index}"]`).checked,
    start: $(`[data-day-start="${index}"]`).value,
    end: $(`[data-day-end="${index}"]`).value
  })).filter((item) => item.enabled);
}

function fillSchedule(schedule = []) {
  DAYS.forEach((_, index) => {
    $(`[data-day-enabled="${index}"]`).checked = false;
    $(`[data-day-start="${index}"]`).value = '';
    $(`[data-day-end="${index}"]`).value = '';
  });
  schedule.forEach((item) => {
    const index = DAYS.indexOf(item.day);
    if (index === -1) return;
    $(`[data-day-enabled="${index}"]`).checked = true;
    $(`[data-day-start="${index}"]`).value = item.start || '';
    $(`[data-day-end="${index}"]`).value = item.end || '';
  });
  syncScheduleCards();
}

function formatSchedule(schedule = []) {
  if (!schedule.length) return 'Sin horario registrado';
  return schedule.map((item) => `${item.day}: ${item.start || '—'} a ${item.end || '—'}`).join(' · ');
}

function resetProducerForm() {
  $('#producerForm').reset();
  fillSchedule([]);
  state.editingProducerId = null;
  $('#producerStatus').textContent = '';
}

function collectProducerForm() {
  return {
    id: state.editingProducerId || uid(),
    name: $('#nombre').value.trim(),
    age: $('#edad').value.trim(),
    gender: $('#genero').value,
    phone: $('#celular').value.trim(),
    peopleAtHome: $('#personasEnCasa').value.trim(),
    locality: $('#localidad').value.trim(),
    municipality: $('#municipio').value.trim(),
    stateName: $('#estado').value.trim(),
    notes: $('#notas').value.trim(),
    schedule: collectSchedule(),
    animalGroups: state.editingProducerId ? (state.producers.find((item) => item.id === state.editingProducerId)?.animalGroups || []) : [],
    questionnaire: state.editingProducerId ? (state.producers.find((item) => item.id === state.editingProducerId)?.questionnaire || null) : null
  };
}

function renderProducerSelect() {
  const select = $('#selectedProducer');
  if (!state.producers.length) {
    select.innerHTML = '<option value="">— Primero guarda un productor(a) —</option>';
    $('#selectedProducerInfo').textContent = 'Aún no seleccionas un productor(a).';
    return;
  }
  select.innerHTML = state.producers.map((producer) => `<option value="${producer.id}">${producer.name}</option>`).join('');
  if (!state.selectedProducerId || !state.producers.some((item) => item.id === state.selectedProducerId)) {
    state.selectedProducerId = state.producers[0].id;
  }
  select.value = state.selectedProducerId;
  updateSelectedProducerInfo();
}

function producerHasBirds(producer) {
  return producer.animalGroups.some((item) => /gall|ave|guajol|pato|codorn|pollo/i.test(item.species));
}

function producerHasRumiants(producer) {
  return producer.animalGroups.some((item) => /borreg|cabra/i.test(item.species));
}

function updateSelectedProducerInfo() {
  const producer = getSelectedProducer();
  if (!producer) {
    $('#selectedProducerInfo').textContent = 'Aún no seleccionas un productor(a).';
    return;
  }
  const location = [producer.locality, producer.municipality, producer.stateName].filter(Boolean).join(', ');
  $('#selectedProducerInfo').innerHTML = `<strong>${producer.name}</strong><br>${location || 'Sin ubicación'}<br>${formatSchedule(producer.schedule)}`;
  renderAnimalGroupList();
  fillQuestionnaireForm();
}

function renderProducerList() {
  const container = $('#producerList');
  if (!state.producers.length) {
    container.innerHTML = '<div class="empty-state">No hay productores registrados todavía.</div>';
    return;
  }
  container.innerHTML = state.producers.map((producer) => `
    <article class="producer-card">
      <h3>${producer.name}</h3>
      <p class="muted">${[producer.locality, producer.municipality, producer.stateName].filter(Boolean).join(', ') || 'Sin ubicación'}.</p>
      <div class="tag-row">
        <span class="tag">${producer.animalGroups?.length || 0} grupos animales</span>
        <span class="tag">${formatSchedule(producer.schedule)}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-ghost" type="button" data-edit-producer="${producer.id}">Editar</button>
        <button class="btn btn-ghost" type="button" data-select-producer="${producer.id}">Trabajar aquí</button>
        <button class="btn btn-ghost" type="button" data-delete-producer="${producer.id}">Eliminar</button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-edit-producer]').forEach((button) => {
    button.addEventListener('click', () => editProducer(button.dataset.editProducer));
  });
  container.querySelectorAll('[data-select-producer]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedProducerId = button.dataset.selectProducer;
      saveState();
      renderProducerSelect();
    });
  });
  container.querySelectorAll('[data-delete-producer]').forEach((button) => {
    button.addEventListener('click', () => deleteProducer(button.dataset.deleteProducer));
  });
}

function editProducer(id) {
  const producer = state.producers.find((item) => item.id === id);
  if (!producer) return;
  state.editingProducerId = id;
  $('#nombre').value = producer.name || '';
  $('#edad').value = producer.age || '';
  $('#genero').value = producer.gender || '';
  $('#celular').value = producer.phone || '';
  $('#personasEnCasa').value = producer.peopleAtHome || '';
  $('#localidad').value = producer.locality || '';
  $('#municipio').value = producer.municipality || '';
  $('#estado').value = producer.stateName || '';
  $('#notas').value = producer.notes || '';
  fillSchedule(producer.schedule || []);
  $('#producerStatus').textContent = `Editando a ${producer.name}.`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProducer(id) {
  state.producers = state.producers.filter((item) => item.id !== id);
  if (state.selectedProducerId === id) state.selectedProducerId = state.producers[0]?.id || null;
  if (state.editingProducerId === id) state.editingProducerId = null;
  saveState();
  renderProducerList();
  renderProducerSelect();
  resetProducerForm();
}

function handleProducerSubmit(event) {
  event.preventDefault();
  const producer = collectProducerForm();
  if (!producer.name) return;
  ensureProducerStructures(producer);
  const index = state.producers.findIndex((item) => item.id === producer.id);
  if (index >= 0) state.producers[index] = producer;
  else state.producers.unshift(producer);
  state.selectedProducerId = producer.id;
  saveState();
  renderProducerList();
  renderProducerSelect();
  resetProducerForm();
  $('#producerStatus').textContent = 'Productor(a) guardado(a) correctamente.';
}

function resetAnimalGroupForm() {
  $('#animalGroupForm').reset();
  state.editingAnimalGroupId = null;
  $('#animalFunctionOtherWrap').classList.add('hidden');
  $('#animalGroupStatus').textContent = '';
}

function renderAnimalGroupList() {
  const producer = getSelectedProducer();
  const container = $('#animalGroupList');
  if (!producer) {
    container.innerHTML = '<div class="empty-state">Selecciona un productor(a) para registrar sus animales.</div>';
    return;
  }
  ensureProducerStructures(producer);
  if (!producer.animalGroups.length) {
    container.innerHTML = '<div class="empty-state">No hay grupos animales guardados.</div>';
    updateQuestionnaireConditionals();
    return;
  }
  container.innerHTML = producer.animalGroups.map((animal) => `
    <article class="animal-card">
      <h4>${animal.species} ${animal.breed ? `· ${animal.breed}` : ''}</h4>
      <p class="muted">Cantidad: ${animal.quantity || '—'} · Función: ${animal.functionLabel || '—'}</p>
      <div class="tag-row">
        <span class="tag">${animal.installations || 'Sin instalaciones'}</span>
        <span class="tag">${animal.feed || 'Sin alimentación'}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-ghost" type="button" data-edit-animal="${animal.id}">Editar</button>
        <button class="btn btn-ghost" type="button" data-delete-animal="${animal.id}">Eliminar</button>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-edit-animal]').forEach((button) => {
    button.addEventListener('click', () => editAnimalGroup(button.dataset.editAnimal));
  });
  container.querySelectorAll('[data-delete-animal]').forEach((button) => {
    button.addEventListener('click', () => deleteAnimalGroup(button.dataset.deleteAnimal));
  });
  updateQuestionnaireConditionals();
}

function editAnimalGroup(id) {
  const producer = getSelectedProducer();
  const animal = producer?.animalGroups.find((item) => item.id === id);
  if (!animal) return;
  state.editingAnimalGroupId = id;
  $('#animalSpecies').value = animal.species || '';
  $('#animalBreed').value = animal.breed || '';
  $('#animalQty').value = animal.quantity || '';
  $('#animalOwners').value = animal.owners || '';
  $('#animalSellDecision').value = animal.sellDecision || '';
  $('#animalCareBy').value = animal.careBy || '';
  $('#animalFunction').value = animal.function || '';
  $('#animalFunctionOther').value = animal.functionOther || '';
  $('#animalInstallations').value = animal.installations || '';
  $('#animalFeed').value = animal.feed || '';
  $('#animalFunctionOtherWrap').classList.toggle('hidden', animal.function !== 'Otro');
  $('#animalGroupStatus').textContent = `Editando ${animal.species}.`;
}

function deleteAnimalGroup(id) {
  const producer = getSelectedProducer();
  if (!producer) return;
  producer.animalGroups = producer.animalGroups.filter((item) => item.id !== id);
  saveState();
  renderAnimalGroupList();
  renderProducerList();
}

function handleAnimalGroupSubmit(event) {
  event.preventDefault();
  const producer = getSelectedProducer();
  if (!producer) {
    $('#animalGroupStatus').textContent = 'Primero selecciona un productor(a).';
    return;
  }
  ensureProducerStructures(producer);
  const functionValue = $('#animalFunction').value;
  const animal = {
    id: state.editingAnimalGroupId || uid(),
    species: $('#animalSpecies').value.trim(),
    breed: $('#animalBreed').value.trim(),
    quantity: $('#animalQty').value.trim(),
    owners: $('#animalOwners').value.trim(),
    sellDecision: $('#animalSellDecision').value.trim(),
    careBy: $('#animalCareBy').value.trim(),
    function: functionValue,
    functionOther: $('#animalFunctionOther').value.trim(),
    functionLabel: functionValue === 'Otro' ? ($('#animalFunctionOther').value.trim() || 'Otro') : functionValue,
    installations: $('#animalInstallations').value.trim(),
    feed: $('#animalFeed').value.trim()
  };
  if (!animal.species || !animal.quantity) {
    $('#animalGroupStatus').textContent = 'Especie y cantidad son obligatorias.';
    return;
  }
  const index = producer.animalGroups.findIndex((item) => item.id === animal.id);
  if (index >= 0) producer.animalGroups[index] = animal;
  else producer.animalGroups.unshift(animal);
  saveState();
  renderAnimalGroupList();
  renderProducerList();
  resetAnimalGroupForm();
  $('#animalGroupStatus').textContent = 'Grupo animal guardado.';
}

function getQuestionnaireFormData() {
  return {
    hasMilpa: $('#hasMilpa').value,
    whatSows: $('#whatSows').value.trim(),
    forageShortage: $('#forageShortage').value.trim(),
    vaccinatesAny: $('#vaccinatesAny').value,
    vaccinesDetail: $('#vaccinesDetail').value.trim(),
    dewormsAny: $('#dewormsAny').value,
    dewormingDetail: $('#dewormingDetail').value.trim(),
    recommendedBy: $('#recommendedBy').value.trim(),
    healerExists: $('#healerExists').value,
    healerWho: $('#healerWho').value.trim(),
    healerAge: $('#healerAge').value.trim(),
    healerGender: $('#healerGender').value,
    healerSpecies: $('#healerSpecies').value.trim(),
    healerSince: $('#healerSince').value.trim(),
    healerServices: $('#healerServices').value.trim(),
    healerIsVet: $('#healerIsVet').value,
    healerAdvice: $('#healerAdvice').value,
    practicesAny: $('#practicesAny').value,
    practicesWho: $('#practicesWho').value.trim(),
    practicesAdvice: $('#practicesAdvice').value,
    programs: Array.from(document.querySelectorAll('input[name="programs"]:checked')).map((input) => input.value),
    programNotes: $('#programNotes').value.trim(),
    huntingCommon: $('#huntingCommon').value,
    huntingTime: $('#huntingTime').value.trim(),
    huntedAnimals: $('#huntedAnimals').value.trim(),
    huntingReasons: $('#huntingReasons').value.trim(),
    wildProblems: $('#wildProblems').value,
    wildProblemsDetail: $('#wildProblemsDetail').value.trim(),
    riverUse: $('#riverUse').value,
    riverUseFor: $('#riverUseFor').value.trim(),
    riverMeaning: $('#riverMeaning').value.trim(),
    riverProblems: $('#riverProblems').value.trim(),
    localKnowledgeExists: $('#localKnowledgeExists').value,
    localKnowledgeSpecific: $('#localKnowledgeSpecific').value.trim(),
    localKnowledgeWho: $('#localKnowledgeWho').value.trim(),
    localKnowledgeUsage: $('#localKnowledgeUsage').value,
    rumiantInterest: $('#rumiantInterest').value,
    rumiantInterestWhy: $('#rumiantInterestWhy').value.trim(),
    hadRumiantsBefore: $('#hadRumiantsBefore').value,
    noRumiantsReason: $('#noRumiantsReason').value,
    noRumiantsReasonOther: $('#noRumiantsReasonOther').value.trim(),
    rumiantAdvice: $('#rumiantAdvice').value,
    rumiantOthers: $('#rumiantOthers').value,
    birdsInterest: document.querySelector('input[name="birdsInterest"]:checked')?.value || '',
    traditional: getSelectedProducer()?.questionnaire?.traditional || [],
    genderAnimals: getSelectedProducer()?.questionnaire?.genderAnimals || []
  };
}

function fillQuestionnaireForm() {
  const producer = getSelectedProducer();
  if (!producer) return;
  ensureProducerStructures(producer);
  const q = producer.questionnaire;
  $('#hasMilpa').value = q.hasMilpa || '';
  $('#whatSows').value = q.whatSows || '';
  $('#forageShortage').value = q.forageShortage || '';
  $('#vaccinatesAny').value = q.vaccinatesAny || '';
  $('#vaccinesDetail').value = q.vaccinesDetail || '';
  $('#dewormsAny').value = q.dewormsAny || '';
  $('#dewormingDetail').value = q.dewormingDetail || '';
  $('#recommendedBy').value = q.recommendedBy || '';
  $('#healerExists').value = q.healerExists || '';
  $('#healerWho').value = q.healerWho || '';
  $('#healerAge').value = q.healerAge || '';
  $('#healerGender').value = q.healerGender || '';
  $('#healerSpecies').value = q.healerSpecies || '';
  $('#healerSince').value = q.healerSince || '';
  $('#healerServices').value = q.healerServices || '';
  $('#healerIsVet').value = q.healerIsVet || '';
  $('#healerAdvice').value = q.healerAdvice || '';
  $('#practicesAny').value = q.practicesAny || '';
  $('#practicesWho').value = q.practicesWho || '';
  $('#practicesAdvice').value = q.practicesAdvice || '';
  document.querySelectorAll('input[name="programs"]').forEach((input) => {
    input.checked = (q.programs || []).includes(input.value);
  });
  $('#programNotes').value = q.programNotes || '';
  $('#huntingCommon').value = q.huntingCommon || '';
  $('#huntingTime').value = q.huntingTime || '';
  $('#huntedAnimals').value = q.huntedAnimals || '';
  $('#huntingReasons').value = q.huntingReasons || '';
  $('#wildProblems').value = q.wildProblems || '';
  $('#wildProblemsDetail').value = q.wildProblemsDetail || '';
  $('#riverUse').value = q.riverUse || '';
  $('#riverUseFor').value = q.riverUseFor || '';
  $('#riverMeaning').value = q.riverMeaning || '';
  $('#riverProblems').value = q.riverProblems || '';
  $('#localKnowledgeExists').value = q.localKnowledgeExists || '';
  $('#localKnowledgeSpecific').value = q.localKnowledgeSpecific || '';
  $('#localKnowledgeWho').value = q.localKnowledgeWho || '';
  $('#localKnowledgeUsage').value = q.localKnowledgeUsage || '';
  $('#rumiantInterest').value = q.rumiantInterest || '';
  $('#rumiantInterestWhy').value = q.rumiantInterestWhy || '';
  $('#hadRumiantsBefore').value = q.hadRumiantsBefore || '';
  $('#noRumiantsReason').value = q.noRumiantsReason || '';
  $('#noRumiantsReasonOther').value = q.noRumiantsReasonOther || '';
  $('#rumiantAdvice').value = q.rumiantAdvice || '';
  $('#rumiantOthers').value = q.rumiantOthers || '';
  document.querySelectorAll('input[name="birdsInterest"]').forEach((input) => {
    input.checked = input.value === (q.birdsInterest || '');
  });
  renderTraditionalList();
  renderGenderAnimalList();
  updateQuestionnaireConditionals();
}

function handleQuestionnaireSubmit(event) {
  event.preventDefault();
  const producer = getSelectedProducer();
  if (!producer) {
    $('#questionnaireStatus').textContent = 'Primero selecciona un productor(a).';
    return;
  }
  ensureProducerStructures(producer);
  producer.questionnaire = { ...producer.questionnaire, ...getQuestionnaireFormData() };
  saveState();
  renderProducerList();
  $('#questionnaireStatus').textContent = 'Cuestionario guardado correctamente.';
}

function renderTraditionalList() {
  const producer = getSelectedProducer();
  const container = $('#traditionalList');
  if (!producer) return;
  ensureProducerStructures(producer);
  const list = producer.questionnaire.traditional || [];
  if (!list.length) {
    container.innerHTML = '<div class="empty-state">No hay usos de medicina tradicional registrados.</div>';
    return;
  }
  container.innerHTML = list.map((item) => `
    <article class="entry-card">
      <strong>${item.name}</strong>
      <p class="muted">${item.type || 'Sin tipo'} · ${item.howUse || 'Sin uso'} · ${item.animals || 'Sin animales'}.</p>
      <div class="card-actions">
        <button class="btn btn-ghost" type="button" data-edit-traditional="${item.id}">Editar</button>
        <button class="btn btn-ghost" type="button" data-delete-traditional="${item.id}">Eliminar</button>
      </div>
    </article>
  `).join('');
  container.querySelectorAll('[data-edit-traditional]').forEach((button) => button.addEventListener('click', () => editTraditional(button.dataset.editTraditional)));
  container.querySelectorAll('[data-delete-traditional]').forEach((button) => button.addEventListener('click', () => deleteTraditional(button.dataset.deleteTraditional)));
}

function addTraditional() {
  const producer = getSelectedProducer();
  if (!producer) return;
  ensureProducerStructures(producer);
  const item = {
    id: state.editingTraditionalId || uid(),
    name: $('#tradName').value.trim(),
    type: $('#tradType').value,
    howUse: $('#tradHowUse').value.trim(),
    animals: $('#tradAnimals').value.trim()
  };
  if (!item.name) {
    $('#traditionalStatus').textContent = 'Escribe el nombre del uso tradicional.';
    return;
  }
  const list = producer.questionnaire.traditional;
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index >= 0) list[index] = item;
  else list.unshift(item);
  state.editingTraditionalId = null;
  $('#tradName').value = '';
  $('#tradType').value = '';
  $('#tradHowUse').value = '';
  $('#tradAnimals').value = '';
  $('#traditionalStatus').textContent = 'Uso tradicional guardado.';
  saveState();
  renderTraditionalList();
}

function editTraditional(id) {
  const item = getSelectedProducer()?.questionnaire?.traditional.find((entry) => entry.id === id);
  if (!item) return;
  state.editingTraditionalId = id;
  $('#tradName').value = item.name || '';
  $('#tradType').value = item.type || '';
  $('#tradHowUse').value = item.howUse || '';
  $('#tradAnimals').value = item.animals || '';
  $('#traditionalStatus').textContent = `Editando ${item.name}.`;
}

function deleteTraditional(id) {
  const producer = getSelectedProducer();
  if (!producer) return;
  producer.questionnaire.traditional = producer.questionnaire.traditional.filter((item) => item.id !== id);
  saveState();
  renderTraditionalList();
}

function renderGenderAnimalList() {
  const producer = getSelectedProducer();
  const container = $('#genderAnimalList');
  if (!producer) return;
  ensureProducerStructures(producer);
  const list = producer.questionnaire.genderAnimals || [];
  if (!list.length) {
    container.innerHTML = '<div class="empty-state">No hay registros de roles por animal.</div>';
    return;
  }
  container.innerHTML = list.map((item) => `
    <article class="entry-card">
      <strong>${item.animal}</strong>
      <p class="muted">${item.who} · ${item.why || 'Sin motivo registrado'}.</p>
      <div class="card-actions">
        <button class="btn btn-ghost" type="button" data-edit-gender-animal="${item.id}">Editar</button>
        <button class="btn btn-ghost" type="button" data-delete-gender-animal="${item.id}">Eliminar</button>
      </div>
    </article>
  `).join('');
  container.querySelectorAll('[data-edit-gender-animal]').forEach((button) => button.addEventListener('click', () => editGenderAnimal(button.dataset.editGenderAnimal)));
  container.querySelectorAll('[data-delete-gender-animal]').forEach((button) => button.addEventListener('click', () => deleteGenderAnimal(button.dataset.deleteGenderAnimal)));
}

function addGenderAnimal() {
  const producer = getSelectedProducer();
  if (!producer) return;
  ensureProducerStructures(producer);
  const item = {
    id: state.editingGenderAnimalId || uid(),
    animal: $('#genderAnimal').value.trim(),
    who: $('#genderAnimalWho').value,
    why: $('#genderAnimalWhy').value.trim()
  };
  if (!item.animal || !item.who) return;
  const list = producer.questionnaire.genderAnimals;
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index >= 0) list[index] = item;
  else list.unshift(item);
  state.editingGenderAnimalId = null;
  $('#genderAnimal').value = '';
  $('#genderAnimalWho').value = '';
  $('#genderAnimalWhy').value = '';
  saveState();
  renderGenderAnimalList();
}

function editGenderAnimal(id) {
  const item = getSelectedProducer()?.questionnaire?.genderAnimals.find((entry) => entry.id === id);
  if (!item) return;
  state.editingGenderAnimalId = id;
  $('#genderAnimal').value = item.animal || '';
  $('#genderAnimalWho').value = item.who || '';
  $('#genderAnimalWhy').value = item.why || '';
}

function deleteGenderAnimal(id) {
  const producer = getSelectedProducer();
  if (!producer) return;
  producer.questionnaire.genderAnimals = producer.questionnaire.genderAnimals.filter((item) => item.id !== id);
  saveState();
  renderGenderAnimalList();
}

function updateQuestionnaireConditionals() {
  const producer = getSelectedProducer();
  const hasBirds = producer ? producerHasBirds(producer) : false;
  const hasRumiants = producer ? producerHasRumiants(producer) : false;

  $('#whatSowsWrap').classList.toggle('hidden', $('#hasMilpa').value !== 'Sí');
  $('#vaccinesDetailWrap').classList.toggle('hidden', !['Sí', 'A veces'].includes($('#vaccinatesAny').value));
  $('#dewormingDetailWrap').classList.toggle('hidden', !['Sí', 'A veces'].includes($('#dewormsAny').value));
  $('#healerDetailsWrap').classList.toggle('hidden', $('#healerExists').value !== 'Sí');
  $('#healerAdviceWrap').classList.toggle('hidden', $('#healerExists').value !== 'Sí' || $('#healerIsVet').value !== 'No');
  $('#practicesWrap').classList.toggle('hidden', $('#practicesAny').value !== 'Sí');
  $('#huntingTimeWrap').classList.toggle('hidden', $('#huntingCommon').value !== 'Sí');
  $('#huntedAnimalsWrap').classList.toggle('hidden', $('#huntingCommon').value !== 'Sí');
  $('#huntingReasonsWrap').classList.toggle('hidden', $('#huntingCommon').value !== 'Sí');
  $('#wildProblemsDetailWrap').classList.toggle('hidden', $('#wildProblems').value !== 'Sí');
  $('#riverUseForWrap').classList.toggle('hidden', $('#riverUse').value !== 'Sí');
  $('#localKnowledgeWrap').classList.toggle('hidden', $('#localKnowledgeExists').value !== 'Sí');

  $('#rumiantInfo').textContent = hasRumiants
    ? 'Este productor(a) ya tiene borregos o cabras, así que se omite la pregunta sobre si le gustaría tenerlos y se pasa directo a la experiencia previa.'
    : 'Este productor(a) no tiene borregos o cabras registrados actualmente.';
  $('#rumiantInterestBlock').classList.toggle('hidden', hasRumiants);
  $('#rumiantInterestWhyWrap').classList.toggle('hidden', hasRumiants || !['Sí', 'Tal vez'].includes($('#rumiantInterest').value));
  $('#noRumiantsReasonWrap').classList.toggle('hidden', hasRumiants);
  $('#noRumiantsReasonOtherWrap').classList.toggle('hidden', hasRumiants || $('#noRumiantsReason').value !== 'Otro');

  renderBirdsQuestion(hasBirds);
}

function renderBirdsQuestion(hasBirds) {
  const wrapper = $('#birdsScaleWrap');
  const template = $('#scaleTemplate');
  const clone = template.content.cloneNode(true);
  clone.querySelector('.scale-label').textContent = hasBirds
    ? '1. Si actualmente tiene aves: ¿Qué tanto interés tendría en participar en actividades para aprender más sobre la crianza de aves y mejorar su producción, como entrevistas más detalladas o dinámicas de trabajo relacionadas con el tema?'
    : '2. Si actualmente no tiene aves: ¿Qué tanto interés tendría en participar en actividades para aprender cómo iniciar la crianza de aves, como entrevistas más detalladas o dinámicas relacionadas con este tema?';
  wrapper.innerHTML = '';
  wrapper.appendChild(clone);
  $('#birdsInfo').textContent = hasBirds ? 'Se detectaron aves registradas en este productor(a).' : 'No se detectaron aves registradas en este productor(a).';

  const savedValue = getSelectedProducer()?.questionnaire?.birdsInterest || '';
  if (savedValue) {
    const input = wrapper.querySelector(`input[value="${savedValue}"]`);
    if (input) input.checked = true;
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'app-rural-respaldo.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state.producers = Array.isArray(parsed.producers) ? parsed.producers : [];
      state.selectedProducerId = parsed.selectedProducerId || state.producers[0]?.id || null;
      saveState();
      renderProducerList();
      renderProducerSelect();
      resetProducerForm();
      resetAnimalGroupForm();
      $('#questionnaireStatus').textContent = 'Datos importados correctamente.';
    } catch (error) {
      $('#questionnaireStatus').textContent = 'No se pudo importar el archivo.';
    }
  };
  reader.readAsText(file);
}

function bindEvents() {
  $('#producerForm').addEventListener('submit', handleProducerSubmit);
  $('#animalGroupForm').addEventListener('submit', handleAnimalGroupSubmit);
  $('#questionnaireForm').addEventListener('submit', handleQuestionnaireSubmit);
  $('#selectedProducer').addEventListener('change', (event) => {
    state.selectedProducerId = event.target.value || null;
    saveState();
    updateSelectedProducerInfo();
  });
  $('#btnResetAll').addEventListener('click', () => {
    resetProducerForm();
    resetAnimalGroupForm();
  });
  $('#btnClearAnimalGroup').addEventListener('click', resetAnimalGroupForm);
  $('#animalFunction').addEventListener('change', () => {
    $('#animalFunctionOtherWrap').classList.toggle('hidden', $('#animalFunction').value !== 'Otro');
  });
  ['#hasMilpa', '#vaccinatesAny', '#dewormsAny', '#healerExists', '#healerIsVet', '#practicesAny', '#huntingCommon', '#wildProblems', '#riverUse', '#localKnowledgeExists', '#rumiantInterest', '#noRumiantsReason']
    .forEach((selector) => $(selector).addEventListener('change', updateQuestionnaireConditionals));
  $('#btnAddTraditional').addEventListener('click', addTraditional);
  $('#btnAddGenderAnimal').addEventListener('click', addGenderAnimal);
  $('#btnExport').addEventListener('click', exportData);
  $('#btnImport').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) importData(file);
    event.target.value = '';
  });
}

function init() {
  renderScheduleGrid();
  loadState();
  state.producers.forEach(ensureProducerStructures);
  renderProducerList();
  renderProducerSelect();
  updateQuestionnaireConditionals();
  bindEvents();
}

init();
