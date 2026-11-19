import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');
const home=h=>h.split('<!-- TOOLS:')[0];
const explore=h=>h.split('<!-- EXPLORE -->')[1]?.split('<!-- BUILDERS -->')[0]||'';

test('three large homepage experiences replace repeated HQ explanations',async()=>{
 const html=await read('index.html'),h=home(html);
 const ids=['home-explore','home-use','home-connect'];
 for(const id of ids)assert.ok(h.includes('id="'+id+'"'),'missing '+id);
 assert.ok(h.indexOf('id="home-explore"')<h.indexOf('id="home-use"'));
 assert.ok(h.indexOf('id="home-use"')<h.indexOf('id="home-connect"'));
 for(const old of ['entry-section','os-section','journey-section','spotlight-section','builders-teaser','cta-banner'])
  assert.ok(!h.includes('class="'+old),'obsolete repeating section '+old);
 assert.match(h,/Discover<br><em>what's next\.<\/em>/);
 assert.match(h,/Useful tools\.<br><em>Ready now\.<\/em>/);
 assert.match(h,/Good things<br><em>happen together\.<\/em>/);
});
test('a geometric logo-inspired background supports a concise founder-led hero',async()=>{
 const [html,css]=await Promise.all([read('index.html'),read('home-experience.css')]);
 const h=home(html);
 assert.match(h,/Founder-led\.<br><span class="hero-intelligence">Intelligence-powered\.<\/span><br><em>Ideas in motion\.<\/em>/);
 assert.match(h,/HQ discovers\. AI evaluates\. <strong>Founder decides\.<\/strong>/);
 assert.match(h,/class="hero-identity-mark"/);
 assert.match(h,/class="hero-geometry"/);
 assert.match(h,/id="our-ai-team"/);
 assert.doesNotMatch(h,/class="hero-console"|class="os-board"|class="spotlight-panel"/);
 assert.match(css,/@keyframes hero-logo-float/);
 assert.match(css,/@keyframes hero-circuit-flow/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const heroText=h.match(/<p class="hero-sub">([\s\S]*?)<\/p>/)?.[1].replace(/<[^>]+>/g,'');
 assert.ok(heroText&&heroText.length<80);
});
test("Explore’s featured project comes from founder-qualified data, not unapproved launch claims",async()=>{
 const [html,js]=await Promise.all([read('index.html'),read('next.js')]);
 const h=home(html),page=explore(html);
 assert.match(h,/id="home-featured"/);
 assert.match(h,/APPROVAL REQUIRED/);
 assert.match(h,/Nothing is published without founder approval/);
 assert.match(h,/class="stage-founder"/);
 assert.match(h,/id="how-it-works"/);
 assert.match(page,/Founder-approved launches only/);
 assert.match(page,/id="projects-collection"/);
 assert.match(js,/qualifiedProducts\(published\)/);
 assert.match(js,/showProducts\(approved\)/);
 assert.match(js,/renderFeaturedProject\(approved\)/);
 assert.match(js,/stage\.textContent='APPROVAL REQUIRED'/);
});
test('Use has a real search form, actual catalog-backed tools and animated categories',async()=>{
 const [html,js,css]=await Promise.all([read('index.html'),read('next.js'),read('home-experience.css')]);
 const h=home(html);
 assert.match(h,/id="home-tool-search-form"/);
 assert.match(h,/id="home-tool-search"/);
 assert.match(h,/id="home-tools-list"/);
 assert.match(h,/id="category-ribbon-track"/);
 assert.match(js,/function renderHomeTools\(items\)/);
 assert.match(js,/renderHomeTools\(allTools\)/);
 assert.match(js,/search\.dispatchEvent\(new Event\('input'/);
 assert.match(js,/function renderRibbon\(\)/);
 assert.match(css,/scroll-snap-type:x mandatory/);
});
test('Connect directs visitors to the independent Partnerships page without a Builders page',async()=>{
 const html=await read('reimagined/index.html');
 const home=html.split('<!-- VENTURES -->')[0];
 assert.match(home,/class="home-cta"/);
 assert.match(home,/href="#partners"/);
 assert.match(html,/id="partners"/);
 assert.doesNotMatch(html,/id="builders"|href="#builders"|data-nav="builders"|Builders/);
});
test('one verified YHpulse appears and moving elements have pause and reduced-motion support',async()=>{
 const [html,css,base,js]=await Promise.all([read('index.html'),read('home-experience.css'),read('next.css'),read('next.js')]);
 assert.equal((html.match(/id="home-pulse-viewport"/g)||[]).length,1);
 assert.doesNotMatch(html,/id="footer-pulse"/);
 assert.equal((html.match(/data-motion-toggle="categories"/g)||[]).length,2);
 assert.equal((html.match(/data-motion-toggle="pulse"/g)||[]).length,1);
 assert.match(base,/@keyframes rail-drift/);
 assert.match(base,/@keyframes pulse-scroll/);
 assert.match(css,/@keyframes connection-circuit/);
 assert.match(js,/aria-pressed/);
 assert.doesNotMatch(js,/function initPulse\(\)/);
});
test('navigation and safeguards cover the five public pages and human decision gate',async()=>{
 const html=await read('reimagined/index.html'),js=await read('reimagined/studio.js');
 for(const id of ['home','ventures','tools','partners','contact'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.doesNotMatch(html,/id="builders"|href="#builders"|data-nav="builders"|Builders/);
 assert.match(js,/retiredRoutes/);
 assert.ok(js.includes('history.replaceState'));
 assert.match(html,/id="kofi-support"/);
 assert.match(html,/type="button" disabled/);
 assert.match(html,/href="#partners"/);
});
test('release gate enforces three experiences, the qualified showcase and single public pulse',async()=>{
 const release=await read('scripts/release-check.mjs');
 assert.match(release,/home-explore/);
 assert.match(release,/home-use/);
 assert.match(release,/home-connect/);
 assert.match(release,/class="hero-geometry"/);
 assert.match(release,/renderFeaturedProject/);
 assert.match(release,/YHpulse must appear exactly once/);
 assert.match(release,/Public job listing or job-posting form is forbidden/);
});
