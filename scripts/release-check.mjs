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
// A release may use either the approved legacy homepage or the completely
// reimagined site. Keep every common SEO/security/tool gate after this block.
const isReimagined=homepage.includes('id="home-title"')&&homepage.includes('id="yh-pulse"');
// Enforce UI parity: the same redesigned homepage must be served at / for
// staging and live. This prevents successful builds of an obsolete preview.
if(!isReimagined)problems.push('Preview/live parity failure: outdated homepage at root.');
if(isReimagined){
 const ids=['home','ventures','builders','impact','tools','partners','contact'];
 for(const id of ids)if(!homepage.includes('<section class="view" id="'+id+'"'))
  problems.push('Reimagined public route missing: '+id);
 const css=await read('studio.css');
 const js=await read('studio.js');
 const rotators=await read('rotators.js');
 const catalogSync=await read('catalog-sync.mjs');
 for(const filename of ['rotators.css','impact-public.json','usage-public.json','builders-updates.json'])
  try{await stat(resolve(root,filename));}catch{problems.push('New homepage asset missing: '+filename);}
 if(!homepage.includes('CLOUD-BASED · AI-POWERED VENTURE STUDIO')||
    !homepage.includes('YorpHivesHQ finds the signal')||
    !homepage.includes('class="cta-card"')||
    !homepage.includes('id="anonymous-analytics-toggle"')||
    !homepage.includes('id="yh-pulse-item"'))
  problems.push('Venture studio identity, collaboration CTA, analytics preferences, or transparent YHpulse missing.');
 if(homepage.includes('DESIGN PREVIEW · NOT LIVE')||
    homepage.includes('name="robots" content="noindex')||
    !homepage.includes('rel="canonical" href="https://yorphives.com/"'))
  problems.push('Unremoved preview labels, noindex, or missing canonical on public root.');
 if(!css.includes('@media(max-width:350px)')||
    !css.includes('prefers-reduced-motion:reduce')||
    !js.includes('qualifiedProducts(allItems)')||
    !rotators.includes('qualifiedProducts(items)')||
    !catalogSync.includes("fetch('../catalog.json'"))
  problems.push('Responsive, founder-qualified, or first-party catalogue discovery incomplete.');
 const impact=JSON.parse(await read('impact-public.json'));
 const usage=JSON.parse(await read('usage-public.json'));
 if(impact.publication?.status!=='unpublished'||
    impact.publication?.approvedByFounder!==false||
    usage.publication?.status!=='unpublished'||
    usage.publication?.approvedByFounder!==false||
    (usage.ranked||[]).length)
  problems.push('Unverified Impact or top-ten usage must not be published.');
 const builderFeed=JSON.parse(await read('builders-updates.json'));
 if(!Array.isArray(builderFeed.items)||builderFeed.items.length>10||
    builderFeed.items.some(x=>x.kind!=='builders'||x.url!=='#builders'))
  problems.push('Builders update feed includes unverified or invalid entries.');
 if(/data-form="opportunity"|<form[^>]*id="post"|id="job-listings"/i.test(homepage))
  problems.push('Public job listing unavailable until paid membership enforcement exists.');
}else{

// The homepage must do three different jobs: projects, usable tools, connection.
// The HQ approval authority remains visible without repeating entire diagrams.
if(!homepage.includes('Founder-led.')||!homepage.includes('Intelligence-powered.')||
   !homepage.includes('Ideas in motion.')||!homepage.includes('HQ discovers. AI evaluates.')||
   !homepage.includes('Founder decides.')||!homepage.includes('href="#connect"'))
 problems.push('Founder-led AI OS identity or contact route missing.');
const home=homepage.split('<!-- TOOLS:')[0];
const experiences=['home-explore','home-use','home-connect'];
if(!experiences.every(id=>home.includes('id="'+id+'"'))||
  !(home.indexOf('id="home-explore"')<home.indexOf('id="home-use"')&&
    home.indexOf('id="home-use"')<home.indexOf('id="home-connect"')))
 problems.push('Distinct Explore, Use and Connect homepage experiences missing or out of order.');
if(home.includes('class="entry-section')||home.includes('class="os-section')||
   home.includes('class="journey-section')||home.includes('class="spotlight-section')||
   home.includes('class="builders-teaser')||home.includes('class="cta-banner'))
 problems.push('Retired repeating homepage explanations must not return.');
if(!home.includes('class="hero-geometry"')||!home.includes('class="hero-identity-mark"')||
   !home.includes('id="our-ai-team"')||home.includes('class="hero-console"'))
 problems.push('The new logo-inspired hero background or compact founder-led identity is missing.');
if(!home.includes('id="how-it-works"')||!home.includes('class="stage-founder"')||
   !homepage.includes('id="projects-collection"')||!homepage.includes('Founder-approved launches only'))
 problems.push('HQ evidence, founder gate, or approval-based Explore link is missing.');
if(!home.includes('id="home-tools-list"')||!home.includes('id="home-tool-search-form"')||
   !home.includes('id="category-ribbon-track"')||!home.includes('id="home-pulse-viewport"')||
   home.includes('id="footer-pulse"'))
 problems.push('Featured tools, working search, category rail or unique YHpulse is missing.');
const kineticCss=await read('next.css');
const homepageCss=await read('home-experience.css');
const kineticMobileCss=await read('next-responsive.css');
const kineticJs=await read('next.js');
if(!kineticCss.includes('@keyframes rail-drift')||
   !kineticCss.includes('@keyframes pulse-scroll')||
   !homepageCss.includes('@keyframes hero-logo-float')||
   !homepageCss.includes('@keyframes connection-circuit')||
   !homepageCss.includes('prefers-reduced-motion:reduce')||
   !kineticJs.includes('function renderRibbon()')||
   !kineticJs.includes('function renderHomeTools(')||
   !kineticJs.includes('function renderFeaturedProject(')||
   !kineticJs.includes('qualifiedProducts(published)')||
   !kineticMobileCss.includes('@media(prefers-reduced-motion:reduce)'))
 problems.push('Interactive home discovery or accessible motion is incomplete.');
if(homepage.includes('id="recent-items"')||homepage.includes('FROM THE HIVE'))
 problems.push('Old oversized recent-items cards must not return.');

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
if(homepage.includes('id="footer-pulse"')||
   (homepage.match(/id="home-pulse-viewport"/g)||[]).length!==1||
   (homepage.match(/class="pulse-track/g)||[]).length!==1||
   (homepage.match(/>YHpulse</g)||[]).length!==1||
   homepage.includes('<nav class="footer-directory"'))
 problems.push('YHpulse must appear exactly once, on the homepage, with verified updates.');

if(!homepage.includes('id="builders"')||
   !homepage.includes('id="opportunities"')||
   !homepage.includes('id="membership"')||
   !homepage.includes('id="partners"')||
   !homepage.includes('Find paid work.'))
 problems.push('Builders future paid-membership landing page is incomplete.');

if(!home.includes('class="connection-card connection-partner" href="#partners"')||
   !homepage.includes('class="partnership-section" id="partners"')||
   !homepage.includes('href="#partners">Partnerships')||
   !homepage.includes('data-contact-reason="Partnership"')||
   !homepage.includes('Formal applications are not open yet.')||
   !homepage.includes('Contact is for an initial discussion, not an application or approval.'))
 problems.push('Partnerships must be discoverable from Home and Builders without implying open enrollment.');

if(/data-form="opportunity"|<form[^>]*id="post"|id="job-listings"|id="post"/i.test(homepage))
 problems.push('Public job listing or job-posting form is forbidden without membership enforcement.');
if(!homepage.includes('Jobs and posting require verified paid membership.')||
   !homepage.includes('Enrollment is not open yet.'))
 problems.push('Builders paid-access disclosure missing.');

}
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
