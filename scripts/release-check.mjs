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
if(!homepage.includes('You bring the idea.')||!homepage.includes('real product.')||
   !homepage.includes('href="#connect"'))problems.push('Idea-to-product homepage identity or contact CTA missing.');
if((homepage.match(/<li class="studio-step stage-/g)||[]).length!==5)
 problems.push('The five-stage idea-to-product journey is incomplete.');
if(!homepage.includes('href="#tools"'))problems.push('Homepage tool navigation missing.');
if(!homepage.includes('id="category-ribbon-track"')||
   homepage.includes('id="recent-items"')||
   homepage.includes('FROM THE HIVE'))
 problems.push('Homepage must show the compact category-only strip, not the old recent cards.');

if(!homepage.includes('id="builders-home-title"')||!homepage.includes('Find work. Post work.')||
   !homepage.includes('id="builders-membership-title"')||
   !homepage.includes('id="partners"'))
 problems.push('Builders paid membership landing page is incomplete.');
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
