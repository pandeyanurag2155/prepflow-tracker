import { itemsService } from '../services/items.service.js';

export const itemsController = {
  async create(req, res) {
    res.status(201).json({ data: await itemsService.create(req.valid.body) });
  },

  async update(req, res) {
    res.json({ data: await itemsService.update(req.valid.params.id, req.valid.body) });
  },

  /** Responds with every item that changed (linked duplicates included). */
  async setDone(req, res) {
    res.json({ data: await itemsService.setDone(req.valid.params.id, req.valid.body.done) });
  },

  async remove(req, res) {
    res.json({ data: await itemsService.remove(req.valid.params.id) });
  },

  async reorder(req, res) {
    res.json({ data: await itemsService.reorder(req.valid.body) });
  },

  async bulkAdd(req, res) {
    const result = await itemsService.bulkAdd(req.valid.body);
    res.status(req.valid.body.dryRun ? 200 : 201).json({ data: result });
  },
};
