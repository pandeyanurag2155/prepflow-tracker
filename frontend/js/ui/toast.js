import { $, esc } from '../lib/dom.js';

const UNDO_MS = 5000;

/** Bottom toast for 5 seconds; pass `undo` to show an Undo button. */
export function toast(message, undo) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(message)}</span>${undo ? '<button type="button">Undo</button>' : ''}`;
  $('#toasts').append(el);
  const timer = setTimeout(() => el.remove(), UNDO_MS);
  if (undo) {
    $('button', el).addEventListener('click', () => {
      clearTimeout(timer);
      el.remove();
      undo();
    });
  }
}
