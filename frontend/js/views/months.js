// Roadmap and NeetCode: theme cards grouped under “Before you start”, Month 1…planMonths, and “Later”.
import { push } from '../lib/dom.js';
import { addDays, fmtDate, parseYmd } from '../lib/dates.js';
import { state, childGroups } from '../core/store.js';
import { planNow, planMonths, monthRange } from '../core/plan.js';
import { counter, bar, monthLabel } from '../ui/widgets.js';
import { groupAdd } from '../ui/editing.js';

/** scope: tally prefix for the month counters (m = all items, mp = problems only). */
export function monthSections(sectionId, themeCard, scope = 'm') {
  const N = planMonths();
  const now = planNow();
  const nowMonth = now.state === 'before' ? 0 : now.state === 'during' ? now.month : null;
  const byMonth = new Map();
  childGroups(sectionId).filter(g => !g.role).forEach(g => push(byMonth, g.month >= 0 && g.month <= N ? g.month : 'later', g));

  const months = [...(byMonth.has(0) ? [0] : []), ...Array.from({ length: N }, (_, i) => i + 1), ...(byMonth.has('later') ? ['later'] : [])];
  return months.map(m => {
    const themes = byMonth.get(m) || [];
    const isNow = m === nowMonth;
    const dates = m === 0 ? `Until ${fmtDate(addDays(parseYmd(state.settings.planStart), -1))}`
      : m === 'later' ? `Outside months 1–${N}` : monthRange(m);
    const key = `${scope}:${sectionId}:${m}`;
    return `<section class="month-block${isNow ? ' is-now' : ''}" id="${sectionId}-m${m}" aria-labelledby="${sectionId}-mh${m}">
      <div class="month-head"><h3 id="${sectionId}-mh${m}">${m === 'later' ? 'Later' : monthLabel(m)}</h3>
        ${isNow ? `<span class="tag tag-now">${m === 0 ? 'Now' : 'This month'}</span>` : ''}<span class="range">${dates}</span>
        <span class="spacer"></span>${counter(key)}</div>
      ${bar(key)}
      <div class="stack">${themes.map(themeCard).join('') || '<p class="empty">No themes yet.</p>'}</div>
      ${m === 'later' ? '' : groupAdd(sectionId, null, m)}
    </section>`;
  }).join('');
}
