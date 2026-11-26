const hex64=/^[a-f0-9]{64}$/;
const sigHex=/^[a-f0-9]{128}$/;
const bytesFromHex=s=>Uint8Array.from(s.match(/../g),v=>parseInt(v,16));
const asHex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const MAX=300000;
export async function collectorSignaturePayload(body,runId,issuedAt){
 if(!(body instanceof Uint8Array)||body.byteLength<1||body.byteLength>MAX||typeof runId!=='string'||!/^\d{1,16}$/.test(runId)||!Number.isSafeInteger(Number(runId))||Number(runId)<1||typeof issuedAt!=='string'||!Number.isFinite(Date.parse(issuedAt))||new Date(issuedAt).toISOString()!==issuedAt)throw Error('Invalid collector signature subject');
 const reportDigest=asHex(await crypto.subtle.digest('SHA-256',body));
 const message=new TextEncoder().encode(JSON.stringify({purpose:'taxpulse-regulatory-evidence-v1',runId,issuedAt,reportDigest}));
 return {message,reportDigest};
}
export async function verifyCollectorSignature(body,{runId,issuedAt,signature,publicKeyHex,now=Date.now()}){
 if(!hex64.test(publicKeyHex||'')||!sigHex.test(signature||'')||!Number.isFinite(now))throw Error('Collector signature not configured or invalid');
 const {message,reportDigest}=await collectorSignaturePayload(body,runId,issuedAt);
 const age=now-Date.parse(issuedAt);if(age< -30000||age>300000)throw Error('Collector signature expired');
 const key=await crypto.subtle.importKey('raw',bytesFromHex(publicKeyHex),'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,bytesFromHex(signature),message))throw Error('Collector signature rejected');
 return {runId,reportDigest,collectorSignature:true};
}
