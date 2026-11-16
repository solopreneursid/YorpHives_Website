import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFile(resolve(root,path),'utf8');
const builderBody=html=>html.split('<!-- BUILDERS -->')[1]?.split('<!-- CONNECT -->')[0]||'';

test('new homepage clearly introduces the Builders paid-membership concept',async()=>{
  const h=await read('index.html');
  assert.match(h,/id="builders-home-title"/);
  assert.match(h,/Find work\. Post work/);
  assert.match(h,/Build together/);
  assert.match(h,/verified paid membership/i);
  assert.match(h,/href="#builders"/);
  assert.doesNotMatch(h,/data-form="opportunity"|class="job-listing"/);
});
test('private opportunity listings and posting are not publicly accessible',async()=>{
  const html=builderBody(await read('index.html'));
  for(const id of ['opportunities','membership','partners'])
    assert.ok(html.includes('id="'+id+'"'),id+' section missing');
  assert.match(html,/private paid network/i);
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
  assert.match(html,/Partner selection will be review-based/);
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
