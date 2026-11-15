import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const load=path=>readFile(resolve(root,path),'utf8');

test('homepage replaces generic services with Builders paid membership',async()=>{
 const h=await load('index.html');
 const page=h.match(/<section class="page" id="home"[\s\S]*?(?=<section class="page" id="tools")/)?.[0]||h;
 assert.match(page,/id="builders-home-title"/);
 assert.match(page,/Find work\. Post work/);
 assert.match(page,/Build together/);
 assert.match(page,/Builders is a paid community|BUILDERS \/ PRIVATE MEMBERSHIP/);
 assert.match(page,/Find paid work/);
 assert.match(page,/Post a job or project/);
 assert.match(page,/Builder Partners/);
 assert.match(page,/Paid enrollment is being prepared/);
 assert.match(page,/href="#builders"/);
 assert.doesNotMatch(page,/WHAT WE EXPLORE|service-card|Thoughtful technology/);
});
test('Builders landing is accessible as information, while private jobs and posting remain inaccessible',async()=>{
 const h=await load('index.html');
 const b=h.slice(h.indexOf('<section class="page" id="builders"'),h.indexOf('<section class="page" id="connect"'));
 assert.match(b,/id="membership"/);
 assert.match(b,/id="partners"/);
 assert.match(b,/id="opportunities"/);
 assert.match(b,/private paid network/i);
 assert.match(b,/verified paid membership/i);
 assert.match(b,/Enrollment is not open yet/);
 assert.match(b,/No jobs, applicant details, or paid-member content are published/);
 assert.doesNotMatch(b,/<form\b|<input\b|<textarea\b|<select\b/);
 assert.doesNotMatch(b,/\bdata-form="opportunity"\b|id="post"|class="job-listing"/);
 assert.doesNotMatch(b,/Pay amount and currency|Prepare email|Share a job or project/);
});
test('Visitor-facing copy includes diverse communities and review-based Builder Partners',async()=>{
 const h=await load('index.html');
 for(const phrase of ['Developers','Creators','Individuals','Businesses','Schools','colleges','Companies','Government organizations','Builder Partner']){
  assert.ok(h.includes(phrase),phrase+' missing');
 }
 assert.match(h,/Priority consideration for suitable opportunities/);
 assert.match(h,/Subject to founder review, trust and membership status/);
 assert.match(h,/Partner selection will be review-based/);
});
test('Membership pricing and payment buttons are not faked until the back end is ready',async()=>{
 const h=await load('index.html');
 const b=h.slice(h.indexOf('<section class="page" id="builders"'),h.indexOf('<section class="page" id="connect"'));
 assert.match(b,/Pricing and enrollment not yet available/);
 assert.match(b,/No job listing or posting is available to the public/);
 assert.doesNotMatch(b,/stripe|checkout|Buy now|Pay now|Payment successful|Subscription active/i);
});
test('Legacy /#post deep link resolves to locked membership explanation, never a posting form',async()=>{
 const js=await load('app.js');
 assert.match(js,/\['post', 'opportunities', 'membership', 'partners'\]\.includes\(hash\)/);
 assert.match(js,/section === 'post' \? 'membership' : section/);
 assert.doesNotMatch(js,/Paid opportunity for YorpHives/);
 assert.match(js,/const subject = 'Project enquiry for YorpHives'/);
});
test('Mobile Builders layouts and reduced-motion preferences have explicit rules',async()=>{
 const css=await load('style.css');
 assert.match(css,/#home \.builders-home-grid\{[^}]*grid-template-columns:repeat\(3/);
 assert.match(css,/#builders \.builders-membership-options\{display:grid/);
 assert.match(css,/@media\(max-width:570px\)\{/);
 assert.match(css,/#home \.builders-home-grid\{grid-template-columns:1fr/);
 assert.match(css,/#builders \.builders-member-two,#builders \.builders-membership-options\{grid-template-columns:1fr/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Release gate prevents reintroducing public jobs and opportunitity forms',async()=>{
 const release=await load('scripts/release-check.mjs');
 assert.match(release,/Public job listing or job-posting form is forbidden/);
 assert.match(release,/data-form="opportunity"/);
});

test('Builders homepage uses dark forest teal with readable mint-on-dark cards',async()=>{
 const css=await load('style.css');
 assert.match(css,/#home \.builders-home\{[^}]*#0b303a,#103f41 55%,#092f3a/);
 assert.match(css,/#home \.builders-home h2\{[^}]*color:#f4fff9/);
 assert.match(css,/#home \.builders-home h2 em\{[^}]*color:#9dfadd/);
 assert.match(css,/#home \.builders-home-card\{[^}]*#175358,#10424d/);
 assert.match(css,/#home \.builders-home-card h3\{[^}]*color:#f4fff9/);
 assert.match(css,/#home \.builders-home-cta\{[^}]*#b4ffe9,#80eed4/);
});
