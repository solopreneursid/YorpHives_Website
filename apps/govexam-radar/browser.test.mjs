import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {chromium} from "playwright";
import worker from "./worker.js";
let server, browser, origin;
test.before(async()=>{
 server=createServer(async(req,res)=>{
   try{
     const url="http://127.0.0.1:"+server.address().port+(req.url||"/");
     const response=await worker.fetch(new Request(url,{method:req.method}));
     res.writeHead(response.status,Object.fromEntries(response.headers));
     res.end(Buffer.from(await response.arrayBuffer()));
   }catch(e){res.writeHead(500);res.end("Local test server error: "+e.message);}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 origin="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({headless:true});
});
test.after(async()=>{
 if(browser)await browser.close();
 if(server)await new Promise(resolve=>server.close(resolve));
});
for(const width of [320,375,768,1440]){
 test("responsive layout and catalog at "+width+"px",async()=>{
   const page=await browser.newPage({viewport:{width,height:800}});
   try{
     await page.goto(origin,{waitUntil:"networkidle"});
     await page.locator("#stat-sources").getByText("17").waitFor();
     assert.equal(await page.locator("#leads-grid .lead-card").count(),10);
     const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
     assert.equal(overflows,false,"unwanted horizontal scrolling at "+width+"px");
     if(width<=700){assert.equal(await page.locator(".bottom-nav").isVisible(),true);}
     else {assert.equal(await page.locator(".topnav").isVisible(),true);}
     await page.screenshot({path:"govradar-"+width+".png",fullPage:true});
   }finally{await page.close();}
 });
}
test("filter, bookmark persistence, and source navigation",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:800}});
 try{
   await page.goto(origin,{waitUntil:"networkidle"});
   await page.locator("#search").fill("UPSC");
   assert.equal(await page.locator("#leads-grid .lead-card").count(),2);
   await page.locator("#search").fill("");
   await page.locator("#leads-grid .save-btn").first().click();
   await page.locator(".bottom-nav [data-tab=saved]").click();
   assert.equal(await page.locator("#saved-grid .lead-card").count(),1);
   await page.reload({waitUntil:"networkidle"});
   await page.locator(".bottom-nav [data-tab=saved]").click();
   assert.equal(await page.locator("#saved-grid .lead-card").count(),1);
   await page.locator(".bottom-nav [data-tab=sources]").click();
   assert.equal(await page.locator("#sources-grid .source-card").count(),17);
   await page.locator("#source-search").fill("Jharkhand");
   assert.equal(await page.locator("#sources-grid .source-card").count(),1);
 }finally{await page.close();}
});
