import { formatJson } from './toolkit.mjs';

const val = (data, key) => String(data[key] ?? '');
function requireText(data, key = 'text') { const result = val(data, key); if (!result.length) throw new Error('Enter some text to get started.'); if (result.length > 2000000) throw new Error('Please keep the input under 2 million characters.'); return result; }
function number(data, key, label, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const raw = val(data, key).trim(); const result = Number(raw);
  if (!raw || !Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) throw new Error(`Enter a valid ${label}.`);
  return result;
}
function formatNumber(n, digits = 6) { if (!Number.isFinite(n)) throw new Error('The result is outside the supported range.'); return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n); }
function normalizeLines(s) { return s.replace(/\r\n?/g, '\n').split('\n'); }
function csvCell(value, safe) {
  let str = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (safe && typeof value === 'string' && /^[\s\u0000-\u001f]*[=+\-@]/.test(str)) str = "'" + str;
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
export function parseCsv(input) {
  if (typeof input !== 'string' || input.length > 2000000) throw new Error('Enter CSV under 2 million characters.');
  const rows = []; let row = []; let field = ''; let quoted = false; let closed = false; let endedRow = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i]; endedRow = false;
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (closed) {
      if (c === ',') { row.push(field); field = ''; closed = false; }
      else if (c === '\r' || c === '\n') { row.push(field); rows.push(row); row = []; field = ''; closed = false; endedRow = true; if (c === '\r' && input[i + 1] === '\n') i++; }
      else throw new Error('Unexpected character after a closing quote.');
    } else if (c === '"') {
      if (field !== '') throw new Error('Quotes must begin at the start of a field.'); quoted = true;
    } else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r' || c === '\n') { row.push(field); rows.push(row); row = []; field = ''; endedRow = true; if (c === '\r' && input[i + 1] === '\n') i++; }
    else field += c;
    if (rows.length > 10000) throw new Error('The CSV has too many rows. Use 10,000 rows or fewer.');
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote.');
  if (!endedRow || row.length || field || closed) { row.push(field); rows.push(row); }
  return rows;
}
export function jsonToCsv(input, safe = true) {
  let rows; try { rows = JSON.parse(input); } catch { throw new Error('Enter valid JSON.'); }
  if (!Array.isArray(rows) || !rows.length || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Enter a non-empty JSON array of objects.');
  if (rows.length > 10000) throw new Error('Use 10,000 rows or fewer.');
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  if (!headers.length) throw new Error('At least one object needs a property.');
  return [headers.map(v => csvCell(v, safe)).join(','), ...rows.map(row => headers.map(key => csvCell(Object.hasOwn(row, key) ? row[key] : '', safe)).join(','))].join('\r\n');
}
export function csvToJson(input) {
  const rows = parseCsv(input); const headers = rows.shift();
  if (!headers || !headers.length || headers.some(h => !h.trim()) || new Set(headers).size !== headers.length) throw new Error('Use a header row with unique, non-empty column names.');
  return JSON.stringify(rows.map((row, index) => {
    if (row.length !== headers.length) throw new Error(`Row ${index + 2} has ${row.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((header, i) => [header, row[i]]));
  }), null, 2);
}
function htmlEncode(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function htmlDecode(s) { const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'}; return s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => { if (entity[0] !== '#') return named[entity.toLowerCase()]; const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10); return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match; }); }
function encodeBase64(s) { const bytes = new TextEncoder().encode(s); let binary=''; for (const b of bytes) binary += String.fromCharCode(b); return btoa(binary); }
function decodeBase64(s) { try { const binary = atob(s.replace(/\s/g, '')); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)); return new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { throw new Error('Enter valid Base64 containing UTF-8 text.'); } }
function jwtPart(segment) { let value = segment.replace(/-/g, '+').replace(/_/g, '/'); value += '='.repeat((4 - value.length % 4) % 4); return formatJson(decodeBase64(value), 2); }
function lineDiff(a, b) {
  const left=a === '' ? [] : normalizeLines(a), right=b === '' ? [] : normalizeLines(b); if(left.length>250||right.length>250) throw new Error('Use 250 lines or fewer in each text.');
  const dp=Array.from({length:left.length+1},()=>new Uint16Array(right.length+1));
  for(let i=left.length-1;i>=0;i--) for(let j=right.length-1;j>=0;j--) dp[i][j]=left[i]===right[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0,out=[]; while(i<left.length||j<right.length) { if(i<left.length&&j<right.length&&left[i]===right[j]) {out.push('  '+left[i]);i++;j++;} else if(j<right.length&&(i===left.length||dp[i][j+1]>=dp[i+1][j])) out.push('+ '+right[j++]); else out.push('- '+left[i++]); }
  return out.join('\n');
}
export function hexRgb(s) { let h=String(s).trim().replace(/^#/,''); if(!/^(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(h)) throw new Error('Enter a 3- or 6-digit hex color, such as #1a7f64.'); if(h.length===3)h=[...h].map(c=>c+c).join(''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); }
function rgbToHsl([r,g,b]) { r/=255;g/=255;b/=255; const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2; let h=0; if(d){ if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*60+360)%360; } const s=d===0?0:d/(1-Math.abs(2*l-1));return [Math.round(h),Math.round(s*100),Math.round(l*100)]; }
function luminance(rgb) { const [r,g,b]=rgb.map(c=>{const n=c/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b; }
function getCrypto() { if(!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable in this browser. Use HTTPS and a modern browser.'); return globalThis.crypto; }
function randomIndex(n) { const c=getCrypto(),limit=Math.floor(4294967296/n)*n,buf=new Uint32Array(1); do{c.getRandomValues(buf);}while(buf[0]>=limit);return buf[0]%n; }
function makePassword(length, sets) { const available=sets.join(''); let chars=sets.map(set=>set[randomIndex(set.length)]);while(chars.length<length) chars.push(available[randomIndex(available.length)]);for(let i=chars.length-1;i>0;i--){const j=randomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}return chars.join(''); }
const units={mm:['length',.001],cm:['length',.01],m:['length',1],km:['length',1000],in:['length',.0254],ft:['length',.3048],yd:['length',.9144],mi:['length',1609.344],mg:['mass',.001],g:['mass',1],kg:['mass',1000],oz:['mass',28.349523125],lb:['mass',453.59237],c:['temperature',1],f:['temperature',1],k:['temperature',1]};
export async function runUtility(id, data) {
  let output=''; let preview=null;
  switch(id) {
    case 'word-counter': {const s=val(data,'text'), words=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'word'}).segment(s)].filter(x=>x.isWordLike).length:(s.trim()?s.trim().split(/\s+/).length:0), sentences=(s.match(/[^.!?\s][^.!?]*(?:[.!?]+|$)/g)||[]).length, paragraphs=s.trim()?s.trim().split(/\n\s*\n/).length:0;output=`Words: ${words}\nCharacters (including spaces): ${[...s].length}\nCharacters (excluding whitespace): ${[...s].filter(c=>!(/\s/u.test(c))).length}\nSentences (estimate): ${sentences}\nParagraphs: ${paragraphs}\nReading time (200 words/min): ${words ? `${Math.ceil(words/200)} min` : '0 min'}`;break;}
    case 'case-converter': {const s=requireText(data);const mode=val(data,'mode');output=mode==='upper'?s.toLocaleUpperCase():mode==='lower'?s.toLocaleLowerCase():mode==='title'?s.toLocaleLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(m,a,b)=>a+b.toLocaleUpperCase()):s.toLocaleLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu,(m,a,b)=>a+b.toLocaleUpperCase());break;}
    case 'slug-generator': output=requireText(data).normalize('NFKD').replace(/(\p{Script=Latin})\p{M}+/gu,'$1').normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu,'-').replace(/^-+|-+$/g,'');if(!output)throw new Error('Enter text containing letters or numbers.');break;
    case 'duplicate-line-remover': {const seen=new Set();output=normalizeLines(requireText(data)).filter(line=>{const key=data.ignorecase==='on'?line.toLocaleLowerCase():line;if(seen.has(key))return false;seen.add(key);return true}).join('\n');break;}
    case 'line-sorter': {const lines=normalizeLines(requireText(data));const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});lines.sort(collator.compare);if(data.order==='desc')lines.reverse();output=lines.join('\n');break;}
    case 'whitespace-cleaner': {let lines=normalizeLines(requireText(data));if(data.trim==='on')lines=lines.map(s=>s.trim());if(data.collapse==='on')lines=lines.map(s=>s.replace(/[ \t]{2,}/g,' '));if(data.empty==='on')lines=lines.filter(s=>s.trim());output=lines.join('\n');break;}
    case 'text-find-replace': {const s=requireText(data),find=val(data,'find');if(!find)throw new Error('Enter the exact text to find.');output=s.split(find).join(val(data,'replace'));break;}
    case 'text-diff': {const a=val(data,'original'),b=val(data,'revised');if(!a&&!b)throw new Error('Enter at least one text.');if(a.length+b.length>1000000)throw new Error('Use less than 1 million characters in total.');output=lineDiff(a,b);break;}
    case 'base64-tool': {const s=requireText(data);output=data.mode==='decode'?decodeBase64(s):encodeBase64(s);break;}
    case 'url-encoder': {const s=requireText(data);try{output=data.mode==='decode'?decodeURIComponent(s):encodeURIComponent(s)}catch{throw new Error('Enter valid percent-encoded text.')}break;}
    case 'html-entities': {const s=requireText(data);output=data.mode==='decode'?htmlDecode(s):htmlEncode(s);break;}
    case 'json-to-csv': output=jsonToCsv(requireText(data),data.safe==='on');break;
    case 'csv-to-json': output=csvToJson(requireText(data));break;
    case 'url-parser': {let u;try{u=new URL(requireText(data,'url').trim())}catch{throw new Error('Enter a complete URL, such as https://example.com/page.')}if(!['http:','https:'].includes(u.protocol))throw new Error('Use an HTTP or HTTPS URL.');const params=[...u.searchParams].map(([k,v])=>`  ${k} = ${v}`).join('\n')||'  None';output=`Protocol: ${u.protocol}\nHostname: ${u.hostname}\nPort: ${u.port||'(default)'}\nPath: ${u.pathname}\nFragment: ${u.hash||'(none)'}\nQuery parameters:\n${params}`;break;}
    case 'uuid-generator': {const count=number(data,'count','quantity from 1 to 100',{min:1,max:100,integer:true});const c=getCrypto();output=Array.from({length:count},()=>{if(c.randomUUID)return c.randomUUID();const b=new Uint8Array(16);c.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const s=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`}).join('\n');break;}
    case 'hash-generator': {const s=requireText(data),alg=val(data,'algorithm');if(!['SHA-256','SHA-384','SHA-512'].includes(alg)||!globalThis.crypto?.subtle)throw new Error('Secure hashing is unavailable. Use HTTPS and a modern browser.');const digest=await crypto.subtle.digest(alg,new TextEncoder().encode(s));output=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');break;}
    case 'jwt-decoder': {const parts=requireText(data).trim().split('.');if(parts.length!==3||!parts[0]||!parts[1])throw new Error('Enter a JWT with three dot-separated parts.');try{output=`UNVERIFIED HEADER\n${jwtPart(parts[0])}\n\nUNVERIFIED PAYLOAD\n${jwtPart(parts[1])}\n\nSignature is not verified.`}catch{throw new Error('Could not decode the JWT header or payload.')}break;}
    case 'unix-timestamp': {if(data.mode==='to-date'){const n=number(data,'value','Unix timestamp');const ms=data.unit==='milliseconds'?n:n*1000;const date=new Date(ms);if(Number.isNaN(date.valueOf()))throw new Error('Timestamp is outside the supported date range.');output=`UTC: ${date.toISOString()}\nUnix seconds: ${Math.floor(ms/1000)}\nUnix milliseconds: ${ms}`;}else{const input=requireText(data,'value').trim();if(!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(input))throw new Error('Include a timezone, for example 2026-01-01T00:00:00Z.');const ms=Date.parse(input);if(Number.isNaN(ms))throw new Error('Enter a valid ISO date with timezone.');output=`UTC: ${new Date(ms).toISOString()}\nUnix seconds: ${Math.floor(ms/1000)}\nUnix milliseconds: ${ms}`;}break;}
    case 'percentage-calculator': {const a=number(data,'a','first number'),b=number(data,'b','second number');if(data.mode==='of')output=`${formatNumber(a)}% of ${formatNumber(b)} = ${formatNumber(a*b/100)}`;else{if(b===0)throw new Error('The second number cannot be zero.');const n=data.mode==='what'?a/b*100:(a-b)/Math.abs(b)*100;output=data.mode==='what'?`${formatNumber(a)} is ${formatNumber(n)}% of ${formatNumber(b)}`:`Change from ${formatNumber(b)} to ${formatNumber(a)}: ${formatNumber(n)}%`;}break;}
    case 'discount-calculator': {const price=number(data,'price','original price',{min:0}),rate=number(data,'rate','discount percentage',{min:0,max:100}),saving=price*rate/100;output=`Original price: ${price.toFixed(2)}\nDiscount: ${saving.toFixed(2)}\nFinal price: ${(price-saving).toFixed(2)}`;break;}
    case 'profit-margin': {const cost=number(data,'cost','cost',{min:0}),price=number(data,'price','selling price',{min:0.00000001}),profit=price-cost;output=`Profit: ${profit.toFixed(2)}\nProfit margin: ${formatNumber(profit/price*100,2)}%\nMarkup: ${cost===0?'not defined when cost is zero':formatNumber(profit/cost*100,2)+'%'}`;break;}
    case 'tip-calculator': {const bill=number(data,'bill','bill amount',{min:0}),rate=number(data,'rate','tip percentage',{min:0,max:1000}),people=number(data,'people','number of people',{min:1,max:1000,integer:true}),tip=bill*rate/100,total=bill+tip;output=`Tip: ${tip.toFixed(2)}\nTotal: ${total.toFixed(2)}\nPer person (rounded): ${(total/people).toFixed(2)}`;break;}
    case 'sales-tax-calculator': {const amount=number(data,'amount','amount before tax',{min:0}),rate=number(data,'rate','tax rate',{min:0,max:1000}),tax=amount*rate/100;output=`Amount before tax: ${amount.toFixed(2)}\nTax: ${tax.toFixed(2)}\nTotal including tax: ${(amount+tax).toFixed(2)}`;break;}
    case 'unit-converter': {const n=number(data,'value','number'),from=val(data,'from'),to=val(data,'to');if(!units[from]||!units[to]||units[from][0]!==units[to][0])throw new Error('Choose two units from the same group.');let result;if(units[from][0]==='temperature'){const c=from==='c'?n:from==='f'?(n-32)*5/9:n-273.15;result=to==='c'?c:to==='f'?c*9/5+32:c+273.15;}else result=n*units[from][1]/units[to][1];output=`${formatNumber(n)} ${from} = ${formatNumber(result,8)} ${to}`;break;}
    case 'time-duration': {const parse=s=>{if(!/^\d{2}:\d{2}$/.test(s))throw new Error('Enter both times.');const [h,m]=s.split(':').map(Number);if(h>23||m>59)throw new Error('Enter valid times.');return h*60+m};const a=parse(val(data,'start')),b=parse(val(data,'end'));let d=b-a;if(data.overnight==='on')d+=1440;else if(d<0)throw new Error('End time is earlier. Select next-day end if needed.');output=`Duration: ${Math.floor(d/60)} hours ${d%60} minutes\nTotal: ${d} minutes`;break;}
    case 'average-calculator': {const parts=requireText(data).trim().split(/[\s,]+/);if(parts.length>10000)throw new Error('Use 10,000 numbers or fewer.');const nums=parts.map(Number);if(nums.some(n=>!Number.isFinite(n)))throw new Error('Use numbers separated by commas or spaces.');nums.sort((a,b)=>a-b);const sum=nums.reduce((a,b)=>a+b,0),mid=Math.floor(nums.length/2),median=nums.length%2?nums[mid]:(nums[mid-1]+nums[mid])/2;output=`Count: ${nums.length}\nSum: ${formatNumber(sum)}\nMean: ${formatNumber(sum/nums.length)}\nMedian: ${formatNumber(median)}\nMinimum: ${formatNumber(nums[0])}\nMaximum: ${formatNumber(nums.at(-1))}\nRange: ${formatNumber(nums.at(-1)-nums[0])}`;break;}
    case 'color-converter': {const rgb=hexRgb(val(data,'color')),hsl=rgbToHsl(rgb),hex='#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();output=`HEX: ${hex}\nRGB: rgb(${rgb.join(', ')})\nHSL: hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;preview={colors:[hex]};break;}
    case 'contrast-checker': {const a=hexRgb(val(data,'foreground')),b=hexRgb(val(data,'background')),l1=luminance(a),l2=luminance(b),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);output=`Contrast ratio: ${ratio.toFixed(2)}:1\nWCAG AA normal text (4.5:1): ${ratio>=4.5?'Pass':'Fail'}\nWCAG AA large text (3:1): ${ratio>=3?'Pass':'Fail'}\nWCAG AAA normal text (7:1): ${ratio>=7?'Pass':'Fail'}`;const hex=rgb=>'#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join('');preview={colors:[hex(a),hex(b)]};break;}
    case 'gradient-generator': {const a=hexRgb(val(data,'first')),b=hexRgb(val(data,'second')),angle=number(data,'angle','angle between 0 and 360',{min:0,max:360});const hex=x=>'#'+x.map(n=>n.toString(16).padStart(2,'0')).join('');output=`background: linear-gradient(${angle}deg, ${hex(a)}, ${hex(b)});`;preview={gradient:`linear-gradient(${angle}deg, ${hex(a)}, ${hex(b)})`};break;}
    case 'aspect-ratio-calculator': {const w=number(data,'width','width',{min:1,max:1000000,integer:true}),h=number(data,'height','height',{min:1,max:1000000,integer:true}),target=number(data,'target','target width',{min:1,max:1000000});let a=w,b=h;while(b){[a,b]=[b,a%b]}output=`Aspect ratio: ${w/a}:${h/a}\nAt width ${formatNumber(target)}: height ${formatNumber(target*h/w,2)}\nOriginal dimensions: ${w} × ${h}`;break;}
    case 'color-palette': {const rgb=hexRgb(val(data,'color')), [h,s,l]=rgbToHsl(rgb);const colors=[0,1,2,3,4].map(i=>`hsl(${(h+i*72)%360}, ${s}%, ${l}%)`);output=colors.join('\n');preview={colors};break;}
    case 'password-generator': {const len=number(data,'length','length from 8 to 128',{min:8,max:128,integer:true}),sets=[];if(data.lower==='on')sets.push('abcdefghijklmnopqrstuvwxyz');if(data.upper==='on')sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');if(data.numbers==='on')sets.push('0123456789');if(data.symbols==='on')sets.push('!@#$%^&*_-+=?');if(!sets.length)throw new Error('Select at least one character set.');output=makePassword(len,sets);break;}
    default: return (await import('./everyday-core.mjs')).runEverydayTool(id, data);
  }
  return {text:output,preview};
}
