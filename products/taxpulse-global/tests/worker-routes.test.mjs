import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';
test('generated Worker routes and validation',async()=>{
 execFileSync(process.execPath,[new URL('../staging/integrated/build.mjs',import.meta.url).pathname]);
 const temp=mkdtempSync(join(tmpdir(),'taxpulse-'));
 try{
 cpSync(new URL('../staging/integrated/bundle/',import.meta.url),temp,{recursive:true});
 let source=readFileSync(join(temp,'worker.mjs'),'utf8');
 source=source.replace(/import (a\d+) from '\.\/(.*?)';/g,(_,name,file)=>'const '+name+'='+JSON.stringify(readFileSync(join(temp,file),'utf8'))+';');
 writeFileSync(join(temp,'worker.mjs'),source);
 const worker=(await import(pathToFileURL(join(temp,'worker.mjs')).href)).default;
 const call=(path,options)=>worker.fetch(new Request('https://preview.example'+path,options));
 const health=await call('/health');assert.equal(health.status,200);assert.equal((await health.json()).taxRulesVerified,false);
 const html=await call('/');assert.equal(html.status,200);assert.match(html.headers.get('x-robots-tag'),/noindex/);const simpleHtml=await html.text();assert.match(simpleHtml,/Taxes made easier/);assert.doesNotMatch(simpleHtml,/https:\/\//);
 assert.match(html.headers.get('content-security-policy'),/script-src 'self';/);assert.doesNotMatch(html.headers.get('content-security-policy'),/tailwindcss/);
 assert.equal((await call('/advanced-preview')).status,404);
 assert.equal((await call('/assets/application.js')).status,404);
 for(const path of ['/assets/simple.css','/assets/simple.mjs',...['country','primitives','us-filing-statuses','IN','US','GB','manifest','scenarios','taxable-income','proof','fingerprint','reverse-salary'].map(n=>'/assets/engine/'+n+'.mjs')]){
  const asset=await call(path);assert.equal(asset.status,200,path);assert.doesNotMatch(asset.headers.get('content-security-policy'),/tailwindcss/);
  if(path.endsWith('.mjs'))assert.match(asset.headers.get('content-type'),/application\/javascript/);
 }
 assert.equal(await (await call('/',{method:'HEAD'})).text(),'');
 assert.equal((await call('/assets/country-rules.js')).status,404);
 assert.equal((await call('/assets/browser-vault.mjs')).status,404);
 assert.equal((await call('/assets/secure-records.mjs')).status,404);
 const catalog=await (await call('/v1/catalog')).json();assert.equal(catalog.countries.length,3);assert.deepEqual(catalog.filingStatusOptions.US,['single','mfj','hoh','mfs']);assert.match(catalog.countries.find(c=>c.code==='IN').taxYearLabel,/2026-27/);
 assert.equal((await (await call('/openapi.json')).json()).openapi,'3.1.0');
 const payload={country:'GB',taxYear:'2026',module:'pit',parameters:{grossSalary:130000}};
 const post=(body,headers={})=>call('/v1/country/calculate',{method:'POST',headers:{'content-type':'application/json',...headers},body});
 const good=await post(JSON.stringify(payload));assert.equal(good.status,200);assert.ok(Math.abs((await good.json()).result.incomeTax-44703)<1e-7);
 assert.equal((await post(JSON.stringify(payload),{origin:'https://other.example'})).status,403);
 assert.equal((await post('{}',{'content-type':'text/plain'})).status,415);
 assert.equal((await post('x'.repeat(17000))).status,413);
 assert.equal((await post('{}',{'content-length':'16385'})).status,413);
 assert.equal((await post(new Uint8Array([123,255,125]))).status,400);
 assert.equal((await post('{')).status,400);
 assert.equal(html.headers.get('x-frame-options'),'DENY');
 assert.equal(html.headers.get('cross-origin-opener-policy'),'same-origin');
 assert.equal(html.headers.get('cross-origin-resource-policy'),'same-origin');
 assert.deepEqual(catalog.modules,['pit']);
 for(const module of ['payroll','capgains','vat','corporate','property','dtaa']){
  assert.ok(catalog.disabledModules[module]);
  assert.equal((await post(JSON.stringify({...payload,module}))).status,400);
 }
 const schema=(await (await call('/openapi.json')).json()).paths['/v1/country/calculate'].post.requestBody.content['application/json'].schema;
 assert.deepEqual(schema.properties.module.enum,catalog.modules);
 const indiaInput={country:'IN',taxYear:'2026',module:'pit',parameters:{grossSalary:1285000,residentIndividual:true}};
 const india=await post(JSON.stringify(indiaInput));assert.equal(india.status,200);const indiaResult=(await india.json()).result;assert.ok(Math.abs(indiaResult.incomeTax-10400)<0.005);assert.ok(Math.abs(indiaResult.marginalReliefApplied-51500)<0.005);
 assert.equal((await post(JSON.stringify({...indiaInput,parameters:{grossSalary:1285000}}))).status,400);
 assert.equal((await post(JSON.stringify({...payload,country:'DE'}))).status,400);
 const assess=await call('/v1/taxable-income/calculate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'DE',taxYear:'2026',taxableIncome:50000,assessment:'individual'})});
 assert.equal(assess.status,200);assert.equal((await assess.json()).incomeTax,10548);
 assert.equal((await call('/v1/taxable-income/calculate')).status,405);
 const indiaCompare=await call('/v1/india/regime-compare',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'IN',taxYear:'2026',grossSalary:1500000,residentIndividual:true,ageGroup:'under-60',ordinarySalaryOnly:true,oldEligibleDeductions:0,newEligibleDeductions:0})});
 assert.equal(indiaCompare.status,200);assert.equal((await indiaCompare.json()).newRegime.incomeTax,97500);
 assert.equal((await call('/v1/india/regime-compare')).status,405);
 const investment=await call('/v1/investment/capital-gain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'GB',taxYear:'2026',acquired:'2025-06-01',disposed:'2026-06-02',saleProceeds:62600,adjustedBasis:50000,eligibleLosses:0,otherTaxableIncome:20000,scopeConfirmed:true})});
 assert.equal(investment.status,200);assert.equal((await investment.json()).estimatedGainTax,1728);
 assert.equal((await call('/v1/investment/capital-gain')).status,405);
 const crypto=await call('/v1/investment/capital-gain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'IN',taxYear:'2026',assetType:'crypto',acquired:'2024-08-01',disposed:'2026-08-02',saleProceeds:1500000,adjustedBasis:1000000,eligibleLosses:0,otherTaxableIncome:1500000,scopeConfirmed:true})});
 assert.equal(crypto.status,200);assert.equal((await crypto.json()).estimatedGainTax,156000);
 const region=await call('/v1/regional/calculate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'US',region:'PA',taxYear:'2026',income:100000,scopeConfirmed:true})});
 assert.equal(region.status,200);assert.equal((await region.json()).regionalTax,3070);
 assert.equal((await call('/v1/regional/calculate')).status,405);
 const pay=await call('/v1/salary/remainder',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'US',region:'TX',taxYear:'2026',pay:100000,scopeConfirmed:true})});
 assert.equal(pay.status,200);assert.equal((await pay.json()).annualRemainder,79180);
 assert.equal((await call('/v1/salary/remainder')).status,405);
 const contribution=await call('/v1/contributions/calculate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'CA',taxYear:'2026',income:100000,scopeConfirmed:true})});
 assert.equal(contribution.status,200);assert.equal((await contribution.json()).totalEmployeeContribution,5769.52);
 assert.equal((await call('/v1/contributions/calculate')).status,405);
 const extendedPay=await call('/v1/salary/remainder',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'AU',region:'AU',taxYear:'2026',pay:100000,scopeConfirmed:true})});
 assert.equal(extendedPay.status,200);assert.equal((await extendedPay.json()).annualRemainder,77480);
 const history=await call('/v1/history/rules');assert.equal(history.status,200);assert.equal((await history.json()).rules.length,14);
 const compare=await call('/v1/history/compare',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'AU',firstRuleId:'AU-2024-25-resident-ordinary-v1',secondRuleId:'AU-2027-28-resident-ordinary-v1',taxableIncome:100000,scopeConfirmed:true})});
 assert.equal(compare.status,200);assert.equal((await compare.json()).taxChange,-536);
 assert.equal((await call('/v1/history/compare')).status,405);
 const dePay=await call('/v1/salary/remainder',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'DE',region:'DE',taxYear:'2026',pay:5000,annualTaxableIncome:50000,healthSupplementRate:2.9,scopeConfirmed:true})});
 assert.equal(dePay.status,200);assert.equal((await dePay.json()).annualRemainder,36402);
 const aePay=await call('/v1/salary/remainder',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({country:'AE',region:'AE',taxYear:'2026',pay:20000,monthlyBasicSalary:16000,scopeConfirmed:true})});
 assert.equal(aePay.status,200);assert.equal((await aePay.json()).annualRemainder,239937);
 for(const path of ['/salary','/taxes','/career','/abroad','/money','/business','/tax-rules','/tools/salary-remainder','/tools/investment-tax']){const page=await call(path);assert.equal(page.status,200,path);assert.match(await page.text(),/category-card/);}
 assert.equal((await call('/tools/not-a-tool')).status,404);
 assert.equal((await call('/missing')).status,404);
 assert.equal((await call('/v1/country/calculate')).status,405);
 }finally{rmSync(temp,{recursive:true,force:true})}
});
