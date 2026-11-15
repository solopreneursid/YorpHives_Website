import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
test('all catalog entries have unique, existing local tool pages and modules', async () => {
  const catalog = JSON.parse(await readFile(resolve(root, 'catalog.json'), 'utf8'));
  assert.ok(catalog.items.filter(item => item.type === 'tool').length >= 67);
  assert.equal(new Set(catalog.items.map(item => item.url)).size, catalog.items.length);
  const directory = await readFile(resolve(root, 'tools/index.html'), 'utf8');
  for (const item of catalog.items) {
    assert.ok(['tool', 'app', 'product'].includes(item.type));
    assert.ok(item.category && item.name && item.description);
    if (item.type !== 'tool') continue;
    assert.match(item.url, /^tools\/[a-z0-9-]+\/$/);
    await access(resolve(root, item.url, 'index.html'));
    if (item.module) await access(resolve(root, item.module.url));
    assert.ok(directory.includes(`../${item.url}`));
  }
});
