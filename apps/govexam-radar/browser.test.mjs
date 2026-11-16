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
       const scrollable=await page.evaluate(()=>{
         const el=document.querySelector("#view-radar .bg-gradient-to-r .overflow-x-auto");
         if(!el)return false;
         const before=el.scrollLeft;el.scrollLeft=el.scrollWidth;const after=el.scrollLeft;el.scrollLeft=before;
         return after>0;
       });
       assert.equal(scrollable,true,"Location options must remain accessible by horizontal swipe");
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
   await page.locator("#stat-sources").getByText("17").waitFor();
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
   await page.locator("#user-email-input").fill("person@example.org");
   await page.locator("#email-subscription-form button[type=submit]").click();
   assert.match(await page.locator("#email-dispatch-log").innerText(),/No email|NOT being sent/);
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
  const href=await cards.first().locator("a[href^='https://teaching-vacancies.service.gov.uk/jobs/']").getAttribute("href");
  assert.ok(href);
  await page.screenshot({path:"govradar-live-official-375.png",fullPage:false});
  await cards.first().locator("button[data-save-notice]").click();
  await page.evaluate(()=>document.getElementById("view-saved").classList.remove("hidden"));
  assert.ok((await page.locator("#saved-official-notices article").count())>=1);
  await page.locator("#inapp-refresh-notices").click();
  await page.locator("#inapp-notice-status").waitFor();
  assert.equal(await page.locator("#inapp-official-alerts").count(),1);
  assert.equal(errors.length,0,"Remote staging JS exceptions: "+errors.join("; "));
 }finally{await page.close();}
});
