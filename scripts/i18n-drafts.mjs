// CLI to assemble future localization work automatically.
// List mode needs only Node. Translate mode requires your own local server.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {catalogDraftJobs,localTranslationEndpoint,runLocalDrafts} from './i18n-local-adapter.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mode=process.argv.includes('--translate')?'translate':'list';
const load=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const catalog=await load('catalog.json');
const baseline=await load('catalog-localization-baseline.json');
const jobs=catalogDraftJobs(catalog.items,baseline.legacyContent);
const out=resolve(root,'ops/i18n/translation-review.json');
await mkdir(dirname(out),{recursive:true});
const suggestions=mode==='translate'&&jobs.length?
 await runLocalDrafts({jobs,endpoint:localTranslationEndpoint(process.env.YORPHIVES_LOCAL_TRANSLATOR_URL)}):[];
const report={schemaVersion:1,generatedAt:new Date().toISOString(),
 source:'public catalog source only',mode,
 notice:'Translation suggestions are NOT reviewed. Founder or delegated reviewer must approve them before release.',
 totalJobs:jobs.length,
 jobs:jobs.map(job=>({...job,
  suggestion:suggestions.find(x=>x.url===job.url&&x.language===job.language&&x.field===job.field)?.suggestion||null,
  reviewed:false}))};
await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log('Public catalog translation worklist: '+jobs.length+' draft requests. Saved to '+out);
if(mode==='list')console.log('For local offline-model drafts, start a self-hosted translation server and use --translate.');
