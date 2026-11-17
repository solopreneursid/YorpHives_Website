// Non-mutating production-vs-pilot acceptance comparison.
// Every GET is against published public pages; production remains on Pages.
import assert from 'node:assert/strict';
const live='https://yorphives.com',pilot='https://yorphives-edge-static-pilot.solopreneursid-proy.workers.dev';
async function get(base,path,method='GET'){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),16000);
 try{return await fetch(base+path,{method,redirect:'manual',signal:abort.signal,
   headers:{'user-agent':'YorpHives-Public-Cutover-Comparison/1.0','accept':'text/html,*/*'}})}
 finally{clearTimeout(timeout);}
}
const r=await Promise.all([get(live,'/catalog.json'),get(pilot,'/catalog.json')]);
assert.ok(r.every(x=>x.status===200),'Both catalogs must be available');
const [l,p]=await Promise.all(r.map(x=>x.json()));
const published=x=>(x.items||[]).filter(x=>x.published!==false&&x.visibility!=='private')
 .map(x=>x.url).sort();
const urls=published(l);
assert.deepEqual(urls,published(p),'Public product sets differ between live and pilot');
assert.equal(urls.length,143,'Published route count changed');
const attr=(html,rx)=>html.match(rx)?.[1]||'';
const differences=[];
let count=0;
for(let i=0;i<urls.length;i+=8){
 await Promise.all(urls.slice(i,i+8).map(async path=>{
  const [a,b]=await Promise.all([get(live,'/'+path),get(pilot,'/'+path)]);
  if(a.status!==200||b.status!==200){differences.push({path,statuses:[a.status,b.status]});return;}
  const [x,y]=await Promise.all([a.text(),b.text()]);
  const title=t=>attr(t,/<title>([\s\S]*?)<\/title>/i).replace(/\s+/g,' ').trim();
  const canonical=t=>attr(t,/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
  if(title(x)!==title(y)||canonical(x)!==canonical(y)||!title(x)||!canonical(x)){
   differences.push({path,titles:[title(x),title(y)],canonicals:[canonical(x),canonical(y)]});return;
  }
  if(!/noindex/i.test(b.headers.get('x-robots-tag')||''))differences.push({path,noindex:'missing'});
  count++;
 }));
}
assert.deepEqual(differences,[],'Pilot/public parity differences: '+JSON.stringify(differences.slice(0,8)));
const important=['/','/tools/','/sitemap.xml','/robots.txt','/llms.txt','/.well-known/agentic.json','/api/agent/v1/openapi.json'];
for(const path of important){
 const [a,b]=await Promise.all([get(live,path),get(pilot,path)]);
 assert.equal(a.status,200,'Live missing '+path);
 assert.equal(b.status,200,'Pilot missing '+path);
}
for(const path of ['/api/insights/public','/api/insights/growth','/api/agent/v1/capabilities']){
 const [a,b]=await Promise.all([get(live,path),get(pilot,path)]);
 assert.equal(a.status,200,'Live API missing '+path);
 assert.equal(b.status,200,'Pilot API missing '+path);
 const x=await a.json(),y=await b.json();
 assert.equal(x.schemaVersion,y.schemaVersion,'Contract version differs at '+path);
 if(path.startsWith('/api/insights/'))assert.equal(x.available,true,'Live analytics not available');
}
console.log('PRODUCTION/PILOT PARITY PASS:',count,'identical tool titles + canonicals; shared public routes and API contract versions. Different telemetry values and pilot noindex are intentional.');
