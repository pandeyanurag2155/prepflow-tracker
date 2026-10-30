// Where today falls in the month-based plan (settings.planStart + settings.planMonths).
import { state } from './store.js';
import { LEVELS } from './constants.js';
import { addDays, addMonths, daysBetween, fmtRange, parseYmd, today } from '../lib/dates.js';

const start = () => parseYmd(state.settings.planStart);
export const planMonths = () => state.settings.planMonths;
export const planEnd = () => addMonths(start(), planMonths());   // first day after the plan

/** { state: 'before' | 'during' | 'after', month, daysUntil? } */
export function planNow() {
  const t = today();
  if (t < start()) return { state: 'before', month: 0, daysUntil: daysBetween(t, start()) };
  for (let m = 1; m <= planMonths(); m++) {
    if (t < addMonths(start(), m)) return { state: 'during', month: m };
  }
  return { state: 'after', month: planMonths() + 1 };
}

export function monthRange(month) {
  return fmtRange(addMonths(start(), month - 1), addDays(addMonths(start(), month), -1));
}

/** Revision levels spread evenly over the plan: Basic → Intermediate → Advanced. */
export function levelForMonth(month) {
  return LEVELS[Math.min(LEVELS.length - 1, Math.floor(((month - 1) * LEVELS.length) / planMonths()))];
}
export function monthsForLevel(level) {
  const months = Array.from({ length: planMonths() }, (_, i) => i + 1).filter(m => levelForMonth(m) === level);
  if (!months.length) return '';
  return months.length === 1 ? `Month ${months[0]}` : `Months ${months[0]}–${months.at(-1)}`;
}
export function revisionLevelNow() {
  const now = planNow();
  if (now.state === 'before') return LEVELS[0];
  if (now.state === 'after') return null;
  return levelForMonth(now.month);
}

