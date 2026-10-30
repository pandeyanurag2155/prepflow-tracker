import { test } from 'node:test';
import assert from 'node:assert/strict';
import { problemKey } from '../src/domain/problem-key.js';
import { parseBulkLines, normaliseLink } from '../src/domain/bulk-parse.js';
import { migrate, normaliseRecords } from '../src/domain/normalise.js';
import { buildSeed } from '../src/domain/build-seed.js';
import { addDaysYmd, ymdInZone } from '../src/utils/dates.js';

test('problemKey matches the same problem across sheets', () => {
  assert.equal(problemKey('Two Sum'), problemKey('two-sum'));
  assert.equal(problemKey('Subsets I'), problemKey('Subsets'));
  assert.equal(problemKey('Best Time to Buy & Sell Stock'), 'best time to buy and sell stock');
  assert.equal(problemKey('The Kth Largest Element in an Array'), 'kth largest element in array');
});

test('problemKey keeps numbered variants apart', () => {
  assert.notEqual(problemKey('Two Sum'), problemKey('Two Sum II'));
  assert.equal(problemKey('House Robber - II'), problemKey('House Robber II'));
});

test('parseBulkLines reads optional difficulty and URL in any order and flags repeats', () => {
  const rows = parseBulkLines('Two Sum | E | leetcode.com/problems/two-sum\n\n  \nRotate | https://x.dev/r | hard\ntwo-sum\nKnown | M', new Set(['known']));
  assert.deepEqual(rows.map(r => [r.title, r.difficulty, r.link, r.skip]), [
    ['Two Sum', 'Easy', 'https://leetcode.com/problems/two-sum', null],
    ['Rotate', 'Hard', 'https://x.dev/r', null],
    ['two-sum', '', '', 'Repeated in paste'],
    ['Known', 'Medium', '', 'Already in sub-step'],
  ]);
});

test('normaliseLink rejects non-http schemes', () => {
  assert.equal(normaliseLink('javascript:alert(1)'), '');
  assert.equal(normaliseLink(''), '');
  assert.equal(normaliseLink('example.com/a'), 'https://example.com/a');
});

test('buildSeed produces the full starting plan with stable ids', () => {
  const { groups, items } = buildSeed();
  assert.equal(groups.length, 182);
  assert.equal(items.length, 1430);
  assert.equal(items.filter(i => i.sectionId === 'dsa' && i.kind === 'problem').length, 96);
  assert.ok(items.filter(i => i.sectionId === 'dsa' && i.kind === 'problem').every(i => i.link.startsWith('https://leetcode.com/problems/')), 'every NeetCode problem links to LeetCode');
  const striver = items.filter(i => i.sectionId === 'striver');
  assert.equal(striver.length, 495, 'every problem of takeUforward’s sheet, none invented');
  assert.ok(striver.every(i => /^https:\/\/(leetcode\.com|takeuforward\.org)\//.test(i.link)), 'every Striver item has a practice link');
  assert.deepEqual([...new Set(groups.filter(g => g.step).map(g => g.step))].length, 20);
  const tools = items.filter(i => i.sectionId === 'tools');
  assert.deepEqual(groups.filter(g => g.sectionId === 'tools').map(g => g.title), ['Redis', 'Kafka', 'RabbitMQ', 'gRPC']);
  assert.ok(tools.every(i => i.level && /^https:\/\//.test(i.link)), 'every tools topic has a level and a link');
  const subjects = groups.filter(g => g.sectionId === 'core' && !g.parentId);
  assert.deepEqual(subjects.map(g => g.title), ['OOPs', 'DBMS', 'Operating System', 'Computer Networks']);
  const core = items.filter(i => i.sectionId === 'core');
  assert.equal(core.length, 289);
  assert.ok(core.every(i => !i.level && /^https:\/\//.test(i.link) && groups.find(g => g.id === i.groupId).parentId), 'core topics sit in chapters, with links, no levels');
  assert.ok(groups.filter(g => g.sectionId === 'striver').every(g => g.month === null), 'Striver is self-paced');
  assert.deepEqual([...new Set(groups.filter(g => g.sectionId === 'roadmap').map(g => g.month))], [0, 1, 2, 3]);
  assert.ok(groups.every(g => /^[0-9a-f-]{36}$/.test(g.id)));
  assert.equal(items.find(i => i.title === 'Draft 8 STAR story skeletons').track, 'Behavioral');
});

test('migrate keeps progress, drops orphans and fixes bad values', () => {
  const doc = {
    schemaVersion: 1,
    groups: [{ id: 'g1', sectionId: 'roadmap', title: 'W1', week: 1 }, { id: 'bad', sectionId: 'nope' }],
    items: [
      { id: 'i1', groupId: 'g1', title: 'Done task', done: true, doneAt: '2026-10-01T10:00:00Z', track: 'Weird' },
      { id: 'i2', groupId: 'bad', title: 'Orphan' },
      { id: 'i3', groupId: 'g1', title: '   ' },
    ],
    settings: { theme: 'pink', roadmapStart: '2026-11-02', striverWeeks: 99 },
  };
  const out = migrate(doc);
  assert.equal(out.schemaVersion, 2);
  assert.equal(out.groups[0].month, 1, 'v1 week 1 becomes month 1');
  assert.equal(out.settings.planStart, '2026-11-02', 'v1 roadmapStart becomes planStart');
  assert.equal(out.groups.length, 1);
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].groupId, out.groups[0].id, 'non-UUID ids are remapped consistently');
  assert.equal(out.items[0].done, true);
  assert.equal(out.items[0].doneAt, '2026-10-01T10:00:00.000Z');
  assert.equal(out.items[0].track, '');
  assert.equal(out.settings.theme, 'system');
  assert.equal(out.settings.planMonths, 3);
  assert.equal('striverWeeks' in out.settings, false);
  assert.throws(() => migrate({ schemaVersion: 99, groups: [], items: [] }), /newer version/);
  assert.throws(() => migrate([]), /Not a tracker export/);
});

test('normaliseRecords only nests Striver sub-steps one level deep', () => {
  const { groups } = normaliseRecords([
    { id: '11111111-1111-4111-8111-111111111111', sectionId: 'striver', title: 'Step' },
    { id: '22222222-2222-4222-8222-222222222222', sectionId: 'striver', title: 'Sub', parentId: '11111111-1111-4111-8111-111111111111' },
    { id: '33333333-3333-4333-8333-333333333333', sectionId: 'roadmap', title: 'W', parentId: '11111111-1111-4111-8111-111111111111' },
  ]);
  assert.deepEqual(groups.map(g => g.parentId), [null, null, '11111111-1111-4111-8111-111111111111']);
});

test('dates are calendar days in the app timezone', () => {
  assert.equal(addDaysYmd('2026-10-30', 3), '2026-11-02');
  assert.equal(ymdInZone(new Date('2026-10-22T20:00:00Z'), 'Asia/Kolkata'), '2026-10-23');
});

test('password hashing and session tokens', async () => {
  const { hashPassword, verifyPassword, createSessionToken, readSessionToken, passwordVersion } = await import('../src/utils/auth.js');
  const hash = await hashPassword('s3cret-pass');
  assert.match(hash, /^scrypt:/);
  assert.doesNotMatch(hash, /\$/, 'no $ so env files never interpolate it');
  assert.equal(await verifyPassword('s3cret-pass', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);

  const secret = 'x'.repeat(40);
  const v = passwordVersion(hash);
  const token = createSessionToken({ username: 'me', version: v, ttlMs: 60_000, secret });
  assert.equal(readSessionToken(token, { secret, version: v }).u, 'me');
  assert.equal(readSessionToken(token, { secret: 'y'.repeat(40), version: v }), null, 'other secret');
  assert.equal(readSessionToken(token, { secret, version: 'changed' }), null, 'password changed');
  const expired = createSessionToken({ username: 'me', version: v, ttlMs: -1, secret });
  assert.equal(readSessionToken(expired, { secret, version: v }), null, 'expired');
  assert.equal(readSessionToken('garbage', { secret, version: v }), null);
});
