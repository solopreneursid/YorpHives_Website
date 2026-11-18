import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extractMarketingCopy,newMarketingCopy} from '../marketing-localization.mjs';
import {PAGE_COPY} from '../site-language-copy.mjs';
import {SECTION_COPY} from '../site-section-copy.mjs';
import {TOOL_COPY} from '../site-tool-copy.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('new UI features cannot add untranslated visible content silently',()=>{
 const html='<main><section><h2>Brand New AI Product</h2><p>A new capability for our visitors.</p></section></main>';
 const errors=newMarketingCopy({html,baseline:[],translations:[PAGE_COPY,SECTION_COPY,TOOL_COPY]});
 assert.deepEqual(errors,['A new capability for our visitors.','Brand New AI Product']);
 const already=['A new capability for our visitors.'];
 assert.deepEqual(newMarketingCopy({html,baseline:already,translations:[PAGE_COPY,SECTION_COPY,TOOL_COPY]}),['Brand New AI Product']);
});
test('script, styles, svg, tags and URLs do not become translation requests',()=>{
 const html='<svg><text>Decorative vector text</text></svg><script>const fake="Secret script"</script>'+
  '<main><h2>Readable heading</h2><p>Another visible sentence.</p><span>https://example.com</span></main>';
 assert.deepEqual(extractMarketingCopy(html),['Another visible sentence.','Readable heading']);
});
test('published existing homepage baseline has no unreviewed new text',async()=>{
 const baseline=JSON.parse(await read('marketing-copy-baseline.json'));
 const html=await read('reimagined/index.html');
 assert.ok(baseline.strings.length>=190);
 assert.deepEqual(newMarketingCopy({html,baseline:baseline.strings,translations:[PAGE_COPY,SECTION_COPY,TOOL_COPY]}),[]);
 const source=await read('scripts/build-site.mjs');
 assert.doesNotMatch(source,/throw Error\('New website UI copy requires localized strings/);
 assert.match(source,/Browser-native translation is the zero-cost default/);
});
