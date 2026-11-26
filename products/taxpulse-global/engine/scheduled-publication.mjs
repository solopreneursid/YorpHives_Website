import {verifyStatutoryReview} from './statutory-review.mjs';
import {publishSnapshot,readRuleHead} from './rule-publisher.mjs';
const MAX=512000;
export async function runScheduledPublication(env,engineFingerprint,{now=new Date()}={}){
 if(!env?.RULE_DB||!env?.RULE_INBOX||typeof env.RULE_PUBLIC_KEY!=='string'||typeof env.RULE_REVIEW_PUBLIC_KEY!=='string'||typeof env.RULE_REVIEWER_ID!=='string'||env.RULE_PUBLIC_KEY===env.RULE_REVIEW_PUBLIC_KEY)throw Error('Incomplete publisher configuration');
 const raw=await env.RULE_INBOX.get('pending-preview','text');
 if(raw===null)return {state:'no_candidate'};
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX)throw Error('Invalid publication package size');
 const packageData=JSON.parse(raw);
 if(!packageData||Object.keys(packageData).length!==3||!Object.hasOwn(packageData,'envelope')||!Object.hasOwn(packageData,'fixtures')||!Object.hasOwn(packageData,'review'))throw Error('Invalid publication package');
 const head=await readRuleHead(env.RULE_DB);
 const sequence=packageData.envelope?.payload?.sequence;
 if(!Number.isSafeInteger(sequence))throw Error('Invalid sequence');
 if(sequence<=head.sequence)return {state:'already_processed',sequence:head.sequence};
 await verifyStatutoryReview(packageData.envelope,packageData.review,{publicKeyHex:env.RULE_PUBLIC_KEY,reviewerPublicKeyHex:env.RULE_REVIEW_PUBLIC_KEY,reviewerId:env.RULE_REVIEWER_ID,now});
 return publishSnapshot(env.RULE_DB,packageData.envelope,packageData.fixtures,{publicKeyHex:env.RULE_PUBLIC_KEY,engineFingerprint,now});
}
export function createPublicationWorker(engineFingerprint){return {scheduled(event,env,ctx){ctx.waitUntil(runScheduledPublication(env,engineFingerprint).then(r=>console.log(JSON.stringify({event:'regulatory-publication',...r}))).catch(()=>{console.error('Regulatory publication rejected');throw Error('Regulatory publication rejected');}));},fetch(){return new Response('Not found',{status:404,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});}};}
