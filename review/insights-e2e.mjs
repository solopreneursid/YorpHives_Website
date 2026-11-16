/* Staging-only end-to-end verification. Never included on the live website.
 * Uses a synthetic, private test UUID and records one synthetic completed action
 * in the isolated PREVIEW analytics database only. */
const output=document.createElement('pre');
output.id='analytics-e2e';output.dataset.status='running';
output.style.cssText='position:fixed;z-index:100000;top:90px;left:10px;background:#092817;color:#d7ffe2;border:1px solid #7fe2a2;border-radius:9px;padding:12px;max-width:90vw;white-space:pre-wrap;font-size:12px';
output.textContent='Checking first-party API…';
document.body.append(output);
(async()=>{
 try{
  const report=()=>fetch('/api/insights/public?test='+crypto.randomUUID(),{cache:'no-store'}).then(async r=>{
   if(!r.ok)throw Error('GET reporting: '+r.status);
   return r.json();
  });
  const before=await report();
  if(before.available!==true)throw Error('Public report not available');
  const id=crypto.randomUUID();
  const submit=async body=>{
   const r=await fetch('/api/insights/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:id,...body})});
   if(!r.ok)throw Error('POST failed '+r.status+' '+(await r.text()).slice(0,100));
   return r.json();
  };
  const view=await submit({event:'view',route:'impact'});
  if(view.counted!==true)throw Error('Visitor session was not recorded');
  const use=await submit({event:'complete',url:'tools/word-counter/'});
  if(use.counted!==true)throw Error('Successful tool action was not recorded');
  const duplicate=await submit({event:'complete',url:'tools/word-counter/'});
  if(duplicate.counted!==false)throw Error('Replay was not deduplicated');
  const after=await report();
  if(after.traffic.estimatedSessions30d<before.traffic.estimatedSessions30d+1)throw Error('Session not reflected in aggregates');
  const getCount=x=>x.usage.ranked.find(v=>v.url==='tools/word-counter/')?.completedActions||0;
  if(getCount(after)!==getCount(before)+1)throw Error('Usage count did not increase exactly once');
  output.dataset.status='passed';
  output.textContent='PASS: Session recorded, completion recorded, duplicate ignored, public report updated.\nSessions: '+before.traffic.estimatedSessions30d+' → '+after.traffic.estimatedSessions30d+'\nTool actions: '+getCount(before)+' → '+getCount(after);
 }catch(error){
  output.dataset.status='failed';
  output.textContent='FAIL: '+String(error?.message||error);
 }
})();
