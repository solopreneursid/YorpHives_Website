// Real browser tests against the local candidate. Only synthetic data and
// files are used; no production enquiries, uploads, or analytics are sent.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {PDFDocument} from '../tools/vendor/pdf-lib.mjs';
import * as pdfjs from '../dist/tools/vendor/pdfjs/pdf.mjs';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({baseURL:'http://127.0.0.1:8765',serviceWorkers:'block'});
const writes=[];
await context.addInitScript(()=>localStorage.setItem('yorphives-anonymous-analytics-disabled','1'));
await context.route('**/api/insights/collect',route=>route.fulfill({status:204,body:''}));
context.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&!r.url().endsWith('/api/insights/collect'))writes.push(r.method()+' '+r.url())});
const page=await context.newPage();
const original=await PDFDocument.create();original.addPage([400,300]);const originalPdf=Buffer.from(await original.save());
async function open(path){
 const response=await page.goto(path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,path);
 await page.locator('#wave1-run').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('#wave1-run').disabled,null,{timeout:30000});
}
async function createPdf(){
 await page.locator('#wave1-run').click();
 await page.waitForFunction(()=>!document.querySelector('#wave1-download').hidden||document.querySelector('#wave1-status').classList.contains('error'),null,{timeout:60000});
 if(await page.locator('#wave1-status').evaluate(el=>el.classList.contains('error')))
  throw Error('Synthetic PDF creation failed: '+await page.locator('#wave1-status').innerText());
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave1-download').click()]);
 const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
 return Buffer.concat(chunks);
}
async function extract(bytes){
 const task=pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),doc=await task.promise,lines=[];
 for(let i=1;i<=doc.numPages;i++)lines.push((await (await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join(''));
 await task.destroy();return lines;
}
try{
 await open('/tools/invoice-generator/');
 await page.locator('[name="business"]').fill('Café भारत हिन्दी');
 await page.locator('[name="client"]').fill('Renée محمد');
 await page.locator('[name="currency"]').fill('INR');
 await page.locator('[name="tax"]').fill('0');
 const description='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 await page.locator('[name="items"]').fill(description+' | 0.5 | 0.67\nSecond | 0.5 | 0.67');
 const invoice=await createPdf(),lines=await extract(invoice),text=lines.join('');
 assert.ok(text.includes('Café भारत हिन्दी'));
 assert.ok(text.includes('Bill to: Renée محمد'));
 assert.ok(text.replace(/\s/g,'').includes(description));
 assert.ok(text.includes('Subtotal: INR 0.68'));assert.ok(text.includes('Amount due: INR 0.68'));
 // PDF.js renders the actual document in Chromium. Sample distinct areas so
 // invisible Unicode overlays cannot accidentally hide later invoice text.
 const ink=await page.evaluate(async b64=>{
  const lib=await import('/tools/vendor/pdfjs/pdf.mjs');
  lib.GlobalWorkerOptions.workerSrc='/tools/vendor/pdfjs/pdf.worker.mjs';
  const data=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),task=lib.getDocument({data});
  const doc=await task.promise,p=await doc.getPage(1),view=p.getViewport({scale:1}),canvas=document.createElement('canvas');
  canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);const ctx=canvas.getContext('2d');
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);await p.render({canvasContext:ctx,viewport:view}).promise;
  function count(y,h){const d=ctx.getImageData(30,y,535,h).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<190&&d[i+1]<190&&d[i+2]<190)n++;return n}
  const result={header:count(30,130),body:count(170,260),footer:count(790,40),png:canvas.toDataURL('image/png').split(',')[1]};await task.destroy();return result;
 },invoice.toString('base64'));
 await mkdir('pdf-integrity-qa',{recursive:true});
 await writeFile('pdf-integrity-qa/invoice.png',Buffer.from(ink.png,'base64'));
 await writeFile('pdf-integrity-qa/invoice.pdf',invoice);
 assert.ok(ink.header>100&&ink.body>100&&ink.footer>10,'Invoice content is not visibly rendered: '+JSON.stringify({header:ink.header,body:ink.body,footer:ink.footer}));
 const hindiDescription='व्यावसायिक डिजिटल समाधान और वेबसाइट विकास के लिए विस्तृत सेवा विवरण';
 await page.locator('[name="items"]').fill(hindiDescription+' | 2 | 17.55');
 const localized=(await extract(await createPdf())).join('').replace(/\s/g,'');
 assert.ok(localized.includes(hindiDescription.replace(/\s/g,'')),'A wrapped Hindi description lost characters');
 for(const unsupported of ['Unsupported 😀','漢字']){
  await page.locator('[name="business"]').fill(unsupported);
  await page.locator('#wave1-run').click();
  await page.getByText('Some characters are not supported yet, such as emoji or certain scripts. Your text has not been changed.').waitFor({timeout:30000});
  assert.ok(await page.locator('#wave1-download').isHidden());
  assert.equal(await page.locator('[name="business"]').inputValue(),unsupported);
 }

 for(const [path,field,value] of [
  ['/tools/pdf-watermark/','watermark','Café भारत हिन्दी'],
  ['/tools/pdf-visual-signature/','signature','Renée भारत हिन्दी'],
  ['/tools/pdf-visual-signature/','signature','Bill to: محمد']]){
  await open(path);
  await page.locator('#wave1-file').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:originalPdf});
  await page.locator('[name="'+field+'"]').fill(value);
  assert.ok((await extract(await createPdf())).join('').includes(value),path+' did not preserve the input');
 }
 assert.deepEqual(writes,[],'PDF generation must not upload user input');
 console.log('PASS PDF integrity: Hindi, accents, mixed Arabic, exact totals, complete descriptions, visible rendering, unsupported character warning, and local-only processing.');
}finally{await context.close();await browser.close()}
