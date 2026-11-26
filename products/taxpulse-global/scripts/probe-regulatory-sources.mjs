import {readFile,writeFile} from 'node:fs/promises';
import {runRegulatoryMonitor} from '../engine/regulatory-edge.mjs';
const sources=JSON.parse(await readFile(new URL('../rules/monitor-sources.json',import.meta.url),'utf8'));
let report;
await runRegulatoryMonitor({REGULATORY_STATE:{get:async()=>null,put:async(key,value)=>{if(key!=='latest')throw Error('Unexpected report key');report=JSON.parse(value);}}},sources);
if(!report||report.sources.length!==sources.length||report.automaticRuleChanges!==false)throw Error('Invalid probe result');
await writeFile('regulatory-probe.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checkedAt:report.checkedAt,sources:report.sources.length,successful:report.sources.filter(r=>r.status!=='fetch_failed').length,failed:report.sources.filter(r=>r.status==='fetch_failed').map(r=>({id:r.id,failure:r.failure,attempts:r.attempts})),fallbacks:report.sources.filter(r=>r.resolvedUrl&&r.resolvedUrl!==r.url).map(r=>({id:r.id,url:r.resolvedUrl})),extracted:report.sources.filter(r=>r.extractionStatus==='candidate').map(r=>r.id),mode:'independent-probe-review-only'}));
if(report.sources.every(r=>r.status==='fetch_failed'))throw Error('No live sources reachable');
