import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
const builderBody=html=>html.split('<!-- BUILDERS -->')[1]?.split('<!-- CONNECT -->')[0]||'';

test('homepage Connect links to future Builders without inventing paid access',async()=>{
 const h=await read('index.html');
 const home=h.split('<!-- TOOLS:')[0];
 assert.match(home,/id="home-connect"/);
 assert.match(home,/href="#builders"/);
 assert.match(home,/Builders network · Coming soon/);
 assert.match(home,/href="#connect"/);
 assert.match(home,/class="connection-card connection-partner" href="#partners"/);
 assert.match(home,/Partner with us/);
 assert.doesNotMatch(home,/Pay now|Job available|Join membership now/i);
});
test('Partnerships has a visible independent destination and a non-application contact path',async()=>{
 const html=await read('index.html');
 const builders=builderBody(html);
 assert.match(builders,/href="#partners">Partnerships/);
 assert.match(builders,/class="partnership-section" id="partners"/);
 assert.match(builders,/href="#connect" data-contact-reason="Partnership"/);
 assert.match(html,/<option>Partnership<\/option>/);
 const [css,mobile]=await Promise.all([read('next.css'),read('next-responsive.css')]);
 assert.match(css,/\.partnership-layout\{display:grid/);
 assert.match(mobile,/\.partnership-layout\{grid-template-columns:1fr/);
});
test('private opportunity listings and posting are not publicly accessible',async()=>{
  const html=builderBody(await read('index.html'));
  for(const id of ['opportunities','membership','partners'])
    assert.ok(html.includes('id="'+id+'"'),id+' section missing');
  assert.match(html,/future paid network/i);
  assert.match(html,/Jobs and posting require verified paid membership/);
  assert.match(html,/No job listing or posting is available to the public/);
  assert.match(html,/No jobs, applicant details, or paid-member content are published/);
  assert.doesNotMatch(html,/<form\b|<input\b|<textarea\b|<select\b/);
  assert.doesNotMatch(html,/Pay now|Buy now|checkout|Subscription active/i);
});
test('communities and partner review rules remain discoverable',async()=>{
  const html=builderBody(await read('index.html'));
  for(const word of ['Developers','Creators','Individuals','Businesses','Schools','colleges','Companies','Government organizations','Builder partner'])
    assert.match(html,new RegExp(word,'i'));
  assert.match(html,/id="partners" aria-labelledby="partnership-title"/);
  assert.match(html,/Build something/);
  assert.match(html,/Co-build products/);
  assert.match(html,/Grow together/);
  assert.match(html,/Research & innovate/);
  assert.match(html,/Formal applications are not open yet/);
  assert.match(html,/Contact is for an initial discussion, not an application or approval/);
  assert.match(html,/subject to founder review, trust and membership status/i);
});
test('no artificial membership pricing or enrollment/payment workflows',async()=>{
  const html=builderBody(await read('index.html'));
  assert.match(html,/Pricing and enrollment not yet available/);
  assert.match(html,/Enrollment is not open yet/);
  assert.doesNotMatch(html,/stripe|checkout|Buy now|Pay now|Payment successful|Subscription active/i);
});
test('legacy #post link resolves only to membership explanation',async()=>{
  const js=await read('next.js');
  assert.match(js,/subpages\.has\(hash\)/);
  assert.match(js,/hash==='post'\?'membership':hash/);
  assert.doesNotMatch(js,/data-form="opportunity"|Paid opportunity for YorpHives/);
  assert.match(js,/Project enquiry for YorpHives/);
});
test('Builders interface reflows on mobile and honors reduced motion',async()=>{
  const [css,mobile]=await Promise.all([read('next.css'),read('next-responsive.css')]);
  assert.match(css,/\.membership-grid\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(mobile,/\.membership-grid\{grid-template-columns:1fr/);
  assert.match(mobile,/@media\(prefers-reduced-motion:reduce\)/);
});
test('release gate still prohibits public job posting forms',async()=>{
  const release=await read('scripts/release-check.mjs');
  assert.match(release,/Public job listing or job-posting form is forbidden/);
  assert.match(release,/data-form="opportunity"/);
});

test('Builders clearly separates two roles without pretending enrollment is live',async()=>{
 const html=builderBody(await read('index.html'));
 assert.match(html,/id="builders-paths-title"/);
 assert.match(html,/01 \/ FIND WORK/);
 assert.match(html,/02 \/ HIRE BUILDERS/);
 assert.match(html,/How membership will work/);
 assert.match(html,/Both sides need confirmed, active paid access/);
 assert.match(html,/No payment or application is being accepted/);
 assert.match(html,/Contact is not enrollment/);
 assert.match(html,/id="builders-how-it-works"/);
 assert.equal((html.match(/class="member-action"/g)||[]).length,2);
 assert.doesNotMatch(html,/<form\b|<input\b|<textarea\b|<select\b/);
 const [css,mobile]=await Promise.all([read('next.css'),read('next-responsive.css')]);
 assert.match(css,/\.builders-journey-grid\{display:grid/);
 assert.match(css,/\.member-action\{display:inline-flex/);
 assert.match(mobile,/\.builders-journey-grid\{grid-template-columns:1fr/);
});
