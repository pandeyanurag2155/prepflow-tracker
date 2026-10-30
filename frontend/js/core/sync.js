import { api } from '../lib/api.js';
import { $ } from '../lib/dom.js';
import { setState } from './store.js';
import { render } from './render.js';
import { toast } from '../ui/toast.js';

let pending = 0;
let failed = false;

export function setStatus(msg) {
  const el = $('#status');
  if (el) el.textContent = msg;
}

/**
 * Await an API call while showing the save status.
 * On failure: tell the user, then reload the server’s truth so the UI never shows unsaved state.
 * Resolves to the response data, or null if the call failed.
 */
export async function persist(promise) {
  pending++;
  setStatus('Saving…');
  try {
    const result = await promise;
    failed = false;
    return result;
  } catch (err) {
    failed = true;
    if (err.status === 401) return null;   // logged out: main.js is already showing the login page
    toast(`Couldn’t save: ${err.message}`);
    await reload();
    return null;
  } finally {
    pending--;
    if (!pending) setStatus(failed ? 'Couldn’t save' : 'Saved');
  }
}

export async function reload() {
  try {
    setState(await api.tracker());
    render();
  } catch {
    setStatus('Offline: changes aren’t being saved');
  }
}
