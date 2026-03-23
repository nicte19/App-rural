import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  getRedirectResult,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  collection,
  enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

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
  const CLOUD_COLLECTIONS = ['producers', 'meds', 'vaccines', 'supplies', 'procedures', 'labTests'];
  const FIREBASE_REQUIRED_FIELDS = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

  let dbPromise = null;
  let firebaseReady = false;
  let firebaseApp = null;
  let firestore = null;
  let auth = null;
  let storage = null;
  let googleProvider = null;
  let currentUser = null;
  let syncInFlight = false;
  let connectivityListenersBound = false;
  let redirectHandled = false;
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

  function getRuntimeFirebaseConfig() {
    const runtimeConfig = window.APP_FIREBASE_CONFIG || window.__APP_FIREBASE_CONFIG__ || {};
    const envConfig = {
      apiKey: window.APP_FIREBASE_API_KEY,
      authDomain: window.APP_FIREBASE_AUTH_DOMAIN,
      projectId: window.APP_FIREBASE_PROJECT_ID,
      storageBucket: window.APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.APP_FIREBASE_APP_ID,
      measurementId: window.APP_FIREBASE_MEASUREMENT_ID,
    };
    return Object.fromEntries(
      Object.entries({ ...envConfig, ...runtimeConfig }).filter(([, value]) => value),
    );
  }

  function getFirebaseConfigStatus() {
    const config = getRuntimeFirebaseConfig();
    const missingFields = FIREBASE_REQUIRED_FIELDS.filter((field) => !config?.[field]);
    const configured = missingFields.length === 0;
    return {
      configured,
      hasSdk: true,
      missingFields,
      config,
      configFile: 'firebase-config.js',
      exampleFile: 'firebase-config.example.js',
      mode: configured ? 'cloud-ready' : 'local-only'
    };
  }

  async function initFirebase() {
    if (firebaseReady) return true;
    const status = getFirebaseConfigStatus();
    if (!status.configured) return false;
    const config = status.config;
    firebaseApp = getApps().length ? getApp() : initializeApp(config);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
    storage = config.storageBucket ? getStorage(firebaseApp) : null;
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    try {
      await enableIndexedDbPersistence(firestore);
    } catch (error) {
      if (error?.code !== 'failed-precondition' && error?.code !== 'unimplemented') {
        console.error('Firestore persistence failed', error);
      }
    }
    if (!redirectHandled) {
      redirectHandled = true;
      getRedirectResult(auth).catch((error) => console.error('Redirect login failed', error));
      onAuthStateChanged(auth, (user) => {
        currentUser = user || null;
        emit(authListeners, currentUser);
        if (currentUser && navigator.onLine) triggerSync(window.__APP_STATE__ || null);
      });
    }
    firebaseReady = true;
    return true;
  }

  function onAuthChanged(cb) { authListeners.add(cb); return () => authListeners.delete(cb); }
  function onOnlineChanged(cb) { bindConnectivity(); onlineListeners.add(cb); cb(navigator.onLine); return () => onlineListeners.delete(cb); }
  function onSyncChanged(cb) { syncListeners.add(cb); return () => syncListeners.delete(cb); }
  function notifySync(status) { emit(syncListeners, status); }

  function isCompactAuthEnvironment() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod|Android/i.test(ua) || window.matchMedia?.('(display-mode: standalone)').matches;
  }

  async function signInWithGoogle() {
    const status = getFirebaseConfigStatus();
    if (!status.configured || !(await initFirebase())) {
      const error = new Error('El respaldo en la nube todavía no está activo.');
      error.code = 'firebase-not-configured';
      error.firebaseStatus = status;
      throw error;
    }
    try {
      if (isCompactAuthEnvironment()) {
        await signInWithRedirect(auth, googleProvider);
        return { redirected: true };
      }
      return await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, googleProvider);
        return { redirected: true };
      }
      throw error;
    }
  }

  async function signOut() {
    if (!auth) return;
    return firebaseSignOut(auth);
  }

  function cleanForCloud(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function uploadDataUrl(uid, path, value) {
    const targetRef = ref(storage, `users/${uid}/${path}`);
    await uploadString(targetRef, value, 'data_url');
    return getDownloadURL(targetRef);
  }

  async function uploadFileIfNeeded(uid, collectionName, record, storageField) {
    if (!storage || !record[storageField]) return record[storageField];
    const value = record[storageField];
    if (typeof value !== 'string' || !value.startsWith('data:')) return value;
    return uploadDataUrl(uid, `${collectionName}/${record.id}/${storageField}-${Date.now()}`, value);
  }

  async function uploadNestedImages(uid, collectionName, record) {
    const clone = cleanForCloud(record);
    if (clone.photo) clone.photo = await uploadFileIfNeeded(uid, collectionName, clone, 'photo');
    if (clone.ticket) clone.ticket = await uploadFileIfNeeded(uid, collectionName, clone, 'ticket');
    if (clone.file && typeof clone.file === 'string' && clone.file.startsWith('data:') && storage) {
      clone.file = await uploadDataUrl(uid, `${collectionName}/${clone.id}/file-${Date.now()}`, clone.file);
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
          next.push(await uploadDataUrl(uid, `${collectionName}/${clone.id}/${parent || key}-${key}-${i}-${Date.now()}`, entry));
        } else {
          next.push(entry);
        }
      }
      if (parent && clone[parent]) clone[parent][key] = next;
      if (!parent) clone[key] = next;
    }
    if (clone.charge?.photo && storage && clone.charge.photo.startsWith('data:')) {
      clone.charge.photo = await uploadDataUrl(uid, `${collectionName}/${clone.id}/charge-photo-${Date.now()}`, clone.charge.photo);
    }
    return clone;
  }

  function userCollection(uid, collectionName) {
    return collection(firestore, 'users', uid, collectionName);
  }

  async function syncCollection(uid, collectionName, records, deletedRecords, appState) {
    const collectionRef = userCollection(uid, collectionName);
    const snapshot = await getDocs(collectionRef);
    const remoteMap = new Map();
    snapshot.forEach((entry) => remoteMap.set(entry.id, entry.data()));

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
        await setDoc(doc(collectionRef, record.id), prepared, { merge: true });
        nextRecords.push({ ...prepared, _sync: { ...prepared._sync, ownerUserId: uid, syncStatus: 'synced', synced: true, lastSyncedAt: Date.now(), conflict: null } });
        continue;
      }

      const localChangedAfterSync = localTime > syncedTime;
      const remoteChangedAfterSync = remoteTime > syncedTime;

      if (localChangedAfterSync && remoteChangedAfterSync && localTime !== remoteTime) {
        const winner = localTime >= remoteTime ? 'local' : 'remote';
        conflicts.push({ collection: collectionName, id: record.id, winner, localUpdatedAt: localTime, remoteUpdatedAt: remoteTime, detectedAt: Date.now() });
        if (winner === 'local') {
          const prepared = storage ? await uploadNestedImages(uid, collectionName, record) : cleanForCloud(record);
          await setDoc(doc(collectionRef, record.id), { ...prepared, _sync: { ...prepared._sync, ownerUserId: uid, conflict: 'resolved-local', lastConflictAt: Date.now() } }, { merge: true });
          nextRecords.push({ ...prepared, _sync: { ...prepared._sync, ownerUserId: uid, syncStatus: 'synced', synced: true, lastSyncedAt: Date.now(), conflict: 'resolved-local' } });
        } else {
          nextRecords.push({ ...remote, _sync: { ...remote._sync, ownerUserId: uid, syncStatus: 'synced', synced: true, lastSyncedAt: Date.now(), conflict: 'resolved-remote' } });
        }
        continue;
      }

      if (localTime >= remoteTime) {
        const prepared = storage ? await uploadNestedImages(uid, collectionName, record) : cleanForCloud(record);
        await setDoc(doc(collectionRef, record.id), prepared, { merge: true });
        nextRecords.push({ ...prepared, _sync: { ...prepared._sync, ownerUserId: uid, syncStatus: 'synced', synced: true, lastSyncedAt: Date.now(), conflict: null } });
      } else {
        nextRecords.push({ ...remote, _sync: { ...remote._sync, ownerUserId: uid, syncStatus: 'synced', synced: true, lastSyncedAt: Date.now(), conflict: null } });
      }
    }

    for (const [remoteId, remote] of remoteMap.entries()) {
      if (!localMap.has(remoteId)) nextRecords.push({ ...remote, _sync: { ...remote._sync, ownerUserId: uid, syncStatus: 'synced', synced: true, lastSyncedAt: Date.now(), conflict: null } });
    }

    for (const deleted of deletedRecords || []) {
      await deleteDoc(doc(collectionRef, deleted.id)).catch(() => {});
    }

    appState[collectionName] = nextRecords
      .filter((record, index, array) => array.findIndex((entry) => entry.id === record.id) === index)
      .sort((a, b) => Number(b._sync?.updatedAt || 0) - Number(a._sync?.updatedAt || 0));
    return conflicts;
  }

  async function ensureUserProfile(uid) {
    const profileRef = doc(firestore, 'users', uid);
    const profileSnapshot = await getDoc(profileRef);
    if (!profileSnapshot.exists()) {
      await setDoc(profileRef, {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        email: currentUser?.email || '',
        displayName: currentUser?.displayName || '',
      }, { merge: true });
      return;
    }
    await setDoc(profileRef, {
      updatedAt: Date.now(),
      email: currentUser?.email || profileSnapshot.data()?.email || '',
      displayName: currentUser?.displayName || profileSnapshot.data()?.displayName || '',
    }, { merge: true });
  }

  async function triggerSync(appState) {
    if (syncInFlight) return { skipped: true };
    if (!appState) return { skipped: true };
    if (!navigator.onLine) return { skipped: true, reason: 'offline' };
    const firebaseStatus = getFirebaseConfigStatus();
    if (!firebaseStatus.configured) return { skipped: true, reason: 'firebase-config', firebaseStatus };
    if (!(await initFirebase()) || !currentUser) return { skipped: true, reason: 'auth', firebaseStatus };
    syncInFlight = true;
    notifySync({ phase: 'running', at: Date.now() });
    try {
      await ensureUserProfile(currentUser.uid);
      const conflicts = [];
      for (const collectionName of CLOUD_COLLECTIONS) {
        const found = await syncCollection(currentUser.uid, collectionName, appState[collectionName] || [], appState.sync?.deletedRecords?.[collectionName] || [], appState);
        conflicts.push(...found);
      }
      appState.sync = appState.sync || {};
      appState.sync.lastSyncedAt = Date.now();
      appState.sync.lastSyncedUserId = currentUser.uid;
      appState.sync.conflicts = [...(appState.sync.conflicts || []), ...conflicts].slice(-100);
      appState.sync.deletedRecords = CLOUD_COLLECTIONS.reduce((acc, key) => ({ ...acc, [key]: [] }), {});
      await saveState(appState);
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
    initFirebase().catch((error) => console.error('Firebase init failed', error));
    return { firebaseReady, currentUser, online: navigator.onLine, coreAssets: CORE_ASSETS, firebaseStatus: getFirebaseConfigStatus() };
  }

  window.AppServices = {
    init,
    persistence: { loadState, saveState },
    auth: { signInWithGoogle, signOut, onAuthChanged, getCurrentUser: () => currentUser, isReady: () => firebaseReady },
    firebase: {
      getStatus: getFirebaseConfigStatus,
      getServices: () => ({ app: firebaseApp, auth, firestore, storage }),
    },
    sync: { triggerSync, onSyncChanged },
    connectivity: { onChange: onOnlineChanged, isOnline: () => navigator.onLine },
    constants: { CORE_ASSETS, CLOUD_COLLECTIONS }
  };
})();
