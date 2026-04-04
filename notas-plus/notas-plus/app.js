/* ════════════════════════════════════════════
   NOTAS PLUS — Lógica principal
   Almacenamiento: localStorage
   Notificaciones: Web Notifications API
   ════════════════════════════════════════════ */

'use strict';

// ── Estado ──────────────────────────────────
let notes = JSON.parse(localStorage.getItem('notasplus-notes') || '[]');
let editingId = null;
let currentFilter = 'all';
let selectedColor = 'white';
let alarmTimers = {};

// ── DOM ──────────────────────────────────────
const notesGrid     = document.getElementById('notes-grid');
const emptyState    = document.getElementById('empty-state');
const fab           = document.getElementById('fab');
const modalOverlay  = document.getElementById('modal-overlay');
const modal         = document.getElementById('modal');
const modalTitleEl  = document.getElementById('modal-title');
const inputTitle    = document.getElementById('input-title');
const inputDesc     = document.getElementById('input-desc');
const toggleReminder= document.getElementById('toggle-reminder');
const reminderFields= document.getElementById('reminder-fields');
const inputDate     = document.getElementById('input-date');
const inputTime     = document.getElementById('input-time');
const reminderHint  = document.getElementById('reminder-hint');
const btnSave       = document.getElementById('btn-save');
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
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function save() {
  localStorage.setItem('notasplus-notes', JSON.stringify(notes));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDatetime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function isOverdue(iso) {
  return new Date(iso) < new Date();
}

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
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
//  RENDER NOTAS
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
      ? `<span class="note-reminder-badge ${over ? 'overdue' : ''}">
           ${over ? '⚠' : '🔔'} ${fmtReminderShort(note.reminder)}
         </span>`
      : '';

    return `<div class="note-card ${note.done ? 'done' : ''}"
                 data-id="${note.id}"
                 data-color="${note.color || 'white'}">
      <div class="note-card-top">
        <span class="note-title">${escHtml(note.title)}</span>
        <button class="note-check ${note.done ? 'checked' : ''}"
                data-id="${note.id}"
                title="${note.done ? 'Marcar pendiente' : 'Marcar hecha'}"
                onclick="event.stopPropagation(); toggleDone('${note.id}')">
        </button>
      </div>
      ${note.desc ? `<p class="note-desc">${escHtml(note.desc)}</p>` : ''}
      <div class="note-footer">
        ${reminderBadge}
        <span class="note-date">${formatDate(note.createdAt)}</span>
      </div>
    </div>`;
  }).join('');

  // Click en card → detalle
  notesGrid.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function fmtReminderShort(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d - now;

  if (isToday(iso)) {
    return 'Hoy ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getFullYear() === tomorrow.getFullYear()
    && d.getMonth() === tomorrow.getMonth()
    && d.getDate() === tomorrow.getDate()) {
    return 'Mañana ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function escHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════
//  TOGGLE DONE
// ══════════════════════════════════════════════
function toggleDone(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  note.done = !note.done;
  save();
  render();
  showToast(note.done ? '✓ Nota completada' : 'Nota reabierta');
}

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
      inputDate.value = '';
      inputTime.value = '';
    }
  } else {
    modalTitleEl.textContent = 'Nueva nota';
    inputTitle.value = '';
    inputDesc.value  = '';
    toggleReminder.checked = false;
    reminderFields.classList.remove('visible');
    inputDate.value = '';
    inputTime.value = '';
    reminderHint.textContent = '';
  }

  // Poner fecha mínima = hoy
  const today = new Date();
  inputDate.min = today.toISOString().slice(0, 10);

  // Actualizar color picker
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.color === selectedColor);
  });

  modalOverlay.classList.add('open');
  setTimeout(() => inputTitle.focus(), 300);
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

function updateHint() {
  if (!inputDate.value || !inputTime.value) {
    reminderHint.textContent = '';
    return;
  }
  const dt = new Date(inputDate.value + 'T' + inputTime.value);
  if (isNaN(dt)) { reminderHint.textContent = ''; return; }

  const now   = new Date();
  const diffMs = dt - now;

  if (diffMs < 0) {
    reminderHint.textContent = '⚠ Esta fecha ya pasó';
    return;
  }
  const mins  = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  let txt = '🔔 Recordatorio en ';
  if (days > 0) txt += days + (days === 1 ? ' día' : ' días');
  else if (hours > 0) txt += hours + (hours === 1 ? ' hora' : ' horas');
  else txt += mins + ' min';

  reminderHint.textContent = txt;
}

function saveNote() {
  const title = inputTitle.value.trim();
  if (!title) {
    inputTitle.focus();
    inputTitle.style.borderColor = '#e74c3c';
    setTimeout(() => inputTitle.style.borderColor = '', 1500);
    return;
  }

  let reminder = null;
  if (toggleReminder.checked && inputDate.value && inputTime.value) {
    const dt = new Date(inputDate.value + 'T' + inputTime.value);
    if (!isNaN(dt)) reminder = dt.toISOString();
  }

  if (editingId) {
    const note = notes.find(n => n.id === editingId);
    if (note) {
      note.title    = title;
      note.desc     = inputDesc.value.trim();
      note.color    = selectedColor;
      note.reminder = reminder;
      note.updatedAt = new Date().toISOString();
    }
    showToast('✏️ Nota actualizada');
  } else {
    const note = {
      id:        uid(),
      title,
      desc:      inputDesc.value.trim(),
      color:     selectedColor,
      reminder,
      done:      false,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
    notes.unshift(note);
    showToast('🌿 Nota creada');
  }

  save();
  closeModal();
  render();
  scheduleAllAlarms();
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
  } else {
    reminderEl.classList.remove('visible');
  }

  const createdStr = 'Creada el ' + formatDatetime(note.createdAt);
  const updatedStr = note.updatedAt ? ' · Editada el ' + formatDatetime(note.updatedAt) : '';
  document.getElementById('detail-meta').textContent = createdStr + updatedStr;

  detailDone.textContent = note.done ? '↩ Marcar como pendiente' : '✓ Marcar como completada';
  detailDone.classList.toggle('done-state', !note.done);

  detailOverlay.classList.add('open');
}

function closeDetail() {
  detailOverlay.classList.remove('open');
  detailId = null;
}

// ══════════════════════════════════════════════
//  ALARMAS / RECORDATORIOS
// ══════════════════════════════════════════════
function scheduleAllAlarms() {
  // Limpiar timers anteriores
  Object.values(alarmTimers).forEach(clearTimeout);
  alarmTimers = {};

  notes.forEach(note => {
    if (!note.reminder || note.done) return;
    const dt    = new Date(note.reminder);
    const diffMs = dt - Date.now();
    if (diffMs <= 0) return; // ya pasó

    alarmTimers[note.id] = setTimeout(() => {
      triggerAlarm(note);
    }, diffMs);
  });
}

function triggerAlarm(note) {
  // Mostrar modal de alarma
  document.getElementById('alarm-title').textContent = note.title;
  document.getElementById('alarm-desc').textContent  =
    note.desc ? note.desc.slice(0, 100) + (note.desc.length > 100 ? '…' : '') : 'Es hora de tu recordatorio';
  alarmOverlay.style.display = 'flex';
  alarmOverlay.classList.add('open');

  // Intentar notificación del sistema
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('⏰ ' + note.title, {
      body: note.desc || 'Recordatorio de Notas Plus',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: note.id
    });
  }

  // Vibrar (móvil)
  if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
}

alarmDismiss.addEventListener('click', () => {
  alarmOverlay.style.display = 'none';
  alarmOverlay.classList.remove('open');
});

// Pedir permiso de notificaciones
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') showToast('🔔 Notificaciones activadas');
  }
}

// ══════════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════════

// FAB
fab.addEventListener('click', () => openModal());

// Modal crear/editar
btnSave.addEventListener('click', saveNote);
btnCancel.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Enter en título → guardar
inputTitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveNote();
});

// Toggle recordatorio
toggleReminder.addEventListener('change', () => {
  if (toggleReminder.checked) {
    reminderFields.classList.add('visible');
    requestNotificationPermission();
    // Prellenar fecha/hora si está vacía
    if (!inputDate.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      inputDate.value = tomorrow.toISOString().slice(0, 10);
      inputTime.value = '09:00';
      updateHint();
    }
  } else {
    reminderFields.classList.remove('visible');
    reminderHint.textContent = '';
  }
});

inputDate.addEventListener('change', updateHint);
inputTime.addEventListener('change', updateHint);

// Color picker
document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    selectedColor = dot.dataset.color;
  });
});

// Filtros
document.querySelectorAll('.btn-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Modal detalle
detailClose.addEventListener('click', closeDetail);
detailOverlay.addEventListener('click', (e) => {
  if (e.target === detailOverlay) closeDetail();
});

detailEdit.addEventListener('click', () => {
  const id = detailId;
  closeDetail();
  openModal(id);
});

detailDelete.addEventListener('click', () => {
  if (!detailId) return;
  if (!confirm('¿Eliminar esta nota?')) return;
  notes = notes.filter(n => n.id !== detailId);
  save();
  closeDetail();
  render();
  scheduleAllAlarms();
  showToast('🗑️ Nota eliminada');
});

detailDone.addEventListener('click', () => {
  if (!detailId) return;
  toggleDone(detailId);
  closeDetail();
});

// Cerrar modales con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeDetail();
    alarmOverlay.style.display = 'none';
  }
});

// ══════════════════════════════════════════════
//  SERVICE WORKER
// ══════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.log('SW error:', err));
  });
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
render();
scheduleAllAlarms();

// Verificar alarmas perdidas al cargar
notes.forEach(note => {
  if (note.reminder && !note.done) {
    const dt = new Date(note.reminder);
    const diffMs = dt - Date.now();
    // Si venció en los últimos 10 minutos, mostrar alerta
    if (diffMs < 0 && diffMs > -600000) {
      setTimeout(() => triggerAlarm(note), 1000);
    }
  }
});
