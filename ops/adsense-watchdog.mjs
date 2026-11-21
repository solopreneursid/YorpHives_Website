// Read-only public YorpHives Free Tools / AdSense watchdog.
// Runs without credentials, payments, analytics writes, or production mutations.
import assert from 'node:assert/strict';
const origin = 'https://yorphives.com';
const checks = [];
async function get(path) {
  const signal=AbortSignal.timeout(18000);
  const res=await fetch(origin+path,{redirect:'follow',signal,headers:{'user-agent':'YorpHives-ReadOnly-FreeTools-Watchdog/1.0','accept':'text/html,application/json,text/plain'}});
  const body=await res.text();
  assert.equal(res.status,200,`${path} HTTP ${res.status}`);
  return {res,body};
}
async function check(label,fn) {
 try { const extra=await fn();checks.push({label,ok:true,...extra});console.log('PASS '+label); }
 catch(err){checks.push({label,ok:false,error:String(err.message||err)});console.error('FAIL '+label+': '+String(err.message||err));}
}
await check('home_and_verification',async()=>{
 const {body}=await get('/');
 assert.match(body,/<title[ >]/i);
 assert.match(body,/google-adsense-account[^>]*ca-pub-9864775895222572/);
 assert.doesNotMatch(body,/pagead2\.googlesyndication\.com|adsbygoogle\.js/i);
});
await check('ads_txt',async()=>{
 const {body,res}=await get('/ads.txt');
 assert.match(res.headers.get('content-type')||'',/text\/plain/i);
 assert.equal(body.trim(),'google.com, pub-9864775895222572, DIRECT, f08c47fec0942fa0');
});
await check('privacy',async()=>{
 const {body}=await get('/privacy/');
 assert.match(body,/<title>Privacy Policy \| YorpHives<\/title>/);
 assert.match(body,/Advertising/);
 assert.doesNotMatch(body,/pagead2\.googlesyndication\.com|adsbygoogle\.js/i);
});
await check('directory_and_privacy_link',async()=>{
 const {body}=await get('/tools/');
 assert.match(body,/href="\/privacy\/"/);
 assert.doesNotMatch(body,/pagead2\.googlesyndication\.com|adsbygoogle\.js/i);
});
let tools=[];
await check('catalog',async()=>{
 const {body}=await get('/catalog.json');
 const obj=JSON.parse(body);
 tools=obj.items.filter(x=>x.type==='tool' && x.published!==false && x.visibility!=='private');
 assert.ok(tools.length>=143,`Expected at least 143 tools; got ${tools.length}`);
 const paths=tools.map(x=>x.url);
 assert.equal(paths.length,new Set(paths).size);
});
const batch=process.env.YH_FULL_AUDIT==='true'?tools:tools.filter((_,i)=>i%11===0);
await check('tool_pages_'+batch.length,async()=>{
 const errors=[];
 for(let i=0;i<batch.length;i+=7){
  await Promise.all(batch.slice(i,i+7).map(async x=>{
   try{
    const {body}=await get('/'+x.url);
    if(!/href="\/privacy\/"/.test(body))throw Error('privacy link missing');
    if(!/rel="canonical"/.test(body))throw Error('canonical missing');
    if(!/yh-tool-usage-note/.test(body))throw Error('tool-specific summary missing');
    if(/pagead2\.googlesyndication\.com|adsbygoogle\.js/i.test(body))throw Error('ad script activated before approval');
   }catch(e){errors.push(x.url+': '+e.message)}
  }));
 }
 assert.deepEqual(errors,[]);
});
await check('agent_api_read_only',async()=>{
 const {body}=await get('/api/agent/v1/capabilities');
 const obj=JSON.parse(body);
 assert.equal(obj.actions?.executeRemote,false);
});
await check('privacy_not_an_ad_page',async()=>{
 const {body}=await get('/privacy/');
 assert.doesNotMatch(body,/<ins\s[^>]*adsbygoogle/i);
});
const bad=checks.filter(x=>!x.ok);
console.log('SUMMARY '+JSON.stringify({total:checks.length,failed:bad.length,checkedTools:batch.length,results:checks}));
if(bad.length)process.exitCode=1;
