import { randomUUID } from 'node:crypto';
import { withTransaction } from '../db/pool.js';
import { HttpError } from '../utils/http-error.js';
import { NESTED_SECTIONS } from '../domain/constants.js';
import { groupsRepository } from '../repositories/groups.repository.js';
import { itemsRepository } from '../repositories/items.repository.js';

export const groupsService = {
  async create(input) {
    return withTransaction(async db => {
      const parentId = input.parentId || null;
      if (parentId) {
        const parent = await groupsRepository.findById(parentId, db);
        if (!parent) throw HttpError.notFound('Parent group');
        if (parent.sectionId !== input.sectionId || !NESTED_SECTIONS.includes(input.sectionId) || parent.parentId) {
          throw HttpError.badRequest('Only Striver steps and core subjects can have children');
        }
      }
      const order = await groupsRepository.nextPosition(input.sectionId, parentId, db);
      const [group] = await groupsRepository.insertMany([{
        id: input.id || randomUUID(), sectionId: input.sectionId, parentId,
        title: input.title ?? '', focus: input.focus ?? '', month: input.month ?? null, step: input.step ?? null,
        role: null, order,
      }], {}, db);
      if (!group) throw HttpError.conflict('A group with this id already exists');
      return group;
    });
  },

  /** Rename, refocus, renumber, or move a theme to another month. */
  async update(id, patch) {
    const group = await groupsRepository.update(id, patch);
    if (!group) throw HttpError.notFound('Group');
    return group;
  },

  /** Deletes the group, its sub-groups and their items. Returns what was removed so the client can undo. */
  async remove(id) {
    return withTransaction(async db => {
      const groups = await groupsRepository.findTree(id, db);
      if (!groups.length) throw HttpError.notFound('Group');
      const items = await itemsRepository.listByGroups(groups.map(g => g.id), db);
      await groupsRepository.deleteById(id, db);
      return { groups, items };
    });
  },

  async reorder(positions) {
    const updated = await groupsRepository.setPositions(positions);
    if (updated !== positions.length) throw HttpError.notFound('One or more groups');
    return { updated };
  },
};
