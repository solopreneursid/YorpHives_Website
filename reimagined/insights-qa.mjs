/* Staging-only interaction test. Not bundled into production. */
const pre=document.createElement('pre');
pre.id='insights-qa';pre.dataset.status='running';
pre.style.cssText='position:fixed;z-index:99999;top:60px;left:5px;max-width:calc(100vw - 10px);max-height:60vh;overflow:auto;background:#092e1f;color:#bfffdb;padding:15px;font:11px/1.45 monospace;white-space:pre-wrap';
document.body.append(pre);
const sessionId=crypto.randomUUID();
const send=async obj=>{
 const r=await fetch('/api/insights/collect',{method:'POST',credentials:'omit',
  headers:{'Content-Type':'application/json'},body:JSON.stringify({...obj,sessionId})});
 return{status:r.status,data:r.status===204?null:await r.json()};
};
try{
 const first=await send({event:'view',route:'tools'});
 const duplicate=await send({event:'view',route:'tools'});
 const invalid=await send({event:'complete',url:'tools/does-not-exist/',});
 const valid=first.status===200&&first.data?.counted===true&&
  duplicate.status===200&&duplicate.data?.counted===false&&invalid.status===422;
 pre.dataset.status=valid?'passed':'failed';
 pre.textContent=JSON.stringify({valid,first,duplicate,invalid},null,2);
}catch(e){pre.dataset.status='failed';pre.textContent=String(e)}
