import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFile(resolve(root,file),'utf8');

test('homepage explicitly communicates one founder, private evolving AI workforce and final human authority',async()=>{
 const h=await read('index.html');
 assert.match(h,/One founder\.<br>An AI team\.<br><em>Ideas in motion\.<\/em>/);
 assert.match(h,/its own evolving AI business operating system/i);
 assert.match(h,/Specialist AI agents discover opportunities, investigate markets and evaluate evidence/);
 assert.match(h,/The founder decides what we pursue and build/);
 assert.match(h,/Founder-approved decisions/);
 assert.match(h,/id="our-ai-team"/);
 assert.match(h,/private, self-hostable AI business OS/i);
 assert.match(h,/adaptable open-weight models/i);
 assert.match(h,/founder-reviewed feedback/i);
 assert.match(h,/system can evolve without being locked to one model/i);
 assert.match(h,/The final decision to pursue an idea, build a product or launch a business stays with the founder/i);
 assert.match(h,/HUMAN CONTROL/);
});
test('separate AI roles are represented without claiming they have publishing or deployment authority',async()=>{
 const h=await read('index.html');
 for(const role of ['Research &amp; innovation','Market intelligence','Engineering &amp; product','Growth &amp; revenue','Operations &amp; quality','Shared learning']){
  assert.ok(h.includes(role),role+' missing');
 }
 assert.match(h,/AI ANALYSIS/);
 assert.match(h,/EVIDENCE &amp; RECOMMENDATIONS/);
 assert.match(h,/Approve · Revise · Reject/);
 assert.doesNotMatch(h,/agents automatically publish|automatic deployment without approval/i);
});
test('every venture follows research, evaluation, founder decision and build stages',async()=>{
 const [h,js]=await Promise.all([read('index.html'),read('next.js')]);
 const section=h.match(/<section class="journey-section"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section);
 assert.match(section,/id="how-it-works"/);
 for(const name of ['Discover','Research','Evaluate','Founder decides','Build &amp; evolve']){
  assert.ok(section.includes('<h3>'+name+'</h3>'),name+' stage missing');
 }
 assert.match(section,/Approve, revise or reject the proposed plan/);
 assert.match(js,/hash==='projects-collection'\?'explore'/);
 assert.match(js,/'how-it-works','projects-collection','our-ai-team'/);
 assert.match(h,/href="#how-it-works"/);
});
test('Explore is the public collection of approved YorpHives OS projects, not unrelated products',async()=>{
 const [h,js]=await Promise.all([read('index.html'),read('next.js')]);
 const explore=h.split('<!-- EXPLORE -->')[1]?.split('<!-- BUILDERS -->')[0];
 assert.ok(explore);
 assert.match(explore,/studio's own founder-approved projects/);
 assert.match(explore,/evolving AI business OS/);
 assert.match(explore,/same AI research team/i);
 assert.match(explore,/The same team/);
 assert.match(explore,/YorpHives HQ/);
 assert.match(explore,/id="projects-collection"/);
 assert.match(explore,/No qualified launches yet/);
 assert.match(explore,/Only genuinely approved and published work is listed/);
 assert.match(js,/qualifiedProducts\(published\)/);
});
test('the OS and Explore use the same evidence and founder approval gate',async()=>{
 const h=await read('index.html');
 for(const phrase of ['market demand','customer needs','competition','feasibility','business potential','final founder approval']){
  assert.ok(h.includes(phrase),phrase+' missing');
 }
 assert.match(h,/The founder chooses what moves forward/);
 assert.match(h,/Only approved work/i);
 assert.match(h,/First public launch pending/i);
});
test('the redesign retains Free Tools, future paid Builders and contact routes',async()=>{
 const h=await read('index.html');
 for(const title of ['Explore projects','Free tools','Builders network']){
  assert.ok(h.includes('<h3>'+title+'</h3>'),title+' card missing');
 }
 for(const route of ['#tools','#builders','#connect','#explore'])assert.ok(h.includes('href="'+route+'"'),route+' route missing');
 assert.match(h,/future paid network/);
 assert.match(h,/Enrollment is not open yet/);
 assert.match(h,/Nothing is uploaded by this form/);
});
test('direct tool suggestion remains an optional founder-reviewed email',async()=>{
 const [h,js]=await Promise.all([read('index.html'),read('next.js')]);
 assert.match(h,/data-contact-reason="Suggest a free tool"/);
 assert.match(h,/<option>Suggest a free tool<\/option>/);
 assert.match(js,/getAttribute\('data-contact-reason'\)/);
 assert.match(js,/mailto:connect@yorphives\.com/);
});
