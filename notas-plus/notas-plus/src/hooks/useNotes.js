import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'notas-plus-data';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveData(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// Solicitar permiso de notificaciones
async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Programar notificación nativa
function scheduleNotification(note) {
  if (!note.reminder || !note.reminderDate) return;
  const triggerTime = new Date(note.reminderDate).getTime();
  const delay = triggerTime - Date.now();
  if (delay <= 0) return;
  if (delay > 2147483647) return; // máximo setTimeout

  // Usar Service Worker si disponible (más fiable en iOS)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      id: note.id,
      title: `🔔 ${note.title}`,
      body: note.description || 'Tienes un recordatorio pendiente',
      triggerTime
    });
    return;
  }

  // Fallback: setTimeout
  return setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification(`🔔 ${note.title}`, {
        body: note.description || 'Tienes un recordatorio pendiente',
        icon: '/icon-192.png',
        tag: note.id
      });
    }
  }, delay);
}

export function useNotes() {
  const [notes, setNotes]         = useState(loadData);
  const [notifAllowed, setNotifAllowed] = useState(Notification?.permission === 'granted');
  const timerRefs = useRef({});

  // Persistir
  useEffect(() => { saveData(notes); }, [notes]);

  // Programar notificaciones al cargar
  useEffect(() => {
    if (notifAllowed) {
      notes.forEach(n => {
        if (n.reminder && n.reminderDate && !n.reminded) {
          const ref = scheduleNotification(n);
          if (ref) timerRefs.current[n.id] = ref;
        }
      });
    }
    return () => {
      Object.values(timerRefs.current).forEach(clearTimeout);
    };
    // eslint-disable-next-line
  }, [notifAllowed]);

  const askNotifPermission = useCallback(async () => {
    const ok = await requestNotifPermission();
    setNotifAllowed(ok);
    return ok;
  }, []);

  const addNote = useCallback((data) => {
    const note = {
      id: uuidv4(),
      title: data.title.trim(),
      description: data.description?.trim() || '',
      color: data.color || 'green',
      reminder: data.reminder || false,
      reminderDate: data.reminderDate || null,
      reminded: false,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setNotes(prev => [note, ...prev]);
    if (note.reminder && note.reminderDate && notifAllowed) {
      const ref = scheduleNotification(note);
      if (ref) timerRefs.current[note.id] = ref;
    }
    return note;
  }, [notifAllowed]);

  const updateNote = useCallback((id, data) => {
    // Cancelar timer anterior si existe
    if (timerRefs.current[id]) {
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
    }
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const updated = { ...n, ...data, updatedAt: new Date().toISOString() };
      if (updated.reminder && updated.reminderDate && notifAllowed) {
        const ref = scheduleNotification(updated);
        if (ref) timerRefs.current[id] = ref;
      }
      return updated;
    }));
  }, [notifAllowed]);

  const deleteNote = useCallback((id) => {
    if (timerRefs.current[id]) {
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const togglePin = useCallback((id) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, pinned: !n.pinned } : n
    ));
  }, []);

  const toggleReminder = useCallback((id) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, reminder: !n.reminder } : n
    ));
  }, []);

  // Notas ordenadas: primero fijadas, luego por fecha
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const notesWithReminder  = notes.filter(n => n.reminder && n.reminderDate);
  const upcomingReminders  = notesWithReminder.filter(n => new Date(n.reminderDate) > new Date());

  return {
    notes: sortedNotes,
    notifAllowed,
    upcomingReminders,
    askNotifPermission,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    toggleReminder
  };
}
