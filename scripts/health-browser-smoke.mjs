// Production read-only browser health check. No uploads or synthetic analytics.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const ORIGIN='https://yorphives.com';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],unexpectedWrites=[];
async function scenario(name,fn){
 const context=await browser.newContext({baseURL:ORIGIN,serviceWorkers:'block',viewport:{width:1280,height:820}});
 const page=await context.newPage(),errors=[];
 await context.addInitScript(()=>{localStorage.setItem('yorphives-anonymous-analytics-disabled','1');});
 await context.route('**/api/insights/collect',route=>route.fulfill({status:204,body:''}));
 page.on('pageerror',e=>errors.push(page.url()+': '+(e.stack||e.message).slice(0,350)));
 page.on('request',r=>{if(['POST','PATCH','PUT','DELETE'].includes(r.method())&&!r.url().endsWith('/api/insights/collect'))unexpectedWrites.push(r.method()+' '+r.url());});
 try{
  await fn(page,context);
  assert.deepEqual(errors,[],'Browser JavaScript exceptions: '+errors.join(' | '));
  results.push({name,passed:true});
 }catch(error){
  results.push({name,passed:false,error:String(error?.message||error).slice(0,450)});
 }finally{await context.close()}
}
async function open(page,path){
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
}finally{await browser.close()}
for(const r of results)console.log((r.passed?'PASS ':'FAIL ')+r.name+(r.error?' — '+r.error:''));
const passed=results.filter(r=>r.passed).length;
console.log('HEALTH BROWSER SMOKE: '+passed+'/'+results.length+' passed; synthetic local inputs; analytics blocked.');
if(passed!==results.length)process.exitCode=1;
