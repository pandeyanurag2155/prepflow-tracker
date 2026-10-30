/**
 * Refresh src/domain/dsa-links.json: a LeetCode link for every NeetCode problem in the DSA plan.
 *
 *   npm run dsa:fetch
 *
 * Titles are matched against LeetCode’s public problem list. NeetCode shortens a few titles, so
 * ALIASES maps those to LeetCode slugs. A problem that isn’t on LeetCode can be given a GFG URL in
 * FALLBACK; the script fails if any problem ends up without a link.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DSA_SEED } from '../src/domain/seed-data.js';
import { problemKey } from '../src/domain/problem-key.js';

const LEETCODE_LIST = 'https://leetcode.com/api/problems/all/';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/domain/dsa-links.json');

const ALIASES = {
  'Two Sum II': 'two-sum-ii-input-array-is-sorted',
  'Lowest Common Ancestor of a BST': 'lowest-common-ancestor-of-a-binary-search-tree',
  'Implement Trie': 'implement-trie-prefix-tree',
  'Number of Connected Components': 'number-of-connected-components-in-an-undirected-graph',
};
const FALLBACK = {};   // 'Title': 'https://www.geeksforgeeks.org/problems/…'

async function main() {
  const res = await fetch(LEETCODE_LIST, { headers: { 'User-Agent': 'Mozilla/5.0 (PrepFlow link import)' } });
  if (!res.ok) throw new Error(`GET ${LEETCODE_LIST} → ${res.status}`);
  const list = (await res.json()).stat_status_pairs.map(p => ({
    title: p.stat.question__title, slug: p.stat.question__title_slug, premium: p.paid_only,
  }));
  const bySlug = new Map(list.map(p => [p.slug, p]));
  const byKey = new Map(list.map(p => [problemKey(p.title), p]));

  const titles = DSA_SEED.flatMap(([, , , problems]) => String(problems || '').split(', ').filter(Boolean))
    .map(p => p.replace(/\s+[EMH]$/, ''));

  const links = {};
  const missing = [];
  for (const title of titles) {
    const hit = ALIASES[title] ? bySlug.get(ALIASES[title]) : byKey.get(problemKey(title));
    if (hit) links[title] = { link: `https://leetcode.com/problems/${hit.slug}/`, source: 'leetcode', premium: hit.premium };
    else if (FALLBACK[title]) links[title] = { link: FALLBACK[title], source: 'gfg', premium: false };
    else missing.push(title);
  }
  if (missing.length) throw new Error(`No link for: ${missing.join(', ')}. Add an alias or a GFG fallback.`);

  await fs.writeFile(OUT, JSON.stringify(links, null, 2) + '\n');
  const premium = Object.entries(links).filter(([, v]) => v.premium).map(([t]) => t);
  console.log(`Wrote ${titles.length} links → ${path.relative(process.cwd(), OUT)}${premium.length ? ` (Premium: ${premium.join(', ')})` : ''}`);
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });
