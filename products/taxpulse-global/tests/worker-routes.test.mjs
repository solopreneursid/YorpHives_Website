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
 for(const path of ['/assets/simple.css','/assets/simple.mjs',...['country','primitives','us-filing-statuses','IN','US','GB','manifest','scenarios'].map(n=>'/assets/engine/'+n+'.mjs')]){
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
 assert.equal((await post('x'.repeat(17000))).status,400);
 const indiaInput={country:'IN',taxYear:'2026',module:'pit',parameters:{grossSalary:1285000,residentIndividual:true}};
 const india=await post(JSON.stringify(indiaInput));assert.equal(india.status,200);const indiaResult=(await india.json()).result;assert.ok(Math.abs(indiaResult.incomeTax-10400)<0.005);assert.ok(Math.abs(indiaResult.marginalReliefApplied-51500)<0.005);
 assert.equal((await post(JSON.stringify({...indiaInput,parameters:{grossSalary:1285000}}))).status,400);
 assert.equal((await post(JSON.stringify({...payload,country:'DE'}))).status,400);
 assert.equal((await call('/missing')).status,404);
 assert.equal((await call('/v1/country/calculate')).status,405);
 }finally{rmSync(temp,{recursive:true,force:true})}
});
