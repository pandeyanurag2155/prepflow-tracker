import { pool } from '../db/pool.js';
import { trackerService } from '../services/tracker.service.js';
import { settingsService } from '../services/settings.service.js';

export const trackerController = {
  async health(_req, res) {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  },

  async snapshot(_req, res) {
    res.json({ data: await trackerService.snapshot() });
  },

  async exportFile(_req, res) {
    const data = await trackerService.snapshot();
    const date = new Date().toISOString().slice(0, 10);
    res.attachment(`prep-tracker-${date}.json`).type('application/json').send(JSON.stringify(data, null, 2));
  },

  async importFile(req, res) {
    res.json({ data: await trackerService.importDocument(req.valid.body) });
  },

  async reset(_req, res) {
    res.json({ data: await trackerService.resetToSeed() });
  },

  async restore(req, res) {
    res.status(201).json({ data: await trackerService.restore(req.valid.body) });
  },

  async getSettings(_req, res) {
    res.json({ data: await settingsService.get() });
  },

  async updateSettings(req, res) {
    res.json({ data: await settingsService.update(req.valid.body) });
  },
};
