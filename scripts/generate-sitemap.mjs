// Regenerate source sitemap from all public catalog entries, not only tools.
import{readFile,writeFile}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const items=catalog.items.filter(x=>x.published!==false&&x.visibility!=='private');
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const prefixes=[...new Set(items.filter(x=>x.url.includes('/')).map(x=>x.url.split('/')[0]+'/'))];
const pages=[...new Set(['',...prefixes,...items.map(x=>x.url)])];
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 pages.map(path=>'  <url><loc>'+xml('https://yorphives.com/'+path)+'</loc></url>').join('\n')+'\n</urlset>\n';
await writeFile(resolve(root,'sitemap.xml'),sitemap);
console.log('Wrote sitemap.xml with '+pages.length+' public canonical URLs.');
