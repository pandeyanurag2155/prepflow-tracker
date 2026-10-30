import express from 'express';
import { resumesService, MAX_RESUME_BYTES } from '../services/resumes.service.js';

/** The upload body is the raw file; name and label travel in headers (URI-encoded). */
export const rawFileBody = express.raw({ type: () => true, limit: MAX_RESUME_BYTES });
const header = (req, name) => { try { return decodeURIComponent(req.get(name) || ''); } catch { return ''; } };

export const resumesController = {
  async list(_req, res) {
    res.json({ data: await resumesService.list() });
  },

  async upload(req, res) {
    const resume = await resumesService.upload({ body: req.body, filename: header(req, 'X-File-Name'), label: header(req, 'X-Label') });
    res.status(201).json({ data: resume });
  },

  /** ?download=1 saves the file; otherwise PDFs open in the browser. */
  async file(req, res) {
    const f = await resumesService.file(req.valid.params.id);
    const inline = !req.query.download && f.contentType === 'application/pdf';
    // The app's CSP (object-src 'none') would blank Chrome's built-in PDF viewer. Files here are
    // only ever verified PDF/DOC/DOCX bytes (see resumes.service sniff), served with nosniff.
    res.removeHeader('Content-Security-Policy');
    res.set({
      'Content-Type': f.contentType,
      'Content-Length': f.data.length,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      'Cache-Control': 'private, no-store',
    });
    res.send(f.data);
  },

  async rename(req, res) {
    res.json({ data: await resumesService.rename(req.valid.params.id, req.valid.body.label) });
  },

  async remove(req, res) {
    res.json({ data: await resumesService.remove(req.valid.params.id) });
  },
};
