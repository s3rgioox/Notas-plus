import React, { useState } from 'react';
import './NoteCard.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatReminder(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d - now;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMs < 0) return `Vencido · ${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffMin < 60) return `En ${diffMin} min`;
  if (diffMin < 1440) return `Hoy ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPast = note.reminderDate && new Date(note.reminderDate) < new Date();

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(note.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
    }
  };

  return (
    <div className={`note-card note-card--${note.color || 'green'} ${note.pinned ? 'note-card--pinned' : ''}`}
      style={{ animationDelay: '0ms' }}>

      {/* Pin indicator */}
      {note.pinned && <div className="note-pin-dot" title="Fijada" />}

      {/* Header */}
      <div className="note-card__header">
        <h3 className="note-card__title">{note.title}</h3>
        <div className="note-card__actions">
          <button
            className={`note-action-btn ${note.pinned ? 'active' : ''}`}
            onClick={() => onTogglePin(note.id)}
            title={note.pinned ? 'Desfijar' : 'Fijar'}
          >
            {note.pinned ? '📌' : '📍'}
          </button>
          <button
            className="note-action-btn"
            onClick={() => onEdit(note)}
            title="Editar"
          >
            ✏️
          </button>
          <button
            className={`note-action-btn note-action-btn--delete ${confirmDelete ? 'confirm' : ''}`}
            onClick={handleDelete}
            title={confirmDelete ? 'Pulsa de nuevo para confirmar' : 'Eliminar'}
          >
            {confirmDelete ? '¿Seguro?' : '🗑'}
          </button>
        </div>
      </div>

      {/* Descripción */}
      {note.description && (
        <p className="note-card__desc">{note.description}</p>
      )}

      {/* Footer */}
      <div className="note-card__footer">
        <span className="note-card__date">{formatDate(note.createdAt)}</span>
        {note.reminder && note.reminderDate && (
          <span className={`note-reminder-badge ${isPast ? 'past' : ''}`}>
            🔔 {formatReminder(note.reminderDate)}
          </span>
        )}
      </div>
    </div>
  );
}
