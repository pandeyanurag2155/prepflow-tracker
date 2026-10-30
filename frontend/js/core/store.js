/* Client-side copy of the server snapshot plus UI-only state.
   state = { schemaVersion, settings, sections, groups, items } exactly as GET /api/v1/tracker returns it.
   Mutations go to the API first (or optimistically, then reconcile) and are mirrored here with the
   upsert/drop helpers, which keep the lookup indexes in sync. */
import { byOrder, push } from '../lib/dom.js';

export let state = null;

export const ui = {
  open: new Set(),              // open Striver sub-steps
  track: 'All',                 // roadmap track filter
  diff: 'All', notDone: false,  // Striver filters
  editing: null,                // { key } of the single open inline form (see ui/editing.js)
  query: '',                    // global search
  scrollTo: null,               // element id to scroll to after the next render
  focus: null,                  // selector to focus after the next render
};

export let groupById = new Map();
export let itemById = new Map();
let itemsByGroup = new Map();
export let keyIndex = new Map();    // problem key → problems sharing it (linked duplicates)

export function setState(next) {
  state = next;
  reindex();
}

/** On log-out: drop the plan from memory so nothing can render it again until the next login. */
export function clearState() {
  state = null;
  ui.query = '';
  ui.editing = null;
}

/** Rebuild lookups after any structural change (add / delete / move / reorder / import). */
export function reindex() {
  groupById = new Map(state.groups.map(g => [g.id, g]));
  itemById = new Map(state.items.map(i => [i.id, i]));
  itemsByGroup = new Map();
  keyIndex = new Map();
  for (const it of state.items) {
    push(itemsByGroup, it.groupId, it);
    if (it.kind === 'problem' && it.key) push(keyIndex, it.key, it);
  }
  itemsByGroup.forEach(list => list.sort(byOrder));
}

export const groupItems = id => itemsByGroup.get(id) || [];
export const childGroups = (sectionId, parentId = null) =>
  state.groups.filter(g => g.sectionId === sectionId && (g.parentId || null) === parentId).sort(byOrder);

export function upsertItems(items) {
  for (const it of items) {
    const cur = itemById.get(it.id);
    if (cur) Object.assign(cur, it); else state.items.push(it);
  }
  reindex();
}
export function upsertGroups(groups) {
  for (const g of groups) {
    const cur = groupById.get(g.id);
    if (cur) Object.assign(cur, g); else state.groups.push(g);
  }
  reindex();
}
export function dropItems(ids) {
  const gone = new Set(ids);
  state.items = state.items.filter(i => !gone.has(i.id));
  reindex();
}
export function dropGroups(ids) {
  const gone = new Set(ids);
  state.groups = state.groups.filter(g => !gone.has(g.id));
  state.items = state.items.filter(i => !gone.has(i.groupId));
  reindex();
}

/* Progress counts: one pass over all items → { done, total } per scope.
     s:<section>  p:<section> (problems only)  g:<group> (a Striver step includes its sub-steps)
     k:<group>:<kind>  gl:<group>:<level>  l:<section>:<level>  step:<n>
     m:<section>:<month> / mp:<section>:<month> (problems only) for roadmap and NeetCode themes; month “later” = beyond the plan */
export let T = new Map();
export const cnt = scope => T.get(scope) || { done: 0, total: 0 };

export function recount() {
  const t = new Map();
  const add = (k, done) => {
    let c = t.get(k);
    if (!c) t.set(k, (c = { done: 0, total: 0 }));
    c.total++;
    if (done) c.done++;
  };
  for (const it of state.items) {
    const g = groupById.get(it.groupId);
    if (!g) continue;
    const d = it.done;
    add('s:' + it.sectionId, d);
    if (it.kind === 'problem') add('p:' + it.sectionId, d);
    add('g:' + g.id, d);
    add(`k:${g.id}:${it.kind}`, d);
    if (it.level) { add(`gl:${g.id}:${it.level}`, d); add(`l:${it.sectionId}:${it.level}`, d); }
    if ((g.sectionId === 'roadmap' || g.sectionId === 'dsa') && g.month != null) {
      const m = g.month <= state.settings.planMonths ? g.month : 'later';
      add(`m:${g.sectionId}:${m}`, d);
      if (it.kind === 'problem') add(`mp:${g.sectionId}:${m}`, d);
    }
    const p = g.parentId && groupById.get(g.parentId);
    if (p) {
      add('g:' + p.id, d);
      if (p.step) add('step:' + p.step, d);
    }
  }
  T = t;
}
