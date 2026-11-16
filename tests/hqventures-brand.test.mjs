import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('HQventures is the public project name, preserving old hash URLs',async()=>{
 const [html,js,dir,shell]=await Promise.all([
  read('index.html'),read('next.js'),read('tools/index.html'),read('scripts/next-tool-shell.mjs')
 ]);
 assert.match(html,/<a href="#explore" data-nav="explore">HQventures<\/a>/);
 assert.match(html,/<a href="#explore" data-nav="explore">HQventures <span>03<\/span><\/a>/);
 assert.match(html,/id="explore" aria-label="HQventures projects"/);
 assert.match(html,/HQVENTURES \/ FOUNDER-APPROVED PROJECTS/);
 assert.match(html,/FROM HQ TO HQVENTURES/);
 assert.match(html,/— HQVENTURES/);
 assert.match(html,/href="#explore">View HQventures/);
 assert.match(html,/href="#explore" data-nav="explore"><span class="dock-icon"[^>]*>◇<\/span><span>HQventures<\/span>/);
 assert.match(js,/explore:'HQventures'/);
 assert.match(dir,/href="\.\.\/#explore">HQventures/);
 assert.match(shell,/href="\.\.\/\.\.\/#explore">HQventures/);
 assert.doesNotMatch(html,/data-nav="explore">Explore/);
 assert.doesNotMatch(dir,/href="\.\.\/#explore">Explore/);
 assert.doesNotMatch(shell,/href="\.\.\/\.\.\/#explore">Explore/);
});

test('AI-powered venture studio language is concise and accurately placed',async()=>{
 const html=await read('index.html');
 assert.match(html,/<meta name="description" content="YorpHives is an AI-powered venture studio/);
 assert.match(html,/<span class="status-dot"><\/span> AI-POWERED VENTURE STUDIO/);
 assert.match(html,/An AI-powered venture studio\.<br>Ideas in motion/);
 assert.match(html,/Founder-approved launches only/);
 assert.match(html,/HQ discovers\. AI evaluates\. <strong>Founder decides\.<\/strong>/);
});

test('the generated A–Z directory and direct-tool UI also show HQventures',async()=>{
 const [dir,tool]=await Promise.all([
  read('dist/tools/index.html'),read('dist/tools/word-counter/index.html')
 ]);
 assert.match(dir,/href="\.\.\/#explore">HQventures/);
 assert.match(tool,/href="\.\.\/\.\.\/#explore">HQventures/);
 assert.doesNotMatch(tool,/href="\.\.\/\.\.\/#explore">Explore/);
});
