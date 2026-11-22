// Pure decisions, kept separate from the GitHub and HTTP adapters.
export function assessWorkflow(input,maxHours,now=Date.now()){
 const runs=Array.isArray(input)?input:[];
 const completed=runs.filter(x=>x.status==='completed'&&x.head_branch==='main'&&x.event!=='pull_request'&&Number.isFinite(Date.parse(x.updated_at)))
  .sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
 const last=completed[0]||null,ageHours=last?(now-Date.parse(last.updated_at))/3600000:Infinity;
 return {last,ageHours,healthy:Boolean(last&&ageHours>=-.25&&ageHours<maxHours&&last.conclusion==='success')};
}
export function assessHeartbeat(status,payload){
 return status===200&&payload?.ok===true&&Object.keys(payload).length===1;
}
