// Production read-only browser health check. No uploads or synthetic analytics.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {chromium} from 'playwright';
const ORIGIN='https://yorphives.com';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],unexpectedWrites=[];
async function writeEvidence(){
 if(!process.env.YORPHIVES_QA_RESULTS)return;
 const dest=process.env.YORPHIVES_QA_RESULTS;
 await mkdir(dirname(dest),{recursive:true});
 await writeFile(dest,JSON.stringify({
  schemaVersion:1,generatedAt:new Date().toISOString(),
  complete:false,scenarios:results,unexpectedWrites
 },null,2)+'\n');
}
async function scenario(name,fn){
 const timeoutMs=/HEIC|OCR|Scanned PDF|screen recording/i.test(name)?150000:65000;
 console.log('START '+name,{timeoutMs});
 const context=await browser.newContext({baseURL:ORIGIN,serviceWorkers:'block',viewport:{width:1280,height:820}});
 const page=await context.newPage(),errors=[];
 page.__qaRoutes=[];
 page.setDefaultTimeout(15000);
 page.setDefaultNavigationTimeout(30000);
 await context.addInitScript(()=>{localStorage.setItem('yorphives-anonymous-analytics-disabled','1');});
 await context.route('**/api/insights/collect',route=>route.fulfill({status:204,body:''}));
 page.on('pageerror',e=>errors.push(page.url()+': '+(e.stack||e.message).slice(0,350)));
 page.on('request',r=>{if(['POST','PATCH','PUT','DELETE'].includes(r.method())&&!r.url().endsWith('/api/insights/collect'))unexpectedWrites.push(r.method()+' '+r.url());});
 let timer;
 try{
  await Promise.race([
   fn(page,context),
   new Promise((_,reject)=>{timer=setTimeout(()=>{
    void page.close({runBeforeUnload:false}).catch(()=>{});
    reject(new Error('Scenario exceeded '+timeoutMs+' ms; browser action interrupted'));
   },timeoutMs);})
  ]);
  assert.deepEqual(errors,[],'Browser JavaScript exceptions: '+errors.join(' | '));
  results.push({name,passed:true,routes:[...new Set(page.__qaRoutes)]});
  console.log('PASS '+name);
 }catch(error){
  results.push({name,passed:false,routes:[...new Set(page.__qaRoutes)],error:String(error?.message||error).slice(0,450)});
  console.error('FAIL '+name+': '+String(error?.message||error).slice(0,450));
 }finally{
  clearTimeout(timer);
  await writeEvidence();
  await Promise.race([context.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,5000))]);
 }
}
async function open(page,path){
 if(path.startsWith('/tools/'))page.__qaRoutes.push(path);
 const r=await page.goto(path,{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(r?.status(),200,path+' not reachable');
 await page.locator('h1').first().waitFor({state:'visible',timeout:15000});
}
try{
 await scenario('Word Counter executes in browser',async page=>{
  await open(page,'/tools/word-counter/');
  await page.locator('textarea[name="text"]').fill('Alpha beta gamma.');
  await page.locator('#utility-run').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#utility-run').disabled,{timeout:15000});
  await page.locator('#utility-run').click();
  await page.waitForFunction(()=>!document.querySelector('#utility-result').hidden,{timeout:15000});
  const value=await page.locator('#utility-output').inputValue();
  assert.match(value,/3/,'Word counter did not return a three-word count');
 });
 await scenario('Word Counter segments Hindi text correctly',async page=>{
  await open(page,'/tools/word-counter/');
  await page.locator('textarea[name="text"]').fill('नमस्ते दुनिया');
  await page.locator('#utility-run').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#utility-run').disabled,{timeout:15000});
  await page.locator('#utility-run').click();
  await page.waitForFunction(()=>!document.querySelector('#utility-result').hidden,{timeout:15000});
  assert.match(await page.locator('#utility-output').inputValue(),/Words:\s*2\b/,'Hindi text must count as two words');
 });
 await scenario('Case Converter title cases accented Latin letters',async page=>{
  await open(page,'/tools/case-converter/');
  await page.locator('textarea[name="text"]').fill('éclair café');
  await page.locator('[name="mode"]').selectOption('title');
  await page.locator('#utility-run').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#utility-run').disabled,{timeout:15000});
  await page.locator('#utility-run').click();
  await page.waitForFunction(()=>!document.querySelector('#utility-result').hidden,{timeout:15000});
  assert.equal((await page.locator('#utility-output').inputValue()).trim(),'Éclair Café');
 });
 await scenario('File SHA-256 matches the known checksum for synthetic text',async page=>{
  await open(page,'/tools/file-sha256/');
  await page.locator('#file-input').setInputFiles({name:'abc.txt',mimeType:'text/plain',buffer:Buffer.from('abc','utf8')});
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>!document.querySelector('#file-result').hidden,{timeout:20000});
  assert.match(await page.locator('#file-output').inputValue(),/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/);
 });
 await scenario('PDF page counter recognizes two synthetic pages',async page=>{
  await open(page,'/tools/pdf-page-counter/');
  const pdf=await page.evaluate(async()=>{
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const doc=await PDFDocument.create();doc.addPage([200,200]);doc.addPage([300,400]);
   return Array.from(await doc.save());
  });
  await page.locator('#file-input').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>!document.querySelector('#file-result').hidden,{timeout:20000});
  const output=await page.locator('#file-output').inputValue();
  assert.match(output,/Pages: 2/);
  assert.match(output,/Page 2: 300 × 400 pt/);
 });
 await scenario('PDF Rotate Pages writes a valid rotated PDF',async page=>{
  await open(page,'/tools/pdf-rotate-pages/');
  const pdf=await page.evaluate(async()=>{
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const doc=await PDFDocument.create();doc.addPage([200,300]);
   return Array.from(await doc.save());
  });
  await page.locator('#file-input').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
  await page.locator('[name="angle"]').selectOption('90');
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>!document.querySelector('#file-download').hidden&&document.querySelector('#file-download').href.startsWith('blob:'),{timeout:20000});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#file-download').click()]);
  const chunks=[];for await(const part of await download.createReadStream())chunks.push(part);
  const {PDFDocument}=await import('../tools/vendor/pdf-lib.mjs');
  const out=await PDFDocument.load(Buffer.concat(chunks));
  assert.equal(out.getPageCount(),1);
  assert.equal(out.getPage(0).getRotation().angle,90);
 });
 await scenario('JSON Formatter parses and formats locally',async page=>{
  await open(page,'/tools/json-formatter/');
  await page.locator('#json-input').fill('{"name":"YorpHives","active":true}');
  await page.locator('#json-format').click();
  await page.waitForFunction(()=>!!document.querySelector('#json-output').value,{timeout:15000});
  const value=await page.locator('#json-output').inputValue();
  assert.deepEqual(JSON.parse(value),{name:'YorpHives',active:true});
 });
 await scenario('Image Resizer creates downloadable output locally',async page=>{
  await open(page,'/tools/image-resizer/');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlI6asAAAAASUVORK5CYII=','base64');
  await page.locator('#image-file').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>!document.querySelector('#image-convert').disabled,{timeout:15000});
  await page.locator('#image-convert').click();
  await page.waitForFunction(()=>{
   const a=document.querySelector('#image-download');
   return a&&!a.hidden&&a.getAttribute('href')?.startsWith('blob:');
  },{timeout:20000});
 });
 await scenario('Spreadsheet CSV to XLSX preserves Unicode, commas and leading zeroes',async page=>{
  await open(page,'/tools/csv-file-to-xlsx/');
  const actual=await page.evaluate(async()=>{
   const {csvToXlsx,readXlsx,rowsToCsv,rowsToJson}=await import('/tools/office-files.mjs');
   const input='name,code,comment\n"Café भारत",00123,"hello, world"\n"Zoë",00007,"two lines\ncontinued"';
   const file=await csvToXlsx(input);
   const workbook=await readXlsx(file,1);
   return {size:file.byteLength||file.size||0,count:workbook.count,rows:workbook.rows,
    csv:rowsToCsv(workbook.rows,false),json:JSON.parse(rowsToJson(workbook.rows))};
  });
  assert.ok(actual.size>100,'XLSX output must contain a nonempty ZIP document');
  assert.equal(actual.count,1);
  assert.deepEqual(actual.rows,[
   ['name','code','comment'],
   ['Café भारत','00123','hello, world'],
   ['Zoë','00007','two lines\ncontinued']
  ]);
  assert.ok(actual.csv.includes('"hello, world"'));
  assert.equal(actual.json[0].code,'00123');
  assert.equal(actual.json[1].comment,'two lines\ncontinued');
 });
 await scenario('Image Resizer exports correct PNG dimensions',async page=>{
  await open(page,'/tools/image-resizer/');
  const png=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,2,2);
   ctx.fillStyle='#e12a35';ctx.fillRect(0,0,1,1);
   return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#image-file').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>!document.querySelector('#image-width').disabled,{timeout:15000});
  await page.locator('#image-width').fill('4');
  await page.locator('#image-format').selectOption('image/png');
  await page.locator('#image-convert').click();
  await page.waitForFunction(()=>!document.querySelector('#image-download').hidden&&document.querySelector('#image-download').href.startsWith('blob:'),null,{timeout:20000});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#image-download').click()]);
  const chunks=[];for await(const part of await download.createReadStream())chunks.push(part);
  const out=Buffer.concat(chunks);
  assert.deepEqual([...out.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(out.readUInt32BE(16),4);
  assert.equal(out.readUInt32BE(20),4);
 });

 await scenario('Image Cropper exports exact cropped PNG dimensions',async page=>{
  await open(page,'/tools/image-cropper/');
  const png=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=8;canvas.height=6;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#c42c55';ctx.fillRect(0,0,8,6);
   return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#file-input').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('[name="x"]').fill('2');
  await page.locator('[name="y"]').fill('1');
  await page.locator('[name="width"]').fill('3');
  await page.locator('[name="height"]').fill('4');
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>!document.querySelector('#file-download').hidden&&document.querySelector('#file-download').href.startsWith('blob:'),null,{timeout:20000});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#file-download').click()]);
  const parts=[];for await(const part of await download.createReadStream())parts.push(part);
  const result=Buffer.concat(parts);
  assert.deepEqual([...result.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(result.readUInt32BE(16),3);
  assert.equal(result.readUInt32BE(20),4);
 });
 await scenario('Image Rotate Flip exports PNG with swapped dimensions',async page=>{
  await open(page,'/tools/image-rotate-flip/');
  const png=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=8;canvas.height=6;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#248a70';ctx.fillRect(0,0,8,6);
   return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#file-input').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.locator('[name="angle"]').selectOption('90');
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>!document.querySelector('#file-download').hidden&&document.querySelector('#file-download').href.startsWith('blob:'),null,{timeout:20000});
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#file-download').click()]);
  const parts=[];for await(const part of await download.createReadStream())parts.push(part);
  const result=Buffer.concat(parts);
  assert.deepEqual([...result.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(result.readUInt32BE(16),6);
  assert.equal(result.readUInt32BE(20),8);
 });
 await scenario('Image Watermark adds visible text while retaining transparent corners',async page=>{
  await open(page,'/tools/image-watermark/');
  const png=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=240;canvas.height=120;
   return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#file-input').setInputFiles({name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.locator('[name="watermark"]').fill('TEST');
  await page.locator('[name="position"]').selectOption('center');
  await page.locator('[name="color"]').fill('#ff0000');
  await page.locator('[name="size"]').fill('40');
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>!document.querySelector('#file-download').hidden&&document.querySelector('#file-download').href.startsWith('blob:'),null,{timeout:20000});
  const pixels=await page.locator('#file-preview').evaluate(async img=>{
   await img.decode();
   const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
   const d=ctx.getImageData(0,0,c.width,c.height).data;let red=0,visible=0;
   for(let i=0;i<d.length;i+=4){if(d[i+3]>0)visible++;if(d[i]>150&&d[i+1]<90&&d[i+2]<90&&d[i+3]>20)red++;}
   return {w:c.width,h:c.height,cornerAlpha:d[3],visible,red};
  });
  assert.equal(pixels.w,240);assert.equal(pixels.h,120);
  assert.equal(pixels.cornerAlpha,0,'Unmarked transparent corner should remain transparent');
  assert.ok(pixels.visible>25&&pixels.red>25,'Exported watermark must contain visible red text');
 });
 await scenario('Image Cropper safely rejects corrupted images',async page=>{
  await open(page,'/tools/image-cropper/');
  await page.locator('#file-input').setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:Buffer.from('this is not an image')});
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>document.querySelector('#file-status').classList.contains('error'),null,{timeout:20000});
  assert.match(await page.locator('#file-status').innerText(),/PNG|JPEG|WebP|image|invalid|read/i);
  assert.equal(await page.locator('#file-download').isHidden(),true,'Damaged input must not yield a download');
 });
 await scenario('Audio Volume Adjuster exports valid audible WAV with correct duration',async page=>{
  await open(page,'/tools/audio-volume-adjuster/');
  const sampleRate=8000,sampleCount=8000;
  const wav=Buffer.alloc(44+sampleCount*2);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);
  wav.writeUInt32LE(sampleCount*2,40);
  for(let i=0;i<sampleCount;i++)wav.writeInt16LE(Math.round(7000*Math.sin(2*Math.PI*440*i/sampleRate)),44+i*2);
  await page.locator('#wave6-file').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:wav});
  await page.locator('[name="gain"]').selectOption('1.5');
  await page.locator('#wave6-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave6-result').hidden || document.querySelector('#wave6-status').classList.contains('error'),null,{timeout:30000});
  if(await page.locator('#wave6-status').evaluate(x=>x.classList.contains('error')))
   throw Error('Audio processing failed: '+await page.locator('#wave6-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave6-result a[download]').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const bytes=Buffer.concat(chunks);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.equal(bytes.readUInt16LE(22),1);
  const outputRate=bytes.readUInt32LE(24),pcmBytes=bytes.readUInt32LE(40);
  assert.ok(outputRate>=8000&&outputRate<=192000,'Output must declare a supported sample rate');
  assert.ok(Math.abs(pcmBytes/(outputRate*2)-1)<.04,'Exported audio should remain about one second');
  let peak=0;for(let i=44;i+1<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));
  assert.ok(peak>8500&&peak<=32767,'Processed WAV should be amplified and not clipped');
 });
 await scenario('Video to GIF exports actual animated frames',async page=>{
  const {readFile}=await import('node:fs/promises');
  const videoFile=process.env.YORPHIVES_TEST_WEBM;
  assert.ok(videoFile,'Synthetic video fixture must be explicitly generated before browser QA');
  const video=await readFile(videoFile);
  await open(page,'/tools/video-to-gif/');
  await page.locator('#wave6-file').setInputFiles({name:'synthetic.webm',mimeType:'video/webm',buffer:video});
  await page.locator('[name="start"]').fill('0.25');
  await page.locator('[name="end"]').fill('1.25');
  await page.locator('[name="fps"]').selectOption('4');
  await page.locator('[name="width"]').selectOption('240');
  await page.locator('#wave6-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave6-result').hidden || document.querySelector('#wave6-status').classList.contains('error'),null,{timeout:60000});
  if(await page.locator('#wave6-status').evaluate(el=>el.classList.contains('error')))
   throw Error('Video to GIF failed: '+await page.locator('#wave6-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave6-result a[download]').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const bytes=Buffer.concat(chunks);
  assert.equal(bytes.toString('ascii',0,6),'GIF89a');
  assert.equal(bytes.readUInt16LE(6),240);
  assert.equal(bytes.readUInt16LE(8),180);
  assert.ok(bytes.length>100,'GIF output must contain image data');
  // Traverse GIF's actual block boundaries to count image frames safely.
  let offset=13,frames=0;
  if(bytes[10]&128)offset+=3*(2**((bytes[10]&7)+1));
  const skipBlocks=()=>{
   while(true){
    assert.ok(offset<bytes.length,'GIF sub-blocks must terminate within file');
    const size=bytes[offset++];if(!size)return;
    offset+=size;assert.ok(offset<=bytes.length,'GIF sub-block exceeds file bounds');
   }
  };
  let ended=false;
  while(offset<bytes.length){
   const marker=bytes[offset++];
   if(marker===0x3b){ended=true;break;}
   if(marker===0x21){offset++;skipBlocks();continue;}
   assert.equal(marker,0x2c,'GIF must contain only valid extension and image blocks');
   assert.ok(offset+9<=bytes.length);
   const localFlags=bytes[offset+8];offset+=9;
   if(localFlags&128)offset+=3*(2**((localFlags&7)+1));
   offset++;skipBlocks();frames++;
  }
  assert.ok(ended,'GIF must end with a trailer');
  assert.equal(frames,4,'A one-second 4fps GIF must contain four frames');
 });
 await scenario('Video Thumbnail Extractor returns valid PNG pixels',async page=>{
  const {readFile}=await import('node:fs/promises');
  const videoFile=process.env.YORPHIVES_TEST_WEBM;
  assert.ok(videoFile,'Synthetic video fixture must be provided');
  await open(page,'/tools/video-thumbnail-extractor/');
  await page.locator('#wave6-file').setInputFiles({name:'synthetic.webm',mimeType:'video/webm',buffer:await readFile(videoFile)});
  await page.locator('[name="time"]').fill('0.5');
  await page.locator('[name="width"]').selectOption('240');
  await page.locator('[name="format"]').selectOption('png');
  await page.locator('#wave6-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave6-result').hidden || document.querySelector('#wave6-status').classList.contains('error'),null,{timeout:45000});
  if(await page.locator('#wave6-status').evaluate(el=>el.classList.contains('error')))
   throw Error('Video frame extraction failed: '+await page.locator('#wave6-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave6-result a[download]').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const bytes=Buffer.concat(chunks);
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(bytes.readUInt32BE(16),240);
  assert.equal(bytes.readUInt32BE(20),180);
  const visual=await page.evaluate(async(encoded)=>{
   const payload=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0));
   const file=new Blob([payload],{type:'image/png'}),url=URL.createObjectURL(file),img=new Image();
   try{
    img.src=url;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const values=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const sampled=new Set();
    for(let i=0;i<values.length;i+=Math.max(4,Math.floor(values.length/3000/4)*4)){
     sampled.add(values[i]+','+values[i+1]+','+values[i+2]);
    }
    return {decodedWidth:img.naturalWidth,decodedHeight:img.naturalHeight,distinctColors:sampled.size};
   }finally{URL.revokeObjectURL(url);}
  },bytes.toString('base64'));
  assert.equal(visual.decodedWidth,240);assert.equal(visual.decodedHeight,180);
  assert.ok(visual.distinctColors>3,'Video thumbnail must show actual frame pixels, not a blank image');
 });

 // Browser-generated test recordings are deterministic and contain no user data.
 const syntheticWav=(seconds,frequency=440)=>{
  const rate=8000,count=Math.round(rate*seconds),buf=Buffer.alloc(44+count*2);
  buf.write('RIFF',0);buf.writeUInt32LE(buf.length-8,4);buf.write('WAVEfmt ',8);
  buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);
  buf.writeUInt32LE(rate,24);buf.writeUInt32LE(rate*2,28);buf.writeUInt16LE(2,32);
  buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++)buf.writeInt16LE(Math.round(6500*Math.sin(2*Math.PI*frequency*i/rate)),44+i*2);
  return buf;
 };
 const validateWav=(bytes,minSeconds,maxSeconds)=>{
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.equal(bytes.toString('ascii',36,40),'data');
  assert.equal(bytes.readUInt16LE(20),1);
  const channels=bytes.readUInt16LE(22),rate=bytes.readUInt32LE(24),bits=bytes.readUInt16LE(34);
  assert.ok(channels>=1&&channels<=2);assert.equal(bits,16);
  assert.ok(rate>=8000&&rate<=192000);
  const pcmSize=bytes.readUInt32LE(40);
  assert.equal(bytes.length,pcmSize+44);
  const duration=pcmSize/(rate*channels*(bits/8));
  assert.ok(duration>=minSeconds&&duration<=maxSeconds,'Unexpected WAV duration: '+duration);
  let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));
  assert.ok(peak>1000,'Exported audio must not be silent');
  return {duration,rate,channels,peak};
 };
 await scenario('Audio Merger exports valid two-second WAV',async page=>{
  await open(page,'/tools/audio-merger/');
  await page.locator('#wave7-file').setInputFiles([
   {name:'first.wav',mimeType:'audio/wav',buffer:syntheticWav(1,440)},
   {name:'second.wav',mimeType:'audio/wav',buffer:syntheticWav(1,660)}
  ]);
  await page.locator('#wave7-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave7-result').hidden||document.querySelector('#wave7-status').classList.contains('error'),null,{timeout:30000});
  if(await page.locator('#wave7-status').evaluate(x=>x.classList.contains('error')))
   throw Error('Audio Merger failed: '+await page.locator('#wave7-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave7-result a[download]').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  validateWav(Buffer.concat(chunks),1.9,2.1);
 });
 await scenario('Audio Trimmer exports correct one-second WAV',async page=>{
  await open(page,'/tools/audio-trimmer/');
  await page.locator('#wave3-file').setInputFiles({name:'source.wav',mimeType:'audio/wav',buffer:syntheticWav(2)});
  await page.waitForFunction(()=>!document.querySelector('#wave3-run').disabled,null,{timeout:20000});
  await page.locator('[name="start"]').fill('0.5');
  await page.locator('[name="end"]').fill('1.5');
  await page.locator('#wave3-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave3-result').hidden||document.querySelector('#wave3-status').classList.contains('error'),null,{timeout:30000});
  if(await page.locator('#wave3-status').evaluate(x=>x.classList.contains('error')))
   throw Error('Audio Trimmer failed: '+await page.locator('#wave3-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave3-download').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  validateWav(Buffer.concat(chunks),.95,1.05);
 });
 await scenario('Video Trimmer exports a decodable approximately one-second clip',async page=>{
  const {readFile}=await import('node:fs/promises');
  assert.ok(process.env.YORPHIVES_TEST_WEBM,'Synthetic WebM fixture is required');
  await open(page,'/tools/video-trimmer/');
  const input=await readFile(process.env.YORPHIVES_TEST_WEBM);
  await page.locator('#video-file').setInputFiles({name:'synthetic.webm',mimeType:'video/webm',buffer:input});
  await page.waitForFunction(()=>!document.querySelector('#video-run').disabled,null,{timeout:20000});
  await page.locator('#video-start').fill('0.25');
  await page.locator('#video-end').fill('1.25');
  await page.locator('#video-run').click();
  await page.waitForFunction(()=>!document.querySelector('#video-result').hidden||document.querySelector('#video-status').classList.contains('error'),null,{timeout:45000});
  if(await page.locator('#video-status').evaluate(el=>el.classList.contains('error')))
   throw Error('Video Trimmer failed: '+await page.locator('#video-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#video-download').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const bytes=Buffer.concat(chunks);
  assert.ok(bytes.length>500,'Video output must be more than an empty container');
  const mime=download.suggestedFilename().endsWith('.mp4')?'video/mp4':'video/webm';
  if(mime==='video/webm')assert.deepEqual([...bytes.subarray(0,4)],[26,69,223,163],'WebM must have EBML header');
  const decoded=await page.evaluate(async({encoded,mime})=>{
   const bytes=Uint8Array.from(atob(encoded),ch=>ch.charCodeAt(0));
   const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
   const video=document.createElement('video');video.muted=true;video.preload='auto';video.src=url;
   try{
    await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('Trimmed video metadata timed out')),15000);
     video.onloadedmetadata=()=>{clearTimeout(timer);resolve();};
     video.onerror=()=>{clearTimeout(timer);reject(Error('Trimmed video cannot be decoded'));};
     video.load();
    });
    const {duration,videoWidth,videoHeight}=video;
    await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('Trimmed video frame seeking timed out')),12000);
     video.onseeked=()=>{clearTimeout(timer);resolve();};
     video.onerror=()=>{clearTimeout(timer);reject(Error('Trimmed video frame failed'));};
     video.currentTime=Math.min(.35,duration/2);
    });
    const canvas=document.createElement('canvas');canvas.width=videoWidth;canvas.height=videoHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0);
    const pixels=ctx.getImageData(0,0,videoWidth,videoHeight).data;
    let content=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>50)content++;
    return {duration,videoWidth,videoHeight,content};
   }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
  },{encoded:bytes.toString('base64'),mime});
  assert.ok(decoded.duration>=.65&&decoded.duration<=1.65,'Trimmed video duration outside tolerance: '+decoded.duration);
  assert.equal(decoded.videoWidth,160);
  assert.equal(decoded.videoHeight,120);
  assert.ok(decoded.content>100,'Trimmed video must contain nonblank decoded pixels');
 });
 await scenario('Batch Image Converter exports two valid PNG images in ZIP',async page=>{
  await open(page,'/tools/batch-image-converter/');
  const source=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=7;c.height=5;
   const ctx=c.getContext('2d');ctx.fillStyle='#dc4321';ctx.fillRect(0,0,7,5);
   return c.toDataURL('image/png').split(',')[1];
  });
  const png=Buffer.from(source,'base64');
  await page.locator('#wave7-file').setInputFiles([
   {name:'image.png',mimeType:'image/png',buffer:png},
   {name:'image.png',mimeType:'image/png',buffer:png}
  ]);
  await page.locator('[name="format"]').selectOption('png');
  await page.locator('#wave7-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave7-result').hidden || document.querySelector('#wave7-status').classList.contains('error'),null,{timeout:30000});
  if(await page.locator('#wave7-status').evaluate(x=>x.classList.contains('error')))
   throw Error('Batch image conversion failed: '+await page.locator('#wave7-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave7-result a[download]').click()]);
  const chunks=[];for await(const c of await download.createReadStream())chunks.push(c);
  const zipBytes=Buffer.concat(chunks);
  assert.equal(zipBytes.toString('ascii',0,2),'PK');
  const validation=await page.evaluate(async encoded=>{
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const archive=await JSZip.loadAsync(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)));
   const files=Object.keys(archive.files).filter(name=>name.endsWith('.png')).sort();
   const details=[];
   for(const name of files){
    const bytes=await archive.files[name].async('uint8array');
    const png=[...bytes.slice(0,8)].join(',');
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    details.push({name,png,width:view.getUint32(16),height:view.getUint32(20)});
   }
   return details;
  },zipBytes.toString('base64'));
  assert.equal(validation.length,2,'Batch output must contain both files');
  assert.notEqual(validation[0].name,validation[1].name,'Duplicate input names must not overwrite each other');
  for(const entry of validation){
   assert.equal(entry.png,'137,80,78,71,13,10,26,10');assert.equal(entry.width,7);assert.equal(entry.height,5);
  }
 });
 await scenario('Spreadsheet Merger exports correct joined CSV with source labels',async page=>{
  await open(page,'/tools/spreadsheet-merger/');
  const a=Buffer.from('name,code\nCafé,0012\n','utf8');
  const b=Buffer.from('code,city\n0044,Delhi\n','utf8');
  await page.locator('#wave7-file').setInputFiles([
   {name:'one.csv',mimeType:'text/csv',buffer:a},
   {name:'two.csv',mimeType:'text/csv',buffer:b}
  ]);
  await page.locator('[name="format"]').selectOption('csv');
  await page.locator('[name="columns"]').selectOption('union');
  await page.locator('[name="source"]').check();
  await page.locator('#wave7-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave7-result').hidden || document.querySelector('#wave7-status').classList.contains('error'),null,{timeout:30000});
  if(await page.locator('#wave7-status').evaluate(x=>x.classList.contains('error')))
   throw Error('Spreadsheet merging failed: '+await page.locator('#wave7-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave7-result a[download]').click()]);
  const chunks=[];for await(const c of await download.createReadStream())chunks.push(c);
  const csv=Buffer.concat(chunks).toString('utf8');
  const parsed=await page.evaluate(async source=>{
   const {parseCsv}=await import('/tools/utility-core.mjs');
   return parseCsv(source);
  },csv);
  assert.deepEqual(parsed,[
   ['name','code','city','Source file'],
   ['Café','0012','','one.csv'],
   ['','0044','Delhi','two.csv']
  ]);
 });
 await scenario('PDF Metadata Cleaner clears standard author title and date metadata',async page=>{
  await open(page,'/tools/pdf-metadata-cleaner/');
  const source=await page.evaluate(async()=>{
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const pdf=await PDFDocument.create();pdf.addPage([200,250]);
   pdf.setTitle('Private Test Title');pdf.setAuthor('Synthetic QA Author');
   pdf.setSubject('Internal test only');pdf.setKeywords(['Synthetic','Private']);
   return Array.from(await pdf.save());
  });
  await page.locator('#wave7-file').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(source)});
  await page.locator('#wave7-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave7-result').hidden||document.querySelector('#wave7-status').classList.contains('error'),null,{timeout:30000});
  if(await page.locator('#wave7-status').evaluate(x=>x.classList.contains('error')))
   throw Error('PDF metadata cleanup failed: '+await page.locator('#wave7-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave7-result a[download]').click()]);
  const parts=[];for await(const part of await download.createReadStream())parts.push(part);
  const bytes=Buffer.concat(parts);
  assert.equal(bytes.toString('ascii',0,5),'%PDF-');
  const doc=await page.evaluate(async encoded=>{
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const source=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0));
   const pdf=await PDFDocument.load(source,{updateMetadata:false});
   return {pages:pdf.getPageCount(),title:pdf.getTitle()||'',author:pdf.getAuthor()||'',
    subject:pdf.getSubject()||'',keywords:pdf.getKeywords()||''};
  },bytes.toString('base64'));
  assert.equal(doc.pages,1);assert.equal(doc.title,'');assert.equal(doc.author,'');
  assert.equal(doc.subject,'');assert.doesNotMatch(doc.keywords,/Synthetic|Private/);
 });
 await scenario('Spreadsheet Merger XLSX export retains IDs as text',async page=>{
  await open(page,'/tools/spreadsheet-merger/');
  await page.locator('#wave7-file').setInputFiles([
   {name:'first.csv',mimeType:'text/csv',buffer:Buffer.from('name,code\nAlice,0012\n')},
   {name:'second.csv',mimeType:'text/csv',buffer:Buffer.from('name,code\nBob,0044\n')}
  ]);
  await page.locator('[name="format"]').selectOption('xlsx');
  await page.locator('#wave7-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave7-result').hidden||document.querySelector('#wave7-status').classList.contains('error'),null,{timeout:30000});
  if(await page.locator('#wave7-status').evaluate(x=>x.classList.contains('error')))
   throw Error('Spreadsheet XLSX merge failed: '+await page.locator('#wave7-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave7-result a[download]').click()]);
  const parts=[];for await(const part of await download.createReadStream())parts.push(part);
  const bytes=Buffer.concat(parts);
  assert.equal(bytes.toString('ascii',0,2),'PK');
  const sheet=await page.evaluate(async encoded=>{
   const {readXlsx}=await import('/tools/office-files.mjs');
   return (await readXlsx(Uint8Array.from(atob(encoded),x=>x.charCodeAt(0)),1)).rows;
  },bytes.toString('base64'));
  assert.deepEqual(sheet,[['name','code'],['Alice','0012'],['Bob','0044']]);
 });
 await scenario('Excel to CSV preserves sheet text and leading zeroes',async page=>{
  await open(page,'/tools/xlsx-file-to-csv/');
  const output=await page.evaluate(async()=>{
   const {csvToXlsx}=await import('/tools/office-files.mjs');
   const {processFileTool}=await import('/tools/file-core.mjs');
   const bytes=await csvToXlsx('name,code\nAlice,0012\nBob,0044');
   const file=new File([bytes],'synthetic.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
   const out=await processFileTool('xlsx-file-to-csv',[file],{sheet:'1',safe:'on'});
   return {mime:out.blob.type,text:await out.blob.text()};
  });
  assert.match(output.mime,/text\/csv/);
  assert.deepEqual(output.text.split(/\r?\n/),['name,code','Alice,0012','Bob,0044']);
 });
 await scenario('Excel to JSON preserves Unicode and typed string identifiers',async page=>{
  await open(page,'/tools/xlsx-file-to-json/');
  const output=await page.evaluate(async()=>{
   const {csvToXlsx}=await import('/tools/office-files.mjs');
   const {processFileTool}=await import('/tools/file-core.mjs');
   const bytes=await csvToXlsx('name,code\nCafé,0012');
   const file=new File([bytes],'synthetic.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
   const out=await processFileTool('xlsx-file-to-json',[file],{sheet:'1'});
   return {mime:out.blob.type,json:JSON.parse(await out.blob.text())};
  });
  assert.match(output.mime,/application\/json/);
  assert.equal(output.json[0].name,'Café');
  assert.equal(output.json[0].code,'0012');
 });
 await scenario('Images to PDF produces actual two-page PDF',async page=>{
  await open(page,'/tools/images-to-pdf/');
  const info=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const canvas=document.createElement('canvas');canvas.width=8;canvas.height=6;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fa3344';ctx.fillRect(0,0,8,6);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const f1=new File([png],'one.png',{type:'image/png'});
   const f2=new File([png],'two.png',{type:'image/png'});
   const out=await processFileTool('images-to-pdf',[f1,f2]);
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const doc=await PDFDocument.load(bytes);
   return {signature:String.fromCharCode(...bytes.slice(0,5)),type:out.blob.type,pages:doc.getPageCount()};
  });
  assert.equal(info.signature,'%PDF-');assert.equal(info.type,'application/pdf');assert.equal(info.pages,2);
 });
 await scenario('ZIP Creator and Contents Viewer preserve filenames and payloads',async page=>{
  await open(page,'/tools/zip-file-creator/');
  const result=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const a=new File(['Hello QA'],'alpha.txt',{type:'text/plain'});
   const b=new File(['Café'], 'beta.txt',{type:'text/plain'});
   const out=await processFileTool('zip-file-creator',[a,b],{});
   const bytes=await out.blob.arrayBuffer();
   const zip=await JSZip.loadAsync(bytes);
   const names=Object.keys(zip.files);
   const first=await zip.file('alpha.txt')?.async('string');
   const second=await zip.file('beta.txt')?.async('string');
   return {bytes:Array.from(new Uint8Array(bytes).slice(0,2)),names,first,second};
  });
  assert.deepEqual(result.bytes,[80,75]);
  assert.ok(result.names.includes('alpha.txt')&&result.names.includes('beta.txt'));
  assert.equal(result.first,'Hello QA');assert.equal(result.second,'Café');
  await open(page,'/tools/zip-contents-viewer/');
  const inspection=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const zip=new JSZip();zip.file('alpha.txt','Hello QA');zip.file('beta.txt','Café');
   const bytes=await zip.generateAsync({type:'uint8array'});
   const file=new File([bytes],'synthetic.zip',{type:'application/zip'});
   const out=await processFileTool('zip-contents-viewer',[file],{});
   return out.text||await out.blob.text();
  });
  assert.match(inspection,/alpha\.txt/);assert.match(inspection,/beta\.txt/);
 });
 await scenario('File Format Inspector identifies a PNG without trusting extension',async page=>{
  await open(page,'/tools/file-format-inspector/');
  const result=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
   const file=new File([bytes],'mislabeled.txt',{type:'text/plain'});
   const out=await processFileTool('file-format-inspector',[file],{});
   return out.text||await out.blob.text();
  });
  assert.match(result,/PNG/i);
  assert.match(result,/mislabeled\.txt/);
 });
 await scenario('Batch File Renamer exports two collision-safe renamed files',async page=>{
  await open(page,'/tools/batch-file-renamer/');
  const result=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const files=[new File(['alpha'],'first.txt'),new File(['beta'],'second.txt')];
   const out=await processFileTool('batch-file-renamer',files,{prefix:'qa'});
   const zip=await JSZip.loadAsync(await out.blob.arrayBuffer());
   return {names:Object.keys(zip.files).sort(),
    alpha:await zip.file('qa-01.txt')?.async('string'),
    beta:await zip.file('qa-02.txt')?.async('string')};
  });
  assert.deepEqual(result.names,['qa-01.txt','qa-02.txt']);
  assert.equal(result.alpha,'alpha');assert.equal(result.beta,'beta');
 });
 await scenario('Duplicate File Finder detects identical bytes without deleting originals',async page=>{
  await open(page,'/tools/duplicate-file-finder/');
  const result=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const inputs=[new File(['same bytes'],'a.txt'),new File(['same bytes'],'b.txt'),new File(['different'],'c.txt')];
   const out=await processFileTool('duplicate-file-finder',inputs,{});
   return out.text||await out.blob.text();
  });
  assert.match(result,/Identical content groups: 1/);
  assert.match(result,/a\.txt/);assert.match(result,/b\.txt/);
  assert.match(result,/No files were deleted/);
 });
 await scenario('Batch Find and Replace rewrites ZIP payloads without changing originals',async page=>{
  await open(page,'/tools/batch-find-replace/');
  const result=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const a=new File(['red red blue'],'one.txt',{type:'text/plain'});
   const b=new File(['blue red'],'two.txt',{type:'text/plain'});
   const original=await a.text();
   const out=await processFileTool('batch-find-replace',[a,b],{find:'red',replacement:'green'});
   const zip=await JSZip.loadAsync(await out.blob.arrayBuffer());
   return {original,one:await zip.file('one.txt')?.async('string'),
    two:await zip.file('two.txt')?.async('string')};
  });
  assert.equal(result.original,'red red blue');
  assert.equal(result.one,'green green blue');
  assert.equal(result.two,'blue green');
 });
 await scenario('Subtitle Converter creates valid WEBVTT cues',async page=>{
  await open(page,'/tools/subtitle-converter/');
  const output=await page.evaluate(async()=>{
   const {processWave4}=await import('/tools/wave4-core.mjs');
   const source='1\n00:00:00,000 --> 00:00:01,000\nHello world\n';
   const out=await processWave4('subtitle-converter',[],{subtitleText:source,format:'vtt'});
   return {name:out.filename,body:await out.blob.text()};
  });
  assert.match(output.name,/\.vtt$/);
  assert.match(output.body,/WEBVTT/);assert.match(output.body,/Hello world/);
 });
 await scenario('Social Preview Builder escapes untrusted HTML',async page=>{
  await open(page,'/tools/social-preview-builder/');
  const output=await page.evaluate(async()=>{
   const {processWave4}=await import('/tools/wave4-core.mjs');
   const out=await processWave4('social-preview-builder',[],{
    title:'QA <Title>',description:'A & B',url:'https://example.com/'});
   return await out.blob.text();
  });
  assert.match(output,/QA &lt;Title&gt;/);
  assert.match(output,/A &amp; B/);
  assert.doesNotMatch(output,/<Title>/);
 });
 await scenario('Quotation Generator exports valid pricing PDF',async page=>{
  await open(page,'/tools/quotation-generator/');
  const actual=await page.evaluate(async()=>{
   const {processWave4}=await import('/tools/wave4-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const out=await processWave4('quotation-generator',[],{
    business:'QA Studio',client:'Client',items:'Design | 2 | 50',currency:'USD',tax:'10'});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const pdf=await PDFDocument.load(bytes);
   return {sig:String.fromCharCode(...bytes.slice(0,5)),pages:pdf.getPageCount(),mime:out.blob.type};
  });
  assert.equal(actual.sig,'%PDF-');assert.equal(actual.mime,'application/pdf');assert.ok(actual.pages>=1);
 });
 await scenario('Certificate Generator exports landscape PDF',async page=>{
  await open(page,'/tools/certificate-generator/');
  const actual=await page.evaluate(async()=>{
   const {processWave4}=await import('/tools/wave4-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const out=await processWave4('certificate-generator',[],{
    recipient:'Test Recipient',title:'Achievement',organization:'QA Studio',date:'2026-01-01'});
   const pdf=await PDFDocument.load(await out.blob.arrayBuffer());
   const page=pdf.getPages()[0];
   return {pages:pdf.getPageCount(),w:Math.round(page.getWidth()),h:Math.round(page.getHeight())};
  });
  assert.deepEqual(actual,{pages:1,w:842,h:595});
 });
 await scenario('Favicon Generator creates valid PNG and ICO assets in ZIP',async page=>{
  await open(page,'/tools/favicon-generator/');
  const actual=await page.evaluate(async()=>{
   const {processWave4}=await import('/tools/wave4-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#148caa';ctx.fillRect(0,0,32,32);
   const img=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const out=await processWave4('favicon-generator',[new File([img],'synthetic.png',{type:'image/png'})]);
   const zip=await JSZip.loadAsync(await out.blob.arrayBuffer());
   const favicon=await zip.file('favicon.ico')?.async('uint8array');
   const png=await zip.file('favicon-16.png')?.async('uint8array');
   return {names:Object.keys(zip.files),ico:[...favicon.slice(0,6)],
    png:[...png.slice(0,8)],width:new DataView(png.buffer,png.byteOffset,png.length).getUint32(16)};
  });
  assert.ok(actual.names.includes('favicon.ico')&&actual.names.includes('icon-512.png'));
  assert.deepEqual(actual.ico,[0,0,1,0,3,0]);
  assert.deepEqual(actual.png,[137,80,78,71,13,10,26,10]);
  assert.equal(actual.width,16);
 });
 await scenario('Campaign URL Builder preserves existing query while encoding UTM fields',async page=>{
  await open(page,'/tools/campaign-url-builder/');
  const url=await page.evaluate(async()=>{
   const {buildCampaignUrl}=await import('/tools/toolkit.mjs');
   return buildCampaignUrl('https://example.com/?keep=1',{source:'qa team',medium:'website',campaign:'Launch & test'});
  });
  const parsed=new URL(url);
  assert.equal(parsed.searchParams.get('keep'),'1');
  assert.equal(parsed.searchParams.get('utm_source'),'qa team');
  assert.equal(parsed.searchParams.get('utm_campaign'),'Launch & test');
 });
 await scenario('Password Analyzer detects known weak phrases without sending secrets',async page=>{
  await open(page,'/tools/password-strength-analyzer/');
  const values=await page.evaluate(async()=>{
   const {assessPassword}=await import('/tools/wave7-business-core.mjs');
   return {weak:assessPassword('password123'),strong:assessPassword('Breeze-River-Quartz-Copper-72!')};
  });
  assert.ok(values.strong.score>values.weak.score);
  assert.ok(values.weak.hasPatterns||values.weak.score<=1);
 });
 await scenario('Business Proposal Generator exports a valid local PDF',async page=>{
  await open(page,'/tools/business-proposal-generator/');
  const details=await page.evaluate(async()=>{
   const {createBusinessProposal}=await import('/tools/wave7-business-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const out=await createBusinessProposal({
    company:'QA Studio',client:'Synthetic Client',project:'Website Review',
    overview:'Review accessibility and file download functionality.',
    deliverables:'Audit report\nRemediation plan',timeline:'Two weeks',cost:'300',currency:'USD'});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const doc=await PDFDocument.load(bytes);
   return {mime:out.blob.type,signature:String.fromCharCode(...bytes.slice(0,5)),pages:doc.getPageCount()};
  });
  assert.equal(details.mime,'application/pdf');assert.equal(details.signature,'%PDF-');
  assert.ok(details.pages>=1&&details.pages<=10);
 });
 await scenario('SVG Optimizer preserves safe shapes and rejects embedded scripts',async page=>{
  await open(page,'/tools/svg-optimizer/');
  const details=await page.evaluate(async()=>{
   const {optimizeSvg}=await import('/tools/wave6-svg-core.mjs');
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="red"/></svg>';
   const out=await optimizeSvg(svg);
   let rejected=false;
   try{await optimizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');}
   catch{rejected=true;}
   return {mime:out.blob.type,text:await out.blob.text(),rejected};
  });
  assert.equal(details.mime,'image/svg+xml');
  assert.match(details.text,/<svg/);assert.ok(details.rejected);
  assert.doesNotMatch(details.text,/<script/i);
 });
 await scenario('Image Metadata Cleaner re-encodes valid PNG pixels',async page=>{
  await open(page,'/tools/image-metadata-cleaner/');
  const actual=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');const canvas=document.createElement('canvas');canvas.width=100;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#5ea47c';ctx.fillRect(0,0,100,80);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([blob],'synthetic.png',{type:'image/png'});
   const out=await processWave1('image-metadata-cleaner',[file],{format:'png'});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   return {type:out.blob.type,header:[...bytes.slice(0,8)],w:view.getUint32(16),h:view.getUint32(20)};
  });
  assert.equal(actual.type,'image/png');
  assert.deepEqual(actual.header,[137,80,78,71,13,10,26,10]);
  assert.equal(actual.w,100);assert.equal(actual.h,80);
 });
 await scenario('Passport Photo Maker outputs required 600 square PNG',async page=>{
  await open(page,'/tools/passport-photo-maker/');
  const actual=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');const canvas=document.createElement('canvas');canvas.width=100;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#5ea47c';ctx.fillRect(0,0,100,80);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([blob],'synthetic.png',{type:'image/png'});
   const out=await processWave1('passport-photo-maker',[file],{size:'2x2',top:'50'});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   return {mime:out.blob.type,w:v.getUint32(16),h:v.getUint32(20)};
  });
  assert.deepEqual(actual,{mime:'image/png',w:600,h:600});
 });
 await scenario('Image Size Target produces JPEG within declared KB limit',async page=>{
  await open(page,'/tools/image-size-target/');
  const actual=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');const canvas=document.createElement('canvas');canvas.width=100;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#5ea47c';ctx.fillRect(0,0,100,80);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([blob],'synthetic.png',{type:'image/png'});
   const out=await processWave1('image-size-target',[file],{kb:'100',format:'jpeg'});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   return {mime:out.blob.type,size:bytes.length,jpeg:[...bytes.slice(0,2)]};
  });
  assert.equal(actual.mime,'image/jpeg');assert.deepEqual(actual.jpeg,[255,216]);
  assert.ok(actual.size>100&&actual.size<=100*1024);
 });
 await scenario('Barcode Generator produces printable SVG without active content',async page=>{
  await open(page,'/tools/barcode-generator/');
  const actual=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');
   const out=await processWave1('barcode-generator',[],{text:'QA2026',format:'CODE128'});
   return {mime:out.blob.type,svg:await out.blob.text()};
  });
  assert.equal(actual.mime,'image/svg+xml');
  assert.match(actual.svg,/<svg/);assert.match(actual.svg,/<(?:rect|path)/);
  assert.doesNotMatch(actual.svg,/<script|onload=/i);
 });
 await scenario('SVG to PNG creates safe correctly sized raster output',async page=>{
  await open(page,'/tools/svg-to-png/');
  const actual=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');
   const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48"><rect width="64" height="48" fill="red"/></svg>';
   const file=new File([svg],'synthetic.svg',{type:'image/svg+xml'});
   const out=await processWave1('svg-to-png',[file],{width:'64',height:'48'});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   return {type:out.blob.type,w:view.getUint32(16),h:view.getUint32(20)};
  });
  assert.deepEqual(actual,{type:'image/png',w:64,h:48});
 });
 await scenario('CSV Cleaner removes duplicate rows without changing data',async page=>{
  await open(page,'/tools/csv-cleaner/');
  const out=await page.evaluate(async()=>{
  const {processWave2}=await import('/tools/wave2-core.mjs');
  const file=new File(['name,code\n Alice ,0012\n Alice ,0012\n'],'raw.csv',{type:'text/csv'});
  const result=await processWave2('csv-cleaner',[file],{});
  return await result.blob.text();
 });
 assert.equal(out,'name,code\r\nAlice,0012\r\n');
 });
 await scenario('ZIP Extractor returns original file bytes safely',async page=>{
  await open(page,'/tools/zip-extractor/');
  const out=await page.evaluate(async()=>{
   const {processWave2}=await import('/tools/wave2-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const zip=new JSZip();zip.file('alpha.txt','Hello');zip.file('beta.txt','World');
   const file=new File([await zip.generateAsync({type:'uint8array'})],'archive.zip',{type:'application/zip'});
   const result=await processWave2('zip-extractor',[file],{});
   const values=await Promise.all(result.downloads.map(async x=>[x.filename,await x.blob.text()]));
   return values.sort((a,b)=>a[0].localeCompare(b[0]));
  });
  assert.deepEqual(out,[['alpha.txt','Hello'],['beta.txt','World']]);
 });
 await scenario('Resume Builder produces a valid PDF document',async page=>{
  await open(page,'/tools/resume-builder/');
  const out=await page.evaluate(async()=>{
   const {processWave2}=await import('/tools/wave2-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const result=await processWave2('resume-builder',[],{fullName:'QA Person',email:'qa@example.com',experience:'Worked on testing web tools.'});
   const bytes=new Uint8Array(await result.blob.arrayBuffer());
   const pdf=await PDFDocument.load(bytes);
   return {signature:String.fromCharCode(...bytes.slice(0,5)),pages:pdf.getPageCount()};
  });
  assert.equal(out.signature,'%PDF-');assert.ok(out.pages>=1&&out.pages<=4);
 });
 await scenario('Image Collage Maker exports expected two-photo PNG dimensions',async page=>{
  await open(page,'/tools/image-collage-maker/');
  const out=await page.evaluate(async()=>{
   const {processWave2}=await import('/tools/wave2-core.mjs');const canvas=document.createElement('canvas');canvas.width=12;canvas.height=10;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ab3725';ctx.fillRect(0,0,12,10);
   const img=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const a=new File([img],'a.png',{type:'image/png'});
   const b=new File([img],'b.png',{type:'image/png'});
   const result=await processWave2('image-collage-maker',[a,b],{columns:'2',format:'png'});
   const bytes=new Uint8Array(await result.blob.arrayBuffer());
   const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   return {mime:result.blob.type,width:v.getUint32(16),height:v.getUint32(20)};
  });
  assert.deepEqual(out,{mime:'image/png',width:1502,height:588});
 });
 await scenario('PDF Form Filler saves entered field values correctly',async page=>{
  await open(page,'/tools/pdf-form-filler/');
  const out=await page.evaluate(async()=>{
   const {processWave2}=await import('/tools/wave2-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');const doc=await PDFDocument.create(),p=doc.addPage([300,300]);
   const form=doc.getForm(),field=form.createTextField('person');
   field.setText('Before');field.addToPage(p,{x:30,y:220,width:150,height:25});
   const file=new File([await doc.save()],'form.pdf',{type:'application/pdf'});
   const result=await processWave2('pdf-form-filler',[file],{values:{person:'After'}});
   const output=await PDFDocument.load(await result.blob.arrayBuffer());
   return {value:output.getForm().getTextField('person').getText(),pages:output.getPageCount()};
  });
  assert.deepEqual(out,{value:'After',pages:1});
 });
 await scenario('PDF Flatten converts editable form into final PDF',async page=>{
  await open(page,'/tools/pdf-flatten/');
  const out=await page.evaluate(async()=>{
   const {processWave2}=await import('/tools/wave2-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');const doc=await PDFDocument.create(),p=doc.addPage([300,300]);
   const form=doc.getForm(),field=form.createTextField('person');
   field.setText('Before');field.addToPage(p,{x:30,y:220,width:150,height:25});
   const file=new File([await doc.save()],'form.pdf',{type:'application/pdf'});
   const result=await processWave2('pdf-flatten',[file],{});
   const output=await PDFDocument.load(await result.blob.arrayBuffer());
   return {pages:output.getPageCount(),fields:output.getForm().getFields().length};
  });
  assert.deepEqual(out,{pages:1,fields:0});
 });
 await scenario('Color Picker from Image reads exact red center pixel',async page=>{
  await open(page,'/tools/image-color-picker/');
  const actual=await page.evaluate(async()=>{
   const {pickImageColor}=await import('/tools/wave6-image-core.mjs');const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,120,80);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([png],'synthetic.png',{type:'image/png'});
   const out=await pickImageColor(file,{x:.5,y:.5});
   return {color:out.swatch,red:out.values.r,green:out.values.g,blue:out.values.b};
  });
  assert.deepEqual({...actual,color:actual.color.toLowerCase()},{color:'#ff0000',red:255,green:0,blue:0});
 });
 await scenario('Pixel Art Maker exports same-sized valid PNG',async page=>{
  await open(page,'/tools/pixel-art-maker/');
  const actual=await page.evaluate(async()=>{
   const {makePixelArt}=await import('/tools/wave6-image-core.mjs');const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,120,80);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([png],'synthetic.png',{type:'image/png'});
   const out=await makePixelArt(file,{block:12,colors:8});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   return {mime:out.blob.type,w:v.getUint32(16),h:v.getUint32(20)};
  });
  assert.deepEqual(actual,{mime:'image/png',w:120,h:80});
 });
 await scenario('Meme Maker exports valid PNG with original dimensions',async page=>{
  await open(page,'/tools/meme-maker/');
  const actual=await page.evaluate(async()=>{
   const {createMeme}=await import('/tools/wave6-image-core.mjs');const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,120,80);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([png],'synthetic.png',{type:'image/png'});
   const out=await createMeme(file,{top:'QA TEST',bottom:'LOCAL ONLY',fontSize:1});
   const bytes=new Uint8Array(await out.blob.arrayBuffer());
   const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   return {mime:out.blob.type,w:v.getUint32(16),h:v.getUint32(20),size:bytes.length};
  });
  assert.equal(actual.mime,'image/png');assert.equal(actual.w,120);assert.equal(actual.h,80);
  assert.ok(actual.size>100);
 });
 await scenario('Image Publishing Pack creates three correctly named image assets',async page=>{
  await open(page,'/tools/image-publishing-pack/');
  const output=await page.evaluate(async()=>{
   const {makeImagePublishingPack}=await import('/tools/wave7-file-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#1d8a55';ctx.fillRect(0,0,80,60);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([png],'sample.png',{type:'image/png'});
   const pack=await makeImagePublishingPack(file,{});
   const zip=await JSZip.loadAsync(await pack.blob.arrayBuffer());
   const files=Object.keys(zip.files);
   const webpAsset=await zip.file('square-thumbnail.webp')?.async('uint8array');
   const jpeg=await zip.file('social-share-image.jpg')?.async('uint8array');
   return {files,webp:String.fromCharCode(...webpAsset.slice(0,4)),jpeg:[...jpeg.slice(0,2)]};
  });
  assert.ok(output.files.includes('website-image.webp')&&output.files.includes('README.txt'));
  assert.ok(output.files.includes('square-thumbnail.webp')&&output.files.includes('social-share-image.jpg'));
  assert.equal(output.webp,'RIFF');assert.deepEqual(output.jpeg,[255,216]);
 });
 await scenario('Images to PowerPoint exports valid PPTX slide and media',async page=>{
  await open(page,'/tools/images-to-powerpoint/');
  const result=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#1d8a55';ctx.fillRect(0,0,80,60);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([png],'sample.png',{type:'image/png'});
   const out=await processFileTool('images-to-powerpoint',[file],{});
   const zip=await JSZip.loadAsync(await out.blob.arrayBuffer());
   return {mime:out.blob.type,files:Object.keys(zip.files)};
  });
  assert.ok(['application/zip','application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(result.mime));
  assert.ok(result.files.includes('ppt/slides/slide1.xml'));
  assert.ok(result.files.some(name=>name.startsWith('ppt/media/')));
 });
 await scenario('PowerPoint Text Extractor correctly reports an image-only slide',async page=>{
  await open(page,'/tools/powerpoint-text-extractor/');
  const result=await page.evaluate(async()=>{
   const {processFileTool}=await import('/tools/file-core.mjs');const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#1d8a55';ctx.fillRect(0,0,80,60);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([png],'sample.png',{type:'image/png'});
   const powerpoint=await processFileTool('images-to-powerpoint',[file],{});
   const pptx=new File([powerpoint.blob],'sample.pptx',{type:powerpoint.blob.type});
   const out=await processFileTool('powerpoint-text-extractor',[pptx],{});
   return out.text||await out.blob.text();
  });
  assert.match(result,/Slide 1/);
  assert.match(result,/No extractable text/);
 });
 await scenario('PDF to Text extracts real selectable text',async page=>{
  await open(page,'/tools/pdf-to-text/');
  const out=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');const {PDFDocument,StandardFonts,rgb}=await import('/tools/vendor/pdf-lib.mjs');
   const pdf=await PDFDocument.create(),p=pdf.addPage([240,180]);
   const font=await pdf.embedFont(StandardFonts.Helvetica);
   p.drawText('QA searchable text',{x:25,y:90,size:14,font,color:rgb(0,0,0)});
   const file=new File([await pdf.save()],'synthetic.pdf',{type:'application/pdf'});
   const result=await processWave1('pdf-to-text',[file],{});
   return await result.blob.text();
  });
  assert.match(out,/QA searchable text/);assert.match(out,/Page 1/);
 });
 await scenario('PDF to Images rasterizes real page into valid PNG',async page=>{
  await open(page,'/tools/pdf-to-images/');
  const out=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');const {PDFDocument,StandardFonts,rgb}=await import('/tools/vendor/pdf-lib.mjs');
   const pdf=await PDFDocument.create(),p=pdf.addPage([240,180]);
   const font=await pdf.embedFont(StandardFonts.Helvetica);
   p.drawText('QA searchable text',{x:25,y:90,size:14,font,color:rgb(0,0,0)});
   const file=new File([await pdf.save()],'synthetic.pdf',{type:'application/pdf'});
   const result=await processWave1('pdf-to-images',[file],{format:'png',scale:'1'});
   const bytes=new Uint8Array(await result.blob.arrayBuffer());
   const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
   return {mime:result.blob.type,header:[...bytes.slice(0,8)],w:v.getUint32(16),h:v.getUint32(20)};
  });
  assert.equal(out.mime,'image/png');
  assert.deepEqual(out.header,[137,80,78,71,13,10,26,10]);
  assert.equal(out.w,240);assert.equal(out.h,180);
 });
 await scenario('QR Code Scanner decodes locally generated QR payload',async page=>{
  await open(page,'/tools/qr-code-scanner/');
  const out=await page.evaluate(async()=>{
   const {runUtility}=await import('/tools/utility-core.mjs');
   const {processWave1}=await import('/tools/wave1-core.mjs');
   const qr=(await runUtility('qr-code-generator',{text:'https://example.com/qa',correction:'M'})).text;
   const fileSvg=new Blob([qr],{type:'image/svg+xml'}),url=URL.createObjectURL(fileSvg),image=new Image();
   try{
    image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth*2;canvas.height=image.naturalHeight*2;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const file=new File([png],'synthetic.png',{type:'image/png'});
    const result=await processWave1('qr-code-scanner',[file],{});
    return await result.blob.text();
   }finally{URL.revokeObjectURL(url);}
  });
  assert.equal(out,'https://example.com/qa');
 });

 await scenario('Image Privacy Redactor permanently blacks out selected pixels',async page=>{
  await open(page,'/tools/image-privacy-redactor/');
  const output=await page.evaluate(async()=>{
   const {maskImage}=await import('/tools/image-mask-core.mjs');
   const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ed1721';ctx.fillRect(0,0,100,100);
   const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([image],'synthetic.png',{type:'image/png'});
   const result=await maskImage(file,[{x:.2,y:.2,w:.6,h:.6}],{mode:'blackout',format:'png'});
   const bitmap=await createImageBitmap(result.blob),out=document.createElement('canvas');
   out.width=bitmap.width;out.height=bitmap.height;const dest=out.getContext('2d');
   dest.drawImage(bitmap,0,0);
   const center=Array.from(dest.getImageData(50,50,1,1).data);
   const corner=Array.from(dest.getImageData(0,0,1,1).data);
   bitmap.close();
   return {center,corner,size:result.blob.size};
  });
  assert.deepEqual(output.center,[0,0,0,255]);
  assert.ok(output.corner[0]>170&&output.corner[1]<70&&output.corner[2]<70);
  assert.ok(output.size>100);
 });
 await scenario('Document Scanner produces an image-only one-page PDF',async page=>{
  await open(page,'/tools/document-scanner/');
  const details=await page.evaluate(async()=>{
   const {scanDocument}=await import('/tools/wave6-scanner-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const canvas=document.createElement('canvas');canvas.width=60;canvas.height=80;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,60,80);
   ctx.fillStyle='#000';ctx.fillRect(10,10,40,60);
   const source=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([source],'scan.png',{type:'image/png'});
   const output=await scanDocument(file,{mode:'color',format:'pdf'});
   const pdf=await PDFDocument.load(await output.blob.arrayBuffer());
   return {mime:output.blob.type,pages:pdf.getPageCount(),width:Math.round(pdf.getPage(0).getWidth())};
  });
  assert.deepEqual(details,{mime:'application/pdf',pages:1,width:595});
 });
 await scenario('PDF Comparison exports a pixel comparison ZIP with truthful no-change report',async page=>{
  await open(page,'/tools/pdf-compare/');
  const report=await page.evaluate(async()=>{
   const {comparePdfs}=await import('/tools/pdf-compare-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const {default:JSZip}=await import('/tools/vendor/jszip.mjs');
   const doc=await PDFDocument.create();doc.addPage([190,210]);
   const bytes=await doc.save();
   const f1=new File([bytes],'before.pdf',{type:'application/pdf'});
   const f2=new File([bytes],'after.pdf',{type:'application/pdf'});
   const out=await comparePdfs([f1,f2],{});
   const zip=await JSZip.loadAsync(await out.blob.arrayBuffer());
   return {filename:out.filename,readme:await zip.file('README.txt').async('string'),
    hasImage:!!zip.file('page-1-comparison.png')};
  });
  assert.match(report.filename,/\.zip$/);assert.ok(report.hasImage);
  assert.match(report.readme,/0\.00% rendered pixels differ/);
 });
 await scenario('PDF Redaction exports flattened PDF with original selectable text removed',async page=>{
  await open(page,'/tools/pdf-redaction/');
  const output=await page.evaluate(async()=>{
   const {redactPdf}=await import('/tools/pdf-redaction-core.mjs');
   const {PDFDocument,StandardFonts}=await import('/tools/vendor/pdf-lib.mjs');
   const doc=await PDFDocument.create(),page=doc.addPage([300,250]);
   const font=await doc.embedFont(StandardFonts.Helvetica);
   page.drawText('SECRET-TEST-ONLY',{x:55,y:130,font,size:16});
   const source=new File([await doc.save()],'private.pdf',{type:'application/pdf'});
   const edited=await redactPdf(source,[{page:1,x:.1,y:.2,w:.8,h:.6}]);
   const bytes=new Uint8Array(await edited.blob.arrayBuffer());
   const pdf=await PDFDocument.load(bytes);
   return {pages:pdf.getPageCount(),mime:edited.blob.type,
    containsText:new TextDecoder('latin1').decode(bytes).includes('SECRET-TEST-ONLY')};
  });
  assert.equal(output.pages,1);assert.equal(output.mime,'application/pdf');
  assert.equal(output.containsText,false);
 });
 await scenario('Voice Recorder captures locally generated microphone audio',async page=>{
  await open(page,'/tools/voice-recorder/');
  const value=await page.evaluate(async()=>{
   const {beginVoiceRecording}=await import('/tools/wave7-audio-core.mjs');
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   const ctx=new AudioCtx(),osc=ctx.createOscillator(),dest=ctx.createMediaStreamDestination();
   osc.frequency.value=440;osc.connect(dest);osc.start();
   const media=navigator.mediaDevices,previous=media.getUserMedia;
   Object.defineProperty(media,'getUserMedia',{configurable:true,value:async()=>dest.stream});
   try{
    const recording=await beginVoiceRecording();
    await new Promise(resolve=>setTimeout(resolve,1100));
    recording.stop();
    const out=await recording.complete;
    const bytes=new Uint8Array(await out.blob.arrayBuffer());
    return {type:out.blob.type,size:bytes.length,filename:out.filename};
   }finally{
    Object.defineProperty(media,'getUserMedia',{configurable:true,value:previous});
    osc.stop();await ctx.close();
   }
  });
  assert.match(value.type,/^audio\/(?:webm|mp4|ogg)$/);
  assert.ok(value.size>150,'Synthetic microphone output must contain recorded media');
  assert.match(value.filename,/\.(?:webm|m4a|ogg)$/);
 });
 await scenario('Screen Recorder captures a local synthetic canvas display stream',async page=>{
  await open(page,'/tools/screen-recorder/');
  const output=await page.evaluate(async()=>{
   const {beginScreenRecording}=await import('/tools/screen-record-core.mjs');
   const canvas=document.createElement('canvas');canvas.width=160;canvas.height=120;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ff3131';ctx.fillRect(0,0,160,120);
   const stream=canvas.captureStream(15);
   const media=navigator.mediaDevices,original=media.getDisplayMedia;
   Object.defineProperty(media,'getDisplayMedia',{configurable:true,value:async()=>stream});
   try{
    const session=await beginScreenRecording();
    for(let i=0;i<9;i++){
     ctx.fillStyle=i%2?'#3ecc77':'#ff3131';
     ctx.fillRect(0,0,160,120);
     await new Promise(resolve=>setTimeout(resolve,130));
    }
    session.stop();const saved=await session.complete;
    const bytes=new Uint8Array(await saved.blob.arrayBuffer());
    return {size:bytes.length,type:saved.blob.type,header:[...bytes.slice(0,4)]};
   }finally{
    Object.defineProperty(media,'getDisplayMedia',{configurable:true,value:original});
    stream.getTracks().forEach(track=>track.stop());
   }
  });
  assert.ok(output.size>500,'Recorded screen stream cannot be empty');
  assert.ok(['video/webm','video/mp4'].includes(output.type));
  if(output.type==='video/webm')assert.deepEqual(output.header,[26,69,223,163]);
 });
 await scenario('HEIC to JPG converts a genuine synthetic HEIC image',async page=>{
  const {readFile}=await import('node:fs/promises');
  const source=process.env.YORPHIVES_TEST_HEIC;
  assert.ok(source,'A genuine HEIC test fixture must be generated');
  // Test the candidate source module against the live, read-only page without deploying it.
  const candidate=await readFile(new URL('../tools/wave3-core.mjs',import.meta.url),'utf8');
  const decoder=await readFile(new URL('../node_modules/heic-to/dist/csp/heic-to.js',import.meta.url),'utf8');
  await page.route('**/tools/vendor/heic/heic-to.mjs',route=>route.fulfill({
   status:200,contentType:'text/javascript',body:decoder,
   headers:{'access-control-allow-origin':'*','cache-control':'no-store'}
  }));
  await page.route('**/tools/wave3-core.mjs',route=>route.fulfill({
   status:200,contentType:'text/javascript',body:candidate,
   headers:{'access-control-allow-origin':'*','cache-control':'no-store'}
  }));
  await open(page,'/tools/heic-to-jpg/');
  const input=await readFile(source);
  const output=await page.evaluate(async encoded=>{
   const {processWave3}=await import('/tools/wave3-core.mjs');
   const bytes=Uint8Array.from(atob(encoded),x=>x.charCodeAt(0));
   const file=new File([bytes],'synthetic.heic',{type:'image/heic'});
   const result=await processWave3('heic-to-jpg',[file],{format:'jpeg',quality:'.9'});
   const decoded=await createImageBitmap(result.blob);
   try{return {type:result.blob.type,w:decoded.width,h:decoded.height,size:result.blob.size};}
   finally{decoded.close();}
  },input.toString('base64'));
  assert.equal(output.type,'image/jpeg');
  assert.equal(output.w,64);assert.equal(output.h,48);
  assert.ok(output.size>80);
 });
 await scenario('Image OCR reads clear synthetic English lettering locally',async page=>{
  await open(page,'/tools/image-ocr/');
  const output=await page.evaluate(async()=>{
   const {processWave1}=await import('/tools/wave1-core.mjs');
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=210;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,720,210);
   ctx.fillStyle='#000';ctx.font='bold 92px Arial';ctx.fillText('HELLO QA',45,142);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const file=new File([png],'qa-lettering.png',{type:'image/png'});
   const result=await processWave1('image-ocr',[file],{});
   return result.text||await result.blob.text();
  });
  assert.match(output,/HELLO/i);
 });
 await scenario('Scanned PDF OCR exports a valid searchable document',async page=>{
  await open(page,'/tools/scanned-pdf-to-searchable-pdf/');
  const output=await page.evaluate(async()=>{
   const {makeSearchablePdf}=await import('/tools/ocr-pdf-core.mjs');
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=210;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,720,210);
   ctx.fillStyle='#000';ctx.font='bold 92px Arial';ctx.fillText('HELLO QA',45,142);
   const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const doc=await PDFDocument.create(),embed=await doc.embedPng(await png.arrayBuffer());
   const pg=doc.addPage([720,210]);pg.drawImage(embed,{x:0,y:0,width:720,height:210});
   const file=new File([await doc.save()],'synthetic-scanned.pdf',{type:'application/pdf'});
   const result=await makeSearchablePdf(file,{});
   const parsed=await PDFDocument.load(await result.blob.arrayBuffer());
   return {type:result.blob.type,pages:parsed.getPageCount(),bytes:result.blob.size};
  });
  assert.equal(output.type,'application/pdf');assert.equal(output.pages,1);
  assert.ok(output.bytes>200);
 });
 await scenario('PDF Merge combines two local files',async page=>{
  await open(page,'/tools/pdf-merge/');
  // Create real, non-personal documents in the browser from the site's pinned PDF library.
  const pdf=await page.evaluate(async()=>{
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const doc=await PDFDocument.create();doc.addPage([200,200]);
   return Array.from(await doc.save());
  });
  await page.locator('#file-input').setInputFiles([
   {name:'synthetic-one.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)},
   {name:'synthetic-two.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)}
  ]);
  await page.waitForFunction(()=>!document.querySelector('#file-run').disabled,{timeout:15000});
  await page.locator('#file-run').click();
  await page.waitForFunction(()=>!document.querySelector('#file-download').hidden&&document.querySelector('#file-download').href.startsWith('blob:'),{timeout:20000});
  // Exercise the actual download; fetching blob: from the page is intentionally
  // blocked by the site's connect-src policy.
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#file-download').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const {PDFDocument}=await import('../tools/vendor/pdf-lib.mjs');
  const count=(await PDFDocument.load(Buffer.concat(chunks))).getPageCount();
  assert.equal(count,2,'Merged document should contain two pages');
 });
 // PRs point at the existing live site; candidate PDF functionality is tested
 // separately against the local build before the fix is deployed.
 if(process.env.GITHUB_EVENT_NAME!=='pull_request')await scenario('PDF Compressor returns a usable local PDF',async page=>{
  await open(page,'/tools/pdf-compressor/');
  const pdf=await page.evaluate(async()=>{
   const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
   const doc=await PDFDocument.create();doc.addPage([200,200]);
   return Array.from(await doc.save());
  });
  await page.locator('#pdf-compressor-file').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
  await page.waitForFunction(()=>document.querySelector('#pdf-compressor-status').classList.contains('error')||
   (!document.querySelector('#pdf-compressor-download').hidden&&document.querySelector('#pdf-compressor-download').href.startsWith('blob:')),null,{timeout:60000});
  if(await page.locator('#pdf-compressor-status').evaluate(el=>el.classList.contains('error')))
   throw Error('PDF Compressor: '+await page.locator('#pdf-compressor-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#pdf-compressor-download').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const {PDFDocument}=await import('../tools/vendor/pdf-lib.mjs');
  assert.equal((await PDFDocument.load(Buffer.concat(chunks))).getPageCount(),1);
 });
 await scenario('AI Background Remover produces a local PNG and records one completion',async page=>{
  await open(page,'/tools/ai-background-remover/');
  const png=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,128,128);
   ctx.fillStyle='#2454aa';ctx.fillRect(24,24,80,80);
   return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.evaluate(()=>{window.__syntheticCompletionCount=0;window.addEventListener('yorphives:tool-completed',()=>window.__syntheticCompletionCount++);});
  await page.locator('#ai-file').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.locator('#ai-run').click();
  await page.waitForFunction(()=>!document.querySelector('#ai-result').hidden&&document.querySelector('#ai-download').href.startsWith('blob:'),null,{timeout:120000});
  // PRs exercise the currently live site, which can legitimately predate the
  // candidate's completion signal. After release, require the new event.
  const completions=await page.evaluate(()=>window.__syntheticCompletionCount);
  if(process.env.GITHUB_EVENT_NAME==='pull_request')assert.ok(completions<=1);
  else assert.equal(completions,1);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#ai-download').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  assert.deepEqual([...Buffer.concat(chunks).subarray(0,8)],[137,80,78,71,13,10,26,10]);
 });
 // PR checks point at the old live site; the local candidate is exercised by
 // pdf-integrity-browser-qa. Production monitoring verifies the real release.
 if(process.env.GITHUB_EVENT_NAME!=='pull_request')await scenario('Invoice preserves text and consistent totals locally',async page=>{
  await open(page,'/tools/invoice-generator/');
  await page.locator('[name="business"]').fill('Café भारत हिन्दी');
  await page.locator('[name="client"]').fill('Synthetic client');
  await page.locator('[name="currency"]').fill('INR');
  await page.locator('[name="tax"]').fill('0');
  const description='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  await page.locator('[name="items"]').fill(description+' | 0.5 | 0.67\nSecond | 0.5 | 0.67');
  await page.locator('#wave1-run').click();
  await page.waitForFunction(()=>!document.querySelector('#wave1-download').hidden||document.querySelector('#wave1-status').classList.contains('error'),null,{timeout:60000});
  if(await page.locator('#wave1-status').evaluate(el=>el.classList.contains('error')))
   throw Error('Invoice: '+await page.locator('#wave1-status').innerText());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave1-download').click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=pdfjs.getDocument({data:new Uint8Array(Buffer.concat(chunks)),useSystemFonts:true});
  const doc=await task.promise,items=(await (await doc.getPage(1)).getTextContent()).items.map(x=>x.str).join('');
  assert.ok(items.includes('Café भारत हिन्दी'));
  assert.ok(items.replace(/\s/g,'').includes(description));
  assert.ok(items.includes('Subtotal: INR 0.68')&&items.includes('Amount due: INR 0.68'));
  await task.destroy();
 });
 await scenario('Mobile layout stays readable across key pages',async(page,context)=>{
  await page.setViewportSize({width:390,height:844});
  for(const path of ['/','/tools/','/tools/word-counter/','/tools/json-formatter/','/tools/image-resizer/']){
   await open(page,path);
   // Wait for this page's own async requests to settle before navigating away.
   // Rapid navigation used to abort live first-party requests and throw 'Failed to fetch'.
   await page.waitForLoadState('networkidle',{timeout:10000}).catch(async()=>{await page.waitForTimeout(750)});
   const layout=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(layout.scroll<=layout.client+8,path+' horizontal overflow: '+JSON.stringify(layout));
  }
 });
 assert.deepEqual(unexpectedWrites,[],'Unexpected browser write or upload requests');
}finally{
 await Promise.race([
  browser.close().catch(()=>{}),
  new Promise(resolve=>setTimeout(()=>{try{browser.process()?.kill('SIGKILL')}catch{}resolve()},10000))
 ]);
}
for(const r of results)console.log((r.passed?'PASS ':'FAIL ')+r.name+(r.error?' — '+r.error:''));
const passed=results.filter(r=>r.passed).length;
console.log('HEALTH BROWSER SMOKE: '+passed+'/'+results.length+' passed; synthetic local inputs; analytics blocked.');
if(process.env.YORPHIVES_QA_RESULTS){
 const dest=process.env.YORPHIVES_QA_RESULTS;
 await mkdir(dirname(dest),{recursive:true});
 await writeFile(dest,JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),complete:true,scenarios:results,unexpectedWrites},null,2)+'\n');
}
if(passed!==results.length)process.exitCode=1;
