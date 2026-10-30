/**
 * Integration tests against a real, disposable Postgres database.
 * TEST_DATABASE_URL=postgres://prepflow:prepflow@localhost:5433/prepflow_test npm test
 * The database is wiped and re-seeded; never point this at your real data.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : 'set TEST_DATABASE_URL to run API tests';

let request;      // logged-in agent
let anon;         // no session
let app;
let supertestFn;
let resetLoginAttempts;
let pool;

const LOGIN = { username: 'tester', password: 'correct horse battery' };

before(async () => {
  if (skip) return;
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  process.env.SERVE_FRONTEND = 'false';
  const [{ default: supertest }, { createApp }, db, { runMigrations }, { trackerService }, authMw, { accountService }] = await Promise.all([
    import('supertest'), import('../src/app.js'), import('../src/db/pool.js'),
    import('../src/db/migrate.js'), import('../src/services/tracker.service.js'), import('../src/middlewares/auth.js'),
    import('../src/services/account.service.js'),
  ]);
  resetLoginAttempts = authMw.resetLoginAttempts;
  supertestFn = supertest;
  pool = db.pool;
  await runMigrations();
  await db.pool.query('DELETE FROM account');   // fresh install: sign-up open
  accountService.reset();
  await trackerService.resetToSeed();
  await pool.query(`UPDATE settings SET link_duplicates = true, theme = 'system', plan_months = 3`);
  app = createApp();
  anon = supertest(app);

  // First run: data is locked, status says sign-up is needed, login is refused
  await anon.get('/api/v1/tracker').expect(401);
  assert.equal((await anon.get('/api/v1/auth/status').expect(200)).body.data.setUp, false);
  await anon.post('/api/v1/auth/login').send(LOGIN).expect(409);

  request = supertest.agent(app);
  await request.post('/api/v1/auth/signup').send(LOGIN).expect(201);   // signs up and logs in
});

after(async () => { if (pool) await pool.end(); });

const json = res => res.body.data;
const snapshot = async () => json(await request.get('/api/v1/tracker').expect(200));

test('auth: sign-up only works once, then status says set up', { skip }, async () => {
  assert.equal((await anon.get('/api/v1/auth/status').expect(200)).body.data.setUp, true);
  const again = await anon.post('/api/v1/auth/signup').send({ username: 'intruder', password: 'whatever123' }).expect(409);
  assert.equal(again.body.error.code, 'CONFLICT');
  const weak = await anon.post('/api/v1/auth/signup').send({ username: 'x', password: 'short' }).expect(400);
  assert.equal(weak.body.error.code, 'VALIDATION_ERROR');
  resetLoginAttempts();
});

test('auth: change password logs out other devices', { skip }, async () => {
  const other = supertestFn.agent(app);
  await other.post('/api/v1/auth/login').send(LOGIN).expect(200);
  await request.post('/api/v1/auth/password').send({ currentPassword: 'wrong-one', newPassword: 'brand-new-pass' }).expect(400);
  await request.post('/api/v1/auth/password').send({ currentPassword: LOGIN.password, newPassword: 'brand-new-pass' }).expect(200);
  await request.get('/api/v1/tracker').expect(200);   // this device got a fresh cookie
  await other.get('/api/v1/tracker').expect(401);     // the other one is logged out
  await anon.post('/api/v1/auth/login').send(LOGIN).expect(401);
  await anon.post('/api/v1/auth/login').send({ ...LOGIN, password: 'brand-new-pass' }).expect(200);
  await request.post('/api/v1/auth/password').send({ currentPassword: 'brand-new-pass', newPassword: LOGIN.password }).expect(200);
  resetLoginAttempts();
});

test('auth: data needs a session; login, me, logout', { skip }, async () => {
  for (const [method, path] of [['get', '/api/v1/tracker'], ['get', '/api/v1/export'], ['post', '/api/v1/reset'], ['patch', '/api/v1/settings']]) {
    const res = await anon[method](path).send({});
    assert.equal(res.status, 401, `${method} ${path}`);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  }
  await anon.get('/api/v1/health').expect(200);

  await anon.post('/api/v1/auth/login').send({ ...LOGIN, password: 'nope' }).expect(401);
  await anon.post('/api/v1/auth/login').send({ username: 'other', password: LOGIN.password }).expect(401);

  const agent = supertestFn.agent(app);
  const res = await agent.post('/api/v1/auth/login').send(LOGIN).expect(200);
  const cookie = res.headers['set-cookie'][0];
  assert.match(cookie, /pf_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(json(await agent.get('/api/v1/auth/me').expect(200)).username, LOGIN.username);

  // a tampered token is rejected
  const forged = cookie.split(';')[0].replace(/.$/, c => (c === 'A' ? 'B' : 'A'));
  await anon.get('/api/v1/tracker').set('Cookie', forged).expect(401);

  await agent.post('/api/v1/auth/logout').expect(200);
  await agent.get('/api/v1/tracker').expect(401);
  resetLoginAttempts();
});

test('auth: five wrong passwords lock the login for that IP', { skip }, async () => {
  resetLoginAttempts();
  for (let i = 0; i < 5; i++) await anon.post('/api/v1/auth/login').send({ ...LOGIN, password: 'wrong' }).expect(401);
  const locked = await anon.post('/api/v1/auth/login').send(LOGIN).expect(429);
  assert.equal(locked.body.error.code, 'TOO_MANY_ATTEMPTS');
  resetLoginAttempts();
  await anon.post('/api/v1/auth/login').send(LOGIN).expect(200);
});

test('GET /tracker returns the seeded plan', { skip }, async () => {
  const d = await snapshot();
  assert.equal(d.groups.length, 182);
  assert.equal(d.items.length, 1430);
  assert.equal(d.items.filter(i => i.sectionId === 'striver').length, 495);
  assert.equal(d.schemaVersion, 2);
});

test('ticking a problem links duplicates and schedules revisits', { skip }, async () => {
  let d = await snapshot();
  const arrays = d.groups.find(g => g.sectionId === 'striver' && g.title === 'Arrays');
  assert.ok(d.items.some(i => i.sectionId === 'striver' && i.title === 'Two Sum'), 'the sheet has Two Sum');

  const neet = d.items.find(i => i.sectionId === 'dsa' && i.title === 'Two Sum');
  const changed = json(await request.patch(`/api/v1/items/${neet.id}/done`).send({ done: true }).expect(200));
  assert.deepEqual(changed.map(i => i.sectionId).sort(), ['dsa', 'striver']);
  assert.ok(changed.every(i => i.done && i.revisitDates.length === 2 && i.doneAt));

  d = await snapshot();
  assert.equal(d.items.find(i => i.title === 'Two Sum II').done, false, 'Two Sum II is a different problem');

  // a later paste of the same problem arrives ticked
  const sub2 = d.groups.find(g => g.parentId === arrays.id && g.title === 'Fundamentals');
  const again = json(await request.post('/api/v1/items/bulk').send({ groupId: sub2.id, text: 'two sum' }).expect(201));
  assert.equal(again.items[0].done, true);
});

test('bulk dry run previews without writing', { skip }, async () => {
  const d = await snapshot();
  const sub = d.groups.find(g => g.sectionId === 'striver' && g.title === 'Patterns');
  const before = d.items.filter(i => i.groupId === sub.id).length;
  const res = json(await request.post('/api/v1/items/bulk').send({ groupId: sub.id, text: 'A | E\nA\n\nB | x.dev\nPattern 1', dryRun: true }).expect(200));
  assert.deepEqual(res.rows.map(r => r.skip), [null, 'Repeated in paste', null, 'Already in sub-step']);
  assert.equal((await snapshot()).items.filter(i => i.groupId === sub.id).length, before);
});

test('items: create, edit, move, reorder, delete and restore', { skip }, async () => {
  const d = await snapshot();
  const [w1, w2] = d.groups.filter(g => g.sectionId === 'roadmap' && g.month >= 1).sort((a, b) => a.order - b.order);
  const item = json(await request.post('/api/v1/items').send({ groupId: w1.id, title: 'Mock', track: 'Behavioral', link: 'example.com' }).expect(201));
  assert.equal(item.kind, 'task');
  assert.equal(item.link, 'https://example.com/');

  const edited = json(await request.patch(`/api/v1/items/${item.id}`).send({ title: 'Mock 2', notes: 'n', groupId: w2.id }).expect(200));
  assert.equal(edited.groupId, w2.id);
  assert.equal(edited.notes, 'n');

  await request.patch('/api/v1/items/positions').send([{ id: item.id, order: 0 }]).expect(200);
  const removed = json(await request.delete(`/api/v1/items/${item.id}`).expect(200));
  await request.delete(`/api/v1/items/${item.id}`).expect(404);
  const restored = json(await request.post('/api/v1/restore').send({ items: [removed] }).expect(201));
  assert.equal(restored.items[0].id, item.id);

  const otherSection = d.groups.find(g => g.sectionId === 'dsa');
  await request.patch(`/api/v1/items/${item.id}`).send({ groupId: otherSection.id }).expect(400);
});

test('groups: create sub-step, reschedule step, delete tree and restore', { skip }, async () => {
  const d = await snapshot();
  const step = d.groups.find(g => g.sectionId === 'striver' && g.title === 'Binary Trees');
  const seededSubs = d.groups.filter(g => g.parentId === step.id).length;
  const sub = json(await request.post('/api/v1/groups').send({ sectionId: 'striver', parentId: step.id, title: 'Extra' }).expect(201));
  await request.post('/api/v1/items').send({ groupId: sub.id, title: 'Some tree problem', difficulty: 'Hard' }).expect(201);
  const theme = d.groups.find(g => g.sectionId === 'roadmap' && g.title === 'Caching');
  const moved = json(await request.patch(`/api/v1/groups/${theme.id}`).send({ month: 2 }).expect(200));
  assert.equal(moved.month, 2);

  const removed = json(await request.delete(`/api/v1/groups/${step.id}`).expect(200));
  assert.equal(removed.groups.length, seededSubs + 2, 'the step, its seeded sub-steps and “Extra”');
  assert.equal(removed.items.length, d.items.filter(i => removed.groups.some(g => g.id === i.groupId)).length + 1);
  await request.post('/api/v1/restore').send(removed).expect(201);
  const after = await snapshot();
  assert.equal(after.groups.filter(g => g.parentId === step.id).length, seededSubs + 1);

  const roadmapWeek = d.groups.find(g => g.sectionId === 'roadmap');
  await request.post('/api/v1/groups').send({ sectionId: 'roadmap', parentId: roadmapWeek.id, title: 'x' }).expect(400);
});

test('refreshing the Striver sheet keeps progress and unmatched items', { skip }, async () => {
  const { trackerService } = await import('../src/services/tracker.service.js');
  let d = await snapshot();
  const sub = d.groups.find(g => g.sectionId === 'striver' && g.title === 'Patterns');
  const mine = json(await request.post('/api/v1/items').send({ groupId: sub.id, title: 'My own pattern drill' }).expect(201));
  const p1 = d.items.find(i => i.title === 'Pattern 1');
  await request.patch(`/api/v1/items/${p1.id}/done`).send({ done: true }).expect(200);

  const r = await trackerService.refreshStriver();
  assert.ok(r.kept >= 1, 'items that match nothing in the sheet are kept');
  d = await snapshot();
  assert.equal(d.items.find(i => i.title === 'Pattern 1').done, true);
  const kept = d.items.find(i => i.id === mine.id);
  assert.equal(d.groups.find(g => g.id === kept.groupId).title, 'Kept from before the refresh');
});

test('resumes: upload, list, open, download, rename, delete', { skip }, async () => {
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');
  const up = await request.post('/api/v1/resumes')
    .set('Content-Type', 'application/octet-stream')
    .set('X-File-Name', encodeURIComponent('Sourav Kumar – Resume.pdf'))
    .set('X-Label', encodeURIComponent('Backend v1'))
    .send(pdf).expect(201);
  const r = json(up);
  assert.equal(r.contentType, 'application/pdf');
  assert.equal(r.size, pdf.length);
  assert.equal(r.label, 'Backend v1');
  assert.equal(r.filename, 'Sourav Kumar – Resume.pdf');
  assert.equal(r.data, undefined, 'lists never carry the file bytes');

  assert.ok(json(await request.get('/api/v1/resumes').expect(200)).some(x => x.id === r.id));
  const view = await request.get(`/api/v1/resumes/${r.id}/file`).buffer(true).expect(200);
  assert.match(view.headers['content-disposition'], /^inline;/);
  assert.equal(view.headers['content-type'], 'application/pdf');
  assert.ok(Buffer.from(view.body).equals(pdf));
  const dl = await request.get(`/api/v1/resumes/${r.id}/file?download=1`).expect(200);
  assert.match(dl.headers['content-disposition'], /^attachment;/);

  assert.equal(json(await request.patch(`/api/v1/resumes/${r.id}`).send({ label: 'Backend v2' }).expect(200)).label, 'Backend v2');

  // not a PDF/DOC/DOCX, whatever the name says
  const fake = await request.post('/api/v1/resumes').set('Content-Type', 'application/octet-stream')
    .set('X-File-Name', 'evil.pdf').send(Buffer.from('<script>alert(1)</script>')).expect(400);
  assert.match(fake.body.error.message, /PDF, DOC or DOCX/);
  await request.post('/api/v1/resumes').set('Content-Type', 'application/octet-stream').send(Buffer.alloc(0)).expect(400);
  await request.post('/api/v1/resumes').set('Content-Type', 'application/octet-stream')
    .set('X-File-Name', 'big.pdf').send(Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(10 * 1024 * 1024)])).expect(413);

  // private: no session, no files
  await anon.get('/api/v1/resumes').expect(401);
  await anon.get(`/api/v1/resumes/${r.id}/file`).expect(401);
  await anon.post('/api/v1/resumes').set('Content-Type', 'application/octet-stream').send(pdf).expect(401);

  await request.delete(`/api/v1/resumes/${r.id}`).expect(200);
  await request.get(`/api/v1/resumes/${r.id}/file`).expect(404);
});

test('validation and error shapes', { skip }, async () => {
  const bad = await request.post('/api/v1/items').send({ groupId: 'nope', title: '' }).expect(400);
  assert.equal(bad.body.error.code, 'VALIDATION_ERROR');
  await request.patch('/api/v1/settings').send({}).expect(400);
  await request.patch('/api/v1/settings').send({ theme: 'pink' }).expect(400);
  await request.get('/api/v1/nope').expect(404);
  const badJson = await request.post('/api/v1/items').set('content-type', 'application/json').send('{bad').expect(400);
  assert.equal(badJson.body.error.code, 'BAD_JSON');
});

test('export → import round-trips progress; reset restores the seed', { skip }, async () => {
  const exported = JSON.parse((await request.get('/api/v1/export').expect(200).expect('content-disposition', /attachment/)).text);
  const doneBefore = exported.items.filter(i => i.done).length;
  assert.ok(doneBefore > 0);

  await request.post('/api/v1/reset').expect(200);
  assert.equal((await snapshot()).items.filter(i => i.done).length, 0);

  const imported = json(await request.post('/api/v1/import').send(exported).expect(200));
  assert.equal(imported.items.filter(i => i.done).length, doneBefore);
  assert.equal(imported.items.length, exported.items.length);

  await request.post('/api/v1/import').send({ schemaVersion: 99, groups: [], items: [] }).expect(400);
});
