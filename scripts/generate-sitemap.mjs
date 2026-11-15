// Generate a static, canonical sitemap from the single source of tool metadata.
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const origin='https://yorphives.com/';
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const pages=['','tools/',...catalog.items.filter(x=>x.type==='tool').map(x=>x.url)];
if(new Set(pages).size!==pages.length)throw Error('Duplicate sitemap URLs.');
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  pages.map(path=>'  <url><loc>'+xml(origin+path)+'</loc></url>').join('\n')+'\n</urlset>\n';
await writeFile(resolve(root,'sitemap.xml'),sitemap);
console.log('Wrote sitemap.xml with '+pages.length+' URLs.');
