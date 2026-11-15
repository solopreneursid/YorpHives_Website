import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile,stat}from'node:fs/promises';
import{resolve,dirname}from'node:path';
import{fileURLToPath}from'node:url';
import{validateVideoTrim,trimVideo}from'../tools/video-trim-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
test('Native video range validation rejects invalid and oversized selections',()=>{
 assert.deepEqual(validateVideoTrim(1,4,10),{start:1,end:4,length:3});
 for(const args of [[0,45,50],[-1,4,10],[5,2,10],[0,.1,10],[0,11,10],[0,4,0]]){
  assert.throws(()=>validateVideoTrim(...args),/Choose start and end/);
 }
});
test('Video Trimmer is a standalone first-party tool with clear output limitations',async()=>{
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const item=catalog.items.find(x=>x.url==='tools/video-trimmer/');
 assert.ok(item);assert.equal(item.module.url,'tools/video-trim-core.mjs');
 const html=await readFile(resolve(root,'tools/video-trimmer/index.html'),'utf8');
 assert.match(html,/data-video="video-trimmer"/);
 assert.match(html,/id="video-file"/);
 assert.match(html,/id="video-run"/);
 assert.match(html,/takes roughly as long/);
 const src=await readFile(resolve(root,'tools/video-trim-core.mjs'),'utf8');
 assert.doesNotMatch(src,/ffmpeg|fetch\(|https:\/\/|api\.|XMLHttpRequest/);
});
test('Unavailable input fails without opening any capture stream',async()=>{
 await assert.rejects(()=>trimVideo(new File(['a'],'a.mp4'),{start:0,end:1}),/between 100 bytes/);
 await assert.rejects(()=>trimVideo(new File([new Uint8Array(120)],'a.txt'),{start:0,end:1}),/Choose an MP4/);
});
test('Synthetic video acceptance test is available only in noindex preview',async()=>{
 const preview=(await readFile(resolve(dist,'_headers'),'utf8')).includes('X-Robots-Tag: noindex');
 const qa=await stat(resolve(dist,'video-browser-qa.mjs')).then(x=>x.isFile()).catch(()=>false);
 assert.equal(qa,preview);
 const html=await readFile(resolve(dist,'tools/video-trimmer/index.html'),'utf8');
 assert.equal(html.includes('video-browser-qa.mjs'),preview);
});
