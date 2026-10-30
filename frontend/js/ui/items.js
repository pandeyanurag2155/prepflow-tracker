// One item row, its badges, and ticking (which patches the DOM instead of re-rendering the view).
import { $, $$, esc, pct, safeUrl } from '../lib/dom.js';
import { addDays, today, ymd } from '../lib/dates.js';
import { api } from '../lib/api.js';
import { SECTION_LABEL } from '../core/constants.js';
import { ACTIONS } from '../core/registry.js';
import { state, ui, itemById, keyIndex, cnt, recount } from '../core/store.js';
import { persist } from '../core/sync.js';
import { itemControls, editFormFor } from './editing.js';

export function isHidden(it) {
  if (state.settings.hideCompleted && it.done) return true;
  if (ui.query) return false;   // view filters don’t apply to search results
  if (it.sectionId === 'roadmap' && ui.track !== 'All' && it.track !== ui.track) return true;
  if (it.sectionId === 'striver') {
    if (ui.diff !== 'All' && it.difficulty !== ui.diff) return true;
    if (ui.notDone && it.done) return true;
  }
  return false;
}

/** Other sheets that contain the same problem (same key), when linking is on. */
function alsoIn(it) {
  if (it.kind !== 'problem' || !it.key || !state.settings.linkDuplicates) return [];
  const sections = new Set((keyIndex.get(it.key) || []).filter(x => x.sectionId !== it.sectionId).map(x => x.sectionId));
  return [...sections].map(s => SECTION_LABEL[s]);
}

/** Escaped notes with http(s) URLs turned into links (labelled by host so long URLs stay short). */
function linkify(text) {
  return esc(text).replace(/https?:\/\/[^\s<]+/g, raw => {
    const url = safeUrl(raw.replace(/&amp;/g, '&').replace(/&#39;/g, "'"));
    if (!url) return raw;
    const host = new URL(url).hostname.replace(/^www\./, '');
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(host)} ↗</a>`;
  });
}

export const isDue = it => it.revisitDates.some(d => d <= ymd(today()));

function badges(it) {
  const b = [];
  if (it.track) b.push(`<span class="badge">${esc(it.track)}</span>`);
  if (it.difficulty) b.push(`<span class="badge badge-${it.difficulty.toLowerCase()}">${it.difficulty}</span>`);
  alsoIn(it).forEach(s => b.push(`<span class="badge badge-link">Also in ${esc(s)}</span>`));
  if (it.done && isDue(it)) b.push('<span class="badge badge-due">Revisit due</span>');
  return b.join('');
}

export function itemRow(it) {
  const url = safeUrl(it.link);
  const t = esc(it.title);
  return `<li class="item${it.done ? ' is-done' : ''}" data-id="${it.id}"${isHidden(it) ? ' hidden' : ''}>
    <input type="checkbox" class="cb" id="cb-${it.id}" data-action="toggle"${it.done ? ' checked' : ''}>
    <div class="item-main">
      <label for="cb-${it.id}" class="item-title">${t}</label><span class="badges">${badges(it)}</span>
      ${it.notes ? `<details class="notes"><summary>Notes</summary><div>${linkify(it.notes)}</div></details>` : ''}
    </div>
    <div class="item-tools">${url ? `<a class="icon-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="Open link" aria-label="Open link for ${t} (new tab)">↗</a>` : ''}<button type="button" class="icon-btn more" data-action="more" aria-expanded="false" aria-label="Actions for ${t}">⋯</button>${itemControls(it)}</div>
  </li>${editFormFor(it)}`;
}

export const list = (items, cls = '') => `<ul class="items ${cls}">${items.map(itemRow).join('')}</ul>`;

/** Patch one row in place: keeps focus on its checkbox and avoids re-rendering 1,000+ rows. */
function refreshItem(it) {
  const el = $(`.item[data-id="${it.id}"]`);
  if (!el) return;
  el.classList.toggle('is-done', it.done);
  el.hidden = isHidden(it);
  const cb = $('.cb', el);
  if (cb) cb.checked = it.done;
  $('.badges', el).innerHTML = badges(it);
}

/** Recount once, then update every visible counter and bar. */
export function refreshCounters() {
  recount();
  $$('[data-count]').forEach(el => { const c = cnt(el.dataset.count); el.textContent = `${c.done}/${c.total}`; });
  $$('[data-bar]').forEach(el => { el.firstElementChild.style.width = pct(cnt(el.dataset.bar)) + '%'; });
}

/**
 * Tick / untick. Optimistic: linked duplicates and revisit dates are applied locally at once,
 * then replaced by what the server stored (it is the source of truth for doneAt and revisitDates).
 */
export async function toggleItem(id, done) {
  const it = itemById.get(id);
  if (!it) return;
  const linked = it.kind === 'problem' && it.key && state.settings.linkDuplicates ? keyIndex.get(it.key) || [it] : [it];
  const now = new Date();
  for (const x of linked) {
    x.done = done;
    x.doneAt = done ? now.toISOString() : null;
    x.revisitDates = done && x.kind === 'problem' ? [3, 7].map(n => ymd(addDays(now, n))) : [];
    refreshItem(x);
  }
  refreshCounters();

  const changed = await persist(api.setDone(id, done));
  if (!changed) return;
  for (const c of changed) {
    const local = itemById.get(c.id);
    if (local) { Object.assign(local, c); refreshItem(local); }
  }
  refreshCounters();
}

Object.assign(ACTIONS, {
  // Mobile: reveal the edit / move / delete buttons for one row
  more(b) {
    const on = b.closest('.item').classList.toggle('show-tools');
    b.setAttribute('aria-expanded', String(on));
  },
});
