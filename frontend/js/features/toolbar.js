// Header toolbar: search, Hide completed, theme, and the Settings dialog (dates, export/import/reset).
import { $, $$, esc, plural } from '../lib/dom.js';
import { isYmd } from '../lib/dates.js';
import { api } from '../lib/api.js';
import { ACTIONS } from '../core/registry.js';
import { state, ui, itemById, setState } from '../core/store.js';
import { persist } from '../core/sync.js';
import { render, applyTheme } from '../core/render.js';
import { isHidden } from '../ui/items.js';
import { input, select } from '../ui/widgets.js';
import { openDialog, confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';

const THEMES = ['system', 'light', 'dark'];
const THEME_LABEL = { system: '◐ System', light: '☀ Light', dark: '☾ Dark' };

export function renderToolbar() {
  const s = state.settings;
  $('#toolbar').innerHTML = `<label class="visually-hidden" for="q">Search all views</label>
    <input id="q" class="search" type="search" placeholder="Search everything…" autocomplete="off" value="${esc(ui.query)}">
    <label class="check-label"><input type="checkbox" id="hide-done"${s.hideCompleted ? ' checked' : ''}> Hide completed</label>
    <button type="button" class="btn btn-sm" data-action="theme" aria-label="Theme: ${s.theme}. Switch theme">${THEME_LABEL[s.theme]}</button>
    <button type="button" class="btn btn-sm" data-action="settings">Settings</button>
    <button type="button" class="btn btn-sm" data-action="logout">Log out</button>`;
}

async function saveSettings(patch) {
  const saved = await persist(api.updateSettings(patch));
  if (saved) state.settings = saved;
  return saved;
}

/** Swap in a whole new snapshot (import / reset) with Undo back to the previous one. */
async function replaceAll(request, message) {
  const previous = structuredClone(state);
  const next = await persist(request);
  if (!next) return;
  setState(next);
  applyTheme(); renderToolbar(); render();
  toast(message, async () => {
    const back = await persist(api.importDocument(previous));
    if (back) { setState(back); applyTheme(); renderToolbar(); render(); }
  });
}

/* Search */
let searchTimer = 0;
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { ui.query = e.target.value.trim(); ui.editing = null; render(); }, 150);
});
document.addEventListener('keydown', e => {
  if (e.target.id === 'q' && e.key === 'Escape' && e.target.value) {
    e.target.value = '';
    ui.query = '';
    render();
  }
  // “/” jumps to search when you’re not typing somewhere else
  if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !$('#dlg').open) {
    e.preventDefault();
    $('#q')?.focus();
  }
});

/* Hide completed: flip visibility in place, no re-render */
document.addEventListener('change', e => {
  if (e.target.id !== 'hide-done') return;
  state.settings.hideCompleted = e.target.checked;
  $$('#view .item').forEach(el => { const it = itemById.get(el.dataset.id); if (it) el.hidden = isHidden(it); });
  saveSettings({ hideCompleted: e.target.checked });
});

/* Import: validate locally that it parses, let the server validate + migrate the rest */
document.addEventListener('change', async e => {
  if (e.target.id !== 'import-file' || !e.target.files.length) return;
  const file = e.target.files[0];
  let doc;
  try {
    doc = JSON.parse(await file.text());
    if (!doc || !Array.isArray(doc.groups) || !Array.isArray(doc.items)) throw new Error('no groups/items found');
  } catch (err) {
    $('#dlg').close();
    toast(`Couldn’t import: ${err.message}`);
    return;
  }
  const done = doc.items.filter(i => i && i.done).length;
  if (!(await confirmDialog('Replace all data?', `“${esc(file.name)}” has ${plural(doc.groups.length, 'group')} and ${plural(doc.items.length, 'item')} (${done} done). Your current data will be replaced.`, 'Replace'))) return;
  replaceAll(api.importDocument(doc), `Imported ${plural(doc.items.length, 'item')}`);
});

Object.assign(ACTIONS, {
  theme() {
    state.settings.theme = THEMES[(THEMES.indexOf(state.settings.theme) + 1) % THEMES.length];
    applyTheme();
    renderToolbar();
    $('[data-action="theme"]').focus();
    saveSettings({ theme: state.settings.theme });
  },

  'clear-search'() { ui.query = ''; $('#q').value = ''; render(); },

  async settings() {
    const s = state.settings;
    const values = await openDialog(`<h2>Settings</h2>
      <div class="settings-grid">
        ${input('planStart', 'Plan start (month 1)', s.planStart, 'type="date" required data-autofocus')}
        ${input('planMonths', 'Plan length (months)', s.planMonths, 'type="number" min="1" max="12" required')}
        ${select('theme', 'Theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], s.theme)}
      </div>
      <label class="check-label"><input type="checkbox" name="linkDuplicates"${s.linkDuplicates ? ' checked' : ''}> Link duplicate problems across NeetCode and Striver</label>
      <label class="check-label"><input type="checkbox" name="hideCompleted"${s.hideCompleted ? ' checked' : ''}> Hide completed items</label>
      <div class="form-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Save settings</button></div>
      <hr style="border:0;border-top:1px solid var(--rule);margin:4px 0">
      <h2 style="font-size:1rem">Your data</h2>
      <p class="hint" style="margin:0">Stored on the server in PostgreSQL. Export a JSON backup now and then.</p>
      <div class="add-row" style="margin:0">
        <a class="btn btn-sm" href="${api.exportUrl}" download>Export JSON</a>
        <label class="btn btn-sm">Import JSON<input type="file" id="import-file" accept="application/json,.json" class="visually-hidden"></label>
        <button type="button" class="btn btn-sm btn-danger" data-action="reset">Reset to seed</button>
      </div>
      <hr style="border:0;border-top:1px solid var(--rule);margin:4px 0">
      <h2 style="font-size:1rem">Account</h2>
      <div class="add-row" style="margin:0"><button type="button" class="btn btn-sm" data-action="change-password">Change password</button></div>`,
      form => Object.fromEntries(new FormData(form)));
    if (!values) return;

    const patch = {
      planStart: isYmd(values.planStart) ? values.planStart : s.planStart,
      planMonths: Math.min(12, Math.max(1, Number.parseInt(values.planMonths, 10) || s.planMonths)),
      theme: THEMES.includes(values.theme) ? values.theme : 'system',
      linkDuplicates: 'linkDuplicates' in values,
      hideCompleted: 'hideCompleted' in values,
    };
    if (!(await saveSettings(patch))) return;
    applyTheme(); renderToolbar(); render();
    toast('Settings saved');
  },

  async 'change-password'() {
    const result = await openDialog(`<h2>Change password</h2>
      <p class="hint" style="margin:0">Other devices will be logged out.</p>
      ${input('currentPassword', 'Current password', '', 'type="password" autocomplete="current-password" required data-autofocus')}
      ${input('newPassword', 'New password (min 8 characters)', '', 'type="password" autocomplete="new-password" minlength="8" required')}
      ${input('newPassword2', 'Repeat new password', '', 'type="password" autocomplete="new-password" minlength="8" required')}
      <p class="login-error" role="alert"></p>
      <div class="form-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Change password</button></div>`,
      form => {
        const v = Object.fromEntries(new FormData(form));
        if (v.newPassword !== v.newPassword2) { form.querySelector('.login-error').textContent = 'New passwords do not match.'; return false; }
        const btn = form.querySelector('.btn-primary');
        btn.disabled = true;
        // Keep the dialog open until the server answers, so a wrong current password can be retyped
        api.changePassword(v.currentPassword, v.newPassword).then(
          () => { $('#dlg').close(); toast('Password changed. Other devices are logged out.'); },
          err => { btn.disabled = false; form.querySelector('.login-error').textContent = err.message; });
        return false;
      });
    return result;
  },

  async reset() {
    if (!(await confirmDialog('Reset to seed?', 'All progress, notes, pasted problems and edits are replaced by the starting plan. Settings are kept.', 'Reset'))) return;
    replaceAll(api.reset(), 'Reset to the starting plan');
  },
});
