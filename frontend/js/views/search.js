import { esc, byOrder, push } from '../lib/dom.js';
import { SECTION_LABEL } from '../core/constants.js';
import { state, ui, groupById } from '../core/store.js';
import { viewHead, groupLabel } from '../ui/widgets.js';
import { list } from '../ui/items.js';

const MAX_RESULTS = 300;

/** Global search across every section; all words must appear in the title or notes. */
export function renderSearch() {
  const terms = ui.query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = state.items.filter(i => {
    const hay = `${i.title} ${i.notes}`.toLowerCase();
    return terms.every(t => hay.includes(t));
  });
  const shown = hits.slice(0, MAX_RESULTS);

  const sections = Object.keys(SECTION_LABEL).map(sectionId => {
    const mine = shown.filter(i => i.sectionId === sectionId);
    if (!mine.length) return '';
    const byGroup = new Map();
    mine.forEach(i => push(byGroup, i.groupId, i));
    const blocks = [...byGroup].map(([gid, items]) => {
      const g = groupById.get(gid);
      const parent = g?.parentId ? groupById.get(g.parentId) : null;
      const where = g ? (parent ? `${groupLabel(parent)} › ${g.title}` : groupLabel(g)) : '';
      return `<p class="sub-label">${esc(where)}</p>${list(items.sort(byOrder))}`;
    }).join('');
    return `<section class="card"><div class="card-head"><h3>${SECTION_LABEL[sectionId]}</h3><span class="spacer"></span>
      <span class="count">${mine.length}</span><a class="btn btn-sm" href="#${sectionId}">Open tab</a></div>${blocks}</section>`;
  }).join('');

  const more = hits.length > shown.length ? `, showing the first ${shown.length}` : '';
  return `${viewHead(`Search: “${esc(ui.query)}”`, `${hits.length} match${hits.length === 1 ? '' : 'es'} across all views${more}.`, '',
    '<button type="button" class="btn btn-sm" data-action="clear-search">Clear search</button>')}
    <div class="stack">${sections || '<p class="empty">Nothing matches. Try fewer words.</p>'}</div>`;
}
