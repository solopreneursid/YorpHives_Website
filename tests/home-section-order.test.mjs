import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('OUR WORK three destination cards are directly after the hero, before featured tools',async()=>{
 const html=await read('reimagined/index.html');
 const hero=html.indexOf('<div class="hero">');
 const cards=html.indexOf('<section class="home-section shell" aria-labelledby="home-discover-title">');
 const featured=html.indexOf('<section class="home-section featured-section" aria-labelledby="featured-title">');
 const connect=html.indexOf('<section class="hqconnect" id="hqconnect"');
 assert.ok(hero>=0&&cards>hero&&featured>cards&&connect>featured);
 const region=html.slice(cards,featured);
 assert.match(region,/OUR WORK/);
 assert.match(region,/Explore\. Use\.<br><em>Create together\.<\/em>/);
 for(const dest of ['ecosystem-ventures','ecosystem-tools','ecosystem-partners'])
  assert.match(region,new RegExp('class="ecosystem-card '+dest+'"'));
 for(const href of ['#ventures','#tools','#hqconnect'])
  assert.ok(region.includes('href="'+href+'"'),href);
 assert.doesNotMatch(html.slice(hero,cards),/id="featured-tools-grid"|class="trust-strip"/);
 assert.match(html.slice(featured,connect),/id="featured-tools-grid"/);
});
