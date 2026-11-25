import {publishSnapshot,readRuleHead} from './rule-publisher.mjs';
const MAX=512000;
export async function runScheduledPublication(env,engineFingerprint,{now=new Date()}={}){
 if(!env?.RULE_DB||!env?.RULE_INBOX||typeof env.RULE_PUBLIC_KEY!=='string')throw Error('Incomplete publisher configuration');
 const raw=await env.RULE_INBOX.get('pending-preview','text');
 if(raw===null)return {state:'no_candidate'};
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX)throw Error('Invalid publication package size');
 const packageData=JSON.parse(raw);
 if(!packageData||Object.keys(packageData).length!==2||!Object.hasOwn(packageData,'envelope')||!Object.hasOwn(packageData,'fixtures'))throw Error('Invalid publication package');
 const head=await readRuleHead(env.RULE_DB);
 const sequence=packageData.envelope?.payload?.sequence;
 if(!Number.isSafeInteger(sequence))throw Error('Invalid sequence');
 if(sequence<=head.sequence)return {state:'already_processed',sequence:head.sequence};
 return publishSnapshot(env.RULE_DB,packageData.envelope,packageData.fixtures,{publicKeyHex:env.RULE_PUBLIC_KEY,engineFingerprint,now});
}
export function createPublicationWorker(engineFingerprint){return {scheduled(event,env,ctx){ctx.waitUntil(runScheduledPublication(env,engineFingerprint).then(r=>console.log(JSON.stringify({event:'regulatory-publication',...r}))).catch(()=>{console.error('Regulatory publication rejected');throw Error('Regulatory publication rejected');}));},fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});}};}
