import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
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
for(const name of ['primitives','api','openapi'])write(name+'.mjs',read('engine/'+name+'.mjs'));
let country=read('engine/country.mjs');
for(const c of ['IN','US','GB']){
 const from="import "+c+" from '../rules/2026/"+c+".json' with { type: 'json' };";
 if(!country.includes(from))throw Error('Missing canonical import '+c);
 country=country.replace(from,"import "+c+" from './"+c+".mjs';");
 write(c+'.mjs','export default '+JSON.stringify(rules[c]['2026'])+';\n');
}
write('country.mjs',country);write('worker.mjs',read('staging/integrated/worker.mjs'));
