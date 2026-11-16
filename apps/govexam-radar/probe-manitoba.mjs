import {parseManitobaRss} from "./manitoba-feed.mjs";
import {createHash} from "node:crypto";
// Read-only compatibility check for a genuine province-level government RSS feed.
// Never write job notices to storage from this probe.
const url="https://jobsearch.gov.mb.ca/rss/newJobPostingsFeed.rss";
const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),9000);
try{
 const response=await fetch(url,{redirect:"error",signal:ctl.signal,headers:{"Accept":"application/rss+xml, application/xml, text/xml"}});
 console.log("MANITOBA_RSS_STATUS",JSON.stringify({status:response.status,type:response.headers.get("content-type"),size:response.headers.get("content-length")}));
 if(!response.ok)process.exit(0);
 const body=await response.text();if(body.length>700000)throw Error("unexpectedly long RSS");
 const items=[...body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/ig)].slice(0,3).map(x=>x[1]);
 console.log("MANITOBA_RSS_SHAPE",JSON.stringify({bytes:body.length,totalItems:(body.match(/<item\b/ig)||[]).length,root:body.slice(0,180).replace(/\s+/g," ").replace(/[<]/g,"("),samples:items.map(s=>({title:(s.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.slice(0,140),link:(s.match(/<link[^>]*>([\s\S]*?)<\/link>/i)||[])[1]?.slice(0,210),pubDate:(s.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)||[])[1]?.slice(0,100),description:(s.match(/<description[^>]*>([\s\S]*?)<\/description>/i)||[])[1]?.slice(0,1400),tags:[...new Set([...s.matchAll(/<([a-z][a-zA-Z0-9:]*)(?:\s[^>]*)?>/g)].map(x=>x[1]))].slice(0,18)}))}));
 const parsed=parseManitobaRss(body);
 console.log("MANITOBA_NORMALIZATION",JSON.stringify({received:parsed.received,valid:parsed.valid.length,rejected:parsed.rejected,firstRecordFields:parsed.valid[0]?Object.keys(parsed.valid[0]):[]}));
 if(parsed.received===0||parsed.valid.length===0)throw Error("Source feed returned no eligible current records");
 const digest=x=>createHash("sha256").update(x).digest("hex");
 const normalized=parsed.valid.map(x=>({
   ...x,id:"manitoba-jobs:"+digest(x.sourceRef).slice(0,32),
   evidenceSha256:digest(JSON.stringify([x.sourceRef,x.title,x.employer,x.region,x.closingAt,x.publishedAt]))
 }));
 console.log("GOVRADAR_MANITOBA_BOOTSTRAP_DATA="+JSON.stringify({at:new Date().toISOString(),records:normalized}));
 const test=normalized.find(x=>x.sourceRef.includes("ID=130448"));
 if(test){
   const original=items.map(item=>(item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)||[])[1]||"").find(x=>x.includes("ID=130448"))?.replace(/&amp;/g,"&");
   for(const [kind,url] of [["normalized",test.sourceRef],["original",original]]){
     if(!url)continue;
     try{
       const r=await fetch(url,{method:"GET",redirect:"manual",signal:AbortSignal.timeout(7500),headers:{"Accept":"text/html"}});
       const text=r.status>=200&&r.status<300?(await r.text()).slice(0,120000):"";
       console.log("MANITOBA_JOB_LINK_CHECK",JSON.stringify({kind,status:r.status,location:r.headers.get("location")?.slice(0,140)||null,contentType:r.headers.get("content-type"),containsId:text.includes("130448"),containsTitle:text.toLowerCase().includes("crown counsel"),finalUrl:r.url?.slice(0,160)}));
     }catch(e){console.log("MANITOBA_JOB_LINK_CHECK",JSON.stringify({kind,error:String(e.message||e).slice(0,180)}));}
   }
 }


}catch(e){console.log("MANITOBA_RSS_UNAVAILABLE",String(e.message||e).slice(0,150));}finally{clearTimeout(timer);}
