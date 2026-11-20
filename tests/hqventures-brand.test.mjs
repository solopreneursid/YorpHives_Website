import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(resolve(root,p),'utf8');

test('HQventures is the public product-studio name across homepage, directory and tool navigation',async()=>{
 const [html,js,dir,shell]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),
  read('tools/index.html'),read('scripts/next-tool-shell.mjs')
 ]);
 assert.match(html,/<a href="#ventures" data-nav="ventures">HQventures<\/a>/);
 assert.match(html,/id="ventures"/);
 assert.match(html,/class="ecosystem-card ecosystem-ventures"/);
 assert.match(html,/HQVENTURES \/ OUR FLAGSHIP STUDIO/);
 assert.match(js,/explore:'ventures'/);
 assert.match(dir,/href="\.\.\/#ventures">HQventures/);
 assert.match(shell,/href="\.\.\/\.\.\/#ventures">HQventures/);
 assert.doesNotMatch(html,/data-nav="builders"|href="#builders"/);
});
test("public studio language keeps founder approval explicit",async()=>{
 const html=await read('reimagined/index.html');
 assert.match(html,/by yorphivesHQ - AI powered venture studio/);
 assert.match(html,/founder approves what gets built and released/i);
 assert.match(html,/Products appear here only after research review and founder approval/);
 assert.match(html,/Founder review is mandatory/);
 assert.match(html,/Only founder-approved, verified launches appear here/);
});
test('the venture count is tied to qualified public releases, not ideas or drafts',async()=>{
 const [html,js,policy]=await Promise.all([
  read('reimagined/index.html'),read('reimagined/studio.js'),read('product-policy.mjs')
 ]);
 assert.doesNotMatch(html,/id="home-venture-count"/);
 assert.match(html,/id="venture-hero-count"/);
 assert.match(js,/heroCount\.textContent=number\(ventures\.length\)/);
 assert.match(html,/id="venture-total"/);
 assert.match(js,/ventures=qualifiedProducts\(allItems\)/);
 assert.match(js,/number\(ventures\.length\)/);
 assert.match(policy,/founderApproval/);
});
