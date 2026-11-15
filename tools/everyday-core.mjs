// Browser-local, independently executable utility functions.
import { parseCsv } from './utility-core.mjs';

const text = (data, key) => String(data[key] ?? '');
function required(data, key = 'text', max = 1000000) {
  const value = text(data, key);
  if (!value.length) throw new Error('Enter some input to get started.');
  if (value.length > max) throw new Error(`Keep this input under ${max.toLocaleString('en-US')} characters.`);
  return value;
}
function number(data, key, label, min = -1e12, max = 1e12, integer = false) {
  const raw = text(data, key).trim(), value = Number(raw);
  if (!raw || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`Enter a valid ${label}.`);
  return value;
}
function format(value, decimals = 4) {
  if (!Number.isFinite(value)) throw new Error('The result is outside the supported range.');
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);
}
function money(value) { if (!Number.isFinite(value) || Math.abs(value) > 1e18) throw new Error('The result is outside the supported range.'); return value.toFixed(2); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function httpUrl(value) {
  let url; try { url = new URL(String(value).trim()); } catch { throw new Error('Enter a complete HTTP or HTTPS URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP or HTTPS URL without a username or password.');
  return url;
}
function json(value, label = 'JSON') { try { return JSON.parse(value); } catch { throw new Error(`Enter valid ${label}.`); } }
function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a valid calendar date.');
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || year > 9999) throw new Error('Use a year from 1000 to 9999.');
  const result = new Date(Date.UTC(year, month - 1, day));
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) throw new Error('Use a valid calendar date.');
  return result;
}
function asDate(date) { if (date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999 || Number.isNaN(date.valueOf())) throw new Error('Result is outside the supported date range.'); return date.toISOString().slice(0, 10); }
function mergePatch(target, patch, depth = 0) {
  if (depth > 64) throw new Error('JSON is nested too deeply (maximum 64 levels).');
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const output = Object.assign(Object.create(null), target && typeof target === 'object' && !Array.isArray(target) ? target : {});
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete output[key]; else output[key] = mergePatch(Object.hasOwn(output, key) ? output[key] : undefined, value, depth + 1);
  }
  return output;
}
function pointerSelect(value, pointer) {
  if (pointer === '') return value;
  if (!pointer.startsWith('/')) throw new Error('A JSON Pointer must be empty or begin with /.');
  const tokens = pointer.slice(1).split('/'); if (tokens.length > 128) throw new Error('Pointer is too deeply nested.');
  for (const token of tokens) {
    if (/~(?![01])/.test(token)) throw new Error('Use ~0 for ~ and ~1 for / in a JSON Pointer.');
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    if (value === null || typeof value !== 'object' || (Array.isArray(value) && !/^(0|[1-9]\d*)$/.test(key)) || !Object.hasOwn(value, key)) throw new Error('The pointer does not exist in this JSON.');
    value = value[key];
  }
  return value;
}
function ipv4(address, prefix) {
  const parts = address.trim().split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) throw new Error('Enter a valid IPv4 address.');
  const ip = parts.reduce((sum, p) => ((sum << 8) | Number(p)) >>> 0, 0);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const start = (ip & mask) >>> 0, end = (start | (~mask >>> 0)) >>> 0, total = 2 ** (32 - prefix);
  const ipString = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  const startHost = prefix >= 31 ? start : start + 1, endHost = prefix >= 31 ? end : end - 1;
  const qualifier = prefix === 31 ? ' (point-to-point)' : prefix === 32 ? ' (single address)' : '';
  return `Network: ${ipString(start)}/${prefix}\nSubnet mask: ${ipString(mask)}\n${prefix >= 31 ? 'Highest address' : 'Broadcast'}: ${ipString(end)}\nTotal addresses: ${format(total, 0)}\nUsable host range${qualifier}: ${ipString(startHost)} – ${ipString(endHost)}\nUsable addresses${qualifier}: ${format(prefix >= 31 ? total : total - 2, 0)}`;
}
function convertBase(input, from, to) {
  const choices = [2, 8, 10, 16]; if (!choices.includes(from) || !choices.includes(to)) throw new Error('Choose a supported number base.');
  let value = input.trim().toLowerCase(), negative = false;
  if (value.startsWith('-')) { negative = true; value = value.slice(1); }
  const prefixes = {2:'0b',8:'0o',16:'0x'};
  if (prefixes[from] && value.startsWith(prefixes[from])) value = value.slice(2);
  if (!value || value.length > 512) throw new Error('Enter up to 512 digits.');
  let result = 0n;
  for (const char of value) { const digit = '0123456789abcdef'.indexOf(char); if (digit < 0 || digit >= from) throw new Error('A digit is not valid for the selected input base.'); result = result * BigInt(from) + BigInt(digit); }
  return (negative && result !== 0n ? '-' : '') + result.toString(to).toUpperCase();
}
async function regexTest(pattern, flags, input) {
  if (pattern.length > 500 || input.length > 100000) throw new Error('Use a pattern under 500 characters and text under 100,000 characters.');
  let worker, node = false;
  if (typeof Worker !== 'undefined') worker = new Worker(new URL('./regex-worker.mjs', import.meta.url), {type:'module'});
  else if (typeof process !== 'undefined' && process.versions?.node) { const mod = await import('node:worker_threads'); worker = new mod.Worker(new URL('./regex-worker-node.mjs', import.meta.url), {type:'module', execArgv:[]}); node = true; }
  else throw new Error('This browser does not support safe regular-expression testing.');
  return await new Promise((resolve, reject) => {
    let done = false; const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); worker.terminate(); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => finish(new Error('The expression took too long and was stopped.')), 1000);
    const receive = data => data.error ? finish(new Error(data.error)) : finish(null, data.matches);
    if (node) { worker.on('message', receive); worker.on('error', () => finish(new Error('Could not run this expression.'))); }
    else { worker.onmessage = event => receive(event.data); worker.onerror = () => finish(new Error('Could not run this expression.')); }
    worker.postMessage({pattern, flags, text:input});
  });
}

export async function runEverydayTool(id, data = {}) {
  let output = '', preview = null;
  switch (id) {
    case 'qr-code-generator': {
      const value = required(data, 'text', 1000), correction = text(data, 'correction');
      if (!['L','M','Q','H'].includes(correction)) throw new Error('Choose an error-correction level.');
      const [{default:qrcode}, {stringToBytes}] = await Promise.all([import('./vendor/qrcode-generator.mjs'), import('./vendor/qrcode-utf8.mjs')]);
      qrcode.stringToBytes = stringToBytes; const qr = qrcode(0, correction);
      try { qr.addData(value, 'Byte'); qr.make(); } catch { throw new Error('The text is too long for this QR code. Try less text.'); }
      output = qr.createSvgTag({cellSize:4, margin:16, scalable:true}); preview = { qrSvg:output }; break;
    }
    case 'markdown-to-html': {
      const {marked} = await import('./vendor/marked.mjs'); output = marked.parse(required(data, 'text', 200000), {async:false}); break;
    }
    case 'regex-tester': {
      const pattern = required(data, 'pattern', 500), input = text(data, 'text'), flags = text(data, 'flags').trim();
      const matches = await regexTest(pattern, flags, input);
      output = matches.length ? `Matches${matches.length === 100 ? ' (first 100)' : ''}: ${matches.length}\n\n` + matches.map((m,i) => `${i+1}. At index ${m.index}: ${JSON.stringify(m.value)}${m.groups.length ? `\n   Groups: ${JSON.stringify(m.groups)}` : ''}`).join('\n') : 'No matches.'; break;
    }
    case 'json-pointer': output = JSON.stringify(pointerSelect(json(required(data)), text(data, 'pointer')), null, 2); break;
    case 'json-merge-patch': output = JSON.stringify(mergePatch(json(required(data,'target'),'target JSON'), json(required(data,'patch'),'patch JSON')), null, 2); break;
    case 'json-lines-converter': {
      const value = required(data), mode = text(data,'mode');
      if (mode === 'to-array') { const lines = value.split(/\r?\n/); if(lines.length>10000)throw new Error('Use 10,000 lines or fewer.'); const values=[]; for(let i=0;i<lines.length;i++){if(!lines[i].trim())continue;try{values.push(JSON.parse(lines[i]))}catch{throw new Error(`Line ${i+1} is not valid JSON.`)}} if(!values.length)throw new Error('Enter at least one JSON line.');output=JSON.stringify(values,null,2); }
      else if (mode === 'to-lines') { const values = json(value); if(!Array.isArray(values)||values.length>10000)throw new Error('Enter a JSON array with at most 10,000 entries.');output=values.map(item=>JSON.stringify(item)).join('\n'); }
      else throw new Error('Choose a conversion direction.'); break;
    }
    case 'number-base-converter': output = convertBase(required(data, 'value', 600), number(data,'from','input base',2,16,true), number(data,'to','output base',2,16,true)); break;
    case 'text-to-hex': {
      const value = required(data, 'text', 500000);
      if (data.mode === 'encode') output = [...new TextEncoder().encode(value)].map(n=>n.toString(16).padStart(2,'0')).join(' ');
      else if (data.mode === 'decode') { const hex=value.replace(/\s+/g,'');if(!hex||hex.length%2||!/^[a-f\d]+$/i.test(hex))throw new Error('Enter an even number of hexadecimal digits.');try{output=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(hex.match(/../g),v=>parseInt(v,16)))}catch{throw new Error('The hex bytes are not valid UTF-8 text.')} }
      else throw new Error('Choose a conversion direction.');break;
    }
    case 'ipv4-subnet-calculator': output = ipv4(required(data,'address',64), number(data,'prefix','CIDR prefix from 0 to 32',0,32,true)); break;
    case 'word-frequency-counter': {
      const words = required(data).toLocaleLowerCase().match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu) || []; if(!words.length)throw new Error('Enter text with words or numbers.');
      const counts = new Map(); for (const word of words) counts.set(word,(counts.get(word)||0)+1);
      const limit = number(data,'limit','number of results from 1 to 100',1,100,true);
      output=`Total words: ${words.length}\nUnique words: ${counts.size}\n\n`+[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([word,count])=>`${word}: ${count}`).join('\n');break;
    }
    case 'lorem-ipsum-generator': {
      const count=number(data,'count','paragraph count from 1 to 20',1,20,true), samples=[
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.' ];
      output=Array.from({length:count},(_,i)=>samples[i%samples.length]).join('\n\n');break;
    }
    case 'reverse-text': { const value=required(data); const units=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].map(x=>x.segment):Array.from(value); output=units.reverse().join('');break; }
    case 'unicode-inspector': {const chars=Array.from(required(data,'text',1024));if(chars.length>256)throw new Error('Use 256 Unicode code points or fewer.');output=chars.map(ch=>`${JSON.stringify(ch)}  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}`).join('\n');break;}
    case 'list-to-delimited': {const value=required(data), delimiter=required(data,'delimiter',20);if(/[\r\n]/.test(delimiter))throw new Error('The separator cannot contain a line break.');const items=data.mode==='join'?value.replace(/\r\n?/g,'\n').split('\n'):data.mode==='split'?value.split(delimiter):null;if(!items)throw new Error('Choose a conversion direction.');const clean=data.trim==='on'?items.map(v=>v.trim()):items;output=clean.join(data.mode==='join'?delimiter:'\n');break;}
    case 'csv-to-markdown': {const rows=parseCsv(required(data));if(!rows.length||rows.length>500||rows[0].length>40)throw new Error('Use CSV with at most 500 rows and 40 columns.');const width=rows[0].length;if(rows.some(row=>row.length!==width))throw new Error('Each CSV row must have the same number of columns.');const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'\\|').replace(/\r\n?|\n/g,'<br>');const row=values=>'| '+values.map(esc).join(' | ')+' |';output=[row(rows[0]),row(rows[0].map(()=>'---')),...rows.slice(1).map(row)].join('\n');break;}
    case 'url-tracking-remover': {const url=httpUrl(required(data,'url',4096));const remove=new Set(['gclid','dclid','fbclid','msclkid','mc_cid','mc_eid','igshid','twclid']);for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||remove.has(key.toLowerCase()))url.searchParams.delete(key);output=url.href;break;}
    case 'query-string-builder': {const url=httpUrl(required(data,'url',4096)), lines=required(data,'params',50000).replace(/\r\n?/g,'\n').split('\n');if(lines.length>200)throw new Error('Use 200 parameters or fewer.');for(const line of lines){if(!line.trim())continue;const index=line.indexOf('=');if(index<=0)throw new Error('Enter each parameter as name=value.');const key=line.slice(0,index).trim(),value=line.slice(index+1);if(!key)throw new Error('Each parameter needs a name.');if(data.mode==='replace')url.searchParams.set(key,value);else if(data.mode==='append')url.searchParams.append(key,value);else throw new Error('Choose how to handle existing parameters.');}output=url.href;break;}
    case 'mailto-link-generator': {const address=required(data,'email',254).trim();if(!/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(address)||address.includes('..'))throw new Error('Enter a valid-looking email address.');const [local,host]=address.split('@'),subject=text(data,'subject'),body=text(data,'body');if(/[\r\n]/.test(subject)||subject.length>500||body.length>10000)throw new Error('Keep the subject on one line and the message under 10,000 characters.');const params=new URLSearchParams();if(subject)params.set('subject',subject);if(body)params.set('body',body);output=`mailto:${encodeURIComponent(local)}@${host}${params.size?'?'+params.toString().replace(/\+/g,'%20'):''}`;break;}
    case 'meta-tag-generator': {const title=required(data,'title',200).trim(),description=required(data,'description',500).trim(),url=httpUrl(required(data,'url',4096)).href;if(!title||!description)throw new Error('Enter a title and description.');const image=text(data,'image').trim();output=`<title>${escapeHtml(title)}</title>\n<meta name="description" content="${escapeHtml(description)}">\n<link rel="canonical" href="${escapeHtml(url)}">\n<meta property="og:title" content="${escapeHtml(title)}">\n<meta property="og:description" content="${escapeHtml(description)}">\n<meta property="og:url" content="${escapeHtml(url)}">\n<meta property="og:type" content="website">`;if(image)output+=`\n<meta property="og:image" content="${escapeHtml(httpUrl(image).href)}">`;break;}
    case 'robots-txt-generator': {const paths=text(data,'paths').replace(/\r\n?/g,'\n').split('\n').filter(Boolean);if(paths.length>200)throw new Error('Use 200 paths or fewer.');for(const path of paths)if(!path.startsWith('/')||/[\x00-\x20#]/.test(path))throw new Error('Each disallowed path must start with / and contain no spaces or #.');output='User-agent: *\n'+(paths.length?paths.map(path=>`Disallow: ${path}`).join('\n'):'Disallow:');const sitemap=text(data,'sitemap').trim();if(sitemap)output+=`\n\nSitemap: ${httpUrl(sitemap).href}`;break;}
    case 'xml-sitemap-generator': {const lines=required(data,'urls').replace(/\r\n?/g,'\n').split('\n').map(v=>v.trim()).filter(Boolean);if(lines.length>1000)throw new Error('Use 1,000 URLs or fewer.');const urls=lines.map(httpUrl),origin=urls[0]?.origin;if(!origin||urls.some(url=>url.origin!==origin))throw new Error('Enter URLs from the same website origin.');const distinct=[...new Set(urls.map(url=>{url.hash='';return url.href}))];output='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+distinct.map(url=>`  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')+'\n</urlset>';break;}
    case 'business-days-calculator': {const start=parseDate(required(data,'start',10)),end=parseDate(required(data,'end',10));const days=(end-start)/86400000;if(days<0||days>7305)throw new Error('Choose an end date after the start and within 20 years.');const holidays=new Set(text(data,'holidays').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>asDate(parseDate(x))));if(holidays.size>2000)throw new Error('Use 2,000 holiday dates or fewer.');let business=0,excluded=0;for(let t=start.valueOf();t<=end.valueOf();t+=86400000){const date=new Date(t),day=date.getUTCDay();if(day!==0&&day!==6){if(holidays.has(asDate(date)))excluded++;else business++;}}output=`Business days (inclusive): ${business}\nWeekday holidays excluded: ${excluded}\nWeekends excluded: yes`;break;}
    case 'date-calculator': {const date=parseDate(required(data,'date',10)),days=number(data,'days','number of days from -36,500 to 36,500',-36500,36500,true);date.setUTCDate(date.getUTCDate()+days);output=`Resulting date: ${asDate(date)}\nCalendar days: ${days}`;break;}
    case 'compound-interest-calculator': {const principal=number(data,'principal','starting amount',0),monthly=number(data,'monthly','monthly contribution',0),rate=number(data,'rate','annual rate',0,1000),years=number(data,'years','number of years',0,60,true),n=years*12,r=rate/1200,growth=Math.expm1(n*Math.log1p(r)),total=principal*(1+growth)+(r===0?monthly*n:monthly*growth/r),contributed=principal+monthly*n;output=`Estimated balance: ${money(total)}\nTotal contributed: ${money(contributed)}\nEstimated interest: ${money(total-contributed)}\nAssumes monthly compounding and contributions at month end; excludes tax and fees.`;break;}
    case 'loan-payment-calculator': {const principal=number(data,'principal','loan amount',0),rate=number(data,'rate','annual interest rate',0,1000),months=number(data,'months','number of months',1,600,true),r=rate/1200,payment=r===0?principal/months:principal*r/-Math.expm1(-months*Math.log1p(r));output=`Monthly payment: ${money(payment)}\nTotal paid: ${money(payment*months)}\nTotal interest: ${money(payment*months-principal)}\nFixed rate; excludes fees, taxes, and insurance.`;break;}
    case 'roi-calculator': {const cost=number(data,'cost','total investment cost',0.00000001),value=number(data,'value','total return value',0),profit=value-cost;output=`Net gain or loss: ${money(profit)}\nReturn on investment: ${format(profit/cost*100,2)}%\nExcludes costs not included in the amounts entered.`;break;}
    case 'break-even-calculator': {const fixed=number(data,'fixed','fixed costs',0),price=number(data,'price','selling price per unit',0),variable=number(data,'variable','variable cost per unit',0);if(price<=variable)throw new Error('Selling price must exceed variable cost per unit.');const units=Math.ceil(fixed/(price-variable));output=`Contribution per unit: ${money(price-variable)}\nBreak-even units: ${format(units,0)}\nRevenue at break-even units: ${money(units*price)}`;break;}
    case 'reverse-sales-tax-calculator': {const total=number(data,'total','tax-inclusive total',0),rate=number(data,'rate','tax rate',0,1000),base=total/(1+rate/100);output=`Amount before tax: ${money(base)}\nTax included: ${money(total-base)}\nTotal including tax: ${money(total)}`;break;}
    case 'manual-currency-converter': {const amount=number(data,'amount','amount',0),rate=number(data,'rate','exchange rate',0.000000000001);output=`Converted amount: ${money(amount*rate)}\nRate used: ${format(rate,12)}\nUses the rate you entered; it is not a live exchange rate.`;break;}
    case 'box-shadow-generator': {const x=number(data,'x','horizontal offset',-200,200),y=number(data,'y','vertical offset',-200,200),blur=number(data,'blur','blur radius',0,200),spread=number(data,'spread','spread',-200,200),opacity=number(data,'opacity','opacity',0,100),hex=required(data,'color',7).trim();if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Choose a 6-digit hex color.');const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),value=`${x}px ${y}px ${blur}px ${spread}px rgba(${rgb.join(', ')}, ${opacity/100})`;output=`box-shadow: ${value};`;preview={boxShadow:value};break;}
    case 'px-to-rem-converter': {const value=number(data,'value','value'),root=number(data,'root','root font size',1,200);if(data.mode==='to-rem')output=`${format(value)}px = ${format(value/root,6)}rem (root ${format(root)}px)`;else if(data.mode==='to-px')output=`${format(value)}rem = ${format(value*root,6)}px (root ${format(root)}px)`;else throw new Error('Choose a conversion direction.');break;}
    case 'css-grid-generator': {const columns=number(data,'columns','column count',1,12,true),gap=number(data,'gap','gap in pixels',0,200);output=`display: grid;\ngrid-template-columns: repeat(${columns}, minmax(0, 1fr));\ngap: ${gap}px;`;break;}
    case 'conversion-command-builder': {
      const options={
        'docx-pdf':['LibreOffice','libreoffice --headless --convert-to pdf --outdir . -- input.docx'],
        'xlsx-csv':['LibreOffice','libreoffice --headless --convert-to csv --outdir . -- input.xlsx'],
        'mp4-webm':['FFmpeg','ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 -c:a libopus output.webm'],
        'wav-mp3':['FFmpeg','ffmpeg -i input.wav -codec:a libmp3lame -qscale:a 3 output.mp3'],
        'png-webp':['ImageMagick','magick input.png -quality 82 output.webp'],
        'pdf-png':['Poppler','pdftoppm -png -r 150 input.pdf output']
      };
      const selected=options[text(data,'mode')];
      if(!selected)throw new Error('Choose a supported conversion.');
      output='Requires locally installed: '+selected[0]+'\nLinux/macOS example:\n'+selected[1]+
        '\n\nUse real filenames and consult the tool help before running. YorpHives does not execute commands.';
      break;
    }
    case 'json-key-sorter': {
      const source=json(required(data,'text',200000));
      // JSON.stringify reorders integer-like object keys numerically. Build the text
      // directly so *all* keys, including "2" and "10", stay in lexical order.
      const ordered=(value,depth=0)=>{
        if(depth>64)throw new Error('JSON is nested too deeply.');
        const indent='  '.repeat(depth),inner='  '.repeat(depth+1);
        if(Array.isArray(value)){
          if(!value.length)return '[]';
          return '[\n'+value.map(v=>inner+ordered(v,depth+1)).join(',\n')+'\n'+indent+']';
        }
        if(value&&typeof value==='object'){
          const keys=Object.keys(value).sort();
          if(!keys.length)return '{}';
          return '{\n'+keys.map(key=>inner+JSON.stringify(key)+': '+ordered(value[key],depth+1)).join(',\n')+'\n'+indent+'}';
        }
        return JSON.stringify(value);
      };
      output=ordered(source);
      break;
    }
    case 'csv-column-extractor': {
      const rows=parseCsv(required(data,'text',200000));
      const header=required(data,'header',120).trim();
      if(rows.length<2||rows.length>2000||rows[0].length>40)throw new Error('Use 1–1999 CSV data rows and no more than 40 columns.');
      if(rows.some(row=>row.length!==rows[0].length))throw new Error('Every CSV row needs the same number of columns.');
      const count=rows[0].filter(x=>x===header).length;
      if(count!==1)throw new Error(count?'The header is duplicated.':'Column header not found.');
      const index=rows[0].indexOf(header);
      const csvCell=value=>{
        // A leading minus is safe when the entire cell is a numeric literal.
        // Keep a protective apostrophe for formulas, commands and other text.
        const ordinaryNumber=/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value);
        const safe=!ordinaryNumber&&/^\s*[=+\-@]/.test(value)?"'"+value:value;
        return /[",\r\n]/.test(safe)?'"'+safe.replace(/"/g,'""')+'"':safe;
      };
      output=rows.map(row=>csvCell(row[index])).join('\r\n');
      break;
    }
    case 'csv-to-html-table': {
      const rows=parseCsv(required(data,'text',150000));
      if(rows.length<2||rows.length>200||rows[0].length>30)throw new Error('Use 1–199 CSV data rows and no more than 30 columns.');
      if(rows.some(row=>row.length!==rows[0].length))throw new Error('Every CSV row needs the same number of columns.');
      const row=(cells,tag)=>'  <tr>'+cells.map(v=>'<'+tag+'>'+escapeHtml(v)+'</'+tag+'>').join('')+'</tr>';
      output=['<table>','<thead>',row(rows[0],'th'),'</thead>','<tbody>',
        ...rows.slice(1).map(cells=>row(cells,'td')),'</tbody>','</table>'].join('\n');
      break;
    }
    default: throw new Error('This tool is unavailable.');
  }
  return {text:output, preview};
}
