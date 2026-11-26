import {verifyCollectorToken} from '../engine/regulatory-evidence-intake.mjs';
import {readFile} from 'node:fs/promises';
const target='https://hqventures-taxpulse-regulatory-evidence-preview.solopreneursid-proy.workers.dev/v1/evidence';
const audience='taxpulse-regulatory-evidence-preview';
const repo='solopreneursid/YorpHives_Website',ref=process.env.GITHUB_REF,event=process.env.GITHUB_EVENT_NAME,workflow=process.env.GITHUB_WORKFLOW_REF;
const permitted=(event==='push'&&ref==='refs/heads/hqventures/taxpulse-global'&&workflow===repo+'/.github/workflows/taxpulse-staging.yml@'+ref)||(['push','schedule','workflow_dispatch'].includes(event)&&ref==='refs/heads/main'&&workflow===repo+'/.github/workflows/taxpulse-regulatory-daily.yml@'+ref);
if(!permitted||process.env.GITHUB_REPOSITORY!==repo)throw Error('Untrusted workflow context');
const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!requestUrl||!requestToken)throw Error('Workflow identity not available');
const u=new URL(requestUrl);if(u.protocol!=='https:')throw Error('Invalid identity endpoint');u.searchParams.set('audience',audience);
const identity=await fetch(u,{headers:{authorization:'Bearer '+requestToken},redirect:'error',signal:AbortSignal.timeout(10000)});
if(!identity.ok)throw Error('Identity issuance failed');
const {value}=await identity.json();if(typeof value!=='string'||value.length>16000)throw Error('Invalid identity response');
// Log only non-secret identity metadata; never log the token or request credentials.
const claims=JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString('utf8'));
console.log(JSON.stringify({identityDiagnostics:{issuer:claims.iss,audience:claims.aud,repository:claims.repository,repositoryId:claims.repository_id,ref:claims.ref,event:claims.event_name,workflow:claims.workflow_ref,iat:claims.iat,nbf:claims.nbf,exp:claims.exp,runId:claims.run_id}}));
await verifyCollectorToken(value);
console.log('Local cryptographic verification of GitHub workflow identity passed');
const body=await readFile(process.argv[2]||'regulatory-probe.json');
if(body.length>300000)throw Error('Evidence too large');
const response=await fetch(target,{method:'POST',headers:{authorization:'Bearer '+value,'content-type':'application/json'},body,redirect:'error',signal:AbortSignal.timeout(30000)});
if(!response.ok){let reason='unknown';try{const data=await response.json();if(['issuer_unavailable','key_not_found','crypto_unavailable','signature_invalid','claims_rejected','invalid_token'].includes(data.reason))reason=data.reason;}catch{}throw Error('Evidence intake rejected request: '+response.status+' '+reason);}
const result=await response.json();if(!['accepted','already_observed'].includes(result.state))throw Error('Unexpected intake response');
console.log(JSON.stringify(result));
