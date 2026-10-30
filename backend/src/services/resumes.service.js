import { HttpError } from '../utils/http-error.js';
import { resumesRepository } from '../repositories/resumes.repository.js';

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

const PDF = 'application/pdf';
const DOC = 'application/msword';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** The file type is decided by its first bytes, not by the name or the browser’s claim. */
function sniff(buf, filename) {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return PDF;
  if (buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) && /\.doc$/i.test(filename)) return DOC;
  if (buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && /\.docx$/i.test(filename)
    && buf.includes(Buffer.from('word/'))) return DOCX;
  return null;
}

/** Keep the name readable but harmless in a Content-Disposition header and on disk. */
function cleanFilename(name) {
  const base = String(name || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f"<>|:*?]/g, '').trim();
  return base.slice(0, 200) || 'resume';
}

export const resumesService = {
  list: () => resumesRepository.list(),

  async upload({ body, filename, label }) {
    if (!Buffer.isBuffer(body) || !body.length) throw HttpError.badRequest('Choose a file to upload');
    if (body.length > MAX_RESUME_BYTES) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'File is larger than 10 MB');
    const name = cleanFilename(filename);
    const contentType = sniff(body, name);
    if (!contentType) throw HttpError.badRequest('Only PDF, DOC or DOCX files can be uploaded');
    return resumesRepository.create({ label: String(label || '').trim().slice(0, 100), filename: name, contentType, data: body });
  },

  async file(id) {
    const file = await resumesRepository.findFile(id);
    if (!file) throw HttpError.notFound('Resume');
    return file;
  },

  async rename(id, label) {
    const resume = await resumesRepository.rename(id, label);
    if (!resume) throw HttpError.notFound('Resume');
    return resume;
  },

  async remove(id) {
    if (!(await resumesRepository.deleteById(id))) throw HttpError.notFound('Resume');
    return { ok: true };
  },
};
