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
 check(document.querySelectorAll('#home .studio-step').length===5,'five journey stages');
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
 check(!!document.getElementById('our-ai-team')?.querySelector('.os-founder'),'founder and AI team panel');
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
