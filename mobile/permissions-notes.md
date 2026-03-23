# Preparación de permisos móviles

Esta base web sigue funcionando en Netlify sin depender de Capacitor.

Si después se empaqueta como app móvil, ya queda preparada la estructura inicial para estos permisos contextuales:

- **Ubicación:** solicitar solo cuando la usuaria toque la acción para usar su ubicación.
- **Cámara:** solicitar solo al tomar una foto.
- **Fotos/Galería:** solicitar solo al elegir una imagen existente.

## Android

Agregar estos permisos al `AndroidManifest.xml` del contenedor móvil:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

Para compatibilidad con Android antiguos, usar también:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

## iOS

Agregar descripciones claras en `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>La ubicación se usa solo cuando decides registrar tu ubicación en un formulario.</string>
<key>NSCameraUsageDescription</key>
<string>La cámara se usa solo cuando decides tomar una foto dentro de la app.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Las fotos se usan solo cuando decides adjuntar una imagen existente.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>La app puede guardar imágenes generadas o evidencias si así lo decides.</string>
```

## Comportamiento esperado

- Web/PWA: la solicitud de permiso ocurre al usar la función correspondiente.
- App móvil empaquetada: mantener el mismo patrón contextual, nunca pedir todos los permisos al abrir la app.
