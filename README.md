# App Rural

Aplicación web estática para captura local de información de productores, animales, medicamentos, insumos y procedimientos.

## Deploy en Netlify

Este proyecto está listo para desplegarse como sitio estático en Netlify.

### Opción 1: desplegar desde Git
1. Sube esta rama al repositorio remoto.
2. En Netlify, crea un sitio nuevo desde Git.
3. Usa estos valores:
   - **Build command:** dejar vacío.
   - **Publish directory:** `.`
4. Publica el sitio.

### Opción 2: deploy manual
1. Comprime estos archivos:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `netlify.toml`
2. Arrástralos al panel de Netlify Drop.

## Desarrollo local

Puedes abrir `index.html` directamente en el navegador o levantar un servidor estático simple.

Ejemplo con Python:

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080`.
