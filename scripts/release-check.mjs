// Self-hostable, dependency-free, fail-closed static release audit for YorpHives.
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const problems=[];
const read=async path=>readFile(resolve(root,path),'utf8');
const entries=JSON.parse(await read('catalog.json')).items;
const tools=entries.filter(x=>x.type==='tool');
if(tools.length!==90)problems.push('Expected exactly 90 tool entries in V1.0.');
if(new Set(entries.map(x=>x.url)).size!==entries.length)problems.push('Duplicate catalog URL.');
const directory=await read('tools/index.html');
const api=await read('app.js');
if(!api.includes("fetch('catalog.json')"))problems.push('Homepage catalog loading changed.');
for(const item of tools){
 if(!/^tools\/[a-z0-9-]+\/$/.test(item.url))problems.push('Unsafe tool URL: '+item.url);
 if(!directory.includes('../'+item.url))problems.push('Directory missing: '+item.url);
 if(item.execution!=='browser-local')problems.push('Tool not marked browser-local: '+item.url);
 try {
  const html=await read(item.url+'index.html');
  if(!html.includes('<h1>'))problems.push('Missing page heading: '+item.url);
  if(/<script\b[^>]*\bsrc=["']https?:/i.test(html))problems.push('Remote script found: '+item.url);
  if(!html.includes('../tool.css'))problems.push('Tool CSS missing: '+item.url);
 }catch(error){problems.push('Missing page '+item.url+': '+error.message);}
 if(item.module?.url){
  try { const s=await stat(resolve(root,item.module.url)); if(!s.isFile())problems.push('Not a module: '+item.module.url);}
  catch {problems.push('Missing execution module: '+item.module.url);}
 }
}
for(const required of ['tools/batch-file-core.mjs','tools/safe-zip.mjs','tools/office-files.mjs','tools/vendor/jszip.mjs']){
 try {await stat(resolve(root,required));} catch {problems.push('Missing dependency: '+required);}
}
if(problems.length){console.error('RELEASE CHECK FAILED\n'+problems.map(x=>' - '+x).join('\n'));process.exitCode=1;}
else console.log('STATIC RELEASE CHECK PASSED: '+tools.length+' local tool pages, catalog, local scripts and file dependencies verified.');
