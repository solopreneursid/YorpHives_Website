import {verifyRuleSnapshot,snapshotBytes} from './rule-snapshot.mjs';
import {calculateRegionalTax,compareIndiaRegimes,calculateSalaryRemainder,calculateEmployeeContributions} from './taxable-income.mjs';
import {regionalRules,resolveRegionalRule} from './regional-registry.mjs';
import {resolveIndiaSalaryRule} from './india-salary-registry.mjs';
import {payrollRules,resolvePayrollRule} from './payroll-registry.mjs';
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const hash=async v=>hex(await crypto.subtle.digest('SHA-256',snapshotBytes(v)));
export async function readRuleHead(db){const head=await db.prepare('SELECT sequence,digest,envelope,state FROM regulatory_head WHERE id=1').first();if(!head||!Number.isSafeInteger(head.sequence)||head.sequence<0)throw Error('Missing regulatory head');return head;}
export function verifyCoverage(s){for(const r of regionalRules()){const [country,region]=r.jurisdiction.split('-');resolveRegionalRule({country,region,taxYear:r.taxYear},s.regional);}resolveIndiaSalaryRule('2026',s.indiaSalary);for(const r of payrollRules())resolvePayrollRule(r.jurisdiction,r.component,r.taxYear,s.payroll);}
const methods={
 'regional-tax':(i,c)=>calculateRegionalTax(i,c.regional),
 'india-salary':(i,c)=>compareIndiaRegimes(i,c.indiaSalary),
 'salary-remainder':calculateSalaryRemainder,
 'employee-contributions':calculateEmployeeContributions
};
export async function verifyPublicationFixtures(snapshot,evidence,fixtures){
 if(!Array.isArray(fixtures)||fixtures.length>1000)throw Error('Invalid fixtures');
 const ctx={regional:snapshot.regional,indiaSalary:snapshot.indiaSalary,payroll:snapshot.payroll};
 for(const e of evidence){
  const rows=fixtures.filter(f=>f.version===e.version);
  if(rows.length<2||new Set(rows.map(f=>f.id)).size!==rows.length||await hash(rows)!==e.fixtureDigest)throw Error('Missing independent fixture evidence: '+e.version);
  for(const f of rows){if(!Object.hasOwn(methods,f.method)||typeof f.id!=='string'||!Array.isArray(f.path)||!f.path.length||f.path.some(k=>typeof k!=='string'||['__proto__','constructor','prototype'].includes(k))||typeof f.expected!=='number'||!Number.isFinite(f.expected))throw Error('Invalid fixture');
   const result=methods[f.method](f.input,ctx);
   const actual=f.path.reduce((o,k)=>o&&Object.hasOwn(o,k)?o[k]:undefined,result);
   if(typeof actual!=='number'||!Number.isFinite(actual)||Math.abs(actual-f.expected)>.005)throw Error('Fixture mismatch: '+f.id);
  }
 }
}
export async function publishSnapshot(db,envelope,fixtures,{publicKeyHex,engineFingerprint,now=new Date()}){
 const head=await readRuleHead(db);
 const previous=head.envelope?JSON.parse(head.envelope).payload:null;
 const snapshot=await verifyRuleSnapshot(envelope,{publicKeyHex,engineFingerprint,minimumSequence:head.sequence,previous,now});
 verifyCoverage(snapshot);
 await verifyPublicationFixtures(snapshot,envelope.payload.evidence,fixtures);
 const result=await db.prepare("UPDATE regulatory_head SET sequence=?,digest=?,envelope=?,state='active' WHERE id=1 AND sequence=?").bind(snapshot.sequence,snapshot.digest,JSON.stringify(envelope),head.sequence).run();
 if(result.meta?.changes!==1)throw Error('Concurrent publication; retry with fresh head');
 return {sequence:snapshot.sequence,digest:snapshot.digest,state:'active',taxRulesVerified:false};
}
// Emergency block retains the previous envelope and advances the sequence.
// Recovery requires a newly signed snapshot, never a replay of an older pointer.
export async function blockSnapshot(db,expectedSequence){
 if(!Number.isSafeInteger(expectedSequence)||expectedSequence<1)throw Error('Invalid sequence');
 const r=await db.prepare("UPDATE regulatory_head SET sequence=sequence+1,state='blocked' WHERE id=1 AND sequence=? AND state='active'").bind(expectedSequence).run();
 if(r.meta?.changes!==1)throw Error('Concurrent update or no active snapshot');
 return {sequence:expectedSequence+1,state:'blocked'};
}
