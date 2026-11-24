// Local-only verification with a synthetic browser microphone; never uses a
// real device, visitor information, a production API, or an external service.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=new URL(process.env.YORPHIVES_PREVIEW_ORIGIN||'http://127.0.0.1:4173');
if(origin.protocol!=='http:'||!['localhost','127.0.0.1','::1'].includes(origin.hostname))
 throw Error('Browser repair checks require a local preview.');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage',
 '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const context=await browser.newContext({baseURL:origin.origin,serviceWorkers:'block'});
await context.addInitScript(()=>localStorage.setItem('yorphives-anonymous-analytics-disabled','1'));
await context.route('**/*',route=>{
 const request=route.request();
 if(!['GET','HEAD'].includes(request.method())||new URL(request.url()).origin!==origin.origin)return route.abort();
 return route.continue();
});
const page=await context.newPage();
try{
 const homepage=await page.goto('/',{waitUntil:'domcontentloaded'});
 assert.match(homepage.headers()['permissions-policy'],/microphone=\(\)/);
 await page.goto('/tools/');
 await page.getByRole('link',{name:'Suggest a tool ↗'}).click();
 await page.waitForURL('**/#suggest-tool');
 assert.equal(await page.locator('#interest').inputValue(),'Other');
 assert.ok(await page.locator('#contact-form').isVisible());
 await page.goto('/tools/');
 await page.getByRole('link',{name:'Partnerships',exact:true}).click();
 await page.waitForURL('**/#partners');
 assert.equal(await page.locator('#interest').inputValue(),'Long-term partnership');

 const response=await page.goto('/tools/voice-recorder/',{waitUntil:'domcontentloaded'});
 const policy=response.headers()['permissions-policy']||'';
 assert.match(policy,/microphone=\(self\)/);
 assert.doesNotMatch(policy,/microphone=\(\)/);
 const allowed=await page.evaluate(()=>document.permissionsPolicy?.allowsFeature('microphone')??
  document.featurePolicy?.allowsFeature('microphone')??null);
 assert.equal(allowed,true,'The browser must be allowed to request its synthetic microphone.');
 await page.locator('#wave7-start').click();
 await page.waitForFunction(()=>!document.getElementById('wave7-stop')?.disabled,undefined,{timeout:10000});
 await page.waitForTimeout(1200);
 await page.locator('#wave7-stop').click();
 await page.waitForFunction(()=>document.querySelector('a[download]')?.href.startsWith('blob:'),undefined,{timeout:15000});
 console.log('QUALITY_BROWSER_PASS: correct enquiry categories; restrictive home policy; synthetic voice recording.');
}finally{await context.close();await browser.close()}
