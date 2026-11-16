import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('all seven reimagined pages share a visible, genuinely disabled Ko-fi support control',async()=>{
 const [html,css]=await Promise.all([read('reimagined/index.html'),read('reimagined/studio.css')]);
 const header=html.match(/<header class="topbar"[^>]*>([\s\S]*?)<\/header>/)?.[1];
 assert.ok(header,'shared topbar must exist');
 const match=header.match(/<button class="kofi-support"[^>]*>[^]*?<\/button>/);
 assert.ok(match,'support CTA must be in shared topbar, not buried in footer');
 assert.match(match[0],/type="button" disabled/);
 assert.match(match[0],/Ko-fi/);
 assert.match(match[0],/Support us/);
 assert.match(match[0],/donations coming soon/);
 assert.doesNotMatch(match[0],/<a\b|href=|onclick=|https?:\/\//);
 for(const id of ['home','ventures','builders','impact','tools','partners','contact'])
  assert.match(html,new RegExp('<section class="view" id="'+id+'"'),id);
 assert.match(css,/\.kofi-support:disabled\{opacity:1;cursor:not-allowed\}/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
});

test('every public tool and directory builds with a disabled, readable Ko-fi button',async()=>{
 const [build,toolCss,dirCss,catalog]=await Promise.all([
  read('scripts/build-site.mjs'),read('tools/tool-next.css'),
  read('tools/directory-next.css'),read('catalog.json')
 ]);
 assert.match(build,/const action='<button class="header-kofi tool-kofi" type="button" disabled/);
 assert.match(build,/<strong>Ko-fi<\/strong><small>Support us<\/small>/);
 assert.match(build,/html=injectSiteSupport\(html,path\)/);
 assert.doesNotMatch(toolCss,/body\.tool-page \.header-kofi\{display:none!important\}/);
 assert.doesNotMatch(dirCss,/\.header-kofi\{display:none!important\}/);
 assert.match(toolCss,/\.site-header \.header-kofi:disabled\{opacity:1/);
 assert.match(dirCss,/\.site-header \.header-kofi:disabled\{opacity:1/);
 const dist=resolve(root,'dist');
 if(!(await stat(resolve(dist,'tools/word-counter/index.html')).then(s=>s.isFile()).catch(()=>false)))return;
 const published=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 for(const item of published){
  const doc=await readFile(resolve(dist,item.url+'index.html'),'utf8');
  const btn=doc.match(/<button class="header-kofi tool-kofi"[^>]*>[^]*?<\/button>/)?.[0];
  assert.ok(btn,item.url+' missing future support CTA');
  assert.match(btn,/type="button" disabled/);
  assert.match(btn,/Support us/);
  assert.doesNotMatch(btn,/href=|onclick=|https?:\/\//);
 }
 const directory=await readFile(resolve(dist,'tools/index.html'),'utf8');
 assert.match(directory,/class="header-kofi tool-kofi" type="button" disabled/);
});
