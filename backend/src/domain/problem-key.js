/* key = how the same problem is recognised across NeetCode and Striver.
     1. lowercase; “&” → “and”
     2. punctuation → spaces (so “Two Sum - II” = “Two Sum II”)
     3. drop filler words: the, a, an
     4. roman numerals: a lone “i” is dropped (“Subsets I” = “Subsets”), while ii–ix become
        digits. Dropping them all would merge different problems that share a sheet,
        e.g. “Two Sum” / “Two Sum II” and “House Robber” / “House Robber II”.
   Keys are stored per item. After tuning FILLER_WORDS / ROMAN, export and re-import your data:
   import recomputes every key. */
const FILLER_WORDS = new Set(['the', 'a', 'an']);
const ROMAN = { i: '', ii: '2', iii: '3', iv: '4', vi: '6', vii: '7', viii: '8', ix: '9' };

export function problemKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w && !FILLER_WORDS.has(w))
    .map(w => (w in ROMAN ? ROMAN[w] : w))
    .filter(Boolean)
    .join(' ');
}

/** Stored key for an item: only problems are matched across sheets. */
export const keyFor = (kind, title) => (kind === 'problem' ? problemKey(title) : '');
