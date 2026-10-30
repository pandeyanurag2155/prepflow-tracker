// Entry point: global event delegation and boot. Feature modules register their handlers in core/registry.js.
import { $, esc } from './lib/dom.js';
import { api } from './lib/api.js';
import { ACTIONS, FORMS } from './core/registry.js';
import { ui, setState, clearState } from './core/store.js';
import { setStatus } from './core/sync.js';
import { render, applyTheme, measureTabs } from './core/render.js';
import { toggleItem } from './ui/items.js';
import { renderToolbar } from './features/toolbar.js';
import './ui/editing.js';
import './features/striver-tools.js';
import './views/dashboard.js';

document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('.cb[data-action="toggle"]')) toggleItem(t.closest('.item').dataset.id, t.checked);
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b || b.matches('input')) return;
  const fn = ACTIONS[b.dataset.action];
  if (!fn) return;
  if (b.closest('summary')) e.preventDefault();   // buttons in a sub-step header shouldn’t fold it
  fn(b, e);
});

document.addEventListener('submit', e => {
  const form = e.target;
  const fn = FORMS[form.dataset?.form];
  if (!fn) return;
  e.preventDefault();
  fn(form, new FormData(form));
});

// Esc closes the open inline form
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ui.editing && e.target.closest?.('#view form[data-form]')) {
    ui.editing = null;
    render();
  }
});

// Remember open Striver sub-steps and revision languages across re-renders (toggle doesn’t bubble, so capture)
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.tagName !== 'DETAILS' || !d.dataset.group) return;
  if (d.open) ui.open.add(d.dataset.group); else ui.open.delete(d.dataset.group);
}, true);

window.addEventListener('hashchange', () => {
  if (ui.query) { ui.query = ''; $('#q').value = ''; }   // picking a tab leaves search
  ui.editing = null;
  render();
  $('#view').focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
window.addEventListener('resize', measureTabs);

/* Login gate: the static files are public, the data is not. Without a valid session every
   API call returns 401, and the app shows one of these forms instead of the tabs.
   mode 'signup' = first run, no account yet (the first account closes sign-up for good). */
function showAuth(mode, message = '') {
  const signup = mode === 'signup';
  document.body.classList.add('logged-out');
  clearState();
  setStatus('');
  $('#toolbar').innerHTML = '';
  document.title = `${signup ? 'Sign up' : 'Log in'} · Prep Tracker`;
  $('#view').innerHTML = `<section class="card login-card" aria-labelledby="login-h">
    <h2 id="login-h">${signup ? 'Create your account' : 'Log in'}</h2>
    <p class="hint">${signup
      ? 'First time here: choose a username and password. Only one account can be created; after this, sign-up closes.'
      : 'Your plan is private. Log in to see it.'}</p>
    <form class="login-form" data-form="${signup ? 'signup' : 'login'}">
      <label class="field"><span>Username</span><input name="username" autocomplete="username" required minlength="${signup ? 3 : 1}" maxlength="50" data-autofocus></label>
      <label class="field"><span>Password${signup ? ' (min 8 characters)' : ''}</span><input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="${signup ? 8 : 1}"></label>
      ${signup ? '<label class="field"><span>Repeat password</span><input name="password2" type="password" autocomplete="new-password" required minlength="8"></label>' : ''}
      <p class="login-error" role="alert">${esc(message)}</p>
      <button class="btn btn-primary">${signup ? 'Sign up' : 'Log in'}</button>
    </form>
  </section>`;
  $('#view [data-autofocus]').focus();
}
const showLogin = message => showAuth('login', message);

async function submitAuth(form, call, wrongMessage) {
  const btn = form.querySelector('button');
  const error = form.querySelector('.login-error');
  btn.disabled = true;
  try {
    await call();
    boot();
  } catch (err) {
    btn.disabled = false;
    error.textContent = err.status === 401 ? wrongMessage : err.message;
    if (err.code === 'CONFLICT' || err.code === 'SETUP_REQUIRED') setTimeout(boot, 1500);   // wrong form for the server’s state
  }
}

FORMS.login = (form, fd) => submitAuth(form,
  () => api.login(String(fd.get('username')).trim(), String(fd.get('password'))),
  'Wrong username or password.');

FORMS.signup = (form, fd) => {
  if (fd.get('password') !== fd.get('password2')) {
    form.querySelector('.login-error').textContent = 'Passwords do not match.';
    form.elements.password2.select();
    return;
  }
  return submitAuth(form, () => api.signup(String(fd.get('username')).trim(), String(fd.get('password'))), '');
};

ACTIONS.logout = async () => {
  try { await api.logout(); } catch { /* the cookie is cleared server-side; show the form anyway */ }
  showLogin();
};

let loggedOutShown = false;
window.addEventListener('prepflow:logged-out', () => {
  if (loggedOutShown || document.body.classList.contains('logged-out')) return;
  loggedOutShown = true;
  showLogin('Your session ended. Please log in again.');
});

async function boot() {
  setStatus('Loading…');
  $('#view').innerHTML = '<p class="empty">Loading your plan…</p>';
  try {
    setState(await api.tracker());
  } catch (err) {
    if (err.status === 401) {
      const status = await api.authStatus().catch(() => ({ setUp: true }));
      showAuth(status.setUp ? 'login' : 'signup');
      return;
    }
    setStatus('Offline');
    $('#view').innerHTML = `<section class="card"><h3>Couldn’t reach the API</h3>
      <p class="hint">${esc(err.message)}. Is the backend running? See README → “Run locally”.</p>
      <div class="add-row"><button type="button" class="btn btn-primary" data-action="retry">Retry</button></div></section>`;
    return;
  }
  document.body.classList.remove('logged-out');
  loggedOutShown = false;
  applyTheme();
  renderToolbar();
  measureTabs();
  render();
  setStatus('Synced');
}
ACTIONS.retry = boot;

boot();
