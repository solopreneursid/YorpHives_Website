import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PORTRAIT_INFO,PORTRAIT_SIZE,preparePortraitTensor,normalizePortraitMask} from '../tools/background-portrait-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('Optional Apache-2.0 portrait model is verified and under the free static asset budget',async()=>{
 assert.equal(PORTRAIT_INFO.license,'Apache-2.0');
 assert.ok(PORTRAIT_INFO.maxBytes<8.1e6);
 const buffer=await readFile(resolve(root,'dist/tools/models',PORTRAIT_INFO.filename));
 assert.ok(buffer.byteLength>=PORTRAIT_INFO.minBytes&&buffer.byteLength<=PORTRAIT_INFO.maxBytes);
 assert.equal(createHash('sha256').update(buffer).digest('hex'),PORTRAIT_INFO.sha256);
 assert.ok((await readFile(resolve(root,'dist/tools/models/modnet-APACHE-2.0-LICENSE.txt'),'utf8')).includes('Apache License'));
});
test('Portrait preprocessing uses exact 512px RGB CHW normalization [-1,1]',()=>{
 const p=new Uint8ClampedArray(PORTRAIT_SIZE*PORTRAIT_SIZE*4);
 for(let i=0;i<p.length;i+=4){p[i]=255;p[i+1]=128;p[i+2]=0;p[i+3]=255;}
 const tensor=preparePortraitTensor(p);
 const n=PORTRAIT_SIZE*PORTRAIT_SIZE;
 assert.equal(tensor.length,n*3);assert.ok(Math.abs(tensor[0]-1)<1e-6);
 assert.ok(Math.abs(tensor[n]-(2*128/255-1))<1e-5);
 assert.ok(Math.abs(tensor[2*n]+1)<1e-6);
 assert.throws(()=>preparePortraitTensor(new Uint8Array(5)),/512×512/);
});
test('Portrait output alpha is not stretched or converted from valid 0..1 matte',()=>{
 const data=new Float32Array(PORTRAIT_SIZE*PORTRAIT_SIZE).fill(.31);data[0]=.9;data[1]=.01;
 const mask=normalizePortraitMask(data);assert.equal(mask.length,data.length);
 assert.ok(Math.abs(mask[0]-.9)<1e-4);assert.ok(Math.abs(mask[2]-.31)<1e-4);
 assert.throws(()=>normalizePortraitMask(new Float32Array(3)),/size/);
 data[3]=NaN;assert.throws(()=>normalizePortraitMask(data),/invalid alpha/);
});
test('Two free models do not introduce billed server execution, API keys or remote inference',async()=>{
 const files=['tools/background-removal-core.mjs','tools/background-portrait-core.mjs','tools/background-removal-page.mjs'];
 for(const f of files){
  const source=await readFile(resolve(root,f),'utf8');
  assert.doesNotMatch(source,/https:\/\/|XMLHttpRequest|sendBeacon|apiKey|billing|workers-ai|@cloudflare\/ai/i);
 }
 const modelSrc=await readFile(resolve(root,'scripts/copy-portrait-model.mjs'),'utf8');
 assert.match(modelSrc,/SHA-256|sha256/);assert.match(modelSrc,/MODEL\.sha256/);
 const staticallyHosted=await stat(resolve(root,'dist/tools/models',PORTRAIT_INFO.filename));
 assert.ok(staticallyHosted.size<8e6);
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 assert.equal(catalog.items.filter(x=>x.type==='tool').length,144);
 assert.equal(catalog.items.filter(x=>x.url==='tools/ai-background-remover/').length,1);
});
test('The noindex portrait benchmark must be absent from public production builds',async()=>{
 const headers=await readFile(resolve(root,'dist/_headers'),'utf8');
 const preview=headers.includes('X-Robots-Tag: noindex');
 const qa=await stat(resolve(root,'dist/portrait-model-qa.mjs')).then(()=>true).catch(()=>false);
 assert.equal(qa,preview);
});
