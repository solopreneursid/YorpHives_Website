// Run-backed founder QA verdicts. Never treats inventory definitions as passing tests.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(resolve(ROOT,'catalog.json'),'utf8'));
const tools=catalog.items.filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
const normalize=s=>'/'+String(s).replace(/^\\/+|\\/+$/g,'')+'/';
const browserPath=process.argv[2],tapPath=process.argv[3],destination=process.argv[4]||'free-tools-qa-verdict';
async function optionalJson(path){try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}}
async function optionalText(path){try{return await readFile(path,'utf8');}catch{return '';}}
const browser=await optionalJson(browserPath),tap=await optionalText(tapPath);
const visit=new Map();
for(const entry of browser?.scenarios||[]){
 for(const route of entry.routes||[]){
  const id=normalize(route),array=visit.get(id)||[];
  array.push({scenario:entry.name,passed:entry.passed,error:entry.error||null});
  visit.set(id,array);
 }
}
const local=new Map();
for(const line of tap.split('\\n')){
 const hit=line.match(/^\\s*(not ok|ok)\\s+\\d+\\s+-\\s+utility execution smoke: ([a-z0-9-]+)/);
 if(hit)local.set(hit[2],hit[1]==='ok'?'passed':'failed');
}
const rows=tools.map(item=>{
 const id=item.module?.toolId||String(item.url).split('/').filter(Boolean).at(-1);
 const route=normalize(item.url),scenarios=visit.get(route)||[],smoke=local.get(id)||'not-executed';
 const failures=scenarios.filter(x=>!x.passed);
 const hasPass=scenarios.some(x=>x.passed)||smoke==='passed';
 const verdict=failures.length||smoke==='failed'?'failed':hasPass?'representative-test-passed':'unverified';
 return {name:item.name,route,category:item.category||'Other',toolId:id,
  verdict,browserScenarios:scenarios,localExecution:smoke,
  scope:verdict==='representative-test-passed'?'A representative scenario passed; other behavior, formats, inputs and browsers are not implied.':null};
}).sort((a,b)=>a.route.localeCompare(b.route));
const counts={
 published:rows.length,
 representativePassed:rows.filter(x=>x.verdict==='representative-test-passed').length,
 failed:rows.filter(x=>x.verdict==='failed').length,
 unverified:rows.filter(x=>x.verdict==='unverified').length,
 browserScenariosTotal:browser?.scenarios?.length||0,
 browserScenariosFailed:(browser?.scenarios||[]).filter(x=>!x.passed).length,
 utilitySmokesExecuted:local.size,
 utilitySmokesFailed:[...local.values()].filter(x=>x==='failed').length
};
if(rows.length!==143)throw Error('Expected 143 published Free Tools, found '+rows.length);
if(Object.values(counts).some(x=>!Number.isSafeInteger(x)))throw Error('Invalid QA count');
const report={schemaVersion:1,runId:process.env.GITHUB_RUN_ID||null,generatedAt:new Date().toISOString(),
 cautions:['Representative pass is NOT complete verification.','Missing or incomplete test artifacts leave tools unverified.','No production changes or automatic fixes were performed.'],
 evidence:{browser:!!browser,local:tap.length>0},counts,tools:rows};
const dir=resolve(destination);await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,'verdict.json'),JSON.stringify(report,null,2)+'\\n');
const lines=['# YorpHives Free Tools — last CI execution verdict','',
 'Workflow run: '+(report.runId||'unknown'),'', 'Generated: '+report.generatedAt,'',
 '**Representative passing tests are not full functional certification.**','',
 '| Status | Tools |','|---|---:|',
 '| Representative test passed | '+counts.representativePassed+' |',
 '| Failed representative test | '+counts.failed+' |',
 '| Untested or no retained execution evidence | '+counts.unverified+' |','',
 'Browser scenario results: '+(counts.browserScenariosTotal-counts.browserScenariosFailed)+'/'+counts.browserScenariosTotal+' passing.',
 'Utility smoke results: '+(counts.utilitySmokesExecuted-counts.utilitySmokesFailed)+'/'+counts.utilitySmokesExecuted+' passing.','',
 '## Failed tools',...rows.filter(x=>x.verdict==='failed').map(x=>'- '+x.name+' ('+x.route+'): '+x.browserScenarios.filter(y=>!y.passed).map(y=>y.error).filter(Boolean).join('; ')),
 '','## Still unverified',...rows.filter(x=>x.verdict==='unverified').map(x=>'- '+x.name+' — '+x.route),
 '','A passing result is only for the exact scenario(s) listed in verdict.json. Input robustness, accessibility and cross-browser coverage still require independent testing.',''];
await writeFile(resolve(dir,'verdict.md'),lines.join('\\n'));
console.log('FREE_TOOLS_CI_VERDICT '+JSON.stringify(counts));
