// Real Chromium acceptance test of the isolated Workers Static Assets pilot.
// Synthetic local files only. All first-party analytics POSTs are stubbed to 204
// so the test does NOT write fake visitor data to the staging database.
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright';
const BASE='https://yorphives-edge-static-pilot.solopreneursid-proy.workers.dev';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--no-sandbox']});
let failed=0,passed=0;
const report=(label,ok,details='')=>{
  console.log((ok?'PASS ':'FAIL ')+label+(details?' — '+details:''));
  if(ok)passed++;else failed++;
};
async function run(label,fn){
 try{await fn();report(label,true);}
 catch(e){report(label,false,String(e?.stack||e).slice(0,2000));}
}
async function context(opts={}){
 const ctx=await browser.newContext({
  baseURL:BASE,ignoreHTTPSErrors:false,serviceWorkers:'block',
  ...opts,
 });
 // Never count an automated test as real activity.
 await ctx.route('**/api/insights/collect',r=>r.fulfill({status:204,body:''}));
 return ctx;
}
async function waitStatus(page,id,timeout=40000){
 await page.waitForFunction(id=>{
  const e=document.getElementById(id);
  return !!e&&['passed','failed'].includes(e.dataset.status);
 },id,{timeout});
 const result=await page.locator('#'+id).evaluate(e=>({status:e.dataset.status,text:e.textContent}));
 assert.equal(result.status,'passed',result.text);
 return result;
}
try{
 await run('desktop navigation, homepage, and agent interface',async()=>{
  const ctx=await context({viewport:{width:1440,height:900}});
  try{
   const p=await ctx.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   const resp=await p.goto('/',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(resp.status(),200);
   assert.equal(await p.locator('#yh-pulse').count(),1);
   assert.equal(await p.locator('h1').count()>0,true);
   const discover=await p.request.get('/api/agent/v1/capabilities');
   assert.equal(discover.status(),200);
   const data=await discover.json();
   assert.equal(data.actions.executeRemote,false);
   assert.ok(data.itemsCount>=100);
   await p.waitForTimeout(1200);
   assert.deepEqual(errors,[],'Frontend uncaught errors: '+errors.join('; '));
  }finally{await ctx.close();}
 });
 await run('mobile responsive homepage and tool page',async()=>{
  const ctx=await context({...devices['iPhone 13'],isMobile:true,hasTouch:true});
  try{
   const p=await ctx.newPage();
   for(const path of ['/','/tools/','/tools/word-counter/']){
    const r=await p.goto(path,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(r.status(),200,path);
    await p.waitForTimeout(450);
    const metrics=await p.evaluate(()=>({
     width:document.documentElement.clientWidth,
     content:document.documentElement.scrollWidth,
     viewport:window.innerWidth,
     zoom:document.querySelector('meta[name="viewport"]')?.content||''
    }));
    assert.ok(metrics.width>0,path+' invalid viewport '+JSON.stringify(metrics));
    assert.ok(metrics.content<=metrics.width+8,path+' horizontal page overflow '+JSON.stringify(metrics));
    assert.match(metrics.zoom,/width=device-width/,path+' viewport not responsive');
   }
  }finally{await ctx.close();}
 });
 await run('real Word Counter form execution',async()=>{
  const ctx=await context({viewport:{width:1280,height:800}});
  try{
   const p=await ctx.newPage();
   await p.goto('/tools/word-counter/',{waitUntil:'domcontentloaded'});
   await p.addScriptTag({url:BASE+'/next-word-tool-qa.mjs',type:'module'});
   await waitStatus(p,'next-word-tool-qa',30000);
  }finally{await ctx.close();}
 });
 await run('browser-local file and Web Crypto processing suite',async()=>{
  const ctx=await context({viewport:{width:1280,height:850}});
  try{
   const p=await ctx.newPage();
   await p.goto('/',{waitUntil:'domcontentloaded'});
   await p.addScriptTag({url:BASE+'/browser-smoke.mjs',type:'module'});
   const r=await waitStatus(p,'yorphives-browser-smoke',50000);
   const output=JSON.parse(r.text);
   assert.ok(output.tested>=8,'Insufficient file processing families');
   assert.equal(output.failed,0);
  }finally{await ctx.close();}
 });
 for(const [id,path] of [
  ['pdf-merge','/tools/pdf-merge/'],
  ['image-cropper','/tools/image-cropper/'],
  ['csv-file-to-xlsx','/tools/csv-file-to-xlsx/'],
  ['batch-find-replace','/tools/batch-find-replace/'],
  ['zip-file-creator','/tools/zip-file-creator/'],
  ['duplicate-file-finder','/tools/duplicate-file-finder/']
 ]){
  await run('real file UI workflow: '+id,async()=>{
   const ctx=await context({viewport:{width:1280,height:900}});
   try{
    const p=await ctx.newPage();
    const requests=[];
    p.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method()))requests.push(r.url())});
    const page=await p.goto(path,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(page.status(),200);
    await p.addScriptTag({url:BASE+'/browser-interaction.mjs',type:'module'});
    await waitStatus(p,'yorphives-interaction-smoke',45000);
    assert.ok(requests.every(u=>u.endsWith('/api/insights/collect')),
      'File workflow made an unexpected upload/write request: '+requests.join(', '));
   }finally{await ctx.close();}
  });
 }
}finally{await browser.close()}
console.log('WORKERS REAL BROWSER GATES: '+passed+' passed, '+failed+' failed');
if(failed)process.exitCode=1;
