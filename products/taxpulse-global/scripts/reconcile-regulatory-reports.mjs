import {readFile,writeFile} from 'node:fs/promises';
import {reconcileRegulatoryReports} from '../engine/regulatory-reconciliation.mjs';
const [edgePath,independentPath,outputPath]=process.argv.slice(2);
if(!edgePath||!independentPath||!outputPath||process.argv.length!==5)throw Error('Usage: node scripts/reconcile-regulatory-reports.mjs EDGE.json INDEPENDENT.json OUTPUT.json');
const read=async path=>{const raw=await readFile(path,'utf8');if(Buffer.byteLength(raw)>2*1024*1024)throw Error('Report too large');return JSON.parse(raw);};
const config=await read(new URL('../rules/monitor-sources.json',import.meta.url));
const report=reconcileRegulatoryReports(config,await read(edgePath),await read(independentPath));
await writeFile(outputPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({reachable:report.reachable,unavailable:report.unavailable,conflictingCandidates:report.conflictingCandidates,automaticRuleChanges:false}));
