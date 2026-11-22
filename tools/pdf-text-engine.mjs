// Browser-shaped multilingual PDF text. The image gives complex scripts the
// browser's native shaping; an invisible Unicode-mapped text layer preserves
// the exact characters for search and copy in PDF readers.
import {PDFOperator,PDFOperatorNames,PDFName,PDFHexString,beginText,endText,
 setFontAndSize,setTextMatrix,setTextRenderingMode,TextRenderingMode,showText,
 pushGraphicsState,popGraphicsState,endMarkedContent} from './vendor/pdf-lib.mjs';
import {PDF_FONTS,PDF_FONT_PACK_SIZE,PDF_FONT_PACK_SHA256} from './pdf-font-coverage.mjs';
import bidiFactory from './vendor/bidi-js-1.0.3.mjs';

const SCALE=3,loadedFaces=new Map();
const bidi=bidiFactory();
let packPromise;
const packUrl=new URL('./pdf-fonts/yorphives-noto-pack.bin',import.meta.url);
function downloadPack(){
 return packPromise??=(async()=>{
  const response=await fetch(packUrl,{credentials:'omit',cache:'force-cache'});
  if(!response.ok)throw Error('The local PDF fonts are unavailable. Please retry.');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==PDF_FONT_PACK_SIZE)throw Error('The local PDF fonts could not be verified. Please retry.');
  if(!globalThis.crypto?.subtle)throw Error('A secure browser is required to verify the local PDF fonts.');
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==PDF_FONT_PACK_SHA256)throw Error('The local PDF fonts could not be verified. Please retry.');
  return bytes;
 })().catch(error=>{packPromise=undefined;throw error});
}
function contains(ranges,cp){
 let low=0,high=ranges.length-1;
 while(low<=high){const mid=(low+high)>>1,[a,b]=ranges[mid];if(cp<a)high=mid-1;else if(cp>b)low=mid+1;else return true}
 return false;
}
const control=cp=>cp===0x200c||cp===0x200d||cp===0x200e||cp===0x200f||cp===0xfe0e||cp===0xfe0f;
function fontIndex(cp){return PDF_FONTS.findIndex(row=>contains(row.ranges,cp))}
function fontCanDraw(font,text){try{font.encodeText(text);return true}catch{return false}}
function fallbackGraphemes(text){
 const clusters=[];
 for(const character of text){
  const previous=clusters.at(-1)||'';
  // Keep combining marks and joined script sequences together on older browsers.
  if(previous&&(/\p{Mark}/u.test(character)||character==='\u200d'||previous.endsWith('\u200d')||/\p{Mark}$/u.test(previous)))
   clusters[clusters.length-1]+=character;
  else clusters.push(character);
 }
 return clusters;
}
async function installFace(index,bytes){
 if(loadedFaces.has(index))return loadedFaces.get(index);
 const promise=(async()=>{
  const spec=PDF_FONTS[index],data=bytes.slice(spec.offset,spec.offset+spec.length);
  const face=new FontFace(spec.family,data);await face.load();document.fonts.add(face);return spec.family;
 })();
 loadedFaces.set(index,promise);
 try{return await promise}catch(error){loadedFaces.delete(index);throw error}
}
const hexByte=n=>n.toString(16).padStart(2,'0').toUpperCase();
const unicodeHex=character=>PDFHexString.fromText(character).asString().slice(4);

// A Type 3 font maps one-byte placeholders back to the original Unicode. Its
// marks are invisible; the canvas-shaped image provides the visible text.
function unicodeLayerPiece(pdf,page,text,x,y,size,width,angle=0){
 // PDF readers apply the Unicode bidi algorithm when reconstructing text.
 // Store visual-order glyphs and keep the original string in ActualText.
 const visual=bidi.getReorderedString(text,bidi.getEmbeddingLevels(text,'ltr'));
 const chars=[...new Set([...visual])];
 if(!chars.length)return;
 if(chars.length>255)throw Error('The text has too many distinct characters for one PDF line.');
 const ids=new Map(chars.map((c,i)=>[c,i+1]));
 const pairs=chars.map(c=>'<'+hexByte(ids.get(c))+'> <'+unicodeHex(c)+'>');
 let blocks='';
 for(let i=0;i<pairs.length;i+=100){const chunk=pairs.slice(i,i+100);blocks+=chunk.length+' beginbfchar\n'+chunk.join('\n')+'\nendbfchar\n'}
 const cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n'+
  '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n'+
  '/CMapName /YorpUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<00> <FF>\nendcodespacerange\n'+
  blocks+'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
 const glyphWidth=Math.max(1,Math.round(width/size/[...visual].length*1000));
 const glyph=pdf.context.register(pdf.context.stream(glyphWidth+' 0 d0'));
 const charProcs={};for(let i=1;i<=chars.length;i++)charProcs['g'+i]=glyph;
 const font=pdf.context.obj({Type:'Font',Subtype:'Type3',Name:'UnicodeText',FontBBox:[0,0,1000,1000],
  FontMatrix:[0.001,0,0,0.001,0,0],CharProcs:charProcs,
  Encoding:{Type:'Encoding',Differences:[1,...chars.map((_,i)=>PDFName.of('g'+(i+1)))]},
  FirstChar:1,LastChar:chars.length,Widths:chars.map(()=>glyphWidth),Resources:{},
  ToUnicode:pdf.context.register(pdf.context.flateStream(cmap))});
 const name=page.node.newFontDictionary('YorpUnicode',pdf.context.register(font));
 const radians=angle*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
 const actual=pdf.context.obj({ActualText:PDFHexString.fromText(text)});
 page.pushOperators(pushGraphicsState(),PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence,[PDFName.of('Span'),actual]),
  beginText(),setFontAndSize(name,size),setTextRenderingMode(TextRenderingMode.Invisible),
  setTextMatrix(cos,sin,-sin,cos,x,y),showText(PDFHexString.of([...visual].map(c=>hexByte(ids.get(c))).join(''))),
  endText(),endMarkedContent(),popGraphicsState());
}
function unicodeLayer(pdf,page,text,x,y,size,width,angle,measure){
 const levels=bidi.getEmbeddingLevels(text,'ltr').levels,runs=[];let index=0;
 for(const character of text){
  const direction=/\s/u.test(character)?'space':(levels[index]&1?'rtl':'ltr');
  const last=runs.at(-1);
  if(last?.direction===direction)last.text+=character;else runs.push({direction,text:character});
  index+=character.length;
 }
 const measured=runs.map(run=>measure(run.text)),total=measured.reduce((a,b)=>a+b,0)||1;
 const radians=angle*Math.PI/180;let offset=0;
 for(const [i,run] of runs.entries()){
  const w=width*measured[i]/total;
  unicodeLayerPiece(pdf,page,run.text,x+offset*Math.cos(radians),y+offset*Math.sin(radians),size,w,angle);
  offset+=w;
 }
}
function canvasContext(size,families,bold=false){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Your browser cannot draw PDF text.');
 ctx.font=(bold?'bold ':'')+(size*SCALE)+'px '+families.map(x=>'"'+x+'"').join(',');
 ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.direction='ltr';
 return {canvas,ctx};
}
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(
 blob=>blob?.size?resolve(blob):reject(Error('The browser could not render PDF text.')),'image/png'));

export async function createPdfTextEngine(pdf,entries){
 const requiresUnicode=entries.some(({text,font})=>text&&!fontCanDraw(font,text));
 // Every browser submission makes the same local font-pack request, regardless
 // of the user's language or contents. It never sends entered text or files.
 let bytes=null;
 if(typeof document!=='undefined'){
  try{bytes=await downloadPack()}catch(error){if(requiresUnicode)throw error}
 }
 let families=[];
 if(requiresUnicode){
  if(!bytes||typeof FontFace==='undefined'||!document.fonts?.add)
   throw Error('This browser cannot load the local fonts needed for this text.');
  const required=new Set([0]);
  for(const {text} of entries)for(const character of String(text||'')){
   const cp=character.codePointAt(0);if(control(cp))continue;
   const index=fontIndex(cp);
   if(index<0)throw Error('Some characters are not supported yet, such as emoji or certain scripts. Your text has not been changed.');
   required.add(index);
  }
  try{families=await Promise.all([...required].sort((a,b)=>a-b).map(index=>installFace(index,bytes)))}
  catch{throw Error('The local PDF fonts could not be loaded. Please retry.');}
 }
 function width(text,size,font,bold=false){
  if(!text)return 0;
  if(fontCanDraw(font,text))return font.widthOfTextAtSize(text,size);
  if(!families.length)throw Error('The local font for this text is unavailable.');
  return canvasContext(size,families,bold).ctx.measureText(text).width/SCALE;
 }
 function wrap(text,maxWidth,size,font,bold=false){
  if(!text)return [''];
  const segments=typeof Intl.Segmenter==='function'?
   [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(x=>x.segment):fallbackGraphemes(text);
  const lines=[];let line='';
  for(const part of segments){
   const next=line+part;
   if(line&&width(next,size,font,bold)>maxWidth){
    const lastSpace=line.search(/\s+\S*$/);
    if(lastSpace>0){lines.push(line.slice(0,lastSpace));line=line.slice(lastSpace).trimStart()+part}
    else{lines.push(line);line=part}
   }
   else line=next;
   if(width(line,size,font,bold)>maxWidth)throw Error('Some text is too wide for this PDF page.');
  }
  if(line)lines.push(line);
  return lines;
 }
 async function draw(page,text,{x,y,size,font,color,colorCss='#142f28',bold=false,opacity=1,rotate,angle=0}){
  if(!text)return;
  if(fontCanDraw(font,text)){page.drawText(text,{x,y,size,font,color,opacity,...(rotate?{rotate}:{})});return}
  const {canvas,ctx}=canvasContext(size,families,bold),metrics=ctx.measureText(text),pad=6;
  const left=Math.max(0,metrics.actualBoundingBoxLeft||0),right=Math.max(metrics.width,metrics.actualBoundingBoxRight||0);
  const ascent=Math.max(size*SCALE,metrics.actualBoundingBoxAscent||0),descent=Math.max(size*SCALE*.3,metrics.actualBoundingBoxDescent||0);
  canvas.width=Math.ceil(pad*2+left+right);canvas.height=Math.ceil(pad*2+ascent+descent);
  if(canvas.width>8192||canvas.height>4096)throw Error('Text is too large for this browser to render.');
  const drawing=canvas.getContext('2d');drawing.font=(bold?'bold ':'')+(size*SCALE)+'px '+families.map(f=>'"'+f+'"').join(',');
  drawing.textAlign='left';drawing.textBaseline='alphabetic';drawing.direction='ltr';drawing.fillStyle=colorCss;
  drawing.fillText(text,pad+left,pad+ascent);
  const image=await pdf.embedPng(new Uint8Array(await (await png(canvas)).arrayBuffer()));
  const dx=-(pad+left)/SCALE,dy=-(pad+descent)/SCALE,radians=angle*Math.PI/180;
  page.drawImage(image,{x:x+dx*Math.cos(radians)-dy*Math.sin(radians),
   y:y+dx*Math.sin(radians)+dy*Math.cos(radians),width:canvas.width/SCALE,height:canvas.height/SCALE,
   opacity,...(rotate?{rotate}:{})});
  unicodeLayer(pdf,page,text,x,y,size,metrics.width/SCALE,angle,s=>ctx.measureText(s).width/SCALE);
 }
 return {width,wrap,draw};
}
