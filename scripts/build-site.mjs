// Build provider-neutral, crawlable static pages from the public catalog.
// Preview builds are explicitly noindex; production builds are canonical to
// yorphives.com. Never copy tests, source scripts, or git internals into assets.
import {cp,mkdir,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createEntity} from './discovery-schema.mjs';
import {PUBLIC_TOOL_PAGES} from '../agentic/tools-core.mjs';
import {isQualifiedProduct} from '../product-policy.mjs';
import {injectNextToolUI} from './next-tool-shell.mjs';
import {collectPublicActivity,discoverPublicPageUpdates,discoverToolEditTimes,loadActivityNotes,renderHomePulse} from './activity-feed.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dest=resolve(root,'dist');
const target=process.argv.find(s=>s.startsWith('--target='))?.slice('--target='.length);
if(!['preview','production'].includes(target))
  throw Error('Select an explicit build target: --target=preview or --target=production');
const origin='https://yorphives.com/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=esc;
const pathRx=/^(?:(?:[a-z0-9][a-z0-9-]*\/)+|(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*\.html)$/;
const fileFor=url=>url.endsWith('/')?url+'index.html':url;
const src=async path=>readFile(resolve(root,path),'utf8');
const output=async path=>readFile(resolve(dest,path),'utf8');
const write=async (path,content)=>{const file=resolve(dest,path);await mkdir(dirname(file),{recursive:true});await writeFile(file,content);};
const exists=async path=>stat(resolve(dest,path)).then(s=>s.isFile()).catch(()=>false);
const catalog=JSON.parse(await src('catalog.json'));
if(!Array.isArray(catalog.items))throw Error('Catalog has no items.');
// Public tools keep their existing publishing rule. Products require a separate
// verified HQ evidence review and founder approval before exposure.
for(const item of catalog.items){
 if(item?.type!=='tool'&&item?.published===true&&!isQualifiedProduct(item))
   throw Error('Unqualified product cannot be published: '+String(item.name||item.url||'unknown'));
}
const published=catalog.items.filter(item=>item?.type==='tool'
 ? item.published!==false&&item.visibility!=='private'
 : isQualifiedProduct(item));
const seen=new Set();
for(const item of published){
 if(!item||typeof item.name!=='string'||!item.name.trim()||typeof item.description!=='string'||!item.description.trim())
   throw Error('Every public page requires a useful name and description.');
 if(typeof item.url!=='string'||!pathRx.test(item.url)||item.url.includes('..'))
   throw Error('Invalid public path: '+String(item.url));
 if(seen.has(item.url))throw Error('Duplicate public path: '+item.url);
 seen.add(item.url);
}
await rm(dest,{recursive:true,force:true});
await mkdir(dest,{recursive:true});
for(const file of ['index.html','app.js','style.css','next.css','next-responsive.css','home-experience.css','next.js','catalog.json','product-policy.mjs','_headers','_redirects','robots.txt','llms.txt','ads.txt','adsense-plan.json'])
 await cp(resolve(root,file),resolve(dest,file));
// Keep private or unqualified catalog candidates out of public static assets.
await write('catalog.json',JSON.stringify({...catalog,items:published},null,2));
// One first-party analytics client for the marketing site and published tools.
await cp(resolve(root,'insights-client.mjs'),resolve(dest,'insights-client.mjs'));
// Lightweight, first-party motion shared by every public page (including tools).
for(const file of ['interaction.css','interaction.mjs'])
 await cp(resolve(root,file),resolve(dest,file));

// Only the analytics API invokes Pages Functions. All static pages and tool
// assets bypass function compute and retain free static asset delivery.
await write('_routes.json',JSON.stringify({
 version:1,include:['/api/insights/*','/api/agent/v1/*','/api/hqconnect'],exclude:[]
},null,2)+'\n');


const roots=new Set(['tools','privacy',...published.filter(x=>x.url.includes('/')).map(x=>x.url.split('/')[0])]);
for(const dir of roots)if(await stat(resolve(root,dir)).then(s=>s.isDirectory()).catch(()=>false))
 await cp(resolve(root,dir),resolve(dest,dir),{recursive:true});
// Make the policy visible directly from the Free Tools directory.
const directoryHtml=await output('tools/index.html');
if(!directoryHtml.includes('href="/privacy/"')){
 if(!directoryHtml.includes('</footer>'))throw Error('Directory footer missing');
 await write('tools/index.html',directoryHtml.replace('</footer>',' · <a href="/privacy/">Privacy Policy</a></footer>'));
}
// Build YHpulse only from actual published pages and reviewed public release notes.
// This is static and requires no paid runtime services or background polling.
const publicNotes=await loadActivityNotes(root);
const publicPageChanges=discoverPublicPageUpdates(root);
const activity=collectPublicActivity({
  published,
  notes:publicNotes,
  pageChanges:publicPageChanges,
  toolEditTimes:discoverToolEditTimes(root),
});
if(!activity.length)throw Error('No verified public activity available for release.');
const mainPage=await output('index.html');
const pulseStart='<!-- PULSE_START -->';
const pulseEnd='<!-- PULSE_END -->';
const begin=mainPage.indexOf(pulseStart),finish=mainPage.indexOf(pulseEnd,begin+pulseStart.length);
if(begin<0||finish<begin||mainPage.indexOf(pulseStart,begin+1)>=0||
   mainPage.indexOf(pulseEnd,finish+1)>=0)
 throw Error('Homepage YHpulse template markers are missing or duplicated.');
const pulseCount='<!-- PULSE_COUNT -->';
if(mainPage.split(pulseCount).length!==2)throw Error('Homepage YHpulse count marker missing.');
const injected=mainPage.slice(0,begin+pulseStart.length)+
  renderHomePulse(activity)+mainPage.slice(finish);
await write('index.html',injected.replace(pulseCount,'LATEST '+activity.length+' UPDATES'));
await write('activity.json',JSON.stringify({version:1,items:activity},null,2)+'\n');
console.log('PUBLIC ACTIVITY BUILT: '+activity.length+' verified published shortcuts; mode='+target+'.');

// After static copying, vendor the heavyweight open-source libraries under our origin.
await import('./copy-wave1-vendors.mjs');
// The first load of AI background remover is fully same-origin, including verified model weights.
await import('./copy-background-model.mjs');
// Optional second portrait model: static, small, Apache-2.0, verified at build time; no billed inference.
await import('./copy-portrait-model.mjs');
for(const item of published)if(!item.url.includes('/'))
 await cp(resolve(root,item.url),resolve(dest,item.url));
const dataJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
function injectHead(html,metadata){
 if(!/<\/head>/i.test(html)||!/<h1\b/i.test(html))throw Error('Public page lacks a <head> or <h1>.');
 // Remove our previous generated block if regenerating; avoid duplicate canonicals.
 html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'')
   .replace(/<meta\b[^>]*property=["']og:url["'][^>]*>/gi,'')
   .replace(/<meta\b[^>]*name=["']twitter:card["'][^>]*>/gi,'')
   .replace(/<script\b[^>]*id=["']yorphives-discovery-schema["'][\s\S]*?<\/script>/gi,'');
 return html.replace(/<\/head>/i,metadata+'</head>');
}

// Add the same navigation action to every direct-entry page, including future
// registered apps and products. Keep it disabled until a verified donation
// destination is approved; never invent a payment URL.
function injectSiteSupport(html,page){
 const header=html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0];
 if(!header)throw Error('Public page lacks navigation header: '+page);
 if(header.includes('header-kofi'))return html;
 const action='<button class="header-kofi tool-kofi" type="button" disabled aria-label="Ko-fi, Support us — donations coming soon" title="Donations are not open yet"><strong>Ko-fi</strong><small>Support us</small><span class="kofi-pending" aria-hidden="true">Soon</span></button>';
 return html.replace(header,header.replace(/<\/header>$/i,action+'</header>'));
}

// Add one shared visual language to all free tools without changing processors or page routes.
function injectToolSuite(html,item){
 if(item.type!=='tool'||!item.url.startsWith('tools/')||(item.url==='tools/pdf-compressor/'||['tools/wave2-core.mjs','tools/wave3-core.mjs','tools/pdf-redaction-core.mjs','tools/ocr-pdf-core.mjs','tools/video-trim-core.mjs','tools/wave4-core.mjs','tools/image-mask-core.mjs','tools/pdf-compare-core.mjs','tools/screen-record-core.mjs','tools/wave6-svg-core.mjs','tools/wave6-video-core.mjs','tools/wave6-scanner-core.mjs','tools/wave6-image-core.mjs','tools/wave6-audio-core.mjs','tools/wave7-file-core.mjs','tools/wave7-audio-core.mjs','tools/wave7-business-core.mjs','tools/background-removal-core.mjs'].includes(item.module?.url)))return html;
 if(!/<body\b[^>]*class="tool-page"/.test(html))throw Error('Unexpected tool HTML: '+item.url);
 const family=html.includes('id="file-tool-form"')?'file':html.includes('id="utility-form"')?'utility':html.includes('id="wave1-form"')?'wave1':html.includes('id="image-file"')?'image':html.includes('id="json-input"')?'json':'general';
 const css='<link rel="stylesheet" href="../tool-suite-v1.css">';
 const script='<script type="module" src="../tool-suite-v1.mjs"></script>';
 if(html.includes('tool-suite-v1.css')||html.includes('tool-suite-v1.mjs'))throw Error('Duplicate design assets');
 if(!html.includes('<link rel="stylesheet" href="../tool.css">'))throw Error('Tool CSS base missing: '+item.url);
 html=html.replace('<link rel="stylesheet" href="../tool.css">','<link rel="stylesheet" href="../tool.css">'+css);
 html=html.replace(/<body\b([^>]*)>/i,(_,attrs)=>'<body'+attrs+' data-tui-family="'+family+'" data-tui-category="'+esc(item.category||'Other')+'">');
 // Replace generic help copy with clear steps appropriate to the current workflow.
 const first=family==='file'?'Choose the file or files you want to work with.':family==='wave1'?'Upload a file or enter the details shown.':item.category==='Calculators'?'Enter the values you want to calculate.':item.category==='Writing'?'Paste or type the text you want to work with.':'Enter the details or content requested by this tool.';
 html=html.replace('<li>Enter your information and choose any options.</li>','<li>'+first+'</li>');
 html=html.replace('<li>Run the tool to see the result.</li>','<li>Choose the main action to create your result.</li>');
 return html.replace('</body>',script+'</body>');
}

function metadata(url,graph){
 return '<link rel="canonical" href="'+esc(url)+'">'+
 '<meta property="og:url" content="'+esc(url)+'">'+
 '<meta name="twitter:card" content="summary">'+
 '<script type="application/ld+json" id="yorphives-discovery-schema">'+dataJson({'@context':'https://schema.org','@graph':graph})+'</script>';
}
for(const item of published){
 const path=fileFor(item.url);
 if(!await exists(path))throw Error('Published page not found: '+path);
 let html=await output(path);
 // Supersede the original generator's minimal, redundant WebApplication block.
 html=html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,block=>{
  try {const old=JSON.parse(block.slice(block.indexOf('>')+1,block.lastIndexOf('</script>')));
   if(old['@type']==='WebApplication'&&old.name===item.name)return '';
  }catch{/* Preserve manually written markup */}return block;
 });
 const url=origin+item.url,id=url+'#main-entity',bread=url+'#breadcrumbs';
 const ancestors=[{'@type':'ListItem',position:1,name:'YorpHives',item:origin}];
 const top=item.url.split('/')[0]+'/';
 if(item.url.includes('/')&&await exists(top+'index.html'))
  ancestors.push({'@type':'ListItem',position:ancestors.length+1,name:top==='tools/'?'Free tools':top.slice(0,-1),item:origin+top});
 ancestors.push({'@type':'ListItem',position:ancestors.length+1,name:item.name,item:url});
 const entity=createEntity(item,url);
 const graph=[
  {'@type':'WebPage','@id':url+'#webpage',url,name:item.name+' | YorpHives',description:item.description,
   inLanguage:'en',mainEntity:{'@id':id},breadcrumb:{'@id':bread}},
  {'@type':'BreadcrumbList','@id':bread,itemListElement:ancestors},
  entity
 ];
 html=injectHead(html,metadata(url,graph));
 html=injectSiteSupport(html,path)
  if(path.startsWith('tools/')&&path.endsWith('index.html')&&path!=='tools/index.html'){
   html=html.replace('</body>','<script type="module" src="../../insights-client.mjs"></script></body>');
  };

 // Add accessible privacy information and a concise catalog-grounded summary
 // to every published Free Tool without modifying processing controls.
 if(item.type==='tool'&&item.url.startsWith('tools/')&&item.url.endsWith('/')){
  const summary='<section class="yh-tool-usage-note" aria-label="About this free tool" style="margin:1rem 0;padding:1rem 1.25rem;border-radius:14px;background:rgba(122,173,159,.09);border:1px solid rgba(110,156,148,.22)">'+
   '<h2 style="margin:0 0 .35rem;font-size:1.1rem">About '+esc(item.name)+'</h2>'+
   '<p style="margin:0">'+esc(item.description)+'</p></section>';
  if(!html.includes('yh-tool-usage-note')){
   if(html.includes('<div class="tool-help">'))html=html.replace('<div class="tool-help">',summary+'<div class="tool-help">');
   else if(html.includes('</main>'))html=html.replace('</main>',summary+'</main>');
   else throw Error('No appropriate tool explanation location: '+item.url);
  }
  const link='<a href="/privacy/" aria-label="Read YorpHives Privacy Policy">Privacy Policy</a>';
  if(!html.includes('href="/privacy/"')){
   if(html.includes('<footer'))html=html.replace('</footer>',' · '+link+'</footer>');
   else throw Error('Missing footer for tool: '+item.url);
  }
 }
 html=injectToolSuite(html,item);
 html=injectNextToolUI(html,item);
 // Static related links help visitors discover adjacent tools without a recommendation API.
 if(item.type==='tool'&&item.url.startsWith('tools/')&&item.url.endsWith('/')){
  const near=published.filter(x=>x.type==='tool'&&x.url!==item.url&&
   (x.category||'Other')===(item.category||'Other')).slice(0,3);
  const suggestions='<section class="yh-tool-discover" aria-label="More useful tools">'+
   '<div class="yh-tool-discover-head"><h2>Keep exploring</h2>'+
   '<a href="/tools/">Browse all tools →</a></div>'+
   (near.length?'<ul>'+near.map(x=>'<li><a href="/'+esc(x.url)+'">'+esc(x.name)+'</a></li>').join('')+'</ul>':'')+
   '</section>';
  const save='<div class="yh-tool-shortcuts"><button type="button" data-save-tool="'+esc(item.url)+
   '" data-tool-name="'+esc(item.name)+'" aria-pressed="false">♡ Save this tool</button>'+
   '<a href="/tools/?saved=1">View saved tools →</a></div>';
  if(!html.includes('</main>'))throw Error('Missing tool main: '+item.url);
  html=html.replace('</main>',save+suggestions+'</main>');
  html=html.replace('</body>','<script type="module" src="/tools/save-tool.mjs"></script></body>');
 }
 // Progressive local browser agents can discover utilities from any public page.
 if(!html.includes('agentic-browser.mjs'))
  html=html.replace('</body>','<script type="module" src="/agentic-browser.mjs"></script></body>');
 await write(path,html);
 // Static Markdown companion for *every* approved public offering. Static
 // assets are free to serve and never invoke an AI model or live database.
 const mdPath=item.url.endsWith('/')?item.url+'index.md':item.url.replace(/\.html$/,'.md');
 const singleLine=v=>String(v||'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').replace(/[<>]/g,'').slice(0,500);
 const callable=PUBLIC_TOOL_PAGES[item.url];
 const md='# '+singleLine(item.name)+'\n\n'+singleLine(item.description)+'\n\n'+
  '- Canonical page: '+url+'\n'+
  '- Type: '+singleLine(item.type)+'\n'+
  '- Category: '+singleLine(item.category||'Other')+'\n'+
  (callable?'- Remote stateless utility: /api/agent/v1/tools/'+callable+'/invoke (POST JSON; see /api/agent/v1/openapi.json)\n':
   '- Processing: browser-local or human interaction; no remote execution promised.\n')+
  '- Machine-readable catalog: /catalog.json\n'+
  '- Callable utilities: /api/agent/v1/tools\n\n'+
  'Do not submit private files or credentials to public APIs. For privacy, use browser-local tools where available.\n';
 await write(mdPath,md);
}
// A directory stays crawlable and provides standard links to every item.

function buildToolDirectory(items){
 // All public tools remain linked in static HTML, including the ones
 // not initially shown in the JS-enhanced homepage library.
 const groups=new Map();
 for(const tool of items.filter(x=>x.type==='tool')){
  const category=String(tool.category||'Other').trim()||'Other';
  const set=groups.get(category)||[];
  set.push(tool);
  groups.set(category,set);
 }
 return [...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([category,tools])=>{
  tools.sort((a,b)=>a.name.localeCompare(b.name));
  const cards=tools.map(tool=>
   '<a class="directory-card" href="../'+esc(tool.url)+'"><strong>'+esc(tool.name)+
   '</strong><span>'+esc(tool.description)+'</span></a>').join('');
  const total=tools.length;
  return '<details class="directory-section"><summary><span>'+esc(category)+'</span><small>'+
    total+' '+(total===1?'tool':'tools')+
    '</small><span class="directory-chevron" aria-hidden="true">⌄</span></summary>'+
    '<div class="directory-grid">'+cards+'</div></details>';
 }).join('');
}

const candidateDirectories=[...new Set(published.filter(x=>x.url.includes('/')).map(x=>x.url.split('/')[0]+'/'))];
const directories=[];
for(const directory of candidateDirectories)
 if(await exists(directory+'index.html'))directories.push(directory);
for(const directory of directories){
 const path=directory+'index.html';
 if(!await exists(path))continue;
 const url=origin+directory,inside=published.filter(x=>x.url.startsWith(directory));
 let html=await output(path);
 if(directory==='tools/'){
  const start='<!-- TOOL_DIRECTORY_START -->';
  const end='<!-- TOOL_DIRECTORY_END -->';
  const at=html.indexOf(start),after=html.indexOf(end,at+start.length);
  if(at<0||after<at)throw Error('Tool directory missing stable category markers.');
  const generated=buildToolDirectory(inside);
  html=html.slice(0,at)+start+generated+end+html.slice(after+end.length);
 }
 const graph=[
  {'@type':'CollectionPage','@id':url+'#webpage',url,name:directory==='tools/'?'Free tools directory | YorpHives':'YorpHives '+directory.slice(0,-1),
   mainEntity:{'@id':url+'#items'}},
  {'@type':'ItemList','@id':url+'#items',itemListElement:inside.map((x,i)=>({
   '@type':'ListItem',position:i+1,name:x.name,url:origin+x.url
  }))}
 ];
 html=injectHead(html,metadata(url,graph));
 html=injectSiteSupport(html,path);
 await write(path,html);
}
// Index three honest, crawlable entrances to the existing studio sections.
const {publishSectionLandings,sectionLandingPaths}=await import('./section-landings.mjs');
await publishSectionLandings(write);
const canonicalPaths=[...new Set(['',...sectionLandingPaths,...directories,...published.map(x=>x.url)])];
// Fail if any future public HTML route is forgotten in catalog.json.
const publicPages=new Set(['index.html',...sectionLandingPaths.map(x=>x+'index.html'),...directories.map(x=>x+'index.html'),...published.map(x=>fileFor(x.url))]);
async function auditHtml(dir=''){
 for(const entry of await readdir(resolve(dest,dir),{withFileTypes:true})){
  const path=join(dir,entry.name).replaceAll('\\','/');
  if(entry.isDirectory())await auditHtml(path);
  else if(entry.isFile()&&path.endsWith('.html')&&!publicPages.has(path))
   throw Error('Public HTML page is not registered for direct discovery: '+path);
 }
}
await auditHtml();
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 canonicalPaths.map(p=>'  <url><loc>'+xml(origin+p)+'</loc></url>').join('\n')+'\n</urlset>\n';
await write('sitemap.xml',sitemap);
if(target==='preview'){
 // An entirely new site experience for review, added AFTER public HTML auditing.
 // No new unregistered pages are ever introduced into the production build.
 await cp(resolve(root,'reimagined'),resolve(dest,'reimagined'),{recursive:true});
 // Robots must be allowed to fetch pages to see the noindex response header.
 // A blanket robots.txt Disallow would prevent verification of noindex.
 await write('robots.txt','User-agent: *\nAllow: /\n');
 const headers=await output('_headers');
 if(!/^\/\*$/m.test(headers))throw Error('Security headers rule missing.');
 await write('_headers',headers.replace(/^\/\*$/m,'/*\n  X-Robots-Tag: noindex, nofollow'));
 // Browser smoke harness is intentionally preview-only, excluded from production assets.
 await cp(resolve(root,'review/browser-smoke.mjs'),resolve(dest,'browser-smoke.mjs'));
 await cp(resolve(root,'review/browser-interaction.mjs'),resolve(dest,'browser-interaction.mjs'));
 await cp(resolve(root,'review/next-ui-qa.mjs'),resolve(dest,'next-ui-qa.mjs'));
 await cp(resolve(root,'review/next-word-tool-qa.mjs'),resolve(dest,'next-word-tool-qa.mjs'));
 await cp(resolve(root,'review/insights-e2e.mjs'),resolve(dest,'insights-e2e.mjs'));
 await cp(resolve(root,'review/library-qa.mjs'),resolve(dest,'library-qa.mjs'));
 await cp(resolve(root,'review/wave1-qa.mjs'),resolve(dest,'wave1-qa.mjs'));
 await cp(resolve(root,'review/wave1-ui-qa.mjs'),resolve(dest,'wave1-ui-qa.mjs'));
 await cp(resolve(root,'review/compressor-ui-qa.mjs'),resolve(dest,'compressor-ui-qa.mjs'));
 await cp(resolve(root,'review/compressor-design-qa.mjs'),resolve(dest,'compressor-design-qa.mjs'));
 await cp(resolve(root,'review/tool-suite-qa.mjs'),resolve(dest,'tool-suite-qa.mjs'));
 await cp(resolve(root,'review/tool-suite-flow-qa.mjs'),resolve(dest,'tool-suite-flow-qa.mjs'));
 for(const name of ['wave2-ui-qa.mjs','wave3-browser-qa.mjs','ocr-browser-qa.mjs','video-browser-qa.mjs','wave4-browser-qa.mjs' ,'screen-browser-qa.mjs','wave6-browser-qa.mjs','wave7-browser-qa.mjs','wave7-ui-qa.mjs','ai-background-prototype-qa.mjs','ai-background-ui-qa.mjs','portrait-model-qa.mjs'])
  await cp(resolve(root,'review',name),resolve(dest,name));
 // Synthetic browser acceptance only runs on opt-in preview URLs, never in production.
 for(const [toolPath,script] of [
  ['tools/pdf-redaction/index.html','wave3-browser-qa.mjs'],
  ['tools/scanned-pdf-to-searchable-pdf/index.html','ocr-browser-qa.mjs'],
  ['tools/video-trimmer/index.html','video-browser-qa.mjs'],
  ['tools/favicon-generator/index.html','wave4-browser-qa.mjs'],
  ['tools/screen-recorder/index.html','screen-browser-qa.mjs'],
  ['tools/svg-optimizer/index.html','wave6-browser-qa.mjs'],
  ['tools/batch-image-converter/index.html','wave7-browser-qa.mjs'],
  ['tools/business-proposal-generator/index.html','wave7-ui-qa.mjs'],
  ['tools/password-strength-analyzer/index.html','wave7-ui-qa.mjs'],
  ['tools/spreadsheet-merger/index.html','wave7-ui-qa.mjs'],
  ['tools/image-publishing-pack/index.html','wave7-ui-qa.mjs'],
  ['tools/voice-recorder/index.html','wave7-ui-qa.mjs'],
  ['tools/batch-image-converter/index.html','wave7-ui-qa.mjs'],
  ['tools/pdf-metadata-cleaner/index.html','wave7-ui-qa.mjs'],
  ['tools/audio-merger/index.html','wave7-ui-qa.mjs'],
  ['tools/image-publishing-pack/index.html','ai-background-prototype-qa.mjs'],
  ['tools/ai-background-remover/index.html','ai-background-ui-qa.mjs'],
  ['tools/ai-background-remover/index.html','portrait-model-qa.mjs']]){
  const current=await output(toolPath);
  await write(toolPath,current.replace('</body>','<script type="module" src="../../'+script+'"></script></body>'));
 }
 for(const tool of published.filter(item=>item.module?.url==='tools/wave2-core.mjs')){
  const file=tool.url+'index.html';
  const current=await output(file);
  await write(file,current.replace('</body>',
   '<script type="module" src="../../wave2-ui-qa.mjs" data-qa-page="wave2"></script></body>'));
 }
}else{
 await write('robots.txt','User-agent: *\nAllow: /\nSitemap: '+origin+'sitemap.xml\n');
 const headers=await output('_headers');
 if(/X-Robots-Tag:\s*noindex/i.test(headers))throw Error('Production must not inherit preview noindex.');
}
// Release-candidate promotion: serve the independently designed studio as the
// canonical root, without publishing the preview-only /reimagined/ directory.
// This routine is also used to render a path-isolated acceptance candidate.
async function publishReimaginedRoot(prefix=''){
 if(prefix)await mkdir(resolve(dest,prefix),{recursive:true});
 const assets=['studio.css','hqconnect.css','hero-system.css','surfaces.css','showcase.css','studio.js','showcase.mjs','rotators.css','rotators.js',
  'catalog-sync.mjs','venture-activity.mjs','impact-public.json','usage-public.json'];
 for(const asset of assets)
  await cp(resolve(root,'reimagined',asset),resolve(dest,prefix+asset));
 // Browser fixture is isolated to preview acceptance; never ship it on production root.
 if(prefix)await cp(resolve(root,'reimagined/catalog-sync-qa.mjs'),resolve(dest,prefix+'catalog-sync-qa.mjs'));
 if(prefix)await cp(resolve(root,'reimagined/insights-qa.mjs'),resolve(dest,prefix+'insights-qa.mjs'));

 const source=await readFile(resolve(root,'reimagined/index.html'),'utf8');
 let homepage=source.replace(
   '<meta name="robots" content="noindex,nofollow">',
   '<link rel="canonical" href="https://yorphives.com/">');
 homepage=homepage.replace(/<div class="preview-banner">[^\n]*<\/div>\n?/,'');

 // Human-readable first-party share metadata supports growth without a SaaS widget.
 const sharing=[
  '<meta property="og:type" content="website">',
  '<meta property="og:site_name" content="YorpHives">',
  '<meta property="og:title" content="YorpHives — HQventures, our independent venture studio">',
  '<meta property="og:description" content="Explore founder-reviewed opportunities and ventures through HQventures, plus free tools you can use today.">',
  '<meta property="og:url" content="https://yorphives.com/">',
  '<meta property="og:image" content="https://yorphives.com/tools/brand-icon.webp">',
  '<meta property="og:image:alt" content="YorpHives brand emblem">',
  '<meta name="twitter:card" content="summary">'
 ].join('\n');
 if(!homepage.includes('<meta name="description"'))throw Error('Public description missing.');
 homepage=homepage.replace(/<meta name="description"[^>]*>/,match=>match+'\n'+sharing);

 if(homepage.includes('DESIGN PREVIEW · NOT LIVE')||
    homepage.includes('name="robots" content="noindex')||
    !homepage.includes('id="home"')||
    !homepage.includes('id="yh-pulse"')||
    !homepage.includes('type="button" disabled'))
  throw Error('Reimagined release candidate failed initial public safety gates');
 homepage=homepage.replace('</body>','<script type="module" src="/agentic-browser.mjs"></script></body>');
 await write(prefix+'index.html',homepage);
 console.log('REIMAGINED ROOT READY: '+(prefix||'/')+'; Builders page removed; Partnerships preserved.');
}

let llms=await output('llms.txt');
llms+='\n## Direct discovery for search engines and autonomous agents\n\n'+
 'Every public tool, app, product or service has its own direct URL in /catalog.json and a companion index.md. '+
 'Use that URL rather than the homepage. Structured data and canonical URLs are embedded in the HTML, '+
 'and /sitemap.xml lists published pages. Catalog items with execution=browser-local provide client-side processing; '+
 'do not assume a server-executable API exists.\n';
llms+='\n## Agent-friendly discovery and stateless utilities\n\n'+
 'Public capabilities: /api/agent/v1/capabilities\n'+
 'OpenAPI 3.1: /api/agent/v1/openapi.json\n'+
 'Machine discovery: /.well-known/agentic.json (site-specific, not a universal standard).\n'+
 'Five free stateless utility operations: /api/agent/v1/tools; every other published tool remains browser-local.\n'+
 'WebMCP is experimental; supported browsers can also invoke local utilities without uploading inputs. No payments or private HQ access.\n';
await write('llms.txt',llms);
await write('.well-known/agentic.json',JSON.stringify({
 version:1,site:'YorpHives',origin:'https://yorphives.com',
 status:'public-discovery-and-bounded-stateless-utilities',capabilities:'/api/agent/v1/capabilities',
 openapi:'/api/agent/v1/openapi.json',catalog:'/catalog.json',
 callableTools:'/api/agent/v1/tools',docs:'/llms.txt',
 remoteExecution:'five-bounded-stateless-utilities-only',paymentAvailable:false,
 requiresFounderApproval:true
},null,2)+'\n');
await cp(resolve(root,'agentic/browser-webmcp.mjs'),resolve(dest,'agentic-browser.mjs'));
await cp(resolve(root,'agentic/tools-core.mjs'),resolve(dest,'agentic-tools.mjs'));
// Agent discovery and five bounded stateless calls are first-party; no MCP intermediary.

// Keep the same approved studio interface at / in both environments.
// The preview environment remains noindex via _headers and uses its own D1 binding.
// Do not send visitors or reviewers to a stale legacy homepage.
await publishReimaginedRoot();
// Preserve the historic path for existing preview bookmarks, without a second UI.
// This is an alias to the exact same source, not a separate release candidate.
if(target==='preview')await publishReimaginedRoot('release-candidate/');
console.log('DISCOVERY BUILD PASSED: '+published.length+' directly linked public pages; '+canonicalPaths.length+
 ' canonical sitemap URLs; mode='+target+'. Homepage markup preserved.');