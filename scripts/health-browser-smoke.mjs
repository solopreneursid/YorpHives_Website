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
