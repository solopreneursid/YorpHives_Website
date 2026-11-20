import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {approvedVentureReleases} from '../reimagined/venture-activity.mjs';
const read=(name)=>readFile(new URL('../'+name,import.meta.url),'utf8');
const approved=(name,date,url)=>({
 type:'product',name,description:'A finished useful product for customers.',
 url,date,published:true,visibility:'public',launchStatus:'launched',
 headquartersReview:{status:'qualified',marketResearch:'passed',businessAnalysis:'passed',evidenceSha256:'a'.repeat(64)},
 founderApproval:{status:'approved',approvedOn:'2026-11-19'}
});
test('HQventures release timeline excludes even very recent free tools and unapproved drafts',()=>{
 const now=Date.parse('2026-11-20T12:00:00Z');
 const first=approved('Real HQventure','2026-11-20','products/real-hqventure/');
 const older=approved('Older Venture','2026-11-18','products/older-venture/');
 const freeTool={...first,type:'tool',name:'Updated: Free Tool',url:'tools/image-resizer/'};
 const unapproved={...first,name:'Unapproved Draft',url:'products/draft/',founderApproval:{status:'pending',approvedOn:'2026-11-19'}};
 const future={...first,name:'Future Product',url:'products/future/',date:'2026-11-22'};
 assert.deepEqual(approvedVentureReleases([freeTool,older,unapproved,first,future],now).map(x=>x.name),
  ['Real HQventure','Older Venture']);
 assert.deepEqual(approvedVentureReleases([freeTool,unapproved],now),[]);
 assert.deepEqual(approvedVentureReleases([],now),[]);
});
test('HQventures markup contains only a product timeline; tool release feed belongs to Free Tools',async()=>{
 const [html,js,build]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.js'),read('scripts/build-site.mjs')]);
 const ventures=html.split('<section class="view" id="ventures"')[1]?.split('<section class="view" id="tools"')[0]||'';
 const tools=html.split('<section class="view" id="tools"')[1]?.split('</main>')[0]||'';
 assert.match(ventures,/id="venture-activity"[^>]*hidden/);
 assert.match(ventures,/id="venture-activity-list"/);
 assert.doesNotMatch(ventures,/id="yh-pulse"|id="activity-list"|FREE TOOLS \/ RELEASE ACTIVITY/);
 assert.match(tools,/id="yh-pulse"/);
 assert.match(tools,/FREE TOOLS \/ RELEASE ACTIVITY/);
 assert.match(js,/approvedVentureReleases\(allItems\)/);
 assert.match(js,/if\(!releases.length\)\{section.hidden=true/);
 assert.match(js,/item.kind==='tools'/);
 assert.doesNotMatch(js,/item.kind==='explore'/);
 assert.match(build,/venture-activity\.mjs/);
});
test('actual catalog has no approved HQventures products; preview must not show fabricated launches',async()=>{
 const catalog=JSON.parse(await read('catalog.json'));
 assert.equal(approvedVentureReleases(catalog.items).length,0);
});
