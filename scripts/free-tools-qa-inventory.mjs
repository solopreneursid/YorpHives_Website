// Deterministic QA coverage inventory. Does not infer that a test passed.
// Reports only that a named browser scenario or local contract exists in source.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>readFile(resolve(ROOT,p),'utf8');
const routePattern=/\b(?:open|goto)\(page\s*,\s*(['"`])(\/tools\/[a-z0-9-]+\/)\1/g;
const runPattern=/\brun\(\s*(['"`])([a-z0-9-]+)\1\s*,/g;
const scenarioPattern=/scenario\(\s*(['"`])([^'"`]+)\1\s*,\s*async\s*\(?page(?:\s*,\s*context)?\)?\s*=>\s*\{/g;
const normalize=x=>String(x||'').replace(/^\/+|\/+$/g,'');
const key=x=>'/'+normalize(x)+'/';

export function inventory(catalog,smokeSource,localSource,pdfSource=''){
 const items=(catalog.items||[]).filter(x=>x.type==='tool'&&x.published!==false&&x.visibility!=='private');
 const urls=items.map(x=>key(x.url));
 if(new Set(urls).size!==urls.length)throw Error('Duplicate published tool URL');
 if(items.length!==143)throw Error('Expected 143 published tools; found '+items.length+'; update the audit expectation only after a reviewed catalog change.');
 // Named browser scenarios are evidence of a test definition, not of a passing run.
 const browser=new Map();let match;
 const chunks=[...smokeSource.matchAll(scenarioPattern)];
 for(let i=0;i<chunks.length;i++){
  const chunk=smokeSource.slice(chunks[i].index,chunks[i+1]?.index??smokeSource.length);
  for(const hit of chunk.matchAll(routePattern)){
   const url=hit[2];const names=browser.get(url)||new Set();names.add(chunks[i][2]);browser.set(url,names);
  }
 }
 const local=new Set();for(const hit of localSource.matchAll(runPattern))local.add(hit[2]);
 const pdfContractIds=new Set();
 for(const hit of pdfSource.matchAll(/\bprocessFileTool\(\s*(['"\x60])([a-z0-9-]+)\1\s*,/g))pdfContractIds.add(hit[2]);
 const records=items.map(item=>{
  const url=key(item.url),toolId=item.module?.toolId||normalize(item.url).split('/').at(-1);
  const namedScenarios=[...(browser.get(url)||[])].sort();
  const localContract=local.has(toolId)||pdfContractIds.has(toolId);
  const group=item.module?.url||item.execution||'unknown';
  return {name:item.name,url,category:item.category||'Other',executionGroup:group,toolId,
   checks:{pageAvailability:'defined-in-all-pages-sweep',mobileLayout:'defined-in-all-pages-sweep',
    browserBehavior:namedScenarios.length?'scenario-defined':'missing',
    deterministicOutput:localContract?'contract-defined':'missing',
    inputEdgeCases:'not-comprehensively-mapped',
    crossBrowser:'not-comprehensively-mapped'},
   browserScenarios:namedScenarios,
   status:'coverage-inventory-only-not-a-runtime-pass'};
 }).sort((a,b)=>a.url.localeCompare(b.url));
 const categories={};const groups={};
 for(const record of records){
  const c=categories[record.category]||(categories[record.category]={tools:0,browserScenarios:0,localContracts:0});
  const g=groups[record.executionGroup]||(groups[record.executionGroup]={tools:0,browserScenarios:0,localContracts:0});
  for(const n of [c,g]){n.tools++;n.browserScenarios+=Number(record.checks.browserBehavior==='scenario-defined');n.localContracts+=Number(record.checks.deterministicOutput==='contract-defined');}
 }
 const counts={publishedTools:records.length,
  pageAvailabilityChecksDefined:records.length,mobileLayoutChecksDefined:records.length,
  toolsWithBrowserBehaviorScenarios:records.filter(x=>x.browserScenarios.length).length,
  toolsWithLocalContracts:records.filter(x=>x.checks.deterministicOutput==='contract-defined').length,
  toolsWithoutBrowserBehaviorScenarios:records.filter(x=>!x.browserScenarios.length).length,
  toolsWithoutLocalContracts:records.filter(x=>x.checks.deterministicOutput==='missing').length,
  fullyVerifiedByThisInventory:0};
 return {schemaVersion:1,generatedAt:new Date().toISOString(),
  caution:'Source coverage is not execution evidence. Full verification also needs successful current tests, edge cases and supported-browser checks.',
  counts,categories,executionGroups:groups,tools:records};
}
const markdown=report=>{
 const c=report.counts;
 const lines=['# Free Tools test-coverage inventory','',
  'Generated: '+report.generatedAt,'',
  '> This is a source-code coverage inventory, NOT proof that any tool passed.','',
  '| Measure | Count |','|---|---:|',
  ...Object.entries(c).map(([name,n])=>'| '+name+' | '+n+' |'),
  '','## Coverage by category','','| Category | Tools | Browser scenarios | Local output contracts |',
  '|---|---:|---:|---:|',
  ...Object.entries(report.categories).sort(([a],[b])=>a.localeCompare(b)).map(([name,x])=>'| '+name+' | '+x.tools+' | '+x.browserScenarios+' | '+x.localContracts+' |'),
  '','## Tools missing both behavioral and deterministic contracts','',
  ...report.tools.filter(x=>!x.browserScenarios.length&&x.checks.deterministicOutput==='missing').map(x=>'- '+x.name+' — '+x.url+' ('+x.executionGroup+')'),
  '','All-page sweeps check navigation, visible headings, mobile overflow and JavaScript exceptions; they do not establish output correctness.',''];
 return lines.join('\n');
};
async function main(){
 const [catalog,smoke,local,pdf]=await Promise.all([
  read('catalog.json').then(JSON.parse),
  read('scripts/health-browser-smoke.mjs'),
  read('scripts/health-local-utility-contracts.test.mjs'),
  read('scripts/health-pdf-contracts.test.mjs')
 ]);
 const report=inventory(catalog,smoke,local,pdf);
 const dest=resolve(process.cwd(),'free-tools-qa-inventory');
 await mkdir(dest,{recursive:true});
 await Promise.all([
  writeFile(resolve(dest,'inventory.json'),JSON.stringify(report,null,2)+'\n'),
  writeFile(resolve(dest,'inventory.md'),markdown(report))
 ]);
 console.log('FREE_TOOLS_COVERAGE '+JSON.stringify(report.counts));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{console.error(error);process.exitCode=1;});
}
