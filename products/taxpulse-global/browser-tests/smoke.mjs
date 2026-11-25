import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const root=new URL('../',import.meta.url);
execFileSync(process.execPath,[new URL('staging/integrated/build.mjs',root).pathname]);
const temp=mkdtempSync(join(tmpdir(),'taxpulse-browser-'));
let server,browser;
try {
 cpSync(new URL('staging/integrated/bundle/',root),temp,{recursive:true});
 const workerPath=join(temp,'worker.mjs');
 const source=readFileSync(workerPath,'utf8').replace(/import (a\d+) from '\.\/(.*?)';/g,(_,name,file)=>'const '+name+'='+JSON.stringify(readFileSync(join(temp,file),'utf8'))+';');
 writeFileSync(workerPath,source);
 const worker=(await import(pathToFileURL(workerPath).href)).default;
 server=createServer(async(req,res)=>{
  try {
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   const response=await worker.fetch(new Request('http://127.0.0.1'+req.url,{method:req.method}));
   res.writeHead(response.status,Object.fromEntries(response.headers));
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,acceptDownloads:true});
  try {
   const page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
   await page.goto(origin);
   await page.locator('#country-status li').last().waitFor();
   assert.equal(await page.locator('#country-status li').count(),8);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
   await page.locator('#salary').fill('1275000');
   await page.locator('#resident').selectOption('true');
   await page.getByRole('button',{name:'Show my example'}).click();
   await page.locator('#tax-result').waitFor();
   assert.match(await page.locator('#income-tax').innerText(),/INR\s*0(?:\.00)?/);
   await page.locator('#second-salary').fill('1285000');
   await page.getByRole('button',{name:'Compare salaries'}).click();
   await page.locator('#compare-result').waitFor();
   assert.match(await page.locator('#change-rate').innerText(),/higher salary leaves less money/);
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download').click()]);
   const report=JSON.parse(readFileSync(await download.path(),'utf8'));
   assert.equal(report.verified,false);
   assert.equal(report.response.result.incomeTax,0);
   await page.locator('#country').selectOption('US');
   assert.equal(await page.locator('#tax-result').isVisible(),false);
   assert.equal(await page.locator('#residency-field').isVisible(),false);
   await page.locator('#salary').fill('100000');
   await page.locator('#filing').selectOption('mfj');
   await page.getByRole('button',{name:'Show my example'}).click();
   await page.locator('#tax-result').waitFor();
   assert.match(await page.locator('#income-tax').innerText(),/USD\s*7,640/);
   await page.getByRole('button',{name:'Clear'}).click();
   assert.equal(await page.locator('#salary').inputValue(),'');
   assert.equal(await page.locator('#tax-result').isVisible(),false);
   assert.deepEqual(errors,[]);
   assert.ok(requests.every(r=>r.url.startsWith(origin+'/')&&r.method==='GET'),'Unexpected network request: '+JSON.stringify(requests));
   console.log('Browser smoke passed '+viewport.width+'px');
  }finally{await context.close();}
 }
}finally{
 if(browser)await browser.close();
 if(server)await new Promise(resolve=>server.close(resolve));
 rmSync(temp,{recursive:true,force:true});
}
