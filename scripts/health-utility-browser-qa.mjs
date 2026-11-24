// Exercise every text/calculation tool through its real browser controls.
// Inputs are synthetic, all writes and non-local requests are blocked, and
// representative expected results are independent of the processor code.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {chromium} from 'playwright';
import {utilityFixture} from './health-utility-fixtures.mjs';

const origin=new URL(process.env.YORPHIVES_PREVIEW_ORIGIN||'http://127.0.0.1:4173');
if(!['127.0.0.1','localhost','::1'].includes(origin.hostname)||origin.protocol!=='http:')
 throw Error('Synthetic utility browser QA is restricted to a local preview.');
const catalog=JSON.parse(await readFile(new URL('../catalog.json',import.meta.url),'utf8'));
const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private'&&
 ['tools/utility-core.mjs','tools/everyday-core.mjs'].includes(x.module?.url));

const expected={
 'word-counter':/Words: 3\b/, 'case-converter':/^ALPHA BETA GAMMA$/,
 'slug-generator':/^alpha-beta-gamma$/, 'duplicate-line-remover':/^Alpha beta gamma$/,
 'line-sorter':/^Alpha beta gamma$/, 'whitespace-cleaner':/^Alpha beta gamma$/,
 'text-find-replace':/^hello earth$/, 'text-diff':/\+ blue\s+- red/,
 'base64-tool':/^QWxwaGEgYmV0YSBnYW1tYQ==$/, 'url-encoder':/^Alpha%20beta%20gamma$/,
 'html-entities':/^&lt;b&gt;hello&lt;\/b&gt;$/, 'json-to-csv':/name,score\s+Ada,20/,
 'csv-to-json':/"name":\s*"Ada"[\s\S]*"score":\s*"20"/,
 'url-parser':/Hostname: example\.com[\s\S]*Path: \/page/,
 'uuid-generator':/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\n[0-9a-f-]{36}$/i,
 'hash-generator':/^a53fb55d1133524d9f58398c09e03737736a84d98059537401af8e5e7520791b$/,
 'jwt-decoder':/UNVERIFIED PAYLOAD[\s\S]*"sub":\s*"qa"[\s\S]*Signature is not verified/,
 'unix-timestamp':/2024-01-01T00:00:00\.000Z/, 'percentage-calculator':/20% of 150 = 30/,
 'discount-calculator':/Final price: 80\.00/, 'profit-margin':/Profit margin: 40%[\s\S]*Markup: 66\.67%/,
 'tip-calculator':/Per person \(rounded\): 57\.50/, 'sales-tax-calculator':/Total including tax: 110\.00/,
 'unit-converter':/1,000 m = 1 km/, 'time-duration':/8 hours 30 minutes/,
 'average-calculator':/Mean: 20[\s\S]*Median: 20/, 'color-converter':/RGB: rgb\(55, 182, 156\)/,
 'contrast-checker':/Contrast ratio: 13\.71:1/, 'gradient-generator':/linear-gradient\(135deg/,
 'aspect-ratio-calculator':/Aspect ratio: 16:9[\s\S]*height 450/,
 'color-palette':/hsl\(168, 54%, 46%\)/, 'password-generator':/^.{20}$/s,
 'qr-code-generator':/^<svg\b/, 'markdown-to-html':/<h1>Hello<\/h1>[\s\S]*<strong>World<\/strong>/,
 'regex-tester':/Matches: 2[\s\S]*Alpha[\s\S]*beta/, 'json-pointer':/^"Ada"$/,
 'json-merge-patch':/"a": 1[\s\S]*"b": 2/, 'json-lines-converter':/"name": "Ada"[\s\S]*"name": "Bob"/,
 'number-base-converter':/^FF$/, 'text-to-hex':/^68 65 6c 6c 6f$/,
 'ipv4-subnet-calculator':/Network: 192\.168\.1\.0\/24[\s\S]*Usable addresses: 254/,
 'word-frequency-counter':/Total words: 3[\s\S]*red: 2/, 'lorem-ipsum-generator':/Lorem ipsum/,
 'reverse-text':/^dlroW olleH$/, 'unicode-inspector':/U\+0041[\s\S]*U\+2603/,
 'list-to-delimited':/^alpha,beta$/, 'csv-to-markdown':/\| Ada \| 20 \|/,
 'url-tracking-remover':/^https:\/\/example\.com\/\?keep=1$/,
 'query-string-builder':/^https:\/\/example\.com\/\?ref=one$/,
 'mailto-link-generator':/^mailto:hello@example\.com\?subject=Hello&body=Test$/,
 'meta-tag-generator':/<title>Example Article Title<\/title>/,
 'robots-txt-generator':/Disallow: \/private\/[\s\S]*Sitemap: https:\/\/example\.com\/sitemap\.xml/,
 'xml-sitemap-generator':/<loc>https:\/\/example\.com\/about\/<\/loc>/,
 'business-days-calculator':/Business days \(inclusive\): 22/, 'date-calculator':/Resulting date: 2026-01-31/,
 'compound-interest-calculator':/Estimated balance: 31998\.32/, 'loan-payment-calculator':/Monthly payment: 1110\.21/,
 'roi-calculator':/Return on investment: 20%/, 'break-even-calculator':/Break-even units: 67/,
 'reverse-sales-tax-calculator':/Amount before tax: 100\.00/, 'manual-currency-converter':/Converted amount: 125\.00/,
 'box-shadow-generator':/box-shadow: 0px 12px 28px 0px rgba\(0, 0, 0, 0\.3\)/,
 'px-to-rem-converter':/24px = 1\.5rem/, 'css-grid-generator':/grid-template-columns: repeat\(3/,
 'conversion-command-builder':/libreoffice --headless --convert-to pdf/,
 'json-key-sorter':/"a": 2[\s\S]*"z": 1/, 'csv-column-extractor':/score\s+20/,
 'csv-to-html-table':/<th>name<\/th>[\s\S]*<td>Ada<\/td>/
};
assert.equal(tools.length,68,'The public utility inventory changed; update this test intentionally.');
assert.deepEqual(tools.map(x=>x.module.toolId).sort(),Object.keys(expected).sort());

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({baseURL:origin.origin,serviceWorkers:'block'});
await context.addInitScript(()=>localStorage.setItem('yorphives-anonymous-analytics-disabled','1'));
await context.route('**/*',route=>{
 const request=route.request();
 if(!['GET','HEAD'].includes(request.method())||new URL(request.url()).origin!==origin.origin)
  return route.abort();
 return route.continue();
});
const page=await context.newPage(),results=[];
try{
 for(const item of tools){
  const id=item.module.toolId;
  try{
   const response=await page.goto('/'+item.url,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response?.status(),200);
   await page.waitForFunction(()=>!document.getElementById('utility-run')?.disabled,{timeout:15000});
   for(const [name,value] of Object.entries(utilityFixture(item))){
    const input=page.locator('#utility-form [name="'+name+'"]');
    assert.equal(await input.count(),1,id+': missing or duplicate '+name);
    const kind=await input.evaluate(e=>e.type);
    if(kind==='checkbox')await input.setChecked(value==='on');
    else if(kind==='select-one')await input.selectOption(value);
    else await input.fill(value);
   }
   await page.locator('#utility-run').click();
   await page.waitForFunction(()=>!document.getElementById('utility-result')?.hidden||
    document.getElementById('utility-status')?.classList.contains('error'),{timeout:30000});
   const status=await page.locator('#utility-status').innerText();
   assert.doesNotMatch(status,/error|failed|invalid|unable/i);
   const result=await page.locator('#utility-output').inputValue();
   assert.match(result,expected[id],id+' returned an unexpected result');
   if(id==='qr-code-generator')assert.equal(await page.locator('#utility-preview img[alt="Generated QR code"]').count(),1);
   results.push({id,passed:true});console.log('PASS UTILITY '+id);
  }catch(error){results.push({id,passed:false,error:String(error?.message||error).slice(0,500)});console.error('FAIL UTILITY '+id+': '+String(error?.message||error).slice(0,500));}
 }
}finally{await context.close();await browser.close()}
const report={generatedAt:new Date().toISOString(),total:results.length,passed:results.filter(x=>x.passed).length,
 failed:results.filter(x=>!x.passed).length,results};
const output=process.env.YORPHIVES_UTILITY_RESULTS||'.qa-media/utility-browser-results.json';
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log('UTILITY_BROWSER_SUMMARY '+JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));
if(report.failed)process.exitCode=1;
