/* Inline add/edit forms, delete with Undo, up/down reordering, and group management.
   ui.editing = { key } decides which single inline form is open:
     add:<groupId>:<level>   edit:<itemId>   gedit:<groupId>   gadd:<section>:<parentId>:<month> */
import { esc, plural } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { TRACKS, LEVELS, DIFFS, ITEM_NOUN, LEVELLED } from '../core/constants.js';
import { ACTIONS, FORMS } from '../core/registry.js';
import {
  state, ui, groupById, itemById, groupItems, childGroups, upsertItems, upsertGroups, dropItems, dropGroups, reindex,
} from '../core/store.js';
import { persist } from '../core/sync.js';
import { render } from '../core/render.js';
import { select, input, formActions, groupLabel, monthLabel } from './widgets.js';
import { confirmDialog } from './dialog.js';
import { toast } from './toast.js';

const isEditing = key => ui.editing?.key === key;
// Roadmap and NeetCode themes belong to a month of the plan
const isThemeGroup = g => (g.sectionId === 'roadmap' || g.sectionId === 'dsa') && !g.role && !g.parentId;
const groupNoun = g => (g.sectionId === 'revision' ? 'language' : g.sectionId === 'sysdesign' ? 'track' : g.sectionId === 'tools' ? 'tool' : g.sectionId === 'core' ? (g.parentId ? 'chapter' : 'subject') : g.sectionId === 'striver' ? (g.parentId ? 'sub-step' : 'step') : g.role ? 'box' : 'theme');
const defaultKind = g => ({ roadmap: 'task', revision: 'topic', sysdesign: 'topic', tools: 'topic', core: 'topic', striver: 'problem' }[g.sectionId] || (g.role === 'tips' ? 'concept' : 'problem'));

/* ─────────────── Items ─────────────── */

// Groups an item may move to (edit form → “Move to”): same section only
function itemHomes(sectionId) {
  if (sectionId === 'core') return childGroups('core').flatMap(s => childGroups('core', s.id).map(ch => [ch.id, `${s.title} › ${ch.title}`]));
  if (sectionId !== 'striver') return childGroups(sectionId).map(g => [g.id, isThemeGroup(g) ? `${monthLabel(g.month)} › ${groupLabel(g)}` : groupLabel(g)]);
  return childGroups('striver').flatMap(s => childGroups('striver', s.id).map(sub => [sub.id, `${groupLabel(s)} › ${sub.title}`]));
}

function itemForm(g, item, level) {
  const v = item || { title: '', kind: defaultKind(g), track: '', level: level || '', difficulty: '', notes: '', link: '' };
  let fields = '';
  if (g.sectionId === 'roadmap') fields += select('track', 'Track', [['', 'None'], ...TRACKS], v.track);
  if (g.sectionId === 'dsa') fields += select('kind', 'Kind', [['concept', 'Concept'], ['problem', 'Problem']], v.kind);
  if (g.sectionId === 'dsa' || g.sectionId === 'striver') fields += select('difficulty', 'Difficulty', [['', 'None'], ...DIFFS], v.difficulty);
  if (LEVELLED.has(g.sectionId)) fields += select('level', 'Level', LEVELS, v.level || 'Basic');
  if (item) fields += select('groupId', 'Move to', itemHomes(g.sectionId), item.groupId);
  return `<form class="form" data-form="item" data-group="${g.id}"${item ? ` data-id="${item.id}"` : ''} aria-label="${item ? 'Edit' : 'Add'} ${ITEM_NOUN[g.sectionId]}">
    <div class="form-row"><label class="field" style="flex-basis:100%"><span>Title</span><input name="title" required maxlength="500" value="${esc(v.title)}" data-autofocus autocomplete="off"></label></div>
    ${fields ? `<div class="form-row">${fields}</div>` : ''}
    <div class="form-row">${input('link', 'Link', v.link, 'inputmode="url" placeholder="https://…" maxlength="2000"')}</div>
    <label class="field"><span>Notes</span><textarea name="notes" rows="3" maxlength="10000">${esc(v.notes)}</textarea></label>
    ${formActions(item ? 'Save' : 'Add')}
  </form>`;
}

export function itemControls(it) {
  const t = esc(it.title);
  return `<button type="button" class="icon-btn" data-action="edit-item" data-id="${it.id}" title="Edit" aria-label="Edit ${t}">✎</button>
    <button type="button" class="icon-btn" data-action="move-item" data-dir="-1" data-id="${it.id}" title="Move up" aria-label="Move ${t} up">↑</button>
    <button type="button" class="icon-btn" data-action="move-item" data-dir="1" data-id="${it.id}" title="Move down" aria-label="Move ${t} down">↓</button>
    <button type="button" class="icon-btn" data-action="del-item" data-id="${it.id}" title="Delete" aria-label="Delete ${t}">✕</button>`;
}

export const editFormFor = it => (isEditing('edit:' + it.id) ? `<li>${itemForm(groupById.get(it.groupId), it)}</li>` : '');

export function addSlot(g, { level = '' } = {}) {
  if (isEditing(`add:${g.id}:${level}`)) return itemForm(g, null, level);
  return `<div class="add-row"><button type="button" class="btn btn-ghost btn-sm" data-action="add-item" data-group="${g.id}" data-level="${level}">+ Add ${ITEM_NOUN[g.sectionId]}</button></div>`;
}

/* ─────────────── Groups ─────────────── */

export function groupControls(g) {
  const t = esc(groupLabel(g));
  const n = groupNoun(g);
  return `<span class="item-tools" style="opacity:1">
    <button type="button" class="icon-btn" data-action="edit-group" data-id="${g.id}" title="Rename ${n}" aria-label="Rename ${n} ${t}">✎</button>
    <button type="button" class="icon-btn" data-action="move-group" data-dir="-1" data-id="${g.id}" title="Move ${n} up" aria-label="Move ${n} ${t} up">↑</button>
    <button type="button" class="icon-btn" data-action="move-group" data-dir="1" data-id="${g.id}" title="Move ${n} down" aria-label="Move ${n} ${t} down">↓</button>
    <button type="button" class="icon-btn" data-action="del-group" data-id="${g.id}" title="Delete ${n}" aria-label="Delete ${n} ${t}">✕</button></span>`;
}

function groupForm({ group: g, sectionId = g?.sectionId, parentId = g?.parentId ?? null, month }) {
  const themeish = g ? isThemeGroup(g) : sectionId === 'roadmap' || sectionId === 'dsa';
  const stepish = sectionId === 'striver' && !parentId;
  const noun = sectionId === 'revision' ? 'Language' : sectionId === 'sysdesign' ? 'Track' : sectionId === 'tools' ? 'Tool' : sectionId === 'core' ? (parentId ? 'Chapter' : 'Subject') : stepish ? 'Step title' : sectionId === 'striver' ? 'Sub-step title' : g?.role ? 'Title' : 'Theme';
  const months = [[0, 'Before you start'], ...Array.from({ length: state.settings.planMonths }, (_, i) => [i + 1, `Month ${i + 1}`])];
  const where = g ? `data-id="${g.id}"` : `data-section="${sectionId}" data-parent="${parentId || ''}"`;
  return `<form class="form" data-form="group" ${where}>
    <div class="form-row">
      ${themeish ? select('month', 'Month', months, g ? g.month : (month ?? 1)) : ''}
      ${stepish ? input('step', 'Step no.', g?.step ?? '', 'type="number" min="1" max="99"') : ''}
      <label class="field" style="flex:3 1 220px"><span>${noun}</span><input name="title" maxlength="200" value="${esc(g?.title ?? '')}" required data-autofocus autocomplete="off"></label>
    </div>
    ${themeish ? `<div class="form-row">${input('focus', 'Focus line', g?.focus ?? '', 'maxlength="500"')}</div>` : ''}
    ${formActions(g ? 'Save' : 'Add')}
  </form>`;
}

export const groupEditForm = g => (isEditing('gedit:' + g.id) ? groupForm({ group: g }) : '');

export function groupAdd(sectionId, parentId = null, month = null) {
  if (isEditing(`gadd:${sectionId}:${parentId || ''}:${month ?? ''}`)) return `<div>${groupForm({ sectionId, parentId, month })}</div>`;
  const noun = sectionId === 'revision' ? 'language' : sectionId === 'sysdesign' ? 'track' : sectionId === 'tools' ? 'tool' : sectionId === 'core' ? (parentId ? 'chapter' : 'subject') : sectionId === 'striver' ? (parentId ? 'sub-step' : 'step') : 'theme';
  return `<div class="add-row"><button type="button" class="btn btn-sm" data-action="add-group" data-section="${sectionId}" data-parent="${parentId || ''}" data-month="${month ?? ''}">+ Add ${noun}</button></div>`;
}

/* ─────────────── Reordering ─────────────── */

// Swap `x` with its neighbour in sorted `siblings`; orders are renumbered first if there are ties.
function swapOrder(siblings, x, dir) {
  const i = siblings.indexOf(x);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= siblings.length) return false;
  const orders = siblings.map(s => s.order).sort((a, b) => a - b);
  const unique = new Set(orders).size === orders.length;
  siblings.forEach((s, k) => { s.order = unique ? orders[k] : k; });
  [siblings[i].order, siblings[j].order] = [siblings[j].order, siblings[i].order];
  return true;
}
// Items shown together: levelled sections → same level; DSA → concepts and problems are separate lists
const itemSiblings = it => groupItems(it.groupId).filter(x =>
  (!LEVELLED.has(it.sectionId) || x.level === it.level) && (it.sectionId !== 'dsa' || (x.kind === 'problem') === (it.kind === 'problem')));
// Themes reorder within their month; everything else among its siblings
const groupSiblings = g => childGroups(g.sectionId, g.parentId).filter(x => !isThemeGroup(g) || x.month === g.month);
const positionsOf = list => list.map(x => ({ id: x.id, order: x.order }));

/* ─────────────── Form submits ─────────────── */

const text = (fd, name) => String(fd.get(name) ?? '').trim();
const intOrNull = v => (v === '' || v == null ? null : Number.parseInt(v, 10));

Object.assign(FORMS, {
  async item(form, fd) {
    const g = groupById.get(form.dataset.group);
    const title = text(fd, 'title');
    if (!g || !title) return;
    const body = { title, notes: text(fd, 'notes'), link: text(fd, 'link') };
    for (const f of ['track', 'kind', 'difficulty', 'level']) if (fd.has(f)) body[f] = fd.get(f);
    form.querySelector('.btn-primary').disabled = true;

    if (form.dataset.id) {
      if (fd.has('groupId')) body.groupId = fd.get('groupId');
      const updated = await persist(api.updateItem(form.dataset.id, body));
      if (!updated) return;
      upsertItems([updated]);
      ui.editing = null;
      ui.focus = `[data-action="edit-item"][data-id="${updated.id}"]`;
    } else {
      const created = await persist(api.createItem({ groupId: g.id, ...body }));
      if (!created) return;
      upsertItems([created]);   // the add form stays open for rapid entry
    }
    render();
  },

  async group(form, fd) {
    const title = text(fd, 'title');
    const body = { title };
    if (fd.has('focus')) body.focus = text(fd, 'focus');
    if (fd.has('month')) { const m = intOrNull(fd.get('month')); if (Number.isInteger(m)) body.month = m; }
    if (fd.has('step')) body.step = intOrNull(fd.get('step'));
    form.querySelector('.btn-primary').disabled = true;

    if (form.dataset.id) {
      const updated = await persist(api.updateGroup(form.dataset.id, body));
      if (!updated) return;
      upsertGroups([updated]);
      ui.focus = `[data-action="edit-group"][data-id="${updated.id}"]`;
    } else {
      const { section, parent } = form.dataset;
      const created = await persist(api.createGroup({ sectionId: section, ...(parent ? { parentId: parent } : {}), ...body }));
      if (!created) return;
      upsertGroups([created]);
      if (created.parentId) ui.open.add(created.id);
    }
    ui.editing = null;
    render();
  },
});

/* ─────────────── Click actions ─────────────── */

async function undoRestore(records) {
  const restored = await persist(api.restore(records));
  if (!restored) return;
  upsertGroups(restored.groups);
  upsertItems(restored.items);
  render();
}

Object.assign(ACTIONS, {
  'add-item'(b) {
    ui.editing = { key: `add:${b.dataset.group}:${b.dataset.level || ''}` };
    ui.open.add(b.dataset.group);
    render();
  },
  'edit-item'(b) {
    ui.editing = { key: 'edit:' + b.dataset.id };
    const it = itemById.get(b.dataset.id);
    if (it) ui.open.add(it.groupId);
    render();
  },
  'cancel-edit'() { ui.editing = null; render(); },

  async 'move-item'(b) {
    const it = itemById.get(b.dataset.id);
    if (!it) return;
    const siblings = itemSiblings(it);
    if (!swapOrder(siblings, it, Number(b.dataset.dir))) return;
    reindex();
    ui.focus = `[data-action="move-item"][data-dir="${b.dataset.dir}"][data-id="${it.id}"]`;
    render();
    await persist(api.reorderItems(positionsOf(siblings)));
  },

  async 'del-item'(b) {
    const it = itemById.get(b.dataset.id);
    if (!it || !(await confirmDialog('Delete item?', `“${esc(it.title)}” will be removed.`))) return;
    const removed = await persist(api.deleteItem(it.id));
    if (!removed) return;
    dropItems([it.id]);
    render();
    toast(`Deleted “${it.title}”`, () => undoRestore({ items: [removed] }));
  },

  'edit-group'(b) { ui.editing = { key: 'gedit:' + b.dataset.id }; ui.open.add(b.dataset.id); render(); },
  'add-group'(b) {
    const { section, parent, month } = b.dataset;
    ui.editing = { key: `gadd:${section}:${parent}:${month}` };
    render();
  },

  async 'move-group'(b) {
    const g = groupById.get(b.dataset.id);
    if (!g) return;
    const siblings = groupSiblings(g);
    if (!swapOrder(siblings, g, Number(b.dataset.dir))) return;
    reindex();
    ui.focus = `[data-action="move-group"][data-dir="${b.dataset.dir}"][data-id="${g.id}"]`;
    render();
    await persist(api.reorderGroups(positionsOf(siblings)));
  },

  async 'del-group'(b) {
    const g = groupById.get(b.dataset.id);
    if (!g) return;
    const subs = state.groups.filter(x => x.parentId === g.id).length;
    const n = state.items.filter(i => i.groupId === g.id || groupById.get(i.groupId)?.parentId === g.id).length;
    const what = [subs && plural(subs, 'sub-step'), plural(n, 'item')].filter(Boolean).join(' and ');
    if (!(await confirmDialog(`Delete ${groupNoun(g)}?`, `“${esc(groupLabel(g))}” and its ${what} will be removed.`))) return;
    const removed = await persist(api.deleteGroup(g.id));
    if (!removed) return;
    dropGroups(removed.groups.map(x => x.id));
    render();
    toast(`Deleted “${groupLabel(g)}”`, () => undoRestore(removed));
  },
});
