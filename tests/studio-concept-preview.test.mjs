import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFile(resolve(root,file),'utf8');

test('standalone preview has five functional destinations and a clearly visible preview label',async()=>{
 const h=await read('concept/index.html');
 for(const id of ['home','tools','hqventures','builders','contact','partners','membership'])assert.ok(h.includes('id="'+id+'"'),id);
 assert.match(h,/DESIGN CONCEPT/);assert.match(h,/NOT LIVE/);
 assert.match(h,/<meta name="robots" content="noindex,nofollow"/);
 assert.match(h,/AI-powered venture studio/);
 assert.match(h,/Founder-led/);
 assert.match(h,/id="home-tool-list"/);
 assert.match(h,/id="tool-results"/);
 assert.match(h,/id="approved-ventures"/);
 assert.match(h,/id="pulse-window"/);
 assert.match(h,/id="contact-form"/);
});
test('preview assets are first-party, avoid new SaaS and do not invent partnerships or launches',async()=>{
 const [h,js,css,build]=await Promise.all([read('concept/index.html'),read('concept/studio.js'),read('concept/studio.css'),read('scripts/build-site.mjs')]);
 assert.doesNotMatch(h,/<script[^>]+src="https?:/);
 assert.doesNotMatch(h,/<link[^>]+href="https?:/);
 assert.match(h,/Nothing is uploaded or submitted by this form/);
 assert.match(h,/Applications aren't open/);
 assert.match(h,/No projects are listed before approval and release/);
 assert.match(js,/qualifiedProducts\(published\)/);
 assert.match(js,/mailto:connect@yorphives\.com/);
 assert.match(js,/fetch\('\.\.\/catalog\.json'/);
 assert.match(js,/fetch\('\.\.\/activity\.json'/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(build,/if\(target==='preview'\)[\s\S]*?cp\(resolve\(root,'concept'\)/);
});
test('mobile and keyboard affordances exist',async()=>{
 const [h,css,js]=await Promise.all([read('concept/index.html'),read('concept/studio.css'),read('concept/studio.js')]);
 assert.match(h,/class="mobile-dock"/);
 assert.match(h,/id="menu-toggle" aria-expanded="false"/);
 assert.match(h,/aria-live="polite"/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(js,/window\.addEventListener\('hashchange',route\)/);
 assert.match(js,/aria-pressed/);
});
