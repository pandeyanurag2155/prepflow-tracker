import { randomUUID } from 'node:crypto';
import {
  SCHEMA_VERSION, SECTION_IDS, KINDS, TRACKS, LEVELS, DIFFICULTIES, THEMES, DEFAULT_SETTINGS, NESTED_SECTIONS,
} from './constants.js';
import { keyFor } from './problem-key.js';
import { normaliseLink } from './bulk-parse.js';
import { isYmd } from '../utils/dates.js';

/** Kinds each section may hold; the first one is the default. */
export const SECTION_KINDS = {
  roadmap: ['task'],
  dsa: ['problem', 'concept'],
  striver: ['problem', 'concept'],   // concept = the sheet’s theory/learning lessons
  revision: ['topic'],
  sysdesign: ['topic'],
  tools: ['topic'],
  core: ['topic'],
};

/** Sections whose topics are split into Basic / Intermediate / Advanced. */
const LEVELLED_SECTIONS = new Set(['revision', 'sysdesign', 'tools']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);
const oneOf = (v, list) => (list.includes(v) ? v : '');

/**
 * Fit item fields to its section: only problems keep a difficulty, levelled topics (revision, system design, tools) a level,
 * roadmap tasks a track. Always recomputes `key`.
 */
export function shapeItem(item, sectionId) {
  const kinds = SECTION_KINDS[sectionId];
  const kind = kinds.includes(item.kind) ? item.kind : kinds[0];
  return {
    ...item,
    sectionId,
    kind,
    title: str(item.title, 500),
    notes: String(item.notes ?? '').slice(0, 10_000),
    link: normaliseLink(item.link),
    track: sectionId === 'roadmap' ? oneOf(item.track, TRACKS) : '',
    level: LEVELLED_SECTIONS.has(sectionId) ? (oneOf(item.level, LEVELS) || 'Basic') : '',
    difficulty: kind === 'problem' ? oneOf(item.difficulty, DIFFICULTIES) : '',
    key: keyFor(kind, item.title),
  };
}

export function normaliseSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    planStart: isYmd(s.planStart) ? s.planStart : DEFAULT_SETTINGS.planStart,
    planMonths: int(Number(s.planMonths), 1, 12) ?? DEFAULT_SETTINGS.planMonths,
    theme: THEMES.includes(s.theme) ? s.theme : 'system',
    linkDuplicates: Boolean(s.linkDuplicates),
    hideCompleted: Boolean(s.hideCompleted),
  };
}

/**
 * Clean untrusted groups/items (an import file or an undo payload) so every row satisfies the schema:
 * bad ids are replaced, duplicates and orphans dropped, enums coerced, keys recomputed.
 * Progress (done, doneAt, revisitDates) is kept. Groups come back parents-first.
 * `knownGroups` lets items reference groups that already exist in the database (restore).
 */
export function normaliseRecords(rawGroups = [], rawItems = [], knownGroups = new Map()) {
  const idMap = new Map();     // old id → id we store (only differs when the old id wasn't a UUID)
  const seen = new Set();
  const groups = [];
  for (const g of rawGroups) {
    if (!g || typeof g !== 'object' || !SECTION_IDS.includes(g.sectionId) || g.id == null || idMap.has(String(g.id))) continue;
    const id = UUID.test(g.id) ? g.id : randomUUID();
    idMap.set(String(g.id), id);
    seen.add(id);
    groups.push({
      id, sectionId: g.sectionId, parentId: g.parentId ?? null,
      title: str(g.title, 200), focus: str(g.focus, 500),
      month: g.sectionId === 'roadmap' || g.sectionId === 'dsa' ? int(g.month, 0, 12) : null, step: int(g.step, 1, 99), role: g.role === 'tips' ? 'tips' : null,
      order: int(g.order, 0, 1e6) ?? 0,
    });
  }
  const groupById = new Map([...knownGroups, ...groups.map(g => [g.id, g])]);
  for (const g of groups) {
    const parentId = g.parentId == null ? null : (idMap.get(String(g.parentId)) ?? g.parentId);
    const parent = parentId && groupById.get(parentId);
    // Only nested sections (Striver, core subjects) have children, and only one level deep
    g.parentId = parent && parent !== g && parent.sectionId === g.sectionId && NESTED_SECTIONS.includes(g.sectionId) && !parent.parentId ? parentId : null;
  }
  groups.sort((a, b) => Number(Boolean(a.parentId)) - Number(Boolean(b.parentId)));

  const items = [];
  for (const i of rawItems) {
    if (!i || typeof i !== 'object' || i.id == null || !str(i.title, 500)) continue;
    const groupId = idMap.get(String(i.groupId)) ?? i.groupId;
    const group = groupById.get(groupId);
    if (!group) continue;
    const id = UUID.test(i.id) && !seen.has(i.id) ? i.id : randomUUID();
    seen.add(id);
    const doneAt = i.done && i.doneAt && !Number.isNaN(Date.parse(i.doneAt)) ? new Date(i.doneAt).toISOString() : null;
    const done = Boolean(i.done);
    items.push(shapeItem({
      id, groupId, title: i.title, kind: i.kind, track: i.track, level: i.level, difficulty: i.difficulty,
      notes: i.notes, link: i.link,
      done, doneAt: done ? (doneAt || new Date().toISOString()) : null,
      revisitDates: done && Array.isArray(i.revisitDates) ? i.revisitDates.filter(isYmd).slice(0, 10) : [],
      order: int(i.order, 0, 1e6) ?? 0,
    }, group.sectionId));
  }
  return { groups, items };
}

/**
 * migrate(doc): bring an exported/imported document of any older schemaVersion up to SCHEMA_VERSION.
 * Each `case n:` upgrades n → n + 1 and falls through. When the shape changes, bump SCHEMA_VERSION
 * in constants.js and add the case for the previous number here, so old backups keep their progress.
 */
export function migrate(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new TypeError('Not a tracker export');
  const d = { ...doc };
  const from = Number.isInteger(d.schemaVersion) ? d.schemaVersion : 0;
  if (from > SCHEMA_VERSION) throw new RangeError(`File is from a newer version (schema ${from}); update the app first`);
  switch (from) {
    case 0:
      // Unversioned exports: bare { groups, items } with optional settings.
      d.settings = d.settings || {};
      // falls through
    case 1:
      // v1 → v2: week schedule → month plan. Weeks 1–3 → month 1, 4–6 → 2, 7+ → 3; Striver loses its schedule.
      d.settings = { ...d.settings, planStart: d.settings?.planStart ?? d.settings?.roadmapStart };
      d.groups = Array.isArray(d.groups) ? d.groups.map(g => (g && typeof g === 'object' && 'week' in g
        ? { ...g, month: g.week == null ? null : g.week === 0 ? 0 : g.week <= 3 ? 1 : g.week <= 6 ? 2 : 3 }
        : g)) : d.groups;
      // falls through
    // case 2: v2 → v3 goes here
    default:
      break;
  }
  if (!Array.isArray(d.groups) || !Array.isArray(d.items)) throw new TypeError('File has no groups/items arrays');
  const { groups, items } = normaliseRecords(d.groups, d.items);
  return { schemaVersion: SCHEMA_VERSION, settings: normaliseSettings(d.settings), groups, items };
}
