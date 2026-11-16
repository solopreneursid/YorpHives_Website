import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFile(resolve(root,file),'utf8');

test('the Next homepage preserves the live founder-first, AI-powered promise',async()=>{
 const h=await read('index.html');
 assert.match(h,/You bring the idea\.<br>We turn it into a <em>real product\.<\/em>/);
 assert.match(h,/Research, validate and build your idea with a team that thinks like a founder/);
 assert.match(h,/AI-powered execution, all in one place/);
 assert.match(h,/Founder-led thinking/);
 assert.match(h,/Start with your idea/);
 assert.match(h,/See how it works/);
 for(const phrase of ['Idea to product','Founder first','AI-powered','Growth focused']){
  assert.ok(h.includes(phrase),phrase+' principle missing');
 }
});
test('the original path from idea to product remains concrete and navigable',async()=>{
 const [h,js]=await Promise.all([read('index.html'),read('next.js')]);
 const section=h.match(/<section class="journey-section"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section,'journey section missing');
 assert.match(section,/id="how-it-works"/);
 assert.match(section,/Product roadmap and growth plan/);
 assert.match(section,/Market, users and opportunity/);
 assert.match(section,/Design, develop and launch/);
 assert.match(js,/hash==='how-it-works'\?'home'/);
 assert.match(js,/subpages\.has\(hash\)/);
 assert.match(h,/href="#how-it-works"/);
});
test('all main public paths remain available rather than only a product shop',async()=>{
 const h=await read('index.html');
 for(const [title,url] of [['Start a project','#connect'],['Free tools','#tools'],['Builders network','#builders']]){
  assert.ok(h.includes('<h3>'+title+'</h3>'),title+' absent');
  assert.ok(h.includes('href="'+url+'"'),url+' absent');
 }
 assert.match(h,/websites and apps to AI agents and automation/);
 assert.match(h,/free, with no account required/);
 assert.match(h,/future paid network/);
});
test('public product launches still require both HQ evidence and founder approval',async()=>{
 const h=await read('index.html');
 for(const part of ['market demand','customer needs','competition','feasibility','business potential','final founder approval']){
  assert.ok(h.toLowerCase().includes(part),part+' missing');
 }
 assert.match(h,/No qualified launches yet/);
 assert.match(h,/First launch pending/);
});
test('future Builders membership is not misrepresented as live jobs or enrollment',async()=>{
 const h=(await read('index.html')).split('<!-- BUILDERS -->')[1].split('<!-- CONNECT -->')[0];
 assert.match(h,/Build opportunities\./);
 assert.match(h,/Find paid work\./);
 assert.match(h,/Post a job or project\./);
 assert.match(h,/Jobs and posting require verified paid membership/);
 assert.match(h,/Enrollment is not open yet/);
 assert.match(h,/No job listing or posting is available to the public/);
 assert.doesNotMatch(h,/<form\b/i);
});
test('a visitor can propose free tools without opening an account or submitting data to the site',async()=>{
 const [h,js]=await Promise.all([read('index.html'),read('next.js')]);
 assert.match(h,/data-contact-reason="Suggest a free tool"/);
 assert.match(h,/<option>Suggest a free tool<\/option>/);
 assert.match(js,/getAttribute\('data-contact-reason'\)/);
 assert.match(js,/mailto:connect@yorphives\.com/);
 assert.match(h,/Nothing is uploaded by this form/);
});
