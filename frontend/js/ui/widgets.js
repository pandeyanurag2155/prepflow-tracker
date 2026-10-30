// Small HTML builders shared by every view.
import { esc, pct } from '../lib/dom.js';
import { cnt } from '../core/store.js';

/** done/total for a tally scope; refreshCounters() patches it in place after a tick. */
export function counter(scope) {
  const c = cnt(scope);
  return `<span class="count" data-count="${scope}">${c.done}/${c.total}</span>`;
}
export const bar = scope => `<span class="bar" data-bar="${scope}" aria-hidden="true"><i style="width:${pct(cnt(scope))}%"></i></span>`;

export const viewHead = (title, sub, scope, extra = '') => `<div class="view-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${extra}${scope ? `<div class="count" style="font-size:1rem">${counter(scope)} done</div>` : ''}</div>`;

export function groupLabel(g) {
  if (g.sectionId === 'striver' && !g.parentId) return g.step ? `Step ${g.step} · ${g.title}` : g.title;
  if (g.sectionId === 'roadmap' && g.month === 0) return g.title || 'Before you start';
  return g.title || 'Untitled';
}
export const monthLabel = m => (m === 0 ? 'Before you start' : `Month ${m}`);

export const chip = (action, value, label, pressed) =>
  `<button type="button" class="chip" data-action="${action}" data-value="${esc(value)}" aria-pressed="${pressed}">${esc(label)}</button>`;

/** <select> field; options are values or [value, label] pairs. */
export const select = (name, label, options, value, extra = '') => `<label class="field"><span>${label}</span><select name="${name}" ${extra}>${options.map(o => {
  const [v, l] = Array.isArray(o) ? o : [o, o || '—'];
  return `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`;
}).join('')}</select></label>`;

export const input = (name, label, value, extra = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value ?? '')}" ${extra}></label>`;

export const formActions = label =>
  `<div class="form-actions"><button type="button" class="btn" data-action="cancel-edit">Cancel</button><button class="btn btn-primary">${label}</button></div>`;
