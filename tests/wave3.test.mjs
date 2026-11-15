import{test}from'node:test';
import{strict as assert}from'node:assert';
import{readFile,stat}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{isHeicHeader,wavFromAudioChannels,WAVE3_IDS,processWave3}from'../tools/wave3-core.mjs';
import{validateRedactionAreas}from'../tools/pdf-redaction-core.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('Three new public tools are registered with first-party local modules',async()=>{
 const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
 const paths=['heic-to-jpg','audio-trimmer','pdf-redaction'];
 assert.equal(catalog.items.filter(x=>x.type==='tool').length,126);
 assert.deepEqual(WAVE3_IDS,['heic-to-jpg','audio-trimmer']);
 for(const id of paths){
  const item=catalog.items.find(x=>x.url==='tools/'+id+'/');
  assert.ok(item,'missing tool '+id);assert.equal(item.execution,'browser-local');
  const html=await readFile(resolve(root,'tools/'+id+'/index.html'),'utf8');
  assert.match(html,/<h1>/);assert.match(html,/type="module"/);
  assert.doesNotMatch(html,/<script[^>]*src="https?:/);
  await stat(resolve(root,item.module.url));
 }
});
test('HEIC header accepts supported brands and rejects AVIF/JPG impostors',()=>{
 const mk=brand=>new Uint8Array([0,0,0,24,102,116,121,112,...new TextEncoder().encode(brand),0,0,0,0,...new TextEncoder().encode('mif1')]);
 assert.ok(isHeicHeader(mk('heic')));
 assert.ok(isHeicHeader(mk('heix')));
 assert.equal(isHeicHeader(mk('avif')),false);
 assert.equal(isHeicHeader(new Uint8Array([255,216,255])),false);
});
test('Audio WAV exporter writes valid little-endian mono and stereo samples',async()=>{
 const stereo=wavFromAudioChannels([Float32Array.of(-1,0,1),Float32Array.of(1,0,-1)],44100);
 assert.equal(stereo.type,'audio/wav');
 const bytes=new DataView(await stereo.arrayBuffer());
 const str=(offset,n)=>Array.from({length:n},(_,i)=>String.fromCharCode(bytes.getUint8(offset+i))).join('');
 assert.equal(str(0,4),'RIFF');assert.equal(str(8,4),'WAVE');
 assert.equal(bytes.getUint16(22,true),2);assert.equal(bytes.getUint32(24,true),44100);
 assert.equal(bytes.getUint32(40,true),12);
 assert.equal(bytes.getInt16(44,true),-32768);assert.equal(bytes.getInt16(46,true),32767);
 assert.equal(bytes.getInt16(52,true),32767);assert.equal(bytes.getInt16(54,true),-32768);
 assert.throws(()=>wavFromAudioChannels([Float32Array.of(0)],100),/Unsupported/);
});
test('Redaction area validation rejects missing, off-page, oversized and tiny rectangles',()=>{
 assert.deepEqual(validateRedactionAreas([{page:1,x:.1,y:.2,w:.4,h:.5}],2),[{page:1,x:.1,y:.2,w:.4,h:.5}]);
 assert.throws(()=>validateRedactionAreas([],1),/Draw 1/);
 assert.throws(()=>validateRedactionAreas([{page:2,x:0,y:0,w:.2,h:.2}],1),/invalid page/);
 assert.throws(()=>validateRedactionAreas([{page:1,x:-.1,y:0,w:.2,h:.2}],1),/outside/);
 assert.throws(()=>validateRedactionAreas([{page:1,x:.9,y:.9,w:.2,h:.2}],1),/outside/);
 assert.throws(()=>validateRedactionAreas([{page:1,x:0,y:0,w:.001,h:.2}],1),/too small/);
 assert.throws(()=>validateRedactionAreas([{page:1,x:0,y:0,w:.5,h:.5}],50),/1–12/);
});
test('Invalid HEIC cannot trigger external processing or unauthenticated conversion',async()=>{
 await assert.rejects(()=>processWave3('nonexistent',[],{}),/Unknown/);
 await assert.rejects(()=>processWave3('heic-to-jpg',[new File(['bad'],'fake.heic')],{}),/HEIC\/HEIF/);
 await assert.rejects(()=>processWave3('audio-trimmer',[],{}),/Choose one/);
});
test('All third-party engines are locally bundled in build output',async()=>{
 const file=resolve(root,'dist/tools/vendor/heic/heic2any.min.js');
 const metadata=await stat(file);assert.ok(metadata.size>500000);
 const headers=await readFile(resolve(root,'dist/_headers'),'utf8');
 assert.match(headers,/connect-src 'self'/);
 const script=await readFile(resolve(root,'tools/wave3-core.mjs'),'utf8');
 assert.doesNotMatch(script,/https:\/\/cdn|https:\/\/unpkg|fetch\(/);
});
