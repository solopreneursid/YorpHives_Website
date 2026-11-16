import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {chromium} from "playwright";
import worker from "./uk-release-worker.mjs";
let server,browser,origin;
function mockDb(){
 return{prepare(sql){
  let bound=[];
  return{bind(...args){bound=args;return this;},
   async all(){
    if(bound.includes("Canada")||bound.includes("manitoba-jobs"))return{results:[]};
    return{results:[{id:"uk-only-test",sourceId:"uk-dfe-teaching-vacancies",
      title:"<img src=x onerror=alert(1)> Mathematics Teacher",
      employer:"Example Primary School",country:"United Kingdom",region:"London",
      jurisdiction:"England",stream:"Non-technical",
      closingAt:"2026-12-03T12:00:00Z",
      lastSeenAt:Date.parse("2026-11-16T15:20:00Z"),
      sourceUrl:"https://teaching-vacancies.service.gov.uk/jobs/example"}]};
   },
   async first(){return{total:bound.includes("Canada")?0:1};}
  };
 }};
}
test.before(async()=>{
 server=createServer(async(req,res)=>{
  try{
   const addr="http://127.0.0.1:"+server.address().port+(req.url||"/");
   const r=await worker.fetch(new Request(addr,{method:req.method}),{DB:mockDb()});
   res.writeHead(r.status,Object.fromEntries(r.headers));
   res.end(Buffer.from(await r.arrayBuffer()));
  }catch(e){res.writeHead(500);res.end("Error: "+e.message);}
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
 test("isolated release Worker browser at "+width+"px shows only UK vacancy and no overflow",async()=>{
  const page=await browser.newPage({viewport:{width,height:800}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  try{
   const r=await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
   assert.equal(r.status(),200);
   assert.match(r.headers()["x-robots-tag"],/noindex/);
   await page.locator(".job-card").first().waitFor({timeout:15000});
   assert.equal(await page.locator(".job-card").count(),1);
   assert.equal(await page.locator(".job-card img").count(),0,"unsafe upstream HTML must remain text");
   assert.match(await page.locator(".job-card h3").textContent(),/<img src=x/);
   assert.equal(await page.locator(".job-link").getAttribute("href"),"https://teaching-vacancies.service.gov.uk/jobs/example");
   assert.equal(await page.locator("#hero-count").textContent(),"1");
   assert.match(await page.locator(".job-card").textContent(),/Last observed in source/);
   assert.ok((await page.locator("a[href='#about']").count())>=1);
   assert.equal(await page.locator(".topbar .back-link").getAttribute("href"),"#about");
   assert.equal((await page.locator(".topbar .back-link").textContent()).trim(),"About ↗");
   const metrics=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(metrics.documentWidth<=width+2,"horizontal overflow "+JSON.stringify(metrics));
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 });
}
test("a browser cannot retrieve research, community, collector or moderation routes",async()=>{
 const page=await browser.newPage();
 try{
  await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
  for(const p of ["/api/collector/plan","/api/community/posts","/api/moderation/reports",
   "/api/notice-changes","/api/source-status","/api/catalog"]){
   const resp=await page.request.get(origin+p);assert.equal(resp.status(),404,p);
  }
  const prohibited=await page.request.get(origin+"/api/notices?source=manitoba-jobs");
  assert.equal(prohibited.status(),403);
  const profile=await page.request.get(origin+"/api/notices?scope=research");
  const j=await profile.json();
  assert.equal(j.releaseProfile,"uk_only_release_preview");
  assert.deepEqual(j.sources.map(s=>s.id),["uk-dfe-teaching-vacancies"]);
 }finally{await page.close();}
});

test("saved UK search remains private to a browser and survives reload",async()=>{
 const context=await browser.newContext();
 const page=await context.newPage();
 try{
  await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
  await page.locator("#preview-search").fill("mathematics");
  await page.locator("#preview-stream").selectOption("Non-technical");
  await page.locator("#save-search").click();
  assert.match(await page.locator("#saved-search-status").textContent(),/mathematics/);
  await page.reload({waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("#preview-search").inputValue(),"");
  await page.locator("#use-saved-search").click();
  assert.equal(await page.locator("#preview-search").inputValue(),"mathematics");
  assert.equal(await page.locator("#preview-stream").inputValue(),"Non-technical");
  const stored=await page.evaluate(()=>localStorage.getItem("govradar-uk-saved-search-v1"));
  assert.deepEqual(JSON.parse(stored),{version:1,term:"mathematics",stream:"Non-technical"});
  await page.locator("#clear-saved-search").click();
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  assert.equal(await page.locator("#use-saved-search").isDisabled(),true);
 }finally{await context.close();}
});
