(function () {
  const DB_NAME = 'app_rural_offline_v2';
  const DB_VERSION = 1;
  const STORE_APP = 'appState';
  const APP_STATE_KEY = 'current';
  const LEGACY_KEYS = ['app_rural_consolidada_v2', 'app_rural_consolidada_v1'];
  const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './app-services.js',
    './firebase-config.js',
    './manifest.webmanifest',
    './icons/icon-192.svg',
    './icons/icon-512.svg'
  ];

  const FIREBASE_REQUIRED_FIELDS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

  let dbPromise = null;
  let firebaseReady = false;
  let firestore = null;
  let auth = null;
  let storage = null;
  let googleProvider = null;
  let currentUser = null;
  let syncInFlight = false;
  let connectivityListenersBound = false;
  const authListeners = new Set();
  const onlineListeners = new Set();
  const syncListeners = new Set();

  function emit(set, payload) {
    set.forEach((cb) => {
      try { cb(payload); } catch (error) { console.error(error); }
    });
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_APP)) db.createObjectStore(STORE_APP);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function withStore(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP, mode);
      const store = tx.objectStore(STORE_APP);
      const result = fn(store);
      tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function readAppState() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP, 'readonly');
      const req = tx.objectStore(STORE_APP).get(APP_STATE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function writeAppState(data) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP, 'readwrite');
      tx.objectStore(STORE_APP).put(data, APP_STATE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadState() {
    try {
      const indexed = await readAppState();
      if (indexed) return indexed;
    } catch (error) {
      console.error('IndexedDB load failed', error);
    }
    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        await saveState(parsed);
        return parsed;
      } catch (error) {
        console.error('Legacy migration failed', error);
      }
    }
    return null;
  }

  async function saveState(data) {
    try {
      await writeAppState(data);
    } catch (error) {
      console.error('IndexedDB save failed', error);
    }
    try {
      localStorage.setItem(LEGACY_KEYS[0], JSON.stringify(data));
    } catch (error) {
      console.error('Local backup failed', error);
    }
    return true;
  }

  function bindConnectivity() {
    if (connectivityListenersBound) return;
    connectivityListenersBound = true;
    const notify = () => emit(onlineListeners, navigator.onLine);
    window.addEventListener('online', notify);
    window.addEventListener('offline', notify);
  }

  function getFirebaseConfigStatus() {
    const config = window.APP_FIREBASE_CONFIG;
    const missingFields = FIREBASE_REQUIRED_FIELDS.filter((field) => !config?.[field]);
    return {
      configured: Boolean(config) && missingFields.length === 0,
      hasSdk: Boolean(window.firebase),
      missingFields,
      config,
      configFile: 'firebase-config.js',
      exampleFile: 'firebase-config.example.js'
    };
  }

  function initFirebase() {
    if (firebaseReady) return true;
    const status = getFirebaseConfigStatus();
    if (!status.configured || !status.hasSdk) return false;
    const config = status.config;
    if (!firebase.apps.length) firebase.initializeApp(config);
    firestore = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage ? firebase.storage() : null;
    googleProvider = new firebase.auth.GoogleAuthProvider();
    firebaseReady = true;
    auth.onAuthStateChanged((user) => {
      currentUser = user || null;
      emit(authListeners, currentUser);
      if (currentUser && navigator.onLine) triggerSync(window.__APP_STATE__ || null);
    });
    return true;
  }

  function onAuthChanged(cb) { authListeners.add(cb); return () => authListeners.delete(cb); }
  function onOnlineChanged(cb) { bindConnectivity(); onlineListeners.add(cb); cb(navigator.onLine); return () => onlineListeners.delete(cb); }
  function onSyncChanged(cb) { syncListeners.add(cb); return () => syncListeners.delete(cb); }
  function notifySync(status) { emit(syncListeners, status); }

  async function signInWithGoogle() {
    if (!initFirebase()) {
      const status = getFirebaseConfigStatus();
      const reason = !status.hasSdk
        ? 'SDK de Firebase no disponible'
        : `Faltan variables de Firebase: ${status.missingFields.join(', ')}`;
      throw new Error(reason);
    }
    return auth.signInWithPopup(googleProvider);
  }
  async function signOut() {
    if (!auth) return;
    return auth.signOut();
  }

  function cleanForCloud(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function uploadFileIfNeeded(uid, collection, record, storageField) {
    if (!storage || !record[storageField]) return record[storageField];
    const value = record[storageField];
    if (typeof value !== 'string' || !value.startsWith('data:')) return value;
    const path = `users/${uid}/${collection}/${record.id}/${storageField}-${Date.now()}`;
    const ref = storage.ref(path);
    const snapshot = await ref.putString(value, 'data_url');
    return snapshot.ref.getDownloadURL();
  }

  async function uploadNestedImages(uid, collection, record) {
    const clone = cleanForCloud(record);
    if (clone.photo) clone.photo = await uploadFileIfNeeded(uid, collection, clone, 'photo');
    if (clone.ticket) clone.ticket = await uploadFileIfNeeded(uid, collection, clone, 'ticket');
    if (clone.file && typeof clone.file === 'string' && clone.file.startsWith('data:')) {
      const path = `users/${uid}/${collection}/${clone.id}/file-${Date.now()}`;
      const ref = storage.ref(path);
      const snapshot = await ref.putString(clone.file, 'data_url');
      clone.file = await snapshot.ref.getDownloadURL();
    }
    const maybeArrays = [
      ['animals', 'photos'],
      ['caseClinical', 'photos'],
      ['necropsy', 'photos']
    ];
    for (const [parent, key] of maybeArrays) {
      const list = parent ? clone[parent]?.[key] : clone[key];
      if (!Array.isArray(list) || !storage) continue;
      const next = [];
      for (let i = 0; i < list.length; i += 1) {
        const entry = list[i];
        if (typeof entry === 'string' && entry.startsWith('data:')) {
          const path = `users/${uid}/${collection}/${clone.id}/${parent || key}-${key}-${i}-${Date.now()}`;
          const ref = storage.ref(path);
          const snapshot = await ref.putString(entry, 'data_url');
          next.push(await snapshot.ref.getDownloadURL());
        } else {
          next.push(entry);
        }
      }
      clone[parent][key] = next;
    }
    if (clone.charge?.photo && storage && clone.charge.photo.startsWith('data:')) {
      const path = `users/${uid}/${collection}/${clone.id}/charge-photo-${Date.now()}`;
      const ref = storage.ref(path);
      const snapshot = await ref.putString(clone.charge.photo, 'data_url');
      clone.charge.photo = await snapshot.ref.getDownloadURL();
    }
    return clone;
  }

  async function syncCollection(uid, collectionName, records, deletedRecords, state) {
    const collectionRef = firestore.collection('users').doc(uid).collection(collectionName);
    const snapshot = await collectionRef.get();
    const remoteMap = new Map();
    snapshot.forEach((doc) => remoteMap.set(doc.id, doc.data()));

    const localMap = new Map((records || []).map((record) => [record.id, record]));
    const nextRecords = [];
    const conflicts = [];

    for (const record of records || []) {
      const remote = remoteMap.get(record.id);
      const localMeta = record._sync || {};
      const localTime = Number(localMeta.updatedAt || 0);
      const remoteTime = Number(remote?._sync?.updatedAt || 0);
      const syncedTime = Number(localMeta.lastSyncedAt || 0);

      if (!remote) {
        const prepared = storage ? await uploadNestedImages(uid, collectionName, record) : cleanForCloud(record);
        await collectionRef.doc(record.id).set(prepared, { merge: true });
        nextRecords.push({ ...prepared, _sync: { ...prepared._sync, syncStatus: 'synced', lastSyncedAt: Date.now(), conflict: null } });
        continue;
      }

      const localChangedAfterSync = localTime > syncedTime;
      const remoteChangedAfterSync = remoteTime > syncedTime;

      if (localChangedAfterSync && remoteChangedAfterSync && localTime !== remoteTime) {
        const winner = localTime >= remoteTime ? 'local' : 'remote';
        conflicts.push({ collection: collectionName, id: record.id, winner, localUpdatedAt: localTime, remoteUpdatedAt: remoteTime, detectedAt: Date.now() });
        if (winner === 'local') {
          const prepared = storage ? await uploadNestedImages(uid, collectionName, record) : cleanForCloud(record);
          await collectionRef.doc(record.id).set({ ...prepared, _sync: { ...prepared._sync, conflict: 'resolved-local', lastConflictAt: Date.now() } }, { merge: true });
          nextRecords.push({ ...prepared, _sync: { ...prepared._sync, syncStatus: 'synced', lastSyncedAt: Date.now(), conflict: 'resolved-local' } });
        } else {
          nextRecords.push({ ...remote, _sync: { ...remote._sync, syncStatus: 'synced', lastSyncedAt: Date.now(), conflict: 'resolved-remote' } });
        }
        continue;
      }

      if (localTime >= remoteTime) {
        const prepared = storage ? await uploadNestedImages(uid, collectionName, record) : cleanForCloud(record);
        await collectionRef.doc(record.id).set(prepared, { merge: true });
        nextRecords.push({ ...prepared, _sync: { ...prepared._sync, syncStatus: 'synced', lastSyncedAt: Date.now(), conflict: null } });
      } else {
        nextRecords.push({ ...remote, _sync: { ...remote._sync, syncStatus: 'synced', lastSyncedAt: Date.now(), conflict: null } });
      }
    }

    for (const [remoteId, remote] of remoteMap.entries()) {
      if (!localMap.has(remoteId)) nextRecords.push({ ...remote, _sync: { ...remote._sync, syncStatus: 'synced', lastSyncedAt: Date.now(), conflict: null } });
    }

    for (const deleted of deletedRecords || []) {
      await collectionRef.doc(deleted.id).delete().catch(() => {});
    }

    state[collectionName] = nextRecords.sort((a, b) => Number(b._sync?.updatedAt || 0) - Number(a._sync?.updatedAt || 0));
    return conflicts;
  }

  async function triggerSync(state) {
    if (syncInFlight) return { skipped: true };
    if (!state) return { skipped: true };
    if (!navigator.onLine) return { skipped: true, reason: 'offline' };
    const firebaseStatus = getFirebaseConfigStatus();
    if (!firebaseStatus.configured || !firebaseStatus.hasSdk) return { skipped: true, reason: 'firebase-config', firebaseStatus };
    if (!initFirebase() || !currentUser) return { skipped: true, reason: 'auth', firebaseStatus };
    syncInFlight = true;
    notifySync({ phase: 'running', at: Date.now() });
    try {
      const collections = ['producers', 'meds', 'vaccines', 'supplies', 'procedures', 'labTests'];
      const conflicts = [];
      for (const collectionName of collections) {
        const found = await syncCollection(currentUser.uid, collectionName, state[collectionName] || [], state.sync?.deletedRecords?.[collectionName] || [], state);
        conflicts.push(...found);
      }
      state.sync = state.sync || {};
      state.sync.lastSyncedAt = Date.now();
      state.sync.lastSyncedUserId = currentUser.uid;
      state.sync.conflicts = [...(state.sync.conflicts || []), ...conflicts].slice(-100);
      state.sync.deletedRecords = collections.reduce((acc, key) => ({ ...acc, [key]: [] }), {});
      await saveState(state);
      notifySync({ phase: 'success', at: Date.now(), conflicts: conflicts.length });
      return { ok: true, conflicts: conflicts.length };
    } catch (error) {
      console.error(error);
      notifySync({ phase: 'error', at: Date.now(), error: error.message });
      return { ok: false, error };
    } finally {
      syncInFlight = false;
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.error('SW registration failed', error);
      });
    });
  }

  function init() {
    bindConnectivity();
    registerServiceWorker();
    initFirebase();
    return { firebaseReady, currentUser, online: navigator.onLine, coreAssets: CORE_ASSETS };
  }

  window.AppServices = {
    init,
    persistence: { loadState, saveState },
    auth: { signInWithGoogle, signOut, onAuthChanged, getCurrentUser: () => currentUser, isReady: () => firebaseReady },
    firebase: { getStatus: getFirebaseConfigStatus },
    sync: { triggerSync, onSyncChanged },
    connectivity: { onChange: onOnlineChanged, isOnline: () => navigator.onLine },
    constants: { CORE_ASSETS }
  };
})();
