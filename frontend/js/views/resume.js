// My resume: upload and keep resume files on the server (PDF / DOC / DOCX, up to 10 MB each).
import { $, esc } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { ACTIONS, FORMS } from '../core/registry.js';
import { persist, setStatus } from '../core/sync.js';
import { viewHead, input } from '../ui/widgets.js';
import { openDialog, confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';

const MAX_BYTES = 10 * 1024 * 1024;
const TYPE_LABEL = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};
const DATE_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const size = n => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

let resumes = [];

function row(r, i) {
  const title = r.label || r.filename;
  return `<li class="resume" data-id="${r.id}">
    <div class="resume-main">
      <div class="resume-title"><strong>${esc(title)}</strong>${i === 0 ? '<span class="tag tag-now">Latest</span>' : ''}</div>
      <div class="hint">${r.label ? `${esc(r.filename)} · ` : ''}${TYPE_LABEL[r.contentType] || ''} · ${size(r.size)} · uploaded ${DATE_TIME.format(new Date(r.createdAt))}</div>
    </div>
    <div class="resume-tools">
      ${r.contentType === 'application/pdf' ? `<a class="btn btn-sm" href="${api.resumeUrl(r.id)}" target="_blank" rel="noopener">Open</a>` : ''}
      <a class="btn btn-sm" href="${api.resumeUrl(r.id, true)}" download>Download</a>
      <button type="button" class="btn btn-sm" data-action="resume-rename" data-id="${r.id}">Rename</button>
      <button type="button" class="btn btn-sm btn-danger" data-action="resume-delete" data-id="${r.id}">Delete</button>
    </div>
  </li>`;
}

function paintList() {
  const el = $('#resume-list');
  if (!el) return;
  el.innerHTML = resumes.length
    ? `<ul class="resume-list">${resumes.map(row).join('')}</ul>`
    : '<p class="empty">No resume yet. Upload one above.</p>';
}

async function load() {
  try {
    resumes = await api.resumes();
  } catch (err) {
    if (err.status !== 401) $('#resume-list').innerHTML = `<p class="empty">Couldn’t load your files: ${esc(err.message)}</p>`;
    return;
  }
  paintList();
}

export function renderResume() {
  queueMicrotask(load);   // the list comes from its own endpoint, after this HTML is on the page
  return `${viewHead('My resume', 'Keep your resume here, private behind your login. PDF, DOC or DOCX, up to 10 MB. Upload a new version any time; older ones stay until you delete them.')}
    <section class="card">
      <form class="resume-upload" data-form="resume-upload">
        <label class="field"><span>File</span><input type="file" name="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>
        <label class="field"><span>Label (optional)</span><input name="label" maxlength="100" placeholder="e.g. Backend – Oct 2026"></label>
        <button class="btn btn-primary">Upload</button>
      </form>
    </section>
    <section class="card" style="margin-top:16px"><div class="card-head"><h3>Your files</h3></div>
      <div id="resume-list"><p class="empty">Loading…</p></div></section>`;
}

FORMS['resume-upload'] = async (form, fd) => {
  const file = fd.get('file');
  if (!file || !file.size) { toast('Choose a file first'); return; }
  if (file.size > MAX_BYTES) { toast('That file is larger than 10 MB'); return; }
  if (!/\.(pdf|docx?)$/i.test(file.name)) { toast('Only PDF, DOC or DOCX files'); return; }
  const btn = form.querySelector('.btn-primary');
  btn.disabled = true;
  btn.textContent = 'Uploading…';
  // Not persist(): a failed upload shouldn't reload the view and wipe the form
  let saved;
  setStatus('Uploading…');
  try {
    saved = await api.uploadResume(file, String(fd.get('label') || ''));
    setStatus('Saved');
  } catch (err) {
    setStatus('Couldn’t save');
    if (err.status !== 401) toast(`Couldn’t upload: ${err.message}`);
    return;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload';
  }
  form.reset();
  resumes = [saved, ...resumes];
  paintList();
  toast(`Uploaded “${saved.filename}”`);
};

Object.assign(ACTIONS, {
  async 'resume-rename'(b) {
    const r = resumes.find(x => x.id === b.dataset.id);
    if (!r) return;
    const label = await openDialog(`<h2>Rename</h2>
      ${input('label', 'Label', r.label, 'maxlength="100" data-autofocus')}
      <div class="form-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">Save</button></div>`,
      form => String(new FormData(form).get('label') || '').trim());
    if (label == null) return;
    const updated = await persist(api.renameResume(r.id, label));
    if (!updated) return;
    Object.assign(r, updated);
    paintList();
  },

  async 'resume-delete'(b) {
    const r = resumes.find(x => x.id === b.dataset.id);
    if (!r || !(await confirmDialog('Delete this file?', `“${esc(r.label || r.filename)}” will be deleted for good. This can’t be undone.`))) return;
    if (!(await persist(api.deleteResume(r.id)))) return;
    resumes = resumes.filter(x => x !== r);
    paintList();
    setStatus('Deleted');
  },
});
