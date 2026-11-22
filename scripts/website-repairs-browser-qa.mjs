// Browser checks for visitor journeys affected by the website repairs.
// Uses only the local production build; no real enquiries or analytics are sent.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+path,path.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+sep))return res.writeHead(403).end();
  const body=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(body);
 }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 const launchOptions={headless:true};
 if(process.env.CHROMIUM_PATH)launchOptions.executablePath=process.env.CHROMIUM_PATH;
 browser=await chromium.launch(launchOptions);
 for(const [width,height] of [[320,750],[390,844],[1280,900]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await page.locator('#home .hero-actions a[href="#tools"]').click();
   await page.locator('#tool-search').waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('#tools-count-big')?.textContent==='143');
   for(const [query,name] of [['compress pdf','PDF Compressor'],['pdf compress','PDF Compressor'],['reduce pdf size','PDF Compressor'],['combine pdfs','Merge PDF Files'],['pdf compresor','PDF Compressor'],['word counter','Word & Character Counter'],['convert jpg to pdf','Images to PDF'],['pdf to jpg','PDF to JPG or PNG'],['split pdf','Extract PDF Pages']]){
    await page.locator('#tool-search').fill(query);
    assert.ok(await page.locator('#tool-results .tool-card h3').filter({hasText:name}).first().isVisible(),query+' at '+width+'px');
   }
   await page.locator('#tool-search').fill('word counter');
   await page.getByRole('button',{name:'Writing',exact:true}).click();
   assert.ok(await page.locator('#tool-results .tool-card h3').filter({hasText:'Word & Character Counter'}).first().isVisible());
   await page.locator('#reset-tool-filters').click();
   assert.equal(await page.locator('#tool-search').inputValue(),'');
   assert.match(await page.locator('#tool-results-count').innerText(),/143 results/);
   await page.locator('#tool-search').fill('pdf unicorn');
   assert.ok(await page.locator('#tool-suggestions a').first().isVisible(),'Partial matches should suggest an actual tool');
   await page.goto(origin+'/tools/');
   await page.locator('#directory-search').fill('combine pdfs');
   assert.ok(await page.locator('.directory-card').filter({hasText:'Merge PDF Files'}).isVisible());
   await page.locator('#directory-search').fill('convert jpg to pdf');
   assert.ok(await page.locator('.directory-card').filter({hasText:'Images to PDF'}).isVisible());
   assert.ok(!(await page.locator('.directory-card').filter({hasText:'PDF to JPG or PNG'}).isVisible()));
   await page.locator('#directory-search').fill('split pdf');
   assert.ok(await page.locator('.directory-card').filter({hasText:'Extract PDF Pages'}).isVisible());
   await page.locator('#directory-search').fill('pdf unicorn');
   assert.ok(await page.locator('.directory-suggestions a').first().isVisible());
   await page.goto(origin+'/#home');
   await page.locator('#home .hero-actions a[href="#hqconnect"]').click();
   assert.equal(new URL(page.url()).hash,'#hqconnect');
   assert.equal(await page.locator('#contact-form .hqconnect-privacy a').getAttribute('href'),'/privacy/');
   if(width===390){
    let responseStatus=400,attempts=0;
    await page.route('**/api/hqconnect',route=>{attempts++;return route.fulfill({status:responseStatus,contentType:'application/json',body:JSON.stringify({ok:responseStatus===201,reference:'testonly'})});});
    await page.locator('[name="name"]').fill('J');
    await page.locator('[name="email"]').fill('test@example.org');
    await page.locator('[name="message"]').fill('A synthetic project description for this test.');
    await page.locator('[name="consent"]').check();
    await page.locator('#contact-form [type="submit"]').click();
    await page.getByText('Please check your name, email and project description, then try again.').waitFor();
    assert.equal(await page.locator('[name="name"]').inputValue(),'J');
    responseStatus=429;
    await page.locator('#contact-form [type="submit"]').click();
    await page.getByText('Too many requests were sent. Please wait a minute and try again.').waitFor();
    responseStatus=201;
    await page.locator('#contact-form [type="submit"]').click();
    await page.getByText(/Request received. Reference: testonly/).waitFor();
    assert.equal(attempts,3);
    assert.equal(await page.locator('[name="name"]').inputValue(),'');
   }
   assert.equal(await page.locator('.site-footer a[href="/privacy/"]').count(),1);
   assert.ok(await page.locator('#kofi-support').isDisabled());
   await page.goto(origin+'/#ventures');
   await page.locator('#venture-hero-label').waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('#venture-hero-label')?.textContent!=='Checking public launches…');
   assert.equal(await page.locator('#venture-hero-label').textContent(),'Products in development');
   assert.ok(await page.locator('#venture-products a[href="#tools"]').isVisible());
   await page.goto(origin+'/tools/pdf-compressor/');
   const warning=page.locator('#pdf-compressor-warning');
   assert.ok(await warning.isVisible());
   assert.match(await warning.innerText(),/searchable text, links, forms or signatures/);
   assert.match(await page.locator('#pdf-compressor-file').getAttribute('aria-describedby'),/pdf-compressor-warning/);
   assert.ok((await warning.boundingBox()).y<(await page.locator('#pdf-compressor-file').boundingBox()).y);
   assert.ok(await page.locator('.tool-support').isDisabled());
   if(width===390){
    const pdf=await page.evaluate(async()=>{
     const {PDFDocument}=await import('/tools/vendor/pdf-lib.mjs');
     const doc=await PDFDocument.create();doc.addPage([200,200]);return Array.from(await doc.save());
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
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true,'horizontal overflow at '+width+'px');
   assert.deepEqual(errors,[]);
   console.log('PASS repaired journeys at '+width+'px');
  }finally{await page.close();}
 }
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
