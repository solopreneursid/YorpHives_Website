import { countryCalculate } from './country.mjs';
import { assessTaxableIncome, compareIndiaRegimes, calculateCapitalGain } from './taxable-income.mjs';

const SCHEMA='taxpulse-example-receipt-v1';
const HASH=/^[a-f0-9]{64}$/;
const MAX_BYTES=65536;
const WARNING='Unverified example. SHA-256 checks integrity, not authorship, statutory correctness or filing eligibility.';
function plain(value,depth=0){
 if(depth>20)throw new TypeError('Too deeply nested');
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'&&Number.isFinite(value))return Object.is(value,-0)?0:value;
 if(Array.isArray(value))return value.map(v=>plain(v,depth+1));
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){
   return Object.fromEntries(Object.keys(value).sort().map(k=>[k,plain(value[k],depth+1)]));
 }
 throw new TypeError('Unsupported receipt value');
}
function canonical(value){
 const result=JSON.stringify(plain(value));
 if(new TextEncoder().encode(result).byteLength>MAX_BYTES)throw new RangeError('Receipt exceeds limit');
 return result;
}
async function hash(value){
 const data=new TextEncoder().encode(canonical(value));
 const digest=await globalThis.crypto.subtle.digest('SHA-256',data);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
function calculate(kind,input){
 if(kind==='salary')return countryCalculate({...input,module:'pit'});
 if(kind==='capital-gain')return calculateCapitalGain(input);
 if(kind==='india-regimes')return compareIndiaRegimes(input);
 if(kind==='taxable-income')return assessTaxableIncome(input);
 throw new TypeError('Unknown calculation type');
}
export async function createReceipt({kind,input,engineFingerprint}){
 if(!HASH.test(engineFingerprint))throw new TypeError('Invalid engine fingerprint');
 const normalizedInput=plain(input);
 const payload={schema:SCHEMA,kind,input:normalizedInput,engineFingerprint,result:calculate(kind,normalizedInput),warning:WARNING,verified:false};
 return {payload,digest:await hash(payload),algorithm:'SHA-256',signature:null};
}
export async function verifyReceipt(receipt,currentFingerprint){
 if(!HASH.test(currentFingerprint))throw new TypeError('Invalid current engine fingerprint');
 if(!receipt||receipt.algorithm!=='SHA-256'||receipt.signature!==null||typeof receipt.digest!=='string'||!HASH.test(receipt.digest))throw new TypeError('Invalid receipt format');
 const p=receipt.payload;
 if(!p||p.schema!==SCHEMA||p.verified!==false||p.warning!==WARNING||typeof p.engineFingerprint!=='string'||!HASH.test(p.engineFingerprint))throw new TypeError('Invalid receipt payload');
 const integrity=(await hash(p))===receipt.digest;
 if(!integrity)return {integrity:false,sameEngine:false,reproduced:false};
 const sameEngine=p.engineFingerprint===currentFingerprint;
 if(!sameEngine)return {integrity:true,sameEngine:false,reproduced:false};
 let reproduced=false;
 try{reproduced=canonical(calculate(p.kind,p.input))===canonical(p.result);}catch{}
 return {integrity:true,sameEngine:true,reproduced};
}
