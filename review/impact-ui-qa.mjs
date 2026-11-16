/* Preview-only Impact interaction QA. Never injected into normal browsing. */
const indicator=document.createElement('pre');
indicator.id='impact-ui-qa';
indicator.dataset.status='running';
indicator.style.cssText='position:fixed;z-index:10000;top:72px;left:9px;max-width:calc(100vw - 18px);max-height:50vh;overflow:auto;padding:12px;background:#0c3020;color:#c6ffd7;border:1px solid #74d7a2;border-radius:10px;font:11px/1.5 monospace;white-space:pre-wrap';
document.body.append(indicator);
const checks=[];
const check=(condition,label)=>{if(!condition)throw Error(label);checks.push(label)};
const wait=async pred=>{for(let i=0;i<150;i++){if(pred())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+pred)};
try{
 await wait(()=>document.getElementById('impact-tools')?.textContent!=='—');
 check(document.querySelectorAll('.impact-metric').length===4,'four readable Impact metric cards');
 check(document.getElementById('impact-tools').textContent==='143','published tool count comes from catalog');
 check(document.getElementById('impact-ventures').textContent==='0','zero unqualified ventures displayed honestly');
 check(document.getElementById('impact-visitors').textContent==='—','no invented unique visitors');
 check(document.getElementById('impact-partners').textContent==='—','no invented partner numbers');
 check(document.getElementById('impact-revenue-chart').hidden,'no fabricated revenue line');
 check(!document.getElementById('impact-revenue-empty').hidden,'revenue reporting empty state shown');
 check(document.querySelector('.impact-app-empty')!==null,'unverified app popularity remains withheld');
 check(document.querySelector('.impact-milestone-empty')!==null,'unverified milestones remain withheld');
 check(!document.querySelector('#home-impact a[href^="https://"]'),'no external analytics redirects');
 const orig=location.hash;
 location.hash='#home-impact';
 await wait(()=>!document.getElementById('home').hidden);
 check(document.querySelector('.mobile-dock [data-nav="home"]')?.getAttribute('aria-current')==='page','Impact deep link stays inside Home');
 check(document.getElementById('home-impact')?.getBoundingClientRect().top>-90,'Impact anchor scroll resolves');
 const full=document.documentElement.scrollWidth;
 check(full<=innerWidth+2,'no horizontal document overflow ('+full+' vs '+innerWidth+')');
 location.hash=orig||'#home';
 indicator.dataset.status='passed';indicator.textContent='Impact UI QA: '+checks.length+' passed\n'+checks.join('\n');
}catch(error){indicator.dataset.status='failed';indicator.textContent='Impact UI QA FAILED: '+error.message+'\n'+checks.join('\n');throw error;}
