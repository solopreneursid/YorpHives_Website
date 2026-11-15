// Safe, browser-local SVG optimization via the pinned MIT-licensed SVGO browser bundle.
// Untrusted SVG is NEVER injected into the DOM or displayed as an active SVG.
const MB=1048576;
const safeElements=new Set([
 'svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','symbol',
 'use','lineargradient','radialgradient','stop','clippath','mask','pattern','marker',
 'text','tspan','title','desc','metadata','filter','fegaussianblur','fecolormatrix','feblend',
 'fecomposite','feoffset','feflood','femerge','femergenode','femorphology',
 'feturbulence','fedisplacementmap','fecomponenttransfer','fefuncr','fefuncg',
 'fefuncb','fefunca','feimage','feconvolvematrix'
]);
export function validateSvgSource(source){
 const text=String(source||'');
 if(text.length<10||text.length>2*MB)throw Error('Choose an SVG between 10 bytes and 2 MB.');
 if(!/<svg(?:\s|>)/i.test(text)||/<!(?:DOCTYPE|ENTITY)|<\?xml-stylesheet/i.test(text))
  throw Error('The input must be an SVG without XML entities, DTDs or external stylesheets.');
 if(typeof DOMParser==='undefined')throw Error('SVG validation requires a browser.');
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 if(doc.querySelector('parsererror')||doc.documentElement?.localName?.toLowerCase()!=='svg')
  throw Error('This SVG contains invalid XML.');
 const nodes=[doc.documentElement,...doc.documentElement.getElementsByTagName('*')];
 if(nodes.length>5000)throw Error('SVG contains too many elements.');
 for(const node of nodes){
  if(node.namespaceURI!=='http://www.w3.org/2000/svg'||!safeElements.has(node.localName.toLowerCase()))
   throw Error('Unsupported or potentially unsafe SVG element: '+node.localName);
  for(const attr of [...node.attributes]){
   const name=attr.localName.toLowerCase(),value=attr.value.trim();
   if(/^on[a-z]/.test(name)||['src','srcdoc','formaction','action'].includes(name))
    throw Error('SVG includes an unsafe event or resource attribute.');
   if(name==='href'&&(!value.startsWith('#')||value.length>256))
    throw Error('External SVG references are not supported.');
   const sanitized=value.replace(/[\t\r\n]/g,'');
   const refs=[...sanitized.matchAll(/url\(\s*['"]?([^)]*)\)/ig)];
   for(const item of refs)if(!item[1].replace(/['"\s]/g,'').startsWith('#'))
    throw Error('Remote SVG image, font or filter references are not supported.');
   if(/javascript\s*:|vbscript\s*:|@import\b|expression\s*\(/i.test(sanitized))
    throw Error('SVG contains a potentially unsafe URL or style.');
  }
 }
 return text;
}
export async function optimizeSvg(source){
 const safe=validateSvgSource(source);
 const {optimize}=await import('./vendor/svgo/svgo.browser.js');
 let result;
 try{result=optimize(safe,{multipass:true});}
 catch(e){throw Error('The SVG optimizer could not process this design: '+String(e.message||'unknown').slice(0,160));}
 const raw=typeof result?.data==='string'?result.data:null;
 if(!raw)throw Error('SVGO did not produce a usable file.');
 validateSvgSource(raw);
 const before=new TextEncoder().encode(safe).length,after=new TextEncoder().encode(raw).length;
 const optimized=after<=before?raw:safe;
 const size=new TextEncoder().encode(optimized).length;
 return {blob:new Blob([optimized],{type:'image/svg+xml'}),filename:'yorphives-optimized.svg',
  summary:size<before?'Reduced SVG from '+before+' to '+size+' bytes ('+Math.round((1-size/before)*100)+'% smaller).':'The input is already compact; preserved the original.',
  text:optimized,bytesBefore:before,bytesAfter:size};
}
