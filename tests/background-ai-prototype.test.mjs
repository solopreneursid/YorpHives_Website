import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MODEL_INFO,maskAlpha,prepareU2NetTensor,normalizeSaliency,segmentImage,renderTransparentPng} from '../tools/background-removal-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('Pinned U2Netp model is Apache-2.0 and build delivers identical vetted weights',async()=>{
 assert.equal(MODEL_INFO.sha256,'309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8');
 assert.equal(MODEL_INFO.bytes,4574861);assert.equal(MODEL_INFO.license,'Apache-2.0');
 const bytes=await readFile(resolve(root,'dist/tools/models',MODEL_INFO.file));
 assert.equal(bytes.length,MODEL_INFO.bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),MODEL_INFO.sha256);
 const license=await readFile(resolve(root,'dist/tools/models/u2netp-APACHE-2.0-LICENSE.txt'),'utf8');
 assert.match(license,/Apache License/);
});
test('Exact-version WASM engine is shipped locally and does not call remote APIs',async()=>{
 for(const name of ['ort.wasm.bundle.min.mjs','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm']){
  const f=await stat(resolve(root,'dist/tools/vendor/onnxruntime',name));
  assert.ok(f.size>1000,name);
 }
 const source=await readFile(resolve(root,'tools/background-removal-core.mjs'),'utf8');
 assert.match(source,/executionProviders:\['wasm'\]/);
 assert.doesNotMatch(source,/https:\/\/|navigator\.sendBeacon|XMLHttpRequest/);
});
test('320×320 ImageNet input has CHW channel normalization and alpha compositing',()=>{
 const rgba=new Uint8ClampedArray(320*320*4);
 for(let i=0;i<rgba.length;i+=4){rgba[i]=255;rgba[i+1]=0;rgba[i+2]=0;rgba[i+3]=255;}
 const t=prepareU2NetTensor(rgba);
 assert.equal(t.length,320*320*3);
 assert.ok(Math.abs(t[0]-(1-.485)/.229)<.0001);
 assert.ok(Math.abs(t[320*320]-(0-.456)/.224)<.0001);
 assert.throws(()=>prepareU2NetTensor(new Uint8Array(12)),/320×320/);
 assert.ok(maskAlpha(.2)<maskAlpha(.5));assert.ok(maskAlpha(.5)<maskAlpha(.8));
 assert.equal(maskAlpha(0),0);assert.equal(maskAlpha(1),1);
 assert.throws(()=>maskAlpha(.4,{cutoff:2}),/12–88/);
});
test('Saliency normalization fails closed on invalid, constant, or malicious outputs',()=>{
 const mock=new Float32Array(320*320).fill(-4);mock[0]=4;mock[5]=-2;
 const mask=normalizeSaliency(mock);
 assert.equal(mask[0],1);assert.equal(mask[1],0);assert.equal(mask[5],.25);
 assert.throws(()=>normalizeSaliency(new Float32Array(3)),/unexpected/);
 assert.throws(()=>normalizeSaliency(new Float32Array(320*320)),/distinct/);
 const bad=new Float32Array(mock);bad[13]=NaN;
 assert.throws(()=>normalizeSaliency(bad),/invalid values/);
});
test('Invalid images and nonexistent output cannot be passed through inference',async()=>{
 await assert.rejects(()=>segmentImage(new Blob([])),/JPG, PNG or WebP/);
 await assert.rejects(()=>segmentImage(new Blob(['not a photograph'.repeat(15)])),/valid JPG, PNG or WebP/);
 await assert.rejects(()=>renderTransparentPng(null),/First select and segment/);
});
test('Preview-only real inference benchmark is excluded from production builds',async()=>{
 const hdr=await readFile(resolve(root,'dist/_headers'),'utf8');
 const preview=hdr.includes('X-Robots-Tag: noindex');
 const qa=await stat(resolve(root,'dist/ai-background-prototype-qa.mjs')).then(()=>true).catch(()=>false);
 assert.equal(qa,preview);
 const html=await readFile(resolve(root,'dist/tools/image-publishing-pack/index.html'),'utf8');
 assert.equal(html.includes('ai-background-prototype-qa.mjs'),preview);
});
