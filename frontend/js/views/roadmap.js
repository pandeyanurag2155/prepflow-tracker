import { esc } from '../lib/dom.js';
import { groupItems } from '../core/store.js';
import { planMonths } from '../core/plan.js';
import { counter, bar, viewHead, groupLabel } from '../ui/widgets.js';
import { list } from '../ui/items.js';
import { addSlot, groupControls, groupEditForm } from '../ui/editing.js';
import { filterBar } from '../features/striver-tools.js';
import { monthSections } from './months.js';

function themeCard(g) {
  return `<section class="card" data-group="${g.id}" aria-labelledby="h-${g.id}">
    <div class="card-head"><h4 id="h-${g.id}">${esc(groupLabel(g))}</h4><span class="spacer"></span>${counter('g:' + g.id)}${groupControls(g)}</div>
    ${g.focus ? `<p class="focus">${esc(g.focus)}</p>` : ''}
    ${groupEditForm(g)}${bar('g:' + g.id)}
    ${list(groupItems(g.id))}
    ${addSlot(g)}
  </section>`;
}

export function renderRoadmap() {
  return `${viewHead('Roadmap', `A ${planMonths()}-month plan: system design, deep dives, behavioural prep, applications and DSA practice.`, 's:roadmap')}
    ${filterBar('roadmap')}${monthSections('roadmap', themeCard)}`;
}
