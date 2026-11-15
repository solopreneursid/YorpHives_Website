// Preview-only browser QA. No external requests, no changes to real tools.
// This file is excluded from production by the build's preview-only copy rule.
const qa=document.createElement('pre');
qa.id='yorphives-library-qa';
qa.dataset.status='running';
qa.textContent='Running library checks';
document.body.append(qa);
const steps=[];
const assert=(v,message)=>{if(!v)throw Error(message);};
const check=async(name,fn)=>{
 try{await fn();steps.push({name,ok:true});}
 catch(error){steps.push({name,ok:false,error:String(error?.message||error)});}
};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const wait=async(fn,ms=8000)=>{const start=performance.now();while(performance.now()-start<ms){if(fn())return;await sleep(50);}throw Error('Timed out waiting for library');};
const query=selector=>document.querySelector(selector);
const cards=()=>[...document.querySelectorAll('#tools-items .tool-mini-card')];
const category=name=>[...document.querySelectorAll('#tool-categories button')].find(x=>x.dataset.category===name);
const currentCount=()=>query('#tool-count')?.textContent||'';
try{
 await wait(()=>cards().length===12);
 await check('initial page has twelve compact results and all twelve catalog categories',async()=>{
  assert(cards().length===12,'Expected 12 cards, found '+cards().length);
  assert(document.querySelectorAll('#tool-categories button').length===14,'Expected 12 categories + All + Saved');
  assert(currentCount().includes('92'),'Expected 92 tools in the count');
  assert(!query('#tool-more-wrap').hidden,'Show more should be available');
  assert(cards().every(x=>x.querySelector('a.tool-mini-link')?.href.includes('/tools/')),'Tool link missing');
 });
 await check('name sorting changes order without losing items',async()=>{
  const select=query('#tool-sort');select.value='az';select.dispatchEvent(new Event('change',{bubbles:true}));
  const names=cards().map(x=>x.querySelector('h3').textContent);
  assert(names.length===12,'Sort lost cards');
  assert([...names].sort((a,b)=>a.localeCompare(b))[0]===names[0],'A–Z sort failed');
 });
 await check('meaning-based search finds the PDF merger',async()=>{
  const input=query('#tool-search');input.value='combine pdf';input.dispatchEvent(new Event('input',{bubbles:true}));
  assert(cards().length>0,'No PDF merge results');
  assert(cards().some(x=>x.textContent.includes('Merge PDF')),'Search did not find PDF merger');
 });
 await check('unmatched query shows helpful empty state',async()=>{
  const input=query('#tool-search');input.value='no-such-tool-zzzz';input.dispatchEvent(new Event('input',{bubbles:true}));
  assert(cards().length===0,'Expected zero results');
  assert(!query('#tool-no-results').hidden,'No-results help should be visible');
 });
 await check('reset restores initial results',async()=>{
  query('#tool-reset').click();
  assert(cards().length===12,'Reset did not restore 12 results');
  assert(query('#tool-search').value==='','Reset did not clear search');
 });
 await check('category chips show exact category subset',async()=>{
  category('Files').click();
  assert(cards().length===8,'File category has 8 tools; found '+cards().length);
  assert(currentCount().includes('8'),'Category count mismatch');
  assert(query('#tool-more-wrap').hidden,'No more files should exist');
 });
 await check('saved tools filter works, and removing the star removes it',async()=>{
  const first=cards()[0].querySelector('.tool-favorite');first.click();
  category('__saved__').click();
  assert(cards().length===1,'Expected exactly one saved card');
  assert(cards()[0].querySelector('.tool-favorite').getAttribute('aria-pressed')==='true','Saved star not active');
  cards()[0].querySelector('.tool-favorite').click();
  assert(cards().length===0,'Unfavorite did not update saved view');
  assert(!query('#tool-no-results').hidden,'Empty favorites message missing');
 });
 await check('Show more grows progressively without duplicate links',async()=>{
  query('#tool-clear').click();
  assert(cards().length===12,'Clear filters did not reset');
  query('#tool-more').click();
  assert(cards().length===24,'Expected 24 cards after Show more');
  for(let i=0;i<6;i++)query('#tool-more').click();
  assert(cards().length===92,'Expected all 92 cards after six further clicks; found '+cards().length);
  const urls=cards().map(x=>x.querySelector('a.tool-mini-link')?.getAttribute('href'));
  assert(new Set(urls).size===92,'Duplicate or missing URLs');
  assert(query('#tool-more-wrap').hidden,'Show more should be hidden when finished');
 });
 await check('top and footer Ko-fi remain disabled',async()=>{
  assert(document.querySelectorAll('#header-kofi[disabled],#footer-kofi[disabled]').length===2,
    'Ko-fi button unexpectedly enabled');
 });
 await check('free-tools UI fits browser width',async()=>{
  assert(document.documentElement.scrollWidth<=innerWidth+2,
    'Horizontal overflow: '+document.documentElement.scrollWidth+' versus '+innerWidth);
 });
} catch(error){steps.push({name:'Library test setup',ok:false,error:String(error?.message||error)});}
const failures=steps.filter(x=>!x.ok);
qa.dataset.status=failures.length?'failed':'passed';
qa.textContent=JSON.stringify({viewport:innerWidth,tests:steps.length,passed:steps.length-failures.length,failed:failures.length,steps},null,2);
