// Pure decisions, kept separate from the GitHub and HTTP adapters.
export function assessWorkflow(input,maxHours,now=Date.now()){
 const runs=Array.isArray(input)?input:[];
 const completed=runs.filter(x=>x.status==='completed'&&x.head_branch==='main'&&x.event!=='pull_request'&&Number.isFinite(Date.parse(x.updated_at)))
  .sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
 const last=completed[0]||null;
 const lastScheduled=completed.find(x=>x.event==='schedule')||null;
 // A manual or push run must not keep masking a missing schedule forever.
 // Until the first scheduled run, allow one window from the oldest observed run.
 const freshness=lastScheduled||completed.at(-1)||null;
 const ageHours=freshness?(now-Date.parse(freshness.updated_at))/3600000:Infinity;
 return {last,lastScheduled,ageHours,healthy:Boolean(last&&ageHours>=-.25&&ageHours<maxHours&&last.conclusion==='success'&&
  (!lastScheduled||lastScheduled.conclusion==='success'))};
}
export function assessHeartbeat(status,payload){
 return status===200&&payload?.ok===true&&Object.keys(payload).length===1;
}
