'use strict';

// Run only inside the reviewer's network-isolated sandbox. All HTTP requests
// are fulfilled from an immutable candidate snapshot, never from production.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ORIGIN = 'http://yorphives.test';
const MAX_FILE = 5 * 1024 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

async function readSnapshot(root, requestUrl, method = 'GET') {
  if (!['GET', 'HEAD'].includes(method)) return { status: 405, body: Buffer.alloc(0) };
  let url;
  try { url = new URL(requestUrl); } catch { return { status: 400, body: Buffer.alloc(0) }; }
  if (url.origin !== ORIGIN || url.username || url.password) return null;
  let name;
  try { name = decodeURIComponent(url.pathname); } catch { return { status: 400, body: Buffer.alloc(0) }; }
  if (name.includes('\0') || name.includes('\\')) return { status: 400, body: Buffer.alloc(0) };
  const base = await fs.realpath(root);
  let candidate = path.resolve(base, '.' + name);
  try {
    let actual = await fs.realpath(candidate);
    if (actual !== base && !actual.startsWith(base + path.sep)) return { status: 403, body: Buffer.alloc(0) };
    if ((await fs.stat(actual)).isDirectory()) actual = await fs.realpath(path.join(actual, 'index.html'));
    if (actual !== base && !actual.startsWith(base + path.sep)) return { status: 403, body: Buffer.alloc(0) };
    const details = await fs.stat(actual);
    if (!details.isFile() || details.size > MAX_FILE) return { status: 404, body: Buffer.alloc(0) };
    return { status: 200, contentType: MIME[path.extname(actual).toLowerCase()] || 'application/octet-stream',
      body: method === 'HEAD' ? Buffer.alloc(0) : await fs.readFile(actual) };
  } catch { return { status: 404, body: Buffer.alloc(0) }; }
}

async function run(root, playwright) {
  let catalog;
  try {
    catalog = JSON.parse(await fs.readFile(path.join(root, 'catalog.json'), 'utf8'));
    if (!Array.isArray(catalog.items) || !catalog.items.length || catalog.items.length > 1000) throw Error();
  } catch { return { id: 'browser', label: 'Website browser tests', status: 'failed',
    details: 'The tool catalog could not be read for browser testing.', cases: [] }; }
  let browser;
  try { browser = await playwright.chromium.launch({ headless: true, args: ['--disable-background-networking'] }); }
  catch { return { id: 'browser', label: 'Website browser tests', status: 'not_run',
    details: 'The isolated browser could not start; no browser checks were run.', cases: [] }; }
  let context;
  const cases = [];
  let blocked = 0;
  try {
    context = await browser.newContext({ viewport: { width: 1440, height: 900 },
      serviceWorkers: 'block', acceptDownloads: false });
    await context.route('**/*', async route => {
      try {
        const response = await readSnapshot(root, route.request().url(), route.request().method());
        if (!response) { blocked++; return await route.abort('blockedbyclient'); }
        return await route.fulfill(response);
      } catch { return await route.abort('failed'); }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', () => errors.push('pageerror'));
    async function check(name, fn) {
      const before = errors.length;
      try { await fn(); assert.equal(errors.length, before); cases.push({ name, status: 'passed' }); }
      catch { cases.push({ name, status: 'failed' }); }
    }
    const expected = catalog.items.filter(item => item && ['tool', 'app', 'product'].includes(item.type) &&
      typeof item.name === 'string' && typeof item.date === 'string' && /^\d{4}-\d\d-\d\d$/.test(item.date))
      .sort((a, b) => b.date.localeCompare(a.date));
    await check('Home page and recent additions', async () => {
      await page.goto(ORIGIN + '/#home', { waitUntil: 'networkidle' });
      await page.locator('#home h1').waitFor({ state: 'visible' });
      await page.locator('#recent-items .catalog-card').first().waitFor();
      const names = await page.locator('#recent-items .catalog-card h3').allTextContents();
      assert.deepEqual(names, expected.slice(0, 3).map(x => x.name));
    });
    await check('Free tools search', async () => {
      await page.goto(ORIGIN + '/#tools', { waitUntil: 'networkidle' });
      await page.locator('#tool-search').fill('word');
      await page.locator('#tools-items .catalog-card').first().waitFor();
      assert.ok((await page.locator('#tools-items').innerText()).includes('Word & Character Counter'));
    });
    await check('Word counter produces and resets a result', async () => {
      await page.goto(ORIGIN + '/tools/word-counter/', { waitUntil: 'networkidle' });
      await page.locator('textarea[name="text"]').fill('Hello YorpHives');
      await page.locator('#utility-run').click();
      await page.locator('#utility-result').waitFor({ state: 'visible' });
      assert.match(await page.locator('#utility-output').inputValue(), /Words:\s*2\b/);
      await page.locator('#utility-form button[type="reset"]').click();
      assert.equal(await page.locator('#utility-result').isHidden(), true);
    });
    await check('Mobile navigation', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(ORIGIN + '/#home', { waitUntil: 'networkidle' });
      const menu = page.locator('.menu-toggle');
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      await page.locator('.site-nav [data-nav="tools"]').click();
      await page.locator('#tools').waitFor({ state: 'visible' });
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      await page.setViewportSize({ width: 1440, height: 900 });
    });
    await check('Every local catalog tool page loads', async () => {
      const tools = catalog.items.filter(item => item && item.type === 'tool');
      assert.ok(tools.length > 0);
      for (const item of tools) {
        assert.equal(typeof item.url, 'string');
        const url = new URL(item.url, ORIGIN + '/');
        assert.equal(url.origin, ORIGIN, 'External tools require separate review.');
        const response = await page.goto(url.href, { waitUntil: 'load', timeout: 10000 });
        assert.ok(response && response.ok());
        await page.locator('h1').first().waitFor({ state: 'visible' });
      }
    });
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  const failed = cases.filter(item => item.status === 'failed').length;
  return { id: 'browser', label: 'Website browser tests', status: failed ? 'failed' : 'passed',
    details: `${cases.length - failed} of ${cases.length} browser checks passed against the local snapshot; ${blocked} external requests blocked.`, cases };
}

if (require.main === module) {
  if (process.env.YH_BROWSER_SANDBOX !== '1' || process.env.YH_SITE_ROOT !== '/work') {
    console.log(JSON.stringify({ id: 'browser', label: 'Website browser tests', status: 'not_run',
      details: 'Browser tests require the reviewer sandbox.', cases: [] }));
  } else {
    (async () => {
      try {
        const result = await run('/work', require('playwright'));
        console.log(JSON.stringify(result));
        if (result.status === 'failed') process.exitCode = 1;
      } catch {
        console.log(JSON.stringify({ id: 'browser', label: 'Website browser tests', status: 'not_run',
          details: 'The browser test runtime could not start.', cases: [] }));
        process.exitCode = 2;
      }
    })();
  }
}
module.exports = { ORIGIN, readSnapshot, run };
