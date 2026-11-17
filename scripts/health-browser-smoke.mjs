// Production read-only browser health check. No uploads or synthetic analytics.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const ORIGIN='https://yorphives.com';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],unexpectedWrites=[];
async function scenario(name,fn){
 const context=await browser.newContext({baseURL:ORIGIN,serviceWorkers:'block',viewport:{width:1280,height:820}});
 const page=await context.newPage(),errors=[];
 await context.route('**/api/insights/collect',route=>route.fulfill({status:204,body:''}));
 page.on('pageerror',e=>errors.push(e.message));
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
 await scenario('Mobile layout stays readable across key pages',async(page,context)=>{
  await page.setViewportSize({width:390,height:844});
  for(const path of ['/','/tools/','/tools/word-counter/','/tools/json-formatter/','/tools/image-resizer/']){
   await open(page,path);
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
