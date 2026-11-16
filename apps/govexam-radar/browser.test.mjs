import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {chromium} from "playwright";
import worker from "./worker.js";
let server,browser,origin;
test.before(async()=>{
 server=createServer(async(req,res)=>{
   try{
     const url="http://127.0.0.1:"+server.address().port+(req.url||"/");
     const resp=await worker.fetch(new Request(url,{method:req.method}));
     res.writeHead(resp.status,Object.fromEntries(resp.headers));
     res.end(Buffer.from(await resp.arrayBuffer()));
   }catch(e){res.writeHead(500);res.end("Test error: "+e.message);}
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
 test("classic full-parity page at "+width+"px",async()=>{
   const page=await browser.newPage({viewport:{width,height:800}});
   const errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   try{
     await page.goto(origin,{waitUntil:"domcontentloaded"});
     await page.locator("#exam-cards-grid article").first().waitFor({timeout:30000});
     assert.equal(await page.locator("#view-radar").isVisible(),true);
     assert.equal(await page.locator("#exam-cards-grid article").count(),18); // 19 original reference leads: one or more native-only abroad filtered.
     await page.screenshot({path:"govradar-full-"+width+".png",fullPage:true});
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
     assert.equal(overflow,false,"page overflows viewport at "+width+"px");
     assert.equal(errors.length,0,"JS errors: "+errors.join("; "));
   }finally{await page.close();}
 });
}
test("classic filters, alerts, bookmarks and tabs",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:820}});
 try{
   await page.goto(origin,{waitUntil:"domcontentloaded"});
   await page.locator("#exam-cards-grid article").first().waitFor({timeout:30000});
   await page.locator("#search-input").fill("UPSC");
   assert.ok((await page.locator("#exam-cards-grid article").count())>=1);
   await page.locator("#search-input").fill("");
   await page.locator("#exam-cards-grid button[title='Bookmark Exam']").first().click();
   await page.evaluate(()=>window.switchTab('saved'));
   assert.equal(await page.locator("#saved-exams-grid article").count()>=1,true);
   await page.evaluate(()=>window.switchTab('alerts'));
   assert.equal(await page.locator("#view-alerts").isVisible(),true);
   await page.evaluate(()=>window.switchTab('feeds'));
   assert.equal(await page.locator("#view-feeds").isVisible(),true);
   await page.evaluate(()=>window.switchTab('community'));
   assert.equal(await page.locator("#view-community").isVisible(),true);
   await page.evaluate(()=>window.switchTab('guide'));
   assert.equal(await page.locator("#view-guide").isVisible(),true);
 }finally{await page.close();}
});
test("simple mode remains fully functional",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:800}});
 try{
   await page.goto(origin+"/lite",{waitUntil:"networkidle"});
   await page.locator("#stat-sources").getByText("17").waitFor();
   assert.equal(await page.locator("#leads-grid .lead-card").count(),10);
   await page.locator("#search").fill("UPSC");
   assert.equal(await page.locator("#leads-grid .lead-card").count(),2);
   await page.screenshot({path:"govradar-lite-375.png",fullPage:true});
 }finally{await page.close();}
});
