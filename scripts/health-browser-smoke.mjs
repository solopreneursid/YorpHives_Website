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
  assert.equal(bytes.readUInt32LE(24),sampleRate);
  assert.equal(bytes.readUInt32LE(40),sampleCount*2);
  assert.ok(bytes.readInt16LE(44+2*2)>wav.readInt16LE(44+2*2),'Volume adjustment must amplify source samples');
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
