const sources=[{"id":"US-0","country":"US","url":"https://www.irs.gov/irb/2025-45_IRB"},{"id":"US-1","country":"US","url":"https://www.ssa.gov/OACT/COLA/cbb.html"},{"id":"GB-2","country":"GB","url":"https://www.gov.uk/income-tax-rates"},{"id":"IN-3","country":"IN","url":"https://www.incometax.gov.in/"},{"id":"DE-4","country":"DE","url":"https://www.bundesfinanzministerium.de/"},{"id":"AE-5","country":"AE","url":"https://tax.gov.ae/"},{"id":"CA-6","country":"CA","url":"https://www.canada.ca/en/revenue-agency.html"},{"id":"AU-7","country":"AU","url":"https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents"},{"id":"SG-8","country":"SG","url":"https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates"}];
export async function inspect(source,previous={},fetcher=fetch){
 const checkedAt=new Date().toISOString();
 try{
 const r=await fetcher(source.url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{'user-agent':'TaxPulse-Regulatory-Review/0.1'}});
 if(!r.ok)throw Error('HTTP '+r.status);
 const reader=r.body.getReader();let size=0;const parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();throw Error('Source exceeds limit')}parts.push(value)}
 const data=new Uint8Array(size);let pos=0;for(const part of parts){data.set(part,pos);pos+=part.byteLength}
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('');
 const changed=Boolean(previous.sha256&&previous.sha256!==sha256);
 return {...source,checkedAt,sha256,status:!previous.sha256?'baseline':changed?'review_required':'unchanged',reviewPending:Boolean(previous.reviewPending||changed),ruleChangesApplied:false};
 }catch(e){return {...source,checkedAt,sha256:previous.sha256||null,status:'fetch_failed',reviewPending:Boolean(previous.reviewPending),error:String(e.message),ruleChangesApplied:false}}
}
export async function run(env,fetcher=fetch){
 const prior=await env.REGULATORY_STATE.get('latest','json');const old=new Map((prior?.sources||[]).map(s=>[s.id,s]));
 const results=await Promise.all(sources.map(s=>inspect(s,old.get(s.id),fetcher)));
 const report={mode:'review_only',checkedAt:new Date().toISOString(),sources:results};
 await env.REGULATORY_STATE.put('latest',JSON.stringify(report));
 console.log(JSON.stringify({event:'regulatory-review',checkedAt:report.checkedAt,sources:results.map(s=>({id:s.id,status:s.status,reviewPending:s.reviewPending}))}));
 return report;
}
export default {scheduled(event,env,ctx){ctx.waitUntil(run(env))},fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}})}};
