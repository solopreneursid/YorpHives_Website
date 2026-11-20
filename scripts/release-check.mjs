// Fail-closed static release gate for both production and isolated preview builds.
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const root=resolve(project,process.argv[2]||'dist');
const problems=[];
const read=async path=>readFile(resolve(root,path),'utf8');
const exists=async path=>stat(resolve(root,path)).then(s=>s.isFile()).catch(()=>false);
const fail=message=>problems.push(message);
const catalog=JSON.parse(await read('catalog.json'));
if(!Array.isArray(catalog.items))throw Error('Catalog has no items.');
const items=catalog.items.filter(x=>x.published!==false&&x.visibility!=='private');
const tools=items.filter(x=>x.type==='tool');
const publishedUrls=new Set(items.map(x=>x.url));
if(tools.length<90)fail('Expected at least the 90 established public tools.');
if(new Set(items.map(x=>x.url)).size!==items.length)fail('Duplicate public URL.');
const homepage=await read('index.html');
const directory=await read('tools/index.html');
const css=await read('studio.css');
const hqCss=await read('hqconnect.css');
const js=await read('studio.js');
const rotators=await read('rotators.js');
const catalogSync=await read('catalog-sync.mjs');
const toolCss=await read('tools/tool-next.css');
const headers=await read('_headers');
const robots=await read('robots.txt');
const sitemap=await read('sitemap.xml');
const previews=/X-Robots-Tag:\s*noindex,\s*nofollow/i.test(headers);
const requiredViews=['home','ventures','tools'];
for(const id of requiredViews){
 if(!homepage.includes('<section class="view" id="'+id+'"'))fail('Homepage route missing: '+id);
}
if(!homepage.includes('id="home-title"')||!homepage.includes('id="yh-pulse"')||!homepage.includes('id="yh-pulse-item"'))
 fail('Fresh homepage heading or verified activity rail is missing.');
const ventureView=homepage.split('<section class="view" id="ventures"')[1]?.split('<section class="view" id="tools"')[0]||'';
const toolView=homepage.split('<section class="view" id="tools"')[1]?.split('</main>')[0]||'';
if(!ventureView.includes('id="venture-activity"')||!ventureView.includes('id="venture-activity-list"')||
 ventureView.includes('id="activity-list"')||ventureView.includes('id="yh-pulse"')||
 !toolView.includes('id="yh-pulse"')||!toolView.includes('id="activity-list"'))
 fail('HQventures and Free Tools release updates are mixed or missing.');
if(!js.includes('approvedVentureReleases(allItems)')||!js.includes("item.kind==='tools'"))
 fail('Product updates must be founder-approved and tool updates must remain isolated.');
if(!await exists('venture-activity.mjs'))fail('HQventures release filter module is missing.');
if(!homepage.includes('YORPHIVES / AI-POWERED SOFTWARE STUDIO')||
 !homepage.includes('The future<br>doesn\'t <em>build</em><br>itself')||
 !homepage.includes('IDEAS IN MOTION')||
 !homepage.includes('class="hero-art hero-system"')||
 !['Spot the signal','Test the idea','Decide &amp; create'].every(s=>homepage.includes(s))||
  homepage.includes('id="hero-quickstart-list"')||
  !homepage.includes('class="kofi-support" id="kofi-support" type="button" disabled'))
 fail('Home hero identity, three-stage system illustration or safe controls are missing.');
if(!await exists('hero-system.css'))fail('Hero system artwork CSS missing.');
if(!homepage.includes('<section class="hqconnect" id="hqconnect"')||
 !homepage.includes('class="header-cta" href="#hqconnect"')||
 !homepage.includes('id="contact-form"')||
 !homepage.includes('data-interest="Build a product"')||
 !homepage.includes('data-interest="Long-term partnership"')||
 !homepage.includes('name="consent" required')||
 !homepage.includes('connect@yorphives.com'))
 fail('HQconnect build and partnership request pathways are incomplete.');
if(/<section class="view" id="partners"|<section class="view" id="contact"/.test(homepage))
 fail('Partnership and contact are home-based services, not extra public pages.');
if(/id="builders"|href="#builders"|data-nav="builders"/i.test(homepage))
 fail('Retired Builders navigation must not return.');
if(/data-form="opportunity"|<form[^>]*id="post"|id="job-listings"/i.test(homepage))
 fail('Public job listings or posting forms are not permitted.');
if(homepage.includes('DESIGN PREVIEW')||homepage.includes('name="robots" content="noindex'))
 fail('Preview-only labels or noindex metadata leaked into the built homepage.');
if(!homepage.includes('<link rel="canonical" href="https://yorphives.com/">'))
 fail('Homepage canonical URL is missing.');
if(/<script\b[^>]*src=["']https?:/i.test(homepage))fail('Remote homepage script found.');
if(!css.includes('@media(max-width:350px)')||!css.includes('prefers-reduced-motion:reduce')||
 !hqCss.includes('@media(max-width:600px)')||!hqCss.includes('prefers-reduced-motion:reduce'))
 fail('Homepage or HQconnect is missing narrow-phone and reduced-motion styles.');
if(!js.includes('qualifiedProducts(allItems)')||
 !js.includes("retiredRoutes=new Set(['builders','opportunities','membership','post'])")||
 !js.includes("fetch('/activity.json'"))
 fail('Founder-approved product filtering, legacy route handling or public activity loading is missing.');
if(!rotators.includes('qualifiedProducts(items)')||!catalogSync.includes("fetch('../catalog.json'"))
 fail('Shared catalogue and product-approval modules are incomplete.');
if(!toolCss.includes('@media(max-width:350px)')||!toolCss.includes('prefers-reduced-motion:reduce')||
 !toolCss.includes('grid-template-columns:repeat(4,minmax(0,1fr))'))
 fail('Direct tool pages are missing responsive navigation or accessibility styles.');
for(const file of ['rotators.css','impact-public.json','usage-public.json','catalog-sync.mjs','product-policy.mjs','agentic-browser.mjs']){
 if(!await exists(file))fail('Required public asset missing: '+file);
}
const impact=JSON.parse(await read('impact-public.json'));
const usage=JSON.parse(await read('usage-public.json'));
if(impact.publication?.status!=='unpublished'||impact.publication?.approvedByFounder!==false||
 usage.publication?.status!=='unpublished'||usage.publication?.approvedByFounder!==false||
 (usage.ranked||[]).length)
 fail('Unverified Impact or usage rankings must remain unpublished.');
if(!directory.includes('id="directory-search"')||!directory.includes('id="directory-search-status"')||
 !directory.includes('id="directory-saved-only"')||!directory.includes('TOOL_DIRECTORY_START')||
 !directory.includes('TOOL_DIRECTORY_END'))
 fail('The A–Z directory is missing search, saved tools or generated category markers.');
for(const item of tools)if(!directory.includes('../'+item.url))fail('Missing crawlable directory link: '+item.url);
if(!headers.includes("connect-src 'self'")||!headers.includes("script-src 'self'")||
 !headers.includes('X-Content-Type-Options: nosniff'))
 fail('Privacy-first security headers are incomplete.');
if(!sitemap.includes('<loc>https://yorphives.com/</loc>'))fail('Sitemap is missing the canonical homepage.');
if(previews&&/Sitemap:/i.test(robots))fail('Preview robots.txt must not advertise the production sitemap.');
if(!previews&&!robots.includes('Sitemap: https://yorphives.com/sitemap.xml'))
 fail('Production robots.txt lacks the canonical sitemap.');
if(!previews&&/X-Robots-Tag:\s*noindex/i.test(headers))fail('Production build must not inherit preview noindex.');
for(const path of ['hqventures/index.html']){
 if(!await exists(path))fail('Missing public section page: '+path);
 else{
  const html=await read(path);
  if(!html.includes('<link rel="canonical" href="https://yorphives.com/'+path.replace('/index.html','/')+'">'))
   fail('Wrong section canonical: '+path);
  if(!html.includes('section-landing.css'))fail('Section page is missing shared design CSS: '+path);
 }
}
const route=/^(?:(?:[a-z0-9][a-z0-9-]*\/)+|(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*\.html)$/;
for(const item of items){
 if(!route.test(item.url)){fail('Unsafe public URL: '+item.url);continue}
 const url='https://yorphives.com/'+item.url;
 const page=item.url.endsWith('/')?item.url+'index.html':item.url;
 if(!sitemap.includes('<loc>'+url+'</loc>'))fail('Missing sitemap entry: '+item.url);
 let html;
 try{html=await read(page)}catch{fail('Missing public page: '+page);continue}
 if((html.match(/<link rel="canonical"/g)||[]).length!==1||
  !html.includes('<link rel="canonical" href="'+url+'">'))fail('Wrong or duplicate canonical: '+page);
 if(!html.includes('<meta property="og:url" content="'+url+'">'))fail('Wrong Open Graph URL: '+page);
 if(!/<h1\b/.test(html)||!/<title\b/.test(html))fail('Missing visible title or H1: '+page);
 if(/<script\b[^>]*src=["']https?:/i.test(html))fail('Remote script found: '+page);
 if(!html.includes('id="yorphives-discovery-schema"'))fail('Missing structured discovery data: '+page);
 else try{
  const match=html.match(/<script type="application\/ld\+json" id="yorphives-discovery-schema">([\s\S]*?)<\/script>/);
  if(!match)throw Error('Malformed JSON-LD');
  const graph=JSON.parse(match[1])['@graph'];
  if(!Array.isArray(graph)||!graph.some(x=>x.url===url&&x['@type']==='WebPage')||
   !graph.some(x=>x.url===url&&x['@id']===url+'#main-entity'))throw Error('Missing WebPage or main entity');
 }catch(error){fail('Invalid structured data: '+page+' '+error.message)}
 if(item.module?.url&&!await exists(item.module.url))fail('Missing tool processor module: '+item.module.url);
}
for(const required of ['tools/batch-file-core.mjs','tools/safe-zip.mjs','tools/office-files.mjs','tools/vendor/jszip.mjs']){
 if(!await exists(required))fail('Missing shared tool dependency: '+required);
}
const activity=JSON.parse(await read('activity.json'));
if(!Array.isArray(activity.items)||(activity.items||[]).length>20)fail('Public activity must contain no more than 20 verified items.');
for(const event of activity.items||[]){
 if(!event||!['tools','explore'].includes(event.kind)||typeof event.title!=='string'||
  event.title.length>100||/[<>]/.test(event.title)||!Number.isFinite(Date.parse(event.timestamp))||
  Date.parse(event.timestamp)>Date.now())fail('Invalid public activity event.');
 if(event.kind==='tools'&&!publishedUrls.has(event.url))fail('Activity references an unpublished tool.');
 if(event.kind==='explore'&&event.url!=='#explore')fail('Explore activity references an unapproved URL.');
}
const sampleTool=await read('tools/word-counter/index.html');
if(!sampleTool.includes('tool-next.css')||!sampleTool.includes('class="mobile-dock"'))
 fail('Direct tool pages are not receiving the shared mobile shell.');
if(problems.length){
 console.error('RELEASE CHECK FAILED\n'+problems.map(item=>' - '+item).join('\n'));
 process.exitCode=1;
}else{
 console.log('FRESH STATIC RELEASE CHECK PASSED: '+tools.length+' browser-local tools; '+items.length+
  ' public pages; responsive homepage, A–Z directory, tool shell, SEO and security verified; previewNoindex='+previews+'.');
}
