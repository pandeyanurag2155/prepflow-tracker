import { problemKey } from './problem-key.js';

const DIFF_WORD = { E: 'Easy', M: 'Medium', H: 'Hard', EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

/** Accept “leetcode.com/x” as well as full URLs; anything that isn’t http(s) becomes ''. */
export function normaliseLink(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * Bulk add format: one problem per line → “Title | E/M/H | URL”.
 * Difficulty and URL are optional and may come in either order. Blank lines are ignored.
 * Rows whose key repeats within the paste, or already exists in `existingKeys`, get a `skip` reason.
 */
export function parseBulkLines(text, existingKeys = new Set()) {
  const seen = new Set();
  return String(text || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [title = '', ...rest] = line.split('|').map(s => s.trim());
      let difficulty = '';
      let link = '';
      for (const part of rest) {
        const d = DIFF_WORD[part.toUpperCase()];
        if (!difficulty && d) difficulty = d;
        else if (!link && part) link = normaliseLink(part);
      }
      const key = problemKey(title) || title.toLowerCase();
      const skip = !title ? 'No title'
        : seen.has(key) ? 'Repeated in paste'
        : existingKeys.has(key) ? 'Already in sub-step'
        : null;
      seen.add(key);
      return { title, difficulty, link, key, skip };
    });
}
