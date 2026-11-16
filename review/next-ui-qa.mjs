/* Preview-only interaction smoke check. Invoke explicitly on a preview URL.
 * Never injected into ordinary pages or production output.
 */
const status=document.createElement('pre');
status.id='next-ui-qa';
status.dataset.status='running';
status.textContent='Running YorpHives Next UI checks…';
status.style.cssText='position:fixed;z-index:9999;left:10px;top:76px;max-width:calc(100vw - 20px);max-height:50vh;overflow:auto;padding:14px;background:#061b15;color:#aaffd0;border:1px solid #71d99b;border-radius:12px;font:12px/1.6 monospace;white-space:pre-wrap';
document.body.append(status);
const results=[];
const check=(condition,message)=>{if(!condition)throw Error(message);results.push(message+': passed');};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,ms=10000)=>{
 const started=Date.now();
 while(Date.now()-started<ms){if(fn())return;await sleep(80);}
 throw Error('Timeout: '+String(fn).slice(0,110));
};
try{
 await wait(()=>document.getElementById('tool-total')?.textContent.includes('free tools'));
 check(document.querySelectorAll('.mobile-dock a').length===5,'five mobile destinations');
 check(['home-explore','home-use','home-connect'].every(id=>!!document.getElementById(id)),'three distinct home experiences');
 check(!document.querySelector('#home .os-board')&&!document.querySelector('#home .spotlight-panel'),'old repetitive HQ diagrams are removed');
 check(!!document.querySelector('#home .hero-identity-mark'),'logo-inspired geometric animated background');
 check(document.querySelectorAll('#home-pulse-viewport .pulse-track').length===1,'only one verified YHpulse');
 const firstTools=[...document.querySelectorAll('#home-tools-list .home-tool-card')];
 check(firstTools.length>=4,'featured tools populated from the published catalog');
 check(firstTools.every(x=>/^tools\\/[a-z0-9-]+\\/$/.test(x.getAttribute('href'))),'featured links use local tool routes');
 const homeSearch=document.getElementById('home-tool-search');
 homeSearch.value='word counter';
 document.getElementById('home-tool-search-form').requestSubmit();
 await wait(()=>!document.getElementById('tools').hidden);
 check(document.getElementById('tool-search').value==='word counter','homepage search transfers its query');
  const originalHash=location.hash;
 location.hash='#tools';
 await wait(()=>!document.getElementById('tools').hidden);
 check(document.querySelector('.mobile-dock [data-nav="tools"]')?.getAttribute('aria-current')==='page','tools route active');
 const search=document.getElementById('tool-search');
 search.value='word counter';search.dispatchEvent(new Event('input',{bubbles:true}));
 await wait(()=>document.getElementById('tool-count')?.textContent.includes('of '));
 const found=[...document.querySelectorAll('.tool-card h3')].some(x=>x.textContent==='Word & Character Counter');
 check(found,'search results');
 const save=document.querySelector('.tool-card .favorite-button');
 const savedBefore=save?.getAttribute('aria-pressed')==='true';
 save?.click();await sleep(100);
 check(document.querySelector('.tool-card .favorite-button')?.getAttribute('aria-pressed')===String(!savedBefore),'favorite toggles');
 // Restore the ephemeral test's original local favorite state.
 document.querySelector('.tool-card .favorite-button')?.click();
 search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));await sleep(100);
 const category=[...document.querySelectorAll('.chip')].find(x=>x.dataset.group==='documents');
 category?.click();await sleep(100);
 check(document.querySelector('.chip[data-group="documents"]')?.getAttribute('aria-pressed')==='true','category filtering');
 document.getElementById('tool-show-all')?.click();await sleep(100);
 const first=document.getElementById('tool-page-number').textContent;
 document.getElementById('tool-next')?.click();await sleep(100);
 check(first==='1 / 15'&&document.getElementById('tool-page-number').textContent==='2 / 15','pagination');
 location.hash='#builders';
 await wait(()=>!document.getElementById('builders').hidden);
 check(document.querySelector('.mobile-dock [data-nav="builders"]')?.getAttribute('aria-current')==='page','builders navigation');
 location.hash='#how-it-works';
 await wait(()=>!document.getElementById('home').hidden);
 check(document.querySelector('.mobile-dock [data-nav="home"]')?.getAttribute('aria-current')==='page','how-it-works resolves to home');
 check(!!document.querySelector('#home-explore .stage-founder'),'founder approval gate inside project showcase');
 check(!!document.querySelector('#home-connect .connection-network'),'visual connection network');
 check(document.querySelectorAll('#category-ribbon-track .rail-set').length===2,'seamless animated category rail');
 check(!!document.querySelector('#home-pulse-viewport .pulse-track')&&!document.querySelector('#footer-pulse'),'only homepage YHpulse is built');
 const catPause=document.querySelector('#home [data-motion-toggle="categories"]');
 catPause.click();
 check(catPause.getAttribute('aria-pressed')==='true','category animation pause control');
 catPause.click();
 check(catPause.getAttribute('aria-pressed')==='false','category animation resume control');
 check(getComputedStyle(document.querySelector('#category-ribbon-track')).animationName==='rail-drift','category motion resumes after touching pause button');
 const pulsePause=document.querySelector('#home [data-motion-toggle="pulse"]');
 pulsePause.click();
 check(pulsePause.getAttribute('aria-pressed')==='true','YHpulse pause control');
 check(getComputedStyle(document.querySelector('#home-pulse-viewport .pulse-track')).animationName==='none','YHpulse stops on pause');
 pulsePause.click();
 check(pulsePause.getAttribute('aria-pressed')==='false','YHpulse resume control');
 check(getComputedStyle(document.querySelector('#home-pulse-viewport .pulse-track')).animationName==='pulse-scroll','YHpulse resumes after touch');
 location.hash='#projects-collection';
 await wait(()=>!document.getElementById('explore').hidden);
 check(document.querySelector('.mobile-dock [data-nav="explore"]')?.getAttribute('aria-current')==='page','project collection deep link resolves to Explore');
 check(!!document.getElementById('explore-process-title'),'Explore provenance process is visible');
 location.hash=originalHash||'#home';
 check(document.documentElement.scrollWidth<=innerWidth+2,'no document overflow');
 status.dataset.status='passed';
 status.textContent=results.join('\n');
}catch(error){
 status.dataset.status='failed';
 status.textContent=results.join('\n')+'\nFAILED: '+String(error?.message||error);
}
