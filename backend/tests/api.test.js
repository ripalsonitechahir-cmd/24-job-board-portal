const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Use an isolated SQLite file so tests never touch dev data.
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'admin123';

const root = path.join(__dirname, '..');
let server, base, token, prisma;

const call = async (method, url, body, auth) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const goodJob = {
  title: 'Test Engineer', company: 'TestCo', location: 'Berlin', type: 'Full-time',
  salary_min: 50000, salary_max: 70000, description: 'Test things.',
};
const goodApp = { candidate_name: 'Jane', email: 'jane@example.com', resume_url: 'https://example.com/jane.pdf', note: 'Hi' };

before(async () => {
  for (const f of ['test.db', 'test.db-journal']) fs.rmSync(path.join(root, 'prisma', f), { force: true });
  execSync('npx prisma db push --skip-generate', { cwd: root, stdio: 'ignore' });
  prisma = require('../src/db');
  await require('../src/seed').ensureAdmin();
  server = require('../src/app').listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await prisma.$disconnect();
  for (const f of ['test.db', 'test.db-journal']) fs.rmSync(path.join(root, 'prisma', f), { force: true });
});

test('health returns 200 with db up', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.database, 'up');
});

test('admin endpoints require auth', async () => {
  assert.equal((await call('POST', '/api/jobs', goodJob)).status, 401);
  assert.equal((await call('GET', '/api/jobs/1/applications')).status, 401);
  assert.equal((await call('PATCH', '/api/jobs/1/status', { status: 'closed' })).status, 401);
});

test('login rejects bad credentials and accepts good ones', async () => {
  assert.equal((await call('POST', '/api/admin/login', { username: 'admin', password: 'nope' })).status, 401);
  assert.equal((await call('POST', '/api/admin/login', {})).status, 400);
  const r = await call('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  assert.equal(r.status, 200);
  token = r.body.token;
  assert.ok(token);
});

test('create job validates input', async () => {
  const bad = await call('POST', '/api/jobs', { ...goodJob, title: '', type: 'Nope' }, token);
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.title && bad.body.errors.type);
  const range = await call('POST', '/api/jobs', { ...goodJob, salary_min: 90000 }, token);
  assert.equal(range.status, 400);
  assert.ok(range.body.errors.salary_max);
});

let jobId;
test('create + get job', async () => {
  const c = await call('POST', '/api/jobs', goodJob, token);
  assert.equal(c.status, 201);
  assert.equal(c.body.status, 'open');
  jobId = c.body.id;
  assert.equal((await call('GET', `/api/jobs/${jobId}`)).body.title, 'Test Engineer');
  assert.equal((await call('GET', '/api/jobs/99999')).status, 404);
  assert.equal((await call('GET', '/api/jobs/abc')).status, 400);
});

test('list: pagination, search and filters', async () => {
  for (let i = 0; i < 12; i++) {
    await call('POST', '/api/jobs', { ...goodJob, title: `Bulk ${i}`, location: i % 2 ? 'Paris' : 'Rome', type: i % 2 ? 'Contract' : 'Full-time' }, token);
  }
  const p1 = await call('GET', '/api/jobs?page=1');
  assert.equal(p1.body.jobs.length, 10);
  assert.equal(p1.body.total, 13);
  assert.equal(p1.body.totalPages, 2);
  assert.equal((await call('GET', '/api/jobs?page=2')).body.jobs.length, 3);
  assert.equal((await call('GET', '/api/jobs?q=Bulk')).body.total, 12);
  assert.equal((await call('GET', '/api/jobs?location=paris')).body.total, 6);
  assert.equal((await call('GET', '/api/jobs?type=Contract')).body.total, 6);
  assert.equal((await call('GET', '/api/jobs?q=Bulk&location=Paris&type=Contract')).body.total, 6);
  assert.equal((await call('GET', '/api/jobs?type=Bogus')).status, 400);
});

test('apply validates and stores application', async () => {
  const bad = await call('POST', `/api/jobs/${jobId}/apply`, { ...goodApp, email: 'x', resume_url: 'ftp://a' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.email && bad.body.errors.resume_url);
  assert.equal((await call('POST', `/api/jobs/${jobId}/apply`, goodApp)).status, 201);
  assert.equal((await call('POST', '/api/jobs/99999/apply', goodApp)).status, 404);
});

test('admin sees applications per job', async () => {
  const r = await call('GET', `/api/jobs/${jobId}/applications`, null, token);
  assert.equal(r.status, 200);
  assert.equal(r.body.applications.length, 1);
  assert.equal(r.body.applications[0].candidate_name, 'Jane');
});

test('mark filled/closed blocks applications and hides from default list', async () => {
  assert.equal((await call('PATCH', `/api/jobs/${jobId}/status`, { status: 'bogus' }, token)).status, 400);
  const r = await call('PATCH', `/api/jobs/${jobId}/status`, { status: 'filled' }, token);
  assert.equal(r.body.status, 'filled');
  assert.equal((await call('POST', `/api/jobs/${jobId}/apply`, goodApp)).status, 409);
  assert.equal((await call('GET', '/api/jobs?q=Test Engineer')).body.total, 0);
  assert.equal((await call('GET', '/api/jobs?q=Test Engineer&status=all')).body.total, 1);
});

test('malformed JSON and unknown API routes do not 500', async () => {
  const res = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
  assert.equal((await call('GET', '/api/nothing')).status, 404);
});
