// Independent local-only WCAG A/AA smoke powered by open-source axe-core.
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {dirname} from 'node:path';
const origin=process.env.YORPHIVES_PREVIEW_ORIGIN||'http://127.0.0.1:4173';
const representative=['/','/tools/','/tools/word-counter/','/tools/pdf-merge/','/tools/heic-to-jpg/'];
const catalog=JSON.parse(await readFile(new URL('../catalog.json',import.meta.url),'utf8'));
const allTools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false)
 .map(x=>'/'+(x.url.startsWith('/')?x.url.slice(1):x.url));
if(allTools.length<143)throw Error('Published tool count unexpectedly fell below the verified baseline.');
const results=[];
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:820},reducedMotion:'reduce',colorScheme:'light'});
  const page=await context.newPage();
  try{
   const routes=width===390?[...new Set([...representative,...allTools])]:representative;
   for(const route of routes){
    const record={route,viewport:width,violations:[],passed:false};
    try{
     const response=await page.goto(origin+route,{waitUntil:'networkidle',timeout:30000});
     if(response?.status()!==200)throw Error('Page returned '+response?.status());
     const analysis=await new AxeBuilder({page})
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])
      .analyze();
     record.violations=analysis.violations.map(v=>({
      id:v.id,impact:v.impact,help:v.help,
      targets:v.nodes.slice(0,6).map(n=>({target:n.target,summary:n.failureSummary?.slice(0,240)}))
     }));
     record.passed=record.violations.length===0;
    }catch(error){record.error=String(error?.message||error).slice(0,500);}
    results.push(record);
    console.log((record.passed?'PASS':'FAIL')+' ACCESSIBILITY '+width+' '+route+' '+(record.error||record.violations.map(x=>x.id).join(',')));
   }
  }finally{await context.close();}
 }
}finally{await browser.close();}
const verdict={schemaVersion:1,generatedAt:new Date().toISOString(),
 total:results.length,passed:results.filter(x=>x.passed).length,
 failed:results.filter(x=>!x.passed).length,results};
const file=process.env.YORPHIVES_A11Y_RESULTS||'.qa-media/accessibility-results.json';
await mkdir(dirname(file),{recursive:true});
await writeFile(file,JSON.stringify(verdict,null,2)+'\n');
console.log('ACCESSIBILITY_SUMMARY '+JSON.stringify({total:verdict.total,passed:verdict.passed,failed:verdict.failed}));
if(verdict.failed)process.exitCode=1;
