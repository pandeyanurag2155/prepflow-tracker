/**
 * Refresh src/domain/striver-sheet.json from takeUforward’s Striver A2Z page, with real LeetCode
 * difficulty and Premium flags from LeetCode’s public problem list.
 *
 *   npm run striver:fetch
 *
 * The page ships the sheet as React Server Components data (self.__next_f.push chunks) containing
 * { fields, rows, roots }: `fields` lists column names per row shape, `rows` are positional records,
 * and categories hold child indexes. This is not a public API, so if takeUforward changes the page,
 * this script fails loudly instead of writing a broken file.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet?page=sheet&open=none';
const SITE = 'https://takeuforward.org';
const LEETCODE_LIST = 'https://leetcode.com/api/problems/all/';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/domain/striver-sheet.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (PrepFlow sheet import)' };

// takeUforward’s own levels, used for problems that aren’t on LeetCode
const LEVEL = { basic: 'Easy', core: 'Medium', pro: 'Hard' };
const LC_LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const lcSlug = url => (String(url).match(/leetcode\.com\/problems\/([^/?#]+)/) || [])[1];

/** slug → { difficulty, premium } from LeetCode’s public problem list. */
async function leetcodeIndex() {
  const res = await fetch(LEETCODE_LIST, { headers: UA });
  if (!res.ok) throw new Error(`GET ${LEETCODE_LIST} → ${res.status}`);
  const { stat_status_pairs: list } = await res.json();
  return new Map(list.map(p => [p.stat.question__title_slug, { difficulty: LC_LEVEL[p.difficulty.level], premium: p.paid_only }]));
}

/** Concatenate the RSC string chunks embedded in the HTML. */
function rscPayload(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(m => JSON.parse(m[1]));
  if (!chunks.length) throw new Error('No RSC payload found on the page');
  return chunks.join('');
}

/** Return the JSON object literal that encloses position `at` (string-aware brace matching). */
function enclosingObject(text, at) {
  for (let start = text.lastIndexOf('{', at); start >= 0; start = text.lastIndexOf('{', start - 1)) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inString) {
        if (c === '\\') i++;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') {
        depth--;
        if (depth === 0) {
          if (i > at) {
            try { return JSON.parse(text.slice(start, i + 1)); } catch { /* not a clean object, keep walking back */ }
          }
          break;
        }
      }
    }
  }
  throw new Error('Could not locate the sheet data object');
}

/** Difficulty comes from LeetCode when the problem is there, from takeUforward’s level otherwise. */
function toItem(r, lc) {
  const to = r.redirectTo || {};
  const learning = (to.layoutType || r.layoutType) === 'learning';
  const slug = to.itemSlug || r.slug;
  const onLc = r.leetcode_link ? lc.get(lcSlug(r.leetcode_link)) : null;
  return {
    title: String(r.label).trim(),
    kind: learning ? 'concept' : 'problem',
    difficulty: onLc?.difficulty || LEVEL[r.difficulty] || '',
    difficultySource: onLc ? 'leetcode' : 'takeuforward',
    premium: Boolean(onLc?.premium),
    leetcode: r.leetcode_link || '',
    tuf: `${SITE}/${learning ? 'learning' : 'practice'}/${to.contentType || 'dsa'}/${slug}`,
    article: r.free_blog_link ? new URL(r.free_blog_link, SITE).href : '',
    video: r.yt_video || '',
  };
}

async function main() {
  const lc = await leetcodeIndex();
  const res = await fetch(SOURCE, { headers: UA });
  if (!res.ok) throw new Error(`GET ${SOURCE} → ${res.status}`);
  const text = rscPayload(await res.text());
  const data = enclosingObject(text, text.indexOf('"rows":['));
  if (!Array.isArray(data.fields) || !Array.isArray(data.rows) || !Array.isArray(data.roots)) throw new Error('Unexpected sheet shape');

  const recs = data.rows.map(([shape, ...values]) => Object.fromEntries(data.fields[shape].map((f, i) => [f, values[i]])));
  const kids = r => (r.children || []).map(i => recs[i]);

  const chapters = data.roots.map(i => recs[i]).map(ch => ({
    slug: ch.slug,
    title: String(ch.label).trim(),
    subs: kids(ch)
      .filter(sub => sub.type === 'category')
      .map(sub => ({ slug: sub.slug, title: String(sub.label).trim(), items: kids(sub).filter(x => x.type === 'item').map(r => toItem(r, lc)) }))
      .filter(sub => sub.items.length),
  }));

  const count = chapters.reduce((n, c) => n + c.subs.reduce((m, s) => m + s.items.length, 0), 0);
  if (chapters.length < 15 || count < 300) throw new Error(`Only ${chapters.length} chapters / ${count} items parsed; refusing to overwrite`);

  const items = chapters.flatMap(c => c.subs.flatMap(s => s.items));
  const unknown = items.filter(i => i.leetcode && i.difficultySource !== 'leetcode').map(i => i.leetcode);
  if (unknown.length) console.warn(`Not in LeetCode’s list (kept takeUforward level):\n  ${unknown.join('\n  ')}`);

  await fs.writeFile(OUT, JSON.stringify({ source: SOURCE, fetchedAt: new Date().toISOString(), chapters }, null, 2) + '\n');
  console.log(`Wrote ${chapters.length} chapters, ${count} items (${items.filter(i => i.difficultySource === 'leetcode').length} with LeetCode difficulty, ${items.filter(i => i.premium).length} Premium) → ${path.relative(process.cwd(), OUT)}`);
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });
