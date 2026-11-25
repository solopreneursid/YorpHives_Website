import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
if(process.argv.includes('--production'))throw Error('This builder is staging-only; production requires a separate authorized release process');
const release=JSON.parse(read('rules/manifest.json'));
if(release.releaseMode!=='preview'||Object.values(release.countries).some(r=>r.productionEnabled!==false||r.verification!=='unverified'))throw Error('Preview manifest cannot activate statutory rules');
const revenue=JSON.parse(read('data/monetization.json'));
if(revenue.schemaVersion!==1||revenue.mode!=='disabled'||['ads','affiliates','tracking','payments'].some(k=>revenue[k]!==false))throw Error('Preview monetization must remain disabled');
const out=new URL('./generated/',import.meta.url);mkdirSync(out,{recursive:true});
const engine=read('engine/primitives.mjs').replace(/\s*export \{ TaxEnginePrimitives \};\s*$/,'');
const rules={};for(const c of ['IN','US','GB','DE','AE','CA','AU','SG'])rules[c]={'2026':JSON.parse(read('rules/2026/'+c+'.json'))};
writeFileSync(new URL('primitives.js',out),engine+'\n');
writeFileSync(new URL('country-rules.js',out),'const COUNTRY_TAX_CONFIGS = '+JSON.stringify(rules)+';\n');

const bundle=new URL('./bundle/',import.meta.url);mkdirSync(bundle,{recursive:true});
const write=(p,v)=>writeFileSync(new URL(p,bundle),v);
const mapping={'index.html':'staging/integrated/index.html','script-1.js':'staging/assets/script-1.js','script-2.js':'staging/assets/script-2.js','style-1.css':'staging/assets/style-1.css','style-2.css':'staging/assets/style-2.css','application.js':'staging/integrated/application.js'};
for(const [name,path] of Object.entries(mapping))write(name+'.txt',read(path));
write('primitives.js.txt',engine+'\n');write('country-rules.js.txt','const COUNTRY_TAX_CONFIGS = '+JSON.stringify(rules)+';\n');
for(const name of ['primitives','api','openapi','advanced','discovery'])write(name+'.mjs',read('engine/'+name+'.mjs'));
let country=read('engine/country.mjs');
for(const c of ['IN','US','GB']){
 const from="import "+c+" from '../rules/2026/"+c+".json' with { type: 'json' };";
 if(!country.includes(from))throw Error('Missing canonical import '+c);
 country=country.replace(from,"import "+c+" from './"+c+".mjs';");
 write(c+'.mjs','export default '+JSON.stringify(rules[c]['2026'])+';\n');
}
write('country.mjs',country);
write('us-filing-statuses.mjs',read('engine/us-filing-statuses.mjs'));write('worker.mjs',read('staging/integrated/worker.mjs'));

write('manifest.mjs','export default '+JSON.stringify(JSON.parse(read('rules/manifest.json')))+';\n');

const advancedBrowser='globalThis.TaxPulseAdvanced = (() => {\n'+read('engine/advanced.mjs').replace(/\bexport (?=const supported|function advancedCalculate)/g,'')+'\nreturn Object.freeze({calculate:advancedCalculate,supported:Object.freeze(supported)});\n})();\n';
write('advanced-browser.js.txt',advancedBrowser);
write('secure-records.mjs.txt',read('engine/secure-records.mjs'));
write('browser-vault.mjs.txt',read('engine/browser-vault.mjs'));

write('webmanifest.txt',"{\"id\":\"/\",\"name\":\"TaxPulse Global Preview\",\"short_name\":\"TaxPulse\",\"start_url\":\"/\",\"scope\":\"/\",\"display\":\"standalone\",\"background_color\":\"#f8fafc\",\"theme_color\":\"#4f46e5\",\"description\":\"Illustrative financial scenario calculations; tax rules not verified.\"}");

 // The simple workspace uses only local assets and the same engine as the API.
 write('simple-index.html.txt',read('staging/simple/index.html'));
 write('simple.css.txt',read('staging/simple/simple.css'));
 write('simple.mjs.txt',read('staging/simple/simple.mjs'));
 for(const name of ['country','primitives','us-filing-statuses','IN','US','GB','manifest']){
   write('browser-'+name+'.mjs.txt',readFileSync(new URL(name+'.mjs',bundle),'utf8'));
 }
 write('browser-scenarios.mjs.txt',read('engine/scenarios.mjs'));
write('browser-financial-profile.mjs.txt',read('engine/financial-profile.mjs'));
write('browser-budget.mjs.txt',read('engine/budget.mjs'));
write('browser-decision-tools.mjs.txt',read('engine/decision-tools.mjs'));

const indiaRegistry=read('engine/india-salary-registry.mjs').replace("import data from '../rules/india-salary-versions.json' with { type: 'json' };","import data from './india-salary-versions.mjs';");
const indiaVersions='export default '+JSON.stringify(JSON.parse(read('rules/india-salary-versions.json')))+';\n';
for(const [name,content] of [['india-salary-registry',indiaRegistry],['india-salary-versions',indiaVersions]]){write(name+'.mjs',content);write('browser-'+name+'.mjs.txt',content);}
const regionalRegistry=read('engine/regional-registry.mjs').replace("import registry from '../rules/regional-versions.json' with { type: 'json' };","import registry from './regional-versions.mjs';");
const regionalVersions='export default '+JSON.stringify(JSON.parse(read('rules/regional-versions.json')))+';\n';
for(const [name,content] of [['regional-registry',regionalRegistry],['regional-versions',regionalVersions]]){write(name+'.mjs',content);write('browser-'+name+'.mjs.txt',content);}
for(const name of ['taxable-income','proof','history','reverse-salary','salary-offers','negotiation','compensation','international','rule-snapshot','runtime-rules']){
  const content=read('engine/'+name+'.mjs');
  write(name+'.mjs',content);write('browser-'+name+'.mjs.txt',content);
}
const fingerprintInputs=['rule-snapshot','runtime-rules','india-salary-registry','india-salary-versions','regional-registry','regional-versions','country','primitives','us-filing-statuses','IN','US','GB','taxable-income','proof','history','reverse-salary','salary-offers','negotiation','compensation','international'].map(name=>[name,readFileSync(new URL(name+'.mjs',bundle),'utf8')]);
const fingerprint=createHash('sha256').update(JSON.stringify(fingerprintInputs)).digest('hex');
write('browser-fingerprint.mjs.txt','export default '+JSON.stringify(fingerprint)+';\n');

const previewInputs=['worker.mjs','simple-index.html.txt','simple.css.txt','simple.mjs.txt','browser-budget.mjs.txt','browser-financial-profile.mjs.txt','browser-decision-tools.mjs.txt','browser-fingerprint.mjs.txt','browser-manifest.mjs.txt'];
write('preview-revision.txt',createHash('sha256').update(JSON.stringify(previewInputs.map(n=>[n,readFileSync(new URL(n,bundle),'utf8')]))).digest('hex'));
