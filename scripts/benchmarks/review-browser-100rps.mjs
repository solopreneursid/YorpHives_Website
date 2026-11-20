// Isolated preview-only browser functional checks. Not a user-load test.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const BASE='https://073b7c05.yorphives-v1-review.pages.dev';
const results=[],errors=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function scenario(name,viewport,perform){
 const ctx=await browser.newContext({baseURL:BASE,viewport,serviceWorkers:'block'});
 const page=await ctx.newPage();
 const exceptions=[];
 await ctx.route('**/api/insights/collect',r=>r.fulfill({status:204,body:''}));
 page.on('pageerror',e=>exceptions.push(e.message));
 page.on('request',r=>{
  if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&!r.url().includes('/api/insights/collect')){
   exceptions.push('Unexpected write: '+r.method()+' '+r.url());
  }
 });
 try{
  await perform(page);
  assert.deepEqual(exceptions,[],'Browser errors: '+exceptions.join(' | '));
  results.push({name,status:'PASS'});
 }catch(error){
  results.push({name,status:'FAIL',detail:String(error).slice(0,450)});
  errors.push(name+': '+String(error).slice(0,350));
 }finally{await ctx.close()}
}
async function navigate(page,path){
 const response=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(response?.status(),200,'HTTP '+response?.status()+' for '+path);
}
try{
 await scenario('desktop: save and revisit Toolspace',{width:1280,height:800},async page=>{
  await navigate(page,'/#tools');
  await page.locator('.tool-card').first().waitFor({timeout:20000});
  await page.locator('[data-toolspace-tab="all"]').click();
  const fav=page.locator('.tool-card-fav').first(),name=page.locator('.tool-card h3').first();
  const chosen=await name.textContent();
  await fav.click();
  await page.locator('[data-toolspace-tab="saved"]').click();
  await page.locator('.tool-card h3').first().waitFor();
  assert.equal(await page.locator('.tool-card h3').first().textContent(),chosen);
  assert.equal(await page.locator('[data-toolspace-tab="saved"]').getAttribute('aria-pressed'),'true');
 });
 await scenario('desktop: word counter and recent history',{width:1280,height:800},async page=>{
  await navigate(page,'/tools/word-counter/');
  await page.locator('textarea[name="text"]').fill('Alpha beta gamma.');
  const run=page.locator('#utility-run');
  await page.waitForFunction(()=>!document.querySelector('#utility-run')?.disabled,{timeout:15000});
  await run.click();
  await page.waitForFunction(()=>!document.querySelector('#utility-result')?.hidden,{timeout:15000});
  assert.match(await page.locator('#utility-output').inputValue(),/3/);
  const recent=await page.evaluate(()=>localStorage.getItem('yorphives-toolspace-recent-v1'));
  assert.ok(recent?.includes('tools/word-counter/'),'Recent history not recorded');
 });
 await scenario('mobile: saved tabs and crawlable directory',{width:390,height:844},async page=>{
  await navigate(page,'/tools/');
  await page.locator('a.directory-card').first().waitFor({timeout:15000});
  assert.equal(await page.locator('a.directory-card').count(),143);
  assert.equal(await page.locator('[data-directory-space-tab="saved"]').count(),1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<4,'Mobile horizontal overflow: '+overflow+'px');
 });
 await scenario('mobile: HQventures collection gates',{width:390,height:844},async page=>{
  await navigate(page,'/#ventures');
  await page.locator('[data-productspace-tab="saved"]').waitFor({timeout:15000});
  await page.locator('[data-productspace-tab="saved"]').click();
  assert.equal(await page.locator('[data-productspace-tab="saved"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.venture-item').count(),0,'Unapproved products must not appear');
 });
}finally{await browser.close()}
await writeFile(new URL('./review-browser-100rps.json',import.meta.url),JSON.stringify({target:BASE,results},null,2)+'\n');
console.log(JSON.stringify({target:BASE,results},null,2));
if(errors.length)throw Error('Browser smoke failed: '+errors.join(' / '));
