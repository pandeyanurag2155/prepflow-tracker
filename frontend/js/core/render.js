import { $, $$ } from '../lib/dom.js';
import { state, ui, recount } from './store.js';
import { VIEWS } from './constants.js';
import { renderDashboard } from '../views/dashboard.js';
import { renderRoadmap } from '../views/roadmap.js';
import { renderDsa } from '../views/dsa.js';
import { renderStriver } from '../views/striver.js';
import { renderRevision } from '../views/revision.js';
import { renderSysdesign } from '../views/sysdesign.js';
import { renderTools } from '../views/tools.js';
import { renderCore } from '../views/core.js';
import { renderResume } from '../views/resume.js';
import { renderSearch } from '../views/search.js';

const RENDER = { dashboard: renderDashboard, roadmap: renderRoadmap, dsa: renderDsa, striver: renderStriver, revision: renderRevision, sysdesign: renderSysdesign, tools: renderTools, core: renderCore, resume: renderResume };

export const currentView = () => {
  const h = location.hash.slice(1);
  return VIEWS.includes(h) ? h : 'dashboard';
};

/** Re-render the current view (or search results). Ticks don’t come through here; see ui/items.js. */
export function render() {
  // Late renders (debounced search, slow responses) must not paint over the login form
  if (!state || document.body.classList.contains('logged-out')) return;
  const view = currentView();
  recount();
  $$('.tabs a').forEach(a => (a.getAttribute('href') === '#' + view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('#view').innerHTML = ui.query ? renderSearch() : RENDER[view]();
  document.title = `${ui.query ? 'Search' : $(`.tabs a[href="#${view}"]`).textContent} · Prep Tracker`;

  if (ui.scrollTo) {
    const el = document.getElementById(ui.scrollTo);
    ui.scrollTo = null;
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }
  const target = $('#view [data-autofocus]') || (ui.focus && $(ui.focus));
  ui.focus = null;
  if (target) target.focus({ preventScroll: !target.matches('[data-autofocus]') });
}

export function applyTheme() {
  const theme = state.settings.theme;
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('prepflow-theme', theme); } catch { /* per-device convenience only */ }
}

/** The Striver filter bar sticks just below the tab bar. */
export function measureTabs() {
  document.documentElement.style.setProperty('--tabs-h', $('.tabs').offsetHeight + 'px');
}
