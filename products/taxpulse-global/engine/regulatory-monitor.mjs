import {createHash} from 'node:crypto';
import {classifyObservation} from './regulatory-policy.mjs';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const sources=JSON.parse(readFileSync(new URL('../rules/monitor-sources.json',import.meta.url),'utf8'));
export async function inspect(source,previous={},fetcher=fetch){
 try{
 const r=await fetcher(source.url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'user-agent':'TaxPulse-Regulatory-Review/0.1'}});
 if(!r.ok)throw Error('HTTP '+r.status);
 const reader=r.body.getReader();let size=0;const hash=createHash('sha256');
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>5*1024*1024){await reader.cancel();throw Error('Source exceeds limit')}hash.update(value)}
 const digest=hash.digest('hex');
 return {...source,sha256:digest,status:!previous.sha256?'baseline':previous.sha256===digest?'unchanged':'review_required',reviewPending:Boolean(previous.reviewPending||(previous.sha256&&previous.sha256!==digest)),checkedAt:new Date().toISOString(),ruleChangesApplied:false};
 }catch(e){return {...source,status:'fetch_failed',sha256:previous.sha256||null,reviewPending:Boolean(previous.reviewPending),error:String(e.message),checkedAt:new Date().toISOString(),ruleChangesApplied:false}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=process.argv[2]||'regulatory-report.json';let prior={};try{prior=Object.fromEntries(JSON.parse(readFileSync(output,'utf8')).sources.map(s=>[s.id,s]))}catch{}
 const report=[];for(const s of sources){const observation=await inspect(s,prior[s.id]);report.push({...observation,...classifyObservation(s,observation)});}
 writeFileSync(output+'.tmp',JSON.stringify({mode:'review_only',generatedAt:new Date().toISOString(),automaticRuleChanges:false,sources:report},null,2)+'\n',{mode:0o600});
 renameSync(output+'.tmp',output);
}
