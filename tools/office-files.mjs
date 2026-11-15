import { inspectZip, readZipText } from './safe-zip.mjs';
import { parseCsv } from './utility-core.mjs';

const MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const DRAW='http://schemas.openxmlformats.org/drawingml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xmlEscape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const descendants = (node, local) => Array.from(node.getElementsByTagNameNS('*',local));
function xml(source) {
  if(typeof DOMParser==='undefined')throw new Error('This operation needs a modern browser.');
  const doc=new DOMParser().parseFromString(source,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.getElementsByTagNameNS('*','parsererror').length)throw new Error('A document component is not valid XML.');
  return doc;
}
function relationId(node){return node.getAttributeNS(REL,'id')||node.getAttribute('r:id');}
function relationships(document,base){
  const map=new Map();
  for(const item of descendants(document,'Relationship')){
    if(item.getAttribute('TargetMode')==='External')continue;
    const id=item.getAttribute('Id'),target=item.getAttribute('Target');if(!id||!target)continue;
    let url;try{url=new URL(target,`https://local.invalid/${base}`)}catch{continue}
    const prefix=base.startsWith('xl/')?'/xl/':'/ppt/';if(url.origin!=='https://local.invalid'||!url.pathname.startsWith(prefix))continue;
    map.set(id,decodeURIComponent(url.pathname.slice(1)));
  }return map;
}
function colName(index){let s='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
function colIndex(ref){const m=/^([A-Za-z]{1,3})[1-9]\d*$/.exec(ref||'');if(!m)return null;let n=0;for(const c of m[1].toUpperCase())n=n*26+c.charCodeAt(0)-64;return n-1;}
const cleanCell = s => {s=String(s);if(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/u.test(s))throw new Error('The input contains characters not supported in an Excel workbook.');return s;};

export async function csvToXlsx(input){
  if(typeof input!=='string'||input.length>2_000_000)throw new Error('Choose CSV text no larger than 2 million characters.');
  const rows=parseCsv(input);if(!rows.length||rows.length>10000||rows.some(row=>row.length>200))throw new Error('Use at most 10,000 rows and 200 columns.');
  const {default:JSZip}=await import('./vendor/jszip.mjs');const zip=new JSZip();
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  const body=rows.map((row,i)=>`<row r="${i+1}">`+row.map((value,j)=>`<c r="${colName(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cleanCell(value))}</t></is></c>`).join('')+'</row>').join('');
  zip.file('xl/worksheets/sheet1.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${MAIN}"><sheetData>${body}</sheetData></worksheet>`);
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
}

async function workbookParts(bytes,sheetNumber){
  const archive=inspectZip(bytes),book=xml(await readZipText(archive,'xl/workbook.xml',2_000_000)),rels=xml(await readZipText(archive,'xl/_rels/workbook.xml.rels',2_000_000));
  const sheets=descendants(book,'sheet'),index=Number(sheetNumber);
  if(!Number.isInteger(index)||index<1||index>sheets.length)throw new Error(`Choose a sheet number from 1 to ${sheets.length}.`);
  const sheet=sheets[index-1],name=sheet.getAttribute('name')||`Sheet ${index}`,target=relationships(rels,'xl/workbook.xml').get(relationId(sheet));
  if(!target)throw new Error('Could not find the selected worksheet.');
  let shared=[];
  if(archive.entries.has('xl/sharedStrings.xml')){
    const strings=xml(await readZipText(archive,'xl/sharedStrings.xml',12_000_000));shared=descendants(strings,'si').map(item=>descendants(item,'t').map(t=>t.textContent).join(''));
    if(shared.length>200000)throw new Error('The spreadsheet has too many shared strings.');
  }
  const document=xml(await readZipText(archive,target,12_000_000));return {document,shared,name,count:sheets.length};
}
function cellValue(cell,shared){
  const type=cell.getAttribute('t')||'n',value=descendants(cell,'v')[0]?.textContent??'';
  if(type==='s'){const n=Number(value);if(!/^\d+$/.test(value)||!Number.isSafeInteger(n)||n>=shared.length)throw new Error('The spreadsheet contains an invalid shared string.');return shared[n];}
  if(type==='inlineStr')return descendants(cell,'t').map(t=>t.textContent).join('');
  if(type==='b')return value==='1';
  if(type==='e'||type==='str'||type==='d')return value;
  if(type==='n'){if(value==='')return '';const n=Number(value);return Number.isFinite(n)&&(!Number.isInteger(n)||Number.isSafeInteger(n))?n:value;}
  throw new Error('The spreadsheet uses an unsupported cell type.');
}
export async function readXlsx(bytes,sheetNumber=1){
  const {document,shared,name,count}=await workbookParts(bytes,sheetNumber);const rows=[];let previous=0,cellsTotal=0;
  for(const row of descendants(document,'row')){
    const number=row.hasAttribute('r')?Number(row.getAttribute('r')):previous+1;
    if(!Number.isInteger(number)||number<1||number>10000||number<=previous)throw new Error('The worksheet exceeds the supported 10,000 rows or has invalid row order.');
    while(rows.length<number)rows.push([]);const output=rows[number-1];let previousCol=-1;
    for(const cell of descendants(row,'c')){
      const col=cell.hasAttribute('r')?colIndex(cell.getAttribute('r')):previousCol+1;
      if(col===null||col<0||col>=200||col<=previousCol)throw new Error('The worksheet exceeds 200 columns or has invalid cell order.');
      while(output.length<=col)output.push('');output[col]=cellValue(cell,shared);previousCol=col;
      if(++cellsTotal>200000)throw new Error('The worksheet contains too many cells.');
    }
    previous=number;
  }
  return {rows,name,count};
}
function csvEscape(value,protect){
  let s=String(value??'');if(protect&&typeof value==='string'&&/^[\s\u0000-\u001f]*[=+\-@]/.test(s))s="'"+s;
  return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
export function rowsToCsv(rows,protect=true){const width=rows.reduce((n,row)=>Math.max(n,row.length),0);return rows.map(row=>Array.from({length:width},(_,i)=>csvEscape(row[i]??'',protect)).join(',')).join('\r\n');}
export function rowsToJson(rows){
  if(!rows.length)throw new Error('The worksheet is empty.');
  const headers=rows[0].map(value=>String(value).trim());
  if(!headers.length||headers.some(x=>!x)||new Set(headers).size!==headers.length)throw new Error('The first row must contain unique, non-empty column names.');
  return JSON.stringify(rows.slice(1).map((row,i)=>{if(row.length>headers.length)throw new Error(`Row ${i+2} has more cells than the header.`);const obj=Object.create(null);headers.forEach((key,j)=>{obj[key]=row[j]??''});return obj;}),null,2);
}
export async function extractPptxText(bytes){
  const archive=inspectZip(bytes),presentation=xml(await readZipText(archive,'ppt/presentation.xml',2_000_000)),rels=xml(await readZipText(archive,'ppt/_rels/presentation.xml.rels',2_000_000));
  const map=relationships(rels,'ppt/presentation.xml'),slides=descendants(presentation,'sldId');if(!slides.length||slides.length>500)throw new Error('The presentation has no slides or exceeds 500 slides.');
  const output=[];
  for(let i=0;i<slides.length;i++){
    const target=map.get(relationId(slides[i]));if(!target||!/^ppt\/slides\/[^/]+\.xml$/i.test(target))throw new Error('Could not find a slide in this presentation.');
    const document=xml(await readZipText(archive,target,8_000_000));
    const paragraphs=Array.from(document.getElementsByTagNameNS(DRAW,'p')).map(p=>Array.from(p.getElementsByTagNameNS(DRAW,'t')).map(t=>t.textContent).join('')).filter(Boolean);
    output.push(`Slide ${i+1}\n${paragraphs.join('\n')||'(No extractable text)'}`);
  }
  return {text:output.join('\n\n'),slides:slides.length};
}
