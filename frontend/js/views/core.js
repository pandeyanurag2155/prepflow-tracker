import { esc } from '../lib/dom.js';
import { ui, childGroups, groupItems } from '../core/store.js';
import { counter, bar, viewHead } from '../ui/widgets.js';
import { list } from '../ui/items.js';
import { addSlot, groupAdd, groupControls, groupEditForm } from '../ui/editing.js';

function chapter(ch, i) {
  return `<section class="lang-level" aria-labelledby="h-${ch.id}">
    <div class="level-head"><h4 id="h-${ch.id}">${i + 1}. ${esc(ch.title)}</h4><span class="spacer"></span>${counter('g:' + ch.id)}${groupControls(ch)}</div>
    ${groupEditForm(ch)}
    ${list(groupItems(ch.id), 'grid-2')}
    ${addSlot(ch)}
  </section>`;
}

// One collapsible card per subject; chapters and their topics inside, no levels or months
function subjectCard(s) {
  const chapters = childGroups('core', s.id);
  return `<details class="card lang-acc" data-group="${s.id}"${ui.open.has(s.id) ? ' open' : ''}>
    <summary><h3>${esc(s.title)}</h3>${counter('g:' + s.id)}<span class="count">${chapters.length} chapters</span>
      <span class="spacer"></span>${groupControls(s)}</summary>
    <div class="lang-body">${groupEditForm(s)}${bar('g:' + s.id)}
      ${chapters.map(chapter).join('')}
      ${groupAdd('core', s.id)}
    </div>
  </details>`;
}

export function renderCore() {
  const tools = `<div class="add-row" style="margin:0">
    <button type="button" class="btn btn-sm" data-action="fold-all" data-value="1">Expand all</button>
    <button type="button" class="btn btn-sm" data-action="fold-all" data-value="0">Collapse all</button></div>`;
  return `${viewHead('Core subjects', 'The full syllabus of each subject, chapter by chapter, at your own pace. ↗ opens a reading for each topic. Click a subject to open it.', 's:core', tools)}
    <div class="stack">${childGroups('core').map(subjectCard).join('')}${groupAdd('core')}</div>`;
}
