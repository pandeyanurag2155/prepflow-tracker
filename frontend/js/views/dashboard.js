import { esc, pct, safeUrl } from '../lib/dom.js';
import { addDays, fmtDate, parseYmd, today, ymd, DAY_FMT } from '../lib/dates.js';
import { api } from '../lib/api.js';
import { LEVELS, SECTION_LABEL } from '../core/constants.js';
import { ACTIONS } from '../core/registry.js';
import { state, ui, itemById, childGroups, cnt, upsertItems } from '../core/store.js';
import { persist } from '../core/sync.js';
import { render, currentView } from '../core/render.js';
import { planNow, planMonths, planEnd, monthRange, revisionLevelNow } from '../core/plan.js';
import { counter, bar, viewHead, groupLabel } from '../ui/widgets.js';

const DUE_LIMIT = 15;

function planCard(now) {
  const N = planMonths();
  let stat;
  let hint;
  if (now.state === 'before') {
    stat = `Starts in ${now.daysUntil} day${now.daysUntil === 1 ? '' : 's'}`;
    hint = `Month 1 begins ${fmtDate(parseYmd(state.settings.planStart))}.`;
  } else if (now.state === 'after') {
    stat = 'Plan complete';
    hint = `All ${N} months are behind you.`;
  } else {
    const themes = childGroups('roadmap').filter(g => g.month === now.month).map(g => g.title).join(', ');
    stat = `Month ${now.month} <small>of ${N}</small>`;
    hint = monthRange(now.month) + (themes ? ` · ${themes}` : '');
  }
  return `<div class="card span-6"><p class="kicker">${N}-month plan</p><div class="stat">${stat}</div><p class="hint">${esc(hint)}</p></div>`;
}

// Striver is at your own pace: progress and the next step, no deadline
function striverCard() {
  const c = cnt('p:striver');
  const next = childGroups('striver').find(g => { const x = cnt('g:' + g.id); return x.done < x.total; });
  const hint = !c.total ? 'No problems yet.' : next ? `Up next: ${groupLabel(next)}` : 'Every step is done.';
  return `<a class="card span-6" href="#striver" style="text-decoration:none;color:inherit"><p class="kicker">Striver A2Z · your own pace</p>
    <div class="stat">${c.done} <small>/ ${c.total} problems</small></div>${bar('p:striver')}<p class="hint">${esc(hint)}</p></a>`;
}

function kpiCards() {
  return [['Roadmap tasks', 's:roadmap', 'roadmap'], ['NeetCode problems', 'p:dsa', 'dsa'], ['Striver problems', 'p:striver', 'striver'], ['Revision topics', 's:revision', 'revision']]
    .map(([label, scope, view]) => {
      const c = cnt(scope);
      return `<a class="card span-3" href="#${view}" style="text-decoration:none;color:inherit">
        <p class="kicker">${label}</p><div class="stat">${c.done}<small> / ${c.total}</small></div>${bar(scope)}<p class="hint">${pct(c)}% done</p></a>`;
    }).join('');
}

// One bar per month of the roadmap (themes before the start count as month 0)
function monthStrip(now) {
  const nowM = now.state === 'during' ? now.month : now.state === 'before' ? 0 : null;
  const months = [...(cnt('m:roadmap:0').total ? [0] : []), ...Array.from({ length: planMonths() }, (_, i) => i + 1)];
  return months.map(m => {
    const c = cnt(`m:roadmap:${m}`);
    const label = m === 0 ? 'Before' : `Month ${m}`;
    return `<button type="button" class="vbar${m === nowM ? ' is-now' : ''}" data-action="jump" data-view="roadmap" data-target="roadmap-m${m}"
      aria-label="${label}: ${c.done} of ${c.total} done${m === nowM ? ', current' : ''}" title="${label}: ${c.done}/${c.total}">
      <span class="track"><span class="fill" style="height:${pct(c)}%"></span></span><span>${label}</span></button>`;
  }).join('');
}

// One bar per sheet step; the first unfinished step is highlighted as “up next”
function striverSteps() {
  const steps = childGroups('striver').filter(s => s.step);
  const numbers = [...new Set(steps.map(s => s.step))].sort((a, b) => a - b);
  const next = numbers.find(n => { const c = cnt('step:' + n); return c.done < c.total; });
  const bars = numbers.map(n => {
    const c = cnt('step:' + n);
    return `<button type="button" class="sbar${n === next ? ' is-now' : ''}" data-action="jump" data-view="striver" data-target="striver-step-${n}"
      aria-label="Step ${n}: ${c.done} of ${c.total} done${n === next ? ', up next' : ''}" title="Step ${n}: ${c.done}/${c.total}">
      <span class="track"><span class="fill" style="height:${pct(c)}%"></span></span><span>${n}</span></button>`;
  }).join('');
  return { bars, count: numbers.length };
}

function revisionRows() {
  const rows = [...childGroups('revision'), ...childGroups('sysdesign'), ...childGroups('tools')].map(g => `<div class="seg-row"><span>${esc(g.title)}</span>
    <span class="segs">${LEVELS.map(l => { const c = cnt(`gl:${g.id}:${l}`); return `<span title="${l}: ${c.done}/${c.total}">${bar(`gl:${g.id}:${l}`)}</span>`; }).join('')}</span>
    ${counter('g:' + g.id)}</div>`).join('');
  return `${rows}<div class="seg-row legend" aria-hidden="true"><span></span><span class="segs">${LEVELS.map(l => `<span>${l}</span>`).join('')}</span><span></span></div>`;
}

function dueList() {
  const todayStr = ymd(today());
  const due = state.items
    .filter(i => i.done && i.revisitDates.some(d => d <= todayStr))
    .map(i => ({ i, d: i.revisitDates.filter(d => d <= todayStr).sort()[0] }))
    .sort((a, b) => a.d.localeCompare(b.d));
  if (!due.length) return { count: 0, html: '<p class="empty">Nothing due. Ticked problems come back here after 3 and 7 days.</p>' };
  const rows = due.slice(0, DUE_LIMIT).map(({ i, d }) => {
    const url = safeUrl(i.link);
    const title = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a>` : esc(i.title);
    return `<li><span>${title}
        <span class="badges"><span class="badge badge-section">${SECTION_LABEL[i.sectionId]}</span>${d < todayStr ? `<span class="badge badge-due">since ${fmtDate(parseYmd(d))}</span>` : ''}</span></span>
      <button type="button" class="btn btn-sm" data-action="revisited" data-id="${i.id}">Revisited</button></li>`;
  }).join('');
  return { count: due.length, html: `<ul class="due-list">${rows}</ul>${due.length > DUE_LIMIT ? `<p class="hint">+${due.length - DUE_LIMIT} more</p>` : ''}` };
}

function activity() {
  const perDay = new Map();
  state.items.forEach(i => {
    if (i.done && i.doneAt) { const k = ymd(new Date(i.doneAt)); perDay.set(k, (perDay.get(k) || 0) + 1); }
  });
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
  const counts = days.map(d => perDay.get(ymd(d)) || 0);
  const max = Math.max(1, ...counts);
  const cols = days.map((d, k) => {
    const n = counts[k];
    return `<div class="act" role="listitem" aria-label="${DAY_FMT.format(d)}: ${n} completed" title="${DAY_FMT.format(d)}: ${n}">
      ${n ? `<span>${n}</span>` : ''}<i class="${n ? '' : 'zero'}" style="height:${n ? Math.max(8, (n / max) * 100) : 4}%"></i><span>${d.getDate()}</span></div>`;
  }).join('');
  return { cols, total: counts.reduce((a, b) => a + b, 0) };
}

export function renderDashboard() {
  const now = planNow();
  const steps = striverSteps();
  const due = dueList();
  const act = activity();
  const level = revisionLevelNow();
  const months = (cnt('m:roadmap:0').total ? 1 : 0) + planMonths();

  return `${viewHead('Dashboard', `Where you are in the plan (until ${fmtDate(addDays(planEnd(), -1))}), what’s due and how fast you’re moving.`)}
  <div class="dash">
    ${planCard(now)}
    ${striverCard()}
    ${kpiCards()}
    <section class="card span-5" aria-labelledby="d-strip"><div class="card-head"><h3 id="d-strip">Roadmap by month</h3><span class="spacer"></span>
      <span class="range">Click to open</span></div><div class="strip" style="--cols:${months}">${monthStrip(now)}</div></section>
    <section class="card span-7" aria-labelledby="d-steps"><div class="card-head"><h3 id="d-steps">Striver steps</h3><span class="spacer"></span>${counter('p:striver')}</div>
      <div class="steps-grid" style="--cols:${Math.max(1, Math.ceil(steps.count / 2))}">${steps.bars}</div>
      <p class="hint">Highlighted: the first step that isn’t finished. Click a step to open it.</p></section>
    <section class="card span-6" aria-labelledby="d-rev"><div class="card-head"><h3 id="d-rev">Revision, system design and tools</h3>
      ${level ? `<span class="tag tag-now">Revision: ${level} now</span>` : ''}</div>${revisionRows()}</section>
    <section class="card span-6" aria-labelledby="d-due"><div class="card-head"><h3 id="d-due">Due for revisit today</h3><span class="spacer"></span>
      <span class="count">${due.count}</span></div>${due.html}</section>
    <section class="card span-6" aria-labelledby="d-core"><div class="card-head"><h3 id="d-core">Core subjects</h3><span class="spacer"></span>${counter('s:core')}</div>
      ${childGroups('core').map(g => `<div class="seg-row wide"><span>${esc(g.title)}</span>${bar('g:' + g.id)}${counter('g:' + g.id)}</div>`).join('')}</section>
    <section class="card span-6" aria-labelledby="d-act"><div class="card-head"><h3 id="d-act">Last 14 days</h3><span class="spacer"></span>
      <span class="count">${act.total} completed</span></div><div class="activity" role="list">${act.cols}</div></section>
  </div>`;
}

Object.assign(ACTIONS, {
  jump(b) {
    ui.scrollTo = b.dataset.target || null;
    if (currentView() === b.dataset.view) render(); else location.hash = b.dataset.view;
  },
  async revisited(b) {
    const it = itemById.get(b.dataset.id);
    if (!it) return;
    const todayStr = ymd(today());
    const first = it.revisitDates.filter(d => d <= todayStr).sort()[0];
    const updated = await persist(api.updateItem(it.id, { revisitDates: it.revisitDates.filter(d => d !== first) }));
    if (!updated) return;
    upsertItems([updated]);
    render();
  },
});
