// Local calendar days. 'YYYY-MM-DD' strings are parsed as local midnight, never as UTC.
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');

export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseYmd(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export const isYmd = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseYmd(s).getTime());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
/** Same day-of-month n months later, clamped to the month’s last day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
  return x;
}
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const daysBetween = (a, b) => Math.round((b - a) / DAY);

const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
export const fmtDate = d => DATE_FMT.format(d);
export const fmtRange = (a, b) => `${fmtDate(a)} – ${fmtDate(b)}`;
export const DAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
