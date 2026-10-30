import { $, esc } from '../lib/dom.js';

/**
 * Open the shared <dialog> with `html` inside a form. Resolves when it closes:
 * Cancel / Esc → null; submit → onSubmit(form, submitter)'s return value (true if none).
 * onSubmit may return false to keep the dialog open.
 */
export function openDialog(html, onSubmit) {
  const dlg = $('#dlg');
  const previous = document.activeElement;
  if (dlg.open) dlg.close();   // one dialog at a time (e.g. settings → import confirm)
  dlg.innerHTML = `<form class="dlg" method="dialog">${html}</form>`;
  const form = $('form', dlg);

  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      if (dlg.open) dlg.close();
      resolve(value);
      if (previous && previous.isConnected) previous.focus();
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const result = onSubmit ? onSubmit(form, e.submitter) : true;
      if (result !== false) finish(result === undefined ? true : result);
    });
    form.addEventListener('click', e => { if (e.target.closest('[data-close]')) finish(null); });
    dlg.oncancel = () => finish(null);
    dlg.showModal();
    $('[data-autofocus]', form)?.focus();
  });
}

export const confirmDialog = (title, bodyHtml, ok = 'Delete') => openDialog(`<h2>${esc(title)}</h2><p>${bodyHtml}</p>
  <div class="form-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" data-autofocus>${esc(ok)}</button></div>`).then(Boolean);
