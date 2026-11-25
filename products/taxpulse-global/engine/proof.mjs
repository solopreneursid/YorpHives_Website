import {compareInternational} from './international.mjs';
import {compareCompensation} from './compensation.mjs';
import {negotiateSalary} from './negotiation.mjs';
import {compareSalaryOffers} from './salary-offers.mjs';
import {reverseSalary,automaticReverseSalary} from './reverse-salary.mjs';
import { countryCalculate } from './country.mjs';
import { assessTaxableIncome, compareIndiaRegimes, calculateCapitalGain, calculateRegionalTax, calculateSalaryRemainder, calculateEmployeeContributions } from './taxable-income.mjs';

import { compareHistoricalTax } from './history.mjs';

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
function calculate(kind,input,ruleContext={}){
 if(kind==='international-salary')return compareInternational(input,ruleContext);
 if(kind==='compensation')return compareCompensation(input,ruleContext);
 if(kind==='salary-negotiation'){const result=negotiateSalary(input,ruleContext);if(!result.found)throw new RangeError('No salary target found');return result;}
 if(kind==='salary-offers')return compareSalaryOffers(input,ruleContext);
 if(kind==='reverse-salary'){
  const result=reverseSalary(input,ruleContext);
  if(!result.found)throw new RangeError('No salary result to report');
  return result;
 }
 if(kind==='automatic-reverse-salary'){
  const result=automaticReverseSalary(input,ruleContext);
  if(!result.found)throw new RangeError('No salary result to report');
  return result;
 }
 if(kind==='historical-tax')return compareHistoricalTax(input);
 if(kind==='salary')return countryCalculate({...input,module:'pit'});
 if(kind==='employee-contributions')return calculateEmployeeContributions(input);
 if(kind==='salary-remainder')return calculateSalaryRemainder(input,ruleContext);
 if(kind==='regional-tax')return calculateRegionalTax(input,ruleContext.regional);
 if(kind==='capital-gain')return calculateCapitalGain(input);
 if(kind==='india-regimes')return compareIndiaRegimes(input,ruleContext.indiaSalary);
 if(kind==='taxable-income')return assessTaxableIncome(input);
 throw new TypeError('Unknown calculation type');
}
export async function createReceipt({kind,input,engineFingerprint},ruleContext={}){
 if(typeof engineFingerprint!=='string'||!HASH.test(engineFingerprint))throw new TypeError('Invalid engine fingerprint');
 const normalizedInput=plain(input);
 const payload={schema:SCHEMA,kind,input:normalizedInput,engineFingerprint,result:calculate(kind,normalizedInput,ruleContext),warning:WARNING,verified:false};
 return {payload,digest:await hash(payload),algorithm:'SHA-256',signature:null};
}
export async function verifyReceipt(receipt,currentFingerprint,ruleContext={}){
 if(typeof currentFingerprint!=='string'||!HASH.test(currentFingerprint))throw new TypeError('Invalid current engine fingerprint');
 if(!receipt||receipt.algorithm!=='SHA-256'||receipt.signature!==null||typeof receipt.digest!=='string'||!HASH.test(receipt.digest))throw new TypeError('Invalid receipt format');
 const p=receipt.payload;
 if(!p||p.schema!==SCHEMA||p.verified!==false||p.warning!==WARNING||typeof p.engineFingerprint!=='string'||!HASH.test(p.engineFingerprint))throw new TypeError('Invalid receipt payload');
 const integrity=(await hash(p))===receipt.digest;
 if(!integrity)return {integrity:false,sameEngine:false,reproduced:false};
 const sameEngine=p.engineFingerprint===currentFingerprint;
 // Only the explicitly retained historical algorithm may be replayed across builds.
 // Never execute code or accept rate schedules supplied by a report.
 const compatibleHistory=p.kind==='historical-tax'&&p.result?.algorithmId==='ordinary-progressive-minor-units-v1';
 if(!sameEngine&&!compatibleHistory)return {integrity:true,sameEngine:false,reproduced:false};
 let reproduced=false;
 try{reproduced=canonical(calculate(p.kind,p.input,ruleContext))===canonical(p.result);}catch{}
 return {integrity:true,sameEngine,reproduced};
}
