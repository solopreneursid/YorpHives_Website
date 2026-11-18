// Browser acceptance of the release candidate, served locally from dist/.
// Synthetic content only; no HQ connection, live deployment or analytics writes.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const BASE='http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const failures=[],reports=[],writes=[];
async function check(name,fn,{mobile=false,javaScriptEnabled=true,blockedStorage=false}={}){
 const context=await browser.newContext({
  baseURL:BASE,viewport:mobile?{width:390,height:844}:{width:1280,height:850},
  isMobile:mobile,hasTouch:mobile,javaScriptEnabled,serviceWorkers:'block'
 });
 await context.route('**/api/insights/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&!r.url().includes('/api/insights/'))writes.push(name+' '+r.method()+' '+r.url())});
 try{
  if(blockedStorage)await page.addInitScript(()=>{
   Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('storage-denied')}});
  });
  await fn(page,context);
  assert.deepEqual(errors,[],'Unexpected JS exception: '+errors.join(' | '));
  reports.push({name,ok:true});console.log('PASS '+name);
 }catch(e){
  failures.push({name,error:String(e?.stack||e).slice(0,1600)});
  console.log('FAIL '+name+' — '+String(e?.message||e).slice(0,600));
 }finally{await context.close();}
}
async function open(page,path){
 const response=await page.goto(path,{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(response.status(),200,'Response for '+path);
}
async function waitReady(page){await page.waitForFunction(()=>document.querySelector('#directory-search-status')?.textContent?.includes('143'),null,{timeout:10000});}
try{
 await check('desktop: searchable directory, deep link and clear',async page=>{
  await open(page,'/tools/');
  await waitReady(page);
  await page.locator('#directory-search').fill('word count');
  await page.waitForFunction(()=>document.querySelector('#directory-search-status').textContent.includes('of 143'));
  assert.equal(await page.locator('a.directory-card:visible').count()>0,true);
  assert.ok(page.url().includes('q=word+count'));
  await page.locator('#directory-clear').click();
  assert.equal(await page.locator('a.directory-card').count(),143);
  assert.equal(new URL(page.url()).searchParams.has('q'),false);
 });
 await check('mobile: saved tool persists between tool page and directory',async page=>{
  await open(page,'/tools/word-counter/');
  const save=page.locator('[data-save-tool="tools/word-counter/"]');
  await save.waitFor({state:'visible',timeout:12000});
  await save.click();
  assert.equal(await save.getAttribute('aria-pressed'),'true');
  await page.locator('.yh-tool-shortcuts a').click();
  await page.waitForURL(/\/tools\/\?saved=1/);
  await waitReady(page).catch(()=>{});
  assert.equal(await page.locator('#directory-saved-only').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('a.directory-card:visible').count(),1);
  assert.match(await page.locator('a.directory-card:visible').first().innerText(),/word/i);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=8,'Mobile horizontal overflow: '+overflow);
 },{mobile:true});
 await check('mobile: related links open approved static tool pages',async page=>{
  await open(page,'/tools/word-counter/');
  const related=page.locator('.yh-tool-discover li a');
  assert.ok(await related.count()>=1,'No related tools');
  const href=await related.first().getAttribute('href');
  assert.match(href,/^\/tools\/[a-z0-9-]+\/$/);
  await related.first().click();
  assert.equal(new URL(page.url()).pathname,href);
  assert.ok(await page.locator('h1').first().isVisible());
 },{mobile:true});
 await check('privacy: blocked storage cannot display false save success',async page=>{
  await open(page,'/tools/word-counter/');
  const save=page.locator('[data-save-tool]');
  await save.click();
  assert.match(await save.innerText(),/unavailable/i);
  assert.notEqual(await save.getAttribute('aria-pressed'),'true');
 },{blockedStorage:true});
 await check('progressive enhancement: 143 links exist without JavaScript',async page=>{
  await open(page,'/tools/');
  assert.equal(await page.locator('a.directory-card').count(),143);
  assert.ok(await page.locator('details.directory-section').count()>4);
 },{javaScriptEnabled:false});
 await check('tool execution: word counter still runs in browser',async page=>{
  await open(page,'/tools/word-counter/');
  await page.locator('textarea[name="text"]').fill('One two three');
  await page.waitForFunction(()=>!document.querySelector('#utility-run')?.disabled,null,{timeout:15000});
  await page.locator('#utility-run').click();
  await page.waitForFunction(()=>!document.querySelector('#utility-result')?.hidden,null,{timeout:15000});
  assert.match(await page.locator('#utility-output').inputValue(),/3/);
 });
 await check('mobile: directory layout has no horizontal overflow',async page=>{
  await open(page,'/tools/?q=pdf');
  await waitReady(page).catch(()=>{});
  const layout=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.client+8,JSON.stringify(layout));
 },{mobile:true});
 await check('mobile: Builders role-specific enquiry routes without accepting members',async page=>{
  await open(page,'/');
  await page.locator('a[data-nav="builders"]').first().click();
  assert.equal(await page.locator('#builders').isVisible(),true);
  const options=page.locator('#builders .builder-path .member-action');
  assert.equal(await options.count(),2);
  assert.match(await page.locator('#builders .access-note').innerText(),/enquiry is not enrollment/i);
  await options.last().click();
  assert.equal(new URL(page.url()).hash,'#connect');
  assert.equal(await page.locator('#project-type').inputValue(),'Builders — post a project');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=8,'Mobile overflow after Builders contact: '+overflow);
 },{mobile:true});
 await check('mobile: marketing landing pages are reachable and readable',async page=>{
  for(const path of ['/hqventures/','/builders/','/partnerships/']){
   await open(page,path);
   assert.equal(await page.locator('h1').count(),1);
   assert.ok(await page.locator('h1').isVisible());
   const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');
   assert.equal(canonical,'https://yorphives.com'+path);
   const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(layout.scroll<=layout.width+8,path+' overflow: '+JSON.stringify(layout));
  }
 },{mobile:true});
 assert.deepEqual(writes,[],'Unexpected network writes');
}finally{await browser.close();}
console.log('RELEASE CANDIDATE BROWSER ACCEPTANCE: '+reports.length+' passed / '+(reports.length+failures.length)+' total');
if(failures.length){for(const f of failures)console.error(f.name+': '+f.error);process.exitCode=1;}
