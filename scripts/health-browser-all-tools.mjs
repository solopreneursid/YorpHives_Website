// Read-only weekly coverage sweep for every published tool page.
// Uses anonymous synthetic navigation only. No forms, uploads, cookies or user data.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const ORIGIN='https://yorphives.com', WIDTH=390;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[], failures=[];
try{
 const ctx=await browser.newContext({viewport:{width:WIDTH,height:844},serviceWorkers:'block',acceptDownloads:false});
 await ctx.addInitScript(()=>{localStorage.setItem('yorphives-anonymous-analytics-disabled','1');});
 await ctx.route('**/api/insights/collect',route=>route.fulfill({status:204,body:''}));
 const r=await ctx.request.get(ORIGIN+'/catalog.json',{timeout:20000});
 if(r.status()!==200)throw Error('Published catalog HTTP '+r.status());
 const catalog=await r.json();
 const items=(catalog.items||[]).filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 if(items.length<143)throw Error('Tool catalog unexpectedly shrank: '+items.length);
 const queue=[...items];
 async function runner(){
  const page=await ctx.newPage();
  await page.route('**/*',async route=>{
   const req=route.request();
   if(!['GET','HEAD'].includes(req.method())&&!req.url().endsWith('/api/insights/collect')){
    failures.push({path:page.url(),reason:'Unexpected write attempt: '+req.method()});
    return route.abort();
   }
   return route.continue();
  });
  while(queue.length){
   const item=queue.shift();const path='/'+item.url;
   const errors=[];const onError=e=>errors.push(String(e.message||e).slice(0,160));
   page.on('pageerror',onError);
   let status=0,overflow=0,hasHeading=false,reason='';
   try{
    const response=await page.goto(ORIGIN+path,{waitUntil:'domcontentloaded',timeout:20000});
    status=response?.status()||0;
    await page.waitForTimeout(350);
    hasHeading=await page.locator('h1').first().isVisible().catch(()=>false);
    const l=await page.evaluate(()=>({
     width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
    }));
    overflow=Math.max(0,l.scroll-l.width);
    if(status!==200)reason='HTTP '+status;
    else if(!hasHeading)reason='Missing visible h1';
    else if(overflow>8)reason='Mobile horizontal overflow '+overflow+'px';
    else if(errors.length)reason='Browser error: '+errors.join(' | ');
   }catch(e){reason=String(e.message||e).slice(0,200)}
   finally{page.off('pageerror',onError)}
   results.push({path,status,hasHeading,overflow,errors,passed:!reason});
   if(reason)failures.push({path,reason});
  }
  await page.close();
 }
 await Promise.all([runner(),runner(),runner()]);
 await ctx.close();
}finally{await browser.close()}
const report={generatedAt:new Date().toISOString(),origin:ORIGIN,checked:results.length,passed:results.filter(x=>x.passed).length,failed:failures.length,failures,results:results.sort((a,b)=>a.path.localeCompare(b.path))};
await writeFile('all-tools-browser-report.json',JSON.stringify(report,null,2)+'\n');
console.log('ALL TOOLS BROWSER SWEEP '+JSON.stringify({checked:report.checked,passed:report.passed,failed:report.failed}));
for(const failure of failures.slice(0,30))console.error(failure.path+': '+failure.reason);
if(failures.length)process.exitCode=1;
