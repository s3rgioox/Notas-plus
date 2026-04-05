// ════════════════════════════════════════════
//  NOTAS PLUS — Firebase + Auth + Firestore
// ════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Configuración Firebase ───────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBzVGeqtYAVN4IyGPvv4AQLg4WrOr4VbMA",
  authDomain: "notas-plus-43625.firebaseapp.com",
  projectId: "notas-plus-43625",
  storageBucket: "notas-plus-43625.firebasestorage.app",
  messagingSenderId: "306439203801",
  appId: "1:306439203801:web:401f0e208467602d9f87c8"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Estado ──────────────────────────────────
let currentUser   = null;
let notes         = [];
let editingId     = null;
let currentFilter = 'all';
let selectedColor = 'white';
let alarmTimers   = {};
let unsubscribeNotes = null;

// ── DOM ──────────────────────────────────────
const authScreen    = document.getElementById('auth-screen');
const appScreen     = document.getElementById('app-screen');
const authError     = document.getElementById('auth-error');
const authLoading   = document.getElementById('auth-loading');

// Auth
const tabLogin      = document.getElementById('tab-login');
const tabRegister   = document.getElementById('tab-register');
const formLogin     = document.getElementById('form-login');
const formRegister  = document.getElementById('form-register');
const loginEmail    = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const regName       = document.getElementById('reg-name');
const regEmail      = document.getElementById('reg-email');
const regPassword   = document.getElementById('reg-password');
const btnLogin      = document.getElementById('btn-login');
const btnRegister   = document.getElementById('btn-register');
const btnForgot     = document.getElementById('btn-forgot');
const btnLogout     = document.getElementById('btn-logout');
const userBtn       = document.getElementById('user-btn');
const userDropdown  = document.getElementById('user-dropdown');
const userAvatar    = document.getElementById('user-avatar');
const userNameDisp  = document.getElementById('user-name-display');
const userEmailDisp = document.getElementById('user-email-display');

// App
const notesGrid     = document.getElementById('notes-grid');
const emptyState    = document.getElementById('empty-state');
const fab           = document.getElementById('fab');
const modalOverlay  = document.getElementById('modal-overlay');
const modalTitleEl  = document.getElementById('modal-title');
const inputTitle    = document.getElementById('input-title');
const inputDesc     = document.getElementById('input-desc');
const toggleReminder= document.getElementById('toggle-reminder');
const reminderFields= document.getElementById('reminder-fields');
const inputDate     = document.getElementById('input-date');
const inputTime     = document.getElementById('input-time');
const reminderHint  = document.getElementById('reminder-hint');
const btnSave       = document.getElementById('btn-save');
const btnSaveText   = document.getElementById('btn-save-text');
const saveSpinner   = document.getElementById('save-spinner');
const btnCancel     = document.getElementById('btn-cancel');
const modalClose    = document.getElementById('modal-close');
const detailOverlay = document.getElementById('detail-overlay');
const detailClose   = document.getElementById('detail-close');
const detailEdit    = document.getElementById('detail-edit');
const detailDelete  = document.getElementById('detail-delete');
const detailDone    = document.getElementById('detail-done');
const alarmOverlay  = document.getElementById('alarm-overlay');
const alarmDismiss  = document.getElementById('alarm-dismiss');
const toast         = document.getElementById('toast');

// ══════════════════════════════════════════════
//  UTILIDADES
// ══════════════════════════════════════════════
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDatetime(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function isToday(isoOrTs) {
  const d = isoOrTs?.toDate ? isoOrTs.toDate() : new Date(isoOrTs);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isOverdue(iso) { return new Date(iso) < new Date(); }

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function showError(msg) {
  authError.textContent = msg;
  authError.classList.add('visible');
}

function clearError() { authError.classList.remove('visible'); }

function setLoading(on) {
  authLoading.classList.toggle('hidden', !on);
}

// ══════════════════════════════════════════════
//  AUTH — Pantalla / estado
// ══════════════════════════════════════════════
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    authScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    // Mostrar info usuario
    const name = user.displayName || user.email.split('@')[0];
    userAvatar.textContent = name.charAt(0).toUpperCase();
    userNameDisp.textContent = user.displayName || name;
    userEmailDisp.textContent = user.email;
    // Suscribirse a las notas del usuario
    subscribeNotes();
  } else {
    currentUser = null;
    authScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    // Limpiar notas
    if (unsubscribeNotes) { unsubscribeNotes(); unsubscribeNotes = null; }
    notes = [];
    render();
  }
});

// ── Tabs auth ──
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.classList.remove('hidden');
  formRegister.classList.add('hidden');
  clearError();
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.classList.remove('hidden');
  formLogin.classList.add('hidden');
  clearError();
});

// ── Login ──
btnLogin.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;
  if (!email || !pass) { showError('Rellena todos los campos'); return; }
  clearError(); setLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    setLoading(false);
    showError(authErrorMsg(e.code));
  }
});

// ── Registro ──
btnRegister.addEventListener('click', async () => {
  const name  = regName.value.trim();
  const email = regEmail.value.trim();
  const pass  = regPassword.value;
  if (!name || !email || !pass) { showError('Rellena todos los campos'); return; }
  if (pass.length < 6) { showError('La contraseña debe tener al menos 6 caracteres'); return; }
  clearError(); setLoading(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
  } catch(e) {
    setLoading(false);
    showError(authErrorMsg(e.code));
  }
});

// ── Olvidé contraseña ──
btnForgot.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  if (!email) { showError('Escribe tu correo arriba primero'); return; }
  clearError(); setLoading(true);
  try {
    await sendPasswordResetEmail(auth, email);
    setLoading(false);
    showToast('📧 Email de recuperación enviado');
    authError.textContent = '✓ Revisa tu correo para restablecer la contraseña';
    authError.style.color = '#2ca562';
    authError.style.background = '#f0faf4';
    authError.style.borderColor = '#a8e6bf';
    authError.classList.add('visible');
    setTimeout(() => { authError.classList.remove('visible'); authError.style = ''; }, 5000);
  } catch(e) {
    setLoading(false);
    showError(authErrorMsg(e.code));
  }
});

// ── Logout ──
btnLogout.addEventListener('click', async () => {
  await signOut(auth);
  userDropdown.classList.add('hidden');
  showToast('Sesión cerrada');
});

// ── User menu dropdown ──
userBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('hidden');
});
document.addEventListener('click', () => userDropdown.classList.add('hidden'));

// Enter en auth forms
loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') btnLogin.click(); });
regPassword.addEventListener('keydown', e => { if (e.key === 'Enter') btnRegister.click(); });

function authErrorMsg(code) {
  const msgs = {
    'auth/invalid-email':          'Correo electrónico inválido',
    'auth/user-not-found':         'No existe una cuenta con ese correo',
    'auth/wrong-password':         'Contraseña incorrecta',
    'auth/invalid-credential':     'Correo o contraseña incorrectos',
    'auth/email-already-in-use':   'Ya existe una cuenta con ese correo',
    'auth/weak-password':          'La contraseña es demasiado débil',
    'auth/too-many-requests':      'Demasiados intentos. Espera un momento',
    'auth/network-request-failed': 'Error de conexión. Comprueba tu internet',
  };
  return msgs[code] || 'Error al autenticar. Inténtalo de nuevo';
}

// ══════════════════════════════════════════════
//  FIRESTORE — Suscripción en tiempo real
// ══════════════════════════════════════════════
function subscribeNotes() {
  if (!currentUser) return;
  const q = query(
    collection(db, 'users', currentUser.uid, 'notes'),
    orderBy('createdAt', 'desc')
  );
  unsubscribeNotes = onSnapshot(q, snapshot => {
    notes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
    scheduleAllAlarms();
  });
}

function notesRef() {
  return collection(db, 'users', currentUser.uid, 'notes');
}

function noteRef(id) {
  return doc(db, 'users', currentUser.uid, 'notes', id);
}

// ══════════════════════════════════════════════
//  ESTADÍSTICAS
// ══════════════════════════════════════════════
function updateStats() {
  const total   = notes.length;
  const pending = notes.filter(n => !n.done).length;
  const todayN  = notes.filter(n => n.reminder && isToday(n.reminder)).length;
  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-today').textContent   = todayN;
}

// ══════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════
function filteredNotes() {
  switch (currentFilter) {
    case 'pending': return notes.filter(n => !n.done);
    case 'done':    return notes.filter(n =>  n.done);
    default:        return [...notes];
  }
}

function render() {
  const list = filteredNotes();
  updateStats();
  if (!list.length) {
    emptyState.classList.add('visible');
    notesGrid.innerHTML = '';
    return;
  }
  emptyState.classList.remove('visible');
  notesGrid.innerHTML = list.map(note => {
    const hasReminder = !!note.reminder;
    const over = hasReminder && isOverdue(note.reminder) && !note.done;
    const reminderBadge = hasReminder
      ? `<span class="note-reminder-badge ${over ? 'overdue' : ''}">${over ? '⚠' : '🔔'} ${fmtReminderShort(note.reminder)}</span>`
      : '';
    return `<div class="note-card ${note.done ? 'done' : ''}" data-id="${note.id}" data-color="${note.color || 'white'}">
      <div class="note-card-top">
        <span class="note-title">${escHtml(note.title)}</span>
        <button class="note-check ${note.done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleDone('${note.id}', ${!note.done})"></button>
      </div>
      ${note.desc ? `<p class="note-desc">${escHtml(note.desc)}</p>` : ''}
      <div class="note-footer">
        ${reminderBadge}
        <span class="note-date">${note.createdAt ? formatDate(note.createdAt) : ''}</span>
      </div>
    </div>`;
  }).join('');
  notesGrid.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function fmtReminderShort(iso) {
  const d = new Date(iso);
  if (isToday(iso)) return 'Hoy ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString())
    return 'Mañana ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ══════════════════════════════════════════════
//  TOGGLE DONE
// ══════════════════════════════════════════════
async function toggleDone(id, done) {
  try {
    await updateDoc(noteRef(id), { done, updatedAt: serverTimestamp() });
    showToast(done ? '✓ Nota completada' : 'Nota reabierta');
  } catch(e) { showToast('Error al actualizar'); }
}
window.toggleDone = toggleDone;

// ══════════════════════════════════════════════
//  MODAL CREAR / EDITAR
// ══════════════════════════════════════════════
function openModal(id = null) {
  editingId = id;
  selectedColor = 'white';
  if (id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    modalTitleEl.textContent = 'Editar nota';
    inputTitle.value = note.title;
    inputDesc.value  = note.desc || '';
    selectedColor    = note.color || 'white';
    if (note.reminder) {
      toggleReminder.checked = true;
      reminderFields.classList.add('visible');
      const d = new Date(note.reminder);
      inputDate.value = d.toISOString().slice(0, 10);
      inputTime.value = d.toTimeString().slice(0, 5);
      updateHint();
    } else {
      toggleReminder.checked = false;
      reminderFields.classList.remove('visible');
      inputDate.value = ''; inputTime.value = '';
    }
  } else {
    modalTitleEl.textContent = 'Nueva nota';
    inputTitle.value = ''; inputDesc.value = '';
    toggleReminder.checked = false;
    reminderFields.classList.remove('visible');
    inputDate.value = ''; inputTime.value = '';
    reminderHint.textContent = '';
  }
  inputDate.min = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('.color-dot').forEach(d => d.classList.toggle('active', d.dataset.color === selectedColor));
  modalOverlay.classList.add('open');
  setTimeout(() => inputTitle.focus(), 300);
}

function closeModal() { modalOverlay.classList.remove('open'); editingId = null; }

function updateHint() {
  if (!inputDate.value || !inputTime.value) { reminderHint.textContent = ''; return; }
  const dt = new Date(inputDate.value + 'T' + inputTime.value);
  if (isNaN(dt)) { reminderHint.textContent = ''; return; }
  const diffMs = dt - Date.now();
  if (diffMs < 0) { reminderHint.textContent = '⚠ Esta fecha ya pasó'; return; }
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  let txt = '🔔 Recordatorio en ';
  if (days > 0) txt += days + (days === 1 ? ' día' : ' días');
  else if (hours > 0) txt += hours + (hours === 1 ? ' hora' : ' horas');
  else txt += mins + ' min';
  reminderHint.textContent = txt;
}

async function saveNote() {
  const title = inputTitle.value.trim();
  if (!title) { inputTitle.focus(); inputTitle.style.borderColor = '#e74c3c'; setTimeout(() => inputTitle.style.borderColor = '', 1500); return; }

  let reminder = null;
  if (toggleReminder.checked && inputDate.value && inputTime.value) {
    const dt = new Date(inputDate.value + 'T' + inputTime.value);
    if (!isNaN(dt)) reminder = dt.toISOString();
  }

  // UI loading
  btnSaveText.textContent = 'Guardando...';
  saveSpinner.classList.remove('hidden');
  btnSave.disabled = true;

  try {
    if (editingId) {
      await updateDoc(noteRef(editingId), {
        title, desc: inputDesc.value.trim(), color: selectedColor, reminder,
        updatedAt: serverTimestamp()
      });
      showToast('✏️ Nota actualizada');
    } else {
      await addDoc(notesRef(), {
        title, desc: inputDesc.value.trim(), color: selectedColor, reminder,
        done: false, createdAt: serverTimestamp(), updatedAt: null
      });
      showToast('🌿 Nota creada');
    }
    closeModal();
  } catch(e) {
    showToast('Error al guardar. Comprueba tu conexión');
  } finally {
    btnSaveText.textContent = 'Guardar nota';
    saveSpinner.classList.add('hidden');
    btnSave.disabled = false;
  }
}

// ══════════════════════════════════════════════
//  MODAL DETALLE
// ══════════════════════════════════════════════
let detailId = null;

function openDetail(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  detailId = id;
  document.getElementById('detail-badge').textContent = note.done ? '✓ Completada' : 'Pendiente';
  document.getElementById('detail-title').textContent = note.title;
  document.getElementById('detail-desc').textContent  = note.desc || '';
  const reminderEl = document.getElementById('detail-reminder');
  if (note.reminder) {
    const over = isOverdue(note.reminder) && !note.done;
    reminderEl.classList.add('visible');
    reminderEl.classList.toggle('overdue', over);
    reminderEl.textContent = (over ? '⚠ Vencido: ' : '🔔 Recordatorio: ') + formatDatetime(note.reminder);
  } else { reminderEl.classList.remove('visible'); }
  document.getElementById('detail-meta').textContent = note.createdAt ? 'Creada el ' + formatDatetime(note.createdAt) : '';
  detailDone.textContent = note.done ? '↩ Marcar como pendiente' : '✓ Marcar como completada';
  detailDone.classList.toggle('done-state', !note.done);
  detailOverlay.classList.add('open');
}

function closeDetail() { detailOverlay.classList.remove('open'); detailId = null; }

// ══════════════════════════════════════════════
//  ALARMAS
// ══════════════════════════════════════════════
function scheduleAllAlarms() {
  Object.values(alarmTimers).forEach(clearTimeout);
  alarmTimers = {};
  notes.forEach(note => {
    if (!note.reminder || note.done) return;
    const diffMs = new Date(note.reminder) - Date.now();
    if (diffMs <= 0) return;
    alarmTimers[note.id] = setTimeout(() => triggerAlarm(note), diffMs);
  });
}

function triggerAlarm(note) {
  document.getElementById('alarm-title').textContent = note.title;
  document.getElementById('alarm-desc').textContent  = note.desc?.slice(0, 100) || 'Es hora de tu recordatorio';
  alarmOverlay.style.display = 'flex';
  alarmOverlay.classList.add('open');
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('⏰ ' + note.title, { body: note.desc || 'Recordatorio de Notas Plus', icon: 'icons/icon-192.png', tag: note.id });
  }
  if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
}

alarmDismiss.addEventListener('click', () => { alarmOverlay.style.display = 'none'; alarmOverlay.classList.remove('open'); });

async function requestNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ══════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════
fab.addEventListener('click', () => openModal());
btnSave.addEventListener('click', saveNote);
btnCancel.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
inputTitle.addEventListener('keydown', e => { if (e.key === 'Enter') saveNote(); });

toggleReminder.addEventListener('change', () => {
  if (toggleReminder.checked) {
    reminderFields.classList.add('visible');
    requestNotifications();
    if (!inputDate.value) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
      inputDate.value = tomorrow.toISOString().slice(0, 10);
      inputTime.value = '09:00';
      updateHint();
    }
  } else { reminderFields.classList.remove('visible'); reminderHint.textContent = ''; }
});

inputDate.addEventListener('change', updateHint);
inputTime.addEventListener('change', updateHint);

document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    selectedColor = dot.dataset.color;
  });
});

document.querySelectorAll('.btn-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

detailClose.addEventListener('click', closeDetail);
detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) closeDetail(); });

detailEdit.addEventListener('click', () => { const id = detailId; closeDetail(); openModal(id); });

detailDelete.addEventListener('click', async () => {
  if (!detailId) return;
  if (!confirm('¿Eliminar esta nota?')) return;
  try {
    await deleteDoc(noteRef(detailId));
    closeDetail();
    showToast('🗑️ Nota eliminada');
  } catch(e) { showToast('Error al eliminar'); }
});

detailDone.addEventListener('click', () => {
  if (!detailId) return;
  const note = notes.find(n => n.id === detailId);
  if (note) toggleDone(detailId, !note.done);
  closeDetail();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeDetail(); alarmOverlay.style.display = 'none'; }
});

// ── Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
