// Pure decisions, kept separate from the GitHub and HTTP adapters.
export function assessWorkflow(input,maxHours,now=Date.now()){
 const runs=Array.isArray(input)?input:[];
 const completed=runs.filter(x=>x.status==='completed'&&x.head_branch==='main'&&x.event!=='pull_request'&&Number.isFinite(Date.parse(x.updated_at)))
  .sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
 const last=completed[0]||null;
 const lastScheduled=completed.find(x=>x.event==='schedule')||null;
 const lastFallback=completed.find(x=>x.event==='workflow_dispatch')||null;
 // Push-only runs never hide a missed schedule once scheduled executions exist.
 // A successful, recent explicit recovery dispatch does restore actual coverage.
 const covered=completed.find(x=>x.event==='schedule'||x.event==='workflow_dispatch')||
  (lastScheduled?null:completed.at(-1))||null;
 const ageHours=covered?(now-Date.parse(covered.updated_at))/3600000:Infinity;
 const scheduledAgeHours=lastScheduled?(now-Date.parse(lastScheduled.updated_at))/3600000:Infinity;
 const scheduleHealthy=Boolean(lastScheduled&&scheduledAgeHours>=-.25&&
  scheduledAgeHours<maxHours&&lastScheduled.conclusion==='success');
 return {last,lastScheduled,lastFallback,ageHours,scheduleHealthy,
  degraded:!scheduleHealthy&&Boolean(lastFallback)&&
   ageHours>=-.25&&ageHours<maxHours&&covered===lastFallback&&lastFallback.conclusion==='success',
  healthy:Boolean(covered&&ageHours>=-.25&&ageHours<maxHours&&covered.conclusion==='success')};
}
export function assessHeartbeat(status,payload){
 return status===200&&payload?.ok===true&&Object.keys(payload).length===1;
}
