// Roadmap track chips, Striver filters and Bulk add.
import { $, $$, esc, plural } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { TRACKS, DIFFS } from '../core/constants.js';
import { ACTIONS } from '../core/registry.js';
import { ui, groupById, upsertItems } from '../core/store.js';
import { persist } from '../core/sync.js';
import { render } from '../core/render.js';
import { chip, groupLabel } from '../ui/widgets.js';
import { openDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';

export function filterBar(view) {
  if (view === 'roadmap') {
    return `<div class="chips" role="group" aria-label="Filter by track" style="margin-bottom:14px">
      ${['All', ...TRACKS].map(t => chip('filter-track', t, t, ui.track === t)).join('')}</div>`;
  }
  if (view === 'striver') {
    return `<div class="sticky-bar">
      <div class="chips" role="group" aria-label="Filter by difficulty">${['All', ...DIFFS].map(d => chip('filter-diff', d, d, ui.diff === d)).join('')}</div>
      <label class="check-label"><input type="checkbox" id="f-notdone"${ui.notDone ? ' checked' : ''}> Not done only</label>
      <span class="spacer"></span>
      <button type="button" class="btn btn-sm" data-action="fold-all" data-value="1">Expand all</button>
      <button type="button" class="btn btn-sm" data-action="fold-all" data-value="0">Collapse all</button>
    </div>`;
  }
  return '';
}

export const subControls = sub => `<button type="button" class="btn btn-sm" data-action="bulk" data-id="${sub.id}">Bulk add</button>`;

function bulkPreview(rows, error) {
  if (error) return `<p class="empty" style="padding:8px">Preview unavailable: ${esc(error)}</p>`;
  if (!rows.length) return '<p class="empty" style="padding:8px">Preview appears here as you paste.</p>';
  return `<table><thead><tr><th>#</th><th>Title</th><th>Diff.</th><th>Link</th><th>Status</th></tr></thead><tbody>${rows.map((r, i) =>
    `<tr${r.skip ? ' class="skip"' : ''}><td>${i + 1}</td><td>${esc(r.title)}</td><td>${r.difficulty ? r.difficulty[0] : '—'}</td><td>${r.link ? '✓' : '—'}</td><td>${r.skip ? esc(r.skip) : 'Add'}</td></tr>`).join('')}</tbody></table>`;
}

Object.assign(ACTIONS, {
  'filter-track'(b) { ui.track = b.dataset.value; ui.focus = `[data-action="filter-track"][data-value="${b.dataset.value}"]`; render(); },
  'filter-diff'(b) { ui.diff = b.dataset.value; ui.focus = `[data-action="filter-diff"][data-value="${b.dataset.value}"]`; render(); },

  'fold-all'(b) {
    const open = b.dataset.value === '1';
    $$('#view details[data-group]').forEach(d => {
      d.open = open;
      if (open) ui.open.add(d.dataset.group); else ui.open.delete(d.dataset.group);
    });
  },

  /* Bulk add: the live preview is a server dry run, so what you see is exactly what gets added. */
  async bulk(b) {
    const sub = groupById.get(b.dataset.id);
    if (!sub) return;
    const step = groupById.get(sub.parentId);
    const closed = openDialog(`<h2>Bulk add to “${esc(sub.title)}”</h2>
      <p class="hint" style="margin:0">${step ? esc(groupLabel(step)) + ' · ' : ''}One problem per line: <code>Title | E/M/H | URL</code>. Difficulty and URL are optional.</p>
      <label class="field"><span>Problems</span><textarea name="lines" rows="8" maxlength="200000" data-autofocus placeholder="Two Sum | E | https://leetcode.com/problems/two-sum/"></textarea></label>
      <div class="preview" id="bulk-preview">${bulkPreview([])}</div>
      <div class="form-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" id="bulk-ok" disabled>Add problems</button></div>`,
      form => form.elements.lines.value.trim() || false);

    const form = $('#dlg form');
    let timer = 0;
    let seq = 0;
    form.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const mine = ++seq;
        const text = form.elements.lines.value;
        const ok = $('#bulk-ok');
        if (!text.trim()) { $('#bulk-preview').innerHTML = bulkPreview([]); ok.disabled = true; ok.textContent = 'Add problems'; return; }
        try {
          const { rows } = await api.bulkAdd({ groupId: sub.id, text, dryRun: true });
          if (mine !== seq) return;   // a newer keystroke already asked again
          const n = rows.filter(r => !r.skip).length;
          $('#bulk-preview').innerHTML = bulkPreview(rows);
          ok.disabled = !n;
          ok.textContent = n ? `Add ${plural(n, 'problem')}` : 'Add problems';
        } catch (err) {
          if (mine === seq) $('#bulk-preview').innerHTML = bulkPreview([], err.message);
        }
      }, 250);
    });

    const text = await closed;
    clearTimeout(timer);
    if (!text) return;
    const result = await persist(api.bulkAdd({ groupId: sub.id, text }));
    if (!result) return;
    upsertItems(result.items);
    ui.open.add(sub.id);
    render();
    const skipped = result.rows.filter(r => r.skip).length;
    toast(`Added ${plural(result.items.length, 'problem')} to “${sub.title}”${skipped ? ` (${skipped} skipped)` : ''}`);
  },
});

document.addEventListener('change', e => {
  if (e.target.id !== 'f-notdone') return;
  ui.notDone = e.target.checked;
  ui.focus = '#f-notdone';
  render();
});
