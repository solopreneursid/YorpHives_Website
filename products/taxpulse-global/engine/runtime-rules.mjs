import {payrollRules,resolvePayrollRule} from './payroll-registry.mjs';
import {verifyRuleSnapshot} from './rule-snapshot.mjs';
import {resolveRegionalRule,regionalRules} from './regional-registry.mjs';
import {resolveIndiaSalaryRule} from './india-salary-registry.mjs';
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
export async function loadRuntimeRules(env,engineFingerprint,{now=new Date()}={}){
 const baseline={state:'bundled-preview',engineFingerprint,context:{},taxRulesVerified:false};
 if(!env?.RULE_DB&&!env?.RULE_SNAPSHOTS&&!env?.RULE_PUBLIC_KEY&&!env?.RULE_MIN_SEQUENCE)return baseline;
 try{
  if((!env.RULE_DB&&!env.RULE_SNAPSHOTS)||(env.RULE_DB&&env.RULE_SNAPSHOTS)||typeof env.RULE_PUBLIC_KEY!=='string'||typeof env.RULE_MIN_SEQUENCE!=='string'||!/^\d+$/.test(env.RULE_MIN_SEQUENCE))throw Error('Incomplete runtime configuration');
  const minimum=Number(env.RULE_MIN_SEQUENCE);if(!Number.isSafeInteger(minimum)||minimum<1)throw Error('Invalid sequence floor');
  let raw,head=null;
  if(env.RULE_DB){head=await env.RULE_DB.prepare('SELECT sequence,digest,envelope,state FROM regulatory_head WHERE id=1').first();if(!head||head.state!=='active'||!Number.isSafeInteger(head.sequence)||head.sequence<minimum)throw Error('No active transactional rule head');raw=head.envelope;}else raw=await env.RULE_SNAPSHOTS.get('active-preview','text');
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>300000)throw Error('Missing or oversized signed snapshot');
  const previous={sequence:0,regional:{versions:regionalRules()},indiaSalary:{versions:[resolveIndiaSalaryRule('2026')]},payroll:{versions:payrollRules()}};
  const s=await verifyRuleSnapshot(JSON.parse(raw),{publicKeyHex:env.RULE_PUBLIC_KEY,engineFingerprint,minimumSequence:minimum-1,previous,now});
  if(head&&(head.sequence!==s.sequence||head.digest!==s.digest))throw Error('Rule head mismatch');
  // Existing connected tools must all resolve the currently advertised periods.
  for(const r of regionalRules()){const [country,region]=r.jurisdiction.split('-');resolveRegionalRule({country,region,taxYear:r.taxYear},s.regional);}
  resolveIndiaSalaryRule('2026',s.indiaSalary);for(const r of payrollRules())resolvePayrollRule(r.jurisdiction,r.component,r.taxYear,s.payroll);
  const fingerprint=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(engineFingerprint+':'+s.digest)));
  return {state:'signed-preview',engineFingerprint:fingerprint,sequence:s.sequence,digest:s.digest,expiresAt:s.expiresAt,context:{regional:s.regional,indiaSalary:s.indiaSalary,payroll:s.payroll,national:s.national},taxRulesVerified:false};
 }catch{return {state:'blocked',engineFingerprint,context:{},taxRulesVerified:false};}
}
