import {readFile} from 'node:fs/promises';
const repo='solopreneursid/YorpHives_Website',workflow=repo+'/.github/workflows/taxpulse-regulatory-daily.yml@refs/heads/main';
if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_WORKFLOW_REF!==workflow||!['push','schedule','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)||!/^\d{1,16}$/.test(process.env.GITHUB_RUN_ID||''))throw Error('Untrusted workflow context');
const body=await readFile(process.argv[2]||'regulatory-probe.json');
if(!body.length||body.length>300000)throw Error('Invalid evidence size');
const r=await fetch('https://hqventures-taxpulse-regulatory-evidence-preview.solopreneursid-proy.workers.dev/v1/evidence/artifact',{method:'POST',headers:{'content-type':'application/json','x-taxpulse-run-id':process.env.GITHUB_RUN_ID},body,redirect:'error',signal:AbortSignal.timeout(30000)});
const result=await r.json();if(!r.ok||!['accepted','already_observed'].includes(result.state))throw Error('Artifact evidence rejected: '+r.status+' '+(result.reason||'unknown'));
console.log(JSON.stringify(result));
