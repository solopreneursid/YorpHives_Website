import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const home=h=>h.split('<!-- HOME:')[1]?.split('<!-- TOOLS:')[0]||'';
const explore=h=>h.split('<!-- EXPLORE -->')[1]?.split('<!-- BUILDERS -->')[0]||'';

test('the public story is concise: HQ operates, AI researches, founder decides',async()=>{
 const html=await read('index.html');
 const h=home(html);
 assert.match(h,/Founder-led\.<br><span class="hero-intelligence">Intelligence-powered\.<\/span><br><em>Ideas in motion\.<\/em>/);
 assert.match(h,/HQ runs the AI engine/);
 assert.match(h,/The founder decides/);
 assert.match(h,/class="hero-ambient"/);
 assert.doesNotMatch(h,/class="hero-console"/);
 assert.match(h,/FOUNDER/);
 assert.match(h,/HQ operates/);
 assert.match(h,/AI investigates/);
 assert.match(h,/Founder decides/);
 const heroText=h.match(/<p class="hero-sub">([\s\S]*?)<\/p>/)?.[1].replace(/<[^>]+>/g,'');
 assert.ok(heroText&&heroText.length<95,'hero uses one short sentence, not copied founder exposition');
 assert.doesNotMatch(h,/short for YorpHives Headquarters|I'm developing|I am developing/i);
});
test('workforce is explained by a visual diagram, not a paragraph of role descriptions',async()=>{
 const h=home(await read('index.html'));
 assert.match(h,/id="our-ai-team"/);
 assert.match(h,/class="os-board"/);
 assert.match(h,/class="os-roles"/);
 for(const role of ['Research','Markets','Product','Growth','Quality','Learning'])
  assert.ok(h.includes(role),'missing AI employee label: '+role);
 assert.match(h,/class="os-decision"/);
 assert.match(h,/GO \/ NO-GO/);
 assert.match(h,/role="img"/);
});
test('five clear stages preserve the founder authorization gate',async()=>{
 const html=await read('index.html');
 const section=html.match(/<section class="journey-section shell"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section&&section.includes('id="how-it-works"'));
 for(const step of ['Discover','Research','Evaluate','Decide','Build'])
  assert.ok(section.includes('<h3>'+step+'</h3>'),step);
 assert.match(section,/founder-gate/);
 assert.match(section,/Approve or reject/);
 assert.match(html,/href="#how-it-works"/);
});
test('Explore connects published projects to HQ evidence and founder decisions',async()=>{
 const [html,js]=await Promise.all([read('index.html'),read('next.js')]);
 const section=explore(html);
 assert.match(section,/HQ researches\. I decide\. Approved projects go live\./);
 assert.match(section,/id="explore-process-title"/);
 assert.match(section,/class="explore-process-list"/);
 assert.match(section,/03 \/ FOUNDER/);
 assert.match(section,/Go \/ no-go/);
 assert.match(section,/id="projects-collection"/);
 assert.match(section,/Only founder-approved work makes it to Explore|Founder-approved launches only/i);
 assert.match(js,/qualifiedProducts\(published\)/);
 assert.doesNotMatch(section,/fabricated launched projects|external marketplace/i);
});
test('free tools and real public activity use seamless accessible motion',async()=>{
 const [html,css,phone,js]=await Promise.all([read('index.html'),read('next.css'),read('next-responsive.css'),read('next.js')]);
 assert.match(html,/id="category-ribbon-track"/);
 assert.match(html,/id="tool-category-rail"/);
 assert.match(html,/id="home-pulse-viewport"/);
 assert.doesNotMatch(html,/id="footer-pulse"/);
 assert.equal((html.match(/data-motion-toggle="categories"/g)||[]).length,2);
 assert.equal((html.match(/data-motion-toggle="pulse"/g)||[]).length,1);
 assert.match(css,/@keyframes rail-drift/);
 assert.match(css,/@keyframes pulse-scroll/);
 assert.match(css,/animation:rail-drift/);
 assert.match(css,/animation:pulse-scroll/);
 assert.match(js,/function renderRibbon\(\)/);
 assert.doesNotMatch(js,/function initPulse\(\)/);
 assert.doesNotMatch(html,/id="footer-pulse"/);
 assert.match(js,/aria-pressed/);
 assert.match(phone,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(phone,/animation:none!important/);
});
test('all main pages remain navigable and genuine work remains gated',async()=>{
 const h=await read('index.html');
 for(const id of ['home','tools','explore','builders','connect'])
  assert.ok(h.includes('id="'+id+'"'),id+' missing');
 for(const id of ['tool-search','tool-categories','tool-count','tool-prev','tool-next','tool-favorites'])
  assert.ok(h.includes('id="'+id+'"'),id+' missing');
 assert.match(h,/verified paid membership/);
 assert.match(h,/Enrollment is not open yet/);
 assert.match(h,/Nothing is uploaded by this form/);
 assert.doesNotMatch(h,/data-form="opportunity"|id="job-listings"/);
});
test('release gate verifies founder authorization and media-motion safeguards',async()=>{
 const check=await read('scripts/release-check.mjs');
 assert.match(check,/Founder-led/);
 assert.match(check,/HQ runs the AI engine/);
 assert.match(check,/hero-ambient/);
 assert.match(check,/@keyframes rail-drift/);
 assert.match(check,/@keyframes pulse-scroll/);
 assert.match(check,/Public job listing or job-posting form is forbidden/);
});
