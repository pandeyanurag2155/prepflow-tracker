/** Calendar date 'YYYY-MM-DD' of `date` in the given IANA timezone. */
export function ymdInZone(date, timeZone) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** 'YYYY-MM-DD' + n calendar days, computed in UTC so DST never shifts the result. */
export function addDaysYmd(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const isYmd = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
