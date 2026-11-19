import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('homepage has one verified activity rail and no duplicate rotating ticker',async()=>{
 const html=await read('reimagined/index.html');
 assert.equal((html.match(/id="yh-pulse"/g)||[]).length,1);
 assert.match(html,/id="activity-list"/);
 assert.match(html,/id="yh-pulse-item"/);
 assert.doesNotMatch(html,/eco-strip|eco-motion-toggle|pulse-track|yh-pulse-toggle/);
 assert.doesNotMatch(html,/href="rotators\.css"|src="rotators\.js"/);
});
test('public activity is loaded from the generated first-party registry',async()=>{
 const js=await read('reimagined/studio.js');
 assert.match(js,/fetch\('\/activity\.json'/);
 assert.match(js,/kind==='tools'/);
 assert.match(js,/kind==='explore'/);
 assert.match(js,/tools\.some\(tool=>tool\.url===item\.url\)/);
 assert.match(js,/Date\.parse\(item\.timestamp\)<=Date\.now\(\)/);
 assert.match(js,/LATEST /);
});
test('activity generator continues to exclude private, future and retired events',async()=>{
 const feed=await read('scripts/activity-feed.mjs');
 assert.match(feed,/validPublicEvent/);
 assert.match(feed,/\['explore','tools'\]/);
 assert.match(feed,/slice\(0,Math\.max\(0,Math\.min\(20,max\)\)\)/);
 assert.match(feed,/Published updates will appear here/);
 assert.doesNotMatch(feed,/kind:'builders'/);
});
test('homepage and direct tool layouts respect reduced motion',async()=>{
 const [home,tool]=await Promise.all([read('reimagined/studio.css'),read('tools/tool-next.css')]);
 assert.match(home,/prefers-reduced-motion:reduce/);
 assert.match(tool,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(home,/@import|url\(['"]?https?:/i);
 assert.doesNotMatch(tool,/@import|url\(['"]?https?:/i);
});
