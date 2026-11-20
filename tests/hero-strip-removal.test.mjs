import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('hero leads into the three public destination cards, without the retired stats strip',async()=>{
 const [html,js]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js')]);
 const heroEnd=html.indexOf(' </div>\n </div>\n\n <section class="home-section shell" aria-labelledby="home-discover-title">');
 const cards=html.indexOf('id="home-discover-title"');
 const featured=html.indexOf('id="featured-title"');
 assert.ok(heroEnd!==-1&&cards<featured,'Three destination cards must directly follow hero and precede featured tools');
 assert.doesNotMatch(html,/class="trust-strip shell"|id="home-tool-count"|id="home-venture-count"/);
 for(const phrase of ['PUBLISHED BROWSER TOOLS','ACCOUNT REQUIRED','APPROVED PUBLIC VENTURES','Published tools link directly to real pages.'])
  assert.ok(!html.includes(phrase),'Removed stat remains: '+phrase);
 assert.doesNotMatch(js,/home-tool-count|home-venture-count/);
 assert.match(html,/id="featured-tools-grid"/);
 assert.match(html,/id="tools-count-big"/);
 assert.match(html,/id="venture-hero-count"/);
 assert.match(html,/id="hqconnect"/);
});
