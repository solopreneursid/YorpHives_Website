'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, writeFile, symlink, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ORIGIN, readSnapshot, run } = require('../browser-check.cjs');

async function fixture(fn) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'yh-browser-test-'));
  const root = path.join(base, 'site');
  await mkdir(path.join(root, 'tool'), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<h1>Home</h1>');
  await writeFile(path.join(root, 'tool', 'index.html'), '<h1>Tool</h1>');
  await writeFile(path.join(root, 'catalog.json'), JSON.stringify({ items: [{ name: 'tool', type: 'tool', date: '2026-01-01' }] }));
  await writeFile(path.join(base, 'outside.txt'), 'private');
  try { await fn({ base, root }); } finally { await rm(base, { recursive: true, force: true }); }
}

test('browser route serves only snapshot files and directory indexes', async () => fixture(async ({ root }) => {
  const home = await readSnapshot(root, ORIGIN + '/');
  assert.equal(home.status, 200);
  assert.match(home.body.toString(), /Home/);
  assert.match(home.contentType, /text\/html/);
  assert.match((await readSnapshot(root, ORIGIN + '/tool/')).body.toString(), /Tool/);
  assert.equal((await readSnapshot(root, ORIGIN + '/missing/')).status, 404);
}));

test('browser route blocks external traffic and non-read methods', async () => fixture(async ({ root }) => {
  assert.equal(await readSnapshot(root, 'https://yorphives.com/'), null);
  assert.equal(await readSnapshot(root, 'http://yorphives.test.evil.example/'), null);
  assert.equal((await readSnapshot(root, ORIGIN + '/', 'POST')).status, 405);
  assert.equal((await readSnapshot(root, ORIGIN + '/', 'HEAD')).body.length, 0);
  assert.equal((await readSnapshot(root, ORIGIN + '/%00')).status, 400);
}));

test('browser route cannot follow links out of the snapshot', async () => fixture(async ({ base, root }) => {
  await symlink(path.join(base, 'outside.txt'), path.join(root, 'escape'));
  assert.equal((await readSnapshot(root, ORIGIN + '/escape')).status, 403);
  assert.notEqual((await readSnapshot(root, ORIGIN + '/%2e%2e/outside.txt')).status, 200);
}));

test('browser tests skip when sandbox markers are missing', () => {
  const child = spawnSync(process.execPath, [path.join(__dirname, '..', 'browser-check.cjs')],
    { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(child.status, 0);
  assert.equal(JSON.parse(child.stdout).status, 'not_run');
});

test('unavailable browser is reported as not run', async () => fixture(async ({ root }) => {
  const stub = { chromium: { launch: async () => { throw new Error('unavailable'); } } };
  const result = await run(root, stub);
  assert.equal(result.status, 'not_run');
  assert.equal(result.cases.length, 0);
}));
