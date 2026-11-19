import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile,stat}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{GIFEncoder,quantize,applyPalette}from'../dist/tools/vendor/gifenc/index.js';
import{validateScanCorners,solveProjective,projectPoint}from'../tools/wave6-scanner-core.mjs';
import{encodeHex,rgbToHsl,splitMemeCaption}from'../tools/wave6-image-core.mjs';
import{validateVideoSettings}from'../tools/wave6-video-core.mjs';
import{scaleAudioChannels}from'../tools/wave6-audio-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ids=['svg-optimizer','video-to-gif','document-scanner','meme-maker','image-color-picker','pixel-art-maker','audio-volume-adjuster','video-thumbnail-extractor'];
test('Eight new Wave 6 pages and modules are registered without duplicates',async()=>{
 const cat=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const tools=cat.items.filter(x=>x.type==='tool');
 assert.equal(tools.length,143);
 assert.equal(new Set(tools.map(x=>x.url)).size,143);
 const directory=await readFile(resolve(root,'dist/tools/index.html'),'utf8');
 for(const id of ids){
  const item=tools.find(x=>x.url==='tools/'+id+'/');assert.ok(item,id);
  assert.equal(item.execution,'browser-local');
  const html=await readFile(resolve(root,item.url,'index.html'),'utf8');
  assert.match(html,/<h1>/);assert.match(html,/wave6\.css/);
  assert.match(html,/role="status"/);assert.doesNotMatch(html,/<script[^>]*src="https?:/);
  assert.ok(directory.includes('../tools/'+id+'/'));
  await stat(resolve(root,item.module.url));
 }
});
test('Canvas engines validate colors and meme text without remote libraries',()=>{
 assert.equal(encodeHex(12,200,255),'#0CC8FF');
 assert.deepEqual(rgbToHsl(255,0,0),{h:0,s:100,l:50});
 assert.deepEqual(splitMemeCaption('THIS IS A MEME'),['THIS IS A MEME']);
 assert.throws(()=>splitMemeCaption('A'.repeat(150)),/at most/);
 assert.throws(()=>encodeHex(-1,0,0),/Invalid RGB/);
});
test('Document scanner rejects crossed and out-of-bounds corners',()=>{
 const corners=[{x:.10,y:.10},{x:.90,y:.10},{x:.90,y:.90},{x:.10,y:.90}];
 assert.equal(validateScanCorners(corners).length,4);
 const transform=solveProjective(corners);
 const start=projectPoint(transform,0,0),end=projectPoint(transform,1,1);
 assert.ok(Math.abs(start.x-.10)<1e-7&&Math.abs(start.y-.10)<1e-7);
 assert.ok(Math.abs(end.x-.90)<1e-7&&Math.abs(end.y-.90)<1e-7);
 assert.throws(()=>validateScanCorners([corners[0],corners[2],corners[1],corners[3]]),/cross|convex/);
 assert.throws(()=>validateScanCorners(corners.map((p,i)=>i===0?{x:-.1,y:0}:p)),/outside/);
});
test('Video GIF settings enforce six-second and 60-frame resource caps',()=>{
 assert.equal(validateVideoSettings({start:0,end:3,fps:6,width:320},10).frames,18);
 for(const input of [{start:0,end:8,fps:10,width:320},{start:2,end:1,fps:6,width:320},{start:0,end:4,fps:11,width:320},{start:0,end:3,fps:6,width:1024}])
  assert.throws(()=>validateVideoSettings(input,20),/Choose a/);
});
test('Audio gain limiter never creates clipping',()=>{
 const input=[Float32Array.from([-.9,0,.9])];
 const adjusted=scaleAudioChannels(input,'3');
 assert.equal(adjusted.limited,true);
 assert.ok(adjusted.channels[0].every(v=>Math.abs(v)<=.990001));
 assert.ok(input[0][0]<-.8); // input remains untouched
 const quiet=scaleAudioChannels([Float32Array.from([0,.1,-.1])],'normalize');
 assert.ok(quiet.appliedGain>1);
 assert.throws(()=>scaleAudioChannels(input,'100'),/supported/);
});
test('Pinned local SVG optimizer and GIF encoder build files are present',async()=>{
 for(const path of ['dist/tools/vendor/svgo/svgo.browser.js','dist/tools/vendor/gifenc/index.js',
  'dist/tools/vendor/gifenc/lzwEncode.js','dist/tools/vendor/wave1-licenses/svgo-LICENSE.txt',
  'dist/tools/vendor/wave1-licenses/gifenc-LICENSE.txt']){
  const metadata=await stat(resolve(root,path));assert.ok(metadata.size>100,path);
 }
 const gif=GIFEncoder();
 const rgba=new Uint8Array(8*8*4);
 for(let i=0;i<rgba.length;i+=4){rgba[i]=200;rgba[i+1]=30;rgba[i+2]=90;rgba[i+3]=255;}
 const palette=quantize(rgba,64),indexed=applyPalette(rgba,palette);
 gif.writeFrame(indexed,8,8,{palette,delay:100,repeat:0});
 gif.finish();
 const bytes=gif.bytes();
 assert.equal(String.fromCharCode(...bytes.slice(0,6)),'GIF89a');
 assert.ok(bytes.length>30);
});
test('Wave 6 engines use local files and preview QA is not copied to production',async()=>{
 for(const p of ['tools/wave6-svg-core.mjs','tools/wave6-scanner-core.mjs','tools/wave6-video-core.mjs',
 'tools/wave6-image-core.mjs','tools/wave6-audio-core.mjs']){
  const source=await readFile(resolve(root,p),'utf8');
  assert.doesNotMatch(source,/https:\/\/cdn|https:\/\/unpkg|XMLHttpRequest|navigator\.sendBeacon/);
 }
 const headers=await readFile(resolve(root,'dist/_headers'),'utf8');
 const isPreview=headers.includes('X-Robots-Tag: noindex');
 const qa=await stat(resolve(root,'dist/wave6-browser-qa.mjs')).then(()=>true).catch(()=>false);
 assert.equal(qa,isPreview);
 const html=await readFile(resolve(root,'dist/tools/svg-optimizer/index.html'),'utf8');
 assert.equal(html.includes('wave6-browser-qa.mjs'),isPreview);
});
