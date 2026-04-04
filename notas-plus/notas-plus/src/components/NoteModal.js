import React, { useState, useEffect, useRef } from 'react';
import './NoteModal.css';

const COLORS = [
  { id: 'green', label: 'Verde',  bg: '#f0f9f0', border: '#b4e0b4' },
  { id: 'sage',  label: 'Salvia', bg: '#f5f9f3', border: '#cde3c7' },
  { id: 'sky',   label: 'Cielo',  bg: '#f3f7fb', border: '#c2d9ef' },
  { id: 'sand',  label: 'Arena',  bg: '#faf8f3', border: '#e8dfc5' },
  { id: 'rose',  label: 'Rosa',   bg: '#fdf4f4', border: '#f0cece' },
];

// Fecha mínima = ahora en formato datetime-local
function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 5);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NoteModal({ note, onSave, onClose }) {
  const isEdit = !!note;
  const firstRef = useRef(null);

  const [title, setTitle]             = useState(note?.title || '');
  const [description, setDescription] = useState(note?.description || '');
  const [color, setColor]             = useState(note?.color || 'green');
  const [reminder, setReminder]       = useState(note?.reminder || false);
  const [reminderDate, setReminderDate] = useState(
    note?.reminderDate ? note.reminderDate.slice(0, 16) : nowLocal()
  );
  const [error, setError] = useState('');

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    if (!title.trim()) { setError('El título es obligatorio'); return; }
    if (reminder && !reminderDate) { setError('Selecciona una fecha para el recordatorio'); return; }

    onSave({
      ...(note || {}),
      title: title.trim(),
      description: description.trim(),
      color,
      reminder,
      reminderDate: reminder ? new Date(reminderDate).toISOString() : null
    });
    onClose();
  };

  const selectedColor = COLORS.find(c => c.id === color);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="modal"
        style={{ background: selectedColor?.bg, borderColor: selectedColor?.border }}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Editar nota' : 'Nueva nota'}
      >
        {/* Header modal */}
        <div className="modal__header">
          <h2 className="modal__title">
            {isEdit ? 'Editar nota' : 'Nueva nota'}
          </h2>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Selector de color */}
        <div className="modal__colors">
          {COLORS.map(c => (
            <button
              key={c.id}
              className={`color-dot ${color === c.id ? 'active' : ''}`}
              style={{ background: c.border }}
              onClick={() => setColor(c.id)}
              title={c.label}
              aria-label={c.label}
            />
          ))}
        </div>

        {/* Campos */}
        <div className="modal__fields">
          <div className="field-group">
            <label className="field-label" htmlFor="note-title">Título</label>
            <input
              id="note-title"
              ref={firstRef}
              className="field-input"
              type="text"
              placeholder="¿En qué estás pensando?"
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              maxLength={100}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="note-desc">Descripción</label>
            <textarea
              id="note-desc"
              className="field-textarea"
              placeholder="Añade más detalles..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <span className="field-count">{description.length}/2000</span>
          </div>

          {/* Recordatorio toggle */}
          <div className="reminder-section">
            <button
              className={`reminder-toggle ${reminder ? 'active' : ''}`}
              onClick={() => setReminder(r => !r)}
              type="button"
            >
              <span className="reminder-toggle__icon">{reminder ? '🔔' : '🔕'}</span>
              <span className="reminder-toggle__text">
                {reminder ? 'Recordatorio activado' : 'Añadir recordatorio'}
              </span>
              <span className={`reminder-toggle__pill ${reminder ? 'on' : ''}`} />
            </button>

            {reminder && (
              <div className="reminder-picker">
                <label className="field-label" htmlFor="reminder-dt">
                  Fecha y hora del aviso
                </label>
                <input
                  id="reminder-dt"
                  className="field-input field-datetime"
                  type="datetime-local"
                  value={reminderDate}
                  min={nowLocal()}
                  onChange={e => { setReminderDate(e.target.value); setError(''); }}
                />
                <p className="reminder-hint">
                  Recibirás una notificación en tu dispositivo a esta hora.
                </p>
              </div>
            )}
          </div>

          {error && <p className="modal__error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={handleSave}>
            {isEdit ? 'Guardar cambios' : 'Crear nota'}
          </button>
        </div>
      </div>
    </div>
  );
}
