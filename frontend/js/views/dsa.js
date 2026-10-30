import { esc } from '../lib/dom.js';
import { childGroups, groupItems } from '../core/store.js';
import { counter, viewHead, groupLabel } from '../ui/widgets.js';
import { list } from '../ui/items.js';
import { addSlot, groupControls, groupEditForm } from '../ui/editing.js';
import { monthSections } from './months.js';

function tipsCard(g) {
  return `<section class="card tips" data-group="${g.id}" aria-labelledby="h-${g.id}">
    <div class="card-head"><h3 id="h-${g.id}">${esc(g.title)}</h3><span class="spacer"></span>${groupControls(g)}</div>
    ${groupEditForm(g)}${list(groupItems(g.id))}${addSlot(g)}</section>`;
}

function themeCard(g) {
  const items = groupItems(g.id);
  const concepts = items.filter(i => i.kind !== 'problem');
  const problems = items.filter(i => i.kind === 'problem');
  return `<section class="card" data-group="${g.id}" aria-labelledby="h-${g.id}">
    <div class="card-head"><h4 id="h-${g.id}">${esc(groupLabel(g))}</h4><span class="spacer"></span>
      ${problems.length ? `${counter(`k:${g.id}:problem`)}<span class="count">problems</span>` : counter('g:' + g.id)}${groupControls(g)}</div>
    ${g.focus ? `<p class="focus">${esc(g.focus)}</p>` : ''}${groupEditForm(g)}
    ${concepts.length ? `<p class="sub-label">Concepts</p>${list(concepts)}` : ''}
    ${problems.length ? `<p class="sub-label">Problems</p>${list(problems, 'grid-2')}` : ''}
    ${addSlot(g)}
  </section>`;
}

export function renderDsa() {
  const tips = childGroups('dsa').filter(g => g.role === 'tips').map(tipsCard).join('');
  return `${viewHead('DSA plan', 'NeetCode 150, theme by theme. Concepts first, then the problems that drill them.', 'p:dsa')}
    <div class="stack">${tips}</div>${monthSections('dsa', themeCard, 'mp')}`;
}
