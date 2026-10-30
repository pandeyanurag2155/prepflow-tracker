import { esc } from '../lib/dom.js';
import { ui, childGroups, groupItems } from '../core/store.js';
import { counter, bar, viewHead, groupLabel } from '../ui/widgets.js';
import { list } from '../ui/items.js';
import { addSlot, groupAdd, groupControls, groupEditForm } from '../ui/editing.js';
import { filterBar, subControls } from '../features/striver-tools.js';

function subStep(sub) {
  const items = groupItems(sub.id);
  return `<details class="substep" data-group="${sub.id}"${ui.open.has(sub.id) ? ' open' : ''}>
    <summary><span class="sub-title">${esc(sub.title)} ${counter('g:' + sub.id)}</span><span class="sub-tools">${subControls(sub)}${groupControls(sub)}</span></summary>
    <div class="substep-body">${groupEditForm(sub)}
      ${items.length ? list(items) : '<p class="empty">No problems yet. Use “Bulk add” to paste them.</p>'}
      ${addSlot(sub)}</div>
  </details>`;
}

// Self-paced: steps in the sheet’s order, no dates
function stepCard(step) {
  return `<section class="card" id="striver-step-${step.step ?? step.id}" data-group="${step.id}" aria-labelledby="h-${step.id}">
    <div class="card-head"><h3 id="h-${step.id}">${esc(groupLabel(step))}</h3><span class="spacer"></span>${counter('g:' + step.id)}${groupControls(step)}</div>
    ${bar('g:' + step.id)}${groupEditForm(step)}
    ${childGroups('striver', step.id).map(subStep).join('')}
    ${groupAdd('striver', step.id)}
  </section>`;
}

export function renderStriver() {
  const sub = 'takeUforward’s A2Z sheet, at your own pace. Problems link to LeetCode when they’re on it, otherwise to takeUforward.';
  return `${viewHead('Striver A2Z', sub, 'p:striver')}
    ${filterBar('striver')}<div class="stack">${childGroups('striver').map(stepCard).join('')}${groupAdd('striver')}</div>`;
}
