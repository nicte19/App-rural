# App Rural consolidada

Aplicación estática lista para Netlify para captura y seguimiento de productores(as), animales, medicamentos, vacunas, insumos, procedimientos veterinarios, pruebas de laboratorio, cobros, evidencias y exportaciones Word/Excel.

## Arquitectura V2 offline-first

- **Persistencia local principal:** IndexedDB mediante `app-services.js`, con respaldo compatible en `localStorage` para migración y contingencia.
- **Sincronización en la nube:** Firebase Firestore por usuario autenticado.
- **Autenticación:** Google Sign-In con Firebase Auth.
- **Archivos pesados:** Firebase Storage cuando exista configuración activa.
- **PWA:** `manifest.webmanifest` + `service-worker.js` para instalación y caché offline del shell.
- **Compatibilidad Netlify:** rutas relativas (`./archivo`) para seguir desplegando como sitio estático.

## Configuración de Firebase

1. Crea un proyecto Firebase.
2. Edita `firebase-config.js` y reemplaza `null` por un objeto como este:

```js
window.APP_FIREBASE_CONFIG = {
  apiKey: '... ',
  authDomain: '... ',
  projectId: '... ',
  storageBucket: '... ',
  messagingSenderId: '... ',
  appId: '... '
};
```

3. Habilita **Google** en Firebase Authentication.
4. Crea reglas por usuario para Firestore/Storage basadas en `request.auth.uid`.

## Estrategia de sincronización

- Cada registro conserva `id` estable y bloque `_sync` con `createdAt`, `updatedAt`, `syncStatus`, `lastSyncedAt`, `ownerUserId`, `version` y `conflict`.
- Eliminaciones se guardan en `state.sync.deletedRecords` para borrar en la nube cuando vuelva la conexión.
- Resolución de conflictos: **last write wins** con timestamps, dejando trazabilidad en `state.sync.conflicts`.
- Las exportaciones Word/Excel siguen funcionando localmente y no dependen de Firebase.
