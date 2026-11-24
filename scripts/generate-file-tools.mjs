import {updateToolDirectory} from './tool-directory.mjs';
import {genericToolTemplate} from './tool-template.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileTools} from './file-tool-specs.mjs';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=existsSync(resolve(project,'dist/catalog.json'))?resolve(project,'dist'):project;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function field(f){
 if(f.kind==='checkbox')return `<label class="tool-check"><input type="checkbox" name="${esc(f.name)}"${f.checked?' checked':''}> ${esc(f.label)}</label>`;
 if(f.kind==='select')return `<label class="tool-field">${esc(f.label)}<select name="${esc(f.name)}">${f.values.map(([value,label])=>`<option value="${esc(value)}"${value===f.value?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`;
 const limits=['min','max'].filter(k=>f[k]!==undefined).map(k=>` ${k}="${esc(f[k])}"`).join('');
 return `<label class="tool-field">${esc(f.label)}<input type="${esc(f.kind)}" name="${esc(f.name)}"${f.placeholder?` placeholder="${esc(f.placeholder)}"`:''}${f.value!==undefined?` value="${esc(f.value)}"`:''}${limits}${f.kind==='number'?' step="1"':''}></label>`;
}
const template=genericToolTemplate(await readFile(resolve(root,'tools/word-counter/index.html'),'utf8'),{file:true}),catalogPath=resolve(root,'catalog.json'),catalog=JSON.parse(await readFile(catalogPath,'utf8'));
const ids=new Set(fileTools.map(t=>`tools/${t.id}/`));if(ids.size!==fileTools.length)throw new Error('Duplicate file tool IDs.');const originalItems=catalog.items,generated=[];
for(const tool of fileTools){
 const fields=tool.fields||[],form=`<form id="file-tool-form"><label class="tool-field">${tool.multiple?'Choose files':'Choose a file'}<input id="file-input" name="files" type="file"${tool.accept?` accept="${esc(tool.accept)}"`:''}${tool.multiple?' multiple':''}></label><p class="file-note">Files are processed on this device and are not uploaded.</p><ol id="file-list" class="file-list" hidden></ol><div class="utility-inputs">${fields.map(field).join('')}</div><div class="tool-buttons"><button class="tool-btn primary" id="file-run" type="submit" disabled>Loading tool…</button><button class="tool-btn" type="reset">Reset</button></div><p class="tool-status" id="file-status" role="status" aria-live="polite"></p><div id="file-result" class="file-result" hidden><img id="file-preview" class="file-preview" alt="Processed image preview" hidden><label class="tool-field" hidden>Result preview (up to 10,000 characters)<textarea class="utility-output" id="file-output" readonly spellcheck="false"></textarea></label><div class="tool-buttons"><a class="tool-btn primary" id="file-download" hidden>Download</a><button class="tool-btn" id="file-copy" type="button" hidden>Copy preview</button></div></div></form>`;
 let page=template.replaceAll('Word &amp; Character Counter',esc(tool.name)).replaceAll('Word & Character Counter',tool.name).replaceAll('Count words, characters, sentences, paragraphs, and estimated reading time.',esc(tool.description)).replace('data-utility="word-counter"',`data-filetool="${esc(tool.id)}"`).replace('FREE TOOL / WRITING',`FREE TOOL / ${esc(tool.category.toUpperCase())}`).replace('<p>Sentence and reading-time counts are estimates. Processing happens in your browser and your input is not uploaded.</p>',`<p>${esc(tool.help)} Processing happens on your device.</p>`).replace('Copy the result if you need it elsewhere.','Download the result when it is ready.').replace(/<form id="utility-form">[\s\S]*?<\/form>/,form).replace('../utility-page.mjs','../file-tool-page.mjs');
 if(!page.includes('id="file-tool-form"')||page.includes('id="utility-form"'))throw new Error('Could not generate file tool form.');
 const dir=resolve(root,'tools',tool.id);await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'index.html'),page);
 const inputs=[{name:'files',type:'file',multiple:!!tool.multiple,accept:tool.accept},...fields.map(f=>({name:f.name,type:f.kind,...(f.kind==='checkbox'?{checkedValue:'on',defaultChecked:!!f.checked}:{}),...(f.value!==undefined?{default:f.value}:{})}))];
 generated.push({name:tool.name,description:tool.description,type:'tool',category:tool.category,date:'2026-11-15',url:`tools/${tool.id}/`,execution:'browser-local',module:{url:'tools/file-core.mjs',export:'processFileTool',arguments:[`tool id: ${tool.id}`,'array of File objects','object of options'],toolId:tool.id,inputs,requirements:['Browser File and Blob APIs; image and presentation tools also need Canvas.']}});
}
const updates=new Map(generated.map(item=>[item.url,item])),existing=new Set(originalItems.map(item=>item.url));catalog.items=originalItems.map(item=>updates.get(item.url)||item).concat(generated.filter(item=>!existing.has(item.url)));
await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
const directoryPath=resolve(root,'tools/index.html');
const currentDirectory=await readFile(directoryPath,'utf8');
await writeFile(directoryPath,updateToolDirectory(currentDirectory,catalog.items));
console.log(`Generated ${fileTools.length} file tools. Total catalog entries: ${catalog.items.length}.`);
