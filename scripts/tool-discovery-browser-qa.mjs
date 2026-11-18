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
 await check('mobile: saved shortcuts appear only after saving a tool',async page=>{
  await open(page,'/tools/');
  assert.equal(await page.locator('#directory-return').isVisible(),false);
  await open(page,'/tools/word-counter/');
  const save=page.locator('[data-save-tool]');
  await save.click();
  assert.equal(await save.getAttribute('aria-pressed'),'true');
  await open(page,'/tools/');
  const shelf=page.locator('#directory-return');
  await shelf.waitFor({state:'visible'});
  const links=page.locator('#directory-return-links a');
  assert.equal(await links.count(),1);
  assert.equal(await links.first().getAttribute('href'),'/tools/word-counter/');
  assert.equal(await shelf.locator('p').innerText().then(t=>t.includes('Nothing is uploaded')),true);
  await links.first().click();
  await page.locator('[data-save-tool]').click();
  await open(page,'/tools/');
  await page.waitForFunction(()=>document.getElementById('directory-return').hidden);
  assert.equal(await page.locator('#directory-return-links a').count(),0);
 },{mobile:true});
 await check('privacy: saved shelf does not require browser storage',async page=>{
  await open(page,'/tools/');
  await waitReady(page);
  assert.equal(await page.locator('#directory-return').isVisible(),false);
  assert.equal(await page.locator('a.directory-card').count(),143);
 },{blockedStorage:true});
 await check('mobile: related links open approved static tool pages',async page=>{
  await open(page,'/tools/word-counter/');
  const related=page.locator('.yh-tool-discover li a');
  assert.ok(await related.count()>=1,'No related tools');
  const href=await related.first().getAttribute('href');
  assert.match(href,/^\/tools\/[a-z0-9-]+\/$/);
  await related.first().click();
  assert.equal(new URL(page.url()).pathname,href);
  await page.locator('h1').first().waitFor({state:'visible',timeout:10000});
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
 await check('measurement: successful word count emits only an approved completion signal',async page=>{
  const events=[];
  await page.route('**/api/insights/collect',async route=>{
   const body=JSON.parse(route.request().postData()||'{}');
   events.push(body);
   await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
  });
  await open(page,'/tools/word-counter/');
  await page.locator('textarea[name="text"]').fill('PRIVATE-SYNTHETIC-INPUT one two');
  await page.waitForFunction(()=>!document.querySelector('#utility-run')?.disabled,null,{timeout:15000});
  await page.locator('#utility-run').click();
  await page.waitForFunction(()=>!document.querySelector('#utility-result')?.hidden,null,{timeout:15000});
  for(let i=0;i<30&&!events.some(x=>x.event==='complete');i++)await page.waitForTimeout(100);
  const completed=events.find(x=>x.event==='complete');
  assert.ok(completed,'No completion event after a successful tool action');
  assert.equal(completed.url,'tools/word-counter/');
  for(const event of events){
   assert.ok(['view','complete'].includes(event.event));
   assert.deepEqual(Object.keys(event).sort(),
    (event.event==='view'?['event','route','sessionId']:['event','sessionId','url']));
   assert.match(event.sessionId,/^[a-f0-9-]{36}$/i);
   assert.ok(!JSON.stringify(event).includes('PRIVATE-SYNTHETIC-INPUT'));
  }
 });
 await check('English-only website has no language overlay or translation code',async page=>{
  for(const url of ['/','/tools/','/tools/word-counter/']){
   await open(page,url);
   assert.equal(await page.locator('#yh-language-picker').count(),0,url);
   assert.equal(await page.locator('script[src*="site-languages"]').count(),0,url);
   assert.equal(await page.locator('link[href*="site-languages"]').count(),0,url);
   assert.equal(await page.locator('html').getAttribute('lang'),'en',url);
  }
  assert.equal(await page.locator('textarea[name="text"]').inputValue(),'');
 },{mobile:true});
 await check('homepage: retired Impact route is absent and public progress contains only four cards',async page=>{
  await open(page,'/');
  const info=page.locator('#home-progress');
  assert.ok(await info.isVisible());
  assert.equal(await info.locator('.proof-metric').count(),4);
  assert.equal(await page.locator('#impact').count(),0);
  assert.equal(await page.locator('a[href="#impact"]').count(),0);
  assert.equal(await page.locator('#yh-pulse').count(),0,'Duplicate YHpulse ticker must be removed');
  await page.locator('a[href="#home-progress"]').first().click();
  assert.equal(new URL(page.url()).hash,'#home-progress');
  assert.ok(await info.isVisible());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=8,'Homepage metrics cause mobile overflow: '+overflow);
 },{mobile:true});
 await check('homepage: visual process and partnership/contact invitation work on mobile',async page=>{
  await open(page,'/');
  const flow=page.locator('#how-it-works .process-stage');
  assert.equal(await flow.count(),4);
  assert.deepEqual(await flow.locator('h3').allTextContents(),[
   'Find the signal.','Test the potential.','Make it useful.','Keep getting better.'
  ]);
  assert.ok(await page.locator('#featured-ventures').isVisible());
  assert.ok(await page.locator('#home-featured-empty').isVisible());
  assert.equal(await page.locator('#home-featured-list .home-featured-card').count(),0);
  const cta=page.locator('#home .home-cta');
  assert.match(await cta.innerText(),/Let's Build What's Next/);
  assert.match(await cta.innerText(),/Have an idea, an opportunity, or a reason to collaborate/);
  assert.equal(await cta.locator('a[href="#partners"]').count(),1);
  assert.equal(await cta.locator('a[href="#contact"]').count(),1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=8,'Visual process or CTA caused horizontal overflow: '+overflow);
 },{mobile:true});
 await check('mobile homepage: tactile dock and redesigned hero remain usable and accessible',async page=>{
  await open(page,'/');
  assert.match(await page.locator('#home-title').innerText(),/Building Tomorrow/);
  const primary=page.locator('.hero-ctas a').first();
  assert.equal(await primary.getAttribute('href'),'#tools');
  assert.match(await primary.innerText(),/Explore Free Tools/);
  assert.deepEqual(await page.locator('.ecosystem-grid>a').evaluateAll(cards=>cards.map(c=>c.getAttribute('href'))),
   ['#ventures','#tools','#builders']);
  const dock=page.locator('.mobile-dock');
  await dock.waitFor({state:'visible'});
  const style=await dock.evaluate(el=>{
   const c=getComputedStyle(el),tile=getComputedStyle(el.querySelector('a svg'));
   return {position:c.position,radius:parseFloat(c.borderTopLeftRadius),backdrop:c.backdropFilter,
    shadow:c.boxShadow,tileShadow:tile.boxShadow,bottom:parseFloat(c.bottom)};
  });
  assert.equal(style.position,'fixed');
  assert.ok(style.radius>=16,'Floating dock has no rounded container');
  assert.notEqual(style.shadow,'none');
  assert.notEqual(style.tileShadow,'none');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=8,'Mobile homepage overflow: '+overflow);
  await page.locator('.mobile-dock a[href="#tools"]').click();
  await page.waitForFunction(()=>document.querySelector('#tools')?.hidden===false);
  assert.equal(await page.locator('.mobile-dock a[href="#tools"]').getAttribute('aria-current'),'page');
  await page.locator('#more-toggle').click();
  assert.equal(await page.locator('#more-panel').isVisible(),true);
  await page.locator('#more-close').click();
  assert.equal(await page.locator('#more-panel').isVisible(),false);
 },{mobile:true});
 await check('homepage: only founder-approved launched catalog entries are featured automatically',async page=>{
  const evidence='a'.repeat(64);
  const eligible={
   name:'Sample Approved Venture',description:'A fictional verified product used only in local synthetic browser QA.',
   type:'app',url:'apps/sample-approved-venture/',published:true,visibility:'public',
   launchStatus:'launched',date:'2026-11-12',
   headquartersReview:{status:'qualified',marketResearch:'passed',businessAnalysis:'passed',evidenceSha256:evidence},
   founderApproval:{status:'approved',approvedOn:'2026-11-12'}
  };
  await page.route('**/catalog.json',async route=>{
   const response=await route.fetch();
   const data=await response.json();
   data.items.push(eligible,{
    ...eligible,name:'Private unapproved venture',url:'apps/sample-unapproved/',founderApproval:{status:'pending'}
   });
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await open(page,'/');
  await page.waitForFunction(()=>document.querySelectorAll('#home-featured-list .home-featured-card').length===1);
  assert.equal(await page.locator('#home-featured-list .home-featured-card').count(),1);
  assert.match(await page.locator('#home-featured-list .home-featured-card').innerText(),/Sample Approved Venture/);
  assert.equal(await page.locator('#home-featured-list a.home-featured-open').getAttribute('href'),'../apps/sample-approved-venture/');
  assert.equal(await page.locator('#home-featured-empty').count(),0);
  assert.equal((await page.locator('#home-featured-list').innerText()).includes('Private unapproved venture'),false);
 });
 await check('homepage: metrics use only validated anonymous 30-day reports',async page=>{
  const daily=Array.from({length:30},(_,i)=>({
   day:new Date(Date.UTC(2026,9,20+i)).toISOString().slice(0,10),
   pageViews:i===29?29:0,completedActions:i===29?3:0
  }));
  await page.route('**/api/insights/growth',async route=>{
   await route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({schemaVersion:1,available:true,periodDays:30,
     generatedAt:'2026-11-18T09:00:00Z',daily})});
  });
  await open(page,'/');
  await page.waitForFunction(()=>document.getElementById('home-completions').textContent==='3',null,{timeout:15000});
  assert.equal(await page.locator('#home-page-views').textContent(),'29');
  assert.equal(await page.locator('#home-completions').textContent(),'3');
  assert.match(await page.locator('#home-analytics-disclaimer').innerText(),/undercount/i);
 });
 await check('mobile: directory layout has no horizontal overflow',async page=>{
  await open(page,'/tools/?q=pdf');
  await waitReady(page).catch(()=>{});
  const layout=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.client+8,JSON.stringify(layout));
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
