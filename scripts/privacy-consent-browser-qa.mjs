// Synthetic, local-only consent checks. No production events or user data.
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
import {mkdir} from 'node:fs/promises';

const origin=new URL(process.env.YORPHIVES_PREVIEW_ORIGIN||'http://127.0.0.1:4173');
if(origin.protocol!=='http:'||!['127.0.0.1','localhost','::1'].includes(origin.hostname))
 throw Error('Consent browser tests require an isolated local preview.');
const CHOICE='yorphives-analytics-choice-v2';
const LEGACY='yorphives-anonymous-analytics-disabled';
const SESSION='yorphives-analytics-tab-session-v1';
const results=[];
if(process.env.YORPHIVES_PRIVACY_SCREENSHOTS)await mkdir(process.env.YORPHIVES_PRIVACY_SCREENSHOTS,{recursive:true});

async function session(browser,init){
 const context=await browser.newContext({baseURL:origin.origin,serviceWorkers:'block',viewport:{width:390,height:844}});
 if(init)await context.addInitScript(init);
 const requests=[];
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin.origin)return route.abort();
  if(url.pathname==='/api/insights/collect'&&req.method()==='POST'){
   requests.push(req.postDataJSON());
   return route.fulfill({status:204,body:''});
  }
  return ['GET','HEAD'].includes(req.method())?route.continue():route.abort();
 });
 return {context,page:await context.newPage(),requests};
}
const settle=page=>page.waitForLoadState('networkidle',{timeout:12000});
async function scenario(name,fn){
 try{await fn();results.push({name,passed:true});console.log('PASS '+name)}
 catch(error){results.push({name,passed:false,error:String(error?.message||error)});console.error('FAIL '+name+': '+String(error?.message||error))}
}
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 let browser;
 try{
  browser=await engine.launch({headless:true});
  await scenario(name+': opt-in, withdrawal, and re-consent',async()=>{
   const {context,page,requests}=await session(browser);
   try{
    await page.goto('/');await settle(page);
    const banner=page.locator('#yh-analytics-choice');
    await banner.waitFor({state:'visible'});
    if(name==='chromium'&&process.env.YORPHIVES_PRIVACY_SCREENSHOTS)
     await page.screenshot({path:process.env.YORPHIVES_PRIVACY_SCREENSHOTS+'/consent-mobile.png'});
    assert.equal(requests.length,0,'No event before consent');
    assert.equal(await page.evaluate(k=>sessionStorage.getItem(k),SESSION),null);
    const allow=banner.getByRole('button',{name:'Allow analytics'});
    const deny=banner.getByRole('button',{name:'Decline analytics'});
    assert.ok(await allow.isVisible()&&await deny.isVisible(),'Both choices are visible');
    const styles=await Promise.all([allow,deny].map(x=>x.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}))));
    assert.deepEqual(styles[0],styles[1],'Both choices have equal visual emphasis');
    await allow.click();
    await page.waitForFunction(k=>localStorage.getItem(k)==='allow',CHOICE);
    await settle(page);
    assert.ok(requests.some(x=>x.event==='view'&&x.route==='home'));
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),CHOICE),'allow');
    assert.match(await page.locator('#anonymous-analytics-toggle').innerText(),/on.*turn off/i);
    await page.locator('#anonymous-analytics-toggle').click();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),CHOICE),'deny');
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),LEGACY),'1');
    assert.equal(await page.evaluate(k=>sessionStorage.getItem(k),SESSION),null);
    const before=requests.length;
    await page.goto('/tools/word-counter/');await settle(page);
    assert.equal(requests.length,before,'No events after withdrawal');
    assert.equal(await page.locator('#yh-analytics-choice').isHidden(),true);
    await page.locator('#anonymous-analytics-toggle').click();
    await page.getByRole('button',{name:'Allow analytics'}).click();
    await settle(page);
    assert.ok(requests.some(x=>x.event==='view'&&x.route==='tools/word-counter/'));
    await page.locator('textarea[name="text"]').fill('synthetic example text');
    await page.locator('#utility-run').click();
    await page.locator('#utility-result').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.getElementById('utility-output')?.value.includes('Words:'));
    await page.waitForTimeout(500);
    assert.ok(requests.every(x=>!JSON.stringify(x).includes('synthetic example text')));
   }finally{await context.close()}
  });
  await scenario(name+': direct tool visit and legacy preferences',async()=>{
   const fresh=await session(browser);
   try{
    await fresh.page.goto('/tools/word-counter/');await settle(fresh.page);
    assert.equal(fresh.requests.length,0);
    assert.equal(await fresh.page.locator('#yh-analytics-choice').isVisible(),true);
    await fresh.page.getByRole('button',{name:'Decline analytics'}).click();
    await fresh.page.reload();await settle(fresh.page);
    assert.equal(await fresh.page.locator('#yh-analytics-choice').isHidden(),true);
    assert.equal(fresh.requests.length,0);
   }finally{await fresh.context.close()}
   const legacy=await session(browser,()=>localStorage.setItem('yorphives-anonymous-analytics-disabled','1'));
   try{
    await legacy.page.goto('/');await settle(legacy.page);
    assert.equal(legacy.requests.length,0);
    assert.equal(await legacy.page.locator('#yh-analytics-choice').isHidden(),true);
   }finally{await legacy.context.close()}
   const previouslyOn=await session(browser,()=>localStorage.setItem('yorphives-anonymous-analytics-disabled','0'));
   try{
    await previouslyOn.page.goto('/');await settle(previouslyOn.page);
    assert.equal(previouslyOn.requests.length,0);
    assert.equal(await previouslyOn.page.locator('#yh-analytics-choice').isVisible(),true);
   }finally{await previouslyOn.context.close()}
  });
  await scenario(name+': privacy controls and browser privacy signals',async()=>{
   const {context,page,requests}=await session(browser);
   try{
    await page.goto('/privacy/');await settle(page);
    if(name==='chromium'&&process.env.YORPHIVES_PRIVACY_SCREENSHOTS){
     await page.screenshot({path:process.env.YORPHIVES_PRIVACY_SCREENSHOTS+'/privacy-mobile.png',fullPage:true});
     await page.setViewportSize({width:1280,height:800});
     await page.screenshot({path:process.env.YORPHIVES_PRIVACY_SCREENSHOTS+'/privacy-desktop.png',fullPage:true});
     await page.setViewportSize({width:390,height:844});
    }
    assert.equal(requests.length,0);
    await page.locator('#anonymous-analytics-toggle').click();
    await page.getByRole('button',{name:'Allow analytics'}).click();
    await settle(page);
    assert.equal(requests.length,0,'Opening privacy settings does not send a page view');
    await page.goto('/hqventures/');await settle(page);
    assert.equal(requests.length,0,'HQventures information page remains untracked');
    await page.locator('#anonymous-analytics-toggle').click();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),CHOICE),'deny');
    await page.goto('/tools/');await settle(page);
    assert.ok(await page.locator('#anonymous-analytics-toggle').isVisible());
   }finally{await context.close()}
   const gpc=await session(browser,()=>{
    Object.defineProperty(navigator,'globalPrivacyControl',{value:true,configurable:true});
    localStorage.setItem('yorphives-analytics-choice-v2','allow');
   });
   try{
    await gpc.page.goto('/');await settle(gpc.page);
    assert.equal(gpc.requests.length,0);
    assert.equal(await gpc.page.locator('#yh-analytics-choice').isHidden(),true);
    assert.equal(await gpc.page.locator('#anonymous-analytics-toggle').isDisabled(),true);
    assert.equal(await gpc.page.evaluate(k=>sessionStorage.getItem(k),SESSION),null);
   }finally{await gpc.context.close()}
  });
 }catch(error){results.push({name:name+' launch',passed:false,error:String(error?.message||error)});}
 finally{await browser?.close().catch(()=>{});}
}
console.log('CONSENT_BROWSER_RESULTS '+JSON.stringify({total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length}));
if(results.some(x=>!x.passed))process.exitCode=1;
