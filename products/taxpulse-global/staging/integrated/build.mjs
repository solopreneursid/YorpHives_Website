import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const out=new URL('./generated/',import.meta.url);mkdirSync(out,{recursive:true});
const engine=read('engine/primitives.mjs').replace(/\s*export \{ TaxEnginePrimitives \};\s*$/,'');
const rules={};for(const c of ['IN','US','GB','DE','AE','CA','AU','SG'])rules[c]={'2026':JSON.parse(read('rules/2026/'+c+'.json'))};
writeFileSync(new URL('primitives.js',out),engine+'\n');
writeFileSync(new URL('country-rules.js',out),'const COUNTRY_TAX_CONFIGS = '+JSON.stringify(rules)+';\n');
