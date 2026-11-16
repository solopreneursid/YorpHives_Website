/* Explicit opt-in browser QA: never included as a script tag on normal pages. */
const status=document.createElement('pre');status.id='studio-rebuild-qa';status.dataset.status='running';
status.style.cssText='position:fixed;z-index:99999;top:86px;left:10px;max-width:calc(100vw - 20px);max-height:40vh;overflow:auto;background:#0a2519;color:#baffc9;border:1px solid #82e7a0;border-radius:12px;padding:13px;font:11px/1.55 monospace;white-space:pre-wrap';
document.body.append(status);
const checks=[];
const ok=(t,msg)=>{if(!t)throw Error(msg);checks.push(msg)};
const wait=async(fn,timeout=13000)=>{const start=Date.now();while(Date.now()-start<timeout){if(fn())return;await new Promise(r=>setTimeout(r,85))}throw Error('Timed out '+fn)};
try{
 await wait(()=>document.getElementById('home-tool-count')?.textContent!=='—');
 ok(document.getElementById('home-tool-count').textContent==='143','real catalog backed 143 utilities');
 ok(document.getElementById('home-venture-count').textContent==='0','no unqualified venture launches');
 ok(document.getElementById('impact-visitors').textContent==='—','no invented unique visitor count');
 ok(document.getElementById('impact-partners').textContent==='—','no invented partner count');
 ok(document.getElementById('revenue-chart').hidden,'revenue graph absent without evidence');
 ok(document.querySelector('.app-empty')!==null,'no fictitious trending ventures');
 ok(document.querySelector('.milestone-empty')!==null,'no fabricated milestones');
 for(const page of ['home','ventures','builders','impact','tools','partners','contact']){
   location.hash='#'+page;
   await wait(()=>!document.getElementById(page).hidden);
   ok([...document.querySelectorAll('.view')].filter(e=>!e.hidden).length===1,'route '+page+' is uniquely active');
   ok(document.documentElement.scrollWidth<=innerWidth+2,'route '+page+' has no horizontal overflow');
 }
 location.hash='#tools';await wait(()=>!document.getElementById('tools').hidden);
 const input=document.getElementById('tool-search');
 input.value='pdf';input.dispatchEvent(new Event('input',{bubbles:true}));
 ok(document.querySelectorAll('.tool-card').length>0,'PDF tool search returns real tools');
 const allCount=Number((document.getElementById('tool-results-count').textContent.match(/\d+/)||[])[0]);
 ok(allCount>0&&allCount<143,'search reduces catalogue');
 input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
 const first=document.querySelector('.tool-card-fav');ok(!!first,'tool cards have favorite actions');
 first.click();ok(document.getElementById('saved-count').textContent==='1','saved tool persists');
 document.getElementById('saved-toggle').click();ok(document.getElementById('tool-results-count').textContent==='1 result','saved-only filter works');
 document.getElementById('saved-toggle').click();first.click();
 ok(document.getElementById('saved-count').textContent==='0','saved tool can be removed');
 ok(document.querySelectorAll('.mobile-dock a').length===4,'quick mobile navigation includes four key routes');
 location.hash='#home';await wait(()=>!document.getElementById('home').hidden);
 document.getElementById('more-toggle').click();
 ok(!document.getElementById('more-panel').hidden,'More menu opens');
 document.getElementById('more-close').click();ok(document.getElementById('more-panel').hidden,'More menu closes');
 document.getElementById('menu-toggle').click();ok(!document.getElementById('mobile-menu').hidden,'mobile menu opens');
 document.getElementById('menu-toggle').click();ok(document.getElementById('mobile-menu').hidden,'mobile menu closes');
 location.hash='#home';
 status.dataset.status='passed';status.textContent='REBUILD QA · '+checks.length+' PASS\n'+checks.join('\n');
}catch(err){status.dataset.status='failed';status.textContent='REBUILD QA FAILED · '+err.message+'\n'+checks.join('\n');throw err;}