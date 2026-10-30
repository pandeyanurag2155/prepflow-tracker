export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape for HTML text and attribute values. Every user-provided string goes through this. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ENTITIES[c]);

/** http(s) URLs only; anything else (javascript:, data:, garbage) becomes ''. */
export function safeUrl(u) {
  try {
    const url = new URL(String(u).trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export const byOrder = (a, b) => a.order - b.order;
export const push = (map, key, value) => { const list = map.get(key); list ? list.push(value) : map.set(key, [value]); };
export const pct = c => (c && c.total ? Math.round((c.done / c.total) * 100) : 0);
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
