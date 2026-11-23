// Cross-browser, self-hosted preview smoke. This is not a full accessibility audit.
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
const origin=process.env.YORPHIVES_PREVIEW_ORIGIN||'http://127.0.0.1:4173';
const routes=['/','/tools/','/tools/word-counter/','/tools/pdf-merge/','/tools/heic-to-jpg/'];
const results=[];
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 let browser;
 try{
  browser=await engine.launch({headless:true});
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:800},reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   for(const path of routes){
    const label=name+' '+width+'px '+path;
    try{
     const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:25000});
     assert.equal(response?.status(),200);
     await page.locator('h1').first().waitFor({state:'visible',timeout:12000});
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
     assert.ok(overflow<=4,'Horizontal page overflow '+overflow+'px');
     if(path==='/tools/word-counter/'){
      await page.locator('textarea[name="text"]').fill('Alpha beta gamma');
      await page.locator('#utility-run').click();
      await page.locator('#utility-result').waitFor({state:'visible',timeout:12000});
      assert.match(await page.locator('#utility-output').inputValue(),/3/);
     }
     assert.deepEqual(errors,[],'Browser page exceptions');
     results.push({name:label,passed:true});
    }catch(e){results.push({name:label,passed:false,error:String(e?.message||e).slice(0,360)});}
   }
   await context.close();
  }
 }catch(e){results.push({name:name+' launch',passed:false,error:String(e?.message||e).slice(0,360)});}
 finally{await browser?.close().catch(()=>{});}
}
const summary={total:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
const file=process.env.YORPHIVES_COMPAT_RESULTS||'cross-browser-results.json';
await mkdir(dirname(file),{recursive:true});
await writeFile(file,JSON.stringify(summary,null,2)+'\n');
console.log('CROSS_BROWSER_RESULTS '+JSON.stringify({total:summary.total,passed:summary.passed,failed:summary.failed}));
for(const item of results.filter(x=>!x.passed))console.error('FAIL '+item.name+': '+item.error);
if(summary.failed)process.exitCode=1;
