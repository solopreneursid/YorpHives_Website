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
     assert.equal(await page.locator("#exam-cards-grid article").count(),17); // Prototype SMART_BOTH location mode omits two native-only foreign boards.
     const pageHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
     const capture=await page.screenshot({path:"govradar-full-"+width+".png",clip:{x:0,y:0,width,height:pageHeight},animations:"disabled"});
     const renderWidth=capture.readUInt32BE(16);
     const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>window.innerWidth+3,offenders:[...document.querySelectorAll("body *")].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+4||b.left<-4)}).slice(0,12).map(e=>({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,100),right:Math.round(e.getBoundingClientRect().right)}))}));
     const horizontalScroll=await page.evaluate(()=>{scrollTo(1000,0);const x=scrollX;scrollTo(0,0);return x;});
     assert.equal(horizontalScroll,0,"unexpected page-level horizontal scroll at "+width+"px: "+JSON.stringify(layout.offenders));
     assert.equal(renderWidth,width,"Screenshot must match actual 320px viewport without padding beyond its bounds");
     if(width<=375){
       assert.equal(await page.locator("#gg-more-filters").isVisible(),true);
       assert.equal(await page.locator("#discovery-filter-toggle").isVisible(),false);
       assert.equal(await page.locator("#search-input").isVisible(),true);
       assert.equal(await page.locator("#discovery-advanced-filters").isVisible(),false,"advanced filters start folded on phones");
       assert.equal(await page.locator("nav[aria-label='Mobile Navigation'] button:visible").count(),4);
     }
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
test("official-source interface and saved controls load without invented records",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:820}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#official-notice-grid").waitFor({timeout:20000});
  assert.equal(await page.locator("#govradar-official-jobs").count(),1);
  assert.equal(await page.locator("#official-notice-filters").count(),1);
  assert.equal(await page.locator("#saved-official-notices").count(),1);
  assert.equal(await page.locator("#inapp-official-alerts").count(),1);
  assert.equal(await page.locator("#inapp-refresh-notices").count(),1);
  assert.equal(await page.locator("#official-notice-grid article").count(),0);
  await page.locator("#official-notice-search").fill("ICT");
  await page.locator("#official-notice-filters button[type=submit]").click();
  assert.equal(errors.length,0,"JS errors: "+errors.join("; "));
 }finally{await page.close();}
});
test("simple mode remains fully functional",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:800}});
 try{
   await page.goto(origin+"/lite",{waitUntil:"networkidle"});
   await page.locator("#stat-sources").getByText("58").waitFor();
   assert.equal(await page.locator("#leads-grid .lead-card").count(),10);
   await page.locator("#search").fill("UPSC");
   assert.equal(await page.locator("#leads-grid .lead-card").count(),2);
   await page.screenshot({path:"govradar-lite-375.png",fullPage:true});
 }finally{await page.close();}
});


test("advanced global filters and manual location modes",async()=>{
 const page=await browser.newPage({viewport:{width:420,height:900}});
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  const initial=await page.locator("#exam-cards-grid article").count();
  assert.ok(initial>10);
  await page.evaluate(()=>window.setLocationViewMode("HOME_NATIVE"));
  assert.equal(await page.locator("#exam-cards-grid article").count(),10);
  await page.evaluate(()=>window.setLocationViewMode("ABROAD_FOREIGN"));
  const foreign=await page.locator("#exam-cards-grid article").count();
  assert.ok(foreign>0 && foreign<initial);
  await page.evaluate(()=>window.setLocationViewMode("GLOBAL_MANUAL"));
  assert.ok((await page.locator("#exam-cards-grid article").count())>=initial);
  await page.evaluate(()=>window.selectCountry("Japan"));
  assert.equal(await page.locator("#exam-cards-grid article").count(),1);
  await page.evaluate(()=>window.resetAllFilters());
  assert.equal(await page.locator("#exam-cards-grid article").count(),initial);
 }finally{await page.close();}
});
test("official source checks display real check outcomes without fake ingestion",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:850}});
 let count=0;
 try{
  await page.route("**/api/check?id=*",async route=>{
    count++;
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({status:"reachable",checkedAt:new Date().toISOString()})});
  });
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>window.runFeedSync());
  await page.waitForFunction(()=>document.querySelector("#feed-log-status")?.textContent.includes("17 REACHABLE"),{timeout:30000});
  assert.equal(count,17);
  assert.match(await page.locator("#feed-log-output").innerText(),/Job notices have not been verified|Recruitment data was not updated/);
 }finally{await page.close();}
});
test("modals, saved preferences, guide and custom leads",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:850}});
 try{
   await page.goto(origin,{waitUntil:"domcontentloaded"});
   await page.locator("#exam-cards-grid article").first().waitFor();
   await page.locator('#exam-cards-grid button').filter({hasText:"Details"}).first().click();
   assert.equal(await page.locator("#exam-detail-modal").isVisible(),true);
   await page.locator("#modal-bookmark-btn").click();
   await page.evaluate(()=>window.closeExamModal());
   await page.evaluate(()=>window.switchTab("alerts"));
   assert.equal(await page.locator("#user-email-input").count(),0);
   assert.equal(await page.locator("#email-subscription-form").count(),0);
   assert.equal(await page.locator("#email-dispatch-log").count(),0);
   assert.match(await page.locator("#view-alerts").innerText(),/Admit cards, results & updates/i);
   await page.evaluate(()=>window.switchTab("feeds"));
   await page.locator("#custom-title").fill("QA Test Community Outreach Exam");
   await page.locator("#custom-authority").fill("Research Team");
   await page.locator("#custom-region").fill("Test District");
   await page.locator("#custom-dates").fill("Unverified research date");
   await page.locator("#custom-url").fill("https://ncs.gov.in/");
   await page.locator("#add-exam-form button[type=submit]").click();
   assert.equal(await page.locator("#view-radar").isVisible(),true);
   await page.locator("#search-input").fill("QA Test Community Outreach Exam");
   assert.equal(await page.locator("#exam-cards-grid article").count(),1);
   await page.reload({waitUntil:"domcontentloaded"});
   await page.locator("#exam-cards-grid article").first().waitFor();
   await page.locator("#search-input").fill("QA Test Community Outreach Exam");
   assert.equal(await page.locator("#exam-cards-grid article").count(),1);
   await page.evaluate(()=>window.switchTab("guide"));
   await page.evaluate(()=>window.selectGuidePart(4));
   assert.match(await page.locator("#guide-detail-panel").innerText(),/Module 4/);
 }finally{await page.close();}
});


test("community buttons expose report, data export and account controls",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:820}});
 try{
   await page.goto(origin,{waitUntil:"domcontentloaded"});
   await page.locator("#exam-cards-grid article").first().waitFor({timeout:30000});
   await page.evaluate(()=>{
     state.communityUser="localqa";
     state.communityPosts=[{
       id:"11111111-1111-4111-8111-111111111111",
       examId:state.selectedCommunityExamId,
       username:"localqa",
       roleBadge:"Community member",
       tag:"#Syllabus & Strategy",
       timestamp:"Just now",
       content:"Visible QA discussion, not a live recruitment notice.",
       upvotes:0,upvotedByMe:false,
       replies:[{id:"22222222-2222-4222-8222-222222222222",username:"otherqa",text:"Sample reply",timestamp:"Now"}]
     }];
     document.getElementById("view-radar").classList.add("hidden");document.getElementById("view-community").classList.remove("hidden");renderCommunityHub();
   });
   assert.equal(await page.locator('button:has-text("Report post")').count(),1);
   assert.equal(await page.locator('button:has-text("Report reply")').count(),1);
   assert.equal(await page.locator('button:has-text("Delete my post")').count(),1);
   assert.equal(await page.locator("#govradar-export-account").count(),1);
   assert.equal(await page.locator("#govradar-delete-account").count(),1);
 }finally{await page.close();}
});

test("actual Cloudflare preview displays official-source cards with responsive layout",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:820}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto("https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev/",{waitUntil:"domcontentloaded",timeout:30000});
  const cards=page.locator("#official-notice-grid article");
  await cards.first().waitFor({timeout:25000});
  assert.ok((await cards.count())>=1);
  await page.locator("#official-notice-country").selectOption("United Kingdom");
  await page.locator("#official-notice-filters button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector("#official-notice-grid article a[href^='https://teaching-vacancies.service.gov.uk/jobs/']")!==null,{timeout:12000});
 const href=await cards.first().locator("a[href^='https://teaching-vacancies.service.gov.uk/jobs/']").getAttribute("href");
  assert.ok(href);
  await page.screenshot({path:"govradar-live-official-375.png",fullPage:false});
  await cards.first().locator("button[data-save-notice]").click();
  await page.evaluate(()=>document.getElementById("view-saved").classList.remove("hidden"));
  assert.ok((await page.locator("#saved-official-notices article").count())>=1);
  await page.evaluate(()=>window.switchTab("alerts"));
  await page.locator("#inapp-refresh-notices").click();
  await page.locator("#inapp-notice-status").waitFor();
  assert.equal(await page.locator("#inapp-official-alerts").count(),1);
  assert.equal(errors.length,0,"Remote staging JS exceptions: "+errors.join("; "));
 }finally{await page.close();}
});

test("state, province and municipal source browser filters and saved source preferences",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:860}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#regional-source-grid article").first().waitFor({timeout:25000});
  assert.equal(await page.locator("#regional-source-count").getAttribute("role"),"status");
  assert.equal(await page.locator("#regional-source-grid article").count(),9);
  await page.locator("#regional-country").selectOption("Canada");
  await page.locator("#regional-tier").selectOption("province");
  assert.ok((await page.locator("#regional-source-grid article").count())>=8,"Canadian province portals should include new Alberta, Nova Scotia, Saskatchewan and others");
  await page.locator("#regional-subdivision").selectOption("CA-MB");
  assert.equal(await page.locator("#regional-source-grid article").count(),1);
  assert.match(await page.locator("#regional-source-grid article").innerText(),/Manitoba/);
  await page.locator("#regional-source-grid [data-source-bookmark]").click();
  await page.evaluate(()=>window.switchTab("saved"));
  assert.equal(await page.locator("#saved-source-grid article").count(),1);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#regional-source-grid article").first().waitFor();
  await page.evaluate(()=>window.switchTab("saved"));
  assert.equal(await page.locator("#saved-source-grid article").count(),1);
  assert.equal(errors.length,0,"Regional UI JS exceptions: "+errors.join("; "));
 }finally{await page.close();}
});
test("jurisdiction directory includes municipal and provincial official links only",async()=>{
 const request=await fetch(origin+"/api/jurisdictions?level=municipal");
 assert.equal(request.status,200);const res=await request.json();
 assert.ok(res.total>=2);
 assert.ok(res.sources.every(x=>x.level==="municipal"&&new URL(x.url).protocol==="https:"));
 const byProvince=await (await fetch(origin+"/api/jurisdictions?jurisdiction=CA-MB")).json();
 assert.equal(byProvince.total,1);assert.equal(byProvince.sources[0].name.includes("Manitoba"),true);
});


test("real Manitoba provincial government jobs display with source and location filters",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:820}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto("https://hqventures-govexam-parity-preview.solopreneursid-proy.workers.dev/",{waitUntil:"domcontentloaded",timeout:30000});
  await page.locator("#official-notice-grid article").first().waitFor({timeout:30000});
  await page.locator("#official-notice-country").selectOption("Canada");
  await page.locator("#official-notice-filters button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector("#official-notice-status")?.textContent.includes("imported official-source"),{timeout:15000});
  assert.ok((await page.locator("#official-notice-grid article").count())>=1);
  const cards=page.locator("#official-notice-grid article");
  assert.match(await cards.first().innerText(),/Manitoba Government|Manitoba/);
  assert.ok((await cards.first().locator('a[href*="jobsearch.gov.mb.ca"]').count())===1);
  await page.screenshot({path:"govradar-province-manitoba-375.png",fullPage:false});
  await cards.first().locator("button[data-save-notice]").click();
  await page.evaluate(()=>window.switchTab("saved"));
  assert.ok((await page.locator("#saved-official-notices article").count())>=1);
  assert.equal(errors.length,0,"Provincial feed UI script errors: "+errors.join("; "));
 }finally{await page.close();}
});

test("private moderation page loads without exposing content",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:820}});
 try{
  await page.goto(origin+"/moderation",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("#login-form").isVisible(),true);
  assert.equal(await page.locator("#dashboard").isVisible(),false);
  await page.locator("#moderator-token").fill("q".repeat(40));
  await page.locator("#login-form button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector("#message")?.textContent.includes("database_unavailable")||document.querySelector("#message")?.textContent.includes("moderation_not_configured"));
  assert.equal(await page.locator("#dashboard").isVisible(),false);
 }finally{await page.close();}
});

test("portable bookmark export and import work on mobile without exporting credentials",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:820},acceptDownloads:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>window.switchTab("saved"));
  await page.locator("#portable-bookmark-tools").waitFor({timeout:16000});
  await page.evaluate(()=>{
   localStorage.setItem("govradar_saved_sources_v1",JSON.stringify(["manitoba-jobs","bpsc-bihar"]));
   localStorage.setItem("hqventures_govradar_full_v3",JSON.stringify({saved:["rrb-je"],emailSettings:{email:"private-address@example.net"},communityToken:"sensitive"}));
  });
  await page.evaluate(()=>window.switchTab("saved"));
  const downloadPromise=page.waitForEvent("download",{timeout:10000});
  await page.locator("#portable-export").click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/GovRadar-bookmarks-.*\.json/);
  const stream=await download.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString("utf8"),snapshot=JSON.parse(raw);
  assert.equal(snapshot.format,"GovRadarBookmarkTransfer");
  assert.ok(snapshot.governmentSources.includes("manitoba-jobs"));
  assert.ok(snapshot.exampleExamIds.includes("rrb-je"));
  assert.equal(raw.includes("private-address@example.net"),false);
  assert.equal(raw.includes("sensitive"),false);
  await page.locator("#portable-file").setInputFiles({name:"govradar-transfer.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({...snapshot,bookmarks:[{id:"uk-dfe-teaching-vacancies:test",title:"Official source demo",employer:"School",closingAt:"2026-12-31T23:59:00.000Z",sourceUrl:"https://teaching-vacancies.service.gov.uk/jobs/example"},{id:"bad",title:"Not official",closingAt:"2026-12-31T23:59:00.000Z",sourceUrl:"https://fraud.invalid/"}]}))});
  await page.waitForFunction(()=>document.querySelector("#portable-transfer-status")?.textContent.includes("Imported"),{timeout:10000});
  const imported=await page.evaluate(()=>JSON.parse(localStorage.getItem("govradar_official_saved_v1")));
  assert.equal(imported.length,1);
  assert.equal(imported[0].title,"Official source demo");
  assert.equal(errors.length,0,errors.join("; "));
 }finally{await page.close();}
});

const RELEASE_FIXTURE={
 releaseProfile:"uk_only_release_preview",publicLaunchAuthorized:false,total:1,page:1,limit:12,
 sources:[{id:"uk-dfe-teaching-vacancies",name:"UK Department for Education",commercialReuseApprovedForCurrentFields:true}],
 notices:[{id:"uk-synthetic-test",sourceId:"uk-dfe-teaching-vacancies",
  title:"<img src=x onerror=alert(1)> Mathematics Teacher",employer:"Example School",
  jurisdiction:"England",region:"London",sourceUrl:"https://teaching-vacancies.service.gov.uk/jobs/example",
  closingAt:"2026-11-27T12:00:00Z",lastSeenAt:Date.parse("2026-11-16T15:20:00Z"),stream:"Non-technical"}]
};
for(const width of [320,375,768,1440]){
 test("UK-only release candidate is readable, safe and responsive at "+width+"px",async()=>{
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.route("**/api/release-preview/notices?*",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(RELEASE_FIXTURE)}));
  try{
   const resp=await page.goto(origin+"/release-preview",{waitUntil:"domcontentloaded"});
   assert.equal(resp.status(),200);
   await page.locator("#preview-grid .job-card").first().waitFor({timeout:15000});
   assert.equal(await page.locator("#preview-grid .job-card").count(),1);
   assert.equal(await page.locator("#hero-count").textContent(),"1");
   assert.match(await page.locator("#preview-grid .job-card").textContent(),/Last observed in source/);
   assert.equal(await page.locator("#preview-grid img").count(),0,"upstream text must not inject HTML");
   assert.ok((await page.locator("#preview-grid .job-card h3").textContent()).includes("<img"));
   assert.equal(await page.locator("#preview-grid a").first().getAttribute("href"),"https://teaching-vacancies.service.gov.uk/jobs/example");
   const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,outer:document.querySelector(".site-shell").scrollWidth}));
   assert.ok(overflow.scrollWidth<=width+2,"no horizontal page scroll: "+JSON.stringify(overflow));
   await page.screenshot({path:"govradar-uk-release-"+width+".png",fullPage:true,animations:"disabled"});
   assert.deepEqual(errors,[],"no browser errors permitted");
  }finally{await page.close();}
 });
}
test("UK-only preview search and reset remain functional without user accounts",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:850}});
 const params=[];
 await page.route("**/api/release-preview/notices?*",route=>{
  params.push(new URL(route.request().url()).searchParams.toString());
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(RELEASE_FIXTURE)});
 });
 try{
  await page.goto(origin+"/release-preview",{waitUntil:"domcontentloaded"});
  await page.locator("#preview-grid .job-card").waitFor({timeout:15000});
  await page.locator("#preview-search").fill("London");
  await page.locator("#preview-stream").selectOption("Non-technical");
  await page.locator("#preview-filters button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector("#preview-grid .job-card")!==null);
  assert.ok(params.some(x=>x.includes("q=London")&&x.includes("stream=Non-technical")));
  await page.locator("#preview-reset").click();
  await page.waitForFunction(()=>document.querySelector("#preview-search").value==="");
  assert.equal(await page.locator("#preview-stream").inputValue(),"");
  assert.ok((await page.locator("body").textContent()).includes("RELEASE CANDIDATE"));
 }finally{await page.close();}
});

test("retired email preferences are purged without deleting saved opportunities",async()=>{
 const context=await browser.newContext();
 const page=await context.newPage();
 try{
  await page.addInitScript(()=>{
   localStorage.setItem("govexam_radar_email_v2",JSON.stringify({email:"old@example.test"}));
   localStorage.setItem("hqventures_govradar_full_v3",JSON.stringify({saved:["rrb-je"],emailIds:["rrb-je"],emailSettings:{email:"old@example.test"}}));
  });
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  const state=await page.evaluate(()=>({
   oldEmail:localStorage.getItem("govexam_radar_email_v2"),
   saved:JSON.parse(localStorage.getItem("hqventures_govradar_full_v3"))
  }));
  assert.equal(state.oldEmail,null);
  assert.deepEqual(state.saved.saved,["rrb-je"]);
  assert.equal(Object.hasOwn(state.saved,"emailIds"),false);
  assert.equal(Object.hasOwn(state.saved,"emailSettings"),false);
 }finally{await context.close();}
});

test("phone discovery is searchable, browsable, and has accessible filters",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  const search=page.locator("#search-input");
  await search.fill("UPSC");
  assert.ok((await page.locator("#exam-cards-grid article").count())>=1);
  await page.locator("#gg-more-filters").click();
  assert.equal(await page.locator("#gg-more-filters").getAttribute("aria-expanded"),"true");
  assert.equal(await page.locator("#discovery-advanced-filters").isVisible(),true);
  await search.fill("");
  await page.locator('[data-discovery-mode="GLOBAL_MANUAL"]').click();
  assert.equal(await page.locator('[data-discovery-mode="GLOBAL_MANUAL"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator("#exam-cards-grid article").count(),20,"global mode shows full prototype research inventory, including archived filtering");
  await page.locator("#discovery-menu-toggle").click();
  assert.equal(await page.locator("#discovery-menu-toggle").getAttribute("aria-expanded"),"true");
  await page.locator('[data-discovery-tab="guide"]').click();
  assert.equal(await page.locator("#view-guide").isVisible(),true);
  assert.equal(await page.locator("#discovery-more-menu").isVisible(),false);
 }finally{await page.close();}
});

test("opportunity cards show truthful source evidence, compact actions and saved-state feedback",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  const card=page.locator("#exam-cards-grid .govradar-opportunity-card").first();
  await card.waitFor();
  assert.match(await card.locator(".govradar-card-evidence").textContent(),/Example/);
  assert.match(await card.locator(".govradar-card-caution").textContent(),/Not confirmed/);
  assert.equal(await card.locator(".govradar-details-button").count(),1);
  assert.equal(await card.locator(".govradar-save-button").count(),1);
  assert.equal(await card.locator(".govradar-source-link").count(),1);
  const title=await card.locator(".govradar-card-title").textContent();
  await card.locator(".govradar-save-button").click();
  const saved=page.locator("#exam-cards-grid .govradar-opportunity-card").first().locator(".govradar-save-button");
  assert.equal(await saved.getAttribute("aria-pressed"),"true");
  await page.evaluate(()=>window.switchTab("saved"));
  assert.ok((await page.locator("#saved-exams-grid .govradar-opportunity-card").count())>=1);
  assert.ok((await page.locator("#saved-exams-grid").textContent()).includes(title));
  await page.locator("#saved-exams-grid .govradar-details-button").first().click();
  assert.equal(await page.locator("#exam-detail-modal").isVisible(),true);
  assert.match(await page.locator("#modal-body").textContent(),/Qualifications|Eligibility/);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test("mobile quick country, stream and region filters share original search state",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  assert.ok((await page.locator("#discovery-country-chips button").count())>=5);
  await page.locator('[data-quick-country="India"]').click();
  assert.equal(await page.locator('[data-quick-country="India"]').getAttribute("aria-pressed"),"true");
  const india=await page.locator("#exam-cards-grid .govradar-card-location").allTextContents();
  assert.ok(india.length>0);
  assert.ok(india.every(x=>x.includes("India")),JSON.stringify(india));
  await page.locator('[data-quick-stream="Technical"]').click();
  assert.equal(await page.locator('[data-quick-stream="Technical"]').getAttribute("aria-pressed"),"true");
  const cards=await page.locator("#exam-cards-grid article").count();
  assert.ok(cards>0);
  const types=await page.locator("#exam-cards-grid .govradar-card-tags").allTextContents();
  assert.ok(types.every(x=>x.includes("Technical")));
  assert.ok((await page.locator("#discovery-region-quick option").count())>=2);
  await page.locator("#discovery-clear-quick").click();
  assert.equal(await page.locator('[data-quick-stream="ALL"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator('[data-quick-country="ALL"]').getAttribute("aria-pressed"),"true");
  await page.locator("#exam-cards-grid .govradar-details-button").first().click();
  assert.match(await page.locator("#modal-body").textContent(),/Research lead · not independently verified/);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test("global saved searches persist, apply and remove privately on mobile",async()=>{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 const page=await context.newPage();const errors=[];page.on("pageerror",error=>errors.push(String(error)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  await page.locator('[data-quick-country="India"]').click();
  await page.locator('[data-quick-stream="Technical"]').click();
  await page.locator("#search-input").fill("RRB");
  await page.evaluate(()=>window.switchTab('saved'));
  await page.locator("#saved-search-create").click();
  assert.equal(await page.locator("#saved-search-list [data-apply-search]").count(),1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('govradar-global-saved-searches-v1')));
  assert.deepEqual(stored[0].filters,{keyword:"RRB",country:"India",stream:"Technical",region:"ALL"});
  await page.locator("#saved-search-create").click();
  assert.equal(await page.locator("#saved-search-list [data-apply-search]").count(),1,"duplicate search must not be added");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  await page.evaluate(()=>window.switchTab('saved'));
  assert.equal(await page.locator("#saved-search-list [data-apply-search]").count(),1);
  await page.locator("#saved-search-list [data-apply-search]").click();
  assert.equal(await page.locator("#view-radar").isVisible(),true);
  assert.equal(await page.locator("#search-input").inputValue(),"RRB");
  assert.equal(await page.locator('[data-quick-country="India"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator('[data-quick-stream="Technical"]').getAttribute("aria-pressed"),"true");
  await page.evaluate(()=>window.switchTab('saved'));
  await page.locator("#saved-search-list [data-remove-search]").click();
  assert.equal(await page.locator("#saved-search-list [data-apply-search]").count(),0);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test("opt-in discovery preferences survive reload and clear without losing bookmarks",async()=>{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 const page=await context.newPage();const errors=[];page.on("pageerror",error=>errors.push(String(error)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  await page.locator("#exam-cards-grid .govradar-save-button").first().click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("govexam_radar_saved_v2")));
  assert.ok(saved.length>0);
  await page.locator('[data-quick-country="India"]').click();
  await page.locator('[data-quick-stream="Non-Technical"]').click();
  await page.evaluate(()=>window.switchTab('saved'));
  await page.locator("#saved-preferences-save").click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('govradar-global-discovery-preferences-v1'))),{country:"India",stream:"Non-Technical"});
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  assert.equal(await page.locator('[data-quick-country="India"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator('[data-quick-stream="Non-Technical"]').getAttribute("aria-pressed"),"true");
  await page.evaluate(()=>window.switchTab('saved'));
  assert.ok((await page.locator("#saved-exams-grid .govradar-opportunity-card").count())>0);
  await page.locator("#saved-preferences-clear").click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('govradar-global-discovery-preferences-v1')),null);
  assert.ok((await page.locator("#saved-exams-grid .govradar-opportunity-card").count())>0);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test("Updates clearly separates unverified prototypes and retains local source-link history",async()=>{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  await page.evaluate(()=>window.switchTab("alerts"));
  assert.equal(await page.locator("#gr-verified-empty").isVisible(),true);
  assert.match(await page.locator("#gr-verified-empty").textContent(),/No independently verified/);
  assert.equal(await page.locator("#gr-admit-panel").isVisible(),true);
  assert.equal(await page.locator("#gr-result-panel").isVisible(),false);
  assert.equal(await page.locator("#gr-upcoming-panel").isVisible(),false);
  const lead=page.locator("#gr-admit-panel a[data-gr-official-source]").first();
  const rowCount=await lead.count();
  assert.ok(rowCount>0);
  assert.match(await page.locator("#gr-admit-panel").innerText(),/Prototype · not verified/);
  await lead.evaluate(a=>a.click());
  assert.equal(await page.locator("#gr-history-list .gr-history-entry").count(),1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("govradar-global-official-click-history-v1")));
  assert.equal(stored.length,1);
  assert.deepEqual(Object.keys(stored[0]).sort(),["id","openedAt"]);
  await page.locator('[data-gr-update-tab="results"]').click();
  assert.equal(await page.locator("#gr-result-panel").isVisible(),true);
  assert.equal(await page.locator("#gr-admit-panel").isVisible(),false);
  await page.locator('[data-gr-update-tab="upcoming"]').click();
  assert.equal(await page.locator("#gr-upcoming-panel").isVisible(),true);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator("#exam-cards-grid article").first().waitFor();
  await page.evaluate(()=>window.switchTab("alerts"));
  assert.equal(await page.locator("#gr-history-list .gr-history-entry").count(),1);
  await page.locator("#gr-clear-history").click();
  assert.equal(await page.locator("#gr-history-list .gr-history-entry").count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem("govradar-global-official-click-history-v1")),null);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test("phone users can discover official portals and navigate quick guide without implying verification",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#exam-cards-grid article').first().waitFor();
  await page.evaluate(()=>window.switchTab('feeds'));
  await page.locator('#monitored-portals-grid>div').first().waitFor();
  const original=await page.locator('#monitored-portals-grid>div').count();
  assert.ok(original>4);
  assert.match(await page.locator('#gr-portal-results').textContent(),/official portal links shown/);
  await page.locator('#gr-portal-query').fill('not-a-real-government-portal-9999');
  assert.equal(await page.locator('#monitored-portals-grid>div:visible').count(),0);
  await page.locator('#gr-portal-query').fill('');
  assert.equal(await page.locator('#monitored-portals-grid>div:visible').count(),original);
  await page.locator('[data-gr-jump="monitored-portals-grid"]').click();
  assert.equal(await page.locator('#monitored-portals-grid').isVisible(),true);
  await page.evaluate(()=>window.switchTab('guide'));
  assert.match(await page.locator('#view-guide .gr-secondary-intro').innerText(),/How to use GovRadar/);
  await page.locator('[data-gr-guide-tab="saved"]').click();
  assert.equal(await page.locator('#view-saved').isVisible(),true);
  await page.evaluate(()=>window.switchTab('community'));
  assert.match(await page.locator('#view-community .gr-secondary-intro').innerText(),/user-generated/);
  assert.equal(await page.locator('#community-login-form').count(),1);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test("Phase 7 never claims simulated jobs or email delivery",async()=>{
 const page=await browser.newPage({viewport:{width:320,height:740}});
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#exam-cards-grid article').first().waitFor();
  assert.match(await page.locator('#results-summary-text').textContent(),/prototype research leads/);
  await page.evaluate(()=>window.switchTab('feeds'));
  const original=await page.locator('#exam-cards-grid article').count();
  await page.evaluate(()=>window.runFeedSync());
  assert.ok(!(await page.locator('#feed-log-status').textContent()).includes('ALL 15 CHANNELS SYNCED'));
  await page.evaluate(()=>window.simulateLifecycleStep());
  assert.equal(await page.locator('#exam-cards-grid article').count(),original);
  assert.match(await page.locator('#feed-log-output').textContent(),/ILLUSTRATION|DEMO ONLY/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('govexam_radar_email_v2')),null);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test("GlobalGovJobs branding renders without breaking existing GovRadar bookmarks",async()=>{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 const page=await context.newPage();
 try{
  await page.addInitScript(()=>{
   localStorage.setItem("govexam_radar_saved_v2",JSON.stringify(["rrb-je-cbt1-2026"]));
  });
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  assert.match(await page.title(),/GlobalGovJobs/);
  assert.match(await page.locator("header h1").first().textContent(),/GlobalGovJobs/);
  assert.equal(await page.locator("#view-radar").isVisible(),true);
  await page.evaluate(()=>window.switchTab("saved"));
  assert.ok((await page.locator("#saved-exams-grid .govradar-opportunity-card").count())>=1);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem("govexam_radar_saved_v2"))),["rrb-je-cbt1-2026"]);
 }finally{await context.close();}
});

test("GlobalGovJobs raised section cards organize jobs first without losing source modules",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#gg-official-slot #govradar-official-jobs").waitFor();
  await page.locator("#gg-region-slot #regional-government-directory").waitFor();
  assert.equal(await page.locator("#gg-official-slot #govradar-official-jobs").count(),1);
  assert.equal(await page.locator("#gg-region-slot #regional-government-directory").count(),1);
  assert.equal(await page.locator(".gg-explore-tiles button").count(),4);
  assert.equal(await page.locator("#gg-research-details").evaluate(e=>e.open),false);
  const order=await page.evaluate(()=>{
    const y=id=>document.getElementById(id).getBoundingClientRect().top+scrollY;
    return {search:y("discovery-search-area"),jobs:y("exam-cards-grid"),
      official:y("gg-official-section"),regions:y("gg-region-section")};
  });
  assert.ok(order.search<order.official&&order.official<order.jobs&&order.jobs<order.regions,JSON.stringify(order));
  await page.locator('[data-gg-section="regions"]').click();
  assert.equal(await page.locator("#regional-source-filters").isVisible(),true);
  await page.locator("#gg-research-details summary").click();
  assert.equal(await page.locator("#gg-research-details").evaluate(e=>e.open),true);
  assert.equal(await page.locator("#kpi-total-exams").isVisible(),true);
  await page.locator('[data-gg-section="saved"]').click();
  assert.equal(await page.locator("#view-saved").isVisible(),true);
  const widths=await page.evaluate(()=>({view:innerWidth,root:document.documentElement.scrollWidth}));
  assert.ok(widths.root<=widths.view+2,JSON.stringify(widths));
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test("Simple experience prioritizes official notices, hides advanced controls and keeps navigation accessible",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#gg-official-slot #govradar-official-jobs').waitFor();
  assert.equal(await page.locator('#gg-official-section').isVisible(),true);
  assert.equal(await page.locator('#gg-more-filters').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#gg-advanced-controls').isVisible(),false);
  assert.equal(await page.locator('#discovery-country-chips').isVisible(),true);
  assert.equal(await page.locator('#discovery-region-quick').isVisible(),true);
  assert.equal(await page.locator('#discovery-stream-chips').isVisible(),true);
  await page.locator('#gg-more-filters').click();
  assert.equal(await page.locator('#gg-advanced-controls').isVisible(),true);
  assert.equal(await page.locator('#discovery-advanced-filters').isVisible(),true);
  await page.locator('#gg-more-filters').click();
  assert.equal(await page.locator('#gg-advanced-controls').isVisible(),false);
  assert.match(await page.locator('#gg-primary-title').textContent(),/Jobs from government websites/);
  assert.match(await page.locator('#gg-examples-heading').textContent(),/Other job information/);
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});

test("Hindi translates simple controls without modifying records or deleting saved jobs",async()=>{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#exam-cards-grid .govradar-opportunity-card').first().waitFor();
  const title=await page.locator('#exam-cards-grid .govradar-card-title').first().textContent();
  await page.locator('#exam-cards-grid .govradar-save-button').first().click();
  const count=await page.locator('#exam-cards-grid .govradar-card-title').count();
  await page.locator('#gg-language').selectOption('hi');
  assert.match(await page.locator('#discovery-title').textContent(),/सरकारी नौकरी/);
  assert.match(await page.locator('#gg-primary-title').textContent(),/सरकारी वेबसाइटों/);
  assert.equal(await page.locator('#exam-cards-grid .govradar-card-title').first().textContent(),title);
  assert.equal(await page.locator('#exam-cards-grid .govradar-card-title').count(),count);
  assert.equal(await page.locator('#discovery-title').getAttribute('lang'),'hi');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#gg-language').inputValue(),'hi');
  assert.match(await page.locator('#discovery-title').textContent(),/सरकारी नौकरी/);
  await page.evaluate(()=>window.switchTab('saved'));
  assert.ok(await page.locator('#saved-exams-grid .govradar-opportunity-card').count()>0);
  await page.locator('#gg-language').selectOption('en');
  assert.match(await page.locator('#discovery-title').textContent(),/Find government jobs easily/);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test("one main search controls both examples and imported notice filters",async()=>{
 const page=await browser.newPage({viewport:{width:375,height:812}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 try{
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.locator("#official-notice-filters").waitFor();
  await page.locator("#search-input").fill("Railway");
  await page.locator('[data-quick-country="India"]').click();
  await page.locator('[data-quick-stream="Technical"]').click();
  await page.waitForTimeout(600);
  assert.equal(await page.locator("#official-notice-search").inputValue(),"Railway");
  assert.equal(await page.locator("#official-notice-country").inputValue(),"India");
  assert.equal(await page.locator("#official-notice-stream").inputValue(),"Technical");
  await page.locator("#discovery-clear-quick").click();
  await page.waitForTimeout(550);
  assert.equal(await page.locator("#official-notice-search").inputValue(),"");
  assert.equal(await page.locator("#official-notice-country").inputValue(),"");
  assert.equal(await page.locator("#official-notice-stream").inputValue(),"");
  assert.deepEqual(errors,[]);
 }finally{await page.close();}
});
