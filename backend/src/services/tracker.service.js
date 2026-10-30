import { randomUUID } from 'node:crypto';
import { withTransaction, pool } from '../db/pool.js';
import { SCHEMA_VERSION, SECTIONS } from '../domain/constants.js';
import { buildSeed, buildStriverSeed, buildSectionSeed } from '../domain/build-seed.js';
import { migrate, normaliseRecords } from '../domain/normalise.js';
import { HttpError } from '../utils/http-error.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { groupsRepository } from '../repositories/groups.repository.js';
import { itemsRepository } from '../repositories/items.repository.js';

// Sequential on purpose: inside a transaction `db` is a single client, which can’t run queries in parallel.
async function snapshot(db = pool) {
  const settings = await settingsRepository.get(db);
  const groups = await groupsRepository.list(db);
  const items = await itemsRepository.list(db);
  return { schemaVersion: SCHEMA_VERSION, settings, sections: SECTIONS, groups, items };
}

async function replaceAll(db, { groups, items }) {
  await groupsRepository.deleteAll(db);
  await groupsRepository.insertMany(groups, {}, db);
  await itemsRepository.insertMany(items, {}, db);
}

export const trackerService = {
  /** Everything the UI needs in one round trip. Same shape as the export file. */
  snapshot: () => snapshot(),

  /** Replace groups and items with the starting plan. Settings are kept. */
  async resetToSeed() {
    return withTransaction(async db => {
      await replaceAll(db, buildSeed());
      return snapshot(db);
    });
  },

  /** Validate + migrate an export file, then replace everything (settings included) atomically. */
  async importDocument(doc) {
    let data;
    try {
      data = migrate(doc);
    } catch (err) {
      throw HttpError.badRequest(`Invalid tracker file: ${err.message}`);
    }
    return withTransaction(async db => {
      await settingsRepository.update(data.settings, db);
      await replaceAll(db, data);
      return snapshot(db);
    });
  },

  /**
   * Replace the Striver section with the current striver-sheet.json, keeping progress:
   * a new item is ticked if an old Striver item with the same key was done (or, with linked
   * duplicates on, a NeetCode twin is). Old items that match nothing in the sheet are kept in a
   * “Kept from before the refresh” sub-step, so nothing you added is lost.
   */
  async refreshStriver() {
    return withTransaction(async db => {
      const keyOf = i => i.key || i.title.toLowerCase();
      const old = (await itemsRepository.list(db)).filter(i => i.sectionId === 'striver');
      const { groups, items } = buildStriverSeed();
      await groupsRepository.deleteBySection('striver', db);

      const { linkDuplicates } = await settingsRepository.get(db);
      const twins = linkDuplicates ? await itemsRepository.doneTwins([...new Set(items.map(i => i.key).filter(Boolean))], db) : new Map();
      const oldDone = new Map(old.filter(i => i.done).map(i => [keyOf(i), i]));
      const merged = items.map(i => {
        const prev = oldDone.get(keyOf(i)) || twins.get(i.key);
        return prev ? { ...i, done: true, doneAt: prev.doneAt, revisitDates: prev.revisitDates } : i;
      });

      const newKeys = new Set(items.map(keyOf));
      const leftovers = old.filter(i => !newKeys.has(keyOf(i)));
      if (leftovers.length) {
        const buffer = groups.find(g => !g.parentId && !g.step);
        const keep = { ...groups.at(-1), id: randomUUID(), parentId: buffer.id, title: 'Kept from before the refresh', order: 99 };
        groups.push(keep);
        leftovers.forEach((i, n) => merged.push({ ...i, groupId: keep.id, order: n }));
      }

      await groupsRepository.insertMany(groups, {}, db);
      await itemsRepository.insertMany(merged, {}, db);
      return { groups: groups.length, items: merged.length, done: merged.filter(i => i.done).length, kept: leftovers.length };
    });
  },

  /** Add a section that exists in the seed but not yet in this database (e.g. after an upgrade). */
  async addMissingSection(sectionId) {
    return withTransaction(async db => {
      const existing = (await groupsRepository.list(db)).filter(g => g.sectionId === sectionId).length;
      if (existing) return { added: false, groups: existing };
      const { groups, items } = buildSectionSeed(sectionId);
      if (!groups.length) throw HttpError.badRequest(`No seed data for section “${sectionId}”`);
      await groupsRepository.insertMany(groups, {}, db);
      await itemsRepository.insertMany(items, {}, db);
      return { added: true, groups: groups.length, items: items.length };
    });
  },

  /** Undo for deletes: re-insert previously deleted groups/items with their original ids. */
  async restore({ groups = [], items = [] }) {
    return withTransaction(async db => {
      const known = new Map((await groupsRepository.list(db)).map(g => [g.id, g]));
      const clean = normaliseRecords(groups, items, known);
      const restoredGroups = await groupsRepository.insertMany(clean.groups, { ignoreExisting: true }, db);
      const restoredItems = await itemsRepository.insertMany(clean.items, { ignoreExisting: true }, db);
      return { groups: restoredGroups, items: restoredItems };
    });
  },
};
