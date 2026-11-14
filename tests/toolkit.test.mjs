import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { formatJson, buildCampaignUrl } from '../tools/toolkit.mjs';
test('JSON formatting preserves large numbers, escaped strings, nested containers and ordering', () => {
  const input = '{"large":900719925474099312345,"s":"a \\"quoted\\" value","empty":[],"n":[true,null,{"x":1e400}]}'.replaceAll('\\"','\\"');
  const formatted = formatJson(input, 2);
  assert.ok(formatted.includes('900719925474099312345'));
  assert.ok(formatted.includes('1e400'));
  assert.equal(formatJson(formatted, 0), input);
  assert.deepEqual(JSON.parse(formatted), JSON.parse(input));
});
test('JSON formatter handles primitives and rejects malformed input', () => {
  assert.equal(formatJson(' null ', 4), 'null');
  assert.equal(formatJson('{"a":[]}', 2), '{\n  "a": []\n}');
  assert.throws(() => formatJson('{bad}', 2));
  assert.throws(() => formatJson('{}', 3));
});
test('campaign builder retains existing query and fragment and replaces selected UTM', () => {
  const result = new URL(buildCampaignUrl('https://example.com/path?ref=hello&utm_source=old#section', {source:'social media',medium:'email',campaign:'winter & spring'}));
  assert.equal(result.searchParams.get('ref'), 'hello');
  assert.equal(result.searchParams.get('utm_source'), 'social media');
  assert.equal(result.searchParams.get('utm_campaign'), 'winter & spring');
  assert.equal(result.hash, '#section');
});
test('campaign builder rejects unsafe and incomplete URLs', () => {
  assert.throws(() => buildCampaignUrl('javascript:alert(1)', {source:'x'}));
  assert.throws(() => buildCampaignUrl('example.com', {source:'x'}));
});
