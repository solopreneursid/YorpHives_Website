// Dependency-free, fail-closed release check for deployable assets.
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const root=resolve(project,process.argv[2]||'dist');
const problems=[];
const read=async path=>readFile(resolve(root,path),'utf8');
const catalog=JSON.parse(await read('catalog.json'));
if(!Array.isArray(catalog.items))throw Error('Catalog has no items.');
const items=catalog.items.filter(x=>x.published!==false&&x.visibility!=='private');
const tools=items.filter(x=>x.type==='tool');
if(tools.length<90)problems.push('Expected at least the 90 established tools.');
if(new Set(items.map(x=>x.url)).size!==items.length)problems.push('Duplicate public URL.');
const directory=await read('tools/index.html');
const homepage=await read('index.html');
// Minimal copy, strong visual hierarchy and founder-controlled operations.
if(!homepage.includes('One founder.')||!homepage.includes('An AI team.')||
   !homepage.includes('Ideas in motion.')||
   !homepage.includes('YorpHivesHQ finds the signal.')||
   !homepage.includes('I make the call.')||
   !homepage.includes('href="#connect"'))
 problems.push('One-founder, HQ-led studio identity or contact route missing.');
if(!homepage.includes('id="our-ai-team"')||
   !homepage.includes('class="os-board"')||
   !homepage.includes('class="os-decision"')||
   !homepage.includes('FOUNDER')||
   !homepage.includes('id="projects-collection"')||
   !homepage.includes('Only founder-approved work'))
 problems.push('Evidence-to-founder-to-Explore authority visualization missing.');
const kineticCss=await read('next.css');
const kineticMobileCss=await read('next-responsive.css');
const kineticJs=await read('next.js');
if(!homepage.includes('id="tool-category-rail"')||
   !homepage.includes('id="home-pulse-viewport"')||
   !homepage.includes('data-motion-toggle="categories"')||
   !homepage.includes('data-motion-toggle="pulse"')||
   !kineticCss.includes('@keyframes rail-drift')||
   !kineticCss.includes('@keyframes pulse-scroll')||
   !kineticMobileCss.includes('@media(prefers-reduced-motion:reduce)')||
   !kineticJs.includes('function renderRibbon()')||
   !kineticJs.includes('function initPulse()'))
 problems.push('Accessible moving category and YHpulse rails are incomplete.');
if((homepage.match(/<li class="studio-step stage-/g)||[]).length!==5)
 problems.push('The five-stage idea-to-product journey is incomplete.');
if(!homepage.includes('href="#tools"'))problems.push('Homepage tool navigation missing.');
if(!homepage.includes('id="category-ribbon-track"')||
   homepage.includes('id="recent-items"')||
   homepage.includes('FROM THE HIVE'))
 problems.push('Homepage must show the compact category-only strip, not the old recent cards.');

// No stale hard-coded tool links, draft activity, private jobs or absent targets.
const activityData=JSON.parse(await read('activity.json'));
if(!Array.isArray(activityData.items)||activityData.items.length>20||
   activityData.items.length===0)
 problems.push('Public activity rail must contain 1–20 verified updates.');
else {
 const ids=new Set(),urls=new Set(items.map(x=>x.url));
 for(const event of activityData.items){
  if(typeof event?.id!=='string'||ids.has(event.id)||!['tools','builders','explore'].includes(event.kind))
   problems.push('Duplicate or invalid public activity type.');
  ids.add(event.id);
  if(event.kind==='tools'&&!urls.has(event.url))problems.push('Activity points at an unpublished tool.');
  if(event.kind==='builders'&&event.url!=='#builders')problems.push('Builder activity leaks a private URL.');
  if(event.kind==='explore'&&event.url!=='#explore')problems.push('Explore activity points at an unapproved URL.');
  if(typeof event.title!=='string'||event.title.includes('<')||event.title.includes('>'))
   problems.push('Activity has unsafe public title.');
  if(!homepage.includes('href="'+event.url+'"'))
   problems.push('Activity shortcut absent from built footer: '+event.url);
 }
 if(!homepage.includes('LATEST '+activityData.items.length+' UPDATES'))
  problems.push('Activity counter does not match the published feed.');
}
if(!homepage.includes('id="footer-pulse"')||
   homepage.includes('<nav class="footer-directory"'))
 problems.push('Legacy footer tool shortcuts must be replaced by public Pulse.');

if(!homepage.includes('id="builders"')||
   !homepage.includes('id="opportunities"')||
   !homepage.includes('id="membership"')||
   !homepage.includes('id="partners"')||
   !homepage.includes('Find paid work.'))
 problems.push('Builders future paid-membership landing page is incomplete.');
if(/data-form="opportunity"|<form[^>]*id="post"|id="job-listings"|id="post"/i.test(homepage))
 problems.push('Public job listing or job-posting form is forbidden without membership enforcement.');
if(!homepage.includes('Jobs and posting require verified paid membership.')||
   !homepage.includes('Enrollment is not open yet.'))
 problems.push('Builders paid-access disclosure missing.');

const sitemap=await read('sitemap.xml');
const headers=await read('_headers');
const robots=await read('robots.txt');
const previews=/X-Robots-Tag:\s*noindex,\s*nofollow/i.test(headers);
if(!headers.includes("connect-src 'self'")||!headers.includes("script-src 'self'"))
 problems.push('Missing privacy-first security policy.');
if(!sitemap.includes('<loc>https://yorphives.com/</loc>'))problems.push('Missing home canonical.');
if(previews&&/Sitemap:/i.test(robots))problems.push('Preview robots points at production sitemap.');
if(!previews&&!robots.includes('Sitemap: https://yorphives.com/sitemap.xml'))
 problems.push('Production robots lacks canonical sitemap.');
if(!previews&&/X-Robots-Tag:\s*noindex/i.test(headers))problems.push('Unexpected noindex in production.');
const route=/^(?:(?:[a-z0-9][a-z0-9-]*\/)+|(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*\.html)$/;
for(const item of items){
 if(!route.test(item.url)) {problems.push('Unsafe URL: '+item.url);continue;}
 const url='https://yorphives.com/'+item.url,page=item.url.endsWith('/')?item.url+'index.html':item.url;
 if(!sitemap.includes('<loc>'+url+'</loc>'))problems.push('Missing canonical sitemap entry: '+item.url);
 let html;
 try {html=await read(page)} catch {problems.push('Missing public page: '+page);continue;}
 if((html.match(/<link rel="canonical"/g)||[]).length!==1||
  !html.includes('<link rel="canonical" href="'+url+'">'))
  problems.push('Wrong or duplicate canonical link: '+page);
 if(!html.includes('<meta property="og:url" content="'+url+'">'))
  problems.push('Wrong og:url: '+page);
 if(!/<h1\b/.test(html)||!/<title\b/.test(html))problems.push('Missing human-visible title: '+page);
 if(/<script\b[^>]*src=["']https?:/i.test(html))problems.push('Remote script found: '+page);
 if(!html.includes('id="yorphives-discovery-schema"'))
  problems.push('Missing JSON-LD discovery schema: '+page);
 else try{
  const match=html.match(/<script type="application\/ld\+json" id="yorphives-discovery-schema">([\s\S]*?)<\/script>/);
  if(!match)throw Error('Malformed JSON-LD tag');
  const data=JSON.parse(match[1]);const graph=data['@graph'];
  if(!Array.isArray(graph)||!graph.some(x=>x.url===url&&x['@type']==='WebPage')||
   !graph.some(x=>x.url===url&&x['@id']===url+'#main-entity'))throw Error('Missing linked main entity');
 }catch(e){problems.push('Invalid structured data: '+page+' '+e.message);}
 if(item.type==='tool'&&!directory.includes('../'+item.url))problems.push('Missing tool-directory link: '+item.url);
 if(item.module?.url)try{const s=await stat(resolve(root,item.module.url));if(!s.isFile())problems.push('Missing module: '+item.module.url);}
 catch{problems.push('Missing module: '+item.module.url);}
}
for(const required of ['tools/batch-file-core.mjs','tools/safe-zip.mjs','tools/office-files.mjs','tools/vendor/jszip.mjs']){
 try{await stat(resolve(root,required));}catch{problems.push('Missing dependency: '+required);}
}
if(problems.length){console.error('RELEASE CHECK FAILED\n'+problems.map(x=>' - '+x).join('\n'));process.exitCode=1;}
else console.log('STATIC RELEASE CHECK PASSED: '+tools.length+' local tools; '+items.length+
 ' direct public pages with canonicals, sitemap and structured data; previewNoindex='+previews+'.');
