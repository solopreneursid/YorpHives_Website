// Read-only, complete published-route check for an approved live production release.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
const origin=new URL(process.argv[2]||'https://yorphives.com');
if(origin.protocol!=='https:'||origin.origin!=='https://yorphives.com')
 throw Error('Only the production canonical HTTPS origin can be verified.');
const catalog=JSON.parse(await readFile(new URL('../catalog.json',import.meta.url),'utf8'));
const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
if(tools.length<143)throw Error('Unexpected reduction below the 143-tool published baseline.');
const urls=[...new Set(['/', '/tools/', ...tools.map(x=>'/'+(x.url.startsWith('/')?x.url.slice(1):x.url))])];
const results=new Array(urls.length);
let next=0;
async function check(i){
 const path=urls[i],url=new URL(path,origin),errors=[];
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const response=await fetch(url,{
    headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(16000),redirect:'follow'
   });
   assert.equal(response.status,200,'Unexpected HTTP status '+response.status);
   assert.equal(new URL(response.url).origin,origin.origin,'Cross-origin redirect');
   assert.match(response.headers.get('content-type')||'',/text\/html/i,'Expected HTML');
   const html=await response.text();
   assert.match(html,/<h1\b[^>]*>/i,'Missing h1 heading');
   assert.match(html,/<title\b[^>]*>[^<]+<\/title>/i,'Missing page title');
   assert.ok(html.length>1000&&html.length<1000000,'Unexpected HTML size');
   if(path.startsWith('/tools/')&&path!=='/tools/')
    assert.ok(html.includes('yorphives.com')||html.includes('YorpHives'),'Tool has no site identity');
   results[i]={path,passed:true,status:response.status};
   return;
  }catch(e){
   errors.push(String(e?.message||e).slice(0,260));
   if(attempt<2)await new Promise(r=>setTimeout(r,800));
  }
 }
 results[i]={path,passed:false,error:errors.join(' | ')};
}
async function worker(){
 while(next<urls.length){const i=next++;await check(i);}
}
await Promise.all(Array.from({length:8},worker));
const report={schemaVersion:1,origin:origin.origin,total:results.length,
 passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,
 results,generatedAt:new Date().toISOString()};
if(process.env.YORPHIVES_LIVE_ROUTE_RESULTS){
 const file=process.env.YORPHIVES_LIVE_ROUTE_RESULTS;
 await mkdir(dirname(file),{recursive:true});
 await writeFile(file,JSON.stringify(report,null,2)+'\n');
}
console.log('LIVE_ROUTE_RESULTS '+JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));
for(const r of results.filter(x=>!x.passed))console.error('FAILED LIVE PAGE '+r.path+': '+r.error);
if(report.failed)process.exitCode=1;
