import a42 from './browser-national-registry.mjs.txt';
import a43 from './browser-national-versions.mjs.txt';
import a44 from './browser-historical-versions.mjs.txt';
import {loadRegulatorySummary} from './regulatory-dashboard.mjs';
import monitorSources from './monitor-sources.mjs';
import a40 from './browser-payroll-registry.mjs.txt';
import a41 from './browser-payroll-versions.mjs.txt';
import {loadRuntimeRules} from './runtime-rules.mjs';
import a38 from './browser-india-salary-registry.mjs.txt';
import a39 from './browser-india-salary-versions.mjs.txt';
import a36 from './browser-regional-registry.mjs.txt';
import a37 from './browser-regional-versions.mjs.txt';
import a35 from './preview-revision.txt';
import a34 from './browser-decision-tools.mjs.txt';
import a33 from './browser-budget.mjs.txt';
import a32 from './browser-financial-profile.mjs.txt';
import a31 from './browser-international.mjs.txt';
import a30 from './browser-compensation.mjs.txt';
import a29 from './browser-negotiation.mjs.txt';
import a28 from './browser-salary-offers.mjs.txt';
import a27 from './browser-reverse-salary.mjs.txt';
import a12 from './simple-index.html.txt';
import a13 from './simple.css.txt';
import a14 from './simple.mjs.txt';
import a15 from './browser-country.mjs.txt';
import a16 from './browser-primitives.mjs.txt';
import a17 from './browser-us-filing-statuses.mjs.txt';
import a18 from './browser-IN.mjs.txt';
import a19 from './browser-US.mjs.txt';
import a20 from './browser-GB.mjs.txt';
import a21 from './browser-manifest.mjs.txt';
import a22 from './browser-scenarios.mjs.txt';
import a23 from './browser-taxable-income.mjs.txt';
import a24 from './browser-proof.mjs.txt';
import a25 from './browser-fingerprint.mjs.txt';
import a26 from './browser-history.mjs.txt';
import {historicalRuleCatalog,compareHistoricalTax} from './history.mjs';
import {assessTaxableIncome,compareIndiaRegimes,calculateCapitalGain,calculateRegionalTax,regionalTaxCatalog,calculateSalaryRemainder,calculateEmployeeContributions} from './taxable-income.mjs';
import {calculate} from './api.mjs';
import {advancedCalculate,supported} from './advanced.mjs';
import {countryCalculate,catalog} from './country.mjs';
import {spec} from './openapi.mjs';
import {capabilities,regulatoryStatus,discovery,llms} from './discovery.mjs';
const assets={"/assets/engine/national-registry.mjs":[a42,"application/javascript"],"/assets/engine/national-versions.mjs":[a43,"application/javascript"],"/assets/engine/historical-versions.mjs":[a44,"application/javascript"],"/assets/engine/payroll-registry.mjs":[a40,"application/javascript"],"/assets/engine/payroll-versions.mjs":[a41,"application/javascript"],"/assets/engine/india-salary-registry.mjs":[a38,"application/javascript"],"/assets/engine/india-salary-versions.mjs":[a39,"application/javascript"],"/assets/engine/regional-registry.mjs":[a36,"application/javascript"],"/assets/engine/regional-versions.mjs":[a37,"application/javascript"],"/assets/engine/decision-tools.mjs":[a34,"application/javascript"],"/assets/engine/budget.mjs":[a33,"application/javascript"],"/assets/engine/financial-profile.mjs":[a32,"application/javascript"],"/assets/engine/international.mjs":[a31,"application/javascript"],"/assets/engine/compensation.mjs":[a30,"application/javascript"],"/assets/engine/negotiation.mjs":[a29,"application/javascript"],"/assets/engine/salary-offers.mjs":[a28,"application/javascript"],"/assets/engine/reverse-salary.mjs":[a27,"application/javascript"],"/assets/engine/history.mjs":[a26,"application/javascript"],"/assets/engine/taxable-income.mjs":[a23,"application/javascript"],"/assets/engine/proof.mjs":[a24,"application/javascript"],"/assets/engine/fingerprint.mjs":[a25,"application/javascript"],"/":[a12,"text/html"],"/assets/simple.css":[a13,"text/css"],"/assets/simple.mjs":[a14,"application/javascript"],"/assets/engine/country.mjs":[a15,"application/javascript"],"/assets/engine/primitives.mjs":[a16,"application/javascript"],"/assets/engine/us-filing-statuses.mjs":[a17,"application/javascript"],"/assets/engine/IN.mjs":[a18,"application/javascript"],"/assets/engine/US.mjs":[a19,"application/javascript"],"/assets/engine/GB.mjs":[a20,"application/javascript"],"/assets/engine/manifest.mjs":[a21,"application/javascript"],"/assets/engine/scenarios.mjs":[a22,"application/javascript"]};
const workspacePaths=new Set(['/salary','/taxes','/career','/abroad','/money','/business','/tax-rules',...['my-tax','india-regimes','taxable-income','compare','plan','salary-remainder','reverse-salary','salary-offers','salary-negotiation','compensation','international-salary','employee-contributions','regional-tax','investment-tax','time-machine','monthly-budget','india-ctc','purchasing-power','relocation-break-even','india-deduction-scenario'].map(id=>'/tools/'+id)]);
const countryPages={"/country/india":{"title":"India salary and tax examples | TaxPulse Global","description":"Ordinary salary, old/new regime comparison, CTC scenarios and selected EPF examples. Development preview; tax rules unverified."},"/country/united-states":{"title":"United States salary and tax examples | TaxPulse Global","description":"Texas salary examples; selected state taxes and investment gains. Development preview; tax rules unverified."},"/country/united-kingdom":{"title":"United Kingdom salary and tax examples | TaxPulse Global","description":"England, Wales, Northern Ireland and Scotland salary examples; selected capital gains. Development preview; tax rules unverified."},"/country/canada":{"title":"Canada salary and tax examples | TaxPulse Global","description":"Alberta salary examples, federal tax and selected provincial calculations. Development preview; tax rules unverified."},"/country/australia":{"title":"Australia salary and tax examples | TaxPulse Global","description":"Limited ordinary income and employee salary examples with Medicare levy assumptions. Development preview; tax rules unverified."},"/country/germany":{"title":"Germany salary and tax examples | TaxPulse Global","description":"Limited income tax and statutory insurance examples with confirmed wage bases. Development preview; tax rules unverified."},"/country/singapore":{"title":"Singapore salary and tax examples | TaxPulse Global","description":"Limited resident income tax and CPF contribution examples. Development preview; tax rules unverified."},"/country/uae":{"title":"United Arab Emirates salary and tax examples | TaxPulse Global","description":"Limited employee wage and unemployment insurance examples. Development preview; tax rules unverified."}};
const simpleCsp="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; worker-src 'none'";
const headers={'x-frame-options':'DENY','cross-origin-opener-policy':'same-origin','cross-origin-resource-policy':'same-origin','cache-control':'no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':simpleCsp,'permissions-policy':'camera=(), microphone=(), geolocation=()'};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{...headers,'content-type':'application/json'}});
class PayloadTooLarge extends Error {}
async function read(req){
 const declared=req.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>16384))throw new PayloadTooLarge();
 const r=req.body?.getReader();if(!r)throw Error('Missing body');
 let n=0,parts=[];
 try{while(true){const {done,value}=await r.read();if(done)break;n+=value.byteLength;if(n>16384){await r.cancel();throw new PayloadTooLarge();}parts.push(value);}
 const data=new Uint8Array(n);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
 }finally{r.releaseLock();}
}
const baseFingerprint=JSON.parse(a25.slice('export default '.length).trim().replace(/;$/,''));
export default{async fetch(req,env){const u=new URL(req.url),p=u.pathname;
 const runtime=()=>loadRuntimeRules(env,baseFingerprint);
 if(p==='/assets/engine/runtime-context.mjs'&&['GET','HEAD'].includes(req.method)){const r=await runtime();const monitoring=await loadRegulatorySummary(monitorSources,env);return new Response(req.method==='HEAD'?null:'export default '+JSON.stringify({...r,monitoring})+';\n',{headers:{...headers,'content-type':'application/javascript; charset=utf-8'}});}
 if(p==='/v1/regulatory/runtime'&&req.method==='GET'){const {context,...status}=await runtime();return json(status,status.state==='blocked'?503:200);}
if(['/v1/calculate','/v1/country/calculate','/v1/advanced/calculate','/v1/taxable-income/calculate','/v1/india/regime-compare','/v1/investment/capital-gain','/v1/regional/calculate','/v1/salary/remainder','/v1/contributions/calculate','/v1/history/compare'].includes(p)&&req.method==='POST'){if(req.headers.has('origin')&&req.headers.get('origin')!==u.origin)return json({error:'Origin denied'},403);if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))return json({error:'JSON required'},415);try{const r=await runtime();if(r.state==='blocked')return json({error:'Regulatory snapshot unavailable'},503);if(r.state==='signed-preview'){if(p==='/v1/regional/calculate')return json(calculateRegionalTax(await read(req),r.context.regional));if(p==='/v1/india/regime-compare')return json(compareIndiaRegimes(await read(req),r.context.indiaSalary));if(p==='/v1/salary/remainder')return json(calculateSalaryRemainder(await read(req),r.context));if(p==='/v1/taxable-income/calculate')return json(assessTaxableIncome(await read(req),r.context));if(p==='/v1/investment/capital-gain')return json(calculateCapitalGain(await read(req),r.context));if(p==='/v1/contributions/calculate')return json(calculateEmployeeContributions(await read(req),r.context));if(['/v1/country/calculate','/v1/advanced/calculate'].includes(p))return json({error:'This statutory model is not synchronized with the active preview snapshot'},503);}return json((p==='/v1/history/compare'?compareHistoricalTax:p==='/v1/contributions/calculate'?calculateEmployeeContributions:p==='/v1/salary/remainder'?calculateSalaryRemainder:p==='/v1/regional/calculate'?calculateRegionalTax:p==='/v1/investment/capital-gain'?calculateCapitalGain:p==='/v1/india/regime-compare'?compareIndiaRegimes:p==='/v1/taxable-income/calculate'?assessTaxableIncome:p==='/v1/advanced/calculate'?advancedCalculate:p==='/v1/country/calculate'?countryCalculate:calculate)(await read(req)))}catch(e){return e instanceof PayloadTooLarge?json({error:'Payload too large'},413):json({error:'Invalid or unsupported sample parameters'},400)}}if(!['GET','HEAD'].includes(req.method))return json({error:'Method not allowed'},405);if(p==='/health')return json({status:'ok',release:'integrated-engine-preview',previewRevision:a35,taxRulesVerified:false,monetization:'disabled',api:'sample primitives and country modules'});if(p==='/v1/catalog')return json({...catalog(),advancedModules:supported,taxableIncomeAssessments:['DE','CA','AU','SG'],employeeWageAssessments:['AE'],indiaRegimeComparison:true,capitalGainAssessments:['IN','US','GB'],regionalAssessments:regionalTaxCatalog(),salaryRemainderRegions:['US-TX','GB-RUK','GB-SCT','CA-AB','AU-AU','IN-IN','SG-SG','DE-DE','AE-AE'],contributionAssessments:['CA','AU','IN','SG']});if(p==='/v1/history/rules')return json({sampleOnly:true,taxRulesVerified:false,rules:historicalRuleCatalog()});if(p==='/openapi.json')return json(spec);if(p==='/v1/capabilities')return json(capabilities());if(p==='/v1/regulatory/status')return json({...regulatoryStatus(),monitoring:await loadRegulatorySummary(monitorSources,env)});if(p==='/v1/discovery')return json(discovery());if(p==='/llms.txt')return new Response(req.method==='HEAD'?null:llms(),{headers:{...headers,'content-type':'text/plain; charset=utf-8'}});if(['/v1/calculate','/v1/country/calculate','/v1/advanced/calculate','/v1/taxable-income/calculate','/v1/india/regime-compare','/v1/investment/capital-gain','/v1/regional/calculate','/v1/salary/remainder','/v1/contributions/calculate','/v1/history/compare'].includes(p))return json({error:'POST required'},405);const normalized=p.replace(/\/$/,'');const countryPage=Object.hasOwn(countryPages,normalized)?countryPages[normalized]:null;const a=(workspacePaths.has(normalized)||normalized==='/countries'||countryPage)?assets['/']:Object.hasOwn(assets,p)?assets[p]:null;if(!a)return json({error:'Not found'},404);const body=countryPage?a[0].replace(/<title>[^<]*<\/title>/,'<title>'+countryPage.title+'</title>').replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+countryPage.description+'">'):a[0];return new Response(req.method==='HEAD'?null:body,{headers:{...headers,'content-type':a[1]+'; charset=utf-8'}})}};