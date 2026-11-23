// Real Chromium checks against a local candidate; inputs are synthetic and no data is uploaded.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import * as pdfjs from '../dist/tools/vendor/pdfjs/pdf.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({baseURL:'http://127.0.0.1:8765',serviceWorkers:'block'});
const writes=[];
await context.addInitScript(()=>localStorage.setItem('yorphives-anonymous-analytics-disabled','1'));
await context.route('**/api/insights/collect',route=>route.fulfill({status:204,body:''}));
context.on('request',request=>{
 if(['POST','PUT','PATCH','DELETE'].includes(request.method())&&!request.url().endsWith('/api/insights/collect'))
  writes.push(request.method()+' '+request.url());
});
const page=await context.newPage();
async function open(path){
 const response=await page.goto(path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,path);
 await page.locator('#wave4-run').waitFor({state:'visible'});
}
async function create(){
 await page.locator('#wave4-run').click();
 await page.waitForFunction(()=>!document.querySelector('#wave4-output').hidden||
  document.querySelector('#wave4-status').classList.contains('error'),null,{timeout:60000});
 if(await page.locator('#wave4-status').evaluate(el=>el.classList.contains('error')))
  throw Error('Document creation failed: '+await page.locator('#wave4-status').innerText());
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wave4-output a[download]').click()]);
 const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
 const task=pdfjs.getDocument({data:new Uint8Array(Buffer.concat(chunks)),useSystemFonts:true});
 const pdf=await task.promise,pages=[];
 for(let n=1;n<=pdf.numPages;n++)pages.push((await (await pdf.getPage(n)).getTextContent()).items.map(x=>x.str).join(''));
 await task.destroy();return pages;
}
try{
 await open('/tools/quotation-generator/');
 await page.locator('[name="business"]').fill('Café भारत हिन्दी');
 await page.locator('[name="client"]').fill('Renée محمد');
 await page.locator('[name="currency"]').fill('INR');
 await page.locator('[name="tax"]').fill('18');
 await page.locator('[name="items"]').fill('Service | 3 | 0.335');
 const notes=Array.from({length:40},(_,i)=>'Condition '+String(i+1).padStart(2,'0')+' applies.');
 await page.locator('[name="notes"]').fill(notes.join('\n'));
 const quote=await create(),quotation=quote.join('');
 assert.ok(quote.length>1);
 for(const text of ['Café भारत हिन्दी','Renée محمد','0.335','INR 1.19',...notes])
  assert.ok(quotation.includes(text),'Quotation omitted '+text);
 for(const value of ['Unsupported 😀','漢字']){
  await page.locator('[name="business"]').fill(value);
  await page.locator('#wave4-run').click();
  await page.getByText('Some characters are not supported yet, such as emoji or certain scripts. Your text has not been changed.').waitFor({timeout:30000});
  assert.ok(await page.locator('#wave4-output').isHidden());
  assert.equal(await page.locator('[name="business"]').inputValue(),value);
 }
 await open('/tools/certificate-generator/');
 await page.locator('[name="recipient"]').fill('अनिता José');
 await page.locator('[name="title"]').fill('सफलता');
 await page.locator('[name="organization"]').fill('Café भारत');
 const details=Array.from({length:35},(_,i)=>'Achievement '+String(i+1).padStart(2,'0')+' completed.');
 await page.locator('[name="detail"]').fill(details.join('\n'));
 const certificate=await create(),text=certificate.join('');
 assert.ok(certificate.length>1);
 for(const value of ['अनिता José','सफलता','Café भारत',...details])assert.ok(text.includes(value),'Certificate omitted '+value);
 assert.deepEqual(writes,[],'Document generation must not upload inputs');
 console.log('PASS: quotation and certificate preserve multilingual text, exact amounts and long content locally.');
}finally{await context.close();await browser.close();}
