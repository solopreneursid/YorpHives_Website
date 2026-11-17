import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve('dist');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('every published offering has a static Markdown companion and WebMCP fallback',()=>{
 const {items}=JSON.parse(read('catalog.json'));
 assert.ok(items.length>=140);
 const allowed=new Set(['word_count','slugify','case_convert','percentage','discount']);
 let mdCount=0,toolPages=0;
 for(const item of items){
  const path=item.url.endsWith('/')?item.url+'index.md':item.url.replace(/\.html$/,'.md');
  const htmlPath=item.url.endsWith('/')?item.url+'index.html':item.url;
  const md=read(path),html=read(htmlPath);
  assert.ok(md.startsWith('# '+item.name+'\n\n'),path);
  assert.ok(md.includes('Canonical page: https://yorphives.com/'+item.url),path);
  assert.ok(md.includes('Machine-readable catalog: /catalog.json'),path);
  assert.ok(md.includes('Do not submit private files or credentials'),path);
  assert.match(html,/agentic-browser\.mjs/);
  const match=md.match(/Remote stateless utility: \/api\/agent\/v1\/tools\/([^/]+)\/invoke/);
  if(match){assert.ok(allowed.has(match[1]));toolPages++}
  mdCount++;
 }
 assert.equal(mdCount,items.length);
 assert.equal(toolPages,5,'Only five explicitly approved browser-local utility pages may advertise edge execution');
});
test('generated discoverability is accurate, bounded and never invents paid access',()=>{
 const d=JSON.parse(read('.well-known/agentic.json'));
 assert.equal(d.callableTools,'/api/agent/v1/tools');
 assert.equal(d.paymentAvailable,false);
 assert.equal(d.requiresFounderApproval,true);
 const txt=read('llms.txt');
 assert.ok(txt.includes('Five vetted, stateless utility operations'));
 assert.ok(txt.includes('index.md'));
 const browser=read('agentic-browser.mjs');
 assert.match(browser,/import .*\.\/agentic-tools\.mjs/);
 const tools=read('agentic-tools.mjs');
 assert.match(tools,/PUBLIC_TOOLS/);
});
