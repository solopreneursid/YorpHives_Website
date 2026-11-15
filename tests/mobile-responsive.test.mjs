import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('viewport scales properly and does not disable device zoom',async()=>{
 const html=await read('index.html');
 assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/i);
});

test('narrow-phone hero has visible swipe guidance before the five-stage rail',async()=>{
 const [css,html]=await Promise.all([read('style.css'),read('index.html')]);
 assert.match(html,/<ol class="studio-steps" id="studio-steps"/);
 assert.match(html,/<p class="studio-swipe">Swipe to see every step/);
 assert.match(css,/#home \.studio-swipe\{\s*top:8px/);
 assert.match(css,/#home \.studio-steps\{\s*inset:39px 0 auto/);
 assert.match(css,/scroll-padding-left:6%;-webkit-overflow-scrolling:touch/);
});

test('smallest common phones do not strand the hero headline or squeeze navigation',async()=>{
 const css=await read('style.css');
 assert.match(css,/@media\(max-width:420px\)\{/);
 assert.match(css,/#home \.studio-hero h1\{font-size:clamp\(31px,8\.9vw,35px\)/);
 assert.match(css,/@media\(max-width:350px\)\{/);
 assert.match(css,/\.site-header \.header-kofi\{display:none\}/);
});

test('evaluation checks reflow into readable one-column cards on narrow phones',async()=>{
 const css=await read('style.css');
 assert.match(css,/#home \.explore-eval-grid\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/#home \.explore-eval-card strong\{font-size:14px/);
 assert.match(css,/#home \.explore-eval-card small\{font-size:11px/);
 assert.match(css,/#home \.home-feature-widget \.explore-feature-empty small\{font-size:11px/);
});

test('mobile tools remain fully usable and names are readable',async()=>{
 const css=await read('style.css');
 assert.match(css,/#tools \.launcher-tool-link strong\{white-space:normal;overflow-wrap:anywhere/);
 assert.match(css,/#tools \.launcher-search-shell input\{font-size:16px\}/);
 assert.match(css,/#tools \.launcher-mobile-tile\{min-height:61px\}/);
 assert.match(css,/#home \.category-ribbon-pill\{min-height:44px\}/);
});

test('footer activity uses full phone width with accessible readable update labels',async()=>{
 const css=await read('style.css');
 assert.match(css,/\.site-footer \.footer-pulse\{grid-template-columns:minmax\(0,1fr\);gap:8px/);
 assert.match(css,/\.site-footer \.pulse-item\{min-height:44px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('production assets retain responsive fixes after static build',async()=>{
 const css=await read('dist/style.css');
 assert.match(css,/Mobile usability audit/);
 assert.match(css,/#home \.studio-swipe\{\s*top:8px/);
 assert.match(css,/#home \.explore-eval-grid\{grid-template-columns:minmax\(0,1fr\)/);
});
