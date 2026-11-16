/* Preview-only browser acceptance. Loaded manually; never on production. */
(async()=>{
 const out=document.createElement('div');out.id='studio-qa';out.dataset.status='running';
 out.style.cssText='position:fixed;z-index:500;right:8px;top:31px;background:#cafe80;color:#0b262d;border-radius:8px;padding:6px 10px;font:800 12px system-ui';
 out.textContent='QA running';document.body.append(out);
 let checks=0;const ok=(v,name)=>{if(!v)throw Error(name);checks++};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async(fn,timeout=10000)=>{const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error('Timed out waiting for '+String(fn));await sleep(80)}};
 try{
  await until(()=>document.querySelectorAll('#tool-results .tool-card').length>=1);
  ok(document.querySelectorAll('#tool-results .tool-card').length>0,'real catalog loaded');
  ok(document.querySelectorAll('#home-tool-list .mini-tool').length>=3,'featured free tools loaded');
  ok(document.querySelectorAll('.pulse-band').length===1,'single YHpulse');
  ok(document.querySelector('.preview-banner').textContent.includes('NOT LIVE'),'not-live label');
  ok(document.documentElement.scrollWidth<=innerWidth+1,'no page overflow');
  location.hash='#tools';await until(()=>!document.getElementById('tools').hidden);
  const input=document.getElementById('tool-query');input.value='word';input.dispatchEvent(new Event('input',{bubbles:true}));
  ok(document.querySelectorAll('#tool-results .tool-card').length>0,'search results');
  ok([...document.querySelectorAll('#tool-results .tool-card h3')].some(t=>/word/i.test(t.textContent)),'search relevant');
  document.querySelector('#tool-results .save-tool').click();
  ok(document.querySelector('#tool-results .save-tool').getAttribute('aria-pressed')==='true','favorite saved');
  document.getElementById('saved-filter').click();
  ok(document.querySelectorAll('#tool-results .tool-card').length>=1,'saved filter');
  document.getElementById('saved-filter').click();
  document.getElementById('tools-reset').click();
  ok(document.querySelectorAll('#tool-results .tool-card').length>0,'reset tools');
  location.hash='#hqventures';await until(()=>!document.getElementById('hqventures').hidden);
  ok(document.title.includes('HQventures'),'HQventures title');
  location.hash='#partners';await until(()=>!document.getElementById('builders').hidden);
  ok(document.getElementById('partners').offsetHeight>0,'Partnerships deep link');
  document.querySelector('#partners [data-reason="Partnership"]').click();
  await until(()=>!document.getElementById('contact').hidden);
  ok(document.getElementById('contact-topic').value==='Partnership','contact preselection');
  location.hash='#home';await until(()=>!document.getElementById('home').hidden);
  if(document.querySelector('.pulse-track')){
   document.getElementById('pulse-toggle').click();
   ok(document.querySelector('.pulse-band').classList.contains('is-paused'),'pulse pause');
   document.getElementById('pulse-toggle').click();
   ok(!document.querySelector('.pulse-band').classList.contains('is-paused'),'pulse resume');
  }
  if(innerWidth<=850){
   document.getElementById('menu-toggle').click();
   ok(document.getElementById('menu-toggle').getAttribute('aria-expanded')==='true','mobile menu open');
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
   ok(document.getElementById('menu-toggle').getAttribute('aria-expanded')==='false','mobile menu close');
  }
  ok(document.documentElement.scrollWidth<=innerWidth+1,'no overflow after routing');
  out.dataset.status='passed';out.textContent='QA passed · '+checks;
 }catch(e){out.dataset.status='failed';out.textContent='QA failed: '+e.message;console.error(e)}
})();
