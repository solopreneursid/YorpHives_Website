// Preview-only interactive Tool Launcher checks; not shipped to production.
const qa=document.createElement('pre');
qa.id='yorphives-library-qa';
qa.dataset.status='running';
qa.textContent='Checking launcher';
document.body.append(qa);
const steps=[];
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const check=async(name,fn)=>{try{await fn();steps.push({name,ok:true});}catch(error){steps.push({name,ok:false,error:String(error?.message||error)});}};
const wait=async(predicate,timeout=9000)=>{
 const start=performance.now();while(performance.now()-start<timeout){if(predicate())return;await new Promise(r=>setTimeout(r,60));}
 throw Error('Tool Launcher did not load');
};
const q=id=>document.getElementById(id);
const rows=()=>[...document.querySelectorAll('.launcher-tool-row')];
const nav=name=>[...document.querySelectorAll('#tool-categories button')].find(button=>button.dataset.group===name);
try{
 await wait(()=>rows().length===8);
 await check('eight compact rows and seven main category groups',async()=>{
  assert(rows().length===8,'Expected 8 tool rows');
  assert(q('tool-page-number').textContent==='1 / 12','Expected 12 result pages');
  assert(document.querySelectorAll('#tool-categories button').length===9,'Expected Discover + 7 groups + My tools');
  assert(rows().every(row=>row.querySelector('a.launcher-tool-link')?.href.includes('/tools/')),'Missing direct links');
 });
 await check('pagination changes pages without making the page longer',async()=>{
  const first=rows()[0].querySelector('strong').textContent;
  q('tool-next').click();
  assert(rows().length===8,'Second page must also show 8');
  assert(q('tool-page-number').textContent==='2 / 12','Wrong page indicator');
  assert(rows()[0].querySelector('strong').textContent!==first,'Page did not change');
  q('tool-prev').click();
  assert(rows()[0].querySelector('strong').textContent===first,'Previous page failed');
 });
 await check('task search finds PDF Merge',async()=>{
  const search=q('tool-search');search.value='combine pdf';search.dispatchEvent(new Event('input',{bubbles:true}));
  assert(rows().some(row=>row.textContent.includes('Merge PDF')),'PDF merger not found');
 });
 await check('no-results view and clear search',async()=>{
  q('tool-search').value='not-a-real-tool-zzzz';q('tool-search').dispatchEvent(new Event('input',{bubbles:true}));
  assert(rows().length===0&&!q('tool-no-results').hidden,'Empty state not shown');
  q('tool-clear').click();
  assert(rows().length===8,'Clear did not reset');
 });
 await check('Documents category includes PDF, spreadsheets and presentations',async()=>{
  nav('documents').click();
  assert(q('tool-view-title').textContent==='Documents','Wrong heading');
  assert(q('tool-count').textContent.includes('10 tools'),'Expected 10 document tools');
  assert(rows().length===8,'Category should be paginated');
  assert(q('tool-page-number').textContent==='1 / 2','Wrong group page count');
 });
 await check('Files category and My tools work with local favorites',async()=>{
  nav('files').click();assert(rows().length===8,'Expected eight file tools');
  rows()[0].querySelector('.launcher-save').click();
  nav('__saved__').click();
  assert(rows().length===1,'Expected one saved tool');
  rows()[0].querySelector('.launcher-save').click();
  assert(rows().length===0,'Unsave should update list');
  assert(!q('tool-no-results').hidden,'Empty My tools state missing');
 });
 await check('Back returns to Discover, sorting works',async()=>{
  q('tool-back').click();assert(rows().length===8,'Back did not restore Discover');
  q('tool-sort').value='az';q('tool-sort').dispatchEvent(new Event('change',{bubbles:true}));
  const names=rows().map(row=>row.querySelector('strong').textContent);
  assert(names[0]===[...names].sort((a,b)=>a.localeCompare(b))[0],'Sort A–Z failed');
 });
 await check('mobile category shortcut matches sidebar group',async()=>{
  const button=[...document.querySelectorAll('#tool-mobile-categories button')].find(x=>x.dataset.group==='images');
  assert(!!button,'Images shortcut missing');
  button.click();
  assert(q('tool-view-title').textContent==='Images & Design','Mobile category selection failed');
  assert(q('tool-count').textContent.includes('12 tools'),'Images group count mismatch');
 });
 await check('Ko-fi still disabled',async()=>{
  assert(document.querySelectorAll('#header-kofi:disabled,#footer-kofi:disabled').length===2,'Ko-fi changed');
 });
 await check('no horizontal overflow at current viewport',async()=>{
  assert(document.documentElement.scrollWidth<=innerWidth+2,'Horizontal overflow at '+innerWidth+'px');
 });
} catch(error){steps.push({name:'Setup',ok:false,error:String(error?.message||error)});}
const failed=steps.filter(s=>!s.ok);
qa.dataset.status=failed.length?'failed':'passed';
qa.textContent=JSON.stringify({width:innerWidth,passed:steps.length-failed.length,failed:failed.length,steps},null,2);
