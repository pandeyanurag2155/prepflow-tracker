import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../db/pool.js';
import { env } from '../config/env.js';
import { REVISIT_AFTER_DAYS } from '../domain/constants.js';
import { shapeItem } from '../domain/normalise.js';
import { parseBulkLines } from '../domain/bulk-parse.js';
import { addDaysYmd, ymdInZone } from '../utils/dates.js';
import { HttpError } from '../utils/http-error.js';
import { itemsRepository } from '../repositories/items.repository.js';
import { groupsRepository } from '../repositories/groups.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';

async function requireGroup(id, db = pool) {
  const group = await groupsRepository.findById(id, db);
  if (!group) throw HttpError.notFound('Group');
  return group;
}

/** With linked duplicates on, a new problem whose key is already solved elsewhere arrives ticked. */
async function inheritDone(items, db) {
  const { linkDuplicates } = await settingsRepository.get(db);
  if (!linkDuplicates) return items;
  const twins = await itemsRepository.doneTwins([...new Set(items.filter(i => i.key).map(i => i.key))], db);
  return items.map(i => {
    const twin = twins.get(i.key);
    return twin ? { ...i, done: true, doneAt: twin.doneAt, revisitDates: twin.revisitDates } : i;
  });
}

export const itemsService = {
  async create(input) {
    return withTransaction(async db => {
      const group = await requireGroup(input.groupId, db);
      const order = await itemsRepository.nextPosition(group.id, db);
      const [shaped] = await inheritDone([shapeItem({
        id: input.id || randomUUID(), groupId: group.id, done: false, doneAt: null, revisitDates: [], order, ...input,
      }, group.sectionId)], db);
      const [item] = await itemsRepository.insertMany([shaped], {}, db);
      if (!item) throw HttpError.conflict('An item with this id already exists');
      return item;
    });
  },

  /** Edit fields and/or move to another group of the same section (appended at the end). */
  async update(id, patch) {
    return withTransaction(async db => {
      const current = await itemsRepository.findById(id, db);
      if (!current) throw HttpError.notFound('Item');
      let group = await requireGroup(current.groupId, db);
      let order;
      if (patch.groupId && patch.groupId !== current.groupId) {
        group = await requireGroup(patch.groupId, db);
        if (group.sectionId !== current.sectionId) throw HttpError.badRequest('Items can only move within their own section');
        order = await itemsRepository.nextPosition(group.id, db);
      }
      const next = shapeItem({ ...current, ...patch }, group.sectionId);
      return itemsRepository.update(id, {
        groupId: group.id, title: next.title, kind: next.kind, track: next.track, level: next.level,
        difficulty: next.difficulty, notes: next.notes, link: next.link, key: next.key, order,
        revisitDates: patch.revisitDates,
      }, db);
    });
  },

  /**
   * Tick or untick. Ticking a problem sets revisitDates to today + 3 and + 7 days (APP_TIMEZONE).
   * With settings.linkDuplicates, every problem sharing the key changes too. Returns all changed items.
   */
  async setDone(id, done) {
    return withTransaction(async db => {
      const item = await itemsRepository.findById(id, db);
      if (!item) throw HttpError.notFound('Item');
      const { linkDuplicates } = await settingsRepository.get(db);
      const ids = item.kind === 'problem' && item.key && linkDuplicates
        ? await itemsRepository.problemIdsByKey(item.key, db)
        : [item.id];
      const now = new Date();
      const today = ymdInZone(now, env.APP_TIMEZONE);
      return itemsRepository.setDone(ids, {
        done,
        doneAt: done ? now : null,
        revisitDates: done ? REVISIT_AFTER_DAYS.map(n => addDaysYmd(today, n)) : [],
      }, db);
    });
  },

  async remove(id) {
    const item = await itemsRepository.deleteById(id);
    if (!item) throw HttpError.notFound('Item');
    return item;
  },

  async reorder(positions) {
    const updated = await itemsRepository.setPositions(positions);
    if (updated !== positions.length) throw HttpError.notFound('One or more items');
    return { updated };
  },

  /**
   * Bulk add parsed lines to a group. dryRun returns the parsed rows (with skip reasons) without writing,
   * which the UI uses for its live preview, so preview and result can never disagree.
   */
  async bulkAdd({ groupId, text, dryRun }) {
    return withTransaction(async db => {
      const group = await requireGroup(groupId, db);
      if (!SECTION_ALLOWS_PROBLEMS.has(group.sectionId)) throw HttpError.badRequest('Bulk add is only for problem lists');
      const rows = parseBulkLines(text, await itemsRepository.keysInGroup(group.id, db))
        .map(({ key, ...r }) => r);
      if (dryRun) return { rows, items: [] };
      let order = await itemsRepository.nextPosition(group.id, db);
      const toAdd = rows.filter(r => !r.skip).map(r => shapeItem({
        id: randomUUID(), groupId: group.id, kind: 'problem', title: r.title, difficulty: r.difficulty, link: r.link,
        done: false, doneAt: null, revisitDates: [], order: order++,
      }, group.sectionId));
      const items = await itemsRepository.insertMany(await inheritDone(toAdd, db), {}, db);
      return { rows, items };
    });
  },
};

const SECTION_ALLOWS_PROBLEMS = new Set(['dsa', 'striver']);
