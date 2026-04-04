# 🌿 Notas Plus

App de notas y recordatorios. Minimalista, rápida, sin servidores. Funciona en PC, iPhone y Android.

## ✨ Características

- Crear notas con título, descripción y color
- Recordatorios con fecha y hora exacta
- Avisos visuales (y notificaciones del sistema si se conceden permisos)
- Filtros: Todas / Pendientes / Completadas
- Datos guardados localmente en el dispositivo
- **Funciona offline** (PWA)
- Instalable en iPhone/Android como app nativa

---

## 🖥️ Usar en PC (local)

### Opción A — Sin servidor (más simple)
Abre `index.html` directamente en Chrome o Edge. El Service Worker no funcionará offline, pero todo lo demás sí.

### Opción B — Con servidor local (recomendada, activa todas las funciones PWA)

Necesitas Node.js o Python instalado:

```bash
# Con Python (viene preinstalado en Mac/Linux):
python3 -m http.server 8080

# Con Node.js:
npx serve .

# Luego abre en el navegador:
# http://localhost:8080
```

---

## 📱 Instalar en iPhone (iOS)

1. Sube el proyecto a GitHub Pages (ver abajo) o usa un servidor local en tu red
2. Abre la URL en **Safari** (obligatorio en iOS)
3. Toca el botón **Compartir** (□↑)
4. Selecciona **"Añadir a pantalla de inicio"**
5. ¡Listo! Aparece como app nativa con icono propio

> **Nota sobre notificaciones iOS**: Safari en iOS permite recordatorios visuales dentro de la app, pero las notificaciones push nativas requieren iOS 16.4+ y que la app esté instalada en pantalla de inicio.

---

## 🌐 Publicar en GitHub Pages (gratis)

### Paso 1 — Crear repositorio en GitHub
```bash
git init
git add .
git commit -m "🌿 Notas Plus v1"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/notas-plus.git
git push -u origin main
```

### Paso 2 — Activar GitHub Pages
1. Ve a tu repositorio → **Settings** → **Pages**
2. En "Source" selecciona **GitHub Actions**
3. El workflow `.github/workflows/deploy.yml` ya está incluido
4. Cada `git push` desplegará automáticamente

Tu app estará en: `https://TU_USUARIO.github.io/notas-plus/`

---

## 📁 Estructura del proyecto

```
notas-plus/
├── index.html          # App principal
├── style.css           # Estilos (blanco + verde)
├── app.js              # Lógica, notas, recordatorios
├── sw.js               # Service Worker (offline)
├── manifest.json       # Configuración PWA
├── icons/
│   ├── icon-192.png    # Icono para dispositivos
│   └── icon-512.png    # Icono para splash screen
├── .github/
│   └── workflows/
│       └── deploy.yml  # Auto-deploy a GitHub Pages
└── README.md
```

---

## 💾 Almacenamiento

Los datos se guardan en `localStorage` del navegador — no hay servidor, todo es local. Si quieres sincronización entre dispositivos en el futuro, se puede añadir Firebase o Supabase como backend.

---

## 🛠️ Tecnologías

- HTML5 + CSS3 + JavaScript vanilla
- PWA (Progressive Web App)
- Web Notifications API
- Service Worker (cache offline)
- LocalStorage (persistencia de datos)
