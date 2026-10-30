import { groupsService } from '../services/groups.service.js';

export const groupsController = {
  async create(req, res) {
    res.status(201).json({ data: await groupsService.create(req.valid.body) });
  },

  async update(req, res) {
    res.json({ data: await groupsService.update(req.valid.params.id, req.valid.body) });
  },

  /** Responds with the removed groups and items so the client can offer Undo. */
  async remove(req, res) {
    res.json({ data: await groupsService.remove(req.valid.params.id) });
  },

  async reorder(req, res) {
    res.json({ data: await groupsService.reorder(req.valid.body) });
  },
};
