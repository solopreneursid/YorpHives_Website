const API='https://api.github.com/repos/solopreneursid/YorpHives_Website';
const REPO_ID=1457876727,WORKFLOW_ID=431146278;
const WORKFLOW='.github/workflows/taxpulse-regulatory-daily.yml';
const MAX=300000;
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export async function evidenceDigest(bytes){if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.byteLength>MAX)throw Error('Invalid evidence size');return hex(await crypto.subtle.digest('SHA-256',bytes));}
function fresh(value,now,maxAge=3600000){const t=Date.parse(value);return Number.isFinite(t)&&t<=now&&now-t<=maxAge;}
async function getJson(fetcher,path){const r=await fetcher(API+path,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'TaxPulse-Regulatory-Evidence/1.0'}});if(!r.ok||!r.body)throw Error('GitHub proof unavailable');const reader=r.body.getReader();const chunks=[];let length=0;try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>262144){await reader.cancel();throw Error('GitHub proof exceeds limit');}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(length);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
export async function verifyArtifactProof(runId,bytes,{fetcher=fetch,now=Date.now()}={}){
 if(typeof runId!=='string'||!/^\d{1,16}$/.test(runId)||!Number.isSafeInteger(Number(runId))||Number(runId)<1)throw Error('Invalid run ID');
 const digest=await evidenceDigest(bytes),id=Number(runId),name='taxpulse-evidence-sha256-'+digest;
 const run=await getJson(fetcher,'/actions/runs/'+id);
 if(run.id!==id||run.workflow_id!==WORKFLOW_ID||run.path!==WORKFLOW||run.head_branch!=='main'||run.repository?.id!==REPO_ID||run.head_repository?.id!==REPO_ID||!['push','schedule','workflow_dispatch'].includes(run.event)||!['in_progress','completed'].includes(run.status)||!fresh(run.run_started_at,now)||typeof run.head_sha!=='string'||!/^[a-f0-9]{40}$/.test(run.head_sha))throw Error('Workflow proof rejected');
 const artifacts=await getJson(fetcher,'/actions/runs/'+id+'/artifacts?per_page=10&name='+name);
 if(artifacts.total_count!==1||!Array.isArray(artifacts.artifacts)||artifacts.artifacts.length!==1)throw Error('Evidence digest not published');
 const a=artifacts.artifacts[0],w=a.workflow_run;
 if(a.name!==name||a.expired!==false||!Number.isSafeInteger(a.id)||a.id<=0||!Number.isSafeInteger(a.size_in_bytes)||a.size_in_bytes<=0||a.size_in_bytes>MAX+10000||!fresh(a.created_at,now)||Date.parse(a.created_at)<Date.parse(run.run_started_at)||w?.id!==id||w.repository_id!==REPO_ID||w.head_repository_id!==REPO_ID||w.head_branch!=='main'||w.head_sha!==run.head_sha)throw Error('Artifact proof rejected');
 return {runId,artifactId:a.id,reportDigest:digest};
}
