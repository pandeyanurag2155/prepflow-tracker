import { esc } from '../lib/dom.js';
import { LEVELS } from '../core/constants.js';
import { ui, childGroups, groupItems, cnt } from '../core/store.js';
import { planNow, revisionLevelNow, monthsForLevel } from '../core/plan.js';
import { counter, bar, viewHead } from '../ui/widgets.js';
import { list } from '../ui/items.js';
import { addSlot, groupAdd, groupControls, groupEditForm } from '../ui/editing.js';

// nowLevel null = unscheduled: no months, no “now” tag
function levelBlock(g, level, nowLevel, nowLabel) {
  const isNow = level === nowLevel;
  return `<section class="lang-level${isNow ? ' is-now' : ''}" aria-label="${esc(g.title)} ${level}">
    <div class="level-head"><h4>${level}</h4>${nowLevel !== null ? `<span class="range">${monthsForLevel(level)}</span>` : ''}
      ${isNow ? `<span class="tag tag-now">${nowLabel}</span>` : ''}<span class="spacer"></span>${counter(`gl:${g.id}:${level}`)}</div>
    ${list(groupItems(g.id).filter(i => i.level === level), 'grid-2')}
    ${addSlot(g, { level })}
  </section>`;
}

// One collapsible card per group (language / track); levels stack inside it
function groupCard(g, nowLevel, nowLabel) {
  const segs = LEVELS.map(l => {
    const c = cnt(`gl:${g.id}:${l}`);
    return `<span title="${l}: ${c.done}/${c.total}">${bar(`gl:${g.id}:${l}`)}</span>`;
  }).join('');
  return `<details class="card lang-acc" data-group="${g.id}"${ui.open.has(g.id) ? ' open' : ''}>
    <summary>
      <h3>${esc(g.title)}</h3>${counter('g:' + g.id)}
      <span class="segs" aria-hidden="true">${segs}</span>
      <span class="spacer"></span>${groupControls(g)}
    </summary>
    <div class="lang-body">
      ${groupEditForm(g)}
      ${LEVELS.map(l => levelBlock(g, l, nowLevel, nowLabel)).join('')}
    </div>
  </details>`;
}

/**
 * Collapsible cards with Basic / Intermediate / Advanced inside; used by Revision and System design.
 * scheduled: levels follow the plan’s months (Revision); false = study at your own pace (System design).
 */
export function levelledView(sectionId, title, intro, { scheduled = true } = {}) {
  const nowLevel = scheduled ? revisionLevelNow() : null;
  const nowLabel = planNow().state === 'before' ? 'Up next' : 'Study now';
  const tools = `<div class="add-row" style="margin:0">
    <button type="button" class="btn btn-sm" data-action="fold-all" data-value="1">Expand all</button>
    <button type="button" class="btn btn-sm" data-action="fold-all" data-value="0">Collapse all</button></div>`;
  const months = !scheduled ? '' : `${LEVELS.map(l => `${l} in ${monthsForLevel(l).toLowerCase()}`).join(', ')}.${nowLevel ? ` ${nowLabel}: <strong>${nowLevel}</strong>.` : ''}`;
  return `${viewHead(title, `${intro} ${months}`, 's:' + sectionId, tools)}
    <div class="stack">${childGroups(sectionId).map(g => groupCard(g, nowLevel, nowLabel)).join('')}${groupAdd(sectionId)}</div>`;
}

export const renderRevision = () => levelledView('revision', 'Topic revision', 'Click a language to open it.');
