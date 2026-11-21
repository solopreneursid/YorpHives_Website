// YorpHives public Free Tools SEO audit. Read-only, bounded, deterministic.
// No private Search Console data or fabricated revenue and indexing claims.
import {writeFile} from 'node:fs/promises';
const ORIGIN='https://yorphives.com', publisher='ca-pub-9864775895222572';
const found=[], warnings=[], errors=[], records=[];
const add=(arr,kind,path,detail)=>arr.push({kind,path,detail});
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
async function get(path,{allowNon200=false}={}){
 const response=await fetch(ORIGIN+path,{signal:AbortSignal.timeout(20000),redirect:'follow',
 headers:{'user-agent':'YorpHives-ReadOnly-SEO-Audit/1.0'}});
 const body=await response.text();
 if(!allowNon200&&response.status!==200)throw Error('HTTP '+response.status);
 return {response,body};
}
function inspect(item,html){
 const path='/'+item.url;
 const title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
 const description=clean(html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)/i)?.[1]||
 html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)?.[1]);
 const h1=clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
 const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0]||'';
 const expected=ORIGIN+path;
 if(!title)add(errors,'missing_title',path,'No HTML title');
 if(!description)add(errors,'missing_description',path,'No meta description');
 if(!h1)add(errors,'missing_h1',path,'No page heading');
 if(!canonical.includes(expected))add(errors,'bad_canonical',path,'Canonical not same as public URL');
 if(/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html))add(errors,'noindex',path,'Public page blocked');
 if(!html.includes('href="/privacy/"'))add(errors,'missing_privacy',path,'Privacy link missing');
 if(!html.includes('yh-tool-usage-note'))add(errors,'missing_explanation',path,'Generated tool explanation missing');
 if(/pagead2\.googlesyndication\.com|adsbygoogle\.js/i.test(html))add(errors,'premature_ads',path,'Advertising enabled before approval');
 if(description.length>165)add(warnings,'long_description',path,description.length+' characters');
 if(description.length<55)add(warnings,'short_description',path,description.length+' characters');
 if(title.length>75)add(warnings,'long_title',path,title.length+' characters');
 if(title.length<25)add(warnings,'short_title',path,title.length+' characters');
 const main=html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
 const readable=clean(main.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,''));
 if(readable.split(/\s+/).length<100)add(warnings,'potentially_thin_page',path,'Review usefulness manually; word count alone is not a ranking metric');
 records.push({path,title,description,h1,canonical:expected,readableWords:readable.split(/\s+/).length});
}
try{
 const [catalog,robots,sitemap,policy]=await Promise.all([get('/catalog.json'),get('/robots.txt'),get('/sitemap.xml'),get('/privacy/')]);
 const items=JSON.parse(catalog.body).items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 if(items.length<143)throw Error('Catalog unexpectedly lost published tools: '+items.length);
 if(!/Sitemap:/i.test(robots.body))add(errors,'missing_sitemap_directive','/robots.txt','Sitemap reference missing');
 if(!policy.body.includes('<title>Privacy Policy | YorpHives</title>'))add(errors,'bad_privacy','/privacy/','Privacy policy unavailable');
 if(!sitemap.body.includes('<loc>'+ORIGIN+'/</loc>'))add(errors,'missing_home_sitemap','/sitemap.xml','Homepage absent');
 const perBatch=7;
 for(let i=0;i<items.length;i+=perBatch)await Promise.all(items.slice(i,i+perBatch).map(async item=>{
   try{
    const path='/'+item.url;
    const r=await get(path);
    if(/noindex/i.test(r.response.headers.get('x-robots-tag')||''))add(errors,'robots_header_noindex',path,'x-robots-tag noindex');
    inspect(item,r.body);
    if(!sitemap.body.includes('<loc>'+ORIGIN+path+'</loc>'))add(errors,'missing_sitemap_entry',path,'Tool absent from sitemap');
   }catch(e){add(errors,'unreachable','/'+item.url,e.message)}
 }));
 const groups=new Map();
 for(const row of records){const key=row.title.toLowerCase();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row.path)}
 for(const [title,paths] of groups){if(title&&paths.length>1)add(warnings,'duplicate_title',paths.join(', '),title)}
 found.push({kind:'tool_pages_checked',count:items.length});
}catch(e){add(errors,'audit_failed','/',e.message)}
const report={generatedAt:new Date().toISOString(),origin:ORIGIN,checked:records.length,counts:{errors:errors.length,warnings:warnings.length},summary:found,errors,warnings,pages:records};
await writeFile('yorphives-seo-report.json',JSON.stringify(report,null,2)+'\n');
const md=['# YorpHives Free Tools SEO audit','',`Generated: ${report.generatedAt}`,`Pages audited: ${report.checked}; errors: ${errors.length}; advisory warnings: ${warnings.length}`,'','## Blocking findings',...(errors.length?errors.map(x=>'- '+x.kind+' — '+x.path+': '+x.detail):['- None']),'','## Content review opportunities',...(warnings.length?warnings.slice(0,100).map(x=>'- '+x.kind+' — '+x.path+': '+x.detail):['- None']),'','Warnings are recommendations, not automated edits or verified Google Search Console indexing data.'];
await writeFile('yorphives-seo-report.md',md.join('\n')+'\n');
console.log('SEO AUDIT '+JSON.stringify({checked:records.length,errors:errors.length,warnings:warnings.length}));
if(errors.length)process.exitCode=1;
