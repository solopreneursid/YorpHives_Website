import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

test('primary navigation follows Home, Explore, Builders, Free tools order',async()=>{
 const html=await readFile(resolve(root,'index.html'),'utf8');
 const nav=html.split('<nav class="site-nav" id="primary-navigation"')[1]?.split('</nav>')[0];
 assert.ok(nav,'main desktop/mobile navigation should exist');
 const links=[...nav.matchAll(/data-nav="(home|explore|builders|tools)"/g)].map(m=>m[1]);
 assert.deepEqual(links,['home','explore','builders','tools']);
 assert.match(nav,/data-nav="connect"/);
});
