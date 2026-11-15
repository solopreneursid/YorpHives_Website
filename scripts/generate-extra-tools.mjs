// Build static pages and catalog entries from the shared definitions.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extraTools } from './extra-tool-specs.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = existsSync(resolve(projectRoot, 'dist/catalog.json')) ? resolve(projectRoot, 'dist') : projectRoot;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fieldHtml = field => {
  const name=esc(field.name), label=esc(field.label), placeholder=field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : '';
  if (field.kind==='checkbox') return `<label class="tool-check"><input type="checkbox" name="${name}"${field.checked?' checked':''}> ${label}</label>`;
  if (field.kind==='textarea') return `<label class="tool-field">${label}<textarea name="${name}"${placeholder} spellcheck="false">${esc(field.value||'')}</textarea></label>`;
  if (field.kind==='select') return `<label class="tool-field">${label}<select name="${name}">${field.options.map(option=>`<option value="${esc(option.value)}"${String(option.value)===String(field.value)?' selected':''}>${esc(option.label)}</option>`).join('')}</select></label>`;
  const limits=['min','max','step'].filter(key=>field[key]!==undefined).map(key=>` ${key}="${esc(field[key])}"`).join('');
  const value=field.value!==undefined?` value="${esc(field.value)}"`:'';
  return `<label class="tool-field">${label}<input type="${esc(field.kind)}" name="${name}"${placeholder}${value}${limits}></label>`;
};
const template = await readFile(resolve(root,'tools/word-counter/index.html'),'utf8');
const inputBlock=/<div class="utility-inputs">.*?<\/div><div class="tool-buttons">/;
if(!inputBlock.test(template))throw new Error('The tool page template changed; review the generator before continuing.');
const catalogPath=resolve(root,'catalog.json');
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const ids=new Set(extraTools.map(tool=>`tools/${tool.id}/`));
if(ids.size!==extraTools.length)throw new Error('Duplicate extra tool IDs.');
const originalItems=catalog.items,generated=[];
for(const tool of extraTools){
  let html=template.replaceAll('Word &amp; Character Counter',esc(tool.name))
    .replaceAll('Word & Character Counter',tool.name)
    .replaceAll('Count words, characters, sentences, paragraphs, and estimated reading time.',esc(tool.description))
    .replace('data-utility="word-counter"',`data-utility="${esc(tool.id)}"`)
    .replace('FREE TOOL / WRITING',`FREE TOOL / ${esc(tool.category.toUpperCase())}`)
    .replace('<p>Sentence and reading-time counts are estimates. Processing happens in your browser and your input is not uploaded.</p>',`<p>${esc(tool.help)} Processing happens in your browser.</p>`)
    .replace(inputBlock,`<div class="utility-inputs">${tool.fields.map(fieldHtml).join('')}</div><div class="tool-buttons">`);
  if(tool.id==='qr-code-generator')html=html.replace('Copy the result if you need it elsewhere.','Download the QR code as an SVG file.');
  const dir=resolve(root,'tools',tool.id);await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'index.html'),html);
  const inputs=tool.fields.map(field=>{
    const value={name:field.name,type:field.kind};
    if(field.kind==='checkbox'){value.checkedValue='on';value.defaultChecked=!!field.checked;}
    if(field.value!==undefined)value.default=field.value;
    if(field.options)value.options=field.options.map(option=>option.value);
    if(field.min!==undefined)value.min=field.min;if(field.max!==undefined)value.max=field.max;
    return value;
  });
  generated.push({name:tool.name,description:tool.description,type:'tool',category:tool.category,date:'2026-11-15',url:`tools/${tool.id}/`,execution:'browser-local',
    module:{url:'tools/everyday-core.mjs',export:'runEverydayTool',arguments:[`tool id: ${tool.id}`,'object of named form inputs'],toolId:tool.id,inputs}});
}
const updates=new Map(generated.map(item=>[item.url,item]));
const existing=new Set(originalItems.map(item=>item.url));
catalog.items=originalItems.map(item=>updates.get(item.url)||item).concat(generated.filter(item=>!existing.has(item.url)));
await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
const directoryPath=resolve(root,'tools/index.html');let directory=await readFile(directoryPath,'utf8');
const groups=[...new Set(catalog.items.filter(item=>item.type==='tool').map(item=>item.category))].sort();
const sections=groups.map(group=>`<section class="directory-section"><h2>${esc(group)}</h2><div class="directory-grid">${catalog.items.filter(item=>item.type==='tool'&&item.category===group).map(item=>`<a class="directory-card" href="../${esc(item.url)}"><strong>${esc(item.name)}</strong><span>${esc(item.description)}</span></a>`).join('')}</div></section>`).join('');
const sectionPattern=/<section class="directory-section">[\s\S]*?(?=<a class="tool-catalog-link")/;
if(!sectionPattern.test(directory))throw new Error('The tool directory changed; review the generator.');
directory=directory.replace(sectionPattern,sections);
await writeFile(directoryPath,directory);
console.log(`Generated ${extraTools.length} tools. Total catalog entries: ${catalog.items.length}.`);
