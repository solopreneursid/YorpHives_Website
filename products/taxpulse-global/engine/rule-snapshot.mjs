import {validateRegionalRegistry} from './regional-registry.mjs';
import {validateIndiaSalaryRegistry} from './india-salary-registry.mjs';
const MAX_BYTES=262144;
const encoder=new TextEncoder();
const hex=/^[a-f0-9]{64}$/;
const exact=(o,keys)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))throw Error('Invalid snapshot shape');};
function canonical(value,depth=0){if(depth>24)throw Error('Snapshot nested too deeply');if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value))return value.map(v=>canonical(v,depth+1));if(value&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k],depth+1)]));throw Error('Unsupported snapshot value');}
export function snapshotBytes(payload){const bytes=encoder.encode(JSON.stringify(canonical(payload)));if(bytes.byteLength>MAX_BYTES)throw Error('Snapshot exceeds limit');return bytes;}
const asHex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
function fromHex(s,length){if(typeof s!=='string'||s.length!==length*2||!/^[a-f0-9]+$/.test(s))throw Error('Invalid signature or key');return Uint8Array.from(s.match(/../g),v=>parseInt(v,16));}
const timestamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
function unchangedHistorical(previous,next,now){
 const today=now.toISOString().slice(0,10);
 const oldRows=previous?.versions||[];
 for(const row of oldRows){if(row.effectiveUntil<=today){const match=next.versions.find(r=>r.version===row.version);if(!match||JSON.stringify(canonical(row))!==JSON.stringify(canonical(match)))throw Error('Historical version cannot be replaced');}}
}
export async function verifyRuleSnapshot(envelope,{publicKeyHex,engineFingerprint,previous=null,minimumSequence=0,now=new Date()}){
 exact(envelope,['payload','digest','signature']);
 const p=envelope.payload;
 exact(p,['schemaVersion','sequence','engineFingerprint','issuedAt','expiresAt','mode','regional','indiaSalary','evidence']);
 if(p.schemaVersion!==1||p.mode!=='preview'||!Number.isSafeInteger(p.sequence)||p.sequence<=minimumSequence||p.sequence<=(previous?.sequence||0)||!hex.test(engineFingerprint)||p.engineFingerprint!==engineFingerprint)throw Error('Incompatible or replayed snapshot');
 if(!timestamp(p.issuedAt)||!timestamp(p.expiresAt)||Date.parse(p.issuedAt)>now.getTime()||Date.parse(p.expiresAt)<=now.getTime()||Date.parse(p.expiresAt)-Date.parse(p.issuedAt)>7*86400000)throw Error('Snapshot expired or not yet valid');
 const bytes=snapshotBytes(p),digest=asHex(await crypto.subtle.digest('SHA-256',bytes));
 if(envelope.digest!==digest)throw Error('Snapshot digest mismatch');
 const key=await crypto.subtle.importKey('raw',fromHex(publicKeyHex,32),'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,fromHex(envelope.signature,64),bytes))throw Error('Invalid snapshot signature');
 validateRegionalRegistry(p.regional);validateIndiaSalaryRegistry(p.indiaSalary);
 unchangedHistorical(previous?.regional,p.regional,now);unchangedHistorical(previous?.indiaSalary,p.indiaSalary,now);
 if(!Array.isArray(p.evidence)||!p.evidence.length||p.evidence.length>200)throw Error('Missing source evidence');
 const versions=[...p.regional.versions,...p.indiaSalary.versions],ids=new Set(versions.map(r=>r.version));
 if(ids.size!==versions.length)throw Error('Duplicate rule version');
 const seen=new Set();
 for(const e of p.evidence){exact(e,['version','sourceUrl','sourceDigest','reviewedAt','fixtureDigest']);if(!ids.has(e.version)||seen.has(e.version)||!hex.test(e.sourceDigest)||!hex.test(e.fixtureDigest)||!timestamp(e.reviewedAt)||e.reviewedAt>p.issuedAt||!versions.find(r=>r.version===e.version).sourceUrls.includes(e.sourceUrl))throw Error('Invalid rule evidence');seen.add(e.version);}
 if(versions.some(v=>!seen.has(v.version)))throw Error('Missing version evidence');
 // Signature authenticates the trusted preview publisher, not legal correctness.
 return {sequence:p.sequence,engineFingerprint:p.engineFingerprint,issuedAt:p.issuedAt,expiresAt:p.expiresAt,digest,regional:p.regional,indiaSalary:p.indiaSalary,mode:'preview',taxRulesVerified:false};
}
